import { useId, type ReactNode } from 'react';
import { Switch as RSwitch } from 'radix-ui';
import { cn } from '@/shared/lib/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  etiqueta?: ReactNode;
  descripcion?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Interruptor con etiqueta clicable. Sin `etiqueta`, pasar aria-label por el contenedor que lo nombre. */
export function Switch({ checked, onCheckedChange, etiqueta, descripcion, disabled, id, className }: SwitchProps) {
  const propio = useId();
  const idControl = id ?? propio;
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      {etiqueta && (
        <label htmlFor={idControl} className="min-w-0 cursor-pointer">
          <span className="block font-medium text-ink">{etiqueta}</span>
          {descripcion && <span className="block text-[13px] text-ink-3">{descripcion}</span>}
        </label>
      )}
      <RSwitch.Root
        id={idControl}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-line-strong bg-panel-2 transition-colors duration-150',
          'data-[state=checked]:border-accent data-[state=checked]:bg-accent disabled:opacity-50',
        )}
      >
        <RSwitch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-ink-2 shadow-sm transition-transform duration-150 ease-salida data-[state=checked]:translate-x-[17px] data-[state=checked]:bg-accent-ink" />
      </RSwitch.Root>
    </div>
  );
}
