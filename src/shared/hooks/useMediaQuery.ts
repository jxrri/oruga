import { useCallback, useSyncExternalStore } from 'react';

/** Estado de una media query, sincronizado con sus cambios. En entornos sin matchMedia devuelve false. */
export function useMediaQuery(query: string): boolean {
  const suscribir = useCallback(
    (avisar: () => void) => {
      if (typeof matchMedia !== 'function') return () => {};
      const mq = matchMedia(query);
      mq.addEventListener('change', avisar);
      return () => mq.removeEventListener('change', avisar);
    },
    [query],
  );
  return useSyncExternalStore(
    suscribir,
    () => (typeof matchMedia === 'function' ? matchMedia(query).matches : false),
    () => false,
  );
}

export const useMovimientoReducido = () => useMediaQuery('(prefers-reduced-motion: reduce)');
