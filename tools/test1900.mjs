// Test fonctionnel de la page « Paris 1900 » (le test lit l'image : l'avertissement du pilote sur cette lecture est ignoré) : charge la page, vérifie la ville recomposée en 1900
// (bâti, Seine, ponts dont Alexandre-III, enceinte), les chemins de fer et les gares (gare de Lyon neuve, pont Rouelle), la tour repeinte, l'Exposition (Champ-de-Mars,
// palais de l'Électricité, Grande Roue, Grand et Petit Palais), les entrées du métro, les monuments, les repères, la visite, la marche à pied, l'heure, la frise, les sources, le téléphone et
// l'absence d'erreurs. Le moteur est celui de la page « Paris 1889 » (tools/test1889.mjs en vérifie le reste).
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
const URL = 'file://' + join(root, 'dist/1900.html');
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
check('les données sont celles de 1900, sans curseur de chantier', await page.evaluate(() => window.__app.v89 && !document.getElementById('chantier') && document.querySelector('#brand h1').textContent.trim() === 'Paris 1900'));
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
check('bâti : près de quatre-vingt-dix mille bâtiments dressés', v.bati > 80000 && v.bati < 95000 && v.foot >= v.bati - 100, `${v.bati} bâtiments`);
check('bâti : volumes légers (moins de 3,4 millions de triangles, moins de 750 maillages)', v.tris > 1.5e6 && v.tris < 3.4e6 && v.maillages < 750, `${v.tris} triangles, ${v.maillages} maillages`);
check('Seine : continue devant la tour et au centre, en eau sous chaque pont ; à sec sur les rives', v.seine.slice(0, 4).every((w) => w > 0.9) && v.seine[4] > 0.5 && v.sec.every((w) => w < 0.05), JSON.stringify([v.seine, v.sec]));
check('relief : le Champ-de-Mars près du fleuve, Montmartre et Belleville sur leurs collines', v.tour > 3 && v.tour < 12 && v.montmartre > 80 && v.belleville > 60, JSON.stringify([v.tour, v.montmartre, v.belleville]));
check('ponts : une trentaine sur la Seine, chacun bâti une seule fois, dont le pont d’Iéna, le Pont-Neuf sur ses deux bras, ceux du petit bras, le pont Mirabeau (1896) et le pont Alexandre-III (1900) ; pas l’allée des Cygnes', v.ponts.length >= 28 && v.ponts.length <= 40 && v.ponts.some((n) => /I.na/.test(n)) && v.ponts.filter((n) => /Neuf/.test(n)).length === 2 && ['Saint-Michel', 'petit', 'double', 'Archev', 'Alexandre', 'Mirabeau'].every((m) => v.ponts.filter((n) => new RegExp(m, 'i').test(n)).length === 1) && !v.ponts.some((n) => /Cygnes/.test(n)), `${v.ponts.length} ponts`);
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


// ---------- chemins de fer et gares de 1900
const fe = await page.evaluate(() => { const a = window.__app, V = a.v89, F = V.fer, T = a.terrain, M = a.monuments, E = F.echantillon, A = V.alignements;
  const G = ['GareNord', 'GareEst', 'GareLazare', 'GareOrleans', 'GareMontparnasse', 'GareBastille', 'GareSceaux'];
  const h = (m) => (m ? Math.round(m.top - T.height(m.x, m.z)) : -1);
  return { n: F.n, km: Math.round(F.km), tris: F.tris, viaduc: F.viaduc, surEau: F.surEau, noyes: F.noyes, statuts: F.statuts, e: E.length,
    sousSol: E.filter((p) => p[1] < T.land(p[0], p[2]) + 0.2).length, daumesnil: E.filter((p) => p[3] > 6 && p[0] > 1500 && p[0] < 2600 && p[2] > 300).length, auteuil: E.filter((p) => p[3] > 6 && p[0] < -5800).length,
    lignes: { ceinture: F.pres(-218, -4932, 25), auteuil: F.pres(-5648, -1348, 25), vincennes: F.pres(3050, 1254, 25), montparnasse: F.pres(-2085, 1196, 25), sceaux: F.pres(-1064, 2722, 60), nord: F.pres(480, -3600, 60), lyon: F.pres(2200, 1350, 80), rouelle: F.pres(-4810, 62, 20), rouelle2: F.pres(-4930, 38, 20) },
    ecartees: { metro6: F.pres(-3905, 361, 40), metro2: F.pres(1437, -2963, 40), belleville: F.pres(2650, -2500, 60), gareChampDeMars1878: F.pres(-4380, -430, 25), invalides: F.pres(-2760, -1040, 60) },
    gares: G.map((k) => h(M[k])), murs: G.map((k) => !!(M[k] && a.footAt(M[k].x, M[k].z))), reels: G.filter((k) => M[k] && (a.footAt(M[k].x, M[k].z) || {}).reel).length, champDeMars: !!M.GareChampDeMars,
    lyon: { h: h(M.GareLyon), horloge: h(M.HorlogeLyon), pied: !!a.footAt(M.HorlogeLyon.x, M.HorlogeLyon.z), voies: F.pres(M.GareLyon.butoirs[0] + M.GareLyon.axe[0] * 60, M.GareLyon.butoirs[1] + M.GareLyon.axe[1] * 60, 30) },
    neuves: ['GareOrsay', 'GareInvalides'].map((k) => (M[k] ? a.statuts.lire(M[k].x, M[k].z) : -1)),
    arbres: A.tous().filter((p) => F.pres(p[0], p[1], 2.2)).length }; });
check('voies ferrées : près de six cents kilomètres de voies posées sur le sol, aucune sous terre ni sous l’eau', fe.n > 4000 && fe.km > 500 && fe.km < 650 && fe.tris < 260000 && fe.e > 500 && fe.sousSol === 0 && fe.noyes === 0, JSON.stringify([fe.n, fe.km, fe.tris, fe.sousSol, fe.noyes]));
check('voies ferrées : chaque voie dit d’où vient son tracé — voies d’aujourd’hui, lignes restituées, lignes évoquées', fe.statuts.a > 400 && fe.statuts.r > 2 && fe.statuts.e > 20 && fe.statuts.e < 60, JSON.stringify(fe.statuts));
check('lignes de 1900 : Petite Ceinture, ligne d’Auteuil, ligne de Vincennes, ancienne gare Montparnasse, ligne de Sceaux, grandes lignes, et le pont Rouelle de part et d’autre de l’île des Cygnes', Object.values(fe.lignes).every(Boolean), JSON.stringify(fe.lignes));
check('lignes écartées : ni le métro, ni la gare du Champ-de-Mars de 1878 (démontée en 1897), ni la ligne souterraine des Invalides ; rien dans le souterrain de Belleville', Object.values(fe.ecartees).every((v) => !v), JSON.stringify(fe.ecartees));
check('viaducs : la ligne de Vincennes le long de l’avenue Daumesnil et le viaduc d’Auteuil portent leurs voies en hauteur ; les voies franchissent la Seine', fe.viaduc > 6000 && fe.viaduc < 16000 && fe.daumesnil >= 3 && fe.auteuil >= 2 && fe.surEau > 300, JSON.stringify([fe.viaduc, fe.daumesnil, fe.auteuil, fe.surEau]));
check('gares : sept gares bâties au bout de leurs voies (Nord, Est, Saint-Lazare, Orléans, Montparnasse, Bastille, Sceaux) ; plus de gare du Champ-de-Mars', fe.gares.every((h) => h > 14 && h < 60) && fe.murs.every(Boolean) && fe.reels === 0 && !fe.champDeMars, JSON.stringify([fe.gares, fe.murs, fe.reels]));
check('gare de Lyon de 1900 : la tour de l’horloge (67 m) à l’angle du bâtiment, des nefs vitrées au bout des voies', fe.lyon.horloge === 75 && fe.lyon.pied && fe.lyon.h > 30 && fe.lyon.voies, JSON.stringify(fe.lyon));
check('gares d’Orsay et des Invalides : leurs bâtiments, que l’APUR ne date pas, sont tenus pour réels (année de leur histoire)', fe.neuves.every((s) => s === 1), JSON.stringify(fe.neuves));
check('emprises du chemin de fer : aucun arbre d’alignement sur une voie', fe.arbres === 0, String(fe.arbres));

// ---------- la tour, repeinte
const tr = await page.evaluate(() => { const a = window.__app; return { top: +(a.monuments.Tour.top - a.terrain.height(-4039.4, -604.3)).toFixed(1), h: a.v89.chantier.hauteur, vus: a.v89.mobiles.filter((m) => m.visible).length }; });
check('tour : trois cents mètres, achevée (ni échafaudage ni grue)', tr.top === 300 && tr.h === 300, JSON.stringify(tr));
// la même vue, avec et sans la tour (une date d'avant son chantier la cache) : ce qu'elle ajoute à l'image est ocre-jaune, pas rouge
const teinte = await page.evaluate(async () => { const a = window.__app, fin = a.v89.chantier.jour; a.setHour(12); a.setView([-4420, 190, -970], [-4039, 185, -604]); a.rig.cur = { ...a.rig.goal }; a.rig.update(0);
  const compter = (j) => { a.setChantier(j); a.renderNow(); const gl = a.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let ocre = 0, rouge = 0; for (let i = 0; i < px.length; i += 4) { const r = px[i], g = px[i + 1], b = px[i + 2]; if (r < 40 || r < b + 18) continue; if (g > 0.6 * r && g < 0.9 * r) ocre++; else if (g < 0.55 * r) rouge++; } return [ocre, rouge]; };
  const sans = compter(0), avec = compter(fin); a.setHour(10.5); return { ocre: avec[0] - sans[0], rouge: avec[1] - sans[1] }; });
check('image : la tour repeinte en 1899, du jaune orangé au jaune clair (plus de rouge de Venise)', teinte.ocre > 3000 && teinte.rouge < teinte.ocre / 10, JSON.stringify(teinte));

// ---------- l'Exposition de 1900
const ex = await page.evaluate(() => { const a = window.__app, M = a.monuments, T = a.terrain, h = (m) => (m ? +(m.top - T.height(m.x, m.z)).toFixed(1) : -1), L = a.landmarks.map((l) => ({ ...l, h: +(l.top - T.height(l.x, l.z)).toFixed(1) })), y0 = T.height(M.Tour.x, M.Tour.z);      // le Champ-de-Mars est bâti au niveau du pied de la tour
  const palais = Object.keys(M).filter((k) => /^Palais (de l’Éducation|du Génie|des Industries|des Mines|des Fils|de la Mécanique)/.test(k));
  const prop = (x, z) => !!a.footAt(x, z);
  return { palais: palais.length, hp: palais.map((k) => h(M[k])), electricite: h(M.Electricite), cheminees: a.landmarks.filter((l) => Math.abs(l.top - y0 - 80) < 0.6 && Math.hypot(l.x - M.Electricite.x, l.z - M.Electricite.z) < 160).length,
    machines: h(M.Machines), roue: h(M.GrandeRoue), roueSol: prop(M.GrandeRoue.x, M.GrandeRoue.z), grandPalais: h(M.GrandPalais), gpPierre: prop(-2760, -1452), petitPalais: prop(-2572, -1440), industrie: !!M.Industrie,
    pylones: L.filter((l) => Math.abs(l.h - 23) < 0.6 && Math.hypot(l.x - M.AlexandreIII.x, l.z - M.AlexandreIII.z) < 120).length, alexandre: a.v89.ponts.filter((p) => /Alexandre/.test(p.nom)).length,
    jardin: a.walkable((M.Tour.x + M.Electricite.x) / 2, (M.Tour.z + M.Electricite.z) / 2) }; });
check('Champ-de-Mars : six palais en fer à cheval autour du jardin, sous leurs dômes', ex.palais === 6 && ex.hp.every((x) => x > 45 && x < 56) && ex.jardin, JSON.stringify([ex.palais, ex.hp, ex.jardin]));
check('palais de l’Électricité : 70 m au Génie, deux cheminées de 80 m ; la Galerie des machines gardée derrière lui', ex.electricite > 70 && ex.electricite < 82 && ex.cheminees === 2 && ex.machines > 45, JSON.stringify([ex.electricite, ex.cheminees, ex.machines]));
check('Grande Roue : 96 m au sommet, sur son emprise', ex.roue > 100 && ex.roue < 108 && ex.roueSol, JSON.stringify([ex.roue, ex.roueSol]));
check('Grand Palais (verrière, mât à 60 m) et Petit Palais à la place du palais de l’Industrie, démoli', ex.grandPalais > 58 && ex.grandPalais < 70 && ex.gpPierre && ex.petitPalais && !ex.industrie, JSON.stringify([ex.grandPalais, ex.gpPierre, ex.petitPalais, ex.industrie]));
check('pont Alexandre-III : une seule arche, quatre pylônes aux têtes du pont', ex.alexandre === 1 && ex.pylones === 4, JSON.stringify([ex.alexandre, ex.pylones]));
const ex2 = await page.evaluate(() => { const a = window.__app, M = a.monuments, T = a.terrain, h = (m) => (m ? +(m.top - T.height(m.x, m.z)).toFixed(1) : -1), cles = Object.keys(M);
  const nations = cles.filter((k) => k.startsWith('Nation ')), sec = nations.filter((k) => T.wetAt(M[k].x, M[k].z) < 0.5).length;
  return { nations: nations.length, sec, rue: !!M.RueDesNations, passerelles: ['PasserelleInvalides', 'PasserelleAlma', 'Debilly'].filter((k) => M[k] && T.wetAt(M[k].x, M[k].z) > 0.5).length, debilly: h(M.Debilly),
    rive: ['VilleDeParis', 'Serres', 'Congres'].filter((k) => M[k]).length, vieux: h(M.VieuxParis), armees: h(M.Armees), esplanade: cles.filter((k) => k.startsWith('Esplanade ')).length, colonies: !!(M.Colonies && M.ColonieAlgerie && M.ColonieIndochine),
    trottoir: (M.TrottoirRoulant || {}).longueur || 0, passage: a.walkable(-3150, -1084) }; });
check('rue des Nations : vingt-trois pavillons en double rangée entre le pont des Invalides et le pont de l’Alma, à sec ; la rue entre les deux rangées reste praticable', ex2.nations === 23 && ex2.sec === 23 && ex2.rue && ex2.passage, JSON.stringify(ex2));
check('passerelles : deux sur la rue des Nations, et la passerelle Debilly et son arche, au-dessus de la Seine', ex2.passerelles === 3 && ex2.debilly > 20, JSON.stringify([ex2.passerelles, ex2.debilly]));
check('rive droite (Ville de Paris, serres, Congrès), Vieux Paris, palais des Armées, palais de l’Esplanade, colonies du Trocadéro', ex2.rive === 3 && ex2.vieux > 20 && ex2.armees > 25 && ex2.esplanade === 3 && ex2.colonies, JSON.stringify(ex2));
check('trottoir roulant : une boucle de 3 à 3,5 km sur viaduc', ex2.trottoir > 3000 && ex2.trottoir < 3500, String(ex2.trottoir));
const mt = await page.evaluate(() => { const a = window.__app, M = a.monuments.Metro, T = a.terrain; if (!M) return { n: 0 }; const E = M.entrees, al = a.v89.alignements.tous();
  return { n: E.length, sec: E.filter((e) => T.wetAt(e.x, e.z) < 0.05).length, rue: E.filter((e) => a.streetAt(e.x, e.z, 40)).length, ordre: E.every((e, i) => !i || e.x < E[i - 1].x),
    bouts: [E[0].nom, E[E.length - 1].nom], edicules: E.filter((e) => e.edicule).map((e) => e.nom).join(', '), h: E.map((e) => +(e.top - T.height(e.x, e.z)).toFixed(1)),
    arbres: E.filter((e) => al.some((p) => Math.hypot(p[0] - e.x, p[1] - e.z) < 3)).map((e) => e.nom), lieu: a.ui.places.some((p) => /m[ée]tropolitain/i.test(p.name)) }; });
check('métropolitain : dix-huit entrées de Guimard, de la porte de Vincennes à la porte Maillot dans l’ordre de la ligne, chacune sur sa rue, à sec, sans arbre contre elle ; des édicules à la Bastille et à l’Étoile', mt.n === 18 && mt.sec === 18 && mt.rue === 18 && mt.ordre && mt.bouts[0] === 'Porte de Vincennes' && mt.bouts[1] === 'Porte Maillot' && mt.edicules === 'Bastille, Étoile' && mt.h.every((h) => h > 3.5 && h < 7) && mt.arbres.length === 0 && mt.lieu, JSON.stringify(mt));

// ---------- silhouettes des monuments
const mo = await page.evaluate(() => { const a = window.__app, M = a.monuments, T = a.terrain, h = (m) => (m ? +(m.top - T.height(m.x, m.z)).toFixed(1) : -1), fl = a.landmarks.find((l) => l.nom === 'fleche');
  return { invalides: h(M.Invalides), pantheon: h(M.Pantheon), nd: h(M.NotreDame), fleche: fl ? +(fl.top - T.height(fl.x, fl.z)).toFixed(1) : -1, sulpice: h(M.Sulpice), trinite: h(M.Trinite), opera: h(M.Opera), institut: h(M.Institut), augustin: h(M.Augustin),
    vendome: h(M.Vendome), juillet: h(M.Juillet), arc: h(M.Arc), sc: h(M.SacreCoeur), halles: (M.Halles || {}).pavillons, hd: h(M.HotelDieu), sj: h(M.TourSaintJacques), clotilde: h(M.Clotilde) }; });
check('monuments : Invalides (107 m), Panthéon (83 m), Notre-Dame (69 et 96 m), Saint-Sulpice, la Trinité, l’Opéra, l’Institut, Saint-Augustin, les colonnes, l’Arc', mo.invalides === 107 && mo.pantheon === 83 && Math.abs(mo.nd - 69) < 1 && mo.fleche === 96 && mo.sulpice === 73 && mo.trinite === 65 && mo.opera === 56 && mo.institut === 46 && mo.augustin === 80 && mo.vendome === 44 && mo.juillet === 50 && mo.arc > 55 && mo.arc < 60, JSON.stringify(mo));
check('Sacré-Cœur : le grand dôme achevé en 1899, à 83 m ; Halles : dix pavillons ; Hôtel-Dieu, tour Saint-Jacques, Sainte-Clotilde', Math.abs(mo.sc - 83) < 0.5 && mo.halles === 10 && mo.hd > 25 && mo.sj === 52 && mo.clotilde === 69, JSON.stringify([mo.sc, mo.halles, mo.hd, mo.sj, mo.clotilde]));

// ---------- ports bas
const po = await page.evaluate(() => { const a = window.__app, T = a.terrain, R = a.v89.rives, S = a.stats.ports, N = T.niveauBas;
  let n = 0, bas = 0, haut = 0, sec = 0, mur = 0;
  // en 1900, les berges du pont des Invalides au Champ-de-Mars portent les pavillons de l'Exposition (rue des Nations,
  // Congrès, Vieux Paris, palais des Armées) : on n'y vérifie pas les ports
  const expo = (p) => p[0] < -2880 && p[0] > -3970 && p[1] > -1300 && p[1] < -830;
  for (let i = 0; i < R.bandes.length; i += 23) { if (R.bandes[i].fin0 || R.bandes[i].fin1 || expo(R.bandes[i].P)) continue;      // un bout de port porte son mur en travers
    const b = R.bandes[i], P = (k) => [(b.P[0] + b.Q[0]) / 2 + ((b.mP[0] + b.mQ[0]) / 2) * k, (b.P[1] + b.Q[1]) / 2 + ((b.mP[1] + b.mQ[1]) / 2) * k], w = (b.w0 + b.w1) / 2, m = P(w / 2), d = P(w + 5), r = P(w + 0.3);
    n++; if (Math.abs(T.height(m[0], m[1]) - N) < 0.01 && a.walkable(m[0], m[1])) bas++; if (T.height(d[0], d[1]) > N + 1.5) haut++; if (T.wetAt(m[0], m[1]) < 0.5) sec++; if (a.footAt(r[0], r[1])) mur++; }
  const nommes = [[-1219, -753], [212, 228], [123, -259], [473, 360], [-2440, -1125], [-1150, -588], [777, 292], [2513, 2431]].filter((p) => T.estBas(p[0], p[1])).length;
  return { S, n, bas, haut, sec, mur, nommes, ponts: a.v89.ponts.filter((p) => T.estBas(p.a[0], p.a[1]) || T.estBas(p.b[0], p.b[1])).length, niveau: N }; });
check('ports bas : une quinzaine de kilomètres le long de la Seine, deux mètres au-dessus de l’eau, au pied du mur du quai haut (on n’y passe pas à travers le mur) ; hors des berges que l’Exposition occupe', po.S.km > 10 && po.S.km < 25 && po.n > 100 && po.bas === po.n && po.sec === po.n && po.haut > 0.9 * po.n && po.mur > 0.9 * po.n, JSON.stringify(po));
check('ports bas : ceux que nomme la base de 1900 (Saint-Nicolas, la Tournelle, l’Hôtel de Ville, Saint-Bernard, les Invalides, Malaquais, les Célestins, Bercy) ; les ponts vont d’un quai haut à l’autre', po.nommes >= 7 && po.ponts === 0, JSON.stringify([po.nommes, po.ponts]));
const co = await page.evaluate(() => { const a = window.__app, P = a.people, cv = P.atlas.canvas, k = cv.width / 2048, x = cv.getContext('2d', { willReadFrequently: true }), px = (col, row, dy) => [...x.getImageData(Math.round((col * 256 + 60) * k), Math.round((512 + row * 640 + dy) * k), 1, 1).data].slice(0, 3);
  let i = 0; const r = () => ((i += 0.37) % 1), F = a.monde.figures(true);
  return { kepi: px(7, 0, 20), haut: px(1, 0, 20), canotier: px(5, 0, 20), garance: px(7, 0, 600), bonnet: px(1, 1, 20), soldat: F.outfit(r, 'man', 'guard'), soeur: F.outfit(r, 'robe', 'monk'), meme: P.outfit === a.monde.figures(true).outfit || typeof P.outfit === 'function' }; });
check('costumes de 1889 : képi et pantalon garance du fantassin, haut-de-forme noir, canotier de paille, bonnet blanc', co.kepi[0] > 140 && co.kepi[1] < 80 && co.garance[0] > 140 && co.garance[1] < 80 && co.haut[0] < 70 && co.haut[2] < 70 && co.canotier[0] > 180 && co.canotier[2] < 180 && co.bonnet[0] > 200 && co.bonnet[2] > 190, JSON.stringify(co));
check('costumes : le fantassin en capote, la sœur de charité en cornette', co.soldat.v[0] === 7 && co.soldat.col[2] > co.soldat.col[0] && co.soeur.v[0] === 5 && co.soeur.v[1] === 1 && co.soeur.v[2] === 7, JSON.stringify([co.soldat, co.soeur]));

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


// ---------- calque « origine du bâti »
const ca = await page.evaluate(() => { const a = window.__app, b = document.getElementById('btn-calque'), S = a.statuts, $ = (id) => document.getElementById(id);
  const lire = [S.lire(-2760, -1452), S.lire(-1696, -791), S.lire(-113, -204)];
  a.setView([-420, 700, 900], [-80, 20, -80]); a.rig.cur = { ...a.rig.goal }; a.rig.update(0);
  const px = () => { a.renderNow(); const gl = a.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, d = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, d); let vert = 0, rose = 0; for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], bl = d[i + 2]; if (g > r + 25 && g > bl + 12) vert++; if (r > g + 45 && bl > g + 8) rose++; } return [vert, rose]; };
  const avant = px(); b.click(); const on = S.uniforms.uStatut.value, leg = !$('legend').hidden, items = [...document.querySelectorAll('#legend-list li')].map((l) => l.textContent + ' : ' + l.title), apres = px();
  document.querySelector('#legend [data-close="legend"]').click();
  return { lire, compte: S.compte, avant, apres, on, leg, items, off: S.uniforms.uStatut.value, presse: b.getAttribute('aria-pressed'), cache: $('legend').hidden }; });
check('calque « origine du bâti » : réelle (datée de 1900 ou d’avant), probable, disparue, évoquée ; le Grand Palais et la gare d’Orsay réels, l’Hôtel-Dieu modelé à part', ca.on === 1 && ca.leg && ca.items.length === 4 && /1900 ou d’avant/.test(ca.items[0]) && ca.off === 0 && ca.presse === 'false' && ca.cache && ca.lire[0] === 1 && ca.lire[1] === 1 && ca.lire[2] === 0 && ca.compte[1] > 40000 && ca.compte[2] > 8000 && ca.compte[3] > 3000 && ca.compte[4] > 18000 && ca.apres[0] > ca.avant[0] + 2000 && ca.apres[1] > ca.avant[1] + 500, JSON.stringify(ca));

// ---------- repères, fiche, sources
const lx = await page.evaluate(() => { const a = window.__app, P = a.ui.places; return { n: P.length, noms: P.map((p) => p.name), cats: [...new Set(P.map((p) => p.cat))].length, hors: P.filter((p) => p.x < a.monde.cadre.x0 || p.x > a.monde.cadre.x1 || p.z < a.monde.cadre.z0 || p.z > a.monde.cadre.z1).length }; });
const attendus = ['Tour de 300 mètres', 'Palais de l’Électricité', 'Galerie des machines', 'Grande Roue', 'Grand Palais', 'Petit Palais', 'Pont Alexandre-III', 'Palais du Trocadéro', 'Champ-de-Mars', 'Rue des Nations', 'Vieux Paris', 'Esplanade des Invalides', 'Section des colonies', 'Trottoir roulant', 'Passerelle Debilly', 'Palais des Armées de terre et de mer', 'Palais des Mines et de la Métallurgie', 'Gare de Lyon', 'Tour de l’horloge de la gare de Lyon', 'Gare d’Orsay', 'Gare des Invalides', 'Pont Rouelle', 'Gare Saint-Lazare', 'Gare du Nord', 'Gare de l’Est', 'Gare d’Orléans', 'Gare Montparnasse', 'Gare de la Bastille', 'Gare de Sceaux', 'Petite Ceinture', 'Enceinte de Thiers', 'Notre-Dame', 'Dôme des Invalides', 'Arc de triomphe', 'Panthéon', 'Sacré-Cœur', 'Halles centrales', 'Hôtel-Dieu', 'Hôtel de Ville', 'Place de la Bastille'];
check('repères : la tour, l’Exposition de 1900, les gares neuves, les monuments ; plus de palais de l’Industrie ni de gare du Champ-de-Mars', lx.n >= 75 && lx.hors === 0 && lx.cats >= 4 && attendus.every((n) => lx.noms.includes(n)) && !lx.noms.some((n) => /Palais de l’Industrie|Gare du Champ-de-Mars|Dôme central|en chantier/.test(n)), `${lx.n} lieux ; manquent : ${attendus.filter((n) => !lx.noms.includes(n)).join(', ')}`);
await page.click('#btn-places');
await page.fill('#place-search', 'roue');
const liste = await page.evaluate(() => [...document.querySelectorAll('#place-list button, #place-list li')].map((b) => b.textContent).filter((t) => /Grande Roue/i.test(t)).length);
check('liste des lieux : la recherche trouve la Grande Roue', liste >= 1, String(liste));
await page.evaluate(() => { const a = window.__app; a.ui.select(a.ui.byId.get('tour-de-300-metres'), false); }); await frames(2);
const fiche = await page.evaluate(() => { const c = document.getElementById('card'); return { vu: !c.hidden, texte: c.textContent.slice(0, 400) }; });
check('fiche : la tour, repeinte en 1899', fiche.vu && /Tour de 300 mètres/.test(fiche.texte) && /1899/.test(fiche.texte), fiche.texte.slice(0, 90));
await page.evaluate(() => window.__app.ui.select(null));
await page.click('#btn-sources');
const src = await page.evaluate(() => { const d = document.getElementById('sources'); return { vu: !d.hidden, n: d.querySelectorAll('#sources-list li').length, t: d.textContent }; });
check('sources : APUR, base « Paris 1900 », atlas de Vasserot, IGN, voies ferrées, Exposition de 1900 (Picard, Revue technique) ; ce qui est réel et ce qui est évoqué', src.vu && src.n === 7 && /Voies ferrées/.test(src.t) && /Exposition de 1900/.test(src.t) && /Picard/.test(src.t) && /Revue technique/.test(src.t) && /Atelier parisien d’urbanisme/.test(src.t) && /Vasserot/.test(src.t) && /IGN/.test(src.t) && /Évoqué/.test(src.t) && /Pas encore modelé/.test(src.t) && !/1889 ou d’avant/.test(src.t), `${src.n} sources`);
await page.click('#sources [data-close="sources"]');
{ const og = await page.evaluate(() => (document.querySelector('meta[property="og:image"]') || {}).content || ''), { existsSync } = await import('node:fs');
  check('partage : l’image de la maquette (og:image, adresse absolue) est dans dist/og/', /^https:\/\/.+\/dist\/og\/1900\.jpg$/.test(og) && existsSync(join(root, 'dist/og/1900.jpg')), og); }

// ---------- parcours commenté
const vi = await page.evaluate(async () => { const a = window.__app, V = a.ui.visite, $ = (id) => document.getElementById(id), tic = (n) => { for (let i = 0; i < n; i++) { a.rig.update(0.05); a.emit('frame', 0.05); } };
  $('mode-tour').click(); const t0 = { panneau: !$('tour').hidden, titre: $('tour-title').textContent, compte: $('tour-count').textContent, texte: $('tour-text').textContent.length, mode: $('mode-tour').getAttribute('aria-pressed'), points: document.querySelectorAll('#tour-dots button').length };
  $('tour-next').click(); tic(80); const e1 = V.etat(), p = a.ui.places.find((q) => q.name === e1.lieu), pres = p ? Math.round(Math.hypot(a.rig.cur.x - p.x, a.rig.cur.z - p.z)) : -1, fiche = !$('tour-card').hidden;
  for (let i = 0; i < 1500 && V.etat().k === e1.k; i++) tic(1); const e2 = V.etat();
  $('tour-stop').click(); const fin = { actif: V.etat().actif, panneau: !$('tour').hidden, survol: $('mode-fly').getAttribute('aria-pressed') };
  return { t0, e1, pres, fiche, e2, fin, manquants: V.manquants }; });
check('parcours commenté « Paris en 1900 » : 18 étapes, chaque lieu existe, la vue s’y rend, l’étape suivante vient seule, « Terminer » rend le survol', vi.t0.panneau && vi.t0.mode === 'true' && vi.t0.titre === 'Paris en 1900' && vi.t0.compte === '1 / 18' && vi.t0.points === 18 && vi.t0.texte > 80 && vi.e1.k === 1 && vi.pres >= 0 && vi.pres < 30 && vi.fiche && vi.e2.k === 2 && !vi.fin.actif && !vi.fin.panneau && vi.fin.survol === 'true' && vi.manquants.length === 0, JSON.stringify(vi));

// ---------- heure, marche, frise
const nuit = await page.evaluate(() => { const a = window.__app; a.setHour(22); const n = a.materials.facade.emissiveIntensity; a.setHour(10.5); return [n, a.materials.facade.emissiveIntensity]; });
check('heure : la nuit, les fenêtres s’éclairent', nuit[0] > 0.5 && nuit[1] < 0.05, JSON.stringify(nuit));
await page.click('#mode-walk'); await frames(6);
const marche = await page.evaluate(() => { const a = window.__app, w = a.rig.walk || {}; return { mode: a.rig.mode, x: w.x, z: w.z, ok: a.rig.mode === 'walk' ? a.walkable(w.x, w.z) : false, rue: a.streetAt(-3930, -700, 80) }; });
check('à pied : on marche sur un sol libre, les rues ont leur nom de 1900', marche.mode === 'walk' && marche.ok && typeof marche.rue === 'string' && marche.rue.length > 3, JSON.stringify(marche));
await page.click('#mode-fly'); await frames(3);
await page.click('#btn-epoch');
const fr = await page.evaluate(() => { const l = [...document.querySelectorAll('#frise-jalons a')]; return { ouvert: !document.getElementById('frise').hidden, noms: l.map((a) => a.textContent).join(' '), liens: l.map((a) => a.getAttribute('href')), ici: (l.find((a) => a.getAttribute('aria-current') === 'page') || {}).textContent, site: document.getElementById('brand-site').textContent, titre: document.title, dock: document.getElementById('epoch-label').textContent }; });
check('frise des dates : 1900 en cours ; Lutèce, 1380, 1789 et 1889 mènent aux autres maquettes', fr.ouvert && fr.noms === 'Lutèce 1300 1380 1553 1652 1741 1789 1836 1889 1900' && fr.ici === '1900' && fr.dock === '1900' && fr.liens[0] === 'index.html#m=lutece' && fr.liens[2] === 'index.html' && fr.liens[6] === 'index.html#m=1789' && fr.liens[8] === 'index.html#m=1889' && fr.liens[9] === null && fr.site === 'Paris à travers le temps' && /^Paris à travers le temps — Paris 1900/.test(fr.titre), JSON.stringify(fr));

// ---------- téléphone : version allégée
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p2 = await ctx.newPage(); watch(p2); p2.setDefaultTimeout(120000);
  await p2.goto(URL + '#shot'); await p2.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 300000 });
  const m = await p2.evaluate(() => { const a = window.__app; return { rate: window.__failed || '', mobile: a.mobile, tris: a.stats.tris, bati: a.stats.bati }; });
  check('téléphone : la page démarre en version allégée (toits plats)', !m.rate && m.mobile && m.bati > 80000 && m.tris < v.tris * 0.8, JSON.stringify(m));
  await ctx.close(); }

// ---------- adresse courte et lien vers une autre maquette
{ const p2 = await browser.newPage({ viewport: { width: 900, height: 600 } });
  await p2.goto('file://' + join(root, '1900.html') + '?x=1#c=-3900,-520,900');
  const bon = await p2.waitForURL(/dist\/index\.html\?x=1#m=1900&c=-3900,-520,900/, { timeout: 60000 }).then(() => true).catch(() => false);
  check('adresse courte : 1900.html, à la racine du site, mène à la page d’accueil sur Paris 1900 en gardant le lien partagé', bon, p2.url().slice(-60));
  await p2.close(); }
const nav = page.waitForURL(/index\.html#m=1889&/, { timeout: 60000 }).then(() => true).catch(() => false);
await page.click('#btn-1889');
check('bouton « Paris 1889 » : la page, ouverte seule, mène à la maquette de 1889 par la page d’accueil', await nav, page.url().slice(-60));
await page.close();

check('aucune erreur ni avertissement console', errors.length === 0, errors.length ? '\n' + [...new Set(errors)].slice(0, 8).join('\n') : '');
console.log(`\n${ok} vérifications réussies, ${ko} échec(s)`);
await browser.close();
process.exit(ko ? 1 : 0);
