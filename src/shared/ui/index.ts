/**
 * Kit de UI de Oruga (docs/DISENO.md). Importar desde '@/shared/ui'.
 *
 * Button          variante primario|secundario|fantasma|peligro, tamano sm|md|lg, cargando (true | "Guardando…"),
 *                 icono / iconoFin (componente Phosphor), asChild (para <Link>).
 * IconButton      aria-label obligatorio, icono, tooltip (por defecto el aria-label; false lo quita).
 *                 Como Trigger de un menú usar tooltip={false} y envolver con <Tooltip>.
 * Tooltip         contenido, lado. TooltipProvider va en providers.tsx (sin él funciona igual en pruebas).
 * DropdownMenu*   Content, Item (icono, tono="peligro"), RadioGroup/RadioItem, CheckboxItem, Label, Separator.
 * Sheet           Root controlado; SheetContent titulo, descripcion, pie, lado derecha|izquierda.
 * Badge           tono neutro|acento|ok|warn|danger|info|mnt + icono (el color nunca va solo).
 * Switch          checked, onCheckedChange, etiqueta, descripcion.
 * SegmentedControl<T> valor, onCambio, opciones [{ valor, etiqueta, icono? }], aria-label, tamano.
 * Skeleton        className con el alto y ancho del contenido final.
 * EmptyState      icono (duotone), titulo, descripcion, accion.
 * ErrorState      error crudo de RTK Query (usa describirError), onReintentar, titulo, compacto.
 * Avatar          nombre (monograma con iniciales), tamano sm|md|lg, activo.
 * CAPAS / Z       escala de z-index.
 */
export { Button, IconButton, variantesBoton, type ButtonProps, type IconButtonProps } from './Button';
export { Tooltip, TooltipProvider, type TooltipProps } from './Tooltip';
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './DropdownMenu';
export { Sheet, SheetClose, SheetContent, SheetTrigger, type SheetContentProps } from './Sheet';
export { Badge, variantesBadge, type BadgeProps } from './Badge';
export { Switch, type SwitchProps } from './Switch';
export { SegmentedControl, type OpcionSegmento, type SegmentedControlProps } from './SegmentedControl';
export { Skeleton } from './Skeleton';
export { EmptyState, ErrorState } from './Estados';
export { Avatar } from './Avatar';
export { CAPAS, Z } from './capas';
