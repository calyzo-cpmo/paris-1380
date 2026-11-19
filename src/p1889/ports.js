// Rives de la Seine dans Paris en 1889 et ports bas.
// Les rives sont la courbe « moitié eau » du masque du fleuve (src/p1789/terrain.js), chaînée en lignes continues.
// Les ports bas se lisent dans la base « Paris 1900 », qui nomme leurs voies (« Port de la Tournelle », « Port
// Saint-Nicolas »…) : la voie court au milieu du port, entre le bord de l'eau et le mur du quai haut. Là où une telle
// voie longe la rive, le port s'étend du bord de l'eau jusqu'à deux fois la distance de la voie (de 9 à 36 m), sans
// entamer la rue du quai haut ; il est écarté le long des voies ferrées et sur l'Exposition. Le niveau du port — deux
// mètres au-dessus de l'eau — et sa largeur sont des conventions déduites de ces tracés.
import { pointInPoly } from '../geom.js';
import { rues, voies, dansExpo } from './data.js';

export const NIVEAU_PORT = 2.1;
const LMIN = 9, LMAX = 36, RUN_MIN = 30;

// Distance d'un point aux lignes données, par cases de C mètres ; rend Infinity au-delà de R.
function indexer(lignes, C = 40) {
  const g = new Map(), k = (i, j) => i * 100003 + j;
  for (const pts of lignes) for (let n = 0; n + 1 < pts.length; n++) {
    const a = pts[n], b = pts[n + 1], i0 = Math.floor(Math.min(a[0], b[0]) / C), i1 = Math.floor(Math.max(a[0], b[0]) / C), j0 = Math.floor(Math.min(a[1], b[1]) / C), j1 = Math.floor(Math.max(a[1], b[1]) / C);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const q = k(i, j); let l = g.get(q); if (!l) g.set(q, (l = [])); l.push(a, b); }
  }
  return (x, z, R) => {
    let d = Infinity; const i0 = Math.floor((x - R) / C), i1 = Math.floor((x + R) / C), j0 = Math.floor((z - R) / C), j1 = Math.floor((z + R) / C);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const l = g.get(k(i, j)); if (!l) continue;
      for (let n = 0; n < l.length; n += 2) { const a = l[n], b = l[n + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))), v = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); if (v < d) d = v; } }
    return d <= R ? d : Infinity;
  };
}

// Courbe « moitié eau » du masque adouci (cases de marche), chaînée : rend des lignes de points [x, z].
function rives(T, C) {
  const W = T.W, H = T.H, s = T.soft, cell = (C.x1 - C.x0) / W, X = (i) => C.x0 + (i + 0.5) * cell, Z = (k) => C.z0 + (k + 0.5) * cell, t = (u, v) => (127.5 - u) / (v - u), segs = [];
  for (let k = 0; k < H - 1; k++) for (let i = 0; i < W - 1; i++) {
    const q = k * W + i, a = s[q], b = s[q + 1], c = s[q + W + 1], d = s[q + W], m = (a > 127 ? 1 : 0) | (b > 127 ? 2 : 0) | (c > 127 ? 4 : 0) | (d > 127 ? 8 : 0);
    if (m === 0 || m === 15) continue;
    const pts = [];
    if ((m & 1) !== ((m >> 1) & 1)) pts.push([X(i) + t(a, b) * cell, Z(k)]);
    if (((m >> 1) & 1) !== ((m >> 2) & 1)) pts.push([X(i + 1), Z(k) + t(b, c) * cell]);
    if (((m >> 2) & 1) !== ((m >> 3) & 1)) pts.push([X(i) + t(d, c) * cell, Z(k + 1)]);
    if (((m >> 3) & 1) !== (m & 1)) pts.push([X(i), Z(k) + t(a, d) * cell]);
    for (let j = 0; j + 1 < pts.length; j += 2) segs.push([pts[j], pts[j + 1]]);
  }
  // deux cases voisines calculent leur point commun par la même formule : les bouts se retrouvent à l'identique
  const cle = (p) => p[0].toFixed(3) + ',' + p[1].toFixed(3), bouts = new Map();
  segs.forEach((sg, i) => { for (const e of [0, 1]) { const q = cle(sg[e]); let l = bouts.get(q); if (!l) bouts.set(q, (l = [])); l.push(i * 2 + e); } });
  const vu = new Uint8Array(segs.length), out = [];
  for (let i0 = 0; i0 < segs.length; i0++) {
    if (vu[i0]) continue; vu[i0] = 1;
    const avant = [segs[i0][1]], arriere = [segs[i0][0]];
    for (const l of [avant, arriere]) for (;;) {
      const r = (bouts.get(cle(l[l.length - 1])) || []).find((v) => !vu[v >> 1]); if (r === undefined) break;
      vu[r >> 1] = 1; l.push(segs[r >> 1][1 - (r & 1)]);
    }
    out.push(arriere.reverse().concat(avant));
  }
  return out;
}

// Rives et ports bas : { chaines [{ pts, m, bande }], bandes [{ P, Q, mP, mQ, w0, w1, fin0, fin1 }], km }.
// m : normale vers la terre en chaque sommet, lissée sur une quinzaine de mètres (les murs décalés le long des rives
// se raccordent ainsi d'un segment à l'autre) ; bande : par segment, l'indice de sa bande de port, ou -1. Une bande va
// du bord de l'eau, de P à Q, jusqu'au mur du quai haut, de P + mP·w0 à Q + mQ·w1 ; fin0, fin1 : le port s'arrête à ce bout.
export function portsBas(T, C, env) {
  const R = rues(), P = indexer(R.filter((r) => /^Port\b/i.test(r.nom)).map((r) => r.pts)), Q = indexer(R.filter((r) => /^Quai\b/i.test(r.nom)).map((r) => r.pts)), F = indexer(voies().map((v) => v.pts));
  const chaines = [], bandes = []; let long = 0;
  for (const pts of rives(T, C)) {
    const N = pts.length, bande = new Int32Array(Math.max(0, N - 1)).fill(-1);
    // normale de chaque segment, vers la terre, puis normale lissée en chaque sommet
    const ns = [];
    for (let k = 0; k + 1 < N; k++) { const a = pts[k], b = pts[k + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; let nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l; if (T.wetAt(mx + nx * 3, mz + nz * 3) > T.wetAt(mx - nx * 3, mz - nz * 3)) { nx = -nx; nz = -nz; } ns.push([nx, nz]); }
    const m = pts.map((p, i) => { let sx = 0, sz = 0; for (let k = i - 4; k < i + 4; k++) if (k >= 0 && k < N - 1) { const wk = 1 / (1 + Math.abs(k + 0.5 - i)); sx += ns[k][0] * wk; sz += ns[k][1] * wk; } const l = Math.hypot(sx, sz); if (l > 0.35) return [sx / l, sz / l]; const k = Math.min(i, N - 2); return k >= 0 ? ns[k] : [0, 0]; });
    chaines.push({ pts, m, bande }); if (N < 3) continue;
    // largeur brute en chaque sommet : deux fois la distance de la voie du port, sans atteindre la rue du quai haut
    const w = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const p = pts[i], [mx, mz] = m[i]; if (!pointInPoly(p[0], p[1], env) || dansExpo(p[0], p[1])) continue;
      let sp = -1, dp = 7, sq = -1, dq = 10;
      for (let s = 1; s <= 54; s += 1.5) { const x = p[0] + mx * s, z = p[1] + mz * s, a = P(x, z, 8), b = Q(x, z, 11); if (a < dp) { dp = a; sp = s; } if (b < dq) { dq = b; sq = s; } }
      if (sp < 0) continue;
      let v = Math.min(2 * sp + 2, LMAX); if (sq > 0) v = Math.min(v, sq - 10);
      if (v < LMIN || F(p[0] + (mx * v) / 2, p[1] + (mz * v) / 2, v / 2 + 14) < Infinity) continue;      // pas de port le long des voies ferrées
      w[i] = v;
    }
    // lissage : médiane sur sept sommets, puis moyenne sur neuf
    const med = new Float32Array(N), lis = new Float32Array(N);
    for (let i = 0; i < N; i++) { const v = []; for (let j = i - 3; j <= i + 3; j++) if (j >= 0 && j < N) v.push(w[j]); v.sort((a, b) => a - b); med[i] = v[v.length >> 1]; }
    for (let i = 0; i < N; i++) { if (!med[i]) continue; let s = 0, c = 0; for (let j = i - 4; j <= i + 4; j++) if (j >= 0 && j < N && med[j]) { s += med[j]; c++; } lis[i] = s / c; }
    // tronçons continus d'au moins trente mètres
    for (let i = 0; i < N;) {
      if (lis[i] < LMIN) { i++; continue; }
      let j = i, L = 0; while (j + 1 < N && lis[j + 1] >= LMIN) { L += Math.hypot(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]); j++; }
      if (L >= RUN_MIN) { long += L; for (let k = i; k < j; k++) { bande[k] = bandes.length; bandes.push({ P: pts[k], Q: pts[k + 1], mP: m[k], mQ: m[k + 1], w0: lis[k], w1: lis[k + 1], fin0: k === i, fin1: k === j - 1 }); } }
      i = j + 1;
    }
  }
  return { chaines, bandes, km: long / 1000 };
}
