import { Link } from 'react-router';
import { usePuede, useUsuario } from '@/app/hooks';
import { DIAS_SERIE, useMetricasTablero } from '../useMetricasTablero';
import { AnillosFlota } from '../components/AnillosFlota';
import { GraficoDistribucionFlota } from '../components/GraficoDistribucionFlota';
import { GraficoUtilizacionCategorias } from '../components/GraficoUtilizacionCategorias';
import { GraficoTendenciaIngresos } from '../components/GraficoTendenciaIngresos';
import { PanelAlertasAccionables } from '../components/PanelAlertasAccionables';
import { TablaOperacionesHoy } from '../components/TablaOperacionesHoy';
import { Tarjeta, type EstadoBloque } from '../components/Tarjeta';
import { TarjetaKpi } from '../components/TarjetaKpi';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { formatearMonto, formatearNumero } from '@/shared/lib/formato';
import { Button, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { Monto } from '@/shared/ui/Monto';
import { CalendarCheckIcon, MapTrifoldIcon, PlusIcon, TruckIcon } from '@phosphor-icons/react';

/** Filas de esqueleto con la forma de un reporte: cifra y barras. */
const esqueletoReporte = (
  <div className="space-y-3">
    <Skeleton className="mb-5 h-8 w-28" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <Skeleton key={i} className="h-5 w-full" />
    ))}
  </div>
);

export default function TableroPage() {
  const usuario = useUsuario();
  const puedeCrearReserva = usePuede('crear', 'reserva');
  const {
    kpis,
    series,
    anillos,
    distribucionEstados,
    utilizacionPorCategoria,
    ingresosMensuales,
    alertasAccionables,
    operacionesHoy,
    cargando,
    error,
    reintentar,
  } = useMetricasTablero();
  const ref = useEntrada<HTMLDivElement>();

  const estado: EstadoBloque = { cargando, error, onReintentar: reintentar };
  const nombre = usuario?.nombre.split(' ')[0];

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1400px]">
      <EncabezadoPagina
        titulo={nombre ? `Hola, ${nombre}` : 'Hola'}
        descripcion="Visión operativa en tiempo real de flota, tasa de utilización, alertas y telemetría."
        acciones={
          <>
            <Button asChild>
              <Link to="/ubicacion">
                <MapTrifoldIcon size={16} className="text-ink-3" aria-hidden />
                Mapa de flota
              </Link>
            </Button>
            <Button asChild>
              <Link to="/planificador">
                <CalendarCheckIcon size={16} className="text-ink-3" aria-hidden />
                Planificador
              </Link>
            </Button>
            {puedeCrearReserva && (
              <Button asChild variante="primario">
                <Link to="/reservas/nueva">
                  <PlusIcon size={16} aria-hidden />
                  Nueva reserva
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-6">
        {/* Indicadores: cifra actual y su serie diaria, ambas calculadas con datos cargados */}
        <div data-entrada className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {error ? (
            <ErrorState className="col-span-full" error={error} onReintentar={reintentar} />
          ) : (
            <>
              <TarjetaKpi
                etiqueta="En alquiler"
                valor={kpis.activosEnAlquiler}
                detalle={`${formatearNumero(kpis.activosOperativos)} disponibles en patio`}
                color="verde"
                serie={series.activosConReserva}
                etiquetaSerie={`Activos con reserva por día, últimos ${DIAS_SERIE} días`}
                to="/inventario"
                cargando={cargando}
              />
              <TarjetaKpi
                etiqueta="Facturación del mes"
                valor={
                  <Monto centavos={kpis.ingresosProyectadosCentavos} entero disposicion="apilado" classNameBs="text-xs font-normal" />
                }
                detalle="Proyección del mes civil"
                color="azul"
                serie={series.montoPorInicioUsd}
                etiquetaSerie={`Monto por día de inicio, últimos ${DIAS_SERIE} días`}
                formatoSerie={(usd) => formatearMonto(usd * 100, { entero: true })}
                cargando={cargando}
              />
              <TarjetaKpi
                etiqueta="Servicios vencidos"
                valor={kpis.mantenimientosVencidos}
                detalle={`${formatearNumero(kpis.mantenimientosPorVencer)} por vencer`}
                color="violeta"
                serie={series.ordenesEnTaller}
                etiquetaSerie={`Órdenes en taller por día, últimos ${DIAS_SERIE} días`}
                to="/mantenimiento"
                cargando={cargando}
              />
              <TarjetaKpi
                etiqueta="Conflictos abiertos"
                valor={kpis.conflictosAbiertosCount}
                detalle="Solapes o activos no operativos"
                color="naranja"
                serie={series.conflictosPorInicio}
                etiquetaSerie={`Por día de inicio de la reserva, próximos ${DIAS_SERIE} días`}
                indiceHoy={0}
                to="/planificador"
                cargando={cargando}
              />
            </>
          )}
        </div>

        {/* Analítica: tres proporciones de la flota y el monto mensual por estado */}
        <div data-entrada>
          <Tarjeta
            titulo="Analítica de la flota"
            descripcion="Proporciones actuales de la flota y monto estimado por mes de inicio de la reserva (USD)"
            estado={estado}
            esqueleto={
              <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
                <div className="grid grid-cols-3 justify-items-center gap-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="size-20 rounded-full sm:size-24 xl:size-28" />
                  ))}
                </div>
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            {kpis.totalActivos === 0 ? (
              <EmptyState
                icono={TruckIcon}
                titulo="Aún no hay activos"
                descripcion="Registra activos en el inventario para ver la analítica de la flota."
                className="py-8"
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
                <AnillosFlota anillos={anillos} />
                <GraficoTendenciaIngresos datos={ingresosMensuales} />
              </div>
            )}
          </Tarjeta>
        </div>

        {/* Reportes: cifra y barras */}
        <div data-entrada className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Tarjeta
            titulo="Estado de la flota"
            descripcion="Activos por estado en este momento"
            accion={
              <Link to="/inventario" className="text-[13px] font-medium text-accent-fg hover:underline">
                Ver inventario
              </Link>
            }
            estado={estado}
            esqueleto={esqueletoReporte}
          >
            <GraficoDistribucionFlota datos={distribucionEstados} />
          </Tarjeta>

          <Tarjeta
            titulo="Ocupación por categoría"
            descripcion="Horas reservadas sobre horas disponibles, últimos 30 días"
            estado={estado}
            esqueleto={esqueletoReporte}
          >
            <GraficoUtilizacionCategorias datos={utilizacionPorCategoria} media={kpis.tasaUtilizacionGlobal} />
          </Tarjeta>
        </div>

        {/* Alertas accionables y operaciones de hoy */}
        <div data-entrada className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PanelAlertasAccionables alertas={alertasAccionables} estado={estado} />
          <TablaOperacionesHoy operaciones={operacionesHoy} estado={estado} />
        </div>
      </div>
    </div>
  );
}
