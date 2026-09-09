// logica.js — todas las reglas del plan en un solo sitio: fechas, progresión,
// objetivos de nutrición, medias y aprendizaje de hábitos. Sin tocar la interfaz.

import { OBJETIVOS, PERFIL } from './seed.js';
import * as db from './db.js';

// ---------------------------------------------------------------- fechas

export const hoyISO = () => fechaISO(new Date());

export function fechaISO(d) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

export function desdeISO(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function sumarDias(iso, n) {
  const d = desdeISO(iso);
  d.setDate(d.getDate() + n);
  return fechaISO(d);
}

export function diasEntre(isoA, isoB) {
  return Math.round((desdeISO(isoB) - desdeISO(isoA)) / 86400000);
}

// Semana ISO (lunes a domingo), formato 'AAAA-Www'
export function semanaISO(iso) {
  const d = desdeISO(iso);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7)); // jueves de esa semana
  const anio = d.getFullYear();
  const enero1 = new Date(anio, 0, 1);
  const num = Math.ceil(((d - enero1) / 86400000 + 1) / 7);
  return `${anio}-W${String(num).padStart(2, '0')}`;
}

export function lunesDe(iso) {
  const d = desdeISO(iso);
  const dow = d.getDay() || 7; // domingo = 7
  return sumarDias(iso, 1 - dow);
}

export function diasDeSemana(iso) {
  const lun = lunesDe(iso);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lun, i));
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function fechaCorta(iso) {
  const d = desdeISO(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function fechaLarga(iso) {
  const d = desdeISO(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function mmss(segundos) {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- fase del bloque

// Reacondicionamiento: primeras 2 semanas desde la primera sesión, RIR 3-4 en todo.
// Descarga: cada 8 semanas, mitad de series, mismo peso, RIR 3-4.
export function faseActual(primeraSesion, iso = hoyISO()) {
  if (!primeraSesion) {
    return { semana: 1, reacondicionamiento: true, descarga: false, rirForzado: '3-4',
      motivo: 'Primeras dos semanas: RIR 3-4 en todo, para volver sin pasarte.' };
  }
  const dias = diasEntre(primeraSesion, iso);
  const semana = Math.floor(dias / 7) + 1;
  const reacondicionamiento = dias < 14;
  const descarga = semana > 0 && semana % 8 === 0;
  let motivo = null;
  if (reacondicionamiento) motivo = 'Reacondicionamiento (2 primeras semanas): RIR 3-4 en todo, no el de la tabla.';
  else if (descarga) motivo = `Semana ${semana}: toca descarga. Mitad de series, mismo peso, RIR 3-4.`;
  return { semana, dias, reacondicionamiento, descarga,
    rirForzado: reacondicionamiento || descarga ? '3-4' : null, motivo };
}

export function seriesObjetivo(seriesPlan, fase) {
  return fase.descarga ? Math.max(1, Math.round(seriesPlan / 2)) : seriesPlan;
}

export function rirObjetivo(ejercicio, fase) {
  return fase.rirForzado || ejercicio.rir;
}

// ---------------------------------------------------------------- progresión

// Agrupa las series de un ejercicio por sesión, de la más antigua a la más reciente.
export function agruparPorSesion(series) {
  const mapa = new Map();
  for (const s of series) {
    if (!mapa.has(s.sesionId)) mapa.set(s.sesionId, { sesionId: s.sesionId, fecha: s.fecha, series: [] });
    mapa.get(s.sesionId).series.push(s);
  }
  const grupos = [...mapa.values()];
  for (const g of grupos) {
    g.series.sort((a, b) => (a.indice ?? 0) - (b.indice ?? 0));
    g.pesoMax = Math.max(...g.series.map((s) => s.peso || 0));
    g.repsTotal = g.series.reduce((t, s) => t + (s.reps || 0), 0);
  }
  grupos.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  return grupos;
}

// Devuelve qué hiciste la última vez y si toca subir o desatascar.
export function analizarEjercicio(ejercicio, series, fase) {
  const grupos = agruparPorSesion(series);
  const ultima = grupos[grupos.length - 1] || null;

  let pesoSugerido = ultima ? ultima.pesoMax : (ejercicio.pesoInicial ?? null);
  let aviso = null;

  if (ultima && !fase.descarga && !fase.reacondicionamiento) {
    // Progresión doble: todas las series al tope del rango con RIR >= 1 -> sube.
    const todasAlTope = ultima.series.length > 0 && ultima.series.every(
      (s) => (s.reps || 0) >= ejercicio.repMax && (s.rir ?? -1) >= 1);
    if (todasAlTope) {
      pesoSugerido = redondearCarga(ultima.pesoMax + ejercicio.incremento, ejercicio.incremento);
      aviso = { tipo: 'subir',
        texto: `Toca subir a ${formatoPeso(pesoSugerido)}. La última vez hiciste todas las series a ${ejercicio.repMax} repeticiones con RIR 1 o más.` };
    }
  }

  if (!aviso && grupos.length >= 3) {
    // Estancamiento: 3 sesiones seguidas con el mismo peso y las mismas repeticiones.
    const [a, b, c] = grupos.slice(-3);
    if (a.pesoMax === b.pesoMax && b.pesoMax === c.pesoMax &&
        a.repsTotal === b.repsTotal && b.repsTotal === c.repsTotal && c.pesoMax > 0) {
      const bajado = redondearCarga(c.pesoMax * 0.9, ejercicio.incremento);
      aviso = { tipo: 'estancado',
        texto: `Tres sesiones clavado en ${formatoPeso(c.pesoMax)}. Baja a ${formatoPeso(bajado)} y vuelve a subir desde ahí.` };
      pesoSugerido = bajado;
    }
  }

  return {
    ultima,
    sesionesRegistradas: grupos.length,
    pesoSugerido,
    aviso,
    grupos,
  };
}

// Redondea al múltiplo del incremento del ejercicio (las máquinas no tienen decimales raros).
export function redondearCarga(peso, incremento) {
  if (!incremento) return Math.round(peso * 10) / 10;
  return Math.round(peso / incremento) * incremento;
}

export function formatoPeso(kg) {
  if (kg === null || kg === undefined) return '—';
  if (kg === 0) return 'peso corporal';
  return `${Number(kg.toFixed(2))} kg`;
}

export function resumenUltimaVez(ultima) {
  if (!ultima) return null;
  const reps = ultima.series.map((s) => s.reps).join(', ');
  const rirs = ultima.series.map((s) => (s.rir ?? '—')).join(', ');
  return { fecha: ultima.fecha, peso: ultima.pesoMax, reps, rirs,
    texto: `${formatoPeso(ultima.pesoMax)} × ${reps} · RIR ${rirs}` };
}

// Progresión histórica de un ejercicio: peso máximo por sesión y mejora desde el inicio.
export function progresionEjercicio(series) {
  const grupos = agruparPorSesion(series);
  const puntos = grupos.map((g) => ({ fecha: g.fecha, peso: g.pesoMax, reps: g.repsTotal }));
  if (puntos.length < 2) return { puntos, mejora: null };
  const inicio = puntos[0].peso;
  const fin = puntos[puntos.length - 1].peso;
  const mejora = inicio > 0 ? ((fin - inicio) / inicio) * 100 : null;
  return { puntos, mejora, inicio, fin };
}

// ---------------------------------------------------------------- rotación A-B-C-D

export function siguienteSesion(historial, orden) {
  if (!historial.length) return orden[0];
  const ultima = historial[historial.length - 1].plan;
  const i = orden.indexOf(ultima);
  return orden[(i + 1) % orden.length];
}

// ---------------------------------------------------------------- nutrición

export function objetivoDia({ huboGym, ajustePorDia = 0 }) {
  const base = huboGym ? OBJETIVOS.kcalEntreno : OBJETIVOS.kcalDescanso;
  const kcal = Math.max(OBJETIVOS.sueloKcal, Math.round(base + ajustePorDia));
  const prot = OBJETIVOS.proteina;
  const grasa = OBJETIVOS.grasa;
  const hc = Math.max(0, Math.round((kcal - prot * 4 - grasa * 9) / 4));
  return { kcal, prot, grasa, hc, base, ajuste: kcal - base };
}

export const CAMPOS_MACRO = ['kcal', 'prot', 'grasa', 'hc', 'fibra', 'sal'];
export const CERO = () => ({ kcal: 0, prot: 0, grasa: 0, hc: 0, fibra: 0, sal: 0 });

export function sumarMacros(lista) {
  return lista.reduce((t, c) => {
    for (const k of CAMPOS_MACRO) t[k] += c[k] || 0;
    return t;
  }, CERO());
}

export function escalarMacros(m, factor) {
  const r = CERO();
  for (const k of CAMPOS_MACRO) r[k] = (m[k] || 0) * factor;
  return r;
}

// Macros de una cantidad de un alimento. Para medida 'ud', cantidad = nº de unidades.
export function macrosDe(alimento, cantidad) {
  return escalarMacros(alimento, alimento.medida === 'ud' ? cantidad : cantidad / 100);
}

// Total de la receta entera (para la lista de la compra y el batch cooking).
export function macrosRecetaTotal(receta, alimentosPorNombre) {
  return sumarMacros((receta.ingredientes || []).map((ing) => {
    const al = alimentosPorNombre.get(ing.nombre);
    return al ? macrosDe(al, ing.cantidad ?? ing.gramos ?? 0) : CERO();
  }));
}

export function macrosReceta(receta, alimentosPorNombre) {
  if (receta.macrosRacion) return { ...CERO(), ...receta.macrosRacion, calculado: false };
  const total = macrosRecetaTotal(receta, alimentosPorNombre);
  const r = Math.max(1, receta.raciones || 1);
  return { ...escalarMacros(total, 1 / r), calculado: true };
}

// Rendimiento de proteína: cuántas kcal cuesta cada gramo de proteína.
// Cuanto más bajo, mejor rinde en déficit.
export function rendimientoProteina(alimentos, minProt = 5) {
  return alimentos
    .filter((a) => a.prot >= minProt)
    .map((a) => ({ nombre: a.nombre, cat: a.cat, ratio: a.kcal / a.prot }))
    .sort((x, y) => x.ratio - y.ratio);
}

// Avisos del día. Neutros: dan el dato, no juzgan.
export function avisosDia({ totales, objetivo, hora, diaCerrado }) {
  const avisos = [];
  const faltaProt = objetivo.prot - totales.prot;

  if (hora >= OBJETIVOS.horaAvisoProteina && !diaCerrado &&
      totales.prot < objetivo.prot * OBJETIVOS.avisoProteinaTarde) {
    avisos.push({ tipo: 'aviso',
      texto: `Son las ${hora}:00 y llevas ${Math.round(totales.prot)} g de proteína, por debajo del 60% de los ${objetivo.prot} g. Quedan ${Math.round(faltaProt)} g.` });
  }
  if (diaCerrado && totales.grasa < OBJETIVOS.grasaMinima) {
    avisos.push({ tipo: 'aviso', texto: `Día cerrado con ${Math.round(totales.grasa)} g de grasa, por debajo de ${OBJETIVOS.grasaMinima} g.` });
  }
  if (diaCerrado && totales.kcal < OBJETIVOS.sueloKcal) {
    avisos.push({ tipo: 'aviso', texto: `Día cerrado en ${Math.round(totales.kcal)} kcal, por debajo del suelo de ${OBJETIVOS.sueloKcal} kcal.` });
  }
  return avisos;
}

// ---------------------------------------------------------------- semana

export function resumenSemana({ dias, comidasPorDia, sesionesPorDia, pesos, ajustePorDia = 0 }) {
  const hoy = hoyISO();
  const filas = dias.map((f) => {
    const comidas = comidasPorDia.get(f) || [];
    const huboGym = (sesionesPorDia.get(f) || []).length > 0;
    const obj = objetivoDia({ huboGym, ajustePorDia: f >= hoy ? ajustePorDia : 0 });
    const tot = sumarMacros(comidas);
    return { fecha: f, huboGym, objetivo: obj, total: tot, registrado: comidas.length > 0, pasado: f < hoy, hoy: f === hoy };
  });

  const conDatos = filas.filter((f) => f.registrado);
  const transcurridos = filas.filter((f) => f.fecha <= hoy);
  const objetivoAcum = transcurridos.reduce((t, f) => t + f.objetivo.base, 0);
  const consumidoAcum = transcurridos.reduce((t, f) => t + f.total.kcal, 0);
  const restantes = filas.filter((f) => f.fecha > hoy).length;

  const pesosSemana = dias.map((f) => pesos.get(f)).filter((p) => p !== undefined);

  return {
    filas,
    mediaKcal: conDatos.length ? consumidoAcum / conDatos.length : 0,
    mediaProt: conDatos.length ? conDatos.reduce((t, f) => t + f.total.prot, 0) / conDatos.length : 0,
    diasRegistrados: conDatos.length,
    sesiones: filas.filter((f) => f.huboGym).length,
    desvio: Math.round(consumidoAcum - objetivoAcum), // + = por encima
    diasRestantes: restantes,
    pesoInicio: pesosSemana[0] ?? null,
    pesoFin: pesosSemana[pesosSemana.length - 1] ?? null,
  };
}

// Cuánto habría que restar cada día que queda para cuadrar la semana, respetando el suelo.
export function repartoSugerido(desvio, diasRestantes) {
  if (diasRestantes <= 0 || desvio === 0) return null;
  const porDia = -desvio / diasRestantes;
  const tope = OBJETIVOS.sueloKcal - OBJETIVOS.kcalDescanso; // lo máximo que se puede bajar
  const aplicado = Math.max(tope, Math.round(porDia));
  return { porDia: aplicado, recortado: aplicado > porDia, ideal: Math.round(porDia) };
}

// ---------------------------------------------------------------- peso corporal

// Media móvil de 7 días: es el dato que importa, no el peso de un día suelto.
export function mediaMovil(entradas, ventana = 7) {
  const orden = [...entradas].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  return orden.map((e, i) => {
    const desde = sumarDias(e.fecha, -(ventana - 1));
    const trozo = orden.slice(0, i + 1).filter((x) => x.fecha >= desde);
    const media = trozo.reduce((t, x) => t + x.kg, 0) / trozo.length;
    return { fecha: e.fecha, kg: e.kg, media, n: trozo.length };
  });
}

// Ritmo en kg/semana a partir de la recta que mejor encaja en la media móvil.
export function ritmoSemanal(serieMedia, dias = 14) {
  if (serieMedia.length < 4) return null;
  const fin = serieMedia[serieMedia.length - 1].fecha;
  const desde = sumarDias(fin, -(dias - 1));
  const trozo = serieMedia.filter((p) => p.fecha >= desde);
  if (trozo.length < 4) return null;
  const x = trozo.map((p) => diasEntre(trozo[0].fecha, p.fecha));
  const y = trozo.map((p) => p.media);
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); den += (x[i] - mx) ** 2; }
  if (den === 0) return null;
  return (num / den) * 7;
}

export function valoracionRitmo(kgSemana) {
  if (kgSemana === null) return { texto: 'Faltan días para calcular el ritmo.', estado: 'neutro' };
  const p = -kgSemana; // pérdida positiva
  const t = `${p >= 0 ? '−' : '+'}${Math.abs(p).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg/semana`;
  if (p < 0.15) return { texto: `${t}. Por debajo del objetivo de ${PERFIL.ritmoMin}-${PERFIL.ritmoMax}.`, estado: 'bajo' };
  if (p > PERFIL.ritmoMax + 0.25) return { texto: `${t}. Más rápido de lo previsto; vigila la proteína y la fuerza.`, estado: 'alto' };
  if (p >= PERFIL.ritmoMin && p <= PERFIL.ritmoMax) return { texto: `${t}. Dentro del objetivo.`, estado: 'ok' };
  return { texto: `${t}. Cerca del objetivo de ${PERFIL.ritmoMin}-${PERFIL.ritmoMax}.`, estado: 'neutro' };
}

// ---------------------------------------------------------------- aprendizaje

// La app no tiene IA: aprende contando. Cada registro suma a un contador por
// alimento y toma, y guarda la última cantidad usada. Con eso ordena los atajos.
export async function registrarUso(tipo, nombre, toma, cantidad) {
  const clave = `${tipo}|${nombre}`;
  const fila = (await db.obtener('uso', clave)) || { clave, tipo, nombre, veces: 0, porToma: {}, ultimaCantidad: cantidad };
  fila.veces += 1;
  fila.ultimaFecha = hoyISO();
  if (cantidad) fila.ultimaCantidad = cantidad;
  if (toma) fila.porToma[toma] = (fila.porToma[toma] || 0) + 1;
  await db.guardar('uso', fila);
  return fila;
}

// Ordena por: veces en esta toma (pesa el triple) + veces en total + recencia.
export function ordenarPorHabito(items, uso, toma, clave = 'nombre', tipo = 'alimento') {
  const punt = (n) => {
    const u = uso.get(`${tipo}|${n}`);
    if (!u) return 0;
    const enToma = toma ? (u.porToma[toma] || 0) : 0;
    const reciente = u.ultimaFecha ? Math.max(0, 14 - Math.abs(diasEntre(u.ultimaFecha, hoyISO()))) / 14 : 0;
    return enToma * 3 + u.veces + reciente;
  };
  return [...items].sort((a, b) => punt(b[clave]) - punt(a[clave]));
}

export function cantidadHabitual(uso, nombre, porDefecto, tipo = 'alimento') {
  const u = uso.get(`${tipo}|${nombre}`);
  return u?.ultimaCantidad ?? porDefecto;
}
