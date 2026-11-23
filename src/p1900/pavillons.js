// L'Exposition de 1900 hors du Champ-de-Mars : la rue des Nations sur le quai d'Orsay, les pavillons de la rive droite,
// le Vieux Paris, le palais des Armées de terre et de mer et la passerelle Debilly, les palais de l'Esplanade des
// Invalides, la section des colonies au Trocadéro, et le trottoir roulant qui fait le tour de l'Exposition.
//
// L'ordonnance vient du rapport général de Picard (1902) et de la Revue technique de l'Exposition : la rue des Nations
// entre le pont des Invalides et le pont de l'Alma, en double rangée — la première au bord de la Seine, sur une
// plate-forme qui prolonge le quai au-dessus des basses berges, la seconde dans les allées du quai — et l'ordre des
// pavillons depuis les Invalides ; deux passerelles la relient à la rive droite. Sur la rive droite, de l'amont vers
// l'aval : le palais de la Ville de Paris, les serres de l'Horticulture, le palais des Congrès et de l'Économie sociale,
// dont le soubassement repose sur la berge. Le Vieux Paris, au pied du quai Debilly, en aval de l'Alma. Le trottoir
// roulant : une boucle de 3 370 m sur viaduc, à sept mètres, par la rue Fabert, le quai d'Orsay, l'avenue de La
// Bourdonnais et l'avenue de La Motte-Picquet. Les largeurs, les hauteurs et les silhouettes de chaque pavillon sont
// une évocation à partir de leur style décrit.
import { box, cyl, cone, rgb } from '../builder.js';
import { repere, corps, pavillon, fronton, pan, ARDOISE, ZINC, VERRE_CLAIR } from '../p1889/corps.js';
import { coupole, tour } from '../p1889/monuments.js';
import { expoXZ } from '../p1889/data.js';
import { ensemble } from '../p1889/expo.js';
import { poutre, berceau, calotte } from './outils.js';

const C = (r, g, b) => rgb(r, g, b);
const STAFF = C(236, 228, 208), OR = C(214, 176, 84), CUIVRE = C(110, 150, 132), TUILE = C(176, 92, 64), BOIS = C(150, 104, 70), ACIER = C(70, 84, 78), PIERRE_GRISE = C(200, 186, 160);
const boite = (ring) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { ring, x0, z0, x1, z1 }; };

// Un pavillon sur le rectangle [u0, u1] × [v0, v1] du repère F, façade principale du côté v = vf. s : son style —
// h hauteur des murs, col, toit, comble (hauteur du toit, 0 : terrasse), mat ('facade' : étages), dome [r, haut, couleur],
// tours [[u relatif (0 à 1), demi-côté, hauteur, flèche]], fleche [hauteur au centre], minaret, pignon (fronton
// central), angles (pavillons d'angle plus hauts de tant de mètres) ; fleche : hauteur au-dessus du sol.
function pavillonStyle(app, B, F, u0, u1, v0, v1, ya, yb, s) {
  const vf = s.vf ?? v1, um = (u0 + u1) / 2, vm = (v0 + v1) / 2, L = u1 - u0, P = (u, v) => F.P(u, v);
  let top = corps(app, B, F, u0, u1, v0, v1, ya, yb, { col: s.col, toit: s.toit || ARDOISE, comble: s.comble ?? 0, mat: s.mat, travee: s.travee || 5 });
  if (s.angles) for (const u of [u0 + 5, u1 - 5]) { const c = vf > vm ? v1 - 5 : v0 + 5; top = Math.max(top, pavillon(app, B, F, u, c, 5, 5, ya, yb + s.angles, { col: s.col, toit: s.toit || ARDOISE, comble: 4 })); }
  if (s.pignon) { const F2 = repere(F.O, F.n);                    // F.P(u, v) = F2.P(v, −u) : le pignon regarde l'axe v
    fronton(B, F2, vf, vf > vm ? vf - 8 : vf + 8, -(um + L * 0.2), -(um - L * 0.2), yb, yb + s.pignon, s.col); }
  if (s.dome) { const [r, haut, col] = s.dome, c = P(um, vm), y0 = app.terrain.height(c[0], c[1]), h0 = yb - y0; top = Math.max(top, coupole(app, B, c[0], c[1], r, h0 - 1, h0 + r * 0.5, h0 + r * 0.5 + haut, h0 + r * 0.5 + haut + 2, h0 + r * 0.5 + haut + 4, col || CUIVRE, { pierre: s.col, fleche: OR })); }
  for (const [f, demi, h, fl] of s.tours || []) { const c = P(u0 + L * f, vf > vm ? v1 - demi : v0 + demi), y0 = app.terrain.height(c[0], c[1]); top = Math.max(top, tour(app, B, c[0], c[1], F.d[0], F.d[1], demi, ya - y0, ya - y0 + h, { col: s.col, fleche: fl ? ya - y0 + h + fl : 0, toit: s.toit || ARDOISE })); }
  if (s.fleche) { const c = P(um, vm), y0 = app.terrain.height(c[0], c[1]), base = ya - y0 + 1;      // s.fleche : hauteur de la flèche au-dessus du sol
    top = Math.max(top, tour(app, B, c[0], c[1], F.d[0], F.d[1], 3.2, yb - y0 - 2, base + s.fleche * 0.62, { col: s.col, fleche: base + s.fleche, toit: s.toit || ARDOISE })); }
  if (s.minaret) { const c = P(u1 - 2.5, vf > vm ? v1 - 2.5 : v0 + 2.5), bs = B.at('stone', c[0], c[1]); cyl(bs, c[0], c[1], 1.4, ya - 1, ya + s.minaret, { col: s.col, seg: 10 }); cone(B.at('plain', c[0], c[1]), c[0], c[1], 1.6, ya + s.minaret, ya + s.minaret + 4, { col: s.toit || CUIVRE, seg: 10 }); top = Math.max(top, ya + s.minaret + 4); }
  app.landmarks.push({ x: P(um, vm)[0], z: P(um, vm)[1], top });
  return top;
}

// ---- rue des Nations : repère le long de la chaussée du bord de l'eau du quai d'Orsay, depuis le pont des Invalides
// (u vers l'aval, v vers la Seine). Première rangée de v = 6 au bord du port bas, la chaussée (la « rue des Nations »)
// en v = 0, seconde rangée dans les allées, de v = −36 à −14, la chaussée intérieure du quai en v ≈ −45.
const NATIONS = [
  // [pays, largeur, style]
  ['Italie', 54, { h: 20, col: C(232, 222, 198), dome: [9, 15, OR], angles: 6, comble: 0 }],
  ['Turquie', 34, { h: 14, col: C(240, 234, 220), dome: [7, 9, C(150, 170, 160)], minaret: 26 }],
  ['États-Unis', 40, { h: 18, col: C(236, 230, 216), dome: [10, 14, C(120, 130, 140)], pignon: 7 }],
  ['Autriche', 44, { h: 17, col: C(236, 224, 196), dome: [9, 13, CUIVRE], angles: 4 }],
  ['Bosnie-Herzégovine', 26, { h: 13, col: C(216, 198, 168), comble: 6, toit: TUILE, tours: [[0.8, 3, 22, 6]] }],
  ['Hongrie', 40, { h: 15, col: C(206, 190, 164), comble: 7, tours: [[0.15, 3.5, 26, 12], [0.85, 3.5, 22, 10]] }],
  ['Grande-Bretagne', 36, { h: 15, col: C(178, 120, 96), comble: 9, mat: 'facade', pignon: 6 }],
  ['Belgique', 34, { h: 16, col: C(218, 204, 174), comble: 8, fleche: 42 }],
  ['Norvège', 26, { h: 11, col: BOIS, comble: 10, toit: C(90, 70, 52), fleche: 24 }],
  ['Allemagne', 46, { h: 17, col: C(228, 208, 172), comble: 9, toit: C(120, 74, 60), fleche: 56, mat: 'facade' }],
  ['Espagne', 40, { h: 16, col: C(218, 194, 154), comble: 0, tours: [[0.08, 4, 26, 0], [0.92, 4, 26, 0]] }],
  ['Monaco', 26, { h: 14, col: C(236, 216, 186), comble: 0, tours: [[0.75, 3.5, 30, 0]] }],
  ['Suède', 30, { h: 13, col: C(172, 62, 50), comble: 6, toit: C(70, 60, 52), tours: [[0.1, 2.5, 20, 6], [0.9, 2.5, 20, 6]], fleche: 32 }],
  ['Grèce', 28, { h: 13, col: C(232, 226, 212), dome: [8, 6, C(150, 160, 170)], pignon: 4 }],
  ['Serbie', 26, { h: 13, col: C(224, 198, 162), dome: [6, 8, CUIVRE] }],
];
// seconde rangée : [pays, derrière quel pavillon de la première, largeur, style]
const NATIONS_2 = [
  ['Danemark', 'Turquie', 24, { h: 10, col: BOIS, comble: 8, toit: C(80, 64, 50) }],
  ['Portugal', 'États-Unis', 26, { h: 11, col: C(228, 216, 192), comble: 0 }],
  ['Pérou', 'Bosnie-Herzégovine', 26, { h: 12, col: C(232, 212, 182), dome: [5, 5, OR] }],
  ['Perse', 'Grande-Bretagne', 24, { h: 11, col: C(214, 198, 170), dome: [5, 6, C(70, 150, 170)] }],
  ['Luxembourg', 'Belgique', 22, { h: 11, col: C(214, 196, 170), comble: 7, tours: [[0.8, 2.5, 18, 6]] }],
  ['Finlande', 'Norvège', 24, { h: 10, col: C(196, 176, 146), comble: 9, toit: C(90, 80, 70), fleche: 22 }],
  ['Bulgarie', 'Espagne', 24, { h: 11, col: C(232, 204, 166), dome: [5, 5, CUIVRE] }],
  ['Roumanie', 'Monaco', 26, { h: 12, col: C(216, 182, 142), dome: [5, 7, CUIVRE], tours: [[0.1, 2.5, 18, 5]] }],
];

function rueDesNations(app, B) {
  const T = app.terrain, V = app.v89, M = app.monuments, F = repere([-2886, -1088], [-0.9993, 0.0366]), U0 = 40, U1 = 592, GAP = 3;
  const total = NATIONS.reduce((s, n) => s + n[1], 0), k = (U1 - U0 - GAP * (NATIONS.length - 1)) / total, pos = new Map();
  // le bord du port bas : premier point mouillé au-delà de la chaussée, moins deux mètres
  const bord = (u) => { for (let v = 8; v < 70; v += 1) { const p = F.P(u, v); if (T.wetAt(p[0], p[1]) > 0.5) return v - 2; } return 40; };
  let u = U0;
  for (const [pays, w, s] of NATIONS) {
    const L = w * k, u0 = u, u1 = u + L, vb = Math.min(bord(u0 + 2), bord(u1 - 2), bord((u0 + u1) / 2)), v0 = 6, v1 = Math.max(v0 + 14, vb);
    const yq = T.height(...F.P((u0 + u1) / 2, 0)), ya = Math.min(yq, T.height(...F.P((u0 + u1) / 2, v1 - 1))) - 1;          // la façade sur l'eau descend jusqu'au port
    const top = pavillonStyle(app, B, F, u0, u1, v0, v1, ya, yq + s.h, { ...s, vf: v0 });
    V.reserves.push(boite(F.rect(u0 - 1, u1 + 1, v0 - 1, v1 + 1)));
    const c = F.P((u0 + u1) / 2, (v0 + v1) / 2); pos.set(pays, { u0, u1 }); M['Nation ' + pays] = { x: c[0], z: c[1], top: top + 6 };
    u = u1 + GAP;
  }
  for (const [pays, devant, w, s] of NATIONS_2) {
    const d = pos.get(devant), um = (d.u0 + d.u1) / 2, u0 = um - w / 2, u1 = um + w / 2, v0 = -36, v1 = -14, yq = T.height(...F.P(um, -25));
    const top = pavillonStyle(app, B, F, u0, u1, v0, v1, yq - 1, yq + s.h, { ...s, vf: v1 });
    V.reserves.push(boite(F.rect(u0 - 1, u1 + 1, v0 - 1, v1 + 1)));
    const c = F.P(um, -25); M['Nation ' + pays] = { x: c[0], z: c[1], top: top + 6 };
  }
  { const c = F.P((U0 + U1) / 2, 10); M.RueDesNations = { x: c[0], z: c[1], top: T.height(c[0], c[1]) + 70 }; }
  return F;
}

// Passerelle de la rive gauche à la rive droite : un tablier sur des piles, deux garde-corps ; arc : une arche au-dessus
// du tablier, qui le porte par des aiguilles (passerelle Debilly).
function passerelle(app, B, a, b, o = {}) {
  const T = app.terrain, L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, nx = -uz, nz = ux, w = o.large || 4;
  const ya = Math.max(T.land(a[0], a[1]), T.height(a[0], a[1])) + 0.6, yb = Math.max(T.land(b[0], b[1]), T.height(b[0], b[1])) + 0.6, col = o.col || ACIER, c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], bp = B.at('plain', c[0], c[1]);
  const Y = (t) => ya + (yb - ya) * t + (o.bombe ?? 1.5) * Math.sin(Math.PI * t), Pt = (t, s) => [a[0] + ux * L * t + nx * s, a[1] + uz * L * t + nz * s];
  const N = Math.max(8, Math.round(L / 6));
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N, p0 = Pt(t0, -w), p1 = Pt(t1, -w), q0 = Pt(t0, w), q1 = Pt(t1, w), y0 = Y(t0), y1 = Y(t1);
    pan(bp, [[p0[0], y0, p0[1]], [p1[0], y1, p1[1]], [q1[0], y1, q1[1]], [q0[0], y0, q0[1]]], o.planche || C(150, 130, 104), 1, true);
    for (const s of [-w, w]) { const r0 = Pt(t0, s), r1 = Pt(t1, s); poutre(bp, [r0[0], y0 + 1, r0[1]], [r1[0], y1 + 1, r1[1]], 0.08, col); }
    for (let k = 0; k < 4; k++) app.deckSet(...Pt(t0 + (t1 - t0) * (k / 4), 0), y0 + (y1 - y0) * (k / 4));
  }
  const piles = o.arc ? [0.08, 0.92] : [0.25, 0.5, 0.75];
  for (const t of piles) { const p = Pt(t, 0); box(B.at('stone', p[0], p[1]), { cx: p[0], cz: p[1], ux, uz, hl: 1.6, hw: w + 0.8 }, -3, Y(t) - 0.3, { col: o.pile || C(150, 140, 120) }); }
  if (o.arc) {                                                          // l'arche au-dessus du tablier, et ses aiguilles
    const H = o.arc, A = (t) => Y(t) + 1 + H * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.08) / 0.84)));
    for (const s of [-w + 0.3, w - 0.3]) for (let i = 0; i < 24; i++) { const t0 = 0.08 + (0.84 * i) / 24, t1 = 0.08 + (0.84 * (i + 1)) / 24, p0 = Pt(t0, s), p1 = Pt(t1, s);
      poutre(bp, [p0[0], A(t0), p0[1]], [p1[0], A(t1), p1[1]], 0.45, col); if (i % 2 === 0 && i) poutre(bp, [p0[0], Y(t0), p0[1]], [p0[0], A(t0), p0[1]], 0.07, col); }
  }
  return { x: c[0], z: c[1], top: Math.max(ya, yb) + (o.arc || 0) + 8 };
}

// ---- rive droite, du pont des Invalides au pont de l'Alma (Picard, t. I, p. 274-275, et t. II, ch. VII et VIII) :
// repère le long du quai de la Conférence (v = 0, le quai haut ; v vers le nord, u vers l'aval depuis le pont des
// Invalides). Au premier rang, d'amont en aval : le palais de la Ville de Paris, un restaurant, les deux serres de
// l'Horticulture (83 m sur 33, 21 m de haut, un jardin de 70 m entre elles, sur une plate-forme qui s'avance au-dessus
// de la berge basse), le palais de la Danse, un phare, le palais de l'Économie sociale et des Congrès (100 m sur 33,
// immédiatement en amont du pont de l'Alma). Au second rang, le long d'une allée dite « rue de Paris » et de la
// palissade du Cours-la-Reine, seize établissements d'attractions, dans l'ordre du rapport. Les surfaces viennent du
// rapport (t. VII) ; les hauteurs et les silhouettes sont une évocation à partir des styles qu'il décrit.
const RD = () => repere([-2890, -1262], [-0.9995, 0.03]);
const RUE_DE_PARIS = [
  // [nom, u0, largeur, style] ; la façade donne sur l'allée (v = 18), le fond sur le Cours-la-Reine (v = 30)
  ['Restaurant', 24, 20, { h: 8, col: C(232, 222, 200), comble: 4, toit: TUILE }],
  ['Maison du rire', 50, 28, { h: 11, col: C(232, 204, 172), comble: 0, pignon: 4, dome: [4, 4, C(196, 120, 84)] }],
  ['Phono-cinéma-théâtre', 88, 16, { h: 9, col: C(242, 238, 228), comble: 0 }],
  ['Théâtroscope', 116, 15, { h: 10, col: C(236, 226, 206), comble: 0, dome: [5, 5, OR] }],
  ['Tableaux vivants', 146, 24, { h: 9, col: C(204, 124, 92), comble: 0, pignon: 3 }],
  ['Jardin de la chanson', 186, 22, { kiosque: true }],
  ['La Roulotte', 224, 28, { h: 7, col: BOIS, comble: 4, toit: C(150, 62, 52) }],
  ['Kiosque à musique', 274, 24, { kiosque: true }],
  ['Grand Guignol', 330, 24, { h: 9, col: C(200, 96, 64), comble: 0, dome: [5, 6, C(96, 136, 96)] }],
  ['Bonshommes Guillaume', 364, 30, { h: 10, col: C(242, 224, 204), comble: 3, pignon: 3 }],
  ['Théâtre des Auteurs gais', 402, 26, { h: 6, col: C(226, 212, 186), comble: 3, toit: C(214, 196, 150) }],
  ['Théâtre de Loïe Fuller', 484, 20, { fuller: true }],
  ['Manoir à l’envers', 512, 14, { envers: true }],
  ['Postes et télégraphes', 536, 10, { h: 7, col: C(226, 216, 196), comble: 3 }],
  ['Restaurant de l’Alma', 556, 22, { h: 8, col: C(232, 222, 200), comble: 4, toit: TUILE }],
];
function riveDroite(app, B) {
  const T = app.terrain, V = app.v89, M = app.monuments, F = RD(), yq = (u) => T.height(...F.P(u, 4));
  const poser = (u0, u1, v0, v1) => V.reserves.push(boite(F.rect(u0 - 1, u1 + 1, v0 - 1, v1 + 1)));
  // le bord de l'eau : le premier point mouillé sous le quai, moins deux mètres ; la berge basse est à BAS
  const bord = (u) => { for (let v = 0; v > -40; v -= 1) if (T.wetAt(...F.P(u, v)) > 0.5) return v + 2; return -24; };
  const avant = (u0, u1, max) => Math.max(max, bord(u0 + 1), bord((u0 + u1) / 2), bord(u1 - 1));
  const BAS = (T.niveauBas ?? 2.1) - 0.5;
  // palais de la Ville de Paris : « réminiscence un peu fantaisiste de l'Hôtel de Ville », toiture à girouettes et
  // pignons élancés ; bâti en partie sur une estacade appuyée sur le bas-port, sa façade principale sur la Seine
  { const u0 = 34, u1 = 110, v0 = avant(u0, u1, -14), y = yq(72), top = pavillonStyle(app, B, F, u0, u1, v0, 12, BAS, y + 16, { col: C(232, 222, 200), comble: 6, mat: 'facade', angles: 5, fleche: 40, pignon: 5, vf: v0 });
    poser(u0, u1, v0, 12); const c = F.P(72, (v0 + 12) / 2); M.VilleDeParis = { x: c[0], z: c[1], top: top + 6 }; }
  { const y = yq(165); pavillonStyle(app, B, F, 150, 180, -6, 10, y - 1, y + 8, { col: C(236, 228, 210), comble: 4, toit: TUILE, vf: -6 }); poser(150, 180, -6, 10); }
  // les deux serres de l'Horticulture : un corps de 60,6 m, une galerie de 5,45 m, un pavillon d'extrémité sous un dôme
  // (17,3 m sur 24) ; une nef centrale de 17,5 m en travers ; 21 m au sommet. La plate-forme qui les porte s'avance
  // au-dessus de la berge, sur des piliers.
  const SERRES = [[204, 1], [357, -1]];                                         // [début, côté du dôme : 1 en amont, −1 en aval]
  ensemble(app, yq(320), -2, -1, 24, (bm, bv) => {
    for (const [u0, sd] of SERRES) {
      const y = yq(u0 + 40), v0 = -21, v1 = 12, vm = (v0 + v1) / 2, dome = sd > 0 ? [u0, u0 + 17.3] : [u0 + 66, u0 + 83.3], gal = sd > 0 ? [u0 + 17.3, u0 + 22.75] : [u0 + 60.57, u0 + 66], corps = sd > 0 ? [u0 + 22.75, u0 + 83.3] : [u0, u0 + 60.57], cm = (corps[0] + corps[1]) / 2;
      berceau(bv, F.P, y, corps[0], cm - 8.75, v0, v1, 7, 15, VERRE_CLAIR); berceau(bv, F.P, y, cm + 8.75, corps[1], v0, v1, 7, 15, VERRE_CLAIR);
      berceau(bv, (u, v) => F.P(v, u), y, v0, v1, cm - 8.75, cm + 8.75, 9, 21, VERRE_CLAIR);                                                      // la nef centrale, en travers
      berceau(bv, F.P, y, gal[0], gal[1], vm - 5, vm + 5, 4, 8, VERRE_CLAIR);
      const c = F.P((dome[0] + dome[1]) / 2, vm); cyl(bv, c[0], c[1], 10, y - 0.5, y + 10, { col: VERRE_CLAIR, seg: 20 }); calotte(bv, c[0], c[1], 10, y + 10, y + 21, VERRE_CLAIR);
      for (const v of [v0, v1]) { const a = F.P(corps[0], v), b = F.P(corps[1], v); box(bm, { cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2, ux: F.d[0], uz: F.d[1], hl: (corps[1] - corps[0]) / 2, hw: 0.4 }, y - 1, y + 3, { col: STAFF }); }      // soubassement
    }
    // la plate-forme sur la berge, de l'amont de la première serre à l'aval de la seconde, et ses piliers
    for (let u = 196; u < 448; u += 12) { const y = yq(u), a = F.P(u, -22), b = F.P(Math.min(u + 12, 448), -22), c = F.P(u, -1), d = F.P(Math.min(u + 12, 448), -1);
      bm.quad(a[0], y - 0.2, a[1], b[0], y - 0.2, b[1], d[0], y - 0.2, d[1], c[0], y - 0.2, c[1], 0, 0, 1, 1, STAFF, 0.9, 0.9);
      const p = F.P(u, -20); box(bm, { cx: p[0], cz: p[1], ux: F.d[0], uz: F.d[1], hl: 0.5, hw: 0.5 }, BAS, y - 0.2, { col: STAFF }); }
  });
  for (const [u0] of SERRES) { poser(u0, u0 + 83.3, -22, 12); app.foot.push({ ring: F.rect(u0, u0 + 83.3, -21, 12), top: yq(u0) + 21 }); }
  { const c = F.P(320, -4); M.Serres = { x: c[0], z: c[1], top: yq(320) + 30 }; }
  // palais de la Danse : façade vers la Seine, soubassement à bossages, trois arcatures, un pavillon d'angle ; il donne
  // aussi sur la rue de Paris
  { const u0 = 446, u1 = 476, v0 = avant(u0, u1, -12), y = yq(461), top = pavillonStyle(app, B, F, u0, u1, v0, 30, Math.min(y, BAS + 0.5) - 1, y + 14, { col: C(238, 226, 206), comble: 0, tours: [[0.85, 3.5, 22, 5]], vf: v0 });
    poser(u0, u1, v0, 30); const c = F.P(461, 10); M.PalaisDanse = { x: c[0], z: c[1], top: top + 6 }; }
  // le phare
  { const p = F.P(492, -6), y = yq(492), bs = B.at('stone', p[0], p[1]), bp = B.at('plain', p[0], p[1]);
    cyl(bs, p[0], p[1], 3.2, y - 1, y + 24, { col: C(240, 236, 226), seg: 12, r1: 2.2 }); cyl(bp, p[0], p[1], 2.6, y + 24, y + 25, { col: C(60, 70, 66), seg: 12 });
    cyl(bp, p[0], p[1], 1.8, y + 25, y + 28, { col: C(236, 214, 140), seg: 12 }); cone(bp, p[0], p[1], 2.2, y + 28, y + 30.5, { col: C(60, 70, 66), seg: 12 });
    app.foot.push({ ring: F.rect(488.8, 495.2, -9.2, -2.8), top: y + 30.5 }); app.landmarks.push({ x: p[0], z: p[1], top: y + 30.5 }); poser(488, 496, -10, -2); M.Phare = { x: p[0], z: p[1], top: y + 36 }; }
  // palais des Congrès et de l'Économie sociale (Mewès), de style Louis XVI, deux niveaux ; 100 m sur 33, le
  // soubassement sur la berge
  { const u0 = 510, u1 = 610, v1 = 12, v0 = Math.max(v1 - 33, avant(u0, u1, -21)), y = yq(560), yb = Math.min(y, T.height(...F.P(560, v0 + 1))) - 1, top = pavillonStyle(app, B, F, u0, u1, v0, v1, yb, y + 18, { col: C(234, 226, 208), comble: 0, mat: 'facade', pignon: 5, vf: v0, angles: 3 });
    poser(u0, u1, v0, v1); const c = F.P(560, (v0 + v1) / 2); M.Congres = { x: c[0], z: c[1], top: top + 6 }; }
  rueDeParis(app, B, F);
}

// ---- la rue de Paris : seize établissements d'attractions au second rang, chacun dans son style ; un mur bas et la
// palissade du Cours-la-Reine derrière eux.
function rueDeParis(app, B, F) {
  const T = app.terrain, V = app.v89, M = app.monuments, v0 = 18, v1 = 30, yq = (u) => T.height(...F.P(u, 24));
  for (const [nom, u0, L, s] of RUE_DE_PARIS) {
    const u1 = u0 + L, um = (u0 + u1) / 2, y = yq(um), c = F.P(um, 24), bp = B.at('plain', c[0], c[1]);
    let top = y;
    if (s.kiosque) {                                                    // un jardin clos, un kiosque au milieu
      for (const v of [v0 + 0.5, v1 - 0.5]) { const a = F.P(u0, v), b = F.P(u1, v); box(bp, { cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2, ux: F.d[0], uz: F.d[1], hl: L / 2, hw: 0.3 }, y - 0.5, y + 1.6, { col: STAFF }); }
      cyl(bp, c[0], c[1], 4.5, y - 0.5, y + 1, { col: STAFF, seg: 12 }); for (let k = 0; k < 8; k++) { const a = (k / 8) * 2 * Math.PI; cyl(bp, c[0] + Math.cos(a) * 4, c[1] + Math.sin(a) * 4, 0.12, y + 1, y + 4.5, { col: C(70, 96, 80), seg: 4 }); }
      cone(bp, c[0], c[1], 5.2, y + 4.5, y + 7.5, { col: C(70, 96, 80), seg: 12 }); top = y + 7.5;
      app.foot.push({ ring: F.rect(um - 4.6, um + 4.6, 24 - 4.6, 24 + 4.6), top });
    } else if (s.fuller) {                                              // « une vaste ondulation se soulevant dans l'axe » : la façade de Sauvage
      top = corps(app, B, F, u0, u1, v0 + 2, v1, y - 1, y + 8, { col: C(240, 238, 232), comble: 0 });
      const N = 12, H = (t) => 8 + 8 * Math.pow(Math.sin(Math.PI * t), 2);
      for (let k = 0; k < N; k++) { const ta = k / N, tb = (k + 1) / N, a = F.P(u0 + L * ta, v0 + 1.6), b = F.P(u0 + L * tb, v0 + 1.6);
        pan(bp, [[a[0], y - 0.5, a[1]], [b[0], y - 0.5, b[1]], [b[0], y + H(tb), b[1]], [a[0], y + H(ta), a[1]]], C(246, 244, 238), 0.95, true); }
      top = y + 16;
    } else if (s.envers) {                                              // le Manoir à l'envers, « posé sur sa toiture »
      const Q = (u, v, h) => { const p = F.P(u, v); return [p[0], y + h, p[1]]; }, K = [[u0, v0 + 1], [u1, v0 + 1], [u1, v1 - 1], [u0, v1 - 1]], pt = Q(um, 24, 0);
      for (let i = 0; i < 4; i++) { const p = K[i], q = K[(i + 1) % 4]; pan(bp, [pt, Q(p[0], p[1], 5), Q(q[0], q[1], 5)], ARDOISE, 0.9, true); }
      top = corps(app, B, F, u0, u1, v0 + 1, v1 - 1, y + 5, y + 12, { col: C(214, 196, 166), comble: 0, pied: false });
      for (const u of [u0 + 1.5, u1 - 1.5]) { const p = F.P(u, v0 + 2.5); cyl(B.at('stone', p[0], p[1]), p[0], p[1], 1.6, y + 9, y + 15, { col: C(206, 188, 158), seg: 10 }); }
      app.foot.push({ ring: F.rect(u0, u1, v0 + 1, v1 - 1), top: y + 15 }); top = y + 15;
    } else top = pavillonStyle(app, B, F, u0, u1, v0, v1, y - 1, y + s.h, { ...s, vf: v0 });
    V.reserves.push(boite(F.rect(u0 - 1, u1 + 1, v0 - 1, v1 + 1)));
    M['Rue de Paris ' + nom] = { x: c[0], z: c[1], top: top + 4 };
  }
  // la palissade du Cours-la-Reine, au fond
  for (let u = 20; u < 590; u += 20) { const a = F.P(u, v1 + 1.5), b = F.P(Math.min(u + 20, 590), v1 + 1.5), y = yq(u + 10); box(B.at('plain', a[0], a[1]), { cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2, ux: F.d[0], uz: F.d[1], hl: Math.hypot(b[0] - a[0], b[1] - a[1]) / 2, hw: 0.15 }, y - 0.5, y + 2.6, { col: C(126, 140, 112) }); }
  { const c = F.P(300, 15); M.RueDeParis = { x: c[0], z: c[1], top: yq(300) + 26 }; }
}

// ---- le Vieux Paris d'Albert Robida, sur la berge au pied du quai Debilly : rempart sur l'eau, maisons à pans de bois,
// une porte fortifiée, une église et sa flèche, une tour d'angle. u vers l'aval depuis le pont de l'Alma, v vers le nord.
function vieuxParis(app, B) {
  const T = app.terrain, V = app.v89, M = app.monuments, F = repere([-3540, -1238], [-0.971, 0.239]), r = mulberry(1900);
  const BAS = T.niveauBas ?? 2.1, quai = (u) => T.height(...F.P(u, -5)), sol = (u, v = -20) => (v < -14 ? BAS : Math.max(BAS, Math.min(quai(u), T.height(...F.P(u, v))))) - 0.5;
  const MAISONS = [C(222, 204, 170), C(214, 190, 150), C(230, 214, 184), C(206, 184, 150), C(226, 200, 160)];
  const u0 = 24, u1 = 292;
  for (const vv of [[-24, -15], [-14, -5]]) for (let u = u0; u < u1; ) {
    const L = 6 + r() * 5, y = sol(u, (vv[0] + vv[1]) / 2), h = 9 + r() * 6 + (vv[0] < -20 ? 4 : 0);
    if (!((u > 34 && u < 52) || (u > 180 && u < 206))) corps(app, B, F, u, Math.min(u + L, u1), vv[0], vv[1], y, y + h, { col: MAISONS[Math.floor(r() * MAISONS.length)], comble: 4 + r() * 3, toit: r() < 0.5 ? ARDOISE : TUILE, mat: 'facade' });
    u += L + 0.3;
  }
  // la porte fortifiée (le Grand Châtelet évoqué) et sa tour ronde, l'église et sa flèche, la tour d'angle
  { const c = F.P(43, -15), bs = B.at('stone', c[0], c[1]); box(bs, { cx: c[0], cz: c[1], ux: F.d[0], uz: F.d[1], hl: 9, hw: 9 }, sol(43), sol(43) + 20, { col: PIERRE_GRISE, s0: 0.8 });
    for (const s of [-1, 1]) { const p = F.P(43 + s * 9, -24); cyl(bs, p[0], p[1], 4.5, sol(43), sol(43) + 24, { col: PIERRE_GRISE, seg: 14 }); cone(B.at('plain', p[0], p[1]), p[0], p[1], 5.2, sol(43) + 24, sol(43) + 33, { col: ARDOISE, seg: 14 }); }
    app.landmarks.push({ x: c[0], z: c[1], top: sol(43) + 33 }); }
  { const c = F.P(193, -14), y0 = T.height(c[0], c[1]); corps(app, B, F, 182, 204, -22, -6, sol(193), sol(193) + 16, { col: PIERRE_GRISE, comble: 7 });
    const t = F.P(184, -14); tour(app, B, t[0], t[1], F.d[0], F.d[1], 3.2, sol(193) - y0, sol(193) - y0 + 24, { col: PIERRE_GRISE, baies: sol(193) - y0 + 16, fleche: sol(193) - y0 + 40, toit: ARDOISE }); }
  { const p = F.P(u1 + 4, -16); cyl(B.at('stone', p[0], p[1]), p[0], p[1], 5, sol(u1), sol(u1) + 22, { col: PIERRE_GRISE, seg: 14 }); cone(B.at('plain', p[0], p[1]), p[0], p[1], 5.8, sol(u1) + 22, sol(u1) + 31, { col: ARDOISE, seg: 14 }); }
  // le rempart, au bord de l'eau
  for (let u = u0 - 4; u < u1; u += 12) { const a = F.P(u, -25), b = F.P(Math.min(u + 12, u1), -25); box(B.at('stone', a[0], a[1]), { cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2, ux: F.d[0], uz: F.d[1], hl: Math.hypot(b[0] - a[0], b[1] - a[1]) / 2, hw: 1.2 }, sol(u) - 4, sol(u) + 7, { col: PIERRE_GRISE, s0: 0.78 }); }
  V.reserves.push(boite(F.rect(u0 - 6, u1 + 10, -28, -3))); app.foot.push({ ring: F.rect(u0 - 6, u1 + 10, -28, -4), top: sol(150) + 18 });
  const c = F.P(150, -14); M.VieuxParis = { x: c[0], z: c[1], top: sol(150) + 40 };
}
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- palais des Armées de terre et de mer, sur le quai d'Orsay en aval de l'Alma : un long corps crénelé, des tours ;
// u vers l'aval depuis le quai au droit de l'Alma, v vers la Seine. La passerelle Debilly le relie à la rive droite.
function palaisArmees(app, B, dater = (cle, f) => f(B)) {
  const T = app.terrain, V = app.v89, M = app.monuments, F = repere([-3596, -1024], [-0.933, 0.359]), u0 = 12, u1 = 320, v0 = 8, v1 = 42;
  const yq = (u) => T.height(...F.P(u, 4)), y = yq(160);
  for (let a = u0; a < u1; a += 44) { const b = Math.min(a + 44, u1), yy = yq((a + b) / 2); corps(app, B, F, a, b, v0, v1, yy - 1, yy + 15, { col: C(206, 190, 160), comble: 0, travee: 6 }); }
  for (let a = u0; a < u1; a += 5) for (const v of [v0 + 0.6, v1 - 0.6]) { const p = F.P(a + 1.2, v), yy = yq(a); box(B.at('stone', p[0], p[1]), { cx: p[0], cz: p[1], ux: F.d[0], uz: F.d[1], hl: 1.2, hw: 0.6 }, yy + 15, yy + 16.6, { col: C(206, 190, 160) }); }      // créneaux
  for (const f of [0, 0.5, 1]) { const u = u0 + (u1 - u0) * f, p = F.P(u, (v0 + v1) / 2), y0 = T.height(p[0], p[1]); tour(app, B, p[0], p[1], F.d[0], F.d[1], 7, yq(u) - 1 - y0, yq(u) - y0 + 28, { col: C(200, 184, 154) }); }
  V.reserves.push(boite(F.rect(u0 - 2, u1 + 2, v0 - 2, v1 + 2)));
  { const c = F.P(166, 25); M.Armees = { x: c[0], z: c[1], top: y + 36 }; }
  // passerelle Debilly : du palais à la rive droite, perpendiculaire au fleuve
  { const a = F.P(232, v1 + 2), dir = F.n; let t = 2, eau = false;
    for (; t < 360; t += 2) { const p = [a[0] + dir[0] * t, a[1] + dir[1] * t], w = T.wetAt(p[0], p[1]) > 0.5; if (w) eau = true; else if (eau) break; }
    const b = [a[0] + dir[0] * (t + 10), a[1] + dir[1] * (t + 10)];
    dater('Debilly', (C2) => { M.Debilly = passerelle(app, C2, a, b, { large: 3.6, arc: 15, col: C(64, 88, 78) }); }); }      // montée après le palais (src/p1900/montage.js)
}

// ---- Esplanade des Invalides : deux rangées de palais de part et d'autre de l'allée centrale, coupées par les rues de
// l'Université et Saint-Dominique ; u vers la place des Invalides depuis le quai, v vers l'ouest (rue Fabert). La gare
// des Invalides, à l'angle du quai et de la rue de Constantine, vient des données.
function esplanade(app, B) {
  const T = app.terrain, V = app.v89, M = app.monuments, F = repere([-2668, -1091], [-0.0785, 0.9969]);
  const RANGS = [
    // [u0, u1, v0, v1, nom] : v > 0 côté Fabert, v < 0 côté Constantine
    [42, 190, 42, 112, 'Manufactures nationales'], [110, 190, -112, -42, 'Manufactures nationales'],
    [214, 304, 42, 112, 'Décoration et mobilier'], [214, 304, -112, -42, 'Décoration et mobilier'],
    [330, 440, 42, 112, 'Industries diverses'], [330, 440, -112, -42, 'Industries diverses'],
  ];
  const vus = new Set();
  for (const [u0, u1, v0, v1, nom] of RANGS) {
    const c = F.P((u0 + u1) / 2, (v0 + v1) / 2), y = T.height(c[0], c[1]), vf = v0 > 0 ? v0 : v1;       // façade sur l'allée centrale
    const top = pavillonStyle(app, B, F, u0, u1, Math.min(v0, v1), Math.max(v0, v1), y - 1, y + 19, { col: STAFF, comble: 0, angles: 6, dome: [8, 10, nom === 'Manufactures nationales' ? OR : CUIVRE], vf });
    V.reserves.push(boite(F.rect(u0 - 1, u1 + 1, Math.min(v0, v1) - 1, Math.max(v0, v1) + 1)));
    if (!vus.has(nom)) { vus.add(nom); const p = F.P((u0 + u1) / 2, 0); M['Esplanade ' + nom] = { x: p[0], z: p[1], top: top + 4 }; }
  }
}

// ---- section des colonies et pays de protectorat, dans les jardins du Trocadéro, de part et d'autre de la cascade :
// une douzaine de pavillons aux silhouettes des pays représentés. Emplacements et formes : évocation.
const COLONIES = [
  ['Algérie', { h: 12, col: C(242, 238, 228), dome: [6, 6, C(240, 236, 226)], minaret: 26 }],
  ['Tunisie', { h: 10, col: C(240, 234, 222), dome: [5, 5, C(236, 230, 218)], minaret: 20 }],
  ['Indochine', { pagode: 4, col: C(196, 64, 48), toit: C(70, 90, 70) }],
  ['Cambodge', { tourK: 34, col: C(176, 160, 130) }],
  ['Madagascar', { cases: 4, col: C(168, 138, 100), toit: C(120, 100, 64) }],
  ['Sénégal et Soudan', { h: 9, col: C(196, 150, 104), tours: [[0.2, 2.5, 16, 0], [0.8, 2.5, 16, 0]] }],
  ['Égypte', { h: 12, col: C(218, 196, 152), comble: 0, pignon: 0, tours: [[0.5, 4, 18, 0]] }],
  ['Indes néerlandaises', { h: 8, col: BOIS, comble: 9, toit: C(80, 64, 48) }],
  ['Chine', { pagode: 3, col: C(186, 56, 44), toit: C(60, 110, 90) }],
  ['Japon', { pagode: 2, col: C(150, 100, 70), toit: C(70, 70, 70) }],
  ['Asie russe', { h: 11, col: C(214, 200, 176), dome: [5, 7, OR], tours: [[0.15, 3, 18, 6]] }],
  ['Transvaal', { h: 7, col: C(222, 214, 196), comble: 5, toit: TUILE }],
];
function colonies(app, B) {
  const T = app.terrain, V = app.v89, M = app.monuments, slots = [];
  for (const u of [-420, -377]) for (const v of [-190, -135, -80, 80, 135, 190]) slots.push([u, v]);
  COLONIES.forEach(([nom, s], i) => {
    const [u, v] = slots[i], c = expoXZ(u, v), y = T.height(c[0], c[1]), F = repere(c, [0.715, 0.699]), hw = 11, hv = 9;
    let top;
    if (s.pagode) {                                                      // toits superposés, relevés aux angles
      const bp = B.at('plain', c[0], c[1]); top = corps(app, B, F, -hw * 0.7, hw * 0.7, -hv * 0.7, hv * 0.7, y - 1, y + 6, { col: s.col, comble: 0 });
      for (let k = 0; k < s.pagode; k++) { const r = 10 - k * 2.2, ya = y + 6 + k * 4.2; cone(bp, c[0], c[1], r, ya, ya + 2.6, { col: s.toit, seg: 4, a0: Math.atan2(0.699, 0.715) + Math.PI / 4 }); if (k < s.pagode - 1) box(B.at('stone', c[0], c[1]), { cx: c[0], cz: c[1], ux: 0.715, uz: 0.699, hl: r * 0.45, hw: r * 0.45 }, ya + 2.6, ya + 4.2, { col: s.col }); top = ya + 2.6; }
      cyl(bp, c[0], c[1], 0.3, top, top + 3, { col: OR, seg: 6 }); top += 3; app.foot.push({ ring: F.rect(-hw, hw, -hv, hv), top });
    } else if (s.tourK) {                                                 // tour en ogive, à la façon d'Angkor
      const bs = B.at('stone', c[0], c[1]); box(bs, { cx: c[0], cz: c[1], ux: 0.715, uz: 0.699, hl: hw, hw: hv }, y - 1, y + 8, { col: s.col });
      for (let k = 0; k < 6; k++) { const r = 6 - k * 0.9, ya = y + 8 + k * 4; cyl(bs, c[0], c[1], r, ya, ya + 4, { col: s.col, seg: 8, r1: r * 0.86 }); }
      cone(bs, c[0], c[1], 0.9, y + 32, y + s.tourK, { col: s.col, seg: 8 }); top = y + s.tourK; app.foot.push({ ring: F.rect(-hw, hw, -hv, hv), top });
    } else if (s.cases) {                                                 // cases rondes à toit conique
      top = y;
      for (let k = 0; k < s.cases; k++) { const p = F.P(-6 + (k % 2) * 12, -5 + Math.floor(k / 2) * 10); cyl(B.at('stone', p[0], p[1]), p[0], p[1], 3.6, y - 1, y + 3.5, { col: s.col, seg: 12 }); cone(B.at('plain', p[0], p[1]), p[0], p[1], 4.6, y + 3.5, y + 9, { col: s.toit, seg: 12 }); top = y + 9; }
      app.foot.push({ ring: F.rect(-11, 11, -10, 10), top });
    } else top = pavillonStyle(app, B, F, -hw, hw, -hv, hv, y - 1, y + s.h, { ...s, vf: v > 0 ? -hv : hv });
    V.reserves.push(boite(F.rect(-hw - 2, hw + 2, -hv - 2, hv + 2)));
    app.landmarks.push({ x: c[0], z: c[1], top });
    if (i === 0) M.ColonieAlgerie = { x: c[0], z: c[1], top: top + 6 };
    if (i === 2) M.ColonieIndochine = { x: c[0], z: c[1], top: top + 6 };
  });
  const c = expoXZ(-398, 0); M.Colonies = { x: c[0], z: c[1], top: T.height(c[0], c[1]) + 60 };
}

// ---- trottoir roulant : une boucle sur viaduc, à sept mètres, par la rue Fabert, le quai d'Orsay, l'avenue de La
// Bourdonnais et l'avenue de La Motte-Picquet (points lus dans les rues de la base « Paris 1900 »). Un plancher fixe et
// deux plates-formes mobiles, 3,9 m de large en tout ; des palées d'acier tous les douze mètres.
const BOUCLE = [[-2836, -572], [-2833, -604], [-2824, -699], [-2821, -741], [-2819, -774], [-2809, -904], [-2801, -987], [-2800, -1019], [-2802, -1040],
  [-2889, -1037], [-2946, -1036], [-3043, -1032], [-3101, -1030], [-3183, -1028], [-3247, -1025], [-3468, -1020], [-3545, -1023], [-3596, -1018], [-3654, -1009], [-3732, -985], [-3784, -963], [-3832, -939], [-3874, -911], [-3918, -876], [-3950, -846],
  [-3805, -699], [-3743, -634], [-3635, -532], [-3534, -432], [-3463, -362], [-3422, -323], [-3371, -273], [-3277, -182], [-3250, -158],
  [-3231, -171], [-3126, -272], [-3089, -309], [-3055, -345], [-2921, -482], [-2836, -572]];
function trottoirRoulant(app, B) {
  const T = app.terrain, H = 7, W = 1.95;
  let L = 0;
  const pts = []; for (let i = 0; i + 1 < BOUCLE.length; i++) { const a = BOUCLE[i], b = BOUCLE[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(l / 12)); for (let k = 0; k < n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); L += l; }
  pts.push(pts[0]);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l, nx = -uz * W, nz = ux * W, ya = T.height(a[0], a[1]) + H, yb = T.height(b[0], b[1]) + H, B2 = B.at('plain', a[0], a[1]);
    pan(B2, [[a[0] - nx, ya, a[1] - nz], [b[0] - nx, yb, b[1] - nz], [b[0] + nx, yb, b[1] + nz], [a[0] + nx, ya, a[1] + nz]], C(122, 112, 98), 1, true);       // les plates-formes
    pan(B2, [[a[0] - nx, ya - 0.7, a[1] - nz], [b[0] - nx, yb - 0.7, b[1] - nz], [b[0] - nx, yb, b[1] - nz], [a[0] - nx, ya, a[1] - nz]], ACIER, 0.9, true);       // les longerons
    pan(B2, [[a[0] + nx, ya - 0.7, a[1] + nz], [b[0] + nx, yb - 0.7, b[1] + nz], [b[0] + nx, yb, b[1] + nz], [a[0] + nx, ya, a[1] + nz]], ACIER, 0.9, true);
    for (const s of [-1, 1]) poutre(B2, [a[0] + nx * s, ya + 1.1, a[1] + nz * s], [b[0] + nx * s, yb + 1.1, b[1] + nz * s], 0.05, ACIER);       // garde-corps
    for (const s of [-1, 1]) { const x = a[0] + nx * s * 0.8, z = a[1] + nz * s * 0.8; poutre(B2, [x, T.height(x, z) - 0.5, z], [x, ya - 0.6, z], 0.22, ACIER); }      // la palée
    app.foot.push({ ring: [[a[0] - nx, a[1] - nz], [a[0] + nx, a[1] + nz], [a[0] + nx + ux * 0.6, a[1] + nz + uz * 0.6], [a[0] - nx + ux * 0.6, a[1] - nz + uz * 0.6]], top: ya, fer: true });
  }
  const c = BOUCLE[12]; app.monuments.TrottoirRoulant = { x: c[0], z: c[1], top: T.height(c[0], c[1]) + 16, longueur: Math.round(L) };
}

// dater(cle, f) : bâtit f dans l'ouvrage daté `cle` du montage de l'Exposition (src/p1900/montage.js) ; sans lui, dans B.
export function batirPavillons(app, B, dater = (cle, f) => f(B)) {
  dater('RueDesNations', (C) => rueDesNations(app, C));
  dater('PasserellesNations', (C) => passerellesNations(app, C));
  dater('RiveDroite', (C) => riveDroite(app, C));
  dater('VieuxParis', (C) => vieuxParis(app, C));
  dater('Armees', (C) => palaisArmees(app, C, dater));
  dater('Esplanade', (C) => esplanade(app, C));
  dater('Colonies', (C) => colonies(app, C));
  dater('TrottoirRoulant', (C) => trottoirRoulant(app, C));
}
// les deux passerelles de la rue des Nations : après le pont des Invalides, et près du pont de l'Alma (« en pont de
// bateaux », sur des piles habillées de rochers)
function passerellesNations(app, B) {
  const M = app.monuments;
  M.PasserelleInvalides = passerelle(app, B, [-2917, -1104], [-2916, -1252], { large: 4 });
  M.PasserelleAlma = passerelle(app, B, [-3486, -1086], [-3485, -1236], { large: 4, pile: C(120, 112, 100), bombe: 0.6 });
}
