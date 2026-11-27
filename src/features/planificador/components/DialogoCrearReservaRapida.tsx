import React, { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { CalendarPlusIcon, CheckCircleIcon, ProhibitIcon, WarningIcon } from '@phosphor-icons/react';
import type {
  Activo,
  Categoria,
  Cliente,
  ID,
  OrdenMantenimiento,
  PlanMantenimiento,
  Reserva,
  Sede,
  ZonaIANA,
} from '@/api/contrato';
import { useCrearReservaMutation } from '@/api/baseApi';
import { clasificar, detectarConflictos, type ContextoActivo, type Propuesta } from '@/domain/conflictos';
import { cn } from '@/shared/lib/cn';
import { aInputLocal, aMs, ahora, desdeInputLocal, desdeMs, etiquetaDesfase, sumarDias } from '@/shared/lib/fechas';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { ErrorState } from '@/shared/ui/Estados';
import { Field, Input } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';
import { Switch } from '@/shared/ui/Switch';

export interface DialogoCrearReservaRapidaProps {
  abierto: boolean;
  onCerrar: () => void;
  activoPreseleccionadoId?: ID;
  inicioPreseleccionadoMs?: number;
  finPreseleccionadoMs?: number;
  activos: Activo[];
  categorias: Categoria[];
  sedes: Sede[];
  clientes: Cliente[];
  reservasExistentes: Reserva[];
  ordenes?: OrdenMantenimiento[];
  planes?: PlanMantenimiento[];
  zona: ZonaIANA;
  onReservaCreada?: (reserva: Reserva) => void;
}

export function DialogoCrearReservaRapida(props: DialogoCrearReservaRapidaProps) {
  if (!props.abierto) return null;
  const clave = `${props.activoPreseleccionadoId ?? ''}-${props.inicioPreseleccionadoMs ?? ''}-${props.finPreseleccionadoMs ?? ''}`;
  return <ContenidoCrearReservaRapida key={clave} {...props} />;
}

function ContenidoCrearReservaRapida({
  abierto,
  onCerrar,
  activoPreseleccionadoId,
  inicioPreseleccionadoMs,
  finPreseleccionadoMs,
  activos,
  categorias,
  sedes,
  clientes,
  reservasExistentes,
  ordenes = [],
  planes = [],
  zona,
  onReservaCreada,
}: DialogoCrearReservaRapidaProps) {
  const [crearReserva, { isLoading }] = useCrearReservaMutation();
  const idForm = useId();

  const actInicial =
    (activoPreseleccionadoId ? activos.find((a) => a.id === activoPreseleccionadoId) : undefined) ?? activos[0];
  const iniBase = inicioPreseleccionadoMs ? desdeMs(inicioPreseleccionadoMs) : ahora();
  const finBase = finPreseleccionadoMs ? desdeMs(finPreseleccionadoMs) : sumarDias(iniBase, 2, zona);

  const [clienteIdState, setClienteId] = useState<string>(() => clientes[0]?.id ?? '');
  const [activoIdState, setActivoId] = useState<string>(() => actInicial?.id ?? '');
  const [inicioStrState, setInicioStr] = useState<string>(() => aInputLocal(iniBase, zona));
  const [finStrState, setFinStr] = useState<string>(() => aInputLocal(finBase, zona));
  const [sedeEntregaIdState, setSedeEntregaId] = useState<string>(() => actInicial?.sedeBaseId ?? sedes[0]?.id ?? '');
  const [sedeDevolucionIdState, setSedeDevolucionId] = useState<string>(
    () => actInicial?.sedeBaseId ?? sedes[0]?.id ?? '',
  );
  const [incluyeOperador, setIncluyeOperador] = useState<boolean>(() => Boolean(actInicial?.requiereOperador));
  const [claveConfirmada, setClaveConfirmada] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<unknown>(null);

  const clienteId = clienteIdState || clientes[0]?.id || '';
  const activoId = activoIdState || activoPreseleccionadoId || activos[0]?.id || '';

  const activoSeleccionado = useMemo(() => activos.find((a) => a.id === activoId), [activos, activoId]);
  const categoriaSeleccionada = useMemo(
    () => categorias.find((c) => c.id === activoSeleccionado?.categoriaId),
    [categorias, activoSeleccionado],
  );
  const clienteSeleccionado = useMemo(() => clientes.find((c) => c.id === clienteId), [clientes, clienteId]);
  const mapaSedes = useMemo(() => new Map(sedes.map((s) => [s.id, s])), [sedes]);

  const sedeEntregaId = sedeEntregaIdState || activoSeleccionado?.sedeBaseId || sedes[0]?.id || '';
  const sedeDevolucionId = sedeDevolucionIdState || activoSeleccionado?.sedeBaseId || sedes[0]?.id || '';

  const zonaRetiro = mapaSedes.get(sedeEntregaId)?.zonaHoraria ?? zona;
  const zonaDevolucion = mapaSedes.get(sedeDevolucionId)?.zonaHoraria ?? zona;

  const inicioIso = useMemo(() => desdeInputLocal(inicioStrState, zonaRetiro), [inicioStrState, zonaRetiro]);
  const finIso = useMemo(() => desdeInputLocal(finStrState, zonaDevolucion), [finStrState, zonaDevolucion]);

  const handleActivoChange = (id: string) => {
    setActivoId(id);
    const act = activos.find((a) => a.id === id);
    if (act) {
      setSedeEntregaId(act.sedeBaseId);
      setSedeDevolucionId(act.sedeBaseId);
      if (act.requiereOperador) setIncluyeOperador(true);
    }
  };

  const conflictos = useMemo(() => {
    if (!activoSeleccionado || !categoriaSeleccionada || !inicioIso || !finIso) return [];
    const iniMs = aMs(inicioIso);
    const finMs = aMs(finIso);
    if (finMs <= iniMs) return [];

    const propuesta: Propuesta = {
      activoId: activoSeleccionado.id,
      clienteId: clienteId as ID,
      sedeRetiroId: (sedeEntregaId || activoSeleccionado.sedeBaseId) as ID,
      inicio: iniMs,
      fin: finMs,
      estado: 'borrador',
    };

    const ctx: ContextoActivo = {
      activo: activoSeleccionado,
      categoria: categoriaSeleccionada,
      reservas: reservasExistentes.filter((r) => r.activoId === activoSeleccionado.id),
      ordenes: ordenes.filter((o) => o.activoId === activoSeleccionado.id),
      planes,
      cliente: clienteSeleccionado,
      zona: mapaSedes.get(activoSeleccionado.sedeBaseId)?.zonaHoraria ?? zona,
      nombreSede: (id) => mapaSedes.get(id)?.nombre ?? 'otra sede',
    };

    return detectarConflictos(propuesta, ctx);
  }, [
    activoSeleccionado,
    categoriaSeleccionada,
    inicioIso,
    finIso,
    clienteId,
    sedeEntregaId,
    reservasExistentes,
    ordenes,
    planes,
    clienteSeleccionado,
    mapaSedes,
    zona,
  ]);

  const veredicto = clasificar(conflictos);
  const esBloqueado = veredicto === 'bloqueado';
  const tieneAdvertencias = veredicto === 'advertencia';
  const claveAdvertencias = conflictos.map((c) => `${c.codigo}:${c.con ?? ''}`).join('|');
  const advertenciasConfirmadas = claveConfirmada === claveAdvertencias;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEnvio(null);

    if (esBloqueado) {
      setErrorEnvio('No es posible crear la reserva con conflictos bloqueantes.');
      return;
    }
    if (tieneAdvertencias && !advertenciasConfirmadas) {
      setErrorEnvio('Debes confirmar la casilla de advertencias operativas para continuar.');
      return;
    }
    if (!inicioIso || !finIso || aMs(finIso) <= aMs(inicioIso)) {
      setErrorEnvio('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }
    if (!clienteId) {
      setErrorEnvio('Debe registrar y seleccionar un cliente primero.');
      return;
    }
    if (!activoSeleccionado) {
      setErrorEnvio('Debe registrar y seleccionar un activo primero.');
      return;
    }

    try {
      const nueva = await crearReserva({
        clienteId: clienteId as ID,
        categoriaId: activoSeleccionado.categoriaId,
        activoId: activoSeleccionado.id,
        sedeRetiroId: (sedeEntregaId || sedes[0]?.id) as ID,
        sedeDevolucionId: (sedeDevolucionId || sedes[0]?.id) as ID,
        inicio: inicioIso,
        fin: finIso,
        conOperador: incluyeOperador,
        advertenciasAceptadas: tieneAdvertencias
          ? [...new Set(conflictos.filter((c) => c.severidad === 'advertencia').map((c) => c.codigo))]
          : [],
      }).unwrap();

      onReservaCreada?.(nueva);
      onCerrar();
    } catch (err: unknown) {
      setErrorEnvio(err);
    }
  };

  const opcionesClientes = useMemo(
    () => clientes.map((c) => ({ valor: c.id, etiqueta: `${c.nombre} (${c.documento})` })),
    [clientes],
  );

  const opcionesActivos = useMemo(
    () =>
      activos.map((a) => {
        const cat = categorias.find((c) => c.id === a.categoriaId);
        return {
          valor: a.id,
          etiqueta: `${a.codigo}, ${a.marca} ${a.modelo} (${cat?.nombre ?? ''})`,
        };
      }),
    [activos, categorias],
  );

  const opcionesSedes = useMemo(
    () => sedes.map((s) => ({ valor: s.id, etiqueta: `${s.nombre} (${s.ciudad})` })),
    [sedes],
  );

  const faltanDatos = clientes.length === 0 || activos.length === 0;

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent
        titulo={
          <div className="flex items-center gap-2 text-ink">
            <CalendarPlusIcon size={18} className="shrink-0 text-ink-3" aria-hidden />
            <span>Nueva reserva</span>
          </div>
        }
        descripcion="Registre una reserva con verificación inmediata de conflictos."
        tamano="lg"
        pie={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] font-medium">
              {faltanDatos ? (
                <span className="text-ink-3">Registra al menos un activo y un cliente</span>
              ) : conflictos.length === 0 ? (
                <span className="flex items-center gap-1.5 text-ok">
                  <CheckCircleIcon size={16} aria-hidden /> Horario disponible
                </span>
              ) : esBloqueado ? (
                <span className="flex items-center gap-1.5 text-danger">
                  <ProhibitIcon size={16} aria-hidden /> Conflicto bloqueante
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-warn">
                  <WarningIcon size={16} aria-hidden /> Con advertencia operativa
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variante="fantasma" onClick={onCerrar} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form={idForm}
                variante="primario"
                disabled={esBloqueado || faltanDatos || (tieneAdvertencias && !advertenciasConfirmadas)}
                cargando={isLoading ? 'Creando…' : false}
              >
                Crear reserva
              </Button>
            </div>
          </div>
        }
      >
        <form id={idForm} onSubmit={handleSubmit} className="space-y-4 py-1">
          {Boolean(errorEnvio) && (
            <ErrorState error={errorEnvio} compacto onCerrar={() => setErrorEnvio(null)} />
          )}

          {conflictos.length > 0 && (
            <div
              className={cn(
                'space-y-2 rounded-lg p-3.5 text-[13px]',
                esBloqueado ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn',
              )}
            >
              <p className="font-medium">Avisos de disponibilidad ({conflictos.length})</p>
              <ul className="space-y-1 text-ink-2">
                {conflictos.map((c, i) => (
                  <li key={`${c.codigo}-${c.con ?? i}`}>{c.mensaje}</li>
                ))}
              </ul>
              {tieneAdvertencias && (
                <div className="pt-1">
                  <Checkbox
                    checked={advertenciasConfirmadas}
                    onCheckedChange={(v) => setClaveConfirmada(v ? claveAdvertencias : null)}
                    etiqueta="Acepto las advertencias operativas para registrar la reserva"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              etiqueta="Cliente"
              requerido
              ayuda={
                clientes.length === 0 ? (
                  <Link to="/clientes" onClick={onCerrar} className="font-medium text-accent-fg hover:underline">
                    Ir a registrar clientes
                  </Link>
                ) : undefined
              }
            >
              <Select
                valor={clienteId}
                onCambio={setClienteId}
                disabled={clientes.length === 0}
                opciones={opcionesClientes}
                placeholder={clientes.length === 0 ? 'Sin clientes registrados' : 'Seleccione cliente…'}
              />
            </Field>

            <Field
              etiqueta="Equipo asignado"
              requerido
              ayuda={
                activos.length === 0 ? (
                  <Link to="/inventario" onClick={onCerrar} className="font-medium text-accent-fg hover:underline">
                    Ir a registrar activos
                  </Link>
                ) : undefined
              }
            >
              <Select
                valor={activoId}
                onCambio={handleActivoChange}
                disabled={activos.length === 0}
                opciones={opcionesActivos}
                placeholder={activos.length === 0 ? 'Sin equipos registrados' : 'Seleccione equipo…'}
              />
            </Field>

            <Field
              etiqueta="Fecha y hora de inicio"
              requerido
              ayuda={inicioIso ? `${mapaSedes.get(sedeEntregaId)?.ciudad ?? 'Sede'} (${etiquetaDesfase(inicioIso, zonaRetiro)})` : undefined}
            >
              <Input
                type="datetime-local"
                value={inicioStrState}
                onChange={(e) => setInicioStr(e.target.value)}
                required
              />
            </Field>

            <Field
              etiqueta="Fecha y hora de fin"
              requerido
              ayuda={finIso ? `${mapaSedes.get(sedeDevolucionId)?.ciudad ?? 'Sede'} (${etiquetaDesfase(finIso, zonaDevolucion)})` : undefined}
            >
              <Input
                type="datetime-local"
                value={finStrState}
                onChange={(e) => setFinStr(e.target.value)}
                required
              />
            </Field>

            <Field etiqueta="Sede de retiro" requerido>
              <Select valor={sedeEntregaId} onCambio={setSedeEntregaId} opciones={opcionesSedes} />
            </Field>

            <Field etiqueta="Sede de devolución" requerido>
              <Select valor={sedeDevolucionId} onCambio={setSedeDevolucionId} opciones={opcionesSedes} />
            </Field>
          </div>

          <div className="pt-2">
            <Switch
              checked={incluyeOperador}
              onCheckedChange={setIncluyeOperador}
              etiqueta="Incluir operador certificado"
              descripcion="Asigna un operario homologado durante todo el período del contrato."
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
