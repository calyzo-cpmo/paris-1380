// Test fonctionnel de la page « Paris 1889 » (le test lit l'image : l'avertissement du pilote sur cette lecture est ignoré) : charge la page, vérifie la ville recomposée (bâti, Seine, ponts,
// enceinte), la tour et son chantier (curseur de date, échafaudages, palais), les repères, la marche à pied, l'heure,
// la frise, les sources, le téléphone et l'absence d'erreurs.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(120000);
const errors = [];
const watch = (p) => { p.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall due to ReadPixels/.test(m.text())) errors.push(m.type() + ': ' + m.text().slice(0, 300)); }); p.on('pageerror', (e) => errors.push('pageerror: ' + String(e.stack || e).slice(0, 600))); };
watch(page);
const URL = 'file://' + join(root, 'dist/1889.html');
await page.goto(URL + '#shot');
await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 300000 });
let ok = 0, ko = 0;
const t0 = Date.now(), clock = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + ' s';
const check = (name, cond, extra = '') => { if (cond) { ok++; console.log(clock(), ' ok  ', name, extra); } else { ko++; console.log(clock(), ' ÉCHEC', name, extra); } };
const frames = (n, p = page) => p.evaluate(async (n) => {
  const a = window.__app; for (let i = 0; i < n; i++) { a.rig.update(0.05); a.time += 0.05; a.emit('frame', 0.05); } a.renderNow();
  const gl = a.renderer.getContext(); if (!gl.fenceSync) return;
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
  await new Promise((done) => { const poll = () => { const s = gl.clientWaitSync(sync, 0, 0); if (s === gl.TIMEOUT_EXPIRED) setTimeout(poll, 8); else { gl.deleteSync(sync); done(); } }; poll(); });
}, n);
const visible = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; }, sel);
const J = (a, m, j) => Math.round((Date.UTC(a, m - 1, j) - Date.UTC(1887, 0, 1)) / 864e5), FIN = J(1889, 5, 6);

check('la page démarre', await page.evaluate(() => window.__ready === true && !window.__failed), String(await page.evaluate(() => window.__failed || '')));
await frames(3);

// ---------- la ville recomposée
const v = await page.evaluate(() => { const a = window.__app, T = a.terrain, V = a.v89; return {
  bati: a.stats.bati, tris: a.stats.tris, maillages: a.batiMeshes.length, arbres: a.treeCount, ponts: V.ponts.map((p) => p.nom), foot: a.foot.length,
  seine: [[-4218, -767], [-3237, -1177], [-4411, -503], [-420, -120]].map((p) => +T.wetAt(p[0], p[1]).toFixed(2)).concat(+Math.min(...V.ponts.map((p) => T.wetAt(p.x, p.z))).toFixed(2)), sec: [[-4039, -604], [0, 0], [-1355, -2088]].map((p) => +T.wetAt(p[0], p[1]).toFixed(2)),
  tour: +T.height(-4039.4, -604.3).toFixed(1), montmartre: +T.height(-521, -3700).toFixed(1), belleville: +T.height(3300, -2300).toFixed(1), passants: a.people.total, nav: a.nav.w * a.nav.h, cadre: a.monde.cadre }; });
check('bâti : près de quatre-vingt mille bâtiments dressés', v.bati > 70000 && v.bati < 90000 && v.foot >= v.bati, `${v.bati} bâtiments`);
check('bâti : volumes légers (moins de 3,2 millions de triangles, moins de 700 maillages)', v.tris > 1.5e6 && v.tris < 3.2e6 && v.maillages < 700, `${v.tris} triangles, ${v.maillages} maillages`);
check('Seine : continue devant la tour et au centre, en eau sous chaque pont ; à sec sur les rives', v.seine.slice(0, 4).every((w) => w > 0.9) && v.seine[4] > 0.5 && v.sec.every((w) => w < 0.05), JSON.stringify([v.seine, v.sec]));
check('relief : le Champ-de-Mars près du fleuve, Montmartre et Belleville sur leurs collines', v.tour > 3 && v.tour < 12 && v.montmartre > 80 && v.belleville > 60, JSON.stringify([v.tour, v.montmartre, v.belleville]));
check('ponts : une quarantaine sur la Seine, dont le pont d’Iéna et le Pont-Neuf ; pas le pont Alexandre-III (1900)', v.ponts.length >= 35 && v.ponts.length < 60 && v.ponts.some((n) => /I.na/.test(n)) && v.ponts.some((n) => /Neuf/.test(n)) && !v.ponts.some((n) => /Alexandre|Mirabeau/.test(n)), `${v.ponts.length} ponts`);
check('cadre : tout Paris dans l’enceinte de Thiers (plus de 12 km d’ouest en est)', v.cadre.x1 - v.cadre.x0 > 12000 && v.cadre.z1 - v.cadre.z0 > 9000, JSON.stringify(v.cadre));
check('jardins et passants', v.arbres > 5000 && v.passants > 1000 && v.nav > 1e6, JSON.stringify([v.arbres, v.passants]));

// ---------- la tour et son chantier
const ch = await page.evaluate(([j1, j2, j3, fin]) => { const a = window.__app, V = a.v89, out = {}, etat = () => ({ h: +V.chantier.hauteur.toFixed(1), vus: V.mobiles.filter((m) => m.visible).length });
  out.n = V.mobiles.length; out.top = +(a.monuments.Tour.top - a.terrain.height(-4039.4, -604.3)).toFixed(1);
  a.setChantier(0); out.avant = etat(); a.setChantier(j1 - 40); out.piles = etat(); a.setChantier(j1); out.jonction = etat(); a.setChantier(j2); out.e2 = etat(); a.setChantier(j3); out.sommet = etat(); a.setChantier(fin); out.fin = etat();
  a.setChantier(fin + 500); out.borne = V.chantier.jour; a.setChantier(fin);
  return out; }, [J(1887, 12, 7), J(1888, 8, 14), J(1889, 3, 31), FIN]);
check('tour : trois cents mètres au-dessus du Champ-de-Mars', ch.top === 300, String(ch.top));
check('chantier : rien le 1er janvier 1887, 55 m à la jonction du 7 décembre, plus de 115 m le 14 août 1888, 300 m le 31 mars 1889', ch.avant.h === 0 && ch.avant.vus === 0 && ch.jonction.h === 55 && ch.e2.h >= 115 && ch.e2.h < 125 && ch.sommet.h === 300 && ch.fin.h === 300 && ch.borne === FIN, JSON.stringify(ch));
check('chantier : échafaudages et grues pendant le montage des piles, retirés à l’ouverture ; les palais s’ajoutent', ch.piles.vus > ch.fin.vus - 3 && ch.piles.vus >= 8 && ch.fin.vus >= 5 && ch.jonction.vus > ch.avant.vus, JSON.stringify([ch.piles.vus, ch.jonction.vus, ch.fin.vus, ch.n]));
// la tour se voit à l'image : points brun-rouge devant le ciel, à l'ouverture et avant le chantier
const rouge = (j) => page.evaluate(async (j) => { const a = window.__app; a.setChantier(j); a.setView([-4420, 190, -970], [-4039, 185, -604]); a.rig.cur = { ...a.rig.goal }; a.rig.update(0); a.renderNow();
  const gl = a.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let n = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > px[i + 2] + 22 && px[i] > px[i + 1] + 14 && px[i] < 170) n++; return n; }, j);
const r0 = await rouge(0), rm = await rouge(J(1888, 8, 14)), r1 = await rouge(FIN);
check('image : la tour absente en janvier 1887, à mi-hauteur en août 1888, entière en mai 1889', r1 > r0 + 3000 && rm > r0 + 800 && r1 > rm + 800, JSON.stringify([r0, rm, r1]));

// ---------- le curseur
const cu = await page.evaluate(async ([j1, fin]) => { const a = window.__app, sl = document.getElementById('ch-date'), jour = document.getElementById('ch-jour'), note = document.getElementById('ch-note'), play = document.getElementById('ch-play'), out = { max: +sl.max, depart: +sl.value, texte0: jour.textContent + ' | ' + note.textContent };
  sl.value = String(j1); sl.dispatchEvent(new Event('input', { bubbles: true })); out.texte1 = jour.textContent + ' | ' + note.textContent; out.h1 = a.v89.chantier.hauteur;
  sl.value = String(fin); sl.dispatchEvent(new Event('input', { bubbles: true }));
  play.click(); out.joue = play.getAttribute('aria-pressed'); for (let i = 0; i < 40; i++) a.emit('frame', 0.05); out.apres = +sl.value; out.texte2 = jour.textContent;
  for (let i = 0; i < 1000; i++) a.emit('frame', 0.05); out.fin = +sl.value; out.arret = play.getAttribute('aria-pressed'); out.hfin = a.v89.chantier.hauteur;
  return out; }, [J(1887, 12, 7), FIN]);
check('curseur : du 1er janvier 1887 au 6 mai 1889, ouvert sur l’ouverture de l’Exposition', (await visible('#chantier')) && cu.max === FIN && cu.depart === FIN && /^6 mai 1889 \| Ouverture/.test(cu.texte0), JSON.stringify([cu.max, cu.texte0]));
check('curseur : au 7 décembre 1887, la date, l’étape et la hauteur sont dites', /^7 décembre 1887 \| Les quatre piles se rejoignent.*55 m$/.test(cu.texte1) && cu.h1 === 55, cu.texte1);
check('curseur : la lecture repart de 1887, avance, puis s’arrête à l’ouverture', cu.joue === 'true' && cu.apres > 20 && cu.apres < 80 && /1887/.test(cu.texte2) && cu.fin === FIN && cu.arret === 'false' && cu.hfin === 300, JSON.stringify([cu.apres, cu.texte2, cu.fin, cu.arret]));

// ---------- repères, fiche, sources
const lx = await page.evaluate(() => { const a = window.__app, P = a.ui.places; return { n: P.length, noms: P.map((p) => p.name), cats: [...new Set(P.map((p) => p.cat))].length, hors: P.filter((p) => p.x < a.monde.cadre.x0 || p.x > a.monde.cadre.x1 || p.z < a.monde.cadre.z0 || p.z > a.monde.cadre.z1).length }; });
check('repères : la tour, les palais de l’Exposition, le Trocadéro, l’enceinte et les monuments de la ville', lx.n >= 25 && lx.hors === 0 && lx.cats >= 4 && ['Tour de 300 mètres', 'Galerie des machines', 'Dôme central', 'Palais du Trocadéro', 'Pont d’Iéna', 'Enceinte de Thiers', 'Notre-Dame'].every((n) => lx.noms.includes(n)), `${lx.n} lieux`);
await page.click('#btn-places');
await page.fill('#place-search', 'machines');
const liste = await page.evaluate(() => [...document.querySelectorAll('#place-list button, #place-list li')].map((b) => b.textContent).filter((t) => /machines/i.test(t)).length);
check('liste des lieux : la recherche trouve la Galerie des machines', liste >= 1, String(liste));
await page.evaluate(() => { const a = window.__app; a.ui.select(a.ui.byId.get('tour-de-300-metres'), false); }); await frames(2);
const fiche = await page.evaluate(() => { const c = document.getElementById('card'); return { vu: !c.hidden, texte: c.textContent.slice(0, 400) }; });
check('fiche : la tour, ses dates et ses chiffres', fiche.vu && /Tour de 300 mètres/.test(fiche.texte) && /28 janvier 1887/.test(fiche.texte), fiche.texte.slice(0, 90));
await page.evaluate(() => window.__app.ui.select(null));
await page.click('#btn-sources');
const src = await page.evaluate(() => { const d = document.getElementById('sources'); return { vu: !d.hidden, n: d.querySelectorAll('#sources-list li').length, t: d.textContent }; });
check('sources : APUR, base « Paris 1900 », atlas de Vasserot, IGN ; ce qui est réel et ce qui est évoqué', src.vu && src.n === 5 && /Atelier parisien d’urbanisme/.test(src.t) && /Paris 1900/.test(src.t) && /Vasserot/.test(src.t) && /IGN/.test(src.t) && /Évoqué/.test(src.t) && /Pas encore modelé/.test(src.t), `${src.n} sources`);
await page.click('#sources [data-close="sources"]');

// ---------- heure, marche, frise
const nuit = await page.evaluate(() => { const a = window.__app; a.setHour(22); const n = a.materials.facade.emissiveIntensity; a.setHour(10.5); return [n, a.materials.facade.emissiveIntensity]; });
check('heure : la nuit, les fenêtres s’éclairent', nuit[0] > 0.5 && nuit[1] < 0.05, JSON.stringify(nuit));
await page.click('#mode-walk'); await frames(6);
const marche = await page.evaluate(() => { const a = window.__app, w = a.rig.walk || {}; return { mode: a.rig.mode, x: w.x, z: w.z, ok: a.rig.mode === 'walk' ? a.walkable(w.x, w.z) : false, rue: a.streetAt(-3930, -700, 80) }; });
check('à pied : on marche sur un sol libre, les rues ont leur nom de 1900', marche.mode === 'walk' && marche.ok && typeof marche.rue === 'string' && marche.rue.length > 3, JSON.stringify(marche));
await page.click('#mode-fly'); await frames(3);
await page.click('#btn-epoch');
const fr = await page.evaluate(() => { const l = [...document.querySelectorAll('#frise-jalons a')]; return { ouvert: !document.getElementById('frise').hidden, noms: l.map((a) => a.textContent).join(' '), liens: l.map((a) => a.getAttribute('href')), ici: (l.find((a) => a.getAttribute('aria-current') === 'page') || {}).textContent, site: document.getElementById('brand-site').textContent, titre: document.title }; });
check('frise des dates : 1889 en cours ; Lutèce, 1380 et 1789 mènent aux autres maquettes', fr.ouvert && fr.noms === 'Lutèce 1300 1380 1553 1652 1741 1789 1836 1889' && fr.ici === '1889' && fr.liens[0] === 'index.html#m=lutece' && fr.liens[2] === 'index.html' && fr.liens[6] === 'index.html#m=1789' && fr.liens[8] === null && fr.site === 'Paris à travers le temps' && /^Paris à travers le temps — Paris 1889/.test(fr.titre), JSON.stringify(fr));

// ---------- téléphone : version allégée
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p2 = await ctx.newPage(); watch(p2); p2.setDefaultTimeout(120000);
  await p2.goto(URL + '#shot'); await p2.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 300000 });
  const m = await p2.evaluate(() => { const a = window.__app, c = document.getElementById('chantier').getBoundingClientRect(); return { rate: window.__failed || '', mobile: a.mobile, tris: a.stats.tris, bati: a.stats.bati, curseur: c.width > 200 && c.right <= innerWidth + 1 && c.left >= -1, h: a.v89.chantier.hauteur }; });
  check('téléphone : la page démarre en version allégée (toits plats), le curseur du chantier tient dans l’écran', !m.rate && m.mobile && m.bati > 70000 && m.tris < v.tris * 0.8 && m.curseur && m.h === 300, JSON.stringify(m));
  await ctx.close(); }

// ---------- adresse courte et lien vers une autre maquette
{ const p2 = await browser.newPage({ viewport: { width: 900, height: 600 } });
  await p2.goto('file://' + join(root, '1889.html') + '?x=1#c=-3900,-520,900');
  const bon = await p2.waitForURL(/dist\/index\.html\?x=1#m=1889&c=-3900,-520,900/, { timeout: 60000 }).then(() => true).catch(() => false);
  check('adresse courte : 1889.html, à la racine du site, mène à la page d’accueil sur Paris 1889 en gardant le lien partagé', bon, p2.url().slice(-60));
  await p2.close(); }
const nav = page.waitForURL(/index\.html#m=1789&/, { timeout: 60000 }).then(() => true).catch(() => false);
await page.click('#btn-1789');
check('bouton « Paris 1789 » : la page, ouverte seule, mène à la maquette de 1789 par la page d’accueil', await nav, page.url().slice(-60));
await page.close();

check('aucune erreur ni avertissement console', errors.length === 0, errors.length ? '\n' + [...new Set(errors)].slice(0, 8).join('\n') : '');
console.log(`\n${ok} vérifications réussies, ${ko} échec(s)`);
await browser.close();
process.exit(ko ? 1 : 0);
