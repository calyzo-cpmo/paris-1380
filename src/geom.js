// Outils géométriques 2D (plan x/z, en mètres) et enveloppes autour de Clipper.
import ClipperLib from 'clipper-lib';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, z) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Bruit de valeur lissé, périodique sur rien, déterministe.
export function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const fx = x - xi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, z, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

export function polyArea(p) {
  let a = 0;
  for (let i = 0, n = p.length; i < n; i++) { const q = p[(i + 1) % n]; a += p[i][0] * q[1] - q[0] * p[i][1]; }
  return a / 2;
}

export function centroid(p) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0, n = p.length; i < n; i++) {
    const q = p[(i + 1) % n], f = p[i][0] * q[1] - q[0] * p[i][1];
    a += f; cx += (p[i][0] + q[0]) * f; cz += (p[i][1] + q[1]) * f;
  }
  if (Math.abs(a) < 1e-9) { let sx = 0, sz = 0; for (const v of p) { sx += v[0]; sz += v[1]; } return [sx / p.length, sz / p.length]; }
  return [cx / (3 * a), cz / (3 * a)];
}

export function bbox(p) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const v of p) { if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0]; if (v[1] < z0) z0 = v[1]; if (v[1] > z1) z1 = v[1]; }
  return { x0, z0, x1, z1 };
}

export function pointInPoly(x, z, p) {
  let c = false;
  for (let i = 0, n = p.length, j = n - 1; i < n; j = i++) {
    const a = p[i], b = p[j];
    if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

export function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}

export function distPolyline(px, pz, pts, closed = false) {
  let d = Infinity;
  const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const v = distSeg(px, pz, a[0], a[1], b[0], b[1]);
    if (v < d) d = v;
  }
  return d;
}

export function polylineLength(pts, closed = false) {
  let L = 0;
  const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) { const a = pts[i], b = pts[(i + 1) % n]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  return L;
}

// Point et tangente à l'abscisse curviligne s.
export function pointAt(pts, s) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= l || i === pts.length - 2) { const t = l > 0 ? clamp(s / l, 0, 1) : 0; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, dx: (b[0] - a[0]) / (l || 1), dz: (b[1] - a[1]) / (l || 1) }; }
    s -= l;
  }
  return { x: pts[0][0], z: pts[0][1], dx: 1, dz: 0 };
}

export function convexHull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop();
  return lo.concat(up);
}

// Rectangle englobant d'aire minimale : centre, axe long unitaire (ux,uz), demi-longueur hl, demi-largeur hw.
export function minAreaRect(points) {
  const hull = convexHull(points);
  let best = null;
  const n = hull.length;
  if (n < 3) {
    const b = bbox(points);
    return { cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2, ux: 1, uz: 0, hl: Math.max(0.5, (b.x1 - b.x0) / 2), hw: Math.max(0.5, (b.z1 - b.z0) / 2), area: 0 };
  }
  for (let i = 0; i < n; i++) {
    const a = hull[i], b = hull[(i + 1) % n];
    let ux = b[0] - a[0], uz = b[1] - a[1];
    const l = Math.hypot(ux, uz);
    if (l < 1e-6) continue;
    ux /= l; uz /= l;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const q of hull) {
      const u = q[0] * ux + q[1] * uz, v = -q[0] * uz + q[1] * ux;
      if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
    }
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area) best = { area, ux, uz, u0, u1, v0, v1 };
  }
  let { ux, uz, u0, u1, v0, v1 } = best;
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  const cx = cu * ux - cv * uz, cz = cu * uz + cv * ux;
  let hl = (u1 - u0) / 2, hw = (v1 - v0) / 2;
  if (hw > hl) { const t = hl; hl = hw; hw = t; const tx = ux; ux = -uz; uz = tx; }
  return { cx, cz, ux, uz, hl, hw, area: best.area };
}

// ---------- Clipper ----------
const SC = 100;
const toPath = (pts) => pts.map((p) => ({ X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) }));
const fromPath = (path) => path.map((p) => [p.X / SC, p.Y / SC]);

function exPolys(tree) {
  return ClipperLib.JS.PolyTreeToExPolygons(tree).map((e) => ({ outer: fromPath(e.outer), holes: e.holes.map(fromPath), _o: e.outer, _h: e.holes }));
}

// Décalage (delta>0 dilate, <0 érode). Renvoie [{outer, holes}].
export function offsetEx(polys, delta, round = false) {
  const co = new ClipperLib.ClipperOffset(3, 0.2 * SC);
  for (const p of polys) {
    if (p.outer) { co.AddPath(toPath(p.outer), round ? ClipperLib.JoinType.jtRound : ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon); for (const h of p.holes || []) co.AddPath(toPath(h), round ? ClipperLib.JoinType.jtRound : ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon); }
    else co.AddPath(toPath(p), round ? ClipperLib.JoinType.jtRound : ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  }
  const tree = new ClipperLib.PolyTree();
  co.Execute(tree, delta * SC);
  return exPolys(tree);
}

function addAll(c, polys, type) {
  for (const p of polys) {
    if (p.outer) { c.AddPath(toPath(p.outer), type, true); for (const h of p.holes || []) c.AddPath(toPath(h), type, true); }
    else if (p.length >= 3) c.AddPath(toPath(p), type, true);
  }
}

function boolOp(subj, clip, op, fill = ClipperLib.PolyFillType.pftEvenOdd) {
  const c = new ClipperLib.Clipper();
  addAll(c, subj, ClipperLib.PolyType.ptSubject);
  addAll(c, clip, ClipperLib.PolyType.ptClip);
  const tree = new ClipperLib.PolyTree();
  c.Execute(op, tree, fill, fill);
  return exPolys(tree);
}
export const difference = (a, b) => boolOp(a, b, ClipperLib.ClipType.ctDifference, ClipperLib.PolyFillType.pftNonZero);
export const intersection = (a, b) => boolOp(a, b, ClipperLib.ClipType.ctIntersection, ClipperLib.PolyFillType.pftNonZero);
export const union = (a) => boolOp(a, [], ClipperLib.ClipType.ctUnion, ClipperLib.PolyFillType.pftNonZero);

// Nettoie un polygone (auto-intersections, sens) → liste de {outer, holes} en sens positif.
export function cleanPoly(pts) {
  if (pts.length < 3) return [];
  return boolOp([pts], [], ClipperLib.ClipType.ctUnion, ClipperLib.PolyFillType.pftNonZero);
}

// Bande épaisse le long d'une polyligne ouverte.
export function strokeEx(pts, halfWidth, round = false) {
  const co = new ClipperLib.ClipperOffset(3, 0.2 * SC);
  co.AddPath(toPath(pts), round ? ClipperLib.JoinType.jtRound : ClipperLib.JoinType.jtMiter, round ? ClipperLib.EndType.etOpenRound : ClipperLib.EndType.etOpenButt);
  const tree = new ClipperLib.PolyTree();
  co.Execute(tree, halfWidth * SC);
  return exPolys(tree);
}

export function exArea(e) { let a = Math.abs(polyArea(e.outer)); for (const h of e.holes) a -= Math.abs(polyArea(h)); return a; }
export function pointInEx(x, z, e) { if (!pointInPoly(x, z, e.outer)) return false; for (const h of e.holes) if (pointInPoly(x, z, h)) return false; return true; }

// Simplifie une polyligne fermée en supprimant les sommets quasi alignés et les arêtes minuscules.
export function simplifyRing(pts, minEdge = 0.6, minTurn = 0.035) {
  let p = pts.slice();
  let changed = true, guard = 0;
  while (changed && p.length > 3 && guard++ < 8) {
    changed = false;
    const out = [];
    const n = p.length;
    for (let i = 0; i < n; i++) {
      const a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n];
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (l1 < minEdge && out.length) { changed = true; continue; }
      const cr = Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) / ((l1 * l2) || 1);
      if (cr < minTurn && ((b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1])) > 0) { changed = true; continue; }
      out.push(b);
    }
    if (out.length >= 3) p = out; else break;
  }
  return p;
}

// Douglas-Peucker sur un anneau fermé.
export function dpRing(pts, tol) {
  const n = pts.length; if (n < 5) return pts.slice();
  let far = 0, fd = -1;
  for (let i = 1; i < n; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const dp = (seg) => {
    const keep = new Uint8Array(seg.length); keep[0] = keep[seg.length - 1] = 1;
    const st = [[0, seg.length - 1]];
    while (st.length) {
      const [a, b] = st.pop(); let dm = 0, im = -1;
      for (let i = a + 1; i < b; i++) { const d = distSeg(seg[i][0], seg[i][1], seg[a][0], seg[a][1], seg[b][0], seg[b][1]); if (d > dm) { dm = d; im = i; } }
      if (dm > tol) { keep[im] = 1; st.push([a, im], [im, b]); }
    }
    return seg.filter((_, i) => keep[i]);
  };
  const A = dp(pts.slice(0, far + 1)), Bq = dp(pts.slice(far).concat([pts[0]]));
  const out = A.slice(0, -1).concat(Bq.slice(0, -1));
  return out.length >= 3 ? out : pts.slice();
}
