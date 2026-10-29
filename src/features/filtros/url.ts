/**
 * Sincronización bidireccional filtros <-> URL (SPEC §10). Un enlace como
 * ?tipo=maquinaria&motor=diesel&cap=5-20&sede=mcbo reproduce la vista y Atrás deshace filtros.
 */
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type { TipoMotor } from '@/api/contrato';
import type { EstadoVisible } from '@/domain/estadoActivo';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { FILTROS_VACIOS, filtrosReemplazados, type Filtros } from './filtrosSlice';

const CLAVES = ['q', 'tipo', 'cat', 'motor', 'cap', 'estado', 'sede', 'desde', 'hasta', 'mant', 'op'] as const;
const CIVIL = /^\d{4}-\d{2}-\d{2}$/;

const lista = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);
const num = (v: string | undefined) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

export function filtrosAParams(f: Filtros, base?: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams(base);
  CLAVES.forEach((k) => p.delete(k));
  if (f.q) p.set('q', f.q);
  if (f.tipo) p.set('tipo', f.tipo);
  if (f.categorias.length) p.set('cat', f.categorias.join(','));
  if (f.motores.length) p.set('motor', f.motores.join(','));
  if (f.capacidad.min !== null || f.capacidad.max !== null) p.set('cap', `${f.capacidad.min ?? ''}-${f.capacidad.max ?? ''}`);
  if (f.estados.length) p.set('estado', f.estados.join(','));
  if (f.sedes.length) p.set('sede', f.sedes.join(','));
  if (f.disponibleEntre) {
    p.set('desde', f.disponibleEntre.desde);
    p.set('hasta', f.disponibleEntre.hasta);
  }
  if (f.mantenimientoProximo) p.set('mant', '1');
  if (f.requiereOperador !== null) p.set('op', f.requiereOperador ? '1' : '0');
  return p;
}

export function paramsAFiltros(p: URLSearchParams): Filtros {
  const tipo = p.get('tipo');
  const [min, max] = (p.get('cap') ?? '').split('-');
  const desde = p.get('desde');
  const hasta = p.get('hasta');
  const op = p.get('op');
  return {
    ...FILTROS_VACIOS,
    q: p.get('q') ?? '',
    tipo: tipo === 'vehiculo' || tipo === 'maquinaria' ? tipo : null,
    categorias: lista(p.get('cat')),
    motores: lista(p.get('motor')) as TipoMotor[],
    capacidad: { min: num(min), max: num(max) },
    estados: lista(p.get('estado')) as EstadoVisible[],
    sedes: lista(p.get('sede')),
    disponibleEntre: desde && hasta && CIVIL.test(desde) && CIVIL.test(hasta) && desde <= hasta ? { desde, hasta } : null,
    mantenimientoProximo: p.get('mant') === '1',
    requiereOperador: op === '1' ? true : op === '0' ? false : null,
  };
}

const clave = (f: Filtros) => filtrosAParams(f).toString();

/** Montar en cada página que usa filtros (inventario, planificador). */
export function useSincronizarFiltrosUrl(): void {
  const [params, setParams] = useSearchParams();
  const filtros = useAppSelector((s) => s.filtros.actual);
  const dispatch = useAppDispatch();
  const ultimaUrl = useRef<string | null>(null);

  // URL -> store (carga inicial y botón Atrás)
  useEffect(() => {
    const desdeUrl = paramsAFiltros(params);
    const k = clave(desdeUrl);
    if (ultimaUrl.current === null && !CLAVES.some((c) => params.has(c))) {
      // Sin filtros en la URL: se conservan los del store al navegar entre módulos.
      ultimaUrl.current = clave(filtros);
      if (ultimaUrl.current) setParams(filtrosAParams(filtros, params), { replace: true });
      return;
    }
    if (k !== clave(filtros)) dispatch(filtrosReemplazados(desdeUrl));
    ultimaUrl.current = k;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // store -> URL (cada cambio de filtros es una entrada del historial)
  useEffect(() => {
    const k = clave(filtros);
    if (ultimaUrl.current === null || k === ultimaUrl.current) return;
    ultimaUrl.current = k;
    setParams(filtrosAParams(filtros, params));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);
}
