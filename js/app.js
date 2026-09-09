// app.js — arranque, estado compartido y navegación entre vistas.

import * as db from './db.js';
import * as S from './seed.js';
import * as L from './logica.js';
import { qs, qsa, vaciar, h, toast } from './ui.js';

// Sube este número cuando añadas datos nuevos a seed.js: la app los incorpora
// sin tocar lo que tú hayas editado.
const VERSION_SEMILLA = 4;

export const estado = {
  ejercicios: [],
  ejercicioPorId: new Map(),
  rutina: S.RUTINA,
  alimentos: [],
  alimentoPorNombre: new Map(),
  recetas: [],
  despensa: [],
  uso: new Map(),
  sesiones: [],
  sesionActiva: null,
  config: {},
};

export const idDe = (texto) => texto
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------------------------------------------------------------- siembra

async function sembrar() {
  const version = await db.leerMeta('versionSemilla', 0);
  if (version >= VERSION_SEMILLA) return;

  const meter = async (almacen, filas, hacerId) => {
    const existentes = new Set((await db.todos(almacen)).map((f) => f.id));
    const nuevas = filas
      .map((f) => ({ ...f, id: hacerId(f) }))
      .filter((f) => !existentes.has(f.id));
    if (nuevas.length) await db.guardarVarios(almacen, nuevas);
    return nuevas.length;
  };

  await meter('ejercicios', S.EJERCICIOS, (e) => e.id);
  await meter('alimentos', S.ALIMENTOS, (a) => idDe(a.nombre));
  await meter('recetas', S.RECETAS, (r) => idDe(r.nombre));
  await meter('despensa', S.DESPENSA, (d) => idDe(d.nombre));

  // Retirar lo que se ha sustituido por una versión mejor. No toca el diario:
  // cada comida registrada guarda sus propios macros.
  for (const [almacen, ids] of Object.entries(S.RETIRADOS || {})) {
    for (const id of ids) {
      if (await db.obtener(almacen, id)) await db.borrar(almacen, id);
    }
  }

  if (!(await db.leerMeta('rutina'))) await db.escribirMeta('rutina', S.RUTINA);
  if (!(await db.leerMeta('config'))) {
    await db.escribirMeta('config', {
      objetivos: { ...S.OBJETIVOS },
      perfil: { ...S.PERFIL },
      primeraSesion: null,
      sonidoDescanso: true,
      vibrar: true,
    });
  }
  await db.escribirMeta('versionSemilla', VERSION_SEMILLA);
}

// ---------------------------------------------------------------- carga

export async function recargar() {
  const [ejercicios, alimentos, recetas, despensa, uso, sesiones, rutina, config] = await Promise.all([
    db.todos('ejercicios'), db.todos('alimentos'), db.todos('recetas'), db.todos('despensa'),
    db.todos('uso'), db.todos('sesiones'), db.leerMeta('rutina', S.RUTINA), db.leerMeta('config', {}),
  ]);

  estado.ejercicios = ejercicios;
  estado.ejercicioPorId = new Map(ejercicios.map((e) => [e.id, e]));
  estado.alimentos = alimentos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  estado.alimentoPorNombre = new Map(alimentos.map((a) => [a.nombre, a]));
  estado.recetas = recetas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  estado.despensa = despensa.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  estado.uso = new Map(uso.map((u) => [u.clave, u]));
  estado.sesiones = sesiones.sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  estado.rutina = rutina;
  estado.config = { objetivos: { ...S.OBJETIVOS }, perfil: { ...S.PERFIL }, ...config };
  estado.sesionActiva = estado.sesiones.find((s) => !s.fin) || null;
  estado.fase = L.faseActual(estado.config.primeraSesion);
}

// ---------------------------------------------------------------- navegación

const RUTAS = {
  hoy: () => import('./vistas/hoy.js'),
  entreno: () => import('./vistas/entreno.js'),
  comer: () => import('./vistas/comer.js'),
  cocina: () => import('./vistas/cocina.js'),
  progreso: () => import('./vistas/progreso.js'),
  ajustes: () => import('./vistas/ajustes.js'),
};

let rutaActual = null;

export function ir(ruta, params = {}) {
  const qp = new URLSearchParams(params).toString();
  const destino = `#/${ruta}${qp ? '?' + qp : ''}`;
  // Ir a donde ya estás no dispara hashchange, así que hay que repintar a mano.
  // Si no, botones como "elegir sesión" desde la propia pantalla de Entreno
  // guardarían el cambio sin que se viera nada.
  if (location.hash === destino) pintar();
  else location.hash = destino;
}

export async function pintar() {
  const bruto = location.hash.replace(/^#\/?/, '') || 'hoy';
  const [nombre, cadena] = bruto.split('?');
  const ruta = RUTAS[nombre] ? nombre : 'hoy';
  const params = Object.fromEntries(new URLSearchParams(cadena || ''));

  qsa('nav.barra a').forEach((a) => a.classList.toggle('activo', a.dataset.ruta === ruta));

  const contenedor = qs('#vista');
  try {
    await recargar();
    const modulo = await RUTAS[ruta]();
    vaciar(contenedor);
    await modulo.pintar(contenedor, params);
    if (rutaActual !== ruta) contenedor.scrollIntoView({ block: 'start' });
    rutaActual = ruta;
  } catch (err) {
    console.error(err);
    vaciar(contenedor).append(
      h('div', { class: 'aviso alerta' }, 'Algo ha fallado al abrir esta pantalla.'),
      h('pre', { class: 'pequeno apagado', style: 'white-space:pre-wrap' }, String(err?.stack || err)));
  }
}

// Cabecera: cada vista puede poner su título y subtítulo.
export function cabecera(titulo, subtitulo = '') {
  qs('#titulo').textContent = titulo;
  qs('#subtitulo').textContent = subtitulo;
}

// ---------------------------------------------------------------- arranque

async function arrancar() {
  await db.abrir();
  await sembrar();
  await recargar();

  qs('#btn-ajustes').addEventListener('click', () => ir('ajustes'));
  window.addEventListener('hashchange', pintar);
  await pintar();

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        nuevo?.addEventListener('statechange', () => {
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Hay una versión nueva. Ciérrala y ábrela otra vez.', 5000);
          }
        });
      });
    } catch (e) {
      console.warn('Service worker no registrado:', e);
    }
  }
}

arrancar();
