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
    .mcanvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .shot.measuring { cursor: crosshair; }
    .gridopts {
      display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 10px;
      border-radius: 999px; background: rgba(255,255,255,.95); box-shadow: 0 4px 16px rgba(0,0,0,.3);
      font: 500 12px system-ui, sans-serif; color: #6b6f85;
    }
    .gridopts[hidden] { display: none; }
    .gridopts button {
      padding: 3px 10px; border: 1px solid #d4d4e0; border-radius: 999px; background: #fff;
      font: 500 12px system-ui, sans-serif; color: #6b6f85; cursor: pointer;
    }
    .gridopts button:hover { color: #dc2626; }
    .addmark {
      width: 100%; padding: 9px 12px; margin: 0 0 14px; border: 1.5px dashed #c7cbf0; border-radius: 10px;
      background: #f8f8fc; color: #4f46e5; font: 600 13px system-ui, sans-serif; cursor: pointer;
    }
    .addmark:hover { background: #eef0fa; border-color: #4f46e5; }
    .shot.areamode { cursor: cell; }
    .sel.area { border: 2px solid #ef4444; background: rgba(239,68,68,.12); box-shadow: none; }
    .areabox {
      position: absolute; pointer-events: none; border: 2px solid #ef4444; background: rgba(239,68,68,.12);
    }
    .areabox.active { border-color: #4f46e5; background: rgba(79,70,229,.14); }
    .bubble {
      position: absolute; pointer-events: none; max-width: 30%; padding: 4px 8px; border-radius: 8px;
      background: #fff; border: 1.5px solid #ef4444; color: #0d0f1e; font: 12px/1.3 system-ui, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,.25); white-space: pre-wrap; overflow-wrap: anywhere;
    }
    .bubble.active { border-color: #4f46e5; }
    .col { flex: 1; min-width: 0; display: grid; gap: 4px; }
    .sw {
      justify-self: start; display: inline-flex; align-items: center; gap: 8px; padding: 0; border: 0;
      background: none; color: #6b6f85; font: 500 12px system-ui, sans-serif; cursor: pointer;
    }
    .sw .track {
      position: relative; flex: none; width: 36px; height: 20px; border-radius: 999px;
      background: #c9ccd9; transition: background .15s;
    }
    .sw .knob {
      position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: left .15s;
    }
    .sw[aria-checked="true"] .track { background: #3b6fe0; }
    .sw[aria-checked="true"] .knob { left: 18px; background: #e4e4e8; }
    .sw[aria-checked="true"] { color: #0d0f1e; }
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
  const DRAG_PX = 5; // pointer travel that turns a click into an area drag
  const MAX_URL = 4000;
  // Server accepts up to 25 MB per image; keep each under 15 MB so both images
  // fit in one extension message (~64 MB as base64). Bigger PNGs -> JPEG.
  const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

  const COPY_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9"/></svg>';
  const DONE_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const MIN_CROP = 3; // percent; smaller selections are ignored
  const MIN_AREA = 1.5; // percent
  const MEASURE_COLOR = "#d946ef";
  const MEASURE_PILL = "#7c3aed";
  const MAX_ELEMENTS = 6000;

  // state: { dataUrl, originalDataUrl, pins: [{x, y, comment, w?, h?, inline?}], activeIndex, cropping,
  //          measure (tool toggled on), altMeasure (Option/Alt held), measures: [{a, b}],
  //          sel (first element of a pair measure), view: { x0, y0 } (CSS px at the image's top-left),
  //          cssWidth (CSS px the image width stands for), originalCssWidth }
  let state = null;
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
    state = { dataUrl, originalDataUrl: dataUrl, pins: [], activeIndex: -1, closeArmed: false, cropping: false,
      measure: false, altMeasure: false, measures: [], sel: null, hover: null,
      view: { x0: 0, y0: 0 }, cssWidth: window.innerWidth, originalCssWidth: window.innerWidth,
    };
    // Geometry of the page's elements at the moment of capture (CSS px, viewport
    // coordinates): the measure tool needs it, a screenshot alone has no DOM.
    const rects = collectRects();
    host = document.createElement("tt-capture-overlay");
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.append(el("style", { text: STYLE }));

    const img = el("img", { src: dataUrl, alt: "Скриншот", draggable: "false" });
    const mcanvas = el("canvas", { class: "mcanvas" });
    const sel = el("div", { class: "sel" });
    const shot = el("div", { class: "shot", onclick: onShotClick, onpointerdown: onCropDown, onpointermove: onMeasureMove, onpointerleave: onMeasureLeave }, [img, mcanvas, sel]);
    const gridBtn = el("button", { class: "tool", text: "Сетка", title: "Замер отступов: наведите на элемент страницы, клик закрепляет замер, Shift+клик измеряет до другого элемента", onclick: toggleMeasure });
    const clearBtn = el("button", { text: "Очистить замеры", onclick: clearMeasures });
    const gridOpts = el("div", { class: "gridopts", hidden: "" }, [
      el("span", { text: "Клик: отступы до родителя · Shift+клик: до другого элемента · Esc: отмена" }),
      clearBtn,
    ]);
    const cropBtn = el("button", { class: "tool", text: "Обрезать", title: "Выделите область, которую нужно оставить", onclick: toggleCrop });
    const applyBtn = el("button", { class: "round ok", text: "✓", title: "Применить обрезку", "aria-label": "Применить обрезку", hidden: "", onclick: applyCrop });
    const cancelCropBtn = el("button", { class: "round no", text: "✕", title: "Отменить обрезку", "aria-label": "Отменить обрезку", onclick: toggleCrop });
    const acts = el("div", { class: "acts", hidden: "" }, [applyBtn, cancelCropBtn]);
    const resetBtn = el("button", { class: "tool", text: "Вернуть исходный", hidden: "", onclick: resetAll });
    const copyBtn = el("button", { class: "tool icon", "data-tip": "Копировать фото + текст", "aria-label": "Копировать скриншот с комментариями в буфер обмена", onclick: copyToClipboard });
    copyBtn.innerHTML = COPY_ICON; // static markup, no page data
    const tools = el("div", { class: "tools" }, [gridBtn, cropBtn, resetBtn, copyBtn]);
    const addBtn = el("button", { class: "addmark", text: "+ Добавить метку", title: "Добавить метку в центре скриншота (потом ее можно перетащить)", onclick: addMark });
    const list = el("ul");
    const empty = el("p", { class: "empty", text: "Кликните по скриншоту, чтобы поставить метку, или зажмите и протяните рамку для области." });
    const status = el("p", { class: "status" });
    const saveBtn = el("button", { class: "primary", text: "Сохранить", onclick: save });
    const cancelBtn = el("button", { class: "ghost", text: "Отмена", onclick: () => requestClose("Нажмите «Отмена» еще раз, чтобы закрыть без сохранения") });

    // tabindex keeps focus inside the editor when clicking empty areas, so Esc still works
    const root = el("div", { class: "root", tabindex: "-1" }, [
      el("div", { class: "stage" }, [el("div", { class: "wrap" }, [tools, gridOpts, shot, acts])]),
      el("aside", { class: "panel" }, [
        el("div", { class: "head" }, [
          el("p", { class: "title", text: "Метки на скриншоте" }),
          el("p", { class: "sub", text: "Клик ставит метку, зажать и протянуть: область. Option (Alt) удерживать: замер отступов. Esc закрывает без сохранения." }),
        ]),
        el("div", { class: "body" }, [
          empty,
          list,
          addBtn,
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

    ui = { shadow, img, shot, mcanvas, sel, gridBtn, gridOpts, rects, cropBtn, applyBtn, acts, resetBtn, copyBtn, list, empty, status, saveBtn, cancelBtn, crop: null };
    document.documentElement.append(host);
    window.addEventListener("keydown", onModifier, true);
    window.addEventListener("keyup", onModifier, true);
    window.addEventListener("blur", onModifierReset);
    ui.resizeObs = new ResizeObserver(() => paintOverlay());
    ui.resizeObs.observe(img);
    saveBtn.focus();
    renderPins();
  }

  function hasWork() {
    return (
      !!state &&
      (state.pins.length > 0 || state.measures.length > 0 || state.dataUrl !== state.originalDataUrl)
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
    window.removeEventListener("keydown", onModifier, true);
    window.removeEventListener("keyup", onModifier, true);
    window.removeEventListener("blur", onModifierReset);
    if (ui && ui.resizeObs) ui.resizeObs.disconnect();
    if (host) host.remove();
    host = null;
    ui = null;
    state = null;
  }

  function onKeyDown(e) {
    if (e.key !== "Escape" || !state) return;
    e.preventDefault();
    if (state.sel) {
      state.sel = null;
      setStatus("");
      paintOverlay();
      return;
    }
    requestClose("Нажмите Esc еще раз, чтобы закрыть без сохранения");
  }

  // ---- element geometry + measure tool ------------------------------------

  function collectRects() {
    const out = [];
    const index = new Map();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const SKIP = new Set(["SCRIPT", "STYLE", "LINK", "META", "HEAD", "TITLE", "NOSCRIPT", "BR", "TT-CAPTURE-OVERLAY"]);
    const same = (a, b) => Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5 && Math.abs(a[2] - b[2]) < 0.5 && Math.abs(a[3] - b[3]) < 0.5;
    const all = [document.documentElement, ...document.querySelectorAll("body, body *")];
    for (const node of all) {
      if (out.length >= MAX_ELEMENTS) break;
      if (SKIP.has(node.tagName)) continue;
      const b = node.getBoundingClientRect();
      if (b.width < 1 || b.height < 1 || b.right <= 0 || b.bottom <= 0 || b.left >= vw || b.top >= vh) continue;
      if (node.checkVisibility && !node.checkVisibility()) continue;
      const r = [b.left, b.top, b.right, b.bottom];
      // parent = nearest collected ancestor whose box really differs (skip same-size wrappers)
      let parent = -1;
      for (let a = node.parentElement; a; a = a.parentElement) {
        const i = index.get(a);
        if (i === undefined) continue;
        if (!same(out[i].r, r)) {
          parent = i;
          break;
        }
      }
      index.set(node, out.length);
      out.push({ r, parent, area: b.width * b.height });
    }
    return out;
  }

  // pointer -> CSS px of the page
  function pointCss(e) {
    const box = ui.img.getBoundingClientRect();
    const k = state.cssWidth / Math.max(1, box.width);
    return { x: state.view.x0 + (e.clientX - box.left) * k, y: state.view.y0 + (e.clientY - box.top) * k };
  }

  // smallest element box containing the point
  function hitElement(pt) {
    let best = null;
    for (const item of ui.rects) {
      const [l, t, r, b] = item.r;
      if (pt.x < l || pt.x > r || pt.y < t || pt.y > b) continue;
      if (!best || item.area <= best.area) best = item;
    }
    return best;
  }

  // The tool is on when toggled, or while Option/Alt is held.
  function measuring() {
    return state.measure || state.altMeasure;
  }

  function syncMeasureUi() {
    ui.shot.classList.toggle("measuring", measuring());
    if (!measuring()) {
      state.hover = null;
      state.sel = null;
    }
    paintOverlay();
  }

  function onModifier(e) {
    if (!state || e.key !== "Alt") return;
    const down = e.type === "keydown";
    if (state.altMeasure === down) return;
    state.altMeasure = down;
    syncMeasureUi();
  }

  function onModifierReset() {
    if (!state || !state.altMeasure) return;
    state.altMeasure = false;
    syncMeasureUi();
  }

  function toggleMeasure() {
    if (!state.measure && state.cropping) toggleCrop();
    state.measure = !state.measure;
    state.sel = null;
    state.hover = null;
    ui.gridBtn.classList.toggle("on", state.measure);
    ui.gridOpts.hidden = !state.measure;
    ui.shot.classList.toggle("measuring", measuring());
    setStatus(state.measure ? "Наведите на элемент: отступы до родителя. Клик закрепляет замер" : "");
    paintOverlay();
  }

  function clearMeasures() {
    state.measures = [];
    state.sel = null;
    paintOverlay();
  }

  function onMeasureMove(e) {
    if (!measuring()) return;
    const hit = hitElement(pointCss(e));
    state.hover = hit;
    paintOverlay();
  }

  function onMeasureLeave() {
    if (!measuring()) return;
    state.hover = null;
    paintOverlay();
  }

  function measureClick(e) {
    const hit = state.hover || hitElement(pointCss(e));
    if (!hit) return;
    if (state.sel) {
      if (hit.r !== state.sel) state.measures.push({ a: state.sel, b: hit.r });
      state.sel = null;
      setStatus("");
    } else if (e.shiftKey) {
      state.sel = hit.r;
      setStatus("Теперь наведите на второй элемент и кликните");
    } else {
      const parent = hit.parent >= 0 ? ui.rects[hit.parent].r : null;
      state.measures.push({ a: hit.r, b: parent });
    }
    paintOverlay();
  }

  // What is drawn right now: pinned measures + the live preview.
  function currentItems() {
    const items = [...state.measures];
    const hit = state.hover;
    if (measuring()) {
      if (state.sel) items.push({ a: state.sel, b: hit && hit.r !== state.sel ? hit.r : null });
      else if (hit) items.push({ a: hit.r, b: hit.parent >= 0 ? ui.rects[hit.parent].r : null });
    }
    return items;
  }

  function paintOverlay() {
    if (!ui || !ui.mcanvas) return;
    syncReset();
    const c = ui.mcanvas;
    const w = ui.img.clientWidth;
    const h = ui.img.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    paintMeasures(ctx, w, h, 1, currentItems());
  }

  function pill(ctx, x, y, text, ks) {
    ctx.save();
    ctx.font = `600 ${11 * ks}px system-ui, sans-serif`;
    const w = ctx.measureText(text).width + 10 * ks;
    const h = 16 * ks;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fillStyle = MEASURE_PILL;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 0.5 * ks);
    ctx.restore();
  }

  // Draws guides, outlines and distance pills. W x H is the target canvas,
  // ks scales line widths / fonts (1 on screen, image px per screen px on export).
  function paintMeasures(ctx, W, H, ks, items) {
    if (!items.length) return;
    const k = W / Math.max(1, state.cssWidth);
    const X = (cx) => (cx - state.view.x0) * k;
    const Y = (cy) => (cy - state.view.y0) * k;
    ctx.save();
    ctx.lineWidth = ks;
    for (const { a, b } of items) {
      const A = [X(a[0]), Y(a[1]), X(a[2]), Y(a[3])];
      const B = b ? [X(b[0]), Y(b[1]), X(b[2]), Y(b[3])] : null;
      // dotted guides through the edges of the measured element
      ctx.strokeStyle = MEASURE_COLOR;
      ctx.setLineDash([2 * ks, 3 * ks]);
      ctx.beginPath();
      for (const x of [A[0], A[2]]) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (const y of [A[1], A[3]]) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.setLineDash([]);
      if (B) ctx.strokeRect(B[0], B[1], B[2] - B[0], B[3] - B[1]);
      ctx.strokeRect(A[0], A[1], A[2] - A[0], A[3] - A[1]);
      // handles
      ctx.fillStyle = "#fff";
      for (const [hx, hy] of [[A[0], A[1]], [A[2], A[1]], [A[0], A[3]], [A[2], A[3]], [(A[0] + A[2]) / 2, A[1]], [(A[0] + A[2]) / 2, A[3]], [A[0], (A[1] + A[3]) / 2], [A[2], (A[1] + A[3]) / 2]]) {
        ctx.beginPath();
        ctx.arc(hx, hy, 2.5 * ks, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (!B) continue;
      const lines = measureLines(a, b);
      for (const ln of lines) {
        const x1 = X(ln.x1), y1 = Y(ln.y1), x2 = X(ln.x2), y2 = Y(ln.y2);
        ctx.strokeStyle = MEASURE_COLOR;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        pill(ctx, (x1 + x2) / 2, (y1 + y2) / 2, String(Math.round(ln.value)), ks);
      }
    }
    ctx.restore();
  }

  // Distances (CSS px) between box a and box b, as line segments.
  function measureLines(a, b) {
    const within = (i, o) => i[0] >= o[0] - 0.5 && i[1] >= o[1] - 0.5 && i[2] <= o[2] + 0.5 && i[3] <= o[3] + 0.5;
    const out = [];
    const add = (x1, y1, x2, y2, value) => {
      if (value >= 0.5) out.push({ x1, y1, x2, y2, value });
    };
    const inner = (i, o) => {
      const cx = (i[0] + i[2]) / 2;
      const cy = (i[1] + i[3]) / 2;
      add(cx, o[1], cx, i[1], i[1] - o[1]);
      add(cx, i[3], cx, o[3], o[3] - i[3]);
      add(o[0], cy, i[0], cy, i[0] - o[0]);
      add(i[2], cy, o[2], cy, o[2] - i[2]);
    };
    if (within(a, b)) {
      inner(a, b);
    } else if (within(b, a)) {
      inner(b, a);
    } else {
      const oy1 = Math.max(a[1], b[1]);
      const oy2 = Math.min(a[3], b[3]);
      const y = oy2 > oy1 ? (oy1 + oy2) / 2 : (a[1] + a[3]) / 2;
      if (a[2] <= b[0]) add(a[2], y, b[0], y, b[0] - a[2]);
      else if (b[2] <= a[0]) add(b[2], y, a[0], y, a[0] - b[2]);
      const ox1 = Math.max(a[0], b[0]);
      const ox2 = Math.min(a[2], b[2]);
      const x = ox2 > ox1 ? (ox1 + ox2) / 2 : (a[0] + a[2]) / 2;
      if (a[3] <= b[1]) add(x, a[3], x, b[1], b[1] - a[3]);
      else if (b[3] <= a[1]) add(x, b[3], x, a[1], a[1] - b[3]);
    }
    return out;
  }

  // "+": a mark in the middle of the screenshot, focused for typing; it can be
  // dragged into place. Also leaves the measure/crop tools.
  function addMark() {
    if (state.measure) toggleMeasure();
    if (state.cropping) toggleCrop();
    if (state.pins.length >= MAX_PINS) {
      setStatus(`Не больше ${MAX_PINS} меток на одном скриншоте`, "err");
      return;
    }
    // shift a little so several "+" in a row do not stack exactly
    const n = state.pins.length % 8;
    state.pins.push({ x: 50 + n * 3, y: 50 + n * 3, comment: "" });
    state.activeIndex = state.pins.length - 1;
    setStatus("Перетащите метку на нужное место");
    focusPin(state.activeIndex);
  }

  function toggleCrop() {
    if (!state.cropping && state.measure) toggleMeasure();
    state.cropping = !state.cropping;
    ui.crop = null;
    ui.sel.style.display = "none";
    ui.sel.classList.remove("area");
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
    if (e.button !== 0) return;
    if (state.cropping) return startCropDrag(e);
    if (measuring()) return;
    const onPin = e.target.classList && e.target.classList.contains("pin");
    const idx = onPin ? Number(e.target.dataset.index) : -1;
    const movable = onPin && !state.pins[idx].w; // areas stay where they were drawn
    if (onPin && !movable) return;
    e.preventDefault();
    const startPx = { x: e.clientX, y: e.clientY };
    const start = pointPercent(e);
    let dragging = false;
    const move = (ev) => {
      if (!dragging && Math.hypot(ev.clientX - startPx.x, ev.clientY - startPx.y) < DRAG_PX) return;
      dragging = true;
      const p = pointPercent(ev);
      if (movable) {
        state.pins[idx].x = p.x;
        state.pins[idx].y = p.y;
        const node = ui.shot.querySelector(`.pin[data-index="${idx}"]`);
        if (node) {
          node.style.left = p.x + "%";
          node.style.top = p.y + "%";
        }
        return;
      }
      ui.crop = { x1: start.x, y1: start.y, x2: p.x, y2: p.y };
      ui.sel.classList.add("area");
      drawSel();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!dragging) return; // a plain click: onShotClick places or focuses a pin
      ui.dragEndAt = performance.now(); // swallow the click that follows the drag
      if (movable) {
        state.activeIndex = idx;
        renderPins();
        return;
      }
      const c = cropRect();
      ui.sel.style.display = "none";
      ui.sel.classList.remove("area");
      ui.crop = null;
      if (!c || c.w < MIN_AREA || c.h < MIN_AREA) return;
      if (state.pins.length >= MAX_PINS) {
        setStatus(`Не больше ${MAX_PINS} меток на одном скриншоте`, "err");
        return;
      }
      state.pins.push({ x: c.x, y: c.y, w: c.w, h: c.h, comment: "", inline: false });
      state.activeIndex = state.pins.length - 1;
      focusPin(state.activeIndex);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startCropDrag(e) {
    e.preventDefault();
    const start = pointPercent(e);
    ui.crop = { x1: start.x, y1: start.y, x2: start.x, y2: start.y };
    ui.applyBtn.hidden = true;
    ui.sel.classList.remove("area");
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
    const next = [];
    for (const p of state.pins) {
      if (p.w) {
        // area: keep the part that intersects the crop, if any
        const x1 = Math.max(p.x, c.x);
        const y1 = Math.max(p.y, c.y);
        const x2 = Math.min(p.x + p.w, c.x + c.w);
        const y2 = Math.min(p.y + p.h, c.y + c.h);
        if (x2 - x1 < 0.5 || y2 - y1 < 0.5) continue;
        next.push({
          ...p,
          x: ((x1 - c.x) / c.w) * 100,
          y: ((y1 - c.y) / c.h) * 100,
          w: ((x2 - x1) / c.w) * 100,
          h: ((y2 - y1) / c.h) * 100,
        });
      } else if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
        next.push({ ...p, x: ((p.x - c.x) / c.w) * 100, y: ((p.y - c.y) / c.h) * 100 });
      }
    }
    state.pins = next;
    const cssH = state.cssWidth * (image.naturalHeight / image.naturalWidth);
    state.view = { x0: state.view.x0 + (c.x / 100) * state.cssWidth, y0: state.view.y0 + (c.y / 100) * cssH };
    state.cssWidth = state.cssWidth * (c.w / 100);
    state.hover = null;
    const dropped = before - state.pins.length;
    state.activeIndex = -1;

    await setImage(canvas.toDataURL("image/png"));
    toggleCrop();
    paintOverlay();
    renderPins();
    setStatus(dropped ? `Обрезано. Удалено меток вне области: ${dropped}` : "Обрезано", "ok");
  }

  // Shown as soon as there is anything to undo: a mark, a pinned measure or a crop.
  function syncReset() {
    if (!ui || !ui.resetBtn) return;
    ui.resetBtn.hidden = !(state.pins.length || state.measures.length || state.dataUrl !== state.originalDataUrl);
  }

  // Back to the untouched screenshot: removes crop, marks and pinned measures.
  async function resetAll() {
    if ((state.pins.length || state.measures.length) && !confirm("Вернуть исходный скриншот? Метки, замеры и обрезка будут удалены.")) return;
    state.pins = [];
    state.measures = [];
    state.sel = null;
    state.hover = null;
    state.activeIndex = -1;
    state.cssWidth = state.originalCssWidth;
    state.view = { x0: 0, y0: 0 };
    if (state.cropping) toggleCrop();
    if (state.dataUrl !== state.originalDataUrl) await setImage(state.originalDataUrl);
    paintOverlay();
    renderPins();
    setStatus("");
  }

  function onShotClick(e) {
    if (ui.dragEndAt && performance.now() - ui.dragEndAt < 150) return; // click after a drag
    if (measuring()) {
      measureClick(e);
      return;
    }
    if (e.target.classList.contains("pin")) {
      focusPin(Number(e.target.dataset.index));
      return;
    }
    if (state.cropping) return;
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
    syncReset();
    ui.shot.querySelectorAll(".pin, .areabox, .bubble").forEach((n) => n.remove());
    ui.list.replaceChildren();
    ui.empty.hidden = state.pins.length > 0;

    state.pins.forEach((pin, i) => {
      const active = i === state.activeIndex;
      if (pin.w) {
        ui.shot.append(
          el("div", {
            class: `areabox${active ? " active" : ""}`,
            style: `left:${pin.x}%;top:${pin.y}%;width:${pin.w}%;height:${pin.h}%`,
            "data-index": String(i),
          })
        );
      }
      ui.shot.append(
        el("div", {
          class: `pin${active ? " active" : ""}`,
          style: `left:${pin.x}%;top:${pin.y}%`,
          "data-index": String(i),
          text: String(i + 1),
        })
      );
      if (pin.inline) {
        // right of the pin; flipped to the left near the right edge
        const flip = pin.x > 62;
        const bubble = el("div", {
          class: `bubble${active ? " active" : ""}`,
          style: flip
            ? `left:calc(${pin.x}% - 18px);top:${pin.y}%;transform:translate(-100%,-50%)`
            : `left:calc(${pin.x}% + 18px);top:${pin.y}%;transform:translateY(-50%)`,
          "data-index": String(i),
          text: pin.comment.trim(),
        });
        bubble.hidden = !pin.comment.trim();
        ui.shot.append(bubble);
      }
      const ta = el("textarea", {
        "data-index": String(i),
        placeholder: pin.w ? "Что не так в этой области?" : "Что не так в этом месте?",
        rows: "2",
        maxlength: String(MAX_COMMENT),
        oninput: (e) => {
          state.pins[i].comment = e.target.value;
          const b = ui.shot.querySelector(`.bubble[data-index="${i}"]`);
          if (b) {
            b.textContent = e.target.value.trim();
            b.hidden = !e.target.value.trim();
          }
        },
        onfocus: () => {
          if (state.activeIndex !== i) {
            state.activeIndex = i;
            ui.shot.querySelectorAll(".pin, .areabox, .bubble").forEach((n) =>
              n.classList.toggle("active", Number(n.dataset.index) === i)
            );
            ui.list.querySelectorAll("li").forEach((n, j) => n.classList.toggle("active", j === i));
          }
        },
      });
      ta.value = pin.comment;
      const modeBtn = el(
        "button",
        {
          class: "sw",
          role: "switch",
          "aria-checked": String(!!pin.inline),
          title: "Включено: комментарий рисуется рядом с меткой. Выключено: списком под фото",
          onclick: () => {
            pin.inline = !pin.inline;
            focusPin(i);
          },
        },
        [el("span", { class: "track" }, [el("span", { class: "knob" })]), el("span", { text: "Рядом с меткой" })]
      );
      ui.list.append(
        el("li", { class: active ? "active" : "" }, [
          el("span", { class: "num", text: String(i + 1) }),
          el("div", { class: "col" }, [ta, modeBtn]),
          el("button", {
            class: "del",
            text: "удалить",
            title: pin.w ? "Удалить область" : "Удалить метку",
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

  function wrapText(ctx, text, maxW) {
    const out = [];
    for (const para of text.split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const test = line ? line + " " + word : word;
        if (line && ctx.measureText(test).width > maxW) {
          out.push(line);
          line = word;
        } else line = test;
      }
      out.push(line);
    }
    return out;
  }

  // Same screenshot with the pinned measures, areas, numbered pins and the
  // "next to the pin" comments drawn on it, so a downloaded PNG is readable
  // without the admin UI.
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
    paintMeasures(ctx, canvas.width, canvas.height, scale, state.measures);
    const r = 12 * scale;
    // areas first, so pins and comments stay on top
    for (const pin of state.pins) {
      if (!pin.w) continue;
      const rx = (pin.x / 100) * canvas.width;
      const ry = (pin.y / 100) * canvas.height;
      const rw = (pin.w / 100) * canvas.width;
      const rh = (pin.h / 100) * canvas.height;
      ctx.fillStyle = "rgba(239,68,68,.12)";
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(rx, ry, rw, rh);
    }
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
    state.pins.forEach((pin) => {
      const text = pin.comment.trim();
      if (!pin.inline || !text) return;
      const cx = (pin.x / 100) * canvas.width;
      const cy = (pin.y / 100) * canvas.height;
      const fs = 13 * scale;
      const padB = 6 * scale;
      ctx.font = `${fs}px system-ui, sans-serif`;
      const rows = wrapText(ctx, text, Math.min(canvas.width * 0.3, 260 * scale));
      const textW = Math.max(...rows.map((row) => ctx.measureText(row).width));
      const boxW = textW + padB * 2;
      const boxH = rows.length * fs * 1.3 + padB * 2;
      const gap = r + 8 * scale;
      let bx = cx + gap;
      if (bx + boxW > canvas.width - 4 * scale) bx = cx - gap - boxW;
      bx = Math.max(4 * scale, bx);
      const by = Math.min(Math.max(4 * scale, cy - boxH / 2), canvas.height - boxH - 4 * scale);
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 6 * scale);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();
      ctx.fillStyle = "#0d0f1e";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      rows.forEach((row, k) => ctx.fillText(row, bx + padB, by + padB + k * fs * 1.3 + fs * 0.15));
    });
    return canvas;
  }

  async function renderAnnotated() {
    if (!state.pins.length && !state.measures.length) return null;
    const canvas = await drawBase(true);
    return fitSize(canvas.toDataURL("image/png"));
  }

  // Screenshot + pins + a numbered list of the comments under it, so a single
  // paste carries everything.
  async function renderComposite() {
    const base = await drawBase(true);
    const lines = state.pins
      .map((p, i) => ({ n: i + 1, text: p.comment.trim(), inline: !!p.inline }))
      .filter((l) => l.text && !l.inline);

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
    const titleRows = wrap(document.title || "").slice(0, 2).filter(Boolean);
    let urlText = location.href;
    while (urlText.length > 8 && measure.measureText(urlText).width > w - pad * 2) {
      urlText = urlText.slice(0, -2) + "…";
    }
    const blocks = lines.map((l) => ({ n: l.n, rows: wrap(l.text) }));
    const headRows = titleRows.length + 1;
    const rowsTotal =
      headRows + 0.5 +
      blocks.reduce((sum, b) => sum + b.rows.length, 0);
    const footH = pad * 2 + rowsTotal * lineH + blocks.length * fs * 0.4;

    const out = document.createElement("canvas");
    out.width = w;
    out.height = base.height + Math.ceil(footH);
    const ctx = out.getContext("2d");
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, base.height, w, out.height - base.height);
    ctx.textBaseline = "top";
    let y = base.height + pad;
    ctx.textAlign = "left";
    ctx.fillStyle = "#0d0f1e";
    ctx.font = `600 ${fs}px system-ui, sans-serif`;
    titleRows.forEach((row) => {
      ctx.fillText(row, pad, y + (lineH - fs) / 2);
      y += lineH;
    });
    ctx.fillStyle = "#6b6f85";
    ctx.font = `${fs}px system-ui, sans-serif`;
    ctx.fillText(urlText, pad, y + (lineH - fs) / 2);
    y += lineH * 1.5;
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
      btn.dataset.tip = "Копировать фото + текст";
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
      flashCopy("done", "Скопировано: фото + текст");
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
          pins: state.pins.map((p) => ({
            imageIndex: 0,
            x: p.x,
            y: p.y,
            comment: p.comment.trim(),
            ...(p.w ? { w: p.w, h: p.h } : {}),
            ...(p.inline ? { inline: true } : {}),
          })),
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
