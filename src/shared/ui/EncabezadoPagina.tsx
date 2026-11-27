import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CaretRightIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/cn';

export interface Miga {
  etiqueta: string;
  /** Sin `to` es la página actual */
  to?: string;
}

export interface EncabezadoPaginaProps {
  titulo: ReactNode;
  descripcion?: ReactNode;
  /** Botones a la derecha (en móvil bajan debajo del título) */
  acciones?: ReactNode;
  migas?: readonly Miga[];
  /** Fila extra bajo el título: pestañas, filtros, metadatos */
  children?: ReactNode;
  className?: string;
}

/**
 * Encabezado de cada módulo: migas, título (text-xl, nunca un H1 gigante), descripción y acciones.
 * Sus partes llevan `data-entrada`, así useEntrada las anima en escalera.
 */
export function EncabezadoPagina({ titulo, descripcion, acciones, migas, children, className }: EncabezadoPaginaProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-3', className)}>
      {migas && migas.length > 0 && (
        <nav aria-label="Ruta de navegación" data-entrada>
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-3">
            {migas.map((m, i) => (
              <Fragment key={`${m.etiqueta}-${i}`}>
                {i > 0 && (
                  <li aria-hidden>
                    <CaretRightIcon size={12} />
                  </li>
                )}
                <li>
                  {m.to ? (
                    <Link to={m.to} className="rounded transition-colors duration-150 hover:text-ink">
                      {m.etiqueta}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-ink-2">
                      {m.etiqueta}
                    </span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0" data-entrada>
          <h1 className="texto-balance text-2xl font-semibold tracking-tight text-ink">{titulo}</h1>
          {descripcion && <p className="texto-bonito mt-1.5 max-w-[70ch] text-ink-3">{descripcion}</p>}
        </div>
        {acciones && (
          <div className="flex shrink-0 flex-wrap items-center gap-2" data-entrada>
            {acciones}
          </div>
        )}
      </div>
      {children && <div data-entrada>{children}</div>}
    </header>
  );
}
