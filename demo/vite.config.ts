import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);

/**
 * The recipe every app using the Satori path needs.
 *
 * Satori shapes text with harfbuzzjs, an emscripten module that fetches `hb.wasm`
 * from beside its own JS. Neither Vite's dev pre-bundling nor a production build
 * carries that file along, so it is served by name in dev and emitted into the
 * bundle's asset directory for the build.
 */
function serveEmscriptenWasm(): Plugin {
  const harfbuzzDir = dirname(require.resolve('harfbuzzjs/package.json'));
  const names = ['hb', 'hb-subset'] as const;

  return {
    name: 'demo:serve-emscripten-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = /\/(hb|hb-subset)\.wasm(?:\?.*)?$/.exec(req.url ?? '');
        if (!match) return next();
        const file = join(harfbuzzDir, `${match[1]}.wasm`);
        if (!existsSync(file)) return next();
        res.setHeader('Content-Type', 'application/wasm');
        createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      names.forEach((name) => {
        const file = join(harfbuzzDir, `${name}.wasm`);
        if (!existsSync(file)) return;
        this.emitFile({
          type: 'asset',
          fileName: `assets/${name}.wasm`,
          source: readFileSync(file),
        });
      });
    },
  };
}

export default defineConfig({
  root: 'demo',
  // Works both at a domain root and under a GitHub Pages project path.
  base: './',
  plugins: [react(), serveEmscriptenWasm()],
  build: { outDir: 'dist', emptyOutDir: true },
});
