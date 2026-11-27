import type { ComponentProps, ReactNode } from 'react';
import { Tabs as RTabs } from 'radix-ui';
import { cn } from '@/shared/lib/cn';

/** Raíz de pestañas. Para que la URL refleje la pestaña, controlar `value` desde useSearchParams. */
export const Tabs = RTabs.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof RTabs.List>) {
  return (
    <RTabs.List
      className={cn('flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]', className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  children,
  conteo,
  ...props
}: ComponentProps<typeof RTabs.Trigger> & { conteo?: ReactNode }) {
  return (
    <RTabs.Trigger
      className={cn(
        'relative -mb-px inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-ink-2',
        'transition-colors duration-150 ease-salida hover:text-ink disabled:opacity-50',
        'data-[state=active]:border-accent data-[state=active]:text-ink',
        className,
      )}
      {...props}
    >
      {children}
      {conteo !== undefined && (
        <span className="tabular rounded-full bg-panel-2 px-1.5 text-xs text-ink-3 ring-1 ring-inset ring-line">
          {conteo}
        </span>
      )}
    </RTabs.Trigger>
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof RTabs.Content>) {
  return <RTabs.Content className={cn('pt-4 outline-none', className)} {...props} />;
}
