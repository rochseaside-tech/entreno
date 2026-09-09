// vistas/progreso.js — la semana, el peso, la fuerza por ejercicio y las medidas.
// Lo que importa es la media, no el día suelto: la vista está montada así.

import * as db from '../db.js';
import * as L from '../logica.js';
import * as S from '../seed.js';
import { estado, cabecera, ir, pintar as repintar } from '../app.js';
import { h, vaciar, n0, n1, n2, graficoLinea, graficoBarras, toast, confirmar, pedirNumero, pon } from '../ui.js';

const PESTANAS = [['semana', 'Semana'], ['peso', 'Peso'], ['fuerza', 'Fuerza'], ['medidas', 'Medidas']];

export async function pintar(raiz, params) {
  const pestana = params.pestana || 'semana';
  cabecera('Progreso', PESTANAS.find((p) => p[0] === pestana)?.[1] || '');

  pon(raiz, h('div', { class: 'segmentos', style: 'margin-bottom:14px' },
    ...PESTANAS.map(([id, txt]) => h('button', {
      class: pestana === id ? 'sel chico' : 'chico',
      onClick: () => ir('progreso', { pestana: id }),
    }, txt))));

  const cuerpo = h('div');
  pon(raiz, cuerpo);

  if (pestana === 'semana') await pintarSemana(cuerpo, params);
  else if (pestana === 'peso') await pintarPeso(cuerpo);
  else if (pestana === 'fuerza') await pintarFuerza(cuerpo, params);
  else await pintarMedidas(cuerpo);
}

// ------------------------------------------------------------------ semana

async function pintarSemana(raiz, params) {
  const refFecha = params.semana || L.hoyISO();
  const dias = L.diasDeSemana(refFecha);
  const semana = L.semanaISO(refFecha);
  const esActual = semana === L.semanaISO(L.hoyISO());

  const [comidas, sesiones, pesos, ajuste] = await Promise.all([
    db.porRangoFecha('comidas', dias[0], dias[6]),
    db.porRangoFecha('sesiones', dias[0], dias[6]),
    db.porRangoFecha('peso', dias[0], dias[6]),
    db.obtener('semanas', semana),
  ]);

  const comidasPorDia = new Map();
  for (const c of comidas) {
    if (!comidasPorDia.has(c.fecha)) comidasPorDia.set(c.fecha, []);
    comidasPorDia.get(c.fecha).push(c);
  }
  const sesionesPorDia = new Map();
  for (const s of sesiones.filter((x) => x.fin)) {
    if (!sesionesPorDia.has(s.fecha)) sesionesPorDia.set(s.fecha, []);
    sesionesPorDia.get(s.fecha).push(s);
  }
  const pesosMapa = new Map(pesos.map((p) => [p.fecha, p.kg]));

  const r = L.resumenSemana({
    dias, comidasPorDia, sesionesPorDia, pesos: pesosMapa,
    ajustePorDia: ajuste?.ajustePorDia || 0,
  });

  // navegación
  pon(raiz, h('div', { class: 'fila entre', style: 'margin-bottom:12px' },
    h('button', { class: 'chico', onClick: () => ir('progreso', { pestana: 'semana', semana: L.sumarDias(dias[0], -7) }) }, '◀'),
    h('button', { class: 'chico crece', onClick: () => ir('progreso', { pestana: 'semana' }) },
      esActual ? 'Esta semana' : `${L.fechaCorta(dias[0])} – ${L.fechaCorta(dias[6])}`),
    h('button', {
      class: 'chico', disabled: dias[6] >= L.hoyISO(),
      onClick: () => ir('progreso', { pestana: 'semana', semana: L.sumarDias(dias[0], 7) }),
    }, '▶')));

  pon(raiz, h('div', { class: 'tarjeta' },
    h('div', { class: 'fila entre' },
      h('div', { class: 'dato' },
        h('div', { class: 'n' }, n0(r.mediaKcal)),
        h('div', { class: 'e' }, 'kcal de media al día')),
      h('div', { class: 'dato', style: 'text-align:right' },
        h('div', { class: 'n' }, `${n0(r.mediaProt)} g`),
        h('div', { class: 'e' }, 'proteína de media'))),
    h('div', { class: 'fila entre', style: 'margin-top:14px' },
      h('div', { class: 'dato' },
        h('div', { class: 'n' }, String(r.sesiones)),
        h('div', { class: 'e' }, 'sesiones de gimnasio')),
      h('div', { class: 'dato', style: 'text-align:right' },
        h('div', { class: 'n' }, `${r.diasRegistrados}/7`),
        h('div', { class: 'e' }, 'días con comida anotada'))),
    r.pesoInicio !== null && r.pesoFin !== null && h('div', { class: 'pequeno apagado', style: 'margin-top:12px' },
      `Peso: ${n1(r.pesoInicio)} kg → ${n1(r.pesoFin)} kg`)));

  // gráfico de kcal por día
  const barras = r.filas.map((f) => ({
    etiqueta: ['L', 'M', 'X', 'J', 'V', 'S', 'D'][(L.desdeISO(f.fecha).getDay() + 6) % 7],
    valor: Math.round(f.total.kcal),
  }));
  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Calorías por día'),
    h('p', { class: 'pequeno apagado' }, 'La línea de puntos es el objetivo medio de la semana.'),
    graficoBarras(barras, { objetivo: Math.round(r.filas.reduce((t, f) => t + f.objetivo.base, 0) / 7) })));

  // desvío y reparto manual
  const tarjetaDesvio = h('div', { class: 'tarjeta' }, h('h3', {}, 'Cómo va la semana'));
  if (r.desvio === 0 && r.diasRegistrados === 0) {
    pon(tarjetaDesvio, h('p', { class: 'apagado pequeno' }, 'Sin datos todavía esta semana.'));
  } else {
    pon(tarjetaDesvio, h('p', {},
      r.desvio > 0
        ? `Vas ${n0(r.desvio)} kcal por encima del presupuesto de los días transcurridos.`
        : `Vas ${n0(-r.desvio)} kcal por debajo del presupuesto de los días transcurridos.`));

    if (ajuste?.ajustePorDia) {
      pon(tarjetaDesvio, h('div', { class: 'aviso info' },
        `Reparto activo: ${ajuste.ajustePorDia > 0 ? '+' : ''}${n0(ajuste.ajustePorDia)} kcal al día desde el ${L.fechaCorta(ajuste.desde)}.`),
        h('button', {
          class: 'fantasma ancho', onClick: async () => {
            await db.borrar('semanas', semana);
            toast('Reparto quitado.'); repintar();
          },
        }, 'Quitar el reparto'));
    } else if (esActual && r.diasRestantes > 0 && r.desvio !== 0) {
      const sug = L.repartoSugerido(r.desvio, r.diasRestantes);
      pon(tarjetaDesvio, 
        h('p', { class: 'pequeno apagado' },
          `Si quieres cuadrarla, serían ${sug.porDia > 0 ? '+' : ''}${n0(sug.porDia)} kcal al día en los ${r.diasRestantes} días que quedan.` +
          (sug.recortado ? ` (El reparto ideal sería ${n0(sug.ideal)}, pero se respeta el suelo de ${S.OBJETIVOS.sueloKcal} kcal.)` : '')),
        h('button', {
          class: 'principal ancho', onClick: async () => {
            await db.guardar('semanas', { semana, ajustePorDia: sug.porDia, desde: L.hoyISO(), desvio: r.desvio });
            toast('Reparto aplicado a los días que quedan.');
            repintar();
          },
        }, 'Repartir el desvío'));
    } else if (!esActual) {
      pon(tarjetaDesvio, h('p', { class: 'pequeno apagado' }, 'Semana cerrada.'));
    }
  }
  pon(raiz, tarjetaDesvio);

  // detalle por día
  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Día a día'),
    h('ul', { class: 'lista pequeno' }, ...r.filas.map((f) => h('li', {},
      h('span', { class: 'crece' }, L.fechaLarga(f.fecha), f.huboGym ? ' · gym' : ''),
      h('span', { class: 'mono' }, f.registrado ? `${n0(f.total.kcal)} / ${n0(f.objetivo.kcal)}` : '—'))))));
}

// ------------------------------------------------------------------ peso

async function pintarPeso(raiz) {
  const [pesos, pasos] = await Promise.all([db.todos('peso'), db.todos('pasos')]);
  if (!pesos.length) {
    pon(raiz, h('div', { class: 'aviso info' }, 'Todavía no has anotado ningún peso. Anótalo desde la pantalla de Hoy.'));
  } else {
    const serie = L.mediaMovil(pesos);
    const ritmo = L.ritmoSemanal(serie);
    const val = L.valoracionRitmo(ritmo);
    const ultima = serie[serie.length - 1];
    const base = serie[0];

    pon(raiz, h('div', { class: 'tarjeta' },
      h('div', { class: 'fila entre' },
        h('div', { class: 'dato heroe' },
          h('div', { class: 'n' }, `${n1(ultima.media)} kg`),
          h('div', { class: 'e' }, 'media de 7 días')),
        h('div', { class: 'dato', style: 'text-align:right' },
          h('div', { class: 'n' }, `${n1(ultima.kg)} kg`),
          h('div', { class: 'e' }, `peso del ${L.fechaCorta(ultima.fecha)}`))),
      h('div', { class: `aviso ${val.estado === 'ok' ? 'ok' : val.estado === 'alto' ? '' : 'info'}`, style: 'margin-top:12px' },
        val.texto),
      h('p', { class: 'pequeno apagado' },
        `Desde el ${L.fechaCorta(base.fecha)}: ${n1(ultima.media - base.media)} kg sobre la media. Objetivo ${estado.config.perfil.ritmoMin}-${estado.config.perfil.ritmoMax} kg por semana.`)));

    const x = (f) => L.diasEntre(serie[0].fecha, f);
    pon(raiz, h('div', { class: 'tarjeta' },
      h('h3', {}, 'Peso y media de 7 días'),
      h('p', { class: 'pequeno apagado' }, 'La línea verde es la media. La gris, el peso de cada día.'),
      graficoLinea([
        { valores: serie.map((p) => ({ x: x(p.fecha), y: p.kg })), clase: 'tenue', puntos: false },
        { valores: serie.map((p) => ({ x: x(p.fecha), y: p.media })), clase: 'media', puntos: false },
      ], { sufijo: '', etiquetasX: [
        { x: 0, texto: L.fechaCorta(serie[0].fecha) },
        { x: x(ultima.fecha), texto: L.fechaCorta(ultima.fecha) },
      ] })));
  }

  // pasos
  const hoy = L.hoyISO();
  const ultimos = Array.from({ length: 14 }, (_, i) => L.sumarDias(hoy, -(13 - i)));
  const mapaPasos = new Map(pasos.map((p) => [p.fecha, p.pasos]));
  const conDato = ultimos.filter((f) => mapaPasos.has(f));
  const media = conDato.length ? conDato.reduce((t, f) => t + mapaPasos.get(f), 0) / conDato.length : 0;

  pon(raiz, h('div', { class: 'tarjeta' },
    h('div', { class: 'fila entre' },
      h('h3', { class: 'crece' }, 'Pasos, últimos 14 días'),
      h('span', { class: 'etiqueta' }, `media ${n0(media)}`)),
    graficoBarras(ultimos.map((f) => ({
      etiqueta: L.desdeISO(f).getDate() % 5 === 0 ? String(L.desdeISO(f).getDate()) : '',
      valor: mapaPasos.get(f) || 0,
    })), { objetivo: estado.config.perfil.pasosObjetivo })));

  pon(raiz, h('button', {
    class: 'fantasma ancho', onClick: async () => {
      const f = prompt('Fecha (AAAA-MM-DD)', hoy);
      if (!f) return;
      const kg = await pedirNumero(`Peso del ${f}`, { unidad: 'kg', paso: '0.1' });
      if (kg === null) return;
      await db.guardar('peso', { fecha: f, kg });
      toast('Guardado.'); repintar();
    },
  }, 'Añadir un peso de otro día'));
}

// ------------------------------------------------------------------ fuerza

async function pintarFuerza(raiz, params) {
  const todas = await db.todos('series');
  const conDatos = [...new Set(todas.map((s) => s.ejercicioId))];

  if (!conDatos.length) {
    pon(raiz, h('div', { class: 'aviso info' }, 'Aún no hay series registradas. En cuanto entrenes, aquí verás la evolución de cada ejercicio.'));
    return;
  }

  const elegido = params.ej && conDatos.includes(params.ej) ? params.ej : conDatos[0];
  const sel = h('select', {
    onChange: (e) => ir('progreso', { pestana: 'fuerza', ej: e.target.value }),
  }, ...conDatos.map((id) => h('option', {
    value: id, selected: id === elegido,
  }, estado.ejercicioPorId.get(id)?.nombre || id)));
  pon(raiz, h('div', { class: 'campo' }, h('label', {}, 'Ejercicio'), sel));

  const ej = estado.ejercicioPorId.get(elegido);
  const series = todas.filter((s) => s.ejercicioId === elegido);
  const prog = L.progresionEjercicio(series);

  pon(raiz, h('div', { class: 'tarjeta' },
    h('div', { class: 'fila entre' },
      h('div', { class: 'dato' },
        h('div', { class: 'n' }, L.formatoPeso(prog.fin ?? prog.puntos[0]?.peso)),
        h('div', { class: 'e' }, 'peso actual')),
      h('div', { class: 'dato', style: 'text-align:right' },
        h('div', { class: 'n', style: prog.mejora > 0 ? 'color:var(--ok)' : '' },
          prog.mejora === null ? '—' : `${prog.mejora > 0 ? '+' : ''}${n1(prog.mejora)}%`),
        h('div', { class: 'e' }, 'desde el inicio'))),
    h('p', { class: 'pequeno apagado', style: 'margin-top:10px' },
      `${prog.puntos.length} ${prog.puntos.length === 1 ? 'sesión' : 'sesiones'} registradas${prog.puntos.length > 1 ? ` · de ${L.formatoPeso(prog.inicio)} a ${L.formatoPeso(prog.fin)}` : ''}.`)));

  if (prog.puntos.length > 1) {
    const x = (f) => L.diasEntre(prog.puntos[0].fecha, f);
    pon(raiz, h('div', { class: 'tarjeta' },
      h('h3', {}, 'Peso máximo por sesión'),
      graficoLinea([{ valores: prog.puntos.map((p) => ({ x: x(p.fecha), y: p.peso })) }], {
        sufijo: '', etiquetasX: [
          { x: 0, texto: L.fechaCorta(prog.puntos[0].fecha) },
          { x: x(prog.puntos[prog.puntos.length - 1].fecha), texto: L.fechaCorta(prog.puntos[prog.puntos.length - 1].fecha) },
        ],
      })));
  }

  // detalle de las últimas sesiones
  const grupos = L.agruparPorSesion(series).slice(-8).reverse();
  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Últimas sesiones'),
    h('ul', { class: 'lista pequeno' }, ...grupos.map((g) => h('li', {},
      h('span', { class: 'crece' }, L.fechaCorta(g.fecha)),
      h('span', { class: 'mono' },
        `${L.formatoPeso(g.pesoMax)} × ${g.series.map((s) => s.reps).join(',')} · RIR ${g.series.map((s) => s.rir ?? '—').join(',')}`))))));

  if (ej) {
    pon(raiz, h('div', { class: 'tarjeta' },
      h('h3', {}, 'Técnica'),
      h('ul', { class: 'lista pequeno apagado' }, ...ej.claves.map((c) => h('li', {}, c)))));
  }
}

// ------------------------------------------------------------------ medidas

async function pintarMedidas(raiz) {
  const medidas = (await db.todos('medidas')).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const hoy = L.hoyISO();
  const ultima = medidas[0];

  pon(raiz, h('p', { class: 'apagado pequeno' }, 'Cintura, cadera y muslo cada 4 semanas. Mide siempre a la misma hora y en las mismas condiciones.'));

  const campos = {};
  const campo = (id, etiqueta) => {
    campos[id] = h('input', { type: 'number', inputmode: 'decimal', step: '0.5', placeholder: ultima ? String(ultima[id] ?? '') : '' });
    return h('div', { class: 'campo' }, h('label', {}, etiqueta), campos[id]);
  };

  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, `Medidas de hoy, ${L.fechaCorta(hoy)}`),
    h('div', { class: 'campos3', style: 'margin-top:10px' },
      campo('cintura', 'Cintura'), campo('cadera', 'Cadera'), campo('muslo', 'Muslo')),
    h('button', {
      class: 'principal ancho', onClick: async () => {
        const fila = { fecha: hoy };
        for (const k of ['cintura', 'cadera', 'muslo']) {
          const v = parseFloat(campos[k].value);
          if (!isNaN(v)) fila[k] = v;
        }
        if (Object.keys(fila).length === 1) return toast('No has puesto ninguna medida.');
        await db.guardar('medidas', fila);
        toast('Medidas guardadas.'); repintar();
      },
    }, 'Guardar medidas')));

  if (medidas.length) {
    pon(raiz, h('div', { class: 'tarjeta' },
      h('h3', {}, 'Histórico'),
      h('ul', { class: 'lista pequeno' }, ...medidas.map((m, i) => {
        const prev = medidas[i + 1];
        const dif = (k) => (prev && m[k] != null && prev[k] != null)
          ? ` (${m[k] - prev[k] > 0 ? '+' : ''}${n1(m[k] - prev[k])})` : '';
        return h('li', {},
          h('span', { class: 'crece' }, L.fechaCorta(m.fecha)),
          h('span', { class: 'mono' },
            `C ${m.cintura ?? '—'}${dif('cintura')} · Ca ${m.cadera ?? '—'}${dif('cadera')} · M ${m.muslo ?? '—'}${dif('muslo')}`));
      }))));
  }
}
