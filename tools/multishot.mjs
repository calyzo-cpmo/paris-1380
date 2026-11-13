// Plusieurs captures en un seul chargement : node tools/multishot.mjs '<json [[nom, "px,py,pz,tx,ty,tz", heure, "js"], …]>' [largeur] [hauteur]
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = JSON.parse(process.argv[2]), W = +(process.argv[3] || 760), H = +(process.argv[4] || 470);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.stack || e).slice(0, 500)));
await page.goto('file://' + join(root, 'dist/index.html') + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 200000 });
await page.addStyleTag({ content: '#top,#dock,#card,#tour,#walkhud{display:none!important}' });
for (const [name, cam, hour, js] of shots) {
  const info = await page.evaluate(([cam, hour, js]) => {
    const app = window.__app;
    if (app.rig.mode === 'walk') app.ui.stopWalk();
    if (hour) app.ui.setHour(hour);
    if (cam) { const v = cam.split(',').map(Number); app.setView([v[0], v[1], v[2]], [v[3], v[4], v[5]]); }
    if (js) (0, eval)(js);
    for (let i = 0; i < 70; i++) { app.rig.update(0.05); app.time += 0.05; app.emit('frame', 0.05); }
    app.renderNow();
    return { people: app.people.count, tris: app.renderer.info.render.triangles, calls: app.renderer.info.render.calls };
  }, [cam, hour, js]);
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(root, `.shots/${name}.png`) });
  console.log(name, JSON.stringify(info));
}
if (errors.length) console.log('ERREURS:\n' + [...new Set(errors)].slice(0, 8).join('\n'));
await browser.close();
