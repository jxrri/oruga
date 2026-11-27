/**
 * Captura las pantallas del manual de usuario en docs/user-manual/screenshots.
 *
 * Levanta Vite en modo desarrollo, carga los datos de demostración (generarSemilla) en la base local del
 * navegador y recorre cada módulo con las cuentas de demostración. Algunas capturas ejecutan flujos reales
 * (inspección de salida, despacho, inspección de devolución y devolución) sobre la reserva de demostración.
 *
 * Uso: node scripts/user-manual/capture.mjs [nombre-de-paso ...]
 * Sin argumentos ejecuta todos los pasos en orden; con argumentos, solo los indicados.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { ROOT, SCREENSHOTS_DIR, launchBrowser } from './browser.mjs';

const VIEWPORT = { width: 1440, height: 900 };
const ACCOUNTS = {
  admin: 'Mariana Urdaneta',
  planner: 'Luis Alberto Ferrer',
  inspector: 'José Gregorio Morillo',
  maintenance: 'Carlos Briceño',
  manager: 'Andreína Colmenares',
};
// Reserva sembrada para la demostración: confirmada, con salida hoy (src/mocks/escenarios.ts).
const DEMO_RESERVATION = 'res-demo-salida';
const DEMO_ASSET = 'act-ret-001';
const BLOCKED_CLIENT = 'cli-007';

let baseUrl = '';
let page;

/* ---------- utilidades ---------- */

const url = (route) => `${baseUrl}${route}`;

/** Espera a que la página termine de pedir datos y de pintar los esqueletos de carga. */
async function settle() {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page
    .waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15_000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

async function go(route, readyLocator) {
  await page.goto(url(route));
  if (readyLocator) await readyLocator().waitFor({ timeout: 20_000 });
  await settle();
}

/** Dibuja marcadores numerados sobre los elementos indicados (coordenadas de la ventana). */
async function drawMarks(marks) {
  const items = [];
  for (const [label, locator] of marks) {
    const box = await locator.boundingBox({ timeout: 5000 });
    if (!box) throw new Error(`Marcador ${label}: el elemento no es visible.`);
    items.push({ label, box });
  }
  await page.evaluate((list) => {
    const layer = document.createElement('div');
    layer.id = 'manual-marks';
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
    for (const { label, box } of list) {
      const ring = document.createElement('div');
      ring.style.cssText =
        `position:fixed;left:${box.x - 3}px;top:${box.y - 3}px;width:${box.width + 6}px;` +
        `height:${box.height + 6}px;border:2px solid #ffc21a;border-radius:9px;` +
        'box-shadow:0 0 0 1px rgba(12,13,15,.55)';
      const badge = document.createElement('div');
      badge.textContent = label;
      const left = Math.max(2, Math.min(window.innerWidth - 26, box.x - 11));
      const top = Math.max(2, Math.min(window.innerHeight - 26, box.y - 11));
      badge.style.cssText =
        `position:fixed;left:${left}px;top:${top}px;width:24px;height:24px;border-radius:12px;` +
        'background:#0c0d0f;color:#ffc21a;font:700 13px/24px system-ui,sans-serif;text-align:center;' +
        'box-shadow:0 0 0 2px #ffc21a,0 2px 6px rgba(0,0,0,.35)';
      layer.append(ring, badge);
    }
    document.body.append(layer);
  }, items);
}

/**
 * Guarda una captura. Por defecto, la ventana visible; `clip` recorta (en coordenadas de la ventana o,
 * con `fullPage`, del documento). Los avisos emergentes se ocultan salvo que se pida lo contrario.
 */
async function shot(name, { clip, fullPage = false, marks = [], keepToasts = false } = {}) {
  const style = keepToasts
    ? null
    : await page.addStyleTag({ content: '[data-sonner-toaster]{display:none!important}' });
  // Aparta el puntero a una zona vacía de la barra lateral para que no queden tooltips ni resaltados.
  await page.mouse.move(120, 640);
  await page.waitForTimeout(250);
  if (marks.length) await drawMarks(marks);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), clip, fullPage });
  await page.evaluate(() => document.getElementById('manual-marks')?.remove());
  if (style) await style.evaluate((node) => node.remove());
  console.log(`  ✓ ${name}.png`);
}

/**
 * Rectángulo (en coordenadas del documento) de la tarjeta que contiene un texto: busca el elemento más
 * profundo con ese texto y sube hasta el primer ancestro con borde y esquinas redondeadas.
 */
async function cardRect(text, { padding = 14, minWidth = 280 } = {}) {
  const rect = await page.evaluate(
    ({ text, minWidth }) => {
      // Elementos más profundos cuyo texto empieza por el buscado (ninguno de sus hijos lo cumple).
      const starts = (el) => el.textContent.trim().startsWith(text);
      const matches = [...document.querySelectorAll('main *')].filter(
        (el) => starts(el) && ![...el.children].some(starts),
      );
      for (let el of matches) {
        while (el && el !== document.body) {
          const style = getComputedStyle(el);
          const bordered = parseFloat(style.borderTopWidth) > 0 && parseFloat(style.borderTopLeftRadius) > 0;
          if (bordered && el.getBoundingClientRect().width >= minWidth) {
            const r = el.getBoundingClientRect();
            return { x: r.left, y: r.top + window.scrollY, width: r.width, height: r.height };
          }
          el = el.parentElement;
        }
      }
      return null;
    },
    { text, minWidth },
  );
  if (!rect) throw new Error(`No se encontró una tarjeta con el texto "${text}".`);
  return {
    x: Math.max(0, rect.x - padding),
    y: Math.max(0, rect.y - padding),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

/**
 * Captura una tarjeta desplazando la página hasta ella, sin captura de página completa: esta redimensiona la
 * ventana y los gráficos se vuelven a animar desde cero.
 */
async function cardShot(name, text, options) {
  const rect = await cardRect(text, options);
  const scrollY = Math.max(0, rect.y - 70);
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(500);
  const actualScroll = await page.evaluate(() => window.scrollY);
  await shot(name, { clip: { ...rect, y: rect.y - actualScroll } });
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Captura el contenido principal completo (sin la barra lateral), aunque sea más alto que la ventana. */
async function mainShot(name) {
  const rect = await page.evaluate(() => {
    const r = document.querySelector('main').getBoundingClientRect();
    return { x: r.left, y: r.top + window.scrollY, width: r.width, height: r.height };
  });
  await shot(name, { clip: rect, fullPage: true });
}

async function scrollTo(position) {
  await page.evaluate(
    (where) => window.scrollTo(0, where === 'top' ? 0 : document.body.scrollHeight),
    position,
  );
  await page.waitForTimeout(400);
}

/** Recorta la franja del documento que va desde un elemento hasta el inicio de otro. */
async function regionShot(name, from, to, { x = 440, width = 800 } = {}) {
  const scrollY = await page.evaluate(() => window.scrollY);
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  await shot(name, {
    fullPage: true,
    clip: { x, y: start.y + scrollY - 16, width, height: end.y - start.y + 4 },
  });
}

/** Recorte alrededor de un elemento visible en la ventana (diálogos, menús). */
async function elementClip(locator, padding = 16) {
  const box = await locator.boundingBox();
  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  return {
    x,
    y,
    width: Math.min(VIEWPORT.width - x, box.width + padding * 2),
    height: Math.min(VIEWPORT.height - y, box.height + padding * 2),
  };
}

async function signIn(account) {
  await page.goto(url('/login'));
  await page.evaluate(() => localStorage.removeItem('oruga.sesion'));
  await page.goto(url('/login'));
  await page.getByRole('button', { name: new RegExp(ACCOUNTS[account]) }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  await settle();
}

async function seedDemoData() {
  await page.goto(url('/login'));
  await page.getByRole('button', { name: new RegExp(ACCOUNTS.admin) }).waitFor();
  const totals = await page.evaluate(async () => {
    const { generarSemilla } = await import('/src/mocks/seed.ts');
    const { db, guardarDb } = await import('/src/mocks/db.ts');
    Object.assign(db, generarSemilla(db.hoy), { secuencia: 10_000 });
    await guardarDb();
    return `${db.activos.length} activos, ${db.clientes.length} clientes, ${db.reservas.length} reservas`;
  });
  console.log(`Datos de demostración cargados: ${totals}.`);
}

/** Elige una opción de un select de Radix identificado por su etiqueta dentro de `scope`. */
async function choose(scope, label, option) {
  // Las etiquetas de campos obligatorios terminan en "*".
  await scope.getByLabel(new RegExp(`^${label}\\*?$`)).click();
  await page.getByRole('option', { name: option }).first().click();
}

/** Contenedor más interno de un campo de inspección que incluye su etiqueta y el control indicado. */
function fieldOf(label, control) {
  return page.locator('main div').filter({ hasText: label }).filter({ has: control }).last();
}

async function answerYesNo(label, yes) {
  const name = yes ? 'Sí' : 'No';
  await fieldOf(label, page.getByRole('button', { name, exact: true }))
    .getByRole('button', { name, exact: true })
    .click();
}

async function addTestPhotos(label) {
  const button = fieldOf(label, page.getByRole('button', { name: 'Usar foto de prueba' })).getByRole(
    'button',
    {
      name: 'Usar foto de prueba',
    },
  );
  await button.click();
  await button.click();
}

/** Rellena la plantilla de retroexcavadora (src/mocks/plantillas/plt-retro.json) con las respuestas dadas. */
async function fillBackhoeInspection({ coolantOk = true, hydraulicOil = 80, notes = '', meterIncrease = 0 }) {
  await page.getByLabel('Nivel de aceite de motor (%)').fill('85');
  await answerYesNo('¿Refrigerante en nivel?', coolantOk);
  await answerYesNo('¿Hay fugas de aceite hidráulico?', false);
  await page.getByLabel('Nivel de aceite hidráulico (%)').fill(String(hydraulicOil));
  await answerYesNo('¿Funciona la alarma de retroceso?', true);
  await answerYesNo('¿Extintor vigente a bordo?', true);
  await addTestPhotos('Fotos generales del equipo');
  if (notes) await page.getByLabel('Notas del inspector').fill(notes);
  await page.getByLabel('Firma del inspector').fill('José Gregorio Morillo');
  if (meterIncrease) {
    const meter = page.getByLabel('Lectura del medidor');
    await meter.fill(String(Number(await meter.inputValue()) + meterIncrease));
  }
}

async function openInspectionForm(query) {
  await go(`/inspecciones/nueva?${query}`, () => page.getByLabel(/^Nivel de aceite de motor/));
}

/** Franja fija inferior del formulario de inspección: veredicto proyectado y botones. */
async function verdictBarClip() {
  const label = await page.getByText('Veredicto proyectado').boundingBox();
  const submit = await page.getByRole('button', { name: 'Emitir dictamen' }).boundingBox();
  const top = Math.min(label.y, submit.y) - 14;
  return {
    x: label.x - 16,
    y: top,
    width: submit.x + submit.width - label.x + 32,
    height: submit.height + 28,
  };
}

async function submitInspection() {
  await page.getByRole('button', { name: 'Emitir dictamen' }).click();
  try {
    await page.waitForURL((u) => !u.pathname.endsWith('/nueva'), { timeout: 20_000 });
  } catch {
    // Muestra los errores del formulario o del servidor para saber por qué no se emitió el acta.
    const messages = await page.locator('[role="alert"], [data-sonner-toast]').allInnerTexts();
    throw new Error(`No se emitió el dictamen: ${messages.join(' | ') || 'sin mensajes visibles'}`);
  }
  await settle();
}

/** Pulsa una acción de la cabecera de la reserva y confirma el diálogo si la acción lo abre. */
async function reservationAction(name) {
  await go(`/reservas/${DEMO_RESERVATION}`, () => page.getByRole('button', { name, exact: true }));
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(1500);
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    console.log(`  diálogo de "${name}": ${(await dialog.innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
    await dialog
      .getByRole('button', { name: new RegExp(name, 'i') })
      .last()
      .click();
    await page.waitForTimeout(1500);
  }
  const messages = await page.locator('[role="alert"], [data-sonner-toast]').allInnerTexts();
  console.log(`  ${name}: ${messages.join(' | ').replace(/\s+/g, ' ') || 'sin mensajes'}`);
  await settle();
}

/* ---------- pasos ---------- */

const steps = {
  async access() {
    // Escena 3D del acceso tal como la ve un usuario (sin movimiento reducido).
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => localStorage.removeItem('oruga.sesion'));
    await go('/login', () => page.getByRole('button', { name: new RegExp(ACCOUNTS.admin) }));
    await page.waitForTimeout(2500);
    await shot('login');
    await page.getByLabel('Correo').fill('nadie@oruga.com.ve');
    await page.getByLabel('Clave', { exact: true }).fill('clave-equivocada');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByText('Correo o clave incorrectos.').waitFor();
    await shot('login-error', { clip: { x: 40, y: 260, width: 520, height: 300 } });
    await page.getByRole('link', { name: 'Crea tu cuenta' }).click();
    await page.getByLabel('Nombre y apellido').waitFor();
    await page.waitForTimeout(1500);
    await shot('register');
    await page.setViewportSize({ width: 390, height: 844 });
    await go('/login', () => page.getByRole('button', { name: new RegExp(ACCOUNTS.admin) }));
    await page.waitForTimeout(1500);
    await shot('login-mobile');
    await page.setViewportSize(VIEWPORT);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  },

  async shell() {
    await signIn('admin');
    await go('/tablero', () => page.getByText('Alertas accionables'));
    const header = page.locator('header').first();
    await shot('app-shell', {
      marks: [
        ['1', page.getByRole('navigation').first()],
        ['2', header.getByText('Tablero', { exact: true }).first()],
        ['3', header.getByText('Maracaibo').first()],
        ['4', header.getByRole('status').filter({ hasText: 'En vivo' })],
        ['5', header.getByRole('button', { name: 'Bs' })],
        ['6', page.getByRole('button', { name: /^Tema:/ })],
        ['7', page.getByRole('button', { name: 'Panel de desarrollo' })],
        ['8', page.getByRole('button', { name: /^Cuenta de/ })],
        ['9', page.getByRole('link', { name: 'Créditos de imágenes' })],
        ['10', page.getByRole('button', { name: /Contraer menú/ })],
      ],
    });
    await page.getByRole('button', { name: /^Tema:/ }).click();
    const themeMenu = page.getByRole('menu');
    await themeMenu.waitFor();
    await shot('theme-menu', { clip: { x: 900, y: 0, width: 540, height: 230 } });
    await page.getByRole('menuitemradio', { name: 'Oscuro' }).click();
    await settle();
    // El foco vuelve al botón del tema y mostraría su tooltip.
    await page.evaluate(() => document.activeElement?.blur());
    await page.waitForTimeout(300);
    await shot('dashboard-dark');
    await page.getByRole('button', { name: /^Tema:/ }).click();
    await page.getByRole('menuitemradio', { name: 'Claro' }).click();
    await settle();
    await page.getByRole('button', { name: /^Cuenta de/ }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).waitFor();
    await shot('account-menu', { clip: { x: 1040, y: 0, width: 400, height: 260 } });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Panel de desarrollo' }).click();
    await page.getByRole('dialog', { name: 'Panel de desarrollo' }).waitFor();
    await page.waitForTimeout(500);
    await shot('dev-panel');
    await page.keyboard.press('Escape');
  },

  async dashboard() {
    await signIn('admin');
    await go('/tablero', () => page.getByText('Alertas accionables'));
    const main = page.locator('main');
    await shot('dashboard', {
      marks: [
        ['1', main.getByRole('link', { name: 'Mapa de flota', exact: true })],
        ['2', main.getByRole('link', { name: 'Planificador', exact: true })],
        ['3', main.getByRole('link', { name: 'Nueva reserva', exact: true })],
        ['4', main.getByRole('link', { name: /En alquiler/ }).first()],
        [
          '5',
          main
            .locator('div')
            .filter({ hasText: 'Facturación del mes' })
            .filter({ hasText: 'Monto por día de inicio' })
            .last(),
        ],
        ['6', main.getByRole('link', { name: /Servicios vencidos/ }).first()],
        ['7', main.getByRole('link', { name: /Conflictos abiertos/ }).first()],
      ],
    });
    await cardShot('dashboard-analytics', 'Analítica de la flota');
    await cardShot('dashboard-fleet-status', 'Estado de la flota');
    await cardShot('dashboard-occupancy', 'Ocupación por categoría');
    await cardShot('dashboard-alerts', 'Alertas accionables');
    await cardShot('dashboard-today', 'Operaciones de hoy');
  },

  async planner() {
    await signIn('admin');
    await go('/planificador', () => page.getByRole('button', { name: /^Reserva R-/ }).first());
    await shot('planner', {
      marks: [
        ['1', page.getByRole('button', { name: 'Hoy', exact: true })],
        ['2', page.getByRole('radio', { name: 'Semana' }).locator('..')],
        ['3', page.getByRole('radio', { name: 'Categoría' }).locator('..')],
        ['4', page.getByRole('button', { name: /^Conflictos/ })],
        ['5', page.getByRole('button', { name: 'Nueva reserva' })],
        ['6', page.getByPlaceholder('Equipo, reserva o cliente…')],
        ['7', page.getByText('Por asignar', { exact: true })],
        ['8', page.getByRole('heading', { name: 'Conflictos' })],
      ],
    });
    await page.getByRole('radio', { name: 'Mes' }).click();
    await settle();
    await shot('planner-month');
    await page.getByRole('radio', { name: 'Semana' }).click();
    await settle();
    await page
      .getByRole('button', { name: /^Reserva R-2026-\d+, .+, Confirmada$/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Ficha completa' }).waitFor();
    await page.waitForTimeout(500);
    await shot('planner-drawer');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    // Un clic en una zona libre de la fila abre el alta rápida con el equipo ya elegido.
    const row = page.getByText('RET-002', { exact: true }).first();
    const box = await row.boundingBox();
    await page.mouse.click(1010, box.y + box.height / 2);
    const dialog = page.getByRole('dialog', { name: 'Nueva reserva' });
    await dialog.waitFor();
    await page.waitForTimeout(800);
    await shot('planner-quick-create');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
  },

  async reservations() {
    await signIn('admin');
    await go('/reservas', () => page.locator('main a[href^="/reservas/res-"]').first());
    await shot('reservations', {
      marks: [
        ['1', page.getByPlaceholder('Buscar por código, cliente o activo…')],
        ['2', page.getByLabel('Filtrar por estado')],
        ['3', page.getByRole('link', { name: 'Nueva reserva' })],
        ['4', page.getByRole('button', { name: /^Acciones de R-/ }).first()],
      ],
    });
    await go(`/reservas/nueva?clienteId=cli-001&activoId=${DEMO_ASSET}`, () =>
      page.getByRole('heading', { name: 'Tarifa óptima' }),
    );
    await page.waitForTimeout(800);
    await mainShot('reservation-new-full');
    const warning = page.getByText(/Este cliente está bloqueado/);
    await go(`/reservas/nueva?clienteId=${BLOCKED_CLIENT}`, () => warning);
    // Recorta la sección "Cliente y equipo" hasta el aviso, que aparece bajo el selector de cliente.
    const section = await page.getByRole('heading', { name: 'Cliente y equipo' }).boundingBox();
    const notice = await warning.boundingBox();
    await shot('reservation-blocked-client', {
      clip: {
        x: section.x - 16,
        y: section.y - 16,
        width: 740,
        height: notice.y + notice.height - section.y + 32,
      },
    });
    await go(`/reservas/${DEMO_RESERVATION}`, () => page.getByRole('button', { name: 'Despachar' }));
    await shot('reservation-detail');
    await go('/reservas/res-sin-asignar-1', () => page.getByRole('button', { name: 'Confirmar reserva' }));
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Cancelar reserva' });
    await dialog.waitFor();
    await dialog.getByLabel('Motivo de cancelación').fill('El cliente pospuso la obra hasta enero.');
    await shot('reservation-cancel', { clip: await elementClip(dialog) });
    await dialog.getByRole('button', { name: 'Descartar' }).click();
  },

  async inventory() {
    await signIn('admin');
    await go('/inventario', () => page.getByRole('link', { name: 'Ver ficha' }).first());
    await page.waitForTimeout(1200);
    await shot('inventory-cards', {
      marks: [
        ['1', page.getByPlaceholder('Buscar por código, placa, marca o serial…')],
        ['2', page.getByRole('combobox').filter({ hasText: 'Todas las categorías' })],
        ['3', page.getByRole('radio', { name: 'Tabla' }).locator('..')],
        ['4', page.getByRole('button', { name: /^Disponible/ }).first()],
        ['5', page.getByText('Libre entre:')],
        ['6', page.getByRole('button', { name: 'Nuevo activo' })],
      ],
    });
    await page.getByRole('radio', { name: 'Tabla' }).click();
    await settle();
    await shot('inventory-table');
    await page.getByRole('button', { name: 'Nuevo activo' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo activo' });
    await dialog.waitFor();
    await page.waitForTimeout(500);
    await shot('inventory-new-asset');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await go(`/inventario/${DEMO_ASSET}`, () => page.getByRole('tab', { name: /Ficha técnica/ }));
    await shot('asset-detail');
    await page.getByRole('button', { name: 'Cambiar estado' }).click();
    const statusDialog = page.getByRole('dialog');
    await statusDialog.waitFor();
    await choose(statusDialog, 'Nuevo estado operativo', /mantenimiento/i);
    await statusDialog
      .getByLabel('Motivo o justificación técnica')
      .fill('Ruido anormal en la bomba hidráulica.');
    await shot('asset-status', { clip: await elementClip(statusDialog) });
    await statusDialog.getByRole('button', { name: 'Cancelar' }).click();
  },

  async inspections() {
    await signIn('admin');
    await go('/inspecciones', () => page.getByRole('link', { name: /RET-|EXC-|CAR-/ }).first());
    await shot('inspections', {
      marks: [
        ['1', page.getByLabel('Buscar inspecciones')],
        ['2', page.getByRole('radio', { name: 'Salida' }).locator('..')],
        ['3', page.getByRole('combobox').filter({ hasText: 'Todos los resultados' })],
        ['4', page.locator('main').getByRole('link', { name: 'Plantillas' })],
        ['5', page.locator('main').getByRole('link', { name: 'Nueva inspección' })],
      ],
    });

    // Inspección de salida de la reserva de demostración (retroexcavadora RET-001).
    await openInspectionForm(`reservaId=${DEMO_RESERVATION}&momento=salida`);
    await fillBackhoeInspection({});
    await scrollTo('top');
    await shot('inspection-new');
    await scrollTo('bottom');
    await shot('inspection-new-bottom');
    await answerYesNo('¿Hay fugas de aceite hidráulico?', true);
    await page.getByText('Ubicación de la fuga').waitFor();
    await page.waitForTimeout(400);
    await regionShot(
      'inspection-conditional',
      page.getByText('Sistema hidráulico', { exact: true }),
      page.getByText('Seguridad', { exact: true }),
    );
    await shot('inspection-verdict-no-apto', { clip: await verdictBarClip() });
    await answerYesNo('¿Hay fugas de aceite hidráulico?', false);
    await page.waitForTimeout(400);
    await submitInspection();
    // El acta carga sus puntos de control después del encabezado.
    await page.locator('main').getByText('¿Refrigerante en nivel?').first().waitFor();
    await settle();
    await mainShot('inspection-detail');

    // Despacho, devolución con hallazgos y cierre del contrato.
    await reservationAction('Despachar');
    await openInspectionForm(`reservaId=${DEMO_RESERVATION}&momento=devolucion`);
    await fillBackhoeInspection({
      coolantOk: false,
      hydraulicOil: 18,
      notes: 'El equipo regresó con el refrigerante y el aceite hidráulico por debajo del nivel.',
      meterIncrease: 26,
    });
    await shot('inspection-return', { clip: await verdictBarClip() });
    await submitInspection();
    await reservationAction('Registrar devolución');
    await go(`/inspecciones/comparar/${DEMO_RESERVATION}`, () =>
      page.getByRole('heading', { name: 'Comparación de inspecciones' }),
    );
    await mainShot('inspection-compare');
  },

  async templates() {
    await signIn('admin');
    await go('/admin/plantillas', () => page.getByText('Vista previa interactiva'));
    await shot('templates', {
      marks: [
        ['1', page.getByRole('tablist')],
        ['2', page.getByLabel(/Definición JSON de/)],
        ['3', page.getByText('Vista previa interactiva')],
        ['4', page.getByRole('button', { name: 'Guardar cambios' })],
      ],
    });
    const editor = page.getByLabel(/Definición JSON de/);
    const json = await editor.inputValue();
    await editor.fill(json.replace(/"version": (\d+),/, '"version": $1'));
    await page.getByText('Errores de validación del esquema').waitFor();
    await shot('templates-error');
  },

  async maintenance() {
    await signIn('admin');
    await go('/mantenimiento', () => page.getByRole('tab', { name: /Órdenes de taller/ }));
    await shot('maintenance-orders', {
      marks: [
        ['1', page.getByRole('tab', { name: /Órdenes de taller/ })],
        ['2', page.getByRole('tab', { name: /Planes preventivos/ })],
        ['3', page.getByLabel('Buscar órdenes')],
        ['4', page.getByLabel('Filtrar por tipo')],
        ['5', page.getByLabel('Filtrar por estado')],
        ['6', page.getByRole('button', { name: 'Nueva orden' })],
      ],
    });
    const row = page.getByRole('row').filter({ hasText: 'En taller' }).first();
    await row.getByRole('button', { name: /Acciones de la orden de/ }).click();
    const menu = page.getByRole('menu');
    await menu.waitFor();
    await shot('maintenance-order-menu', { clip: await elementClip(page.getByRole('menu'), 120) });
    await page.getByRole('menuitem', { name: 'Completar y cerrar orden' }).click();
    const closeDialog = page.getByRole('dialog', { name: 'Cerrar orden de mantenimiento' });
    await closeDialog.waitFor();
    await closeDialog.getByLabel(/Lectura del medidor al cierre/).focus();
    await page.waitForTimeout(400);
    await shot('maintenance-close-order', { clip: await elementClip(closeDialog) });
    await closeDialog.getByRole('button', { name: 'Cancelar' }).click();
    await page.getByRole('button', { name: 'Nueva orden' }).click();
    const newDialog = page.getByRole('dialog', { name: 'Programar orden de taller' });
    await newDialog.waitFor();
    await page.waitForTimeout(400);
    await shot('maintenance-new-order', { clip: await elementClip(newDialog) });
    await newDialog.getByRole('button', { name: 'Cancelar' }).click();
    await page.getByRole('tab', { name: /Planes preventivos/ }).click();
    await settle();
    await shot('maintenance-plans');
  },

  async clients() {
    await signIn('admin');
    await go('/clientes', () => page.getByRole('button', { name: /^Acciones de / }).first());
    await shot('clients', {
      marks: [
        ['1', page.getByLabel('Buscar clientes')],
        ['2', page.getByLabel('Tipo de cliente')],
        ['3', page.getByLabel('Estado del cliente')],
        ['4', page.getByRole('button', { name: 'Nuevo cliente' })],
        ['5', page.getByRole('button', { name: /^Acciones de / }).first()],
      ],
    });
    await page.getByRole('button', { name: 'Nuevo cliente' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo cliente' });
    await dialog.waitFor();
    await dialog.getByLabel('Nombre o razón social').fill('Constructora Lago Azul C.A.');
    await dialog.getByLabel('RIF o cédula de identidad').fill('J-1234');
    await dialog.getByLabel('Teléfono de contacto').fill('+58 412-555-1234');
    await dialog.getByLabel('Correo electrónico').fill('compras@lagoazul.com.ve');
    await dialog.getByRole('button', { name: 'Crear cliente' }).click();
    await dialog.getByText(/El RIF debe tener el formato/).waitFor();
    await shot('client-new', { clip: await elementClip(dialog) });
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await go(`/clientes/${BLOCKED_CLIENT}`, () =>
      page.getByRole('heading', { name: 'Historial de alquileres y contratos' }),
    );
    await shot('client-detail');
  },

  async map() {
    await signIn('admin');
    await go('/ubicacion', () => page.locator('.leaflet-tile-loaded').first());
    await page.waitForTimeout(2500);
    await shot('map', {
      marks: [
        ['1', page.getByRole('button', { name: 'Geocercas' })],
        ['2', page.getByPlaceholder('Buscar por código, modelo, cliente...')],
        ['3', page.getByLabel('Sede')],
        ['4', page.getByRole('button', { name: /alertas de geocerca/ })],
        ['5', page.locator('.leaflet-container')],
      ],
    });
    await go('/ubicacion?activoId=act-exc-001', () => page.locator('.leaflet-tile-loaded').first());
    await page.waitForTimeout(3000);
    await shot('map-asset');
  },

  async other() {
    await signIn('admin');
    await go('/creditos', () => page.getByRole('heading', { name: 'Créditos de imágenes' }));
    await page.waitForTimeout(1200);
    await shot('credits');
    await go('/ruta-que-no-existe', () => page.getByText('Esta ruta no existe'));
    await shot('not-found');
  },

  async roles() {
    const sidebar = { x: 0, y: 0, width: 240, height: 470 };
    for (const account of ['admin', 'planner', 'inspector', 'maintenance', 'manager']) {
      await signIn(account);
      await shot(`sidebar-${account}`, { clip: sidebar });
      if (account === 'inspector') {
        await go('/tablero', () => page.getByText('Tu rol no tiene acceso a este módulo'));
        await shot('forbidden');
      }
    }
  },
};

/* ---------- ejecución ---------- */

const requested = process.argv.slice(2);
const unknown = requested.filter((name) => !(name in steps));
if (unknown.length) {
  console.error(`Pasos desconocidos: ${unknown.join(', ')}. Disponibles: ${Object.keys(steps).join(', ')}`);
  process.exit(1);
}

mkdirSync(SCREENSHOTS_DIR, { recursive: true });
const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199 } });
await server.listen();
baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await launchBrowser();
try {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: 'es-VE',
    timezoneId: 'America/Caracas',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  page = await context.newPage();
  await seedDemoData();
  for (const name of requested.length ? requested : Object.keys(steps)) {
    console.log(`Paso: ${name}`);
    await steps[name]();
  }
} finally {
  await browser.close();
  await server.close();
}
