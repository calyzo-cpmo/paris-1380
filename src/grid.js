// Maillage de terrain en grille (cases affinées au besoin, jupe sur le pourtour) et dimensions du paysage.
// Sans dépendance aux données d'une ville : sert à la maquette de 1380 comme à la page de 1789.
import * as THREE from 'three';
import { lerp } from './geom.js';

export const WORLD = 9000; // demi-côté du paysage modélisé (m)
export const FAR = 27000;  // demi-côté du lointain : un sol grossier qui se perd dans la brume, pour que l'horizon ne soit pas un bord de plateau

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
