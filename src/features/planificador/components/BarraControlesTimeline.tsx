import {
  ArrowCounterClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ProhibitIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Sede, ZonaIANA } from '@/api/contrato';
import { cn } from '@/shared/lib/cn';
import { ahora, desdeMs, formatear, inicioDelDia, sumarDias } from '@/shared/lib/fechas';
import { Badge, Button, IconButton, SegmentedControl, Tooltip } from '@/shared/ui';
import { Input } from '@/shared/ui/Field';
import type { Agrupacion, Zoom } from '../vistaSlice';

export type FiltroRapidoTimeline = 'todos' | 'disponibles' | 'en_alquiler' | 'conflictos' | 'mantenimiento';

export interface ConteosFiltroTimeline {
  todos: number;
  disponibles: number;
  en_alquiler: number;
  conflictos: number;
  mantenimiento: number;
}

export interface BarraControlesTimelineProps {
  zoom: Zoom;
  onCambioZoom: (zoom: Zoom) => void;
  inicioVista: string;
  finVistaMs: number;
  onDesplazarVista: (nuevoInicio: string) => void;
  agrupar: Agrupacion;
  onCambioAgrupacion: (agrup: Agrupacion) => void;
  zonaActiva: ZonaIANA;
  sedes?: Sede[];
  totalConflictos: number;
  /** Cuántos de los conflictos abiertos bloquean: solo ellos tiñen el contador de rojo */
  conflictosBloqueantes?: number;
  panelConflictosAbierto: boolean;
  onAlternarPanelConflictos: () => void;
  onNuevaReserva?: () => void;
  busqueda: string;
  onCambioBusqueda: (texto: string) => void;
  filtroRapido: FiltroRapidoTimeline;
  onCambioFiltroRapido: (filtro: FiltroRapidoTimeline) => void;
  conteos: ConteosFiltroTimeline;
  onDeshacer?: () => void;
  puedeDeshacer?: boolean;
  filtrosActivosCount?: number;
  onAbrirFiltros?: () => void;
}

export function BarraControlesTimeline({
  zoom,
  onCambioZoom,
  inicioVista,
  finVistaMs,
  onDesplazarVista,
  agrupar,
  onCambioAgrupacion,
  zonaActiva,
  totalConflictos,
  conflictosBloqueantes = 0,
  panelConflictosAbierto,
  onAlternarPanelConflictos,
  onNuevaReserva,
  busqueda,
  onCambioBusqueda,
  filtroRapido,
  onCambioFiltroRapido,
  conteos,
  onDeshacer,
  puedeDeshacer,
  filtrosActivosCount = 0,
  onAbrirFiltros,
}: BarraControlesTimelineProps) {
  const pasoDias = zoom === 'dia' ? 1 : zoom === 'semana' ? 7 : 30;

  const retroceder = () => {
    onDesplazarVista(sumarDias(inicioVista, -pasoDias, zonaActiva));
  };

  const avanzar = () => {
    onDesplazarVista(sumarDias(inicioVista, pasoDias, zonaActiva));
  };

  const irAHoy = () => {
    const hoyBase = inicioDelDia(ahora(), zonaActiva);
    const offsetDias = zoom === 'dia' ? 0 : zoom === 'semana' ? -2 : -7;
    onDesplazarVista(sumarDias(hoyBase, offsetDias, zonaActiva));
  };

  const inicioTxt = formatear(inicioVista, zonaActiva, 'dd MMM');
  const finTxt = formatear(desdeMs(Math.max(finVistaMs - 1, 0)), zonaActiva, 'dd MMM yyyy');

  const chipsFiltro: Array<{ id: FiltroRapidoTimeline; etiqueta: string; cantidad: number }> = [
    { id: 'todos', etiqueta: 'Todos', cantidad: conteos.todos },
    { id: 'disponibles', etiqueta: 'Disponibles', cantidad: conteos.disponibles },
    { id: 'en_alquiler', etiqueta: 'En alquiler', cantidad: conteos.en_alquiler },
    { id: 'conflictos', etiqueta: 'Con conflicto', cantidad: conteos.conflictos },
    { id: 'mantenimiento', etiqueta: 'Taller / FDS', cantidad: conteos.mantenimiento },
  ];

  const hayFiltroActivo = busqueda.trim().length > 0 || filtroRapido !== 'todos';

  // El contador solo va en rojo si algún conflicto bloquea; los avisos van en naranja
  const tonoConflictos = conflictosBloqueantes > 0 ? 'danger' : totalConflictos > 0 ? 'warn' : 'neutro';
  const iconoConflictos =
    conflictosBloqueantes > 0 ? ProhibitIcon : totalConflictos > 0 ? WarningIcon : undefined;

  return (
    <header className="shrink-0 select-none border-b border-line bg-panel">
      {/* Barra única: navegación y rango a la izquierda, vista y agrupación al centro, acciones a la derecha */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-1">
          <IconButton
            icono={CaretLeftIcon}
            aria-label={`Retroceder ${pasoDias} días`}
            onClick={retroceder}
            tamano="sm"
          />
          <Button variante="secundario" tamano="sm" onClick={irAHoy}>
            Hoy
          </Button>
          <IconButton
            icono={CaretRightIcon}
            aria-label={`Avanzar ${pasoDias} días`}
            onClick={avanzar}
            tamano="sm"
          />
          <p
            className="tabular ml-2 whitespace-nowrap text-[13px] font-medium text-ink"
            title="Ventana temporal visible en el cronograma"
          >
            {inicioTxt} - {finTxt}
          </p>
        </div>

        <div className="flex items-center gap-2 lg:mx-auto">
          <SegmentedControl<Zoom>
            valor={zoom}
            onCambio={onCambioZoom}
            aria-label="Nivel de zoom del timeline"
            tamano="sm"
            opciones={[
              { valor: 'dia', etiqueta: 'Día' },
              { valor: 'semana', etiqueta: 'Semana' },
              { valor: 'mes', etiqueta: 'Mes' },
            ]}
          />

          <div className="hidden md:block">
            <SegmentedControl<Agrupacion>
              valor={agrupar}
              onCambio={onCambioAgrupacion}
              aria-label="Agrupación de activos"
              tamano="sm"
              opciones={[
                { valor: 'sede', etiqueta: 'Sede' },
                { valor: 'categoria', etiqueta: 'Categoría' },
                { valor: 'ninguna', etiqueta: 'Lista' },
              ]}
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {puedeDeshacer && onDeshacer && (
            <Tooltip contenido="Deshacer último movimiento (Ctrl+Z)">
              <Button
                variante="fantasma"
                tamano="sm"
                icono={ArrowCounterClockwiseIcon}
                onClick={onDeshacer}
              >
                Deshacer
              </Button>
            </Tooltip>
          )}

          {onAbrirFiltros && (
            <Button variante="secundario" tamano="sm" icono={FunnelIcon} onClick={onAbrirFiltros}>
              Filtros
              {filtrosActivosCount > 0 && (
                <Badge tono="acento" className="h-5 px-1.5">
                  {filtrosActivosCount}
                </Badge>
              )}
            </Button>
          )}

          {/* Conmutador del inspector: secundario, el estado lo lleva el contador */}
          <Button
            variante="secundario"
            tamano="sm"
            onClick={onAlternarPanelConflictos}
            aria-pressed={panelConflictosAbierto}
            className={cn(panelConflictosAbierto && 'border-line-strong bg-panel-2')}
          >
            Conflictos
            <Badge tono={tonoConflictos} icono={iconoConflictos} className="tabular h-5 px-1.5">
              {totalConflictos}
            </Badge>
          </Button>

          {onNuevaReserva && (
            <Button variante="primario" tamano="sm" icono={PlusIcon} onClick={onNuevaReserva}>
              Nueva reserva
            </Button>
          )}
        </div>
      </div>

      {/* Barra de filtros sin caja: búsqueda y filtro rápido por estado */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 pb-2.5 sm:px-4">
        <div className="relative w-full sm:w-60">
          <Input
            type="text"
            enterKeyHint="search"
            icono={MagnifyingGlassIcon}
            value={busqueda}
            onChange={(e) => onCambioBusqueda(e.target.value)}
            placeholder="Equipo, reserva o cliente…"
            aria-label="Filtrar equipos, reservas o clientes en el timeline"
          />
          {busqueda && (
            <IconButton
              icono={XIcon}
              aria-label="Limpiar búsqueda"
              onClick={() => onCambioBusqueda('')}
              tamano="sm"
              tooltip={false}
              className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
            />
          )}
        </div>

        <div
          className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible"
          role="group"
          aria-label="Filtro rápido de flota"
        >
          {chipsFiltro.map((chip) => {
            const activo = filtroRapido === chip.id;
            const esAlerta = chip.id === 'conflictos' && chip.cantidad > 0;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onCambioFiltroRapido(chip.id)}
                aria-pressed={activo}
                className={cn(
                  'inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium transition-colors duration-150 ease-salida',
                  activo ? 'bg-accent-soft text-accent-fg' : 'text-ink-2 hover:bg-panel-2 hover:text-ink',
                )}
              >
                {esAlerta && <WarningIcon size={14} className="text-danger" aria-hidden />}
                <span>{chip.etiqueta}</span>
                <span className={cn('tabular text-xs', activo ? 'text-accent-fg' : 'text-ink-3')}>
                  {chip.cantidad}
                </span>
              </button>
            );
          })}
        </div>

        {hayFiltroActivo && (
          <Button
            variante="fantasma"
            tamano="sm"
            icono={XIcon}
            className="h-7 px-2"
            onClick={() => {
              onCambioBusqueda('');
              onCambioFiltroRapido('todos');
            }}
          >
            Restablecer vista
          </Button>
        )}
      </div>
    </header>
  );
}
