import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ColumnsIcon, ProhibitIcon, WarningCircleIcon } from '@phosphor-icons/react';
import {
  useGetActivoQuery,
  useGetInspeccionQuery,
  useGetPlantillaQuery,
  useGetReservaQuery,
  useGetUsuariosQuery,
} from '@/api/baseApi';
import { falla } from '@/domain/inspeccion';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { formatear } from '@/shared/lib/fechas';
import { formatearNumero } from '@/shared/lib/formato';
import { Badge, Button, ErrorState, Skeleton } from '@/shared/ui';
import { EncabezadoPagina, type Miga } from '@/shared/ui/EncabezadoPagina';
import { ResultadoInspeccionBadge } from '@/shared/ui/dominio';
import { ETIQUETA_MOMENTO, MomentoBadge } from '../components/momento';
import { Respuesta } from '../components/Respuesta';

const MIGAS: Miga[] = [{ etiqueta: 'Inspecciones', to: '/inspecciones' }, { etiqueta: 'Acta' }];

/** Fila de la ficha de datos: etiqueta a la izquierda, valor a la derecha. */
function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-ink-3">{etiqueta}</dt>
      <dd className="min-w-0 text-right text-ink">{children}</dd>
    </div>
  );
}

/** Esqueleto de una sección del checklist: título y filas de punto de control con su respuesta. */
function FilasEsqueleto() {
  return (
    <div aria-busy="true">
      <Skeleton className="h-5 w-40" />
      <div className="mt-2 divide-y divide-line border-t border-line">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-6 py-3">
            <Skeleton className="h-4 w-56 max-w-[60%]" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InspeccionPage() {
  const { id } = useParams<{ id: string }>();

  const { data: inspeccion, isLoading, error, refetch } = useGetInspeccionQuery(id ?? '');
  const { data: detalleActivo } = useGetActivoQuery(inspeccion?.activoId ?? '', { skip: !inspeccion });
  const { data: reserva } = useGetReservaQuery(inspeccion?.reservaId ?? '', { skip: !inspeccion?.reservaId });
  const {
    data: plantilla,
    isLoading: cargandoPlantilla,
    error: errorPlantilla,
    refetch: recargarPlantilla,
  } = useGetPlantillaQuery(
    { id: inspeccion?.plantillaId ?? '', version: inspeccion?.plantillaVersion },
    { skip: !inspeccion },
  );
  const { data: usuarios = [] } = useGetUsuariosQuery();

  // La entrada se repite cuando el acta real reemplaza a los esqueletos.
  const ref = useEntrada<HTMLDivElement>([isLoading]);

  if (isLoading) {
    return (
      <div ref={ref} className="mx-auto w-full max-w-[1400px]" aria-busy="true">
        <div className="mb-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <Skeleton className="h-80 rounded-xl lg:col-start-2 lg:row-start-1" />
          <div className="lg:col-start-1 lg:row-start-1">
            <FilasEsqueleto />
          </div>
        </div>
      </div>
    );
  }

  if (error || !inspeccion) {
    return (
      <div ref={ref} className="mx-auto w-full max-w-[1400px]">
        <EncabezadoPagina migas={MIGAS} titulo="Inspección" />
        <ErrorState error={error} onReintentar={() => void refetch()} />
      </div>
    );
  }

  const inspector = usuarios.find((u) => u.id === inspeccion.inspectorId);
  const activo = detalleActivo?.activo;

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1400px]">
      <EncabezadoPagina
        migas={MIGAS}
        titulo={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            Inspección de {ETIQUETA_MOMENTO[inspeccion.momento].toLowerCase()}
            <ResultadoInspeccionBadge resultado={inspeccion.resultado} />
          </span>
        }
        descripcion={
          <>
            <Link to={`/inventario/${inspeccion.activoId}`} className="font-mono text-ink hover:text-accent-fg hover:underline">
              {activo?.codigo ?? inspeccion.activoId}
            </Link>
            {activo && ` ${activo.marca} ${activo.modelo}`}
          </>
        }
        acciones={
          reserva &&
          reserva.inspeccionSalidaId &&
          reserva.inspeccionDevolucionId && (
            <Button asChild variante="primario">
              <Link
                to={`/inspecciones/comparar/${reserva.id}?salidaId=${reserva.inspeccionSalidaId}&devolucionId=${reserva.inspeccionDevolucionId}`}
              >
                <ColumnsIcon size={16} aria-hidden />
                Comparar con contraparte
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        {/* Ficha de datos: primero en móvil, a la derecha en escritorio */}
        <aside
          aria-label="Datos de la inspección"
          className="tarjeta p-5 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1"
          data-entrada
        >
          <h2 className="text-[15px] font-semibold text-ink">Datos</h2>
          <dl className="mt-2 divide-y divide-line text-sm">
            <Dato etiqueta="Acta">
              <span className="break-all font-mono">{inspeccion.id}</span>
            </Dato>
            <Dato etiqueta="Momento">
              <MomentoBadge momento={inspeccion.momento} />
            </Dato>
            <Dato etiqueta="Fecha">
              <span className="tabular font-mono">
                {formatear(inspeccion.realizadaEn, 'America/Caracas', 'dd/MM/yyyy HH:mm')}
              </span>
            </Dato>
            <Dato etiqueta="Inspector">{inspector?.nombre ?? inspeccion.inspectorId}</Dato>
            <Dato etiqueta="Reserva">
              {reserva ? (
                <Link to={`/reservas/${reserva.id}`} className="font-mono text-accent-fg hover:underline">
                  {reserva.codigo}
                </Link>
              ) : (
                <span className="text-ink-3">Sin reserva</span>
              )}
            </Dato>
            <Dato etiqueta="Medidor">
              <span className="tabular font-mono">{formatearNumero(inspeccion.lectura)}</span>
            </Dato>
            <Dato etiqueta="Combustible">
              {inspeccion.combustiblePct !== undefined ? (
                <span className="tabular font-mono">{inspeccion.combustiblePct}&nbsp;%</span>
              ) : (
                <span className="text-ink-3">Sin dato</span>
              )}
            </Dato>
          </dl>
        </aside>

        <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-1" data-entrada>
          {/* Checklist diligenciado */}
          {cargandoPlantilla ? (
            <FilasEsqueleto />
          ) : !plantilla ? (
            <ErrorState
              error={errorPlantilla}
              titulo="No se pudo cargar el checklist"
              onReintentar={() => void recargarPlantilla()}
            />
          ) : (
            plantilla.secciones.map((sec) => {
              const campos = sec.campos.filter((c) => inspeccion.respuestas[c.id] !== undefined);
              if (campos.length === 0) return null;

              return (
                <section key={sec.id}>
                  <h2 className="text-[15px] font-semibold text-ink">{sec.titulo}</h2>
                  <dl className="mt-2 divide-y divide-line border-t border-line text-sm">
                    {campos.map((c) => {
                      const valor = inspeccion.respuestas[c.id];
                      const esFalla = falla(c, valor);

                      return (
                        <div key={c.id} className="flex items-center justify-between gap-6 py-3">
                          <dt className="min-w-0">
                            <span className="texto-bonito block text-ink">{c.etiqueta}</span>
                            {c.critico && <span className="block text-[13px] text-ink-3">Punto crítico</span>}
                          </dt>
                          <dd className="flex max-w-[60%] flex-wrap items-center justify-end gap-x-2.5 gap-y-1 text-right">
                            <Respuesta campo={c} valor={valor} />
                            {esFalla && (
                              <Badge
                                tono={c.critico ? 'danger' : 'warn'}
                                icono={c.critico ? ProhibitIcon : WarningCircleIcon}
                              >
                                Falla
                              </Badge>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </section>
              );
            })
          )}

          {/* Evidencias fotográficas */}
          {inspeccion.evidencias && inspeccion.evidencias.length > 0 && (
            <section>
              <h2 className="text-[15px] font-semibold text-ink">
                Evidencias <span className="tabular font-normal text-ink-3">{inspeccion.evidencias.length}</span>
              </h2>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {inspeccion.evidencias.map((ev, i) => (
                  <li key={i}>
                    <figure>
                      <img
                        src={ev.url}
                        alt={`Evidencia ${i + 1}: ${ev.nombre}`}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full rounded-lg border border-line bg-panel-2 object-cover"
                      />
                      <figcaption className="mt-1.5 truncate text-xs text-ink-3">{ev.nombre}</figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Observaciones */}
          {inspeccion.observaciones && (
            <section>
              <h2 className="text-[15px] font-semibold text-ink">Observaciones</h2>
              <p className="texto-bonito mt-2 max-w-[70ch] whitespace-pre-line text-sm leading-relaxed text-ink-2">
                {inspeccion.observaciones}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
