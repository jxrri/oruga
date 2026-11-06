/**
 * Datos simulados deterministas (SPEC §11.1): Faker con semilla fija y todo relativo al reloj de demo.
 * Mismo `hoy` y misma semilla producen exactamente los mismos datos.
 */
import { fakerES as faker } from '@faker-js/faker';
import type {
  Activo,
  CambioEstadoActivo,
  CambioReserva,
  Categoria,
  Cliente,
  Coordenadas,
  Evidencia,
  EstadoOperativo,
  ID,
  Inspeccion,
  InstanteUTC,
  OrdenMantenimiento,
  PlanMantenimiento,
  PlantillaInspeccion,
  Reserva,
  Sede,
  TasaCambio,
  TipoMotor,
  Usuario,
  ZonaIANA,
} from '@/api/contrato';
import { cotizar } from '@/domain/tarifas';
import { ampliar, seSolapan } from '@/domain/intervalos';
import { aMs, ahora, desdeHoraLocal, desdeMs, fechaCivilDe, MS_24H, MS_MINUTO, sumarDiasCivil, sumarMs } from '@/shared/lib/fechas';
import { calcularResultado, camposVisibles, falla, limpiarOcultos, todosLosCampos } from '@/domain/inspeccion';
import { escenas, srcEscena } from '@/shared/lib/imagenes';
import { ESCENARIOS } from './escenarios';
import retro from './plantillas/plt-retro.json';
import maquinaria from './plantillas/plt-maquinaria.json';
import vehiculo from './plantillas/plt-vehiculo.json';

export interface Semilla {
  hoy: InstanteUTC;
  sedes: Sede[];
  categorias: Categoria[];
  usuarios: Usuario[];
  activos: Activo[];
  clientes: Cliente[];
  reservas: Reserva[];
  ordenes: OrdenMantenimiento[];
  planes: PlanMantenimiento[];
  /** Todas las versiones de cada plantilla (SPEC §9.5) */
  plantillas: PlantillaInspeccion[];
  inspecciones: Inspeccion[];
  historialReservas: CambioReserva[];
  historialEstados: CambioEstadoActivo[];
  /** Obra donde trabaja cada activo en alquiler: centro del paseo aleatorio de posiciones */
  obras: Record<ID, Coordenadas>;
  tasa: TasaCambio;
}

export const SEMILLA = 2026;

const horario = { abre: '07:00', cierra: '18:00' };
const SEDES: Sede[] = [
  { id: 'sede-mcbo', clave: 'mcbo', nombre: 'Maracaibo - Zona Industrial', ciudad: 'Maracaibo', zonaHoraria: 'America/Caracas', coordenadas: { lat: 10.5935, lng: -71.6582 }, horario },
  { id: 'sede-ccs', clave: 'ccs', nombre: 'Caracas - La Yaguara', ciudad: 'Caracas', zonaHoraria: 'America/Caracas', coordenadas: { lat: 10.4795, lng: -66.952 }, horario },
  { id: 'sede-val', clave: 'val', nombre: 'Valencia - Castillito', ciudad: 'Valencia', zonaHoraria: 'America/Caracas', coordenadas: { lat: 10.2058, lng: -67.9603 }, horario },
  { id: 'sede-cuc', clave: 'cuc', nombre: 'Cúcuta - Zona Franca', ciudad: 'Cúcuta', zonaHoraria: 'America/Bogota', coordenadas: { lat: 7.9367, lng: -72.518 }, horario },
];

const USUARIOS: Usuario[] = [
  { id: 'usr-admin', nombre: 'Mariana Urdaneta', sedeId: 'sede-mcbo', rol: 'admin' },
  { id: 'usr-plan', nombre: 'Luis Alberto Ferrer', sedeId: 'sede-mcbo', rol: 'planificador' },
  { id: 'usr-insp', nombre: 'José Gregorio Morillo', sedeId: 'sede-mcbo', rol: 'inspector' },
  { id: 'usr-mant', nombre: 'Carlos Briceño', sedeId: 'sede-mcbo', rol: 'mantenimiento' },
  { id: 'usr-ger', nombre: 'Andreína Colmenares', sedeId: 'sede-ccs', rol: 'gerente' },
];

interface DefCategoria {
  slug: string;
  nombre: string;
  prefijo: string;
  vehiculo: boolean;
  cantidad: number;
  unidad: Categoria['unidadCapacidad'];
  capacidad: [number, number];
  uso: number;
  tarifas: Categoria['tarifas'];
  modelos: [string, string][];
  motores: TipoMotor[];
  lectura: [number, number];
  operador: number;
}

// prettier-ignore
const DEFS: DefCategoria[] = [
  { slug: 'excavadora', nombre: 'Excavadora', prefijo: 'EXC', vehiculo: false, cantidad: 12, unidad: 't', capacidad: [20, 36], uso: 7, tarifas: { dia: 48_000, semana: 288_000, mes: 1_050_000 }, modelos: [['Caterpillar', '320'], ['Caterpillar', '336'], ['Komatsu', 'PC200-8'], ['Komatsu', 'PC210LC-11'], ['Volvo', 'EC220E'], ['Hyundai', 'HX220']], motores: ['diesel'], lectura: [1200, 9000], operador: 0.6 },
  { slug: 'retroexcavadora', nombre: 'Retroexcavadora', prefijo: 'RET', vehiculo: false, cantidad: 12, unidad: 't', capacidad: [7, 9], uso: 6, tarifas: { dia: 32_000, semana: 192_000, mes: 690_000 }, modelos: [['Caterpillar', '420F2'], ['Caterpillar', '416F2'], ['John Deere', '310L'], ['JCB', '3CX'], ['Case', '580N'], ['New Holland', 'B95B']], motores: ['diesel'], lectura: [800, 7000], operador: 0.3 },
  { slug: 'cargador-frontal', nombre: 'Cargador frontal', prefijo: 'CAR', vehiculo: false, cantidad: 8, unidad: 'm3', capacidad: [2.5, 4.2], uso: 7, tarifas: { dia: 42_000, semana: 252_000, mes: 900_000 }, modelos: [['Caterpillar', '950GC'], ['Komatsu', 'WA320-8'], ['Volvo', 'L90H'], ['John Deere', '644L']], motores: ['diesel'], lectura: [1500, 8000], operador: 0.4 },
  { slug: 'grua-movil', nombre: 'Grúa móvil', prefijo: 'GRU', vehiculo: false, cantidad: 6, unidad: 't', capacidad: [40, 55], uso: 5, tarifas: { dia: 95_000, semana: 570_000, mes: 2_050_000 }, modelos: [['Grove', 'RT540E'], ['Terex', 'RT555'], ['Liebherr', 'LTM 1050-3.1'], ['Tadano', 'GR-500EX']], motores: ['diesel'], lectura: [2000, 9000], operador: 1 },
  { slug: 'montacargas', nombre: 'Montacargas', prefijo: 'MON', vehiculo: false, cantidad: 10, unidad: 'kg', capacidad: [2500, 5000], uso: 8, tarifas: { dia: 12_000, semana: 72_000, mes: 250_000 }, modelos: [['Toyota', '8FGU25'], ['Hyster', 'H50FT'], ['Caterpillar', 'GP25N'], ['Yale', 'GLP050']], motores: ['gas', 'electrico', 'diesel'], lectura: [600, 9000], operador: 0 },
  { slug: 'minicargador', nombre: 'Minicargador', prefijo: 'MIN', vehiculo: false, cantidad: 8, unidad: 'kg', capacidad: [900, 1200], uso: 6, tarifas: { dia: 18_000, semana: 108_000, mes: 380_000 }, modelos: [['Bobcat', 'S650'], ['Caterpillar', '262D3'], ['John Deere', '320G'], ['Case', 'SR210']], motores: ['diesel'], lectura: [600, 5000], operador: 0.2 },
  { slug: 'motoniveladora', nombre: 'Motoniveladora', prefijo: 'MOT', vehiculo: false, cantidad: 5, unidad: 't', capacidad: [15, 20], uso: 7, tarifas: { dia: 55_000, semana: 330_000, mes: 1_180_000 }, modelos: [['Caterpillar', '140K'], ['John Deere', '670G'], ['Komatsu', 'GD655-6']], motores: ['diesel'], lectura: [2000, 9000], operador: 1 },
  { slug: 'compactador', nombre: 'Compactador', prefijo: 'COM', vehiculo: false, cantidad: 7, unidad: 't', capacidad: [10, 12], uso: 6, tarifas: { dia: 26_000, semana: 156_000, mes: 560_000 }, modelos: [['Caterpillar', 'CS56B'], ['Dynapac', 'CA2500'], ['Bomag', 'BW211D-5'], ['Hamm', '3411']], motores: ['diesel'], lectura: [900, 7000], operador: 0.5 },
];
// prettier-ignore
DEFS.push(
  { slug: 'camion-volteo', nombre: 'Camión volteo', prefijo: 'VOL', vehiculo: true, cantidad: 12, unidad: 'm3', capacidad: [10, 16], uso: 160, tarifas: { hora: 6_500, dia: 38_000, semana: 228_000, mes: 820_000 }, modelos: [['Mack', 'Granite GU813'], ['Iveco', 'Trakker 380'], ['International', 'HV607'], ['Freightliner', 'M2 106']], motores: ['diesel'], lectura: [40_000, 260_000], operador: 0.5 },
  { slug: 'camioneta-pickup', nombre: 'Camioneta pickup', prefijo: 'PIC', vehiculo: true, cantidad: 20, unidad: 'kg', capacidad: [800, 1500], uso: 180, tarifas: { hora: 1_500, dia: 9_000, semana: 54_000, mes: 190_000 }, modelos: [['Toyota', 'Hilux'], ['Ford', 'F-350'], ['Chevrolet', 'Silverado'], ['Toyota', 'Land Cruiser 79'], ['Mitsubishi', 'L200']], motores: ['gasolina', 'diesel'], lectura: [8_000, 160_000], operador: 0 },
  { slug: 'furgon-carga', nombre: 'Furgón de carga', prefijo: 'FUR', vehiculo: true, cantidad: 12, unidad: 'kg', capacidad: [1500, 4500], uso: 150, tarifas: { hora: 2_200, dia: 13_000, semana: 78_000, mes: 280_000 }, modelos: [['Ford', 'Transit'], ['Iveco', 'Daily'], ['Chevrolet', 'NPR'], ['Hyundai', 'HD78']], motores: ['diesel', 'gasolina'], lectura: [20_000, 180_000], operador: 0 },
  { slug: 'minibus', nombre: 'Minibús', prefijo: 'BUS', vehiculo: true, cantidad: 8, unidad: 'pasajeros', capacidad: [15, 30], uso: 220, tarifas: { hora: 3_000, dia: 18_000, semana: 108_000, mes: 390_000 }, modelos: [['Toyota', 'Hiace'], ['Toyota', 'Coaster'], ['Mercedes-Benz', 'Sprinter 516'], ['Encava', 'ENT-610']], motores: ['diesel', 'gas'], lectura: [30_000, 220_000], operador: 0.5 },
);

const plantillaDe = (d: DefCategoria) => (d.slug === 'retroexcavadora' ? 'plt-retro' : d.vehiculo ? 'plt-vehiculo' : 'plt-maquinaria');

const categoriaDe = (d: DefCategoria): Categoria => ({
  id: `cat-${d.slug}`,
  slug: d.slug,
  nombre: d.nombre,
  tipo: d.vehiculo ? 'vehiculo' : 'maquinaria',
  medidor: d.vehiculo ? 'km' : 'horas',
  unidadCapacidad: d.unidad,
  bufferPreparacionMin: d.vehiculo ? 120 : 480,
  usoDiarioEstimado: d.uso,
  tarifas: d.tarifas,
  plantillaInspeccionId: plantillaDe(d),
});

const planesDe = (d: DefCategoria): PlanMantenimiento[] => [
  d.vehiculo
    ? { id: `plan-${d.slug}-km`, categoriaId: `cat-${d.slug}`, nombre: 'Servicio 10.000 km', cadaLectura: 10_000, avisoAntes: 800 }
    : { id: `plan-${d.slug}-horas`, categoriaId: `cat-${d.slug}`, nombre: 'Servicio 250 h', cadaLectura: 250, avisoAntes: 25 },
  { id: `plan-${d.slug}-semestral`, categoriaId: `cat-${d.slug}`, nombre: 'Revisión semestral', cadaDias: 180, avisoAntes: 15 },
];

// Utilidades sobre la instancia de Faker sembrada
const entero = (min: number, max: number) => faker.number.int({ min, max });
const elegir = <T>(xs: readonly T[]): T => faker.helpers.arrayElement(xs);
const azar = () => faker.number.float({ min: 0, max: 1 });
const LETRAS = 'ABCDEFGHJKLMNPRSTUVWXYZ'.split('');
const letras = (n: number) => Array.from({ length: n }, () => elegir(LETRAS)).join('');
const digitos = (n: number) => faker.string.numeric({ length: n, allowLeadingZeros: false });
const pad = (n: number, largo: number) => String(n).padStart(largo, '0');
const sinAcentos = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const cerca = (c: Coordenadas, d: number): Coordenadas => ({
  lat: +(c.lat + faker.number.float({ min: -d, max: d })).toFixed(5),
  lng: +(c.lng + faker.number.float({ min: -d, max: d })).toFixed(5),
});

/** Instante a la hora de pared `h:m` del día `n` (relativo a hoy) en la zona dada. */
const instante = (zona: ZonaIANA, civilHoy: string, n: number, h: number, m = 0): InstanteUTC => {
  const [a, mes, d] = sumarDiasCivil(civilHoy, n).split('-').map(Number) as [number, number, number];
  return desdeHoraLocal(a, mes, d, h, m, zona);
};

const NO_OPERATIVOS: Record<ID, EstadoOperativo> = {
  'act-exc-011': 'baja',
  'act-fur-012': 'baja',
  'act-mot-004': 'fuera_de_servicio',
  'act-pic-019': 'fuera_de_servicio',
  'act-com-006': 'en_mantenimiento',
  'act-vol-010': 'en_mantenimiento',
};
const MOTIVOS: Record<EstadoOperativo, string> = {
  baja: 'Daño estructural irreparable, se retira de la flota.',
  fuera_de_servicio: 'Falla en el sistema de frenos reportada por el operador.',
  en_mantenimiento: 'Ingresa al taller por servicio preventivo.',
  operativo: 'Vuelve a operación.',
};
const EN_MCBO = new Set<ID>([ESCENARIOS.activoDemo, ESCENARIOS.activoAlternativo, ESCENARIOS.activoTraslado]);
const SEDES_PESO = ['sede-mcbo', 'sede-mcbo', 'sede-mcbo', 'sede-ccs', 'sede-ccs', 'sede-ccs', 'sede-val', 'sede-val', 'sede-cuc', 'sede-cuc'];

function generarActivos(civil: string): Activo[] {
  const out: Activo[] = [];
  for (const d of DEFS) {
    const cada = d.vehiculo ? 10_000 : 250;
    for (let i = 1; i <= d.cantidad; i++) {
      const codigo = `${d.prefijo}-${pad(i, 3)}`;
      const id = `act-${codigo.toLowerCase()}`;
      const [marca, modelo] = elegir(d.modelos);
      const sedeBaseId = EN_MCBO.has(id) ? 'sede-mcbo' : elegir(SEDES_PESO);
      const lecturaActual = entero(d.lectura[0], d.lectura[1]);
      const entera = d.unidad === 'pasajeros' || d.unidad === 'kg';
      const capacidad = entera
        ? Math.round(entero(d.capacidad[0], d.capacidad[1]) / (d.unidad === 'kg' ? 100 : 1)) * (d.unidad === 'kg' ? 100 : 1)
        : faker.number.float({ min: d.capacidad[0], max: d.capacidad[1], fractionDigits: 1 });
      const documentos: Activo['documentos'] = [{ tipo: 'seguro', numero: `POL-${digitos(8)}`, venceEl: sumarDiasCivil(civil, entero(90, 400)) }];
      if (d.vehiculo) documentos.push({ tipo: 'permiso', numero: `PC-${digitos(7)}`, venceEl: sumarDiasCivil(civil, entero(90, 400)) });
      if (d.slug === 'grua-movil') documentos.push({ tipo: 'certificacion', numero: `IZ-${digitos(6)}`, venceEl: sumarDiasCivil(civil, entero(90, 400)) });
      out.push({
        id,
        codigo,
        categoriaId: `cat-${d.slug}`,
        marca,
        modelo,
        anio: entero(2012, 2025),
        ...(d.vehiculo || d.slug === 'grua-movil'
          ? { placa: sedeBaseId === 'sede-cuc' ? `${letras(3)}${digitos(3)}` : `${letras(2)}${digitos(3)}${letras(2)}` }
          : {}),
        serial: d.vehiculo
          ? faker.vehicle.vin()
          : `${sinAcentos(marca).slice(0, 3).toUpperCase()}${modelo.replace(/[^a-z0-9]/gi, '').toUpperCase()}${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`,
        motor: elegir(d.motores),
        capacidad,
        lecturaActual,
        estadoOperativo: NO_OPERATIVOS[id] ?? 'operativo',
        sedeBaseId,
        documentos,
        requiereOperador: d.operador >= 1 || azar() < d.operador,
        ultimoServicio: { lectura: lecturaActual - entero(0, Math.floor(cada * 0.6)), fecha: sumarDiasCivil(civil, -entero(20, 150)) },
        version: 1,
      });
    }
  }
  const porId = new Map(out.map((a) => [a.id, a]));
  const demo = porId.get(ESCENARIOS.activoDemo)!;
  Object.assign(demo, { marca: 'Caterpillar', modelo: '420F2', ultimoServicio: { lectura: demo.lecturaActual - 10, fecha: sumarDiasCivil(civil, -12) } });
  porId.get(ESCENARIOS.activoSeguroPorVencer)!.documentos[0]!.venceEl = sumarDiasCivil(civil, 7);
  const vencido = porId.get(ESCENARIOS.activoMantenimientoVencido)!;
  vencido.ultimoServicio = { lectura: vencido.lecturaActual - 250 - 40, fecha: sumarDiasCivil(civil, -95) };
  return out;
}

const PREFIJOS = ['Constructora', 'Inversiones', 'Servicios Petroleros', 'Transporte', 'Agropecuaria', 'Ingeniería y Obras', 'Distribuidora', 'Proyectos Civiles', 'Montajes Industriales', 'Logística'];
const NUCLEOS = ['del Lago', 'Zuliana', 'Andina', 'Caribe', 'Los Llanos', 'Guayana', 'Tachirense', 'Carabobo', 'El Ávila', 'Catatumbo', 'Orinoco', 'Falcón', 'Paraguaná', 'Lara', 'Coquivacoa', 'Tamanaco', 'Guaicaipuro', 'Mara'];
const BLOQUEADOS = new Set(['cli-007', 'cli-050']);

function generarClientes(): Cliente[] {
  const nombres = new Set<string>();
  const out: Cliente[] = [];
  for (let i = 1; i <= 60; i++) {
    const id = `cli-${pad(i, 3)}`;
    const empresa = i <= 42;
    let nombre = '';
    let email = '';
    if (empresa) {
      do nombre = `${elegir(PREFIJOS)} ${azar() < 0.7 ? elegir(NUCLEOS) : faker.person.lastName()} C.A.`;
      while (nombres.has(nombre));
      email = `operaciones@${sinAcentos(nombre.replace(' C.A.', '')).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 22)}.com.ve`;
    } else {
      const n = faker.person.firstName();
      const a = faker.person.lastName();
      nombre = `${n} ${a}`;
      email = `${sinAcentos(`${n}.${a}`).toLowerCase().replace(/[^a-z.]+/g, '')}${entero(1, 99)}@gmail.com`;
    }
    nombres.add(nombre);
    out.push({
      id,
      tipo: empresa ? 'empresa' : 'persona',
      nombre,
      documento: empresa ? `J-${digitos(8)}-${entero(0, 9)}` : `V-${digitos(entero(7, 8))}`,
      telefono: `+58 ${elegir(['412', '414', '424', '416', '426'])}-${digitos(3)}-${digitos(4)}`,
      email,
      estado: BLOQUEADOS.has(id) ? 'bloqueado' : 'activo',
      version: 1,
    });
  }
  return out;
}

type Borrador = Omit<Reserva, 'codigo' | 'montoEstimado'> & { codigo?: string };

/** Reservas sin solape ni invasión del tiempo de preparación: bloques por días con huecos aleatorios. */
function paseo(d: DefCategoria, zona: ZonaIANA, civil: string, corteMs = Number.POSITIVE_INFINITY) {
  const out: { inicio: InstanteUTC; fin: InstanteUTC }[] = [];
  let dia = -30 + entero(0, 8) - (d.vehiculo ? 0 : entero(0, 6));
  while (dia < 60) {
    let inicio: InstanteUTC;
    let fin: InstanteUTC;
    let diaFin = dia;
    if (d.vehiculo && azar() < 0.25) {
      const h = entero(7, 10);
      inicio = instante(zona, civil, dia, h);
      fin = instante(zona, civil, dia, h + entero(4, 8));
    } else {
      diaFin = dia + (d.vehiculo ? entero(1, 6) : entero(3, 14));
      inicio = instante(zona, civil, dia, entero(7, 9));
      fin = instante(zona, civil, diaFin, entero(15, 17));
    }
    if (aMs(fin) > corteMs) break;
    out.push({ inicio, fin });
    dia = diaFin + 1 + (d.vehiculo ? entero(9, 30) : entero(7, 30));
  }
  return out;
}

function estadoPorTiempo(inicio: InstanteUTC, fin: InstanteUTC, ahoraMs: number): Reserva['estado'] {
  if (aMs(fin) <= ahoraMs) return azar() < 0.08 ? 'cancelada' : 'finalizada';
  if (aMs(inicio) <= ahoraMs) return 'en_curso';
  const r = azar();
  if (r < 0.04) return 'cancelada';
  return (aMs(inicio) - ahoraMs) / MS_24H > 7 && r < 0.25 ? 'borrador' : 'confirmada';
}

const ESPECIALES = new Set<ID>([
  ESCENARIOS.activoDemo,
  ESCENARIOS.activoAlternativo,
  ESCENARIOS.activoSolape1,
  ESCENARIOS.activoSolape2,
  ESCENARIOS.activoConflictoMantenimiento,
  ESCENARIOS.activoTraslado,
  ...Object.keys(NO_OPERATIVOS),
]);

const DESCRIPCION_PREVENTIVO = ['Cambio de aceite y filtros', 'Revisión de sistema hidráulico y engrase', 'Cambio de filtros de aire y combustible'];
const DESCRIPCION_CORRECTIVO = ['Reparación del sistema de frenos', 'Cambio de bomba hidráulica', 'Reparación de fuga en cilindro del brazo'];

export function generarSemilla(hoy: InstanteUTC = ahora()): Semilla {
  faker.seed(SEMILLA);
  const ahoraMs = aMs(hoy);
  const zonaDe = new Map(SEDES.map((s) => [s.id, s.zonaHoraria]));
  const sedePorId = new Map(SEDES.map((s) => [s.id, s]));
  const civilDe = (sedeId: ID) => fechaCivilDe(hoy, zonaDe.get(sedeId)!);
  const categorias = DEFS.map(categoriaDe);
  const defPorCat = new Map(DEFS.map((d) => [`cat-${d.slug}`, d]));
  const planes = DEFS.flatMap(planesDe);
  const activos = generarActivos(civilDe('sede-mcbo'));
  const porId = new Map(activos.map((a) => [a.id, a]));
  const clientes = generarClientes();
  const activosCli = clientes.filter((c) => c.estado === 'activo');
  const borradores: Borrador[] = [];
  const ordenes: OrdenMantenimiento[] = [];

  const agregar = (a: Activo | null, b: { inicio: InstanteUTC; fin: InstanteUTC }, extra: Partial<Borrador> = {}) => {
    const estado = extra.estado ?? estadoPorTiempo(b.inicio, b.fin, ahoraMs);
    const futura = aMs(b.fin) > ahoraMs;
    const def = defPorCat.get(extra.categoriaId ?? a!.categoriaId)!;
    borradores.push({
      id: '',
      clienteId: (futura ? elegir(activosCli) : elegir(clientes)).id,
      categoriaId: a?.categoriaId ?? extra.categoriaId!,
      activoId: a?.id ?? null,
      sedeRetiroId: a?.sedeBaseId ?? extra.sedeRetiroId!,
      sedeDevolucionId: a?.sedeBaseId ?? extra.sedeRetiroId!,
      conOperador: (a?.requiereOperador ?? false) || (!def.vehiculo && azar() < 0.3),
      advertenciasAceptadas: [],
      version: 1,
      ...b,
      ...extra,
      estado,
    });
  };

  for (const a of activos) {
    const zona = zonaDe.get(a.sedeBaseId)!;
    const corte = NO_OPERATIVOS[a.id] ? ahoraMs - 3 * MS_24H : ESPECIALES.has(a.id) ? ahoraMs : undefined;
    if (a.id === ESCENARIOS.activoDemo) continue;
    for (const b of paseo(defPorCat.get(a.categoriaId)!, zona, civilDe(a.sedeBaseId), corte)) agregar(a, b);
  }

  // Escenarios sembrados a propósito
  const enSede = (a: Activo, n: number, h: number) => instante(zonaDe.get(a.sedeBaseId)!, civilDe(a.sedeBaseId), n, h);
  const tramo = (a: Activo, d0: number, d1: number, h0 = 8, h1 = 17) => ({ inicio: enSede(a, d0, h0), fin: enSede(a, d1, h1) });
  const demo = porId.get(ESCENARIOS.activoDemo)!;
  const cliDemo = activosCli[2]!.id;
  agregar(demo, tramo(demo, -20, -14), { estado: 'finalizada', clienteId: activosCli[5]!.id });
  agregar(demo, tramo(demo, 0, 3, 10), { id: ESCENARIOS.reservaSalidaHoy, estado: 'confirmada', clienteId: cliDemo });
  agregar(demo, tramo(demo, 8, 12), { id: ESCENARIOS.reservasFuturas[0], estado: 'confirmada', clienteId: activosCli[8]!.id });
  agregar(demo, tramo(demo, 18, 25), { id: ESCENARIOS.reservasFuturas[1], estado: 'confirmada', clienteId: activosCli[11]!.id });
  const exc = porId.get(ESCENARIOS.activoSolape1)!;
  agregar(exc, tramo(exc, 5, 9), { estado: 'confirmada' });
  agregar(exc, tramo(exc, 8, 11), { estado: 'confirmada' });
  const pic = porId.get(ESCENARIOS.activoSolape2)!;
  agregar(pic, tramo(pic, 3, 5, 8, 18), { estado: 'borrador' });
  agregar(pic, tramo(pic, 4, 6), { estado: 'confirmada' });
  const gru = porId.get(ESCENARIOS.activoConflictoMantenimiento)!;
  agregar(gru, tramo(gru, 9, 13), { estado: 'confirmada' });
  ordenes.push({ id: '', activoId: gru.id, tipo: 'preventivo', origen: 'plan', planId: `plan-grua-movil-horas`, ...{ inicio: enSede(gru, 10, 7), finEstimado: enSede(gru, 11, 17) }, estado: 'programada', descripcion: 'Servicio 250 h: cambio de aceite y filtros', version: 1 });
  const tras = porId.get(ESCENARIOS.activoTraslado)!;
  agregar(tras, tramo(tras, 6, 9, 8, 16), { id: ESCENARIOS.reservaTraslado, estado: 'confirmada', sedeDevolucionId: 'sede-cuc' });
  const sinAsignar: [string, ID, number, number][] = [['retroexcavadora', 'sede-mcbo', 4, 7], ['camioneta-pickup', 'sede-ccs', 6, 8], ['excavadora', 'sede-val', 12, 20]];
  sinAsignar.forEach(([slug, sedeId, d0, d1], k) => {
    const z = zonaDe.get(sedeId)!;
    const c = civilDe(sedeId);
    agregar(null, { inicio: instante(z, c, d0, 8), fin: instante(z, c, d1, 17) }, { id: ESCENARIOS.reservasPorAsignar[k], estado: 'borrador', categoriaId: `cat-${slug}`, sedeRetiroId: sedeId });
  });

  // Órdenes en proceso de los activos no operativos
  const historialEstados: CambioEstadoActivo[] = [];
  for (const [id, estado] of Object.entries(NO_OPERATIVOS)) {
    const a = porId.get(id)!;
    const desde = estado === 'en_mantenimiento' ? -1 : -2;
    historialEstados.push({ activoId: id, en: enSede(a, desde, 7), usuarioId: 'usr-mant', antes: 'operativo', despues: estado, motivo: MOTIVOS[estado] });
    if (estado === 'baja') continue;
    const preventivo = estado === 'en_mantenimiento';
    const def = defPorCat.get(a.categoriaId)!;
    ordenes.push({
      id: '',
      activoId: id,
      tipo: preventivo ? 'preventivo' : 'correctivo',
      origen: preventivo ? 'plan' : 'manual',
      ...(preventivo ? { planId: `plan-${def.slug}-${def.vehiculo ? 'km' : 'horas'}` } : {}),
      inicio: enSede(a, desde, 7),
      finEstimado: enSede(a, preventivo ? 2 : 4, 17),
      estado: 'en_proceso',
      descripcion: preventivo ? elegir(DESCRIPCION_PREVENTIVO) : elegir(DESCRIPCION_CORRECTIVO),
      version: 1,
    });
  }

  // 20 órdenes más en huecos del calendario: 6 programadas, 13 completadas y 1 cancelada
  const metas: OrdenMantenimiento['estado'][] = [...Array(6).fill('programada'), ...Array(13).fill('completada'), 'cancelada'];
  const candidatos = faker.helpers.shuffle(activos.filter((a) => !ESPECIALES.has(a.id)));
  for (const a of candidatos) {
    const meta = metas[0];
    if (!meta) break;
    const def = defPorCat.get(a.categoriaId)!;
    const buffer = categorias.find((c) => c.id === a.categoriaId)!.bufferPreparacionMin * MS_MINUTO;
    const propias = borradores.filter((r) => r.activoId === a.id).map((r) => ({ inicio: aMs(r.inicio), fin: aMs(r.fin) }));
    const futura = meta === 'programada';
    const objetivo = futura ? entero(5, 45) : entero(-28, -6);
    for (let n = objetivo; n < objetivo + 25; n++) {
      const inicio = enSede(a, n, 7);
      const fin = enSede(a, def.vehiculo ? n : n + 1, 17);
      if (futura ? aMs(inicio) <= ahoraMs : aMs(fin) > ahoraMs) continue;
      const it = ampliar({ inicio: aMs(inicio), fin: aMs(fin) }, buffer);
      if (propias.some((p) => seSolapan(it, p))) continue;
      ordenes.push({ id: '', activoId: a.id, tipo: 'preventivo', origen: 'plan', planId: `plan-${def.slug}-${def.vehiculo ? 'km' : 'horas'}`, inicio, finEstimado: fin, estado: meta, descripcion: elegir(DESCRIPCION_PREVENTIVO), version: 1 });
      metas.shift();
      break;
    }
  }
  ordenes.sort((x, y) => aMs(x.inicio) - aMs(y.inicio)).forEach((o, i) => (o.id = `ord-${pad(i + 1, 3)}`));

  // Códigos por orden de inicio, monto con la regla de tarifas y una entrada de historial de creación
  const tarifas = new Map(categorias.map((c) => [c.id, c.tarifas]));
  borradores.sort((x, y) => aMs(x.inicio) - aMs(y.inicio));
  const reservas: Reserva[] = borradores.map((b, i) => {
    const n = pad(100 + i, 5);
    return { ...b, id: b.id || `res-${n}`, codigo: `R-2026-${n}`, montoEstimado: cotizar(tarifas.get(b.categoriaId)!, aMs(b.fin) - aMs(b.inicio)).total };
  });
  const historialReservas: CambioReserva[] = reservas.map((r) => ({
    reservaId: r.id,
    en: desdeMs(Math.min(aMs(r.inicio) - 5 * MS_24H, ahoraMs - MS_24H)),
    usuarioId: 'usr-plan',
    campo: 'estado',
    antes: null,
    despues: r.estado,
  }));

  // Inspecciones pasadas: salida de cada reserva en curso y salida más devolución de las finalizadas recientes
  const plantillas = structuredClone([...retro, ...maquinaria, ...vehiculo]) as unknown as PlantillaInspeccion[];
  const inspecciones: Inspeccion[] = [];
  const ultima = (id: ID) => plantillas.filter((p) => p.id === id).sort((x, y) => y.version - x.version)[0]!;
  for (const r of reservas) {
    const a = r.activoId ? porId.get(r.activoId) : undefined;
    const enCurso = r.estado === 'en_curso';
    const reciente = r.estado === 'finalizada' && aMs(r.fin) > ahoraMs - 14 * MS_24H;
    if (!a || (!enCurso && !reciente)) continue;
    const cat = categorias.find((c) => c.id === a.categoriaId)!;
    const vieja = reciente && aMs(r.fin) < ahoraMs - 7 * MS_24H;
    const p = (vieja && plantillas.find((x) => x.id === cat.plantillaInspeccionId && x.version === 2)) || ultima(cat.plantillaInspeccionId);
    const dias = (ms: number) => Math.max(0, ms / MS_24H);
    const finLectura = enCurso ? a.lecturaActual : a.lecturaActual - Math.round(cat.usoDiarioEstimado * dias(ahoraMs - aMs(r.fin)) * 0.3);
    const inicioLectura = Math.max(0, finLectura - Math.round(cat.usoDiarioEstimado * dias((enCurso ? ahoraMs : aMs(r.fin)) - aMs(r.inicio))));
    const nuevaId = () => `ins-${pad(inspecciones.length + 1, 4)}`;
    const salida = inspeccionSembrada(nuevaId(), r, a, p, 'salida', sumarMs(r.inicio, -30 * MS_MINUTO), inicioLectura, 100);
    inspecciones.push(salida);
    r.inspeccionSalidaId = salida.id;
    if (!reciente) continue;
    const realizada = desdeMs(Math.min(aMs(r.fin) + 20 * MS_MINUTO, ahoraMs));
    const devolucion = inspeccionSembrada(nuevaId(), r, a, p, 'devolucion', realizada, finLectura, entero(35, 90));
    inspecciones.push(devolucion);
    r.inspeccionDevolucionId = devolucion.id;
  }

  // Posiciones: los activos en alquiler trabajan en una obra cerca de la sede de retiro
  const obras: Record<ID, Coordenadas> = {};
  for (const a of activos) {
    const enCurso = reservas.find((r) => r.activoId === a.id && r.estado === 'en_curso');
    const base = sedePorId.get(enCurso?.sedeRetiroId ?? a.sedeBaseId)!.coordenadas;
    if (enCurso) obras[a.id] = cerca(base, 0.08);
    a.ubicacion = { ...cerca(obras[a.id] ?? base, enCurso ? 0.004 : 0.002), registradaEn: hoy };
  }

  return {
    hoy,
    sedes: structuredClone(SEDES),
    categorias,
    usuarios: structuredClone(USUARIOS),
    activos,
    clientes,
    reservas,
    ordenes,
    planes,
    plantillas,
    inspecciones,
    historialReservas,
    historialEstados,
    obras,
    tasa: { valor: 268.47, fecha: civilDe('sede-ccs'), fuente: 'BCV (simulada)' },
  };
}

/** Respuestas que pasan la plantilla: el estado normal de un equipo que sale o vuelve bien. */
function respuestasAptas(p: PlantillaInspeccion, firma: string): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const c of todosLosCampos(p)) {
    if (c.tipo === 'si_no') r[c.id] = !falla(c, true);
    else if (c.tipo === 'opcion') r[c.id] = c.opciones?.find((o) => !falla(c, o));
    else if (c.tipo === 'numero' || c.tipo === 'nivel') {
      const min = c.min ?? 0;
      const max = c.max ?? 100;
      const v = Math.round(min + (max - min) * faker.number.float({ min: 0.6, max: 0.95 }));
      r[c.id] = falla(c, v) ? max : v;
    } else if (c.tipo === 'firma') r[c.id] = firma;
    else if (c.tipo === 'texto' && c.requerido) r[c.id] = 'Sin novedad';
  }
  return r;
}

function inspeccionSembrada(
  id: ID,
  reserva: Reserva,
  activo: Activo,
  plantilla: PlantillaInspeccion,
  momento: Inspeccion['momento'],
  realizadaEn: InstanteUTC,
  lectura: number,
  combustiblePct: number,
): Inspeccion {
  const base = respuestasAptas(plantilla, 'José Gregorio Morillo');
  const visibles = camposVisibles(plantilla, base);
  const imagenes = escenas('inspeccion');
  const evidencias: Evidencia[] = [];
  for (const c of todosLosCampos(plantilla)) {
    if (c.tipo !== 'foto' || !visibles.has(c.id)) continue;
    const ids = Array.from({ length: c.fotosMin ?? (c.requerido ? 1 : 0) }, (_, k) => `${id}-${c.id}-${k + 1}`);
    for (const eid of ids) {
      const img = imagenes[evidencias.length % Math.max(1, imagenes.length)];
      const url = img ? srcEscena(img, 'sm') : `${import.meta.env.BASE_URL}favicon.svg`;
      evidencias.push({ id: eid, campoId: c.id, nombre: `${eid}.webp`, mime: 'image/webp', bytes: entero(90_000, 240_000), url, estado: 'lista', progreso: 100 });
    }
    base[c.id] = ids;
  }
  const respuestas = limpiarOcultos(plantilla, base);
  return {
    id,
    plantillaId: plantilla.id,
    plantillaVersion: plantilla.version,
    activoId: activo.id,
    reservaId: reserva.id,
    momento,
    inspectorId: 'usr-insp',
    realizadaEn,
    lectura,
    combustiblePct,
    respuestas,
    evidencias,
    resultado: calcularResultado(plantilla, respuestas),
  };
}
