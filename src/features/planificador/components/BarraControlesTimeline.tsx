import {
  ArrowCounterClockwiseIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  FunnelIcon,
  GlobeHemisphereWestIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Sede, ZonaIANA } from '@/api/contrato';
import { cn } from '@/shared/lib/cn';
import {
  ahora,
  desdeMs,
  etiquetaDesfase,
  formatear,
  inicioDelDia,
  sumarDias,
  zonaNavegador,
} from '@/shared/lib/fechas';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  SegmentedControl,
  Tooltip,
} from '@/shared/ui';
import type { Agrupacion, ZonaVisualizacion, Zoom } from '../vistaSlice';

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
  zonaOpcion: ZonaVisualizacion;
  onCambioZonaOpcion: (zona: ZonaVisualizacion) => void;
  zonaActiva: ZonaIANA;
  sedes?: Sede[];
  totalConflictos: number;
  panelConflictosAbierto: boolean;
  onAlternarPanelConflictos: () => void;
  onNuevaReserva: () => void;
  busqueda: string;
  onCambioBusqueda: (texto: string) => void;
  filtroRapido: FiltroRapidoTimeline;
  onCambioFiltroRapido: (filtro: FiltroRapidoTimeline) => void;
  conteos: ConteosFiltroTimeline;
  equiposVisibles: number;
  totalEquipos: number;
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
  zonaOpcion,
  onCambioZonaOpcion,
  zonaActiva,
  totalConflictos,
  panelConflictosAbierto,
  onAlternarPanelConflictos,
  onNuevaReserva,
  busqueda,
  onCambioBusqueda,
  filtroRapido,
  onCambioFiltroRapido,
  conteos,
  equiposVisibles,
  totalEquipos,
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

  const etiquetaZonaCorta =
    zonaOpcion === 'utc'
      ? 'UTC (+00:00)'
      : zonaOpcion === 'navegador'
        ? `Local (${etiquetaDesfase(inicioVista, zonaActiva)})`
        : `Sede (${etiquetaDesfase(inicioVista, zonaActiva)})`;

  const chipsFiltro: Array<{ id: FiltroRapidoTimeline; etiqueta: string; cantidad: number }> = [
    { id: 'todos', etiqueta: 'Todos', cantidad: conteos.todos },
    { id: 'disponibles', etiqueta: 'Disponibles', cantidad: conteos.disponibles },
    { id: 'en_alquiler', etiqueta: 'En alquiler', cantidad: conteos.en_alquiler },
    { id: 'conflictos', etiqueta: 'Con conflicto', cantidad: conteos.conflictos },
    { id: 'mantenimiento', etiqueta: 'Taller / FDS', cantidad: conteos.mantenimiento },
  ];

  const hayFiltroActivo = busqueda.trim().length > 0 || filtroRapido !== 'todos';

  return (
    <header className="shrink-0 bg-panel border-b border-line select-none">
      {/* Nivel 1: Navegación temporal, búsqueda, controles de escala y acciones primarias */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5">
        {/* Bloque izquierdo: Navegación temporal + ventana visible + búsqueda rápida */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-line bg-panel-2 p-0.5">
            <IconButton
              icono={CaretLeftIcon}
              aria-label={`Retroceder ${pasoDias} días`}
              onClick={retroceder}
              tamano="sm"
              variante="fantasma"
              className="size-7"
            />
            <button
              type="button"
              onClick={irAHoy}
              className="h-7 rounded-md px-2.5 font-mono text-xs font-semibold text-ink transition-colors hover:bg-panel active:scale-[0.98]"
            >
              Hoy
            </button>
            <IconButton
              icono={CaretRightIcon}
              aria-label={`Avanzar ${pasoDias} días`}
              onClick={avanzar}
              tamano="sm"
              variante="fantasma"
              className="size-7"
            />
          </div>

          <div
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 text-xs text-ink"
            title="Ventana temporal visible en el cronograma"
          >
            <CalendarBlankIcon size={15} className="text-accent-fg shrink-0" aria-hidden />
            <span className="font-mono tabular font-medium">
              {inicioTxt} - {finTxt}
            </span>
          </div>

          {/* Buscador rápido de unidades, reservas o clientes */}
          <div className="relative flex items-center">
            <MagnifyingGlassIcon
              size={15}
              className="pointer-events-none absolute left-2.5 text-ink-3"
              aria-hidden
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => onCambioBusqueda(e.target.value)}
              placeholder="Equipo, reserva o cliente…"
              aria-label="Filtrar equipos, reservas o clientes en el timeline"
              className="h-8 w-44 sm:w-52 rounded-lg border border-line bg-panel-2 pl-8 pr-7 text-xs text-ink placeholder:text-ink-3 transition-colors focus:border-line-strong focus:bg-panel focus:outline-none"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => onCambioBusqueda('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-1.5 grid size-5 place-items-center rounded text-ink-3 hover:bg-panel hover:text-ink"
              >
                <XIcon size={12} aria-hidden />
              </button>
            )}
          </div>

          {puedeDeshacer && onDeshacer && (
            <Tooltip contenido="Deshacer último movimiento (Ctrl+Z)">
              <Button
                variante="secundario"
                tamano="sm"
                icono={ArrowCounterClockwiseIcon}
                onClick={onDeshacer}
              >
                Deshacer
              </Button>
            </Tooltip>
          )}
        </div>

        {/* Bloque derecho: Escala, agrupación, huso horario, conflictos y CTA */}
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Selector de zona horaria con menú del sistema de diseño */}
          <DropdownMenu>
            <Tooltip contenido="Zona horaria de visualización">
              <DropdownMenuTrigger asChild>
                <Button
                  variante="secundario"
                  tamano="sm"
                  icono={GlobeHemisphereWestIcon}
                  iconoFin={CaretDownIcon}
                  className="font-mono tabular text-xs"
                >
                  <span className="hidden xl:inline">{etiquetaZonaCorta}</span>
                  <span className="xl:hidden">{etiquetaDesfase(inicioVista, zonaActiva)}</span>
                </Button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Zona horaria del cronograma</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={zonaOpcion}
                onValueChange={(v) => onCambioZonaOpcion(v as ZonaVisualizacion)}
              >
                <DropdownMenuRadioItem value="sede">
                  Zona de sede ({etiquetaDesfase(inicioVista, zonaActiva)})
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="navegador">
                  Navegador ({zonaNavegador()})
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="utc">
                  Tiempo universal UTC (+00:00)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {onAbrirFiltros && (
            <Button
              variante={filtrosActivosCount > 0 ? 'primario' : 'secundario'}
              tamano="sm"
              icono={FunnelIcon}
              onClick={onAbrirFiltros}
            >
              Filtros {filtrosActivosCount > 0 && `(${filtrosActivosCount})`}
            </Button>
          )}

          {/* Conmutador del inspector de conflictos (sin animaciones infinitas) */}
          <button
            type="button"
            onClick={onAlternarPanelConflictos}
            aria-pressed={panelConflictosAbierto}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors active:scale-[0.98]',
              totalConflictos > 0
                ? panelConflictosAbierto
                  ? 'border-danger bg-danger text-white shadow-xs'
                  : 'border-danger/45 bg-danger-soft text-danger hover:border-danger'
                : panelConflictosAbierto
                  ? 'border-line-strong bg-panel-2 text-ink'
                  : 'border-line bg-panel text-ink-2 hover:bg-panel-2 hover:text-ink',
            )}
          >
            {totalConflictos > 0 ? (
              <WarningIcon size={15} weight="bold" aria-hidden />
            ) : (
              <CheckCircleIcon size={15} className="text-ok" aria-hidden />
            )}
            <span>Conflictos</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 font-mono tabular text-[10.5px] font-semibold leading-none',
                totalConflictos > 0
                  ? panelConflictosAbierto
                    ? 'bg-white/20 text-white'
                    : 'bg-danger/15 text-danger'
                  : 'bg-panel-2 text-ink-3',
              )}
            >
              {totalConflictos}
            </span>
          </button>

          <Button
            variante="primario"
            tamano="sm"
            icono={PlusIcon}
            onClick={onNuevaReserva}
          >
            Nueva reserva
          </Button>
        </div>
      </div>

      {/* Nivel 2: Filtros operativos rápidos + micro-leyenda instrumental */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-panel-2 px-3.5 py-1.5 text-xs">
        {/* Píldoras de filtrado rápido */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtro rápido de flota">
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
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  activo
                    ? 'border-ink bg-ink text-panel'
                    : esAlerta
                      ? 'border-danger/35 bg-danger-soft text-danger hover:border-danger/60'
                      : 'border-line bg-panel text-ink-2 hover:border-line-strong hover:text-ink',
                )}
              >
                <span>{chip.etiqueta}</span>
                <span
                  className={cn(
                    'font-mono tabular text-[10px]',
                    activo ? 'opacity-80' : esAlerta ? 'text-danger font-semibold' : 'text-ink-3',
                  )}
                >
                  {chip.cantidad}
                </span>
              </button>
            );
          })}

          {hayFiltroActivo && (
            <button
              type="button"
              onClick={() => {
                onCambioBusqueda('');
                onCambioFiltroRapido('todos');
              }}
              className="ml-1 inline-flex items-center gap-1 text-[11px] font-medium text-accent-fg hover:underline"
            >
              <XIcon size={12} aria-hidden />
              Restablecer vista
            </button>
          )}
        </div>

        {/* Telemetría de filas visibles + leyenda compacta */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-2">
          <span className="font-mono tabular text-ink-3">
            Mostrando <strong className="font-semibold text-ink">{equiposVisibles}</strong> de {totalEquipos} unidades
          </span>

          <div className="hidden lg:flex items-center gap-3 border-l border-line pl-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] border border-res-en-curso bg-res-en-curso/35" aria-hidden />
              En curso
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] border border-res-confirmada bg-res-confirmada/30" aria-hidden />
              Confirmada
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] border border-dashed border-res-borrador bg-res-borrador/25" aria-hidden />
              Borrador
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="rayado-mnt h-2.5 w-3.5 rounded-[3px] border border-line-strong" aria-hidden />
              Taller
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="trama-buffer h-2.5 w-3.5 rounded-[3px]" aria-hidden />
              Preparación
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
