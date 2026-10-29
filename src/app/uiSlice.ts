import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Tema = 'sistema' | 'oscuro' | 'claro';

const leer = <T,>(clave: string, defecto: T): T => {
  try {
    const v = localStorage.getItem(clave);
    return v === null ? defecto : (JSON.parse(v) as T);
  } catch {
    return defecto;
  }
};

const guardar = (clave: string, v: unknown) => {
  try {
    localStorage.setItem(clave, JSON.stringify(v));
  } catch {
    /* preferencia solo en memoria */
  }
};

export interface EstadoUI {
  tema: Tema;
  menuColapsado: boolean;
  /** Mostrar equivalente en bolívares junto a los montos en USD */
  mostrarBs: boolean;
  panelDevAbierto: boolean;
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: (): EstadoUI => ({
    tema: leer<Tema>('oruga.tema', 'sistema'),
    menuColapsado: leer('oruga.menuColapsado', false),
    mostrarBs: leer('oruga.mostrarBs', false),
    panelDevAbierto: false,
  }),
  reducers: {
    temaCambiado(s, a: PayloadAction<Tema>) {
      s.tema = a.payload;
      guardar('oruga.tema', a.payload);
    },
    menuAlternado(s) {
      s.menuColapsado = !s.menuColapsado;
      guardar('oruga.menuColapsado', s.menuColapsado);
    },
    bsAlternado(s) {
      s.mostrarBs = !s.mostrarBs;
      guardar('oruga.mostrarBs', s.mostrarBs);
    },
    panelDevAlternado(s, a: PayloadAction<boolean | undefined>) {
      s.panelDevAbierto = a.payload ?? !s.panelDevAbierto;
    },
  },
});

export const { temaCambiado, menuAlternado, bsAlternado, panelDevAlternado } = uiSlice.actions;
export default uiSlice.reducer;
