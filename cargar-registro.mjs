// cargar-registro.mjs — mete en datos.json el registro de comidas de los tres
// primeros días, que venía escrito a mano. De un solo uso: cuando la app ya
// tiene historial propio, esto no hace falta.
//
//   node cargar-registro.mjs > datos-nuevo.json

import { readFileSync } from 'node:fs';
import { ALIMENTOS } from './js/seed.js';

const idDe = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const porNombre = new Map(ALIMENTOS.map((a) => [a.nombre, a]));

// Cada línea: [toma, nombre, cantidad, medida, kcal, prot, grasa, alimentoBiblioteca?]
// Las kcal, la proteína y la grasa son las del registro y mandan sobre todo lo demás.
// Los hidratos salen de las calorías que quedan; la fibra y la sal, de la
// biblioteca cuando el alimento coincide (son los dos datos que el registro no traía).
const DIAS = {
  '2026-09-07': [
    ['desayuno', 'Pan de Pagès blanco', 44, 'g', 120, 4, 1, 'Pan de Pagès blanco'],
    ['desayuno', 'Cottage 0% (Carrefour)', 100, 'g', 68, 12.3, 0.1, 'Cottage 0% (Carrefour)'],
    ['desayuno', 'Muslitos de pollo (fiambre La Carloteña)', 40, 'g', 60, 7, 3.4, 'Muslitos de pollo (fiambre La Carloteña)'],
    ['desayuno', 'AOVE', 3, 'g', 27, 0, 3, 'AOVE'],
    ['desayuno', 'Café con leche desnatada sin lactosa', 30, 'ml', 10, 1, 0.1, 'Leche desnatada sin lactosa'],

    ['comida', 'Lomo de cerdo adobado', 110, 'g', 155, 23, 6, 'Lomo de cerdo adobado'],
    ['comida', 'Huevo a la plancha', 1, 'ud', 75, 6.5, 5, 'Huevo M'],
    ['comida', 'Yuca cocida', 170, 'g', 264, 1.4, 0.5, 'Yuca cocida'],
    ['comida', 'Aceite de cocinar y spray de air fryer', 3.5, 'g', 32, 0, 3.5, 'AOVE'],
    ['comida', 'Pepino marinado', 1, 'racion', 40, 1, 1, null],

    ['cena', 'Jurel al horno', 150, 'g', 180, 30, 7, 'Jurel'],
    ['cena', 'Refrito de ajo (AOVE)', 11, 'g', 99, 0, 11, 'AOVE'],
    ['cena', 'Patata en air fryer', 90, 'g', 79, 1.8, 1, 'Patata cocida'],
    ['cena', 'Huevo', 1, 'ud', 75, 6.5, 5, 'Huevo M'],
    ['cena', 'Mozzarella gratinada', 30, 'g', 78, 5.5, 5.5, 'Mozzarella rallada'],
    ['cena', 'Melón', 200, 'g', 60, 1, 0.3, 'Melón'],
    ['cena', 'Gazpacho de brick', 200, 'ml', 120, 1.5, 8, 'Gazpacho de brick'],
  ],
  '2026-09-08': [
    ['desayuno', 'Pan de Pagès blanco', 45, 'g', 122, 4, 1, 'Pan de Pagès blanco'],
    ['desayuno', 'Cottage 0% (Carrefour)', 87, 'g', 59, 10.7, 0.1, 'Cottage 0% (Carrefour)'],
    ['desayuno', 'Atún al natural, escurrido', 55, 'g', 60, 13, 0.5, 'Atún al natural, escurrido'],
    ['desayuno', 'AOVE', 3, 'g', 27, 0, 3, 'AOVE'],
    ['desayuno', 'Café con leche desnatada sin lactosa', 30, 'ml', 10, 1, 0.1, 'Leche desnatada sin lactosa'],

    ['media-manana', 'Kéfir natural', 212, 'g', 138, 7, 7.4, 'Kéfir natural'],
    ['media-manana', 'Semillas de chía', 10, 'g', 48, 1.7, 3.1, 'Semillas de chía'],
    ['media-manana', 'Mango, moras y frutos rojos congelados', 105, 'g', 53, 1, 0.4, 'Frutos rojos congelados'],

    ['comida', 'Wrap de pescado empanado (catering)', 1, 'racion', 360, 18, 16, null],
    ['comida', 'Arroz blanco, cocido', 110, 'g', 140, 2.5, 0.3, 'Arroz blanco, cocido'],
    ['comida', 'Brócoli asado', 120, 'g', 55, 3, 1.5, 'Brócoli'],
    ['comida', 'Mango', 130, 'g', 78, 1, 0.5, 'Mango'],

    ['merienda', 'Whey Prime en polvo', 25, 'g', 97, 20, 1.3, 'Whey Prime en polvo'],
    ['merienda', 'Leche desnatada sin lactosa', 200, 'ml', 68, 6.2, 0.6, 'Leche desnatada sin lactosa'],

    ['cena', 'Cottage 0% (Carrefour)', 104, 'g', 71, 12.8, 0.1, 'Cottage 0% (Carrefour)'],
    ['cena', 'AOVE', 5, 'g', 45, 0, 5, 'AOVE'],
    ['cena', 'Atún al natural, escurrido', 55, 'g', 60, 13, 0.5, 'Atún al natural, escurrido'],
    ['cena', 'Salmorejo de brick', 150, 'ml', 128, 1.5, 10.5, 'Salmorejo de brick'],
    ['cena', 'Huevo cocido', 1, 'ud', 75, 6.5, 5, 'Huevo M'],
    ['cena', 'Jamón serrano en taquitos', 15, 'g', 36, 4.5, 2, 'Jamón serrano en taquitos'],
    ['cena', 'Berberechos, escurridos', 90, 'g', 48, 7.6, 0, 'Berberechos, escurridos'],
  ],
  '2026-09-09': [
    ['desayuno', 'Pan de Pagès blanco', 50, 'g', 136, 4.5, 1.1, 'Pan de Pagès blanco'],
    ['desayuno', 'Cottage 0% (Carrefour)', 120, 'g', 82, 14.8, 0.1, 'Cottage 0% (Carrefour)'],
    ['desayuno', 'Atún al natural, escurrido', 55, 'g', 60, 13, 0.5, 'Atún al natural, escurrido'],
    ['desayuno', 'AOVE', 2, 'g', 16, 0, 1.8, 'AOVE'],
    ['desayuno', 'Tomate rallado', 40, 'g', 7, 0.3, 0.1, 'Tomate'],
    ['desayuno', 'Café con leche desnatada sin lactosa', 30, 'ml', 10, 1, 0.1, 'Leche desnatada sin lactosa'],

    ['comida', 'Sopa de pollo con col china y miso', 1, 'racion', 365, 27.5, 11, null],
  ],
};

const HORA = { desayuno: 6, 'media-manana': 10, comida: 13, merienda: 18, cena: 21 };

export function construir() {
  const comidas = [];
  const uso = new Map();
  let n = 0;

  for (const [fecha, lineas] of Object.entries(DIAS)) {
    for (const [toma, nombre, cantidad, medida, kcal, prot, grasa, lib] of lineas) {
      // Los hidratos son lo que queda de las calorías tras la proteína y la grasa.
      const hc = Math.max(0, Math.round(((kcal - prot * 4 - grasa * 9) / 4) * 10) / 10);
      // Fibra y sal salen de la biblioteca: el registro a mano no las traía.
      let fibra = 0, sal = 0;
      const al = lib ? porNombre.get(lib) : null;
      if (al) {
        const f = al.medida === 'ud' ? cantidad : cantidad / 100;
        fibra = Math.round((al.fibra || 0) * f * 10) / 10;
        sal = Math.round((al.sal || 0) * f * 100) / 100;
      }
      const esReceta = medida === 'racion';
      comidas.push({
        id: `hist-${n}`, fecha, toma, nombre, cantidad, medida,
        origen: esReceta ? 'receta' : (al ? 'alimento' : 'manual'),
        refId: al ? idDe(al.nombre) : (esReceta ? idDe(nombre) : null),
        nota: null,
        kcal, prot, grasa, hc, fibra, sal,
        ts: Date.parse(`${fecha}T${String(HORA[toma]).padStart(2, '0')}:00:00`) + n * 1000,
      });

      // Deja el aprendizaje ya arrancado: los atajos salen bien desde el primer día.
      const tipo = esReceta ? 'receta' : 'alimento';
      const clave = `${tipo}|${al ? al.nombre : nombre}`;
      const u = uso.get(clave) || { clave, tipo, nombre: al ? al.nombre : nombre, veces: 0, porToma: {}, ultimaCantidad: cantidad };
      u.veces += 1;
      u.porToma[toma] = (u.porToma[toma] || 0) + 1;
      u.ultimaCantidad = cantidad;
      u.ultimaFecha = fecha;
      uso.set(clave, u);
      n += 1;
    }
  }
  return { comidas, uso: [...uso.values()] };
}

// Comprobación contra los totales del registro
if (process.argv[2] === '--comprobar') {
  const { comidas } = construir();
  const esperado = { '2026-09-07': [1542, 102.5, 61.4], '2026-09-08': [1778, 135.0, 58.9], '2026-09-09': [676, 61.1, 14.7] };
  for (const [fecha, e] of Object.entries(esperado)) {
    const d = comidas.filter((c) => c.fecha === fecha);
    const t = d.reduce((a, c) => [a[0] + c.kcal, a[1] + c.prot, a[2] + c.grasa], [0, 0, 0]).map((x) => Math.round(x * 10) / 10);
    const ok = t.every((x, i) => Math.abs(x - e[i]) < 0.35);
    console.log(ok ? 'OK  ' : 'DIF ', fecha, d.length, 'líneas', JSON.stringify(t), 'esperado', JSON.stringify(e));
  }
}
