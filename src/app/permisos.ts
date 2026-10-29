/** Permisos por rol (SPEC §2). Una sola función decide; la UI oculta o deshabilita y los mocks responden 403. */
import type { Rol, Usuario } from '@/api/contrato';

export type Recurso =
  | 'activo'
  | 'reserva'
  | 'inspeccion'
  | 'orden'
  | 'plan'
  | 'cliente'
  | 'plantilla'
  | 'tablero'
  | 'ubicacion'
  | 'sede'
  | 'usuario';

export type Accion =
  | 'ver'
  | 'crear'
  | 'editar'
  | 'mover'
  | 'cambiar_estado'
  | 'confirmar'
  | 'entregar'
  | 'devolver'
  | 'cancelar'
  | 'configurar';

type Matriz = Partial<Record<Recurso, readonly Accion[] | 'todo'>>;

const SOLO_VER: readonly Accion[] = ['ver'];

const MATRIZ: Record<Rol, Matriz | 'todo'> = {
  admin: 'todo',
  planificador: {
    reserva: 'todo',
    activo: SOLO_VER,
    cliente: ['ver', 'crear', 'editar'],
    inspeccion: SOLO_VER,
    orden: SOLO_VER,
    plan: SOLO_VER,
    tablero: SOLO_VER,
    ubicacion: SOLO_VER,
    sede: SOLO_VER,
  },
  inspector: {
    inspeccion: ['ver', 'crear'],
    // El inspector entrega y recibe en el patio tras su inspección.
    reserva: ['ver', 'entregar', 'devolver'],
    activo: SOLO_VER,
    orden: SOLO_VER,
    cliente: SOLO_VER,
    ubicacion: SOLO_VER,
    sede: SOLO_VER,
  },
  mantenimiento: {
    orden: 'todo',
    plan: 'todo',
    activo: ['ver', 'cambiar_estado'],
    inspeccion: SOLO_VER,
    reserva: SOLO_VER,
    tablero: SOLO_VER,
    ubicacion: SOLO_VER,
    sede: SOLO_VER,
  },
  gerente: {
    activo: SOLO_VER,
    reserva: SOLO_VER,
    inspeccion: SOLO_VER,
    orden: SOLO_VER,
    plan: SOLO_VER,
    cliente: SOLO_VER,
    tablero: SOLO_VER,
    ubicacion: SOLO_VER,
    sede: SOLO_VER,
    plantilla: SOLO_VER,
  },
};

export function puede(usuario: Pick<Usuario, 'rol'> | null | undefined, accion: Accion, recurso: Recurso): boolean {
  if (!usuario) return false;
  const m = MATRIZ[usuario.rol];
  if (m === 'todo') return true;
  const r = m[recurso];
  return r === 'todo' || (r?.includes(accion) ?? false);
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  planificador: 'Planificador',
  inspector: 'Inspector de patio',
  mantenimiento: 'Jefe de mantenimiento',
  gerente: 'Gerente',
};
