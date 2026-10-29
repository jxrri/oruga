/**
 * Núcleo de fechas (SPEC §8). Regla única: se guarda en UTC, se calcula en milisegundos y se
 * muestra e ingresa en la zona de la sede. Es el único archivo donde ESLint permite `new Date`.
 */
import { TZDate } from '@date-fns/tz';
import { addDays, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { FechaCivil, InstanteUTC, ZonaIANA } from '@/api/contrato';

export const MS_MINUTO = 60_000;
export const MS_HORA = 60 * MS_MINUTO;
/** Solo para duraciones y cobro (bloques de 24 h). Nunca para avanzar días de calendario. */
export const MS_24H = 24 * MS_HORA;

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;
const CIVIL = /^(\d{4})-(\d{2})-(\d{2})$/;

const aUTC = (d: Date | number): InstanteUTC => new Date(typeof d === 'number' ? d : d.getTime()).toISOString().replace('.000Z', 'Z');

export const esInstanteUTC = (v: string): boolean => ISO_UTC.test(v) && !Number.isNaN(Date.parse(v));

/** Instante UTC a milisegundos. Lanza si el texto no lleva Z: así no se cuela una hora local. */
export const aMs = (i: InstanteUTC): number => {
  if (!esInstanteUTC(i)) throw new Error(`Instante inválido (se exige ISO UTC con Z): ${i}`);
  return Date.parse(i);
};

export const desdeMs = (ms: number): InstanteUTC => aUTC(ms);

export const sumarMs = (i: InstanteUTC, ms: number): InstanteUTC => aUTC(aMs(i) + ms);

export const enZona = (i: InstanteUTC, zona: ZonaIANA): TZDate => new TZDate(aMs(i), zona);

export const formatear = (i: InstanteUTC, zona: ZonaIANA, patron = 'dd/MM/yyyy HH:mm'): string =>
  format(enZona(i, zona), patron, { locale: es });

/** Lo que el usuario escribe en el formulario, interpretado en la zona de la sede. */
export const desdeHoraLocal = (
  a: number,
  mes: number,
  dia: number,
  h: number,
  min: number,
  zona: ZonaIANA,
): InstanteUTC => aUTC(new TZDate(a, mes - 1, dia, h, min, zona));

export const inicioDelDia = (i: InstanteUTC, zona: ZonaIANA): InstanteUTC => aUTC(startOfDay(enZona(i, zona)));

/** Suma días de calendario en la zona (un día no siempre dura 24 h). */
export const sumarDias = (i: InstanteUTC, n: number, zona: ZonaIANA): InstanteUTC =>
  aUTC(addDays(enZona(i, zona), n));

/** Inicios de día consecutivos en la zona, para marcas del eje y columnas. */
export const diasDelRango = (desde: InstanteUTC, n: number, zona: ZonaIANA): InstanteUTC[] => {
  const base = startOfDay(enZona(desde, zona));
  return Array.from({ length: n }, (_, k) => aUTC(addDays(base, k)));
};

/** Partes de pared de un instante en una zona: para inputs y marcas del eje. */
export const partesLocales = (i: InstanteUTC, zona: ZonaIANA) => {
  const d = enZona(i, zona);
  return {
    anio: d.getFullYear(),
    mes: d.getMonth() + 1,
    dia: d.getDate(),
    hora: d.getHours(),
    minuto: d.getMinutes(),
    diaSemana: d.getDay(),
  };
};

/** Valor para `<input type="datetime-local">` en la zona dada: "2026-11-03T09:00". */
export const aInputLocal = (i: InstanteUTC, zona: ZonaIANA): string => format(enZona(i, zona), "yyyy-MM-dd'T'HH:mm");

/** Inverso de aInputLocal. Devuelve null si el texto no es válido. */
export const desdeInputLocal = (valor: string, zona: ZonaIANA): InstanteUTC | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor);
  if (!m) return null;
  const [, a, mes, d, h, min] = m.map(Number) as [number, number, number, number, number, number];
  return desdeHoraLocal(a, mes, d, h, min, zona);
};

/** Fecha civil (día de calendario) de un instante visto en una zona. */
export const fechaCivilDe = (i: InstanteUTC, zona: ZonaIANA): FechaCivil => format(enZona(i, zona), 'yyyy-MM-dd');

const partesCivil = (f: FechaCivil): [number, number, number] => {
  const m = CIVIL.exec(f);
  if (!m) throw new Error(`Fecha civil inválida: ${f}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

/** Primer instante en que la fecha civil ya pasó en la zona (un vencimiento cubre todo su día). */
export const finDeFechaCivil = (f: FechaCivil, zona: ZonaIANA): InstanteUTC => {
  const [a, m, d] = partesCivil(f);
  return aUTC(addDays(new TZDate(a, m - 1, d, 0, 0, zona), 1));
};

/** Días de calendario entre dos fechas civiles (b - a). Sin zonas: son días puros. */
export const diasEntreCiviles = (a: FechaCivil, b: FechaCivil): number => {
  const [a1, m1, d1] = partesCivil(a);
  const [a2, m2, d2] = partesCivil(b);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / MS_24H);
};

export const sumarDiasCivil = (f: FechaCivil, n: number): FechaCivil => {
  const [a, m, d] = partesCivil(f);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};

/** Formato legible de una fecha civil sin pasar por zonas: "03 nov 2026". */
export const formatearCivil = (f: FechaCivil, patron = 'dd MMM yyyy'): string => {
  const [a, m, d] = partesCivil(f);
  return format(new Date(a, m - 1, d), patron, { locale: es });
};

/** Desfase de la zona en ese instante, como etiqueta: "UTC−4", "UTC+9", "UTC−4:30". */
export const etiquetaDesfase = (i: InstanteUTC, zona: ZonaIANA): string => {
  const min = -enZona(i, zona).getTimezoneOffset();
  if (min === 0) return 'UTC';
  const signo = min > 0 ? '+' : '−';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const resto = abs % 60;
  return `UTC${signo}${h}${resto ? `:${String(resto).padStart(2, '0')}` : ''}`;
};

/** Zona del navegador, para la opción "Zona del navegador" del timeline. */
export const zonaNavegador = (): ZonaIANA => Intl.DateTimeFormat().resolvedOptions().timeZone;

// Reloj de demo (SPEC §11.1): "hoy" configurable que avanza en tiempo real desde su base.
const HOY_POR_DEFECTO: InstanteUTC = '2026-11-02T13:30:00Z';
let baseDemoMs = aMs(HOY_POR_DEFECTO);
let arranqueRealMs = Date.now();
let congelado = false;

export const configurarReloj = (opciones: { hoy?: InstanteUTC; congelar?: boolean }): void => {
  if (opciones.hoy) baseDemoMs = aMs(opciones.hoy);
  arranqueRealMs = Date.now();
  congelado = opciones.congelar ?? congelado;
};

export const ahoraMs = (): number => (congelado ? baseDemoMs : baseDemoMs + (Date.now() - arranqueRealMs));

export const ahora = (): InstanteUTC => aUTC(ahoraMs());

/** Fecha civil de "hoy" en una zona. */
export const hoyCivil = (zona: ZonaIANA): FechaCivil => fechaCivilDe(ahora(), zona);

/** Redondea al múltiplo de `pasoMs` más cercano en ms UTC. Para pasos de un día usar inicioDelDia en la zona. */
export const ajustarMs = (ms: number, pasoMs: number): number => Math.round(ms / pasoMs) * pasoMs;
