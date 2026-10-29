/** Validaciones de formato y unicidad (RF-INV-04, RF-CLI-01). */
import type { Activo, Categoria, TipoCliente, UnidadCapacidad } from '@/api/contrato';

/** Cédula venezolana: V-12345678 o E-12345678 (6 a 9 dígitos). */
export const CEDULA = /^[VE]-\d{6,9}$/;
/** RIF: letra J, G, V, E, P o C, 8 dígitos y dígito verificador: J-12345678-9. */
export const RIF = /^[JGVEPC]-\d{8}-\d$/;

export function validarDocumento(tipo: TipoCliente, documento: string): string | null {
  const v = documento.trim().toUpperCase();
  if (tipo === 'empresa') return RIF.test(v) ? null : 'El RIF debe tener el formato J-12345678-9.';
  return CEDULA.test(v) || RIF.test(v) ? null : 'La cédula debe tener el formato V-12345678.';
}

export const normalizarIdentificador = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');

/** Año válido: de 1980 hasta el año siguiente al actual (modelos adelantados). */
export function validarAnio(anio: number, anioActual: number): string | null {
  if (!Number.isInteger(anio)) return 'El año debe ser un número entero.';
  if (anio < 1980 || anio > anioActual + 1) return `El año debe estar entre 1980 y ${anioActual + 1}.`;
  return null;
}

export const ETIQUETA_UNIDAD: Record<UnidadCapacidad, string> = {
  pasajeros: 'pasajeros',
  kg: 'kg',
  t: 't',
  m3: 'm³',
};

export function validarCapacidad(capacidad: number, categoria: Categoria): string | null {
  if (!(capacidad > 0)) return `La capacidad debe ser mayor que 0 ${ETIQUETA_UNIDAD[categoria.unidadCapacidad]}.`;
  if (categoria.unidadCapacidad === 'pasajeros' && !Number.isInteger(capacidad))
    return 'La capacidad en pasajeros debe ser un número entero.';
  return null;
}

/** Placa y serial únicos entre los activos existentes (excluyendo el que se edita). */
export function validarUnicidad(
  datos: { placa?: string; serial: string },
  activos: readonly Activo[],
  excluirId?: string,
): { placa?: string; serial?: string } {
  const errores: { placa?: string; serial?: string } = {};
  const placa = datos.placa ? normalizarIdentificador(datos.placa) : '';
  const serial = normalizarIdentificador(datos.serial);
  for (const a of activos) {
    if (a.id === excluirId) continue;
    if (placa && a.placa && normalizarIdentificador(a.placa) === placa) errores.placa = `La placa ya pertenece a ${a.codigo}.`;
    if (normalizarIdentificador(a.serial) === serial) errores.serial = `El serial ya pertenece a ${a.codigo}.`;
  }
  return errores;
}
