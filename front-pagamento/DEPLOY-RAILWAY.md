# Deploy

O caminho suportado para subir o Quitou é o `compose.yml` na raiz do repositório. Copie `.env.example` para `.env`, preencha marca, banco, SMTP e o e-mail do admin, e rode `docker compose up --build`.

Se o provedor sobe um serviço Node e outro Postgres, use `front-pagamento` como diretório do app, `DATABASE_URL` apontando para o Postgres interno, e o comando de migration `node scripts/apply-migrations.mjs` antes do `next start`.
