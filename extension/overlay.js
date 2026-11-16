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
      display: block; max-width: 100%; max-height: calc(100vh - 170px);
      user-select: none; -webkit-user-drag: none;
    }
    .wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; max-width: 100%; }
    .tools {
      display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px;
      border-radius: 999px; background: rgba(255,255,255,.95); box-shadow: 0 4px 16px rgba(0,0,0,.3);
    }
    .tool {
      padding: 6px 14px; border: 0; border-radius: 999px; background: transparent;
      font: 500 13px system-ui, sans-serif; color: #6b6f85; cursor: pointer;
    }
    .tool:hover { color: #0d0f1e; }
    .tool.on { background: #eef0fa; color: #4f46e5; box-shadow: inset 0 0 0 1px #c7cbf0; }
    .tool[hidden] { display: none; }
    .tool.icon {
      position: relative; width: 34px; height: 30px; padding: 0; display: inline-flex;
      align-items: center; justify-content: center;
    }
    .tool.icon svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .tool.icon::after {
      content: attr(data-tip); position: absolute; bottom: calc(100% + 10px); left: 50%;
      transform: translateX(-50%); padding: 6px 12px; border-radius: 10px; white-space: nowrap;
      background: #26283a; color: #fff; font: 500 13px system-ui, sans-serif;
      opacity: 0; pointer-events: none; transition: opacity .12s;
    }
    .tool.icon:hover::after, .tool.icon.done::after { opacity: 1; }
    .tool.icon.done { color: #16a34a; }
    .tool.icon.fail { color: #dc2626; }
    .acts { align-self: flex-end; display: flex; gap: 10px; }
    .acts[hidden], .round[hidden] { display: none; }
    .round {
      width: 44px; height: 44px; padding: 0; border: 0; border-radius: 50%;
      font: 600 22px/44px system-ui, sans-serif; text-align: center; cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,.35);
    }
    .round.ok { background: #16a34a; color: #fff; }
    .round.ok:hover { background: #15803d; }
    .round.no { background: #fff; color: #dc2626; }
    .round.no:hover { background: #fef2f2; }
    .grid {
      position: absolute; inset: 0; pointer-events: none; display: none;
      background-image:
        linear-gradient(to right, rgba(79,70,229,.55) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(79,70,229,.55) 1px, transparent 1px),
        linear-gradient(to right, rgba(255,255,255,.35) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,.35) 1px, transparent 1px);
      background-size: 10% 10%, 10% 10%, 2% 2%, 2% 2%;
    }
    .grid.on { display: block; }
    .shot.cropping { cursor: cell; }
    .sel {
      position: absolute; display: none; border: 2px dashed #fff; pointer-events: none;
      box-shadow: 0 0 0 9999px rgba(13,15,30,.55), 0 0 0 1px #4f46e5;
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
  // Server accepts up to 25 MB per image; keep each under 15 MB so both images
  // fit in one extension message (~64 MB as base64). Bigger PNGs -> JPEG.
  const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

  const COPY_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9"/></svg>';
  const DONE_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const MIN_CROP = 3; // percent; smaller selections are ignored

  let state = null; // { dataUrl, originalDataUrl, pins: [{x, y, comment}], activeIndex, cropping, grid }
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
    state = { dataUrl, originalDataUrl: dataUrl, pins: [], activeIndex: -1, closeArmed: false, cropping: false, grid: false };
    host = document.createElement("tt-capture-overlay");
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.append(el("style", { text: STYLE }));

    const img = el("img", { src: dataUrl, alt: "Скриншот", draggable: "false" });
    const grid = el("div", { class: "grid" });
    const sel = el("div", { class: "sel" });
    const shot = el("div", { class: "shot", onclick: onShotClick, onpointerdown: onCropDown }, [img, grid, sel]);
    const gridBtn = el("button", { class: "tool", text: "Сетка", title: "Показать сетку 10% (крупная) и 2% (мелкая)", onclick: toggleGrid });
    const cropBtn = el("button", { class: "tool", text: "Обрезать", title: "Выделите область, которую нужно оставить", onclick: toggleCrop });
    const applyBtn = el("button", { class: "round ok", text: "✓", title: "Применить обрезку", "aria-label": "Применить обрезку", hidden: "", onclick: applyCrop });
    const cancelCropBtn = el("button", { class: "round no", text: "✕", title: "Отменить обрезку", "aria-label": "Отменить обрезку", onclick: toggleCrop });
    const acts = el("div", { class: "acts", hidden: "" }, [applyBtn, cancelCropBtn]);
    const resetBtn = el("button", { class: "tool", text: "Вернуть исходный", hidden: "", onclick: resetCrop });
    const copyBtn = el("button", { class: "tool icon", "data-tip": "Копировать", "aria-label": "Копировать в буфер обмена", onclick: copyToClipboard });
    copyBtn.innerHTML = COPY_ICON; // static markup, no page data
    const tools = el("div", { class: "tools" }, [gridBtn, cropBtn, resetBtn, copyBtn]);
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
      el("div", { class: "stage" }, [el("div", { class: "wrap" }, [tools, shot, acts])]),
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

    ui = { shadow, img, shot, grid, sel, gridBtn, cropBtn, applyBtn, acts, resetBtn, copyBtn, list, empty, note, status, saveBtn, cancelBtn, crop: null };
    document.documentElement.append(host);
    saveBtn.focus();
    renderPins();
  }

  function hasWork() {
    return (
      !!state &&
      (state.pins.length > 0 || ui.note.value.trim().length > 0 || state.dataUrl !== state.originalDataUrl)
    );
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
    clearTimeout(state.closeTimer);
    state.closeTimer = setTimeout(() => {
      if (!state) return;
      state.closeArmed = false;
      setStatus("");
    }, 2500);
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

  function toggleGrid() {
    state.grid = !state.grid;
    ui.grid.classList.toggle("on", state.grid);
    ui.gridBtn.classList.toggle("on", state.grid);
  }

  function toggleCrop() {
    state.cropping = !state.cropping;
    ui.crop = null;
    ui.sel.style.display = "none";
    ui.shot.classList.toggle("cropping", state.cropping);
    ui.cropBtn.classList.toggle("on", state.cropping);
    ui.applyBtn.hidden = true;
    ui.acts.hidden = !state.cropping;
    setStatus(state.cropping ? "Выделите мышью область, которую нужно оставить, и нажмите ✓" : "");
  }

  function pointPercent(e) {
    const rect = ui.img.getBoundingClientRect();
    const clamp = (v) => Math.min(100, Math.max(0, v));
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    };
  }

  function onCropDown(e) {
    if (!state.cropping || e.button !== 0) return;
    e.preventDefault();
    const start = pointPercent(e);
    ui.crop = { x1: start.x, y1: start.y, x2: start.x, y2: start.y };
    ui.applyBtn.hidden = true;
    const move = (ev) => {
      const p = pointPercent(ev);
      ui.crop.x2 = p.x;
      ui.crop.y2 = p.y;
      drawSel();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const c = cropRect();
      const ok = c && c.w >= MIN_CROP && c.h >= MIN_CROP;
      ui.applyBtn.hidden = !ok;
      if (!ok) {
        ui.crop = null;
        ui.sel.style.display = "none";
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function cropRect() {
    if (!ui.crop) return null;
    const { x1, y1, x2, y2 } = ui.crop;
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
  }

  function drawSel() {
    const c = cropRect();
    if (!c) return;
    Object.assign(ui.sel.style, {
      display: "block",
      left: c.x + "%",
      top: c.y + "%",
      width: c.w + "%",
      height: c.h + "%",
    });
  }

  async function setImage(dataUrl) {
    state.dataUrl = dataUrl;
    ui.img.src = dataUrl;
    try {
      await ui.img.decode();
    } catch {
      // the image is already a valid data URL; decode() failing is not fatal
    }
  }

  async function applyCrop() {
    const c = cropRect();
    if (!c || c.w < MIN_CROP || c.h < MIN_CROP) return;
    const image = new Image();
    image.src = state.dataUrl;
    await image.decode();
    const sx = Math.round((c.x / 100) * image.naturalWidth);
    const sy = Math.round((c.y / 100) * image.naturalHeight);
    const sw = Math.max(1, Math.round((c.w / 100) * image.naturalWidth));
    const sh = Math.max(1, Math.round((c.h / 100) * image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext("2d").drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

    // Pins keep their place on the picture: re-map the ones inside the
    // selection, drop the ones that fall outside.
    const before = state.pins.length;
    state.pins = state.pins
      .filter((p) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h)
      .map((p) => ({ ...p, x: ((p.x - c.x) / c.w) * 100, y: ((p.y - c.y) / c.h) * 100 }));
    const dropped = before - state.pins.length;
    state.activeIndex = -1;

    await setImage(canvas.toDataURL("image/png"));
    toggleCrop();
    ui.resetBtn.hidden = false;
    renderPins();
    setStatus(dropped ? `Обрезано. Удалено меток вне области: ${dropped}` : "Обрезано", "ok");
  }

  async function resetCrop() {
    if (state.dataUrl === state.originalDataUrl) return;
    if (state.pins.length && !confirm("Вернуть исходный скриншот? Метки будут удалены.")) return;
    state.pins = [];
    state.activeIndex = -1;
    await setImage(state.originalDataUrl);
    if (state.cropping) toggleCrop();
    ui.resetBtn.hidden = true;
    renderPins();
    setStatus("");
  }

  function onShotClick(e) {
    if (state.cropping) return;
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
  async function drawBase(withPins) {
    const image = new Image();
    image.src = state.dataUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    if (!withPins) return canvas;
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
    return canvas;
  }

  async function renderAnnotated() {
    if (!state.pins.length) return null;
    const canvas = await drawBase(true);
    return fitSize(canvas.toDataURL("image/png"));
  }

  // Screenshot + pins + a numbered list of the comments under it, so a single
  // paste carries everything.
  async function renderComposite() {
    const base = await drawBase(true);
    const lines = state.pins
      .map((p, i) => ({ n: i + 1, text: p.comment.trim() }))
      .filter((l) => l.text);
    const noteText = ui.note.value.trim();
    if (!lines.length && !noteText) return base;

    const w = base.width;
    const fs = Math.max(16, Math.round(w / 70));
    const pad = fs * 1.2;
    const lineH = fs * 1.4;
    const measure = document.createElement("canvas").getContext("2d");
    measure.font = `${fs}px system-ui, sans-serif`;
    const textW = w - pad * 2 - fs * 2.2;
    const wrap = (text) => {
      const out = [];
      for (const para of text.split("\n")) {
        let line = "";
        for (const word of para.split(/\s+/)) {
          const test = line ? line + " " + word : word;
          if (line && measure.measureText(test).width > textW) {
            out.push(line);
            line = word;
          } else line = test;
        }
        out.push(line);
      }
      return out;
    };
    const blocks = lines.map((l) => ({ n: l.n, rows: wrap(l.text) }));
    const noteRows = noteText ? wrap(noteText) : [];
    const rowsTotal =
      blocks.reduce((sum, b) => sum + b.rows.length, 0) + noteRows.length + (noteRows.length && blocks.length ? 1 : 0);
    const footH = pad * 2 + rowsTotal * lineH + (blocks.length + (noteRows.length ? 1 : 0)) * fs * 0.4;

    const out = document.createElement("canvas");
    out.width = w;
    out.height = base.height + Math.ceil(footH);
    const ctx = out.getContext("2d");
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, base.height, w, out.height - base.height);
    ctx.textBaseline = "top";
    let y = base.height + pad;
    for (const b of blocks) {
      ctx.beginPath();
      ctx.arc(pad + fs * 0.8, y + lineH / 2, fs * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `600 ${Math.round(fs * 0.85)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(b.n), pad + fs * 0.8, y + lineH / 2 + 1);
      ctx.fillStyle = "#0d0f1e";
      ctx.font = `${fs}px system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      b.rows.forEach((row, i) => ctx.fillText(row, pad + fs * 2.2, y + i * lineH + (lineH - fs) / 2));
      y += b.rows.length * lineH + fs * 0.4;
    }
    if (noteRows.length) {
      if (blocks.length) y += lineH;
      ctx.fillStyle = "#6b6f85";
      ctx.font = `italic ${fs}px system-ui, sans-serif`;
      ctx.textAlign = "left";
      noteRows.forEach((row, i) => ctx.fillText(row, pad, y + i * lineH + (lineH - fs) / 2));
    }
    return out;
  }

  function flashCopy(kind, tip) {
    const btn = ui.copyBtn;
    btn.dataset.tip = tip;
    btn.classList.remove("done", "fail");
    btn.classList.add(kind);
    if (kind === "done") btn.innerHTML = DONE_ICON;
    clearTimeout(btn._t);
    btn._t = setTimeout(() => {
      btn.classList.remove("done", "fail");
      btn.dataset.tip = "Копировать";
      btn.innerHTML = COPY_ICON;
    }, 1800);
  }

  async function copyToClipboard() {
    if (!state) return;
    try {
      const canvas = await renderComposite();
      // Image only: if text/plain sits next to the PNG, PowerPoint/Word paste the text instead.
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png")
      );
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      flashCopy("done", "Скопировано");
    } catch {
      flashCopy("fail", "Не удалось скопировать");
    }
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
    } catch {
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
