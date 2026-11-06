import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  FileTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useGetActivosQuery, useGetInspeccionesQuery, useGetReservasQuery, useGetUsuariosQuery } from '@/api/baseApi';
import { formatear } from '@/shared/lib/fechas';
import { Button, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { ResultadoInspeccionBadge } from '@/shared/ui/dominio';

export default function InspeccionesPage() {
  const navigate = useNavigate();

  const { data: inspecciones = [], isLoading, error, refetch } = useGetInspeccionesQuery();
  const { data: activos = [] } = useGetActivosQuery();
  const { data: reservas = [] } = useGetReservasQuery({
    desde: '2026-01-01T00:00:00Z',
    hasta: '2027-01-01T00:00:00Z',
  });
  const { data: usuarios = [] } = useGetUsuariosQuery();

  const mapaActivos = useMemo(() => new Map(activos.map((a) => [a.id, a])), [activos]);
  const mapaReservas = useMemo(() => new Map(reservas.map((r) => [r.id, r])), [reservas]);
  const mapaUsuarios = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);

  const [busqueda, setBusqueda] = useState('');
  const [filtroMomento, setFiltroMomento] = useState<string>('todos');
  const [filtroResultado, setFiltroResultado] = useState<string>('todos');

  // Filtrado
  const inspeccionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return inspecciones.filter((ins) => {
      const act = mapaActivos.get(ins.activoId);
      const res = ins.reservaId ? mapaReservas.get(ins.reservaId) : undefined;

      const coincideQ =
        !q ||
        (act?.codigo && act.codigo.toLowerCase().includes(q)) ||
        (res?.codigo && res.codigo.toLowerCase().includes(q)) ||
        ins.observaciones?.toLowerCase().includes(q);

      const coincideMomento = filtroMomento === 'todos' || ins.momento === filtroMomento;
      const coincideResultado = filtroResultado === 'todos' || ins.resultado === filtroResultado;

      return coincideQ && coincideMomento && coincideResultado;
    });
  }, [inspecciones, busqueda, filtroMomento, filtroResultado, mapaActivos, mapaReservas]);

  // Métricas
  const metricas = useMemo(() => {
    const aptas = inspecciones.filter((i) => i.resultado === 'apto').length;
    const conObs = inspecciones.filter((i) => i.resultado === 'apto_con_observaciones').length;
    const noAptas = inspecciones.filter((i) => i.resultado === 'no_apto').length;
    return { aptas, conObs, noAptas };
  }, [inspecciones]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/60 px-6 py-4 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Control de Inspecciones</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
              {inspeccionesFiltradas.length} actas
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Checklists de salida y devolución, auditoría de desgaste, combustible y evidencias fotográficas.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 border-r border-border/60 pr-4 text-xs font-mono">
            <span className="text-emerald-400 font-bold">{metricas.aptas} Aptas</span>
            <span>·</span>
            <span className="text-amber-400 font-bold">{metricas.conObs} Con Observaciones</span>
            <span>·</span>
            <span className="text-destructive font-bold">{metricas.noAptas} No Aptas</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variante="secundario"
              icono={FileTextIcon}
              onClick={() => navigate('/inspecciones/plantillas')}
              className="text-xs font-bold"
            >
              Plantillas
            </Button>

            <Button
              variante="primario"
              icono={PlusIcon}
              onClick={() => navigate('/inspecciones/nueva')}
              className="text-xs font-bold"
            >
              Nueva Inspección
            </Button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/30 p-4">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por activo, código de reserva u observaciones..."
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

        <div className="flex items-center gap-2">
          <select
            value={filtroMomento}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFiltroMomento(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="todos">Todos los momentos</option>
            <option value="salida">Salida (Despacho)</option>
            <option value="devolucion">Devolución (Retorno)</option>
          </select>

          <select
            value={filtroResultado}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFiltroResultado(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="todos">Todos los resultados</option>
            <option value="apto">Apto</option>
            <option value="apto_con_observaciones">Apto con Obs.</option>
            <option value="no_apto">No Apto</option>
          </select>
        </div>
      </div>

      {/* Tabla de Inspecciones */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState onReintentar={() => void refetch()} />
        ) : inspeccionesFiltradas.length === 0 ? (
          <EmptyState
            icono={ShieldCheckIcon}
            titulo="No se encontraron inspecciones"
            descripcion="Realice un checklist de salida o devolución para los activos en contrato."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-md shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/30 font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Momento</th>
                    <th className="px-4 py-3">Activo</th>
                    <th className="px-4 py-3">Reserva</th>
                    <th className="px-4 py-3">Fecha y Hora</th>
                    <th className="px-4 py-3">Lectura Medidor</th>
                    <th className="px-4 py-3">Inspector</th>
                    <th className="px-4 py-3">Veredicto</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {inspeccionesFiltradas.map((ins) => {
                    const activo = mapaActivos.get(ins.activoId);
                    const reserva = ins.reservaId ? mapaReservas.get(ins.reservaId) : undefined;
                    const inspector = mapaUsuarios.get(ins.inspectorId);

                    return (
                      <tr
                        key={ins.id}
                        onClick={() => navigate(`/inspecciones/${ins.id}`)}
                        className="cursor-pointer hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-bold uppercase">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] ${
                              ins.momento === 'salida'
                                ? 'bg-sky-500/15 text-sky-400'
                                : 'bg-purple-500/15 text-purple-400'
                            }`}
                          >
                            {ins.momento}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          {activo?.codigo ?? ins.activoId}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {reserva?.codigo ?? (ins.reservaId || '—')}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {formatear(ins.realizadaEn, 'America/Caracas', 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground">
                          {ins.lectura}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {inspector?.nombre ?? ins.inspectorId}
                        </td>
                        <td className="px-4 py-3">
                          <ResultadoInspeccionBadge resultado={ins.resultado} />
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variante="fantasma"
                            tamano="sm"
                            onClick={() => navigate(`/inspecciones/${ins.id}`)}
                          >
                            Ver Acta
                          </Button>
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
