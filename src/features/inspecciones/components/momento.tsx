/** Momento de una inspección: etiqueta e ícono compartidos por la lista, el acta y el formulario. */
import type { Icon } from '@phosphor-icons/react';
import { ArrowDownLeftIcon, ArrowUpRightIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react';
import type { MomentoInspeccion } from '@/api/contrato';
import { Badge } from '@/shared/ui';

export const ETIQUETA_MOMENTO: Record<MomentoInspeccion, string> = {
  salida: 'Salida',
  devolucion: 'Devolución',
  rutina: 'Rutina',
};

const ICONO_MOMENTO: Record<MomentoInspeccion, Icon> = {
  salida: ArrowUpRightIcon,
  devolucion: ArrowDownLeftIcon,
  rutina: ArrowsClockwiseIcon,
};

/** El momento no es un estado: va en tono neutro y se distingue por el ícono y el texto. */
export function MomentoBadge({ momento, className }: { momento: MomentoInspeccion; className?: string }) {
  return (
    <Badge icono={ICONO_MOMENTO[momento]} className={className}>
      {ETIQUETA_MOMENTO[momento]}
    </Badge>
  );
}
