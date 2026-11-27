import { useState } from 'react';
import { Link } from 'react-router';
import type { AlertaAccionable } from '../useMetricasTablero';
import { Tarjeta, type EstadoBloque } from './Tarjeta';
import { cn } from '@/shared/lib/cn';
import { pluralizar } from '@/shared/lib/formato';
import { Badge, Button, EmptyState, Skeleton } from '@/shared/ui';
import { WarningIcon, WarningOctagonIcon, InfoIcon, ArrowRightIcon, CheckCircleIcon } from '@phosphor-icons/react';

const PESTANAS = [
  { clave: 'todas', etiqueta: 'Todas' },
  { clave: 'conflicto', etiqueta: 'Conflictos' },
  { clave: 'mantenimiento', etiqueta: 'Mantenimiento' },
  { clave: 'documento', etiqueta: 'Documentación' },
  { clave: 'cliente', etiqueta: 'Clientes' },
] as const;

type Pestana = (typeof PESTANAS)[number]['clave'];

const SEVERIDAD = {
  bloqueante: { icono: WarningOctagonIcon, tono: 'danger', clase: 'text-danger', etiqueta: 'Bloqueante' },
  advertencia: { icono: WarningIcon, tono: 'warn', clase: 'text-warn', etiqueta: 'Advertencia' },
  info: { icono: InfoIcon, tono: 'info', clase: 'text-info', etiqueta: 'Informativa' },
} as const;

interface PanelAlertasAccionablesProps {
  alertas: AlertaAccionable[];
  estado: EstadoBloque;
}

export function PanelAlertasAccionables({ alertas, estado }: PanelAlertasAccionablesProps) {
  const [tab, setTab] = useState<Pestana>('todas');
  const deTab = (clave: Pestana) => (clave === 'todas' ? alertas : alertas.filter((a) => a.tipo === clave));
  const filtradas = deTab(tab);

  return (
    <Tarjeta
      titulo="Alertas accionables"
      descripcion={
        estado.cargando || estado.error || alertas.length === 0
          ? 'Conflictos, mantenimientos y documentos que piden una decisión'
          : `${pluralizar(alertas.length, 'alerta abierta', 'alertas abiertas')} entre conflictos, mantenimientos y documentos`
      }
      estado={estado}
      esqueleto={
        <div className="space-y-3">
          <Skeleton className="h-7 w-64 max-w-full" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      }
    >
      {/* Filtro por tipo */}
      <div className="mb-2 flex flex-wrap items-center gap-1 text-[13px]">
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            aria-pressed={tab === p.clave}
            onClick={() => setTab(p.clave)}
            className={cn(
              'tabular rounded-full px-3 py-1 font-medium transition-colors duration-150 ease-salida',
              tab === p.clave ? 'bg-accent-soft text-accent-fg' : 'text-ink-3 hover:bg-panel-2 hover:text-ink',
            )}
          >
            {p.etiqueta} ({deTab(p.clave).length})
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <EmptyState
          icono={CheckCircleIcon}
          titulo="Sin alertas pendientes"
          descripcion="No hay incidencias que requieran atención en esta categoría."
          className="py-8"
        />
      ) : (
        <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
          {filtradas.map((alerta) => {
            const severidad = SEVERIDAD[alerta.severidad];
            return (
              <li key={alerta.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-2.5">
                  <severidad.icono size={18} className={cn('mt-0.5 shrink-0', severidad.clase)} aria-hidden />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[13px] font-medium text-ink">{alerta.titulo}</p>
                      <Badge tono={severidad.tono}>{severidad.etiqueta}</Badge>
                    </div>
                    <p className="line-clamp-2 text-[13px] text-ink-3">{alerta.descripcion}</p>
                  </div>
                </div>

                <Button asChild tamano="sm" className="self-end sm:self-center">
                  <Link to={alerta.enlace}>
                    {alerta.textoEnlace}
                    <ArrowRightIcon size={14} className="text-ink-3" aria-hidden />
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}
