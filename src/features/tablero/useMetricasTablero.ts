import { useMemo } from 'react';
import type { Centavos, FechaCivil, ID } from '@/api/contrato';
import {
  useGetActivosQuery,
  useGetClientesQuery,
  useGetPlanesQuery,
} from '@/api/baseApi';
import { useCatalogos, useOrdenesGlobales, useReservasGlobales } from '@/api/hooks';
import { conflictosAbiertos, type ConflictoAbierto } from '@/domain/conflictos';
import { estadoVisible, type EstadoVisible } from '@/domain/estadoActivo';
import { vencimientoMasCercano } from '@/domain/mantenimiento';
import { ahora, ahoraMs, aMs, diasEntreCiviles, MS_24H, MS_HORA } from '@/shared/lib/fechas';

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
  color: string;
}

export interface IngresoPeriodo {
  periodo: string;
  montoUsd: number;
  reservasCount: number;
}

export function useMetricasTablero() {
  const { data: activos = [], isLoading: cargandoActivos } = useGetActivosQuery();
  const { data: reservas = [], isLoading: cargandoReservas } = useReservasGlobales();
  const { data: ordenes = [], isLoading: cargandoOrdenes } = useOrdenesGlobales();
  const { data: planes = [], isLoading: cargandoPlanes } = useGetPlanesQuery();
  const { data: clientes = [], isLoading: cargandoClientes } = useGetClientesQuery();
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

    return [
      { nombre: 'Disponibles', clave: 'disponible', valor: conteos.disponible, color: '#10b981' },
      { nombre: 'En Alquiler', clave: 'en_alquiler', valor: conteos.en_alquiler, color: '#0284c7' },
      { nombre: 'Próxima Salida', clave: 'proxima_salida', valor: conteos.proxima_salida, color: '#f59e0b' },
      { nombre: 'En Mantenimiento', clave: 'en_mantenimiento', valor: conteos.en_mantenimiento, color: '#8b5cf6' },
      { nombre: 'Fuera de Servicio', clave: 'fuera_de_servicio', valor: conteos.fuera_de_servicio, color: '#f43f5e' },
      { nombre: 'De Baja', clave: 'baja', valor: conteos.baja, color: '#64748b' },
    ];
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
  const { utilizacionPorCategoria, utilizacionGlobal } = useMemo(() => {
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
    const tasaGlobal = sumaHorasDisponibles > 0 ? Math.min(100, Math.round((sumaHorasReservadas / sumaHorasDisponibles) * 100)) : 0;

    return {
      utilizacionPorCategoria: [...lista].sort((a, b) => b.porcentaje - a.porcentaje),
      utilizacionGlobal: tasaGlobal,
    };
  }, [activos, reservas, categorias, timestampAhora]);

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

  // Ingresos agrupados por mes para el gráfico de área
  const ingresosMensuales = useMemo<IngresoPeriodo[]>(() => {
    const meses = ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];
    const nombresMes: Record<string, string> = {
      '2026-09': 'Sep 26',
      '2026-10': 'Oct 26',
      '2026-11': 'Nov 26',
      '2026-12': 'Dic 26',
      '2027-01': 'Ene 27',
    };

    const acumulador: Record<string, { total: number; count: number }> = {};
    for (const m of meses) {
      acumulador[m] = { total: 0, count: 0 };
    }

    for (const r of reservas) {
      if (r.estado === 'cancelada') continue;
      const mes = r.inicio.slice(0, 7);
      if (acumulador[mes]) {
        acumulador[mes].total += r.montoEstimado / 100;
        acumulador[mes].count++;
      }
    }

    return meses.map((m) => ({
      periodo: nombresMes[m] ?? m,
      montoUsd: Math.round(acumulador[m]?.total ?? 0),
      reservasCount: acumulador[m]?.count ?? 0,
    }));
  }, [reservas]);

  // Lista de alertas accionables (RF-DSH-02)
  const alertasAccionables = useMemo<AlertaAccionable[]>(() => {
    const list: AlertaAccionable[] = [];

    // 1. Conflictos de reservas
    for (const conf of listaConflictos) {
      list.push({
        id: `conf-${conf.reservaId}-${conf.conflicto.codigo}`,
        tipo: 'conflicto',
        severidad: conf.conflicto.severidad,
        titulo: `Conflicto de programación: ${conf.conflicto.codigo}`,
        descripcion: conf.conflicto.mensaje,
        enlace: `/planificador`,
        textoEnlace: 'Resolver en Planificador',
      });
    }

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
      for (const doc of a.documentos) {
        if (!doc.venceEl) continue;
        const diffDias = diasEntreCiviles(fechaHoyCivil, doc.venceEl);
        if (diffDias <= 30) {
          list.push({
            id: `doc-${a.id}-${doc.tipo}`,
            tipo: 'documento',
            severidad: diffDias <= 0 ? 'bloqueante' : 'advertencia',
            titulo: `${diffDias <= 0 ? 'Documento vencido' : 'Documento por vencer'}: ${doc.tipo.toUpperCase()} (${a.codigo})`,
            descripcion: `${doc.numero || 'Sin número'} - ${diffDias <= 0 ? 'Expiró' : `Vence en ${diffDias} días`}`,
            enlace: `/inventario/${a.id}`,
            textoEnlace: 'Ver ficha de activo',
          });
        }
      }
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

  return {
    kpis: {
      tasaUtilizacionGlobal: utilizacionGlobal,
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
    distribucionEstados,
    utilizacionPorCategoria,
    ingresosMensuales,
    alertasAccionables,
    operacionesHoy,
    cargando: cargandoActivos || cargandoReservas || cargandoOrdenes || cargandoPlanes || cargandoClientes || cargandoCatalogos,
  };
}
