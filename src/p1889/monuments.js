// Silhouettes des monuments de Paris en 1889 : dômes, tours, flèches, colonnes, et l'Arc de triomphe.
// Les corps de bâtiment viennent des données (emprise et hauteur réelles, src/p1889/bati.js) ; ce fichier leur ajoute ce
// qui se voit de loin. Les positions sont lues dans ces mêmes données (tambours des Invalides et du Panthéon, piles de
// l'Arc, emprises des églises, îlots des places) ; les hauteurs sont celles des édifices ; le détail est une évocation.
import { box, cyl, cone, ccw, rgb } from '../builder.js';
import { facade } from '../p1789/blocks.js';
import { pointInPoly, polyArea } from '../geom.js';
import { bati, ilots } from './data.js';

const PIERRE = rgb(226, 214, 190), PIERRE_BLANCHE = rgb(238, 232, 220), PLOMB = rgb(128, 136, 142), OR = rgb(226, 188, 96), CUIVRE = rgb(118, 152, 134), BRONZE = rgb(74, 84, 72), BOIS = rgb(190, 156, 110), GRANIT = rgb(196, 150, 132), ARDOISE = rgb(84, 92, 106);

// Coupole : tambour de pierre, calotte en six assises, lanternon et flèche. Cotes en mètres au-dessus du sol.
function coupole(app, B, x, z, r, yTambour0, yTambour1, yDome, yLanterne, yFleche, col, o = {}) {
  const y0 = app.terrain.height(x, z), bs = B.at('stone', x, z), bp = B.at('plain', x, z), N = 6, seg = o.seg || 20, rd = r * (o.debord || 1.02);
  cyl(bs, x, z, r, y0 + yTambour0, y0 + yTambour1, { col: o.pierre || PIERRE, seg, s0: 0.82 });
  for (let k = 0; k < N; k++) {
    const a0 = ((k / N) * Math.PI) / 2, a1 = (((k + 1) / N) * Math.PI) / 2, h = yDome - yTambour1;
    cyl(bp, x, z, rd * Math.cos(a0), y0 + yTambour1 + h * Math.sin(a0), y0 + yTambour1 + h * Math.sin(a1), { col, seg, r1: Math.max(0.6, rd * Math.cos(a1)), s0: 0.86 + 0.14 * (k / N), s1: 0.9 + 0.14 * (k / N) });
  }
  cyl(bs, x, z, r * 0.2, y0 + yDome - 1, y0 + yLanterne, { col: o.lanterne || o.pierre || PIERRE, seg: 8, s0: 0.9 });
  cone(bp, x, z, r * 0.24, y0 + yLanterne, y0 + yFleche, { col: o.fleche || col, seg: 8 });
  app.landmarks.push({ x, z, top: y0 + yFleche });
  return y0 + yFleche;
}
// Emprise du bâtiment qui couvre le point (la plus vaste) et repère le long de son axe, façade du côté `vers` :
// P(recul, travers) rend le point situé à `recul` mètres en arrière de la façade et à `travers` mètres de l'axe.
function repere(x, z, ax, vers) {
  let ring = null, A = 0;
  for (const e of bati()) { const r = e.rings[0]; if (pointInPoly(x, z, r)) { const a = Math.abs(polyArea(r)); if (a > A) { A = a; ring = r; } } }
  if (!ring) return null;
  const s = ax[0] * vers[0] + ax[1] * vers[1] < 0 ? -1 : 1, fx = ax[0] * s, fz = ax[1] * s, nx = -fz, nz = fx;
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const p of ring) { const u = p[0] * fx + p[1] * fz, v = p[0] * nx + p[1] * nz; if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; }
  const vm = (v0 + v1) / 2;
  return { f: [fx, fz], L: u1 - u0, l: v1 - v0, P: (recul, travers = 0) => [fx * (u1 - recul) + nx * (vm + travers), fz * (u1 - recul) + nz * (vm + travers)] };
}
// Tour carrée de demi-côté h, de la cote ya à yb ; o.baies : cote où commence l'étage du beffroi, à hautes baies ;
// o.fleche : cote du sommet d'une flèche.
function tour(app, B, x, z, ux, uz, h, ya, yb, o = {}) {
  const y0 = app.terrain.height(x, z), bs = B.at('stone', x, z), col = o.col || PIERRE;
  if (o.baies) {
    box(bs, { cx: x, cz: z, ux, uz, hl: h, hw: h }, y0 + ya, y0 + o.baies, { col, s0: 0.84 });
    const nx = -uz, nz = ux, r = ccw([[x - ux * h - nx * h, z - uz * h - nz * h], [x + ux * h - nx * h, z + uz * h - nz * h], [x + ux * h + nx * h, z + uz * h + nz * h], [x - ux * h + nx * h, z - uz * h + nz * h]]);
    facade(B.at('nef', x, z), r, false, y0 + o.baies, y0 + yb - 2, 0, 1, col, 0, 0.9, 1, h);
    box(bs, { cx: x, cz: z, ux, uz, hl: h + 0.4, hw: h + 0.4 }, y0 + yb - 2, y0 + yb, { col, s0: 0.95 });
  } else box(bs, { cx: x, cz: z, ux, uz, hl: h, hw: h }, y0 + ya, y0 + yb, { col, s0: 0.84 });
  if (o.fleche) cone(B.at('plain', x, z), x, z, h * 1.42, y0 + yb, y0 + o.fleche, { col: o.toit || ARDOISE, seg: 4, a0: Math.atan2(uz, ux) + Math.PI / 4 });
  app.landmarks.push({ x, z, top: y0 + (o.fleche || yb) });
  return y0 + (o.fleche || yb);
}
// Colonne : socle, fût, statue.
function colonne(app, B, x, z, r, h, col, statue) {
  const y0 = app.terrain.height(x, z), bs = B.at('stone', x, z), bp = B.at('plain', x, z);
  box(bs, { cx: x, cz: z, ux: 1, uz: 0, hl: r * 2.2, hw: r * 2.2 }, y0 - 0.5, y0 + h * 0.12, { col: PIERRE });
  cyl(bp, x, z, r, y0 + h * 0.12, y0 + h * 0.9, { col, seg: 12, r1: r * 0.88, s0: 0.85 });
  box(bp, { cx: x, cz: z, ux: 1, uz: 0, hl: r * 1.25, hw: r * 1.25 }, y0 + h * 0.9, y0 + h * 0.93, { col });
  cyl(bp, x, z, r * 0.5, y0 + h * 0.93, y0 + h, { col: statue, seg: 6, r1: r * 0.18 });
  app.foot.push({ ring: [[x - r * 2.2, z - r * 2.2], [x + r * 2.2, z - r * 2.2], [x + r * 2.2, z + r * 2.2], [x - r * 2.2, z + r * 2.2]], top: y0 + h });
  return y0 + h;
}
// Une colonne ou un fût isolé figure dans les données comme un petit bâtiment très haut : on le retrouve près du point
// attendu, on l'écarte et l'on rend son centre, où poser le monument modelé.
function ancre(V, x, z, rayon = 30) {
  let best = null;
  for (const e of bati()) { const r = e.rings[0]; if (e.h < 25 || Math.abs(polyArea(r)) > 320) continue; let cx = 0, cz = 0; for (const p of r) { cx += p[0]; cz += p[1]; } cx /= r.length; cz /= r.length; const d = Math.hypot(cx - x, cz - z); if (d < rayon && (!best || d < best.d)) best = { d, x: cx, z: cz }; }
  const c = best ? [best.x, best.z] : [x, z]; reserver(V, c[0], c[1], 6); return c;
}
const reserver = (V, x, z, d = 5) => V.reserves.push({ ring: [[x - d, z - d], [x + d, z - d], [x + d, z + d], [x - d, z + d]], x0: x - d, z0: z - d, x1: x + d, z1: z + d });

// Arc de triomphe de l'Étoile : 45 m de large, 22 m d'épaisseur, 50 m de haut ; la grande arche a 29 m sous clef.
function arc(app, B) {
  const V = app.v89, A = [-3988, -2306], C = [-4003, -2276], cx = (A[0] + C[0]) / 2, cz = (A[1] + C[1]) / 2, d = Math.hypot(C[0] - A[0], C[1] - A[1]), lx = (C[0] - A[0]) / d, lz = (C[1] - A[1]) / d, dx = -lz, dz = lx;
  const y0 = app.terrain.height(cx, cz), bs = B.at('stone', cx, cz), W = 22.4, E = 11.1, a = 7.3, HA = 29.2, HT = 49.5, col = PIERRE_BLANCHE;
  reserver(V, A[0], A[1], 6); reserver(V, C[0], C[1], 6);
  for (const s of [-1, 1]) { const px = cx + lx * s * (a + (W - a) / 2), pz = cz + lz * s * (a + (W - a) / 2), hl = (W - a) / 2;
    box(bs, { cx: px, cz: pz, ux: lx, uz: lz, hl, hw: E }, y0 - 1, y0 + 36.5, { col, s0: 0.82 });
    app.foot.push({ ring: [[px - lx * hl - dx * E, pz - lz * hl - dz * E], [px + lx * hl - dx * E, pz + lz * hl - dz * E], [px + lx * hl + dx * E, pz + lz * hl + dz * E], [px - lx * hl + dx * E, pz - lz * hl + dz * E]], top: y0 + HT }); }
  box(bs, { cx, cz, ux: lx, uz: lz, hl: W + 0.8, hw: E + 0.8 }, y0 + 36.5, y0 + 38.6, { col, s0: 0.9 });           // corniche
  box(bs, { cx, cz, ux: lx, uz: lz, hl: W, hw: E }, y0 + 38.6, y0 + HT, { col, s0: 0.92 });                        // attique
  box(bs, { cx, cz, ux: lx, uz: lz, hl: a, hw: E }, y0 + HA, y0 + 36.5, { col, s0: 0.9 });                         // au-dessus de la clef
  // la voûte : tympans des deux faces et intrados, en huit claveaux (chaque face est doublée : elle se voit des deux côtés)
  const N = 8, P = (s, e) => [cx + lx * s + dx * e, cz + lz * s + dz * e], deux = (p, q, r2, t, sh) => { bs.quad(p[0], p[2], p[1], q[0], q[2], q[1], r2[0], r2[2], r2[1], t[0], t[2], t[1], 0, 0, 1, 1, col, sh, sh); bs.quad(q[0], q[2], q[1], p[0], p[2], p[1], t[0], t[2], t[1], r2[0], r2[2], r2[1], 0, 0, 1, 1, col, sh, sh); };
  for (let k = 0; k < N; k++) {
    const t0 = (k / N) * Math.PI, t1 = ((k + 1) / N) * Math.PI, s0 = -a * Math.cos(t0), s1 = -a * Math.cos(t1), ya = y0 + HA - a + a * Math.sin(t0), yb = y0 + HA - a + a * Math.sin(t1);
    for (const e of [-E, E]) { const p = P(s0, e), q = P(s1, e); deux([p[0], p[1], ya], [q[0], q[1], yb], [q[0], q[1], y0 + HA], [p[0], p[1], y0 + HA], 0.86); }
    const p = P(s0, -E), q = P(s1, -E), p2 = P(s0, E), q2 = P(s1, E); deux([p[0], p[1], ya], [q[0], q[1], yb], [q2[0], q2[1], yb], [p2[0], p2[1], ya], 0.62);
  }
  app.monuments.Arc = { x: cx, z: cz, top: y0 + HT + 8 };
}

// Sacré-Cœur en 1889 : la crypte est achevée, les murs de la nef montent dans leurs échafaudages ; ni dôme ni campanile.
function sacreCoeur(app, B) {
  const V = app.v89, x = -504, z = -3712, y0 = app.terrain.height(x, z), bp = B.at('plain', x, z), bs = bp, col = PIERRE_BLANCHE;      // pierre de Château-Landon, très blanche
  V.reserves.push({ ring: [[x - 40, z - 52], [x + 40, z - 52], [x + 40, z + 52], [x - 40, z + 52]], x0: x - 40, z0: z - 52, x1: x + 40, z1: z + 52 });
  box(bs, { cx: x, cz: z, ux: 0, uz: 1, hl: 40, hw: 17 }, y0 - 4, y0 + 24, { col, s0: 0.8 });                      // nef et chœur
  box(bs, { cx: x, cz: z - 4, ux: 1, uz: 0, hl: 29, hw: 12 }, y0 - 4, y0 + 22, { col, s0: 0.8 });                  // transept
  cyl(bs, x, z - 40, 17, y0 - 4, y0 + 19, { col, seg: 16, s0: 0.8 });                                                // chevet
  cyl(bs, x, z - 4, 11.5, y0 + 24, y0 + 31, { col, seg: 16, s0: 0.9 });                                              // amorce du tambour
  // échafaudages : perches et moises de bois tout autour, une chèvre de levage au sommet
  const R = [[x - 19, z - 42], [x + 19, z - 42], [x + 19, z + 42], [x - 19, z + 42]];
  for (let k = 0; k < 4; k++) { const p = R[k], q = R[(k + 1) % 4], L = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L, n = Math.round(L / 6.5);
    for (let i = 0; i < n; i++) box(bp, { cx: p[0] + (ux * L * i) / n, cz: p[1] + (uz * L * i) / n, ux, uz, hl: 0.2, hw: 0.2 }, y0 - 3, y0 + 30, { col: BOIS, s0: 0.8 });
    for (const y of [7, 14, 21, 28]) box(bp, { cx: (p[0] + q[0]) / 2, cz: (p[1] + q[1]) / 2, ux, uz, hl: L / 2, hw: 0.16 }, y0 + y, y0 + y + 0.4, { col: BOIS }); }
  box(bp, { cx: x, cz: z - 4, ux: 1, uz: 0, hl: 0.3, hw: 0.3 }, y0 + 31, y0 + 44, { col: BOIS }); box(bp, { cx: x + 5, cz: z - 4, ux: 1, uz: 0, hl: 6, hw: 0.22 }, y0 + 43.4, y0 + 44, { col: BOIS });
  app.foot.push({ ring: [[x - 19, z - 42], [x + 19, z - 42], [x + 19, z + 42], [x - 19, z + 42]], top: y0 + 31 });
  app.monuments.SacreCoeur = { x, z, top: y0 + 52 };
}

// Halles centrales de Baltard : dix pavillons de fonte, de brique et de verre en 1889 (les deux derniers ne seront
// bâtis qu'en 1936). Chacun occupe son îlot de la base de 1900 ; deux groupes, de part et d'autre de la rue Baltard,
// réunis par des rues couvertes. Emprises réelles ; l'élévation — arcades, comble à lanterneau — est une évocation.
function halles(app, B) {
  const V = app.v89, T = app.terrain, FONTE = rgb(168, 180, 176), BRIQUE = rgb(178, 106, 84), ZINC = rgb(150, 158, 164), VERRE = rgb(176, 196, 202), pav = [];
  for (const i of ilots()) { const r = i.rings[0]; if (i.c !== 'B' || r.length !== 4) continue; const a = Math.abs(polyArea(r)), cx = (r[0][0] + r[2][0]) / 2, cz = (r[0][1] + r[2][1]) / 2; if (a > 2100 && a < 3000 && Math.hypot(cx + 330, cz + 1005) < 200) pav.push({ r, cx, cz }); }
  if (pav.length < 8) return;
  const y0 = pav.reduce((s, p) => s + T.height(p.cx, p.cz), 0) / pav.length, groupes = [[], []];
  for (const p of pav) {
    const r = ccw(p.r), bp = B.at('plain', p.cx, p.cz), R2 = (k, f) => [p.cx + (r[k][0] - p.cx) * f, p.cz + (r[k][1] - p.cz) * f];
    facade(B.at('stone', p.cx, p.cz), r, false, y0 - 1, y0 + 2.6, 0, 0.6, BRIQUE, 0, 0.9, 1, 6);                 // soubassement de brique
    facade(B.at('nef', p.cx, p.cz), r, false, y0 + 2.6, y0 + 10, 0, 1, FONTE, 0, 0.9, 1, 6);                      // arcades de fonte vitrées
    // comble : un versant de zinc, le lanterneau vitré, son toit
    const pans = (f0, ya, f1, yb, col, s0, s1) => { for (let k = 0; k < 4; k++) { const a = R2(k, f0), c = R2((k + 1) % 4, f0), a2 = R2(k, f1), c2 = R2((k + 1) % 4, f1); bp.quad(c[0], y0 + ya, c[1], a[0], y0 + ya, a[1], a2[0], y0 + yb, a2[1], c2[0], y0 + yb, c2[1], 0, 0, 1, 1, col, s0, s1); } };
    pans(1.02, 10, 0.62, 13, ZINC, 0.9, 1); pans(0.62, 13, 0.62, 15.4, VERRE, 0.95, 1); pans(0.64, 15.4, 0.05, 18, ZINC, 0.95, 1.05);
    app.foot.push({ ring: r, top: y0 + 18 });
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const q of r) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
    V.reserves.push({ ring: r.map((q) => [p.cx + (q[0] - p.cx) * 1.12, p.cz + (q[1] - p.cz) * 1.12]), x0: x0 - 6, z0: z0 - 6, x1: x1 + 6, z1: z1 + 6 });
    groupes[p.cx * 0.946 + p.cz * 0.324 < -662 ? 0 : 1].push(p);                                                      // à l'ouest ou à l'est de la rue Baltard
  }
  // rues couvertes : une toiture basse d'un pavillon à l'autre, dans chaque groupe
  const e1 = [0.946, 0.324], e2 = [0.324, -0.946];
  for (const g of groupes) { if (!g.length) continue; let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const p of g) for (const q of p.r) { const u = q[0] * e1[0] + q[1] * e1[1], v = q[0] * e2[0] + q[1] * e2[1]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const P = (u, v) => [u * e1[0] + v * e2[0], u * e1[1] + v * e2[1]], a = P(u0 + 2, v0 + 2), b = P(u1 - 2, v0 + 2), c = P(u1 - 2, v1 - 2), d = P(u0 + 2, v1 - 2), bp = B.at('plain', a[0], a[1]);
    bp.quad(a[0], y0 + 9.6, a[1], d[0], y0 + 9.6, d[1], c[0], y0 + 9.6, c[1], b[0], y0 + 9.6, b[1], 0, 0, 1, 1, VERRE, 0.9, 0.9); bp.quad(a[0], y0 + 9.6, a[1], b[0], y0 + 9.6, b[1], c[0], y0 + 9.6, c[1], d[0], y0 + 9.6, d[1], 0, 0, 1, 1, VERRE, 0.9, 0.9); }
  const m = pav.reduce((s, p) => [s[0] + p.cx / pav.length, s[1] + p.cz / pav.length], [0, 0]);
  app.monuments.Halles = { x: m[0], z: m[1], top: y0 + 30, pavillons: pav.length };
}

// Palais de l'Industrie (1855-1897) : 250 m sur 108 m le long des Champs-Élysées, là où passent aujourd'hui l'avenue
// Winston-Churchill et une partie des Grand et Petit Palais, qui le remplaceront en 1900 (ils sont écartés).
// Emplacement d'après l'axe de l'avenue et celui des Invalides ; élévation évoquée : deux rangs d'arcades, pavillons
// d'angle, porche monumental, nef vitrée de 35 m.
function industrie(app, B) {
  const V = app.v89, T = app.terrain, O = [-2677.6, -1522], ax = [0.902, 0.432], n = [-0.432, 0.902], HL = 125, HW = 54, y0 = T.height(O[0], O[1]), VERRE = rgb(166, 190, 202), ZINC = rgb(150, 158, 164);
  const P = (u, v) => [O[0] + ax[0] * u + n[0] * v, O[1] + ax[1] * u + n[1] * v], rect = (hl, hw, cu = 0, cv = 0) => [P(cu - hl, cv - hw), P(cu + hl, cv - hw), P(cu + hl, cv + hw), P(cu - hl, cv + hw)];
  { const r = rect(HL + 22, HW + 22); let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const q of r) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); } V.reserves.push({ ring: r, x0, z0, x1, z1 }); }
  reserver(V, -2864, -1458, 10);                                                                                      // une aile du Grand Palais, sans année dans les données
  const corps = ccw(rect(HL, HW)), bp = B.at('plain', O[0], O[1]), bs = B.at('stone', O[0], O[1]);
  facade(B.at('nef', O[0], O[1]), corps, false, y0 - 1, y0 + 18, 0, 2, PIERRE, 0, 0.84, 1, 8.9);
  box(bs, { cx: O[0], cz: O[1], ux: ax[0], uz: ax[1], hl: HL + 0.6, hw: HW + 0.6 }, y0 + 18, y0 + 19.4, { col: PIERRE, s0: 0.92 });      // corniche et bas-côtés couverts de zinc
  { const a = P(-HL, -HW), b = P(HL, -HW), c = P(HL, HW), d = P(-HL, HW); bp.quad(a[0], y0 + 19.45, a[1], d[0], y0 + 19.45, d[1], c[0], y0 + 19.45, c[1], b[0], y0 + 19.45, b[1], 0, 0, 1, 1, ZINC, 1, 1); bp.quad(a[0], y0 + 19.45, a[1], b[0], y0 + 19.45, b[1], c[0], y0 + 19.45, c[1], d[0], y0 + 19.45, d[1], 0, 0, 1, 1, ZINC, 1, 1); }
  // nef vitrée : un berceau de 72 m de large sur toute la longueur
  { const N = 10, L = HL - 14, w = 36, prof = (s) => 19.4 + 15.6 * Math.pow(Math.sin(Math.PI * s), 0.8);
    for (let k = 0; k < N; k++) { const s0 = k / N, s1 = (k + 1) / N, va = -w + 2 * w * s0, vb = -w + 2 * w * s1, ya = y0 + prof(s0), yb = y0 + prof(s1), sh = 0.86 + 0.14 * Math.sin((Math.PI * (s0 + s1)) / 2);
      const a = P(-L, va), b = P(L, va), c = P(L, vb), d = P(-L, vb);
      bp.quad(a[0], ya, a[1], b[0], ya, b[1], c[0], yb, c[1], d[0], yb, d[1], 0, 0, 1, 1, VERRE, sh, sh); bp.quad(b[0], ya, b[1], a[0], ya, a[1], d[0], yb, d[1], c[0], yb, c[1], 0, 0, 1, 1, VERRE, sh, sh);
      for (const [p, q] of [[a, d], [b, c]]) { bp.quad(p[0], y0 + 19.4, p[1], q[0], y0 + 19.4, q[1], q[0], yb, q[1], p[0], ya, p[1], 0, 0, 1, 1, VERRE, 0.95, 1); bp.quad(q[0], y0 + 19.4, q[1], p[0], y0 + 19.4, p[1], p[0], ya, p[1], q[0], yb, q[1], 0, 0, 1, 1, VERRE, 0.95, 1); } } }
  // pavillons d'angle, porche monumental face aux Champs-Élysées (au nord)
  for (const su of [-1, 1]) for (const sv of [-1, 1]) { const c = P(su * (HL - 9), sv * (HW - 9)); box(bs, { cx: c[0], cz: c[1], ux: ax[0], uz: ax[1], hl: 11, hw: 11 }, y0 - 1, y0 + 24, { col: PIERRE, s0: 0.84 }); cone(bp, c[0], c[1], 15.5, y0 + 24, y0 + 30, { col: ZINC, seg: 4, a0: Math.atan2(ax[1], ax[0]) + Math.PI / 4 }); }
  { const c = P(0, -(HW + 5)); box(bs, { cx: c[0], cz: c[1], ux: ax[0], uz: ax[1], hl: 24, hw: 9 }, y0 - 1, y0 + 30, { col: PIERRE, s0: 0.84 }); box(bs, { cx: c[0], cz: c[1], ux: ax[0], uz: ax[1], hl: 12, hw: 7 }, y0 + 30, y0 + 35, { col: PIERRE, s0: 0.95 }); }
  app.foot.push({ ring: corps, top: y0 + 35 });
  app.monuments.Industrie = { x: O[0], z: O[1], top: y0 + 46 };
}

export function batirMonuments(app, B) {
  const V = app.v89, M = app.monuments, T = app.terrain, H = (x, z) => T.height(x, z);
  // ---- dôme des Invalides : l'église carrée, deux étages de tambour, la coupole dorée (107 m). Son tambour est dans les données : il est remplacé.
  { const x = -2736, z = -235, y0 = H(x, z), bs = B.at('stone', x, z);
    reserver(V, x, z);
    box(bs, { cx: x, cz: z, ux: 0.997, uz: 0.08, hl: 24, hw: 24 }, y0 - 1, y0 + 30, { col: PIERRE, s0: 0.84 });
    cyl(bs, x, z, 15.5, y0 + 30, y0 + 46, { col: PIERRE, seg: 20, s0: 0.9 });
    M.Invalides = { x, z, top: coupole(app, B, x, z, 13.4, 46, 59, 87, 99, 107, OR, { fleche: OR, lanterne: OR }) }; }
  // ---- dôme du Panthéon (83 m), sur son tambour à colonnade, lui aussi dans les données
  { const x = -309, z = 736, y0 = H(x, z); reserver(V, x, z);
    cyl(B.at('stone', x, z), x, z, 18.5, y0 - 1, y0 + 44, { col: PIERRE, seg: 20, s0: 0.86 });
    M.Pantheon = { x, z, top: coupole(app, B, x, z, 14.5, 44, 58, 75, 80, 83, PLOMB) }; }
  // ---- Opéra : coupole de cuivre de la salle, cage de scène et son comble
  M.Opera = { x: -1337, z: -2084, top: coupole(app, B, -1337, -2084, 19, 28, 38, 50, 53, 56, CUIVRE, { fleche: OR }) };
  { const ax = [0.309, 0.951], c = [-1341 - ax[0] * 30, -2095 - ax[1] * 30], y0 = H(c[0], c[1]);
    box(B.at('stone', c[0], c[1]), { cx: c[0], cz: c[1], ux: ax[0], uz: ax[1], hl: 17, hw: 29 }, y0 + 28, y0 + 49, { col: PIERRE, s0: 0.9 });
    cone(B.at('plain', c[0], c[1]), c[0], c[1], 33, y0 + 49, y0 + 57, { col: CUIVRE, seg: 4, a0: Math.atan2(ax[1], ax[0]) + Math.PI / 4 }); }
  // ---- Institut : la coupole, au milieu de la façade du quai
  { const R = repere(-952, -459, [0.438, 0.899], [-0.44, -0.9]); if (R) { const p = R.P(16); M.Institut = { x: p[0], z: p[1], top: coupole(app, B, p[0], p[1], 9.5, 18, 32, 41, 44, 46, PLOMB, { fleche: OR }) }; } }
  // ---- Saint-Augustin : le dôme (80 m) au-dessus du chœur
  { const R = repere(-2274, -2561, [0.423, 0.906], [0.4, 0.9]); if (R) { const p = R.P(R.L * 0.74); M.Augustin = { x: p[0], z: p[1], top: coupole(app, B, p[0], p[1], 11, 30, 55, 72, 77, 80, ARDOISE, { fleche: OR }) }; } }
  // ---- Notre-Dame : les deux tours de la façade (69 m), la flèche de Viollet-le-Duc à la croisée (96 m)
  { const R = repere(-49, -16, [0.899, 0.438], [-1, -0.4]);
    if (R) { let top = 0; for (const s of [-1, 1]) { const p = R.P(7.2, s * 15.6); top = tour(app, B, p[0], p[1], R.f[0], R.f[1], 6.8, 0, 69, { baies: 43 }); }
      const k = R.P(R.L * 0.6), y0 = H(k[0], k[1]), f = R.P(7.2);
      cyl(B.at('plain', k[0], k[1]), k[0], k[1], 2.6, y0 + 40, y0 + 52, { col: PLOMB, seg: 8, r1: 2 }); cone(B.at('plain', k[0], k[1]), k[0], k[1], 2.3, y0 + 52, y0 + 96, { col: PLOMB, seg: 8 });
      M.NotreDame = { x: f[0], z: f[1], top }; app.landmarks.push({ nom: 'fleche', x: k[0], z: k[1], top: y0 + 96 }); } }
  // ---- tours de façade : Saint-Sulpice (73 et 68 m), la Trinité (65 m), Saint-Vincent-de-Paul (54 m)
  { const R = repere(-1123, 213, [0.9986, -0.052], [-1, 0]); if (R) { const a = R.P(8, -21), b = R.P(8, 21); tour(app, B, a[0], a[1], R.f[0], R.f[1], 6.6, 0, 68, { baies: 44 }); M.Sulpice = { x: b[0], z: b[1], top: tour(app, B, b[0], b[1], R.f[0], R.f[1], 6.6, 0, 73, { baies: 46 }) }; } }
  { const R = repere(-1371, -2680, [0.276, 0.961], [0.3, 1]); if (R) { const p = R.P(6); M.Trinite = { x: p[0], z: p[1], top: tour(app, B, p[0], p[1], R.f[0], R.f[1], 5, 0, 52, { baies: 34, fleche: 65, toit: PLOMB }) }; } }
  { const R = repere(118, -2870, [0.174, -0.985], [-0.17, 0.985]); if (R) for (const s of [-1, 1]) { const p = R.P(6, s * 12.8); tour(app, B, p[0], p[1], R.f[0], R.f[1], 4.6, 0, 54, { baies: 36 }); } }
  // ---- colonnes et obélisque
  { const c = ancre(V, -1512, -1596); M.Vendome = { x: c[0], z: c[1], top: colonne(app, B, c[0], c[1], 1.9, 44, BRONZE, BRONZE) }; }
  { const c = ancre(V, 1355, -25); M.Juillet = { x: c[0], z: c[1], top: colonne(app, B, c[0], c[1], 2, 50, BRONZE, OR) }; }
  { const x = -2108, z = -1387, y0 = H(x, z), bp = B.at('plain', x, z); box(B.at('stone', x, z), { cx: x, cz: z, ux: 1, uz: 0, hl: 2.4, hw: 2.4 }, y0 - 0.5, y0 + 4.5, { col: PIERRE });
    cyl(bp, x, z, 1.7, y0 + 4.5, y0 + 26, { col: GRANIT, seg: 4, r1: 1.05, s0: 0.9 }); cone(bp, x, z, 1.05, y0 + 26, y0 + 27.6, { col: OR, seg: 4 });
    app.foot.push({ ring: [[x - 2.4, z - 2.4], [x + 2.4, z - 2.4], [x + 2.4, z + 2.4], [x - 2.4, z + 2.4]], top: y0 + 27.6 }); M.Obelisque = { x, z, top: y0 + 27.6 }; }
  arc(app, B);
  sacreCoeur(app, B);
  halles(app, B);
  industrie(app, B);
}
