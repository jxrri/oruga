import type { ReactNode } from 'react';
import { Dialog as RDialog } from 'radix-ui';
import { XIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/cn';
import { IconButton } from './Button';

export const Sheet = RDialog.Root;
export const SheetTrigger = RDialog.Trigger;
export const SheetClose = RDialog.Close;

export interface SheetContentProps {
  titulo: ReactNode;
  descripcion?: ReactNode;
  children: ReactNode;
  pie?: ReactNode;
  lado?: 'derecha' | 'izquierda';
  /** Oculta visualmente el título (sigue disponible para lectores de pantalla) */
  ocultarTitulo?: boolean;
  className?: string;
}

/** Panel lateral modal sobre Radix Dialog: foco atrapado, Escape cierra y devuelve el foco. */
export function SheetContent({
  titulo,
  descripcion,
  children,
  pie,
  lado = 'derecha',
  ocultarTitulo,
  className,
}: SheetContentProps) {
  const der = lado === 'derecha';
  return (
    <RDialog.Portal>
      <RDialog.Overlay className="fixed inset-0 z-40 bg-canvas/70 backdrop-blur-[2px] data-[state=closed]:animate-capa-sale data-[state=open]:animate-capa-entra" />
      <RDialog.Content
        {...(descripcion ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'fixed inset-y-0 z-50 flex w-[min(100vw-3rem,24rem)] flex-col bg-panel shadow-flotante outline-none',
          der
            ? 'right-0 border-l border-line data-[state=closed]:animate-panel-der-sale data-[state=open]:animate-panel-der-entra'
            : 'left-0 border-r border-line data-[state=closed]:animate-panel-izq-sale data-[state=open]:animate-panel-izq-entra',
          className,
        )}
      >
        <div className={cn('flex items-start gap-3 px-5 pt-4', ocultarTitulo ? 'absolute right-0 top-0' : 'pb-3')}>
          <div className={cn('min-w-0 flex-1', ocultarTitulo && 'sr-only')}>
            <RDialog.Title className="text-[15px] font-semibold text-ink">{titulo}</RDialog.Title>
            {descripcion && <RDialog.Description className="mt-0.5 text-ink-2">{descripcion}</RDialog.Description>}
          </div>
          <RDialog.Close asChild>
            <IconButton aria-label="Cerrar" icono={XIcon} tamano="sm" tooltip={false} className="-mr-2" />
          </RDialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {pie && <div className="border-t border-line px-5 py-3">{pie}</div>}
      </RDialog.Content>
    </RDialog.Portal>
  );
}
