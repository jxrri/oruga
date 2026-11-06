import type { ComponentProps, ElementType, ReactNode } from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/cn';
import { Tooltip } from './Tooltip';

export const variantesBoton = cva(
  [
    'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium',
    'transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-salida',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      variante: {
        primario:
          'bg-accent text-accent-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_1px_2px_var(--sombra)] hover:bg-accent/90',
        secundario: 'border border-line bg-panel text-ink hover:border-line-strong hover:bg-panel-2',
        fantasma: 'text-ink-2 hover:bg-panel-2 hover:text-ink',
        peligro: 'bg-danger text-canvas hover:bg-danger/90',
      },
      tamano: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-3.5 text-sm pointer-coarse:h-11',
        lg: 'h-11 px-5 text-[15px]',
      },
    },
    defaultVariants: { variante: 'secundario', tamano: 'md' },
  },
);

type Variantes = VariantProps<typeof variantesBoton>;

export interface ButtonProps extends Omit<ComponentProps<'button'>, 'children'>, Variantes {
  children?: ReactNode;
  /** true o el texto a mostrar durante la acción ("Guardando…"). Deshabilita el botón. */
  cargando?: boolean | string;
  icono?: ElementType;
  iconoFin?: ElementType;
  /** Renderiza el hijo (por ejemplo un <Link>) con los estilos del botón */
  asChild?: boolean;
}

export function Button({
  variante,
  tamano,
  cargando,
  icono: Icono,
  iconoFin: IconoFin,
  asChild,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const clases = cn(variantesBoton({ variante, tamano }), className);
  if (asChild)
    return (
      <Slot.Root className={clases} {...props}>
        {children}
      </Slot.Root>
    );
  return (
    <button type={type} className={clases} disabled={disabled || !!cargando} aria-busy={!!cargando || undefined} {...props}>
      {cargando ? (
        <CircleNotchIcon size={16} className="animate-spin" aria-hidden />
      ) : (
        Icono && <Icono size={16} aria-hidden />
      )}
      {typeof cargando === 'string' ? cargando : children}
      {IconoFin && !cargando && <IconoFin size={16} aria-hidden />}
    </button>
  );
}

export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children' | 'aria-label'> {
  'aria-label': string;
  icono: ElementType;
  variante?: Variantes['variante'];
  tamano?: 'sm' | 'md';
  /** Texto del tooltip; por defecto el aria-label. false lo desactiva. */
  tooltip?: ReactNode | false;
  tooltipLado?: 'top' | 'right' | 'bottom' | 'left';
}

export function IconButton({
  icono: Icono,
  variante = 'fantasma',
  tamano = 'md',
  tooltip,
  tooltipLado,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  const boton = (
    <button
      type={type}
      className={cn(
        variantesBoton({ variante }),
        tamano === 'sm' ? 'size-8' : 'size-9 pointer-coarse:size-11',
        'px-0',
        className,
      )}
      {...props}
    >
      <Icono size={tamano === 'sm' ? 16 : 18} aria-hidden />
    </button>
  );
  if (tooltip === false) return boton;
  return (
    <Tooltip contenido={tooltip ?? props['aria-label']} lado={tooltipLado}>
      {boton}
    </Tooltip>
  );
}
