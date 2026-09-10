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
];

// Cambios en datos que ya están en su móvil (la semilla solo añade lo que falta, no
// cambia lo que hay). Se aplican una vez, igual que los registros.
export const CAMBIOS_PENDIENTES = [
  {
    id: 'sopa-pollo-macros-2026-09-10',
    receta: 'Sopa de pollo con col china y miso',
    macrosRacion: { kcal: 445, prot: 36, grasa: 13, hc: 41, fibra: 4, sal: 1.9 },
  },
];
