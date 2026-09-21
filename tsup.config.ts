import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/canvas/index.ts', 'src/satori/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Rollup's treeshaker drops the `'use client'` directive, which Next.js App
  // Router consumers need on the entry. Consumers tree-shake this themselves.
  treeshake: false,
  target: 'es2022',
  external: ['react', 'react-dom', /^satori(\/.*)?$/],
});
