// Accumulation de géométrie par matériau et par dalle (chunk), et primitives de construction.
import * as THREE from 'three';
import { polyArea, offsetEx, difference } from './geom.js';

export const CHUNK = 440;

// Couleur sRGB (0-255) → entier 0xRRGGBB en espace linéaire (les couleurs de sommet sont linéaires).
const LIN = new Uint8Array(256);
for (let i = 0; i < 256; i++) LIN[i] = Math.round(Math.pow(i / 255, 2.2) * 255);
export const rgb = (r, g, b) => (LIN[r] << 16) | (LIN[g] << 8) | LIN[b];
export function tint(col, k) {
  const r = Math.min(255, ((col >> 16) & 255) * k), g = Math.min(255, ((col >> 8) & 255) * k), b = Math.min(255, (col & 255) * k);
  return (r << 16) | (g << 8) | b;
}
export function mixc(a, b, t) {
  const r = ((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t, g = ((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t, bl = (a & 255) * (1 - t) + (b & 255) * t;
  return (r << 16) | (g << 8) | bl;
}

export class Batch {
  constructor() {
    this.n = 0; this.ni = 0; this.cap = 1024; this.icap = 2048;
    this.pos = new Float32Array(this.cap * 3); this.nor = new Int8Array(this.cap * 3); this.uv = new Float32Array(this.cap * 2); this.col = new Uint8Array(this.cap * 4); this.idx = new Uint32Array(this.icap);
  }
  need(nv, ni) {
    if (this.n + nv > this.cap) {
      while (this.n + nv > this.cap) this.cap *= 2;
      const p = new Float32Array(this.cap * 3); p.set(this.pos.subarray(0, this.n * 3)); this.pos = p;
      const q = new Int8Array(this.cap * 3); q.set(this.nor.subarray(0, this.n * 3)); this.nor = q;
      const u = new Float32Array(this.cap * 2); u.set(this.uv.subarray(0, this.n * 2)); this.uv = u;
      const c = new Uint8Array(this.cap * 4); c.set(this.col.subarray(0, this.n * 4)); this.col = c;
    }
    if (this.ni + ni > this.icap) {
      while (this.ni + ni > this.icap) this.icap *= 2;
      const i = new Uint32Array(this.icap); i.set(this.idx.subarray(0, this.ni)); this.idx = i;
    }
  }
  v(x, y, z, nx, ny, nz, u, v, col, s) {
    const n = this.n, p = n * 3, c = n * 4;
    this.pos[p] = x; this.pos[p + 1] = y; this.pos[p + 2] = z;
    this.nor[p] = nx * 127; this.nor[p + 1] = ny * 127; this.nor[p + 2] = nz * 127;
    this.uv[n * 2] = u; this.uv[n * 2 + 1] = v;
    this.col[c] = Math.min(255, ((col >> 16) & 255) * s); this.col[c + 1] = Math.min(255, ((col >> 8) & 255) * s); this.col[c + 2] = Math.min(255, (col & 255) * s); this.col[c + 3] = 255;
    this.n++;
    return n;
  }
  // Quadrilatère a,b (bas) c,d (haut), sens trigonométrique vu de face. UV : a=(u0,v0) b=(u1,v0) c=(u1,v1) d=(u0,v1).
  quad(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, u0, v0, u1, v1, col, s0 = 1, s1 = 1) {
    this.need(4, 6);
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az, e2x = dx - ax, e2y = dy - ay, e2z = dz - az;
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const i = this.v(ax, ay, az, nx, ny, nz, u0, v0, col, s0);
    this.v(bx, by, bz, nx, ny, nz, u1, v0, col, s0); this.v(cx, cy, cz, nx, ny, nz, u1, v1, col, s1); this.v(dx, dy, dz, nx, ny, nz, u0, v1, col, s1);
    const k = this.ni; this.idx[k] = i; this.idx[k + 1] = i + 1; this.idx[k + 2] = i + 2; this.idx[k + 3] = i; this.idx[k + 4] = i + 2; this.idx[k + 5] = i + 3; this.ni += 6;
  }
  tri(ax, ay, az, bx, by, bz, cx, cy, cz, ua, va, ub, vb, uc, vc, col, sa = 1, sb = 1, sc = 1) {
    this.need(3, 3);
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az, e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const i = this.v(ax, ay, az, nx, ny, nz, ua, va, col, sa);
    this.v(bx, by, bz, nx, ny, nz, ub, vb, col, sb); this.v(cx, cy, cz, nx, ny, nz, uc, vc, col, sc);
    const k = this.ni; this.idx[k] = i; this.idx[k + 1] = i + 1; this.idx[k + 2] = i + 2; this.ni += 3;
  }
}

export class Builder {
  constructor() { this.batches = new Map(); this.tris = 0; }
  at(mat, x, z) {
    const key = mat + '|' + Math.floor(x / CHUNK) + '|' + Math.floor(z / CHUNK);
    let b = this.batches.get(key);
    if (!b) { b = new Batch(); b.mat = mat; this.batches.set(key, b); }
    return b;
  }
  // Crée les maillages et libère les tableaux.
  finish(scene, materials) {
    const meshes = [];
    for (const b of this.batches.values()) {
      if (!b.n) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(b.pos.slice(0, b.n * 3), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(b.nor.slice(0, b.n * 3), 3, true));
      g.setAttribute('uv', new THREE.BufferAttribute(b.uv.slice(0, b.n * 2), 2));
      g.setAttribute('color', new THREE.BufferAttribute(b.col.slice(0, b.n * 4), 4, true));
      g.setIndex(new THREE.BufferAttribute(b.n > 65535 ? b.idx.slice(0, b.ni) : new Uint16Array(b.idx.subarray(0, b.ni)), 1));
      g.computeBoundingSphere(); g.computeBoundingBox();
      const m = new THREE.Mesh(g, materials[b.mat]);
      m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix();
      scene.add(m); meshes.push(m);
      this.tris += b.ni / 3;
      b.pos = b.nor = b.uv = b.col = b.idx = null;
    }
    this.batches.clear();
    return meshes;
  }
}

// ---------- primitives ----------
const V2 = (p) => new THREE.Vector2(p[0], p[1]);

export function ccw(ring) { return polyArea(ring) < 0 ? ring.slice().reverse() : ring; }

// Murs le long d'un anneau fermé. y0 : nombre ou fonction (x,z) → base.
export function walls(b, ring, y0, y1, o = {}) {
  const r = ccw(ring), n = r.length, us = o.us ?? 0.25, vs = o.vs ?? 0.25, col = o.col ?? 0xffffff, s0 = o.s0 ?? 0.74, s1 = o.s1 ?? 1;
  const f = typeof y0 === 'function';
  let u = o.u0 ?? 0;
  for (let i = 0; i < n; i++) {
    const a = r[i], c = r[(i + 1) % n];
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (L < 0.05) continue;
    const ya = f ? y0(a[0], a[1]) : y0, yc = f ? y0(c[0], c[1]) : y0;
    const vTop = o.vTop ?? (y1 - Math.min(ya, yc)) * vs, vBot = o.vBot ?? 0;
    const uu = o.fit ? Math.max(1, Math.round(L * us)) : L * us;
    b.quad(c[0], yc, c[1], a[0], ya, a[1], a[0], y1, a[1], c[0], y1, c[1], u + uu, vBot, u, vTop, col, s0, s1);
    u += uu;
  }
}

// Dalle horizontale (polygone avec trous), tournée vers le haut.
export function cap(b, outer, holes, y, o = {}) {
  const us = o.us ?? 0.25, col = o.col ?? 0xffffff, s = o.s ?? 1;
  const tris = THREE.ShapeUtils.triangulateShape(outer.map(V2), (holes || []).map((h) => h.map(V2)));
  const all = outer.concat(...(holes || []));
  for (const t of tris) {
    let a = all[t[0]], c = all[t[1]], d = all[t[2]];
    if (!a || !c || !d) continue;
    // orientation : normale vers +y
    if ((c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]) > 0) { const q = c; c = d; d = q; }
    b.tri(a[0], y, a[1], c[0], y, c[1], d[0], y, d[1], a[0] * us, a[1] * us, c[0] * us, c[1] * us, d[0] * us, d[1] * us, col, s, s, s);
  }
}

const key = (p) => Math.round(p[0] * 100) + ',' + Math.round(p[1] * 100);

// Couture de deux anneaux emboîtés (la bande entre un polygone et son érodé) : chaque triangle prend un côté sur un
// anneau et son sommet sur l'autre, si bien que les pans restent plans — une triangulation par oreilles, elle, rabote
// les angles. Rend des triplets d'indices dans A.concat(Bq).
function stitch(A, Bq) {
  const n = A.length, m = Bq.length, dir = polyArea(A) * polyArea(Bq) >= 0 ? 1 : -1, tris = [];
  let j0 = 0, best = Infinity;
  for (let j = 0; j < m; j++) { const d = (Bq[j][0] - A[0][0]) ** 2 + (Bq[j][1] - A[0][1]) ** 2; if (d < best) { best = d; j0 = j; } }
  const J = (k) => (((j0 + dir * k) % m) + m) % m;
  let i = 0, k = 0;
  while (i < n || k < m) {
    const a = A[i % n], q = Bq[J(k)];
    let adv = k >= m;
    if (i < n && k < m) { const a1 = A[(i + 1) % n], q1 = Bq[J(k + 1)]; adv = (a1[0] - q[0]) ** 2 + (a1[1] - q[1]) ** 2 <= (q1[0] - a[0]) ** 2 + (q1[1] - a[1]) ** 2; }
    if (adv) { tris.push([i % n, (i + 1) % n, n + J(k)]); i++; } else { tris.push([i % n, n + J(k + 1), n + J(k)]); k++; }
  }
  return tris;
}

// Toit à croupes sur un polygone quelconque : bandes successives du polygone érodé (squelette droit par paliers).
// o.brisis { d, h, b, col, us } : comble brisé — une première bande raide (retrait d, hauteur h) placée dans le lot b,
// puis le terrasson à la pente `pitch`. o.minStep : pas en deçà duquel on ferme le faîte par une dalle.
// o.stitch : bandes cousues d'un anneau à l'autre (pans plans) plutôt que triangulées par oreilles.
export function skeletonRoof(b, exIn, y, o = {}) {
  const pitch = o.pitch ?? 1.1, step0 = o.step ?? 0.9, maxH = o.maxH ?? 1e9, us = o.us ?? 0.33, col = o.col ?? 0xffffff, minStep = o.minStep ?? step0 * 0.26;
  let bd = o.brisis ? o.brisis.d : 0, bh = o.brisis ? o.brisis.h : 0;
  const H = (d) => (d < bd ? (d / bd) * bh : bh + (d - bd) * pitch);
  let cur = o.overhang ? offsetEx([exIn], o.overhang) : [exIn];
  let t = 0, guard = 0, step = step0;
  let top = y;
  const emit = (ex, hOuter, hInner, innerKeys, bb = b, cc = col, uu = us) => {
    const all = ex.outer.concat(...ex.holes);
    const hs = all.map((p) => (innerKeys && innerKeys.has(key(p)) ? hInner : hOuter));
    const tris = o.stitch && innerKeys && ex.holes.length === 1 ? stitch(ex.outer, ex.holes[0]) : THREE.ShapeUtils.triangulateShape(ex.outer.map(V2), ex.holes.map((h) => h.map(V2)));
    for (const tr of tris) {
      let i0 = tr[0], i1 = tr[1], i2 = tr[2];
      let a = all[i0], c = all[i1], d = all[i2];
      if (!a || !c || !d) continue;
      const cr = (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]);
      if (Math.abs(cr) < 1e-6) continue;                       // triangle dégénéré
      if (cr > 0) { const q = i1; i1 = i2; i2 = q; c = all[i1]; d = all[i2]; }
      const ya = hs[i0], yc = hs[i1], yd = hs[i2];
      // repère de pente pour les UV : u le long de l'égout, v en montant
      const e1x = c[0] - a[0], e1y = yc - ya, e1z = c[1] - a[1], e2x = d[0] - a[0], e2y = yd - ya, e2z = d[1] - a[1];
      let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const hl = Math.hypot(nx, nz);
      let tx = 1, tz = 0, k = 1;
      if (hl > 0.05) { tx = -nz / hl; tz = nx / hl; k = 1 / Math.max(0.2, ny); }
      const uvu = (p) => (p[0] * tx + p[1] * tz) * uu;
      const uvv = (p, yy) => (hl > 0.05 ? (yy - y) / hl : p[0] * tz - p[1] * tx) * uu;
      bb.tri(a[0], ya, a[1], c[0], yc, c[1], d[0], yd, d[1], uvu(a), uvv(a, ya), uvu(c), uvv(c, yc), uvu(d), uvv(d, yd), cc);
    }
  };
  while (cur.length && guard++ < 80) {
    const h0 = y + H(t);
    if (H(t) >= maxH) { for (const ex of cur) emit(ex, h0, h0, null); top = h0; break; }
    const inB = t < bd - 1e-6, st = inB ? bd - t : step;
    const next = offsetEx(cur, -st);
    if (!next.length) {
      if (inB) { bd = 0; bh = 0; continue; }               // corps trop étroit pour un brisis : simple toit à versants
      if (step > minStep) { step *= 0.5; continue; }
      for (const ex of cur) emit(ex, h0, h0, null);
      top = h0; break;
    }
    const h1 = y + H(t + st);
    const inner = new Set();
    for (const ex of next) { for (const p of ex.outer) inner.add(key(p)); for (const hh of ex.holes) for (const p of hh) inner.add(key(p)); }
    for (const ex of difference(cur, next)) { if (inB) emit(ex, h0, h1, inner, o.brisis.b || b, o.brisis.col ?? col, o.brisis.us ?? us); else emit(ex, h0, h1, inner); }
    cur = next; t += st; top = h1;
  }
  return top;
}

// Rectangle orienté : centre (cx,cz), axe long unitaire (ux,uz), demi-longueur hl, demi-largeur hw.
export function rectCorners(r) {
  const { cx, cz, ux, uz, hl, hw } = r;
  // sens positif (aire > 0 dans le plan x,z)
  return [[cx - ux * hl + uz * hw, cz - uz * hl - ux * hw], [cx + ux * hl + uz * hw, cz + uz * hl - ux * hw], [cx + ux * hl - uz * hw, cz + uz * hl + ux * hw], [cx - ux * hl - uz * hw, cz - uz * hl + ux * hw]];
}

// Toit à deux versants, faîtage selon l'axe long. Les pignons (triangles) vont dans le lot `wb` (mur) si fourni.
export function gableRoof(b, wb, r, yEave, rise, o = {}) {
  const { cx, cz, ux, uz, hl, hw } = r;
  const ov = o.overhang ?? 0.35, us = o.us ?? 0.33, col = o.col ?? 0xffffff, hip = o.hip ?? 0;
  const L = hl + (hip ? 0 : ov), W = hw + ov;
  const drop = (ov * rise) / hw;                 // l'égout descend sous la sablière
  const sl = Math.hypot(W, rise + drop);
  const P = (a, c) => [cx + ux * a - uz * c, cz + uz * a + ux * c];
  const yr = yEave + rise, ye = yEave - drop;
  const r0 = P(-L + hip, 0), r1 = P(L - hip, 0);
  const a0 = P(-L, -W), a1 = P(L, -W), c0 = P(-L, W), c1 = P(L, W);
  // versant côté -w puis côté +w
  b.quad(a1[0], ye, a1[1], a0[0], ye, a0[1], r0[0], yr, r0[1], r1[0], yr, r1[1], 2 * L * us, 0, 0, sl * us, col, 0.9, 1);
  b.quad(c0[0], ye, c0[1], c1[0], ye, c1[1], r1[0], yr, r1[1], r0[0], yr, r0[1], 0, 0, 2 * L * us, sl * us, col, 0.9, 1);
  if (hip) {
    b.tri(a0[0], ye, a0[1], c0[0], ye, c0[1], r0[0], yr, r0[1], 0, 0, 2 * W * us, 0, W * us, sl * us, col, 0.9, 0.9, 1);
    b.tri(c1[0], ye, c1[1], a1[0], ye, a1[1], r1[0], yr, r1[1], 0, 0, 2 * W * us, 0, W * us, sl * us, col, 0.9, 0.9, 1);
  } else if (wb) {
    const g = o.gable || {};
    const wus = g.us ?? 0.25, wcol = g.col ?? 0xffffff;
    const q0 = P(-hl, -hw), q1 = P(-hl, hw), q2 = P(hl, hw), q3 = P(hl, -hw), m0 = P(-hl, 0), m1 = P(hl, 0);
    const u0 = g.u0 ?? 0, u1 = g.u1 ?? 2 * hw * wus, v0 = g.v0 ?? yEave * wus, v1 = g.v1 ?? (yEave + rise) * wus;
    wb.tri(q0[0], yEave, q0[1], q1[0], yEave, q1[1], m0[0], yr, m0[1], u0, v0, u1, v0, (u0 + u1) / 2, v1, wcol);
    wb.tri(q2[0], yEave, q2[1], q3[0], yEave, q3[1], m1[0], yr, m1[1], u0, v0, u1, v0, (u0 + u1) / 2, v1, wcol);
  }
  return yr;
}

// Boîte orientée (4 faces + dessus).
export function box(b, r, y0, y1, o = {}) {
  const c = rectCorners(r);
  walls(b, c, y0, y1, o);
  if (o.top !== false) { const col = o.topCol ?? o.col ?? 0xffffff; b.quad(c[0][0], y1, c[0][1], c[3][0], y1, c[3][1], c[2][0], y1, c[2][1], c[1][0], y1, c[1][1], 0, 0, r.hl * 2 * (o.us ?? 0.25), r.hw * 2 * (o.us ?? 0.25), col); }
}

export function ringCircle(cx, cz, r, seg = 12, a0 = 0) {
  const out = [];
  for (let i = 0; i < seg; i++) { const a = a0 + (i / seg) * Math.PI * 2; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return out; // sens positif
}

// Cylindre lisse (tour) : normales radiales.
export function cyl(b, cx, cz, r, y0, y1, o = {}) {
  const seg = o.seg ?? 12, us = o.us ?? 0.25, vs = o.vs ?? 0.25, col = o.col ?? 0xffffff, s0 = o.s0 ?? 0.74, s1 = o.s1 ?? 1, r1 = o.r1 ?? r;
  const f = typeof y0 === 'function';
  b.need(seg * 4, seg * 6);
  const circ = 2 * Math.PI * r;
  const uTot = o.fit ? Math.max(1, Math.round(circ * us)) : circ * us;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const c0 = Math.cos(a0), s0_ = Math.sin(a0), c1 = Math.cos(a1), s1_ = Math.sin(a1);
    const x0 = cx + c0 * r, z0 = cz + s0_ * r, x1 = cx + c1 * r, z1 = cz + s1_ * r;
    const X0 = cx + c0 * r1, Z0 = cz + s0_ * r1, X1 = cx + c1 * r1, Z1 = cz + s1_ * r1;
    const ya = f ? y0(x0, z0) : y0, yb = f ? y0(x1, z1) : y0;
    const u0 = (i / seg) * uTot, u1 = ((i + 1) / seg) * uTot, vT = o.vTop ?? (y1 - ya) * vs, vB = o.vBot ?? 0;
    const i0 = b.v(x1, yb, z1, c1, 0, s1_, u1, vB, col, s0);
    b.v(x0, ya, z0, c0, 0, s0_, u0, vB, col, s0); b.v(X0, y1, Z0, c0, 0, s0_, u0, vT, col, s1); b.v(X1, y1, Z1, c1, 0, s1_, u1, vT, col, s1);
    const k = b.ni; b.idx[k] = i0; b.idx[k + 1] = i0 + 1; b.idx[k + 2] = i0 + 2; b.idx[k + 3] = i0; b.idx[k + 4] = i0 + 2; b.idx[k + 5] = i0 + 3; b.ni += 6;
  }
}

// Cône ou flèche polygonale (poivrière, flèche d'église).
export function cone(b, cx, cz, r, y0, y1, o = {}) {
  const seg = o.seg ?? 12, us = o.us ?? 0.33, col = o.col ?? 0xffffff, a0 = o.a0 ?? 0;
  const sl = Math.hypot(r, y1 - y0);
  for (let i = 0; i < seg; i++) {
    const p0 = a0 + (i / seg) * Math.PI * 2, p1 = a0 + ((i + 1) / seg) * Math.PI * 2;
    const x0 = cx + Math.cos(p0) * r, z0 = cz + Math.sin(p0) * r, x1 = cx + Math.cos(p1) * r, z1 = cz + Math.sin(p1) * r;
    const w = Math.hypot(x1 - x0, z1 - z0) * us;
    b.tri(x1, y0, z1, x0, y0, z0, cx, y1, cz, w, 0, 0, 0, w / 2, sl * us, col, 0.88, 0.88, 1);
  }
}

// Disque horizontal (dessus de tour).
export function disc(b, cx, cz, r, y, o = {}) {
  const seg = o.seg ?? 12, col = o.col ?? 0xffffff, us = o.us ?? 0.25;
  for (let i = 0; i < seg; i++) {
    const p0 = (i / seg) * Math.PI * 2, p1 = ((i + 1) / seg) * Math.PI * 2;
    const x0 = cx + Math.cos(p0) * r, z0 = cz + Math.sin(p0) * r, x1 = cx + Math.cos(p1) * r, z1 = cz + Math.sin(p1) * r;
    b.tri(cx, y, cz, x1, y, z1, x0, y, z0, cx * us, cz * us, x1 * us, z1 * us, x0 * us, z0 * us, col);
  }
}

// Créneaux le long d'une ligne (merlons en boîtes).
export function crenels(b, pts, y, o = {}) {
  const h = o.h ?? 0.9, w = o.w ?? 1.1, gap = o.gap ?? 0.9, th = o.th ?? 0.45, col = o.col ?? 0xffffff, closed = o.closed ?? false;
  const yf = typeof y === 'function';
  const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i], c = pts[(i + 1) % n];
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < w) continue;
    const ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L;
    const cnt = Math.max(1, Math.floor((L + gap) / (w + gap))), pad = (L - (cnt * w + (cnt - 1) * gap)) / 2;
    for (let k = 0; k < cnt; k++) {
      const s = pad + k * (w + gap) + w / 2, mx = a[0] + ux * s, mz = a[1] + uz * s;
      const yy = yf ? y(mx, mz) : y;
      box(b, { cx: mx, cz: mz, ux, uz, hl: w / 2, hw: th / 2 }, yy, yy + h, { col, us: o.us ?? 0.25, s0: 0.95, s1: 1 });
    }
  }
}
