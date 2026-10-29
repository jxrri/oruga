/**
 * Formulario dinámico de inspección (SPEC §9.3): visibilidad, esquema Zod, resultado y comparación.
 * Sin React: lo usan el renderizador, los mocks y el editor de plantillas.
 */
import { z } from 'zod';
import type {
  CampoPlantilla,
  Comparacion,
  Condicion,
  Inspeccion,
  PlantillaInspeccion,
  ResultadoInspeccion,
  SeccionPlantilla,
} from '@/api/contrato';

export type Respuestas = Record<string, unknown>;

const igual = (a: unknown, b: unknown): boolean =>
  a === b || (typeof a === 'object' && a !== null && JSON.stringify(a) === JSON.stringify(b));

export function compara(c: Comparacion, valor: unknown): boolean {
  switch (c.op) {
    case 'eq':
      return igual(valor, c.valor);
    case 'neq':
      return !igual(valor, c.valor);
    case 'in': {
      if (!Array.isArray(c.valor)) return false;
      const lista: unknown[] = c.valor;
      return Array.isArray(valor) ? valor.some((v) => lista.includes(v)) : lista.includes(valor);
    }
    case 'lt':
      return typeof valor === 'number' && typeof c.valor === 'number' && valor < c.valor;
    case 'gt':
      return typeof valor === 'number' && typeof c.valor === 'number' && valor > c.valor;
  }
}

export function cumple(cond: Condicion, r: Respuestas): boolean {
  if ('todas' in cond) return cond.todas.every((c) => cumple(c, r));
  if ('alguna' in cond) return cond.alguna.some((c) => cumple(c, r));
  return compara(cond, r[cond.campo]);
}

export const todosLosCampos = (p: Pick<PlantillaInspeccion, 'secciones'>): CampoPlantilla[] =>
  p.secciones.flatMap((s) => s.campos);

/**
 * Campos visibles. Se calcula como punto fijo: la respuesta de un campo oculto no cuenta para las
 * condiciones de otros, así una cadena de dependencias se oculta completa.
 */
export function camposVisibles(p: Pick<PlantillaInspeccion, 'secciones'>, r: Respuestas): Set<string> {
  const campos = todosLosCampos(p);
  let visibles = new Set(campos.map((c) => c.id));
  for (let vuelta = 0; vuelta <= campos.length; vuelta++) {
    const efectivas: Respuestas = {};
    for (const id of visibles) if (id in r) efectivas[id] = r[id];
    const siguiente = new Set(campos.filter((c) => !c.visibleSi || cumple(c.visibleSi, efectivas)).map((c) => c.id));
    if (siguiente.size === visibles.size && [...siguiente].every((id) => visibles.has(id))) return siguiente;
    visibles = siguiente;
  }
  return visibles;
}

export const esVisible = (campo: CampoPlantilla, p: Pick<PlantillaInspeccion, 'secciones'>, r: Respuestas) =>
  camposVisibles(p, r).has(campo.id);

export function estaVacia(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

export const falla = (campo: CampoPlantilla, v: unknown): boolean =>
  !!campo.falla && !estaVacia(v) && compara(campo.falla, v);

/** Solo las respuestas visibles: los campos ocultos no se validan ni se envían. */
export function limpiarOcultos(p: Pick<PlantillaInspeccion, 'secciones'>, r: Respuestas): Respuestas {
  const vis = camposVisibles(p, r);
  return Object.fromEntries(Object.entries(r).filter(([k]) => vis.has(k)));
}

export function calcularResultado(
  p: Pick<PlantillaInspeccion, 'secciones'>,
  r: Respuestas,
  observaciones?: string,
): ResultadoInspeccion {
  const vis = camposVisibles(p, r);
  let observada = !!observaciones?.trim();
  for (const c of todosLosCampos(p)) {
    if (!vis.has(c.id) || !falla(c, r[c.id])) continue;
    if (c.critico) return 'no_apto';
    observada = true;
  }
  return observada ? 'apto_con_observaciones' : 'apto';
}

/** Campos visibles que fallan, separados por criticidad (para resumen y orden correctiva). */
export function fallas(p: Pick<PlantillaInspeccion, 'secciones'>, r: Respuestas) {
  const vis = camposVisibles(p, r);
  const lista = todosLosCampos(p).filter((c) => vis.has(c.id) && falla(c, r[c.id]));
  return { criticas: lista.filter((c) => c.critico), menores: lista.filter((c) => !c.critico) };
}

function errorDeCampo(c: CampoPlantilla, v: unknown): string | null {
  if (estaVacia(v)) return c.requerido ? 'Este campo es obligatorio.' : null;
  switch (c.tipo) {
    case 'si_no':
      return typeof v === 'boolean' ? null : 'Responde sí o no.';
    case 'numero':
    case 'nivel':
      if (typeof v !== 'number' || Number.isNaN(v)) return 'Ingresa un número.';
      if (c.min !== undefined && v < c.min) return `El mínimo es ${c.min}.`;
      if (c.max !== undefined && v > c.max) return `El máximo es ${c.max}.`;
      return null;
    case 'opcion':
      return typeof v === 'string' && (!c.opciones || c.opciones.includes(v)) ? null : 'Elige una opción válida.';
    case 'multi':
      return Array.isArray(v) && v.every((x) => !c.opciones || c.opciones.includes(x as string))
        ? null
        : 'Elige opciones válidas.';
    case 'foto': {
      const n = Array.isArray(v) ? v.length : 0;
      const min = c.fotosMin ?? (c.requerido ? 1 : 0);
      return n >= min ? null : `Se necesitan al menos ${min} ${min === 1 ? 'foto' : 'fotos'}.`;
    }
    case 'texto':
    case 'firma':
      return typeof v === 'string' ? null : 'Valor inválido.';
  }
}

/** Esquema Zod generado desde la plantilla: requeridos solo si están visibles, más fotosMin, min y max. */
export function construirEsquema(p: Pick<PlantillaInspeccion, 'secciones'>) {
  return z.record(z.string(), z.unknown()).superRefine((r, ctx) => {
    const vis = camposVisibles(p, r);
    for (const c of todosLosCampos(p)) {
      if (!vis.has(c.id)) continue;
      const error = errorDeCampo(c, r[c.id]);
      if (error) ctx.addIssue({ code: 'custom', message: error, path: [c.id] });
    }
  });
}

/** Errores de una sección visible: para validar cada paso antes de avanzar. */
export function erroresDeSeccion(p: Pick<PlantillaInspeccion, 'secciones'>, s: SeccionPlantilla, r: Respuestas) {
  const vis = camposVisibles(p, r);
  const out: Record<string, string> = {};
  for (const c of s.campos) {
    if (!vis.has(c.id)) continue;
    const e = errorDeCampo(c, r[c.id]);
    if (e) out[c.id] = e;
  }
  return out;
}

export type CambioCampo = 'igual' | 'dano_nuevo' | 'reparado' | 'falla_persistente';

export interface Comparativa {
  difLectura: number;
  difCombustible: number | null;
  campos: { campo: CampoPlantilla; salida: unknown; devolucion: unknown; cambio: CambioCampo }[];
  daniosNuevos: CampoPlantilla[];
}

/** Salida contra devolución (RF-INS-05). Cada una se evalúa con la plantilla de su propia versión. */
export function compararInspecciones(
  salida: Pick<Inspeccion, 'lectura' | 'combustiblePct' | 'respuestas'>,
  devolucion: Pick<Inspeccion, 'lectura' | 'combustiblePct' | 'respuestas'>,
  plantillaSalida: Pick<PlantillaInspeccion, 'secciones'>,
  plantillaDevolucion: Pick<PlantillaInspeccion, 'secciones'> = plantillaSalida,
): Comparativa {
  const visS = camposVisibles(plantillaSalida, salida.respuestas);
  const visD = camposVisibles(plantillaDevolucion, devolucion.respuestas);
  const camposS = new Map(todosLosCampos(plantillaSalida).map((c) => [c.id, c]));
  const campos: Comparativa['campos'] = [];
  for (const c of todosLosCampos(plantillaDevolucion)) {
    if (c.tipo === 'foto' || c.tipo === 'firma') continue;
    const cs = camposS.get(c.id) ?? c;
    const vS = visS.has(c.id) ? salida.respuestas[c.id] : undefined;
    const vD = visD.has(c.id) ? devolucion.respuestas[c.id] : undefined;
    const fS = falla(cs, vS);
    const fD = falla(c, vD);
    const cambio: CambioCampo = !fS && fD ? 'dano_nuevo' : fS && !fD ? 'reparado' : fS && fD ? 'falla_persistente' : 'igual';
    campos.push({ campo: c, salida: vS, devolucion: vD, cambio });
  }
  const difCombustible =
    salida.combustiblePct !== undefined && devolucion.combustiblePct !== undefined
      ? devolucion.combustiblePct - salida.combustiblePct
      : null;
  return {
    difLectura: devolucion.lectura - salida.lectura,
    difCombustible,
    campos,
    daniosNuevos: campos.filter((x) => x.cambio === 'dano_nuevo').map((x) => x.campo),
  };
}

// Validación del JSON de plantillas (editor de administrador, SPEC §14)
const comparacionSchema = z.object({ op: z.enum(['eq', 'neq', 'in', 'lt', 'gt']), valor: z.unknown() });

const condicionSchema = z.lazy(() =>
  z.union([
    z.object({ todas: z.array(condicionSchema) }),
    z.object({ alguna: z.array(condicionSchema) }),
    z.object({ campo: z.string().min(1), op: comparacionSchema.shape.op, valor: z.unknown() }),
  ]),
) as unknown as z.ZodType<Condicion>;

const campoSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, 'El id usa minúsculas, números y guion bajo.'),
  tipo: z.enum(['si_no', 'opcion', 'multi', 'numero', 'texto', 'nivel', 'foto', 'firma']),
  etiqueta: z.string().min(1),
  requerido: z.boolean(),
  critico: z.boolean().optional(),
  falla: comparacionSchema.optional(),
  opciones: z.array(z.string().min(1)).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  fotosMin: z.number().int().min(0).optional(),
  visibleSi: condicionSchema.optional(),
  ayuda: z.string().optional(),
});

export const esquemaPlantilla = z
  .object({
    id: z.string().min(1),
    nombre: z.string().min(1),
    version: z.number().int().positive(),
    categoriaIds: z.array(z.string()),
    secciones: z
      .array(z.object({ id: z.string().min(1), titulo: z.string().min(1), campos: z.array(campoSchema).min(1) }))
      .min(1),
  })
  .superRefine((p, ctx) => {
    const ids = new Set<string>();
    const referidos: string[] = [];
    const recolectar = (c: Condicion) => {
      if ('todas' in c) c.todas.forEach(recolectar);
      else if ('alguna' in c) c.alguna.forEach(recolectar);
      else referidos.push(c.campo);
    };
    p.secciones.forEach((s, i) =>
      s.campos.forEach((c, j) => {
        const path = ['secciones', i, 'campos', j];
        if (ids.has(c.id)) ctx.addIssue({ code: 'custom', message: `Id de campo repetido: ${c.id}`, path });
        ids.add(c.id);
        if ((c.tipo === 'opcion' || c.tipo === 'multi') && !c.opciones?.length)
          ctx.addIssue({ code: 'custom', message: `El campo ${c.id} necesita opciones.`, path });
        if (c.visibleSi) recolectar(c.visibleSi as Condicion);
      }),
    );
    for (const r of referidos)
      if (!ids.has(r)) ctx.addIssue({ code: 'custom', message: `La condición menciona un campo inexistente: ${r}`, path: ['secciones'] });
  });

export function validarPlantilla(
  json: unknown,
): { ok: true; plantilla: PlantillaInspeccion } | { ok: false; errores: string[] } {
  const r = esquemaPlantilla.safeParse(json);
  if (r.success) return { ok: true, plantilla: r.data as PlantillaInspeccion };
  return { ok: false, errores: r.error.issues.map((i) => `${i.path.join('.') || 'plantilla'}: ${i.message}`) };
}
