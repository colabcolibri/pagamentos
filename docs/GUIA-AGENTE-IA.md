# Como colocar no ar usando IA (Cursor, Claude Code, etc.)

Criei este guia pensando em quem programa com assistentes de IA (Cursor em modo Composer/Agent, Claude Code, Copilot ou Windsurf).

Se você não quiser ficar lendo documentação de Docker e `.env`, você pode simplesmente copiar o prompt abaixo e mandar o seu agente fazer o trabalho sujo por você.

---

## Antes disso: por que diabos Pagar.me + Asaas e não Stripe?

Sempre me perguntam por que não usei Stripe. 

A Stripe é fantástica lá fora, mas quem vende no Brasil sabe a realidade do nosso mercado:

1. **O brasileiro compra parcelado:** Quase ninguém compra curso ou produto digital de R$ 500 ou R$ 1.000 à vista no cartão. A Pagar.me resolve o parcelamento em até 12x com regras claras de antecipação e taxas justas.
2. **Muita gente não tem limite no cartão:** Esse é o maior motivo de ter colocado o Asaas. O Asaas tem **Boleto Parcelado (carnê em até 12x)**. Cada mês o cliente recebe e paga um boleto individual sem consumir o limite do cartão. Eu cansei de ver venda perdida porque o cliente queria comprar mas o cartão não passava; o boleto parcelado salva essas vendas.
3. **Pix de verdade:** Os dois têm Pix nativo com webhook estável e confirmação em segundos.

Juntar os dois resolve 100% das formas como o brasileiro realmente paga na internet.

---

## Prompt pronto para você colar no seu Agente

Abra o projeto no seu editor (Cursor, VS Code com Claude Code, etc.) e cole isto no chat:

```text
Você é meu assistente de desenvolvimento. Quero colocar o projeto Quitou para rodar localmente nesta máquina.

Faça o seguinte passo a passo:
1. Veja se o Docker está instalado e rodando.
2. Copie o arquivo `.env.example` para `.env` se ele ainda não existir.
3. Gere uma chave aleatória segura de 32 bytes (tipo `openssl rand -hex 32`) e coloque na variável ACCESS_CODE_SECRET no .env.
4. Me pergunte aqui no chat apenas 4 informações que preciso definir:
   - Qual meu e-mail de admin (ADMIN_EMAIL)
   - Uma senha para o banco de dados (POSTGRES_PASSWORD)
   - A URL do app (NEXT_PUBLIC_APP_URL - padrão http://localhost:3004)
   - O nome da minha marca ou projeto (BRAND_NAME)
5. Assim que eu responder, salve o .env e rode `docker compose up --build -d`.
6. Veja os logs para confirmar que o Postgres e a aplicação subiram e me avise quando estiver pronto para eu abrir no navegador.
```

---

## Como conectar no seu sistema (área de membros, LMS ou SaaS)

Depois que a pessoa paga, você provavelmente quer liberar o acesso dela no seu próprio sistema. É bem simples:

1. Vá em `/admin/products` e edite seu produto.
2. Em **Webhook de Confirmação**, coloque a URL da sua API (ex: `https://meuapp.com/api/webhook-quitou`) e defina um segredo qualquer.
3. Quando o pagamento for confirmado (Pix caiu, cartão aprovou ou boleto compensou), o Quitou dispara um POST nessa sua URL com os dados do cliente (nome, e-mail, CPF, produto e valor).
4. No seu backend, você recebe o POST e cria a conta do aluno/usuário.

---

## Dica bônus: MCP (para quem usa Claude Desktop ou Cursor)

O Quitou já vem com servidor MCP embutido. Isso significa que você pode plugar ele no seu Claude Desktop ou Cursor e gerenciar sua loja conversando:

- *"Quantos pedidos foram pagos hoje?"*
- *"Cria um cupom de 15% válido até sexta-feira"*
- *"Reenvia o e-mail de acesso pro cliente tal"*

Você ativa ou desativa isso e controla o que a IA pode fazer direto na aba de Configurações do painel.
