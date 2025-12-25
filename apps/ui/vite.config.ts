import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: __dirname,
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: '../../dist/ui',
    emptyOutDir: true,
  },
});

