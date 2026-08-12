import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(DIR, 'src');
const OUT = path.join(DIR, 'dist');

const watch = process.argv.includes('--watch');

await fs.mkdir(OUT, { recursive: true });
await Promise.all([
  fs.copyFile(path.join(SRC, 'index.html'), path.join(OUT, 'index.html')),
  fs.copyFile(path.join(SRC, 'styles.css'), path.join(OUT, 'styles.css')),
]);

const opcje = {
  entryPoints: [path.join(SRC, 'app.ts')],
  outfile: path.join(OUT, 'app.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: !watch,
  sourcemap: watch,
};

if (watch) {
  const ctx = await esbuild.context(opcje);
  await ctx.watch();
  console.log('web: watching…');
} else {
  await esbuild.build(opcje);
  console.log('web: built dist/');
}
