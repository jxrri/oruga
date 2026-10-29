import { describe, expect, it } from 'vitest';
import { MS_HORA, MS_MINUTO } from '@/shared/lib/fechas';
import { pickup, reserva, retro } from './fixtures';
import { accionesPosibles, cambioPermitido, evaluarTransicion, permisosEdicion } from './reservaFSM';
import { cotizar } from './tarifas';

const base = { bloqueantes: 0, clienteBloqueado: false };

describe('máquina de estados de la reserva', () => {
  it('confirmar exige activo asignado, cliente activo y cero bloqueantes', () => {
    const b = reserva({ estado: 'borrador' });
    expect(evaluarTransicion(b, 'confirmar', base)).toEqual({ ok: true, hacia: 'confirmada' });
    expect(evaluarTransicion({ ...b, activoId: null }, 'confirmar', base).ok).toBe(false);
    expect(evaluarTransicion(b, 'confirmar', { ...base, clienteBloqueado: true }).ok).toBe(false);
    expect(evaluarTransicion(b, 'confirmar', { ...base, bloqueantes: 1 }).ok).toBe(false);
  });

  it('entregar exige inspección de salida apta', () => {
    const c = reserva();
    expect(evaluarTransicion(c, 'entregar', base).ok).toBe(false);
    const conSalida = { ...c, inspeccionSalidaId: 'ins-1' };
    expect(evaluarTransicion(conSalida, 'entregar', { ...base, resultadoSalida: 'no_apto' }).ok).toBe(false);
    expect(evaluarTransicion(conSalida, 'entregar', { ...base, resultadoSalida: 'apto' })).toEqual({
      ok: true,
      hacia: 'en_curso',
    });
  });

  it('una devolución no apta no impide finalizar', () => {
    const r = reserva({ estado: 'en_curso', inspeccionDevolucionId: 'ins-2' });
    expect(evaluarTransicion(r, 'devolver', { ...base, bloqueantes: 3 })).toEqual({ ok: true, hacia: 'finalizada' });
  });

  it('las finalizadas no transicionan; cancelar solo desde borrador o confirmada', () => {
    expect(accionesPosibles('finalizada')).toEqual([]);
    expect(accionesPosibles('borrador')).toEqual(['confirmar', 'cancelar']);
    expect(evaluarTransicion(reserva({ estado: 'en_curso' }), 'cancelar', base).ok).toBe(false);
  });

  it('tabla de edición por estado: en curso solo extiende el fin', () => {
    expect(permisosEdicion('confirmada')).toEqual({ moverFechas: true, cambiarActivo: true, extenderFin: true });
    const r = reserva({ estado: 'en_curso' });
    expect(cambioPermitido(r, { fin: '2026-11-07T22:00:00Z' }).ok).toBe(true);
    expect(cambioPermitido(r, { fin: '2026-11-04T22:00:00Z' }).ok).toBe(false);
    expect(cambioPermitido(r, { inicio: '2026-11-04T13:00:00Z' }).ok).toBe(false);
    expect(cambioPermitido(r, { activoId: 'act-9' }).ok).toBe(false);
    expect(cambioPermitido(reserva({ estado: 'finalizada' }), { fin: '2026-11-09T22:00:00Z' }).ok).toBe(false);
  });
});

describe('tarifas: combinación más conveniente', () => {
  it('pocas horas se cobran por hora si sale más barato que un día', () => {
    expect(cotizar(pickup.tarifas, 5 * MS_HORA)).toMatchObject({ total: 7_500, desglose: { horas: 5, dias: 0 } });
  });

  it('26 horas: un día más 2 horas', () => {
    expect(cotizar(pickup.tarifas, 26 * MS_HORA).desglose).toEqual({ meses: 0, semanas: 0, dias: 1, horas: 2 });
  });

  it('8 días de maquinaria: una semana más un día, sin tarifa por hora', () => {
    expect(cotizar(retro.tarifas, 8 * 24 * MS_HORA)).toMatchObject({
      total: 245_000,
      desglose: { semanas: 1, dias: 1, horas: 0 },
    });
  });

  it('6 días ya convienen como semana si cuesta igual o menos', () => {
    expect(cotizar(retro.tarifas, 6 * 24 * MS_HORA + 3 * MS_HORA).total).toBe(210_000);
  });

  it('la tolerancia evita cobrar una hora por pocos minutos', () => {
    expect(cotizar(pickup.tarifas, 24 * MS_HORA + 20 * MS_MINUTO).desglose).toMatchObject({ dias: 1, horas: 0 });
    expect(cotizar(pickup.tarifas, 24 * MS_HORA + 40 * MS_MINUTO).desglose).toMatchObject({ dias: 1, horas: 1 });
  });
});
