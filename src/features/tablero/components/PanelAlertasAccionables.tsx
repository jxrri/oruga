import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import type { AlertaAccionable } from '../useMetricasTablero';
import {
  WarningIcon,
  WarningOctagonIcon,
  InfoIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@phosphor-icons/react';

interface PanelAlertasAccionablesProps {
  alertas: AlertaAccionable[];
}

export function PanelAlertasAccionables({ alertas }: PanelAlertasAccionablesProps) {
  const [tab, setTab] = useState<'todas' | 'conflicto' | 'mantenimiento' | 'documento'>('todas');

  const filtradas = useMemo(() => {
    if (tab === 'todas') return alertas;
    return alertas.filter((a) => a.tipo === tab);
  }, [alertas, tab]);

  const conteos = useMemo(() => {
    return {
      todas: alertas.length,
      conflicto: alertas.filter((a) => a.tipo === 'conflicto').length,
      mantenimiento: alertas.filter((a) => a.tipo === 'mantenimiento').length,
      documento: alertas.filter((a) => a.tipo === 'documento').length,
    };
  }, [alertas]);

  return (
    <div className="bg-panel border border-line rounded-xl shadow-panel flex flex-col h-full overflow-hidden">
      {/* Cabecera y pestañas */}
      <div className="p-4 border-b border-line bg-panel-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">Alertas Accionables</h2>
            {alertas.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-danger-soft text-danger">
                {alertas.length}
              </span>
            )}
          </div>
          <span className="text-xs text-ink-3">Resolución inmediata</span>
        </div>

        {/* Selector de pestañas */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-0.5">
          <button
            type="button"
            onClick={() => setTab('todas')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
              tab === 'todas'
                ? 'bg-panel text-ink shadow-sm border border-line-strong'
                : 'text-ink-3 hover:text-ink hover:bg-panel'
            }`}
          >
            Todas ({conteos.todas})
          </button>
          <button
            type="button"
            onClick={() => setTab('conflicto')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
              tab === 'conflicto'
                ? 'bg-panel text-ink shadow-sm border border-line-strong'
                : 'text-ink-3 hover:text-ink hover:bg-panel'
            }`}
          >
            Conflictos ({conteos.conflicto})
          </button>
          <button
            type="button"
            onClick={() => setTab('mantenimiento')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
              tab === 'mantenimiento'
                ? 'bg-panel text-ink shadow-sm border border-line-strong'
                : 'text-ink-3 hover:text-ink hover:bg-panel'
            }`}
          >
            Mantenimiento ({conteos.mantenimiento})
          </button>
          <button
            type="button"
            onClick={() => setTab('documento')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
              tab === 'documento'
                ? 'bg-panel text-ink shadow-sm border border-line-strong'
                : 'text-ink-3 hover:text-ink hover:bg-panel'
            }`}
          >
            Documentación ({conteos.documento})
          </button>
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="flex-1 overflow-y-auto divide-y divide-line p-2">
        {filtradas.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-2 text-ink-3">
            <CheckCircleIcon size={32} className="text-ok" />
            <p className="text-sm font-medium text-ink">Sin alertas pendientes</p>
            <p className="text-xs">No hay incidencias que requieran atención en esta categoría.</p>
          </div>
        ) : (
          filtradas.map((alerta) => {
            const esBloqueante = alerta.severidad === 'bloqueante';
            const esAdvertencia = alerta.severidad === 'advertencia';

            return (
              <div
                key={alerta.id}
                className="p-3 hover:bg-panel-2 rounded-lg transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {esBloqueante ? (
                      <WarningOctagonIcon size={18} className="text-danger" />
                    ) : esAdvertencia ? (
                      <WarningIcon size={18} className="text-warn" />
                    ) : (
                      <InfoIcon size={18} className="text-info" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-ink truncate">
                        {alerta.titulo}
                      </p>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                          esBloqueante
                            ? 'bg-danger-soft text-danger'
                            : esAdvertencia
                              ? 'bg-warn-soft text-warn'
                              : 'bg-info-soft text-info'
                        }`}
                      >
                        {alerta.severidad}
                      </span>
                    </div>
                    <p className="text-xs text-ink-2 line-clamp-2">
                      {alerta.descripcion}
                    </p>
                  </div>
                </div>

                <Link
                  to={alerta.enlace}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-panel border border-line hover:border-line-strong hover:bg-raised text-xs font-medium text-ink transition-colors self-end sm:self-center"
                >
                  <span>{alerta.textoEnlace}</span>
                  <ArrowRightIcon size={14} className="text-accent-fg" />
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
