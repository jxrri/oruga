/**
 * Contrato de la API (SPEC §5, §9 y §11). Es la fuente de verdad que el backend debe respetar.
 * Reglas: instantes en UTC (ISO 8601 con Z), fechas civiles "YYYY-MM-DD", montos en centavos de USD
 * enteros (SPEC §14, decisión de moneda) y `version` en toda entidad editable (concurrencia optimista).
 */

// Identificadores y tiempo
export type ID = string;
/** ISO 8601 con Z: "2026-11-03T13:00:00Z" */
export type InstanteUTC = string;
/** "YYYY-MM-DD", sin hora ni zona (vencimientos) */
export type FechaCivil = string;
/** Nombre IANA: "America/Caracas" */
export type ZonaIANA = string;
/** Centavos de USD, siempre enteros */
export type Centavos = number;

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface Sede {
  id: ID;
  /** Nombre corto para chips y filtros: "mcbo" */
  clave: string;
  nombre: string;
  ciudad: string;
  zonaHoraria: ZonaIANA;
  coordenadas: Coordenadas;
  /** Hora de pared en la zona de la sede: "07:00", "18:00" */
  horario: { abre: string; cierra: string };
}

export type TipoActivo = 'vehiculo' | 'maquinaria';
export type TipoMotor = 'gasolina' | 'diesel' | 'electrico' | 'hibrido' | 'gas';
export type EstadoOperativo = 'operativo' | 'en_mantenimiento' | 'fuera_de_servicio' | 'baja';
export type UnidadCapacidad = 'pasajeros' | 'kg' | 't' | 'm3';
export type Medidor = 'km' | 'horas';

export interface Tarifas {
  hora?: Centavos;
  dia: Centavos;
  semana: Centavos;
  mes: Centavos;
}

export interface Categoria {
  id: ID;
  /** Identificador estable para imágenes y URLs: "retroexcavadora" */
  slug: string;
  nombre: string;
  tipo: TipoActivo;
  medidor: Medidor;
  unidadCapacidad: UnidadCapacidad;
  bufferPreparacionMin: number;
  /** km/día u horas/día */
  usoDiarioEstimado: number;
  tarifas: Tarifas;
  plantillaInspeccionId: ID;
}

export type TipoDocumento = 'seguro' | 'permiso' | 'certificacion';

export interface DocumentoActivo {
  tipo: TipoDocumento;
  numero: string;
  venceEl: FechaCivil;
}

export interface Activo {
  id: ID;
  /** "EXC-014" */
  codigo: string;
  categoriaId: ID;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
  serial: string;
  motor: TipoMotor;
  /** En la unidad de su categoría */
  capacidad: number;
  /** km u horas */
  lecturaActual: number;
  estadoOperativo: EstadoOperativo;
  sedeBaseId: ID;
  ubicacion?: Coordenadas & { registradaEn: InstanteUTC };
  documentos: DocumentoActivo[];
  requiereOperador: boolean;
  /** Último servicio preventivo cerrado (RF-MNT-04). Ampliación opcional del contrato. */
  ultimoServicio?: { lectura: number; fecha: FechaCivil };
  version: number;
}

/** Registro del cambio manual de estado operativo (RF-INV-05). */
export interface CambioEstadoActivo {
  activoId: ID;
  en: InstanteUTC;
  usuarioId: ID;
  antes: EstadoOperativo;
  despues: EstadoOperativo;
  motivo: string;
}

export type TipoCliente = 'persona' | 'empresa';

export interface Cliente {
  id: ID;
  tipo: TipoCliente;
  nombre: string;
  /** RIF (J-12345678-9) o cédula (V-12345678) */
  documento: string;
  telefono: string;
  email: string;
  estado: 'activo' | 'bloqueado';
  version: number;
}

export type EstadoReserva = 'borrador' | 'confirmada' | 'en_curso' | 'finalizada' | 'cancelada';

export type CodigoConflicto =
  | 'SOLAPE'
  | 'MANTENIMIENTO'
  | 'NO_OPERATIVO'
  | 'DOCUMENTO_VENCIDO'
  | 'CLIENTE_BLOQUEADO'
  | 'BUFFER'
  | 'MANT_PROYECTADO'
  | 'TRASLADO';

export type Severidad = 'bloqueante' | 'advertencia';

export interface Conflicto {
  codigo: CodigoConflicto;
  severidad: Severidad;
  /** Reserva u orden con la que choca, si aplica */
  con?: ID;
  /** Explicación lista para mostrar */
  mensaje: string;
}

export interface Reserva {
  id: ID;
  /** "R-2026-00123" */
  codigo: string;
  clienteId: ID;
  categoriaId: ID;
  /** null = por asignar */
  activoId: ID | null;
  sedeRetiroId: ID;
  sedeDevolucionId: ID;
  inicio: InstanteUTC;
  /** Intervalo [inicio, fin) */
  fin: InstanteUTC;
  estado: EstadoReserva;
  conOperador: boolean;
  montoEstimado: Centavos;
  advertenciasAceptadas: CodigoConflicto[];
  inspeccionSalidaId?: ID;
  inspeccionDevolucionId?: ID;
  version: number;
}

export interface CambioReserva {
  reservaId: ID;
  en: InstanteUTC;
  usuarioId: ID;
  campo: keyof Reserva;
  antes: unknown;
  despues: unknown;
}

export interface PlanMantenimiento {
  id: ID;
  categoriaId: ID;
  /** "Servicio 250 h" */
  nombre: string;
  /** Lo que ocurra primero */
  cadaLectura?: number;
  cadaDias?: number;
  /** Antelación del aviso: en unidades del medidor para cadaLectura y en días para cadaDias */
  avisoAntes: number;
}

export type TipoOrden = 'preventivo' | 'correctivo';
export type EstadoOrden = 'programada' | 'en_proceso' | 'completada' | 'cancelada';

export interface OrdenMantenimiento {
  id: ID;
  activoId: ID;
  tipo: TipoOrden;
  origen: 'plan' | 'inspeccion' | 'manual';
  planId?: ID;
  inicio: InstanteUTC;
  finEstimado: InstanteUTC;
  estado: EstadoOrden;
  descripcion: string;
  version: number;
}

export type Rol = 'admin' | 'planificador' | 'inspector' | 'mantenimiento' | 'gerente';

export interface Usuario {
  id: ID;
  nombre: string;
  sedeId: ID;
  rol: Rol;
  /** Identifica la cuenta al entrar; siempre en minúsculas */
  correo: string;
  /** Cuenta de demostración sembrada (clave pública) */
  demo?: boolean;
}

export type TipoEvento = 'reserva.actualizada' | 'activo.estado' | 'activo.posicion' | 'orden.actualizada';

export type EventoTiempoReal =
  | { tipo: 'reserva.actualizada'; en: InstanteUTC; datos: Reserva }
  | { tipo: 'activo.estado'; en: InstanteUTC; datos: Pick<Activo, 'id' | 'estadoOperativo' | 'version'> }
  | {
      tipo: 'activo.posicion';
      en: InstanteUTC;
      datos: Pick<Activo, 'id'> & { ubicacion: NonNullable<Activo['ubicacion']> };
    }
  | { tipo: 'orden.actualizada'; en: InstanteUTC; datos: OrdenMantenimiento };

export interface TasaCambio {
  /** Bolívares por 1 USD */
  valor: number;
  fecha: FechaCivil;
  fuente: string;
}

// Inspección (SPEC §9)
export type Operador = 'eq' | 'neq' | 'in' | 'lt' | 'gt';
export type Comparacion = { op: Operador; valor: unknown };
export type Condicion = ({ campo: string } & Comparacion) | { todas: Condicion[] } | { alguna: Condicion[] };

export type TipoCampo = 'si_no' | 'opcion' | 'multi' | 'numero' | 'texto' | 'nivel' | 'foto' | 'firma';

export interface CampoPlantilla {
  id: string;
  tipo: TipoCampo;
  etiqueta: string;
  requerido: boolean;
  /** Si falla, el resultado es no apto */
  critico?: boolean;
  /** Qué respuesta cuenta como falla */
  falla?: Comparacion;
  opciones?: string[];
  min?: number;
  max?: number;
  fotosMin?: number;
  visibleSi?: Condicion;
  ayuda?: string;
}

export interface SeccionPlantilla {
  id: string;
  titulo: string;
  campos: CampoPlantilla[];
}

export interface PlantillaInspeccion {
  id: ID;
  nombre: string;
  version: number;
  categoriaIds: ID[];
  secciones: SeccionPlantilla[];
}

export type EstadoEvidencia = 'pendiente' | 'subiendo' | 'lista' | 'error';

export interface Evidencia {
  id: ID;
  campoId: string;
  nombre: string;
  mime: string;
  bytes: number;
  url: string;
  estado: EstadoEvidencia;
  progreso: number;
}

export type MomentoInspeccion = 'salida' | 'devolucion' | 'rutina';
export type ResultadoInspeccion = 'apto' | 'apto_con_observaciones' | 'no_apto';

export interface Inspeccion {
  id: ID;
  plantillaId: ID;
  plantillaVersion: number;
  activoId: ID;
  reservaId?: ID;
  momento: MomentoInspeccion;
  inspectorId: ID;
  realizadaEn: InstanteUTC;
  lectura: number;
  combustiblePct?: number;
  respuestas: Record<string, unknown>;
  evidencias: Evidencia[];
  observaciones?: string;
  resultado: ResultadoInspeccion;
}

// Cuerpos de petición y respuestas (SPEC §11.2)
export interface FiltrosActivosQuery {
  q?: string;
  tipo?: TipoActivo;
  categoriaId?: ID[];
  motor?: TipoMotor[];
  capacidadMin?: number;
  capacidadMax?: number;
  sedeId?: ID[];
  requiereOperador?: boolean;
}

export type ActivoNuevo = Omit<Activo, 'id' | 'version' | 'ubicacion' | 'ultimoServicio'>;
export type ActivoEdicion = ActivoNuevo & { version: number };

export interface CambioEstadoBody {
  estadoOperativo: EstadoOperativo;
  motivo: string;
  version: number;
}

export interface ActivoDetalle {
  activo: Activo;
  historialEstado: CambioEstadoActivo[];
  reservas: Reserva[];
  inspecciones: Inspeccion[];
  ordenes: OrdenMantenimiento[];
}

export interface DisponibilidadQuery {
  desde: InstanteUTC;
  hasta: InstanteUTC;
  categoriaId?: ID;
  sedeId?: ID;
}

export interface ActivoDisponible {
  activo: Activo;
  /** Monto estimado para el rango consultado */
  montoEstimado: Centavos;
}

export interface ReservasQuery {
  desde: InstanteUTC;
  hasta: InstanteUTC;
  activoIds?: ID[];
}

export interface ReservaNueva {
  clienteId: ID;
  categoriaId: ID;
  activoId: ID | null;
  sedeRetiroId: ID;
  sedeDevolucionId: ID;
  inicio: InstanteUTC;
  fin: InstanteUTC;
  conOperador: boolean;
  advertenciasAceptadas: CodigoConflicto[];
}

export interface ReservaCambios {
  activoId?: ID | null;
  inicio?: InstanteUTC;
  fin?: InstanteUTC;
  advertenciasAceptadas?: CodigoConflicto[];
  version: number;
}

export interface ValidarReservaBody extends ReservaNueva {
  /** Presente al validar una edición: se excluye a sí misma del solape */
  id?: ID;
}

export interface ValidacionReserva {
  conflictos: Conflicto[];
  montoEstimado: Centavos;
}

export type AccionTransicion = 'confirmar' | 'entregar' | 'devolver' | 'cancelar';

export interface TransicionBody {
  accion: AccionTransicion;
  version: number;
  motivo?: string;
}

export interface OrdenesQuery {
  desde?: InstanteUTC;
  hasta?: InstanteUTC;
  activoId?: ID;
}

export type OrdenNueva = Omit<OrdenMantenimiento, 'id' | 'version' | 'estado'> & { estado?: EstadoOrden };

export interface OrdenCambios {
  estado?: EstadoOrden;
  inicio?: InstanteUTC;
  finEstimado?: InstanteUTC;
  /** Al completar un preventivo: lectura con la que se cierra (RF-MNT-04) */
  lecturaCierre?: number;
  version: number;
}

export type InspeccionNueva = Omit<Inspeccion, 'id' | 'resultado' | 'realizadaEn'>;

/** Respuesta de POST /api/inspecciones: la inspección y sus efectos sobre activo y reservas */
export interface InspeccionRegistrada {
  inspeccion: Inspeccion;
  activo: Activo;
  ordenCreada?: OrdenMantenimiento;
  reservasAfectadas: Reserva[];
}

export type ClienteNuevo = Omit<Cliente, 'id' | 'version' | 'estado'>;

export interface ClienteDetalle {
  cliente: Cliente;
  reservas: Reserva[];
}

export interface LoginBody {
  correo: string;
  clave: string;
}

export interface RegistroBody {
  nombre: string;
  correo: string;
  clave: string;
  rol: Rol;
  sedeId: ID;
}

export interface Sesion {
  usuario: Usuario;
  token: string;
}

// Errores (SPEC §11.3)
export interface ErrorConflicto {
  codigo: 'CONFLICTO';
  mensaje: string;
  conflictos: { codigo: CodigoConflicto; con?: string }[];
}

export interface ErrorVersion {
  codigo: 'VERSION';
  actual: number;
  mensaje?: string;
}

/** Formato por defecto de FastAPI (SPEC §11.3); se conserva aunque el backend sea Node.js. */
export interface ErrorValidacion {
  detail: { loc: (string | number)[]; msg: string; type: string }[];
}

export interface ErrorPermiso {
  codigo: 'PERMISO';
  mensaje: string;
}

export type ErrorApi = ErrorConflicto | ErrorVersion | ErrorValidacion | ErrorPermiso;
