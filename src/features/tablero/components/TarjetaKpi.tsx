import { useId, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useConteo } from '@/shared/hooks/useConteo';
import { cn } from '@/shared/lib/cn';
import { formatearNumero } from '@/shared/lib/formato';
import { Skeleton } from '@/shared/ui';

const SERIE = {
  verde: 'var(--serie-verde)',
  azul: 'var(--serie-azul)',
  violeta: 'var(--serie-violeta)',
  naranja: 'var(--serie-naranja)',
} as const;

export interface TarjetaKpiProps {
  etiqueta: string;
  /** Un número se muestra con conteo animado; cualquier otro contenido (un monto con su equivalente en Bs) queda estático */
  valor: ReactNode;
  /** Unidad o contexto de la cifra */
  detalle: string;
  /** Color de la mini gráfica: la cifra va siempre en tinta */
  color: keyof typeof SERIE;
  /** Serie diaria calculada con datos reales */
  serie: readonly number[];
  /** Qué mide la serie y qué días cubre: se lee junto al gráfico */
  etiquetaSerie: string;
  /** Posición de hoy en la serie, donde va el punto. Por defecto, el último día. */
  indiceHoy?: number;
  formatoSerie?: (n: number) => string;
  /** Convierte la tarjeta en enlace al módulo */
  to?: string;
  cargando?: boolean;
}

/** Cifra con conteo. Se monta cuando ya hay dato, así el conteo parte de cero al terminar la carga. */
function Cifra({ valor }: { valor: number }) {
  const ref = useConteo(valor, formatearNumero);
  return (
    <>
      <span ref={ref} aria-hidden>
        {formatearNumero(valor)}
      </span>
      <span className="sr-only">{formatearNumero(valor)}</span>
    </>
  );
}

/** Indicador: etiqueta, cifra, detalle y la evolución diaria debajo, en el color de su serie. */
export function TarjetaKpi({
  etiqueta,
  valor,
  detalle,
  color,
  serie,
  etiquetaSerie,
  indiceHoy = serie.length - 1,
  formatoSerie = formatearNumero,
  to,
  cargando,
}: TarjetaKpiProps) {
  // useId trae caracteres que no sirven dentro de url(#…)
  const idDegradado = `kpi-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const puntos = serie.map((v) => ({ v }));
  const resumen = `${etiquetaSerie}. Mínimo ${formatoSerie(Math.min(...serie))}, máximo ${formatoSerie(Math.max(...serie))}, hoy ${formatoSerie(serie[indiceHoy] ?? 0)}.`;

  const cuerpo = (
    <>
      <p className="text-[13px] text-ink-3">{etiqueta}</p>

      {cargando ? (
        <>
          <Skeleton className="mt-2 h-8 w-24" />
          <Skeleton className="mb-4 mt-1.5 h-4 w-32 max-w-full" />
        </>
      ) : (
        <>
          {/* text-2xl, salvo en tarjetas muy angostas (dos columnas en móvil): ahí sigue al ancho para que un monto no se salga */}
          <p className="tabular mt-2 text-[clamp(1.125rem,13cqw,1.5rem)] font-semibold leading-8 tracking-tight text-ink">
            {typeof valor === 'number' ? <Cifra valor={valor} /> : valor}
          </p>
          <p className="mb-4 mt-0.5 text-[13px] text-ink-3">{detalle}</p>
        </>
      )}

      {cargando ? (
        <Skeleton className="mt-auto h-12 w-full" />
      ) : (
        <div role="img" aria-label={resumen} className="mt-auto h-12 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={puntos} margin={{ top: 6, right: 6, bottom: 2, left: 6 }} accessibilityLayer={false}>
              <defs>
                <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--kpi)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--kpi)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--kpi)"
                strokeWidth={2}
                fill={`url(#${idDegradado})`}
                isAnimationActive={false}
                activeDot={false}
                dot={({ cx, cy, index }) =>
                  index === indiceHoy && cx != null && cy != null ? (
                    <circle key={index} cx={cx} cy={cy} r={3.5} fill="var(--color-panel)" stroke="var(--kpi)" strokeWidth={2} />
                  ) : (
                    <g key={index} />
                  )
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Dos líneas reservadas: así los gráficos quedan a la misma altura en toda la fila */}
      <p className="mt-2 min-h-[2lh] text-xs text-ink-3">{etiquetaSerie}</p>
    </>
  );

  const clase = 'tarjeta @container flex min-w-0 flex-col p-5';
  const estilo = { '--kpi': SERIE[color] } as CSSProperties;
  return to ? (
    <Link
      to={to}
      style={estilo}
      className={cn(clase, 'transition-[border-color,transform] duration-150 ease-salida hover:border-line-strong active:scale-[0.99]')}
    >
      {cuerpo}
    </Link>
  ) : (
    <div style={estilo} className={clase}>
      {cuerpo}
    </div>
  );
}
