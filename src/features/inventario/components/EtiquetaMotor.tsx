import type { TipoMotor } from '@/api/contrato';

const ETIQUETA: Record<TipoMotor, string> = {
  gasolina: 'Gasolina',
  diesel: 'Diésel',
  electrico: 'Eléctrico',
  hibrido: 'Híbrido',
  gas: 'Gas',
};

/** Nombre legible del tipo de motor (el contrato lo guarda sin tildes) */
export function EtiquetaMotor({ tipo }: { tipo: TipoMotor }) {
  return <>{ETIQUETA[tipo]}</>;
}
