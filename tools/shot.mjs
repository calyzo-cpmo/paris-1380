// Capture d'écran de contrôle : node tools/shot.mjs sortie.png [px,py,pz,tx,ty,tz] [heure] [largeur] [hauteur] [evalJS]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [out = 'shot.png', cam = '', hour = '', W = '1280', Hh = '800', js = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: +W, height: +Hh }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 400)); else if (process.env.VERBOSE) console.log('[page]', m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.stack || e).slice(0, 800)));
const t0 = Date.now();
await page.goto('file://' + join(root, 'dist/index.html') + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 240000 }).catch((e) => errors.push('timeout: ' + e.message.slice(0, 100)));
const info = await page.evaluate(([cam, hour, js]) => {
  const app = window.__app; if (!app) return { failed: String(window.__failed || 'no app') };
  if (hour) app.setHour(parseFloat(hour));
  if (cam) { const v = cam.split(',').map(Number); app.setView([v[0], v[1], v[2]], [v[3], v[4], v[5]]); }
  if (js) { try { (0, eval)(js); } catch (e) { return { evalError: String(e) }; } }
  const t = performance.now(); app.renderNow(); const t1 = performance.now() - t;
  app.__t = t1;
  return Object.assign(app.stats ? app.stats() : {}, { renderMs: Math.round(app.__t) });
}, [cam, hour, js]);
await page.waitForTimeout(300);
await page.screenshot({ path: out });
console.log(JSON.stringify({ ms: Date.now() - t0, info }));
if (errors.length) console.log('ERREURS:\n' + [...new Set(errors)].slice(0, 12).join('\n'));
await browser.close();
