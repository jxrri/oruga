import type { ElementType, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

export const variantesBadge = cva(
  'inline-flex h-[22px] max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium [&_svg]:shrink-0',
  {
    variants: {
      tono: {
        neutro: 'bg-panel-2 text-ink-2 ring-1 ring-inset ring-line',
        acento: 'bg-accent-soft text-accent-fg',
        ok: 'bg-ok-soft text-ok',
        warn: 'bg-warn-soft text-warn',
        danger: 'bg-danger-soft text-danger',
        info: 'bg-info-soft text-info',
        mnt: 'rayado-mnt text-ink ring-1 ring-inset ring-line',
      },
    },
    defaultVariants: { tono: 'neutro' },
  },
);

export interface BadgeProps extends VariantProps<typeof variantesBadge> {
  children: ReactNode;
  icono?: ElementType;
  className?: string;
  title?: string;
}

/** Chip de estado. El color nunca va solo: pasar `icono` cuando el tono comunica estado (SPEC §12.1). */
export function Badge({ tono, icono: Icono, children, className, title }: BadgeProps) {
  return (
    <span className={cn(variantesBadge({ tono }), className)} title={title}>
      {Icono && <Icono size={13} weight="bold" aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}
