import React, { useRef } from 'react';
import {
  CalendarCheckIcon,
  CaretLeftIcon,
  DotsSixVerticalIcon,
  FlagIcon,
  PencilSimpleLineIcon,
  PlayIcon,
  ProhibitIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import type { Conflicto, Reserva, ZonaIANA } from '@/api/contrato';
import { ETIQUETA_ESTADO_RESERVA } from '@/domain/reservaFSM';
import { cn } from '@/shared/lib/cn';
import { formatear } from '@/shared/lib/fechas';
import { Tooltip } from '@/shared/ui';
import { Monto } from '@/shared/ui/Monto';

export interface BarraReservaProps {
  reserva: Reserva;
  clienteNombre?: string;
  zona?: ZonaIANA;
  x: number;
  ancho: number;
  conflicto?: Conflicto;
  estaEnfocada?: boolean;
  onSeleccionar: (reserva: Reserva) => void;
  onIniciarArrastre: (
    e: React.PointerEvent,
    reserva: Reserva,
    modo: 'mover' | 'redimensionar-izq' | 'redimensionar-der',
  ) => void;
}

const CONFIG_ESTADO: Record<
  Reserva['estado'],
  { claseSuperficie: string; bordePunteado?: boolean; icono: React.ElementType }
> = {
  borrador: {
    claseSuperficie: 'barra-res-borrador',
    bordePunteado: true,
    icono: PencilSimpleLineIcon,
  },
  confirmada: {
    claseSuperficie: 'barra-res-confirmada',
    icono: CalendarCheckIcon,
  },
  en_curso: {
    claseSuperficie: 'barra-res-en-curso',
    icono: PlayIcon,
  },
  finalizada: {
    claseSuperficie: 'barra-res-finalizada',
    icono: FlagIcon,
  },
  cancelada: {
    claseSuperficie: 'barra-res-cancelada line-through',
    icono: PencilSimpleLineIcon,
  },
};

export const BarraReserva = React.memo(function BarraReserva({
  reserva,
  clienteNombre,
  zona = 'America/Caracas',
  x,
  ancho,
  conflicto,
  estaEnfocada,
  onSeleccionar,
  onIniciarArrastre,
}: BarraReservaProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const cfg = CONFIG_ESTADO[reserva.estado] ?? CONFIG_ESTADO.confirmada;
  const Icono = cfg.icono;

  const esBloqueante = conflicto?.severidad === 'bloqueante';
  const esAdvertencia = conflicto?.severidad === 'advertencia';
  const esArrastrable = reserva.estado !== 'finalizada' && reserva.estado !== 'cancelada';
  const permiteRedimensionarIzq =
    reserva.estado !== 'en_curso' && reserva.estado !== 'finalizada' && reserva.estado !== 'cancelada';
  const permiteRedimensionarDer = reserva.estado !== 'finalizada' && reserva.estado !== 'cancelada';

  const anchoReal = Math.max(ancho, 28);
  // Si la barra inicia antes del borde izquierdo visible, anclamos su etiqueta al margen visible
  const desplazamientoTexto = x < 0 ? Math.min(-x, Math.max(anchoReal - 56, 0)) : 0;
  const anchoVisible = x < 0 ? Math.max(anchoReal + x, 0) : anchoReal;

  const claseColor = esBloqueante
    ? 'barra-res-bloqueante'
    : esAdvertencia
      ? 'barra-res-advertencia'
      : cfg.claseSuperficie;

  const rangoFechas = `${formatear(reserva.inicio, zona, 'dd MMM HH:mm')} - ${formatear(reserva.fin, zona, 'dd MMM HH:mm')}`;

  return (
    <Tooltip
      lado="top"
      contenido={
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono font-semibold text-ink">{reserva.codigo}</span>
            <span className="text-[11px] font-medium text-ink-2">
              {ETIQUETA_ESTADO_RESERVA[reserva.estado]}
            </span>
          </div>
          {clienteNombre && <div className="text-xs font-medium text-ink">{clienteNombre}</div>}
          <div className="font-mono tabular text-[11px] text-ink-3">{rangoFechas}</div>
          {conflicto && (
            <div
              className={cn(
                'mt-1 border-t border-line pt-1 text-[11px] font-medium',
                esBloqueante ? 'text-danger' : 'text-warn',
              )}
            >
              {conflicto.codigo}: {conflicto.mensaje}
            </div>
          )}
        </div>
      }
    >
      <div
        ref={barRef}
        role="button"
        tabIndex={0}
        aria-label={`Reserva ${reserva.codigo}${clienteNombre ? `, ${clienteNombre}` : ''}, ${ETIQUETA_ESTADO_RESERVA[reserva.estado]}`}
        style={{
          transform: `translate3d(${x}px, 0, 0)`,
          width: anchoReal,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSeleccionar(reserva);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onSeleccionar(reserva);
          }
        }}
        className={cn(
          'group/barra absolute top-[9px] z-10 flex h-[34px] select-none items-center justify-between overflow-hidden rounded-md border text-xs shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-[background-color,border-color,box-shadow] duration-150 ease-salida',
          cfg.bordePunteado && !conflicto ? 'border-dashed' : 'border-solid',
          esArrastrable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          claseColor,
          estaEnfocada && 'ring-2 ring-accent ring-offset-2 ring-offset-panel z-20',
        )}
      >
        {/* Espina cromática lateral izquierda de 3 px */}
        <span
          aria-hidden
          style={{ backgroundColor: 'var(--barra-espina)' }}
          className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
        />

        {/* Tirador de redimensionado izquierdo */}
        {permiteRedimensionarIzq && (
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              onIniciarArrastre(e, reserva, 'redimensionar-izq');
            }}
            className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize rounded-l-md transition-colors hover:bg-ink/15"
            title="Arrastrar para ajustar inicio"
          />
        )}

        {/* Contenido principal con compensación de recorte izquierdo */}
        <div
          style={desplazamientoTexto > 0 ? { paddingLeft: desplazamientoTexto + 8 } : undefined}
          onPointerDown={(e) => {
            if (esArrastrable) {
              onIniciarArrastre(e, reserva, 'mover');
            }
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5 pl-2.5 pr-1.5"
        >
          {desplazamientoTexto > 0 ? (
            <CaretLeftIcon size={12} weight="bold" className="shrink-0 opacity-75" aria-hidden />
          ) : (
            esArrastrable && (
              <DotsSixVerticalIcon
                size={13}
                className=" hidden shrink-0 opacity-45 transition-opacity group-hover/barra:opacity-90 sm:inline"
                aria-hidden
              />
            )
          )}

          {conflicto ? (
            <span className="shrink-0" aria-hidden>
              {esBloqueante ? (
                <ProhibitIcon size={14} weight="bold" className="text-danger" />
              ) : (
                <WarningIcon size={14} weight="bold" className="text-warn" />
              )}
            </span>
          ) : (
            <Icono size={14} weight="bold" className="shrink-0 opacity-85" aria-hidden />
          )}

          {anchoVisible >= 64 && (
            <span className="truncate font-mono tabular text-[11px] font-semibold tracking-tight">
              {reserva.codigo}
            </span>
          )}

          {anchoVisible >= 165 && clienteNombre && (
            <span className="truncate text-[11px] font-normal opacity-85">
              · {clienteNombre}
            </span>
          )}
        </div>

        {/* Importe estimado en pastilla legible cuando hay suficiente anchura */}
        {anchoVisible >= 235 && (
          <div className="mr-2 shrink-0 rounded bg-panel/80 px-1.5 py-0.5 text-[10px] font-semibold text-ink ring-1 ring-line/70">
            <Monto centavos={reserva.montoEstimado} entero classNameBs="hidden 2xl:inline text-[9.5px]" />
          </div>
        )}

        {/* Tirador de redimensionado derecho */}
        {permiteRedimensionarDer && (
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              onIniciarArrastre(e, reserva, 'redimensionar-der');
            }}
            className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize rounded-r-md transition-colors hover:bg-ink/15"
            title="Arrastrar para ajustar fin"
          />
        )}
      </div>
    </Tooltip>
  );
});
