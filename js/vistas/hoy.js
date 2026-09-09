// vistas/hoy.js — resumen del día. Lo primero que ves al abrir la app.

import * as db from '../db.js';
import * as L from '../logica.js';
import * as S from '../seed.js';
import { estado, cabecera, ir, pintar as repintar } from '../app.js';
import { cargarDia, comidasPorToma } from '../dia.js';
import { abrirSelector } from '../selector-comida.js';
import { h, n0, n1, barraProgreso, pedirNumero, toast, pon } from '../ui.js';

export async function pintar(raiz) {
  const hoy = L.hoyISO();
  const fase = estado.fase;
  cabecera(L.fechaLarga(hoy), `Semana ${fase.semana} del bloque`);

  const dia = await cargarDia(hoy);

  // ---------------- aviso de fase ----------------
  if (fase.motivo) {
    pon(raiz, h('div', { class: 'aviso info' }, fase.motivo));
  }

  // ---------------- entrenamiento ----------------
  pon(raiz, tarjetaEntreno(dia));

  // ---------------- comida ----------------
  pon(raiz, await tarjetaComida(dia));

  // ---------------- seguimiento ----------------
  pon(raiz, await tarjetaSeguimiento(dia));

  // ---------------- recordatorios fijos ----------------
  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Dos reglas que se te escapan siempre'),
    h('ul', { class: 'lista pequeno apagado' },
      ...S.REGLAS.map((r) => h('li', {}, r)))));
}

// ------------------------------------------------------------------ entreno

function tarjetaEntreno(dia) {
  const activa = estado.sesionActiva;
  const hechas = estado.sesiones.filter((s) => s.fin);
  const historial = hechas;
  const siguiente = L.siguienteSesion(historial, S.ORDEN_SESIONES);
  const plan = estado.rutina[siguiente];
  const hoyHechas = dia.sesiones.filter((s) => s.fin);

  if (activa) {
    const mins = Math.floor((Date.now() - activa.inicio) / 60000);
    return h('div', { class: 'tarjeta' },
      h('div', { class: 'fila entre' },
        h('div', {}, h('span', { class: 'etiqueta acento' }, 'En curso'),
          h('h2', { style: 'margin-top:6px' }, `Sesión ${activa.plan} · ${estado.rutina[activa.plan]?.nombre || ''}`)),
        h('div', { class: 'dato' }, h('div', { class: 'n' }, `${mins}′`))),
      h('button', { class: 'principal ancho grande', style: 'margin-top:12px', onClick: () => ir('entreno') },
        'Continuar la sesión'));
  }

  if (hoyHechas.length) {
    const s = hoyHechas[hoyHechas.length - 1];
    return h('div', { class: 'tarjeta' },
      h('div', { class: 'fila entre' },
        h('h2', {}, `Sesión ${s.plan} hecha`),
        h('span', { class: 'etiqueta ok' }, `${Math.round((s.fin - s.inicio) / 60000)} min`)),
      h('p', { class: 'pequeno apagado', style: 'margin-top:8px' },
        `${s.seriesTotal || 0} series registradas.` + (s.notas ? ` Nota: ${s.notas}` : '')),
      h('button', { class: 'fantasma ancho', onClick: () => ir('entreno') }, 'Hacer otra sesión'));
  }

  return h('div', { class: 'tarjeta' },
    h('div', { class: 'fila entre' },
      h('div', { class: 'crece' },
        h('div', { class: 'pequeno apagado' }, 'Te toca'),
        h('h2', {}, `Sesión ${siguiente} · ${plan?.nombre || ''}`)),
      h('span', { class: 'etiqueta' }, `${plan?.ejercicios.length || 0} ejercicios`)),
    h('button', { class: 'principal ancho grande', style: 'margin-top:12px', onClick: () => ir('entreno', { empezar: siguiente }) },
      `Empezar sesión ${siguiente}`),
    h('button', { class: 'fantasma ancho', style: 'margin-top:8px', onClick: () => ir('entreno') },
      'Elegir otra'));
}

// ------------------------------------------------------------------ comida

async function tarjetaComida(dia) {
  const { objetivo, totales } = dia;
  const porToma = comidasPorToma(dia.comidas);
  const restanKcal = objetivo.kcal - totales.kcal;
  const restanProt = objetivo.prot - totales.prot;

  const bloque = h('div', { class: 'tarjeta' },
    h('div', { class: 'fila entre' },
      h('h2', { class: 'crece' }, 'Comida de hoy'),
      h('span', { class: 'etiqueta' }, dia.huboGym ? 'Día con gimnasio' : 'Día sin gimnasio')),

    dia.objetivo.ajuste !== 0 && h('div', { class: 'pequeno apagado', style: 'margin-top:4px' },
      `Objetivo ajustado ${dia.objetivo.ajuste > 0 ? '+' : ''}${n0(dia.objetivo.ajuste)} kcal por el reparto de la semana.`),

    // Cada regla justo debajo de su número, para que se sepa cuál es cuál.
    h('div', { class: 'medidas', style: 'margin:14px 0 4px' },
      h('div', {},
        h('div', { class: 'dato heroe' },
          h('div', { class: 'n' }, n0(totales.kcal)),
          h('div', { class: 'e' }, `de ${n0(objetivo.kcal)} kcal`)),
        h('div', { style: 'margin-top:10px' }, barraProgreso(totales.kcal, objetivo.kcal))),
      h('div', {},
        h('div', { class: 'dato' },
          h('div', { class: 'n' }, `${n0(totales.prot)} g`),
          h('div', { class: 'e' }, `de ${objetivo.prot} g de proteína`)),
        h('div', { style: 'margin-top:10px' },
          barraProgreso(totales.prot, objetivo.prot, { clase: totales.prot >= objetivo.prot ? 'ok' : '' })))),

    h('div', { class: 'macros', style: 'margin-top:12px' },
      celda('Grasa', totales.grasa, objetivo.grasa, 'g'),
      celda('Hidratos', totales.hc, objetivo.hc, 'g'),
      celda('Fibra', totales.fibra, null, 'g'),
      celda('Sal', totales.sal, null, 'g')),

    h('div', { class: 'pequeno apagado', style: 'margin-top:10px' },
      restanKcal >= 0
        ? `Te quedan ${n0(restanKcal)} kcal y ${n0(Math.max(0, restanProt))} g de proteína.`
        : `Vas ${n0(-restanKcal)} kcal por encima del objetivo de hoy.`));

  for (const a of dia.avisos) pon(bloque, h('div', { class: 'aviso', style: 'margin-top:10px' }, a.texto));

  // Botones por toma: los que faltan, arriba.
  const botones = h('div', { class: 'botones', style: 'margin-top:12px' });
  for (const t of S.TOMAS) {
    const hechas = porToma.get(t.id) || [];
    const kcal = L.sumarMacros(hechas).kcal;
    pon(botones, h('button', {
      class: hechas.length ? 'chico' : 'chico principal',
      onClick: () => abrirSelector({ fecha: dia.fecha, toma: t.id, alGuardar: () => repintar() }),
    }, hechas.length ? `${t.nombre} · ${n0(kcal)}` : `+ ${t.nombre}`));
  }
  pon(bloque, botones);
  pon(bloque, h('button', { class: 'fantasma ancho', style: 'margin-top:8px', onClick: () => ir('comer') },
    'Ver el detalle del día'));
  return bloque;
}

function celda(etiqueta, valor, objetivo, u) {
  return h('div', { class: 'macro' },
    h('div', { class: 'n' }, `${n0(valor)}${u}`),
    h('div', { class: 'e' }, etiqueta),
    objetivo !== null && h('div', { class: 'e mono' }, `de ${n0(objetivo)}`));
}

// ------------------------------------------------------------------ seguimiento

async function tarjetaSeguimiento(dia) {
  const hoy = dia.fecha;
  const pesos = await db.todos('peso');
  const serie = L.mediaMovil(pesos);
  const ultima = serie[serie.length - 1];
  const medidas = await db.todos('medidas');
  const ultimaMedida = medidas.sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).pop();
  const tocaMedir = !ultimaMedida || L.diasEntre(ultimaMedida.fecha, hoy) >= 28;

  const supl = (await db.leerMeta(`supl-${hoy}`, {})) || {};
  const marcar = async (k) => {
    supl[k] = !supl[k];
    await db.escribirMeta(`supl-${hoy}`, supl);
    repintar();
  };

  return h('div', { class: 'tarjeta' },
    h('h2', {}, 'Seguimiento'),
    h('div', { class: 'fila entre', style: 'margin:10px 0' },
      h('div', { class: 'dato' },
        h('div', { class: 'n' }, ultima ? `${n1(ultima.media)} kg` : '—'),
        h('div', { class: 'e' }, 'Media de 7 días' + (ultima && ultima.n < 4 ? ` (solo ${ultima.n} datos)` : ''))),
      h('div', { class: 'dato', style: 'text-align:right' },
        h('div', { class: 'n' }, dia.pasos !== null ? n0(dia.pasos) : '—'),
        h('div', { class: 'e' }, `de ${estado.config.perfil.pasosObjetivo} pasos`))),

    h('div', { class: 'botones' },
      h('button', {
        class: dia.peso === null ? 'principal crece' : 'crece', onClick: async () => {
          const v = await pedirNumero('Peso de hoy', {
            valor: dia.peso ?? (ultima ? n1(ultima.kg).replace(',', '.') : ''), unidad: 'kg', paso: '0.1',
            ayuda: 'El peso de un día suelto no dice nada; lo que importa es la media de 7 días.',
          });
          if (v === null) return;
          await db.guardar('peso', { fecha: hoy, kg: v });
          repintar();
        },
      }, dia.peso === null ? '+ Peso de hoy' : `Peso: ${n1(dia.peso)} kg`),
      h('button', {
        class: 'crece', onClick: async () => {
          const v = await pedirNumero('Pasos de hoy', { valor: dia.pasos ?? '', unidad: 'pasos', paso: '100' });
          if (v === null) return;
          await db.guardar('pasos', { fecha: hoy, pasos: Math.round(v) });
          repintar();
        },
      }, dia.pasos === null ? '+ Pasos' : `Pasos: ${n0(dia.pasos)}`)),

    h('div', { class: 'botones', style: 'margin-top:8px' },
      h('button', { class: supl.creatina ? 'chico crece' : 'chico crece fantasma', onClick: () => marcar('creatina') },
        `${supl.creatina ? '✓' : '○'} Creatina 6 g`),
      h('button', { class: supl.magnesio ? 'chico crece' : 'chico crece fantasma', onClick: () => marcar('magnesio') },
        `${supl.magnesio ? '✓' : '○'} Magnesio`)),

    tocaMedir && h('div', { class: 'aviso', style: 'margin-top:12px' },
      ultimaMedida
        ? `Han pasado ${L.diasEntre(ultimaMedida.fecha, hoy)} días desde las últimas medidas. Tocan cintura, cadera y muslo.`
        : 'Aún no has anotado medidas. Cintura, cadera y muslo para tener referencia.'),
    tocaMedir && h('button', { class: 'fantasma ancho', style: 'margin-top:8px', onClick: () => ir('progreso', { pestana: 'medidas' }) },
      'Anotar medidas'));
}
