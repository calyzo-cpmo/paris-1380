// Calque temporel : Paris à d'autres époques, posé sur la maquette de 1380.
// Données : couches du SIG ALPAGE (enceintes, îlots de 1300 à 1836, Lutèce, établissements religieux, hydrographie),
// recalées dans le repère de la maquette par tools/extract_epochs.py (data/epoques.json, licence ODbL 1.0).
// Pour chaque époque : un dessin au sol et sur le mini-plan ; en volume, les îlots bâtis après 1380, les enceintes
// nouvelles et quelques édifices ; pour les époques antérieures, ce qui n'existe pas encore est rendu en pointillé.
import * as THREE from 'three';
import E from '../data/epoques.json';
import { decodePolys, decodeLines } from './vlq.js';
import { FRAME } from './data.js';
import { LU } from './raster.js';

export const EPOQUES = E;

// Jalons de la frise. `egl` : année retenue pour les établissements religieux (la couche s'arrête à 1790).
export const JALONS = [
  { id: 'lutece', label: 'Lutèce', an: 250, titre: 'Lutèce, ville romaine', lutece: true, passe: 2,
    texte: 'La ville romaine s’étend surtout sur la rive gauche, autour d’un quadrillage de rues. Rues et rivages sont ceux qu’a restitués l’archéologue Théodore Vacquer au XIXe siècle ; cinq grands monuments sont situés : le forum, le théâtre, les arènes, les thermes du Nord (ceux de Cluny) et les thermes de l’Est.' },
  { id: '1300', label: '1300', an: 1300, titre: 'Paris en 1300', ilots: '1300', egl: 1300, passe: 1,
    texte: 'Les îlots d’habitation sont restitués d’après les rôles de la taille de 1299 et 1300. La ville tient dans l’enceinte de Philippe Auguste ; sur la rive droite, faute de connaître la limite exacte de l’urbanisation, les îlots extérieurs ont été prolongés jusqu’au futur mur de Charles V.' },
  { id: '1380', label: '1380', an: 1380, titre: 'Paris vers 1380', base: true,
    texte: 'La maquette : Paris à la fin du règne de Charles V, d’après le plan restitué de 1380.' },
  { id: '1553', label: '1553', an: 1553, titre: 'Paris vers 1553', ilots: '1553', egl: 1553, futur: true,
    texte: 'D’après le plan de Truschet et Hoyau, dit plan de Bâle, qui montre la ville vers 1552-1553. La densité de chaque îlot est celle que figure le plan.' },
  { id: '1652', label: '1652', an: 1652, titre: 'Paris vers 1652', ilots: '1652', egl: 1652, futur: true,
    texte: 'D’après le plan de Gomboust, qui montre la ville vers 1652. Sur la rive droite, l’enceinte des Fossés jaunes a repoussé la limite de la ville vers l’ouest.' },
  { id: '1741', label: '1741', an: 1741, titre: 'Paris vers 1741', ilots: '1741', egl: 1741, futur: true,
    texte: 'D’après le plan de Delagrive, levé en 1728 avec une triangulation rigoureuse et mis à jour vers 1741. Les anciennes enceintes ne sont plus que des tracés.' },
  { id: '1791', label: '1791', an: 1791, titre: 'Paris en 1791', ilots: '1791', egl: 1789, eau: '1791', futur: true,
    texte: 'D’après le plan de Verniquet, levé de 1782 à 1790. Le mur des Fermiers généraux, bâti de 1784 à 1790, entoure la ville. Les établissements religieux sont ceux de 1789, à la veille de leur suppression.' },
  { id: '1836', label: '1836', an: 1836, titre: 'Paris vers 1836', ilots: '1836', eau: '1836', futur: true,
    texte: 'D’après l’Atlas par îlots de Philibert Vasserot, dressé de 1810 à 1836 : la ville avant les percées du Second Empire.' },
];
export const jalon = (id) => JALONS.find((j) => j.id === id) || JALONS.find((j) => j.base);

// ---------------------------------------------------------------- géométries décodées à la demande
const cache = new Map();
const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
export const ilotsOf = (y) => memo('i' + y, () => decodePolys(E.ilots[y].g, E.ilots[y].q));
export const eauOf = (y) => memo('e' + y, () => decodePolys(E.eau[y].g, E.eau[y].q));
export const enceintes = () => memo('w', () => E.enceintes.map((w) => ({ ...w, polys: decodePolys(w.g, w.q) })));
export const lutece = () => memo('l', () => ({ rues: decodeLines(E.lutece.rues), eau: decodeLines(E.lutece.eau), monuments: E.lutece.monuments.map((m) => ({ nom: m.nom, polys: decodePolys(m.g, m.q) })) }));
export const futur = () => memo('f', () => E.futur.objets.map((o) => ({ ...o, polys: decodePolys(o.g, o.q) })));

// État d'une enceinte à une date : 0 pas encore bâtie, 1 en élévation, 2 ancien tracé.
export const wallState = (w, an) => (an < w.debut ? 0 : an < w.jusqu ? 1 : 2);
// Établissements religieux en activité une année donnée (dates de début et de fin les plus sûres de la couche).
export function eglisesAt(an) { return E.eglises.objets.filter((o) => o[3] <= an && an < o[4]); }

export function stats(j) {
  const s = { enceintes: enceintes().filter((w) => wallState(w, j.an) === 1).map((w) => w.nom) };
  if (j.ilots) { const il = E.ilots[j.ilots]; s.ilots = il.n; s.densite = il.densite; s.haUrbain = il.densite === 'plan' ? il.ha.U : null; s.credit = il.credit; s.source = il.titre; }
  if (j.egl) { const l = eglisesAt(j.egl), k = E.eglises.statuts.indexOf('Couvent'); s.eglises = l.length; s.couvents = l.filter((o) => o[6] === k).length; }
  if (j.lutece) { s.credit = E.lutece.credit; s.rues = lutece().rues.length; }
  return s;
}

// ---------------------------------------------------------------- dessin d'une époque (sol et mini-plan)
const COL = { U: 'rgba(232,208,160,0.92)', I: 'rgba(232,208,160,0.5)', R: 'rgba(244,236,216,0.55)', eau: 'rgba(86,140,196,0.6)', mur: '#f0c860', ancien: 'rgba(240,200,96,0.75)', rue: '#ff9a6a', monument: 'rgba(255,154,106,0.85)', voie: 'rgba(244,236,216,0.6)', egl: '#c7a3f5' };
function ringPath(ctx, ring, T) { ctx.moveTo(T.x(ring[0][0]), T.y(ring[0][1])); for (let i = 1; i < ring.length; i++) ctx.lineTo(T.x(ring[i][0]), T.y(ring[i][1])); ctx.closePath(); }
function fill(ctx, polys, T, style) { ctx.fillStyle = style; ctx.beginPath(); for (const rings of polys) for (const r of rings) ringPath(ctx, r, T); ctx.fill('evenodd'); }
function stroke(ctx, polys, T, style, wd, dash) { ctx.strokeStyle = style; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.beginPath(); for (const rings of polys) for (const r of rings) ringPath(ctx, r, T); ctx.stroke(); ctx.setLineDash([]); }
function line(ctx, lines, T, style, wd) { ctx.strokeStyle = style; ctx.lineWidth = wd; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); for (const l of lines) { ctx.moveTo(T.x(l[0][0]), T.y(l[0][1])); for (let i = 1; i < l.length; i++) ctx.lineTo(T.x(l[i][0]), T.y(l[i][1])); } ctx.stroke(); }

// T : { s (pixels par mètre), x(xMonde), y(zMonde) }.
export function paintEpoch(ctx, T, j) {
  const k = T.s;
  if (j.eau) fill(ctx, eauOf(j.eau), T, COL.eau);
  if (j.ilots) {
    const polys = ilotsOf(j.ilots), t = E.ilots[j.ilots].t, by = { U: [], I: [], R: [] };
    polys.forEach((p, i) => by[t[i]].push(p));
    fill(ctx, by.U, T, COL.U); fill(ctx, by.I, T, COL.I);
    stroke(ctx, by.R, T, COL.R, Math.max(0.8, 1.6 * k), [6 * Math.max(1, k * 4), 5 * Math.max(1, k * 4)]);
    stroke(ctx, by.U, T, 'rgba(90,70,40,0.55)', Math.max(0.5, 0.9 * k));
    stroke(ctx, by.I, T, 'rgba(90,70,40,0.35)', Math.max(0.5, 0.9 * k));
  }
  if (j.lutece) {
    const L = lutece();
    line(ctx, L.eau, T, 'rgba(126,196,255,0.85)', Math.max(1, 2.5 * k));
    line(ctx, L.rues, T, 'rgba(20,16,10,0.5)', Math.max(2.5, 9 * k)); line(ctx, L.rues, T, COL.rue, Math.max(1.5, 6 * k));
    for (const m of L.monuments) { fill(ctx, m.polys, T, COL.monument); stroke(ctx, m.polys, T, 'rgba(60,30,14,0.8)', Math.max(0.8, 1.2 * k)); }
  }
  if (j.futur) for (const o of futur()) if (o.nature === 'Voie') fill(ctx, o.polys, T, COL.voie);
  for (const w of enceintes()) {
    const st = wallState(w, j.an); if (!st) continue;
    if (st === 1) { stroke(ctx, w.polys, T, 'rgba(20,16,10,0.55)', Math.max(3, 10 * k)); stroke(ctx, w.polys, T, COL.mur, Math.max(1.6, 5 * k)); fill(ctx, w.polys, T, COL.mur); }
    else stroke(ctx, w.polys, T, COL.ancien, Math.max(1.2, 3 * k), [Math.max(4, 14 * k), Math.max(3, 10 * k)]);
  }
  if (j.egl) {
    const r = Math.max(1.6, 7 * k);
    ctx.fillStyle = COL.egl; ctx.strokeStyle = 'rgba(20,16,40,0.85)'; ctx.lineWidth = Math.max(0.6, 1.5 * k);
    for (const o of eglisesAt(j.egl)) { ctx.beginPath(); ctx.arc(T.x(o[0]), T.y(o[1]), r, 0, 6.3); ctx.fill(); ctx.stroke(); }
  }
}

// ---------------------------------------------------------------- volumes
function areaOf(ring) { let a = 0; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function centroidOf(ring) { let x = 0, z = 0; for (const p of ring) { x += p[0]; z += p[1]; } return [x / ring.length, z / ring.length]; }
const v2 = (r) => r.map((p) => new THREE.Vector2(p[0], p[1]));

class Solid {
  constructor() { this.pos = []; this.foot = []; }
  // Prisme droit posé sur le relief : toit plat à la hauteur du centre, base enfouie sous le point le plus bas.
  prism(rings, h, T, lift = 0) {
    const outer = rings[0]; if (outer.length < 3) return;
    this.foot.push(rings);
    const c = centroidOf(outer), top = Math.max(T.height(c[0], c[1]), 0.3) + h + lift;
    let low = top - h; for (const p of outer) low = Math.min(low, T.height(p[0], p[1]));
    const y0 = low - 1.5, P = this.pos;
    for (const ring of rings) for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; P.push(a[0], y0, a[1], b[0], y0, b[1], b[0], top, b[1], a[0], y0, a[1], b[0], top, b[1], a[0], top, a[1]); }
    const all = rings.flat(), tris = THREE.ShapeUtils.triangulateShape(v2(outer), rings.slice(1).map(v2));
    for (const t of tris) { const a = all[t[0]], b = all[t[1]], d = all[t[2]]; if ((b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]) > 0) P.push(a[0], top, a[1], d[0], top, d[1], b[0], top, b[1]); else P.push(a[0], top, a[1], b[0], top, b[1], d[0], top, d[1]); }
  }
  mesh(material) {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material); m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix();
    return m;
  }
}

// Le point est-il dans l'anneau ? (parité des croisements)
function inRing(ring, x, z) {
  let inside = false;
  for (let i = 0, k = ring.length - 1; i < ring.length; k = i++) { const a = ring[i], b = ring[k]; if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside; }
  return inside;
}
// Emprises rangées par cases de 40 m : savoir en quelques comparaisons si un point tombe dans un volume.
const CELL = 40;
function footIndex(feet) {
  const cells = new Map();
  for (const rings of feet) {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const p of rings[0]) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; }
    const f = { rings, x0, z0, x1, z1 };
    for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let k = Math.floor(z0 / CELL); k <= Math.floor(z1 / CELL); k++) { const key = (i + 2048) * 4096 + k + 2048; let l = cells.get(key); if (!l) cells.set(key, (l = [])); l.push(f); }
  }
  return cells;
}

// Toiles du calque tenues en mémoire vive : le tracé de milliers de polygones y est immédiat, alors qu'une toile
// accélérée le diffère jusqu'à la carte graphique — plusieurs secondes par époque quand celle-ci est émulée.
const CPU = { willReadFrequently: true };
const RECT_CITY = { x: (FRAME.x0 + FRAME.x1) / 2 - 1800, z: (FRAME.z0 + FRAME.z1) / 2 - 1800, w: 3600, h: 3600 };
const RECT_WIDE = { x: -440 - 4500, z: -460 - 4500, w: 9000, h: 9000 };

export class Epochs {
  constructor(app) {
    this.app = app; this.current = jalon('1380'); this.volumes = new Map(); this.group = new THREE.Group(); this.group.visible = false; app.scene.add(this.group);
    this.rectCity = RECT_CITY; this.rectWide = RECT_WIDE; this.city = null; this.wide = null; this.onChange = null;
    this.foot = null; this.loose = false;
    this.lib = { JALONS, jalon, stats, ilotsOf, enceintes, wallState, eglisesAt, lutece, futur };   // accès aux données du calque (console, tests)
    // un promeneur surpris à l'intérieur d'un volume (changement d'époque) doit pouvoir en sortir
    app.on('frame', () => { const r = app.rig; this.loose = !!this.foot && r.mode === 'walk' && this.inside(r.walk.x, r.walk.z); });
    this.mats = {
      ilot: new THREE.MeshStandardMaterial({ color: 0xece4d0, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
      ilotBas: new THREE.MeshStandardMaterial({ color: 0xcdbf9c, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
      or: new THREE.MeshStandardMaterial({ color: 0xdcb866, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
      romain: new THREE.MeshStandardMaterial({ color: 0xe8936a, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
    };
  }

  // Le point est-il sous un volume du calque (îlot bâti plus tard, édifice futur, monument antique) ?
  inside(x, z) {
    const l = this.foot && this.foot.get((Math.floor(x / CELL) + 2048) * 4096 + Math.floor(z / CELL) + 2048);
    if (!l) return false;
    for (const f of l) {
      if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1 || !inRing(f.rings[0], x, z)) continue;
      let hole = false; for (let i = 1; i < f.rings.length && !hole; i++) hole = inRing(f.rings[i], x, z);
      if (!hole) return true;
    }
    return false;
  }
  // À pied, on contourne ces volumes ; les enceintes du calque se traversent, faute d'en connaître les portes.
  blocked(x, z) { return !this.loose && this.inside(x, z); }

  // Toiles du calque au sol : le centre finement, l'agglomération plus largement.
  ensureCanvases() {
    if (this.city) return;
    const N = this.app.mobile ? 1024 : 2048, U = this.app.epochU;
    const make = () => { const c = document.createElement('canvas'); c.width = c.height = N; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return [c, t]; };
    [this.city, this.cityTex] = make(); [this.wide, this.wideTex] = make();
    U.uEpochCityMap.value = this.cityTex; U.uEpochWideMap.value = this.wideTex;
    U.uEpochCity.value.set(RECT_CITY.x, RECT_CITY.z, RECT_CITY.w, RECT_CITY.h); U.uEpochWide.value.set(RECT_WIDE.x, RECT_WIDE.z, RECT_WIDE.w, RECT_WIDE.h);
    const cu = this.app.cert.uniforms, f = cu.uCertFrame.value;           // masque « existe déjà » : même trame que le calque de certitude
    this.mask = document.createElement('canvas'); this.mask.width = Math.round(f.z / 2); this.mask.height = Math.round(f.w / 2);
    this.maskTex = new THREE.CanvasTexture(this.mask); this.maskTex.minFilter = THREE.LinearFilter; this.maskTex.generateMipmaps = false;
    cu.uEpochMask.value = this.maskTex;
  }

  // `lots` : emprises des îlots dressés en volume ; on leur dessine une chaussée de terre, pour que les rues se lisent.
  paintCanvases(j, lots = []) {
    for (const [cv, tex, R] of [[this.city, this.cityTex, RECT_CITY], [this.wide, this.wideTex, RECT_WIDE]]) {
      const ctx = cv.getContext('2d', CPU), s = cv.width / R.w, pad = 3;       // marge transparente : rien ne bave au bord de la texture
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.save(); ctx.beginPath(); ctx.rect(pad, pad, cv.width - 2 * pad, cv.height - 2 * pad); ctx.clip();
      const T = { s, x: (x) => (x - R.x) * s, y: (z) => (z - R.z) * s };
      ctx.lineJoin = 'round';
      if (lots.length) stroke(ctx, lots, T, 'rgba(172,154,122,0.95)', 16 * s);
      paintEpoch(ctx, T, j);
      ctx.restore(); tex.needsUpdate = true;
    }
    if (j.passe === 1) {
      const f = this.app.cert.uniforms.uCertFrame.value, ctx = this.mask.getContext('2d', CPU);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, this.mask.width, this.mask.height);
      fill(ctx, ilotsOf(j.ilots), { x: (x) => (x - f.x) / 2, y: (z) => (z - f.y) / 2 }, '#fff');
      this.maskTex.needsUpdate = true;
    }
  }

  // Part de l'îlot déjà bâtie dans la maquette de 1380 : au-delà d'un tiers, on ne le double pas d'un volume.
  builtShare(ring) {
    const lu = this.app.lu, c = centroidOf(ring); let n = 0, k = 0;
    const test = (x, z) => { n++; if (x > FRAME.x0 && x < FRAME.x1 && z > FRAME.z0 && z < FRAME.z1) { const v = lu.get(x, z); if (v === LU.BATI || v === LU.RES || v === LU.COURT || v === LU.CEMETERY) k++; } };
    test(c[0], c[1]);
    for (const p of ring) { test(c[0] + (p[0] - c[0]) * 0.55, c[1] + (p[1] - c[1]) * 0.55); test(c[0] + (p[0] - c[0]) * 0.88, c[1] + (p[1] - c[1]) * 0.88); }
    return k / n;
  }

  buildVolumes(j) {
    const T = this.app.terrain, g = new THREE.Group(), feet = []; let tris = 0;
    const add = (solid, mat, block) => { const m = solid.mesh(mat); if (m) { g.add(m); tris += solid.pos.length / 9; if (block) feet.push(...solid.foot); } };
    if (j.ilots && !j.passe) {                             // îlots que l'époque montre bâtis et qui ne l'étaient pas en 1380
      const SU = new Solid(), SI = new Solid(), polys = ilotsOf(j.ilots), t = E.ilots[j.ilots].t;
      polys.forEach((rings, i) => { if (t[i] === 'R' || this.builtShare(rings[0]) > 0.34) return; if (t[i] === 'U') SU.prism(rings, 9, T); else SI.prism(rings, 3.5, T); });
      add(SU, this.mats.ilot, true); add(SI, this.mats.ilotBas, true); g.userData.lots = SU.foot.concat(SI.foot);              // îlots denses : hauts et clairs ; îlots intermédiaires : bas et plus sombres
    }
    const W = new Solid(), F = new Solid();                // enceintes debout à cette date et absentes de la maquette ; édifices à venir
    for (const w of enceintes()) if (wallState(w, j.an) === 1 && (w.id === 'fosses-jaunes' || w.id === 'fermiers-generaux' || (j.passe && (w.id === 'romaine' || w.id === 'carolingienne')))) for (const rings of w.polys) if (Math.abs(areaOf(rings[0])) > 4) W.prism(rings, w.id === 'fermiers-generaux' ? 3.4 : 6, T);
    if (j.futur) for (const o of futur()) if (o.nature !== 'Voie' && o.nature !== 'Zone bâtie') for (const rings of o.polys) F.prism(rings, o.nature === 'Tour' ? 40 : o.nature === 'Église' ? 22 : 13, T, 0.4);
    add(W, this.mats.or); add(F, this.mats.or, true);
    if (j.lutece) { const R = new Solid(); for (const m of lutece().monuments) for (const rings of m.polys) R.prism(rings, /Arènes|Théâtre/.test(m.nom) ? 11 : /Forum/.test(m.nom) ? 9 : 14, T, 0.3); add(R, this.mats.romain, true); }
    g.userData.tris = tris; g.userData.foot = footIndex(feet); g.userData.blocs = feet.length;
    return g;
  }

  // Choisit une époque : '1380' retire le calque.
  set(id) {
    const j = jalon(id), app = this.app, U = app.epochU, cu = app.cert.uniforms;
    this.current = j;
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.foot = null; this.loose = false;
    if (j.base) { U.uEpochOn.value = 0; cu.uEpochMode.value = 0; this.group.visible = false; }
    else {
      if (!this.volumes.has(j.id)) this.volumes.set(j.id, this.buildVolumes(j));
      this.ensureCanvases(); this.paintCanvases(j, this.volumes.get(j.id).userData.lots);
      U.uEpochOn.value = 1; cu.uEpochMode.value = j.passe || 0;
      this.group.add(this.volumes.get(j.id)); this.group.visible = true; this.foot = this.volumes.get(j.id).userData.foot;
    }
    if (this.onChange) this.onChange(j);
    return j;
  }
}
