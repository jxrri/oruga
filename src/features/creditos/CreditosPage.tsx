import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { todasLasImagenes, urlImagen, type ImagenLocal } from '@/shared/lib/imagenes';

const GRUPOS = [
  { grupo: 'categorias', titulo: 'Categorías de activos' },
  { grupo: 'escenas', titulo: 'Escenas' },
] as const;

const NOMBRES: Record<string, string> = {
  excavadora: 'Excavadora',
  retroexcavadora: 'Retroexcavadora',
  'cargador-frontal': 'Cargador frontal',
  'grua-movil': 'Grúa móvil',
  montacargas: 'Montacargas',
  minicargador: 'Minicargador',
  motoniveladora: 'Motoniveladora',
  compactador: 'Compactador',
  'camion-volteo': 'Camión de volteo',
  'camioneta-pickup': 'Camioneta pickup',
  'furgon-carga': 'Furgón de carga',
  minibus: 'Minibús',
  hero: 'Inicio de sesión',
  patio: 'Patio de flota',
  inspeccion: 'Evidencias de inspección',
  mantenimiento: 'Taller de mantenimiento',
};

const MINIATURA = { ancho: 96, alto: 64 };

function EnlaceExterno({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-accent-fg underline-offset-2 hover:underline"
    >
      {children}
      <ArrowSquareOutIcon size={16} aria-hidden="true" />
      <span className="sr-only">(se abre en otra pestaña)</span>
    </a>
  );
}

function Credito({ grupo, img }: { grupo: 'categorias' | 'escenas'; img: ImagenLocal }) {
  return (
    <li className="flex gap-4 px-4 py-3">
      <img
        src={urlImagen(grupo, img, 'sm')}
        alt={img.alt}
        width={MINIATURA.ancho}
        height={MINIATURA.alto}
        loading="lazy"
        decoding="async"
        className="h-16 w-24 shrink-0 rounded-lg bg-panel-2 object-cover"
      />
      <div className="min-w-0 text-sm">
        <p className="truncate font-medium text-ink" title={img.titulo}>
          “{img.titulo}”
        </p>
        <p className="text-ink-2">Autor: {img.autor}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-ink-2">
          <span>
            Licencia:{' '}
            {img.urlLicencia ? <EnlaceExterno href={img.urlLicencia}>{img.licencia}</EnlaceExterno> : img.licencia}
          </span>
          <EnlaceExterno href={img.fuente}>Ver en Wikimedia Commons</EnlaceExterno>
        </p>
      </div>
    </li>
  );
}

export default function CreditosPage() {
  const imagenes = todasLasImagenes();
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Créditos de imágenes</h1>
        <p className="text-sm text-ink-3">
          {imagenes.length} fotografías de Wikimedia Commons con licencia libre, optimizadas para la web sin cambiar
          su contenido. Gracias a sus autores.
        </p>
      </header>

      {GRUPOS.map(({ grupo, titulo }) => {
        const claves = [...new Set(imagenes.filter((i) => i.grupo === grupo).map((i) => i.clave))];
        if (!claves.length) return null;
        return (
          <section key={grupo} aria-labelledby={`creditos-${grupo}`} className="space-y-4">
            <h2 id={`creditos-${grupo}`} className="text-base font-semibold text-ink">
              {titulo}
            </h2>
            {claves.map((clave) => (
              <div key={clave} className="space-y-2">
                <h3 className="text-sm font-medium text-ink-2">{NOMBRES[clave] ?? clave}</h3>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
                  {imagenes
                    .filter((i) => i.grupo === grupo && i.clave === clave)
                    .map(({ img }) => (
                      <Credito key={img.archivo} grupo={grupo} img={img} />
                    ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
