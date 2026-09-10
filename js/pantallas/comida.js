// comida.js — el diario del día por tomas, y añadir comida en dos o tres toques:
// alimentos (tuyos y la base), comidas habituales, recetas y atajos.

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { E, useEstado, avisar, toast, recargar, idDe } from '../estado.js';
import * as L from '../logica.js';
import * as db from '../db.js';
import * as S from '../seed.js';
import { cargarDia, registrarComida, borrarComida } from '../dia.js';
import { Icono, Hoja, Anillo, Vacio, n0, n1, aNum } from '../comunes.js';
import { fechaBonita } from './hoy.js';

const sinTildes = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const kcalProt = (m) => `${n0(m.kcal)} kcal · ${n0(m.prot)} g prot`;

export function Comida({ params }) {
  useEstado();
  const hoy = L.hoyISO();
  const fecha = params.fecha || hoy;
  const [dia, ponerDia] = useState(null);
  const [version, ponerVersion] = useState(0);
  const [hoja, ponerHoja] = useState(null); // { tipo: 'anadir'|'item'|'guardar', toma, item }
  const refrescar = () => ponerVersion((v) => v + 1);

  useEffect(() => { cargarDia(fecha).then(ponerDia); }, [fecha, version]);
  const moverDia = (n) => { location.hash = `#/comida?fecha=${L.sumarDias(fecha, n)}`; };

  if (!dia) return null;
  const { totales: t, objetivo: o } = dia;
  const porToma = new Map(S.TOMAS.map((x) => [x.id, []]));
  for (const c of dia.comidas) (porToma.get(c.toma) || porToma.get('comida')).push(c);

  return html`
    <header class="cabecera">
      <div class="crece">
        <div class="eyebrow">${fecha === hoy ? 'Hoy' : fechaBonita(fecha)}</div>
        <h1 class="titulo">Comida</h1>
      </div>
      <div class="fila-f" style="gap:6px">
        <button class="icono-btn" onClick=${() => moverDia(-1)} aria-label="Día anterior"><${Icono} n="atras" t=${18} g=${2.4} /></button>
        <button class="icono-btn" onClick=${() => moverDia(1)} disabled=${fecha >= hoy} style=${fecha >= hoy ? 'opacity:.3' : ''} aria-label="Día siguiente"><${Icono} n="chevron" t=${18} g=${2.4} /></button>
      </div>
    </header>

    <div class="tarjeta">
      <div class="anillos">
        <${Anillo} valor=${t.kcal} max=${o.kcal}><div class="num">${n0(t.kcal)}</div><small>de ${n0(o.kcal)} kcal</small><//>
        <${Anillo} valor=${t.prot} max=${o.prot} color="var(--anillo2)"><div class="num">${n0(t.prot)} g</div><small>de ${o.prot} g proteína</small><//>
      </div>
      <div class="macros">
        <div><div class="t">Grasa <b>${n0(t.grasa)} / ${o.grasa} g</b></div><div class="barra-fina"><i style=${`width:${Math.min(100, (t.grasa / o.grasa) * 100)}%`}></i></div></div>
        <div><div class="t">Hidratos <b>${n0(t.hc)} / ${o.hc} g</b></div><div class="barra-fina"><i style=${`width:${Math.min(100, (t.hc / Math.max(1, o.hc)) * 100)}%`}></i></div></div>
      </div>
      <p class="t2 peq" style="margin-top:12px">${dia.huboGym ? 'Día de gimnasio' : 'Día sin gimnasio'}: objetivo de ${n0(o.kcal)} kcal. Quedan ${n0(Math.max(0, o.kcal - t.kcal))} kcal y ${n0(Math.max(0, o.prot - t.prot))} g de proteína.</p>
    </div>
    ${dia.avisos.map((a) => html`<div class="aviso" style="margin-top:10px">${a.texto}</div>`)}

    ${S.TOMAS.map((toma) => {
      const lista = porToma.get(toma.id);
      const suma = L.sumarMacros(lista);
      return html`<div class="lista toma" key=${toma.id}>
        <div class="toma-cab"><h3>${toma.nombre}</h3><span class="num">${lista.length ? `${n0(suma.kcal)} kcal · ${n0(suma.prot)} g` : ''}</span></div>
        ${lista.map((c) => html`<button class="item" key=${c.id} onClick=${() => ponerHoja({ tipo: 'item', item: c })}>
          <div class="crece"><div class="nombre corta">${c.nombre}</div><div class="meta">${cantidadTexto(c)} · ${kcalProt(c)}</div></div>
        </button>`)}
        <div class="fila-f" style="justify-content:space-between">
          <button class="anadir-toma" style="width:auto" onClick=${() => ponerHoja({ tipo: 'anadir', toma: toma.id })}><${Icono} n="mas" t=${20} g=${2.4} />Añadir</button>
          ${lista.length > 0 && html`<button class="anadir-toma" style="width:auto;color:var(--texto2)" onClick=${() => ponerHoja({ tipo: 'guardar', toma: toma.id, lista })}><${Icono} n="estrella" t=${18} g=${2} />Guardar como habitual</button>`}
        </div>
      </div>`;
    })}

    ${hoja?.tipo === 'anadir' && html`<${HojaAnadir} fecha=${fecha} toma=${hoja.toma} alCerrar=${() => ponerHoja(null)} alCambiar=${refrescar} />`}
    ${hoja?.tipo === 'item' && html`<${HojaItem} item=${hoja.item} alCerrar=${() => ponerHoja(null)} alCambiar=${refrescar} />`}
    ${hoja?.tipo === 'guardar' && html`<${HojaGuardarHabitual} toma=${hoja.toma} lista=${hoja.lista} alCerrar=${() => ponerHoja(null)} />`}`;
}

function cantidadTexto(c) {
  if (c.origen === 'receta') return `${n1(c.cantidad)} ${c.cantidad === 1 ? 'ración' : 'raciones'}`;
  if (c.medida === 'ud') return `${n1(c.cantidad)} ud`;
  return `${n0(c.cantidad)} ${c.medida === 'ml' ? 'ml' : 'g'}`;
}

// ---------------------------------------------------------------- añadir

function HojaAnadir({ fecha, toma, alCerrar, alCambiar }) {
  const [pestana, ponerPestana] = useState('alimentos');
  const [texto, ponerTexto] = useState('');
  const [elegido, ponerElegido] = useState(null); // { tipo: 'alimento'|'receta', x }
  const [creando, ponerCreando] = useState(false);
  const nombreToma = S.TOMAS.find((t) => t.id === toma)?.nombre || '';

  const apuntar = async (datos) => {
    await registrarComida({ fecha, toma, ...datos });
    alCambiar(); toast(`Añadido a ${nombreToma.toLowerCase()}`);
  };
  const apuntarHabitual = async (h) => {
    for (const it of h.items) await registrarComida({ fecha, toma, ...it, origen: it.origen || 'alimento' });
    await db.guardar('habituales', { ...h, veces: (h.veces || 0) + 1 });
    await recargar(); avisar(); alCambiar(); toast(`${h.nombre}: añadido`); alCerrar();
  };

  if (creando) return html`<${Hoja} titulo="Nuevo alimento" alCerrar=${alCerrar}><${FormAlimento} nombre=${texto} alGuardar=${(a) => { ponerCreando(false); ponerElegido({ tipo: 'alimento', x: a }); }} /><//>`;
  if (elegido) return html`<${Hoja} titulo=${elegido.x.nombre} alCerrar=${alCerrar}
      accion=${html`<button class="icono-btn" onClick=${() => ponerElegido(null)} aria-label="Volver"><${Icono} n="atras" t=${18} g=${2.4} /></button>`}>
    <${ElegirCantidad} tipo=${elegido.tipo} x=${elegido.x} toma=${toma} nombreToma=${nombreToma}
      alApuntar=${async (d) => { await apuntar(d); ponerElegido(null); ponerTexto(''); }} />
  <//>`;

  const q = sinTildes(texto.trim());
  let alimentos;
  if (q) alimentos = E.alimentos.filter((a) => sinTildes(a.nombre).includes(q)).slice(0, 80);
  else {
    const usados = E.alimentos.filter((a) => E.uso.has(`alimento|${a.nombre}`));
    alimentos = L.ordenarPorHabito(usados, E.uso, toma).slice(0, 25);
  }
  const recetas = E.recetas.filter((r) => !q || sinTildes(r.nombre).includes(q));
  const habituales = [...E.habituales.filter((h) => !q || sinTildes(h.nombre).includes(q)),
    ...S.RAPIDAS.filter((r) => !q || sinTildes(r.nombre).includes(q)).map((r) => ({
      id: 'rapida-' + r.id, nombre: r.nombre, rapida: true, nota: r.nota,
      items: [{ nombre: r.nombre, cantidad: 1, medida: 'ud', macros: { kcal: r.kcal, prot: r.prot, grasa: r.grasa, hc: r.hc }, origen: 'rapida' }],
    }))];

  return html`<${Hoja} titulo=${`Añadir a ${nombreToma.toLowerCase()}`} alCerrar=${alCerrar}>
    <div class="buscador" style="margin-bottom:10px">
      <${Icono} n="buscar" t=${18} g=${2.2} />
      <input type="search" placeholder="Arándanos, pollo, yogur…" value=${texto} onInput=${(e) => ponerTexto(e.currentTarget.value)} />
    </div>
    <div class="segmentado" style="margin-bottom:12px">
      ${[['alimentos', 'Alimentos'], ['habituales', 'Habituales'], ['recetas', 'Recetas']].map(([id, t]) =>
        html`<button class=${pestana === id ? 'activo' : ''} onClick=${() => ponerPestana(id)}>${t}</button>`)}
    </div>

    ${pestana === 'alimentos' && html`
      ${!q && html`<p class="t2 peq" style="margin:0 4px 8px">${alimentos.length ? 'Lo que más apuntas en esta toma' : 'Escribe para buscar entre más de 250 alimentos.'}</p>`}
      ${alimentos.length > 0 && html`<div class="lista">${alimentos.map((a) => html`
        <button class="item" key=${a.id} onClick=${() => ponerElegido({ tipo: 'alimento', x: a })}>
          <div class="crece"><div class="nombre">${a.nombre}</div>
            <div class="meta">${a.medida === 'ud' ? 'por unidad' : `por 100 ${a.medida === 'ml' ? 'ml' : 'g'}`}: ${kcalProt(a)}${a.aprox ? ' · aprox.' : ''}${a.exacto ? ' · etiqueta' : ''}</div></div>
        </button>`)}</div>`}
      ${q && html`<button class="boton suave" style="margin-top:12px" onClick=${() => ponerCreando(true)}><${Icono} n="mas" t=${20} g=${2.2} />Crear «${texto.trim()}»</button>`}`}

    ${pestana === 'habituales' && (habituales.length
      ? html`<div class="lista">${habituales.map((h) => html`
          <div class="item" key=${h.id}>
            <button class="crece" style="text-align:left" onClick=${() => apuntarHabitual(h)}>
              <div class="nombre">${h.nombre}</div>
              <div class="meta">${h.rapida ? h.nota : h.items.map((i) => i.nombre).join(', ')} · ${kcalProt(L.sumarMacros(h.items.map((i) => ({ ...L.CERO(), ...i.macros }))))}</div>
            </button>
            ${!h.rapida && html`<button class="mas" aria-label=${'Borrar ' + h.nombre} onClick=${async () => { await db.borrar('habituales', h.id); await recargar(); avisar(); toast('Habitual borrada'); }}><${Icono} n="basura" t=${18} /></button>`}
          </div>`)}</div>`
      : html`<${Vacio} titulo="Sin comidas habituales">Apunta una comida y pulsa «Guardar como habitual» debajo de la toma. La próxima vez la añades de un toque.<//>`)}

    ${pestana === 'recetas' && html`<div class="lista">${recetas.map((r) => html`
      <button class="item" key=${r.id} onClick=${() => ponerElegido({ tipo: 'receta', x: r })}>
        <div class="crece"><div class="nombre">${r.nombre}</div><div class="meta">por ración: ${kcalProt(L.macrosReceta(r, E.alimentoPorNombre))}</div></div>
      </button>`)}</div>`}
  <//>`;
}

function ElegirCantidad({ tipo, x, toma, nombreToma, alApuntar }) {
  const esReceta = tipo === 'receta';
  const porUnidad = !esReceta && x.medida === 'ud';
  const puedeUd = !esReceta && !porUnidad && x.gramosUnidad;
  const habitual = esReceta ? 1 : L.cantidadHabitual(E.uso, x.nombre, porUnidad ? (x.racion || 1) : (x.racion || 100));
  const [modoUd, ponerModoUd] = useState(false);
  const [valor, ponerValor] = useState(String(habitual).replace('.', ','));

  const cant = aNum(valor) || 0;
  const gramos = modoUd ? cant * x.gramosUnidad : cant;
  const macros = esReceta
    ? L.escalarMacros(L.macrosReceta(x, E.alimentoPorNombre), cant)
    : L.macrosDe(x, porUnidad ? cant : gramos);
  const unidad = esReceta ? (cant === 1 ? 'ración' : 'raciones') : porUnidad || modoUd ? 'ud' : x.medida === 'ml' ? 'ml' : 'g';
  const paso = esReceta || porUnidad || modoUd ? 0.5 : (x.racion && x.racion < 30 ? 5 : 10);
  const mover = (d) => ponerValor(String(Math.max(0, Math.round((cant + d * paso) * 10) / 10)).replace('.', ','));

  const apuntar = () => {
    if (!cant) { toast('Pon una cantidad'); return; }
    alApuntar({
      nombre: x.nombre, origen: esReceta ? 'receta' : 'alimento', refId: x.id,
      cantidad: porUnidad || esReceta ? cant : gramos, medida: esReceta ? 'racion' : porUnidad ? 'ud' : (x.medida === 'ml' ? 'ml' : 'g'),
      macros: Object.fromEntries(L.CAMPOS_MACRO.map((k) => [k, Math.round((macros[k] || 0) * 10) / 10])),
    });
  };

  return html`
    ${puedeUd && html`<div class="segmentado" style="margin-bottom:6px">
      <button class=${!modoUd ? 'activo' : ''} onClick=${() => { ponerModoUd(false); ponerValor(String(Math.round(cant * x.gramosUnidad))); }}>Gramos</button>
      <button class=${modoUd ? 'activo' : ''} onClick=${() => { ponerModoUd(true); ponerValor(String(Math.max(1, Math.round(cant / x.gramosUnidad)))); }}>Unidades (${x.gramosUnidad} g)</button>
    </div>`}
    <div class="cantidad-grande">
      <button class="paso-btn" onClick=${() => mover(-1)} aria-label="Menos"><${Icono} n="menos" t=${22} g=${2.4} /></button>
      <input class="caja num" inputmode="decimal" value=${valor} onInput=${(e) => ponerValor(e.currentTarget.value)} onFocus=${(e) => e.currentTarget.select()} />
      <button class="paso-btn" onClick=${() => mover(1)} aria-label="Más"><${Icono} n="mas" t=${22} g=${2.4} /></button>
    </div>
    <p class="t2" style="text-align:center;margin:-6px 0 14px">${unidad}${modoUd ? ` · ${n0(gramos)} g` : ''}</p>
    <div class="tarjeta macro-linea" style="margin-bottom:14px">
      <div><div class="num">${n0(macros.kcal)}</div><small>kcal</small></div>
      <div><div class="num">${n1(macros.prot)}</div><small>proteína</small></div>
      <div><div class="num">${n1(macros.grasa)}</div><small>grasa</small></div>
      <div><div class="num">${n1(macros.hc)}</div><small>hidratos</small></div>
    </div>
    ${x.nota && html`<p class="t2 peq" style="margin-bottom:12px">${x.nota}</p>`}
    ${x.aprox && html`<p class="t2 peq" style="margin-bottom:12px">Valores típicos de etiqueta. Si tienes el envase delante, gana la etiqueta.</p>`}
    <button class="boton" onClick=${apuntar}>Añadir a ${nombreToma.toLowerCase()}</button>`;
}

function FormAlimento({ nombre, alGuardar }) {
  const [v, ponerV] = useState({ nombre, kcal: '', prot: '', grasa: '', hc: '', medida: 'g' });
  const campo = (k, t) => html`<label class="campo"><span>${t}</span><input class="entrada num" inputmode="decimal" value=${v[k]} onInput=${(e) => ponerV({ ...v, [k]: e.currentTarget.value })} /></label>`;
  const guardar = async () => {
    const a = { id: idDe(v.nombre), nombre: v.nombre.trim(), cat: 'Mis alimentos', medida: v.medida, racion: v.medida === 'ud' ? 1 : 100, exacto: true,
      kcal: aNum(v.kcal), prot: aNum(v.prot) ?? 0, grasa: aNum(v.grasa) ?? 0, hc: aNum(v.hc) ?? 0, fibra: 0, sal: 0 };
    if (!a.nombre || a.kcal == null) { toast('Faltan el nombre y las kcal'); return; }
    await db.guardar('alimentos', a); await recargar(); avisar(); toast('Alimento guardado'); alGuardar(a);
  };
  return html`<div class="pila">
    <label class="campo"><span>Nombre</span><input class="entrada" value=${v.nombre} onInput=${(e) => ponerV({ ...v, nombre: e.currentTarget.value })} /></label>
    <div class="segmentado">
      <button class=${v.medida === 'g' ? 'activo' : ''} onClick=${() => ponerV({ ...v, medida: 'g' })}>Por 100 g</button>
      <button class=${v.medida === 'ml' ? 'activo' : ''} onClick=${() => ponerV({ ...v, medida: 'ml' })}>Por 100 ml</button>
      <button class=${v.medida === 'ud' ? 'activo' : ''} onClick=${() => ponerV({ ...v, medida: 'ud' })}>Por unidad</button>
    </div>
    <div class="rejilla-2">${campo('kcal', 'Kcal')}${campo('prot', 'Proteína (g)')}</div>
    <div class="rejilla-2">${campo('grasa', 'Grasa (g)')}${campo('hc', 'Hidratos (g)')}</div>
    <p class="t2 peq">Cópialo de la tabla nutricional del envase.</p>
    <button class="boton" onClick=${guardar}>Guardar alimento</button>
  </div>`;
}

// ---------------------------------------------------------------- editar una entrada

function HojaItem({ item, alCerrar, alCambiar }) {
  const [valor, ponerValor] = useState(String(item.cantidad).replace('.', ','));
  const guardar = async () => {
    const c = aNum(valor);
    if (!c) { toast('Pon una cantidad'); return; }
    const f = c / (item.cantidad || 1);
    const nuevo = { ...item, cantidad: c };
    for (const k of L.CAMPOS_MACRO) nuevo[k] = Math.round((item[k] || 0) * f * 10) / 10;
    await db.guardar('comidas', nuevo); alCambiar(); toast('Cambiado'); alCerrar();
  };
  const borrar = async () => { await borrarComida(item.id); alCambiar(); toast('Borrado'); alCerrar(); };
  return html`<${Hoja} titulo=${item.nombre} alCerrar=${alCerrar}>
    <div class="cantidad-grande">
      <input class="caja num" inputmode="decimal" value=${valor} onInput=${(e) => ponerValor(e.currentTarget.value)} onFocus=${(e) => e.currentTarget.select()} />
      <span class="unidad" style="font-size:18px">${cantidadTexto({ ...item, cantidad: aNum(valor) || 0 }).split(' ').slice(1).join(' ')}</span>
    </div>
    <p class="t2" style="text-align:center;margin-bottom:14px">${kcalProt(item)} ahora</p>
    <div class="pila">
      <button class="boton" onClick=${guardar}>Guardar cantidad</button>
      <button class="boton peligro" onClick=${borrar}>Borrar de la toma</button>
    </div>
  <//>`;
}

// ---------------------------------------------------------------- guardar como habitual

function HojaGuardarHabitual({ toma, lista, alCerrar }) {
  const sugerido = lista.length === 1 ? lista[0].nombre : `${S.TOMAS.find((t) => t.id === toma)?.nombre} de siempre`;
  const [nombre, ponerNombre] = useState(sugerido);
  const guardar = async () => {
    if (!nombre.trim()) { toast('Ponle un nombre'); return; }
    await db.guardar('habituales', {
      id: db.nuevoId('h'), nombre: nombre.trim(), toma, veces: 0,
      items: lista.map((c) => ({ nombre: c.nombre, cantidad: c.cantidad, medida: c.medida, origen: c.origen, refId: c.refId,
        macros: Object.fromEntries(L.CAMPOS_MACRO.map((k) => [k, c[k] || 0])) })),
    });
    await recargar(); avisar(); toast('Guardada en Habituales'); alCerrar();
  };
  const suma = L.sumarMacros(lista);
  return html`<${Hoja} titulo="Guardar como habitual" alCerrar=${alCerrar}>
    <div class="pila">
      <label class="campo"><span>Nombre</span><input class="entrada" value=${nombre} onInput=${(e) => ponerNombre(e.currentTarget.value)} /></label>
      <div class="tarjeta"><div class="t2 peq" style="margin-bottom:6px">${lista.length} ${lista.length === 1 ? 'alimento' : 'alimentos'} · ${kcalProt(suma)}</div>
        ${lista.map((c) => html`<div class="peq">${c.nombre} · ${cantidadTexto(c)}</div>`)}</div>
      <button class="boton" onClick=${guardar}>Guardar</button>
    </div>
  <//>`;
}
