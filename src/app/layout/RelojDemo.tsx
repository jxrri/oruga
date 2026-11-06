import { useSyncExternalStore } from 'react';
import { ClockIcon } from '@phosphor-icons/react';
import { useGetSedesQuery } from '@/api/baseApi';
import { ahora, etiquetaDesfase, formatear } from '@/shared/lib/fechas';
import { useUsuario } from '../hooks';

const ZONA_POR_DEFECTO = 'America/Caracas';

// Un solo intervalo por suscriptor; el texto cambia una vez por minuto y React descarta los renders iguales.
const suscribirTic = (avisar: () => void) => {
  const t = setInterval(avisar, 5000);
  return () => clearInterval(t);
};

/** Reloj de demo (SPEC §11.1): "hoy" configurable mostrado en la zona de la sede del usuario. */
export function RelojDemo() {
  const usuario = useUsuario();
  const { data: sedes } = useGetSedesQuery(undefined, { skip: !usuario });
  const sede = sedes?.find((s) => s.id === usuario?.sedeId);
  const zona = sede?.zonaHoraria ?? ZONA_POR_DEFECTO;

  const marca = useSyncExternalStore(suscribirTic, () => formatear(ahora(), zona, "EEE dd MMM'|'HH:mm"));
  const [dia, hora] = marca.split('|');
  const desfase = etiquetaDesfase(ahora(), zona);

  return (
    <p
      className="hidden items-center gap-2 rounded-lg px-2 font-mono text-[13px] text-ink-2 md:flex"
      title={`Reloj de demo. Hora de ${sede?.nombre ?? 'la sede'} (${zona})`}
    >
      <ClockIcon size={16} aria-hidden className="text-ink-3" />
      <span className="sr-only">Hora de la demo en {sede?.ciudad ?? 'la sede'}:</span>
      <span>{dia}</span>
      <span className="tabular font-medium text-ink">{hora}</span>
      <span className="text-ink-3">{desfase}</span>
      {sede && <span className="hidden font-sans text-ink-3 xl:inline">{sede.ciudad}</span>}
    </p>
  );
}
