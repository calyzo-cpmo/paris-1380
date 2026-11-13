// Habitants : personnages articulés instanciés. Foule mobile entretenue autour de la caméra,
// figurants fixes (marchands, gardes, moines, ouvriers), cavaliers, charrettes, bêtes des rues et troupeaux.
import * as THREE from 'three';
import { FRAME } from './data.js';
import { LU } from './raster.js';
import { mulberry32, clamp } from './geom.js';

const lin = (v) => Math.pow(v / 255, 2.2);
const C = (r, g, b) => [lin(r), lin(g), lin(b)];
const SKIN = C(214, 170, 138), HOSE = C(72, 60, 52), WOODC = C(112, 86, 60), HORSE = C(96, 66, 44), DARKC = C(48, 42, 40);

// Petit constructeur de maillage : boîtes effilées et roues, avec pour chaque partie un « membre »
// [balancement, hauteur du pivot, part de teinte] exploité par le shader d'animation.
export class Mesh3 {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.lim = []; }
  tri(a, b, c, col, lim) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const p of [a, b, c]) { this.pos.push(p[0], p[1], p[2]); this.nor.push(nx, ny, nz); this.col.push(col[0], col[1], col[2]); this.lim.push(lim[0], lim[1], lim[2]); }
  }
  quad(a, b, c, d, col, lim) { this.tri(a, b, c, col, lim); this.tri(a, c, d, col, lim); }
  // boîte effilée : base (demi-tailles bx, bz) à y0, sommet (tx, tz) à y1 ; caps : 1 dessus, 2 dessous
  box(x, y0, y1, z, bx, bz, tx, tz, col, lim = [0, 0, 0], caps = 3) {
    const p = [[x - bx, y0, z - bz], [x + bx, y0, z - bz], [x + bx, y0, z + bz], [x - bx, y0, z + bz], [x - tx, y1, z - tz], [x + tx, y1, z - tz], [x + tx, y1, z + tz], [x - tx, y1, z + tz]];
    this.quad(p[1], p[0], p[4], p[5], col, lim); this.quad(p[3], p[2], p[6], p[7], col, lim);
    this.quad(p[2], p[1], p[5], p[6], col, lim); this.quad(p[0], p[3], p[7], p[4], col, lim);
    if (caps & 1) this.quad(p[4], p[7], p[6], p[5], col, lim);
    if (caps & 2) this.quad(p[0], p[1], p[2], p[3], col, lim);
  }
  // roue : prisme octogonal d'axe x
  wheel(x, y, z, r, w, col) {
    const n = 8, L = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 6.2832, a1 = ((i + 1) / n) * 6.2832, y0 = y + Math.cos(a0) * r, z0 = z + Math.sin(a0) * r, y1 = y + Math.cos(a1) * r, z1 = z + Math.sin(a1) * r;
      this.quad([x - w, y0, z0], [x + w, y0, z0], [x + w, y1, z1], [x - w, y1, z1], col, L);
      this.tri([x + w, y, z], [x + w, y1, z1], [x + w, y0, z0], col, L); this.tri([x - w, y, z], [x - w, y0, z0], [x - w, y1, z1], col, L);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); g.setAttribute('aLimb', new THREE.Float32BufferAttribute(this.lim, 3));
    g.computeBoundingSphere();
    return g;
  }
}

const W = [1, 1, 1];
function manGeo() {
  const m = new Mesh3();
  for (const s of [-1, 1]) m.box(s * 0.085, 0, 0.88, 0, 0.062, 0.085, 0.078, 0.088, HOSE, [s, 0.88, 0.25], 2);
  m.box(0, 0.56, 1.0, 0, 0.2, 0.14, 0.17, 0.115, W, [0, 0, 1], 2);           // jupe de la cotte
  m.box(0, 1.0, 1.44, 0, 0.17, 0.115, 0.215, 0.125, W, [0, 0, 1], 1);         // buste
  m.box(0, 0.98, 1.04, 0, 0.18, 0.125, 0.18, 0.125, DARKC, [0, 0, 0], 0);     // ceinture
  for (const s of [-1, 1]) {
    m.box(s * 0.265, 0.86, 1.43, 0, 0.045, 0.05, 0.056, 0.062, [0.9, 0.9, 0.9], [-s * 0.7, 1.4, 1], 0);
    m.box(s * 0.265, 0.77, 0.86, 0, 0.04, 0.045, 0.042, 0.047, SKIN, [-s * 0.7, 1.4, 0], 2);
  }
  m.box(0, 1.44, 1.72, 0.012, 0.075, 0.088, 0.082, 0.092, SKIN, [0, 0, 0], 0);    // tête
  m.box(0, 1.63, 1.77, -0.012, 0.098, 0.108, 0.07, 0.078, [0.62, 0.62, 0.62], [0, 0, 0.75], 1);   // chaperon
  m.box(0, 1.42, 1.66, -0.075, 0.094, 0.045, 0.098, 0.05, [0.62, 0.62, 0.62], [0, 0, 0.75], 0);
  return m.geometry();
}
function robeGeo() {
  const m = new Mesh3();
  m.box(0, 0.02, 1.0, 0, 0.27, 0.23, 0.165, 0.115, W, [0.1, 1.0, 1], 0);        // robe
  m.box(0, 1.0, 1.44, 0, 0.165, 0.115, 0.2, 0.12, W, [0, 0, 1], 1);
  for (const s of [-1, 1]) {
    m.box(s * 0.25, 0.9, 1.43, 0, 0.06, 0.065, 0.058, 0.062, [0.92, 0.92, 0.92], [-s * 0.35, 1.4, 1], 0);
    m.box(s * 0.25, 0.82, 0.9, 0, 0.038, 0.042, 0.04, 0.045, SKIN, [-s * 0.35, 1.4, 0], 2);
  }
  m.box(0, 1.44, 1.7, 0.012, 0.072, 0.085, 0.08, 0.09, SKIN, [0, 0, 0], 0);
  m.box(0, 1.6, 1.75, -0.01, 0.1, 0.108, 0.075, 0.08, [0.95, 0.95, 0.95], [0, 0, 0.55], 1);   // voile ou capuchon
  m.box(0, 1.36, 1.64, -0.07, 0.11, 0.05, 0.1, 0.05, [0.95, 0.95, 0.95], [0, 0, 0.55], 0);
  return m.geometry();
}
function horseParts(m, zo, tintCoat) {
  const col = tintCoat ? W : HORSE, t = tintCoat ? 1 : 0;
  m.box(0, 0.95, 1.52, zo, 0.25, 0.74, 0.23, 0.7, col, [0, 0, t], 3);
  m.box(0, 1.3, 1.98, zo + 0.74, 0.1, 0.17, 0.085, 0.12, col, [0, 0, t], 0);
  m.box(0, 1.74, 2.0, zo + 0.98, 0.085, 0.2, 0.075, 0.17, col, [0, 0, t], 3);
  m.box(0, 0.9, 1.45, zo - 0.78, 0.04, 0.04, 0.05, 0.05, DARKC, [0, 0, 0], 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.box(sx * 0.16, 0, 0.98, zo + sz * 0.55, 0.05, 0.055, 0.07, 0.08, col, [sx * sz * 0.8, 0.98, t * 0.8], 2);
}
function beastGeo() { const m = new Mesh3(); horseParts(m, 0, true); return m.geometry(); }
function riderGeo() {
  const m = new Mesh3(); horseParts(m, 0, false);
  m.box(0, 1.5, 2.06, -0.05, 0.19, 0.12, 0.22, 0.13, W, [0, 0, 1], 1);
  for (const s of [-1, 1]) m.box(s * 0.27, 1.02, 1.56, 0.06, 0.07, 0.09, 0.08, 0.1, HOSE, [0, 0, 0.3], 2);
  m.box(0, 2.06, 2.32, -0.04, 0.075, 0.088, 0.082, 0.092, SKIN, [0, 0, 0], 0);
  m.box(0, 2.24, 2.38, -0.05, 0.1, 0.108, 0.07, 0.078, [0.6, 0.6, 0.6], [0, 0, 0.7], 1);
  return m.geometry();
}
function cartGeo() {
  const m = new Mesh3(); horseParts(m, 2.3, false);
  m.box(0, 0.78, 1.3, -0.5, 0.72, 1.35, 0.78, 1.4, WOODC, [0, 0, 0], 2);
  m.box(0, 1.3, 1.95, -0.6, 0.62, 1.15, 0.4, 0.85, W, [0, 0, 1], 1);                    // chargement
  for (const s of [-1, 1]) { m.wheel(s * 0.86, 0.6, -0.5, 0.6, 0.05, C(70, 54, 40)); m.box(s * 0.36, 1.0, 1.08, 1.3, 0.03, 0.9, 0.03, 0.9, WOODC, [0, 0, 0], 3); }
  m.box(0, 1.3, 1.86, 0.62, 0.17, 0.11, 0.2, 0.12, C(110, 92, 70), [0, 0, 0], 1);        // charretier
  m.box(0, 1.86, 2.1, 0.63, 0.075, 0.085, 0.08, 0.09, SKIN, [0, 0, 0], 3);
  return m.geometry();
}
function sheepGeo() {
  const m = new Mesh3();
  m.box(0, 0.36, 0.78, 0, 0.17, 0.36, 0.16, 0.33, W, [0, 0, 1], 3);
  m.box(0, 0.52, 0.8, 0.43, 0.07, 0.1, 0.062, 0.088, [0.5, 0.5, 0.5], [0, 0, 0.6], 3);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.box(sx * 0.1, 0, 0.4, sz * 0.24, 0.03, 0.03, 0.036, 0.036, DARKC, [sx * sz * 0.6, 0.4, 0], 2);
  return m.geometry();
}

// Matériau commun : balancement des membres dans le vertex shader, teinte d'instance limitée aux vêtements.
function peopleMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aLimb;\nattribute vec2 aAnim;')
      .replace('#include <color_vertex>', 'vColor = color;\n#ifdef USE_INSTANCING_COLOR\n vColor *= mix(vec3(1.0), instanceColor.xyz, aLimb.z);\n#endif')
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
        float swg = sin(aAnim.x) * aAnim.y * aLimb.x;
        float cs = cos(swg), sn = sin(swg);
        vec2 dd = transformed.yz - vec2(aLimb.y, 0.0);
        transformed.yz = vec2(aLimb.y, 0.0) + vec2(dd.x * cs - dd.y * sn, dd.x * sn + dd.y * cs);
        transformed.y += abs(sin(aAnim.x)) * 0.022 * aAnim.y;`);
  };
  mat.customProgramCacheKey = () => 'people-v1';
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

const srgb = (c, r, g, b) => c.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
const CLOTH = [[120, 96, 70], [140, 118, 90], [96, 84, 70], [160, 140, 110], [110, 100, 92], [86, 70, 56], [132, 108, 84], [150, 128, 96], [52, 70, 120], [70, 98, 140], [140, 44, 38], [170, 76, 52], [64, 98, 60], [92, 112, 60], [178, 140, 60], [96, 60, 100], [206, 198, 180], [44, 42, 44]];
const DRESS = [[150, 60, 52], [70, 96, 142], [86, 118, 72], [186, 150, 70], [128, 78, 120], [200, 190, 170], [132, 104, 78], [104, 92, 84], [170, 110, 80], [48, 60, 104], [36, 34, 36], [36, 34, 36], [214, 208, 196], [98, 84, 70], [120, 60, 44]];
const COATS = [[96, 66, 44], [58, 44, 36], [150, 140, 128], [120, 84, 52], [40, 36, 34], [176, 150, 112]];
const LOADS = [[196, 176, 110], [150, 120, 90], [120, 100, 80], [200, 190, 170], [110, 84, 60]];
const WOOL = [[226, 220, 204], [210, 202, 184], [236, 230, 216], [92, 80, 70]];
const PIGS = [[196, 150, 136], [150, 118, 100], [96, 76, 60], [70, 58, 50], [176, 160, 140]];
const CATTLE = [[120, 76, 48], [172, 130, 90], [60, 46, 38], [204, 190, 168], [140, 96, 60]];

const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

// Un bassin d'agents du même type, rendus par un InstancedMesh.
class Pool {
  constructor(sys, geo, n, o) {
    this.sys = sys; this.n = n; this.o = o; this.active = 0;
    const g = geo.clone();
    this.anim = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2); this.anim.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aAnim', this.anim);
    this.mesh = new THREE.InstancedMesh(g, sys.mat, n);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.blob = new THREE.InstancedMesh(blobGeo(o.blob[0], o.blob[1]), sys.blobMat, n);
    this.blob.instanceMatrix = this.mesh.instanceMatrix; this.blob.frustumCulled = false; this.blob.renderOrder = 1;
    this.x = new Float32Array(n); this.z = new Float32Array(n); this.y = new Float32Array(n); this.h = new Float32Array(n); this.th = new Float32Array(n);
    this.sp = new Float32Array(n); this.ph = new Float32Array(n); this.st = new Float32Array(n); this.sc = new Float32Array(n); this.jt = new Float32Array(n); this.ok = new Uint8Array(n); this.bias = new Int8Array(n);
    const r = sys.r, col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const p = o.palette[(r() * o.palette.length) | 0], k = 1.05 + r() * 0.3;
      srgb(col, Math.min(255, p[0] * k), Math.min(255, p[1] * k), Math.min(255, p[2] * k)); this.mesh.setColorAt(i, col);
      this.sc[i] = o.scale[0] + r() * (o.scale[1] - o.scale[0]); if (o.kids && r() < o.kids) this.sc[i] *= 0.66;
      this.sp[i] = o.speed[0] + r() * (o.speed[1] - o.speed[0]); this.bias[i] = r() < 0.5 ? 1 : -1; this.ph[i] = r() * 6.28; this.jt[i] = 2 + r() * 6;
    }
    this.mesh.instanceColor.needsUpdate = true;
    this.mesh.count = 0; this.blob.count = 0;
    sys.group.add(this.mesh, this.blob);
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
  update(dt, cx, cz, R, want, first) {
    const s = this.sys, r = s.r, o = this.o, A = Math.min(this.n, want), m = this.mesh.instanceMatrix.array, an = this.anim.array;
    const R2 = (R + 40) * (R + 40), probe = o.probe, side = o.side;
    for (let i = 0; i < A; i++) {
      let x = this.x[i], z = this.z[i];
      const ddx = x - cx, ddz = z - cz;
      if (!this.ok[i] || ddx * ddx + ddz * ddz > R2) { this.spawn(i, cx, cz, R, !first); x = this.x[i]; z = this.z[i]; }
      let amp = 0;
      if (this.ok[i]) {
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
      }
      const k = i * 16, sc = this.ok[i] ? this.sc[i] : 0, c = Math.cos(this.h[i]) * sc, sn = Math.sin(this.h[i]) * sc;
      m[k] = c; m[k + 1] = 0; m[k + 2] = -sn; m[k + 3] = 0; m[k + 4] = 0; m[k + 5] = sc; m[k + 6] = 0; m[k + 7] = 0; m[k + 8] = sn; m[k + 9] = 0; m[k + 10] = c; m[k + 11] = 0;
      m[k + 12] = x; m[k + 13] = this.y[i]; m[k + 14] = z; m[k + 15] = 1;
      an[i * 2] = this.ph[i]; an[i * 2 + 1] = amp;
    }
    this.mesh.count = A; this.blob.count = A; this.active = A;
    this.mesh.instanceMatrix.needsUpdate = true; this.anim.needsUpdate = true;
  }
}

export class People {
  constructor(app) {
    this.app = app; this.r = mulberry32(2024); this.enabled = true; this.first = true;
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
    this.mat = peopleMaterial();
    this.blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, color: 0x000000, opacity: 0.42, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.group = new THREE.Group(); app.scene.add(this.group);
    const q = app.mobile ? 0.3 : 1;
    this.geos = { man: manGeo(), robe: robeGeo(), beast: beastGeo(), rider: riderGeo(), cart: cartGeo(), sheep: sheepGeo() };
    this.pools = [
      new Pool(this, this.geos.man, Math.round(2400 * q), { palette: CLOTH, scale: [0.94, 1.08], kids: 0.07, speed: [1.1, 1.6], probe: 1.7, side: 1.3, stride: 4.6, amp: 0.55, idle: 0.1, blob: [0.36, 0.3], share: 0.5 }),
      new Pool(this, this.geos.robe, Math.round(1700 * q), { palette: DRESS, scale: [0.9, 1.03], kids: 0.05, speed: [0.85, 1.25], probe: 1.7, side: 1.3, stride: 5.0, amp: 0.5, idle: 0.14, blob: [0.38, 0.34], share: 0.36 }),
      new Pool(this, this.geos.sheep, Math.round(420 * q), { palette: PIGS, scale: [0.62, 0.95], speed: [0.5, 1.1], probe: 1.4, side: 1.0, stride: 9, amp: 0.5, idle: 0.3, blob: [0.3, 0.5], share: 0.07 }),
      new Pool(this, this.geos.rider, Math.round(190 * q), { palette: CLOTH, scale: [0.96, 1.06], speed: [1.7, 2.6], probe: 4.2, side: 2.2, stride: 2.6, amp: 0.5, idle: 0.04, wide: true, turn: 1.6, blob: [0.5, 1.2], share: 0.04 }),
      new Pool(this, this.geos.cart, Math.round(130 * q), { palette: LOADS, scale: [0.95, 1.05], speed: [1.0, 1.5], probe: 5.5, side: 2.4, stride: 2.8, amp: 0.45, idle: 0.08, wide: true, turn: 0.9, blob: [1.0, 2.6], share: 0.03 }),
    ];
    this.total = this.pools.reduce((s, p) => s + p.n, 0);
    this.count = 0;
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
    const show = this.enabled && dist < 1500;
    if (this.group.visible !== show) this.group.visible = show;
    if (!show) { this.count = 0; return; }
    const cx = walk ? rig.walk.x : rig.target.x, cz = walk ? rig.walk.z : rig.target.z;
    const R = walk ? 250 : clamp(dist * 0.8, 170, 520);
    // densité visée : un passant pour ~26 m² de voie (les rues couvrent environ un cinquième de la ville), moins la nuit
    const want = clamp((Math.PI * R * R * 0.2) / 26, 250, this.total) * (0.12 + 0.88 * app.sky.day) * (app.crowdScale || 1);
    let n = 0;
    for (const p of this.pools) { p.update(dt, cx, cz, R, Math.round(want * p.o.share), this.first); n += p.active; }
    this.blobMat.opacity = 0.14 + 0.3 * app.sky.day;
    this.count = n; this.first = false;
  }

  // Figurants fixes : liste de [x, z, cap, 'man' | 'robe', couleur [r,g,b] ou null, y ou null].
  addStatics(list) {
    const col = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), s = new THREE.Vector3();
    for (const kind of ['man', 'robe', 'beast', 'sheep']) {
      const items = list.filter((f) => f[3] === kind); if (!items.length) continue;
      const g = this.geos[kind].clone();
      g.setAttribute('aAnim', new THREE.InstancedBufferAttribute(new Float32Array(items.length * 2), 2));
      const im = new THREE.InstancedMesh(g, this.mat, items.length);
      const pal = kind === 'man' ? CLOTH : kind === 'robe' ? DRESS : kind === 'beast' ? CATTLE : WOOL;
      items.forEach((f, i) => {
        const sc = (kind === 'beast' ? 0.82 : 0.95) + this.r() * 0.12;
        q.setFromAxisAngle(up, f[2]); v.set(f[0], f[5] != null ? f[5] : this.groundY(f[0], f[1]), f[1]); s.setScalar(sc);
        m4.compose(v, q, s); im.setMatrixAt(i, m4);
        const p = f[4] || pal[(this.r() * pal.length) | 0]; srgb(col, p[0], p[1], p[2]); im.setColorAt(i, col);
      });
      im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true;
      const blob = new THREE.InstancedMesh(blobGeo(kind === 'beast' ? 0.5 : 0.36, kind === 'beast' ? 1.1 : kind === 'sheep' ? 0.5 : 0.3), this.blobMat, items.length);
      blob.instanceMatrix = im.instanceMatrix; blob.frustumCulled = false; blob.renderOrder = 1;
      this.group.add(im, blob);
    }
  }
}

export { CLOTH, DRESS, WOOL, CATTLE };
