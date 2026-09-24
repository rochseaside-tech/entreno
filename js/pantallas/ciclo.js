// ciclo.js — el ciclo menstrual: en qué día vas, cuándo toca la próxima, cómo te
// encuentras y qué dice la evidencia (de verdad) sobre entrenar en cada fase.
//
// Las dos pingüinas saludan y cuentan el día en el que estás. Están dibujadas aquí
// mismo en SVG: se tiñen con el color de cada app y no pesan nada.

import { html, useState } from '../vendor/preact-htm.js';
import { E, useEstado, avisar, toast, recargar } from '../estado.js';
import * as L from '../logica.js';
import * as db from '../db.js';
import * as S from '../seed.js';
import { Icono, Hoja, ir, atras } from '../comunes.js';
import { QUIEN } from '../perfiles.js';

// ---------------------------------------------------------------- las pingüinas

function Pinguina({ x, saluda, bufanda }) {
  return html`<g transform=${`translate(${x} 0)`}>
    <ellipse class="pata" cx="-8" cy="78" rx="6.5" ry="3.2" />
    <ellipse class="pata" cx="8" cy="78" rx="6.5" ry="3.2" />
    <ellipse class="ala" cx="-20" cy="52" rx="6" ry="15" transform="rotate(8 -20 52)" />
    ${saluda
      ? html`<g class="ala-saluda" style=${`transform-origin:${x + 18}px 44px`}>
          <ellipse class="ala" cx="21" cy="36" rx="5.6" ry="14" transform="rotate(34 21 36)" /></g>`
      : html`<ellipse class="ala" cx="20" cy="52" rx="6" ry="15" transform="rotate(-8 20 52)" />`}
    <ellipse class="cuerpo" cx="0" cy="52" rx="21" ry="27" />
    <ellipse class="tripa" cx="0" cy="56" rx="14" ry="20.5" />
    <circle class="ojo" cx="-7.5" cy="36" r="5.4" />
    <circle class="ojo" cx="7.5" cy="36" r="5.4" />
    <circle class="pupila" cx=${saluda ? -6.3 : -8.7} cy="37" r="2.7" />
    <circle class="pupila" cx=${saluda ? 8.7 : 6.3} cy="37" r="2.7" />
    <circle class="brillo" cx=${saluda ? -5 : -7.4} cy="35.3" r="1.2" />
    <circle class="brillo" cx=${saluda ? 10 : 7.6} cy="35.3" r="1.2" />
    <circle class="colorete" cx="-13.5" cy="43" r="3.4" />
    <circle class="colorete" cx="13.5" cy="43" r="3.4" />
    <path class="pico" d="M-4.5 43 h9 l-4.5 5.5 Z" />
    <path d="M-15 47 q15 7 30 0 l2 5.5 q-17 7.5 -34 0 Z" fill=${bufanda} />
    <path d="M13 53 l7.5 10.5 -5.5 2 -5.5 -9.5 Z" fill=${bufanda} />
  </g>`;
}

export function Pinguinos({ alto = 88 }) {
  return html`<svg class="pinguinos" viewBox="0 0 150 86" height=${alto} role="img" aria-label="Dos pingüinas saludando">
    <${Pinguina} x=${44} saluda=${false} bufanda="var(--acento)" />
    <${Pinguina} x=${104} saluda=${true} bufanda="var(--anillo2)" />
  </svg>`;
}

// ---------------------------------------------------------------- pantalla

const NIVEL = {
  demostrado: { etq: 'Demostrado', icono: 'check' },
  plausible: { etq: 'Plausible', icono: 'reloj' },
  mito: { etq: 'Mito', icono: 'aviso' },
};

export function Ciclo() {
  useEstado();
  const hoy = L.hoyISO();
  const [hoja, ponerHoja] = useState(null); // 'sintomas' | { tipo: 'editar', c }
  const a = L.analizarCiclos(E.ciclos, hoy);

  if (!a.hay) {
    return html`
      <header class="cabecera"><h1 class="titulo">Ciclo</h1></header>
      <div class="tarjeta pila" style="text-align:center">
        <${Pinguinos} />
        <b>Aún no hay ninguna regla apuntada</b>
        <p class="t2 peq">Apunta la última y a partir de ahí la app lleva la cuenta. Puedes poner el día que fue, no tiene que ser hoy.</p>
        <button class="boton" onClick=${() => ponerHoja({ tipo: 'regla' })}>Apuntar una regla</button>
      </div>
      ${hoja?.tipo === 'regla' && html`<${HojaRegla} alCerrar=${() => ponerHoja(null)} />`}`;
  }

  const fase = L.FASES[a.fase];
  const dias = L.diasDelCiclo(a, hoy);
  const consejos = S.CONSEJOS_CICLO[a.fase] || [];
  const deHoy = E.diasCiclo.get(hoy);

  const saludo = a.enRegla ? `Día ${a.dia} de la regla`
    : a.retraso > 0 ? `${a.retraso} ${a.retraso === 1 ? 'día' : 'días'} de retraso`
    : `Día ${a.dia} de tu ciclo`;
  // Sus días de entreno son fijos: aquí no se sugiere saltarse ninguno, solo cómo ajustarlo.
  const sub = a.enRegla ? 'Día de entreno normal. Si molesta, quita una serie antes que peso.'
    : a.retraso > 0 ? 'Puede ser normal: tus ciclos varían algún día.'
    : `Te toca sobre el ${L.fechaLarga(a.proxima)}, en ${a.diasParaProxima} ${a.diasParaProxima === 1 ? 'día' : 'días'}.`;

  return html`
    <header class="cabecera">
      <div><div class="eyebrow">${fase.nombre}</div><h1 class="titulo">Ciclo</h1></div>
    </header>

    <div class="tarjeta hola-pinguinas">
      <${Pinguinos} />
      <div class="crece">
        <div class="globo">¡Hola, ${QUIEN.nombre}!</div>
        <div class="num" style="font-size:22px;margin-top:6px">${saludo}</div>
        <p class="t3 peq" style="margin-top:4px">${sub}</p>
        <button class="boton chico suave" style="margin-top:10px"
          onClick=${() => ponerHoja({ tipo: 'regla', c: a.ultimo })}>Empezó el ${L.fechaCorta(a.ultimo.inicio)} · cambiar</button>
      </div>
    </div>

    <div class="tarjeta" style="margin-top:12px">
      <div class="tira-ciclo">
        ${dias.map((d) => html`<span class=${`dia-ciclo ${d.fase} ${d.hoy ? 'hoy' : ''}`} key=${d.fecha}
          title=${`Día ${d.dia} · ${L.fechaCorta(d.fecha)}`}>${d.hoy ? d.dia : ''}</span>`)}
      </div>
      <div class="fila-f" style="justify-content:space-between;margin-top:10px">
        <button class="t3 peq" onClick=${() => ponerHoja({ tipo: 'regla', c: a.ultimo })}>${L.fechaCorta(a.ultimo.inicio)}</button>
        <span class="t3 peq">próxima ${L.fechaCorta(a.proxima)}</span>
      </div>
      <div class="rejilla-3" style="margin-top:12px">
        <div class="dato"><small>Tu ciclo</small><div class="num">${a.largoCiclo} <span>días</span></div></div>
        <div class="dato"><small>Tu regla</small><div class="num">${a.largoRegla} <span>días</span></div></div>
        <div class="dato"><small>Ovulación</small><div class="num" style="font-size:19px">${L.fechaCorta(a.ovulacion)}</div></div>
      </div>
      <p class="t3 peq" style="margin-top:10px">Calculado con tus ${a.fiables} ciclos fiables${a.variacion ? `, que varían unos ${a.variacion} días` : ''}. La ovulación y los días fértiles son una estimación a partir del calendario, no una medición.</p>
    </div>

    <div class="dos-botones" style="margin-top:12px">
      ${a.enRegla
        ? html`<button class="boton suave" onClick=${() => ponerHoja({ tipo: 'regla', c: a.ultimo })}>Se me ha ido</button>`
        : html`<button class="boton" onClick=${() => ponerHoja({ tipo: 'regla' })}>Apuntar regla</button>`}
      <button class="boton suave" onClick=${() => ponerHoja('sintomas')}>
        ${deHoy ? 'Cambiar cómo estoy' : 'Cómo estoy hoy'}</button>
    </div>

    <div class="seccion"><h2 class="titulo">En esta fase</h2></div>
    <div class="pila">
      <p class="t3 peq" style="margin:0 2px">Entrenar según la fase del ciclo NO está demostrado: las revisiones no encuentran diferencias fiables de fuerza entre fases. Lo que manda es cómo te encuentras hoy. Cada consejo lleva su etiqueta.</p>
      ${consejos.map((c, i) => html`<div class="tarjeta consejo" key=${i}>
        <span class=${`nivel ${c.n}`}><${Icono} n=${NIVEL[c.n].icono} t=${14} g=${2.6} />${NIVEL[c.n].etq}</span>
        <p style="margin-top:8px">${c.t}</p>
      </div>`)}
    </div>

    <div class="seccion"><h2 class="titulo">Tus ciclos</h2></div>
    <div class="lista">
      ${[...E.ciclos].reverse().slice(0, 12).map((c, i, todos) => {
        const sig = todos[i - 1];
        const largo = sig ? L.diasEntre(c.inicio, sig.inicio) : null;
        return html`<button class="item" key=${c.inicio} onClick=${() => ponerHoja({ tipo: 'editar', c })}>
          <div class="crece">
            <div class="nombre">${L.fechaLarga(c.inicio)}</div>
            <div class="meta">${c.duracion || '?'} días de regla${largo ? ` · ciclo de ${largo} días` : ' · en curso'}${c.dudoso ? ' · registro dudoso' : ''}</div>
          </div>
          <${Icono} n="chevron" t=${18} g=${2.2} clase="chevron" />
        </button>`;
      })}
    </div>

    ${hoja?.tipo === 'regla' && html`<${HojaRegla} c=${hoja.c} alCerrar=${() => ponerHoja(null)} />`}
    ${hoja === 'sintomas' && html`<${HojaSintomas} fecha=${hoy} dia=${deHoy} alCerrar=${() => ponerHoja(null)} />`}
    ${hoja?.tipo === 'editar' && html`<${HojaCiclo} c=${hoja.c} alCerrar=${() => ponerHoja(null)} />`}`;
}

// ---------------------------------------------------------------- apuntar una regla

// Con día a elegir, porque casi nunca te acuerdas el mismo día: por defecto pone hoy,
// pero puedes poner el día que fue de verdad, y cerrarla también en el día que fue.
function HojaRegla({ c = null, alCerrar }) {
  const hoy = L.hoyISO();
  const [inicio, ponerInicio] = useState(c?.inicio || hoy);
  const [terminada, ponerTerminada] = useState(!!c?.fin);
  const [fin, ponerFin] = useState(c?.fin || hoy);

  const guardar = async () => {
    if (!inicio || inicio > hoy) { toast('El primer día no puede ser futuro'); return; }
    const choca = E.ciclos.some((x) => x.inicio === inicio && x.inicio !== c?.inicio);
    if (choca) { toast('Ya tienes una regla apuntada ese día'); return; }
    let duracion = c?.duracion || null;
    if (terminada) {
      if (fin < inicio) { toast('El último día es anterior al primero'); return; }
      if (fin > hoy) { toast('El último día no puede ser futuro'); return; }
      duracion = L.diasEntre(inicio, fin) + 1;
    }
    if (c && c.inicio !== inicio) await db.borrar('ciclos', c.inicio); // la fecha es la clave
    await db.guardar('ciclos', {
      ...(c || {}), inicio, duracion: duracion || 5,
      ...(terminada ? { fin } : {}),
    });
    await recargar(); avisar();
    toast(terminada ? `Regla de ${duracion} ${duracion === 1 ? 'día' : 'días'}` : `Apuntada desde el ${L.fechaLarga(inicio)}`);
    alCerrar();
  };

  const dias = terminada && fin >= inicio ? L.diasEntre(inicio, fin) + 1 : null;
  return html`<${Hoja} titulo=${c ? 'Tu regla' : 'Apuntar regla'} alCerrar=${alCerrar}>
    <div class="pila">
      <p class="t2 peq">Pon el día que te bajó de verdad, aunque lo apuntes días después.</p>
      <label class="campo"><span>Primer día</span>
        <input class="entrada" type="date" max=${hoy} value=${inicio}
          onInput=${(e) => { const v = e.currentTarget.value; ponerInicio(v); }} /></label>
      <button class=${`boton ${terminada ? '' : 'suave'}`} onClick=${() => ponerTerminada(!terminada)}>
        ${terminada ? 'Ya se me ha ido' : 'Todavía la tengo'}</button>
      ${terminada && html`<label class="campo"><span>Último día</span>
        <input class="entrada" type="date" min=${inicio} max=${hoy} value=${fin}
          onInput=${(e) => { const v = e.currentTarget.value; ponerFin(v); }} /></label>`}
      ${dias && html`<p class="t3 peq">Serían ${dias} ${dias === 1 ? 'día' : 'días'} de regla.</p>`}
      <button class="boton" onClick=${guardar}>Guardar</button>
    </div>
  <//>`;
}

// ---------------------------------------------------------------- cómo estoy hoy

function HojaSintomas({ fecha, dia, alCerrar }) {
  const [flujo, ponerFlujo] = useState(dia?.flujo || null);
  const [dolor, ponerDolor] = useState(dia?.dolor ?? 0);
  const [sintomas, ponerSintomas] = useState(dia?.sintomas || []);
  const [nota, ponerNota] = useState(dia?.nota || '');
  const alternar = (s) => ponerSintomas((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const guardar = async () => {
    await db.guardar('diasCiclo', { fecha, flujo, dolor, sintomas, nota: nota.trim() });
    await recargar(); avisar(); toast('Apuntado'); alCerrar();
  };
  const borrar = async () => { await db.borrar('diasCiclo', fecha); await recargar(); avisar(); toast('Borrado'); alCerrar(); };

  return html`<${Hoja} titulo="Cómo estoy hoy" alCerrar=${alCerrar}>
    <div class="pila">
      <div>
        <div class="campo"><span>Sangrado</span></div>
        <div class="chips ej" style="padding:0">
          ${['Manchado', 'Escaso', 'Moderado', 'Abundante'].map((f) => html`<button class=${`chip ${flujo === f ? 'activo' : ''}`} key=${f}
            onClick=${() => ponerFlujo(flujo === f ? null : f)}>${f}</button>`)}
        </div>
      </div>
      <div>
        <div class="campo"><span>Dolor</span></div>
        <div class="segmentado">
          ${['Nada', 'Poco', 'Bastante', 'Mucho'].map((t, i) => html`<button class=${dolor === i ? 'activo' : ''} key=${t} onClick=${() => ponerDolor(i)}>${t}</button>`)}
        </div>
      </div>
      <div>
        <div class="campo"><span>Síntomas</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${S.SINTOMAS.map((s) => html`<button class=${`chip ${sintomas.includes(s) ? 'activo' : ''}`} key=${s} onClick=${() => alternar(s)}>${s}</button>`)}
        </div>
      </div>
      <label class="campo"><span>Nota</span>
        <input class="entrada" value=${nota} onInput=${(e) => { const v = e.currentTarget.value; ponerNota(v); }} /></label>
      <button class="boton" onClick=${guardar}>Guardar</button>
      ${dia && html`<button class="boton peligro" onClick=${borrar}>Borrar lo de hoy</button>`}
    </div>
  <//>`;
}

// ---------------------------------------------------------------- corregir un ciclo

function HojaCiclo({ c, alCerrar }) {
  const [inicio, ponerInicio] = useState(c.inicio);
  const [duracion, ponerDuracion] = useState(String(c.duracion || ''));
  const [dudoso, ponerDudoso] = useState(!!c.dudoso);
  const [borrando, ponerBorrando] = useState(false);

  const guardar = async () => {
    const d = parseInt(duracion, 10);
    if (!inicio) { toast('Falta el día de inicio'); return; }
    if (inicio !== c.inicio) await db.borrar('ciclos', c.inicio); // la fecha es la clave
    await db.guardar('ciclos', { ...c, inicio, duracion: Number.isFinite(d) ? d : c.duracion, dudoso });
    await recargar(); avisar(); toast('Ciclo guardado'); alCerrar();
  };
  const borrar = async () => { await db.borrar('ciclos', c.inicio); await recargar(); avisar(); toast('Ciclo borrado'); alCerrar(); };

  return html`<${Hoja} titulo=${L.fechaLarga(c.inicio)} alCerrar=${alCerrar}>
    <div class="pila">
      ${c.nota && html`<p class="t3 peq">${c.nota}</p>`}
      <label class="campo"><span>Primer día</span>
        <input class="entrada" type="date" max=${L.hoyISO()} value=${inicio} onInput=${(e) => { const v = e.currentTarget.value; ponerInicio(v); }} /></label>
      <label class="campo"><span>Días de regla</span>
        <input class="entrada num" inputmode="numeric" value=${duracion} onInput=${(e) => { const v = e.currentTarget.value; ponerDuracion(v); }} /></label>
      <button class=${`boton ${dudoso ? '' : 'suave'}`} onClick=${() => ponerDudoso(!dudoso)}>
        ${dudoso ? 'Marcado como registro dudoso' : 'Marcar como registro dudoso'}</button>
      <p class="t3 peq">Un ciclo dudoso se ve en la lista pero no cuenta para las medias ni para la predicción.</p>
      <button class="boton" onClick=${guardar}>Guardar cambios</button>
      ${borrando
        ? html`<button class="boton peligro" onClick=${borrar}>Sí, borrar este ciclo</button>`
        : html`<button class="boton peligro" style="background:none" onClick=${() => ponerBorrando(true)}>Borrar este ciclo</button>`}
    </div>
  <//>`;
}
