/** Identificadores estables de los escenarios sembrados (SPEC §1 demo, §11.1). Otros módulos y pruebas dependen de ellos. */
export const ESCENARIOS = {
  /** Retroexcavadora de Maracaibo para la demo: salida hoy y dos reservas futuras confirmadas */
  activoDemo: 'act-ret-001',
  reservaSalidaHoy: 'res-demo-salida',
  reservasFuturas: ['res-demo-futura-1', 'res-demo-futura-2'],
  /** Retroexcavadora libre en Maracaibo para reasignar */
  activoAlternativo: 'act-ret-002',
  /** Tres conflictos abiertos */
  activoSolape1: 'act-exc-002',
  activoSolape2: 'act-pic-004',
  activoConflictoMantenimiento: 'act-gru-002',
  /** Seguro que vence en 7 días */
  activoSeguroPorVencer: 'act-vol-003',
  /** Preventivo vencido por lectura */
  activoMantenimientoVencido: 'act-car-002',
  /** Reserva Maracaibo -> Cúcuta */
  activoTraslado: 'act-pic-002',
  reservaTraslado: 'res-demo-traslado',
  reservasPorAsignar: ['res-sin-asignar-1', 'res-sin-asignar-2', 'res-sin-asignar-3'],
} as const;
