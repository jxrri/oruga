import { useId, useState } from 'react';
import { Popover } from 'radix-ui';
import { CaretDownIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { cn } from '@/shared/lib/cn';
import { formatearNumero } from '@/shared/lib/formato';
import { Button } from './Button';
import { Checkbox } from './Checkbox';

export interface OpcionMulti {
  valor: string;
  etiqueta: string;
  /** Resultados que daría esta opción con los demás filtros aplicados (SPEC §10). En cero se atenúa. */
  conteo?: number;
}

export interface MultiSelectProps {
  /** Nombre del criterio: "Motor", "Sede" */
  etiqueta: string;
  opciones: readonly OpcionMulti[];
  seleccion: readonly string[];
  onCambio: (seleccion: string[]) => void;
  /** Campo de búsqueda dentro del popover; por defecto con más de 8 opciones */
  buscar?: boolean;
  disabled?: boolean;
  className?: string;
}

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Selección múltiple en popover con casillas y conteo por opción (O entre opciones del mismo criterio). */
export function MultiSelect({
  etiqueta,
  opciones,
  seleccion,
  onCambio,
  buscar = opciones.length > 8,
  disabled,
  className,
}: MultiSelectProps) {
  const base = useId();
  const [texto, setTexto] = useState('');
  const elegidas = new Set(seleccion);
  const visibles = texto ? opciones.filter((o) => normalizar(o.etiqueta).includes(normalizar(texto))) : opciones;
  const n = seleccion.length;
  const resumen =
    n === 0 ? null : n === 1 ? (opciones.find((o) => o.valor === seleccion[0])?.etiqueta ?? '1') : `${n}`;

  const alternar = (valor: string, marcar: boolean) =>
    onCambio(marcar ? [...seleccion, valor] : seleccion.filter((v) => v !== valor));

  return (
    <Popover.Root onOpenChange={(abierto) => !abierto && setTexto('')}>
      <Popover.Trigger
        disabled={disabled}
        aria-label={n ? `${etiqueta}: ${n} ${n === 1 ? 'opción elegida' : 'opciones elegidas'}` : etiqueta}
        className={cn(
          'inline-flex h-9 min-w-0 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm text-ink',
          'transition-[border-color,background-color] duration-150 ease-salida hover:border-line-strong',
          'disabled:opacity-50 data-[state=open]:border-line-strong pointer-coarse:h-11',
          n > 0 && 'border-accent/45 bg-accent-soft hover:border-accent/70',
          className,
        )}
      >
        <span className={n ? 'text-ink-2' : undefined}>{etiqueta}</span>
        {resumen && (
          <span className="max-w-32 truncate rounded-full bg-panel px-1.5 text-[12px] font-medium text-ink ring-1 ring-inset ring-line">
            {resumen}
          </span>
        )}
        <CaretDownIcon size={14} aria-hidden className="ml-auto shrink-0 text-ink-3" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[55] flex w-64 flex-col overflow-hidden rounded-xl border border-line bg-raised text-sm text-ink shadow-flotante data-[state=open]:animate-flotante-entra"
        >
          {buscar && (
            <div className="relative border-b border-line">
              <MagnifyingGlassIcon
                size={15}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                type="search"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={`Buscar en ${etiqueta.toLowerCase()}…`}
                aria-label={`Buscar en ${etiqueta.toLowerCase()}`}
                className="h-10 w-full bg-transparent pl-9 pr-3 text-base text-ink outline-none placeholder:text-ink-3 md:text-sm"
              />
            </div>
          )}
          <div role="group" aria-label={etiqueta} className="max-h-72 overflow-y-auto p-1">
            {visibles.map((o) => {
              const marcada = elegidas.has(o.valor);
              const id = `${base}-${o.valor}`;
              return (
                <div
                  key={o.valor}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-panel-2',
                    o.conteo === 0 && !marcada && 'opacity-50',
                  )}
                >
                  <Checkbox id={id} checked={marcada} onCheckedChange={(v) => alternar(o.valor, v)} />
                  <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-0.5">
                    <span className="truncate">{o.etiqueta}</span>
                    {o.conteo !== undefined && (
                      <span className="ml-auto tabular font-mono text-[12px] text-ink-3">
                        {formatearNumero(o.conteo)}
                        <span className="sr-only"> resultados</span>
                      </span>
                    )}
                  </label>
                </div>
              );
            })}
            {!visibles.length && <p className="px-2.5 py-3 text-ink-3">Sin coincidencias para “{texto}”.</p>}
          </div>
          <div className="flex items-center justify-between border-t border-line px-2.5 py-2">
            <span className="text-[12px] text-ink-3">
              {n ? `${n} ${n === 1 ? 'elegida' : 'elegidas'}` : 'Ninguna elegida'}
            </span>
            <Button tamano="sm" variante="fantasma" disabled={!n} onClick={() => onCambio([])}>
              Limpiar
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
