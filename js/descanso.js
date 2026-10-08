// descanso.js — temporizador de descanso, pitido, vibración y pantalla encendida.
//
// El descanso se guarda como "hora de fin", no como cuenta atrás: si bloqueas el
// móvil o cambias de app, al volver marca lo que queda de verdad.
// Limitación de iPhone: una web no puede sonar con el móvil bloqueado. Por eso,
// durante el entreno la app mantiene la pantalla encendida (se puede quitar en Ajustes).

import { E, avisar } from './estado.js';
import { QUIEN } from './perfiles.js';

// Una clave por persona: si las dos apps están abiertas en el mismo móvil, el descanso
// de una no pisa el de la otra.
const CLAVE = QUIEN.id === 'rocio' ? 'descanso' : `descanso-${QUIEN.id}`;

function leer() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) || null; } catch { return null; }
}
function guardar() {
  try {
    if (E.descanso) localStorage.setItem(CLAVE, JSON.stringify(E.descanso));
    else localStorage.removeItem(CLAVE);
  } catch { /* modo privado: el descanso vive solo en memoria */ }
}

E.descanso = leer();

export const restante = () => (E.descanso ? Math.max(0, Math.round((E.descanso.fin - Date.now()) / 1000)) : 0);

export function empezar(segundos) {
  prepararAudio();
  E.descanso = { fin: Date.now() + segundos * 1000, total: segundos, avisado: false };
  guardar(); avisar();
}

export function ajustar(delta) {
  if (!E.descanso) return;
  const quedan = Math.max(0, restante() + delta);
  E.descanso.fin = Date.now() + quedan * 1000;
  E.descanso.total = Math.max(E.descanso.total, quedan);
  E.descanso.avisado = false;
  guardar(); avisar();
}

export function parar() {
  E.descanso = null;
  guardar(); avisar();
}

// Comprobación cada medio segundo: al llegar a cero, pita, vibra y se quita solo.
setInterval(() => {
  const d = E.descanso;
  if (!d || d.avisado || restante() > 0) return;
  d.avisado = true;
  guardar();
  if (E.config.sonidoDescanso !== false) pitido();
  vibrar([200, 100, 200]);
  avisar();
  setTimeout(() => { if (E.descanso === d) parar(); }, 5000);
}, 500);

// ---------------------------------------------------------------- sonido

let ctx = null;
// Con el iPhone en silencio, una web no suena salvo que pida el modo «reproducción»
// (Safari 17+). Ese modo para la música que tengas puesta, por eso va en Ajustes.
function tipoDeAudio() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = E.config.sonarEnSilencio ? 'playback' : 'auto';
  } catch { /* Safari antiguo */ }
}

// Safari solo deja sonar audio si se ha preparado dentro de un toque de la usuaria, y lo
// vuelve a bloquear al salir de la app (WhatsApp, una llamada): por eso se prepara en cada
// toque, no solo en el primero.
export function prepararAudio() {
  try {
    tipoDeAudio();
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== 'running') {
      ctx.resume();
      // Un sonido mudo dentro del toque es lo que de verdad desbloquea el audio en iPhone.
      const b = ctx.createBufferSource();
      b.buffer = ctx.createBuffer(1, 1, 22050);
      b.connect(ctx.destination); b.start(0);
    }
  } catch { /* sin audio */ }
}

addEventListener('pointerdown', prepararAudio, { capture: true, passive: true });
addEventListener('touchend', prepararAudio, { capture: true, passive: true });

// Dos tandas de tres pitidos fuertes (el último más agudo): se oyen en el gimnasio.
export function pitido(tandas = 2) {
  prepararAudio(); // por si el descanso arrancó sin pasar por un toque: si no, no suena
  if (!ctx) return;
  try {
    for (let k = 0; k < tandas; k++) {
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle'; o.frequency.value = i === 2 ? 1320 : 880;
        const t = ctx.currentTime + 0.05 + k * 1.2 + i * 0.28;
        const largo = i === 2 ? 0.45 : 0.2;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(1, t + 0.02);
        g.gain.setValueAtTime(1, t + largo - 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t + largo);
        o.start(t); o.stop(t + largo + 0.02);
      }
    }
  } catch { /* sin audio */ }
}

// ---------------------------------------------------------------- vibración

// Android tiene navigator.vibrate. iPhone no, pero desde iOS 18 un interruptor
// nativo (<input switch>) da un toque háptico al cambiar; se usa uno invisible.
let interruptorOculto = null;
export function vibrar(patron = 12) {
  if (navigator.vibrate) { try { navigator.vibrate(patron); return; } catch { /* sigue */ } }
  try {
    if (!interruptorOculto) {
      interruptorOculto = document.createElement('label');
      interruptorOculto.style.cssText = 'position:fixed;left:-99px;top:0;opacity:0;pointer-events:none';
      const i = document.createElement('input');
      i.type = 'checkbox'; i.setAttribute('switch', '');
      interruptorOculto.appendChild(i);
      document.body.appendChild(interruptorOculto);
    }
    interruptorOculto.click();
  } catch { /* sin vibración */ }
}

// ---------------------------------------------------------------- pantalla encendida

let bloqueo = null, quiereEncendida = false;
export async function pantallaEncendida(si) {
  quiereEncendida = si;
  try {
    if (si && !bloqueo && 'wakeLock' in navigator) {
      bloqueo = await navigator.wakeLock.request('screen');
      bloqueo.addEventListener('release', () => { bloqueo = null; });
    } else if (!si && bloqueo) {
      await bloqueo.release(); bloqueo = null;
    }
  } catch { /* el sistema puede negarlo, por ejemplo con batería baja */ }
}
// Al volver a la app el sistema suelta el bloqueo: se pide otra vez.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (quiereEncendida) pantallaEncendida(true);
    avisar();
  }
});
