import React, { useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ClipboardTextIcon, ProhibitIcon, UploadSimpleIcon, XIcon } from '@phosphor-icons/react';
import type { Evidencia, ID, InspeccionNueva, MomentoInspeccion } from '@/api/contrato';
import {
  API_URL,
  useCrearInspeccionMutation,
  useGetActivosQuery,
  useGetCategoriasQuery,
  useGetPlantillaQuery,
  useGetUsuariosQuery,
} from '@/api/baseApi';
import { useReservasGlobales } from '@/api/hooks';
import { useAppSelector, usePuede, useUsuario } from '@/app/hooks';
import { calcularResultado, camposVisibles, construirEsquema, fallas, limpiarOcultos } from '@/domain/inspeccion';
import { ETIQUETA_ESTADO_RESERVA } from '@/domain/reservaFSM';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { cn } from '@/shared/lib/cn';
import { pluralizar } from '@/shared/lib/formato';
import { escenas, srcEscena } from '@/shared/lib/imagenes';
import { Button, EmptyState, ErrorState, IconButton, SegmentedControl, Skeleton, Z } from '@/shared/ui';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { Field, Input, Textarea } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';
import { ResultadoInspeccionBadge } from '@/shared/ui/dominio';
import { CampoInspeccion } from '../components/CampoInspeccion';
import { ETIQUETA_MOMENTO } from '../components/momento';

const SIN_RESERVA = '__sin_reserva__';

const MOMENTOS: { valor: MomentoInspeccion; etiqueta: string }[] = [
  { valor: 'salida', etiqueta: ETIQUETA_MOMENTO.salida },
  { valor: 'devolucion', etiqueta: ETIQUETA_MOMENTO.devolucion },
  { valor: 'rutina', etiqueta: ETIQUETA_MOMENTO.rutina },
];

export default function InspeccionNuevaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ref = useEntrada<HTMLDivElement>();
  const idCombustible = useId();
  const inputGeneralRef = useRef<HTMLInputElement>(null);

  const usuarioActual = useUsuario();
  const tokenSesion = useAppSelector((s) => s.auth.sesion?.token);
  const puedeCrear = usePuede('crear', 'inspeccion');

  const reservaIdParam = searchParams.get('reservaId') ?? '';
  const momentoParamRaw = searchParams.get('momento');
  const momentoInicial: MomentoInspeccion =
    momentoParamRaw === 'salida' || momentoParamRaw === 'devolucion' || momentoParamRaw === 'rutina'
      ? momentoParamRaw
      : reservaIdParam
        ? 'salida'
        : 'rutina';
  const activoIdParam = searchParams.get('activoId') ?? '';

  const { data: activos = [] } = useGetActivosQuery();
  const { data: categorias = [] } = useGetCategoriasQuery();
  const { data: reservas = [] } = useReservasGlobales();
  const { data: usuarios = [] } = useGetUsuariosQuery();
  const [crearInspeccion, { isLoading: guardando }] = useCrearInspeccionMutation();

  const [activoIdState, setActivoIdState] = useState(activoIdParam);
  const [reservaIdState, setReservaIdState] = useState(reservaIdParam || SIN_RESERVA);
  const [momento, setMomento] = useState<MomentoInspeccion>(momentoInicial);
  const [inspectorIdState, setInspectorIdState] = useState('');

  const [lecturaManual, setLecturaManual] = useState<number | null>(null);
  const [combustiblePct, setCombustiblePct] = useState<number>(100);
  const [observaciones, setObservaciones] = useState('');
  const [respuestas, setRespuestas] = useState<Record<string, unknown>>({});
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [subiendoCampo, setSubiendoCampo] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<unknown>(null);

  const reservaIdReal = reservaIdState === SIN_RESERVA ? '' : reservaIdState;
  const reservaVinculada = useMemo(
    () => (reservaIdReal ? reservas.find((r) => r.id === reservaIdReal) : undefined),
    [reservas, reservaIdReal],
  );

  const activoId = activoIdState || reservaVinculada?.activoId || '';
  const inspectorId = inspectorIdState || usuarioActual?.id || usuarios[0]?.id || '';

  const activoSeleccionado = useMemo(() => activos.find((a) => a.id === activoId), [activos, activoId]);
  const lectura = lecturaManual ?? activoSeleccionado?.lecturaActual ?? 0;

  const categoriaSeleccionada = useMemo(
    () => categorias.find((c) => c.id === activoSeleccionado?.categoriaId),
    [categorias, activoSeleccionado],
  );

  const plantillaId = categoriaSeleccionada?.plantillaInspeccionId ?? '';
  const { data: plantilla, isLoading: cargandoPlantilla } = useGetPlantillaQuery(
    { id: plantillaId },
    { skip: !plantillaId },
  );

  // Solo reservas activas (confirmadas o en curso) con unidad asignada, filtradas al activo si ya se eligió
  const reservasElegibles = useMemo(() => {
    return reservas.filter((r) => {
      if (!r.activoId) return false;
      if (r.estado !== 'confirmada' && r.estado !== 'en_curso') return false;
      if (activoId && r.activoId !== activoId) return false;
      return true;
    });
  }, [reservas, activoId]);

  const setRespuestaCampo = (campoId: string, valor: unknown) => {
    setRespuestas((prev) => ({ ...prev, [campoId]: valor }));
  };

  const fotoDemoUrl = (indice: number) => {
    const imgs = escenas('inspeccion');
    const img = imgs[indice % Math.max(1, imgs.length)];
    return img ? srcEscena(img, 'sm') : `${import.meta.env.BASE_URL}favicon.svg`;
  };

  const agregarFotoPrueba = (campoId?: string) => {
    const idEvidencia = `evi-${crypto.randomUUID().slice(0, 8)}`;
    const url = fotoDemoUrl(evidencias.length);
    const nuevaFoto: Evidencia = {
      id: idEvidencia as ID,
      campoId: campoId ?? 'general',
      nombre: campoId ? `Evidencia-${campoId}.webp` : 'Vista-general.webp',
      mime: 'image/webp',
      bytes: 125_000,
      url,
      estado: 'lista',
      progreso: 100,
    };
    setEvidencias((prev) => [...prev, nuevaFoto]);
    if (campoId) {
      const fotosActuales = Array.isArray(respuestas[campoId]) ? (respuestas[campoId] as string[]) : [];
      setRespuestaCampo(campoId, [...fotosActuales, nuevaFoto.url]);
    }
  };

  const subirArchivosReales = async (archivos: FileList, campoId?: string) => {
    const destino = campoId ?? 'general';
    setSubiendoCampo(destino);
    setErrorEnvio(null);
    const nuevas: Evidencia[] = [];

    try {
      for (const archivo of Array.from(archivos)) {
        const form = new FormData();
        form.append('campoId', destino);
        form.append('archivo', archivo);

        const resp = await fetch(`${API_URL}/evidencias`, {
          method: 'POST',
          headers: tokenSesion ? { Authorization: `Bearer ${tokenSesion}` } : undefined,
          body: form,
        });
        const cuerpo = (await resp.json().catch(() => null)) as Evidencia | { mensaje?: string } | null;
        if (!resp.ok || !cuerpo || !('id' in cuerpo)) {
          throw new Error((cuerpo && 'mensaje' in cuerpo && cuerpo.mensaje) || 'No se pudo subir la imagen. Intenta de nuevo.');
        }
        nuevas.push(cuerpo);
      }

      if (nuevas.length > 0) {
        setEvidencias((prev) => [...prev, ...nuevas]);
        if (campoId) {
          const fotosActuales = Array.isArray(respuestas[campoId]) ? (respuestas[campoId] as string[]) : [];
          setRespuestaCampo(campoId, [...fotosActuales, ...nuevas.map((e) => e.url)]);
        }
      }
    } catch (err: unknown) {
      setErrorEnvio(err instanceof Error ? err.message : err);
    } finally {
      setSubiendoCampo(null);
    }
  };

  const eliminarFotoDeCampo = (idxEnCampo: number, campoId: string) => {
    const fotosCampo = Array.isArray(respuestas[campoId]) ? (respuestas[campoId] as string[]) : [];
    const urlEliminada = fotosCampo[idxEnCampo];
    const restantesCampo = fotosCampo.filter((_, i) => i !== idxEnCampo);
    setRespuestaCampo(campoId, restantesCampo);

    if (urlEliminada) {
      setEvidencias((prev) => {
        const idxGlobal = prev.findIndex((e) => e.campoId === campoId && e.url === urlEliminada);
        return idxGlobal >= 0 ? prev.filter((_, i) => i !== idxGlobal) : prev;
      });
    }
  };

  const eliminarEvidenciaGeneral = (idEv: ID) => {
    setEvidencias((prev) => prev.filter((e) => e.id !== idEv));
  };

  const evidenciasGenerales = useMemo(
    () => evidencias.filter((e) => e.campoId === 'general'),
    [evidencias],
  );

  const resultado = useMemo(() => {
    if (!plantilla) return 'apto';
    return calcularResultado(plantilla, respuestas, observaciones);
  }, [plantilla, respuestas, observaciones]);

  const listaFallas = useMemo(() => {
    if (!plantilla) return { criticas: [], menores: [] };
    return fallas(plantilla, respuestas);
  }, [plantilla, respuestas]);

  const visibles = useMemo(
    () => (plantilla ? camposVisibles(plantilla, respuestas) : new Set<string>()),
    [plantilla, respuestas],
  );
  const idsConFalla = useMemo(
    () => new Set([...listaFallas.criticas, ...listaFallas.menores].map((c) => c.id)),
    [listaFallas],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEnvio(null);

    if (!puedeCrear) {
      setErrorEnvio('Tu rol no tiene permiso para registrar inspecciones.');
      return;
    }
    if (!activoId || !activoSeleccionado) {
      setErrorEnvio('Seleccione el activo a inspeccionar.');
      return;
    }
    if (!plantilla) {
      setErrorEnvio('No se pudo cargar la plantilla de inspección correspondiente.');
      return;
    }
    if (Number(lectura) < activoSeleccionado.lecturaActual) {
      setErrorEnvio(
        `La lectura no puede ser menor a la última registrada (${activoSeleccionado.lecturaActual} ${categoriaSeleccionada?.medidor ?? ''}).`,
      );
      return;
    }

    const limpias = limpiarOcultos(plantilla, respuestas);
    const validacion = construirEsquema(plantilla).safeParse(limpias);
    if (!validacion.success) {
      const primera = validacion.error.issues[0];
      const campoIdFalla = String(primera?.path[0] ?? '');
      const etiqueta = plantilla.secciones
        .flatMap((s) => s.campos)
        .find((c) => c.id === campoIdFalla)?.etiqueta;
      setErrorEnvio(
        etiqueta ? `${etiqueta}: ${primera?.message ?? 'Campo requerido.'}` : (primera?.message ?? 'Complete los campos obligatorios del checklist.'),
      );
      return;
    }

    try {
      const nueva: InspeccionNueva = {
        plantillaId: plantilla.id,
        plantillaVersion: plantilla.version,
        activoId: activoId as ID,
        reservaId: reservaIdReal ? (reservaIdReal as ID) : undefined,
        momento,
        inspectorId: inspectorId as ID,
        lectura: Number(lectura),
        combustiblePct: Number(combustiblePct),
        respuestas: limpias,
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
    <div ref={ref} className="mx-auto w-full max-w-3xl">
      <EncabezadoPagina
        migas={[{ etiqueta: 'Inspecciones', to: '/inspecciones' }, { etiqueta: 'Nueva inspección' }]}
        titulo="Nueva inspección"
        descripcion="Diligencie los puntos de control. Las fallas críticas marcan el activo como no apto."
      />

      {!puedeCrear ? (
        <ErrorState
          titulo="Sin permiso para crear inspecciones"
          error="Solo los roles de Administrador e Inspector de patio pueden emitir actas de inspección."
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4" data-entrada>
            <h2 className="text-[15px] font-semibold text-ink">Datos de la inspección</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                etiqueta="Activo a inspeccionar"
                requerido
                ayuda={
                  activos.length === 0 ? (
                    <span>
                      Aún no hay activos registrados.{' '}
                      <Link to="/inventario" className="font-medium text-accent-fg hover:underline">
                        Registrar activo
                      </Link>
                    </span>
                  ) : undefined
                }
              >
                <Select
                  valor={activoId}
                  disabled={activos.length === 0}
                  placeholder={activos.length === 0 ? 'Sin activos registrados' : 'Seleccione un activo…'}
                  onCambio={(v) => {
                    setActivoIdState(v);
                    setLecturaManual(null);
                    setRespuestas({});
                    setEvidencias([]);
                    if (reservaVinculada && reservaVinculada.activoId !== v) {
                      setReservaIdState(SIN_RESERVA);
                    }
                  }}
                  opciones={activos.map((a) => ({
                    valor: a.id,
                    etiqueta: `${a.codigo} · ${a.marca} ${a.modelo}`,
                  }))}
                />
              </Field>

              <Field
                etiqueta="Reserva vinculada"
                ayuda="Opcional para revisiones de rutina; obligatoria para despachar o recibir un contrato."
              >
                <Select
                  valor={reservaIdState}
                  placeholder="Sin reserva"
                  onCambio={(v) => {
                    setReservaIdState(v);
                    if (v === SIN_RESERVA) {
                      setMomento('rutina');
                      return;
                    }
                    const res = reservas.find((r) => r.id === v);
                    if (res?.activoId) {
                      if (res.activoId !== activoId) {
                        setActivoIdState(res.activoId);
                        setLecturaManual(null);
                        setRespuestas({});
                        setEvidencias([]);
                      }
                      if (res.estado === 'confirmada') setMomento('salida');
                      else if (res.estado === 'en_curso') setMomento('devolucion');
                    }
                  }}
                  opciones={[
                    { valor: SIN_RESERVA, etiqueta: 'Sin reserva (revisión de rutina)' },
                    ...reservasElegibles.map((r) => ({
                      valor: r.id,
                      etiqueta: `${r.codigo} · ${ETIQUETA_ESTADO_RESERVA[r.estado]} (${r.inicio.slice(0, 10)})`,
                    })),
                  ]}
                />
              </Field>

              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink">
                  Momento de control
                  <span aria-hidden className="ml-0.5 text-danger">
                    *
                  </span>
                </span>
                <SegmentedControl
                  aria-label="Momento de control"
                  valor={momento}
                  onCambio={setMomento}
                  opciones={MOMENTOS}
                  className="self-start"
                />
              </div>

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
                etiqueta="Lectura del medidor"
                requerido
                ayuda={
                  activoSeleccionado
                    ? `Última registrada: ${activoSeleccionado.lecturaActual} ${categoriaSeleccionada?.medidor ?? ''}`
                    : undefined
                }
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min={activoSeleccionado?.lecturaActual ?? 0}
                  value={lectura}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLecturaManual(Number(e.target.value))}
                  sufijo={categoriaSeleccionada ? (categoriaSeleccionada.medidor === 'km' ? 'km' : 'h') : undefined}
                  className="font-mono"
                  required
                />
              </Field>

              <Field
                id={idCombustible}
                etiqueta="Nivel de combustible"
                requerido
                ayuda={`${combustiblePct} % del tanque`}
              >
                <input
                  id={idCombustible}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={combustiblePct}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCombustiblePct(Number(e.target.value))}
                  aria-describedby={`${idCombustible}-ayuda`}
                  aria-valuetext={`${combustiblePct} por ciento`}
                  className="h-9 w-full cursor-pointer accent-accent pointer-coarse:h-11"
                />
              </Field>
            </div>
          </section>

          {/* Bloque 2: checklist dinámico según la plantilla */}
          <div className="space-y-8" data-entrada>
            {cargandoPlantilla ? (
              <div aria-busy="true">
                <Skeleton className="h-5 w-40" />
                <div className="mt-2 divide-y divide-line border-t border-line">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-8 py-4">
                      <Skeleton className="h-4 w-56 max-w-[55%]" />
                      <Skeleton className="h-11 w-40 rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            ) : !plantilla ? (
              <EmptyState
                icono={ClipboardTextIcon}
                titulo={activoSeleccionado ? 'Sin plantilla de checklist' : 'Elija un activo'}
                descripcion={
                  activoSeleccionado
                    ? `No hay plantilla de checklist asociada a la categoría ${categoriaSeleccionada?.nombre ?? ''}.`
                    : 'El checklist se carga automáticamente según la categoría del activo elegido.'
                }
                className="rounded-xl border border-dashed border-line"
              />
            ) : (
              plantilla.secciones.map((seccion) => {
                const campos = seccion.campos.filter((campo) => visibles.has(campo.id));
                if (campos.length === 0) return null;

                return (
                  <section key={seccion.id}>
                    <h2 className="text-[15px] font-semibold text-ink">{seccion.titulo}</h2>
                    <div className="mt-2 divide-y divide-line border-t border-line">
                      {campos.map((campo) => (
                        <CampoInspeccion
                          key={campo.id}
                          campo={campo}
                          valor={respuestas[campo.id]}
                          esFalla={idsConFalla.has(campo.id)}
                          onCambio={(valor) => setRespuestaCampo(campo.id, valor)}
                          onAgregarFoto={() => agregarFotoPrueba(campo.id)}
                          onSubirFotos={(archivos) => void subirArchivosReales(archivos, campo.id)}
                          onQuitarFoto={(indice) => eliminarFotoDeCampo(indice, campo.id)}
                          subiendoFoto={subiendoCampo === campo.id}
                        />
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>

          {/* Bloque 3: observaciones y evidencias generales */}
          <section className="space-y-4" data-entrada>
            <h2 className="text-[15px] font-semibold text-ink">Observaciones</h2>
            <Field etiqueta="Notas de inspección">
              <Textarea
                placeholder="Limpieza, estado de neumáticos, niveles de refrigerante…"
                value={observaciones}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservaciones(e.target.value)}
                rows={3}
              />
            </Field>

            <input
              ref={inputGeneralRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) {
                  void subirArchivosReales(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                tamano="lg"
                icono={UploadSimpleIcon}
                cargando={subiendoCampo === 'general' ? 'Subiendo…' : false}
                onClick={() => inputGeneralRef.current?.click()}
              >
                Subir evidencias
              </Button>
              <Button
                variante="fantasma"
                tamano="lg"
                disabled={subiendoCampo === 'general'}
                onClick={() => agregarFotoPrueba()}
              >
                Añadir foto de prueba
              </Button>
              <span className="tabular text-[13px] text-ink-3">
                {pluralizar(evidencias.length, 'evidencia adjunta', 'evidencias adjuntas')}
              </span>
            </div>

            {evidenciasGenerales.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {evidenciasGenerales.map((ev) => (
                  <li key={ev.id} className="relative">
                    <img
                      src={ev.url}
                      alt={ev.nombre}
                      width={112}
                      height={84}
                      className="h-[84px] w-28 rounded-lg border border-line bg-panel-2 object-cover"
                    />
                    <IconButton
                      aria-label={`Quitar ${ev.nombre}`}
                      icono={XIcon}
                      variante="secundario"
                      tamano="sm"
                      className="absolute right-1 top-1"
                      onClick={() => eliminarEvidenciaGeneral(ev.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Veredicto en vivo y guardado */}
          <div
            className={cn(
              'sticky bottom-0 -mx-4 border-t border-line bg-canvas px-4 pt-3 sm:mx-0 sm:px-0',
              'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
              Z.sticky,
            )}
          >
            {Boolean(errorEnvio) && (
              <ErrorState error={errorEnvio} compacto onCerrar={() => setErrorEnvio(null)} className="mb-3" />
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3" aria-live="polite">
                <span className="sr-only text-[13px] text-ink-3 sm:not-sr-only">Veredicto proyectado</span>
                <ResultadoInspeccionBadge resultado={resultado} className="self-start sm:self-auto" />

                {listaFallas.criticas.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[13px] font-medium text-danger">
                    <ProhibitIcon size={15} aria-hidden />
                    {pluralizar(listaFallas.criticas.length, 'falla crítica', 'fallas críticas')}
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button asChild variante="fantasma" tamano="lg" className="hidden sm:inline-flex">
                  <Link to="/inspecciones">Cancelar</Link>
                </Button>
                <Button
                  type="submit"
                  variante="primario"
                  tamano="lg"
                  disabled={!plantilla || subiendoCampo !== null}
                  cargando={guardando ? 'Guardando acta…' : false}
                >
                  Emitir dictamen
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
