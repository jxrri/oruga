/** Planes preventivos: vencimiento por lectura o por días, lo que ocurra primero (SPEC §3.5, §4.4). */
import type { Activo, Categoria, FechaCivil, PlanMantenimiento } from '@/api/contrato';
import { diasEntreCiviles, sumarDiasCivil } from '@/shared/lib/fechas';

export interface Vencimiento {
  planId: string;
  /** Lectura en la que vence (km u horas), si el plan es por lectura */
  lecturaObjetivo?: number;
  faltaLectura?: number;
  /** Fecha civil en la que vence, si el plan es por días */
  fechaObjetivo?: FechaCivil;
  faltanDias?: number;
  /** Días estimados hasta el primero de los dos umbrales, usando el uso diario de la categoría */
  diasEstimados: number;
  vencido: boolean;
  /** Dentro de la antelación configurada (RF-MNT-02) */
  enAviso: boolean;
}

export function proximoVencimiento(
  activo: Activo,
  plan: PlanMantenimiento,
  categoria: Categoria,
  hoy: FechaCivil,
): Vencimiento {
  const v: Vencimiento = { planId: plan.id, diasEstimados: Number.POSITIVE_INFINITY, vencido: false, enAviso: false };

  if (plan.cadaLectura) {
    const base = activo.ultimoServicio?.lectura ?? Math.floor(activo.lecturaActual / plan.cadaLectura) * plan.cadaLectura;
    v.lecturaObjetivo = base + plan.cadaLectura;
    v.faltaLectura = v.lecturaObjetivo - activo.lecturaActual;
    const uso = Math.max(categoria.usoDiarioEstimado, 0.0001);
    v.diasEstimados = Math.min(v.diasEstimados, Math.max(0, v.faltaLectura) / uso);
    if (v.faltaLectura <= 0) v.vencido = true;
    else if (v.faltaLectura <= plan.avisoAntes) v.enAviso = true;
  }

  if (plan.cadaDias && activo.ultimoServicio) {
    v.fechaObjetivo = sumarDiasCivil(activo.ultimoServicio.fecha, plan.cadaDias);
    v.faltanDias = diasEntreCiviles(hoy, v.fechaObjetivo);
    v.diasEstimados = Math.min(v.diasEstimados, Math.max(0, v.faltanDias));
    if (v.faltanDias <= 0) v.vencido = true;
    else if (v.faltanDias <= plan.avisoAntes) v.enAviso = true;
  }

  if (v.vencido) v.enAviso = false;
  return v;
}

/** El vencimiento más cercano entre todos los planes de la categoría del activo. */
export function vencimientoMasCercano(
  activo: Activo,
  planes: readonly PlanMantenimiento[],
  categoria: Categoria,
  hoy: FechaCivil,
): Vencimiento | null {
  let mejor: Vencimiento | null = null;
  for (const p of planes) {
    if (p.categoriaId !== activo.categoriaId) continue;
    const v = proximoVencimiento(activo, p, categoria, hoy);
    if (!mejor || (v.vencido && !mejor.vencido)) mejor = v;
    else if (v.vencido === mejor.vencido && v.diasEstimados < mejor.diasEstimados) mejor = v;
  }
  return mejor;
}

/** SPEC §4.4: lectura actual + uso diario estimado × días de reserva. */
export const lecturaProyectada = (activo: Activo, categoria: Categoria, diasReserva: number): number =>
  activo.lecturaActual + categoria.usoDiarioEstimado * diasReserva;

/** true si algún plan por lectura se superaría durante la reserva (MANT_PROYECTADO). */
export function superaUmbralDurante(
  activo: Activo,
  planes: readonly PlanMantenimiento[],
  categoria: Categoria,
  diasReserva: number,
): PlanMantenimiento | null {
  const proyectada = lecturaProyectada(activo, categoria, diasReserva);
  for (const p of planes) {
    if (p.categoriaId !== activo.categoriaId || !p.cadaLectura) continue;
    const base = activo.ultimoServicio?.lectura ?? Math.floor(activo.lecturaActual / p.cadaLectura) * p.cadaLectura;
    if (proyectada > base + p.cadaLectura) return p;
  }
  return null;
}
