/**
 * Puente de eventos en tiempo real hacia la caché de RTK Query (SPEC §6.3). Sin VITE_API_URL usa la fuente
 * simulada; con backend, un WebSocket a `${VITE_API_URL}/eventos` con el mismo manejador.
 */
import type { EventoTiempoReal, ID, InstanteUTC } from '@/api/contrato';
import { api } from '@/api/baseApi';
import { aMs } from '@/shared/lib/fechas';
import { marcarConexion, registrarEvento } from './eventosRecientes';
import type { AppStore } from './store';

interface FuenteEventos {
  suscribir(cb: (e: EventoTiempoReal) => void, alConectar?: (conectado: boolean) => void): () => void;
}

const cruza = (inicio: InstanteUTC, fin: InstanteUTC, desde?: InstanteUTC, hasta?: InstanteUTC) =>
  (!desde || aMs(fin) > aMs(desde)) && (!hasta || aMs(inicio) < aMs(hasta));

function reemplazar<T extends { id: ID }>(lista: T[], x: T, insertar: boolean): void {
  const i = lista.findIndex((y) => y.id === x.id);
  if (i >= 0) lista[i] = x;
  else if (insertar) lista.push(x);
}

export function aplicarEvento(store: AppStore, e: EventoTiempoReal): void {
  const estado = store.getState();
  const { util } = api;
  switch (e.tipo) {
    case 'reserva.actualizada': {
      const r = e.datos;
      for (const a of util.selectCachedArgsForQuery(estado, 'getReservas')) {
        const entra = cruza(r.inicio, r.fin, a.desde, a.hasta) && (!a.activoIds?.length || (!!r.activoId && a.activoIds.includes(r.activoId)));
        store.dispatch(util.updateQueryData('getReservas', a, (l) => reemplazar(l, r, entra)));
      }
      store.dispatch(util.updateQueryData('getReserva', r.id, () => r));
      break;
    }
    case 'activo.estado':
    case 'activo.posicion': {
      const cambios = e.tipo === 'activo.estado' ? { estadoOperativo: e.datos.estadoOperativo, version: e.datos.version } : { ubicacion: e.datos.ubicacion };
      for (const a of util.selectCachedArgsForQuery(estado, 'getActivos'))
        store.dispatch(
          util.updateQueryData('getActivos', a, (l) => {
            const x = l.find((y) => y.id === e.datos.id);
            if (x) Object.assign(x, cambios);
          }),
        );
      store.dispatch(util.updateQueryData('getActivo', e.datos.id, (d) => void Object.assign(d.activo, cambios)));
      break;
    }
    case 'orden.actualizada': {
      const o = e.datos;
      for (const a of util.selectCachedArgsForQuery(estado, 'getOrdenes')) {
        const q = a ?? {};
        const entra = cruza(o.inicio, o.finEstimado, q.desde, q.hasta) && (!q.activoId || q.activoId === o.activoId);
        store.dispatch(util.updateQueryData('getOrdenes', a, (l) => reemplazar(l, o, entra)));
      }
      break;
    }
  }
  registrarEvento(e);
}

const webSocket = (base: string): FuenteEventos => ({
  suscribir(cb, alConectar) {
    const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/eventos`);
    ws.onopen = () => alConectar?.(true);
    ws.onclose = () => alConectar?.(false);
    ws.onmessage = (m) => cb(JSON.parse(String(m.data)) as EventoTiempoReal);
    return () => ws.close();
  },
});

export function iniciarTiempoReal(store: AppStore): () => void {
  let vivo = true;
  let cancelar = () => {};
  const conectar = (f: FuenteEventos) => {
    if (vivo) cancelar = f.suscribir((e) => aplicarEvento(store, e), marcarConexion);
  };
  const url = import.meta.env.VITE_API_URL as string | undefined;
  if (url) conectar(webSocket(url));
  else void import('@/mocks/tiempoReal').then((m) => conectar(m.fuenteEventos));
  return () => {
    vivo = false;
    cancelar();
  };
}
