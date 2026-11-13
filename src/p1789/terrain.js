// Relief et fleuve de Paris à la fin du XVIIIe siècle.
// Le sol vient du nivellement de Girard ; au-delà de la zone nivelée il est prolongé en douceur. La Seine est creusée
// d'après le plan de Verniquet : là où le plan dessine un pont, le fleuve s'interrompt et le sol passe à niveau.
import { CADRE, relief, eau } from './data.js';
import { clamp, smoothstep } from '../geom.js';

const CELL = 4;            // maille du masque d'eau (m)
const QUAI = 2.4;          // hauteur du point le plus bas du nivellement au-dessus de l'eau (m)
const FOND = -3.2;         // fond du lit (m)

export class Terrain89 {
  constructor() {
    const R = relief(); this.R = R;
    const { nx, nz, h, ok } = R, n = nx * nz;
    // nœuds hors nivellement : propagation de proche en proche, puis lissage (prolongement harmonique)
    const v = Float32Array.from(h), known = Uint8Array.from(ok);
    let todo = 0; for (let i = 0; i < n; i++) if (!known[i]) todo++;
    for (let pass = 0; todo > 0 && pass < 400; pass++) {
      const add = [];
      for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
        const q = k * nx + i; if (known[q]) continue;
        let s = 0, c = 0;
        if (i > 0 && known[q - 1]) { s += v[q - 1]; c++; } if (i < nx - 1 && known[q + 1]) { s += v[q + 1]; c++; }
        if (k > 0 && known[q - nx]) { s += v[q - nx]; c++; } if (k < nz - 1 && known[q + nx]) { s += v[q + nx]; c++; }
        if (c) add.push(q, s / c);
      }
      for (let a = 0; a < add.length; a += 2) { v[add[a]] = add[a + 1]; known[add[a]] = 1; todo--; }
      if (!add.length) break;
    }
    const w = new Float32Array(n);
    for (let it = 0; it < 120; it++) {
      for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
        const q = k * nx + i; if (ok[q]) { w[q] = v[q]; continue; }
        const a = v[k * nx + Math.max(0, i - 1)], b = v[k * nx + Math.min(nx - 1, i + 1)], c2 = v[Math.max(0, k - 1) * nx + i], d = v[Math.min(nz - 1, k + 1) * nx + i];
        w[q] = (a + b + c2 + d) / 4;
      }
      v.set(w);
    }
    this.h = v;

    // masque d'eau : polygones du fleuve (les îles et les ponts y sont des vides), puis adoucissement des rives
    const W = Math.ceil((CADRE.x1 - CADRE.x0) / CELL), H = Math.ceil((CADRE.z1 - CADRE.z0) / CELL);
    this.W = W; this.H = H;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.beginPath();
    for (const rings of eau()) for (const r of rings) { r.forEach((p, i) => { const x = (p[0] - CADRE.x0) / CELL, y = (p[1] - CADRE.z0) / CELL; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); }
    ctx.fill('evenodd');
    const im = ctx.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
    for (let i = 0; i < m.length; i++) m[i] = im[i * 4] > 127 ? 255 : 0;
    this.sharp = m;
    const blur = (src, horizontal) => {
      const out = new Uint8Array(W * H), r = 2, len = horizontal ? W : H, lines = horizontal ? H : W;
      for (let l = 0; l < lines; l++) {
        let s = 0; const at = (j) => (horizontal ? src[l * W + clamp(j, 0, len - 1)] : src[clamp(j, 0, len - 1) * W + l]);
        for (let j = -r; j <= r; j++) s += at(j);
        for (let j = 0; j < len; j++) { out[horizontal ? l * W + j : j * W + l] = s / (2 * r + 1); s += at(j + r + 1) - at(j - r); }
      }
      return out;
    };
    this.soft = blur(blur(m, true), false);

    // Le plan arrête le fleuve avant le bord du cadre : on le prolonge tout droit, dans l'axe de chacune de ses deux
    // extrémités (les « bouchons » qui ferment le polygone du lit), jusqu'à l'horizon.
    this.ext = [];
    {
      const inPoly = (r, x, z) => { let ins = false; for (let i = 0, k = r.length - 1; i < r.length; k = i++) { const p = r[i], q = r[k]; if ((p[1] > z) !== (q[1] > z) && x < ((q[0] - p[0]) * (z - p[1])) / (q[1] - p[1]) + p[0]) ins = !ins; } return ins; };
      const caps = [null, null];                           // extrémité aval (la plus à l'ouest), extrémité amont (la plus au sud-est)
      for (const rings of eau()) {                         // les ponts coupent le lit en biefs : on cherche parmi tous
        const r = rings[0];
        for (let i = 0; i < r.length; i++) {
          const p = r[i], q = r[(i + 1) % r.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 60 || L > 420) continue;
          const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, c = { r, i, mx, mz, L, tx: (q[0] - p[0]) / L, tz: (q[1] - p[1]) / L };
          if (!caps[0] || mx < caps[0].mx) caps[0] = c; if (!caps[1] || mx + mz > caps[1].mx + caps[1].mz) caps[1] = c;
        }
      }
      for (const c of caps) {
        if (!c) continue;
        // axe du lit à son extrémité : du milieu des deux rives, 350 m en retrait, vers le milieu du bouchon
        const r = c.r, n = r.length, along = (k, step) => { let d = 0, j = k; while (d < 350) { const nj = (j + step + n) % n; d += Math.hypot(r[nj][0] - r[j][0], r[nj][1] - r[j][1]); j = nj; if (j === k) break; } return r[j]; };
        const a = along(c.i, -1), b = along((c.i + 1) % n, 1), bx = (a[0] + b[0]) / 2, bz = (a[1] + b[1]) / 2;
        let dx = c.mx - bx, dz = c.mz - bz; const l = Math.hypot(dx, dz);
        if (l < 30) { dx = -c.tz; dz = c.tx; if (inPoly(r, c.mx + dx * 6, c.mz + dz * 6)) { dx = -dx; dz = -dz; } } else { dx /= l; dz /= l; }
        this.ext.push({ x: c.mx, z: c.mz, dx, dz, half: Math.max(40, Math.abs(c.tx * c.L * dz - c.tz * c.L * dx) / 2) });
      }
    }
  }

  inside(x, z) { return x >= CADRE.x0 && x <= CADRE.x1 && z >= CADRE.z0 && z <= CADRE.z1; }

  // Part d'eau autour du point (0 terre ferme, 1 plein fleuve), rives adoucies.
  wetAt(x, z) {
    let w = 0;
    for (const e of this.ext) { const t = (x - e.x) * e.dx + (z - e.z) * e.dz; if (t < -150) continue; const d = Math.abs((x - e.x) * -e.dz + (z - e.z) * e.dx); w = Math.max(w, (1 - smoothstep(e.half - 14, e.half + 14, d)) * smoothstep(-150, -120, t)); }      // amorcé en retrait, dans le lit même : pas d'encoche au raccord
    if (!this.inside(x, z)) return w;
    const fx = (x - CADRE.x0) / CELL - 0.5, fz = (z - CADRE.z0) / CELL - 0.5, i = clamp(Math.floor(fx), 0, this.W - 2), k = clamp(Math.floor(fz), 0, this.H - 2), u = clamp(fx - i, 0, 1), v = clamp(fz - k, 0, 1), s = this.soft, q = k * this.W + i;
    return Math.max(w, ((s[q] * (1 - u) + s[q + 1] * u) * (1 - v) + (s[q + this.W] * (1 - u) + s[q + this.W + 1] * u) * v) / 255);
  }

  // Sol sans le fleuve : nivellement, prolongé à plat hors du cadre.
  land(x, z) {
    const R = this.R, fx = clamp((x - R.x0) / R.pas, 0, R.nx - 1.001), fz = clamp((z - R.z0) / R.pas, 0, R.nz - 1.001), i = Math.floor(fx), k = Math.floor(fz), u = fx - i, v = fz - k, h = this.h, q = k * R.nx + i;
    return QUAI + (h[q] * (1 - u) + h[q + 1] * u) * (1 - v) + (h[q + R.nx] * (1 - u) + h[q + R.nx + 1] * u) * v;
  }

  height(x, z) {
    const l = this.land(x, z), w = this.wetAt(x, z);
    if (w <= 0.3) return l;
    return l + (FOND - l) * smoothstep(0.3, 0.74, w);
  }

  normal(x, z, out) {
    const d = 3, hx = this.height(x + d, z) - this.height(x - d, z), hz = this.height(x, z + d) - this.height(x, z - d), l = Math.hypot(hx, 2 * d, hz);
    out[0] = -hx / l; out[1] = (2 * d) / l; out[2] = -hz / l; return out;
  }

  // Distance signée approchée à la rive (négative dans l'eau) : sert à affiner le maillage près du fleuve.
  sdWater(x, z) { return (0.5 - this.wetAt(x, z)) * 40; }
}
