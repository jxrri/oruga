import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ColumnsIcon,
  FileTextIcon,
  GasPumpIcon,
  GaugeIcon,
  ProhibitIcon,
  TruckIcon,
} from '@phosphor-icons/react';
import {
  useGetActivoQuery,
  useGetInspeccionQuery,
  useGetPlantillaQuery,
  useGetReservaQuery,
  useGetUsuariosQuery,
} from '@/api/baseApi';
import { falla } from '@/domain/inspeccion';
import { formatear } from '@/shared/lib/fechas';
import { Button, ErrorState, Skeleton } from '@/shared/ui';
import { ResultadoInspeccionBadge } from '@/shared/ui/dominio';

export default function InspeccionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: inspeccion, isLoading, error, refetch } = useGetInspeccionQuery(id ?? '');
  const { data: detalleActivo } = useGetActivoQuery(inspeccion?.activoId ?? '', { skip: !inspeccion });
  const { data: reserva } = useGetReservaQuery(inspeccion?.reservaId ?? '', { skip: !inspeccion?.reservaId });
  const { data: plantilla } = useGetPlantillaQuery(
    { id: inspeccion?.plantillaId ?? '', version: inspeccion?.plantillaVersion },
    { skip: !inspeccion },
  );
  const { data: usuarios = [] } = useGetUsuariosQuery();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !inspeccion) {
    return (
      <div className="p-8">
        <ErrorState onReintentar={() => void refetch()} />
      </div>
    );
  }

  const inspector = usuarios.find((u) => u.id === inspeccion.inspectorId);
  const activo = detalleActivo?.activo;

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Barra de Navegación */}
      <div className="border-b border-border bg-card/60 px-6 py-3.5 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variante="fantasma"
            tamano="sm"
            icono={ArrowLeftIcon}
            onClick={() => navigate('/inspecciones')}
          >
            Inspecciones
          </Button>
          <span className="text-border">/</span>
          <span className="font-mono text-xs font-black text-foreground">
            Acta {inspeccion.momento.toUpperCase()} · {inspeccion.id}
          </span>
        </div>

        {reserva && reserva.inspeccionSalidaId && reserva.inspeccionDevolucionId && (
          <Button
            variante="secundario"
            tamano="sm"
            icono={ColumnsIcon}
            onClick={() =>
              navigate(
                `/inspecciones/comparacion?salidaId=${reserva.inspeccionSalidaId}&devolucionId=${reserva.inspeccionDevolucionId}`,
              )
            }
          >
            Comparar con Contraparte
          </Button>
        )}
      </div>

      {/* Hero Acta */}
      <div className="border-b border-border/80 bg-card/30 p-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider ${
                  inspeccion.momento === 'salida'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                }`}
              >
                Inspección de {inspeccion.momento}
              </span>
              <ResultadoInspeccionBadge resultado={inspeccion.resultado} />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-primary" />
              <span>
                Activo: <strong className="font-mono">{activo?.codigo ?? inspeccion.activoId}</strong>
              </span>
              {activo && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({activo.marca} {activo.modelo})
                </span>
              )}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
              <span>
                Fecha: {formatear(inspeccion.realizadaEn, 'America/Caracas', 'dd/MM/yyyy HH:mm')}
              </span>
              <span>·</span>
              <span>Inspector: {inspector?.nombre ?? inspeccion.inspectorId}</span>
              {reserva && (
                <>
                  <span>·</span>
                  <span>Reserva: {reserva.codigo}</span>
                </>
              )}
            </div>
          </div>

          {/* Medidores Clave */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono border-l border-border/60 pl-6">
            <div className="rounded-xl border border-border bg-card p-3">
              <span className="text-[10px] text-muted-foreground block flex items-center gap-1">
                <GaugeIcon className="h-3.5 w-3.5 text-primary" /> MEDIDOR
              </span>
              <span className="text-base font-black text-foreground">{inspeccion.lectura}</span>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <span className="text-[10px] text-muted-foreground block flex items-center gap-1">
                <GasPumpIcon className="h-3.5 w-3.5 text-primary" /> COMBUSTIBLE
              </span>
              <span className="text-base font-black text-foreground">
                {inspeccion.combustiblePct !== undefined ? `${inspeccion.combustiblePct}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido del Checklist Diligenciado */}
      <div className="max-w-5xl mx-auto w-full p-6 space-y-6 flex-1">
        {plantilla?.secciones.map((sec) => (
          <div key={sec.id} className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground border-b border-border/50 pb-2">
              {sec.titulo}
            </h2>

            <div className="divide-y divide-border/40">
              {sec.campos.map((c) => {
                const valor = inspeccion.respuestas[c.id];
                if (valor === undefined) return null;

                const esFalla = falla(c, valor);

                return (
                  <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-foreground block">{c.etiqueta}</span>
                      {c.critico && (
                        <span className="text-[10px] font-mono text-destructive uppercase">Punto Crítico</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-foreground font-medium">
                        {typeof valor === 'boolean'
                          ? valor
                            ? 'Conforme'
                            : 'No conforme'
                          : String(valor)}
                      </span>

                      {esFalla ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/15 px-2 py-0.5 rounded">
                          <ProhibitIcon className="h-3 w-3" /> Falla
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded">
                          <CheckCircleIcon className="h-3 w-3" /> OK
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Evidencias Fotográficas */}
        {inspeccion.evidencias && inspeccion.evidencias.length > 0 && (
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileTextIcon className="h-4 w-4 text-primary" /> Evidencias Fotográficas ({inspeccion.evidencias.length})
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {inspeccion.evidencias.map((ev, i) => (
                <div key={i} className="group relative rounded-lg border border-border overflow-hidden bg-black/40">
                  <img src={ev.url} alt={ev.nombre} className="h-28 w-full object-cover" />
                  <div className="p-2 text-[10px] font-mono text-muted-foreground truncate">
                    {ev.nombre}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observaciones */}
        {inspeccion.observaciones && (
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Observaciones del Inspector
            </h3>
            <p className="text-xs text-foreground bg-muted/20 p-3 rounded-lg border border-border/50">
              {inspeccion.observaciones}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
