import type { Centavos } from '@/api/contrato';
import { useGetTasaCambioQuery } from '@/api/baseApi';
import { useAppSelector } from '@/app/hooks';
import { cn } from '@/shared/lib/cn';
import { formatearCivil } from '@/shared/lib/fechas';
import { formatearBs, formatearMonto, formatearNumero } from '@/shared/lib/formato';

export interface MontoProps {
  centavos: Centavos;
  /** Sin decimales: "$1.250" */
  entero?: boolean;
  /** "linea": Bs al lado; "apilado": Bs debajo (celdas angostas, tarjetas) */
  disposicion?: 'linea' | 'apilado';
  className?: string;
  classNameBs?: string;
}

/**
 * Monto en USD desde centavos; con el interruptor "Bs" de la cabecera agrega el equivalente en bolívares
 * con la tasa del día (SPEC §14). La tasa solo se pide cuando hace falta.
 */
export function Monto({ centavos, entero, disposicion = 'linea', className, classNameBs }: MontoProps) {
  const mostrarBs = useAppSelector((s) => s.ui.mostrarBs);
  const { data: tasa } = useGetTasaCambioQuery(undefined, { skip: !mostrarBs });
  const apilado = disposicion === 'apilado';
  return (
    <span className={cn('tabular whitespace-nowrap', apilado ? 'inline-flex flex-col leading-tight' : 'inline', className)}>
      <span>{formatearMonto(centavos, { entero })}</span>
      {mostrarBs && tasa && (
        <span
          className={cn('text-[0.85em] text-ink-3', !apilado && 'ml-1.5', classNameBs)}
          title={`Tasa ${formatearNumero(tasa.valor)} Bs por USD del ${formatearCivil(tasa.fecha)} (${tasa.fuente})`}
        >
          ≈ {formatearBs(centavos, tasa.valor)}
        </span>
      )}
    </span>
  );
}
