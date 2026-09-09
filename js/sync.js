// sync.js — copia de seguridad y sincronización contra un repositorio PRIVADO
// de GitHub. Un único archivo datos.json con todo. El token se guarda solo en
// este dispositivo (IndexedDB) y no viaja a ningún sitio más que a api.github.com.

import * as db from './db.js';

const API = 'https://api.github.com';

export async function leerConfig() {
  return (await db.leerMeta('github', null)) || { repo: '', token: '', rama: 'main', ruta: 'datos.json', sha: null, ultima: null };
}

export async function guardarConfig(cfg) {
  await db.escribirMeta('github', cfg);
  return cfg;
}

export function configurado(cfg) {
  return Boolean(cfg?.repo && cfg?.token);
}

function cabeceras(cfg) {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// Base64 que aguanta acentos y emojis.
function aBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

function deBase64(b64) {
  const binario = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function pedir(cfg, ruta, opciones = {}) {
  const resp = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers: { ...cabeceras(cfg), ...(opciones.headers || {}) },
  });
  if (resp.status === 401) throw new Error('El token no vale o ha caducado.');
  if (resp.status === 403) throw new Error('GitHub ha rechazado la petición (permisos del token).');
  if (resp.status === 404 && opciones.method !== 'PUT') return null;
  if (!resp.ok) {
    const cuerpo = await resp.text().catch(() => '');
    throw new Error(`GitHub ha respondido ${resp.status}. ${cuerpo.slice(0, 160)}`);
  }
  return resp.json();
}

export async function comprobar(cfg) {
  const repo = await pedir(cfg, `/repos/${cfg.repo}`);
  if (!repo) throw new Error(`No encuentro el repositorio ${cfg.repo}. Revisa el nombre o los permisos del token.`);
  if (!repo.private) {
    return { ok: true, aviso: 'Ese repositorio es PÚBLICO. Tus datos quedarían a la vista de cualquiera: hazlo privado antes de subir nada.' };
  }
  return { ok: true, aviso: null, permisoEscritura: repo.permissions?.push !== false };
}

async function leerRemoto(cfg) {
  return pedir(cfg, `/repos/${cfg.repo}/contents/${encodeURIComponent(cfg.ruta)}?ref=${encodeURIComponent(cfg.rama)}`);
}

// Sube el estado actual. Si alguien ha escrito desde otro dispositivo, avisa en
// vez de pisarlo (salvo que se fuerce a propósito).
export async function subir(cfg, { forzar = false } = {}) {
  const remoto = await leerRemoto(cfg);
  if (remoto && cfg.sha && remoto.sha !== cfg.sha && !forzar) {
    const err = new Error('En GitHub hay una versión más nueva que la que tenías. Trae los datos antes de subir, o fuerza la subida si sabes que esta es la buena.');
    err.conflicto = true;
    err.remoto = remoto;
    throw err;
  }

  const datos = await db.exportarTodo();
  const texto = JSON.stringify(datos, null, 1);
  const cuerpo = {
    message: `Datos ${new Date().toLocaleString('es-ES')}`,
    content: aBase64(texto),
    branch: cfg.rama,
  };
  if (remoto?.sha) cuerpo.sha = remoto.sha;

  const resp = await pedir(cfg, `/repos/${cfg.repo}/contents/${encodeURIComponent(cfg.ruta)}`, {
    method: 'PUT', body: JSON.stringify(cuerpo),
  });

  const nueva = { ...cfg, sha: resp.content.sha, ultima: new Date().toISOString() };
  await guardarConfig(nueva);
  return { sha: resp.content.sha, tamano: texto.length };
}

// Descarga y reemplaza todo lo local.
export async function bajar(cfg) {
  const remoto = await leerRemoto(cfg);
  if (!remoto) throw new Error(`No hay ningún ${cfg.ruta} en ${cfg.repo} todavía. Sube los datos primero.`);
  const texto = remoto.content ? deBase64(remoto.content) : deBase64((await (await fetch(remoto.download_url)).text()));
  const datos = JSON.parse(texto);
  await db.importarTodo(datos, { reemplazar: true });
  const nueva = { ...cfg, sha: remoto.sha, ultima: new Date().toISOString() };
  await guardarConfig(nueva);
  return { fecha: datos.exportado, registros: Object.values(datos.almacenes || {}).reduce((t, a) => t + a.length, 0) };
}

// ¿Hay algo nuevo en GitHub que no tengamos?
export async function hayCambiosRemotos(cfg) {
  if (!configurado(cfg)) return false;
  try {
    const remoto = await leerRemoto(cfg);
    return Boolean(remoto && cfg.sha && remoto.sha !== cfg.sha);
  } catch {
    return false;
  }
}
