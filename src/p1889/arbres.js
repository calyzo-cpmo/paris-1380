// Alignements d'arbres des boulevards, des avenues et des quais de Paris en 1889.
// La carte de distance de la voirie (src/p1889/sol.js) dit, en tout point d'une rue, à quelle distance se trouve le
// front des îlots : on en déduit la largeur de la voie d'une façade à l'autre. Là où elle est assez large — 24 m
// pour un boulevard, une avenue, un cours ou un quai, 28 m pour une autre voie —, un arbre est planté tous les dix
// mètres sur chaque trottoir, à 1,3 m de la bordure ; les trottoirs de 7,5 m et plus reçoivent un second rang. Les
// terre-pleins plantés (îlots « p » de la base de 1900) sont bordés d'arbres. Les places, les parvis, les ronds-points
// et les abords des monuments restent minéraux (plusieurs places étaient pourtant plantées : c'est une convention).
// Ces seuils sont de convention, proches de l'usage du temps (une rangée par trottoir sur les voies de 26 m environ,
// deux sur les plus larges) ; quelle voie était réellement plantée en 1889 n'est pas connu rue par rue : c'est une
// évocation. Paris comptait alors près de 90 000 arbres d'alignement.
import * as THREE from 'three';
import { rues, ilots } from './data.js';
import { trottoir } from './sol.js';
import { pointInPoly, polyArea } from '../geom.js';

const PAS = 10, BORD = 1.3, RANG = 4.2, PORTEE = 46, TUILE = 1100;

export function planter(app) {
  const T = app.terrain, V = app.voirie, C = app.monde.cadre, fw = C.x1 - C.x0, fh = C.z1 - C.z0, pas = app.mobile ? PAS * 2 : PAS;
  // distance au bord de la rue (m, positive dans la rue), lue dans la carte avec interpolation
  const sd = (x, z) => { const fx = ((x - C.x0) / fw) * V.w - 0.5, fz = ((z - C.z0) / fh) * V.h - 0.5; if (fx < 0 || fz < 0 || fx >= V.w - 1 || fz >= V.h - 1) return -V.D;
    const i = Math.floor(fx), k = Math.floor(fz), u = fx - i, v = fz - k, d = V.data, q = k * V.w + i;
    return (((d[q] * (1 - u) + d[q + 1] * u) * (1 - v) + (d[q + V.w] * (1 - u) + d[q + V.w + 1] * u) * v) / 255 - 0.5) * 2 * V.D; };
  // distance du point à la façade dans la direction (nx, nz) ; Infinity si l'espace reste ouvert (place, carrefour)
  const jusquAuFront = (x, z, nx, nz) => { let avant = sd(x, z); for (let s = 2; s <= PORTEE; s += 2) { const v = sd(x + nx * s, z + nz * s); if (v <= 0) return s - 2 + (2 * avant) / (avant - v); avant = v; } return Infinity; };
  // demi-largeur de la voie autour du point (m), lue dans la carte grossière
  const demi = (x, z) => { const G = V.large, fx = Math.max(0, Math.min(G.w - 1.001, ((x - C.x0) / fw) * G.w - 0.5)), fz = Math.max(0, Math.min(G.h - 1.001, ((z - C.z0) / fh) * G.h - 0.5)), i = Math.floor(fx), k = Math.floor(fz), u = fx - i, v = fz - k, d = G.data, q = k * G.w + i;
    return Math.max(0, (((d[q] * (1 - u) + d[q + 1] * u) * (1 - v) + (d[q + G.w] * (1 - u) + d[q + G.w + 1] * u) * v) / 255 - 0.5) * 2 * V.D); };
  // terre-pleins et promenades plantées, rangés par cases de 150 m ; les places et les abords des monuments restent nus
  const CASE = 150, cases = new Map(), monuments = Object.values(app.monuments).filter((m) => m && m.x != null);
  for (const i of ilots()) { if (i.c !== 'p') continue; const r = i.rings[0]; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const o = { r, x0, z0, x1, z1, nu: /^Place\b/i.test(i.nom) || Math.abs(polyArea(r)) < 150 || monuments.some((m) => m.x >= x0 - 60 && m.x <= x1 + 60 && m.z >= z0 - 60 && m.z <= z1 + 60 && (pointInPoly(m.x, m.z, r) || r.some((p) => Math.hypot(p[0] - m.x, p[1] - m.z) < 60))) };      // le terre-plein d'une place est souvent en plusieurs morceaux autour du monument
    for (let a = Math.floor(x0 / CASE); a <= Math.floor(x1 / CASE); a++) for (let b = Math.floor(z0 / CASE); b <= Math.floor(z1 / CASE); b++) { const k = a * 4096 + b; let l = cases.get(k); if (!l) cases.set(k, (l = [])); l.push(o); } }
  const terrePlein = (x, z) => { const l = cases.get(Math.floor(x / CASE) * 4096 + Math.floor(z / CASE)); if (l) for (const o of l) if (x >= o.x0 && x <= o.x1 && z >= o.z0 && z <= o.z1 && pointInPoly(x, z, o.r)) return o; return null; };
  // places : les voies nommées « place », « parvis », « rond-point »… ne sont pas plantées, ni, à moins d'une
  // trentaine de mètres d'elles, les rues qui les traversent
  const PL = 20, places = new Set(), clePlace = (x, z) => Math.floor(x / PL) * 8192 + Math.floor(z / PL);
  for (const r of rues()) if (/^(Place|Parvis|Rond|Carrefour|Esplanade)\b/i.test(r.nom)) for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8)); for (let j = 0; j <= n; j++) places.add(clePlace(a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n)); }
  const placeEn = (x, z) => { for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) if (places.has(clePlace(x + i * PL, z + k * PL))) return true; return false; };
  const vus = new Set(), tuiles = new Map(), cle = (x, z) => Math.round(x / 6) * 8192 + Math.round(z / 6);
  let n = 0;
  const poser = (x, z, surTerrePlein) => {
    const k = cle(x, z); if (vus.has(k) || vus.has(k + 1) || vus.has(k - 1) || vus.has(k + 8192) || vus.has(k - 8192)) return;      // un boulevard à deux chaussées est décrit deux fois
    if ((!surTerrePlein && sd(x, z) < 0.8) || T.wetAt(x, z) > 0.05 || app.footAt(x, z) || placeEn(x, z)) return;
    vus.add(k); const t = Math.floor(x / TUILE) * 64 + Math.floor(z / TUILE); let l = tuiles.get(t); if (!l) tuiles.set(t, (l = [])); l.push(x, T.height(x, z), z); n++;
  };
  for (const r of rues()) {
    if (r.pont || /^(Place|Parvis|Rond|Carrefour|Esplanade)\b/i.test(r.nom)) continue;                                              // les places restent minérales
    const mini = /^(Boulevard|Avenue|Cours|Quai)\b/i.test(r.nom) ? 24 : 28;
    let reste = pas / 2;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.01) continue;
      const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, nx = -tz, nz = tx;
      for (; reste < L; reste += pas) {
        const x = a[0] + tx * reste, z = a[1] + tz * reste; if (sd(x, z) < 2) continue;                                             // sur un pont, dans un îlot : pas une rue
        const dg = jusquAuFront(x, z, nx, nz), dd = jusquAuFront(x, z, -nx, -nz); if (dg === Infinity && dd === Infinity) continue;

        const pg = dg === Infinity ? null : terrePlein(x + nx * (dg + 3), z + nz * (dg + 3)), pd = dd === Infinity ? null : terrePlein(x - nx * (dd + 3), z - nz * (dd + 3));
        const larg = dg + dd, boulevard = pg || pd; if (larg < mini && !boulevard) continue;                                      // une chaussée le long d'un terre-plein : c'est un boulevard
        const tw = Math.max(boulevard ? 5 : 0, trottoir(demi(x, z)));
        for (const [d, sx, sz, tp] of [[dg, nx, nz, pg], [dd, -nx, -nz, pd]]) { if (d === Infinity) continue;
          if (tp) { if (!tp.nu) poser(x + sx * (d + 2.4), z + sz * (d + 2.4), true); continue; }                                    // sur le terre-plein, pas dans la chaussée
          if (tw < 3 || d < tw - BORD + 1.5) continue;
          poser(x + sx * (d - tw + BORD), z + sz * (d - tw + BORD));
          if (tw >= 7.5) poser(x + sx * (d - tw + BORD + RANG), z + sz * (d - tw + BORD + RANG)); }
      }
      reste -= L;
    }
  }
  // un arbre : houppier (icosaèdre) et tronc, à sommets partagés — vingt sommets par arbre, pour en planter des dizaines
  // de milliers ; un maillage instancié par dalle, écarté quand il sort du champ
  const t = (1 + Math.sqrt(5)) / 2, ICO = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  const FACES = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
  const pos = [], nor = [], col = [], idx = FACES.slice(), RX = 2.5, RY = 3.2, CY = 6.3, HT = 4.2;
  for (const v of ICO) { const l = Math.hypot(v[0], v[1], v[2]), x = v[0] / l, y = v[1] / l, z = v[2] / l, nl = Math.hypot(x / RX, y / RY, z / RX); pos.push(x * RX, CY + y * RY, z * RX); nor.push(x / RX / nl, y / RY / nl, z / RX / nl); col.push(1, 1, 1); }
  for (let k = 0; k < 4; k++) { const a = (k / 4) * 2 * Math.PI + Math.PI / 4, cx = Math.cos(a), cz = Math.sin(a); pos.push(cx * 0.23, 0, cz * 0.23, cx * 0.17, HT, cz * 0.17); nor.push(cx, 0, cz, cx, 0, cz); col.push(0.34, 0.27, 0.2, 0.34, 0.27, 0.2); }
  for (let k = 0; k < 4; k++) { const a = 12 + k * 2, b = 12 + ((k + 1) % 4) * 2; idx.push(a, a + 1, b + 1, a, b + 1, b); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3)); geo.setIndex(idx);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), meshes = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  for (const l of tuiles.values()) {
    const mesh = new THREE.InstancedMesh(geo, mat, l.length / 3);
    for (let i = 0; i < l.length / 3; i++) { const h = Math.abs(Math.sin(l[i * 3] * 12.9898 + l[i * 3 + 2] * 78.233) * 43758.5453) % 1, k = 0.92 + h * 0.2;
      p.set(l[i * 3], l[i * 3 + 1] - 0.1, l[i * 3 + 2]); s.set(k, k, k); q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, h * 6.28);
      mesh.setMatrixAt(i, m.compose(p, q, s)); mesh.setColorAt(i, c.setRGB(0.27 + h * 0.1, 0.43 + h * 0.1, 0.19 + h * 0.05, THREE.SRGBColorSpace)); }
    mesh.castShadow = !app.mobile; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; mesh.computeBoundingSphere(); app.scene.add(mesh); meshes.push(mesh);
  }
  const echantillon = []; { let k = 0; for (const l of tuiles.values()) for (let i = 0; i < l.length; i += 3) if (k++ % 40 === 0) echantillon.push([l[i], l[i + 2]]); }
  const tous = () => { const o = []; for (const l of tuiles.values()) for (let i = 0; i < l.length; i += 3) o.push([l[i], l[i + 2]]); return o; };
  return { n, meshes, tris: (n * idx.length) / 3, echantillon, tous };
}
