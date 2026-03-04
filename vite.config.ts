import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.ts'),
      },
      output: {
        entryFileNames: 'bundle.js',
        format: 'es',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  define: {
    'process.env': process.env
  }
});
