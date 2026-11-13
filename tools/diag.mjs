// Diagnostic de performance du rendu logiciel (outil de mise au point).
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 });
page.on('console', (m) => console.log('[page]', m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('pageerror', String(e.stack || e).slice(0, 600)));
await page.goto('file://' + join(root, 'dist/index.html') + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 120000 });
console.log('failed?', await page.evaluate(() => window.__failed || null));
const steps = process.argv.slice(2);
for (const js of steps) {
  const r = await Promise.race([
    page.evaluate((js) => {
      const app = window.__app, gl = app.renderer.getContext();
      (0, eval)(js);
      const t = performance.now(); app.renderNow();
      const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return { ms: Math.round(performance.now() - t), info: app.stats(), renderer: gl.getParameter(gl.RENDERER) };
    }, js),
    new Promise((r) => setTimeout(() => r('TIMEOUT'), 90000)),
  ]);
  console.log(js, '=>', JSON.stringify(r));
  if (r === 'TIMEOUT') break;
}
await browser.close();
