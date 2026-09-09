// vistas/ajustes.js — objetivos, biblioteca, ejercicios y copias de seguridad.

import * as db from '../db.js';
import * as L from '../logica.js';
import * as S from '../seed.js';
import * as sync from '../sync.js';
import { estado, cabecera, ir, idDe, pintar as repintar } from '../app.js';
import { h, vaciar, hoja, toast, confirmar, descargar, n0, n1, pon } from '../ui.js';

const PESTANAS = [['general', 'General'], ['alimentos', 'Alimentos'], ['ejercicios', 'Ejercicios'], ['copia', 'Copia y sync']];

export async function pintar(raiz, params) {
  const pestana = params.pestana || 'general';
  cabecera('Ajustes', PESTANAS.find((p) => p[0] === pestana)?.[1] || '');

  pon(raiz, h('div', { class: 'segmentos', style: 'margin-bottom:14px' },
    ...PESTANAS.map(([id, txt]) => h('button', {
      class: pestana === id ? 'sel chico' : 'chico',
      onClick: () => ir('ajustes', { pestana: id }),
    }, txt))));

  const cuerpo = h('div');
  pon(raiz, cuerpo);

  if (pestana === 'general') await pintarGeneral(cuerpo);
  else if (pestana === 'alimentos') await pintarAlimentos(cuerpo);
  else if (pestana === 'ejercicios') await pintarEjercicios(cuerpo);
  else await pintarCopia(cuerpo);

  pon(raiz, h('button', { class: 'fantasma ancho', style: 'margin-top:18px', onClick: () => ir('hoy') }, 'Volver a Hoy'));
}

// ------------------------------------------------------------------ general

async function pintarGeneral(raiz) {
  const cfg = JSON.parse(JSON.stringify(estado.config));
  const campos = {};
  const num = (ruta, etiqueta, paso = '1') => {
    const [a, b] = ruta.split('.');
    campos[ruta] = h('input', { type: 'number', inputmode: 'decimal', step: paso, value: cfg[a]?.[b] ?? '' });
    return h('div', { class: 'campo' }, h('label', {}, etiqueta), campos[ruta]);
  };

  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Objetivos de comida'),
    h('div', { class: 'campos2' },
      num('objetivos.kcalEntreno', 'kcal día con gimnasio'),
      num('objetivos.kcalDescanso', 'kcal día sin gimnasio')),
    h('div', { class: 'campos2' },
      num('objetivos.proteina', 'Proteína (g)'),
      num('objetivos.grasa', 'Grasa (g)')),
    h('div', { class: 'campos2' },
      num('objetivos.sueloKcal', 'Suelo de kcal'),
      num('objetivos.grasaMinima', 'Grasa mínima (g)')),
    h('p', { class: 'pequeno apagado' }, 'Los hidratos se calculan solos con lo que queda.')));

  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Entrenamiento y seguimiento'),
    h('div', { class: 'campos2' },
      num('perfil.limiteSesionMin', 'Límite de sesión (min)'),
      num('perfil.pasosObjetivo', 'Objetivo de pasos', '500')),
    h('div', { class: 'campos2' },
      num('perfil.ritmoMin', 'Ritmo mín. (kg/sem)', '0.1'),
      num('perfil.ritmoMax', 'Ritmo máx. (kg/sem)', '0.1'))));

  const sonido = h('input', { type: 'checkbox', checked: cfg.sonidoDescanso !== false, style: 'width:auto;min-height:auto' });
  const vibra = h('input', { type: 'checkbox', checked: cfg.vibrar !== false, style: 'width:auto;min-height:auto' });
  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Avisos del cronómetro'),
    h('label', { class: 'fila', style: 'margin:10px 0' }, sonido, h('span', {}, 'Pitido al acabar el descanso')),
    h('label', { class: 'fila' }, vibra, h('span', {}, 'Vibración al acabar el descanso'))));

  const fase = estado.fase;
  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Bloque actual'),
    h('p', { class: 'pequeno apagado' },
      cfg.primeraSesion
        ? `Primera sesión: ${L.fechaLarga(cfg.primeraSesion)}. Vas por la semana ${fase.semana}.`
        : 'Aún no has hecho la primera sesión. El reacondicionamiento arranca cuando entrenes.'),
    cfg.primeraSesion && h('button', {
      class: 'fantasma ancho', onClick: async () => {
        if (!await confirmar('Reiniciar el bloque', 'La fase de reacondicionamiento y el contador de descargas vuelven a empezar hoy. No borra ninguna sesión.', 'Reiniciar')) return;
        await db.escribirMeta('config', { ...estado.config, primeraSesion: L.hoyISO() });
        toast('Bloque reiniciado.'); repintar();
      },
    }, 'Reiniciar el bloque hoy')));

  pon(raiz, h('button', {
    class: 'principal ancho', onClick: async () => {
      for (const [ruta, input] of Object.entries(campos)) {
        const [a, b] = ruta.split('.');
        const v = parseFloat(input.value);
        if (!isNaN(v)) cfg[a][b] = v;
      }
      cfg.sonidoDescanso = sonido.checked;
      cfg.vibrar = vibra.checked;
      await db.escribirMeta('config', cfg);
      toast('Ajustes guardados.'); repintar();
    },
  }, 'Guardar ajustes'));
}

// ------------------------------------------------------------------ alimentos

async function pintarAlimentos(raiz, filtro = '') {
  const buscador = h('input', {
    type: 'search', placeholder: 'Buscar alimento…', value: filtro,
    onInput: (e) => { clearTimeout(buscador._t); buscador._t = setTimeout(() => { vaciar(raiz); pintarAlimentos(raiz, e.target.value); }, 200); },
  });
  pon(raiz, h('div', { class: 'campo' }, buscador));
  pon(raiz, h('p', { class: 'pequeno apagado' },
    `${estado.alimentos.length} alimentos. ★ = valor de etiqueta, exacto. El resto son de tabla.`));

  const q = filtro.trim().toLowerCase();
  const lista = estado.alimentos.filter((a) => !q || a.nombre.toLowerCase().includes(q)).slice(0, q ? 60 : 25);
  for (const a of lista) {
    pon(raiz, h('button', { class: 'item', onClick: () => editarAlimento(a) },
      h('div', { class: 'crece' },
        h('div', { class: 'tit' }, a.nombre, a.exacto ? ' ★' : ''),
        h('div', { class: 'sub' },
          `${n0(a.kcal)} kcal · ${n1(a.prot)} P · ${n1(a.grasa)} G · ${n1(a.hc)} H` +
          ` por ${a.medida === 'ud' ? 'unidad' : `100 ${a.medida}`}`))));
  }
  if (!q && estado.alimentos.length > 25) {
    pon(raiz, h('p', { class: 'pequeno apagado centro' }, 'Busca para ver el resto.'));
  }

  pon(raiz, h('button', { class: 'principal ancho', style: 'margin-top:12px', onClick: () => editarAlimento(null) },
    '+ Alimento nuevo'));
}

function editarAlimento(al) {
  const a = al ? { ...al } : { id: null, nombre: '', cat: 'Otros', kcal: 0, prot: 0, grasa: 0, hc: 0, fibra: 0, sal: 0, medida: 'g', racion: 100, exacto: false };
  const campos = {};
  const num = (k, etiqueta) => {
    campos[k] = h('input', { type: 'number', inputmode: 'decimal', step: 'any', value: a[k] ?? 0 });
    return h('div', { class: 'campo' }, h('label', {}, etiqueta), campos[k]);
  };
  const nombre = h('input', { type: 'text', value: a.nombre });
  const cat = h('input', { type: 'text', value: a.cat || 'Otros' });
  const medida = h('select', {},
    ...[['g', 'por 100 g'], ['ml', 'por 100 ml'], ['ud', 'por unidad']].map(([v, t]) =>
      h('option', { value: v, selected: a.medida === v }, t)));
  const exacto = h('input', { type: 'checkbox', checked: !!a.exacto, style: 'width:auto;min-height:auto' });

  const cuerpo = h('div', {},
    h('div', { class: 'campo' }, h('label', {}, 'Nombre'), nombre),
    h('div', { class: 'campos2' },
      h('div', { class: 'campo' }, h('label', {}, 'Categoría'), cat),
      h('div', { class: 'campo' }, h('label', {}, 'Se mide'), medida)),
    h('div', { class: 'campos2' }, num('kcal', 'kcal'), num('prot', 'Proteína (g)')),
    h('div', { class: 'campos2' }, num('grasa', 'Grasa (g)'), num('hc', 'Hidratos (g)')),
    h('div', { class: 'campos2' }, num('fibra', 'Fibra (g)'), num('sal', 'Sal (g)')),
    num('racion', 'Ración habitual'),
    h('label', { class: 'fila', style: 'margin:6px 0 14px' }, exacto, h('span', {}, '★ Valor tomado de la etiqueta')),
    h('div', { class: 'botones columna' },
      h('button', {
        class: 'principal', onClick: async () => {
          if (!nombre.value.trim()) return toast('Ponle nombre.');
          const guardar = { ...a, nombre: nombre.value.trim(), cat: cat.value.trim() || 'Otros', medida: medida.value, exacto: exacto.checked };
          for (const [k, input] of Object.entries(campos)) guardar[k] = parseFloat(input.value) || 0;
          guardar.id = a.id || idDe(guardar.nombre);
          await db.guardar('alimentos', guardar);
          dlg.close(); toast('Guardado.'); repintar();
        },
      }, 'Guardar'),
      al && h('button', {
        class: 'peligro', onClick: async () => {
          if (!await confirmar('Borrar alimento', `Se borra "${al.nombre}" de la biblioteca. Lo ya registrado no cambia, pero las recetas que lo usen dejarán de cuadrar.`, 'Borrar')) return;
          await db.borrar('alimentos', al.id);
          dlg.close(); toast('Borrado.'); repintar();
        },
      }, 'Borrar')));

  const dlg = hoja(al ? al.nombre : 'Alimento nuevo', cuerpo);
}

// ------------------------------------------------------------------ ejercicios

async function pintarEjercicios(raiz) {
  for (const letra of S.ORDEN_SESIONES) {
    const plan = estado.rutina[letra];
    pon(raiz, h('h3', { style: 'margin:16px 0 8px' }, `Sesión ${letra} · ${plan.nombre}`));
    for (const entrada of plan.ejercicios) {
      const ej = estado.ejercicioPorId.get(entrada.id);
      if (!ej) continue;
      pon(raiz, h('button', { class: 'item', onClick: () => editarEjercicio(ej, entrada, letra) },
        h('div', { class: 'crece' },
          h('div', { class: 'tit' }, ej.nombre),
          h('div', { class: 'sub' },
            `${entrada.series} × ${ej.repMin}-${ej.repMax} · RIR ${ej.rir} · ` +
            `${L.formatoPeso(ej.pesoInicial ?? null)} · +${ej.incremento} kg · ${ej.descanso}s`))));
    }
  }
}

function editarEjercicio(ej, entrada, letra) {
  const campos = {};
  const num = (k, etiqueta, obj = ej, paso = 'any') => {
    campos[k] = h('input', { type: 'number', inputmode: 'decimal', step: paso, value: obj[k] ?? '' });
    return h('div', { class: 'campo' }, h('label', {}, etiqueta), campos[k]);
  };
  const series = h('input', { type: 'number', inputmode: 'numeric', value: entrada.series, min: 1 });
  const rir = h('input', { type: 'text', value: ej.rir });
  const claves = h('textarea', { value: ej.claves.join('\n'), style: 'min-height:120px' });

  const cuerpo = h('div', {},
    h('div', { class: 'campos2' },
      h('div', { class: 'campo' }, h('label', {}, `Series en la sesión ${letra}`), series),
      h('div', { class: 'campo' }, h('label', {}, 'RIR objetivo'), rir)),
    h('div', { class: 'campos2' }, num('repMin', 'Reps mínimas'), num('repMax', 'Reps máximas')),
    h('div', { class: 'campos2' }, num('pesoInicial', 'Peso de partida (kg)', ej, '0.5'), num('incremento', 'Incremento (kg)', ej, '0.5')),
    num('descanso', 'Descanso (s)', ej, '15'),
    h('div', { class: 'campo' }, h('label', {}, 'Claves de técnica, una por línea'), claves),
    h('a', { class: 'boton fantasma ancho', href: ej.youtube, target: '_blank', rel: 'noopener' }, 'Ver en YouTube'),
    h('button', {
      class: 'principal ancho', style: 'margin-top:12px', onClick: async () => {
        const nuevo = { ...ej, rir: rir.value.trim() || ej.rir, claves: claves.value.split('\n').map((s) => s.trim()).filter(Boolean) };
        for (const [k, input] of Object.entries(campos)) {
          const v = parseFloat(input.value);
          nuevo[k] = isNaN(v) ? null : v;
        }
        await db.guardar('ejercicios', nuevo);
        const rutina = JSON.parse(JSON.stringify(estado.rutina));
        const e = rutina[letra].ejercicios.find((x) => x.id === ej.id);
        if (e) e.series = parseInt(series.value) || e.series;
        await db.escribirMeta('rutina', rutina);
        dlg.close(); toast('Ejercicio actualizado.'); repintar();
      },
    }, 'Guardar'));

  const dlg = hoja(ej.nombre, cuerpo);
}

// ------------------------------------------------------------------ copia y sync

async function pintarCopia(raiz) {
  // -------- archivo --------
  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Copia en un archivo'),
    h('p', { class: 'pequeno apagado' }, 'Un JSON con absolutamente todo: series, comidas, peso, recetas y ajustes. Sirve para cambiar de móvil.'),
    h('div', { class: 'botones columna', style: 'margin-top:10px' },
      h('button', {
        class: 'principal', onClick: async () => {
          const datos = await db.exportarTodo();
          const n = Object.values(datos.almacenes).reduce((t, a) => t + a.length, 0);
          descargar(`entreno-${L.hoyISO()}.json`, JSON.stringify(datos, null, 1));
          toast(`Exportados ${n} registros.`);
        },
      }, 'Exportar a un archivo'),
      h('label', { class: 'boton fantasma ancho', style: 'cursor:pointer' }, 'Importar desde un archivo',
        h('input', {
          type: 'file', accept: 'application/json,.json', style: 'display:none',
          onChange: async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (!await confirmar('Importar', 'Se reemplazan TODOS los datos de este dispositivo por los del archivo. Exporta antes si tienes dudas.', 'Reemplazar')) return;
            try {
              await db.importarTodo(JSON.parse(await f.text()), { reemplazar: true });
              toast('Datos importados.');
              ir('hoy');
            } catch (err) {
              toast(`No se ha podido importar: ${err.message}`, 4000);
            }
          },
        })))));

  // -------- github --------
  const cfg = await sync.leerConfig();
  const repo = h('input', { type: 'text', value: cfg.repo, placeholder: 'rochseaside-tech/gym-datos', autocapitalize: 'off', autocorrect: 'off', spellcheck: false });
  const token = h('input', { type: 'password', value: cfg.token, placeholder: 'github_pat_…', autocapitalize: 'off', autocorrect: 'off', spellcheck: false });
  const estadoSync = h('div', { class: 'pequeno apagado' },
    cfg.ultima ? `Última sincronización: ${new Date(cfg.ultima).toLocaleString('es-ES')}` : 'Sin sincronizar todavía.');

  const guardarCfg = async () => sync.guardarConfig({
    ...cfg, repo: repo.value.trim().replace(/^https?:\/\/github\.com\//, ''), token: token.value.trim(),
  });

  const conAviso = async (fn, textoOk) => {
    const c = await guardarCfg();
    if (!sync.configurado(c)) return toast('Faltan el repositorio o el token.');
    estadoSync.textContent = 'Hablando con GitHub…';
    try {
      const r = await fn(c);
      estadoSync.textContent = textoOk(r);
      toast('Hecho.');
    } catch (err) {
      estadoSync.textContent = err.message;
      if (err.conflicto) {
        const forzar = await confirmar('Hay una versión más nueva en GitHub',
          'Alguien (o tú desde otro dispositivo) ha subido datos después de tu última sincronización. Puedes traértelos, o forzar y quedarte con los de este móvil.',
          'Forzar y pisar lo de GitHub');
        if (forzar) {
          const r = await sync.subir(await sync.leerConfig(), { forzar: true });
          estadoSync.textContent = `Subido a la fuerza (${n0(r.tamano)} bytes).`;
        }
      } else {
        toast(err.message, 5000);
      }
    }
  };

  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Sincronizar con GitHub'),
    h('p', { class: 'pequeno apagado' },
      'Guarda un datos.json en un repositorio PRIVADO tuyo. Así tienes copia fuera del móvil, historial de versiones y los mismos datos en el PC.'),
    h('div', { class: 'campo', style: 'margin-top:10px' }, h('label', {}, 'Repositorio (usuario/nombre)'), repo),
    h('div', { class: 'campo' }, h('label', {}, 'Token de acceso'), token),
    h('div', { class: 'botones columna' },
      h('button', {
        class: 'fantasma', onClick: () => conAviso(
          async (c) => sync.comprobar(c),
          (r) => r.aviso || 'Repositorio privado y accesible. Todo correcto.'),
      }, 'Comprobar la conexión'),
      h('button', {
        class: 'principal', onClick: () => conAviso(
          async (c) => sync.subir(c),
          (r) => `Subido. ${n0(r.tamano)} bytes en GitHub.`),
      }, 'Guardar en GitHub'),
      h('button', {
        onClick: async () => {
          if (!await confirmar('Traer de GitHub', 'Se reemplazan TODOS los datos de este dispositivo por los de GitHub.', 'Traer y reemplazar')) return;
          await conAviso(async (c) => sync.bajar(c), (r) => `Traídos ${r.registros} registros del ${new Date(r.fecha).toLocaleString('es-ES')}.`);
          ir('hoy');
        },
      }, 'Traer de GitHub')),
    h('div', { style: 'margin-top:10px' }, estadoSync),
    h('details', { style: 'margin-top:12px' },
      h('summary', { style: 'cursor:pointer;padding:8px 0;font-weight:620' }, 'Cómo saco el token'),
      h('ol', { class: 'pequeno apagado', style: 'padding-left:20px;line-height:1.6' },
        h('li', {}, 'En GitHub, crea un repositorio nuevo y márcalo como Private. Llámalo, por ejemplo, gym-datos.'),
        h('li', {}, 'Ve a Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.'),
        h('li', {}, 'En Repository access elige Only select repositories y marca solo ese repositorio.'),
        h('li', {}, 'En Permissions → Repository permissions, pon Contents en Read and write. Nada más.'),
        h('li', {}, 'Copia el token que te da (empieza por github_pat_) y pégalo aquí arriba.')))));

  // -------- borrar --------
  pon(raiz, h('div', { class: 'tarjeta' },
    h('h3', {}, 'Empezar de cero'),
    h('p', { class: 'pequeno apagado' }, 'Borra todo lo de este dispositivo y vuelve a cargar la rutina y la biblioteca de partida.'),
    h('button', {
      class: 'peligro ancho', style: 'margin-top:10px', onClick: async () => {
        if (!await confirmar('Borrar todo', 'Se borran series, comidas, peso, medidas y ajustes de este dispositivo. Exporta antes si quieres conservarlo.', 'Borrar todo')) return;
        for (const nombre of db.NOMBRES_ALMACENES) await db.vaciar(nombre);
        toast('Todo borrado.');
        location.href = location.pathname;
      },
    }, 'Borrar todos los datos')));
}
