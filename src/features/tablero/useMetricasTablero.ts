import { useMemo } from 'react';
import type { Centavos, FechaCivil, ID, InstanteUTC, Reserva } from '@/api/contrato';
import {
  useGetActivosQuery,
  useGetCategoriasQuery,
  useGetClientesQuery,
  useGetPlanesQuery,
} from '@/api/baseApi';
import { useCatalogos, useOrdenesGlobales, useReservasGlobales } from '@/api/hooks';
import { conflictosAbiertos, type ConflictoAbierto } from '@/domain/conflictos';
import { ETIQUETA_ESTADO_VISIBLE, estadoVisible, type EstadoVisible } from '@/domain/estadoActivo';
import { vencimientoMasCercano } from '@/domain/mantenimiento';
import {
  ahora,
  ahoraMs,
  aMs,
  desdeMs,
  diasEntreCiviles,
  formatearCivil,
  MS_24H,
  MS_HORA,
  sumarDiasCivil,
} from '@/shared/lib/fechas';

/** Días que cubre cada serie de las tarjetas de indicadores. */
export const DIAS_SERIE = 14;

export interface AlertaAccionable {
  id: string;
  tipo: 'conflicto' | 'mantenimiento' | 'documento' | 'cliente';
  severidad: 'bloqueante' | 'advertencia' | 'info';
  titulo: string;
  descripcion: string;
  enlace: string;
  textoEnlace: string;
  fecha?: string;
}

export interface UtilizacionCategoria {
  categoriaId: ID;
  nombre: string;
  porcentaje: number;
  horasReservadas: number;
  horasDisponibles: number;
}

export interface DistribucionEstado {
  nombre: string;
  clave: EstadoVisible;
  valor: number;
}

/** Monto estimado (USD enteros) de las reservas que inician en el mes, separado por estado. */
export interface IngresoPeriodo {
  /** "2026-11" */
  mes: string;
  /** "nov 26" */
  periodo: string;
  finalizadas: number;
  enCurso: number;
  confirmadas: number;
  borradores: number;
  reservasCount: number;
}

/** Parte sobre total, con su porcentaje entero: lo que dibuja cada anillo. */
export interface Proporcion {
  parte: number;
  total: number;
  porcentaje: number;
}

const proporcion = (parte: number, total: number): Proporcion => ({
  parte,
  total,
  porcentaje: total > 0 ? Math.min(100, Math.round((parte / total) * 100)) : 0,
});

/** `n` días civiles consecutivos (UTC, como el resto del tablero) desde `desde`. */
export const diasCiviles = (desde: FechaCivil, n: number): FechaCivil[] =>
  Array.from({ length: n }, (_, k) => sumarDiasCivil(desde, k));

/** Por cada día, cuántos tramos [inicio, fin) lo tocan. Con `clave` cuenta claves distintas (un activo, una vez). */
export function ocupacionPorDia(
  dias: readonly FechaCivil[],
  tramos: readonly { inicio: InstanteUTC; fin: InstanteUTC; clave?: ID }[],
): number[] {
  const limites = tramos.map((t) => ({ inicio: aMs(t.inicio), fin: aMs(t.fin), clave: t.clave }));
  return dias.map((dia) => {
    const inicioDia = aMs(`${dia}T00:00:00Z`);
    const finDia = inicioDia + MS_24H;
    const claves = new Set<ID>();
    let sinClave = 0;
    for (const t of limites) {
      if (t.inicio >= finDia || t.fin <= inicioDia) continue;
      if (t.clave === undefined) sinClave++;
      else claves.add(t.clave);
    }
    return claves.size + sinClave;
  });
}

/** Por cada día, la suma de `valor` de los puntos cuyo instante cae en ese día (UTC). */
export function sumaPorDia(dias: readonly FechaCivil[], puntos: readonly { en: InstanteUTC; valor: number }[]): number[] {
  const indice = new Map(dias.map((dia, i) => [dia, i]));
  const sumas = dias.map(() => 0);
  for (const p of puntos) {
    const i = indice.get(p.en.slice(0, 10));
    if (i !== undefined) sumas[i] = (sumas[i] ?? 0) + p.valor;
  }
  return sumas;
}

const CAMPO_POR_ESTADO = {
  finalizada: 'finalizadas',
  en_curso: 'enCurso',
  confirmada: 'confirmadas',
  borrador: 'borradores',
} as const;

/** Monto estimado por mes de inicio y estado de la reserva. Solo aparecen los meses con reservas; las canceladas no cuentan. */
export function ingresosPorMes(reservas: readonly Pick<Reserva, 'inicio' | 'estado' | 'montoEstimado'>[]): IngresoPeriodo[] {
  const porMes = new Map<string, IngresoPeriodo>();
  for (const r of reservas) {
    if (r.estado === 'cancelada') continue;
    const mes = r.inicio.slice(0, 7);
    let periodo = porMes.get(mes);
    if (!periodo) {
      periodo = {
        mes,
        periodo: formatearCivil(`${mes}-01`, 'MMM yy'),
        finalizadas: 0,
        enCurso: 0,
        confirmadas: 0,
        borradores: 0,
        reservasCount: 0,
      };
      porMes.set(mes, periodo);
    }
    // Se acumula en centavos y se pasa a USD al final para no arrastrar redondeos
    periodo[CAMPO_POR_ESTADO[r.estado]] += r.montoEstimado;
    periodo.reservasCount++;
  }
  return [...porMes.values()]
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((p) => ({
      ...p,
      finalizadas: Math.round(p.finalizadas / 100),
      enCurso: Math.round(p.enCurso / 100),
      confirmadas: Math.round(p.confirmadas / 100),
      borradores: Math.round(p.borradores / 100),
    }));
}

/** Reservas que comprometen un activo: las que están o estuvieron en firme. */
const EN_FIRME = new Set<Reserva['estado']>(['confirmada', 'en_curso', 'finalizada']);

export function useMetricasTablero() {
  const consultaActivos = useGetActivosQuery();
  const consultaReservas = useReservasGlobales();
  const consultaOrdenes = useOrdenesGlobales();
  const consultaPlanes = useGetPlanesQuery();
  const consultaClientes = useGetClientesQuery();
  // Misma entrada de caché que useCatalogos: aquí solo interesa su error y su reintento
  const consultaCategorias = useGetCategoriasQuery();
  const consultas = [consultaActivos, consultaReservas, consultaOrdenes, consultaPlanes, consultaClientes, consultaCategorias];

  const { data: activos = [], isLoading: cargandoActivos } = consultaActivos;
  const { data: reservas = [], isLoading: cargandoReservas } = consultaReservas;
  const { data: ordenes = [], isLoading: cargandoOrdenes } = consultaOrdenes;
  const { data: planes = [], isLoading: cargandoPlanes } = consultaPlanes;
  const { data: clientes = [], isLoading: cargandoClientes } = consultaClientes;
  const { categorias, categoriaPorId, cargando: cargandoCatalogos } = useCatalogos();

  const timestampAhora = ahoraMs();
  const fechaHoyCivil = ahora().slice(0, 10) as FechaCivil;

  // Reservas por activo
  const reservasPorActivo = useMemo(() => {
    const map = new Map<ID, typeof reservas>();
    for (const r of reservas) {
      if (!r.activoId) continue;
      const l = map.get(r.activoId);
      if (l) l.push(r);
      else map.set(r.activoId, [r]);
    }
    return map;
  }, [reservas]);

  // Conflictos abiertos (RF-DSH-01)
  const listaConflictos: ConflictoAbierto[] = useMemo(() => {
    if (!activos.length || !reservas.length) return [];
    return conflictosAbiertos({
      reservas,
      activos,
      ordenes,
      ahoraMs: timestampAhora,
    });
  }, [activos, reservas, ordenes, timestampAhora]);

  // Estados visibles de la flota
  const distribucionEstados = useMemo<DistribucionEstado[]>(() => {
    const conteos: Record<EstadoVisible, number> = {
      disponible: 0,
      en_alquiler: 0,
      proxima_salida: 0,
      en_mantenimiento: 0,
      fuera_de_servicio: 0,
      baja: 0,
    };

    for (const a of activos) {
      const res = reservasPorActivo.get(a.id) ?? [];
      const ev = estadoVisible(a, res, timestampAhora);
      conteos[ev]++;
    }

    const orden: EstadoVisible[] = ['disponible', 'en_alquiler', 'proxima_salida', 'en_mantenimiento', 'fuera_de_servicio', 'baja'];
    return orden.map((clave) => ({ nombre: ETIQUETA_ESTADO_VISIBLE[clave], clave, valor: conteos[clave] }));
  }, [activos, reservasPorActivo, timestampAhora]);

  // Mantenimientos vencidos y por vencer (RF-DSH-01)
  const metricasMantenimiento = useMemo(() => {
    let vencidos = 0;
    let porVencer = 0;
    const activosConAlerta: { activoId: ID; codigo: string; vencido: boolean; motivo: string }[] = [];

    for (const a of activos) {
      const cat = categoriaPorId.get(a.categoriaId);
      if (!cat) continue;
      const v = vencimientoMasCercano(a, planes, cat, fechaHoyCivil);
      if (!v) continue;

      if (v.vencido) {
        vencidos++;
        activosConAlerta.push({
          activoId: a.id,
          codigo: a.codigo,
          vencido: true,
          motivo: v.faltaLectura !== undefined ? `Rebasó lectura en ${Math.abs(v.faltaLectura)} ${cat.medidor}` : 'Plazo de días expirado',
        });
      } else if (v.enAviso) {
        porVencer++;
        activosConAlerta.push({
          activoId: a.id,
          codigo: a.codigo,
          vencido: false,
          motivo: v.faltaLectura !== undefined ? `A ${v.faltaLectura} ${cat.medidor} del servicio` : `A ${v.faltanDias} días del servicio`,
        });
      }
    }

    return { vencidos, porVencer, activosConAlerta };
  }, [activos, planes, categoriaPorId, fechaHoyCivil]);

  // Utilización por categoría (RF-DSH-01): horas reservadas / horas disponibles en los últimos 30 días
  const { utilizacionPorCategoria, utilizacion } = useMemo(() => {
    const ventanaMs = 30 * MS_24H;
    const inicioVentana = timestampAhora - ventanaMs;

    const activosPorCat = new Map<ID, number>();
    for (const a of activos) {
      if (a.estadoOperativo === 'baja') continue;
      activosPorCat.set(a.categoriaId, (activosPorCat.get(a.categoriaId) ?? 0) + 1);
    }

    const horasPorCat = new Map<ID, number>();
    for (const r of reservas) {
      if (r.estado === 'cancelada') continue;
      const ini = Math.max(aMs(r.inicio), inicioVentana);
      const fin = Math.min(aMs(r.fin), timestampAhora);
      if (fin > ini) {
        const horas = (fin - ini) / MS_HORA;
        horasPorCat.set(r.categoriaId, (horasPorCat.get(r.categoriaId) ?? 0) + horas);
      }
    }

    const lista: UtilizacionCategoria[] = categorias.map((cat) => {
      const cantActivos = activosPorCat.get(cat.id) ?? 0;
      const horasDisponibles = cantActivos * 30 * 24;
      const horasReservadas = Math.round(horasPorCat.get(cat.id) ?? 0);
      const porcentaje = horasDisponibles > 0 ? Math.min(100, Math.round((horasReservadas / horasDisponibles) * 100)) : 0;

      return {
        categoriaId: cat.id,
        nombre: cat.nombre,
        porcentaje,
        horasReservadas,
        horasDisponibles,
      };
    });

    const sumaHorasReservadas = lista.reduce((acc, item) => acc + item.horasReservadas, 0);
    const sumaHorasDisponibles = lista.reduce((acc, item) => acc + item.horasDisponibles, 0);

    return {
      utilizacionPorCategoria: [...lista].sort((a, b) => b.porcentaje - a.porcentaje),
      utilizacion: proporcion(sumaHorasReservadas, sumaHorasDisponibles),
    };
  }, [activos, reservas, categorias, timestampAhora]);

  // Anillos: proporciones de la flota, cada una con su parte y su total para mostrarlas en texto
  const anillos = useMemo(() => {
    const enServicio = activos.filter((a) => a.estadoOperativo !== 'baja');
    return {
      // Horas reservadas sobre horas disponibles de los últimos 30 días
      utilizacion,
      // Activos en estado operativo sobre la flota sin las bajas
      operativa: proporcion(enServicio.filter((a) => a.estadoOperativo === 'operativo').length, enServicio.length),
      // Activos sin mantenimiento preventivo vencido sobre el total de activos
      mantenimientoAlDia: proporcion(activos.length - metricasMantenimiento.vencidos, activos.length),
    };
  }, [activos, utilizacion, metricasMantenimiento.vencidos]);

  // Ingresos proyectados del mes actual
  const ingresosProyectadosCentavos = useMemo<Centavos>(() => {
    let total = 0;
    const mesActual = fechaHoyCivil.slice(0, 7); // "2026-10" o "2026-11"
    for (const r of reservas) {
      if (r.estado === 'cancelada') continue;
      if (r.inicio.startsWith(mesActual) || r.fin.startsWith(mesActual)) {
        total += r.montoEstimado;
      }
    }
    return total as Centavos;
  }, [reservas, fechaHoyCivil]);

  // Ingresos por mes de inicio y estado, para las barras apiladas
  const ingresosMensuales = useMemo(() => ingresosPorMes(reservas), [reservas]);

  // Series por día de las tarjetas de indicadores: todas salen de reservas, órdenes y conflictos ya cargados
  const series = useMemo(() => {
    const ultimosDias = diasCiviles(sumarDiasCivil(fechaHoyCivil, -(DIAS_SERIE - 1)), DIAS_SERIE);
    const proximosDias = diasCiviles(fechaHoyCivil, DIAS_SERIE);
    return {
      // Activos distintos con una reserva en firme que toca el día
      activosConReserva: ocupacionPorDia(
        ultimosDias,
        reservas.flatMap((r) => (r.activoId && EN_FIRME.has(r.estado) ? [{ inicio: r.inicio, fin: r.fin, clave: r.activoId }] : [])),
      ),
      // Monto estimado (USD) de las reservas no canceladas que inician ese día
      montoPorInicioUsd: sumaPorDia(
        ultimosDias,
        reservas.flatMap((r) => (r.estado === 'cancelada' ? [] : [{ en: r.inicio, valor: r.montoEstimado / 100 }])),
      ).map((usd) => Math.round(usd)),
      // Órdenes de taller no canceladas cuyo tramo [inicio, fin estimado) toca el día
      ordenesEnTaller: ocupacionPorDia(
        ultimosDias,
        ordenes.flatMap((o) => (o.estado === 'cancelada' ? [] : [{ inicio: o.inicio, fin: o.finEstimado }])),
      ),
      // Conflictos abiertos según el día en que inicia la reserva afectada (hoy y los 13 días siguientes)
      conflictosPorInicio: sumaPorDia(
        proximosDias,
        listaConflictos.map((c) => ({ en: desdeMs(c.inicio), valor: 1 })),
      ),
    };
  }, [reservas, ordenes, listaConflictos, fechaHoyCivil]);

  // Lista de alertas accionables (RF-DSH-02)
  const alertasAccionables = useMemo<AlertaAccionable[]>(() => {
    const list: AlertaAccionable[] = [];

    // 1. Conflictos de reservas
    listaConflictos.forEach((conf, idx) => {
      list.push({
        id: `conf-${conf.reservaId}-${conf.conflicto.codigo}-${conf.conflicto.con ?? idx}`,
        tipo: 'conflicto',
        severidad: conf.conflicto.severidad,
        titulo: `Conflicto de programación: ${conf.conflicto.codigo}`,
        descripcion: conf.conflicto.mensaje,
        enlace: `/planificador`,
        textoEnlace: 'Resolver en Planificador',
      });
    });

    // 2. Mantenimientos vencidos o en aviso
    for (const m of metricasMantenimiento.activosConAlerta) {
      list.push({
        id: `mnt-${m.activoId}`,
        tipo: 'mantenimiento',
        severidad: m.vencido ? 'bloqueante' : 'advertencia',
        titulo: `${m.vencido ? 'Mantenimiento preventivo vencido' : 'Mantenimiento próximo'} (${m.codigo})`,
        descripcion: m.motivo,
        enlace: `/mantenimiento`,
        textoEnlace: 'Abrir orden de taller',
      });
    }

    // 3. Documentos por vencer en menos de 30 días
    for (const a of activos) {
      a.documentos.forEach((doc, idx) => {
        if (!doc.venceEl) return;
        const diffDias = diasEntreCiviles(fechaHoyCivil, doc.venceEl);
        if (diffDias <= 30) {
          list.push({
            id: `doc-${a.id}-${doc.tipo}-${doc.numero || idx}`,
            tipo: 'documento',
            severidad: diffDias <= 0 ? 'bloqueante' : 'advertencia',
            titulo: `${diffDias <= 0 ? 'Documento vencido' : 'Documento por vencer'}: ${doc.tipo.toUpperCase()} (${a.codigo})`,
            descripcion: `${doc.numero || 'Sin número'} - ${diffDias <= 0 ? 'Expiró' : `Vence en ${diffDias} días`}`,
            enlace: `/inventario/${a.id}`,
            textoEnlace: 'Ver ficha de activo',
          });
        }
      });
    }

    // 4. Clientes bloqueados con reservas activas
    const clientesBloqueados = new Set(clientes.filter((c) => c.estado === 'bloqueado').map((c) => c.id));
    for (const r of reservas) {
      if (clientesBloqueados.has(r.clienteId) && (r.estado === 'borrador' || r.estado === 'confirmada')) {
        list.push({
          id: `cli-${r.id}`,
          tipo: 'cliente',
          severidad: 'bloqueante',
          titulo: `Reserva con cliente bloqueado (${r.codigo})`,
          descripcion: 'El cliente no puede recibir equipos hasta regularizar su situación contractual.',
          enlace: `/clientes/${r.clienteId}`,
          textoEnlace: 'Ver ficha del cliente',
        });
      }
    }

    return list;
  }, [listaConflictos, metricasMantenimiento.activosConAlerta, activos, fechaHoyCivil, clientes, reservas]);

  // Próximas operaciones de hoy (entregas y devoluciones)
  const operacionesHoy = useMemo(() => {
    return reservas
      .filter((r) => r.estado === 'confirmada' || r.estado === 'en_curso')
      .filter((r) => r.inicio.startsWith(fechaHoyCivil) || r.fin.startsWith(fechaHoyCivil))
      .slice(0, 6);
  }, [reservas, fechaHoyCivil]);

  const consultaFallida = consultas.find((c) => c.isError);

  return {
    kpis: {
      tasaUtilizacionGlobal: utilizacion.porcentaje,
      totalActivos: activos.length,
      activosOperativos: distribucionEstados.find((d) => d.clave === 'disponible')?.valor ?? 0,
      activosEnAlquiler: distribucionEstados.find((d) => d.clave === 'en_alquiler')?.valor ?? 0,
      activosInactivos:
        (distribucionEstados.find((d) => d.clave === 'fuera_de_servicio')?.valor ?? 0) +
        (distribucionEstados.find((d) => d.clave === 'en_mantenimiento')?.valor ?? 0) +
        (distribucionEstados.find((d) => d.clave === 'baja')?.valor ?? 0),
      mantenimientosVencidos: metricasMantenimiento.vencidos,
      mantenimientosPorVencer: metricasMantenimiento.porVencer,
      conflictosAbiertosCount: listaConflictos.length,
      ingresosProyectadosCentavos,
    },
    series,
    anillos,
    distribucionEstados,
    utilizacionPorCategoria,
    ingresosMensuales,
    alertasAccionables,
    operacionesHoy,
    cargando: cargandoActivos || cargandoReservas || cargandoOrdenes || cargandoPlanes || cargandoClientes || cargandoCatalogos,
    /** Error de la primera consulta fallida: sin ella las cifras no son fiables */
    error: consultaFallida?.error,
    reintentar: () => {
      for (const c of consultas) if (c.isError) void c.refetch();
    },
  };
}
