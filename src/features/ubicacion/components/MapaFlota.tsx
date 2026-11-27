import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Sede } from '@/api/contrato';
import { ETIQUETA_ESTADO_VISIBLE, type EstadoVisible } from '@/domain/estadoActivo';
import type { ActivoTelemetria } from '../useTelemetria';
import { Link } from 'react-router';
import { ArrowSquareOutIcon, WarningIcon, MapPinIcon } from '@phosphor-icons/react';

interface MapaFlotaProps {
  activos: ActivoTelemetria[];
  sedes: Sede[];
  activoSeleccionadoId: string | null;
  onSeleccionarActivo: (id: string | null) => void;
  mostrarGeocercas: boolean;
  mostrarSedes: boolean;
}

const COLOR_ESTADO: Record<EstadoVisible, { bg: string; border: string; text: string }> = {
  disponible: { bg: '#10b981', border: '#059669', text: '#ffffff' },
  en_alquiler: { bg: '#0284c7', border: '#0369a1', text: '#ffffff' },
  proxima_salida: { bg: '#f59e0b', border: '#d97706', text: '#ffffff' },
  en_mantenimiento: { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' },
  fuera_de_servicio: { bg: '#f43f5e', border: '#e11d48', text: '#ffffff' },
  baja: { bg: '#64748b', border: '#475569', text: '#ffffff' },
};

function crearIconoActivo(activo: ActivoTelemetria, seleccionado: boolean) {
  const color = COLOR_ESTADO[activo.estado];
  const esAlquiler = activo.estado === 'en_alquiler';
  const esAlerta = activo.fueraDeGeocerca;

  const html = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      ${
        esAlerta
          ? `<span style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background: rgba(244, 63, 94, 0.4); animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
          : esAlquiler
            ? `<span style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background: rgba(2, 132, 199, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
            : ''
      }
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 7px;
        background: ${seleccionado ? '#facc15' : '#090d16'};
        color: ${seleccionado ? '#000000' : '#ffffff'};
        border: 2px solid ${esAlerta ? '#f43f5e' : color.bg};
        border-radius: 9999px;
        font-family: var(--font-mono, monospace);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: -0.02em;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        transform: scale(${seleccionado ? '1.15' : '1'});
        transition: transform 0.15s ease-out;
      ">
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background-color: ${color.bg};
        "></span>
        <span>${activo.activo.codigo}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-activo-icon',
    iconSize: [60, 28],
    iconAnchor: [30, 14],
    popupAnchor: [0, -16],
  });
}

function crearIconoSede(sede: Sede) {
  const html = `
    <div style="
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: #181d28;
      color: #f1f5f9;
      border: 1.5px solid #3b82f6;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(0,0,0,0.45);
      white-space: nowrap;
    ">
      <svg width="14" height="14" viewBox="0 0 256 256" fill="#3b82f6">
        <path d="M240,192h-8V96a8,8,0,0,0-2.4-5.71l-88-85.34a8,8,0,0,0-11.2,0l-88,85.34A8,8,0,0,0,40,96V192H32a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM56,98.69,136,21l80,77.69V192H184V136a8,8,0,0,0-8-8H96a8,8,0,0,0-8,8v56H56ZM168,192H104V144h64Z"/>
      </svg>
      <span>${sede.ciudad}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-sede-icon',
    iconSize: [110, 28],
    iconAnchor: [55, 14],
  });
}

function ControladorMapa({
  activoSeleccionado,
}: {
  activoSeleccionado: ActivoTelemetria | null;
}) {
  const map = useMap();
  const previoId = useRef<string | null>(null);

  useEffect(() => {
    if (!activoSeleccionado) return;
    if (previoId.current !== activoSeleccionado.activo.id) {
      previoId.current = activoSeleccionado.activo.id;
      map.flyTo(
        [activoSeleccionado.ubicacion.lat, activoSeleccionado.ubicacion.lng],
        14,
        { duration: 1.2 },
      );
    }
  }, [activoSeleccionado, map]);

  return null;
}

export function MapaFlota({
  activos,
  sedes,
  activoSeleccionadoId,
  onSeleccionarActivo,
  mostrarGeocercas,
  mostrarSedes,
}: MapaFlotaProps) {
  // Centro inicial de Venezuela (abarcando Caracas, Maracaibo, Valencia)
  const centroInicial: [number, number] = [10.25, -68.5];

  const activoSeleccionado = useMemo(
    () => activos.find((a) => a.activo.id === activoSeleccionadoId) ?? null,
    [activos, activoSeleccionadoId],
  );

  const apiKeyCarto = (import.meta.env.VITE_CARTO_API_KEY as string | undefined)?.trim();
  const urlTiles = apiKeyCarto
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${apiKeyCarto}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="relative w-full h-full bg-canvas overflow-hidden">
      <MapContainer
        center={centroInicial}
        zoom={7}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={urlTiles}
          maxZoom={19}
        />

        <ControladorMapa activoSeleccionado={activoSeleccionado} />

        {/* Sedes operativas */}
        {mostrarSedes &&
          sedes.map((sede) => (
            <Marker
              key={sede.id}
              position={[sede.coordenadas.lat, sede.coordenadas.lng]}
              icon={crearIconoSede(sede)}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-2 space-y-1 text-xs">
                  <p className="font-semibold text-ink">{sede.nombre}</p>
                  <p className="text-ink-2">Ciudad: {sede.ciudad}</p>
                  <p className="text-ink-3 font-mono">
                    {sede.coordenadas.lat.toFixed(4)}, {sede.coordenadas.lng.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Activos rastreados */}
        {activos.map((item) => {
          const seleccionado = item.activo.id === activoSeleccionadoId;
          return (
            <Marker
              key={item.activo.id}
              position={[item.ubicacion.lat, item.ubicacion.lng]}
              icon={crearIconoActivo(item, seleccionado)}
              eventHandlers={{
                click: () => onSeleccionarActivo(item.activo.id),
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-3 space-y-2 min-w-56 font-sans">
                  <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
                    <span className="font-mono font-bold text-sm text-ink">
                      {item.activo.codigo}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: COLOR_ESTADO[item.estado].bg + '20',
                        color: COLOR_ESTADO[item.estado].bg,
                      }}
                    >
                      {ETIQUETA_ESTADO_VISIBLE[item.estado]}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-ink">
                      {item.activo.marca} {item.activo.modelo}
                    </p>
                    <p className="text-ink-2">Placa: {item.activo.placa ?? 'N/A'}</p>
                    <p className="text-ink-2">
                      Lectura: {item.activo.lecturaActual.toLocaleString('es-VE')}{' '}
                      {item.categoria?.medidor ?? 'km'}
                    </p>
                    <p className="text-ink-3 font-mono text-[11px]">
                      GPS: {item.ubicacion.lat.toFixed(5)}, {item.ubicacion.lng.toFixed(5)}
                    </p>
                  </div>

                  {item.fueraDeGeocerca && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-danger-soft text-danger text-xs rounded-md font-medium">
                      <WarningIcon size={16} />
                      <span>¡Fuera del radio de obra autorizado!</span>
                    </div>
                  )}

                  {item.reservaActual && (
                    <div className="pt-2 border-t border-line space-y-1 text-xs">
                      <p className="text-ink-2">
                        Contrato: <span className="font-mono text-ink">{item.reservaActual.codigo}</span>
                      </p>
                      {item.cliente && (
                        <p className="text-ink-2 truncate">Cliente: {item.cliente.nombre}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          to={`/reservas/${item.reservaActual.id}`}
                          className="flex items-center gap-1 text-accent-fg hover:underline font-medium text-xs"
                        >
                          <span>Ver reserva</span>
                          <ArrowSquareOutIcon size={12} />
                        </Link>
                        <span className="text-ink-3">·</span>
                        <Link
                          to={`/inventario/${item.activo.id}`}
                          className="flex items-center gap-1 text-ink-2 hover:text-ink font-medium text-xs"
                        >
                          <span>Ficha activo</span>
                          <ArrowSquareOutIcon size={12} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Geocercas de obra autorizadas (RF-UBI-03) */}
        {mostrarGeocercas &&
          activos
            .filter((a) => a.obra !== null)
            .map((item) => {
              const obra = item.obra!;
              const esAlerta = item.fueraDeGeocerca;
              return (
                <Circle
                  key={`geocerca-${item.activo.id}`}
                  center={[obra.lat, obra.lng]}
                  radius={obra.radioMetros}
                  pathOptions={{
                    color: esAlerta ? '#f43f5e' : '#0284c7',
                    fillColor: esAlerta ? '#f43f5e' : '#0284c7',
                    fillOpacity: esAlerta ? 0.15 : 0.08,
                    weight: esAlerta ? 2 : 1.5,
                    dashArray: '6, 6',
                  }}
                >
                  <Popup>
                    <div className="p-2 space-y-1 text-xs">
                      <div className="flex items-center gap-1 text-ink font-semibold">
                        <MapPinIcon size={14} />
                        <span>{obra.nombre}</span>
                      </div>
                      <p className="text-ink-2">Radio permitido: {obra.radioMetros} m</p>
                      <p className="text-ink-2">
                        Activo asignado:{' '}
                        <span className="font-mono font-medium">{item.activo.codigo}</span>
                      </p>
                      {item.distanciaObraMetros !== null && (
                        <p
                          className={`font-medium ${
                            esAlerta ? 'text-danger' : 'text-ok'
                          }`}
                        >
                          Distancia actual: {item.distanciaObraMetros} m
                        </p>
                      )}
                    </div>
                  </Popup>
                </Circle>
              );
            })}
      </MapContainer>
    </div>
  );
}
