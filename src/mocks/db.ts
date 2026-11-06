/** Base en memoria de la API simulada, construida desde la semilla. `reiniciarDb` vuelve al estado inicial. */
import type { InstanteUTC } from '@/api/contrato';
import { generarSemilla, type Semilla } from './seed';

export type Db = Semilla & { secuencia: number };

export const db = {} as Db;

export function reiniciarDb(hoy?: InstanteUTC): Db {
  Object.assign(db, generarSemilla(hoy), { secuencia: 10_000 });
  return db;
}

reiniciarDb();

/** Identificador nuevo y único dentro de la sesión: "res-10001". */
export const nuevoId = (prefijo: string) => `${prefijo}-${++db.secuencia}`;
