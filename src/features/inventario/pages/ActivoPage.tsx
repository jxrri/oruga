import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  ClockCounterClockwiseIcon,
  ShieldCheckIcon,
  TruckIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import type { MomentoInspeccion, TipoDocumento } from '@/api/contrato';
import { useGetActivoQuery, useGetCategoriasQuery, useGetSedesQuery, useGetUsuariosQuery } from '@/api/baseApi';
import { usePuede } from '@/app/hooks';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { cn } from '@/shared/lib/cn';
import { formatearCivil, formatear } from '@/shared/lib/fechas';
import { formatearCapacidad, formatearLectura, formatearNumero } from '@/shared/lib/formato';
import { hashTexto, srcCategoria } from '@/shared/lib/imagenes';
import { Button, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/Tabs';
import { EstadoReservaBadge, ResultadoInspeccionBadge } from '@/shared/ui/dominio';
import { DialogoCambiarEstadoActivo } from '../components/DialogoCambiarEstadoActivo';
import { EstadoOperativoBadge } from '../components/EstadoOperativoBadge';
import { EtiquetaMotor } from '../components/EtiquetaMotor';

const PAGINA = 'mx-auto w-full max-w-[1400px]';
const DOS_COLUMNAS = 'grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_20rem]';

const ETIQUETA_DOCUMENTO: Record<TipoDocumento, string> = {
  seguro: 'Seguro',
  permiso: 'Permiso',
  certificacion: 'Certificación',
};

const ETIQUETA_MOMENTO: Record<MomentoInspeccion, string> = {
  salida: 'Salida',
  devolucion: 'Devolución',
  rutina: 'Rutina',
};

/** Fila de una ficha de datos: etiqueta a la izquierda, valor a la derecha (mono solo si es un dato que se copia) */
function Dato({ etiqueta, children, mono }: { etiqueta: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-ink-3">{etiqueta}</dt>
      <dd className={cn('min-w-0 text-right text-ink', mono && 'font-mono text-[13px]')}>{children}</dd>
    </div>
  );
}

export default function ActivoPage() {
  const { id } = useParams<{ id: string }>();
  const puedeCambiarEstado = usePuede('cambiar_estado', 'activo');
  const puedeCrearReserva = usePuede('crear', 'reserva');

  const { data: detalle, isLoading, error, refetch } = useGetActivoQuery(id ?? '');
  const { data: categorias = [] } = useGetCategoriasQuery();
  const { data: sedes = [] } = useGetSedesQuery();
  const { data: usuarios = [] } = useGetUsuariosQuery();

  const [modalEstado, setModalEstado] = useState(false);
  const [tabActiva, setTabActiva] = useState<'tecnica' | 'reservas' | 'inspecciones' | 'mantenimiento' | 'historial'>('tecnica');

  // La entrada se repite cuando la ficha real reemplaza a los esqueletos
  const ref = useEntrada<HTMLDivElement>([isLoading]);

  if (isLoading) {
    return (
      <div ref={ref} className={PAGINA}>
        <div className="mb-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <div className={DOS_COLUMNAS}>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-5 w-52" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full max-w-2xl" />
            ))}
          </div>
          <div className="space-y-4 max-lg:order-first">
            <Skeleton className="aspect-[16/9] w-full rounded-xl lg:aspect-[4/3]" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !detalle) {
    return (
      <div ref={ref} className={PAGINA}>
        <EncabezadoPagina titulo="Activo" migas={[{ etiqueta: 'Inventario', to: '/inventario' }]} />
        <ErrorState error={error} onReintentar={() => void refetch()} />
      </div>
    );
  }

  const { activo, historialEstado, reservas, inspecciones, ordenes } = detalle;
  const categoria = categorias.find((c) => c.id === activo.categoriaId);
  const sede = sedes.find((s) => s.id === activo.sedeBaseId);
  const mapaUsuarios = new Map(usuarios.map((u) => [u.id, u]));

  const imgUrl = categoria ? srcCategoria(categoria.slug, hashTexto(activo.id), 'lg') : null;

  return (
    <div ref={ref} className={PAGINA}>
      <EncabezadoPagina
        migas={[{ etiqueta: 'Inventario', to: '/inventario' }, { etiqueta: activo.codigo }]}
        titulo={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {activo.codigo}
            <EstadoOperativoBadge estado={activo.estadoOperativo} />
          </span>
        }
        descripcion={`${activo.marca} ${activo.modelo}, ${activo.anio}${categoria ? ` · ${categoria.nombre}` : ''}`}
        acciones={
          <>
            {puedeCambiarEstado && (
              <Button icono={WrenchIcon} onClick={() => setModalEstado(true)}>
                Cambiar estado
              </Button>
            )}
            {puedeCrearReserva && (
              <Button asChild variante="primario">
                <Link to={`/reservas/nueva?activoId=${activo.id}`}>
                  <CalendarCheckIcon size={16} aria-hidden />
                  Reservar activo
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className={DOS_COLUMNAS}>
        <div className="min-w-0" data-entrada>
          <Tabs value={tabActiva} onValueChange={(v: string) => setTabActiva(v as typeof tabActiva)}>
            <TabsList>
              <TabsTrigger value="tecnica">Ficha técnica</TabsTrigger>
              <TabsTrigger value="reservas" conteo={reservas.length}>
                Reservas
              </TabsTrigger>
              <TabsTrigger value="inspecciones" conteo={inspecciones.length}>
                Inspecciones
              </TabsTrigger>
              <TabsTrigger value="mantenimiento" conteo={ordenes.length}>
                Mantenimiento
              </TabsTrigger>
              <TabsTrigger value="historial" conteo={historialEstado.length}>
                Bitácora
              </TabsTrigger>
            </TabsList>

            {/* Pestaña: ficha técnica. Dos bloques separados por aire y un título, sin cajas. */}
            <TabsContent value="tecnica" className="space-y-8 pt-6">
              <section>
                <h2 className="text-[15px] font-semibold text-ink">Especificaciones mecánicas</h2>
                <dl className="mt-2 max-w-2xl divide-y divide-line text-sm">
                  <Dato etiqueta="Tipo de motor">
                    <EtiquetaMotor tipo={activo.motor} />
                  </Dato>
                  <Dato etiqueta="Medidor">{categoria && (categoria.medidor === 'km' ? 'Kilómetros' : 'Horas')}</Dato>
                  <Dato etiqueta="Requiere operador homologado">
                    {activo.requiereOperador ? 'Sí (obligatorio)' : 'No'}
                  </Dato>
                  <Dato etiqueta="Tiempo de preparación (buffer)">{categoria?.bufferPreparacionMin} min</Dato>
                </dl>
              </section>

              <section>
                <h2 className="text-[15px] font-semibold text-ink">Pólizas y permisos</h2>
                {activo.documentos.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-3">No hay documentos registrados para este activo.</p>
                ) : (
                  <ul className="mt-2 max-w-2xl divide-y divide-line text-sm">
                    {activo.documentos.map((doc, idx) => (
                      <li key={idx} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                        <span>
                          <span className="font-medium text-ink">{ETIQUETA_DOCUMENTO[doc.tipo]}</span>
                          <span className="ml-2 font-mono text-[13px] text-ink-3">N° {doc.numero}</span>
                        </span>
                        <span className="text-ink-3">
                          Vence <span className="font-mono text-[13px] text-ink">{formatearCivil(doc.venceEl)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </TabsContent>

            {/* Pestaña: reservas */}
            <TabsContent value="reservas">
              {reservas.length === 0 ? (
                <EmptyState icono={CalendarCheckIcon} titulo="No hay reservas registradas para esta unidad" />
              ) : (
                <div className="tarjeta overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="th-tabla">Código</th>
                          <th className="th-tabla">Período</th>
                          <th className="th-tabla">Estado</th>
                          <th className="th-tabla">
                            <span className="sr-only">Acción</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservas.map((r) => (
                          <tr key={r.id} className="fila-tabla h-12">
                            <td className="whitespace-nowrap px-4 font-mono text-[13px] font-medium text-ink">
                              {r.codigo}
                            </td>
                            <td className="whitespace-nowrap px-4 font-mono text-[13px] text-ink-2">
                              {formatear(r.inicio, 'America/Caracas', 'dd/MM/yyyy')} →{' '}
                              {formatear(r.fin, 'America/Caracas', 'dd/MM/yyyy')}
                            </td>
                            <td className="px-4">
                              <EstadoReservaBadge estado={r.estado} />
                            </td>
                            <td className="px-2 text-right">
                              <Button asChild variante="fantasma" tamano="sm">
                                <Link to={`/reservas/${r.id}`}>Ver detalle</Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Pestaña: inspecciones */}
            <TabsContent value="inspecciones">
              {inspecciones.length === 0 ? (
                <EmptyState icono={ShieldCheckIcon} titulo="No hay inspecciones registradas para esta unidad" />
              ) : (
                <div className="tarjeta overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="th-tabla">Momento</th>
                          <th className="th-tabla">Fecha y hora</th>
                          <th className="th-tabla">Lectura registrada</th>
                          <th className="th-tabla">Veredicto</th>
                          <th className="th-tabla">
                            <span className="sr-only">Acción</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspecciones.map((ins) => (
                          <tr key={ins.id} className="fila-tabla h-12">
                            <td className="whitespace-nowrap px-4 font-medium text-ink">
                              {ETIQUETA_MOMENTO[ins.momento]}
                            </td>
                            <td className="whitespace-nowrap px-4 font-mono text-[13px] text-ink-2">
                              {formatear(ins.realizadaEn, 'America/Caracas', 'dd/MM/yyyy HH:mm')}
                            </td>
                            <td className="whitespace-nowrap px-4 font-mono text-[13px] text-ink">
                              {formatearNumero(ins.lectura)}
                            </td>
                            <td className="px-4">
                              <ResultadoInspeccionBadge resultado={ins.resultado} />
                            </td>
                            <td className="px-2 text-right">
                              <Button asChild variante="fantasma" tamano="sm">
                                <Link to={`/inspecciones/${ins.id}`}>Ver checklist</Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Pestaña: mantenimiento */}
            <TabsContent value="mantenimiento">
              {ordenes.length === 0 ? (
                <EmptyState icono={WrenchIcon} titulo="No hay órdenes de mantenimiento para esta unidad" />
              ) : (
                <div className="tarjeta overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="th-tabla">Tipo</th>
                          <th className="th-tabla">Período</th>
                          <th className="th-tabla">Descripción</th>
                          <th className="th-tabla">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordenes.map((o) => (
                          <tr key={o.id} className="fila-tabla h-12">
                            <td className="whitespace-nowrap px-4 font-medium capitalize text-ink">{o.tipo}</td>
                            <td className="whitespace-nowrap px-4 font-mono text-[13px] text-ink-2">
                              {formatear(o.inicio, sede?.zonaHoraria ?? 'America/Caracas', 'dd/MM/yyyy HH:mm')} →{' '}
                              {formatear(o.finEstimado, sede?.zonaHoraria ?? 'America/Caracas', 'dd/MM/yyyy HH:mm')}
                            </td>
                            <td className="px-4 text-ink-2">{o.descripcion}</td>
                            <td className="whitespace-nowrap px-4 capitalize text-ink">{o.estado.replace('_', ' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Pestaña: bitácora de cambios manuales de estado operativo */}
            <TabsContent value="historial">
              {historialEstado.length === 0 ? (
                <EmptyState
                  icono={ClockCounterClockwiseIcon}
                  titulo="No hay cambios manuales de estado registrados"
                />
              ) : (
                <ol className="max-w-2xl divide-y divide-line">
                  {historialEstado.map((cambio, idx) => {
                    const usuario = mapaUsuarios.get(cambio.usuarioId);

                    return (
                      <li key={idx} className="py-4 first:pt-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <span className="text-sm font-medium text-ink">{usuario?.nombre ?? cambio.usuarioId}</span>
                          <span className="font-mono text-[13px] text-ink-3">
                            {formatear(cambio.en, 'America/Caracas', 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <EstadoOperativoBadge estado={cambio.antes} />
                          <ArrowRightIcon size={14} aria-hidden className="text-ink-3" />
                          <span className="sr-only">pasa a</span>
                          <EstadoOperativoBadge estado={cambio.despues} />
                        </div>
                        <p className="texto-bonito mt-2 text-sm text-ink-2">{cambio.motivo}</p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Ficha de datos: lista con líneas finas, sin tarjetas anidadas */}
        <aside aria-label="Datos de la unidad" className="max-lg:order-first" data-entrada>
          <div className="aspect-[16/9] overflow-hidden rounded-xl bg-panel-2 lg:aspect-[4/3]">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={`${categoria?.nombre ?? 'Activo'} ${activo.marca} ${activo.modelo}`}
                className="h-full w-full object-cover"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-3">
                <TruckIcon size={40} weight="duotone" aria-hidden />
              </div>
            )}
          </div>

          <dl className="mt-3 divide-y divide-line text-sm">
            <Dato etiqueta="Sede base">
              {sede?.nombre} ({sede?.ciudad})
            </Dato>
            <Dato etiqueta="Serial" mono>
              {activo.serial}
            </Dato>
            {activo.placa && (
              <Dato etiqueta="Placa" mono>
                {activo.placa}
              </Dato>
            )}
            <Dato etiqueta="Lectura actual" mono>
              {categoria ? formatearLectura(activo.lecturaActual, categoria.medidor) : formatearNumero(activo.lecturaActual)}
            </Dato>
            <Dato etiqueta="Capacidad">
              <span className="tabular">
                {categoria
                  ? formatearCapacidad(activo.capacidad, categoria.unidadCapacidad)
                  : formatearNumero(activo.capacidad)}
              </span>
            </Dato>
          </dl>
        </aside>
      </div>

      <DialogoCambiarEstadoActivo
        activo={activo}
        abierto={modalEstado}
        onCerrar={() => setModalEstado(false)}
        onEstadoCambiado={() => void refetch()}
      />
    </div>
  );
}
