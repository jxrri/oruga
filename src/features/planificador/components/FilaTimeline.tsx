import React from 'react';
import { ProhibitIcon, WrenchIcon } from '@phosphor-icons/react';
import type {
  Activo,
  Categoria,
  Conflicto,
  ID,
  OrdenMantenimiento,
  Reserva,
  ZonaIANA,
} from '@/api/contrato';
import { estadoVisible } from '@/domain/estadoActivo';
import { cn } from '@/shared/lib/cn';
import { aMs, MS_MINUTO } from '@/shared/lib/fechas';
import { hashTexto, srcCategoria } from '@/shared/lib/imagenes';
import { Avatar, Tooltip } from '@/shared/ui';
import { EstadoActivoBadge } from '@/shared/ui/dominio';
import type { ColumnaTiempo } from '../useEscalaTiempo';
import { BarraReserva } from './BarraReserva';

export interface FilaTimelineProps {
  activo: Activo;
  categoria: Categoria;
  reservas: Reserva[];
  ordenes: OrdenMantenimiento[];
  columnas: ColumnaTiempo[];
  anchoTotal: number;
  anchoColumnaActivo?: number;
  msAX: (ms: number) => number;
  xAMs: (x: number) => number;
  conflictosPorReserva: Map<ID, Conflicto>;
  mapaNombresCliente?: Map<ID, string>;
  zona?: ZonaIANA;
  reservaEnfocadaId: ID | null;
  esDestinoArrastre?: boolean;
  ahoraMs: number;
  posXAhora?: number;
  onSeleccionarReserva: (reserva: Reserva) => void;
  onIniciarArrastre: (
    e: React.PointerEvent,
    reserva: Reserva,
    modo: 'mover' | 'redimensionar-izq' | 'redimensionar-der',
  ) => void;
  onCrearEnRango?: (activoId: ID, inicioMs: number, finMs: number) => void;
  onVerFichaActivo?: (activoId: ID) => void;
}

export const FilaTimeline = React.memo(function FilaTimeline({
  activo,
  categoria,
  reservas,
  ordenes,
  columnas,
  anchoTotal,
  anchoColumnaActivo = 280,
  msAX,
  xAMs,
  conflictosPorReserva,
  mapaNombresCliente,
  zona = 'America/Caracas',
  reservaEnfocadaId,
  esDestinoArrastre = false,
  ahoraMs,
  posXAhora,
  onSeleccionarReserva,
  onIniciarArrastre,
  onCrearEnRango,
  onVerFichaActivo,
}: FilaTimelineProps) {
  const estVis = estadoVisible(activo, reservas, ahoraMs);
  const imagenUrl = srcCategoria(categoria.slug, hashTexto(activo.id), 'sm');
  const bufferMs = categoria.bufferPreparacionMin * MS_MINUTO;

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onCrearEnRango) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickMs = xAMs(clickX);
    onCrearEnRango(activo.id, clickMs, clickMs + 24 * 3600_000);
  };

  return (
    <div
      className={cn(
        'group/fila relative flex h-[52px] border-b border-line transition-colors',
        esDestinoArrastre && 'ring-1 ring-inset ring-accent',
      )}
    >
      {/* Celda izquierda fija 100% opaca: Ficha instrumental de la unidad */}
      <div
        role="button"
        tabIndex={0}
        style={{ width: anchoColumnaActivo }}
        onClick={() => onVerFichaActivo?.(activo.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onVerFichaActivo?.(activo.id);
          }
        }}
        className={cn(
          'sticky left-0 z-10 flex h-full shrink-0 cursor-pointer items-center justify-between gap-2 border-r border-line bg-panel px-3 transition-colors group-hover/fila:bg-panel-2 shadow-[4px_0_12px_-8px_var(--sombra)]',
          esDestinoArrastre && 'bg-accent-soft',
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {imagenUrl ? (
            <img
              src={imagenUrl}
              alt={`${categoria.nombre} ${activo.marca} ${activo.modelo}`}
              width={36}
              height={36}
              loading="lazy"
              decoding="async"
              className="size-9 shrink-0 rounded-lg border border-line bg-panel-2 object-cover"
            />
          ) : (
            <Avatar nombre={activo.codigo} tamano="sm" />
          )}

          <div className="min-w-0 text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-ink transition-colors group-hover/fila:text-accent-fg">
                {activo.codigo}
              </span>
              <span className="truncate font-mono tabular text-[10.5px] text-ink-3">
                {activo.capacidad}&nbsp;{categoria.unidadCapacidad}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-ink-2">
              {activo.marca} {activo.modelo}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <EstadoActivoBadge estado={estVis} className="px-2 py-0.5 text-[10.5px]" />
        </div>
      </div>

      {/* Pista horizontal con contención CSS y recorte estricto para evitar desbordes sobre la columna fija */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Pista de programación para ${activo.codigo}. Clic en tramo libre para crear reserva`}
        style={{ width: anchoTotal }}
        onClick={handleTrackClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onCrearEnRango) {
            e.preventDefault();
            onCrearEnRango(activo.id, ahoraMs, ahoraMs + 24 * 3600_000);
          }
        }}
        className={cn(
          'pista-timeline-contain isolate z-0 relative flex h-full shrink-0 overflow-hidden bg-panel transition-colors group-hover/fila:bg-panel-2/40 cursor-cell',
          esDestinoArrastre && 'bg-accent-soft/35',
        )}
      >
        {/* Guías verticales y sombreado de hoy / fin de semana */}
        {columnas.map((col) => (
          <div
            key={col.id}
            style={{ left: col.x, width: col.ancho }}
            className={cn(
              'pointer-events-none absolute inset-y-0 border-r border-line/70',
              col.esHoy ? 'bg-accent-soft/45' : col.esFinDeSemana ? 'bg-panel-2/80' : '',
            )}
          />
        ))}

        {/* Trama cruzada reglamentaria cuando el activo no está operativo */}
        {activo.estadoOperativo !== 'operativo' && (
          <div
            style={{ width: anchoTotal }}
            className="trama-fds pointer-events-none absolute inset-y-1.5 inset-x-0 z-[4] flex items-center border-y border-line-strong px-4"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-panel px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-ink-2 shadow-xs">
              {activo.estadoOperativo === 'en_mantenimiento' ? (
                <WrenchIcon size={13} className="text-mnt" aria-hidden />
              ) : (
                <ProhibitIcon size={13} className="text-danger" aria-hidden />
              )}
              {activo.estadoOperativo === 'en_mantenimiento'
                ? 'Unidad en taller'
                : 'Unidad fuera de servicio'}
            </span>
          </div>
        )}

        {/* Órdenes de mantenimiento programadas (.rayado-mnt) */}
        {ordenes.map((orden) => {
          const oIni = aMs(orden.inicio);
          const oFin = aMs(orden.finEstimado);
          const x = msAX(oIni);
          const ancho = Math.max(msAX(oFin) - x, 32);
          const offsetTxt = x < 0 ? Math.min(-x, Math.max(ancho - 48, 0)) : 0;

          return (
            <Tooltip
              key={orden.id}
              lado="top"
              contenido={
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink capitalize">
                    Mantenimiento {orden.tipo}
                  </div>
                  <div className="text-[11px] text-ink-2">{orden.descripcion}</div>
                </div>
              }
            >
              <button
                type="button"
                style={{
                  transform: `translate3d(${x}px, 0, 0)`,
                  width: ancho,
                  paddingLeft: offsetTxt > 0 ? offsetTxt + 8 : undefined,
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Mantenimiento ${orden.tipo}: ${orden.descripcion}`}
                className="rayado-mnt absolute top-[9px] z-[6] flex h-[34px] items-center gap-1.5 overflow-hidden rounded-md border border-line-strong bg-panel px-2 text-left font-mono text-[11px] font-medium text-ink-2 shadow-xs"
              >
                <WrenchIcon size={14} weight="bold" className="shrink-0 text-mnt" aria-hidden />
                {ancho + Math.min(x, 0) > 76 && (
                  <span className="truncate capitalize">{orden.tipo}</span>
                )}
              </button>
            </Tooltip>
          );
        })}

        {/* Margen técnico de preparación / limpieza (.trama-buffer) */}
        {bufferMs > 0 &&
          reservas.map((res) => {
            if (res.estado === 'cancelada') return null;
            const rIni = aMs(res.inicio);
            const rFin = aMs(res.fin);
            const x = msAX(rIni - bufferMs);
            const ancho = msAX(rFin + bufferMs) - x;

            return (
              <div
                key={`buf-${res.id}`}
                style={{
                  transform: `translate3d(${x}px, 0, 0)`,
                  width: Math.max(ancho, 12),
                }}
                className="trama-buffer pointer-events-none absolute top-[12px] z-[3] h-[28px] rounded-md"
              />
            );
          })}

        {/* Línea vertical del instante actual confinada al contexto de apilamiento de la pista */}
        {typeof posXAhora === 'number' && posXAhora >= 0 && posXAhora <= anchoTotal && (
          <div
            style={{ left: posXAhora }}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-[15] w-[1.5px] bg-danger/75"
          />
        )}

        {/* Cápsulas de reservas */}
        {reservas.map((reserva) => {
          if (reserva.estado === 'cancelada') return null;
          const rIni = aMs(reserva.inicio);
          const rFin = aMs(reserva.fin);
          const x = msAX(rIni);
          const ancho = msAX(rFin) - x;

          return (
            <BarraReserva
              key={reserva.id}
              reserva={reserva}
              clienteNombre={mapaNombresCliente?.get(reserva.clienteId)}
              zona={zona}
              x={x}
              ancho={ancho}
              conflicto={conflictosPorReserva.get(reserva.id)}
              estaEnfocada={reservaEnfocadaId === reserva.id}
              onSeleccionar={onSeleccionarReserva}
              onIniciarArrastre={onIniciarArrastre}
            />
          );
        })}
      </div>
    </div>
  );
});
