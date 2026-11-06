import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { useTemaResuelto } from '@/shared/hooks/useAplicarTema';
import { useMovimientoReducido } from '@/shared/hooks/useMediaQuery';
import { cn } from '@/shared/lib/cn';
import { escenas, srcEscena } from '@/shared/lib/imagenes';

// three.js solo se descarga si hay WebGL y movimiento permitido (docs/DISENO.md).
const EscenaTerreno = lazy(() => import('./EscenaTerreno'));

const hayWebGL = () => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
};

/** Si la escena falla al crear el contexto o al cargar, queda el póster. */
class Barrera extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  render() {
    return this.state.fallo ? null : this.props.children;
  }
}

function Poster({ oculto }: { oculto: boolean }) {
  const foto = escenas('hero')[0];
  return (
    <div aria-hidden={!foto} className={cn('absolute inset-0 transition-opacity duration-700', oculto && 'opacity-0')}>
      {foto ? (
        <img
          src={srcEscena(foto, 'lg')}
          alt={foto.alt}
          width={foto.ancho}
          height={foto.alto}
          decoding="async"
          fetchPriority="high"
          className="size-full object-cover opacity-70 grayscale-[35%] dark:opacity-55"
        />
      ) : (
        <div className="poster-topografico size-full" />
      )}
    </div>
  );
}

/** Lado visual del login: terreno 3D con balizas o, sin WebGL / con movimiento reducido, un póster estático. */
export function FondoEscena({ className }: { className?: string }) {
  const reducido = useMovimientoReducido();
  const tema = useTemaResuelto();
  const [webgl] = useState(hayWebGL);
  const [lista, setLista] = useState(false);
  const usar3D = webgl && !reducido;

  return (
    <div className={cn('absolute inset-0 overflow-hidden bg-canvas', className)}>
      <Poster oculto={usar3D && lista} />
      {usar3D && (
        <Barrera>
          <Suspense fallback={null}>
            <div
              aria-hidden
              className={cn('absolute inset-0 transition-opacity duration-1000 ease-salida', lista ? 'opacity-100' : 'opacity-0')}
            >
              <EscenaTerreno tema={tema} alListo={() => setLista(true)} />
            </div>
          </Suspense>
        </Barrera>
      )}
      {/* Fundido hacia el lado del contenido: abajo en móvil, a la izquierda en escritorio */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-transparent lg:bg-gradient-to-r lg:via-transparent"
      />
    </div>
  );
}
