// Registro de eventos en tiempo real para el indicador de la cabecera (lo alimenta app/tiempoReal.ts).
import { useSyncExternalStore } from 'react';
import type { EventoTiempoReal } from '@/api/contrato';

export interface EstadoEventos {
  ultimo: EventoTiempoReal | null;
  total: number;
  conectado: boolean;
}

let estado: EstadoEventos = { ultimo: null, total: 0, conectado: false };
const oyentes = new Set<() => void>();

export const registrarEvento = (e: EventoTiempoReal) => {
  estado = { ultimo: e, total: estado.total + 1, conectado: true };
  oyentes.forEach((f) => f());
};

export const marcarConexion = (conectado: boolean) => {
  estado = { ...estado, conectado };
  oyentes.forEach((f) => f());
};

const suscribir = (f: () => void) => {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
};

export const useEventosRecientes = () => useSyncExternalStore(suscribir, () => estado);
