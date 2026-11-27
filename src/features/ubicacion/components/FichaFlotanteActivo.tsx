import { Link } from 'react-router';
import type { ActivoTelemetria } from '../useTelemetria';
import { ETIQUETA_ESTADO_VISIBLE } from '@/domain/estadoActivo';
import { formatear } from '@/shared/lib/fechas';
import { EtiquetaMotor } from '@/features/inventario/components/EtiquetaMotor';
import {
  XIcon,
  ArrowSquareOutIcon,
  WarningIcon,
  CheckCircleIcon,
  MapPinIcon,
  ClockIcon,
  GasPumpIcon,
  GaugeIcon,
  CalendarCheckIcon,
} from '@phosphor-icons/react';

interface FichaFlotanteActivoProps {
  item: ActivoTelemetria;
  onCerrar: () => void;
}

export function FichaFlotanteActivo({ item, onCerrar }: FichaFlotanteActivoProps) {
  const activo = item.activo;

  return (
    <div className="absolute bottom-6 right-6 w-96 bg-panel/95 backdrop-blur-md border border-line-strong rounded-xl p-4 shadow-flotante z-20 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-base text-ink">
              {activo.codigo}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                item.estado === 'disponible'
                  ? 'bg-ok-soft text-ok'
                  : item.estado === 'en_alquiler'
                    ? 'bg-info-soft text-info'
                    : item.estado === 'en_mantenimiento'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-warn-soft text-warn'
              }`}
            >
              {ETIQUETA_ESTADO_VISIBLE[item.estado]}
            </span>
          </div>
          <p className="text-xs text-ink-2 font-medium mt-0.5">
            {activo.marca} {activo.modelo} {activo.anio ? `(${activo.anio})` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={onCerrar}
          className="p-1 rounded-md text-ink-3 hover:text-ink hover:bg-panel-2 transition-colors"
          aria-label="Cerrar ficha"
        >
          <XIcon size={18} />
        </button>
      </div>

      {/* Alerta de geocerca (RF-UBI-03) */}
      {item.fueraDeGeocerca ? (
        <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <WarningIcon size={16} />
            <span>Alerta de Geocerca Activa</span>
          </div>
          <p className="text-[11px] text-danger/90">
            El activo se encuentra a {item.distanciaObraMetros} m del centro de la obra (límite:{' '}
            {item.obra?.radioMetros} m).
          </p>
        </div>
      ) : item.obra ? (
        <div className="p-2 rounded-lg bg-ok-soft border border-ok/20 text-ok text-xs flex items-center gap-2">
          <CheckCircleIcon size={16} />
          <span>Dentro del perímetro de obra autorizado</span>
        </div>
      ) : null}

      {/* Datos telemétricos */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-panel-2 border border-line flex items-center gap-2">
          <GaugeIcon size={18} className="text-accent-fg" />
          <div>
            <p className="text-[10px] text-ink-3">Lectura actual</p>
            <p className="font-mono font-semibold text-ink">
              {activo.lecturaActual.toLocaleString('es-VE')} {item.categoria?.medidor ?? 'km'}
            </p>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-panel-2 border border-line flex items-center gap-2">
          <MapPinIcon size={18} className="text-info" />
          <div>
            <p className="text-[10px] text-ink-3">Sede base</p>
            <p className="font-semibold text-ink truncate">{item.sede?.ciudad ?? 'Base'}</p>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-panel-2 border border-line flex items-center gap-2">
          <ClockIcon size={18} className="text-ink-2" />
          <div>
            <p className="text-[10px] text-ink-3">Último reporte</p>
            <p className="font-mono font-semibold text-ink">
              {formatear(item.ubicacion.registradaEn, item.sede?.zonaHoraria ?? 'America/Caracas', 'HH:mm:ss')}
            </p>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-panel-2 border border-line flex items-center gap-2">
          <GasPumpIcon size={18} className="text-ink-2" />
          <div>
            <p className="text-[10px] text-ink-3">Motorización</p>
            <p className="font-semibold text-ink">
              <EtiquetaMotor tipo={activo.motor} />
            </p>
          </div>
        </div>
      </div>

      {/* Contrato de alquiler vinculado si aplica */}
      {item.reservaActual && (
        <div className="p-3 bg-panel-2 border border-line rounded-lg space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink flex items-center gap-1.5">
              <CalendarCheckIcon size={14} className="text-accent-fg" />
              <span>Contrato {item.reservaActual.codigo}</span>
            </span>
            <Link
              to={`/reservas/${item.reservaActual.id}`}
              className="text-accent-fg hover:underline flex items-center gap-1 text-[11px] font-medium"
            >
              <span>Ver reserva</span>
              <ArrowSquareOutIcon size={12} />
            </Link>
          </div>

          {item.cliente && (
            <p className="text-ink-2">
              Cliente: <span className="text-ink font-medium">{item.cliente.nombre}</span>
            </p>
          )}

          <div className="text-[11px] font-mono text-ink-3 flex items-center justify-between pt-1 border-t border-line">
            <span>Inicio: {item.reservaActual.inicio.slice(0, 10)}</span>
            <span>Fin: {item.reservaActual.fin.slice(0, 10)}</span>
          </div>
        </div>
      )}

      {/* Acciones directas */}
      <div className="flex items-center justify-between pt-1">
        <Link
          to={`/inventario/${activo.id}`}
          className="flex items-center gap-1.5 text-xs text-ink hover:text-accent-fg font-medium"
        >
          <span>Abrir ficha completa del activo</span>
          <ArrowSquareOutIcon size={14} />
        </Link>
      </div>
    </div>
  );
}
