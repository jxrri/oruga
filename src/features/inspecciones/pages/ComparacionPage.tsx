import { useSearchParams, useNavigate } from 'react-router';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ColumnsIcon,
  GasPumpIcon,
  GaugeIcon,
  ProhibitIcon,
  WarningIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import { useGetInspeccionQuery, useGetPlantillaQuery } from '@/api/baseApi';
import { compararInspecciones, type CambioCampo } from '@/domain/inspeccion';
import { formatear } from '@/shared/lib/fechas';
import { Button, ErrorState, Skeleton } from '@/shared/ui';

export default function ComparacionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const salidaId = searchParams.get('salidaId') ?? '';
  const devolucionId = searchParams.get('devolucionId') ?? '';

  const { data: salida, isLoading: cargandoS, error: errorS } = useGetInspeccionQuery(salidaId, {
    skip: !salidaId,
  });
  const { data: devolucion, isLoading: cargandoD, error: errorD } = useGetInspeccionQuery(devolucionId, {
    skip: !devolucionId,
  });

  const { data: plantillaS } = useGetPlantillaQuery(
    { id: salida?.plantillaId ?? '', version: salida?.plantillaVersion },
    { skip: !salida },
  );
  const { data: plantillaD } = useGetPlantillaQuery(
    { id: devolucion?.plantillaId ?? '', version: devolucion?.plantillaVersion },
    { skip: !devolucion },
  );

  const cargando = cargandoS || cargandoD;
  const error = errorS || errorD || !salidaId || !devolucionId;

  if (cargando) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-44" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !salida || !devolucion || !plantillaS) {
    return (
      <div className="p-8">
        <ErrorState onReintentar={() => navigate('/inspecciones')} />
      </div>
    );
  }

  const comparativa = compararInspecciones(salida, devolucion, plantillaS, plantillaD ?? plantillaS);

  const badgeCambio = (cambio: CambioCampo) => {
    switch (cambio) {
      case 'dano_nuevo':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[10px] font-bold text-destructive">
            <ProhibitIcon className="h-3 w-3" /> Daño Nuevo
          </span>
        );
      case 'reparado':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            <CheckCircleIcon className="h-3 w-3" /> Reparado
          </span>
        );
      case 'falla_persistente':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
            <WarningIcon className="h-3 w-3" /> Preexistente
          </span>
        );
      case 'igual':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            Sin cambios
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Cabecera */}
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
          <span className="font-semibold text-xs text-foreground">
            Comparativa Salida vs Devolución
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full p-6 space-y-6 flex-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ColumnsIcon className="h-5 w-5 text-primary" />
            <span>Auditoría Comparativa de Desgaste y Daños</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cruce automático de checklists para la liquidación de garantías, recargos de combustible o emisión de órdenes correctivas.
          </p>
        </div>

        {/* Tarjetas Resumen de Diferenciales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Desgaste de Medidor */}
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
            <span className="text-[10px] text-muted-foreground block font-mono flex items-center gap-1">
              <GaugeIcon className="h-3.5 w-3.5 text-primary" /> USO CONSUMIDO EN ALQUILER
            </span>
            <div className="text-xl font-black font-mono text-foreground">
              +{comparativa.difLectura}{' '}
              <span className="text-xs font-normal text-muted-foreground">unidades</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              Salida: {salida.lectura} → Retorno: {devolucion.lectura}
            </p>
          </div>

          {/* Variación de Combustible */}
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-1">
            <span className="text-[10px] text-muted-foreground block font-mono flex items-center gap-1">
              <GasPumpIcon className="h-3.5 w-3.5 text-primary" /> DIFERENCIA DE COMBUSTIBLE
            </span>
            <div className="text-xl font-black font-mono text-foreground">
              {comparativa.difCombustible !== null ? (
                <span
                  className={
                    comparativa.difCombustible < 0
                      ? 'text-destructive'
                      : comparativa.difCombustible > 0
                      ? 'text-emerald-400'
                      : 'text-foreground'
                  }
                >
                  {comparativa.difCombustible > 0 ? `+${comparativa.difCombustible}%` : `${comparativa.difCombustible}%`}
                </span>
              ) : (
                'N/A'
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              Salida: {salida.combustiblePct ?? '—'}% → Retorno: {devolucion.combustiblePct ?? '—'}%
            </p>
          </div>

          {/* Daños Nuevos */}
          <div
            className={`rounded-xl border p-4 space-y-1 ${
              comparativa.daniosNuevos.length > 0
                ? 'border-destructive/30 bg-destructive/10'
                : 'border-emerald-500/30 bg-emerald-500/10'
            }`}
          >
            <span className="text-[10px] text-muted-foreground block font-mono flex items-center gap-1">
              <WrenchIcon className="h-3.5 w-3.5 text-primary" /> NUEVOS DAÑOS DETECTADOS
            </span>
            <div
              className={`text-xl font-black font-mono ${
                comparativa.daniosNuevos.length > 0 ? 'text-destructive' : 'text-emerald-400'
              }`}
            >
              {comparativa.daniosNuevos.length} fallas
            </div>
            <p className="text-[11px] text-muted-foreground">
              {comparativa.daniosNuevos.length > 0
                ? 'Genera cargo al cliente o requiere orden de taller.'
                : 'La unidad retornó en las mismas condiciones.'}
            </p>
          </div>
        </div>

        {/* Tabla Comparativa Punto a Punto */}
        <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-md shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/30 font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Punto de Control</th>
                  <th className="px-4 py-3">En Salida ({formatear(salida.realizadaEn, 'America/Caracas', 'dd/MM')})</th>
                  <th className="px-4 py-3">En Devolución ({formatear(devolucion.realizadaEn, 'America/Caracas', 'dd/MM')})</th>
                  <th className="px-4 py-3 text-right">Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {comparativa.campos.map(({ campo, salida: valS, devolucion: valD, cambio }) => (
                  <tr
                    key={campo.id}
                    className={`hover:bg-muted/20 transition-colors ${
                      cambio === 'dano_nuevo' ? 'bg-destructive/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground block">{campo.etiqueta}</span>
                      {campo.critico && (
                        <span className="text-[10px] font-mono text-destructive uppercase">Punto Crítico</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {typeof valS === 'boolean' ? (valS ? 'OK' : 'Falla') : String(valS ?? '—')}
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground font-semibold">
                      {typeof valD === 'boolean' ? (valD ? 'OK' : 'Falla') : String(valD ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-right">{badgeCambio(cambio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
