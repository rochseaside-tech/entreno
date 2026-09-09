// ui.js — utilidades de interfaz: construir nodos, diálogos y gráficos SVG.
// Sin librerías: `h` es un constructor de elementos de 15 líneas.

export function h(etiqueta, props = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && k !== 'list' && k !== 'type') el[k] = v;
    else el.setAttribute(k, v);
  }
  agregar(el, hijos);
  return el;
}

function agregar(el, hijos) {
  for (const c of hijos.flat(4)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const qs = (sel, raiz = document) => raiz.querySelector(sel);
export const qsa = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export function vaciar(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export const n0 = (x) => Math.round(x || 0).toLocaleString('es-ES');
export const n1 = (x) => (Math.round((x || 0) * 10) / 10).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const n2 = (x) => (Math.round((x || 0) * 100) / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 });

// ---------------------------------------------------------------- avisos y diálogos

let _toast = null;
export function toast(texto, ms = 2200) {
  if (_toast) _toast.remove();
  _toast = h('div', { class: 'aviso info', style: 'position:fixed;left:12px;right:12px;bottom:calc(78px + env(safe-area-inset-bottom));z-index:60;margin:0;box-shadow:0 8px 24px rgba(0,0,0,.5)' }, texto);
  document.body.append(_toast);
  setTimeout(() => { _toast?.remove(); _toast = null; }, ms);
}

export function hoja(titulo, contenido, { alCerrar } = {}) {
  const dlg = h('dialog', {},
    h('div', { class: 'cuerpo' },
      h('div', { class: 'fila entre', style: 'margin-bottom:12px' },
        h('h2', { class: 'crece' }, titulo),
        h('button', { class: 'chico fantasma', onClick: () => dlg.close() }, 'Cerrar')),
      contenido));
  dlg.addEventListener('close', () => { dlg.remove(); alCerrar?.(); });
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

export function confirmar(titulo, texto, textoOk = 'Sí, adelante') {
  return new Promise((resolve) => {
    let ok = false;
    const dlg = hoja(titulo, h('div', {},
      h('p', { class: 'apagado' }, texto),
      h('div', { class: 'botones columna', style: 'margin-top:14px' },
        h('button', { class: 'peligro', onClick: () => { ok = true; dlg.close(); } }, textoOk),
        h('button', { class: 'fantasma', onClick: () => dlg.close() }, 'Cancelar'))),
      { alCerrar: () => resolve(ok) });
  });
}

// Pide un número con teclado numérico. Devuelve null si se cancela.
export function pedirNumero(titulo, { valor = '', unidad = '', paso = 'any', ayuda = null } = {}) {
  return new Promise((resolve) => {
    let r = null;
    const input = h('input', { type: 'number', inputmode: 'decimal', step: paso, value: valor });
    const dlg = hoja(titulo, h('form', {
      onSubmit: (e) => { e.preventDefault(); const v = parseFloat(input.value); r = isNaN(v) ? null : v; dlg.close(); },
    },
      ayuda && h('p', { class: 'apagado pequeno' }, ayuda),
      h('div', { class: 'fila' }, input, unidad && h('span', { class: 'apagado' }, unidad)),
      h('button', { class: 'principal ancho', style: 'margin-top:14px', type: 'submit' }, 'Guardar')),
      { alCerrar: () => resolve(r) });
    setTimeout(() => input.focus(), 80);
  });
}

// ---------------------------------------------------------------- controles

// Stepper: − / valor / +. Devuelve el nodo, con .valor para leer y .fijar() para escribir.
export function stepper({ valor = 0, paso = 2.5, min = 0, max = 999, decimales = 2, alCambiar } = {}) {
  const input = h('input', { type: 'number', inputmode: 'decimal', step: paso, value: valor });
  const ajustar = (d) => {
    const v = Math.min(max, Math.max(min, (parseFloat(input.value) || 0) + d));
    input.value = Number(v.toFixed(decimales));
    alCambiar?.(parseFloat(input.value));
  };
  input.addEventListener('change', () => alCambiar?.(parseFloat(input.value) || 0));
  const nodo = h('div', { class: 'paso' },
    h('button', { type: 'button', 'aria-label': 'Restar', onClick: () => ajustar(-paso) }, '−'),
    input,
    h('button', { type: 'button', 'aria-label': 'Sumar', onClick: () => ajustar(paso) }, '+'));
  Object.defineProperty(nodo, 'valor', { get: () => parseFloat(input.value) || 0 });
  nodo.fijar = (v) => { input.value = v; };
  nodo.input = input;
  return nodo;
}

// Grupo de botones excluyentes.
export function segmentos(opciones, { valor = null, alElegir } = {}) {
  const cont = h('div', { class: 'segmentos' });
  const pintar = (v) => [...cont.children].forEach((b) => b.classList.toggle('sel', b.dataset.v === String(v)));
  for (const o of opciones) {
    cont.append(h('button', {
      type: 'button', dataset: { v: String(o.valor) },
      onClick: () => { cont.valor = o.valor; pintar(o.valor); alElegir?.(o.valor); },
    }, o.texto));
  }
  cont.valor = valor;
  pintar(valor);
  cont.fijar = (v) => { cont.valor = v; pintar(v); };
  return cont;
}

export function barraProgreso(actual, objetivo, { clase = '' } = {}) {
  const pct = objetivo > 0 ? Math.min(100, (actual / objetivo) * 100) : 0;
  const excedido = objetivo > 0 && actual > objetivo * 1.02;
  return h('div', { class: 'barra-prog' },
    h('i', { class: excedido ? 'pasado' : clase, style: `width:${pct}%` }));
}

export function macrosVista(totales, objetivo) {
  const celda = (etiqueta, v, o, u = 'g') => h('div', { class: 'macro' },
    h('div', { class: 'n' }, `${n0(v)}${u === 'g' ? '' : ''}`),
    h('div', { class: 'e' }, etiqueta),
    h('div', { class: 'e mono', style: 'margin-top:2px' }, `de ${n0(o)}`));
  return h('div', { class: 'macros' },
    celda('kcal', totales.kcal, objetivo.kcal, ''),
    celda('prot g', totales.prot, objetivo.prot),
    celda('grasa g', totales.grasa, objetivo.grasa),
    celda('hidr g', totales.hc, objetivo.hc));
}

// ---------------------------------------------------------------- gráficos SVG

const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Gráfico de líneas. series = [{valores:[{x,y}], clase}]
export function graficoLinea(series, { alto = 160, ancho = 320, etiquetasX = [], sufijo = '' } = {}) {
  const m = { arr: 12, ab: 22, izq: 38, der: 8 };
  const todos = series.flatMap((s) => s.valores);
  const svg = svgEl('svg', { class: 'grafico', viewBox: `0 0 ${ancho} ${alto}`, preserveAspectRatio: 'none' });
  if (!todos.length) return svg;

  const ys = todos.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  min -= pad; max += pad;
  const xs = todos.map((p) => p.x);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);

  const px = (x) => m.izq + ((x - xmin) / (xmax - xmin || 1)) * (ancho - m.izq - m.der);
  const py = (y) => m.arr + (1 - (y - min) / (max - min)) * (alto - m.arr - m.ab);

  // rejilla horizontal con 3 referencias
  for (let i = 0; i <= 2; i++) {
    const v = min + ((max - min) * i) / 2;
    const y = py(v);
    svg.append(svgEl('line', { class: 'eje', x1: m.izq, y1: y, x2: ancho - m.der, y2: y }));
    const t = svgEl('text', { x: 2, y: y + 3.5 });
    t.textContent = Math.round(v * 10) / 10 + sufijo;
    svg.append(t);
  }

  for (const s of series) {
    if (!s.valores.length) continue;
    const d = s.valores.map((p, i) => `${i ? 'L' : 'M'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ');
    svg.append(svgEl('path', { class: `linea ${s.clase || ''}`, d }));
    if (s.puntos !== false && s.valores.length <= 40) {
      for (const p of s.valores) svg.append(svgEl('circle', { class: 'punto', cx: px(p.x), cy: py(p.y), r: 2.6 }));
    }
  }

  for (const e of etiquetasX) {
    const t = svgEl('text', { x: px(e.x), y: alto - 6, 'text-anchor': 'middle' });
    t.textContent = e.texto;
    svg.append(t);
  }
  return svg;
}

// Barras verticales sencillas (kcal por día de la semana, etc.)
export function graficoBarras(datos, { alto = 130, ancho = 320, objetivo = null, sufijo = '' } = {}) {
  const m = { arr: 10, ab: 20, izq: 4, der: 4 };
  const svg = svgEl('svg', { class: 'grafico', viewBox: `0 0 ${ancho} ${alto}` });
  if (!datos.length) return svg;
  const max = Math.max(objetivo || 0, ...datos.map((d) => d.valor)) * 1.1 || 1;
  const wTotal = (ancho - m.izq - m.der) / datos.length;
  const w = Math.min(34, wTotal * 0.62);

  if (objetivo) {
    const y = m.arr + (1 - objetivo / max) * (alto - m.arr - m.ab);
    svg.append(svgEl('line', { class: 'eje', x1: m.izq, y1: y, x2: ancho - m.der, y2: y, 'stroke-dasharray': '3 3' }));
  }
  datos.forEach((d, i) => {
    const x = m.izq + wTotal * i + (wTotal - w) / 2;
    const hh = (d.valor / max) * (alto - m.arr - m.ab);
    svg.append(svgEl('rect', { class: `barra ${d.valor ? '' : 'tenue'}`, x, y: alto - m.ab - hh, width: w, height: Math.max(1, hh), rx: 3 }));
    const t = svgEl('text', { x: x + w / 2, y: alto - 6, 'text-anchor': 'middle' });
    t.textContent = d.etiqueta;
    svg.append(t);
  });
  return svg;
}

// ---------------------------------------------------------------- varios

export function vibrar(patron = 30) {
  try { navigator.vibrate?.(patron); } catch { /* algunos navegadores no lo tienen */ }
}

let ctxAudio = null;
export function pitido(veces = 2) {
  try {
    ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < veces; i++) {
      const o = ctxAudio.createOscillator();
      const g = ctxAudio.createGain();
      o.connect(g); g.connect(ctxAudio.destination);
      o.frequency.value = 880;
      const t = ctxAudio.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.start(t); o.stop(t + 0.22);
    }
  } catch { /* sin sonido si el navegador lo bloquea */ }
}

export function descargar(nombre, texto, tipo = 'application/json') {
  const blob = new Blob([texto], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// append() del DOM escribe "null" o "false" si le pasas un condicional que no
// se cumple. Esto filtra igual que h(): usa pon(nodo, ...hijos) en vez de .append().
export function pon(el, ...hijos) {
  agregar(el, hijos);
  return el;
}
