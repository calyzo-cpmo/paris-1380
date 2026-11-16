// Construction de Paris en 1889 : le bâti de toute la ville, les ponts de la Seine, les jardins, la trame des passants
// autour de l'Exposition. La tour et les palais viennent de src/p1889/tour.js et src/p1889/expo.js.
import { Builder, box, walls, cap, ccw, rgb } from '../builder.js';
import { makeMaterials89 } from '../p1789/textures.js';
import { ring, fill, lines, indexFoot, buildTrees } from '../p1789/outils.js';
import { hex, hash } from '../p1789/blocks.js';
import { pointInPoly, polylineLength, pointAt } from '../geom.js';
import { bati, rues, ilots, parcs, dansExpo } from './data.js';
import { maison } from './bati.js';
import { planter } from './arbres.js';

const PIERRE_PONT = hex(0xd9cfb6), CHAUSSEE = hex(0xb7b0a2), PIERRE_QUAI = hex(0xd3c9b0), DALLE_QUAI = hex(0xcbc5b7), REMPART = hex(0xc9bfa6), TALUS = rgb(128, 148, 96);

// Ponts de la Seine : tablier en léger dos d'âne, arches surbaissées sur des piles, parapets.
function ponts(app, B) {
  const T = app.terrain, out = [], mouille = (x, z) => T.wetAt(x, z) > 0.5;
  // 1. Toute voie qui passe au-dessus du fleuve désigne un franchissement (la base de 1900 ne signale pas tous les
  //    ponts) ; ceux d'après 1889 sont écartés. La base décrit souvent un pont en deux moitiés, ou en deux chaussées :
  //    on ne retient du tronçon que son milieu au-dessus de l'eau et sa direction, puis on cherche la rive de chaque
  //    côté, dans cet axe. Le pont va ainsi toujours d'une rive à l'autre, quel que soit le découpage.
  const cand = [];
  for (const r of rues()) {
    if (/Alexandre|Mirabeau|Debilly|Rouelle|Bir.Hakeim/i.test(r.nom) || /^(All.e|Quai|Port|Berge)\b/i.test(r.nom)) continue;      // l'allée des Cygnes court sur son île, au milieu du fleuve
    const L = polylineLength(r.pts); if (L < 8) continue;
    let s0 = -1, s1 = -1; for (let s = 0; s <= L; s += 2) { const p = pointAt(r.pts, s); if (mouille(p.x, p.z)) { if (s0 < 0) s0 = s; s1 = s; } }
    if (s0 < 0 || s1 - s0 < 6) continue;
    const p0 = pointAt(r.pts, s0), p1 = pointAt(r.pts, s1), m = pointAt(r.pts, (s0 + s1) / 2);
    let dx = p1.x - p0.x, dz = p1.z - p0.z; const l = Math.hypot(dx, dz); if (l < 5 || !mouille(m.x, m.z)) continue; dx /= l; dz /= l;
    if (!mouille(m.x - dz * 24, m.z + dx * 24) || !mouille(m.x + dz * 24, m.z - dx * 24)) continue;      // une rue de quai qui mord sur l'eau n'est pas un pont
    const rive = (sg) => { for (let d = 0; d <= 420; d += 2) if (!mouille(m.x + dx * sg * d, m.z + dz * sg * d)) return d; return -1; };
    const ra = rive(-1), rb = rive(1); if (ra < 0 || rb < 0 || ra + rb < 16) continue;                    // une voie qui longe le fleuve (île aux Cygnes) n'atteint aucune rive
    cand.push({ nom: r.nom, a: [m.x - dx * (ra + 14), m.z - dz * (ra + 14)], b: [m.x + dx * (rb + 14), m.z + dz * (rb + 14)], w: Math.min(30, Math.max(11, r.l || 16)) / 2 });
  }
  // 2. Les tronçons d'un même pont sont réunis : même axe, milieux à moins de 34 m (les ponts de Paris sont bien plus
  //    espacés). Le pont réuni prend l'axe moyen ; deux chaussées jumelles l'élargissent.
  const groupes = [];
  for (const c of cand) {
    const cx = (c.a[0] + c.b[0]) / 2, cz = (c.a[1] + c.b[1]) / 2, l = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]), ux = (c.b[0] - c.a[0]) / l, uz = (c.b[1] - c.a[1]) / l;
    const g = groupes.find((o) => Math.hypot(o.cx - cx, o.cz - cz) < 34 && Math.abs(o.ux * ux + o.uz * uz) > 0.8);
    if (!g) groupes.push({ cx, cz, ux, uz, m: [c] }); else { if (g.ux * ux + g.uz * uz < 0) { const t = c.a; c.a = c.b; c.b = t; } g.m.push(c); }
  }
  for (const g of groupes) {
    const n = g.m.length, a = [0, 0], b = [0, 0]; for (const c of g.m) { a[0] += c.a[0] / n; a[1] += c.a[1] / n; b[0] += c.b[0] / n; b[1] += c.b[1] / n; }
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, nx = -uz, nz = ux;
    let w = 0; for (const c of g.m) w = Math.max(w, Math.abs(((c.a[0] + c.b[0]) / 2 - a[0]) * nx + ((c.a[1] + c.b[1]) / 2 - a[1]) * nz) + c.w); w = Math.min(w, 21);
    const nom = (g.m.find((c) => /^(Pont|Passerelle|Viaduc)/i.test(c.nom)) || g.m[0]).nom;
    const ya = Math.max(T.land(a[0], a[1]), 5.2), yb = Math.max(T.land(b[0], b[1]), 5.2);
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
    out.push({ x: cx, z: cz, a, b, w, nom, troncons: n, top: yAt(0.5) + 6 });
  }
  return out;
}

// Quais de la Seine dans Paris : un mur de pierre le long de l'eau, son parapet, et une bande dallée qui recouvre le
// bord du terrain. Le tracé suit le contour du masque d'eau du terrain (courbe de niveau « moitié eau »).
function quais(app, B) {
  const T = app.terrain, C = app.monde.cadre, W = T.W, H = T.H, s = T.soft, cell = (C.x1 - C.x0) / W, env = app.v89.enveloppe.ring; let n = 0;
  const X = (i) => C.x0 + (i + 0.5) * cell, Z = (k) => C.z0 + (k + 0.5) * cell, t = (u, v) => (127.5 - u) / (v - u), AV = 3, AR = 7.5, EP = 0.55, PAR = 0.95;
  // face verticale de P à Q, tournée vers (nx, nz)
  const face = (b, P, Q, y0, y1, nx, nz, col, s0, s1) => { let a = P, c = Q; if (-(c[1] - a[1]) * nx + (c[0] - a[0]) * nz < 0) { a = Q; c = P; } b.quad(a[0], y0, a[1], c[0], y0, c[1], c[0], y1, c[1], a[0], y1, a[1], (a[0] + a[1]) * 0.2, y0 * 0.2, (c[0] + c[1]) * 0.2, y1 * 0.2, col, s0, s1); };
  // dalle a-b-c-d, tournée vers le ciel
  const dalle = (b, a, c, d, e, col) => { if ((c[0] - a[0]) * (e[2] - a[2]) - (c[2] - a[2]) * (e[0] - a[0]) > 0) b.quad(a[0], a[1], a[2], e[0], e[1], e[2], d[0], d[1], d[2], c[0], c[1], c[2], 0, 0, 1, 1, col, 1, 1); else b.quad(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2], e[0], e[1], e[2], 0, 0, 1, 1, col, 1, 1); };
  const mur = (p, q) => {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.25) return;
    const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2; if (!pointInPoly(mx, mz, env)) return;          // hors de Paris, les berges restent naturelles
    let nx = -(q[1] - p[1]) / L, nz = (q[0] - p[0]) / L; if (T.wetAt(mx + nx * 3, mz + nz * 3) < T.wetAt(mx - nx * 3, mz - nz * 3)) { nx = -nx; nz = -nz; }      // vers l'eau
    const yq = Math.max(4.2, T.land(mx - nx * 9, mz - nz * 9)), yt = yq + PAR, bs = B.at('stone', mx, mz), bp = B.at('plain', mx, mz);
    const P = [p[0] + nx * AV, p[1] + nz * AV], Q = [q[0] + nx * AV, q[1] + nz * AV], Pi = [P[0] - nx * EP, P[1] - nz * EP], Qi = [Q[0] - nx * EP, Q[1] - nz * EP], Pa = [p[0] - nx * AR, p[1] - nz * AR], Qa = [q[0] - nx * AR, q[1] - nz * AR];
    face(bs, P, Q, -2.5, yt, nx, nz, PIERRE_QUAI, 0.7, 1);                                                  // le mur, vu du fleuve
    dalle(bs, [P[0], yt, P[1]], [Q[0], yt, Q[1]], [Qi[0], yt, Qi[1]], [Pi[0], yt, Pi[1]], PIERRE_QUAI);     // dessus du parapet
    face(bs, Pi, Qi, yq, yt, -nx, -nz, PIERRE_QUAI, 0.85, 0.95);                                            // le parapet, vu du quai
    dalle(bp, [Pi[0], yq + 0.05, Pi[1]], [Qi[0], yq + 0.05, Qi[1]], [Qa[0], Math.max(yq, T.land(Qa[0], Qa[1])) + 0.05, Qa[1]], [Pa[0], Math.max(yq, T.land(Pa[0], Pa[1])) + 0.05, Pa[1]], DALLE_QUAI);      // trottoir du quai
    n++;
  };
  for (let k = 0; k < H - 1; k++) for (let i = 0; i < W - 1; i++) {
    const q = k * W + i, a = s[q], b = s[q + 1], c = s[q + W + 1], d = s[q + W], m = (a > 127 ? 1 : 0) | (b > 127 ? 2 : 0) | (c > 127 ? 4 : 0) | (d > 127 ? 8 : 0);
    if (m === 0 || m === 15) continue;
    const pts = [];
    if ((m & 1) !== ((m >> 1) & 1)) pts.push([X(i) + t(a, b) * cell, Z(k)]);
    if (((m >> 1) & 1) !== ((m >> 2) & 1)) pts.push([X(i + 1), Z(k) + t(b, c) * cell]);
    if (((m >> 2) & 1) !== ((m >> 3) & 1)) pts.push([X(i) + t(d, c) * cell, Z(k + 1)]);
    if (((m >> 3) & 1) !== (m & 1)) pts.push([X(i), Z(k) + t(a, d) * cell]);
    for (let j = 0; j + 1 < pts.length; j += 2) mur(pts[j], pts[j + 1]);
  }
  return n;
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

  await step('Les quais et les ponts de la Seine…', 0.7);
  app.stats.quais = quais(app, B);
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
  // alignements des boulevards, des avenues et des quais
  { const A = planter(app); V.alignements = A; app.stats.alignements = A.n; app.batiMeshes.push(...A.meshes); }

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
