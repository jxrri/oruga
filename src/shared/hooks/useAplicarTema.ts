import { useLayoutEffect } from 'react';
import { useAppSelector } from '@/app/hooks';
import { useMediaQuery } from './useMediaQuery';

export type TemaResuelto = 'oscuro' | 'claro';

/** Tema efectivo: la preferencia del usuario o, en "sistema", la del sistema operativo (escucha cambios). */
export function useTemaResuelto(): TemaResuelto {
  const tema = useAppSelector((s) => s.ui.tema);
  const sistemaOscuro = useMediaQuery('(prefers-color-scheme: dark)');
  if (tema === 'sistema') return sistemaOscuro ? 'oscuro' : 'claro';
  return tema;
}

/** Aplica el tema a <html data-tema> y a meta[name=theme-color] (el color sale del token --canvas). */
export function useAplicarTema(): TemaResuelto {
  const resuelto = useTemaResuelto();
  useLayoutEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.tema = resuelto;
    const canvas = getComputedStyle(raiz).getPropertyValue('--canvas').trim();
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    if (canvas) meta.content = canvas;
  }, [resuelto]);
  return resuelto;
}
