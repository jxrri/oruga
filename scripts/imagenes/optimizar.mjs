// Convierte las imágenes elegidas a WebP y escribe el manifiesto y LICENCIAS.md.
//   node scripts/imagenes/optimizar.mjs <seleccion.json> <dir> <raizProyecto>
// Lee <dir>/originales/meta.json (lo genera "descargar.mjs originales"). En seleccion.json,
// "autor" y "licencia" opcionales corrigen datos mal cargados en Commons.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const [rutaSeleccion, dir, raiz] = process.argv.slice(2);
if (!rutaSeleccion || !dir || !raiz) {
  console.error('Uso: optimizar.mjs <seleccion.json> <dir> <raizProyecto>');
  process.exit(1);
}
const seleccion = JSON.parse(await readFile(rutaSeleccion, 'utf8'));
const meta = JSON.parse(await readFile(join(dir, 'originales', 'meta.json'), 'utf8'));
const manifiesto = {};
const lineas = ['# Licencias de imágenes', '', 'Fotos de Wikimedia Commons con licencia libre. Optimizadas a WebP (480 y 1600 px) sin cambios de contenido.', ''];

for (const [grupo, claves] of Object.entries(seleccion)) {
  manifiesto[grupo] = {};
  const salida = join(raiz, 'public', 'img', grupo);
  await mkdir(salida, { recursive: true });
  lineas.push(`## ${grupo === 'categorias' ? 'Categorías' : 'Escenas'}`, '');
  for (const [clave, lista] of Object.entries(claves)) {
    manifiesto[grupo][clave] = [];
    for (const [n, s] of lista.entries()) {
      const m = meta[s.archivo.replace(/_/g, ' ')];
      if (!m) throw new Error(`Falta en meta.json: ${s.archivo}`);
      const archivo = `${clave}-${n + 1}`;
      // sharp descarta los metadatos por defecto; rotate() aplica la orientación EXIF.
      await sharp(m.ruta).rotate().resize({ width: 480 }).webp({ quality: 72 }).toFile(join(salida, `${archivo}-sm.webp`));
      const lg = await sharp(m.ruta).rotate().resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 78 }).toFile(join(salida, `${archivo}-lg.webp`));
      const img = { archivo, ancho: lg.width, alto: lg.height, titulo: m.titulo, autor: s.autor ?? m.autor, licencia: s.licencia ?? m.licencia };
      if (m.urlLicencia) img.urlLicencia = m.urlLicencia;
      manifiesto[grupo][clave].push({ ...img, fuente: m.fuente, alt: s.alt });
      const lic = m.urlLicencia ? `[${img.licencia}](${m.urlLicencia})` : img.licencia;
      lineas.push(`- \`${grupo}/${archivo}\`: "${m.titulo}", ${img.autor}. ${lic}. <${m.fuente}>`);
      console.log(`${grupo}/${archivo} ${lg.width}x${lg.height}`);
    }
  }
  lineas.push('');
}
await writeFile(join(raiz, 'src', 'shared', 'data', 'imagenes.json'), `${JSON.stringify(manifiesto, null, 2)}\n`);
await writeFile(join(raiz, 'public', 'img', 'LICENCIAS.md'), lineas.join('\n'));
