/**
 * Filtros multicriterio (SPEC §10): un objeto serializable compartido por inventario y timeline.
 * Guarda claves legibles (slug de categoría, clave de sede) para que la URL sea compartible.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FechaCivil, TipoActivo, TipoMotor } from '@/api/contrato';
import type { EstadoVisible } from '@/domain/estadoActivo';

export interface Filtros {
  q: string;
  tipo: TipoActivo | null;
  /** Slugs de categoría */
  categorias: string[];
  motores: TipoMotor[];
  capacidad: { min: number | null; max: number | null };
  estados: EstadoVisible[];
  /** Claves de sede */
  sedes: string[];
  disponibleEntre: { desde: FechaCivil; hasta: FechaCivil } | null;
  mantenimientoProximo: boolean;
  requiereOperador: boolean | null;
}

export const FILTROS_VACIOS: Filtros = {
  q: '',
  tipo: null,
  categorias: [],
  motores: [],
  capacidad: { min: null, max: null },
  estados: [],
  sedes: [],
  disponibleEntre: null,
  mantenimientoProximo: false,
  requiereOperador: null,
};

export interface VistaGuardada {
  id: string;
  nombre: string;
  filtros: Filtros;
}

const CLAVE_VISTAS = 'oruga.vistasFiltros';

const leerVistas = (): VistaGuardada[] => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_VISTAS) ?? '[]') as VistaGuardada[];
  } catch {
    return [];
  }
};

const guardarVistas = (v: VistaGuardada[]) => {
  try {
    localStorage.setItem(CLAVE_VISTAS, JSON.stringify(v));
  } catch {
    /* sin almacenamiento: las vistas duran la sesión */
  }
};

type Lista = 'categorias' | 'motores' | 'estados' | 'sedes';

const filtrosSlice = createSlice({
  name: 'filtros',
  initialState: () => ({ actual: FILTROS_VACIOS, vistas: leerVistas() }),
  reducers: {
    filtrosReemplazados(state, a: PayloadAction<Filtros>) {
      state.actual = a.payload;
    },
    filtroCambiado(state, a: PayloadAction<Partial<Filtros>>) {
      state.actual = { ...state.actual, ...a.payload };
    },
    opcionAlternada(state, a: PayloadAction<{ lista: Lista; valor: string }>) {
      const arr = state.actual[a.payload.lista] as string[];
      const i = arr.indexOf(a.payload.valor);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(a.payload.valor);
    },
    filtrosLimpiados(state) {
      state.actual = FILTROS_VACIOS;
    },
    vistaGuardada(state, a: PayloadAction<{ id: string; nombre: string }>) {
      state.vistas = [...state.vistas.filter((v) => v.nombre !== a.payload.nombre), { ...a.payload, filtros: state.actual }];
      guardarVistas(state.vistas);
    },
    vistaEliminada(state, a: PayloadAction<string>) {
      state.vistas = state.vistas.filter((v) => v.id !== a.payload);
      guardarVistas(state.vistas);
    },
  },
});

export const { filtrosReemplazados, filtroCambiado, opcionAlternada, filtrosLimpiados, vistaGuardada, vistaEliminada } =
  filtrosSlice.actions;
export default filtrosSlice.reducer;

export const contarFiltrosActivos = (f: Filtros): number =>
  (f.q ? 1 : 0) +
  (f.tipo ? 1 : 0) +
  (f.categorias.length ? 1 : 0) +
  (f.motores.length ? 1 : 0) +
  (f.capacidad.min !== null || f.capacidad.max !== null ? 1 : 0) +
  (f.estados.length ? 1 : 0) +
  (f.sedes.length ? 1 : 0) +
  (f.disponibleEntre ? 1 : 0) +
  (f.mantenimientoProximo ? 1 : 0) +
  (f.requiereOperador !== null ? 1 : 0);
