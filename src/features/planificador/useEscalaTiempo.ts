import { useMemo } from 'react';
import type { InstanteUTC, ZonaIANA } from '@/api/contrato';
import {
  aMs,
  desdeMs,
  enZona,
  fechaCivilDe,
  formatear,
  hoyCivil,
  inicioDelDia,
  MS_24H,
  MS_HORA,
} from '@/shared/lib/fechas';
import type { Zoom } from './vistaSlice';

export interface ConfiguracionZoom {
  zoom: Zoom;
  msPorPixel: number;
  pasoAjusteMs: number;
  diasRango: number;
  anchoColumnaPx: number;
  etiquetaZoom: string;
}

export const CONFIG_ZOOM: Record<Zoom, ConfiguracionZoom> = {
  dia: {
    zoom: 'dia',
    msPorPixel: MS_HORA / 48, // 48 px por hora
    pasoAjusteMs: 15 * 60_000, // 15 minutos
    diasRango: 3, // 72 horas
    anchoColumnaPx: 48,
    etiquetaZoom: 'Día',
  },
  semana: {
    zoom: 'semana',
    msPorPixel: MS_24H / 120, // 120 px por día
    pasoAjusteMs: MS_HORA, // 1 hora
    diasRango: 21, // 3 semanas
    anchoColumnaPx: 120,
    etiquetaZoom: 'Semana',
  },
  mes: {
    zoom: 'mes',
    msPorPixel: MS_24H / 32, // 32 px por día
    pasoAjusteMs: MS_24H, // 1 día
    diasRango: 90, // 3 meses
    anchoColumnaPx: 32,
    etiquetaZoom: 'Mes',
  },
};

export interface ColumnaTiempo {
  id: string;
  inicioMs: number;
  finMs: number;
  x: number;
  ancho: number;
  etiquetaPrincipal: string;
  etiquetaSecundaria?: string;
  esFinDeSemana: boolean;
  esHoy: boolean;
}

export interface GrupoCabecera {
  id: string;
  titulo: string;
  x: number;
  ancho: number;
}

export function useEscalaTiempo(zoom: Zoom, inicioVista: InstanteUTC, zona: ZonaIANA) {
  const config = CONFIG_ZOOM[zoom];

  return useMemo(() => {
    const inicioAlineado = inicioDelDia(inicioVista, zona);
    const inicioMs = aMs(inicioAlineado);
    const msPorPixel = config.msPorPixel;
    const duracionMs = config.diasRango * MS_24H;
    const finMs = inicioMs + duracionMs;
    const anchoTotal = duracionMs / msPorPixel;
    const hoy = hoyCivil(zona);

    const msAX = (ms: number): number => (ms - inicioMs) / msPorPixel;
    const xAMs = (x: number): number => inicioMs + x * msPorPixel;

    const ajustar = (ms: number): number => {
      const paso = config.pasoAjusteMs;
      return Math.round(ms / paso) * paso;
    };

    const columnas: ColumnaTiempo[] = [];
    const grupos: GrupoCabecera[] = [];

    if (zoom === 'dia') {
      // Columnas por hora
      const totalHoras = config.diasRango * 24;
      for (let h = 0; h < totalHoras; h++) {
        const cInicio = inicioMs + h * MS_HORA;
        const cFin = cInicio + MS_HORA;
        const instante = desdeMs(cInicio);
        const zDate = enZona(instante, zona);
        const diaSem = zDate.getDay();
        const fc = fechaCivilDe(instante, zona);

        columnas.push({
          id: `h-${cInicio}`,
          inicioMs: cInicio,
          finMs: cFin,
          x: h * 48,
          ancho: 48,
          etiquetaPrincipal: `${String(zDate.getHours()).padStart(2, '0')}:00`,
          esFinDeSemana: diaSem === 0 || diaSem === 6,
          esHoy: fc === hoy,
        });
      }

      // Grupos por día
      for (let d = 0; d < config.diasRango; d++) {
        const dInicio = inicioMs + d * MS_24H;
        const instante = desdeMs(dInicio);
        grupos.push({
          id: `g-dia-${dInicio}`,
          titulo: formatear(instante, zona, 'EEEE dd MMMM'),
          x: d * 24 * 48,
          ancho: 24 * 48,
        });
      }
    } else {
      // Columnas por día para semana y mes
      const anchoCol = config.anchoColumnaPx;
      let mesActual = '';
      let mesInicioX = 0;
      let mesAncho = 0;

      for (let d = 0; d < config.diasRango; d++) {
        const cInicio = inicioMs + d * MS_24H;
        const cFin = cInicio + MS_24H;
        const instante = desdeMs(cInicio);
        const zDate = enZona(instante, zona);
        const diaSem = zDate.getDay();
        const fc = fechaCivilDe(instante, zona);
        const nombreMes = formatear(instante, zona, 'MMMM yyyy');

        if (nombreMes !== mesActual) {
          if (mesActual) {
            grupos.push({
              id: `g-mes-${mesActual}-${mesInicioX}`,
              titulo: mesActual,
              x: mesInicioX,
              ancho: mesAncho,
            });
          }
          mesActual = nombreMes;
          mesInicioX = d * anchoCol;
          mesAncho = anchoCol;
        } else {
          mesAncho += anchoCol;
        }

        columnas.push({
          id: `d-${cInicio}`,
          inicioMs: cInicio,
          finMs: cFin,
          x: d * anchoCol,
          ancho: anchoCol,
          etiquetaPrincipal: zoom === 'semana' ? `${formatear(instante, zona, 'EEE')} ${zDate.getDate()}` : `${zDate.getDate()}`,
          etiquetaSecundaria: zoom === 'semana' ? formatear(instante, zona, 'MMM') : undefined,
          esFinDeSemana: diaSem === 0 || diaSem === 6,
          esHoy: fc === hoy,
        });
      }

      if (mesActual && mesAncho > 0) {
        grupos.push({
          id: `g-mes-${mesActual}-${mesInicioX}`,
          titulo: mesActual,
          x: mesInicioX,
          ancho: mesAncho,
        });
      }
    }

    return {
      config,
      inicioMs,
      finMs,
      duracionMs,
      anchoTotal,
      columnas,
      grupos,
      msAX,
      xAMs,
      ajustar,
    };
  }, [zoom, inicioVista, zona, config]);
}
