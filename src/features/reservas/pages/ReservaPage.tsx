import React, { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import {
  CalendarCheckIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
  ColumnsIcon,
  FileTextIcon,
  TruckIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import {
  useGetActivosQuery,
  useGetCategoriasQuery,
  useGetClientesQuery,
  useGetHistorialReservaQuery,
  useGetReservaQuery,
  useGetSedesQuery,
  useTransicionReservaMutation,
} from '@/api/baseApi';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { formatear } from '@/shared/lib/fechas';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { Field, Textarea } from '@/shared/ui/Field';
import { Monto } from '@/shared/ui/Monto';
import { EstadoReservaBadge } from '@/shared/ui/dominio';

const ZONA = 'America/Caracas';
const CONTENEDOR = 'mx-auto w-full max-w-[1400px]';
const REJILLA = 'grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem]';

/** Fila de la ficha de datos: etiqueta a la izquierda, valor a la derecha. */
function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="shrink-0 text-[13px] text-ink-3">{etiqueta}</dt>
      <dd className="min-w-0 text-right text-ink">{children}</dd>
    </div>
  );
}

/** Inspección de salida o de devolución: estado y el paso siguiente (ver el acta o realizarla). */
function FilaInspeccion({
  momento,
  inspeccionId,
  urlNueva,
  deshabilitada,
  tonoPendiente,
}: {
  /** Completa el título: "Inspección de salida" */
  momento: 'salida' | 'devolución';
  inspeccionId?: string | null;
  urlNueva: string;
  deshabilitada?: boolean;
  tonoPendiente: 'warn' | 'neutro';
}) {
  // Completa el nombre accesible del botón: "Realizar inspección de retorno"
  const alRealizar = momento === 'devolución' ? 'retorno' : momento;
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-medium text-ink">Inspección de {momento}</span>
        {inspeccionId ? (
          <Badge tono="ok" icono={CheckCircleIcon}>
            Registrada
          </Badge>
        ) : (
          <Badge tono={tonoPendiente} icono={ClockIcon}>
            Pendiente
          </Badge>
        )}
      </div>

      {inspeccionId ? (
        <Button asChild variante="fantasma" tamano="sm">
          <Link to={`/inspecciones/${inspeccionId}`}>
            Ver acta<span className="sr-only"> de {momento}</span>
            <FileTextIcon size={16} aria-hidden />
          </Link>
        </Button>
      ) : deshabilitada ? (
        <Button tamano="sm" disabled>
          Realizar inspección<span className="sr-only"> de {alRealizar}</span>
        </Button>
      ) : (
        <Button asChild tamano="sm">
          <Link to={urlNueva}>
            Realizar inspección<span className="sr-only"> de {alRealizar}</span>
          </Link>
        </Button>
      )}
    </li>
  );
}

export default function ReservaPage() {
  const { id } = useParams<{ id: string }>();

  const { data: reserva, isLoading, error, refetch } = useGetReservaQuery(id ?? '');
  const {
    data: historial = [],
    isLoading: cargandoHistorial,
    error: errorHistorial,
    refetch: recargarHistorial,
  } = useGetHistorialReservaQuery(id ?? '');
  const { data: clientes = [] } = useGetClientesQuery();
  const { data: activos = [] } = useGetActivosQuery();
  const { data: categorias = [] } = useGetCategoriasQuery();
  const { data: sedes = [] } = useGetSedesQuery();

  const [transicion, { isLoading: transicionando }] = useTransicionReservaMutation();
  const [modalCancelar, setModalCancelar] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [errorAccion, setErrorAccion] = useState<unknown>(null);

  // La entrada se repite cuando el contenido real reemplaza a los esqueletos (que no se animan)
  const ref = useEntrada<HTMLDivElement>([isLoading]);

  if (isLoading) {
    return (
      <div ref={ref} className={CONTENEDOR} role="status">
        <span className="sr-only">Cargando reserva…</span>
        <div className="mb-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className={REJILLA}>
          <div className="lg:col-start-2 lg:row-start-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="mt-2 h-8 w-36" />
            <div className="mt-4 divide-y divide-line border-t border-line">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex justify-between py-3.5">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-8 lg:col-start-1 lg:row-start-1">
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-56 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reserva) {
    return (
      <div ref={ref} className={CONTENEDOR}>
        <EncabezadoPagina migas={[{ etiqueta: 'Reservas', to: '/reservas' }, { etiqueta: 'Reserva' }]} titulo="Reserva" />
        <ErrorState error={error} onReintentar={() => void refetch()} />
      </div>
    );
  }

  const cliente = clientes.find((c) => c.id === reserva.clienteId);
  const activo = reserva.activoId ? activos.find((a) => a.id === reserva.activoId) : undefined;
  const categoria = categorias.find((c) => c.id === reserva.categoriaId);
  const sedeRetiro = sedes.find((s) => s.id === reserva.sedeRetiroId);
  const sedeDevolucion = sedes.find((s) => s.id === reserva.sedeDevolucionId);

  const ejecutarTransicion = async (accion: 'confirmar' | 'entregar' | 'devolver' | 'cancelar', motivo?: string) => {
    setErrorAccion(null);
    try {
      await transicion({
        id: reserva.id,
        accion,
        version: reserva.version,
        motivo,
      }).unwrap();
      if (accion === 'cancelar') {
        setModalCancelar(false);
      }
    } catch (err: unknown) {
      setErrorAccion(err);
    }
  };

  const urlInspeccion = (momento: 'salida' | 'devolucion') =>
    `/inspecciones/nueva?reservaId=${reserva.id}&momento=${momento}${reserva.activoId ? `&activoId=${reserva.activoId}` : ''}`;

  return (
    <div ref={ref} className={CONTENEDOR}>
      <EncabezadoPagina
        migas={[{ etiqueta: 'Reservas', to: '/reservas' }, { etiqueta: reserva.codigo }]}
        titulo={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-mono">{reserva.codigo}</span>
            <EstadoReservaBadge estado={reserva.estado} />
          </span>
        }
        descripcion={cliente && `${cliente.nombre} (${cliente.documento})`}
        acciones={
          <>
            {reserva.estado !== 'cancelada' && reserva.estado !== 'finalizada' && (
              <Button icono={XCircleIcon} onClick={() => setModalCancelar(true)} disabled={transicionando}>
                Cancelar
              </Button>
            )}

            {reserva.estado === 'borrador' && (
              <Button
                variante="primario"
                icono={CheckCircleIcon}
                onClick={() => ejecutarTransicion('confirmar')}
                cargando={transicionando}
              >
                Confirmar reserva
              </Button>
            )}

            {reserva.estado === 'confirmada' && (
              <Button variante="primario" icono={TruckIcon} onClick={() => ejecutarTransicion('entregar')} cargando={transicionando}>
                Despachar
              </Button>
            )}

            {reserva.estado === 'en_curso' && (
              <Button
                variante="primario"
                icono={CalendarCheckIcon}
                onClick={() => ejecutarTransicion('devolver')}
                cargando={transicionando}
              >
                Registrar devolución
              </Button>
            )}
          </>
        }
      />

      <div className={REJILLA}>
        {/* Ficha de datos: primera en móvil, a la derecha en escritorio */}
        <aside data-entrada aria-label="Datos de la reserva" className="lg:col-start-2 lg:row-start-1">
          <p className="text-[13px] text-ink-3">Importe del contrato</p>
          <Monto
            centavos={reserva.montoEstimado}
            disposicion="apilado"
            className="mt-1 text-2xl font-semibold text-ink"
            classNameBs="mt-1 text-[13px] font-normal"
          />

          <dl className="mt-4 divide-y divide-line border-t border-line">
            <Dato etiqueta="Cliente">
              {cliente?.nombre}
              <span className="block text-[13px] text-ink-3">{cliente?.documento}</span>
            </Dato>
            <Dato etiqueta="Activo">
              {activo ? (
                <>
                  <span className="font-mono text-[13px]">{activo.codigo}</span>
                  <span className="block text-[13px] text-ink-3">
                    {activo.marca} {activo.modelo}
                  </span>
                </>
              ) : (
                <span className="text-ink-3">Por asignar</span>
              )}
            </Dato>
            <Dato etiqueta="Categoría">{categoria?.nombre}</Dato>
            <Dato etiqueta="Retiro">
              <span className="tabular">{formatear(reserva.inicio, ZONA, 'dd/MM/yyyy HH:mm')}</span>
              <span className="block text-[13px] text-ink-3">{sedeRetiro?.nombre}</span>
            </Dato>
            <Dato etiqueta="Devolución">
              <span className="tabular">{formatear(reserva.fin, ZONA, 'dd/MM/yyyy HH:mm')}</span>
              <span className="block text-[13px] text-ink-3">{sedeDevolucion?.nombre}</span>
            </Dato>
            <Dato etiqueta="Operador">{reserva.conOperador ? 'Con operador homologado' : 'Sin operador'}</Dato>
          </dl>
        </aside>

        <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-1">
          {Boolean(errorAccion) && !modalCancelar && (
            <ErrorState error={errorAccion} compacto onCerrar={() => setErrorAccion(null)} />
          )}

          {/* Inspecciones de salida y devolución */}
          <section data-entrada>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h2 className="text-[15px] font-semibold text-ink">Inspecciones</h2>
              {reserva.inspeccionSalidaId && reserva.inspeccionDevolucionId && (
                <Link
                  to={`/inspecciones/comparacion?salidaId=${reserva.inspeccionSalidaId}&devolucionId=${reserva.inspeccionDevolucionId}`}
                  className="inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-accent-fg hover:underline"
                >
                  <ColumnsIcon size={16} aria-hidden />
                  Comparar salida y devolución
                </Link>
              )}
            </div>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              <FilaInspeccion
                momento="salida"
                inspeccionId={reserva.inspeccionSalidaId}
                urlNueva={urlInspeccion('salida')}
                tonoPendiente="warn"
              />
              <FilaInspeccion
                momento="devolución"
                inspeccionId={reserva.inspeccionDevolucionId}
                urlNueva={urlInspeccion('devolucion')}
                deshabilitada={reserva.estado !== 'en_curso'}
                tonoPendiente="neutro"
              />
            </ul>
          </section>

          {/* Bitácora de auditoría */}
          <section data-entrada>
            <h2 className="text-[15px] font-semibold text-ink">Historial de cambios</h2>
            <div className="mt-3">
              {cargandoHistorial ? (
                <div className="tarjeta overflow-hidden" role="status">
                  <span className="sr-only">Cargando historial…</span>
                  <div className="h-10" />
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex h-12 items-center gap-6 border-t border-line px-4">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="hidden h-3.5 w-28 sm:block" />
                      <Skeleton className="hidden h-3.5 w-28 sm:block" />
                    </div>
                  ))}
                </div>
              ) : errorHistorial ? (
                <ErrorState error={errorHistorial} onReintentar={() => void recargarHistorial()} />
              ) : historial.length === 0 ? (
                <div className="tarjeta">
                  <EmptyState
                    icono={ClockCounterClockwiseIcon}
                    titulo="No hay modificaciones registradas"
                    descripcion="Los cambios de estado, fechas o activo de esta reserva quedan anotados aquí."
                    className="py-8"
                  />
                </div>
              ) : (
                <div className="tarjeta overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th scope="col" className="th-tabla">
                            Fecha
                          </th>
                          <th scope="col" className="th-tabla">
                            Campo
                          </th>
                          <th scope="col" className="th-tabla">
                            Valor anterior
                          </th>
                          <th scope="col" className="th-tabla">
                            Valor nuevo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historial.map((h, i) => (
                          <tr key={i} className="fila-tabla h-12">
                            <td className="whitespace-nowrap px-4 font-mono text-[13px] text-ink-3">
                              {formatear(h.en, ZONA, 'dd/MM/yyyy HH:mm')}
                            </td>
                            <td className="px-4 font-medium text-ink">{h.campo}</td>
                            <td className="max-w-[14rem] truncate px-4 text-ink-3">{String(h.antes ?? '-')}</td>
                            <td className="max-w-[14rem] truncate px-4 text-ink">{String(h.despues ?? '-')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Cancelación: pide el motivo y describe el efecto antes de actuar */}
      <Dialog open={modalCancelar} onOpenChange={(v: boolean) => !v && setModalCancelar(false)}>
        <DialogContent
          titulo="Cancelar reserva"
          descripcion={
            <>
              La reserva <span className="font-mono text-[13px]">{reserva.codigo}</span> pasa a cancelada.
            </>
          }
          tamano="md"
          pie={
            <>
              <Button variante="fantasma" onClick={() => setModalCancelar(false)}>
                Descartar
              </Button>
              <Button
                variante="peligro"
                disabled={!motivoCancelacion.trim() || transicionando}
                onClick={() => ejecutarTransicion('cancelar', motivoCancelacion)}
                cargando={transicionando}
              >
                Confirmar cancelación
              </Button>
            </>
          }
        >
          <div className="space-y-4 pt-1">
            {Boolean(errorAccion) && <ErrorState error={errorAccion} compacto onCerrar={() => setErrorAccion(null)} />}
            <Field etiqueta="Motivo de cancelación" requerido>
              <Textarea
                value={motivoCancelacion}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMotivoCancelacion(e.target.value)}
                placeholder="Indique la causa operativa o la petición del cliente…"
                rows={3}
              />
            </Field>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
