// Marcador temporal: lo reemplaza la tarea T4 (redirección a /login y 403 por rol).
import type { ReactNode } from 'react';
import type { Recurso } from './permisos';

export default function RutaProtegida({ children }: { recurso: Recurso; children: ReactNode }) {
  return <>{children}</>;
}
