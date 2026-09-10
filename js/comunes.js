// comunes.js — piezas que usan todas las pantallas: iconos, barra de pestañas,
// hojas que suben desde abajo, fotos animadas, anillos, gráficas y formatos.

import { html, useEffect } from './vendor/preact-htm.js';
import { E } from './estado.js';

// ---------------------------------------------------------------- navegación

export const ir = (ruta) => { location.hash = '#/' + ruta; };
// Si se entró directo a una pantalla de detalle no hay historial al que volver.
let navegaciones = 0;
addEventListener('hashchange', () => { navegaciones++; });
export const atras = (porDefecto = 'hoy') => {
  if (navegaciones > 0) history.back();
  else ir(porDefecto);
};

// ---------------------------------------------------------------- formatos

const f1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const f2 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const f0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
export const n0 = (x) => f0.format(Math.round(x || 0));
export const n1 = (x) => f1.format(x || 0);
export const n2 = (x) => f2.format(x || 0);
export const aNum = (texto) => {
  const n = parseFloat(String(texto ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// ---------------------------------------------------------------- iconos

const RUTAS_ICONO = {
  hoy: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.7" fill="currentColor" stroke="none"/>',
  entreno: '<rect x="5" y="7" width="3" height="10" rx="1"/><rect x="16" y="7" width="3" height="10" rx="1"/><path d="M8 12h8M3 10v4M21 10v4"/>',
  ejercicios: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  comida: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0Z"/><path d="M9.5 7.5c0-1.6 1-2.8 2.6-2.8M14 7.8c.4-1.9 1.9-3.1 3.6-3.1"/>',
  progreso: '<path d="M4 19.5h16"/><path d="M5 15l4.5-4.5 3.5 3L19 7"/><path d="M15 7h4v4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  puntos: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  atras: '<path d="M15 5l-7 7 7 7"/>',
  abajo: '<path d="M6 9l6 6 6-6"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  ajustes: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
  subir: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  reloj: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
  basura: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  estrella: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z"/>',
  guardar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  compartir: '<path d="M12 15V4M8 8l4-4 4 4M6 12v7h12v-7"/>',
  cambiar: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  trofeo: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>',
  nota: '<path d="M5 4h14v16H5zM9 9h6M9 13h6"/>',
  fuego: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-9-1.5 2-2 3.5-2 5-1-.5-2-2-2-3.5C8 9.5 6 12 6 15a6 6 0 0 0 6 6Z"/>',
  aviso: '<path d="M12 4l9 16H3Z"/><path d="M12 10v4M12 17v.5"/>',
};

export function Icono({ n, t = 24, g = 1.8, clase = '' }) {
  return html`<svg class=${clase} width=${t} height=${t} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width=${g} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
    dangerouslySetInnerHTML=${{ __html: RUTAS_ICONO[n] || '' }}></svg>`;
}

// ---------------------------------------------------------------- barra de pestañas

const PESTANAS = [['hoy', 'Hoy'], ['entreno', 'Entreno'], ['ejercicios', 'Ejercicios'], ['comida', 'Comida'], ['progreso', 'Progreso']];

export function Tabs({ activa }) {
  return html`<nav class="tabs">
    ${PESTANAS.map(([id, texto]) => html`
      <a href=${'#/' + id} class=${activa === id ? 'activo' : ''} aria-current=${activa === id ? 'page' : null}>
        <${Icono} n=${id} t=${26} />${texto}
      </a>`)}
  </nav>`;
}

// ---------------------------------------------------------------- hoja desde abajo

export function Hoja({ titulo, alCerrar, accion = null, children }) {
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e) => { if (e.key === 'Escape') alCerrar(); };
    addEventListener('keydown', tecla);
    return () => { document.body.style.overflow = previo; removeEventListener('keydown', tecla); };
  }, []);
  return html`
    <div class="velo" onClick=${alCerrar}></div>
    <div class="hoja" role="dialog" aria-modal="true" aria-label=${titulo}>
      <div class="asa"></div>
      <div class="cab-hoja">
        <h2 class="titulo">${titulo}</h2>
        ${accion || html`<button class="icono-btn" onClick=${alCerrar} aria-label="Cerrar"><${Icono} n="cerrar" t=${18} g=${2.2} /></button>`}
      </div>
      <div class="cuerpo-hoja">${children}</div>
    </div>`;
}

// ---------------------------------------------------------------- foto animada

export function FotoEj({ ej, clase = 'mini', quieta = false, etiqueta = null }) {
  // Tus fotos ganan a las de la base. Con una sola, la imagen se queda quieta.
  if (ej?.fotoPropia?.length) {
    const [a, b] = ej.fotoPropia;
    return html`<div class=${`anim ${clase} ${quieta || !b ? 'quieta' : ''}`}>
      <img src=${a} alt="" decoding="async" />
      ${b ? html`<img src=${b} alt="" decoding="async" />` : null}
      ${etiqueta && html`<span class="etiqueta-foto">${etiqueta}</span>`}
    </div>`;
  }
  if (!ej?.img) {
    return html`<div class=${`anim ${clase}`} style="display:grid;place-items:center">
      <span class="titulo t2" style="font-size:22px">${(ej?.nombre || '?').slice(0, 1)}</span></div>`;
  }
  const src = (i) => `./img/ej/${ej.img}-${i}.webp`;
  return html`<div class=${`anim ${clase} ${quieta ? 'quieta' : ''}`}>
    <img src=${src(0)} alt="" loading="lazy" decoding="async" />
    <img src=${src(1)} alt="" loading="lazy" decoding="async" />
    ${etiqueta && html`<span class="etiqueta-foto">${etiqueta}</span>`}
  </div>`;
}

// ---------------------------------------------------------------- anillo

export function Anillo({ valor, max, color = 'var(--acento)', children }) {
  const C = 2 * Math.PI * 34;
  const frac = max > 0 ? Math.min(1, Math.max(0, valor / max)) : 0;
  return html`<div class="anillo">
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle class="pista" cx="40" cy="40" r="34" />
      <circle class="valor" cx="40" cy="40" r="34" stroke=${color} stroke-dasharray=${`${(frac * C).toFixed(1)} ${C.toFixed(1)}`} />
    </svg>
    <div>${children}</div>
  </div>`;
}

// ---------------------------------------------------------------- gráficas

// puntos: [{ etq, y }]. Dibuja línea con área y marca el último punto.
export function GraficaLinea({ puntos, alto = 120, sufijo = '', guia = null, decimales = 1 }) {
  if (!puntos || puntos.length < 2) return html`<p class="t2 peq" style="padding:18px 0">Hacen falta al menos dos registros para dibujar la línea.</p>`;
  const W = 330, H = alto, pX = 10, pArriba = 22, pAbajo = 18;
  const ys = puntos.map((p) => p.y).concat(guia != null ? [guia] : []);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 1e-9) { min -= 1; max += 1; }
  const x = (i) => pX + (i * (W - 2 * pX)) / (puntos.length - 1);
  const y = (v) => pArriba + ((max - v) * (H - pArriba - pAbajo)) / (max - min);
  const pts = puntos.map((p, i) => `${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const ult = puntos[puntos.length - 1];
  const fmt = decimales ? n1 : n0;
  return html`<svg class="grafica" viewBox=${`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label=${`De ${fmt(puntos[0].y)} a ${fmt(ult.y)}${sufijo}`}>
    ${guia != null && html`<line class="guia" x1=${pX} x2=${W - pX} y1=${y(guia)} y2=${y(guia)} />`}
    <path class="area" d=${`M${x(0)} ${y(puntos[0].y)} L${pts.split(' ').slice(1).join(' L')} L${x(puntos.length - 1)} ${H - pAbajo} L${x(0)} ${H - pAbajo} Z`} />
    <polyline class="trazo" points=${pts} />
    <circle class="punto" cx=${x(puntos.length - 1)} cy=${y(ult.y)} r="4.5" />
    <text x=${Math.min(x(puntos.length - 1), W - 40)} y=${Math.max(12, y(ult.y) - 9)} text-anchor="middle">${fmt(ult.y)}${sufijo}</text>
    <text x=${pX} y=${H - 3}>${puntos[0].etq}</text>
    <text x=${W - pX} y=${H - 3} text-anchor="end">${ult.etq}</text>
  </svg>`;
}

// datos: [{ etq, v, si }]. Barras con línea de objetivo opcional.
export function GraficaBarras({ datos, alto = 120, objetivo = null }) {
  const W = 330, H = alto, pAbajo = 16, pArriba = 8;
  const max = Math.max(1, ...datos.map((d) => d.v), objetivo || 0) * 1.08;
  const ancho = (W - 8) / datos.length;
  const y = (v) => pArriba + (1 - v / max) * (H - pArriba - pAbajo);
  return html`<svg class="grafica" viewBox=${`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gráfica de barras">
    ${datos.map((d, i) => html`
      <rect class=${'barra' + (d.si ? ' si' : '')} x=${4 + i * ancho + ancho * 0.18} y=${y(d.v)} width=${ancho * 0.64}
        height=${Math.max(0, H - pAbajo - y(d.v))} rx="4" />
      <text x=${4 + i * ancho + ancho / 2} y=${H - 3} text-anchor="middle">${d.etq}</text>`)}
    ${objetivo != null && html`<line class="guia" x1="4" x2=${W - 4} y1=${y(objetivo)} y2=${y(objetivo)} />`}
  </svg>`;
}

// ---------------------------------------------------------------- otros

export function Toast() {
  return E.toast ? html`<div class="toast" role="status">${E.toast}</div>` : null;
}

export function Interruptor({ valor, alCambiar, etiqueta }) {
  return html`<label class="interruptor">
    <input type="checkbox" switch checked=${!!valor} aria-label=${etiqueta} onChange=${(e) => alCambiar(e.currentTarget.checked)} />
    <i></i>
  </label>`;
}

export function Vacio({ titulo, children }) {
  return html`<div class="vacio"><b>${titulo}</b>${children}</div>`;
}
