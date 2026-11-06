/**
 * Fuente de eventos simulada (SPEC §6.3, RF-PLN-10, RF-UBI-02): posiciones cada 4 s y, cada 30 s,
 * "otra sesión" que corre una reserva confirmada 1 o 2 h si sigue sin conflictos. Muta la base y luego emite.
 * Misma forma que el WebSocket del backend: `suscribir(cb, alConectar)`.
 */
import type { EventoTiempoReal } from '@/api/contrato';
import { ahora, ahoraMs, aMs, MS_HORA, sumarMs } from '@/shared/lib/fechas';
import { leerConfigMock, suscribirConfigMock } from './config';
import { db } from './db';
import { emitir, hayOyentes, suscribirEventos } from './eventos';
import { conflictosPara, montoDe, registrarCambios } from './reglas';

const azar = (d: number) => (Math.random() * 2 - 1) * d;
const alguno = <T>(xs: readonly T[]): T | undefined => xs[Math.floor(Math.random() * xs.length)];

function moverPosiciones(): void {
  const enCurso = db.reservas.filter((r) => r.estado === 'en_curso' && r.activoId);
  for (let k = 0; k < Math.min(8, enCurso.length); k++) {
    const activo = db.activos.find((a) => a.id === alguno(enCurso)?.activoId);
    if (!activo) continue;
    const obra = (db.obras[activo.id] ??= activo.ubicacion ?? db.sedes[0]!.coordenadas);
    activo.ubicacion = { lat: +(obra.lat + azar(0.006)).toFixed(5), lng: +(obra.lng + azar(0.006)).toFixed(5), registradaEn: ahora() };
    emitir({ tipo: 'activo.posicion', en: activo.ubicacion.registradaEn, datos: { id: activo.id, ubicacion: activo.ubicacion } });
  }
}

function otraSesionMueveReserva(): void {
  const limite = ahoraMs() + 6 * MS_HORA;
  const candidatas = db.reservas.filter((r) => r.estado === 'confirmada' && r.activoId && aMs(r.inicio) > limite);
  for (let intento = 0; intento < 5; intento++) {
    const r = alguno(candidatas);
    if (!r) return;
    const delta = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.5 ? 1 : 2) * MS_HORA;
    const inicio = sumarMs(r.inicio, delta);
    const fin = sumarMs(r.fin, delta);
    if (conflictosPara({ ...r, inicio, fin }).length) continue;
    const antes = { ...r };
    Object.assign(r, { inicio, fin, montoEstimado: montoDe(r.categoriaId, inicio, fin), version: r.version + 1 });
    registrarCambios(antes, r, 'usr-plan', ['inicio', 'fin']);
    emitir({ tipo: 'reserva.actualizada', en: ahora(), datos: r });
    return;
  }
}

let relojes: ReturnType<typeof setInterval>[] = [];
const siActivo = (f: () => void) => () => {
  if (leerConfigMock().tiempoReal) f();
};

export const fuenteEventos = {
  suscribir(cb: (e: EventoTiempoReal) => void, alConectar?: (conectado: boolean) => void): () => void {
    const quitar = suscribirEventos(cb);
    const avisar = () => alConectar?.(leerConfigMock().tiempoReal);
    const quitarConfig = suscribirConfigMock(avisar);
    avisar();
    if (!relojes.length) relojes = [setInterval(siActivo(moverPosiciones), 4_000), setInterval(siActivo(otraSesionMueveReserva), 30_000)];
    return () => {
      quitar();
      quitarConfig();
      if (!hayOyentes()) {
        relojes.forEach(clearInterval);
        relojes = [];
      }
    };
  },
};
