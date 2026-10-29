import { describe, expect, it } from 'vitest';
import {
  aInputLocal,
  aMs,
  desdeHoraLocal,
  desdeInputLocal,
  diasDelRango,
  diasEntreCiviles,
  etiquetaDesfase,
  fechaCivilDe,
  finDeFechaCivil,
  formatear,
  inicioDelDia,
  partesLocales,
  sumarDias,
  sumarDiasCivil,
} from './fechas';

const CCS = 'America/Caracas';
const BOG = 'America/Bogota';
const NY = 'America/New_York';

describe('fechas: la zona de la máquina no altera ningún resultado', () => {
  it('interpreta la hora del formulario en la zona de la sede', () => {
    expect(desdeHoraLocal(2026, 11, 3, 9, 0, CCS)).toBe('2026-11-03T13:00:00Z');
    expect(desdeHoraLocal(2026, 11, 3, 9, 0, BOG)).toBe('2026-11-03T14:00:00Z');
  });

  it('formatea un instante en la zona pedida', () => {
    expect(formatear('2026-11-03T13:00:00Z', CCS)).toBe('03/11/2026 09:00');
    expect(formatear('2026-11-03T13:00:00Z', BOG, 'HH:mm')).toBe('08:00');
  });

  it('una reserva Maracaibo-Cúcuta muestra horas distintas en retiro y devolución', () => {
    const fin = '2026-11-05T22:00:00Z';
    expect(formatear(fin, CCS, 'HH:mm')).toBe('18:00');
    expect(formatear(fin, BOG, 'HH:mm')).toBe('17:00');
  });

  it('rechaza instantes sin Z para no colar horas locales', () => {
    expect(() => aMs('2026-11-03T13:00:00')).toThrow();
    expect(() => aMs('2026-11-03')).toThrow();
  });

  it('inicio del día en la zona, no en UTC', () => {
    expect(inicioDelDia('2026-11-03T02:00:00Z', CCS)).toBe('2026-11-02T04:00:00Z');
    expect(inicioDelDia('2026-11-03T05:00:00Z', CCS)).toBe('2026-11-03T04:00:00Z');
  });

  it('el día del cambio de horario de Nueva York dura 25 horas', () => {
    const dias = diasDelRango('2026-10-31T12:00:00Z', 3, NY);
    expect(dias).toEqual(['2026-10-31T04:00:00Z', '2026-11-01T04:00:00Z', '2026-11-02T05:00:00Z']);
    const duracion = aMs(dias[2]!) - aMs(dias[1]!);
    expect(duracion).toBe(25 * 3_600_000);
  });

  it('sumar días de calendario conserva la hora de pared aunque cambie el desfase', () => {
    expect(sumarDias('2026-10-31T13:00:00Z', 2, NY)).toBe('2026-11-02T14:00:00Z');
    expect(partesLocales('2026-11-02T14:00:00Z', NY).hora).toBe(9);
  });

  it('ida y vuelta con datetime-local', () => {
    const i = '2026-11-03T13:15:00Z';
    expect(aInputLocal(i, CCS)).toBe('2026-11-03T09:15');
    expect(desdeInputLocal('2026-11-03T09:15', CCS)).toBe(i);
    expect(desdeInputLocal('basura', CCS)).toBeNull();
  });

  it('fecha civil de un instante depende de la zona elegida, no de la máquina', () => {
    expect(fechaCivilDe('2026-11-03T02:00:00Z', CCS)).toBe('2026-11-02');
    expect(fechaCivilDe('2026-11-03T02:00:00Z', 'Asia/Tokyo')).toBe('2026-11-03');
  });

  it('un vencimiento cubre todo su día en la zona de la sede', () => {
    expect(finDeFechaCivil('2026-11-03', CCS)).toBe('2026-11-04T04:00:00Z');
  });

  it('aritmética de fechas civiles sin zonas', () => {
    expect(diasEntreCiviles('2026-10-30', '2026-11-03')).toBe(4);
    expect(sumarDiasCivil('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('etiqueta de desfase con nombre IANA y signo menos tipográfico', () => {
    expect(etiquetaDesfase('2026-11-03T13:00:00Z', CCS)).toBe('UTC−4');
    expect(etiquetaDesfase('2026-11-03T13:00:00Z', 'Asia/Tokyo')).toBe('UTC+9');
    expect(etiquetaDesfase('2015-11-03T13:00:00Z', CCS)).toBe('UTC−4:30');
  });
});
