import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(DIR, 'src');
const OUT = path.join(DIR, 'dist');
const PORT = Number(process.env.RKG_WEB_PORT ?? 4173);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid RKG_WEB_PORT: ${process.env.RKG_WEB_PORT}`);
}

const pozycje = JSON.parse(
  await fs.readFile(path.join(DIR, 'dev', 'mock-clubs.json'), 'utf8'),
);
const glosy = new Map();

await fs.mkdir(OUT, { recursive: true });
const build = await esbuild.context({
  entryPoints: [path.join(SRC, 'app.ts')],
  outfile: path.join(OUT, 'app.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: false,
  sourcemap: true,
});
await build.rebuild();
await build.watch();

function json(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(value));
}

async function plik(res, file, type) {
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

function posortowane(sort) {
  const wynik = pozycje.map((p) => ({ ...p, role: p.role ? { ...p.role } : undefined }));
  if (sort === 'nowe') return wynik.sort((a, b) => b.kiedy - a.kiedy);
  if (sort === 'losowe') {
    for (let i = wynik.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wynik[i], wynik[j]] = [wynik[j], wynik[i]];
    }
    return wynik;
  }
  return wynik.sort((a, b) => b.wynikGlosow - a.wynikGlosow || b.kiedy - a.kiedy);
}

async function bodyJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `localhost:${PORT}`}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return plik(res, path.join(SRC, 'index.html'), 'text/html; charset=utf-8');
  }
  if (req.method === 'GET' && url.pathname === '/app.js') {
    return plik(res, path.join(OUT, 'app.js'), 'text/javascript; charset=utf-8');
  }
  if (req.method === 'GET' && url.pathname === '/favicon.ico') {
    res.writeHead(204).end();
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/nazwy') {
    const sort = url.searchParams.get('sort') ?? 'top';
    return json(res, 200, { pozycje: posortowane(sort) });
  }

  const vote = url.pathname.match(/^\/api\/nazwy\/([^/]+)\/glos$/);
  if (req.method === 'POST' && vote) {
    const klub = pozycje.find((p) => p.id === vote[1]);
    const body = await bodyJson(req);
    if (!klub || !body || ![-1, 0, 1].includes(body.wartosc)) {
      return json(res, 400, { blad: 'zly glos testowy' });
    }
    const key = `${vote[1]}:${body.glosujacy ?? 'local'}`;
    const poprzedni = glosy.get(key) ?? 0;
    klub.wynikGlosow += body.wartosc - poprzedni;
    if (body.wartosc === 0) glosy.delete(key);
    else glosy.set(key, body.wartosc);
    return json(res, 200, { id: klub.id, wynikGlosow: klub.wynikGlosow });
  }

  json(res, 404, { blad: 'nie znaleziono' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`RKG web: http://localhost:${PORT}`);
  console.log('RKG web: 10 mock clubs; Ctrl+C to stop');
});

async function stop() {
  server.close();
  await build.dispose();
}

process.once('SIGINT', async () => {
  await stop();
  process.exit(0);
});
process.once('SIGTERM', async () => {
  await stop();
  process.exit(0);
});
