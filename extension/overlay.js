// Screenshot editor injected into the page. Same pin mechanics as
// src/components/shared/ImageAnnotate.tsx: click on the screenshot adds a
// numbered pin with coordinates in percent, each pin gets a comment.
// Everything lives in a closed Shadow DOM so the page's CSS and scripts
// can't style or read it.
(() => {
  if (window.__ttCaptureOverlay) return;
  window.__ttCaptureOverlay = true;

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .root {
      position: fixed; inset: 0; z-index: 2147483647; display: flex;
      font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #0d0f1e; background: rgba(13, 15, 30, .72);
    }
    .stage {
      flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center;
      padding: 24px; overflow: auto;
    }
    .shot {
      position: relative; display: inline-block; cursor: crosshair; line-height: 0;
      border-radius: 10px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.45);
      outline: 1px solid rgba(255,255,255,.15);
    }
    .shot img {
      display: block; max-width: 100%; max-height: calc(100vh - 48px);
      user-select: none; -webkit-user-drag: none;
    }
    .pin {
      position: absolute; width: 24px; height: 24px; transform: translate(-50%, -50%);
      border-radius: 50%; background: #ef4444; color: #fff; font: 600 12px/24px system-ui, sans-serif;
      text-align: center; box-shadow: 0 0 0 2px #fff, 0 2px 6px rgba(0,0,0,.35); cursor: pointer;
    }
    .pin.active { background: #4f46e5; }
    .panel {
      width: min(360px, 45vw); background: #fff; display: flex; flex-direction: column;
      box-shadow: -10px 0 40px rgba(0,0,0,.25);
    }
    .head { padding: 16px 18px 10px; border-bottom: 1px solid #e7e7f2; }
    .title { font-size: 15px; font-weight: 600; margin: 0; }
    .sub { margin: 4px 0 0; color: #6b6f85; font-size: 12px; }
    .body { flex: 1; overflow: auto; padding: 14px 18px; }
    .empty { color: #6b6f85; margin: 0 0 14px; }
    ul { list-style: none; margin: 0 0 16px; padding: 0; display: grid; gap: 8px; }
    li {
      display: flex; gap: 8px; align-items: flex-start; padding: 8px;
      border: 1px solid #e7e7f2; border-radius: 10px; background: #f8f8fc;
    }
    li.active { border-color: #4f46e5; }
    .num {
      flex: none; width: 20px; height: 20px; margin-top: 4px; border-radius: 50%;
      background: #ef4444; color: #fff; font: 600 10px/20px system-ui, sans-serif; text-align: center;
    }
    textarea {
      flex: 1; width: 100%; min-height: 52px; resize: vertical; padding: 6px 8px;
      border: 1px solid #d4d4e0; border-radius: 8px; font: inherit; color: inherit; background: #fff;
    }
    textarea:focus { outline: 2px solid #4f46e5; outline-offset: -1px; border-color: transparent; }
    .del {
      flex: none; margin-top: 4px; padding: 0; border: 0; background: none;
      color: #9a9db0; font: inherit; font-size: 12px; cursor: pointer;
    }
    .del:hover { color: #dc2626; }
    .label { display: block; margin: 0 0 6px; font-size: 12px; color: #6b6f85; }
    .url { margin: 12px 0 0; font-size: 12px; color: #6b6f85; word-break: break-all; }
    .foot { padding: 12px 18px 16px; border-top: 1px solid #e7e7f2; display: grid; gap: 8px; }
    .row { display: flex; gap: 8px; }
    button.primary, button.ghost {
      flex: 1; padding: 9px 12px; border-radius: 10px; font: 600 13px system-ui, sans-serif; cursor: pointer;
    }
    button.primary { border: 0; background: #4f46e5; color: #fff; }
    button.primary:hover { background: #4338ca; }
    button.primary:disabled { opacity: .55; cursor: default; }
    button.ghost { border: 1px solid #e7e7f2; background: #fff; color: #0d0f1e; }
    button.ghost:hover { background: #f6f6fb; }
    .status { margin: 0; font-size: 12px; min-height: 16px; }
    .status.err { color: #b91c1c; }
    .status.ok { color: #047857; }
  `;

  const MAX_PINS = 100; // same limits as src/lib/captures.ts
  const MAX_COMMENT = 2000;
  const MAX_NOTE = 5000;
  const MAX_URL = 4000;
  // Server accepts up to 25 MB per image; bigger PNGs are re-encoded as JPEG.
  const MAX_IMAGE_BYTES = 24 * 1024 * 1024;

  let state = null; // { dataUrl, pins: [{x, y, comment}], activeIndex }
  let host = null;
  let ui = null;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "tt-open-editor" && !state) open(msg.dataUrl);
  });

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) node.append(c);
    return node;
  }

  function open(dataUrl) {
    state = { dataUrl, pins: [], activeIndex: -1, closeArmed: false };
    host = document.createElement("tt-capture-overlay");
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.append(el("style", { text: STYLE }));

    const img = el("img", { src: dataUrl, alt: "Скриншот", draggable: "false" });
    const shot = el("div", { class: "shot", onclick: onShotClick }, [img]);
    const list = el("ul");
    const empty = el("p", { class: "empty", text: "Кликните по скриншоту, чтобы поставить метку." });
    const note = el("textarea", {
      placeholder: "Общий комментарий к скриншоту (необязательно)",
      rows: "3",
      maxlength: String(MAX_NOTE),
    });
    const status = el("p", { class: "status" });
    const saveBtn = el("button", { class: "primary", text: "Сохранить", onclick: save });
    const cancelBtn = el("button", { class: "ghost", text: "Отмена", onclick: () => requestClose("Нажмите «Отмена» еще раз, чтобы закрыть без сохранения") });

    // tabindex keeps focus inside the editor when clicking empty areas, so Esc still works
    const root = el("div", { class: "root", tabindex: "-1" }, [
      el("div", { class: "stage" }, [shot]),
      el("aside", { class: "panel" }, [
        el("div", { class: "head" }, [
          el("p", { class: "title", text: "Метки на скриншоте" }),
          el("p", { class: "sub", text: "Клик по картинке ставит метку. Esc закрывает без сохранения." }),
        ]),
        el("div", { class: "body" }, [
          empty,
          list,
          el("label", { class: "label", text: "Общий комментарий" }),
          note,
          el("p", { class: "url", text: location.href }),
        ]),
        el("div", { class: "foot" }, [status, el("div", { class: "row" }, [cancelBtn, saveBtn])]),
      ]),
    ]);
    shadow.append(root);

    // Keep the page's own shortcuts away from what is typed in the editor.
    for (const type of ["keydown", "keyup", "keypress"]) {
      host.addEventListener(type, (e) => e.stopPropagation());
    }
    host.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeunload", onBeforeUnload);

    ui = { shadow, img, shot, list, empty, note, status, saveBtn, cancelBtn };
    document.documentElement.append(host);
    saveBtn.focus();
    renderPins();
  }

  function hasWork() {
    return !!state && (state.pins.length > 0 || ui.note.value.trim().length > 0);
  }

  function onBeforeUnload(e) {
    if (hasWork()) {
      e.preventDefault();
      e.returnValue = "";
    }
  }

  // Closing with pins or a comment needs a second confirmation.
  function requestClose(hint) {
    if (!state) return;
    if (!hasWork() || state.closeArmed) {
      close();
      return;
    }
    state.closeArmed = true;
    setStatus(hint, "err");
    setTimeout(() => state && (state.closeArmed = false), 2500);
  }

  function close() {
    window.removeEventListener("beforeunload", onBeforeUnload);
    if (host) host.remove();
    host = null;
    ui = null;
    state = null;
  }

  function onKeyDown(e) {
    if (e.key !== "Escape" || !state) return;
    e.preventDefault();
    requestClose("Нажмите Esc еще раз, чтобы закрыть без сохранения");
  }

  function onShotClick(e) {
    if (e.target.classList.contains("pin")) {
      focusPin(Number(e.target.dataset.index));
      return;
    }
    const rect = ui.img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    if (state.pins.length >= MAX_PINS) {
      setStatus(`Не больше ${MAX_PINS} меток на одном скриншоте`, "err");
      return;
    }
    state.pins.push({ x, y, comment: "" });
    state.activeIndex = state.pins.length - 1;
    renderPins();
    focusPin(state.activeIndex);
  }

  function focusPin(index) {
    state.activeIndex = index;
    renderPins();
    const ta = ui.list.querySelector(`textarea[data-index="${index}"]`);
    if (ta) ta.focus();
  }

  function renderPins() {
    ui.shot.querySelectorAll(".pin").forEach((n) => n.remove());
    ui.list.replaceChildren();
    ui.empty.hidden = state.pins.length > 0;

    state.pins.forEach((pin, i) => {
      const active = i === state.activeIndex;
      ui.shot.append(
        el("div", {
          class: `pin${active ? " active" : ""}`,
          style: `left:${pin.x}%;top:${pin.y}%`,
          "data-index": String(i),
          text: String(i + 1),
        })
      );
      const ta = el("textarea", {
        "data-index": String(i),
        placeholder: "Что не так в этом месте?",
        rows: "2",
        maxlength: String(MAX_COMMENT),
        oninput: (e) => {
          state.pins[i].comment = e.target.value;
        },
        onfocus: () => {
          if (state.activeIndex !== i) {
            state.activeIndex = i;
            ui.shot.querySelectorAll(".pin").forEach((n) =>
              n.classList.toggle("active", Number(n.dataset.index) === i)
            );
            ui.list.querySelectorAll("li").forEach((n, j) => n.classList.toggle("active", j === i));
          }
        },
      });
      ta.value = pin.comment;
      ui.list.append(
        el("li", { class: active ? "active" : "" }, [
          el("span", { class: "num", text: String(i + 1) }),
          ta,
          el("button", {
            class: "del",
            text: "удалить",
            title: "Удалить метку",
            onclick: () => {
              state.pins.splice(i, 1);
              state.activeIndex = -1;
              renderPins();
            },
          }),
        ])
      );
    });
  }

  function setStatus(text, kind) {
    ui.status.textContent = text || "";
    ui.status.className = `status${kind ? " " + kind : ""}`;
  }

  // Same screenshot with the numbered pins drawn on it, so a downloaded PNG
  // is readable without the admin UI.
  async function renderAnnotated() {
    if (!state.pins.length) return null;
    const image = new Image();
    image.src = state.dataUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const scale = image.naturalWidth / Math.max(1, ui.img.clientWidth);
    const r = 12 * scale;
    state.pins.forEach((pin, i) => {
      const cx = (pin.x / 100) * canvas.width;
      const cy = (pin.y / 100) * canvas.height;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 2 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `600 ${Math.round(12 * scale)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), cx, cy + 0.5 * scale);
    });
    return fitSize(canvas.toDataURL("image/png"));
  }

  function dataUrlBytes(dataUrl) {
    return Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
  }

  // Very large PNGs (5K/6K screens, photo-heavy pages) are re-encoded as JPEG
  // so the upload stays under the server limit instead of failing.
  async function fitSize(dataUrl) {
    if (dataUrlBytes(dataUrl) <= MAX_IMAGE_BYTES) return dataUrl;
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
    for (const quality of [0.9, 0.75, 0.6]) {
      const jpeg = canvas.toDataURL("image/jpeg", quality);
      if (dataUrlBytes(jpeg) <= MAX_IMAGE_BYTES) return jpeg;
    }
    return canvas.toDataURL("image/jpeg", 0.5);
  }

  async function save() {
    if (!state) return;
    ui.saveBtn.disabled = true;
    ui.saveBtn.textContent = "Сохраняю...";
    setStatus("");
    let res;
    try {
      const annotatedDataUrl = await renderAnnotated();
      const imageDataUrl = await fitSize(state.dataUrl);
      res = await chrome.runtime.sendMessage({
        type: "tt-save",
        payload: {
          dataUrl: imageDataUrl,
          annotatedDataUrl,
          pins: state.pins.map((p) => ({ imageIndex: 0, x: p.x, y: p.y, comment: p.comment.trim() })),
          note: ui.note.value.trim(),
          pageUrl: location.href.slice(0, MAX_URL),
          pageTitle: document.title,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        },
      });
    } catch (e) {
      // Only an extension reload/update really requires a page reload; any
      // other failure is retryable with the editor still open.
      const reloaded = !(chrome.runtime && chrome.runtime.id);
      res = {
        ok: false,
        error: reloaded
          ? "Расширение обновилось, связь со страницей потеряна. Обновите страницу и сделайте скриншот заново"
          : "Не удалось отправить. Метки на месте, нажмите «Сохранить» еще раз",
      };
    }
    if (!ui) return;
    if (res && res.ok) {
      setStatus(`Сохранено в папку ${res.login || ""}`.trim(), "ok");
      ui.saveBtn.textContent = "Готово";
      setTimeout(close, 1200);
      return;
    }
    ui.saveBtn.disabled = false;
    ui.saveBtn.textContent = "Сохранить";
    setStatus((res && res.error) || "Не удалось сохранить", "err");
  }
})();
