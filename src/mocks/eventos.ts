/** Bus de eventos de la API simulada. Respeta el interruptor de tiempo real del panel de desarrollo. */
import type { EventoTiempoReal } from '@/api/contrato';
import { leerConfigMock } from './config';

type Oyente = (e: EventoTiempoReal) => void;
const oyentes = new Set<Oyente>();

export const suscribirEventos = (cb: Oyente) => {
  oyentes.add(cb);
  return () => {
    oyentes.delete(cb);
  };
};

export const hayOyentes = () => oyentes.size > 0;

/** Se emite una copia: la caché de RTK Query congela lo que recibe y la base sigue mutando. */
export function emitir(e: EventoTiempoReal): void {
  if (!leerConfigMock().tiempoReal) return;
  const copia = structuredClone(e);
  oyentes.forEach((cb) => cb(copia));
}
