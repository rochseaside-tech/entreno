// dia.js — todo lo que necesita una fecha concreta: qué has comido, si has
// entrenado, cuál es el objetivo de ese día y qué avisos tocan.

import * as db from './db.js';
import * as L from './logica.js';
import { E as estado } from './estado.js';

export async function cargarDia(fecha) {
  const [comidas, sesiones, peso, pasos, semana] = await Promise.all([
    db.porIndice('comidas', 'fecha', fecha),
    db.porIndice('sesiones', 'fecha', fecha),
    db.obtener('peso', fecha),
    db.obtener('pasos', fecha),
    db.obtener('semanas', L.semanaISO(fecha)),
  ]);

  const huboGym = sesiones.some((s) => s.fin);
  const ajustePorDia = semana?.ajustePorDia && fecha >= (semana.desde || fecha) ? semana.ajustePorDia : 0;
  const objetivo = L.objetivoDia({ huboGym, ajustePorDia });
  const totales = L.sumarMacros(comidas);

  const ahora = new Date();
  const esHoy = fecha === L.hoyISO();
  const avisos = L.avisosDia({
    totales, objetivo,
    hora: esHoy ? ahora.getHours() : 23,
    diaCerrado: !esHoy && comidas.length > 0,
  });

  comidas.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  return { fecha, comidas, sesiones, huboGym, peso: peso?.kg ?? null, pasos: pasos?.pasos ?? null,
    objetivo, totales, avisos, esHoy, ajusteSemanal: semana || null };
}

export function comidasPorToma(comidas) {
  const mapa = new Map();
  for (const c of comidas) {
    if (!mapa.has(c.toma)) mapa.set(c.toma, []);
    mapa.get(c.toma).push(c);
  }
  return mapa;
}

// Guarda una entrada de comida y aprende de ella (frecuencia y cantidad habitual).
export async function registrarComida({ fecha, toma, nombre, cantidad, medida, macros, origen = 'alimento', refId = null, nota = null }) {
  const fila = {
    id: db.nuevoId('c'),
    fecha, toma, nombre, cantidad, medida, origen, refId, nota,
    ...L.CERO(), ...macros,
    ts: Date.now(),
  };
  await db.guardar('comidas', fila);
  await L.registrarUso(origen, nombre, toma, cantidad);
  const u = await db.obtener('uso', `${origen}|${nombre}`);
  if (u) estado.uso.set(u.clave, u);
  return fila;
}

export async function borrarComida(id) {
  await db.borrar('comidas', id);
}

// Los atajos de la pantalla de comer: lo que más registras en esa toma, arriba.
export function atajosDeToma(toma, limite = 6) {
  const usos = [...estado.uso.values()]
    .filter((u) => u.tipo === 'alimento' || u.tipo === 'receta')
    .map((u) => ({ ...u, punt: (u.porToma?.[toma] || 0) * 3 + u.veces }))
    .filter((u) => u.punt > 0)
    .sort((a, b) => b.punt - a.punt)
    .slice(0, limite);
  return usos;
}
