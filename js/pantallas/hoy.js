// hoy.js — pantalla de inicio: qué entreno toca, cómo vas de comida, la semana y el peso.

import { html, useEffect, useState } from '../vendor/preact-htm.js';
import { E, useEstado, avisar, toast, sesionesTerminadas, siguientePlan, recargar, tituloSesion } from '../estado.js';
import * as L from '../logica.js';
import * as db from '../db.js';
import { cargarDia } from '../dia.js';
import { Icono, FotoEj, Anillo, GraficaLinea, Hoja, ir, n0, n1, aNum } from '../comunes.js';
import { iniciarSesion, minutosEstimados } from './entreno.js';
import { guardarCopia } from './ajustes.js';
import { QUIEN } from '../perfiles.js';
import { Pinguinos } from './ciclo.js';

const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const fechaBonita = (iso) => capital(L.desdeISO(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));

export function Hoy() {
  useEstado();
  const hoy = L.hoyISO();
  const [dia, ponerDia] = useState(null);
  const [pesos, ponerPesos] = useState([]);
  const [hojaPeso, ponerHojaPeso] = useState(false);

  const cargar = async () => {
    if (!QUIEN.comida && !QUIEN.cuerpo) return; // su app no lleva comida ni peso
    const [d, p] = await Promise.all([cargarDia(hoy), db.todos('peso')]);
    ponerDia(d); ponerPesos(p);
  };
  useEffect(() => { cargar(); }, [E.sesiones.length]);

  return html`
    <header class="cabecera">
      <div>
        <div class="eyebrow">${fechaBonita(hoy)}</div>
        <h1 class="titulo">Hoy</h1>
      </div>
      <button class="icono-btn" onClick=${() => ir('ajustes')} aria-label="Ajustes"><${Icono} n="ajustes" t=${20} g=${2} /></button>
    </header>

    <div class="pila">
      <${TarjetaEntreno} />
      <${TarjetaCiclo} />
      <${AvisoCopia} />
      ${QUIEN.comida && dia && html`<${TarjetaComida} dia=${dia} />`}
      <${TarjetaSemana} hoy=${hoy} />
      ${QUIEN.cuerpo && html`<${TarjetaPeso} pesos=${pesos} alPulsar=${() => ponerHojaPeso(true)} />`}
    </div>

    ${hojaPeso && html`<${HojaPeso} alCerrar=${() => ponerHojaPeso(false)} alGuardar=${cargar} />`}`;
}

// ---------------------------------------------------------------- entreno

function TarjetaEntreno() {
  const activa = E.sesionActiva;
  if (activa) {
    const min = Math.floor((Date.now() - new Date(activa.inicio)) / 60000);
    return html`<div class="tarjeta">
      <div class="peq" style="font-weight:700;color:var(--acento)">Entreno en marcha</div>
      <h3 class="titulo" style="font-size:23px;margin:5px 0 3px">${tituloSesion(activa)}</h3>
      <div class="t3 peq" style="margin-bottom:16px">Empezaste hace ${min} min</div>
      <button class="boton" onClick=${() => ir('entreno')}>Volver al entreno</button>
    </div>`;
  }

  const plan = siguientePlan();
  const sesion = E.rutina[plan];
  const ejercicios = sesion.ejercicios.map((x) => E.ejercicioPorId.get(x.id)).filter(Boolean);
  const visibles = ejercicios.slice(0, 4);
  const empezar = async () => { await iniciarSesion(plan); ir('entreno'); };

  // Portada: la foto del primer ejercicio a sangre y el entreno del día encima.
  return html`<div class="portada">
    <div class="fondo">${ejercicios[0] && html`<${FotoEj} ej=${ejercicios[0]} clase="lleno" quieta />`}</div>
    <div class="encima">
      <div class="hueco"></div>
      <div class="marca">Te toca</div>
      <h3 class="titulo">${sesion.nombre}</h3>
      <div class="t2 peq">${sesion.nota ? `${sesion.nota} · ` : ''}${ejercicios.length} ejercicios · unos ${minutosEstimados(sesion)} min</div>
      <div class="tira">
        ${visibles.map((ej) => html`<${FotoEj} ej=${ej} clase="mini" quieta />`)}
        ${ejercicios.length > 4 && html`<div class="mini" style="width:44px;height:44px;border-radius:10px;display:grid;place-items:center;background:var(--superficie2);font-weight:700;font-size:14px;color:var(--texto2)">+${ejercicios.length - 4}</div>`}
      </div>
      ${E.fase?.motivo && html`<div class="sugerencia" style="margin-top:14px"><${Icono} n="reloj" t=${18} g=${2} />${E.fase.motivo}</div>`}
      <button class="boton" style="margin-top:14px" onClick=${empezar}>Empezar entreno</button>
      <button class="boton suave" style="margin-top:8px;min-height:44px;font-size:15px" onClick=${() => ir('entreno')}>Elegir otra sesión</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- ciclo

// Las pingüinas saludan desde Hoy y llevan la cuenta del día del ciclo.
function TarjetaCiclo() {
  const a = L.analizarCiclos(E.ciclos);
  const texto = !a.hay ? 'Apunta tu primera regla'
    : a.enRegla ? `Día ${a.dia} de la regla`
    : a.retraso > 0 ? `${a.retraso} ${a.retraso === 1 ? 'día' : 'días'} de retraso`
    : `Día ${a.dia} · te toca en ${a.diasParaProxima} ${a.diasParaProxima === 1 ? 'día' : 'días'}`;
  return html`<button class="tarjeta hola-pinguinas" style="width:100%;text-align:left" onClick=${() => ir('ciclo')}>
    <${Pinguinos} alto=${64} />
    <div class="crece">
      <div class="globo">¡Hola, ${QUIEN.nombre}!</div>
      <div style="font-weight:650;font-size:16px;margin-top:6px">${texto}</div>
      <div class="t3 peq">${a.hay ? L.FASES[a.fase].nombre : 'y llevamos la cuenta por ti'}</div>
    </div>
    <${Icono} n="chevron" t=${18} g=${2.2} clase="chevron" />
  </button>`;
}

// ---------------------------------------------------------------- comida

function TarjetaComida({ dia }) {
  const { totales: t, objetivo: o } = dia;
  const barra = (v, max) => html`<div class="barra-fina"><i style=${`width:${Math.min(100, (v / max) * 100)}%`}></i></div>`;
  return html`<button class="tarjeta" style="display:block;width:100%;text-align:left" onClick=${() => ir('comida')}>
    <div class="anillos">
      <${Anillo} valor=${t.kcal} max=${o.kcal} color="var(--acento)" color2="var(--acento2)" centro=${true}>
        <div class="num">${n0(t.kcal)}</div><small>de ${n0(o.kcal)} kcal</small>
      <//>
      <${Anillo} valor=${t.prot} max=${o.prot} color="var(--anillo2)" color2="var(--anillo2b)" centro=${true}>
        <div class="num">${n0(t.prot)} g</div><small>de ${o.prot} g prot.</small>
      <//>
    </div>
    <div class="macros">
      <div><div class="t">Grasa <b>${n0(t.grasa)} / ${o.grasa} g</b></div>${barra(t.grasa, o.grasa)}</div>
      <div><div class="t">Hidratos <b>${n0(t.hc)} / ${o.hc} g</b></div>${barra(t.hc, o.hc)}</div>
    </div>
    ${dia.avisos.map((a) => html`<div class="aviso" style="margin-top:12px">${a.texto}</div>`)}
  </button>`;
}

// ---------------------------------------------------------------- copia de seguridad

// Aparece sola cuando hay datos y hace 7 días o más de la última copia.
function AvisoCopia() {
  const dias = E.ultimaCopia ? L.diasEntre(E.ultimaCopia, L.hoyISO()) : null;
  const hayDatos = E.sesiones.length > 0 || E.uso.size > 0;
  if (!hayDatos || (dias !== null && dias < 7)) return null;
  // Banner fino: avisa sin robarle protagonismo al entreno del día.
  return html`<div class="tarjeta fila-f" style="padding:12px 14px">
    <span class="icono-btn" style="background:var(--superficie2);box-shadow:none"><${Icono} n="guardar" t=${19} g=${2} /></span>
    <div class="crece">
      <b style="font-size:15px;font-weight:650">${dias === null ? 'Sin copia de tus datos' : `Última copia hace ${dias} días`}</b>
      <p class="t3 peq" style="margin-top:2px">Solo están en este iPhone.</p>
    </div>
    <button class="boton chico" onClick=${() => guardarCopia().catch(() => toast('No se ha podido guardar la copia'))}>Guardar</button>
  </div>`;
}

// ---------------------------------------------------------------- semana

function TarjetaSemana({ hoy }) {
  const dias = L.diasDeSemana(hoy);
  const conSesion = new Set(sesionesTerminadas().map((s) => s.fecha));
  const hechas = dias.filter((d) => conSesion.has(d)).length;
  const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  return html`<div class="tarjeta">
    <div class="fila-f" style="justify-content:space-between;margin-bottom:10px">
      <b style="font-size:15.5px;font-weight:650">Esta semana</b><span class="t3 peq">${hechas} de 4 sesiones</span>
    </div>
    <div class="semana">
      ${dias.map((d, i) => html`<div class=${`${conSesion.has(d) ? 'si' : ''} ${d === hoy ? 'hoy' : ''}`}>
        <span>${LETRAS[i]}</span>
        <i>${conSesion.has(d) ? html`<${Icono} n="check" t=${16} g=${3.2} />` : L.desdeISO(d).getDate()}</i>
      </div>`)}
    </div>
  </div>`;
}

// ---------------------------------------------------------------- peso

function TarjetaPeso({ pesos, alPulsar }) {
  const serie = L.mediaMovil(pesos);
  const ultima = serie[serie.length - 1];
  const hoy = L.hoyISO();
  const pesadaHoy = pesos.some((p) => p.fecha === hoy);
  const ritmo = L.ritmoSemanal(serie);
  const puntos = serie.slice(-21).map((p) => ({ etq: L.fechaCorta(p.fecha), y: p.media }));
  return html`<button class="tarjeta" style="display:block;width:100%;text-align:left" onClick=${alPulsar}>
    <div class="fila-f" style="justify-content:space-between;align-items:flex-start">
      <div class="dato">
        <small>Peso, media de 7 días</small>
        ${ultima
          ? html`<div class="num">${n1(ultima.media)} <span>kg${ritmo !== null ? ` · ${ritmo <= 0 ? '−' : '+'}${n1(Math.abs(ritmo))} kg/sem` : ''}</span></div>`
          : html`<div class="t2" style="margin-top:6px">Aún no hay pesadas.</div>`}
      </div>
      <span class="boton chico ${pesadaHoy ? 'suave' : ''}">${pesadaHoy ? 'Cambiar' : 'Pesarme'}</span>
    </div>
    ${puntos.length >= 2 && html`<div style="margin-top:8px"><${GraficaLinea} puntos=${puntos} alto=${90} sufijo=" kg" /></div>`}
  </button>`;
}

export function HojaPeso({ alCerrar, alGuardar }) {
  const hoy = L.hoyISO();
  const [valor, ponerValor] = useState('');
  useEffect(() => { db.obtener('peso', hoy).then((p) => p && ponerValor(String(p.kg).replace('.', ','))); }, []);
  const guardar = async () => {
    const kg = aNum(valor);
    if (!kg || kg < 30 || kg > 250) { toast('Escribe tu peso en kg, por ejemplo 84,6'); return; }
    await db.guardar('peso', { fecha: hoy, kg });
    toast('Peso guardado');
    await recargar(); avisar(); alGuardar?.(); alCerrar();
  };
  return html`<${Hoja} titulo="Peso de hoy" alCerrar=${alCerrar}>
    <p class="t2" style="margin-bottom:14px">En ayunas y después del baño, para que un día se pueda comparar con otro.</p>
    <div class="cantidad-grande">
      <input class="caja num" inputmode="decimal" autofocus placeholder="84,6" value=${valor}
        onInput=${(e) => ponerValor(e.currentTarget.value)} onKeyDown=${(e) => e.key === 'Enter' && guardar()} />
      <span class="unidad" style="font-size:20px">kg</span>
    </div>
    <button class="boton" onClick=${guardar}>Guardar peso</button>
  <//>`;
}
