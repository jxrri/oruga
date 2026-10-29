/**
 * Monto estimado (RF-RES-02): la combinación de tarifas por hora, día, semana y mes más conveniente
 * para el cliente. Se resuelve como un problema de cobertura de mínimo costo sobre horas cobradas.
 */
import type { Centavos, Tarifas } from '@/api/contrato';
import { MS_HORA, MS_MINUTO } from '@/shared/lib/fechas';

export interface Desglose {
  meses: number;
  semanas: number;
  dias: number;
  horas: number;
}

export interface Cotizacion {
  total: Centavos;
  horasCobradas: number;
  desglose: Desglose;
}

const UNIDADES: { clave: keyof Desglose; tarifa: keyof Tarifas; horas: number }[] = [
  { clave: 'horas', tarifa: 'hora', horas: 1 },
  { clave: 'dias', tarifa: 'dia', horas: 24 },
  { clave: 'semanas', tarifa: 'semana', horas: 24 * 7 },
  { clave: 'meses', tarifa: 'mes', horas: 24 * 30 },
];

/**
 * @param duracionMs duración real en ms UTC
 * @param toleranciaMin minutos de gracia antes de cobrar una hora más (por defecto 29)
 */
export function cotizar(tarifas: Tarifas, duracionMs: number, toleranciaMin = 29): Cotizacion {
  const horas = Math.max(1, Math.ceil(Math.max(0, duracionMs - toleranciaMin * MS_MINUTO) / MS_HORA));
  const unidades = UNIDADES.filter((u) => tarifas[u.tarifa] !== undefined);

  // costo[x] = mínimo para cubrir al menos x horas
  const costo = new Array<number>(horas + 1).fill(Number.POSITIVE_INFINITY);
  const eleccion = new Array<number>(horas + 1).fill(-1);
  costo[0] = 0;
  for (let x = 1; x <= horas; x++) {
    for (let k = 0; k < unidades.length; k++) {
      const u = unidades[k]!;
      const c = (tarifas[u.tarifa] as number) + costo[Math.max(0, x - u.horas)]!;
      if (c < costo[x]!) {
        costo[x] = c;
        eleccion[x] = k;
      }
    }
  }

  const desglose: Desglose = { meses: 0, semanas: 0, dias: 0, horas: 0 };
  for (let x = horas; x > 0; ) {
    const u = unidades[eleccion[x]!]!;
    desglose[u.clave] += 1;
    x = Math.max(0, x - u.horas);
  }
  return { total: Math.round(costo[horas]!), horasCobradas: horas, desglose };
}

export function describirDesglose(d: Desglose): string {
  const partes: string[] = [];
  if (d.meses) partes.push(`${d.meses} ${d.meses === 1 ? 'mes' : 'meses'}`);
  if (d.semanas) partes.push(`${d.semanas} ${d.semanas === 1 ? 'semana' : 'semanas'}`);
  if (d.dias) partes.push(`${d.dias} ${d.dias === 1 ? 'día' : 'días'}`);
  if (d.horas) partes.push(`${d.horas} ${d.horas === 1 ? 'hora' : 'horas'}`);
  return partes.join(' + ') || '0 horas';
}
