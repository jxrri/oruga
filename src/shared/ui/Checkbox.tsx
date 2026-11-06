import { useId, type ReactNode } from 'react';
import { Checkbox as RCheckbox } from 'radix-ui';
import { CheckIcon, MinusIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/cn';

export interface CheckboxProps {
  checked: boolean | 'indeterminate';
  onCheckedChange: (v: boolean) => void;
  etiqueta?: ReactNode;
  descripcion?: ReactNode;
  disabled?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
  className?: string;
}

/** Casilla de verificación. Con `etiqueta` la fila entera es clicable. */
export function Checkbox({
  checked,
  onCheckedChange,
  etiqueta,
  descripcion,
  disabled,
  id,
  name,
  className,
  ...aria
}: CheckboxProps) {
  const propio = useId();
  const idControl = id ?? propio;
  const caja = (
    <RCheckbox.Root
      id={idControl}
      name={name}
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      disabled={disabled}
      aria-label={aria['aria-label']}
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-[5px] border border-line-strong bg-panel transition-colors duration-150',
        'hover:border-ink-3 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-ink',
        'data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-accent-ink',
        'disabled:opacity-50 pointer-coarse:size-5',
      )}
    >
      <RCheckbox.Indicator>
        {checked === 'indeterminate' ? (
          <MinusIcon size={12} weight="bold" aria-hidden />
        ) : (
          <CheckIcon size={12} weight="bold" aria-hidden />
        )}
      </RCheckbox.Indicator>
    </RCheckbox.Root>
  );
  if (!etiqueta) return <span className={className}>{caja}</span>;
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <span className="pt-0.5">{caja}</span>
      <label htmlFor={idControl} className={cn('min-w-0 cursor-pointer', disabled && 'cursor-not-allowed opacity-50')}>
        <span className="block text-ink">{etiqueta}</span>
        {descripcion && <span className="block text-[13px] text-ink-3">{descripcion}</span>}
      </label>
    </div>
  );
}
