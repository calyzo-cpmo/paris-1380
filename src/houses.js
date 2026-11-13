// Tissu urbain : maisons à pans de bois loties le long des rues de chaque îlot bâti du plan de 1380.
import { polys } from './data.js';
import { LU } from './raster.js';
import { mulberry32, polyArea, dpRing, offsetEx, smoothstep, clamp, centroid } from './geom.js';
import { rgb, tint, gableRoof, box, cyl, disc } from './builder.js';
import { cellUV } from './textures.js';

export const PLASTERS = [rgb(255, 250, 240), rgb(246, 232, 204), rgb(236, 212, 172), rgb(238, 212, 196), rgb(220, 214, 204), rgb(250, 240, 220), rgb(228, 200, 160)];
export const TILES = [rgb(178, 112, 82), rgb(160, 100, 76), rgb(188, 126, 92), rgb(146, 96, 78), rgb(170, 118, 94), rgb(156, 108, 82), rgb(184, 134, 104)];
const THATCH = rgb(150, 134, 96), SLATE = rgb(96, 106, 122);
const GF = 3.3, UF = 2.8;

// Densité urbaine (0 faubourg … 1 cœur de ville)
export function density(x, z) {
  const d = Math.hypot(x + 60, (z + 330) * 1.08);
  return clamp(1.05 - smoothstep(380, 1500, d) * 0.9, 0.12, 1);
}

export function placeHouse(app, B, r, H) {
  const { ox, oz, rx, rz, nx, nz, w, d, floors, gableFront, style, plaster, roofCol } = H;
  const T = app.terrain;
  const cxm = ox + rx * w / 2 + nx * d / 2, czm = oz + rz * w / 2 + nz * d / 2;
  const b = B.at('houses', cxm, czm), rb = B.at('roof', cxm, czm);
  const yF = H.y ?? T.height(ox + rx * w / 2 + nx * 1.5, oz + rz * w / 2 + nz * 1.5);
  const corners = [[ox, oz], [ox + rx * w, oz + rz * w], [ox + rx * w + nx * d, oz + rz * w + nz * d], [ox + nx * d, oz + nz * d]];
  let yMin = yF;
  for (const c of corners) yMin = Math.min(yMin, T.height(c[0], c[1]));
  const yBase = H.yBase ?? yMin - 0.4;
  const jet = H.jetty;
  const yTop = yF + GF + (floors - 1) * UF;
  // façade sur rue, étage par étage (encorbellements)
  const col0 = (r() * 8) | 0;
  const ncell = w > 8.6 ? 2 : 1;
  for (let f = 0; f < floors; f++) {
    const j = f * jet, y0 = f === 0 ? yBase : yF + GF + (f - 1) * UF, y1 = f === 0 ? yF + GF : y0 + UF;
    const lx = ox - nx * j, lz = oz - nz * j, qx = lx + rx * w, qz = lz + rz * w;
    const row = f === 0 ? H.gfRow : style;
    const uv = cellUV(row, (col0 + f * 3) % 8, ncell);
    const vb = f === 0 ? uv[2] - (uv[3] - uv[2]) * ((yF - yBase) / GF) * 0 : uv[2];
    b.quad(qx, y0, qz, lx, y0, lz, lx, y1, lz, qx, y1, qz, uv[0], vb, uv[1], uv[3], plaster, f === 0 ? 0.7 : 0.96, 1);
    if (f > 0 && jet > 0) {        // sous-face de l'encorbellement
      const px = ox - nx * (j - jet), pz = oz - nz * (j - jet);
      b.quad(px + rx * w, y0, pz + rz * w, px, y0, pz, lx, y0, lz, qx, y0, qz, uv[0], uv[2], uv[1], uv[2] + 0.01, plaster, 0.45, 0.45);
    }
  }
  const jm = (floors - 1) * jet;
  const fx = ox - nx * jm, fz = oz - nz * jm;                 // nu de façade au dernier étage
  const pl = cellUV(6, (col0 + 5) % 8), pl2 = cellUV(6, (col0 + 2) % 8);
  const A = [fx, fz], Bp = [fx + rx * w, fz + rz * w], C = [ox + rx * w + nx * d, oz + rz * w + nz * d], D = [ox + nx * d, oz + nz * d];
  // murs latéraux et arrière
  b.quad(A[0], yBase, A[1], D[0], yBase, D[1], D[0], yTop, D[1], A[0], yTop, A[1], pl[0], pl[2], pl[1], pl[3], plaster, 0.66, 0.96);
  b.quad(C[0], yBase, C[1], Bp[0], yBase, Bp[1], Bp[0], yTop, Bp[1], C[0], yTop, C[1], pl2[0], pl2[2], pl2[1], pl2[3], plaster, 0.66, 0.96);
  b.quad(D[0], yBase, D[1], C[0], yBase, C[1], C[0], yTop, C[1], D[0], yTop, D[1], pl[0], pl[2], pl[1], pl[3], plaster, 0.66, 0.96);
  const dd = d + jm;
  const rcx = fx + rx * w / 2 + nx * dd / 2, rcz = fz + rz * w / 2 + nz * dd / 2;
  let ridge;
  if (gableFront) {
    const rise = (w / 2) * H.pitch;
    ridge = gableRoof(rb, null, { cx: rcx, cz: rcz, ux: nx, uz: nz, hl: dd / 2, hw: w / 2 }, yTop, rise, { col: roofCol, overhang: 0.3 });
    const g = cellUV(5, (col0 + 1) % 8), mx = fx + rx * w / 2, mz = fz + rz * w / 2;
    b.tri(Bp[0], yTop, Bp[1], A[0], yTop, A[1], mx, yTop + rise, mz, g[0], g[2], g[1], g[2], (g[0] + g[1]) / 2, g[3], plaster);
    const bx = (C[0] + D[0]) / 2, bz = (C[1] + D[1]) / 2;
    b.tri(D[0], yTop, D[1], C[0], yTop, C[1], bx, yTop + rise, bz, pl[0], pl[2], pl[1], pl[2], (pl[0] + pl[1]) / 2, pl[3], plaster, 0.96, 0.96, 1);
  } else {
    const rise = (dd / 2) * Math.min(H.pitch, 1.15);
    ridge = gableRoof(rb, null, { cx: rcx, cz: rcz, ux: rx, uz: rz, hl: w / 2, hw: dd / 2 }, yTop, rise, { col: roofCol, overhang: 0.3 });
    const m1x = (A[0] + D[0]) / 2, m1z = (A[1] + D[1]) / 2, m2x = (Bp[0] + C[0]) / 2, m2z = (Bp[1] + C[1]) / 2;
    b.tri(A[0], yTop, A[1], D[0], yTop, D[1], m1x, yTop + rise, m1z, pl[0], pl[2], pl[1], pl[2], (pl[0] + pl[1]) / 2, pl[3], plaster, 0.96, 0.96, 1);
    b.tri(C[0], yTop, C[1], Bp[0], yTop, Bp[1], m2x, yTop + rise, m2z, pl2[0], pl2[2], pl2[1], pl2[2], (pl2[0] + pl2[1]) / 2, pl2[3], plaster, 0.96, 0.96, 1);
  }
  // souche de cheminée
  if (r() < 0.8) {
    const t = 0.3 + r() * 0.4, side = r() < 0.5 ? 0.12 : 0.88;
    const px = fx + rx * w * side + nx * dd * t, pz = fz + rz * w * side + nz * dd * t, hw = 0.38, top = ridge + 0.5 + r() * 0.6;
    const st = cellUV(1, 2), cc = rgb(170, 150, 128);
    const q = [[px - rx * hw - nx * hw, pz - rz * hw - nz * hw], [px + rx * hw - nx * hw, pz + rz * hw - nz * hw], [px + rx * hw + nx * hw, pz + rz * hw + nz * hw], [px - rx * hw + nx * hw, pz - rz * hw + nz * hw]];
    for (let i = 0; i < 4; i++) { const p = q[i], n2 = q[(i + 3) % 4]; b.quad(p[0], yTop, p[1], n2[0], yTop, n2[1], n2[0], top, n2[1], p[0], top, p[1], st[0], st[2], st[0] + 0.02, st[2] + 0.04, cc, 0.8, 0.9); }
    if (app.chimneys.length < 4000) app.chimneys.push(px, top, pz);
  }
  if (!H.plain) houseDetails(app, B, r, H, yF, yTop, fx, fz, dd, b, rb);
  return ridge;
}

const SIGNS = [rgb(150, 40, 36), rgb(40, 60, 120), rgb(196, 160, 60), rgb(60, 100, 60), rgb(220, 210, 190), rgb(34, 32, 36), rgb(170, 90, 40)];
const AWNINGS = [rgb(104, 82, 58), rgb(120, 96, 68), rgb(176, 140, 84), rgb(140, 66, 52), rgb(200, 190, 166), rgb(92, 108, 82)];
const BARREL = rgb(112, 88, 62), BARREL_D = rgb(74, 58, 42), IRONC = rgb(54, 52, 54);

// Détails d'une maison de ville : auvent d'échoppe, enseigne pendante, lucarne, tonneaux et caisses devant la porte.
function houseDetails(app, B, r, H, yF, yTop, fx, fz, dd, hb, rb) {
  const { ox, oz, rx, rz, nx, nz, w, floors, gableFront, roofCol, plaster } = H, dens = H.dens ?? 0.5;
  const pb = B.at('plain', ox + rx * w / 2, oz + rz * w / 2);
  const P = (u, v) => [ox + rx * u - nx * v, oz + rz * u - nz * v];          // v : saillie sur la rue
  if (H.gfRow === 0 && r() < 0.62) {                                         // auvent au-dessus de l'ouvroir
    const a = P(w * 0.92, 1.05), c = P(w * 0.08, 1.05), d = P(w * 0.08, 0.03), e = P(w * 0.92, 0.03), col = AWNINGS[(r() * AWNINGS.length) | 0], y0 = yF + 2.32, y1 = yF + 2.78;
    pb.quad(a[0], y0, a[1], c[0], y0, c[1], d[0], y1, d[1], e[0], y1, e[1], 0, 0, 1, 1, col);
    pb.quad(c[0], y0, c[1], a[0], y0, a[1], e[0], y1, e[1], d[0], y1, d[1], 0, 0, 1, 1, tint(col, 0.55));
  }
  if (floors > 1 && r() < 0.14 + 0.24 * dens) {                              // enseigne sur sa potence
    const u = w * (r() < 0.5 ? 0.16 : 0.84), ys = yF + GF + 0.3, col = SIGNS[(r() * SIGNS.length) | 0], m = P(u, 0.6);
    box(pb, { cx: m[0], cz: m[1], ux: nx, uz: nz, hl: 0.6, hw: 0.03 }, ys, ys + 0.06, { col: IRONC });
    const a = P(u, 0.32), c = P(u, 1.0);
    pb.quad(a[0], ys - 0.66, a[1], c[0], ys - 0.66, c[1], c[0], ys - 0.08, c[1], a[0], ys - 0.08, a[1], 0, 0, 1, 1, col);
    pb.quad(c[0], ys - 0.66, c[1], a[0], ys - 0.66, a[1], a[0], ys - 0.08, a[1], c[0], ys - 0.08, c[1], 0, 0, 1, 1, col);
  }
  if (r() < 0.08 + 0.1 * dens) {                                             // tonneaux, caisses
    const n = 1 + ((r() * 3) | 0);
    for (let k = 0; k < n; k++) {
      const p = P(w * (0.15 + 0.7 * r()), 0.45 + r() * 0.2), y = yF - 0.08;
      if (r() < 0.65) { cyl(pb, p[0], p[1], 0.32, y, y + 0.88, { seg: 7, col: BARREL, s0: 0.8 }); disc(pb, p[0], p[1], 0.32, y + 0.88, { seg: 7, col: BARREL_D }); }
      else box(pb, { cx: p[0], cz: p[1], ux: rx, uz: rz, hl: 0.42, hw: 0.3 }, y, y + 0.5, { col: BARREL, s0: 0.8 });
    }
  }
  if (!gableFront && w > 5 && r() < 0.75) {                                   // lucarnes sur le versant côté rue
    const rise = (dd / 2) * Math.min(H.pitch, 1.15), slope = rise / (dd / 2), n = w > 8.2 ? 2 : 1, hD = 1.15, half = 0.58;
    const Q = (u, v) => [fx + rx * u + nx * v, fz + rz * u + nz * v];
    const win = cellUV(2, (r() * 8) | 0), wu0 = win[0] + (win[1] - win[0]) * 0.2, wu1 = win[0] + (win[1] - win[0]) * 0.42, wv0 = win[2] + (win[3] - win[2]) * 0.28, wv1 = win[2] + (win[3] - win[2]) * 0.75;
    for (let k = 0; k < n; k++) {
      const u = w * (n === 1 ? 0.5 : k ? 0.72 : 0.28), e = dd * 0.11, y1 = yTop + e * slope, y2 = y1 + hD, e2 = e + hD / slope, e3 = e + (hD + 0.5) / slope;
      const l = Q(u - half, e), q = Q(u + half, e), lb = Q(u - half, e2), qb = Q(u + half, e2), m = Q(u, e - 0.12), mb = Q(u, e3), lo = Q(u - half - 0.12, e - 0.12), qo = Q(u + half + 0.12, e - 0.12);
      hb.quad(q[0], y1, q[1], l[0], y1, l[1], l[0], y2, l[1], q[0], y2, q[1], wu0, wv0, wu1, wv1, plaster);
      hb.tri(q[0], y2, q[1], l[0], y2, l[1], (l[0] + q[0]) / 2, y2 + 0.5, (l[1] + q[1]) / 2, wu0, wv1, wu1, wv1, (wu0 + wu1) / 2, wv1 + 0.004, plaster);
      const pl = cellUV(6, 3);
      hb.tri(l[0], y1, l[1], lb[0], y2, lb[1], l[0], y2, l[1], pl[0], pl[2], pl[0] + 0.02, pl[3], pl[0], pl[3], plaster, 0.9, 0.9, 0.9);
      hb.tri(q[0], y1, q[1], q[0], y2, q[1], qb[0], y2, qb[1], pl[0], pl[2], pl[0], pl[3], pl[0] + 0.02, pl[3], plaster, 0.9, 0.9, 0.9);
      // petit toit à deux pans
      rb.quad(lo[0], y2 - 0.05, lo[1], lb[0], y2 - 0.05, lb[1], mb[0], y2 + 0.5, mb[1], m[0], y2 + 0.5, m[1], 0, 0, 0.4, 0.3, roofCol);
      rb.quad(m[0], y2 + 0.5, m[1], mb[0], y2 + 0.5, mb[1], qb[0], y2 - 0.05, qb[1], qo[0], y2 - 0.05, qo[1], 0, 0.3, 0.4, 0, roofCol);
    }
  }
}

// Lotit le pourtour d'un polygone : maisons mitoyennes, façade sur la limite.
function lotRing(app, B, r, ring, o) {
  const lu = app.lu, occ = app.solid;
  const n = ring.length;
  let placed = 0, prevDepth = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i], c = ring[(i + 1) % n], p = ring[(i + n - 1) % n];
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (L < 3.2) { prevDepth = 0; continue; }
    const rx = (c[0] - a[0]) / L, rz = (c[1] - a[1]) / L, nx = -rz, nz = rx;       // n : vers l'intérieur de l'îlot
    // angle intérieur au sommet a
    const px = (a[0] - p[0]), pz = (a[1] - p[1]), pl = Math.hypot(px, pz) || 1;
    const cross = (px * rz - pz * rx) / pl, dot = (px * rx + pz * rz) / pl;
    const turn = Math.atan2(cross, dot);                                           // > 0 : angle saillant
    let s = turn > 0.35 ? prevDepth * Math.min(1.25, Math.sin(Math.min(turn, 1.5708)) + 0.05) : 0;
    let last = 0;
    while (s + 3.4 <= L) {
      const dens = density(a[0] + rx * s, a[1] + rz * s) * o.dens;
      let w = 4.3 + r() * 3.2 + (1 - dens) * 1.6;
      if (L - s - w < 3.6) w = L - s;
      if (w > 10.5) w = w / 2;
      let d = (o.depth0 + r() * o.depthVar) * (0.85 + 0.3 * dens);
      let ok = false;
      const ox = a[0] + rx * s, oz = a[1] + rz * s;
      for (let k = 0; k < 4 && !ok; k++) {
        const cx = ox + rx * w / 2 + nx * (d / 2 + 0.25), cz = oz + rz * w / 2 + nz * (d / 2 + 0.25);
        const fb = lu.rectFraction(cx, cz, rx, rz, w / 2 - 0.2, d / 2 - 0.25, (v) => v === LU.BATI);
        if (fb >= 0.86 && occ.rectFraction(cx, cz, rx, rz, w / 2 - 0.3, d / 2 - 0.3, (v) => v !== 0) <= 0.1) ok = true; else d *= 0.74;
        if (d < 4.2) break;
      }
      if (!ok || r() > o.fill) { s += ok ? w : 1.6; last = 0; continue; }
      const faub = dens < 0.3;
      let floors = dens > 0.75 ? 3 + (r() < 0.45 ? 1 : 0) : dens > 0.45 ? 2 + (r() < 0.55 ? 1 : 0) : 1 + (r() < 0.6 ? 1 : 0);
      if (o.low) floors = Math.max(1, floors - 1);
      const gableFront = w < 7.4 ? r() < 0.82 : r() < 0.25;
      const thatch = faub && r() < 0.35;
      const style = thatch ? 7 : r() < 0.42 ? 2 : r() < 0.6 ? 3 : 4;
      placeHouse(app, B, r, {
        ox, oz, rx, rz, nx, nz, w, d, floors, gableFront, style, gfRow: thatch ? 7 : r() < 0.6 * dens + 0.15 ? 0 : 1,
        jetty: floors > 1 && !thatch ? 0.28 + r() * 0.2 : 0, pitch: thatch ? 1.0 : 1.15 + r() * 0.45,
        plaster: PLASTERS[(r() * PLASTERS.length) | 0], roofCol: thatch ? THATCH : r() < 0.03 ? SLATE : TILES[(r() * TILES.length) | 0], dens, plain: thatch,
      });
      occ.fillRect(ox + rx * w / 2 + nx * d / 2, oz + rz * w / 2 + nz * d / 2, rx, rz, w / 2, d / 2, 1);
      placed++; last = d; s += w;
    }
    prevDepth = last;
  }
  return placed;
}

export function buildHouses(app, B) {
  const r = mulberry32(13800);
  let count = 0;
  for (const blk of polys('Bati', '#BFBFBF')) {
    let ring = dpRing(blk.pts, 0.9);
    if (ring.length < 3) continue;
    if (polyArea(ring) < 0) ring.reverse();
    const area = Math.abs(polyArea(ring));
    if (area < 30) continue;
    const c = centroid(ring);
    const dens = density(c[0], c[1]);
    count += lotRing(app, B, r, ring, { depth0: 8.5, depthVar: 4.5, dens: 1, fill: 0.97 });
    // cœur d'îlot : rangs intérieurs dans les quartiers denses, appentis et jardins ailleurs
    let inset = 15.5, level = 0;
    while (level < 3) {
      const inner = offsetEx([ring], -inset);
      if (!inner.length) break;
      for (const ex of inner) {
        if (Math.abs(polyArea(ex.outer)) < 90) continue;
        let q = dpRing(ex.outer, 0.9); if (polyArea(q) < 0) q.reverse();
        count += lotRing(app, B, r, q, { depth0: 6, depthVar: 3, dens: 0.8, fill: clamp(dens * 1.05 - 0.25 - level * 0.18, 0.05, 0.9), low: true });
      }
      inset += 13; level++;
    }
  }
  return count;
}
