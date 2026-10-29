/** Búsqueda de disponibilidad (RF-INV-06) y filtro "Disponible entre" (SPEC §10). */
import type { Activo, Categoria, ID, OrdenMantenimiento, Reserva, Sede } from '@/api/contrato';
import { aMs } from '@/shared/lib/fechas';
import { type Intervalo, seSolapan } from './intervalos';

export interface DatosDisponibilidad {
  reservas: readonly Reserva[];
  ordenes: readonly OrdenMantenimiento[];
}

/** Un activo está libre si es operativo y ninguna reserva viva u orden pendiente cruza el rango. */
export function estaLibre(activo: Activo, rango: Intervalo, datos: DatosDisponibilidad, excluirReservaId?: ID): boolean {
  if (activo.estadoOperativo !== 'operativo') return false;
  for (const r of datos.reservas) {
    if (r.activoId !== activo.id || r.id === excluirReservaId) continue;
    if (r.estado === 'cancelada' || r.estado === 'finalizada') continue;
    if (seSolapan(rango, { inicio: aMs(r.inicio), fin: aMs(r.fin) })) return false;
  }
  for (const m of datos.ordenes) {
    if (m.activoId !== activo.id || m.estado === 'cancelada' || m.estado === 'completada') continue;
    if (seSolapan(rango, { inicio: aMs(m.inicio), fin: aMs(m.finEstimado) })) return false;
  }
  return true;
}

/** Activos libres de una categoría y sede, ordenados por sede y luego por tarifa diaria. */
export function activosDisponibles(
  activos: readonly Activo[],
  rango: Intervalo,
  datos: DatosDisponibilidad,
  filtro: { categoriaId?: ID; sedeId?: ID },
  catalogos: { categorias: readonly Categoria[]; sedes: readonly Sede[] },
): Activo[] {
  const cat = new Map(catalogos.categorias.map((c) => [c.id, c]));
  const sede = new Map(catalogos.sedes.map((s) => [s.id, s]));
  return activos
    .filter((a) => (!filtro.categoriaId || a.categoriaId === filtro.categoriaId) && (!filtro.sedeId || a.sedeBaseId === filtro.sedeId))
    .filter((a) => estaLibre(a, rango, datos))
    .sort((a, b) => {
      const s = (sede.get(a.sedeBaseId)?.nombre ?? '').localeCompare(sede.get(b.sedeBaseId)?.nombre ?? '', 'es');
      if (s !== 0) return s;
      return (cat.get(a.categoriaId)?.tarifas.dia ?? 0) - (cat.get(b.categoriaId)?.tarifas.dia ?? 0);
    });
}
