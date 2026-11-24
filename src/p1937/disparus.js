// Les grands édifices de Paris en 1937 qui ont disparu depuis. La plupart sont dans les données : les halles, les
// magasins et les ateliers des grands ensembles (Halle aux vins, entrepôts de Bercy, abattoirs de la Villette et de
// Vaugirard, marché aux bestiaux, usines Citroën, gare des Gobelins) sont des bâtiments de statut « disparu »
// (tools/disparus_1937.py), relevés sur la photographie aérienne de Paris en 1949 de l'IGN (tools/releve1949.py). Ce
// module modèle à part ceux dont la forme ne tient pas dans un bâtiment des données — les gazomètres de l'usine à gaz de
// La Villette, la prison de la Petite Roquette, le Vélodrome d'Hiver — et nomme le tout. Emplacements et diamètres sont
// relevés sur la photographie ; les hauteurs et les élévations sont une évocation. Les Halles, la gare Montparnasse de
// 1852 et la gare de la Bastille sont modelées par les modules communs (src/p1889/monuments.js, src/p1889/gares.js).
import { box, cyl, cone, rgb } from '../builder.js';
import { ensemble } from '../p1889/expo.js';
import { berceau } from '../p1900/outils.js';

export const SOURCES_DISPARUS = 'Les grands ensembles disparus depuis 1937 — Halle aux vins, entrepôts de Bercy, abattoirs de la Villette et de Vaugirard, marché aux bestiaux, usines Citroën du quai de Javel, gare des Gobelins, usine à gaz de La Villette, prison de la Petite Roquette, Vélodrome d’Hiver — sont relevés sur la photographie aérienne « Paris 1949 » de l’IGN (Géoplateforme, couche Édugéo), douze ans après : leur emprise est celle de la photographie, à une dizaine de mètres près ; leurs halles, leur hauteur et leur élévation sont une évocation.';

const ACIER = rgb(136, 140, 134), ACIER_SOMBRE = rgb(108, 112, 108), PIERRE = rgb(214, 204, 182), ARDOISE = rgb(92, 102, 118), BRIQUE = rgb(170, 104, 80), VERRE = rgb(170, 192, 200);
const boite = (ring) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { ring, x0, z0, x1, z1 }; };
const cercle = (x, z, r, n = 12) => Array.from({ length: n }, (_, k) => [x + r * Math.cos((2 * Math.PI * k) / n), z + r * Math.sin((2 * Math.PI * k) / n)]);

// Usine à gaz de La Villette : les cuves des gazomètres, relevées sur la photographie (centre, diamètre en mètres). La
// cloche monte et descend avec le gaz stocké : la hauteur est de convention, un peu moins que le diamètre.
const GAZOMETRES = [[1270, -4755, 73], [1316, -4815, 39], [1363, -4833, 42], [1400, -4796, 36], [1363, -4778, 36], [1327, -4763, 31], [1389, -4724, 31], [1353, -4705, 29], [1426, -4737, 31],
  [1478, -4695, 39], [1431, -4677, 39], [1379, -4661, 36], [1332, -4643, 36], [1288, -4625, 36], [1275, -4672, 34], [1233, -4656, 36], [1192, -4666, 42], [1181, -4609, 57], [1218, -4713, 36]];
function gazometres(app, B) {
  const V = app.v89, T = app.terrain;
  GAZOMETRES.forEach(([x, z, D], k) => {
    const r = D / 2, y0 = T.height(x, z), h = Math.max(16, Math.min(48, 0.72 * D)) * (0.8 + 0.2 * ((k * 7) % 5) / 4), bs = B.at('stone', x, z), bp = B.at('plain', x, z);
    cyl(bs, x, z, r, y0 - 1, y0 + h, { col: k % 3 ? ACIER : ACIER_SOMBRE, seg: 24, s0: 0.8, s1: 1 });
    cone(bp, x, z, r, y0 + h, y0 + h + r * 0.12, { col: ACIER_SOMBRE, seg: 24 });
    // le guidage : des montants autour de la cuve, deux ceintures
    const n = Math.max(8, Math.round(D / 5)), rg = r + 1.2;
    for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n, px = x + rg * Math.cos(a), pz = z + rg * Math.sin(a); box(bp, { cx: px, cz: pz, ux: Math.cos(a), uz: Math.sin(a), hl: 0.35, hw: 0.35 }, y0 - 0.5, y0 + h + 3, { col: ACIER_SOMBRE }); }
    const ring = cercle(x, z, rg + 0.4);
    app.foot.push({ ring, top: y0 + h + 3 }); V.reserves.push(boite(ring));
    if (D > 50) app.landmarks.push({ x, z, top: y0 + h });
  });
  app.monuments.UsineGaz = { x: 1330, z: -4730, top: T.height(1330, -4730) + 60 };
}

// Prison de la Petite Roquette (Hippolyte Lebas, 1826-1836) : un hexagone de bâtiments cellulaires, six tours aux
// angles, six ailes qui rayonnent d'une rotonde centrale, la chapelle, d'où l'on surveillait tout ; une enceinte
// hexagonale autour. Centre et rayon relevés sur la photographie de 1949 ; prison de femmes depuis 1932.
function petiteRoquette(app, B) {
  const T = app.terrain, V = app.v89, x = 2482, z = -764, y0 = T.height(x, z), R = 50, E = 9, H = 14, RE = 76;
  const sommet = (r, k) => { const a = -Math.PI / 2 + (Math.PI / 3) * k; return [x + r * Math.cos(a), z + r * Math.sin(a)]; };
  const bs = B.at('stone', x, z), bp = B.at('plain', x, z);
  const corps = (p, q, hw, ya, yb, col, toit = true) => {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L, c = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    box(bs, { cx: c[0], cz: c[1], ux, uz, hl: L / 2, hw }, ya, yb, { col, s0: 0.82 });
    if (toit) box(bp, { cx: c[0], cz: c[1], ux, uz, hl: L / 2, hw: hw * 0.55 }, yb, yb + 2.2, { col: ARDOISE });
    app.foot.push({ ring: [[p[0] - uz * hw, p[1] + ux * hw], [q[0] - uz * hw, q[1] + ux * hw], [q[0] + uz * hw, q[1] - ux * hw], [p[0] + uz * hw, p[1] - ux * hw]], top: yb + (toit ? 2.2 : 0) });
  };
  for (let k = 0; k < 6; k++) {
    corps(sommet(R, k), sommet(R, k + 1), E / 2, y0 - 1, y0 + H, PIERRE);                       // bâtiments cellulaires
    corps(sommet(10, k), sommet(R - 4, k), E / 2, y0 - 1, y0 + H, PIERRE);                       // ailes rayonnantes
    corps(sommet(RE, k), sommet(RE, k + 1), 0.5, y0 - 1, y0 + 6, PIERRE, false);                // mur d'enceinte
    const t = sommet(R, k); cyl(bs, t[0], t[1], 5, y0 - 1, y0 + H + 4, { col: PIERRE, seg: 12, s0: 0.84 }); cone(bp, t[0], t[1], 5.4, y0 + H + 4, y0 + H + 9, { col: ARDOISE, seg: 12 });
  }
  cyl(bs, x, z, 11, y0 - 1, y0 + H + 3, { col: PIERRE, seg: 18, s0: 0.84 }); cone(bp, x, z, 11.5, y0 + H + 3, y0 + H + 11, { col: ARDOISE, seg: 18 });       // rotonde et chapelle
  V.reserves.push(boite(Array.from({ length: 6 }, (_, k) => sommet(RE + 2, k))));
  app.landmarks.push({ x, z, top: y0 + H + 11 });
  app.monuments.PetiteRoquette = { x, z, top: y0 + H + 20 };
}

// Vélodrome d'Hiver (1909-1959), rue Nélaton : une salle de 105 mètres sur 62 sous une grande verrière, autour de sa
// piste. Emprise relevée sur la photographie ; l'élévation est une évocation.
function velodrome(app) {
  const T = app.terrain, V = app.v89, O = [-4481.5, -7.5], u = [0.653, -0.758], n = [-u[1], u[0]], HL = 52, HW = 31, y0 = T.height(O[0], O[1]);
  const P = (a, b) => [O[0] + u[0] * a + n[0] * b, O[1] + u[1] * a + n[1] * b];
  ensemble(app, y0, -2, -1, 30, (bm, bv) => {
    box(bm, { cx: O[0], cz: O[1], ux: u[0], uz: u[1], hl: HL, hw: HW }, y0 - 1, y0 + 13, { col: BRIQUE, s0: 0.8 });
    berceau(bv, P, y0, -HL + 2, HL - 2, -HW, HW, 13, 26, VERRE);
  });
  const ring = [P(-HL, -HW), P(HL, -HW), P(HL, HW), P(-HL, HW)];
  app.foot.push({ ring, top: y0 + 26 }); V.reserves.push(boite(ring));
  app.monuments.VelHiv = { x: O[0], z: O[1], top: y0 + 34 };
}

// Où nommer les ensembles que les données portent (centre de leur zone, tools/disparus_1937.py).
const NOMMES = {
  HalleVins: [500, 660], Bercy: [2420, 2030], Abattoirs: [2740, -4650], Bestiaux: [2850, -4260], Vaugirard: [-3660, 2290], Citroen: [-5440, 1340], Gobelins: [1150, 2960],
};

export function batirDisparus(app, B) {
  const T = app.terrain, M = app.monuments, V = app.v89;
  gazometres(app, B);
  petiteRoquette(app, B);
  velodrome(app);
  for (const [k, [x, z]] of Object.entries(NOMMES)) M[k] = { x, z, top: T.height(x, z) + 26 };
  const D = ' Disparu depuis : son emprise est relevée sur la photographie aérienne de Paris en 1949 ; ses halles, leur hauteur et leur élévation sont une évocation.';
  (V.lieux = V.lieux || []).push(
    ['Halle aux vins', 'disparu', 'L’entrepôt des vins de Paris, bâti de 1811 à 1845 sur l’emplacement de l’abbaye Saint-Victor, entre le quai Saint-Bernard et la rue Jussieu : des rues intérieures bordées de magasins et de celliers, où les négociants gardent les vins en franchise de l’octroi. Il sera démoli à partir de 1960 pour la faculté des sciences de Jussieu.' + D, M.HalleVins, 1],
    ['Entrepôts de Bercy', 'disparu', 'Le grand marché des vins de Paris, entre le quai de Bercy et la rue de Bercy, repris par la Ville après l’annexion de 1860 et rebâti par l’architecte Ernest Lheureux : des chais de pierre et de brique alignés le long de rues plantées, où roulent les fûts. Démolis dans les années 1980, ils ont fait place au parc de Bercy ; la cour Saint-Émilion en garde quelques chais.' + D, M.Bercy, 1],
    ['Abattoirs de la Villette', 'disparu', 'Les abattoirs généraux de Paris, ouverts en 1867 entre le canal Saint-Denis et le canal de l’Ourcq : de longues rangées d’échaudoirs, de bouveries et de bergeries. Fermés en 1974 ; la Cité des sciences occupe leur place.' + D, M.Abattoirs, 1],
    ['Marché aux bestiaux de la Villette', 'disparu', 'De l’autre côté du canal de l’Ourcq, le marché où arrive par le chemin de fer de Ceinture le bétail de toute la France : trois grandes halles de fer, dont celle du milieu, la Grande Halle, est encore debout. Les halles latérales et les étables ont disparu.' + D, M.Bestiaux],
    ['Abattoirs de Vaugirard', 'disparu', 'Les abattoirs de la rive gauche (1894-1898), rue des Morillons, et le marché aux chevaux. Fermés en 1976, ils ont fait place au parc Georges-Brassens, qui garde les halles du marché aux chevaux.' + D, M.Vaugirard],
    ['Usines Citroën', 'disparu', 'Au quai de Javel, l’usine d’André Citroën, ouverte en 1915 pour les obus, puis vouée à l’automobile : la Traction Avant en sort depuis 1934. Elle fermera en 1975 ; c’est aujourd’hui le parc André-Citroën.' + D, M.Citroen, 1],
    ['Gare des Gobelins', 'disparu', 'Une gare de marchandises ouverte en 1903 au bout d’un embranchement de la Petite Ceinture : deux longues halles le long des voies. Les tours des Olympiades ont été bâties au-dessus dans les années 1970.' + D, M.Gobelins],
    ['Usine à gaz de La Villette', 'disparu', 'L’une des usines de la Société du gaz de Paris : une vingtaine de gazomètres le long du chemin de fer de Ceinture, dont un géant de plus de soixante-dix mètres de diamètre. Leur place et leur diamètre sont relevés sur la photographie aérienne de 1949 ; leur hauteur est de convention.', M.UsineGaz],
    ['Petite Roquette', 'disparu', 'La prison bâtie par Hippolyte Lebas de 1826 à 1836, rue de la Roquette : un hexagone de bâtiments cellulaires, six tours, six ailes qui rayonnent d’une rotonde centrale où l’on surveille tout. Maison d’éducation correctionnelle pour les jeunes garçons, prison de femmes depuis 1932, elle sera démolie en 1974 ; c’est aujourd’hui le square de la Roquette. Son plan est relevé sur la photographie aérienne de 1949 ; l’élévation est une évocation.', M.PetiteRoquette],
    ['Vélodrome d’Hiver', 'disparu', 'Le « Vel’ d’Hiv’ », rue Nélaton, ouvert en 1909 : sa piste de bois accueille les Six Jours de Paris, mais aussi la boxe, le patinage, les meetings politiques. Il sera démoli en 1959. Son emprise est relevée sur la photographie aérienne de 1949 ; la verrière est une évocation.', M.VelHiv],
  );
}
