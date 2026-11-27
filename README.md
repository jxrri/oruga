# Oruga - Sistema de Gestión y Alquiler de Flotas y Maquinaria Pesada

Frontend operativo (Fase 1) desarrollado con React 19, TypeScript estricto, Tailwind CSS v4, Redux Toolkit + RTK Query, GSAP, Three.js, Leaflet y MSW (Mock Service Worker).

## Módulos implementados

1. **Tablero de Control (`/tablero`)**: Indicadores clave (KPIs) con animación GSAP, tasa de utilización por categoría, distribución de estado de flota, proyección de ingresos mensuales, alertas accionables (`RF-DSH-01`, `RF-DSH-02`) y operaciones del día.
2. **Planificador Timeline (`/planificador`)**: Calendario horizontal interactivo con arrastre en tiempo real (`mover`, `redimensionar`, `reasignar`), ajuste a rejilla por escala (Día, Semana, Mes), detección instantánea de colisiones y tiempos de preparación (`RF-PLN-01` a `RF-PLN-10`).
3. **Inventario de Activos (`/inventario`, `/inventario/:id`)**: Catálogo virtualizado en vista de tarjetas y tabla, filtro de disponibilidad por ventana temporal, ficha técnica de equipo, control de documentos y cambio de estado operativo con auditoría (`RF-INV-01` a `RF-INV-06`).
4. **Reservas y Contratos (`/reservas`, `/reservas/nueva`, `/reservas/:id`)**: Cotizador con tarifa óptima combinada (mes, semana, día, hora), validación de conflictos en vivo, máquina de estados (`borrador`, `confirmada`, `en_curso`, `finalizada`, `cancelada`) y bitácora de cambios (`RF-RES-01` a `RF-RES-04`).
5. **Inspecciones Técnicas (`/inspecciones`, `/inspecciones/nueva`, `/inspecciones/comparar/:reservaId`, `/admin/plantillas`)**: Formularios dinámicos generados por esquema JSON con reglas condicionales (`visibleSi`), cálculo automático de veredicto (`apto`, `apto_con_observaciones`, `no_apto`), comparativa lado a lado entre salida y devolución, y editor de plantillas en vivo (`RF-INS-01` a `RF-INS-05`).
6. **Mantenimiento (`/mantenimiento`)**: Gestión de órdenes preventivas y correctivas, cálculo de vencimientos por lectura (km u horas) o días calendario, y actualización automática de umbrales al cerrar servicios (`RF-MNT-01` a `RF-MNT-04`).
7. **Directorio de Clientes (`/clientes`, `/clientes/:id`)**: Registro con validación de RIF/cédula, bloqueo administrativo con restricción en confirmación de reservas e historial de facturación (`RF-CLI-01` a `RF-CLI-03`).
8. **Ubicación y Telemetría (`/ubicacion`)**: Mapa interactivo con marcadores por estado visible, simulación de movimiento en tiempo real cada 4 s para activos en alquiler y alertas de geocerca alrededor de las obras (`RF-UBI-01` a `RF-UBI-03`).

## Cuentas y acceso

La app pide correo y clave en `/login` y permite crear una cuenta en `/registro`. Como esta fase no tiene backend, las cuentas viven en una base de datos local del navegador:

- **Dónde**: IndexedDB, base `keyval-store`, registro `oruga.cuentas` (`src/mocks/cuentas.ts`). Guarda las cuentas registradas, las credenciales y las sesiones abiertas.
- **Claves**: nunca en texto claro. Se guarda una sal aleatoria por cuenta y el hash PBKDF2-SHA256 (600 000 iteraciones) calculado con Web Crypto.
- **Sesión**: al entrar se emite un token aleatorio que la app envía como `Authorization: Bearer <token>`. Si el servidor simulado no lo reconoce responde 401 y la app vuelve al login.
- **Cuentas de demostración**: las cinco cuentas de la semilla (una por rol) usan la clave `oruga2026`; la pantalla de login las lista y rellena el formulario con un toque.
- **Borrar todo**: en las herramientas del navegador, Application > IndexedDB > `keyval-store` > eliminar. Las cuentas de demostración se vuelven a crear solas.

Límite a tener presente: la base está en el equipo de quien usa la app, así que protege la clave (no se puede leer), pero no es una barrera de seguridad frente a alguien con acceso a ese navegador. Con un backend real (`VITE_API_URL`), el mismo formulario llama a `POST auth/login` y `POST auth/registro` sin cambios en las pantallas.

Usa `npm run dev` o un sitio con HTTPS: Web Crypto solo está disponible en `localhost` y en contextos seguros.

## Requisitos previos

- Node.js 20+
- npm 10+

## Comandos principales

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (con MSW y telemetría simulada en el navegador)
npm run dev

# Verificación de tipos (TypeScript estricto)
npm run typecheck

# Linter (ESLint + jsx-a11y + react-hooks)
npm run lint

# Pruebas unitarias y de integración (Vitest)
npm test

# Pruebas de invariancia de zona horaria (America/Caracas y Asia/Tokyo)
npm run test:tz

# Compilación de producción
npm run build
```

## Arquitectura

- `src/api/`: Contrato de tipos (`contrato.ts`), cliente RTK Query (`baseApi.ts`) y hooks de caché compartida.
- `src/domain/`: Reglas de negocio puras sin acoplamiento a React (intervalos, detección de conflictos, máquina de estados de reserva, tarifas óptimas, vencimientos de mantenimiento y motor de inspección).
- `src/mocks/`: Base de datos en memoria con semilla determinista (`seed.ts`), manejadores HTTP (`handlers/`) y generador de eventos en tiempo real (`tiempoReal.ts`).
- `src/shared/`: Kit de interfaz basado en Radix UI y tokens industriales (`ui/`), utilidades de fechas con soporte IANA (`fechas.ts`) y formateadores (`formato.ts`).
- `src/features/`: Módulos funcionales aislados con carga perezosa y Error Boundary individual.
