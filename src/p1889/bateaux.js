// Bateaux de la Seine en 1889 : péniches amarrées le long des ports bas, bateaux à vapeur qui remontent et descendent
// le fleuve au milieu de l'eau. Leur nombre, leur place et leur forme sont une évocation.
import * as THREE from 'three';
import { pointInPoly, mulberry32 } from '../geom.js';

const COQUES = [0x2e2a26, 0x3b2f27, 0x253038, 0x4a3a2c].map((c) => new THREE.Color(c)), BOIS = new THREE.Color(0x8a6a48), BLANC = new THREE.Color(0xe8e4da);

export function bateaux(app, rives, env) {
  const T = app.terrain, r = mulberry32(1871), eau = (x, z) => T.wetAt(x, z) > 0.92;
  // ---- péniches : le long de chaque port bas, toutes les cinquantaine de mètres, à 9 m du bord, dans l'axe de la rive
  const P = [];
  for (const c of rives.chaines) {
    let acc = 0;
    for (let k = 0; k + 1 < c.pts.length; k++) {
      const a = c.pts[k], b = c.pts[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (c.bande[k] < 0) { acc = 25; continue; }
      acc += L; if (acc < 50) continue; acc = 0; if (r() > 0.8) continue;
      const m = c.m[k], x = (a[0] + b[0]) / 2 - m[0] * 9, z = (a[1] + b[1]) / 2 - m[1] * 9;
      if (!eau(x, z) || !eau(x - m[0] * 5, z - m[1] * 5) || !pointInPoly(x, z, env)) continue;
      P.push({ x, z, ang: Math.atan2(b[0] - a[0], b[1] - a[1]), c: COQUES[Math.floor(r() * COQUES.length)] });
    }
  }
  // ---- vapeurs : à 32 m de la berge, sur les longueurs d'eau libre de plus d'un kilomètre
  const routes = [];
  for (const c of rives.chaines) {
    let cur = [];
    const fermer = () => { if (cur.length > 2) { let s = 0; cur[0].s = 0; for (let i = 1; i < cur.length; i++) { s += Math.hypot(cur[i].x - cur[i - 1].x, cur[i].z - cur[i - 1].z); cur[i].s = s; } if (s > 1000) routes.push({ pts: cur, L: s }); } cur = []; };
    for (let k = 0; k < c.pts.length; k += 3) {
      const p = c.pts[k], m = c.m[k], x = p[0] - m[0] * 32, z = p[1] - m[1] * 32;
      if (eau(x, z) && eau(x - m[0] * 14, z - m[1] * 14) && eau(x + m[0] * 14, z + m[1] * 14) && pointInPoly(x, z, env)) cur.push({ x, z }); else fermer();
    }
    fermer();
  }
  routes.sort((a, b) => b.L - a.L);
  const V = routes.slice(0, 10).map((p) => ({ p, s: r() * p.L, v: (3.5 + r() * 2) * (r() < 0.5 ? 1 : -1) }));

  // ---- géométries : une boîte d'un mètre, mise à l'échelle par instance
  const boite = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.05 });
  const n = P.length * 2 + V.length * 3, corps = new THREE.InstancedMesh(boite, mat, Math.max(1, n));
  const cheminees = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.5, 3, 10).translate(0, 1.5, 0), new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.6 }), Math.max(1, V.length));
  for (const m of [corps, cheminees]) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), S = new THREE.Vector3(), X = new THREE.Vector3();
  const poser = (mesh, i, x, y, z, ang, sx, sy, sz, col) => { Q.setFromAxisAngle(Y, ang); S.set(sx, sy, sz); X.set(x, y, z); M.compose(X, Q, S); mesh.setMatrixAt(i, M); if (col) mesh.setColorAt(i, col); };
  let k = 0;
  for (const b of P) { poser(corps, k++, b.x, -0.6, b.z, b.ang, 5.2, 1.9, 38, b.c); const ox = Math.sin(b.ang) * -15, oz = Math.cos(b.ang) * -15; poser(corps, k++, b.x + ox, 1.3, b.z + oz, b.ang, 4.2, 2.1, 5, BOIS); }
  const k0 = k;
  const lire = (R, s) => { const pts = R.pts; s = Math.max(0, Math.min(R.L, s)); let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s <= s) lo = m; else hi = m; } const a = pts[lo], b = pts[hi], t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0, l = Math.hypot(b.x - a.x, b.z - a.z) || 1; return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / l, dz: (b.z - a.z) / l }; };
  function update(dt) {
    V.forEach((b, i) => {
      b.s += b.v * dt; if (b.s > b.p.L - 20) { b.s = b.p.L - 20; b.v = -Math.abs(b.v); } else if (b.s < 20) { b.s = 20; b.v = Math.abs(b.v); }
      const q = lire(b.p, b.s), ang = Math.atan2(q.dx, q.dz), sg = b.v >= 0 ? 1 : -1, k = k0 + i * 3;
      poser(corps, k, q.x, -0.5, q.z, ang, 4.6, 1.8, 26, i ? COQUES[i % COQUES.length] : COQUES[0]);
      poser(corps, k + 1, q.x - q.dx * sg * 1.5, 1.3, q.z - q.dz * sg * 1.5, ang, 3.8, 2.2, 15, BLANC);
      poser(corps, k + 2, q.x, 3.5, q.z, ang, 4, 0.2, 16.5, BLANC);
      poser(cheminees, i, q.x + q.dx * sg * 4, 3.4, q.z + q.dz * sg * 4, 0, 1, 1, 1);
    });
    corps.instanceMatrix.needsUpdate = true; cheminees.instanceMatrix.needsUpdate = true; if (corps.instanceColor) corps.instanceColor.needsUpdate = true;
  }
  update(0);
  return { meshes: [corps, cheminees], update, peniches: P.length, vapeurs: V.length, etat: () => V.map((b) => { const q = lire(b.p, b.s); return [q.x, q.z, b.s]; }) };
}
