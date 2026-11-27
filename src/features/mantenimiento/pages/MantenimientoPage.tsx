import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  DotsThreeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  WarningIcon,
  WrenchIcon,
  XCircleIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { EstadoOrden, ID, OrdenMantenimiento, OrdenNueva, TipoOrden } from '@/api/contrato';
import {
  useActualizarOrdenMutation,
  useCrearOrdenMutation,
  useGetActivosQuery,
  useGetOrdenesQuery,
  useGetPlanesQuery,
} from '@/api/baseApi';
import { useCatalogos } from '@/api/hooks';
import { usePuede } from '@/app/hooks';
import { vencimientoMasCercano } from '@/domain/mantenimiento';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { aInputLocal, ahora, desdeInputLocal, etiquetaDesfase, formatear, hoyCivil, sumarDias } from '@/shared/lib/fechas';
import { formatearLectura, formatearNumero, pluralizar } from '@/shared/lib/formato';
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
  SegmentedControl,
  Skeleton,
  type BadgeProps,
} from '@/shared/ui';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { Field, Input, Textarea } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/Tabs';

const ZONA = 'America/Caracas';

const ESTADO_ORDEN: Record<EstadoOrden, { etiqueta: string; tono: NonNullable<BadgeProps['tono']>; icono: Icon }> = {
  programada: { etiqueta: 'Programada', tono: 'info', icono: CalendarBlankIcon },
  en_proceso: { etiqueta: 'En taller', tono: 'mnt', icono: WrenchIcon },
  completada: { etiqueta: 'Completada', tono: 'ok', icono: CheckCircleIcon },
  cancelada: { etiqueta: 'Cancelada', tono: 'neutro', icono: XCircleIcon },
};

const ETIQUETA_TIPO: Record<TipoOrden, string> = { preventivo: 'Preventivo', correctivo: 'Correctivo' };

const ETIQUETA_ORIGEN: Record<OrdenMantenimiento['origen'], string> = {
  plan: 'Origen: plan',
  inspeccion: 'Origen: inspección',
  manual: 'Origen: manual',
};

const TIPOS_FILTRO = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'preventivo', etiqueta: 'Preventivo' },
  { valor: 'correctivo', etiqueta: 'Correctivo' },
];

const ESTADOS_FILTRO = [
  { valor: 'todos', etiqueta: 'Todos los estados' },
  { valor: 'programada', etiqueta: 'Programadas' },
  { valor: 'en_proceso', etiqueta: 'En taller' },
  { valor: 'completada', etiqueta: 'Completadas' },
  { valor: 'cancelada', etiqueta: 'Canceladas' },
];

function TablaEsqueleto() {
  return (
    <div className="tarjeta overflow-hidden" role="status">
      <span className="sr-only">Cargando órdenes…</span>
      <div className="h-10" />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex h-14 items-center gap-6 border-t border-line px-4">
          <div className="w-28 shrink-0 space-y-1.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="hidden h-3.5 w-48 md:block" />
          <Skeleton className="hidden h-3.5 min-w-0 flex-1 sm:block" />
          <Skeleton className="ml-auto h-[22px] w-24 rounded-full" />
          <Skeleton className="size-6" />
        </div>
      ))}
    </div>
  );
}

export default function MantenimientoPage() {
  const ref = useEntrada<HTMLDivElement>();
  const puedeCrear = usePuede('crear', 'orden');
  const puedeEditar = usePuede('editar', 'orden');

  const { data: ordenes = [], isLoading, error, refetch } = useGetOrdenesQuery();
  const { data: activos = [] } = useGetActivosQuery();
  const { data: planes = [] } = useGetPlanesQuery();
  const { categoriaPorId, sedePorId } = useCatalogos();
  const [crearOrden, { isLoading: guardando }] = useCrearOrdenMutation();
  const [actualizarOrden, { isLoading: actualizando }] = useActualizarOrdenMutation();

  const mapaActivos = useMemo(() => new Map(activos.map((a) => [a.id, a])), [activos]);

  const [tab, setTab] = useState<'ordenes' | 'planes'>('ordenes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // Modal Nueva Orden
  const [modalNueva, setModalNueva] = useState(false);
  const [activoIdNueva, setActivoIdNueva] = useState('');
  const [tipoNueva, setTipoNueva] = useState<TipoOrden>('preventivo');
  const [inicioNueva, setInicioNueva] = useState(() => aInputLocal(ahora(), ZONA));
  const [finNueva, setFinNueva] = useState(() => aInputLocal(sumarDias(ahora(), 2, ZONA), ZONA));
  const [descripcionNueva, setDescripcionNueva] = useState('');
  const [errorModal, setErrorModal] = useState<unknown>(null);
  const [errorAccion, setErrorAccion] = useState<unknown>(null);

  // Modal Cerrar Orden
  const [ordenACerrar, setOrdenACerrar] = useState<OrdenMantenimiento | null>(null);
  const [lecturaCierre, setLecturaCierre] = useState<number>(0);
  const [errorCerrar, setErrorCerrar] = useState<unknown>(null);

  const activoNueva = activoIdNueva ? mapaActivos.get(activoIdNueva) : undefined;
  const zonaNueva = activoNueva ? (sedePorId.get(activoNueva.sedeBaseId)?.zonaHoraria ?? ZONA) : ZONA;

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

  const metricas = useMemo(() => {
    const programadas = ordenes.filter((o) => o.estado === 'programada').length;
    const enProceso = ordenes.filter((o) => o.estado === 'en_proceso').length;
    const completadas = ordenes.filter((o) => o.estado === 'completada').length;
    return { programadas, enProceso, completadas };
  }, [ordenes]);

  // Próximos vencimientos preventivos por activo (RF-MNT-01, RF-MNT-02)
  const proximosServicios = useMemo(() => {
    return activos
      .filter((a) => a.estadoOperativo !== 'baja')
      .map((a) => {
        const cat = categoriaPorId.get(a.categoriaId);
        const sede = sedePorId.get(a.sedeBaseId);
        if (!cat) return null;
        const venc = vencimientoMasCercano(a, planes, cat, hoyCivil(sede?.zonaHoraria ?? ZONA));
        if (!venc) return null;
        const plan = planes.find((p) => p.id === venc.planId);
        return { activo: a, categoria: cat, plan, vencimiento: venc };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => Number(b.vencimiento.vencido) - Number(a.vencimiento.vencido) || a.vencimiento.diasEstimados - b.vencimiento.diasEstimados);
  }, [activos, planes, categoriaPorId, sedePorId]);

  const abrirNuevaOrden = (activoId?: ID) => {
    const act = (activoId ? mapaActivos.get(activoId) : activos[0]) ?? undefined;
    const z = act ? (sedePorId.get(act.sedeBaseId)?.zonaHoraria ?? ZONA) : ZONA;
    setActivoIdNueva(act?.id ?? '');
    setTipoNueva('preventivo');
    setInicioNueva(aInputLocal(ahora(), z));
    setFinNueva(aInputLocal(sumarDias(ahora(), 2, z), z));
    setDescripcionNueva('');
    setErrorModal(null);
    setModalNueva(true);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);
    if (!activoIdNueva || !descripcionNueva.trim()) {
      setErrorModal('Debe seleccionar el activo e indicar el trabajo técnico a realizar.');
      return;
    }

    const inicioIso = desdeInputLocal(inicioNueva, zonaNueva);
    const finIso = desdeInputLocal(finNueva, zonaNueva);
    if (!inicioIso || !finIso) {
      setErrorModal('Indique fechas válidas de inicio y fin estimado.');
      return;
    }

    try {
      const nueva: OrdenNueva = {
        activoId: activoIdNueva as ID,
        tipo: tipoNueva,
        origen: 'manual',
        inicio: inicioIso,
        finEstimado: finIso,
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

  const cambiarEstado = async (orden: OrdenMantenimiento, estado: EstadoOrden, lectura?: number): Promise<boolean> => {
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
      return true;
    } catch (err: unknown) {
      setErrorAccion(err);
      return false;
    }
  };

  const handleCerrarOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenACerrar) return;
    setErrorCerrar(null);
    try {
      await actualizarOrden({
        id: ordenACerrar.id,
        cambios: {
          estado: 'completada',
          lecturaCierre: Number(lecturaCierre),
          version: ordenACerrar.version,
        },
      }).unwrap();
      setOrdenACerrar(null);
    } catch (err: unknown) {
      setErrorCerrar(err);
    }
  };

  const hayFiltro = busqueda.trim() !== '' || filtroTipo !== 'todos' || filtroEstado !== 'todos';
  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroTipo('todos');
    setFiltroEstado('todos');
  };

  const total = pluralizar(ordenes.length, 'orden', 'órdenes');
  const descripcion = isLoading
    ? 'Cargando órdenes…'
    : error
      ? undefined
      : [
          hayFiltro ? `${formatearNumero(ordenesFiltradas.length)} de ${total}` : total,
          pluralizar(metricas.programadas, 'programada'),
          `${formatearNumero(metricas.enProceso)} en taller`,
          pluralizar(metricas.completadas, 'completada'),
        ].join(', ');

  const activoOrdenACerrar = ordenACerrar ? mapaActivos.get(ordenACerrar.activoId) : undefined;
  const catOrdenACerrar = activoOrdenACerrar ? categoriaPorId.get(activoOrdenACerrar.categoriaId) : undefined;

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1400px]">
      <EncabezadoPagina
        titulo="Mantenimiento"
        descripcion={descripcion}
        acciones={
          puedeCrear && (
            <Button variante="primario" icono={PlusIcon} onClick={() => abrirNuevaOrden()}>
              Nueva orden
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'ordenes' | 'planes')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="ordenes" conteo={ordenes.length}>
            Órdenes de taller
          </TabsTrigger>
          <TabsTrigger value="planes" conteo={proximosServicios.filter((p) => p.vencimiento.vencido || p.vencimiento.enAviso).length}>
            Planes preventivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ordenes" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              icono={MagnifyingGlassIcon}
              aria-label="Buscar órdenes"
              placeholder="Buscar por activo o descripción…"
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
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl aria-label="Filtrar por tipo" valor={filtroTipo} onCambio={setFiltroTipo} opciones={TIPOS_FILTRO} />
              <Select
                aria-label="Filtrar por estado"
                valor={filtroEstado}
                onCambio={setFiltroEstado}
                opciones={ESTADOS_FILTRO}
                className="w-44"
              />
            </div>
          </div>

          <section data-entrada aria-label="Listado de órdenes" className="space-y-3">
            {Boolean(errorAccion) && <ErrorState error={errorAccion} compacto onCerrar={() => setErrorAccion(null)} />}

            {isLoading ? (
              <TablaEsqueleto />
            ) : error ? (
              <ErrorState error={error} onReintentar={() => void refetch()} />
            ) : ordenesFiltradas.length === 0 ? (
              <div className="tarjeta">
                <EmptyState
                  icono={WrenchIcon}
                  titulo="No hay órdenes registradas"
                  descripcion={
                    hayFiltro
                      ? 'Ninguna orden coincide con la búsqueda o los filtros elegidos.'
                      : 'Programe una orden de mantenimiento preventivo o correctivo para un activo de la flota.'
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
                          Activo
                        </th>
                        <th scope="col" className="th-tabla hidden lg:table-cell">
                          Tipo
                        </th>
                        <th scope="col" className="th-tabla hidden md:table-cell">
                          Período estimado
                        </th>
                        <th scope="col" className="th-tabla hidden sm:table-cell">
                          Descripción técnica
                        </th>
                        <th scope="col" className="th-tabla">
                          Estado
                        </th>
                        {puedeEditar && (
                          <th scope="col" className="th-tabla">
                            <span className="sr-only">Acciones</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {ordenesFiltradas.map((orden) => {
                        const activo = mapaActivos.get(orden.activoId);
                        const zonaOrden = activo ? (sedePorId.get(activo.sedeBaseId)?.zonaHoraria ?? ZONA) : ZONA;
                        const estado = ESTADO_ORDEN[orden.estado];

                        return (
                          <tr key={orden.id} className="fila-tabla">
                            <td className="whitespace-nowrap px-4 py-2.5">
                              <Link
                                to={`/inventario/${orden.activoId}`}
                                className="block font-mono text-[13px] font-medium text-ink hover:text-accent-fg hover:underline"
                              >
                                {activo?.codigo ?? orden.activoId}
                              </Link>
                              <span className="hidden text-[13px] text-ink-3 sm:block">
                                {activo?.marca} {activo?.modelo}
                              </span>
                              <span className="block max-w-[8rem] truncate text-[13px] text-ink-3 sm:hidden">{orden.descripcion}</span>
                            </td>
                            <td className="hidden whitespace-nowrap px-4 py-2.5 lg:table-cell">
                              <span className="block text-ink">{ETIQUETA_TIPO[orden.tipo]}</span>
                              <span className="block text-[13px] text-ink-3">{ETIQUETA_ORIGEN[orden.origen]}</span>
                            </td>
                            <td className="hidden whitespace-nowrap px-4 py-2.5 font-mono text-[13px] text-ink-2 md:table-cell">
                              {formatear(orden.inicio, zonaOrden, 'dd/MM HH:mm')} → {formatear(orden.finEstimado, zonaOrden, 'dd/MM HH:mm')}
                            </td>
                            <td className="hidden w-full max-w-0 px-4 py-2.5 sm:table-cell">
                              <span className="block truncate text-ink-2" title={orden.descripcion}>
                                {orden.descripcion}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge tono={estado.tono} icono={estado.icono}>
                                {estado.etiqueta}
                              </Badge>
                            </td>
                            {puedeEditar && (
                              <td className="py-2.5 pr-2 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <IconButton
                                      aria-label={`Acciones de la orden de ${activo?.codigo ?? orden.activoId}`}
                                      icono={DotsThreeIcon}
                                      tamano="sm"
                                      tooltip={false}
                                      disabled={orden.estado === 'completada' || orden.estado === 'cancelada'}
                                    />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {orden.estado === 'programada' && (
                                      <DropdownMenuItem onClick={() => void cambiarEstado(orden, 'en_proceso')} disabled={actualizando}>
                                        Iniciar en taller
                                      </DropdownMenuItem>
                                    )}

                                    {orden.estado === 'en_proceso' && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setOrdenACerrar(orden);
                                          setLecturaCierre(activo?.lecturaActual ?? 0);
                                          setErrorCerrar(null);
                                        }}
                                        disabled={actualizando}
                                      >
                                        Completar y cerrar orden
                                      </DropdownMenuItem>
                                    )}

                                    {orden.estado !== 'completada' && orden.estado !== 'cancelada' && (
                                      <DropdownMenuItem
                                        onClick={() => void cambiarEstado(orden, 'cancelada')}
                                        disabled={actualizando}
                                        tono="peligro"
                                      >
                                        Cancelar orden
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="planes" className="space-y-4">
          {proximosServicios.length === 0 ? (
            <div className="tarjeta">
              <EmptyState
                icono={WrenchIcon}
                titulo="Sin activos para proyectar mantenimientos"
                descripcion="Cuando registres activos en el inventario, aquí verás el estado de sus planes preventivos y próximos servicios."
              />
            </div>
          ) : (
            <div className="tarjeta overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="th-tabla">Activo</th>
                      <th className="th-tabla">Plan aplicable</th>
                      <th className="th-tabla">Lectura actual</th>
                      <th className="th-tabla">Próximo vencimiento</th>
                      <th className="th-tabla">Estado</th>
                      {puedeCrear && (
                        <th className="th-tabla">
                          <span className="sr-only">Acción</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {proximosServicios.map(({ activo, categoria, plan, vencimiento }) => (
                      <tr key={activo.id} className="fila-tabla h-12">
                        <td className="whitespace-nowrap px-4 py-2">
                          <Link to={`/inventario/${activo.id}`} className="font-mono font-medium text-ink hover:text-accent-fg hover:underline">
                            {activo.codigo}
                          </Link>
                          <span className="block text-xs text-ink-3">
                            {activo.marca} {activo.modelo}
                          </span>
                        </td>
                        <td className="px-4 text-ink-2">{plan?.nombre ?? 'Plan preventivo'}</td>
                        <td className="whitespace-nowrap px-4 font-mono text-[13px] text-ink">
                          {formatearLectura(activo.lecturaActual, categoria.medidor)}
                        </td>
                        <td className="whitespace-nowrap px-4 text-[13px] text-ink-2">
                          {vencimiento.faltaLectura !== undefined
                            ? vencimiento.faltaLectura <= 0
                              ? `Excedido en ${formatearNumero(Math.abs(vencimiento.faltaLectura))} ${categoria.medidor}`
                              : `Faltan ${formatearNumero(vencimiento.faltaLectura)} ${categoria.medidor}`
                            : vencimiento.faltanDias !== undefined
                              ? vencimiento.faltanDias <= 0
                                ? `Vencido hace ${Math.abs(vencimiento.faltanDias)} días`
                                : `En ${vencimiento.faltanDias} días`
                              : 'Al día'}
                        </td>
                        <td className="px-4">
                          {vencimiento.vencido ? (
                            <Badge tono="danger" icono={WarningIcon}>
                              Vencido
                            </Badge>
                          ) : vencimiento.enAviso ? (
                            <Badge tono="warn" icono={WarningIcon}>
                              Por vencer
                            </Badge>
                          ) : (
                            <Badge tono="ok" icono={CheckCircleIcon}>
                              Al día
                            </Badge>
                          )}
                        </td>
                        {puedeCrear && (
                          <td className="px-3 text-right">
                            <Button tamano="sm" variante="fantasma" onClick={() => abrirNuevaOrden(activo.id)}>
                              Programar
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Nueva Orden */}
      <Dialog open={modalNueva} onOpenChange={(v: boolean) => !v && setModalNueva(false)}>
        <DialogContent
          titulo="Programar orden de taller"
          descripcion="Registre un servicio de mantenimiento preventivo o correctivo para un equipo de la flota."
          tamano="md"
          pie={
            <>
              <Button variante="fantasma" onClick={() => setModalNueva(false)} disabled={guardando}>
                Cancelar
              </Button>
              <Button
                variante="primario"
                onClick={handleCrear}
                disabled={activos.length === 0}
                cargando={guardando ? 'Guardando…' : false}
              >
                Crear orden
              </Button>
            </>
          }
        >
          <form onSubmit={handleCrear} className="space-y-4 pt-1">
            {Boolean(errorModal) && <ErrorState error={errorModal} compacto onCerrar={() => setErrorModal(null)} />}

            <Field
              etiqueta="Activo a intervenir"
              requerido
              ayuda={
                activos.length === 0 ? (
                  <Link to="/inventario" onClick={() => setModalNueva(false)} className="font-medium text-accent-fg hover:underline">
                    Registrar activos primero en Inventario
                  </Link>
                ) : undefined
              }
            >
              <Select
                valor={activoIdNueva}
                disabled={activos.length === 0}
                placeholder={activos.length === 0 ? 'Sin activos registrados' : 'Seleccione un activo…'}
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
                  { valor: 'preventivo', etiqueta: 'Preventivo (plan por horas o km)' },
                  { valor: 'correctivo', etiqueta: 'Correctivo (reparación de avería)' },
                ]}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                etiqueta="Fecha y hora de inicio"
                requerido
                ayuda={`Hora local (${etiquetaDesfase(ahora(), zonaNueva)})`}
              >
                <Input
                  type="datetime-local"
                  value={inicioNueva}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInicioNueva(e.target.value)}
                  required
                />
              </Field>

              <Field
                etiqueta="Fin estimado"
                requerido
                ayuda={`Hora local (${etiquetaDesfase(ahora(), zonaNueva)})`}
              >
                <Input
                  type="datetime-local"
                  value={finNueva}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinNueva(e.target.value)}
                  required
                />
              </Field>
            </div>

            <Field etiqueta="Descripción del trabajo" requerido>
              <Textarea
                placeholder="Ej. Cambio de aceite de motor 15W40, sustitución de filtros hidráulicos y calibración de presiones…"
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
          titulo="Cerrar orden de mantenimiento"
          descripcion="Registre la lectura final del medidor con la que concluye la intervención para recalcular los próximos intervalos."
          tamano="sm"
          pie={
            <>
              <Button variante="fantasma" onClick={() => setOrdenACerrar(null)} disabled={actualizando}>
                Cancelar
              </Button>
              <Button variante="primario" onClick={handleCerrarOrden} cargando={actualizando ? 'Cerrando…' : false}>
                Completar orden
              </Button>
            </>
          }
        >
          <form onSubmit={handleCerrarOrden} className="space-y-3 pt-1">
            {Boolean(errorCerrar) && <ErrorState error={errorCerrar} compacto onCerrar={() => setErrorCerrar(null)} />}
            <Field
              etiqueta="Lectura del medidor al cierre"
              requerido
              ayuda={
                activoOrdenACerrar
                  ? `Lectura actual: ${formatearNumero(activoOrdenACerrar.lecturaActual)} ${catOrdenACerrar?.medidor ?? ''}`
                  : 'Odómetro (km) u horómetro (horas)'
              }
            >
              <Input
                type="number"
                min={activoOrdenACerrar?.lecturaActual ?? 0}
                value={lecturaCierre}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLecturaCierre(Number(e.target.value))}
                sufijo={catOrdenACerrar ? (catOrdenACerrar.medidor === 'km' ? 'km' : 'h') : undefined}
                className="font-mono"
                required
              />
            </Field>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
