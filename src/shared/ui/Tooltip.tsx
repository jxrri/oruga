import { createContext, useContext, type ReactNode } from 'react';
import { Tooltip as RTooltip } from 'radix-ui';
import { cn } from '@/shared/lib/cn';

const ConProveedor = createContext(false);

/** Proveedor global (providers.tsx). Sin él, cada Tooltip crea el suyo: así funcionan en pruebas aisladas. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <ConProveedor.Provider value>
      <RTooltip.Provider delayDuration={350} skipDelayDuration={200}>
        {children}
      </RTooltip.Provider>
    </ConProveedor.Provider>
  );
}

export interface TooltipProps {
  contenido: ReactNode;
  children: ReactNode;
  lado?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function Tooltip({ contenido, children, lado = 'bottom', className }: TooltipProps) {
  const hayProveedor = useContext(ConProveedor);
  const raiz = (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={lado}
          sideOffset={6}
          className={cn(
            'z-[55] max-w-64 rounded-lg border border-line bg-raised px-2.5 py-1.5 text-xs text-ink shadow-flotante',
            'data-[state=delayed-open]:animate-flotante-entra',
            className,
          )}
        >
          {contenido}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
  return hayProveedor ? raiz : <RTooltip.Provider delayDuration={350}>{raiz}</RTooltip.Provider>;
}
