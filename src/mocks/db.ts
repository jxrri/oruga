/** Base local de la API simulada: arranca vacía (solo catálogos) y persiste en IndexedDB. */
import { del, get, set } from 'idb-keyval';
import type { InstanteUTC } from '@/api/contrato';
import { generarBaseVacia, type Semilla } from './seed';

export type Db = Semilla & { secuencia: number };

const CLAVE_DATOS_IDB = 'oruga.datos';

type DatosGuardados = Pick<
  Db,
  | 'activos'
  | 'clientes'
  | 'reservas'
  | 'ordenes'
  | 'inspecciones'
  | 'historialReservas'
  | 'historialEstados'
  | 'obras'
  | 'plantillas'
  | 'secuencia'
>;

export const db = {} as Db;

export function reiniciarDb(hoy?: InstanteUTC): Db {
  Object.assign(db, generarBaseVacia(hoy), { secuencia: 10_000 });
  return db;
}

reiniciarDb();

/** Recupera de IndexedDB los registros creados por el usuario; si no hay nada guardado, queda vacía. */
export async function cargarDb(): Promise<void> {
  try {
    const guardado = (await get(CLAVE_DATOS_IDB)) as Partial<DatosGuardados> | undefined;
    if (!guardado || typeof guardado !== 'object') return;
    if (Array.isArray(guardado.activos)) db.activos = guardado.activos;
    if (Array.isArray(guardado.clientes)) db.clientes = guardado.clientes;
    if (Array.isArray(guardado.reservas)) db.reservas = guardado.reservas;
    if (Array.isArray(guardado.ordenes)) db.ordenes = guardado.ordenes;
    if (Array.isArray(guardado.inspecciones)) db.inspecciones = guardado.inspecciones;
    if (Array.isArray(guardado.historialReservas)) db.historialReservas = guardado.historialReservas;
    if (Array.isArray(guardado.historialEstados)) db.historialEstados = guardado.historialEstados;
    if (guardado.obras && typeof guardado.obras === 'object') db.obras = guardado.obras;
    if (Array.isArray(guardado.plantillas) && guardado.plantillas.length) db.plantillas = guardado.plantillas;
    if (typeof guardado.secuencia === 'number' && Number.isFinite(guardado.secuencia)) db.secuencia = guardado.secuencia;
  } catch {
    /* sin IndexedDB (tests o modo privado): los datos viven solo en memoria */
  }
}

/** Persiste en IndexedDB los cambios operativos realizados por el usuario. */
export async function guardarDb(): Promise<void> {
  const snapshot: DatosGuardados = {
    activos: db.activos,
    clientes: db.clientes,
    reservas: db.reservas,
    ordenes: db.ordenes,
    inspecciones: db.inspecciones,
    historialReservas: db.historialReservas,
    historialEstados: db.historialEstados,
    obras: db.obras,
    plantillas: db.plantillas,
    secuencia: db.secuencia,
  };
  try {
    await set(CLAVE_DATOS_IDB, snapshot);
  } catch {
    /* sin IndexedDB: continúa en memoria */
  }
}

/** Borra toda la flota, clientes, reservas, órdenes e inspecciones, tanto en memoria como en IndexedDB. */
export async function vaciarDb(hoy?: InstanteUTC): Promise<Db> {
  reiniciarDb(hoy);
  try {
    await del(CLAVE_DATOS_IDB);
  } catch {
    /* sin IndexedDB */
  }
  return db;
}

/** Identificador nuevo y único dentro de la sesión: "res-10001". */
export const nuevoId = (prefijo: string) => `${prefijo}-${++db.secuencia}`;
