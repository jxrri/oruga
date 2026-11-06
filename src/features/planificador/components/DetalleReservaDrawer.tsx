import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  TruckIcon,
  UserIcon,
  WarningCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import type { Activo, Categoria, Cliente, Reserva, Sede, ZonaIANA } from '@/api/contrato';
import { useTransicionReservaMutation } from '@/api/baseApi';
import { formatear } from '@/shared/lib/fechas';
import { Button } from '@/shared/ui/Button';
import { Sheet, SheetContent } from '@/shared/ui/Sheet';
import { EstadoReservaBadge } from '@/shared/ui/dominio';
import { Monto } from '@/shared/ui/Monto';
import { Field, Textarea } from '@/shared/ui/Field';
import { ErrorState } from '@/shared/ui/Estados';

export interface DetalleReservaDrawerProps {
  reserva: Reserva | null;
  activo?: Activo;
  categoria?: Categoria;
  cliente?: Cliente;
  sedeEntrega?: Sede;
  sedeDevolucion?: Sede;
  abierto: boolean;
  onCerrar: () => void;
  zona: ZonaIANA;
}

export function DetalleReservaDrawer({
  reserva,
  activo,
  categoria,
  cliente,
  sedeEntrega,
  sedeDevolucion,
  abierto,
  onCerrar,
  zona,
}: DetalleReservaDrawerProps) {
  const navigate = useNavigate();
  const [transicion, { isLoading }] = useTransicionReservaMutation();

  const [modalCancelar, setModalCancelar] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [errorAccion, setErrorAccion] = useState<unknown>(null);

  if (!reserva) return null;

  const ejecutarTransicion = async (
    accion: 'confirmar' | 'entregar' | 'devolver' | 'cancelar',
    motivo?: string,
  ) => {
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
        setMotivoCancelacion('');
      }
    } catch (err: unknown) {
      setErrorAccion(err);
    }
  };

  return (
    <Sheet open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent
        titulo={
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-semibold text-ink">{reserva.codigo}</span>
            <EstadoReservaBadge estado={reserva.estado} />
          </div>
        }
        descripcion="Detalle y ciclo operativo de la reserva."
        pie={
          <div className="flex w-full items-center justify-between">
            <Button
              variante="fantasma"
              tamano="sm"
              icono={FileTextIcon}
              onClick={() => navigate(`/reservas/${reserva.id}`)}
            >
              Ficha completa
            </Button>

            <Button variante="secundario" tamano="sm" onClick={onCerrar}>
              Cerrar
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {Boolean(errorAccion) && (
            <ErrorState error={errorAccion} compacto onCerrar={() => setErrorAccion(null)} />
          )}

          {/* Botones de acción según estado */}
          {reserva.estado !== 'cancelada' && reserva.estado !== 'finalizada' && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel-2 p-3">
              <span className="mb-0.5 w-full text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                Acciones operativas
              </span>

              {reserva.estado === 'borrador' && (
                <Button
                  variante="primario"
                  tamano="sm"
                  icono={CheckCircleIcon}
                  onClick={() => ejecutarTransicion('confirmar')}
                  cargando={isLoading}
                >
                  Confirmar reserva
                </Button>
              )}

              {reserva.estado === 'confirmada' && (
                <Button
                  variante="primario"
                  tamano="sm"
                  icono={TruckIcon}
                  onClick={() => ejecutarTransicion('entregar')}
                  cargando={isLoading}
                >
                  Registrar salida
                </Button>
              )}

              {reserva.estado === 'en_curso' && (
                <Button
                  variante="primario"
                  tamano="sm"
                  icono={CalendarCheckIcon}
                  onClick={() => ejecutarTransicion('devolver')}
                  cargando={isLoading}
                >
                  Registrar devolución
                </Button>
              )}

              <Button
                variante="peligro"
                tamano="sm"
                icono={XCircleIcon}
                onClick={() => setModalCancelar(!modalCancelar)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          )}

          {modalCancelar && (
            <div className="space-y-3 rounded-xl border border-danger/35 bg-danger-soft p-3.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                <WarningCircleIcon size={16} aria-hidden /> Cancelación de reserva
              </span>
              <Field etiqueta="Motivo de cancelación" requerido>
                <Textarea
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Ej. Solicitud del cliente, reprogramación de frente de obra…"
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
                  disabled={!motivoCancelacion.trim() || isLoading}
                  onClick={() => ejecutarTransicion('cancelar', motivoCancelacion)}
                  cargando={isLoading}
                >
                  Confirmar cancelación
                </Button>
              </div>
            </div>
          )}

          {/* Cliente */}
          <div className="space-y-2 rounded-xl border border-line bg-panel p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                <UserIcon size={16} className="text-accent-fg" aria-hidden /> Cliente
              </span>
              {cliente && (
                <button
                  type="button"
                  onClick={() => navigate(`/clientes/${cliente.id}`)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent-fg hover:underline"
                >
                  Ver cliente <ArrowRightIcon size={12} aria-hidden />
                </button>
              )}
            </div>
            <p className="text-sm font-semibold text-ink">
              {cliente?.nombre ?? reserva.clienteId}
            </p>
            {cliente && (
              <div className="flex flex-wrap items-center gap-3 font-mono tabular text-xs text-ink-3">
                <span>RIF/Doc: {cliente.documento}</span>
                <span>Tel: {cliente.telefono}</span>
              </div>
            )}
          </div>

          {/* Activo */}
          <div className="space-y-2 rounded-xl border border-line bg-panel p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                <TruckIcon size={16} className="text-accent-fg" aria-hidden /> Equipo asignado
              </span>
              {activo && (
                <button
                  type="button"
                  onClick={() => navigate(`/inventario/${activo.id}`)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent-fg hover:underline"
                >
                  Ver ficha <ArrowRightIcon size={12} aria-hidden />
                </button>
              )}
            </div>
            {activo ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-ink">{activo.codigo}</span>
                  <span className="text-xs text-ink-2">
                    {activo.marca} {activo.modelo}
                  </span>
                </div>
                <div className="text-xs text-ink-3">
                  Categoría: <strong className="font-medium text-ink">{categoria?.nombre}</strong> ·{' '}
                  Capacidad: {activo.capacidad}&nbsp;{categoria?.unidadCapacidad}
                </div>
              </div>
            ) : (
              <span className="text-xs text-ink-3">Sin unidad asignada</span>
            )}
          </div>

          {/* Fechas y cronograma */}
          <div className="space-y-2.5 rounded-xl border border-line bg-panel p-3.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
              <ClockIcon size={16} className="text-accent-fg" aria-hidden /> Ventana operativa ({zona})
            </span>
            <div className="grid grid-cols-2 gap-2 font-mono tabular text-xs">
              <div className="rounded-lg border border-line bg-panel-2 p-2.5">
                <span className="block text-[10px] font-sans font-medium uppercase tracking-wider text-ink-3">
                  Inicio
                </span>
                <span className="mt-0.5 block font-semibold text-ink">
                  {formatear(reserva.inicio, zona, 'dd MMM yyyy HH:mm')}
                </span>
              </div>
              <div className="rounded-lg border border-line bg-panel-2 p-2.5">
                <span className="block text-[10px] font-sans font-medium uppercase tracking-wider text-ink-3">
                  Fin
                </span>
                <span className="mt-0.5 block font-semibold text-ink">
                  {formatear(reserva.fin, zona, 'dd MMM yyyy HH:mm')}
                </span>
              </div>
            </div>
            <div className="space-y-1 pt-0.5 text-xs text-ink-2">
              <div>
                Retiro en:{' '}
                <strong className="font-medium text-ink">
                  {sedeEntrega?.nombre ?? reserva.sedeRetiroId}
                </strong>
              </div>
              <div>
                Devolución en:{' '}
                <strong className="font-medium text-ink">
                  {sedeDevolucion?.nombre ?? reserva.sedeDevolucionId}
                </strong>
              </div>
            </div>
          </div>

          {/* Tarifa y operador */}
          <div className="space-y-2 rounded-xl border border-line bg-panel p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-ink-2">
              <span>Importe estimado</span>
              {reserva.conOperador && (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold text-accent-fg">
                  Con operador certificado
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs text-ink-3">Total proyectado:</span>
              <Monto
                centavos={reserva.montoEstimado}
                disposicion="apilado"
                className="items-end text-lg font-semibold text-ink"
                classNameBs="text-xs"
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
