// estado.js — el estado compartido de la app y la carga desde IndexedDB.
// Las pantallas leen de E y llaman a avisar() cuando cambian algo: todas se repintan.

import { useState, useEffect } from './vendor/preact-htm.js';
import * as db from './db.js';
import * as S from './seed.js';
import * as L from './logica.js';
import { CATALOGO } from './datos/catalogo-ejercicios.js';
import { ALIMENTOS_BASE } from './datos/alimentos-base.js';
import { REGISTROS_PENDIENTES, CAMBIOS_PENDIENTES } from './datos/registros.js';

// Sube este número cuando añadas datos nuevos a seed.js: la app los incorpora
// sin tocar lo que tú hayas editado.
const VERSION_SEMILLA = 6;

export const E = {
  listo: false,
  config: {},
  rutina: S.RUTINA,
  ejercicios: [],            // catálogo + tus ajustes + los que crees tú
  ejercicioPorId: new Map(),
  sesiones: [],
  series: [],
  misAlimentos: [],
  alimentos: [],             // tuyos primero, luego la base
  alimentoPorNombre: new Map(),
  recetas: [],
  habituales: [],
  despensa: [],
  uso: new Map(),
  sesionActiva: null,
  fase: null,
  toast: null,
};

// ---------------------------------------------------------------- avisos de cambio

const oyentes = new Set();
let version = 0;
export function avisar() { version++; oyentes.forEach((f) => f(version)); }

// Hook: la pantalla se repinta cada vez que alguien llama a avisar().
export function useEstado() {
  const [, poner] = useState(0);
  useEffect(() => {
    oyentes.add(poner);
    poner(version); // si algo cambió antes de empezar a escuchar (la carga inicial), repinta ya
    return () => oyentes.delete(poner);
  }, []);
  return E;
}

let temporizadorToast = null;
export function toast(texto, ms = 2400) {
  E.toast = texto; avisar();
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => { E.toast = null; avisar(); }, ms);
}

export const idDe = (texto) => texto
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------------------------------------------------------------- siembra

async function sembrar() {
  const versionActual = await db.leerMeta('versionSemilla', 0);
  if (versionActual >= VERSION_SEMILLA) return;

  const meter = async (almacen, filas, hacerId) => {
    const existentes = new Set((await db.todos(almacen)).map((f) => f.id));
    const nuevas = filas.map((f) => ({ ...f, id: hacerId(f) })).filter((f) => !existentes.has(f.id));
    if (nuevas.length) await db.guardarVarios(almacen, nuevas);
  };
  await meter('alimentos', S.ALIMENTOS, (a) => idDe(a.nombre));
  await meter('recetas', S.RECETAS, (r) => idDe(r.nombre));
  await meter('despensa', S.DESPENSA, (d) => idDe(d.nombre));
  for (const [almacen, ids] of Object.entries(S.RETIRADOS || {})) {
    for (const id of ids) if (await db.obtener(almacen, id)) await db.borrar(almacen, id);
  }
  if (!(await db.leerMeta('rutina'))) await db.escribirMeta('rutina', S.RUTINA);
  if (!(await db.leerMeta('config'))) {
    await db.escribirMeta('config', {
      objetivos: { ...S.OBJETIVOS }, perfil: { ...S.PERFIL },
      primeraSesion: null, sonidoDescanso: true, pantallaEncendida: true,
    });
  }
  await db.escribirMeta('versionSemilla', VERSION_SEMILLA);
}

// ---------------------------------------------------------------- ejercicios

// Lo que puedes cambiar de un ejercicio del catálogo; el resto viene del catálogo.
const AJUSTABLES = ['pesoInicial', 'repMin', 'repMax', 'rir', 'descanso', 'incremento', 'nota'];

function normalizar(e) {
  return {
    repMin: e.rep?.[0] ?? e.repMin, repMax: e.rep?.[1] ?? e.repMax,
    pesoInicial: null, sec: [], claves: [], ...e,
    img: e.img ?? (e.en ? e.id : null),
  };
}

function mezclarEjercicios(guardados) {
  const porId = new Map(guardados.map((g) => [g.id, g]));
  // Tus pesos de partida viven en seed.js: sin ellos, una instalación nueva no sugeriría peso.
  const semilla = new Map(S.EJERCICIOS.map((e) => [e.id, e]));
  const lista = CATALOGO.map((c) => {
    const g = porId.get(c.id);
    const ajustes = g ? Object.fromEntries(AJUSTABLES.filter((k) => g[k] !== undefined).map((k) => [k, g[k]])) : {};
    return normalizar({ pesoInicial: semilla.get(c.id)?.pesoInicial ?? null, ...c, ...ajustes });
  });
  const enCatalogo = new Set(CATALOGO.map((c) => c.id));
  for (const g of guardados) if (!enCatalogo.has(g.id) && g.propio) lista.push(normalizar(g));
  return lista;
}

// ---------------------------------------------------------------- entrenos de la versión anterior

// La primera versión guardaba inicio y fin como milisegundos, sin nombre ni lista
// de ejercicios, y las series sin 'item'. Se adaptan al leer; lo guardado no se toca.
const aISO = (t) => (typeof t === 'number' ? new Date(t).toISOString() : t);

function adaptarSesion(s) {
  const plan = E.rutina[s.plan];
  return {
    ...s,
    inicio: aISO(s.inicio), fin: aISO(s.fin),
    nombre: s.nombre ?? plan?.nombre ?? 'Entreno',
    ejercicios: s.ejercicios ?? (plan?.ejercicios || []).map((x) => ({ id: x.id, series: x.series })),
  };
}

function adaptarSeries(series, sesiones) {
  const porId = new Map(sesiones.map((s) => [s.id, s]));
  return series.map((r) => {
    if (r.item !== undefined) return r;
    const i = porId.get(r.sesionId)?.ejercicios.findIndex((x) => x.id === r.ejercicioId) ?? -1;
    return { ...r, item: i >= 0 ? i : 0 };
  });
}

// ---------------------------------------------------------------- carga

export async function recargar() {
  const [ejercicios, alimentos, recetas, despensa, uso, sesiones, series, habituales, fotos, rutina, config] = await Promise.all([
    db.todos('ejercicios'), db.todos('alimentos'), db.todos('recetas'), db.todos('despensa'),
    db.todos('uso'), db.todos('sesiones'), db.todos('series'), db.todos('habituales'), db.todos('fotos'),
    db.leerMeta('rutina', S.RUTINA), db.leerMeta('config', {}),
  ]);

  E.ejercicios = mezclarEjercicios(ejercicios);
  E.ejercicioPorId = new Map(E.ejercicios.map((e) => [e.id, e]));
  for (const f of fotos) {
    const ej = E.ejercicioPorId.get(f.id);
    if (ej) ej.fotoPropia = [f.f0, f.f1].filter(Boolean);
  }

  const es = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
  E.misAlimentos = alimentos.sort(es);
  const base = ALIMENTOS_BASE.map((a) => ({ ...a, id: 'b-' + idDe(a.nombre), base: true }));
  const nombresMios = new Set(E.misAlimentos.map((a) => a.nombre.toLowerCase()));
  E.alimentos = [...E.misAlimentos, ...base.filter((a) => !nombresMios.has(a.nombre.toLowerCase()))];
  E.alimentoPorNombre = new Map(E.alimentos.map((a) => [a.nombre, a]));

  E.recetas = recetas.sort(es);
  E.despensa = despensa.sort(es);
  E.habituales = habituales.sort((a, b) => (b.veces || 0) - (a.veces || 0));
  E.uso = new Map(uso.map((u) => [u.clave, u]));
  E.rutina = rutina;
  E.sesiones = sesiones.map(adaptarSesion).sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  E.series = adaptarSeries(series, E.sesiones);
  E.config = { objetivos: { ...S.OBJETIVOS }, perfil: { ...S.PERFIL }, ...config };
  // logica.js lee OBJETIVOS y PERFIL de seed.js: se actualizan con lo que hayas cambiado en Ajustes.
  Object.assign(S.OBJETIVOS, E.config.objetivos);
  Object.assign(S.PERFIL, E.config.perfil);
  E.sesionActiva = E.sesiones.find((s) => !s.fin) || null;
  E.fase = L.faseActual(E.config.primeraSesion);
}

export async function arrancarDatos() {
  await db.abrir();
  // La versión anterior guardaba aquí un token de GitHub. Ya no se usa: fuera.
  if (await db.obtener('meta', 'github')) await db.borrar('meta', 'github');
  await sembrar();
  const metidos = await aplicarRegistros();
  await recargar();
  E.ultimaCopia = await db.leerMeta('ultimaCopia');
  await cerrarOlvidadas();
  E.listo = true;
  avisar();
  if (metidos.length) toast(metidos.join(' · '), 4000);
}

// Mete una sola vez los entrenos que se pasaron a mano (ver datos/registros.js).
// Si ese día ya había otro entreno, era el guardado mal: se sustituye.
async function aplicarRegistros() {
  const hechos = await db.leerMeta('registrosAplicados', []);
  const metidos = [];
  for (const r of REGISTROS_PENDIENTES) {
    if (hechos.includes(r.id) || L.hoyISO() > r.hasta) continue;
    const mismoDia = (await db.todos('sesiones')).filter((s) => s.fecha === r.sesion.fecha && s.id !== r.sesion.id);
    for (const s of mismoDia) {
      for (const x of await db.porIndice('series', 'sesionId', s.id)) await db.borrar('series', x.id);
      await db.borrar('sesiones', s.id);
    }
    await db.guardar('sesiones', r.sesion);
    await db.guardarVarios('series', r.series);
    const cfg = await db.leerMeta('config', {});
    if (!cfg.primeraSesion || cfg.primeraSesion > r.sesion.fecha) await db.escribirMeta('config', { ...cfg, primeraSesion: r.sesion.fecha });
    hechos.push(r.id);
    await db.escribirMeta('registrosAplicados', hechos);
    metidos.push(`Tu entreno del ${L.fechaLarga(r.sesion.fecha)} ya está registrado`);
  }
  for (const c of CAMBIOS_PENDIENTES) {
    if (hechos.includes(c.id)) continue;
    if (c.receta) {
      const r = await db.obtener('recetas', idDe(c.receta));
      if (r) await db.guardar('recetas', { ...r, macrosRacion: c.macrosRacion });
    }
    hechos.push(c.id);
    await db.escribirMeta('registrosAplicados', hechos);
  }
  return metidos;
}

// Un entreno que se quedó abierto (se te olvidó pulsar «Terminar») se guarda solo
// tras 3 horas sin marcar ninguna serie. Si no tenía ninguna serie, se descarta:
// abrirlo sin querer no debe contar como día de gimnasio.
const TRES_HORAS = 3 * 3600 * 1000;
export async function cerrarOlvidadas() {
  const s = E.sesionActiva;
  if (!s) return;
  const suyas = E.series.filter((r) => r.sesionId === s.id);
  const ultimaVez = Math.max(new Date(s.inicio).getTime() || 0, ...suyas.map((r) => r.ts || 0));
  if (Date.now() - ultimaVez < TRES_HORAS) return;
  if (suyas.length === 0) await db.borrar('sesiones', s.id);
  else await db.guardar('sesiones', { ...s, fin: new Date(ultimaVez + 60000).toISOString(), cerradaSola: true });
  await recargar();
  avisar();
  if (suyas.length) toast('Tu último entreno se quedó abierto: se ha guardado solo.', 3500);
}

// Al volver a la app (por ejemplo, al día siguiente) se comprueba otra vez.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && E.listo) cerrarOlvidadas();
});

export async function guardarConfig(cambios) {
  E.config = { ...E.config, ...cambios };
  const { objetivos, perfil, ...resto } = E.config;
  await db.escribirMeta('config', { objetivos, perfil, ...resto });
  avisar();
}

// ---------------------------------------------------------------- consultas de entreno

// Solo series de trabajo: las de aproximación no cuentan para récords, progresión ni historial.
export const seriesDe = (ejercicioId) => E.series.filter((s) => s.ejercicioId === ejercicioId && !s.calent);
export const seriesDeSesion = (sesionId) => E.series.filter((s) => s.sesionId === sesionId)
  .sort((a, b) => (a.indice ?? 0) - (b.indice ?? 0));
export const sesionesTerminadas = () => E.sesiones.filter((s) => s.fin);
// Los entrenos libres no cuentan para la rotación A → B → C → D.
export const siguientePlan = () => L.siguienteSesion(
  sesionesTerminadas().filter((s) => S.ORDEN_SESIONES.includes(s.plan)), S.ORDEN_SESIONES);

// Máximo a una repetición, calculado (fórmula de Epley). Solo con series de 1 a 12 reps.
export const unaRM = (peso, reps) => (peso > 0 && reps > 0 && reps <= 12 ? peso * (1 + reps / 30) : 0);

export function records(ejercicioId) {
  // Los entrenos apuntados después con pesos estándar no cuentan para récords.
  const s = seriesDe(ejercicioId).filter((x) => x.peso > 0 && x.reps > 0 && !x.aprox);
  if (!s.length) return null;
  const mejorPeso = s.reduce((m, x) => (x.peso > m.peso || (x.peso === m.peso && x.reps > m.reps) ? x : m));
  const rm = Math.max(...s.map((x) => unaRM(x.peso, x.reps)));
  const volumen = Math.max(...L.agruparPorSesion(s).map((g) => g.series.reduce((t, x) => t + x.peso * x.reps, 0)));
  return { mejorPeso, rm, volumen };
}
