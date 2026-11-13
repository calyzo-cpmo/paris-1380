// Édifices particuliers construits sur leurs emprises du plan : églises, couvents, hôtels, collèges, halles, enclos.
import { layer, polys } from './data.js';
import { LU } from './raster.js';
import { mulberry32, polyArea, centroid, minAreaRect, cleanPoly, dpRing, pointInPoly, clamp, distPolyline } from './geom.js';
import { rgb, tint, walls, cap, skeletonRoof, gableRoof, box, cyl, cone, disc, crenels, rectCorners, ccw } from './builder.js';
import { cellUV } from './textures.js';

import { COL, fxWalls, fxPanel, groundInfo, markSolid, stoneBuilding, cross, flagAt, roundTower, squareTower, wallLine, buttresses, church } from './stonework.js';

export * from './stonework.js';

// Ensemble à cours (hôtel aristocratique, collège, hôpital) : ailes le long des plus grands côtés, tourelle d'escalier, mur de clôture.
export function manor(app, B, pts, r, o = {}) {
  const lu = app.lu, occ = app.solid;
  for (const ex of cleanPoly(pts)) {
    let ring = dpRing(ex.outer, 1.0); if (ring.length < 3) continue;
    if (polyArea(ring) < 0) ring.reverse();
    const area = Math.abs(polyArea(ring)); if (area < 60) continue;
    const n = ring.length, edges = [];
    for (let i = 0; i < n; i++) { const a = ring[i], c = ring[(i + 1) % n]; edges.push({ i, a, c, L: Math.hypot(c[0] - a[0], c[1] - a[1]) }); }
    const per = edges.reduce((s, e) => s + e.L, 0);
    const want = clamp(Math.round(per / (o.spacing ?? 70)), 1, o.maxWings ?? 7);
    const col = o.col ?? COL.stone, roofCol = o.roofCol ?? COL.slate;
    const used = new Set();
    let built = 0, firstWing = null;
    for (const e of edges.slice().sort((p, q) => q.L - p.L)) {
      if (built >= want || e.L < 9) break;
      const ux = (e.c[0] - e.a[0]) / e.L, uz = (e.c[1] - e.a[1]) / e.L, nx = -uz, nz = ux;
      let depth = (o.depth ?? 8.5) + r() * 2, m = Math.min(4, e.L * 0.08), len = Math.min(e.L - 2 * m, o.maxLen ?? 60);
      const start = m + r() * Math.max(0, e.L - 2 * m - len);
      let ok = false, R;
      for (let k = 0; k < 3 && !ok; k++) {
        R = { cx: e.a[0] + ux * (start + len / 2) + nx * (depth / 2 + 0.4), cz: e.a[1] + uz * (start + len / 2) + nz * (depth / 2 + 0.4), ux, uz, hl: len / 2, hw: depth / 2 };
        const inside = lu.rectFraction(R.cx, R.cz, ux, uz, R.hl - 0.3, R.hw - 0.3, (v) => v === LU.RES || v === LU.GARDEN || v === LU.COURT);
        if (inside > 0.9 && occ.rectFraction(R.cx, R.cz, ux, uz, R.hl - 0.3, R.hw - 0.3, (v) => v !== 0) < 0.06) ok = true; else { depth *= 0.8; len *= 0.8; }
      }
      if (!ok) continue;
      const floors = o.floors ?? (2 + (r() < 0.5 ? 1 : 0));
      const top = stoneBuilding(app, B, rectCorners(R), { floors, col, roofCol, pitch: o.pitch ?? 1.35, gf: o.gf, bay: o.bay });
      used.add(e.i); built++;
      if (!firstWing) firstWing = { R, top, floors };
    }
    if (firstWing && o.turret !== false) {
      const R = firstWing.R, tx = R.cx + R.ux * (R.hl - 1.5) + (-R.uz) * (R.hw + 1.2), tz = R.cz + R.uz * (R.hl - 1.5) + R.ux * (R.hw + 1.2);
      if (pointInPoly(tx, tz, ring)) roundTower(app, B, tx, tz, 2.3, 4 + firstWing.floors * 3.6 + 3.5, { roof: 'cone', roofCol, machi: false, col, seg: 10 });
    }
    if (o.tower && area > o.tower) {
      const c = centroid(ring);
      if (lu.get(c[0], c[1]) === LU.RES && !occ.get(c[0], c[1])) squareTower(app, B, { cx: c[0], cz: c[1], ux: 1, uz: 0, hl: 4.2, hw: 4.2 }, 21 + r() * 5, { col, roof: 'hip', roofCol });
    }
    // clôture sur les côtés restés libres
    if (o.fence !== false) for (const e of edges) if (!used.has(e.i) && e.L > 2) wallLine(app, B, [e.a, e.c], o.fenceH ?? 3.2, 0.6, { col: COL.stoneGrey });
  }
}

// Halle : nef de charpente sous un grand toit de tuiles.
export function halle(app, B, pts, r) {
  for (const ex of cleanPoly(pts)) {
    const ring = dpRing(ex.outer, 0.5); if (ring.length < 3 || Math.abs(polyArea(ring)) < 20) continue;
    const g = groundInfo(app, ring), R = minAreaRect(ring), hb = B.at('houses', g.c[0], g.c[1]);
    const uv = cellUV(7, 0), h = 4.2 + Math.min(3, R.hw * 0.25);
    const rr = ccw(ring);
    let k = 0;
    for (let i = 0; i < rr.length; i++) { const a = rr[i], c = rr[(i + 1) % rr.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 0.2) continue; const cells = Math.max(1, Math.round(L / 6)); hb.quad(c[0], g.y0, c[1], a[0], g.y0, a[1], a[0], g.yF + h, a[1], c[0], g.yF + h, c[1], (k + cells) / 8, uv[2], k / 8, uv[3], COL.white, 0.7, 1); k = (k + cells) % 8; }
    const rb = B.at('roof', g.c[0], g.c[1]);
    if (Math.abs(polyArea(ring)) / (4 * R.hl * R.hw) > 0.8) { const pl = cellUV(7, 2); gableRoof(rb, hb, R, g.yF + h, R.hw * 1.05, { col: COL.tileOld, overhang: 0.8, gable: { col: COL.white, u0: pl[0], u1: pl[1], v0: pl[2], v1: pl[3] } }); }
    else skeletonRoof(rb, { outer: ring, holes: [] }, g.yF + h, { pitch: 1.0, col: COL.tileOld, overhang: 0.6 });
    markSolid(app, ring);
  }
}

// Emprise trop vaste pour une seule nef (église et bâtiments réguliers confondus sur le plan) :
// bâtiments conventuels sur l'emprise, et une abbatiale de dimensions plausibles le long de son côté nord.
export function abbey(app, B, pts, r, o = {}) {
  const R = minAreaRect(pts);
  if (R.ux < 0) { R.ux = -R.ux; R.uz = -R.uz; }
  stoneBuilding(app, B, pts, { floors: 2, roofCol: o.roofCol ?? COL.tileDark, maxRoof: 6.5, pitch: 1.2, col: o.col });
  const hl = Math.min(R.hl * 0.96, o.len ?? 31), hw = Math.min(R.hw * 0.9, o.wid ?? 11.5);
  const sgn = R.ux > 0 ? -1 : 1;                                  // côté nord de l'axe (z décroissant)
  const off = Math.max(0, R.hw - hw - 1) * sgn;
  const C = { cx: R.cx - R.uz * off, cz: R.cz + R.ux * off, ux: R.ux, uz: R.uz, hl, hw };
  return church(app, B, rectCorners(C), r, o);
}

// Passe générique sur les calques du plan.
export function buildSpecials(app, B) {
  const r = mulberry32(4242), claimed = app.claimed;
  const free = (s) => !claimed.has(s.id);
  // édifices religieux
  for (const name of ['Religieux', 'StVictor', 'Temple', 'StMartin', 'StGermain', 'EnConstruction']) {
    for (const s of polys(name)) {
      if (!free(s)) continue;
      if (s.fill === '#FF0000' || s.fill === '#F3102B') {
        // une emprise très découpée (palais épiscopal, bâtiments conventuels accolés) n'est pas un simple vaisseau d'église
        const R = minAreaRect(s.pts), rect = Math.abs(polyArea(s.pts)) / (4 * R.hl * R.hw);
        let res = null;
        if (rect < 0.5) stoneBuilding(app, B, s.pts, { floors: 2, roofCol: COL.slate, maxRoof: 8, pitch: 1.3 });
        else if (R.hw * 2 > 30 || Math.abs(polyArea(s.pts)) > 2600) res = abbey(app, B, s.pts, r);
        else res = church(app, B, s.pts, r);
        // édifice figuré « en construction » sur le plan : un échafaudage et une grue le long du flanc sud
        if (name === 'EnConstruction' && res) { const Q = res.R; app.chantiers.push({ x: Q.cx - Q.uz * (Q.hw + 0.5), z: Q.cz + Q.ux * (Q.hw + 0.5), ux: Q.ux, uz: Q.uz, len: Math.min(Q.hl * 1.3, 26), h: Math.max(6, (res.hA ?? 8) - 0.5) }); }
      }
      else if (s.fill === '#C92548') stoneBuilding(app, B, s.pts, { floors: 2, roofCol: r() < 0.5 ? COL.tileDark : COL.slate, col: COL.stone, maxRoof: 7 });
    }
  }
  for (const s of polys('Palais', '#FF0000')) if (free(s)) church(app, B, s.pts, r, { tower: false });
  // hôtels aristocratiques
  for (const s of polys('Hotel', '#704D18')) if (free(s)) manor(app, B, s.pts, r, { tower: 7000, floors: null, maxLen: 34, spacing: 48, maxWings: 12 });
  for (const s of polys('Cluny')) if (free(s)) manor(app, B, s.pts, r, {});
  // collèges
  for (const s of polys('Colleges', '#91CC21')) if (free(s)) manor(app, B, s.pts, r, { roofCol: COL.tile, depth: 7.5, floors: 2, spacing: 60, turret: false, fenceH: 2.6 });
  // hôpitaux
  for (const s of polys('Hopital')) if (free(s)) manor(app, B, s.pts, r, { roofCol: COL.tileDark, depth: 11, floors: 2, spacing: 55, gf: 5, turret: false });
  // halles
  for (const s of layer('Halles')) if (s.kind === 'poly' && free(s)) halle(app, B, s.pts, r);
  // édifices royaux et communaux non modélisés à part
  for (const s of polys('Royal')) if (free(s)) stoneBuilding(app, B, s.pts, { floors: 3, roofCol: COL.slate, col: COL.stoneGrey, pitch: 1.3 });
  // enclos : murs et tours
  for (const name of ['StVictor', 'StMartin', 'StGermain', 'Temple']) {
    const strong = name !== 'StVictor';
    for (const s of layer(name)) {
      if (!free(s)) continue;
      if (s.kind === 'line' && s.pts.length >= 2 && !s.dash) { const L = distPolyline(s.pts[0][0], s.pts[0][1], [s.pts[s.pts.length - 1]]); if (s.pts.length > 3 || L > 25) wallLine(app, B, s.pts, strong ? 6.5 : 3.6, strong ? 1.4 : 0.7, { crenel: strong, col: COL.stoneGrey }); }
      else if (s.kind === 'circle' && s.r > 1.5) roundTower(app, B, s.pts[0][0], s.pts[0][1], Math.max(2.4, s.r * 0.8), 10.5, { roof: 'cone', roofCol: COL.tileDark, col: COL.stoneGrey });
      else if (s.kind === 'poly' && s.fill === '#000000' && Math.abs(polyArea(s.pts)) < 80) { const R = minAreaRect(s.pts); squareTower(app, B, R, 10.5, { col: COL.stoneGrey, roof: 'hip', roofCol: COL.tileDark }); }
    }
  }
}
