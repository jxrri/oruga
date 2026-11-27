import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowRightIcon,
  DotsThreeVerticalIcon,
  GasPumpIcon,
  GaugeIcon,
  MapPinIcon,
  PlusIcon,
  SquaresFourIcon,
  TruckIcon,
  WarningIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import type { Activo } from '@/api/contrato';
import { useCatalogos } from '@/api/hooks';
import { useAppDispatch, usePuede } from '@/app/hooks';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { formatearCapacidad, formatearLectura, formatearNumero, pluralizar } from '@/shared/lib/formato';
import { hashTexto, srcCategoria } from '@/shared/lib/imagenes';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  IconButton,
  Skeleton,
} from '@/shared/ui';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { EstadoActivoBadge } from '@/shared/ui/dominio';
import { contarFiltrosActivos, filtrosLimpiados } from '@/features/filtros/filtrosSlice';
import { useSincronizarFiltrosUrl } from '@/features/filtros/url';
import { useInventario } from '@/features/filtros/useInventario';
import { BarraFiltrosInventario } from '../components/BarraFiltrosInventario';
import { DialogoNuevoActivo } from '../components/DialogoNuevoActivo';
import { DialogoCambiarEstadoActivo } from '../components/DialogoCambiarEstadoActivo';
import { EtiquetaMotor } from '../components/EtiquetaMotor';

const REJILLA = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

export default function InventarioPage() {
  useSincronizarFiltrosUrl();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const ref = useEntrada<HTMLDivElement>();
  const puedeCrearActivo = usePuede('crear', 'activo');
  const puedeCambiarEstado = usePuede('cambiar_estado', 'activo');
  const { filas, total, conteos, filtros, cargando, error, reintentar } = useInventario();
  const { categorias, sedes } = useCatalogos();

  const [modoVista, setModoVista] = useState<'tarjetas' | 'tabla'>('tarjetas');
  const [modalNuevo, setModalNuevo] = useState(false);
  const [activoSeleccionadoParaEstado, setActivoSeleccionadoParaEstado] = useState<Activo | null>(null);

  // El conteo de registros va en la línea de descripción, no en una píldora junto al título
  const visibles =
    filas.length === total
      ? pluralizar(total, 'activo')
      : `${formatearNumero(filas.length)} de ${pluralizar(total, 'activo')}`;
  const descripcion =
    cargando || error
      ? 'Unidades, fichas técnicas y estados operativos.'
      : `${visibles}, ${conteos.estados['disponible'] ?? 0} disponibles, ${conteos.estados['en_alquiler'] ?? 0} en alquiler, ${conteos.estados['en_mantenimiento'] ?? 0} en taller.`;

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1400px]">
      <EncabezadoPagina
        titulo="Inventario"
        descripcion={descripcion}
        acciones={
          puedeCrearActivo && (
            <Button variante="primario" icono={PlusIcon} onClick={() => setModalNuevo(true)}>
              Nuevo activo
            </Button>
          )
        }
      />

      <div className="space-y-6">
        <section aria-label="Filtros" data-entrada>
          <BarraFiltrosInventario
            categorias={categorias}
            sedes={sedes}
            conteos={conteos}
            modoVista={modoVista}
            onCambioModoVista={setModoVista}
          />
        </section>

        <section aria-label="Activos" data-entrada>
          {cargando ? (
            modoVista === 'tarjetas' ? (
              <div className={REJILLA}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="tarjeta overflow-hidden">
                    <Skeleton className="aspect-[16/10] w-full rounded-none" />
                    <div className="space-y-2.5 p-4">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-[22px] w-24 rounded-full" />
                      </div>
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tarjeta overflow-hidden">
                <div className="h-10" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex h-[53px] items-center gap-6 border-t border-line px-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="hidden h-4 w-36 sm:block" />
                    <Skeleton className="ml-auto h-[22px] w-24 rounded-full" />
                  </div>
                ))}
              </div>
            )
          ) : error ? (
            <ErrorState error={error} onReintentar={reintentar} />
          ) : filas.length === 0 ? (
            <EmptyState
              icono={SquaresFourIcon}
              titulo="No se encontraron activos"
              descripcion="Pruebe ajustando los términos de búsqueda o eliminando los filtros seleccionados."
              accion={
                contarFiltrosActivos(filtros) > 0 ? (
                  <Button onClick={() => dispatch(filtrosLimpiados())}>Restablecer filtros</Button>
                ) : undefined
              }
            />
          ) : modoVista === 'tarjetas' ? (
            <ul className={REJILLA}>
              {filas.map(({ activo, categoria, sede, estado, vencimiento }) => {
                const imgUrl = srcCategoria(categoria.slug, hashTexto(activo.id), 'lg');
                const textoVencimiento = vencimiento?.vencido
                  ? vencimiento.faltanDias !== undefined && vencimiento.faltanDias < 0
                    ? `Vencido hace ${Math.abs(vencimiento.faltanDias)} días`
                    : 'Service vencido'
                  : vencimiento?.faltanDias !== undefined
                    ? `Vence en ${vencimiento.faltanDias} días`
                    : 'Service próximo';

                return (
                  <li
                    key={activo.id}
                    className="tarjeta flex flex-col overflow-hidden transition-colors duration-150 ease-salida hover:border-line-strong"
                  >
                    <div className="aspect-[16/10] w-full bg-panel-2">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={`${categoria.nombre} ${activo.marca} ${activo.modelo}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-ink-3">
                          <TruckIcon size={40} weight="duotone" aria-hidden />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[13px] text-ink-2">{activo.codigo}</span>
                        <EstadoActivoBadge estado={estado} />
                      </div>

                      <h3 className="mt-2.5 truncate text-[15px] font-semibold text-ink">
                        {activo.marca} {activo.modelo}
                      </h3>
                      <p className="truncate text-[13px] text-ink-3">
                        {categoria.nombre}, {activo.anio}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2 [&_svg]:text-ink-3">
                        <span className="inline-flex items-center gap-1.5">
                          <GaugeIcon size={16} aria-hidden />
                          {formatearCapacidad(activo.capacidad, categoria.unidadCapacidad)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <GasPumpIcon size={16} aria-hidden />
                          <EtiquetaMotor tipo={activo.motor} />
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPinIcon size={16} aria-hidden />
                          {sede.ciudad}
                        </span>
                      </div>

                      {/* El color solo avisa: vencido o dentro de la antelación. Lo demás es un dato más. */}
                      {vencimiento &&
                        (vencimiento.vencido || vencimiento.enAviso ? (
                          <Badge tono={vencimiento.vencido ? 'danger' : 'warn'} icono={WarningIcon} className="mt-3 self-start">
                            {textoVencimiento}
                          </Badge>
                        ) : (
                          <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-ink-3">
                            <WrenchIcon size={16} aria-hidden />
                            {textoVencimiento}
                          </p>
                        ))}

                      <div className="mt-auto flex items-center justify-between pt-3">
                        {puedeCambiarEstado ? (
                          <Button
                            variante="fantasma"
                            tamano="sm"
                            onClick={() => setActivoSeleccionadoParaEstado(activo)}
                            className="-ml-3"
                          >
                            Estado
                          </Button>
                        ) : (
                          <span />
                        )}
                        <Button asChild variante="fantasma" tamano="sm" className="-mr-3 text-ink">
                          <Link to={`/inventario/${activo.id}`}>
                            Ver ficha
                            <ArrowRightIcon size={16} aria-hidden />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="tarjeta overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="th-tabla">Unidad</th>
                      <th className="th-tabla">Categoría</th>
                      <th className="th-tabla">Sede base</th>
                      <th className="th-tabla">Capacidad</th>
                      <th className="th-tabla">Lectura</th>
                      <th className="th-tabla">Estado</th>
                      <th className="th-tabla">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map(({ activo, categoria, sede, estado }) => (
                      <tr
                        key={activo.id}
                        onClick={() => navigate(`/inventario/${activo.id}`)}
                        className="fila-tabla h-12 cursor-pointer"
                      >
                        <td className="px-4 py-1.5">
                          <Link
                            to={`/inventario/${activo.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-[13px] font-medium text-ink"
                          >
                            {activo.codigo}
                          </Link>
                          <div className="whitespace-nowrap text-[13px] text-ink-3">
                            {activo.marca} {activo.modelo} ({activo.anio})
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 text-ink">{categoria.nombre}</td>
                        <td className="whitespace-nowrap px-4 text-ink-2">
                          {sede.nombre} ({sede.ciudad})
                        </td>
                        <td className="tabular whitespace-nowrap px-4 text-ink">
                          {formatearCapacidad(activo.capacidad, categoria.unidadCapacidad)}
                        </td>
                        <td className="whitespace-nowrap px-4 font-mono text-[13px] text-ink-2">
                          {formatearLectura(activo.lecturaActual, categoria.medidor)}
                        </td>
                        <td className="px-4">
                          <EstadoActivoBadge estado={estado} />
                        </td>
                        <td className="px-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <IconButton
                                icono={DotsThreeVerticalIcon}
                                aria-label={`Acciones de ${activo.codigo}`}
                                tamano="sm"
                                tooltip={false}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/inventario/${activo.id}`)}>
                                Ver ficha completa
                              </DropdownMenuItem>
                              {puedeCambiarEstado && (
                                <DropdownMenuItem onClick={() => setActivoSeleccionadoParaEstado(activo)}>
                                  Cambiar estado operativo
                                </DropdownMenuItem>
                              )}
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
        </section>
      </div>

      <DialogoNuevoActivo
        abierto={modalNuevo}
        onCerrar={() => setModalNuevo(false)}
        categorias={categorias}
        sedes={sedes}
      />

      <DialogoCambiarEstadoActivo
        activo={activoSeleccionadoParaEstado}
        abierto={!!activoSeleccionadoParaEstado}
        onCerrar={() => setActivoSeleccionadoParaEstado(null)}
      />
    </div>
  );
}
