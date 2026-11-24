// Test fonctionnel de la page « Paris 1937 » (le test lit l'image : l'avertissement du pilote sur cette lecture est ignoré) : charge la page, vérifie la ville recomposée à
// l'été 1937 (bâti, Seine, ponts, voirie), les chemins de fer et les gares (gare de l'Est doublée, gare Montparnasse de 1852, gare de la Bastille), la tour en jaune brun, le
// Champ-de-Mars en jardin, le palais de Chaillot, les grands ensembles disparus depuis (Halle aux vins, entrepôts de Bercy, abattoirs, usines Citroën, gare des Gobelins, usine à
// gaz, Petite Roquette, Vélodrome d'Hiver), les quartiers refaits depuis, les monuments (Sacré-Cœur et son campanile), le calque, les repères, la visite, la marche à pied, l'heure,
// la frise, les sources, le téléphone et l'absence d'erreurs. Le moteur est celui de la page « Paris 1889 » (tools/test1889.mjs en vérifie le reste).
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
const URL = 'file://' + join(root, 'dist/1937.html');
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

check('la page démarre', await page.evaluate(() => window.__ready === true && !window.__failed), String(await page.evaluate(() => window.__failed || '')));
check('les données sont celles de 1937 ; pas de curseur de chantier', await page.evaluate(() => window.__app.v89 && !document.getElementById('chantier') && document.querySelector('#brand h1').textContent.trim() === 'Paris 1937'));
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
check('bâti : plus de cent dix mille bâtiments dressés', v.bati > 105000 && v.bati < 130000 && v.foot >= v.bati - 100, `${v.bati} bâtiments`);
check('bâti : volumes légers (moins de 4,6 millions de triangles, moins de 800 maillages)', v.tris > 2e6 && v.tris < 4.6e6 && v.maillages < 800, `${v.tris} triangles, ${v.maillages} maillages`);
check('Seine : continue devant la tour et au centre, en eau sous chaque pont ; à sec sur les rives', v.seine.slice(0, 4).every((w) => w > 0.9) && v.seine[4] > 0.5 && v.sec.every((w) => w < 0.05), JSON.stringify([v.seine, v.sec]));
check('relief : le Champ-de-Mars près du fleuve, Montmartre et Belleville sur leurs collines', v.tour > 3 && v.tour < 12 && v.montmartre > 80 && v.belleville > 60, JSON.stringify([v.tour, v.montmartre, v.belleville]));
check('ponts : une trentaine sur la Seine, chacun bâti une seule fois, dont le pont d’Iéna, le Pont-Neuf sur ses deux bras, ceux du petit bras, le pont Mirabeau et le pont Alexandre-III ; pas l’allée des Cygnes', v.ponts.length >= 28 && v.ponts.length <= 42 && v.ponts.some((n) => /I.na/.test(n)) && v.ponts.filter((n) => /Neuf/.test(n)).length === 2 && ['Saint-Michel', 'petit', 'double', 'Archev', 'Alexandre', 'Mirabeau'].every((m) => v.ponts.filter((n) => new RegExp(m, 'i').test(n)).length === 1) && !v.ponts.some((n) => /Cygnes/.test(n)), `${v.ponts.length} ponts : ${v.ponts.join(', ')}`);
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


// ---------- chemins de fer et gares de 1937
const fe = await page.evaluate(() => { const a = window.__app, V = a.v89, F = V.fer, T = a.terrain, M = a.monuments, E = F.echantillon, A = V.alignements;
  const G = ['GareNord', 'GareEst', 'GareLazare', 'GareOrleans', 'GareMontparnasse', 'GareBastille', 'GareSceaux'];
  const h = (m) => (m ? Math.round(m.top - T.height(m.x, m.z)) : -1);
  // gare de l'Est doublée en 1931 : un bâtiment de chaque côté de l'axe de la gare
  const est = M.GareEst, n = est ? [-est.axe[1], est.axe[0]] : [0, 0], cote = (s) => (est ? !!a.footAt(est.butoirs[0] + n[0] * s * 50 + est.axe[0] * 40, est.butoirs[1] + n[1] * s * 50 + est.axe[1] * 40) : false);
  return { n: F.n, km: Math.round(F.km), sousSol: E.filter((p) => p[1] < T.land(p[0], p[2]) + 0.2).length, noyes: F.noyes, statuts: F.statuts,
    lignes: { ceinture: F.pres(-218, -4932, 25), auteuil: F.pres(-5648, -1348, 25), vincennes: F.pres(3050, 1254, 25), montparnasse: F.pres(-2085, 1196, 25), sceaux: F.pres(-1064, 2722, 60), nord: F.pres(480, -3600, 60), lyon: F.pres(2200, 1350, 80), rouelle: F.pres(-4810, 62, 20) },
    gares: G.map((k) => h(M[k])), murs: G.map((k) => !!(M[k] && a.footAt(M[k].x, M[k].z))), est: [cote(-1), cote(1)], champDeMars: !!M.GareChampDeMars,
    lyon: { horloge: h(M.HorlogeLyon), orsay: M.GareOrsay ? a.statuts.lire(M.GareOrsay.x, M.GareOrsay.z) : -1 }, arbres: A.tous().filter((p) => F.pres(p[0], p[1], 2.2)).length }; });
check('voies ferrées : près de six cents kilomètres de voies posées sur le sol, aucune sous terre ni sous l’eau ; chaque voie dit d’où vient son tracé', fe.n > 4000 && fe.km > 500 && fe.km < 650 && fe.sousSol === 0 && fe.noyes === 0 && fe.statuts.a > 400 && fe.statuts.r > 2 && fe.statuts.e > 20, JSON.stringify([fe.n, fe.km, fe.sousSol, fe.noyes, fe.statuts]));
check('lignes de 1937 : Petite Ceinture (sans voyageurs, ses rails en place), ligne d’Auteuil, ligne de Vincennes, gare Montparnasse de 1852, ligne de Sceaux, grandes lignes, pont Rouelle', Object.values(fe.lignes).every(Boolean), JSON.stringify(fe.lignes));
check('gares : sept gares au bout de leurs voies, la gare de l’Est doublée (1931) de part et d’autre de son axe ; ni gare du Champ-de-Mars, ni embarcadère de 1855', fe.gares.every((h) => h > 14 && h < 60) && fe.murs.every(Boolean) && fe.est.every(Boolean) && !fe.champDeMars, JSON.stringify([fe.gares, fe.murs, fe.est]));
check('gare de Lyon : la tour de l’horloge (67 m) ; gare d’Orsay réelle', fe.lyon.horloge === 75 && fe.lyon.orsay === 1, JSON.stringify(fe.lyon));
check('emprises du chemin de fer : aucun arbre d’alignement sur une voie', fe.arbres === 0, String(fe.arbres));

// ---------- la tour, peinte en jaune brun ; le Champ-de-Mars en jardin ; ce que 1900 a laissé
const tr = await page.evaluate(() => { const a = window.__app, M = a.monuments, T = a.terrain, h = (m) => (m ? +(m.top - T.height(m.x, m.z)).toFixed(1) : -1);
  return { top: h(M.Tour), trocadero: !!M.Trocadero, machines: !!M.Machines, roue: !!M.GrandeRoue, grandPalais: h(M.GrandPalais), petitPalais: !!M.PetitPalais, alexandre: a.v89.ponts.filter((p) => /Alexandre/.test(p.nom)).length,
    champ: !a.footAt(-3700, -270) }; });
check('tour : trois cents mètres ; ni Trocadéro de 1878, ni Galerie des machines, ni Grande Roue ; le Grand Palais (mât à 60 m), le Petit Palais, le pont Alexandre-III', tr.top === 300 && !tr.trocadero && !tr.machines && !tr.roue && tr.grandPalais > 58 && tr.grandPalais < 70 && tr.petitPalais && tr.alexandre === 1 && tr.champ, JSON.stringify(tr));
const teinte = await page.evaluate(async () => { const a = window.__app; a.setHour(12); a.setView([-4420, 190, -970], [-4039, 185, -604]); a.rig.cur = { ...a.rig.goal }; a.rig.update(0);
  const lire = () => { a.renderNow(); const gl = a.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, d = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, d); return d; };
  const avec = lire(); const T = a.v89.chantier.tour; for (const m of T) m.visible = false; const sans = lire(); for (const m of T) m.visible = true;
  let brun = 0, rouge = 0, jaune = 0; for (let i = 0; i < avec.length; i += 4) { if (Math.abs(avec[i] - sans[i]) + Math.abs(avec[i + 1] - sans[i + 1]) + Math.abs(avec[i + 2] - sans[i + 2]) < 30) continue; const r = avec[i], g = avec[i + 1], b = avec[i + 2];
    if (r > g + 8 && g > b + 8 && !(r > 225 && g > 195)) brun++; if (r > g + 50 && g < 90) rouge++; if (r > 225 && g > 195) jaune++; }
  a.setHour(10.5); return { brun, rouge, jaune }; });
check('image : la tour en « jaune brun » (1907-1954), ni rouge de Venise ni jaune clair de 1899', teinte.brun > 3000 && teinte.rouge < teinte.brun / 10 && teinte.jaune < teinte.brun / 5, JSON.stringify(teinte));

// ---------- les grands ensembles disparus depuis 1937 (tools/disparus_1937.py, src/p1937/disparus.js)
const di = await page.evaluate(() => { const a = window.__app, M = a.monuments, T = a.terrain, S = a.statuts, h = (m) => (m ? +(m.top - T.height(m.x, m.z)).toFixed(1) : -1);
  const dans = (x0, z0, x1, z1) => { let n = 0; for (let x = x0; x <= x1; x += 12) for (let z = z0; z <= z1; z += 12) if (S.lire(x, z) === 3) n++; return n; };
  return { compte: S.compte[3], vins: dans(330, 560, 640, 800), bercy: dans(2200, 1800, 2700, 2250), abattoirs: dans(2600, -4850, 2900, -4450), citroen: dans(-5600, 1150, -5300, 1550), gobelins: dans(1040, 2870, 1230, 3100),
    gaz: (M.UsineGaz && a.landmarks.filter((l) => Math.hypot(l.x - 1270, l.z + 4755) < 5).length) || 0, gazPied: !!a.footAt(1316, -4815) && !!a.footAt(1181, -4609),
    roquette: h(M.PetiteRoquette), roquettePied: !!a.footAt(2482, -764 + 50) && !a.footAt(2482 + 25, -764 + 5), velhiv: h(M.VelHiv), velPied: !!a.footAt(-4481, -7),
    noms: ['HalleVins', 'Bercy', 'Abattoirs', 'Bestiaux', 'Vaugirard', 'Citroen', 'Gobelins'].filter((k) => !M[k]) }; });
check('disparus : halles, magasins et ateliers de la Halle aux vins, des entrepôts de Bercy, des abattoirs, des usines Citroën et de la gare des Gobelins, au statut « disparu »', di.compte > 500 && di.vins > 20 && di.bercy > 60 && di.abattoirs > 30 && di.citroen > 20 && di.gobelins > 5 && di.noms.length === 0, JSON.stringify(di));
check('disparus modelés à part : les gazomètres de La Villette, la Petite Roquette (hexagone, cour entre les ailes), le Vélodrome d’Hiver', di.gaz === 1 && di.gazPied && di.roquette > 30 && di.roquettePied && di.velhiv > 30 && di.velPied, JSON.stringify(di));
const rf = await page.evaluate(() => { const a = window.__app, S = a.statuts; let ev = 0, n = 0; for (let x = 950; x <= 1350; x += 10) for (let z = 2550; z <= 2850; z += 10) { n++; if (S.lire(x, z) === 4) ev++; } return { ev, n }; });
check('quartiers refaits depuis 1937 (Italie) : un faubourg serré évoqué, comme sur la photographie de 1949', rf.ev > 0.12 * rf.n, JSON.stringify(rf));

// ---------- silhouettes des monuments
const mo = await page.evaluate(() => { const a = window.__app, M = a.monuments, T = a.terrain, h = (m) => (m ? +(m.top - T.height(m.x, m.z)).toFixed(1) : -1), fl = a.landmarks.find((l) => l.nom === 'fleche');
  const campanile = a.landmarks.filter((l) => Math.hypot(l.x - M.SacreCoeur.x, l.z - (M.SacreCoeur.z - 62)) < 2).map((l) => +(l.top - T.height(l.x, l.z)).toFixed(1));
  return { invalides: h(M.Invalides), pantheon: h(M.Pantheon), nd: h(M.NotreDame), fleche: fl ? +(fl.top - T.height(fl.x, fl.z)).toFixed(1) : -1, opera: h(M.Opera), arc: h(M.Arc), sc: h(M.SacreCoeur), campanile, halles: (M.Halles || {}).pavillons, hd: h(M.HotelDieu), industrie: !!M.Industrie }; });
check('monuments : Invalides (107 m), Panthéon (83 m), Notre-Dame (69 et 96 m), l’Opéra, l’Arc ; ni palais de l’Industrie', mo.invalides === 107 && mo.pantheon === 83 && Math.abs(mo.nd - 69) < 1 && mo.fleche === 96 && mo.opera === 56 && mo.arc > 55 && mo.arc < 60 && !mo.industrie, JSON.stringify(mo));
check('Sacré-Cœur : le grand dôme (83 m) et le campanile achevé en 1912 (84 m) ; Halles : les dix pavillons de la photographie de 1949', Math.abs(mo.sc - 83) < 0.5 && mo.campanile.some((t) => Math.abs(t - 84) < 0.6) && mo.halles === 10 && mo.hd > 25, JSON.stringify([mo.sc, mo.campanile, mo.halles]));

// ---------- la vie : trains, bateaux
const vie = await page.evaluate(() => { const a = window.__app, V = a.v89, T = a.terrain, F = V.fer;
  const t0 = V.trains.etat(), ecart = t0.map(() => 0); for (let i = 0; i < 40; i++) { a.emit('frame', 0.25); V.trains.etat().forEach((p, k) => { ecart[k] = Math.max(ecart[k], Math.hypot(p[0] - t0[k][0], p[2] - t0[k][2])); }); }
  const t1 = V.trains.etat(); return { trains: V.trains.n, bouge: ecart.filter((d) => d > 20).length, surVoie: t1.filter((p) => F.pres(p[0], p[2], 6)).length, peniches: V.bateaux.peniches, vapeurs: V.bateaux.vapeurs }; });
check('la vie : des trains roulent sur les voies, des péniches aux ports bas, des vapeurs sur la Seine', vie.trains >= 12 && vie.bouge === vie.trains && vie.surVoie === vie.trains && vie.peniches > 40 && vie.vapeurs >= 6, JSON.stringify(vie));

// ---------- calque « origine du bâti »
const ca = await page.evaluate(() => { const a = window.__app, b = document.getElementById('btn-calque'), S = a.statuts, $ = (id) => document.getElementById(id);
  b.click(); const on = S.uniforms.uStatut.value, leg = !$('legend').hidden, items = [...document.querySelectorAll('#legend-list li')].map((l) => l.textContent + ' : ' + l.title);
  document.querySelector('#legend [data-close="legend"]').click();
  return { compte: S.compte, on, leg, items, off: S.uniforms.uStatut.value, gp: S.lire(-2760, -1452), orsay: S.lire(-1696, -791) }; });
check('calque « origine du bâti » : réelle (datée de 1937 ou d’avant), probable (1915-1939), disparue (relevée sur la photographie de 1949), évoquée', ca.on === 1 && ca.leg && ca.items.length === 4 && /1937 ou d’avant/.test(ca.items[0]) && /1915/.test(ca.items[1]) && /1949/.test(ca.items[2]) && ca.off === 0 && ca.gp === 1 && ca.orsay === 1 && ca.compte[1] > 60000 && ca.compte[3] > 500 && ca.compte[4] > 20000, JSON.stringify(ca));

// ---------- repères, fiche, sources
const lx = await page.evaluate(() => { const a = window.__app, P = a.ui.places; return { n: P.length, noms: P.map((p) => p.name), cats: [...new Set(P.map((p) => p.cat))].length, hors: P.filter((p) => p.x < a.monde.cadre.x0 || p.x > a.monde.cadre.x1 || p.z < a.monde.cadre.z0 || p.z > a.monde.cadre.z1).length }; });
const attendus = ['Tour Eiffel', 'Champ-de-Mars', 'Palais de Chaillot', 'Grand Palais', 'Petit Palais', 'Pont Alexandre-III', 'Halles centrales', 'Halle aux vins', 'Entrepôts de Bercy', 'Abattoirs de la Villette', 'Marché aux bestiaux de la Villette', 'Abattoirs de Vaugirard', 'Usines Citroën', 'Gare des Gobelins', 'Usine à gaz de La Villette', 'Petite Roquette', 'Vélodrome d’Hiver',
  'Gare Montparnasse', 'Gare de la Bastille', 'Gare de l’Est', 'Gare de Lyon', 'Gare d’Orsay', 'Gare d’Austerlitz', 'Petite Ceinture', 'Ceinture des HBM', 'Notre-Dame', 'Dôme des Invalides', 'Arc de triomphe', 'Sacré-Cœur', 'Opéra', 'Place de la Bastille'];
check('repères : la tour, Chaillot, les grands ensembles disparus, les gares, les monuments, la ceinture', lx.n >= 55 && lx.hors === 0 && lx.cats >= 5 && attendus.every((n) => lx.noms.includes(n)), `${lx.n} lieux ; manquent : ${attendus.filter((n) => !lx.noms.includes(n)).join(', ')}`);
await page.click('#btn-places');
await page.fill('#place-search', 'roquette');
const liste = await page.evaluate(() => [...document.querySelectorAll('#place-list button, #place-list li')].map((b) => b.textContent).filter((t) => /Petite Roquette/i.test(t)).length);
check('liste des lieux : la recherche trouve la Petite Roquette', liste >= 1, String(liste));
await page.evaluate(() => { const a = window.__app; a.ui.select(a.ui.byId.get('tour-eiffel'), false); }); await frames(2);
const fiche = await page.evaluate(() => { const c = document.getElementById('card'); return { vu: !c.hidden, texte: c.textContent.slice(0, 600) }; });
check('fiche : la tour, en jaune brun depuis 1907', fiche.vu && /Tour Eiffel/.test(fiche.texte) && /jaune brun/.test(fiche.texte), fiche.texte.slice(0, 90));
await page.evaluate(() => window.__app.ui.select(null));
await page.click('#btn-sources');
const src = await page.evaluate(() => { const d = document.getElementById('sources'); return { vu: !d.hidden, n: d.querySelectorAll('#sources-list li').length, t: d.textContent }; });
check('sources : APUR, base « Paris 1900 » corrigée, nomenclature des voies, IGN (relief, photographie de 1949), voies ferrées ; ce qui est réel, disparu, évoqué', src.vu && src.n === 6 && /Voies ferrées/.test(src.t) && /Atelier parisien d’urbanisme/.test(src.t) && /1949/.test(src.t) && /IGN/.test(src.t) && /Disparu/.test(src.t) && /Évoqué/.test(src.t) && /Pas encore modelé/.test(src.t) && !/Vasserot/.test(src.t) && !/1900 ou d’avant/.test(src.t), `${src.n} sources`);
await page.click('#sources [data-close="sources"]');
{ const og = await page.evaluate(() => (document.querySelector('meta[property="og:image"]') || {}).content || ''), { existsSync } = await import('node:fs');
  check('partage : l’image de la maquette (og:image, adresse absolue) est dans dist/og/', /^https:\/\/.+\/dist\/og\/1937\.jpg$/.test(og) && existsSync(join(root, 'dist/og/1937.jpg')), og); }

// ---------- parcours commenté
const vi = await page.evaluate(async () => { const a = window.__app, V = a.ui.visite, $ = (id) => document.getElementById(id), tic = (n) => { for (let i = 0; i < n; i++) { a.rig.update(0.05); a.emit('frame', 0.05); } };
  $('mode-tour').click(); const t0 = { panneau: !$('tour').hidden, titre: $('tour-title').textContent, compte: $('tour-count').textContent, texte: $('tour-text').textContent.length, mode: $('mode-tour').getAttribute('aria-pressed'), points: document.querySelectorAll('#tour-dots button').length };
  $('tour-next').click(); tic(80); const e1 = V.etat(), p = a.ui.places.find((q) => q.name === e1.lieu), pres = p ? Math.round(Math.hypot(a.rig.cur.x - p.x, a.rig.cur.z - p.z)) : -1, fiche = !$('tour-card').hidden;
  for (let i = 0; i < 1500 && V.etat().k === e1.k; i++) tic(1); const e2 = V.etat();
  $('tour-stop').click(); const fin = { actif: V.etat().actif, panneau: !$('tour').hidden, survol: $('mode-fly').getAttribute('aria-pressed') };
  return { t0, e1, pres, fiche, e2, fin, manquants: V.manquants }; });
check('parcours commenté « Paris en 1937 » : 16 étapes, chaque lieu existe, la vue s’y rend, l’étape suivante vient seule, « Terminer » rend le survol', vi.t0.panneau && vi.t0.mode === 'true' && vi.t0.titre === 'Paris en 1937' && vi.t0.compte === '1 / 16' && vi.t0.points === 16 && vi.t0.texte > 80 && vi.e1.k === 1 && vi.pres >= 0 && vi.pres < 30 && vi.fiche && vi.e2.k === 2 && !vi.fin.actif && !vi.fin.panneau && vi.fin.survol === 'true' && vi.manquants.length === 0, JSON.stringify(vi));

// ---------- heure, marche, frise
const nuit = await page.evaluate(() => { const a = window.__app; a.setHour(22); const n = a.materials.facade.emissiveIntensity; a.setHour(10.5); return [n, a.materials.facade.emissiveIntensity]; });
check('heure : la nuit, les fenêtres s’éclairent', nuit[0] > 0.5 && nuit[1] < 0.05, JSON.stringify(nuit));
await page.click('#mode-walk'); await frames(6);
const marche = await page.evaluate(() => { const a = window.__app, w = a.rig.walk || {}; return { mode: a.rig.mode, x: w.x, z: w.z, ok: a.rig.mode === 'walk' ? a.walkable(w.x, w.z) : false, rue: a.streetAt(-3930, -700, 80), foch: a.streetAt(-4300, -2350, 120) }; });
check('à pied : on marche sur un sol libre, les rues ont leur nom de 1937', marche.mode === 'walk' && marche.ok && typeof marche.rue === 'string' && marche.rue.length > 3, JSON.stringify(marche));
await page.click('#mode-fly'); await frames(3);
await page.click('#btn-epoch');
const fr = await page.evaluate(() => { const l = [...document.querySelectorAll('#frise-jalons a')]; return { ouvert: !document.getElementById('frise').hidden, noms: l.map((a) => a.textContent).join(' '), liens: l.map((a) => a.getAttribute('href')), ici: (l.find((a) => a.getAttribute('aria-current') === 'page') || {}).textContent, site: document.getElementById('brand-site').textContent, titre: document.title, dock: document.getElementById('epoch-label').textContent }; });
check('frise des dates : 1937 en cours ; Lutèce, 1380, 1789, 1889 et 1900 mènent aux autres maquettes', fr.ouvert && fr.noms === 'Lutèce 1300 1380 1553 1652 1741 1789 1836 1889 1900 1937' && fr.ici === '1937' && fr.dock === '1937' && fr.liens[0] === 'index.html#m=lutece' && fr.liens[2] === 'index.html' && fr.liens[6] === 'index.html#m=1789' && fr.liens[8] === 'index.html#m=1889' && fr.liens[9] === 'index.html#m=1900' && fr.liens[10] === null && fr.site === 'Paris à travers le temps' && /^Paris à travers le temps — Paris 1937/.test(fr.titre), JSON.stringify(fr));
await page.click('#frise [data-close="frise"]');

// ---------- téléphone : version allégée
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p2 = await ctx.newPage(); watch(p2); p2.setDefaultTimeout(120000);
  await p2.goto(URL + '#shot'); await p2.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 300000 });
  const m = await p2.evaluate(() => { const a = window.__app; return { rate: window.__failed || '', mobile: a.mobile, tris: a.stats.tris, bati: a.stats.bati }; });
  check('téléphone : la page démarre en version allégée (toits plats)', !m.rate && m.mobile && m.bati > 100000 && m.tris < v.tris * 0.8, JSON.stringify(m));
  await ctx.close(); }

// ---------- adresse courte et lien vers une autre maquette
{ const p2 = await browser.newPage({ viewport: { width: 900, height: 600 } });
  await p2.goto('file://' + join(root, '1937.html') + '?x=1#c=-3900,-520,900');
  const bon = await p2.waitForURL(/dist\/index\.html\?x=1#m=1937&c=-3900,-520,900/, { timeout: 60000 }).then(() => true).catch(() => false);
  check('adresse courte : 1937.html, à la racine du site, mène à la page d’accueil sur Paris 1937 en gardant le lien partagé', bon, p2.url().slice(-60));
  await p2.close(); }
const nav = page.waitForURL(/index\.html#m=1900&/, { timeout: 60000 }).then(() => true).catch(() => false);
await page.click('#btn-1900');
check('bouton « Paris 1900 » : la page, ouverte seule, mène à la maquette de 1900 par la page d’accueil', await nav, page.url().slice(-60));
await page.close();

check('aucune erreur ni avertissement console', errors.length === 0, errors.length ? '\n' + [...new Set(errors)].slice(0, 8).join('\n') : '');
console.log(`\n${ok} vérifications réussies, ${ko} échec(s)`);
await browser.close();
process.exit(ko ? 1 : 0);
