# Oruga: contrato de diseño

Lectura de diseño: app operativa interna para planificadores, inspectores, jefes de mantenimiento y gerentes de una empresa venezolana de alquiler de flota y maquinaria pesada. Lenguaje industrial y preciso, tipo sala de control. Diales: `DESIGN_VARIANCE 5`, `MOTION_INTENSITY 5`, `VISUAL_DENSITY 7` (en el login: 8 / 7 / 3).

La meta es que una persona que ve la demo recuerde dos cosas: el timeline que responde al arrastre con veredictos claros, y una interfaz que se siente como instrumental de obra, no como plantilla.

## Tokens (src/index.css)

Usar SIEMPRE las clases de token; nunca colores sueltos (`bg-zinc-900`, `#fff`).

| Rol | Clases |
| --- | --- |
| Fondos | `bg-canvas` (página), `bg-panel` (superficies), `bg-panel-2` (zonas internas, cabeceras de tabla), `bg-raised` (popovers, diálogos) |
| Bordes | `border-line`, `border-line-strong` (hover, foco de campos) |
| Texto | `text-ink`, `text-ink-2` (secundario), `text-ink-3` (terciario, mínimo 4,5:1) |
| Acento único | `bg-accent text-accent-ink` (acción primaria, selección), `text-accent-fg` (acento como texto), `bg-accent-soft` |
| Semánticos | `ok`, `warn`, `danger`, `info` con su `-soft`. Solo para estado: válido / advertencia / bloqueante / informativo |
| Reservas | `res-borrador`, `res-confirmada`, `res-en-curso`, `res-finalizada`, `res-cancelada` |
| Mantenimiento | `.rayado-mnt` (orden), `.trama-fds` (fuera de servicio), `text-mnt` |
| Sombras | `shadow-panel`, `shadow-flotante` (tintadas, nunca negras puras en claro) |

Tema: `data-tema="oscuro" | "claro"` en `<html>`; variante `dark:` disponible. Diseñar y revisar ambos. Oscuro es la identidad; claro debe sostener la misma jerarquía.

## Forma, tipo e íconos

- Radios (regla única): controles y campos `rounded-lg` (8 px); paneles, tarjetas y diálogos `rounded-xl` (12 px); badges y chips `rounded-full`; barras del timeline `rounded-md` (6 px).
- Tipografía: Geist Variable (texto) y Geist Mono Variable (códigos `EXC-014`, `R-2026-00123`, lecturas, montos en tablas). Base 14 px. Títulos de página `text-xl font-semibold tracking-tight`; nada de H1 gigantes dentro de la app. Números comparables con `.tabular`.
- Íconos: solo `@phosphor-icons/react`, peso `regular` por defecto, `bold` para énfasis mínimo, `duotone` solo en estados vacíos. Tamaños 16 / 18 / 20. Nunca SVG dibujado a mano.
- Densidad: filas de tabla 40 px, campos 36 px (44 px en táctil), separadores de 1 px en lugar de tarjetas cuando no hay jerarquía real.
- Z-index (src/shared/ui/capas.ts): base 0, sticky 10, cabecera 20, menú 30, overlay 40, diálogo 50, toast 60.

## Movimiento (GSAP)

- `gsap` + `@gsap/react` (`useGSAP` con `scope`), siempre dentro de `gsap.matchMedia()` con rama `(prefers-reduced-motion: reduce)` que deja todo estático e instantáneo.
- Animar solo `transform` y `opacity` (y `clip-path` en revelados puntuales). Nada de `top`, `left`, `width`.
- Coreografía con propósito: entrada de página con stagger corto (40 a 60 ms, 0,45 s, `power3.out`), contadores de KPI en el tablero, revelado del login, transiciones de estado en el timeline (fantasma, rebote al rechazar). Nada de bucles infinitos decorativos.
- Micro-interacciones en CSS: `transition` de 150 a 200 ms con `ease-salida`; `active:scale-[0.98]` en botones.
- Prohibido: `window.addEventListener('scroll')`, estado de React por cada movimiento del puntero, cursores personalizados.
- three.js solo en el login, cargado de forma perezosa, con póster estático si no hay WebGL o hay movimiento reducido.

## Pautas de interfaz (Vercel Web Interface Guidelines)

- Todo flujo operable con teclado; foco visible (`:focus-visible` con anillo de acento); orden de tabulación lógico; atajos documentados con `<kbd>`.
- Áreas táctiles de al menos 24 px (44 px en móvil). Campos de 16 px de fuente en móvil para evitar zoom.
- La URL refleja el estado (filtros, pestañas, vista); Atrás y Adelante funcionan. La navegación usa enlaces (`<Link>`), no `onClick` en `div`.
- Cada vista tiene carga (esqueletos con la forma final), vacío (cómo poblarla) y error (qué pasó y botón Reintentar).
- Actualización optimista donde la spec lo pide; si falla, revertir y explicar.
- Formularios: etiqueta arriba, ayuda opcional, error debajo; Enter envía; al enviar con errores, foco al primer campo inválido; botón de envío deshabilitado solo durante el envío y con indicador; nunca bloquear pegar.
- Acciones destructivas o irreversibles piden confirmación con el efecto descrito.
- `aria-live` para toasts y resultados del timeline; los toasts no son la única vía de un mensaje importante.
- Tipografía de contenido: puntos suspensivos con el carácter `…` en etiquetas que abren otro paso ("Guardar vista…") y en cargas ("Cargando…"); comillas tipográficas “ ”; espacio no separable entre número y unidad (`formato.ts` ya lo hace).
- Sin cambios de diseño al cargar (reservar espacio para imágenes con `width`/`height` o `aspect-ratio`).
- `color-scheme` y `theme-color` coherentes con el tema.

## Texto y datos (reglas Taste)

- Español neutro profesional, verbos concretos ("Confirmar", "Reasignar", "Registrar devolución"). Nada de "potenciar", "transformar", "sin fricciones".
- PROHIBIDO el guion largo y el semilargo como separador en todo texto visible. Usar punto, coma, dos puntos, paréntesis o guion simple `-`.
- Un solo eyebrow por cada tres secciones como máximo; sin etiquetas de versión, sin numeración de secciones, sin puntos de color decorativos (solo cuando comunican estado real, por ejemplo el indicador de eventos en vivo).
- Datos realistas y locales (nombres venezolanos, RIF, teléfonos +58, sedes reales: Maracaibo, Caracas, Valencia, Cúcuta). Nada de "John Doe", "Acme" ni cifras redondas sospechosas.
- El color nunca va solo: estados y conflictos llevan ícono o patrón además del color (SPEC §12.1).

## Imágenes

Fotos reales de Wikimedia Commons con licencia libre, alojadas en `public/img/`. Usar `src/shared/lib/imagenes.ts` (`srcCategoria(slug, n)`, `escenas('hero')`). Siempre `alt` en español, `loading="lazy"` salvo la imagen principal, `decoding="async"`, dimensiones o `aspect-ratio`. Créditos visibles en `/creditos`.
