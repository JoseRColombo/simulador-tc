import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// A interface fica em /web. O build gera UM ÚNICO arquivo (dist/index.html) com
// JS, CSS e fontes embutidos: dá para abrir com dois cliques, sem servidor nem internet.
export default defineConfig({
  root: 'web',
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173, open: true },
});
