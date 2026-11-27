import { Link, useParams, useSearchParams } from 'react-router';
import {
  CheckCircleIcon,
  ColumnsIcon,
  GasPumpIcon,
  GaugeIcon,
  ProhibitIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { useGetInspeccionQuery, useGetPlantillaQuery, useGetReservaQuery } from '@/api/baseApi';
import { compararInspecciones, type CambioCampo } from '@/domain/inspeccion';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { formatear } from '@/shared/lib/fechas';
import { formatearNumero, pluralizar } from '@/shared/lib/formato';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { EncabezadoPagina, type Miga } from '@/shared/ui/EncabezadoPagina';
import { Stat } from '@/shared/ui/Stat';
import { Respuesta } from '../components/Respuesta';

const MIGAS: Miga[] = [{ etiqueta: 'Inspecciones', to: '/inspecciones' }, { etiqueta: 'Comparación' }];

const conSigno = (n: number) => `${n > 0 ? '+' : ''}${formatearNumero(n)}`;

/** Diagnóstico de un punto de control: ícono y texto, nunca solo color. */
function CambioBadge({ cambio }: { cambio: CambioCampo }) {
  switch (cambio) {
    case 'dano_nuevo':
      return (
        <Badge tono="danger" icono={ProhibitIcon}>
          Daño nuevo
        </Badge>
      );
    case 'reparado':
      return (
        <Badge tono="ok" icono={CheckCircleIcon}>
          Reparado
        </Badge>
      );
    case 'falla_persistente':
      return (
        <Badge tono="warn" icono={WarningIcon}>
          Preexistente
        </Badge>
      );
    case 'igual':
    default:
      return <span className="text-[13px] text-ink-3">Sin cambios</span>;
  }
}

export default function ComparacionPage() {
  const { reservaId = '' } = useParams<{ reservaId: string }>();
  const [searchParams] = useSearchParams();

  const salidaParam = searchParams.get('salidaId') ?? '';
  const devolucionParam = searchParams.get('devolucionId') ?? '';

  // Si se entra directamente por /inspecciones/comparar/:reservaId sin query params, resuelve desde la reserva
  const {
    data: reserva,
    isLoading: cargandoReserva,
    error: errorReserva,
    refetch: recargarReserva,
  } = useGetReservaQuery(reservaId, {
    skip: !reservaId || (Boolean(salidaParam) && Boolean(devolucionParam)),
  });

  const salidaId = salidaParam || reserva?.inspeccionSalidaId || '';
  const devolucionId = devolucionParam || reserva?.inspeccionDevolucionId || '';

  const {
    data: salida,
    isLoading: cargandoS,
    error: errorS,
    refetch: recargarS,
  } = useGetInspeccionQuery(salidaId, { skip: !salidaId });
  const {
    data: devolucion,
    isLoading: cargandoD,
    error: errorD,
    refetch: recargarD,
  } = useGetInspeccionQuery(devolucionId, { skip: !devolucionId });

  const {
    data: plantillaS,
    isLoading: cargandoPlantilla,
    error: errorPlantilla,
    refetch: recargarPlantilla,
  } = useGetPlantillaQuery(
    { id: salida?.plantillaId ?? '', version: salida?.plantillaVersion },
    { skip: !salida },
  );
  const { data: plantillaD } = useGetPlantillaQuery(
    { id: devolucion?.plantillaId ?? '', version: devolucion?.plantillaVersion },
    { skip: !devolucion },
  );

  const cargando = cargandoReserva || cargandoS || cargandoD || cargandoPlantilla;
  const error = errorReserva || errorS || errorD || errorPlantilla;

  const ref = useEntrada<HTMLDivElement>([cargando]);

  if (cargando) {
    return (
      <div ref={ref} className="mx-auto w-full max-w-[1400px]" aria-busy="true">
        <div className="mb-5 space-y-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-7 w-80 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="tarjeta space-y-3 p-5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
          <div className="tarjeta overflow-hidden">
            <div className="flex h-10 items-center px-4">
              <Skeleton className="h-3.5 w-32" />
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex h-12 items-center gap-6 border-t border-line px-4">
                <Skeleton className="h-4 w-56 max-w-[45%]" />
                <Skeleton className="ml-auto h-4 w-14" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="hidden h-[22px] w-24 rounded-full sm:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div ref={ref} className="mx-auto w-full max-w-[1400px]">
        <EncabezadoPagina migas={MIGAS} titulo="Comparación de inspecciones" />
        <ErrorState
          error={error}
          onReintentar={() => {
            if (errorReserva) void recargarReserva();
            if (errorS) void recargarS();
            if (errorD) void recargarD();
            if (errorPlantilla && salida) void recargarPlantilla();
          }}
        />
      </div>
    );
  }

  if (!salidaId || !devolucionId || !salida || !devolucion || !plantillaS) {
    return (
      <div ref={ref} className="mx-auto w-full max-w-[1400px]">
        <EncabezadoPagina migas={MIGAS} titulo="Comparación de inspecciones" />
        <EmptyState
          icono={ColumnsIcon}
          titulo="Faltan inspecciones para comparar"
          descripcion="Abra la comparación desde una reserva que tenga inspección de salida y de devolución."
          accion={
            <Button asChild>
              <Link to="/inspecciones">Ver inspecciones</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const comparativa = compararInspecciones(salida, devolucion, plantillaS, plantillaD ?? plantillaS);
  const nuevos = comparativa.daniosNuevos.length;
  const difCombustible = comparativa.difCombustible;
  const pct = (v: number | undefined) => (v === undefined ? 'sin dato' : `${v} %`);
  const hayFotos = salida.evidencias.length > 0 || devolucion.evidencias.length > 0;

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1400px]">
      <EncabezadoPagina
        migas={MIGAS}
        titulo="Comparación de inspecciones"
        descripcion={`Salida del ${formatear(salida.realizadaEn, 'America/Caracas', 'dd/MM/yyyy')} frente a devolución del ${formatear(devolucion.realizadaEn, 'America/Caracas', 'dd/MM/yyyy')}. ${
          nuevos > 0 ? pluralizar(nuevos, 'daño nuevo', 'daños nuevos') : 'Sin daños nuevos'
        } en ${pluralizar(comparativa.campos.length, 'punto', 'puntos')} de control.`}
      />

      <div className="space-y-6">
        <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-3" data-entrada>
          <Stat
            etiqueta="Uso en el alquiler"
            valor={comparativa.difLectura}
            formato={conSigno}
            icono={GaugeIcon}
            detalle={
              <>
                Medidor: de <span className="font-mono">{formatearNumero(salida.lectura)}</span> a{' '}
                <span className="font-mono">{formatearNumero(devolucion.lectura)}</span>
              </>
            }
          />
          <Stat
            etiqueta="Diferencia de combustible"
            valor={difCombustible ?? 0}
            formato={difCombustible === null ? () => 'Sin dato' : (n) => `${conSigno(n)} %`}
            icono={GasPumpIcon}
            tono={difCombustible !== null && difCombustible < 0 ? 'danger' : 'neutro'}
            detalle={`Tanque: de ${pct(salida.combustiblePct)} a ${pct(devolucion.combustiblePct)}`}
          />
          <Stat
            etiqueta="Daños nuevos"
            valor={nuevos}
            icono={nuevos > 0 ? WarningIcon : CheckCircleIcon}
            tono={nuevos > 0 ? 'danger' : 'ok'}
            detalle={
              nuevos > 0
                ? 'Genera cargo al cliente o requiere orden de taller.'
                : 'La unidad retornó en las mismas condiciones.'
            }
          />
        </section>

        <section aria-label="Comparación punto a punto" className="tarjeta overflow-hidden" data-entrada>
          {comparativa.campos.length === 0 ? (
            <EmptyState
              icono={ColumnsIcon}
              titulo="Sin puntos comparables"
              descripcion="Las plantillas de estas inspecciones no tienen puntos de control en común."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="th-tabla">
                      Punto de control
                    </th>
                    <th scope="col" className="th-tabla">
                      Salida
                    </th>
                    <th scope="col" className="th-tabla">
                      Devolución
                    </th>
                    <th scope="col" className="th-tabla hidden text-right sm:table-cell">
                      Cambio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparativa.campos.map(({ campo, salida: valS, devolucion: valD, cambio }) => (
                    <tr key={campo.id} className="fila-tabla h-12">
                      <th scope="row" className="px-4 py-2.5 font-normal">
                        <span className="texto-bonito block text-ink">{campo.etiqueta}</span>
                        {campo.critico && <span className="block text-[13px] text-ink-3">Punto crítico</span>}
                        {cambio !== 'igual' && (
                          <span className="mt-1.5 block sm:hidden">
                            <CambioBadge cambio={cambio} />
                          </span>
                        )}
                      </th>
                      <td className="px-4 py-2.5">
                        <Respuesta
                          campo={campo}
                          valor={valS}
                          esFalla={cambio === 'reparado' || cambio === 'falla_persistente'}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Respuesta
                          campo={campo}
                          valor={valD}
                          esFalla={cambio === 'dano_nuevo' || cambio === 'falla_persistente'}
                        />
                      </td>
                      <td className="hidden px-4 py-2.5 text-right sm:table-cell">
                        <CambioBadge cambio={cambio} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Evidencias fotográficas lado a lado (RF-INS-05) */}
        {hayFotos && (
          <section aria-label="Evidencias comparadas" className="grid gap-6 lg:grid-cols-2" data-entrada>
            <div className="tarjeta p-5">
              <h2 className="text-[15px] font-semibold text-ink">
                Fotos de salida <span className="font-normal text-ink-3">({salida.evidencias.length})</span>
              </h2>
              {salida.evidencias.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-3">Sin fotografías registradas en la salida.</p>
              ) : (
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {salida.evidencias.map((ev, i) => (
                    <li key={ev.id ?? i}>
                      <img
                        src={ev.url}
                        alt={`Salida: ${ev.nombre}`}
                        loading="lazy"
                        className="aspect-[4/3] w-full rounded-lg border border-line bg-panel-2 object-cover"
                      />
                      <p className="mt-1 truncate text-xs text-ink-3">{ev.nombre}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="tarjeta p-5">
              <h2 className="text-[15px] font-semibold text-ink">
                Fotos de devolución <span className="font-normal text-ink-3">({devolucion.evidencias.length})</span>
              </h2>
              {devolucion.evidencias.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-3">Sin fotografías registradas en la devolución.</p>
              ) : (
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {devolucion.evidencias.map((ev, i) => (
                    <li key={ev.id ?? i}>
                      <img
                        src={ev.url}
                        alt={`Devolución: ${ev.nombre}`}
                        loading="lazy"
                        className="aspect-[4/3] w-full rounded-lg border border-line bg-panel-2 object-cover"
                      />
                      <p className="mt-1 truncate text-xs text-ink-3">{ev.nombre}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
