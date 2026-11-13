// Enceintes de Philippe Auguste et de Charles V, portes, Bastille, Louvre.
import * as THREE from 'three';
import { layer, polys, circles } from './data.js';
import { polyArea, centroid, minAreaRect, dpRing, polylineLength, mulberry32, distSeg, offsetEx } from './geom.js';
import { rgb, tint, walls, cap, box, cyl, cone, disc, crenels, rectCorners, skeletonRoof, gableRoof, ccw } from './builder.js';
import { COL, roundTower, squareTower, fxWalls, fxPanel, wallLine, markSolid, flagAt } from './special.js';
import { cellUV } from './textures.js';

const WALL = rgb(226, 216, 196), WALL_OLD = rgb(212, 204, 186);

// Courtine sur son emprise : massif, chemin de ronde, parapet crénelé.
function curtain(app, B, pts, h, col) {
  const T = app.terrain, ring = ccw(dpRing(pts, 0.25)), c = centroid(ring), st = B.at('stone', c[0], c[1]);
  let lo = Infinity; for (const p of ring) lo = Math.min(lo, T.height(p[0], p[1]));
  const base = (x, z) => Math.max(0.2, T.height(x, z)) - 1.2;
  const top = (x, z) => Math.max(0.6, T.height(x, z)) + h;
  // la muraille suit le terrain : pans par arête, sommet à hauteur constante au-dessus du sol
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i], q = ring[(i + 1) % n], L = Math.hypot(q[0] - a[0], q[1] - a[1]); if (L < 0.05) continue;
    st.quad(q[0], base(q[0], q[1]), q[1], a[0], base(a[0], a[1]), a[1], a[0], top(a[0], a[1]), a[1], q[0], top(q[0], q[1]), q[1], L * 0.25, 0, 0, (h + 1.2) * 0.25, col, 0.72, 1);
  }
  // chemin de ronde : triangulation de l'emprise, chaque sommet à sa propre altitude
  const tris = THREE.ShapeUtils.triangulateShape(ring.map((p) => new THREE.Vector2(p[0], p[1])), []);
  const wc = tint(col, 0.7);
  for (const t of tris) {
    let a = ring[t[0]], q = ring[t[1]], d = ring[t[2]];
    if (!a || !q || !d) continue;
    if ((q[0] - a[0]) * (d[1] - a[1]) - (q[1] - a[1]) * (d[0] - a[0]) > 0) { const k = q; q = d; d = k; }
    st.tri(a[0], top(a[0], a[1]) - 0.02, a[1], q[0], top(q[0], q[1]) - 0.02, q[1], d[0], top(d[0], d[1]) - 0.02, d[1], a[0] * 0.25, a[1] * 0.25, q[0] * 0.25, q[1] * 0.25, d[0] * 0.25, d[1] * 0.25, wc);
  }
  crenels(st, ring, top, { closed: true, col, w: 1.2, gap: 0.9, h: 1.0, th: 0.5 });
  markSolid(app, ring);
  // guetteurs sur le chemin de ronde
  let acc = 60;
  for (const ex of offsetEx([ring], -1.25)) for (let i = 0; i < ex.outer.length; i++) {
    const a = ex.outer[i], q = ex.outer[(i + 1) % ex.outer.length];
    acc += Math.hypot(q[0] - a[0], q[1] - a[1]);
    if (acc > 170) { acc = 0; app.figurants.push([a[0], a[1], Math.atan2(q[1] - a[1], -(q[0] - a[0])), 'man', [84, 88, 104], top(a[0], a[1])]); }
  }
}

// Porte : deux piles et un étage de garde, passage ouvert dans l'axe de la rue.
export function gate(app, B, x, z, ux, uz, o = {}) {
  const T = app.terrain, gy = Math.max(0.3, T.height(x, z));
  const W = o.width ?? 12, D = o.depth ?? 8, H = o.height ?? 13, pass = o.pass ?? 4.2, ph = o.passH ?? 5.2, col = o.col ?? WALL;
  const pw = (W - pass) / 2;
  const st = B.at('stone', x, z);
  for (const s of [-1, 1]) {
    const R = { cx: x + ux * s * (pass / 2 + pw / 2), cz: z + uz * s * (pass / 2 + pw / 2), ux, uz, hl: pw / 2, hw: D / 2 };
    box(st, R, gy - 1, gy + ph, { col, top: false });
    app.solid.fillRect(R.cx, R.cz, ux, uz, R.hl, R.hw, 2);
  }
  const R = { cx: x, cz: z, ux, uz, hl: W / 2, hw: D / 2 }, c = rectCorners(R);
  // étage au-dessus du passage
  fxWalls(B, c, gy + ph, gy + H, 4, { col, bay: 4, s0: 1 });
  const sb = B.at('stone', x, z);
  sb.quad(c[0][0], gy + ph, c[0][1], c[1][0], gy + ph, c[1][1], c[2][0], gy + ph, c[2][1], c[3][0], gy + ph, c[3][1], 0, 0, 1, 1, tint(col, 0.45));   // voûte du passage
  // arcs du passage sur les deux faces
  for (const s of [-1, 1]) {
    const fxc = x - uz * s * (D / 2 + 0.05), fzc = z + ux * s * (D / 2 + 0.05);
    const a = [fxc - ux * s * pass * 0.75, fzc - uz * s * pass * 0.75], b2 = [fxc + ux * s * pass * 0.75, fzc + uz * s * pass * 0.75];
    const uv = cellUV(6, 4), fx = B.at('stonefx', x, z);
    // seul le haut de l'arc est plaqué (au-dessus de l'ouverture réelle)
    fx.quad(b2[0], gy + ph - 0.2, b2[1], a[0], gy + ph - 0.2, a[1], a[0], gy + ph + 1.6, a[1], b2[0], gy + ph + 1.6, b2[1], uv[1], uv[3] - (uv[3] - uv[2]) * 0.2, uv[0], uv[3], col);
  }
  if (o.roof === 'hip') skeletonRoof(B.at('roof', x, z), { outer: c, holes: [] }, gy + H, { pitch: 1.5, col: o.roofCol ?? COL.slate, overhang: 0.5 });
  else { cap(st, c, [], gy + H, { col: tint(col, 0.7) }); crenels(st, c, gy + H, { closed: true, col }); }
  if (o.turrets) for (const p of c) roundTower(app, B, p[0], p[1], o.turrets, H + 2.5, { roof: 'cone', roofCol: o.roofCol ?? COL.slate, col, machi: false, seg: 10, base: gy });
  // sergents de garde de part et d'autre du passage, bannière sur les portes principales
  for (const s of [-1, 1]) for (const t of [-1, 1]) app.figurants.push([x + ux * t * (pass / 2 + 0.8) - uz * s * (D / 2 + 1.5), z + uz * t * (pass / 2 + 0.8) + ux * s * (D / 2 + 1.5), Math.atan2(-uz * s, ux * s), 'man', [84, 88, 104], null]);
  const flag = o.flag ?? (o.turrets ? 0 : null);
  if (flag != null) flagAt(app, B, x, z, gy + H + (o.roof === 'hip' ? D * 0.72 : 0.2), 5.5, flag);
  return gy + H;
}

export function buildWalls(app, B) {
  const r = mulberry32(1190);
  // ---------------- Philippe Auguste (1190-1215)
  const pa = polys('EnceintePA', '#000000');
  const curtains = [];
  for (const s of pa) {
    const A = Math.abs(polyArea(s.pts)), L = polylineLength(s.pts, true);
    const c = centroid(s.pts);
    if (app.terrain.sdWater(c[0], c[1]) > 2) { app.chainBoats.push(c); continue; }    // pontons de la chaîne barrant le fleuve
    if (A < 60 && L < 45) { squareTower(app, B, minAreaRect(s.pts), 13, { col: WALL_OLD }); continue; }
    if (app.claimed.has(s.id)) continue;
    curtain(app, B, s.pts, 8, WALL_OLD);
    curtains.push(s.pts);
  }
  for (const s of circles('EnceintePA')) {
    if (s.r < 2) continue;
    const [x, z] = s.pts[0];
    roundTower(app, B, x, z, s.r * 1.02, 13.5 + r() * 1.5, { roof: r() < 0.7 ? 'cone' : 'flat', roofCol: r() < 0.5 ? COL.tileDark : COL.slate, col: WALL_OLD, machi: false, roofH: 5.5 });
  }
  // portes : aux interruptions entre deux courtines voisines
  const seen = [];
  for (let i = 0; i < curtains.length; i++) for (let j = i + 1; j < curtains.length; j++) {
    let best = 1e9, pa_ = null, pb = null;
    for (const a of curtains[i]) for (const b2 of curtains[j]) { const d = Math.hypot(a[0] - b2[0], a[1] - b2[1]); if (d < best) { best = d; pa_ = a; pb = b2; } }
    if (best > 2.5 && best < 26) {
      const mx = (pa_[0] + pb[0]) / 2, mz = (pa_[1] + pb[1]) / 2;
      if (seen.some((q) => Math.hypot(q[0] - mx, q[1] - mz) < 30)) continue;
      seen.push([mx, mz]);
      const ux = (pb[0] - pa_[0]) / best, uz = (pb[1] - pa_[1]) / best;
      gate(app, B, mx, mz, ux, uz, { width: Math.max(best + 3, 10), depth: 7, height: 12, col: WALL_OLD, roof: r() < 0.5 ? 'hip' : 'flat', roofCol: COL.tileDark });
      app.gates.push({ x: mx, z: mz, kind: 'PA' });
    }
  }
  // ---------------- Charles V (1356-1383)
  const bastille = [1285, -22];
  const nearB = (p) => Math.hypot(p[0] - bastille[0], p[1] - bastille[1]) < 75;
  for (const s of polys('EnceinteC5', '#000000')) {
    const c = centroid(s.pts);
    if (nearB(c) || app.claimed.has(s.id)) continue;
    curtain(app, B, s.pts, 7.5, WALL);
  }
  for (const s of circles('EnceinteC5')) {
    const [x, z] = s.pts[0];
    if (nearB([x, z])) continue;
    // tours carrées (« bastides ») à toit en pavillon
    let ux = 1, uz = 0, bd = 1e9;
    for (const q of polys('EnceinteC5', '#000000')) for (let i = 0; i < q.pts.length; i++) { const a = q.pts[i], c = q.pts[(i + 1) % q.pts.length], d = distSeg(x, z, a[0], a[1], c[0], c[1]), L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (d < bd && L > 3) { bd = d; ux = (c[0] - a[0]) / L; uz = (c[1] - a[1]) / L; } }
    squareTower(app, B, { cx: x, cz: z, ux, uz, hl: 4.2, hw: 3.6 }, 12.5, { col: WALL, roof: 'hip', roofCol: COL.tileDark });
  }
  // portes fortifiées : couples de lignes épaisses franchissant le fossé
  const gl = layer('EnceinteC5').filter((s) => s.kind === 'line' && s.width > 4 && !nearB(s.pts[0]));
  const done = new Set();
  for (let i = 0; i < gl.length; i++) {
    if (done.has(i)) continue;
    let mate = -1, bd = 40;
    const ci = centroid(gl[i].pts);
    for (let j = i + 1; j < gl.length; j++) { if (done.has(j)) continue; const cj = centroid(gl[j].pts), d = Math.hypot(ci[0] - cj[0], ci[1] - cj[1]); if (d < bd) { bd = d; mate = j; } }
    if (mate < 0) continue;
    done.add(i); done.add(mate);
    const a = gl[i].pts, b2 = gl[mate].pts;
    // extrémité côté ville = la plus proche du centre
    const inner = (p) => (Math.hypot(p[0][0], p[0][1] + 300) < Math.hypot(p[p.length - 1][0], p[p.length - 1][1] + 300) ? [p[0], p[p.length - 1]] : [p[p.length - 1], p[0]]);
    const [ai, ao] = inner(a), [bi, bo] = inner(b2);
    const gx = (ai[0] + bi[0]) / 2, gz = (ai[1] + bi[1]) / 2, ox = (ao[0] + bo[0]) / 2, oz = (ao[1] + bo[1]) / 2;
    const L = Math.hypot(ox - gx, oz - gz) || 1, dx = (ox - gx) / L, dz = (oz - gz) / L;
    gate(app, B, gx + dx * 4, gz + dz * 4, -dz, dx, { width: 17, depth: 11, height: 17, pass: 4.6, passH: 6, col: WALL, roof: 'hip', turrets: 1.7 });
    // pont dormant et ses garde-corps au-dessus du fossé
    const pb = B.at('plain', gx, gz), yb = Math.max(0.5, app.terrain.height(gx, gz));
    box(pb, { cx: (gx + ox) / 2 + dx * 6, cz: (gz + oz) / 2 + dz * 6, ux: dx, uz: dz, hl: L / 2, hw: 3 }, yb - 1.2, yb + 0.05, { col: COL.wood });
    for (let t = 14; t < L; t += 9) for (const s of [-1, 1]) box(pb, { cx: gx + dx * t - dz * s * 2.4, cz: gz + dz * t + dx * s * 2.4, ux: dx, uz: dz, hl: 0.3, hw: 0.3 }, -2, yb, { col: COL.woodDark, top: false });
    wallLine(app, B, [[gx + dx * 12 - dz * 3.2, gz + dz * 12 + dx * 3.2], [ox - dz * 3.2, oz + dx * 3.2]], 1.2, 0.3, { col: COL.wood });
    wallLine(app, B, [[gx + dx * 12 + dz * 3.2, gz + dz * 12 - dx * 3.2], [ox + dz * 3.2, oz - dx * 3.2]], 1.2, 0.3, { col: COL.wood });
    // avant-porte
    gate(app, B, ox, oz, -dz, dx, { width: 11, depth: 6, height: 9.5, pass: 4.2, passH: 5, col: WALL });
    app.gates.push({ x: gx, z: gz, kind: 'C5' });
    for (let t = 0; t <= L + 8; t += 2) for (let w = -2; w <= 2; w += 2) app.deckSet(gx + dx * t - dz * w, gz + dz * t + dx * w, yb + 0.05);
  }
  // porte Saint-Honoré (enceinte de Charles V) : tracée d'un simple trait sur le plan
  gate(app, B, -1121, -1157, 0.5, -0.866, { width: 17, depth: 11, height: 17, pass: 4.6, passH: 6, col: WALL, roof: 'hip', turrets: 1.7 });
  app.gates.push({ x: -1121, z: -1157, kind: 'C5' });
}

// ---------------- La Bastille Saint-Antoine (1370-1383)
export function buildBastille(app, B) {
  const body = polys('EnceinteC5', '#000000').filter((s) => { const c = centroid(s.pts); return Math.hypot(c[0] - 1285, c[1] + 22) < 75; }).sort((a, b) => Math.abs(polyArea(b.pts)) - Math.abs(polyArea(a.pts)))[0];
  if (!body) return null;
  const ring = ccw(dpRing(body.pts, 0.3)), c = centroid(ring), T = app.terrain, gy = Math.max(1.5, T.height(c[0], c[1]));
  const H = 24, col = rgb(222, 212, 192);
  const st = B.at('stone', c[0], c[1]);
  walls(st, ring, -3, gy + H - 3, { col, s0: 0.62 });
  const fx = B.at('stonefx', c[0], c[1]), uv4 = cellUV(4, 0), uv5 = cellUV(5, 0);
  // bandeau d'archères à mi-hauteur et mâchicoulis au sommet
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], q = ring[(i + 1) % ring.length], L = Math.hypot(q[0] - a[0], q[1] - a[1]); if (L < 3) continue;
    const n = Math.max(1, Math.round(L / 5)), ox = (q[1] - a[1]) / L * 0.06, oz = -(q[0] - a[0]) / L * 0.06;
    fx.quad(q[0] + ox, gy + 9, q[1] + oz, a[0] + ox, gy + 9, a[1] + oz, a[0] + ox, gy + 15, a[1] + oz, q[0] + ox, gy + 15, q[1] + oz, n / 8, uv4[2], 0, uv4[3], col);
  }
  const outer = ring.map((p) => { const dx = p[0] - c[0], dz = p[1] - c[1], l = Math.hypot(dx, dz); return [p[0] + dx / l * 0.5, p[1] + dz / l * 0.5]; });
  for (let i = 0; i < outer.length; i++) { const a = outer[i], q = outer[(i + 1) % outer.length], L = Math.hypot(q[0] - a[0], q[1] - a[1]); if (L < 0.3) continue; fx.quad(q[0], gy + H - 3, q[1], a[0], gy + H - 3, a[1], a[0], gy + H, a[1], q[0], gy + H, q[1], Math.max(1, Math.round(L / 6)) / 8, uv5[2], 0, uv5[3], col); }
  cap(st, outer, [], gy + H - 0.9, { col: tint(col, 0.66) });
  crenels(st, outer, gy + H, { closed: true, col, w: 1.3, gap: 1.0, h: 1.1 });
  markSolid(app, ring);
  const towers = circles('EnceinteC5').filter((s) => Math.hypot(s.pts[0][0] - 1285, s.pts[0][1] + 22) < 75 && s.r > 4);
  for (const s of towers) {
    const [x, z] = s.pts[0], rr = s.r * 0.98;
    cyl(st, x, z, rr, -3, gy + H - 3, { seg: 18, col, s0: 0.62 });
    cyl(fx, x, z, rr + 0.5, gy + H - 3, gy + H, { seg: 18, col, vBot: uv5[2], vTop: uv5[3], us: 1 / 14, s0: 1 });
    cyl(fx, x, z, rr + 0.05, gy + 9, gy + 15, { seg: 18, col, vBot: uv4[2], vTop: uv4[3], us: 1 / 30, s0: 1 });
    disc(st, x, z, rr + 0.5, gy + H - 0.9, { col: tint(col, 0.66), seg: 18 });
    const cr = []; for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; cr.push([x + Math.cos(a) * (rr + 0.3), z + Math.sin(a) * (rr + 0.3)]); }
    crenels(st, cr, gy + H, { closed: true, col, w: 1.2, gap: 0.8, h: 1.1 });
    if (towers.indexOf(s) % 3 === 0) flagAt(app, B, x, z, gy + H - 0.9, 7, towers.indexOf(s) % 2);
    app.solid.fillCircle(x, z, rr, 2);
  }
  // guérite du guet sur la terrasse
  squareTower(app, B, { cx: c[0], cz: c[1], ux: 1, uz: 0, hl: 2.2, hw: 2.2 }, 5.5, { base: gy + H - 1, col, roof: 'spire', roofCol: COL.slate, roofH: 5 });
  // porte Saint-Antoine, accolée au flanc nord de la forteresse
  gate(app, B, 1248, -62, 0.34, 0.94, { width: 16, depth: 10, height: 16, pass: 4.6, passH: 6, col: WALL, roof: 'hip', turrets: 1.6 });
  app.gates.push({ x: 1248, z: -62, kind: 'C5' });
  return { c, top: gy + H };
}

// ---------------- Le Louvre de Charles V
export function buildLouvre(app, B) {
  const L = layer('Louvre');
  const body = L.find((s) => s.kind === 'poly' && s.fill === '#000000' && Math.abs(polyArea(s.pts)) > 2000);
  const court = L.find((s) => s.kind === 'poly' && s.fill === '#FFFFFF' && Math.abs(polyArea(s.pts)) > 1000);
  if (!body || !court) return null;
  const ring = ccw(dpRing(body.pts, 0.3)), hole = ccw(dpRing(court.pts, 0.3)), c = centroid(ring), T = app.terrain;
  const gy = Math.max(2.5, T.height(c[0], c[1])), H = 17, col = rgb(240, 232, 212), roofCol = rgb(78, 92, 116);
  const st = B.at('stone', c[0], c[1]);
  walls(st, ring, -3, gy + 6, { col, s0: 0.6 });
  fxWalls(B, ring, gy + 6, gy + 10, 4, { col, bay: 5, s0: 1 });
  fxWalls(B, ring, gy + 10, gy + 13.6, 2, { col, bay: 4.6, s0: 1 });
  fxWalls(B, ring, gy + 13.6, gy + H, 2, { col, bay: 4.6, s0: 1, cell0: 3 });
  // façades sur cour
  const inner = hole.slice().reverse();
  fxWalls(B, inner, gy, gy + 5.5, 3, { col, bay: 5 });
  fxWalls(B, inner, gy + 5.5, gy + 9.5, 2, { col, s0: 1 });
  fxWalls(B, inner, gy + 9.5, gy + 13.5, 2, { col, s0: 1, cell0: 2 });
  fxWalls(B, inner, gy + 13.5, gy + H, 2, { col, s0: 1, cell0: 5 });
  const rb = B.at('roof', c[0], c[1]);
  skeletonRoof(rb, { outer: ring, holes: [hole] }, gy + H, { pitch: 1.55, col: roofCol, overhang: 0.4, maxH: 9 });
  markSolid(app, ring);
  // tours : flanquement, portes, grosse tour (donjon de Philippe Auguste)
  let donjon = null;
  for (const s of L) {
    if (s.kind !== 'circle') continue;
    const [x, z] = s.pts[0];
    if (s.r > 12) continue;                                   // fossé de la grosse tour
    if (s.r > 6.2) {
      roundTower(app, B, x, z, 7.6, 31, { base: gy, roof: 'cone', roofCol, roofH: 13, col, seg: 20, deep: 4 });
      donjon = [x, z];
      flagAt(app, B, x, z, gy + 44.6, 6.5, 0, 1.5);
    } else {
      const h = s.r > 5 ? 23 : 21;
      roundTower(app, B, x, z, s.r * 0.95, h, { base: gy, roof: 'cone', roofCol, roofH: s.r > 5 ? 10.5 : 8, col, seg: 16, deep: 5 });
      if (s.r > 5) flagAt(app, B, x, z, gy + h + 11.2, 4.6, 0); else { const pl = B.at('plain', x, z); cyl(pl, x, z, 0.1, gy + h + 9, gy + h + 11, { seg: 4, col: COL.gold }); }
    }
  }
  // lucarnes et hautes souches de cheminées, comme sur la miniature d'octobre des Très Riches Heures
  const R = minAreaRect(ring), r = mulberry32(7);
  for (let i = 0; i < 16; i++) {
    const t = i / 16, k = (t * 4) | 0, f = t * 4 - k, e = [ring[k % ring.length], ring[(k + 1) % ring.length]];
    if (!e[1]) continue;
    const x = e[0][0] + (e[1][0] - e[0][0]) * (0.15 + 0.7 * f), z = e[0][1] + (e[1][1] - e[0][1]) * (0.15 + 0.7 * f);
    const dx = c[0] - x, dz = c[1] - z, l = Math.hypot(dx, dz);
    box(st, { cx: x + dx / l * 3.6, cz: z + dz / l * 3.6, ux: 1, uz: 0, hl: 0.55, hw: 0.55 }, gy + H, gy + H + 7.5 + r() * 2, { col: tint(col, 0.95) });
  }
  return { c, donjon, top: gy + 31, R };
}
