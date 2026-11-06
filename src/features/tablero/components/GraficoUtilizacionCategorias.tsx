import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import type { UtilizacionCategoria } from '../useMetricasTablero';

interface GraficoUtilizacionCategoriasProps {
  datos: UtilizacionCategoria[];
}

export function GraficoUtilizacionCategorias({ datos }: GraficoUtilizacionCategoriasProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            unit="%"
            stroke="var(--color-ink-3)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            stroke="var(--color-ink-2)"
            fontSize={11}
            tickLine={false}
            width={110}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const item = payload[0];
              if (!item) return null;
              const d = item.payload as UtilizacionCategoria;
              return (
                <div className="bg-panel border border-line-strong rounded-lg p-2.5 shadow-panel text-xs space-y-1">
                  <p className="font-semibold text-ink">{d.nombre}</p>
                  <p className="text-ink-2">
                    Tasa de ocupación: <span className="font-mono font-bold text-ink">{d.porcentaje} %</span>
                  </p>
                  <p className="text-ink-3 text-[11px]">
                    {d.horasReservadas.toLocaleString('es-VE')} h reservadas / {d.horasDisponibles.toLocaleString('es-VE')} h disponibles
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]}>
            {datos.map((entry) => (
              <Cell
                key={`bar-${entry.categoriaId}`}
                fill={
                  entry.porcentaje >= 75
                    ? '#10b981'
                    : entry.porcentaje >= 50
                      ? '#3b82f6'
                      : entry.porcentaje >= 25
                        ? '#f59e0b'
                        : '#64748b'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
