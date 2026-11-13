// Trame d'occupation du sol (1 m par cellule) peinte dans l'ordre des calques du plan de 1380.
import { FRAME, layer, polys } from './data.js';
import { clamp } from './geom.js';

export const LU = { OUT: 0, OPEN: 1, WATER: 2, FIELD: 3, BATI: 4, RES: 5, COURT: 6, GARDEN: 7, CEMETERY: 8, BRIDGE: 9, BANK: 10, ISLAND: 11 };

export class Raster {
  constructor(x0, z0, x1, z1, cell, Type = Uint8Array) {
    this.x0 = x0; this.z0 = z0; this.cell = cell;
    this.w = Math.ceil((x1 - x0) / cell); this.h = Math.ceil((z1 - z0) / cell);
    this.data = new Type(this.w * this.h);
  }
  get(x, z) {
    const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((z - this.z0) / this.cell);
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return 0;
    return this.data[j * this.w + i];
  }
  set(x, z, v) {
    const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((z - this.z0) / this.cell);
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return;
    this.data[j * this.w + i] = v;
  }
  // Remplissage par lignes de balayage (règle pair-impair). `only` restreint aux cellules ayant cette valeur.
  fillPoly(pts, v, only = -1) {
    const n = pts.length; if (n < 3) return;
    let zmin = Infinity, zmax = -Infinity;
    for (const p of pts) { if (p[1] < zmin) zmin = p[1]; if (p[1] > zmax) zmax = p[1]; }
    const c = this.cell, w = this.w, d = this.data;
    const j0 = Math.max(0, Math.floor((zmin - this.z0) / c)), j1 = Math.min(this.h - 1, Math.floor((zmax - this.z0) / c));
    const xs = [];
    for (let j = j0; j <= j1; j++) {
      const z = this.z0 + (j + 0.5) * c;
      xs.length = 0;
      for (let i = 0, k = n - 1; i < n; k = i++) {
        const a = pts[i], b = pts[k];
        if ((a[1] > z) !== (b[1] > z)) xs.push(a[0] + ((z - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
      xs.sort((p, q) => p - q);
      for (let s = 0; s + 1 < xs.length; s += 2) {
        const i0 = Math.max(0, Math.ceil((xs[s] - this.x0) / c - 0.5)), i1 = Math.min(w - 1, Math.floor((xs[s + 1] - this.x0) / c - 0.5));
        if (only < 0) for (let i = i0; i <= i1; i++) d[j * w + i] = v;
        else for (let i = i0; i <= i1; i++) if (d[j * w + i] === only) d[j * w + i] = v;
      }
    }
  }
  fillCircle(cx, cz, r, v) {
    const c = this.cell, w = this.w;
    const j0 = Math.max(0, Math.floor((cz - r - this.z0) / c)), j1 = Math.min(this.h - 1, Math.floor((cz + r - this.z0) / c));
    for (let j = j0; j <= j1; j++) {
      const z = this.z0 + (j + 0.5) * c, dz = z - cz, s = r * r - dz * dz;
      if (s < 0) continue;
      const hx = Math.sqrt(s);
      const i0 = Math.max(0, Math.ceil((cx - hx - this.x0) / c - 0.5)), i1 = Math.min(w - 1, Math.floor((cx + hx - this.x0) / c - 0.5));
      for (let i = i0; i <= i1; i++) this.data[j * w + i] = v;
    }
  }
  strokeLine(pts, half, v, closed = false) {
    const n = pts.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
      if (l < 1e-6) continue;
      const nx = (-dz / l) * half, nz = (dx / l) * half;
      this.fillPoly([[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]], v);
      this.fillCircle(a[0], a[1], half, v); this.fillCircle(b[0], b[1], half, v);
    }
  }
  // Proportion de cellules d'un rectangle orienté dont la valeur vérifie test(v).
  rectFraction(cx, cz, ux, uz, hl, hw, test) {
    let n = 0, k = 0;
    const step = this.cell;
    for (let a = -hl + step / 2; a < hl; a += step) for (let b = -hw + step / 2; b < hw; b += step) {
      n++; if (test(this.get(cx + ux * a - uz * b, cz + uz * a + ux * b))) k++;
    }
    return n ? k / n : 0;
  }
  fillRect(cx, cz, ux, uz, hl, hw, v) {
    this.fillPoly([[cx - ux * hl + uz * hw, cz - uz * hl - ux * hw], [cx + ux * hl + uz * hw, cz + uz * hl - ux * hw], [cx + ux * hl - uz * hw, cz + uz * hl + ux * hw], [cx - ux * hl - uz * hw, cz - uz * hl + ux * hw]], v);
  }
}

// Champ de distance signé à l'eau (positif dans l'eau), échantillonné sur une grille de pas `step`.
export class DistanceField {
  constructor(lu, step = 2) {
    const w = Math.ceil((lu.w * lu.cell) / step), h = Math.ceil((lu.h * lu.cell) / step);
    this.x0 = lu.x0; this.z0 = lu.z0; this.step = step; this.w = w; this.h = h;
    const BIG = 1e6;
    const din = new Float32Array(w * h), dout = new Float32Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const wat = lu.get(lu.x0 + (i + 0.5) * step, lu.z0 + (j + 0.5) * step) === LU.WATER;
      din[j * w + i] = wat ? BIG : 0; dout[j * w + i] = wat ? 0 : BIG;
    }
    const pass = (d) => {
      const a = step, b = step * 1.41421356;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = j * w + i; let v = d[k]; if (v === 0) continue;
        if (i > 0 && d[k - 1] + a < v) v = d[k - 1] + a;
        if (j > 0) {
          if (d[k - w] + a < v) v = d[k - w] + a;
          if (i > 0 && d[k - w - 1] + b < v) v = d[k - w - 1] + b;
          if (i < w - 1 && d[k - w + 1] + b < v) v = d[k - w + 1] + b;
        }
        d[k] = v;
      }
      for (let j = h - 1; j >= 0; j--) for (let i = w - 1; i >= 0; i--) {
        const k = j * w + i; let v = d[k]; if (v === 0) continue;
        if (i < w - 1 && d[k + 1] + a < v) v = d[k + 1] + a;
        if (j < h - 1) {
          if (d[k + w] + a < v) v = d[k + w] + a;
          if (i < w - 1 && d[k + w + 1] + b < v) v = d[k + w + 1] + b;
          if (i > 0 && d[k + w - 1] + b < v) v = d[k + w - 1] + b;
        }
        d[k] = v;
      }
    };
    pass(din); pass(dout);
    const sd = new Float32Array(w * h);
    for (let k = 0; k < w * h; k++) sd[k] = din[k] > 0 ? Math.min(din[k], 400) - step * 0.5 : -(Math.min(dout[k], 400) - step * 0.5);
    this.sd = sd;
  }
  // Interpolation bilinéaire ; hors grille → valeur du bord.
  at(x, z) {
    const fx = clamp((x - this.x0) / this.step - 0.5, 0, this.w - 1.001), fz = clamp((z - this.z0) / this.step - 0.5, 0, this.h - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * this.w + i, s = this.sd;
    return (s[k] * (1 - u) + s[k + 1] * u) * (1 - v) + (s[k + this.w] * (1 - u) + s[k + this.w + 1] * u) * v;
  }
}

const RED = ['#FF0000', '#C92548', '#F3102B'];

// Peint l'occupation du sol dans l'ordre d'empilement du plan.
export function buildLanduse() {
  const lu = new Raster(FRAME.x0, FRAME.z0, FRAME.x1, FRAME.z1, 1);
  lu.data.fill(LU.OPEN);
  const P = (name, fill, v) => { for (const s of polys(name, fill)) lu.fillPoly(s.pts, v); };
  const byFill = (name, map, dflt) => {
    for (const s of layer(name)) {
      if (s.kind === 'circle') continue;
      if (s.kind !== 'poly' || s.fill === 'NONE') continue;
      let v = map[s.fill];
      if (v === undefined && s.fill.startsWith('URL')) v = map.URL;
      if (v === undefined) v = dflt;
      if (v !== undefined && v !== null) lu.fillPoly(s.pts, v);
    }
  };
  P('Eau', null, LU.WATER);
  P('FondCite', null, LU.OPEN);
  P('NonBati', '#E6E6E6', LU.FIELD);
  const enclos = { '#FFFFFF': LU.COURT, '#F8705F': LU.COURT, '#FF0000': LU.RES, '#C92548': LU.RES, '#F3102B': LU.RES, '#3D575D': LU.GARDEN, '#E6E6E6': LU.FIELD, URL: LU.CEMETERY };
  byFill('StVictor', enclos); byFill('Temple', enclos); byFill('StMartin', enclos); byFill('StGermain', enclos);
  P('Bati', '#BFBFBF', LU.BATI);
  P('Cluny', null, LU.RES);
  byFill('Louvre', { '#80CADE': LU.WATER, '#FFFFFF': LU.COURT, '#000000': LU.RES });
  P('CimetieresJuifs', null, LU.CEMETERY);
  byFill('Hotel', { '#704D18': LU.RES, '#D6D5BB': LU.GARDEN, '#FFFFFF': LU.COURT });
  P('Moulins', null, LU.RES);
  byFill('Colleges', { '#91CC21': LU.RES, '#C8E590': LU.GARDEN });
  byFill('Halles', {}, LU.RES);
  P('Hopital', null, LU.RES);
  byFill('Royal', {}, LU.RES);
  byFill('Cimetieres', {}, LU.CEMETERY);
  byFill('Religieux', { '#FF0000': LU.RES, '#C92548': LU.RES, '#F8705F': LU.COURT });
  P('EnConstruction', null, LU.RES);
  byFill('Palais', { '#000000': LU.RES, '#E6E6E6': LU.COURT, '#99D36A': LU.GARDEN, '#D9D9D9': LU.COURT, '#FF0000': LU.RES });
  byFill('Berges', { '#E6E6E6': LU.ISLAND, '#F2F2F2': LU.BANK, '#000000': LU.RES });
  P('Ponts', '#FFFFFF', LU.BRIDGE);
  // Fossés de l'enceinte de Charles V (tracés en tirets dans le calque « Egout »).
  for (const s of layer('Egout')) if (s.dash && s.pts.length >= 2) lu.strokeLine(s.pts, 13, LU.WATER);
  // Cartouches du plan (légende, crédits) : aucune donnée dessous.
  for (const s of polys('Cadre', '#E6E6E6')) lu.fillPoly(s.pts, LU.OUT);
  return lu;
}

export { RED };
