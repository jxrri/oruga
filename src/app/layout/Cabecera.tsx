import { useLocation } from 'react-router';
import { DesktopIcon, ListIcon, MoonIcon, SlidersHorizontalIcon, SunIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/cn';
import { IconButton, variantesBoton } from '@/shared/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/DropdownMenu';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useAppDispatch, useAppSelector } from '../hooks';
import { bsAlternado, panelDevAlternado, temaCambiado, type Tema } from '../uiSlice';
import { IndicadorEnVivo } from './IndicadorEnVivo';
import { moduloDeRuta } from './navegacion';
import { RelojDemo } from './RelojDemo';
import { SelectorRol } from './SelectorRol';

const TEMAS: { valor: Tema; etiqueta: string; icono: typeof SunIcon }[] = [
  { valor: 'sistema', etiqueta: 'Según el sistema', icono: DesktopIcon },
  { valor: 'oscuro', etiqueta: 'Oscuro', icono: MoonIcon },
  { valor: 'claro', etiqueta: 'Claro', icono: SunIcon },
];

/** Sin VITE_API_URL la app corre contra MSW: solo entonces tiene sentido el panel de desarrollo. */
const HAY_MOCKS = !import.meta.env.VITE_API_URL;

function MenuTema() {
  const tema = useAppSelector((s) => s.ui.tema);
  const dispatch = useAppDispatch();
  const actual = TEMAS.find((t) => t.valor === tema) ?? TEMAS[0]!;
  return (
    <DropdownMenu>
      <Tooltip contenido="Tema">
        <DropdownMenuTrigger asChild>
          <IconButton aria-label={`Tema: ${actual.etiqueta}`} icono={actual.icono} tooltip={false} />
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent>
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={tema} onValueChange={(v) => dispatch(temaCambiado(v as Tema))}>
          {TEMAS.map((t) => (
            <DropdownMenuRadioItem key={t.valor} value={t.valor}>
              <t.icono size={16} aria-hidden className="text-ink-3" />
              {t.etiqueta}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BotonBs() {
  const mostrarBs = useAppSelector((s) => s.ui.mostrarBs);
  const dispatch = useAppDispatch();
  return (
    <Tooltip contenido={mostrarBs ? 'Ocultar equivalente en bolívares' : 'Mostrar equivalente en bolívares'}>
      <button
        type="button"
        aria-pressed={mostrarBs}
        onClick={() => dispatch(bsAlternado())}
        className={cn(
          variantesBoton({ variante: 'fantasma', tamano: 'sm' }),
          'w-9 px-0 font-mono text-xs',
          mostrarBs && 'bg-accent-soft text-accent-fg hover:bg-accent-soft hover:text-accent-fg',
        )}
      >
        Bs
      </button>
    </Tooltip>
  );
}

export function Cabecera({ alAbrirMenu }: { alAbrirMenu?: () => void }) {
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();
  const modulo = moduloDeRuta(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-canvas/85 px-3 backdrop-blur-md sm:px-4 lg:px-6">
      {alAbrirMenu && <IconButton aria-label="Abrir menú" icono={ListIcon} onClick={alAbrirMenu} className="-ml-1" />}
      {modulo && (
        <p className="flex min-w-0 items-center gap-2 font-medium text-ink">
          <modulo.icono size={18} aria-hidden className="text-ink-3" />
          <span className="truncate">{modulo.etiqueta}</span>
        </p>
      )}
      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        <RelojDemo />
        <IndicadorEnVivo />
        <span aria-hidden className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <BotonBs />
        <MenuTema />
        {HAY_MOCKS && (
          <IconButton
            aria-label="Panel de desarrollo"
            icono={SlidersHorizontalIcon}
            onClick={() => dispatch(panelDevAlternado(true))}
            className="hidden sm:inline-flex"
          />
        )}
        <SelectorRol />
      </div>
    </header>
  );
}
