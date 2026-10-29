// Descarga imágenes de Wikimedia Commons con licencia libre.
//   node scripts/imagenes/descargar.mjs buscar <plan.json> <dir> [clave...]
//     Busca candidatas por clave, baja miniaturas y arma una hoja de contactos (<dir>/<clave>/hoja.jpg).
//   node scripts/imagenes/descargar.mjs originales <seleccion.json> <dir>
//     Baja las imágenes elegidas a 1920 px en <dir>/originales y guarda sus créditos en meta.json.
// <dir> debe estar fuera del repositorio: lo descargado es dato no confiable.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { api, bajar, credito } from './commons.mjs';

const MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_CANDIDATAS = 12;
const [comando, entrada, dir, ...filtro] = process.argv.slice(2);
if (!['buscar', 'originales'].includes(comando) || !entrada || !dir) {
  console.error('Uso: descargar.mjs buscar <plan.json> <dir> [clave...] | originales <seleccion.json> <dir>');
  process.exit(1);
}
const leerJson = async (ruta) => JSON.parse(await readFile(ruta, 'utf8'));
const ext = (mime) => (mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg');

async function buscar(clave, consultas) {
  // Una lista por consulta; luego se intercalan para que todas aporten candidatas.
  const vistos = new Set();
  const listas = [];
  for (const consulta of consultas) {
    const lista = [];
    listas.push(lista);
    const paginas = await api({
      generator: 'search', gsrnamespace: '6', gsrlimit: '20',
      gsrsearch: `${consulta} filetype:bitmap filew:>1599`,
    }, 330);
    for (const p of paginas) {
      const c = credito(p);
      if (!c || vistos.has(c.id) || !MIMES.has(c.mime) || c.ancho < 1600 || c.ancho / c.alto < 1.25) continue;
      vistos.add(c.id);
      lista.push({ ...c, consulta });
    }
  }
  const candidatas = [];
  for (let i = 0; candidatas.length < MAX_CANDIDATAS && listas.some((l) => l.length > i); i++)
    for (const l of listas) if (l[i] && candidatas.length < MAX_CANDIDATAS) candidatas.push(l[i]);
  const carpeta = join(dir, clave);
  await mkdir(carpeta, { recursive: true });
  const celdas = [];
  for (const [i, c] of candidatas.entries()) {
    try {
      const ruta = await bajar(c.url, join(carpeta, `${c.id}.${ext(c.mime)}`));
      celdas.push({ i, ruta });
    } catch (e) {
      console.warn(`  omitida ${c.archivoCommons}: ${e.message}`);
    }
  }
  await writeFile(join(carpeta, 'candidatos.json'), JSON.stringify(candidatas, null, 2));
  await hoja(celdas, join(carpeta, 'hoja.jpg'));
  console.log(`${clave}: ${celdas.length} candidatas`);
}

/** Hoja de contactos 4 columnas con el índice de cada candidata. */
async function hoja(celdas, destino) {
  if (!celdas.length) return;
  const [W, H, COL] = [320, 213, 4];
  const filas = Math.ceil(celdas.length / COL);
  const capas = [];
  for (const [k, { i, ruta }] of celdas.entries()) {
    const img = await sharp(ruta).resize(W, H, { fit: 'contain', background: '#111' }).toBuffer();
    const etiqueta = Buffer.from(
      `<svg width="44" height="30"><rect width="44" height="30" fill="#000"/><text x="22" y="22" font-size="20" fill="#ff0" text-anchor="middle" font-family="sans-serif">${i}</text></svg>`,
    );
    const left = (k % COL) * (W + 4);
    const top = Math.floor(k / COL) * (H + 4);
    capas.push({ input: img, left, top }, { input: etiqueta, left, top });
  }
  await sharp({ create: { width: COL * (W + 4), height: filas * (H + 4), channels: 3, background: '#333' } })
    .composite(capas).jpeg({ quality: 80 }).toFile(destino);
}

async function originales(seleccion) {
  const salida = join(dir, 'originales');
  await mkdir(salida, { recursive: true });
  // Reutiliza lo ya descargado para no repetir peticiones.
  const previo = await leerJson(join(salida, 'meta.json')).catch(() => ({}));
  const meta = {};
  for (const [grupo, claves] of Object.entries(seleccion)) {
    for (const [clave, lista] of Object.entries(claves)) {
      const titulos = lista.map((s) => s.archivo.replace(/_/g, ' '));
      const faltan = titulos.filter((t) => !previo[t] || !existsSync(previo[t].ruta));
      const paginas = faltan.length ? await api({ titles: faltan.join('|') }, 1920) : [];
      for (const [n, titulo] of titulos.entries()) {
        if (!faltan.includes(titulo)) {
          meta[titulo] = previo[titulo];
          continue;
        }
        const c = credito(paginas.find((p) => p.title === titulo) ?? {});
        if (!c) throw new Error(`Sin datos o licencia no permitida: ${titulo}`);
        const ruta = await bajar(c.url, join(salida, `${c.id}.${ext(c.mime)}`));
        meta[titulo] = { ...c, ruta };
        console.log(`${grupo}/${clave}-${n + 1}: ${titulo}`);
      }
    }
  }
  await writeFile(join(salida, 'meta.json'), JSON.stringify(meta, null, 2));
}

if (comando === 'buscar') {
  const plan = await leerJson(entrada);
  for (const claves of Object.values(plan))
    for (const [clave, consultas] of Object.entries(claves))
      if (!filtro.length || filtro.includes(clave)) await buscar(clave, consultas);
} else {
  await originales(await leerJson(entrada));
}
