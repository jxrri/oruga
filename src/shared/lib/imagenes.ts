/**
 * Manifiesto de imágenes locales (descargadas de Wikimedia Commons con su licencia).
 * Archivos: public/img/<grupo>/<archivo>-sm.webp (480 px) y -lg.webp (1600 px).
 */
import manifiesto from '@/shared/data/imagenes.json';

export interface ImagenLocal {
  archivo: string;
  ancho: number;
  alto: number;
  titulo: string;
  autor: string;
  licencia: string;
  urlLicencia?: string;
  fuente: string;
  /** Texto alternativo en español */
  alt: string;
}

type Grupo = 'categorias' | 'escenas';
type Manifiesto = Record<Grupo, Record<string, ImagenLocal[]>>;

const datos = manifiesto as unknown as Manifiesto;
const BASE = import.meta.env.BASE_URL;

export type Tamano = 'sm' | 'lg';

export const urlImagen = (grupo: Grupo, img: ImagenLocal, tamano: Tamano = 'lg') =>
  `${BASE}img/${grupo}/${img.archivo}-${tamano}.webp`;

/** Imagen de una categoría por slug. `n` elige la variante de forma estable (por ejemplo, por id de activo). */
export function imagenCategoria(slug: string, n = 0): ImagenLocal | null {
  const lista = datos.categorias[slug];
  if (!lista?.length) return null;
  return lista[Math.abs(n) % lista.length]!;
}

export const srcCategoria = (slug: string, n = 0, tamano: Tamano = 'sm'): string | null => {
  const img = imagenCategoria(slug, n);
  return img ? urlImagen('categorias', img, tamano) : null;
};

/** Escenas: "hero" (login), "patio", "inspeccion" (evidencias simuladas), "mantenimiento". */
export const escenas = (clave: string): ImagenLocal[] => datos.escenas[clave] ?? [];

export const srcEscena = (img: ImagenLocal, tamano: Tamano = 'lg') => urlImagen('escenas', img, tamano);

/** Hash estable de un texto, para elegir variantes sin aleatoriedad. */
export const hashTexto = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const todasLasImagenes = (): { grupo: Grupo; clave: string; img: ImagenLocal }[] =>
  (Object.keys(datos) as Grupo[]).flatMap((grupo) =>
    Object.entries(datos[grupo]).flatMap(([clave, lista]) => lista.map((img) => ({ grupo, clave, img }))),
  );
