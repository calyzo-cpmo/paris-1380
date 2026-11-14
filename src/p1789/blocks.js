// Briques communes à la ville et aux monuments de Paris 1789 : teintes, façades percées de travées, corps de bâtiment,
// combles (brisés à lucarnes, en bâtière, à croupes) et souches de cheminée.
import { BAY, ETAGE, RDC } from './textures.js';
import { rgb, tint, ccw, box, skeletonRoof } from '../builder.js';
import { centroid, polyArea, dpRing, pointInPoly, clamp, offsetEx } from '../geom.js';

export const hash = (i, s) => { let x = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(s + 7, 0x85ebca6b); x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 12; return (x >>> 0) / 4294967296; };

// Les teintes sont données en sRGB ; les couleurs de sommet, elles, sont linéaires : rgb() fait la conversion.
export const hex = (h) => rgb(h >> 16, (h >> 8) & 255, h & 255);
export const ENDUITS = [0xf0e6cc, 0xe6d6b2, 0xeee8d8, 0xe0d0b6, 0xdac8a8, 0xecdcc8, 0xf2ecda, 0xddd4c0, 0xe8dcc0, 0xe2d8c4].map(hex);
export const ARDOISES = [rgb(88, 98, 114), rgb(78, 88, 104), rgb(98, 106, 120), rgb(84, 92, 104), rgb(92, 102, 120)];
export const TUILES_ = [rgb(176, 110, 80), rgb(158, 100, 76), rgb(186, 124, 92), rgb(146, 96, 78), rgb(168, 116, 92), rgb(154, 106, 82), rgb(180, 130, 100), rgb(138, 92, 74)];
export const ARDOISE = ARDOISES[0], TUILES = TUILES_[0], PLOMB = rgb(146, 154, 158), PIERRE = rgb(232, 222, 198);
export const ardoise = (id) => ARDOISES[Math.floor(hash(id, 21) * ARDOISES.length)];
export const tuile = (id) => TUILES_[Math.floor(hash(id, 22) * TUILES_.length)];
const EN_ARDOISE = new Set(ARDOISES);            // ces couvertures vont dans la matière « ardoise », les autres dans « roof » (tuile)
const lotToit = (B, col, x, z) => B.at(EN_ARDOISE.has(col) ? 'ardoise' : 'roof', x, z);
// Demi-largeur vraie d'un corps : le plus grand retrait qui laisse encore quelque chose (dichotomie sur l'érosion).
function demiLargeur(ex, max) { let lo = 0, hi = max; for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2; if (offsetEx([ex], -m).length) lo = m; else hi = m; } return (lo + hi) / 2; }
const SOUCHES = [rgb(214, 196, 166), rgb(198, 178, 150), rgb(176, 120, 96), rgb(222, 210, 188)], SUIE = rgb(64, 56, 50);
const BRISIS = { d: 0.8, h: 2.37 };          // comble brisé : retrait et hauteur du brisis (2,5 m de rampant : un motif de lucarnes)

// ---------------------------------------------------------------- volumes
// Façade le long d'un anneau (aire positive) : u compté en travées (4 par motif), v en étages.
// inward : paroi tournée vers l'intérieur de l'anneau (cours).
export function facade(b, r, inward, yb, yt, vBot, vTop, col, u0, s0, s1, bay = BAY) {
  let u = u0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], c = r[(i + 1) % r.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (L < 0.4) continue;
    const uu = Math.max(1, Math.round(L / bay)) * 0.25;
    if (!inward) b.quad(c[0], yb, c[1], a[0], yb, a[1], a[0], yt, a[1], c[0], yt, c[1], u + uu, vBot, u, vTop, col, s0, s1);
    else b.quad(a[0], yb, a[1], c[0], yb, c[1], c[0], yt, c[1], a[0], yt, a[1], u, vBot, u + uu, vTop, col, s0, s1);
    u += uu;
  }
}

// Souche de cheminée : une dalle maçonnée, noircie au sommet. (ux, uz) : sens de sa longueur.
function souche(B, x, z, ux, uz, hl, y0, y1, id) {
  box(B.at('plain', x, z), { cx: x, cz: z, ux, uz, hl, hw: 0.3 }, y0, y1, { col: SOUCHES[Math.floor(hash(id, 31) * SOUCHES.length)], topCol: SUIE, s0: 0.86, s1: 1 });
}

// Emprise à quatre côtés ? Rend le quadrilatère convexe (sens positif) qui la résume, sinon null.
function quadOf(outer, area) {
  let q = outer.length === 4 ? outer : dpRing(outer, 0.5);
  const s = q.length === 4 ? polyArea(q) : 0;
  if (Math.abs(s) < area * 0.92) return null;
  if (s < 0) q = q.slice().reverse();
  for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 0) return null; }
  return q;
}

// Comble en bâtière sur un quadrilatère : deux versants, deux pignons maçonnés, souches aux pignons.
function batiere(B, c, q, eave, pitch, roofCol, wallCol, id, stacks) {
  const len = (i) => Math.hypot(q[(i + 1) % 4][0] - q[i][0], q[(i + 1) % 4][1] - q[i][1]);
  const k = len(0) + len(2) < len(1) + len(3) ? 0 : 1;                      // les petits côtés portent les pignons
  const P = [q[k], q[(k + 1) % 4], q[(k + 2) % 4], q[(k + 3) % 4]];       // P0→P1 pignon, P1→P2 long pan, P2→P3 pignon, P3→P0 long pan
  const m0 = [(P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2], m1 = [(P[2][0] + P[3][0]) / 2, (P[2][1] + P[3][1]) / 2];
  const hw = (len(k) + len(k + 2)) / 4, rise = clamp(hw * pitch, 1.5, 6.5), yr = eave + rise, ov = 0.3, drop = (ov * rise) / hw;
  const br = lotToit(B, roofCol, c[0], c[1]), bw = B.at('plain', c[0], c[1]), sl = Math.hypot(hw + ov, rise + drop) * 0.33;
  const pan = (a, b, ra, rb) => {                                           // long pan a→b, faîte ra (au-dessus de a) → rb
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ox = ((b[1] - a[1]) / L) * ov, oz = (-(b[0] - a[0]) / L) * ov;
    br.quad(b[0] + ox, eave - drop, b[1] + oz, a[0] + ox, eave - drop, a[1] + oz, ra[0], yr, ra[1], rb[0], yr, rb[1], L * 0.33, 0, 0, sl, roofCol, 0.9, 1);
  };
  pan(P[1], P[2], m0, m1); pan(P[3], P[0], m1, m0);
  bw.tri(P[1][0], eave, P[1][1], P[0][0], eave, P[0][1], m0[0], yr, m0[1], 0, 0, 0, 0, 0, 0, wallCol, 0.95, 0.95, 1);
  bw.tri(P[3][0], eave, P[3][1], P[2][0], eave, P[2][1], m1[0], yr, m1[1], 0, 0, 0, 0, 0, 0, wallCol, 0.95, 0.95, 1);
  // souches : sur le pignon, de part ou d'autre du faîte
  const rl = Math.hypot(m1[0] - m0[0], m1[1] - m0[1]) || 1, rx = (m1[0] - m0[0]) / rl, rz = (m1[1] - m0[1]) / rl;
  for (let s = 0; s < stacks; s++) {
    const m = s ? m1 : m0, e = s ? [P[2], P[3]] : [P[0], P[1]], gl = Math.hypot(e[1][0] - e[0][0], e[1][1] - e[0][1]) || 1, gx = (e[1][0] - e[0][0]) / gl, gz = (e[1][1] - e[0][1]) / gl;
    const off = (hash(id, 33 + s) - 0.5) * hw * 0.9, hl = Math.min(hw * 0.4, 0.55 + hash(id, 35 + s) * 0.6), inn = (s ? -1 : 1) * 0.38;
    const x = m[0] + gx * off + rx * inn, z = m[1] + gz * off + rz * inn, yRoof = yr - (Math.abs(off) / hw) * rise;
    souche(B, x, z, gx, gz, hl, yRoof - 0.9, Math.max(yRoof, yr - 0.4) + 0.9 + hash(id, 37 + s) * 0.7, id + s);
  }
  return yr;
}

// Souches le long des murs d'un corps à comble brisé ou à croupes : dalles perpendiculaires au mur, en retrait.
function souches(B, outer, holes, eave, rise, inset, id, max) {
  let n = 0;
  for (let i = 0; i < outer.length && n < max; i++) {
    const a = outer[i], b = outer[(i + 1) % outer.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 5 || hash(id * 7 + i, 41) > 0.62) continue;
    const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, t = (0.2 + 0.6 * hash(id * 7 + i, 42)) * L;
    const x = a[0] + dx * t - dz * inset, z = a[1] + dz * t + dx * inset;      // l'intérieur d'un anneau positif est à gauche du pan
    if (!pointInPoly(x - dz * 0.8, z + dx * 0.8, outer) || holes.some((h) => pointInPoly(x, z, h) || pointInPoly(x - dz * 0.8, z + dx * 0.8, h))) continue;
    souche(B, x, z, -dz, dx, 0.6 + hash(id * 7 + i, 43) * 0.5, eave + rise - 0.8, eave + rise + 1.3 + hash(id * 7 + i, 44) * 0.8, id * 7 + i);
    n++;
  }
}

// Comble d'un corps de bâtiment ; rend la cote du faîte.
function comble(B, ex, eave, c, id, o) {
  const { outer, holes } = ex, br = lotToit(B, o.roof, c[0], c[1]);
  let A = Math.abs(polyArea(outer)), P = 0;
  for (const r of [outer, ...holes]) { if (r !== outer) A -= Math.abs(polyArea(r)); for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; P += Math.hypot(b[0] - a[0], b[1] - a[1]); } }
  const half = clamp((1.1 * A) / (P || 1), 1.1, 7);                         // de l'ordre de la demi-largeur du corps
  const stacks = o.kind !== 'maison' || o.light ? 0 : A < 45 ? 0 : A < 150 ? 1 : 2;      // souches : une par corps, deux sur les grands
  // sur un grand corps, la pente est réglée pour que le toit se ferme en faîte au lieu de finir en plateau
  const r = A > 250 ? demiLargeur(ex, (2.5 * A) / (P || 1)) : 0;
  if (o.mansard && A > 45) {
    const shade = 0.86 + hash(id, 23) * 0.22, top = skeletonRoof(br, ex, eave, { brisis: { ...BRISIS, b: B.at('comble', c[0], c[1]), us: 1 / BAY, col: tint(0xffffff, shade) }, pitch: r ? clamp(3.2 / Math.max(0.5, r - BRISIS.d), 0.1, 0.42) : 0.42, step: Math.min(2.2, half * 0.9), minStep: 0.45, maxH: BRISIS.h + 3.4, col: tint(o.roof, 1.12), stitch: true });
    if (!o.light) souches(B, outer, holes, eave, BRISIS.h, 1.25, id, o.kind === 'public' ? Math.min(6, Math.round(P / 30)) : Math.max(1, stacks));
    return top;
  }
  const q = holes.length ? null : quadOf(outer, A); let pitch = o.pitch ?? 0.95 + hash(id, 24) * 0.3; if (r && !q) pitch = Math.min(pitch, 6.3 / r);
  if (q) return batiere(B, c, q, eave, pitch, o.roof, tint(o.col, 0.97), id, stacks);
  const top = skeletonRoof(br, ex, eave, { pitch, step: Math.min(2, half), minStep: 0.4, maxH: 6.5, col: o.roof, stitch: true });      // paliers fins : les pans restent plans
  if (stacks) souches(B, outer, holes, eave, pitch * 1.5, 1.5, id, stacks);
  return top;
}

// Un corps de bâtiment : rez-de-chaussée, étages, comble. kind : 'maison', 'eglise', 'public'.
export function building(app, B, ex, id, o) {
  const T = app.terrain, outer = ccw(ex.outer), holes = ex.holes.map(ccw), c = centroid(outer);
  let lo = 1e9, hi = -1e9; for (const p of outer) { const h = T.height(p[0], p[1]); if (h < lo) lo = h; if (h > hi) hi = h; }
  const y0 = Math.max(lo, 0.3), yb = lo - 0.8, col = o.col;
  // pour le toit, les cours doivent tourner à l'inverse du contour : sans cela l'érosion les rétrécit au lieu de les
  // élargir, et le comble recouvre la cour
  const exN = { outer, holes: holes.map((h) => h.slice().reverse()) };
  let top;
  if (o.kind === 'eglise') {
    const eave = y0 + o.h, b = B.at('nef', c[0], c[1]), vb = -(y0 - yb) / o.h;      // hautes baies cintrées entre pilastres
    facade(b, outer, false, yb, eave, vb, 1, col, 0, 0.8, 1, 5); for (const h of holes) facade(b, h, true, yb, eave, vb, 1, col, 0, 0.7, 0.95, 5);
    top = skeletonRoof(lotToit(B, o.roof ?? ARDOISE, c[0], c[1]), exN, eave, { pitch: 1.2, step: 2.2, minStep: 0.5, maxH: 10, col: o.roof ?? ARDOISE, stitch: true });
  } else {
    const rdcTop = y0 + (o.kind === 'public' ? RDC + 0.9 : RDC), eave = rdcTop + (o.floors - 1) * (o.kind === 'public' ? ETAGE + 0.7 : ETAGE), u0 = Math.floor(hash(id, 5) * 4) * 0.25;
    if (o.floors > 1) {
      facade(B.at('rdc', c[0], c[1]), outer, false, yb, rdcTop, -(y0 - yb) / RDC, 1, col, u0, 0.72, 0.95);
      facade(B.at('facade', c[0], c[1]), outer, false, rdcTop, eave, 0, (o.floors - 1) / 2, col, u0, 0.95, 1);
      for (const h of holes) facade(B.at('facade', c[0], c[1]), h, true, yb, eave, -0.5, (o.floors - 1) / 2, col, u0, 0.62, 0.9);
    } else {
      facade(B.at('rdc', c[0], c[1]), outer, false, yb, eave, -(y0 - yb) / RDC, 1, col, u0, 0.72, 0.95);
      for (const h of holes) facade(B.at('rdc', c[0], c[1]), h, true, yb, eave, -(y0 - yb) / RDC, 1, col, u0, 0.62, 0.9);
    }
    top = comble(B, exN, eave, c, id, app.mobile ? { ...o, light: true } : o);
  }
  app.foot.push({ ring: outer, top, reel: !!o.reel });
  return top;
}
