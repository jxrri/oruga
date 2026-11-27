import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartBarIcon } from '@phosphor-icons/react';
import type { IngresoPeriodo } from '../useMetricasTablero';
import { formatearMonto, pluralizar } from '@/shared/lib/formato';
import { EmptyState } from '@/shared/ui';

// De abajo hacia arriba, en el orden en que avanza una reserva
const SERIES = [
  { clave: 'finalizadas', nombre: 'Finalizadas', color: 'var(--serie-verde)' },
  { clave: 'enCurso', nombre: 'En curso', color: 'var(--serie-naranja)' },
  { clave: 'confirmadas', nombre: 'Confirmadas', color: 'var(--serie-azul)' },
  { clave: 'borradores', nombre: 'Borradores', color: 'var(--serie-violeta)' },
] as const;

const compacto = new Intl.NumberFormat('es-VE', { notation: 'compact', maximumFractionDigits: 1 });
const usd = (n: number) => formatearMonto(n * 100, { entero: true });
const totalDe = (d: IngresoPeriodo) => d.finalizadas + d.enCurso + d.confirmadas + d.borradores;

interface GraficoTendenciaIngresosProps {
  datos: IngresoPeriodo[];
}

/** Barras apiladas: monto estimado por mes de inicio de la reserva, separado por estado. */
export function GraficoTendenciaIngresos({ datos }: GraficoTendenciaIngresosProps) {
  if (datos.length === 0) {
    return (
      <EmptyState
        icono={ChartBarIcon}
        titulo="Sin reservas en el período"
        descripcion="Cuando haya reservas, su monto estimado aparecerá aquí por mes."
        className="py-8"
      />
    );
  }

  return (
    <figure className="min-w-0">
      <figcaption className="sr-only">
        Monto estimado por mes de inicio de la reserva.{' '}
        {datos.map((d) => `${d.periodo}: ${usd(totalDe(d))} en ${pluralizar(d.reservasCount, 'reserva')}.`).join(' ')}
      </figcaption>

      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
        {SERIES.map((s) => (
          <li key={s.clave} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: s.color }} aria-hidden />
            {s.nombre}
          </li>
        ))}
      </ul>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid stroke="var(--color-line)" vertical={false} />
            <XAxis
              dataKey="periodo"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-ink-3)', fontSize: 11 }}
            />
            <YAxis
              width={56}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-ink-3)', fontSize: 11 }}
              tickFormatter={(v: number) => `$${compacto.format(v)}`}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-panel-2)' }}
              content={({ active, payload }) => {
                const d = active ? (payload?.[0]?.payload as IngresoPeriodo | undefined) : undefined;
                if (!d) return null;
                return (
                  <div className="space-y-1 rounded-lg border border-line-strong bg-raised p-2.5 text-xs shadow-flotante">
                    <p className="font-semibold text-ink">{d.periodo}</p>
                    {SERIES.map((s) => (
                      <p key={s.clave} className="flex items-center justify-between gap-4 text-ink-2">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-[2px]" style={{ backgroundColor: s.color }} aria-hidden />
                          {s.nombre}
                        </span>
                        <span className="tabular font-medium text-ink">{usd(d[s.clave])}</span>
                      </p>
                    ))}
                    <p className="flex justify-between gap-4 border-t border-line pt-1 text-ink-2">
                      <span>Total, {pluralizar(d.reservasCount, 'reserva')}</span>
                      <span className="tabular font-semibold text-ink">{usd(totalDe(d))}</span>
                    </p>
                  </div>
                );
              }}
            />
            {SERIES.map((s) => (
              <Bar
                key={s.clave}
                dataKey={s.clave}
                name={s.nombre}
                stackId="monto"
                fill={s.color}
                stroke="var(--color-panel)"
                strokeWidth={1.5}
                radius={3}
                maxBarSize={40}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
