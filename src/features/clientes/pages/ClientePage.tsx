import { useState, type ReactNode } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { CalendarCheckIcon, CheckCircleIcon, LockKeyIcon, PlusIcon } from '@phosphor-icons/react';
import { useActualizarClienteMutation, useGetClienteQuery } from '@/api/baseApi';
import { usePuede } from '@/app/hooks';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { cn } from '@/shared/lib/cn';
import { formatear } from '@/shared/lib/fechas';
import { formatearNumero } from '@/shared/lib/formato';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { Monto } from '@/shared/ui/Monto';
import { EstadoReservaBadge } from '@/shared/ui/dominio';

const PAGINA = 'mx-auto w-full max-w-[1400px]';
const DOS_COLUMNAS = 'grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_20rem]';

/** Fila de una ficha de datos: etiqueta a la izquierda, valor a la derecha (mono solo si es un dato que se copia) */
function Dato({ etiqueta, children, mono }: { etiqueta: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-ink-3">{etiqueta}</dt>
      <dd className={cn('min-w-0 break-words text-right text-ink', mono && 'font-mono text-[13px]')}>{children}</dd>
    </div>
  );
}

export default function ClientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const puedeEditar = usePuede('editar', 'cliente');
  const puedeCrearReserva = usePuede('crear', 'reserva');

  const { data: detalle, isLoading, error, refetch } = useGetClienteQuery(id ?? '');
  const [actualizarCliente, { isLoading: actualizando }] = useActualizarClienteMutation();
  const [errorAccion, setErrorAccion] = useState<unknown>(null);

  // La entrada se repite cuando la ficha real reemplaza a los esqueletos
  const ref = useEntrada<HTMLDivElement>([isLoading]);

  if (isLoading) {
    return (
      <div ref={ref} className={PAGINA}>
        <div className="mb-5 space-y-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className={DOS_COLUMNAS}>
          <div className="space-y-6">
            <div className="flex gap-10">
              <Skeleton className="h-14 w-28" />
              <Skeleton className="h-14 w-40" />
            </div>
            <div className="tarjeta overflow-hidden">
              <div className="h-10" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex h-12 items-center gap-6 border-t border-line px-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="ml-auto h-[22px] w-24 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4 max-lg:order-first">
            {Array.from({ length: 4 }).map((_, i) => (
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
        <EncabezadoPagina titulo="Cliente" migas={[{ etiqueta: 'Clientes', to: '/clientes' }]} />
        <ErrorState error={error} onReintentar={() => void refetch()} />
      </div>
    );
  }

  const { cliente, reservas } = detalle;

  const alternarBloqueo = async () => {
    setErrorAccion(null);
    const nuevoEstado = cliente.estado === 'activo' ? 'bloqueado' : 'activo';
    try {
      await actualizarCliente({
        id: cliente.id,
        cambios: {
          estado: nuevoEstado,
          version: cliente.version,
        },
      }).unwrap();
    } catch (err: unknown) {
      setErrorAccion(err);
    }
  };

  const totalFacturadoCentavos = reservas
    .filter((r) => r.estado !== 'cancelada' && r.estado !== 'borrador')
    .reduce((acc, r) => acc + (r.montoEstimado || 0), 0);

  return (
    <div ref={ref} className={PAGINA}>
      <EncabezadoPagina
        migas={[{ etiqueta: 'Clientes', to: '/clientes' }, { etiqueta: cliente.nombre }]}
        titulo={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {cliente.nombre}
            {cliente.estado === 'activo' ? (
              <Badge tono="ok" icono={CheckCircleIcon}>
                Activo
              </Badge>
            ) : (
              <Badge tono="danger" icono={LockKeyIcon}>
                Bloqueado
              </Badge>
            )}
          </span>
        }
        acciones={
          <>
            {puedeEditar && (
              <Button
                icono={cliente.estado === 'activo' ? LockKeyIcon : CheckCircleIcon}
                onClick={alternarBloqueo}
                cargando={actualizando}
              >
                {cliente.estado === 'activo' ? 'Bloquear cliente' : 'Desbloquear'}
              </Button>
            )}
            {puedeCrearReserva && (
              <Button asChild variante="primario">
                <Link to={`/reservas/nueva?clienteId=${cliente.id}`}>
                  <PlusIcon size={16} aria-hidden />
                  Nueva reserva
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className={DOS_COLUMNAS}>
        <div className="min-w-0 space-y-6" data-entrada>
          {Boolean(errorAccion) && (
            <ErrorState error={errorAccion} compacto onCerrar={() => setErrorAccion(null)} />
          )}

          {/* Indicadores: el valor va en tinta, sin caja ni color de adorno */}
          <dl className="flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <dt className="text-[13px] text-ink-3">Reservas totales</dt>
              <dd className="tabular mt-1 text-2xl font-semibold text-ink">{formatearNumero(reservas.length)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-3">Facturación acumulada</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink">
                <Monto centavos={totalFacturadoCentavos} />
              </dd>
            </div>
          </dl>

          <section className="space-y-3">
            <h2 className="text-[15px] font-semibold text-ink">Historial de alquileres y contratos</h2>

            {reservas.length === 0 ? (
              <EmptyState
                icono={CalendarCheckIcon}
                titulo="No hay registros de alquiler para este cliente"
                className="tarjeta"
              />
            ) : (
              <div className="tarjeta overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="th-tabla">Código</th>
                        <th className="th-tabla">Período de alquiler</th>
                        <th className="th-tabla">Operador</th>
                        <th className="th-tabla">Importe</th>
                        <th className="th-tabla">Estado</th>
                        <th className="th-tabla">
                          <span className="sr-only">Acción</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservas.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => navigate(`/reservas/${r.id}`)}
                          className="fila-tabla h-12 cursor-pointer"
                        >
                          <td className="whitespace-nowrap px-4 font-mono text-[13px] font-medium text-ink">
                            {r.codigo}
                          </td>
                          <td className="whitespace-nowrap px-4 font-mono text-[13px] text-ink-2">
                            {formatear(r.inicio, 'America/Caracas', 'dd/MM/yyyy')} →{' '}
                            {formatear(r.fin, 'America/Caracas', 'dd/MM/yyyy')}
                          </td>
                          <td className={cn('whitespace-nowrap px-4', r.conOperador ? 'text-ink' : 'text-ink-3')}>
                            {r.conOperador ? 'Homologado' : 'Sin operador'}
                          </td>
                          <td className="px-4 font-mono text-[13px] text-ink">
                            <Monto centavos={r.montoEstimado} />
                          </td>
                          <td className="px-4">
                            <EstadoReservaBadge estado={r.estado} />
                          </td>
                          <td className="px-2 text-right">
                            <Button asChild variante="fantasma" tamano="sm">
                              <Link to={`/reservas/${r.id}`} onClick={(e) => e.stopPropagation()}>
                                Ver contrato
                              </Link>
                            </Button>
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

        {/* Ficha de datos: lista con líneas finas, sin tarjetas anidadas */}
        <aside aria-label="Datos del cliente" className="max-lg:order-first" data-entrada>
          <dl className="divide-y divide-line text-sm">
            <Dato etiqueta="Tipo">
              <span className="capitalize">{cliente.tipo}</span>
            </Dato>
            <Dato etiqueta="Documento" mono>
              {cliente.documento}
            </Dato>
            <Dato etiqueta="Teléfono">
              <span className="tabular">{cliente.telefono}</span>
            </Dato>
            <Dato etiqueta="Correo">{cliente.email}</Dato>
          </dl>
        </aside>
      </div>
    </div>
  );
}
