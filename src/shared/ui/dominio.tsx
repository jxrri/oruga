/** Badges de dominio compartidos por los módulos. Cada estado lleva ícono además del color (SPEC §12.1). */
import type { Icon } from '@phosphor-icons/react';
import {
  ArchiveIcon,
  ArrowUpRightIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  FlagIcon,
  PencilSimpleLineIcon,
  PlayIcon,
  ProhibitIcon,
  WarningCircleIcon,
  WarningIcon,
  WrenchIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import type { CodigoConflicto, EstadoReserva, ResultadoInspeccion, Severidad } from '@/api/contrato';
import { ETIQUETA_CONFLICTO, SEVERIDAD } from '@/domain/conflictos';
import { ETIQUETA_ESTADO_VISIBLE, type EstadoVisible } from '@/domain/estadoActivo';
import { ETIQUETA_ESTADO_RESERVA } from '@/domain/reservaFSM';
import { Badge, type BadgeProps } from './Badge';

type Tono = NonNullable<BadgeProps['tono']>;

const ACTIVO: Record<EstadoVisible, { tono: Tono; icono: Icon }> = {
  disponible: { tono: 'ok', icono: CheckCircleIcon },
  proxima_salida: { tono: 'info', icono: ClockCountdownIcon },
  en_alquiler: { tono: 'acento', icono: ArrowUpRightIcon },
  en_mantenimiento: { tono: 'mnt', icono: WrenchIcon },
  fuera_de_servicio: { tono: 'danger', icono: ProhibitIcon },
  baja: { tono: 'neutro', icono: ArchiveIcon },
};

export function EstadoActivoBadge({ estado, className }: { estado: EstadoVisible; className?: string }) {
  const e = ACTIVO[estado];
  return (
    <Badge tono={e.tono} icono={e.icono} className={className}>
      {ETIQUETA_ESTADO_VISIBLE[estado]}
    </Badge>
  );
}

const RESERVA: Record<EstadoReserva, { tono: Tono; icono: Icon }> = {
  borrador: { tono: 'neutro', icono: PencilSimpleLineIcon },
  confirmada: { tono: 'info', icono: CalendarCheckIcon },
  en_curso: { tono: 'acento', icono: PlayIcon },
  finalizada: { tono: 'ok', icono: FlagIcon },
  cancelada: { tono: 'neutro', icono: XCircleIcon },
};

export function EstadoReservaBadge({ estado, className }: { estado: EstadoReserva; className?: string }) {
  const e = RESERVA[estado];
  return (
    <Badge tono={e.tono} icono={e.icono} className={className}>
      {ETIQUETA_ESTADO_RESERVA[estado]}
    </Badge>
  );
}

export interface ConflictoBadgeProps {
  codigo: CodigoConflicto;
  /** Por defecto la severidad del código (SEVERIDAD) */
  severidad?: Severidad;
  /** Muestra el código en mono junto a la etiqueta: "SOLAPE" */
  mostrarCodigo?: boolean;
  /** Mensaje completo del conflicto, como título emergente */
  mensaje?: string;
  className?: string;
}

/** Conflicto: bloqueante en rojo con ícono de prohibido, advertencia en naranja con triángulo. */
export function ConflictoBadge({ codigo, severidad = SEVERIDAD[codigo], mostrarCodigo, mensaje, className }: ConflictoBadgeProps) {
  const bloquea = severidad === 'bloqueante';
  return (
    <Badge tono={bloquea ? 'danger' : 'warn'} icono={bloquea ? ProhibitIcon : WarningIcon} className={className} title={mensaje}>
      {ETIQUETA_CONFLICTO[codigo]}
      {mostrarCodigo && <span className="ml-1 font-mono text-[10.5px] opacity-75">{codigo}</span>}
      <span className="sr-only">{bloquea ? ', bloqueante' : ', advertencia'}</span>
    </Badge>
  );
}

export const ETIQUETA_RESULTADO: Record<ResultadoInspeccion, string> = {
  apto: 'Apto',
  apto_con_observaciones: 'Apto con observaciones',
  no_apto: 'No apto',
};

const RESULTADO: Record<ResultadoInspeccion, { tono: Tono; icono: Icon }> = {
  apto: { tono: 'ok', icono: CheckCircleIcon },
  apto_con_observaciones: { tono: 'warn', icono: WarningCircleIcon },
  no_apto: { tono: 'danger', icono: XCircleIcon },
};

export function ResultadoInspeccionBadge({ resultado, className }: { resultado: ResultadoInspeccion; className?: string }) {
  const r = RESULTADO[resultado];
  return (
    <Badge tono={r.tono} icono={r.icono} className={className}>
      {ETIQUETA_RESULTADO[resultado]}
    </Badge>
  );
}
