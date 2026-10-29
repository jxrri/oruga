/** Formato de números, montos y unidades (es-VE). Montos siempre en centavos enteros de USD. */
import type { Centavos, Medidor, UnidadCapacidad } from '@/api/contrato';

const usd = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const usdEntero = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const bs = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 });
const numero = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 1 });
const porcentaje = new Intl.NumberFormat('es-VE', { style: 'percent', maximumFractionDigits: 1 });

/** Espacio no separable entre número y unidad. */
const NBSP = ' ';

export const formatearMonto = (c: Centavos, opciones: { entero?: boolean } = {}) =>
  (opciones.entero ? usdEntero : usd).format(c / 100);

/** Equivalente en bolívares con la tasa del día (Bs por USD). */
export const formatearBs = (c: Centavos, tasa: number) => bs.format((c / 100) * tasa);

export const formatearNumero = (n: number) => numero.format(n);

export const formatearPorcentaje = (fraccion: number) => porcentaje.format(fraccion);

export const formatearLectura = (n: number, medidor: Medidor) =>
  `${numero.format(Math.round(n))}${NBSP}${medidor === 'km' ? 'km' : 'h'}`;

const UNIDAD: Record<UnidadCapacidad, string> = { pasajeros: 'pasajeros', kg: 'kg', t: 't', m3: 'm³' };

export const formatearCapacidad = (n: number, unidad: UnidadCapacidad) => `${numero.format(n)}${NBSP}${UNIDAD[unidad]}`;

export const unidadCapacidad = (u: UnidadCapacidad) => UNIDAD[u];

export const pluralizar = (n: number, singular: string, plural = `${singular}s`) =>
  `${numero.format(n)}${NBSP}${n === 1 ? singular : plural}`;
