// Servidor estático mínimo para probar la app en local: node servidor.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const RAIZ = process.cwd();
const PUERTO = process.env.PUERTO || 5173;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.png': 'image/png',
};

createServer(async (req, res) => {
  try {
    let ruta = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([.][.][/])+/, '');
    if (ruta === '/' || ruta.length <= 1) ruta = '/index.html';
    const abs = join(RAIZ, ruta);
    await stat(abs);
    const datos = await readFile(abs);
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(abs)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Service-Worker-Allowed': '/',
    });
    res.end(datos);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
  }
}).listen(PUERTO, () => console.log(`Servidor en http://localhost:${PUERTO}`));
