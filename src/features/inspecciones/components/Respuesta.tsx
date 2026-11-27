import { XCircleIcon } from '@phosphor-icons/react';
import type { CampoPlantilla } from '@/api/contrato';
import { estaVacia } from '@/domain/inspeccion';
import { cn } from '@/shared/lib/cn';
import { formatearNumero, pluralizar } from '@/shared/lib/formato';

/** Texto de una respuesta ya diligenciada. Las preguntas de sí o no se leen tal cual: la falla la decide la plantilla. */
function textoRespuesta(campo: CampoPlantilla, valor: unknown): string {
  if (estaVacia(valor)) return 'Sin dato';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'number') return formatearNumero(valor);
  if (Array.isArray(valor)) return campo.tipo === 'foto' ? pluralizar(valor.length, 'foto') : valor.join(', ');
  return String(valor);
}

/**
 * Valor de un punto de control en modo lectura. Si la respuesta cuenta como falla lleva un ícono
 * además del texto (el color nunca va solo); las lecturas numéricas van en mono.
 */
export function Respuesta({
  campo,
  valor,
  esFalla,
  className,
}: {
  campo: CampoPlantilla;
  valor: unknown;
  esFalla?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        estaVacia(valor) ? 'text-ink-3' : 'text-ink',
        typeof valor === 'number' && 'font-mono tabular',
        className,
      )}
    >
      {esFalla && <XCircleIcon size={16} aria-hidden className="shrink-0 text-danger" />}
      {textoRespuesta(campo, valor)}
      {esFalla && <span className="sr-only">, falla</span>}
    </span>
  );
}
