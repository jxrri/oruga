/** Vista del timeline (SPEC §6.3, §7.1): zoom, rango, agrupación y zona de visualización. */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ID, InstanteUTC } from '@/api/contrato';
import { ahora, MS_24H, sumarMs } from '@/shared/lib/fechas';

export type Zoom = 'dia' | 'semana' | 'mes';
export type Agrupacion = 'sede' | 'categoria' | 'ninguna';
export type ZonaVisualizacion = 'sede' | 'navegador' | 'utc';

export interface EstadoVista {
  zoom: Zoom;
  /** Instante en el borde izquierdo de la vista */
  inicioVista: InstanteUTC;
  agrupar: Agrupacion;
  zona: ZonaVisualizacion;
  modo: 'grid' | 'lista';
  /** Reserva a centrar y resaltar (panel de conflictos, enlaces) */
  enfocada: ID | null;
  panelConflictos: boolean;
}

const inicial = (): EstadoVista => ({
  zoom: 'semana',
  inicioVista: sumarMs(`${ahora().slice(0, 10)}T00:00:00Z`, -2 * MS_24H),
  agrupar: 'sede',
  zona: 'sede',
  modo: 'grid',
  enfocada: null,
  panelConflictos: true,
});

const vistaSlice = createSlice({
  name: 'vistaTimeline',
  initialState: inicial,
  reducers: {
    zoomCambiado(s, a: PayloadAction<Zoom>) {
      s.zoom = a.payload;
    },
    vistaDesplazada(s, a: PayloadAction<InstanteUTC>) {
      s.inicioVista = a.payload;
    },
    agrupacionCambiada(s, a: PayloadAction<Agrupacion>) {
      s.agrupar = a.payload;
    },
    zonaCambiada(s, a: PayloadAction<ZonaVisualizacion>) {
      s.zona = a.payload;
    },
    modoCambiado(s, a: PayloadAction<EstadoVista['modo']>) {
      s.modo = a.payload;
    },
    reservaEnfocada(s, a: PayloadAction<ID | null>) {
      s.enfocada = a.payload;
    },
    panelConflictosAlternado(s) {
      s.panelConflictos = !s.panelConflictos;
    },
  },
});

export const {
  zoomCambiado,
  vistaDesplazada,
  agrupacionCambiada,
  zonaCambiada,
  modoCambiado,
  reservaEnfocada,
  panelConflictosAlternado,
} = vistaSlice.actions;
export default vistaSlice.reducer;
