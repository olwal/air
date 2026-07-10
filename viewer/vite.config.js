import { defineConfig } from 'vite';
import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// The committed data/ artifacts live at the repo root, one level up from viewer/.
const DATA_ROOT = normalize(join(here, '..', 'data'));

const MIME = {
  '.bin': 'application/octet-stream',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

/**
 * Dev-only middleware that serves the repo-root `data/` directory at `/data/*`,
 * so the new viewer reuses the existing binary frames and CSVs without copying
 * or symlinking (works cross-platform). In production the built `dist/` is
 * deployed alongside a `data/` directory served by the same origin.
 */
function serveRepoData() {
  return {
    name: 'serve-repo-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        // Strip query string and decode; block path traversal.
        const rel = decodeURIComponent((req.url || '').split('?')[0]);
        const filePath = normalize(join(DATA_ROOT, rel));
        if (!filePath.startsWith(DATA_ROOT)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        try {
          if (!statSync(filePath).isFile()) return next();
        } catch {
          return next();
        }
        const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
        res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serveRepoData()],
  server: { port: 5173, open: true },
});
