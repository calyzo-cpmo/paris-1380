// Briques communes à la ville et aux monuments de Paris 1789 : teintes, façades percées de travées, corps de bâtiment.
import { BAY, ETAGE, RDC } from './textures.js';
import { ccw, cap, skeletonRoof } from '../builder.js';
import { centroid } from '../geom.js';

export const hash = (i, s) => { let x = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(s + 7, 0x85ebca6b); x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 12; return (x >>> 0) / 4294967296; };
export const ENDUITS = [0xefe4c8, 0xe2d2ae, 0xece6d6, 0xdccdb4, 0xd6c4a6, 0xe8d8c6, 0xf0ead8, 0xd9d2c0];
export const ARDOISE = 0x687480, TUILES = 0xb4744e, PLOMB = 0x8a9498, PIERRE = 0xe6dcc4;

// ---------------------------------------------------------------- volumes
// Façade le long d'un anneau (aire positive) : u compté en travées (4 par motif), v en étages.
// inward : paroi tournée vers l'intérieur de l'anneau (cours).
export function facade(b, r, inward, yb, yt, vBot, vTop, col, u0, s0, s1) {
  let u = u0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], c = r[(i + 1) % r.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (L < 0.4) continue;
    const uu = Math.max(1, Math.round(L / BAY)) * 0.25;
    if (!inward) b.quad(c[0], yb, c[1], a[0], yb, a[1], a[0], yt, a[1], c[0], yt, c[1], u + uu, vBot, u, vTop, col, s0, s1);
    else b.quad(a[0], yb, a[1], c[0], yb, c[1], c[0], yt, c[1], a[0], yt, a[1], u, vBot, u + uu, vTop, col, s0, s1);
    u += uu;
  }
}

// Un corps de bâtiment : rez-de-chaussée, étages, comble. kind : 'maison', 'eglise', 'public', 'annexe'.
export function building(app, B, ex, id, o) {
  const T = app.terrain, outer = ccw(ex.outer), holes = ex.holes.map(ccw), c = centroid(outer);
  let lo = 1e9, hi = -1e9; for (const p of outer) { const h = T.height(p[0], p[1]); if (h < lo) lo = h; if (h > hi) hi = h; }
  const y0 = Math.max(lo, 0.3), yb = lo - 0.8, col = o.col, exN = { outer, holes };
  let top;
  if (o.kind === 'eglise') {
    const eave = y0 + o.h, b = B.at('stone', c[0], c[1]);
    facade(b, outer, false, yb, eave, 0, (eave - yb) * 0.25, col, 0, 0.78, 1); for (const h of holes) facade(b, h, true, yb, eave, 0, (eave - yb) * 0.25, col, 0, 0.7, 0.95);
    top = skeletonRoof(B.at('roof', c[0], c[1]), exN, eave, { pitch: 1.25, step: 1.4, maxH: 9, col: PLOMB });
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
    const br = B.at('roof', c[0], c[1]);
    if (o.area < 28) { cap(br, outer, holes, eave + 0.25, { col: o.roof, s: 0.92 }); facade(B.at('plain', c[0], c[1]), outer, false, eave, eave + 0.25, 0, 0, col, 0, 0.9, 0.9); top = eave + 0.25; }
    else top = skeletonRoof(br, exN, eave, o.mansard ? { pitch: 1.55, step: 1.5, maxH: 2.4, col: o.roof } : { pitch: 0.75, step: 1.6, maxH: 4.2, col: o.roof });
  }
  app.foot.push({ ring: outer, top, reel: !!o.reel });
  return top;
}

