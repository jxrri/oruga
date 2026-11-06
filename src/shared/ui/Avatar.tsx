import { cn } from '@/shared/lib/cn';

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

const TAMANO = { sm: 'size-7 text-[11px]', md: 'size-9 text-xs', lg: 'size-11 text-sm' } as const;

/** Monograma con iniciales, tipo placa de equipo. Decorativo: el nombre siempre va en texto al lado. */
export function Avatar({
  nombre,
  tamano = 'md',
  activo,
  className,
}: {
  nombre: string;
  tamano?: keyof typeof TAMANO;
  /** Anillo de acento: usuario de la sesión actual */
  activo?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-lg border border-line-strong bg-panel-2 font-mono font-medium tracking-tight text-ink-2',
        activo && 'border-accent text-ink ring-2 ring-accent/25',
        TAMANO[tamano],
        className,
      )}
    >
      {iniciales(nombre)}
    </span>
  );
}
