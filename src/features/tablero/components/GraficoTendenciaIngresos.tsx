import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { IngresoPeriodo } from '../useMetricasTablero';

interface GraficoTendenciaIngresosProps {
  datos: IngresoPeriodo[];
}

export function GraficoTendenciaIngresos({ datos }: GraficoTendenciaIngresosProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={datos}
          margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#facc15" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#facc15" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="periodo"
            stroke="var(--color-ink-3)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="var(--color-ink-3)"
            fontSize={11}
            tickLine={false}
            tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const item = payload[0];
              if (!item) return null;
              const d = item.payload as IngresoPeriodo;
              return (
                <div className="bg-panel border border-line-strong rounded-lg p-2.5 shadow-panel text-xs space-y-1">
                  <p className="font-semibold text-ink">{d.periodo}</p>
                  <p className="text-ink-2">
                    Ingresos estimados:{' '}
                    <span className="font-mono font-bold text-accent-fg">
                      ${d.montoUsd.toLocaleString('es-VE')} USD
                    </span>
                  </p>
                  <p className="text-ink-3 text-[11px]">
                    {d.reservasCount} reservas computadas en el período
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="montoUsd"
            stroke="#facc15"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorIngresos)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
