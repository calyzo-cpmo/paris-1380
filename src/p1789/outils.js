// Outils communs aux villes bâties avec le moteur de la page « Paris 1789 » : tracé de polygones sur le plan du sol,
// index des emprises infranchissables, arbres. Aucune donnée ici : chaque ville (src/p1789/city.js, src/lutece) apporte
// les siennes.
import * as THREE from 'three';
import { mulberry32, pointInPoly } from '../geom.js';

// T : { s (pixels par mètre), x(xMonde), y(zMonde) }.
export const ring = (x, T, r) => { x.moveTo(T.x(r[0][0]), T.y(r[0][1])); for (let i = 1; i < r.length; i++) x.lineTo(T.x(r[i][0]), T.y(r[i][1])); x.closePath(); };
// Les polygones sont tracés par paquets de PAQUET : un seul tracé de plusieurs dizaines de milliers de contours coûte
// des secondes au moteur de dessin, des paquets quelques dizaines de millisecondes. Un polygone et ses trous restent dans
// le même paquet (règle pair-impair) ; deux polygones qui se recouvrent sont réunis plutôt qu'évidés.
const PAQUET = 256;
const parPaquets = (x, T, polys, faire) => { let n = 0; x.beginPath(); for (const rings of polys) { for (const r of rings) ring(x, T, r); if (++n === PAQUET) { faire(); x.beginPath(); n = 0; } } if (n) faire(); };
export const fill = (x, T, polys, style) => { x.fillStyle = style; parPaquets(x, T, polys, () => x.fill('evenodd')); };
export const stroke = (x, T, polys, style, w) => { x.strokeStyle = style; x.lineWidth = w; x.lineJoin = 'round'; parPaquets(x, T, polys, () => x.stroke()); };
// Emprises pleines et cernées (trames d'obstacles) : f.ring pour chaque élément.
export const pleins = (x, T, foot) => parPaquets(x, T, foot.map((f) => [f.ring]), () => { x.fill(); x.stroke(); });

// Lignes ouvertes (rues, ruisseaux).
export const lines = (x, T, ls, style, w) => { x.strokeStyle = style; x.lineWidth = w; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); for (const l of ls) { x.moveTo(T.x(l[0][0]), T.y(l[0][1])); for (let i = 1; i < l.length; i++) x.lineTo(T.x(l[i][0]), T.y(l[i][1])); } x.stroke(); };

// Emprises infranchissables, rangées par cases de 48 m : app.footAt(x, z) rend l'emprise qui couvre le point.
export function indexFoot(app) {
  const CELL = 48, cells = new Map();
  for (const f of app.foot) {
    if (f.x0 == null) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of f.ring) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; } f.x0 = x0; f.z0 = z0; f.x1 = x1; f.z1 = z1; }
    for (let i = Math.floor(f.x0 / CELL); i <= Math.floor(f.x1 / CELL); i++) for (let k = Math.floor(f.z0 / CELL); k <= Math.floor(f.z1 / CELL); k++) { const key = (i + 2048) * 4096 + k + 2048; let l = cells.get(key); if (!l) cells.set(key, (l = [])); l.push(f); }
  }
  app.footAt = (x, z) => { const l = cells.get((Math.floor(x / CELL) + 2048) * 4096 + Math.floor(z / CELL) + 2048); if (l) for (const f of l) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && pointInPoly(x, z, f.ring)) return f; return null; };
}

// Arbres des jardins : une seule géométrie (tronc et houppier), instanciée. app.gardens : [{ ring, dens, ok }] —
// ok(x, z), facultatif, affine le contour (bande le long d'un ruisseau, lisière d'un bois).
export function buildTrees(app) {
  const T = app.terrain, r = mulberry32(17), pts = [];
  for (const g of app.gardens) {
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of g.ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const pas = 11;
    for (let x = x0; x < x1; x += pas) for (let z = z0; z < z1; z += pas) {
      if (r() > g.dens) continue;
      const px = x + r() * pas, pz = z + r() * pas;
      if (!pointInPoly(px, pz, g.ring) || (g.ok && !g.ok(px, pz)) || app.footAt(px, pz) || T.wetAt(px, pz) > 0.05) continue;
      pts.push(px, T.height(px, pz), pz, 0.75 + r() * 0.7, r());
      if (pts.length >= 5 * 14000) break;
    }
  }
  const crown = new THREE.IcosahedronGeometry(1, 0), trunk = new THREE.CylinderGeometry(0.16, 0.22, 1, 4, 1, true);
  crown.scale(2.6, 3.1, 2.6); crown.translate(0, 5.6, 0); trunk.scale(1, 3.2, 1); trunk.translate(0, 1.6, 0);
  { const P = crown.attributes.position, N = crown.attributes.normal;      // houppier lissé : normales de l'ellipsoïde, au lieu de facettes
    for (let i = 0; i < P.count; i++) { const nx = P.getX(i) / 6.76, ny = (P.getY(i) - 5.6) / 9.61, nz = P.getZ(i) / 6.76, l = Math.hypot(nx, ny, nz) || 1; N.setXYZ(i, nx / l, ny / l, nz / l); } }
  const paint = (g0, c) => { const g = g0.index ? g0.toNonIndexed() : g0, n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const a = paint(crown, [1, 1, 1]), b = paint(trunk, [0.35, 0.26, 0.18]), n = a.attributes.position.count + b.attributes.position.count;
  const geo = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'color']) { const arr = new Float32Array(n * 3); arr.set(a.attributes[k].array, 0); arr.set(b.attributes[k].array, a.attributes[k].array.length); geo.setAttribute(k, new THREE.BufferAttribute(arr, 3)); }
  const count = pts.length / 5, mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const k = pts[i * 5 + 3], t = pts[i * 5 + 4];
    p.set(pts[i * 5], pts[i * 5 + 1] - 0.1, pts[i * 5 + 2]); s.set(k, k * (0.9 + t * 0.3), k); q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, t * 6.28);
    mesh.setMatrixAt(i, m.compose(p, q, s)); mesh.setColorAt(i, col.setRGB(0.24 + t * 0.12, 0.38 + t * 0.13, 0.17 + t * 0.06, THREE.SRGBColorSpace));
  }
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = count;
  app.scene.add(mesh); app.treeCount = count;
  return mesh;
}
