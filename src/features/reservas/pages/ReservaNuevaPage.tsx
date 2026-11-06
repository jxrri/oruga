import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeftIcon,
  CalendarCheckIcon,
  ProhibitIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import type { ID, InstanteUTC, ReservaNueva } from '@/api/contrato';
import {
  useCrearReservaMutation,
  useGetActivosQuery,
  useGetCategoriasQuery,
  useGetClientesQuery,
  useGetReservasQuery,
  useGetSedesQuery,
} from '@/api/baseApi';
import { cotizar, describirDesglose } from '@/domain/tarifas';
import { detectarConflictos, clasificar, type ContextoActivo, type Propuesta } from '@/domain/conflictos';
import { aMs, ahora, sumarDias } from '@/shared/lib/fechas';
import { Button, ErrorState, Switch } from '@/shared/ui';
import { Field, Input } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';
import { Monto } from '@/shared/ui/Monto';

export default function ReservaNuevaPage() {
  const navigate = useNavigate();

  const { data: categorias = [], isLoading: cargandoCat } = useGetCategoriasQuery();
  const { data: sedes = [], isLoading: cargandoSedes } = useGetSedesQuery();
  const { data: clientes = [], isLoading: cargandoCli } = useGetClientesQuery();
  const { data: activos = [], isLoading: cargandoAct } = useGetActivosQuery();
  const [crearReserva, { isLoading: guardando }] = useCrearReservaMutation();

  const rangoReservas = useMemo(() => {
    const hoy = ahora();
    return {
      desde: hoy,
      hasta: sumarDias(hoy, 60, 'America/Caracas'),
    };
  }, []);
  const { data: reservasExistentes = [] } = useGetReservasQuery(rangoReservas);

  // Form State
  const [clienteId, setClienteId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [activoId, setActivoId] = useState<string>('');
  const [sedeRetiroId, setSedeRetiroId] = useState('');
  const [sedeDevolucionId, setSedeDevolucionId] = useState('');
  const [inicioStr, setInicioStr] = useState(() => ahora().slice(0, 16));
  const [finStr, setFinStr] = useState(() => sumarDias(ahora(), 3, 'America/Caracas').slice(0, 16));
  const [conOperador, setConOperador] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<unknown>(null);

  const clienteIdEfectivo = clienteId || clientes[0]?.id || '';
  const categoriaIdEfectiva = categoriaId || categorias[0]?.id || '';
  const sedeRetiroIdEfectiva = sedeRetiroId || sedes[0]?.id || '';
  const sedeDevolucionIdEfectiva = sedeDevolucionId || sedes[0]?.id || '';

  const categoriaSeleccionada = useMemo(
    () => categorias.find((c) => c.id === categoriaIdEfectiva) ?? categorias[0],
    [categorias, categoriaIdEfectiva],
  );

  const activosDeCategoria = useMemo(
    () => activos.filter((a) => a.categoriaId === (categoriaSeleccionada?.id ?? '')),
    [activos, categoriaSeleccionada],
  );

  const activoSeleccionado = useMemo(
    () => (activoId ? activos.find((a) => a.id === activoId) : undefined),
    [activos, activoId],
  );

  // Fechas y Duración
  const inicioIso = `${inicioStr}:00Z` as InstanteUTC;
  const finIso = `${finStr}:00Z` as InstanteUTC;
  const duracionMs = Math.max(0, aMs(finIso) - aMs(inicioIso));

  // Cotización estimada con tarifa óptima
  const cotizacion = useMemo(() => {
    if (!categoriaSeleccionada || duracionMs <= 0) return null;
    return cotizar(categoriaSeleccionada.tarifas, duracionMs);
  }, [categoriaSeleccionada, duracionMs]);

  // Validación de conflictos en tiempo real si hay activo asignado
  const conflictos = useMemo(() => {
    if (!activoSeleccionado || !categoriaSeleccionada || duracionMs <= 0) return [];

    const propuesta: Propuesta = {
      activoId: activoSeleccionado.id,
      clienteId: (clienteId || clientes[0]?.id) as ID,
      sedeRetiroId: (sedeRetiroId || sedes[0]?.id) as ID,
      inicio: aMs(inicioIso),
      fin: aMs(finIso),
    };

    const ctx: ContextoActivo = {
      activo: activoSeleccionado,
      categoria: categoriaSeleccionada,
      reservas: reservasExistentes,
      ordenes: [],
      zona: 'America/Caracas',
    };

    return detectarConflictos(propuesta, ctx);
  }, [
    activoSeleccionado,
    categoriaSeleccionada,
    duracionMs,
    clienteId,
    clientes,
    sedeRetiroId,
    sedes,
    inicioIso,
    finIso,
    reservasExistentes,
  ]);

  const veredicto = clasificar(conflictos);
  const esBloqueado = veredicto === 'bloqueado';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duracionMs <= 0) {
      setErrorEnvio('La fecha de devolución debe ser posterior al retiro.');
      return;
    }
    if (esBloqueado) {
      setErrorEnvio('No se puede crear la reserva con conflictos bloqueantes en el activo seleccionado.');
      return;
    }
    if (!clienteIdEfectivo || !categoriaSeleccionada) {
      setErrorEnvio('Debe seleccionar cliente y categoría.');
      return;
    }

    try {
      const nuevaReserva: ReservaNueva = {
        clienteId: clienteIdEfectivo as ID,
        categoriaId: categoriaSeleccionada.id,
        activoId: activoId ? (activoId as ID) : null,
        sedeRetiroId: sedeRetiroIdEfectiva as ID,
        sedeDevolucionId: sedeDevolucionIdEfectiva as ID,
        inicio: inicioIso,
        fin: finIso,
        conOperador,
        advertenciasAceptadas: conflictos.map((c) => c.codigo),
      };

      const res = await crearReserva(nuevaReserva).unwrap();
      navigate(`/reservas/${res.id}`);
    } catch (err: unknown) {
      setErrorEnvio(err);
    }
  };

  const cargando = cargandoCat || cargandoSedes || cargandoCli || cargandoAct;

  if (cargando) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Cargando catálogos...</div>;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Cabecera */}
      <div className="border-b border-border bg-card/60 px-6 py-3.5 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variante="fantasma"
            tamano="sm"
            icono={ArrowLeftIcon}
            onClick={() => navigate('/reservas')}
          >
            Reservas
          </Button>
          <span className="text-border">/</span>
          <span className="font-semibold text-xs text-foreground">Nueva Reserva</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Registrar Nuevo Alquiler</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure cliente, fechas, categoría y cotice la tarifa óptima combinada en tiempo real.
          </p>
        </div>

        {Boolean(errorEnvio) && (
          <ErrorState error={errorEnvio} compacto onCerrar={() => setErrorEnvio(null)} />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tarjeta 1: Cliente y Categoría */}
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CalendarCheckIcon className="h-4 w-4 text-primary" /> Datos del Servicio
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field etiqueta="Cliente solicitante" requerido>
                <Select
                  valor={clienteIdEfectivo}
                  onCambio={setClienteId}
                  opciones={clientes.map((c) => ({
                    valor: c.id,
                    etiqueta: `${c.nombre} (${c.documento})`,
                  }))}
                  placeholder="Seleccione cliente…"
                />
              </Field>

              <Field etiqueta="Categoría de equipo" requerido>
                <Select
                  valor={categoriaIdEfectiva}
                  onCambio={(v: string) => {
                    setCategoriaId(v);
                    setActivoId('');
                  }}
                  opciones={categorias.map((c) => ({
                    valor: c.id,
                    etiqueta: `${c.nombre} (${c.tipo})`,
                  }))}
                />
              </Field>

              <Field etiqueta="Fecha y hora de retiro" requerido>
                <Input
                  type="datetime-local"
                  value={inicioStr}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInicioStr(e.target.value)}
                  required
                />
              </Field>

              <Field etiqueta="Fecha y hora de devolución" requerido>
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

            <div className="pt-2 border-t border-border/50">
              <Switch
                checked={conOperador}
                onCheckedChange={setConOperador}
                etiqueta="Incluir operador certificado"
                descripcion="Asigna un operario profesional homologado durante todo el ciclo del contrato."
              />
            </div>
          </div>

          {/* Tarjeta 2: Asignación de Activo (Opcional en borrador) */}
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Asignación de Activo Físico</h2>
                <p className="text-xs text-muted-foreground">
                  Puede asignar un activo específico de inmediato o dejar la reserva pendiente de asignación.
                </p>
              </div>

              {conflictos.length > 0 && (
                <div className="text-xs font-mono">
                  {esBloqueado ? (
                    <span className="text-destructive flex items-center gap-1 font-bold">
                      <ProhibitIcon className="h-4 w-4" /> Conflicto bloqueante
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-bold">
                      <WarningIcon className="h-4 w-4" /> Con advertencia
                    </span>
                  )}
                </div>
              )}
            </div>

            <Field etiqueta="Unidad asignada">
              <Select
                valor={activoId}
                onCambio={setActivoId}
                opciones={[
                  { valor: '', etiqueta: 'Sin asignar (Asignar posteriormente en el planificador)' },
                  ...activosDeCategoria.map((a) => ({
                    valor: a.id,
                    etiqueta: `${a.codigo} · ${a.marca} ${a.modelo} (${a.capacidad} ${categoriaSeleccionada?.unidadCapacidad})`,
                  })),
                ]}
              />
            </Field>

            {conflictos.length > 0 && (
              <div
                className={`rounded-lg p-3 text-xs space-y-1 ${
                  esBloqueado
                    ? 'bg-destructive/10 border border-destructive/30 text-destructive'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
                }`}
              >
                <span className="font-bold block">Avisos de disponibilidad ({conflictos.length}):</span>
                <ul className="list-disc list-inside space-y-0.5">
                  {conflictos.map((c, i) => (
                    <li key={i}>{c.mensaje}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Tarjeta 3: Resumen Económico */}
          {cotizacion && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Tarifa Óptima Proyectada</h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    Combinación más económica para {cotizacion.horasCobradas} horas de servicio: {describirDesglose(cotizacion.desglose)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block font-mono">IMPORTE BASE</span>
                  <Monto centavos={cotizacion.total} className="text-2xl font-black text-primary" />
                </div>
              </div>
            </div>
          )}

          {/* Botones de Envío */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variante="fantasma" onClick={() => navigate('/reservas')}>
              Cancelar
            </Button>
            <Button
              variante="primario"
              onClick={handleSubmit}
              disabled={esBloqueado || duracionMs <= 0}
              cargando={guardando ? 'Creando…' : false}
              className="px-6 font-bold"
            >
              Registrar Reserva
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
