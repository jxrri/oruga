import { useEffect, useState } from 'react';

/** Valor con espera: cambia `ms` después del último cambio (búsqueda de 250 ms, SPEC §10). */
export function useDebounce<T>(valor: T, ms = 250): T {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return diferido;
}
