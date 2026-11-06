import { useRef, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/shared/lib/cn';
import { formatearNumero } from '@/shared/lib/formato';

gsap.registerPlugin(useGSAP);

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
  const numero = useRef<HTMLSpanElement>(null);
  const previo = useRef(0);
  const escribir = (n: number) => formato(Number.isInteger(valor) ? Math.round(n) : n);

  useGSAP(
    () => {
      const el = numero.current;
      if (!el) return;
      const desde = previo.current;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const estado = { v: desde };
        gsap.to(estado, {
          v: valor,
          duration: 1.1,
          ease: 'power2.out',
          onComplete: () => {
            previo.current = valor;
          },
          onUpdate: () => {
            el.textContent = escribir(estado.v);
          },
        });
        return () => {
          el.textContent = escribir(valor);
        };
      });
      return () => mm.revert();
    },
    { dependencies: [valor], scope: numero, revertOnUpdate: true },
  );

  const cuerpo = (
    <>
      <span className="flex items-center gap-2 text-[13px] text-ink-2">
        {Icono && <Icono size={16} aria-hidden className={TONO_ICONO[tono]} />}
        {etiqueta}
      </span>
      <span className="tabular text-[1.75rem] leading-none font-semibold tracking-tight text-ink">
        <span ref={numero} aria-hidden>
          {escribir(valor)}
        </span>
        <span className="sr-only">{escribir(valor)}</span>
      </span>
      {detalle && <span className="texto-bonito text-[13px] text-ink-3">{detalle}</span>}
    </>
  );
  const clase = cn('flex flex-col gap-2 rounded-xl border border-line bg-panel px-4 py-3.5', className);
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
