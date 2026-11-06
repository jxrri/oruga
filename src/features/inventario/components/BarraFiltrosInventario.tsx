import {
  ArrowsClockwiseIcon,
  MagnifyingGlassIcon,
  SquaresFourIcon,
  TableIcon,
  WrenchIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Categoria, Sede } from '@/api/contrato';
import type { EstadoVisible } from '@/domain/estadoActivo';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button, IconButton, SegmentedControl } from '@/shared/ui';
import {
  filtroCambiado,
  filtrosLimpiados,
  opcionAlternada,
  contarFiltrosActivos,
} from '@/features/filtros/filtrosSlice';

export interface BarraFiltrosInventarioProps {
  categorias: Categoria[];
  sedes: Sede[];
  conteos: {
    estados: Record<string, number>;
    categorias: Record<string, number>;
  };
  modoVista: 'tarjetas' | 'tabla';
  onCambioModoVista: (modo: 'tarjetas' | 'tabla') => void;
}

const ESTADOS_DISPONIBLES: { valor: EstadoVisible; etiqueta: string; color: string }[] = [
  { valor: 'disponible', etiqueta: 'Disponible', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  { valor: 'proxima_salida', etiqueta: 'Próx. Salida', color: 'border-sky-500/40 text-sky-400 bg-sky-500/10' },
  { valor: 'en_alquiler', etiqueta: 'En Alquiler', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
  { valor: 'en_mantenimiento', etiqueta: 'En Taller', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  { valor: 'fuera_de_servicio', etiqueta: 'Fuera de Servicio', color: 'border-destructive/40 text-destructive bg-destructive/10' },
  { valor: 'baja', etiqueta: 'Baja', color: 'border-muted text-muted-foreground bg-muted/20' },
];

export function BarraFiltrosInventario({
  categorias,
  sedes,
  conteos,
  modoVista,
  onCambioModoVista,
}: BarraFiltrosInventarioProps) {
  const dispatch = useAppDispatch();
  const filtros = useAppSelector((s) => s.filtros.actual);
  const totalActivos = contarFiltrosActivos(filtros);

  return (
    <div className="space-y-3 border-b border-border bg-card/40 p-4 backdrop-blur-md">
      {/* Fila principal: Búsqueda, Selectores y Conmutador de Vista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Barra de búsqueda */}
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por código, placa, marca o serial..."
            value={filtros.q}
            onChange={(e) => dispatch(filtroCambiado({ q: e.target.value }))}
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {filtros.q && (
            <button
              type="button"
              onClick={() => dispatch(filtroCambiado({ q: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtros rápidos: Categoría y Sede */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Categoría */}
          <select
            value={filtros.categorias[0] ?? ''}
            onChange={(e) =>
              dispatch(
                filtroCambiado({
                  categorias: e.target.value ? [e.target.value] : [],
                }),
              )
            }
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.nombre} ({conteos.categorias[c.slug] ?? 0})
              </option>
            ))}
          </select>

          {/* Selector de Sede */}
          <select
            value={filtros.sedes[0] ?? ''}
            onChange={(e) =>
              dispatch(
                filtroCambiado({
                  sedes: e.target.value ? [e.target.value] : [],
                }),
              )
            }
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.clave}>
                {s.nombre}
              </option>
            ))}
          </select>

          {/* Botón Mantenimiento Próximo */}
          <Button
            variante={filtros.mantenimientoProximo ? 'peligro' : 'secundario'}
            tamano="sm"
            icono={WrenchIcon}
            onClick={() =>
              dispatch(
                filtroCambiado({
                  mantenimientoProximo: !filtros.mantenimientoProximo,
                }),
              )
            }
            className="text-xs"
          >
            Próx. Service
          </Button>

          {/* Limpiar Filtros */}
          {totalActivos > 0 && (
            <IconButton
              icono={ArrowsClockwiseIcon}
              aria-label="Restablecer filtros"
              tamano="sm"
              variante="fantasma"
              onClick={() => dispatch(filtrosLimpiados())}
            />
          )}

          {/* Selector Modo Vista */}
          <SegmentedControl
            valor={modoVista}
            onCambio={onCambioModoVista}
            opciones={[
              { valor: 'tarjetas', etiqueta: '', icono: SquaresFourIcon },
              { valor: 'tabla', etiqueta: '', icono: TableIcon },
            ]}
            aria-label="Modo de visualización"
            tamano="sm"
          />
        </div>
      </div>

      {/* Fila de Chips de Estado Operativo */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-bold text-muted-foreground mr-1 uppercase tracking-wider">
          Estado:
        </span>
        {ESTADOS_DISPONIBLES.map((est) => {
          const activo = filtros.estados.includes(est.valor);
          const cantidad = conteos.estados[est.valor] ?? 0;

          return (
            <button
              key={est.valor}
              type="button"
              onClick={() => dispatch(opcionAlternada({ lista: 'estados', valor: est.valor }))}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                activo
                  ? `${est.color} ring-1 ring-primary/40 shadow-xs font-bold`
                  : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <span>{est.etiqueta}</span>
              <span className="font-mono text-[10px] opacity-70">({cantidad})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
