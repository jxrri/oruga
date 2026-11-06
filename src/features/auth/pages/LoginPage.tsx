import { useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { InfoIcon } from '@phosphor-icons/react';
import { MarcaOruga } from '@/app/layout/MarcaOruga';
import { FondoEscena } from '../components/FondoEscena';
import { ListaEntrar } from '../components/ListaEntrar';

gsap.registerPlugin(useGSAP, SplitText);

/** Login simulado (SPEC §14): pantalla dividida con la lista "Entrar como…" y la escena del patio. */
export default function LoginPage() {
  const raiz = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // autoSplit vuelve a partir las líneas cuando cargan las fuentes o cambia el ancho.
        const division = SplitText.create(titulo.current, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, { yPercent: 110, duration: 0.95, ease: 'power4.out', stagger: 0.1, delay: 0.1 }),
        });
        gsap.from('[data-intro]', { opacity: 0, y: 12, duration: 0.7, ease: 'power3.out', stagger: 0.08, delay: 0.3 });
        return () => division.revert();
      });
      return () => mm.revert();
    },
    { scope: raiz },
  );

  return (
    <div className="grid min-h-[100dvh] bg-canvas text-ink lg:grid-cols-[minmax(0,38rem)_minmax(0,1fr)]">
      <div className="relative h-[32vh] min-h-52 lg:order-2 lg:h-auto">
        <FondoEscena />
      </div>

      <div ref={raiz} className="relative flex flex-col px-5 pb-6 pt-2 sm:px-10 lg:order-1 lg:px-14 lg:py-10">
        <header data-intro className="flex items-center gap-2.5 pt-4 lg:pt-0">
          <MarcaOruga className="size-9" />
          <span className="text-[17px] font-semibold tracking-tight">Oruga</span>
        </header>

        <main className="flex max-w-[30rem] flex-1 flex-col justify-center py-6 lg:py-10">
          <h1
            ref={titulo}
            className="texto-balance text-[2.125rem] leading-[1.04] font-semibold tracking-tighter sm:text-[2.5rem] xl:text-[2.75rem]"
          >
            Toda la flota en <span className="text-ink-3">una sola línea de tiempo.</span>
          </h1>
          <p data-intro className="texto-bonito mt-4 max-w-[42ch] text-[15px] text-ink-2">
            Reservas, inspecciones y mantenimiento de vehículos y maquinaria pesada en Maracaibo, Caracas, Valencia y
            Cúcuta.
          </p>

          <section data-intro aria-labelledby="titulo-entrar" className="mt-8">
            <h2 id="titulo-entrar" className="text-[13px] font-medium text-ink-2">
              Entrar como…
            </h2>
            <ListaEntrar />
          </section>
        </main>

        <footer data-intro className="flex max-w-[30rem] items-start gap-2 text-[13px] text-ink-3">
          <InfoIcon size={16} aria-hidden className="mt-px shrink-0" />
          <p className="texto-bonito">
            Demo sin autenticación real: cada perfil abre la aplicación con los permisos de su rol.
          </p>
        </footer>
      </div>
    </div>
  );
}
