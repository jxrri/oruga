/** Detección de conflictos (SPEC §4.3, §7.4). Se usa en vivo durante el arrastre y en los mocks. */
import type {
  Activo,
  Categoria,
  Cliente,
  CodigoConflicto,
  Conflicto,
  EstadoReserva,
  ID,
  OrdenMantenimiento,
  PlanMantenimiento,
  Reserva,
  Severidad,
  ZonaIANA,
} from '@/api/contrato';
import { aMs, finDeFechaCivil, formatearCivil, MS_24H, MS_MINUTO } from '@/shared/lib/fechas';
import { ampliar, type Intervalo, seSolapan } from './intervalos';
import { superaUmbralDurante } from './mantenimiento';

export const SEVERIDAD: Record<CodigoConflicto, Severidad> = {
  SOLAPE: 'bloqueante',
  MANTENIMIENTO: 'bloqueante',
  NO_OPERATIVO: 'bloqueante',
  DOCUMENTO_VENCIDO: 'bloqueante',
  CLIENTE_BLOQUEADO: 'bloqueante',
  BUFFER: 'advertencia',
  MANT_PROYECTADO: 'advertencia',
  TRASLADO: 'advertencia',
};

export const ETIQUETA_CONFLICTO: Record<CodigoConflicto, string> = {
  SOLAPE: 'Solape',
  MANTENIMIENTO: 'Mantenimiento',
  NO_OPERATIVO: 'Activo no operativo',
  DOCUMENTO_VENCIDO: 'Documento vencido',
  CLIENTE_BLOQUEADO: 'Cliente bloqueado',
  BUFFER: 'Tiempo de preparación',
  MANT_PROYECTADO: 'Mantenimiento proyectado',
  TRASLADO: 'Traslado entre sedes',
};

const ESTADO_OPERATIVO_TEXTO: Record<Activo['estadoOperativo'], string> = {
  operativo: 'operativo',
  en_mantenimiento: 'en mantenimiento',
  fuera_de_servicio: 'fuera de servicio',
  baja: 'de baja',
};

export interface Propuesta extends Intervalo {
  /** Presente al mover una reserva existente: se excluye a sí misma */
  id?: ID;
  activoId: ID;
  clienteId?: ID;
  sedeRetiroId?: ID;
  /** Estado al que quedaría la reserva; CLIENTE_BLOQUEADO solo aplica al confirmar */
  estado?: EstadoReserva;
}

export interface ContextoActivo {
  activo: Activo;
  categoria: Categoria;
  /** Reservas del mismo activo */
  reservas: readonly Reserva[];
  /** Órdenes del mismo activo */
  ordenes: readonly OrdenMantenimiento[];
  planes?: readonly PlanMantenimiento[];
  cliente?: Cliente;
  /** Zona de la sede base: los vencimientos cubren su día completo en esa zona */
  zona?: ZonaIANA;
  nombreSede?: (id: ID) => string;
}

const conflicto = (codigo: CodigoConflicto, mensaje: string, con?: ID): Conflicto => ({
  codigo,
  severidad: SEVERIDAD[codigo],
  mensaje,
  ...(con ? { con } : {}),
});

const intervaloOrden = (m: OrdenMantenimiento): Intervalo => ({ inicio: aMs(m.inicio), fin: aMs(m.finEstimado) });

export function detectarConflictos(p: Propuesta, ctx: ContextoActivo): Conflicto[] {
  const out: Conflicto[] = [];
  const buffer = ctx.categoria.bufferPreparacionMin * MS_MINUTO;

  if (ctx.activo.estadoOperativo !== 'operativo')
    out.push(
      conflicto('NO_OPERATIVO', `${ctx.activo.codigo} está ${ESTADO_OPERATIVO_TEXTO[ctx.activo.estadoOperativo]}.`),
    );

  for (const r of ctx.reservas) {
    if (r.id === p.id || r.estado === 'cancelada') continue;
    const it = { inicio: aMs(r.inicio), fin: aMs(r.fin) };
    if (seSolapan(p, it)) out.push(conflicto('SOLAPE', `Se cruza con la reserva ${r.codigo}.`, r.id));
    else if (buffer > 0 && seSolapan(p, ampliar(it, buffer)))
      out.push(
        conflicto(
          'BUFFER',
          `No respeta las ${formatearHorasBuffer(ctx.categoria.bufferPreparacionMin)} de preparación junto a ${r.codigo}.`,
          r.id,
        ),
      );
  }

  for (const m of ctx.ordenes)
    if (m.estado !== 'cancelada' && m.estado !== 'completada' && seSolapan(p, intervaloOrden(m)))
      out.push(conflicto('MANTENIMIENTO', `Se cruza con una orden de mantenimiento ${m.tipo}.`, m.id));

  out.push(...documentoVencido(p, ctx), ...mantenimientoProyectado(p, ctx), ...traslado(p, ctx), ...clienteBloqueado(p, ctx));
  return out;
}

const formatearHorasBuffer = (min: number): string =>
  min % 60 === 0 ? `${min / 60} ${min === 60 ? 'hora' : 'horas'}` : `${min} minutos`;

export function documentoVencido(p: Propuesta, ctx: ContextoActivo): Conflicto[] {
  const zona = ctx.zona ?? 'America/Caracas';
  return ctx.activo.documentos
    .filter((d) => (d.tipo === 'seguro' || d.tipo === 'permiso') && aMs(finDeFechaCivil(d.venceEl, zona)) < p.fin)
    .map((d) =>
      conflicto(
        'DOCUMENTO_VENCIDO',
        `El ${d.tipo} ${d.numero} vence el ${formatearCivil(d.venceEl)}, antes del fin de la reserva.`,
      ),
    );
}

export function mantenimientoProyectado(p: Propuesta, ctx: ContextoActivo): Conflicto[] {
  if (!ctx.planes?.length) return [];
  const dias = Math.ceil((p.fin - p.inicio) / MS_24H);
  const plan = superaUmbralDurante(ctx.activo, ctx.planes, ctx.categoria, dias);
  return plan ? [conflicto('MANT_PROYECTADO', `El "${plan.nombre}" vencería durante la reserva.`)] : [];
}

/** Sede donde estará el activo al momento del retiro: la devolución de su reserva anterior o su sede base. */
export function sedeAlMomento(activo: Activo, reservas: readonly Reserva[], t: number, excluir?: ID): ID {
  let ultima: Reserva | undefined;
  let ultimaFin = Number.NEGATIVE_INFINITY;
  for (const r of reservas) {
    if (r.id === excluir || r.estado === 'cancelada') continue;
    const fin = aMs(r.fin);
    if (fin <= t && fin > ultimaFin) {
      ultima = r;
      ultimaFin = fin;
    }
  }
  return ultima?.sedeDevolucionId ?? activo.sedeBaseId;
}

export function traslado(p: Propuesta, ctx: ContextoActivo): Conflicto[] {
  if (!p.sedeRetiroId) return [];
  const sede = sedeAlMomento(ctx.activo, ctx.reservas, p.inicio, p.id);
  if (sede === p.sedeRetiroId) return [];
  const nombre = ctx.nombreSede?.(sede) ?? 'otra sede';
  return [conflicto('TRASLADO', `Al momento del retiro ${ctx.activo.codigo} estará en ${nombre}.`)];
}

export function clienteBloqueado(p: Propuesta, ctx: ContextoActivo): Conflicto[] {
  const confirma = p.estado !== undefined && p.estado !== 'borrador' && p.estado !== 'cancelada';
  if (!confirma || ctx.cliente?.estado !== 'bloqueado') return [];
  return [conflicto('CLIENTE_BLOQUEADO', `${ctx.cliente.nombre} está bloqueado y no puede confirmar reservas.`)];
}

export type Veredicto = 'valido' | 'advertencia' | 'bloqueado';

export function clasificar(conflictos: readonly Conflicto[]): Veredicto {
  if (conflictos.some((c) => c.severidad === 'bloqueante')) return 'bloqueado';
  if (conflictos.length) return 'advertencia';
  return 'valido';
}

/** Advertencias aún no aceptadas explícitamente (SPEC §4.3). */
export const advertenciasPendientes = (conflictos: readonly Conflicto[], aceptadas: readonly CodigoConflicto[]) =>
  conflictos.filter((c) => c.severidad === 'advertencia' && !aceptadas.includes(c.codigo));

export interface ConflictoAbierto {
  reservaId: ID;
  activoId: ID | null;
  inicio: number;
  conflicto: Conflicto;
}

const ABIERTAS = new Set<EstadoReserva>(['borrador', 'confirmada', 'en_curso']);

/**
 * Conflictos abiertos para el panel (RF-PLN-05). Por activo, reservas ordenadas por inicio llevando el
 * mayor fin visto: si el siguiente inicio es menor, hay solape. O(n log n) por el ordenamiento.
 */
export function conflictosAbiertos(datos: {
  reservas: readonly Reserva[];
  activos: readonly Activo[];
  ordenes: readonly OrdenMantenimiento[];
  ahoraMs: number;
}): ConflictoAbierto[] {
  const activos = new Map(datos.activos.map((a) => [a.id, a]));
  const porActivo = new Map<ID, Reserva[]>();
  for (const r of datos.reservas) {
    if (!r.activoId || !ABIERTAS.has(r.estado) || aMs(r.fin) <= datos.ahoraMs) continue;
    const lista = porActivo.get(r.activoId);
    if (lista) lista.push(r);
    else porActivo.set(r.activoId, [r]);
  }
  const ordenesPorActivo = new Map<ID, OrdenMantenimiento[]>();
  for (const m of datos.ordenes) {
    if (m.estado === 'cancelada' || m.estado === 'completada') continue;
    const lista = ordenesPorActivo.get(m.activoId);
    if (lista) lista.push(m);
    else ordenesPorActivo.set(m.activoId, [m]);
  }

  const out: ConflictoAbierto[] = [];
  for (const [activoId, lista] of porActivo) {
    lista.sort((a, b) => aMs(a.inicio) - aMs(b.inicio));
    const activo = activos.get(activoId);
    let maxFin = Number.NEGATIVE_INFINITY;
    let duenoMaxFin: Reserva | undefined;
    for (const r of lista) {
      const inicio = aMs(r.inicio);
      const fin = aMs(r.fin);
      const agregar = (c: Conflicto) => out.push({ reservaId: r.id, activoId, inicio, conflicto: c });
      if (duenoMaxFin && inicio < maxFin)
        agregar(conflicto('SOLAPE', `Se cruza con la reserva ${duenoMaxFin.codigo}.`, duenoMaxFin.id));
      if (fin > maxFin) {
        maxFin = fin;
        duenoMaxFin = r;
      }
      if (activo && activo.estadoOperativo !== 'operativo' && r.estado !== 'en_curso')
        agregar(
          conflicto(
            'NO_OPERATIVO',
            `${activo.codigo} está ${ESTADO_OPERATIVO_TEXTO[activo.estadoOperativo]}: hay que reasignar.`,
          ),
        );
      for (const m of ordenesPorActivo.get(activoId) ?? [])
        if (seSolapan({ inicio, fin }, intervaloOrden(m)))
          agregar(conflicto('MANTENIMIENTO', `Se cruza con una orden de mantenimiento ${m.tipo}.`, m.id));
    }
  }
  return out.sort((a, b) => a.inicio - b.inicio);
}
