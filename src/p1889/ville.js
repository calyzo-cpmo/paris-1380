// Construction de Paris en 1889 : le bâti de toute la ville, les ponts de la Seine, les jardins, la trame des passants
// autour de l'Exposition. La tour et les palais viennent de src/p1889/tour.js et src/p1889/expo.js.
import { Builder, box, walls, cap, ccw, rgb } from '../builder.js';
import { makeMaterials89 } from '../p1789/textures.js';
import { ring, fill, lines, indexFoot, buildTrees } from '../p1789/outils.js';
import { hex, hash } from '../p1789/blocks.js';
import { pointInPoly, polylineLength, pointAt } from '../geom.js';
import { bati, rues, ilots, parcs, dansExpo } from './data.js';
import { maison } from './bati.js';

const PIERRE_PONT = hex(0xd9cfb6), CHAUSSEE = hex(0xb7b0a2), REMPART = hex(0xc9bfa6), TALUS = rgb(128, 148, 96);

// Ponts de la Seine : tablier en léger dos d'âne, arches surbaissées sur des piles, parapets.
function ponts(app, B) {
  const T = app.terrain, out = [];
  for (const r of rues()) {
    // toute voie qui franchit le fleuve est un pont (la base de 1900 ne les signale pas tous) ; ceux d'après 1889 sont écartés
    if (/Alexandre|Mirabeau|Debilly|Rouelle|Bir.Hakeim/i.test(r.nom)) continue;
    const L = polylineLength(r.pts); if (L < 40) continue;
    let s0 = -1, s1 = -1; for (let s = 0; s <= L; s += 3) { const p = pointAt(r.pts, s); if (T.wetAt(p.x, p.z) > 0.5) { if (s0 < 0) s0 = s; s1 = s; } }
    if (s0 < 0 || s1 - s0 < 30) continue;
    { const m = pointAt(r.pts, (s0 + s1) / 2); if (T.wetAt(m.x - m.dz * 28, m.z + m.dx * 28) < 0.5 || T.wetAt(m.x + m.dz * 28, m.z - m.dx * 28) < 0.5) continue; }      // une rue de quai qui mord sur l'eau n'est pas un pont
    s0 = Math.max(0, s0 - 16); s1 = Math.min(L, s1 + 16);
    const pa = pointAt(r.pts, s0), pb = pointAt(r.pts, s1), a = [pa.x, pa.z], b = [pb.x, pb.z], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, nx = -uz, nz = ux;
    if (out.some((o) => Math.hypot(o.x - (a[0] + b[0]) / 2, o.z - (a[1] + b[1]) / 2) < 25)) continue;      // deux tronçons du même pont
    const w = Math.min(30, Math.max(11, r.l || 16)) / 2, ya = Math.max(T.land(a[0], a[1]), 5.2), yb = Math.max(T.land(b[0], b[1]), 5.2);
    const yAt = (t) => ya + (yb - ya) * t + 0.9 * Math.sin(Math.PI * t), cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    const bs = B.at('stone', cx, cz), bp = B.at('plain', cx, cz), nA = Math.max(2, Math.round(len / 30)), SEG = 6;
    for (let k = 0; k < nA; k++) {
      for (let j = 0; j < SEG; j++) {
        const t0 = (k + j / SEG) / nA, t1 = (k + (j + 1) / SEG) / nA, y0 = yAt(t0), y1 = yAt(t1), x0 = a[0] + ux * len * t0, z0 = a[1] + uz * len * t0, x1 = a[0] + ux * len * t1, z1 = a[1] + uz * len * t1;
        // intrados : arc surbaissé d'une pile à l'autre
        const D = Math.min(4.6, Math.min(ya, yb) - 1.6), arc = (f) => 1.1 + D * (1 - Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2))), i0 = y0 - arc(j / SEG), i1 = y1 - arc((j + 1) / SEG);
        bp.quad(x0 + nx * w, y0, z0 + nz * w, x1 + nx * w, y1, z1 + nz * w, x1 - nx * w, y1, z1 - nz * w, x0 - nx * w, y0, z0 - nz * w, 0, 0, 1, 1, CHAUSSEE, 1, 1);
        for (const sd of [1, -1]) {
          const ox = nx * w * sd, oz = nz * w * sd, P = 0.95;
          if (sd > 0) bs.quad(x1 + ox, i1, z1 + oz, x0 + ox, i0, z0 + oz, x0 + ox, y0 + P, z0 + oz, x1 + ox, y1 + P, z1 + oz, 0, 0, 1, 1, PIERRE_PONT, 0.82, 1);
          else bs.quad(x0 + ox, i0, z0 + oz, x1 + ox, i1, z1 + oz, x1 + ox, y1 + P, z1 + oz, x0 + ox, y0 + P, z0 + oz, 0, 0, 1, 1, PIERRE_PONT, 0.82, 1);
          const ix = nx * (w - 0.4) * sd, iz = nz * (w - 0.4) * sd;                 // parapet, côté chaussée
          if (sd > 0) bs.quad(x0 + ix, y0, z0 + iz, x1 + ix, y1, z1 + iz, x1 + ix, y1 + P, z1 + iz, x0 + ix, y0 + P, z0 + iz, 0, 0, 1, 0.3, PIERRE_PONT, 0.9, 1);
          else bs.quad(x1 + ix, y1, z1 + iz, x0 + ix, y0, z0 + iz, x0 + ix, y0 + P, z0 + iz, x1 + ix, y1 + P, z1 + iz, 0, 0, 1, 0.3, PIERRE_PONT, 0.9, 1);
          bs.quad(x0 + ix, y0 + P, z0 + iz, x1 + ix, y1 + P, z1 + iz, x1 + ox, y1 + P, z1 + oz, x0 + ox, y0 + P, z0 + oz, 0, 0, 1, 0.2, PIERRE_PONT, 1, 1);
        }
        bs.quad(x0 - nx * w, i0, z0 - nz * w, x1 - nx * w, i1, z1 - nz * w, x1 + nx * w, i1, z1 + nz * w, x0 + nx * w, i0, z0 + nz * w, 0, 0, 1, 1, PIERRE_PONT, 0.55, 0.55);      // voûte, vue de l'eau
      }
      if (k > 0) { const t = k / nA; box(bs, { cx: a[0] + ux * len * t, cz: a[1] + uz * len * t, ux, uz, hl: 1.9, hw: w + 1.3 }, -4, yAt(t) - 1.2, { col: PIERRE_PONT, s0: 0.7 }); }
    }
    for (let s = 0; s <= len; s += 1) { const t = s / len, y = yAt(t); for (let o = -w; o <= w; o += 1) app.deckSet(a[0] + ux * s + nx * o, a[1] + uz * s + nz * o, y); }
    out.push({ x: cx, z: cz, a, b, w, nom: r.nom, top: yAt(0.5) + 6 });
  }
  return out;
}

export async function construire(app, step) {
  const V = app.v89, B = new Builder(1100), mats = (app.materials = makeMaterials89(app.mobile ? 0.5 : 1));
  app.foot = []; app.landmarks = []; app.gardens = []; app.monuments = {}; app.stats = {};
  const pause = () => new Promise((r) => setTimeout(r, 0)), R = app.navRect;
  const pres = (x, z) => x > R.x && x < R.x + R.w && z > R.z && z < R.z + R.h;

  // la tour, les palais de l'Exposition et les monuments réservent d'abord leur place
  V.reserves = [];
  if (V.monuments) { await step('La tour de trois cents mètres et les palais de l’Exposition…', 0.24); await V.monuments(app, B); }
  const reserve = (x, z) => { for (const r of V.reserves) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1 && pointInPoly(x, z, r.ring)) return true; return false; };

  const L = bati(); let n = 0, faits = 0;
  for (const e of L) {
    const r = e.rings[0]; let cx = 0, cz = 0; for (const p of r) { cx += p[0]; cz += p[1]; } cx /= r.length; cz /= r.length;
    if (!reserve(cx, cz)) { maison(app, B, e, n, pres(cx, cz)); faits++; }
    if (++n % 4000 === 0) { await step('Les maisons de Paris, quartier par quartier…', 0.26 + (0.42 * n) / L.length); await pause(); }
  }
  app.stats.bati = faits;

  // enceinte de Thiers : rempart de terre revêtu de pierre, bastion après bastion
  await step('L’enceinte de Thiers et ses bastions…', 0.69);
  { const T = app.terrain;
    for (const i of ilots()) {
      if (i.c !== 'F') continue;
      const r = ccw(i.rings[0]), c = r[0]; let s = 0; for (const p of r) s += T.height(p[0], p[1]); const y = s / r.length + 6.5;
      walls(B.at('stone', c[0], c[1]), r, (x, z) => T.height(x, z) - 1.5, y, { col: REMPART, us: 0.2, vs: 0.2 });
      cap(B.at('plain', c[0], c[1]), r, i.rings.slice(1).map(ccw), y, { col: TALUS });
      app.foot.push({ ring: r, top: y });
    } }

  await step('Les ponts de la Seine…', 0.7);
  V.ponts = ponts(app, B);

  await step('Assemblage de la ville…', 0.74);
  app.batiMeshes = B.finish(app.scene, mats); app.quaiMeshes = []; app.cityMeshes = app.batiMeshes;
  if (V.mobiles) app.batiMeshes.push(...V.mobiles);              // échafaudages, grues, palais en chantier : ils suivent la date
  app.stats.tris = Math.round(B.tris);
  indexFoot(app);

  await step('Jardins, squares et bois…', 0.82);
  // les jardins de la ville d'abord, les bois ensuite : le nombre d'arbres est compté
  const P = parcs().slice().sort((a, b) => Math.hypot(a.rings[0][0][0] + 3900, a.rings[0][0][1] + 500) - Math.hypot(b.rings[0][0][0] + 3900, b.rings[0][0][1] + 500));
  for (const p of P) { if (/Champ De Mars/i.test(p.nom)) continue; const bois = /Bois De/i.test(p.nom); app.gardens.push({ ring: p.rings[0], dens: bois ? 0.1 : 0.34, ok: p.rings.length > 1 ? (x, z) => !p.rings.slice(1).some((h) => pointInPoly(x, z, h)) : null }); }
  for (const i of ilots()) if (i.c === 'p' && pres(i.rings[0][0][0], i.rings[0][0][1]) && !i.rings[0].some((p) => dansExpo(p[0], p[1]))) app.gardens.push({ ring: i.rings[0], dens: 0.3 });
  if (V.jardins) V.jardins(app);
  app.trees = buildTrees(app);

  // nom de la rue où l'on marche : tronçons rangés par cases de 120 m
  { const C = 120, cases = new Map(), key = (i, k) => (i + 512) * 2048 + k + 512;
    for (const r of rues()) { if (!r.nom) continue; for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1], n2 = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 60)); for (let j = 0; j <= n2; j++) { const k = key(Math.floor((a[0] + ((b[0] - a[0]) * j) / n2) / C), Math.floor((a[1] + ((b[1] - a[1]) * j) / n2) / C)); let l = cases.get(k); if (!l) cases.set(k, (l = new Set())); l.add(r); } } }
    app.streetAt = (x, z, max = 28) => { let best = null, bd = max; const i0 = Math.floor(x / C), k0 = Math.floor(z / C);
      for (let i = i0 - 1; i <= i0 + 1; i++) for (let k = k0 - 1; k <= k0 + 1; k++) { const l = cases.get(key(i, k)); if (!l) continue; for (const r of l) for (let j = 0; j + 1 < r.pts.length; j++) { const a = r.pts[j], b = r.pts[j + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))), d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); if (d < bd) { bd = d; best = r.nom; } } }
      return best; }; }

  // trame des passants, autour de l'Exposition : rues, promenades, jardins, ponts ; ni l'eau ni les bâtiments
  await step('Les Parisiens de 1889…', 0.93);
  { const cell = app.mobile ? 2.5 : 1.5, w = Math.round(R.w / cell), h = Math.round(R.h / cell), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d', { willReadFrequently: true }), TT = { s: 1 / cell, x: (v) => (v - R.x) / cell, y: (v) => (v - R.z) / cell };
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    for (const r of rues()) { if (r.pts.some((p) => pres(p[0], p[1]))) lines(x, TT, [r.pts], '#fff', Math.max(4, (r.l || 8) - 1.5) / cell); }
    fill(x, TT, ilots().filter((i) => i.c === 'p').map((i) => i.rings), '#fff');
    if (V.esplanades) fill(x, TT, V.esplanades, '#fff');
    for (const rings of V.seine) fill(x, TT, [rings], '#000');
    lines(x, TT, V.ponts.map((p) => [p.a, p.b]), '#fff', 9 / cell);
    x.fillStyle = '#000'; x.strokeStyle = '#000'; x.lineWidth = 1.2; for (const f of app.foot) { if (!pres(f.ring[0][0], f.ring[0][1])) continue; x.beginPath(); ring(x, TT, f.ring); x.fill(); x.stroke(); }
    const im = x.getImageData(0, 0, w, h).data, data = new Uint8Array(w * h); for (let i = 0; i < data.length; i++) data[i] = im[i * 4] > 200 ? 1 : 0;
    app.nav = { data, w, h, x0: R.x, z0: R.z, cell }; }
}
