# Gerar produto por URL (scrape) — revisão para site real

Objetivo: permitir que o admin informe uma **URL de um site real** (ex.: `https://meusite.com/comunidade`). O sistema obtém o conteúdo da página em texto legível e envia à IA para gerar o produto, sem precisar digitar os campos.

---

## 1. Lib vs serviço (URL pública, site real)

### Lib (self-hosted) — fetch + extração no backend

- **Fluxo:** API route Next.js faz `fetch(url)` → HTML → cheerio (body inteiro, removendo só script/style) → html-to-text. Ou usar serviço tipo Jina Reader (GET r.jina.ai/url).
- **Funciona para:** Qualquer URL **pública**. O servidor Next acessa a URL pela internet; localhost não é requisito.
- **Prós:** Sem API key, sem custo, sem rate limit de terceiro; dados não saem do seu ambiente; controle total (timeout, tamanho).
- **Contras:** Não executa JavaScript. Páginas 100% SPA (conteúdo carregado só após JS) podem vir vazias ou incompletas.
- **Quando basta:** Sites com conteúdo no HTML inicial (SSR, landing pages estáticas, muitos blogs e páginas de produto).

### Serviço externo (Firecrawl, Jina Reader, etc.)

- **Fluxo:** Sua API envia a URL ao serviço; eles fazem o fetch (e opcionalmente renderizam JS) e devolvem texto/markdown.
- **Funciona para:** Apenas URLs **públicas** (eles não acessam sua rede nem localhost).
- **Prós:** Alguns oferecem renderização JS (útil para SPA); menos código de extração no seu lado.
- **Contras:** API key, custo/limites, latência, URL (e às vezes conteúdo) passa por terceiros.

### Recomendação para “site real”

- **Implementar com lib (cheerio + html-to-text) pegando body inteiro**, ou com **Jina Reader (r.jina.ai)** se quiser serviço “inteligente” sem API key.

- **Serviço externo só se precisar depois.**  
  Se na prática muitas páginas forem SPA e o conteúdo vier vazio, aí vale considerar um provedor com renderização JS (ex.: Jina Reader, Firecrawl), via env var opcional, sem mudar o fluxo principal.

---

## 2. Segurança e ops (site real, não localhost)

### Premissa

- Uso principal: **site real** (URL pública).
- Localhost foi só exemplo; em produção podemos **bloquear localhost** e IPs internos para reduzir SSRF.

### Riscos e mitigações

| Risco | Mitigação |
|-------|------------|
| **SSRF** (acessar rede interna ou metadados) | Resolver o hostname da URL para IP; **bloquear** IPs privados (10.x, 172.16–31.x, 192.168.x), link-local (169.254.x), metadados (169.254.169.254) e, em produção, **localhost** (127.0.0.1, ::1). Só fazer `fetch` se o IP for permitido. |
| **DoS** (URL lenta ou resposta gigante) | Timeout (ex.: 8–10 s) e limite de tamanho do body (ex.: 1–2 MB). Abortar se passar. |
| **Redirects infinitos** | Limitar redirects (ex.: máx. 5). |

### Localhost

- **Desenvolvimento:** Pode permitir localhost na API (ex.: variável `ALLOW_LOCALHOST_SCRAPE=true`) para testar com app local.
- **Produção:** **Bloquear** localhost e IPs internos. Quem quiser testar com app local usa tunnel (ngrok, Cloudflare Tunnel) com URL pública.

### Whitelist vs qualquer URL

- Para “site real” genérico: **permitir qualquer URL pública** (após bloqueio de IPs acima) é razoável.
- Se quiser mais controle: **whitelist de domínios** (ex.: só seus domínios + lista configurável) reduz ainda mais risco; a decisão pode ser configurável (env ou admin).

---

## 3. Libs leves no GitHub/npm (pesquisa)

Opções encontradas para **uma URL → conteúdo legível** (fetch + extração), sem crawler de múltiplas páginas.

| Lib | GitHub | npm | Descrição | Peso / observação |
|-----|--------|-----|-----------|-------------------|
| **@extractus/article-extractor** | [extractus/article-extractor](https://github.com/extractus/article-extractor) (~1.9k ⭐) | `@extractus/article-extractor` | Recebe **URL**, faz fetch e extrai artigo (título, descrição, conteúdo, autor, etc.). Usa @mozilla/readability + linkedom. | **Leve no uso:** uma chamada `extract(url)`. Deps: readability, linkedom, cross-fetch, sanitize-html. Node 20+. TypeScript. |
| **@mozilla/readability** | [mozilla/readability](https://github.com/mozilla/readability) (~11k ⭐) | `@mozilla/readability` | Só extração: recebe **documento DOM**, devolve artigo (título, content HTML, textContent). Não faz fetch. | Você faz `fetch` + precisa de um DOM (jsdom ou linkedom). Mais controle (timeout, SSRF no seu fetch). |
| **unfluff** | [ageitgey/node-unfluff](https://github.com/ageitgey/node-unfluff) (~2.2k ⭐) | `unfluff` | Recebe **HTML**, extrai texto principal + metadados (título, autor, imagens, etc.). Não faz fetch. | Leve; baseado em heurísticas tipo goose. Sem DOM (parse próprio). Última atividade ~2023. |
| **html-to-text** | [html-to-text/node-html-to-text](https://github.com/html-to-text/node-html-to-text) (~1.7k ⭐) | `html-to-text` | Converte **HTML → texto** formatado. Não extrai “artigo”, só transforma markup em texto. | Muito usado (milhões downloads/semana). Combinar com readability ou unfluff para “conteúdo principal”. |
| **cheerio** | [cheeriojs/cheerio](https://github.com/cheeriojs/cheerio) | `cheerio` | Parse HTML + API estilo jQuery (seletores). Não faz fetch nem extrai artigo sozinho. | Leve. Útil para pegar um container (ex.: `main`, `.content`) e depois passar para html-to-text. |

**Site vs blog (importante):**

- As páginas alvo são **sites** (Next.js, landing, produto, comunidade), **não** posts de blog.
- **Readability**, **article-extractor** e **unfluff** são otimizados para “um artigo”: um bloco principal (título + texto corrido). Em páginas com várias seções (hero, preços, features, FAQ), eles podem escolher só um bloco ou descartar demais.
- Para **sites** (estrutura variada, várias seções), o ideal é pegar o **conteúdo da página como um todo** e converter em texto, sem heurística de “artigo”.

**Pegar tudo (não só `main`):**

- O ponto é obter **todo o conteúdo** da página (nav, hero, preços, features, FAQ, footer), não um único bloco.
- **Abordagem com lib:** usar o **`body` inteiro** (ou a raiz do app, ex.: `#__next` se existir), **remover só `script` e `style`** (para não incluir código nem CSS), e passar o HTML restante para **html-to-text**. Assim sai todo o texto visível da página, em ordem, sem escolher “conteúdo principal”. Implementação: fetch → cheerio → `$('script, style').remove()` → pegar `body` (ou `#__next` ou `html`) → html-to-text.
- Não usar só `main`: em muitos sites o que importa (preços, CTAs, benefícios) está em várias seções; usar body (sem script/style) cobre tudo.

**Serviço online open source, sem API key:**

- **Jina Reader (r.jina.ai)** — [jina-ai/reader](https://github.com/jina-ai/reader) (open source, Apache 2.0).
  - **Uso:** GET `https://r.jina.ai/<URL_da_página>` (ex.: `https://r.jina.ai/https://exemplo.com/comunidade`). Resposta em markdown/texto otimizado para LLM.
  - **Sem API key** no uso básico; rate limit no free tier. Projeto open source; o serviço r.jina.ai é a versão hospedada pela Jina.
  - Extrai conteúdo da página de forma inteligente (incluindo estrutura); útil quando você quer “algo mais inteligente” sem manter pipeline próprio.

**Recomendação para sites (Next, landing, produto):**

- **Com lib (controle total, pegar tudo):** **cheerio + html-to-text** com **body inteiro**: fetch → cheerio → remover `script` e `style` → `body` (ou `#__next`) → html-to-text. Resultado: todo o texto da página.
- **Com serviço sem API key:** **Jina Reader** — seu backend faz GET `https://r.jina.ai/${encodeURIComponent(url)}` e usa o corpo da resposta como contexto para a IA. Mais “inteligente” (extração feita por eles), open source, sem cadastro para uso básico.

**Quando usar Readability / article-extractor:** Apenas se as páginas forem **principalmente artigos** (blog, notícia, post único).

Nenhuma dessas libs é um “crawler” de múltiplas páginas; são todas **extração de uma página** (leve para o uso de “uma URL → texto para a IA”).

---

## 4. Resumo técnico

| Tema | Decisão |
|------|--------|
| **Abordagem** | Lib no backend; serviço externo só se SPAs forem problema depois. |
| **Tipo de página** | **Sites** (Next, landing, produto, comunidade), não blogs. |
| **Pegar tudo** | **body inteiro** (ou `#__next`), removendo só `script` e `style` → html-to-text. Não restringir a `main`; assim nav, hero, preços, FAQ, footer entram. |
| **Stack com lib** | **cheerio + html-to-text**: fetch → cheerio → strip script/style → body (ou #__next) → html-to-text. |
| **Serviço sem API key** | **Jina Reader**: GET `https://r.jina.ai/<url>` devolve conteúdo em markdown. Open source (jina-ai/reader), uso básico sem key. |
| **Alcance** | URL de **site real** (pública). Localhost opcional em dev, bloqueado em prod. |
| **Segurança** | Bloquear IPs privados, link-local e metadados (e localhost em prod); timeout 8–10 s; body máx. 1–2 MB; redirects limitados. |
| **Dependências** | **cheerio** + **html-to-text**; ou apenas fetch para Jina (sem deps de parse no seu lado). |

Com isso, o fluxo “colar URL de site real → obter conteúdo legível → gerar produto com IA” fica coerente com o uso em site real e com as boas práticas de segurança e ops.
