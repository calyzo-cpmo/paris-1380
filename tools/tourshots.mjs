// Planches-contact des parcours commentés : une vignette par étape (contrôle visuel des cadrages).
// node tools/tourshots.mjs [identifiant de parcours…]   → .shots/tour_<parcours>_<étape>.png et .shots/tour_<parcours>.png
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), out = join(root, '.shots');
mkdirSync(out, { recursive: true });
const only = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 300)));
await page.goto('file://' + join(root, 'dist/index.html') + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 240000 });
await page.addStyleTag({ content: '#top,#dock,#card,#nav,#stack{display:none!important}' });
const tours = await page.evaluate(() => window.__app.ui.tours.map((t) => [t.id, t.stops.length]));
for (const [id, n] of tours) {
  if (only.length && !only.includes(id)) continue;
  const files = [];
  await page.evaluate((id) => window.__app.ui.startTour(id), id);
  for (let k = 0; k < n; k++) {
    await page.evaluate((k) => {
      const a = window.__app;
      document.querySelectorAll('#tour-dots button')[k].click();
      if (a.rig.fly) a.rig.fly.t = 1;
      a.rig.update(0.01); a.rig.update(0.01);
      for (let i = 0; i < 30; i++) { a.time += 0.05; a.emit('frame', 0.05); }
      a.ui.updateLabels(); a.renderNow();
    }, k);
    const f = join(out, `tour_${id}_${String(k + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: f }); files.push(f);
  }
  await page.evaluate(() => window.__app.ui.stopTour());
  const sheet = await browser.newPage({ viewport: { width: 1290, height: Math.ceil(n / 4) * 204 + 4 }, deviceScaleFactor: 1 });
  await sheet.setContent('<body style="margin:2px;background:#111;display:grid;grid-template-columns:repeat(4,320px);gap:2px">' + files.map((f, i) => `<div style="position:relative"><img src="data:image/png;base64,${readFileSync(f).toString('base64')}" width="320" height="200"><b style="position:absolute;left:4px;top:2px;color:#fff;font:700 14px sans-serif;text-shadow:0 0 3px #000">${i + 1}</b></div>`).join('') + '</body>');
  await sheet.screenshot({ path: join(out, `tour_${id}.png`) });
  await sheet.close();
  console.log(id, n, 'étapes');
}
await browser.close();
