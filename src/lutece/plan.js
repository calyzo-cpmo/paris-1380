// Plan de Lutèce vers 250, déduit des données : lit du fleuve et îles, ruisseaux et bras morts, voies, monuments,
// ponts, puis — évoqués — les maisons le long des rues restituées et leurs jardins. Géométrie pure : ni matière ni
// maillage ici. Ce plan sert à la fois au terrain, à la peinture du sol et à la construction.
import { rues, rivages, monuments } from './data.js';
import { centroid, polyArea, pointInPoly, distPolyline, distSeg, minAreaRect, mulberry32, pointAt, polylineLength, clamp, lerp, fbm } from '../geom.js';
import { ccw } from '../builder.js';

export const CADRE = { x0: -2600, z0: -2400, x1: 2400, z1: 2600 };
export const CENTRE_RECT = { x: -1500, z: -700, w: 2400, h: 2200 };   // la ville : sol peint finement, trame des passants
export const COEUR = { x: -470, z: 470 };                             // milieu de la ville haute, entre forum et thermes
export const PAVE = 620;                                              // rayon de la ville aux rues dallées (m)
const AXE = [0.342, -0.94];                                           // sens du cardo, vers le fleuve

const ferme = (l) => l.length > 3 && Math.hypot(l[0][0] - l[l.length - 1][0], l[0][1] - l[l.length - 1][1]) < 2;
// Point où une ligne coupe la verticale d'abscisse x.
const coupe = (l, x) => { for (let i = 0; i + 1 < l.length; i++) { const a = l[i], b = l[i + 1]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) return [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])]; } return null; };

// Repère local d'une emprise : son plus petit rectangle englobant, grand axe tourné vers `vers`. P(a, c) rend le point
// du monde à l'abscisse a le long du grand axe (ux, uz) et à l'écart c le long de l'axe perpendiculaire (−uz, ux).
export function repere(ring, vers) {
  const r = minAreaRect(ring), s = r.ux * vers[0] + r.uz * vers[1] < 0 ? -1 : 1;
  return { cx: r.cx, cz: r.cz, ux: r.ux * s, uz: r.uz * s, hl: r.hl, hw: r.hw };
}
export const local = (f) => (a, c) => [f.cx + f.ux * a - f.uz * c, f.cz + f.uz * a + f.ux * c];

// Bois : taches d'un bruit lent, hors de la ville. La même règle peint le sol et plante les arbres.
export const bois = (x, z) => fbm(x * 0.0017 + 9.3, z * 0.0017 - 4.1, 3);
export const SEUIL_BOIS = 0.69;                      // environ un septième du territoire

// ---------------------------------------------------------------- ce que disent les données
export function tracer() {
  const R = rivages(), ouvertes = R.filter((l) => !ferme(l)).sort((a, b) => polylineLength(b) - polylineLength(a));
  // les deux plus longues lignes sont les rives du fleuve ; elles vont toutes deux de l'amont (sud-est) vers l'aval
  const zMoy = (l) => l.reduce((s, p) => s + p[1], 0) / l.length;
  const [nord, sud] = zMoy(ouvertes[0]) < zMoy(ouvertes[1]) ? [ouvertes[0], ouvertes[1]] : [ouvertes[1], ouvertes[0]];
  const lit = nord.concat(sud.slice().reverse());
  const iles = R.filter(ferme).map((l) => l.slice(0, -1)).filter((l) => { const c = centroid(l); return pointInPoly(c[0], c[1], lit); });
  const cite = iles.filter((l) => Math.abs(centroid(l)[0]) < 700).sort((a, b) => Math.abs(polyArea(b)) - Math.abs(polyArea(a)))[0];
  // le fleuve continue hors du cadre : en aval, dans l'axe du lit là où il sort du cadre ; en amont, au bout des rives
  const ext = [], prolonge = (pN, pS, qN, qS) => {
    const mx = (pN[0] + pS[0]) / 2, mz = (pN[1] + pS[1]) / 2, bx = (qN[0] + qS[0]) / 2, bz = (qN[1] + qS[1]) / 2, l = Math.hypot(mx - bx, mz - bz) || 1, dx = (mx - bx) / l, dz = (mz - bz) / l;
    ext.push({ x: mx, z: mz, dx, dz, half: Math.max(40, Math.abs((pS[0] - pN[0]) * dz - (pS[1] - pN[1]) * dx) / 2) });
  };
  prolonge(coupe(nord, CADRE.x0 + 4), coupe(sud, CADRE.x0 + 4), coupe(nord, CADRE.x0 + 360), coupe(sud, CADRE.x0 + 360));
  { const a = pointAt(nord, 350), b = pointAt(sud, 350); prolonge(nord[0], sud[0], [a.x, a.z], [b.x, b.z]); }
  // les autres lignes : ruisseaux de la rive gauche (la Bièvre et ses bras), bras morts et marais de la rive droite
  const ruisseaux = [], marais = [];
  for (const l of ouvertes.slice(2)) { if (polylineLength(l) < 60) continue; const m = l[l.length >> 1]; (distPolyline(m[0], m[1], nord) < distPolyline(m[0], m[1], sud) ? marais : ruisseaux).push(l); }
  const toutes = rues(), cardo = toutes.slice().sort((a, b) => polylineLength(b) - polylineLength(a))[0];
  const voies = toutes.filter((l) => !ferme(l));           // la ligne fermée est le tour des arènes, pas une rue
  const mons = {};
  for (const m of monuments()) mons[m.nom] = { nom: m.nom, ring: ccw(m.ring) };
  const P = { nord, sud, lit, iles, cite, eau: [[lit, ...iles]], ext, ruisseaux, marais, rues: toutes, voies, cardo, mons, lots: [], jardins: [], ponts: [] };
  P.terrasses = Object.values(mons).map((m) => ({ ring: m.ring, marge: 18 }));
  amenager(P);
  return P;
}

// Distance du point O au contour `ring` dans la direction (c, s).
export function rayon(O, c, s, ring) {
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length], ex = q[0] - p[0], ez = q[1] - p[1], den = c * ez - s * ex; if (Math.abs(den) < 1e-9) continue;
    const wx = p[0] - O[0], wz = p[1] - O[1], t = (wx * ez - wz * ex) / den, u = (wx * s - wz * c) / den;
    if (t > 0 && u >= -1e-6 && u <= 1 + 1e-6 && t < best) best = t;
  }
  return best === Infinity ? 30 : best;
}

// Aménagement de chaque monument : repères et tracés que partagent la peinture du sol et la construction.
function amenager(P) {
  const M = P.mons, am = (P.am = {});
  { const m = M['Forum'], f = repere(m.ring, [1, 0]), L = local(f), E = 12, a = f.hl - E - 0.6, c = f.hw - E - 0.6;      // esplanade : à l'intérieur des ailes de boutiques
    am.forum = { m, f, E, cour: [L(-a, -c), L(a, -c), L(a, c), L(-a, c)] }; }
  for (const [k, nom, vers] of [['thermesN', 'Thermes du Nord', [0, -1]], ['thermesE', 'Thermes de l\'Est', [1, 0]]]) {
    const m = M[nom], f = repere(m.ring, vers), L = local(f);                                                             // les bains du côté du grand axe, la palestre à l'opposé
    am[k] = { m, f, palestre: [L(-f.hl + 1.5, -f.hw + 1.5), L(-7, -f.hw + 1.5), L(-7, f.hw - 1.5), L(-f.hl + 1.5, f.hw - 1.5)] };
  }
  const cote = (r, i) => { const p = r[i], q = r[(i + 1) % r.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]), c = centroid(r), mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2; let nx = -(q[1] - p[1]) / l, nz = (q[0] - p[0]) / l; if ((c[0] - mx) * nx + (c[1] - mz) * nz < 0) { nx = -nx; nz = -nz; } return { p, q, long: l, ux: (q[0] - p[0]) / l, uz: (q[1] - p[1]) / l, nx, nz, mx, mz }; };
  const longs = (r) => r.map((p, i) => ({ i, l: Math.hypot(r[(i + 1) % r.length][0] - p[0], r[(i + 1) % r.length][1] - p[1]) })).sort((a, b) => b.l - a.l);
  { const m = M['Théâtre'], sc = cote(m.ring, longs(m.ring)[0].i), prof = 14, O = [sc.mx + sc.nx * prof, sc.mz + sc.nz * prof], t = Math.atan2(sc.nz, sc.nx);
    // le grand côté droit est le dos du bâtiment de scène ; les gradins s'ouvrent en demi-cercle au-delà, autour de O
    am.theatre = { m, sc, O, prof, a0: t - Math.PI / 2 + 0.06, a1: t + Math.PI / 2 - 0.06, sIn: 0.4, N: 26, K: 9, H: 11 }; }
  { const m = M['Arènes de Lutèce'], r = m.ring, O = centroid(r), sc = cote(r, longs(r).slice(0, 3).sort((a, b) => a.l - b.l)[0].i);
    // amphithéâtre à scène : des trois grands côtés droits, celui du milieu porte la scène ; les gradins font le reste du tour
    let tp = Math.atan2(sc.p[1] - O[1], sc.p[0] - O[0]), d = Math.atan2(sc.q[1] - O[1], sc.q[0] - O[0]) - tp;
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    if (d < 0) { tp += d; d = -d; }
    const sIn = 0.45, arene = []; for (let i = 0; i < 40; i++) { const t = (i / 40) * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t), R = rayon(O, c, s, r) * sIn; arene.push([O[0] + c * R, O[1] + s * R]); }
    am.arenes = { m, sc, O, a0: tp + d + 0.1, a1: tp + 2 * Math.PI - 0.1, sIn, N: 44, K: 10, H: 13, arene }; }
}

// Part des emplacements bâtis le long d'une rue : dense autour du forum, clairsemée vers les champs ; l'île et la tête
// de pont de la rive droite ne sont que peu bâties.
export function densite(P, x, z) {
  if (pointInPoly(x, z, P.cite)) return 0.5;
  // la ville s'allonge le long du cardo, du haut de la colline au fleuve : une centaine d'hectares, dont le tiers serré
  const dx = x - COEUR.x, dz = z - COEUR.z, d = Math.hypot((dx * AXE[0] + dz * AXE[1]) / 1.1, (dz * AXE[0] - dx * AXE[1]) / 0.9);
  let p = d < 300 ? 0.94 : d < 520 ? lerp(0.94, 0.5, (d - 300) / 220) : d < 760 ? lerp(0.5, 0.06, (d - 520) / 240) : 0.012;
  if (P.tete) p = Math.max(p, 0.42 * (1 - clamp((Math.hypot(x - P.tete[0], z - P.tete[1]) - 60) / 220, 0, 1)));
  return p;
}

// ---------------------------------------------------------------- ce qui est évoqué : ponts, maisons, jardins
// T : terrain (eau, hauteurs). Complète P : ponts, lots { ring, holes, id, x, z, w, d, etages, cour, portique, a, b, nx, nz }, jardins.
export function lotir(P, T) {
  const r = mulberry32(250), cardo = P.cardo;
  // ---- ponts : là où le cardo franchit l'eau, de berge à berge avec douze mètres d'appui sur chaque rive
  { const L = polylineLength(cardo); let dans = false, s0 = 0;
    for (let s = 0; s <= L; s += 2) {
      const p = pointAt(cardo, s), eau = T.wetAt(p.x, p.z) > 0.5 && p.x > CADRE.x0 + 60 && p.x < CADRE.x1 - 60 && p.z > CADRE.z0 + 60 && p.z < CADRE.z1 - 60;
      if (eau && !dans) { dans = true; s0 = s; }
      else if (!eau && dans) {
        dans = false; const a = s0 - 12, b = s + 12, n = Math.max(2, Math.round((b - a) / 5)), pts = [];
        const ya = T.height(pointAt(cardo, a).x, pointAt(cardo, a).z), yb = T.height(pointAt(cardo, b).x, pointAt(cardo, b).z);
        for (let i = 0; i <= n; i++) { const t = i / n, q = pointAt(cardo, a + (b - a) * t); pts.push({ x: q.x, z: q.z, dx: q.dx, dz: q.dz, y: Math.max(3.1, lerp(ya, yb, t) + 0.7 * Math.sin(Math.PI * t)), eau: T.wetAt(q.x, q.z) > 0.35 }); }
        pts[0].y = ya; pts[n].y = yb;
        P.ponts.push({ pts, long: b - a, x: (pts[0].x + pts[n].x) / 2, z: (pts[0].z + pts[n].z) / 2 });
      }
    }
    // la tête de pont de la rive droite : là où le cardo reprend pied au nord (z le plus petit)
    const bouts = P.ponts.flatMap((p) => [p.pts[0], p.pts[p.pts.length - 1]]).sort((a, b) => a.z - b.z);
    if (bouts.length) P.tete = [bouts[0].x, bouts[0].z];
  }

  // ---- occupation du sol de la ville, à la maille d'un mètre : chaussées, monuments, puis les maisons posées
  const C = CENTRE_RECT, W = C.w, H = C.h, occ = new Uint8Array(W * H);
  const cellules = (quad, fn) => {
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of quad) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const i0 = Math.floor(x0 - C.x), i1 = Math.ceil(x1 - C.x), k0 = Math.floor(z0 - C.z), k1 = Math.ceil(z1 - C.z);
    if (i0 < 0 || k0 < 0 || i1 >= W || k1 >= H) return fn(-1);          // hors de la ville
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) if (pointInPoly(C.x + i + 0.5, C.z + k + 0.5, quad) && fn(k * W + i) === false) return false;
    return true;
  };
  const marquer = (quad) => cellules(quad, (q) => { if (q >= 0) occ[q] = 1; });
  const libre = (quad) => cellules(quad, (q) => (q < 0 || occ[q] ? false : undefined)) === true;
  const chaussee = (l, demi) => {
    for (let i = 0; i + 1 < l.length; i++) {
      const a = l[i], b = l[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 40));
      for (let j = 0; j < n; j++) {
        const ax = lerp(a[0], b[0], j / n), az = lerp(a[1], b[1], j / n), bx = lerp(a[0], b[0], (j + 1) / n), bz = lerp(a[1], b[1], (j + 1) / n);
        const i0 = Math.max(0, Math.floor(Math.min(ax, bx) - demi - C.x)), i1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + demi - C.x)), k0 = Math.max(0, Math.floor(Math.min(az, bz) - demi - C.z)), k1 = Math.min(H - 1, Math.ceil(Math.max(az, bz) + demi - C.z));
        for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) if (distSeg(C.x + i + 0.5, C.z + k + 0.5, ax, az, bx, bz) <= demi) occ[k * W + i] = 1;
      }
    }
  };
  const DEMI = 3.9, DEMI_CARDO = 4.6;
  for (const l of P.voies) chaussee(l, l === cardo ? DEMI_CARDO : DEMI);
  for (const m of Object.values(P.mons)) {                // les monuments et leurs abords
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of m.ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    for (let z = Math.floor(z0 - 10); z <= z1 + 10; z++) for (let x = Math.floor(x0 - 10); x <= x1 + 10; x++) {
      const i = x - C.x, k = z - C.z; if (i < 0 || k < 0 || i >= W || k >= H) continue;
      if (pointInPoly(x + 0.5, z + 0.5, m.ring) || distPolyline(x + 0.5, z + 0.5, m.ring, true) < 9) occ[k * W + i] = 1;
    }
  }

  // ---- maisons : le long de chaque rue, des deux côtés ; le cardo d'abord, puis du centre vers les champs
  const ordre = P.voies.slice().sort((a, b) => (a === cardo ? -1 : b === cardo ? 1 : distPolyline(COEUR.x, COEUR.z, a) - distPolyline(COEUR.x, COEUR.z, b)));
  const sec = (q) => q.every((p) => T.wetAt(p[0], p[1]) < 0.04);
  let id = 0;
  for (const l of ordre) for (let i = 0; i + 1 < l.length; i++) for (const cote of [1, -1]) {
    const a = l[i], b = l[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 12) continue;
    const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, nx = -uz * cote, nz = ux * cote, q = (s, t) => [a[0] + ux * s + nx * t, a[1] + uz * s + nz * t];
    for (let s = 1.5; s < L - 8;) {
      const m = q(s + 5, 8), p = densite(P, m[0], m[1]);
      if (r() > p) { s += 6 + r() * 12; continue; }
      const portique = l === cardo && p > 0.8, f = l === cardo ? (portique ? 7.4 : 5.2) : 4.5;
      let w = 7 + r() * 6, d = 9 + r() * 5, cour = false;
      if (r() < 0.035 && p > 0.35) { w = 20 + r() * 8; d = 22 + r() * 8; cour = true; }     // grande maison à cour
      if (s + w > L - 1.5) { s = L; continue; }
      let quad = [q(s, f), q(s + w, f), q(s + w, f + d), q(s, f + d)];
      if (cour && !(libre([q(s + 1.1, f + 1.1), q(s + w - 1.1, f + 1.1), q(s + w - 1.1, f + d - 1.1), q(s + 1.1, f + d - 1.1)]) && sec(quad))) { cour = false; w = 8 + r() * 4; d = 9 + r() * 4; quad = [q(s, f), q(s + w, f), q(s + w, f + d), q(s, f + d)]; }
      if (!libre([q(s + 1.1, f + 1.1), q(s + w - 1.1, f + 1.1), q(s + w - 1.1, f + d - 1.1), q(s + 1.1, f + d - 1.1)]) || !sec(quad)) { s += 3; continue; }
      marquer(quad);
      const c = q(s + w / 2, f + d / 2), g = f + d + 12 + r() * 16;
      P.lots.push({
        ring: quad, holes: cour ? [[q(s + 7, f + 7), q(s + w - 7, f + 7), q(s + w - 7, f + d - 7), q(s + 7, f + d - 7)]] : [], id: id++, x: c[0], z: c[1], w, d, cour, portique,
        etages: cour ? 1 : r() < (p > 0.85 ? 0.6 : p > 0.45 ? 0.32 : 0.1) ? 2 : 1, a: q(s, f), b: q(s + w, f), nx: -nx, nz: -nz,        // (nx, nz) : de la façade vers la rue
        fond: [q(s, f + d), q(s + w, f + d), q(s + w, g), q(s, g)],
      });
      s += w + (r() < p ? 0 : 2 + r() * 7);
    }
  }
  // ---- jardins : derrière chaque maison, si la place est libre
  for (const lot of P.lots) {
    const g = lot.fond, c = [(g[0][0] + g[2][0]) / 2, (g[0][1] + g[2][1]) / 2];
    if (libre(g) && T.wetAt(c[0], c[1]) < 0.04) P.jardins.push({ ring: g, t: r() });
    delete lot.fond;
  }
  P.occ = { data: occ, w: W, h: H, x: C.x, z: C.z };
  return P;
}
