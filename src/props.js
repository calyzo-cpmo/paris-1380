// Menus objets et scènes de vie : étals, tonneaux, puits, croix, échafaudages, grues, meules,
// marchés, chantiers, figurants, villages et châteaux des environs.
import { FRAME, layer, polys, LABELS, EXTRA_ROAD } from './data.js';
import { LU } from './raster.js';
import { mulberry32, centroid, polyArea, minAreaRect, clamp, pointInPoly } from './geom.js';
import { rgb, tint, box, cyl, cone, disc, gableRoof, rectCorners, walls } from './builder.js';
import { COL, wallLine, squareTower, roundTower, church, cross, flagAt } from './special.js';
import { placeHouse, PLASTERS, TILES } from './houses.js';
import { VILLAGES } from './country.js';

const WOOD = rgb(112, 88, 62), WOOD_D = rgb(78, 60, 44), HAY = rgb(196, 172, 104), IRON = rgb(60, 58, 58);
const CLOTHS = [rgb(186, 150, 84), rgb(150, 62, 50), rgb(214, 204, 180), rgb(96, 116, 84), rgb(70, 92, 132), rgb(168, 120, 70)];
const GOODS = [rgb(196, 160, 110), rgb(150, 70, 56), rgb(92, 120, 70), rgb(120, 126, 134), rgb(176, 110, 70), rgb(210, 196, 150), rgb(80, 96, 140)];

// Quadrilatère orienté vers `out` (vecteur indicatif).
function quadOut(b, A, Bq, Cq, D, out, col, s = 1) {
  const ux = Bq[0] - A[0], uy = Bq[1] - A[1], uz = Bq[2] - A[2], vx = D[0] - A[0], vy = D[1] - A[1], vz = D[2] - A[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  if (nx * out[0] + ny * out[1] + nz * out[2] >= 0) b.quad(A[0], A[1], A[2], Bq[0], Bq[1], Bq[2], Cq[0], Cq[1], Cq[2], D[0], D[1], D[2], 0, 0, 1, 1, col, s, s);
  else b.quad(A[0], A[1], A[2], D[0], D[1], D[2], Cq[0], Cq[1], Cq[2], Bq[0], Bq[1], Bq[2], 0, 0, 1, 1, col, s, s);
}
export function panel2(b, A, Bq, Cq, D, col, s = 1) {     // panneau visible des deux côtés
  b.quad(A[0], A[1], A[2], Bq[0], Bq[1], Bq[2], Cq[0], Cq[1], Cq[2], D[0], D[1], D[2], 0, 0, 1, 1, col, s, s);
  b.quad(A[0], A[1], A[2], D[0], D[1], D[2], Cq[0], Cq[1], Cq[2], Bq[0], Bq[1], Bq[2], 0, 0, 1, 1, tint(col, 0.75), s, s);
}

// Poutre de section carrée entre deux points quelconques.
export function beam(b, p0, p1, th, col) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], L = Math.hypot(dx, dy, dz) || 1;
  let ax, ay, az;
  if (Math.abs(dy) / L > 0.95) { ax = 1; ay = 0; az = 0; } else { ax = -dz; ay = 0; az = dx; const l = Math.hypot(ax, az); ax /= l; az /= l; }
  let cx = (dy * az - dz * ay) / L, cy = (dz * ax - dx * az) / L, cz = (dx * ay - dy * ax) / L;
  const h = th / 2;
  for (const [sx, sy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ox = (ax * sx + cx * sy) * h, oy = (ay * sx + cy * sy) * h, oz = (az * sx + cz * sy) * h;      // centre de la face
    const tx = (ax * sy + cx * sx) * h, ty = (ay * sy + cy * sx) * h, tz = (az * sy + cz * sx) * h;      // demi-largeur
    quadOut(b, [p0[0] + ox - tx, p0[1] + oy - ty, p0[2] + oz - tz], [p0[0] + ox + tx, p0[1] + oy + ty, p0[2] + oz + tz], [p1[0] + ox + tx, p1[1] + oy + ty, p1[2] + oz + tz], [p1[0] + ox - tx, p1[1] + oy - ty, p1[2] + oz - tz], [ox, oy, oz], col);
  }
}

export function barrel(b, x, y, z, s = 1) { cyl(b, x, z, 0.33 * s, y, y + 0.9 * s, { seg: 7, col: WOOD, s0: 0.8 }); disc(b, x, z, 0.33 * s, y + 0.9 * s, { seg: 7, col: WOOD_D }); }
export function crate(b, x, y, z, ang, s = 1) { box(b, { cx: x, cz: z, ux: Math.cos(ang), uz: Math.sin(ang), hl: 0.4 * s, hw: 0.3 * s }, y, y + 0.5 * s, { col: WOOD, s0: 0.8 }); }
export function haystack(b, x, y, z, s = 1) { cyl(b, x, z, 1.5 * s, y - 0.1, y + 1.1 * s, { seg: 8, col: HAY, s0: 0.8 }); cone(b, x, z, 1.6 * s, y + 1.1 * s, y + 3.0 * s, { seg: 8, col: HAY }); }

// Étal de marché : comptoir, quatre poteaux, toile tendue, marchandises ; un marchand derrière, des chalands devant.
export function stall(app, B, x, z, ang, r) {
  const T = app.terrain, y = Math.max(0.3, T.height(x, z)), b = B.at('plain', x, z);
  const ux = Math.cos(ang), uz = Math.sin(ang), nx = -uz, nz = ux;       // u : longueur du comptoir ; n : côté des chalands
  const P = (a, c, yy) => [x + ux * a + nx * c, yy, z + uz * a + nz * c];
  box(b, { cx: x, cz: z, ux, uz, hl: 1.25, hw: 0.45 }, y - 0.1, y + 0.85, { col: WOOD, s0: 0.7, topCol: tint(WOOD, 1.15) });
  for (const [a, c, hh] of [[-1.3, -0.9, 2.3], [1.3, -0.9, 2.3], [-1.3, 0.75, 1.95], [1.3, 0.75, 1.95]]) { const p = P(a, c, 0); box(b, { cx: p[0], cz: p[2], ux, uz, hl: 0.05, hw: 0.05 }, y - 0.1, y + hh, { col: WOOD_D, top: false }); }
  const cl = CLOTHS[(r() * CLOTHS.length) | 0];
  panel2(b, P(-1.45, 0.95, y + 1.9), P(1.45, 0.95, y + 1.9), P(1.45, -1.0, y + 2.35), P(-1.45, -1.0, y + 2.35), cl);
  for (let i = 0; i < 4; i++) { const a = -0.95 + i * 0.62 + (r() - 0.5) * 0.15, p = P(a, (r() - 0.5) * 0.3, 0), g = GOODS[(r() * GOODS.length) | 0]; box(b, { cx: p[0], cz: p[2], ux, uz, hl: 0.2 + r() * 0.08, hw: 0.16 }, y + 0.85, y + 0.98 + r() * 0.2, { col: g }); }
  app.solid.fillRect(x, z, ux, uz, 1.3, 0.5, 3);
  const m = P((r() - 0.5) * 0.8, -0.75, 0); app.figurants.push([m[0], m[2], Math.atan2(nx, nz), r() < 0.6 ? 'man' : 'robe', null, null, 'merchant']);
  const nc = (r() * 3) | 0;
  for (let i = 0; i < nc; i++) { const c = P((r() - 0.5) * 2.2, 1.0 + r() * 0.8, 0); app.figurants.push([c[0], c[2], Math.atan2(-nx, -nz) + (r() - 0.5) * 0.8, r() < 0.5 ? 'man' : 'robe', null, null]); }
}

export function well(app, B, x, z) {
  const y = Math.max(0.3, app.terrain.height(x, z)), st = B.at('stone', x, z), b = B.at('plain', x, z);
  cyl(st, x, z, 0.85, y - 0.2, y + 0.8, { seg: 8, col: COL.stoneGrey }); disc(b, x, z, 0.7, y + 0.5, { seg: 8, col: rgb(40, 52, 58) });
  for (const s of [-1, 1]) box(b, { cx: x + s * 0.95, cz: z, ux: 1, uz: 0, hl: 0.06, hw: 0.06 }, y, y + 2.1, { col: WOOD_D, top: false });
  box(b, { cx: x, cz: z, ux: 1, uz: 0, hl: 1.05, hw: 0.06 }, y + 2.0, y + 2.12, { col: WOOD_D });
  gableRoof(B.at('roof', x, z), null, { cx: x, cz: z, ux: 1, uz: 0, hl: 1.2, hw: 0.75 }, y + 2.12, 0.55, { col: COL.tileOld, overhang: 0.1 });
  app.solid.fillCircle(x, z, 1, 3);
}

// Échafaudage de perches et de plateaux contre un parement.
export function scaffold(app, B, x, z, ux, uz, len, h, o = {}) {
  const T = app.terrain, y0 = o.base ?? Math.max(0.3, T.height(x, z)), b = B.at('plain', x, z), nx = -uz, nz = ux, dep = o.depth ?? 1.5;
  const n = Math.max(2, Math.round(len / 2.6));
  for (let i = 0; i <= n; i++) for (const c of [0.15, dep]) { const a = -len / 2 + (i / n) * len; box(b, { cx: x + ux * a + nx * c, cz: z + uz * a + nz * c, ux, uz, hl: 0.06, hw: 0.06 }, y0 - 0.3, y0 + h + 0.9, { col: WOOD_D, top: false }); }
  for (let yy = 2.2; yy <= h; yy += 2.3) {
    box(b, { cx: x + nx * (dep / 2 + 0.07), cz: z + nz * (dep / 2 + 0.07), ux, uz, hl: len / 2 + 0.2, hw: dep / 2 + 0.1 }, y0 + yy, y0 + yy + 0.07, { col: WOOD });
    if (o.workers && app.figurants) for (let k = 0; k < 2; k++) { const a = (o.r() - 0.5) * len * 0.8; app.figurants.push([x + ux * a + nx * dep * 0.5, z + uz * a + nz * dep * 0.5, Math.atan2(-nx, -nz), 'man', null, y0 + yy + 0.07, 'worker']); }
  }
  for (let i = 0; i < n; i += 2) { const a0 = -len / 2 + (i / n) * len, a1 = -len / 2 + ((i + 1) / n) * len; beam(b, [x + ux * a0 + nx * dep, y0, z + uz * a0 + nz * dep], [x + ux * a1 + nx * dep, y0 + Math.min(h, 4.6), z + uz * a1 + nz * dep], 0.07, WOOD_D); }
}

// Grue à roue (« cage d'écureuil ») : chevalet, flèche, grande roue et câble.
export function crane(app, B, x, z, y, ang, s = 1) {
  const b = B.at('plain', x, z), ux = Math.cos(ang), uz = Math.sin(ang), nx = -uz, nz = ux;
  const P = (a, c, yy) => [x + ux * a + nx * c, y + yy, z + uz * a + nz * c];
  for (const c of [-1, 1]) { beam(b, P(-1.2 * s, c * 1.1 * s, 0), P(0.2 * s, c * 0.5 * s, 5.2 * s), 0.16 * s, WOOD_D); beam(b, P(1.6 * s, c * 1.1 * s, 0), P(0.2 * s, c * 0.5 * s, 5.2 * s), 0.16 * s, WOOD_D); }
  beam(b, P(0.2 * s, 0, 5.2 * s), P(4.6 * s, 0, 7.8 * s), 0.18 * s, WOOD);                 // flèche
  beam(b, P(0.2 * s, 0, 5.2 * s), P(-1.6 * s, 0, 3.9 * s), 0.14 * s, WOOD);
  beam(b, P(4.6 * s, 0, 7.8 * s), P(4.6 * s, 0, 2.2 * s), 0.035, IRON);                    // câble
  box(b, { cx: P(4.6 * s, 0, 0)[0], cz: P(4.6 * s, 0, 0)[2], ux, uz, hl: 0.45, hw: 0.3 }, y + 1.6 * s, y + 2.2 * s, { col: COL.stone });   // pierre levée
  const w = P(-0.3 * s, 0, 1.9 * s), R = 1.7 * s;                                         // roue d'axe n
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * 6.2832, a1 = ((i + 1) / 8) * 6.2832;
    const q0 = [w[0] + ux * Math.cos(a0) * R, w[1] + Math.sin(a0) * R, w[2] + uz * Math.cos(a0) * R], q1 = [w[0] + ux * Math.cos(a1) * R, w[1] + Math.sin(a1) * R, w[2] + uz * Math.cos(a1) * R];
    for (const c of [-0.5, 0.5]) beam(b, [q0[0] + nx * c * s, q0[1], q0[2] + nz * c * s], [q1[0] + nx * c * s, q1[1], q1[2] + nz * c * s], 0.09 * s, WOOD);
    if (i % 2 === 0) beam(b, [w[0], w[1], w[2]], q0, 0.07 * s, WOOD_D);
  }
}

// Marchés : étals semés sur les places.
export function buildMarkets(app, B) {
  const r = mulberry32(1137), lu = app.lu, occ = app.solid;
  const open = (x, z) => lu.get(x, z) === LU.OPEN && !occ.get(x, z);
  const zones = [[-335, -992, 120, 80], [-120, -870, 70, 22], [60, -352, 70, 40], [-105, -28, 34, 12], [-146, 238, 40, 18], [194, -335, 40, 12], [-227, -560, 45, 16], [300, -250, 40, 12], [-580, -690, 40, 10], [-1170, 150, 60, 14], [-20, -1100, 60, 12], [870, -160, 50, 10], [-400, 110, 35, 8]];
  let n = 0;
  for (const [cx, cz, R, cnt] of zones) {
    let placed = 0;
    for (let t = 0; t < cnt * 30 && placed < cnt; t++) {
      const a = r() * 6.2832, d = Math.sqrt(r()) * R, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, ang = r() * Math.PI;
      let ok = open(x, z);
      for (let k = 0; ok && k < 8; k++) { const q = (k / 8) * 6.2832; ok = open(x + Math.cos(q) * 2.6, z + Math.sin(q) * 2.6) && open(x + Math.cos(q) * 4.2, z + Math.sin(q) * 4.2); }
      if (!ok) continue;
      stall(app, B, x, z, ang, r); placed++; n++;
      if (r() < 0.35) barrel(B.at('plain', x, z), x + Math.cos(ang) * 1.9, Math.max(0.3, app.terrain.height(x, z)), z + Math.sin(ang) * 1.9);
    }
  }
  // croix de Grève, pilori
  const g = [78, -372], gy = app.terrain.height(g[0], g[1]), st = B.at('stone', g[0], g[1]);
  for (let i = 0; i < 4; i++) cyl(st, g[0], g[1], 2.2 - i * 0.45, gy + i * 0.3 - 0.1, gy + (i + 1) * 0.3, { seg: 8, col: COL.stone });
  cyl(st, g[0], g[1], 0.14, gy + 1.2, gy + 4.6, { seg: 6, col: COL.stone }); cross(st, g[0], gy + 4.5, g[1], 1, 0, 1.1, COL.stone);
  app.solid.fillCircle(g[0], g[1], 2.2, 3);
  return n;
}

// Cours et campagne : puits, tas de bois, meules.
export function buildYards(app, B) {
  const r = mulberry32(77), lu = app.lu, occ = app.solid, T = app.terrain;
  let wells = 0, stacks = 0;
  for (let z = FRAME.z0 + 20; z < FRAME.z1 - 20; z += 34) for (let x = FRAME.x0 + 20; x < FRAME.x1 - 20; x += 34) {
    const px = x + (r() - 0.5) * 30, pz = z + (r() - 0.5) * 30, c = lu.get(px, pz);
    if (c === LU.BATI || c === LU.COURT) {
      let ok = !occ.get(px, pz);
      for (let k = 0; ok && k < 6; k++) { const q = (k / 6) * 6.2832; ok = !occ.get(px + Math.cos(q) * 2.2, pz + Math.sin(q) * 2.2) && lu.get(px + Math.cos(q) * 2.2, pz + Math.sin(q) * 2.2) === c; }
      if (!ok) continue;
      if (r() < 0.45) { well(app, B, px, pz); wells++; }
      else { const b = B.at('plain', px, pz), y = T.height(px, pz), a = r() * 3.14; box(b, { cx: px, cz: pz, ux: Math.cos(a), uz: Math.sin(a), hl: 1.3, hw: 0.45 }, y - 0.1, y + 0.9 + r() * 0.5, { col: rgb(128, 100, 70), s0: 0.75 }); occ.fillRect(px, pz, Math.cos(a), Math.sin(a), 1.3, 0.45, 3); }
    } else if ((c === LU.FIELD || c === LU.OUT) && r() < 0.06 && T.sdWater(px, pz) < -15) {
      const y = T.height(px, pz); if (y < 1) continue;
      const b = B.at('plain', px, pz), n = 1 + ((r() * 3) | 0);
      for (let k = 0; k < n; k++) haystack(b, px + k * 4.2, T.height(px + k * 4.2, pz), pz + (r() - 0.5) * 3, 0.8 + r() * 0.4);
      stacks += n;
    }
  }
  return { wells, stacks };
}

// Chantiers en cours vers 1380 : échafaudages, grues, tas de pierre.
export function buildChantiers(app, B) {
  const r = mulberry32(1370), M = app.monuments;
  const stones = (x, z, n) => { const b = B.at('stone', x, z); for (let i = 0; i < n * 3; i++) { const px = x + (r() - 0.5) * 12, pz = z + (r() - 0.5) * 12, y = app.terrain.height(px, pz); if (y < 0.8 || app.solid.get(px, pz) || i % 3 === 2) continue; box(b, { cx: px, cz: pz, ux: Math.cos(i), uz: Math.sin(i), hl: 0.5 + r() * 0.4, hw: 0.3 + r() * 0.2 }, y - 0.1, y + 0.4 + r() * 0.5, { col: COL.stone }); } };
  if (M.bastille) {
    const c = M.bastille.c, top = M.bastille.top;
    scaffold(app, B, c[0] - 19.5, c[1] + 4, 0.1, 1, 22, 11.5, { depth: 1.6, workers: true, r, base: top - 13.5 });     // échafaudage en bascule sous le couronnement
    crane(app, B, c[0] - 6, c[1] - 12, top - 0.9, 2.6, 1.0);
    stones(c[0] - 62, c[1] + 4, 14);
    for (let i = 0; i < 6; i++) { const px = c[0] - 66 + r() * 10, pz = c[1] + r() * 14; if (app.terrain.height(px, pz) > 0.8) app.figurants.push([px, pz, r() * 6.28, 'man', null, null, 'worker']); }
  }
  for (const s of app.chantiers) {       // églises figurées « en construction » sur le plan
    scaffold(app, B, s.x, s.z, s.ux, s.uz, s.len, s.h, { depth: 1.5, workers: true, r });
    const cx = s.x - s.uz * 7, cz = s.z + s.ux * 7;
    crane(app, B, cx, cz, Math.max(0.3, app.terrain.height(cx, cz)), Math.atan2(-s.ux, s.uz), 0.9);
    stones(cx + 5, cz + 4, 10);
  }
  if (M.bridges && M.bridges.saintMichel) {
    const m = M.bridges.saintMichel, e = m.end;      // tête de pont sud, encore en travaux
    crane(app, B, e[0] - 2, e[1] - 6, m.y, 1.2, 0.9);
    stones(e[0] + 3, e[1] + 9, 12);
    for (let i = 0; i < 5; i++) app.figurants.push([e[0] + (r() - 0.5) * 8, e[1] + 6 + r() * 8, r() * 6.28, 'man', null, null, 'worker']);
  }
}

// Figurants : lavandières sur les grèves, paysans et troupeaux dans les cultures, moines dans les cloîtres.
export function buildFigurants(app) {
  const r = mulberry32(909), lu = app.lu, occ = app.solid, T = app.terrain, F = app.figurants;
  // lavandières et débardeurs au bord de l'eau
  const ports = (LABELS.divers || []).filter((l) => /^Port/.test(l.t)).map((l) => l.p);
  ports.push([20, -330], [-560, -640], [330, -120], [-80, 130], [-700, -560]);
  for (const [px, pz] of ports) for (let i = 0; i < 60; i++) {
    const x = px + (r() - 0.5) * 170, z = pz + (r() - 0.5) * 170, sd = T.sdWater(x, z);
    if (sd < -1.2 && sd > -9 && !occ.get(x, z) && r() < 0.4) { const w = r() < 0.5; F.push([x, z, r() * 6.28, w ? 'robe' : 'man', null, null, w ? 'peasant' : 'worker']); }
  }
  // cultures : paysans, bergers et moutons, vaches
  for (let i = 0; i < 1300; i++) {
    const x = FRAME.x0 + 30 + r() * (FRAME.x1 - FRAME.x0 - 60), z = FRAME.z0 + 30 + r() * (FRAME.z1 - FRAME.z0 - 60), c = lu.get(x, z);
    if ((c !== LU.FIELD && c !== LU.ISLAND && c !== LU.OUT && c !== LU.GARDEN) || occ.get(x, z) || T.height(x, z) < 1.2) continue;
    const q = r();
    if (q < 0.5) F.push([x, z, r() * 6.28, r() < 0.6 ? 'man' : 'robe', null, null, 'peasant']);
    else if (q < 0.74 && c !== LU.GARDEN) {                    // troupeau de moutons et son berger
      F.push([x, z, r() * 6.28, 'man', [120, 100, 78], null, 'peasant']);
      const n = 6 + ((r() * 9) | 0); for (let k = 0; k < n; k++) { const a = r() * 6.28, d = 2 + r() * 11, sx = x + Math.cos(a) * d, sz = z + Math.sin(a) * d; if (T.height(sx, sz) > 1 && !occ.get(sx, sz)) F.push([sx, sz, r() * 6.28, 'sheep', null, null]); }
    } else if (q < 0.86 && c !== LU.GARDEN) { const n = 3 + ((r() * 5) | 0); for (let k = 0; k < n; k++) { const a = r() * 6.28, d = 2 + r() * 12, sx = x + Math.cos(a) * d, sz = z + Math.sin(a) * d; if (T.height(sx, sz) > 1 && !occ.get(sx, sz)) F.push([sx, sz, r() * 6.28, 'beast', null, null]); } }
  }
  // cloîtres : religieux
  const habits = [[34, 32, 34], [214, 208, 196], [98, 84, 70], [70, 62, 56]];
  for (const name of ['Religieux', 'StMartin', 'StVictor', 'StGermain', 'Temple']) for (const s of polys(name, ['#3D575D', '#F8705F'])) {
    const c = centroid(s.pts), A = Math.abs(polyArea(s.pts)), n = clamp(Math.round(A / 500), 2, 9), hb = habits[(r() * habits.length) | 0];
    for (let i = 0; i < n * 5 && i < 60; i++) { const x = c[0] + (r() - 0.5) * Math.sqrt(A) * 1.4, z = c[1] + (r() - 0.5) * Math.sqrt(A) * 1.4; if (pointInPoly(x, z, s.pts) && !occ.get(x, z) && r() < 0.25) F.push([x, z, r() * 6.28, 'robe', hb, null, 'monk']); }
  }
}

// Maisons rurales le long d'une rue, des deux côtés.
function hamlet(app, B, r, pts, o = {}) {
  const lu = app.lu, occ = app.solid, T = app.terrain;
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]), dx = (c[0] - a[0]) / L, dz = (c[1] - a[1]) / L;
    for (const s of [-1, 1]) {
      let t = r() * 6;
      while (t < L - 6) {
        const w = 5.5 + r() * 3.5, d = 5.5 + r() * 2.5, px = a[0] + dx * (t + w / 2), pz = a[1] + dz * (t + w / 2);
        const nx = -dz * s, nz = dx * s, rx = nz, rz = -nx;
        const ox = px + nx * (o.half ?? 3.4) - rx * w / 2, oz = pz + nz * (o.half ?? 3.4) - rz * w / 2, cx = ox + rx * w / 2 + nx * d / 2, cz = oz + rz * w / 2 + nz * d / 2;
        t += w + (r() < (o.gap ?? 0.5) ? 2 + r() * 9 : 0.4);
        if (T.height(cx, cz) < 1.5) continue;
        if (o.onlyOut && (lu.get(cx, cz) !== LU.OUT || occ.rectFraction(cx, cz, rx, rz, w / 2, d / 2, (v) => v !== 0) > 0)) continue;
        const thatch = r() < (o.thatch ?? 0.6);
        placeHouse(app, B, r, { ox, oz, rx, rz, nx, nz, w, d, floors: 1 + (r() < (o.two ?? 0.35) ? 1 : 0), gableFront: r() < 0.35, style: thatch ? 7 : r() < 0.5 ? 2 : 4, gfRow: thatch ? 7 : 1, jetty: 0, pitch: thatch ? 1.0 : 1.2, plaster: PLASTERS[(r() * PLASTERS.length) | 0], roofCol: thatch ? rgb(150, 134, 96) : TILES[(r() * TILES.length) | 0], plain: true });
        occ.fillRect(cx, cz, rx, rz, w / 2, d / 2, 1);
        n++;
      }
    }
  }
  return n;
}

export function buildCountry(app, B) {
  const r = mulberry32(1380), T = app.terrain;
  let houses = 0;
  app.clearings = [];
  for (const [name, x, z, ang, size] of VILLAGES) {
    if (T.sdWater(x, z) > -40) continue;
    const dx = Math.cos(ang), dz = Math.sin(ang), L = size * 5.5;
    const pts = [[x - dx * L, z - dz * L], [x - dx * L * 0.3 + dz * 12, z - dz * L * 0.3 - dx * 12], [x + dx * L * 0.4, z + dz * L * 0.4], [x + dx * L, z + dz * L + 10]];
    houses += hamlet(app, B, r, pts, {});
    if (size > 20) houses += hamlet(app, B, r, [[x - dz * 20, z + dx * 20], [x - dz * (L * 0.7), z + dx * (L * 0.7)]], { gap: 0.6 });
    const big = name === 'Saint-Denis', cw = big ? 11 : 4.6 + r() * 1.2, cl = big ? 34 : 10 + r() * 4, cx = x + dz * (cw + 9), cz = z - dx * (cw + 9);
    church(app, B, rectCorners({ cx, cz, ux: 0.98, uz: 0.2, hl: cl, hw: cw }), r, big ? { towerRoof: 'spire' } : {});
    app.clearings.push([x, z, L + 30]);
    app.villages.push({ name, x, z });
  }
  // château de Vincennes : donjon et grande enceinte de Charles V (1361-1380)
  const vx = 6280, vz = 1146, gy = T.height(vx, vz), col = rgb(232, 224, 204);
  const E = { cx: vx, cz: vz, ux: 0.12, uz: 0.993, hl: 165, hw: 88 }, ec = rectCorners(E);
  wallLine(app, B, [...ec, ec[0]], 12, 2.4, { crenel: true, col });
  const tw = [...ec, [(ec[0][0] + ec[1][0]) / 2, (ec[0][1] + ec[1][1]) / 2], [(ec[2][0] + ec[3][0]) / 2, (ec[2][1] + ec[3][1]) / 2], [(ec[1][0] + ec[2][0]) / 2, (ec[1][1] + ec[2][1]) / 2], [ec[0][0] * 0.66 + ec[3][0] * 0.34, ec[0][1] * 0.66 + ec[3][1] * 0.34], [ec[0][0] * 0.3 + ec[3][0] * 0.7, ec[0][1] * 0.3 + ec[3][1] * 0.7]];
  for (const p of tw) squareTower(app, B, { cx: p[0], cz: p[1], ux: E.ux, uz: E.uz, hl: 6, hw: 5 }, 40, { base: gy, col, roof: 'flat' });
  const dj = { cx: vx - E.uz * 70, cz: vz + E.ux * 70, ux: E.ux, uz: E.uz, hl: 8.2, hw: 8.2 };
  squareTower(app, B, dj, 50, { base: gy, col, roof: 'flat' });
  for (const p of rectCorners(dj)) roundTower(app, B, p[0], p[1], 3.3, 52, { base: gy, col, roof: 'flat', machi: false, seg: 12 });
  wallLine(app, B, [...rectCorners({ ...dj, hl: 25, hw: 25 }), rectCorners({ ...dj, hl: 25, hw: 25 })[0]], 9, 1.6, { crenel: true, col });
  flagAt(app, B, dj.cx, dj.cz, gy + 50, 6, 0);
  app.clearings.push([vx, vz, 240]);
  app.monuments.vincennes = { x: dj.cx, z: dj.cz, top: gy + 52 };
  // chartreuse de Vauvert (fondée par Louis IX en 1257), dans la zone masquée par la légende du plan
  const C0 = { cx: -905, cz: 985, ux: 0.94, uz: 0.34, hl: 110, hw: 85 }, cc = rectCorners(C0);
  wallLine(app, B, [...cc, cc[0]], 3.6, 0.8, { col: COL.stoneGrey });
  const Pc = (a, c) => [C0.cx + C0.ux * a - C0.uz * c, C0.cz + C0.uz * a + C0.ux * c];
  const ch = Pc(-55, -45);
  church(app, B, rectCorners({ cx: ch[0], cz: ch[1], ux: C0.ux, uz: C0.uz, hl: 24, hw: 5.6 }), r, {});
  const side = 46;                                                      // grand cloître : cellules à jardinet autour du préau
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, ex = Math.cos(a), ez = Math.sin(a);
    for (let t = -side + 6; t < side - 4; t += 13) {
      const lx = 30 + ex * (side + 7) - ez * t, lz = 15 + ez * (side + 7) + ex * t, p = Pc(lx, lz);
      const nx = C0.ux * ex - C0.uz * ez, nz = C0.uz * ex + C0.ux * ez, rx = nz, rz = -nx;
      placeHouse(app, B, r, { ox: p[0] - rx * 3.4, oz: p[1] - rz * 3.4, rx, rz, nx, nz, w: 6.8, d: 6.2, floors: 1, gableFront: false, style: 4, gfRow: 1, jetty: 0, pitch: 1.15, plaster: PLASTERS[0], roofCol: TILES[1], plain: true });
      app.solid.fillRect(p[0] + nx * 3.1, p[1] + nz * 3.1, rx, rz, 3.4, 3.1, 1);
    }
  }
  app.monuments.chartreux = { x: C0.cx, z: C0.cz };
  for (let i = 0; i < 10; i++) { const p = Pc(30 + (r() - 0.5) * 70, 15 + (r() - 0.5) * 70); app.figurants.push([p[0], p[1], r() * 6.28, 'robe', [214, 208, 196], null, 'monk']); }
  // faubourg Saint-Jacques et Notre-Dame-des-Champs, le long de la route d'Orléans
  houses += hamlet(app, B, r, EXTRA_ROAD, { onlyOut: true, gap: 0.35, thatch: 0.3, two: 0.6, half: 4 });
  const nd = [-770, 1255];
  church(app, B, rectCorners({ cx: nd[0], cz: nd[1], ux: 0.97, uz: 0.24, hl: 15, hw: 5.2 }), r, {});
  return houses;
}

