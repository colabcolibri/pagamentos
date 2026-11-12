# Quitou

![Quitou](./docs/assets/banner.svg)

> Checkout e painel de pagamentos brasileiro, auto-hospedado (*self-hosted*), com suporte a **Pagar.me** e **Asaas** (inclusive boleto parcelado). Desenvolvido em Next.js e PostgreSQL, configurável por variáveis de ambiente e pronto para rodar com Docker Compose.

---

## Para que serve?

O **Quitou** resolve o problema clássico de vender cursos, produtos digitais ou assinaturas no Brasil sem depender de plataformas fechadas (que cobram porcentagens altas por venda):

- **Checkout direto no seu domínio:** receba por **Pix** (com confirmação em tempo real), **Cartão de crédito** (em até 12x via Pagar.me) e **Boleto Parcelado** (carnê em até 12x via Asaas).
- **Sem taxas de intermediação:** você paga apenas a taxa padrão da sua própria conta na adquirente (Pagar.me / Asaas).
- **Painel administrativo enxuto:** gerencie produtos, preços, cupons de desconto, clientes, pedidos e veja os logs de e-mails transacionais.
- **Integração simples:** envie um webhook HTTPS para a sua plataforma (LMS, SaaS ou área de membros) quando o pagamento for aprovado.
- **Marca configurável (*white-label*):** defina o nome, logo, e-mail de suporte e dados da sua empresa diretamente no `.env`, sem precisar alterar código.
- **Servidor MCP incluso:** interface Model Context Protocol com OAuth 2.0 para consultar pedidos e operar o painel por IA (Claude, Cursor, etc.).

---

## 🤖 Quer implementar usando um Agente de IA (Cursor, Claude, Copilot)?

Se você prefere que um assistente de IA configure tudo para você no seu editor ou servidor, criamos um guia com prompts prontos para copiar e colar:

👉 **[Ver Guia de Implementação com Agentes de IA (`docs/GUIA-AGENTE-IA.md`)](./docs/GUIA-AGENTE-IA.md)**

O guia inclui o prompt completo para o agente rodar o Docker, gerar as chaves e conectar o sistema à sua plataforma.

---

## Por que Pagar.me + Asaas (e não Stripe)?

Para quem desenvolve no Brasil, a Stripe costuma ser limitada ou burocrática em aspectos fundamentais do nosso mercado:
- **Pagar.me:** Parcelamento em até 12x no cartão de crédito com taxas transparentes, além de Pix com confirmação imediata.
- **Asaas:** Possui o recurso essencial de **Boleto Parcelado (Carnê em até 12x)** — permitindo vender para clientes que não possuem limite no cartão de crédito, sem risco de inadimplência travar a sua esteira.

Combinar os dois permite atender 100% dos hábitos de pagamento do consumidor brasileiro.

---

## Como rodar em 3 passos (Docker)

### 1. Clonar e configurar o ambiente

```bash
git clone https://github.com/SEU_USUARIO/quitou.git
cd quitou

# Copie o arquivo de exemplo
cp .env.example .env
```

Abra o `.env` e preencha:
- A senha do banco (`POSTGRES_PASSWORD`).
- Uma chave segura para a sessão (`ACCESS_CODE_SECRET` — gere no terminal com `openssl rand -hex 32`).
- O seu e-mail em `ADMIN_EMAIL` (ao fazer login com este e-mail, você vira admin da aplicação).
- A URL do app (`NEXT_PUBLIC_APP_URL`, ex.: `http://localhost:3004`).

### 2. Subir a stack

```bash
docker compose up --build -d
```

O comando sobe o **PostgreSQL 16**, roda as migrações SQL automaticamente e inicializa a aplicação Next.js em **`http://localhost:3004`**.

### 3. Fazer login no painel

Acesse `http://localhost:3004/login` e informe o e-mail definido em `ADMIN_EMAIL`. Um código de 6 dígitos será enviado pelo SMTP configurado (em desenvolvimento local com Mailpit, visualize a caixa de entrada em `http://localhost:8025`).

---

## Configurando os Gateways

Você pode informar as chaves dos gateways diretamente pelo painel administrativo em **Configurações** (`/admin/settings`) ou no arquivo `.env`:

### Pagar.me
- **Chave secreta:** `PAGARME_SECRET_KEY` (obtida no dashboard da Pagar.me).
- **Webhook:** Cadastre a URL `https://seu-dominio.com/api/payments/pagarme/webhook` com Basic Auth (usuário e senha informados em `PAGARME_WEBHOOK_USER` e `PAGARME_WEBHOOK_SECRET`).

### Asaas
- **API Key:** `ASAAS_API_KEY` (obtida em *Configurações → Integrações → API*).
- **Webhook:** Cadastre a URL `https://seu-dominio.com/api/payments/asaas/webhook` informando o mesmo token definido em `ASAAS_WEBHOOK_SECRET`.

No painel administrativo, há um botão de **"Testar conexões"** para validar as credenciais antes de colocar no ar.

---

## O que tem no projeto

```text
quitou/
├── compose.yml              # Stack Docker completa (PostgreSQL 16 + Migrações + App)
├── .env.example             # Modelo de variáveis de ambiente
├── deploy/
│   ├── app/Dockerfile       # Build multi-stage seguro (execução como usuário não-root)
│   └── postgres/            # Compose e utilitários para backup/restore do banco
├── packages/
│   └── core/                # @quitou/core: regras de cobrança, cálculo de preços e gateways
├── front-pagamento/         # Aplicação Next.js 16 (App Router)
│   ├── src/app/checkout/    # Tela de checkout pública e confirmação
│   ├── src/app/admin/       # Painel administrativo completo
│   ├── src/app/api/mcp/     # Endpoint do servidor MCP com OAuth 2.0
│   └── db/migrations/       # Migrações SQL do schema payments
├── docs/                    # Documentação técnica de arquitetura, banco e segurança
└── LICENSE                  # Licença MIT
```

---

## Desenvolvimento local (sem rodar o app no Docker)

Se quiser trabalhar no código com Hot Reload:

```bash
# 1. Instale as dependências
pnpm install

# 2. Suba apenas o Postgres local (porta 127.0.0.1:5435)
docker compose -f deploy/postgres/compose.yml up -d

# 3. Configure as variáveis locais
cp front-pagamento/.env.example front-pagamento/.env.local

# 4. Aplique as migrações SQL
DATABASE_URL="postgres://quitou:quitou@127.0.0.1:5435/quitou" node front-pagamento/scripts/apply-migrations.mjs

# 5. Inicie em modo dev
pnpm dev

# Testes e verificação de código
pnpm test
pnpm --filter @quitou/admin lint
```

---

## Dúvidas e Contribuições

Se tiver dúvidas ou encontrar algum problema, fique à vontade para abrir uma **[Issue](../../issues)**.

Como este é um projeto independente com escopo enxuto, **pedimos que não envie Pull Requests sem antes abrir uma Issue para conversarmos**. Veja mais detalhes em [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Licença

Distribuído sob a licença [MIT](./LICENSE).
