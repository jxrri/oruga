import { createContext, useContext, useId, type ComponentProps, type ElementType, type ReactNode } from 'react';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/cn';

interface ContextoCampo {
  id: string;
  idAyuda?: string;
  idError?: string;
  invalido: boolean;
  requerido?: boolean;
}

const Contexto = createContext<ContextoCampo | null>(null);

/**
 * Props de accesibilidad que un control toma del Field que lo envuelve: id, aria-describedby (ayuda y
 * error), aria-invalid y required. Las props explícitas del control ganan.
 */
export function usePropsCampo(p: {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: ComponentProps<'input'>['aria-invalid'];
  required?: boolean;
}) {
  const c = useContext(Contexto);
  const descritoPor = [p['aria-describedby'], c?.idAyuda, c?.idError].filter(Boolean).join(' ');
  return {
    id: p.id ?? c?.id,
    'aria-describedby': descritoPor || undefined,
    'aria-invalid': p['aria-invalid'] ?? (c?.invalido || undefined),
    required: p.required ?? c?.requerido,
  };
}

export interface FieldProps {
  etiqueta: ReactNode;
  children: ReactNode;
  ayuda?: ReactNode;
  /** Mensaje de error; también marca el control con aria-invalid */
  error?: ReactNode;
  requerido?: boolean;
  /** id del control; por defecto se genera */
  id?: string;
  className?: string;
}

/** Etiqueta arriba, ayuda opcional y error debajo (docs/DISENO.md). Envuelve un solo control. */
export function Field({ etiqueta, children, ayuda, error, requerido, id, className }: FieldProps) {
  const propio = useId();
  const idCampo = id ?? propio;
  const ctx: ContextoCampo = {
    id: idCampo,
    idAyuda: ayuda ? `${idCampo}-ayuda` : undefined,
    idError: error ? `${idCampo}-error` : undefined,
    invalido: !!error,
    requerido,
  };
  return (
    <Contexto.Provider value={ctx}>
      <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <label htmlFor={idCampo} className="text-[13px] font-medium text-ink">
          {etiqueta}
          {requerido && (
            <span aria-hidden className="ml-0.5 text-danger">
              *
            </span>
          )}
        </label>
        {children}
        {ayuda && (
          <p id={ctx.idAyuda} className="texto-bonito text-[13px] text-ink-3">
            {ayuda}
          </p>
        )}
        {error && (
          <p id={ctx.idError} role="alert" className="flex items-start gap-1.5 text-[13px] text-danger">
            <WarningCircleIcon size={15} aria-hidden className="mt-px shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </Contexto.Provider>
  );
}

/** Estilo común de campos: 36 px (44 px en táctil), 16 px de fuente en móvil para evitar el zoom. */
export const claseControl = cn(
  'w-full min-w-0 rounded-lg border border-line bg-panel px-3 text-base text-ink placeholder:text-ink-3 md:text-sm',
  'transition-[border-color,box-shadow] duration-150 ease-salida hover:border-line-strong',
  'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/25',
);

export interface InputProps extends ComponentProps<'input'> {
  /** Ícono Phosphor al inicio (por ejemplo una lupa en búsquedas) */
  icono?: ElementType;
  /** Unidad o texto al final: "t", "km", "h" */
  sufijo?: ReactNode;
}

export function Input({ icono: Icono, sufijo, className, id, required, ...props }: InputProps) {
  const a11y = usePropsCampo({
    id,
    required,
    'aria-describedby': props['aria-describedby'],
    'aria-invalid': props['aria-invalid'],
  });
  const control = (
    <input
      {...props}
      {...a11y}
      className={cn(claseControl, 'h-9 pointer-coarse:h-11', Icono && 'pl-9', sufijo && 'pr-10', !Icono && !sufijo && className)}
    />
  );
  if (!Icono && !sufijo) return control;
  return (
    <div className={cn('relative min-w-0', className)}>
      {Icono && (
        <Icono size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
      )}
      {control}
      {sufijo && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">
          {sufijo}
        </span>
      )}
    </div>
  );
}

export function Textarea({ className, id, required, rows = 3, ...props }: ComponentProps<'textarea'>) {
  const a11y = usePropsCampo({
    id,
    required,
    'aria-describedby': props['aria-describedby'],
    'aria-invalid': props['aria-invalid'],
  });
  return <textarea rows={rows} {...props} {...a11y} className={cn(claseControl, 'min-h-20 py-2 leading-relaxed', className)} />;
}
