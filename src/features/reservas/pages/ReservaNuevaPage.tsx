import React, { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CheckCircleIcon, ProhibitIcon, WarningIcon } from '@phosphor-icons/react';
import type { ID, ReservaNueva } from '@/api/contrato';
import {
  useCrearReservaMutation,
  useGetActivosQuery,
  useGetCategoriasQuery,
  useGetClientesQuery,
  useGetPlanesQuery,
  useGetSedesQuery,
} from '@/api/baseApi';
import { useOrdenesGlobales, useReservasGlobales } from '@/api/hooks';
import { usePuede } from '@/app/hooks';
import { cotizar, describirDesglose } from '@/domain/tarifas';
import { clasificar, detectarConflictos, type ContextoActivo, type Propuesta } from '@/domain/conflictos';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { aInputLocal, aMs, ahora, desdeInputLocal, etiquetaDesfase, sumarDias } from '@/shared/lib/fechas';
import { Badge, Button, ErrorState, Skeleton, Switch } from '@/shared/ui';
import { Checkbox } from '@/shared/ui/Checkbox';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { Field, Input } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';
import { Monto } from '@/shared/ui/Monto';
import { ConflictoBadge } from '@/shared/ui/dominio';

const SIN_ASIGNAR = '__sin_asignar__';
const ZONA_BASE = 'America/Caracas';

/** Sección del formulario: título y contenido, separada de la anterior por aire y una línea, sin caja. */
function Seccion({
  titulo,
  descripcion,
  extra,
  children,
}: {
  titulo: string;
  descripcion?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{titulo}</h2>
          {descripcion && <p className="texto-bonito mt-0.5 text-[13px] text-ink-3">{descripcion}</p>}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}

/** Esqueleto con la forma del formulario: título de sección y campos en dos columnas. */
function FormularioEsqueleto() {
  return (
    <div role="status" className="space-y-10">
      <span className="sr-only">Cargando catálogos…</span>
      {[2, 4, 1].map((campos, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-4 w-36" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: campos }, (_, j) => (
              <div key={j} className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReservaNuevaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ref = useEntrada<HTMLDivElement>();
  const puedeCrear = usePuede('crear', 'reserva');

  const clienteParam = searchParams.get('clienteId') ?? '';
  const activoParam = searchParams.get('activoId') ?? '';
  const categoriaParam = searchParams.get('categoriaId') ?? '';

  const categoriasQ = useGetCategoriasQuery();
  const sedesQ = useGetSedesQuery();
  const clientesQ = useGetClientesQuery();
  const activosQ = useGetActivosQuery();
  const { data: categorias = [], isLoading: cargandoCat } = categoriasQ;
  const { data: sedes = [], isLoading: cargandoSedes } = sedesQ;
  const { data: clientes = [], isLoading: cargandoCli } = clientesQ;
  const { data: activos = [], isLoading: cargandoAct } = activosQ;
  const { data: reservasExistentes = [] } = useReservasGlobales();
  const { data: ordenesExistentes = [] } = useOrdenesGlobales();
  const { data: planes = [] } = useGetPlanesQuery();
  const [crearReserva, { isLoading: guardando }] = useCrearReservaMutation();

  const activoPreseleccionado = useMemo(
    () => (activoParam ? activos.find((a) => a.id === activoParam) : undefined),
    [activos, activoParam],
  );

  // Estado del formulario
  const [clienteId, setClienteId] = useState(clienteParam);
  const [categoriaId, setCategoriaId] = useState(categoriaParam);
  const [activoId, setActivoId] = useState<string>(activoParam || SIN_ASIGNAR);
  const [sedeRetiroId, setSedeRetiroId] = useState('');
  const [sedeDevolucionId, setSedeDevolucionId] = useState('');
  const [inicioStr, setInicioStr] = useState(() => aInputLocal(ahora(), ZONA_BASE));
  const [finStr, setFinStr] = useState(() => aInputLocal(sumarDias(ahora(), 3, ZONA_BASE), ZONA_BASE));
  const [conOperadorManual, setConOperadorManual] = useState<boolean | null>(null);
  const [claveConfirmada, setClaveConfirmada] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<unknown>(null);

  const clienteIdEfectivo = clienteId || clientes[0]?.id || '';
  const categoriaIdEfectiva = categoriaId || activoPreseleccionado?.categoriaId || categorias[0]?.id || '';
  const sedeRetiroIdEfectiva = sedeRetiroId || activoPreseleccionado?.sedeBaseId || sedes[0]?.id || '';
  const sedeDevolucionIdEfectiva = sedeDevolucionId || activoPreseleccionado?.sedeBaseId || sedes[0]?.id || '';

  const sedeRetiro = useMemo(() => sedes.find((s) => s.id === sedeRetiroIdEfectiva), [sedes, sedeRetiroIdEfectiva]);
  const sedeDevolucion = useMemo(
    () => sedes.find((s) => s.id === sedeDevolucionIdEfectiva),
    [sedes, sedeDevolucionIdEfectiva],
  );
  const zonaRetiro = sedeRetiro?.zonaHoraria ?? ZONA_BASE;
  const zonaDevolucion = sedeDevolucion?.zonaHoraria ?? ZONA_BASE;

  const categoriaSeleccionada = useMemo(
    () => categorias.find((c) => c.id === categoriaIdEfectiva) ?? categorias[0],
    [categorias, categoriaIdEfectiva],
  );

  const activosDeCategoria = useMemo(
    () => activos.filter((a) => a.categoriaId === (categoriaSeleccionada?.id ?? '')),
    [activos, categoriaSeleccionada],
  );

  const activoIdReal = activoId === SIN_ASIGNAR ? '' : activoId;
  const activoSeleccionado = useMemo(
    () => (activoIdReal ? activos.find((a) => a.id === activoIdReal) : undefined),
    [activos, activoIdReal],
  );
  const conOperador = conOperadorManual ?? Boolean(activoSeleccionado?.requiereOperador);
  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => c.id === clienteIdEfectivo),
    [clientes, clienteIdEfectivo],
  );

  // Fechas convertidas en la zona horaria de cada sede (SPEC §8.2)
  const inicioIso = useMemo(() => desdeInputLocal(inicioStr, zonaRetiro), [inicioStr, zonaRetiro]);
  const finIso = useMemo(() => desdeInputLocal(finStr, zonaDevolucion), [finStr, zonaDevolucion]);
  const duracionMs = useMemo(() => {
    if (!inicioIso || !finIso) return 0;
    return Math.max(0, aMs(finIso) - aMs(inicioIso));
  }, [inicioIso, finIso]);

  // Cotización estimada con tarifa óptima
  const cotizacion = useMemo(() => {
    if (!categoriaSeleccionada || duracionMs <= 0) return null;
    return cotizar(categoriaSeleccionada.tarifas, duracionMs);
  }, [categoriaSeleccionada, duracionMs]);

  const mapaSedes = useMemo(() => new Map(sedes.map((s) => [s.id, s])), [sedes]);

  // Validación de conflictos en tiempo real filtrada estrictamente al activo seleccionado
  const conflictos = useMemo(() => {
    if (!activoSeleccionado || !categoriaSeleccionada || !inicioIso || !finIso || duracionMs <= 0) return [];

    const propuesta: Propuesta = {
      activoId: activoSeleccionado.id,
      clienteId: clienteIdEfectivo as ID,
      sedeRetiroId: sedeRetiroIdEfectiva as ID,
      inicio: aMs(inicioIso),
      fin: aMs(finIso),
      estado: 'borrador',
    };

    const ctx: ContextoActivo = {
      activo: activoSeleccionado,
      categoria: categoriaSeleccionada,
      reservas: reservasExistentes.filter((r) => r.activoId === activoSeleccionado.id),
      ordenes: ordenesExistentes.filter((o) => o.activoId === activoSeleccionado.id),
      planes,
      cliente: clienteSeleccionado,
      zona: mapaSedes.get(activoSeleccionado.sedeBaseId)?.zonaHoraria ?? ZONA_BASE,
      nombreSede: (id) => mapaSedes.get(id)?.nombre ?? 'otra sede',
    };

    return detectarConflictos(propuesta, ctx);
  }, [
    activoSeleccionado,
    categoriaSeleccionada,
    inicioIso,
    finIso,
    duracionMs,
    clienteIdEfectivo,
    sedeRetiroIdEfectiva,
    reservasExistentes,
    ordenesExistentes,
    planes,
    clienteSeleccionado,
    mapaSedes,
  ]);

  const veredicto = clasificar(conflictos);
  const esBloqueado = veredicto === 'bloqueado';
  const tieneAdvertencias = veredicto === 'advertencia';
  const claveAdvertencias = conflictos.map((c) => `${c.codigo}:${c.con ?? ''}`).join('|');
  const advertenciasConfirmadas = claveConfirmada === claveAdvertencias;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEnvio(null);

    if (!puedeCrear) {
      setErrorEnvio('Tu rol no tiene permiso para crear reservas.');
      return;
    }
    if (!inicioIso || !finIso || duracionMs <= 0) {
      setErrorEnvio('La fecha de devolución debe ser posterior al retiro.');
      return;
    }
    if (esBloqueado) {
      setErrorEnvio('No se puede crear la reserva con conflictos bloqueantes en el activo seleccionado.');
      return;
    }
    if (tieneAdvertencias && !advertenciasConfirmadas) {
      setErrorEnvio('Debes confirmar explícitamente que aceptas las advertencias operativas.');
      return;
    }
    if (!clienteIdEfectivo || !categoriaSeleccionada) {
      setErrorEnvio('Debe seleccionar un cliente y una categoría.');
      return;
    }

    try {
      const nuevaReserva: ReservaNueva = {
        clienteId: clienteIdEfectivo as ID,
        categoriaId: categoriaSeleccionada.id,
        activoId: activoIdReal ? (activoIdReal as ID) : null,
        sedeRetiroId: sedeRetiroIdEfectiva as ID,
        sedeDevolucionId: sedeDevolucionIdEfectiva as ID,
        inicio: inicioIso,
        fin: finIso,
        conOperador,
        advertenciasAceptadas: tieneAdvertencias
          ? [...new Set(conflictos.filter((c) => c.severidad === 'advertencia').map((c) => c.codigo))]
          : [],
      };

      const res = await crearReserva(nuevaReserva).unwrap();
      navigate(`/reservas/${res.id}`);
    } catch (err: unknown) {
      setErrorEnvio(err);
    }
  };

  const cargando = cargandoCat || cargandoSedes || cargandoCli || cargandoAct;
  const errorCatalogos = categoriasQ.error ?? sedesQ.error ?? clientesQ.error ?? activosQ.error;
  const reintentarCatalogos = () => {
    for (const q of [categoriasQ, sedesQ, clientesQ, activosQ]) if (q.error) void q.refetch();
  };

  const ayudaZonaRetiro =
    sedeRetiro && inicioIso ? `Hora de ${sedeRetiro.ciudad} (${etiquetaDesfase(inicioIso, zonaRetiro)})` : undefined;
  const ayudaZonaDevolucion =
    sedeDevolucion && finIso
      ? `Hora de ${sedeDevolucion.ciudad} (${etiquetaDesfase(finIso, zonaDevolucion)})`
      : undefined;

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1400px]">
      <EncabezadoPagina
        migas={[{ etiqueta: 'Reservas', to: '/reservas' }, { etiqueta: 'Nueva reserva' }]}
        titulo="Nueva reserva"
        descripcion="Configure cliente, fechas y equipo. La tarifa óptima se cotiza al instante."
      />

      {!puedeCrear ? (
        <ErrorState
          titulo="Sin permiso para crear reservas"
          error="Tu rol actual solo tiene acceso de lectura o patio sobre las reservas."
        />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid items-start gap-x-12 gap-y-8 pt-1 lg:grid-cols-[minmax(0,44rem)_20rem]"
        >
          <div data-entrada className="min-w-0 space-y-8">
            {cargando ? (
              <FormularioEsqueleto />
            ) : errorCatalogos ? (
              <ErrorState error={errorCatalogos} onReintentar={reintentarCatalogos} />
            ) : (
              <>
                <Seccion titulo="Cliente y equipo">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      etiqueta="Cliente solicitante"
                      requerido
                      ayuda={
                        clientes.length === 0 ? (
                          <span>
                            Aún no hay clientes registrados.{' '}
                            <Link to="/clientes" className="font-medium text-accent-fg hover:underline">
                              Crear cliente
                            </Link>
                          </span>
                        ) : clienteSeleccionado?.estado === 'bloqueado' ? (
                          'Este cliente está bloqueado: podrá guardar borrador, pero no confirmar la reserva.'
                        ) : undefined
                      }
                    >
                      <Select
                        valor={clienteIdEfectivo}
                        onCambio={setClienteId}
                        disabled={clientes.length === 0}
                        opciones={clientes.map((c) => ({
                          valor: c.id,
                          etiqueta: `${c.nombre} (${c.documento})${c.estado === 'bloqueado' ? ' · Bloqueado' : ''}`,
                        }))}
                        placeholder={clientes.length === 0 ? 'Sin clientes registrados' : 'Seleccione cliente…'}
                      />
                    </Field>

                    <Field etiqueta="Categoría de equipo" requerido>
                      <Select
                        valor={categoriaIdEfectiva}
                        onCambio={(v: string) => {
                          setCategoriaId(v);
                          setActivoId(SIN_ASIGNAR);
                        }}
                        opciones={categorias.map((c) => ({
                          valor: c.id,
                          etiqueta: `${c.nombre} (${c.tipo === 'vehiculo' ? 'vehículo' : 'maquinaria'})`,
                        }))}
                      />
                    </Field>
                  </div>

                  <Switch
                    checked={conOperador}
                    onCheckedChange={setConOperadorManual}
                    etiqueta="Incluir operador certificado"
                    descripcion="Asigna un operario homologado durante todo el contrato."
                  />
                </Seccion>

                <Seccion titulo="Fechas y sedes">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field etiqueta="Fecha y hora de retiro" requerido ayuda={ayudaZonaRetiro}>
                      <Input
                        type="datetime-local"
                        value={inicioStr}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInicioStr(e.target.value)}
                        required
                      />
                    </Field>

                    <Field
                      etiqueta="Fecha y hora de devolución"
                      requerido
                      ayuda={ayudaZonaDevolucion}
                      error={inicioIso && finIso && duracionMs <= 0 ? 'Debe ser posterior al retiro.' : undefined}
                    >
                      <Input
                        type="datetime-local"
                        value={finStr}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinStr(e.target.value)}
                        required
                      />
                    </Field>

                    <Field etiqueta="Sede de retiro" requerido>
                      <Select
                        valor={sedeRetiroIdEfectiva}
                        onCambio={setSedeRetiroId}
                        opciones={sedes.map((s) => ({
                          valor: s.id,
                          etiqueta: `${s.nombre} (${s.ciudad})`,
                        }))}
                      />
                    </Field>

                    <Field etiqueta="Sede de devolución" requerido>
                      <Select
                        valor={sedeDevolucionIdEfectiva}
                        onCambio={setSedeDevolucionId}
                        opciones={sedes.map((s) => ({
                          valor: s.id,
                          etiqueta: `${s.nombre} (${s.ciudad})`,
                        }))}
                      />
                    </Field>
                  </div>
                </Seccion>

                {/* Asignación de activo (opcional en borrador) */}
                <Seccion
                  titulo="Asignación de activo"
                  descripcion="Asigne una unidad ahora o deje la reserva pendiente de asignación."
                  extra={
                    activoSeleccionado &&
                    (conflictos.length === 0 ? (
                      <Badge tono="ok" icono={CheckCircleIcon}>
                        Disponible
                      </Badge>
                    ) : esBloqueado ? (
                      <Badge tono="danger" icono={ProhibitIcon}>
                        Conflicto bloqueante
                      </Badge>
                    ) : (
                      <Badge tono="warn" icono={WarningIcon}>
                        Con advertencia
                      </Badge>
                    ))
                  }
                >
                  <Field
                    etiqueta="Unidad asignada"
                    ayuda={
                      activosDeCategoria.length === 0
                        ? 'No hay unidades registradas en esta categoría todavía. Puedes guardar la reserva sin asignar.'
                        : 'Puede asignarla después en el planificador o en la ficha de la reserva.'
                    }
                  >
                    <Select
                      valor={activoId}
                      onCambio={(v) => {
                        setActivoId(v);
                        const act = v !== SIN_ASIGNAR ? activos.find((a) => a.id === v) : undefined;
                        if (act?.requiereOperador) setConOperadorManual(true);
                      }}
                      placeholder="Sin asignar"
                      opciones={[
                        { valor: SIN_ASIGNAR, etiqueta: 'Sin asignar (por categoría)' },
                        ...activosDeCategoria.map((a) => ({
                          valor: a.id,
                          etiqueta: `${a.codigo} · ${a.marca} ${a.modelo} (${a.capacidad} ${categoriaSeleccionada?.unidadCapacidad})`,
                        })),
                      ]}
                    />
                  </Field>

                  <div aria-live="polite" className="space-y-3">
                    {conflictos.length > 0 && (
                      <>
                        <p className="text-[13px] font-medium text-ink">
                          Avisos de disponibilidad ({conflictos.length})
                        </p>
                        <ul className="divide-y divide-line border-y border-line">
                          {conflictos.map((c, i) => (
                            <li
                              key={`${c.codigo}-${c.con ?? i}`}
                              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 text-[13px] text-ink-2"
                            >
                              <ConflictoBadge codigo={c.codigo} severidad={c.severidad} />
                              <span className="min-w-0 flex-1 basis-60">{c.mensaje}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {tieneAdvertencias && (
                      <div className="rounded-lg bg-warn-soft p-3.5">
                        <Checkbox
                          checked={advertenciasConfirmadas}
                          onCheckedChange={(v: boolean) => setClaveConfirmada(v ? claveAdvertencias : null)}
                          etiqueta="Acepto las advertencias operativas y confirmo registrar la reserva"
                        />
                      </div>
                    )}
                  </div>
                </Seccion>
              </>
            )}
          </div>

          {/* Resumen económico y envío, junto al formulario */}
          <aside data-entrada aria-label="Resumen de la reserva" className="tarjeta p-5 lg:sticky lg:top-20">
            <h2 className="text-[15px] font-semibold text-ink">Tarifa óptima</h2>

            {cargando ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            ) : cotizacion ? (
              <>
                <p className="mt-4 text-[13px] text-ink-3">Importe base</p>
                <Monto
                  centavos={cotizacion.total}
                  disposicion="apilado"
                  className="mt-1 text-2xl font-semibold text-ink"
                  classNameBs="mt-1 text-[13px] font-normal"
                />
                <p className="texto-bonito mt-3 text-[13px] text-ink-3">
                  Combinación más económica para {cotizacion.horasCobradas} horas de servicio:{' '}
                  {describirDesglose(cotizacion.desglose)}
                </p>
              </>
            ) : (
              <p className="texto-bonito mt-2 text-[13px] text-ink-3">
                Elija categoría y un período válido para cotizar la tarifa.
              </p>
            )}

            <div className="mt-5 space-y-2 border-t border-line pt-5">
              {Boolean(errorEnvio) && (
                <ErrorState error={errorEnvio} compacto onCerrar={() => setErrorEnvio(null)} className="mb-3" />
              )}
              <Button
                type="submit"
                variante="primario"
                disabled={
                  esBloqueado ||
                  (tieneAdvertencias && !advertenciasConfirmadas) ||
                  duracionMs <= 0 ||
                  cargando ||
                  !clienteIdEfectivo
                }
                cargando={guardando ? 'Creando…' : false}
                className="w-full"
              >
                Registrar reserva
              </Button>
              <Button asChild variante="fantasma" className="w-full">
                <Link to="/reservas">Cancelar</Link>
              </Button>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}
