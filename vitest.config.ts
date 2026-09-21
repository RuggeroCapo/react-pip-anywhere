import { createReadStream, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);

/**
 * Prefer an explicit CHROME_PATH, then a system Chrome, and only then Playwright's
 * own download — so a machine that already has Chrome does not fetch another one.
 */
function chromeExecutable(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  return existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;
}

/**
 * Satori shapes text with harfbuzzjs, an emscripten module that fetches `hb.wasm`
 * from beside its own JS. Vite's dependency pre-bundling moves that JS into
 * `node_modules/.vite/deps` and leaves the wasm behind, so the request 404s.
 *
 * Serving the file by name, wherever it is asked for, is the smallest fix. Apps
 * consuming `react-pip-anywhere/satori` need the equivalent — see the README.
 */
function serveEmscriptenWasm(): Plugin {
  const harfbuzzDir = dirname(require.resolve('harfbuzzjs/package.json'));

  return {
    name: 'react-pip-anywhere:serve-emscripten-wasm',
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
  };
}

/**
 * Two suites. `unit` covers the pure logic and the state machine against fakes.
 * `browser` covers the handful of APIs that cannot be faked usefully — a real 2d
 * context, `captureStream()` and the SVG rasterisation the Satori path depends on.
 *
 * Entering picture-in-picture itself is not testable: headless Chrome has no PiP
 * window, so `requestPictureInPicture` is faked in the unit suite and exercised by
 * hand against the demo.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['test/*.test.ts', 'test/*.test.tsx'],
        },
      },
      {
        plugins: [serveEmscriptenWasm()],
        test: {
          name: 'browser',
          include: ['test/browser/*.test.ts', 'test/browser/*.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: { executablePath: chromeExecutable() },
            }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
