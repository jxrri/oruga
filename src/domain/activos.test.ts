import { describe, expect, it } from 'vitest';
import type { Sede } from '@/api/contrato';
import { aMs } from '@/shared/lib/fechas';
import { activosDisponibles, estaLibre } from './disponibilidad';
import { estadoVisible } from './estadoActivo';
import { activo, orden, reserva, retro } from './fixtures';
import { proximoVencimiento, vencimientoMasCercano } from './mantenimiento';
import { validarAnio, validarCapacidad, validarDocumento, validarUnicidad } from './validaciones';

const sede = (id: string, nombre: string): Sede => ({
  id,
  nombre,
  clave: id,
  ciudad: nombre,
  zonaHoraria: 'America/Caracas',
  coordenadas: { lat: 0, lng: 0 },
  horario: { abre: '07:00', cierra: '18:00' },
});

describe('mantenimiento preventivo', () => {
  const plan = { id: 'p', categoriaId: retro.id, nombre: 'Servicio 250 h', cadaLectura: 250, avisoAntes: 80 };
  it('vence por lectura con aviso anticipado', () => {
    const v = proximoVencimiento(activo(), plan, retro, '2026-11-02');
    expect(v).toMatchObject({ lecturaObjetivo: 1_250, faltaLectura: 70, enAviso: true, vencido: false });
    expect(v.diasEstimados).toBeCloseTo(70 / 6);
  });

  it('vence por días si ocurre primero', () => {
    const porDias = { ...plan, id: 'd', cadaLectura: undefined, cadaDias: 30, avisoAntes: 7 };
    const v = vencimientoMasCercano(activo({ lecturaActual: 1_010 }), [plan, porDias], retro, '2026-11-02');
    expect(v).toMatchObject({ planId: 'd', fechaObjetivo: '2026-10-15', vencido: true });
  });
});

describe('estado visible y disponibilidad', () => {
  const ahora = aMs('2026-11-02T13:30:00Z');
  it('orden de derivación: no operativo, en alquiler, próxima salida, disponible', () => {
    expect(estadoVisible(activo({ estadoOperativo: 'en_mantenimiento' }), [], ahora)).toBe('en_mantenimiento');
    expect(estadoVisible(activo(), [reserva({ estado: 'en_curso' })], ahora)).toBe('en_alquiler');
    expect(estadoVisible(activo(), [reserva({ inicio: '2026-11-03T09:00:00Z' })], ahora)).toBe('proxima_salida');
    const borrador = reserva({ estado: 'borrador', inicio: '2026-11-03T09:00:00Z' });
    expect(estadoVisible(activo(), [borrador], ahora)).toBe('disponible');
  });

  it('descarta activos con reservas u órdenes en el rango y ordena por sede y tarifa', () => {
    const rango = { inicio: aMs('2026-11-10T00:00:00Z'), fin: aMs('2026-11-12T00:00:00Z') };
    const datos = { reservas: [reserva()], ordenes: [orden({ activoId: 'act-2' })] };
    expect(estaLibre(activo(), rango, datos)).toBe(true);
    expect(estaLibre(activo({ id: 'act-2' }), rango, datos)).toBe(false);
    const libres = activosDisponibles(
      [activo({ id: 'x', sedeBaseId: 's2' }), activo({ id: 'y', sedeBaseId: 's1' }), activo({ id: 'act-2' })],
      rango,
      datos,
      {},
      { categorias: [retro], sedes: [sede('s1', 'Caracas'), sede('s2', 'Maracaibo')] },
    );
    expect(libres.map((a) => a.id)).toEqual(['y', 'x']);
  });
});

describe('validaciones de alta', () => {
  it('RIF y cédula por formato', () => {
    expect(validarDocumento('empresa', 'J-40123456-7')).toBeNull();
    expect(validarDocumento('empresa', 'J-4012345-7')).not.toBeNull();
    expect(validarDocumento('persona', 'v-14567890')).toBeNull();
    expect(validarDocumento('persona', '14567890')).not.toBeNull();
  });

  it('placa y serial únicos, año y capacidad válidos', () => {
    const existentes = [activo({ placa: 'A12BC3D' })];
    expect(validarUnicidad({ placa: 'a12 bc3d', serial: 'NUEVO' }, existentes).placa).toContain('RET-001');
    expect(validarUnicidad({ serial: 'cat0420fxkxf01234' }, existentes).serial).toBeDefined();
    expect(validarUnicidad({ serial: 'CAT0420FXKXF01234' }, existentes, 'act-1')).toEqual({});
    expect(validarAnio(2028, 2026)).not.toBeNull();
    expect(validarCapacidad(0, retro)).not.toBeNull();
  });
});
