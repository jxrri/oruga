import type { ElementType, ReactNode } from 'react';
import { Link } from 'react-router';
import { useConteo } from '@/shared/hooks/useConteo';
import { cn } from '@/shared/lib/cn';
import { formatearNumero } from '@/shared/lib/formato';

const TONO_ICONO = {
  neutro: 'text-ink-3',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  info: 'text-info',
  acento: 'text-accent-fg',
} as const;

export interface StatProps {
  etiqueta: string;
  valor: number;
  /** Cómo se escribe el número (también en cada cuadro del conteo). Por defecto formatearNumero. */
  formato?: (n: number) => string;
  icono?: ElementType;
  /** Color del ícono: solo cuando el KPI comunica un estado real */
  tono?: keyof typeof TONO_ICONO;
  /** Línea secundaria: comparación, unidad, contexto */
  detalle?: ReactNode;
  /** Convierte el KPI en enlace al listado filtrado */
  to?: string;
  className?: string;
}

/** KPI con conteo animado (GSAP, escribe en el DOM sin renders). Con movimiento reducido muestra el valor final. */
export function Stat({ etiqueta, valor, formato = formatearNumero, icono: Icono, tono = 'neutro', detalle, to, className }: StatProps) {
  const numero = useConteo(valor, formato);
  const escribir = (n: number) => formato(Number.isInteger(valor) ? Math.round(n) : n);

  const cuerpo = (
    <>
      <span className="flex items-center gap-2 text-[13px] text-ink-3">
        {Icono && <Icono size={16} aria-hidden className={TONO_ICONO[tono]} />}
        {etiqueta}
      </span>
      <span className="tabular text-2xl leading-none font-semibold tracking-tight text-ink">
        <span ref={numero} aria-hidden>
          {escribir(valor)}
        </span>
        <span className="sr-only">{escribir(valor)}</span>
      </span>
      {detalle && <span className="texto-bonito text-[13px] text-ink-3">{detalle}</span>}
    </>
  );
  const clase = cn('tarjeta flex flex-col gap-2.5 p-5', className);
  return to ? (
    <Link
      to={to}
      className={cn(clase, 'transition-[border-color,transform] duration-150 ease-salida hover:border-line-strong active:scale-[0.99]')}
    >
      {cuerpo}
    </Link>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}
