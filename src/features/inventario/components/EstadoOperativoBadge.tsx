import { CheckCircleIcon } from '@phosphor-icons/react';
import type { EstadoOperativo } from '@/api/contrato';
import { Badge } from '@/shared/ui';
import { EstadoActivoBadge } from '@/shared/ui/dominio';

/**
 * Estado operativo registrado en la ficha (no el estado visible derivado de reservas).
 * Salvo "operativo", coincide con un estado visible y reutiliza su badge de dominio.
 */
export function EstadoOperativoBadge({ estado, className }: { estado: EstadoOperativo; className?: string }) {
  if (estado === 'operativo')
    return (
      <Badge tono="ok" icono={CheckCircleIcon} className={className}>
        Operativo
      </Badge>
    );
  return <EstadoActivoBadge estado={estado} className={className} />;
}
