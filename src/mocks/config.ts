/** Controles del panel de desarrollo sobre la API simulada (SPEC §11.1). Fuera de Redux a propósito. */
export interface ConfigMock {
  latencia: { min: number; max: number };
  /** Fuerza un error en la próxima petición de escritura o en todas */
  forzar: { codigo: 500 | 409; modo: 'proxima' | 'siempre' } | null;
  tiempoReal: boolean;
  /** Probabilidad de falla al subir evidencias (con semilla fija) */
  fallaEvidencias: number;
}

let config: ConfigMock = {
  latencia: { min: 150, max: 600 },
  forzar: null,
  tiempoReal: true,
  fallaEvidencias: 0.15,
};

const oyentes = new Set<() => void>();

export const leerConfigMock = (): ConfigMock => config;

export const cambiarConfigMock = (cambios: Partial<ConfigMock>) => {
  config = { ...config, ...cambios };
  oyentes.forEach((f) => f());
};

export const suscribirConfigMock = (f: () => void) => {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
};
