/** Intervalos semiabiertos [inicio, fin) en milisegundos UTC (SPEC §4.3, §7.4). */
import type { ID, InstanteUTC } from '@/api/contrato';
import { aMs } from '@/shared/lib/fechas';

export interface Intervalo {
  inicio: number;
  fin: number;
}

export const seSolapan = (a: Intervalo, b: Intervalo): boolean => a.inicio < b.fin && b.inicio < a.fin;

export const contiene = (a: Intervalo, t: number): boolean => a.inicio <= t && t < a.fin;

export const duracion = (a: Intervalo): number => Math.max(0, a.fin - a.inicio);

export const aIntervalo = (x: { inicio: InstanteUTC; fin: InstanteUTC }): Intervalo => ({
  inicio: aMs(x.inicio),
  fin: aMs(x.fin),
});

export const ampliar = (a: Intervalo, margen: number): Intervalo => ({ inicio: a.inicio - margen, fin: a.fin + margen });

/** Une intervalos que se tocan o solapan. Devuelve una lista ordenada y disjunta. */
export function fusionar(lista: readonly Intervalo[]): Intervalo[] {
  const orden = [...lista].sort((a, b) => a.inicio - b.inicio);
  const out: Intervalo[] = [];
  for (const it of orden) {
    const ultimo = out[out.length - 1];
    if (ultimo && it.inicio <= ultimo.fin) ultimo.fin = Math.max(ultimo.fin, it.fin);
    else out.push({ ...it });
  }
  return out;
}

/** Tramos libres dentro de `rango`, dados los ocupados. */
export function huecos(ocupados: readonly Intervalo[], rango: Intervalo): Intervalo[] {
  const out: Intervalo[] = [];
  let cursor = rango.inicio;
  for (const o of fusionar(ocupados)) {
    if (o.fin <= rango.inicio || o.inicio >= rango.fin) continue;
    if (o.inicio > cursor) out.push({ inicio: cursor, fin: Math.min(o.inicio, rango.fin) });
    cursor = Math.max(cursor, o.fin);
  }
  if (cursor < rango.fin) out.push({ inicio: cursor, fin: rango.fin });
  return out;
}

export interface ConIntervalo {
  id: ID;
  inicio: InstanteUTC;
  fin: InstanteUTC;
}

/** Primer índice cuyo inicio es >= t (búsqueda binaria sobre una lista ordenada por inicio). */
export function primerIndiceDesde(inicios: readonly number[], t: number): number {
  let lo = 0;
  let hi = inicios.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (inicios[mid]! < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Índice por fila: elementos ordenados por inicio, con sus ms precalculados (SPEC §7.2). */
export interface IndiceFila<T> {
  items: T[];
  inicios: number[];
  fines: number[];
  /** Mayor duración de la fila: acota hacia atrás la búsqueda binaria */
  maxDuracion: number;
}

export function indexarPor<T extends { inicio: InstanteUTC; fin: InstanteUTC }>(
  lista: readonly T[],
  clave: (x: T) => ID | null,
): Map<ID | null, IndiceFila<T>> {
  const grupos = new Map<ID | null, T[]>();
  for (const x of lista) {
    const k = clave(x);
    const g = grupos.get(k);
    if (g) g.push(x);
    else grupos.set(k, [x]);
  }
  const out = new Map<ID | null, IndiceFila<T>>();
  for (const [k, items] of grupos) {
    items.sort((a, b) => aMs(a.inicio) - aMs(b.inicio));
    const inicios = items.map((x) => aMs(x.inicio));
    const fines = items.map((x) => aMs(x.fin));
    let maxDuracion = 0;
    for (let i = 0; i < items.length; i++) maxDuracion = Math.max(maxDuracion, fines[i]! - inicios[i]!);
    out.set(k, { items, inicios, fines, maxDuracion });
  }
  return out;
}

/** Elementos de una fila que cruzan la ventana visible, en O(log n + k). */
export function enVentana<T>(fila: IndiceFila<T> | undefined, ventana: Intervalo): T[] {
  if (!fila) return [];
  const desde = primerIndiceDesde(fila.inicios, ventana.inicio - fila.maxDuracion);
  const out: T[] = [];
  for (let i = desde; i < fila.items.length; i++) {
    if (fila.inicios[i]! >= ventana.fin) break;
    if (fila.fines[i]! > ventana.inicio) out.push(fila.items[i]!);
  }
  return out;
}
