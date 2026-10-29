# Oruga frontend (fase 1)

Objective: full navigable React + TypeScript frontend for SPEC.md against a mocked API (MSW), with a premium visual layer.
Branch: `feat/frontend-fase-1` (repo `jxrri/oruga`) · Delivery: `ask-on-risk` · Test runner: Vitest (`npm test`, `npm run test:tz`).

## Specs

- **S1** "Realicemos el desarrollo del proyecto descrito en el SPEC.md, meramente el front-end." Scope: SPEC.md sections 1-13 (8 modules, domain rules, mocks, contract, a11y). Backend out of scope.
- **S2** "Quiero que utilices ciertas skills de front-end, como las de GSAP, las pautas de Vercel, la skill "Taste", etc. Principalmente te las menciono es para que el front-end de este proyecto deslumbre y sea lo mejor posible." Applies: design-taste-frontend, frontend-design, GSAP (+ @gsap/react), Vercel Web Interface Guidelines. Design contract lives in `docs/DISENO.md`.
- **S3** "Web scrapea imágenes relacionadas al proyecto y alojalas localmente, para ir abarcando el mismo." Images stored in the repo under `public/img/`, with license credits.
- **S4** "con la cuenta de GitHub 'jxrri' para crear el repositorio con el nombre descrito en la spec, en donde alojarás el código enteramente, en conjunto con las imágenes." "Futuramente agregaremos el back-end del mismo."
- **S5** "utilicemos React como librería para front-end, y Node.js para el backend. Futuramente usaremos PostgreSQL alojado en Supabase para todo. Pero en primera instancia quiero que desarrolles el front-end. Puedes usar, también, tree.js, Next.js, o relacionados, para crear el mejor front-end que puedas."

Assumptions (stated, reversible):
- A1 Repo name `oruga` (SPEC §14 recommends Oruga). Visibility private until the user says otherwise.
- A2 Vite + React per SPEC §6.1 (SPA + MSW in the browser); Next.js not needed. three.js used only on the login hero, lazy-loaded.
- A3 No GSAP or Vercel guidelines skill is installed; apply official GSAP docs practice and Vercel Web Interface Guidelines from knowledge.
- A4 Backend will be Node.js (user) instead of Python (SPEC); the contract in `src/api/contrato.ts` stays backend-agnostic.

## Tasks

| ID | Specs | Route | Status | Evidence |
|----|-------|-------|--------|----------|
| T1 Scaffold, tooling, contract, fechas, domain + tests, store, API surface, design doc | S1 S2 S5 | inline | pending | |
| T2 Image scraping + optimization + credits | S3 | delegated (parallel W3) | pending | |
| T3 Mocks: seed, db, handlers, realtime | S1 | delegated (parallel W1) | pending | |
| T4 UI kit, app shell, login (GSAP + three.js) | S1 S2 | delegated (parallel W2) | pending | |
| T5 Planificador timeline | S1 | delegated (parallel W4) | pending | |
| T6 Inventario + Clientes | S1 | delegated (parallel W5) | pending | |
| T7 Reservas + Mantenimiento | S1 | delegated (parallel W6) | pending | |
| T8 Inspecciones + editor de plantillas | S1 | delegated (parallel W7) | pending | |
| T9 Ubicación + Tablero | S1 S2 | delegated (parallel W8) | pending | |
| T10 README, CI, independent verification, push | S1 S4 | inline + verifier | pending | |

Route evidence: writers run in parallel waves with disjoint edit surfaces (Writer trigger a). Risk item 5 (new dependencies, CI) fires one independent verifier at the feature end.

## Log

- **L1** (2026-10-29, user, verbatim): "Realicemos el desarrollo del proyecto descrito en el SPEC.md, meramente el front-end. Quiero que utilices ciertas skills de front-end, como las de GSAP, las pautas de Vercel, la skill "Taste", etc. Principalmente te las menciono es para que el front-end de este proyecto deslumbre y sea lo mejor posible. Web scrapea imágenes relacionadas al proyecto y alojalas localmente, para ir abarcando el mismo. Para el alojamiento del mismo proyecto, quero que con la cuenta de GitHub 'jxrri' para crear el repositorio con el nombre descrito en la spec, en donde alojarás el código enteramente, en conjunto con las imágenes. Futuramente agregaremos el back-end del mismo. En primera instancia, quiero que utilicemos React como librería para front-end, y Node.js para el backend. Futuramente usaremos PostgreSQL alojado en Supabase para todo. Pero en primera instancia quiero que desarrolles el front-end. Puedes usar, también, tree.js, Next.js, o relacionados, para crear el mejor front-end que puedas. Empieza."
- **L2** Environment: Node 24.19, npm 11.17, gh 2.98 with `jxrri` logged in (inactive account; push uses an inline credential helper, no global switch). RDD on (global).
