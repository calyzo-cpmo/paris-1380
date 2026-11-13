// Intérieurs visitables : nefs d'églises, grandes salles, salles de tours. Chaque lieu est construit à la demande
// dans une scène à part, où l'on se déplace comme dans une visite virtuelle (glisser pour regarder, cliquer le sol pour avancer).
import * as THREE from 'three';
import { Kit, C, ART, Q, cellUV, prof, surf, makeInteriorMaterials, rgb, cyl, cone, disc } from './interior_kit.js';
import { SPECS, specFor } from './interior_specs.js';

const PI = Math.PI, FACE_E = PI, FACE_W = 0, FACE_PX = PI / 2, FACE_NX = -PI / 2;     // orientation des personnages : vers le fond (−z), l'entrée (+z), +x, −x
const KING = { kind: 'robe', col: [34, 52, 126], v: [7, 1, 0, 0] }, NUN = { v: [4, 1, 2, 1] }, WHITE_MONK = { v: [6, 1, 7, 0], col: [255, 255, 255] };

// ====================================================================== nef d'église
function nave(K, o) {
  const { L, wN, hN, bays } = o, wA = o.wA || 0, na = wA ? o.aisles || 1 : 0, hA = o.hA || 0, s = o.s ?? 1, d = L / bays, X = wN / 2 + na * wA, zW = L / 2, zE = -L / 2, zb = (i) => zW - i * d, r = K.r;
  K.s = s;
  const riseN = Math.min((wN / 2) * Math.sqrt(1 + 2 * s), hN * 0.42), yN = hN - riseN, yA = hA * 0.58, Ra = wN / 2, pr = o.pierR ?? 0.6;
  const wallM = o.wallMat || 'stone', vaultM = o.vaultMat || 'plaster', floorM = o.floorMat || 'slab', ref = [0, hN * 0.4, 0], tr = o.transept || null, inT = (i) => tr && i >= tr[0] && i <= tr[1];
  const gl = o.glass || [0, 3], choir = o.choir ?? 2, ic = bays - choir, zc = zb(ic), vo = { ribCol: o.ribCol, boss: o.boss, col: o.vaultCol };
  const timber = (i) => o.ceiling && !(o.choirVault && i >= ic);
  K.floor(floorM, -X, zE - Ra - 1, X, zW, 0, { us: o.floorUs });
  // revers de façade : portail, rose
  K.wall(wallM, -wN / 2, zW, wN / 2, zW, 0, hN, ref);
  if (na) for (const sd of [-1, 1]) { K.wall(wallM, sd * wN / 2, zW, sd * X, zW, 0, hA + 0.6, ref); K.lancet(sd * (wN / 2 + na * wA * 0.5 - 0.9), zW, sd * (wN / 2 + na * wA * 0.5 + 0.9), zW, 3, hA * 0.86, ref, 2); }
  K.panel(ART.door, -1.7, zW, 1.7, zW, 0, 5.6, ref);
  if (o.rose) K.rose(0, o.roseY ?? hN * 0.64, zW, o.rose, 0, -1); else K.lancet(-1.6, zW, 1.6, zW, 7, yN + riseN * 0.7, ref, gl[0]);
  for (let i = 0; i < bays; i++) {
    const z0 = zb(i), z1 = zb(i + 1), zm = (z0 + z1) / 2, T = inT(i), sArc = o.sArc ?? s;
    for (const sd of [-1, 1]) {
      const xn = (sd * wN) / 2;
      if (na) {
        if (T) continue;
        K.archWall(wallM, xn, z0, xn, z1, { ySp: yA, yTop: hN, inset: pr, s: sArc });
        const xf = xn - sd * 0.46, cl = o.clere || [hA + 1.4, yN + riseN * 0.76];
        if (o.trib) K.panel(ART.tribune, xf, z0 - 0.2, xf, z1 + 0.2, o.trib[0], o.trib[1], [0, 9, zm], { uv: cellUV([1024, 256, 256, 256]) });
        if (!timber(i) || o.ceiling !== 'barrelLow') K.lancet(xf, zm + d * 0.3, xf, zm - d * 0.3, cl[0], cl[1], [0, cl[0], zm], gl[i % gl.length]);
        for (let k = 0; k < na; k++) {
          const xa0 = sd * (wN / 2 + k * wA), xa1 = sd * (wN / 2 + (k + 1) * wA);
          K.vault(vaultM, xa0, xa1, z0, z1, yA, hA, { n: 6, s: sArc, ribW: 0.22, ribD: 0.2, ...vo });
          if (k < na - 1) K.archWall(wallM, xa1, z0, xa1, z1, { ySp: yA, yTop: hA + 0.4, th: 0.7, inset: pr * 0.8, s: sArc });
        }
        K.wall(wallM, sd * X, z0, sd * X, z1, 0, hA + 0.6, ref);
        K.lancet(sd * X, zm + d * 0.24, sd * X, zm - d * 0.24, 2.8, hA * 0.9, [0, 3, zm], gl[(i + 1) % gl.length]);
      } else {
        K.wall(o.dado ? 'stone' : wallM, xn, z0, xn, z1, 0, hN, ref);
        const sill = o.sill ?? 4;
        const wn = o.winN || 1, ww = (2 * d * (o.winW ?? 0.36)) / wn;       // une grande baie, ou plusieurs lancettes accolées
        for (let q = 0; q < wn; q++) { const za = zm + d * (o.winW ?? 0.36) - q * ww, mid = wn > 2 && q > 0 && q < wn - 1; K.lancet(xn, za - 0.05, xn, za - ww + 0.05, sill, yN + riseN * (wn > 1 ? (mid ? 0.74 : 0.5) : 0.8), [0, sill, zm], gl[(i + q) % gl.length]); }
        if (o.dado) K.panel(ART.dado, xn, z0, xn, z1, 0.5, sill - 0.5, [0, 2, zm], { uv: cellUV([0, 512, 384, 256]) });
        if (i > 0) K.shaft(xn - sd * 0.22, z0, 0.2, 0, yN, o.shaftCol ?? C.stone);
      }
    }
    if (T) continue;
    if (!timber(i)) { K.vault(vaultM, -wN / 2, wN / 2, z0, z1, yN, hN, vo); if (i > 0 && !inT(i - 1)) K.crossRib(-wN / 2, z0, wN / 2, z0, yN, hN, { col: o.ribCol }); }
    else if (o.ceiling === 'flat') { K.floor('wood', -wN / 2, z1, wN / 2, z0, hN, { down: true, us: 0.4, s: 0.8 }); K.beam('wood', [-wN / 2, hN - 0.22, z0], [wN / 2, hN - 0.22, z0], 0.36, 0.44, C.woodD); K.beam('wood', [-wN / 2, hN - 0.22, zm], [wN / 2, hN - 0.22, zm], 0.24, 0.34, C.wood); }
    else { K.vault('wood', -wN / 2, wN / 2, z0, z1, yN, hN, { barrel: 'z', s: 0.6, us: 0.4, dark: 0.7 }); K.beam('wood', [-wN / 2, yN + 0.1, z0], [wN / 2, yN + 0.1, z0], 0.3, 0.36, C.woodD); K.beam('wood', [0, yN + 0.1, z0], [0, hN - 0.2, z0], 0.2, 0.2, C.woodD); }
  }
  // supports
  for (let i = 0; i <= bays; i++) {
    if (tr && i > tr[0] && i <= tr[1]) continue;
    for (const sd of [-1, 1]) if (na) {
      for (let k = 0; k < na; k++) { const x = sd * (wN / 2 + k * wA); K.pier(x, zb(i), k ? pr * 0.8 : pr, yA, { cap: o.capCol }); }
      K.shaft(sd * (wN / 2 - pr * 0.75), zb(i), 0.16, yA, timber(Math.min(i, bays - 1)) ? yA + 0.1 : yN, o.shaftCol ?? C.stone);
    }
  }
  // transept : croisée et bras à pleine hauteur, roses aux extrémités
  if (tr) {
    const zt0 = zb(tr[0]), zt1 = zb(tr[1] + 1), zt = (zt0 + zt1) / 2;
    K.vault(vaultM, -wN / 2, wN / 2, zt0, zt1, yN, hN, { n: 10, ...vo });
    for (const z of [zt0, zt1]) K.crossRib(-wN / 2, z, wN / 2, z, yN, hN, { w: 0.7, d: 0.55 });
    for (const sd of [-1, 1]) {
      K.vault(vaultM, (sd * wN) / 2, sd * X, zt0, zt1, yN, hN, { n: 10, ...vo }); K.crossRib((sd * wN) / 2, zt0, (sd * wN) / 2, zt1, yN, hN, { w: 0.7, d: 0.55 });
      for (const z of [zt0, zt1]) for (let k = 0; k < na; k++) K.archWall(wallM, sd * (wN / 2 + k * wA), z, sd * (wN / 2 + (k + 1) * wA), z, { ySp: yA, yTop: hN, inset: pr * 0.8 });
      K.wall(wallM, sd * X, zt0, sd * X, zt1, 0, hN, ref);
      const D = o.tRose ?? zt0 - zt1 - 1.4; K.rose(sd * X, o.tRoseY ?? yN + 0.6, zt, D, -sd, 0);
      const lw = (zt0 - zt1 - 1.6) / 6; for (let k = 0; k < 6; k++) { const za = zt0 - 0.8 - k * lw; K.lancet(sd * X, za - 0.12, sd * X, za - lw + 0.12, hA + 0.8, yN - D / 2 - 0.6, [0, hA, zt], 2); }
      K.panel(ART.door, sd * X, zt + 1.5, sd * X, zt - 1.5, 0, 5, [0, 2, zt]);
    }
  }
  // chevet : abside à pans, ou mur droit
  const N = o.apse === false ? 0 : o.apseN || 5, sillA = o.apseSill ?? o.sill ?? 5;
  if (N) {
    const pt = (k) => { const a = (PI * k) / N; return [Ra * Math.cos(a), zE - Ra * Math.sin(a)]; };
    for (let k = 0; k < N; k++) { const a = pt(k), c = pt(k + 1), mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2, q = 0.34; K.wall(o.dado ? 'stone' : wallM, a[0], a[1], c[0], c[1], 0, hN, [0, 5, zE]);
      if (o.winN) { K.lancet(mx + (a[0] - mx) * q * 2, mz + (a[1] - mz) * q * 2, mx + (a[0] - mx) * 0.03, mz + (a[1] - mz) * 0.03, sillA, yN + riseN * 0.56, [0, 5, zE], gl[k % gl.length]); K.lancet(mx + (c[0] - mx) * 0.03, mz + (c[1] - mz) * 0.03, mx + (c[0] - mx) * q * 2, mz + (c[1] - mz) * q * 2, sillA, yN + riseN * 0.56, [0, 5, zE], gl[(k + 1) % gl.length]); }
      else K.lancet(mx + (a[0] - mx) * q * 2, mz + (a[1] - mz) * q * 2, mx + (c[0] - mx) * q * 2, mz + (c[1] - mz) * q * 2, sillA, yN + riseN * 0.62, [0, 5, zE], gl[k % gl.length]); if (o.dado) K.panel(ART.dado, a[0], a[1], c[0], c[1], 0.5, sillA - 0.5, [0, 2, zE], { uv: cellUV([0, 512, 256, 256]) }); if (k) K.shaft(a[0] * 0.95, zE + (a[1] - zE) * 0.95, 0.18, 0, yN, o.shaftCol ?? C.stone); }
    surf(K.b(vaultM), 10, 6, (u, v0) => { const v = 0.03 + 0.97 * v0, a = PI * u, q = 1.04 * v, y = yN + riseN * prof(Math.min(1, v), s); return [Ra * Math.cos(a) * q, y, zE - Ra * Math.sin(a) * q, 0.6 + 0.4 * (1 - v), Ra * Math.cos(a) * q * 0.25, (zE - Ra * Math.sin(a) * q) * 0.25]; }, [0, 0, zE - 1], o.vaultCol ?? 0xffffff);
    for (let k = 0; k <= N; k++) { const p = pt(k), pts = []; for (let j = 0; j <= 8; j++) { const t = j / 8; pts.push([p[0] * t, yN + riseN * prof(t, s), zE + (p[1] - zE) * t]); } K.rib(pts, 0.26, 0.24, o.ribCol ?? C.stone); }
    cyl(K.b('plain'), 0, zE, 0.45, hN - 0.5, hN - 0.2, { seg: 8, col: o.boss ?? C.gold }); disc(K.b('plain'), 0, zE, 0.45, hN - 0.5, { seg: 8, col: o.boss ?? C.gold });
    K.crossRib(-wN / 2, zE, wN / 2, zE, yN, hN, { col: o.ribCol });
  } else { K.wall(wallM, -wN / 2, zE, wN / 2, zE, 0, hN, ref); for (const x of [-2.6, 0, 2.6]) K.lancet(x - 1.05, zE, x + 1.05, zE, 5, yN + riseN * (x ? 0.3 : 0.62), ref, gl[0]); }
  if (na) for (const sd of [-1, 1]) {
    K.wall(wallM, (sd * wN) / 2, zE, sd * X, zE, 0, hA + 0.6, ref);
    for (let k = 0; k < na; k++) { const xa = sd * (wN / 2 + (k + 0.5) * wA); K.lancet(xa - 0.9, zE, xa + 0.9, zE, 3.4, hA * 0.86, ref, gl[k % gl.length]); K.altar(xa, zE + 1.0, 0, { w: 1.0, steps: 1, rh: 0.9, light: k === 0 ? 0.7 : 0 }); }
  }

  // ---- mobilier liturgique
  const zAlt = N ? zE - Ra * 0.18 : zE + 1.6, kind = o.kind;
  const ya = K.altar(0, zAlt, 0, { w: kind === 'cathedral' ? 2.3 : 1.7, steps: 3, rh: kind === 'cathedral' ? 1.9 : 1.4, light: 1.3 });
  K.fig(0, zAlt + 1.75, FACE_E, 'robe', 'monk', { col: [240, 234, 216], y: ya * 0.34 }); K.fig(-1.3, zAlt + 2.3, FACE_E + 0.2, 'robe', 'monk'); K.fig(1.3, zAlt + 2.3, FACE_E - 0.2, 'robe', 'monk');
  for (const sd of [-1, 1]) K.candlestick(sd * (wN * 0.27), zAlt + 2.2, 1.7, sd > 0 ? 0.8 : 0);
  if (kind === 'saintechapelle') {
    // tribune des reliques : la Grande Châsse sous son baldaquin, derrière l'autel
    const zt = zE - Ra * 0.62; for (const sx of [-1.5, 1.5]) for (const sz of [-0.8, 0.8]) cyl(K.b('stone'), sx, zt + sz, 0.13, 0, 3.6, { seg: 6, col: C.gold });
    K.bx('stone', 0, zt, 1.9, 1.1, 3.6, 3.9, C.stoneW, 0); K.bx('metal', 0, zt, 1.2, 0.45, 3.9, 4.9, C.gold, 0); K.beam('metal', [-1.2, 5.15, zt], [1.2, 5.15, zt], 0.5, 0.5, C.gold);
    for (const sx of [-1.5, 1.5]) for (const sz of [-0.8, 0.8]) cyl(K.b('stone'), sx, zt + sz, 0.07, 3.9, 6.2, { seg: 5, col: C.gold }); cone(K.b('plain'), 0, zt, 2.1, 6.2, 8.4, { seg: 4, col: C.blue, a0: PI / 4 });
    K.block(-2.2, zt - 1.3, 2.2, zt + 1.3);
    for (let i = 0; i <= bays; i++) for (const sd of [-1, 1]) K.statue(sd * (wN / 2 - 0.55), zb(i) + (i === 0 ? -0.5 : i === bays ? 0.5 : 0), sd > 0 ? FACE_NX : FACE_PX, { console: true, y: 3.3, kind: 'robe', col: [[150, 40, 40], [40, 60, 130], [60, 100, 70], [200, 170, 80]][(i + (sd > 0 ? 1 : 0)) % 4], v: [7, 1, [1, 2, 5, 3][i % 4], 0], scale: 1.15 });
    for (const sd of [-1, 1]) K.bx('wood', sd * (wN / 2 - 0.5), zc + d * 0.5, d * 1.4, 0.32, 0, 0.5, C.wood, PI / 2);
    K.fig(-1.2, zc + 2, FACE_E, 'robe', null, KING); K.fig(1.3, zc + 2.4, FACE_E, 'robe', null, { col: [150, 30, 34], v: [3, 1, 3, 1] });
  } else {
    // clôture, stalles, lutrin
    for (let i = ic; i < bays; i++) for (const sd of [-1, 1]) {
      const zm = (zb(i) + zb(i + 1)) / 2, xw = (sd * wN) / 2;
      if (na && (o.cloture || kind === 'cathedral')) { K.bx('stone', xw, zm, d / 2 - pr - 0.1, 0.16, 0, 3.1, C.stoneW, PI / 2); K.panel(ART.scene, xw + sd * 0.17, zb(i) - pr - 0.2, xw + sd * 0.17, zb(i + 1) + pr + 0.2, 1.1, 2.9, [sd * X, 2, zm], { uv: cellUV([512, 0, 384, 300]) }); K.block(xw - 0.3, zb(i + 1), xw + 0.3, zb(i)); }
      if (i < bays - 1 || !N) {
        K.bx('wood', xw - sd * 0.75, zm, d / 2 - 0.15, 0.3, 0, 1.0, C.wood, PI / 2, { us: 0.5 }); K.bx('wood', xw - sd * 0.42, zm, d / 2 - 0.15, 0.07, 0, 2.5, C.woodD, PI / 2, { us: 0.5 }); K.bx('wood', xw - sd * 1.7, zm, d / 2 - 0.3, 0.22, 0, 0.8, C.wood, PI / 2, { us: 0.5 });
        K.block(Math.min(xw - sd * 2.0, xw - sd * 0.3), zb(i + 1) + 0.1, Math.max(xw - sd * 2.0, xw - sd * 0.3), zb(i) - 0.1);
        for (const t of [-0.28, 0.2]) if (r() < 0.75) K.fig(xw - sd * 1.22, zm + t * d, sd > 0 ? FACE_NX : FACE_PX, 'robe', 'monk', { y: 0.02 });
      }
    }
    K.lectern(0, zc - d * 0.9, 0, { h: 1.25 }); K.fig(0, zc - d * 0.9 + 0.75, FACE_E, 'robe', 'monk');
    if (o.jube) {
      // jubé : clôture transversale à porte centrale, surmontée de la croix triomphale
      for (const sd of [-1, 1]) { K.bx('stone', sd * (wN / 4 + 0.55), zc, wN / 4 - 0.55, 0.35, 0, 4.4, C.stoneW, 0); K.panel(ART.scene, sd * 1.2, zc + 0.36, (sd * wN) / 2, zc + 0.36, 0.9, 3.6, [0, 2, zc + 9], { uv: cellUV([512, 0, 512, 400]) }); K.block(Math.min(sd * 1.1, (sd * wN) / 2), zc - 0.5, Math.max(sd * 1.1, (sd * wN) / 2), zc + 0.5); }
      K.bx('stone', 0, zc, 1.1, 0.35, 3.3, 4.4, C.stoneW, 0); K.bx('plain', 0, zc, wN / 2, 0.4, 4.4, 4.62, C.gold, 0);
      K.beam('plain', [0, 4.6, zc], [0, 8.6, zc], 0.2, 0.2, C.woodD); K.beam('plain', [-1.4, 7.5, zc], [1.4, 7.5, zc], 0.2, 0.2, C.woodD); K.fig(0, zc + 0.14, FACE_W, 'man', null, { y: 5.85, scale: 0.95, col: [226, 216, 196], v: [4, 0, 1, 0] });
    } else { K.beam('wood', [-wN / 2 + 0.3, hN * 0.5, zc], [wN / 2 - 0.3, hN * 0.5, zc], 0.3, 0.34, C.woodD); K.beam('plain', [0, hN * 0.5, zc], [0, hN * 0.5 + 3.2, zc], 0.16, 0.16, C.gold); K.beam('plain', [-1.0, hN * 0.5 + 2.3, zc], [1.0, hN * 0.5 + 2.3, zc], 0.16, 0.16, C.gold); }
    if (kind === 'cathedral') { for (const sx of [-0.9, 0.9]) for (const sz of [-0.5, 0.5]) cyl(K.b('stone'), sx, zAlt - 2.4 + sz, 0.11, 0, 3.4, { seg: 6, col: C.stone }); K.bx('stone', 0, zAlt - 2.4, 1.2, 0.7, 3.4, 3.6, C.stoneW, 0); K.bx('metal', 0, zAlt - 2.4, 0.9, 0.34, 3.6, 4.4, C.gold, 0); cone(K.b('metal'), 0, zAlt - 2.4, 1.0, 4.4, 5.0, { seg: 4, col: C.gold, a0: PI / 4 }); K.block(-1.3, zAlt - 3.2, 1.3, zAlt - 1.6); }
  }
  // fonts baptismaux, statues, cierges, fidèles (ni bancs ni chaises : on se tient debout)
  if (kind !== 'saintechapelle' && kind !== 'monastic') { const fx = na ? -(wN / 2 + wA * 0.5) : -wN * 0.3; cyl(K.b('stone'), fx, zW - 3.2, 0.3, 0, 0.6, { seg: 8, col: C.stone }); cyl(K.b('stone'), fx, zW - 3.2, 0.3, 0.6, 1.05, { seg: 8, col: C.stoneW, r1: 0.62 }); disc(K.b('plain'), fx, zW - 3.2, 0.58, 1.02, { seg: 8, col: C.lead }); K.pillarBlock(fx, zW - 3.2, 0.9); }
  if (na) { const i = Math.max(1, Math.min(ic - 1, tr ? tr[0] - 1 : Math.floor(bays * 0.4))); K.statue(wN / 2 - pr - 0.45, zb(i) + 0.9, FACE_NX, { y: 1.3, kind: 'robe', col: [40, 62, 140], v: [3, 1, 3, 1] }); K.candlestick(wN / 2 - pr - 1.1, zb(i) + 0.3, 1.2, 0.7); K.candlestick(wN / 2 - pr - 1.1, zb(i) + 1.5, 1.2); }
  const nP = o.people ?? 12, z1 = zc + 1.5, z2 = zW - 3;
  for (let k = 0; k < nP; k++) { const inAisle = na && r() < 0.3, x = inAisle ? (r() < 0.5 ? -1 : 1) * (wN / 2 + 1 + r() * (na * wA - 2)) : (r() - 0.5) * (wN - 3.4), z = z1 + r() * (z2 - z1); if (!K.free(x, z)) continue; K.fig(x, z, FACE_E + (r() - 0.5) * 0.9, r() < 0.5 ? 'robe' : 'man', o.folk || null); }
  K.spots.push(['Entrée', 0, zW - 3, 0], ['Nef', 0, (zc + zW) / 2 + 2, 0]); if (tr) K.spots.push(['Croisée', 0, (zb(tr[0]) + zb(tr[1] + 1)) / 2, 0]); if (na) K.spots.push(['Bas-côté', wN / 2 + wA * 0.5, zW - d * 2, 0.5]);
  K.spots.push(['Chœur', 0, zc - (o.jube ? -3 : d * 0.3), 0]);
  return { entry: [0, zW - 3, 0], h: hN, bounds: (x, z) => z < zW - 0.7 && (z > zE + 0.8 ? Math.abs(x) < X - 0.7 : N > 0 && Math.hypot(x, zE - z) < Ra - 1.1) };
}

// ====================================================================== grande salle
function hall(K, o) {
  const { L, W, H } = o, zW = L / 2, zE = -L / 2, X = W / 2, ref = [0, H * 0.4, 0], wallM = o.wallMat || 'stone', floorM = o.floorMat || 'slab', r = K.r;
  const rows = o.rows || 0, nb = o.bays || 1, d = L / nb, wv = W / (rows + 1), xr = (k) => -X + wv * k, zb = (i) => zW - i * d, ySp = o.ySp ?? H * 0.55, s = o.s ?? 1, kind = o.kind;
  K.s = s;
  K.floor(floorM, -X, zE, X, zW, 0, { us: o.floorUs });
  K.wall(wallM, -X, zW, X, zW, 0, H + (o.ceiling === 'open' ? o.rise || 4 : 0), ref); K.wall(wallM, -X, zE, X, zE, 0, H + (o.ceiling === 'open' ? o.rise || 4 : 0), ref); K.wall(wallM, -X, zE, -X, zW, 0, H, ref); K.wall(wallM, X, zE, X, zW, 0, H, ref);
  for (const dx of o.doorX || [0]) K.panel(ART.door, dx - 1.4, zW, dx + 1.4, zW, 0, Math.min(4.4, H - 0.6), ref);
  // couvrement
  if (o.ceiling === 'vault') {
    for (let i = 0; i < nb; i++) for (let k = 0; k <= rows; k++) K.vault(o.vaultMat || 'plaster', xr(k), xr(k + 1), zb(i), zb(i + 1), ySp, H, { n: o.ribs === false ? 12 : 6, ribs: o.ribs, ribW: 0.22, ribD: 0.2, ribCol: o.ribCol, boss: o.boss });
    for (let i = 1; i < nb; i++) for (let k = 1; k <= rows; k++) K.pier(xr(k), zb(i), o.pierR ?? 0.32, ySp, { seg: 10 });
  } else if (o.ceiling === 'barrel') {
    for (let k = 0; k <= rows; k++) { K.vault(o.vaultMat || 'wood', xr(k), xr(k + 1), zE, zW, ySp, H, { barrel: 'z', s: 0.55, n: 12, us: 0.3, dark: 0.75 }); for (let i = 1; i < nb; i++) { K.beam('wood', [xr(k), ySp + 0.2, zb(i)], [xr(k + 1), ySp + 0.2, zb(i)], 0.34, 0.4, C.woodD); K.beam('wood', [(xr(k) + xr(k + 1)) / 2, ySp + 0.2, zb(i)], [(xr(k) + xr(k + 1)) / 2, H - 0.3, zb(i)], 0.22, 0.22, C.woodD); } }
    for (let k = 1; k <= rows; k++) for (let i = 0; i < nb; i++) { K.archWall('stone', xr(k), zb(i), xr(k), zb(i + 1), { ySp: ySp * 0.62, yTop: ySp + 0.8, th: 1.0, inset: 0.7, s: 0.8 }); if (i > 0) K.pier(xr(k), zb(i), o.pierR ?? 0.7, ySp * 0.62); }
  } else if (o.ceiling === 'open') {
    const rise = o.rise || 4;
    for (const sd of [-1, 1]) Q(K.b('wood'), [sd * X, H, zE], [sd * X, H, zW], [0, H + rise, zW], [0, H + rise, zE], [0, 0, 0], { us: 0.35, s0: 0.6, s1: 0.85 });
    for (let i = 0; i <= nb; i++) { const z = zb(i) + (i === 0 ? -0.2 : i === nb ? 0.2 : 0); K.beam('wood', [-X, H, z], [X, H, z], 0.3, 0.34, C.woodD); K.beam('wood', [0, H, z], [0, H + rise - 0.2, z], 0.22, 0.22, C.woodD); for (const sd of [-1, 1]) { K.beam('wood', [sd * X, H + 0.1, z], [0, H + rise - 0.1, z], 0.2, 0.26, C.wood); K.beam('wood', [sd * X * 0.5, H + 0.05, z], [0, H + rise * 0.55, z], 0.16, 0.16, C.wood); } }
    for (let k = 1; k <= rows; k++) for (let i = 1; i < nb; i++) { K.bx('wood', xr(k), zb(i), 0.17, 0.17, 0, H, C.woodD, 0, { us: 0.6 }); K.pillarBlock(xr(k), zb(i), 0.5); }
  } else {
    K.floor(o.ceilMat || 'wood', -X, zE, X, zW, H, { down: true, us: 0.4, s: 0.82, col: o.ceilCol });
    const nj = Math.max(2, Math.round(L / (o.joist ?? 2.2))); for (let i = 0; i <= nj; i++) { const z = zE + 0.2 + ((L - 0.4) * i) / nj; K.beam('wood', [-X, H - 0.2, z], [X, H - 0.2, z], 0.3, 0.4, i % 3 === 0 ? C.woodD : C.wood); }
    for (let k = 1; k <= rows; k++) { K.beam('wood', [xr(k), H - 0.55, zE], [xr(k), H - 0.55, zW], 0.4, 0.34, C.woodD); for (let i = 1; i < nb; i++) { K.bx('wood', xr(k), zb(i), 0.2, 0.2, 0, H - 0.7, C.woodD, 0, { us: 0.6 }); K.pillarBlock(xr(k), zb(i), 0.5); } }
  }
  // baies
  const win = o.win;
  if (win) for (let i = 0; i < nb; i++) for (const sd of win.sides || [-1, 1]) { const zm = (zb(i) + zb(i + 1)) / 2, hw = (win.w ?? 1.4) / 2; if (win.sky) Q(K.b('glow'), [sd * (X - 0.04), win.y0, zm + hw], [sd * (X - 0.04), win.y0, zm - hw], [sd * (X - 0.04), win.y1, zm - hw], [sd * (X - 0.04), win.y1, zm + hw], [0, win.y0, zm], { col: rgb(206, 224, 244) }); else K.lancet(sd * X, zm + hw, sd * X, zm - hw, win.y0, win.y1, [0, win.y0, zm], win.type ?? 2); }
  if (o.endWin) for (const z of [zE, zW]) for (const x of o.endWin.xs) K.lancet(x - o.endWin.w / 2, z, x + o.endWin.w / 2, z, o.endWin.y0, o.endWin.y1, ref, o.endWin.type ?? 2);
  const tap = (sd, z0, z1, y0, y1, cell, uv) => K.panel(cell, sd * X, z0, sd * X, z1, y0, y1, [0, y0, (z0 + z1) / 2], uv ? { uv } : {});
  const folk = (n, x0, x1, z0, z1, role, face) => { for (let k = 0; k < n; k++) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); if (K.free(x, z)) K.fig(x, z, face != null ? face + (r() - 0.5) * 1.2 : r() * 6.28, r() < 0.42 ? 'robe' : 'man', role); } };
  const dais = (z, w, depth, h = 0.3) => { K.bx('wood', 0, z, w, depth, 0, h, C.wood, 0, { us: 0.5 }); };

  if (kind === 'grandsalle') {
    // statues des rois sur les piliers et le long des murs, table de marbre, boutiques des merciers
    const kc = [[40, 60, 140], [150, 40, 40], [60, 100, 70], [200, 180, 120]];
    for (let i = 1; i < nb; i++) { for (const sd of [-1, 1]) K.statue(sd * 1.05, zb(i), sd > 0 ? FACE_PX : FACE_NX, { console: true, y: 4.2, kind: 'robe', col: kc[(i + (sd > 0 ? 2 : 0)) % 4], v: [7, 1, [1, 2, 5, 3, 0][i % 5], 0], scale: 1.3 }); for (const sd of [-1, 1]) K.statue(sd * (X - 0.5), zb(i), sd > 0 ? FACE_NX : FACE_PX, { console: true, y: 4.2, kind: 'robe', col: kc[(i + (sd > 0 ? 1 : 3)) % 4], v: [7, 1, [2, 5, 1, 3, 0][i % 5], 0], scale: 1.3 }); }
    K.bx('stone', 0, zW - 7, 5.2, 1.6, 0, 0.3, C.stone, 0); K.bx('plain', 0, zW - 7, 4.6, 1.15, 0.3, 1.05, C.black, 0, { s0: 0.9 }); K.block(-5.4, zW - 8.8, 5.4, zW - 5.2);
    for (let i = 2; i < nb - 1; i++) for (const sd of [-1, 1]) { const z = zb(i) + d * 0.5; K.table(sd * 2.6, z, 1.3, 0.5, PI / 2); for (let q = 0; q < 4; q++) K.bx('plain', sd * 2.6 + (r() - 0.5) * 0.5, z - 0.9 + q * 0.6, 0.2, 0.16, 0.8, 0.9 + r() * 0.2, [C.red, C.blue, C.gold, C.linen][q], PI / 2); K.fig(sd * 1.75, z, sd > 0 ? FACE_PX : FACE_NX, 'man', 'merchant'); }
    K.fireplace(-X + 0.6, zb(3) + d * 0.5, -PI / 2, 2.6, { top: 9 }); K.fireplace(X - 0.6, zb(6) + d * 0.5, PI / 2, 2.6, { top: 9 });
    for (let i = 1; i < nb; i += 2) for (const sd of [-1, 1]) K.banner(sd * (X * 0.5), ySp + 1.4, zb(i), 0, 'lis', 1.3, 2.6);
    for (const sd of [-1, 1]) K.fig(sd * 2.0, zW - 1.6, FACE_E, 'man', 'guard');
    for (let k = 0; k < 5; k++) K.fig(-3 + k * 1.5, zW - 9.4, FACE_W + (r() - 0.5), 'robe', null, { col: [[30, 30, 36], [120, 30, 34], [36, 50, 110]][k % 3], v: [7, 1, (r() * 6) | 0, 0] });
    folk(34, -X + 2.2, X - 2.2, zE + 3, zW - 11, null, null);
    K.spots.push(['Entrée', -X / 2, zW - 3, 0], ['Table de marbre', -X / 2, zW - 12, 0.9], ['Milieu de la salle', X / 2, 0, 0], ['Fond', -X / 2, zE + 6, 0]);
    return { entry: [-X / 2, zW - 3, 0], h: H, bounds: (x, z) => Math.abs(x) < X - 0.7 && z > zE + 0.7 && z < zW - 0.7 };
  }
  if (kind === 'ward' || kind === 'hospice') {
    const nbed = Math.floor((L - 9) / 2.3);
    for (let i = 0; i < nbed; i++) for (const sd of [-1, 1]) { const z = zW - 4 - i * 2.3; K.bed(sd * (X - 1.25), z, sd > 0 ? PI : 0, { sick: r() < 0.8, cover: i % 5 === 4 ? C.blue : C.red }); if (rows && kind === 'ward' && i % 2 === 0) K.bed(sd * 1.5, z, sd > 0 ? 0 : PI, { sick: r() < 0.7 }); }
    K.altar(rows ? -X / 2 : 0, zE + 1.2, 0, { w: 1.3, steps: 2, rh: 1.1 }); if (rows) K.altar(X / 2, zE + 1.2, 0, { w: 1.3, steps: 2, rh: 1.1, light: 0.8 });
    for (let k = 0; k < (kind === 'ward' ? 9 : 5); k++) { const sd = r() < 0.5 ? -1 : 1, x = sd * (X - 3 - r() * (rows ? X - 6.2 : 1.2)), z = zE + 5 + r() * (L - 10); if (K.free(x, z)) K.fig(x, z, r() * 6.28, 'robe', null, NUN); }
    folk(kind === 'ward' ? 6 : 9, -X + 3, X - 3, zE + 4, zW - 3, kind === 'ward' ? null : 'peasant', null);
    if (kind === 'hospice') { K.table(0, 0, 3, 0.45, PI / 2); K.bench(-0.9, 0, 3, PI / 2); K.bench(0.9, 0, 3, PI / 2); }
    for (let i = 1; i < nb; i += 2) K.torch(rows ? 0.6 : -X + 0.25, 3.2, zb(i), i === 3 ? 1.0 : 0);
    K.spots.push(['Entrée', rows ? -X / 2 : 0, zW - 2.5, 0], ['Milieu', rows ? -X / 2 : kind === 'hospice' ? -1.75 : 0, 0, 0], ['Autel', rows ? X / 2 : 0, zE + 5, 0]);
    return { entry: [rows ? -X / 2 : 0, zW - 2.5, 0], h: H, bounds: (x, z) => Math.abs(x) < X - 0.6 && z > zE + 0.6 && z < zW - 0.6 };
  }
  if (kind === 'market') {
    const cloths = [C.red, C.blue, C.green, C.gold, C.linen, rgb(110, 60, 110), rgb(150, 100, 60)];
    for (let i = 0; i < nb; i++) for (const sd of [-1, 1]) for (const lane of rows ? [0.26, 0.84] : [0.6]) {
      const x = sd * X * lane, z = zb(i) - d * 0.5; K.table(x, z, d * 0.36, 0.55, PI / 2);
      for (let q = 0; q < 5; q++) K.bx('plain', x + (r() - 0.5) * 0.4, z - d * 0.3 + q * d * 0.15, 0.3, 0.2, 0.8, 0.92 + r() * 0.25, cloths[(r() * cloths.length) | 0], PI / 2 + (r() - 0.5) * 0.3);
      K.fig(x + sd * (lane > 0.5 ? 0.95 : -0.95), z + (r() - 0.5) * d * 0.4, sd * (lane > 0.5 ? -1 : 1) > 0 ? FACE_PX : FACE_NX, r() < 0.7 ? 'man' : 'robe', 'merchant');
    }
    for (let k = 0; k < 6; k++) K.barrel((r() < 0.5 ? -1 : 1) * (X - 0.7), zE + 2 + r() * (L - 4));
    folk(30, -X + 1, X - 1, zE + 1.5, zW - 4.5, null, null);
    const xl = rows ? X * 0.55 : 0;
    K.spots.push(['Entrée', xl, zW - 2.5, 0], ['Milieu de l’allée', xl, 0, 0], ['Autre allée', -xl, zE + 6, PI]);
    return { entry: [xl, zW - 2.5, 0], h: H, bounds: (x, z) => Math.abs(x) < X - 0.6 && z > zE + 0.6 && z < zW - 0.6 };
  }
  if (kind === 'royal' || kind === 'court') {
    // estrade, dais, haute table ou banc du juge
    const zd = zE + 2.4; dais(zd, X - 0.6, 2.2);
    K.panel(ART.lis, -2.4, zE, 2.4, zE, 0.4, Math.min(H - 0.8, 6.2), ref, { off: 0.06 });
    Q(K.b('artD'), [-2.0, H - 1.6, zE + 0.2], [2.0, H - 1.6, zE + 0.2], [2.0, H - 1.6, zE + 2.4], [-2.0, H - 1.6, zE + 2.4], [0, 0, zE + 1], { uv: cellUV(ART.lis, ART.W, ART.H, 30) });
    Q(K.b('artD'), [-2.0, H - 2.1, zE + 2.4], [2.0, H - 2.1, zE + 2.4], [2.0, H - 1.6, zE + 2.4], [-2.0, H - 1.6, zE + 2.4], [0, 2, 0], { uv: cellUV([512, 512, 512, 60]) });
    K.bx('wood', 0, zE + 1.0, 0.5, 0.36, 0.3, 0.86, C.woodD, 0); K.bx('wood', 0, zE + 0.66, 0.5, 0.06, 0.3, 2.4, C.woodD, 0);
    if (kind === 'royal') {
      K.table(0, zd + 1.0, 3.2, 0.5, 0, true); K.fig(0, zE + 1.55, FACE_W, 'robe', null, o.lord || KING); K.fig(1.4, zE + 1.5, FACE_W, 'robe', null, { col: [150, 30, 34], v: [3, 1, 3, 1], y: 0.3 }); K.fig(-1.5, zE + 1.5, FACE_W, 'robe', null, { col: [104, 40, 110], v: [7, 1, 2, 0], y: 0.3 });
      for (const q of [-2.2, -0.8, 0.9, 2.3]) { cyl(K.b('metal'), q, zd + 1.0, 0.08, 0.84, 1.0, { seg: 6, col: C.gold }); K.bx('plain', q + 0.4, zd + 1.05, 0.14, 0.14, 0.84, 0.88, C.linen, 0.4); }
      for (const sd of [-1, 1]) { const x = sd * (X - 2.6); K.table(x, 0.5, L / 2 - 6.5, 0.45, PI / 2, true); K.bench(x + sd * 0.85, 0.5, L / 2 - 6.5, PI / 2); for (let k = 0; k < 5; k++) K.fig(x + sd * 0.86, -L / 2 + 8 + k * ((L - 14) / 5) + r(), sd > 0 ? FACE_NX : FACE_PX, r() < 0.5 ? 'robe' : 'man', null, { y: 0.02 }); }
      K.fireplace((o.fireSide ?? 1) * (X - 0.6), 1.5, (o.fireSide ?? 1) * PI / 2, 2.0, { top: H - 0.3 });
      K.bx('wood', -(o.fireSide ?? 1) * (X - 0.5), zW - 3.5, 1.1, 0.34, 0, 1.0, C.wood, PI / 2); K.bx('wood', -(o.fireSide ?? 1) * (X - 0.34), zW - 3.5, 1.1, 0.16, 1.0, 1.6, C.woodD, PI / 2); for (let q = 0; q < 5; q++) cyl(K.b('metal'), -(o.fireSide ?? 1) * (X - 0.6), zW - 4.3 + q * 0.4, 0.09, 1.0, 1.16 + (q % 2) * 0.12, { seg: 6, col: C.gold }); K.block(-(o.fireSide ?? 1) * (X - 0.6) - 0.8, zW - 4.8, -(o.fireSide ?? 1) * (X - 0.6) + 0.8, zW - 2.2);
      for (let i = 0; i < 4; i++) { const z0 = zW - 2 - i * ((L - 8) / 4), z1 = z0 - (L - 8) / 4 + 0.7; if (Math.abs((z0 + z1) / 2 - 1.5) > 3.2) tap(o.fireSide ?? 1, z0, z1, 1.0, Math.min(H - 0.9, 5.2), i % 2 ? ART.scene : ART.verdure); }
      for (const sd of [-1, 1]) K.fig(sd * 1.9, zW - 1.4, FACE_E, 'man', 'guard');
      for (let k = 0; k < 4; k++) K.fig((r() - 0.5) * 3, -2 + k * 2.4, r() * 6.28, 'man', k === 0 ? 'worker' : null);
      for (const sd of [-1, 1]) K.torch(sd * (X - 0.3), 3.0, zE + 5, sd > 0 ? 0.9 : 0);
      K.spots.push(['Entrée', 0, zW - 2.5, 0], ['Milieu de la salle', 0, 1, 0], ['Devant le dais', 0, zd + 3.4, 0]);
    } else {
      K.fig(0, zE + 1.55, FACE_W, 'robe', null, { col: [120, 30, 34], v: [7, 1, 2, 0] }); for (const sx of [-1.6, 1.6]) K.fig(sx, zE + 1.5, FACE_W, 'robe', null, { col: [30, 30, 36], v: [7, 1, sx > 0 ? 5 : 1, 0], y: 0.3 });
      K.panel(ART.retable, -1.5, zE, 1.5, zE, 3.0, 4.6, ref, { off: 0.1 });
      K.table(0, zd + 2.6, 1.7, 0.5, 0); for (let q = 0; q < 5; q++) cyl(K.b('plain'), -1.2 + q * 0.6, zd + 2.6 + (r() - 0.5) * 0.4, 0.05, 0.8, 0.8 + 0.1, { seg: 6, col: C.linen }); for (const sx of [-0.9, 0.9]) K.fig(sx, zd + 3.4, FACE_E, 'robe', 'monk', { col: [70, 54, 44] });
      K.beam('wood', [-X + 0.3, 1.0, zd + 5], [-1.0, 1.0, zd + 5], 0.1, 0.1, C.woodD); K.beam('wood', [1.0, 1.0, zd + 5], [X - 0.3, 1.0, zd + 5], 0.1, 0.1, C.woodD); for (const x of [-X + 0.5, -2.6, -1.1, 1.1, 2.6, X - 0.5]) K.bx('wood', x, zd + 5, 0.06, 0.06, 0, 1.0, C.woodD, 0); K.block(-X, zd + 4.8, -1.0, zd + 5.2); K.block(1.0, zd + 4.8, X, zd + 5.2);
      for (const sd of [-1, 1]) { K.fig(sd * 1.5, zd + 5.6, FACE_W, 'man', 'guard'); K.bench(sd * (X - 0.8), zW - 5, 2.4, PI / 2); }
      folk(11, -X + 1.2, X - 1.2, zd + 6.2, zW - 2, null, FACE_E);
      for (const sd of [-1, 1]) K.torch(sd * (X - 0.3), 3.0, 0, sd > 0 ? 1.0 : 0);
      K.spots.push(['Entrée', 0, zW - 2.5, 0], ['À la barre', 0, zd + 6.4, 0]);
    }
    return { entry: [0, zW - 2.5, 0], h: H, bounds: (x, z) => Math.abs(x) < X - 0.6 && z > zE + 0.6 && z < zW - 0.6 };
  }
  if (kind === 'college') {
    dais(zE + 1.6, 2.2, 1.4, 0.35); K.bx('wood', 0, zE + 1.0, 0.5, 0.36, 0.35, 0.95, C.woodD, 0); K.bx('wood', 0, zE + 0.66, 0.5, 0.06, 0.35, 2.6, C.woodD, 0); K.lectern(0, zE + 2.2, 0, { h: 1.35 }); K.block(-2.4, zE, 2.4, zE + 3.1);
    K.fig(0, zE + 1.5, FACE_W, 'robe', 'monk', { col: [36, 34, 36], y: 0.35 });
    for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) { const z = zE + 5 + i * 1.8; K.bench(sd * 2.0, z, 1.5, 0); for (let q = 0; q < 3; q++) if (r() < 0.8) K.fig(sd * 2.0 + (q - 1) * 0.9, z + 0.42, FACE_E, 'robe', 'monk', { col: [[36, 34, 36], [70, 54, 44], [92, 90, 88], [60, 50, 80]][(r() * 4) | 0] }); }
    for (let i = 0; i < 4; i++) K.lectern(-X + 0.7, zW - 2.5 - i * 1.7, -PI / 2);
    K.chest(X - 0.7, zW - 3, PI / 2); K.chest(X - 0.7, zW - 5, PI / 2);
    K.beam('plain', [0, 3.2, zE + 0.12], [0, 4.6, zE + 0.12], 0.1, 0.1, C.woodD); K.beam('plain', [-0.5, 4.1, zE + 0.12], [0.5, 4.1, zE + 0.12], 0.1, 0.1, C.woodD);
    K.torch(X - 0.3, 2.8, 0, 0.8);
    K.spots.push(['Entrée', 0, zW - 2, 0], ['Devant la chaire', 0, zE + 4.2, 0]);
    return { entry: [0, zW - 2, 0], h: H, bounds: (x, z) => Math.abs(x) < X - 0.6 && z > zE + 0.6 && z < zW - 0.6 };
  }
  if (kind === 'refectory') {
    for (const sd of [-1, 1]) { K.table(sd * (X - 1.6), 0, L / 2 - 6, 0.42, PI / 2, true); K.bench(sd * (X - 0.8), 0, L / 2 - 6, PI / 2); for (let k = 0; k < 12; k++) if (r() < 0.8) K.fig(sd * (X - 0.82), -L / 2 + 7 + k * ((L - 13) / 12), sd > 0 ? FACE_NX : FACE_PX, 'robe', 'monk', { ...WHITE_MONK, y: 0.02 }); }
    K.table(0, zE + 2.2, X - 3, 0.42, 0, true); for (let k = 0; k < 4; k++) K.fig(-2.4 + k * 1.6, zE + 1.5, FACE_W, 'robe', 'monk', WHITE_MONK);
    K.lectern(X - 2.8, zb(Math.floor(nb / 2)) + 0.6, PI / 2, { h: 1.4 }); K.fig(X - 3.5, zb(Math.floor(nb / 2)) + 0.6, FACE_PX, 'robe', 'monk', WHITE_MONK);
    for (let k = 0; k < 3; k++) K.fig((r() - 0.5) * 3, zW - 6 - k * 9, r() * 6.28, 'robe', 'monk', { col: [104, 88, 70] });
    K.beam('plain', [0, 3.0, zE + 0.12], [0, 4.6, zE + 0.12], 0.12, 0.12, C.woodD); K.beam('plain', [-0.6, 4.0, zE + 0.12], [0.6, 4.0, zE + 0.12], 0.12, 0.12, C.woodD);
    K.spots.push(['Entrée', 0, zW - 2.5, 0], ['Milieu', 0, 0, 0], ['Table de l’abbé', 0, zE + 5, 0]);
    return { entry: [0, zW - 2.5, 0], h: H, bounds: (x, z) => Math.abs(x) < X - 0.6 && z > zE + 0.6 && z < zW - 0.6 };
  }
  if (kind === 'thermes') {
    // frigidarium antique : consoles en proue de navire à la retombée des voûtes, niche de la piscine, resserre médiévale
    for (const sd of [-1, 1]) for (const z of [zE + 0.01, zW - 0.01]) { const x = sd * (X - 0.5); K.bx('stone', x, z + (z < 0 ? 0.5 : -0.5), 0.5, 0.5, ySp - 1.1, ySp, C.stoneD, 0); cone(K.b('stone'), x, z + (z < 0 ? 0.5 : -0.5), 0.6, ySp - 2.0, ySp - 1.1, { seg: 4, col: C.stoneD, a0: PI / 4 }); }
    K.bx('stone', 0, zE + 1.5, 3.4, 1.5, 0, 0.42, C.stoneD, 0, { topCol: C.stoneD }); K.bx('plain', 0, zE + 1.5, 3.0, 1.1, 0.3, 0.44, rgb(52, 70, 74), 0, { s0: 1 }); K.block(-3.6, zE, 3.6, zE + 3.1);
    for (const x of [-3.6, 0, 3.6]) K.archWall('roman', x - 1.5, zE + 0.5, x + 1.5, zE + 0.5, { ySp: 3.2, yTop: 5.6, th: 1.0, inset: 0.25, s: 0, n: 10 });
    for (let k = 0; k < 9; k++) K.barrel(-X + 0.8 + (k % 3) * 0.85, zW - 3 - Math.floor(k / 3) * 0.9, 1.05, 0.38);
    for (let k = 0; k < 4; k++) K.chest(X - 0.8, zW - 3 - k * 1.9, PI / 2);
    for (let k = 0; k < 5; k++) { K.bx('plain', X - 1.2 - (k % 2) * 0.7, -2 - k * 0.8, 0.5, 0.3, 0, 0.5, C.straw, 0.3 * k); }
    K.block(X - 2.4, -6.6, X, -1.2);
    K.fig(-1.5, 2, 2.2, 'robe', 'monk', { col: [36, 34, 36] }); K.fig(-0.6, 2.6, -1.9, 'man', 'worker'); K.fig(2.0, -6, 0.6, 'man', 'worker');
    K.torch(-X + 0.3, 2.6, 0, 1.2);
    K.spots.push(['Entrée', 0, zW - 2.5, 0], ['Sous la voûte', 0, 0, 0], ['Piscine', 0, zE + 4.2, 0]);
    return { entry: [0, zW - 2.5, 0], h: H, bounds: (x, z) => Math.abs(x) < X - 0.6 && z > zE + 0.6 && z < zW - 0.6 };
  }
  // salle des gardes d'une porte : treuil de la herse, râtelier, table
  guardroom(K, 0, 0, X, L / 2, { winch: true });
  K.spots.push(['Entrée', 0, zW - 1.8, 0], ['Treuil de la herse', 0, zE + 3.2, 0]);
  return { entry: [0, zW - 1.8, 0], h: H, bounds: (x, z) => Math.abs(x) < X - 0.5 && z > zE + 0.5 && z < zW - 0.5 };
}

// Mobilier d'un corps de garde, dans un rectangle (demi-côtés hx, hz) centré en (cx, cz).
function guardroom(K, cx, cz, hx, hz, o = {}) {
  const r = K.r;
  K.table(cx - hx * 0.25, cz + hz * 0.15, 1.2, 0.42, 0); K.bench(cx - hx * 0.25, cz + hz * 0.15 + 0.75, 1.2, 0); K.bench(cx - hx * 0.25, cz + hz * 0.15 - 0.75, 1.2, 0);
  cyl(K.b('plain'), cx - hx * 0.25 + 0.3, cz + hz * 0.15, 0.07, 0.8, 0.98, { seg: 6, col: C.woodD }); K.candle(cx - hx * 0.25 - 0.4, 0.8, cz + hz * 0.15, 0.2); K.light(cx - hx * 0.25, 1.9, cz + hz * 0.15, 0.7, 12);
  // râtelier d'armes : lances, guisarmes et pavois
  const rx = cx + hx - 0.25; K.beam('wood', [rx, 1.5, cz - hz * 0.5], [rx, 1.5, cz + hz * 0.3], 0.1, 0.08, C.woodD);
  for (let k = 0; k < 6; k++) { const z = cz - hz * 0.45 + k * (hz * 0.14); K.beam('plain', [rx - 0.25, 0, z], [rx - 0.02, 2.5, z], 0.035, 0.035, C.woodL); cone(K.b('metal'), rx - 0.02, z, 0.04, 2.5, 2.78, { seg: 4, col: C.lead }); }
  for (let k = 0; k < 2; k++) K.panel(ART.shield, rx + 0.2, cz + hz * (0.42 + k * 0.26), rx + 0.2, cz + hz * (0.42 + k * 0.26) + 0.8, 1.0, 1.9, [cx, 1.4, cz], { off: 0.12, uv: cellUV([1552, 268, 224, 240]) });
  K.block(rx - 0.5, cz - hz * 0.55, rx + 0.3, cz + hz * 0.35);
  K.barrel(cx - hx + 0.6, cz - hz + 0.7); K.barrel(cx - hx + 0.6, cz - hz + 1.5); K.chest(cx - hx + 0.6, cz + hz - 1.2, PI / 2);
  for (let k = 0; k < 2; k++) { K.bx('plain', cx - hx + 0.75, cz - 0.4 + k * 1.2, 0.95, 0.42, 0, 0.22, C.straw, 0, { s0: 0.9 }); K.bx('plain', cx - hx + 0.9, cz - 0.4 + k * 1.2, 0.7, 0.4, 0.2, 0.27, rgb(110, 96, 80), 0); } K.block(cx - hx, cz - 1.0, cx - hx + 1.8, cz + 1.4);
  K.fig(cx - hx * 0.25 - 0.4, cz + hz * 0.15 + 1.15, FACE_E, 'man', 'guard'); K.fig(cx - hx * 0.25 + 0.5, cz + hz * 0.15 - 1.15, FACE_W, 'man', 'guard'); K.fig(cx + hx * 0.5, cz - hz * 0.25, r() * 6.28, 'man', 'guard');
  if (o.winch) {
    const z = cz - hz + 1.3; for (const sx of [-1.3, 1.3]) { K.bx('wood', cx + sx, z, 0.14, 0.4, 0, 1.5, C.woodD, 0); }
    const b = K.b('wood'); for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283, c2 = ((k + 1) / 8) * 6.283; Q(b, [cx - 1.2, 1.1 + Math.sin(a) * 0.26, z + Math.cos(a) * 0.26], [cx + 1.2, 1.1 + Math.sin(a) * 0.26, z + Math.cos(a) * 0.26], [cx + 1.2, 1.1 + Math.sin(c2) * 0.26, z + Math.cos(c2) * 0.26], [cx - 1.2, 1.1 + Math.sin(c2) * 0.26, z + Math.cos(c2) * 0.26], [cx, 1.1, z], { away: true, col: C.wood, us: 0.6 }); }
    for (const sx of [-0.6, 0.6]) K.beam('metal', [cx + sx, 1.3, z], [cx + sx, 4.4, z - 0.2], 0.05, 0.05, C.iron); for (const a of [0, 1.57]) K.beam('plain', [cx + 1.5, 1.1 - Math.sin(a) * 0.6, z - Math.cos(a) * 0.6], [cx + 1.5, 1.1 + Math.sin(a) * 0.6, z + Math.cos(a) * 0.6], 0.06, 0.06, C.woodL);
    K.block(cx - 1.7, z - 0.8, cx + 1.8, z + 0.8); K.fig(cx + 2.2, z + 0.4, FACE_NX, 'man', 'guard');
  }
  if (o.fire !== false) K.torch(cx - hx + 0.25, 2.5, cz + hz * 0.6, 0.9);
}

// ====================================================================== salle de tour (ronde ou carrée)
function tower(K, o) {
  const R = o.R, H = o.H, sq = !!o.square, seg = sq ? 4 : o.seg || 12, wallM = o.wallMat || 'stone', floorM = o.floorMat || 'slab', r = K.r, kind = o.kind, Rc = sq ? R * Math.SQRT2 : R;
  const pt = (k) => { const a = PI / 2 - PI / seg + (2 * PI * k) / seg; return [Rc * Math.cos(a), Rc * Math.sin(a)]; };      // le pan n° 0 regarde vers +z
  K.floor(floorM, -Rc, -Rc, Rc, Rc, 0, { us: o.floorUs });
  const ySp = o.ySp ?? H * 0.55, mid = (k) => { const a = pt(k), c = pt(k + 1); return [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]; };
  for (let k = 0; k < seg; k++) { const a = pt(k), c = pt(k + 1); K.wall(wallM, a[0], a[1], c[0], c[1], 0, H, [0, H / 2, 0], { us: o.wallUs }); }
  // la porte est sur le pan tourné vers +z ; les autres pans peuvent recevoir une baie étroite
  let kd = 0, best = -1e9; for (let k = 0; k < seg; k++) { const m = mid(k); if (m[1] > best) { best = m[1]; kd = k; } }
  { const a = pt(kd), c = pt(kd + 1), m = mid(kd), l = Math.hypot(c[0] - a[0], c[1] - a[1]), t = Math.min(0.9, l * 0.42) / l; K.panel(ART.door, m[0] + (a[0] - c[0]) * t, m[1] + (a[1] - c[1]) * t, m[0] + (c[0] - a[0]) * t, m[1] + (c[1] - a[1]) * t, 0, Math.min(2.9, H - 0.4), [0, 1, 0]); }
  const slits = o.slits ?? (sq ? [1, 3] : [2, 4, 6, 8, 10].filter((k) => k < seg));
  for (const k of slits) { const kk = (kd + k) % seg, a = pt(kk), c = pt(kk + 1), m = mid(kk), l = Math.hypot(c[0] - a[0], c[1] - a[1]), hw = (o.slitW ?? 0.42) / l; K.lancet(m[0] + (a[0] - c[0]) * hw, m[1] + (a[1] - c[1]) * hw, m[0] + (c[0] - a[0]) * hw, m[1] + (c[1] - a[1]) * hw, o.slitY ?? 1.3, (o.slitY ?? 1.3) + (o.slitH ?? 2.1), [0, 2, 0], o.slitType ?? 2); }
  if (o.ceiling === 'beams') {
    K.floor('wood', -Rc, -Rc, Rc, Rc, H, { down: true, us: 0.4, s: 0.8 }); const nj = Math.max(3, Math.round((2 * R) / 1.3)); for (let i = 0; i <= nj; i++) { const x = -R + 0.1 + ((2 * R - 0.2) * i) / nj, e = sq ? R : Math.sqrt(Math.max(0.01, R * R - x * x)); K.beam('wood', [x, H - 0.16, -e], [x, H - 0.16, e], 0.22, 0.3, i % 2 ? C.wood : C.woodD); }
    if (o.pillar) { K.bx('wood', 0, 0, 0.2, 0.2, 0, H - 0.3, C.woodD, 0, { us: 0.6 }); K.pillarBlock(0, 0, 0.5); K.beam('wood', [-R, H - 0.48, 0], [R, H - 0.48, 0], 0.36, 0.34, C.woodD); }
  } else if (sq && o.pillar) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.vault(o.vaultMat || 'plaster', 0, sx * R, 0, sz * R, ySp, H, { n: 6, ribW: 0.22, ribD: 0.2, ribCol: o.ribCol, boss: o.boss });
    K.pier(0, 0, o.pierR ?? 0.36, ySp, { seg: 10 }); K.crossRib(-R, 0, 0, 0, ySp, H, { w: 0.3, d: 0.26 }); K.crossRib(0, 0, R, 0, ySp, H, { w: 0.3, d: 0.26 }); K.crossRib(0, -R, 0, 0, ySp, H, { w: 0.3, d: 0.26 }); K.crossRib(0, 0, 0, R, ySp, H, { w: 0.3, d: 0.26 });
  } else {
    // coupole nervée
    surf(K.b(o.vaultMat || 'plaster'), sq ? 12 : seg * 2, 6, (u, v0) => { const v = 0.03 + 0.97 * v0, a = 2 * PI * u, q = 1.05 * v * (sq ? Math.SQRT2 : 1), y = ySp + (H - ySp) * prof(Math.min(1, v), o.s ?? 0.7); return [R * Math.cos(a) * q, y, R * Math.sin(a) * q, 0.62 + 0.38 * (1 - v), R * Math.cos(a) * q * 0.3, R * Math.sin(a) * q * 0.3]; }, [0, 0, 0], o.vaultCol ?? 0xffffff);
    for (let k = 0; k < seg; k += sq ? 1 : 2) { const p = pt(k), pts = []; for (let j = 0; j <= 8; j++) { const t = j / 8; pts.push([p[0] * t, ySp + (H - ySp) * prof(t, o.s ?? 0.7), p[1] * t]); } K.rib(pts, 0.22, 0.2, o.ribCol ?? C.stone, o.ribMat || 'stone'); }
    cyl(K.b('plain'), 0, 0, 0.36, H - 0.42, H - 0.2, { seg: 8, col: o.boss ?? C.gold }); disc(K.b('plain'), 0, 0, 0.36, H - 0.42, { seg: 8, col: o.boss ?? C.gold });
  }
  const inR = sq ? R : R * Math.cos(PI / seg), bounds = sq ? (x, z) => Math.abs(x) < R - 0.55 && Math.abs(z) < R - 0.55 : (x, z) => Math.hypot(x, z) < inR - 0.6;
  const ring = (n, rad, fn, a0 = 0) => { for (let k = 0; k < n; k++) { const a = a0 + (k / n) * 2 * PI; fn(Math.cos(a) * rad, Math.sin(a) * rad, a, k); } };

  if (kind === 'library') {
    // librairie : pupitres en couronne, roue à livres, coffres, lampe d'argent
    ring(7, inR - 0.75, (x, z, a) => { if (Math.sin(a) > 0.86) return; K.lectern(x, z, a + PI / 2, { h: 1.0 }); }, PI / 2 + PI / 7);
    cyl(K.b('wood'), 0, 0, 0.12, 0, 1.0, { seg: 8, col: C.woodD }); cyl(K.b('wood'), 0, 0, 0.75, 1.0, 1.08, { seg: 12, col: C.wood, us: 0.6 }); disc(K.b('wood'), 0, 0, 0.75, 1.08, { seg: 12, col: C.woodL, us: 0.6 }); K.pillarBlock(0, 0, 1.0);
    for (let k = 0; k < 5; k++) { const a = k * 1.2566; Q(K.b('art'), [Math.cos(a) * 0.5 - Math.sin(a) * 0.17, 1.09, Math.sin(a) * 0.5 + Math.cos(a) * 0.17], [Math.cos(a) * 0.5 + Math.sin(a) * 0.17, 1.09, Math.sin(a) * 0.5 - Math.cos(a) * 0.17], [Math.cos(a) * 0.22 + Math.sin(a) * 0.17, 1.2, Math.sin(a) * 0.22 - Math.cos(a) * 0.17], [Math.cos(a) * 0.22 - Math.sin(a) * 0.17, 1.2, Math.sin(a) * 0.22 + Math.cos(a) * 0.17], [0, 9, 0], { uv: cellUV(ART.page) }); }
    ring(3, inR - 0.6, (x, z, a) => K.chest(x, z, a + PI / 2), PI / 2 + 0.75);
    K.beam('metal', [0, H - 0.5, 0], [0, 3.1, 0], 0.03, 0.03, C.lead); cyl(K.b('metal'), 0, 0, 0.2, 2.95, 3.1, { seg: 8, col: rgb(210, 210, 214), r1: 0.3 }); cone(K.b('glow'), 0, 0, 0.07, 3.1, 3.3, { seg: 5, col: rgb(255, 220, 130) }); K.light(0, 2.7, 0, 1.3, 12);
    K.fig(-1.5, 0.9, 2.2, 'robe', null, KING); K.fig(1.4, -0.9, -0.9, 'robe', null, { col: [70, 40, 40], v: [7, 1, 2, 0] }); K.fig(0.4, -2.0, 0.1, 'robe', 'monk', { col: [36, 34, 36] });
    K.spots.push(['Entrée', 0, inR - 1.4, 0], ['Près de la roue à livres', -1.4, -0.6, -1.2]);
  } else if (kind === 'clock') {
    // mouvement d'horloge à poids : cage de fer, rouages, foliot, cloche
    for (const sx of [-0.9, 0.9]) for (const sz of [-0.55, 0.55]) K.beam('metal', [sx, 0, sz], [sx, 2.4, sz], 0.08, 0.08, C.iron);
    for (const y of [0.5, 1.45, 2.4]) { for (const sz of [-0.55, 0.55]) K.beam('metal', [-0.9, y, sz], [0.9, y, sz], 0.07, 0.07, C.iron); for (const sx of [-0.9, 0.9]) K.beam('metal', [sx, y, -0.55], [sx, y, 0.55], 0.07, 0.07, C.iron); }
    K.wheel(-0.25, 1.0, 0, 0.5, 0, 1, C.iron, 0.04, 24); K.wheel(0.42, 1.55, 0.12, 0.3, 0, 1, rgb(120, 96, 56), 0.04, 16); K.wheel(0.1, 1.95, -0.1, 0.22, 0, 1, C.iron, 0.04, 12); K.beam('metal', [-0.9, 1.0, 0], [0.9, 1.0, 0], 0.05, 0.05, C.iron);
    K.beam('metal', [0.1, 2.4, -0.1], [0.1, 2.95, -0.1], 0.04, 0.04, C.iron); K.beam('metal', [-0.7, 2.95, -0.1], [0.9, 2.95, -0.1], 0.04, 0.04, C.iron); for (const sx of [-0.7, 0.9]) K.bx('metal', sx, -0.1, 0.06, 0.06, 2.78, 2.95, C.lead, 0);
    cyl(K.b('wood'), -0.25, 0.34, 0.13, 0.86, 1.14, { seg: 8, col: C.wood }); K.beam('plain', [-0.25, 0.9, 0.4], [-0.25, H - 0.4, 0.5], 0.025, 0.025, C.linen); K.beam('plain', [-0.2, 0.86, 0.34], [-0.2, 0.15, 0.34], 0.025, 0.025, C.linen); cyl(K.b('stone'), -0.2, 0.34, 0.16, 0.15, 0.5, { seg: 8, col: C.stoneD });
    cyl(K.b('metal'), 1.9, -1.6, 0.52, H - 2.0, H - 1.25, { seg: 12, col: rgb(150, 120, 60), r1: 0.2 }); K.beam('wood', [0.9, H - 1.1, -1.6], [2.9, H - 1.1, -1.6], 0.2, 0.2, C.woodD);
    K.block(-1.3, -0.95, 1.3, 0.95);
    K.table(-R + 1.0, -R + 1.6, 0.9, 0.4, PI / 2); for (let q = 0; q < 4; q++) K.bx('metal', -R + 1.0 + (r() - 0.5) * 0.4, -R + 1.0 + q * 0.35, 0.12, 0.03, 0.8, 0.83, C.iron, r() * 3);
    K.beam('wood', [R - 0.7, 0, -R + 0.5], [R - 0.3, 3.4, -R + 0.5], 0.06, 0.06, C.woodL); K.beam('wood', [R - 0.7, 0, -R + 1.0], [R - 0.3, 3.4, -R + 1.0], 0.06, 0.06, C.woodL); for (let q = 0; q < 8; q++) K.beam('wood', [R - 0.68 + q * 0.045, 0.35 + q * 0.4, -R + 0.5], [R - 0.68 + q * 0.045, 0.35 + q * 0.4, -R + 1.0], 0.04, 0.04, C.woodL);
    K.fig(-1.7, -0.5, PI / 2, 'man', 'worker'); K.fig(1.75, 1.3, -2.2, 'man', null, { col: [70, 60, 90], v: [5, 0, 2, 0] });
    K.torch(-R + 0.25, 2.5, 0.5, 1.0);
    K.spots.push(['Entrée', -R + 1.6, R - 1.3, -0.7], ['Devant le mouvement', 0, 2.6, 0], ['Derrière le mouvement', 0.3, -R + 1.3, PI]);
    return { entry: [-R + 1.6, R - 1.3, -0.7], h: H, bounds };
  } else if (kind === 'donjon' || kind === 'treasury') {
    K.fireplace(R - 0.55, -R * 0.45, PI / 2, 1.5, { top: ySp + 0.5 });
    if (kind === 'donjon') {
      // chambre du roi : lit à courtines, table, coffre, tentures
      K.bed(-R + 1.4, -R + 1.5, 0, { hw: 0.95, cover: C.blue }); for (const [sx, sz] of [[-2.4, -0.95], [-0.2, -0.95], [-2.4, 0.95], [-0.2, 0.95]]) K.beam('wood', [-R + 1.4 + sx + 1.3, 0, -R + 1.5 + sz], [-R + 1.4 + sx + 1.3, 2.3, -R + 1.5 + sz], 0.07, 0.07, C.woodD);
      Q(K.b('artD'), [-R + 0.3, 2.3, -R + 0.5], [-R + 2.6, 2.3, -R + 0.5], [-R + 2.6, 2.3, -R + 2.5], [-R + 0.3, 2.3, -R + 2.5], [0, 0, 0], { uv: cellUV(ART.lis, ART.W, ART.H, 30) }); K.panel(ART.lis, -R + 0.3, -R + 0.5, -R + 0.3, -R + 2.5, 0.6, 2.3, [0, 1, -R + 1.5], { mat: 'artD', off: 0.02, uv: cellUV(ART.lis, ART.W, ART.H, 30) });
      K.table(1.2, R - 1.8, 1.1, 0.45, 0, true); K.lectern(-R + 0.8, R - 1.7, -PI / 2); K.chest(R - 0.7, R - 1.5, PI / 2);
      K.panel(ART.scene, -R, 0.6, -R, R - 2.6, 0.8, 3.6, [0, 2, 0]); K.panel(ART.verdure, -R + 2.9, -R, R - 1.6, -R, 0.8, 3.4, [0, 2, 0]);
      K.fig(0.9, R - 2.6, 0.4, 'robe', null, KING); K.fig(2.0, R - 2.5, -0.5, 'robe', null, { col: [70, 40, 40], v: [7, 1, 2, 0] }); K.fig(-2.7, 0.3, 2.0, 'man', null, { v: [5, 0, 6, 0], col: [150, 30, 34] });
    } else {
      // trésor : coffres ferrés, balance, frères de l'Hôpital
      for (let k = 0; k < 4; k++) K.chest(-R + 0.75, -R + 1.2 + k * 1.7, PI / 2, k % 2 ? C.woodD : C.wood); for (let k = 0; k < 3; k++) K.chest(-R + 1.8 + k * 1.75, -R + 0.7, 0);
      K.table(1.0, R - 2.0, 1.3, 0.5, 0); K.beam('metal', [1.0, 0.8, R - 2.0], [1.0, 1.35, R - 2.0], 0.03, 0.03, C.gold); K.beam('metal', [0.6, 1.33, R - 2.0], [1.4, 1.33, R - 2.0], 0.03, 0.03, C.gold); for (const sx of [0.6, 1.4]) cyl(K.b('metal'), sx, R - 2.0, 0.12, 1.02, 1.05, { seg: 8, col: C.gold });
      for (let q = 0; q < 6; q++) cyl(K.b('metal'), 0.2 + (q % 3) * 0.14, R - 1.85 + Math.floor(q / 3) * 0.14, 0.05, 0.8, 0.83 + q * 0.012, { seg: 6, col: C.gold });
      K.fig(1.0, R - 2.75, 0, 'robe', 'monk', { col: [30, 28, 30] }); K.fig(2.3, R - 2.2, -1.0, 'robe', 'monk', { col: [30, 28, 30] }); K.fig(-1.6, 0.4, 1.9, 'man', 'guard');
      K.banner(-R + 0.4, ySp + 0.4, R - 2.4, PI / 2, 'cloth', 0.9, 1.8);
    }
    K.torch(-R + 0.25, 2.6, R * 0.3, 0.9);
    K.spots.push(['Entrée', -1.2, R - 1.3, 0], ['Près de la cheminée', R - 2.6, -R * 0.45, -PI / 2]);
    return { entry: [-1.2, R - 1.3, 0], h: H, bounds };
  } else {
    guardroom(K, 0, 0, inR * 0.72, inR * 0.72, { winch: false });
    if (o.cells) { for (let k = 0; k < 3; k++) { const z = -inR * 0.72 + 0.2; K.beam('metal', [-1.2 + k * 1.2, 0, z], [-1.2 + k * 1.2, 2.4, z], 0.05, 0.05, C.iron); } K.beam('metal', [-1.4, 2.4, -inR * 0.72 + 0.2], [1.4, 2.4, -inR * 0.72 + 0.2], 0.06, 0.06, C.iron); K.fig(0.3, -inR * 0.72 - 0.25, FACE_W, 'man', 'peasant'); }
    K.spots.push(['Entrée', 0.9, inR - 1.5, 0], ['Milieu de la salle', 0.9, -0.5, 0.6]);
    return { entry: [0.9, inR - 1.5, 0], h: H, bounds };
  }
  return { entry: [0, (sq ? R : inR) - 1.4, 0], h: H, bounds };
}

const GEN = { nave, hall, tower };
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

// ====================================================================== gestion de la visite
export class Interiors {
  constructor(app) {
    this.app = app; this.active = null; this.mats = null; this.info = null; this.obst = []; this.goto = null; this.glide = null; this.hover = null;
    const sc = (this.scene = new THREE.Scene()); sc.background = new THREE.Color(0x0d0b09); sc.fog = new THREE.Fog(0x0d0b09, 70, 260);
    this.hemi = new THREE.HemisphereLight(0xfff2dc, 0x4a3c2c, 1); this.amb = new THREE.AmbientLight(0xffffff, 0.3); this.sun = new THREE.DirectionalLight(0xfff0d6, 0.8); this.sun.position.set(0.45, 1, 0.3);
    this.points = []; for (let i = 0; i < 4; i++) { const p = new THREE.PointLight(0xffb060, 0, 18, 1.7); this.points.push(p); sc.add(p); }
    sc.add(this.hemi, this.amb, this.sun);
    const ring = (this.ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 28), new THREE.MeshBasicMaterial({ color: 0xf0c860, transparent: true, opacity: 0.85, depthTest: false, fog: false })));
    ring.rotation.x = -PI / 2; ring.visible = false; ring.renderOrder = 5; sc.add(ring);
    this.ray = new THREE.Raycaster(); this.v2 = new THREE.Vector2();
    const dom = app.renderer.domElement; let down = null;
    dom.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    dom.addEventListener('pointerup', (e) => { const d0 = down; down = null; if (!this.active || !d0) return; if (Math.hypot(e.clientX - d0.x, e.clientY - d0.y) < 7 && performance.now() - d0.t < 700) this.clickAt(e.clientX, e.clientY); });
    dom.addEventListener('pointermove', (e) => { this.hover = this.active && e.pointerType === 'mouse' ? [e.clientX, e.clientY] : null; });
    dom.addEventListener('pointerleave', () => { this.hover = null; });
    app.on('frame', (dt) => this.frame(dt));
    app.on('hour', () => this.applyHour());
  }
  has(place) { return !!(place && specFor(place.id)); }
  spec(place) { return place ? specFor(place.id) : null; }

  enter(place) {
    const app = this.app, spec = specFor(place.id); if (!spec) return false;
    if (this.active) this.exit(true);
    if (!this.mats) this.mats = makeInteriorMaterials(app);
    const K = new Kit(app, this.mats, hash(place.id) || 1);
    const info = GEN[spec.gen](K, spec);
    const g = (this.group = new THREE.Group());
    for (const m of K.B.finish(g, this.mats)) { m.castShadow = false; m.receiveShadow = false; }
    this.tris = K.B.tris;
    if (K.figs.length && app.people) g.add(app.people.makeGroup(K.figs));
    this.scene.add(g);
    this.lightDefs = K.lights.slice(0, this.points.length);
    this.points.forEach((p, i) => { const l = this.lightDefs[i]; if (l) { p.position.set(l[0], l[1], l[2]); p.distance = l[4]; p.color.setHex(l[5]); p.userData.k = l[3]; } else p.userData.k = 0; });
    this.scene.fog.far = Math.max(120, (spec.L || 30) * 3);
    this.info = info; this.obst = K.obst; this.spots = K.spots; this.goto = null; this.glide = null;
    const rig = app.rig;
    this.saved = { mode: rig.mode, goal: { ...rig.goal }, cur: { ...rig.cur }, walk: { ...rig.walk } };
    rig.enterWalk(info.entry[0], info.entry[1], info.entry[2]); rig.walk.y = null; rig.grab = true;
    if (document.pointerLockElement) document.exitPointerLock();
    this.active = place; app.inside = this;
    this.applyHour(); rig.update(0);
    return true;
  }
  exit(silent) {
    if (!this.active) return;
    const app = this.app, rig = app.rig;
    this.scene.remove(this.group); this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.group = null;
    this.ring.visible = false; this.active = null; this.info = null; app.inside = null;
    rig.grab = false; rig.mode = this.saved.mode; rig.goal = this.saved.goal; rig.cur = this.saved.cur; rig.walk = this.saved.walk; rig.fly = null;
    if (!silent) { app.setHour(app.sky.hour); rig.update(0); }
  }

  applyHour() {
    if (!this.active) return;
    const day = this.app.sky.day, k = 0.2 + 0.8 * day;
    this.hemi.intensity = 0.18 + 1.0 * day; this.amb.intensity = 0.1 + 0.26 * day; this.sun.intensity = 0.95 * day;
    this.mats.glass.color.setRGB(0.1 + 1.5 * day, 0.1 + 1.45 * day, 0.14 + 1.4 * day);
    for (const p of this.points) p.intensity = (p.userData.k || 0) * (26 + 30 * (1 - day));
    this.scene.background.setRGB(0.045 * k, 0.038 * k, 0.03 * k); this.scene.fog.color.copy(this.scene.background);
    this.app.renderer.toneMappingExposure = 1.02;
  }

  // ---- déplacement
  free(x, z) { for (const o of this.obst) { if (o.length === 3) { if (Math.hypot(x - o[0], z - o[1]) < o[2]) return false; } else if (x > o[0] && x < o[2] && z > o[1] && z < o[3]) return false; } return true; }
  walkable(x, z) { return !!this.info && this.info.bounds(x, z) && this.free(x, z); }
  walkHeight() { return -0.06; }
  floorPoint(cx, cy) {
    const dom = this.app.renderer.domElement, rc = dom.getBoundingClientRect();
    this.v2.set(((cx - rc.left) / rc.width) * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1); this.ray.setFromCamera(this.v2, this.app.camera);
    const o = this.ray.ray.origin, d = this.ray.ray.direction; if (d.y > -0.04) return null;
    const t = -o.y / d.y, x = o.x + d.x * t, z = o.z + d.z * t; if (Math.hypot(x - o.x, z - o.z) > 45) return null;
    return [x, z];
  }
  reach(p) {               // point praticable le plus proche de p, en revenant vers le visiteur
    const w = this.app.rig.walk; let x = p[0], z = p[1];
    for (let i = 0; i < 40; i++) { if (this.walkable(x, z)) return [x, z]; const dx = w.x - x, dz = w.z - z, l = Math.hypot(dx, dz); if (l < 0.4) return null; x += (dx / l) * 0.35; z += (dz / l) * 0.35; }
    return null;
  }
  clickAt(cx, cy) { const p = this.floorPoint(cx, cy), q = p && this.reach(p); if (q) { this.goto = q; this.glide = null; } }
  goSpot(i) { const s = this.spots && this.spots[i]; if (!s) return; const w = this.app.rig.walk; let dy = s[3] - w.yaw; while (dy > PI) dy -= 2 * PI; while (dy < -PI) dy += 2 * PI; this.glide = { x0: w.x, z0: w.z, y0: w.yaw, x1: s[1], z1: s[2], y1: w.yaw + dy, t: 0, dur: Math.min(3.2, 0.9 + Math.hypot(s[1] - w.x, s[2] - w.z) / 14) }; this.goto = null; }
  frame(dt) {
    if (!this.active) return;
    const rig = this.app.rig, w = rig.walk;
    if (rig.keys.size) { this.goto = null; this.glide = null; }
    if (this.glide) {
      const g = this.glide; g.t = Math.min(1, g.t + dt / g.dur); const e = g.t < 0.5 ? 2 * g.t * g.t : 1 - Math.pow(-2 * g.t + 2, 2) / 2;
      w.x = g.x0 + (g.x1 - g.x0) * e; w.z = g.z0 + (g.z1 - g.z0) * e; w.yaw = g.y0 + (g.y1 - g.y0) * e; w.pitch += (-0.02 - w.pitch) * Math.min(1, dt * 3); w.vx = w.vz = 0;
      if (g.t >= 1) this.glide = null;
    } else if (this.goto) {
      const dx = this.goto[0] - w.x, dz = this.goto[1] - w.z, l = Math.hypot(dx, dz), st = Math.min(l, (2.2 + Math.min(4.5, l * 1.4)) * dt);
      if (l < 0.08) this.goto = null;
      else { const nx = w.x + (dx / l) * st, nz = w.z + (dz / l) * st; if (this.walkable(nx, nz)) { w.x = nx; w.z = nz; } else if (this.walkable(nx, w.z)) w.x = nx; else if (this.walkable(w.x, nz)) w.z = nz; else this.goto = null; }
    }
    // repère au sol sous le pointeur
    let show = false;
    if (this.hover && !this.glide) { const p = this.floorPoint(this.hover[0], this.hover[1]); if (p && this.walkable(p[0], p[1])) { this.ring.position.set(p[0], 0.03, p[1]); show = true; } }
    if (this.goto) { this.ring.position.set(this.goto[0], 0.03, this.goto[1]); show = true; }
    this.ring.visible = show;
  }
  render() { this.app.renderer.render(this.scene, this.app.camera); }
}

export { SPECS };
