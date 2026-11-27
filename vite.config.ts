/// <reference types="vitest/config" />
import { realpathSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // node_modules puede ser un enlace a otra carpeta: sin permitir su ruta real, Vite responde 403 a las
  // fuentes en desarrollo y la app cae a la tipografía del sistema.
  server: { fs: { allow: ['.', realpathSync(fileURLToPath(new URL('./node_modules', import.meta.url)))] } },
  build: {
    chunkSizeWarningLimit: 900,
  },
  test: {
    // Componentes: añadir el comentario `// @vitest-environment jsdom` al inicio del archivo de prueba.
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/shared/lib/**'],
      reporter: ['text-summary', 'html'],
    },
  },
});
