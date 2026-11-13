// Test fonctionnel de la page « Paris 1789 » : charge la page, vérifie la ville construite, les repères, la marche à
// pied, l'heure, le mini-plan, le lien partageable, les sources, le téléphone et l'absence d'erreurs.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(120000);       // en rendu logiciel, une image de la maquette coûte plus d'une seconde
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.stack || e).slice(0, 600)));
await page.goto('file://' + join(root, 'dist/1789.html') + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 300000 });
let ok = 0, ko = 0;
const t0 = Date.now(), clock = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + ' s';
const check = (name, cond, extra = '') => { if (cond) { ok++; console.log(clock(), ' ok  ', name, extra); } else { ko++; console.log(clock(), ' ÉCHEC', name, extra); } };
// Avance de n images, rend la scène et attend la fin du rendu (barrière de synchronisation), comme tools/test.mjs.
const frames = (n) => page.evaluate(async (n) => {
  const a = window.__app; for (let i = 0; i < n; i++) { a.rig.update(0.05); a.time += 0.05; a.emit('frame', 0.05); } a.renderNow();
  const gl = a.renderer.getContext(); if (!gl.fenceSync) return;
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
  await new Promise((done) => { const poll = () => { const s = gl.clientWaitSync(sync, 0, 0); if (s === gl.TIMEOUT_EXPIRED) setTimeout(poll, 8); else { gl.deleteSync(sync); done(); } }; poll(); });
}, n);
const visible = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; }, sel);

check('démarrage', await page.evaluate(() => window.__ready === true && !window.__failed && document.body.classList.contains('ready')), String(await page.evaluate(() => window.__failed || '')).slice(0, 300));
await frames(3);

// ---------- la ville construite
const st = await page.evaluate(() => { const a = window.__app; return { ...a.stats, arbres: a.treeCount, lieux: a.places.length, maillages: a.cityMeshes.length, emprises: a.foot.length }; });
check('bâti : plus de vingt mille bâtiments de l’atlas, faubourgs évoqués, arbres', st.bati > 20000 && st.evoques > 5000 && st.arbres > 5000 && st.tris > 1e6 && st.tris < 2.6e6 && st.emprises > 25000, JSON.stringify(st));
// ---------- monuments : hauteurs connues, posés sur les emprises et les enclos de l'atlas
const mo = await page.evaluate(() => { const a = window.__app, T = a.terrain, M = a.monuments, h = (n) => (M[n] ? Math.round(M[n].top - T.land(M[n].x, M[n].z)) : -1), nd = M['Notre-Dame'], f = nd && a.footAt(nd.x, nd.z), ss = M['Saint-Sulpice'], g = ss && a.footAt(ss.x, ss.z), b = M['Bastille'], psd = M['Porte Saint-Denis']; return { n: Object.keys(M).length, clochers: a.stats.clochers, nd: h('Notre-Dame'), inv: h('Invalides'), gen: h('Sainte-Geneviève'), sulp: h('Saint-Sulpice'), bast: h('Bastille'), ecole: h('École militaire'), ndSurAtlas: !!(f && f.reel), sulpNef: !!(g && g.reel), bastMur: b && !a.walkable(b.x, b.z), porte: psd && a.walkable(psd.x, psd.z), invDist: Math.round(Math.hypot(M.Invalides.x + 2738, M.Invalides.z + 408)) }; });
check('monuments : Notre-Dame et ses tours (69 m), dôme des Invalides, Sainte-Geneviève, Saint-Sulpice, Bastille', mo.n >= 18 && Math.abs(mo.nd - 69) <= 3 && mo.inv > 95 && mo.inv < 115 && mo.gen > 75 && mo.gen < 90 && mo.sulp > 62 && mo.sulp < 78 && Math.abs(mo.bast - 24) <= 3 && mo.ecole > 35 && mo.ndSurAtlas && mo.sulpNef, JSON.stringify(mo));
check('monuments : clochers des paroisses ; la Bastille fait obstacle, on passe sous la porte Saint-Denis ; les Invalides sont dans leur enclos', mo.clochers >= 35 && mo.bastMur && mo.porte && mo.invDist < 260, JSON.stringify({ clochers: mo.clochers, bastMur: mo.bastMur, porte: mo.porte, invDist: mo.invDist }));
const rel = await page.evaluate(() => { const a = window.__app, T = a.terrain, P = (id) => a.ui.byId.get(id), g = P('sainte-genevieve'), e = P('barriere-de-l-etoile'); let eau = null; for (let x = -600; x < 600 && !eau; x += 10) for (let z = -400; z < 200 && !eau; z += 10) if (T.wetAt(x, z) > 0.98) eau = [x, z]; return { cite: +T.land(-36, -9).toFixed(1), genevieve: +T.land(g.x, g.z).toFixed(1), etoile: +T.land(e.x, e.z).toFixed(1), eau, fond: eau && +T.height(eau[0], eau[1]).toFixed(1), aval: T.ext.map((q) => [Math.round(q.x), Math.round(q.z)]), auLoin: T.ext.map((q) => +T.height(q.x + q.dx * 3000, q.z + q.dz * 3000).toFixed(1)), rive: T.ext.map((q) => +T.height(q.x + q.dx * 3000 - q.dz * 600, q.z + q.dz * 3000 + q.dx * 600).toFixed(1)) }; });
check('relief de Girard : la Cité au bord de l’eau, la montagne Sainte-Geneviève et l’Étoile en hauteur', rel.cite > 3 && rel.cite < 12 && rel.genevieve > rel.cite + 15 && rel.etoile > rel.cite + 15, JSON.stringify(rel));
check('la Seine : lit creusé, prolongée au-delà du plan vers l’aval et vers l’amont', rel.eau && rel.fond < -2 && rel.aval.length === 2 && rel.aval[0][0] < -4000 && rel.aval[1][0] > 2000 && rel.auLoin.every((h) => h < -2) && rel.rive.every((h) => h > 1), JSON.stringify(rel));

// ---------- habitants : la foule se forme près des rues, marche, reste sur la voie et hors des murs
await page.evaluate(() => { const a = window.__app; a.rig.goal = { x: -330, z: -260, dist: 170, az: -0.6, el: 0.45 }; a.rig.cur = { ...a.rig.goal }; }); await frames(30);
const c0 = await page.evaluate(() => { const a = window.__app, p = a.people.pools[0]; return { total: a.people.total, n: a.people.count, xs: Array.from(p.x.slice(0, 20)), zs: Array.from(p.z.slice(0, 20)), voies: +(a.nav.data.reduce((s, v) => s + v, 0) / a.nav.data.length).toFixed(2) }; });
await frames(60);
const c1 = await page.evaluate(([xs, zs]) => { const a = window.__app, P = a.people; let off = 0, mur = 0, n = 0, d = 0; for (const p of P.pools) for (let i = 0; i < p.active; i++) { if (!p.ok[i]) continue; n++; if (!P.nav(p.x[i], p.z[i])) off++; if (a.footAt(p.x[i], p.z[i])) mur++; } const p = P.pools[0]; for (let i = 0; i < xs.length; i++) d = Math.max(d, Math.hypot(p.x[i] - xs[i], p.z[i] - zs[i])); return { n, off, mur, d: +d.toFixed(1), atlas: P.atlas.texture.image.width }; }, [c0.xs, c0.zs]);
check('habitants : la foule se forme près des rues', c0.total > 3000 && c0.n > 250 && c0.voies > 0.08 && c0.voies < 0.4, JSON.stringify({ total: c0.total, n: c0.n, voies: c0.voies }));
check('habitants : ils marchent, restent sur la voie et hors des murs', c1.d > 0.5 && c1.off === 0 && c1.mur === 0 && c1.n > 250 && c1.atlas >= 1024, JSON.stringify(c1));
await page.evaluate(() => window.__app.ui.setHour(22)); await frames(20);
const c2 = await page.evaluate(() => window.__app.people.count);
check('habitants : moins nombreux la nuit', c2 < c1.n * 0.6, c2 + ' contre ' + c1.n);
await page.evaluate(() => { const a = window.__app; a.ui.setHour(10.5); a.ui.goHome(); }); await frames(70);
check('habitants : la foule se retire quand on prend de la hauteur', await page.evaluate(() => window.__app.people.group.visible === false));

// ---------- repères : recalage, fiches, édifices pas encore modelés
const rp = await page.evaluate(() => { const a = window.__app, P = (id) => a.ui.byId.get(id), nd = P('notre-dame'), f = a.footAt(nd.x, nd.z); return { nd: [Math.round(nd.x), Math.round(nd.z)], surEmprise: !!(f && f.reel), haut: f ? Math.round(f.top) : 0, absents: a.places.filter((p) => p.absent).map((p) => p.id), hv: !!P('hotel-de-ville') && !P('hotel-de-ville').absent, louvre: !P('louvre').absent, cats: [...new Set(a.places.map((p) => p.cat))].length }; });
check('recalage : Notre-Dame, placée par ses coordonnées géographiques, tombe sur son emprise', Math.hypot(rp.nd[0] + 36, rp.nd[1] + 12) < 25 && rp.surEmprise && rp.haut > 25, JSON.stringify(rp));
check('repères : 53 lieux, huit catégories ; les rares édifices pas encore modelés sont signalés', st.lieux === 53 && rp.cats === 8 && rp.hv && rp.louvre && !rp.absents.includes('invalides') && !rp.absents.includes('luxembourg') && rp.absents.includes('salpetriere') && rp.absents.length <= 5, JSON.stringify(rp.absents));
const lab = await page.evaluate(() => { const l = [...document.querySelectorAll('.label')].filter((e) => e.style.display !== 'none'); return { noms: l.filter((e) => !e.classList.contains('dot')).map((e) => e.children[1].textContent), pastilles: l.filter((e) => e.classList.contains('dot')).length }; });
check('étiquettes : grands lieux nommés, les autres en pastilles', lab.noms.includes('Notre-Dame') && lab.noms.includes('Bastille') && lab.noms.length >= 8 && lab.noms.length <= 16 && lab.pastilles >= 20, JSON.stringify(lab));

// ---------- liste, recherche, fiche
await page.click('#btn-places');
await page.fill('#place-search', 'bastil');
const found = await page.evaluate(() => [...document.querySelectorAll('#place-list button')].map((b) => b.textContent));
check('recherche d’un lieu', (await visible('#places')) && found.length === 1 && found[0] === 'Bastille', JSON.stringify(found));
await page.click('#place-list button'); await frames(50);
const card = await page.evaluate(() => { const a = window.__app; return { nom: document.getElementById('card-name').textContent, cat: document.getElementById('card-cat').textContent, texte: document.getElementById('card-text').textContent, liste: document.getElementById('places').hidden, x: Math.round(a.rig.cur.x), z: Math.round(a.rig.cur.z), dist: Math.round(a.rig.cur.dist), lien: a.ui.link() }; });
check('fiche : notice, vue recadrée sur le lieu, lieu dans le lien', (await visible('#card')) && card.nom === 'Bastille' && /Palais et pouvoir/.test(card.cat) && /14 juillet 1789/.test(card.texte) && card.liste && Math.hypot(card.x - 1287, card.z + 29) < 60 && card.dist <= 600 && /&p=bastille$/.test(card.lien), JSON.stringify(card));
await page.evaluate(() => window.__app.ui.select(window.__app.ui.byId.get('salpetriere'), false));
check('fiche d’un édifice pas encore modelé : la notice le dit', /pas encore modelé/.test(await page.evaluate(() => document.getElementById('card-text').textContent)));

// ---------- à pied
await page.evaluate(() => window.__app.ui.startWalk(window.__app.ui.byId.get('hotel-de-ville'))); await frames(20);
const wk = await page.evaluate(() => { const a = window.__app, r = a.rig, p = a.ui.byId.get('hotel-de-ville'), fx = -Math.sin(r.walk.yaw), fz = -Math.cos(r.walk.yaw), dx = p.x - r.walk.x, dz = p.z - r.walk.z, d = Math.hypot(dx, dz); return { mode: r.mode, sol: a.walkable(r.walk.x, r.walk.z), d: Math.round(d), face: +((fx * dx + fz * dz) / d).toFixed(2), y: +(r.walk.y - a.walkHeight(r.walk.x, r.walk.z)).toFixed(2), ou: document.getElementById('where').textContent, hud: !document.getElementById('walkhud').hidden, pied: document.getElementById('mode-walk').getAttribute('aria-pressed'), lien: a.ui.link() }; });
check('à pied : on arrive sur un sol dégagé, face au lieu, à hauteur d’homme', wk.mode === 'walk' && wk.sol && wk.d > 20 && wk.d < 160 && wk.face > 0.95 && Math.abs(wk.y - 1.68) < 0.3 && wk.hud && wk.pied === 'true' && /^#w=/.test(wk.lien), JSON.stringify(wk));
check('où suis-je : le nom de la rue vient du plan de Verniquet', /Grève|Rue |Quai |Place /.test(wk.ou), wk.ou);
const col = await page.evaluate(() => {
  const a = window.__app, r = a.rig; let cible = null;
  for (let d = 4; d < 120 && !cible; d += 2) for (let k = 0; k < 16 && !cible; k++) { const x = r.walk.x + Math.cos(k * 0.3927) * d, z = r.walk.z + Math.sin(k * 0.3927) * d, f = a.footAt(x, z); if (f && !f.wall) cible = [x, z]; }
  if (!cible) return null;
  const x0 = r.walk.x, z0 = r.walk.z; r.walkTo = cible;
  for (let i = 0; i < 160; i++) { r.update(0.05); a.time += 0.05; a.emit('frame', 0.05); }
  return { avance: +Math.hypot(r.walk.x - x0, r.walk.z - z0).toFixed(1), dedans: !!a.footAt(r.walk.x, r.walk.z), sol: a.walkable(r.walk.x, r.walk.z), reste: +Math.hypot(r.walk.x - cible[0], r.walk.z - cible[1]).toFixed(1) };
});
check('à pied : les maisons arrêtent le promeneur', col && col.avance > 1 && !col.dedans && col.sol && col.reste > 0.3, JSON.stringify(col));
const eau = await page.evaluate(() => { const a = window.__app, T = a.terrain; let w = null; for (let x = -600; x < 600 && !w; x += 10) for (let z = -400; z < 200 && !w; z += 10) if (T.wetAt(x, z) > 0.98) w = [x, z]; const pn = a.ui.byId.get('pont-neuf'); return { fleuve: a.walkable(w[0], w[1]), pont: a.walkable(pn.x, pn.z), hors: a.walkable(9000, 0), maison: a.walkable(a.ui.byId.get('notre-dame').x, a.ui.byId.get('notre-dame').z) }; });
check('à pied : ni dans le fleuve ni dans les murs, mais sur les ponts', !eau.fleuve && eau.pont && !eau.hors && !eau.maison, JSON.stringify(eau));
await page.keyboard.press('Escape'); await frames(4);
check('Échap : la fiche se referme, puis on reprend de la hauteur', await page.evaluate(() => document.getElementById('card').hidden));
await page.keyboard.press('Escape'); await frames(10);
check('retour au survol', await page.evaluate(() => window.__app.rig.mode === 'orbit' && document.getElementById('walkhud').hidden && document.getElementById('mode-fly').getAttribute('aria-pressed') === 'true'));
await page.evaluate(() => { const a = window.__app; a.rig.goal = { x: 60, z: -352, dist: 400, az: 0, el: 0.9 }; a.rig.cur = { ...a.rig.goal }; }); await frames(3);
await page.mouse.dblclick(550, 360); await frames(10);
const dbl = await page.evaluate(() => { const a = window.__app; return { mode: a.rig.mode, d: Math.round(Math.hypot(a.rig.walk.x - 60, a.rig.walk.z + 352)) }; });
check('double-clic sur la maquette : on descend à cet endroit', dbl.mode === 'walk' && dbl.d < 90, JSON.stringify(dbl));
await page.click('#walk-exit'); await frames(10);

// ---------- heure
await page.evaluate(() => { const e = document.getElementById('hour'); e.value = '21.5'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await frames(3);
const nuit = await page.evaluate(() => { const a = window.__app; return { h: a.sky.hour, label: document.getElementById('hour-label').textContent, lueur: a.materials.facade.emissiveIntensity, preset: document.querySelector('#hour-presets [data-hour="21.5"]').getAttribute('aria-pressed') }; });
check('heure : la nuit, les fenêtres s’éclairent', nuit.h === 21.5 && nuit.label === '21 h 30' && nuit.lueur > 1 && nuit.preset === 'true', JSON.stringify(nuit));
await page.click('#hour-presets [data-hour="12"]'); await frames(3);
check('moment de la journée : midi', await page.evaluate(() => window.__app.sky.hour === 12 && window.__app.materials.facade.emissiveIntensity < 0.1));
await page.click('#hour-play'); await frames(40);
const jour = await page.evaluate(() => ({ h: window.__app.sky.hour, joue: document.getElementById('hour-play').getAttribute('aria-pressed') }));
check('journée en accéléré', jour.h > 13 && jour.joue === 'true', JSON.stringify(jour));
await page.click('#hour-play'); await page.click('#hour-presets [data-hour="12"]'); await frames(2);

// ---------- mini-plan, boussole, vue d'ensemble
await page.click('#btn-home'); await frames(70);
const home = await page.evaluate(() => ({ x: Math.round(window.__app.rig.cur.x), z: Math.round(window.__app.rig.cur.z), dist: Math.round(window.__app.rig.cur.dist) }));
check('vue d’ensemble', home.x === -350 && home.z === -420 && home.dist === 3600, JSON.stringify(home));
const mm = await page.evaluate(() => { const c = document.getElementById('minimap'), t = performance.now(); window.__app.ui.mini.sig = ''; window.__app.ui.drawMini(); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, ms = Math.round(performance.now() - t), seen = new Set(); for (let i = 0; i < d.length; i += 4 * 53) seen.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); const r = c.getBoundingClientRect(); return { teintes: seen.size, ms, x: r.left + r.width * 0.5, y: r.top + r.height * 0.5, w: Math.round(r.width) }; });
check('mini-plan dessiné, redessin immédiat', mm.teintes > 12 && mm.w > 100 && mm.ms < 400, JSON.stringify(mm));
await page.mouse.click(mm.x + 12, mm.y - 6); await frames(60);
const mm2 = await page.evaluate(() => ({ x: Math.round(window.__app.rig.cur.x), z: Math.round(window.__app.rig.cur.z), dist: Math.round(window.__app.rig.cur.dist) }));
check('cliquer le mini-plan : la vue s’y rend', Math.hypot(mm2.x + 350, mm2.z + 420) > 150 && mm2.dist <= 900, JSON.stringify(mm2));
await page.click('#map-zoom'); await frames(2);
check('mini-plan : échelle du quartier', await page.evaluate(() => window.__app.ui.mini.zoom === 'local' && document.getElementById('map-zoom').textContent === 'Ville entière'));
await page.click('#map-zoom');
await page.evaluate(() => { window.__app.rig.goal.az = 2.2; }); await frames(30);
await page.click('#compass'); await frames(50);
const az = await page.evaluate(() => ({ az: window.__app.rig.cur.az, rose: document.getElementById('compass-rose').getAttribute('transform') }));
check('boussole : nord en haut', Math.abs(Math.sin(az.az)) < 0.02 && Math.cos(az.az) > 0.99, JSON.stringify(az));

// ---------- lien partageable
await page.evaluate(() => { const a = window.__app; a.rig.goal = { x: -858, z: -842, dist: 700, az: 0.4, el: 0.6 }; a.rig.cur = { ...a.rig.goal }; a.ui.setHour(18.75); a.ui.select(a.ui.byId.get('louvre'), false); }); await frames(3);
const link = await page.evaluate(() => window.__app.ui.link());
const back = await page.evaluate((link) => { const a = window.__app; a.ui.select(null); a.ui.setHour(9); a.rig.goal = { x: 2000, z: 1000, dist: 3000, az: 0, el: 0.9 }; a.rig.cur = { ...a.rig.goal }; const used = a.ui.openLink(link); return { used, x: Math.round(a.rig.cur.x), z: Math.round(a.rig.cur.z), h: a.sky.hour, fiche: !document.getElementById('card').hidden && document.getElementById('card-name').textContent }; }, link);
check('lien partageable : la vue, l’heure et la fiche reviennent', /^#c=-858,-842,700,0\.4,0\.6&h=18\.75&p=louvre$/.test(link) && back.used && back.x === -858 && back.z === -842 && back.h === 18.75 && back.fiche === 'Louvre', link + ' ' + JSON.stringify(back));
check('lien malformé ignoré', await page.evaluate(() => window.__app.ui.openLink('#c=1,2,x&h=99&p=<script>') === false));
await page.evaluate(() => { window.__app.ui.select(null); window.__app.ui.setHour(12); });

// ---------- sources, aide, retour à 1380
await page.click('#btn-sources');
const so = await page.evaluate(() => ({ ouvert: !document.getElementById('sources').hidden, lignes: document.querySelectorAll('#sources-list li').length, texte: document.getElementById('sources').textContent }));
check('sources : couches ALPAGE créditées, licence ODbL, décalage de date annoncé', so.ouvert && so.lignes === 7 && /Verniquet/.test(so.texte) && /Vasserot \(1810-1836\)/.test(so.texte) && /Girard/.test(so.texte) && /ODbL/.test(so.texte) && /la plus proche de 1789/.test(so.texte) && /Évoqué/.test(so.texte), JSON.stringify({ lignes: so.lignes }));
await page.keyboard.press('Escape');
check('Échap referme les sources', await page.evaluate(() => document.getElementById('sources').hidden));
await page.click('#btn-help'); check('aide', await visible('#help')); await page.keyboard.press('Escape');
const nav = page.waitForURL(/index\.html/, { timeout: 60000 }).then(() => true).catch(() => false);
await page.click('#btn-1380');
check('bouton « Paris 1380 » : retour à la première maquette', await nav, page.url().slice(-40));
await page.goto('file://' + join(root, 'dist/1789.html') + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 300000 });

// ---------- téléphone
await page.setViewportSize({ width: 390, height: 780 }); await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await frames(3);
check('pas de défilement horizontal (mobile)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
const mob = await page.evaluate(() => { const a = window.__app; a.ui.select(a.ui.byId.get('louvre'), false); const dock = document.getElementById('dock').getBoundingClientRect(), c = document.getElementById('card').getBoundingClientRect(); return { dock: Math.round(dock.height), peek: document.getElementById('card').classList.contains('peek'), cardBottom: Math.round(c.bottom), dockTop: Math.round(dock.top), more: getComputedStyle(document.getElementById('btn-more')).display }; });
check('téléphone : barre sur une ligne, fiche en volet replié', mob.dock <= 62 && mob.peek && mob.cardBottom <= mob.dockTop + 8 && mob.more !== 'none', JSON.stringify(mob));
await page.click('#btn-more');
check('téléphone : menu replié (Paris 1380, Sources, Partager, Aide)', await page.evaluate(() => document.getElementById('menu-more').classList.contains('open') && getComputedStyle(document.getElementById('btn-1380')).display !== 'none'));
await page.click('#btn-more');
await page.click('#hour-btn');
check('téléphone : réglage de l’heure dépliant', (await visible('#hour-pop')) && (await visible('#hour')));
await page.click('#hour-btn');
check('aucune erreur ni avertissement console', errors.length === 0, errors.slice(0, 5).join(' | '));
console.log(`\n${ok} vérifications réussies, ${ko} échec(s)`);
await browser.close();
process.exit(ko ? 1 : 0);
