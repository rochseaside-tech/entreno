// informe.js — tus datos en texto para pegarlos en Claude: los entrenos con TODAS las
// series tal cual las hiciste (peso, repeticiones y RIR de cada una) y, en textoTodo,
// además cada comida con sus macros, el objetivo de cada día, el peso y los pasos.

import { E } from './estado.js';
import * as db from './db.js';
import * as L from './logica.js';
import * as S from './seed.js';
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

export function textoSesion(s) {
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

// ---------------------------------------------------------------- todo: comida y entreno

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const cantidadDe = (c) => (c.origen === 'receta'
  ? `${n1(c.cantidad)} ${c.cantidad === 1 ? 'ración' : 'raciones'}`
  : c.medida === 'ud' ? `${n1(c.cantidad)} ud` : `${n0(c.cantidad)} ${c.medida === 'ml' ? 'ml' : 'g'}`);
const macrosTexto = (m) => `${n0(m.kcal)} kcal · ${n1(m.prot)} g prot · ${n1(m.grasa)} g grasa · ${n1(m.hc)} g hidratos`;
const MEDIDAS = ['cintura', 'cadera', 'pecho', 'muslo', 'brazo'];

// Todo lo apuntado, día a día. dias = 7, 28… (hasta hoy incluido) o 0 para todo.
// Devuelve el texto y cuántos días, comidas y entrenos lleva.
export async function textoTodo(dias = 0) {
  const hoy = L.hoyISO();
  const [comidas, pesos, pasos, medidas, semanas] = await Promise.all([
    db.todos('comidas'), db.todos('peso'), db.todos('pasos'), db.todos('medidas'), db.todos('semanas'),
  ]);
  const sesiones = E.sesiones.filter((s) => s.fin);
  const conDatos = [...comidas, ...sesiones, ...pesos, ...pasos, ...medidas].map((x) => x.fecha).filter(Boolean);
  const primera = conDatos.length ? conDatos.reduce((a, b) => (a < b ? a : b)) : hoy;
  const desde = dias ? L.sumarDias(hoy, -(dias - 1)) : primera;
  const dentro = (f) => f >= desde && f <= hoy;
  const fechas = [...new Set(conDatos.filter(dentro))].sort();

  const comidasR = comidas.filter((c) => dentro(c.fecha));
  const sesionesR = sesiones.filter((s) => dentro(s.fecha)).sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  const porDia = new Map();
  for (const c of comidasR) { if (!porDia.has(c.fecha)) porDia.set(c.fecha, []); porDia.get(c.fecha).push(c); }

  const o = S.OBJETIVOS;
  const cab = [
    `# Mis datos de Entreno — ${dias ? `últimos ${dias} días` : 'todo'} (${fechaCompleta(desde)} a ${fechaCompleta(hoy)})`,
    '## Mi plan',
    `- Comida: ${n0(o.kcalEntreno)} kcal los días de gimnasio y ${n0(o.kcalDescanso)} los días sin; proteína ${o.proteina} g siempre, grasa ${o.grasa} g y los hidratos lo que queda; nunca por debajo de ${n0(o.sueloKcal)} kcal.`,
    '- Entreno: rutina en rotación A → B → C → D. Cada serie con peso (kg), repeticiones y RIR (repeticiones que me quedaban en recámara). Progresión doble: subo peso cuando hago todas las series al tope del rango con RIR 1 o más.',
    '- Limitaciones: menisco (prensa solo hasta 90°) y hombro izquierdo (elevaciones laterales con mancuernas a dos manos, nunca polea a un brazo).',
  ];
  if (E.fase?.motivo) cab.push(`- Fase actual: ${E.fase.motivo}`);

  // Resumen: las medias solo con días terminados y apuntados (hoy aún no ha acabado).
  const cerrados = [...porDia.keys()].filter((f) => f < hoy);
  const media = (k) => cerrados.reduce((t, f) => t + L.sumarMacros(porDia.get(f))[k], 0) / Math.max(1, cerrados.length);
  const serie = L.mediaMovil(pesos).filter((p) => dentro(p.fecha));
  const res = ['## Resumen', `- Días con comidas apuntadas: ${porDia.size}${porDia.has(hoy) ? ' (incluye hoy, que aún no ha terminado)' : ''}.`];
  if (cerrados.length) res.push(`- Media de ${cerrados.length} ${cerrados.length === 1 ? 'día completo' : 'días completos'}: ${macrosTexto({ kcal: media('kcal'), prot: media('prot'), grasa: media('grasa'), hc: media('hc') })}.`);
  res.push(`- Entrenos terminados: ${sesionesR.length}.`);
  if (serie.length) res.push(`- Peso, media de 7 días: de ${n1(serie[0].media)} kg a ${n1(serie[serie.length - 1].media)} kg.`);

  const dia = (f) => {
    const deDia = porDia.get(f) || [];
    const ses = sesionesR.filter((s) => s.fecha === f);
    const sem = semanas.find((s) => s.semana === L.semanaISO(f));
    const ajuste = sem?.ajustePorDia && f >= (sem.desde || f) ? sem.ajustePorDia : 0;
    const obj = L.objetivoDia({ huboGym: ses.length > 0, ajustePorDia: ajuste });
    const l = [`### ${mayuscula(fechaCompleta(f))}${f === hoy ? ' (hoy, sin terminar)' : ''} — ${ses.length ? 'día de gimnasio' : 'día sin gimnasio'}`];
    if (deDia.length) {
      l.push(`Objetivo: ${macrosTexto(obj)}.`);
      for (const t of S.TOMAS) {
        const items = deDia.filter((c) => c.toma === t.id).sort((a, b) => (a.ts || 0) - (b.ts || 0));
        if (!items.length) continue;
        l.push(`- ${t.nombre} (${n0(L.sumarMacros(items).kcal)} kcal):`);
        for (const c of items) l.push(`  - ${c.nombre}, ${cantidadDe(c)}: ${macrosTexto(c)}`);
      }
      const tot = L.sumarMacros(deDia);
      l.push(`Total del día: ${macrosTexto(tot)} · fibra ${n1(tot.fibra)} g · sal ${n1(tot.sal)} g.`);
    } else {
      l.push('Comidas: no apuntadas este día.');
    }
    const p = pesos.find((x) => x.fecha === f);
    const pa = pasos.find((x) => x.fecha === f);
    const me = medidas.find((x) => x.fecha === f);
    const cuerpo = [];
    if (p) cuerpo.push(`peso ${n1(p.kg)} kg`);
    if (pa) cuerpo.push(`${n0(pa.pasos)} pasos`);
    if (me) cuerpo.push(`medidas: ${MEDIDAS.filter((k) => me[k]).map((k) => `${k} ${n1(me[k])} cm`).join(', ')}`);
    if (cuerpo.length) l.push(`Cuerpo: ${cuerpo.join(' · ')}.`);
    for (const s of ses) l.push(textoSesion(s).replace(/^## /, '#### Entreno: '));
    return l.join('\n');
  };

  const texto = [cab.join('\n'), res.join('\n'), '## Día a día', ...fechas.map(dia)].join('\n\n');
  return { texto, dias: fechas.length, comidas: comidasR.length, entrenos: sesionesR.length };
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
