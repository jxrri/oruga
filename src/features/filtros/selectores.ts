/**
 * Filtrado en el navegador (SPEC §10): Y entre criterios, O dentro de un criterio, con conteos por
 * opción calculados con los demás filtros aplicados. Función pura; los hooks la memoizan.
 */
import type { Activo, Categoria, ID, OrdenMantenimiento, PlanMantenimiento, Reserva, Sede, UnidadCapacidad } from '@/api/contrato';
import { estaLibre } from '@/domain/disponibilidad';
import { estadoVisible, type EstadoVisible } from '@/domain/estadoActivo';
import { vencimientoMasCercano, type Vencimiento } from '@/domain/mantenimiento';
import { aMs, desdeHoraLocal, finDeFechaCivil, hoyCivil } from '@/shared/lib/fechas';
import type { Filtros } from './filtrosSlice';

export interface ActivoEnriquecido {
  activo: Activo;
  categoria: Categoria;
  sede: Sede;
  estado: EstadoVisible;
  vencimiento: Vencimiento | null;
  /** Texto normalizado para la búsqueda libre: código, placa, marca y modelo */
  texto: string;
}

export interface DatosInventario {
  activos: readonly Activo[];
  categorias: readonly Categoria[];
  sedes: readonly Sede[];
  reservas: readonly Reserva[];
  ordenes: readonly OrdenMantenimiento[];
  planes: readonly PlanMantenimiento[];
  ahoraMs: number;
}

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function enriquecer(d: DatosInventario): ActivoEnriquecido[] {
  const cat = new Map(d.categorias.map((c) => [c.id, c]));
  const sede = new Map(d.sedes.map((s) => [s.id, s]));
  const porActivo = new Map<ID, Reserva[]>();
  for (const r of d.reservas) {
    if (!r.activoId) continue;
    const l = porActivo.get(r.activoId);
    if (l) l.push(r);
    else porActivo.set(r.activoId, [r]);
  }
  const out: ActivoEnriquecido[] = [];
  for (const a of d.activos) {
    const c = cat.get(a.categoriaId);
    const s = sede.get(a.sedeBaseId);
    if (!c || !s) continue;
    out.push({
      activo: a,
      categoria: c,
      sede: s,
      estado: estadoVisible(a, porActivo.get(a.id) ?? [], d.ahoraMs),
      vencimiento: vencimientoMasCercano(a, d.planes, c, hoyCivil(s.zonaHoraria)),
      texto: normalizar(`${a.codigo} ${a.placa ?? ''} ${a.marca} ${a.modelo} ${a.serial}`),
    });
  }
  return out;
}

type Criterio = 'q' | 'tipo' | 'categorias' | 'motores' | 'capacidad' | 'estados' | 'sedes' | 'disponible' | 'mant' | 'operador';

export const DIAS_MANTENIMIENTO_PROXIMO = 7;

function pruebas(f: Filtros, d: Pick<DatosInventario, 'reservas' | 'ordenes'>): Record<Criterio, (x: ActivoEnriquecido) => boolean> {
  const q = normalizar(f.q.trim());
  const terminos = q ? q.split(/\s+/) : [];
  return {
    q: (x) => terminos.every((t) => x.texto.includes(t)),
    tipo: (x) => !f.tipo || x.categoria.tipo === f.tipo,
    categorias: (x) => !f.categorias.length || f.categorias.includes(x.categoria.slug),
    motores: (x) => !f.motores.length || f.motores.includes(x.activo.motor),
    capacidad: (x) =>
      (f.capacidad.min === null || x.activo.capacidad >= f.capacidad.min) &&
      (f.capacidad.max === null || x.activo.capacidad <= f.capacidad.max),
    estados: (x) => !f.estados.length || f.estados.includes(x.estado),
    sedes: (x) => !f.sedes.length || f.sedes.includes(x.sede.clave),
    disponible: (x) => {
      if (!f.disponibleEntre) return true;
      const z = x.sede.zonaHoraria;
      const [a, m, dd] = f.disponibleEntre.desde.split('-').map(Number) as [number, number, number];
      const rango = { inicio: aMs(desdeHoraLocal(a, m, dd, 0, 0, z)), fin: aMs(finDeFechaCivil(f.disponibleEntre.hasta, z)) };
      return estaLibre(x.activo, rango, d);
    },
    mant: (x) =>
      !f.mantenimientoProximo ||
      (!!x.vencimiento && (x.vencimiento.vencido || x.vencimiento.diasEstimados <= DIAS_MANTENIMIENTO_PROXIMO)),
    operador: (x) => f.requiereOperador === null || x.activo.requiereOperador === f.requiereOperador,
  };
}

export interface Conteos {
  tipo: Record<string, number>;
  categorias: Record<string, number>;
  motores: Record<string, number>;
  estados: Record<string, number>;
  sedes: Record<string, number>;
}

export interface ResultadoFiltros {
  filas: ActivoEnriquecido[];
  conteos: Conteos;
  /** Capacidad solo se habilita si las categorías elegidas comparten unidad */
  capacidad: { habilitada: boolean; unidad: UnidadCapacidad | null };
  total: number;
}

const contar = (filas: ActivoEnriquecido[], clave: (x: ActivoEnriquecido) => string) => {
  const out: Record<string, number> = {};
  for (const x of filas) out[clave(x)] = (out[clave(x)] ?? 0) + 1;
  return out;
};

export function aplicarFiltros(
  base: ActivoEnriquecido[],
  f: Filtros,
  d: Pick<DatosInventario, 'reservas' | 'ordenes' | 'categorias'>,
): ResultadoFiltros {
  const p = pruebas(f, d);
  const criterios = Object.keys(p) as Criterio[];
  const excepto = (omitir: Criterio) => base.filter((x) => criterios.every((c) => c === omitir || p[c](x)));

  const elegidas = d.categorias.filter((c) => (f.categorias.length ? f.categorias.includes(c.slug) : f.tipo ? c.tipo === f.tipo : true));
  const unidades = new Set(elegidas.map((c) => c.unidadCapacidad));
  const habilitada = unidades.size === 1 && (f.categorias.length > 0 || !!f.tipo);

  return {
    filas: base.filter((x) => criterios.every((c) => p[c](x))),
    total: base.length,
    capacidad: { habilitada, unidad: habilitada ? [...unidades][0]! : null },
    conteos: {
      tipo: contar(excepto('tipo'), (x) => x.categoria.tipo),
      categorias: contar(excepto('categorias'), (x) => x.categoria.slug),
      motores: contar(excepto('motores'), (x) => x.activo.motor),
      estados: contar(excepto('estados'), (x) => x.estado),
      sedes: contar(excepto('sedes'), (x) => x.sede.clave),
    },
  };
}
