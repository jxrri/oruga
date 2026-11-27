import { createBrowserRouter, Navigate } from 'react-router';
import type { Recurso } from './permisos';
import AppLayout from './AppLayout';
import ErrorDeModulo from './ErrorDeModulo';
import RutaProtegida from './RutaProtegida';
import { useUsuario } from './hooks';
import { MarcaOruga } from './layout/MarcaOruga';
import { rutaInicial } from './layout/navegacion';

type Modulo = { default: React.ComponentType };

/** Cada rol aterriza en su primer módulo permitido (el inspector no ve el tablero). */
function IndiceInicial() {
  return <Navigate to={rutaInicial(useUsuario())} replace />;
}

/** Lo que se ve mientras baja el módulo de la ruta inicial, en lugar de una página en blanco. */
function Arranque() {
  return (
    <div role="status" aria-label="Cargando Oruga" className="grid min-h-[100dvh] place-items-center bg-canvas">
      <MarcaOruga className="size-12 animate-pulse rounded-xl" />
    </div>
  );
}

/** Ruta perezosa con su propio Error Boundary (SPEC §12.2) y control de permiso por recurso. */
const ruta = (path: string, cargar: () => Promise<Modulo>, recurso: Recurso) => ({
  path,
  ErrorBoundary: ErrorDeModulo,
  lazy: async () => {
    const { default: Pagina } = await cargar();
    return {
      Component: () => (
        <RutaProtegida recurso={recurso}>
          <Pagina />
        </RutaProtegida>
      ),
    };
  },
});

export const router = createBrowserRouter(
  [
    {
      // Login y registro comparten marco: la escena 3D no se vuelve a crear al pasar de uno a otro.
      HydrateFallback: Arranque,
      lazy: async () => ({ Component: (await import('@/features/auth/components/MarcoAuth')).MarcoAuth }),
      children: [
        { path: '/login', lazy: async () => ({ Component: (await import('@/features/auth/pages/LoginPage')).default }) },
        { path: '/registro', lazy: async () => ({ Component: (await import('@/features/auth/pages/RegistroPage')).default }) },
      ],
    },
    {
      path: '/',
      Component: AppLayout,
      HydrateFallback: Arranque,
      ErrorBoundary: ErrorDeModulo,
      children: [
        { index: true, Component: IndiceInicial },
        ruta('tablero', () => import('@/features/tablero/pages/TableroPage'), 'tablero'),
        ruta('planificador', () => import('@/features/planificador/pages/PlanificadorPage'), 'reserva'),
        ruta('inventario', () => import('@/features/inventario/pages/InventarioPage'), 'activo'),
        ruta('inventario/:id', () => import('@/features/inventario/pages/ActivoPage'), 'activo'),
        ruta('reservas', () => import('@/features/reservas/pages/ReservasPage'), 'reserva'),
        ruta('reservas/nueva', () => import('@/features/reservas/pages/ReservaNuevaPage'), 'reserva'),
        ruta('reservas/:id', () => import('@/features/reservas/pages/ReservaPage'), 'reserva'),
        ruta('inspecciones', () => import('@/features/inspecciones/pages/InspeccionesPage'), 'inspeccion'),
        ruta('inspecciones/nueva', () => import('@/features/inspecciones/pages/InspeccionNuevaPage'), 'inspeccion'),
        ruta('inspecciones/comparar/:reservaId', () => import('@/features/inspecciones/pages/ComparacionPage'), 'inspeccion'),
        ruta('inspecciones/:id', () => import('@/features/inspecciones/pages/InspeccionPage'), 'inspeccion'),
        ruta('mantenimiento', () => import('@/features/mantenimiento/pages/MantenimientoPage'), 'orden'),
        ruta('clientes', () => import('@/features/clientes/pages/ClientesPage'), 'cliente'),
        ruta('clientes/:id', () => import('@/features/clientes/pages/ClientePage'), 'cliente'),
        ruta('ubicacion', () => import('@/features/ubicacion/pages/UbicacionPage'), 'ubicacion'),
        ruta('admin/plantillas', () => import('@/features/inspecciones/pages/PlantillasPage'), 'plantilla'),
        ruta('creditos', () => import('@/features/creditos/CreditosPage'), 'sede'),
        { path: '*', lazy: async () => ({ Component: (await import('./pages/NoEncontradoPage')).default }) },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);
