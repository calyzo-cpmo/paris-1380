// Les gares de Paris en 1889 : six têtes de grandes lignes, les gares de la Bastille et de Sceaux, et la gare bâtie
// au Champ-de-Mars pour l'Exposition de 1878. En 1900, celle-ci a été démontée (1897) ; la gare de Lyon de Marius
// Toudoire a remplacé l'embarcadère de 1855 ; les gares d'Orsay et des Invalides sont neuves. Ces trois-là sont encore
// debout : leurs bâtiments viennent des données (tools/extract_1889.py les date d'après leur histoire) ; on leur ajoute
// la tour de l'horloge de la gare de Lyon et, à la place de son grand hall, deux nefs vitrées.
// Chaque gare est posée au bout de ses voies : son repère a pour origine le milieu de la ligne des butoirs et pour axe
// le sens des voies (u vers la ligne, v en travers). Pour les gares encore debout (Nord, Est, Saint-Lazare, Orléans),
// origine et axe sont lus dans les voies d'aujourd'hui ; l'ancienne gare Montparnasse occupe son îlot de 1900, entre la
// rue de l'Arrivée et la rue du Départ ; la gare de la Bastille longe la rue de Lyon ; l'embarcadère de Lyon de 1855
// est placé en tête des voies actuelles. Les dimensions des halles sont celles que donnent les descriptions du temps
// (Nord : 72 m de portée ; Orléans : 280 m sur 51 m ; Lyon : 220 m sur 42 m) ; le reste — nombre de travées, hauteurs,
// pavillons — est une évocation.
import { box, cyl, cone, rgb } from '../builder.js';
import { ANNEE } from './data.js';
import { repere, boite, pan, mur, corps, pavillon, fronton, PIERRE, PIERRE_SOMBRE, BRIQUE, ZINC, VERRE, VERRE_CLAIR, ARDOISE, DALLE } from './corps.js';


// Nef d'une halle : deux versants vitrés entre v0 et v1, faîte selon u, de yb (sol) à ym (sablière) et yf (faîte).
// o.murs : [côté v0, côté v1] — murs gouttereaux à arcades ; les deux pignons sont vitrés au-dessus de la sablière, le
// bout de la halle reste ouvert sur les voies.
function nef(app, B, F, u0, u1, v0, v1, yb, ym, yf, o = {}) {
  const vm = (v0 + v1) / 2, c = F.P((u0 + u1) / 2, vm), bp = B.at('plain', c[0], c[1]), Q = (u, v, y) => { const p = F.P(u, v); return [p[0], y, p[1]]; };
  // versants : une bande de zinc au faîte et à l'égout, le verre entre les deux
  for (const [va, sh] of [[v0, 0.95], [v1, 1.05]]) {
    const w = (f) => va + (vm - va) * f, y = (f) => ym + (yf - ym) * f;
    pan(bp, [Q(u0, w(0), y(0)), Q(u1, w(0), y(0)), Q(u1, w(0.12), y(0.12)), Q(u0, w(0.12), y(0.12))], ZINC, sh, true);
    pan(bp, [Q(u0, w(0.12), y(0.12)), Q(u1, w(0.12), y(0.12)), Q(u1, w(0.88), y(0.88)), Q(u0, w(0.88), y(0.88))], o.verre || VERRE, sh, true);
    pan(bp, [Q(u0, w(0.88), y(0.88)), Q(u1, w(0.88), y(0.88)), Q(u1, w(1), y(1)), Q(u0, w(1), y(1))], ZINC, sh, true);
  }
  for (const u of [u0, u1]) pan(bp, [Q(u, v0, ym), Q(u, v1, ym), Q(u, vm, yf)], VERRE_CLAIR, 0.96, true);      // pignons vitrés
  const L = Math.abs(u1 - u0), murs = o.murs || [true, true];
  if (ym - yb > 0.5) [[v0, -1], [v1, 1]].forEach(([v, sg], k) => { if (!murs[k]) return; const a = F.P(u0, v), b = F.P(u1, v), s = v0 < v1 ? sg : -sg;
    mur(B.at('nef', c[0], c[1]), a, b, yb, ym, F.n[0] * s, F.n[1] * s, o.col || PIERRE, Math.max(1, Math.round(L / 6)) * 0.25); mur(B.at('stone', c[0], c[1]), a, b, yb, ym, -F.n[0] * s, -F.n[1] * s, o.col || PIERRE, L * 0.2, 0.6, 0.8); });
  if (o.pied !== false) app.foot.push({ ring: F.rect(u0, u1, v0, v1), top: yf });
  return yf;
}
export function batirGares(app, B) {
  const V = app.v89, M = app.monuments, T = app.terrain;
  // cle : nom dans app.monuments ; O, d : repère ; res : rectangle réservé [u0, u1, v0, v1], ou plusieurs (les bâtiments
  // des données qui s'y trouvent sont écartés) ; rep : point (u, v) où poser l'étiquette ; dessin(F, y0, B) bâtit la gare dans B et rend la cote du sommet.
  // Page « Paris 1900 » (V.montage, src/p1900/montage.js) : une gare datée est bâtie dans son ouvrage, qui suit la date
  // du curseur ; une gare démolie avant l'été 1900 ne réserve rien, la ville de 1900 garde sa place.
  const gare = (cle, O, d, res, rep, dessin) => {
    const F = repere(O, d), y0 = T.height(O[0], O[1]), q = V.montage ? V.montage.quand(cle) : null;
    if (!q || !q.demoli) for (const r of Array.isArray(res[0]) ? res : [res]) V.reserves.push(boite(F.rect(r[0], r[1], r[2], r[3])));
    const poser = (B) => { const top = dessin(F, y0, B), p = F.P(rep[0], rep[1]); M[cle] = { x: p[0], z: p[1], top: top + 8, axe: F.d, butoirs: O }; };
    if (q) V.montage.ouvrage(q, poser); else poser(B);
  };

  // ---- gare du Nord (Hittorff, 1861-1865) : façade de 180 m, pignon central entre deux pavillons, trois nefs
  gare('GareNord', [343, -3023.5], [0.296, -0.955], [-48, 190, -100, 100], [-18, 0], (F, y0, B) => {
    for (const [v0, v1, yf] of [[-72, -36, 21], [-36, 36, 31], [36, 72, 21]]) nef(app, B, F, 0, 180, v0, v1, y0 - 0.5, y0 + 14, y0 + yf, { murs: [v0 === -72, v1 === 72] });
    corps(app, B, F, -34, 0, -88, 88, y0 - 1, y0 + 17, { comble: 4, travee: 7 });
    corps(app, B, F, -37, 2, -36, 36, y0 - 1, y0 + 27, { travee: 8, toit: ZINC }); fronton(B, F, -37, 2, -36, 36, y0 + 27, y0 + 38);
    for (const s of [-1, 1]) pavillon(app, B, F, -17, s * 76, 19, 12, y0 - 1, y0 + 23);
    return y0 + 38;
  });
  // ---- gare de l'Est (embarcadère de Strasbourg, 1849) : en 1889 et en 1900 la seule moitié ouest de la gare
  // d'aujourd'hui — une halle de trente-six mètres entre deux bâtiments, un pignon à demi-rose, une cour entre deux
  // ailes. Doublée de 1928 à 1931 par une moitié est qui la répète (page « Paris 1937 ») : la même, en miroir (s = 1).
  gare('GareEst', [664, -2667], [0.367, -0.93], [-82, 160, -112, 112], [-30, ANNEE >= 1931 ? 0 : -50], (F, y0, B) => {
    for (const s of ANNEE >= 1931 ? [-1, 1] : [-1]) {
      const V2 = (a, b) => (s < 0 ? [a, b] : [-b, -a]), n = (u0, u1, a, b, ...r) => nef(app, B, F, u0, u1, ...V2(a, b), ...r), c = (u0, u1, a, b, ...r) => corps(app, B, F, u0, u1, ...V2(a, b), ...r);
      n(0, 150, -68, -32, y0 - 0.5, y0 + 13, y0 + 24);
      c(0, 120, -90, -68, y0 - 1, y0 + 13, { comble: 3 }); c(0, 120, -32, -10, y0 - 1, y0 + 13, { comble: 3 });
      c(-30, 0, -100, 0, y0 - 1, y0 + 15, { comble: 3.5 });
      c(-33, 2, -70, -30, y0 - 1, y0 + 21, { travee: 8, toit: ZINC }); fronton(B, F, -33, 2, ...V2(-70, -30), y0 + 21, y0 + 28.5);
      c(-72, -30, -100, -84, y0 - 1, y0 + 13, { comble: 3 }); c(-72, -30, -16, 0, y0 - 1, y0 + 13, { comble: 3 });
    }
    return y0 + 28.5;
  });
  // ---- gare Saint-Lazare (rebâtie par Juste Lisch, 1885-1889) : la longue façade de la rue Saint-Lazare et ses trois
  // pavillons, quatre nefs, et devant elle l'hôtel Terminus, entre la cour de Rome et la cour du Havre
  gare('GareLazare', [-1820, -2605], [0.081, -0.997], [[-104, 180, -118, 118], [-104, -28, -150, -118]], [-15, 0], (F, y0, B) => {
    for (const v0 of [-88, -44, 0, 44]) nef(app, B, F, 0, 170, v0, v0 + 44, y0 - 0.5, y0 + 13, y0 + 24, { murs: [v0 === -88, v0 === 44] });
    corps(app, B, F, -28, 0, -110, 110, y0 - 1, y0 + 19, { comble: 4, travee: 6.5 });
    pavillon(app, B, F, -15, 0, 16, 20, y0 - 1, y0 + 26, { comble: 7 });
    for (const s of [-1, 1]) pavillon(app, B, F, -15, s * 99, 16, 12, y0 - 1, y0 + 25, { comble: 6 });
    corps(app, B, F, -96, -58, -52, 52, y0 - 1, y0 + 24, { mat: 'facade', comble: 4.5 });
    return y0 + 33;
  });
  // ---- gare de Lyon de 1900 (Toudoire, 1895-1902) : le bâtiment de tête et l'aile du boulevard Diderot viennent des
  // données ; sur le pan coupé de leur angle, la tour de l'horloge (67 m : un fût de 8,50 m de côté, le cube de
  // l'horloge de 10 m, quatre cadrans de 6,40 m) ; derrière, deux nefs vitrées à la place du grand hall, que les données rendent en bloc
  if (ANNEE >= 1900) gare('GareLyon', [1694, 918], [0.766, 0.643], [-30, 170, -48, 52], [-40, 0], (F, y0, B) => {
    for (const v0 of [-48, -6]) nef(app, B, F, -30, 150, v0, v0 + 42, y0 - 0.5, y0 + 12, y0 + 25, { murs: [v0 === -48, v0 === -6] });
    const c = F.P(-51, -64), bs = B.at('stone', c[0], c[1]), bp = B.at('plain', c[0], c[1]), d = { cx: c[0], cz: c[1], ux: F.d[0], uz: F.d[1] }, yt = T.height(c[0], c[1]);
    box(bs, { ...d, hl: 4.25, hw: 4.25 }, yt - 1, yt + 48, { col: PIERRE, s0: 0.82 });
    box(bs, { ...d, hl: 5, hw: 5 }, yt + 48, yt + 58, { col: PIERRE, s0: 0.92 });
    for (const [a, b] of [[F.d, F.n], [F.n, F.d]]) for (const s of [-1, 1]) {                                     // quatre cadrans, un par face
      const ox = c[0] + a[0] * s * 5.06, oz = c[1] + a[1] * s * 5.06, h = 3.2, bx = b[0] * h * s, bz = b[1] * h * s;
      pan(bp, [[ox - bx, yt + 49.8, oz - bz], [ox + bx, yt + 49.8, oz + bz], [ox + bx, yt + 56.2, oz + bz], [ox - bx, yt + 56.2, oz - bz]], rgb(236, 230, 210), 1, true);
    }
    cone(bp, c[0], c[1], 7.4, yt + 58, yt + 63.5, { col: ARDOISE, seg: 4, a0: Math.atan2(F.d[1], F.d[0]) + Math.PI / 4 });
    cyl(bp, c[0], c[1], 0.9, yt + 63.5, yt + 65.5, { col: rgb(200, 170, 96), seg: 8 }); cone(bp, c[0], c[1], 0.7, yt + 65.5, yt + 67, { col: rgb(200, 170, 96), seg: 8 });
    app.foot.push({ ring: F.rect(-55.25, -46.75, -68.25, -59.75), top: yt + 67 }); app.landmarks.push({ x: c[0], z: c[1], top: yt + 67 });
    M.HorlogeLyon = { x: c[0], z: c[1], top: yt + 75 };
    return y0 + 30;
  });
  // ---- embarcadère de Lyon (Cendrier, 1855) : une halle de 220 m sur 42 m entre le bâtiment du départ et celui de
  // l'arrivée ; la gare actuelle le remplacera en 1900 (le curseur de la page « Paris 1900 » le montre jusque-là)
  if (ANNEE < 1900 || V.montage) gare(ANNEE < 1900 ? 'GareLyon' : 'EmbarcadereLyon', [1694, 918], [0.766, 0.643], [-110, 230, -90, 90], [-13, 0], (F, y0, B) => {
    nef(app, B, F, 0, 220, -21, 21, y0 - 0.5, y0 + 11, y0 + 21);
    for (const s of [-1, 1]) corps(app, B, F, 0, 150, s * 21, s * 36, y0 - 1, y0 + 11, { comble: 3 });
    corps(app, B, F, -24, 0, -46, 46, y0 - 1, y0 + 14, { comble: 3.5 });
    pavillon(app, B, F, -13, 0, 13, 12, y0 - 1, y0 + 21, { comble: 6 });
    return y0 + 27;
  });
  // ---- gare d'Orléans (Renaud, 1862-1867) : la grande halle de 280 m sur 51 m, les bâtiments du départ (côté Seine) et
  // de l'arrivée, l'administration face à la place Valhubert
  gare('GareOrleans', [1130, 1075], [0.423, 0.906], [-44, 290, -72, 72], [-18, 0], (F, y0, B) => {
    nef(app, B, F, 0, 280, -25.6, 25.6, y0 - 0.5, y0 + 14, y0 + 28);
    for (const s of [-1, 1]) { corps(app, B, F, 15, 255, s * 25.6, s * 44, y0 - 1, y0 + 13, { comble: 3.5 }); pavillon(app, B, F, 135, s * 46, 22, 9, y0 - 1, y0 + 19, { comble: 5 }); }
    corps(app, B, F, -32, 0, -58, 58, y0 - 1, y0 + 17, { comble: 4 });
    pavillon(app, B, F, -18, 0, 15, 14, y0 - 1, y0 + 24, { comble: 6 });
    return y0 + 30;
  });
  // ---- gare Montparnasse (gare de l'Ouest rive gauche, Lenoir, 1852) : les voies arrivent à l'étage, sur un
  // soubassement à arcades ; deux pavillons encadrent le pignon vitré tourné vers la place de Rennes
  gare('GareMontparnasse', [-1966.5, 1043.9], [-0.6143, 0.7891], [-46, 196, -58, 58], [-30, 0], (F, y0, B) => {
    const E = 5.5;
    corps(app, B, F, -40, 188, -50, 50, y0 - 1, y0 + E, { col: PIERRE_SOMBRE, toit: DALLE, travee: 6 });
    for (const v0 of [-36, 0]) nef(app, B, F, 0, 150, v0, v0 + 36, y0 + E, y0 + E + 9.5, y0 + E + 17, { murs: [v0 === -36, v0 === 0], pied: false });
    for (const s of [-1, 1]) corps(app, B, F, -40, 0, s * 14, s * 48, y0 + E, y0 + 21, { comble: 5, pied: false });
    { const a = F.P(-34, -14), b = F.P(-34, 14); mur(B.at('nef', a[0], a[1]), a, b, y0 + E, y0 + 17, -F.d[0], -F.d[1], VERRE_CLAIR, 1); }
    fronton(B, F, -34, 0, -14, 14, y0 + 17, y0 + 23);
    return y0 + 26;
  });
  // ---- gare de la Bastille (ligne de Vincennes, 1859) : le bâtiment des voyageurs sur la place, la halle à l'étage, au
  // niveau du viaduc, le long de la rue de Lyon
  gare('GareBastille', [1402, 95], [0.378, 0.926], [-52, 200, -26, 26], [-27, 0], (F, y0, B) => {
    const E = 8;
    corps(app, B, F, -8, 190, -17, 17, y0 - 1, y0 + E, { col: PIERRE_SOMBRE, toit: DALLE, travee: 8 });
    nef(app, B, F, -4, 186, -15, 15, y0 + E, y0 + E + 6.5, y0 + E + 12, { pied: false });
    corps(app, B, F, -46, -8, -22, 22, y0 - 1, y0 + 17, { comble: 4 });
    pavillon(app, B, F, -27, 0, 12, 10, y0 - 1, y0 + 22, { comble: 5 });
    return y0 + 27;
  });
  // ---- gare de Sceaux (embarcadère de 1846, place Denfert-Rochereau) : un bâtiment en arc de cercle, qui épousait la
  // boucle où tournaient les trains ; ici un corps bas, sa rotonde et une marquise sur les voies
  gare('GareSceaux', [-1240, 2168], [0.162, 0.987], [-32, 80, -36, 36], [-13, 0], (F, y0, B) => {
    corps(app, B, F, -20, -6, -27, 27, y0 - 1, y0 + 9.5, { comble: 3 });
    const c = F.P(-13, 0); cyl(B.at('stone', c[0], c[1]), c[0], c[1], 10, y0 - 1, y0 + 12, { col: PIERRE, seg: 16, s0: 0.84 }); cone(B.at('plain', c[0], c[1]), c[0], c[1], 10.6, y0 + 12, y0 + 15.5, { col: ARDOISE, seg: 16 });
    nef(app, B, F, -2, 66, -9, 9, y0 + 5, y0 + 5, y0 + 8, { pied: false });
    return y0 + 15.5;
  });
  // ---- gare du Champ-de-Mars (Juste Lisch, 1878) : fer, brique et faïence, sur la berge, à l'angle du quai d'Orsay et
  // de l'avenue de Suffren ; démontée en 1897, elle sera remontée à Asnières
  if (ANNEE < 1897 || V.montage) gare('GareChampDeMars', [-4368, -458], [-0.332, 0.943], [0, 84, -26, 12], [42, -15], (F, y0, B) => {
    corps(app, B, F, 12, 72, -21, -9, y0 - 1, y0 + 8, { col: BRIQUE, comble: 2.6, toit: ZINC, travee: 5 });
    pavillon(app, B, F, 42, -15, 9, 7.5, y0 - 1, y0 + 12, { col: BRIQUE, comble: 4, toit: ZINC });
    nef(app, B, F, 6, 78, -8.5, 8.5, y0 + 5, y0 + 5, y0 + 7.6, { pied: false });
    return y0 + 16;
  });
}
