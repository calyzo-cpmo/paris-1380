// Habitants : personnages articulés instanciés. Foule mobile entretenue autour de la caméra,
// figurants fixes, cavaliers, charrettes, bêtes. Deux niveaux de détail : silhouettes simples au loin,
// corps modelés, visages peints et costumes de 1380 à moins d'une centaine de mètres.
import * as THREE from 'three';
import { LU } from './raster.js';
import { mulberry32, clamp } from './geom.js';
import { makeFigureAtlas, ATLAS } from './figures.js';

const lin = (v) => Math.pow(v / 255, 2.2);
const C = (r, g, b) => [lin(r), lin(g), lin(b)];
const SKIN = C(214, 170, 138), HOSE = C(72, 60, 52), WOODC = C(112, 86, 60), HORSE = C(104, 70, 44), DARKC = C(40, 34, 32), HAIRC = C(70, 50, 34), SHOE = C(52, 40, 32);
const W = [1, 1, 1], L0 = [0, 0, 0];

// Constructeur de maillage. Chaque sommet porte un « membre » [balancement, hauteur du pivot, part de teinte],
// des coordonnées d'atlas et un genre : 0 couleur unie, 1 vêtement, 2 visage, -1 accessoire réservé aux sergents.
export class Mesh3 {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.lim = []; this.uv = []; this.knd = []; }
  vert(p, n, col, lim, uv, kind) { this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]); this.col.push(col[0], col[1], col[2]); this.lim.push(lim[0], lim[1], lim[2]); this.uv.push(uv ? uv[0] : 0, uv ? uv[1] : 0); this.knd.push(kind || 0); }
  tri(a, b, c, col, lim, kind = 0) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; const n = [nx / l, ny / l, nz / l];
    this.vert(a, n, col, lim, null, kind); this.vert(b, n, col, lim, null, kind); this.vert(c, n, col, lim, null, kind);
  }
  quad(a, b, c, d, col, lim, kind = 0) { this.tri(a, b, c, col, lim, kind); this.tri(a, c, d, col, lim, kind); }
  // boîte effilée : base (demi-tailles bx, bz) à y0, sommet (tx, tz) à y1 ; caps : 1 dessus, 2 dessous
  box(x, y0, y1, z, bx, bz, tx, tz, col, lim = L0, caps = 3, kind = 0) {
    const p = [[x - bx, y0, z - bz], [x + bx, y0, z - bz], [x + bx, y0, z + bz], [x - bx, y0, z + bz], [x - tx, y1, z - tz], [x + tx, y1, z - tz], [x + tx, y1, z + tz], [x - tx, y1, z + tz]];
    this.quad(p[1], p[0], p[4], p[5], col, lim, kind); this.quad(p[3], p[2], p[6], p[7], col, lim, kind);
    this.quad(p[2], p[1], p[5], p[6], col, lim, kind); this.quad(p[0], p[3], p[7], p[4], col, lim, kind);
    if (caps & 1) this.quad(p[4], p[7], p[6], p[5], col, lim, kind);
    if (caps & 2) this.quad(p[0], p[1], p[2], p[3], col, lim, kind);
  }
  wheel(x, y, z, r, w, col, n = 8) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 6.2832, a1 = ((i + 1) / n) * 6.2832, y0 = y + Math.cos(a0) * r, z0 = z + Math.sin(a0) * r, y1 = y + Math.cos(a1) * r, z1 = z + Math.sin(a1) * r;
      this.quad([x - w, y0, z0], [x + w, y0, z0], [x + w, y1, z1], [x - w, y1, z1], col, L0);
      this.tri([x + w, y, z], [x + w, y1, z1], [x + w, y0, z0], col, L0); this.tri([x - w, y, z], [x - w, y0, z0], [x - w, y1, z1], col, L0);
    }
  }
  // Tube à sections elliptiques : anneaux {c, u, v} (point = c + u·cos θ + v·sin θ), ombrage lissé.
  // o : col, lim, a0/a1 (arc), uv(i, t) → [u, v], kind (nombre ou fonction (i, j) → genre), col2(i, j) couleur par facette, caps (1 fin, 2 début).
  tube(rings, seg, o = {}) {
    const a0 = o.a0 ?? -Math.PI, a1 = o.a1 ?? Math.PI, col = o.col || W, lim = o.lim || L0;
    const P = [], N = [];
    for (const g of rings) {
      const ps = [], ns = [], lu = g.u[0] * g.u[0] + g.u[1] * g.u[1] + g.u[2] * g.u[2] || 1, lv = g.v[0] * g.v[0] + g.v[1] * g.v[1] + g.v[2] * g.v[2] || 1;
      for (let j = 0; j <= seg; j++) {
        const t = a0 + ((a1 - a0) * j) / seg, cs = Math.cos(t), sn = Math.sin(t);
        ps.push([g.c[0] + g.u[0] * cs + g.v[0] * sn, g.c[1] + g.u[1] * cs + g.v[1] * sn, g.c[2] + g.u[2] * cs + g.v[2] * sn]);
        let nx = (g.u[0] * cs) / lu + (g.v[0] * sn) / lv, ny = (g.u[1] * cs) / lu + (g.v[1] * sn) / lv, nz = (g.u[2] * cs) / lu + (g.v[2] * sn) / lv; const l = Math.hypot(nx, ny, nz) || 1;
        ns.push([nx / l, ny / l, nz / l]);
      }
      P.push(ps); N.push(ns);
    }
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < seg; j++) {
      const a = P[i][j], b = P[i][j + 1], c = P[i + 1][j + 1], d = P[i + 1][j], na = N[i][j], nb = N[i][j + 1], nc = N[i + 1][j + 1], nd = N[i + 1][j];
      const k = typeof o.kind === 'function' ? o.kind(i, j) : o.kind || 0, cc = o.col2 ? o.col2(i, j) : col;
      const ua = o.uv && k > 0 ? o.uv(i, j / seg, j) : null, ub = o.uv && k > 0 ? o.uv(i, (j + 1) / seg, j + 1) : null, uc = o.uv && k > 0 ? o.uv(i + 1, (j + 1) / seg, j + 1) : null, ud = o.uv && k > 0 ? o.uv(i + 1, j / seg, j) : null;
      // sens de parcours : la face doit regarder vers l'extérieur
      const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2], fx = d[0] - a[0], fy = d[1] - a[1], fz = d[2] - a[2];
      const out = (ey * fz - ez * fy) * (na[0] + nc[0]) + (ez * fx - ex * fz) * (na[1] + nc[1]) + (ex * fy - ey * fx) * (na[2] + nc[2]) >= 0;
      if (out) { this.vert(a, na, cc, lim, ua, k); this.vert(b, nb, cc, lim, ub, k); this.vert(c, nc, cc, lim, uc, k); this.vert(a, na, cc, lim, ua, k); this.vert(c, nc, cc, lim, uc, k); this.vert(d, nd, cc, lim, ud, k); }
      else { this.vert(a, na, cc, lim, ua, k); this.vert(c, nc, cc, lim, uc, k); this.vert(b, nb, cc, lim, ub, k); this.vert(a, na, cc, lim, ua, k); this.vert(d, nd, cc, lim, ud, k); this.vert(c, nc, cc, lim, uc, k); }
    }
    const capAt = (idx, sign) => {
      const g = rings[idx], ps = P[idx], ax = [g.u[1] * g.v[2] - g.u[2] * g.v[1], g.u[2] * g.v[0] - g.u[0] * g.v[2], g.u[0] * g.v[1] - g.u[1] * g.v[0]], l = Math.hypot(ax[0], ax[1], ax[2]) || 1, n = [(ax[0] / l) * sign, (ax[1] / l) * sign, (ax[2] / l) * sign];
      // bouchon : couleur propre si capCol est donné, sinon même étoffe que le tube
      const k = o.capCol || typeof o.kind !== 'number' ? 0 : o.kind, cc = o.capCol || col, cl = o.capCol ? L0 : lim, uv = k > 0 && o.uv ? o.uv(idx, 0.5, 0) : null;
      for (let j = 0; j < seg; j++) { const a = ps[j], b = ps[j + 1]; this.vert(g.c, n, cc, cl, uv, k); this.vert(sign > 0 ? a : b, n, cc, cl, uv, k); this.vert(sign > 0 ? b : a, n, cc, cl, uv, k); }
    };
    if ((o.caps || 0) & 1) capAt(rings.length - 1, 1);
    if ((o.caps || 0) & 2) capAt(0, -1);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); g.setAttribute('aLimb', new THREE.Float32BufferAttribute(this.lim, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('aKind', new THREE.Float32BufferAttribute(this.knd, 1));
    g.computeBoundingSphere();
    return g;
  }
}

// anneau horizontal (tour de taille) : face avant en θ = 0
const ringY = (y, rx, rz, ox = 0, oz = 0) => ({ c: [ox, y, oz], u: [0, 0, rz], v: [rx, 0, 0] });
// coordonnées d'atlas (tuile de la variante 0 ; le shader décale selon le personnage)
const A = ATLAS, TW = A.TW;
const uu = (t) => (0.008 + 0.984 * t) * TW;      // léger retrait : pas de débord sur la tuile voisine à la couture du dos
const vGarm = (f) => 1 - (576 + 480 * f) / 2048, vHead = (f) => 1 - (512 + 64 * f) / 2048, vHose = (f) => 1 - (1056 + 96 * f) / 2048, vFace = (f) => 0.875 + 0.125 * f;

// ---------------------------------------------------------------- silhouettes simples (vues de loin)
function manGeo() {
  const m = new Mesh3();
  for (const s of [-1, 1]) m.box(s * 0.085, 0, 0.88, 0, 0.062, 0.085, 0.078, 0.088, HOSE, [s, 0.88, 0.25], 2);
  m.box(0, 0.56, 1.0, 0, 0.2, 0.14, 0.17, 0.115, W, [0, 0, 1], 2);
  m.box(0, 1.0, 1.44, 0, 0.17, 0.115, 0.215, 0.125, W, [0, 0, 1], 1);
  m.box(0, 0.98, 1.04, 0, 0.18, 0.125, 0.18, 0.125, DARKC, L0, 0);
  for (const s of [-1, 1]) { m.box(s * 0.265, 0.86, 1.43, 0, 0.045, 0.05, 0.056, 0.062, [0.9, 0.9, 0.9], [-s * 0.7, 1.4, 1], 0); m.box(s * 0.265, 0.77, 0.86, 0, 0.04, 0.045, 0.042, 0.047, SKIN, [-s * 0.7, 1.4, 0], 2); }
  m.box(0, 1.44, 1.72, 0.012, 0.075, 0.088, 0.082, 0.092, SKIN, L0, 0);
  m.box(0, 1.63, 1.77, -0.012, 0.098, 0.108, 0.07, 0.078, [0.62, 0.62, 0.62], [0, 0, 0.75], 1);
  m.box(0, 1.42, 1.66, -0.075, 0.094, 0.045, 0.098, 0.05, [0.62, 0.62, 0.62], [0, 0, 0.75], 0);
  return m.geometry();
}
function robeGeo() {
  const m = new Mesh3();
  m.box(0, 0.02, 1.0, 0, 0.27, 0.23, 0.165, 0.115, W, [0.1, 1.0, 1], 0);
  m.box(0, 1.0, 1.44, 0, 0.165, 0.115, 0.2, 0.12, W, [0, 0, 1], 1);
  for (const s of [-1, 1]) { m.box(s * 0.25, 0.9, 1.43, 0, 0.06, 0.065, 0.058, 0.062, [0.92, 0.92, 0.92], [-s * 0.35, 1.4, 1], 0); m.box(s * 0.25, 0.82, 0.9, 0, 0.038, 0.042, 0.04, 0.045, SKIN, [-s * 0.35, 1.4, 0], 2); }
  m.box(0, 1.44, 1.7, 0.012, 0.072, 0.085, 0.08, 0.09, SKIN, L0, 0);
  m.box(0, 1.6, 1.75, -0.01, 0.1, 0.108, 0.075, 0.08, [0.95, 0.95, 0.95], [0, 0, 0.55], 1);
  m.box(0, 1.36, 1.64, -0.07, 0.11, 0.05, 0.1, 0.05, [0.95, 0.95, 0.95], [0, 0, 0.55], 0);
  return m.geometry();
}
function horseParts(m, zo, tintCoat) {
  const col = tintCoat ? W : HORSE, t = tintCoat ? 1 : 0;
  m.box(0, 0.95, 1.52, zo, 0.25, 0.74, 0.23, 0.7, col, [0, 0, t], 3);
  m.box(0, 1.3, 1.98, zo + 0.74, 0.1, 0.17, 0.085, 0.12, col, [0, 0, t], 0);
  m.box(0, 1.74, 2.0, zo + 0.98, 0.085, 0.2, 0.075, 0.17, col, [0, 0, t], 3);
  m.box(0, 0.9, 1.45, zo - 0.78, 0.04, 0.04, 0.05, 0.05, DARKC, L0, 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.box(sx * 0.16, 0, 0.98, zo + sz * 0.55, 0.05, 0.055, 0.07, 0.08, col, [sx * sz * 0.8, 0.98, t * 0.8], 2);
}
function beastGeo() { const m = new Mesh3(); horseParts(m, 0, true); return m.geometry(); }
function riderGeo() {
  const m = new Mesh3(); horseParts(m, 0, false);
  m.box(0, 1.5, 2.06, -0.05, 0.19, 0.12, 0.22, 0.13, W, [0, 0, 1], 1);
  for (const s of [-1, 1]) m.box(s * 0.27, 1.02, 1.56, 0.06, 0.07, 0.09, 0.08, 0.1, HOSE, [0, 0, 0.3], 2);
  m.box(0, 2.06, 2.32, -0.04, 0.075, 0.088, 0.082, 0.092, SKIN, L0, 0);
  m.box(0, 2.24, 2.38, -0.05, 0.1, 0.108, 0.07, 0.078, [0.6, 0.6, 0.6], [0, 0, 0.7], 1);
  return m.geometry();
}
function cartBody(m, n = 8) {
  m.box(0, 0.78, 1.3, -0.5, 0.72, 1.35, 0.78, 1.4, WOODC, L0, 2);
  m.box(0, 1.3, 1.95, -0.6, 0.62, 1.15, 0.4, 0.85, W, [0, 0, 1], 1);                    // chargement
  for (const s of [-1, 1]) { m.wheel(s * 0.86, 0.6, -0.5, 0.6, 0.05, C(70, 54, 40), n); m.box(s * 0.36, 1.0, 1.08, 1.3, 0.03, 0.9, 0.03, 0.9, WOODC, L0, 3); }
}
function cartGeo() {
  const m = new Mesh3(); horseParts(m, 2.3, false); cartBody(m);
  m.box(0, 1.3, 1.86, 0.62, 0.17, 0.11, 0.2, 0.12, C(110, 92, 70), L0, 1);
  m.box(0, 1.86, 2.1, 0.63, 0.075, 0.085, 0.08, 0.09, SKIN, L0, 3);
  return m.geometry();
}
function sheepGeo() {
  const m = new Mesh3();
  m.box(0, 0.36, 0.78, 0, 0.17, 0.36, 0.16, 0.33, W, [0, 0, 1], 3);
  m.box(0, 0.52, 0.8, 0.43, 0.07, 0.1, 0.062, 0.088, [0.5, 0.5, 0.5], [0, 0, 0.6], 3);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.box(sx * 0.1, 0, 0.4, sz * 0.24, 0.03, 0.03, 0.036, 0.036, DARKC, [sx * sz * 0.6, 0.4, 0], 2);
  return m.geometry();
}

// ---------------------------------------------------------------- corps modelés (vus de près)
// Buste, bras, cou, tête au visage peint et coiffure. o : dy/dz (décalage), robe (carrure féminine), still (bras immobiles), veil.
function upperBody(m, o = {}) {
  const dy = o.dy || 0, dz = o.dz || 0, w = o.robe ? 0.9 : 1, wy = o.robe ? 1.04 : 1.02, gl = o.robe ? 1.41 : 0.88;
  const gf = (y) => vGarm((1.44 - y) / gl);
  const Y = (y, rx, rz, ox = 0, oz = 0) => ringY(y + dy, rx, rz, ox, oz + dz);
  // buste
  const tr = [[wy, 0.165 * w, 0.112], [1.26, 0.2 * w, 0.126], [1.4, 0.205 * w, 0.112], [1.455, 0.075, 0.07]];
  m.tube(tr.map((q) => Y(q[0], q[1], q[2])), 10, { lim: [0, 0, 1], kind: 1, uv: (i, t) => [uu(t), gf(tr[i][0])] });
  // bras : épaule, coude, poignet légèrement porté en avant
  for (const s of [-1, 1]) {
    const sw = o.still ? 0 : -s * (o.robe ? 0.35 : 0.7), ar = [[1.41, 0.056, 0.235 * w, 0], [1.13, 0.048, 0.262 * w, 0.01], [0.87, o.wide ? 0.07 : 0.04, 0.268 * w, 0.05]];
    m.tube(ar.map((q) => Y(q[0], q[1], q[1], s * q[2], q[3])).reverse(), 6, { lim: [sw, 1.4 + dy, 1], kind: 1, uv: (i, t) => [(s > 0 ? 0.985 - t * 0.09 : 0.015 + t * 0.09) * TW, gf(1.44 - (1.44 - ar[2 - i][0]) * 0.55)] });
    m.box(s * 0.268 * w, 0.775 + dy, 0.87 + dy, 0.055 + dz, 0.03, 0.036, 0.034, 0.04, SKIN, [sw, 1.4 + dy, 0], 2);
  }
  // cou et tête
  m.tube([Y(1.43, 0.046, 0.05, 0, 0.006), Y(1.5, 0.044, 0.048, 0, 0.008)], 6, { col: SKIN });
  const hr = [[1.455, 0.04, 0.05, 0.014], [1.5, 0.066, 0.078, 0.009], [1.56, 0.08, 0.09, 0.005], [1.63, 0.084, 0.096, 0], [1.7, 0.078, 0.09, 0], [1.748, 0.048, 0.058, 0]];
  m.tube(hr.map((q) => Y(q[0], q[1], q[2], 0, q[3])), 12, { col: W, col2: (i, j) => (j >= 3 && j < 9 ? W : HAIRC), kind: (i, j) => (j >= 3 && j < 9 ? 2 : 0), uv: (i, t, j) => [((j - 3) / 6) * TW, vFace(Math.max(0, (hr[i][0] - 1.5) / 0.248))], caps: 1, capCol: HAIRC });
  // nez : petit coin en relief, peint avec la peau du visage
  const fu = (tx, ty) => [tx * TW, vFace(1 - ty)], nz0 = 0.093 + dz, nt = [0, 1.636 + dy, nz0 + 0.003], nl = [-0.015, 1.588 + dy, nz0 + 0.001], nr = [0.015, 1.588 + dy, nz0 + 0.001], np = [0, 1.596 + dy, nz0 + 0.027];
  const ut = fu(0.5, 0.5), ul = fu(0.485, 0.6), ur = fu(0.535, 0.6), up = fu(0.505, 0.6);
  m.vert(nt, [-0.5, 0.2, 0.84], W, L0, ut, 2); m.vert(nl, [-0.7, 0, 0.7], W, L0, ul, 2); m.vert(np, [0, 0, 1], W, L0, up, 2);
  m.vert(nt, [0.5, 0.2, 0.84], W, L0, ut, 2); m.vert(np, [0, 0, 1], W, L0, up, 2); m.vert(nr, [0.7, 0, 0.7], W, L0, ur, 2);
  m.vert(nl, [0, -0.7, 0.7], [0.72, 0.72, 0.72], L0, ul, 2); m.vert(nr, [0, -0.7, 0.7], [0.72, 0.72, 0.72], L0, ur, 2); m.vert(np, [0, -0.7, 0.7], [0.72, 0.72, 0.72], L0, up, 2);
  // coiffure : collet sur les épaules, capuchon ouvert sur le visage, bandeau frontal
  const hu = (f) => (i, t) => [uu(t), vHead(f[i])];
  const cp = o.robe ? [[1.35, 0.175, 0.13], [1.44, 0.115, 0.102], [1.5, 0.098, 0.102]] : [[1.34, 0.235, 0.158], [1.44, 0.125, 0.108], [1.5, 0.096, 0.102]];
  m.tube(cp.map((q) => Y(q[0], q[1], q[2])), 10, { lim: [0, 0, 1], kind: 1, uv: hu([1, 0.75, 0.6]) });
  const sh = [[1.5, 0.098, 0.106], [1.6, 0.106, 0.116], [1.7, 0.1, 0.113], [1.778, 0.06, 0.07]];
  m.tube(sh.map((q) => Y(q[0], q[1], q[2], 0, -0.004)), 9, { a0: 0.8, a1: 2 * Math.PI - 0.8, lim: [0, 0, 1], kind: 1, uv: hu([0.6, 0.4, 0.2, 0.02]), caps: 1 });
  m.tube([Y(1.69, 0.1, 0.113, 0, -0.004), Y(1.778, 0.06, 0.07, 0, -0.004)], 4, { a0: -0.8, a1: 0.8, lim: [0, 0, 1], kind: 1, uv: hu([0.2, 0.02]) });
  if (o.robe) m.tube([Y(1.2, 0.17, 0.05, 0, -0.1), Y(1.5, 0.11, 0.05, 0, -0.085)], 4, { a0: 1.75, a1: 4.53, lim: [0, 0, 1], kind: 1, uv: hu([1, 0.6]) });    // voile retombant dans le dos
  else m.box(0, 1.22 + dy, 1.56 + dy, -0.125 + dz, 0.026, 0.022, 0.05, 0.036, W, [0, 0, 1], 2, 0);             // cornette du chaperon
}
function manHi() {
  const m = new Mesh3();
  for (const s of [-1, 1]) {
    const lg = [[0.9, 0.086, 0.092], [0.48, 0.058, 0.064], [0.07, 0.044, 0.05]];
    m.tube(lg.map((q) => ringY(q[0], q[1], q[2], s * 0.092, 0)).reverse(), 6, { lim: [s, 0.9, 1], kind: 1, uv: (i, t) => [((s > 0 ? 0.5 : 0) + 0.06 + 0.38 * t) * TW, vHose(1 - lg[2 - i][0] / 0.9)] });
    m.box(s * 0.092, 0, 0.085, 0.045, 0.05, 0.12, 0.04, 0.07, SHOE, [s, 0.9, 0], 3);                     // soulier pointu
    m.box(s * 0.092, 0, 0.05, 0.19, 0.03, 0.05, 0.012, 0.012, SHOE, [s, 0.9, 0], 1);
  }
  const sk = [[0.56, 0.218, 0.162], [0.92, 0.186, 0.132], [1.02, 0.165, 0.112]];
  m.tube(sk.map((q) => ringY(q[0], q[1], q[2])), 10, { lim: [0, 0, 1], kind: 1, uv: (i, t) => [uu(t), vGarm((1.44 - sk[i][0]) / 0.88)], caps: 2, capCol: DARKC });
  upperBody(m);
  m.box(-0.3, 0, 2.35, 0.1, 0.014, 0.014, 0.012, 0.012, C(96, 78, 58), L0, 0, -1);                       // hampe (sergents)
  m.box(-0.3, 2.35, 2.62, 0.1, 0.028, 0.008, 0.002, 0.004, C(170, 174, 180), L0, 0, -1);                 // fer de lance
  return m.geometry();
}
function robeHi() {
  const m = new Mesh3();
  const sk = [[0.03, 0.3, 0.27], [0.5, 0.245, 0.21], [0.9, 0.186, 0.14], [1.04, 0.15, 0.108]];
  m.tube(sk.map((q) => ringY(q[0], q[1], q[2])), 10, { lim: [0.1, 1.0, 1], kind: 1, uv: (i, t) => [uu(t), vGarm((1.44 - sk[i][0]) / 1.41)] });
  upperBody(m, { robe: true, wide: true });
  return m.geometry();
}
function horseHi(m, zo) {
  const bay = HORSE, dk = DARKC;
  const body = [[-0.8, 1.22, 0.1, 0.13], [-0.62, 1.27, 0.235, 0.27], [-0.1, 1.2, 0.275, 0.29], [0.45, 1.25, 0.25, 0.3], [0.72, 1.31, 0.15, 0.22]];
  m.tube(body.map((q) => ({ c: [0, q[1], zo + q[0]], u: [q[2], 0, 0], v: [0, q[3], 0] })), 8, { col: bay, caps: 3 });
  const dirTube = (p0, p1, radii, seg, o) => {
    const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], l = Math.hypot(d[0], d[1], d[2]); d[0] /= l; d[1] /= l; d[2] /= l;
    m.tube(radii.map((q, i) => { const t = i / (radii.length - 1); return { c: [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, p0[2] + (p1[2] - p0[2]) * t], u: [q[0], 0, 0], v: [0, d[2] * q[1], -d[1] * q[1]] }; }), seg, o);
  };
  dirTube([0, 1.34, zo + 0.6], [0, 1.92, zo + 0.98], [[0.15, 0.21], [0.1, 0.15], [0.085, 0.12]], 6, { col: bay });
  dirTube([0, 1.95, zo + 0.95], [0, 1.6, zo + 1.42], [[0.085, 0.12], [0.075, 0.1], [0.05, 0.055]], 6, { col: bay, caps: 3 });
  for (const s of [-1, 1]) m.box(s * 0.05, 1.98, 2.1, zo + 0.93, 0.02, 0.025, 0.006, 0.01, bay, L0, 0);          // oreilles
  m.box(0, 1.42, 2.0, zo + 0.74, 0.02, 0.06, 0.02, 0.13, dk, L0, 1);                                              // crinière
  m.box(0, 0.5, 1.32, zo - 0.86, 0.03, 0.03, 0.06, 0.05, dk, L0, 2);                                             // queue
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const lg = [[1.04, 0.08], [0.56, 0.05], [0.13, 0.038], [0, 0.052]], lim = [sx * sz * 0.8, 1.0, 0];
    m.tube(lg.map((q) => ringY(q[0], q[1], q[1] * 1.15, sx * 0.15, zo + sz * 0.52)).reverse(), 6, { lim, col2: (i) => (i === 0 ? dk : i === 1 ? C(60, 44, 32) : bay) });
  }
}
function riderHi() {
  const m = new Mesh3(); horseHi(m, 0);
  m.box(0, 1.47, 1.56, -0.05, 0.2, 0.3, 0.18, 0.26, C(80, 56, 38), L0, 1);                                        // selle
  upperBody(m, { dy: 0.52, dz: -0.05, still: true });
  for (const s of [-1, 1]) m.box(s * 0.27, 1.0, 1.58, 0.06, 0.06, 0.085, 0.085, 0.1, W, [0, 0, 1], 2, 0);
  return m.geometry();
}
function cartHi() {
  const m = new Mesh3(); horseHi(m, 2.3); cartBody(m, 12);
  upperBody(m, { dy: 0.36, dz: 0.62, still: true });
  return m.geometry();
}

// ---------------------------------------------------------------- matériau commun
// Balancement des membres dans le vertex shader ; teinte d'instance limitée à l'étoffe par le masque de l'atlas.
function peopleMaterial(map) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, map });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aLimb;\nattribute vec2 aAnim;\nattribute float aKind;\nattribute vec4 aVar;\nvarying float vKind;\nvarying vec3 vTint;\nvarying float vTintW;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vKind = aKind;
        #ifdef USE_MAP
          if (aKind > 1.5) vMapUv += vec2(aVar.z * ${A.TW.toFixed(5)}, -aVar.w * ${A.FACE_H.toFixed(5)});
          else if (aKind > 0.5) vMapUv += vec2(aVar.x * ${A.TW.toFixed(5)}, -aVar.y * ${A.GARM_H.toFixed(5)});
        #endif`)
      .replace('#include <color_vertex>', 'vColor = color;\nvTintW = aLimb.z;\n#ifdef USE_INSTANCING_COLOR\n vTint = instanceColor.xyz;\n#else\n vTint = vec3(1.0);\n#endif')
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
        float swg = sin(aAnim.x) * aAnim.y * aLimb.x;
        float cs = cos(swg), sn = sin(swg);
        vec2 dd = transformed.yz - vec2(aLimb.y, 0.0);
        transformed.yz = vec2(aLimb.y, 0.0) + vec2(dd.x * cs - dd.y * sn, dd.x * sn + dd.y * cs);
        transformed.y += abs(sin(aAnim.x)) * 0.022 * aAnim.y;
        if (aKind < -0.5 && abs(aVar.x - 7.0) > 0.5) transformed = vec3(0.0);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vKind;\nvarying vec3 vTint;\nvarying float vTintW;')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
          vec4 tx = texture2D(map, vMapUv);
          float kk = step(0.5, vKind);
          diffuseColor.rgb *= mix(vec3(1.0), tx.rgb, kk) * mix(vec3(1.0), vTint, vTintW * mix(1.0, tx.a, kk));
        #else
          diffuseColor.rgb *= mix(vec3(1.0), vTint, vTintW);
        #endif`);
  };
  mat.customProgramCacheKey = () => 'people-v2';
  return mat;
}

function blobTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d', { willReadFrequently: true }), g = c.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.6, 'rgba(0,0,0,0.4)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}
function blobGeo(hx, hz) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-hx, 0.03, -hz, -hx, 0.03, hz, hx, 0.03, hz, -hx, 0.03, -hz, hx, 0.03, hz, hx, 0.03, -hz], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0], 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  return g;
}

// ---------------------------------------------------------------- garde-robe
const CLOTH = [[120, 96, 70], [140, 118, 90], [96, 84, 70], [160, 140, 110], [110, 100, 92], [86, 70, 56], [132, 108, 84], [150, 128, 96], [52, 70, 120], [70, 98, 140], [140, 44, 38], [170, 76, 52], [64, 98, 60], [92, 112, 60], [178, 140, 60], [96, 60, 100], [206, 198, 180], [44, 42, 44]];
const DRESS = [[150, 60, 52], [70, 96, 142], [86, 118, 72], [186, 150, 70], [128, 78, 120], [200, 190, 170], [132, 104, 78], [104, 92, 84], [170, 110, 80], [48, 60, 104], [214, 208, 196], [98, 84, 70], [120, 60, 44], [160, 120, 130]];
const UNDYED = [[150, 132, 104], [128, 110, 86], [166, 150, 122], [112, 98, 80], [140, 124, 102]];
const RICH = [[150, 30, 34], [34, 52, 126], [36, 96, 60], [104, 40, 110], [160, 110, 30], [24, 24, 30]];
const HABITS = [[36, 34, 36], [222, 216, 202], [104, 88, 70], [92, 90, 88], [70, 54, 44]];
const LOADS = [[196, 176, 110], [150, 120, 90], [120, 100, 80], [200, 190, 170], [110, 84, 60]];
const WOOL = [[226, 220, 204], [210, 202, 184], [236, 230, 216], [92, 80, 70]];
const PIGS = [[196, 150, 136], [150, 118, 100], [96, 76, 60], [70, 58, 50], [176, 160, 140]];
const CATTLE = [[120, 76, 48], [172, 130, 90], [60, 46, 38], [204, 190, 168], [140, 96, 60]];
const pick = (r, a) => a[(r() * a.length) | 0];

// Costume d'un personnage : { col [r,g,b], v [colonne et rangée du vêtement, colonne et rangée du visage] }.
export function outfit(r, kind, role) {
  if (kind === 'man' || kind === 'rider' || kind === 'cart') {
    if (role === 'guard') return { col: [255, 255, 255], lo: [44, 58, 120], v: [7, 0, pick(r, [0, 1, 3, 4, 5]), 0] };
    let g = role === 'worker' ? pick(r, [3, 3, 4, 0]) : role === 'peasant' ? pick(r, [4, 4, 0]) : role === 'merchant' ? pick(r, [0, 1, 3, 6, 5]) : kind === 'rider' ? pick(r, [1, 5, 5, 6, 2]) : kind === 'cart' ? pick(r, [4, 0, 4]) : pick(r, [0, 0, 1, 1, 2, 3, 4, 4, 5, 6, 6]);
    const col = g === 4 ? pick(r, UNDYED) : g === 5 ? pick(r, RICH) : g === 2 ? pick(r, [[150, 30, 34], [34, 52, 126], [36, 96, 60]]) : pick(r, CLOTH);
    return { col, v: [g, 0, (r() * 7) | 0, 0] };
  }
  if (kind === 'robe') {
    if (role === 'monk') return { col: pick(r, HABITS), v: [5, 1, r() < 0.6 ? 7 : pick(r, [0, 2, 3]), 0] };
    const q = role === 'peasant' || role === 'merchant' ? 0.1 : r();
    if (q < 0.7) {
      const g = role === 'peasant' ? pick(r, [0, 1, 1]) : role === 'merchant' ? pick(r, [0, 1, 1, 2]) : pick(r, [0, 0, 1, 1, 2, 3, 4]);
      return { col: g === 3 ? pick(r, RICH) : role === 'peasant' ? pick(r, UNDYED) : pick(r, DRESS), lo: g === 4 ? [44, 42, 46] : null, v: [g, 1, (r() * 8) | 0, 1] };
    }
    if (q < 0.86) { const g = r() < 0.7 ? 5 : 6; return { col: g === 5 ? pick(r, HABITS) : [255, 255, 255], lo: g === 6 ? [206, 200, 188] : null, v: [g, 1, r() < 0.6 ? 7 : pick(r, [0, 2, 3]), 0] }; }
    return { col: pick(r, RICH), v: [7, 1, pick(r, [1, 2, 5, 3]), 0] };
  }
  return { col: pick(r, kind === 'beast' ? CATTLE : kind === 'sheep' ? WOOL : CLOTH), v: [0, 0, 0, 0] };
}

const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const linCol = (p, k = 1) => [lin(Math.min(255, p[0] * k)), lin(Math.min(255, p[1] * k)), lin(Math.min(255, p[2] * k))];

// Maillage instancié prêt à recevoir matrices, couleurs, animation et variantes.
function instanced(geo, mat, n, withVar) {
  const g = geo.clone();
  const anim = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2); anim.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aAnim', anim);
  let vr = null; if (withVar) { vr = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); vr.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aVar', vr); }
  const im = new THREE.InstancedMesh(g, mat, n);
  im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); im.instanceColor.setUsage(THREE.DynamicDrawUsage); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.count = 0;
  return { im, anim, vr };
}
function writeMat(m, k, x, y, z, h, sc) {
  const c = Math.cos(h) * sc, sn = Math.sin(h) * sc;
  m[k] = c; m[k + 1] = 0; m[k + 2] = -sn; m[k + 3] = 0; m[k + 4] = 0; m[k + 5] = sc; m[k + 6] = 0; m[k + 7] = 0; m[k + 8] = sn; m[k + 9] = 0; m[k + 10] = c; m[k + 11] = 0; m[k + 12] = x; m[k + 13] = y; m[k + 14] = z; m[k + 15] = 1;
}

// Un bassin d'agents du même type.
class Pool {
  constructor(sys, kind, n, o) {
    this.sys = sys; this.n = n; this.o = o; this.active = 0; this.kind = kind;
    this.lo = instanced(sys.geos[kind], sys.mat, n, false);
    this.hi = sys.hiGeos[kind] ? instanced(sys.hiGeos[kind], sys.mat, Math.min(n, o.hiCap || 600), true) : null;
    const mkBlob = (src) => { const b = new THREE.InstancedMesh(blobGeo(o.blob[0], o.blob[1]), sys.blobMat, src.im.instanceMatrix.count); b.instanceMatrix = src.im.instanceMatrix; b.frustumCulled = false; b.renderOrder = 1; b.count = 0; return b; };
    this.blobLo = mkBlob(this.lo); this.blobHi = this.hi ? mkBlob(this.hi) : null;
    sys.group.add(this.lo.im, this.blobLo); if (this.hi) sys.group.add(this.hi.im, this.blobHi);
    this.x = new Float32Array(n); this.z = new Float32Array(n); this.y = new Float32Array(n); this.h = new Float32Array(n); this.th = new Float32Array(n);
    this.sp = new Float32Array(n); this.ph = new Float32Array(n); this.st = new Float32Array(n); this.sc = new Float32Array(n); this.jt = new Float32Array(n); this.ok = new Uint8Array(n); this.bias = new Int8Array(n);
    this.col = new Float32Array(n * 3); this.colLo = new Float32Array(n * 3); this.vr = new Float32Array(n * 4);
    const r = sys.r;
    for (let i = 0; i < n; i++) {
      const of = o.palette ? { col: pick(r, o.palette), v: [0, 0, 0, 0] } : outfit(r, kind), k = 0.95 + r() * 0.25, c = linCol(of.col, of.lo ? 1 : k);
      this.col.set(c, i * 3); this.colLo.set(of.lo ? linCol(of.lo, k) : c, i * 3); this.vr.set(of.v, i * 4);
      this.sc[i] = o.scale[0] + r() * (o.scale[1] - o.scale[0]); if (o.kids && r() < o.kids) this.sc[i] *= 0.66;
      this.sp[i] = o.speed[0] + r() * (o.speed[1] - o.speed[0]); this.bias[i] = r() < 0.5 ? 1 : -1; this.ph[i] = r() * 6.28; this.jt[i] = 2 + r() * 6;
    }
  }
  spawn(i, cx, cz, R, far) {
    const s = this.sys, r = s.r;
    for (let t = 0; t < 7; t++) {
      const a = r() * 6.2832, d = R * Math.sqrt(far ? 0.3 + 0.7 * r() : r()), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (!s.nav(x, z) || (this.o.wide && !(s.nav(x + 1.2, z) && s.nav(x - 1.2, z) && s.nav(x, z + 1.2) && s.nav(x, z - 1.2)))) continue;
      const y = s.groundY(x, z); if (y < 0.5) continue;
      this.x[i] = x; this.z[i] = z; this.y[i] = y; this.h[i] = this.th[i] = r() * 6.2832; this.st[i] = r() < this.o.idle ? 3 + r() * 14 : 0; this.ok[i] = 1;
      return;
    }
    this.ok[i] = 0;
  }
  update(dt, cx, cz, R, want, first, cam, hi2) {
    const s = this.sys, r = s.r, o = this.o, n = Math.min(this.n, want);
    const R2 = (R + 40) * (R + 40), probe = o.probe, side = o.side;
    const lo = this.lo, hi = this.hi, lm = lo.im.instanceMatrix.array, la = lo.anim.array, lc = lo.im.instanceColor.array;
    const hm = hi && hi.im.instanceMatrix.array, ha = hi && hi.anim.array, hc = hi && hi.im.instanceColor.array, hv = hi && hi.vr.array, hcap = hi ? hi.im.instanceMatrix.count : 0;
    let kl = 0, kh = 0;
    for (let i = 0; i < n; i++) {
      let x = this.x[i], z = this.z[i];
      const ddx = x - cx, ddz = z - cz;
      if (!this.ok[i] || ddx * ddx + ddz * ddz > R2) { this.spawn(i, cx, cz, R, !first); x = this.x[i]; z = this.z[i]; }
      if (!this.ok[i]) continue;
      let amp = 0;
      if (this.st[i] > 0) { this.st[i] -= dt; }
      else {
        let h = this.h[i];
        const fx = Math.sin(h), fz = Math.cos(h);
        let free = s.nav(x + fx * probe, z + fz * probe) && s.nav(x + fx * probe * 0.5, z + fz * probe * 0.5);
        if (free && o.wide) free = s.nav(x + fx * probe + fz * 1.1, z + fz * probe - fx * 1.1) && s.nav(x + fx * probe - fz * 1.1, z + fz * probe + fx * 1.1);
        if (!free) {
          let found = false;
          for (const c of [0.55, -0.55, 1.1, -1.1, 1.7, -1.7, 2.4, -2.4]) {
            const a = this.th[i] + c * this.bias[i], ax = Math.sin(a), az = Math.cos(a);
            if (s.nav(x + ax * probe, z + az * probe) && s.nav(x + ax * probe * 0.5, z + az * probe * 0.5)) { this.th[i] = a; found = true; break; }
          }
          if (!found) { this.th[i] = h + Math.PI; this.bias[i] = -this.bias[i]; }
        } else {
          const l = s.nav(x + Math.sin(h + 0.9) * side, z + Math.cos(h + 0.9) * side), rr = s.nav(x + Math.sin(h - 0.9) * side, z + Math.cos(h - 0.9) * side);
          if (!l && rr) this.th[i] -= 1.8 * dt; else if (!rr && l) this.th[i] += 1.8 * dt;
          this.jt[i] -= dt;
          if (this.jt[i] <= 0) {                           // à un carrefour : parfois on tourne, parfois on s'arrête
            this.jt[i] = 3 + r() * 7;
            const q = r();
            if (q < 0.1 && o.idle > 0) this.st[i] = 2 + r() * 10;
            else if (q < 0.55) { const a = h + (r() < 0.5 ? 1.5708 : -1.5708), ax = Math.sin(a), az = Math.cos(a); if (s.nav(x + ax * 3, z + az * 3) && s.nav(x + ax * 7, z + az * 7)) this.th[i] = a; }
          }
        }
        const d = angDiff(this.th[i], h), turn = (o.turn || 3.2) * dt;
        h += clamp(d, -turn, turn); this.h[i] = h;
        const v = this.sp[i] * (Math.abs(d) > 1 ? 0.35 : 1), nx = x + Math.sin(h) * v * dt, nz = z + Math.cos(h) * v * dt;
        if (s.nav(nx, nz)) { x = nx; z = nz; this.x[i] = x; this.z[i] = z; this.ph[i] += v * dt * o.stride; amp = o.amp; }
      }
      const gy = s.groundY(x, z);
      this.y[i] += (gy - this.y[i]) * Math.min(1, dt * 9 + (first ? 1 : 0));
      // près de la caméra : corps modelé ; sinon silhouette simple
      const ex = x - cam.x, ey = this.y[i] - cam.y, ez = z - cam.z;
      if (hi && kh < hcap && ex * ex + ey * ey + ez * ez < hi2) {
        writeMat(hm, kh * 16, x, this.y[i], z, this.h[i], this.sc[i]); ha[kh * 2] = this.ph[i]; ha[kh * 2 + 1] = amp;
        hc[kh * 3] = this.col[i * 3]; hc[kh * 3 + 1] = this.col[i * 3 + 1]; hc[kh * 3 + 2] = this.col[i * 3 + 2];
        hv[kh * 4] = this.vr[i * 4]; hv[kh * 4 + 1] = this.vr[i * 4 + 1]; hv[kh * 4 + 2] = this.vr[i * 4 + 2]; hv[kh * 4 + 3] = this.vr[i * 4 + 3]; kh++;
      } else {
        writeMat(lm, kl * 16, x, this.y[i], z, this.h[i], this.sc[i]); la[kl * 2] = this.ph[i]; la[kl * 2 + 1] = amp;
        lc[kl * 3] = this.colLo[i * 3]; lc[kl * 3 + 1] = this.colLo[i * 3 + 1]; lc[kl * 3 + 2] = this.colLo[i * 3 + 2]; kl++;
      }
    }
    lo.im.count = kl; this.blobLo.count = kl; lo.im.instanceMatrix.needsUpdate = true; lo.anim.needsUpdate = true; lo.im.instanceColor.needsUpdate = true;
    if (hi) { hi.im.count = kh; this.blobHi.count = kh; hi.im.instanceMatrix.needsUpdate = true; hi.anim.needsUpdate = true; hi.im.instanceColor.needsUpdate = true; hi.vr.needsUpdate = true; }
    this.active = n; this.near = kh;
  }
}

// Figurants fixes d'un même type : tous en silhouette simple, ceux proches de la caméra remplacés par le corps modelé.
class Statics {
  constructor(sys, kind, items) {
    this.sys = sys; this.kind = kind; this.items = items; const n = items.length, r = sys.r;
    this.lo = instanced(sys.geos[kind], sys.mat, n, false); this.lo.im.count = n;
    this.hi = sys.hiGeos[kind] ? instanced(sys.hiGeos[kind], sys.mat, Math.min(n, 460), true) : null;
    this.base = new Float32Array(n * 16); this.col = new Float32Array(n * 3); this.colLo = new Float32Array(n * 3); this.vr = new Float32Array(n * 4); this.hidden = new Set(); this.grid = new Map();
    items.forEach((f, i) => {
      const of = outfit(r, kind, f[6]), c = linCol(f[4] && f[6] !== 'guard' ? f[4] : of.col), sc = (kind === 'beast' ? 0.82 : 0.95) + r() * 0.12;
      f[5] = f[5] != null ? f[5] : sys.groundY(f[0], f[1]);
      writeMat(this.base, i * 16, f[0], f[5], f[1], f[2], sc); this.col.set(c, i * 3); this.colLo.set(of.lo ? linCol(of.lo) : c, i * 3); this.vr.set(of.v, i * 4);
      const key = Math.floor(f[0] / 48) * 4096 + Math.floor(f[1] / 48); if (!this.grid.has(key)) this.grid.set(key, []); this.grid.get(key).push(i);
    });
    this.lo.im.instanceMatrix.array.set(this.base); this.lo.im.instanceColor.array.set(this.colLo);
    this.lo.im.instanceMatrix.needsUpdate = true; this.lo.im.instanceColor.needsUpdate = true;
    const blob = new THREE.InstancedMesh(blobGeo(kind === 'beast' ? 0.5 : 0.36, kind === 'beast' ? 1.1 : kind === 'sheep' ? 0.5 : 0.3), sys.blobMat, n);
    blob.instanceMatrix = this.lo.im.instanceMatrix; blob.frustumCulled = false; blob.renderOrder = 1;
    sys.group.add(this.lo.im, blob); if (this.hi) sys.group.add(this.hi.im);
  }
  update(cam, hi2) {
    if (!this.hi) return;
    const near = new Set(), R = Math.sqrt(hi2), cx = Math.floor(cam.x / 48), cz = Math.floor(cam.z / 48), span = Math.ceil(R / 48), cap = this.hi.im.instanceMatrix.count;
    for (let a = -span; a <= span; a++) for (let b = -span; b <= span; b++) {
      const list = this.grid.get((cx + a) * 4096 + cz + b); if (!list) continue;
      for (const i of list) { const f = this.items[i], ex = f[0] - cam.x, ey = f[5] - cam.y, ez = f[1] - cam.z; if (near.size < cap && ex * ex + ey * ey + ez * ez < hi2) near.add(i); }
    }
    const lm = this.lo.im.instanceMatrix.array; let dirty = false;
    for (const i of this.hidden) if (!near.has(i)) { lm.set(this.base.subarray(i * 16, i * 16 + 16), i * 16); dirty = true; }
    for (const i of near) if (!this.hidden.has(i)) { for (let k = 0; k < 11; k++) lm[i * 16 + k] = 0; dirty = true; }
    this.hidden = near;
    if (dirty) this.lo.im.instanceMatrix.needsUpdate = true;
    const hm = this.hi.im.instanceMatrix.array, hc = this.hi.im.instanceColor.array, hv = this.hi.vr.array; let k = 0;
    for (const i of near) { hm.set(this.base.subarray(i * 16, i * 16 + 16), k * 16); hc.set(this.col.subarray(i * 3, i * 3 + 3), k * 3); hv.set(this.vr.subarray(i * 4, i * 4 + 4), k * 4); k++; }
    this.hi.im.count = k; this.hi.im.instanceMatrix.needsUpdate = true; this.hi.im.instanceColor.needsUpdate = true; this.hi.vr.needsUpdate = true;
  }
}

export class People {
  constructor(app) {
    this.app = app; this.r = mulberry32(2024); this.enabled = true; this.first = true; this.frame = 0;
    const lu = app.lu, solid = app.solid, w = lu.w, h = lu.h;
    // trame de circulation : voies libres de tout obstacle, plus les tabliers de ponts
    const nav = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) nav[i] = lu.data[i] === LU.OPEN && solid.data[i] === 0 ? 1 : 0;
    for (const key of app.deck.keys()) {
      const ix = ((key >> 13) - 4096) * 2 - lu.x0, iz = ((key & 8191) - 4096) * 2 - lu.z0;
      for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) { const i = Math.floor(ix) + a, j = Math.floor(iz) + b; if (i >= 0 && j >= 0 && i < w && j < h && solid.data[j * w + i] === 0) nav[j * w + i] = 1; }
    }
    this.navData = nav; this.nw = w; this.nh = h; this.x0 = lu.x0; this.z0 = lu.z0;
    this.gw = Math.ceil(w / 2); this.gh = Math.ceil(h / 2); this.gcache = new Float32Array(this.gw * this.gh).fill(NaN);
    this.atlas = makeFigureAtlas(app.mobile ? 0.5 : 1);
    this.mat = peopleMaterial(this.atlas.texture);
    this.blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, color: 0x000000, opacity: 0.42, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.group = new THREE.Group(); app.scene.add(this.group);
    const q = app.mobile ? 0.3 : 1;
    this.geos = { man: manGeo(), robe: robeGeo(), beast: beastGeo(), rider: riderGeo(), cart: cartGeo(), sheep: sheepGeo() };
    this.hiGeos = { man: manHi(), robe: robeHi(), rider: riderHi(), cart: cartHi() };
    this.pools = [
      new Pool(this, 'man', Math.round(2400 * q), { scale: [0.94, 1.08], kids: 0.07, speed: [1.1, 1.6], probe: 1.7, side: 1.3, stride: 4.6, amp: 0.55, idle: 0.1, blob: [0.36, 0.3], share: 0.5, hiCap: 500 }),
      new Pool(this, 'robe', Math.round(1700 * q), { scale: [0.9, 1.03], kids: 0.05, speed: [0.85, 1.25], probe: 1.7, side: 1.3, stride: 5.0, amp: 0.5, idle: 0.14, blob: [0.38, 0.34], share: 0.36, hiCap: 400 }),
      new Pool(this, 'sheep', Math.round(420 * q), { palette: PIGS, scale: [0.62, 0.95], speed: [0.5, 1.1], probe: 1.4, side: 1.0, stride: 9, amp: 0.5, idle: 0.3, blob: [0.3, 0.5], share: 0.07 }),
      new Pool(this, 'rider', Math.round(190 * q), { scale: [0.96, 1.06], speed: [1.7, 2.6], probe: 4.2, side: 2.2, stride: 2.6, amp: 0.5, idle: 0.04, wide: true, turn: 1.6, blob: [0.5, 1.2], share: 0.04, hiCap: 60 }),
      new Pool(this, 'cart', Math.round(130 * q), { scale: [0.95, 1.05], speed: [1.0, 1.5], probe: 5.5, side: 2.4, stride: 2.8, amp: 0.45, idle: 0.08, wide: true, turn: 0.9, blob: [1.0, 2.6], share: 0.03, hiCap: 40 }),
    ];
    this.statics = [];
    this.total = this.pools.reduce((s, p) => s + p.n, 0);
    this.count = 0; this.near = 0; this.lastX = 1e9; this.lastZ = 1e9;
  }
  nav(x, z) {
    const i = Math.floor(x - this.x0), j = Math.floor(z - this.z0);
    return i >= 0 && j >= 0 && i < this.nw && j < this.nh ? this.navData[j * this.nw + i] : 0;
  }
  groundY(x, z) {
    const app = this.app, d = app.deck.get(app.deckKey(x, z));
    const i = Math.floor((x - this.x0) / 2), j = Math.floor((z - this.z0) / 2);
    if (i < 0 || j < 0 || i >= this.gw || j >= this.gh) return Math.max(0.2, app.terrain.height(x, z), d || 0);
    let v = this.gcache[j * this.gw + i];
    if (v !== v) { v = Math.max(0.2, app.terrain.height(this.x0 + i * 2 + 1, this.z0 + j * 2 + 1)); this.gcache[j * this.gw + i] = v; }
    return d !== undefined ? Math.max(d, v) : v;
  }
  update(dt) {
    const app = this.app, rig = app.rig, walk = rig.mode === 'walk';
    const dist = walk ? 0 : rig.cur.dist;
    const show = this.enabled && dist < 1500 && !app.inside;
    if (this.group.visible !== show) this.group.visible = show;
    if (!show) { this.count = 0; return; }
    const cx = walk ? rig.walk.x : rig.target.x, cz = walk ? rig.walk.z : rig.target.z;
    const R = walk ? 250 : clamp(dist * 0.8, 170, 520), cam = app.camera.position, hi2 = (walk ? 80 : 95) ** 2;
    // densité visée : un passant pour ~26 m² de voie (les rues couvrent environ un cinquième de la ville), moins la nuit
    const want = clamp((Math.PI * R * R * 0.2) / 26, 250, this.total) * (0.12 + 0.88 * app.sky.day) * (app.crowdScale || 1);
    // après un saut (fiche, visite guidée, entrée à pied), la foule se reforme d'emblée autour du nouveau point
    const fresh = this.first || Math.hypot(cx - this.lastX, cz - this.lastZ) > 70; this.lastX = cx; this.lastZ = cz;
    let n = 0, near = 0;
    for (const p of this.pools) { p.update(dt, cx, cz, R, Math.round(want * p.o.share), fresh, cam, hi2); n += p.active; near += p.near || 0; }
    if (this.frame++ % 4 === 0 || this.first) for (const s of this.statics) s.update(cam, hi2);
    this.blobMat.opacity = 0.14 + 0.3 * app.sky.day;
    this.count = n; this.near = near; this.first = false;
  }

  // Figurants fixes : [x, z, cap, 'man' | 'robe' | 'beast' | 'sheep', couleur [r,g,b] ou null, y ou null, rôle].
  addStatics(list) {
    for (const kind of ['man', 'robe', 'beast', 'sheep']) { const items = list.filter((f) => f[3] === kind); if (items.length) this.statics.push(new Statics(this, kind, items)); }
  }

  // Groupe de personnages détaillés immobiles pour une autre scène (intérieurs) : [x, y, z, cap, 'man' | 'robe', rôle, couleur, échelle].
  makeGroup(list, r = this.r) {
    const group = new THREE.Group();
    for (const kind of ['man', 'robe']) {
      const items = list.filter((f) => f[4] === kind); if (!items.length) continue;
      const s = instanced(this.hiGeos[kind], this.mat, items.length, true), m = s.im.instanceMatrix.array, c = s.im.instanceColor.array, v = s.vr.array;
      items.forEach((f, i) => { const of = outfit(r, kind, f[5]); writeMat(m, i * 16, f[0], f[1], f[2], f[3], f[7] || 0.96 + r() * 0.1); c.set(linCol(f[6] || of.col), i * 3); v.set(f[8] || of.v, i * 4); });
      s.im.count = items.length; s.im.instanceMatrix.needsUpdate = true; s.im.instanceColor.needsUpdate = true; s.vr.needsUpdate = true;
      group.add(s.im);
    }
    return group;
  }
}

export { CLOTH, DRESS, WOOL, CATTLE, HABITS, RICH };
