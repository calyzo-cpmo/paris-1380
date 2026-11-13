// Test fonctionnel : charge la page, simule les interactions principales et vérifie l'absence d'erreurs.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 1 });
// En rendu logiciel, une image de la maquette coûte plus d'une seconde : délai large pour les clics et les attentes.
page.setDefaultTimeout(120000);
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.stack || e).slice(0, 600)));
await page.goto('file://' + join(root, 'dist/index.html') + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 240000 });
let ok = 0, ko = 0;
const t0 = Date.now(), clock = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + ' s';      // temps écoulé : repère les étapes lentes
const check = (name, cond, extra = '') => { if (cond) { ok++; console.log(clock(), ' ok  ', name, extra); } else { ko++; console.log(clock(), ' ÉCHEC', name, extra); } };
// Avance de n images puis rend la scène, et attend que la carte graphique ait fini (barrière de synchronisation) :
// sans cela, le rendu logiciel prend du retard sur le script et l'attente retombe au hasard sur un clic ultérieur.
const frames = (n) => page.evaluate(async (n) => {
  const a = window.__app; for (let i = 0; i < n; i++) { a.rig.update(0.05); a.time += 0.05; a.emit('frame', 0.05); } a.renderNow();
  const gl = a.renderer.getContext(); if (!gl.fenceSync) return;
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
  await new Promise((done) => { const poll = () => { const s = gl.clientWaitSync(sync, 0, 0); if (s === gl.TIMEOUT_EXPIRED) setTimeout(poll, 8); else { gl.deleteSync(sync); done(); } }; poll(); });
}, n);
const setHour = (h) => page.evaluate((h) => { const e = document.getElementById('hour'); e.value = String(h); e.dispatchEvent(new Event('input', { bubbles: true })); }, h);
const visible = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; }, sel);
const overview = () => page.evaluate(() => window.__app.setView([-1250, 1500, 1750], [-80, 0, -120]));

check('démarrage', await page.evaluate(() => window.__ready === true && !window.__failed));
const st = await page.evaluate(() => ({ places: window.__app.places.length, gates: window.__app.gates.length, trees: window.__app.treeCount, meshes: window.__app.cityMeshes.length }));
check('lieux, portes, arbres', st.places >= 60 && st.gates >= 15 && st.trees > 5000, JSON.stringify(st));
const life = await page.evaluate(() => { const a = window.__app; return { passants: a.people.total, figurants: a.figurants.length, bannieres: a.flags.length, roues: a.wheels.length, villages: a.villages.length, chantiers: a.chantiers.length }; });
check('vie : passants, figurants, bannières, moulins, villages', life.passants > 1000 && life.figurants > 1500 && life.bannieres >= 15 && life.roues >= 5 && life.villages >= 20, JSON.stringify(life));

// ---------- abords : haies, bois, vergers, plateaux de l'horizon, sol prolongé dans la brume
const cs = await page.evaluate(() => { const a = window.__app, T = a.terrain; let far = 0; a.scene.traverse((o) => { if (o.isMesh && o.geometry.boundingBox && o.geometry.boundingBox.max.x > 20000) far++; }); return { ...a.countryside, lointain: far, plateau: Math.round(T.height(3000, -8600)), plaine: Math.round(T.height(600, -2600)), seineAuLoin: T.height(-13000, 9300) < 0.4, vincennes: Math.round(T.height(6280, 1146)) }; });
check('abords : haies, bosquets, vergers, croix de chemin', cs.hedges > 5000 && cs.domes > 2000 && cs.orchard > 1000 && cs.crosses >= 5, JSON.stringify(cs));
check('abords : plateaux à l’horizon, fleuve et sol prolongés au-delà du plateau', cs.lointain >= 1 && cs.plateau > cs.plaine + 15 && cs.seineAuLoin, JSON.stringify(cs));

// ---------- la foule se forme quand on s'approche des rues, marche, et se retire sur demande ou la nuit
await page.evaluate(() => window.__app.setView([-250, 160, -820], [-335, 6, -990]));
await frames(30);
const c0 = await page.evaluate(() => { const a = window.__app, p = a.people.pools[0]; return { n: a.people.count, xs: Array.from(p.x.slice(0, 20)), zs: Array.from(p.z.slice(0, 20)), onStreet: a.people.nav(p.x[0], p.z[0]) }; });
await frames(60);
// certains passants sont à l'arrêt : on retient le plus grand déplacement parmi les vingt premiers
const c2 = await page.evaluate(([xs, zs]) => { const a = window.__app, p = a.people.pools[0]; let off = 0, d = 0; for (let i = 0; i < p.active; i++) if (p.ok[i] && !a.people.nav(p.x[i], p.z[i])) off++; for (let i = 0; i < xs.length; i++) d = Math.max(d, Math.hypot(p.x[i] - xs[i], p.z[i] - zs[i])); return { n: a.people.count, d, off, active: p.active }; }, [c0.xs, c0.zs]);
check('foule présente près des rues', c0.n > 300 && c0.onStreet === 1, JSON.stringify({ n: c0.n }));
check('les passants marchent et restent sur la voie', c2.d > 0.5 && c2.off === 0, JSON.stringify(c2));
await page.click('#btn-view');
check('menu Affichage ouvert', await visible('#view-menu'));
await page.click('#toggle-people'); await frames(2);
check('case Habitants : foule masquée', await page.evaluate(() => window.__app.people.group.visible === false));
await page.click('#toggle-people'); await frames(2);
check('case Habitants : foule rétablie', await page.evaluate(() => window.__app.people.group.visible === true && window.__app.people.count > 300));
await page.keyboard.press('Escape');
check('Échap referme le menu', !(await visible('#view-menu')));

// ---------- vue d'ensemble : noms des grands lieux, pastilles pour tous les autres
await overview(); await frames(5);
const lab = await page.evaluate(() => { const l = [...document.querySelectorAll('.label')].filter((e) => e.style.display !== 'none'); return { noms: l.filter((e) => !e.classList.contains('dot')).length, pastilles: l.filter((e) => e.classList.contains('dot')).length, portes: document.querySelectorAll('.label.in').length }; });
await page.evaluate(() => window.__app.setView([0, 900, 900], [0, 0, -3000])); await frames(3);
lab.villages = await page.evaluate(() => [...document.querySelectorAll('.vlabel')].filter((e) => e.style.display !== 'none').map((e) => e.textContent));
await overview(); await frames(3);
check('étiquettes : noms, pastilles, marque des intérieurs, villages', lab.noms >= 3 && lab.pastilles >= 25 && lab.portes >= 40 && lab.villages.length >= 2, JSON.stringify(lab));

// ---------- liste des lieux, fiche, carnet de visite
await page.click('#btn-places');
await page.fill('#place-search', 'bastil');
await page.click('#place-list button');
check('fiche ouverte depuis la liste', (await page.textContent('#card-name')).includes('Bastille') && (await visible('#card')));
await frames(80);
const d = await page.evaluate(() => { const a = window.__app, p = a.ui.byId.get('bastille'); return Math.hypot(a.rig.cur.x - p.x, a.rig.cur.z - p.z); });
check('vol vers le lieu', d < 5, 'écart ' + d.toFixed(1) + ' m');
check('fiche : degré de certitude du monument', /restitué/i.test(await page.textContent('#card-cert')), await page.textContent('#card-cert'));
check('« où suis-je » : rive et lieu voisin', /Rive droite/.test(await page.textContent('#where')) && (await visible('#where')), await page.textContent('#where'));
await page.fill('#place-search', '');
const all0 = await page.evaluate(() => document.querySelectorAll('#place-list button').length);
await page.click('#place-filters [data-filter="inside"]');
const fIn = await page.evaluate(() => ({ n: document.querySelectorAll('#place-list button').length, want: window.__app.places.filter((p) => p.hasIn).length }));
await page.click('#place-filters [data-filter="new"]');
const fNew = await page.evaluate(() => ({ n: document.querySelectorAll('#place-list button').length, want: window.__app.places.filter((p) => !p.seen).length }));
await page.click('#place-filters [data-filter="all"]');
check('filtres de la liste : intérieurs, pas encore vus', all0 === st.places && fIn.n === fIn.want && fIn.n >= 40 && fNew.n === fNew.want && fNew.n < all0, JSON.stringify({ all0, fIn, fNew }));
const carnet = await page.evaluate(() => ({ badge: document.getElementById('places-count').textContent, txt: document.getElementById('carnet-text').textContent, vu: document.querySelectorAll('#place-list button.seen').length, saved: JSON.parse(localStorage.getItem('paris1380:seen') || '[]') }));
check('carnet de visite : lieu vu, compteur, mémoire', carnet.badge === `1/${st.places}` && carnet.vu === 1 && carnet.saved.includes('bastille') && /1 lieu vu/.test(carnet.txt), JSON.stringify(carnet));
await page.click('#places .x');
await page.click('#card-src button');
check('renvoi vers la source', await page.evaluate(() => !document.getElementById('sources').hidden));
const ns = await page.evaluate(() => ({ cards: document.querySelectorAll('.src').length, imgs: document.querySelectorAll('.src img').length }));
check('catalogue des sources', ns.cards >= 22 && ns.imgs >= 16, JSON.stringify(ns));
await page.keyboard.press('Escape');
check('fermeture par Échap', await page.evaluate(() => document.getElementById('sources').hidden));
await page.click('#btn-help'); await page.click('#help .x');
check('aide', await page.evaluate(() => document.getElementById('help').hidden));
await page.keyboard.press('/');
check('touche / : recherche d’un lieu', await page.evaluate(() => !document.getElementById('places').hidden && document.activeElement === document.getElementById('place-search')));
await page.keyboard.press('Escape');
check('Échap referme la liste', await page.evaluate(() => document.getElementById('places').hidden && !document.body.classList.contains('places-open')));

// ---------- heure : curseur, moments de la journée, journée en accéléré
await setHour(21);
const night = await page.evaluate(() => ({ label: document.getElementById('hour-label').textContent, em: window.__app.materials.houses.emissiveIntensity, sun: window.__app.sky.day }));
check('nuit : fenêtres éclairées', night.label === '21 h 00' && night.em > 0.8, JSON.stringify(night));
await page.evaluate(() => window.__app.setView([-250, 160, -820], [-335, 6, -990])); await frames(5);
const nightCrowd = await page.evaluate(() => window.__app.people.count);
check('nuit : rues presque vides', nightCrowd < c0.n * 0.4, `${nightCrowd} contre ${c0.n} le jour`);
await page.click('#hour-presets [data-hour="12"]');
check('moment de la journée : midi', await page.evaluate(() => document.getElementById('hour-label').textContent === '12 h 00' && window.__app.sky.hour === 12));
await page.click('#hour-play'); await frames(40);
const play = await page.evaluate(() => ({ h: window.__app.sky.hour, on: document.getElementById('hour-play').getAttribute('aria-pressed') }));
await page.click('#hour-play');
const play2 = await page.evaluate(() => ({ h: window.__app.sky.hour, on: document.getElementById('hour-play').getAttribute('aria-pressed') }));
await frames(20);
check('journée en accéléré : l’heure avance, puis s’arrête', play.h > 12.5 && play.on === 'true' && play2.on === 'false' && (await page.evaluate(() => window.__app.sky.hour)) === play2.h, JSON.stringify([play, play2]));
await frames(3);

// ---------- parcours commentés
await page.click('#mode-tour');
const tl = await page.evaluate(() => ({ open: !document.getElementById('tours').hidden, n: document.querySelectorAll('#tours-list button').length, bad: window.__app.ui.tours.flatMap((t) => t.stops.filter((s) => s[0] && !window.__app.ui.byId.has(s[0])).map((s) => t.id + ':' + s[0])) }));
check('choix du parcours : cinq parcours, étapes toutes situées', tl.open && tl.n === 5 && tl.bad.length === 0, JSON.stringify(tl));
await page.click('#tours-list button');
check('visite ouverte', (await visible('#tour')) && (await page.evaluate(() => document.getElementById('tours').hidden)));
let texts = new Set();
for (let i = 0; i < 14; i++) { texts.add(await page.textContent('#tour-text')); await frames(100); await page.click('#tour-next'); }
check('13 étapes distinctes', texts.size === 13, String(texts.size));
await page.click('#tour-prev'); await frames(20);
const dots = await page.evaluate(() => ({ n: document.querySelectorAll('#tour-dots button').length, cur: [...document.querySelectorAll('#tour-dots button')].findIndex((b) => b.getAttribute('aria-current') === 'step'), count: document.getElementById('tour-count').textContent }));
check('progression du parcours', dots.n === 13 && dots.cur === 0 && dots.count === '1 / 13', JSON.stringify(dots));
await page.click('#tour-dots button:nth-child(3)'); await frames(100);
check('aller à une étape : le Palais, sans fiche par-dessus', (await page.textContent('#tour-place')) === 'Palais de la Cité' && !(await visible('#card')) && (await visible('#tour-enter')));
await page.click('#tour-play');
const i0 = await page.evaluate(() => window.__app.ui.tour.idx);
await frames(400);
const i1 = await page.evaluate(() => window.__app.ui.tour.idx);
await page.click('#tour-play'); await frames(200);
const i2 = await page.evaluate(() => window.__app.ui.tour.idx);
check('pause, puis reprise de l’enchaînement', i0 === 2 && i1 === 2 && i2 === 3, JSON.stringify([i0, i1, i2]));
await page.click('#tour-dots button:nth-child(3)'); await frames(100);
await page.click('#tour-enter'); await frames(6);
check('parcours : entrer dans le monument de l’étape', await page.evaluate(() => !!window.__app.inside && document.body.classList.contains('inside')));
await page.keyboard.press('Escape'); await frames(4);
check('retour de l’intérieur : le parcours reprend où il était', (await visible('#tour')) && (await page.evaluate(() => !window.__app.inside && window.__app.ui.tour.idx === 2)));
const others = await page.evaluate(() => { const a = window.__app, out = []; for (const t of a.ui.tours.slice(1)) { a.ui.startTour(t.id); const seen = new Set(); for (let i = 0; i < t.stops.length; i++) { document.getElementById('tour-next').click(); seen.add(document.getElementById('tour-text').textContent); } out.push([t.id, t.stops.length, seen.size, document.getElementById('tour-title').textContent]); } return out; });
check('quatre parcours thématiques', others.length === 4 && others.every((o) => o[1] >= 8 && o[2] === o[1] && o[3].length > 3), JSON.stringify(others));
await page.click('#tour-stop');
check('visite terminée', !(await visible('#tour')) && (await page.evaluate(() => window.__app.ui.tour === null)));
await page.evaluate(() => window.__app.ui.select(null)); await frames(3);

// ---------- marche à pied
await setHour(15);
const starts = await page.evaluate(() => { const a = window.__app, out = []; for (const id of ['notre-dame', 'louvre', 'halles', 'bastille', 'sainte-chapelle', 'temple', 'saint-merri']) { const p = a.ui.byId.get(id), v = a.ui.vantage(p), fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw); let free = 0; for (let t = 0.5; t < 60; t += 0.5) { if (!a.walkable(v.x + fx * t, v.z + fz * t)) break; free = t; } const aim = Math.hypot(v.x + fx * 50 - p.x, v.z + fz * 50 - p.z) < Math.hypot(v.x - p.x, v.z - p.z); out.push([id, Math.round(free), a.walkable(v.x, v.z), aim]); } return out; });
check('départ à pied : du recul devant chaque monument, face à lui', starts.every((s) => s[1] >= 8 && s[2] && s[3]), JSON.stringify(starts));
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
const wl = await page.evaluate(() => ({ noms: [...document.querySelectorAll('.label')].filter((e) => e.style.display !== 'none' && !e.classList.contains('dot')).length, ou: document.getElementById('where').textContent, plan: window.__app.ui.mini.mode() }));
check('à pied : noms des lieux proches, rive, plan du quartier', wl.noms >= 1 && /Rive droite/.test(wl.ou) && wl.plan === 'walk', JSON.stringify(wl));
await page.keyboard.press('Escape');
check('sortie du mode piéton', await page.evaluate(() => window.__app.rig.mode === 'orbit' && !document.body.classList.contains('walking')));
await frames(30);
// toucher le sol pour avancer, sur la place de Grève
await page.evaluate(() => { const a = window.__app; a.ui.setHour(13); a.ui.startWalk(a.ui.byId.get('greve')); }); await frames(20);
const g0 = await page.evaluate(() => ({ ...window.__app.rig.walk }));
await page.mouse.click(860, 520); await frames(3);          // à l'écart de l'invite affichée au centre
const gTo = await page.evaluate(() => window.__app.rig.walkTo && window.__app.rig.walkTo.slice());
await frames(80);
const g1 = await page.evaluate(() => { const a = window.__app; return { x: a.rig.walk.x, z: a.rig.walk.z, ok: a.walkable(a.rig.walk.x, a.rig.walk.z), to: a.rig.walkTo }; });
check('cliquer le sol pour avancer dans la rue', !!gTo && Math.hypot(g1.x - g0.x, g1.z - g0.z) > 2 && g1.ok && Math.hypot(g1.x - gTo[0], g1.z - gTo[1]) < 3, JSON.stringify({ gTo, d: Math.hypot(g1.x - g0.x, g1.z - g0.z).toFixed(1) }));
// personnages détaillés près de la caméra, silhouettes simples au loin
const lod = await page.evaluate(() => { const p = window.__app.people; return { pres: p.near, total: p.count, atlas: !!p.atlas.texture.image, hiStat: p.statics.reduce((n, s) => n + (s.hi ? s.hi.im.count : 0), 0) }; });
check('visages et costumes : corps détaillés autour du promeneur', lod.pres > 10 && lod.pres < lod.total && lod.atlas, JSON.stringify(lod));
// depuis la rue : s'approcher d'un monument, lire sa fiche, y entrer, en ressortir à pied
await page.evaluate(() => { const a = window.__app, p = a.ui.byId.get('notre-dame'); a.ui.startWalk(p); a.rig.walkTo = [p.x, p.z]; }); await frames(160);
const pr = await page.evaluate(() => ({ near: window.__app.ui.near && window.__app.ui.near.id, txt: document.getElementById('prompt-text').textContent }));
check('devant Notre-Dame : invite à entrer', pr.near === 'notre-dame' && (await visible('#prompt')) && (await visible('#prompt-enter')), JSON.stringify(pr));
await page.keyboard.press('f'); await frames(2);
check('touche F : fiche du monument voisin', (await visible('#card')) && (await page.textContent('#card-name')) === 'Notre-Dame');
await page.keyboard.press('Escape'); await frames(2);
const wBefore = await page.evaluate(() => ({ x: window.__app.rig.walk.x, z: window.__app.rig.walk.z }));
await page.keyboard.press('e'); await frames(6);
check('touche E : entrée depuis la rue', await page.evaluate(() => !!window.__app.inside && window.__app.interiors.active.id === 'notre-dame'));
await page.keyboard.press('Escape'); await frames(4);
const wAfter = await page.evaluate(() => { const a = window.__app; return { mode: a.rig.mode, cls: document.body.classList.contains('walking'), x: a.rig.walk.x, z: a.rig.walk.z, inside: !!a.inside }; });
check('sortie de l’intérieur : de retour dans la rue, au même endroit', wAfter.mode === 'walk' && wAfter.cls && !wAfter.inside && Math.hypot(wAfter.x - wBefore.x, wAfter.z - wBefore.z) < 1, JSON.stringify(wAfter));
await page.keyboard.press('Escape'); await frames(10);
// descente animée, puis double-clic sur la maquette, jusque dans la campagne
await page.evaluate(() => { const a = window.__app; a.ui.startWalk(a.ui.byId.get('greve'), { instant: false }); });
const dsc0 = await page.evaluate(() => ({ pending: window.__app.ui.pending, mode: window.__app.rig.mode }));
await frames(60);
const dsc1 = await page.evaluate(() => ({ pending: window.__app.ui.pending, mode: window.__app.rig.mode, y: window.__app.camera.position.y - window.__app.walkHeight(window.__app.rig.walk.x, window.__app.rig.walk.z) }));
check('descente animée du survol à la rue', dsc0.pending && dsc0.mode === 'orbit' && !dsc1.pending && dsc1.mode === 'walk' && Math.abs(dsc1.y - 1.68) < 0.2, JSON.stringify([dsc0, dsc1]));
await page.keyboard.press('Escape'); await frames(10);
await page.evaluate(() => window.__app.setView([40, 320, -2260], [0, 0, -2560])); await frames(4);
check('rien à désigner sous le pointeur', await page.evaluate(() => window.__app.ui.pick(550, 350) === null));
await page.mouse.dblclick(550, 350); await frames(4);
const out = await page.evaluate(() => { const a = window.__app, w = a.rig.walk; return { mode: a.rig.mode, x: Math.round(w.x), z: Math.round(w.z), ok: a.walkable(w.x, w.z), ou: document.getElementById('where').textContent }; });
check('double-clic : descendre à pied, jusque dans la campagne', out.mode === 'walk' && out.ok && out.z < -2100 && Math.hypot(out.x, out.z + 2560) < 120 && /Hors les murs/.test(out.ou), JSON.stringify(out));
await page.evaluate(() => { const a = window.__app; a.rig.walk.yaw = 3.14; a.rig.keys.add('KeyW'); }); await frames(60);
const out2 = await page.evaluate(() => { const a = window.__app; a.rig.keys.clear(); return { z: Math.round(a.rig.walk.z), ok: a.walkable(a.rig.walk.x, a.rig.walk.z) }; });
check('marche à travers champs', out2.ok && Math.abs(out2.z - out.z) > 5, JSON.stringify(out2));
const vil = await page.evaluate(() => { const a = window.__app, v = a.villages.find((q) => q.name === 'Belleville'); let n = 0; for (let x = -120; x <= 120; x += 2) for (let z = -120; z <= 120; z += 2) if (a.solid.get(v.x + x, v.z + z)) n++; return n; });
check('hors du plan : les maisons des villages font obstacle', vil > 50, vil + ' cellules');
await page.keyboard.press('Escape'); await frames(10);

// ---------- clic direct sur un monument, chronologie
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

// ---------- visite intérieure : entrée, regard, déplacement au clic, points de vue, heure, sortie
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
const gl0 = await page.evaluate(() => window.__app.interiors.mats.glass.color.r);
await setHour(22); await frames(2);
check('la nuit, les vitraux s’éteignent', await page.evaluate(() => window.__app.interiors.mats.glass.color.r) < gl0 * 0.4);
await setHour(15);
await page.keyboard.press('Escape'); await frames(4);
check('sortie : retour au survol', await page.evaluate(() => { const a = window.__app; return !a.inside && a.rig.mode === 'orbit' && document.getElementById('inhud').hidden && !document.body.classList.contains('inside') && a.people.group.visible !== undefined; }));
check('carnet : intérieur visité', await page.evaluate(() => window.__app.ui.byId.get('notre-dame').visited && JSON.parse(localStorage.getItem('paris1380:inside')).includes('notre-dame')));
// tous les intérieurs se construisent, avec une entrée praticable
const all = await page.evaluate(() => { const a = window.__app, bad = []; let n = 0; for (const p of a.places) { if (!a.interiors.has(p)) continue; n++; try { if (!a.ui.enterInterior(p)) bad.push(p.id + ' refusé'); else { const w = a.rig.walk; if (!a.walkable(w.x, w.z)) bad.push(p.id + ' entrée bloquée'); for (const s of a.interiors.spots) if (!a.walkable(s[1], s[2])) bad.push(p.id + ' point « ' + s[0] + ' » bloqué'); a.renderNow(); a.ui.leaveInterior(); } } catch (e) { bad.push(p.id + ' ' + e.message); } } return { n, bad }; });
check('tous les intérieurs visitables', all.n >= 40 && all.bad.length === 0, all.n + ' lieux ' + all.bad.slice(0, 6).join(' ; '));
await frames(4);

// ---------- repères : mini-plan, boussole, vue d'ensemble
await page.evaluate(() => window.__app.ui.select(null));
await overview(); await frames(4);
const mm = await page.evaluate(() => { const c = document.getElementById('minimap'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, seen = new Set(); for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); const r = c.getBoundingClientRect(); return { teintes: seen.size, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
check('mini-plan dessiné', mm.teintes > 12 && mm.w > 100, JSON.stringify(mm));
await page.mouse.click(mm.x, mm.y); await frames(60);
const mm2 = await page.evaluate(() => ({ x: Math.round(window.__app.rig.cur.x), z: Math.round(window.__app.rig.cur.z), dist: Math.round(window.__app.rig.cur.dist) }));
check('cliquer le mini-plan : la vue s’y rend', Math.hypot(mm2.x + 30, mm2.z + 284) < 80 && mm2.dist <= 700, JSON.stringify(mm2));
await page.click('#map-zoom'); await frames(2);
check('mini-plan : échelle du quartier', await page.evaluate(() => window.__app.ui.mini.zoom.orbit === 'local' && document.getElementById('map-zoom').textContent === 'Ville entière'));
await page.click('#map-zoom');
await page.evaluate(() => { const g = window.__app.rig.goal; g.az = 2.2; }); await frames(30);
await page.click('#compass'); await frames(40);
const az = await page.evaluate(() => ({ az: window.__app.rig.cur.az, rose: document.getElementById('compass-rose').getAttribute('transform') }));
check('boussole : nord en haut', Math.abs(Math.sin(az.az)) < 0.02 && Math.cos(az.az) > 0.99 && /rotate\(-?0(\.0)?\)/.test(az.rose), JSON.stringify(az));
await page.click('#btn-home'); await frames(70);
const home = await page.evaluate(() => ({ x: Math.round(window.__app.rig.cur.x), z: Math.round(window.__app.rig.cur.z), dist: Math.round(window.__app.rig.cur.dist) }));
check('vue d’ensemble', home.x === -80 && home.z === -120 && home.dist === 2300, JSON.stringify(home));
const wh = await page.evaluate(() => { const w = window.__app.ui.where; return [w(103, -899), w(-40, -18), w(-380, 520), w(0, -2600), w(269, 60)].map((r) => [r.region, r.street, r.near]); });
check('repérage : rues du plan, rives, îles, hors les murs', wh[0][0] === 'Rive droite' && wh[0][1] === 'Rue Saint-Martin' && wh[1][0] === 'Île de la Cité' && wh[1][2] === 'Notre-Dame' && wh[2][0] === 'Rive gauche' && wh[3][0] === 'Hors les murs' && wh[4][0] === 'Île Notre-Dame', JSON.stringify(wh));

// ---------- degré de certitude
await page.click('#btn-view'); await page.click('#toggle-cert'); await frames(3);
const ce = await page.evaluate(() => { const a = window.__app, c = a.cert, n = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < c.map.length; i++) n[c.map[i]]++; const cl = (id) => a.ui.byId.get(id).cert; return { on: c.uniforms.uCert.value, legend: !document.getElementById('legend').hidden, items: document.querySelectorAll('#legend-list li').length, n, nd: cl('notre-dame'), merri: cl('saint-merri'), vincennes: cl('vincennes'), greve: cl('greve'), bastille: cl('bastille'), porte: cl('porte-2') }; });
check('calque de certitude : restitué, emprise attestée, conjectural, hors plan', ce.on === 1 && ce.legend && ce.items === 4 && ce.nd === 2 && ce.bastille === 2 && ce.merri === 3 && ce.porte === 3 && ce.vincennes === 5 && ce.greve === 1 && ce.n[2] > 2000 && ce.n[3] > 20000 && ce.n[4] > 200000, JSON.stringify(ce));
await page.click('#legend .x'); await frames(2);
check('calque masqué depuis la légende', await page.evaluate(() => window.__app.cert.uniforms.uCert.value === 0 && document.getElementById('legend').hidden && !document.getElementById('toggle-cert').checked));

// ---------- lien partageable
await page.evaluate(() => { const a = window.__app; a.setView([-330, 260, 150], [-40, 20, -18]); a.ui.setHour(18.75); a.ui.select(a.ui.byId.get('notre-dame'), false); });
await frames(3);
const link = await page.evaluate(() => window.__app.ui.link());
const back = await page.evaluate((link) => { const a = window.__app; a.ui.select(null); a.ui.setHour(9); a.setView([0, 3000, 3000], [900, 0, -900]); const used = a.ui.openLink(link); return { used, x: Math.round(a.rig.cur.x), z: Math.round(a.rig.cur.z), h: a.sky.hour, card: !document.getElementById('card').hidden && document.getElementById('card-name').textContent }; }, link);
check('lien partageable : la vue, l’heure et la fiche reviennent', /^#c=-40,-18,\d+,-?[\d.]+,[\d.]+&h=18\.75&p=notre-dame$/.test(link) && back.used && back.x === -40 && back.z === -18 && back.h === 18.75 && back.card === 'Notre-Dame', link + ' ' + JSON.stringify(back));
const linkW = await page.evaluate(() => { const a = window.__app; a.ui.select(null); a.ui.startWalk(a.ui.byId.get('greve')); const l = a.ui.link(); a.ui.stopWalk(); a.ui.openLink(l); return { l, mode: a.rig.mode }; });
check('lien partageable : promenade à pied', /^#w=/.test(linkW.l) && linkW.mode === 'walk', JSON.stringify(linkW));
await page.keyboard.press('Escape'); await frames(10);
check('lien malformé ignoré', await page.evaluate(() => window.__app.ui.openLink('#c=1,2,x&h=99&p=<script>') === false));

// ---------- accueil
await page.evaluate(() => window.__app.ui.showWelcome()); await frames(20);
const wel = await page.evaluate(() => ({ cls: document.body.classList.contains('welcome') && !document.body.classList.contains('ready'), doors: document.querySelectorAll('#welcome .door').length, top: getComputedStyle(document.getElementById('top')).visibility }));
check('accueil : trois portes, interface en retrait', wel.cls && wel.doors === 3 && wel.top === 'hidden' && (await visible('#welcome')), JSON.stringify(wel));
await page.click('#welcome .door[data-start="tour"]');
check('accueil : porte « visite guidée »', await page.evaluate(() => document.body.classList.contains('ready') && !document.body.classList.contains('welcome') && !document.getElementById('tours').hidden));
await page.keyboard.press('Escape');

// ---------- calque des époques : frise, données ALPAGE recalées, volumes, marche, lien
await page.evaluate(() => { window.__app.ui.stopTour(); window.__app.ui.select(null); }); await overview(); await frames(3);
await page.click('#btn-epoch'); await frames(2);
const fr0 = await page.evaluate(() => { const a = window.__app; return { ids: [...document.querySelectorAll('#frise-jalons button')].map((b) => b.dataset.id).join(' '), actif: document.querySelector('#frise-jalons [aria-pressed="true"]').dataset.id, on: a.epochU.uEpochOn.value, info: !document.getElementById('frise-info').hidden, bouton: document.getElementById('btn-epoch').getAttribute('aria-expanded') }; });
check('frise des époques : huit jalons, 1380 au repos', (await visible('#frise')) && fr0.ids === 'lutece 1300 1380 1553 1652 1741 1791 1836' && fr0.actif === '1380' && fr0.on === 0 && fr0.info && fr0.bouton === 'true', JSON.stringify(fr0));
const attendu = { lutece: [2, 'Lutèce', 100, 4], 1300: [1, 'Paris 1300', 0, 5], 1553: [0, 'Paris 1553', 3000, 6], 1652: [0, 'Paris 1652', 8000, 6], 1741: [0, 'Paris 1741', 9000, 6], 1791: [0, 'Paris 1791', 20000, 7], 1836: [0, 'Paris 1836', 20000, 6] };
for (const id of ['lutece', '1300', '1553', '1652', '1741', '1791', '1836']) {
  await page.click(`#frise-jalons button[data-id="${id}"]`); await frames(2);
  const e = await page.evaluate(() => { const a = window.__app, g = a.epochs.group.children[0]; return { on: a.epochU.uEpochOn.value, mode: a.cert.uniforms.uEpochMode.value, tris: g ? g.userData.tris : 0, vis: a.epochs.group.visible, titre: document.querySelector('#brand h1').textContent, dock: document.getElementById('epoch-label').textContent, leg: document.querySelectorAll('#frise-legend li').length, stats: document.getElementById('frise-stats').textContent.length, credit: document.getElementById('frise-credit').textContent, corps: document.body.classList.contains('epoch'), plan: !!a.ui.mini.epoch, lien: a.ui.link() }; });
  const [mode, titre, tris, leg] = attendu[id];
  check(`époque ${id} : calque au sol, ${tris ? 'volumes, ' : ''}légende, crédit ALPAGE`, e.on === 1 && e.mode === mode && e.vis && e.tris >= tris && e.titre === titre && e.dock === titre.replace('Paris ', '') && e.leg >= leg && e.stats > 10 && /ALPAGE/.test(e.credit) && /ODbL/.test(e.credit) && e.corps && e.plan && e.lien.endsWith('&e=' + id), JSON.stringify({ ...e, credit: e.credit.slice(0, 50) }));
}
// les chiffres racontent la croissance ; les enceintes se succèdent ; le masque de 1300 laisse en pointillé ce qui n'existe pas encore
const ev = await page.evaluate(() => {
  const a = window.__app, E = a.epochs, L = E.lib, st = {}; for (const j of L.JALONS) { const s = L.stats(j); st[j.id] = { ilots: s.ilots || 0, ha: s.haUrbain || 0, egl: s.eglises || 0, murs: s.enceintes.length, rues: s.rues || 0 }; }
  const murs = {}; for (const w of L.enceintes()) murs[w.id] = L.JALONS.map((j) => L.wallState(w, j.an)).join('');
  a.ui.setEpoch('1300'); const m = E.mask, d = m.getContext('2d').getImageData(0, 0, m.width, m.height).data; let blanc = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 127) blanc++;
  return { st, murs, masque: +(blanc / (d.length / 4)).toFixed(2) };
});
check('époques : îlots et surface urbaine croissent de 1300 à 1791', ev.st['1300'].ilots > 300 && ev.st['1300'].ilots < ev.st['1553'].ilots && ev.st['1553'].ilots < ev.st['1652'].ilots && ev.st['1652'].ilots < ev.st['1741'].ilots && ev.st['1741'].ilots < ev.st['1791'].ilots && ev.st['1553'].ha < ev.st['1652'].ha && ev.st['1652'].ha < ev.st['1741'].ha && ev.st['1300'].egl < ev.st['1553'].egl && ev.st['1553'].egl < ev.st['1652'].egl && ev.st.lutece.rues > 20, JSON.stringify(ev.st));
check('époques : les enceintes se succèdent (pas encore bâtie, debout, ancien tracé)', ev.murs['philippe-auguste'] === '01111222' && ev.murs['charles-v'] === '00111222' && ev.murs['fosses-jaunes'] === '00001222' && ev.murs['fermiers-generaux'] === '00000011' && ev.st['1741'].murs === 0 && ev.st['1791'].murs === 1, JSON.stringify(ev.murs));
check('époque passée : masque de ce qui existe déjà', ev.masque > 0.3 && ev.masque < 0.8, String(ev.masque));
// recalage : les portes de la maquette tombent sur les enceintes d'ALPAGE, les monuments dans leurs îlots, la Grève reste une place
const rec = await page.evaluate(() => {
  const a = window.__app, L = a.epochs.lib;
  const seg = (p, q, x, z) => { const dx = q[0] - p[0], dz = q[1] - p[1], l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / l)); return Math.hypot(p[0] + t * dx - x, p[1] + t * dz - z); };
  const dMur = (id, x, z) => { let d = 1e9; for (const rings of L.enceintes().find((w) => w.id === id).polys) for (const r of rings) for (let i = 0; i < r.length; i++) d = Math.min(d, seg(r[i], r[(i + 1) % r.length], x, z)); return d; };
  const ds = a.gates.map((g) => dMur(g.kind === 'PA' ? 'philippe-auguste' : 'charles-v', g.x, g.z));
  const dans = (y, x, z) => L.ilotsOf(y).some((rings) => { const r = rings[0]; let ins = false; for (let i = 0, k = r.length - 1; i < r.length; k = i++) { const p = r[i], q = r[k]; if ((p[1] > z) !== (q[1] > z) && x < ((q[0] - p[0]) * (z - p[1])) / (q[1] - p[1]) + p[0]) ins = !ins; } return ins; });
  const lieux = {}; for (const id of ['notre-dame', 'saint-merri', 'louvre', 'temple', 'bastille', 'greve']) { const p = a.ui.byId.get(id); lieux[id] = [dans('1300', p.x, p.z), dans('1791', p.x, p.z)]; }
  return { portes: ds.length, proches: ds.filter((d) => d < 12).length, max: Math.round(Math.max(...ds)), lieux };
});
const both = (id, a, b) => rec.lieux[id][0] === a && rec.lieux[id][1] === b;
check('recalage : portes de la maquette sur les enceintes ALPAGE', rec.portes >= 20 && rec.proches >= rec.portes - 2 && rec.max < 60, JSON.stringify({ portes: rec.portes, proches: rec.proches, max: rec.max }));
check('recalage : monuments dans leurs îlots, Grève en place, Bastille absente de 1300', both('notre-dame', true, true) && both('saint-merri', true, true) && both('louvre', true, true) && both('temple', true, true) && both('bastille', false, true) && both('greve', false, false), JSON.stringify(rec.lieux));
// à pied : les volumes du calque se contournent, et l'on n'y reste pas enfermé quand l'époque change
const wk = await page.evaluate(() => {
  const a = window.__app, E = a.epochs, ui = a.ui, rig = a.rig; ui.setEpoch('1791');
  const libre = (x, z) => !a.solid.get(x, z) && a.terrain.height(x, z) > 0.35;
  let pick = null;
  for (const l of E.foot.values()) { for (const f of l) { const r = f.rings[0]; let cx = 0, cz = 0; for (const p of r) { cx += p[0]; cz += p[1]; } cx /= r.length; cz /= r.length; if (!E.inside(cx, cz) || !libre(cx, cz) || Math.hypot(cx, cz) < 1700) continue; let x = cx; while (E.inside(x, cz) && x < cx + 400) x += 1; x += 5; if (!E.inside(x, cz) && a.walkable(x, cz) && a.walkable(x + 1.5, cz) && a.walkable(x - 1.5, cz)) { pick = { cx, cz, x }; break; } } if (pick) break; }
  if (!pick) return { pick: null };
  const bloque = !a.walkable(pick.cx, pick.cz);
  ui.goWalk(pick.x, pick.cz, Math.PI / 2, -0.02, { instant: true }); rig.walkTo = [pick.cx, pick.cz];
  for (let i = 0; i < 120; i++) { rig.update(0.05); a.time += 0.05; a.emit('frame', 0.05); }
  const apres = { dedans: E.inside(rig.walk.x, rig.walk.z), avance: +(pick.x - rig.walk.x).toFixed(1), reste: Math.round(Math.hypot(rig.walk.x - pick.cx, rig.walk.z - pick.cz)), panneau: document.getElementById('frise-info').hidden, frise: !document.getElementById('frise').hidden };
  ui.setEpoch('1380'); const marche1380 = a.walkable(pick.cx, pick.cz); rig.walk.x = pick.cx; rig.walk.z = pick.cz; ui.setEpoch('1791');
  const sorti = { dedans: E.inside(rig.walk.x, rig.walk.z), sol: a.walkable(rig.walk.x, rig.walk.z), pas: Math.round(Math.hypot(rig.walk.x - pick.cx, rig.walk.z - pick.cz)) };
  ui.stopWalk(); a.renderNow();
  return { pick: 1, blocs: E.group.children[0].userData.blocs, bloque, apres, marche1380, sorti };
});
check('à pied : un îlot du calque arrête le promeneur', wk.pick && wk.blocs > 300 && wk.bloque && !wk.apres.dedans && wk.apres.avance > 1 && wk.apres.reste > 1 && wk.apres.frise && wk.apres.panneau, JSON.stringify(wk));
check('à pied : changer d’époque ne l’enferme pas dans un volume', wk.pick && wk.marche1380 && !wk.sorti.dedans && wk.sorti.sol && wk.sorti.pas > 0, JSON.stringify(wk.sorti || {}));
await frames(30);
// mini-plan à l'échelle de l'agglomération, lien partageable, sources, lecture de la frise, fermeture
const mz = await page.evaluate(() => { const a = window.__app; a.ui.setEpoch('1791'); const z1 = a.ui.mini.zoom.orbit, t1 = document.getElementById('map-zoom').textContent; a.ui.setEpoch('1300'); return { z1, t1, z2: a.ui.mini.zoom.orbit }; });
check('mini-plan : agglomération pour les époques étendues, ville pour 1300', mz.z1 === 'wide' && mz.z2 === 'city', JSON.stringify(mz));
// le mini-plan se redessine à chaque mouvement de caméra : sous un calque, cela doit rester immédiat
const mp = await page.evaluate(() => { const a = window.__app, c = document.getElementById('minimap'); a.ui.setEpoch('1791'); const t = performance.now(); a.ui.mini.sig = ''; a.ui.mini.draw(); c.getContext('2d').getImageData(0, 0, 1, 1); const d = performance.now() - t; a.ui.setEpoch('1300'); return Math.round(d); });
check('mini-plan : redessin immédiat sous un calque d’époque', mp < 400, mp + ' ms');
const le = await page.evaluate(() => { const a = window.__app; a.ui.setEpoch('1652'); const l = a.ui.link(); a.ui.closeFrise(); const ferme = a.epochs.current.id; const used = a.ui.openLink(l); const r = { l, ferme, used, id: a.epochs.current.id, frise: !document.getElementById('frise').hidden }; a.ui.closeFrise(); r.inconnu = a.ui.openLink('#c=-80,-120,2300,0,0.9&e=1999') && a.epochs.current.id; r.mal = a.ui.openLink('#e=<script>'); r.fin = a.epochs.current.id; return r; });
check('lien partageable : l’époque revient, une époque inconnue est ignorée', /&e=1652$/.test(le.l) && le.ferme === '1380' && le.used && le.id === '1652' && le.frise && le.inconnu === '1380' && le.mal === false && le.fin === '1380', JSON.stringify(le));
await page.keyboard.press('KeyT'); await frames(2);
await page.click('#frise-jalons button[data-id="1741"]'); await frames(2);
await page.click('#frise-src');
const so = await page.evaluate(() => ({ ouvert: !document.getElementById('sources').hidden, lignes: document.querySelectorAll('#sources-alpage li').length, texte: document.getElementById('sources-alpage').textContent }));
check('sources du calque : couches ALPAGE créditées, licence ODbL', so.ouvert && so.lignes >= 8 && /Verniquet/.test(so.texte) && /Vasserot/.test(so.texte) && /IRHT \(C\. Bourlet\)/.test(so.texte) && /ODbL/.test(await page.evaluate(() => document.getElementById('sources').textContent)), JSON.stringify({ lignes: so.lignes }));
await page.keyboard.press('Escape');
check('touche T : la frise s’ouvre, Échap referme les sources sans retirer le calque', (await visible('#frise')) && (await page.evaluate(() => document.getElementById('sources').hidden && window.__app.epochs.current.id === '1741')));
await page.click('#frise-play'); await frames(2);
const p0 = await page.evaluate(() => ({ id: window.__app.epochs.current.id, joue: document.getElementById('frise-play').getAttribute('aria-pressed') }));
await frames(72);
const p1 = await page.evaluate(() => window.__app.epochs.current.id);
await frames(72 * 7);
const p2 = await page.evaluate(() => ({ id: window.__app.epochs.current.id, joue: document.getElementById('frise-play').getAttribute('aria-pressed') }));
check('lecture de la frise : de Lutèce à 1836, puis arrêt', p0.id === 'lutece' && p0.joue === 'true' && p1 === '1300' && p2.id === '1836' && p2.joue === 'false', JSON.stringify([p0, p1, p2]));
await page.evaluate(() => { const a = window.__app; a.ui.setEpoch('1652'); a.ui.startTour('grand-tour'); }); await frames(3);
check('une visite guidée retire le calque', await page.evaluate(() => window.__app.epochs.current.id === '1380' && document.getElementById('frise').hidden && !!window.__app.ui.tour));
await page.evaluate(() => window.__app.ui.stopTour()); await overview(); await frames(3);
await page.click('#btn-epoch'); await page.click('#frise-jalons button[data-id="1553"]'); await frames(2);
await page.keyboard.press('Escape'); await frames(2);
const fin = await page.evaluate(() => { const a = window.__app; return { id: a.epochs.current.id, on: a.epochU.uEpochOn.value, mode: a.cert.uniforms.uEpochMode.value, vis: a.epochs.group.visible, titre: document.querySelector('#brand h1').textContent, corps: document.body.classList.contains('epoch'), dock: document.getElementById('epoch-label').textContent, plan: a.ui.mini.epoch, zoom: a.ui.mini.zoom.orbit, marche: a.walkable(-700, -1500) }; });
check('Échap referme la frise : la maquette redevient celle de 1380', !(await visible('#frise')) && !(await visible('#frise-info')) && fin.id === '1380' && fin.on === 0 && fin.mode === 0 && !fin.vis && fin.titre === 'Paris 1380' && !fin.corps && fin.dock === '1380' && !fin.plan && fin.zoom !== 'wide' && fin.marche, JSON.stringify(fin));

// ---------- noms, redimensionnement, téléphone
await page.click('#btn-view'); await page.click('#toggle-names'); await frames(2);
check('noms masqués', await page.evaluate(() => document.getElementById('labels').style.display === 'none'));
await page.click('#toggle-names'); await page.click('#btn-view');
await page.setViewportSize({ width: 390, height: 780 }); await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await frames(3);
check('pas de défilement horizontal (mobile)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
const mob = await page.evaluate(() => { const a = window.__app; a.ui.select(a.ui.byId.get('louvre'), false); const dock = document.getElementById('dock').getBoundingClientRect(), card = document.getElementById('card').getBoundingClientRect(); return { dock: Math.round(dock.height), peek: document.getElementById('card').classList.contains('peek'), cardH: Math.round(card.height), cardBottom: Math.round(card.bottom), dockTop: Math.round(dock.top), more: getComputedStyle(document.getElementById('btn-more')).display }; });
check('téléphone : barre sur une ligne, fiche en volet replié', mob.dock <= 62 && mob.peek && mob.cardH < 300 && mob.cardBottom <= mob.dockTop + 8 && mob.more !== 'none', JSON.stringify(mob));
await page.click('#card-grip'); await frames(1);
check('téléphone : le volet se déplie', await page.evaluate(() => !document.getElementById('card').classList.contains('peek') && document.getElementById('card').getBoundingClientRect().height > 300));
await page.click('#hour-btn');
check('téléphone : réglage de l’heure dépliant', (await visible('#hour-pop')) && (await visible('#hour')));
await page.click('#hour-btn');
await page.evaluate(() => window.__app.ui.select(null));
await page.click('#btn-epoch'); await frames(2);
await page.evaluate(() => window.__app.ui.setEpoch('1836')); await frames(2);
const mf = await page.evaluate(() => { const R = (id) => document.getElementById(id).getBoundingClientRect(), f = R('frise'), jl = R('frise-jalons'), act = document.querySelector('#frise-jalons [aria-pressed="true"]').getBoundingClientRect(), dock = R('dock'); return { info: document.getElementById('frise-info').hidden, gauche: Math.round(f.left), droite: Math.round(f.right), bas: Math.round(f.bottom), dock: Math.round(dock.top), actif: act.left >= jl.left - 1 && act.right <= jl.right + 1, large: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
check('téléphone : frise sur une ligne au-dessus de la barre, date choisie en vue, panneau replié', mf.info && mf.gauche >= 0 && mf.droite <= 391 && mf.bas <= mf.dock + 1 && mf.actif && mf.large, JSON.stringify(mf));
await page.click('#frise-more'); await frames(1);
const mi = await page.evaluate(() => { const i = document.getElementById('frise-info').getBoundingClientRect(), f = document.getElementById('frise').getBoundingClientRect(); return { vu: !document.getElementById('frise-info').hidden, haut: Math.round(i.top), bas: Math.round(i.bottom), frise: Math.round(f.top), l: Math.round(i.width) }; });
check('téléphone : « Détails » déplie le panneau de l’époque au-dessus de la frise', mi.vu && mi.haut >= 50 && mi.bas <= mi.frise + 1 && mi.l >= 380, JSON.stringify(mi));
await page.click('#frise [data-close="frise"]'); await frames(2);
check('téléphone : la croix referme la frise et retire le calque', await page.evaluate(() => document.getElementById('frise').hidden && document.getElementById('frise-info').hidden && window.__app.epochs.current.id === '1380' && window.__app.epochU.uEpochOn.value === 0));
check('aucune erreur ni avertissement console', errors.length === 0, errors.slice(0, 5).join(' | '));
console.log(`\n${ok} vérifications réussies, ${ko} échec(s)`);
await browser.close();
process.exit(ko ? 1 : 0);
