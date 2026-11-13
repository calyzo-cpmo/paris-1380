// Captures des intérieurs : node tools/inshot.mjs '<json [[id, [x, z, yaw, pitch] | null, heure], …]>' [largeur] [hauteur]
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = JSON.parse(process.argv[2]), W = +(process.argv[3] || 1000), H = +(process.argv[4] || 620);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.stack || e).slice(0, 700)));
await page.goto('file://' + join(root, 'dist/index.html') + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 200000 });
await page.addStyleTag({ content: '#top,#dock,#card,#tour,#walkhud,#inhud{display:none!important}' });
let n = 0;
for (const [id, view, hour] of shots) {
  const info = await page.evaluate(([id, view, hour]) => {
    const app = window.__app, p = app.ui.byId.get(id);
    if (!p) return { err: 'lieu inconnu ' + id };
    if (hour) app.ui.setHour(hour);
    const t0 = performance.now();
    if (!app.ui.enterInterior(p)) return { err: 'pas d’intérieur pour ' + id };
    const ms = Math.round(performance.now() - t0);
    if (view) { const w = app.rig.walk; w.x = view[0]; w.z = view[1]; w.yaw = view[2]; w.pitch = view[3] ?? 0; }
    for (let i = 0; i < 6; i++) { app.rig.update(0.05); app.time += 0.05; app.emit('frame', 0.05); }
    app.renderNow();
    return { ms, tris: app.renderer.info.render.triangles, calls: app.renderer.info.render.calls, figs: app.interiors.group.children.length, ok: app.interiors.walkable(app.rig.walk.x, app.rig.walk.z) };
  }, [id, view, hour]);
  await page.waitForTimeout(120);
  const name = `in_${id}${view ? '_' + (n++) : ''}`;
  await page.screenshot({ path: join(root, `.shots/${name}.png`) });
  console.log(name, JSON.stringify(info));
  await page.evaluate(() => window.__app.ui.leaveInterior());
}
if (errors.length) console.log('ERREURS:\n' + [...new Set(errors)].slice(0, 10).join('\n'));
await browser.close();
