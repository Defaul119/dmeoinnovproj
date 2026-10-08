import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The app imports ../config/settings.json (shared with the Python pipeline),
// so the dev server must be allowed to read the project root.
const projectRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, fs: { allow: [projectRoot] } },
  preview: { port: 4173 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
