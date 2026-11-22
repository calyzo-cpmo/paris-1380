// L'Exposition universelle de 1900 (14 avril - 12 novembre) et ce qu'elle laisse à Paris. Ce module remplace celui de
// 1889 (src/p1889/expo.js) dans la page « Paris 1900 » : à l'assemblage, tout import de './expo.js' depuis src/p1889/
// mène ici (tools/build.mjs, surcouche).
//
// Le Champ-de-Mars a été recomposé par Joseph Bouvard : les palais de 1889 sont démolis en 1897-1898, la Galerie des
// machines est gardée (palais de l'Agriculture et des Aliments, salle des fêtes en son centre) et masquée par le palais
// de l'Électricité et son Château d'eau ; six palais en fer à cheval bordent le jardin central (côté Suffren :
// Éducation, Génie civil, Industries chimiques ; côté La Bourdonnais : Mines et métallurgie, Fils et tissus,
// Mécanique). Cotes : rapport général de Picard (1902) et Revue technique de l'Exposition — jardin d'environ 150 m de
// large, palais de l'Électricité de 130 m de façade et 70 m au sommet de la statue, niche du Château d'eau de 30 m,
// deux cheminées de 80 m ; le détail des élévations est une évocation.
// Hors du Champ-de-Mars : la Grande Roue (93 m de diamètre sur un socle de 3 m, quarante voitures), le Grand et le Petit
// Palais (volumes réels, tirés des données ; on leur ajoute la verrière et les dômes), les pylônes du pont Alexandre-III.
// Le reste de l'Exposition — rue des Nations, rive droite, Vieux Paris, palais des Armées, Esplanade des Invalides,
// colonies du Trocadéro, trottoir roulant — est dans src/p1900/pavillons.js.
import { box, cyl, cone, rgb } from '../builder.js';
import { EXPO, expoXZ } from '../p1889/data.js';
import { batirTour } from '../p1889/tour.js';
import { batirMonuments, coupole } from '../p1889/monuments.js';
import { batirGares } from '../p1889/gares.js';
import { batirEdifices } from '../p1889/edifices.js';
import { repere } from '../p1889/corps.js';
import { fill } from '../p1789/outils.js';
import { halle, dome, ensemble, emprise, trocadero, Q, CREME, OCRE, VERRE, VERRE_CLAIR, BLEU, OR, PIERRE } from '../p1889/expo.js';
import { poutre, berceau, calotte } from './outils.js';
import { batirPavillons } from './pavillons.js';
import { batirMetro } from './metro.js';
import { batirPorte, batirJardinsRD } from './porte.js';
import { batirGlobe, batirOptique } from './attractions.js';

const STUC = rgb(236, 228, 208), VERT = rgb(92, 140, 120), ROSE = rgb(212, 164, 140), ACIER = rgb(88, 86, 84), CABINE = rgb(150, 72, 58), BRIQUE = rgb(170, 96, 72), EAU = rgb(178, 206, 222);
const U = EXPO.u, AXE = { ux: U[0], uz: U[1] };
const boite = (ring) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { ring, x0, z0, x1, z1 }; };
const STATIQUE = [-2, -1];                       // dates de chantier passées : ces ouvrages sont achevés (pas de curseur en 1900)

// ---- Champ-de-Mars : six palais en fer à cheval autour du jardin, le palais de l'Électricité au fond
// Repère de l'Exposition (src/p1889/data.js) : u de la tour vers l'École militaire, v vers l'avenue de Suffren ; Q(u, v)
// est centré entre les deux avenues. Les palais vont de u = 160 (à 280 m de la Seine) au palais de l'Électricité.
const PALAIS = [
  // [u0, u1, côté (1 : Suffren, -1 : La Bourdonnais), nom, couleur du dôme]
  [160, 318, 1, 'Palais de l’Éducation et des Lettres, sciences et arts', OR],
  [322, 480, 1, 'Palais du Génie civil et des Transports', BLEU],
  [484, 640, 1, 'Palais des Industries chimiques', VERT],
  [160, 318, -1, 'Palais des Mines et de la Métallurgie', OR],
  [322, 480, -1, 'Palais des Fils, tissus et vêtements', BLEU],
  [484, 640, -1, 'Palais de la Mécanique', VERT],
];
const V_JARDIN = 74, V_FOND = 204;               // façade sur le jardin, fond sur l'avenue

function champDeMars(app, y0) {
  const V = app.v89, M = app.monuments, d = (u, v) => { const p = Q(u, v); return { cx: p[0], cz: p[1], ...AXE }; };
  // les six palais : une halle vitrée, une façade de stuc sur le jardin, un pavillon d'entrée sous un dôme, deux pavillons d'angle
  ensemble(app, y0, ...STATIQUE, 50, (bm, bv) => {
    for (const [u0, u1, s, , col] of PALAIS) {
      const va = s * V_JARDIN, vb = s * V_FOND, um = (u0 + u1) / 2;
      halle(bm, bv, y0, u0 + 2, u1 - 2, Math.min(va, vb), Math.max(va, vb), 15, 25, 'u', CREME, VERRE_CLAIR);
      box(bm, { ...d((u0 + u1) / 2, s * (V_JARDIN + 3)), hl: (u1 - u0) / 2, hw: 3 }, y0 - 1, y0 + 19, { col: STUC, s0: 0.82 });
      box(bm, { ...d(um, s * (V_JARDIN + 9)), hl: 15, hw: 11 }, y0 - 1, y0 + 28, { col: STUC, s0: 0.84 });
      dome(bm, bv, y0, um, s * (V_JARDIN + 9), 10, 30, 13, col);
      for (const ue of [u0 + 9, u1 - 9]) { box(bm, { ...d(ue, s * (V_JARDIN + 7)), hl: 9, hw: 9 }, y0 - 1, y0 + 24, { col: STUC, s0: 0.84 }); const p = Q(ue, s * (V_JARDIN + 7)); cone(bm, p[0], p[1], 9.5, y0 + 24, y0 + 31, { col, seg: 4, a0: Math.atan2(U[1], U[0]) + Math.PI / 4 }); }
    }
  });
  for (const [u0, u1, s, nom] of PALAIS) {
    emprise(app, V, u0, u1, Math.min(s * V_JARDIN, s * V_FOND), Math.max(s * V_JARDIN, s * V_FOND), y0 + 25);
    const p = Q((u0 + u1) / 2, s * (V_JARDIN + 9)); M[nom] = { x: p[0], z: p[1], top: y0 + 52 };
  }
  // palais de l'Électricité : un corps de 130 m de façade, un couronnement ajouré en éventail, le Génie de l'Électricité
  // au sommet (70 m) ; devant, la niche du Château d'eau et sa cascade ; de chaque côté, la cheminée d'une cour des chaudières
  ensemble(app, y0, ...STATIQUE, 70, (bm, bv) => {
    box(bm, { ...d(660, 0), hl: 19, hw: 65 }, y0 - 1, y0 + 30, { col: STUC, s0: 0.82 });
    for (const [ya, yb, hw] of [[30, 38, 46], [38, 46, 35], [46, 53, 24], [53, 59, 14], [59, 63, 6]]) { box(bv, { ...d(652, 0), hl: 3, hw }, y0 + ya, y0 + yb, { col: VERRE_CLAIR, s0: 0.95 }); box(bm, { ...d(658, 0), hl: 6, hw: hw * 0.9 }, y0 + ya, y0 + yb, { col: STUC, s0: 0.9 }); }
    const g = Q(654, 0); cyl(bm, g[0], g[1], 1.6, y0 + 63, y0 + 67, { col: OR, seg: 8 }); cone(bm, g[0], g[1], 2.2, y0 + 67, y0 + 70, { col: OR, seg: 8 });
    for (const s of [-1, 1]) box(bm, { ...d(633, s * 18.5), hl: 7, hw: 3.5 }, y0 - 1, y0 + 33, { col: STUC, s0: 0.84 });                  // piédroits de la niche
    box(bm, { ...d(633, 0), hl: 7, hw: 22 }, y0 + 30, y0 + 35, { col: STUC, s0: 0.92 });
    { const a = Q(640, -15), b = Q(640, 15), c = Q(612, 15), e = Q(612, -15);                                              // la cascade, du haut de la niche au bassin
      bv.quad(a[0], y0 + 29, a[1], b[0], y0 + 29, b[1], c[0], y0 + 0.6, c[1], e[0], y0 + 0.6, e[1], 0, 0, 1, 1, EAU, 1, 1); bv.quad(b[0], y0 + 29, b[1], a[0], y0 + 29, a[1], e[0], y0 + 0.6, e[1], c[0], y0 + 0.6, c[1], 0, 0, 1, 1, EAU, 1, 1); }
    for (const s of [-1, 1]) { const c = Q(668, s * 140); cyl(bm, c[0], c[1], 3.4, y0 - 1, y0 + 80, { col: BRIQUE, seg: 12, r1: 2.5, s0: 0.82 }); }
  });
  emprise(app, V, 641, 679, -65, 65, y0 + 63); emprise(app, V, 626, 641, -22, 22, y0 + 35, false);
  for (const s of [-1, 1]) { const c = Q(668, s * 140); app.landmarks.push({ x: c[0], z: c[1], top: y0 + 80 }); }
  { const c = Q(660, 0); M.Electricite = { x: c[0], z: c[1], top: y0 + 78 }; }
  // Galerie des machines, gardée : palais de l'Agriculture et des Aliments
  ensemble(app, y0, ...STATIQUE, 46, (bm, bv) => {
    halle(bm, bv, y0, 700, 815, -210, 210, 11, 43.5, 'v');
    halle(bm, bv, y0, 678, 700, -210, 210, 12, 15, 'v', CREME, VERRE_CLAIR); halle(bm, bv, y0, 815, 837, -210, 210, 12, 15, 'v', CREME, VERRE_CLAIR);
  });
  emprise(app, V, 678, 837, -210, 210, y0 + 43.5); { const c = Q(757, 120); M.Machines = { x: c[0], z: c[1], top: y0 + 58 }; }
}

// ---- Grande Roue : au coin des avenues de Suffren et de La Motte-Picquet, hors de l'enceinte de l'Exposition. Deux
// jantes de 93 m, quarante voitures, un moyeu porté par deux chevalets. Emplacement et orientation : évocation.
function grandeRoue(app, B) {
  const T = app.terrain, V = app.v89, cu = 800, cv = 335, C = expoXZ(cu, cv), y0 = T.height(C[0], C[1]), R = 46.5, H = y0 + 3 + R, bp = B.at('plain', C[0], C[1]);
  const P = (du, v, y) => { const p = expoXZ(cu + du, cv + v); return [p[0], y, p[1]]; };
  const N = 40, jante = (k) => [Math.sin((k / N) * 2 * Math.PI) * R, H + Math.cos((k / N) * 2 * Math.PI) * R];
  for (const du of [-3.8, 3.8]) {
    for (let k = 0; k < N; k++) { const [va, ya] = jante(k), [vb, yb] = jante(k + 1); poutre(bp, P(du, va, ya), P(du, vb, yb), 0.55, ACIER); poutre(bp, P(du, 0, H), P(du, va, ya), 0.16, ACIER); }
    for (const sv of [-1, 1]) poutre(bp, P(du * 1.9, sv * 30, y0 - 0.5), P(du * 1.2, 0, H), 0.9, ACIER);                           // chevalets
    poutre(bp, P(du * 1.9, -30, y0 + 14), P(du * 1.9, 30, y0 + 14), 0.45, ACIER);
  }
  poutre(bp, P(-8, 0, H), P(8, 0, H), 1.1, ACIER);                                                                          // moyeu
  for (let k = 0; k < N; k++) { const [v, y] = jante(k), c = expoXZ(cu, cv + v); box(bp, { cx: c[0], cz: c[1], ...AXE, hl: 3.2, hw: 1.5 }, y - 3.4, y - 0.8, { col: CABINE, topCol: rgb(70, 66, 62) }); }
  const ring = [expoXZ(cu - 14, cv - 34), expoXZ(cu + 14, cv - 34), expoXZ(cu + 14, cv + 34), expoXZ(cu - 14, cv + 34)];
  V.reserves.push(boite(ring)); app.foot.push({ ring, top: y0 + 6 });
  app.landmarks.push({ x: C[0], z: C[1], top: H + R });
  app.monuments.GrandeRoue = { x: C[0], z: C[1], top: H + R + 8 };
}

// ---- Grand Palais (1897-1900) : la nef de 200 m sur 50 m le long de l'avenue (Winston-Churchill aujourd'hui), le
// transept vers le palais d'Antin, la coupole de verre à 45 m au-dessus de leur croisée, le mât à 60 m. Les corps de
// pierre viennent des données ; la verrière est posée dessus.
function grandPalais(app) {
  const F = repere([-2720, -1454], [0, 1]), y0 = app.terrain.height(-2720, -1454);
  ensemble(app, y0, ...STATIQUE, 60, (bm, bv) => {
    berceau(bv, F.P, y0, -100, 100, -26, 26, 26.5, 35);
    berceau(bv, (u, v) => F.P(v, u), y0, 26, 106, -26, 26, 26.5, 35);                                 // transept : u et v échangés
    calotte(bv, -2720, -1454, 25, y0 + 33, y0 + 45);
    cyl(bm, -2720, -1454, 2.4, y0 + 44.5, y0 + 49, { col: OR, seg: 8 }); box(bm, { cx: -2720, cz: -1454, ux: 1, uz: 0, hl: 0.2, hw: 0.2 }, y0 + 49, y0 + 60, { col: rgb(60, 60, 60) });
  });
  app.landmarks.push({ x: -2720, z: -1454, top: y0 + 60 });
  app.monuments.GrandPalais = { x: -2720, z: -1454, top: y0 + 64 };
}
// ---- Petit Palais (Charles Girault, 1897-1900) : le dôme du porche d'entrée, face au Grand Palais. Évocation.
function petitPalais(app, B) {
  const x = -2592, z = -1442, top = coupole(app, B, x, z, 8.5, 15, 21, 31, 33.5, 36, rgb(196, 190, 176), { pierre: STUC, fleche: OR });
  app.monuments.PetitPalais = { x: -2556, z: -1440, top: top + 4 };
}
// ---- pont Alexandre-III : quatre pylônes de 17 m aux têtes du pont, couronnés de groupes dorés (Renommées et Pégase)
function pylones(app, B) {
  const a = [-2667, -1109], b = [-2655, -1257], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = -dz, nz = dx;
  for (const [e, sg] of [[a, -1], [b, 1]]) for (const s of [-1, 1]) {
    const x = e[0] + dx * sg * 10 + nx * s * 24, z = e[1] + dz * sg * 10 + nz * s * 24, y0 = app.terrain.height(x, z), bs = B.at('stone', x, z), bp = B.at('plain', x, z);
    box(bs, { cx: x, cz: z, ux: dx, uz: dz, hl: 3.6, hw: 3.6 }, y0 - 1, y0 + 5, { col: PIERRE, s0: 0.84 });
    box(bs, { cx: x, cz: z, ux: dx, uz: dz, hl: 2.4, hw: 2.4 }, y0 + 5, y0 + 17, { col: PIERRE, s0: 0.88 });
    cyl(bp, x, z, 1.8, y0 + 17, y0 + 19.5, { col: OR, seg: 8 }); cone(bp, x, z, 1.4, y0 + 19.5, y0 + 23, { col: OR, seg: 6 });
    app.foot.push({ ring: [[x - 3.6, z - 3.6], [x + 3.6, z - 3.6], [x + 3.6, z + 3.6], [x - 3.6, z + 3.6]], top: y0 + 23 });
    app.landmarks.push({ x, z, top: y0 + 23 });
  }
  app.monuments.AlexandreIII = { x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, top: app.terrain.height(a[0], a[1]) + 30 };
}

// Sol du Champ-de-Mars : sable des allées, pelouses du jardin central et des abords de la tour, bassin du Château d'eau.
const rect = (u0, u1, v0, v1) => [[Q(u0, v0), Q(u1, v0), Q(u1, v1), Q(u0, v1)]];
export function peindreExpo(x, Tr) {
  fill(x, Tr, [rect(EXPO.u0, EXPO.u1, EXPO.v0 - EXPO.vc, EXPO.v1 - EXPO.vc)], '#d2c8ab');
  for (const s of [-1, 1]) { fill(x, Tr, [rect(170, 545, s > 0 ? 12 : -62, s > 0 ? 62 : -12)], '#8fae6c'); fill(x, Tr, [rect(-60, 140, s > 0 ? 70 : -200, s > 0 ? 200 : -70)], '#93b070'); }
  fill(x, Tr, [rect(560, 626, -44, 44)], '#6f95a8');
  for (const [u, r] of [[250, 14], [400, 14]]) { const c = Q(u, 0); x.fillStyle = '#6f95a8'; x.beginPath(); x.arc(Tr.x(c[0]), Tr.y(c[1]), r * Tr.s, 0, 7); x.fill(); x.strokeStyle = '#e4dcc6'; x.lineWidth = Math.max(1, 2.4 * Tr.s); x.stroke(); }
}
export const ESPLANADES = () => [rect(EXPO.u0, EXPO.u1, EXPO.v0 - EXPO.vc, EXPO.v1 - EXPO.vc)];
export function jardinsExpo(a) { for (const s of [-1, 1]) { a.gardens.push({ ring: rect(170, 545, s > 0 ? 64 : -72, s > 0 ? 72 : -64)[0], dens: 0.6 }); a.gardens.push({ ring: rect(-60, 140, s > 0 ? 80 : -190, s > 0 ? 190 : -80)[0], dens: 0.3 }); } }

export async function batirExpo(app, B) {
  const T = app.terrain, V = app.v89, O = EXPO.tour, y0 = T.height(O[0], O[1]), M = app.monuments;
  V.mobiles = [];
  batirTour(app);                                  // la tour, achevée ; repeinte en 1899 (src/p1889/tour.js)
  trocadero(app, B);
  batirMonuments(app, B);
  batirEdifices(app, B);
  batirGares(app, B);
  champDeMars(app, y0);
  grandeRoue(app, B);
  grandPalais(app);
  petitPalais(app, B);
  pylones(app, B);
  batirPavillons(app, B);
  batirMetro(app, B);
  batirPorte(app, B);
  batirJardinsRD(app, B);
  batirGlobe(app, B);
  batirOptique(app, B);
  // deux gares neuves, que les données donnent entières : leur nom seulement
  for (const [cle, x, z, h] of [['GareOrsay', -1696, -791, 30], ['GareInvalides', -2581, -1011, 16]]) M[cle] = { x, z, top: T.height(x, z) + h + 10 };

  // repères de l'Exposition
  const L = (V.lieux = []);
  L.push(['Tour de 300 mètres', 'expo', 'La tour de Gustave Eiffel, onze ans après son achèvement, reste le plus haut édifice du monde. Repeinte en 1899 en cinq teintes dégradées, du jaune orangé à la base au jaune clair au sommet, elle se dresse à l’entrée de l’Exposition, entourée de jardins. Sa forme est une évocation à partir de ses cotes.', M.Tour, 1]);
  L.push(['Palais de l’Électricité', 'expo', 'Au fond du Champ-de-Mars, le palais d’Eugène Hénard : une façade de 130 mètres, couronnée d’une crête ajourée où brillent le soir des milliers de lampes, et au sommet, à 70 mètres, le Génie de l’Électricité sur son char. Devant lui, le Château d’eau d’Edmond Paulin : une cascade de trente mètres tombe d’une niche dans un bassin. Il masque la Galerie des machines ; deux cheminées de 80 mètres, de part et d’autre, signalent les chaudières qui produisent le courant de l’Exposition. L’élévation est une évocation.', M.Electricite, 1]);
  L.push(['Galerie des machines', 'expo', 'La nef de 1889 — 420 mètres de long, 115 mètres de portée sans appui — est gardée : elle abrite en 1900 le palais de l’Agriculture et des Aliments, et en son centre une salle des fêtes circulaire de quinze mille places. Elle sera démolie en 1910. Son élévation est une évocation.', M.Machines]);
  for (const [, , , nom] of PALAIS) L.push([nom, 'expo', 'L’un des six palais qui bordent le jardin central du Champ-de-Mars, dessinés pour l’Exposition de 1900 et démolis à sa clôture : de vastes halles de fer et de verre derrière des façades de staff blanc, ornées de dômes. Leur emplacement suit le plan de l’Exposition ; leur élévation est une évocation.', M[nom]]);
  L.push(['Grande Roue', 'expo', 'Bâtie vers 1898 au coin des avenues de Suffren et de La Motte-Picquet : 93 mètres de diamètre sur un socle de trois mètres, quarante voitures de trente places. Elle tournera jusqu’en 1920 et sera démontée en 1922. Son emplacement exact et son orientation sont une évocation.', M.GrandeRoue, 1]);
  L.push(['Grand Palais', 'expo', 'Bâti de 1897 à 1900, en partie sur le site du palais de l’Industrie, pour les Beaux-Arts de l’Exposition, ouvert en mai : une nef de 200 mètres sous une verrière de fer, une coupole à 45 mètres. Les corps de pierre viennent des données ; la verrière et la coupole sont une évocation.', M.GrandPalais, 1]);
  L.push(['Petit Palais', 'expo', 'Le palais de Charles Girault (1897-1900), face au Grand Palais, présente l’exposition rétrospective de l’art français ; il deviendra le musée des Beaux-Arts de la Ville de Paris. Son volume vient des données ; le dôme de l’entrée est une évocation.', M.PetitPalais]);
  L.push(['Pont Alexandre-III', 'expo', 'Une seule arche d’acier de 107 mètres, entre les Invalides et les deux palais : la première pierre a été posée le 7 octobre 1896 par le tsar Nicolas II, le pont est inauguré avec l’Exposition le 14 avril 1900. Aux quatre coins, des pylônes de 17 mètres portent des Renommées dorées. Les pylônes sont une évocation.', M.AlexandreIII, 1]);
  L.push(['Palais du Trocadéro', 'expo', 'Bâti pour l’Exposition de 1878 par Davioud et Bourdais : une rotonde, deux tours de 80 mètres et deux ailes courbes. Ses jardins accueillent en 1900 la section des colonies. Il sera remplacé en 1937 par le palais de Chaillot. Sa forme est une évocation.', M.Trocadero, 1]);
  const EV = ' Son emplacement suit le plan de l’Exposition ; ses dimensions et sa silhouette sont une évocation.';
  L.push(['Rue des Nations', 'expo', 'Sur le quai d’Orsay, du pont des Invalides au pont de l’Alma, les pavillons des puissances étrangères en double rangée : la première au bord de la Seine, en partie sur une plate-forme qui prolonge le quai au-dessus des berges, la seconde dans les allées du quai. Chaque nation y bâtit dans son style : palais vénitien de l’Italie, manoir anglais de Kingston House, hôtel de ville d’Audenarde pour la Belgique, hôtel rhénan pour l’Allemagne. Sous chaque pavillon, au niveau des berges, des cafés et des restaurants de toutes les nations. Deux passerelles relient la rue à la rive droite. L’ordre des pavillons est celui de la Revue technique de l’Exposition ; leurs dimensions et leurs silhouettes sont une évocation.', M.RueDesNations, 1]);
  L.push(['Pavillon de l’Italie', 'expo', 'Le premier de la rue des Nations depuis les Invalides, et l’un des plus beaux : un grand monument dans le style du XVe siècle, ses dômes et ses rosaces.' + EV, M['Nation Italie']]);
  L.push(['Pavillon des États-Unis', 'expo', 'Un palais d’allure classique sous un dôme, entre ceux de la Turquie et du Portugal.' + EV, M['Nation États-Unis']]);
  L.push(['Pavillon de la Grande-Bretagne', 'expo', 'Un vieux manoir anglais, Kingston House, reconstitué au bord de la Seine ; derrière lui, le pavillon de la Perse.' + EV, M['Nation Grande-Bretagne']]);
  L.push(['Pavillon de la Belgique', 'expo', 'La reconstitution de l’hôtel de ville d’Audenarde, chef-d’œuvre de l’art ogival flamand, son beffroi et ses clochetons.' + EV, M['Nation Belgique']]);
  L.push(['Pavillon de l’Allemagne', 'expo', 'Un hôtel de riche bourgeois des bords du Rhin, dans le style gothique germanique, sous un haut clocher.' + EV, M['Nation Allemagne']]);
  L.push(['Palais de la Ville de Paris', 'expo', 'Le premier de la rive droite en aval du pont des Invalides, tout contre la passerelle : une réminiscence un peu fantaisiste de l’Hôtel de Ville, sa toiture à girouettes et ses pignons élancés. Bâti en partie sur une estacade appuyée sur le bas-port, il présente sa façade principale à la Seine.' + EV, M.VilleDeParis]);
  L.push(['Serres de l’Horticulture', 'expo', 'Deux grandes serres de fer et de verre, longues chacune de 83 mètres, larges de 33, hautes de 21 : un corps sous une nef transversale, un pavillon d’extrémité sous un dôme. Entre elles, un jardin de 70 mètres et, dessous, l’Aquarium ; elles reposent sur une plate-forme de ciment armé qui s’avance au-dessus de la berge. Cotes : rapport de Picard ; la silhouette est une évocation.', M.Serres, 1]);
  L.push(['Palais des Congrès', 'expo', 'Le palais des Congrès et de l’Économie sociale, de René Mewès, aux lignes sobres de style Louis XVI, immédiatement en amont du pont de l’Alma : cent mètres le long de la Seine, deux niveaux, le soubassement sur la berge.' + EV, M.Congres]);
  L.push(['Palais de la Danse', 'expo', 'Entre les serres et le palais des Congrès, une façade sur la Seine — soubassement à bossages, trois arcatures, un pavillon d’angle — et une autre sur la rue de Paris. Un phare se dresse à côté, au bord du quai.' + EV, M.PalaisDanse]);
  L.push(['Rue de Paris', 'expo', 'Derrière le premier rang de la rive droite, le long de la palissade du Cours-la-Reine, une allée de seize établissements d’attractions, d’amont en aval : un restaurant, la Maison du rire, le Phono-cinéma-théâtre, le Théâtroscope, les Tableaux vivants, le Jardin de la chanson, la Roulotte, un kiosque à musique, le Grand Guignol, les Bonshommes Guillaume, le théâtre des Auteurs gais, le palais de la Danse, le théâtre de Loïe Fuller, le Manoir à l’envers, la poste et un restaurant. L’ordre et les surfaces sont ceux du rapport de Picard ; les façades sont une évocation de leurs styles.', M.RueDeParis, 1]);
  L.push(['Théâtre de Loïe Fuller', 'expo', 'Le petit théâtre de la danseuse américaine, par Henri Sauvage, sur la rue de Paris : sa façade de staff blanc est « tout entière une vaste ondulation se soulevant dans l’axe », comme les voiles de ses danses. À côté, le Manoir à l’envers, posé sur sa toiture.' + EV, M['Rue de Paris Théâtre de Loïe Fuller']]);
  L.push(['Porte monumentale', 'expo', 'L’entrée principale de l’Exposition, par René Binet, engagée dans le Cours-la-Reine à l’angle de la place de la Concorde : trois arcatures en triangle sous une coupole surbaissée, un arc frontal qui porte la statue de la Ville de Paris — la « Parisienne » de Moreau-Vauthier, la tête à 45 mètres —, deux exèdres ornées de la frise des ouvriers et deux minarets de 42 mètres ; bleu, vert et blanc, des milliers de cabochons éclairés le soir. Derrière, trente-deux guichets en hémicycle ; huit millions six cent mille visiteurs l’ont franchie. Cotes : rapport de Picard ; le détail est une évocation.', M.PorteMonumentale, 1]);
  L.push(['Jardins du Cours-la-Reine', 'expo', 'De la porte monumentale au pont des Invalides, les jardins de l’Exposition se prolongent sur le Cours-la-Reine et le quai de la Conférence : un immense parterre de fleurs, de beaux arbres et des statues, « parsemés de serres ». Sur la berge basse, les arbres fruitiers. Les serres figurées et leur place sont une évocation.', M.JardinsCoursLaReine]);
  L.push(['Globe céleste', 'expo', 'De l’autre côté de l’avenue de Suffren, au bord du quai d’Orsay, la sphère de l’architecte Albert Galeron : environ 45 mètres de diamètre, peinte en bleu, ses constellations en or, sur un soubassement de ciment armé à trois étages ; quatre figures colossales portent les grosses planètes. À l’intérieur, on contemple le ciel tournant. La passerelle qui l’unissait à l’Exposition s’est effondrée le 29 avril 1900 : elle a été refaite en bois. Son emplacement exact et l’inclinaison de l’équateur sont une évocation.', M.Globe, 1]);
  L.push(['Palais de l’Optique', 'expo', 'Contre l’avenue de Suffren, en face de la tour : un porche couronné des signes du zodiaque, une colonnade en demi-cercle sous une demi-coupole, une coupole qui porte à 42 mètres un projecteur. Dans une galerie orientée suivant le méridien, la Grande Lunette — un tube de 60 mètres, des objectifs de 1,25 mètre — reçoit la lumière d’un sidérostat et projette la Lune devant deux mille spectateurs. Le plan est une évocation.', M.Optique]);
  L.push(['Vieux Paris', 'expo', 'Sur la berge de la rive droite, en aval du pont de l’Alma, la reconstitution des vieux édifices les plus célèbres de Paris au Moyen Âge, imaginée par Albert Robida : rues étroites, maisons à pans de bois, portes fortifiées, église. Les édifices figurés ici sont une évocation de l’ensemble.', M.VieuxParis, 1]);
  L.push(['Palais des Armées de terre et de mer', 'expo', 'Sur le quai d’Orsay, entre le pont de l’Alma et le Champ-de-Mars, le palais des armées et de la marine, à la manière d’une forteresse.' + EV, M.Armees]);
  L.push(['Passerelle Debilly', 'expo', 'Une passerelle métallique bâtie pour l’Exposition entre le palais des Armées et la rive droite : une grande arche porte le tablier par des aiguilles, comme un pont suspendu. Elle existe toujours, déplacée un peu en aval en 1906. Sa forme est une évocation.', M.Debilly]);
  L.push(['Esplanade des Invalides', 'expo', 'De part et d’autre de l’allée centrale, qui découvre le dôme : le palais des Manufactures nationales, côté Seine, puis ceux de la Décoration et du Mobilier et des Industries diverses jusqu’à la rue de Grenelle. À l’angle du quai, la gare des Invalides.' + EV, M['Esplanade Manufactures nationales'], 1]);
  L.push(['Section des colonies', 'expo', 'Dans les jardins du Trocadéro, de part et d’autre de la cascade, les pavillons des colonies françaises et des pays de protectorat, et ceux de pays lointains, chacun dans le style de son pays. Leur disposition et leurs formes sont une évocation.', M.Colonies, 1]);
  L.push(['Palais de l’Algérie', 'expo', 'Le plus vaste de la section des colonies, au Trocadéro, sous une coupole et un minaret.' + EV, M.ColonieAlgerie]);
  L.push(['Pavillon de l’Indochine', 'expo', 'Une pagode aux toits superposés, dans la section des colonies, au Trocadéro.' + EV, M.ColonieIndochine]);
  if (M.Metro) L.push(['Métropolitain, ligne 1', 'enceinte', 'Le 19 juillet 1900, la Compagnie du chemin de fer métropolitain ouvre sa première ligne, de la porte de Vincennes à la porte Maillot, sous le boulevard Diderot, la rue de Rivoli et les Champs-Élysées : huit stations ce jour-là, les dix autres avant le 1er septembre. Les entrées sont d’Hector Guimard ; cet été-là, elles n’ont encore que leur balustrade de fonte autour de l’escalier. Les candélabres, les cartouches « Métropolitain » et les édicules couverts viendront à partir de la fin de l’année ; les pavillons de la Bastille et de l’Étoile sont en chantier. Une entrée est figurée par station, au carrefour qui lui donne son nom ; leur emplacement exact est une évocation.', M.Metro]);
  L.push(['Trottoir roulant', 'expo', `La « rue de l’Avenir » : une boucle de 3 370 mètres sur viaduc, à sept mètres de haut, par la rue Fabert, le quai d’Orsay, l’avenue de La Bourdonnais et l’avenue de La Motte-Picquet. Un plancher fixe et deux plates-formes qui avancent, l’une à 4 km/h, l’autre au double ; neuf stations. Le tracé suit les rues ; les palées sont de convention.`, M.TrottoirRoulant, 1]);
}
