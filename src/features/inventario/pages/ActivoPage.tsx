import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeftIcon,
  CalendarCheckIcon,
  ClockCounterClockwiseIcon,
  FileTextIcon,
  GaugeIcon,
  IdentificationBadgeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  TruckIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import { useGetActivoQuery, useGetCategoriasQuery, useGetSedesQuery, useGetUsuariosQuery } from '@/api/baseApi';
import { hashTexto, srcCategoria } from '@/shared/lib/imagenes';
import { formatearCivil, formatear } from '@/shared/lib/fechas';
import { Badge, Button, ErrorState, Skeleton } from '@/shared/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/Tabs';
import { EstadoReservaBadge, ResultadoInspeccionBadge } from '@/shared/ui/dominio';
import { DialogoCambiarEstadoActivo } from '../components/DialogoCambiarEstadoActivo';

export default function ActivoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: detalle, isLoading, error, refetch } = useGetActivoQuery(id ?? '');
  const { data: categorias = [] } = useGetCategoriasQuery();
  const { data: sedes = [] } = useGetSedesQuery();
  const { data: usuarios = [] } = useGetUsuariosQuery();

  const [modalEstado, setModalEstado] = useState(false);
  const [tabActiva, setTabActiva] = useState<'tecnica' | 'reservas' | 'inspecciones' | 'historial'>('tecnica');

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !detalle) {
    return (
      <div className="p-8">
        <ErrorState onReintentar={() => void refetch()} />
      </div>
    );
  }

  const { activo, historialEstado, reservas, inspecciones } = detalle;
  const categoria = categorias.find((c) => c.id === activo.categoriaId);
  const sede = sedes.find((s) => s.id === activo.sedeBaseId);
  const mapaUsuarios = new Map(usuarios.map((u) => [u.id, u]));

  const imgUrl = categoria ? srcCategoria(categoria.slug, hashTexto(activo.id), 'lg') : null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Barra de Navegación y Acciones Superiores */}
      <div className="border-b border-border bg-card/60 px-6 py-3.5 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variante="fantasma"
            tamano="sm"
            icono={ArrowLeftIcon}
            onClick={() => navigate('/inventario')}
          >
            Inventario
          </Button>
          <span className="text-border">/</span>
          <span className="font-mono text-xs font-black text-foreground">{activo.codigo}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variante="secundario"
            tamano="sm"
            icono={WrenchIcon}
            onClick={() => setModalEstado(true)}
          >
            Cambiar Estado
          </Button>
          <Button
            variante="primario"
            tamano="sm"
            icono={CalendarCheckIcon}
            onClick={() => navigate('/reservas/nueva')}
          >
            Reservar Activo
          </Button>
        </div>
      </div>

      {/* Hero / Cabecera del Activo */}
      <div className="border-b border-border/80 bg-card/30 p-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Imagen de la Unidad */}
          <div className="relative h-32 w-48 rounded-xl overflow-hidden border border-border bg-muted/30 shrink-0">
            {imgUrl ? (
              <img src={imgUrl} alt={activo.codigo} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <TruckIcon className="h-10 w-10 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Información Principal */}
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black font-mono tracking-tight text-foreground">
                {activo.codigo}
              </h1>
              <Badge
                tono={
                  activo.estadoOperativo === 'operativo'
                    ? 'ok'
                    : activo.estadoOperativo === 'en_mantenimiento'
                    ? 'warn'
                    : 'danger'
                }
              >
                {activo.estadoOperativo.replace('_', ' ')}
              </Badge>
              {categoria && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  {categoria.nombre}
                </span>
              )}
            </div>

            <p className="text-base font-bold text-foreground">
              {activo.marca} {activo.modelo} ({activo.anio})
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <MapPinIcon className="h-3.5 w-3.5 text-primary" />
                {sede?.nombre} ({sede?.ciudad})
              </span>
              <span>·</span>
              <span>Serial: {activo.serial}</span>
              {activo.placa && (
                <>
                  <span>·</span>
                  <span>Placa: {activo.placa}</span>
                </>
              )}
            </div>
          </div>

          {/* Medidores Clave */}
          <div className="grid grid-cols-2 gap-3 shrink-0 text-xs font-mono border-l border-border/60 pl-6">
            <div className="rounded-xl border border-border bg-card p-3">
              <span className="text-[10px] text-muted-foreground block">LECTURA ACTUAL</span>
              <span className="text-base font-black text-foreground">
                {activo.lecturaActual} {categoria?.medidor}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <span className="text-[10px] text-muted-foreground block">CAPACIDAD</span>
              <span className="text-base font-black text-foreground">
                {activo.capacidad} {categoria?.unidadCapacidad}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido con Pestañas Radix */}
      <div className="max-w-6xl mx-auto w-full p-6 space-y-6 flex-1">
        <Tabs value={tabActiva} onValueChange={(v: string) => setTabActiva(v as typeof tabActiva)}>
          <TabsList>
            <TabsTrigger value="tecnica">
              <FileTextIcon className="h-4 w-4" /> Ficha Técnica
            </TabsTrigger>
            <TabsTrigger value="reservas" conteo={reservas.length}>
              <CalendarCheckIcon className="h-4 w-4" /> Reservas
            </TabsTrigger>
            <TabsTrigger value="inspecciones" conteo={inspecciones.length}>
              <ShieldCheckIcon className="h-4 w-4" /> Inspecciones
            </TabsTrigger>
            <TabsTrigger value="historial" conteo={historialEstado.length}>
              <ClockCounterClockwiseIcon className="h-4 w-4" /> Bitácora
            </TabsTrigger>
          </TabsList>

          {/* Pestaña: Ficha Técnica */}
          <TabsContent value="tecnica">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Especificaciones */}
              <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <GaugeIcon className="h-4 w-4 text-primary" /> Especificaciones Mecánicas
                </h3>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Tipo de Motor</dt>
                    <dd className="font-semibold text-foreground capitalize">{activo.motor}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Medidor</dt>
                    <dd className="font-semibold text-foreground capitalize">{categoria?.medidor}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Requiere Operador Homologado</dt>
                    <dd className="font-semibold text-foreground">
                      {activo.requiereOperador ? 'Sí (Obligatorio)' : 'No'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tiempo de Preparación (Buffer)</dt>
                    <dd className="font-semibold text-foreground">
                      {categoria?.bufferPreparacionMin} min
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Documentación y Permisos */}
              <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <IdentificationBadgeIcon className="h-4 w-4 text-primary" /> Pólizas y Permisos
                </h3>
                {activo.documentos.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No hay documentos registrados para este activo.</p>
                ) : (
                  <div className="space-y-2.5">
                    {activo.documentos.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-border/80 bg-background p-3 text-xs"
                      >
                        <div>
                          <span className="font-bold uppercase text-foreground block">{doc.tipo}</span>
                          <span className="font-mono text-muted-foreground text-[11px]">N° {doc.numero}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">VENCE</span>
                          <span className="font-mono font-bold text-foreground">
                            {formatearCivil(doc.venceEl)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Pestaña: Reservas */}
          <TabsContent value="reservas">
            <div className="rounded-xl border border-border bg-card/60 overflow-hidden pt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/30 font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Período</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {reservas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No hay reservas registradas para esta unidad.
                        </td>
                      </tr>
                    ) : (
                      reservas.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-mono font-bold text-foreground">{r.codigo}</td>
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">
                            {formatear(r.inicio, 'America/Caracas', 'dd/MM/yyyy')} →{' '}
                            {formatear(r.fin, 'America/Caracas', 'dd/MM/yyyy')}
                          </td>
                          <td className="px-4 py-2.5">
                            <EstadoReservaBadge estado={r.estado} />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              variante="fantasma"
                              tamano="sm"
                              onClick={() => navigate(`/reservas/${r.id}`)}
                            >
                              Ver Detalle
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Pestaña: Inspecciones */}
          <TabsContent value="inspecciones">
            <div className="rounded-xl border border-border bg-card/60 overflow-hidden pt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/30 font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Momento</th>
                      <th className="px-4 py-3">Fecha y Hora</th>
                      <th className="px-4 py-3">Lectura Registrada</th>
                      <th className="px-4 py-3">Veredicto</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {inspecciones.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No hay inspecciones registradas para esta unidad.
                        </td>
                      </tr>
                    ) : (
                      inspecciones.map((ins) => (
                        <tr key={ins.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-bold uppercase text-foreground">{ins.momento}</td>
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">
                            {formatear(ins.realizadaEn, 'America/Caracas', 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-foreground">{ins.lectura}</td>
                          <td className="px-4 py-2.5">
                            <ResultadoInspeccionBadge resultado={ins.resultado} />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              variante="fantasma"
                              tamano="sm"
                              onClick={() => navigate(`/inspecciones/${ins.id}`)}
                            >
                              Ver Checklist
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Pestaña: Historial de Cambios Operativos */}
          <TabsContent value="historial">
            <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3 pt-2">
              {historialEstado.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No hay cambios manuales de estado registrados.</p>
              ) : (
                <div className="relative border-l-2 border-border/60 ml-3 pl-4 space-y-4">
                  {historialEstado.map((cambio, idx) => {
                    const usuario = mapaUsuarios.get(cambio.usuarioId);

                    return (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-muted-foreground">
                            {formatear(cambio.en, 'America/Caracas', 'dd/MM/yyyy HH:mm')}
                          </span>
                          <span className="text-foreground font-semibold">
                            {usuario?.nombre ?? cambio.usuarioId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge tono={cambio.antes === 'operativo' ? 'ok' : cambio.antes === 'en_mantenimiento' ? 'warn' : 'danger'}>
                            {cambio.antes.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">→</span>
                          <Badge tono={cambio.despues === 'operativo' ? 'ok' : cambio.despues === 'en_mantenimiento' ? 'warn' : 'danger'}>
                            {cambio.despues.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/50">
                          {cambio.motivo}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Cambio de Estado */}
      <DialogoCambiarEstadoActivo
        activo={activo}
        abierto={modalEstado}
        onCerrar={() => setModalEstado(false)}
        onEstadoCambiado={() => void refetch()}
      />
    </div>
  );
}
