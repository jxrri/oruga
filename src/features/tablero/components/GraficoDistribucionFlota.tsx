import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { DistribucionEstado } from '../useMetricasTablero';

interface GraficoDistribucionFlotaProps {
  datos: DistribucionEstado[];
}

export function GraficoDistribucionFlota({ datos }: GraficoDistribucionFlotaProps) {
  const total = datos.reduce((acc, curr) => acc + curr.valor, 0);

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="h-48 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={2}
              dataKey="valor"
            >
              {datos.map((entry) => (
                <Cell key={`cell-${entry.clave}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0];
                if (!item) return null;
                const d = item.payload as DistribucionEstado;
                const pct = total > 0 ? Math.round((d.valor / total) * 100) : 0;
                return (
                  <div className="bg-panel border border-line-strong rounded-lg p-2 shadow-panel text-xs space-y-0.5">
                    <p className="font-semibold text-ink">{d.nombre}</p>
                    <p className="text-ink-2">
                      <span className="font-mono font-bold text-ink">{d.valor}</span> unidades ({pct} %)
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Total en el centro del Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold font-mono text-ink">{total}</span>
          <span className="text-[10px] text-ink-3 uppercase tracking-wider font-medium">Activos</span>
        </div>
      </div>

      {/* Leyenda interactiva */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-line">
        {datos.map((d) => (
          <div key={d.clave} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-ink-2 truncate text-[11px]">{d.nombre}</span>
            </div>
            <span className="font-mono font-medium text-ink text-[11px] ml-1">
              {d.valor}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
