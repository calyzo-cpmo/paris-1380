// Quais et ponts de la ville dense. Le plan de Verniquet arrête le lit du fleuve au droit de chaque pont : le sol y
// passe à niveau, comme une digue. On pose donc, un peu en avant de chaque rive du plan, un mur de quai et son parapet,
// et sur les flancs des ponts un mur percé d'arches ; un dallage prolonge le sol de la ville jusqu'au mur.
import * as THREE from 'three';
import { CADRE, eau } from './data.js';
import { QUAIS } from './terrain.js';
import { hex } from './blocks.js';
import { offsetEx, difference, dpRing, distSeg } from '../geom.js';

const AVANT = 3.2, ARRIERE = 13, PARAPET = 0.95, EP = 0.4, FOND = -1.6, PORTEE = 17, PAS = 10;
const PIERRE_QUAI = hex(0xd8ceb6);

const dens = (ring, max) => { const out = []; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / max)); for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); } return out; };
const inZone = (x) => x > QUAIS.x0 && x < QUAIS.x1;

// Tracé des murs : les anneaux du lit rétréci, chacun en pans { a, c, pont }. Un pan est un flanc de pont s'il a de l'eau
// derrière lui ; le plan y dessine les becs des piles en dents de scie : chaque flanc est redressé d'une rive à l'autre.
export function planQuais(T) {
  const water = eau().map((rings) => ({ outer: rings[0], holes: rings.slice(1) }));
  const pans = (raw) => {
    const r = dpRing(raw, 0.4), n = r.length; if (n < 3) return [];
    const seg = [];
    for (let i = 0; i < n; i++) {
      const a = r[i], c = r[(i + 1) % n], L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1e-6, mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
      let nx = (c[1] - a[1]) / L, nz = -(c[0] - a[0]) / L; if (T.wetAt(mx + nx * 4, mz + nz * 4) < T.wetAt(mx - nx * 4, mz - nz * 4)) { nx = -nx; nz = -nz; }    // (nx, nz) : vers l'eau
      let pont = false; if (inZone(mx)) for (let t = 10; t <= 40 && !pont; t += 5) pont = T.wetAt(mx - nx * t, mz - nz * t) > 0.7;
      seg.push({ a, c, pont, L, dx: (c[0] - a[0]) / L, dz: (c[1] - a[1]) / L });
    }
    // les becs de pile — deux ou trois pans courts entre deux pans de flanc alignés — font partie du flanc
    for (let i = 0; i < n; i++) {
      if (!seg[i].pont) continue;
      let j = i + 1, len = 0; while (j - i <= 4 && !seg[j % n].pont) { len += seg[j % n].L; j++; }
      const e = seg[j % n]; if (j === i + 1 || j - i > 4 || len > 32 || !e.pont || seg[i].dx * e.dx + seg[i].dz * e.dz < 0.9) continue;
      for (let q = i + 1; q < j; q++) seg[q % n].pont = true;
    }
    const start = seg.findIndex((s) => !s.pont); if (start < 0) return seg;
    const out = [];
    for (let k = 0; k < n; k++) {
      const s = seg[(start + k) % n]; if (!s.pont) { out.push(s); continue; }
      let j = k; while (j + 1 < n && seg[(start + j + 1) % n].pont) j++;
      const e = seg[(start + j) % n]; let dev = 0;
      for (let q = k; q < j; q++) { const p = seg[(start + q) % n].c; dev = Math.max(dev, distSeg(p[0], p[1], s.a[0], s.a[1], e.c[0], e.c[1])); }
      if (dev < 16 && Math.hypot(e.c[0] - s.a[0], e.c[1] - s.a[1]) > 12) out.push({ a: s.a, c: e.c, pont: true }); else for (let q = k; q <= j; q++) out.push(seg[(start + q) % n]);
      k = j;
    }
    return out;
  };
  return offsetEx(water, -AVANT).map((ex) => ({ outer: pans(ex.outer), holes: ex.holes.map(pans).filter((h) => h.length >= 3) })).filter((ex) => ex.outer.length >= 3);
}

export function buildQuais(app, B) {
  const T = app.terrain, top = (p) => T.land(p[0], p[1]) + 0.03, front = app.quaiPans;
  const water = eau().map((rings) => ({ outer: rings[0], holes: rings.slice(1) }));
  let arches = 0, murs = 0;

  // dallage : le sol de la ville, à son niveau exact, prolongé jusqu'au mur — même matière que le sol, il ne s'en distingue pas
  { const pos = [], nor = [], uv = [], fw = CADRE.x1 - CADRE.x0, fh = CADRE.z1 - CADRE.z0, ring = (l) => l.map((s) => s.a);
    const normal = (p) => { const d = 3, hx = T.land(p[0] + d, p[1]) - T.land(p[0] - d, p[1]), hz = T.land(p[0], p[1] + d) - T.land(p[0], p[1] - d), l = Math.hypot(hx, 2 * d, hz); nor.push(-hx / l, (2 * d) / l, -hz / l); };
    for (const ex of difference(offsetEx(water, ARRIERE), front.map((f) => ({ outer: ring(f.outer), holes: f.holes.map(ring) })))) {
      const outer = dens(ex.outer, PAS), holes = ex.holes.map((h) => dens(h, PAS)), all = outer.concat(...holes);
      const tris = THREE.ShapeUtils.triangulateShape(outer.map((p) => new THREE.Vector2(p[0], p[1])), holes.map((h) => h.map((p) => new THREE.Vector2(p[0], p[1]))));
      for (const t of tris) {
        let a = all[t[0]], c = all[t[1]], d = all[t[2]]; if (!a || !c || !d) continue;
        if (!inZone((a[0] + c[0] + d[0]) / 3)) continue;
        if ((c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]) > 0) { const q = c; c = d; d = q; }
        for (const p of [a, c, d]) { pos.push(p[0], top(p), p[1]); normal(p); uv.push((p[0] - CADRE.x0) / fw, 1 - (p[1] - CADRE.z0) / fh); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const m = new THREE.Mesh(g, app.groundMat); m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); app.scene.add(m); app.quaiMesh = m; }

  // murs, face tournée vers l'eau : pierre nue le long des rives, arches sous les ponts ; parapet au-dessus
  for (const ex of front) for (const list of [ex.outer, ...ex.holes]) for (const s of list) {
    const L = Math.hypot(s.c[0] - s.a[0], s.c[1] - s.a[1]); if (L < 0.2 || !inZone((s.a[0] + s.c[0]) / 2)) continue;
    const dx = (s.c[0] - s.a[0]) / L, dz = (s.c[1] - s.a[1]) / L, mx = (s.a[0] + s.c[0]) / 2, mz = (s.a[1] + s.c[1]) / 2;
    let nx = dz, nz = -dx, w0 = 0, w1 = 0;
    for (const t of [0.25, 0.5, 0.75]) { const px = s.a[0] + dx * L * t, pz = s.a[1] + dz * L * t; w0 += T.wetAt(px + nx * 5, pz + nz * 5); w1 += T.wetAt(px - nx * 5, pz - nz * 5); }
    const flip = w0 < w1; if (flip) { nx = -nx; nz = -nz; }                    // la face doit regarder l'eau
    const N = s.pont && L >= 9 ? Math.max(1, Math.round(L / PORTEE)) : 0, n = Math.max(1, Math.ceil(L / PAS)), bx = -nx * EP, bz = -nz * EP;
    arches += N;
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, a = [s.a[0] + dx * L * t0, s.a[1] + dz * L * t0], c = [s.a[0] + dx * L * t1, s.a[1] + dz * L * t1];
      const P = flip ? c : a, Q = flip ? a : c, yP = top(P), yQ = top(Q), l = L / n, st = B.at('stone', (a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
      if (N) B.at('pont', mx, mz).quad(Q[0], FOND, Q[1], P[0], FOND, P[1], P[0], yP, P[1], Q[0], yQ, Q[1], (flip ? t0 : t1) * N, FOND / Math.max(1, (yP + yQ) / 2), (flip ? t1 : t0) * N, 1, PIERRE_QUAI, 0.86, 1);
      else st.quad(Q[0], FOND, Q[1], P[0], FOND, P[1], P[0], yP, P[1], Q[0], yQ, Q[1], l * 0.25, FOND * 0.25, 0, ((yP + yQ) / 2) * 0.25, PIERRE_QUAI, 0.72, 1);
      st.quad(Q[0], yQ, Q[1], P[0], yP, P[1], P[0], yP + PARAPET, P[1], Q[0], yQ + PARAPET, Q[1], l * 0.25, 0, 0, 0.25, PIERRE_QUAI, 1, 1);
      st.quad(P[0] + bx, yP, P[1] + bz, Q[0] + bx, yQ, Q[1] + bz, Q[0] + bx, yQ + PARAPET, Q[1] + bz, P[0] + bx, yP + PARAPET, P[1] + bz, 0, 0, l * 0.25, 0.25, PIERRE_QUAI, 0.84, 0.96);
      st.quad(Q[0], yQ + PARAPET, Q[1], P[0], yP + PARAPET, P[1], P[0] + bx, yP + PARAPET, P[1] + bz, Q[0] + bx, yQ + PARAPET, Q[1] + bz, l * 0.25, 0, 0, 0.1, PIERRE_QUAI, 1, 1);
      murs++;
    }
  }
  app.stats.quais = murs; app.stats.arches = arches;
}
