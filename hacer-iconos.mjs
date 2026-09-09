// Genera los iconos PNG de la app sin dependencias, dibujando pixel a pixel.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function crc32(buf) {
  let c, tabla = [];
  for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tabla[n] = c >>> 0; }
  let crc = 0xffffffff;
  for (const b of buf) crc = tabla[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function trozo(tipo, datos) {
  const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}
function png(ancho, alto, pixeles) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0); ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA 8 bits
  const filas = [];
  for (let y = 0; y < alto; y++) filas.push(Buffer.from([0]), pixeles.subarray(y * ancho * 4, (y + 1) * ancho * 4));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(Buffer.concat(filas), { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

function dibujar(lado, margenSeguro) {
  const p = Buffer.alloc(lado * lado * 4);
  const u = lado / 100;
  const esc = margenSeguro ? 0.78 : 1; // versión maskable: el dibujo cabe en el circulo seguro
  const c = lado / 2;
  const pon = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= lado || y >= lado) return;
    const i = (y * lado + x) * 4;
    p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = 255;
  };
  const FONDO = [19, 19, 17], ACENTO = [226, 103, 58], CLARO = [240, 237, 229];
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) pon(x, y, FONDO);

  // mancuerna: barra central + dos discos a cada lado
  const rect = (cx, cy, an, al, color) => {
    for (let y = Math.round(cy - al / 2); y < cy + al / 2; y++)
      for (let x = Math.round(cx - an / 2); x < cx + an / 2; x++) pon(x, y, color);
  };
  rect(c, c, 46 * u * esc, 7 * u * esc, CLARO);              // barra
  rect(c - 24 * u * esc, c, 8 * u * esc, 34 * u * esc, ACENTO); // disco grande izq
  rect(c + 24 * u * esc, c, 8 * u * esc, 34 * u * esc, ACENTO); // disco grande der
  rect(c - 33 * u * esc, c, 7 * u * esc, 22 * u * esc, ACENTO); // disco pequeño izq
  rect(c + 33 * u * esc, c, 7 * u * esc, 22 * u * esc, ACENTO); // disco pequeño der
  return png(lado, lado, p);
}

writeFileSync('icons/icono-192.png', dibujar(192, false));
writeFileSync('icons/icono-512.png', dibujar(512, false));
writeFileSync('icons/icono-maskable-512.png', dibujar(512, true));
console.log('iconos generados');
