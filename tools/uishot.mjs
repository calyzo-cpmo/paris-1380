// Captures de l'interface complète (fiche, visite intérieure) : node tools/uishot.mjs
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 760);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.stack || e).slice(0, 700)));
await page.goto('file://' + join(root, 'dist/index.html') + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 200000 });
const frames = (n) => page.evaluate((n) => { const a = window.__app; for (let i = 0; i < n; i++) { a.rig.update(0.05); a.time += 0.05; a.emit('frame', 0.05); } a.renderNow(); }, n);
await page.evaluate(() => window.__app.setView([-330, 260, 150], [-40, 20, -18])); await frames(4);
// clic direct sur Notre-Dame, au milieu de sa silhouette
const pt = await page.evaluate(() => { const a = window.__app, p = a.ui.byId.get('notre-dame'), v = p.v.clone(); v.y = p.y0 + 25; v.project(a.camera); const r = a.renderer.domElement.getBoundingClientRect(); return [r.left + (v.x * 0.5 + 0.5) * r.width, r.top + (-v.y * 0.5 + 0.5) * r.height]; });
await page.mouse.move(pt[0], pt[1]); await frames(2);
console.log('survol', await page.evaluate(() => window.__app.renderer.domElement.style.cursor));
await page.mouse.click(pt[0], pt[1]); await frames(70);
console.log('fiche', await page.textContent('#card-name'), '| chrono', await page.evaluate(() => document.querySelectorAll('#card-chrono li').length), '| entrer visible', await page.evaluate(() => !document.getElementById('card-enter').hidden));
await page.screenshot({ path: join(root, '.shots/ui_card.png') });
await page.click('#card-enter'); await frames(6);
await page.screenshot({ path: join(root, '.shots/ui_inside.png') });
// glisser pour regarder, cliquer le sol pour avancer
const w0 = await page.evaluate(() => ({ ...window.__app.rig.walk }));
await page.mouse.move(W * 0.6, H * 0.5); await page.mouse.down(); await page.mouse.move(W * 0.6 - 200, H * 0.5 + 20, { steps: 5 }); await page.mouse.up(); await frames(3);
const w1 = await page.evaluate(() => ({ ...window.__app.rig.walk }));
await page.mouse.click(W * 0.62, H * 0.8); await frames(60);
const w2 = await page.evaluate(() => ({ ...window.__app.rig.walk }));
console.log('regard', (w1.yaw - w0.yaw).toFixed(2), '| marche', Math.hypot(w2.x - w1.x, w2.z - w1.z).toFixed(1), 'm');
await page.click('#in-spots button:nth-child(3)'); await frames(80);
await page.screenshot({ path: join(root, '.shots/ui_inside2.png') });
await page.keyboard.press('Escape'); await frames(4);
console.log('sorti', await page.evaluate(() => !window.__app.inside && document.getElementById('inhud').hidden && window.__app.rig.mode));
await page.screenshot({ path: join(root, '.shots/ui_out.png') });
if (errors.length) console.log('ERREURS:\n' + [...new Set(errors)].slice(0, 10).join('\n'));
await browser.close();
