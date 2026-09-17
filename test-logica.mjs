import * as L from './js/logica.js';
import * as S from './js/seed.js';
import { CATALOGO } from './js/datos/catalogo-ejercicios.js';

let ok = 0, mal = 0;
const comprobar = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log('  OK  ', nombre); }
  else { mal++; console.log('  MAL ', nombre, extra); }
};

const delCatalogo = (id) => { const c = CATALOGO.find(e => e.id === id); return { ...c, repMin: c.rep[0], repMax: c.rep[1], pesoInicial: S.PESOS_INICIALES[id] ?? null }; };
const ej = delCatalogo('jalon-prono'); // 8-12, +2.5
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

console.log('\n--- Máquinas en libras (saltos desde el peso real) ---');
const pecho = delCatalogo('press-pecho-maquina'); // 10-12, +2.5, arranque 22,7
const sp = (i, peso, reps, rir, ses = 's1', f = '2026-09-20') => ({ sesionId: ses, fecha: f, indice: i, peso, reps, rir, ejercicioId: pecho.id });
a = L.analizarEjercicio(pecho, [0,1,2].map(i => sp(i, 22.7, 12, 2)), faseNormal);
comprobar(`22,7 al tope -> sube a 25,2, no a 25 (${a.pesoSugerido})`, a.aviso?.tipo === 'subir' && a.pesoSugerido === 25.2);
a = L.analizarEjercicio(pecho, ['2026-09-20','2026-09-24','2026-09-28'].flatMap((f, k) => [0,1,2].map(i => sp(i, 22.7, 10, 1, 's'+k, f))), faseNormal);
comprobar(`22,7 estancado -> baja un salto a 20,2 (${a.pesoSugerido})`, a.aviso?.tipo === 'estancado' && a.pesoSugerido === 20.2);
comprobar('prensa 95,8 estancada (+5) -> 85,8', L.bajarCarga(95.8, 5) === 85.8);

console.log('\n--- Rutina nueva: peso de arranque ---');
a = L.analizarEjercicio(pecho, [0,1,2].map(i => sp(i, 30, 12, 2)), faseNormal, { arranque: true });
comprobar(`primera vez: manda la tabla (22,7), no el historial (${a.pesoSugerido})`, a.pesoSugerido === 22.7 && a.aviso?.tipo === 'arranque');
a = L.analizarEjercicio(delCatalogo('triceps-polea'), [], faseNormal,
  { arranque: true, referencia: { peso: 25, texto: 'Primera vez con Cuerda: te propongo los 25 kg de Barra en V.' } });
comprobar(`agarre nuevo: propone el peso del otro agarre (${a.pesoSugerido})`, a.pesoSugerido === 25 && a.aviso.texto.includes('Barra en V'));
comprobar('el tríceps en polea tiene los tres agarres',
  CATALOGO.find(c => c.id === 'triceps-polea').variantes.join() === 'Barra en V,Barra recta,Cuerda');
a = L.analizarEjercicio(delCatalogo('remo-maquina'), [], faseNormal, { arranque: true });
comprobar(`tantear: sin peso propuesto (${a.pesoSugerido})`, a.pesoSugerido === null && a.aviso.texto.includes('tantea'));
comprobar('hip thrust de Pierna 2: 3 series de 12-15 y 90 s',
  JSON.stringify(S.RUTINA.P2.ejercicios.find(x => x.id === 'hip-thrust')) === '{"id":"hip-thrust","series":3,"repMin":12,"repMax":15,"descanso":90}');
const todos = Object.values(S.RUTINA).flatMap(d => d.ejercicios.map(x => x.id));
comprobar('todos los ejercicios de la rutina están en el catálogo', todos.every(id => CATALOGO.some(c => c.id === id)), todos.filter(id => !CATALOGO.some(c => c.id === id)));
comprobar('la extensión de cadera ya no está en la rutina', !todos.includes('extension-cadera'));
comprobar('glute kick por pierna', CATALOGO.find(c => c.id === 'glute-kick-bioarc').lados === true);

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

console.log('\n--- Rotación Torso 1 → Pierna 1 → Torso 2 → Pierna 2 ---');
const rot = (h) => L.siguienteSesion(h.map(plan => ({ plan })), S.ORDEN_SESIONES, S.PLAN_ANTERIOR);
comprobar('sin historial -> Torso 1', rot([]) === 'T1');
comprobar('tras Pierna 2 -> Torso 1', rot(['P2']) === 'T1');
comprobar('tras Pierna 1 -> Torso 2', rot(['T1', 'P1']) === 'T2');
comprobar('sigue desde la rutina anterior: tras D -> Torso 1', rot(['A', 'B', 'C', 'D']) === 'T1');
comprobar('sigue desde la rutina anterior: tras B -> Torso 2', rot(['A', 'B']) === 'T2');
comprobar('los entrenos libres no cuentan', rot(['A', 'L']) === 'P1');

console.log('\n--- Medidas del cuerpo ---');
const meds = [{ fecha: '2026-09-17', cintura: 87, abdomen: 109 }, { fecha: '2026-10-13', abdomen: 107.5 }];
const ev = L.evolucionMedidas(meds, S.MEDIDAS);
const abd = ev.find((x) => x.id === 'abdomen');
comprobar(`abdomen máximo: −1,5 cm en 26 días (${abd.cambio} / ${abd.dias})`, abd.cambio === -1.5 && abd.dias === 26);
comprobar('una medida con un solo dato no tiene cambio', ev.find((x) => x.id === 'cintura').cambio === null);
comprobar('las medidas que no has apuntado no salen', !ev.some((x) => x.id === 'pecho'));
comprobar('el abdomen máximo es la primera y trae su definición',
  S.MEDIDAS[0].id === 'abdomen' && S.MEDIDAS[0].definicion.includes('más ancha de la barriga'));
comprobar('el protocolo son 4 pasos cada 4 semanas',
  S.PROTOCOLO_MEDIDAS.cadaDias === 28 && S.PROTOCOLO_MEDIDAS.pasos.length === 4 && S.PROTOCOLO_MEDIDAS.pasos[0].includes('ayunas'));

let pm = L.proximaMedida([meds[0]], '2026-10-13', '2026-09-17');
comprobar(`respeta la fecha fijada (${pm.fecha}, en ${pm.dias} días)`, pm.fecha === '2026-10-13' && pm.dias === 26 && !pm.toca);
pm = L.proximaMedida(meds, '2026-10-13', '2026-10-13');
comprobar(`tras medirse, la siguiente es 4 semanas después (${pm.fecha})`, pm.fecha === '2026-11-10');
comprobar('si ya pasó la fecha, avisa de que toca', L.proximaMedida(meds, '2026-10-13', '2026-11-12').toca === true);

console.log('\n--- Semana ISO ---');
comprobar('lunes de un domingo', L.lunesDe('2026-09-13') === '2026-09-07');
comprobar('la semana tiene 7 días de lunes a domingo',
  L.diasDeSemana('2026-09-09').length === 7 && L.diasDeSemana('2026-09-09')[0] === '2026-09-07');

console.log(`\n${ok} pruebas correctas, ${mal} fallidas`);
process.exit(mal ? 1 : 0);
