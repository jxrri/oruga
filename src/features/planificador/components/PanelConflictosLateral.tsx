import { useMemo, useState } from 'react';
import { ArrowRightIcon, CheckCircleIcon, XIcon } from '@phosphor-icons/react';
import type { Activo, ID, Reserva, ZonaIANA } from '@/api/contrato';
import type { ConflictoAbierto } from '@/domain/conflictos';
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
      className="z-20 flex w-[332px] shrink-0 select-none flex-col border-l border-line bg-panel max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:w-[min(20rem,calc(100%-2rem))] max-md:shadow-flotante"
    >
      {/* Cabecera del inspector */}
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">Conflictos</h2>
          <p className="tabular text-[13px] text-ink-3">
            {conflictos.length === 0
              ? 'Cronograma sin choques'
              : `${totalBloqueantes} bloqueantes, ${totalAdvertencias} avisos`}
          </p>
        </div>

        <IconButton
          icono={XIcon}
          aria-label="Cerrar panel de conflictos"
          onClick={onCerrar}
          tamano="sm"
          variante="fantasma"
          className="-mr-1.5"
        />
      </div>

      {/* Selector por severidad cuando hay conflictos */}
      {conflictos.length > 0 && (
        <div className="px-4 pb-3">
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
      <div className="flex-1 divide-y divide-line overflow-y-auto border-t border-line">
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
                className="group cursor-pointer space-y-1.5 px-4 py-3 text-left transition-colors duration-150 ease-salida hover:bg-panel-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[13px] font-medium text-ink">
                    {reserva?.codigo ?? item.reservaId}
                  </span>
                  <ConflictoBadge
                    codigo={item.conflicto.codigo}
                    severidad={item.conflicto.severidad}
                  />
                </div>

                <p className="texto-bonito text-[13px] leading-snug text-ink-2">
                  {item.conflicto.mensaje}
                </p>

                <div className="flex items-center justify-between gap-2 text-xs text-ink-3">
                  <span className="truncate font-mono tabular">
                    {activo?.codigo ?? 'Sin unidad'},{' '}
                    {formatear(
                      reserva?.inicio ?? desdeMs(item.inicio),
                      zona,
                      'dd MMM HH:mm',
                    )}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-medium text-accent-fg group-hover:underline">
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
