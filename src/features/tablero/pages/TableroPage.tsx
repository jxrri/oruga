import { Link } from 'react-router';
import { useMetricasTablero } from '../useMetricasTablero';
import { GraficoDistribucionFlota } from '../components/GraficoDistribucionFlota';
import { GraficoUtilizacionCategorias } from '../components/GraficoUtilizacionCategorias';
import { GraficoTendenciaIngresos } from '../components/GraficoTendenciaIngresos';
import { PanelAlertasAccionables } from '../components/PanelAlertasAccionables';
import { TablaOperacionesHoy } from '../components/TablaOperacionesHoy';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { Stat } from '@/shared/ui/Stat';
import { Monto } from '@/shared/ui/Monto';
import {
  ChartPieIcon,
  TruckIcon,
  WrenchIcon,
  WarningIcon,
  CoinsIcon,
  CalendarCheckIcon,
  MapTrifoldIcon,
  PlusIcon,
} from '@phosphor-icons/react';

export default function TableroPage() {
  const {
    kpis,
    distribucionEstados,
    utilizacionPorCategoria,
    ingresosMensuales,
    alertasAccionables,
    operacionesHoy,
    cargando,
  } = useMetricasTablero();

  if (cargando) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-panel-2 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-panel-2 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-panel-2 rounded-xl animate-pulse" />
          <div className="h-80 lg:col-span-2 bg-panel-2 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Encabezado ejecutivo */}
      <EncabezadoPagina
        titulo="Tablero de Control"
        descripcion="Visión operativa en tiempo real de flota, tasa de utilización, alertas y telemetría."
        acciones={
          <div className="flex items-center gap-2">
            <Link
              to="/ubicacion"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel border border-line hover:border-line-strong hover:bg-panel-2 text-xs font-medium text-ink transition-colors"
            >
              <MapTrifoldIcon size={16} className="text-info" />
              <span>Mapa de Flota</span>
            </Link>

            <Link
              to="/planificador"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel border border-line hover:border-line-strong hover:bg-panel-2 text-xs font-medium text-ink transition-colors"
            >
              <CalendarCheckIcon size={16} className="text-accent-fg" />
              <span>Planificador</span>
            </Link>

            <Link
              to="/reservas/nueva"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-ink hover:opacity-95 text-xs font-medium transition-colors"
            >
              <PlusIcon size={16} weight="bold" />
              <span>Nueva Reserva</span>
            </Link>
          </div>
        }
      />

      {/* Tarjetas de Indicadores Clave (KPIs con GSAP animate) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Stat
          etiqueta="Utilización de Flota"
          valor={kpis.tasaUtilizacionGlobal}
          formato={(n) => `${n} %`}
          icono={ChartPieIcon}
          tono={kpis.tasaUtilizacionGlobal >= 65 ? 'ok' : 'warn'}
          detalle="Horas reservadas sobre disponibles"
        />

        <Stat
          etiqueta="En Alquiler"
          valor={kpis.activosEnAlquiler}
          icono={TruckIcon}
          tono="info"
          detalle={`${kpis.activosOperativos} disponibles en patio`}
          to="/inventario"
        />

        <Stat
          etiqueta="Mantenimientos"
          valor={kpis.mantenimientosVencidos}
          icono={WrenchIcon}
          tono={kpis.mantenimientosVencidos > 0 ? 'danger' : 'neutro'}
          detalle={
            kpis.mantenimientosVencidos > 0
              ? `${kpis.mantenimientosVencidos} vencidos (${kpis.mantenimientosPorVencer} por vencer)`
              : 'Flota con planes al día'
          }
          to="/mantenimiento"
        />

        <Stat
          etiqueta="Conflictos Abiertos"
          valor={kpis.conflictosAbiertosCount}
          icono={WarningIcon}
          tono={kpis.conflictosAbiertosCount > 0 ? 'warn' : 'ok'}
          detalle={
            kpis.conflictosAbiertosCount > 0
              ? 'Solapes o activos no operativos'
              : 'Sin colisiones en calendario'
          }
          to="/planificador"
        />

        <div className="p-4 rounded-xl bg-panel border border-line shadow-panel flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-3">
            <span>Facturación del Mes</span>
            <CoinsIcon size={18} className="text-accent-fg" />
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-bold font-mono text-ink tracking-tight">
              <Monto
                centavos={kpis.ingresosProyectadosCentavos}
                disposicion="apilado"
                classNameBs="text-[0.76em]"
              />
            </div>
          </div>
          <p className="text-[11px] text-ink-2 truncate">
            Proyección de contratos del mes civil
          </p>
        </div>
      </div>

      {/* Gráficos de Flota y Ocupación */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución de estados */}
        <div className="bg-panel border border-line rounded-xl shadow-panel p-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-line pb-3 mb-2">
            <div>
              <h2 className="text-sm font-semibold text-ink">Estado de la Flota</h2>
              <p className="text-xs text-ink-3">Distribución operativa en tiempo real</p>
            </div>
            <Link
              to="/inventario"
              className="text-xs text-accent-fg hover:underline font-medium"
            >
              Inventario →
            </Link>
          </div>
          <div className="flex-1 min-h-64">
            <GraficoDistribucionFlota datos={distribucionEstados} />
          </div>
        </div>

        {/* Utilización por categoría */}
        <div className="bg-panel border border-line rounded-xl shadow-panel p-4 flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line pb-3 mb-2">
            <div>
              <h2 className="text-sm font-semibold text-ink">Ocupación por Categoría</h2>
              <p className="text-xs text-ink-3">Porcentaje de horas reservadas vs capacidad (30 días)</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-panel-2 border border-line text-ink-2">
              Media: {kpis.tasaUtilizacionGlobal} %
            </span>
          </div>
          <div className="flex-1 min-h-64">
            <GraficoUtilizacionCategorias datos={utilizacionPorCategoria} />
          </div>
        </div>
      </div>

      {/* Tendencia de Ingresos */}
      <div className="bg-panel border border-line rounded-xl shadow-panel p-4">
        <div className="flex items-center justify-between border-b border-line pb-3 mb-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">Tendencia de Ingresos Estimados</h2>
            <p className="text-xs text-ink-3">Evolución de contratos por período mensual (USD)</p>
          </div>
          <span className="text-xs text-ink-3 font-mono">
            Ventana global de demostración
          </span>
        </div>
        <GraficoTendenciaIngresos datos={ingresosMensuales} />
      </div>

      {/* Alertas Accionables y Operaciones de Hoy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PanelAlertasAccionables alertas={alertasAccionables} />
        <TablaOperacionesHoy operaciones={operacionesHoy} />
      </div>
    </div>
  );
}
