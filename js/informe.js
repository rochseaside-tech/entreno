// informe.js — tus entrenos en texto, con TODAS las series tal cual las hiciste
// (peso, repeticiones y RIR de cada una), para pegarlos en Claude o donde quieras.

import { E } from './estado.js';
import { n1, n0, n2 } from './comunes.js';

const fechaCompleta = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const hora = (iso) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

// Los ejercicios de una sesión en el orden en que se hicieron, cada uno con sus series.
// Se agrupa por ejercicio (no por posición) para que valga también con los entrenos antiguos.
export function ejerciciosDeSesion(s) {
  const series = E.series.filter((r) => r.sesionId === s.id);
  const orden = [...s.ejercicios.map((x) => x.id), ...series.map((r) => r.ejercicioId)];
  const ids = [...new Set(orden)];
  return ids.map((id) => {
    const plan = s.ejercicios.find((x) => x.id === id);
    const ej = E.ejercicioPorId.get(id);
    return {
      id, ej, plan, nombre: ej?.nombre || id,
      series: series.filter((r) => r.ejercicioId === id).sort(ordenSeries),
    };
  });
}

// Primero las de aproximación, luego las de trabajo; en cada serie, izquierda antes que derecha.
const ordenSeries = (a, b) => (a.calent ? 0 : 1) - (b.calent ? 0 : 1)
  || (a.indice ?? 0) - (b.indice ?? 0)
  || (a.lado === 'der' ? 1 : 0) - (b.lado === 'der' ? 1 : 0)
  || (a.ts || 0) - (b.ts || 0);

export function etiquetaSerie(r) {
  const base = `${r.calent ? 'Aproximación' : 'Serie'} ${(r.indice ?? 0) + 1}`;
  return r.lado ? `${base} · ${r.lado === 'izq' ? 'izquierda' : 'derecha'}` : base;
}

export function textoCinta(c) {
  const partes = [];
  if (c.min) partes.push(`${n0(c.min)} min`);
  if (c.kmh) partes.push(`${n1(c.kmh)} km/h`);
  if (c.incl != null) partes.push(`inclinación ${n1(c.incl)} %`);
  if (c.km) partes.push(`${n2(c.km)} km`);
  return partes.join(' · ');
}

export function textoSerie(r, ej) {
  const reps = ej?.segundos ? `${r.reps} s` : `${r.reps} reps`;
  const peso = r.peso == null ? 'peso sin apuntar'
    : ej?.tipo === 'corporal' ? (r.peso ? `peso corporal + ${n1(r.peso)} kg` : 'peso corporal')
    : `${n1(r.peso)} kg`;
  return `${peso} × ${reps}${r.calent ? '' : ` · RIR ${r.rir ?? '—'}`}`;
}

function textoSesion(s) {
  const min = s.fin ? Math.round((new Date(s.fin) - new Date(s.inicio)) / 60000) : null;
  const titulo = s.plan === 'L' ? 'Entreno libre' : `Sesión ${s.plan} · ${s.nombre}`;
  const l = [`## ${titulo} — ${fechaCompleta(s.fecha)}`];
  if (s.horaDesconocida) l.push('Hora y duración: no se apuntaron (registrado a mano después; pesos, reps y RIR son los reales).');
  else l.push(`Hora: ${hora(s.inicio)}${s.fin ? `–${hora(s.fin)} (${min} min)` : ' (sin terminar)'}${s.cerradaSola ? ' · se guardó sola al quedarse abierta' : ''}`);
  if (s.aprox) l.push('OJO: apuntado después con pesos estándar; los pesos y repeticiones NO son los reales.');
  if (s.calentamiento?.inicio) {
    l.push(`Calentamiento: ${s.calentamiento.fin
      ? `${Math.max(1, Math.round((new Date(s.calentamiento.fin) - new Date(s.calentamiento.inicio)) / 60000))} min`
      : 'empezado y sin terminar'}`);
  }
  let volumen = 0, total = 0;
  for (const g of ejerciciosDeSesion(s)) {
    const ej = g.ej;
    const objetivo = ej ? ` (objetivo: ${g.plan?.series ?? '?'} series${ej.lados ? ' por lado' : ''} de ${ej.repMin}–${ej.repMax} ${ej.segundos ? 'segundos' : 'reps'}, RIR ${ej.rir})` : '';
    if (!g.series.length) { l.push(`- ${g.nombre}${objetivo}: no hecho`); continue; }
    l.push(`- ${g.nombre}${objetivo}:`);
    g.series.forEach((r) => {
      l.push(`  - ${etiquetaSerie(r)}: ${textoSerie(r, ej)}${r.calent ? ' (no cuenta)' : ''}`);
      if (!r.calent) { volumen += (r.peso || 0) * (r.reps || 0); total++; }
    });
  }
  if (s.cinta) l.push(`- Caminata en cinta después: ${textoCinta(s.cinta)}`);
  l.push(`Total: ${total} ${total === 1 ? 'serie' : 'series'} · ${n0(volumen)} kg movidos${s.notas ? `\nNotas: ${s.notas}` : ''}`);
  return l.join('\n');
}

export function textoEntrenos(sesiones, alcance) {
  const lista = [...sesiones].sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  const cab = [
    `# Mis entrenos — ${alcance}`,
    'Rutina en rotación A → B → C → D. Cada serie: peso en kg, repeticiones y RIR (repeticiones que me quedaban en recámara).',
    'Progresión doble: subo peso cuando hago todas las series al tope del rango con RIR 1 o más.',
    'Limitaciones: menisco (prensa solo hasta 90°) y hombro izquierdo (elevaciones laterales con mancuernas a dos manos, nunca polea a un brazo).',
  ];
  if (E.fase?.motivo) cab.push(`Fase actual: ${E.fase.motivo}`);
  if (!lista.length) return cab.join('\n') + '\n\nAún no hay entrenos terminados.';
  return cab.join('\n') + '\n\n' + lista.map(textoSesion).join('\n\n');
}

// Copia al portapapeles. En iPhone solo funciona dentro de un toque, así que se
// llama directamente desde el botón.
export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const t = Object.assign(document.createElement('textarea'), { value: texto });
      t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:-999px;opacity:0';
      document.body.appendChild(t); t.select(); t.setSelectionRange(0, texto.length);
      const ok = document.execCommand('copy'); t.remove();
      return ok;
    } catch { return false; }
  }
}
