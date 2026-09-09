// selector-comida.js — el diálogo para añadir algo a una toma.
// Objetivo: dos toques para lo de siempre, tres para algo nuevo.

import * as L from './logica.js';
import * as S from './seed.js';
import { estado } from './app.js';
import { registrarComida, atajosDeToma } from './dia.js';
import { h, hoja, stepper, toast, n0, n1, vaciar, pon } from './ui.js';

const unidad = (al) => (al.medida === 'ud' ? 'ud' : al.medida === 'ml' ? 'ml' : 'g');

function resumenMacros(m) {
  return `${n0(m.kcal)} kcal · ${n1(m.prot)} P · ${n1(m.grasa)} G · ${n1(m.hc)} H`;
}

export function macrosDeReceta(receta) {
  return L.macrosReceta(receta, estado.alimentoPorNombre);
}

// Abre el selector. alGuardar() se llama tras registrar, para repintar la vista.
export function abrirSelector({ fecha, toma, alGuardar }) {
  const nombreToma = S.TOMAS.find((t) => t.id === toma)?.nombre || 'Toma';
  const cuerpo = h('div');
  const dlg = hoja(`Añadir a ${nombreToma.toLowerCase()}`, cuerpo);

  const cerrarYAvisar = async (texto) => {
    dlg.close();
    toast(texto);
    await alGuardar?.();
  };

  // -------- paso 2: cantidad --------
  function pantallaCantidad(item) {
    const esReceta = item.tipo === 'receta';
    const base = esReceta
      ? macrosDeReceta(item.receta)
      : item.alimento;
    const porDefecto = esReceta
      ? L.cantidadHabitual(estado.uso, item.nombre, 1, 'receta')
      : L.cantidadHabitual(estado.uso, item.nombre, item.alimento.racion || 100, 'alimento');
    const paso = esReceta ? 0.5 : (item.alimento.medida === 'ud' ? 1 : (item.alimento.racion >= 100 ? 10 : 5));
    const uds = esReceta ? 'raciones' : unidad(item.alimento);

    const salida = h('div', { class: 'aviso info', style: 'margin-top:12px' });
    const calcular = (cant) => esReceta
      ? L.escalarMacros(base, cant)
      : L.macrosDe(item.alimento, cant);

    const paso1 = stepper({
      valor: porDefecto, paso, min: 0, max: 5000,
      decimales: esReceta ? 1 : 0,
      alCambiar: (v) => { salida.textContent = resumenMacros(calcular(v)); },
    });
    salida.textContent = resumenMacros(calcular(porDefecto));

    const rapidas = esReceta
      ? [0.5, 1, 1.5, 2]
      : item.alimento.medida === 'ud' ? [1, 2, 3, 4]
        : [item.alimento.racion || 100, 50, 100, 150].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);

    pon(vaciar(cuerpo), 
      h('div', { class: 'fila entre', style: 'margin-bottom:10px' },
        h('div', { class: 'crece' },
          h('div', { style: 'font-weight:650' }, item.nombre),
          item.alimento?.exacto && h('span', { class: 'etiqueta ok' }, '★ etiqueta'),
          item.alimento?.nota && h('div', { class: 'pequeno apagado' }, item.alimento.nota),
          item.receta?.nota && h('div', { class: 'pequeno apagado' }, item.receta.nota)),
        h('button', { class: 'chico fantasma', onClick: () => pantallaLista() }, 'Atrás')),
      h('label', {}, `Cantidad en ${uds}`),
      paso1,
      h('div', { class: 'botones', style: 'margin-top:8px' },
        ...rapidas.map((v) => h('button', { class: 'chico', onClick: () => { paso1.fijar(v); salida.textContent = resumenMacros(calcular(v)); } }, `${v} ${uds}`))),
      salida,
      h('button', {
        class: 'principal ancho grande', style: 'margin-top:14px',
        onClick: async () => {
          const cant = paso1.valor;
          if (cant <= 0) return;
          await registrarComida({
            fecha, toma, nombre: item.nombre, cantidad: cant,
            medida: esReceta ? 'racion' : item.alimento.medida,
            macros: calcular(cant),
            origen: esReceta ? 'receta' : 'alimento',
            refId: item.id,
          });
          cerrarYAvisar(`${item.nombre} registrado.`);
        },
      }, 'Guardar'));
  }

  // -------- paso 1: lista --------
  function pantallaLista(filtro = '', pestana = 'todo') {
    const q = filtro.trim().toLowerCase();
    const coincide = (n) => !q || n.toLowerCase().includes(q);

    const buscador = h('input', {
      type: 'search', placeholder: 'Buscar alimento o receta…', value: filtro,
      onInput: (e) => { clearTimeout(buscador._t); buscador._t = setTimeout(() => pantallaLista(e.target.value, pestana), 180); },
    });

    const pestanas = h('div', { class: 'segmentos', style: 'margin:10px 0' },
      ...[['todo', 'Todo'], ['recetas', 'Recetas'], ['alimentos', 'Alimentos'], ['rapidas', 'Rápidas']]
        .map(([id, txt]) => h('button', {
          class: pestana === id ? 'sel chico' : 'chico',
          onClick: () => pantallaLista(filtro, id),
        }, txt)));

    const lista = h('div');

    // Atajos aprendidos: un toque y registrado con la cantidad de siempre.
    if (!q && pestana === 'todo') {
      const atajos = atajosDeToma(toma);
      if (atajos.length) {
        pon(lista, h('div', { class: 'pequeno apagado', style: 'margin-bottom:6px' },
          'Lo que sueles tomar aquí — un toque y queda registrado con tu cantidad habitual'));
        pon(lista, h('div', { class: 'botones', style: 'margin-bottom:14px' },
          ...atajos.map((u) => {
            const esReceta = u.tipo === 'receta';
            const ref = esReceta
              ? estado.recetas.find((r) => r.nombre === u.nombre)
              : estado.alimentoPorNombre.get(u.nombre);
            if (!ref) return null;
            const cant = u.ultimaCantidad || (esReceta ? 1 : ref.racion || 100);
            const uds = esReceta ? 'rac' : unidad(ref);
            return h('button', {
              class: 'chico',
              onClick: async () => {
                const macros = esReceta
                  ? L.escalarMacros(macrosDeReceta(ref), cant)
                  : L.macrosDe(ref, cant);
                await registrarComida({
                  fecha, toma, nombre: u.nombre, cantidad: cant,
                  medida: esReceta ? 'racion' : ref.medida, macros,
                  origen: esReceta ? 'receta' : 'alimento', refId: ref.id,
                });
                cerrarYAvisar(`${u.nombre}, ${cant} ${uds}.`);
              },
            }, `${u.nombre} · ${cant} ${uds}`);
          })));
      }
    }

    // Entradas rápidas fijas (catering, sushi)
    if (pestana === 'todo' || pestana === 'rapidas') {
      const rapidas = S.RAPIDAS.filter((r) => coincide(r.nombre));
      for (const r of rapidas) {
        pon(lista, h('button', {
          class: 'item',
          onClick: async () => {
            await registrarComida({
              fecha, toma, nombre: r.nombre, cantidad: 1, medida: 'racion',
              macros: { ...L.CERO(), kcal: r.kcal, prot: r.prot, grasa: r.grasa, hc: r.hc },
              origen: 'rapida', refId: r.id, nota: r.nota,
            });
            cerrarYAvisar(`${r.nombre} registrado.`);
          },
        },
          h('div', { class: 'crece' },
            h('div', { class: 'tit' }, r.nombre),
            h('div', { class: 'sub' }, `${n0(r.kcal)} kcal · ${n0(r.prot)} g proteína — ${r.nota}`)),
          h('span', { class: 'etiqueta acento' }, 'Rápido')));
      }
    }

    if (pestana === 'todo' || pestana === 'recetas') {
      let recetas = estado.recetas.filter((r) => coincide(r.nombre));
      recetas = L.ordenarPorHabito(recetas, estado.uso, toma, 'nombre', 'receta');
      if (pestana === 'todo') recetas = recetas.slice(0, q ? 20 : 6);
      if (recetas.length) pon(lista, h('h3', { style: 'margin:14px 0 8px' }, 'Recetas'));
      for (const r of recetas) {
        const m = macrosDeReceta(r);
        pon(lista, h('button', {
          class: 'item', onClick: () => pantallaCantidad({ tipo: 'receta', nombre: r.nombre, receta: r, id: r.id }),
        },
          h('div', { class: 'crece' },
            h('div', { class: 'tit' }, r.nombre),
            h('div', { class: 'sub' }, `${resumenMacros(m)} por ración`))));
      }
    }

    if (pestana === 'todo' || pestana === 'alimentos') {
      let alimentos = estado.alimentos.filter((a) => coincide(a.nombre));
      alimentos = L.ordenarPorHabito(alimentos, estado.uso, toma, 'nombre', 'alimento');
      if (pestana === 'todo') alimentos = alimentos.slice(0, q ? 25 : 8);
      if (alimentos.length) pon(lista, h('h3', { style: 'margin:14px 0 8px' }, 'Alimentos'));
      for (const a of alimentos) {
        pon(lista, h('button', {
          class: 'item', onClick: () => pantallaCantidad({ tipo: 'alimento', nombre: a.nombre, alimento: a, id: a.id }),
        },
          h('div', { class: 'crece' },
            h('div', { class: 'tit' }, a.nombre, a.exacto ? ' ★' : ''),
            h('div', { class: 'sub' }, `${n0(a.kcal)} kcal · ${n1(a.prot)} P por ${a.medida === 'ud' ? 'unidad' : `100 ${a.medida}`}`))));
      }
    }

    // Entrada libre, para cuando no está en la biblioteca
    const manual = h('button', { class: 'item', onClick: () => pantallaManual() },
      h('div', { class: 'crece' },
        h('div', { class: 'tit' }, 'Escribir a mano'),
        h('div', { class: 'sub' }, 'Para algo que no está en la biblioteca')));

    pon(vaciar(cuerpo), 
      h('div', { class: 'buscador' }, buscador, pestanas),
      lista,
      h('div', { style: 'margin-top:10px' }, manual));
    if (filtro) setTimeout(() => { buscador.focus(); buscador.setSelectionRange(filtro.length, filtro.length); }, 0);
  }

  // -------- entrada libre --------
  function pantallaManual() {
    const campos = {};
    const campo = (id, etiqueta, valor = '') => {
      campos[id] = h('input', { type: id === 'nombre' ? 'text' : 'number', inputmode: id === 'nombre' ? 'text' : 'decimal', value: valor, step: 'any' });
      return h('div', { class: 'campo' }, h('label', {}, etiqueta), campos[id]);
    };
    pon(vaciar(cuerpo), 
      h('div', { class: 'fila entre', style: 'margin-bottom:10px' },
        h('h3', { class: 'crece' }, 'Escribir a mano'),
        h('button', { class: 'chico fantasma', onClick: () => pantallaLista() }, 'Atrás')),
      campo('nombre', 'Qué es'),
      h('div', { class: 'campos2' }, campo('kcal', 'kcal'), campo('prot', 'Proteína (g)')),
      h('div', { class: 'campos2' }, campo('grasa', 'Grasa (g)'), campo('hc', 'Hidratos (g)')),
      h('button', {
        class: 'principal ancho', onClick: async () => {
          const nombre = campos.nombre.value.trim();
          if (!nombre) return toast('Ponle un nombre.');
          await registrarComida({
            fecha, toma, nombre, cantidad: 1, medida: 'racion',
            macros: {
              ...L.CERO(),
              kcal: parseFloat(campos.kcal.value) || 0,
              prot: parseFloat(campos.prot.value) || 0,
              grasa: parseFloat(campos.grasa.value) || 0,
              hc: parseFloat(campos.hc.value) || 0,
            },
            origen: 'manual',
          });
          cerrarYAvisar(`${nombre} registrado.`);
        },
      }, 'Guardar'));
  }

  pantallaLista();
  return dlg;
}
