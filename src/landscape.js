// Habillage : arbres, bateaux, fumées des cheminées, ailes des moulins, cimetières et fontaines.
import * as THREE from 'three';
import { FRAME, layer, polys, circles, LABELS } from './data.js';
import { LU } from './raster.js';
import { mulberry32, hash2, polyArea, centroid, dpRing, pointInPoly } from './geom.js';
import { rgb, tint, box, cyl, cone, rectCorners, ccw } from './builder.js';
import { COL, wallLine } from './special.js';
import { WORLD } from './terrain.js';

// ---------------------------------------------------------------- arbres (instances)
function treeGeometry() {
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const p = ico.attributes.position, pos = [], nor = [], col = [];
  const r = mulberry32(3);
  const bump = new Map();
  const key = (x, y, z) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = key(x, y, z);
    if (!bump.has(k)) bump.set(k, 0.82 + r() * 0.36);
    const f = bump.get(k);
    const l = Math.hypot(x, y, z);
    nor.push(x / l, y / l * 0.9 + 0.1, z / l);
    x *= f * 1.6; y *= f * 1.5; z *= f * 1.6;
    pos.push(x, y + 2.05, z);
    const s = 0.55 + 0.45 * (y / 1.5 * 0.5 + 0.5);
    col.push(0.2 * s, 0.31 * s, 0.13 * s);
  }
  // tronc
  const seg = 5;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * 6.283, a1 = ((i + 1) / seg) * 6.283, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), rb = 0.22, rt = 0.15, h = 1.3;
    const q = [[c1 * rb, 0, s1 * rb], [c0 * rb, 0, s0 * rb], [c0 * rt, h, s0 * rt], [c1 * rb, 0, s1 * rb], [c0 * rt, h, s0 * rt], [c1 * rt, h, s1 * rt]];
    const nn = [[c1, 0, s1], [c0, 0, s0], [c0, 0, s0], [c1, 0, s1], [c0, 0, s0], [c1, 0, s1]];
    for (let k = 0; k < 6; k++) { pos.push(q[k][0], q[k][1], q[k][2]); nor.push(nn[k][0], nn[k][1], nn[k][2]); col.push(0.2, 0.15, 0.1); }
  }
  // sens des triangles du tronc : vers l'extérieur
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export function buildTrees(app) {
  const lu = app.lu, occ = app.solid, T = app.terrain, r = mulberry32(555);
  const spots = [];
  const clear = app.clearings || [];
  const add = (x, z, s, kind) => { for (const c of clear) if ((x - c[0]) * (x - c[0]) + (z - c[1]) * (z - c[1]) < c[2] * c[2]) return; const y = T.height(x, z); if (y < 0.6) return; spots.push(x, y, z, s, kind); };
  // dans le cadre du plan : jardins, cœurs d'îlot, vergers, haies, prés des îles
  const step = 6.5;
  for (let z = FRAME.z0 + 3; z < FRAME.z1 - 3; z += step) for (let x = FRAME.x0 + 3; x < FRAME.x1 - 3; x += step) {
    const px = x + (r() - 0.5) * step, pz = z + (r() - 0.5) * step, c = lu.get(px, pz), q = r();
    if (c === LU.OPEN || c === LU.WATER || c === LU.RES || c === LU.BRIDGE || c === LU.BANK) continue;
    if (occ.get(px, pz)) continue;
    let p = 0, s = 1.5 + r() * 1.3, kind = 0;
    if (c === LU.GARDEN) p = 0.2;
    else if (c === LU.BATI) { p = 0.09; if (occ.get(px + 2.5, pz) || occ.get(px - 2.5, pz) || occ.get(px, pz + 2.5) || occ.get(px, pz - 2.5)) p = 0.05; s *= 0.8; }
    else if (c === LU.CEMETERY) p = 0.05;
    else if (c === LU.COURT) p = 0.045;
    else if (c === LU.ISLAND) { p = 0.05; kind = 1; }
    else if (c === LU.FIELD || c === LU.OUT) {
      // un verger toutes les quelques parcelles, sinon arbres isolés et haies
      const gi = Math.floor(px / 46), gj = Math.floor(pz / 46), h = hash2(gi * 7 + 3, gj * 11 + 5);
      if (h < 0.11) { p = 0.3; s *= 0.62; } else p = 0.014;
      if (T.sdWater(px, pz) > -30) { p = 0.12; kind = 1; }
    }
    if (q < p) add(px, pz, s, kind);
  }
  // campagne : bois (taches sombres de la carte) et arbres épars
  const woods = [[6200, 1700, 1700], [-7400, -1300, 1500], [-5200, 5200, 1700], [3800, -6200, 1300], [-2500, -7200, 1100], [7600, -3500, 1500], [600, 7200, 1500], [-7800, 3200, 1200], [2600, -2600, 500], [-500, -3850, 260]];
  for (const [cx, cz, rad] of woods) { const n = Math.round(rad * rad * 0.0006); for (let i = 0; i < n; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * rad * 1.05; add(cx + Math.cos(a) * d, cz + Math.sin(a) * d, 3.2 + r() * 2.6, 0); } }
  for (let i = 0; i < 3400; i++) {
    const a = r() * 6.283, d = 1500 + Math.pow(r(), 0.7) * 5200, x = Math.cos(a) * d, z = Math.sin(a) * d - 300;
    if (x > FRAME.x0 && x < FRAME.x1 && z > FRAME.z0 && z < FRAME.z1) continue;
    if (T.sdWater(x, z) > -8) continue;
    add(x, z, 1.8 + r() * 2.2, r() < 0.2 ? 1 : 0);
  }
  // répartition en dalles pour l'élagage par le champ de vision
  const TILE = 900, tiles = new Map();
  for (let i = 0; i < spots.length; i += 5) { const k = Math.floor(spots[i] / TILE) + '|' + Math.floor(spots[i + 2] / TILE); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(i); }
  const geo = treeGeometry();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c3 = new THREE.Color();
  const group = new THREE.Group();
  for (const list of tiles.values()) {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((i, n) => {
      const s = spots[i + 3], kind = spots[i + 4];
      q4.setFromAxisAngle(up, r() * 6.283);
      v3.set(spots[i], spots[i + 1] - 0.15, spots[i + 2]);
      if (kind === 1) s3.set(s * 0.72, s * 1.3, s * 0.72); else s3.set(s * (0.9 + r() * 0.35), s * (0.85 + r() * 0.4), s * (0.9 + r() * 0.35));
      m4.compose(v3, q4, s3); im.setMatrixAt(n, m4);
      const k = 0.78 + r() * 0.4, w = r();
      c3.setRGB(k * (0.92 + w * 0.3), k * (1.0 + w * 0.06), k * (0.86 - w * 0.2)); im.setColorAt(n, c3);
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere();
    group.add(im);
  }
  app.scene.add(group);
  app.treeCount = spots.length / 5;
  return group;
}

// ---------------------------------------------------------------- bateaux
function boat(B, x, z, ang, len, wd, o = {}) {
  const b = B.at('plain', x, z), ux = Math.cos(ang), uz = Math.sin(ang), nx = -uz, nz = ux, col = o.col ?? rgb(96, 72, 50);
  const P = (a, c) => [x + ux * a + nx * c, z + uz * a + nz * c];
  const hl = len / 2, hw = wd / 2, y0 = -0.25, y1 = o.free ?? 0.75;
  const ring = [P(-hl, 0), P(-hl * 0.6, -hw), P(hl * 0.55, -hw), P(hl, 0), P(hl * 0.55, hw), P(-hl * 0.6, hw)];
  const rr = ccw(ring);
  for (let i = 0; i < rr.length; i++) { const a = rr[i], c = rr[(i + 1) % rr.length]; b.quad(c[0], y0, c[1], a[0], y0, a[1], a[0], y1, a[1], c[0], y1, c[1], 0, 0, 1, 1, col, 0.7, 1); }
  // fond (plancher ou cargaison)
  const fy = o.cargo ? y1 + 0.35 : y1 - 0.4, fc = o.cargo ? o.cargo : tint(col, 0.7);
  const a = P(-hl * 0.6, -hw), c = P(hl * 0.55, -hw), d = P(hl * 0.55, hw), e = P(-hl * 0.6, hw), f = P(hl, 0), g = P(-hl, 0);
  b.quad(a[0], fy, a[1], e[0], fy, e[1], d[0], fy, d[1], c[0], fy, c[1], 0, 0, 1, 1, fc);
  b.tri(c[0], fy, c[1], d[0], fy, d[1], f[0], y1 - 0.2, f[1], 0, 0, 1, 0, 0.5, 1, tint(col, 0.75));
  b.tri(e[0], fy, e[1], a[0], fy, a[1], g[0], y1 - 0.2, g[1], 0, 0, 1, 0, 0.5, 1, tint(col, 0.75));
  if (o.mast) {
    cyl(b, x, z, 0.12, y1 - 0.4, y1 + o.mast, { seg: 5, col: rgb(70, 54, 40) });
    // voile carguée sur sa vergue
    box(b, { cx: x, cz: z, ux: nx, uz: nz, hl: wd * 0.85, hw: 0.16 }, y1 + o.mast * 0.78, y1 + o.mast * 0.78 + 0.32, { col: rgb(214, 204, 180) });
  }
}

export function buildBoats(app, B) {
  const T = app.terrain, r = mulberry32(88);
  const tangent = (x, z) => { const e = 3, gx = T.sdWater(x + e, z) - T.sdWater(x - e, z), gz = T.sdWater(x, z + e) - T.sdWater(x, z - e); return Math.atan2(gx, -gz); };
  // ports : chalands tirés contre la grève
  const ports = (LABELS.divers || []).filter((l) => /^Port/.test(l.t)).map((l) => l.p);
  ports.push([20, -330], [-560, -640], [-180, -470], [330, -120], [-700, -560], [-80, 130]);
  let n = 0;
  for (const [px, pz] of ports) {
    for (let k = 0; k < 9; k++) {
      let found = null;
      for (let t = 0; t < 30 && !found; t++) { const x = px + (r() - 0.5) * 150, z = pz + (r() - 0.5) * 150, sd = T.sdWater(x, z); if (sd > 3.5 && sd < 13) found = [x, z]; }
      if (!found) continue;
      const big = r() < 0.55;
      boat(B, found[0], found[1], tangent(found[0], found[1]) + (r() - 0.5) * 0.3, big ? 13 + r() * 6 : 5 + r() * 2.5, big ? 3.6 + r() : 1.5 + r() * 0.5, { cargo: big && r() < 0.6 ? (r() < 0.5 ? rgb(196, 176, 110) : rgb(150, 120, 90)) : null, mast: big && r() < 0.5 ? 7 + r() * 3 : 0 });
      n++;
    }
  }
  // barques au fil de l'eau
  for (let i = 0; i < 40; i++) { const x = FRAME.x0 + 100 + r() * (FRAME.x1 - FRAME.x0 - 200), z = -900 + r() * 2000; if (T.sdWater(x, z) > 22) { boat(B, x, z, tangent(x, z) + (r() - 0.5) * 0.5, 5 + r() * 9, 1.6 + r() * 1.8, { mast: r() < 0.3 ? 6 : 0 }); n++; } }
  // pontons portant les chaînes qui barrent le fleuve
  for (const c of app.chainBoats) boat(B, c[0], c[1], tangent(c[0], c[1]), 9, 3.2, { col: rgb(80, 62, 46) });
  const chain = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], c = pts[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]); box(B.at('plain', a[0], a[1]), { cx: (a[0] + c[0]) / 2, cz: (a[1] + c[1]) / 2, ux: (c[0] - a[0]) / L, uz: (c[1] - a[1]) / L, hl: L / 2, hw: 0.12 }, 0.9, 1.15, { col: rgb(52, 50, 50) }); } };
  for (const s of layer('Chaines')) if (s.pts.length >= 2) chain(s.pts);
  return n;
}

// ---------------------------------------------------------------- cimetières, fontaines, piloris
export function buildSmallThings(app, B) {
  const T = app.terrain, r = mulberry32(31);
  for (const s of [...layer('Cimetieres'), ...layer('CimetieresJuifs')]) {
    if (s.kind !== 'poly') continue;
    const ring = dpRing(s.pts, 0.5); if (ring.length < 3) continue;
    wallLine(app, B, [...ring, ring[0]], 2.3, 0.5, { col: COL.stoneGrey });
    const A = Math.abs(polyArea(ring)), c = centroid(ring), n = Math.min(60, Math.round(A / 55));
    const pl = B.at('plain', c[0], c[1]);
    for (let i = 0; i < n * 4 && i < 400; i++) {
      const x = c[0] + (r() - 0.5) * Math.sqrt(A) * 1.6, z = c[1] + (r() - 0.5) * Math.sqrt(A) * 1.6;
      if (!pointInPoly(x, z, ring) || app.solid.get(x, z)) continue;
      const y = T.height(x, z);
      box(pl, { cx: x, cz: z, ux: 1, uz: 0, hl: 0.07, hw: 0.07 }, y, y + 1.3, { col: COL.woodDark, top: false });
      box(pl, { cx: x, cz: z, ux: 1, uz: 0, hl: 0.34, hw: 0.07 }, y + 0.85, y + 1.0, { col: COL.woodDark });
    }
  }
  app.fountains = [];
  for (const s of circles('Fontaines')) {
    const [x, z] = s.pts[0], y = T.height(x, z), st = B.at('stone', x, z);
    cyl(st, x, z, 2.0, y - 0.2, y + 0.9, { seg: 8, col: COL.stone });
    const pl = B.at('plain', x, z);
    for (let i = 0; i < 8; i++) { const a0 = (i / 8) * 6.283, a1 = ((i + 1) / 8) * 6.283; pl.tri(x, y + 0.7, z, x + Math.cos(a1) * 1.9, y + 0.7, z + Math.sin(a1) * 1.9, x + Math.cos(a0) * 1.9, y + 0.7, z + Math.sin(a0) * 1.9, 0, 0, 1, 0, 0, 1, rgb(70, 110, 120)); }
    cyl(st, x, z, 0.45, y + 0.6, y + 3.4, { seg: 6, col: COL.stone }); cone(st, x, z, 0.75, y + 3.4, y + 5, { seg: 6, col: COL.stone });
    app.solid.fillCircle(x, z, 2, 2);
    app.fountains.push([x, z]);
  }
  // murets des limites de parcelles (cultures et jardins)
  for (const s of layer('Parcelles')) if (s.kind !== 'circle' && s.pts.length >= 2) wallLine(app, B, s.kind === 'poly' ? [...s.pts, s.pts[0]] : s.pts, 1.5, 0.4, { col: rgb(196, 188, 170) });
}

// ---------------------------------------------------------------- fumées
export function buildSmoke(app) {
  const src = app.chimneys, N0 = Math.min(700, Math.floor(src.length / 3)), PER = 7, N = N0 * PER;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N), r = mulberry32(9);
  const stepI = Math.max(1, Math.floor(src.length / 3 / N0));
  for (let i = 0; i < N0; i++) {
    const k = i * stepI * 3;
    for (let j = 0; j < PER; j++) { const n = i * PER + j; pos[n * 3] = src[k]; pos[n * 3 + 1] = src[k + 1]; pos[n * 3 + 2] = src[k + 2]; seed[n] = r() * 100 + j / PER; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -300), 3000);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uCol: { value: new THREE.Color(0.75, 0.75, 0.78) }, uOpacity: { value: 0.3 } },
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA;
      void main(){
        float t = fract(aSeed + uTime * 0.045);
        vec3 p = position + vec3(t * t * 14.0 + sin(aSeed * 7.0 + t * 5.0) * 1.2 * t, t * 13.0, t * 5.0 + cos(aSeed * 3.0 + t * 4.0) * 1.2 * t);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(46.0, uScale * (0.7 + t * 3.2) / -mv.z);
        vA = sin(t * 3.14159) * smoothstep(1800.0, 300.0, -mv.z) * smoothstep(25.0, 140.0, -mv.z);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol; uniform float uOpacity; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vA * uOpacity; if (a < 0.004) discard; gl_FragColor = vec4(uCol, a); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.renderOrder = 5;
  app.scene.add(pts);
  return pts;
}

// ---------------------------------------------------------------- ailes des moulins
export function buildMillSails(app) {
  const mills = (app.monuments.mills || []), out = [];
  const g = new THREE.BufferGeometry(), pos = [], nor = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const q = [[0.4, 0.6], [0.4, 7], [-1.3, 7], [-1.3, 1.6]].map(([u, v]) => [u * c - v * s, u * s + v * c]);
    for (const [i, j, l] of [[0, 1, 2], [0, 2, 3]]) { pos.push(q[i][0], q[i][1], 0, q[j][0], q[j][1], 0, q[l][0], q[l][1], 0); nor.push(0, 0, 1, 0, 0, 1, 0, 0, 1); }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const mat = new THREE.MeshStandardMaterial({ color: 0xcbbf9f, roughness: 0.9, side: THREE.DoubleSide });
  for (const m of mills) {
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(m.x, m.y, m.z);
    mesh.rotation.y = Math.atan2(m.ux, m.uz);
    mesh.castShadow = true;
    const holder = new THREE.Group(); holder.add(mesh); app.scene.add(holder);
    out.push(mesh);
  }
  return out;
}

export { WORLD };
