import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CalendarCheckIcon, DotsThreeIcon, MagnifyingGlassIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import type { EstadoReserva, Reserva } from '@/api/contrato';
import { useGetActivosQuery, useGetClientesQuery, useTransicionReservaMutation } from '@/api/baseApi';
import { useCatalogos, useReservasGlobales } from '@/api/hooks';
import { usePuede } from '@/app/hooks';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { formatear } from '@/shared/lib/fechas';
import { formatearNumero, pluralizar } from '@/shared/lib/formato';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  IconButton,
  SegmentedControl,
  Skeleton,
} from '@/shared/ui';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { Input } from '@/shared/ui/Field';
import { Monto } from '@/shared/ui/Monto';
import { EstadoReservaBadge } from '@/shared/ui/dominio';

const ZONA = 'America/Caracas';

const ESTADOS_FILTRO: { valor: EstadoReserva | 'todas'; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'borrador', etiqueta: 'Borradores' },
  { valor: 'confirmada', etiqueta: 'Confirmadas' },
  { valor: 'en_curso', etiqueta: 'En curso' },
  { valor: 'finalizada', etiqueta: 'Finalizadas' },
  { valor: 'cancelada', etiqueta: 'Canceladas' },
];

/** Esqueleto con la forma de la tabla: cabecera y filas de dos líneas. */
function TablaEsqueleto() {
  return (
    <div className="tarjeta overflow-hidden" role="status">
      <span className="sr-only">Cargando reservas…</span>
      <div className="h-10" />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex h-14 items-center gap-6 border-t border-line px-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-44 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-3.5 w-44 md:block" />
          <Skeleton className="hidden h-3.5 w-20 sm:block" />
          <Skeleton className="h-[22px] w-24 rounded-full" />
          <Skeleton className="size-6" />
        </div>
      ))}
    </div>
  );
}

export default function ReservasPage() {
  const navigate = useNavigate();
  const ref = useEntrada<HTMLDivElement>();
  const puedeCrear = usePuede('crear', 'reserva');
  const puedeConfirmar = usePuede('confirmar', 'reserva');
  const puedeEntregar = usePuede('entregar', 'reserva');
  const puedeDevolver = usePuede('devolver', 'reserva');
  const puedeCancelar = usePuede('cancelar', 'reserva');

  const { data: reservas = [], isLoading, error, refetch } = useReservasGlobales();
  const { data: activos = [] } = useGetActivosQuery();
  const { data: clientes = [] } = useGetClientesQuery();
  const { sedePorId } = useCatalogos();
  const [transicion, { isLoading: transicionando }] = useTransicionReservaMutation();

  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoReserva | 'todas'>('todas');
  const [errorAccion, setErrorAccion] = useState<unknown>(null);

  const mapaActivos = useMemo(() => new Map(activos.map((a) => [a.id, a])), [activos]);
  const mapaClientes = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);

  // Filtrado
  const reservasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return reservas.filter((r) => {
      const cli = mapaClientes.get(r.clienteId);
      const act = r.activoId ? mapaActivos.get(r.activoId) : undefined;

      const coincideQ =
        !q ||
        r.codigo.toLowerCase().includes(q) ||
        (cli?.nombre && cli.nombre.toLowerCase().includes(q)) ||
        (act?.codigo && act.codigo.toLowerCase().includes(q));

      const coincideEstado = estadoFiltro === 'todas' || r.estado === estadoFiltro;

      return coincideQ && coincideEstado;
    });
  }, [reservas, busqueda, estadoFiltro, mapaClientes, mapaActivos]);

  // Métricas rápidas
  const metricas = useMemo(() => {
    const confirmadas = reservas.filter((r) => r.estado === 'confirmada').length;
    const enCurso = reservas.filter((r) => r.estado === 'en_curso').length;
    const finalizadas = reservas.filter((r) => r.estado === 'finalizada').length;
    return { confirmadas, enCurso, finalizadas };
  }, [reservas]);

  const ejecutarTransicion = async (reserva: Reserva, accion: 'confirmar' | 'entregar' | 'devolver' | 'cancelar') => {
    setErrorAccion(null);
    try {
      await transicion({
        id: reserva.id,
        accion,
        version: reserva.version,
      }).unwrap();
    } catch (err: unknown) {
      setErrorAccion(err);
    }
  };

  const hayFiltro = busqueda.trim() !== '' || estadoFiltro !== 'todas';
  const limpiarFiltros = () => {
    setBusqueda('');
    setEstadoFiltro('todas');
  };

  // El conteo va en la descripción del encabezado, no en una píldora junto al título
  const total = pluralizar(reservas.length, 'reserva');
  const descripcion = isLoading
    ? 'Cargando reservas…'
    : error
      ? undefined
      : [
          hayFiltro ? `${formatearNumero(reservasFiltradas.length)} de ${total}` : total,
          pluralizar(metricas.confirmadas, 'confirmada'),
          `${formatearNumero(metricas.enCurso)} en curso`,
          pluralizar(metricas.finalizadas, 'finalizada'),
        ].join(', ');

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1400px]">
      <EncabezadoPagina
        titulo="Reservas"
        descripcion={descripcion}
        acciones={
          puedeCrear && (
            <Button asChild variante="primario">
              <Link to="/reservas/nueva">
                <PlusIcon size={16} aria-hidden />
                Nueva reserva
              </Link>
            </Button>
          )
        }
      >
        {/* Barra de filtros: una fila sin caja */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Input
            icono={MagnifyingGlassIcon}
            aria-label="Buscar reservas"
            placeholder="Buscar por código, cliente o activo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full sm:w-[22rem]"
            sufijo={
              busqueda && (
                <IconButton
                  aria-label="Limpiar búsqueda"
                  icono={XIcon}
                  tamano="sm"
                  tooltip={false}
                  onClick={() => setBusqueda('')}
                  className="pointer-events-auto -mr-2 size-7"
                />
              )
            }
          />
          {/* En móvil el control se desplaza en horizontal en lugar de partirse */}
          <div className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:max-w-full sm:px-0">
            <SegmentedControl
              aria-label="Filtrar por estado"
              valor={estadoFiltro}
              onCambio={setEstadoFiltro}
              opciones={ESTADOS_FILTRO}
            />
          </div>
        </div>
      </EncabezadoPagina>

      <section data-entrada aria-label="Listado de reservas" className="space-y-3">
        {Boolean(errorAccion) && <ErrorState error={errorAccion} compacto onCerrar={() => setErrorAccion(null)} />}

        {isLoading ? (
          <TablaEsqueleto />
        ) : error ? (
          <ErrorState error={error} onReintentar={() => void refetch()} />
        ) : reservasFiltradas.length === 0 ? (
          <div className="tarjeta">
            <EmptyState
              icono={CalendarCheckIcon}
              titulo="No se encontraron reservas"
              descripcion={
                hayFiltro
                  ? 'Ninguna reserva coincide con la búsqueda o el estado elegido.'
                  : 'Cree una reserva con el botón Nueva reserva.'
              }
              accion={hayFiltro && <Button onClick={limpiarFiltros}>Limpiar filtros</Button>}
            />
          </div>
        ) : (
          <div className="tarjeta overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="th-tabla">
                      Reserva
                    </th>
                    <th scope="col" className="th-tabla hidden xl:table-cell">
                      Activo
                    </th>
                    <th scope="col" className="th-tabla hidden md:table-cell">
                      Servicio
                    </th>
                    <th scope="col" className="th-tabla hidden text-right sm:table-cell">
                      Monto estimado
                    </th>
                    <th scope="col" className="th-tabla">
                      Estado
                    </th>
                    <th scope="col" className="th-tabla">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reservasFiltradas.map((r) => {
                    const cliente = mapaClientes.get(r.clienteId);
                    const activo = r.activoId ? mapaActivos.get(r.activoId) : undefined;

                    return (
                      <tr key={r.id} onClick={() => navigate(`/reservas/${r.id}`)} className="fila-tabla cursor-pointer">
                        <td className="px-4 py-2.5">
                          {/* El enlace da acceso por teclado; el clic en la fila sigue funcionando */}
                          <Link
                            to={`/reservas/${r.id}`}
                            onClick={(e) => e.stopPropagation()}
                            title={cliente?.nombre}
                            className="block max-w-[9rem] truncate rounded font-medium text-ink transition-colors duration-150 hover:text-accent-fg sm:max-w-[15rem] 2xl:max-w-[22rem]"
                          >
                            {cliente?.nombre ?? r.clienteId}
                          </Link>
                          <span className="block font-mono text-xs text-ink-3">{r.codigo}</span>
                        </td>
                        <td className="hidden px-4 py-2.5 xl:table-cell">
                          {activo ? (
                            <>
                              <span className="block font-mono text-[13px] text-ink">{activo.codigo}</span>
                              <span className="block max-w-[12rem] truncate text-[13px] text-ink-3">
                                {activo.marca} {activo.modelo}
                              </span>
                            </>
                          ) : (
                            <span className="text-ink-3">Por asignar</span>
                          )}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-2.5 md:table-cell">
                          <span className="block font-mono text-[13px] text-ink-2">
                            {formatear(r.inicio, sedePorId.get(r.sedeRetiroId)?.zonaHoraria ?? ZONA, 'dd/MM/yyyy')} →{' '}
                            {formatear(r.fin, sedePorId.get(r.sedeDevolucionId)?.zonaHoraria ?? ZONA, 'dd/MM/yyyy')}
                          </span>
                          <span className="block text-[13px] text-ink-3">{r.conOperador ? 'Con operador' : 'Sin operador'}</span>
                        </td>
                        <td className="hidden px-4 py-2.5 text-right font-mono text-[13px] text-ink sm:table-cell">
                          <Monto centavos={r.montoEstimado} disposicion="apilado" className="items-end" />
                        </td>
                        <td className="px-4 py-2.5">
                          <EstadoReservaBadge estado={r.estado} />
                        </td>
                        <td className="py-2.5 pr-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <IconButton aria-label={`Acciones de ${r.codigo}`} icono={DotsThreeIcon} tamano="sm" tooltip={false} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/reservas/${r.id}`)}>Ver ficha completa</DropdownMenuItem>

                              {r.estado === 'borrador' && puedeConfirmar && (
                                <DropdownMenuItem onClick={() => ejecutarTransicion(r, 'confirmar')} disabled={transicionando}>
                                  Confirmar reserva
                                </DropdownMenuItem>
                              )}

                              {r.estado === 'confirmada' && puedeEntregar && (
                                <DropdownMenuItem onClick={() => ejecutarTransicion(r, 'entregar')} disabled={transicionando}>
                                  Despachar activo
                                </DropdownMenuItem>
                              )}

                              {r.estado === 'en_curso' && puedeDevolver && (
                                <DropdownMenuItem onClick={() => ejecutarTransicion(r, 'devolver')} disabled={transicionando}>
                                  Registrar devolución
                                </DropdownMenuItem>
                              )}

                              {(r.estado === 'borrador' || r.estado === 'confirmada') && puedeCancelar && (
                                <DropdownMenuItem
                                  onClick={() => ejecutarTransicion(r, 'cancelar')}
                                  disabled={transicionando}
                                  tono="peligro"
                                >
                                  Cancelar reserva
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
