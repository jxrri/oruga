import { useState, type ReactNode } from 'react';
import { AlertDialog as RAlert, Dialog as RDialog } from 'radix-ui';
import { WarningIcon, XIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/cn';
import { Button, IconButton } from './Button';

export const Dialog = RDialog.Root;
export const DialogTrigger = RDialog.Trigger;
export const DialogClose = RDialog.Close;

const ANCHO = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

const claseOverlay =
  'fixed inset-0 z-40 bg-canvas/70 backdrop-blur-[2px] data-[state=closed]:animate-capa-sale data-[state=open]:animate-capa-entra';
const claseCaja = (tamano: keyof typeof ANCHO, className?: string) =>
  cn(
    'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
    'rounded-xl border border-line bg-raised text-ink shadow-flotante outline-none',
    'data-[state=closed]:animate-dialogo-sale data-[state=open]:animate-dialogo-entra',
    ANCHO[tamano],
    className,
  );

export interface DialogContentProps {
  titulo: ReactNode;
  descripcion?: ReactNode;
  children?: ReactNode;
  /** Acciones al pie, alineadas a la derecha */
  pie?: ReactNode;
  tamano?: keyof typeof ANCHO;
  className?: string;
}

/** Diálogo modal: foco atrapado, Escape cierra y devuelve el foco al disparador. */
export function DialogContent({ titulo, descripcion, children, pie, tamano = 'md', className }: DialogContentProps) {
  return (
    <RDialog.Portal>
      <RDialog.Overlay className={claseOverlay} />
      <RDialog.Content
        {...(descripcion ? {} : { 'aria-describedby': undefined })}
        className={claseCaja(tamano, className)}
      >
        <div className="flex items-start gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <RDialog.Title className="texto-balance text-[15px] font-semibold">{titulo}</RDialog.Title>
            {descripcion && <RDialog.Description className="texto-bonito mt-1 text-ink-2">{descripcion}</RDialog.Description>}
          </div>
          <RDialog.Close asChild>
            <IconButton aria-label="Cerrar" icono={XIcon} tamano="sm" tooltip={false} className="-mr-2 -mt-1" />
          </RDialog.Close>
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>}
        {pie && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{pie}</div>}
      </RDialog.Content>
    </RDialog.Portal>
  );
}

export interface ConfirmDialogProps {
  titulo: ReactNode;
  /** Qué pasa al confirmar, en concreto: "La reserva R-2026-00123 pasa a cancelada y libera el activo." */
  efecto: ReactNode;
  etiquetaConfirmar: string;
  /** Texto durante la acción: "Cancelando…" */
  etiquetaCargando?: string;
  etiquetaCancelar?: string;
  tono?: 'peligro' | 'primario';
  /** Si devuelve una promesa, el botón muestra carga y el diálogo cierra al resolverse; si falla, queda abierto. */
  onConfirmar: () => unknown;
  /** Elemento que abre el diálogo (modo no controlado) */
  trigger?: ReactNode;
  abierto?: boolean;
  onAbiertoCambio?: (v: boolean) => void;
  children?: ReactNode;
}

/** Confirmación de acciones destructivas o irreversibles (alertdialog): describe el efecto antes de actuar. */
export function ConfirmDialog({
  titulo,
  efecto,
  etiquetaConfirmar,
  etiquetaCargando,
  etiquetaCancelar = 'Cancelar',
  tono = 'peligro',
  onConfirmar,
  trigger,
  abierto,
  onAbiertoCambio,
  children,
}: ConfirmDialogProps) {
  const [interno, setInterno] = useState(false);
  const [cargando, setCargando] = useState(false);
  const open = abierto ?? interno;
  const cambiar = (v: boolean) => {
    if (cargando) return;
    onAbiertoCambio?.(v);
    if (abierto === undefined) setInterno(v);
  };

  async function confirmar() {
    const r = onConfirmar();
    if (!(r instanceof Promise)) return cambiar(false);
    setCargando(true);
    try {
      await r;
      setCargando(false);
      cambiar(false);
    } catch {
      setCargando(false);
    }
  }

  return (
    <RAlert.Root open={open} onOpenChange={cambiar}>
      {trigger && <RAlert.Trigger asChild>{trigger}</RAlert.Trigger>}
      <RAlert.Portal>
        <RAlert.Overlay className={claseOverlay} />
        <RAlert.Content className={claseCaja('sm')}>
          <div className="flex gap-3 px-5 pb-4 pt-5">
            {tono === 'peligro' && (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger">
                <WarningIcon size={18} aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <RAlert.Title className="texto-balance text-[15px] font-semibold">{titulo}</RAlert.Title>
              <RAlert.Description className="texto-bonito mt-1 text-ink-2">{efecto}</RAlert.Description>
              {children}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">
            <RAlert.Cancel asChild>
              <Button disabled={cargando}>{etiquetaCancelar}</Button>
            </RAlert.Cancel>
            <Button
              variante={tono === 'peligro' ? 'peligro' : 'primario'}
              cargando={cargando && (etiquetaCargando ?? true)}
              onClick={() => void confirmar()}
            >
              {etiquetaConfirmar}
            </Button>
          </div>
        </RAlert.Content>
      </RAlert.Portal>
    </RAlert.Root>
  );
}
