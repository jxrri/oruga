/**
 * Navegador compartido por la captura de pantallas y la generación del PDF del manual.
 *
 * Usa el Chromium que instala `npx playwright install chromium`. Si no está instalado, la variable
 * BROWSER_PATH puede apuntar a cualquier navegador basado en Chromium (Chrome, Edge, Brave).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const MANUAL_DIR = path.join(ROOT, 'docs', 'user-manual');
export const SCREENSHOTS_DIR = path.join(MANUAL_DIR, 'screenshots');

export async function launchBrowser() {
  const executablePath = process.env.BROWSER_PATH;
  if (executablePath && !existsSync(executablePath)) {
    throw new Error(`BROWSER_PATH no existe: ${executablePath}`);
  }
  try {
    // --lang hace que los campos de fecha nativos usen el formato venezolano (dd/mm/aaaa).
    return await chromium.launch({ executablePath: executablePath || undefined, args: ['--lang=es-VE'] });
  } catch (error) {
    throw new Error(
      'No se pudo abrir un navegador. Ejecuta "npx playwright install chromium" o define BROWSER_PATH ' +
        `con la ruta de Chrome, Edge o Brave.\n${error.message}`,
    );
  }
}
