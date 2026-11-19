// Trains de 1889 : une locomotive, son tender et ses voitures, qui vont et viennent sur les grandes lignes.
// Les voies posées par src/p1889/fer.js sont des tronçons ; ceux qui se suivent dans l'alignement sont raccordés en
// parcours (les faisceaux et les aiguillages les arrêtent vite : les plus longs font de un à deux kilomètres et demi),
// et un train circule sur chacun des dix-huit plus longs, d'un bout à l'autre puis en sens inverse. Composition,
// vitesse et nombre de trains sont une évocation : aucun horaire n'est figuré.
import * as THREE from 'three';
import { mulberry32 } from '../geom.js';

const NOIR = new THREE.Color(0x24262a), VERTS = [0x3d5a45, 0x5a3b2c, 0x2f4a5c, 0x6b5a3a].map((c) => new THREE.Color(c)), TOIT = 0x8a8f94;
const LONG = { loco: 11, tender: 6.5, voiture: 12 }, JEU = 1.2;

// Raccorde les tronçons dont les bouts se touchent (moins de 1,5 m) dans l'alignement : rend des parcours [{ x, y, z }].
function parcours(lignes) {
  const bouts = new Map(), cle = (x, z) => Math.round(x / 3) + ',' + Math.round(z / 3), pris = new Uint8Array(lignes.length);
  const dir = (P, fin) => { const a = fin ? P[P.length - 1] : P[0], b = fin ? P[P.length - 2] : P[1], l = Math.hypot(b.x - a.x, b.z - a.z) || 1; return [(b.x - a.x) / l, (b.z - a.z) / l]; };
  lignes.forEach((P, i) => { if (P.length < 2) return; for (const fin of [0, 1]) { const p = fin ? P[P.length - 1] : P[0], k = cle(p.x, p.z); let l = bouts.get(k); if (!l) bouts.set(k, (l = [])); l.push([i, fin]); } });
  // le tronçon qui prolonge le bout (i, fin) : bout voisin, sens opposé, le mieux aligné
  const suite = (i, fin) => { const P = lignes[i], p = fin ? P[P.length - 1] : P[0], u = dir(P, fin); let best = null, bc = -0.97;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const [j, f] of bouts.get((Math.round(p.x / 3) + a) + ',' + (Math.round(p.z / 3) + b)) || []) {
      if (j === i || pris[j]) continue; const Q = lignes[j], q = f ? Q[Q.length - 1] : Q[0]; if (Math.hypot(q.x - p.x, q.z - p.z) > 1.5) continue;
      const v = dir(Q, f), c = u[0] * v[0] + u[1] * v[1]; if (c < bc) { bc = c; best = [j, f]; } }
    return best; };
  const out = [], ordre = lignes.map((P, i) => i).sort((a, b) => lignes[b].length - lignes[a].length);
  for (const i0 of ordre) {
    if (pris[i0] || lignes[i0].length < 2) continue; pris[i0] = 1;
    let pts = lignes[i0].slice();
    for (const fin of [1, 0]) {
      let i = i0, f = fin;
      for (let n = 0; n < 400; n++) {
        const s = suite(i, f); if (!s) break; const [j, g] = s; pris[j] = 1;
        const Q = g ? lignes[j].slice().reverse() : lignes[j].slice();          // Q part du bout raccordé
        if (fin) pts = pts.concat(Q.slice(1)); else pts = Q.slice(1).reverse().concat(pts);
        i = j; f = 1 - g;
      }
    }
    let s = 0; pts[0].s = 0; for (let k = 1; k < pts.length; k++) { s += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z); pts[k] = { x: pts[k].x, y: pts[k].y, z: pts[k].z, s }; }
    pts[0] = { x: pts[0].x, y: pts[0].y, z: pts[0].z, s: 0 };
    out.push({ pts, L: s });
  }
  return out.sort((a, b) => b.L - a.L);
}

// Point du parcours à l'abscisse s : position et direction.
function lire(P, s) {
  const pts = P.pts; s = Math.max(0, Math.min(P.L, s));
  let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s <= s) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi], t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0, l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / l, dz: (b.z - a.z) / l };
}

export function trains(app, lignes, n = 18) {
  const P = parcours(lignes).filter((p) => p.L > 900).slice(0, n), r = mulberry32(1889), T = [];
  // une caisse : boîte de 1 × 1 × 1, mise à l'échelle par instance ; une cheminée pour chaque locomotive
  const caisse = new THREE.BoxGeometry(1, 1, 1); caisse.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.15 }), toit = new THREE.MeshStandardMaterial({ color: TOIT, roughness: 0.8 });
  const compo = P.map(() => { const v = 3 + Math.floor(r() * 5); return ['loco', 'tender', ...Array(v).fill('voiture')]; });
  const total = compo.reduce((a, c) => a + c.length, 0);
  const corps = new THREE.InstancedMesh(caisse, mat, total), toits = new THREE.InstancedMesh(caisse, toit, total), cheminees = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.45, 1.6, 8).translate(0, 0.8, 0), new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.6 }), P.length);
  for (const m of [corps, toits, cheminees]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; }
  let k = 0;
  P.forEach((p, i) => {
    const couleur = VERTS[Math.floor(r() * VERTS.length)], voitures = compo[i].map((t) => { const c = t === 'voiture' ? couleur : NOIR; corps.setColorAt(k, c); return { t, k: k++ }; });
    T.push({ i, p, voitures, s: r() * p.L, v: (8 + r() * 6) * (r() < 0.5 ? 1 : -1), long: compo[i].reduce((a, t) => a + LONG[t] + JEU, 0) });
  });
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), S = new THREE.Vector3(), V3 = new THREE.Vector3();
  const poser = (m, i, x, y, z, ang, sx, sy, sz) => { Q.setFromAxisAngle(Y, ang); S.set(sx, sy, sz); V3.set(x, y, z); M.compose(V3, Q, S); m.setMatrixAt(i, M); };
  function update(dt) {
    for (const t of T) {
      t.s += t.v * dt;
      if (t.s > t.p.L - 2) { t.s = t.p.L - 2; t.v = -Math.abs(t.v); } else if (t.s < t.long + 2) { t.s = t.long + 2; t.v = Math.abs(t.v); }
      // la locomotive en tête, dans le sens de la marche
      const sg = t.v >= 0 ? 1 : -1; let s = t.s;
      for (const c of t.voitures) {
        const L = LONG[c.t], q = lire(t.p, s - (sg * L) / 2), ang = Math.atan2(q.dx, q.dz), h = c.t === 'loco' ? 3.1 : c.t === 'tender' ? 2.4 : 3.2, w = c.t === 'voiture' ? 2.9 : 2.7;
        poser(corps, c.k, q.x, q.y + 0.55, q.z, ang, w, h, L);
        poser(toits, c.k, q.x, q.y + 0.55 + h, q.z, ang, c.t === 'tender' ? 0.01 : w + 0.2, 0.25, L - 0.4);
        if (c.t === 'loco') { const a = lire(t.p, s - sg * 2.2); poser(cheminees, t.i, a.x, a.y + 0.55 + h, a.z, 0, 1, 1, 1); }
        s -= sg * (L + JEU);
      }
    }
    corps.instanceMatrix.needsUpdate = true; toits.instanceMatrix.needsUpdate = true; cheminees.instanceMatrix.needsUpdate = true;
  }
  if (corps.instanceColor) corps.instanceColor.needsUpdate = true;
  update(0);
  return { meshes: [corps, toits, cheminees], update, n: T.length, parcours: P.map((p) => Math.round(p.L)), etat: () => T.map((t) => { const q = lire(t.p, t.s); return [q.x, q.y, q.z, t.s, t.v]; }) };
}
