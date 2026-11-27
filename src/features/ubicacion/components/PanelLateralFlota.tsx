import type { Sede } from '@/api/contrato';
import { ETIQUETA_ESTADO_VISIBLE } from '@/domain/estadoActivo';
import type { ActivoTelemetria } from '../useTelemetria';
import {
  MagnifyingGlassIcon,
  WarningIcon,
  BroadcastIcon,
  FadersIcon,
  FunnelIcon,
} from '@phosphor-icons/react';

interface PanelLateralFlotaProps {
  activos: ActivoTelemetria[];
  totalActivos: number;
  sedes: Sede[];
  activoSeleccionadoId: string | null;
  onSeleccionarActivo: (id: string | null) => void;
  busqueda: string;
  onCambiarBusqueda: (valor: string) => void;
  soloAlertas: boolean;
  onAlternarSoloAlertas: () => void;
  sedeFiltro: string;
  onCambiarSedeFiltro: (sedeId: string) => void;
  estadoFiltro: string;
  onCambiarEstadoFiltro: (estado: string) => void;
  alertasGeocerca: ActivoTelemetria[];
}

export function PanelLateralFlota({
  activos: filtrados,
  totalActivos,
  sedes,
  activoSeleccionadoId,
  onSeleccionarActivo,
  busqueda,
  onCambiarBusqueda,
  soloAlertas,
  onAlternarSoloAlertas,
  sedeFiltro,
  onCambiarSedeFiltro,
  estadoFiltro,
  onCambiarEstadoFiltro,
  alertasGeocerca,
}: PanelLateralFlotaProps) {
  return (
    <div className="z-10 flex max-h-[45%] w-full shrink-0 flex-col border-b border-line bg-panel shadow-panel md:h-full md:max-h-none md:w-80 md:border-b-0 md:border-r lg:w-96">
      {/* Cabecera del panel */}
      <div className="p-4 border-b border-line space-y-3 bg-panel-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BroadcastIcon size={20} className="text-accent-fg animate-pulse" />
            <h2 className="text-sm font-semibold text-ink">Telemetría de Flota</h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent-fg font-mono font-medium">
            {filtrados.length} / {totalActivos}
          </span>
        </div>

        {/* Buscador */}
        <div className="relative">
          <MagnifyingGlassIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            type="text"
            placeholder="Buscar por código, modelo, cliente..."
            value={busqueda}
            onChange={(e) => onCambiarBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-panel border border-line rounded-lg text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
          />
        </div>

        {/* Filtros rápidos de Sede y Estado */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label htmlFor="filtro-sede-ubicacion" className="block text-[11px] font-medium text-ink-3 mb-1 flex items-center gap-1">
              <FadersIcon size={12} />
              <span>Sede</span>
            </label>
            <select
              id="filtro-sede-ubicacion"
              value={sedeFiltro}
              onChange={(e) => onCambiarSedeFiltro(e.target.value)}
              className="w-full bg-panel border border-line rounded-md py-1 px-2 text-xs text-ink focus:outline-none focus:border-accent"
            >
              <option value="todas">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ciudad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtro-estado-ubicacion" className="block text-[11px] font-medium text-ink-3 mb-1 flex items-center gap-1">
              <FunnelIcon size={12} />
              <span>Estado</span>
            </label>
            <select
              id="filtro-estado-ubicacion"
              value={estadoFiltro}
              onChange={(e) => onCambiarEstadoFiltro(e.target.value)}
              className="w-full bg-panel border border-line rounded-md py-1 px-2 text-xs text-ink focus:outline-none focus:border-accent"
            >
              <option value="todos">Todos los estados</option>
              <option value="en_alquiler">En alquiler</option>
              <option value="disponible">Disponible</option>
              <option value="proxima_salida">Próxima salida</option>
              <option value="en_mantenimiento">En mantenimiento</option>
              <option value="fuera_de_servicio">Fuera de servicio</option>
            </select>
          </div>
        </div>

        {/* Alerta de Geocercas (RF-UBI-03) */}
        {alertasGeocerca.length > 0 && (
          <button
            type="button"
            onClick={onAlternarSoloAlertas}
            className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors ${
              soloAlertas
                ? 'bg-danger text-white'
                : 'bg-danger-soft text-danger hover:bg-danger/20 border border-danger/30'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <WarningIcon size={16} />
              <span>
                {alertasGeocerca.length} {alertasGeocerca.length === 1 ? 'alerta' : 'alertas'} de geocerca
              </span>
            </div>
            <span className="text-[11px] underline">
              {soloAlertas ? 'Ver todos' : 'Filtrar'}
            </span>
          </button>
        )}
      </div>

      {/* Lista desplazable de activos */}
      <div className="flex-1 overflow-y-auto divide-y divide-line">
        {filtrados.length === 0 ? (
          <div className="p-8 text-center text-ink-3 space-y-1">
            <p className="text-sm font-medium">No se encontraron activos</p>
            <p className="text-xs">Ajusta los filtros de búsqueda o sede.</p>
          </div>
        ) : (
          filtrados.map((item) => {
            const activo = item.activo;
            const seleccionado = activo.id === activoSeleccionadoId;

            return (
              <div
                key={activo.id}
                role="button"
                tabIndex={0}
                onClick={() => onSeleccionarActivo(seleccionado ? null : activo.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSeleccionarActivo(seleccionado ? null : activo.id);
                  }
                }}
                className={`w-full text-left p-3 transition-colors cursor-pointer flex flex-col gap-1.5 ${
                  seleccionado
                    ? 'bg-accent/10 border-l-2 border-accent'
                    : 'hover:bg-panel-2'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-ink">
                      {activo.codigo}
                    </span>
                    {item.fueraDeGeocerca && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-danger text-white font-medium flex items-center gap-1">
                        <WarningIcon size={12} />
                        <span>Fuera de obra</span>
                      </span>
                    )}
                    {item.estado === 'en_alquiler' && !item.fueraDeGeocerca && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-info-soft text-info font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-info animate-ping" />
                        <span>En tránsito</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-ink-2 font-medium">
                    {ETIQUETA_ESTADO_VISIBLE[item.estado]}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs text-ink-2">
                  <span className="font-medium text-ink truncate">
                    {activo.marca} {activo.modelo}
                  </span>
                  <span className="text-ink-3 text-[11px]">
                    {item.sede?.ciudad ?? 'Base'}
                  </span>
                </div>

                {item.reservaActual && item.cliente && (
                  <p className="text-[11px] text-ink-3 truncate">
                    Alquilado a: <span className="text-ink-2 font-medium">{item.cliente.nombre}</span>
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 pt-1 border-t border-line/50">
                  <span>
                    GPS: {item.ubicacion.lat.toFixed(4)}, {item.ubicacion.lng.toFixed(4)}
                  </span>
                  <span>
                    {activo.lecturaActual} {item.categoria?.medidor ?? 'km'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
