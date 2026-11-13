// Monuments emblématiques modelés à la main sur leurs emprises du plan de 1380.
import { layer, polys, circles } from './data.js';
import { polyArea, centroid, minAreaRect, dpRing, mulberry32, offsetEx, pointInPoly } from './geom.js';
import { rgb, tint, walls, cap, box, cyl, cone, disc, crenels, rectCorners, skeletonRoof, gableRoof, ccw } from './builder.js';
import { COL, roundTower, squareTower, fxWalls, fxPanel, wallLine, markSolid, stoneBuilding, church, abbey } from './special.js';
import { gate } from './walls.js';
import { placeHouse, PLASTERS, TILES } from './houses.js';
import { cellUV } from './textures.js';

// Forme la plus proche d'un point dans un calque (et la réserve).
function claim(app, name, x, z, filter) {
  let best = null, bd = 1e9;
  for (const s of layer(name)) {
    if (s.kind !== 'poly' || (filter && !filter(s)) || app.claimed.has(s.id)) continue;
    const c = centroid(s.pts), d = pointInPoly(x, z, s.pts) ? 0 : Math.hypot(c[0] - x, c[1] - z);
    if (d < bd) { bd = d; best = s; }
  }
  if (best) app.claimed.add(best.id);
  return best;
}
const P = (R, a, c) => [R.cx + R.ux * a - R.uz * c, R.cz + R.uz * a + R.ux * c];
const sub = (R, a0, a1, c0, c1) => ({ cx: R.cx + R.ux * (a0 + a1) / 2 - R.uz * (c0 + c1) / 2, cz: R.cz + R.uz * (a0 + a1) / 2 + R.ux * (c0 + c1) / 2, ux: R.ux, uz: R.uz, hl: (a1 - a0) / 2, hw: (c1 - c0) / 2 });
function east(R) { if (R.ux < 0) { R.ux = -R.ux; R.uz = -R.uz; } return R; }

// Panneau d'atlas sur une face d'un rectangle orienté. face : 'w' (-u), 'e' (+u), 'n' (-w), 's' (+w) ; position centrée c, largeur wd.
function facePanel(B, R, face, c, wd, y0, y1, row, cell, col, n = 1, off = 0.08) {
  let a, b;
  if (face === 'w') { a = P(R, -R.hl - off, c + wd / 2); b = P(R, -R.hl - off, c - wd / 2); }
  else if (face === 'e') { a = P(R, R.hl + off, c - wd / 2); b = P(R, R.hl + off, c + wd / 2); }
  else if (face === 'n') { a = P(R, c - wd / 2, -R.hw - off); b = P(R, c + wd / 2, -R.hw - off); }
  else { a = P(R, c + wd / 2, R.hw + off); b = P(R, c - wd / 2, R.hw + off); }
  fxPanel(B, a[0], a[1], b[0], b[1], y0, y1, row, cell, col, n);
}

// Arc-boutant : dalle inclinée entre une culée et le mur gouttereau.
function flyer(b, x0, z0, y0, x1, z1, y1, th, col) {
  const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * th / 2, nz = dx / l * th / 2, d = 1.1;
  b.quad(x0 + nx, y0, z0 + nz, x1 + nx, y1, z1 + nz, x1 - nx, y1, z1 - nz, x0 - nx, y0, z0 - nz, 0, 0, l * 0.25, th * 0.25, col);
  b.quad(x0 - nx, y0 - d, z0 - nz, x1 - nx, y1 - d, z1 - nz, x1 - nx, y1, z1 - nz, x0 - nx, y0, z0 - nz, 0, 0, l * 0.25, 0.3, col, 0.8, 1);
  b.quad(x1 + nx, y1 - d, z1 + nz, x0 + nx, y0 - d, z0 + nz, x0 + nx, y0, z0 + nz, x1 + nx, y1, z1 + nz, 0, 0, l * 0.25, 0.3, col, 0.8, 1);
}

// ------------------------------------------------------------ Notre-Dame
export function buildNotreDame(app, B) {
  const s = claim(app, 'Religieux', -30, -20, (q) => q.fill === '#FF0000' && Math.abs(polyArea(q.pts)) > 3000);
  if (!s) return null;
  const ring = ccw(dpRing(s.pts, 0.35)), R = east(minAreaRect(ring)), T = app.terrain;
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
  // flèche de la croisée (charpente couverte de plomb, vers 1250)
  const cr = P(R, uc, 0);
  cyl(pl, cr[0], cr[1], 2.3, ridge - 2, ridge + 9, { seg: 8, col: lead });
  cone(pl, cr[0], cr[1], 2.9, ridge + 9, ridge + 37, { seg: 8, col: lead });
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
  const tops = [];
  for (const sg of [-1, 1]) {
    const tw = sub(R, -L - 0.3, -L + 13.2, sg > 0 ? fw - 13.2 : -fw, sg > 0 ? fw : -fw + 13.2);
    const c = rectCorners(tw);
    walls(st, c, gy + 43, gy + 69, { col, s0: 0.95 });
    for (const f of ['w', 'e', 'n', 's']) facePanel(B, tw, f, 0, 9.4, gy + 46, gy + 65, 0, 0, col, 2);
    cap(st, c, [], gy + 69, { col: lead });
    crenels(st, c, gy + 69, { closed: true, col, w: 0.5, gap: 0.45, h: 1.0, th: 0.3 });
    tops.push([tw.cx, tw.cz]);
  }
  // palais épiscopal, au sud de la cathédrale
  const ev = claim(app, 'Religieux', -10, 45, (q) => q.fill === '#FF0000' && Math.abs(polyArea(q.pts)) > 2500);
  if (ev) stoneBuilding(app, B, ev.pts, { floors: 3, col, roofCol: COL.slate, pitch: 1.35, maxRoof: 8, tol: 0.35 });
  return { R, gy, top: gy + 69, ridge, name: 'Notre-Dame' };
}

// ------------------------------------------------------------ Palais de la Cité
export function buildPalais(app, B) {
  const T = app.terrain, col = rgb(240, 232, 212), slate = rgb(72, 86, 112), r = mulberry32(1300);
  const out = {};
  // Sainte-Chapelle (1248), flèche refaite en 1383
  const sc = claim(app, 'Palais', -388, -276, (q) => q.fill === '#FF0000' && Math.abs(polyArea(q.pts)) > 200);
  if (sc) {
    const R0 = east(minAreaRect(sc.pts)), R = { ...R0, hl: 18, hw: 5.9 }, gy = Math.max(3, T.height(R.cx, R.cz));
    const st = B.at('stone', R.cx, R.cz), rb = B.at('roof', R.cx, R.cz), pl = B.at('plain', R.cx, R.cz);
    const body = sub(R, -18, 12.2, -5.9, 5.9), c = rectCorners(body);
    fxWalls(B, c, gy - 1, gy + 7.2, 1, { col, bay: 6 });                      // chapelle basse
    fxWalls(B, c, gy + 7.2, gy + 27.5, 7, { col, bay: 7.4, s0: 1 });          // chapelle haute : verrières
    const ridge = gableRoof(rb, st, body, gy + 27.5, 14.6, { col: slate, overhang: 0.4, gable: { col } });
    const ap = P(R, 12.2, 0), base = Math.atan2(R.uz, R.ux), fx = B.at('stonefx', ap[0], ap[1]), u7 = cellUV(7, 0), u1 = cellUV(1, 0);
    const arc = []; for (let i = 0; i <= 7; i++) { const a = base - Math.PI / 2 + (i / 7) * Math.PI; arc.push([ap[0] + Math.cos(a) * 5.9, ap[1] + Math.sin(a) * 5.9]); }
    for (let i = 0; i < 7; i++) {
      const p = arc[i], q = arc[i + 1];
      fx.quad(q[0], gy - 1, q[1], p[0], gy - 1, p[1], p[0], gy + 7.2, p[1], q[0], gy + 7.2, q[1], (i + 1) / 8, u1[2], i / 8, u1[3], col, 0.76, 1);
      fx.quad(q[0], gy + 7.2, q[1], p[0], gy + 7.2, p[1], p[0], gy + 27.5, p[1], q[0], gy + 27.5, q[1], (i + 1) / 8, u7[2], i / 8, u7[3], col);
    }
    cone(rb, ap[0], ap[1], 6.3, gy + 27.5, ridge, { seg: 14, a0: base - Math.PI / 2, col: slate });
    // contreforts à pinacles
    const but = (x, z, ang) => { box(st, { cx: x, cz: z, ux: Math.cos(ang), uz: Math.sin(ang), hl: 1.2, hw: 0.6 }, gy - 1, gy + 28.5, { col }); cone(st, x, z, 0.9, gy + 28.5, gy + 33, { seg: 4, col }); };
    for (let a = -18; a <= 12.3; a += 7.55) for (const sg of [-1, 1]) { const o = P(R, a, sg * 6.9); but(o[0], o[1], base + Math.PI / 2); }
    for (let i = 1; i < 7; i++) { const a = base - Math.PI / 2 + (i / 7) * Math.PI; but(ap[0] + Math.cos(a) * 6.9, ap[1] + Math.sin(a) * 6.9, a); }
    // façade : porche à deux niveaux, rose, tourelles d'escalier
    facePanel(B, body, 'w', 0, 8.5, gy, gy + 7, 6, 2, col);
    facePanel(B, body, 'w', 0, 8.6, gy + 17, gy + 25.6, 6, 0, col);
    facePanel(B, body, 'w', 0, 3.4, gy + 29, gy + 32.4, 6, 6, col);
    for (const sg of [-1, 1]) { const o = P(R, -18.2, sg * 6.2); cyl(st, o[0], o[1], 1.5, gy - 1, gy + 33, { seg: 8, col }); cone(pl, o[0], o[1], 1.8, gy + 33, gy + 41, { seg: 8, col: rgb(120, 128, 134) }); }
    // flèche
    const fc = P(R, -3, 0);
    cyl(pl, fc[0], fc[1], 1.7, ridge - 3, ridge + 7, { seg: 8, col: rgb(120, 128, 134) });
    cone(pl, fc[0], fc[1], 2.2, ridge + 7, gy + 75, { seg: 8, col: rgb(120, 128, 134) });
    cyl(pl, fc[0], fc[1], 0.1, gy + 75, gy + 78, { seg: 4, col: COL.gold });
    app.solid.fillRect(R.cx, R.cz, R.ux, R.uz, 19, 7, 2);
    out.sainteChapelle = { x: R.cx, z: R.cz, top: gy + 75 };
  }
  // Grand'Salle (1302-1313) : deux nefs jumelles sous deux toits parallèles
  const gs = claim(app, 'Palais', -350, -344, (q) => q.fill === '#000000' && Math.abs(polyArea(q.pts)) > 1000 && q.pts.length <= 6);
  if (gs) {
    const R = minAreaRect(gs.pts), gy = Math.max(3, T.height(R.cx, R.cz)), c = rectCorners(R);
    fxWalls(B, c, gy - 1, gy + 5, 3, { col, bay: 6 });
    fxWalls(B, c, gy + 5, gy + 15, 0, { col, bay: 7, s0: 1 });
    const st = B.at('stone', R.cx, R.cz), rb = B.at('roof', R.cx, R.cz);
    for (const sg of [-1, 1]) gableRoof(rb, st, sub(R, -R.hl, R.hl, sg > 0 ? 0 : -R.hw, sg > 0 ? R.hw : 0), gy + 15, R.hw * 0.72, { col: slate, overhang: 0.3, gable: { col } });
    for (const f of ['w', 'e']) for (const sg of [-1, 1]) facePanel(B, R, f, sg * R.hw / 2, R.hw * 0.7, gy + 15.5, gy + 15.5 + R.hw * 0.55, 6, 6, col);
    markSolid(app, c);
    out.grandSalle = { x: R.cx, z: R.cz, top: gy + 15 + R.hw * 0.72 };
  }
  // corps de logis : galeries, logis du roi, Chambre des comptes
  for (const s of polys('Palais', '#000000')) {
    if (app.claimed.has(s.id)) continue;
    app.claimed.add(s.id);
    const A = Math.abs(polyArea(s.pts));
    stoneBuilding(app, B, s.pts, { floors: A > 2000 ? 3 : 2, col, roofCol: slate, pitch: 1.5, maxRoof: 7.5, tol: 0.35 });
  }
  // tours de la façade nord (quai) et tours de l'enclos
  const gyN = Math.max(2.5, T.height(-360, -385));
  out.horloge = { x: -306, z: -367 };
  const hR = { cx: -306, cz: -367, ux: 0.94, uz: 0.34, hl: 4.6, hw: 4.6 };
  squareTower(app, B, hR, 36, { base: gyN, col, roof: 'hip', roofCol: slate, belfry: 6 });
  facePanel(B, hR, 'e', 0, 4.2, gyN + 15, gyN + 19.2, 6, 3, COL.white);          // première horloge publique de Paris (1371)
  facePanel(B, hR, 'n', 0, 4.2, gyN + 15, gyN + 19.2, 6, 3, COL.white);
  const lan = B.at('plain', hR.cx, hR.cz); cyl(lan, hR.cx, hR.cz, 1.4, gyN + 42, gyN + 46, { seg: 8, col: rgb(120, 128, 134) }); cone(lan, hR.cx, hR.cz, 1.8, gyN + 46, gyN + 52, { seg: 8, col: rgb(120, 128, 134) });
  for (const [x, z, rr, h] of [[-352, -391, 4.4, 22], [-364, -396, 4.4, 22], [-399, -408, 4.6, 20]]) roundTower(app, B, x, z, rr, h, { base: gyN, roof: 'cone', roofCol: slate, roofH: 9, col, deep: 4 });
  for (const s of circles('Palais')) {
    const [x, z] = s.pts[0];
    if (s.fill === '#E6E6E6' || s.fill === 'NONE') continue;                      // piliers de la Grand'Salle
    if (s.r > 4.5) roundTower(app, B, x, z, 5.4, 27, { roof: 'cone', roofCol: slate, roofH: 10, col });       // grosse tour (donjon)
    else roundTower(app, B, x, z, Math.max(2.2, s.r), s.r > 2.5 ? 15 : 12, { roof: 'cone', roofCol: slate, col, machi: s.r > 2.5 });
  }
  // clôtures et jardin du roi
  for (const s of layer('Palais')) if (s.kind === 'line' && s.pts.length >= 2) { let L = 0; for (let i = 1; i < s.pts.length; i++) L += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]); if (L > 14) wallLine(app, B, s.pts, L > 120 ? 4.5 : 6.5, 1.0, { crenel: true, col: COL.stoneGrey }); }
  return out;
}

// ------------------------------------------------------------ Temple, Châtelets, tours du fleuve
export function buildFortresses(app, B) {
  const T = app.terrain, out = {}, col = rgb(226, 216, 196);
  // Grosse tour du Temple
  const tt = claim(app, 'Temple', 808, -1233, (q) => q.fill === '#C92548' && q.pts.length > 20);
  if (tt) {
    const c = centroid(tt.pts), gy = Math.max(3, T.height(c[0], c[1])), R = { cx: c[0], cz: c[1], ux: 0.87, uz: 0.5, hl: 7.4, hw: 7.4 };
    const st = B.at('stone', c[0], c[1]);
    walls(st, rectCorners(R), gy - 1, gy + 36, { col, s0: 0.66 });
    fxWalls(B, rectCorners(R), gy + 36, gy + 40, 5, { col, bay: 6, s0: 1 });
    for (const y of [9, 18, 27]) for (const f of ['w', 'e', 'n', 's']) facePanel(B, R, f, 0, 9, gy + y, gy + y + 5, 4, 0, col, 2);
    skeletonRoof(B.at('roof', c[0], c[1]), { outer: rectCorners({ ...R, hl: 6.6, hw: 6.6 }), holes: [] }, gy + 40, { pitch: 1.9, col: COL.slate });
    for (const p of rectCorners(R)) roundTower(app, B, p[0], p[1], 2.6, 40, { base: gy, roof: 'cone', roofCol: COL.slate, roofH: 9, col, machi: false, seg: 12 });
    app.solid.fillRect(R.cx, R.cz, R.ux, R.uz, R.hl, R.hw, 2);
    out.temple = { x: c[0], z: c[1], top: gy + 50 };
  }
  // Grand Châtelet : forteresse-prison gardant le Grand-Pont
  const g1 = claim(app, 'Royal', -215, -523), g2 = claim(app, 'Royal', -240, -524);
  if (g1 && g2) {
    for (const s of [g1, g2]) stoneBuilding(app, B, s.pts, { floors: 4, col, roofCol: COL.slate, pitch: 1.4, gfRow: 4, ufRow: 4 });
    const c1 = centroid(g1.pts), c2 = centroid(g2.pts), mx = (c1[0] + c2[0]) / 2, mz = (c1[1] + c2[1]) / 2, gy = Math.max(3, T.height(mx, mz));
    roundTower(app, B, mx - 5, mz - 20, 3.6, 22, { base: gy, roof: 'cone', roofCol: COL.slate, col });
    roundTower(app, B, mx + 6, mz - 19, 3.6, 22, { base: gy, roof: 'cone', roofCol: COL.slate, col });
    squareTower(app, B, { cx: c1[0] + 3, cz: c1[1] + 6, ux: 1, uz: 0, hl: 4.5, hw: 4.5 }, 27, { base: gy, col, roof: 'hip', roofCol: COL.slate });
    out.grandChatelet = { x: mx, z: mz };
  }
  // Petit Châtelet (rebâti en 1369) à l'entrée du Petit-Pont
  const p1 = claim(app, 'Royal', -264, -16), p2 = claim(app, 'Royal', -250, -12);
  if (p1 && p2) {
    const c1 = centroid(p1.pts), c2 = centroid(p2.pts), mx = (c1[0] + c2[0]) / 2, mz = (c1[1] + c2[1]) / 2, d = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) || 1;
    gate(app, B, mx, mz, (c2[0] - c1[0]) / d, (c2[1] - c1[1]) / d, { width: 24, depth: 16, height: 15, pass: 4.4, passH: 5.5, col, roof: 'hip', roofCol: COL.slate, turrets: 2.1 });
    out.petitChatelet = { x: mx, z: mz };
  }
  // Saint-Germain-des-Prés : abbatiale à trois clochers (tour-porche et deux tours encadrant le chœur)
  const sg = claim(app, 'StGermain', -1205, -110, (q) => q.fill === '#F3102B' || q.fill === '#FF0000');
  if (sg) {
    const res = abbey(app, B, sg.pts, mulberry32(558), { len: 33, wid: 10.5, towerSide: 1, towerAt: -0.86, towerRoof: 'spire', roofCol: COL.slate, col: rgb(232, 222, 198) });
    if (res && res.nave) {
      const R = res.R, tw = 3.4, th = res.hN + 13;
      for (const sgn of [-1, 1]) squareTower(app, B, { cx: R.cx + R.ux * R.hl * 0.42 - R.uz * sgn * (res.nave.hw + tw), cz: R.cz + R.uz * R.hl * 0.42 + R.ux * sgn * (res.nave.hw + tw), ux: R.ux, uz: R.uz, hl: tw, hw: tw }, th, { base: res.g.yF, col: rgb(232, 222, 198), belfry: 5.5, roof: 'spire', roofCol: COL.slate, roofH: 11 });
      out.saintGermain = { x: R.cx, z: R.cz };
    }
  }
  // tour de Nesle et tour du Coin : la chaîne barre la Seine entre elles
  const nesle = polys('EnceintePA', '#000000').find((s) => { const c = centroid(s.pts); return Math.hypot(c[0] + 914, c[1] + 494) < 20; });
  if (nesle) app.claimed.add(nesle.id);
  roundTower(app, B, -913, -494, 5, 25, { roof: 'flat', col, deep: 4, seg: 18 });
  roundTower(app, B, -908.5, -489, 1.7, 30, { roof: 'cone', roofCol: COL.slate, col, machi: false, seg: 8 });
  roundTower(app, B, -893, -699, 4.6, 21, { roof: 'cone', roofCol: COL.slate, col, deep: 4 });
  out.nesle = { x: -913, z: -494 };
  // tour Barbeau et château de la Tournelle (chaîne amont)
  roundTower(app, B, 637, 31, 4.4, 20, { roof: 'cone', roofCol: COL.tileDark, col, deep: 4 });
  squareTower(app, B, { cx: 392, cz: 325, ux: 0.8, uz: 0.6, hl: 5, hw: 5 }, 16, { col, roof: 'hip', roofCol: COL.tileDark });
  roundTower(app, B, 398, 319, 2.2, 19, { roof: 'cone', roofCol: COL.tileDark, col, machi: false });
  out.tournelle = { x: 392, z: 325 };
  return out;
}

// ------------------------------------------------------------ Ponts
function bridge(app, B, a, b, o) {
  const T = app.terrain, dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
  const hw = o.width / 2, yD = Math.max(5.6, T.height(a[0] - ux * 6, a[1] - uz * 6), T.height(b[0] + ux * 6, b[1] + uz * 6)) + 0.2;
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, stone = o.kind === 'stone';
  const st = B.at(stone ? 'stone' : 'plain', mx, mz), col = stone ? rgb(224, 214, 194) : COL.wood;
  // tablier
  const R = { cx: mx, cz: mz, ux, uz, hl: L / 2 + 3, hw };
  const c = rectCorners(R);
  st.quad(c[0][0], yD, c[0][1], c[3][0], yD, c[3][1], c[2][0], yD, c[2][1], c[1][0], yD, c[1][1], 0, 0, hw * 0.5, L * 0.25, tint(col, 0.8));
  for (let t = -3; t <= L + 3; t += 1.5) for (let w = -hw + 0.5; w <= hw - 0.5; w += 1.5) app.deckSet(a[0] + ux * t + nx * w, a[1] + uz * t + nz * w, yD);
  if (stone) {
    const n = Math.max(2, Math.round(L / 13)), span = L / n, yS = 0.8, yC = yD - 1.1;
    for (const sg of [-1, 1]) {
      const ox = nx * sg * hw, oz = nz * sg * hw;
      for (let k = 0; k < n; k++) {
        const t0 = k * span + 1.4, t1 = (k + 1) * span - 1.4, N = 8;
        for (let i = 0; i < N; i++) {
          const f0 = i / N, f1 = (i + 1) / N;
          const y0 = yS + Math.sin(f0 * Math.PI) * (yC - yS), y1 = yS + Math.sin(f1 * Math.PI) * (yC - yS);
          const x0 = a[0] + ux * (t0 + (t1 - t0) * f0) + ox, z0 = a[1] + uz * (t0 + (t1 - t0) * f0) + oz, x1 = a[0] + ux * (t0 + (t1 - t0) * f1) + ox, z1 = a[1] + uz * (t0 + (t1 - t0) * f1) + oz;
          if (sg > 0) st.quad(x0, y0, z0, x1, y1, z1, x1, yD, z1, x0, yD, z0, t0 * 0.25, y0 * 0.25, t1 * 0.25, yD * 0.25, col, 0.8, 1);
          else st.quad(x1, y1, z1, x0, y0, z0, x0, yD, z0, x1, yD, z1, t0 * 0.25, y0 * 0.25, t1 * 0.25, yD * 0.25, col, 0.8, 1);
          if (sg > 0) st.quad(x0 - 2 * ox, y0, z0 - 2 * oz, x1 - 2 * ox, y1, z1 - 2 * oz, x1, y1, z1, x0, y0, z0, 0, 0, 1, 0.3, tint(col, 0.5));   // intrados
        }
      }
    }
    for (let k = 0; k <= n; k++) {          // piles à avant-becs
      const t = k * span, px = a[0] + ux * t, pz = a[1] + uz * t;
      box(st, { cx: px, cz: pz, ux: nx, uz: nz, hl: hw + 0.2, hw: 1.5 }, -3.2, yD - 0.05, { col, top: false, s0: 0.6 });
      for (const sg of [-1, 1]) cone(st, px + nx * sg * (hw + 0.2), pz + nz * sg * (hw + 0.2), 1.7, -3.2, yD - 1.5, { seg: 4, a0: Math.atan2(nz, nx) * 1 + Math.PI / 4, col });
    }
  } else {
    box(st, { cx: mx, cz: mz, ux, uz, hl: L / 2 + 3, hw }, yD - 0.5, yD - 0.02, { col: COL.woodDark, top: false });
    for (let t = 2; t < L; t += o.pileEvery ?? 6) for (const sg of [-1, 1]) box(st, { cx: a[0] + ux * t + nx * sg * (hw - 0.4), cz: a[1] + uz * t + nz * sg * (hw - 0.4), ux, uz, hl: 0.28, hw: 0.28 }, -3.2, yD + (o.rail === false ? 0 : 1.0), { col: COL.woodDark, top: false });
    if (o.rail !== false) for (const sg of [-1, 1]) box(st, { cx: mx + nx * sg * (hw - 0.4), cz: mz + nz * sg * (hw - 0.4), ux, uz, hl: L / 2, hw: 0.08 }, yD + 0.85, yD + 1.0, { col: COL.woodDark });
  }
  // maisons sur le pont : façades sur la chaussée, arrières en surplomb
  if (o.houses) {
    const r = o.rng, dHouse = o.houseDepth ?? 5.2, road = o.road ?? 3.2;
    for (const sg of [-1, 1]) {
      let t = 2.5;
      while (t + 3.5 < L - 2) {
        const w = 3.8 + r() * 1.8;
        // origine : coin avant-gauche sur le bord de chaussée ; n pointe vers l'eau
        const rx = sg > 0 ? ux : -ux, rz = sg > 0 ? uz : -uz;
        const ox = a[0] + ux * (sg > 0 ? t : t + w) + nx * sg * road, oz = a[1] + uz * (sg > 0 ? t : t + w) + nz * sg * road;
        placeHouse(app, B, r, { ox, oz, rx, rz, nx: nx * sg, nz: nz * sg, w, d: dHouse, floors: 2 + (r() < 0.6 ? 1 : 0), gableFront: r() < 0.5, style: r() < 0.5 ? 2 : 3, gfRow: 0, jetty: 0.25, pitch: 1.25 + r() * 0.3, plaster: PLASTERS[(r() * PLASTERS.length) | 0], roofCol: TILES[(r() * TILES.length) | 0], y: yD, yBase: yD - 1.4 });
        app.solid.fillRect(ox + rx * w / 2 + nx * sg * dHouse / 2, oz + rz * w / 2 + nz * sg * dHouse / 2, rx, rz, w / 2, dHouse / 2, 1);
        t += w;
      }
    }
  }
  // moulins pendus sous le tablier (pont aux Meuniers)
  if (o.mills) {
    const hb = B.at('houses', mx, mz), uv = cellUV(7, 1);
    for (let t = 8; t < L - 6; t += 9) {
      const R2 = { cx: a[0] + ux * t + nx * (hw + 2.2), cz: a[1] + uz * t + nz * (hw + 2.2), ux, uz, hl: 2.6, hw: 2.2 }, cc = rectCorners(R2);
      for (let i = 0; i < 4; i++) { const p = cc[i], q = cc[(i + 1) % 4]; hb.quad(q[0], yD - 2.6, q[1], p[0], yD - 2.6, p[1], p[0], yD + 2.6, p[1], q[0], yD + 2.6, q[1], uv[0], uv[2], uv[1], uv[3], COL.white, 0.7, 1); }
      gableRoof(B.at('roof', mx, mz), null, R2, yD + 2.6, 2.2, { col: COL.tileOld });
      // roue à aubes
      const pl = B.at('plain', mx, mz), wx = R2.cx + nx * 2.9, wz = R2.cz + nz * 2.9;
      for (let k = 0; k < 4; k++) { const an = (k / 4) * Math.PI, cy = Math.cos(an) * 2.3, cs = Math.sin(an) * 2.3; pl.quad(wx - ux * cs, 0.6 - cy, wz - uz * cs, wx + ux * cs, 0.6 + cy, wz + uz * cs, wx + ux * cs + nx * 1.2, 0.6 + cy, wz + uz * cs + nz * 1.2, wx - ux * cs + nx * 1.2, 0.6 - cy, wz - uz * cs + nz * 1.2, 0, 0, 1, 1, COL.woodDark); pl.quad(wx + ux * cs, 0.6 + cy, wz + uz * cs, wx - ux * cs, 0.6 - cy, wz - uz * cs, wx - ux * cs + nx * 1.2, 0.6 - cy, wz - uz * cs + nz * 1.2, wx + ux * cs + nx * 1.2, 0.6 + cy, wz + uz * cs + nz * 1.2, 0, 0, 1, 1, COL.woodDark); }
    }
  }
  return { x: mx, z: mz, y: yD };
}

export function buildBridges(app, B) {
  const r = mulberry32(1413), out = {};
  for (const s of polys('Ponts')) app.claimed.add(s.id);
  out.changeurs = bridge(app, B, [-217, -477], [-300, -370], { width: 17, kind: 'stone', houses: true, rng: r });
  out.meuniers = bridge(app, B, [-248, -481], [-318, -376], { width: 5, kind: 'wood', mills: true, pileEvery: 4.5 });
  out.mibray = bridge(app, B, [-108, -420], [-149, -310], { width: 4.5, kind: 'wood' });
  out.petitPont = bridge(app, B, [-241, -62], [-268, 12], { width: 14, kind: 'stone', houses: true, rng: r, houseDepth: 4.4, road: 2.6 });
  out.saintMichel = bridge(app, B, [-409, -162], [-428, -94], { width: 15, kind: 'stone', houses: true, rng: r, houseDepth: 4.6, road: 2.9 });
  out.tournelle = bridge(app, B, [345, 200], [401, 293], { width: 5.5, kind: 'wood' });
  // passerelles sur les canaux et fossés
  for (const s of polys('Ponts')) { const A = Math.abs(polyArea(s.pts)); if (A < 120) { const R = minAreaRect(s.pts); bridge(app, B, P(R, -R.hl - 2, 0), P(R, R.hl + 2, 0), { width: Math.max(3, R.hw * 2), kind: 'wood', rail: false }); } }
  return out;
}

// ------------------------------------------------------------ Hors les murs
export function buildOutskirts(app, B) {
  const T = app.terrain, out = {};
  // gibet de Montfaucon : seize piliers de pierre sur un soubassement
  const gx = 1250, gz = -2690, gy = T.height(gx, gz), st = B.at('stone', gx, gz), pl = B.at('plain', gx, gz), col = rgb(214, 206, 188);
  box(st, { cx: gx, cz: gz, ux: 1, uz: 0, hl: 7.2, hw: 6.2 }, gy - 1, gy + 4.5, { col });
  const pil = [];
  for (let i = 0; i < 6; i++) pil.push([gx - 6.5 + i * 2.6, gz - 5.5]);
  for (let i = 1; i < 6; i++) { pil.push([gx - 6.5, gz - 5.5 + i * 2.2]); pil.push([gx + 6.5, gz - 5.5 + i * 2.2]); }
  for (const p of pil) box(st, { cx: p[0], cz: p[1], ux: 1, uz: 0, hl: 0.5, hw: 0.5 }, gy + 4.5, gy + 15, { col });
  for (const y of [8, 11.5, 14.6]) { box(pl, { cx: gx, cz: gz - 5.5, ux: 1, uz: 0, hl: 6.8, hw: 0.14 }, gy + y, gy + y + 0.3, { col: COL.woodDark }); for (const sx of [-6.5, 6.5]) box(pl, { cx: gx + sx, cz: gz, ux: 0, uz: 1, hl: 5.6, hw: 0.14 }, gy + y, gy + y + 0.3, { col: COL.woodDark }); }
  out.montfaucon = { x: gx, z: gz, top: gy + 15 };
  // moulins à vent sur pivot
  const mills = [[-760, -1560], [-830, -1600], [-600, -3700], [-420, -3760], [-500, -3690], [1500, -420], [1560, -330], [-1050, 980], [-980, 1060], [300, 2400], [2500, -2300], [2620, -2380]];
  out.mills = [];
  for (const [x, z] of mills) {
    const y = T.height(x, z), b = B.at('houses', x, z), uv = cellUV(7, 0), p2 = B.at('plain', x, z);
    for (const s of [-1, 1]) { box(p2, { cx: x + s * 1.2, cz: z, ux: 1, uz: 0, hl: 0.14, hw: 0.14 }, y - 0.3, y + 3.2, { col: COL.woodDark, top: false }); box(p2, { cx: x, cz: z + s * 1.2, ux: 1, uz: 0, hl: 0.14, hw: 0.14 }, y - 0.3, y + 3.2, { col: COL.woodDark, top: false }); }
    const R = { cx: x, cz: z, ux: 0.8, uz: 0.6, hl: 2.4, hw: 1.9 }, c = rectCorners(R);
    for (let i = 0; i < 4; i++) { const a = c[i], q = c[(i + 1) % 4]; b.quad(q[0], y + 3, q[1], a[0], y + 3, a[1], a[0], y + 7.6, a[1], q[0], y + 7.6, q[1], uv[0], uv[2], uv[1], uv[3], COL.white, 0.8, 1); }
    const pg = cellUV(7, 3);
    gableRoof(B.at('roof', x, z), b, R, y + 7.6, 2.1, { col: COL.woodDark, gable: { col: COL.white, u0: pg[0], u1: pg[1], v0: pg[2], v1: pg[3] } });
    out.mills.push({ x: x + R.ux * 2.7, y: y + 6.6, z: z + R.uz * 2.7, ux: R.ux, uz: R.uz });
  }
  return out;
}
