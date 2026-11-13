// Test fonctionnel : charge la page, simule les interactions principales et vérifie l'absence d'erreurs.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.stack || e).slice(0, 600)));
await page.goto('file://' + join(root, 'dist/index.html') + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 180000 });
let ok = 0, ko = 0;
const check = (name, cond, extra = '') => { if (cond) { ok++; console.log('  ok  ', name, extra); } else { ko++; console.log('  ÉCHEC', name, extra); } };
const frames = (n) => page.evaluate((n) => { const a = window.__app; for (let i = 0; i < n; i++) { a.rig.update(0.05); a.time += 0.05; a.emit('frame', 0.05); } a.renderNow(); }, n);
check('démarrage', await page.evaluate(() => window.__ready === true && !window.__failed));
const st = await page.evaluate(() => ({ places: window.__app.places.length, gates: window.__app.gates.length, trees: window.__app.treeCount, meshes: window.__app.cityMeshes.length }));
check('lieux, portes, arbres', st.places >= 60 && st.gates >= 15 && st.trees > 5000, JSON.stringify(st));
const life = await page.evaluate(() => { const a = window.__app; return { passants: a.people.total, figurants: a.figurants.length, bannieres: a.flags.length, roues: a.wheels.length, villages: a.villages.length, chantiers: a.chantiers.length }; });
check('vie : passants, figurants, bannières, moulins, villages', life.passants > 1000 && life.figurants > 1500 && life.bannieres >= 15 && life.roues >= 5 && life.villages >= 20, JSON.stringify(life));
// la foule se forme quand on s'approche des rues, marche, et se retire sur demande ou la nuit
await page.evaluate(() => window.__app.setView([-250, 160, -820], [-335, 6, -990]));
await frames(30);
const c0 = await page.evaluate(() => { const a = window.__app, p = a.people.pools[0]; return { n: a.people.count, x: p.x[0], z: p.z[0], onStreet: a.people.nav(p.x[0], p.z[0]) }; });
await frames(60);
const c2 = await page.evaluate(([x0, z0]) => { const a = window.__app, p = a.people.pools[0]; let off = 0; for (let i = 0; i < p.active; i++) if (p.ok[i] && !a.people.nav(p.x[i], p.z[i])) off++; return { n: a.people.count, d: Math.hypot(p.x[0] - x0, p.z[0] - z0), off, active: p.active }; }, [c0.x, c0.z]);
check('foule présente près des rues', c0.n > 300 && c0.onStreet === 1, JSON.stringify(c0));
check('les passants marchent et restent sur la voie', c2.d > 0.5 && c2.off === 0, JSON.stringify(c2));
await page.click('#toggle-people'); await frames(2);
check('case Habitants : foule masquée', await page.evaluate(() => window.__app.people.group.visible === false));
await page.click('#toggle-people'); await frames(2);
check('case Habitants : foule rétablie', await page.evaluate(() => window.__app.people.group.visible === true && window.__app.people.count > 300));
await page.evaluate(() => window.__app.setView([-1250, 1500, 1750], [-80, 0, -120]));   // retour à la vue d'ensemble
await frames(5);
check('étiquettes affichées', await page.evaluate(() => [...document.querySelectorAll('.label')].filter((l) => l.style.display !== 'none').length) >= 3);
// liste des lieux et fiche
await page.click('#btn-places');
await page.fill('#place-search', 'bastil');
await page.click('#place-list button');
check('fiche ouverte depuis la liste', (await page.textContent('#card-name')).includes('Bastille') && !(await page.getAttribute('#card', 'hidden') !== null));
await frames(80);
const d = await page.evaluate(() => { const a = window.__app, p = a.ui.byId.get('bastille'); return Math.hypot(a.rig.cur.x - p.x, a.rig.cur.z - p.z); });
check('vol vers le lieu', d < 5, 'écart ' + d.toFixed(1) + ' m');
await page.click('#card-src button');
check('renvoi vers la source', await page.evaluate(() => !document.getElementById('sources').hidden));
const ns = await page.evaluate(() => ({ cards: document.querySelectorAll('.src').length, imgs: document.querySelectorAll('.src img').length }));
check('catalogue des sources', ns.cards >= 22 && ns.imgs >= 16, JSON.stringify(ns));
await page.keyboard.press('Escape');
check('fermeture par Échap', await page.evaluate(() => document.getElementById('sources').hidden));
await page.click('#btn-help'); await page.click('#help .x');
check('aide', await page.evaluate(() => document.getElementById('help').hidden));
// heure
await page.evaluate(() => { const h = document.getElementById('hour'); h.value = '21'; h.dispatchEvent(new Event('input', { bubbles: true })); });
const night = await page.evaluate(() => ({ label: document.getElementById('hour-label').textContent, em: window.__app.materials.houses.emissiveIntensity, sun: window.__app.sky.day }));
check('nuit : fenêtres éclairées', night.label === '21 h 00' && night.em > 0.8, JSON.stringify(night));
await page.evaluate(() => window.__app.setView([-250, 160, -820], [-335, 6, -990])); await frames(5);
const nightCrowd = await page.evaluate(() => window.__app.people.count);
check('nuit : rues presque vides', nightCrowd < c0.n * 0.4, `${nightCrowd} contre ${c0.n} le jour`);
await frames(3);
// visite guidée
await page.click('#mode-tour');
check('visite ouverte', await page.evaluate(() => !document.getElementById('tour').hidden));
let texts = new Set();
for (let i = 0; i < 14; i++) { texts.add(await page.textContent('#tour-text')); await frames(100); await page.click('#tour-next'); }
check('13 étapes distinctes', texts.size === 13, String(texts.size));
await page.click('#tour-prev'); await frames(20);
await page.click('#tour-stop');
check('visite terminée', await page.evaluate(() => document.getElementById('tour').hidden));
// marche à pied
await page.evaluate(() => { const h = document.getElementById('hour'); h.value = '15'; h.dispatchEvent(new Event('input', { bubbles: true })); });
await page.evaluate(() => window.__app.ui.select(window.__app.ui.byId.get('halles'), false));
await page.click('#card-walk');
const w0 = await page.evaluate(() => ({ mode: window.__app.rig.mode, x: window.__app.rig.walk.x, z: window.__app.rig.walk.z, cls: document.body.classList.contains('walking') }));
check('entrée en mode piéton', w0.mode === 'walk' && w0.cls);
let moved = 0;
for (const yaw of [0, 1.57, 3.14, 4.71]) {
  await page.evaluate((yaw) => { const a = window.__app; a.rig.walk.yaw = yaw; a.rig.keys.add('KeyW'); }, yaw);
  await frames(60);
  const w = await page.evaluate(() => { const a = window.__app; a.rig.keys.clear(); return { x: a.rig.walk.x, z: a.rig.walk.z, y: a.camera.position.y, ok: a.walkable(a.rig.walk.x, a.rig.walk.z) }; });
  moved = Math.max(moved, Math.hypot(w.x - w0.x, w.z - w0.z));
  if (!w.ok) check('reste sur un sol praticable', false);
}
check('déplacement à pied', moved > 3, moved.toFixed(1) + ' m');
await page.keyboard.press('Escape');
check('sortie du mode piéton', await page.evaluate(() => window.__app.rig.mode === 'orbit' && !document.body.classList.contains('walking')));
await frames(30);
// noms, redimensionnement
await page.click('#toggle-names'); await frames(2);
check('noms masqués', await page.evaluate(() => document.getElementById('labels').style.display === 'none'));
await page.click('#toggle-names');
await page.setViewportSize({ width: 390, height: 780 }); await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await frames(3);
check('pas de défilement horizontal (mobile)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
check('aucune erreur ni avertissement console', errors.length === 0, errors.slice(0, 5).join(' | '));
console.log(`\n${ok} vérifications réussies, ${ko} échec(s)`);
await browser.close();
process.exit(ko ? 1 : 0);
