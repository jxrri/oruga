import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { Input, type InputProps } from '@/shared/ui/Field';

/** Campo de clave con botón para verla, así el registro no la pide dos veces. Va dentro de un Field. */
export function CampoClave(props: Omit<InputProps, 'type' | 'icono' | 'sufijo' | 'className'>) {
  const [visible, setVisible] = useState(false);
  const Icono = visible ? EyeSlashIcon : EyeIcon;
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="h-11 pr-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar la clave' : 'Mostrar la clave'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-ink-3 transition-colors duration-150 hover:text-ink"
      >
        <Icono size={18} aria-hidden />
      </button>
    </div>
  );
}
