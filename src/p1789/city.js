// Construction de Paris à la veille de la Révolution : sol peint d'après le plan, bâti de l'Atlas de Vasserot dressé
// en volumes, îlots non couverts par l'atlas évoqués par un bâti de bordure, mur des Fermiers généraux, arbres.
import * as THREE from 'three';
import { buildMonuments } from './monuments.js';
import { solidShim, gothique } from './eglises.js';
import { buildQuais } from './quais.js';
import { QUAIS } from './terrain.js';
import { CADRE, bati, batiNom, batiEnclos, enclos, ilots, ilotDocumente, eau, mur, jardins, rues, eglises } from './data.js';
import { makeMaterials89 } from './textures.js';
import { hash, hex, ENDUITS, ARDOISE, PIERRE, ardoise, tuile, building } from './blocks.js';
import { Builder, ccw } from '../builder.js';
import { polyArea, centroid, mulberry32, offsetEx, difference, pointInPoly, clamp } from '../geom.js';

export const CENTRE = { x: -250, z: -500 };              // cœur dense de la ville (entre les Halles et le Châtelet)
export const TUILE = 1600;                               // côté du motif de campagne (m)

// ---------------------------------------------------------------- peinture du sol
// Motif de campagne répétable : lanières de cultures, prés, jachères.
export function makeFieldsTile(n = 512) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d', { willReadFrequently: true }), r = mulberry32(1791), cols = ['#8a9a5b', '#9aa868', '#a8a070', '#b3a878', '#7f9458', '#94a060', '#a39a6a', '#8c9c66', '#9c9460'];
  x.fillStyle = '#8f9c62'; x.fillRect(0, 0, n, n);
  for (let i = 0; i < 170; i++) {
    const cx = r() * n, cy = r() * n, w = 20 + r() * 70, h = 6 + r() * 26, a = (r() < 0.5 ? 0.3 : 1.2) + (r() - 0.5) * 0.5; x.fillStyle = cols[Math.floor(r() * cols.length)];
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) { x.save(); x.translate(cx + ox, cy + oy); x.rotate(a); x.fillRect(-w / 2, -h / 2, w, h); x.restore(); }
  }
  return c;
}

const ring = (x, T, r) => { x.moveTo(T.x(r[0][0]), T.y(r[0][1])); for (let i = 1; i < r.length; i++) x.lineTo(T.x(r[i][0]), T.y(r[i][1])); x.closePath(); };
const fill = (x, T, polys, style) => { x.fillStyle = style; x.beginPath(); for (const rings of polys) for (const r of rings) ring(x, T, r); x.fill('evenodd'); };
const stroke = (x, T, polys, style, w) => { x.strokeStyle = style; x.lineWidth = w; x.lineJoin = 'round'; x.beginPath(); for (const rings of polys) for (const r of rings) ring(x, T, r); x.stroke(); };

// Classe d'un îlot : 'c' bâti (cours), 'j' jardins et marais, 'r' rural.
export function ilotClasses() {
  // un grand îlot que l'atlas documente n'est bâti qu'en partie : le reste est un enclos de jardins (Luxembourg, couvents)
  return ilots().map((rings, i) => { const a = Math.abs(polyArea(rings[0])); return ilotDocumente(i) ? (a < 40000 ? 'c' : 'j') : a < 15000 ? 'c' : a < 60000 ? 'j' : 'r'; });
}

// Enclos nommés par l'atlas : jardins et promenades plantées d'un côté, places et terrains sablés de l'autre.
export const ENC_JARDIN = /^(Jardin|Parc|Les Champs Elys|Clos|Esplanade|Palais de la Chambre des Pairs)/, ENC_SABLE = /^(Place|Champ de Mars|Marché)/;

// Contour de la ville : le point du mur des Fermiers généraux le plus éloigné du centre, par secteur d'un demi-degré.
// Tout ce qui s'y trouve hors des îlots et du fleuve est de l'espace public : rues, quais, places.
let enceinte = null;
export function contourVille() {
  if (enceinte) return enceinte;
  const N = 720, far = new Array(N).fill(null);
  for (const rings of mur()) for (const p of rings[0]) { const dx = p[0] - CENTRE.x, dz = p[1] - CENTRE.z, k = Math.floor(((Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI)) * N) % N, d = dx * dx + dz * dz; if (!far[k] || d > far[k].d) far[k] = { d, p }; }
  return (enceinte = far.filter(Boolean).map((f) => f.p));
}

// T : { s (pixels par mètre), x(xMonde), y(zMonde) }.
export function paintPlan(x, T, tile, cls, ext = [], quais = []) {
  const s = T.s, pat = x.createPattern(tile, 'repeat'), k = (TUILE * s) / tile.width;
  pat.setTransform(new DOMMatrix().translate(T.x(0), T.y(0)).scale(k));
  x.fillStyle = pat; x.fillRect(0, 0, x.canvas.width, x.canvas.height);
  const by = { c: [], j: [], r: [] }; ilots().forEach((rings, i) => by[cls[i]].push(rings));
  const PAVE = 'rgb(150,143,130)', fin = s > 0.5;                                          // fin : toile du centre, assez précise pour les détails
  fill(x, T, [[contourVille()]], PAVE);                                                   // dans le mur, l'espace public est pavé
  fill(x, T, by.r, pat);                                                                  // les îlots ruraux gardent leurs cultures
  stroke(x, T, by.r, 'rgba(176,160,128,0.9)', Math.max(1.5, 9 * s));                     // chemins des faubourgs
  stroke(x, T, by.c.concat(by.j), PAVE, Math.max(2, 15 * s));                             // chaussées
  fill(x, T, by.j, 'rgb(134,148,96)'); stroke(x, T, by.j, 'rgba(96,104,70,0.6)', Math.max(0.6, 1.2 * s));
  fill(x, T, by.c, 'rgb(180,168,144)');                                                   // cours : terre battue, plus claire que le pavé
  fill(x, T, jardins(), 'rgb(104,134,78)');
  fill(x, T, enclos().filter((e) => ENC_JARDIN.test(e.nom)).map((e) => e.rings), 'rgb(108,138,80)');
  fill(x, T, enclos().filter((e) => ENC_SABLE.test(e.nom)).map((e) => e.rings), 'rgb(200,188,160)');
  if (fin) {                                                                              // ruisseau au milieu des rues
    x.strokeStyle = 'rgba(88,80,70,0.34)'; x.lineWidth = Math.max(1, 1.1 * s); x.lineJoin = 'round'; x.beginPath();
    for (const r of rues()) { x.moveTo(T.x(r.pts[0][0]), T.y(r.pts[0][1])); for (let i = 1; i < r.pts.length; i++) x.lineTo(T.x(r.pts[i][0]), T.y(r.pts[i][1])); }
    x.stroke();
  }
  // prolongements du fleuve au-delà de ce que dessine le plan
  const reach = ext.map((e) => { const q = (t, d) => [e.x + e.dx * t - e.dz * d, e.z + e.dz * t + e.dx * d]; return [[q(-140, -e.half), q(4000, -e.half), q(4000, e.half), q(-140, e.half)]]; });
  stroke(x, T, eau().concat(reach), 'rgb(186,176,150)', Math.max(2, 12 * s));                                                      // grèves
  fill(x, T, eau().concat(reach), 'rgb(84,104,110)');                                                                               // lit du fleuve
  x.save(); x.beginPath(); x.rect(T.x(QUAIS.x0), 0, (QUAIS.x1 - QUAIS.x0) * s, x.canvas.height); x.clip(); stroke(x, T, eau(), PAVE, Math.max(3, 9 * s)); fill(x, T, eau(), PAVE);   // quais pavés, jusqu'au mur
  fill(x, T, quais.map((q) => [q.outer.map((p) => p.a), ...q.holes.map((h) => h.map((p) => p.a))]), 'rgb(84,104,110)'); x.restore();                            // côté fleuve des murs : de l'eau
  if (fin) {                                                                              // ombre au pied des murs, un corps à la fois (un seul tracé pour tous serait très lent)
    x.strokeStyle = 'rgba(44,36,28,0.2)'; x.lineWidth = 6 * s; x.lineJoin = 'bevel';
    for (const rings of bati()) { x.beginPath(); ring(x, T, rings[0]); x.stroke(); }
  }
  fill(x, T, bati(), 'rgb(104,100,98)');
  fill(x, T, mur(), 'rgb(214,196,150)'); stroke(x, T, mur(), 'rgb(214,196,150)', Math.max(1, 2.5 * s));
}

// Nombre d'étages selon la distance au centre : la ville s'abaisse vers les faubourgs.
function floorsAt(x, z, id, area) {
  const r = Math.hypot(x - CENTRE.x, z - CENTRE.z), h = hash(id, 1);
  let f = r < 900 ? 5 : r < 1700 ? 4 : r < 2600 ? 3 : 2;
  f += h < 0.24 ? -1 : h > 0.8 ? 1 : 0;
  if (area < 26) f = Math.min(f, 1 + (hash(id, 2) < 0.4 ? 1 : 0)); else if (area < 60) f -= 1;
  return clamp(f, 1, 7);
}

const MUR = hex(0xd9c9a4);
// Part des combles brisés (à la Mansart) selon la distance au centre : la mode en est urbaine et récente.
const partBrises = (r) => (r < 1300 ? 0.4 : r < 2300 ? 0.28 : 0.06);

const EGLISE = /^(eglise|église|temple protestant|saint denis du)|eglise saint paul/i;
// églises encore gothiques en 1789 parmi celles que l'atlas nomme ; paroisses rebâties à la moderne
const GOTHIQUE = /Saint Germain (l'Auxerrois|des Prés)|Saint Gervais|Saint Séverin|Saint Méry/, CLASSIQUE = /Roch|Louis|Philippe/;

// Emprises infranchissables, rangées par cases de 48 m : app.footAt(x, z) rend l'emprise qui couvre le point.
function indexFoot(app) {
  const CELL = 48, cells = new Map();
  for (const f of app.foot) {
    if (f.x0 == null) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of f.ring) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; } f.x0 = x0; f.z0 = z0; f.x1 = x1; f.z1 = z1; }
    for (let i = Math.floor(f.x0 / CELL); i <= Math.floor(f.x1 / CELL); i++) for (let k = Math.floor(f.z0 / CELL); k <= Math.floor(f.z1 / CELL); k++) { const key = (i + 2048) * 4096 + k + 2048; let l = cells.get(key); if (!l) cells.set(key, (l = [])); l.push(f); }
  }
  app.footAt = (x, z) => { const l = cells.get((Math.floor(x / CELL) + 2048) * 4096 + Math.floor(z / CELL) + 2048); if (l) for (const f of l) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && pointInPoly(x, z, f.ring)) return f; return null; };
}

export async function buildCity89(app, step) {
  const T = app.terrain, B = new Builder(), mats = (app.materials = makeMaterials89(app.mobile ? 0.5 : 1));
  app.foot = []; app.landmarks = []; solidShim(app);
  const pause = () => new Promise((r) => setTimeout(r, 0));

  await step('Les maisons de l’Atlas de Vasserot…', 0.3);
  const polys = bati();
  // églises paroissiales et collégiales de 1789 dont l'atlas garde l'emprise : elles sont bâties en églises, non en maisons
  const par = new Map(); app.paroisses = new Set();
  for (const e of eglises()) {
    if (!/paroissiale|collégiale/.test(e.statut)) continue;
    let best = -1, ba = 300;
    for (let i = 0; i < polys.length; i++) { const r = polys[i][0]; if (!pointInPoly(e.x, e.z, r)) continue; const a = Math.abs(polyArea(r)); if (a > ba && !batiEnclos(i) && batiNom(i) !== 'Notre Dame') { best = i; ba = a; } }
    if (best >= 0) par.set(best, e);
  }
  for (let i = 0; i < polys.length; i++) {
    const rings = polys[i], area = Math.abs(polyArea(rings[0])), c = centroid(rings[0]), nom = batiNom(i), egl = par.get(i);
    if (nom === 'Notre Dame') { app.ndRing = rings[0]; app.landmarks.push({ nom, x: c[0], z: c[1], top: T.height(c[0], c[1]) + 69, area }); continue; }   // bâtie avec les monuments
    if (egl ? !CLASSIQUE.test(egl.nom) : !!nom && GOTHIQUE.test(nom) && area > 250) {
      const top = gothique(app, B, rings[0], i);
      if (top) { if (egl) app.paroisses.add(egl.nom); if (nom) app.landmarks.push({ nom, x: c[0], z: c[1], top, area }); continue; }
    }
    let exs = rings.length > 1 ? difference([rings[0]], rings.slice(1)) : [{ outer: rings[0], holes: [] }];
    if (batiEnclos(i)) { const inner = offsetEx(exs, -15); if (inner.length) exs = difference(exs, inner); }
    const r = Math.hypot(c[0] - CENTRE.x, c[1] - CENTRE.z), mansard = area > 60 && hash(i, 3) < partBrises(r), slate = mansard || hash(i, 13) < (r < 2300 ? 0.22 : 0.08);
    let o;
    if (egl || (nom && EGLISE.test(nom) && area > 250)) o = { kind: 'eglise', h: clamp(11 + Math.sqrt(area) * 0.22, 13, 26), col: PIERRE, area };
    else if (nom && area > 400) o = { kind: 'public', floors: area > 3000 ? 4 : 3, col: PIERRE, roof: ARDOISE, mansard: true, area };
    else o = { kind: 'maison', floors: floorsAt(c[0], c[1], i, area), col: ENDUITS[Math.floor(hash(i, 4) * ENDUITS.length)], roof: slate ? ardoise(i) : tuile(i), mansard, area };
    o.reel = true;                                         // emprise donnée par l'atlas, par opposition au bâti évoqué
    let top = 0; for (const ex of exs) if (ex.outer.length >= 3) top = Math.max(top, building(app, B, ex, i, o));
    if (nom && area > 250) app.landmarks.push({ nom, x: c[0], z: c[1], top, area });
    if (i % 2500 === 2499) { await step('Les maisons de l’Atlas de Vasserot…', 0.3 + 0.32 * (i / polys.length)); await pause(); }
  }
  app.stats = { bati: polys.length };

  await step('Dômes, tours et clochers…', 0.62);
  indexFoot(app);                                        // les monuments se calent sur les emprises de l'atlas
  buildMonuments(app, B);
  const taken = (ring) => app.reserve.some((p) => pointInPoly(p[0], p[1], ring));

  await step('Faubourgs et îlots que l’atlas ne couvre pas…', 0.64);
  const cls = app.ilotCls, all = ilots(); let evoques = 0; app.gardens = [];
  for (let i = 0; i < all.length; i++) {
    if (ilotDocumente(i)) { if (cls[i] === 'j') app.gardens.push({ ring: all[i][0], dens: 0.16 }); continue; }
    if (taken(all[i][0])) continue;                        // îlot d'un monument ou d'un enclos nommé : pas de bâti évoqué par-dessus
    const rings = all[i], outer = rings[0], area = Math.abs(polyArea(outer)), c = centroid(outer), r = Math.hypot(c[0] - CENTRE.x, c[1] - CENTRE.z);
    if (cls[i] === 'c') {                                  // îlot bâti : une bordure de maisons autour d'une cour
      const depth = r < 2000 ? 11 : 9, inner = offsetEx([{ outer, holes: rings.slice(1) }], -depth), po = ccw(outer);
      if (!inner.length || area < 900) { building(app, B, { outer, holes: [] }, 50000 + i, { kind: 'maison', floors: Math.max(2, floorsAt(c[0], c[1], 50000 + i, 400) - 1), col: ENDUITS[Math.floor(hash(i, 6) * ENDUITS.length)], roof: hash(i, 3) < partBrises(r) ? ardoise(i) : tuile(i), mansard: hash(i, 3) < partBrises(r), area }); evoques++; }
      else {
        for (let e = 0; e < po.length; e++) {
          const a = po[e], b = po[(e + 1) % po.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 7) continue;
          const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L; let nx = -uz, nz = ux; if (!pointInPoly((a[0] + b[0]) / 2 + nx * 3, (a[1] + b[1]) / 2 + nz * 3, po)) { nx = -nx; nz = -nz; }
          const n = Math.max(1, Math.round(L / (10 + hash(i * 31 + e, 7) * 6))), w = L / n;
          for (let k = 0; k < n; k++) {
            const id = 50000 + i * 131 + e * 17 + k, d = depth - 2.5 * hash(id, 9), s0 = k * w, q = (s, t) => [a[0] + ux * s + nx * t, a[1] + uz * s + nz * t];
            building(app, B, { outer: [q(s0, 0), q(s0 + w, 0), q(s0 + w, d), q(s0, d)], holes: [] }, id, { kind: 'maison', floors: Math.max(2, floorsAt(c[0], c[1], id, 400) - 1), col: ENDUITS[Math.floor(hash(id, 12) * ENDUITS.length)], roof: hash(id, 3) < partBrises(r) ? ardoise(id) : tuile(id), mansard: hash(id, 3) < partBrises(r), area: w * d }); evoques++;
          }
        }
        if (area > 3000) app.gardens.push({ ring: inner[0].outer, dens: 0.35 });
      }
    } else {                                               // jardins, marais, champs : quelques maisons le long des rues
      const p = cls[i] === 'j' ? 0.42 : 0.14; let run = 0;
      for (let e = 0; e < outer.length; e++) {
        const a = outer[e], b = outer[(e + 1) % outer.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1) continue;
        const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
        for (let t = Math.max(6, (20 - run) % 20); t < L - 6; t += 20) {
          const id = 80000 + i * 97 + e * 13 + Math.floor(t); if (hash(id, 8) > p) continue;
          const w = 8 + hash(id, 9) * 6, d = 7 + hash(id, 10) * 3, mx = a[0] + ux * t, mz = a[1] + uz * t;
          let nx = -uz, nz = ux; if (!pointInPoly(mx + nx * 6, mz + nz * 6, outer)) { nx = -nx; nz = -nz; }
          if (!pointInPoly(mx + nx * (d + 4), mz + nz * (d + 4), outer)) continue;
          const q = (s, k) => [mx + ux * s + nx * k, mz + uz * s + nz * k], rect = [q(-w / 2, 3), q(w / 2, 3), q(w / 2, 3 + d), q(-w / 2, 3 + d)];
          if (rect.some((pt) => T.wetAt(pt[0], pt[1]) > 0.1)) continue;
          building(app, B, { outer: rect, holes: [] }, id, { kind: 'maison', floors: 1 + (hash(id, 11) < 0.6 ? 1 : 0), col: ENDUITS[Math.floor(hash(id, 12) * ENDUITS.length)], roof: tuile(id), mansard: false, area: w * d }); evoques++;
        }
        run = (run + L) % 20;
      }
      if (cls[i] === 'j') app.gardens.push({ ring: outer, dens: 0.2 });
    }
    if (i % 200 === 199) await pause();
  }
  app.stats.evoques = evoques;

  await step('Quais et ponts…', 0.71);
  buildQuais(app, B);

  await step('Le mur des Fermiers généraux…', 0.72);
  for (const rings of mur()) {
    const r = ccw(rings[0]), c = centroid(r), b = B.at('stone', c[0], c[1]);
    for (let i = 0; i < r.length; i++) {
      const a = r[i], d = r[(i + 1) % r.length], L = Math.hypot(d[0] - a[0], d[1] - a[1]); if (L < 0.3) continue;
      const ya = T.height(a[0], a[1]), yd = T.height(d[0], d[1]);
      b.quad(d[0], yd - 0.6, d[1], a[0], ya - 0.6, a[1], a[0], ya + 3.3, a[1], d[0], yd + 3.3, d[1], L * 0.25, 0, 0, 1, MUR, 0.8, 1);
    }
    app.foot.push({ ring: r, top: T.height(c[0], c[1]) + 3.3, wall: true });
  }
  for (const g of jardins()) app.gardens.push({ ring: g[0], dens: Math.abs(polyArea(g[0])) > 20000 ? 0.5 : 0.3 });
  for (const e of enclos()) { const m = ENC_JARDIN.exec(e.nom); if (m) app.gardens.push({ ring: e.rings[0], dens: /Champs/.test(e.nom) ? 0.55 : /Esplanade/.test(e.nom) ? 0.12 : 0.3 }); }

  await step('Assemblage de la ville…', 0.78);
  app.cityMeshes = B.finish(app.scene, mats);
  app.stats.tris = Math.round(B.tris);

  indexFoot(app);

  await step('Jardins et vergers…', 0.86);
  app.trees = buildTrees(app);

  // rues nommées : pour dire où l'on se trouve
  const SC = 64, seg = new Map();
  for (const r of rues()) { if (!r.nom) continue; for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; for (let x = Math.floor(Math.min(a[0], b[0]) / SC); x <= Math.floor(Math.max(a[0], b[0]) / SC); x++) for (let z = Math.floor(Math.min(a[1], b[1]) / SC); z <= Math.floor(Math.max(a[1], b[1]) / SC); z++) { const key = (x + 2048) * 4096 + z + 2048; let l = seg.get(key); if (!l) seg.set(key, (l = [])); l.push([a, b, r.nom]); } } }
  app.streetAt = (x, z, max = 28) => {
    let best = null, bd = max;
    for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) { const l = seg.get((Math.floor(x / SC) + i + 2048) * 4096 + Math.floor(z / SC) + k + 2048); if (!l) continue; for (const [a, b, nom] of l) { const dx = b[0] - a[0], dz = b[1] - a[1], t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1), d = Math.hypot(a[0] + t * dx - x, a[1] + t * dz - z); if (d < bd) { bd = d; best = nom; } } }
    return best;
  };
  app.eglises = eglises();

  // trame des voies pour la foule : la ville dense, hors des îlots, du fleuve et des bâtiments ; places et promenades comprises
  await step('Les Parisiens descendent dans la rue…', 0.93);
  { const R = app.navRect, cell = app.mobile ? 2.5 : 1.5, w = Math.round(R.w / cell), h = Math.round(R.h / cell), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d', { willReadFrequently: true }), TT = { s: 1 / cell, x: (v) => (v - R.x) / cell, y: (v) => (v - R.z) / cell };
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    fill(x, TT, ilots(), '#000');
    fill(x, TT, enclos().filter((e) => ENC_SABLE.test(e.nom) || /^(Jardin des Tuileries|Les Champs Elys|Esplanade)/.test(e.nom)).map((e) => e.rings), '#fff');
    fill(x, TT, eau(), '#000');
    fill(x, TT, app.quaiPans.map((q) => [q.outer.map((p) => p.a), ...q.holes.map((h) => h.map((p) => p.a))]), '#000');      // becs de pile, devant les murs
    x.fillStyle = '#000'; x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); for (const f of app.foot) ring(x, TT, f.ring); x.fill(); x.stroke();
    const im = x.getImageData(0, 0, w, h).data, data = new Uint8Array(w * h); for (let i = 0; i < data.length; i++) data[i] = im[i * 4] > 200 ? 1 : 0;
    app.nav = { data, w, h, x0: R.x, z0: R.z, cell }; }
}

// Arbres des jardins : une seule géométrie (tronc et houppier), instanciée.
function buildTrees(app) {
  const T = app.terrain, r = mulberry32(17), pts = [];
  for (const g of app.gardens) {
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of g.ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const pas = 11;
    for (let x = x0; x < x1; x += pas) for (let z = z0; z < z1; z += pas) {
      if (r() > g.dens) continue;
      const px = x + r() * pas, pz = z + r() * pas;
      if (!pointInPoly(px, pz, g.ring) || app.footAt(px, pz) || T.wetAt(px, pz) > 0.05) continue;
      pts.push(px, T.height(px, pz), pz, 0.75 + r() * 0.7, r());
      if (pts.length >= 5 * 14000) break;
    }
  }
  const crown = new THREE.IcosahedronGeometry(1, 0), trunk = new THREE.CylinderGeometry(0.16, 0.22, 1, 4, 1, true);
  crown.scale(2.6, 3.1, 2.6); crown.translate(0, 5.6, 0); trunk.scale(1, 3.2, 1); trunk.translate(0, 1.6, 0);
  const paint = (g0, c) => { const g = g0.index ? g0.toNonIndexed() : g0, n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const a = paint(crown, [1, 1, 1]), b = paint(trunk, [0.35, 0.26, 0.18]), n = a.attributes.position.count + b.attributes.position.count;
  const geo = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'color']) { const arr = new Float32Array(n * 3); arr.set(a.attributes[k].array, 0); arr.set(b.attributes[k].array, a.attributes[k].array.length); geo.setAttribute(k, new THREE.BufferAttribute(arr, 3)); }
  const count = pts.length / 5, mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }), count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const k = pts[i * 5 + 3], t = pts[i * 5 + 4];
    p.set(pts[i * 5], pts[i * 5 + 1] - 0.1, pts[i * 5 + 2]); s.set(k, k * (0.9 + t * 0.3), k); q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, t * 6.28);
    mesh.setMatrixAt(i, m.compose(p, q, s)); mesh.setColorAt(i, col.setRGB(0.24 + t * 0.12, 0.38 + t * 0.13, 0.17 + t * 0.06, THREE.SRGBColorSpace));
  }
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = count;
  app.scene.add(mesh); app.treeCount = count;
  return mesh;
}
