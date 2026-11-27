import type { Proporcion } from '../useMetricasTablero';
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato';

const RADIO = 38;
const LARGO = 2 * Math.PI * RADIO;

interface AnilloProps {
  etiqueta: string;
  /** La proporción en palabras: "52 de 58 activos" */
  detalle: string;
  porcentaje: number;
  color: string;
}

/** Anillo de porcentaje. El dibujo es decorativo: el valor y su etiqueta van siempre en texto. */
function Anillo({ etiqueta, detalle, porcentaje, color }: AnilloProps) {
  return (
    <li className="flex min-w-0 flex-col items-center text-center">
      <div className="relative size-20 sm:size-24 xl:size-28">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={RADIO} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={12} />
          {porcentaje > 0 && (
            <circle
              cx="50"
              cy="50"
              r={RADIO}
              fill="none"
              stroke={color}
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={`${(porcentaje / 100) * LARGO} ${LARGO}`}
            />
          )}
        </svg>
        <span className="tabular absolute inset-0 grid place-items-center text-base font-semibold text-ink sm:text-lg xl:text-xl">
          {formatearPorcentaje(porcentaje / 100)}
        </span>
      </div>
      <p className="mt-2 text-[13px] font-medium text-ink">{etiqueta}</p>
      <p className="text-xs text-ink-3">{detalle}</p>
    </li>
  );
}

interface AnillosFlotaProps {
  anillos: { utilizacion: Proporcion; operativa: Proporcion; mantenimientoAlDia: Proporcion };
}

const partes = (p: Proporcion, unidad: string) => `${formatearNumero(p.parte)} de ${formatearNumero(p.total)} ${unidad}`;

/** Tres proporciones de la flota, cada una con su parte y su total a la vista. */
export function AnillosFlota({ anillos }: AnillosFlotaProps) {
  return (
    <ul className="grid grid-cols-3 gap-3">
      <Anillo
        etiqueta="Utilización, 30 días"
        detalle={partes(anillos.utilizacion, 'h reservadas')}
        porcentaje={anillos.utilizacion.porcentaje}
        color="var(--serie-azul)"
      />
      <Anillo
        etiqueta="Flota operativa"
        detalle={partes(anillos.operativa, 'activos')}
        porcentaje={anillos.operativa.porcentaje}
        color="var(--serie-verde)"
      />
      <Anillo
        etiqueta="Mantenimiento al día"
        detalle={partes(anillos.mantenimientoAlDia, 'activos')}
        porcentaje={anillos.mantenimientoAlDia.porcentaje}
        color="var(--serie-naranja)"
      />
    </ul>
  );
}
