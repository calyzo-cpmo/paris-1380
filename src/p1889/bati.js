// Bâti de Paris en 1889 : près de quatre-vingt mille bâtiments, donc des volumes légers — un mur par côté, un comble
// brisé (brisis d'ardoise à lucarnes, terrasson de zinc) ou un toit à croupes, sans souches ni lucarnes en relief.
// Les églises gardent la construction détaillée de la page « Paris 1789 ».
import * as THREE from 'three';
import { rgb, tint, ccw } from '../builder.js';
import { building, facade, hex, hash, ARDOISES, TUILES_, PIERRE } from '../p1789/blocks.js';
import { BAY, ETAGE, RDC } from '../p1789/textures.js';
import { polyArea, pointInPoly, centroid } from '../geom.js';

const PIERRES = [0xece2cc, 0xe4d8be, 0xf0e8d6, 0xdfd2b6, 0xe8dec8, 0xdcd0b8, 0xeadfc4].map(hex);      // pierre de taille, plâtre
const FAUBOURG = [0xe6dcc6, 0xd9cdb4, 0xeee6d4, 0xd4c6aa, 0xe0d2b8, 0xcfc3ae, 0xe8d8c0, 0xd8c8b4].map(hex);
const BRIQUES = [0xb87055, 0xa9654e, 0xc48062, 0x9c6450].map(hex);
const ZINCS = [rgb(160, 168, 174), rgb(148, 158, 166), rgb(170, 176, 180), rgb(140, 150, 160), rgb(156, 162, 166)];
const BRISIS_H = 2.37, BRISIS_D = 0.85;
const V2 = (p) => new THREE.Vector2(p[0], p[1]);

// Anneau rentré de d mètres (onglets) ; rien si le polygone est trop étroit ou trop découpé pour le supporter.
// Le côté « intérieur » dépend du sens de l'anneau : on essaie l'un, puis l'autre.
function onglets(r, d, sg) {
  const n = r.length, A = polyArea(r), out = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = r[(i + n - 1) % n], c = r[i], q = r[(i + 1) % n];
    let ax = c[0] - p[0], az = c[1] - p[1], bx = q[0] - c[0], bz = q[1] - c[1];
    const la = Math.hypot(ax, az) || 1, lb = Math.hypot(bx, bz) || 1; ax /= la; az /= la; bx /= lb; bz /= lb;
    const n0x = -az * sg, n0z = ax * sg, n1x = -bz * sg, n1z = bx * sg, k = 1 + n0x * n1x + n0z * n1z;
    if (k < 0.25) return null;
    out[i] = [c[0] + ((n0x + n1x) / k) * d, c[1] + ((n0z + n1z) / k) * d];
  }
  const B = polyArea(out);
  if (B * A <= 0 || Math.abs(B) >= Math.abs(A) || Math.abs(B) < 0.1 * Math.abs(A)) return null;
  for (const p of out) if (!pointInPoly(p[0], p[1], r)) return null;
  return out;
}
const retrait = (r, d) => onglets(r, d, 1) || onglets(r, d, -1);

// Dalle horizontale à sommets partagés (trois fois moins de sommets que des triangles séparés).
function dalle(b, outer, holes, y, col, s = 1) {
  const tris = THREE.ShapeUtils.triangulateShape(outer.map(V2), holes.map((h) => h.map(V2))), all = holes.length ? outer.concat(...holes) : outer;
  b.need(all.length, tris.length * 3);
  const i0 = b.n; for (const p of all) b.v(p[0], y, p[1], 0, 1, 0, p[0] * 0.2, p[1] * 0.2, col, s);
  for (const t of tris) {
    const a = all[t[0]], c = all[t[1]], d = all[t[2]]; if (!a || !c || !d) continue;
    const inv = (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]) > 0;
    b.idx[b.ni++] = i0 + t[0]; b.idx[b.ni++] = i0 + (inv ? t[2] : t[1]); b.idx[b.ni++] = i0 + (inv ? t[1] : t[2]);
  }
}

// Versants entre un anneau (à l'égout) et son retrait (plus haut) : un pan par côté.
function versants(b, r, q, y0, y1, us, v1, col, s0, s1) {
  let u = 0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], c = r[(i + 1) % r.length], a2 = q[i], c2 = q[(i + 1) % r.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (L < 0.3) continue;
    const uu = us > 0 ? L * us : Math.max(1, Math.round(L / (4 * BAY)) * 1);
    b.quad(c[0], y0, c[1], a[0], y0, a[1], a2[0], y1, a2[1], c2[0], y1, c2[1], u + uu, 0, u, v1, col, s0, s1);
    u += uu;
  }
}

// Un bâtiment léger. e : { rings, s, h, t, k } ; pres : rez-de-chaussée à boutiques (autour de l'Exposition).
export function maison(app, B, e, id, pres) {
  const T = app.terrain, outer = ccw(e.rings[0]), holes = e.rings.slice(1).map(ccw), c = centroid(outer);
  let lo = 1e9; for (const p of outer) { const h = T.height(p[0], p[1]); if (h < lo) lo = h; }
  const y0 = Math.max(lo, 0.3), yb = lo - 0.9, A = Math.abs(polyArea(outer));
  let P = 0; for (let i = 0; i < outer.length; i++) { const a = outer[i], b = outer[(i + 1) % outer.length]; P += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  if (e.k === 'e' && A > 250) return building(app, B, { outer, holes }, id, { kind: 'eglise', h: Math.max(9, e.h * 0.82), col: PIERRE, roof: ARDOISES[0], reel: e.s === 'R' });
  const brise = e.t === 4 && e.h >= 9.5 && A > 50, plat = e.t === 1 || (e.k === 'g' && A > 1500);
  const nF = Math.max(1, Math.round((e.h - (brise ? 1.9 : plat ? 0.3 : 1.2)) / ETAGE)), eave = y0 + RDC + (nF - 1) * ETAGE;
  const indus = e.k === 'i' || (e.s === 'G' && hash(id, 9) < 0.07), pal = indus ? BRIQUES : brise ? PIERRES : FAUBOURG, col = pal[Math.floor(hash(id, 4) * pal.length)], u0 = Math.floor(hash(id, 5) * 4) * 0.25;
  const fa = B.at('facade', c[0], c[1]);
  let top = eave;
  // toit
  const q = plat || app.mobile ? null : retrait(outer, brise ? BRISIS_D : Math.max(0.7, Math.min(4.2, (0.82 * A) / P)));
  if (brise && q) {
    top = eave + BRISIS_H;
    versants(B.at('comble', c[0], c[1]), outer, q, eave, top, 0, 1, tint(0xffffff, 0.86 + hash(id, 23) * 0.22), 1, 1);
    dalle(B.at('plain', c[0], c[1]), q, holes, top, ZINCS[Math.floor(hash(id, 31) * ZINCS.length)]);
  } else if (q) {
    const d = Math.max(0.7, Math.min(4.2, (0.82 * A) / P)), rise = d * (0.62 + hash(id, 24) * 0.2), tuile = e.h < 11 && hash(id, 26) < 0.55, rc = tuile ? TUILES_[Math.floor(hash(id, 22) * TUILES_.length)] : ARDOISES[Math.floor(hash(id, 21) * ARDOISES.length)];
    top = eave + rise;
    versants(B.at(tuile ? 'roof' : 'ardoise', c[0], c[1]), outer, q, eave, top, 0.33, Math.hypot(d, rise) * 0.33, rc, 0.92, 1);
    dalle(B.at('plain', c[0], c[1]), q, holes, top, tint(rc, 0.9));
  } else {
    top = eave + 0.35;
    dalle(B.at('plain', c[0], c[1]), outer, holes, top, plat ? ZINCS[Math.floor(hash(id, 31) * ZINCS.length)] : tint(ARDOISES[Math.floor(hash(id, 21) * ARDOISES.length)], 1.1), 0.95);
  }
  // murs : étages courants ; près de l'Exposition, un rez-de-chaussée de boutiques et de portes
  const haut = q ? eave : top;
  if (pres && nF > 1) {
    facade(B.at('rdc', c[0], c[1]), outer, false, yb, y0 + RDC, -(y0 - yb) / RDC, 1, col, u0, 0.72, 0.95);
    facade(fa, outer, false, y0 + RDC, haut, 0, (nF - 1) / 2, col, u0, 0.95, 1);
  } else facade(fa, outer, false, yb, haut, -(y0 - yb) / (2 * ETAGE), nF / 2, col, u0, 0.8, 1);
  for (const h of holes) facade(fa, h, true, yb, top, -(y0 - yb) / (2 * ETAGE), nF / 2, col, u0, 0.62, 0.9);
  app.foot.push({ ring: outer, top, reel: e.s === 'R' });
  return top;
}
