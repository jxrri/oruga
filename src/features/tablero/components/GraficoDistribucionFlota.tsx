import { TruckIcon } from '@phosphor-icons/react';
import type { DistribucionEstado } from '../useMetricasTablero';
import { FilaBarra } from './FilaBarra';
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato';
import { EmptyState } from '@/shared/ui';

interface GraficoDistribucionFlotaProps {
  datos: DistribucionEstado[];
}

/** Cuántos activos hay en cada estado visible, sobre el total de la flota. */
export function GraficoDistribucionFlota({ datos }: GraficoDistribucionFlotaProps) {
  const total = datos.reduce((acc, d) => acc + d.valor, 0);

  if (total === 0) {
    return (
      <EmptyState
        icono={TruckIcon}
        titulo="Aún no hay activos"
        descripcion="Registra activos en el inventario para ver aquí su estado."
        className="py-8"
      />
    );
  }

  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="tabular text-2xl font-semibold tracking-tight text-ink">{formatearNumero(total)}</span>
        <span className="text-[13px] text-ink-3">activos en la flota</span>
      </p>
      <ul className="mt-5 space-y-3">
        {datos.map((d) => (
          <FilaBarra
            key={d.clave}
            etiqueta={d.nombre}
            valor={formatearNumero(d.valor)}
            detalle={formatearPorcentaje(Math.round((d.valor / total) * 100) / 100)}
            fraccion={d.valor / total}
            color="var(--serie-azul)"
          />
        ))}
      </ul>
    </>
  );
}
