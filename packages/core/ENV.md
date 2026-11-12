# Variáveis de Ambiente (`@quitou/core`)

## ⚡ Variáveis utilizadas pelo `@quitou/core`

```env
# Pagar.me — Chave secreta e credenciais de webhook (Basic Auth)
PAGARME_SECRET_KEY=sk_...
PAGARME_WEBHOOK_USER=seu_usuario_webhook
PAGARME_WEBHOOK_SECRET=sua_senha_webhook
# sandbox | production (padrão: production)
# PAGARME_ENVIRONMENT=sandbox

# Asaas — Chave de API e token de webhook (header asaas-access-token)
ASAAS_API_KEY=$aact_...
ASAAS_WEBHOOK_SECRET=seu_token_webhook
# sandbox | production (padrão: production)
# ASAAS_ENVIRONMENT=sandbox

# E-mail — Configuração SMTP (Nodemailer)
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=dev@example.com
EMAIL_FROM_NAME=Quitou

# Criptografia em repouso de segredos (AES-256-GCM)
ACCESS_CODE_SECRET=gere_com_openssl_rand_hex_32
# Opcional: chave dedicada para cifrar segredos no banco (se omitida, deriva de ACCESS_CODE_SECRET)
# SETTINGS_ENCRYPTION_KEY=
```

Você também pode instanciar os serviços passando as chaves diretamente por parâmetro:

```typescript
import { createPagarmeService, createAsaasService } from '@quitou/core'

const pagarme = createPagarmeService('sk_test_...', 'sandbox')
const asaas = createAsaasService('$aact_...', 'sandbox')
```

---

## 🔧 Aplicação Completa (`front-pagamento`)

Para a lista completa de variáveis da aplicação web (PostgreSQL `DATABASE_URL`, marca `BRAND_*`, `ADMIN_EMAIL`, `MCP_ALLOWED_REDIRECT_HOSTS`, etc.), consulte:

- [`.env.example`](../../.env.example) na raiz do monorepo (para Docker Compose)
- [`front-pagamento/.env.example`](../../front-pagamento/.env.example) (para desenvolvimento local)
