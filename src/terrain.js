// Relief, berges de la Seine et maillage du sol.
import * as THREE from 'three';
import { FRAME } from './data.js';
import { DistanceField } from './raster.js';
import { clamp, lerp, smoothstep, fbm, distPolyline } from './geom.js';

export const WORLD = 9000; // demi-côté du paysage modélisé (m)
export const FAR = 27000;  // demi-côté du lointain : un sol grossier qui se perd dans la brume, pour que l'horizon ne soit pas un bord de plateau

// Prolongements de la Seine hors du cadre du plan (repères actuels approximatifs : Concorde, Alma, Grenelle ; Bercy, Charenton).
const SEINE_WEST = [[-1250, -760], [-1408, -766], [-2212, -1168], [-2900, -1290], [-3560, -1200], [-4204, -800], [-5120, 300], [-6000, 1700], [-6700, 3300], [-7600, 5200], [-9500, 7500], [-13000, 9300], [-18500, 9900], [-27500, 9200]];
const SEINE_EAST = [[1180, 1230], [1305, 1370], [1900, 2100], [2500, 2900], [3300, 3550], [4400, 4100], [5600, 5200], [7400, 6400], [9800, 7600], [14000, 9600], [20000, 11400], [27500, 12600]];
const MARNE = [[4400, 4100], [5300, 3900], [6300, 4300], [7300, 3900], [8400, 4300], [9800, 4000], [14000, 4700], [20000, 4300], [27500, 5300]];

export const RIVERS = [[SEINE_WEST, 66], [SEINE_EAST, 78], [MARNE, 45]];      // [tracé, demi-largeur du lit]

export class Terrain {
  constructor(lu) {
    this.lu = lu;
    this.df = new DistanceField(lu, 2);
  }

  // Distance signée à l'eau (positive dans l'eau).
  // Seine et Marne hors du cadre du plan : distance signée à leur lit (positive dans l'eau).
  riverSd(x, z) { return Math.max(66 - distPolyline(x, z, SEINE_WEST), 78 - distPolyline(x, z, SEINE_EAST), 45 - distPolyline(x, z, MARNE)); }

  sdWater(x, z) {
    let a = this.riverSd(x, z);
    const e = Math.min(x - FRAME.x0, FRAME.x1 - x, z - FRAME.z0, FRAME.z1 - z);
    if (e <= 0) return a;
    const r = this.df.at(x, z);
    return lerp(a, r, smoothstep(0, 90, e));
  }

  // Relief hors hydrographie (m au-dessus du niveau de la Seine).
  base(x, z) {
    let h = 6;
    // Rive droite : la plaine remonte doucement vers le nord, puis vers les buttes.
    h += 3 * smoothstep(-200, -1700, z) + 14 * smoothstep(-1900, -3300, z);
    const g = (cx, cz, sx, sz, amp) => { const dx = (x - cx) / sx, dz = (z - cz) / sz; return amp * Math.exp(-0.5 * (dx * dx + dz * dz)); };
    h += g(-500, -3750, 420, 330, 96);      // butte Montmartre
    h += g(2700, -2500, 1300, 1000, 80);    // Belleville, Ménilmontant
    h += g(1250, -2700, 260, 220, 14);      // butte de Montfaucon
    h += g(-4300, -1900, 1100, 900, 30);    // Chaillot
    h += g(350, 2600, 600, 700, 26);        // Butte-aux-Cailles
    // Rive gauche : Montagne Sainte-Geneviève et plateau au sud.
    const A = x < -350 ? lerp(0.55, 1, smoothstep(-2100, -350, x)) : 1 - smoothstep(-250, 520, x);
    const B = smoothstep(140, 880, z);
    h += 30 * A * B;
    h += (fbm(x * 0.004 + 31.7, z * 0.004 + 12.3, 3) - 0.5) * 1.6 * smoothstep(1200, 2600, Math.hypot(x, z));
    // Couronne de plateaux qui ferme l'horizon de la cuvette parisienne ; les vallées de la Seine et de la Marne restent ouvertes.
    const rr = Math.hypot(x, z + 300);
    if (rr > 6900) h += smoothstep(6900, 10500, rr) * smoothstep(150, 2100, -this.riverSd(x, z)) * (30 + 95 * fbm(x * 0.00042 + 7.1, z * 0.00042 + 3.3, 3));
    return h;
  }

  height(x, z) {
    const b = this.base(x, z), sd = this.sdWater(x, z);
    if (sd > 0) return 0.3 - 3.3 * smoothstep(0, 9, sd);
    return lerp(0.3, b, smoothstep(0, 24, -sd));
  }

  normal(x, z, out) {
    const e = 1.5;
    const hx = this.height(x + e, z) - this.height(x - e, z), hz = this.height(x, z + e) - this.height(x, z - e);
    const nx = -hx / (2 * e), nz = -hz / (2 * e), l = Math.hypot(nx, 1, nz);
    out[0] = nx / l; out[1] = 1 / l; out[2] = nz / l;
    return out;
  }
}

// Grille adaptative : cellules grossières, raffinées `sub`×`sub` là où fine(cx,cz) est vrai.
export function buildGrid({ x0, z0, x1, z1, cell, sub, fine, skip, terrain, lower, uv, skirt }) {
  const nx = Math.round((x1 - x0) / cell), nz = Math.round((z1 - z0) / cell);
  const cw = (x1 - x0) / nx, ch = (z1 - z0) / nz;
  const H = (x, z) => terrain.height(x, z) - (lower ? lower(x, z) : 0);
  const ch_ = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) ch_[j * (nx + 1) + i] = H(x0 + i * cw, z0 + j * ch);
  const flag = new Uint8Array(nx * nz); // 0 normal, 1 fin, 2 omis
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const cx = x0 + (i + 0.5) * cw, cz = z0 + (j + 0.5) * ch;
    flag[j * nx + i] = skip && skip(cx, cz) ? 2 : fine(cx, cz) ? 1 : 0;
  }
  const pos = [], nor = [], uvs = [], idx = [];
  const tmp = [0, 0, 0];
  const cmap = new Int32Array((nx + 1) * (nz + 1)).fill(-1);
  const push = (x, y, z) => { pos.push(x, y, z); terrain.normal(x, z, tmp); nor.push(tmp[0], tmp[1], tmp[2]); const t = uv(x, z); uvs.push(t[0], t[1]); return pos.length / 3 - 1; };
  const cv = (i, j) => { const k = j * (nx + 1) + i; if (cmap[k] < 0) cmap[k] = push(x0 + i * cw, ch_[k], z0 + j * ch); return cmap[k]; };
  const isFine = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && flag[j * nx + i] === 1;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const f = flag[j * nx + i];
    if (f === 2) continue;
    if (f === 0) { const a = cv(i, j), b = cv(i + 1, j), c = cv(i + 1, j + 1), d = cv(i, j + 1); idx.push(a, d, b, b, d, c); continue; }
    const h00 = ch_[j * (nx + 1) + i], h10 = ch_[j * (nx + 1) + i + 1], h01 = ch_[(j + 1) * (nx + 1) + i], h11 = ch_[(j + 1) * (nx + 1) + i + 1];
    const fW = isFine(i - 1, j), fE = isFine(i + 1, j), fN = isFine(i, j - 1), fS = isFine(i, j + 1);
    const base = pos.length / 3;
    for (let b = 0; b <= sub; b++) for (let a = 0; a <= sub; a++) {
      const u = a / sub, v = b / sub, x = x0 + (i + u) * cw, z = z0 + (j + v) * ch;
      let y;
      if (a === 0 && !fW) y = lerp(h00, h01, v);
      else if (a === sub && !fE) y = lerp(h10, h11, v);
      else if (b === 0 && !fN) y = lerp(h00, h10, u);
      else if (b === sub && !fS) y = lerp(h01, h11, u);
      else y = H(x, z);
      push(x, y, z);
    }
    for (let b = 0; b < sub; b++) for (let a = 0; a < sub; a++) {
      const p = base + b * (sub + 1) + a;
      idx.push(p, p + sub + 1, p + 1, p + 1, p + sub + 1, p + sub + 2);
    }
  }
  if (skirt) {
    const edge = (i0, j0, i1, j1) => {
      const a = cv(i0, j0), b = cv(i1, j1);
      const xa = x0 + i0 * cw, za = z0 + j0 * ch, xb = x0 + i1 * cw, zb = z0 + j1 * ch;
      const c = push(xb, ch_[j1 * (nx + 1) + i1] - skirt, zb), d = push(xa, ch_[j0 * (nx + 1) + i0] - skirt, za);
      idx.push(a, b, c, a, c, d);
    };
    for (let i = 0; i < nx; i++) { edge(i + 1, 0, i, 0); edge(i, nz, i + 1, nz); }
    for (let j = 0; j < nz; j++) { edge(0, j, 0, j + 1); edge(nx, j + 1, nx, j); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

export function buildTerrainGeometries(terrain) {
  const fw = FRAME.x1 - FRAME.x0, fh = FRAME.z1 - FRAME.z0;
  const core = buildGrid({
    x0: FRAME.x0, z0: FRAME.z0, x1: FRAME.x1, z1: FRAME.z1, cell: 12, sub: 4, terrain, skirt: 14,
    fine: (cx, cz) => Math.abs(terrain.sdWater(cx, cz)) < 34,
    uv: (x, z) => [(x - FRAME.x0) / fw, 1 - (z - FRAME.z0) / fh],
  });
  const inside = (x, z) => Math.min(x - FRAME.x0, FRAME.x1 - x, z - FRAME.z0, FRAME.z1 - z);
  const outer = buildGrid({
    x0: -WORLD, z0: -WORLD, x1: WORLD, z1: WORLD, cell: 100, sub: 4, terrain,
    fine: (cx, cz) => Math.abs(terrain.sdWater(cx, cz)) < 160 && inside(cx, cz) < 150,
    skip: (cx, cz) => inside(cx, cz) > 160,
    lower: (x, z) => 9 * smoothstep(0, 60, inside(x, z)),
    uv: (x, z) => [(x + WORLD) / (2 * WORLD), 1 - (z + WORLD) / (2 * WORLD)], skirt: 90,
  });
  // Lointain : mêmes coordonnées de texture, prolongées au-delà de [0, 1] (la texture de la campagne s'y répète en miroir).
  const far = buildGrid({
    x0: -FAR, z0: -FAR, x1: FAR, z1: FAR, cell: 1000, sub: 1, terrain,
    fine: () => false, skip: (cx, cz) => Math.max(Math.abs(cx), Math.abs(cz)) < WORLD,
    lower: () => 5,
    uv: (x, z) => [(x + WORLD) / (2 * WORLD), 1 - (z + WORLD) / (2 * WORLD)],
  });
  return { core, outer, far };
}

export { clamp };
