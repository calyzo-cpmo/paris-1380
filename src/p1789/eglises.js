// Églises de Paris en 1789. La cathédrale et les églises gothiques reprennent les bâtisseurs de pierre de la maquette
// de 1380 (src/cathedral.js, src/stonework.js), posés sur les emprises que donne encore l'Atlas de Vasserot.
import { buildCathedral } from '../cathedral.js';
import { church, squareTower, COL } from '../stonework.js';
import { ccw, rectCorners, ringCircle } from '../builder.js';
import { mulberry32 } from '../geom.js';

// Les bâtisseurs de pierre déclarent leurs emprises infranchissables à app.solid : ici, elles rejoignent app.foot.
export function solidShim(app) {
  const add = (ring) => { if (ring.length >= 3) app.foot.push({ ring: ccw(ring), top: 0, reel: true }); };
  app.flags = [];
  app.solid = {
    fillPoly: (ring) => add(ring),
    fillCircle: (x, z, r) => add(ringCircle(x, z, r, 12)),
    fillRect: (cx, cz, ux, uz, hl, hw) => add(rectCorners({ cx, cz, ux, uz, hl, hw })),
    strokeLine: (pts, hw) => { for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > 0.1) add(rectCorners({ cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2, ux: (b[0] - a[0]) / L, uz: (b[1] - a[1]) / L, hl: L / 2, hw })); } },
  };
}
const since = (app, n0, top) => { for (let k = n0; k < app.foot.length; k++) app.foot[k].top = top; };

// Notre-Dame sur son emprise ; la flèche de la croisée, ruinée, est démontée de 1786 à 1792.
export function cathedrale(app, B, ring) {
  const n0 = app.foot.length, nd = buildCathedral(app, B, ring, { fleche: false });
  since(app, n0, nd.top); return nd;
}

// Église gothique sur son emprise (ou sur un rectangle évoqué) : nef, bas-côtés, chevet, clocher. Rend la cote du faîte.
export function gothique(app, B, ring, id, o = {}) {
  const n0 = app.foot.length, res = church(app, B, ring, mulberry32(1789 + id * 7), o);
  if (!res) return 0;
  since(app, n0, res.ridge); return res.ridge;
}

// Clocher seul : une tour à beffroi et sa flèche d'ardoise, pour une paroisse dont l'atlas ne garde pas l'église.
export function clocher(app, B, x, z, half, h, base, spire) {
  const n0 = app.foot.length, top = squareTower(app, B, { cx: x, cz: z, ux: 1, uz: 0, hl: half, hw: half }, h, { base, col: COL.stone, belfry: 5, roof: 'spire', roofCol: COL.slate, roofH: spire });
  since(app, n0, top); return top + spire;
}
