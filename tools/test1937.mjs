// Test fonctionnel de la page « Paris 1937 » (le test lit l'image : l'avertissement du pilote sur cette lecture est ignoré) : charge la page, vérifie la ville recomposée à
// l'été 1937 (bâti, Seine, ponts, voirie), les chemins de fer et les gares (gare de l'Est doublée, gare Montparnasse de 1852, gare de la Bastille), la tour en jaune brun, le
// Champ-de-Mars en jardin, le palais de Chaillot, les grands ensembles disparus depuis (Halle aux vins, entrepôts de Bercy, abattoirs, usines Citroën, gare des Gobelins, usine à
// gaz, Petite Roquette, Vélodrome d'Hiver et ses abords), les quartiers refaits depuis, la zone, l'Exposition et la passerelle de l'Alma, la circulation (réseau des rues, chaussées, véhicules, conduite à droite, stationnement, passants sur les trottoirs, phares), les passants de 1937, les monuments (Sacré-Cœur et son campanile), le calque, les repères, la visite, la marche à pied, l'heure,
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
  return { n: A.n, tris: Math.round(A.tris), dalles: A.meshes.length, e: E.length, eau: E.filter((p) => T.wetAt(p[0], p[1]) > 0.05).length, bati: E.filter((p) => a.footAt(p[0], p[1])).length, grandes: E.filter((p) => /^(Boulevard|Avenue|Cours|Quai)/.test(a.streetAt(p[0], p[1], 45) || '')).length, arc: Math.round(Math.min(...E.map((p) => Math.hypot(p[0] - M.x, p[1] - M.z)))), vendome: Math.round(Math.min(...A.tous().map((p) => Math.hypot(p[0] - a.monuments.Vendome.x, p[1] - a.monuments.Vendome.z)))), colonne: !!a.footAt(a.monuments.Vendome.x, a.monuments.Vendome.z) && a.foot.filter((f) => f.top > a.monuments.Vendome.top - 12 && Math.hypot(f.ring[0][0] - a.monuments.Vendome.x, f.ring[0][1] - a.monuments.Vendome.z) < 40).length, opera: larg(-1310, -1990), lw: L.w >= Math.ceil(a.voirie.w / 4) }; });      // en 1937, la carte des demi-largeurs est repeinte rue par rue, deux fois plus fine (src/p1937/circulation.js)
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

// ---------- l'Exposition de 1937 (src/p1937/expo37.js)
const ex = await page.evaluate(() => { const a = window.__app, M = a.monuments, T = a.terrain, h = (m) => (m ? Math.round(m.top - T.height(m.x, m.z)) : -1), pied = (m) => !!(m && a.footAt(m.x, m.z));
  const statue = a.landmarks.filter((l) => M.URSS && Math.hypot(l.x - M.URSS.x, l.z - M.URSS.z) < 2).map((l) => Math.round(l.top - T.height(l.x, l.z)));
  const pavillons = Object.keys(M).filter((k) => /^Pavillon /.test(k)).length;
  // de part et d'autre de la place de Varsovie, dans l'axe du pont d'Iéna : l'URSS à l'ouest (aval), l'Allemagne à l'est (amont)
  const U = [0.71538, 0.69873], O = [-4039.4, -604.3], v = (m) => -(m.x - O[0]) * U[1] + (m.z - O[1]) * U[0];
  return { pavillons, urss: h(M.URSS), statue, allemagne: h(M.Allemagne), cotes: M.URSS && M.Allemagne ? [Math.round(v(M.URSS)), Math.round(v(M.Allemagne))] : [], pontifical: h(M.Pontifical), mat: h(M.PorteHonneur),
    lumiere: pied(M.Lumiere), ecartes: a.stats.ecartesExpo,
    parterre: !a.footAt(-3900.4, -460.4) && !a.footAt(-3600, -160),
    // recalage sur le plan directeur : u le long de l'axe (depuis la tour), v en travers
    champ: (() => { const u = (m) => (m.x - O[0]) * U[0] + (m.z - O[1]) * U[1], P = Object.entries(M).filter(([k, m]) => /^Pavillon |^Lumiere$|^Publicite$/.test(k) && Math.abs(v(m) - 5.8) < 130 && u(m) > 60); return { n: P.length, fin: Math.round(Math.max(...P.map(([, m]) => u(m)))), lumiere: Math.round(u(M.Lumiere)) }; })(),
    regional: ['Bretagne', 'Alsace', 'Provence', 'Normandie', 'Savoie'].map((n) => M['Pavillon ' + n]).every((m) => m && a.footAt(m.x, m.z) && v(m) > 250), phare: !!a.footAt(...((u, w) => [O[0] + u * U[0] - w * U[1], O[1] + u * U[1] + w * U[0]])(-59, 474)),
    colonies: pied(M['Pavillon Maroc']) && pied(M['Pavillon Indochine']) && pied(M['Pavillon Tunisie']) && v(M['Pavillon Tunisie']) - v(M['Pavillon États du Levant']) > 600,
    quai: [v(M['Pavillon Grande-Bretagne']), v(M['Pavillon Belgique']), v(M['Pavillon États-Unis'])].map(Math.round), air: pied(M.PalaisAir) && pied(M.PalaisRail) && Math.abs(M.PalaisAir.x - M.PalaisRail.x) < 90,
    noms: ['Pavillon de l’URSS', 'Pavillon de l’Allemagne', 'Palais de l’Air', 'Porte d’honneur'].filter((n) => !a.ui.places.some((p) => p.name === n)) }; });
check('Exposition de 1937 : l’URSS (statue posée à 33 m) et l’Allemagne (tour et aigle, 54 m) face à face de part et d’autre de la place de Varsovie, le pavillon pontifical (82 m), le mât de 100 m de la porte d’honneur', ex.urss > 55 && ex.statue.some((t) => t >= 55 && t <= 62) && ex.allemagne >= 56 && ex.cotes[0] > 60 && ex.cotes[1] < -50 && ex.pontifical === 82 && ex.mat === 104 && ex.noms.length === 0, JSON.stringify(ex));
check('Exposition de 1937 : près de cent pavillons — Trocadéro, quais, Champ-de-Mars (le grand parterre dégagé), Centre régional, colonies de l’île aux Cygnes, palais de l’Air et des Chemins de fer ; le bâti évoqué de leurs terrains effacé', ex.pavillons > 90 && ex.air && ex.lumiere && ex.colonies && ex.regional && ex.parterre && ex.ecartes > 20, JSON.stringify(ex));
check('Exposition de 1937, recalée sur ses plans : le Champ-de-Mars s’arrête à l’avenue Joseph-Bouvard (palais de la Lumière vers 316 m de la tour, rien au-delà de 335 m) ; le quai d’Orsay bâti à plus de 50 m de l’axe du pont d’Iéna, les États-Unis au droit de l’avenue de Suffren ; le Centre régional à l’ouest de l’avenue, son phare au bord de l’eau ; les colonies sur plus de 600 m d’île ; les deux palais de l’Esplanade face à face', ex.champ.n >= 24 && ex.champ.fin <= 335 && ex.champ.lumiere >= 305 && ex.champ.lumiere <= 325 && ex.quai[0] >= 70 && ex.quai[1] <= -50 && ex.quai[2] > 225 && ex.quai[2] < 262 && ex.regional && ex.phare && ex.colonies && ex.air, JSON.stringify({ champ: ex.champ, quai: ex.quai, phare: ex.phare }));

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
const fi = await page.evaluate(() => { const a = window.__app, S = a.statuts, M = a.monuments, T = a.terrain, P = a.people;
  let zone = 0; for (let x = 4480; x <= 4740; x += 5) for (let z = -700; z <= 400; z += 5) if (S.lire(x, z) === 4) zone++;          // la zone, au-delà des HBM de la porte de Montreuil
  const U = [0.71538, 0.69873], O = [-4039.4, -604.3], N = [-U[1], U[0]]; let ile = 0;                                          // l'île aux Cygnes : aucun bâtiment évoqué
  for (let v = 600; v <= 1360; v += 4) { const u = -144 + ((v - 600) * 15) / 760; for (const t of [-6, 0, 6]) { const x = O[0] + U[0] * (u + t) + N[0] * v, z = O[1] + U[1] * (u + t) + N[1] * v; if (S.lire(x, z) === 4) ile++; } }
  const pa = M.PasserelleAlma, po = M.PorteAlma, r = () => 0.5, garde = P.outfit(r, 'man', 'guard').col;
  return { zone, ile, velhiv: [[-4405, -40], [-4370, 12], [-4400, 35]].filter(([x, z]) => S.lire(x, z) === 3).length,
    passerelle: !!(pa && a.footAt(pa.x, pa.z) && a.footAt(pa.x, pa.z - 60) && a.footAt(pa.x, pa.z + 60) && !a.footAt(pa.x, pa.z + 75)), haut: pa ? Math.round(pa.top - T.height(pa.x, pa.z - 66)) : -1,
    fiche: a.ui.places.some((p) => p.name === 'Passerelle de l’Alma'), garde,
    // la porte monumentale de l'Alma : deux pylônes de 50 m à 21 m d'entraxe, la plate-forme entre eux, les passerelles droites jusqu'aux angles de l'avenue George-V
    porte: po ? { pylones: a.landmarks.filter((l) => Math.hypot(l.x - po.x, l.z - po.z) < 13 && Math.abs(l.top - T.height(po.x, po.z) - 50) < 0.6).length, entraxe: (() => { const L = a.landmarks.filter((l) => Math.hypot(l.x - po.x, l.z - po.z) < 13); return L.length === 2 ? +Math.hypot(L[0].x - L[1].x, L[0].z - L[1].z).toFixed(1) : -1; })(),
      pieds: [[-3551, -1326], [-3499, -1326]].filter(([x, z]) => a.footAt(x, z)).length, fiche: a.ui.places.some((p) => p.name === 'Porte de l’Alma'), pont: a.v89.reseau.E.filter((e) => /^Pont de l.Alma/.test(e.nom) && e.ok).length } : null, attelages: P.pools.filter((p) => p.kind === 'rider' || p.kind === 'cart').length }; });
check('finitions de 1937 : baraques évoquées dans la zone, rien sur l’île aux Cygnes, garages et ateliers relevés autour du Vélodrome d’Hiver, passerelle de l’Alma (133 m), passants des années 1930, plus de cavaliers ni d’attelages parmi eux (les voitures à cheval roulent avec les automobiles)',
  fi.zone > 20 && fi.ile === 0 && fi.velhiv === 3 && fi.passerelle && fi.haut >= 14 && fi.fiche && fi.garde.join() === '120,112,72' && fi.attelages === 0, JSON.stringify(fi));
check('porte monumentale de la place de l’Alma : deux pylônes de 50 m, 21 m d’entraxe, les escaliers des deux angles de l’avenue George-V, sa fiche ; le pont de l’Alma reste ouvert aux voitures', fi.porte && fi.porte.pylones === 2 && Math.abs(fi.porte.entraxe - 21) < 0.3 && fi.porte.pieds === 2 && fi.porte.fiche && fi.porte.pont >= 2, JSON.stringify(fi.porte));

// ---------- la circulation : automobiles sur la chaussée, passants sur les trottoirs
const re = await page.evaluate(() => { const a = window.__app, G = a.v89.reseau, E = G.E, N = G.N, roule = E.filter((e) => e.ok);
  const sortie = (K, e) => e.sens === 0 || (e.sens > 0 ? N[e.a] === K : N[e.b] === K);
  return { B: G.bilan, iena: E.filter((e) => /^Pont d.I.na/.test(e.nom) && e.ok).length, pietonnes: roule.filter((e) => /^(Passage|Impasse|Port|Villa|Cité|Galerie)\b/.test(e.nom)).length,
    bosquet: (() => { const L = E.filter((e) => e.nom === 'Avenue Bosquet'); return L.length > 5 && L.every((e) => e.ok && e.sens === 0 && e.nl >= 2 && e.gare === 2); })(),
    uniques: roule.filter((e) => e.sens && e.w >= 2.35).length, doubles: roule.filter((e) => !e.sens && e.w < 2.35).length, etroites: roule.filter((e) => e.w < 1.15).length,
    impasses: N.filter((K) => K.e.filter((k) => E[k].ok).length === 1).length, puits: N.filter((K) => { const L = K.e.filter((k) => E[k].ok); return L.length && !L.some((k) => sortie(K, E[k])); }).length,
    ponts: roule.filter((e) => e.surPont != null).length, alma: roule.filter((e) => /^Pont de l.Alma/.test(e.nom)).length, large: a.voirie.large.w, voirie: a.voirie.w }; });
check('circulation, le réseau : plus de 700 km de rues où l’on roule et plus de 4 000 carrefours ; ni passages, ni impasses, ni ports, ni terrains de l’Exposition (pont d’Iéna) ; aucune voie sans issue, aucun carrefour dont on ne sort pas',
  re.B.roulables > 9000 && re.B.km > 700 && re.B.km < 1100 && re.B.carrefours > 4000 && re.B.expo > 10 && re.iena === 0 && re.pietonnes === 0 && re.etroites === 0 && re.impasses === 0 && re.puits === 0, JSON.stringify(re));
check('circulation, les chaussées : sens unique sous 4,7 m, double sens au-delà ; l’avenue Bosquet à plusieurs files et stationnement des deux côtés ; les ponts de la Seine, dont celui de l’Alma ; la carte des largeurs repeinte rue par rue',
  re.B.sensUniques > 1500 && re.uniques === 0 && re.doubles === 0 && re.bosquet && re.ponts > 30 && re.alma >= 1 && re.large >= re.voirie / 2, JSON.stringify([re.B.sensUniques, re.uniques, re.doubles, re.bosquet, re.ponts, re.alma, re.large]));
const ci = await page.evaluate(() => { const a = window.__app, T = a.terrain; a.setHour(10.5);
  a.rig.goal = { x: -3393, z: -650, dist: 420, az: 0, el: 1 }; a.rig.cur = { ...a.rig.goal }; a.rig.target.x = -3393; a.rig.target.z = -650;
  const tic = (n) => { for (let i = 0; i < n; i++) { a.rig.update(0.1); a.time += 0.1; a.emit('frame', 0.1); } }; tic(200);
  const c = a.circulation, G = c.G, trot = (H) => Math.max(1.4, Math.min(8, 0.44 * H - 0.2)), pt = {};
  const o = { n: 0, veut: c.veut, modeles: {}, hors: 0, eau: 0, bati: 0, ilot: 0, trottoir: 0, deuxSens: 0, gauche: 0, arret: 0, v: 0, gares: c.gares, gBati: 0, gTrottoir: 0 }, p0 = [];
  for (let i = 0; i < c.veut; i++) { p0.push(c.e[i] < 0 ? null : [c.x[i], c.z[i]]); if (c.e[i] < 0) continue;
    const e = G.E[c.e[i]], m = c.M[c.mod[i]], x = c.x[i], z = c.z[i], d = G.dist(x, z); o.n++; o.modeles[m.nom] = (o.modeles[m.nom] || 0) + 1; o.v += c.v[i]; if (c.v[i] < 0.3) o.arret++;
    if (!e.ok) o.hors++; if (T.wetAt(x, z) > 0.5 && !a.deck.has(a.deckKey(x, z))) o.eau++; if (a.footAt(x, z)) o.bati++;
    if (c.etat[i] || e.eau) continue;
    if (d < 0.2) o.ilot++; else if (d < trot(G.demi(x, z)) + m.l - 0.3) o.trottoir++;
    // on roule à droite : la file d'en face est à main gauche
    if (!e.sens) { o.deuxSens++; c.surFile(e, -c.dir[i], c.file[i], e.len - c.s[i], pt); const h = c.h[i]; if ((pt.x - x) * -Math.cos(h) + (pt.z - z) * Math.sin(h) > 0) o.gauche++; } }
  for (const m of c.M) { if (!m.g) continue; const A = m.g.im.instanceMatrix.array; for (let k = 0; k < m.g.im.count; k++) { const x = A[k * 16 + 12], z = A[k * 16 + 14]; if (a.footAt(x, z)) o.gBati++; if (G.dist(x, z) < trot(G.demi(x, z)) + 0.4) o.gTrottoir++; } }
  tic(50); let dep = 0, nd = 0; for (let i = 0; i < c.veut; i++) if (p0[i] && c.e[i] >= 0) { const d = Math.hypot(c.x[i] - p0[i][0], c.z[i] - p0[i][1]); if (d < 120) { dep += d; nd++; } }
  o.v = +(o.v / o.n).toFixed(2); o.deplacement = +(dep / nd).toFixed(1);
  // les passants : sur les trottoirs, sauf ceux qui traversent
  // (hors trottoir, on distingue la voie sans voitures, la traversée d'un carrefour et la pleine chaussée d'une rue où l'on roule)
  const proche = (x, z) => { let best = null, bd = 1e9; for (const e of G.E) { if (Math.abs(e.cx - x) > 150 || Math.abs(e.cz - z) > 150) continue; for (let i = 0; i < e.P.length; i++) { const d = Math.hypot(e.P[i][0] - x, e.P[i][1] - z); if (d < bd) { bd = d; best = { e, i }; } } } return best; };
  const P = a.people; let np = 0, hors = 0, pleine = 0; for (const p of P.pools) for (let i = 0; i < Math.min(p.active, p.n); i++) { if (!p.ok[i]) continue; np++; if (!G.chaussee(p.x[i], p.z[i])) continue; hors++;
    const q = proche(p.x[i], p.z[i]); if (q && q.e.ok && Math.min(q.e.S[q.i], q.e.len - q.e.S[q.i]) > Math.max(q.e.ra, q.e.rb) + 6) pleine++; }
  o.passants = np; o.horsTrottoir = hors; o.surChaussee = pleine; o.trame = a.pavage && a.nav.data !== a.pavage && a.nav.data.length === a.pavage.length;
  a.setHour(23); tic(3); o.nuit = { phares: c.M.filter((m) => m.faisceauIm && m.faisceauIm.visible).length, veut: c.veut }; a.setHour(10.5); tic(3); o.jour = { phares: c.M.filter((m) => m.faisceauIm && m.faisceauIm.visible).length, veut: c.veut };
  return o; });
check('circulation, les véhicules (avenue Bosquet) : berlines, taxis, camionnettes, camions, autobus et voitures à cheval, tous sur le réseau ; aucun dans l’eau ni dans un bâtiment, presque aucun sur un trottoir',
  ci.n > 60 && ci.n === ci.veut && ['berline', 'taxi', 'camionnette', 'camion', 'autobus', 'attelage'].every((m) => ci.modeles[m] > 0) && ci.modeles.berline > ci.n * 0.4 && ci.hors === 0 && ci.eau === 0 && ci.bati <= 1 && ci.ilot === 0 && ci.trottoir < 0.06 * ci.n, JSON.stringify(ci));
check('circulation, la conduite : on roule à droite, on avance (plus de 10 m en 5 s en moyenne), moins de la moitié des véhicules attend à un carrefour',
  ci.deuxSens > 30 && ci.gauche === 0 && ci.v > 2.5 && ci.deplacement > 10 && ci.arret < 0.5 * ci.n, JSON.stringify([ci.deuxSens, ci.gauche, ci.v, ci.deplacement, ci.arret]));
check('circulation, le stationnement : des voitures garées le long des trottoirs, aucune dans un bâtiment, presque aucune sur un trottoir', ci.gares > 30 && ci.gBati === 0 && ci.gTrottoir < 0.08 * ci.gares, JSON.stringify([ci.gares, ci.gBati, ci.gTrottoir]));
check('circulation, les passants : ils tiennent les trottoirs, traversent aux carrefours et gardent les voies sans voitures (moins de 2 % en pleine chaussée) ; le pavé garde la trame des rues', ci.passants > 200 && ci.surChaussee < 0.02 * ci.passants && ci.horsTrottoir > ci.surChaussee && ci.trame, JSON.stringify([ci.passants, ci.horsTrottoir, ci.surChaussee, ci.trame]));
const pv = await page.evaluate(() => { const a = window.__app, T = a.terrain, P = a.people, G = a.v89.reseau, R = a.navRect;
  a.rig.goal = { x: -1310, z: -1990, dist: 420, az: 0, el: 1 }; a.rig.cur = { ...a.rig.goal }; a.rig.target.x = -1310; a.rig.target.z = -1990;
  for (let i = 0; i < 150; i++) { a.rig.update(0.1); a.time += 0.1; a.emit('frame', 0.1); }
  const proche = (x, z) => { let best = null, bd = 1e9; for (const e of G.E) { if (Math.abs(e.cx - x) > 150 || Math.abs(e.cz - z) > 150) continue; for (let i = 0; i < e.P.length; i++) { const d = Math.hypot(e.P[i][0] - x, e.P[i][1] - z); if (d < bd) { bd = d; best = { e, i }; } } } return best; };
  const o = { n: 0, dansTrame: 0, bati: 0, eau: 0, ilot: 0, pleine: 0, marche: 0, autos: a.circulation.actifs };
  for (const p of P.pools) for (let i = 0; i < Math.min(p.active, p.n); i++) { if (!p.ok[i]) continue; const x = p.x[i], z = p.z[i]; o.n++;
    if (x > R.x && x < R.x + R.w && z > R.z && z < R.z + R.h) o.dansTrame++; if (a.footAt(x, z)) o.bati++; if (T.wetAt(x, z) > 0.5) o.eau++; if (G.dist(x, z) < 0 && P.genre(x, z) !== 3) o.ilot++; if (p.st[i] <= 0) o.marche++;
    if (G.chaussee(x, z)) { const q = proche(x, z); if (q && q.e.ok && Math.min(q.e.S[q.i], q.e.len - q.e.S[q.i]) > Math.max(q.e.ra, q.e.rb) + 6) o.pleine++; } }
  return o; });
check('passants, hors du quartier de l’Exposition (place de l’Opéra) : la foule est là aussi, sur les trottoirs et aux traversées, ni dans les îlots (hors les squares), ni dans les bâtiments, ni en pleine chaussée, parmi les automobiles',
  pv.n > 300 && pv.dansTrame === 0 && pv.bati === 0 && pv.eau === 0 && pv.ilot === 0 && pv.pleine < 0.03 * pv.n && pv.marche > 0.6 * pv.n && pv.autos > 60, JSON.stringify(pv));
const pj = await page.evaluate(() => { const a = window.__app, T = a.terrain, P = a.people, R = a.navRect;
  const voir = (x, z, dist) => { a.rig.goal = { x, z, dist, az: 0, el: 1 }; a.rig.cur = { ...a.rig.goal }; a.rig.target.x = x; a.rig.target.z = z;
    for (let i = 0; i < 80; i++) { a.rig.update(0.1); a.time += 0.1; a.emit('frame', 0.1); }
    const o = { n: 0, dansTrame: 0, bati: 0, eau: 0, pont: 0, horsVoie: 0, marche: 0, attelages: 0, jardin: 0, attelesAuJardin: 0, chemin: 0 };
    for (const p of P.pools) for (let i = 0; i < Math.min(p.active, p.n); i++) { if (!p.ok[i]) continue; const px = p.x[i], pz = p.z[i], roule = p.kind === 'rider' || p.kind === 'cart', g = P.genre(px, pz); o.n++;
      if (px > R.x && px < R.x + R.w && pz > R.z && pz < R.z + R.h) o.dansTrame++; if (a.footAt(px, pz)) o.bati++; if (!g) o.horsVoie++; if (g === 2) o.chemin++;
      if (T.wetAt(px, pz) > 0.5) { if (a.deck.has(a.deckKey(px, pz))) o.pont++; else if (T.wetAt(px, pz) > 0.6) o.eau++; }
      if (p.st[i] <= 0) o.marche++; if (roule) o.attelages++; if (g === 3) { o.jardin++; if (roule) o.attelesAuJardin++; } }
    return o; };
  return voir(-1048, 699, 330); });
check('passants, au jardin du Luxembourg : des promeneurs dans les allées, ailleurs sur les trottoirs ; ni dans les bâtiments, ni dans l’eau', pj.n > 300 && pj.jardin > 100 && pj.bati === 0 && pj.eau === 0 && pj.horsVoie === 0 && pj.dansTrame === 0, JSON.stringify(pj));
check('circulation, la nuit : les phares s’allument et la circulation se raréfie ; le jour, ils s’éteignent', ci.nuit.phares === 5 && ci.jour.phares === 0 && ci.nuit.veut < 0.5 * ci.jour.veut, JSON.stringify([ci.nuit, ci.jour]));

// ---------- silhouettes des monuments
const mo = await page.evaluate(() => { const a = window.__app, M = a.monuments, T = a.terrain, h = (m) => (m ? +(m.top - T.height(m.x, m.z)).toFixed(1) : -1), fl = a.landmarks.find((l) => l.nom === 'fleche');
  const campanile = a.landmarks.filter((l) => Math.hypot(l.x - M.SacreCoeur.x, l.z - (M.SacreCoeur.z - 62)) < 2).map((l) => +(l.top - T.height(l.x, l.z)).toFixed(1));
  return { invalides: h(M.Invalides), pantheon: h(M.Pantheon), nd: h(M.NotreDame), fleche: fl ? +(fl.top - T.height(fl.x, fl.z)).toFixed(1) : -1, opera: h(M.Opera), arc: h(M.Arc), sc: h(M.SacreCoeur), campanile, halles: (M.Halles || {}).pavillons, hd: h(M.HotelDieu), industrie: !!M.Industrie }; });
check('monuments : Invalides (107 m), Panthéon (83 m), Notre-Dame (69 et 96 m), l’Opéra, l’Arc ; ni palais de l’Industrie', mo.invalides === 107 && mo.pantheon === 83 && Math.abs(mo.nd - 69) < 1 && mo.fleche === 96 && mo.opera === 56 && mo.arc > 55 && mo.arc < 60 && !mo.industrie, JSON.stringify(mo));
check('Sacré-Cœur : le grand dôme (83 m) et le campanile achevé en 1912 (84 m) ; Halles : les dix pavillons en service en 1937 (les deux derniers sont en chantier)', Math.abs(mo.sc - 83) < 0.5 && mo.campanile.some((t) => Math.abs(t - 84) < 0.6) && mo.halles === 10 && mo.hd > 25, JSON.stringify([mo.sc, mo.campanile, mo.halles]));

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
const attendus = ['Tour Eiffel', 'Champ-de-Mars', 'Palais de Chaillot', 'Grand Palais', 'Petit Palais', 'Pont Alexandre-III', 'Porte de l’Alma', 'Passerelle de l’Alma', 'Halles centrales', 'Halle aux vins', 'Entrepôts de Bercy', 'Abattoirs de la Villette', 'Marché aux bestiaux de la Villette', 'Abattoirs de Vaugirard', 'Usines Citroën', 'Gare des Gobelins', 'Usine à gaz de La Villette', 'Petite Roquette', 'Vélodrome d’Hiver',
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
check('sources : APUR, base « Paris 1900 » corrigée, plan général de l’Exposition, nomenclature des voies, IGN (relief, photographie de 1949), voies ferrées ; ce qui est réel, disparu, évoqué', src.vu && src.n === 7 && /Exposition de 1937/.test(src.t) && /Voies ferrées/.test(src.t) && /Atelier parisien d’urbanisme/.test(src.t) && /1949/.test(src.t) && /IGN/.test(src.t) && /Disparu/.test(src.t) && /Évoqué/.test(src.t) && /Non figuré/.test(src.t) && /Licence Ouverte/.test(src.t) && /Peltier/.test(src.t) && /porte monumentale/.test(src.t) && !/automobiles\./.test(src.t) && !/Pas encore modelé/.test(src.t) && !/Vasserot/.test(src.t) && !/1900 ou d’avant/.test(src.t), `${src.n} sources`);
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
check('parcours commenté « Paris en 1937 » : 21 étapes, chaque lieu existe, la vue s’y rend, l’étape suivante vient seule, « Terminer » rend le survol', vi.t0.panneau && vi.t0.mode === 'true' && vi.t0.titre === 'Paris en 1937' && vi.t0.compte === '1 / 21' && vi.t0.points === 21 && vi.t0.texte > 80 && vi.e1.k === 1 && vi.pres >= 0 && vi.pres < 30 && vi.fiche && vi.e2.k === 2 && !vi.fin.actif && !vi.fin.panneau && vi.fin.survol === 'true' && vi.manquants.length === 0, JSON.stringify(vi));

// ---------- heure, marche, frise
const nuit = await page.evaluate(() => { const a = window.__app; a.setHour(22); const n = a.materials.facade.emissiveIntensity; a.setHour(10.5); return [n, a.materials.facade.emissiveIntensity]; });
check('heure : la nuit, les fenêtres s’éclairent', nuit[0] > 0.5 && nuit[1] < 0.05, JSON.stringify(nuit));
await page.click('#mode-walk'); await frames(6);
const marche = await page.evaluate(() => { const a = window.__app, w = a.rig.walk || {}; return { mode: a.rig.mode, x: w.x, z: w.z, ok: a.rig.mode === 'walk' ? a.walkable(w.x, w.z) : false, rue: a.streetAt(-3930, -700, 80), foch: a.streetAt(-4300, -2350, 120), georgeV: a.streetAt(-3534, -1345, 40), wilson: a.streetAt(-3640, -1330, 60), noms: (() => { const N = new Set(a.v89.reseau.E.map((e) => e.nom)); return ['Avenue George V', 'Avenue du Président Wilson', 'Avenue de Tokio', 'Rue Jean Ferrandi', 'Rue de La Rochefoucauld', 'Rue de Rivoli'].filter((n) => !N.has(n)).concat(['Avenue de l\'Alma', 'Avenue du Trocadéro', 'Rue Julien Lacroix'].filter((n) => n !== 'Rue Julien Lacroix' && N.has(n))); })() }; });
check('à pied : on marche sur un sol libre, les rues ont leur nom de 1937 (avenue George-V et avenue du Président-Wilson depuis 1918, rue Jean-Ferrandi depuis 1935 ; plus d’avenue de l’Alma ni d’avenue du Trocadéro)', marche.mode === 'walk' && marche.ok && typeof marche.rue === 'string' && marche.rue.length > 3 && marche.georgeV === 'Avenue George V' && marche.wilson === 'Avenue du Président Wilson' && marche.noms.length === 0, JSON.stringify(marche));
await page.click('#mode-fly'); await frames(3);
await page.click('#btn-epoch');
const fr = await page.evaluate(() => { const l = [...document.querySelectorAll('#frise-jalons a')]; return { ouvert: !document.getElementById('frise').hidden, noms: l.map((a) => a.textContent).join(' '), liens: l.map((a) => a.getAttribute('href')), ici: (l.find((a) => a.getAttribute('aria-current') === 'page') || {}).textContent, site: document.getElementById('brand-site').textContent, titre: document.title, dock: document.getElementById('epoch-label').textContent }; });
check('frise des dates : 1937 en cours ; Lutèce, 1380, 1789, 1889 et 1900 mènent aux autres maquettes', fr.ouvert && fr.noms === 'Lutèce 1300 1380 1553 1652 1741 1789 1836 1889 1900 1937' && fr.ici === '1937' && fr.dock === '1937' && fr.liens[0] === 'index.html#m=lutece' && fr.liens[2] === 'index.html' && fr.liens[6] === 'index.html#m=1789' && fr.liens[8] === 'index.html#m=1889' && fr.liens[9] === 'index.html#m=1900' && fr.liens[10] === null && fr.site === 'Paris à travers le temps' && /^Paris à travers le temps — Paris 1937/.test(fr.titre), JSON.stringify(fr));
await page.click('#frise [data-close="frise"]');

// ---------- téléphone : version allégée
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p2 = await ctx.newPage(); watch(p2); p2.setDefaultTimeout(120000);
  await p2.goto(URL + '#shot'); await p2.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 300000 });
  const m = await p2.evaluate(() => { const a = window.__app; a.rig.goal = { x: -3393, z: -650, dist: 420, az: 0, el: 1 }; a.rig.cur = { ...a.rig.goal }; a.rig.target.x = -3393; a.rig.target.z = -650;
    for (let i = 0; i < 60; i++) { a.rig.update(0.1); a.emit('frame', 0.1); } const c = a.circulation;
    return { rate: window.__failed || '', mobile: a.mobile, tris: a.stats.tris, bati: a.stats.bati, autos: c ? [c.max, c.actifs, c.gares] : null }; });
  check('téléphone : la page démarre en version allégée (toits plats, circulation réduite)', !m.rate && m.mobile && m.bati > 100000 && m.tris < v.tris * 0.8 && m.autos && m.autos[0] <= 200 && m.autos[1] > 10 && m.autos[1] <= m.autos[0], JSON.stringify(m));
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
