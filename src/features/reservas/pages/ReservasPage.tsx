import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  CalendarCheckIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { EstadoReserva, Reserva } from '@/api/contrato';
import { useGetActivosQuery, useGetClientesQuery, useGetReservasQuery, useTransicionReservaMutation } from '@/api/baseApi';
import { ahora, sumarDias } from '@/shared/lib/fechas';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { Monto } from '@/shared/ui/Monto';
import { EstadoReservaBadge } from '@/shared/ui/dominio';

const ESTADOS_FILTRO: { valor: EstadoReserva | 'todas'; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'borrador', etiqueta: 'Borradores' },
  { valor: 'confirmada', etiqueta: 'Confirmadas' },
  { valor: 'en_curso', etiqueta: 'En Curso' },
  { valor: 'finalizada', etiqueta: 'Finalizadas' },
  { valor: 'cancelada', etiqueta: 'Canceladas' },
];

export default function ReservasPage() {
  const navigate = useNavigate();

  // Rango amplio de consulta (últimos 30 días a próximos 60 días)
  const rango = useMemo(() => {
    const hoy = ahora();
    return {
      desde: sumarDias(hoy, -30, 'America/Caracas'),
      hasta: sumarDias(hoy, 60, 'America/Caracas'),
    };
  }, []);

  const { data: reservas = [], isLoading, error, refetch } = useGetReservasQuery(rango);
  const { data: activos = [] } = useGetActivosQuery();
  const { data: clientes = [] } = useGetClientesQuery();
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Cabecera de Página */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/60 px-6 py-4 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Gestión de Reservas</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
              {reservasFiltradas.length} reservas
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ciclo de vida de alquileres: cotizaciones, confirmaciones, despachos y devoluciones.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 border-r border-border/60 pr-4 text-xs font-mono">
            <span className="text-sky-400 font-bold">{metricas.confirmadas} Confirmadas</span>
            <span>·</span>
            <span className="text-emerald-400 font-bold">{metricas.enCurso} En Curso</span>
            <span>·</span>
            <span className="text-muted-foreground">{metricas.finalizadas} Finalizadas</span>
          </div>

          <Button
            variante="primario"
            icono={PlusIcon}
            onClick={() => navigate('/reservas/nueva')}
            className="text-xs font-bold"
          >
            Nueva Reserva
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/30 p-4">
        {/* Buscador */}
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por código (R-...), cliente o activo..."
            value={busqueda}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Chips de estado */}
        <div className="flex flex-wrap items-center gap-1.5">
          {ESTADOS_FILTRO.map((est) => {
            const activo = estadoFiltro === est.valor;
            return (
              <button
                key={est.valor}
                type="button"
                onClick={() => setEstadoFiltro(est.valor)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  activo
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                {est.etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="flex-1 p-6 space-y-4">
        {Boolean(errorAccion) && (
          <ErrorState error={errorAccion} compacto onCerrar={() => setErrorAccion(null)} />
        )}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onReintentar={() => void refetch()} />
        ) : reservasFiltradas.length === 0 ? (
          <EmptyState
            icono={CalendarCheckIcon}
            titulo="No se encontraron reservas"
            descripcion="Cree una nueva reserva o cambie los criterios de filtrado seleccionados."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-md shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/30 font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Activo Asignado</th>
                    <th className="px-4 py-3">Período de Servicio</th>
                    <th className="px-4 py-3">Operador</th>
                    <th className="px-4 py-3">Monto Estimado</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {reservasFiltradas.map((r) => {
                    const cliente = mapaClientes.get(r.clienteId);
                    const activo = r.activoId ? mapaActivos.get(r.activoId) : undefined;

                    return (
                      <tr
                        key={r.id}
                        onClick={() => navigate(`/reservas/${r.id}`)}
                        className="cursor-pointer hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          {r.codigo}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {cliente?.nombre ?? r.clienteId}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {activo ? (
                            <div className="text-foreground font-bold">
                              {activo.codigo}{' '}
                              <span className="font-normal font-sans text-muted-foreground text-[11px]">
                                ({activo.marca} {activo.modelo})
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-400 italic">Por asignar</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {r.inicio.slice(0, 10)} → {r.fin.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3">
                          {r.conOperador ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                              <CheckCircleIcon className="h-3.5 w-3.5" /> Homologado
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Sin operador</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          <Monto centavos={r.montoEstimado} />
                        </td>
                        <td className="px-4 py-3">
                          <EstadoReservaBadge estado={r.estado} />
                        </td>
                        <td
                          className="px-4 py-3 text-right"
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
                              <DropdownMenuItem onClick={() => navigate(`/reservas/${r.id}`)}>
                                Ver ficha completa
                              </DropdownMenuItem>

                              {r.estado === 'borrador' && (
                                <DropdownMenuItem
                                  onClick={() => ejecutarTransicion(r, 'confirmar')}
                                  disabled={transicionando}
                                >
                                  Confirmar reserva
                                </DropdownMenuItem>
                              )}

                              {r.estado === 'confirmada' && (
                                <DropdownMenuItem
                                  onClick={() => ejecutarTransicion(r, 'entregar')}
                                  disabled={transicionando}
                                >
                                  Despachar activo
                                </DropdownMenuItem>
                              )}

                              {r.estado === 'en_curso' && (
                                <DropdownMenuItem
                                  onClick={() => ejecutarTransicion(r, 'devolver')}
                                  disabled={transicionando}
                                >
                                  Registrar devolución
                                </DropdownMenuItem>
                              )}

                              {r.estado !== 'finalizada' && r.estado !== 'cancelada' && (
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
      </div>
    </div>
  );
}
