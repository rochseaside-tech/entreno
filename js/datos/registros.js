// registros.js — entrenos que Rocío pasó a mano porque la versión anterior no los
// guardó bien. Al abrir la app se meten una sola vez (queda apuntado en meta
// 'registrosAplicados'); si luego se borran, no vuelven. Sustituyen cualquier otro
// entreno de ese mismo día, que sería el guardado mal.

const serie = (sesionId, fecha, base) => ([ejercicioId, peso, reps, rirs], item) =>
  reps.map((r, indice) => ({
    id: `${sesionId}-${ejercicioId}-${indice}`, sesionId, ejercicioId, item, fecha, indice,
    peso, reps: r, rir: rirs[indice], ts: base + (item * 3 + indice + 1) * 150000,
  }));

// Primera Sesión A, 9 de septiembre de 2026. Pesos, reps y RIR reales; la hora no se apuntó.
const S1 = 'reg-2026-09-09-A';
const HECHO_9_SEP = [
  ['jalon-prono', 32.5, [12, 12, 12], [4, 3, 2]],
  ['remo-sentado', 36, [9, 12, 12], [0, 2, 2]],
  ['press-hombro-maquina', 16, [12, 12, 8], [1, 2, 2]],
  ['triceps-sobre-cabeza', 24.5, [12, 12, 12], [4, 3, 3]],
  ['elev-laterales', 4, [12, 12, 12], [4, 4, 4]],
];
const INICIO_9_SEP = Date.parse('2026-09-09T17:00:00Z'); // 19:00 en España, aproximada

export const REGISTROS_PENDIENTES = [
  {
    id: S1,
    hasta: '2026-09-30', // pasada esa fecha ya no se mete en ningún móvil
    sesion: {
      id: S1, fecha: '2026-09-09', plan: 'A', nombre: 'Torso, tirón y hombro', horaDesconocida: true,
      inicio: new Date(INICIO_9_SEP).toISOString(), fin: new Date(INICIO_9_SEP + 50 * 60000).toISOString(),
      ejercicios: HECHO_9_SEP.map(([id]) => ({ id, series: 3 })),
    },
    series: HECHO_9_SEP.flatMap(serie(S1, '2026-09-09', INICIO_9_SEP)),
  },
  CENA_9_SEP(),
  COMIDA_12_SEP(),
];

// Comida del sábado 12 sep, día de gimnasio (se marca también el día, para el objetivo
// de 1815 kcal aunque aún no haya entreno). Macros de cada línea tal como los dio Rocío.
function COMIDA_12_SEP() {
  const fecha = '2026-09-12', id = 'reg-comida-2026-09-12';
  const base = Date.parse('2026-09-12T12:00:00Z'); // 14:00 en España, aproximada
  const L = [
    // nombre, cantidad, medida, origen, refId, kcal, prot, grasa, hc, fibra, sal, nota
    ['Carne picada de ternera (11 % grasa)', 200, 'g', 'alimento', 'carne-picada-de-ternera-11-grasa', 360, 39, 22, 0, 0, 0.3],
    ['Fideos de arroz, secos', 70, 'g', 'alimento', 'fideos-de-arroz-secos', 252, 2.8, 0.4, 57.4, 1.1, 0, 'Peso en seco.'],
    ['Tahini', 50, 'g', 'alimento', 'tahini', 335, 8.5, 31.2, 5, 4.5, 0.03, 'Su parte: 50 g de los 100 g usados. Bote: 670 kcal/100 g.'],
    ['Sirope de agave', 10, 'g', 'alimento', 'sirope-de-agave', 31, 0, 0, 7.6, 0, 0.01],
  ];
  return {
    id, hasta: '2026-09-30', fecha, toma: 'comida', nombreToma: 'comida', diaGym: true,
    comidas: L.map(([nombre, cantidad, medida, origen, refId, kcal, prot, grasa, hc, fibra, sal, nota = null], i) => ({
      id: `${id}-${i + 1}`, fecha, toma: 'comida', nombre, cantidad, medida, origen, refId, nota,
      kcal, prot, grasa, hc, fibra, sal, ts: base + i * 1000,
    })),
  };
}

// Cena del 9 sep, que quedó sin apuntar. Macros de cada línea tal como los dio Rocío el
// 11 sep (cuadran con su biblioteca); fibra y sal calculadas con la biblioteca.
function CENA_9_SEP() {
  const fecha = '2026-09-09', id = 'reg-cena-2026-09-09';
  const base = Date.parse('2026-09-09T19:00:00Z'); // 21:00 en España, aproximada
  const L = [
    // nombre, cantidad, medida, origen, refId, kcal, prot, grasa, hc, fibra, sal, nota
    ['Chuleta de pavo', 130, 'g', 'alimento', 'chuleta-de-pavo', 156, 28.6, 4.6, 0, 0, 0.2],
    ['AOVE', 3, 'g', 'alimento', 'aove', 27, 0, 3, 0, 0, 0, 'De cocinar.'],
    ['Salmorejo de brick', 150, 'ml', 'alimento', 'salmorejo-de-brick', 128, 1.5, 10.5, 5.1, 3, 1.35],
    ['Huevo M', 1, 'ud', 'alimento', 'huevo-m', 75, 6.5, 5, 0.4, 0, 0.15, 'Cocido.'],
    ['Jamón serrano en taquitos', 15, 'g', 'alimento', 'jamon-serrano-en-taquitos', 36, 4.5, 2, 0.1, 0, 0.68],
    ['Tostas de arroz y maíz', 10, 'g', 'alimento', 'tostas-de-arroz-y-maiz', 39, 0.8, 0.3, 8, 0.2, 0.04, '2 unidades.'],
    ['Escalivada casera', 1, 'racion', 'receta', 'escalivada-casera', 110, 2.5, 4, 8.8, 3.5, 0],
    ['Anchoas en AOVE, escurridas', 15, 'g', 'alimento', 'anchoas-en-aove-escurridas', 30, 3.9, 1.5, 0, 0, 0.75],
  ];
  return {
    id, hasta: '2026-09-30', fecha, toma: 'cena', nombreToma: 'cena',
    comidas: L.map(([nombre, cantidad, medida, origen, refId, kcal, prot, grasa, hc, fibra, sal, nota = null], i) => ({
      id: `${id}-${i + 1}`, fecha, toma: 'cena', nombre, cantidad, medida, origen, refId, nota,
      kcal, prot, grasa, hc, fibra, sal, ts: base + i * 1000,
    })),
  };
}

// Cambios en datos que ya están en su móvil (la semilla solo añade lo que falta, no
// cambia lo que hay). Se aplican una vez, igual que los registros.
export const CAMBIOS_PENDIENTES = [
  {
    id: 'sopa-pollo-macros-2026-09-10',
    receta: 'Sopa de pollo con col china y miso',
    macrosRacion: { kcal: 445, prot: 36, grasa: 13, hc: 41, fibra: 4, sal: 1.9 },
  },
  {
    // Rocío dio el 11 sep sus macros por ración; mandan sobre el cálculo por ingredientes.
    id: 'escalivada-macros-2026-09-11',
    receta: 'Escalivada casera',
    macrosRacion: { kcal: 110, prot: 2.5, grasa: 4, hc: 8.8, fibra: 3.5, sal: 0 },
  },
  {
    // Foto de la lata del 10 sep: los valores ya coincidían; se añade el tamaño de la lata.
    id: 'berberechos-lata-2026-09-10',
    alimento: 'Berberechos, escurridos',
    campos: { gramosUnidad: 90, nota: 'Lata Mercadona de 185 g: 90 g escurridos.' },
  },
];
