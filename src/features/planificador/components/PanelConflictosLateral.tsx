import { useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Activo, ID, Reserva, ZonaIANA } from '@/api/contrato';
import type { ConflictoAbierto } from '@/domain/conflictos';
import { cn } from '@/shared/lib/cn';
import { desdeMs, formatear } from '@/shared/lib/fechas';
import { EmptyState, IconButton, SegmentedControl } from '@/shared/ui';
import { ConflictoBadge } from '@/shared/ui/dominio';

export interface PanelConflictosLateralProps {
  conflictos: ConflictoAbierto[];
  activos: Activo[];
  reservas: Reserva[];
  abierto: boolean;
  onCerrar: () => void;
  onCentrarReserva: (reservaId: ID) => void;
  zona: ZonaIANA;
}

type FiltroSeveridad = 'todos' | 'bloqueante' | 'advertencia';

export function PanelConflictosLateral({
  conflictos,
  activos,
  reservas,
  abierto,
  onCerrar,
  onCentrarReserva,
  zona,
}: PanelConflictosLateralProps) {
  const [filtro, setFiltro] = useState<FiltroSeveridad>('todos');

  const mapaActivos = useMemo(() => new Map(activos.map((a) => [a.id, a])), [activos]);
  const mapaReservas = useMemo(() => new Map(reservas.map((r) => [r.id, r])), [reservas]);

  const totalBloqueantes = useMemo(
    () => conflictos.filter((c) => c.conflicto.severidad === 'bloqueante').length,
    [conflictos],
  );
  const totalAdvertencias = conflictos.length - totalBloqueantes;

  const conflictosFiltrados = useMemo(() => {
    if (filtro === 'todos') return conflictos;
    return conflictos.filter((c) => c.conflicto.severidad === filtro);
  }, [conflictos, filtro]);

  if (!abierto) return null;

  return (
    <aside
      aria-label="Inspector de conflictos de programación"
      className="z-20 flex w-80 sm:w-[332px] shrink-0 flex-col border-l border-line bg-panel select-none"
    >
      {/* Cabecera del inspector */}
      <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'grid size-8 place-items-center rounded-lg border',
              conflictos.length > 0
                ? 'border-danger/30 bg-danger-soft text-danger'
                : 'border-ok/30 bg-ok-soft text-ok',
            )}
          >
            {conflictos.length > 0 ? (
              <WarningIcon size={16} weight="bold" aria-hidden />
            ) : (
              <CheckCircleIcon size={16} weight="bold" aria-hidden />
            )}
          </div>
          <div>
            <h2 className="text-xs font-semibold text-ink">Inspector de conflictos</h2>
            <p className="font-mono tabular text-[10.5px] text-ink-3">
              {conflictos.length === 0
                ? 'Cronograma libre de choques'
                : `${totalBloqueantes} bloqueantes · ${totalAdvertencias} avisos`}
            </p>
          </div>
        </div>

        <IconButton
          icono={XIcon}
          aria-label="Cerrar panel de conflictos"
          onClick={onCerrar}
          tamano="sm"
          variante="fantasma"
        />
      </div>

      {/* Selector por severidad cuando hay conflictos */}
      {conflictos.length > 0 && (
        <div className="border-b border-line bg-panel-2 px-3.5 py-2">
          <SegmentedControl<FiltroSeveridad>
            valor={filtro}
            onCambio={setFiltro}
            aria-label="Filtrar conflictos por severidad"
            tamano="sm"
            className="w-full grid grid-cols-3"
            opciones={[
              { valor: 'todos', etiqueta: `Todos (${conflictos.length})` },
              { valor: 'bloqueante', etiqueta: `Bloq. (${totalBloqueantes})` },
              { valor: 'advertencia', etiqueta: `Avisos (${totalAdvertencias})` },
            ]}
          />
        </div>
      )}

      {/* Listado de hallazgos */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {conflictosFiltrados.length === 0 ? (
          <EmptyState
            icono={CheckCircleIcon}
            titulo={
              conflictos.length === 0
                ? 'Sin conflictos abiertos'
                : 'Sin conflictos en esta categoría'
            }
            descripcion={
              conflictos.length === 0
                ? 'Todas las reservas, márgenes de preparación y órdenes de taller están alineados.'
                : 'Cambie el filtro superior para revisar otros avisos del cronograma.'
            }
            className="py-10"
          />
        ) : (
          conflictosFiltrados.map((item, idx) => {
            const activo = item.activoId ? mapaActivos.get(item.activoId) : undefined;
            const reserva = mapaReservas.get(item.reservaId);
            const esBloqueante = item.conflicto.severidad === 'bloqueante';

            return (
              <div
                key={`${item.reservaId}-${item.conflicto.codigo}-${idx}`}
                role="button"
                tabIndex={0}
                onClick={() => onCentrarReserva(item.reservaId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCentrarReserva(item.reservaId);
                  }
                }}
                className={cn(
                  'group cursor-pointer space-y-2 rounded-xl border border-line border-l-[3px] bg-panel-2/60 p-3 text-left transition-colors hover:border-line-strong hover:bg-panel-2',
                  esBloqueante ? 'border-l-danger' : 'border-l-warn',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-ink">
                    {reserva?.codigo ?? item.reservaId}
                  </span>
                  <ConflictoBadge
                    codigo={item.conflicto.codigo}
                    severidad={item.conflicto.severidad}
                  />
                </div>

                <p className="text-xs leading-snug text-ink-2">
                  {item.conflicto.mensaje}
                </p>

                <div className="flex items-center justify-between border-t border-line pt-2 font-mono tabular text-[10.5px] text-ink-3">
                  <span className="font-medium text-ink-2">
                    {activo?.codigo ?? 'Sin unidad'}
                  </span>
                  <span>
                    {formatear(
                      reserva?.inicio ?? desdeMs(item.inicio),
                      zona,
                      'dd MMM HH:mm',
                    )}
                  </span>
                </div>

                <div className="flex justify-end">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-fg group-hover:underline">
                    Ubicar en cronograma
                    <ArrowRightIcon size={12} aria-hidden />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
