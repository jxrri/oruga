import { useId, useRef, type ChangeEvent } from 'react';
import { CameraIcon, ProhibitIcon, WarningCircleIcon, WarningIcon, XIcon } from '@phosphor-icons/react';
import type { CampoPlantilla } from '@/api/contrato';
import { cn } from '@/shared/lib/cn';
import { pluralizar } from '@/shared/lib/formato';
import { Badge, Button, IconButton, type ButtonProps } from '@/shared/ui';
import { Input } from '@/shared/ui/Field';

/** Respuesta elegible: botón de 44 px (se usa de pie y en teléfono) que queda marcado al elegirlo. */
function Opcion({ activa, className, ...props }: ButtonProps & { activa: boolean }) {
  return (
    <Button
      tamano="lg"
      aria-pressed={activa}
      className={cn(
        'min-w-20',
        activa && 'border-accent bg-accent-soft text-accent-fg hover:border-accent hover:bg-accent-soft',
        className,
      )}
      {...props}
    />
  );
}

export interface CampoInspeccionProps {
  campo: CampoPlantilla;
  valor: unknown;
  /** La respuesta actual cuenta como falla según la plantilla */
  esFalla: boolean;
  onCambio: (valor: unknown) => void;
  onAgregarFoto: () => void;
  onSubirFotos?: (archivos: FileList) => void;
  onQuitarFoto: (indice: number) => void;
  subiendoFoto?: boolean;
}

/**
 * Un punto de control del checklist: una pregunta por fila, con la respuesta a la derecha en
 * escritorio y debajo en móvil. No guarda estado: la página decide visibilidad, valor y veredicto.
 */
export function CampoInspeccion({
  campo,
  valor,
  esFalla,
  onCambio,
  onAgregarFoto,
  onSubirFotos,
  onQuitarFoto,
  subiendoFoto = false,
}: CampoInspeccionProps) {
  const id = useId();
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const idEtiqueta = `${id}-etiqueta`;
  const esEntrada = campo.tipo === 'numero' || campo.tipo === 'nivel' || campo.tipo === 'texto' || campo.tipo === 'firma';
  const enLinea = campo.tipo === 'si_no' || campo.tipo === 'numero' || campo.tipo === 'nivel';
  const fotos = campo.tipo === 'foto' && Array.isArray(valor) ? (valor as string[]) : [];
  const seleccionMulti = campo.tipo === 'multi' && Array.isArray(valor) ? (valor as string[]) : [];

  const alternarMulti = (opc: string) => {
    const existe = seleccionMulti.includes(opc);
    const siguiente = existe ? seleccionMulti.filter((x) => x !== opc) : [...seleccionMulti, opc];
    onCambio(siguiente);
  };

  return (
    <div className={cn('py-4', enLinea && 'sm:flex sm:items-center sm:justify-between sm:gap-8')}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <label
            id={idEtiqueta}
            htmlFor={esEntrada ? id : undefined}
            className="texto-bonito text-[15px] font-medium text-ink sm:text-sm"
          >
            {campo.etiqueta}
            {campo.requerido && (
              <span aria-hidden className="ml-0.5 text-danger">
                *
              </span>
            )}
          </label>
          {esFalla ? (
            <Badge tono={campo.critico ? 'danger' : 'warn'} icono={campo.critico ? ProhibitIcon : WarningCircleIcon}>
              {campo.critico ? 'Falla crítica' : 'Falla'}
            </Badge>
          ) : (
            campo.critico && <Badge icono={WarningIcon}>Crítico</Badge>
          )}
        </div>
        {campo.ayuda && <p className="texto-bonito mt-0.5 text-[13px] text-ink-3">{campo.ayuda}</p>}
        {campo.tipo === 'foto' && campo.fotosMin && campo.fotosMin > 0 && (
          <p className="mt-0.5 text-xs text-ink-3">
            Mínimo {pluralizar(campo.fotosMin, 'foto')} ({fotos.length}/{campo.fotosMin})
          </p>
        )}
      </div>

      <div className={cn('mt-3', enLinea && 'sm:mt-0 sm:shrink-0')}>
        {campo.tipo === 'si_no' && (
          <div role="group" aria-labelledby={idEtiqueta} className="grid grid-cols-2 gap-2 sm:flex">
            <Opcion activa={valor === true} onClick={() => onCambio(true)}>
              Sí
            </Opcion>
            <Opcion activa={valor === false} onClick={() => onCambio(false)}>
              No
            </Opcion>
          </div>
        )}

        {campo.tipo === 'opcion' && campo.opciones && (
          <div role="group" aria-labelledby={idEtiqueta} className="flex flex-wrap gap-2">
            {campo.opciones.map((opc) => (
              <Opcion key={opc} activa={valor === opc} onClick={() => onCambio(opc)}>
                {opc}
              </Opcion>
            ))}
          </div>
        )}

        {campo.tipo === 'multi' && campo.opciones && (
          <div role="group" aria-labelledby={idEtiqueta} className="flex flex-wrap gap-2">
            {campo.opciones.map((opc) => (
              <Opcion key={opc} activa={seleccionMulti.includes(opc)} onClick={() => alternarMulti(opc)}>
                {opc}
              </Opcion>
            ))}
          </div>
        )}

        {(campo.tipo === 'numero' || campo.tipo === 'nivel') && (
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            min={campo.min}
            max={campo.max}
            aria-required={campo.requerido}
            value={(valor as number) ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onCambio(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-11 font-mono sm:w-32"
          />
        )}

        {(campo.tipo === 'texto' || campo.tipo === 'firma') && (
          <Input
            id={id}
            type="text"
            aria-required={campo.requerido}
            autoComplete={campo.tipo === 'firma' ? 'name' : 'off'}
            value={(valor as string) ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onCambio(e.target.value)}
            placeholder={campo.tipo === 'firma' ? 'Nombre y apellido' : 'Describa el hallazgo…'}
            className="h-11"
          />
        )}

        {campo.tipo === 'foto' && (
          <div role="group" aria-labelledby={idEtiqueta} className="space-y-3">
            {fotos.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {fotos.map((url, i) => (
                  <li key={`${url}-${i}`} className="relative">
                    <img
                      src={url}
                      alt={`Foto ${i + 1}: ${campo.etiqueta}`}
                      width={112}
                      height={84}
                      loading="lazy"
                      decoding="async"
                      className="h-[84px] w-28 rounded-lg border border-line bg-panel-2 object-cover"
                    />
                    <IconButton
                      aria-label={`Quitar foto ${i + 1}`}
                      icono={XIcon}
                      variante="secundario"
                      tamano="sm"
                      className="absolute right-1 top-1 pointer-coarse:size-11"
                      onClick={() => onQuitarFoto(i)}
                    />
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {onSubirFotos && (
                <>
                  <input
                    ref={inputArchivoRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        onSubirFotos(e.target.files);
                        e.target.value = '';
                      }
                    }}
                  />
                  <Button
                    tamano="lg"
                    icono={CameraIcon}
                    cargando={subiendoFoto ? 'Subiendo…' : false}
                    onClick={() => inputArchivoRef.current?.click()}
                    className="w-full sm:w-auto"
                  >
                    Subir foto
                  </Button>
                </>
              )}
              <Button
                variante={onSubirFotos ? 'fantasma' : 'secundario'}
                tamano="lg"
                icono={onSubirFotos ? undefined : CameraIcon}
                onClick={onAgregarFoto}
                disabled={subiendoFoto}
                className="w-full sm:w-auto"
              >
                {onSubirFotos ? 'Usar foto de prueba' : 'Tomar foto'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
