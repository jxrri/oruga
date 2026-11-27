import { useMemo, type ChangeEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ClipboardTextIcon, FileTextIcon, MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react';
import { useGetActivosQuery, useGetInspeccionesQuery, useGetUsuariosQuery } from '@/api/baseApi';
import { useReservasGlobales } from '@/api/hooks';
import { usePuede } from '@/app/hooks';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { formatear } from '@/shared/lib/fechas';
import { formatearNumero, pluralizar } from '@/shared/lib/formato';
import { Button, EmptyState, ErrorState, SegmentedControl, Skeleton } from '@/shared/ui';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { Input } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';
import { ETIQUETA_RESULTADO, ResultadoInspeccionBadge } from '@/shared/ui/dominio';
import { ETIQUETA_MOMENTO, MomentoBadge } from '../components/momento';

const MOMENTOS = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'salida', etiqueta: ETIQUETA_MOMENTO.salida },
  { valor: 'devolucion', etiqueta: ETIQUETA_MOMENTO.devolucion },
  { valor: 'rutina', etiqueta: ETIQUETA_MOMENTO.rutina },
] as const;

const RESULTADOS = [
  { valor: 'todos', etiqueta: 'Todos los resultados' },
  { valor: 'apto', etiqueta: ETIQUETA_RESULTADO.apto },
  { valor: 'apto_con_observaciones', etiqueta: ETIQUETA_RESULTADO.apto_con_observaciones },
  { valor: 'no_apto', etiqueta: ETIQUETA_RESULTADO.no_apto },
] as const;

export default function InspeccionesPage() {
  const navigate = useNavigate();
  const ref = useEntrada<HTMLDivElement>();
  const puedeVerPlantillas = usePuede('ver', 'plantilla');
  const puedeCrearInspeccion = usePuede('crear', 'inspeccion');

  const { data: inspecciones = [], isLoading, error, refetch } = useGetInspeccionesQuery();
  const { data: activos = [] } = useGetActivosQuery();
  const { data: reservas = [] } = useReservasGlobales();
  const { data: usuarios = [] } = useGetUsuariosQuery();

  const mapaActivos = useMemo(() => new Map(activos.map((a) => [a.id, a])), [activos]);
  const mapaReservas = useMemo(() => new Map(reservas.map((r) => [r.id, r])), [reservas]);
  const mapaUsuarios = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);

  // Los filtros viven en la URL: se pueden compartir y Atrás vuelve a la lista como se dejó.
  const [parametros, setParametros] = useSearchParams();
  const busqueda = parametros.get('q') ?? '';
  const filtroMomento = parametros.get('momento') ?? 'todos';
  const filtroResultado = parametros.get('resultado') ?? 'todos';
  const hayFiltros = busqueda !== '' || filtroMomento !== 'todos' || filtroResultado !== 'todos';

  const fijarFiltro = (clave: string, valor: string) =>
    setParametros(
      (previos) => {
        const siguientes = new URLSearchParams(previos);
        if (valor === '' || valor === 'todos') siguientes.delete(clave);
        else siguientes.set(clave, valor);
        return siguientes;
      },
      { replace: true },
    );

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

  const descripcion =
    inspecciones.length > 0
      ? `${pluralizar(inspecciones.length, 'inspección', 'inspecciones')}: ${formatearNumero(metricas.aptas)} aptas, ${formatearNumero(metricas.conObs)} con observaciones, ${formatearNumero(metricas.noAptas)} no aptas.`
      : 'Checklists de salida y devolución con lectura, combustible y evidencias.';

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1400px]">
      <EncabezadoPagina
        titulo="Inspecciones"
        descripcion={descripcion}
        acciones={
          <>
            {puedeVerPlantillas && (
              <Button asChild>
                <Link to="/admin/plantillas">
                  <FileTextIcon size={16} aria-hidden />
                  Plantillas
                </Link>
              </Button>
            )}
            {puedeCrearInspeccion && (
              <Button asChild variante="primario">
                <Link to="/inspecciones/nueva">
                  <PlusIcon size={16} aria-hidden />
                  Nueva inspección
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-4">
        {/* Barra de filtros */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between" data-entrada>
          <Input
            type="search"
            icono={MagnifyingGlassIcon}
            aria-label="Buscar inspecciones"
            placeholder="Buscar por activo, reserva u observación…"
            value={busqueda}
            onChange={(e: ChangeEvent<HTMLInputElement>) => fijarFiltro('q', e.target.value)}
            className="w-full md:max-w-[22rem]"
          />

          <div className="flex flex-wrap items-center gap-2">
            {hayFiltros && !isLoading && !error && (
              <span className="tabular mr-1 text-[13px] text-ink-3" aria-live="polite">
                {pluralizar(inspeccionesFiltradas.length, 'resultado')}
              </span>
            )}
            <SegmentedControl
              aria-label="Momento"
              valor={filtroMomento}
              onCambio={(v) => fijarFiltro('momento', v)}
              opciones={MOMENTOS}
            />
            <Select
              aria-label="Resultado"
              valor={filtroResultado}
              onCambio={(v) => fijarFiltro('resultado', v)}
              opciones={RESULTADOS}
              className="w-auto min-w-48"
            />
          </div>
        </div>

        {/* Tabla de inspecciones */}
        <section className="tarjeta overflow-hidden" aria-label="Lista de inspecciones" data-entrada>
          {isLoading ? (
            <div aria-busy="true">
              <div className="flex h-10 items-center px-4">
                <Skeleton className="h-3.5 w-48" />
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex h-14 items-center gap-6 border-t border-line px-4">
                  <div className="w-40 space-y-1.5">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="hidden h-[22px] w-24 rounded-full md:block" />
                  <Skeleton className="hidden h-3.5 w-28 lg:block" />
                  <Skeleton className="hidden h-3.5 w-32 md:block" />
                  <Skeleton className="hidden h-3.5 w-28 xl:block" />
                  <Skeleton className="ml-auto h-[22px] w-28 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-5">
              <ErrorState error={error} onReintentar={() => void refetch()} />
            </div>
          ) : inspeccionesFiltradas.length === 0 ? (
            hayFiltros ? (
              <EmptyState
                icono={MagnifyingGlassIcon}
                titulo="Ninguna inspección coincide"
                descripcion="Pruebe con otro activo, otra reserva o quite los filtros."
                accion={<Button onClick={() => setParametros({}, { replace: true })}>Quitar filtros</Button>}
              />
            ) : (
              <EmptyState
                icono={ClipboardTextIcon}
                titulo="Aún no hay inspecciones"
                descripcion="Realice un checklist de salida o devolución para los activos en contrato."
              />
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="th-tabla">
                      Activo
                    </th>
                    <th scope="col" className="th-tabla hidden md:table-cell">
                      Momento
                    </th>
                    <th scope="col" className="th-tabla hidden lg:table-cell">
                      Reserva
                    </th>
                    <th scope="col" className="th-tabla hidden md:table-cell">
                      Fecha
                    </th>
                    <th scope="col" className="th-tabla hidden text-right lg:table-cell">
                      Lectura
                    </th>
                    <th scope="col" className="th-tabla hidden xl:table-cell">
                      Inspector
                    </th>
                    <th scope="col" className="th-tabla">
                      Resultado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inspeccionesFiltradas.map((ins) => {
                    const activo = mapaActivos.get(ins.activoId);
                    const reserva = ins.reservaId ? mapaReservas.get(ins.reservaId) : undefined;
                    const inspector = mapaUsuarios.get(ins.inspectorId);
                    const fecha = formatear(ins.realizadaEn, 'America/Caracas', 'dd/MM/yyyy HH:mm');

                    return (
                      <tr
                        key={ins.id}
                        onClick={() => navigate(`/inspecciones/${ins.id}`)}
                        className="fila-tabla h-12 cursor-pointer"
                      >
                        <td className="px-4 py-2.5">
                          {/* El enlace da acceso por teclado; el clic en la fila es un atajo para el puntero. */}
                          <Link
                            to={`/inspecciones/${ins.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded font-mono font-medium text-ink hover:text-accent-fg"
                          >
                            {activo?.codigo ?? ins.activoId}
                          </Link>
                          {activo && (
                            <span className="hidden truncate text-[13px] text-ink-3 md:block">
                              {activo.marca} {activo.modelo}
                            </span>
                          )}
                          <span className="block text-[13px] text-ink-3 md:hidden">
                            {ETIQUETA_MOMENTO[ins.momento]}, <span className="tabular font-mono">{fecha}</span>
                          </span>
                        </td>
                        <td className="hidden px-4 py-2.5 md:table-cell">
                          <MomentoBadge momento={ins.momento} />
                        </td>
                        <td className="hidden px-4 py-2.5 font-mono text-ink-2 lg:table-cell">
                          {reserva?.codigo ?? ins.reservaId ?? <span className="font-sans text-ink-3">Sin reserva</span>}
                        </td>
                        <td className="tabular hidden whitespace-nowrap px-4 py-2.5 font-mono text-ink-2 md:table-cell">
                          {fecha}
                        </td>
                        <td className="tabular hidden px-4 py-2.5 text-right font-mono text-ink lg:table-cell">
                          {formatearNumero(ins.lectura)}
                        </td>
                        <td className="hidden px-4 py-2.5 text-ink-2 xl:table-cell">
                          {inspector?.nombre ?? ins.inspectorId}
                        </td>
                        <td className="px-4 py-2.5">
                          <ResultadoInspeccionBadge resultado={ins.resultado} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
