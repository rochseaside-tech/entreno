// editar-entreno.js — corregir un entreno ya guardado: el día, la hora de inicio, la
// duración, qué sesión fue, el calentamiento, cada serie (peso, repeticiones y RIR),
// quitar o añadir series y ejercicios, y la caminata en cinta. Se trabaja sobre una
// copia y se guarda todo junto al pulsar «Guardar cambios».

import { html, useState } from '../vendor/preact-htm.js';
import { E, useEstado, avisar, toast, recargar, guardarConfig } from '../estado.js';
import * as L from '../logica.js';
import * as db from '../db.js';
import { ORDEN_SESIONES } from '../seed.js';
import { Icono, FotoEj, Hoja, Vacio, Interruptor, atras, n2, aNum } from '../comunes.js';
import { ListaEjercicios } from './ejercicios.js';
import { seriesCompletas } from './entreno.js';
import { ejerciciosDeSesion } from '../informe.js';

const txt = (x) => (x == null ? '' : String(x).replace('.', ','));
const dos = (n) => String(n).padStart(2, '0');
const horaDe = (iso) => { const d = new Date(iso); return `${dos(d.getHours())}:${dos(d.getMinutes())}`; };
const minEntre = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 60000));
const copia = (x) => JSON.parse(JSON.stringify(x));
let ultimaClave = 0;
const clave = () => `c${++ultimaClave}`;

const filaDe = (r) => ({ clave: clave(), orig: r, calent: !!r.calent, lado: r.lado ?? null, peso: txt(r.peso), reps: txt(r.reps), rir: txt(r.rir) });
const filaNueva = (calent, lado, modelo) => ({
  clave: clave(), orig: null, calent, lado, peso: modelo?.peso ?? '', reps: modelo?.reps ?? '', rir: calent ? '' : (modelo?.rir ?? ''),
});

function borradorDe(s) {
  return {
    fecha: s.fecha,
    hora: s.horaDesconocida ? '' : horaDe(s.inicio),
    min: s.fin && !s.horaDesconocida ? String(minEntre(s.inicio, s.fin)) : '',
    plan: s.plan,
    aprox: !!s.aprox,
    calMin: s.calentamiento?.fin ? String(minEntre(s.calentamiento.inicio, s.calentamiento.fin)) : '',
    cinta: { min: txt(s.cinta?.min), kmh: txt(s.cinta?.kmh), incl: txt(s.cinta?.incl), km: txt(s.cinta?.km) },
    grupos: ejerciciosDeSesion(s).map((g) => ({ clave: clave(), id: g.id, planSeries: g.plan?.series ?? 0, filas: g.series.map(filaDe) })),
  };
}

// Número de cada fila tal como se verá al guardar: A1, A2… las de aproximación; 1, 2… las de trabajo.
function etiquetas(filas) {
  const cuenta = new Map();
  return filas.map((f) => {
    const k = `${f.calent ? 'a' : 't'}${f.lado || ''}`;
    const n = (cuenta.get(k) || 0) + 1;
    cuenta.set(k, n);
    return { num: f.calent ? `A${n}` : String(n), lado: f.lado === 'izq' ? 'Izq' : f.lado === 'der' ? 'Der' : '' };
  });
}

// Comprueba el borrador y lo guarda. Si algo no cuadra, lanza el texto que ve la usuaria.
async function guardarBorrador(s, b) {
  if (!b.fecha) throw 'Falta el día';
  if (b.fecha > L.hoyISO()) throw 'El día no puede ser futuro';

  // Hora de inicio: la escrita; si no hay, la que tenía, en el día elegido.
  const inicio = L.desdeISO(b.fecha);
  const [h, m] = (b.hora || horaDe(s.inicio)).split(':').map(Number);
  inicio.setHours(h || 0, m || 0, 0, 0);
  if (inicio > new Date()) throw 'La hora de inicio no puede ser más tarde que ahora';

  let fin = null;
  if (s.fin) {
    const dur = b.min === '' ? minEntre(s.inicio, s.fin) : aNum(b.min);
    if (!dur || dur <= 0 || dur > 600) throw 'La duración va en minutos, entre 1 y 600';
    fin = new Date(inicio.getTime() + dur * 60000);
  }

  // Series: se renumeran en el orden de la pantalla, por tipo y por lado.
  const nuevas = [];
  b.grupos.forEach((g, gi) => {
    const ej = E.ejercicioPorId.get(g.id);
    const cuenta = new Map();
    for (const f of g.filas) {
      if (f.peso === '' && f.reps === '') continue; // fila vacía: no se guarda
      const reps = aNum(f.reps);
      if (!reps || reps <= 0) throw `Faltan las repeticiones de una serie de ${ej?.nombre || 'un ejercicio'}`;
      const k = `${f.calent ? 'a' : 't'}${f.lado || ''}`;
      const indice = cuenta.get(k) || 0;
      cuenta.set(k, indice + 1);
      const base = f.orig ? { ...f.orig } : { id: db.nuevoId('r'), ts: inicio.getTime() + (nuevas.length + 1) * 60000 };
      delete base.calent; delete base.lado; delete base.aprox;
      nuevas.push({
        ...base, sesionId: s.id, ejercicioId: g.id, item: gi, fecha: b.fecha, indice,
        peso: aNum(f.peso) ?? (ej?.tipo === 'corporal' ? 0 : null), reps,
        rir: f.calent ? null : (aNum(f.rir) ?? null),
        ...(f.calent ? { calent: true } : {}), ...(f.lado ? { lado: f.lado } : {}), ...(b.aprox ? { aprox: true } : {}),
      });
    }
  });

  let cal = null;
  if (b.calMin !== '') {
    const c = aNum(b.calMin);
    if (!c || c <= 0 || c > 120) throw 'El calentamiento va en minutos, entre 1 y 120';
    cal = { inicio: inicio.toISOString(), fin: new Date(inicio.getTime() + c * 60000).toISOString() };
  } else if (s.calentamiento && !s.calentamiento.fin) cal = s.calentamiento;

  let cinta = null;
  const cm = aNum(b.cinta.min), kmh = aNum(b.cinta.kmh), incl = aNum(b.cinta.incl), km = aNum(b.cinta.km);
  if (cm || kmh || incl != null || km) {
    if (!cm) throw 'Pon el tiempo de la caminata en cinta, o deja la cinta vacía';
    cinta = { min: cm, kmh, incl, km: km ?? (kmh ? Math.round((cm / 60) * kmh * 100) / 100 : null) };
  }

  const nueva = {
    ...s, fecha: b.fecha, plan: b.plan,
    nombre: b.plan === s.plan ? s.nombre : b.plan === 'L' ? 'Entreno libre' : (E.rutina[b.plan]?.nombre || s.nombre),
    inicio: inicio.toISOString(), fin: fin ? fin.toISOString() : null,
    ejercicios: b.grupos.map((g, gi) => {
      const ej = E.ejercicioPorId.get(g.id);
      const deTrabajo = nuevas.filter((x) => x.item === gi && !x.calent);
      const aprox = nuevas.filter((x) => x.item === gi && x.calent);
      const calent = Math.max(0, ...aprox.map((x) => x.indice + 1));
      return { id: g.id, series: Math.max(g.planSeries, seriesCompletas(deTrabajo, ej?.lados)) || 1, ...(calent ? { calent } : {}) };
    }),
  };
  delete nueva.calentamiento; delete nueva.cinta; delete nueva.aprox; delete nueva.horaDesconocida;
  if (cal) nueva.calentamiento = cal;
  if (cinta) nueva.cinta = cinta;
  if (b.aprox) nueva.aprox = true;
  if (s.horaDesconocida && !b.hora && b.min === '') nueva.horaDesconocida = true;

  const quedan = new Set(nuevas.map((x) => x.id));
  for (const x of E.series.filter((r) => r.sesionId === s.id)) if (!quedan.has(x.id)) await db.borrar('series', x.id);
  if (nuevas.length) await db.guardarVarios('series', nuevas);
  await db.guardar('sesiones', nueva);
  if (!E.config.primeraSesion || E.config.primeraSesion > nueva.fecha) await guardarConfig({ primeraSesion: nueva.fecha });
  await recargar();
  avisar();
}

export function EditarEntreno({ id }) {
  useEstado();
  const s = E.sesiones.find((x) => x.id === id);
  const [b, ponerB] = useState(() => (s ? borradorDe(s) : null));
  const [hoja, ponerHoja] = useState(null); // { tipo: 'anadir' } | { tipo: 'cambiar', gi }
  const [guardando, ponerGuardando] = useState(false);

  if (!s || !b) {
    return html`<button class="volver" onClick=${() => atras('entreno')}><${Icono} n="atras" t=${24} g=${2.4} />Entreno</button>
      <${Vacio} titulo="Este entreno ya no existe">Vuelve a Entreno para ver los que tienes.<//>`;
  }

  const actualizar = (fn) => ponerB((prev) => { const n = copia(prev); fn(n); return n; });
  const al = (fn) => (e) => { const v = e.currentTarget.value; actualizar((n) => fn(n, v)); };

  const anadirFila = (gi, calent) => actualizar((n) => {
    const g = n.grupos[gi];
    const lados = E.ejercicioPorId.get(g.id)?.lados ? ['izq', 'der'] : [null];
    const delTipo = g.filas.filter((f) => f.calent === calent);
    const filas = lados.map((lado) => filaNueva(calent, lado, [...delTipo].reverse().find((f) => f.lado === lado)));
    g.filas.splice(calent ? g.filas.filter((f) => f.calent).length : g.filas.length, 0, ...filas);
  });
  const cambiarEjercicio = (gi, ej) => actualizar((n) => {
    const g = n.grupos[gi];
    g.id = ej.id;
    if (!ej.lados) g.filas.forEach((f) => { f.lado = null; });
    else g.filas = g.filas.flatMap((f) => (f.lado ? [f] : [{ ...f, lado: 'izq' }, { ...f, clave: clave(), orig: null, lado: 'der' }]));
  });
  const anadirEjercicio = (ej) => actualizar((n) => {
    n.grupos.push({ clave: clave(), id: ej.id, planSeries: 0, filas: (ej.lados ? ['izq', 'der'] : [null]).map((l) => filaNueva(false, l, null)) });
  });

  const guardar = async () => {
    ponerGuardando(true);
    try {
      await guardarBorrador(s, b);
      toast('Entreno guardado');
      atras('entreno');
    } catch (e) {
      if (typeof e !== 'string') console.error(e);
      toast(typeof e === 'string' ? e : 'No se ha podido guardar');
      ponerGuardando(false);
    }
  };

  const campo = (texto, valor, alCambiar, props = {}) => html`<label class="campo"><span>${texto}</span>
    <input class="entrada num" inputmode="decimal" value=${valor} onInput=${alCambiar} ...${props} /></label>`;
  const kmCalc = aNum(b.cinta.min) && aNum(b.cinta.kmh) ? n2((aNum(b.cinta.min) / 60) * aNum(b.cinta.kmh)) : '';

  return html`
    <button class="volver" onClick=${() => atras('entreno')}><${Icono} n="atras" t=${24} g=${2.4} />Entreno</button>
    <header class="cabecera">
      <div><div class="eyebrow">${L.fechaLarga(s.fecha)}</div><h1 class="titulo">Editar entreno</h1></div>
      <button class="boton chico" disabled=${guardando} onClick=${guardar}>Guardar</button>
    </header>

    <div class="pila">
      <div class="tarjeta pila">
        <div class="segmentado">
          ${[...ORDEN_SESIONES, 'L'].map((p) => html`<button class=${b.plan === p ? 'activo' : ''} onClick=${() => actualizar((n) => { n.plan = p; })}>${p === 'L' ? 'Libre' : p}</button>`)}
        </div>
        <div class="rejilla-2">
          <label class="campo"><span>Día</span><input class="entrada" type="date" max=${L.hoyISO()} value=${b.fecha} onInput=${al((n, v) => { n.fecha = v; })} /></label>
          <label class="campo"><span>Hora de inicio</span><input class="entrada" type="time" value=${b.hora} onInput=${al((n, v) => { n.hora = v; })} /></label>
        </div>
        <div class="rejilla-2">
          ${s.fin ? campo('Duración (min)', b.min, al((n, v) => { n.min = v; }), { inputmode: 'numeric', placeholder: s.horaDesconocida ? '50' : '' }) : html`<div></div>`}
          ${campo('Calentamiento (min)', b.calMin, al((n, v) => { n.calMin = v; }), { inputmode: 'numeric', placeholder: 'sin calentar' })}
        </div>
        ${s.horaDesconocida && html`<p class="t2 peq">La hora y la duración no se apuntaron. Si te acuerdas, ponlas.</p>`}
        ${s.aprox && html`<div class="fila-f">
          <div class="crece"><b>Pesos aproximados</b><div class="t2 peq">No cuentan para récords ni para subir de peso. Quítalo si ya son los reales.</div></div>
          <${Interruptor} etiqueta="Pesos aproximados" valor=${b.aprox} alCambiar=${(v) => actualizar((n) => { n.aprox = v; })} />
        </div>`}
      </div>

      ${b.grupos.map((g, gi) => {
        const ej = E.ejercicioPorId.get(g.id);
        const et = etiquetas(g.filas);
        return html`<div class="tarjeta ej" key=${g.clave}>
          <div class="ej-cab">
            <${FotoEj} ej=${ej} clase="mini" quieta />
            <button class="crece" style="text-align:left" onClick=${() => ponerHoja({ tipo: 'cambiar', gi })}>
              <div class="ej-nombre">${ej?.nombre || g.id}</div><div class="ej-meta">Toca para cambiarlo por otro</div>
            </button>
            <button class="mas" aria-label=${'Quitar ' + (ej?.nombre || 'ejercicio')} onClick=${() => actualizar((n) => { n.grupos.splice(gi, 1); })}><${Icono} n="basura" t=${20} /></button>
          </div>
          <div class="series">
            ${g.filas.length > 0 && html`<div class="fila-edit cabeza"><span>Serie</span><span>Kg</span><span>${ej?.segundos ? 'Seg' : 'Reps'}</span><span>RIR</span><span></span></div>`}
            ${g.filas.map((f, fi) => html`<div class=${`fila-edit ${f.calent ? 'calent' : ''}`} key=${f.clave}>
              <span class="n">${et[fi].num}${et[fi].lado && html`<small>${et[fi].lado}</small>`}</span>
              <input class="caja num" inputmode="decimal" placeholder="–" value=${f.peso} onInput=${al((n, v) => { n.grupos[gi].filas[fi].peso = v; })} onFocus=${(e) => e.currentTarget.select()} />
              <input class="caja num" inputmode="numeric" placeholder="–" value=${f.reps} onInput=${al((n, v) => { n.grupos[gi].filas[fi].reps = v; })} onFocus=${(e) => e.currentTarget.select()} />
              ${f.calent ? html`<span></span>` : html`<input class="caja num" inputmode="numeric" placeholder="–" value=${f.rir} onInput=${al((n, v) => { n.grupos[gi].filas[fi].rir = v; })} onFocus=${(e) => e.currentTarget.select()} />`}
              <button class="mas" aria-label="Quitar serie" onClick=${() => actualizar((n) => { n.grupos[gi].filas.splice(fi, 1); })}><${Icono} n="cerrar" t=${16} g=${2.4} /></button>
            </div>`)}
            ${g.filas.length === 0 && html`<p class="t2 peq" style="margin:8px 2px 0">Sin series: no se hizo.</p>`}
          </div>
          <div class="dos-botones" style="margin-top:8px">
            <button class="anadir-serie" style="margin-top:0" onClick=${() => anadirFila(gi, false)}>+ Serie</button>
            <button class="anadir-serie" style="margin-top:0" onClick=${() => anadirFila(gi, true)}>+ Aproximación</button>
          </div>
        </div>`;
      })}
      <button class="boton suave" onClick=${() => ponerHoja({ tipo: 'anadir' })}><${Icono} n="mas" t=${20} g=${2.2} />Añadir ejercicio</button>

      <div class="tarjeta pila">
        <div class="ej-nombre">Caminata en cinta</div>
        <div class="rejilla-2">
          ${campo('Tiempo (min)', b.cinta.min, al((n, v) => { n.cinta.min = v; }), { inputmode: 'numeric' })}
          ${campo('Velocidad (km/h)', b.cinta.kmh, al((n, v) => { n.cinta.kmh = v; }))}
        </div>
        <div class="rejilla-2">
          ${campo('Inclinación (%)', b.cinta.incl, al((n, v) => { n.cinta.incl = v; }))}
          ${campo('Distancia (km)', b.cinta.km, al((n, v) => { n.cinta.km = v; }), { placeholder: kmCalc })}
        </div>
        <p class="t2 peq">Déjala vacía si no caminaste.</p>
      </div>

      <button class="boton" disabled=${guardando} onClick=${guardar}>Guardar cambios</button>
      <button class="boton suave" onClick=${() => atras('entreno')}>Salir sin guardar</button>
    </div>

    ${hoja?.tipo === 'anadir' && html`<${Hoja} titulo="Añadir ejercicio" alCerrar=${() => ponerHoja(null)}>
      <${ListaEjercicios} alElegir=${(ej) => { anadirEjercicio(ej); ponerHoja(null); }} />
    <//>`}
    ${hoja?.tipo === 'cambiar' && html`<${Hoja} titulo="Cambiar por otro" alCerrar=${() => ponerHoja(null)}>
      <${ListaEjercicios} grupo=${E.ejercicioPorId.get(b.grupos[hoja.gi]?.id)?.grupo} alElegir=${(ej) => { cambiarEjercicio(hoja.gi, ej); ponerHoja(null); }} />
    <//>`}`;
}
