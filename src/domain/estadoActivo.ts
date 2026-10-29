/** Estado visible del activo (SPEC §4.1): se deriva, nunca se guarda "reservado" ni "en alquiler". */
import type { Activo, Reserva } from '@/api/contrato';
import { MS_24H } from '@/shared/lib/fechas';
import { aIntervalo, contiene } from './intervalos';

export type EstadoVisible =
  | 'en_mantenimiento'
  | 'fuera_de_servicio'
  | 'baja'
  | 'en_alquiler'
  | 'proxima_salida'
  | 'disponible';

export const ETIQUETA_ESTADO_VISIBLE: Record<EstadoVisible, string> = {
  en_mantenimiento: 'En mantenimiento',
  fuera_de_servicio: 'Fuera de servicio',
  baja: 'De baja',
  en_alquiler: 'En alquiler',
  proxima_salida: 'Próxima salida',
  disponible: 'Disponible',
};

const ACTIVAS = new Set<Reserva['estado']>(['confirmada', 'en_curso']);

export function estadoVisible(activo: Activo, reservasDelActivo: readonly Reserva[], ahoraMs: number): EstadoVisible {
  if (activo.estadoOperativo !== 'operativo') return activo.estadoOperativo;
  let proxima = false;
  for (const r of reservasDelActivo) {
    if (!ACTIVAS.has(r.estado)) continue;
    const it = aIntervalo(r);
    if (r.estado === 'en_curso' || contiene(it, ahoraMs)) return 'en_alquiler';
    if (it.inicio > ahoraMs && it.inicio - ahoraMs <= MS_24H) proxima = true;
  }
  return proxima ? 'proxima_salida' : 'disponible';
}
