import * as L from './js/logica.js';
import * as S from './js/seed.js';

let ok = 0, mal = 0;
const comprobar = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log('  OK  ', nombre); }
  else { mal++; console.log('  MAL ', nombre, extra); }
};

const ej = S.EJERCICIOS.find(e => e.id === 'jalon-prono'); // 8-12, +2.5
const faseNormal = { semana: 5, reacondicionamiento: false, descarga: false, rirForzado: null };

const serie = (sesionId, fecha, i, peso, reps, rir) => ({ sesionId, fecha, indice: i, peso, reps, rir, ejercicioId: ej.id });

console.log('\n--- Progresión doble ---');
let s = [0,1,2].map(i => serie('s1','2026-09-01',i,30,12,2));
comprobar('todas al tope con RIR 2 -> subir a 32,5',
  L.analizarEjercicio(ej, s, faseNormal).aviso?.tipo === 'subir' &&
  L.analizarEjercicio(ej, s, faseNormal).pesoSugerido === 32.5);

s = [0,1,2].map(i => serie('s1','2026-09-01',i,30,12,0));
comprobar('todas al tope pero RIR 0 -> NO sube', L.analizarEjercicio(ej, s, faseNormal).aviso === null);

s = [serie('s1','2026-09-01',0,30,12,2), serie('s1','2026-09-01',1,30,11,2), serie('s1','2026-09-01',2,30,12,2)];
comprobar('una serie por debajo del tope -> NO sube', L.analizarEjercicio(ej, s, faseNormal).aviso === null);

console.log('\n--- Estancamiento ---');
// 3 sesiones iguales, con reps por debajo del tope (no dispara progresión doble)
s = ['2026-08-20','2026-08-24','2026-08-28'].flatMap((f, k) =>
  [0,1,2].map(i => serie('s'+k, f, i, 40, 9, 1)));
let a = L.analizarEjercicio(ej, s, faseNormal);
comprobar('3 sesiones clavadas -> bajar 10% (40 -> 35, el múltiplo de 2,5 más cercano a 36)',
  a.aviso?.tipo === 'estancado' && a.pesoSugerido === 35, JSON.stringify(a.aviso));

s = ['2026-08-20','2026-08-24','2026-08-28'].flatMap((f, k) =>
  [0,1,2].map(i => serie('s'+k, f, i, 40, 9 + k, 1)));
comprobar('reps mejorando -> NO es estancamiento', L.analizarEjercicio(ej, s, faseNormal).aviso === null);

console.log('\n--- Fases del bloque ---');
comprobar('sin primera sesión -> reacondicionamiento RIR 3-4', L.faseActual(null).rirForzado === '3-4');
comprobar('día 5 -> reacondicionamiento', L.faseActual('2026-09-01','2026-09-06').reacondicionamiento === true);
comprobar('día 15 -> ya no', L.faseActual('2026-09-01','2026-09-16').reacondicionamiento === false);
const d8 = L.faseActual('2026-09-01', L.sumarDias('2026-09-01', 7*7));   // semana 8
comprobar('semana 8 -> descarga', d8.semana === 8 && d8.descarga === true, JSON.stringify(d8));
comprobar('descarga: 4 series -> 2', L.seriesObjetivo(4, d8) === 2);
comprobar('descarga: 3 series -> 2 (redondeo al alza)', L.seriesObjetivo(3, d8) === 2);
const d9 = L.faseActual('2026-09-01', L.sumarDias('2026-09-01', 8*7));
comprobar('semana 9 -> sin descarga', d9.descarga === false);
comprobar('en descarga no se pide subir peso',
  L.analizarEjercicio(ej, [0,1,2].map(i => serie('s1','2026-09-01',i,30,12,2)), d8).aviso === null);

console.log('\n--- Objetivos de comida ---');
let o = L.objetivoDia({ huboGym: true });
comprobar('día con gym = 1815 kcal', o.kcal === 1815);
comprobar('hidratos = lo que queda tras proteína y grasa', o.hc === Math.round((1815 - 145*4 - 62*9)/4) && o.hc === 169, o.hc);
o = L.objetivoDia({ huboGym: false });
comprobar('día sin gym = 1680 kcal y proteína intacta', o.kcal === 1680 && o.prot === 145);
o = L.objetivoDia({ huboGym: false, ajustePorDia: -300 });
comprobar('el reparto nunca baja del suelo de 1600', o.kcal === 1600);

console.log('\n--- Avisos ---');
const cero = L.CERO();
let av = L.avisosDia({ totales: { ...cero, prot: 60 }, objetivo: L.objetivoDia({ huboGym: false }), hora: 18, diaCerrado: false });
comprobar('proteína < 60% a las 18:00 -> avisa', av.length === 1 && av[0].texto.includes('60%'));
av = L.avisosDia({ totales: { ...cero, prot: 100 }, objetivo: L.objetivoDia({ huboGym: false }), hora: 18, diaCerrado: false });
comprobar('proteína al 69% -> no avisa', av.length === 0);
av = L.avisosDia({ totales: { ...cero, kcal: 1500, prot: 145, grasa: 50 }, objetivo: L.objetivoDia({ huboGym: false }), hora: 23, diaCerrado: true });
comprobar('día cerrado: avisa de grasa baja y de suelo de kcal', av.length === 2, JSON.stringify(av.map(x=>x.texto)));

console.log('\n--- Peso y ritmo ---');
const pesos = Array.from({ length: 21 }, (_, i) => ({ fecha: L.sumarDias('2026-08-01', i), kg: 85 - i * (0.6/7) + (i % 2 ? 0.3 : -0.3) }));
const mm = L.mediaMovil(pesos);
comprobar('la media suaviza el ruido diario', Math.abs(mm.at(-1).media - mm.at(-1).kg) > 0.05);
const ritmo = L.ritmoSemanal(mm);
comprobar('detecta ~0,6 kg/semana de pérdida', Math.abs(ritmo + 0.6) < 0.12, ritmo);
comprobar('lo valora como dentro del objetivo', L.valoracionRitmo(ritmo).estado === 'ok', L.valoracionRitmo(ritmo).texto);

console.log('\n--- Reparto semanal ---');
let rep = L.repartoSugerido(180, 3);
comprobar('180 kcal de más en 3 días -> −60/día', rep.porDia === -60 && !rep.recortado, JSON.stringify(rep));
rep = L.repartoSugerido(900, 3);
comprobar('−300/día es imposible con suelo 1600: se recorta a −80 y lo dice', rep.porDia === -80 && rep.recortado && rep.ideal === -300, JSON.stringify(rep));
rep = L.repartoSugerido(1400, 2);
comprobar('desvío grande -> se recorta al suelo (−80/día)', rep.porDia === -80 && rep.recortado, JSON.stringify(rep));

console.log('\n--- Rotación A-B-C-D ---');
comprobar('sin historial -> A', L.siguienteSesion([], S.ORDEN_SESIONES) === 'A');
comprobar('tras D -> A', L.siguienteSesion([{plan:'D'}], S.ORDEN_SESIONES) === 'A');
comprobar('tras B -> C', L.siguienteSesion([{plan:'A'},{plan:'B'}], S.ORDEN_SESIONES) === 'C');

console.log('\n--- Semana ISO ---');
comprobar('lunes de un domingo', L.lunesDe('2026-09-13') === '2026-09-07');
comprobar('la semana tiene 7 días de lunes a domingo',
  L.diasDeSemana('2026-09-09').length === 7 && L.diasDeSemana('2026-09-09')[0] === '2026-09-07');

console.log(`\n${ok} pruebas correctas, ${mal} fallidas`);
process.exit(mal ? 1 : 0);
