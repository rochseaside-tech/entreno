// vistas/cocina.js — recetario, despensa, batch cooking del domingo y referencias.

import * as db from '../db.js';
import * as L from '../logica.js';
import * as S from '../seed.js';
import { estado, cabecera, ir, idDe, pintar as repintar } from '../app.js';
import { registrarComida } from '../dia.js';
import { h, vaciar, hoja, toast, confirmar, n0, n1, stepper, pon } from '../ui.js';

const PESTANAS = [
  ['recetas', 'Recetas'],
  ['despensa', 'Despensa'],
  ['batch', 'Domingo'],
  ['ref', 'Referencias'],
];

export async function pintar(raiz, params) {
  const pestana = params.pestana || 'recetas';
  cabecera('Cocina', PESTANAS.find((p) => p[0] === pestana)?.[1] || '');

  pon(raiz, h('div', { class: 'segmentos', style: 'margin-bottom:14px' },
    ...PESTANAS.map(([id, txt]) => h('button', {
      class: pestana === id ? 'sel chico' : 'chico',
      onClick: () => ir('cocina', { pestana: id }),
    }, txt))));

  const cuerpo = h('div');
  pon(raiz, cuerpo);

  if (pestana === 'recetas') await pintarRecetas(cuerpo);
  else if (pestana === 'despensa') await pintarDespensa(cuerpo);
  else if (pestana === 'batch') await pintarBatch(cuerpo);
  else await pintarReferencias(cuerpo);
}

const macrosDe = (r) => L.macrosReceta(r, estado.alimentoPorNombre);

// ------------------------------------------------------------------ recetas

async function pintarRecetas(raiz, filtroTag = null) {
  const tags = [...new Set(estado.recetas.flatMap((r) => r.tags || []))].sort();

  pon(raiz, h('div', { class: 'botones', style: 'margin-bottom:12px' },
    h('button', { class: filtroTag ? 'chico' : 'chico sel', onClick: () => { vaciar(raiz); pintarRecetas(raiz, null); } }, 'Todas'),
    ...tags.map((t) => h('button', {
      class: filtroTag === t ? 'chico sel' : 'chico',
      onClick: () => { vaciar(raiz); pintarRecetas(raiz, t); },
    }, t))));

  const lista = estado.recetas.filter((r) => !filtroTag || (r.tags || []).includes(filtroTag));
  for (const r of lista) {
    const m = macrosDe(r);
    pon(raiz, h('button', { class: 'item', onClick: () => abrirReceta(r) },
      h('div', { class: 'crece' },
        h('div', { class: 'tit' }, r.nombre),
        h('div', { class: 'sub' },
          `${r.raciones} ${r.raciones === 1 ? 'ración' : 'raciones'} · ${n0(m.kcal)} kcal · ${n1(m.prot)} P · ${n1(m.grasa)} G · ${n1(m.hc)} H por ración`),
        r.tiempo && h('div', { class: 'sub' }, `${r.tiempo} min`))));
  }

  pon(raiz, h('button', { class: 'principal ancho', style: 'margin-top:12px', onClick: () => editarReceta(null) },
    '+ Receta nueva'));
}

function abrirReceta(r) {
  const m = macrosDe(r);
  const total = L.macrosRecetaTotal(r, estado.alimentoPorNombre);
  const cuerpo = h('div', {},
    r.nota && h('p', { class: 'apagado pequeno' }, r.nota),

    h('div', { class: 'macros', style: 'margin:10px 0' },
      celda(n0(m.kcal), 'kcal'), celda(n1(m.prot), 'prot g'),
      celda(n1(m.grasa), 'grasa g'), celda(n1(m.hc), 'hidr g')),
    h('div', { class: 'macros', style: 'margin-bottom:10px' },
      celda(n1(m.fibra), 'fibra g'), celda(n1(m.sal), 'sal g'),
      celda(String(r.raciones), 'raciones'), celda(r.tiempo ? `${r.tiempo}′` : '—', 'tiempo')),

    h('h3', { style: 'margin-top:14px' }, 'Ingredientes, receta completa'),
    h('ul', { class: 'lista pequeno' },
      ...(r.ingredientes || []).map((i) => {
        const al = estado.alimentoPorNombre.get(i.nombre);
        const u = al?.medida === 'ud' ? (i.cantidad === 1 ? 'unidad' : 'unidades') : (al?.medida || 'g');
        return h('li', {},
          h('span', { class: 'crece' }, i.nombre),
          h('span', { class: 'mono apagado' }, `${n1(i.cantidad)} ${u}`));
      })),
    !(r.ingredientes || []).length && h('p', { class: 'apagado pequeno' }, 'Sin ingredientes desglosados.'),

    (r.ingredientes || []).length ? h('p', { class: 'pequeno apagado' },
      `Total de la olla: ${n0(total.kcal)} kcal, ${n1(total.prot)} g de proteína.`) : null,

    (r.pasos || []).length ? h('div', {},
      h('h3', { style: 'margin-top:14px' }, 'Cómo se hace'),
      h('ol', { class: 'pequeno apagado', style: 'padding-left:20px' }, ...r.pasos.map((p) => h('li', { style: 'margin-bottom:4px' }, p)))) : null,

    h('div', { class: 'botones columna', style: 'margin-top:16px' },
      h('button', { class: 'principal', onClick: () => registrarRacion(r, dlg) }, 'Registrar una ración'),
      h('button', { onClick: () => { dlg.close(); anadirAlPlan(r); } }, 'Añadir al plan del domingo'),
      h('button', { class: 'fantasma', onClick: () => { dlg.close(); editarReceta(r); } }, 'Editar receta')));

  const dlg = hoja(r.nombre, cuerpo);
}

function celda(n, e) {
  return h('div', { class: 'macro' }, h('div', { class: 'n' }, n), h('div', { class: 'e' }, e));
}

function registrarRacion(r, dlgPadre) {
  const m = macrosDe(r);
  const raciones = stepper({ valor: 1, paso: 0.5, min: 0.5, max: 10, decimales: 1 });
  const salida = h('div', { class: 'aviso info' }, `${n0(m.kcal)} kcal`);
  raciones.input.addEventListener('input', () => {
    salida.textContent = `${n0(m.kcal * raciones.valor)} kcal · ${n1(m.prot * raciones.valor)} g proteína`;
  });
  let toma = 'comida';
  const cuerpo = h('div', {},
    h('label', {}, 'Raciones'), raciones,
    h('label', { style: 'margin-top:12px' }, 'En qué toma'),
    h('div', { class: 'segmentos' }, ...S.TOMAS.map((t) => h('button', {
      class: t.id === toma ? 'sel chico' : 'chico',
      onClick: (e) => {
        toma = t.id;
        [...e.target.parentNode.children].forEach((b) => b.classList.remove('sel'));
        e.target.classList.add('sel');
      },
    }, t.nombre))),
    h('div', { style: 'margin-top:12px' }, salida),
    h('button', {
      class: 'principal ancho', style: 'margin-top:12px', onClick: async () => {
        await registrarComida({
          fecha: L.hoyISO(), toma, nombre: r.nombre, cantidad: raciones.valor, medida: 'racion',
          macros: L.escalarMacros(m, raciones.valor), origen: 'receta', refId: r.id,
        });
        dlg.close(); dlgPadre?.close();
        toast(`${r.nombre} registrado.`);
        ir('hoy');
      },
    }, 'Registrar'));
  const dlg = hoja(`Registrar ${r.nombre}`, cuerpo);
}

// -------- editor de recetas --------

function editarReceta(receta) {
  const r = receta
    ? JSON.parse(JSON.stringify(receta))
    : { id: null, nombre: '', raciones: 2, tiempo: null, tags: [], nota: '', ingredientes: [], pasos: [] };

  const nombre = h('input', { type: 'text', value: r.nombre, placeholder: 'Nombre de la receta' });
  const raciones = h('input', { type: 'number', inputmode: 'numeric', value: r.raciones, min: 1 });
  const tiempo = h('input', { type: 'number', inputmode: 'numeric', value: r.tiempo ?? '', placeholder: 'min' });
  const nota = h('textarea', { value: r.nota || '', placeholder: 'Notas: conservación, trucos…', style: 'min-height:64px' });
  const pasosTxt = h('textarea', { value: (r.pasos || []).join('\n'), placeholder: 'Un paso por línea', style: 'min-height:80px' });
  const listaIng = h('div');
  const resumen = h('div', { class: 'aviso info' });

  const recalcular = () => {
    const m = L.macrosReceta({ ...r, raciones: parseInt(raciones.value) || 1 }, estado.alimentoPorNombre);
    resumen.textContent = `Por ración: ${n0(m.kcal)} kcal · ${n1(m.prot)} P · ${n1(m.grasa)} G · ${n1(m.hc)} H · ${n1(m.fibra)} fibra`;
  };

  const pintarIng = () => {
    vaciar(listaIng);
    r.ingredientes.forEach((ing, i) => {
      const al = estado.alimentoPorNombre.get(ing.nombre);
      const u = al?.medida === 'ud' ? 'ud' : (al?.medida || 'g');
      const cant = h('input', {
        type: 'number', inputmode: 'decimal', step: 'any', value: ing.cantidad,
        style: 'max-width:110px',
        onInput: (e) => { ing.cantidad = parseFloat(e.target.value) || 0; recalcular(); },
      });
      pon(listaIng, h('div', { class: 'fila', style: 'margin-bottom:8px' },
        h('span', { class: 'crece pequeno' }, ing.nombre, !al ? ' (no está en la biblioteca)' : ''),
        cant, h('span', { class: 'pequeno apagado' }, u),
        h('button', {
          class: 'chico fantasma', onClick: () => { r.ingredientes.splice(i, 1); pintarIng(); recalcular(); },
        }, '×')));
    });
    recalcular();
  };
  pintarIng();

  const buscador = h('input', { type: 'search', placeholder: 'Añadir ingrediente…' });
  const sugerencias = h('div');
  buscador.addEventListener('input', () => {
    const q = buscador.value.trim().toLowerCase();
    vaciar(sugerencias);
    if (!q) return;
    for (const a of estado.alimentos.filter((x) => x.nombre.toLowerCase().includes(q)).slice(0, 6)) {
      pon(sugerencias, h('button', {
        class: 'chico', style: 'margin:4px 4px 0 0',
        onClick: () => {
          r.ingredientes.push({ nombre: a.nombre, cantidad: a.racion || 100 });
          buscador.value = ''; vaciar(sugerencias); pintarIng();
        },
      }, a.nombre));
    }
  });

  const cuerpo = h('div', {},
    h('div', { class: 'campo' }, h('label', {}, 'Nombre'), nombre),
    h('div', { class: 'campos2' },
      h('div', { class: 'campo' }, h('label', {}, 'Raciones'), raciones),
      h('div', { class: 'campo' }, h('label', {}, 'Tiempo (min)'), tiempo)),
    h('h3', { style: 'margin:8px 0' }, 'Ingredientes'),
    listaIng,
    buscador, sugerencias,
    h('div', { style: 'margin-top:12px' }, resumen),
    h('div', { class: 'campo', style: 'margin-top:12px' }, h('label', {}, 'Pasos'), pasosTxt),
    h('div', { class: 'campo' }, h('label', {}, 'Nota'), nota),
    h('div', { class: 'botones columna', style: 'margin-top:8px' },
      h('button', {
        class: 'principal', onClick: async () => {
          if (!nombre.value.trim()) return toast('Ponle nombre.');
          const guardar = {
            ...r,
            id: r.id || idDe(nombre.value),
            nombre: nombre.value.trim(),
            raciones: parseInt(raciones.value) || 1,
            tiempo: parseInt(tiempo.value) || null,
            nota: nota.value.trim(),
            pasos: pasosTxt.value.split('\n').map((s) => s.trim()).filter(Boolean),
          };
          await db.guardar('recetas', guardar);
          dlg.close();
          toast('Receta guardada.');
          repintar();
        },
      }, 'Guardar receta'),
      receta && h('button', {
        class: 'peligro', onClick: async () => {
          if (!await confirmar('Borrar receta', `Se borra "${receta.nombre}". No afecta a lo ya registrado.`, 'Borrar')) return;
          await db.borrar('recetas', receta.id);
          dlg.close(); toast('Receta borrada.'); repintar();
        },
      }, 'Borrar receta')));

  raciones.addEventListener('input', recalcular);
  const dlg = hoja(receta ? 'Editar receta' : 'Receta nueva', cuerpo);
  recalcular();
}

// ------------------------------------------------------------------ despensa

async function pintarDespensa(raiz) {
  pon(raiz, h('p', { class: 'apagado pequeno' },
    'Lo que sueles tener en casa. La lista de la compra del domingo descuenta lo que esté marcado.'));

  const porCat = new Map();
  for (const d of estado.despensa) {
    const cat = estado.alimentoPorNombre.get(d.nombre)?.cat || 'Otros';
    if (!porCat.has(cat)) porCat.set(cat, []);
    porCat.get(cat).push(d);
  }

  for (const [cat, items] of [...porCat].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
    pon(raiz, h('h3', { style: 'margin:14px 0 8px' }, cat));
    const cont = h('div', { class: 'botones' });
    for (const d of items) {
      pon(cont, h('button', {
        class: d.disponible ? 'chico' : 'chico fantasma',
        style: d.disponible ? '' : 'opacity:.55',
        onClick: async () => { await db.guardar('despensa', { ...d, disponible: !d.disponible }); repintar(); },
      }, `${d.disponible ? '✓' : '○'} ${d.nombre}`));
    }
    pon(raiz, cont);
  }

  const nuevo = h('input', { type: 'search', placeholder: 'Añadir de la biblioteca…' });
  const sug = h('div', { class: 'botones', style: 'margin-top:6px' });
  nuevo.addEventListener('input', () => {
    const q = nuevo.value.trim().toLowerCase();
    vaciar(sug);
    if (!q) return;
    const yaEsta = new Set(estado.despensa.map((d) => d.nombre));
    for (const a of estado.alimentos.filter((x) => !yaEsta.has(x.nombre) && x.nombre.toLowerCase().includes(q)).slice(0, 8)) {
      pon(sug, h('button', {
        class: 'chico', onClick: async () => {
          await db.guardar('despensa', { id: idDe(a.nombre), nombre: a.nombre, siempre: false, disponible: true });
          repintar();
        },
      }, `+ ${a.nombre}`));
    }
  });
  pon(raiz, h('div', { style: 'margin-top:18px' }, h('label', {}, 'Añadir a la despensa'), nuevo, sug));
}

// ------------------------------------------------------------------ batch cooking

function proximoDomingo() {
  const hoy = L.hoyISO();
  const d = L.desdeISO(hoy).getDay(); // 0 = domingo
  return d === 0 ? hoy : L.sumarDias(hoy, 7 - d);
}

async function pintarBatch(raiz) {
  const fecha = proximoDomingo();
  const planes = await db.porIndice('planes', 'fecha', fecha);
  const plan = planes[0] || { id: db.nuevoId('p'), fecha, lineas: [] };

  pon(raiz, h('div', { class: 'fila entre', style: 'margin-bottom:10px' },
    h('div', { class: 'crece' },
      h('h2', {}, 'Plan del domingo'),
      h('div', { class: 'pequeno apagado' }, `Para cocinar el ${L.fechaLarga(fecha)}, para las dos`)),
    h('span', { class: 'etiqueta' }, `${plan.lineas.length} platos`)));

  if (!plan.lineas.length) {
    pon(raiz, h('div', { class: 'aviso info' },
      'Aún no hay nada en el plan. Añade recetas y te calculo las raciones totales y la lista de la compra.'));
  }

  let racionesTotal = 0;
  const totalMacros = [];

  for (const linea of plan.lineas) {
    const r = estado.recetas.find((x) => x.id === linea.recetaId);
    if (!r) continue;
    const m = macrosDe(r);
    const raciones = r.raciones * linea.tandas;
    racionesTotal += raciones;
    totalMacros.push(L.escalarMacros(m, raciones));

    pon(raiz, h('div', { class: 'tarjeta' },
      h('div', { class: 'fila entre' },
        h('div', { class: 'crece' },
          h('div', { style: 'font-weight:650' }, r.nombre),
          h('div', { class: 'pequeno apagado' },
            `${raciones} raciones · ${n0(m.kcal)} kcal y ${n1(m.prot)} g proteína cada una`)),
        h('div', { class: 'botones' },
          h('button', {
            class: 'chico', onClick: async () => {
              linea.tandas = Math.max(1, linea.tandas - 1);
              await db.guardar('planes', plan); repintar();
            },
          }, '−'),
          h('span', { class: 'mono', style: 'min-width:2ch;text-align:center;align-self:center' }, `×${linea.tandas}`),
          h('button', {
            class: 'chico', onClick: async () => {
              linea.tandas += 1; await db.guardar('planes', plan); repintar();
            },
          }, '+'),
          h('button', {
            class: 'chico fantasma', onClick: async () => {
              plan.lineas = plan.lineas.filter((l) => l !== linea);
              await db.guardar('planes', plan); repintar();
            },
          }, '×')))));
  }

  if (racionesTotal) {
    const suma = L.sumarMacros(totalMacros);
    pon(raiz, h('div', { class: 'tarjeta' },
      h('h3', {}, 'Lo que sale en total'),
      h('div', { class: 'macros', style: 'margin-top:8px' },
        celda(String(racionesTotal), 'raciones'),
        celda(n0(suma.kcal / racionesTotal), 'kcal/rac'),
        celda(n1(suma.prot / racionesTotal), 'prot/rac'),
        celda(n0(racionesTotal / 2), 'comidas para 2'))));
  }

  // añadir receta
  const buscador = h('input', { type: 'search', placeholder: 'Añadir receta al plan…' });
  const sug = h('div', { class: 'botones', style: 'margin-top:6px' });
  const sugerir = (q) => {
    vaciar(sug);
    const lista = q
      ? estado.recetas.filter((r) => r.nombre.toLowerCase().includes(q.toLowerCase()))
      : estado.recetas.filter((r) => (r.tags || []).includes('batch'));
    for (const r of lista.slice(0, 10)) {
      pon(sug, h('button', {
        class: 'chico', onClick: async () => {
          const ya = plan.lineas.find((l) => l.recetaId === r.id);
          if (ya) ya.tandas += 1; else plan.lineas.push({ recetaId: r.id, tandas: 1 });
          await db.guardar('planes', plan);
          repintar();
        },
      }, `+ ${r.nombre}`));
    }
  };
  buscador.addEventListener('input', () => sugerir(buscador.value));
  sugerir('');
  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Añadir al plan'),
    h('p', { class: 'pequeno apagado' }, 'Se proponen las marcadas como batch; busca para ver el resto.'),
    buscador, sug));

  // lista de la compra
  if (plan.lineas.length) pon(raiz, listaCompra(plan));
}

function listaCompra(plan) {
  const necesario = new Map(); // nombre -> cantidad
  for (const linea of plan.lineas) {
    const r = estado.recetas.find((x) => x.id === linea.recetaId);
    if (!r) continue;
    for (const ing of r.ingredientes || []) {
      necesario.set(ing.nombre, (necesario.get(ing.nombre) || 0) + ing.cantidad * linea.tandas);
    }
  }

  const enCasa = new Set(estado.despensa.filter((d) => d.disponible).map((d) => d.nombre));
  const porCat = new Map();
  for (const [nombre, cant] of necesario) {
    const al = estado.alimentoPorNombre.get(nombre);
    const cat = al?.cat || 'Otros';
    if (!porCat.has(cat)) porCat.set(cat, []);
    porCat.get(cat).push({ nombre, cant, u: al?.medida === 'ud' ? 'ud' : (al?.medida || 'g'), tengo: enCasa.has(nombre) });
  }

  const texto = [];
  const cont = h('div', { class: 'tarjeta' }, h('h3', {}, 'Lista de la compra'));
  for (const [cat, items] of [...porCat].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
    items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    pon(cont, h('div', { class: 'pequeno apagado', style: 'margin:12px 0 4px;font-weight:700' }, cat.toUpperCase()));
    texto.push(`\n${cat}`);
    pon(cont, h('ul', { class: 'lista pequeno' }, ...items.map((i) => {
      texto.push(`${i.tengo ? '(tengo) ' : ''}${i.nombre} — ${n1(i.cant)} ${i.u}`);
      return h('li', { style: i.tengo ? 'opacity:.5' : '' },
        h('span', { class: 'crece' }, i.nombre, i.tengo ? ' · ya lo tienes' : ''),
        h('span', { class: 'mono' }, `${n1(i.cant)} ${i.u}`));
    })));
  }
  pon(cont, h('button', {
    class: 'fantasma ancho', style: 'margin-top:12px',
    onClick: async () => {
      try { await navigator.clipboard.writeText(texto.join('\n').trim()); toast('Lista copiada.'); }
      catch { toast('El navegador no ha dejado copiar.'); }
    },
  }, 'Copiar la lista'));
  return cont;
}

function anadirAlPlan(r) {
  (async () => {
    const fecha = proximoDomingo();
    const planes = await db.porIndice('planes', 'fecha', fecha);
    const plan = planes[0] || { id: db.nuevoId('p'), fecha, lineas: [] };
    const ya = plan.lineas.find((l) => l.recetaId === r.id);
    if (ya) ya.tandas += 1; else plan.lineas.push({ recetaId: r.id, tandas: 1 });
    await db.guardar('planes', plan);
    toast(`${r.nombre} añadido al plan del domingo.`);
    ir('cocina', { pestana: 'batch' });
  })();
}

// ------------------------------------------------------------------ referencias

async function pintarReferencias(raiz) {
  const rend = L.rendimientoProteina(estado.alimentos);

  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Rendimiento de proteína'),
    h('p', { class: 'pequeno apagado' },
      'Cuántas calorías te cuesta cada gramo de proteína. Cuanto más bajo, mejor rinde en déficit.'),
    h('ul', { class: 'lista pequeno' }, ...rend.slice(0, 20).map((r) => h('li', {},
      h('span', { class: 'crece' }, r.nombre),
      h('span', { class: 'mono', style: r.ratio <= 6 ? 'color:var(--ok)' : '' }, r.ratio.toFixed(1)))))));

  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Dónde se escapan las calorías'),
    h('ul', { class: 'lista pequeno' }, ...S.ESCAPES.map((e) => h('li', {},
      h('span', { class: 'crece' }, e.cosa),
      h('span', { class: 'mono apagado', style: 'text-align:right' }, e.coste))))));

  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Reglas fijas'),
    h('ul', { class: 'lista pequeno apagado' }, ...S.REGLAS.map((r) => h('li', {}, r)))));

  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Biblioteca de alimentos'),
    h('p', { class: 'pequeno apagado' },
      `${estado.alimentos.length} alimentos. Las filas con ★ vienen de la etiqueta del producto y son exactas; el resto son valores de tabla y pueden variar entre marcas.`),
    h('button', { class: 'fantasma ancho', onClick: () => ir('ajustes', { pestana: 'alimentos' }) },
      'Ver y editar la biblioteca')));
}
