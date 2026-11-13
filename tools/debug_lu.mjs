// Contrôle visuel de la trame d'occupation du sol → PPM (converti en PNG par ImageMagick).
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, '.shots/_lu.mjs');
await build({ stdin: { contents: `export * from './src/raster.js'; export * from './src/terrain.js';`, resolveDir: root }, bundle: true, format: 'esm', outfile: tmp, platform: 'node', loader: { '.json': 'json' }, logLevel: 'error' });
const m = await import(pathToFileURL(tmp).href + '?' + Date.now());
const t0 = Date.now();
const lu = m.buildLanduse();
const terrain = new m.Terrain(lu);
console.log('raster', lu.w, lu.h, Date.now() - t0, 'ms');
const col = [[40, 40, 40], [245, 240, 225], [90, 150, 200], [170, 200, 120], [150, 140, 130], [200, 60, 50], [230, 190, 160], [90, 170, 80], [220, 220, 255], [250, 250, 250], [230, 220, 170], [140, 190, 110]];
const s = +(process.argv[2] || 2), W = Math.floor(lu.w / s), H = Math.floor(lu.h / s);
const buf = Buffer.alloc(W * H * 3);
const mode = process.argv[3] || 'lu';
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const x = lu.x0 + (i + 0.5) * s, z = lu.z0 + (j + 0.5) * s;
  let c;
  if (mode === 'h') { const h = terrain.height(x, z); c = h < 0.3 ? [60, 110, 170] : [Math.min(255, 60 + h * 5), Math.min(255, 90 + h * 4), 60]; }
  else c = col[lu.data[Math.floor(j * s) * lu.w + Math.floor(i * s)]];
  buf[(j * W + i) * 3] = c[0]; buf[(j * W + i) * 3 + 1] = c[1]; buf[(j * W + i) * 3 + 2] = c[2];
}
writeFileSync(join(root, '.shots/lu.ppm'), Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), buf]));
console.log('ok');
