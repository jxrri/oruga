import type { CSSProperties, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner';
import { useAplicarTema } from '@/shared/hooks/useAplicarTema';
import { TooltipProvider } from '@/shared/ui/Tooltip';
import { store } from './store';

// Sonner toma sus colores de estas variables: así los toasts usan los tokens de Oruga en ambos temas.
const estiloToasts = {
  '--normal-bg': 'var(--raised)',
  '--normal-border': 'var(--line)',
  '--normal-text': 'var(--ink)',
  '--border-radius': '12px',
} as CSSProperties;

function Interior({ children }: { children: ReactNode }) {
  const tema = useAplicarTema();
  return (
    <TooltipProvider>
      {children}
      <Toaster
        theme={tema === 'oscuro' ? 'dark' : 'light'}
        position="bottom-right"
        containerAriaLabel="Notificaciones"
        closeButton
        style={estiloToasts}
        toastOptions={{ className: 'font-sans text-sm shadow-flotante' }}
      />
    </TooltipProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <Interior>{children}</Interior>
    </Provider>
  );
}
