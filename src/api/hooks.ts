/**
 * Consultas compartidas con argumentos estables: así timeline, inventario y tablero usan la misma
 * entrada de caché y se sincronizan sin código extra (SPEC §6.3).
 */
import { useMemo } from 'react';
import type { Categoria, ID, Sede } from './contrato';
import { ahora, MS_24H, sumarMs } from '@/shared/lib/fechas';
import { useGetCategoriasQuery, useGetOrdenesQuery, useGetReservasQuery, useGetSedesQuery } from './baseApi';

const hoyUTC = ahora().slice(0, 10);

/** Ventana de datos de la demo: 35 días atrás a 95 días adelante del "hoy" del reloj de demo. */
export const RANGO_GLOBAL = {
  desde: sumarMs(`${hoyUTC}T00:00:00Z`, -35 * MS_24H),
  hasta: sumarMs(`${hoyUTC}T00:00:00Z`, 95 * MS_24H),
} as const;

export const useReservasGlobales = () => useGetReservasQuery(RANGO_GLOBAL);

export const useOrdenesGlobales = () => useGetOrdenesQuery({ desde: RANGO_GLOBAL.desde, hasta: RANGO_GLOBAL.hasta });

export interface Catalogos {
  sedes: Sede[];
  categorias: Categoria[];
  sedePorId: Map<ID, Sede>;
  categoriaPorId: Map<ID, Categoria>;
  cargando: boolean;
}

export function useCatalogos(): Catalogos {
  const sedes = useGetSedesQuery();
  const categorias = useGetCategoriasQuery();
  return useMemo(
    () => ({
      sedes: sedes.data ?? [],
      categorias: categorias.data ?? [],
      sedePorId: new Map((sedes.data ?? []).map((s) => [s.id, s])),
      categoriaPorId: new Map((categorias.data ?? []).map((c) => [c.id, c])),
      cargando: sedes.isLoading || categorias.isLoading,
    }),
    [sedes.data, categorias.data, sedes.isLoading, categorias.isLoading],
  );
}
