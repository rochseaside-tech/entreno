// vistas/comer.js — el día de comida al detalle, toma por toma.

import * as L from '../logica.js';
import * as S from '../seed.js';
import { cabecera, pintar as repintar, ir } from '../app.js';
import { cargarDia, comidasPorToma, borrarComida } from '../dia.js';
import { abrirSelector } from '../selector-comida.js';
import { h, n0, n1, barraProgreso, toast, pon } from '../ui.js';

export async function pintar(raiz, params) {
  const hoy = L.hoyISO();
  const fecha = params.fecha || hoy;
  const dia = await cargarDia(fecha);
  cabecera(fecha === hoy ? 'Hoy' : L.fechaLarga(fecha), dia.huboGym ? 'Día con gimnasio' : 'Día sin gimnasio');

  // -------- navegación de días --------
  pon(raiz, h('div', { class: 'fila entre', style: 'margin-bottom:12px' },
    h('button', { class: 'chico', onClick: () => ir('comer', { fecha: L.sumarDias(fecha, -1) }) }, '◀'),
    h('button', {
      class: 'chico crece', onClick: () => ir('comer', { fecha: hoy }),
    }, fecha === hoy ? 'Hoy' : L.fechaLarga(fecha)),
    h('button', {
      class: 'chico', disabled: fecha >= hoy,
      onClick: () => ir('comer', { fecha: L.sumarDias(fecha, 1) }),
    }, '▶')));

  // -------- resumen del día --------
  const { objetivo: o, totales: t } = dia;
  pon(raiz, h('div', { class: 'tarjeta' },
    h('div', { class: 'medidas' },
      h('div', {},
        h('div', { class: 'dato heroe' },
          h('div', { class: 'n' }, n0(t.kcal)),
          h('div', { class: 'e' }, `de ${n0(o.kcal)} kcal`)),
        h('div', { style: 'margin-top:10px' }, barraProgreso(t.kcal, o.kcal))),
      h('div', {},
        h('div', { class: 'dato' },
          h('div', { class: 'n' }, `${n0(t.prot)} g`),
          h('div', { class: 'e' }, `de ${o.prot} g proteína`)),
        h('div', { style: 'margin-top:10px' },
          barraProgreso(t.prot, o.prot, { clase: t.prot >= o.prot ? 'ok' : '' })))),
    h('div', { class: 'macros', style: 'margin-top:12px' },
      mini('Grasa', t.grasa, o.grasa), mini('Hidratos', t.hc, o.hc),
      mini('Fibra', t.fibra, null), mini('Sal', t.sal, null)),
    o.ajuste !== 0 && h('div', { class: 'pequeno apagado', style: 'margin-top:8px' },
      `Incluye ${o.ajuste > 0 ? '+' : ''}${n0(o.ajuste)} kcal del reparto semanal.`)));

  for (const a of dia.avisos) pon(raiz, h('div', { class: 'aviso' }, a.texto));

  // -------- tomas --------
  const porToma = comidasPorToma(dia.comidas);
  for (const toma of S.TOMAS) {
    const filas = porToma.get(toma.id) || [];
    const sum = L.sumarMacros(filas);
    pon(raiz, h('div', { class: 'tarjeta' },
      h('div', { class: 'fila entre' },
        h('div', { class: 'crece' },
          h('h3', {}, toma.nombre),
          h('div', { class: 'pequeno apagado' },
            `${toma.hora} · objetivo ${toma.kcal} kcal, ${toma.prot} g proteína`)),
        h('div', { style: 'text-align:right' },
          h('div', { class: 'mono', style: 'font-weight:700' }, `${n0(sum.kcal)} kcal`),
          h('div', { class: 'pequeno apagado mono' }, `${n1(sum.prot)} g P`))),

      filas.length ? h('ul', { class: 'lista', style: 'margin-top:8px' },
        ...filas.map((c) => h('li', {},
          h('div', { class: 'crece' },
            h('div', {}, c.nombre),
            h('div', { class: 'pequeno apagado' },
              `${formatoCantidad(c)} · ${n0(c.kcal)} kcal · ${n1(c.prot)} P · ${n1(c.grasa)} G · ${n1(c.hc)} H`)),
          h('button', {
            class: 'chico fantasma', 'aria-label': 'Borrar',
            onClick: async () => { await borrarComida(c.id); toast('Borrado.'); repintar(); },
          }, '×')))) : null,

      h('button', {
        class: filas.length ? 'fantasma ancho' : 'principal ancho',
        style: 'margin-top:10px',
        onClick: () => abrirSelector({ fecha, toma: toma.id, alGuardar: () => repintar() }),
      }, `+ Añadir a ${toma.nombre.toLowerCase()}`)));
  }

  // -------- recordatorios --------
  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Recuerda'),
    h('ul', { class: 'lista pequeno apagado' }, ...S.REGLAS.map((r) => h('li', {}, r)))));
}

function mini(etiqueta, valor, objetivo) {
  return h('div', { class: 'macro' },
    h('div', { class: 'n' }, `${n0(valor)}g`),
    h('div', { class: 'e' }, etiqueta),
    objetivo !== null && h('div', { class: 'e mono' }, `de ${n0(objetivo)}`));
}

function formatoCantidad(c) {
  if (c.medida === 'racion') return c.cantidad === 1 ? '1 ración' : `${n1(c.cantidad)} raciones`;
  if (c.medida === 'ud') return c.cantidad === 1 ? '1 unidad' : `${n0(c.cantidad)} unidades`;
  return `${n0(c.cantidad)} ${c.medida || 'g'}`;
}
