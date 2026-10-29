/** Normaliza errores de RTK Query a mensajes para la interfaz (SPEC §11.3). */
import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { ErrorConflicto, ErrorPermiso, ErrorValidacion, ErrorVersion } from './contrato';
import { ETIQUETA_CONFLICTO } from '@/domain/conflictos';

export interface ErrorLegible {
  status: number | 'red' | 'desconocido';
  titulo: string;
  detalle: string;
  /** Errores por campo (422) */
  campos?: Record<string, string>;
}

const esFetch = (e: unknown): e is FetchBaseQueryError => typeof e === 'object' && e !== null && 'status' in e;

export const esErrorVersion = (e: unknown): e is FetchBaseQueryError & { data: ErrorVersion } =>
  esFetch(e) && e.status === 409 && (e.data as ErrorVersion | undefined)?.codigo === 'VERSION';

export const esErrorConflicto = (e: unknown): e is FetchBaseQueryError & { data: ErrorConflicto } =>
  esFetch(e) && e.status === 409 && (e.data as ErrorConflicto | undefined)?.codigo === 'CONFLICTO';

export function describirError(e: FetchBaseQueryError | SerializedError | undefined | unknown): ErrorLegible {
  if (!esFetch(e)) return { status: 'desconocido', titulo: 'Algo salió mal', detalle: 'Vuelve a intentarlo en unos segundos.' };
  if (e.status === 'FETCH_ERROR' || e.status === 'TIMEOUT_ERROR')
    return { status: 'red', titulo: 'Sin conexión con el servidor', detalle: 'Revisa tu conexión y reintenta.' };
  if (typeof e.status !== 'number')
    return { status: 'desconocido', titulo: 'Respuesta inesperada', detalle: 'El servidor respondió algo que no se pudo leer.' };

  switch (e.status) {
    case 403:
      return { status: 403, titulo: 'Sin permiso', detalle: (e.data as ErrorPermiso)?.mensaje ?? 'Tu rol no puede hacer esta acción.' };
    case 409: {
      if (esErrorVersion(e))
        return {
          status: 409,
          titulo: 'Alguien más cambió este registro',
          detalle: `Se recargó la versión ${e.data.actual}. Revisa los datos y vuelve a intentar.`,
        };
      const d = e.data as ErrorConflicto;
      const lista = d?.conflictos?.map((c) => `${ETIQUETA_CONFLICTO[c.codigo]}${c.con ? ` (${c.con})` : ''}`).join(', ');
      return { status: 409, titulo: 'Hay conflictos', detalle: d?.mensaje ?? lista ?? 'La operación choca con otra.' };
    }
    case 422: {
      const d = e.data as ErrorValidacion;
      const campos = Object.fromEntries((d?.detail ?? []).map((x) => [String(x.loc[x.loc.length - 1]), x.msg]));
      return { status: 422, titulo: 'Revisa los datos', detalle: d?.detail?.[0]?.msg ?? 'Hay campos inválidos.', campos };
    }
    case 404:
      return { status: 404, titulo: 'No encontrado', detalle: 'El registro no existe o fue eliminado.' };
    default:
      return { status: e.status, titulo: 'Error del servidor', detalle: `El servidor respondió ${e.status}. Reintenta.` };
  }
}
