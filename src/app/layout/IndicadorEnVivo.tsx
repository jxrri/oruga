import { useSyncExternalStore } from 'react';
import type { TipoEvento } from '@/api/contrato';
import { leerConfigMock, suscribirConfigMock } from '@/mocks/config';
import { cn } from '@/shared/lib/cn';
import { formatear } from '@/shared/lib/fechas';
import { useEventosRecientes } from '../eventosRecientes';

const ETIQUETA_EVENTO: Record<TipoEvento, string> = {
  'reserva.actualizada': 'Reserva actualizada',
  'activo.estado': 'Estado de activo',
  'activo.posicion': 'Posición de activo',
  'orden.actualizada': 'Orden actualizada',
};

const ESTADOS = {
  vivo: { texto: 'En vivo', punto: 'bg-ok', anillo: 'bg-ok' },
  pausado: { texto: 'Pausado', punto: 'bg-ink-3', anillo: 'bg-ink-3' },
  sin_senal: { texto: 'Sin señal', punto: 'bg-warn', anillo: 'bg-warn' },
} as const;

/**
 * Estado real del canal de eventos (el punto comunica estado, no decora). Cada evento nuevo
 * dispara un destello único; el lector de pantalla solo oye los cambios de estado.
 */
export function IndicadorEnVivo() {
  const { ultimo, total, conectado } = useEventosRecientes();
  const config = useSyncExternalStore(suscribirConfigMock, leerConfigMock);
  const clave = !config.tiempoReal ? 'pausado' : conectado ? 'vivo' : 'sin_senal';
  const e = ESTADOS[clave];
  const detalle = ultimo
    ? `Último evento: ${ETIQUETA_EVENTO[ultimo.tipo]} a las ${formatear(ultimo.en, 'America/Caracas', 'HH:mm:ss')}`
    : 'Sin eventos todavía';

  return (
    <p
      className="flex h-8 items-center gap-2 rounded-full border border-line px-2.5 text-xs font-medium text-ink-2"
      title={`${e.texto}. ${detalle}. ${total} eventos recibidos.`}
    >
      <span className="relative grid size-2 place-items-center" aria-hidden>
        {clave === 'vivo' && total > 0 && (
          <span
            key={total}
            className={cn('absolute inset-0 rounded-full opacity-0', e.anillo, 'animate-[destello_1s_var(--ease-salida)]')}
          />
        )}
        <span className={cn('size-2 rounded-full', e.punto)} />
      </span>
      <span role="status" className="hidden sm:inline">
        {e.texto}
      </span>
      <span className="sr-only sm:hidden">{e.texto}</span>
    </p>
  );
}
