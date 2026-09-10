// entreno.js — elegir sesión, entrenar serie a serie con el descanso automático,
// y terminar con el resumen. Las reglas de progresión están en logica.js.

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { E, useEstado, avisar, toast, recargar, guardarConfig, seriesDe, siguientePlan, sesionesTerminadas, unaRM } from '../estado.js';
import * as L from '../logica.js';
import * as db from '../db.js';
import { ORDEN_SESIONES } from '../seed.js';
import { Icono, FotoEj, Hoja, ir, n0, n1, aNum } from '../comunes.js';
import * as D from '../descanso.js';
import { ListaEjercicios } from './ejercicios.js';

// ---------------------------------------------------------------- utilidades

export function minutosEstimados(plan) {
  const seg = plan.ejercicios.reduce((t, x) => {
    const ej = E.ejercicioPorId.get(x.id);
    return t + x.series * (40 + (ej?.descanso ?? 90));
  }, 0);
  return Math.max(5, Math.round(seg / 60 / 5) * 5);
}

// '0-1' -> 1, '3-4' -> 4, '2' -> 2. Se usa el valor alto: la progresión pide RIR 1 o más.
const rirPorDefecto = (r) => { const m = String(r ?? '2').match(/\d+/g); return m ? Number(m[m.length - 1]) : 2; };

const volumenDe = (series) => series.reduce((t, s) => t + (s.peso || 0) * (s.reps || 0), 0);

async function guardarSesion(s) {
  await db.guardar('sesiones', s);
  const i = E.sesiones.findIndex((x) => x.id === s.id);
  if (i >= 0) E.sesiones[i] = s; else E.sesiones.push(s);
  E.sesionActiva = E.sesiones.find((x) => !x.fin) || null;
  avisar();
}

export async function iniciarSesion(plan) {
  const hoy = L.hoyISO();
  if (!E.config.primeraSesion) await guardarConfig({ primeraSesion: hoy });
  E.fase = L.faseActual(E.config.primeraSesion);
  const def = plan === 'L' ? { nombre: 'Entreno libre', ejercicios: [] } : E.rutina[plan];
  await guardarSesion({
    id: db.nuevoId('s'), fecha: hoy, plan, nombre: def.nombre,
    inicio: new Date().toISOString(), fin: null,
    ejercicios: def.ejercicios.map((x) => ({ id: x.id, series: L.seriesObjetivo(x.series, E.fase) })),
  });
  if (E.config.pantallaEncendida !== false) D.pantallaEncendida(true);
}

// ---------------------------------------------------------------- pantalla

export function Entreno() {
  useEstado();
  return E.sesionActiva ? html`<${EntrenoActivo} sesion=${E.sesionActiva} />` : html`<${ElegirSesion} />`;
}

function ElegirSesion() {
  const toca = siguientePlan();
  const ultimas = sesionesTerminadas().slice(-5).reverse();
  const empezar = (plan) => iniciarSesion(plan);
  return html`
    <header class="cabecera"><h1 class="titulo">Entreno</h1></header>
    <div class="pila">
      ${ORDEN_SESIONES.map((plan) => {
        const s = E.rutina[plan];
        const ejs = s.ejercicios.map((x) => E.ejercicioPorId.get(x.id)).filter(Boolean);
        return html`<button class="tarjeta" style="display:block;width:100%;text-align:left" onClick=${() => empezar(plan)}>
          <div class="fila-f" style="justify-content:space-between">
            <span class="pastilla">Sesión ${plan}</span>
            ${plan === toca && html`<span class="t2 peq" style="font-weight:700">Te toca</span>`}
          </div>
          <h3 class="titulo" style="font-size:20px;margin:8px 0 2px">${s.nombre}</h3>
          <div class="t2 peq">${ejs.length} ejercicios · unos ${minutosEstimados(s)} min</div>
          <div style="display:flex;gap:6px;margin-top:12px">${ejs.slice(0, 5).map((ej) => html`<${FotoEj} ej=${ej} clase="mini" quieta />`)}</div>
        </button>`;
      })}
      <button class="boton suave" onClick=${() => empezar('L')}><${Icono} n="mas" t=${20} g=${2.2} />Entreno libre</button>
    </div>

    ${ultimas.length > 0 && html`
      <div class="seccion"><h2 class="titulo">Últimos entrenos</h2></div>
      <div class="lista">${ultimas.map((s) => html`<${FilaHistorial} s=${s} />`)}</div>`}`;
}

function FilaHistorial({ s }) {
  const series = E.series.filter((x) => x.sesionId === s.id);
  const min = Math.round((new Date(s.fin) - new Date(s.inicio)) / 60000);
  return html`<div class="item">
    <div class="crece">
      <div class="nombre">${s.plan === 'L' ? '' : `Sesión ${s.plan} · `}${s.nombre}</div>
      <div class="meta">${L.fechaLarga(s.fecha)} · ${min} min · ${series.length} series · ${n0(volumenDe(series))} kg</div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- entreno en marcha

function EntrenoActivo({ sesion }) {
  const [, tic] = useState(0);
  const [abierto, ponerAbierto] = useState(null);
  const [hoja, ponerHoja] = useState(null); // { tipo: 'menu'|'cambiar'|'anadir'|'terminar', i }

  useEffect(() => {
    const t = setInterval(() => tic((x) => x + 1), 1000);
    if (E.config.pantallaEncendida !== false) D.pantallaEncendida(true);
    return () => clearInterval(t);
  }, []);

  const seriesSesion = E.series.filter((s) => s.sesionId === sesion.id);
  const hechasDe = (i) => seriesSesion.filter((s) => s.item === i).length;
  // Abierto por defecto: el primer ejercicio que no está completo.
  const primeroPendiente = sesion.ejercicios.findIndex((x, i) => hechasDe(i) < x.series);
  const actual = abierto ?? (primeroPendiente === -1 ? null : primeroPendiente);

  const seg = Math.floor((Date.now() - new Date(sesion.inicio)) / 1000);
  const limite = (E.config.perfil?.limiteSesionMin || 55) * 60;

  const cambiarPlan = async (cambio) => { await guardarSesion({ ...sesion, ejercicios: cambio(sesion.ejercicios.map((x) => ({ ...x }))) }); };

  return html`
    <div class="cab-entreno">
      <div class="crece">
        <span class="pastilla">${sesion.plan === 'L' ? 'Libre' : `Sesión ${sesion.plan}`}</span>
        <h1 class="titulo">${sesion.nombre}</h1>
      </div>
      <button class="boton chico" onClick=${() => ponerHoja({ tipo: 'terminar' })}>Terminar</button>
    </div>
    <div class=${`crono ${seg > limite ? 'pasado' : ''}`}>
      <span class="num">${L.mmss(seg)}</span>
      <span class="barra-fina"><i style=${`width:${Math.min(100, (seg / limite) * 100)}%`}></i></span>
      <span class="t2">${limite / 60} min</span>
    </div>
    ${E.fase?.motivo && html`<div class="sugerencia" style="margin-bottom:12px"><${Icono} n="reloj" t=${18} g=${2} />${E.fase.motivo}</div>`}

    <div class="pila">
      ${sesion.ejercicios.map((item, i) => {
        const ej = E.ejercicioPorId.get(item.id);
        if (!ej) return null;
        return i === actual
          ? html`<${TarjetaEjercicio} key=${item.id + i} sesion=${sesion} item=${item} i=${i} ej=${ej}
              alMenu=${() => ponerHoja({ tipo: 'menu', i })}
              alCompletar=${() => ponerAbierto(sesion.ejercicios.findIndex((x, j) => j > i && hechasDe(j) < x.series))}
              alAnadirSerie=${() => cambiarPlan((l) => { l[i].series++; return l; })} />`
          : html`<button class="tarjeta plegada" key=${item.id + i} onClick=${() => ponerAbierto(i)}>
              <${FotoEj} ej=${ej} clase="mini" quieta />
              <div class="crece"><div class="ej-nombre">${ej.nombre}</div>
                <div class="ej-meta">${hechasDe(i)} de ${item.series} series · ${ej.repMin}–${ej.repMax} ${ej.segundos ? 'seg' : 'reps'}</div></div>
              ${hechasDe(i) >= item.series && html`<span class="hecho-marca"><${Icono} n="check" t=${16} g=${3} /></span>`}
            </button>`;
      })}
      <button class="boton suave" onClick=${() => ponerHoja({ tipo: 'anadir' })}><${Icono} n="mas" t=${20} g=${2.2} />Añadir ejercicio</button>
    </div>

    ${hoja?.tipo === 'menu' && html`<${MenuEjercicio} sesion=${sesion} i=${hoja.i} hechas=${hechasDe(hoja.i)}
        alCerrar=${() => ponerHoja(null)} alCambiar=${() => ponerHoja({ tipo: 'cambiar', i: hoja.i })} cambiarPlan=${cambiarPlan} />`}
    ${hoja?.tipo === 'cambiar' && html`<${Hoja} titulo="Cambiar por otro" alCerrar=${() => ponerHoja(null)}>
        <${ListaEjercicios} grupo=${E.ejercicioPorId.get(sesion.ejercicios[hoja.i].id)?.grupo}
          alElegir=${async (ej) => { await cambiarPlan((l) => { l[hoja.i].id = ej.id; return l; }); ponerHoja(null); ponerAbierto(hoja.i); }} />
      <//>`}
    ${hoja?.tipo === 'anadir' && html`<${Hoja} titulo="Añadir ejercicio" alCerrar=${() => ponerHoja(null)}>
        <${ListaEjercicios} alElegir=${async (ej) => {
          await cambiarPlan((l) => [...l, { id: ej.id, series: 3 }]); ponerHoja(null); ponerAbierto(sesion.ejercicios.length);
        }} />
      <//>`}
    ${hoja?.tipo === 'terminar' && html`<${HojaTerminar} sesion=${sesion} series=${seriesSesion} seg=${seg} alCerrar=${() => ponerHoja(null)} />`}`;
}

// ---------------------------------------------------------------- un ejercicio con sus series

function TarjetaEjercicio({ sesion, item, i, ej, alMenu, alCompletar, alAnadirSerie }) {
  const [borrador, ponerBorrador] = useState({});
  const previas = seriesDe(ej.id).filter((s) => s.sesionId !== sesion.id);
  const analisis = L.analizarEjercicio(ej, previas, E.fase || L.faseActual(null));
  const ultima = analisis.ultima;
  const hechas = E.series.filter((s) => s.sesionId === sesion.id && s.item === i).sort((a, b) => a.indice - b.indice);
  const rirObj = L.rirObjetivo(ej, E.fase || {});
  const corporal = ej.tipo === 'corporal';

  const sugerencia = (fila) => ({
    peso: hechas[fila - 1]?.peso ?? analisis.pesoSugerido ?? (corporal ? 0 : null),
    reps: analisis.aviso?.tipo === 'subir' ? ej.repMin : (ultima?.series[fila]?.reps ?? ej.repMin),
    rir: rirPorDefecto(rirObj),
  });

  const valor = (fila, campo) => borrador[`${fila}-${campo}`];
  const poner = (fila, campo, v) => ponerBorrador({ ...borrador, [`${fila}-${campo}`]: v });

  const marcar = async (fila) => {
    D.prepararAudio();
    const hecha = hechas.find((s) => s.indice === fila);
    if (hecha) { // desmarcar: vuelve a ser editable
      await db.borrar('series', hecha.id);
      E.series = E.series.filter((s) => s.id !== hecha.id);
      poner(fila, 'peso', String(hecha.peso)); avisar();
      return;
    }
    const sug = sugerencia(fila);
    const peso = aNum(valor(fila, 'peso')) ?? sug.peso ?? 0;
    const reps = aNum(valor(fila, 'reps')) ?? sug.reps;
    const rir = aNum(valor(fila, 'rir')) ?? sug.rir;
    if (!reps) { toast('Falta el número de repeticiones'); return; }

    const mejorAntes = Math.max(0, ...seriesDe(ej.id).map((s) => unaRM(s.peso, s.reps)));
    const fila_ = { id: db.nuevoId('r'), sesionId: sesion.id, ejercicioId: ej.id, item: i, fecha: sesion.fecha,
      indice: fila, peso, reps, rir, ts: Date.now() };
    await db.guardar('series', fila_);
    E.series.push(fila_);
    D.vibrar();

    const esUltima = hechas.length + 1 >= item.series;
    D.empezar(ej.descanso || 90);
    if (mejorAntes > 0 && unaRM(peso, reps) > mejorAntes) toast(`Récord en ${ej.nombre.split(',')[0]}: ${n1(peso)} kg × ${reps}`, 3500);
    avisar();
    if (esUltima) setTimeout(alCompletar, 350);
  };

  const filas = Array.from({ length: Math.max(item.series, hechas.length) }, (_, f) => f);

  return html`<div class="tarjeta">
    <div class="ej-cab">
      <button onClick=${() => ir('ejercicio/' + ej.id)} aria-label=${'Ver ' + ej.nombre}><${FotoEj} ej=${ej} clase="mini-g" /></button>
      <div class="crece">
        <div class="ej-nombre">${ej.nombre}</div>
        <div class="ej-meta">${item.series} series · ${ej.repMin}–${ej.repMax} ${ej.segundos ? 'seg' : 'reps'} · RIR ${rirObj}</div>
      </div>
      <button class="mas" onClick=${alMenu} aria-label="Opciones del ejercicio"><${Icono} n="puntos" t=${22} /></button>
    </div>

    ${analisis.aviso && html`<div class="sugerencia" style="margin-top:12px"><${Icono} n=${analisis.aviso.tipo === 'subir' ? 'subir' : 'cambiar'} t=${18} g=${2.4} />${analisis.aviso.texto}</div>`}
    ${ej.aviso && html`<div class="aviso" style="margin-top:8px"><${Icono} n="aviso" t=${17} g=${2} />${ej.aviso}</div>`}

    <div class="series">
      <div class="fila-serie cabeza"><span>Serie</span><span>Anterior</span><span>${corporal ? '+Kg' : 'Kg'}</span><span>${ej.segundos ? 'Seg' : 'Reps'}</span><span>RIR</span><span></span></div>
      ${filas.map((f) => {
        const h = hechas.find((s) => s.indice === f);
        const sug = sugerencia(f);
        const ant = ultima?.series[f];
        const campo = (c, ph) => html`<input class="caja num" inputmode="decimal" enterkeyhint="done"
          value=${h ? String(h[c]).replace('.', ',') : (valor(f, c) ?? '')} placeholder=${ph ?? '–'} readOnly=${!!h}
          onInput=${(e) => poner(f, c, e.currentTarget.value)} onFocus=${(e) => e.currentTarget.select()} />`;
        return html`<div class=${`fila-serie ${h ? 'hecha' : ''}`} key=${f}>
          <span class="n">${f + 1}</span>
          <span class="ant">${ant ? `${n1(ant.peso)} × ${ant.reps}` : '–'}</span>
          ${campo('peso', sug.peso != null ? n1(sug.peso) : '–')}
          ${campo('reps', sug.reps)}
          ${campo('rir', sug.rir)}
          <button class="ok" onClick=${() => marcar(f)} aria-label=${h ? 'Desmarcar serie' : 'Marcar serie hecha'}><${Icono} n="check" t=${20} g=${3} /></button>
        </div>`;
      })}
    </div>
    <button class="anadir-serie" onClick=${alAnadirSerie}>+ Añadir serie</button>
  </div>`;
}

function MenuEjercicio({ sesion, i, hechas, alCerrar, alCambiar, cambiarPlan }) {
  const item = sesion.ejercicios[i];
  const ej = E.ejercicioPorId.get(item.id);
  const mover = async (d) => { await cambiarPlan((l) => { const j = i + d; if (j < 0 || j >= l.length) return l; [l[i], l[j]] = [l[j], l[i]]; return l; }); alCerrar(); };
  const opcion = (icono, texto, accion, peligro = false) => html`<button class="item" onClick=${accion}>
    <${Icono} n=${icono} t=${22} /><span class="crece" style=${peligro ? 'color:var(--aviso-texto);font-weight:600' : 'font-weight:600'}>${texto}</span></button>`;
  return html`<${Hoja} titulo=${ej?.nombre || 'Ejercicio'} alCerrar=${alCerrar}>
    <div class="lista">
      ${opcion('ejercicios', 'Ver técnica e historial', () => { alCerrar(); ir('ejercicio/' + item.id); })}
      ${hechas === 0 ? opcion('cambiar', 'Cambiar por otro ejercicio', alCambiar) : null}
      ${opcion('mas', 'Añadir una serie', async () => { await cambiarPlan((l) => { l[i].series++; return l; }); alCerrar(); })}
      ${item.series > Math.max(1, hechas) ? opcion('menos', 'Quitar una serie', async () => { await cambiarPlan((l) => { l[i].series--; return l; }); alCerrar(); }) : null}
      ${i > 0 ? opcion('subir', 'Mover arriba', () => mover(-1)) : null}
      ${hechas === 0 ? opcion('basura', 'Quitar de este entreno', async () => { await cambiarPlan((l) => l.filter((_, j) => j !== i)); alCerrar(); }, true) : null}
    </div>
  <//>`;
}

// ---------------------------------------------------------------- terminar

function HojaTerminar({ sesion, series, seg, alCerrar }) {
  const [descartar, ponerDescartar] = useState(false);
  const volumen = volumenDe(series);
  const ejerciciosHechos = new Set(series.map((s) => s.item)).size;

  const terminar = async () => {
    await guardarSesion({ ...sesion, fin: new Date().toISOString() });
    D.parar(); D.pantallaEncendida(false);
    toast(`Entreno guardado: ${Math.round(seg / 60)} min y ${n0(volumen)} kg movidos`, 3500);
    ir('hoy');
  };
  const borrarTodo = async () => {
    for (const s of series) await db.borrar('series', s.id);
    await db.borrar('sesiones', sesion.id);
    D.parar(); D.pantallaEncendida(false);
    await recargar(); avisar(); toast('Entreno descartado'); ir('hoy');
  };

  return html`<${Hoja} titulo="Terminar entreno" alCerrar=${alCerrar}>
    <div class="rejilla-3" style="margin-bottom:16px">
      <div class="tarjeta dato"><small>Tiempo</small><div class="num">${Math.round(seg / 60)} <span>min</span></div></div>
      <div class="tarjeta dato"><small>Series</small><div class="num">${series.length}</div></div>
      <div class="tarjeta dato"><small>Movido</small><div class="num">${n0(volumen)} <span>kg</span></div></div>
    </div>
    ${series.length === 0 && html`<p class="t2" style="margin-bottom:14px">No has marcado ninguna serie. Si lo guardas contará como día de gimnasio para la comida.</p>`}
    ${ejerciciosHechos > 0 && ejerciciosHechos < sesion.ejercicios.length && html`<p class="t2" style="margin-bottom:14px">Has hecho ${ejerciciosHechos} de ${sesion.ejercicios.length} ejercicios. Lo que falta no se guarda.</p>`}
    <div class="pila">
      <button class="boton" onClick=${terminar}>Guardar entreno</button>
      <button class="boton suave" onClick=${alCerrar}>Seguir entrenando</button>
      ${descartar
        ? html`<button class="boton peligro" onClick=${borrarTodo}>Sí, borrar este entreno y sus series</button>`
        : html`<button class="boton peligro" style="background:none" onClick=${() => ponerDescartar(true)}>Descartar entreno</button>`}
    </div>
  <//>`;
}

// ---------------------------------------------------------------- barra de descanso (visible en todas las pantallas)

export function BarraDescanso() {
  const [, tic] = useState(0);
  useEffect(() => { const t = setInterval(() => tic((x) => x + 1), 250); return () => clearInterval(t); }, []);
  const d = E.descanso;
  if (!d) return null;
  const queda = D.restante();
  const fin = queda <= 0;
  return html`<div class=${`descanso ${fin ? 'fin' : ''}`} role="timer" aria-live="off">
    <span class="linea" style=${`transform:scaleX(${d.total ? queda / d.total : 0})`}></span>
    <div class="crece">
      <small>${fin ? 'A por la siguiente' : 'Descanso'}</small>
      <span class="num">${fin ? '0:00' : L.mmss(queda)}</span>
    </div>
    ${!fin && html`<button onClick=${() => D.ajustar(-15)} aria-label="Quitar 15 segundos">−15</button>
      <button onClick=${() => D.ajustar(15)} aria-label="Añadir 15 segundos">+15</button>`}
    <button onClick=${D.parar}>${fin ? 'Vale' : 'Saltar'}</button>
  </div>`;
}
