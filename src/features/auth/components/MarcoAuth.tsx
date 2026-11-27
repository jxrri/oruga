import { useRef, type ReactNode } from 'react';
import { Navigate, Outlet, useSearchParams } from 'react-router';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { useUsuario } from '@/app/hooks';
import { MarcaOruga } from '@/app/layout/MarcaOruga';
import { rutaInicial, volverSeguro } from '@/app/layout/navegacion';
import { FondoEscena } from './FondoEscena';

gsap.registerPlugin(useGSAP, SplitText);

/**
 * Marco de las pantallas de acceso (login y registro): la escena del patio queda montada al pasar de una a
 * otra. Con sesión abierta lleva a la ruta pedida en `?volver=` o al inicio del rol.
 */
export function MarcoAuth() {
  const usuario = useUsuario();
  const [params] = useSearchParams();
  if (usuario) return <Navigate to={volverSeguro(params.get('volver')) ?? rutaInicial(usuario)} replace />;

  return (
    <div className="grid min-h-[100dvh] bg-canvas text-ink lg:grid-cols-[minmax(0,38rem)_minmax(0,1fr)]">
      <div className="relative h-[24vh] min-h-40 lg:order-2 lg:h-auto">
        <FondoEscena />
      </div>
      <div className="relative flex flex-col px-5 pb-6 pt-2 sm:px-10 lg:order-1 lg:px-14 lg:py-10">
        <header className="flex items-center gap-2.5 pt-4 lg:pt-0">
          <MarcaOruga className="size-9" />
          <span className="text-[17px] font-semibold tracking-tight">Oruga</span>
        </header>
        <Outlet />
      </div>
    </div>
  );
}

interface ContenidoAuthProps {
  titulo: ReactNode;
  bajada: ReactNode;
  children: ReactNode;
  pie?: ReactNode;
}

/** Columna de contenido de una pantalla de acceso, con su entrada animada. */
export function ContenidoAuth({ titulo, bajada, children, pie }: ContenidoAuthProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const refTitulo = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // autoSplit vuelve a partir las líneas cuando cargan las fuentes o cambia el ancho.
        const division = SplitText.create(refTitulo.current, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 0.8, ease: 'power4.out', stagger: 0.08 }),
        });
        gsap.from('[data-intro]', { opacity: 0, y: 12, duration: 0.55, ease: 'power3.out', stagger: 0.06, delay: 0.15 });
        return () => division.revert();
      });
      return () => mm.revert();
    },
    { scope: raiz },
  );

  return (
    <div ref={raiz} className="flex flex-1 flex-col">
      <main className="flex w-full max-w-[30rem] flex-1 flex-col justify-center py-6 lg:py-8">
        <h1
          ref={refTitulo}
          className="texto-balance text-[2rem] leading-[1.05] font-semibold tracking-tighter sm:text-[2.375rem]"
        >
          {titulo}
        </h1>
        <p data-intro className="texto-bonito mt-3 max-w-[44ch] text-[15px] text-ink-2">
          {bajada}
        </p>
        {children}
      </main>
      {pie && (
        <footer data-intro className="flex max-w-[30rem] items-start gap-2 text-[13px] text-ink-3">
          {pie}
        </footer>
      )}
    </div>
  );
}
