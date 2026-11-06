/** Arranca MSW en el navegador: intercepta fetch('/api/...') sin que la app lo sepa (SPEC §11). */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export async function iniciarMocks(): Promise<void> {
  await setupWorker(...handlers).start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}
