import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  GasPumpIcon,
  GaugeIcon,
  PlusIcon,
  SquaresFourIcon,
  TruckIcon,
  WarningIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import type { Activo } from '@/api/contrato';
import { useCatalogos } from '@/api/hooks';
import { hashTexto, srcCategoria } from '@/shared/lib/imagenes';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { EstadoActivoBadge } from '@/shared/ui/dominio';
import { useInventario } from '@/features/filtros/useInventario';
import { BarraFiltrosInventario } from '../components/BarraFiltrosInventario';
import { DialogoNuevoActivo } from '../components/DialogoNuevoActivo';
import { DialogoCambiarEstadoActivo } from '../components/DialogoCambiarEstadoActivo';

export default function InventarioPage() {
  const navigate = useNavigate();
  const { filas, total, conteos, cargando, error, reintentar } = useInventario();
  const { categorias, sedes } = useCatalogos();

  const [modoVista, setModoVista] = useState<'tarjetas' | 'tabla'>('tarjetas');
  const [modalNuevo, setModalNuevo] = useState(false);
  const [activoSeleccionadoParaEstado, setActivoSeleccionadoParaEstado] = useState<Activo | null>(null);

  // Estadísticas rápidas para la cabecera
  const stats = useMemo(() => {
    const operativos = conteos.estados['disponible'] ?? 0;
    const enAlquiler = conteos.estados['en_alquiler'] ?? 0;
    const enTaller = conteos.estados['en_mantenimiento'] ?? 0;
    return { operativos, enAlquiler, enTaller };
  }, [conteos]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Cabecera de Página */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/60 px-6 py-4 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Inventario de Flota</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
              {filas.length} / {total} activos
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestión de unidades, fichas técnicas, medidores de desgaste y estados operativos.
          </p>
        </div>

        {/* Métricas y Acción Principal */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 border-r border-border/60 pr-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircleIcon className="h-4 w-4" />
              <span>{stats.operativos} Disponibles</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-400">
              <TruckIcon className="h-4 w-4" />
              <span>{stats.enAlquiler} En Alquiler</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <WrenchIcon className="h-4 w-4" />
              <span>{stats.enTaller} En Taller</span>
            </div>
          </div>

          <Button
            variante="primario"
            icono={PlusIcon}
            onClick={() => setModalNuevo(true)}
            className="text-xs font-bold"
          >
            Nuevo Activo
          </Button>
        </div>
      </div>

      {/* Barra de Filtros Multicriterio */}
      <BarraFiltrosInventario
        categorias={categorias}
        sedes={sedes}
        conteos={conteos}
        modoVista={modoVista}
        onCambioModoVista={setModoVista}
      />

      {/* Contenido Principal */}
      <div className="flex-1 p-6">
        {cargando ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <Skeleton className="h-36 w-full rounded-lg" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState onReintentar={reintentar} />
        ) : filas.length === 0 ? (
          <EmptyState
            icono={SquaresFourIcon}
            titulo="No se encontraron activos"
            descripcion="Pruebe ajustando los términos de búsqueda o eliminando los filtros seleccionados."
          />
        ) : modoVista === 'tarjetas' ? (
          /* Vista en Cuadrícula de Tarjetas */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filas.map(({ activo, categoria, sede, estado, vencimiento }) => {
              const imgUrl = srcCategoria(categoria.slug, hashTexto(activo.id), 'lg');

              return (
                <div
                  key={activo.id}
                  className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div>
                    {/* Imagen y Badges superiores */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border/40 bg-muted/30 mb-3">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={activo.codigo}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <TruckIcon className="h-12 w-12 text-muted-foreground/40" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        <EstadoActivoBadge estado={estado} />
                      </div>

                      <div className="absolute top-2 right-2">
                        <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-mono font-bold text-white backdrop-blur-xs">
                          {sede.ciudad}
                        </span>
                      </div>
                    </div>

                    {/* Títulos y Código */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-black text-foreground group-hover:text-primary transition-colors">
                          {activo.codigo}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {activo.anio}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-foreground truncate">
                        {activo.marca} {activo.modelo}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {categoria.nombre}
                      </p>
                    </div>

                    {/* Ficha rápida de especificaciones */}
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/40 pt-2.5 text-[11px] font-mono text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <GaugeIcon className="h-3.5 w-3.5 text-primary" />
                        <span>
                          {activo.capacidad} {categoria.unidadCapacidad}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <GasPumpIcon className="h-3.5 w-3.5 text-primary capitalize" />
                        <span>{activo.motor}</span>
                      </div>
                    </div>

                    {/* Alerta de mantenimiento próximo si aplica */}
                    {vencimiento && (
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[10px] text-amber-400">
                        <WarningIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {vencimiento.faltanDias !== undefined ? `Vence en ${vencimiento.faltanDias} días` : 'Service próximo'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Acciones de Tarjeta */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                    <Button
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => setActivoSeleccionadoParaEstado(activo)}
                      className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                    >
                      Estado
                    </Button>

                    <Button
                      variante="secundario"
                      tamano="sm"
                      iconoFin={ArrowRightIcon}
                      onClick={() => navigate(`/inventario/${activo.id}`)}
                      className="text-[11px] h-7 px-2.5 font-bold"
                    >
                      Ver Ficha
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista en Tabla de Datos */
          <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-md shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/30 font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Sede Base</th>
                    <th className="px-4 py-3">Capacidad</th>
                    <th className="px-4 py-3">Lectura</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filas.map(({ activo, categoria, sede, estado }) => (
                    <tr
                      key={activo.id}
                      onClick={() => navigate(`/inventario/${activo.id}`)}
                      className="cursor-pointer hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono">
                        <div className="font-black text-foreground">{activo.codigo}</div>
                        <div className="text-[11px] text-muted-foreground font-sans">
                          {activo.marca} {activo.modelo} ({activo.anio})
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-foreground font-medium">
                        {categoria.nombre}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {sede.nombre} ({sede.ciudad})
                      </td>
                      <td className="px-4 py-2.5 font-mono text-foreground">
                        {activo.capacidad} {categoria.unidadCapacidad}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {activo.lecturaActual} {categoria.medidor}
                      </td>
                      <td className="px-4 py-2.5">
                        <EstadoActivoBadge estado={estado} />
                      </td>
                      <td
                        className="px-4 py-2.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <DotsThreeVerticalIcon className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/inventario/${activo.id}`)}>
                              Ver ficha completa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setActivoSeleccionadoParaEstado(activo)}
                            >
                              Cambiar estado operativo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nuevo Activo */}
      <DialogoNuevoActivo
        abierto={modalNuevo}
        onCerrar={() => setModalNuevo(false)}
        categorias={categorias}
        sedes={sedes}
      />

      {/* Modal Cambio de Estado Operativo */}
      <DialogoCambiarEstadoActivo
        activo={activoSeleccionadoParaEstado}
        abierto={!!activoSeleccionadoParaEstado}
        onCerrar={() => setActivoSeleccionadoParaEstado(null)}
      />
    </div>
  );
}
