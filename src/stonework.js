// Bâtisseurs de pierre génériques : murs à travées gothiques, panneaux d'atlas, tours, clôtures, contreforts, églises.
// Sans dépendance aux données d'une ville : servent à la maquette de 1380 comme à la page de 1789. L'application doit
// fournir app.terrain.height, app.solid (fillPoly, fillCircle, fillRect, strokeLine) et, au besoin, app.flags et app.figurants.
import { polyArea, centroid, minAreaRect, cleanPoly, dpRing, clamp } from './geom.js';
import { rgb, tint, walls, cap, skeletonRoof, gableRoof, box, cyl, cone, disc, crenels, rectCorners, ccw } from './builder.js';
import { cellUV } from './textures.js';

export const COL = {
  stone: rgb(236, 226, 204), stoneWarm: rgb(240, 222, 190), stoneGrey: rgb(214, 208, 196), stoneDark: rgb(190, 180, 164),
  slate: rgb(86, 98, 116), slateDark: rgb(70, 80, 98), lead: rgb(150, 156, 160), tile: rgb(176, 108, 78), tileDark: rgb(150, 92, 70), tileOld: rgb(164, 116, 92),
  wood: rgb(120, 94, 66), woodDark: rgb(84, 62, 44), plaster: rgb(246, 238, 222), thatch: rgb(150, 134, 96), gold: rgb(214, 170, 70), white: rgb(255, 255, 255),
};

// Murs à travées texturées (rangée d'atlas `row`) ; les pans trop courts restent en pierre nue.
export function fxWalls(B, ring, y0, y1, row, o = {}) {
  const r = ccw(ring), n = r.length, bay = o.bay ?? 4.6, col = o.col ?? COL.stone, s0 = o.s0 ?? 0.76, s1 = o.s1 ?? 1;
  const f = typeof y0 === 'function';
  const c0 = centroid(r), fx = B.at('stonefx', c0[0], c0[1]), st = B.at('stone', c0[0], c0[1]);
  const uvr = cellUV(row, 0);
  let k = o.cell0 ?? 0;
  for (let i = 0; i < n; i++) {
    const a = r[i], c = r[(i + 1) % n];
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (L < 0.08) continue;
    const ya = f ? y0(a[0], a[1]) : y0, yc = f ? y0(c[0], c[1]) : y0;
    if (L < (o.minBay ?? 2.6) || (o.skip && o.skip(i))) { st.quad(c[0], yc, c[1], a[0], ya, a[1], a[0], y1, a[1], c[0], y1, c[1], L * 0.25, ya * 0.25, 0, y1 * 0.25, col, s0, s1); continue; }
    const cells = Math.max(1, Math.round(L / bay));
    fx.quad(c[0], yc, c[1], a[0], ya, a[1], a[0], y1, a[1], c[0], y1, c[1], (k + cells) / 8, uvr[2], k / 8, uvr[3], col, s0, s1);
    k = (k + cells) % 8;
  }
}

// Un panneau isolé d'une cellule d'atlas (rose, portail, horloge…) plaqué sur un mur.
export function fxPanel(B, ax, az, bx, bz, y0, y1, row, cell, col = COL.stone, n = 1) {
  const uv = cellUV(row, cell, n), b = B.at('stonefx', ax, az);
  b.quad(bx, y0, bz, ax, y0, az, ax, y1, az, bx, y1, bz, uv[1], uv[2], uv[0], uv[3], col);
}

export function groundInfo(app, ring) {
  const T = app.terrain, c = centroid(ring);
  let lo = Infinity, hi = -Infinity;
  for (const p of ring) { const h = T.height(p[0], p[1]); if (h < lo) lo = h; if (h > hi) hi = h; }
  return { c, y0: Math.max(lo, 0.2) - 0.5, yF: Math.max(0.6, (lo + hi) / 2) };
}

export function markSolid(app, ring) { app.solid.fillPoly(ring, 2); }

// Bâtiment de pierre sur un polygone : niveaux à croisées, toit en bâtière si l'emprise est rectangulaire, à croupes sinon.
export function stoneBuilding(app, B, pts, o = {}) {
  let top = 0;
  for (const ex of cleanPoly(pts)) {
    const ring = dpRing(ex.outer, o.tol ?? 0.5);
    if (ring.length < 3 || Math.abs(polyArea(ring)) < 12) continue;
    const g = groundInfo(app, ring), floors = o.floors ?? 2, gf = o.gf ?? 4, uf = o.uf ?? 3.6;
    const col = o.col ?? COL.stone;
    fxWalls(B, ring, g.y0, g.yF + gf, o.gfRow ?? 3, { col, bay: o.bay });
    let y = g.yF + gf;
    for (let f = 1; f < floors; f++) { fxWalls(B, ring, y, y + uf, o.ufRow ?? 2, { col, bay: o.bay, s0: 1, cell0: f * 3 }); y += uf; }
    const rb = B.at('roof', g.c[0], g.c[1]);
    const R = minAreaRect(ring), rectness = Math.abs(polyArea(ring)) / (4 * R.hl * R.hw);
    const roofCol = o.roofCol ?? COL.tile;
    if (o.flat) { cap(B.at('stone', g.c[0], g.c[1]), ring, [], y, { col: tint(col, 0.8) }); top = y; }
    else if (rectness > 0.86 && R.hw < 11 && !o.hip) top = gableRoof(rb, B.at('stone', g.c[0], g.c[1]), R, y, R.hw * (o.pitch ?? 1.25), { col: roofCol, overhang: 0.35, gable: { col } });
    else top = skeletonRoof(rb, { outer: ring, holes: [] }, y, { pitch: o.pitch ?? 1.15, col: roofCol, overhang: 0.3, maxH: o.maxRoof ?? 9 });
    markSolid(app, ring);
  }
  return top;
}

// Croix (faîtes, flèches, cimetières).
export function cross(b, x, y, z, ux, uz, s = 1, col = rgb(60, 58, 58)) {
  box(b, { cx: x, cz: z, ux, uz, hl: 0.05 * s, hw: 0.05 * s }, y, y + 1.3 * s, { col, top: false });
  box(b, { cx: x, cz: z, ux, uz, hl: 0.36 * s, hw: 0.05 * s }, y + 0.8 * s, y + 0.92 * s, { col });
}

// Mât et bannière (la toile, animée, est créée à part à partir de app.flags).
export function flagAt(app, B, x, z, y0, h, kind = 0, size = 1) {
  cyl(B.at('plain', x, z), x, z, 0.07, y0, y0 + h, { seg: 4, col: rgb(90, 76, 60) });
  app.flags.push([x, y0 + h - 0.8 * size, z, kind, size]);
}

// Tour ronde : fût, couronnement crénelé ou poivrière.
export function roundTower(app, B, x, z, r, h, o = {}) {
  const T = app.terrain, y0 = Math.max(0.2, T.height(x, z)) - (o.deep ?? 1.2), yT = (o.base ?? Math.max(0.2, T.height(x, z))) + h;
  const st = B.at('stone', x, z), col = o.col ?? COL.stone;
  cyl(st, x, z, r, y0, yT, { seg: o.seg ?? 14, col, us: 0.25, vs: 0.25 });
  if (o.machi !== false && r > 2.2) {
    const fx = B.at('stonefx', x, z), uv = cellUV(5, 0);
    cyl(fx, x, z, r + 0.45, yT - 1.9, yT + 1.1, { seg: o.seg ?? 14, col, vBot: uv[2], vTop: uv[3], us: 1 / 16, fit: false, s0: 1 });
    disc(st, x, z, r + 0.45, yT - 1.9 + 0.02, { col: tint(col, 0.5) });
  }
  if (o.slits !== false && r >= 2.6 && h >= 12) {          // ceinture d'archères à mi-hauteur
    const circ = 2 * Math.PI * r, uT = Math.max(1, Math.round(circ / 4.5)) / 8, uv4 = cellUV(4, 0), ym = yT - h * 0.45;
    cyl(B.at('stonefx', x, z), x, z, r + 0.04, ym - 1.7, ym + 1.7, { seg: o.seg ?? 14, col, vBot: uv4[2], vTop: uv4[3], us: uT / circ, s0: 1 });
  }
  if (o.roof === 'cone') {
    const apex = yT + (o.roofH ?? r * 2.3) + 1;
    cone(B.at('roof', x, z), x, z, r + 0.75, yT + (r > 2.2 ? 1.0 : 0), apex, { seg: o.seg ?? 14, col: o.roofCol ?? COL.slate });
    if (o.flag != null) flagAt(app, B, x, z, apex - 0.4, 4.2, o.flag);
  } else {
    if (o.flag != null) flagAt(app, B, x, z, yT + 0.2, 6, o.flag);
    disc(st, x, z, r + 0.4, yT + 0.2, { col: tint(col, 0.72) });
    const ring = []; const seg = 16; for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; ring.push([x + Math.cos(a) * (r + 0.25), z + Math.sin(a) * (r + 0.25)]); }
    crenels(st, ring, yT + 1.1, { closed: true, col, w: 0.9, gap: 0.7, h: 0.9 });
  }
  app.solid.fillCircle(x, z, r, 2);
  return yT;
}

// Tour carrée (clocher, donjon, tour de porte).
export function squareTower(app, B, R, h, o = {}) {
  const T = app.terrain, gy = Math.max(0.2, T.height(R.cx, R.cz)), y0 = gy - 1, yT = (o.base ?? gy) + h, col = o.col ?? COL.stone;
  const c = rectCorners(R), st = B.at('stone', R.cx, R.cz);
  const body = o.belfry ? yT - o.belfry : yT;
  walls(st, c, y0, body, { col });
  if (o.belfry) fxWalls(B, c, body, yT, 1, { col, bay: R.hw * 2, s0: 1, minBay: 1.5 });
  if (o.roof === 'spire') {
    const apex = yT + (o.roofH ?? R.hw * 4.2);
    cone(B.at('roof', R.cx, R.cz), R.cx, R.cz, Math.max(R.hl, R.hw) * 1.45, yT, apex, { seg: 4, a0: Math.atan2(R.uz, R.ux) + Math.PI / 4, col: o.roofCol ?? COL.slate });
    if (o.cross !== false) cross(B.at('plain', R.cx, R.cz), R.cx, apex - 0.15, R.cz, -R.uz, R.ux, 1.2, COL.gold);
  }
  else if (o.roof === 'saddle') gableRoof(B.at('roof', R.cx, R.cz), st, R, yT, R.hw * 1.5, { col: o.roofCol ?? COL.tile, gable: { col } });
  else if (o.roof === 'hip') skeletonRoof(B.at('roof', R.cx, R.cz), { outer: c, holes: [] }, yT, { pitch: 1.6, col: o.roofCol ?? COL.slate, overhang: 0.4 });
  else { cap(st, c, [], yT, { col: tint(col, 0.72) }); crenels(st, c, yT, { closed: true, col }); }
  if (o.flag != null) flagAt(app, B, R.cx, R.cz, yT + (o.roof === 'hip' ? R.hw * 1.5 : 0.1), 6, o.flag);
  app.solid.fillRect(R.cx, R.cz, R.ux, R.uz, R.hl, R.hw, 2);
  return yT;
}

// Mur de clôture ou courtine le long d'une ligne.
export function wallLine(app, B, pts, h, th, o = {}) {
  const T = app.terrain, col = o.col ?? COL.stoneGrey;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (L < 0.4) continue;
    const ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    const gy = Math.max(0.2, Math.min(T.height(a[0], a[1]), T.height(c[0], c[1])));
    const st = B.at('stone', mx, mz);
    box(st, { cx: mx, cz: mz, ux, uz, hl: L / 2 + th / 2, hw: th / 2 }, gy - 0.8, gy + h, { col, topCol: tint(col, 0.8) });
    if (o.crenel) crenels(st, [[a[0] - uz * th * 0.3, a[1] + ux * th * 0.3], [c[0] - uz * th * 0.3, c[1] + ux * th * 0.3]], gy + h, { col, th: 0.4 });
    app.solid.strokeLine([a, c], th / 2 + 0.3, 2);
  }
}

// Contreforts le long d'un anneau (sens positif) : un par travée sur les pans assez longs.
export function buttresses(B, ring, g, h, col) {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i], c = ring[(i + 1) % n], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (L < 6.5) continue;
    const dx = (c[0] - a[0]) / L, dz = (c[1] - a[1]) / L, ox = dz, oz = -dx, k = Math.max(2, Math.round(L / 5.2));
    for (let j = 0; j <= k; j++) {
      const t = (j / k) * L, x = a[0] + dx * t + ox * 0.5, z = a[1] + dz * t + oz * 0.5, st = B.at('stone', x, z);
      box(st, { cx: x, cz: z, ux: ox, uz: oz, hl: 0.6, hw: 0.42 }, g.y0, g.yF + h * 0.7, { col, top: false });
      box(st, { cx: x - ox * 0.18, cz: z - oz * 0.18, ux: ox, uz: oz, hl: 0.42, hw: 0.38 }, g.yF + h * 0.7, g.yF + h, { col });
    }
  }
}

// Église générique sur son emprise : nef, bas-côtés, chevet, clocher.
export function church(app, B, pts, r, o = {}) {
  const exs = cleanPoly(pts); if (!exs.length) return;
  exs.sort((a, b) => Math.abs(polyArea(b.outer)) - Math.abs(polyArea(a.outer)));
  const ring = dpRing(exs[0].outer, 0.4);
  if (ring.length < 3) return;
  const area = Math.abs(polyArea(ring));
  const R = minAreaRect(ring);
  if (R.ux < 0 || (Math.abs(R.ux) < 0.25 && R.uz > 0)) { R.ux = -R.ux; R.uz = -R.uz; }      // l'axe pointe vers le chevet (est)
  const g = groundInfo(app, ring), W = R.hw * 2, Lg = R.hl * 2;
  const col = o.col ?? (r() < 0.5 ? COL.stone : COL.stoneWarm), roofCol = o.roofCol ?? (r() < 0.55 ? COL.slate : COL.tileDark);
  const rb = B.at('roof', g.c[0], g.c[1]), st = B.at('stone', g.c[0], g.c[1]);
  markSolid(app, ring);
  // contreforts au droit des travées
  buttresses(B, ccw(ring), g, (W < 12.5 || area < 260 ? (o.wallH ?? 5.5 + W * 0.38) : (o.aisleH ?? clamp(5.5 + W * 0.14, 6.5, 12))) * 0.92, col);
  // fidèles et mendiants devant le portail
  if (app.figurants) for (let i = 0; i < 3; i++) { const a = (r() - 0.5) * W * 0.7, d = 2 + r() * 5; app.figurants.push([R.cx - R.ux * (R.hl + d) - R.uz * a, R.cz - R.uz * (R.hl + d) + R.ux * a, r() * 6.28, r() < 0.5 ? 'man' : 'robe', null, null]); }
  let ridge;
  if (W < 12.5 || area < 260) {
    // chapelle à vaisseau unique
    const hW = o.wallH ?? 5.5 + W * 0.38;
    fxWalls(B, ring, g.y0, g.yF + hW, W < 8 ? 1 : 0, { col, bay: 4.2 });
    const inner = { ...R, hl: R.hl * 0.98, hw: R.hw * 0.98 };
    if (Math.abs(polyArea(ring)) / (4 * R.hl * R.hw) > 0.8) ridge = gableRoof(rb, st, inner, g.yF + hW, R.hw * 1.35, { col: roofCol, gable: { col }, overhang: 0.4 });
    else ridge = skeletonRoof(rb, { outer: ring, holes: [] }, g.yF + hW, { pitch: 1.35, col: roofCol, overhang: 0.3 });
    const wx = R.cx - R.ux * R.hl, wz = R.cz - R.uz * R.hl, pw = Math.min(W * 0.8, 5);
    fxPanel(B, wx - R.uz * pw / 2 - R.ux * 0.12, wz + R.ux * pw / 2 - R.uz * 0.12, wx + R.uz * pw / 2 - R.ux * 0.12, wz - R.ux * pw / 2 - R.uz * 0.12, g.yF, g.yF + Math.min(hW, 5.2), 6, 5, col);
    // flèche de charpente sur le faîte
    const fxp = R.cx - R.ux * R.hl * 0.25, fzp = R.cz - R.uz * R.hl * 0.25;
    cyl(B.at('plain', fxp, fzp), fxp, fzp, 0.7, ridge - 0.6, ridge + 1.6, { seg: 6, col: COL.lead });
    cone(B.at('plain', fxp, fzp), fxp, fzp, 0.95, ridge + 1.6, ridge + 1.6 + W * 0.55 + 2, { seg: 6, col: COL.lead });
    cross(B.at('plain', fxp, fzp), fxp, ridge + 1.5 + W * 0.55 + 2, fzp, -R.uz, R.ux, 1.0, COL.gold);
    return { ridge, R, g, hA: hW };
  }
  // église à bas-côtés
  const hA = o.aisleH ?? clamp(5.5 + W * 0.14, 6.5, 12), Wn = W * (o.naveRatio ?? 0.46);
  const hN = o.naveH ?? hA + Wn * 0.72 + 2.5;
  fxWalls(B, ring, g.y0, g.yF + hA, 0, { col, bay: 5.2 });
  skeletonRoof(rb, { outer: ring, holes: [] }, g.yF + hA, { pitch: 0.55, col: roofCol, maxH: Math.max(1.2, hN - hA - Wn * 0.5), overhang: 0.25 });
  // vaisseau central : du front ouest jusqu'au chevet
  const apR = Wn / 2;
  const nave = { cx: R.cx - R.ux * apR * 0.5, cz: R.cz - R.uz * apR * 0.5, ux: R.ux, uz: R.uz, hl: R.hl - apR * 0.5 - 0.3, hw: Wn / 2 };
  const nc = rectCorners(nave);
  fxWalls(B, nc, g.yF + hA * 0.6, g.yF + hN, 1, { col, bay: 5.2, s0: 1 });
  ridge = gableRoof(rb, st, nave, g.yF + hN, (Wn / 2) * 1.45, { col: roofCol, gable: { col }, overhang: 0.5 });
  // chevet : abside à pans et son toit conique
  const ax = nave.cx + R.ux * nave.hl, az = nave.cz + R.uz * nave.hl;
  const aps = []; const base = Math.atan2(R.uz, R.ux);
  for (let i = 0; i <= 6; i++) { const a = base - Math.PI / 2 + (i / 6) * Math.PI; aps.push([ax + Math.cos(a) * apR, az + Math.sin(a) * apR]); }
  const fx = B.at('stonefx', ax, az), uv7 = cellUV(7, 0);
  for (let i = 0; i < 6; i++) { const p = aps[i], q = aps[i + 1]; fx.quad(q[0], g.yF + hA * 0.6, q[1], p[0], g.yF + hA * 0.6, p[1], p[0], g.yF + hN, p[1], q[0], g.yF + hN, q[1], (i + 1) / 8, uv7[2], i / 8, uv7[3], col); }
  cone(rb, ax, az, apR + 0.5, g.yF + hN, ridge, { seg: 12, a0: base - Math.PI / 2, col: roofCol });
  // façade occidentale : portail et rose
  const wx = nave.cx - R.ux * (nave.hl + 0.15), wz = nave.cz - R.uz * (nave.hl + 0.15);
  const p0 = [wx + R.uz * Wn / 2, wz - R.ux * Wn / 2], p1 = [wx - R.uz * Wn / 2, wz + R.ux * Wn / 2];
  const pw = Math.min(Wn * 0.72, 9), cxp = (p0[0] + p1[0]) / 2, czp = (p0[1] + p1[1]) / 2, hx = (p1[0] - p0[0]) / Wn, hz = (p1[1] - p0[1]) / Wn;
  walls(st, [p0, p1, [p1[0] + R.ux * 0.3, p1[1] + R.uz * 0.3], [p0[0] + R.ux * 0.3, p0[1] + R.uz * 0.3]], g.y0, g.yF + hN, { col });
  fxPanel(B, cxp + hx * pw / 2 - R.ux * 0.06, czp + hz * pw / 2 - R.uz * 0.06, cxp - hx * pw / 2 - R.ux * 0.06, czp - hz * pw / 2 - R.uz * 0.06, g.yF, g.yF + pw * 1.05, 6, 1, col);
  const rs = Math.min(Wn * 0.62, hN - pw * 1.05 - 1.2);
  if (rs > 2.5) fxPanel(B, cxp + hx * rs / 2 - R.ux * 0.06, czp + hz * rs / 2 - R.uz * 0.06, cxp - hx * rs / 2 - R.ux * 0.06, czp - hz * rs / 2 - R.uz * 0.06, g.yF + pw * 1.05 + 0.6, g.yF + pw * 1.05 + 0.6 + rs, 6, 0, col);
  cross(st, nave.cx - R.ux * nave.hl, ridge - 0.1, nave.cz - R.uz * nave.hl, -R.uz, R.ux, 1.5, COL.stone);
  // clocher sur un flanc, près de la façade
  if (o.tower !== false) {
    const side = o.towerSide ?? (r() < 0.5 ? 1 : -1), tw = clamp(W * 0.2, 4.2, 7.5), along = o.towerAt ?? -0.72;
    const tx = R.cx + R.ux * R.hl * along - R.uz * side * (W / 2 - tw / 2), tz = R.cz + R.uz * R.hl * along + R.ux * side * (W / 2 - tw / 2);
    const th = o.towerH ?? hN + 9 + W * 0.25;
    const kind = o.towerRoof ?? (r() < 0.45 ? 'saddle' : 'spire');
    squareTower(app, B, { cx: tx, cz: tz, ux: R.ux, uz: R.uz, hl: tw / 2, hw: tw / 2 }, th, { base: g.yF, col, belfry: 5.5, roof: kind, roofCol, roofH: tw * 2.6 });
  }
  return { ridge, R, g, nave, hN, hA };
}

