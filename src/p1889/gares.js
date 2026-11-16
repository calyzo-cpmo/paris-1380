// Les gares de Paris en 1889 : six têtes de grandes lignes, les gares de la Bastille et de Sceaux, et la gare bâtie
// au Champ-de-Mars pour l'Exposition.
// Chaque gare est posée au bout de ses voies : son repère a pour origine le milieu de la ligne des butoirs et pour axe
// le sens des voies (u vers la ligne, v en travers). Pour les gares encore debout (Nord, Est, Saint-Lazare, Orléans),
// origine et axe sont lus dans les voies d'aujourd'hui ; l'ancienne gare Montparnasse occupe son îlot de 1900, entre la
// rue de l'Arrivée et la rue du Départ ; la gare de la Bastille longe la rue de Lyon ; l'embarcadère de Lyon de 1855
// est placé en tête des voies actuelles. Les dimensions des halles sont celles que donnent les descriptions du temps
// (Nord : 72 m de portée ; Orléans : 280 m sur 51 m ; Lyon : 220 m sur 42 m) ; le reste — nombre de travées, hauteurs,
// pavillons — est une évocation.
import { cyl, cone, ccw, rgb } from '../builder.js';
import { facade } from '../p1789/blocks.js';

const PIERRE = rgb(228, 217, 194), PIERRE_SOMBRE = rgb(206, 196, 174), BRIQUE = rgb(186, 112, 88), ZINC = rgb(150, 158, 164), VERRE = rgb(172, 194, 202), VERRE_CLAIR = rgb(194, 210, 216), ARDOISE = rgb(84, 92, 106), DALLE = rgb(150, 144, 130);

// Repère d'une gare : O milieu des butoirs, d sens des voies. P(u, v) rend le point du plan, rect un rectangle.
function repere(O, d) {
  const l = Math.hypot(d[0], d[1]), dx = d[0] / l, dz = d[1] / l, nx = -dz, nz = dx;
  const P = (u, v) => [O[0] + dx * u + nx * v, O[1] + dz * u + nz * v];
  return { O, d: [dx, dz], n: [nx, nz], P, rect: (u0, u1, v0, v1) => ccw([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]) };
}
const boite = (ring) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { ring, x0, z0, x1, z1 }; };
// Pan quelconque (trois ou quatre points [x, y, z]), tourné vers le ciel ; deux : visible aussi du dessous.
function pan(b, pts, col, s = 1, deux = false) {
  const [a, c, d] = pts, ny = (c[2] - a[2]) * (d[0] - a[0]) - (c[0] - a[0]) * (d[2] - a[2]), q = ny >= 0 ? pts : pts.slice().reverse();
  const poser = (r) => { if (r.length === 4) b.quad(r[0][0], r[0][1], r[0][2], r[1][0], r[1][1], r[1][2], r[2][0], r[2][1], r[2][2], r[3][0], r[3][1], r[3][2], 0, 0, 1, 1, col, s, s); else b.tri(r[0][0], r[0][1], r[0][2], r[1][0], r[1][1], r[1][2], r[2][0], r[2][1], r[2][2], 0, 0, 1, 0, 0.5, 1, col, s, s, s); };
  poser(q); if (deux) poser(q.slice().reverse());
}
// Mur de P à Q, de y0 à y1, tourné vers (nx, nz) ; u : nombre de motifs de la texture sur sa longueur.
function mur(b, P, Q, y0, y1, nx, nz, col, u, s0 = 0.84, s1 = 1) {
  let a = P, c = Q; if (-(c[1] - a[1]) * nx + (c[0] - a[0]) * nz < 0) { a = Q; c = P; }
  b.quad(a[0], y0, a[1], c[0], y0, c[1], c[0], y1, c[1], a[0], y1, a[1], 0, 0, u, 1, col, s0, s1);
}

// Corps de bâtiment sur le rectangle [u0, u1] × [v0, v1], de ya à yb : murs à hautes baies cintrées, comble à croupes
// (o.comble : sa hauteur) ou terrasse. o.mat : 'nef' (baies sur toute la hauteur) ou 'facade' (étages).
function corps(app, B, F, u0, u1, v0, v1, ya, yb, o = {}) {
  const r = F.rect(u0, u1, v0, v1), c = F.P((u0 + u1) / 2, (v0 + v1) / 2), col = o.col || PIERRE, bp = B.at('plain', c[0], c[1]);
  if (o.mat === 'facade') facade(B.at('facade', c[0], c[1]), r, false, ya, yb, 0, Math.max(1, Math.round((yb - ya) / 3.05)) / 2, col, 0, 0.8, 1);
  else facade(B.at('nef', c[0], c[1]), r, false, ya, yb, 0, 1, col, 0, 0.84, 1, o.travee || 6);
  const h = o.comble || 0, toit = o.toit || ARDOISE, lu = Math.abs(u1 - u0), lv = Math.abs(v1 - v0), k = Math.min(lu, lv) / 2, um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
  const Q = (u, v, y) => { const p = F.P(u, v); return [p[0], y, p[1]]; }, ua = Math.min(u0, u1), ub = Math.max(u0, u1), va = Math.min(v0, v1), vb = Math.max(v0, v1);
  if (!h) pan(bp, [Q(ua, va, yb), Q(ub, va, yb), Q(ub, vb, yb), Q(ua, vb, yb)], o.toit || ZINC);
  else if (lu >= lv) {                                                  // faîte selon u
    pan(bp, [Q(ua, va, yb), Q(ub, va, yb), Q(ub - k, vm, yb + h), Q(ua + k, vm, yb + h)], toit, 0.95); pan(bp, [Q(ua, vb, yb), Q(ub, vb, yb), Q(ub - k, vm, yb + h), Q(ua + k, vm, yb + h)], toit, 1.05);
    pan(bp, [Q(ua, va, yb), Q(ua, vb, yb), Q(ua + k, vm, yb + h)], toit, 0.9); pan(bp, [Q(ub, va, yb), Q(ub, vb, yb), Q(ub - k, vm, yb + h)], toit, 1);
  } else {                                                              // faîte selon v
    pan(bp, [Q(ua, va, yb), Q(ua, vb, yb), Q(um, vb - k, yb + h), Q(um, va + k, yb + h)], toit, 0.95); pan(bp, [Q(ub, va, yb), Q(ub, vb, yb), Q(um, vb - k, yb + h), Q(um, va + k, yb + h)], toit, 1.05);
    pan(bp, [Q(ua, va, yb), Q(ub, va, yb), Q(um, va + k, yb + h)], toit, 0.9); pan(bp, [Q(ua, vb, yb), Q(ub, vb, yb), Q(um, vb - k, yb + h)], toit, 1);
  }
  if (o.pied !== false) app.foot.push({ ring: r, top: yb + h });
  return yb + h;
}
// Pavillon : un corps carré plus haut que ses voisins, coiffé d'un comble en pavillon.
const pavillon = (app, B, F, u, v, hu, hv, ya, yb, o = {}) => corps(app, B, F, u - hu, u + hu, v - hv, v + hv, ya, yb, { comble: o.comble ?? Math.min(hu, hv) * 0.7, travee: o.travee || 5, ...o });

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
// Fronton d'un pavillon central : un pignon de pierre au-dessus de la façade (u = uf), et le toit à deux versants
// qui le prolonge jusqu'à ub.
function fronton(B, F, uf, ub, v0, v1, ya, yb, col = PIERRE) {
  const vm = (v0 + v1) / 2, c = F.P(uf, vm), Q = (u, v, y) => { const p = F.P(u, v); return [p[0], y, p[1]]; }, bs = B.at('stone', c[0], c[1]), bp = B.at('plain', c[0], c[1]);
  for (const u of [uf, ub]) { const a = Q(u, v0, ya), b = Q(u, v1, ya), t = Q(u, vm, yb); bs.tri(a[0], a[1], a[2], b[0], b[1], b[2], t[0], t[1], t[2], 0, 0, 2, 0, 1, 1, col, 0.9, 0.9, 1); bs.tri(b[0], b[1], b[2], a[0], a[1], a[2], t[0], t[1], t[2], 2, 0, 0, 0, 1, 1, col, 0.9, 0.9, 1); }
  pan(bp, [Q(uf, v0, ya), Q(ub, v0, ya), Q(ub, vm, yb), Q(uf, vm, yb)], ZINC, 0.95); pan(bp, [Q(uf, v1, ya), Q(ub, v1, ya), Q(ub, vm, yb), Q(uf, vm, yb)], ZINC, 1.05);
}

export function batirGares(app, B) {
  const V = app.v89, M = app.monuments, T = app.terrain;
  // cle : nom dans app.monuments ; O, d : repère ; res : rectangle réservé [u0, u1, v0, v1], ou plusieurs (les bâtiments
  // des données qui s'y trouvent sont écartés) ; rep : point (u, v) où poser l'étiquette ; dessin(F, y0) rend la cote du sommet.
  const gare = (cle, O, d, res, rep, dessin) => {
    const F = repere(O, d), y0 = T.height(O[0], O[1]);
    for (const r of Array.isArray(res[0]) ? res : [res]) V.reserves.push(boite(F.rect(r[0], r[1], r[2], r[3])));
    const top = dessin(F, y0), p = F.P(rep[0], rep[1]);
    M[cle] = { x: p[0], z: p[1], top: top + 8, axe: F.d, butoirs: O };
  };

  // ---- gare du Nord (Hittorff, 1861-1865) : façade de 180 m, pignon central entre deux pavillons, trois nefs
  gare('GareNord', [343, -3023.5], [0.296, -0.955], [-48, 190, -100, 100], [-18, 0], (F, y0) => {
    for (const [v0, v1, yf] of [[-72, -36, 21], [-36, 36, 31], [36, 72, 21]]) nef(app, B, F, 0, 180, v0, v1, y0 - 0.5, y0 + 14, y0 + yf, { murs: [v0 === -72, v1 === 72] });
    corps(app, B, F, -34, 0, -88, 88, y0 - 1, y0 + 17, { comble: 4, travee: 7 });
    corps(app, B, F, -37, 2, -36, 36, y0 - 1, y0 + 27, { travee: 8, toit: ZINC }); fronton(B, F, -37, 2, -36, 36, y0 + 27, y0 + 38);
    for (const s of [-1, 1]) pavillon(app, B, F, -17, s * 76, 19, 12, y0 - 1, y0 + 23);
    return y0 + 38;
  });
  // ---- gare de l'Est (embarcadère de Strasbourg, 1849) : en 1889 la seule moitié ouest de la gare d'aujourd'hui —
  // une halle de trente-six mètres entre deux bâtiments, un pignon à demi-rose, une cour entre deux ailes
  gare('GareEst', [664, -2667], [0.367, -0.93], [-82, 160, -112, 112], [-30, -50], (F, y0) => {
    nef(app, B, F, 0, 150, -68, -32, y0 - 0.5, y0 + 13, y0 + 24);
    corps(app, B, F, 0, 120, -90, -68, y0 - 1, y0 + 13, { comble: 3 }); corps(app, B, F, 0, 120, -32, -10, y0 - 1, y0 + 13, { comble: 3 });
    corps(app, B, F, -30, 0, -100, 0, y0 - 1, y0 + 15, { comble: 3.5 });
    corps(app, B, F, -33, 2, -70, -30, y0 - 1, y0 + 21, { travee: 8, toit: ZINC }); fronton(B, F, -33, 2, -70, -30, y0 + 21, y0 + 28.5);
    corps(app, B, F, -72, -30, -100, -84, y0 - 1, y0 + 13, { comble: 3 }); corps(app, B, F, -72, -30, -16, 0, y0 - 1, y0 + 13, { comble: 3 });
    return y0 + 28.5;
  });
  // ---- gare Saint-Lazare (rebâtie par Juste Lisch, 1885-1889) : la longue façade de la rue Saint-Lazare et ses trois
  // pavillons, quatre nefs, et devant elle l'hôtel Terminus, entre la cour de Rome et la cour du Havre
  gare('GareLazare', [-1820, -2605], [0.081, -0.997], [[-104, 180, -118, 118], [-104, -28, -150, -118]], [-15, 0], (F, y0) => {
    for (const v0 of [-88, -44, 0, 44]) nef(app, B, F, 0, 170, v0, v0 + 44, y0 - 0.5, y0 + 13, y0 + 24, { murs: [v0 === -88, v0 === 44] });
    corps(app, B, F, -28, 0, -110, 110, y0 - 1, y0 + 19, { comble: 4, travee: 6.5 });
    pavillon(app, B, F, -15, 0, 16, 20, y0 - 1, y0 + 26, { comble: 7 });
    for (const s of [-1, 1]) pavillon(app, B, F, -15, s * 99, 16, 12, y0 - 1, y0 + 25, { comble: 6 });
    corps(app, B, F, -96, -58, -52, 52, y0 - 1, y0 + 24, { mat: 'facade', comble: 4.5 });
    return y0 + 33;
  });
  // ---- embarcadère de Lyon (Cendrier, 1855) : une halle de 220 m sur 42 m entre le bâtiment du départ et celui de
  // l'arrivée ; la gare actuelle le remplacera en 1900
  gare('GareLyon', [1694, 918], [0.766, 0.643], [-110, 230, -90, 90], [-13, 0], (F, y0) => {
    nef(app, B, F, 0, 220, -21, 21, y0 - 0.5, y0 + 11, y0 + 21);
    for (const s of [-1, 1]) corps(app, B, F, 0, 150, s * 21, s * 36, y0 - 1, y0 + 11, { comble: 3 });
    corps(app, B, F, -24, 0, -46, 46, y0 - 1, y0 + 14, { comble: 3.5 });
    pavillon(app, B, F, -13, 0, 13, 12, y0 - 1, y0 + 21, { comble: 6 });
    return y0 + 27;
  });
  // ---- gare d'Orléans (Renaud, 1862-1867) : la grande halle de 280 m sur 51 m, les bâtiments du départ (côté Seine) et
  // de l'arrivée, l'administration face à la place Valhubert
  gare('GareOrleans', [1130, 1075], [0.423, 0.906], [-44, 290, -72, 72], [-18, 0], (F, y0) => {
    nef(app, B, F, 0, 280, -25.6, 25.6, y0 - 0.5, y0 + 14, y0 + 28);
    for (const s of [-1, 1]) { corps(app, B, F, 15, 255, s * 25.6, s * 44, y0 - 1, y0 + 13, { comble: 3.5 }); pavillon(app, B, F, 135, s * 46, 22, 9, y0 - 1, y0 + 19, { comble: 5 }); }
    corps(app, B, F, -32, 0, -58, 58, y0 - 1, y0 + 17, { comble: 4 });
    pavillon(app, B, F, -18, 0, 15, 14, y0 - 1, y0 + 24, { comble: 6 });
    return y0 + 30;
  });
  // ---- gare Montparnasse (gare de l'Ouest rive gauche, Lenoir, 1852) : les voies arrivent à l'étage, sur un
  // soubassement à arcades ; deux pavillons encadrent le pignon vitré tourné vers la place de Rennes
  gare('GareMontparnasse', [-1966.5, 1043.9], [-0.6143, 0.7891], [-46, 196, -58, 58], [-30, 0], (F, y0) => {
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
  gare('GareBastille', [1402, 95], [0.378, 0.926], [-52, 200, -26, 26], [-27, 0], (F, y0) => {
    const E = 8;
    corps(app, B, F, -8, 190, -17, 17, y0 - 1, y0 + E, { col: PIERRE_SOMBRE, toit: DALLE, travee: 8 });
    nef(app, B, F, -4, 186, -15, 15, y0 + E, y0 + E + 6.5, y0 + E + 12, { pied: false });
    corps(app, B, F, -46, -8, -22, 22, y0 - 1, y0 + 17, { comble: 4 });
    pavillon(app, B, F, -27, 0, 12, 10, y0 - 1, y0 + 22, { comble: 5 });
    return y0 + 27;
  });
  // ---- gare de Sceaux (embarcadère de 1846, place Denfert-Rochereau) : un bâtiment en arc de cercle, qui épousait la
  // boucle où tournaient les trains ; ici un corps bas, sa rotonde et une marquise sur les voies
  gare('GareSceaux', [-1240, 2168], [0.162, 0.987], [-32, 80, -36, 36], [-13, 0], (F, y0) => {
    corps(app, B, F, -20, -6, -27, 27, y0 - 1, y0 + 9.5, { comble: 3 });
    const c = F.P(-13, 0); cyl(B.at('stone', c[0], c[1]), c[0], c[1], 10, y0 - 1, y0 + 12, { col: PIERRE, seg: 16, s0: 0.84 }); cone(B.at('plain', c[0], c[1]), c[0], c[1], 10.6, y0 + 12, y0 + 15.5, { col: ARDOISE, seg: 16 });
    nef(app, B, F, -2, 66, -9, 9, y0 + 5, y0 + 5, y0 + 8, { pied: false });
    return y0 + 15.5;
  });
  // ---- gare du Champ-de-Mars (Juste Lisch, 1889) : fer, brique et faïence, sur la berge, à l'angle du quai d'Orsay et
  // de l'avenue de Suffren ; démontée en 1897, elle sera remontée à Asnières
  gare('GareChampDeMars', [-4368, -458], [-0.332, 0.943], [0, 84, -26, 12], [42, -15], (F, y0) => {
    corps(app, B, F, 12, 72, -21, -9, y0 - 1, y0 + 8, { col: BRIQUE, comble: 2.6, toit: ZINC, travee: 5 });
    pavillon(app, B, F, 42, -15, 9, 7.5, y0 - 1, y0 + 12, { col: BRIQUE, comble: 4, toit: ZINC });
    nef(app, B, F, 6, 78, -8.5, 8.5, y0 + 5, y0 + 5, y0 + 7.6, { pied: false });
    return y0 + 16;
  });
}
