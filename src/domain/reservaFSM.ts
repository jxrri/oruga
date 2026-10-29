/** Máquina de estados de la reserva (SPEC §4.2, RF-RES-03). */
import type { AccionTransicion, EstadoReserva, Reserva } from '@/api/contrato';
import { aMs } from '@/shared/lib/fechas';

export const ETIQUETA_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  borrador: 'Borrador',
  confirmada: 'Confirmada',
  en_curso: 'En curso',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

export const ETIQUETA_ACCION: Record<AccionTransicion, string> = {
  confirmar: 'Confirmar',
  entregar: 'Entregar',
  devolver: 'Registrar devolución',
  cancelar: 'Cancelar',
};

export const TRANSICIONES: Record<AccionTransicion, { desde: EstadoReserva[]; hacia: EstadoReserva }> = {
  confirmar: { desde: ['borrador'], hacia: 'confirmada' },
  entregar: { desde: ['confirmada'], hacia: 'en_curso' },
  devolver: { desde: ['en_curso'], hacia: 'finalizada' },
  cancelar: { desde: ['borrador', 'confirmada'], hacia: 'cancelada' },
};

export interface CondicionesTransicion {
  /** Conflictos bloqueantes actuales de la reserva */
  bloqueantes: number;
  clienteBloqueado: boolean;
  /** Resultado de la inspección de salida, si existe */
  resultadoSalida?: 'apto' | 'apto_con_observaciones' | 'no_apto';
}

export type ResultadoTransicion = { ok: true; hacia: EstadoReserva } | { ok: false; motivo: string };

export function evaluarTransicion(
  reserva: Pick<Reserva, 'estado' | 'activoId' | 'inspeccionSalidaId' | 'inspeccionDevolucionId'>,
  accion: AccionTransicion,
  c: CondicionesTransicion,
): ResultadoTransicion {
  const t = TRANSICIONES[accion];
  if (!t.desde.includes(reserva.estado))
    return {
      ok: false,
      motivo: `"${ETIQUETA_ACCION[accion]}" no aplica a una reserva ${ETIQUETA_ESTADO_RESERVA[reserva.estado].toLowerCase()}.`,
    };
  switch (accion) {
    case 'confirmar':
      if (!reserva.activoId) return { ok: false, motivo: 'Asigna un activo antes de confirmar.' };
      if (c.clienteBloqueado) return { ok: false, motivo: 'El cliente está bloqueado.' };
      if (c.bloqueantes > 0) return { ok: false, motivo: 'Resuelve los conflictos bloqueantes antes de confirmar.' };
      break;
    case 'entregar':
      if (!reserva.inspeccionSalidaId) return { ok: false, motivo: 'Falta la inspección de salida.' };
      if (c.resultadoSalida === 'no_apto') return { ok: false, motivo: 'La inspección de salida resultó no apta.' };
      if (c.bloqueantes > 0) return { ok: false, motivo: 'El activo tiene conflictos bloqueantes.' };
      break;
    case 'devolver':
      // Una devolución no apta no impide cerrar: el efecto cae sobre el activo (SPEC §4.2).
      if (!reserva.inspeccionDevolucionId) return { ok: false, motivo: 'Falta la inspección de devolución.' };
      break;
    case 'cancelar':
      break;
  }
  return { ok: true, hacia: t.hacia };
}

export const accionesPosibles = (estado: EstadoReserva): AccionTransicion[] =>
  (Object.keys(TRANSICIONES) as AccionTransicion[]).filter((a) => TRANSICIONES[a].desde.includes(estado));

export interface PermisosEdicion {
  moverFechas: boolean;
  cambiarActivo: boolean;
  extenderFin: boolean;
}

/** Tabla de SPEC §4.2: qué se puede editar según el estado. */
export const permisosEdicion = (estado: EstadoReserva): PermisosEdicion => {
  switch (estado) {
    case 'borrador':
    case 'confirmada':
      return { moverFechas: true, cambiarActivo: true, extenderFin: true };
    case 'en_curso':
      return { moverFechas: false, cambiarActivo: false, extenderFin: true };
    default:
      return { moverFechas: false, cambiarActivo: false, extenderFin: false };
  }
};

/** Valida un cambio contra la tabla de edición. En curso solo se permite mover el fin hacia adelante. */
export function cambioPermitido(
  r: Pick<Reserva, 'estado' | 'inicio' | 'fin' | 'activoId'>,
  cambio: { inicio?: string; fin?: string; activoId?: string | null },
): { ok: true } | { ok: false; motivo: string } {
  const p = permisosEdicion(r.estado);
  const mueveInicio = cambio.inicio !== undefined && cambio.inicio !== r.inicio;
  const mueveFin = cambio.fin !== undefined && cambio.fin !== r.fin;
  const cambiaActivo = cambio.activoId !== undefined && cambio.activoId !== r.activoId;
  if (cambiaActivo && !p.cambiarActivo) return { ok: false, motivo: 'En este estado no se puede cambiar de activo.' };
  if (mueveInicio && !p.moverFechas) return { ok: false, motivo: 'En este estado no se pueden mover las fechas.' };
  if (mueveFin && !p.moverFechas) {
    if (!p.extenderFin) return { ok: false, motivo: 'La reserva ya no admite cambios.' };
    if (aMs(cambio.fin!) < aMs(r.fin)) return { ok: false, motivo: 'Una reserva en curso solo puede extender su fin.' };
  }
  return { ok: true };
}
