import React, { useMemo, useState } from 'react';
import { BracketsCurlyIcon, CheckCircleIcon, FloppyDiskIcon, WarningCircleIcon } from '@phosphor-icons/react';
import type { PlantillaInspeccion } from '@/api/contrato';
import { useGetPlantillasQuery, useGuardarPlantillaMutation } from '@/api/baseApi';
import { usePuede } from '@/app/hooks';
import { calcularResultado, camposVisibles, fallas, validarPlantilla } from '@/domain/inspeccion';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { pluralizar } from '@/shared/lib/formato';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { EncabezadoPagina, type Miga } from '@/shared/ui/EncabezadoPagina';
import { Textarea } from '@/shared/ui/Field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/Tabs';
import { ResultadoInspeccionBadge } from '@/shared/ui/dominio';
import { CampoInspeccion } from '../components/CampoInspeccion';

const MIGAS: Miga[] = [{ etiqueta: 'Inspecciones', to: '/inspecciones' }, { etiqueta: 'Plantillas' }];

export default function PlantillasPage() {
  const ref = useEntrada<HTMLDivElement>();
  const puedeEditar = usePuede('editar', 'plantilla');

  const { data: plantillas = [], isLoading, error, refetch } = useGetPlantillasQuery();
  const [guardarPlantilla, { isLoading: guardando }] = useGuardarPlantillaMutation();

  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState('');
  const [jsonManual, setJsonManual] = useState<string | null>(null);
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([]);
  const [mensajeExito, setMensajeExito] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<unknown>(null);
  const [respuestasPreview, setRespuestasPreview] = useState<Record<string, unknown>>({});

  const plantillaActual = plantillas.find((p) => p.id === plantillaSeleccionadaId) ?? plantillas[0];
  const jsonTexto = jsonManual ?? (plantillaActual ? JSON.stringify(plantillaActual, null, 2) : '');

  const plantillaVistaPrevia: PlantillaInspeccion | null = useMemo(() => {
    if (!jsonTexto) return plantillaActual ?? null;
    try {
      const obj = JSON.parse(jsonTexto);
      const res = validarPlantilla(obj);
      return res.ok ? res.plantilla : (plantillaActual ?? null);
    } catch {
      return plantillaActual ?? null;
    }
  }, [jsonTexto, plantillaActual]);

  const visiblesPreview = useMemo(
    () => (plantillaVistaPrevia ? camposVisibles(plantillaVistaPrevia, respuestasPreview) : new Set<string>()),
    [plantillaVistaPrevia, respuestasPreview],
  );
  const fallasPreview = useMemo(
    () => (plantillaVistaPrevia ? fallas(plantillaVistaPrevia, respuestasPreview) : { criticas: [], menores: [] }),
    [plantillaVistaPrevia, respuestasPreview],
  );
  const idsFallaPreview = useMemo(
    () => new Set([...fallasPreview.criticas, ...fallasPreview.menores].map((c) => c.id)),
    [fallasPreview],
  );
  const resultadoPreview = useMemo(
    () => (plantillaVistaPrevia ? calcularResultado(plantillaVistaPrevia, respuestasPreview) : 'apto'),
    [plantillaVistaPrevia, respuestasPreview],
  );

  const handleJsonChange = (nuevoTexto: string) => {
    setJsonManual(nuevoTexto);
    setMensajeExito(false);
    try {
      const obj = JSON.parse(nuevoTexto);
      const res = validarPlantilla(obj);
      if (res.ok) {
        setErroresValidacion([]);
      } else {
        setErroresValidacion(res.errores);
      }
    } catch {
      setErroresValidacion(['Sintaxis JSON no válida.']);
    }
  };

  const handleGuardar = async () => {
    if (!puedeEditar) return;
    setErrorGuardar(null);
    try {
      const obj = JSON.parse(jsonTexto);
      const res = validarPlantilla(obj);
      if (!res.ok) {
        setErroresValidacion(res.errores);
        return;
      }

      await guardarPlantilla(res.plantilla).unwrap();
      setJsonManual(null);
      setMensajeExito(true);
      setErroresValidacion([]);
    } catch (err: unknown) {
      setErrorGuardar(err);
    }
  };

  const seleccionar = (id: string) => {
    setPlantillaSeleccionadaId(id);
    setJsonManual(null);
    setErroresValidacion([]);
    setMensajeExito(false);
    setRespuestasPreview({});
  };

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1400px]">
      <EncabezadoPagina
        migas={MIGAS}
        titulo="Plantillas"
        descripcion={
          plantillas.length > 0
            ? `${pluralizar(plantillas.length, 'plantilla')} de inspección. Edite el JSON a la izquierda y pruebe el formulario en vivo a la derecha.`
            : 'Definición en JSON de los checklists de inspección.'
        }
        acciones={
          puedeEditar && (
            <Button
              variante="primario"
              icono={FloppyDiskIcon}
              onClick={handleGuardar}
              disabled={erroresValidacion.length > 0 || !plantillaActual}
              cargando={guardando ? 'Guardando…' : false}
            >
              Guardar cambios
            </Button>
          )
        }
      />

      <section aria-label="Editor de plantillas" data-entrada>
        {isLoading ? (
          <div aria-busy="true">
            <div className="flex h-10 items-center gap-6 border-b border-line px-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="mt-4 h-4 w-48" />
            <Skeleton className="mt-3 h-[60dvh] w-full rounded-lg" />
          </div>
        ) : error ? (
          <ErrorState error={error} onReintentar={() => void refetch()} />
        ) : !plantillaActual ? (
          <EmptyState
            icono={BracketsCurlyIcon}
            titulo="Aún no hay plantillas"
            descripcion="Las plantillas definen el checklist de cada categoría de activo."
          />
        ) : (
          <Tabs value={plantillaActual.id} onValueChange={seleccionar}>
            <TabsList aria-label="Plantillas">
              {plantillas.map((p) => (
                <TabsTrigger key={p.id} value={p.id}>
                  {p.nombre}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={plantillaActual.id} className="space-y-4">
              <div className="flex min-h-[22px] flex-wrap items-center justify-between gap-2">
                <p className="tabular text-[13px] text-ink-3">
                  Versión {plantillaActual.version}, {pluralizar(plantillaActual.secciones.length, 'sección', 'secciones')}
                  {!puedeEditar && ' · Solo lectura'}
                </p>
                <span role="status">
                  {mensajeExito && (
                    <Badge tono="ok" icono={CheckCircleIcon}>
                      Plantilla guardada (v{plantillaActual.version})
                    </Badge>
                  )}
                </span>
              </div>

              {Boolean(errorGuardar) && (
                <ErrorState error={errorGuardar} compacto onCerrar={() => setErrorGuardar(null)} />
              )}

              {erroresValidacion.length > 0 && (
                <div role="alert" className="rounded-lg bg-danger-soft px-3.5 py-3 text-[13px]">
                  <p className="flex items-center gap-1.5 font-medium text-danger">
                    <WarningCircleIcon size={16} aria-hidden />
                    Errores de validación del esquema
                  </p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-ink-2">
                    {erroresValidacion.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-2">
                <Textarea
                  aria-label={`Definición JSON de ${plantillaActual.nombre}`}
                  aria-invalid={erroresValidacion.length > 0 || undefined}
                  value={jsonTexto}
                  readOnly={!puedeEditar}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleJsonChange(e.target.value)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="min-h-[60dvh] resize-y font-mono leading-relaxed md:text-[13px]"
                />

                {/* Vista previa interactiva en vivo (SPEC §14) */}
                <div className="tarjeta flex max-h-[65dvh] flex-col overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-line bg-panel-2 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-semibold text-ink">Vista previa interactiva</h2>
                      <p className="text-xs text-ink-3">Prueba condiciones visibleSi y cálculo de veredicto</p>
                    </div>
                    <ResultadoInspeccionBadge resultado={resultadoPreview} />
                  </div>
                  <div className="flex-1 space-y-6 overflow-y-auto p-4">
                    {plantillaVistaPrevia?.secciones.map((sec) => {
                      const campos = sec.campos.filter((c) => visiblesPreview.has(c.id));
                      if (campos.length === 0) return null;
                      return (
                        <div key={sec.id}>
                          <h3 className="text-[13px] font-semibold text-ink">{sec.titulo}</h3>
                          <div className="mt-1 divide-y divide-line border-t border-line">
                            {campos.map((campo) => (
                              <CampoInspeccion
                                key={campo.id}
                                campo={campo}
                                valor={respuestasPreview[campo.id]}
                                esFalla={idsFallaPreview.has(campo.id)}
                                onCambio={(v) => setRespuestasPreview((prev) => ({ ...prev, [campo.id]: v }))}
                                onAgregarFoto={() =>
                                  setRespuestasPreview((prev) => ({
                                    ...prev,
                                    [campo.id]: [
                                      ...(Array.isArray(prev[campo.id]) ? (prev[campo.id] as string[]) : []),
                                      `${import.meta.env.BASE_URL}favicon.svg`,
                                    ],
                                  }))
                                }
                                onQuitarFoto={(idx) =>
                                  setRespuestasPreview((prev) => ({
                                    ...prev,
                                    [campo.id]: (Array.isArray(prev[campo.id]) ? (prev[campo.id] as string[]) : []).filter(
                                      (_, i) => i !== idx,
                                    ),
                                  }))
                                }
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </section>
    </div>
  );
}
