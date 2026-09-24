// ciclos.js — el historial de reglas que traían de sus apps de siempre.
// Se mete una sola vez, cuando el almacén está vacío; a partir de ahí manda la app.
//
// dudoso: true  = ese ciclo no cuadra (se olvidaron de apuntar el inicio). No cuenta para
//                 las medias ni para la predicción, pero se ve en el historial.

// Rocío — export de Mi Calendario (PC_Report, 24 sep 2026). Últimos 14 ciclos.
// El de septiembre de 2025 sale de 83 días: es un olvido, no un ciclo.
export const CICLOS_ROCIO = [
  { inicio: '2025-08-18', duracion: 5 },
  { inicio: '2025-09-14', duracion: 5, dudoso: true, nota: 'Registrado como 83 días: falta el inicio de octubre o noviembre.' },
  { inicio: '2025-12-06', duracion: 5 },
  { inicio: '2026-01-02', duracion: 5 },
  { inicio: '2026-01-29', duracion: 7 },
  { inicio: '2026-02-24', duracion: 5 },
  { inicio: '2026-03-21', duracion: 6 },
  { inicio: '2026-04-16', duracion: 6 },
  { inicio: '2026-05-12', duracion: 5 },
  { inicio: '2026-06-11', duracion: 6 },
  { inicio: '2026-07-08', duracion: 6 },
  { inicio: '2026-08-03', duracion: 5 },
  { inicio: '2026-08-28', duracion: 5 },
  { inicio: '2026-09-23', duracion: 5 },
];

// Aida — informe de Salud (24 sep 2026). Sus 7 días son reales: incluyen los últimos
// días de restos de flujo. El dolor suele ser el día 1 y el 2, a veces el 3.
// El ciclo de abril sale de 51 días: mismo caso que el de Rocío, un olvido.
export const CICLOS_AIDA = [
  { inicio: '2025-10-17', duracion: 7 },
  { inicio: '2025-11-13', duracion: 7 },
  { inicio: '2025-12-08', duracion: 6 },
  { inicio: '2026-01-04', duracion: 7 },
  { inicio: '2026-01-31', duracion: 7 },
  { inicio: '2026-02-27', duracion: 5 },
  { inicio: '2026-03-26', duracion: 8 },
  { inicio: '2026-04-21', duracion: 6, dudoso: true, nota: 'Registrado como 51 días: falta el inicio de mayo.' },
  { inicio: '2026-06-11', duracion: 6 },
  { inicio: '2026-07-06', duracion: 7 },
  { inicio: '2026-08-05', duracion: 5 },
  { inicio: '2026-08-31', duracion: 6 },
];
