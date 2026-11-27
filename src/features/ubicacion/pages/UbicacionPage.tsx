import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useCatalogos } from '@/api/hooks';
import { useTelemetria } from '../useTelemetria';
import { MapaFlota } from '../components/MapaFlota';
import { PanelLateralFlota } from '../components/PanelLateralFlota';
import { FichaFlotanteActivo } from '../components/FichaFlotanteActivo';
import {
  BroadcastIcon,
  BuildingsIcon,
  CircleDashedIcon,
  CrosshairIcon,
} from '@phosphor-icons/react';

export default function UbicacionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { sedes } = useCatalogos();
  const { items: activos, alertasGeocerca, cargando } = useTelemetria();

  const activoSeleccionadoId = searchParams.get('activoId');
  const [busqueda, setBusqueda] = useState('');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [sedeFiltro, setSedeFiltro] = useState<string>('todas');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [mostrarGeocercas, setMostrarGeocercas] = useState(true);
  const [mostrarSedes, setMostrarSedes] = useState(true);

  const activosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return activos.filter((item) => {
      if (soloAlertas && !item.fueraDeGeocerca) return false;
      if (sedeFiltro !== 'todas' && item.activo.sedeBaseId !== sedeFiltro) return false;
      if (estadoFiltro !== 'todos' && item.estado !== estadoFiltro) return false;
      if (!q) return true;
      return (
        item.activo.codigo.toLowerCase().includes(q) ||
        item.activo.modelo.toLowerCase().includes(q) ||
        item.activo.marca.toLowerCase().includes(q) ||
        (item.activo.placa?.toLowerCase().includes(q) ?? false) ||
        (item.cliente?.nombre.toLowerCase().includes(q) ?? false)
      );
    });
  }, [activos, soloAlertas, sedeFiltro, estadoFiltro, busqueda]);

  const handleSeleccionarActivo = (id: string | null) => {
    if (id) {
      setSearchParams({ activoId: id });
    } else {
      setSearchParams({});
    }
  };

  const activoSeleccionado = activos.find((a) => a.activo.id === activoSeleccionadoId) ?? null;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-canvas">
      {/* Barra de herramientas superior */}
      <div className="h-12 px-4 border-b border-line bg-panel flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-ok animate-pulse" />
            <h1 className="text-sm font-semibold text-ink">Mapa de Flota y Telemetría</h1>
          </div>
          <span className="text-ink-3">|</span>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink-2">
            <BroadcastIcon size={16} className="text-accent-fg" />
            <span>Frecuencia: actualización en vivo (4 s)</span>
          </div>
        </div>

        {/* Controles de capas */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMostrarGeocercas(!mostrarGeocercas)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-medium transition-colors ${
              mostrarGeocercas
                ? 'bg-accent-soft text-accent-fg border-accent/40'
                : 'bg-panel-2 text-ink-3 border-line hover:text-ink'
            }`}
          >
            <CircleDashedIcon size={14} />
            <span>Geocercas</span>
          </button>

          <button
            type="button"
            onClick={() => setMostrarSedes(!mostrarSedes)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-medium transition-colors ${
              mostrarSedes
                ? 'bg-accent-soft text-accent-fg border-accent/40'
                : 'bg-panel-2 text-ink-3 border-line hover:text-ink'
            }`}
          >
            <BuildingsIcon size={14} />
            <span>Sedes</span>
          </button>

          {activoSeleccionado && (
            <button
              type="button"
              onClick={() => handleSeleccionarActivo(null)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-panel-2 border border-line text-ink-2 hover:text-ink font-medium"
              title="Restablecer selección"
            >
              <CrosshairIcon size={14} />
              <span>Ver todo</span>
            </button>
          )}
        </div>
      </div>

      {/* Contenido: Panel lateral + Mapa */}
      <div className="relative flex flex-1 flex-col overflow-hidden md:flex-row">
        <PanelLateralFlota
          activos={activosFiltrados}
          totalActivos={activos.length}
          sedes={sedes}
          activoSeleccionadoId={activoSeleccionadoId}
          onSeleccionarActivo={handleSeleccionarActivo}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          soloAlertas={soloAlertas}
          onAlternarSoloAlertas={() => setSoloAlertas((v) => !v)}
          sedeFiltro={sedeFiltro}
          onCambiarSedeFiltro={setSedeFiltro}
          estadoFiltro={estadoFiltro}
          onCambiarEstadoFiltro={setEstadoFiltro}
          alertasGeocerca={alertasGeocerca}
        />

        <div className="relative min-h-[260px] flex-1 md:h-full">
          {cargando ? (
            <div className="w-full h-full flex items-center justify-center bg-canvas text-ink-3 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : (
            <MapaFlota
              activos={activosFiltrados}
              sedes={sedes}
              activoSeleccionadoId={activoSeleccionadoId}
              onSeleccionarActivo={handleSeleccionarActivo}
              mostrarGeocercas={mostrarGeocercas}
              mostrarSedes={mostrarSedes}
            />
          )}

          {/* Ficha flotante al hacer clic en un activo */}
          {activoSeleccionado && (
            <FichaFlotanteActivo
              item={activoSeleccionado}
              onCerrar={() => handleSeleccionarActivo(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
