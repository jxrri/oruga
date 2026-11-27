import { CheckCircleIcon, ProhibitIcon, WarningIcon } from '@phosphor-icons/react';
import type { Activo, Conflicto, Reserva, ZonaIANA } from '@/api/contrato';
import type { Veredicto } from '@/domain/conflictos';
import { cn } from '@/shared/lib/cn';
import { desdeMs, formatear } from '@/shared/lib/fechas';

export interface FantasmaArrastreProps {
  reserva: Reserva;
  activoTarget: Activo;
  inicioMs: number;
  finMs: number;
  x: number;
  y: number;
  ancho: number;
  conflictos: Conflicto[];
  veredicto: Veredicto;
  zona: ZonaIANA;
}

export function FantasmaArrastre({
  reserva,
  activoTarget,
  inicioMs,
  finMs,
  x,
  y,
  ancho,
  conflictos,
  veredicto,
  zona,
}: FantasmaArrastreProps) {
  const esBloqueado = veredicto === 'bloqueado';
  const esAdvertencia = veredicto === 'advertencia';

  const fechaInicioTxt = formatear(desdeMs(inicioMs), zona, 'dd MMM HH:mm');
  const fechaFinTxt = formatear(desdeMs(finMs), zona, 'dd MMM HH:mm');

  return (
    <div
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: Math.max(ancho, 88),
      }}
      className={cn(
        'pointer-events-none fixed z-50 flex h-[36px] items-center justify-between rounded-md border-2 bg-raised px-2.5 shadow-flotante transition-colors duration-150',
        esBloqueado
          ? 'border-danger text-danger ring-2 ring-danger/25'
          : esAdvertencia
            ? 'border-warn text-warn ring-2 ring-warn/25'
            : 'border-ok text-ok ring-2 ring-ok/25',
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {esBloqueado ? (
          <ProhibitIcon size={15} weight="bold" className="shrink-0 text-danger" aria-hidden />
        ) : esAdvertencia ? (
          <WarningIcon size={15} weight="bold" className="shrink-0 text-warn" aria-hidden />
        ) : (
          <CheckCircleIcon size={15} weight="bold" className="shrink-0 text-ok" aria-hidden />
        )}
        <span className="truncate font-mono text-xs font-medium text-ink">
          {reserva.codigo}
        </span>
      </div>

      <span className="ml-2 shrink-0 rounded-full bg-panel-2 px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink ring-1 ring-line">
        {activoTarget.codigo}
      </span>

      {/* HUD de validación en vivo sobre la cápsula arrastrada */}
      <div className="pointer-events-none absolute -top-[62px] left-1/2 flex -translate-x-1/2 flex-col items-center whitespace-nowrap rounded-lg border border-line bg-raised px-3 py-1.5 text-xs text-ink shadow-flotante">
        <div className="font-mono tabular text-ink-2">
          {fechaInicioTxt} - {fechaFinTxt}
        </div>
        {conflictos.length > 0 ? (
          <div
            className={cn(
              'mt-0.5 flex items-center gap-1 font-medium',
              esBloqueado ? 'text-danger' : 'text-warn',
            )}
          >
            {esBloqueado ? (
              <ProhibitIcon size={13} weight="bold" aria-hidden />
            ) : (
              <WarningIcon size={13} weight="bold" aria-hidden />
            )}
            <span>{conflictos[0]?.mensaje}</span>
          </div>
        ) : (
          <div className="mt-0.5 flex items-center gap-1 font-medium text-ok">
            <CheckCircleIcon size={13} weight="bold" aria-hidden />
            <span>Asignación válida en {activoTarget.codigo}</span>
          </div>
        )}
      </div>
    </div>
  );
}
