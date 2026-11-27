import {
  ArrowsClockwiseIcon,
  MagnifyingGlassIcon,
  SquaresFourIcon,
  TableIcon,
  WrenchIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Categoria, Sede, TipoActivo, TipoMotor } from '@/api/contrato';
import type { EstadoVisible } from '@/domain/estadoActivo';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { cn } from '@/shared/lib/cn';
import { IconButton, SegmentedControl } from '@/shared/ui';
import { Input } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';
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
    tipo?: Record<string, number>;
    motores?: Record<string, number>;
  };
  modoVista: 'tarjetas' | 'tabla';
  onCambioModoVista: (modo: 'tarjetas' | 'tabla') => void;
}

const ESTADOS_DISPONIBLES: { valor: EstadoVisible; etiqueta: string }[] = [
  { valor: 'disponible', etiqueta: 'Disponible' },
  { valor: 'proxima_salida', etiqueta: 'Próx. salida' },
  { valor: 'en_alquiler', etiqueta: 'En alquiler' },
  { valor: 'en_mantenimiento', etiqueta: 'En taller' },
  { valor: 'fuera_de_servicio', etiqueta: 'Fuera de servicio' },
  { valor: 'baja', etiqueta: 'Baja' },
];

/** Radix Select no admite el valor vacío: "sin filtro" viaja como este centinela */
const TODAS = 'todas';

/** Chip de filtro: el seleccionado se marca con el acento suave, nunca con un borde de color */
const claseChip = (activo: boolean) =>
  cn(
    'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-medium pointer-coarse:h-10',
    'transition-[color,background-color,box-shadow] duration-150 ease-salida',
    activo
      ? 'bg-accent-soft text-accent-fg'
      : 'text-ink-2 ring-1 ring-inset ring-line hover:bg-panel-2 hover:text-ink',
  );

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
    <div className="space-y-3">
      {/* Fila principal: búsqueda a la izquierda, selectores y conmutador de vista a la derecha */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-[22rem]">
          <Input
            icono={MagnifyingGlassIcon}
            aria-label="Buscar activos"
            placeholder="Buscar por código, placa, marca o serial…"
            value={filtros.q}
            onChange={(e) => dispatch(filtroCambiado({ q: e.target.value }))}
            className="[&_input]:pr-9"
          />
          {filtros.q && (
            <IconButton
              icono={XIcon}
              aria-label="Borrar búsqueda"
              tamano="sm"
              tooltip={false}
              onClick={() => dispatch(filtroCambiado({ q: '' }))}
              className="absolute right-0.5 top-1/2 -translate-y-1/2"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="grid basis-full grid-cols-2 gap-2 sm:flex sm:basis-auto">
            <Select
              aria-label="Categoría"
              valor={filtros.categorias[0] ?? TODAS}
              onCambio={(v) => dispatch(filtroCambiado({ categorias: v === TODAS ? [] : [v] }))}
              opciones={[
                { valor: TODAS, etiqueta: 'Todas las categorías' },
                ...categorias.map((c) => ({
                  valor: c.slug,
                  etiqueta: `${c.nombre} (${conteos.categorias[c.slug] ?? 0})`,
                })),
              ]}
              className="sm:w-52"
            />

            <Select
              aria-label="Sede"
              valor={filtros.sedes[0] ?? TODAS}
              onCambio={(v) => dispatch(filtroCambiado({ sedes: v === TODAS ? [] : [v] }))}
              opciones={[
                { valor: TODAS, etiqueta: 'Todas las sedes' },
                ...sedes.map((s) => ({ valor: s.clave, etiqueta: s.nombre })),
              ]}
              className="sm:w-48"
            />
          </div>

          {totalActivos > 0 && (
            <IconButton
              icono={ArrowsClockwiseIcon}
              aria-label="Restablecer filtros"
              onClick={() => dispatch(filtrosLimpiados())}
            />
          )}

          <SegmentedControl
            valor={modoVista}
            onCambio={onCambioModoVista}
            opciones={[
              { valor: 'tarjetas', etiqueta: 'Tarjetas', icono: SquaresFourIcon },
              { valor: 'tabla', etiqueta: 'Tabla', icono: TableIcon },
            ]}
            aria-label="Modo de visualización"
            className="ml-auto"
          />
        </div>
      </div>

      {/* Chips de estado operativo y de mantenimiento próximo */}
      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap items-center gap-1.5">
        {ESTADOS_DISPONIBLES.map((est) => {
          const activo = filtros.estados.includes(est.valor);

          return (
            <button
              key={est.valor}
              type="button"
              aria-pressed={activo}
              onClick={() => dispatch(opcionAlternada({ lista: 'estados', valor: est.valor }))}
              className={claseChip(activo)}
            >
              {est.etiqueta}
              <span className={cn('tabular', !activo && 'text-ink-3')}>{conteos.estados[est.valor] ?? 0}</span>
            </button>
          );
        })}

        <span aria-hidden className="mx-1 h-4 w-px bg-line" />

        <button
          type="button"
          aria-pressed={filtros.mantenimientoProximo}
          onClick={() => dispatch(filtroCambiado({ mantenimientoProximo: !filtros.mantenimientoProximo }))}
          className={claseChip(filtros.mantenimientoProximo)}
        >
          <WrenchIcon size={15} aria-hidden />
          Próx. service
        </button>

        <span aria-hidden className="mx-1 h-4 w-px bg-line" />

        <Select
          aria-label="Tipo de activo"
          tamano="sm"
          valor={filtros.tipo ?? TODAS}
          onCambio={(v) => dispatch(filtroCambiado({ tipo: v === TODAS ? null : (v as TipoActivo) }))}
          opciones={[
            { valor: TODAS, etiqueta: 'Vehículo y maquinaria' },
            { valor: 'maquinaria', etiqueta: `Maquinaria (${conteos.tipo?.maquinaria ?? 0})` },
            { valor: 'vehiculo', etiqueta: `Vehículos (${conteos.tipo?.vehiculo ?? 0})` },
          ]}
          className="w-44"
        />

        <Select
          aria-label="Tipo de motor"
          tamano="sm"
          valor={filtros.motores[0] ?? TODAS}
          onCambio={(v) => dispatch(filtroCambiado({ motores: v === TODAS ? [] : [v as TipoMotor] }))}
          opciones={[
            { valor: TODAS, etiqueta: 'Todos los motores' },
            { valor: 'diesel', etiqueta: `Diésel (${conteos.motores?.diesel ?? 0})` },
            { valor: 'gasolina', etiqueta: `Gasolina (${conteos.motores?.gasolina ?? 0})` },
            { valor: 'electrico', etiqueta: `Eléctrico (${conteos.motores?.electrico ?? 0})` },
            { valor: 'hibrido', etiqueta: `Híbrido (${conteos.motores?.hibrido ?? 0})` },
            { valor: 'gas', etiqueta: `Gas (${conteos.motores?.gas ?? 0})` },
          ]}
          className="w-40"
        />

        <div className="flex items-center gap-1.5 text-xs text-ink-3">
          <span>Libre entre:</span>
          <input
            type="date"
            aria-label="Disponible desde"
            value={filtros.disponibleEntre?.desde ?? ''}
            onChange={(e) => {
              const desde = e.target.value;
              const hasta = filtros.disponibleEntre?.hasta || desde;
              dispatch(filtroCambiado({ disponibleEntre: desde ? { desde, hasta: hasta >= desde ? hasta : desde } : null }));
            }}
            className="h-8 rounded-lg border border-line bg-panel px-2 text-xs text-ink"
          />
          <span>a</span>
          <input
            type="date"
            aria-label="Disponible hasta"
            value={filtros.disponibleEntre?.hasta ?? ''}
            onChange={(e) => {
              const hasta = e.target.value;
              const desde = filtros.disponibleEntre?.desde || hasta;
              dispatch(filtroCambiado({ disponibleEntre: hasta ? { desde: desde <= hasta ? desde : hasta, hasta } : null }));
            }}
            className="h-8 rounded-lg border border-line bg-panel px-2 text-xs text-ink"
          />
        </div>
      </div>
    </div>
  );
}
