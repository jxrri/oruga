import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  FileTextIcon,
  TruckIcon,
  WarningCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import type { Activo, Categoria, Cliente, Reserva, Sede, ZonaIANA } from '@/api/contrato';
import { useTransicionReservaMutation } from '@/api/baseApi';
import { usePuede } from '@/app/hooks';
import { formatear } from '@/shared/lib/fechas';
import { Badge } from '@/shared/ui/Badge';
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

const TITULO_SECCION = 'text-[13px] text-ink-3';
const ENLACE = 'inline-flex items-center gap-1 text-[13px] font-medium text-accent-fg hover:underline';

export function DetalleReservaDrawer(props: DetalleReservaDrawerProps) {
  if (!props.reserva || !props.abierto) return null;
  return <DetalleReservaDrawerContenido key={props.reserva.id} {...props} reserva={props.reserva} />;
}

function DetalleReservaDrawerContenido({
  reserva,
  activo,
  categoria,
  cliente,
  sedeEntrega,
  sedeDevolucion,
  abierto,
  onCerrar,
  zona,
}: Omit<DetalleReservaDrawerProps, 'reserva'> & { reserva: Reserva }) {
  const navigate = useNavigate();
  const [transicion, { isLoading }] = useTransicionReservaMutation();

  const puedeConfirmar = usePuede('confirmar', 'reserva');
  const puedeEntregar = usePuede('entregar', 'reserva');
  const puedeDevolver = usePuede('devolver', 'reserva');
  const puedeCancelar = usePuede('cancelar', 'reserva');
  const puedeInspeccionar = usePuede('crear', 'inspeccion');

  const [modalCancelar, setModalCancelar] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [errorAccion, setErrorAccion] = useState<unknown>(null);

  const cancelable = puedeCancelar && (reserva.estado === 'borrador' || reserva.estado === 'confirmada');
  const faltaSalida = reserva.estado === 'confirmada' && !reserva.inspeccionSalidaId && Boolean(reserva.activoId);
  const faltaDevolucion = reserva.estado === 'en_curso' && !reserva.inspeccionDevolucionId && Boolean(reserva.activoId);

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

  const urlInspeccion = (momento: 'salida' | 'devolucion') =>
    `/inspecciones/nueva?reservaId=${reserva.id}&momento=${momento}${reserva.activoId ? `&activoId=${reserva.activoId}` : ''}`;

  const hayAcciones =
    cancelable ||
    (reserva.estado === 'borrador' && puedeConfirmar) ||
    (reserva.estado === 'confirmada' && (puedeEntregar || (faltaSalida && puedeInspeccionar))) ||
    (reserva.estado === 'en_curso' && (puedeDevolver || (faltaDevolucion && puedeInspeccionar)));

  return (
    <Sheet open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent
        titulo={
          <div className="flex items-center gap-2">
            <span className="font-mono">{reserva.codigo}</span>
            <EstadoReservaBadge estado={reserva.estado} />
          </div>
        }
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
        <div className="px-5 pb-5">
          {Boolean(errorAccion) && (
            <ErrorState
              error={errorAccion}
              compacto
              onCerrar={() => setErrorAccion(null)}
              className="mb-4"
            />
          )}

          {hayAcciones && (
            <div className="flex flex-wrap items-center gap-2 pb-4">
              {reserva.estado === 'borrador' && puedeConfirmar && (
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

              {reserva.estado === 'confirmada' && faltaSalida && puedeInspeccionar && (
                <Button
                  variante="primario"
                  tamano="sm"
                  icono={ClipboardTextIcon}
                  onClick={() => navigate(urlInspeccion('salida'))}
                >
                  Inspección de salida
                </Button>
              )}

              {reserva.estado === 'confirmada' && puedeEntregar && (
                <Button
                  variante={faltaSalida ? 'secundario' : 'primario'}
                  tamano="sm"
                  icono={TruckIcon}
                  onClick={() => ejecutarTransicion('entregar')}
                  cargando={isLoading}
                >
                  Registrar salida
                </Button>
              )}

              {reserva.estado === 'en_curso' && faltaDevolucion && puedeInspeccionar && (
                <Button
                  variante="primario"
                  tamano="sm"
                  icono={ClipboardTextIcon}
                  onClick={() => navigate(urlInspeccion('devolucion'))}
                >
                  Inspección de devolución
                </Button>
              )}

              {reserva.estado === 'en_curso' && puedeDevolver && (
                <Button
                  variante={faltaDevolucion ? 'secundario' : 'primario'}
                  tamano="sm"
                  icono={CalendarCheckIcon}
                  onClick={() => ejecutarTransicion('devolver')}
                  cargando={isLoading}
                >
                  Registrar devolución
                </Button>
              )}

              {cancelable && (
                <Button
                  variante="fantasma"
                  tamano="sm"
                  icono={XCircleIcon}
                  onClick={() => setModalCancelar(!modalCancelar)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              )}
            </div>
          )}

          {modalCancelar && cancelable && (
            <div className="mb-4 space-y-3 rounded-lg bg-danger-soft p-4">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
                <WarningCircleIcon size={16} aria-hidden /> Cancelación de reserva
              </p>
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

          <div className="divide-y divide-line border-t border-line">
            <section className="space-y-1 py-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className={TITULO_SECCION}>Cliente</h3>
                {cliente && (
                  <button type="button" onClick={() => navigate(`/clientes/${cliente.id}`)} className={ENLACE}>
                    Ver cliente <ArrowRightIcon size={12} aria-hidden />
                  </button>
                )}
              </div>
              <p className="font-medium text-ink">{cliente?.nombre ?? reserva.clienteId}</p>
              {cliente && (
                <p className="flex flex-wrap gap-x-3 font-mono tabular text-xs text-ink-3">
                  <span>RIF/Doc: {cliente.documento}</span>
                  <span>Tel: {cliente.telefono}</span>
                </p>
              )}
            </section>

            <section className="space-y-1 py-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className={TITULO_SECCION}>Equipo asignado</h3>
                {activo && (
                  <button type="button" onClick={() => navigate(`/inventario/${activo.id}`)} className={ENLACE}>
                    Ver ficha <ArrowRightIcon size={12} aria-hidden />
                  </button>
                )}
              </div>
              {activo ? (
                <>
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono font-medium text-ink">{activo.codigo}</span>
                    <span className="text-[13px] text-ink-2">
                      {activo.marca} {activo.modelo}
                    </span>
                  </p>
                  <p className="text-[13px] text-ink-3">
                    {categoria?.nombre}, {activo.capacidad}&nbsp;{categoria?.unidadCapacidad}
                  </p>
                </>
              ) : (
                <p className="text-[13px] text-ink-3">
                  Sin unidad asignada ({categoria?.nombre ?? reserva.categoriaId})
                </p>
              )}
            </section>

            <section className="space-y-2 py-4">
              <h3 className={TITULO_SECCION}>Ventana operativa ({zona})</h3>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[13px]">
                <dt className="text-ink-3">Inicio</dt>
                <dd className="font-mono tabular text-ink">
                  {formatear(reserva.inicio, zona, 'dd MMM yyyy HH:mm')}
                </dd>
                <dt className="text-ink-3">Fin</dt>
                <dd className="font-mono tabular text-ink">
                  {formatear(reserva.fin, zona, 'dd MMM yyyy HH:mm')}
                </dd>
                <dt className="text-ink-3">Retiro</dt>
                <dd className="text-ink">{sedeEntrega?.nombre ?? reserva.sedeRetiroId}</dd>
                <dt className="text-ink-3">Devolución</dt>
                <dd className="text-ink">{sedeDevolucion?.nombre ?? reserva.sedeDevolucionId}</dd>
              </dl>
            </section>

            <section className="space-y-2 py-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className={TITULO_SECCION}>Importe estimado</h3>
                {reserva.conOperador && <Badge>Con operador certificado</Badge>}
              </div>
              <Monto
                centavos={reserva.montoEstimado}
                disposicion="apilado"
                className="font-mono text-lg font-semibold text-ink"
                classNameBs="text-xs font-normal"
              />
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
