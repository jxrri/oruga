import { useId, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { ErrorState } from '@/shared/ui';

/** Carga y error que comparten los bloques del tablero (todos leen las mismas consultas). */
export interface EstadoBloque {
  cargando: boolean;
  error?: unknown;
  onReintentar: () => void;
}

interface TarjetaProps {
  titulo: string;
  descripcion?: ReactNode;
  /** Enlace o dato a la derecha del título */
  accion?: ReactNode;
  estado: EstadoBloque;
  /** Con la forma del contenido final, para que nada salte al cargar */
  esqueleto: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Tarjeta del tablero: título, descripción y cuerpo con sus estados de carga y error. */
export function Tarjeta({ titulo, descripcion, accion, estado, esqueleto, className, children }: TarjetaProps) {
  const idTitulo = useId();
  return (
    <section
      aria-labelledby={idTitulo}
      aria-busy={estado.cargando || undefined}
      className={cn('tarjeta flex min-w-0 flex-col p-5', className)}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={idTitulo} className="text-[15px] font-semibold text-ink">
            {titulo}
          </h2>
          {descripcion && <p className="texto-bonito mt-0.5 text-[13px] text-ink-3">{descripcion}</p>}
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </header>
      {estado.error ? (
        <ErrorState compacto error={estado.error} onReintentar={estado.onReintentar} />
      ) : estado.cargando ? (
        esqueleto
      ) : (
        children
      )}
    </section>
  );
}
