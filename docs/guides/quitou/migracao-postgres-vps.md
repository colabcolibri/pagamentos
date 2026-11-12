# Migração do Supabase para Postgres no VPS

> Plano da conversa, anterior ao corte. Sessão própria, SQL no servidor e Postgres em `127.0.0.1:5435` já estão no código. O que este arquivo ainda descreve como futuro é o corte do Next para o VPS. O estado vigente é `05_architecture.md` e `02_security.md`. Não é backlog.

Histórias para tirar o Quitou do Supabase Cloud e passar a usar um Postgres 16 comum, em compose separado no VPS da Hostinger.

O banco já é Postgres. O que sai é a plataforma em volta: PostgREST, GoTrue, Realtime, RLS com `auth.uid()` e o cliente `@supabase/supabase-js` no browser.

## Premissas

- O Postgres sobe num compose próprio, numa rede Docker interna. A porta `5432` não fica publicada na internet.
- O Next deste serviço roda no mesmo VPS, noutro compose, nessa mesma rede. Um processo Node, pool pequeno de conexões. Sem isso o banco deixa de ser leve: serverless abrindo dezenas de conexões, ou a porta `5432` exposta, muda o desenho.
- O login continua sendo código por e-mail. Deixa de ser o OTP do GoTrue. Vira tabela e cookie de sessão nossos.
- Autorização passa para as rotas da aplicação. RLS e os papéis `anon`, `authenticated` e `service_role` não são recriados.
- O browser não recebe host, porta nem senha do banco. Catálogo, checkout, perfil e admin passam pelas API routes que já existem.
- As migrações atuais em `front-pagamento/supabase/migrations` ficam como histórico. O boot do banco novo é um schema limpo, sem schema `auth`.
- Pedidos, pagamentos e produtos mantêm os mesmos `id`. Asaas e Pagar.me não podem ver identificador novo.

## O serviço fica leve

Sim, no desenho acima.

O que pesa no Supabase self-hosted é o conjunto: Kong, GoTrue, PostgREST, Realtime, Studio, Storage. Isso fica de fora. Entra um container de Postgres para um OLTP pequeno: produtos, preços, cupons, perfis, pedidos, pagamentos, webhooks e log de e-mail.

Ordem de grandeza saudável neste volume:

| Pedaço | Limite inicial | Por quê |
| --- | --- | --- |
| Postgres | 512 MB a 1 GB de RAM | Catálogo e pedidos cabem em memória folgada. Disco cresce com `webhook_events` e `email_logs`, não com CPU. |
| Pool da aplicação | 10 conexões | Um processo Node no VPS. PgBouncer só entra se o número de processos passar disso. |
| Tempo real | nenhum processo extra | O status de pagamento continua no polling de `GET /api/payments/[id]/status`. |

O processo do Next, no mesmo VPS, usa mais RAM que o banco. Os dois juntos continuam um serviço pequeno ao lado dos outros composes, desde que o VPS tenha folga de cerca de 2 GB para este serviço (Node mais Postgres mais pico de build).

Fora deste desenho o serviço deixa de ser leve: stack Supabase inteiro no VPS, ou Postgres publicado na internet com pooler para aguentar a Vercel.

## Fora de escopo

- Self-host do Supabase em Docker.
- Storage, Studio e Realtime.
- Troca de gateway, de layout ou de regra de preço, cupom, add-on e estoque.
- Reescrever o histórico de migrações uma a uma em cima do schema `auth`.
- Abrir `5432` em `0.0.0.0`.

## Ordem

1. US-01 a US-03, infra, sem mudar o app em produção.
2. US-04 e US-05, schema limpo no banco novo.
3. US-06 a US-12, SQL no servidor, com o login ainda no Supabase se precisar fatiar o rollout. O corte de auth é US-13 a US-16 e precisa ir junto: sessão nova sem as rotas de dados novas não autentica nada.
4. US-17, polling sem canal do Supabase.
5. US-18 e US-19, cópia, corte e remoção do SDK.

---

## US-01. Postgres privado no VPS

**Como** operador do Quitou, **quero** um Postgres 16 em compose separado na rede interna do VPS, **para** os outros serviços não dependerem do Supabase e o banco não ficar exposto.

### Critérios de aceite

- Existe um compose só do banco, com volume nomeado, `restart: unless-stopped` e imagem `postgres:16`.
- A porta `5432` não está publicada em interface pública. O Next entra por uma rede Docker externa compartilhada.
- Usuário, senha e nome do banco vêm de env no servidor, fora do git.
- Um container na mesma rede conecta com `psql`. De fora do VPS, a porta não aceita conexão.
- O volume sobrevive a `docker compose down` sem `-v` e a um restart do VPS.

### Notas

Não usar `supabase db reset` nem qualquer reset do banco atual. Este compose é vazio até a US-04.

---

## US-02. Backup e restore comprovados

**Como** operador, **quero** backup restaurável do volume lógico do Postgres, **para** um disco cheio ou um compose recriado não apagar pedidos e pagamentos.

### Critérios de aceite

- `pg_dump` custom do database roda no VPS em agendamento, grava fora do volume do container e retém pelo menos 7 cópias.
- Um restore de prova, noutro database ou noutro container, devolve as tabelas do schema `payments` com a mesma contagem de linhas do dump.
- O runbook diz o comando de restore e onde o arquivo fica. Senha não entra no repositório.
- Falha do dump gera sinal visível no host (log ou exit code checado pelo agendamento). Não basta o volume Docker como única cópia.

### Dependências

US-01. O restore de prova pode usar o schema vazio e, de novo, depois da US-18.

---

## US-03. Limite de recurso do container

**Como** operador, **quero** o Postgres limitado em memória e conexões, **para** ele não competir com os outros serviços do VPS quando houver pico.

### Critérios de aceite

- O compose define limite de memória do container entre 512 MB e 1 GB.
- `max_connections` fica em torno de 30. A aplicação usa no máximo 10.
- `shared_buffers` cabe dentro do limite do container.
- Com o limite aplicado, `INSERT` e `SELECT` simples no schema `payments` respondem, e o processo do Postgres não é morto por OOM num uso ocioso.
- Está documentado o sinal para subir o limite: conexões ativas sustentadas acima de 20, ou disco de `webhook_events` crescendo sem política de retenção.

### Dependências

US-01.

---

## US-04. Schema `payments` sem Supabase

**Como** desenvolvedor, **quero** um schema `payments` que sobe num Postgres vazio, **para** o banco novo não depender de `auth.users`, roles do Supabase nem RLS.

### Critérios de aceite

- Uma migração nova, nomeada com data `YYYYMMDDHHMMSS`, cria o schema e as tabelas atuais: produtos, preços, add-ons, upgrades, cupons, perfis, admins, pedidos, pagamentos Pagar.me e Asaas, subscriptions, webhook events, email logs, políticas de reembolso e configurações da plataforma.
- `payments.profiles.id` é `uuid` primário gerado pela aplicação. Não há FK para `auth.users`. E-mail continua único.
- Não existem `GRANT` para `anon`, `authenticated` ou `service_role`, nem `ENABLE ROW LEVEL SECURITY`, nem publication `supabase_realtime`.
- Extensões usadas de fato (no mínimo `pgcrypto` se os defaults de uuid dependerem dela) são criadas na migração. Nenhuma extensão exclusiva do Supabase entra.
- A migração aplica num Postgres 16 vazio, duas vezes seguidas não duplica objeto, e as migrações antigas de `supabase/migrations` não são executadas nesse banco.
- Índices de pedido por usuário e data, e os índices de deduplicação já existentes (evento de webhook, pagamento Asaas), são recriados.

### Fora desta história

Portar funções. Isso é a US-05. Copiar dados de produção é a US-18.

---

## US-05. Regras de negócio que continuam no banco

**Como** desenvolvedor, **quero** no banco só as regras que protegem integridade, **para** checkout e webhook não dependerem de RPC com `auth.uid()`.

### Critérios de aceite

- Entram, sem ler `auth.uid()`, `auth.role()` nem `request.jwt`:
  - `payments.update_updated_at_column`
  - `payments.sync_stock_sold_from_orders` e `payments.recalc_stock_for_price`
  - `payments.enforce_price_upgrade_same_product`
  - `payments.catalog_price_pair_visible_public`, se a visibilidade do par de preços continuar sendo invariante de dados
  - `payments.validate_refund_policy` e `payments.get_product_refund_policy`
  - `payments.apply_refund_to_order`
  - `payments.prevent_payment_delete` com a regra atual: apagar só pagamento em estado permitido
- Funções de autorização não são recriadas: `is_admin_user`, `is_super_admin`, `get_current_admin`, `get_current_profile`, `handle_new_user`. Admin e perfil passam para a aplicação nas US-14 e US-15.
- `upsert_profile` deixa de ser RPC. A gravação do perfil é SQL parametrizado na aplicação, com o `id` do usuário da sessão.
- `get_sales_stats`, `cleanup_expired_payments` e `get_pending_pagarme_payment` viram query na aplicação, com o mesmo filtro que a função tinha. A versão que exigia `service_role` não volta.
- Cada função recriada tem teste SQL ou teste de integração que cobre o caso que a função existe para impedir (estoque, reembolso, delete proibido, upgrade de outro produto).

### Dependências

US-04.

---

## US-06. Cliente SQL só no servidor

**Como** desenvolvedor, **quero** uma única forma de abrir conexão com o Postgres a partir do Next, **para** repositório, checkout e webhook deixarem de usar o cliente Supabase no servidor.

### Critérios de aceite

- Existe um módulo de servidor que lê `DATABASE_URL` e entrega um pool com teto de 10 conexões. Esse módulo não é importável por componente com `use client`.
- `DATABASE_URL` não tem prefixo `NEXT_PUBLIC_`. O bundle do browser não contém a string de conexão.
- Timeout de conexão e de statement estão definidos. Erro de banco vira o erro já tratado em `error-handler`, sem vazar SQL nem detalhe de conexão em produção.
- Transação explícita existe para os fluxos que gravam pedido e pagamento juntos.
- Os tipos de linha usados pelo repositório são gerados ou declarados a partir do schema novo. `database.types.ts` do Supabase deixa de ser a fonte das queries novas.

### Dependências

US-01 e US-04. Pode apontar primeiro para o Postgres vazio de desenvolvimento.

---

## US-07. Catálogo público pelo servidor

**Como** cliente no checkout, **quero** ver produto, preço, add-on e cupom pelos mesmos contratos de API, **para** a página não consultar o banco no browser.

### Critérios de aceite

- `GET /api/products/[ref]`, `GET /api/products/by-price/[priceId]`, `GET /api/products/batch` e `POST /api/payments/coupon/preview` leem do Postgres e devolvem o mesmo formato de hoje.
- Preço inativo, produto invisível e par de add-on que não passa em `catalog_price_pair_visible_public` continuam fora da resposta pública.
- A página de checkout e os hooks de preço não importam `@/supabase/client`.
- Testes de rota existentes desses endpoints passam contra o banco novo, ou foram reescritos para o cliente SQL sem afrouxar o caso.

### Dependências

US-05 e US-06.

---

## US-08. Checkout grava pedido e pagamento

**Como** cliente, **quero** concluir checkout à vista e parcelado no Asaas, e o checkout do Pagar.me, **para** o pedido existir no Postgres com o mesmo vínculo de perfil, preço, cupom e add-on.

### Critérios de aceite

- As rotas de checkout em `packages/core` e os wrappers em `front-pagamento` gravam `orders` e a tabela do gateway na mesma transação. Falha no segundo insert não deixa pedido órfão.
- Regras atuais de preço, cupom, add-on, estoque e metadata de acesso continuam valendo. Esta história não muda cálculo.
- O perfil do pagador é criado ou atualizado pelo `id` da aplicação, não por `auth.admin.createUser`.
- Idempotência já existente (pagamento pendente repetido, dedup Asaas) continua impedindo dois pedidos para a mesma tentativa.
- Testes de `asaas-checkout-avista`, `asaas-checkout-parcelado` e `pagarme-checkout` passam sem mock do cliente Supabase. O mock, se restar, é o gateway HTTP.

### Dependências

US-05, US-06 e US-13. O checkout precisa do usuário da sessão nova, ou de um adaptador temporário explícito que ainda lê o id do Supabase só até a US-16. Não misturar os dois em produção.

---

## US-09. Webhooks Asaas e Pagar.me

**Como** operador, **quero** os webhooks atualizando pagamento, pedido, estoque e reembolso no Postgres, **para** o status pago não depender do Supabase.

### Critérios de aceite

- `POST /api/payments/asaas/webhook` e `POST /api/payments/pagarme/webhook` autenticam pelo segredo atual e gravam em `webhook_events` com o índice de deduplicação.
- Evento repetido não aplica o pagamento duas vezes.
- Transições de status, `apply_refund_to_order` e o trigger de estoque rodam no banco novo.
- Log de webhook e reenvio de e-mail administrativo continuam registrando em `email_logs`.
- Assinatura inválida responde erro e não escreve pagamento.

### Dependências

US-05 e US-06.

---

## US-10. Pedidos, pagamentos e dashboard do admin

**Como** admin, **quero** listar, abrir, cancelar, marcar como pago, apagar o que a regra permite e ver o resumo de vendas, **para** a operação diária não usar o Supabase.

### Critérios de aceite

- As rotas em `app/api/admin/orders`, `app/api/admin/payments`, `mark-paid`, `cancel`, `delete-permanent`, `subscriptions`, `dashboard/stats` e `connections` leem e gravam no Postgres.
- Marcar como pago e cancelar respeitam o estado atual do pagamento e o vínculo com o gateway. Recalcular estoque chama `recalc_stock_for_price`.
- Apagar pagamento passa por `prevent_payment_delete`. O que a função recusa continua recusado.
- O resumo de vendas devolve os mesmos agregados que `get_sales_stats` devolve hoje, calculados na aplicação.
- Quem não é admin recebe 401 ou 403. A checagem usa a sessão nova e `admin_users`, não RPC `is_admin_user`.
- Testes de rota desses fluxos passam.

### Dependências

US-06, US-09 e US-15.

---

## US-11. Cupons, produtos e configurações no admin

**Como** admin, **quero** editar produtos, preços, cupons, política de reembolso, webhooks de produto e configurações da plataforma, **para** o catálogo ser mantido no Postgres.

### Critérios de aceite

- CRUDs de produto, preço, cupom, templates de reembolso, webhooks e `platform-settings` usam o cliente SQL.
- Cascata de preço ao apagar produto, faixas de cupom, preços vinculados ao cupom e a restrição de upgrade no mesmo produto continuam ativas.
- Recalc de estoque pela rota de preço devolve o valor gravado depois do trigger.
- Edição com IA, se chamar o banco, usa o mesmo cliente. A chamada ao modelo não muda.

### Dependências

US-05 e US-06.

---

## US-12. Perfil e pedidos do cliente

**Como** cliente autenticado, **quero** ver e atualizar meu perfil e a lista dos meus pedidos, **para** eu não acessar o pedido de outra pessoa.

### Critérios de aceite

- `GET` e `PATCH /api/profile`, e `GET /api/profile/orders`, filtram por `profiles.id` igual ao usuário da sessão.
- Um segundo usuário autenticado não lê nem altera o perfil ou o pedido do primeiro. Há teste cobrindo esse caso.
- Campos de cobrança, documento e metadata de gateway continuam no mesmo formato.
- A tela de perfil não importa cliente Supabase.

### Dependências

US-06 e US-13.

---

## US-13. Sessão e código por e-mail

**Como** cliente, **quero** entrar com o e-mail e um código de uso único, **para** o checkout e a área logada funcionarem sem GoTrue.

### Critérios de aceite

- Existem tabelas de usuário (o próprio `payments.profiles`), código de acesso e sessão, na migração datada. Código tem hash, expiração curta e limite de tentativas. Sessão tem id opaco, expiração e revogação.
- Pedir código para um e-mail novo cria o perfil sem senha. Pedir para um e-mail existente não duplica perfil.
- O e-mail do código sai pelo provedor já usado no projeto. O código em claro não é logado.
- Verificar o código grava cookie `httpOnly`, `Secure` em produção, `SameSite` coerente com o domínio atual (`NEXT_PUBLIC_COOKIE_DOMAIN` se estiver definido). O cookie não é o JWT do Supabase.
- Código expirado, reusado ou acima do limite de tentativas falha sem criar sessão.
- `sendOtpAndCreateUserIfNeeded` deixa de chamar `auth.admin.listUsers`, `createUser` e `signInWithOtp`.

### Dependências

US-04.

### Fora desta história

Tela. A troca dos componentes é a US-14. Senha permanente não entra.

---

## US-14. Login, logout e header na sessão nova

**Como** cliente, **quero** o mesmo fluxo visível de entrar, sair e permanecer logado, **para** checkout, header e perfil não chamarem `supabase.auth`.

### Critérios de aceite

- `login-form`, `email-auth-form`, `logout-button`, `public-header` e a página de checkout usam as rotas da US-13.
- Recarregar a página mantém a sessão até expirar. Sair revoga a sessão no banco e apaga o cookie.
- Não resta `onAuthStateChange`, `getSession` nem `signInWithOtp` em componente de UI.
- Layout de perfil e de admin redirecionam quem não tem sessão, com o mesmo destino de hoje.

### Dependências

US-13.

---

## US-15. Admin na mesma sessão

**Como** admin, **quero** que a permissão continue na tabela `admin_users`, **para** um cliente comum não abra o painel só porque está logado.

### Critérios de aceite

- `admin_users.id` referencia `payments.profiles.id`. Papel e `is_active` continuam os campos que liberam o painel.
- `api-guards` e o middleware (`proxy.ts`) leem a sessão nova e a linha de admin. Não chamam RPC nem `supabase.auth.getUser`.
- Admin inativo ou inexistente recebe 403 nas rotas `/api/admin/*` e não vê o layout admin.
- Super admin, se o código ainda distinguir o papel, continua distinguindo pelo campo da tabela, não por `is_super_admin()` no banco.
- O primeiro admin de um ambiente novo tem caminho documentado de insert. Não há bootstrap por service role.

### Dependências

US-13 e US-14.

---

## US-16. Corte do cliente Supabase no browser e no servidor

**Como** desenvolvedor, **quero** o repositório sem `@supabase/supabase-js` e sem `@supabase/ssr` no fluxo de produção, **para** ninguém voltar a apontar tela para o projeto antigo.

### Critérios de aceite

- Nenhum arquivo em `front-pagamento/src` nem em `packages/core/src` importa cliente Supabase no caminho usado em produção.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` saem do env de runtime. Build de produção não exige essas variáveis.
- `client-factory`, `middleware-client`, `server` e `client` do Supabase são removidos ou deixam de ser referenciados.
- Busca por `supabase.auth`, `.schema('payments')` e `createAdminSupabaseClient` no código de produção não retorna uso.

### Dependências

US-07 a US-15 e US-17. Esta história fecha a troca. Não começa antes das rotas críticas estarem no SQL.

---

## US-17. Status de pagamento sem Realtime

**Como** cliente que acabou de pagar, **quero** ver PIX, boleto e confirmação atualizarem na tela, **para** o checkout não abrir canal WebSocket do Supabase.

### Critérios de aceite

- `use-payment-polling` consulta só `GET /api/payments/[id]/status` e a rota de confirmação. Não usa `supabase.channel`.
- A rota de status lê o Postgres e devolve os mesmos campos que a UI já consome: status, link, linha de boleto, QR e copia-e-cola do PIX.
- O cliente só consulta um pagamento da própria sessão, ou um pagamento anônimo ainda no fluxo de checkout com o segredo já usado hoje. Não há listagem aberta por id adivinhado de outro cliente. O critério fica explícito no teste da rota.
- A publication `supabase_realtime` não é criada no banco novo.
- Intervalo de polling permanece o atual, sem loop mais agressivo para compensar a ausência do canal.

### Dependências

US-06 e US-09.

---

## US-18. Cópia dos dados de produção

**Como** operador, **quero** copiar catálogo, clientes, pedidos e pagamentos para o Postgres novo sem mudar ids, **para** o corte não quebrar cobrança já aberta no gateway.

### Critérios de aceite

- O dump de origem é só o schema `payments`, mais de `auth.users` os campos `id` e `email` (e o mínimo para casar o perfil). Senha e hash do GoTrue não são copiados.
- `profiles.id` no destino é o mesmo uuid de `auth.users`. Pedidos e pagamentos apontam para esse id.
- Contagens batem entre origem e destino para `products`, `prices`, `orders`, `pagarme_payments`, `asaas_payments`, `profiles` e `admin_users`.
- E-mail duplicado ou perfil sem usuário correspondente aparece num relatório e não é inserido em silêncio.
- A cópia é repetível: rodar de novo não duplica linha com o mesmo id.
- Ninguém fica com sessão válida herdada. O primeiro acesso depois do corte pede código novo.
- O Supabase de produção não é alterado por essa história, além de leitura.

### Dependências

US-04, US-05 e US-02. Roda primeiro num restore de ensaio.

---

## US-19. Corte, verificação e remoção do projeto Supabase

**Como** operador, **quero** apontar o serviço para o Postgres do VPS e só então aposentar o Supabase, **para** ter como voltar se checkout ou webhook falhar.

### Critérios de aceite

- O ensaio da US-18 passa no banco do VPS antes do corte.
- No corte, `DATABASE_URL` do Next aponta para o compose da US-01. Webhooks dos gateways continuam na mesma URL pública da aplicação.
- Checklist manual mínimo, em produção ou ensaio final com gateway de teste: checkout à vista, checkout parcelado, webhook de pagamento confirmado, cupom, login por código, pedido no admin, marcar como pago, recalcular estoque.
- Rollback é voltar o env do app para o Supabase anterior, com o código da release anterior. O Postgres novo não é apagado no rollback.
- O projeto Supabase só é desligado depois de uma janela acordada sem erro de checkout e de webhook. Até lá ele fica só leitura, se a plataforma permitir, ou intacto sem receber escrita da aplicação.
- Não há `db reset` em nenhum dos dois bancos durante o corte.

### Dependências

US-02, US-16, US-17 e US-18.

---

## Mapa rápido

| História | Entrega | Depende de |
| --- | --- | --- |
| US-01 | Compose do Postgres, rede interna | — |
| US-02 | Dump, retenção e restore de prova | US-01 |
| US-03 | Teto de RAM e de conexões | US-01 |
| US-04 | Schema `payments` limpo | US-01 |
| US-05 | Funções de integridade, sem `auth.*` | US-04 |
| US-06 | Pool SQL só no servidor | US-01, US-04 |
| US-07 | Catálogo e preview de cupom | US-05, US-06 |
| US-08 | Checkout Asaas e Pagar.me | US-05, US-06, US-13 |
| US-09 | Webhooks | US-05, US-06 |
| US-10 | Admin de pedidos e vendas | US-06, US-09, US-15 |
| US-11 | Admin de catálogo e cupom | US-05, US-06 |
| US-12 | Perfil do cliente | US-06, US-13 |
| US-13 | Código por e-mail e sessão | US-04 |
| US-14 | Telas de login e logout | US-13 |
| US-15 | Admin na sessão nova | US-13, US-14 |
| US-16 | Remoção do SDK Supabase | US-07 a US-15, US-17 |
| US-17 | Polling sem Realtime | US-06, US-09 |
| US-18 | Cópia com os mesmos ids | US-02, US-04, US-05 |
| US-19 | Corte e rollback | US-02, US-16, US-17, US-18 |
