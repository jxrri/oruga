import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeftIcon,
  CameraIcon,
  ProhibitIcon,
  ShieldCheckIcon,
  TrashIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react';
import type { Evidencia, ID, InspeccionNueva, MomentoInspeccion } from '@/api/contrato';
import {
  useCrearInspeccionMutation,
  useGetActivosQuery,
  useGetCategoriasQuery,
  useGetPlantillaQuery,
  useGetReservasQuery,
  useGetUsuariosQuery,
} from '@/api/baseApi';
import { calcularResultado, esVisible, fallas } from '@/domain/inspeccion';
import { Button, ErrorState, Skeleton } from '@/shared/ui';
import { Field, Input, Textarea } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';
import { ResultadoInspeccionBadge } from '@/shared/ui/dominio';

export default function InspeccionNuevaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reservaIdParam = searchParams.get('reservaId') ?? '';
  const momentoParam = (searchParams.get('momento') as MomentoInspeccion) || 'salida';
  const activoIdParam = searchParams.get('activoId') ?? '';

  const { data: activos = [] } = useGetActivosQuery();
  const { data: categorias = [] } = useGetCategoriasQuery();
  const { data: reservas = [] } = useGetReservasQuery({
    desde: '2026-01-01T00:00:00Z',
    hasta: '2027-01-01T00:00:00Z',
  });
  const { data: usuarios = [] } = useGetUsuariosQuery();
  const [crearInspeccion, { isLoading: guardando }] = useCrearInspeccionMutation();

  // Selección de activo y reserva
  const [activoIdState, setActivoIdState] = useState(activoIdParam);
  const [reservaId, setReservaId] = useState(reservaIdParam);
  const [momento, setMomento] = useState<MomentoInspeccion>(momentoParam);
  const [inspectorIdState, setInspectorIdState] = useState('');

  // Valores técnicos
  const [lecturaManual, setLecturaManual] = useState<number | null>(null);
  const [combustiblePct, setCombustiblePct] = useState<number>(100);
  const [observaciones, setObservaciones] = useState('');
  const [respuestas, setRespuestas] = useState<Record<string, unknown>>({});
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [errorEnvio, setErrorEnvio] = useState<unknown>(null);

  const reservaVinculada = useMemo(
    () => (reservaId ? reservas.find((r) => r.id === reservaId) : undefined),
    [reservas, reservaId],
  );

  const activoId = activoIdState || reservaVinculada?.activoId || '';
  const inspectorId = inspectorIdState || usuarios[0]?.id || '';

  const activoSeleccionado = useMemo(
    () => activos.find((a) => a.id === activoId),
    [activos, activoId],
  );

  const lectura = lecturaManual ?? activoSeleccionado?.lecturaActual ?? 0;

  // Obtener plantilla según la categoría del activo
  const categoriaSeleccionada = useMemo(
    () => categorias.find((c) => c.id === activoSeleccionado?.categoriaId),
    [categorias, activoSeleccionado],
  );

  const plantillaId = categoriaSeleccionada?.plantillaInspeccionId ?? 'plantilla-maquinaria';
  const { data: plantilla, isLoading: cargandoPlantilla } = useGetPlantillaQuery({ id: plantillaId });

  // Manejo de cambios en respuestas
  const setRespuestaCampo = (campoId: string, valor: unknown) => {
    setRespuestas((prev) => ({ ...prev, [campoId]: valor }));
  };

  // Agregar simulación de foto/evidencia
  const agregarFotoSimulada = (campoId?: string) => {
    const idEvidencia = `foto-${Date.now()}`;
    const nuevaFoto: Evidencia = {
      id: idEvidencia as ID,
      campoId: campoId ?? 'general',
      nombre: campoId ? `Detalle ${campoId}.webp` : 'Vista general.webp',
      mime: 'image/webp',
      bytes: 125000,
      url: `https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80`,
      estado: 'lista',
      progreso: 100,
    };
    setEvidencias((prev) => [...prev, nuevaFoto]);
    if (campoId) {
      const fotosActuales = (respuestas[campoId] as string[]) || [];
      setRespuestaCampo(campoId, [...fotosActuales, nuevaFoto.url]);
    }
  };

  const eliminarFoto = (idx: number, campoId?: string) => {
    setEvidencias((prev) => prev.filter((_, i) => i !== idx));
    if (campoId && Array.isArray(respuestas[campoId])) {
      const fotos = (respuestas[campoId] as string[]).filter((_, i) => i !== idx);
      setRespuestaCampo(campoId, fotos);
    }
  };

  // Cálculo en vivo del veredicto
  const resultado = useMemo(() => {
    if (!plantilla) return 'apto';
    return calcularResultado(plantilla, respuestas, observaciones);
  }, [plantilla, respuestas, observaciones]);

  const listaFallas = useMemo(() => {
    if (!plantilla) return { criticas: [], menores: [] };
    return fallas(plantilla, respuestas);
  }, [plantilla, respuestas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activoId) {
      setErrorEnvio('Seleccione el activo a inspeccionar.');
      return;
    }
    if (!plantilla) {
      setErrorEnvio('No se pudo cargar la plantilla de inspección correspondiente.');
      return;
    }

    try {
      const nueva: InspeccionNueva = {
        plantillaId: plantilla.id,
        plantillaVersion: plantilla.version,
        activoId: activoId as ID,
        reservaId: reservaId ? (reservaId as ID) : undefined,
        momento,
        inspectorId: (inspectorId || usuarios[0]?.id) as ID,
        lectura: Number(lectura),
        combustiblePct: Number(combustiblePct),
        respuestas,
        evidencias,
        observaciones: observaciones.trim() || undefined,
      };

      const res = await crearInspeccion(nueva).unwrap();
      navigate(`/inspecciones/${res.inspeccion.id}`);
    } catch (err: unknown) {
      setErrorEnvio(err);
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
            Checklist de {momento === 'salida' ? 'Salida / Despacho' : 'Devolución / Retorno'}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Acta de Inspección Técnica ({momento.toUpperCase()})
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Diligencie los puntos de control. Las fallas críticas marcan automáticamente el activo como no apto.
          </p>
        </div>

        {Boolean(errorEnvio) && (
          <ErrorState error={errorEnvio} compacto onCerrar={() => setErrorEnvio(null)} />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bloque 1: Datos Operativos de la Inspección */}
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-primary" /> Parámetros de Inspección
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field etiqueta="Activo a inspeccionar" requerido>
                <Select
                  valor={activoId}
                  onCambio={(v) => {
                    setActivoIdState(v);
                    setLecturaManual(null);
                  }}
                  opciones={activos.map((a) => ({
                    valor: a.id,
                    etiqueta: `${a.codigo} · ${a.marca} ${a.modelo}`,
                  }))}
                />
              </Field>

              <Field etiqueta="Reserva vinculada">
                <Select
                  valor={reservaId}
                  onCambio={(v) => {
                    setReservaId(v);
                    const res = reservas.find((r) => r.id === v);
                    if (res?.activoId) {
                      setActivoIdState(res.activoId);
                      setLecturaManual(null);
                    }
                  }}
                  opciones={[
                    { valor: '', etiqueta: 'Sin reserva (Revisión interna de taller)' },
                    ...reservas.map((r) => ({
                      valor: r.id,
                      etiqueta: `${r.codigo} (${r.inicio.slice(0, 10)})`,
                    })),
                  ]}
                />
              </Field>

              <Field etiqueta="Inspector responsable" requerido>
                <Select
                  valor={inspectorId}
                  onCambio={setInspectorIdState}
                  opciones={usuarios.map((u) => ({
                    valor: u.id,
                    etiqueta: `${u.nombre} (${u.rol})`,
                  }))}
                />
              </Field>

              <Field
                etiqueta={`Lectura del medidor (${categoriaSeleccionada?.medidor ?? 'km/h'})`}
                requerido
              >
                <Input
                  type="number"
                  min={0}
                  value={lectura}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLecturaManual(Number(e.target.value))}
                  required
                />
              </Field>

              <Field etiqueta="Nivel de combustible (%)" requerido ayuda={`${combustiblePct}% de tanque`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={combustiblePct}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCombustiblePct(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                />
              </Field>

              <Field etiqueta="Momento de control" requerido>
                <Select
                  valor={momento}
                  onCambio={(v: string) => setMomento(v as MomentoInspeccion)}
                  opciones={[
                    { valor: 'salida', etiqueta: 'Salida / Despacho a cliente' },
                    { valor: 'devolucion', etiqueta: 'Devolución / Retorno a sede' },
                  ]}
                />
              </Field>
            </div>
          </div>

          {/* Bloque 2: Checklist Dinámico según Plantilla */}
          {cargandoPlantilla ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : !plantilla ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-400">
              No hay plantilla de checklist asociada a la categoría {categoriaSeleccionada?.nombre}.
            </div>
          ) : (
            plantilla.secciones.map((seccion) => (
              <div
                key={seccion.id}
                className="rounded-xl border border-border bg-card/60 p-5 space-y-4"
              >
                <div className="border-b border-border/50 pb-2">
                  <h3 className="text-sm font-bold text-foreground">{seccion.titulo}</h3>
                </div>

                <div className="space-y-4">
                  {seccion.campos.map((campo) => {
                    if (!esVisible(campo, plantilla, respuestas)) return null;

                    const valorActual = respuestas[campo.id];

                    return (
                      <div
                        key={campo.id}
                        className="rounded-lg border border-border/50 bg-background/50 p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <span>{campo.etiqueta}</span>
                            {campo.requerido && <span className="text-destructive">*</span>}
                            {campo.critico && (
                              <span className="rounded bg-destructive/15 text-destructive px-1.5 py-0.2 text-[9px] font-mono font-bold">
                                CRÍTICO
                              </span>
                            )}
                          </label>

                          {campo.ayuda && (
                            <span className="text-[11px] text-muted-foreground">{campo.ayuda}</span>
                          )}
                        </div>

                        {/* Campo Tipo: si_no */}
                        {campo.tipo === 'si_no' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setRespuestaCampo(campo.id, true)}
                              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                                valorActual === true
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                                  : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              Conforme (Sí)
                            </button>
                            <button
                              type="button"
                              onClick={() => setRespuestaCampo(campo.id, false)}
                              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                                valorActual === false
                                  ? 'bg-destructive/20 text-destructive border border-destructive/40 shadow-xs'
                                  : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              Falla / Defecto (No)
                            </button>
                          </div>
                        )}

                        {/* Campo Tipo: opcion */}
                        {campo.tipo === 'opcion' && campo.opciones && (
                          <div className="flex flex-wrap gap-2">
                            {campo.opciones.map((opc) => (
                              <button
                                key={opc}
                                type="button"
                                onClick={() => setRespuestaCampo(campo.id, opc)}
                                className={`rounded-lg px-3 py-1 text-xs font-medium border transition-all ${
                                  valorActual === opc
                                    ? 'border-primary bg-primary/10 text-primary font-bold'
                                    : 'border-border/60 text-muted-foreground hover:bg-muted/30'
                                }`}
                              >
                                {opc}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Campo Tipo: numero o nivel */}
                        {(campo.tipo === 'numero' || campo.tipo === 'nivel') && (
                          <Input
                            type="number"
                            min={campo.min}
                            max={campo.max}
                            value={(valorActual as number) ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setRespuestaCampo(campo.id, e.target.value === '' ? '' : Number(e.target.value))
                            }
                            className="max-w-xs"
                          />
                        )}

                        {/* Campo Tipo: texto */}
                        {campo.tipo === 'texto' && (
                          <Input
                            type="text"
                            value={(valorActual as string) ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setRespuestaCampo(campo.id, e.target.value)
                            }
                            placeholder="Describa el hallazgo..."
                          />
                        )}

                        {/* Campo Tipo: foto */}
                        {campo.tipo === 'foto' && (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variante="secundario"
                                tamano="sm"
                                icono={CameraIcon}
                                onClick={() => agregarFotoSimulada(campo.id)}
                              >
                                Tomar / Adjuntar Foto
                              </Button>
                            </div>

                            {Array.isArray(valorActual) && valorActual.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {(valorActual as string[]).map((url, i) => (
                                  <div key={i} className="relative h-16 w-20 rounded border border-border overflow-hidden group">
                                    <img src={url} alt="" className="h-full w-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => eliminarFoto(i, campo.id)}
                                      className="absolute top-1 right-1 bg-black/70 p-1 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <TrashIcon className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Bloque 3: Observaciones y Evidencias Globales */}
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Observaciones Generales y Firmas</h3>
            <Field etiqueta="Notas de inspección">
              <Textarea
                placeholder="Indique detalles adicionales de limpieza, estado de neumáticos, niveles de refrigerante..."
                value={observaciones}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservaciones(e.target.value)}
                rows={3}
              />
            </Field>

            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <Button
                type="button"
                variante="secundario"
                tamano="sm"
                icono={UploadSimpleIcon}
                onClick={() => agregarFotoSimulada()}
              >
                Subir Evidencias Fotográficas ({evidencias.length})
              </Button>
            </div>
          </div>

          {/* Panel Flotante / Sticky de Veredicto en Vivo */}
          <div className="sticky bottom-4 z-20 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Veredicto Proyectado:
              </span>
              <ResultadoInspeccionBadge resultado={resultado} />

              {listaFallas.criticas.length > 0 && (
                <span className="text-xs text-destructive font-mono font-bold flex items-center gap-1">
                  <ProhibitIcon className="h-4 w-4" /> {listaFallas.criticas.length} fallas críticas
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button variante="fantasma" onClick={() => navigate('/inspecciones')}>
                Cancelar
              </Button>
              <Button
                variante="primario"
                onClick={handleSubmit}
                cargando={guardando ? 'Guardando acta…' : false}
                className="px-6 font-bold"
              >
                Emitir Dictamen
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
