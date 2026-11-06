import type { ElementType } from 'react';
import { ToggleGroup } from 'radix-ui';
import { cn } from '@/shared/lib/cn';

export interface OpcionSegmento<T extends string> {
  valor: T;
  etiqueta: string;
  icono?: ElementType;
  deshabilitada?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  valor: T;
  onCambio: (v: T) => void;
  opciones: readonly OpcionSegmento<T>[];
  'aria-label': string;
  tamano?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

/** Botones segmentados de selección única (ToggleGroup). Nunca queda sin selección. */
export function SegmentedControl<T extends string>({
  valor,
  onCambio,
  opciones,
  tamano = 'md',
  disabled,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={valor}
      onValueChange={(v) => v && onCambio(v as T)}
      disabled={disabled}
      aria-label={aria['aria-label']}
      className={cn('inline-flex rounded-lg border border-line bg-panel-2 p-0.5', disabled && 'opacity-50', className)}
    >
      {opciones.map((o) => (
        <ToggleGroup.Item
          key={o.valor}
          value={o.valor}
          disabled={o.deshabilitada}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium text-ink-2 transition-[color,background-color,box-shadow] duration-150 ease-salida hover:text-ink',
            'data-[state=on]:bg-panel data-[state=on]:text-ink data-[state=on]:shadow-panel disabled:opacity-40',
            tamano === 'sm' ? 'h-7 px-2.5 text-[13px]' : 'h-8 px-3 text-sm pointer-coarse:h-10',
          )}
        >
          {o.icono && <o.icono size={15} aria-hidden />}
          {o.etiqueta}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
