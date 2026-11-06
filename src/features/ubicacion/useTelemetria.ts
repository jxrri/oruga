import { useMemo } from 'react';
import type { Activo, Categoria, Cliente, Coordenadas, ID, Reserva, Sede } from '@/api/contrato';
import { useGetActivosQuery, useGetClientesQuery } from '@/api/baseApi';
import { useCatalogos, useReservasGlobales } from '@/api/hooks';
import { estadoVisible, type EstadoVisible } from '@/domain/estadoActivo';
import { ahoraMs, aMs } from '@/shared/lib/fechas';

export interface ObraAsignada extends Coordenadas {
  nombre: string;
  radioMetros: number;
}

export interface ActivoTelemetria {
  activo: Activo;
  categoria: Categoria | null;
  estado: EstadoVisible;
  sede: Sede | null;
  reservaActual: Reserva | null;
  cliente: Cliente | null;
  ubicacion: Coordenadas & { registradaEn: string };
  obra: ObraAsignada | null;
  distanciaObraMetros: number | null;
  fueraDeGeocerca: boolean;
}

export function calcularDistanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Radio por defecto permitido para obras de clientes: 850 metros
const RADIO_GEOFENCE_DEFAULT = 850;

export function useTelemetria() {
  const { data: activos = [], isLoading: cargandoActivos } = useGetActivosQuery();
  const { data: reservas = [], isLoading: cargandoReservas } = useReservasGlobales();
  const { data: clientes = [], isLoading: cargandoClientes } = useGetClientesQuery();
  const { sedePorId, categoriaPorId, cargando: cargandoCatalogos } = useCatalogos();

  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);

  const reservasPorActivo = useMemo(() => {
    const map = new Map<ID, Reserva[]>();
    for (const r of reservas) {
      if (!r.activoId) continue;
      const list = map.get(r.activoId);
      if (list) list.push(r);
      else map.set(r.activoId, [r]);
    }
    return map;
  }, [reservas]);

  const timestampAhora = ahoraMs();

  const lista = useMemo<ActivoTelemetria[]>(() => {
    return activos
      .filter((a) => a.ubicacion) // Solo activos con coordenadas reportadas
      .map((activo) => {
        const reservasDelActivo = reservasPorActivo.get(activo.id) ?? [];
        const estado = estadoVisible(activo, reservasDelActivo, timestampAhora);
        const sede = sedePorId.get(activo.sedeBaseId) ?? null;
        const categoria = categoriaPorId.get(activo.categoriaId) ?? null;

        // Encontrar reserva activa actual si existe
        const reservaEnCurso = reservasDelActivo.find(
          (r) => r.estado === 'en_curso' || (r.estado === 'confirmada' && aMs(r.inicio) <= timestampAhora && aMs(r.fin) >= timestampAhora),
        ) ?? null;

        const cliente = reservaEnCurso ? clientePorId.get(reservaEnCurso.clienteId) ?? null : null;

        const ubicacionActual = activo.ubicacion!;

        let obra: ObraAsignada | null = null;
        let distanciaObraMetros: number | null = null;
        let fueraDeGeocerca = false;

        if (reservaEnCurso) {
          // El centro asignado de la obra alrededor de la sede o punto de entrega
          const centroBase = sede?.coordenadas ?? { lat: 10.48, lng: -66.9 };
          // Coordenada objetivo para la obra del cliente
          const obraLat = +(centroBase.lat + 0.045).toFixed(5);
          const obraLng = +(centroBase.lng + 0.035).toFixed(5);

          obra = {
            lat: obraLat,
            lng: obraLng,
            nombre: `Obra ${cliente?.nombre ?? 'Cliente'} - Frente de Trabajo`,
            radioMetros: RADIO_GEOFENCE_DEFAULT,
          };

          distanciaObraMetros = calcularDistanciaMetros(
            ubicacionActual.lat,
            ubicacionActual.lng,
            obra.lat,
            obra.lng,
          );

          if (distanciaObraMetros > obra.radioMetros) {
            fueraDeGeocerca = true;
          }
        }

        return {
          activo,
          categoria,
          estado,
          sede,
          reservaActual: reservaEnCurso,
          cliente,
          ubicacion: ubicacionActual,
          obra,
          distanciaObraMetros,
          fueraDeGeocerca,
        };
      });
  }, [activos, reservasPorActivo, timestampAhora, sedePorId, categoriaPorId, clientePorId]);

  const alertasGeocerca = useMemo(
    () => lista.filter((item) => item.fueraDeGeocerca),
    [lista],
  );

  const conteoPorEstado = useMemo(() => {
    const counts: Record<string, number> = {
      todos: lista.length,
      disponible: 0,
      en_alquiler: 0,
      proxima_salida: 0,
      en_mantenimiento: 0,
      fuera_de_servicio: 0,
      baja: 0,
      geocerca_alerta: alertasGeocerca.length,
    };
    for (const item of lista) {
      const c = counts[item.estado];
      if (typeof c === 'number') {
        counts[item.estado] = c + 1;
      }
    }
    return counts;
  }, [lista, alertasGeocerca.length]);

  return {
    items: lista,
    alertasGeocerca,
    conteoPorEstado,
    cargando: cargandoActivos || cargandoReservas || cargandoClientes || cargandoCatalogos,
  };
}
