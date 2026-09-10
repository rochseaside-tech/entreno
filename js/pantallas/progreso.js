// progreso.js — la semana (comida y desvío), el peso, los pasos, las medidas y la fuerza.

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { E, useEstado, avisar, toast, sesionesTerminadas, records } from '../estado.js';
import * as L from '../logica.js';
import * as db from '../db.js';
import { Icono, Hoja, GraficaLinea, GraficaBarras, ir, n0, n1, aNum } from '../comunes.js';
import { HojaPeso } from './hoy.js';
import { textoEntrenos, copiar } from '../informe.js';

const MEDIDAS = [['cintura', 'Cintura'], ['cadera', 'Cadera'], ['pecho', 'Pecho'], ['muslo', 'Muslo'], ['brazo', 'Brazo']];

export function Progreso() {
  useEstado();
  const hoy = L.hoyISO();
  const [d, ponerD] = useState(null);
  const [hoja, ponerHoja] = useState(null);
  const [version, ponerVersion] = useState(0);
  const refrescar = () => ponerVersion((v) => v + 1);

  useEffect(() => {
    const dias = L.diasDeSemana(hoy);
    Promise.all([
      db.porRangoFecha('comidas', dias[0], dias[6]), db.todos('peso'), db.todos('pasos'),
      db.todos('medidas'), db.obtener('semanas', L.semanaISO(hoy)),
    ]).then(([comidas, pesos, pasos, medidas, semana]) => {
      const comidasPorDia = new Map(dias.map((f) => [f, comidas.filter((c) => c.fecha === f)]));
      const sesionesPorDia = new Map(dias.map((f) => [f, sesionesTerminadas().filter((s) => s.fecha === f)]));
      const resumen = L.resumenSemana({ dias, comidasPorDia, sesionesPorDia, pesos: new Map(pesos.map((p) => [p.fecha, p.kg])), ajustePorDia: semana?.ajustePorDia || 0 });
      ponerD({ dias, resumen, pesos, pasos, medidas: medidas.sort((a, b) => (a.fecha < b.fecha ? -1 : 1)), semana });
    });
  }, [version, E.sesiones.length]);

  if (!d) return null;
  const r = d.resumen;
  // Solo cuentan los días ya terminados en los que apuntaste algo: un día sin
  // apuntar no es un día de 0 kcal, y hoy aún no ha acabado.
  const cerrados = r.filas.filter((f) => f.registrado && f.pasado);
  const desvio = Math.round(cerrados.reduce((t, f) => t + f.total.kcal - f.objetivo.base, 0));
  const media = (campo) => (cerrados.length ? cerrados.reduce((t, f) => t + f.total[campo], 0) / cerrados.length : null);
  const reparto = L.repartoSugerido(desvio, r.diasRestantes);
  const serie = L.mediaMovil(d.pesos);
  const ritmo = L.valoracionRitmo(L.ritmoSemanal(serie));
  const pasosHoy = d.pasos.find((p) => p.fecha === hoy)?.pasos;
  const ultimaMedida = d.medidas[d.medidas.length - 1];
  const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const aplicarReparto = async () => {
    await db.guardar('semanas', { semana: L.semanaISO(hoy), ajustePorDia: reparto.porDia, desde: L.sumarDias(hoy, 1) });
    toast(`Aplicado: ${reparto.porDia} kcal al día hasta el domingo`); refrescar();
  };
  const quitarReparto = async () => { await db.borrar('semanas', L.semanaISO(hoy)); toast('Reparto quitado'); refrescar(); };

  return html`
    <header class="cabecera"><h1 class="titulo">Progreso</h1></header>

    <div class="seccion"><h2 class="titulo">Esta semana</h2></div>
    <div class="pila">
      <div class="rejilla-3">
        <div class="tarjeta dato"><small>Media</small><div class="num">${media('kcal') != null ? n0(media('kcal')) : '—'} <span>kcal</span></div></div>
        <div class="tarjeta dato"><small>Proteína</small><div class="num">${media('prot') != null ? n0(media('prot')) : '—'} <span>g</span></div></div>
        <div class="tarjeta dato"><small>Entrenos</small><div class="num">${r.sesiones} <span>de 4</span></div></div>
      </div>
      <div class="tarjeta">
        <div class="dato"><small>Kcal por día · la línea es el objetivo de un día de gimnasio</small></div>
        <${GraficaBarras} datos=${r.filas.map((f, i) => ({ etq: LETRAS[i], v: f.total.kcal, si: f.huboGym }))} objetivo=${E.config.objetivos.kcalEntreno} />
        <p class="t2 peq" style="margin-top:8px">${cerrados.length === 0 ? 'Las medias salen cuando termine el primer día con comidas apuntadas.'
          : `En ${cerrados.length} ${cerrados.length === 1 ? 'día completo' : 'días completos'}: ${desvio > 0 ? `${n0(desvio)} kcal por encima` : `${n0(-desvio)} kcal por debajo`} de tu objetivo.`}</p>
        ${d.semana?.ajustePorDia
          ? html`<div class="sugerencia" style="margin-top:10px">Repartiendo ${d.semana.ajustePorDia} kcal al día hasta el domingo.</div>
              <button class="boton suave" style="margin-top:8px" onClick=${quitarReparto}>Quitar el reparto</button>`
          : reparto && desvio > 150 && html`<button class="boton suave" style="margin-top:10px" onClick=${aplicarReparto}>
              Repartir ${reparto.porDia} kcal al día en los ${r.diasRestantes} días que quedan</button>
              ${reparto.recortado && html`<p class="t2 peq" style="margin-top:6px">Tu suelo de ${E.config.objetivos.sueloKcal} kcal no deja bajar más: no se compensa entero esta semana.</p>`}`}
      </div>
    </div>

    <div class="seccion"><h2 class="titulo">Cuerpo</h2><button onClick=${() => ponerHoja('peso')}>Pesarme</button></div>
    <div class="pila">
      <div class="tarjeta">
        <div class="dato"><small>Peso, media de 7 días</small>
          ${serie.length ? html`<div class="num">${n1(serie[serie.length - 1].media)} <span>kg</span></div>` : html`<div class="t2" style="margin-top:4px">Aún no hay pesadas.</div>`}</div>
        ${serie.length >= 2 && html`<${GraficaLinea} puntos=${serie.slice(-60).map((p) => ({ etq: L.fechaCorta(p.fecha), y: p.media }))} sufijo=" kg" />`}
        <p class="t2 peq" style="margin-top:6px">${ritmo.texto}</p>
      </div>
      <div class="dos-botones">
        <button class="tarjeta dato" style="text-align:left" onClick=${() => ponerHoja('pasos')}>
          <small>Pasos de hoy</small><div class="num">${pasosHoy != null ? n0(pasosHoy) : '—'}</div>
          <div class="t2 peq">objetivo ${n0(E.config.perfil.pasosObjetivo || 10000)}</div></button>
        <button class="tarjeta dato" style="text-align:left" onClick=${() => ponerHoja('medidas')}>
          <small>Medidas</small><div class="num">${ultimaMedida?.cintura ? n1(ultimaMedida.cintura) : '—'} <span>cm cintura</span></div>
          <div class="t2 peq">${ultimaMedida ? `hace ${L.diasEntre(ultimaMedida.fecha, hoy)} días · cada 4 semanas` : 'cada 4 semanas'}</div></button>
      </div>
    </div>

    <${Fuerza} />
    <${PasarAClaude} />

    ${hoja === 'peso' && html`<${HojaPeso} alCerrar=${() => ponerHoja(null)} alGuardar=${refrescar} />`}
    ${hoja === 'pasos' && html`<${HojaNumero} titulo="Pasos de hoy" unidad="pasos" inicial=${pasosHoy}
        alGuardar=${async (v) => { await db.guardar('pasos', { fecha: hoy, pasos: Math.round(v) }); refrescar(); }} alCerrar=${() => ponerHoja(null)} />`}
    ${hoja === 'medidas' && html`<${HojaMedidas} previa=${ultimaMedida} alCerrar=${() => ponerHoja(null)} alGuardar=${refrescar} />`}`;
}

// ---------------------------------------------------------------- fuerza

function Fuerza() {
  const terminadas = sesionesTerminadas();
  const hoy = L.hoyISO();
  // Entrenos por semana, las últimas 8.
  const semanas = Array.from({ length: 8 }, (_, i) => L.lunesDe(L.sumarDias(hoy, -7 * (7 - i))));
  const porSemana = semanas.map((lun) => ({ etq: L.fechaCorta(lun).split(' ')[0], v: terminadas.filter((s) => s.fecha >= lun && s.fecha <= L.sumarDias(lun, 6)).length, si: true }));
  const hechos = [...new Set(E.series.map((s) => s.ejercicioId))].map((id) => E.ejercicioPorId.get(id)).filter(Boolean);
  const filas = hechos.map((ej) => ({ ej, rec: records(ej.id), prog: L.progresionEjercicio(E.series.filter((s) => s.ejercicioId === ej.id)) }))
    .filter((f) => f.rec).sort((a, b) => (b.prog.mejora ?? -1) - (a.prog.mejora ?? -1));

  return html`
    <div class="seccion"><h2 class="titulo">Fuerza</h2></div>
    <div class="pila">
      <div class="tarjeta"><div class="dato"><small>Entrenos por semana</small></div><${GraficaBarras} datos=${porSemana} objetivo=${4} /></div>
      ${filas.length
        ? html`<div class="lista">${filas.map(({ ej, rec, prog }) => html`
            <button class="item" onClick=${() => ir('ejercicio/' + ej.id)}>
              <div class="crece"><div class="nombre corta">${ej.nombre}</div>
                <div class="meta">Mejor: ${n1(rec.mejorPeso.peso)} kg × ${rec.mejorPeso.reps}${rec.rm > 0 ? ` · máximo calculado ${n0(rec.rm)} kg` : ''}</div></div>
              ${prog.mejora != null && html`<span class="pastilla">${prog.mejora >= 0 ? '+' : ''}${n0(prog.mejora)} %</span>`}
            </button>`)}</div>`
        : html`<div class="tarjeta t2">Cuando termines tu primer entreno, aquí verás cuánto sube cada ejercicio.</div>`}
    </div>`;
}

// ---------------------------------------------------------------- pasar a Claude

function PasarAClaude() {
  const todas = sesionesTerminadas();
  const hace28 = L.sumarDias(L.hoyISO(), -27);
  const opciones = [
    ['Último entreno', todas.slice(-1), 'último entreno'],
    ['Últimas 4 semanas', todas.filter((s) => s.fecha >= hace28), 'últimas 4 semanas'],
    ['Todo', todas, 'todos'],
  ];
  const pasar = async (lista, alcance) => {
    const ok = await copiar(textoEntrenos(lista, alcance));
    toast(ok ? `Copiado (${lista.length} ${lista.length === 1 ? 'entreno' : 'entrenos'}): pégalo en Claude` : 'No se ha podido copiar', 3000);
  };
  return html`
    <div class="seccion"><h2 class="titulo">Pasar a Claude</h2></div>
    <div class="tarjeta pila">
      <p class="t2 peq">Copia tus entrenos con todas las series tal cual las hiciste: peso, repeticiones y RIR de cada una. Luego lo pegas en Claude.</p>
      ${opciones.map(([texto, lista, alcance]) => html`<button class="boton suave" disabled=${!lista.length} onClick=${() => pasar(lista, alcance)}>
        <${Icono} n="compartir" t=${20} g=${2.2} />${texto}${lista.length ? ` · ${lista.length}` : ''}</button>`)}
    </div>`;
}

// ---------------------------------------------------------------- hojas

function HojaNumero({ titulo, unidad, inicial, alGuardar, alCerrar }) {
  const [v, ponerV] = useState(inicial != null ? String(inicial) : '');
  const guardar = async () => { const n = aNum(v); if (n == null) { toast('Escribe un número'); return; } await alGuardar(n); toast('Guardado'); alCerrar(); };
  return html`<${Hoja} titulo=${titulo} alCerrar=${alCerrar}>
    <div class="cantidad-grande"><input class="caja num" inputmode="numeric" autofocus value=${v} onInput=${(e) => ponerV(e.currentTarget.value)} /><span class="unidad">${unidad}</span></div>
    <button class="boton" onClick=${guardar}>Guardar</button>
  <//>`;
}

function HojaMedidas({ previa, alCerrar, alGuardar }) {
  const [v, ponerV] = useState({});
  const guardar = async () => {
    const fila = { fecha: L.hoyISO() };
    for (const [k] of MEDIDAS) { const n = aNum(v[k]); if (n) fila[k] = n; }
    if (Object.keys(fila).length === 1) { toast('Apunta al menos una medida'); return; }
    await db.guardar('medidas', fila); toast('Medidas guardadas'); alGuardar(); alCerrar();
  };
  return html`<${Hoja} titulo="Medidas de hoy" alCerrar=${alCerrar}>
    <p class="t2" style="margin-bottom:12px">En centímetros, con la cinta sin apretar. Siempre en el mismo sitio y a la misma hora.</p>
    <div class="rejilla-2" style="margin-bottom:14px">
      ${MEDIDAS.map(([k, t]) => html`<label class="campo"><span>${t}${previa?.[k] ? ` (antes ${n1(previa[k])})` : ''}</span>
        <input class="entrada num" inputmode="decimal" value=${v[k] || ''} onInput=${(e) => ponerV({ ...v, [k]: e.currentTarget.value })} /></label>`)}
    </div>
    <button class="boton" onClick=${guardar}>Guardar medidas</button>
  <//>`;
}
