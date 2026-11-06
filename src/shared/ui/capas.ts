/**
 * Escala de z-index (docs/DISENO.md). `flotante` (menús, popovers, tooltips) queda sobre el diálogo
 * para que un Select o un menú funcione dentro de un diálogo o panel.
 */
export const CAPAS = {
  base: 0,
  sticky: 10,
  cabecera: 20,
  menu: 30,
  overlay: 40,
  dialogo: 50,
  flotante: 55,
  toast: 60,
} as const;

/** Clases de Tailwind equivalentes (literales para que el escáner las detecte). */
export const Z = {
  sticky: 'z-10',
  cabecera: 'z-20',
  menu: 'z-30',
  overlay: 'z-40',
  dialogo: 'z-50',
  flotante: 'z-[55]',
  toast: 'z-60',
} as const;
