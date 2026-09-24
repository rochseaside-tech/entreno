// progreso.js — la semana (comida y desvío), el peso, los pasos, las medidas y la fuerza.

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { E, useEstado, avisar, toast, sesionesTerminadas, records } from '../estado.js';
import * as L from '../logica.js';
import * as db from '../db.js';
import * as S from '../seed.js';
import { QUIEN } from '../perfiles.js';
import { Icono, Hoja, GraficaLinea, GraficaBarras, Vacio, ir, n0, n1, aNum } from '../comunes.js';
import { HojaPeso } from './hoy.js';
import { textoTodo, copiar } from '../informe.js';

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
      db.todos('medidas'), db.obtener('semanas', L.semanaISO(hoy)), db.leerMeta('diasGym', []),
    ]).then(([comidas, pesos, pasos, medidas, semana, diasGym]) => {
      const comidasPorDia = new Map(dias.map((f) => [f, comidas.filter((c) => c.fecha === f)]));
      // Día de gimnasio para el objetivo: con entreno (aunque esté en marcha) o marcado por ti.
      const sesionesPorDia = new Map(dias.map((f) => [f, [...E.sesiones.filter((s) => s.fecha === f), ...(diasGym.includes(f) ? [{ marcado: true }] : [])]]));
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
  const evolucion = L.evolucionMedidas(d.medidas, S.MEDIDAS);
  const prox = L.proximaMedida(d.medidas, E.config.proximaMedida, hoy, S.PROTOCOLO_MEDIDAS.cadaDias);
  const principal = evolucion[0];
  const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const aplicarReparto = async () => {
    await db.guardar('semanas', { semana: L.semanaISO(hoy), ajustePorDia: reparto.porDia, desde: L.sumarDias(hoy, 1) });
    toast(`Aplicado: ${reparto.porDia} kcal al día hasta el domingo`); refrescar();
  };
  const quitarReparto = async () => { await db.borrar('semanas', L.semanaISO(hoy)); toast('Reparto quitado'); refrescar(); };

  return html`
    <header class="cabecera"><h1 class="titulo">Progreso</h1></header>

    ${QUIEN.comida && html`<div class="seccion"><h2 class="titulo">Esta semana</h2></div>
    <div class="pila">
      ${cerrados.length > 0 && html`<div class="rejilla-3">
        <div class="tarjeta dato"><small>Media</small><div class="num">${n0(media('kcal'))} <span>kcal</span></div></div>
        <div class="tarjeta dato"><small>Proteína</small><div class="num">${n0(media('prot'))} <span>g</span></div></div>
        <div class="tarjeta dato"><small>Entrenos</small><div class="num">${sesionesTerminadas().filter((s) => s.fecha >= d.dias[0] && s.fecha <= d.dias[6]).length} <span>de 4</span></div></div>
      </div>`}
      <div class="tarjeta">
        ${r.filas.every((f) => f.total.kcal === 0)
          ? html`<${Vacio} titulo="Sin comidas esta semana">Apunta lo que comas en Comida y aquí verás cada día frente a tu objetivo.<//>`
          : html`<div class="dato"><small>Kcal por día · la línea es el objetivo de un día de gimnasio</small></div>
            <${GraficaBarras} datos=${r.filas.map((f, i) => ({ etq: LETRAS[i], v: f.total.kcal, si: f.huboGym }))} objetivo=${E.config.objetivos.kcalEntreno} />
            <p class="t2 peq" style="margin-top:8px">${cerrados.length === 0 ? 'Las medias salen cuando termine el primer día con comidas apuntadas.'
              : `En ${cerrados.length} ${cerrados.length === 1 ? 'día completo' : 'días completos'}: ${desvio > 0 ? `${n0(desvio)} kcal por encima` : `${n0(-desvio)} kcal por debajo`} de tu objetivo.`}</p>`}
        ${d.semana?.ajustePorDia
          ? html`<div class="sugerencia" style="margin-top:10px">Repartiendo ${d.semana.ajustePorDia} kcal al día hasta el domingo.</div>
              <button class="boton suave" style="margin-top:8px" onClick=${quitarReparto}>Quitar el reparto</button>`
          : reparto && desvio > 150 && html`<button class="boton suave" style="margin-top:10px" onClick=${aplicarReparto}>
              Repartir ${reparto.porDia} kcal al día en los ${r.diasRestantes} días que quedan</button>
              ${reparto.recortado && html`<p class="t2 peq" style="margin-top:6px">Tu suelo de ${E.config.objetivos.sueloKcal} kcal no deja bajar más: no se compensa entero esta semana.</p>`}`}
      </div>
    </div>`}

    ${QUIEN.cuerpo && html`<div class="seccion"><h2 class="titulo">Cuerpo</h2><button onClick=${() => ponerHoja('peso')}>Pesarme</button></div>
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
          <small>${principal ? principal.nombre : 'Medidas'}</small>
          <div class="num">${principal ? n1(principal.ultimo.cm) : '—'} <span>cm</span></div>
          <div class="t2 peq">${prox.toca ? 'toca medirse' : `próxima en ${prox.dias} ${prox.dias === 1 ? 'día' : 'días'}`}</div></button>
      </div>
    </div>

    <div class="seccion"><h2 class="titulo">Medidas</h2><button onClick=${() => ponerHoja('medidas')}>Medirme</button></div>
    <div class="pila">
      ${prox.toca
        ? html`<div class="sugerencia"><${Icono} n="reloj" t=${18} g=${2} />Toca medirse${prox.ultima ? `: la última fue el ${L.fechaLarga(prox.ultima)}` : ''}.</div>`
        : html`<p class="t2 peq" style="margin:0 4px">Cada ${S.PROTOCOLO_MEDIDAS.cadaDias / 7} semanas. La próxima, el ${L.fechaLarga(prox.fecha)}${prox.dias > 0 ? ` (en ${prox.dias} ${prox.dias === 1 ? 'día' : 'días'})` : ''}.</p>`}
      ${evolucion.length === 0
        ? html`<div class="tarjeta t2">Cuando te midas por primera vez, aquí verás cada medida y cuánto cambia respecto a la vez anterior.</div>`
        : evolucion.map((m) => html`<div class="tarjeta" key=${m.id}>
            <div class="fila-f" style="justify-content:space-between;align-items:flex-start">
              <div class="dato crece"><small>${m.nombre}</small>
                <div class="num">${n1(m.ultimo.cm)} <span>cm</span></div>
                <div class="t2 peq">${L.fechaLarga(m.ultimo.fecha)}</div>
              </div>
              ${m.cambio != null
                ? html`<span class="pastilla">${m.cambio > 0 ? '+' : ''}${n1(m.cambio)} cm</span>`
                : html`<span class="t2 peq">primera medición</span>`}
            </div>
            ${m.cambio != null && html`<p class="t2 peq" style="margin-top:8px">
              ${m.cambio === 0 ? 'Igual que' : `${m.cambio > 0 ? '+' : '−'}${n1(Math.abs(m.cambio))} cm desde`} la medición del ${L.fechaCorta(m.anterior.fecha)}, ${m.dias} días antes (${n1(m.anterior.cm)} cm).</p>`}
            ${m.puntos.length >= 2 && html`<${GraficaLinea} puntos=${m.puntos.slice(-12).map((x) => ({ etq: L.fechaCorta(x.fecha), y: x.cm }))} sufijo=" cm" />`}
          </div>`)}
    </div>`}

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
        ? html`<div class="lista">${filas.slice(0, 5).map(({ ej, rec, prog }) => html`
            <button class="item" onClick=${() => ir('ejercicio/' + ej.id)}>
              <div class="crece"><div class="nombre corta">${ej.nombre}</div>
                <div class="meta">Mejor: ${n1(rec.mejorPeso.peso)} kg × ${rec.mejorPeso.reps}${rec.rm > 0 ? ` · máximo calculado ${n0(rec.rm)} kg` : ''}</div></div>
              ${prog.mejora != null && html`<span class="pastilla">${prog.mejora >= 0 ? '+' : ''}${n0(prog.mejora)} %</span>`}
            </button>`)}
            ${filas.length > 5 && html`<button class="item" onClick=${() => ir('ejercicios')}>
              <span class="crece" style="color:var(--enlace);font-weight:600">Ver los ${filas.length} ejercicios</span>
              <${Icono} n="chevron" t=${18} g=${2.2} clase="chevron" /></button>`}
          </div>`
        : html`<div class="tarjeta t2">Cuando termines tu primer entreno, aquí verás cuánto sube cada ejercicio.</div>`}
    </div>`;
}

// ---------------------------------------------------------------- pasar a Claude

// El texto se prepara al elegir el periodo, no al pulsar: el iPhone solo deja copiar o
// compartir justo en el momento del toque, sin esperas de por medio.
function PasarAClaude() {
  const [alcance, ponerAlcance] = useState(28);
  const [datos, ponerDatos] = useState(null);
  useEffect(() => { ponerDatos(null); textoTodo(alcance).then(ponerDatos); }, [alcance, E.sesiones.length, E.series.length]);

  const copiarlo = async () => {
    const ok = await copiar(datos.texto);
    toast(ok ? 'Copiado: pégalo en Claude y pídele que lo analice' : 'No se ha podido copiar', 3000);
  };
  const compartir = async () => {
    const archivo = new File([datos.texto], `mis-datos-${L.hoyISO()}.txt`, { type: 'text/plain' });
    try {
      if (navigator.canShare?.({ files: [archivo] })) await navigator.share({ files: [archivo], title: 'Mis datos de Entreno' });
      else await copiarlo();
    } catch (e) { if (e?.name !== 'AbortError') toast('No se ha podido compartir'); }
  };

  return html`
    <div class="seccion"><h2 class="titulo">Pasar a Claude</h2></div>
    <div class="tarjeta pila">
      <p class="t2 peq">${QUIEN.comida
        ? 'Todo lo que has apuntado, día a día: cada comida con sus macros y el total frente a tu objetivo, cada entreno con todas sus series, el peso, los pasos y las medidas. Pégalo en Claude y pídele que lo analice.'
        : 'Todos tus entrenos con cada serie: peso, repeticiones y RIR. Pégalo en Claude y pídele que lo analice.'}</p>
      <div class="segmentado">
        ${[[7, 'Última semana'], [28, '4 semanas'], [0, 'Todo']].map(([d, t]) => html`<button class=${alcance === d ? 'activo' : ''} onClick=${() => ponerAlcance(d)}>${t}</button>`)}
      </div>
      <p class="t2 peq">${datos ? `${datos.dias} ${datos.dias === 1 ? 'día' : 'días'} con datos${QUIEN.comida ? ` · ${datos.comidas} ${datos.comidas === 1 ? 'comida' : 'comidas'}` : ''} · ${datos.entrenos} ${datos.entrenos === 1 ? 'entreno' : 'entrenos'}` : 'Preparando el texto…'}</p>
      <div class="dos-botones">
        <button class="boton" disabled=${!datos} onClick=${copiarlo}><${Icono} n="compartir" t=${20} g=${2.2} />Copiar</button>
        <button class="boton suave" disabled=${!datos} onClick=${compartir}><${Icono} n="guardar" t=${20} g=${2.2} />Archivo</button>
      </div>
      <p class="t2 peq">«Archivo» sirve cuando el texto es muy largo para pegarlo: lo mandas a Claude como archivo adjunto.</p>
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

// El protocolo se enseña entero cada vez: medir siempre igual es lo que hace que los
// números se puedan comparar. Debajo de cada campo, dónde va exactamente la cinta.
function HojaMedidas({ previa, alCerrar, alGuardar }) {
  const [v, ponerV] = useState({});
  const [marcados, ponerMarcados] = useState({});
  const guardar = async () => {
    const hoy = L.hoyISO();
    const fila = { fecha: hoy };
    for (const m of S.MEDIDAS) { const n = aNum(v[m.id]); if (n) fila[m.id] = n; }
    if (Object.keys(fila).length === 1) { toast('Apunta al menos una medida'); return; }
    // Si hoy ya habías apuntado alguna, se completan en la misma fila en vez de perderse.
    const ya = (await db.obtener('medidas', hoy)) || {};
    await db.guardar('medidas', { ...ya, ...fila });
    toast('Medidas guardadas'); alGuardar(); alCerrar();
  };
  return html`<${Hoja} titulo="Medidas de hoy" alCerrar=${alCerrar}>
    <div class="tarjeta" style="margin-bottom:14px">
      <div class="ej-nombre">Antes de medir</div>
      <div style="margin-top:8px">
        ${S.PROTOCOLO_MEDIDAS.pasos.map((p, k) => html`<button class=${`paso-cal ${marcados[k] ? 'hecho' : ''}`} key=${k}
          onClick=${() => ponerMarcados({ ...marcados, [k]: !marcados[k] })}>
          <i>${marcados[k] ? html`<${Icono} n="check" t=${14} g=${3} />` : null}</i><span>${p}</span>
        </button>`)}
      </div>
    </div>
    <div class="pila" style="margin-bottom:14px">
      ${S.MEDIDAS.map((m) => html`<div key=${m.id}>
        <label class="campo"><span>${m.nombre} (cm)${previa?.[m.id] ? ` · antes ${n1(previa[m.id])}` : ''}</span>
          <input class="entrada num" inputmode="decimal" value=${v[m.id] || ''}
            onInput=${(e) => { const x = e.currentTarget.value; ponerV((p) => ({ ...p, [m.id]: x })); }} /></label>
        <p class="t2 peq" style="margin:4px 4px 0">${m.definicion}</p>
      </div>`)}
    </div>
    <p class="t2 peq" style="margin-bottom:12px">Apunta solo las que midas: las que dejes vacías se quedan como estaban.</p>
    <button class="boton" onClick=${guardar}>Guardar medidas</button>
  <//>`;
}
