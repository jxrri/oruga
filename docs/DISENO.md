# Oruga: contrato de diseño

Lectura de diseño: app operativa interna (planificadores, inspectores, jefes de mantenimiento, gerentes) de una empresa venezolana de alquiler de flota y maquinaria pesada. Lenguaje minimalista de startup, en la línea de Linear y Vercel: base neutra, un solo acento, Geist, líneas finas en lugar de cajas, mucho aire y movimiento contenido. Diales: `DESIGN_VARIANCE 5`, `MOTION_INTENSITY 4`, `VISUAL_DENSITY 5` (en login y registro: 6 / 5 / 3).

Es un rediseño visual: se conservan rutas, navegación, contenido de dominio y comportamiento. Lo que cambia es tipografía, ritmo, color y materialidad.

## Principios

1. Menos cajas. Una tarjeta solo cuando la elevación comunica jerarquía real; lo demás se agrupa con aire, una línea (`border-t border-line`) o `divide-y divide-line`. Nunca una tarjeta dentro de otra.
2. La jerarquía sale del peso y del color del texto (`text-ink`, `text-ink-2`, `text-ink-3`), no del tamaño ni de mayúsculas.
3. El color es información. El acento azul marca la acción primaria y lo seleccionado; `ok`, `warn`, `danger`, `info` solo comunican estado; las series de gráficos solo viven en gráficos. Un número no se pinta de color para adornar.
4. Cada pantalla tiene una sola acción primaria visible.
5. Si un elemento no ayuda a decidir o actuar, se quita.

## Tokens (src/index.css)

Usar SIEMPRE las clases de token. Nunca colores sueltos (`#fff`, `bg-zinc-900`, `text-emerald-400`) ni nombres de otros sistemas (`bg-card`, `text-muted-foreground`, `border-border`, `text-primary`, `bg-muted`, `bg-background`, `text-foreground`, `text-destructive`). Estos últimos hoy funcionan por alias, pero al tocar un archivo se migran:

| Nombre ajeno | Token |
| --- | --- |
| `bg-background` | `bg-canvas` |
| `bg-card` | `bg-panel` |
| `bg-muted` | `bg-panel-2` |
| `text-foreground` | `text-ink` |
| `text-muted-foreground` | `text-ink-3` (o `text-ink-2` si es texto de lectura) |
| `border-border`, `divide-border` | `border-line`, `divide-line` |
| `text-primary`, `border-primary`, `bg-primary/10` | `text-accent-fg`, `border-accent`, `bg-accent-soft` |
| `text-destructive`, `bg-destructive/10` | `text-danger`, `bg-danger-soft` |
| `emerald`, `amber`, `sky`/`blue`, `red` | `ok`, `warn`, `info`, `danger` (con su `-soft`) |

| Rol | Clases |
| --- | --- |
| Fondos | `bg-canvas` (página), `bg-panel` (superficies), `bg-panel-2` (zonas internas, hover de filas), `bg-raised` (popovers, diálogos) |
| Líneas | `border-line`, `border-line-strong` (hover y foco de campos) |
| Texto | `text-ink` (títulos, datos), `text-ink-2` (lectura secundaria), `text-ink-3` (apoyo, mínimo 4,5:1) |
| Acento único | Azul. `bg-accent text-accent-ink` (acción primaria, módulo activo), `text-accent-fg` (enlaces), `bg-accent-soft` (selección) |
| Estado | `ok`, `warn`, `danger`, `info` con su `-soft`. Siempre con ícono o texto, nunca solo color |
| Series de gráficos | `serie-azul`, `serie-verde`, `serie-naranja`, `serie-violeta` (`var(--serie-azul)` en Recharts). Siempre con leyenda o etiqueta |
| Reservas | `res-borrador`, `res-confirmada`, `res-en-curso`, `res-finalizada`, `res-cancelada` |
| Mantenimiento | `.rayado-mnt` (orden), `.trama-fds` (fuera de servicio), `text-mnt` |
| Sombras | `shadow-panel` (apenas perceptible, tarjetas), `shadow-flotante` (popovers, diálogos). Nada más |

Tema: `data-tema="claro" | "oscuro"` en `<html>`; variante `dark:` disponible. Claro es el tema por defecto. Revisar siempre los dos.

## Forma y tipografía

- Radios (regla única): controles, campos y botones `rounded-lg` (10 px); tarjetas, paneles y diálogos `rounded-xl` (16 px); badges, chips y avatares de estado `rounded-full`; barras del timeline `rounded-md`. Nada de `rounded-2xl`, `rounded-3xl` ni `rounded-sm` sueltos.
- Geist Variable para todo el texto. Geist Mono Variable solo para datos que se comparan o se copian: códigos (`EXC-014`, `R-2026-00123`), placas, seriales, lecturas, montos y fechas en tablas. Nunca en etiquetas, botones, títulos ni párrafos.
- Escala: título de página `text-2xl font-semibold tracking-tight`; título de sección `text-[15px] font-semibold`; cuerpo 14 px; apoyo `text-[13px]`; lo mínimo es `text-xs`. Nada de `text-[10px]` ni `text-[11px]` salvo dentro de un gráfico.
- Mayúsculas: prohibido `uppercase` con `tracking-*` en etiquetas, cabeceras de tabla y títulos. Se escribe en minúsculas con mayúscula inicial ("Estado de la flota", no "ESTADO DE LA FLOTA" ni "Estado de la Flota").
- Peso: `font-semibold` para títulos, `font-medium` para etiquetas y datos destacados. `font-bold` y `font-black` no se usan.
- Números comparables con `.tabular`.
- Íconos: solo `@phosphor-icons/react`, peso `regular`, tamaños 16 / 18 / 20, color `text-ink-3` salvo que comuniquen estado. `duotone` solo en estados vacíos. Nunca SVG dibujado a mano ni emojis.
- Z-index (src/shared/ui/capas.ts): base 0, sticky 10, cabecera 20, menú 30, overlay 40, diálogo 50, toast 60.

## Recetas

Las piezas compartidas viven en `src/shared/ui` (ver su `index.ts`). Antes de escribir un control nuevo, buscar ahí.

- **Página**: `<div ref={useEntrada()} className="mx-auto w-full max-w-[1400px]">` con `EncabezadoPagina` (título, descripción de una línea, acciones) y debajo las secciones separadas por `space-y-6`. El conteo de registros va en la descripción ("442 reservas, 30 en curso"), no en una píldora junto al título. Las pantallas de trabajo a todo el ancho (planificador, mapa) no llevan `max-w`.
- **Tarjeta**: clase `tarjeta` (`rounded-xl border border-line bg-panel`). Relleno `p-5`. Cabecera de tarjeta: título de sección a la izquierda y, si hace falta, un enlace de texto a la derecha; sin línea debajo.
- **Tabla**: dentro de una `tarjeta` con `overflow-hidden`. Cabecera con clase `th-tabla` (texto de 13 px, `text-ink-3`, sin mayúsculas ni fondo). Filas con clase `fila-tabla` (una sola línea superior y `hover:bg-panel-2`), 48 px de alto, celdas `px-4`. Texto principal `text-ink`, secundario `text-ink-3` en la misma celda. Acciones de fila en un `IconButton` con menú al final. Sin rayas alternas.
- **Barra de filtros**: una fila sin caja: búsqueda (`Input` con ícono, ancho máximo 22rem) a la izquierda, filtros (`Select`, `SegmentedControl`) a la derecha. Los filtros por estado usan `SegmentedControl` o chips `rounded-full` con el seleccionado en `bg-accent-soft text-accent-fg`; nunca botones con borde de color.
- **Indicadores (KPI)**: etiqueta en `text-[13px] text-ink-3`, valor en `text-2xl font-semibold text-ink tabular`, detalle en `text-[13px] text-ink-3`. El valor va en `text-ink`; el color solo en el ícono o en la mini gráfica.
- **Badge de estado**: `Badge` con `tono` e `icono`. Nunca un `span` con clases de color a mano.
- **Formularios**: `Field` (etiqueta arriba, ayuda opcional, error debajo) con `Input`, `Select`, `Textarea`, `Switch`, `Checkbox`. Campos y botones de 36 px (44 px en táctil), la altura que ya dan `Input`, `Select` y `Button`. Secciones del formulario separadas por aire y un título de sección, no por cajas.
- **Vacío, carga y error**: `EmptyState` (qué falta y cómo poblarlo), `Skeleton` con la forma del contenido final, `ErrorState` con Reintentar.
- **Detalle de un registro**: encabezado con migas, título y acciones; cuerpo en dos columnas (`lg:grid-cols-[minmax(0,1fr)_20rem]`): contenido a la izquierda, ficha de datos a la derecha como lista `dl` con `divide-y divide-line`, sin tarjetas anidadas.

## Movimiento (GSAP)

- `gsap` + `@gsap/react` (`useGSAP` con `scope`), siempre dentro de `gsap.matchMedia()` con rama `(prefers-reduced-motion: no-preference)`; con movimiento reducido todo queda estático.
- Animar solo `transform` y `opacity` (y `clip-path` en revelados puntuales).
- Entrada de página con `useEntrada` (`src/shared/hooks/useEntrada.ts`): marcar con `data-entrada` el encabezado y cada sección de primer nivel, no cada fila ni cada tarjeta de una rejilla.
- Movimiento con motivo: entrada de página, conteo de KPI (`Stat`), revelado del login, estados del timeline (fantasma, rebote al rechazar). Cada animación se justifica en una frase (jerarquía, respuesta o cambio de estado). Nada de bucles infinitos, parpadeos ni brillos decorativos.
- Micro-interacciones en CSS: `transition` de 150 a 200 ms con `ease-salida`; `active:scale-[0.98]` en botones; `hover:bg-panel-2` en filas.
- Prohibido: `window.addEventListener('scroll')`, estado de React por cada movimiento del puntero, cursores personalizados.
- three.js solo en login y registro, cargado de forma perezosa, con póster estático si no hay WebGL o hay movimiento reducido.

## Pautas de interfaz (Vercel Web Interface Guidelines)

- Todo flujo operable con teclado; foco visible (`:focus-visible` con anillo de acento); orden de tabulación lógico; atajos documentados con `<kbd>`.
- Áreas táctiles de al menos 24 px (44 px en móvil). Campos de 16 px de fuente en móvil para evitar zoom.
- La URL refleja el estado (filtros, pestañas, vista); Atrás y Adelante funcionan. La navegación usa enlaces (`<Link>`), no `onClick` en `div`.
- Cada vista tiene carga (esqueletos con la forma final), vacío (cómo poblarla) y error (qué pasó y botón Reintentar).
- Actualización optimista donde la spec lo pide; si falla, revertir y explicar.
- Formularios: etiqueta arriba, ayuda opcional, error debajo; Enter envía; al enviar con errores, foco al primer campo inválido; botón de envío deshabilitado solo durante el envío y con indicador; nunca bloquear pegar.
- Acciones destructivas o irreversibles piden confirmación con el efecto descrito.
- `aria-live` para toasts y resultados del timeline; los toasts no son la única vía de un mensaje importante.
- Puntos suspensivos con el carácter `…` en etiquetas que abren otro paso ("Guardar vista…") y en cargas ("Cargando…"); comillas tipográficas “ ”; espacio no separable entre número y unidad (`formato.ts` ya lo hace).
- Sin cambios de diseño al cargar (reservar espacio con `width`/`height` o `aspect-ratio`).
- Los botones no parten su texto en dos líneas en escritorio.
- `color-scheme` y `theme-color` coherentes con el tema.

## Texto y datos

- Español neutro profesional, verbos concretos ("Confirmar", "Reasignar", "Registrar devolución"). Nada de "potenciar", "transformar", "sin fricciones", "gestión integral".
- Títulos de página cortos y en minúsculas con mayúscula inicial: "Reservas", "Inventario", "Clientes". No "Gestión de Reservas" ni "Inventario de Flota".
- PROHIBIDO el guion largo y el semilargo como separador en todo texto visible. Usar punto, coma, dos puntos, paréntesis o guion simple `-`.
- Sin eyebrows (micro-etiquetas en mayúsculas sobre los títulos), sin etiquetas de versión, sin numeración de secciones, sin puntos de color decorativos (solo cuando comunican estado real, como el indicador de eventos en vivo).
- Datos realistas y locales (nombres venezolanos, RIF, teléfonos +58, sedes reales). Nada de "John Doe", "Acme" ni cifras redondas sospechosas.
- El color nunca va solo: estados y conflictos llevan ícono o patrón además del color (SPEC §12.1).

## Imágenes

Fotos reales de Wikimedia Commons con licencia libre, alojadas en `public/img/`. Usar `src/shared/lib/imagenes.ts` (`srcCategoria(slug, n)`, `escenas('hero')`). Siempre `alt` en español, `loading="lazy"` salvo la imagen principal, `decoding="async"`, dimensiones o `aspect-ratio`. Sobre una foto no van textos ni badges translúcidos: si hace falta una etiqueta, lleva fondo opaco (`bg-panel`). Créditos visibles en `/creditos`.

## Antes de dar una pantalla por terminada

- Solo tokens: ninguna clase de la tabla de nombres ajenos, ningún color suelto.
- Ningún `uppercase`, `font-bold`, `font-black`, `text-[10px]`, `text-[11px]` fuera de gráficos; `font-mono` solo en datos.
- Una sola acción primaria; ningún botón con el texto partido; ninguna tarjeta dentro de otra.
- Carga, vacío y error presentes; nada se desborda ni se corta a 1280 px ni a 390 px.
- Se ve bien en claro y en oscuro; contraste AA en textos, campos y botones.
- Ningún guion largo; títulos y etiquetas en minúsculas con mayúscula inicial.
- Con `prefers-reduced-motion` no se mueve nada.
