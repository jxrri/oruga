import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

/** Esqueleto con la forma final del contenido. Darle alto y ancho reales en el uso. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-panel-2', className)} {...props} />;
}
