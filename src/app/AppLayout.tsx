import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigation } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/shared/lib/cn';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { Sheet, SheetContent } from '@/shared/ui/Sheet';
import { useAppSelector, useUsuario } from './hooks';
import { BarraLateral } from './layout/BarraLateral';
import { Cabecera } from './layout/Cabecera';
import { destinoLogin } from './layout/navegacion';
import DevPanel from './DevPanel';

gsap.registerPlugin(useGSAP);

/** Marco de la app: barra lateral (cajón en móvil), cabecera y el módulo activo en <main>. */
export default function AppLayout() {
  const usuario = useUsuario();
  const { pathname, search } = useLocation();
  const navegacion = useNavigation();
  const colapsado = useAppSelector((s) => s.ui.menuColapsado);
  const escritorio = useMediaQuery('(min-width: 1024px)');
  const [menuMovil, setMenuMovil] = useState(false);
  const principal = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  // Entrada corta del módulo al cambiar de ruta; con movimiento reducido no se anima nada.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          principal.current,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'opacity,transform' },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [pathname], scope: principal, revertOnUpdate: true },
  );

  if (!usuario) return <Navigate to={destinoLogin(pathname, search)} replace />;

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <a
        href="#contenido"
        className="sr-only z-60 rounded-lg bg-accent px-3 py-2 font-medium text-accent-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Saltar al contenido
      </a>

      {escritorio && (
        <aside
          className={cn('sticky top-0 z-10 h-[100dvh] border-r border-line bg-panel', colapsado ? 'w-16' : 'w-60')}
          aria-label="Barra lateral"
        >
          <BarraLateral colapsado={colapsado} />
        </aside>
      )}

      {!escritorio && (
        <Sheet open={menuMovil} onOpenChange={setMenuMovil}>
          <SheetContent lado="izquierda" titulo="Menú" ocultarTitulo className="w-72">
            <BarraLateral alNavegar={() => setMenuMovil(false)} />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex min-w-0 flex-col">
        <Cabecera alAbrirMenu={escritorio ? undefined : () => setMenuMovil(true)} />
        {navegacion.state === 'loading' && (
          <div
            role="progressbar"
            aria-label="Cargando módulo"
            className="fixed inset-x-0 top-0 z-60 h-0.5 origin-left animate-[progreso_2.4s_var(--ease-salida)_forwards] bg-accent"
          />
        )}
        <main id="contenido" ref={principal} tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <DevPanel />
    </div>
  );
}
