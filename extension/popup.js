const $ = (id) => document.getElementById(id);

function send(type, extra = {}) {
  return chrome.runtime.sendMessage({ type, ...extra });
}

function show(view) {
  for (const id of ["view-loading", "view-login", "view-main"]) $(id).hidden = id !== view;
}

function setError(text) {
  $("error").textContent = text || "";
  $("error").hidden = !text;
}

async function render() {
  const state = await send("tt-get-state");
  $("server").value = state.serverUrl || "";
  if (state.loggedIn) {
    $("who").textContent = state.login;
    show("view-main");
    $("capture-btn").focus();
  } else {
    if (state.expired) $("login-hint").textContent = "Сессия истекла, войдите заново.";
    show("view-login");
    ($("login").value ? $("password") : $("login")).focus();
  }
}

$("view-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  setError("");
  let origin;
  try {
    origin = new URL($("server").value.trim()).origin;
  } catch {
    setError("Проверьте адрес сервиса, например https://your-server.example");
    return;
  }
  $("login-btn").disabled = true;
  $("login-btn").textContent = "Входим...";
  const res = await send("tt-login", {
    serverUrl: origin,
    login: $("login").value.trim(),
    password: $("password").value,
  });
  $("login-btn").disabled = false;
  $("login-btn").textContent = "Войти";
  if (!res.ok) {
    setError(res.error);
    return;
  }
  $("password").value = "";
  render();
});

async function startCapture(button) {
  setError("");
  button.disabled = true;
  const res = await send("tt-start-capture");
  if (!res.ok) {
    button.disabled = false;
    setError(res.error);
    return;
  }
  window.close();
}

$("capture-btn").addEventListener("click", () => startCapture($("capture-btn")));
$("capture-nologin-btn").addEventListener("click", () => startCapture($("capture-nologin-btn")));

$("logout-btn").addEventListener("click", async () => {
  await send("tt-logout");
  setError("");
  render();
});

render().catch((e) => setError(e.message));
