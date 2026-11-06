import { Select as RSelect } from 'radix-ui';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/cn';
import { claseControl, usePropsCampo } from './Field';

export interface OpcionSelect<T extends string> {
  /** No puede ser cadena vacía (restricción de Radix) */
  valor: T;
  etiqueta: string;
  deshabilitada?: boolean;
}

export interface SelectProps<T extends string> {
  /** Cadena vacía o undefined muestra el placeholder */
  valor: T | '' | undefined;
  onCambio: (v: T) => void;
  opciones: readonly OpcionSelect<T>[];
  placeholder?: string;
  disabled?: boolean;
  /** Para formularios nativos (Radix renderiza un select oculto) */
  name?: string;
  id?: string;
  'aria-label'?: string;
  tamano?: 'sm' | 'md';
  className?: string;
}

/** Selección única sobre Radix Select. Dentro de un Field toma su id, ayuda y error. */
export function Select<T extends string>({
  valor,
  onCambio,
  opciones,
  placeholder = 'Selecciona…',
  disabled,
  name,
  id,
  tamano = 'md',
  className,
  ...aria
}: SelectProps<T>) {
  const a11y = usePropsCampo({ id });
  return (
    <RSelect.Root value={valor ?? ''} onValueChange={(v) => onCambio(v as T)} disabled={disabled} name={name}>
      <RSelect.Trigger
        id={a11y.id}
        aria-label={aria['aria-label']}
        aria-describedby={a11y['aria-describedby']}
        aria-invalid={a11y['aria-invalid']}
        className={cn(
          claseControl,
          'flex items-center justify-between gap-2 text-left data-[placeholder]:text-ink-3',
          tamano === 'sm' ? 'h-8 text-[13px] md:text-[13px]' : 'h-9 pointer-coarse:h-11',
          className,
        )}
      >
        <span className="min-w-0 truncate">
          <RSelect.Value placeholder={placeholder} />
        </span>
        <RSelect.Icon className="shrink-0 text-ink-3">
          <CaretDownIcon size={14} aria-hidden />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-[55] max-h-[min(var(--radix-select-content-available-height),20rem)] min-w-[var(--radix-select-trigger-width)]',
            'overflow-hidden rounded-xl border border-line bg-raised text-sm text-ink shadow-flotante data-[state=open]:animate-flotante-entra',
          )}
        >
          <RSelect.Viewport className="p-1">
            {opciones.map((o) => (
              <RSelect.Item
                key={o.valor}
                value={o.valor}
                disabled={o.deshabilitada}
                className="relative flex cursor-default select-none items-center rounded-lg py-2 pl-2.5 pr-8 outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-panel-2"
              >
                <RSelect.ItemText>{o.etiqueta}</RSelect.ItemText>
                <RSelect.ItemIndicator className="absolute right-2.5 text-accent-fg">
                  <CheckIcon size={15} weight="bold" aria-hidden />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}
