// Utilidades compartidas: API de Wikimedia Commons, licencias y validación de archivos.
import { writeFile } from 'node:fs/promises';

export const UA = 'OrugaFrontend/0.1 (educational project; github.com/jxrri/oruga)';
const API = 'https://commons.wikimedia.org/w/api.php';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET con User-Agent, una petición a la vez, reintento con espera ante 429/5xx. */
export async function pedir(url, intentos = 5) {
  for (let i = 0; i < intentos; i++) {
    await espera(400);
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res;
    if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status} ${url}`);
    const tras = Number(res.headers.get('retry-after')) || 2 ** i * 3;
    console.warn(`HTTP ${res.status}, reintento en ${tras} s`);
    await espera(tras * 1000);
  }
  throw new Error(`Sin respuesta tras ${intentos} intentos: ${url}`);
}

const META = 'LicenseShortName|License|LicenseUrl|Artist|Credit|ObjectName|UsageTerms';

/** Consulta la API. `params` se suma a la base común de imageinfo. */
export async function api(params, ancho) {
  const q = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata', iiextmetadatafilter: META, iiurlwidth: String(ancho), ...params,
  });
  const json = await (await pedir(`${API}?${q}`)).json();
  return json.query?.pages ?? [];
}

const quitarHtml = (s = '') =>
  s.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Normaliza la licencia; devuelve null si no es CC0, dominio público, CC BY o CC BY-SA. */
export function licencia(meta) {
  const corto = quitarHtml(meta.LicenseShortName?.value);
  const clave = (meta.License?.value ?? '').toLowerCase();
  if (/\b(nc|nd)\b|fair|non-commercial|noderiv/i.test(`${corto} ${clave}`)) return null;
  const cc = corto.match(/^CC BY(-SA)? (\d\.\d)/i);
  if (cc) return { licencia: `CC BY${cc[1] ? '-SA' : ''} ${cc[2]}`, urlLicencia: meta.LicenseUrl?.value };
  if (/^cc0/i.test(corto) || clave === 'cc0') return { licencia: 'CC0 1.0', urlLicencia: 'https://creativecommons.org/publicdomain/zero/1.0/' };
  if (/^(public domain|pd)/i.test(corto) || clave.startsWith('pd')) return { licencia: 'Dominio público' };
  return null;
}

/** Datos de crédito de una página de archivo de la API. */
export function credito(p) {
  const ii = p.imageinfo?.[0];
  if (!ii) return null;
  const lic = licencia(ii.extmetadata ?? {});
  if (!lic) return null;
  const m = ii.extmetadata;
  return {
    id: p.pageid, titulo: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''), archivoCommons: p.title,
    autor: quitarHtml(m.Artist?.value) || quitarHtml(m.Credit?.value) || 'Autor desconocido',
    ...lic, fuente: ii.descriptionurl, mime: ii.mime, ancho: ii.width, alto: ii.height, url: ii.thumburl ?? ii.url,
  };
}

/** Comprueba la firma del archivo: JPEG, PNG o WebP. */
export function esImagen(buf) {
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
  return jpeg || png || webp;
}

/** Descarga una imagen y la guarda solo si su firma es válida. */
export async function bajar(url, destino) {
  const buf = Buffer.from(await (await pedir(url)).arrayBuffer());
  if (!esImagen(buf)) throw new Error(`Firma no válida: ${url}`);
  await writeFile(destino, buf);
  return destino;
}
