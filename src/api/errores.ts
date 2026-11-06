/** Normaliza errores de RTK Query (y cargas JSON serializadas) a mensajes para la interfaz (SPEC §11.3). */
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

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const esFetch = (e: unknown): e is FetchBaseQueryError => esObjeto(e) && 'status' in e;

function parsearObjetoJson(valor: unknown): Record<string, unknown> | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  if (!limpio.startsWith('{')) return null;
  try {
    const parsed: unknown = JSON.parse(limpio);
    return esObjeto(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const esErrorVersion = (e: unknown): e is FetchBaseQueryError & { data: ErrorVersion } =>
  esFetch(e) && e.status === 409 && (e.data as ErrorVersion | undefined)?.codigo === 'VERSION';

export const esErrorConflicto = (e: unknown): e is FetchBaseQueryError & { data: ErrorConflicto } =>
  esFetch(e) && e.status === 409 && (e.data as ErrorConflicto | undefined)?.codigo === 'CONFLICTO';

function describirCuerpo(cuerpo: Record<string, unknown>, statusHint?: number): ErrorLegible | null {
  if (cuerpo.codigo === 'PERMISO') {
    const msg =
      typeof cuerpo.mensaje === 'string' && cuerpo.mensaje.trim()
        ? cuerpo.mensaje
        : 'Tu rol no puede hacer esta acción.';
    return { status: 403, titulo: 'Sin permiso', detalle: msg };
  }
  if (cuerpo.codigo === 'VERSION') {
    const msg =
      typeof cuerpo.mensaje === 'string' && cuerpo.mensaje.trim()
        ? cuerpo.mensaje
        : `Se recargó la versión ${String(cuerpo.actual ?? '')}. Revisa los datos y vuelve a intentar.`;
    return { status: 409, titulo: 'Alguien más cambió este registro', detalle: msg };
  }
  if (cuerpo.codigo === 'CONFLICTO') {
    const d = cuerpo as unknown as ErrorConflicto;
    const lista = d.conflictos
      ?.map((c) => `${ETIQUETA_CONFLICTO[c.codigo]}${c.con ? ` (${c.con})` : ''}`)
      .join(', ');
    const msg =
      (typeof d.mensaje === 'string' && d.mensaje.trim() ? d.mensaje : undefined) ??
      lista ??
      'La operación choca con otra.';
    return { status: 409, titulo: 'Hay conflictos', detalle: msg };
  }
  if (Array.isArray(cuerpo.detail)) {
    const d = cuerpo as unknown as ErrorValidacion;
    const campos = Object.fromEntries(
      (d.detail ?? []).map((x) => [String(x.loc[x.loc.length - 1]), x.msg]),
    );
    return {
      status: 422,
      titulo: 'Revisa los datos',
      detalle: d.detail[0]?.msg ?? 'Hay campos inválidos.',
      campos,
    };
  }
  if (typeof cuerpo.mensaje === 'string' && cuerpo.mensaje.trim()) {
    return { status: statusHint ?? 'desconocido', titulo: 'Atención', detalle: cuerpo.mensaje };
  }
  return null;
}

export function describirError(
  e: FetchBaseQueryError | SerializedError | undefined | unknown,
): ErrorLegible {
  if (typeof e === 'string') {
    const json = parsearObjetoJson(e);
    if (json) {
      const desdeJson = describirCuerpo(json);
      if (desdeJson) return desdeJson;
    }
    return { status: 'desconocido', titulo: 'Atención', detalle: e };
  }

  if (!esFetch(e)) {
    if (esObjeto(e)) {
      const directo = describirCuerpo(e);
      if (directo) return directo;
      if (typeof e.message === 'string' && e.message.trim()) {
        const json = parsearObjetoJson(e.message);
        if (json) {
          const desdeMsg = describirCuerpo(json);
          if (desdeMsg) return desdeMsg;
        }
        return { status: 'desconocido', titulo: 'Atención', detalle: e.message };
      }
    }
    return {
      status: 'desconocido',
      titulo: 'Algo salió mal',
      detalle: 'Vuelve a intentarlo en unos segundos.',
    };
  }

  if (e.status === 'FETCH_ERROR' || e.status === 'TIMEOUT_ERROR') {
    return {
      status: 'red',
      titulo: 'Sin conexión con el servidor',
      detalle: 'Revisa tu conexión y reintenta.',
    };
  }

  if (e.status === 'PARSING_ERROR') {
    const json = parsearObjetoJson(e.data);
    if (json) {
      const desdeParsing = describirCuerpo(json, e.originalStatus);
      if (desdeParsing) return desdeParsing;
    }
    return {
      status: e.originalStatus,
      titulo: 'Respuesta inesperada',
      detalle: 'El servidor respondió algo que no se pudo leer.',
    };
  }

  if (typeof e.status !== 'number') {
    return {
      status: 'desconocido',
      titulo: 'Respuesta inesperada',
      detalle: 'El servidor respondió algo que no se pudo leer.',
    };
  }

  const dataObjeto = esObjeto(e.data) ? e.data : parsearObjetoJson(e.data);
  if (dataObjeto) {
    const desdeData = describirCuerpo(dataObjeto, e.status);
    if (desdeData) {
      return { ...desdeData, status: e.status };
    }
  }

  switch (e.status) {
    case 403:
      return {
        status: 403,
        titulo: 'Sin permiso',
        detalle: (e.data as ErrorPermiso)?.mensaje ?? 'Tu rol no puede hacer esta acción.',
      };
    case 409:
      return { status: 409, titulo: 'Hay conflictos', detalle: 'La operación choca con otra.' };
    case 422:
      return { status: 422, titulo: 'Revisa los datos', detalle: 'Hay campos inválidos.' };
    case 404:
      return {
        status: 404,
        titulo: 'No encontrado',
        detalle: 'El registro no existe o fue eliminado.',
      };
    default:
      return {
        status: e.status,
        titulo: 'Error del servidor',
        detalle: `El servidor respondió ${e.status}. Reintenta.`,
      };
  }
}
