import { cn } from '@/shared/lib/cn';
import type { ColumnaTiempo, GrupoCabecera } from '../useEscalaTiempo';

export interface CabeceraTimelineProps {
  grupos: GrupoCabecera[];
  columnas: ColumnaTiempo[];
  anchoTotal: number;
  anchoColumnaActivo?: number;
  posXAhora?: number;
  horaAhoraTexto?: string;
}

export function CabeceraTimeline({
  grupos,
  columnas,
  anchoTotal,
  anchoColumnaActivo = 280,
  posXAhora,
  horaAhoraTexto,
}: CabeceraTimelineProps) {
  const mostrarAhora =
    typeof posXAhora === 'number' && posXAhora >= 0 && posXAhora <= anchoTotal;

  return (
    <div className="sticky top-0 z-20 flex border-b border-line bg-panel select-none">
      {/* Esquina superior izquierda fija y 100% opaca */}
      <div
        style={{ width: anchoColumnaActivo }}
        className="sticky left-0 z-30 flex shrink-0 items-end justify-between border-r border-line bg-panel px-3 pb-2.5 text-[13px] text-ink-3"
      >
        <span>Unidad</span>
        <span>Estado</span>
      </div>

      {/* Regla de tiempo horizontal de dos niveles */}
      <div style={{ width: anchoTotal }} className="isolate z-10 relative flex shrink-0 flex-col bg-panel">
        {/* Nivel 1: Agrupación superior (Meses o Días completos) */}
        <div className="relative h-7">
          {grupos.map((g) => (
            <div
              key={g.id}
              style={{ left: g.x, width: g.ancho }}
              className="absolute inset-y-0 flex items-center border-r border-line px-2.5 text-xs font-medium text-ink"
            >
              <span
                style={{ left: anchoColumnaActivo + 10 }}
                className="sticky truncate capitalize"
              >
                {g.titulo}
              </span>
            </div>
          ))}
        </div>

        {/* Nivel 2: Marcas de escala (Días u Horas) */}
        <div className="relative flex h-9 overflow-hidden bg-panel">
          {columnas.map((col) => (
            <div
              key={col.id}
              style={{ left: col.x, width: col.ancho }}
              className={cn(
                'absolute inset-y-0 flex flex-col items-center justify-center border-r border-line/80 font-mono tabular text-[11px] transition-colors',
                col.esHoy
                  ? 'bg-accent-soft text-accent-fg font-medium'
                  : col.esFinDeSemana
                    ? 'bg-panel-2/85 text-ink-3'
                    : 'bg-panel text-ink-2',
              )}
            >
              <span className="leading-tight">{col.etiquetaPrincipal}</span>
              {col.etiquetaSecundaria && (
                <span className={cn('mt-0.5 leading-none', !col.esHoy && 'text-ink-3')}>
                  {col.etiquetaSecundaria}
                </span>
              )}
              {col.esHoy && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-accent" aria-hidden />
              )}
            </div>
          ))}

          {/* Indicador AHORA integrado en la regla para no tapar cabeceras de grupo */}
          {mostrarAhora && (
            <div
              style={{ left: posXAhora }}
              className="pointer-events-none absolute bottom-0 z-20 -translate-x-1/2 flex flex-col items-center"
            >
              <span className="tabular whitespace-nowrap rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-medium leading-none text-canvas">
                Ahora{horaAhoraTexto ? ` ${horaAhoraTexto}` : ''}
              </span>
              <span className="h-1.5 w-0.5 bg-danger" aria-hidden />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
