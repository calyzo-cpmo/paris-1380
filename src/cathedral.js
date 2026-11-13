// La cathédrale Notre-Dame, construite sur son emprise : collatéraux et chapelles, tribunes, grand vaisseau, chevet,
// transept et ses roses, arcs-boutants, façade occidentale et ses deux tours. Sert à la maquette de 1380 et à la page
// de 1789 (où la flèche de la croisée, démontée à partir de 1786, est omise).
import { minAreaRect, dpRing, offsetEx } from './geom.js';
import { rgb, tint, walls, cap, box, cyl, cone, crenels, rectCorners, skeletonRoof, gableRoof, ccw } from './builder.js';
import { fxWalls, fxPanel, markSolid, cross } from './stonework.js';
import { cellUV } from './textures.js';

export const P = (R, a, c) => [R.cx + R.ux * a - R.uz * c, R.cz + R.uz * a + R.ux * c];
export const sub = (R, a0, a1, c0, c1) => ({ cx: R.cx + R.ux * (a0 + a1) / 2 - R.uz * (c0 + c1) / 2, cz: R.cz + R.uz * (a0 + a1) / 2 + R.ux * (c0 + c1) / 2, ux: R.ux, uz: R.uz, hl: (a1 - a0) / 2, hw: (c1 - c0) / 2 });
export function east(R) { if (R.ux < 0) { R.ux = -R.ux; R.uz = -R.uz; } return R; }

// Panneau d'atlas sur une face d'un rectangle orienté. face : 'w' (-u), 'e' (+u), 'n' (-w), 's' (+w) ; position centrée c, largeur wd.
export function facePanel(B, R, face, c, wd, y0, y1, row, cell, col, n = 1, off = 0.08) {
  let a, b;
  if (face === 'w') { a = P(R, -R.hl - off, c + wd / 2); b = P(R, -R.hl - off, c - wd / 2); }
  else if (face === 'e') { a = P(R, R.hl + off, c - wd / 2); b = P(R, R.hl + off, c + wd / 2); }
  else if (face === 'n') { a = P(R, c - wd / 2, -R.hw - off); b = P(R, c + wd / 2, -R.hw - off); }
  else { a = P(R, c + wd / 2, R.hw + off); b = P(R, c - wd / 2, R.hw + off); }
  fxPanel(B, a[0], a[1], b[0], b[1], y0, y1, row, cell, col, n);
}

// Arc-boutant : dalle inclinée entre une culée et le mur gouttereau.
export function flyer(b, x0, z0, y0, x1, z1, y1, th, col) {
  const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * th / 2, nz = dx / l * th / 2, d = 1.1;
  b.quad(x0 + nx, y0, z0 + nz, x1 + nx, y1, z1 + nz, x1 - nx, y1, z1 - nz, x0 - nx, y0, z0 - nz, 0, 0, l * 0.25, th * 0.25, col);
  b.quad(x0 - nx, y0 - d, z0 - nz, x1 - nx, y1 - d, z1 - nz, x1 - nx, y1, z1 - nz, x0 - nx, y0, z0 - nz, 0, 0, l * 0.25, 0.3, col, 0.8, 1);
  b.quad(x1 + nx, y1 - d, z1 + nz, x0 + nx, y0 - d, z0 + nz, x0 + nx, y0, z0 + nz, x1 + nx, y1, z1 + nz, 0, 0, l * 0.25, 0.3, col, 0.8, 1);
}

// pts : emprise au sol ; o.fleche : false pour omettre la flèche de la croisée.
export function buildCathedral(app, B, pts, o = {}) {
  const ring = ccw(dpRing(pts, 0.35)), R = east(minAreaRect(ring)), T = app.terrain;
  const gy = Math.max(3, T.height(R.cx, R.cz)), col = rgb(238, 229, 207), lead = rgb(132, 138, 142);
  const st = B.at('stone', R.cx, R.cz), rb = B.at('roof', R.cx, R.cz), pl = B.at('plain', R.cx, R.cz);
  const L = R.hl, W = R.hw;
  markSolid(app, ring);
  // chapelles et collatéraux extérieurs
  fxWalls(B, ring, gy - 1, gy + 10.5, 0, { col, bay: 5.6 });
  skeletonRoof(rb, { outer: ring, holes: [] }, gy + 10.5, { pitch: 0.45, col: lead, maxH: 2.2, overhang: 0.2 });
  // tribunes
  const trib = offsetEx([ring], -5.6)[0];
  if (trib) { fxWalls(B, trib.outer, gy + 10, gy + 20, 0, { col, bay: 5.6, s0: 0.95 }); skeletonRoof(rb, { outer: trib.outer, holes: [] }, gy + 20, { pitch: 0.5, col: lead, maxH: 2.4 }); }
  // grand vaisseau : nef, chœur, chevet
  const wn = 7.3, yW = gy + 33, rise = 10.2, u0 = -L + 13.5, u1 = L - 5.6 - wn;
  const nave = sub(R, u0, u1, -wn, wn);
  fxWalls(B, rectCorners(nave), gy + 20, yW, 7, { col, bay: 5.6, s0: 1 });
  const ridge = gableRoof(rb, st, nave, yW, rise, { col: lead, overhang: 0.5, gable: { col } });
  const ap = P(R, u1, 0), base = Math.atan2(R.uz, R.ux), fx = B.at('stonefx', ap[0], ap[1]), uv7 = cellUV(7, 0);
  const arc = []; for (let i = 0; i <= 8; i++) { const a = base - Math.PI / 2 + (i / 8) * Math.PI; arc.push([ap[0] + Math.cos(a) * wn, ap[1] + Math.sin(a) * wn]); }
  for (let i = 0; i < 8; i++) { const p = arc[i], q = arc[i + 1]; fx.quad(q[0], gy + 20, q[1], p[0], gy + 20, p[1], p[0], yW, p[1], q[0], yW, q[1], (i + 1) / 8, uv7[2], i / 8, uv7[3], col); }
  cone(rb, ap[0], ap[1], wn + 0.5, yW, ridge, { seg: 16, a0: base - Math.PI / 2, col: lead });
  // transept
  const uc = -L + 69;
  const tr = { cx: P(R, uc, 0)[0], cz: P(R, uc, 0)[1], ux: -R.uz, uz: R.ux, hl: W - 0.4, hw: 7 };
  fxWalls(B, rectCorners(tr), gy + 10, yW, 7, { col, bay: 7, s0: 0.95 });
  gableRoof(rb, st, tr, yW, rise, { col: lead, overhang: 0.5, gable: { col } });
  for (const sgn of [-1, 1]) {      // roses et portails des bras du transept
    const f = sgn < 0 ? 'w' : 'e';
    facePanel(B, tr, f, 0, 12.5, gy + 17, gy + 29.5, 6, 0, col);
    facePanel(B, tr, f, 0, 7.5, gy, gy + 9.5, 6, 2, col);
  }
  if (o.fleche !== false) {
    // flèche de la croisée (charpente couverte de plomb, vers 1250)
    const cr = P(R, uc, 0);
    cyl(pl, cr[0], cr[1], 2.3, ridge - 2, ridge + 9, { seg: 8, col: lead });
    cone(pl, cr[0], cr[1], 2.9, ridge + 9, ridge + 37, { seg: 8, col: lead });
  }
  // arcs-boutants et culées
  const culee = (a, c, ang) => {
    const o = P(R, a, c), dx = Math.cos(ang), dz = Math.sin(ang);
    box(st, { cx: o[0], cz: o[1], ux: dx, uz: dz, hl: 1.7, hw: 0.75 }, gy + 9, gy + 25, { col });
    cone(st, o[0], o[1], 1.1, gy + 25, gy + 29, { seg: 4, col, us: 0.25 });
  };
  for (let a = u0 + 4; a < u1 - 1; a += 5.7) {
    if (Math.abs(a - uc) < 9) continue;
    for (const sg of [-1, 1]) {
      const c = sg * (W - 1.6), ang = base + Math.PI / 2;
      culee(a, c, ang);
      const p0 = P(R, a, c - sg * 1.2), p1 = P(R, a, sg * (wn + 0.1));
      flyer(st, p0[0], p0[1], gy + 23.5, p1[0], p1[1], gy + 30.5, 0.9, col);
    }
  }
  for (let i = 1; i < 8; i++) {
    const a = base - Math.PI / 2 + (i / 8) * Math.PI, rr = Math.min(W - 1.8, L - u1 - 1.5);
    const o = [ap[0] + Math.cos(a) * rr, ap[1] + Math.sin(a) * rr];
    box(st, { cx: o[0], cz: o[1], ux: Math.cos(a), uz: Math.sin(a), hl: 1.7, hw: 0.75 }, gy + 9, gy + 25, { col });
    cone(st, o[0], o[1], 1.1, gy + 25, gy + 29, { seg: 4, col, us: 0.25 });
    flyer(st, ap[0] + Math.cos(a) * (rr - 1.2), ap[1] + Math.sin(a) * (rr - 1.2), gy + 23.5, ap[0] + Math.cos(a) * (wn + 0.1), ap[1] + Math.sin(a) * (wn + 0.1), gy + 30.5, 0.9, col);
  }
  // façade occidentale : massif, galeries, tours
  const fw = Math.min(20.5, W - 2), front = sub(R, -L - 0.3, -L + 14, -fw, fw);
  walls(st, rectCorners(front), gy - 1, gy + 43, { col, s0: 0.7 });
  cap(st, rectCorners(front), [], gy + 43, { col: tint(col, 0.7) });
  facePanel(B, front, 'w', 0, 11.5, gy, gy + 12.5, 6, 1, col);                 // portail du Jugement
  facePanel(B, front, 'w', -13.6, 9.5, gy, gy + 11.5, 6, 2, col);              // portail de la Vierge
  facePanel(B, front, 'w', 13.6, 9.5, gy, gy + 11.5, 6, 2, col);               // portail Sainte-Anne
  for (let k = -3; k <= 3; k++) facePanel(B, front, 'w', k * fw * 2 / 7, fw * 2 / 7, gy + 12.5, gy + 16.2, 6, 7, col);   // galerie des rois
  facePanel(B, front, 'w', 0, 12.4, gy + 17, gy + 29.4, 6, 0, col);            // rose occidentale
  for (const sg of [-1, 1]) facePanel(B, front, 'w', sg * 13.8, 9, gy + 17.5, gy + 29, 0, 2, col);
  for (let k = -3; k <= 3; k++) facePanel(B, front, 'w', k * fw * 2 / 7, fw * 2 / 7, gy + 31, gy + 38, 6, 7, col);   // galerie à jour
  // quatre contreforts à ressauts rythment la façade et montent le long des tours
  for (const c of [-fw + 0.4, -6.9, 6.9, fw - 0.4]) {
    const p = P(R, -L - 1.0, c);
    box(st, { cx: p[0], cz: p[1], ux: R.ux, uz: R.uz, hl: 1.0, hw: 0.95 }, gy - 1, gy + 31, { col, top: false, s0: 0.7 });
    const q = P(R, -L - 0.75, c);
    box(st, { cx: q[0], cz: q[1], ux: R.ux, uz: R.uz, hl: 0.7, hw: 0.8 }, gy + 31, gy + 67.5, { col, s0: 0.95 });
  }
  cross(st, P(R, -L + 14, 0)[0], gy + 43, P(R, -L + 14, 0)[1], -R.uz, R.ux, 1.6, col);
  const tops = [];
  for (const sg of [-1, 1]) {
    const tw = sub(R, -L - 0.3, -L + 13.2, sg > 0 ? fw - 13.2 : -fw, sg > 0 ? fw : -fw + 13.2);
    const c = rectCorners(tw);
    walls(st, c, gy + 43, gy + 69, { col, s0: 0.95 });
    for (const f of ['w', 'e', 'n', 's']) facePanel(B, tw, f, 0, 9.4, gy + 46, gy + 65, 0, 0, col, 2);
    cap(st, c, [], gy + 69, { col: lead });
    crenels(st, c, gy + 69, { closed: true, col, w: 0.5, gap: 0.45, h: 1.0, th: 0.3 });
    for (const k of [0, 1, 2, 3]) { const e = c[k], cxm = tw.cx, czm = tw.cz, dx = e[0] - cxm, dz = e[1] - czm, l = Math.hypot(dx, dz); box(st, { cx: e[0] + dx / l * 0.25, cz: e[1] + dz / l * 0.25, ux: R.ux, uz: R.uz, hl: 0.75, hw: 0.75 }, gy + 43, gy + 68, { col, s0: 0.95 }); }
    tops.push([tw.cx, tw.cz]);
  }
  return { R, gy, top: gy + 69, ridge, name: 'Notre-Dame' };
}
