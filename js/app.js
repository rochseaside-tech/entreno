// app.js — arranque y navegación. Cada pantalla es un componente; la ruta sale del #.

import { html, render, useEffect, useState } from './vendor/preact-htm.js';
import { E, useEstado, arrancarDatos, toast } from './estado.js';
import { Tabs, Toast, ponerTema } from './comunes.js';
import { Hoy } from './pantallas/hoy.js';
import { Entreno, BarraDescanso } from './pantallas/entreno.js';
import { Ejercicios, Ejercicio } from './pantallas/ejercicios.js';
import { Comida } from './pantallas/comida.js';
import { Progreso } from './pantallas/progreso.js';
import { Ajustes } from './pantallas/ajustes.js';

// '#/ejercicio/jalon-prono?desde=entreno' -> { nombre: 'ejercicio', id: 'jalon-prono', params: { desde: 'entreno' } }
function leerRuta() {
  const bruto = location.hash.replace(/^#\/?/, '') || 'hoy';
  const [camino, cadena] = bruto.split('?');
  const [nombre, id] = camino.split('/');
  return { nombre, id: id ? decodeURIComponent(id) : null, params: Object.fromEntries(new URLSearchParams(cadena || '')) };
}

const PANTALLAS = {
  hoy: { C: Hoy, tab: 'hoy' },
  entreno: { C: Entreno, tab: 'entreno' },
  ejercicios: { C: Ejercicios, tab: 'ejercicios' },
  ejercicio: { C: Ejercicio, tab: 'ejercicios', detalle: true },
  comida: { C: Comida, tab: 'comida' },
  progreso: { C: Progreso, tab: 'progreso' },
  ajustes: { C: Ajustes, tab: 'hoy', detalle: true },
};

function App() {
  useEstado();
  const [ruta, ponerRuta] = useState(leerRuta);

  useEffect(() => {
    const cambio = () => { ponerRuta(leerRuta()); window.scrollTo(0, 0); };
    addEventListener('hashchange', cambio);
    return () => removeEventListener('hashchange', cambio);
  }, []);

  if (!E.listo) return null;

  const p = PANTALLAS[ruta.nombre] || PANTALLAS.hoy;
  const conDescanso = !!E.descanso;
  return html`
    <main class=${`pantalla ${p.detalle ? 'entra' : 'aparece'} ${conDescanso ? 'con-descanso' : ''}`} key=${ruta.nombre + (ruta.id || '')}>
      <${p.C} id=${ruta.id} params=${ruta.params} />
    </main>
    ${conDescanso && html`<${BarraDescanso} />`}
    <${Tabs} activa=${p.tab} />
    <${Toast} />`;
}

async function arrancar() {
  ponerTema(document.documentElement.dataset.tema);
  render(html`<${App} />`, document.getElementById('app'));
  try {
    await arrancarDatos();
  } catch (err) {
    console.error(err);
    document.getElementById('app').innerHTML =
      '<div class="pantalla"><div class="aviso">No se han podido abrir tus datos. Cierra la app y ábrela otra vez.</div></div>';
    return;
  }

  // Pedir al sistema que no borre los datos aunque falte espacio.
  try { await navigator.storage?.persist?.(); } catch { /* no disponible */ }

  if ('serviceWorker' in navigator) {
    try {
      const yaHabia = !!navigator.serviceWorker.controller;
      const reg = await navigator.serviceWorker.register('./sw.js');
      // El nuevo service worker toma el control en cuanto se instala (skipWaiting + claim).
      // Cuando pasa, hay versión nueva: se recarga en cuanto no estés en medio de algo.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (yaHabia) { hayVersionNueva = true; recargarSiSePuede(); }
      });
      // El iPhone deja la app dormida en segundo plano: al volver, se comprueba si hay versión nueva.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        reg.update().catch(() => {});
        recargarSiSePuede();
      });
    } catch (e) { console.warn('Service worker no registrado:', e); }
    guardarFotos();
  }
}

// Recargar no pierde nada (las series se guardan al marcar ✓ y el descanso vive en
// localStorage), pero no se hace con un panel abierto o escribiendo: se espera.
let hayVersionNueva = false, recargando = false;
function recargarSiSePuede() {
  if (!hayVersionNueva || recargando) return;
  const ocupada = document.querySelector('.hoja') || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (ocupada) { setTimeout(recargarSiSePuede, 5000); return; }
  recargando = true;
  location.reload();
}

// La primera vez, bajar todas las fotos de ejercicios para tenerlas sin cobertura.
async function guardarFotos() {
  try {
    if (localStorage.getItem('fotos-v1')) return;
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) return; // aún no controla: la próxima vez
    const urls = E.ejercicios.filter((e) => e.img).flatMap((e) => [0, 1].map((i) => `./img/ej/${e.img}-${i}.webp`));
    for (let i = 0; i < urls.length; i += 8) await Promise.allSettled(urls.slice(i, i + 8).map((u) => fetch(u)));
    localStorage.setItem('fotos-v1', '1');
  } catch { /* se reintenta al abrir otra vez */ }
}

arrancar();
