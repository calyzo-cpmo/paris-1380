// Édifices publics de Paris en 1889 : l'Hôtel-Dieu, rebâti de 1866 à 1877 au nord du parvis Notre-Dame, et la
// silhouette des monuments que les données ne donnent qu'en volume — Hôtel de Ville, tours du Palais, flèche de la
// Sainte-Chapelle, tour Saint-Jacques, dômes du Val-de-Grâce, de la Sorbonne et de Saint-Paul, flèches de
// Sainte-Clotilde, portes Saint-Denis et Saint-Martin.
// Positions et orientations sont lues dans les données (emprise du bâtiment, îlot de 1900, croisement des rues) ou
// reprises de la maquette de 1380 pour les tours du Palais, qui partage le même repère ; les hauteurs sont celles des
// édifices, ou celles de la page de 1789 pour les dômes qu'elle montre déjà ; le détail est une évocation.
import { box, cyl, cone, rgb } from '../builder.js';
import { pointInPoly, polyArea } from '../geom.js';
import { ilots } from './data.js';
import { coupole, repere, tour, reserver } from './monuments.js';
import { repere as cadre, boite, corps, pavillon, PIERRE, ARDOISE, ZINC } from './corps.js';

const PLOMB = rgb(128, 136, 142), VIEILLE = rgb(204, 194, 170), PIERRE_BLANCHE = rgb(238, 232, 220);
const carre = (x, z, ux, uz, h) => { const nx = -uz, nz = ux; return [[x - ux * h - nx * h, z - uz * h - nz * h], [x + ux * h - nx * h, z + uz * h - nz * h], [x + ux * h + nx * h, z + uz * h + nz * h], [x - ux * h + nx * h, z - uz * h + nz * h]]; };

// Hôtel-Dieu (Arthur-Stanislas Diet, après Émile Gilbert, 1866-1877) : il occupe tout l'îlot entre le parvis, la rue
// de la Cité, la rue d'Arcole et le quai. Un corps sur le parvis avec le pavillon d'entrée, un autre sur le quai ; entre
// eux, une longue cour-jardin bordée de galeries à arcades, la chapelle au fond ; de part et d'autre, trois pavillons de
// malades séparés par des cours. Repère : u vers le quai, v vers la rue d'Arcole. Les rues du vieux quartier que l'atlas
// de Vasserot dessinait sur cet îlot avaient disparu : ses maisons sont écartées.
function hotelDieu(app, B) {
  const V = app.v89, T = app.terrain;
  const I = ilots().find((i) => i.c === 'B' && Math.abs(polyArea(i.rings[0])) > 15000 && pointInPoly(-113, -204, i.rings[0]));
  if (!I) return;
  V.reserves.push(boite(I.rings[0]));
  const F = cadre([-115, -186], [0.398, -0.917]), y0 = T.height(-115, -186), F4 = { mat: 'facade' };
  corps(app, B, F, -79, -65, -58.5, 58.5, y0 - 1, y0 + 17, { ...F4, comble: 5 });                    // sur le parvis
  pavillon(app, B, F, -72, 0, 9, 12, y0 - 1, y0 + 20, { ...F4, comble: 7 });
  corps(app, B, F, 66, 80, -58.5, 58.5, y0 - 1, y0 + 17, { ...F4, comble: 5 });                      // sur le quai
  for (const u of [-71, 73]) for (const s of [-1, 1]) pavillon(app, B, F, u, s * 51, 8, 7.5, y0 - 1, y0 + 19, { ...F4, comble: 6 });
  for (const u of [-42, -6, 30]) for (const s of [-1, 1]) corps(app, B, F, u - 8, u + 8, s * 21, s * 58.5, y0 - 1, y0 + 16, { ...F4, comble: 5 });      // pavillons de malades
  for (const s of [-1, 1]) corps(app, B, F, -65, 66, s * 17, s * 21, y0 - 1, y0 + 8.5, { travee: 4.2, toit: ZINC });     // galeries à arcades
  const yc = corps(app, B, F, 40, 66, -9, 9, y0 - 1, y0 + 15, { comble: 6, travee: 5 });                // chapelle et son clocheton
  { const c = F.P(46, 0); cone(B.at('ardoise', c[0], c[1]), c[0], c[1], 1.8, yc - 2, yc + 12, { col: ARDOISE, seg: 8 }); }
  app.gardens.push({ ring: F.rect(-60, 36, -13, 13), dens: 0.3 });
  const m = F.P(-10, 0); app.monuments.HotelDieu = { x: m[0], z: m[1], top: y0 + 34 };
}

// Hôtel de Ville (Ballu et Deperthes, 1874-1882) : le volume vient des données ; on lui ajoute le campanile au milieu
// de la façade sur la place et les hauts combles des quatre pavillons d'angle. Hauteurs de convention.
function hotelDeVille(app, B) {
  const T = app.terrain, R = repere(145, -381, [0.941, 0.338], [-1, 0]); if (!R) return;
  const y0 = T.height(145, -381), a0 = Math.atan2(R.f[1], R.f[0]) + Math.PI / 4, bp = (x, z) => B.at('ardoise', x, z);
  for (const [u, v] of [[10, R.l / 2 - 11], [10, -(R.l / 2 - 11)], [R.L - 10, R.l / 2 - 11], [R.L - 10, -(R.l / 2 - 11)]]) {
    const p = R.P(u, v); box(B.at('stone', p[0], p[1]), { cx: p[0], cz: p[1], ux: R.f[0], uz: R.f[1], hl: 8.5, hw: 8.5 }, y0 + 18, y0 + 26, { col: PIERRE_BLANCHE, s0: 0.86 });
    cone(bp(p[0], p[1]), p[0], p[1], 12.4, y0 + 26, y0 + 36, { col: ARDOISE, seg: 4, a0 });
  }
  const c = R.P(7, 0), top = tour(app, B, c[0], c[1], R.f[0], R.f[1], 5.5, 18, 40, { baies: 31, col: PIERRE_BLANCHE });
  cone(bp(c[0], c[1]), c[0], c[1], 7.8, top, top + 7, { col: ARDOISE, seg: 4, a0 });
  cyl(B.at('plain', c[0], c[1]), c[0], c[1], 1.1, top + 6, top + 9, { col: PLOMB, seg: 8 }); cone(B.at('plain', c[0], c[1]), c[0], c[1], 1.4, top + 9, top + 12, { col: PLOMB, seg: 8 });
  app.monuments.HotelDeVille = { x: c[0], z: c[1], top: top + 12 };
}

// Palais de justice : la tour de l'Horloge à l'angle du boulevard du Palais, les tours rondes de la Conciergerie sur le
// quai (César, d'Argent, Bonbec), aux places et aux cotes de la maquette de 1380 ; la flèche de la Sainte-Chapelle,
// refaite au milieu du siècle, au-dessus du faîte de la chapelle que donnent les données.
function palais(app, B) {
  const T = app.terrain, M = app.monuments;
  { const x = -306, z = -367, u = [0.94, 0.34], y = T.height(x, z), top = tour(app, B, x, z, u[0], u[1], 4.6, 0, 36, { baies: 29, col: VIEILLE, fleche: 46, toit: ARDOISE }), bp = B.at('plain', x, z);
    cyl(bp, x, z, 1.4, top - 4, top, { col: PLOMB, seg: 8 }); cone(bp, x, z, 1.8, top, y + 52, { col: PLOMB, seg: 8 });
    app.foot.push({ ring: carre(x, z, u[0], u[1], 4.6), top: y + 52 }); M.Horloge = { x, z, top: y + 52 }; }
  for (const [x, z, r, h] of [[-352, -391, 4.4, 22], [-364, -396, 4.4, 22], [-399, -408, 4.6, 20]]) {
    const y = T.height(x, z); cyl(B.at('stone', x, z), x, z, r, y - 1, y + h, { col: VIEILLE, seg: 14, s0: 0.82 }); cone(B.at('ardoise', x, z), x, z, r * 1.12, y + h, y + h + 9, { col: ARDOISE, seg: 14 });
    app.foot.push({ ring: carre(x, z, 1, 0, r), top: y + h + 9 });
  }
  M.Conciergerie = { x: -358, z: -393, top: T.height(-358, -393) + 40 };
  { const x = -388, z = -270, y = T.height(x, z), bp = B.at('plain', x, z);
    cyl(bp, x, z, 2.3, y + 33, y + 44, { col: PLOMB, seg: 8, r1: 1.9 }); cone(bp, x, z, 2.1, y + 44, y + 75, { col: PLOMB, seg: 8 });
    app.landmarks.push({ x, z, top: y + 75 }); M.SainteChapelle = { x, z, top: y + 75 }; }
}

export function batirEdifices(app, B) {
  const V = app.v89, T = app.terrain, M = app.monuments;
  hotelDieu(app, B);
  hotelDeVille(app, B);
  palais(app, B);
  // ---- tour Saint-Jacques (1509-1523) : les données la donnent comme une maison de 47,5 m ; elle est remplacée par
  // la tour, ses pinacles d'angle et la statue de saint Jacques, à 52 m
  { const x = -106, z = -556, u = [0.923, 0.385], n = [-u[1], u[0]], y = T.height(x, z); reserver(V, x, z, 8);
    tour(app, B, x, z, u[0], u[1], 6, 0, 47.5, { baies: 31, col: VIEILLE });
    const bp = B.at('plain', x, z), coin = (a, b) => [x + (u[0] * a + n[0] * b) * 5.4, z + (u[1] * a + n[1] * b) * 5.4];
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1]]) { const p = coin(a, b); cone(bp, p[0], p[1], 1, y + 47.5, y + 51, { col: VIEILLE, seg: 4 }); }
    { const p = coin(-1, -1); cyl(bp, p[0], p[1], 1.1, y + 47.5, y + 49, { col: VIEILLE, seg: 6 }); cyl(bp, p[0], p[1], 0.6, y + 49, y + 52, { col: VIEILLE, seg: 6, r1: 0.35 }); }
    app.foot.push({ ring: carre(x, z, u[0], u[1], 6), top: y + 52 }); M.TourSaintJacques = { x, z, top: y + 52 }; }
  // ---- dômes : à mi-longueur de l'église des données (Val-de-Grâce, chapelle de la Sorbonne), au centre de son
  // emprise pour Saint-Paul-Saint-Louis ; hauteur au sommet de la page de 1789 (le tambour du Val-de-Grâce est monté
  // au-dessus du comble que la ville donne à la nef)
  for (const [cle, x, z, ax, r, t0, t1, d, l, f] of [['ValDeGrace', -618, 1360, [0.201, -0.98], 8.5, 24, 31, 37.5, 40, 41.5], ['Sorbonne', -517, 492, [0.941, 0.338], 6.5, 20, 28, 37, 40, 42]]) {
    const R = repere(x, z, ax, ax, (e) => e.k === 'e'); if (!R) continue; const p = R.P(R.L / 2); M[cle] = { x: p[0], z: p[1], top: coupole(app, B, p[0], p[1], r, t0, t1, d, l, f, PLOMB) }; }
  M.SaintPaul = { x: 797, z: -184, top: coupole(app, B, 797, -184, 6.5, 26, 38, 50, 55, 58.5, PLOMB) };
  // ---- Sainte-Clotilde (Gau puis Ballu, 1846-1857) : la façade regarde le square Samuel-Rousseau, au nord, de l'autre
  // côté de la rue Las Cases ; ses deux tours portent des flèches de pierre de 69 m
  { const n = [0.898, 0.441]; let top = 0;
    for (const [x, z] of [[-2228.1, -622.9], [-2245.1, -631.3]]) { const y = T.height(x, z), t = tour(app, B, x, z, n[0], n[1], 5, 0, 44, { baies: 31 });
      cone(B.at('stone', x, z), x, z, 5.4, t, y + 69, { col: PIERRE, seg: 8, a0: Math.atan2(n[1], n[0]) + Math.PI / 8 }); app.landmarks.push({ x, z, top: y + 69 }); top = y + 69; }
    M.Clotilde = { x: -2236.6, z: -627, top }; }
  // ---- portes Saint-Denis (Blondel, 1672) et Saint-Martin (Bullet, 1674) : au milieu des boulevards, dans l'axe de la
  // rue et du faubourg qu'elles séparent. La place et l'orientation viennent des données, qui les donnent comme des
  // bâtiments — l'arc entier dans l'atlas de Vasserot pour la porte Saint-Denis, ses deux piles à l'APUR pour la porte
  // Saint-Martin — ; ces volumes sont écartés. Cotes de la page de 1789.
  for (const [cle, O, d, W, D, H, open, yOpen] of [['PorteSaintDenis', [170, -1846], [0.233, -0.972], 25, 5, 24.6, 8, 15.3], ['PorteSaintMartin', [382.5, -1776.5], [0.263, -0.965], 18, 4.5, 18, 5.4, 11]]) {
    reserver(V, O[0], O[1], 14);
    const y = T.height(O[0], O[1]), n = [-d[1], d[0]], pw = (W - open) / 4, bs = B.at('stone', O[0], O[1]);
    for (const k of [1, -1]) { const c = [O[0] + n[0] * (open / 2 + pw) * k, O[1] + n[1] * (open / 2 + pw) * k];
      box(bs, { cx: c[0], cz: c[1], ux: d[0], uz: d[1], hl: D / 2, hw: pw }, y - 1, y + H, { col: PIERRE, s0: 0.82 });
      app.foot.push({ ring: [[c[0] - d[0] * D / 2 - n[0] * pw, c[1] - d[1] * D / 2 - n[1] * pw], [c[0] + d[0] * D / 2 - n[0] * pw, c[1] + d[1] * D / 2 - n[1] * pw], [c[0] + d[0] * D / 2 + n[0] * pw, c[1] + d[1] * D / 2 + n[1] * pw], [c[0] - d[0] * D / 2 + n[0] * pw, c[1] - d[1] * D / 2 + n[1] * pw]], top: y + H }); }
    box(bs, { cx: O[0], cz: O[1], ux: d[0], uz: d[1], hl: D / 2, hw: open / 2 }, y + yOpen, y + H, { col: PIERRE, s0: 0.86 });
    M[cle] = { x: O[0], z: O[1], top: y + H };
  }
}
