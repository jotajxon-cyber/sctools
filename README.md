# sctools

Fork **self-hosted** do [cobalt](https://github.com/imputnet/cobalt) com **download de vídeo do YouTube habilitado**.

> O código original do cobalt continua suportando YouTube, mas a instância oficial
> (`cobalt.tools`) desativou o serviço. Este fork roda a **própria API**, então o
> YouTube volta a funcionar.

## Por que este fork existe

A instância oficial retorna:

> youtube downloading is disabled on the main instance due to restrictions from
> youtube's side and infinite maintenance cost at scale.

No código, isso é apenas configuração: o YouTube é desabilitado quando `youtube`
aparece em `DISABLED_SERVICES` (ver `api/src/core/env.js` e
`api/src/processing/url.js`). Rodando a própria instância **sem** essa variável,
o YouTube é habilitado novamente.

## O que muda em relação ao cobalt

- **YouTube habilitado por padrão** no `compose.yaml` (sem `DISABLED_SERVICES=youtube`).
- **`yt-session-generator` incluso** no compose, que fornece `poToken`/`visitor_data`
  e melhora bastante a confiabilidade do YouTube.
- **`compose.yaml` pronto** para subir API + gerador de sessão + auto-update.
- **Frontend configurável** via `WEB_DEFAULT_API` (aponta para a sua API).
- Documentação de deploy focada em YouTube em [`docs/SELF-HOST-YOUTUBE.md`](docs/SELF-HOST-YOUTUBE.md).

## Subir a API (Docker)

Requisitos: Docker + Docker Compose.

```bash
cp .env.example .env
# edite o .env: API_URL deve ser a URL PÚBLICA da sua API
docker compose up -d
```

A API sobe em `http://localhost:9000`. Teste:

```bash
curl -X POST http://localhost:9000/ \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","videoQuality":"1080"}'
```

## Subir o frontend (site)

O frontend é um app estático (SvelteKit + adapter-static). O `WEB_DEFAULT_API`
é **build-time** e precisa apontar para a sua API:

```bash
pnpm install
cd web
WEB_DEFAULT_API="https://api.seudominio.com/" pnpm run build
```

O build fica em `web/build/` — sirva em qualquer host estático (Cloudflare Pages,
Netlify, Nginx, etc.). Também dá pra usar o frontend oficial e trocar a instância
em **Settings → Instances**.

## Deploy

- Precisa de **backend Node + ffmpeg** — **não roda no GitHub Pages**.
- Opções: VPS, Render, Railway, Fly.io, ou qualquer host que rode Docker.
- Use **HTTPS** e, se for público, proteja contra abuso
  (Turnstile/API keys — ver `docs/protect-an-instance.md`).
- **YouTube é o serviço mais frágil**: IP de datacenter costuma ser bloqueado.
  Veja [`docs/SELF-HOST-YOUTUBE.md`](docs/SELF-HOST-YOUTUBE.md).

## Variáveis principais

| variável | descrição |
| --- | --- |
| `API_URL` | URL pública da API (obrigatória) |
| `DISABLED_SERVICES` | **não inclua `youtube`** se quiser YouTube |
| `YOUTUBE_SESSION_SERVER` | URL do `yt-session-generator` |
| `YOUTUBE_SESSION_INNERTUBE_CLIENT` | cliente innertube (ex.: `WEB_EMBEDDED`) |
| `YOUTUBE_ALLOW_BETTER_AUDIO` | `1` para áudio de melhor qualidade |
| `WEB_DEFAULT_API` | API usada pelo frontend (build-time) |

Referência completa: [`docs/api-env-variables.md`](docs/api-env-variables.md).

## Licenças e créditos

Este é um fork do [cobalt](https://github.com/imputnet/cobalt).

- **API** (`api/`): [AGPL-3.0](api/LICENSE)
- **Web** (`web/`): [CC-BY-NC-SA-4.0](web/LICENSE) — **não comercial**
- O restante: [AGPL-3.0](LICENSE)

Mantemos o código sob as mesmas licenças e damos crédito ao projeto original.
Veja [`NOTICE`](NOTICE).

## Aviso de uso

O sctools é apenas uma ferramenta. Baixe somente conteúdo **público e livre** ou
que você tenha direito de baixar. O uso é de sua responsabilidade, assim como o
cumprimento dos Termos de Serviço das plataformas e das leis do seu país.
