// Test fonctionnel de la page « Lutèce » : charge la page, vérifie le plan déduit des données (fleuve, îles, ponts),
// le terrain, la ville évoquée, les monuments, les repères, la marche à pied, l'heure, la frise, les sources, le
// téléphone et l'absence d'erreurs.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(120000);
const errors = [];
const watch = (p) => { p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 300)); }); p.on('pageerror', (e) => errors.push('pageerror: ' + String(e.stack || e).slice(0, 600))); };
watch(page);
const URL = 'file://' + join(root, 'dist/lutece.html');
await page.goto(URL + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 300000 });
let ok = 0, ko = 0;
const t0 = Date.now(), clock = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + ' s';
const check = (name, cond, extra = '') => { if (cond) { ok++; console.log(clock(), ' ok  ', name, extra); } else { ko++; console.log(clock(), ' ÉCHEC', name, extra); } };
// Avance de n images, rend la scène et attend la fin du rendu (barrière de synchronisation), comme tools/test.mjs.
const frames = (n, p = page) => p.evaluate(async (n) => {
  const a = window.__app; for (let i = 0; i < n; i++) { a.rig.update(0.05); a.time += 0.05; a.emit('frame', 0.05); } a.renderNow();
  const gl = a.renderer.getContext(); if (!gl.fenceSync) return;
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
  await new Promise((done) => { const poll = () => { const s = gl.clientWaitSync(sync, 0, 0); if (s === gl.TIMEOUT_EXPIRED) setTimeout(poll, 8); else { gl.deleteSync(sync); done(); } }; poll(); });
}, n);
const visible = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; }, sel);

check('démarrage', await page.evaluate(() => window.__ready === true && !window.__failed && document.body.classList.contains('ready')), String(await page.evaluate(() => window.__failed || '')).slice(0, 300));
await frames(3);

// ---------- la page ne transporte que ses propres données
{ const html = readFileSync(join(root, 'dist/lutece.html'), 'utf8');
  check('la page n’embarque ni les données de 1789 ni celles des autres dates', html.length < 1.1e6 && !/Vasserot/.test(html) && !/Fermiers généraux/.test(html), (html.length / 1024).toFixed(0) + ' Ko'); }

// ---------- ce que disent les données : fleuve, îles, voies, monuments
const pl = await page.evaluate(() => {
  const P = window.__app.plan250, aire = (r) => { let s = 0; for (let i = 0; i < r.length; i++) { const q = r[(i + 1) % r.length]; s += r[i][0] * q[1] - q[0] * r[i][1]; } return Math.abs(s / 2); }, long = (l) => { let s = 0; for (let i = 1; i < l.length; i++) s += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]); return s; };
  return { lit: Math.round(aire(P.lit) / 1e4), iles: P.iles.length, cite: +(aire(P.cite) / 1e4).toFixed(1), voies: P.voies.length, rues: P.rues.length, cardo: Math.round(long(P.cardo)), ruisseaux: P.ruisseaux.length, marais: P.marais.length, mons: Object.keys(P.mons).sort().join(' | '), ext: P.ext.map((e) => [Math.round(e.x), Math.round(e.z), Math.round(e.half)]), ponts: P.ponts.map((p) => Math.round(p.long)), tete: P.tete.map(Math.round) };
});
check('plan : le lit du fleuve entre les deux rives restituées, sept îles dont la Cité (une douzaine d’hectares)', pl.lit > 250 && pl.lit < 340 && pl.iles === 7 && pl.cite > 10 && pl.cite < 15, JSON.stringify({ lit: pl.lit, iles: pl.iles, cite: pl.cite }));
check('plan : vingt-sept voies (le tour des arènes n’en est pas une), le cardo sur cinq kilomètres, ruisseaux et bras morts', pl.rues === 28 && pl.voies === 27 && pl.cardo > 5000 && pl.ruisseaux >= 5 && pl.marais >= 6, JSON.stringify({ voies: pl.voies, cardo: pl.cardo, ruisseaux: pl.ruisseaux, marais: pl.marais }));
check('plan : cinq monuments situés ; le fleuve prolongé en aval et en amont', pl.mons === 'Arènes de Lutèce | Forum | Thermes de l\'Est | Thermes du Nord | Théâtre' && pl.ext.length === 2 && pl.ext[0][0] < -2500 && pl.ext[1][0] > 1500 && pl.ext.every((e) => e[2] > 100 && e[2] < 450), JSON.stringify(pl.ext));
check('plan : deux ponts là où le cardo franchit les deux bras ; tête de pont sur la rive droite', pl.ponts.length === 2 && pl.ponts.every((l) => l > 80 && l < 260) && pl.tete[1] < -300, JSON.stringify({ ponts: pl.ponts, tete: pl.tete }));

// ---------- terrain : fleuve creusé, îles basses, colline, terrasses
const te = await page.evaluate(() => {
  const a = window.__app, T = a.terrain, P = a.plan250, p0 = P.ponts[0], m = p0.pts[p0.pts.length >> 1], c = P.cite.reduce((s, p) => [s[0] + p[0] / P.cite.length, s[1] + p[1] / P.cite.length], [0, 0]);
  const hs = (ring) => { const v = ring.map((p) => T.height(p[0], p[1])); return +(Math.max(...v) - Math.min(...v)).toFixed(2); }, f = P.am.forum;
  const loin = P.ext.map((e) => +T.raw(e.x + e.dx * 1500, e.z + e.dz * 1500).toFixed(1));
  return { eau: +T.wetAt(m.x, m.z).toFixed(2), fond: +T.height(m.x, m.z).toFixed(1), cite: +T.height(c[0], c[1]).toFixed(1), citeSec: T.wetAt(c[0], c[1]), forum: +T.height(f.f.cx, f.f.cz).toFixed(1), plat: { forum: hs(f.cour), thermes: hs(P.am.thermesN.m.ring), arenes: hs(P.am.arenes.arene) }, loin, rive: +T.height(-300, 60).toFixed(1) };
});
check('terrain : le fleuve est creusé sous le pont et se prolonge hors du cadre', te.eau > 0.95 && te.fond < -2 && te.loin.every((h) => h < -2), JSON.stringify({ eau: te.eau, fond: te.fond, loin: te.loin }));
check('terrain : l’île est basse, la colline du forum la domine de plus de quinze mètres', te.citeSec < 0.02 && te.cite > 2.5 && te.cite < 6.5 && te.forum > te.cite + 15 && te.rive > 2 && te.rive < 9, JSON.stringify({ cite: te.cite, forum: te.forum, rive: te.rive }));
check('terrain : forum, thermes et arène sont de niveau', te.plat.forum < 0.3 && te.plat.thermes < 0.3 && te.plat.arenes < 0.3, JSON.stringify(te.plat));

// ---------- la ville évoquée
const st = await page.evaluate(() => {
  const a = window.__app, P = a.plan250, T = a.terrain, C = [-470, 470], d = (l) => Math.hypot(l.x - C[0], l.z - C[1]);
  const dans = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const p = r[i], q = r[j]; if ((p[1] > z) !== (q[1] > z) && x < ((q[0] - p[0]) * (z - p[1])) / (q[1] - p[1]) + p[0]) c = !c; } return c; };
  let mouille = 0, surMon = 0, surRue = 0; const mons = Object.values(P.mons).map((m) => m.ring);
  const distSeg = (px, pz, a2, b) => { const dx = b[0] - a2[0], dz = b[1] - a2[1], t = Math.max(0, Math.min(1, ((px - a2[0]) * dx + (pz - a2[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(px - a2[0] - t * dx, pz - a2[1] - t * dz); };
  for (const l of P.lots) { if (l.ring.some((p) => T.wetAt(p[0], p[1]) > 0.1)) mouille++; if (mons.some((r) => dans(l.x, l.z, r))) surMon++; for (const v of P.voies) for (let i = 0; i + 1 < v.length; i++) if (distSeg(l.x, l.z, v[i], v[i + 1]) < 3) { surRue++; i = 1e9; } }
  let ymin = 1e9, ymax = -1e9; for (const m of a.batiMeshes) { const b = m.geometry.boundingBox; ymin = Math.min(ymin, b.min.y); ymax = Math.max(ymax, b.max.y); }
  return { ...a.stats, lots: P.lots.length, coeur: P.lots.filter((l) => d(l) < 300).length, loin: P.lots.filter((l) => d(l) > 900).length, cite: P.lots.filter((l) => dans(l.x, l.z, P.cite)).length, droite: P.lots.filter((l) => l.z < -420).length, cours: P.lots.filter((l) => l.cour).length, portiques: P.lots.filter((l) => l.portique).length, deux: P.lots.filter((l) => l.etages === 2).length, jardins: P.jardins.length, mouille, surMon, surRue, arbres: a.treeCount, emprises: a.foot.length, maillages: a.cityMeshes.length, ymin: +ymin.toFixed(1), ymax: +ymax.toFixed(1), passants: a.people.total };
});
check('ville : entre mille et deux mille cinq cents maisons, serrées autour du forum, clairsemées au loin ; quelques-unes dans l’île et sur la rive droite', st.lots > 1000 && st.lots < 2500 && st.bati === st.lots && st.coeur > 350 && st.loin < st.lots * 0.08 && st.cite > 15 && st.cite < 160 && st.droite > 5 && st.droite < 120, JSON.stringify({ lots: st.lots, coeur: st.coeur, loin: st.loin, cite: st.cite, droite: st.droite }));
check('ville : aucune maison dans l’eau, sur une chaussée ou sur un monument ; maisons à cour, portiques du cardo, jardins', st.mouille === 0 && st.surMon === 0 && st.surRue === 0 && st.cours > 10 && st.portiques > 20 && st.deux > 200 && st.jardins > 600, JSON.stringify({ mouille: st.mouille, surMon: st.surMon, surRue: st.surRue, cours: st.cours, portiques: st.portiques, deux: st.deux, jardins: st.jardins }));
check('ville : maquette légère (moins de deux cent mille triangles), arbres, tombeaux, rien d’aberrant en hauteur', st.tris > 30000 && st.tris < 200000 && st.arbres > 3000 && st.tombeaux > 40 && st.emprises > st.lots && st.ymin > -6 && st.ymax < 60 && st.passants > 1000, JSON.stringify({ tris: st.tris, arbres: st.arbres, tombeaux: st.tombeaux, emprises: st.emprises, y: [st.ymin, st.ymax], passants: st.passants }));

// ---------- monuments
const mo = await page.evaluate(() => {
  const a = window.__app, T = a.terrain, M = a.monuments, P = a.plan250, h = (n) => (M[n] ? +(M[n].top - T.height(M[n].x, M[n].z)).toFixed(1) : -1), am = P.am, L = (f, x, c) => [f.cx + f.ux * x - f.uz * c, f.cz + f.uz * x + f.ux * c];
  const temple = L(am.forum.f, -50, 0), cour = L(am.forum.f, 10, 0), passage = L(am.forum.f, 0, am.forum.f.hw - 4), aile = L(am.forum.f, 40, am.forum.f.hw - 5), O = am.arenes.O, th = am.theatre;
  const gradin = (g, ring) => { const t = (g.a0 + g.a1) / 2; let R = 0; for (let r = 5; r < 90; r += 1) { let c = false; const x = g.O[0] + Math.cos(t) * r, z = g.O[1] + Math.sin(t) * r; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const p = ring[i], q = ring[j]; if ((p[1] > z) !== (q[1] > z) && x < ((q[0] - p[0]) * (z - p[1])) / (q[1] - p[1]) + p[0]) c = !c; } if (c) R = r; } return [g.O[0] + Math.cos(t) * R * 0.75, g.O[1] + Math.sin(t) * R * 0.75]; };
  const ga = gradin(am.arenes, am.arenes.m.ring), gt = gradin(th, th.m.ring), tn = M['Thermes du Nord'];
  return { noms: Object.keys(M).sort().join(' | '), forum: h('Forum'), basilique: h('Basilique'), thermesN: h('Thermes du Nord'), thermesE: h('Thermes de l’Est'), theatre: h('Théâtre'), arenes: h('Arènes'), pilier: h('Pilier'),
    temple: !!a.footAt(temple[0], temple[1]), cour: a.walkable(cour[0], cour[1]), passage: a.walkable(passage[0], passage[1]), aile: !!a.footAt(aile[0], aile[1]), arene: a.walkable(O[0], O[1]), gradinA: !!a.footAt(ga[0], ga[1]), orchestre: a.walkable(th.O[0], th.O[1]), gradinT: !!a.footAt(gt[0], gt[1]), bains: !!a.footAt(tn.x, tn.z), pilierCite: (() => { let c = false; const r = P.cite, x = M.Pilier.x, z = M.Pilier.z; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const p = r[i], q = r[j]; if ((p[1] > z) !== (q[1] > z) && x < ((q[0] - p[0]) * (z - p[1])) / (q[1] - p[1]) + p[0]) c = !c; } return c; })() };
});
check('monuments : forum et basilique, deux thermes, théâtre, arènes, deux ponts, pilier des Nautes, nécropole', mo.noms === 'Arènes | Basilique | Forum | Necropole | Pilier | Thermes de l’Est | Thermes du Nord | Théâtre | pont0 | pont1', mo.noms);
check('monuments : hauteurs — temple du forum, voûte des thermes du Nord à plus de quatorze mètres, gradins', mo.forum > 14 && mo.forum < 22 && mo.basilique > 13 && mo.basilique < 20 && mo.thermesN > 14 && mo.thermesN < 18 && mo.thermesE > 14 && mo.thermesE < 18 && mo.theatre > 10 && mo.theatre < 15 && mo.arenes > 12 && mo.arenes < 17 && mo.pilier > 5 && mo.pilier < 8, JSON.stringify({ forum: mo.forum, basilique: mo.basilique, thermesN: mo.thermesN, thermesE: mo.thermesE, theatre: mo.theatre, arenes: mo.arenes, pilier: mo.pilier }));
check('forum : on entre par les passages, on marche sur l’esplanade ; le temple et les ailes font obstacle', mo.cour && mo.passage && mo.temple && mo.aile, JSON.stringify({ cour: mo.cour, passage: mo.passage, temple: mo.temple, aile: mo.aile }));
check('arènes et théâtre : l’arène et l’orchestre sont praticables, pas les gradins ; les bains sont clos ; le pilier est dans l’île', mo.arene && mo.gradinA && mo.orchestre && mo.gradinT && mo.bains && mo.pilierCite, JSON.stringify({ arene: mo.arene, gradinA: mo.gradinA, orchestre: mo.orchestre, gradinT: mo.gradinT, bains: mo.bains, pilier: mo.pilierCite }));

// ---------- ponts de bois : on les traverse à pied, au-dessus de l'eau
const po = await page.evaluate(() => {
  const a = window.__app, T = a.terrain, n = a.nav;
  return a.plan250.ponts.map((p) => { const m = p.pts[p.pts.length >> 1], i = Math.floor((m.x - n.x0) / n.cell), k = Math.floor((m.z - n.z0) / n.cell), ax = m.x - m.dz * 14, az = m.z + m.dx * 14;
    return { eau: T.wetAt(m.x, m.z) > 0.9, marche: a.walkable(m.x, m.z), y: +a.walkHeight(m.x, m.z).toFixed(1), tablier: +m.y.toFixed(1), aCote: a.walkable(ax, az), trame: n.data[k * n.w + i], bouts: [p.pts[0], p.pts[p.pts.length - 1]].map((q) => +(q.y - T.height(q.x, q.z)).toFixed(2)), palees: p.pts.filter((q) => q.eau).length }; });
});
check('ponts : tablier praticable à plus de trois mètres au-dessus de l’eau, raccordé aux deux berges, sur palées ; les passants l’empruntent', po.length === 2 && po.every((p) => p.eau && p.marche && Math.abs(p.y - p.tablier) < 0.3 && p.y > 3 && !p.aCote && p.trame === 1 && p.bouts.every((d) => Math.abs(d) < 0.05) && p.palees > 8), JSON.stringify(po));

// ---------- image : toits de tuile, fleuve, pas d'écran uni
const img = await page.evaluate(async () => {
  const a = window.__app; a.rig.goal = { ...a.monde.vue }; a.rig.cur = { ...a.rig.goal }; a.rig.update(0); a.renderNow();
  const src = a.renderer.domElement, c = document.createElement('canvas'); c.width = 220; c.height = 140; const x = c.getContext('2d'); x.drawImage(src, 0, 0, 220, 140);
  const d = x.getImageData(0, 0, 220, 140).data; let toit = 0, eau = 0, vert = 0, s = 0, s2 = 0; const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], l = (r + g + b) / 3; s += l; s2 += l * l; if (r > g + 28 && r > b + 40) toit++; if (b > r + 12 && b > g) eau++; if (g > r && g > b + 20) vert++; }
  return { toit: +(toit / n).toFixed(3), eau: +(eau / n).toFixed(3), vert: +(vert / n).toFixed(3), ecart: Math.round(Math.sqrt(s2 / n - (s / n) ** 2)) };
});
check('image : toits de tuile, fleuve et campagne à l’écran', img.toit > 0.02 && img.eau > 0.03 && img.vert > 0.2 && img.ecart > 12, JSON.stringify(img));

// ---------- repères et fiches
const li = await page.evaluate(() => { const a = window.__app, P = a.places; return { n: P.length, ids: P.map((p) => p.id).join(' '), cats: [...new Set(P.map((p) => p.cat))].sort().join(' '), rang1: P.filter((p) => p.rang === 1).map((p) => p.name).join(', '), etiquettes: document.querySelectorAll('#labels .label').length, hors: P.filter((p) => !(p.x > -2600 && p.x < 2400 && p.z > -2400 && p.z < 2600) || !(p.y > 0 && p.y < 80)).length }; });
check('repères : quinze lieux en quatre catégories, tous dans le cadre', li.n === 15 && li.cats === 'culte monument site voie' && li.etiquettes === 15 && li.hors === 0 && /forum/.test(li.ids) && /petit-pont/.test(li.ids) && /grand-pont/.test(li.ids) && /pilier-des-nautes/.test(li.ids), JSON.stringify(li));
await page.evaluate(() => { const a = window.__app; a.ui.select(a.ui.byId.get('thermes-du-nord'), true); });
await frames(4);
const fi = await page.evaluate(() => ({ nom: document.getElementById('card-name').textContent, cat: document.getElementById('card-cat').textContent, texte: document.getElementById('card-text').textContent, ouvert: !document.getElementById('card').hidden }));
check('fiche : les thermes du Nord, leur notice, sans mention d’édifice manquant', fi.ouvert && fi.nom === 'Thermes du Nord' && /Monuments publics/.test(fi.cat) && /Cluny/.test(fi.texte) && !/modelé/.test(fi.texte), JSON.stringify(fi).slice(0, 200));
await page.click('#btn-places'); await page.fill('#place-search', 'pont');
const rech = await page.evaluate(() => [...document.querySelectorAll('#place-list button')].map((b) => b.textContent).join(' | '));
check('liste des lieux : recherche', /Petit pont/.test(rech) && /Grand pont/.test(rech) && /Tête de pont/.test(rech) && !/Forum/.test(rech), rech);
await page.fill('#place-search', ''); await page.keyboard.press('Escape');

// ---------- marche à pied : devant le forum, puis sur le pont
await page.evaluate(() => { const a = window.__app; a.ui.startWalk(a.ui.byId.get('forum')); });
await frames(4);
const wa = await page.evaluate(() => { const a = window.__app, w = a.rig.walk; return { mode: a.rig.mode, marche: a.walkable(w.x, w.z), hud: !document.getElementById('walkhud').hidden, dist: Math.round(Math.hypot(w.x - a.monuments.Forum.x, w.z - a.monuments.Forum.z)), ou: document.getElementById('where').textContent, passants: a.people.count }; });
check('marche à pied : on arrive près du forum, sur un sol praticable, au milieu des passants', wa.mode === 'walk' && wa.marche && wa.hud && wa.dist < 150 && wa.passants > 20, JSON.stringify(wa));
await page.evaluate(() => { const a = window.__app, p = a.plan250.ponts[0], m = p.pts[p.pts.length >> 1]; a.ui.goWalk(m.x, m.z, Math.atan2(m.dx, m.dz)); });
await frames(4);
const wp = await page.evaluate(() => { const a = window.__app, w = a.rig.walk; return { y: +a.camera.position.y.toFixed(1), ou: document.getElementById('where').textContent, mode: a.rig.mode }; });
check('marche à pied : sur le pont, l’œil à hauteur d’homme au-dessus du tablier ; le cardo est nommé', wp.mode === 'walk' && wp.y > 4.4 && wp.y < 9 && /Cardo maximus/.test(wp.ou), JSON.stringify(wp));
await page.evaluate(() => window.__app.ui.stopWalk());
check('retour au survol', await page.evaluate(() => window.__app.rig.mode !== 'walk' && document.getElementById('walkhud').hidden));

// ---------- heure : la nuit, les lampes
const nu = await page.evaluate(() => { const a = window.__app; a.ui.setHour(21.5); const n = [a.materials.facade.emissiveIntensity, a.materials.rdc.emissiveIntensity]; a.ui.setHour(12); const j = a.materials.facade.emissiveIntensity; a.ui.setHour(10.5); return { n, j, label: document.getElementById('hour-label').textContent }; });
check('heure : la nuit, les fenêtres s’éclairent ; à midi, non', nu.n.every((v) => v > 0.8) && nu.j < 0.05 && nu.label === '10 h 30', JSON.stringify(nu));

// ---------- parcours commenté : étapes, vol vers chaque lieu, lecture automatique, retour au survol
const vi = await page.evaluate(async () => { const a = window.__app, V = a.ui.visite, $ = (id) => document.getElementById(id), tic = (n) => { for (let i = 0; i < n; i++) { a.rig.update(0.05); a.emit('frame', 0.05); } };
  $('mode-tour').click(); const t0 = { panneau: !$('tour').hidden, titre: $('tour-title').textContent, compte: $('tour-count').textContent, texte: $('tour-text').textContent.length, mode: $('mode-tour').getAttribute('aria-pressed'), points: document.querySelectorAll('#tour-dots button').length };
  $('tour-next').click(); tic(80); const e1 = V.etat(), p = a.ui.places.find((q) => q.name === e1.lieu), pres = p ? Math.round(Math.hypot(a.rig.cur.x - p.x, a.rig.cur.z - p.z)) : -1, fiche = !$('tour-card').hidden;
  for (let i = 0; i < 1500 && V.etat().k === e1.k; i++) tic(1); const e2 = V.etat();
  $('tour-stop').click(); const fin = { actif: V.etat().actif, panneau: !$('tour').hidden, survol: $('mode-fly').getAttribute('aria-pressed') };
  return { t0, e1, pres, fiche, e2, fin, manquants: V.manquants }; });
check('parcours commenté « Lutèce vers 250 » : 12 étapes, la vue se rend à chaque lieu, l’étape suivante vient seule, « Terminer » rend le survol', vi.t0.panneau && vi.t0.mode === 'true' && vi.t0.titre === 'Lutèce vers 250' && vi.t0.compte === '1 / 12' && vi.t0.points === 12 && vi.t0.texte > 80 && vi.e1.k === 1 && vi.pres >= 0 && vi.pres < 30 && vi.fiche && vi.e2.k === 2 && !vi.fin.actif && !vi.fin.panneau && vi.fin.survol === 'true' && vi.manquants.length === 0, JSON.stringify(vi));

// ---------- mini-plan, lien partageable, enfoncement de la ville
const mi = await page.evaluate(() => { const a = window.__app; a.ui.mini.sig = ''; a.ui.drawMini(); const c = document.getElementById('minimap'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let eau = 0, n = d.length / 4; for (let i = 0; i < d.length; i += 4) if (d[i + 2] > d[i] + 8 && d[i] < 120) eau++; return { w: c.width, eau: +(eau / n).toFixed(3) }; });
check('mini-plan : le fleuve y est dessiné', mi.w > 100 && mi.eau > 0.03, JSON.stringify(mi));
const lk = await page.evaluate(() => { const a = window.__app; a.ui.select(null); a.ui.applyState({ c: [120, 840, 420, 0.8, 0.5], h: 18 }); const l = a.ui.link(); a.ui.applyState({ c: [-500, 500, 900, 0, 0.7], h: 9 }); const r = a.ui.openLink(l), g = a.rig.goal; return { l, r, g: [Math.round(g.x), Math.round(g.z), Math.round(g.dist)], h: a.sky.hour }; });
check('lien partageable : il rouvre la vue et l’heure', lk.r && /c=120,840,420/.test(lk.l) && lk.g.join() === '120,840,420' && lk.h === 18, JSON.stringify(lk));
const mor = await page.evaluate(async () => { const a = window.__app; await a.morph(0, 500); const bas = { k: a.cityScale, vis: a.bati.visible, corps: document.body.classList.contains('morph') }; await a.morph(1, 500); return { bas, haut: { k: a.cityScale, vis: a.bati.visible, corps: document.body.classList.contains('morph') }, enfants: a.bati.children.length }; });
check('passage d’époque : la ville s’enfonce (maisons, monuments, ponts, arbres, habitants) puis se dresse', mor.bas.k === 0 && !mor.bas.vis && mor.bas.corps && mor.haut.k === 1 && mor.haut.vis && !mor.haut.corps && mor.enfants > 10, JSON.stringify(mor));

// ---------- sources, aide, frise
await page.click('#btn-sources');
const so = await page.evaluate(() => { const m = document.getElementById('sources'); return { ouvert: !m.hidden, lignes: document.querySelectorAll('#sources-list li').length, texte: m.textContent }; });
check('sources : Vacquer et ALPAGE crédités, licence ODbL, relief de Girard, part de l’évocation annoncée', so.ouvert && so.lignes === 2 && /Vacquer/.test(so.texte) && /ALPAGE/.test(so.texte) && /ODbL/.test(so.texte) && /Girard/.test(so.texte) && /Évoqué/.test(so.texte) && /toutes les maisons/.test(so.texte), JSON.stringify({ lignes: so.lignes }));
await page.keyboard.press('Escape');
check('Échap referme les sources', await page.evaluate(() => document.getElementById('sources').hidden));
await page.click('#btn-help'); check('aide', await visible('#help')); await page.keyboard.press('Escape');
await page.click('#btn-epoch');
const fr = await page.evaluate(() => { const l = [...document.querySelectorAll('#frise-jalons a')]; return { ouvert: !document.getElementById('frise').hidden, noms: l.map((a) => a.textContent).join(' '), liens: l.map((a) => a.getAttribute('href')), ici: l.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent).join(), site: document.getElementById('brand-site').textContent, titre: document.title, h1: document.querySelector('#brand h1').textContent }; });
check('frise des dates : Lutèce en cours ; 1380 et 1789 mènent aux autres maquettes, les autres dates à la première ; le site s’appelle « Paris à travers le temps »', fr.ouvert && fr.noms === 'Lutèce 1300 1380 1553 1652 1741 1789 1836 1889' && fr.liens[8] === 'index.html#m=1889' && fr.ici === 'Lutèce' && fr.liens[0] === null && fr.liens[1] === 'index.html#e=1300' && fr.liens[2] === 'index.html' && fr.liens[6] === 'index.html#m=1789' && fr.liens[7] === 'index.html#e=1836' && fr.site === 'Paris à travers le temps' && /^Paris à travers le temps — Lutèce/.test(fr.titre) && fr.h1 === 'Lutèce vers 250', JSON.stringify(fr));
await page.keyboard.press('Escape');
check('Échap referme la frise des dates', await page.evaluate(() => document.getElementById('frise').hidden && document.getElementById('btn-epoch').getAttribute('aria-expanded') === 'false'));

// ---------- téléphone (même page, fenêtre étroite)
await page.setViewportSize({ width: 390, height: 780 }); await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await frames(3);
check('pas de défilement horizontal (mobile)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
const mob = await page.evaluate(() => { const a = window.__app; a.ui.select(a.ui.byId.get('arenes'), false); const dock = document.getElementById('dock').getBoundingClientRect(), c = document.getElementById('card').getBoundingClientRect(); return { dock: Math.round(dock.height), peek: document.getElementById('card').classList.contains('peek'), cardBottom: Math.round(c.bottom), dockTop: Math.round(dock.top), more: getComputedStyle(document.getElementById('btn-more')).display }; });
check('téléphone : barre sur une ligne, fiche en volet replié', mob.dock <= 62 && mob.peek && mob.cardBottom <= mob.dockTop + 8 && mob.more !== 'none', JSON.stringify(mob));
await page.click('#btn-more');
check('téléphone : menu replié (Paris 1380, Paris 1789, Sources, Partager, Aide)', await page.evaluate(() => document.getElementById('menu-more').classList.contains('open') && ['btn-1380', 'btn-1789', 'btn-sources', 'btn-share', 'btn-help'].every((id) => getComputedStyle(document.getElementById(id)).display !== 'none')));
await page.click('#btn-more');
await page.setViewportSize({ width: 1100, height: 700 }); await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await frames(2);

// ---------- téléphone (appareil) : la ville se construit en mode allégé
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  const m = await ctx.newPage(); watch(m); m.setDefaultTimeout(120000);
  await m.goto(URL + '#shot'); await m.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 300000 });
  await frames(2, m);
  const r = await m.evaluate(() => { const a = window.__app; return { mobile: a.mobile, echec: window.__failed || '', lots: a.plan250.lots.length, tris: a.stats.tris, maille: a.nav.cell, passants: a.people.total, large: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
  check('téléphone : la ville se construit, trame des passants allégée', r.mobile && !r.echec && r.lots > 1000 && r.tris < 200000 && r.maille === 2.5 && r.passants < 2000 && r.large, JSON.stringify(r));
  await ctx.close(); }

// ---------- adresse courte et passage aux autres maquettes, page ouverte seule
{ const p2 = await browser.newPage();
  await p2.goto('file://' + join(root, 'lutece.html') + '?x=1#c=-594,619,500,0.4,0.6&h=18.75', { waitUntil: 'commit' }).catch(() => {});
  const bon = await p2.waitForURL(/dist\/index\.html\?x=1#m=lutece&c=-594,619,500/, { timeout: 60000 }).then(() => true).catch(() => false);
  check('adresse courte : lutece.html, à la racine du site, mène à la page d’accueil sur Lutèce en gardant le lien partagé', bon, p2.url().slice(-70));
  await p2.close(); }
const nav = page.waitForURL(/index\.html#m=1789&/, { timeout: 60000 }).then(() => true).catch(() => false);
await page.click('#btn-1789');
check('bouton « Paris 1789 » : la page, ouverte seule, mène à la maquette de 1789 par la page d’accueil, vue et heure comprises', await nav, page.url().slice(-60));
await page.close();

check('aucune erreur ni avertissement console', errors.length === 0, errors.length ? '\n' + [...new Set(errors)].slice(0, 8).join('\n') : '');
console.log(`\n${ok} vérifications réussies, ${ko} échec(s)`);
await browser.close();
process.exit(ko ? 1 : 0);
