/** Activos: lista con filtros (SPEC §10), ficha y disponibilidad. */
import type { Activo, ActivoDetalle, ActivoDisponible, ActivoEdicion, ActivoNuevo, CambioEstadoBody, EstadoOperativo } from '@/api/contrato';
import { activosDisponibles } from '@/domain/disponibilidad';
import { cotizar } from '@/domain/tarifas';
import { ahora, aMs, esInstanteUTC } from '@/shared/lib/fechas';
import { validarAnio, validarCapacidad, validarUnicidad } from '@/domain/validaciones';
import { cambiarEstadoActivo } from '../reglas';
import { db } from '../db';
import { invalido, json, leerCuerpo, lista, noEncontrado, prohibido, ruta, versionVieja } from '../servidor';

function filtrar(q: URLSearchParams): Activo[] {
  const texto = (q.get('q') ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const tipo = q.get('tipo');
  const cats = lista(q, 'categoriaId');
  const motores = lista(q, 'motor');
  const sedes = lista(q, 'sedeId');
  const min = q.get('capacidadMin');
  const max = q.get('capacidadMax');
  const operador = q.get('requiereOperador');
  const tipoDe = new Map(db.categorias.map((c) => [c.id, c.tipo]));
  return db.activos.filter((a) => {
    const blob = [a.codigo, a.placa ?? '', a.marca, a.modelo].join(' ').toLowerCase();
    return (
      texto.every((t) => blob.includes(t)) &&
      (!tipo || tipoDe.get(a.categoriaId) === tipo) &&
      (!cats.length || cats.includes(a.categoriaId)) &&
      (!motores.length || motores.includes(a.motor)) &&
      (!sedes.length || sedes.includes(a.sedeBaseId)) &&
      (min === null || a.capacidad >= Number(min)) &&
      (max === null || a.capacidad <= Number(max)) &&
      (operador === null || String(a.requiereOperador) === operador)
    );
  });
}

const ESTADOS: EstadoOperativo[] = ['operativo', 'en_mantenimiento', 'fuera_de_servicio', 'baja'];

/** Validación de alta y edición (RF-INV-04): 422 por campo. */
function erroresActivo(b: ActivoNuevo | null, excluirId?: string): [string, string][] {
  if (!b) return [['cuerpo', 'Cuerpo de la petición inválido.']];
  const e: [string, string][] = [];
  const cat = db.categorias.find((c) => c.id === b.categoriaId);
  if (!b.codigo?.trim()) e.push(['codigo', 'El código es obligatorio.']);
  else if (db.activos.some((a) => a.id !== excluirId && a.codigo.toUpperCase() === b.codigo.trim().toUpperCase()))
    e.push(['codigo', `El código ${b.codigo} ya existe.`]);
  if (!cat) e.push(['categoriaId', 'La categoría no existe.']);
  if (!db.sedes.some((s) => s.id === b.sedeBaseId)) e.push(['sedeBaseId', 'La sede no existe.']);
  if (!b.marca?.trim()) e.push(['marca', 'La marca es obligatoria.']);
  if (!b.modelo?.trim()) e.push(['modelo', 'El modelo es obligatorio.']);
  if (!b.serial?.trim()) e.push(['serial', 'El serial es obligatorio.']);
  if (!ESTADOS.includes(b.estadoOperativo)) e.push(['estadoOperativo', 'Estado operativo inválido.']);
  if (!(b.lecturaActual >= 0)) e.push(['lecturaActual', 'La lectura no puede ser negativa.']);
  const anio = validarAnio(b.anio, Number(ahora().slice(0, 4)));
  if (anio) e.push(['anio', anio]);
  const capacidad = cat ? validarCapacidad(b.capacidad, cat) : null;
  if (capacidad) e.push(['capacidad', capacidad]);
  if (b.serial?.trim()) for (const [campo, msg] of Object.entries(validarUnicidad(b, db.activos, excluirId))) e.push([campo, msg]);
  return e;
}

const buscar = (id: string | undefined) => db.activos.find((a) => a.id === id);

export const activos = [
  ruta('get', 'activos', ({ query }) => json(filtrar(query))),
  ruta('get', 'activos/:id', ({ params }) => {
    const activo = buscar(params.id);
    if (!activo) return noEncontrado('El activo');
    const detalle: ActivoDetalle = {
      activo,
      historialEstado: db.historialEstados.filter((h) => h.activoId === activo.id),
      reservas: db.reservas.filter((r) => r.activoId === activo.id),
      inspecciones: db.inspecciones.filter((i) => i.activoId === activo.id),
      ordenes: db.ordenes.filter((o) => o.activoId === activo.id),
    };
    return json(detalle);
  }),
  ruta('get', 'disponibilidad', ({ query }) => {
    const desde = query.get('desde') ?? '';
    const hasta = query.get('hasta') ?? '';
    if (!esInstanteUTC(desde) || !esInstanteUTC(hasta) || aMs(desde) >= aMs(hasta))
      return invalido([['desde', 'El rango debe ser ISO UTC y "desde" anterior a "hasta".']]);
    const rango = { inicio: aMs(desde), fin: aMs(hasta) };
    const filtro = { categoriaId: query.get('categoriaId') ?? undefined, sedeId: query.get('sedeId') ?? undefined };
    const tarifas = new Map(db.categorias.map((c) => [c.id, c.tarifas]));
    return json(
      activosDisponibles(db.activos, rango, db, filtro, db).map(
        (activo): ActivoDisponible => ({ activo, montoEstimado: cotizar(tarifas.get(activo.categoriaId)!, rango.fin - rango.inicio).total }),
      ),
    );
  }),

  ruta('post', 'activos', async ({ request, usuario }) => {
    const sinPermiso = prohibido(usuario, 'crear', 'activo');
    if (sinPermiso) return sinPermiso;
    const b = await leerCuerpo<ActivoNuevo>(request);
    const errores = erroresActivo(b);
    if (errores.length || !b) return invalido(errores);
    const sede = db.sedes.find((s) => s.id === b.sedeBaseId)!;
    const codigo = b.codigo.trim().toUpperCase();
    const activo: Activo = { ...b, codigo, id: `act-${codigo.toLowerCase()}`, ubicacion: { ...sede.coordenadas, registradaEn: ahora() }, version: 1 };
    db.activos.push(activo);
    return json(activo, 201);
  }),

  ruta('put', 'activos/:id', async ({ request, params, usuario }) => {
    const sinPermiso = prohibido(usuario, 'editar', 'activo');
    if (sinPermiso) return sinPermiso;
    const activo = buscar(params.id);
    if (!activo) return noEncontrado('El activo');
    const b = await leerCuerpo<ActivoEdicion>(request);
    if (!b) return invalido([['cuerpo', 'Cuerpo de la petición inválido.']]);
    const vieja = versionVieja(b.version, activo.version);
    if (vieja) return vieja;
    const errores = erroresActivo(b, activo.id);
    if (errores.length) return invalido(errores);
    const { version: _v, estadoOperativo, ...datos } = b;
    Object.assign(activo, datos, { codigo: b.codigo.trim().toUpperCase(), version: activo.version + 1 });
    cambiarEstadoActivo(activo, estadoOperativo, usuario!.id, 'Edición de la ficha.');
    return json(activo);
  }),

  ruta('patch', 'activos/:id', async ({ request, params, usuario }) => {
    const sinPermiso = prohibido(usuario, 'cambiar_estado', 'activo');
    if (sinPermiso) return sinPermiso;
    const activo = buscar(params.id);
    if (!activo) return noEncontrado('El activo');
    const b = await leerCuerpo<CambioEstadoBody>(request);
    if (!b) return invalido([['cuerpo', 'Cuerpo de la petición inválido.']]);
    if (!ESTADOS.includes(b.estadoOperativo)) return invalido([['estadoOperativo', 'Estado operativo inválido.']]);
    if (!b.motivo?.trim()) return invalido([['motivo', 'Indica el motivo del cambio de estado.']]);
    const vieja = versionVieja(b.version, activo.version);
    if (vieja) return vieja;
    cambiarEstadoActivo(activo, b.estadoOperativo, usuario!.id, b.motivo.trim());
    return json(activo);
  }),
];
