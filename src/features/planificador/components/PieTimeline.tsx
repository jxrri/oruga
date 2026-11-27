import { CaretDownIcon, GlobeHemisphereWestIcon } from '@phosphor-icons/react';
import type { InstanteUTC, ZonaIANA } from '@/api/contrato';
import { etiquetaDesfase, zonaNavegador } from '@/shared/lib/fechas';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@/shared/ui';
import type { ZonaVisualizacion } from '../vistaSlice';

export interface PieTimelineProps {
  equiposVisibles: number;
  totalEquipos: number;
  inicioVista: InstanteUTC;
  zonaOpcion: ZonaVisualizacion;
  onCambioZonaOpcion: (zona: ZonaVisualizacion) => void;
  zonaActiva: ZonaIANA;
}

const MUESTRA = 'h-2.5 w-3.5 shrink-0 rounded-[3px]';

/** Franja de lectura bajo el cronograma: filas visibles, zona horaria y leyenda de las barras. */
export function PieTimeline({
  equiposVisibles,
  totalEquipos,
  inicioVista,
  zonaOpcion,
  onCambioZonaOpcion,
  zonaActiva,
}: PieTimelineProps) {
  const desfase = etiquetaDesfase(inicioVista, zonaActiva);
  const etiquetaZona =
    zonaOpcion === 'utc' ? 'UTC' : zonaOpcion === 'navegador' ? `Local (${desfase})` : `Sede (${desfase})`;

  return (
    <footer className="flex h-10 shrink-0 select-none items-center justify-between gap-4 border-t border-line bg-panel px-3 text-xs text-ink-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="tabular whitespace-nowrap">
          <span className="font-medium text-ink-2">{equiposVisibles}</span> de {totalEquipos} unidades
        </span>

        <DropdownMenu>
          <Tooltip contenido="Zona horaria de visualización" lado="top">
            <DropdownMenuTrigger asChild>
              <Button
                variante="fantasma"
                tamano="sm"
                icono={GlobeHemisphereWestIcon}
                iconoFin={CaretDownIcon}
                className="tabular h-7 gap-1.5 px-2 text-xs text-ink-3"
              >
                {etiquetaZona}
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent align="start" side="top" className="w-64">
            <DropdownMenuLabel>Zona horaria del cronograma</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={zonaOpcion}
              onValueChange={(v) => onCambioZonaOpcion(v as ZonaVisualizacion)}
            >
              <DropdownMenuRadioItem value="sede">Zona de sede ({desfase})</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="navegador">Navegador ({zonaNavegador()})</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="utc">Tiempo universal UTC (+00:00)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Leyenda: cada estado se distingue por trazo o trama además del color */}
      <ul className="hidden items-center gap-4 lg:flex" aria-label="Leyenda del cronograma">
        <li className="inline-flex items-center gap-1.5">
          <span className={`${MUESTRA} border border-res-en-curso bg-res-en-curso/35`} aria-hidden />
          En curso
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className={`${MUESTRA} border border-res-confirmada bg-res-confirmada/30`} aria-hidden />
          Confirmada
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className={`${MUESTRA} border border-dashed border-res-borrador bg-res-borrador/25`} aria-hidden />
          Borrador
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className={`${MUESTRA} rayado-mnt border border-line-strong`} aria-hidden />
          Taller
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className={`${MUESTRA} trama-buffer`} aria-hidden />
          Preparación
        </li>
      </ul>
    </footer>
  );
}
