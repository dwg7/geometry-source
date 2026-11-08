import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  base: '/geometry-source/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  plugins: [
    {
      name: 'copy-maplibre-workers',
      apply: 'build',
      generateBundle() {
        const workerCode = readFileSync(
          resolve('./node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'),
          'utf-8'
        );
        this.emitFile({
          type: 'asset',
          fileName: 'maplibre-gl-worker.mjs',
          source: workerCode,
        });

        const workerDevCode = readFileSync(
          resolve('./node_modules/maplibre-gl/dist/maplibre-gl-worker-dev.mjs'),
          'utf-8'
        );
        this.emitFile({
          type: 'asset',
          fileName: 'maplibre-gl-worker-dev.mjs',
          source: workerDevCode,
        });
      },
    },
  ],
});
