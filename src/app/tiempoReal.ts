// Marcador temporal: lo reemplaza el puente de eventos en tiempo real (tarea T3).
import type { AppStore } from './store';

export function iniciarTiempoReal(_store: AppStore): () => void {
  return () => {};
}
