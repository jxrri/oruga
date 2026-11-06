import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeftIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  ColumnsIcon,
  FileTextIcon,
  ShieldCheckIcon,
  TruckIcon,
  WarningCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import {
  useGetActivosQuery,
  useGetCategoriasQuery,
  useGetClientesQuery,
  useGetHistorialReservaQuery,
  useGetReservaQuery,
  useGetSedesQuery,
  useTransicionReservaMutation,
} from '@/api/baseApi';
import { formatear } from '@/shared/lib/fechas';
import { Button, ErrorState, Skeleton } from '@/shared/ui';
import { Field, Textarea } from '@/shared/ui/Field';
import { Monto } from '@/shared/ui/Monto';
import { EstadoReservaBadge } from '@/shared/ui/dominio';

export default function ReservaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: reserva, isLoading, error, refetch } = useGetReservaQuery(id ?? '');
  const { data: historial = [] } = useGetHistorialReservaQuery(id ?? '');
  const { data: clientes = [] } = useGetClientesQuery();
  const { data: activos = [] } = useGetActivosQuery();
  const { data: categorias = [] } = useGetCategoriasQuery();
  const { data: sedes = [] } = useGetSedesQuery();

  const [transicion, { isLoading: transicionando }] = useTransicionReservaMutation();
  const [modalCancelar, setModalCancelar] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [errorAccion, setErrorAccion] = useState<unknown>(null);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !reserva) {
    return (
      <div className="p-8">
        <ErrorState error={error} onReintentar={() => void refetch()} />
      </div>
    );
  }

  const cliente = clientes.find((c) => c.id === reserva.clienteId);
  const activo = reserva.activoId ? activos.find((a) => a.id === reserva.activoId) : undefined;
  const categoria = categorias.find((c) => c.id === reserva.categoriaId);
  const sedeRetiro = sedes.find((s) => s.id === reserva.sedeRetiroId);
  const sedeDevolucion = sedes.find((s) => s.id === reserva.sedeDevolucionId);

  const ejecutarTransicion = async (accion: 'confirmar' | 'entregar' | 'devolver' | 'cancelar', motivo?: string) => {
    setErrorAccion(null);
    try {
      await transicion({
        id: reserva.id,
        accion,
        version: reserva.version,
        motivo,
      }).unwrap();
      if (accion === 'cancelar') {
        setModalCancelar(false);
      }
    } catch (err: unknown) {
      setErrorAccion(err);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Barra de Navegación y Acciones */}
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
          <span className="font-mono text-xs font-black text-foreground">{reserva.codigo}</span>
        </div>

        <div className="flex items-center gap-2">
          {reserva.estado === 'borrador' && (
            <Button
              variante="primario"
              tamano="sm"
              icono={CheckCircleIcon}
              onClick={() => ejecutarTransicion('confirmar')}
              cargando={transicionando}
            >
              Confirmar Reserva
            </Button>
          )}

          {reserva.estado === 'confirmada' && (
            <Button
              variante="primario"
              tamano="sm"
              icono={TruckIcon}
              className="bg-sky-600 hover:bg-sky-500"
              onClick={() => ejecutarTransicion('entregar')}
              cargando={transicionando}
            >
              Despachar / Entregar
            </Button>
          )}

          {reserva.estado === 'en_curso' && (
            <Button
              variante="primario"
              tamano="sm"
              icono={CalendarCheckIcon}
              className="bg-emerald-600 hover:bg-emerald-500"
              onClick={() => ejecutarTransicion('devolver')}
              cargando={transicionando}
            >
              Registrar Devolución
            </Button>
          )}

          {reserva.estado !== 'cancelada' && reserva.estado !== 'finalizada' && (
            <Button
              variante="peligro"
              tamano="sm"
              icono={XCircleIcon}
              onClick={() => setModalCancelar(!modalCancelar)}
              disabled={transicionando}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Hero Contrato */}
      <div className="border-b border-border/80 bg-card/30 p-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black font-mono tracking-tight text-foreground">
                {reserva.codigo}
              </h1>
              <EstadoReservaBadge estado={reserva.estado} />
              {reserva.conOperador && (
                <span className="rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
                  Con Operador Homologado
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-foreground">
                {cliente?.nombre} ({cliente?.documento})
              </span>
              {activo && (
                <span className="text-muted-foreground font-mono text-xs">
                  · Activo: <strong className="text-foreground">{activo.codigo}</strong> ({activo.marca} {activo.modelo} - {categoria?.nombre})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
              <span>
                Período: {formatear(reserva.inicio, 'America/Caracas', 'dd/MM/yyyy HH:mm')} →{' '}
                {formatear(reserva.fin, 'America/Caracas', 'dd/MM/yyyy HH:mm')}
              </span>
              <span>·</span>
              <span>Retiro: {sedeRetiro?.nombre}</span>
              <span>·</span>
              <span>Devolución: {sedeDevolucion?.nombre}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 min-w-[160px] text-right">
            <span className="text-[10px] text-muted-foreground block font-mono">IMPORTE DEL CONTRATO</span>
            <Monto centavos={reserva.montoEstimado} className="text-2xl font-black text-primary" />
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto w-full p-6 space-y-6 flex-1">
        {Boolean(errorAccion) && (
          <ErrorState error={errorAccion} compacto onCerrar={() => setErrorAccion(null)} />
        )}

        {modalCancelar && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-3">
            <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
              <WarningCircleIcon className="h-4 w-4" /> Justificación de Cancelación
            </span>
            <Field etiqueta="Motivo de cancelación" requerido>
              <Textarea
                value={motivoCancelacion}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMotivoCancelacion(e.target.value)}
                placeholder="Indique la causa operativa o petición del cliente..."
                rows={2}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variante="fantasma" tamano="sm" onClick={() => setModalCancelar(false)}>
                Descartar
              </Button>
              <Button
                variante="peligro"
                tamano="sm"
                disabled={!motivoCancelacion.trim() || transicionando}
                onClick={() => ejecutarTransicion('cancelar', motivoCancelacion)}
                cargando={transicionando}
              >
                Confirmar Cancelación
              </Button>
            </div>
          </div>
        )}

        {/* Panel de Inspecciones Salida / Devolución */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-primary" /> Protocolo de Inspecciones y Checklist
            </h2>

            {reserva.inspeccionSalidaId && reserva.inspeccionDevolucionId && (
              <Button
                variante="secundario"
                tamano="sm"
                icono={ColumnsIcon}
                onClick={() =>
                  navigate(
                    `/inspecciones/comparacion?salidaId=${reserva.inspeccionSalidaId}&devolucionId=${reserva.inspeccionDevolucionId}`,
                  )
                }
                className="text-xs font-bold"
              >
                Comparar Desgastes Salida vs Devolución
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inspección de Salida */}
            <div className="rounded-xl border border-border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Inspección de Salida (Despacho)
                </span>
                {reserva.inspeccionSalidaId ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Registrada
                  </span>
                ) : (
                  <span className="text-xs text-amber-400 font-semibold">Pendiente</span>
                )}
              </div>

              {reserva.inspeccionSalidaId ? (
                <Button
                  variante="fantasma"
                  tamano="sm"
                  iconoFin={FileTextIcon}
                  onClick={() => navigate(`/inspecciones/${reserva.inspeccionSalidaId}`)}
                  className="w-full text-xs"
                >
                  Ver Acta de Salida
                </Button>
              ) : (
                <Button
                  variante="secundario"
                  tamano="sm"
                  onClick={() =>
                    navigate(
                      `/inspecciones/nueva?reservaId=${reserva.id}&momento=salida${
                        reserva.activoId ? `&activoId=${reserva.activoId}` : ''
                      }`,
                    )
                  }
                  className="w-full text-xs font-bold"
                >
                  Realizar Inspección de Salida
                </Button>
              )}
            </div>

            {/* Inspección de Devolución */}
            <div className="rounded-xl border border-border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Inspección de Devolución (Retorno)
                </span>
                {reserva.inspeccionDevolucionId ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Registrada
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Pendiente</span>
                )}
              </div>

              {reserva.inspeccionDevolucionId ? (
                <Button
                  variante="fantasma"
                  tamano="sm"
                  iconoFin={FileTextIcon}
                  onClick={() => navigate(`/inspecciones/${reserva.inspeccionDevolucionId}`)}
                  className="w-full text-xs"
                >
                  Ver Acta de Devolución
                </Button>
              ) : (
                <Button
                  variante="secundario"
                  tamano="sm"
                  disabled={reserva.estado !== 'en_curso'}
                  onClick={() =>
                    navigate(
                      `/inspecciones/nueva?reservaId=${reserva.id}&momento=devolucion${
                        reserva.activoId ? `&activoId=${reserva.activoId}` : ''
                      }`,
                    )
                  }
                  className="w-full text-xs font-bold"
                >
                  Realizar Inspección de Retorno
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bitácora de Auditoría */}
        <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ClockCounterClockwiseIcon className="h-4 w-4 text-primary" /> Historial de Cambios y Auditoría
          </h2>

          {historial.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No hay modificaciones registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/20 font-bold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Campo Modificado</th>
                    <th className="px-3 py-2">Valor Anterior</th>
                    <th className="px-3 py-2">Nuevo Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                  {historial.map((h, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatear(h.en, 'America/Caracas', 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-3 py-2 font-bold text-foreground">{h.campo}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-xs">
                        {String(h.antes ?? '—')}
                      </td>
                      <td className="px-3 py-2 text-foreground font-semibold truncate max-w-xs">
                        {String(h.despues ?? '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
