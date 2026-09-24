// estado.js — el estado compartido de la app y la carga desde IndexedDB.
// Las pantallas leen de E y llaman a avisar() cuando cambian algo: todas se repintan.

import { useState, useEffect } from './vendor/preact-htm.js';
import * as db from './db.js';
import * as S from './seed.js';
import * as L from './logica.js';
import { CATALOGO } from './datos/catalogo-ejercicios.js';
import { ALIMENTOS_BASE } from './datos/alimentos-base.js';
import * as regRocio from './datos/registros.js';
import * as regAida from './datos/registros-aida.js';
import { QUIEN } from './perfiles.js';

// Cada una tiene lo suyo: entrenos y comidas que se pasaron a mano.
const { REGISTROS_PENDIENTES, CAMBIOS_PENDIENTES } = QUIEN.id === 'aida' ? regAida : regRocio;

// Sube este número cuando añadas datos nuevos a seed.js: la app los incorpora
// sin tocar lo que tú hayas editado.
const VERSION_SEMILLA = 10; // 7: melocotón light en lata (10 sep) · 8: carne picada 11 %, tahini del bote, sirope de agave (12 sep) · 9: cacahuete desgrasado en polvo y yogur natural 0,0 (16 sep) · 10: conejo, babilla, boquerones en vinagre, harina, ajo y conejo al ajillo (18 sep)

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
  // Los que borraste tú no vuelven aunque sigan en la semilla.
  const quitados = new Set(await db.leerMeta('alimentosQuitados', []));
  await meter('alimentos', S.ALIMENTOS.filter((a) => !quitados.has(idDe(a.nombre))), (a) => idDe(a.nombre));
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
  const lista = CATALOGO.map((c) => {
    const g = porId.get(c.id);
    const ajustes = g ? Object.fromEntries(AJUSTABLES.filter((k) => g[k] !== undefined).map((k) => [k, g[k]])) : {};
    return normalizar({ pesoInicial: S.PESOS_INICIALES[c.id] ?? null, ...c, ...ajustes });
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
  const anterior = S.RUTINA_ANTERIOR[s.plan];
  return {
    ...s,
    inicio: aISO(s.inicio), fin: aISO(s.fin),
    nombre: s.nombre ?? plan?.nombre ?? anterior?.nombre ?? 'Entreno',
    ejercicios: s.ejercicios ?? (plan?.ejercicios.map((x) => ({ id: x.id, series: x.series }))
      || anterior?.ejercicios.map((id) => ({ id, series: 3 })) || []),
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
  const [ejercicios, alimentos, recetas, despensa, uso, sesiones, series, habituales, fotos, rutina, config, quitados] = await Promise.all([
    db.todos('ejercicios'), db.todos('alimentos'), db.todos('recetas'), db.todos('despensa'),
    db.todos('uso'), db.todos('sesiones'), db.todos('series'), db.todos('habituales'), db.todos('fotos'),
    db.leerMeta('rutina', S.RUTINA), db.leerMeta('config', {}), db.leerMeta('alimentosQuitados', []),
  ]);
  const fuera = new Set(quitados);

  E.ejercicios = mezclarEjercicios(ejercicios);
  E.ejercicioPorId = new Map(E.ejercicios.map((e) => [e.id, e]));
  for (const f of fotos) {
    const ej = E.ejercicioPorId.get(f.id);
    if (ej) ej.fotoPropia = [f.f0, f.f1].filter(Boolean);
  }

  const es = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
  E.misAlimentos = alimentos.filter((a) => !fuera.has(a.id)).sort(es);
  const base = ALIMENTOS_BASE.map((a) => ({ ...a, id: 'b-' + idDe(a.nombre), base: true })).filter((a) => !fuera.has(a.id));
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
    if (r.sesion) {
      const mismoDia = (await db.todos('sesiones')).filter((s) => s.fecha === r.sesion.fecha && s.id !== r.sesion.id);
      for (const s of mismoDia) {
        for (const x of await db.porIndice('series', 'sesionId', s.id)) await db.borrar('series', x.id);
        await db.borrar('sesiones', s.id);
      }
      await db.guardar('sesiones', r.sesion);
      await db.guardarVarios('series', r.series);
      const cfg = await db.leerMeta('config', {});
      if (!cfg.primeraSesion || cfg.primeraSesion > r.sesion.fecha) await db.escribirMeta('config', { ...cfg, primeraSesion: r.sesion.fecha });
      metidos.push(`Tu entreno del ${L.fechaLarga(r.sesion.fecha)} ya está registrado`);
    }
    if (r.comidas) {
      // Si mientras tanto ya apuntaste algo en esa toma ese día, no se añade: evita duplicados.
      const propios = new Set(r.comidas.map((c) => c.id));
      const yaHay = (await db.porIndice('comidas', 'fecha', r.fecha)).some((c) => c.toma === r.toma && !propios.has(c.id));
      if (!yaHay) {
        await db.guardarVarios('comidas', r.comidas);
        metidos.push(`Tu ${r.nombreToma} del ${L.fechaLarga(r.fecha)} ya está apuntada`);
      }
    }
    if (r.medidas) {
      // Si ese día ya habías apuntado medidas tú, las tuyas mandan: solo se completan.
      const { fecha, ...valores } = r.medidas;
      const ya = (await db.obtener('medidas', fecha)) || { fecha };
      await db.guardar('medidas', { ...valores, ...ya });
      metidos.push(`Tus medidas del ${L.fechaLarga(fecha)} ya están apuntadas`);
    }
    if (r.config) {
      const cfg = await db.leerMeta('config', {});
      await db.escribirMeta('config', { ...cfg, ...r.config });
    }
    if (r.diaGym) {
      const g = await db.leerMeta('diasGym', []);
      if (!g.includes(r.fecha)) await db.escribirMeta('diasGym', [...g, r.fecha]);
    }
    hechos.push(r.id);
    await db.escribirMeta('registrosAplicados', hechos);
  }
  for (const c of CAMBIOS_PENDIENTES) {
    if (hechos.includes(c.id)) continue;
    if (c.rutina) {
      // Rutina nueva: sustituye la guardada y quita lo que hubieras cambiado a mano en sus
      // ejercicios (reps, RIR, descanso, incremento, peso de partida) para que mande la
      // tabla nueva. Tus notas de cada ejercicio se quedan.
      await db.escribirMeta('rutina', S.RUTINA);
      const ids = new Set(Object.values(S.RUTINA).flatMap((d) => d.ejercicios.map((x) => x.id)));
      for (const id of ids) {
        const g = await db.obtener('ejercicios', id);
        if (!g || g.propio) continue;
        const resto = Object.fromEntries(Object.entries(g).filter(([k]) => k === 'nota' || !AJUSTABLES.includes(k)));
        if (Object.keys(resto).length > 1) await db.guardar('ejercicios', resto);
        else await db.borrar('ejercicios', id);
      }
    }
    if (c.receta) {
      const r = await db.obtener('recetas', idDe(c.receta));
      if (r) await db.guardar('recetas', { ...r, macrosRacion: c.macrosRacion });
    }
    if (c.alimento) {
      const a = await db.obtener('alimentos', idDe(c.alimento));
      if (a) await db.guardar('alimentos', { ...a, ...c.campos });
    }
    if (c.sesionRutina) {
      // Cambia una sola sesión de la rutina; las otras se quedan como las tenga ella.
      const r = await db.leerMeta('rutina', S.RUTINA);
      await db.escribirMeta('rutina', { ...r, [c.sesionRutina]: S.RUTINA[c.sesionRutina] });
    }
    if (c.borrarAlimentos) {
      // Borra de su biblioteca los que casen con el patrón (también los que creó ella a
      // mano) y los apunta como quitados, para que la tabla general no los vuelva a enseñar.
      const patron = new RegExp(c.borrarAlimentos, 'i');
      const quitados = new Set(await db.leerMeta('alimentosQuitados', []));
      for (const a of await db.todos('alimentos')) {
        if (patron.test(a.nombre)) { await db.borrar('alimentos', a.id); quitados.add(a.id); }
      }
      for (const b of ALIMENTOS_BASE) if (patron.test(b.nombre)) quitados.add('b-' + idDe(b.nombre));
      await db.escribirMeta('alimentosQuitados', [...quitados]);
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
// Rotación Torso 1 → Pierna 1 → Torso 2 → Pierna 2. Los entrenos libres no cuentan; los de
// la rutina anterior (A-D) cuentan como la sesión nueva que los sustituye.
export const siguientePlan = () => L.siguienteSesion(sesionesTerminadas(), S.ORDEN_SESIONES, S.PLAN_ANTERIOR);

// ---------------------------------------------------------------- rutina

// Cómo se llama una sesión: las de la rutina anterior llevan su letra delante.
export function tituloSesion(s) {
  if (s.plan === 'L') return 'Entreno libre';
  return S.PLAN_ANTERIOR[s.plan] ? `Sesión ${s.plan} · ${s.nombre}` : s.nombre;
}
export function tituloCorto(s) {
  if (s.plan === 'L') return 'Entreno libre';
  return S.PLAN_ANTERIOR[s.plan] ? `Sesión ${s.plan}` : s.nombre;
}

// Lo que un ejercicio lleva distinto en una sesión concreta (el hip thrust de Pierna 2).
// Va en la línea de la rutina y se copia a la sesión al empezarla.
const CAMPOS_SESION = ['repMin', 'repMax', 'rir', 'descanso', 'incremento', 'pesoInicial'];
export const ajustesDe = (item) => Object.fromEntries(CAMPOS_SESION.filter((k) => item?.[k] !== undefined).map((k) => [k, item[k]]));
export const conAjustes = (ej, item) => (ej ? { ...ej, ...ajustesDe(item) } : ej);

const planNuevo = (plan) => S.PLAN_ANTERIOR[plan] || plan;
const planDeSesion = (sesionId) => E.sesiones.find((x) => x.id === sesionId)?.plan;

// Las series anteriores que guían la progresión de un ejercicio en una sesión.
// - Si el ejercicio está en dos sesiones de la rutina con rangos distintos, cada sesión
//   lleva su propia progresión: si no, las 15 reps de una harían subir el peso en la otra.
// - arranque: aún no lo has hecho en ninguna sesión de la rutina nueva, así que manda
//   el peso de arranque de la tabla y no lo que hacías con la anterior.
// - variante: con agarres intercambiables (tríceps en polea), cada uno lleva su propia
//   progresión; si aún no has hecho ninguna serie con este, se propone el peso del
//   agarre que usaste la última vez, para no arrancar a ciegas.
export function previasPara(ejercicioId, sesion, variante = null) {
  const todas = seriesDe(ejercicioId).filter((s) => s.sesionId !== sesion.id && !s.aprox);
  const base = E.ejercicioPorId.get(ejercicioId);
  const plan = planNuevo(sesion.plan);
  const porAgarre = (lista) => (base?.variantes ? lista.filter((s) => (s.variante ?? null) === variante) : lista);
  // Referencia al estrenar un agarre: lo último que levantaste con otro, aunque sea de
  // hoy mismo (cambiar de barra a mitad de entreno es justo cuando más falta hace).
  const otroAgarre = () => {
    if (!base?.variantes) return null;
    const otras = seriesDe(ejercicioId).filter((s) => !s.aprox && s.peso > 0 && s.variante && s.variante !== variante);
    const ultima = otras.sort((a, b) => (a.ts || 0) - (b.ts || 0)).pop();
    return ultima ? { variante: ultima.variante, peso: ultima.peso } : null;
  };
  if (!S.ORDEN_SESIONES.includes(plan)) {
    const previas = porAgarre(todas);
    return { previas, arranque: false, otroAgarre: previas.length ? null : otroAgarre() };
  }
  const rangos = new Set(Object.values(E.rutina).flatMap((d) => d.ejercicios
    .filter((x) => x.id === ejercicioId).map((x) => { const e = conAjustes(base, x); return `${e?.repMin}-${e?.repMax}`; })));
  const previas = porAgarre(rangos.size > 1 ? todas.filter((s) => planNuevo(planDeSesion(s.sesionId)) === plan) : todas);
  // Una línea de la rutina con `desde` vuelve a arrancar con su peso: lo de antes no cuenta.
  const desde = E.rutina[plan]?.ejercicios.find((x) => x.id === ejercicioId)?.desde || null;
  const arranque = !previas.some((s) => S.ORDEN_SESIONES.includes(planDeSesion(s.sesionId)) && (!desde || s.fecha >= desde));
  return { previas, arranque, otroAgarre: arranque ? otroAgarre() : null };
}

// El agarre que usaste la última vez en este ejercicio.
export function ultimaVariante(ejercicioId) {
  const con = seriesDe(ejercicioId).filter((s) => s.variante);
  return con.sort((a, b) => (a.ts || 0) - (b.ts || 0)).pop()?.variante ?? null;
}

// Máximo a una repetición, calculado (fórmula de Epley). Solo con series de 1 a 12 reps.
export const unaRM = (peso, reps) => (peso > 0 && reps > 0 && reps <= 12 ? peso * (1 + reps / 30) : 0);

// variante: con agarres intercambiables, los récords son de ese agarre (undefined = todos).
export function records(ejercicioId, variante) {
  // Los entrenos apuntados después con pesos estándar no cuentan para récords.
  const s = seriesDe(ejercicioId).filter((x) => x.peso > 0 && x.reps > 0 && !x.aprox
    && (variante === undefined || (x.variante ?? null) === variante));
  if (!s.length) return null;
  const mejorPeso = s.reduce((m, x) => (x.peso > m.peso || (x.peso === m.peso && x.reps > m.reps) ? x : m));
  const rm = Math.max(...s.map((x) => unaRM(x.peso, x.reps)));
  const volumen = Math.max(...L.agruparPorSesion(s).map((g) => g.series.reduce((t, x) => t + x.peso * x.reps, 0)));
  return { mejorPeso, rm, volumen };
}
