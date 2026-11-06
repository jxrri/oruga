import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  BuildingsIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CaretRightIcon,
  FunnelSimpleIcon,
  TagIcon,
} from '@phosphor-icons/react';
import type {
  Conflicto,
  ID,
  InstanteUTC,
  OrdenMantenimiento,
  Reserva,
  ZonaIANA,
} from '@/api/contrato';
import {
  useActualizarReservaMutation,
  useGetActivosQuery,
  useGetCategoriasQuery,
  useGetClientesQuery,
  useGetOrdenesQuery,
  useGetReservasQuery,
  useGetSedesQuery,
} from '@/api/baseApi';
import { describirError } from '@/api/errores';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  clasificar,
  conflictosAbiertos,
  detectarConflictos,
  type ContextoActivo,
  type Propuesta,
  type Veredicto,
} from '@/domain/conflictos';
import { estadoVisible } from '@/domain/estadoActivo';
import { aMs, ahora, desdeMs, formatear, MS_24H, sumarDias, zonaNavegador } from '@/shared/lib/fechas';
import { Button, EmptyState, Skeleton } from '@/shared/ui';
import { useEscalaTiempo } from '../useEscalaTiempo';
import {
  agrupacionCambiada,
  panelConflictosAlternado,
  reservaEnfocada,
  vistaDesplazada,
  zonaCambiada,
  zoomCambiado,
} from '../vistaSlice';
import {
  BarraControlesTimeline,
  type ConteosFiltroTimeline,
  type FiltroRapidoTimeline,
} from '../components/BarraControlesTimeline';
import { CabeceraTimeline } from '../components/CabeceraTimeline';
import { DetalleReservaDrawer } from '../components/DetalleReservaDrawer';
import { DialogoConfirmarAdvertencia } from '../components/DialogoConfirmarAdvertencia';
import { DialogoCrearReservaRapida } from '../components/DialogoCrearReservaRapida';
import { FantasmaArrastre } from '../components/FantasmaArrastre';
import { FilaTimeline } from '../components/FilaTimeline';
import { PanelConflictosLateral } from '../components/PanelConflictosLateral';

gsap.registerPlugin(useGSAP);

const ANCHO_COLUMNA_ACTIVO = 280;

interface ArrastreActivo {
  reserva: Reserva;
  modo: 'mover' | 'redimensionar-izq' | 'redimensionar-der';
  pointerStartX: number;
  pointerStartY: number;
  originalInicioMs: number;
  originalFinMs: number;
  originalActivoId: ID;
  actualInicioMs: number;
  actualFinMs: number;
  actualActivoId: ID;
  x: number;
  y: number;
  ancho: number;
  conflictos: Conflicto[];
  veredicto: Veredicto;
}

export default function PlanificadorPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const consolaRef = useRef<HTMLElement>(null);

  const {
    zoom,
    inicioVista,
    agrupar,
    zona: zonaOpcion,
    enfocada,
    panelConflictos,
  } = useAppSelector((s) => s.vistaTimeline);

  // Estado local de filtrado rápido, plegado de grupos y anuncio accesible
  const [busqueda, setBusqueda] = useState('');
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapidoTimeline>('todos');
  const [gruposColapsados, setGruposColapsados] = useState<Record<string, boolean>>({});
  const [mensajeVivo, setMensajeVivo] = useState('');

  // Coreografía de entrada de la consola con GSAP respetando movimiento reducido
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '[data-anim="planificador-bloque"]',
          { opacity: 0, y: 6 },
          {
            opacity: 1,
            y: 0,
            duration: 0.38,
            stagger: 0.045,
            ease: 'power3.out',
            clearProps: 'opacity,transform',
          },
        );
      });
      return () => mm.revert();
    },
    { scope: consolaRef },
  );

  // Consultas de datos
  const { data: sedes = [], isLoading: cargandoSedes } = useGetSedesQuery();
  const { data: categorias = [], isLoading: cargandoCategorias } = useGetCategoriasQuery();
  const { data: activos = [], isLoading: cargandoActivos } = useGetActivosQuery();
  const { data: ordenes = [] } = useGetOrdenesQuery();
  const { data: clientes = [] } = useGetClientesQuery();

  // Zona horaria efectiva
  const zonaActiva: ZonaIANA = useMemo(() => {
    if (zonaOpcion === 'navegador') return zonaNavegador();
    if (zonaOpcion === 'utc') return 'UTC';
    return sedes[0]?.zonaHoraria ?? 'America/Caracas';
  }, [zonaOpcion, sedes]);

  // Escala de tiempo calculada
  const escala = useEscalaTiempo(zoom, inicioVista, zonaActiva);

  // Parámetros de rango para reservas (con margen de lectura a ambos lados)
  const rangoReservas = useMemo(() => {
    return {
      desde: desdeMs(escala.inicioMs - 7 * MS_24H),
      hasta: desdeMs(escala.finMs + 7 * MS_24H),
    };
  }, [escala.inicioMs, escala.finMs]);

  const { data: reservas = [], isLoading: cargandoReservas } = useGetReservasQuery(rangoReservas);
  const [actualizarReserva] = useActualizarReservaMutation();

  // Mapeos O(1)
  const mapaCategorias = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const mapaActivos = useMemo(() => new Map(activos.map((a) => [a.id, a])), [activos]);
  const mapaSedes = useMemo(() => new Map(sedes.map((s) => [s.id, s])), [sedes]);
  const mapaClientes = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const mapaNombresCliente = useMemo(
    () => new Map(clientes.map((c) => [c.id, c.nombre])),
    [clientes],
  );

  // Reservas agrupadas por activo
  const reservasPorActivo = useMemo(() => {
    const map = new Map<ID, Reserva[]>();
    for (const r of reservas) {
      if (!r.activoId) continue;
      const arr = map.get(r.activoId) ?? [];
      arr.push(r);
      map.set(r.activoId, arr);
    }
    return map;
  }, [reservas]);

  // Órdenes de mantenimiento agrupadas por activo
  const ordenesPorActivo = useMemo(() => {
    const map = new Map<ID, OrdenMantenimiento[]>();
    for (const o of ordenes) {
      const arr = map.get(o.activoId) ?? [];
      arr.push(o);
      map.set(o.activoId, arr);
    }
    return map;
  }, [ordenes]);

  const ahoraMs = useMemo(() => aMs(ahora()), []);

  // Detección global de conflictos
  const listaConflictos = useMemo(() => {
    return conflictosAbiertos({
      reservas,
      activos,
      ordenes,
      ahoraMs,
    });
  }, [reservas, activos, ordenes, ahoraMs]);

  const conflictosPorReserva = useMemo(() => {
    const map = new Map<ID, Conflicto>();
    for (const c of listaConflictos) {
      if (!map.has(c.reservaId)) {
        map.set(c.reservaId, c.conflicto);
      }
    }
    return map;
  }, [listaConflictos]);

  const activosConConflicto = useMemo(() => {
    const ids = new Set<ID>();
    for (const c of listaConflictos) {
      if (c.activoId) ids.add(c.activoId);
    }
    return ids;
  }, [listaConflictos]);

  // Estado visible precalculado por unidad para filtros y contadores
  const estadoVisiblePorActivo = useMemo(() => {
    const map = new Map<ID, ReturnType<typeof estadoVisible>>();
    for (const a of activos) {
      map.set(a.id, estadoVisible(a, reservasPorActivo.get(a.id) ?? [], ahoraMs));
    }
    return map;
  }, [activos, reservasPorActivo, ahoraMs]);

  // Contadores vivos para las píldoras operativas
  const conteosFiltro: ConteosFiltroTimeline = useMemo(() => {
    let disponibles = 0;
    let enAlquiler = 0;
    let mantenimiento = 0;

    for (const a of activos) {
      const est = estadoVisiblePorActivo.get(a.id);
      if (est === 'disponible') disponibles++;
      else if (est === 'en_alquiler' || est === 'proxima_salida') enAlquiler++;
      else if (est === 'en_mantenimiento' || est === 'fuera_de_servicio') mantenimiento++;
    }

    return {
      todos: activos.length,
      disponibles,
      en_alquiler: enAlquiler,
      conflictos: activosConConflicto.size,
      mantenimiento,
    };
  }, [activos, estadoVisiblePorActivo, activosConConflicto]);

  // Filtrado de unidades por texto y estado rápido
  const activosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return activos.filter((activo) => {
      const est = estadoVisiblePorActivo.get(activo.id);

      if (filtroRapido === 'disponibles' && est !== 'disponible') return false;
      if (filtroRapido === 'en_alquiler' && est !== 'en_alquiler' && est !== 'proxima_salida') {
        return false;
      }
      if (filtroRapido === 'conflictos' && !activosConConflicto.has(activo.id)) return false;
      if (
        filtroRapido === 'mantenimiento' &&
        est !== 'en_mantenimiento' &&
        est !== 'fuera_de_servicio'
      ) {
        return false;
      }

      if (!q) return true;

      const cat = mapaCategorias.get(activo.categoriaId);
      const sede = mapaSedes.get(activo.sedeBaseId);
      const coincideUnidad =
        activo.codigo.toLowerCase().includes(q) ||
        activo.marca.toLowerCase().includes(q) ||
        activo.modelo.toLowerCase().includes(q) ||
        (cat?.nombre.toLowerCase().includes(q) ?? false) ||
        (sede?.nombre.toLowerCase().includes(q) ?? false);

      if (coincideUnidad) return true;

      const resActivo = reservasPorActivo.get(activo.id) ?? [];
      return resActivo.some((r) => {
        if (r.codigo.toLowerCase().includes(q)) return true;
        const nomCliente = mapaNombresCliente.get(r.clienteId);
        return nomCliente ? nomCliente.toLowerCase().includes(q) : false;
      });
    });
  }, [
    activos,
    busqueda,
    filtroRapido,
    estadoVisiblePorActivo,
    activosConConflicto,
    mapaCategorias,
    mapaSedes,
    reservasPorActivo,
    mapaNombresCliente,
  ]);

  // Estado de interactividad: Arrastre / Redimensionado
  const [arrastre, setArrastre] = useState<ArrastreActivo | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const filasRef = useRef<Map<ID, HTMLDivElement>>(new Map());

  // Diálogos modales
  const [modalAdvertencia, setModalAdvertencia] = useState<{
    abierto: boolean;
    conflictos: Conflicto[];
    reservaId: ID;
    cambios: { activoId: ID; inicio: InstanteUTC; fin: InstanteUTC; version: number };
  } | null>(null);

  const [modalCrearRapida, setModalCrearRapida] = useState<{
    abierto: boolean;
    activoId?: ID;
    inicioMs?: number;
    finMs?: number;
  }>({ abierto: false });

  const [reservaDetalleId, setReservaDetalleId] = useState<ID | null>(null);

  const registrarFila = useCallback((activoId: ID, el: HTMLDivElement | null) => {
    if (el) filasRef.current.set(activoId, el);
    else filasRef.current.delete(activoId);
  }, []);

  const alternarGrupo = useCallback((grupoId: string) => {
    setGruposColapsados((prev) => ({ ...prev, [grupoId]: !prev[grupoId] }));
  }, []);

  // Inicio de arrastre o redimensionado
  const handleIniciarArrastre = useCallback(
    (
      e: React.PointerEvent,
      reserva: Reserva,
      modo: 'mover' | 'redimensionar-izq' | 'redimensionar-der',
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const activoId = reserva.activoId;
      if (!activoId) return;

      const iniMs = aMs(reserva.inicio);
      const finMs = aMs(reserva.fin);
      const posX = escala.msAX(iniMs);
      const ancho = escala.msAX(finMs) - posX;

      setArrastre({
        reserva,
        modo,
        pointerStartX: e.clientX,
        pointerStartY: e.clientY,
        originalInicioMs: iniMs,
        originalFinMs: finMs,
        originalActivoId: activoId,
        actualInicioMs: iniMs,
        actualFinMs: finMs,
        actualActivoId: activoId,
        x: e.clientX - 24,
        y: e.clientY - 18,
        ancho,
        conflictos: [],
        veredicto: 'valido',
      });
    },
    [escala],
  );

  // Efecto global de Pointer Move / Pointer Up para arrastre
  useEffect(() => {
    if (!arrastre) return;

    const onPointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - arrastre.pointerStartX;
      const deltaMs = deltaX * escala.config.msPorPixel;

      let nuevoInicioMs = arrastre.originalInicioMs;
      let nuevoFinMs = arrastre.originalFinMs;
      const duracionMinimaMs = escala.config.pasoAjusteMs;

      if (arrastre.modo === 'mover') {
        nuevoInicioMs = escala.ajustar(arrastre.originalInicioMs + deltaMs);
        const duracion = arrastre.originalFinMs - arrastre.originalInicioMs;
        nuevoFinMs = nuevoInicioMs + duracion;
      } else if (arrastre.modo === 'redimensionar-izq') {
        nuevoInicioMs = Math.min(
          escala.ajustar(arrastre.originalInicioMs + deltaMs),
          arrastre.originalFinMs - duracionMinimaMs,
        );
      } else if (arrastre.modo === 'redimensionar-der') {
        nuevoFinMs = Math.max(
          escala.ajustar(arrastre.originalFinMs + deltaMs),
          arrastre.originalInicioMs + duracionMinimaMs,
        );
      }

      let targetActivoId = arrastre.originalActivoId;
      for (const [id, el] of filasRef.current.entries()) {
        const rect = el.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          targetActivoId = id;
          break;
        }
      }

      const activoTarget = mapaActivos.get(targetActivoId);
      const categoriaTarget = activoTarget ? mapaCategorias.get(activoTarget.categoriaId) : undefined;

      let conflictos: Conflicto[] = [];
      let veredicto: Veredicto = 'valido';

      if (activoTarget && categoriaTarget) {
        const propuesta: Propuesta = {
          id: arrastre.reserva.id,
          activoId: targetActivoId,
          clienteId: arrastre.reserva.clienteId,
          sedeRetiroId: arrastre.reserva.sedeRetiroId,
          inicio: nuevoInicioMs,
          fin: nuevoFinMs,
        };

        const ctx: ContextoActivo = {
          activo: activoTarget,
          categoria: categoriaTarget,
          reservas,
          ordenes: ordenesPorActivo.get(targetActivoId) ?? [],
          zona: zonaActiva,
        };

        conflictos = detectarConflictos(propuesta, ctx);
        veredicto = clasificar(conflictos);
      }

      const nuevoAncho = escala.msAX(nuevoFinMs) - escala.msAX(nuevoInicioMs);

      setArrastre((prev) =>
        prev
          ? {
              ...prev,
              actualInicioMs: nuevoInicioMs,
              actualFinMs: nuevoFinMs,
              actualActivoId: targetActivoId,
              x: e.clientX - 24,
              y: e.clientY - 18,
              ancho: nuevoAncho,
              conflictos,
              veredicto,
            }
          : null,
      );
    };

    const onPointerUp = async () => {
      const { reserva, actualActivoId, actualInicioMs, actualFinMs, veredicto, conflictos } = arrastre;
      setArrastre(null);

      if (
        actualActivoId === arrastre.originalActivoId &&
        actualInicioMs === arrastre.originalInicioMs &&
        actualFinMs === arrastre.originalFinMs
      ) {
        return;
      }

      if (veredicto === 'bloqueado') {
        const motivoBloqueo =
          conflictos.find((c) => c.severidad === 'bloqueante')?.mensaje ?? 'Conflicto no permitido';
        const aviso = `Asignación bloqueada: ${motivoBloqueo}`;
        setMensajeVivo(aviso);
        toast.error(aviso);
        return;
      }

      const nuevoInicioIso = desdeMs(actualInicioMs);
      const nuevoFinIso = desdeMs(actualFinMs);

      if (veredicto === 'advertencia') {
        setModalAdvertencia({
          abierto: true,
          conflictos,
          reservaId: reserva.id,
          cambios: {
            activoId: actualActivoId,
            inicio: nuevoInicioIso,
            fin: nuevoFinIso,
            version: reserva.version,
          },
        });
        return;
      }

      try {
        await actualizarReserva({
          id: reserva.id,
          cambios: {
            activoId: actualActivoId,
            inicio: nuevoInicioIso,
            fin: nuevoFinIso,
            version: reserva.version,
          },
        }).unwrap();
        const aviso = `Reserva ${reserva.codigo} reprogramada`;
        setMensajeVivo(aviso);
        toast.success(aviso);
      } catch (err: unknown) {
        const detalle = describirError(err).detalle;
        setMensajeVivo(detalle);
        toast.error(detalle);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [
    arrastre,
    escala,
    mapaActivos,
    mapaCategorias,
    reservas,
    ordenesPorActivo,
    actualizarReserva,
    zonaActiva,
  ]);

  const handleConfirmarAdvertencia = async (_motivo: string) => {
    if (!modalAdvertencia) return;
    try {
      await actualizarReserva({
        id: modalAdvertencia.reservaId,
        cambios: {
          ...modalAdvertencia.cambios,
          advertenciasAceptadas: modalAdvertencia.conflictos.map((c) => c.codigo),
        },
      }).unwrap();
      const aviso = 'Cambio aplicado con justificación registrada';
      setMensajeVivo(aviso);
      toast.success(aviso);
      setModalAdvertencia(null);
    } catch (err: unknown) {
      const detalle = describirError(err).detalle;
      setMensajeVivo(detalle);
      toast.error(detalle);
    }
  };

  const handleCrearEnRango = useCallback((activoId: ID, inicioMs: number, finMs: number) => {
    setModalCrearRapida({
      abierto: true,
      activoId,
      inicioMs,
      finMs,
    });
  }, []);

  // Centrar reserva seleccionada desde el inspector de conflictos
  const handleCentrarReserva = useCallback(
    (reservaId: ID) => {
      const res = reservas.find((r) => r.id === reservaId);
      if (!res) return;

      // Si hay filtros ocultando la fila, restablecerlos para garantizar visibilidad
      if (filtroRapido !== 'todos') setFiltroRapido('todos');
      if (busqueda.trim()) setBusqueda('');

      if (res.activoId) {
        const act = mapaActivos.get(res.activoId);
        if (act) {
          setGruposColapsados((prev) => ({
            ...prev,
            [act.sedeBaseId]: false,
            [act.categoriaId]: false,
          }));
        }
      }

      dispatch(reservaEnfocada(reservaId));
      const nuevoInicio = sumarDias(res.inicio, -1, zonaActiva);
      dispatch(vistaDesplazada(nuevoInicio));

      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
        if (res.activoId) {
          const filaEl = filasRef.current.get(res.activoId);
          filaEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    },
    [reservas, filtroRapido, busqueda, mapaActivos, zonaActiva, dispatch],
  );

  // Agrupación de unidades filtradas
  const seccionesAgrupadas = useMemo(() => {
    if (agrupar === 'sede') {
      return sedes.map((sede) => ({
        id: sede.id,
        titulo: `${sede.nombre} (${sede.ciudad})`,
        icono: BuildingsIcon,
        activos: activosFiltrados.filter((a) => a.sedeBaseId === sede.id),
      }));
    }
    if (agrupar === 'categoria') {
      return categorias.map((cat) => ({
        id: cat.id,
        titulo: cat.nombre,
        icono: TagIcon,
        activos: activosFiltrados.filter((a) => a.categoriaId === cat.id),
      }));
    }
    return [
      {
        id: 'todos',
        titulo: 'Listado general de unidades',
        icono: CalendarBlankIcon,
        activos: activosFiltrados,
      },
    ];
  }, [agrupar, sedes, categorias, activosFiltrados]);

  const reservaDetalle = useMemo(
    () => (reservaDetalleId ? reservas.find((r) => r.id === reservaDetalleId) ?? null : null),
    [reservaDetalleId, reservas],
  );

  const posXAhora = escala.msAX(ahoraMs);
  const horaAhoraTexto = useMemo(
    () => formatear(desdeMs(ahoraMs), zonaActiva, 'HH:mm'),
    [ahoraMs, zonaActiva],
  );

  const cargando = cargandoSedes || cargandoCategorias || cargandoActivos || cargandoReservas;

  return (
    <section
      ref={consolaRef}
      aria-label="Planificador de flota"
      className="flex h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-6.75rem)] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-panel"
    >
      {/* Región accesible para anunciar resultados de movimientos en el timeline */}
      <div className="sr-only" aria-live="polite">
        {mensajeVivo}
      </div>

      {/* Consola de mando superior */}
      <div data-anim="planificador-bloque">
        <BarraControlesTimeline
          zoom={zoom}
          onCambioZoom={(z) => dispatch(zoomCambiado(z))}
          inicioVista={desdeMs(escala.inicioMs)}
          finVistaMs={escala.finMs}
          onDesplazarVista={(v) => dispatch(vistaDesplazada(v as InstanteUTC))}
          agrupar={agrupar}
          onCambioAgrupacion={(a) => dispatch(agrupacionCambiada(a))}
          zonaOpcion={zonaOpcion}
          onCambioZonaOpcion={(z) => dispatch(zonaCambiada(z))}
          zonaActiva={zonaActiva}
          sedes={sedes}
          totalConflictos={listaConflictos.length}
          panelConflictosAbierto={panelConflictos}
          onAlternarPanelConflictos={() => dispatch(panelConflictosAlternado())}
          onNuevaReserva={() => setModalCrearRapida({ abierto: true })}
          busqueda={busqueda}
          onCambioBusqueda={setBusqueda}
          filtroRapido={filtroRapido}
          onCambioFiltroRapido={setFiltroRapido}
          conteos={conteosFiltro}
          equiposVisibles={activosFiltrados.length}
          totalEquipos={activos.length}
        />
      </div>

      {/* Cuerpo central: Lienzo Gantt + Inspector de conflictos */}
      <div data-anim="planificador-bloque" className="relative flex flex-1 overflow-hidden bg-canvas">
        <div
          ref={scrollContainerRef}
          className="relative flex-1 overflow-auto bg-panel select-none"
        >
          {cargando ? (
            <div className="flex flex-col">
              {/* Esqueleto con la geometría real de la regla y las filas */}
              <div className="flex h-16 border-b border-line bg-panel-2">
                <div className="w-[280px] shrink-0 border-r border-line p-3.5">
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex-1 p-3.5 space-y-2">
                  <Skeleton className="h-3.5 w-44" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="flex h-[52px] items-center border-b border-line bg-panel">
                  <div className="flex w-[280px] shrink-0 items-center gap-2.5 border-r border-line px-3">
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="flex-1 px-6">
                    <Skeleton
                      className="h-7 rounded-md"
                      style={{ width: `${32 + ((idx * 17) % 45)}%`, marginLeft: `${(idx * 13) % 30}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : activosFiltrados.length === 0 ? (
            <div className="flex h-full min-h-[320px] items-center justify-center p-6">
              <EmptyState
                icono={FunnelSimpleIcon}
                titulo="Ninguna unidad coincide con el filtro actual"
                descripcion="Ajuste el término de búsqueda o restablezca los filtros rápidos para visualizar el resto de la flota."
                accion={
                  <Button
                    variante="secundario"
                    tamano="sm"
                    onClick={() => {
                      setBusqueda('');
                      setFiltroRapido('todos');
                    }}
                  >
                    Mostrar toda la flota
                  </Button>
                }
              />
            </div>
          ) : (
            <div
              style={{ width: escala.anchoTotal + ANCHO_COLUMNA_ACTIVO }}
              className="relative min-h-full bg-panel"
            >
              {/* Regla temporal fija de doble nivel */}
              <CabeceraTimeline
                grupos={escala.grupos}
                columnas={escala.columnas}
                anchoTotal={escala.anchoTotal}
                anchoColumnaActivo={ANCHO_COLUMNA_ACTIVO}
                posXAhora={posXAhora}
                horaAhoraTexto={horaAhoraTexto}
              />

              {/* Secciones agrupadas y plegables */}
              {seccionesAgrupadas.map((seccion) => {
                if (seccion.activos.length === 0) return null;
                const IconoSeccion = seccion.icono;
                const colapsado = Boolean(gruposColapsados[seccion.id]);
                const enAlquilerSeccion = seccion.activos.filter((a) => {
                  const est = estadoVisiblePorActivo.get(a.id);
                  return est === 'en_alquiler' || est === 'proxima_salida';
                }).length;

                return (
                  <div key={seccion.id} className="relative">
                    {agrupar !== 'ninguna' && (
                      <div className="flex h-8 w-full items-center border-b border-line bg-panel-2">
                        <button
                          type="button"
                          onClick={() => alternarGrupo(seccion.id)}
                          aria-expanded={!colapsado}
                          className="sticky left-0 z-10 inline-flex h-full items-center gap-2 bg-panel-2 px-3 text-left text-xs transition-colors hover:text-ink"
                        >
                          {colapsado ? (
                            <CaretRightIcon size={13} weight="bold" className="text-ink-3" aria-hidden />
                          ) : (
                            <CaretDownIcon size={13} weight="bold" className="text-ink-3" aria-hidden />
                          )}
                          <IconoSeccion size={15} className="text-accent-fg shrink-0" aria-hidden />
                          <span className="font-semibold tracking-tight text-ink">
                            {seccion.titulo}
                          </span>
                          <span className="rounded-full border border-line bg-panel px-2 py-0.2 font-mono tabular text-[10.5px] font-medium text-ink-2">
                            {seccion.activos.length}
                          </span>
                          {enAlquilerSeccion > 0 && (
                            <span className="font-mono tabular text-[10.5px] text-ink-3">
                              · {enAlquilerSeccion} activas
                            </span>
                          )}
                        </button>
                      </div>
                    )}

                    {!colapsado &&
                      seccion.activos.map((activo) => {
                        const cat = mapaCategorias.get(activo.categoriaId);
                        if (!cat) return null;
                        const resActivo = reservasPorActivo.get(activo.id) ?? [];
                        const ordActivo = ordenesPorActivo.get(activo.id) ?? [];

                        return (
                          <div
                            key={activo.id}
                            ref={(el) => registrarFila(activo.id, el)}
                          >
                            <FilaTimeline
                              activo={activo}
                              categoria={cat}
                              reservas={resActivo}
                              ordenes={ordActivo}
                              columnas={escala.columnas}
                              anchoTotal={escala.anchoTotal}
                              anchoColumnaActivo={ANCHO_COLUMNA_ACTIVO}
                              msAX={escala.msAX}
                              xAMs={escala.xAMs}
                              conflictosPorReserva={conflictosPorReserva}
                              mapaNombresCliente={mapaNombresCliente}
                              zona={zonaActiva}
                              reservaEnfocadaId={enfocada}
                              esDestinoArrastre={arrastre?.actualActivoId === activo.id}
                              ahoraMs={ahoraMs}
                              posXAhora={posXAhora}
                              onSeleccionarReserva={(r) => setReservaDetalleId(r.id)}
                              onIniciarArrastre={handleIniciarArrastre}
                              onCrearEnRango={handleCrearEnRango}
                              onVerFichaActivo={(id) => navigate(`/inventario/${id}`)}
                            />
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inspector lateral de conflictos */}
        <PanelConflictosLateral
          conflictos={listaConflictos}
          activos={activos}
          reservas={reservas}
          abierto={panelConflictos}
          onCerrar={() => dispatch(panelConflictosAlternado())}
          onCentrarReserva={handleCentrarReserva}
          zona={zonaActiva}
        />
      </div>

      {/* Fantasma visual durante el arrastre */}
      {arrastre && (
        <FantasmaArrastre
          reserva={arrastre.reserva}
          activoTarget={
            mapaActivos.get(arrastre.actualActivoId) ?? mapaActivos.get(arrastre.originalActivoId)!
          }
          inicioMs={arrastre.actualInicioMs}
          finMs={arrastre.actualFinMs}
          x={arrastre.x}
          y={arrastre.y}
          ancho={arrastre.ancho}
          conflictos={arrastre.conflictos}
          veredicto={arrastre.veredicto}
          zona={zonaActiva}
        />
      )}

      {/* Diálogo de Confirmación de Advertencias */}
      {modalAdvertencia && (
        <DialogoConfirmarAdvertencia
          abierto={modalAdvertencia.abierto}
          conflictos={modalAdvertencia.conflictos}
          onConfirmar={handleConfirmarAdvertencia}
          onCancelar={() => setModalAdvertencia(null)}
        />
      )}

      {/* Diálogo de Creación Rápida */}
      <DialogoCrearReservaRapida
        abierto={modalCrearRapida.abierto}
        onCerrar={() => setModalCrearRapida({ abierto: false })}
        activoPreseleccionadoId={modalCrearRapida.activoId}
        inicioPreseleccionadoMs={modalCrearRapida.inicioMs}
        finPreseleccionadoMs={modalCrearRapida.finMs}
        activos={activos}
        categorias={categorias}
        sedes={sedes}
        clientes={clientes}
        reservasExistentes={reservas}
        zona={zonaActiva}
        onReservaCreada={(nueva) => {
          const aviso = `Reserva ${nueva.codigo} creada`;
          setMensajeVivo(aviso);
          toast.success(aviso);
          dispatch(reservaEnfocada(nueva.id));
        }}
      />

      {/* Cajón lateral de detalle y transiciones de reserva */}
      <DetalleReservaDrawer
        reserva={reservaDetalle}
        activo={reservaDetalle?.activoId ? mapaActivos.get(reservaDetalle.activoId) : undefined}
        categoria={
          reservaDetalle?.activoId
            ? mapaCategorias.get(mapaActivos.get(reservaDetalle.activoId)?.categoriaId ?? '')
            : undefined
        }
        cliente={reservaDetalle ? mapaClientes.get(reservaDetalle.clienteId) : undefined}
        sedeEntrega={reservaDetalle ? mapaSedes.get(reservaDetalle.sedeRetiroId) : undefined}
        sedeDevolucion={
          reservaDetalle ? mapaSedes.get(reservaDetalle.sedeDevolucionId) : undefined
        }
        abierto={!!reservaDetalleId}
        onCerrar={() => setReservaDetalleId(null)}
        zona={zonaActiva}
      />
    </section>
  );
}
