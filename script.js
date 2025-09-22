// script.js
// App para “Muestras de Proceso · Musicala”
// Carga info.json y renderiza: introducción, concepto, ruta (fases),
// tabs+paneles por área (enumerados), frecuencia/dinámica, preparación,
// repertorio y retro/seguimiento.

/* ------------------ Helpers ------------------ */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function el(tag, attrs = {}, children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  if (children !== undefined && children !== null) {
    (Array.isArray(children) ? children : [children]).forEach(c => node.append(c));
  }
  return node;
}

/* 
  LI builder:
  — Envolvemos el texto en <span> para que no quede como text-node suelto.
  — Con el CSS (.grid li > *) todo el contenido cae en la col 2 (y la bala en col 1).
*/
function liFrom(item) {
  const li = document.createElement("li");

  if (typeof item === "string") {
    li.append(el("span", {}, item));
    return li;
  }

  if (item?.html) {
    li.innerHTML = item.html;
    return li;
  }

  if (item?.href) {
    if (item.label) li.append(el("strong", {}, `${item.label}: `));
    li.append(el("a", { href: item.href, target: item.target || "_blank", rel: "noopener" }, item.text || item.href));
    return li;
  }

  if (item?.label || item?.text) {
    if (item.label) li.append(el("strong", {}, `${item.label}: `));
    if (item.html) li.insertAdjacentHTML("beforeend", item.html);
    else li.append(el("span", {}, item.text || "")); // soporta {text:"..."}
    return li;
  }

  li.append(el("span", {}, String(item ?? "")));
  return li;
}

function fillList(listEl, items = []) {
  if (!listEl) return;
  listEl.innerHTML = "";
  items.forEach(i => listEl.append(liFrom(i)));
}

/* ------------------ Render desde JSON ------------------ */
function setMeta(meta = {}) {
  if (meta.title) {
    document.title = meta.title;
    const h1 = $("#site-title");
    if (h1) h1.textContent = meta.title;
  }
  if (meta.subtitle) {
    const sub = $("#site-subtitle");
    if (sub) sub.innerHTML = meta.subtitle;
  }
}

function renderIntro(data = {}) {
  fillList($("#intro-list"), data.items || []);
}

function renderConcepto(data = {}) {
  fillList($("#concepto-list"), data.items || []);
}

function renderFases(data = {}) {
  // #fases-list ya es <ol class="grid steps"> en el index.html
  fillList($("#fases-list"), data.items || []);
  const note = $("#fases-note");
  if (note) {
    if (data.note) { note.hidden = false; note.innerHTML = data.note; }
    else note.hidden = false; // deja la nota por defecto del HTML
  }
}

function renderContext(ctx = {}) {
  // Filtra “Formatos posibles” y “Propósito” si vinieran en info.json
  const items = (ctx.items || []).filter(it => {
    const label = (typeof it === "object" && it?.label) ? String(it.label).toLowerCase() : "";
    return !label.includes("formatos posibles") && !label.includes("propósito");
  });
  fillList($("#ctx-list"), items);
  const note = $("#ctx-note");
  if (note) {
    if (ctx.note) { note.hidden = false; note.innerHTML = ctx.note; }
    else note.hidden = true;
  }
}

function renderPrep(prep = {}) {
  fillList($("#prep-list"), prep.items || []);
  const note = $("#prep-note");
  if (note) {
    if (prep.note) { note.hidden = false; note.innerHTML = prep.note; }
    else note.hidden = false; // deja la nota por defecto del HTML
  }
}

function renderRepertorio(rep = {}) {
  const btn = $("#btn-repertorio");
  if (!btn) return;
  if (rep.link) {
    btn.href = rep.link;
    if (rep.text) btn.textContent = rep.text;
    btn.removeAttribute("aria-disabled");
  } else {
    btn.href = "#";
    btn.setAttribute("aria-disabled", "true");
  }
}

/* -------- Áreas: tabs + paneles -------- */
function renderTabs(areas = []) {
  const tablist = $("#tablist");
  if (!tablist) return;
  tablist.innerHTML = "";
  areas.forEach((a, idx) => {
    const id = a.id || a.slug || (a.name || "").toLowerCase().replace(/\s+/g, "-");
    tablist.append(
      el("button", {
        role: "tab",
        id: `tab-${id}`,
        "aria-controls": `panel-${id}`,
        "aria-selected": idx === 0 ? "true" : "false",
        "data-target": id
      }, `${a.emoji ? a.emoji + " " : ""}${a.name || a.title || id}`)
    );
  });
}

function sectionTitle(area) {
  if (area.title) return area.title;
  const name = area.name || area.id || "Área";
  const emoji = area.emoji ? `${area.emoji} ` : "";
  return `${emoji}${name} · Muestras de proceso`;
}

function normalizeArea(area) {
  return {
    id: area.id || area.slug || (area.name || "").toLowerCase().replace(/\s+/g, "-"),
    name: area.name,
    emoji: area.emoji,
    main: area.items || area.main || [],
    // *** Requerimiento: quitar “logística y roles” y “pautas Musibabies/primeros niveles”.
    // Por eso NO renderizamos blocks ni details, aunque vengan en el JSON.
    // blocks: area.blocks || [],
    // details: area.details || null
  };
}

function renderPanels(areas = []) {
  const wrap = $("#panels");
  if (!wrap) return;
  wrap.innerHTML = ""; // quita skeleton

  areas.forEach((raw, idx) => {
    const a = normalizeArea(raw);
    const panel = el("section", {
      id: `panel-${a.id}`,
      role: "tabpanel",
      "aria-labelledby": `tab-${a.id}`,
      "data-panel": a.id
    });

    panel.append(el("h2", {}, sectionTitle(a)));

    // Lista principal del área ENUMERADA
    if (a.main?.length) {
      const ol = el("ol", { class: "grid steps" });
      panel.append(ol);
      fillList(ol, a.main);
    }

    // No renderizamos blocks (logística) ni details (Musibabies / primeros niveles)
    panel.hidden = idx !== 0;
    wrap.append(panel);
  });
}

function activate(targetId, { pushHash = true } = {}) {
  const tabs   = $$("#tablist [role='tab']");
  const panels = $$("#panels [role='tabpanel']");
  if (!tabs.length || !panels.length) return;

  const ids = panels.map(p => p.dataset.panel);
  if (!ids.includes(targetId)) targetId = ids[0];

  tabs.forEach(t => t.setAttribute("aria-selected", t.dataset.target === targetId ? "true" : "false"));
  panels.forEach(p => p.hidden = p.dataset.panel !== targetId);

  try { localStorage.setItem("musicala.area", targetId); } catch {}
  if (pushHash) history.replaceState(null, "", `#${targetId}`);
}

function wireTabs() {
  const tabs = $$("#tablist [role='tab']");
  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => { activate(tab.dataset.target); tab.focus(); });
    tab.addEventListener("keydown", (e) => {
      const n = tabs.length;
      if (e.key === "ArrowRight") { e.preventDefault(); tabs[(idx + 1) % n].click(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); tabs[(idx - 1 + n) % n].click(); }
      if (e.key === "Home")       { e.preventDefault(); tabs[0].click(); }
      if (e.key === "End")        { e.preventDefault(); tabs[n - 1].click(); }
    });
  });

  window.addEventListener("hashchange", () => {
    const hash = (location.hash || "").replace("#", "");
    if (hash) activate(hash, { pushHash: false });
  });
}

/* -------- Retro -------- */
function renderRetro(retro = {}) {
  const list = $("#retro-list");
  if (!list) return;
  list.innerHTML = "";
  const items = retro.items || [];
  items.forEach(it => {
    const li = document.createElement("li");
    if (typeof it === "string") {
      li.append(el("span", {}, it));
    } else if (it?.href) {
      if (it.label) li.append(el("strong", {}, `${it.label}: `));
      li.append(el("a", { href: it.href, target: it.target || "_blank", rel: "noopener" }, it.text || it.href));
    } else if (it?.html) {
      li.innerHTML = it.html;
    } else if (it?.text) {
      if (it.label) li.append(el("strong", {}, `${it.label}: `));
      li.append(el("span", {}, it.text));
    }
    list.append(li);
  });
}

/* ------------------ Data ------------------ */
async function loadInfo() {
  // Nota: si abres como file:// algunos navegadores bloquean fetch por CORS.
  const res = await fetch("info.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo cargar info.json (${res.status})`);
  return res.json();
}

/* ------------------ Init ------------------ */
(async function init() {
  $("#year").textContent = new Date().getFullYear();

  try {
    const data = await loadInfo();

    setMeta(data.meta || {});
    renderIntro(data.intro || {});
    renderConcepto(data.concepto || {});
    renderFases(data.fases || {});
    renderContext(data.context || {});
    renderPrep(data.preparacion || data.prep || {}); // acepta "preparacion" o "prep"
    renderRepertorio(data.repertorio || {});

    // Áreas
    const areas = (data.areas || []).map(a => ({
      id: a.id || a.slug || (a.name || "").toLowerCase().replace(/\s+/g, "-"),
      ...a
    }));
    renderTabs(areas);
    renderPanels(areas);
    wireTabs();

    // Retro
    renderRetro(data.retro || {});

    // Selección inicial
    const ids = areas.map(a => a.id);
    const fromHash = (location.hash || "").replace("#", "");
    const fromLS = (() => { try { return localStorage.getItem("musicala.area") || ""; } catch { return ""; }})();
    const initial = ids.includes(fromHash) ? fromHash : (ids.includes(fromLS) ? fromLS : ids[0]);
    if (initial) activate(initial);

  } catch (err) {
    console.error(err);

    // Fallback amable para que la página no quede vacía si falta info.json
    setMeta({
      title: $("#site-title")?.textContent,
      subtitle: $("#site-subtitle")?.innerHTML
    });

    renderIntro({
      items: [
        { label: "Muestras mensuales", text: "instancia mensual en cada programa/artística." },
        { label: "Participación de familias", text: "audiencia formativa y puente pedagógico." },
        { label: "Formato abierto", text: "se permiten puchitos, bocetos y pruebas." }
      ]
    });

    renderConcepto({
      items: [
        "El/la estudiante se reconoce como artista y habita la escena.",
        "Se practica el encuentro con público y la comunicación artística.",
        "Se hacen visibles criterios y objetivos pedagógicos."
      ]
    });

    renderFases({
      items: [
        "Grabaciones de audio.",
        "Grabaciones en video.",
        "Recitales / micro-muestras internas.",
        "Eventos internos con público.",
        "Conciertos / funciones."
      ],
      note: "La ruta aplica a todas las artes y formatos."
    });

    renderContext({
      items: [
        { label: "Mensuales", text: "en todos los programas artísticos." },
        { label: "Horarios", text: "durante clase o en franjas alternas según objetivos." }
      ],
      note: "Tip: confirmar permisos de imagen cuando sea abierto a familias o público."
    });

    renderPrep({
      items: [
        "Elige la fase del mes (audio, video, recital, evento).",
        "Define repertorios/formato (canciones, ensambles, solistas o equivalente).",
        "Explica criterios; registra acuerdos para el siguiente mes.",
        "Involucra a familias como público.",
        "Curaduría: selecciona evidencias representativas con contexto."
      ],
      note: "No importa si varias/os presentan la misma obra: lo clave es participar y explicar el proceso."
    });

    renderRepertorio({ link: "#", text: "Ver repertorio del Musicala Fest 2025" });

    const areas = [
      {
        id: "musica",
        name: "Música",
        emoji: "🎵",
        items: [
          "Sesiones de grabación de audio",
          "Sesiones de video",
          "Recitales internos",
          "Clases abiertas",
          "Eventos/Conciertos"
        ]
      }
    ];
    renderTabs(areas);
    renderPanels(areas);
    wireTabs();
    activate("musica");

    renderRetro({
      items: [
        { label: "Encuestas", text: "formulario breve para familias y/o estudiantes." },
        { label: "Informes", text: "bitácora docente con criterios y acuerdos." },
        { label: "Evidencias de audio", text: "micro-tomas (1–3 min) con objetivo claro." },
        { label: "Evidencias de video", text: "fragmentos representativos de ensayo." }
      ]
    });
  }
})();
