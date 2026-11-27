import { ChartBarHorizontalIcon } from '@phosphor-icons/react';
import type { UtilizacionCategoria } from '../useMetricasTablero';
import { FilaBarra } from './FilaBarra';
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato';
import { EmptyState } from '@/shared/ui';

/** Filas a la vista: las categorías más ocupadas. */
const MAXIMO = 6;

interface GraficoUtilizacionCategoriasProps {
  /** Ordenadas de mayor a menor ocupación */
  datos: UtilizacionCategoria[];
  /** Ocupación de toda la flota, en porcentaje */
  media: number;
}

/** Horas reservadas sobre horas disponibles por categoría en los últimos 30 días. */
export function GraficoUtilizacionCategorias({ datos, media }: GraficoUtilizacionCategoriasProps) {
  if (datos.length === 0) {
    return (
      <EmptyState
        icono={ChartBarHorizontalIcon}
        titulo="Sin categorías"
        descripcion="La ocupación aparece cuando hay categorías con activos."
        className="py-8"
      />
    );
  }

  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="tabular text-2xl font-semibold tracking-tight text-ink">{formatearPorcentaje(media / 100)}</span>
        <span className="text-[13px] text-ink-3">de ocupación en toda la flota</span>
      </p>
      <ul className="mt-5 space-y-3">
        {datos.slice(0, MAXIMO).map((d, i) => (
          <FilaBarra
            key={d.categoriaId}
            etiqueta={d.nombre}
            nota={`${formatearNumero(d.horasReservadas)} de ${formatearNumero(d.horasDisponibles)} h`}
            valor={formatearPorcentaje(d.porcentaje / 100)}
            fraccion={d.porcentaje / 100}
            color="var(--serie-naranja)"
            // La lista va de mayor a menor: la primera fila es la más ocupada y es la única en tono pleno
            tenue={i > 0}
          />
        ))}
      </ul>
      {datos.length > MAXIMO && (
        <p className="mt-4 text-xs text-ink-3">
          Se muestran las {MAXIMO} categorías más ocupadas de {datos.length}.
        </p>
      )}
    </>
  );
}
