/**
 * Genera docs/user-manual/oruga-user-manual.pdf a partir de docs/user-manual/manual.html.
 *
 * El índice se numera con las páginas reales: Chromium escribe en el PDF un destino con nombre por cada
 * enlace interno (#id), así que tras imprimir se lee en qué página quedó cada título, se rellenan los
 * números del índice y se vuelve a imprimir hasta que la paginación no cambie.
 *
 * Uso: node scripts/user-manual/build-pdf.mjs
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MANUAL_DIR, launchBrowser } from './browser.mjs';

const SOURCE = path.join(MANUAL_DIR, 'manual.html');
const OUTPUT = path.join(MANUAL_DIR, 'oruga-user-manual.pdf');
const MAX_PASSES = 4;

/** Devuelve el texto de un objeto PDF a partir de la tabla xref (Chromium no usa flujos de objetos). */
function createObjectReader(pdf) {
  const text = pdf.toString('latin1');
  const startXref = Number(/startxref\s+(\d+)\s+%%EOF\s*$/.exec(text)?.[1]);
  if (!Number.isFinite(startXref)) throw new Error('El PDF no tiene tabla xref legible.');
  const offsets = new Map();
  const lines = text.slice(startXref).split(/\r?\n/);
  let index = 1;
  while (index < lines.length && !lines[index].startsWith('trailer')) {
    const [first, count] = lines[index].trim().split(/\s+/).map(Number);
    for (let i = 0; i < count; i++) {
      const [offset, , kind] = lines[index + 1 + i].trim().split(/\s+/);
      if (kind === 'n') offsets.set(first + i, Number(offset));
    }
    index += count + 1;
  }
  return {
    text,
    read(id) {
      const start = offsets.get(id);
      if (start === undefined) throw new Error(`Objeto PDF ${id} no encontrado.`);
      return text.slice(start, text.indexOf('endobj', start));
    },
  };
}

/** Mapa id de destino → número de página (1..n), y total de páginas. */
function readDestinations(pdf) {
  const reader = createObjectReader(pdf);
  const catalogId = Number(
    /\/Root\s+(\d+)\s+0\s+R/.exec(reader.text.slice(reader.text.lastIndexOf('trailer')))?.[1],
  );
  const catalog = reader.read(catalogId);
  const pagesRoot = Number(/\/Pages\s+(\d+)\s+0\s+R/.exec(catalog)[1]);

  // Recorre el árbol de páginas en orden para saber la posición de cada objeto de página.
  const order = [];
  const walk = (id) => {
    const node = reader.read(id);
    if (/\/Type\s*\/Pages\b/.test(node)) {
      const kids = /\/Kids\s*\[([^\]]*)\]/.exec(node)[1];
      for (const match of kids.matchAll(/(\d+)\s+0\s+R/g)) walk(Number(match[1]));
    } else {
      order.push(id);
    }
  };
  walk(pagesRoot);
  const pageNumberOf = new Map(order.map((id, i) => [id, i + 1]));

  const destinations = new Map();
  const destsRef = /\/Dests\s+(\d+)\s+0\s+R/.exec(catalog);
  if (destsRef) {
    for (const match of reader
      .read(Number(destsRef[1]))
      .matchAll(/\/([^\s/[\]<>()]+)\s*\[\s*(\d+)\s+0\s+R/g)) {
      destinations.set(match[1], pageNumberOf.get(Number(match[2])));
    }
  }
  return { destinations, pageCount: order.length };
}

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(SOURCE).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Espera a que todas las imágenes estén decodificadas para que la paginación sea definitiva.
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));

  let pdf;
  let stable = false;
  for (let pass = 1; pass <= MAX_PASSES && !stable; pass++) {
    pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, outline: true, tagged: true });
    const { destinations, pageCount } = readDestinations(pdf);
    const changed = await page.evaluate(
      (entries) => {
        const pages = new Map(entries);
        let count = 0;
        for (const cell of document.querySelectorAll('[data-toc-page]')) {
          const value = String(pages.get(cell.dataset.tocPage) ?? '—');
          if (cell.textContent !== value) {
            cell.textContent = value;
            count++;
          }
        }
        return count;
      },
      [...destinations],
    );
    const missing = await page.evaluate(
      (ids) =>
        [...document.querySelectorAll('[data-toc-page]')]
          .map((c) => c.dataset.tocPage)
          .filter((id) => !ids.includes(id)),
      [...destinations.keys()],
    );
    if (missing.length) throw new Error(`Títulos del índice sin destino en el PDF: ${missing.join(', ')}`);
    console.log(`Pasada ${pass}: ${pageCount} páginas, ${changed} números de índice actualizados.`);
    stable = changed === 0;
  }
  if (!stable) throw new Error('La paginación del índice no se estabilizó.');

  writeFileSync(OUTPUT, pdf);
  console.log(`PDF generado: ${path.relative(process.cwd(), OUTPUT)}`);
} finally {
  await browser.close();
}
