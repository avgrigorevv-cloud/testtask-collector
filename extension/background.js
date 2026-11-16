// Service worker: auth against the testtask-collector server, screenshot
// capture and upload. The overlay (overlay.js) only talks to this worker, so
// the bearer token never reaches the page's context.

const DEFAULT_SERVER = "https://task.uxteam.space";

async function getState() {
  const { serverUrl = DEFAULT_SERVER, token = null, login = null } =
    await chrome.storage.local.get(["serverUrl", "token", "login"]);
  return { serverUrl, token, login };
}

function normalizeServerUrl(raw) {
  const url = new URL(String(raw || "").trim());
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Адрес сервера должен начинаться с https://");
  }
  return url.origin;
}

async function apiFetch(path, { token, serverUrl, ...init } = {}) {
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res;
  try {
    res = await fetch(serverUrl + path, { ...init, headers });
  } catch {
    throw new Error("Не удалось связаться с сервером. Проверьте интернет и адрес сервиса, затем нажмите еще раз");
  }
  let body = {};
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  return { res, body };
}

async function login({ serverUrl, login, password }) {
  const origin = normalizeServerUrl(serverUrl);
  const { res, body } = await apiFetch("/api/ext/login", {
    serverUrl: origin,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok || !body.token) {
    throw new Error(body.error || `Не удалось войти (код ${res.status})`);
  }
  await chrome.storage.local.set({ serverUrl: origin, token: body.token, login: body.login });
  return { login: body.login, serverUrl: origin };
}

async function logout() {
  const { serverUrl, token } = await getState();
  if (token) {
    await apiFetch("/api/ext/logout", { serverUrl, token, method: "POST" }).catch(() => {});
  }
  await chrome.storage.local.remove(["token", "login"]);
}

// Checks the stored token with the server; clears it if it was revoked.
async function checkSession() {
  const state = await getState();
  if (!state.token) return { ...state, token: undefined, loggedIn: false };
  try {
    const { res } = await apiFetch("/api/ext/me", { serverUrl: state.serverUrl, token: state.token });
    if (res.status === 401) {
      await chrome.storage.local.remove(["token", "login"]);
      return { serverUrl: state.serverUrl, login: null, loggedIn: false, expired: true };
    }
  } catch {
    // Offline: keep the session, the upload will report the error.
  }
  return { serverUrl: state.serverUrl, login: state.login, loggedIn: true };
}

const RESTRICTED_MSG =
  "На этой странице браузер не разрешает расширениям делать скриншоты (служебные страницы, магазин расширений)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Chrome allows only ~2 captureVisibleTab calls per second; retry once on that
// quota error instead of reporting it as a restricted page.
async function captureVisible(windowId) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (attempt === 0 && msg.includes("MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND")) {
        await sleep(1100);
        continue;
      }
      throw e;
    }
  }
}

function explainCaptureError(e) {
  const msg = String((e && e.message) || e);
  if (/cannot be scripted|cannot access|chrome:\/\/|extensions gallery|permission|Missing host permission/i.test(msg)) {
    return new Error(RESTRICTED_MSG);
  }
  return new Error(`Не удалось сделать скриншот, попробуйте еще раз (${msg})`);
}

async function startCaptureForTab(tab) {
  if (!tab || tab.id == null) throw new Error("Не найдена активная вкладка");
  let dataUrl;
  try {
    dataUrl = await captureVisible(tab.windowId);
  } catch (e) {
    throw explainCaptureError(e);
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["overlay.js"] });
  } catch (e) {
    throw explainCaptureError(e);
  }
  await chrome.tabs.sendMessage(tab.id, { type: "tt-open-editor", dataUrl });
}

async function startCapture() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await startCaptureForTab(tab);
}

async function saveCapture(payload) {
  const { serverUrl, token, login } = await getState();
  if (!token) return { ok: false, needLogin: true, error: "Войдите в расширении (кнопка на панели)" };

  const form = new FormData();
  const image = await (await fetch(payload.dataUrl)).blob();
  form.append("image", image, image.type === "image/jpeg" ? "capture.jpg" : "capture.png");
  if (payload.annotatedDataUrl) {
    const annotated = await (await fetch(payload.annotatedDataUrl)).blob();
    form.append("annotated", annotated, annotated.type === "image/jpeg" ? "capture-pins.jpg" : "capture-pins.png");
  }
  form.append("pins", JSON.stringify(payload.pins || []));
  form.append("pageUrl", payload.pageUrl || "");
  form.append("pageTitle", payload.pageTitle || "");
  form.append("note", payload.note || "");
  if (payload.viewportWidth) form.append("viewportWidth", String(payload.viewportWidth));
  if (payload.viewportHeight) form.append("viewportHeight", String(payload.viewportHeight));

  const { res, body } = await apiFetch("/api/ext/captures", { serverUrl, token, method: "POST", body: form });
  if (res.status === 401) {
    await chrome.storage.local.remove(["token", "login"]);
    return { ok: false, needLogin: true, error: "Сессия истекла. Войдите заново через кнопку расширения" };
  }
  if (!res.ok) return { ok: false, error: body.error || `Ошибка сервера (код ${res.status})` };
  return { ok: true, id: body.id, login };
}

const handlers = {
  "tt-get-state": () => checkSession(),
  "tt-login": (msg) => login(msg),
  "tt-logout": () => logout(),
  "tt-start-capture": () => startCapture(),
  "tt-save": (msg) => saveCapture(msg.payload),
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handler = handlers[msg && msg.type];
  if (!handler) return false;
  Promise.resolve()
    .then(() => handler(msg))
    .then((result) => sendResponse({ ok: true, ...(result || {}) }))
    .catch((e) => sendResponse({ ok: false, error: e && e.message ? e.message : String(e) }));
  return true; // async response
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "capture") return;
  const { token } = await getState();
  if (!token) {
    chrome.action.openPopup?.().catch(() => {});
    return;
  }
  startCaptureForTab(tab).catch((e) => console.warn("[tt-capture]", e.message));
});

// Exposed for automated tests only (driven from the service worker console).
globalThis.__tt = { startCaptureForTab, getState, saveCapture };
