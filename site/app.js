/* Nosso Site — interface simples para a API do sctools/cobalt */

const DEFAULT_API = "http://localhost:9000";
const API_KEY = "ns:api";
const HIST_KEY = "ns:history";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let api = (localStorage.getItem(API_KEY) || DEFAULT_API).replace(/\/+$/, "");
let mode = "auto";

/* ---------------- mensagens de erro ---------------- */
const ERRORS = {
  "unreachable": "Não consegui falar com a API. Ela está rodando?",
  "timed_out": "A API demorou demais para responder. Tente de novo.",
  "rate_exceeded": "Muitas requisições. Espere um pouco e tente de novo.",
  "capacity": "A API está lotada agora. Tente em alguns segundos.",
  "generic": "Algo deu errado. Tente de novo em alguns segundos.",
  "invalid_body": "O pedido foi rejeitado pela API. Recarregue a página e tente de novo.",
  "unknown_response": "A API respondeu algo inesperado. Recarregue a página.",
  "link.missing": "Cole um link antes de baixar.",
  "link.invalid": "Link inválido ou serviço não suportado.",
  "link.unsupported": "Esse serviço é suportado, mas o link não foi reconhecido.",
  "service.unsupported": "Esse serviço ainda não é suportado.",
  "service.disabled": "Esse serviço está desativado nesta instância.",
  "service.audio_not_supported": "Esse serviço não permite extrair só o áudio.",
  "fetch.fail": "Não consegui buscar as informações desse link.",
  "fetch.critical": "O serviço retornou um erro inesperado. Tente de novo.",
  "fetch.critical.core": "Um módulo interno falhou. Tente de novo.",
  "fetch.empty": "Não encontrei nenhuma mídia nesse link.",
  "fetch.rate": "A API foi limitada pelo serviço. Tente em alguns segundos.",
  "fetch.short_link": "Não consegui resolver o link curto.",
  "content.too_long": "A mídia é longa demais para esta instância.",
  "content.video.unavailable": "Não consigo acessar esse vídeo. Pode estar restrito.",
  "content.video.live": "Esse vídeo está ao vivo. Espere a live terminar.",
  "content.video.private": "Esse vídeo é privado.",
  "content.video.age": "Esse vídeo tem restrição de idade.",
  "content.video.region": "Esse vídeo tem bloqueio regional.",
  "content.region": "Esse conteúdo tem bloqueio regional.",
  "content.paid": "Esse conteúdo é pago e não pode ser baixado.",
  "content.post.unavailable": "Não encontrei esse post.",
  "content.post.private": "Esse post é de uma conta privada.",
  "content.post.age": "Esse post tem restrição de idade.",
  "youtube.no_matching_format": "O YouTube não retornou nenhum formato compatível.",
  "youtube.decipher": "O YouTube mudou o algoritmo. Tente de novo mais tarde.",
  "youtube.login": "O YouTube pediu verificação anti-bot. Tente de novo em alguns segundos.",
  "youtube.token_expired": "O token do YouTube expirou. Tente de novo.",
  "youtube.no_hls_streams": "Nenhum stream HLS encontrado. Tente sem HLS.",
  "youtube.api_error": "A API do YouTube mudou. Tente de novo mais tarde.",
  "youtube.disabled_main_instance": "O YouTube está desativado nesta instância.",
  "youtube.drm": "Esse vídeo é protegido por DRM.",
  "youtube.no_session_tokens": "Não consegui obter os tokens de sessão do YouTube. Tente de novo.",
};

function friendly(code, context) {
  if (!code) return "Algo deu errado. Tente de novo.";
  const key = String(code).replace(/^error\.api\./, "");

  if (key === "rate_exceeded" && context?.limit)
    return `Muitas requisições. Tente em ${context.limit}s.`;
  if (key === "content.too_long" && context?.limit)
    return `Mídia longa demais (limite: ${context.limit} min).`;

  return ERRORS[key] || `Erro: ${key}`;
}

/* ---------------- utilidades ---------------- */
const show = (el) => el && el.removeAttribute("hidden");
const hide = (el) => el && el.setAttribute("hidden", "");

function setStatus(msg, kind = "") {
  const el = $("#status");
  el.textContent = msg;
  el.className = "status " + kind;
  show(el);
}

function setBusy(busy) {
  const go = $("#go");
  go.disabled = busy;
  go.classList.toggle("busy", busy);
  $(".label", go).textContent = busy ? "Processando…" : "Baixar";
}

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  show(el);
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => hide(el), 220);
  }, 2600);
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} d`;
}

function modeLabel(m) {
  return m === "audio" ? "Só áudio" : m === "mute" ? "Só vídeo" : "Vídeo + áudio";
}

/* ---------------- modos ---------------- */
function setMode(next) {
  mode = next;
  $$(".mode").forEach((b) => {
    const on = b.dataset.mode === next;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", String(on));
  });
  syncFields();
}

function syncFields() {
  $$("[data-when]").forEach((el) => {
    const when = el.dataset.when;
    el.hidden = when === "video" ? mode === "audio" : mode !== "audio";
  });
}

$$(".mode").forEach((btn) => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

/* ---------------- API ---------------- */
function apiLabel() {
  return api.replace(/^https?:\/\//, "");
}

function updateApiLabel() {
  $("#apiBtn").textContent = apiLabel();
}

async function checkApi() {
  const st = $("#apiState");
  try {
    const r = await fetch(api + "/", { cache: "no-store" });
    st.classList.toggle("online", r.ok);
    st.classList.toggle("offline", !r.ok);
  } catch {
    st.classList.add("offline");
    st.classList.remove("online");
  }
}

$("#apiBtn").addEventListener("click", () => {
  const value = prompt("URL da API (ex.: http://localhost:9000):", api);
  if (!value) return;
  api = value.trim().replace(/\/+$/, "");
  localStorage.setItem(API_KEY, api);
  updateApiLabel();
  checkApi();
});

/* ---------------- colar ---------------- */
$("#paste").addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      $("#url").value = text.trim();
      $("#url").focus();
    }
  } catch {
    toast("Não consegui acessar a área de transferência.");
  }
});

/* ---------------- download ---------------- */
function buildPayload(url) {
  const payload = { url, downloadMode: mode, localProcessing: "disabled" };

  if (mode === "audio") {
    payload.audioFormat = $("#format").value;
    payload.audioBitrate = $("#bitrate").value;
  } else {
    payload.videoQuality = $("#quality").value;
    payload.youtubeVideoCodec = $("#codec").value;
    payload.youtubeVideoContainer = $("#container").value;
    if ($("#betterAudio").checked) payload.youtubeBetterAudio = true;
  }

  if ($("#alwaysProxy").checked) payload.alwaysProxy = true;
  return payload;
}

async function run(url) {
  setBusy(true);
  hide($("#result"));
  hide($("#picker"));
  setStatus("Preparando o download…", "loading");

  const started = performance.now();

  try {
    const res = await fetch(api + "/", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(url)),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("A API respondeu algo que não entendi. Ela está atualizada?");
    }

    if (data.status === "error") {
      throw new Error(friendly(data.error?.code, data.error?.context));
    }

    if (data.status === "tunnel" || data.status === "redirect") {
      const secs = ((performance.now() - started) / 1000).toFixed(1);
      setStatus(`Pronto em ${secs}s — download iniciado.`, "ok");
      showResult(data);
      addHistory(url, data.filename, mode);
      triggerDownload(data.url, data.filename);
      return;
    }

    if (data.status === "picker") {
      setStatus("Escolha o item que você quer baixar.", "ok");
      showPicker(data);
      return;
    }

    if (data.status === "local-processing") {
      throw new Error(
        "Esse formato exige processamento local, que está desativado nesta interface."
      );
    }

    throw new Error("Resposta inesperada da API.");
  } catch (err) {
    setStatus(err?.message || "Algo deu errado. Tente de novo.", "error");
  } finally {
    setBusy(false);
  }
}

function triggerDownload(url, filename) {
  try {
    const a = document.createElement("a");
    a.href = url;
    if (filename) a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    /* o botão no card de resultado serve de fallback */
  }
}

function resultMeta() {
  if (mode === "audio") {
    const fmt = $("#format").value;
    const bit = $("#bitrate").value;
    return `${fmt.toUpperCase()} • ${bit} kbps`;
  }
  const q = $("#quality").value;
  const c = $("#container").value;
  return `${q === "max" ? "máxima" : q + "p"} • ${c === "auto" ? "auto" : c.toUpperCase()}`;
}

function showResult(data) {
  const el = $("#result");
  el.innerHTML = "";

  const icon = document.createElement("div");
  icon.className = "result-icon";
  icon.textContent = "↓";

  const info = document.createElement("div");
  info.className = "result-info";

  const name = document.createElement("div");
  name.className = "result-name";
  name.textContent = data.filename || "arquivo";
  name.title = data.filename || "";

  const meta = document.createElement("div");
  meta.className = "result-meta";
  meta.textContent = resultMeta();

  info.append(name, meta);

  const link = document.createElement("a");
  link.className = "primary small";
  link.href = data.url;
  if (data.filename) link.download = data.filename;
  link.rel = "noopener";
  link.textContent = "Baixar";

  el.append(icon, info, link);
  show(el);
}

function showPicker(data) {
  const el = $("#picker");
  el.innerHTML = "";

  for (const item of data.picker || []) {
    const a = document.createElement("a");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener";

    if (item.thumb) {
      const img = document.createElement("img");
      img.src = item.thumb;
      img.loading = "lazy";
      img.alt = "";
      a.append(img);
    }

    const label = document.createElement("span");
    label.textContent =
      item.type === "photo" ? "Foto" : item.type === "gif" ? "GIF" : "Vídeo";
    a.append(label);
    el.append(a);
  }

  show(el);
}

/* ---------------- histórico ---------------- */
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
  } catch {
    return [];
  }
}

function addHistory(url, filename, m) {
  const list = getHistory().filter((i) => !(i.url === url && i.mode === m));
  list.unshift({ url, filename: filename || url, mode: m, at: Date.now() });
  localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 8)));
  renderHistory();
}

function renderHistory() {
  const list = getHistory();
  const wrap = $("#historyWrap");
  const ul = $("#history");
  ul.innerHTML = "";

  if (!list.length) {
    hide(wrap);
    return;
  }

  show(wrap);

  for (const item of list) {
    const li = document.createElement("li");

    const icon = document.createElement("div");
    icon.className = "h-icon";
    icon.textContent = item.mode === "audio" ? "♪" : "▶";

    const info = document.createElement("div");
    info.className = "h-info";

    const name = document.createElement("div");
    name.className = "h-name";
    name.textContent = item.filename;
    name.title = item.filename;

    const meta = document.createElement("div");
    meta.className = "h-meta";
    meta.textContent = `${modeLabel(item.mode)} • ${timeAgo(item.at)}`;

    info.append(name, meta);

    const again = document.createElement("button");
    again.type = "button";
    again.className = "link";
    again.textContent = "baixar de novo";
    again.addEventListener("click", () => {
      $("#url").value = item.url;
      setMode(item.mode);
      run(item.url);
    });

    li.append(icon, info, again);
    ul.append(li);
  }
}

$("#clearHistory").addEventListener("click", () => {
  localStorage.removeItem(HIST_KEY);
  renderHistory();
});

/* ---------------- init ---------------- */
$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  const url = $("#url").value.trim();
  if (!url) {
    $("#url").focus();
    toast("Cole um link primeiro.");
    return;
  }
  run(url);
});

(function init() {
  updateApiLabel();
  syncFields();
  renderHistory();
  checkApi();

  if (location.hash.length > 1) {
    $("#url").value = decodeURIComponent(location.hash.slice(1));
  }
})();
