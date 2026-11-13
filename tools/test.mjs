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
// personnages détaillés près de la caméra, silhouettes simples au loin
await page.evaluate(() => { const a = window.__app; a.ui.setHour(13); a.ui.startWalk(a.ui.byId.get('greve')); }); await frames(20);
const lod = await page.evaluate(() => { const p = window.__app.people; return { pres: p.near, total: p.count, atlas: !!p.atlas.texture.image, hiStat: p.statics.reduce((n, s) => n + (s.hi ? s.hi.im.count : 0), 0) }; });
check('visages et costumes : corps détaillés autour du promeneur', lod.pres > 10 && lod.pres < lod.total && lod.atlas, JSON.stringify(lod));
await page.keyboard.press('Escape'); await frames(10);
// clic direct sur un monument, chronologie
await page.evaluate(() => window.__app.setView([-330, 260, 150], [-40, 20, -18])); await frames(4);
const ndPt = await page.evaluate(() => { const a = window.__app, p = a.ui.byId.get('notre-dame'), v = p.v.clone(); v.y = p.y0 + 25; v.project(a.camera); const r = a.renderer.domElement.getBoundingClientRect(); return [r.left + (v.x * 0.5 + 0.5) * r.width, r.top + (-v.y * 0.5 + 0.5) * r.height]; });
await page.evaluate(() => window.__app.ui.select(null));
await page.mouse.move(ndPt[0], ndPt[1]); await frames(2);
check('survol d’un monument : curseur main', await page.evaluate(() => window.__app.renderer.domElement.style.cursor === 'pointer'));
await page.mouse.click(ndPt[0], ndPt[1]); await frames(40);
const cardND = await page.evaluate(() => ({ name: document.getElementById('card-name').textContent, chrono: document.querySelectorAll('#card-chrono li:not(.sep)').length, after: document.querySelectorAll('#card-chrono li.after').length, enter: !document.getElementById('card-enter').hidden }));
check('clic sur le monument : fiche, chronologie, bouton Entrer', cardND.name === 'Notre-Dame' && cardND.chrono >= 6 && cardND.after >= 1 && cardND.enter, JSON.stringify(cardND));
const hist = await page.evaluate(() => { const ps = window.__app.places; return { n: ps.length, avec: ps.filter((p) => p.chrono && p.chrono.length >= 2).length, visitables: ps.filter((p) => window.__app.interiors.has(p)).length }; });
check('chaque lieu a son histoire', hist.avec === hist.n, JSON.stringify(hist));
await page.evaluate(() => window.__app.ui.select(window.__app.ui.byId.get('greve'), false));
check('lieu sans intérieur : pas de bouton Entrer', await page.evaluate(() => document.getElementById('card-enter').hidden));
// visite intérieure : entrée, regard, déplacement au clic, points de vue, heure, sortie
await page.evaluate(() => window.__app.ui.select(window.__app.ui.byId.get('notre-dame'), false));
await page.click('#card-enter'); await frames(6);
const in0 = await page.evaluate(() => { const a = window.__app; return { inside: !!a.inside, hud: !document.getElementById('inhud').hidden, cls: document.body.classList.contains('inside'), tris: a.interiors.tris, spots: document.querySelectorAll('#in-spots button').length, w: { ...a.rig.walk }, ok: a.walkable(a.rig.walk.x, a.rig.walk.z) }; });
check('entrée dans Notre-Dame', in0.inside && in0.hud && in0.cls && in0.tris > 20000 && in0.spots >= 4 && in0.ok, JSON.stringify({ tris: in0.tris, spots: in0.spots }));
await page.mouse.move(700, 350); await page.mouse.down(); await page.mouse.move(520, 360, { steps: 4 }); await page.mouse.up(); await frames(2);
const in1 = await page.evaluate(() => ({ ...window.__app.rig.walk }));
check('glisser pour regarder', Math.abs(in1.yaw - in0.w.yaw) > 0.3, (in1.yaw - in0.w.yaw).toFixed(2));
await page.mouse.click(600, 560); await frames(70);
const in2 = await page.evaluate(() => { const a = window.__app; return { ...a.rig.walk, ok: a.walkable(a.rig.walk.x, a.rig.walk.z) }; });
check('cliquer le sol pour avancer', Math.hypot(in2.x - in1.x, in2.z - in1.z) > 2 && in2.ok, Math.hypot(in2.x - in1.x, in2.z - in1.z).toFixed(1) + ' m');
await page.click('#in-spots button:last-child'); await frames(90);
const in3 = await page.evaluate(() => ({ ...window.__app.rig.walk }));
check('point de vue : glissement vers le chœur', in3.z < in2.z - 10, in3.z.toFixed(1));
await page.evaluate(() => { const a = window.__app; a.rig.keys.add('KeyW'); }); await frames(40);
const in4 = await page.evaluate(() => { const a = window.__app; a.rig.keys.clear(); return { ...a.rig.walk, ok: a.walkable(a.rig.walk.x, a.rig.walk.z) }; });
check('marche au clavier sans traverser le mobilier', in4.ok);
const g0 = await page.evaluate(() => window.__app.interiors.mats.glass.color.r);
await page.evaluate(() => { const h = document.getElementById('hour'); h.value = '22'; h.dispatchEvent(new Event('input', { bubbles: true })); }); await frames(2);
check('la nuit, les vitraux s’éteignent', await page.evaluate(() => window.__app.interiors.mats.glass.color.r) < g0 * 0.4);
await page.evaluate(() => { const h = document.getElementById('hour'); h.value = '15'; h.dispatchEvent(new Event('input', { bubbles: true })); });
await page.keyboard.press('Escape'); await frames(4);
check('sortie : retour au survol', await page.evaluate(() => { const a = window.__app; return !a.inside && a.rig.mode === 'orbit' && document.getElementById('inhud').hidden && !document.body.classList.contains('inside') && a.people.group.visible !== undefined; }));
// tous les intérieurs se construisent, avec une entrée praticable
const all = await page.evaluate(() => { const a = window.__app, bad = []; let n = 0; for (const p of a.places) { if (!a.interiors.has(p)) continue; n++; try { if (!a.ui.enterInterior(p)) bad.push(p.id + ' refusé'); else { const w = a.rig.walk; if (!a.walkable(w.x, w.z)) bad.push(p.id + ' entrée bloquée'); for (const s of a.interiors.spots) if (!a.walkable(s[1], s[2])) bad.push(p.id + ' point « ' + s[0] + ' » bloqué'); a.rig.update(0.05); a.emit('frame', 0.05); a.renderNow(); } } catch (e) { bad.push(p.id + ' : ' + e.message); } a.ui.leaveInterior(); } return { n, bad }; });
check('tous les intérieurs visitables', all.n >= 40 && all.bad.length === 0, all.n + ' lieux ' + all.bad.slice(0, 6).join(' ; '));
await frames(4);
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
