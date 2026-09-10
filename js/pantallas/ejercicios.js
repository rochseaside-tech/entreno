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
  const [fotos, ponerFotos] = useState(false);
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
    <div class="fila-f" style="margin:10px 4px 0;align-items:flex-start">
      <p class="t2 peq crece">${ej.fotoPropia?.length ? 'Foto tuya.' : ej.fotoNota || 'Si en tu gimnasio la máquina es distinta, pon tu propia foto.'}</p>
      <button class="boton chico suave" onClick=${() => ponerFotos(true)}>${ej.fotoPropia?.length ? 'Cambiar foto' : 'Poner mi foto'}</button>
    </div>
    <h1 class="titulo" style="font-size:26px;line-height:1.1;margin:14px 4px 8px">${ej.nombre}</h1>
    <div class="chips" style="flex-wrap:wrap;margin:0 4px;padding:0">
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
          ${rec.rm > 0
            ? html`<div class="tarjeta dato"><small>Tu máximo a 1 rep, calculado</small><div class="num">${n0(rec.rm)} <span>kg</span></div></div>`
            : html`<div class="tarjeta dato"><small>Sesiones registradas</small><div class="num">${prog.puntos.length}</div></div>`}
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

    ${ajustando && html`<${HojaAjustesEjercicio} ej=${ej} alCerrar=${() => ponerAjustando(false)} />`}
    ${fotos && html`<${HojaFotos} ej=${ej} alCerrar=${() => ponerFotos(false)} />`}`;
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

// ---------------------------------------------------------------- tus fotos

// Recorta al centro en 4:3 y reduce a 560×420, como las fotos de la base.
// Pasa por <img> para que respete el giro de las fotos del iPhone.
async function reducirFoto(archivo) {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const W = 560, H = 420;
    const escala = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
    const lienzo = Object.assign(document.createElement('canvas'), { width: W, height: H });
    lienzo.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    return lienzo.toDataURL('image/jpeg', 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function HojaFotos({ ej, alCerrar }) {
  const [f, ponerF] = useState([ej.fotoPropia?.[0] || null, ej.fotoPropia?.[1] || null]);
  const [trabajando, ponerTrabajando] = useState(false);

  const elegir = (i) => async (e) => {
    const archivo = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!archivo) return;
    ponerTrabajando(true);
    try {
      const dato = await reducirFoto(archivo);
      ponerF((prev) => { const n = [...prev]; n[i] = dato; return n; });
    } catch { toast('No se ha podido abrir esa foto'); }
    ponerTrabajando(false);
  };
  const guardar = async () => {
    if (!f[0] && !f[1]) { toast('Elige al menos una foto'); return; }
    const [f0, f1] = f[0] ? f : [f[1], null];
    await db.guardar('fotos', { id: ej.id, f0, f1 });
    await recargar(); avisar(); toast('Foto guardada'); alCerrar();
  };
  const quitar = async () => {
    await db.borrar('fotos', ej.id);
    await recargar(); avisar(); toast('Vuelve la foto de la base'); alCerrar();
  };

  const hueco = (i, texto) => html`<label class="tarjeta" style="display:block;cursor:pointer;padding:10px">
    <div class="anim quieta" style="width:100%;aspect-ratio:4/3;border-radius:12px;display:grid;place-items:center">
      ${f[i] ? html`<img src=${f[i]} alt="" />` : html`<span class="t2" style="display:flex;flex-direction:column;align-items:center;gap:6px"><${Icono} n="mas" t=${26} g=${2} />Elegir</span>`}
    </div>
    <div class="peq" style="margin-top:8px;font-weight:600;text-align:center">${texto}</div>
    <input type="file" accept="image/*" style="display:none" onChange=${elegir(i)} />
  </label>`;

  return html`<${Hoja} titulo="Tu foto" alCerrar=${alCerrar}>
    <p class="t2" style="margin-bottom:12px">Hazla con el móvil en horizontal. Con dos fotos, al empezar y al terminar el movimiento, se ve animada como las demás.</p>
    <div class="rejilla-2" style="margin-bottom:14px">${hueco(0, 'Al empezar')}${hueco(1, 'Al terminar')}</div>
    <div class="pila">
      <button class="boton" disabled=${trabajando} onClick=${guardar}>${trabajando ? 'Preparando la foto…' : 'Guardar foto'}</button>
      ${ej.fotoPropia?.length ? html`<button class="boton peligro" onClick=${quitar}>Volver a la foto original</button>` : null}
    </div>
  <//>`;
}
