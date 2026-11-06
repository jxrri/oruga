import type { ElementType, ReactNode } from 'react';
import { ArrowClockwiseIcon, LockKeyIcon, ProhibitIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import { describirError } from '@/api/errores';
import { cn } from '@/shared/lib/cn';
import { Button } from './Button';

/** Vista vacía: qué falta y cómo poblarla. Ícono en peso duotone (DISENO.md). */
export function EmptyState({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  className,
}: {
  icono: ElementType;
  titulo: string;
  descripcion?: ReactNode;
  accion?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span className="mb-4 grid size-12 place-items-center rounded-xl border border-line bg-panel-2 text-ink-3">
        <Icono size={24} weight="duotone" aria-hidden />
      </span>
      <h3 className="texto-balance text-[15px] font-semibold text-ink">{titulo}</h3>
      {descripcion && <p className="texto-bonito mt-1 max-w-sm text-ink-2">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

/** Error con Reintentar. Acepta el error crudo de RTK Query y lo traduce con describirError. */
export function ErrorState({
  error,
  onReintentar,
  onCerrar,
  titulo,
  compacto,
  className,
}: {
  error?: unknown;
  onReintentar?: () => void;
  onCerrar?: () => void;
  titulo?: string;
  compacto?: boolean;
  className?: string;
}) {
  const legible = describirError(error);
  const esPermiso = legible.status === 403;
  const esConflicto = legible.status === 409;
  const Icono = esPermiso ? LockKeyIcon : esConflicto ? ProhibitIcon : WarningCircleIcon;
  const mostrarTitulo = Boolean(titulo) || !compacto;

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-xl border border-danger/25 bg-danger-soft text-ink shadow-xs',
        compacto
          ? cn(mostrarTitulo ? 'items-start' : 'items-center', 'px-3.5 py-2.5 text-xs')
          : 'flex-col items-start p-5 sm:flex-row',
        className,
      )}
    >
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-lg bg-danger/15 text-danger',
          compacto ? cn('size-7', mostrarTitulo && 'mt-0.5') : 'size-8',
        )}
      >
        <Icono size={compacto ? 16 : 18} weight="duotone" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {mostrarTitulo ? (
          <>
            <p className="font-semibold text-danger leading-snug">{titulo ?? legible.titulo}</p>
            <p className="texto-bonito text-ink-2 mt-0.5 leading-relaxed">{legible.detalle}</p>
          </>
        ) : (
          <p className="texto-bonito font-medium text-danger leading-snug">{legible.detalle}</p>
        )}
      </div>
      {onReintentar && (
        <Button tamano="sm" icono={ArrowClockwiseIcon} onClick={onReintentar}>
          Reintentar
        </Button>
      )}
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="shrink-0 rounded-md p-1 text-ink-3 hover:bg-danger/10 hover:text-ink transition-colors"
        >
          <XIcon size={14} />
        </button>
      )}
    </div>
  );
}
