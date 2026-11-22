// Outils de construction communs aux modules de l'Exposition de 1900 (src/p1900/expo.js, src/p1900/pavillons.js) :
// poutres d'acier, verrières en berceau, calottes vitrées.
import { VERRE, VERRE_CLAIR } from '../p1889/expo.js';

// Poutre de section carrée (demi-côté w) de p à q, points [x, y, z] ; chaque face est vue des deux côtés.
export function poutre(b, p, q, w, col, s = 1) {
  const tx = q[0] - p[0], ty = q[1] - p[1], tz = q[2] - p[2], l = Math.hypot(tx, ty, tz) || 1, t = [tx / l, ty / l, tz / l];
  const a = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let e1 = [t[1] * a[2] - t[2] * a[1], t[2] * a[0] - t[0] * a[2], t[0] * a[1] - t[1] * a[0]]; const n1 = Math.hypot(...e1); e1 = e1.map((v) => (v / n1) * w);
  const e2 = [t[1] * e1[2] - t[2] * e1[1], t[2] * e1[0] - t[0] * e1[2], t[0] * e1[1] - t[1] * e1[0]];
  const K = [[1, 1], [-1, 1], [-1, -1], [1, -1]], C = (o, i) => [o[0] + e1[0] * K[i][0] + e2[0] * K[i][1], o[1] + e1[1] * K[i][0] + e2[1] * K[i][1], o[2] + e1[2] * K[i][0] + e2[2] * K[i][1]];
  for (let i = 0; i < 4; i++) {
    const A = C(p, i), B = C(p, (i + 1) % 4), Cq = C(q, (i + 1) % 4), D = C(q, i);
    b.quad(A[0], A[1], A[2], B[0], B[1], B[2], Cq[0], Cq[1], Cq[2], D[0], D[1], D[2], 0, 0, 1, 1, col, s, s);
    b.quad(B[0], B[1], B[2], A[0], A[1], A[2], D[0], D[1], D[2], Cq[0], Cq[1], Cq[2], 0, 0, 1, 1, col, s, s);
  }
}
// Berceau vitré le long de u, de v0 à v1, entre la sablière hm et le faîte hf ; P(u, v) : repère de l'édifice.
export function berceau(bv, P, y0, u0, u1, v0, v1, hm, hf, col = VERRE) {
  const N = 10, prof = (s) => hm + (hf - hm) * Math.pow(Math.sin(Math.PI * s), 0.7);
  for (let k = 0; k < N; k++) {
    const s0 = k / N, s1 = (k + 1) / N, ya = y0 + prof(s0), yb = y0 + prof(s1), sh = 0.86 + 0.14 * Math.sin((Math.PI * (s0 + s1)) / 2);
    const a = P(u0, v0 + (v1 - v0) * s0), b = P(u1, v0 + (v1 - v0) * s0), c = P(u1, v0 + (v1 - v0) * s1), d = P(u0, v0 + (v1 - v0) * s1);
    bv.quad(a[0], ya, a[1], b[0], ya, b[1], c[0], yb, c[1], d[0], yb, d[1], 0, 0, 1, 1, col, sh, sh);
    for (const [p, q] of [[a, d], [b, c]]) bv.quad(p[0], y0 + hm, p[1], q[0], y0 + hm, q[1], q[0], yb, q[1], p[0], ya, p[1], 0, 0, 1, 1, VERRE_CLAIR, 0.92, 1);      // pignons vitrés
  }
}
// Calotte vitrée de rayon r posée à la cote ya, jusqu'à yb.
export function calotte(bv, x, z, r, ya, yb, col = VERRE, seg = 20) {
  const N = 6;
  for (let k = 0; k < N; k++) {
    const a0 = ((k / N) * Math.PI) / 2, a1 = (((k + 1) / N) * Math.PI) / 2, r0 = r * Math.cos(a0), r1 = r * Math.cos(a1), y0 = ya + (yb - ya) * Math.sin(a0), y1 = ya + (yb - ya) * Math.sin(a1);
    for (let i = 0; i < seg; i++) { const t0 = (i / seg) * 2 * Math.PI, t1 = ((i + 1) / seg) * 2 * Math.PI;
      bv.quad(x + Math.cos(t1) * r0, y0, z + Math.sin(t1) * r0, x + Math.cos(t0) * r0, y0, z + Math.sin(t0) * r0, x + Math.cos(t0) * r1, y1, z + Math.sin(t0) * r1, x + Math.cos(t1) * r1, y1, z + Math.sin(t1) * r1, 0, 0, 1, 1, col, 0.9, 1.05); }
  }
}

