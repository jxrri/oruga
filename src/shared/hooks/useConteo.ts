import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/**
 * Conteo animado de un número (GSAP, escribe en el DOM sin renders). Parte del último valor mostrado.
 * Con movimiento reducido no anima: queda el valor final que ya pinta React.
 *
 *   const ref = useConteo(valor, formatearNumero);
 *   <span ref={ref} aria-hidden>{formatearNumero(valor)}</span>
 *   <span className="sr-only">{formatearNumero(valor)}</span>
 */
export function useConteo<T extends HTMLElement = HTMLSpanElement>(valor: number, formato: (n: number) => string) {
  const ref = useRef<T>(null);
  const previo = useRef(0);
  const escribir = (n: number) => formato(Number.isInteger(valor) ? Math.round(n) : n);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const desde = previo.current;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const estado = { v: desde };
        gsap.to(estado, {
          v: valor,
          duration: 1.1,
          ease: 'power2.out',
          onComplete: () => {
            previo.current = valor;
          },
          onUpdate: () => {
            el.textContent = escribir(estado.v);
          },
        });
        return () => {
          el.textContent = escribir(valor);
        };
      });
      return () => mm.revert();
    },
    { dependencies: [valor], scope: ref, revertOnUpdate: true },
  );

  return ref;
}
