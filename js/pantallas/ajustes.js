// ajustes.js — objetivos, entreno y copia de seguridad (sin cuentas ni tokens:
// el archivo se guarda con el menú de compartir del iPhone, en Archivos o iCloud).

import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { E, useEstado, avisar, toast, recargar, guardarConfig } from '../estado.js';
import * as L from '../logica.js';
import * as db from '../db.js';
import { Icono, Interruptor, atras, n0, aNum } from '../comunes.js';

export async function guardarCopia() {
  const datos = await db.exportarTodo();
  const nombre = `entreno-copia-${L.hoyISO()}.json`;
  const texto = JSON.stringify(datos);
  const archivo = new File([texto], nombre, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: 'Copia de Entreno' });
    } else {
      const url = URL.createObjectURL(archivo);
      const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
  } catch (e) {
    if (e?.name === 'AbortError') return false; // cerró el menú sin guardar
    throw e;
  }
  await db.escribirMeta('ultimaCopia', L.hoyISO());
  E.ultimaCopia = L.hoyISO(); avisar();
  toast('Copia guardada');
  return true;
}

export function Ajustes() {
  useEstado();
  const o = E.config.objetivos || {};
  const [ultima, ponerUltima] = useState(null);
  const [obj, ponerObj] = useState({ kcalEntreno: o.kcalEntreno, kcalDescanso: o.kcalDescanso, proteina: o.proteina, grasa: o.grasa });
  useEffect(() => { db.leerMeta('ultimaCopia').then(ponerUltima); }, [E.ultimaCopia]);

  const guardarObjetivos = async () => {
    const n = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, aNum(v)]));
    if (Object.values(n).some((v) => !v)) { toast('Rellena los cuatro objetivos'); return; }
    await guardarConfig({ objetivos: { ...o, ...n } }); await recargar(); avisar(); toast('Objetivos guardados');
  };

  const recuperar = (e) => {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    f.text().then(async (texto) => {
      try {
        await db.importarTodo(JSON.parse(texto));
        await recargar(); avisar(); toast('Copia recuperada');
      } catch (err) { toast(err.message || 'Ese archivo no es una copia de esta app'); }
    });
    e.currentTarget.value = '';
  };

  const dias = ultima ? L.diasEntre(ultima, L.hoyISO()) : null;
  const fila = (texto, sub, control) => html`<div class="item"><div class="crece"><div class="nombre">${texto}</div>${sub && html`<div class="meta">${sub}</div>`}</div>${control}</div>`;
  const campo = (k, t) => html`<label class="campo"><span>${t}</span><input class="entrada num" inputmode="numeric" value=${obj[k]} onInput=${(e) => ponerObj({ ...obj, [k]: e.currentTarget.value })} /></label>`;

  return html`
    <button class="volver" onClick=${() => atras('hoy')}><${Icono} n="atras" t=${24} g=${2.4} />Hoy</button>
    <header class="cabecera"><h1 class="titulo">Ajustes</h1></header>

    <div class="seccion"><h2 class="titulo">Copia de seguridad</h2></div>
    <div class="tarjeta pila">
      <p>Tus datos viven solo en este iPhone. Guarda una copia de vez en cuando en Archivos o en iCloud: si cambias de móvil o borras la app, con ella recuperas todo.</p>
      <p class="t2 peq">${dias === null ? 'Aún no has guardado ninguna copia.' : dias === 0 ? 'Última copia: hoy.' : `Última copia: hace ${dias} ${dias === 1 ? 'día' : 'días'}.`}</p>
      <button class="boton" onClick=${() => guardarCopia().catch(() => toast('No se ha podido guardar la copia'))}><${Icono} n="compartir" t=${20} g=${2.2} />Guardar copia</button>
      <label class="boton suave" style="cursor:pointer"><${Icono} n="guardar" t=${20} g=${2.2} />Recuperar una copia
        <input type="file" accept="application/json,.json" style="display:none" onChange=${recuperar} /></label>
      <p class="t2 peq">Recuperar sustituye lo que hay ahora en la app por lo que hay en la copia.</p>
    </div>

    <div class="seccion"><h2 class="titulo">Entreno</h2></div>
    <div class="lista">
      ${fila('Pitido al acabar el descanso', null, html`<${Interruptor} etiqueta="Pitido" valor=${E.config.sonidoDescanso !== false} alCambiar=${(v) => guardarConfig({ sonidoDescanso: v })} />`)}
      ${fila('Pantalla encendida mientras entrenas', 'El iPhone no deja que una web suene con la pantalla bloqueada. Así el descanso siempre te avisa.',
        html`<${Interruptor} etiqueta="Pantalla encendida" valor=${E.config.pantallaEncendida !== false} alCambiar=${(v) => guardarConfig({ pantallaEncendida: v })} />`)}
    </div>

    <div class="seccion"><h2 class="titulo">Objetivos de comida</h2></div>
    <div class="tarjeta pila">
      <div class="rejilla-2">${campo('kcalEntreno', 'Kcal día de gimnasio')}${campo('kcalDescanso', 'Kcal día sin gimnasio')}</div>
      <div class="rejilla-2">${campo('proteina', 'Proteína (g)')}${campo('grasa', 'Grasa (g)')}</div>
      <p class="t2 peq">Los hidratos son lo que queda: ${n0(Math.max(0, ((aNum(obj.kcalEntreno) || 0) - (aNum(obj.proteina) || 0) * 4 - (aNum(obj.grasa) || 0) * 9) / 4))} g un día de gimnasio.</p>
      <button class="boton" onClick=${guardarObjetivos}>Guardar objetivos</button>
    </div>

    <p class="t2 peq" style="text-align:center;margin:28px 0 8px">Fotos de ejercicios: free-exercise-db (dominio público). Alimentos: USDA FoodData Central.</p>`;
}
