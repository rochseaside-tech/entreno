// entreno.js — elegir sesión, entrenar serie a serie con el descanso automático,
// y terminar con el resumen. Las reglas de progresión están en logica.js.

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { E, useEstado, avisar, toast, recargar, guardarConfig, seriesDe, siguientePlan, sesionesTerminadas, unaRM } from '../estado.js';
import * as L from '../logica.js';
import * as db from '../db.js';
import { ORDEN_SESIONES, CALENTAMIENTOS } from '../seed.js';
import { Icono, FotoEj, Hoja, Interruptor, ir, n0, n1, n2, aNum } from '../comunes.js';
import * as D from '../descanso.js';
import { ListaEjercicios } from './ejercicios.js';
import { ejerciciosDeSesion, textoSerie, etiquetaSerie, textoCinta, textoEntrenos, copiar } from '../informe.js';

// ---------------------------------------------------------------- utilidades

export function minutosEstimados(plan) {
  const seg = plan.ejercicios.reduce((t, x) => {
    const ej = E.ejercicioPorId.get(x.id);
    return t + x.series * (40 + (ej?.descanso ?? 90));
  }, 0);
  return Math.max(5, Math.round(seg / 60 / 5) * 5);
}

// '0-1' -> 1, '3-4' -> 4, '2' -> 2. Se usa el valor alto: la progresión pide RIR 1 o más.
const rirPorDefecto = (r) => { const m = String(r ?? '2').match(/\d+/g); return m ? Number(m[m.length - 1]) : 2; };

// Las series de aproximación (calent) no cuentan para el volumen ni para el total de series.
const trabajo = (lista) => lista.filter((s) => !s.calent);
const volumenDe = (series) => trabajo(series).reduce((t, s) => t + (s.peso || 0) * (s.reps || 0), 0);

// Cuántas series están completas. En ejercicios por lados, una serie cuenta cuando
// están hechas la izquierda y la derecha.
export function seriesCompletas(lista, lados) {
  if (!lados) return lista.length;
  const porIndice = new Map();
  for (const s of lista) porIndice.set(s.indice, (porIndice.get(s.indice) || new Set()).add(s.lado));
  return [...porIndice.values()].filter((l) => l.has('izq') && l.has('der')).length;
}

async function guardarSesion(s) {
  await db.guardar('sesiones', s);
  const i = E.sesiones.findIndex((x) => x.id === s.id);
  if (i >= 0) E.sesiones[i] = s; else E.sesiones.push(s);
  E.sesionActiva = E.sesiones.find((x) => !x.fin) || null;
  avisar();
}

export async function iniciarSesion(plan) {
  const hoy = L.hoyISO();
  if (!E.config.primeraSesion) await guardarConfig({ primeraSesion: hoy });
  E.fase = L.faseActual(E.config.primeraSesion);
  const def = plan === 'L' ? { nombre: 'Entreno libre', ejercicios: [] } : E.rutina[plan];
  await guardarSesion({
    id: db.nuevoId('s'), fecha: hoy, plan, nombre: def.nombre,
    inicio: new Date().toISOString(), fin: null,
    // El primer ejercicio trae dos series de aproximación propuestas (50 % y 75 % del peso).
    ejercicios: def.ejercicios.map((x, i) => ({ id: x.id, series: L.seriesObjetivo(x.series, E.fase), calent: i === 0 ? 2 : 0 })),
  });
  if (E.config.pantallaEncendida !== false) D.pantallaEncendida(true);
}

// ---------------------------------------------------------------- pantalla

export function Entreno() {
  useEstado();
  return E.sesionActiva ? html`<${EntrenoActivo} sesion=${E.sesionActiva} />` : html`<${ElegirSesion} />`;
}

function ElegirSesion() {
  const toca = siguientePlan();
  const ultimas = sesionesTerminadas().slice(-10).reverse();
  const empezar = (plan) => iniciarSesion(plan);
  const [ver, ponerVer] = useState(null);
  const [pasado, ponerPasado] = useState(false);
  return html`
    <header class="cabecera"><h1 class="titulo">Entreno</h1></header>
    <div class="pila">
      ${ORDEN_SESIONES.map((plan) => {
        const s = E.rutina[plan];
        const ejs = s.ejercicios.map((x) => E.ejercicioPorId.get(x.id)).filter(Boolean);
        return html`<button class="tarjeta" style="display:block;width:100%;text-align:left" onClick=${() => empezar(plan)}>
          <div class="fila-f" style="justify-content:space-between">
            <span class="pastilla">Sesión ${plan}</span>
            ${plan === toca && html`<span class="t2 peq" style="font-weight:700">Te toca</span>`}
          </div>
          <h3 class="titulo" style="font-size:20px;margin:8px 0 2px">${s.nombre}</h3>
          <div class="t2 peq">${ejs.length} ejercicios · unos ${minutosEstimados(s)} min</div>
          <div style="display:flex;gap:6px;margin-top:12px">${ejs.slice(0, 5).map((ej) => html`<${FotoEj} ej=${ej} clase="mini" quieta />`)}</div>
        </button>`;
      })}
      <button class="boton suave" onClick=${() => empezar('L')}><${Icono} n="mas" t=${20} g=${2.2} />Entreno libre</button>
      <button class="boton suave" onClick=${() => ponerPasado(true)}><${Icono} n="reloj" t=${20} g=${2.2} />Apuntar un entreno pasado</button>
    </div>

    ${ultimas.length > 0 && html`
      <div class="seccion"><h2 class="titulo">Últimos entrenos</h2></div>
      <div class="lista">${ultimas.map((s) => html`<${FilaHistorial} s=${s} alPulsar=${() => ponerVer(s)} />`)}</div>`}

    ${ver && html`<${HojaSesion} s=${ver} alCerrar=${() => ponerVer(null)} />`}
    ${pasado && html`<${HojaEntrenoPasado} alCerrar=${() => ponerPasado(false)} />`}`;
}

function FilaHistorial({ s, alPulsar }) {
  const series = E.series.filter((x) => x.sesionId === s.id);
  const min = Math.round((new Date(s.fin) - new Date(s.inicio)) / 60000);
  return html`<button class="item" onClick=${alPulsar}>
    <div class="crece">
      <div class="nombre">${s.plan === 'L' ? '' : `Sesión ${s.plan} · `}${s.nombre}</div>
      <div class="meta">${L.fechaLarga(s.fecha)} · ${min} min · ${trabajo(series).length} series · ${n0(volumenDe(series))} kg${s.cinta ? ' · cinta' : ''}</div>
    </div>
    <${Icono} n="chevron" t=${18} g=${2.2} clase="chevron" />
  </button>`;
}

// Un entreno pasado con todas sus series, tal cual se hicieron.
function HojaSesion({ s, alCerrar }) {
  const grupos = ejerciciosDeSesion(s).filter((g) => g.series.length);
  const [borrando, ponerBorrando] = useState(false);
  const borrar = async () => {
    for (const r of E.series.filter((x) => x.sesionId === s.id)) await db.borrar('series', r.id);
    await db.borrar('sesiones', s.id);
    await recargar(); avisar(); toast('Entreno borrado'); alCerrar();
  };
  const pasar = async () => {
    const ok = await copiar(textoEntrenos([s], `${s.plan === 'L' ? 'entreno libre' : 'sesión ' + s.plan} del ${L.fechaLarga(s.fecha)}`));
    toast(ok ? 'Copiado: pégalo en Claude' : 'No se ha podido copiar');
  };
  return html`<${Hoja} titulo=${`${s.plan === 'L' ? 'Entreno libre' : 'Sesión ' + s.plan} · ${L.fechaLarga(s.fecha)}`} alCerrar=${alCerrar}>
    <div class="pila">
      ${s.aprox && html`<p class="t2 peq">Apuntado después con pesos estándar: no son los que levantaste. No cuenta para récords ni para la progresión.</p>`}
      ${s.calentamiento?.fin && html`<p class="t2 peq">Calentamiento: ${Math.max(1, Math.round((new Date(s.calentamiento.fin) - new Date(s.calentamiento.inicio)) / 60000))} min</p>`}
      ${grupos.length === 0 && html`<p class="t2">Este entreno no tiene series marcadas.</p>`}
      ${grupos.map((g) => html`<div class="tarjeta">
        <div class="fila-f" style="margin-bottom:8px">
          <${FotoEj} ej=${g.ej} clase="mini" quieta />
          <b class="crece">${g.nombre}</b>
        </div>
        ${g.series.map((r, i) => html`<div class="fila-f peq" style="justify-content:space-between;padding:5px 2px;border-top:1px solid var(--superficie3)">
          <span class="t2">${etiquetaSerie(r)}</span><span class="num" style="font-size:15px">${textoSerie(r, g.ej)}</span>
        </div>`)}
      </div>`)}
      ${s.cinta && html`<div class="tarjeta"><b>Caminata en cinta</b><div class="t2 peq" style="margin-top:4px">${textoCinta(s.cinta)}</div></div>`}
      <button class="boton" onClick=${pasar}><${Icono} n="compartir" t=${20} g=${2.2} />Copiar para Claude</button>
      ${borrando
        ? html`<button class="boton peligro" onClick=${borrar}>Sí, borrar este entreno y sus series</button>`
        : html`<button class="boton peligro" style="background:none" onClick=${() => ponerBorrando(true)}>Borrar este entreno</button>`}
    </div>
  <//>`;
}

// ---------------------------------------------------------------- apuntar un entreno pasado

// Para un día que entrenaste y no quedó registrado. Se rellena con valores estándar
// (tu peso de partida, reps mínimas del rango, RIR 3) y se puede cambiar antes de guardar.
function HojaEntrenoPasado({ alCerrar }) {
  const hoy = L.hoyISO();
  const [fecha, ponerFecha] = useState(L.sumarDias(hoy, -1));
  const [plan, ponerPlan] = useState(siguientePlan());
  const [valores, ponerValores] = useState({});
  const def = E.rutina[plan];
  const items = def.ejercicios.map((x, i) => ({ x, i, ej: E.ejercicioPorId.get(x.id) })).filter((o) => o.ej);
  const yaHay = E.sesiones.some((s) => s.fecha === fecha && s.fin);

  const val = (ej, c) => valores[ej.id]?.[c] ?? (c === 'peso' ? (ej.pesoInicial != null ? String(ej.pesoInicial).replace('.', ',') : '') : String(ej.repMin));
  const poner = (ej, c, v) => ponerValores({ ...valores, [ej.id]: { ...valores[ej.id], [c]: v } });

  const guardar = async () => {
    if (!fecha || fecha > hoy) { toast('Elige un día que ya haya pasado'); return; }
    const inicio = L.desdeISO(fecha); inicio.setHours(19, 0, 0, 0);
    const sesion = {
      id: db.nuevoId('s'), fecha, plan, nombre: def.nombre, aprox: true,
      inicio: inicio.toISOString(), fin: new Date(inicio.getTime() + 50 * 60000).toISOString(),
      ejercicios: def.ejercicios.map((x) => ({ id: x.id, series: x.series })),
    };
    const filas = [];
    for (const { x, i, ej } of items) {
      const peso = aNum(val(ej, 'peso'));
      const reps = aNum(val(ej, 'reps')) || ej.repMin;
      for (let f = 0; f < x.series; f++) {
        filas.push({ id: db.nuevoId('r') + i + f, sesionId: sesion.id, ejercicioId: ej.id, item: i, fecha, indice: f,
          peso: peso ?? null, reps, rir: 3, aprox: true, ts: inicio.getTime() + (filas.length + 1) * 120000 });
      }
    }
    await db.guardar('sesiones', sesion);
    await db.guardarVarios('series', filas);
    if (!E.config.primeraSesion || E.config.primeraSesion > fecha) await guardarConfig({ primeraSesion: fecha });
    await recargar(); avisar();
    toast(`Sesión ${plan} del ${L.fechaLarga(fecha)} apuntada`, 3000);
    alCerrar();
  };

  return html`<${Hoja} titulo="Apuntar un entreno pasado" alCerrar=${alCerrar}>
    <div class="pila">
      <label class="campo"><span>Día</span>
        <input class="entrada" type="date" max=${hoy} value=${fecha} onInput=${(e) => ponerFecha(e.currentTarget.value)} /></label>
      <div class="segmentado">${ORDEN_SESIONES.map((p) => html`<button class=${p === plan ? 'activo' : ''} onClick=${() => { ponerPlan(p); ponerValores({}); }}>Sesión ${p}</button>`)}</div>
      ${yaHay && html`<div class="aviso">Ese día ya tiene un entreno guardado. Si guardas, habrá dos.</div>`}
      <p class="t2 peq">Con valores estándar: tu peso de partida y las repeticiones mínimas. Cámbialos si te acuerdas. Contará como día de gimnasio y para la rotación, pero no para récords ni para las subidas de peso.</p>
      <div class="tarjeta">
        <div style="display:grid;grid-template-columns:1fr 64px 52px;gap:6px;font-size:11px;font-weight:700;color:var(--texto2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">
          <span>${def.nombre}</span><span style="text-align:center">Kg</span><span style="text-align:center">Reps</span></div>
        ${items.map(({ x, ej }) => html`<div style="display:grid;grid-template-columns:1fr 64px 52px;gap:6px;align-items:center;padding:5px 0">
          <div class="crece"><div class="peq corta" style="font-weight:600">${ej.nombre}</div><div class="t2" style="font-size:12px">${x.series} series</div></div>
          <input class="caja num" inputmode="decimal" placeholder="–" value=${val(ej, 'peso')} onInput=${(e) => poner(ej, 'peso', e.currentTarget.value)} />
          <input class="caja num" inputmode="numeric" value=${val(ej, 'reps')} onInput=${(e) => poner(ej, 'reps', e.currentTarget.value)} />
        </div>`)}
      </div>
      <button class="boton" onClick=${guardar}>Guardar entreno</button>
    </div>
  <//>`;
}

// ---------------------------------------------------------------- entreno en marcha

function EntrenoActivo({ sesion }) {
  const [, tic] = useState(0);
  const [abierto, ponerAbierto] = useState(null);
  const [hoja, ponerHoja] = useState(null); // { tipo: 'menu'|'cambiar'|'anadir'|'terminar', i }

  useEffect(() => {
    const t = setInterval(() => tic((x) => x + 1), 1000);
    if (E.config.pantallaEncendida !== false) D.pantallaEncendida(true);
    return () => clearInterval(t);
  }, []);

  const seriesSesion = E.series.filter((s) => s.sesionId === sesion.id);
  const hechasDe = (i) => seriesCompletas(seriesSesion.filter((s) => s.item === i && !s.calent),
    E.ejercicioPorId.get(sesion.ejercicios[i]?.id)?.lados);
  // Abierto por defecto: el primer ejercicio que no está completo.
  const primeroPendiente = sesion.ejercicios.findIndex((x, i) => hechasDe(i) < x.series);
  const actual = abierto ?? (primeroPendiente === -1 ? null : primeroPendiente);

  const seg = Math.floor((Date.now() - new Date(sesion.inicio)) / 1000);
  const limite = (E.config.perfil?.limiteSesionMin || 55) * 60;

  const cambiarPlan = async (cambio) => { await guardarSesion({ ...sesion, ejercicios: cambio(sesion.ejercicios.map((x) => ({ ...x }))) }); };

  return html`
    <div class="cab-entreno">
      <div class="crece">
        <span class="pastilla">${sesion.plan === 'L' ? 'Libre' : `Sesión ${sesion.plan}`}</span>
        <h1 class="titulo">${sesion.nombre}</h1>
      </div>
      <button class="boton chico" onClick=${() => ponerHoja({ tipo: 'terminar' })}>Terminar</button>
    </div>
    <div class=${`crono ${seg > limite ? 'pasado' : ''}`}>
      <span class="num">${L.mmss(seg)}</span>
      <span class="barra-fina"><i style=${`width:${Math.min(100, (seg / limite) * 100)}%`}></i></span>
      <span class="t2">${limite / 60} min</span>
    </div>
    ${E.fase?.motivo && html`<div class="sugerencia" style="margin-bottom:12px"><${Icono} n="reloj" t=${18} g=${2} />${E.fase.motivo}</div>`}

    <div class="pila">
      <${TarjetaCalentamiento} sesion=${sesion} />
      ${sesion.ejercicios.map((item, i) => {
        const ej = E.ejercicioPorId.get(item.id);
        if (!ej) return null;
        return i === actual
          ? html`<${TarjetaEjercicio} key=${item.id + i} sesion=${sesion} item=${item} i=${i} ej=${ej}
              alMenu=${() => ponerHoja({ tipo: 'menu', i })}
              alCompletar=${() => ponerAbierto(sesion.ejercicios.findIndex((x, j) => j > i && hechasDe(j) < x.series))}
              alAnadirSerie=${() => cambiarPlan((l) => { l[i].series++; return l; })}
              alAnadirAprox=${() => cambiarPlan((l) => { l[i].calent = (l[i].calent || 0) + 1; return l; })}
              alCambiar=${() => (seriesSesion.some((s) => s.item === i && !s.calent)
                ? toast('Ya tienes series de este ejercicio. Para hacer otro, usa «Añadir ejercicio».', 3500)
                : ponerHoja({ tipo: 'cambiar', i }))} />`
          : html`<button class="tarjeta plegada ej" key=${item.id + i} onClick=${() => ponerAbierto(i)}>
              <${FotoEj} ej=${ej} clase="mini" quieta />
              <div class="crece"><div class="ej-nombre">${ej.nombre}</div>
                <div class="ej-meta">${hechasDe(i)} de ${item.series} series · ${ej.repMin}–${ej.repMax} ${ej.segundos ? 'seg' : 'reps'}</div></div>
              ${hechasDe(i) >= item.series && html`<span class="hecho-marca"><${Icono} n="check" t=${16} g=${3} /></span>`}
            </button>`;
      })}
      <button class="boton suave" onClick=${() => ponerHoja({ tipo: 'anadir' })}><${Icono} n="mas" t=${20} g=${2.2} />Añadir ejercicio</button>
      <${TarjetaCinta} sesion=${sesion} />
    </div>

    ${hoja?.tipo === 'menu' && html`<${MenuEjercicio} sesion=${sesion} i=${hoja.i} hechas=${hechasDe(hoja.i)}
        alCerrar=${() => ponerHoja(null)} alCambiar=${() => ponerHoja({ tipo: 'cambiar', i: hoja.i })} cambiarPlan=${cambiarPlan} />`}
    ${hoja?.tipo === 'cambiar' && html`<${HojaCambiar} sesion=${sesion} i=${hoja.i} cambiarPlan=${cambiarPlan}
        alCerrar=${() => ponerHoja(null)} alHecho=${() => { const i = hoja.i; ponerHoja(null); ponerAbierto(i); }} />`}
    ${hoja?.tipo === 'anadir' && html`<${Hoja} titulo="Añadir ejercicio" alCerrar=${() => ponerHoja(null)}>
        <${ListaEjercicios} alElegir=${async (ej) => {
          await cambiarPlan((l) => [...l, { id: ej.id, series: 3 }]); ponerHoja(null); ponerAbierto(sesion.ejercicios.length);
        }} />
      <//>`}
    ${hoja?.tipo === 'terminar' && html`<${HojaTerminar} sesion=${sesion} series=${seriesSesion} seg=${seg} alCerrar=${() => ponerHoja(null)} />`}`;
}

// ---------------------------------------------------------------- un ejercicio con sus series

// tipo 'a' = serie de aproximación (calent: no cuenta), 't' = serie de trabajo.
// lado 'izq' | 'der' en ejercicios por lados; null en el resto.
function TarjetaEjercicio({ sesion, item, i, ej, alMenu, alCambiar, alCompletar, alAnadirSerie, alAnadirAprox }) {
  const [borrador, ponerBorrador] = useState({});
  // Los entrenos apuntados después con pesos estándar no guían la progresión.
  const previas = seriesDe(ej.id).filter((s) => s.sesionId !== sesion.id && !s.aprox);
  const analisis = L.analizarEjercicio(ej, previas, E.fase || L.faseActual(null));
  const ultima = analisis.ultima;
  const mias = E.series.filter((s) => s.sesionId === sesion.id && s.item === i && s.ejercicioId === ej.id);
  const hechas = trabajo(mias);
  const rirObj = L.rirObjetivo(ej, E.fase || {});
  const corporal = ej.tipo === 'corporal';
  const LADOS = ej.lados ? ['izq', 'der'] : [null];
  const base = analisis.pesoSugerido ?? ej.pesoInicial ?? null;

  const buscar = (tipo, f, lado) => mias.find((s) => !!s.calent === (tipo === 'a') && s.indice === f && (s.lado ?? null) === lado);
  const anterior = (f, lado) => (lado
    ? ultima?.series.find((s) => s.indice === f && s.lado === lado)
    : ultima?.series.filter((s) => !s.lado)[f]);

  const sugerencia = (tipo, f, lado) => {
    if (tipo === 'a') {
      const peso = base ? L.redondearCarga(base * (f === 0 ? 0.5 : 0.75), ej.incremento || 2.5) : (corporal ? 0 : null);
      return { peso, reps: f === 0 ? 10 : 6, rir: null };
    }
    const previa = hechas.filter((s) => (s.lado ?? null) === lado && s.indice < f).sort((a, b) => b.indice - a.indice)[0];
    return {
      peso: previa?.peso ?? base ?? (corporal ? 0 : null),
      reps: analisis.aviso?.tipo === 'subir' ? ej.repMin : (anterior(f, lado)?.reps ?? ej.repMin),
      rir: rirPorDefecto(rirObj),
    };
  };

  const clave = (tipo, f, lado, campo) => `${tipo}${f}${lado || ''}-${campo}`;
  const valor = (tipo, f, lado, campo) => borrador[clave(tipo, f, lado, campo)];
  // Con función: si se escriben dos casillas muy seguidas, no se pisa una a la otra.
  const poner = (tipo, f, lado, campo, v) => ponerBorrador((prev) => ({ ...prev, [clave(tipo, f, lado, campo)]: v }));

  const marcar = async (tipo, f, lado) => {
    D.prepararAudio();
    const hecha = buscar(tipo, f, lado);
    if (hecha) { // desmarcar: vuelve a ser editable
      await db.borrar('series', hecha.id);
      E.series = E.series.filter((s) => s.id !== hecha.id);
      poner(tipo, f, lado, 'peso', String(hecha.peso ?? '')); avisar();
      return;
    }
    const sug = sugerencia(tipo, f, lado);
    const peso = aNum(valor(tipo, f, lado, 'peso')) ?? sug.peso ?? (corporal ? 0 : null);
    const reps = aNum(valor(tipo, f, lado, 'reps')) ?? sug.reps;
    const rir = tipo === 'a' ? null : (aNum(valor(tipo, f, lado, 'rir')) ?? sug.rir);
    if (peso == null) { toast('Falta el peso: escríbelo en la casilla de kg'); return; }
    if (!reps) { toast('Falta el número de repeticiones'); return; }

    const mejorAntes = Math.max(0, ...seriesDe(ej.id).map((s) => unaRM(s.peso, s.reps)));
    const nueva = {
      id: db.nuevoId('r'), sesionId: sesion.id, ejercicioId: ej.id, item: i, fecha: sesion.fecha,
      indice: f, peso, reps, rir, ts: Date.now(),
      ...(tipo === 'a' ? { calent: true } : {}), ...(lado ? { lado } : {}),
    };
    await db.guardar('series', nueva);
    E.series.push(nueva);
    D.vibrar();

    if (tipo === 'a') { D.empezar(60); avisar(); return; }
    // Por lados: al acabar un lado se pasa al otro sin descanso; descansa al completar la serie.
    const otro = lado && buscar('t', f, lado === 'izq' ? 'der' : 'izq');
    if (!lado || otro) D.empezar(ej.descanso || 90);
    if (mejorAntes > 0 && unaRM(peso, reps) > mejorAntes) toast(`Récord en ${ej.nombre.split(',')[0]}: ${n1(peso)} kg × ${reps}`, 3500);
    avisar();
    if (seriesCompletas([...hechas, nueva], ej.lados) >= item.series) setTimeout(alCompletar, 350);
  };

  const ultimoIndice = Math.max(-1, ...hechas.map((s) => s.indice ?? 0));
  const filas = Array.from({ length: Math.max(item.series, ultimoIndice + 1) }, (_, f) => f);
  const nAprox = Math.max(item.calent || 0, ...mias.filter((s) => s.calent).map((s) => (s.indice ?? 0) + 1));
  const aproxs = Array.from({ length: nAprox }, (_, f) => f);

  const fila = (tipo, f, lado) => {
    const h = buscar(tipo, f, lado);
    const sug = sugerencia(tipo, f, lado);
    const ant = tipo === 't' ? anterior(f, lado) : null;
    const campo = (c, ph) => html`<input class="caja num" inputmode="decimal" enterkeyhint="done"
      value=${h ? String(h[c] ?? '').replace('.', ',') : (valor(tipo, f, lado, c) ?? '')} placeholder=${ph ?? '–'} readOnly=${!!h}
      onInput=${(e) => poner(tipo, f, lado, c, e.currentTarget.value)} onFocus=${(e) => e.currentTarget.select()} />`;
    return html`<div class=${`fila-serie ${tipo === 'a' ? 'calent' : ''} ${h ? 'hecha' : ''}`} key=${tipo + f + (lado || '')}>
      <span class="n">${tipo === 'a' ? `A${f + 1}` : f + 1}${lado ? html`<small>${lado === 'izq' ? 'Izq' : 'Der'}</small>` : null}</span>
      <span class="ant">${tipo === 'a' ? 'Aprox.' : ant ? `${n1(ant.peso)} × ${ant.reps}` : '–'}</span>
      ${campo('peso', sug.peso != null ? n1(sug.peso) : '–')}
      ${campo('reps', sug.reps)}
      ${tipo === 'a' ? html`<span></span>` : campo('rir', sug.rir)}
      <button class="ok" onClick=${() => marcar(tipo, f, lado)} aria-label=${h ? 'Desmarcar serie' : 'Marcar serie hecha'}><${Icono} n="check" t=${20} g=${3} /></button>
    </div>`;
  };

  return html`<div class="tarjeta ej">
    <div class="ej-cab">
      <button onClick=${() => ir('ejercicio/' + ej.id)} aria-label=${'Ver ' + ej.nombre}><${FotoEj} ej=${ej} clase="mini-g" /></button>
      <div class="crece">
        <div class="ej-nombre">${ej.nombre}</div>
        <div class="ej-meta">${item.series} series${ej.lados ? ' por lado' : ''} · ${ej.repMin}–${ej.repMax} ${ej.segundos ? 'seg' : 'reps'} · RIR ${rirObj}</div>
      </div>
      <button class="mas" onClick=${alCambiar} aria-label="Cambiar por otro ejercicio"><${Icono} n="cambiar" t=${21} g=${2.2} /></button>
      <button class="mas" onClick=${alMenu} aria-label="Opciones del ejercicio"><${Icono} n="puntos" t=${22} /></button>
    </div>

    ${analisis.aviso && html`<div class="sugerencia" style="margin-top:12px"><${Icono} n=${analisis.aviso.tipo === 'subir' ? 'subir' : 'cambiar'} t=${18} g=${2.4} />${analisis.aviso.texto}</div>`}
    ${ej.aviso && html`<div class="aviso" style="margin-top:8px"><${Icono} n="aviso" t=${17} g=${2} />${ej.aviso}</div>`}

    <div class="series">
      <div class="fila-serie cabeza"><span>Serie</span><span>Anterior</span><span>${corporal ? '+Kg' : 'Kg'}</span><span>${ej.segundos ? 'Seg' : 'Reps'}</span><span>RIR</span><span></span></div>
      ${aproxs.map((f) => LADOS.map((lado) => fila('a', f, lado)))}
      ${filas.map((f) => LADOS.map((lado) => fila('t', f, lado)))}
    </div>
    <div class="dos-botones" style="margin-top:8px">
      <button class="anadir-serie" style="margin-top:0" onClick=${alAnadirSerie}>+ Serie</button>
      <button class="anadir-serie" style="margin-top:0" onClick=${alAnadirAprox}>+ Aproximación</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- calentamiento

function TarjetaCalentamiento({ sesion }) {
  const [, tic] = useState(0);
  const [marcados, ponerMarcados] = useState({});
  const [abierta, ponerAbierta] = useState(false);
  const cal = sesion.calentamiento || {};
  const plan = CALENTAMIENTOS[sesion.plan] || CALENTAMIENTOS.L;
  const enMarcha = !!cal.inicio && !cal.fin;
  useEffect(() => {
    if (!enMarcha) return undefined;
    const t = setInterval(() => tic((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [enMarcha]);

  const empezar = () => { D.prepararAudio(); guardarSesion({ ...sesion, calentamiento: { inicio: new Date().toISOString() } }); };
  const terminar = () => {
    guardarSesion({ ...sesion, calentamiento: { ...cal, fin: new Date().toISOString() } });
    toast('Calentamiento hecho: a por las series de aproximación');
  };
  const minutos = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 60000));

  if (cal.fin && !abierta) {
    return html`<button class="tarjeta plegada" onClick=${() => ponerAbierta(true)}>
      <span class="hecho-marca"><${Icono} n="check" t=${16} g=${3} /></span>
      <div class="crece"><div class="ej-nombre">Calentamiento hecho</div><div class="ej-meta">${minutos(cal.inicio, cal.fin)} min</div></div>
    </button>`;
  }
  const seg = enMarcha ? Math.floor((Date.now() - new Date(cal.inicio)) / 1000) : 0;
  return html`<div class="tarjeta">
    <div class="fila-f" style="justify-content:space-between;align-items:flex-start">
      <div><div class="ej-nombre">Calentamiento</div><div class="ej-meta">Unos ${plan.min} min, antes del primer ejercicio</div></div>
      ${enMarcha && html`<span class="num" style="font-size:24px">${L.mmss(seg)}</span>`}
    </div>
    <div style="margin:8px 0 12px">
      ${plan.pasos.map((p, k) => html`<button class=${`paso-cal ${marcados[k] ? 'hecho' : ''}`} onClick=${() => ponerMarcados({ ...marcados, [k]: !marcados[k] })}>
        <i>${marcados[k] ? html`<${Icono} n="check" t=${14} g=${3} />` : null}</i><span>${p}</span>
      </button>`)}
    </div>
    ${cal.fin ? html`<button class="boton suave" onClick=${() => ponerAbierta(false)}>Plegar</button>`
      : enMarcha ? html`<button class="boton" onClick=${terminar}>Terminar calentamiento</button>`
      : html`<button class="boton" onClick=${empezar}>Empezar calentamiento</button>`}
  </div>`;
}

// ---------------------------------------------------------------- caminata en cinta

function TarjetaCinta({ sesion }) {
  const c = sesion.cinta;
  const [editando, ponerEditando] = useState(false);
  const txt = (x) => (x == null ? '' : String(x).replace('.', ','));
  const [v, ponerV] = useState({ min: txt(c?.min), kmh: txt(c?.kmh), incl: txt(c?.incl), km: txt(c?.km) });
  const kmCalculados = aNum(v.min) && aNum(v.kmh) ? (aNum(v.min) / 60) * aNum(v.kmh) : null;

  const guardar = async () => {
    const datos = { min: aNum(v.min), kmh: aNum(v.kmh), incl: aNum(v.incl), km: aNum(v.km) ?? (kmCalculados != null ? Math.round(kmCalculados * 100) / 100 : null) };
    if (!datos.min) { toast('Pon al menos el tiempo'); return; }
    await guardarSesion({ ...sesion, cinta: datos });
    ponerEditando(false); toast('Caminata guardada');
  };

  if (!editando) {
    return c
      ? html`<button class="tarjeta plegada" onClick=${() => ponerEditando(true)}>
          <span class="hecho-marca"><${Icono} n="check" t=${16} g=${3} /></span>
          <div class="crece"><div class="ej-nombre">Caminata en cinta</div><div class="ej-meta">${textoCinta(c)}</div></div>
        </button>`
      : html`<button class="boton suave" onClick=${() => ponerEditando(true)}><${Icono} n="mas" t=${20} g=${2.2} />Caminata en cinta</button>`;
  }
  const campo = (k, t, modo = 'decimal', ph = '') => html`<label class="campo"><span>${t}</span>
    <input class="entrada num" inputmode=${modo} placeholder=${ph} value=${v[k]}
      onInput=${(e) => { const x = e.currentTarget.value; ponerV((prev) => ({ ...prev, [k]: x })); }} /></label>`;
  return html`<div class="tarjeta pila">
    <div class="ej-nombre">Caminata en cinta</div>
    <div class="rejilla-2">${campo('min', 'Tiempo (min)', 'numeric')}${campo('kmh', 'Velocidad (km/h)')}</div>
    <div class="rejilla-2">${campo('incl', 'Inclinación (%)')}${campo('km', 'Distancia (km)', 'decimal', kmCalculados != null ? n2(kmCalculados) : '')}</div>
    <p class="t2 peq">Si dejas la distancia vacía, se calcula con el tiempo y la velocidad.</p>
    <div class="dos-botones">
      <button class="boton suave" onClick=${() => ponerEditando(false)}>Cancelar</button>
      <button class="boton" onClick=${guardar}>Guardar</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- cambiar un ejercicio por otro

function HojaCambiar({ sesion, i, cambiarPlan, alCerrar, alHecho }) {
  const actual = E.ejercicioPorId.get(sesion.ejercicios[i].id);
  const enRutina = ORDEN_SESIONES.includes(sesion.plan) && E.rutina[sesion.plan]?.ejercicios.some((x) => x.id === actual?.id);
  const [tambien, ponerTambien] = useState(false);

  const elegir = async (ej) => {
    // Las aproximaciones hechas eran del ejercicio de antes: fuera, para que no pasen al nuevo.
    for (const s of E.series.filter((x) => x.sesionId === sesion.id && x.item === i && x.calent)) await db.borrar('series', s.id);
    E.series = E.series.filter((x) => !(x.sesionId === sesion.id && x.item === i && x.calent));
    await cambiarPlan((l) => { l[i].id = ej.id; return l; });
    if (tambien && enRutina) {
      const r = JSON.parse(JSON.stringify(E.rutina));
      r[sesion.plan].ejercicios = r[sesion.plan].ejercicios.map((x) => (x.id === actual.id ? { ...x, id: ej.id } : x));
      await db.escribirMeta('rutina', r);
      E.rutina = r; avisar();
      toast(`Cambiado también en tu Sesión ${sesion.plan}`);
    }
    alHecho();
  };

  return html`<${Hoja} titulo=${`Cambiar ${actual ? actual.nombre.split(',')[0].toLowerCase() : 'ejercicio'}`} alCerrar=${alCerrar}>
    ${enRutina && html`<div class="fila-f" style="padding:0 2px 12px">
      <div class="crece"><div style="font-weight:600">También en mi rutina</div><div class="t2 peq">Si no, solo cambia en el entreno de hoy.</div></div>
      <${Interruptor} etiqueta="También en mi rutina" valor=${tambien} alCambiar=${ponerTambien} />
    </div>`}
    <${ListaEjercicios} grupo=${actual?.grupo} alElegir=${elegir} />
  <//>`;
}

function MenuEjercicio({ sesion, i, hechas, alCerrar, alCambiar, cambiarPlan }) {
  const item = sesion.ejercicios[i];
  const ej = E.ejercicioPorId.get(item.id);
  const mover = async (d) => { await cambiarPlan((l) => { const j = i + d; if (j < 0 || j >= l.length) return l; [l[i], l[j]] = [l[j], l[i]]; return l; }); alCerrar(); };
  const opcion = (icono, texto, accion, peligro = false) => html`<button class="item" onClick=${accion}>
    <${Icono} n=${icono} t=${22} /><span class="crece" style=${peligro ? 'color:var(--aviso-texto);font-weight:600' : 'font-weight:600'}>${texto}</span></button>`;
  return html`<${Hoja} titulo=${ej?.nombre || 'Ejercicio'} alCerrar=${alCerrar}>
    <div class="lista">
      ${opcion('ejercicios', 'Ver técnica e historial', () => { alCerrar(); ir('ejercicio/' + item.id); })}
      ${hechas === 0 ? opcion('cambiar', 'Cambiar por otro ejercicio', alCambiar) : null}
      ${opcion('mas', 'Añadir una serie', async () => { await cambiarPlan((l) => { l[i].series++; return l; }); alCerrar(); })}
      ${item.series > Math.max(1, hechas) ? opcion('menos', 'Quitar una serie', async () => { await cambiarPlan((l) => { l[i].series--; return l; }); alCerrar(); }) : null}
      ${i > 0 ? opcion('subir', 'Mover arriba', () => mover(-1)) : null}
      ${hechas === 0 ? opcion('basura', 'Quitar de este entreno', async () => { await cambiarPlan((l) => l.filter((_, j) => j !== i)); alCerrar(); }, true) : null}
    </div>
  <//>`;
}

// ---------------------------------------------------------------- terminar

function HojaTerminar({ sesion, series, seg, alCerrar }) {
  const [descartar, ponerDescartar] = useState(false);
  const volumen = volumenDe(series);
  const deTrabajo = trabajo(series);
  const ejerciciosHechos = new Set(deTrabajo.map((s) => s.item)).size;

  const terminar = async () => {
    const ahora = new Date().toISOString();
    // Un calentamiento que se quedó en marcha se cierra con el entreno.
    const cal = sesion.calentamiento?.inicio && !sesion.calentamiento.fin ? { ...sesion.calentamiento, fin: ahora } : sesion.calentamiento;
    await guardarSesion({ ...sesion, calentamiento: cal, fin: ahora });
    D.parar(); D.pantallaEncendida(false);
    toast(`Entreno guardado: ${Math.round(seg / 60)} min y ${n0(volumen)} kg movidos`, 3500);
    ir('hoy');
  };
  const borrarTodo = async () => {
    for (const s of series) await db.borrar('series', s.id);
    await db.borrar('sesiones', sesion.id);
    D.parar(); D.pantallaEncendida(false);
    await recargar(); avisar(); toast('Entreno descartado'); ir('hoy');
  };

  return html`<${Hoja} titulo="Terminar entreno" alCerrar=${alCerrar}>
    <div class="rejilla-3" style="margin-bottom:16px">
      <div class="tarjeta dato"><small>Tiempo</small><div class="num">${Math.round(seg / 60)} <span>min</span></div></div>
      <div class="tarjeta dato"><small>Series</small><div class="num">${deTrabajo.length}</div></div>
      <div class="tarjeta dato"><small>Movido</small><div class="num">${n0(volumen)} <span>kg</span></div></div>
    </div>
    ${sesion.cinta && html`<p class="t2" style="margin-bottom:10px">Caminata en cinta: ${textoCinta(sesion.cinta)}</p>`}
    ${deTrabajo.length === 0 && html`<p class="t2" style="margin-bottom:14px">No has marcado ninguna serie. Si lo guardas contará como día de gimnasio para la comida.</p>`}
    ${ejerciciosHechos > 0 && ejerciciosHechos < sesion.ejercicios.length && html`<p class="t2" style="margin-bottom:14px">Has hecho ${ejerciciosHechos} de ${sesion.ejercicios.length} ejercicios. Lo que falta no se guarda.</p>`}
    <div class="pila">
      <button class="boton" onClick=${terminar}>Guardar entreno</button>
      <button class="boton suave" onClick=${alCerrar}>Seguir entrenando</button>
      ${descartar
        ? html`<button class="boton peligro" onClick=${borrarTodo}>Sí, borrar este entreno y sus series</button>`
        : html`<button class="boton peligro" style="background:none" onClick=${() => ponerDescartar(true)}>Descartar entreno</button>`}
    </div>
  <//>`;
}

// ---------------------------------------------------------------- barra de descanso (visible en todas las pantallas)

export function BarraDescanso() {
  const [, tic] = useState(0);
  useEffect(() => { const t = setInterval(() => tic((x) => x + 1), 250); return () => clearInterval(t); }, []);
  const d = E.descanso;
  if (!d) return null;
  const queda = D.restante();
  const fin = queda <= 0;
  return html`<div class=${`descanso ${fin ? 'fin' : ''}`} role="timer" aria-live="off">
    <span class="linea" style=${`transform:scaleX(${d.total ? queda / d.total : 0})`}></span>
    <div class="crece">
      <small>${fin ? 'A por la siguiente' : 'Descanso'}</small>
      <span class="num">${fin ? '0:00' : L.mmss(queda)}</span>
    </div>
    ${!fin && html`<button onClick=${() => D.ajustar(-15)} aria-label="Quitar 15 segundos">−15</button>
      <button onClick=${() => D.ajustar(15)} aria-label="Añadir 15 segundos">+15</button>`}
    <button onClick=${D.parar}>${fin ? 'Vale' : 'Saltar'}</button>
  </div>`;
}
