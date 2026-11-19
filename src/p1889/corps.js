// Corps de bâtiment communs aux gares et aux édifices publics de Paris 1889 : un repère local (origine, axe), des murs à
// baies ou à étages, des combles à croupes, des pavillons et des frontons. Les dimensions viennent de qui s'en sert.
import { ccw, rgb } from '../builder.js';
import { facade } from '../p1789/blocks.js';

export const PIERRE = rgb(228, 217, 194), PIERRE_SOMBRE = rgb(206, 196, 174), BRIQUE = rgb(186, 112, 88), ZINC = rgb(150, 158, 164), VERRE = rgb(172, 194, 202), VERRE_CLAIR = rgb(194, 210, 216), ARDOISE = rgb(84, 92, 106), DALLE = rgb(150, 144, 130);

// Repère d'un édifice : O son origine (pour une gare, le milieu des butoirs), d son axe (le sens des voies). P(u, v) rend le point du plan, rect un rectangle.
export function repere(O, d) {
  const l = Math.hypot(d[0], d[1]), dx = d[0] / l, dz = d[1] / l, nx = -dz, nz = dx;
  const P = (u, v) => [O[0] + dx * u + nx * v, O[1] + dz * u + nz * v];
  return { O, d: [dx, dz], n: [nx, nz], P, rect: (u0, u1, v0, v1) => ccw([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]) };
}
export const boite = (ring) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { ring, x0, z0, x1, z1 }; };
// Pan quelconque (trois ou quatre points [x, y, z]), tourné vers le ciel ; deux : visible aussi du dessous.
export function pan(b, pts, col, s = 1, deux = false) {
  const [a, c, d] = pts, ny = (c[2] - a[2]) * (d[0] - a[0]) - (c[0] - a[0]) * (d[2] - a[2]), q = ny >= 0 ? pts : pts.slice().reverse();
  const poser = (r) => { if (r.length === 4) b.quad(r[0][0], r[0][1], r[0][2], r[1][0], r[1][1], r[1][2], r[2][0], r[2][1], r[2][2], r[3][0], r[3][1], r[3][2], 0, 0, 1, 1, col, s, s); else b.tri(r[0][0], r[0][1], r[0][2], r[1][0], r[1][1], r[1][2], r[2][0], r[2][1], r[2][2], 0, 0, 1, 0, 0.5, 1, col, s, s, s); };
  poser(q); if (deux) poser(q.slice().reverse());
}
// Mur de P à Q, de y0 à y1, tourné vers (nx, nz) ; u : nombre de motifs de la texture sur sa longueur.
export function mur(b, P, Q, y0, y1, nx, nz, col, u, s0 = 0.84, s1 = 1) {
  let a = P, c = Q; if (-(c[1] - a[1]) * nx + (c[0] - a[0]) * nz < 0) { a = Q; c = P; }
  b.quad(a[0], y0, a[1], c[0], y0, c[1], c[0], y1, c[1], a[0], y1, a[1], 0, 0, u, 1, col, s0, s1);
}

// Corps de bâtiment sur le rectangle [u0, u1] × [v0, v1], de ya à yb : murs à hautes baies cintrées, comble à croupes
// (o.comble : sa hauteur) ou terrasse. o.mat : 'nef' (baies sur toute la hauteur) ou 'facade' (étages).
export function corps(app, B, F, u0, u1, v0, v1, ya, yb, o = {}) {
  const r = F.rect(u0, u1, v0, v1), c = F.P((u0 + u1) / 2, (v0 + v1) / 2), col = o.col || PIERRE, bp = B.at('plain', c[0], c[1]);
  if (o.mat === 'facade') facade(B.at('facade', c[0], c[1]), r, false, ya, yb, 0, Math.max(1, Math.round((yb - ya) / 3.05)) / 2, col, 0, 0.8, 1);
  else facade(B.at('nef', c[0], c[1]), r, false, ya, yb, 0, 1, col, 0, 0.84, 1, o.travee || 6);
  const h = o.comble || 0, toit = o.toit || ARDOISE, lu = Math.abs(u1 - u0), lv = Math.abs(v1 - v0), k = Math.min(lu, lv) / 2, um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
  const Q = (u, v, y) => { const p = F.P(u, v); return [p[0], y, p[1]]; }, ua = Math.min(u0, u1), ub = Math.max(u0, u1), va = Math.min(v0, v1), vb = Math.max(v0, v1);
  if (!h) pan(bp, [Q(ua, va, yb), Q(ub, va, yb), Q(ub, vb, yb), Q(ua, vb, yb)], o.toit || ZINC);
  else if (lu >= lv) {                                                  // faîte selon u
    pan(bp, [Q(ua, va, yb), Q(ub, va, yb), Q(ub - k, vm, yb + h), Q(ua + k, vm, yb + h)], toit, 0.95); pan(bp, [Q(ua, vb, yb), Q(ub, vb, yb), Q(ub - k, vm, yb + h), Q(ua + k, vm, yb + h)], toit, 1.05);
    pan(bp, [Q(ua, va, yb), Q(ua, vb, yb), Q(ua + k, vm, yb + h)], toit, 0.9); pan(bp, [Q(ub, va, yb), Q(ub, vb, yb), Q(ub - k, vm, yb + h)], toit, 1);
  } else {                                                              // faîte selon v
    pan(bp, [Q(ua, va, yb), Q(ua, vb, yb), Q(um, vb - k, yb + h), Q(um, va + k, yb + h)], toit, 0.95); pan(bp, [Q(ub, va, yb), Q(ub, vb, yb), Q(um, vb - k, yb + h), Q(um, va + k, yb + h)], toit, 1.05);
    pan(bp, [Q(ua, va, yb), Q(ub, va, yb), Q(um, va + k, yb + h)], toit, 0.9); pan(bp, [Q(ua, vb, yb), Q(ub, vb, yb), Q(um, vb - k, yb + h)], toit, 1);
  }
  if (o.pied !== false) app.foot.push({ ring: r, top: yb + h });
  return yb + h;
}
// Pavillon : un corps carré plus haut que ses voisins, coiffé d'un comble en pavillon.
export const pavillon = (app, B, F, u, v, hu, hv, ya, yb, o = {}) => corps(app, B, F, u - hu, u + hu, v - hv, v + hv, ya, yb, { comble: o.comble ?? Math.min(hu, hv) * 0.7, travee: o.travee || 5, ...o });

// Fronton d'un pavillon central : un pignon de pierre au-dessus de la façade (u = uf), et le toit à deux versants
// qui le prolonge jusqu'à ub.
export function fronton(B, F, uf, ub, v0, v1, ya, yb, col = PIERRE) {
  const vm = (v0 + v1) / 2, c = F.P(uf, vm), Q = (u, v, y) => { const p = F.P(u, v); return [p[0], y, p[1]]; }, bs = B.at('stone', c[0], c[1]), bp = B.at('plain', c[0], c[1]);
  for (const u of [uf, ub]) { const a = Q(u, v0, ya), b = Q(u, v1, ya), t = Q(u, vm, yb); bs.tri(a[0], a[1], a[2], b[0], b[1], b[2], t[0], t[1], t[2], 0, 0, 2, 0, 1, 1, col, 0.9, 0.9, 1); bs.tri(b[0], b[1], b[2], a[0], a[1], a[2], t[0], t[1], t[2], 2, 0, 0, 0, 1, 1, col, 0.9, 0.9, 1); }
  pan(bp, [Q(uf, v0, ya), Q(ub, v0, ya), Q(ub, vm, yb), Q(uf, vm, yb)], ZINC, 0.95); pan(bp, [Q(uf, v1, ya), Q(ub, v1, ya), Q(ub, vm, yb), Q(uf, vm, yb)], ZINC, 1.05);
}

