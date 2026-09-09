// db.js — capa fina sobre IndexedDB. Sin dependencias.
// Todos los datos viven aquí, en el dispositivo. Nada sale a ningún servidor.

const NOMBRE_DB = 'entreno-nutricion';
const VERSION_DB = 1;

// Definición de los almacenes. keyPath = campo que hace de clave.
const ALMACENES = {
  meta:       { keyPath: 'k' },                                   // configuración y perfil (clave/valor)
  ejercicios: { keyPath: 'id' },                                  // catálogo de ejercicios
  sesiones:   { keyPath: 'id', indices: { fecha: 'fecha' } },      // sesiones de gimnasio
  series:     { keyPath: 'id', indices: { sesionId: 'sesionId', ejercicioId: 'ejercicioId', fecha: 'fecha' } },
  alimentos:  { keyPath: 'id' },
  recetas:    { keyPath: 'id' },
  comidas:    { keyPath: 'id', indices: { fecha: 'fecha' } },      // registro de comidas
  peso:       { keyPath: 'fecha' },                                // una entrada por día
  pasos:      { keyPath: 'fecha' },
  medidas:    { keyPath: 'fecha' },
  semanas:    { keyPath: 'semana' },                               // ajustes manuales de reparto semanal
  despensa:   { keyPath: 'id' },                                   // lo que sueles tener en casa
  planes:     { keyPath: 'id', indices: { fecha: 'fecha' } },       // planes de batch cooking
  uso:        { keyPath: 'clave' },                                // aprendizaje: frecuencia y cantidades habituales
};

export const NOMBRES_ALMACENES = Object.keys(ALMACENES);

let _db = null;

export function abrir() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOMBRE_DB, VERSION_DB);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      for (const [nombre, cfg] of Object.entries(ALMACENES)) {
        if (db.objectStoreNames.contains(nombre)) continue;
        const store = db.createObjectStore(nombre, { keyPath: cfg.keyPath });
        for (const [idx, campo] of Object.entries(cfg.indices || {})) {
          store.createIndex(idx, campo, { unique: false });
        }
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(almacen, modo) {
  return _db.transaction(almacen, modo).objectStore(almacen);
}

function promesa(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function todos(almacen) {
  await abrir();
  return promesa(tx(almacen, 'readonly').getAll());
}

export async function obtener(almacen, clave) {
  await abrir();
  return promesa(tx(almacen, 'readonly').get(clave));
}

export async function guardar(almacen, valor) {
  await abrir();
  await promesa(tx(almacen, 'readwrite').put(valor));
  return valor;
}

export async function guardarVarios(almacen, valores) {
  await abrir();
  const store = tx(almacen, 'readwrite');
  await Promise.all(valores.map((v) => promesa(store.put(v))));
  return valores;
}

export async function borrar(almacen, clave) {
  await abrir();
  return promesa(tx(almacen, 'readwrite').delete(clave));
}

export async function vaciar(almacen) {
  await abrir();
  return promesa(tx(almacen, 'readwrite').clear());
}

// Consulta por índice: porIndice('series', 'ejercicioId', 'prensa')
export async function porIndice(almacen, indice, valor) {
  await abrir();
  return promesa(tx(almacen, 'readonly').index(indice).getAll(valor));
}

// Rango de fechas (cadenas 'AAAA-MM-DD', comparables alfabéticamente)
export async function porRangoFecha(almacen, desde, hasta, indice = 'fecha') {
  await abrir();
  const store = tx(almacen, 'readonly');
  const origen = store.keyPath === 'fecha' ? store : store.index(indice);
  return promesa(origen.getAll(IDBKeyRange.bound(desde, hasta)));
}

// --- meta (clave/valor) ---
export async function leerMeta(clave, porDefecto = null) {
  const fila = await obtener('meta', clave);
  return fila === undefined || fila === null ? porDefecto : fila.v;
}

export async function escribirMeta(clave, valor) {
  return guardar('meta', { k: clave, v: valor });
}

// --- exportar / importar todo ---
// Claves de 'meta' que NO salen nunca del dispositivo. El token de GitHub es
// una credencial: no puede acabar dentro de una copia de seguridad, ni en el
// repositorio ni en un archivo que se comparta o se guarde en la nube.
const META_PRIVADA = ['github'];

export async function exportarTodo() {
  const datos = { formato: 'entreno-nutricion', version: 1, exportado: new Date().toISOString(), almacenes: {} };
  for (const nombre of NOMBRES_ALMACENES) {
    const filas = await todos(nombre);
    datos.almacenes[nombre] = nombre === 'meta'
      ? filas.filter((f) => !META_PRIVADA.includes(f.k))
      : filas;
  }
  return datos;
}

export async function importarTodo(datos, { reemplazar = true } = {}) {
  if (!datos || datos.formato !== 'entreno-nutricion') throw new Error('El archivo no es una copia válida de esta app.');
  await abrir();
  // La configuración privada de este dispositivo se conserva: al traer datos de
  // otro móvil no se pierde el token de aquí, ni se importa el de allí.
  const privadas = [];
  for (const k of META_PRIVADA) {
    const fila = await obtener('meta', k);
    if (fila) privadas.push(fila);
  }

  for (const nombre of NOMBRES_ALMACENES) {
    const filas = datos.almacenes?.[nombre];
    if (!Array.isArray(filas)) continue;
    if (reemplazar) await vaciar(nombre);
    const limpias = nombre === 'meta' ? filas.filter((f) => !META_PRIVADA.includes(f.k)) : filas;
    if (limpias.length) await guardarVarios(nombre, limpias);
  }

  if (privadas.length) await guardarVarios('meta', privadas);
}

// id corto y único, legible en el JSON exportado
export function nuevoId(prefijo = '') {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 7);
  return `${prefijo}${prefijo ? '-' : ''}${t}${r}`;
}
