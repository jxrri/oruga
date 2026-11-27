/** Módulos de la barra lateral. Se filtran con puede(usuario, 'ver', recurso), igual que las rutas. */
import type { Icon } from '@phosphor-icons/react';
import {
  AddressBookIcon,
  BracketsCurlyIcon,
  CalendarCheckIcon,
  ChartBarHorizontalIcon,
  ClipboardTextIcon,
  GaugeIcon,
  MapTrifoldIcon,
  TruckIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import type { Usuario } from '@/api/contrato';
import { puede, type Recurso } from '../permisos';

export interface Modulo {
  ruta: string;
  etiqueta: string;
  icono: Icon;
  recurso: Recurso;
  /** Grupo visual: se separan con una línea, sin rótulos */
  grupo: 'operacion' | 'patio' | 'admin';
}

export const MODULOS: readonly Modulo[] = [
  { ruta: '/tablero', etiqueta: 'Tablero', icono: GaugeIcon, recurso: 'tablero', grupo: 'operacion' },
  { ruta: '/planificador', etiqueta: 'Planificador', icono: ChartBarHorizontalIcon, recurso: 'reserva', grupo: 'operacion' },
  { ruta: '/reservas', etiqueta: 'Reservas', icono: CalendarCheckIcon, recurso: 'reserva', grupo: 'operacion' },
  { ruta: '/inventario', etiqueta: 'Inventario', icono: TruckIcon, recurso: 'activo', grupo: 'operacion' },
  { ruta: '/inspecciones', etiqueta: 'Inspecciones', icono: ClipboardTextIcon, recurso: 'inspeccion', grupo: 'patio' },
  { ruta: '/mantenimiento', etiqueta: 'Mantenimiento', icono: WrenchIcon, recurso: 'orden', grupo: 'patio' },
  { ruta: '/clientes', etiqueta: 'Clientes', icono: AddressBookIcon, recurso: 'cliente', grupo: 'patio' },
  { ruta: '/ubicacion', etiqueta: 'Ubicación', icono: MapTrifoldIcon, recurso: 'ubicacion', grupo: 'patio' },
  { ruta: '/admin/plantillas', etiqueta: 'Plantillas', icono: BracketsCurlyIcon, recurso: 'plantilla', grupo: 'admin' },
];

export const modulosVisibles = (usuario: Pick<Usuario, 'rol'> | null) =>
  MODULOS.filter((m) => puede(usuario, 'ver', m.recurso));

/** Primer módulo que el rol puede abrir: destino tras el login cuando no hay ?volver. */
export const rutaInicial = (usuario: Pick<Usuario, 'rol'> | null) => modulosVisibles(usuario)[0]?.ruta ?? '/tablero';

export const moduloDeRuta = (pathname: string) =>
  MODULOS.find((m) => pathname === m.ruta || pathname.startsWith(`${m.ruta}/`)) ?? null;

/** Destino de login que recuerda adónde volver. */
export const destinoLogin = (pathname: string, search = '') => `/login?volver=${encodeURIComponent(pathname + search)}`;

/**
 * Solo rutas internas: evita redirecciones abiertas con ?volver=//otro-sitio. También se rechazan la barra
 * invertida y los caracteres de control, que el navegador normaliza a '//' al resolver la URL.
 */
export const volverSeguro = (valor: string | null): string | null =>
  valor && /^\/(?![/\\])[^\\\p{Cc}]*$/u.test(valor) && !valor.startsWith('/login') ? valor : null;
