/** Datos mínimos para las pruebas de dominio. No se usa en producción. */
import type { Activo, Categoria, OrdenMantenimiento, PlantillaInspeccion, Reserva } from '@/api/contrato';

export const retro: Categoria = {
  id: 'cat-retro',
  slug: 'retroexcavadora',
  nombre: 'Retroexcavadora',
  tipo: 'maquinaria',
  medidor: 'horas',
  unidadCapacidad: 't',
  bufferPreparacionMin: 480,
  usoDiarioEstimado: 6,
  tarifas: { dia: 35_000, semana: 210_000, mes: 720_000 },
  plantillaInspeccionId: 'plt-retro',
};

export const pickup: Categoria = {
  id: 'cat-pickup',
  slug: 'camioneta-pickup',
  nombre: 'Camioneta pickup',
  tipo: 'vehiculo',
  medidor: 'km',
  unidadCapacidad: 'kg',
  bufferPreparacionMin: 120,
  usoDiarioEstimado: 180,
  tarifas: { hora: 1_500, dia: 9_000, semana: 54_000, mes: 190_000 },
  plantillaInspeccionId: 'plt-vehiculo',
};

export const activo = (o: Partial<Activo> = {}): Activo => ({
  id: 'act-1',
  codigo: 'RET-001',
  categoriaId: retro.id,
  marca: 'Caterpillar',
  modelo: '420F2',
  anio: 2021,
  serial: 'CAT0420FXKXF01234',
  motor: 'diesel',
  capacidad: 8.6,
  lecturaActual: 1_180,
  estadoOperativo: 'operativo',
  sedeBaseId: 'sede-mcbo',
  documentos: [{ tipo: 'seguro', numero: 'POL-88213', venceEl: '2027-03-31' }],
  requiereOperador: true,
  ultimoServicio: { lectura: 1_000, fecha: '2026-09-15' },
  version: 1,
  ...o,
});

export const reserva = (o: Partial<Reserva> = {}): Reserva => ({
  id: 'res-1',
  codigo: 'R-2026-00001',
  clienteId: 'cli-1',
  categoriaId: retro.id,
  activoId: 'act-1',
  sedeRetiroId: 'sede-mcbo',
  sedeDevolucionId: 'sede-mcbo',
  inicio: '2026-11-03T13:00:00Z',
  fin: '2026-11-05T22:00:00Z',
  estado: 'confirmada',
  conOperador: true,
  montoEstimado: 105_000,
  advertenciasAceptadas: [],
  version: 1,
  ...o,
});

export const orden = (o: Partial<OrdenMantenimiento> = {}): OrdenMantenimiento => ({
  id: 'ord-1',
  activoId: 'act-1',
  tipo: 'preventivo',
  origen: 'plan',
  inicio: '2026-11-10T12:00:00Z',
  finEstimado: '2026-11-11T12:00:00Z',
  estado: 'programada',
  descripcion: 'Servicio 250 h',
  version: 1,
  ...o,
});

/** Fragmento de SPEC §9.2 */
export const plantillaRetro: PlantillaInspeccion = {
  id: 'plt-retro',
  nombre: 'Inspección retroexcavadora',
  version: 3,
  categoriaIds: [retro.id],
  secciones: [
    {
      id: 'hidraulico',
      titulo: 'Sistema hidráulico',
      campos: [
        { id: 'fuga', tipo: 'si_no', etiqueta: '¿Hay fugas de aceite hidráulico?', requerido: true, critico: true, falla: { op: 'eq', valor: true } },
        {
          id: 'fuga_ubicacion',
          tipo: 'opcion',
          etiqueta: 'Ubicación de la fuga',
          opciones: ['Brazo', 'Cucharón', 'Estabilizadores', 'Bomba'],
          requerido: true,
          visibleSi: { campo: 'fuga', op: 'eq', valor: true },
        },
        {
          id: 'fuga_fotos',
          tipo: 'foto',
          etiqueta: 'Fotos de la fuga',
          fotosMin: 2,
          requerido: true,
          visibleSi: { campo: 'fuga', op: 'eq', valor: true },
        },
        { id: 'nivel_aceite', tipo: 'nivel', etiqueta: 'Nivel de aceite hidráulico (%)', requerido: true, min: 0, max: 100, falla: { op: 'lt', valor: 25 } },
      ],
    },
  ],
};
