import React, { useState, useMemo } from 'react';
import {
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  WrenchIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { EstadoOrden, ID, InstanteUTC, OrdenMantenimiento, OrdenNueva, TipoOrden } from '@/api/contrato';
import {
  useActualizarOrdenMutation,
  useCrearOrdenMutation,
  useGetActivosQuery,
  useGetOrdenesQuery,
} from '@/api/baseApi';
import { ahora, formatear, sumarDias } from '@/shared/lib/fechas';
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { Field, Input, Textarea } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';

export default function MantenimientoPage() {
  const { data: ordenes = [], isLoading, error, refetch } = useGetOrdenesQuery();
  const { data: activos = [] } = useGetActivosQuery();
  const [crearOrden, { isLoading: guardando }] = useCrearOrdenMutation();
  const [actualizarOrden, { isLoading: actualizando }] = useActualizarOrdenMutation();

  const mapaActivos = useMemo(() => new Map(activos.map((a) => [a.id, a])), [activos]);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // Modal Nueva Orden
  const [modalNueva, setModalNueva] = useState(false);
  const [activoIdNueva, setActivoIdNueva] = useState('');
  const [tipoNueva, setTipoNueva] = useState<TipoOrden>('preventivo');
  const [inicioNueva, setInicioNueva] = useState(() => ahora().slice(0, 16));
  const [finNueva, setFinNueva] = useState(() => sumarDias(ahora(), 2, 'America/Caracas').slice(0, 16));
  const [descripcionNueva, setDescripcionNueva] = useState('');
  const [errorModal, setErrorModal] = useState<unknown>(null);
  const [errorAccion, setErrorAccion] = useState<unknown>(null);

  // Modal Cerrar Orden
  const [ordenACerrar, setOrdenACerrar] = useState<OrdenMantenimiento | null>(null);
  const [lecturaCierre, setLecturaCierre] = useState<number>(0);

  // Filtrado
  const ordenesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return ordenes.filter((o) => {
      const act = mapaActivos.get(o.activoId);
      const coincideQ =
        !q ||
        o.descripcion.toLowerCase().includes(q) ||
        (act?.codigo && act.codigo.toLowerCase().includes(q));

      const coincideTipo = filtroTipo === 'todos' || o.tipo === filtroTipo;
      const coincideEstado = filtroEstado === 'todos' || o.estado === filtroEstado;

      return coincideQ && coincideTipo && coincideEstado;
    });
  }, [ordenes, busqueda, filtroTipo, filtroEstado, mapaActivos]);

  // Métricas
  const metricas = useMemo(() => {
    const programadas = ordenes.filter((o) => o.estado === 'programada').length;
    const enProceso = ordenes.filter((o) => o.estado === 'en_proceso').length;
    const completadas = ordenes.filter((o) => o.estado === 'completada').length;
    return { programadas, enProceso, completadas };
  }, [ordenes]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activoIdNueva || !descripcionNueva.trim()) {
      setErrorModal('Debe seleccionar el activo e indicar el trabajo técnico a realizar.');
      return;
    }

    try {
      const nueva: OrdenNueva = {
        activoId: activoIdNueva as ID,
        tipo: tipoNueva,
        origen: 'manual',
        inicio: `${inicioNueva}:00Z` as InstanteUTC,
        finEstimado: `${finNueva}:00Z` as InstanteUTC,
        descripcion: descripcionNueva.trim(),
        estado: 'programada',
      };

      await crearOrden(nueva).unwrap();
      setModalNueva(false);
      setDescripcionNueva('');
      setErrorModal(null);
    } catch (err: unknown) {
      setErrorModal(err);
    }
  };

  const cambiarEstado = async (orden: OrdenMantenimiento, estado: EstadoOrden, lectura?: number) => {
    setErrorAccion(null);
    try {
      await actualizarOrden({
        id: orden.id,
        cambios: {
          estado,
          lecturaCierre: lectura,
          version: orden.version,
        },
      }).unwrap();
    } catch (err: unknown) {
      setErrorAccion(err);
    }
  };

  const handleCerrarOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenACerrar) return;
    await cambiarEstado(ordenACerrar, 'completada', Number(lecturaCierre));
    setOrdenACerrar(null);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/60 px-6 py-4 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Gestión de Taller y Mantenimiento</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
              {ordenesFiltradas.length} órdenes
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Control de servicios preventivos por horas/km y reparaciones correctivas de taller.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 border-r border-border/60 pr-4 text-xs font-mono">
            <span className="text-sky-400 font-bold">{metricas.programadas} Programadas</span>
            <span>·</span>
            <span className="text-amber-400 font-bold">{metricas.enProceso} En Taller</span>
            <span>·</span>
            <span className="text-emerald-400 font-bold">{metricas.completadas} Completadas</span>
          </div>

          <Button
            variante="primario"
            icono={PlusIcon}
            onClick={() => {
              if (activos[0]) setActivoIdNueva(activos[0].id);
              setModalNueva(true);
            }}
            className="text-xs font-bold"
          >
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/30 p-4">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por código de activo o descripción del servicio..."
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
            value={filtroTipo}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFiltroTipo(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="todos">Todos los tipos</option>
            <option value="preventivo">Preventivo</option>
            <option value="correctivo">Correctivo</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFiltroEstado(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="programada">Programadas</option>
            <option value="en_proceso">En Taller</option>
            <option value="completada">Completadas</option>
            <option value="cancelada">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Tabla de Órdenes */}
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
        ) : ordenesFiltradas.length === 0 ? (
          <EmptyState
            icono={WrenchIcon}
            titulo="No hay órdenes registradas"
            descripcion="Programe una orden de mantenimiento preventivo o correctivo para un activo de la flota."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-md shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/30 font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Activo</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Período Estimado</th>
                    <th className="px-4 py-3">Descripción Técnica</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {ordenesFiltradas.map((orden) => {
                    const activo = mapaActivos.get(orden.activoId);

                    return (
                      <tr key={orden.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          {activo?.codigo ?? orden.activoId}
                          <span className="block font-normal font-sans text-muted-foreground text-[11px]">
                            {activo?.marca} {activo?.modelo}
                          </span>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              orden.tipo === 'preventivo'
                                ? 'bg-sky-500/15 text-sky-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {orden.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono capitalize text-muted-foreground text-[11px]">
                          {orden.origen}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {formatear(orden.inicio, 'America/Caracas', 'dd/MM HH:mm')} →{' '}
                          {formatear(orden.finEstimado, 'America/Caracas', 'dd/MM HH:mm')}
                        </td>
                        <td className="px-4 py-3 text-foreground max-w-xs truncate">
                          {orden.descripcion}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tono={
                              orden.estado === 'completada'
                                ? 'ok'
                                : orden.estado === 'en_proceso'
                                ? 'warn'
                                : orden.estado === 'programada'
                                ? 'info'
                                : 'danger'
                            }
                          >
                            {orden.estado.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
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
                              {orden.estado === 'programada' && (
                                <DropdownMenuItem
                                  onClick={() => cambiarEstado(orden, 'en_proceso')}
                                  disabled={actualizando}
                                >
                                  Iniciar en taller
                                </DropdownMenuItem>
                              )}

                              {orden.estado === 'en_proceso' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setOrdenACerrar(orden);
                                    setLecturaCierre(activo?.lecturaActual ?? 0);
                                  }}
                                  disabled={actualizando}
                                >
                                  Completar y cerrar orden
                                </DropdownMenuItem>
                              )}

                              {orden.estado !== 'completada' && orden.estado !== 'cancelada' && (
                                <DropdownMenuItem
                                  onClick={() => cambiarEstado(orden, 'cancelada')}
                                  disabled={actualizando}
                                  tono="peligro"
                                >
                                  Cancelar orden
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

      {/* Modal Nueva Orden */}
      <Dialog open={modalNueva} onOpenChange={(v: boolean) => !v && setModalNueva(false)}>
        <DialogContent
          titulo={
            <div className="flex items-center gap-2 text-primary font-bold">
              <WrenchIcon className="h-5 w-5" />
              <span>Programar Orden de Taller</span>
            </div>
          }
          descripcion="Registre un servicio de mantenimiento preventivo o correctivo para un equipo de la flota."
          tamano="md"
          pie={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variante="fantasma" onClick={() => setModalNueva(false)} disabled={guardando}>
                Cancelar
              </Button>
              <Button
                variante="primario"
                onClick={handleCrear}
                cargando={guardando ? 'Guardando…' : false}
              >
                Crear Orden
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCrear} className="space-y-3.5 py-2">
            {Boolean(errorModal) && (
              <ErrorState error={errorModal} compacto onCerrar={() => setErrorModal(null)} />
            )}

            <Field etiqueta="Activo a intervenir" requerido>
              <Select
                valor={activoIdNueva}
                onCambio={(v: string) => setActivoIdNueva(v)}
                opciones={activos.map((a) => ({
                  valor: a.id,
                  etiqueta: `${a.codigo} · ${a.marca} ${a.modelo}`,
                }))}
              />
            </Field>

            <Field etiqueta="Tipo de mantenimiento" requerido>
              <Select
                valor={tipoNueva}
                onCambio={(v: string) => setTipoNueva(v as TipoOrden)}
                opciones={[
                  { valor: 'preventivo', etiqueta: 'Preventivo (Plan programado por horas/km)' },
                  { valor: 'correctivo', etiqueta: 'Correctivo (Reparación de avería)' },
                ]}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field etiqueta="Fecha y hora de inicio" requerido>
                <Input
                  type="datetime-local"
                  value={inicioNueva}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInicioNueva(e.target.value)}
                  required
                />
              </Field>

              <Field etiqueta="Fin estimado" requerido>
                <Input
                  type="datetime-local"
                  value={finNueva}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinNueva(e.target.value)}
                  required
                />
              </Field>
            </div>

            <Field etiqueta="Descripción del trabajo / Protocolo de servicio" requerido>
              <Textarea
                placeholder="Ej. Cambio de aceite de motor 15W40, sustitución de filtros hidráulicos y calibración de presiones..."
                value={descripcionNueva}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescripcionNueva(e.target.value)}
                rows={3}
                required
              />
            </Field>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Completar / Cerrar Orden */}
      <Dialog open={!!ordenACerrar} onOpenChange={(v: boolean) => !v && setOrdenACerrar(null)}>
        <DialogContent
          titulo={
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircleIcon className="h-5 w-5" />
              <span>Cerrar Orden de Mantenimiento</span>
            </div>
          }
          descripcion="Registre la lectura final del medidor con la que concluye la intervención técnica para recalcular los próximos intervalos."
          tamano="sm"
          pie={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variante="fantasma" onClick={() => setOrdenACerrar(null)} disabled={actualizando}>
                Cancelar
              </Button>
              <Button
                variante="primario"
                onClick={handleCerrarOrden}
                cargando={actualizando ? 'Cerrando…' : false}
              >
                Completar Orden
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCerrarOrden} className="space-y-4 py-2">
            <Field etiqueta="Lectura del medidor al cierre" requerido ayuda="Odómetro (km) u Horómetro (horas)">
              <Input
                type="number"
                min={0}
                value={lecturaCierre}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLecturaCierre(Number(e.target.value))}
                required
              />
            </Field>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
