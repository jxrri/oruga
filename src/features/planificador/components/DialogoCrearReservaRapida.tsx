import React, { useMemo, useState } from 'react';
import { CalendarPlusIcon, CheckCircleIcon, ProhibitIcon, WarningIcon } from '@phosphor-icons/react';
import type { Activo, Categoria, Cliente, ID, InstanteUTC, Reserva, Sede, ZonaIANA } from '@/api/contrato';
import { useCrearReservaMutation } from '@/api/baseApi';
import { clasificar, detectarConflictos, type ContextoActivo, type Propuesta } from '@/domain/conflictos';
import { cn } from '@/shared/lib/cn';
import { aMs, ahora, desdeMs, sumarDias } from '@/shared/lib/fechas';
import { Button } from '@/shared/ui/Button';
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
  zona: ZonaIANA;
  onReservaCreada?: (reserva: Reserva) => void;
}

export function DialogoCrearReservaRapida({
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
  zona,
  onReservaCreada,
}: DialogoCrearReservaRapidaProps) {
  const [crearReserva, { isLoading }] = useCrearReservaMutation();

  const [clienteIdState, setClienteId] = useState<string>('');
  const [activoIdState, setActivoId] = useState<string>('');
  const [inicioStrState, setInicioStr] = useState<string>('');
  const [finStrState, setFinStr] = useState<string>('');
  const [sedeEntregaIdState, setSedeEntregaId] = useState<string>('');
  const [sedeDevolucionIdState, setSedeDevolucionId] = useState<string>('');
  const [incluyeOperador, setIncluyeOperador] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<unknown>(null);

  const clienteId = clienteIdState || clientes[0]?.id || '';
  const activoId = activoIdState || activoPreseleccionadoId || activos[0]?.id || '';

  const activoSeleccionado = useMemo(() => activos.find((a) => a.id === activoId), [activos, activoId]);
  const categoriaSeleccionada = useMemo(
    () => categorias.find((c) => c.id === activoSeleccionado?.categoriaId),
    [categorias, activoSeleccionado],
  );

  const sedeEntregaId = sedeEntregaIdState || activoSeleccionado?.sedeBaseId || sedes[0]?.id || '';
  const sedeDevolucionId = sedeDevolucionIdState || activoSeleccionado?.sedeBaseId || sedes[0]?.id || '';

  const iniBase = inicioPreseleccionadoMs ? desdeMs(inicioPreseleccionadoMs) : ahora();
  const finBase = finPreseleccionadoMs ? desdeMs(finPreseleccionadoMs) : sumarDias(iniBase, 2, zona);

  const inicioStr = inicioStrState || iniBase.slice(0, 16);
  const finStr = finStrState || finBase.slice(0, 16);

  const handleActivoChange = (id: string) => {
    setActivoId(id);
    const act = activos.find((a) => a.id === id);
    if (act) {
      setSedeEntregaId(act.sedeBaseId);
      setSedeDevolucionId(act.sedeBaseId);
    }
  };

  const conflictos = useMemo(() => {
    if (!activoSeleccionado || !categoriaSeleccionada || !inicioStr || !finStr) return [];
    const inicioIso = `${inicioStr}:00Z` as InstanteUTC;
    const finIso = `${finStr}:00Z` as InstanteUTC;
    const iniMs = aMs(inicioIso);
    const finMs = aMs(finIso);
    if (finMs <= iniMs) return [];

    const propuesta: Propuesta = {
      activoId: activoSeleccionado.id,
      clienteId: (clienteId || clientes[0]?.id) as ID,
      sedeRetiroId: (sedeEntregaId || activoSeleccionado.sedeBaseId) as ID,
      inicio: iniMs,
      fin: finMs,
    };

    const ctx: ContextoActivo = {
      activo: activoSeleccionado,
      categoria: categoriaSeleccionada,
      reservas: reservasExistentes,
      ordenes: [],
      zona,
    };

    return detectarConflictos(propuesta, ctx);
  }, [
    activoSeleccionado,
    categoriaSeleccionada,
    inicioStr,
    finStr,
    clienteId,
    clientes,
    sedeEntregaId,
    reservasExistentes,
    zona,
  ]);

  const veredicto = clasificar(conflictos);
  const esBloqueado = veredicto === 'bloqueado';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (esBloqueado) {
      setErrorEnvio('No es posible crear la reserva con conflictos bloqueantes.');
      return;
    }
    const inicioIso = `${inicioStr}:00Z` as InstanteUTC;
    const finIso = `${finStr}:00Z` as InstanteUTC;

    if (aMs(finIso) <= aMs(inicioIso)) {
      setErrorEnvio('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    if (!activoSeleccionado) {
      setErrorEnvio('Debe seleccionar un activo.');
      return;
    }

    try {
      const nueva = await crearReserva({
        clienteId: clienteId as ID,
        categoriaId: activoSeleccionado.categoriaId,
        activoId: activoId ? (activoId as ID) : null,
        sedeRetiroId: (sedeEntregaId || sedes[0]?.id) as ID,
        sedeDevolucionId: (sedeDevolucionId || sedes[0]?.id) as ID,
        inicio: inicioIso,
        fin: finIso,
        conOperador: incluyeOperador,
        advertenciasAceptadas: [],
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
          etiqueta: `${a.codigo} · ${a.marca} ${a.modelo} (${cat?.nombre ?? ''})`,
        };
      }),
    [activos, categorias],
  );

  const opcionesSedes = useMemo(
    () => sedes.map((s) => ({ valor: s.id, etiqueta: `${s.nombre} (${s.ciudad})` })),
    [sedes],
  );

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent
        titulo={
          <div className="flex items-center gap-2 text-ink">
            <CalendarPlusIcon size={20} weight="bold" className="text-accent-fg shrink-0" aria-hidden />
            <span>Nueva reserva rápida</span>
          </div>
        }
        descripcion="Registre una reserva directamente sobre el cronograma con verificación inmediata de conflictos."
        tamano="lg"
        pie={
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              {conflictos.length === 0 ? (
                <span className="flex items-center gap-1.5 font-semibold text-ok">
                  <CheckCircleIcon size={16} weight="bold" aria-hidden /> Horario disponible
                </span>
              ) : esBloqueado ? (
                <span className="flex items-center gap-1.5 font-semibold text-danger">
                  <ProhibitIcon size={16} weight="bold" aria-hidden /> Conflicto bloqueante
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-semibold text-warn">
                  <WarningIcon size={16} weight="bold" aria-hidden /> Con advertencia operativa
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variante="fantasma" onClick={onCerrar} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                variante="primario"
                onClick={handleSubmit}
                disabled={esBloqueado}
                cargando={isLoading ? 'Creando…' : false}
              >
                Crear reserva
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {Boolean(errorEnvio) && (
            <ErrorState error={errorEnvio} compacto onCerrar={() => setErrorEnvio(null)} />
          )}

          {/* Conflictos detectados */}
          {conflictos.length > 0 && (
            <div
              className={cn(
                'space-y-1 rounded-xl border p-3.5 text-xs',
                esBloqueado
                  ? 'border-danger/35 bg-danger-soft text-danger'
                  : 'border-warn/35 bg-warn-soft text-warn',
              )}
            >
              <span className="block font-semibold">
                Avisos de disponibilidad ({conflictos.length}):
              </span>
              <ul className="list-inside list-disc space-y-0.5 text-ink-2">
                {conflictos.map((c, i) => (
                  <li key={i}>{c.mensaje}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field etiqueta="Cliente" requerido>
              <Select
                valor={clienteId}
                onCambio={setClienteId}
                opciones={opcionesClientes}
                placeholder="Seleccione cliente…"
              />
            </Field>

            <Field etiqueta="Equipo asignado" requerido>
              <Select
                valor={activoId}
                onCambio={handleActivoChange}
                opciones={opcionesActivos}
                placeholder="Seleccione equipo…"
              />
            </Field>

            <Field etiqueta="Fecha y hora de inicio" requerido>
              <Input
                type="datetime-local"
                value={inicioStr}
                onChange={(e) => setInicioStr(e.target.value)}
                required
              />
            </Field>

            <Field etiqueta="Fecha y hora de fin" requerido>
              <Input
                type="datetime-local"
                value={finStr}
                onChange={(e) => setFinStr(e.target.value)}
                required
              />
            </Field>

            <Field etiqueta="Sede de retiro" requerido>
              <Select
                valor={sedeEntregaId}
                onCambio={setSedeEntregaId}
                opciones={opcionesSedes}
              />
            </Field>

            <Field etiqueta="Sede de devolución" requerido>
              <Select
                valor={sedeDevolucionId}
                onCambio={setSedeDevolucionId}
                opciones={opcionesSedes}
              />
            </Field>
          </div>

          <div className="pt-2">
            <Switch
              checked={incluyeOperador}
              onCheckedChange={setIncluyeOperador}
              etiqueta="Incluir operador certificado"
              descripcion="Asigna un operario homologado y aplica el recargo diario correspondiente según la categoría."
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
