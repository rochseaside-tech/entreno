// vistas/entreno.js — la sesión en el gimnasio. Pocos textos, botones grandes,
// el peso ya precargado y el RIR obligatorio.

import * as db from '../db.js';
import * as L from '../logica.js';
import * as S from '../seed.js';
import { estado, cabecera, ir, pintar as repintar } from '../app.js';
import { h, vaciar, qs, stepper, segmentos, toast, confirmar, hoja, pitido, vibrar, n0, n1, pon } from '../ui.js';

let cronoSesion = null;   // intervalo del tiempo de sesión
let cronoDescanso = null; // intervalo del descanso
let nodoDescanso = null;
let alTicDescanso = null;  // la ficha abierta se suscribe aquí: el diálogo tapa el crono flotante

function limpiarCronos() {
  clearInterval(cronoSesion); cronoSesion = null;
  clearInterval(cronoDescanso); cronoDescanso = null;
  nodoDescanso?.remove(); nodoDescanso = null;
  alTicDescanso = null;
}

export async function pintar(raiz, params) {
  limpiarCronos();

  // Arrancar una sesión pedida desde otra pantalla
  if (params.empezar && !estado.sesionActiva) {
    await empezarSesion(params.empezar);
    return ir('entreno');
  }

  if (estado.sesionActiva) return pintarSesion(raiz, estado.sesionActiva);
  return pintarElegir(raiz);
}

// ------------------------------------------------------------------ elegir sesión

async function pintarElegir(raiz) {
  cabecera('Entreno', 'Elige la sesión');
  const hechas = estado.sesiones.filter((s) => s.fin);
  const siguiente = L.siguienteSesion(hechas, S.ORDEN_SESIONES);
  const fase = estado.fase;

  if (fase.motivo) pon(raiz, h('div', { class: 'aviso info' }, fase.motivo));

  pon(raiz, h('p', { class: 'apagado pequeno' },
    'Las sesiones van en rotación continua A → B → C → D → A. No están atadas a días de la semana.'));

  for (const letra of S.ORDEN_SESIONES) {
    const plan = estado.rutina[letra];
    const ultima = [...hechas].reverse().find((s) => s.plan === letra);
    const esSiguiente = letra === siguiente;
    pon(raiz, h('button', {
      class: 'item', style: esSiguiente ? 'border-color:var(--acento)' : '',
      onClick: async () => { await empezarSesion(letra); ir('entreno'); },
    },
      h('div', { class: 'crece' },
        h('div', { class: 'tit' }, `Sesión ${letra} · ${plan.nombre}`),
        h('div', { class: 'sub' },
          `${plan.ejercicios.length} ejercicios · ` +
          (ultima ? `última vez ${L.fechaCorta(ultima.fecha)}` : 'nunca hecha'))),
      esSiguiente && h('span', { class: 'etiqueta acento' }, 'Te toca')));
  }

  const totales = hechas.length;
  if (totales) {
    pon(raiz, h('p', { class: 'apagado pequeno', style: 'margin-top:14px' },
      `${totales} ${totales === 1 ? 'sesión registrada' : 'sesiones registradas'} desde ${L.fechaCorta(hechas[0].fecha)}.`));
  }
}

async function empezarSesion(letra) {
  const fecha = L.hoyISO();
  const sesion = {
    id: db.nuevoId('s'), plan: letra, fecha,
    inicio: Date.now(), fin: null, notas: '', seriesTotal: 0,
  };
  await db.guardar('sesiones', sesion);
  if (!estado.config.primeraSesion) {
    const config = { ...estado.config, primeraSesion: fecha };
    await db.escribirMeta('config', config);
    estado.config = config;
  }
  estado.sesionActiva = sesion;
}

// ------------------------------------------------------------------ sesión en curso

async function pintarSesion(raiz, sesion) {
  const plan = estado.rutina[sesion.plan];
  const fase = estado.fase;
  cabecera(`Sesión ${sesion.plan}`, plan.nombre);

  const series = await db.porIndice('series', 'sesionId', sesion.id);
  const porEjercicio = new Map();
  for (const s of series) {
    if (!porEjercicio.has(s.ejercicioId)) porEjercicio.set(s.ejercicioId, []);
    porEjercicio.get(s.ejercicioId).push(s);
  }

  // ---- cronómetro de sesión ----
  const limite = estado.config.perfil.limiteSesionMin * 60;
  const reloj = h('span', { class: 'sesion-tiempo' }, '0:00');
  const tic = () => {
    const seg = Math.floor((Date.now() - sesion.inicio) / 1000);
    reloj.textContent = L.mmss(seg);
    reloj.classList.toggle('pasado', seg > limite);
  };
  tic();
  cronoSesion = setInterval(tic, 1000);

  pon(raiz, h('div', { class: 'tarjeta' },
    h('div', { class: 'fila entre' },
      h('div', { class: 'crece' },
        h('div', { class: 'pequeno apagado' }, `Límite ${estado.config.perfil.limiteSesionMin} min · sin cardio`),
        h('div', { style: 'font-size:1.6rem' }, reloj)),
      h('button', { class: 'chico', onClick: () => terminar(sesion, series.length) }, 'Terminar')),
    fase.motivo && h('div', { class: 'aviso info', style: 'margin:10px 0 0' }, fase.motivo)));

  // ---- lista de ejercicios ----
  for (const entrada of plan.ejercicios) {
    const ej = estado.ejercicioPorId.get(entrada.id);
    if (!ej) continue;
    const hechas = porEjercicio.get(ej.id) || [];
    const objetivo = L.seriesObjetivo(entrada.series, fase);
    const historico = await db.porIndice('series', 'ejercicioId', ej.id);
    const analisis = L.analizarEjercicio(ej, historico.filter((s) => s.sesionId !== sesion.id), fase);
    const ultima = L.resumenUltimaVez(analisis.ultima);

    pon(raiz, h('button', {
      class: `item${hechas.length >= objetivo ? ' hecho' : ''}`,
      onClick: () => abrirEjercicio({ sesion, ej, entrada, objetivo, fase }),
    },
      h('div', { class: 'crece' },
        h('div', { class: 'tit' }, ej.nombre),
        h('div', { class: 'sub' },
          `${hechas.length}/${objetivo} series · ${ej.repMin}-${ej.repMax} reps · RIR ${L.rirObjetivo(ej, fase)}`),
        ultima && h('div', { class: 'sub' }, `Última vez: ${ultima.texto}`),
        analisis.aviso && h('div', { class: 'sub', style: 'color:var(--aviso)' }, analisis.aviso.texto)),
      h('span', { class: 'etiqueta' }, `${hechas.length}/${objetivo}`)));
  }

  pon(raiz, h('button', { class: 'principal ancho grande', style: 'margin-top:10px', onClick: () => terminar(sesion, series.length) },
    'Terminar sesión'));
  pon(raiz, h('button', {
    class: 'peligro ancho fantasma', style: 'margin-top:8px',
    onClick: async () => {
      if (!await confirmar('Descartar la sesión', 'Se borra la sesión y las series que hayas registrado en ella. No se puede deshacer.', 'Descartar')) return;
      for (const s of series) await db.borrar('series', s.id);
      await db.borrar('sesiones', sesion.id);
      estado.sesionActiva = null;
      ir('entreno');
    },
  }, 'Descartar esta sesión'));
}

// ------------------------------------------------------------------ un ejercicio

async function abrirEjercicio({ sesion, ej, entrada, objetivo, fase }) {
  const cuerpo = h('div');
  const dlg = hoja(ej.nombre, cuerpo);

  async function refrescar() {
    const hechas = (await db.porIndice('series', 'sesionId', sesion.id)).filter((s) => s.ejercicioId === ej.id);
    hechas.sort((a, b) => a.indice - b.indice);
    const historico = (await db.porIndice('series', 'ejercicioId', ej.id)).filter((s) => s.sesionId !== sesion.id);
    const analisis = L.analizarEjercicio(ej, historico, fase);
    const ultima = L.resumenUltimaVez(analisis.ultima);

    const pesoBase = hechas.length
      ? hechas[hechas.length - 1].peso
      : (analisis.pesoSugerido ?? ej.pesoInicial ?? 0);
    const repsBase = hechas.length
      ? hechas[hechas.length - 1].reps
      : (analisis.ultima?.series?.[0]?.reps ?? ej.repMin);

    const pesoStep = stepper({ valor: pesoBase, paso: ej.incremento, min: 0, max: 500, decimales: 2 });
    const repsStep = stepper({ valor: repsBase, paso: 1, min: 1, max: 50, decimales: 0 });

    // El descanso, visible también aquí dentro: en el móvil esta ficha tapa el crono flotante.
    const panelDescanso = h('div', { class: 'aviso ok', style: 'display:none;font-size:1.05rem;font-weight:650' });
    alTicDescanso = (restan) => {
      panelDescanso.style.display = 'block';
      panelDescanso.textContent = restan > 0
        ? `Descanso: ${L.mmss(restan)}`
        : 'Descanso terminado. A por la siguiente.';
    };

    let rir = null;
    const btnGuardar = h('button', { class: 'principal ancho grande', disabled: true }, 'Guardar serie');
    const rirSeg = segmentos(
      [0, 1, 2, 3, 4, 5].map((v) => ({ valor: v, texto: String(v) })),
      { alElegir: (v) => { rir = v; btnGuardar.disabled = false; } });

    btnGuardar.addEventListener('click', async () => {
      if (rir === null) return toast('Falta el RIR.');
      const fila = {
        id: db.nuevoId('r'), sesionId: sesion.id, ejercicioId: ej.id, fecha: sesion.fecha,
        indice: hechas.length, peso: pesoStep.valor, reps: Math.round(repsStep.valor), rir,
        ts: Date.now(),
      };
      await db.guardar('series', fila);
      vibrar(40);
      arrancarDescanso(ej.descanso, ej.nombre);
      await refrescar();
    });

    pon(vaciar(cuerpo), 
      // qué hiciste la última vez
      ultima
        ? h('div', { class: 'aviso info' },
            h('div', {}, `Última vez (${L.fechaCorta(ultima.fecha)}): ${ultima.texto}`))
        : h('div', { class: 'aviso info' },
            `Primera vez que lo registras. Peso de partida: ${L.formatoPeso(ej.pesoInicial ?? null)}${ej.tipo === 'tantear' ? ' — toca tantear' : ''}.`),

      analisis.aviso && h('div', { class: `aviso${analisis.aviso.tipo === 'estancado' ? ' alerta' : ''}` }, analisis.aviso.texto),

      // objetivo de hoy
      h('div', { class: 'fila entre', style: 'margin:10px 0' },
        h('span', { class: 'etiqueta' }, `${objetivo} series`),
        h('span', { class: 'etiqueta' }, `${ej.repMin}-${ej.repMax} reps`),
        h('span', { class: 'etiqueta acento' }, `RIR ${L.rirObjetivo(ej, fase)}`),
        h('span', { class: 'etiqueta' }, `Descanso ${ej.descanso}s`)),

      // técnica
      tecnica(ej),

      // series ya registradas
      hechas.length ? h('div', { style: 'margin:14px 0' },
        h('h3', {}, 'Series de hoy'),
        h('ul', { class: 'lista' }, ...hechas.map((s) => h('li', {},
          h('span', { class: 'crece mono' }, `${s.indice + 1}. ${L.formatoPeso(s.peso)} × ${s.reps} · RIR ${s.rir}`),
          h('button', {
            class: 'chico fantasma', onClick: async () => { await db.borrar('series', s.id); await refrescar(); },
          }, 'Borrar'))))) : null,

      panelDescanso,

      // siguiente serie
      h('div', { class: 'tarjeta', style: 'margin-top:6px' },
        h('h3', {}, hechas.length >= objetivo ? `Serie extra (${hechas.length + 1})` : `Serie ${hechas.length + 1} de ${objetivo}`),
        h('label', { style: 'margin-top:8px' }, ej.tipo === 'corporal' ? 'Lastre en kg (0 = peso corporal)' : 'Peso en kg'),
        pesoStep,
        h('label', { style: 'margin-top:10px' }, 'Repeticiones'),
        repsStep,
        h('label', { style: 'margin-top:10px' }, 'RIR — repeticiones que te quedaban'),
        rirSeg,
        h('div', { style: 'height:12px' }),
        btnGuardar),

      h('button', { class: 'fantasma ancho', style: 'margin-top:10px', onClick: () => dlg.close() },
        hechas.length >= objetivo ? 'Ejercicio terminado' : 'Volver a la lista'));
  }

  dlg.addEventListener('close', () => { alTicDescanso = null; repintar(); });
  await refrescar();
}

function tecnica(ej) {
  const det = h('details', { style: 'margin:6px 0' },
    h('summary', { style: 'cursor:pointer;padding:10px 0;font-weight:620' }, 'Guía de técnica'),
    h('ul', { class: 'lista pequeno' }, ...ej.claves.map((c) => h('li', {}, c))),
    h('a', { class: 'boton chico fantasma', href: ej.youtube, target: '_blank', rel: 'noopener', style: 'margin-top:8px' },
      'Buscarlo en YouTube'));
  return det;
}

// ------------------------------------------------------------------ descanso

function arrancarDescanso(segundos, nombre) {
  clearInterval(cronoDescanso);
  nodoDescanso?.remove();

  const fin = Date.now() + segundos * 1000;
  const t = h('div', { class: 't' }, L.mmss(segundos));
  nodoDescanso = h('div', { class: 'crono' },
    t,
    h('div', { class: 'crece pequeno apagado' }, `Descanso · ${nombre}`),
    h('button', { class: 'chico fantasma', onClick: () => { clearInterval(cronoDescanso); nodoDescanso?.remove(); nodoDescanso = null; } }, 'Saltar'));
  document.body.append(nodoDescanso);

  cronoDescanso = setInterval(() => {
    const restan = Math.round((fin - Date.now()) / 1000);
    t.textContent = restan > 0 ? L.mmss(restan) : '¡Ya!';
    alTicDescanso?.(restan);
    if (restan <= 0) {
      clearInterval(cronoDescanso);
      nodoDescanso?.classList.add('fin');
      if (estado.config.sonidoDescanso !== false) pitido(2);
      if (estado.config.vibrar !== false) vibrar([120, 80, 120]);
      setTimeout(() => { nodoDescanso?.remove(); nodoDescanso = null; }, 8000);
    }
  }, 250);
}

// ------------------------------------------------------------------ terminar

async function terminar(sesion, seriesTotal) {
  const notas = h('textarea', { placeholder: 'Cómo ha ido la rodilla, el hombro, la energía…', value: sesion.notas || '' });
  const cuerpo = h('div', {},
    h('p', { class: 'apagado pequeno' }, `Sesión ${sesion.plan} · ${seriesTotal} series registradas · ${L.mmss((Date.now() - sesion.inicio) / 1000)}`),
    h('label', {}, 'Notas de la sesión'),
    notas,
    h('div', { class: 'botones columna', style: 'margin-top:14px' },
      h('button', {
        class: 'principal', onClick: async () => {
          const guardada = { ...sesion, fin: Date.now(), notas: notas.value.trim(), seriesTotal };
          await db.guardar('sesiones', guardada);
          estado.sesionActiva = null;
          limpiarCronos();
          dlg.close();
          toast('Sesión guardada.');
          ir('hoy');
        },
      }, 'Guardar y cerrar sesión'),
      h('button', { class: 'fantasma', onClick: () => dlg.close() }, 'Seguir entrenando')));
  const dlg = hoja('Terminar sesión', cuerpo);
}
