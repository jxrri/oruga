import { useRef, type DependencyList } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/**
 * Entrada de página: los hijos con `data-entrada` aparecen en escalera (50 ms, 0,45 s, power3.out).
 * Con movimiento reducido no se anima nada. Pasar `dependencias` (por ejemplo [isLoading]) para
 * repetirla cuando el contenido real reemplaza a los esqueletos.
 *
 *   const ref = useEntrada<HTMLDivElement>([isLoading]);
 *   <div ref={ref}><EncabezadoPagina … /><section data-entrada>…</section></div>
 */
export function useEntrada<T extends HTMLElement = HTMLDivElement>(dependencias: DependencyList = []) {
  const ref = useRef<T>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const piezas = ref.current?.querySelectorAll('[data-entrada]');
        if (!piezas?.length) return;
        gsap.from(piezas, { opacity: 0, y: 8, duration: 0.45, ease: 'power3.out', stagger: 0.05, clearProps: 'opacity,transform' });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [...dependencias], revertOnUpdate: true },
  );
  return ref;
}
