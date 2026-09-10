// ejercicios.js — la biblioteca (buscar y filtrar por músculo) y la ficha de cada
// ejercicio: fotos, técnica, récords, progreso e historial.

import { html, useState } from '../vendor/preact-htm.js';
import { E, useEstado, avisar, toast, recargar, seriesDe, records } from '../estado.js';
import * as L from '../logica.js';
import * as db from '../db.js';
import { GRUPOS } from '../datos/catalogo-ejercicios.js';
import { Icono, FotoEj, Hoja, GraficaLinea, Vacio, ir, atras, n0, n1, aNum } from '../comunes.js';

const sinTildes = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// En qué sesiones de tu rutina aparece cada ejercicio.
function enRutina(id) {
  return Object.entries(E.rutina).filter(([, s]) => s.ejercicios.some((x) => x.id === id)).map(([k]) => k);
}

// ---------------------------------------------------------------- lista reutilizable

export function ListaEjercicios({ grupo = null, alElegir = null }) {
  const [texto, ponerTexto] = useState('');
  const [filtro, ponerFiltro] = useState(grupo);
  const q = sinTildes(texto.trim());
  const lista = E.ejercicios
    .filter((e) => !filtro || e.grupo === filtro)
    .filter((e) => !q || sinTildes([e.nombre, e.grupo, e.equipo, ...(e.sec || [])].join(' ')).includes(q))
    .sort((a, b) => GRUPOS.indexOf(a.grupo) - GRUPOS.indexOf(b.grupo) || a.nombre.localeCompare(b.nombre, 'es'));

  return html`
    <div class="buscador" style="margin-bottom:10px">
      <${Icono} n="buscar" t=${18} g=${2.2} />
      <input type="search" placeholder="Buscar ejercicio o músculo" value=${texto} onInput=${(e) => ponerTexto(e.currentTarget.value)} />
    </div>
    <div class="chips" style="margin-bottom:12px">
      <button class=${`chip ${!filtro ? 'activo' : ''}`} onClick=${() => ponerFiltro(null)}>Todos</button>
      ${GRUPOS.map((g) => html`<button class=${`chip ${filtro === g ? 'activo' : ''}`} onClick=${() => ponerFiltro(filtro === g ? null : g)}>${g}</button>`)}
    </div>
    ${lista.length === 0
      ? html`<${Vacio} titulo="Nada con ese nombre">Prueba con el músculo, por ejemplo «glúteo» o «espalda».<//>`
      : html`<div class="lista">
        ${lista.map((ej) => {
          const sesiones = enRutina(ej.id);
          return html`<button class="item" key=${ej.id} onClick=${() => (alElegir ? alElegir(ej) : ir('ejercicio/' + ej.id))}>
            <${FotoEj} ej=${ej} clase="mini" quieta />
            <div class="crece">
              <div class="nombre">${ej.nombre}</div>
              <div class="meta">${ej.grupo} · ${ej.equipo}${sesiones.length ? ` · en sesión ${sesiones.join(' y ')}` : ''}</div>
            </div>
            ${ej.aviso && html`<span style="color:var(--aviso-texto)" title="Tiene un aviso para ti"><${Icono} n="aviso" t=${18} g=${2} /></span>`}
            ${!alElegir && html`<${Icono} n="chevron" t=${18} g=${2.2} clase="chevron" />`}
          </button>`;
        })}
      </div>`}`;
}

// ---------------------------------------------------------------- biblioteca

export function Ejercicios() {
  useEstado();
  return html`
    <header class="cabecera">
      <div><div class="eyebrow">${E.ejercicios.length} ejercicios que merecen la pena</div><h1 class="titulo">Ejercicios</h1></div>
    </header>
    <${ListaEjercicios} />`;
}

// ---------------------------------------------------------------- ficha

export function Ejercicio({ id }) {
  useEstado();
  const [ajustando, ponerAjustando] = useState(false);
  const ej = E.ejercicioPorId.get(id);
  if (!ej) return html`<button class="volver" onClick=${() => atras('ejercicios')}><${Icono} n="atras" t=${24} g=${2.4} />Ejercicios</button>
    <${Vacio} titulo="Este ejercicio ya no existe">Vuelve a la biblioteca y elige otro.<//>`;

  const rec = records(ej.id);
  const prog = L.progresionEjercicio(seriesDe(ej.id));
  const grupos = L.agruparPorSesion(seriesDe(ej.id)).reverse().slice(0, 8);
  const sesiones = enRutina(ej.id);

  return html`
    <button class="volver" onClick=${() => atras('ejercicios')}><${Icono} n="atras" t=${24} g=${2.4} />Volver</button>
    <${FotoEj} ej=${ej} clase="foto-grande" etiqueta=${ej.equipo} />
    <h1 class="titulo" style="font-size:26px;line-height:1.1;margin:16px 4px 8px">${ej.nombre}</h1>
    <div class="chips" style="flex-wrap:wrap;margin:0 4px">
      <span class="chip activo">${ej.grupo}</span>
      ${(ej.sec || []).map((m) => html`<span class="chip sec">${m}</span>`)}
    </div>

    <div class="pila" style="margin-top:16px">
      ${ej.aviso && html`<div class="aviso"><${Icono} n="aviso" t=${17} g=${2} />${ej.aviso}</div>`}
      <div class="tarjeta">
        <ol class="pasos-lista">${ej.claves.map((c, i) => html`<li><b class="num">${i + 1}</b><span>${c}</span></li>`)}</ol>
      </div>

      <button class="tarjeta" style="display:block;width:100%;text-align:left" onClick=${() => ponerAjustando(true)}>
        <div class="fila-f" style="justify-content:space-between">
          <div class="dato"><small>Cómo lo haces tú</small>
            <div style="margin-top:4px;font-weight:600">${ej.repMin}–${ej.repMax} ${ej.segundos ? 'segundos' : 'reps'} · RIR ${ej.rir} · descanso ${L.mmss(ej.descanso)}</div>
            <div class="t2 peq" style="margin-top:2px">${sesiones.length ? `En tu sesión ${sesiones.join(' y ')}` : 'No está en tu rutina'}${ej.incremento ? ` · sube de ${n1(ej.incremento)} en ${n1(ej.incremento)} kg` : ''}</div>
          </div>
          <${Icono} n="chevron" t=${18} g=${2.2} clase="chevron" />
        </div>
      </button>

      ${rec ? html`
        <div class="dos-botones">
          <div class="tarjeta dato"><small>Mejor serie</small><div class="num">${n1(rec.mejorPeso.peso)} <span>kg ×</span> ${rec.mejorPeso.reps}</div></div>
          <div class="tarjeta dato"><small>Tu máximo a 1 rep, calculado</small><div class="num">${n0(rec.rm)} <span>kg</span></div></div>
        </div>
        <div class="tarjeta">
          <div class="dato"><small>Peso de trabajo por sesión</small></div>
          <${GraficaLinea} puntos=${prog.puntos.slice(-12).map((p) => ({ etq: L.fechaCorta(p.fecha), y: p.peso }))} sufijo=" kg" />
        </div>
        <div class="tarjeta">
          ${grupos.map((g, i) => html`<div class="fila-f" style=${`justify-content:space-between;padding:10px 2px;${i ? 'border-top:1px solid var(--linea)' : 'padding-top:0'}`}>
            <span class="t2">${L.fechaCorta(g.fecha)}</span>
            <span class="num" style="font-size:15px;text-align:right">${g.series.map((s) => `${n1(s.peso)} × ${s.reps}`).join(' · ')}</span>
          </div>`)}
        </div>`
      : html`<div class="tarjeta"><${Vacio} titulo="Aún sin registros">Cuando lo hagas en un entreno verás aquí tu mejor serie, tu progreso y el historial.<//></div>`}
    </div>

    ${ajustando && html`<${HojaAjustesEjercicio} ej=${ej} alCerrar=${() => ponerAjustando(false)} />`}`;
}

function HojaAjustesEjercicio({ ej, alCerrar }) {
  const [v, ponerV] = useState({
    repMin: ej.repMin, repMax: ej.repMax, rir: ej.rir, descanso: ej.descanso, incremento: ej.incremento, pesoInicial: ej.pesoInicial ?? '',
  });
  const campo = (clave, texto, modo = 'numeric') => html`<label class="campo"><span>${texto}</span>
    <input class="entrada num" inputmode=${modo} value=${String(v[clave] ?? '').replace('.', ',')} onInput=${(e) => ponerV({ ...v, [clave]: e.currentTarget.value })} /></label>`;
  const guardar = async () => {
    const repMin = aNum(v.repMin), repMax = aNum(v.repMax), descanso = aNum(v.descanso);
    if (!repMin || !repMax || repMin > repMax) { toast('El rango de repeticiones no cuadra'); return; }
    const previo = (await db.obtener('ejercicios', ej.id)) || { id: ej.id };
    await db.guardar('ejercicios', { ...previo, repMin, repMax, rir: String(v.rir).trim() || ej.rir,
      descanso: descanso || ej.descanso, incremento: aNum(v.incremento) ?? ej.incremento, pesoInicial: aNum(v.pesoInicial) });
    await recargar(); avisar(); toast('Cambios guardados'); alCerrar();
  };
  return html`<${Hoja} titulo="Cómo lo haces tú" alCerrar=${alCerrar}>
    <div class="pila">
      <div class="rejilla-2">${campo('repMin', 'Reps mínimas')}${campo('repMax', 'Reps máximas')}</div>
      <div class="rejilla-2">${campo('rir', 'RIR objetivo', 'text')}${campo('descanso', 'Descanso (segundos)')}</div>
      <div class="rejilla-2">${campo('incremento', 'Subir de (kg)', 'decimal')}${campo('pesoInicial', 'Peso de partida (kg)', 'decimal')}</div>
      <p class="t2 peq">Cuando hagas todas las series al máximo de repeticiones con RIR 1 o más, la app te propondrá subir el peso en esa cantidad.</p>
      <button class="boton" onClick=${guardar}>Guardar cambios</button>
    </div>
  <//>`;
}
