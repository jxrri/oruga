import { cn } from '@/shared/lib/cn';

/** Marca de Oruga: reutiliza el archivo del favicon para no duplicar el dibujo. */
export function MarcaOruga({ className }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}favicon.svg`}
      alt=""
      width={32}
      height={32}
      decoding="async"
      className={cn('size-8 shrink-0 rounded-lg ring-1 ring-line', className)}
    />
  );
}
