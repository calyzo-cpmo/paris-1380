// Test fonctionnel de la page « Paris 1889 » (le test lit l'image : l'avertissement du pilote sur cette lecture est ignoré) : charge la page, vérifie la ville recomposée (bâti, Seine, ponts,
// enceinte), les chemins de fer et les gares, la tour et son chantier (curseur de date, échafaudages, palais), les repères, la marche à pied, l'heure,
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
const ov = await page.evaluate(() => { const L = [...document.querySelectorAll('.label')].filter((e) => e.style.display !== 'none' && !e.classList.contains('dot')).map((e) => e.getBoundingClientRect()); let n = 0; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a.left < b.right - 3 && b.left < a.right - 3 && a.top < b.bottom - 3 && b.top < a.bottom - 3) n++; } return { noms: L.length, chevauchements: n }; });
check('étiquettes, à l’ouverture : aucun nom n’en chevauche un autre (les moins importants se réduisent à leur pastille)', ov.chevauchements === 0 && ov.noms >= 6, JSON.stringify(ov));

// ---------- la ville recomposée
const v = await page.evaluate(() => { const a = window.__app, T = a.terrain, V = a.v89; return {
  bati: a.stats.bati, tris: a.stats.tris, maillages: a.batiMeshes.length, arbres: a.treeCount, ponts: V.ponts.map((p) => p.nom), foot: a.foot.length,
  seine: [[-4218, -767], [-3237, -1177], [-4411, -503], [-420, -120]].map((p) => +T.wetAt(p[0], p[1]).toFixed(2)).concat(+Math.min(...V.ponts.map((p) => T.wetAt(p.x, p.z))).toFixed(2)), sec: [[-4039, -604], [0, 0], [-1355, -2088]].map((p) => +T.wetAt(p[0], p[1]).toFixed(2)),
  rives: { eau: V.ponts.filter((p) => T.wetAt(p.a[0], p.a[1]) > 0.3 || T.wetAt(p.b[0], p.b[1]) > 0.3).length, sec: V.ponts.filter((p) => T.wetAt(p.x, p.z) < 0.5).length, proches: V.ponts.filter((p, i) => V.ponts.some((q, k) => k > i && Math.hypot(p.x - q.x, p.z - q.z) < 40)).length },
  quais: a.stats.quais, bord: +Math.min(...V.ponts.map((p) => T.land(p.a[0], p.a[1]))).toFixed(1), rue: (() => { const v = a.voirie, C = a.monde.cadre, at = (x, z) => v.data[Math.floor(((z - C.z0) / (C.z1 - C.z0)) * v.h) * v.w + Math.floor(((x - C.x0) / (C.x1 - C.x0)) * v.w)]; let place = 0; for (let i = -2; i <= 2; i++) for (let k = -2; k <= 2; k++) place = Math.max(place, at(-1310 + i * 20, -1990 + k * 20)); return { w: v.w, D: v.D, place, ilot: at(-1341, -2095), seine: at(-4218, -767), expo: at(-3800, -370) }; })(),
  tour: +T.height(-4039.4, -604.3).toFixed(1), montmartre: +T.height(-521, -3700).toFixed(1), belleville: +T.height(3300, -2300).toFixed(1), passants: a.people.total, nav: a.nav.w * a.nav.h, cadre: a.monde.cadre }; });
check('bâti : près de quatre-vingt mille bâtiments dressés', v.bati > 70000 && v.bati < 90000 && v.foot >= v.bati - 100, `${v.bati} bâtiments`);
check('bâti : volumes légers (moins de 3,2 millions de triangles, moins de 700 maillages)', v.tris > 1.5e6 && v.tris < 3.2e6 && v.maillages < 700, `${v.tris} triangles, ${v.maillages} maillages`);
check('Seine : continue devant la tour et au centre, en eau sous chaque pont ; à sec sur les rives', v.seine.slice(0, 4).every((w) => w > 0.9) && v.seine[4] > 0.5 && v.sec.every((w) => w < 0.05), JSON.stringify([v.seine, v.sec]));
check('relief : le Champ-de-Mars près du fleuve, Montmartre et Belleville sur leurs collines', v.tour > 3 && v.tour < 12 && v.montmartre > 80 && v.belleville > 60, JSON.stringify([v.tour, v.montmartre, v.belleville]));
check('ponts : une trentaine sur la Seine, chacun bâti une seule fois, dont le pont d’Iéna, le Pont-Neuf sur ses deux bras et ceux du petit bras (Saint-Michel, Petit-Pont, pont au Double, Archevêché) ; pas le pont Alexandre-III (1900) ni l’allée des Cygnes', v.ponts.length >= 28 && v.ponts.length <= 40 && v.ponts.some((n) => /I.na/.test(n)) && v.ponts.filter((n) => /Neuf/.test(n)).length === 2 && ['Saint-Michel', 'petit', 'double', 'Archev'].every((m) => v.ponts.filter((n) => new RegExp(m, 'i').test(n)).length === 1) && !v.ponts.some((n) => /Alexandre|Mirabeau|Cygnes/.test(n)), `${v.ponts.length} ponts`);
check('ponts : chacun va d’une rive à l’autre (les deux culées sur la terre ferme, le milieu au-dessus de l’eau) et sans doublon', v.rives.eau === 0 && v.rives.sec === 0 && v.rives.proches === 0, JSON.stringify(v.rives));
check('quais : des murs de pierre tout le long de la Seine dans Paris, le sol au niveau du quai jusqu’au bord (plus de berges en pente)', v.quais > 6000 && v.bord > 4, JSON.stringify([v.quais, v.bord]));
check('voirie : la carte de distance distingue la rue (place de l’Opéra) de l’îlot, du fleuve et de l’Exposition', v.rue.w >= 2048 && v.rue.D === 20 && v.rue.place > 160 && v.rue.ilot < 100 && v.rue.seine < 100 && v.rue.expo < 100, JSON.stringify(v.rue));
const al = await page.evaluate(() => { const a = window.__app, A = a.v89.alignements, T = a.terrain, E = A.echantillon, M = a.monuments.Arc, L = a.voirie.large, C = a.monde.cadre, larg = (x, z) => L.data[Math.floor(((z - C.z0) / (C.z1 - C.z0)) * L.h) * L.w + Math.floor(((x - C.x0) / (C.x1 - C.x0)) * L.w)];
  return { n: A.n, tris: Math.round(A.tris), dalles: A.meshes.length, e: E.length, eau: E.filter((p) => T.wetAt(p[0], p[1]) > 0.05).length, bati: E.filter((p) => a.footAt(p[0], p[1])).length, grandes: E.filter((p) => /^(Boulevard|Avenue|Cours|Quai)/.test(a.streetAt(p[0], p[1], 45) || '')).length, arc: Math.round(Math.min(...E.map((p) => Math.hypot(p[0] - M.x, p[1] - M.z)))), vendome: Math.round(Math.min(...A.tous().map((p) => Math.hypot(p[0] - a.monuments.Vendome.x, p[1] - a.monuments.Vendome.z)))), colonne: !!a.footAt(a.monuments.Vendome.x, a.monuments.Vendome.z) && a.foot.filter((f) => f.top > a.monuments.Vendome.top - 12 && Math.hypot(f.ring[0][0] - a.monuments.Vendome.x, f.ring[0][1] - a.monuments.Vendome.z) < 40).length, opera: larg(-1310, -1990), lw: L.w === Math.ceil(a.voirie.w / 4) }; });
check('arbres d’alignement : des dizaines de milliers, sur les boulevards, les avenues et les quais ; aucun dans l’eau ni dans un bâtiment, aucun au pied de l’Arc de triomphe', al.n > 20000 && al.n < 60000 && al.e > 400 && al.eau === 0 && al.bati === 0 && al.grandes > 0.5 * al.e && al.arc > 30 && al.tris < 1.8e6, JSON.stringify(al));
check('place Vendôme : aucun arbre à moins de 90 m de la colonne, et une seule colonne (celle des données est écartée)', al.vendome > 90 && al.colonne === 1, JSON.stringify([al.vendome, al.colonne]));
check('trottoirs : leur largeur suit celle de la voie (carte des demi-largeurs, large devant l’Opéra)', al.lw && al.opera > 200, JSON.stringify([al.lw, al.opera]));
check('cadre : tout Paris dans l’enceinte de Thiers (plus de 12 km d’ouest en est)', v.cadre.x1 - v.cadre.x0 > 12000 && v.cadre.z1 - v.cadre.z0 > 9000, JSON.stringify(v.cadre));
check('jardins et passants', v.arbres > 5000 && v.passants > 1000 && v.nav > 1e6, JSON.stringify([v.arbres, v.passants]));

// ---------- chemins de fer et gares
const fe = await page.evaluate(() => { const a = window.__app, V = a.v89, F = V.fer, T = a.terrain, M = a.monuments, E = F.echantillon, A = V.alignements;
  const G = ['GareNord', 'GareEst', 'GareLazare', 'GareLyon', 'GareOrleans', 'GareMontparnasse', 'GareBastille', 'GareSceaux', 'GareChampDeMars'];
  const plan = a.plan.wide.getContext('2d', { willReadFrequently: true }), R = a.plan.rectWide, px = (x, z) => [...plan.getImageData(Math.round(((x - R.x) / R.w) * a.plan.wide.width), Math.round(((z - R.z) / R.h) * a.plan.wide.height), 1, 1).data].slice(0, 3);
  return { n: F.n, km: Math.round(F.km), tris: F.tris, viaduc: F.viaduc, surEau: F.surEau, noyes: F.noyes, statuts: F.statuts, e: E.length,
    sousSol: E.filter((p) => p[1] < T.land(p[0], p[2]) + 0.2).length, daumesnil: E.filter((p) => p[3] > 6 && p[0] > 1500 && p[0] < 2600 && p[2] > 300).length, auteuil: E.filter((p) => p[3] > 6 && p[0] < -5800).length,
    lignes: { ceinture: F.pres(-218, -4932, 25), auteuil: F.pres(-5648, -1348, 25), vincennes: F.pres(3050, 1254, 25), montparnasse: F.pres(-2085, 1196, 25), champDeMars: F.pres(-4418, -316, 25), sceaux: F.pres(-1064, 2722, 60), nord: F.pres(480, -3600, 60), lyon: F.pres(2200, 1350, 80) },
    ecartees: { metro6: F.pres(-3905, 361, 40), metro2: F.pres(1437, -2963, 40), rouelle: F.pres(-5080, -93, 40), belleville: F.pres(2650, -2500, 60), invalides: F.pres(-2760, -1040, 60) },
    gares: G.map((k) => (M[k] ? Math.round(M[k].top - T.height(M[k].x, M[k].z)) : -1)), murs: G.map((k) => !!(M[k] && a.footAt(M[k].x, M[k].z))), reels: G.filter((k) => M[k] && (a.footAt(M[k].x, M[k].z) || {}).reel).length,
    quai: G.map((k) => (M[k] ? F.pres(M[k].butoirs[0] + M[k].axe[0] * 60, M[k].butoirs[1] + M[k].axe[1] * 60, 30) : false)),
    arbres: A.tous().filter((p) => F.pres(p[0], p[1], 2.2)).length, viaducs: a.foot.filter((f) => f.fer).length, cour: px(430, -3150), meshes: a.batiMeshes.length }; });
check('voies ferrées : près de six cents kilomètres de voies posées sur le sol, aucune sous terre ni sous l’eau', fe.n > 4000 && fe.km > 500 && fe.km < 650 && fe.tris < 260000 && fe.e > 500 && fe.sousSol === 0 && fe.noyes === 0, JSON.stringify([fe.n, fe.km, fe.tris, fe.sousSol, fe.noyes]));
check('voies ferrées : chaque voie dit d’où vient son tracé — voies d’aujourd’hui, lignes restituées, lignes évoquées', fe.statuts.a > 400 && fe.statuts.r > 2 && fe.statuts.e > 20 && fe.statuts.e < 60, JSON.stringify(fe.statuts));
check('lignes de 1889 : Petite Ceinture, ligne d’Auteuil, ligne de Vincennes, arrivée à l’ancienne gare Montparnasse, embranchement du Champ-de-Mars, ligne de Sceaux, grandes lignes', Object.values(fe.lignes).every(Boolean), JSON.stringify(fe.lignes));
check('lignes écartées : ni le métro aérien, ni le pont Rouelle (1900), ni la ligne des Invalides ; rien dans le souterrain de Belleville', Object.values(fe.ecartees).every((v) => !v), JSON.stringify(fe.ecartees));
check('viaducs : la ligne de Vincennes le long de l’avenue Daumesnil et le viaduc d’Auteuil portent leurs voies en hauteur, on ne les traverse pas à pied ; les voies franchissent la Seine', fe.viaduc > 6000 && fe.viaduc < 16000 && fe.daumesnil >= 3 && fe.auteuil >= 2 && fe.viaducs > 300 && fe.surEau > 150, JSON.stringify([fe.viaduc, fe.daumesnil, fe.auteuil, fe.viaducs, fe.surEau]));
check('gares : neuf gares bâties au bout de leurs voies (Nord, Est, Saint-Lazare, Lyon, Orléans, Montparnasse, Bastille, Sceaux, Champ-de-Mars), à la place des volumes des données', fe.gares.every((h) => h > 14 && h < 60) && fe.murs.every(Boolean) && fe.quai.every(Boolean) && fe.reels === 0, JSON.stringify([fe.gares, fe.murs, fe.quai, fe.reels]));
check('emprises du chemin de fer : la cour de la gare du Nord n’est plus une pelouse, aucun arbre d’alignement sur une voie', fe.cour[1] - fe.cour[0] < 6 && fe.arbres === 0, JSON.stringify([fe.cour, fe.arbres]));

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

// ---------- silhouettes des monuments, costumes
const mo = await page.evaluate(() => { const a = window.__app, M = a.monuments, T = a.terrain, h = (m) => (m ? +(m.top - T.height(m.x, m.z)).toFixed(1) : -1), fl = a.landmarks.find((l) => l.nom === 'fleche');
  return { invalides: h(M.Invalides), pantheon: h(M.Pantheon), nd: h(M.NotreDame), fleche: fl ? +(fl.top - T.height(fl.x, fl.z)).toFixed(1) : -1, facade: M.NotreDame ? Math.round(Math.hypot(M.NotreDame.x + 49, M.NotreDame.z + 16)) : -1, sulpice: h(M.Sulpice), trinite: h(M.Trinite), opera: h(M.Opera), institut: h(M.Institut), augustin: h(M.Augustin),
    vendome: h(M.Vendome), juillet: h(M.Juillet), obelisque: h(M.Obelisque), arc: h(M.Arc), sc: h(M.SacreCoeur), halles: (M.Halles || {}).pavillons, dansPavillon: !!a.footAt(-328, -972), industrie: h(M.Industrie), dansPalais: !!a.footAt(-2677, -1522), petitPalais: !!a.footAt(-2572, -1440), sousArc: a.walkable((M.Arc || {}).x, (M.Arc || {}).z), dansPile: !!a.footAt(-3988, -2306), dansDome: !!a.footAt(-2736, -235) }; });
check('monuments : dôme des Invalides (107 m), Panthéon (83 m), tours (69 m) et flèche (96 m) de Notre-Dame, à la façade ouest', mo.invalides === 107 && mo.pantheon === 83 && Math.abs(mo.nd - 69) < 1 && mo.fleche === 96 && mo.facade > 40 && mo.facade < 75, JSON.stringify(mo));
check('monuments : Saint-Sulpice, la Trinité, l’Opéra, l’Institut, Saint-Augustin, les colonnes et l’obélisque', mo.sulpice === 73 && mo.trinite === 65 && mo.opera === 56 && mo.institut === 46 && mo.augustin === 80 && mo.vendome === 44 && mo.juillet === 50 && Math.abs(mo.obelisque - 27.6) < 0.2, JSON.stringify(mo));
check('Arc de triomphe : 50 m, on passe sous l’arche mais pas à travers les piles ; Sacré-Cœur en chantier, sans dôme', mo.arc > 55 && mo.arc < 60 && mo.sousArc && mo.dansPile && mo.sc > 40 && mo.sc < 60, JSON.stringify([mo.arc, mo.sousArc, mo.dansPile, mo.sc]));
check('Halles : dix pavillons sur leurs îlots de 1900 ; palais de l’Industrie le long des Champs-Élysées, le Petit Palais (1900) écarté', mo.halles === 10 && mo.dansPavillon && mo.industrie > 40 && mo.industrie < 50 && mo.dansPalais && !mo.petitPalais, JSON.stringify([mo.halles, mo.dansPavillon, mo.industrie, mo.dansPalais, mo.petitPalais]));
// ---------- édifices publics complétés
const ed = await page.evaluate(() => { const a = window.__app, M = a.monuments, T = a.terrain, h = (m) => (m ? +(m.top - T.height(m.x, m.z)).toFixed(1) : -1);
  const F = (u, v) => [-115 + 0.398 * u + 0.917 * v, -186 - 0.917 * u + 0.398 * v], pav = F(-42, 40), cour = F(-20, 0), courL = F(-24, 40);      // repère de l'Hôtel-Dieu : u vers le quai, v vers la rue d'Arcole
  return { hd: h(M.HotelDieu), pav: !!a.footAt(pav[0], pav[1]), cour: a.walkable(cour[0], cour[1]), courL: a.walkable(courL[0], courL[1]),
    hdv: h(M.HotelDeVille), sj: h(M.TourSaintJacques), sjPied: !!a.footAt(-106, -556), sc: h(M.SainteChapelle), horloge: h(M.Horloge), clotilde: h(M.Clotilde), vdg: h(M.ValDeGrace), sorb: h(M.Sorbonne), paul: h(M.SaintPaul),
    psd: h(M.PorteSaintDenis), psm: h(M.PorteSaintMartin), sousPorte: a.walkable(M.PorteSaintDenis.x, M.PorteSaintDenis.z) && a.walkable(M.PorteSaintMartin.x, M.PorteSaintMartin.z) }; });
check('Hôtel-Dieu : pavillons de malades autour d’une cour-jardin, sur son îlot de 1900 ; les maisons de l’atlas de Vasserot en sont écartées (cours libres)', ed.hd > 25 && ed.pav && ed.cour && ed.courL, JSON.stringify(ed));
check('silhouettes : Hôtel de Ville, tour Saint-Jacques (52 m), flèche de la Sainte-Chapelle, tour de l’Horloge, flèches de Sainte-Clotilde (69 m), dômes du Val-de-Grâce, de la Sorbonne et de Saint-Paul', ed.hdv > 45 && ed.sj === 52 && ed.sjPied && ed.sc === 75 && ed.horloge === 52 && ed.clotilde === 69 && ed.vdg === 41.5 && ed.sorb === 42 && ed.paul === 58.5, JSON.stringify(ed));
check('portes Saint-Denis et Saint-Martin : au milieu des boulevards, on passe sous l’arche', ed.psd === 24.6 && ed.psm === 18 && ed.sousPorte, JSON.stringify([ed.psd, ed.psm, ed.sousPorte]));

// ---------- ports bas
const po = await page.evaluate(() => { const a = window.__app, T = a.terrain, R = a.v89.rives, S = a.stats.ports, N = T.niveauBas;
  let n = 0, bas = 0, haut = 0, sec = 0, mur = 0;
  for (let i = 0; i < R.bandes.length; i += 23) { const b = R.bandes[i], P = (k) => [(b.P[0] + b.Q[0]) / 2 + ((b.mP[0] + b.mQ[0]) / 2) * k, (b.P[1] + b.Q[1]) / 2 + ((b.mP[1] + b.mQ[1]) / 2) * k], w = (b.w0 + b.w1) / 2, m = P(w / 2), d = P(w + 5), r = P(w + 0.3);
    n++; if (Math.abs(T.height(m[0], m[1]) - N) < 0.01 && a.walkable(m[0], m[1])) bas++; if (T.height(d[0], d[1]) > N + 1.5) haut++; if (T.wetAt(m[0], m[1]) < 0.5) sec++; if (a.footAt(r[0], r[1])) mur++; }
  const nommes = [[-1219, -753], [212, 228], [123, -259], [473, 360], [-2440, -1125], [-1150, -588], [777, 292], [2513, 2431]].filter((p) => T.estBas(p[0], p[1])).length;
  return { S, n, bas, haut, sec, mur, nommes, ponts: a.v89.ponts.filter((p) => T.estBas(p.a[0], p.a[1]) || T.estBas(p.b[0], p.b[1])).length, niveau: N }; });
check('ports bas : une quinzaine de kilomètres le long de la Seine, deux mètres au-dessus de l’eau, au pied du mur du quai haut (on n’y passe pas à travers le mur)', po.S.km > 10 && po.S.km < 25 && po.n > 100 && po.bas === po.n && po.sec === po.n && po.haut > 0.9 * po.n && po.mur > 0.9 * po.n, JSON.stringify(po));
check('ports bas : ceux que nomme la base de 1900 (Saint-Nicolas, la Tournelle, l’Hôtel de Ville, Saint-Bernard, les Invalides, Malaquais, les Célestins, Bercy) ; les ponts vont d’un quai haut à l’autre', po.nommes >= 7 && po.ponts === 0, JSON.stringify([po.nommes, po.ponts]));
const co = await page.evaluate(() => { const a = window.__app, P = a.people, cv = P.atlas.canvas, k = cv.width / 2048, x = cv.getContext('2d', { willReadFrequently: true }), px = (col, row, dy) => [...x.getImageData(Math.round((col * 256 + 60) * k), Math.round((512 + row * 640 + dy) * k), 1, 1).data].slice(0, 3);
  let i = 0; const r = () => ((i += 0.37) % 1), F = a.monde.figures(true);
  return { kepi: px(7, 0, 20), haut: px(1, 0, 20), canotier: px(5, 0, 20), garance: px(7, 0, 600), bonnet: px(1, 1, 20), soldat: F.outfit(r, 'man', 'guard'), soeur: F.outfit(r, 'robe', 'monk'), meme: P.outfit === a.monde.figures(true).outfit || typeof P.outfit === 'function' }; });
check('costumes de 1889 : képi et pantalon garance du fantassin, haut-de-forme noir, canotier de paille, bonnet blanc', co.kepi[0] > 140 && co.kepi[1] < 80 && co.garance[0] > 140 && co.garance[1] < 80 && co.haut[0] < 70 && co.haut[2] < 70 && co.canotier[0] > 180 && co.canotier[2] < 180 && co.bonnet[0] > 200 && co.bonnet[2] > 190, JSON.stringify(co));
check('costumes : le fantassin en capote, la sœur de charité en cornette', co.soldat.v[0] === 7 && co.soldat.col[2] > co.soldat.col[0] && co.soeur.v[0] === 5 && co.soeur.v[1] === 1 && co.soeur.v[2] === 7, JSON.stringify([co.soldat, co.soeur]));

// ---------- calque « origine du bâti »
const ca = await page.evaluate(() => { const a = window.__app, b = document.getElementById('btn-calque'), S = a.statuts, $ = (id) => document.getElementById(id);
  const lire = [S.lire(-15, -1), S.lire(145, -381), S.lire(-113, -204)];
  a.setView([-420, 700, 900], [-80, 20, -80]); a.rig.cur = { ...a.rig.goal }; a.rig.update(0);
  const px = () => { a.renderNow(); const gl = a.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, d = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, d); let vert = 0, rose = 0; for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], bl = d[i + 2]; if (g > r + 25 && g > bl + 12) vert++; if (r > g + 45 && bl > g + 8) rose++; } return [vert, rose]; };
  const avant = px(); b.click(); const on = S.uniforms.uStatut.value, leg = !$('legend').hidden, items = document.querySelectorAll('#legend-list li').length, apres = px();
  document.querySelector('#legend [data-close="legend"]').click();
  return { lire, compte: S.compte, avant, apres, on, leg, items, off: S.uniforms.uStatut.value, presse: b.getAttribute('aria-pressed'), cache: $('legend').hidden }; });
check('calque « origine du bâti » : chaque maison teintée selon ce qui la justifie (réelle, probable, disparue, évoquée), légende à quatre entrées ; l’Hôtel-Dieu, modelé à part, ne l’est pas', ca.on === 1 && ca.leg && ca.items === 4 && ca.off === 0 && ca.presse === 'false' && ca.cache && ca.lire[0] === 1 && ca.lire[1] === 2 && ca.lire[2] === 0 && ca.compte[1] > 35000 && ca.compte[2] > 5000 && ca.compte[3] > 3000 && ca.compte[4] > 20000 && ca.apres[0] > ca.avant[0] + 2000 && ca.apres[1] > ca.avant[1] + 500, JSON.stringify(ca));

// ---------- la vie : trains, bateaux, souches de cheminée
const vie = await page.evaluate(() => { const a = window.__app, V = a.v89, T = a.terrain, F = V.fer;
  const t0 = V.trains.etat(), b0 = V.bateaux.etat(), ecart = t0.map(() => 0); for (let i = 0; i < 40; i++) { a.emit('frame', 0.25); V.trains.etat().forEach((p, k) => { ecart[k] = Math.max(ecart[k], Math.hypot(p[0] - t0[k][0], p[2] - t0[k][2])); }); } const t1 = V.trains.etat(), b1 = V.bateaux.etat();      // un train qui touche le bout de sa ligne repart en arrière : on mesure son plus grand écart
  const bouge = ecart.filter((d) => d > 20).length, surVoie = t1.filter((p) => F.pres(p[0], p[2], 6)).length, sousSol = t1.filter((p) => p[1] < T.land(p[0], p[2]) - 0.2).length;
  const vapeursBougent = b1.filter((p, i) => Math.hypot(p[0] - b0[i][0], p[1] - b0[i][1]) > 10).length, dansLeau = b1.filter((p) => T.wetAt(p[0], p[1]) > 0.9).length;
  a.setView([-200, 120, 300], [-60, 20, -60]); a.rig.cur = { ...a.rig.goal }; a.rig.update(0); const pres = a.souches.montrer(a.camera.position);
  a.setView([0, 4000, 4000], [0, 0, 0]); a.rig.cur = { ...a.rig.goal }; a.rig.update(0); const loin = a.souches.montrer(a.camera.position);
  return { trains: V.trains.n, parcours: V.trains.parcours.slice(0, 4), bouge, surVoie, sousSol, peniches: V.bateaux.peniches, vapeurs: V.bateaux.vapeurs, vapeursBougent, dansLeau, souches: a.stats.souches, pres, loin }; });
check('la vie : dix-huit trains roulent sur les voies, des péniches sont amarrées aux ports bas, des vapeurs remontent et descendent la Seine', vie.trains >= 12 && vie.bouge === vie.trains && vie.surVoie === vie.trains && vie.sousSol === 0 && vie.peniches > 60 && vie.vapeurs >= 6 && vie.vapeursBougent === vie.vapeurs && vie.dansLeau === vie.vapeurs, JSON.stringify(vie));
check('souches de cheminée : sur les combles brisés, montrées près de la caméra seulement', vie.souches > 40000 && vie.pres > 0 && vie.loin === 0, JSON.stringify([vie.souches, vie.pres, vie.loin]));

// ---------- les passants, dans toute la ville : hors du quartier de l'Exposition, la trame est lue à la demande
const pp = await page.evaluate(() => { const a = window.__app, T = a.terrain, P = a.people, R = a.navRect;
  const voir = (x, z, dist) => { a.rig.goal = { x, z, dist, az: 0, el: 1 }; a.rig.cur = { ...a.rig.goal }; a.rig.target.x = x; a.rig.target.z = z;
    for (let i = 0; i < 80; i++) { a.rig.update(0.1); a.time += 0.1; a.emit('frame', 0.1); }
    const o = { n: 0, dansTrame: 0, bati: 0, eau: 0, pont: 0, horsVoie: 0, marche: 0, attelages: 0, jardin: 0, attelesAuJardin: 0, chemin: 0 };
    for (const p of P.pools) for (let i = 0; i < Math.min(p.active, p.n); i++) { if (!p.ok[i]) continue; const px = p.x[i], pz = p.z[i], roule = p.kind === 'rider' || p.kind === 'cart', g = P.genre(px, pz); o.n++;
      if (px > R.x && px < R.x + R.w && pz > R.z && pz < R.z + R.h) o.dansTrame++; if (a.footAt(px, pz)) o.bati++; if (!g) o.horsVoie++; if (g === 2) o.chemin++;
      if (T.wetAt(px, pz) > 0.5) { if (a.deck.has(a.deckKey(px, pz))) o.pont++; else if (T.wetAt(px, pz) > 0.6) o.eau++; }
      if (p.st[i] <= 0) o.marche++; if (roule) o.attelages++; if (g === 3) { o.jardin++; if (roule) o.attelesAuJardin++; } }
    return o; };
  const o = { opera: voir(-1310, -1990, 420), belleville: voir(3300, -2300, 420), pontNeuf: voir(-560, -330, 300), tuileries: voir(-1705, -1185, 330) };
  a.setView([0, 4000, 4000], [0, 0, 0]); a.rig.cur = { ...a.rig.goal }; a.rig.update(0);
  return o; });
check('passants, hors du quartier de l’Exposition (place de l’Opéra, Belleville) : la foule est là aussi, avec ses cavaliers et ses voitures à cheval, dans la rue ; ni dans les bâtiments, ni dans l’eau',
  [pp.opera, pp.belleville].every((o) => o.n > 300 && o.dansTrame === 0 && o.bati === 0 && o.eau === 0 && o.horsVoie === 0 && o.marche > 0.6 * o.n && o.attelages > 5), JSON.stringify([pp.opera, pp.belleville]));
check('passants : ils franchissent le Pont-Neuf ; au jardin des Tuileries, des promeneurs, mais ni cavaliers ni voitures', pp.pontNeuf.n > 300 && pp.pontNeuf.pont > 3 && pp.pontNeuf.eau === 0 && pp.pontNeuf.bati === 0 && pp.tuileries.jardin > 100 && pp.tuileries.attelesAuJardin === 0 && pp.tuileries.attelages > 3 && pp.tuileries.eau === 0, JSON.stringify([pp.pontNeuf, pp.tuileries]));

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
check('repères : la tour, les palais de l’Exposition, le Trocadéro, l’enceinte, les gares et les monuments de la ville', lx.n >= 53 && lx.hors === 0 && lx.cats >= 4 && ['Gare Saint-Lazare', 'Gare du Nord', 'Gare de l’Est', 'Gare de Lyon', 'Gare d’Orléans', 'Gare Montparnasse', 'Gare de la Bastille', 'Gare de Sceaux', 'Gare du Champ-de-Mars', 'Petite Ceinture', 'Viaduc d’Auteuil', 'Viaduc de la ligne de Vincennes', 'Tour de 300 mètres', 'Galerie des machines', 'Dôme central', 'Palais du Trocadéro', 'Pont d’Iéna', 'Enceinte de Thiers', 'Notre-Dame', 'Dôme des Invalides', 'Arc de triomphe', 'Panthéon', 'Sacré-Cœur, en chantier', 'Colonne Vendôme', 'Halles centrales', 'Palais de l’Industrie', 'Hôtel-Dieu', 'Hôtel de Ville', 'Tour Saint-Jacques', 'Sainte-Clotilde', 'Porte Saint-Denis'].every((n) => lx.noms.includes(n)), `${lx.n} lieux`);
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
check('sources : APUR, base « Paris 1900 », atlas de Vasserot, IGN, voies ferrées ; ce qui est réel et ce qui est évoqué', src.vu && src.n === 6 && /Voies ferrées/.test(src.t) && /Chemins de fer/.test(src.t) && /Gares :/.test(src.t) && /Atelier parisien d’urbanisme/.test(src.t) && /Paris 1900/.test(src.t) && /Vasserot/.test(src.t) && /IGN/.test(src.t) && /Évoqué/.test(src.t) && /Pas encore modelé/.test(src.t), `${src.n} sources`);
await page.click('#sources [data-close="sources"]');
{ const og = await page.evaluate(() => (document.querySelector('meta[property="og:image"]') || {}).content || ''), { existsSync } = await import('node:fs');
  check('partage : l’image de la maquette (og:image, adresse absolue) est dans dist/og/', /^https:\/\/.+\/dist\/og\/1889\.jpg$/.test(og) && existsSync(join(root, 'dist/og/1889.jpg')), og); }

// ---------- parcours commenté : étapes, vol vers chaque lieu, lecture automatique, retour au survol
const vi = await page.evaluate(async () => { const a = window.__app, V = a.ui.visite, $ = (id) => document.getElementById(id), tic = (n) => { for (let i = 0; i < n; i++) { a.rig.update(0.05); a.emit('frame', 0.05); } };
  $('mode-tour').click(); const t0 = { panneau: !$('tour').hidden, titre: $('tour-title').textContent, compte: $('tour-count').textContent, texte: $('tour-text').textContent.length, mode: $('mode-tour').getAttribute('aria-pressed'), points: document.querySelectorAll('#tour-dots button').length };
  $('tour-next').click(); tic(80); const e1 = V.etat(), p = a.ui.places.find((q) => q.name === e1.lieu), pres = p ? Math.round(Math.hypot(a.rig.cur.x - p.x, a.rig.cur.z - p.z)) : -1, fiche = !$('tour-card').hidden;
  for (let i = 0; i < 1500 && V.etat().k === e1.k; i++) tic(1); const e2 = V.etat();
  $('tour-stop').click(); const fin = { actif: V.etat().actif, panneau: !$('tour').hidden, survol: $('mode-fly').getAttribute('aria-pressed') };
  return { t0, e1, pres, fiche, e2, fin, manquants: V.manquants }; });
check('parcours commenté « Paris en 1889 » : 14 étapes, la vue se rend à chaque lieu, l’étape suivante vient seule, « Terminer » rend le survol', vi.t0.panneau && vi.t0.mode === 'true' && vi.t0.titre === 'Paris en 1889' && vi.t0.compte === '1 / 14' && vi.t0.points === 14 && vi.t0.texte > 80 && vi.e1.k === 1 && vi.pres >= 0 && vi.pres < 30 && vi.fiche && vi.e2.k === 2 && !vi.fin.actif && !vi.fin.panneau && vi.fin.survol === 'true' && vi.manquants.length === 0, JSON.stringify(vi));

// ---------- heure, marche, frise
const nuit = await page.evaluate(() => { const a = window.__app; a.setHour(22); const n = a.materials.facade.emissiveIntensity; a.setHour(10.5); return [n, a.materials.facade.emissiveIntensity]; });
check('heure : la nuit, les fenêtres s’éclairent', nuit[0] > 0.5 && nuit[1] < 0.05, JSON.stringify(nuit));
await page.click('#mode-walk'); await frames(6);
const marche = await page.evaluate(() => { const a = window.__app, w = a.rig.walk || {}; return { mode: a.rig.mode, x: w.x, z: w.z, ok: a.rig.mode === 'walk' ? a.walkable(w.x, w.z) : false, rue: a.streetAt(-3930, -700, 80) }; });
check('à pied : on marche sur un sol libre, les rues ont leur nom de 1900', marche.mode === 'walk' && marche.ok && typeof marche.rue === 'string' && marche.rue.length > 3, JSON.stringify(marche));
await page.click('#mode-fly'); await frames(3);
await page.click('#btn-epoch');
const fr = await page.evaluate(() => { const l = [...document.querySelectorAll('#frise-jalons a')]; return { ouvert: !document.getElementById('frise').hidden, noms: l.map((a) => a.textContent).join(' '), liens: l.map((a) => a.getAttribute('href')), ici: (l.find((a) => a.getAttribute('aria-current') === 'page') || {}).textContent, site: document.getElementById('brand-site').textContent, titre: document.title }; });
check('frise des dates : 1889 en cours ; Lutèce, 1380, 1789 et 1900 mènent aux autres maquettes', fr.ouvert && fr.noms === 'Lutèce 1300 1380 1553 1652 1741 1789 1836 1889 1900 1937' && fr.ici === '1889' && fr.liens[9] === 'index.html#m=1900' && fr.liens[0] === 'index.html#m=lutece' && fr.liens[2] === 'index.html' && fr.liens[6] === 'index.html#m=1789' && fr.liens[8] === null && fr.site === 'Paris à travers le temps' && /^Paris à travers le temps — Paris 1889/.test(fr.titre), JSON.stringify(fr));

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
