import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Mesmo alias do tsconfig ("@/*" -> raiz do projeto).
// Os specs do Playwright (tests/e2e) são rodados por "npm run test:e2e", não pelo vitest.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
});
