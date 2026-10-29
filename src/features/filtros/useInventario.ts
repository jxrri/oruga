/** Inventario enriquecido y filtrado, compartido por inventario, timeline, mapa y tablero (RF-PLN-07). */
import { useMemo } from 'react';
import { useGetActivosQuery, useGetPlanesQuery } from '@/api/baseApi';
import { useCatalogos, useOrdenesGlobales, useReservasGlobales } from '@/api/hooks';
import { useAppSelector } from '@/app/hooks';
import { ahoraMs } from '@/shared/lib/fechas';
import { aplicarFiltros, enriquecer } from './selectores';

const VACIO: never[] = [];

export function useInventario(opciones: { ignorarFiltros?: boolean } = {}) {
  const activos = useGetActivosQuery();
  const reservas = useReservasGlobales();
  const ordenes = useOrdenesGlobales();
  const planes = useGetPlanesQuery();
  const { sedes, categorias, cargando: cargandoCatalogos } = useCatalogos();
  const filtros = useAppSelector((s) => s.filtros.actual);

  const base = useMemo(
    () =>
      enriquecer({
        activos: activos.data ?? VACIO,
        categorias,
        sedes,
        reservas: reservas.data ?? VACIO,
        ordenes: ordenes.data ?? VACIO,
        planes: planes.data ?? VACIO,
        ahoraMs: ahoraMs(),
      }),
    [activos.data, categorias, sedes, reservas.data, ordenes.data, planes.data],
  );

  const resultado = useMemo(
    () =>
      aplicarFiltros(base, opciones.ignorarFiltros ? { ...filtros, ...SIN_FILTROS } : filtros, {
        reservas: reservas.data ?? VACIO,
        ordenes: ordenes.data ?? VACIO,
        categorias,
      }),
    [base, filtros, opciones.ignorarFiltros, reservas.data, ordenes.data, categorias],
  );

  const cargando = activos.isLoading || reservas.isLoading || ordenes.isLoading || planes.isLoading || cargandoCatalogos;
  const error = activos.error ?? reservas.error ?? ordenes.error ?? planes.error;
  const reintentar = () => {
    void activos.refetch();
    void reservas.refetch();
    void ordenes.refetch();
    void planes.refetch();
  };

  return { ...resultado, base, filtros, cargando, error, reintentar };
}

const SIN_FILTROS = {
  q: '',
  tipo: null,
  categorias: [],
  motores: [],
  capacidad: { min: null, max: null },
  estados: [],
  sedes: [],
  disponibleEntre: null,
  mantenimientoProximo: false,
  requiereOperador: null,
};
