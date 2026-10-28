import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Gera um único dist/index.html que abre direto pelo navegador, sem servidor.
export default defineConfig({
  base: './',
  assetsInclude: ['**/*.glb'],
  plugins: [viteSingleFile()],
  build: { target: 'esnext', chunkSizeWarningLimit: 16000 },
});
