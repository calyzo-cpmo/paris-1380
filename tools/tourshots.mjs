// Planche-contact : une capture par étape de la visite guidée (contrôle visuel).
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 760, height: 470 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 300)));
await page.goto('file://' + join(root, 'dist/index.html') + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 180000 });
await page.addStyleTag({ content: '#top,#dock,#card,#tour{display:none!important}' });
const n = await page.evaluate(() => window.__app.ui.startTour() || 13);
const from = +(process.argv[2] || 0), to = +(process.argv[3] || 13);
for (let i = from; i < to; i++) {
  await page.evaluate((i) => {
    const a = window.__app;
    while (+document.getElementById('tour-count').textContent.split('/')[0] - 1 !== i) document.getElementById('tour-next').click();
    a.rig.fly.t = 1; a.rig.update(0.01); a.rig.update(0.01); a.ui.updateLabels(); a.renderNow();
  }, i);
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(root, `.shots/tour${String(i).padStart(2, '0')}.png`) });
}
await browser.close();
