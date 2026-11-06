import { Fragment } from 'react';
import { Link, NavLink } from 'react-router';
import { CopyrightIcon, SidebarSimpleIcon } from '@phosphor-icons/react';
import { useAppDispatch, useUsuario } from '../hooks';
import { menuAlternado } from '../uiSlice';
import { cn } from '@/shared/lib/cn';
import { IconButton } from '@/shared/ui/Button';
import { Tooltip } from '@/shared/ui/Tooltip';
import { MarcaOruga } from './MarcaOruga';
import { modulosVisibles, rutaInicial } from './navegacion';

const claseEnlace = (activo: boolean, colapsado: boolean) =>
  cn(
    'relative flex h-9 items-center gap-3 rounded-lg text-ink-2 transition-colors duration-150 ease-salida hover:bg-panel-2 hover:text-ink pointer-coarse:h-11',
    colapsado ? 'w-9 justify-center pointer-coarse:w-11' : 'px-2.5',
    activo && 'bg-panel-2 text-ink',
  );

/** Navegación principal. `colapsado` solo aplica en escritorio; en el cajón móvil va expandida. */
export function BarraLateral({ colapsado = false, alNavegar }: { colapsado?: boolean; alNavegar?: () => void }) {
  const usuario = useUsuario();
  const dispatch = useAppDispatch();
  const visibles = modulosVisibles(usuario);

  return (
    <div className={cn('flex h-full flex-col gap-4 py-3', colapsado ? 'items-center px-2' : 'px-3')}>
      <Link
        to={rutaInicial(usuario)}
        onClick={alNavegar}
        className={cn('flex h-10 items-center gap-2.5 rounded-lg', colapsado ? 'justify-center' : 'px-1.5')}
        aria-label="Oruga, ir al inicio"
      >
        <MarcaOruga />
        {!colapsado && <span className="text-[15px] font-semibold tracking-tight text-ink">Oruga</span>}
      </Link>

      <nav aria-label="Módulos" className="w-full flex-1 overflow-y-auto">
        <ul className={cn('flex flex-col gap-0.5', colapsado && 'items-center')}>
          {visibles.map((m, i) => {
            const separar = i > 0 && visibles[i - 1]!.grupo !== m.grupo;
            const enlace = (
              <NavLink to={m.ruta} onClick={alNavegar} className={({ isActive }) => claseEnlace(isActive, colapsado)}>
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden
                      className={cn(
                        'absolute top-2 bottom-2 w-[3px] rounded-r-full bg-accent transition-opacity duration-150',
                        colapsado ? '-left-2' : '-left-3',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <m.icono size={18} weight={isActive ? 'bold' : 'regular'} aria-hidden />
                    <span className={colapsado ? 'sr-only' : 'truncate'}>{m.etiqueta}</span>
                  </>
                )}
              </NavLink>
            );
            return (
              <Fragment key={m.ruta}>
                {separar && <li aria-hidden className={cn('my-2 h-px bg-line', colapsado ? 'w-6' : 'mx-2.5')} />}
                <li>
                  {colapsado ? (
                    <Tooltip contenido={m.etiqueta} lado="right">
                      {enlace}
                    </Tooltip>
                  ) : (
                    enlace
                  )}
                </li>
              </Fragment>
            );
          })}
        </ul>
      </nav>

      <div className={cn('flex w-full items-center gap-1 border-t border-line pt-3', colapsado ? 'flex-col' : 'justify-between')}>
        <NavLink
          to="/creditos"
          onClick={alNavegar}
          className={({ isActive }) => cn(claseEnlace(isActive, colapsado), !colapsado && 'flex-1 text-[13px]')}
        >
          <CopyrightIcon size={16} aria-hidden />
          <span className={colapsado ? 'sr-only' : undefined}>Créditos de imágenes</span>
        </NavLink>
        {!alNavegar && (
          <IconButton
            aria-label={colapsado ? 'Expandir menú' : 'Contraer menú'}
            icono={SidebarSimpleIcon}
            tamano="sm"
            tooltipLado="right"
            onClick={() => dispatch(menuAlternado())}
          />
        )}
      </div>
    </div>
  );
}
