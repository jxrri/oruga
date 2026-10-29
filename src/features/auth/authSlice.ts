import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Sesion } from '@/api/contrato';

const CLAVE = 'oruga.sesion';

const leer = (): Sesion | null => {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    return null;
  }
};

const guardar = (s: Sesion | null) => {
  try {
    if (s) localStorage.setItem(CLAVE, JSON.stringify(s));
    else localStorage.removeItem(CLAVE);
  } catch {
    /* almacenamiento no disponible: la sesión vive solo en memoria */
  }
};

export interface EstadoAuth {
  sesion: Sesion | null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState: (): EstadoAuth => ({ sesion: leer() }),
  reducers: {
    sesionIniciada(state, a: PayloadAction<Sesion>) {
      state.sesion = a.payload;
      guardar(a.payload);
    },
    sesionCerrada(state) {
      state.sesion = null;
      guardar(null);
    },
  },
});

export const { sesionIniciada, sesionCerrada } = authSlice.actions;
export default authSlice.reducer;
