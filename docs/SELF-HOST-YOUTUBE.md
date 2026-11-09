# Habilitando YouTube no self-host

## O que acontece na instância oficial

O código do cobalt suporta YouTube, mas a instância `cobalt.tools` desabilita o
serviço. O motivo informado é:

> youtube downloading is disabled on the main instance due to restrictions from
> youtube's side and infinite maintenance cost at scale.

Na prática, o YouTube bloqueia IPs de datacenter, muda o innertube/PO tokens com
frequência e exige manutenção constante. Manter isso em escala é caro.

## Como habilitar

O YouTube é habilitado quando **não** está em `DISABLED_SERVICES`. No
`compose.yaml` deste repo não definimos essa variável, então ele já vem ligado.

Confira no código:

- `api/src/core/env.js` monta `enabledServices` a partir de `DISABLED_SERVICES`.
- `api/src/processing/url.js` retorna `youtube.disabled_main_instance` apenas
  quando a API é `*.imput.net` **e** o YouTube está desabilitado.

Ou seja: **self-host sem `DISABLED_SERVICES=youtube` = YouTube habilitado**.

## Confiabilidade (o ponto crítico)

Ligar o código não garante que todo vídeo baixe. O YouTube pode responder com
"sign in to confirm you're not a bot", 403, ou exigir PO token. O que ajuda:

1. **`yt-session-generator`** — já incluído no `compose.yaml`. Fornece
   `poToken` + `visitor_data` automaticamente.
   ```yaml
   YOUTUBE_SESSION_SERVER: http://yt-session-generator:8080/
   ```
2. **IP limpo** — VPS de datacenter conhecido é mais bloqueado. IP residencial
   ou provedores menos visados costumam funcionar melhor.
3. **Cookies** — para conteúdo que exige login/idade, crie um `cookies.json`
   (formato em `docs/examples/cookies.example.json`) e ative:
   ```yaml
   COOKIE_PATH: /cookies.json
   volumes:
     - ./cookies.json:/cookies.json
   ```
   ⚠️ Use uma conta descartável. Cookies dão acesso à conta.
4. **Player ID / innertube client** — se o cliente padrão quebrar:
   ```yaml
   YOUTUBE_SESSION_INNERTUBE_CLIENT: WEB_EMBEDDED
   YOUTUBE_PLAYER_ID: <id>
   ```
5. **HLS legado** — fallback para alguns vídeos:
   ```yaml
   ENABLE_DEPRECATED_YOUTUBE_HLS: always
   ```
6. **Atualize a imagem** — o `watchtower` já faz isso a cada 15 min. Correções
   de YouTube saem com frequência.

## Teste rápido

```bash
curl -X POST "http://localhost:9000/" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "videoQuality": "1080",
    "downloadMode": "auto"
  }'
```

Resposta esperada: um JSON com `status: "tunnel"` ou `"redirect"` e uma URL de
download. Se vier erro, veja os logs:

```bash
docker compose logs -f cobalt
docker compose logs -f yt-session-generator
```

## Limites e responsabilidade

- Baixe apenas conteúdo público/livre ou que você tenha direito de baixar.
- Respeite os Termos de Serviço do YouTube e as leis do seu país.
- Se a instância for pública, proteja contra abuso: veja
  [`protect-an-instance.md`](protect-an-instance.md).
