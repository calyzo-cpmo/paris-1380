// Le Métropolitain à l'été 1900 : la ligne 1, de la porte de Vincennes à la porte Maillot, sous le cours de Vincennes,
// le boulevard Diderot, la rue de Lyon, la place de la Bastille, la rue Saint-Antoine, la rue de Rivoli, les
// Champs-Élysées et l'avenue de la Grande-Armée ; ouverte le 19 juillet avec huit stations, les dix autres avant le
// 1er septembre (Picard, t. 6). Le métro est souterrain : on n'en voit que les entrées d'Hector Guimard, et, cet été-là,
// seulement leurs balustrades de fonte — les candélabres, les cartouches « Métropolitain » et les édicules viennent
// ensuite, de la fin de 1900 à 1902 ; les pavillons de la Bastille et de l'Étoile sont en chantier. Chaque station
// reçoit ici une entrée, posée d'après les rues et les îlots de la base « Paris 1900 » : au carrefour qui donne son nom
// à la station, quelques mètres plus loin sur la rue que suit la ligne, au milieu du trottoir. La trémie a 3 m de large,
// la balustrade un peu plus d'un mètre ; la longueur est de convention. Combien d'accès avait chaque station, et où
// exactement, n'est pas figuré : une entrée par station.
import { rgb } from '../builder.js';
import { rues, ilots } from '../p1889/data.js';
import { trottoir } from '../p1889/sol.js';
import { pan } from '../p1889/corps.js';
import { pointInPoly } from '../geom.js';
import { poutre } from './outils.js';

const FONTE = rgb(62, 96, 78), TREMIE = rgb(46, 42, 38);

// [nom de 1900, nom d'aujourd'hui, rue que suit la ligne, rue ou place du carrefour, recul (m) le long de la rue].
// La porte Maillot n'a pas de carrefour : l'entrée est au bout de l'avenue, vers l'enceinte.
export const STATIONS = [
  ['Porte de Vincennes', '', 'Cours de Vincennes', 'Boulevard Soult', 30],
  ['Nation', '', 'Place de la Nation', 'Boulevard Diderot', 30],
  ['Reuilly', 'Reuilly-Diderot', 'Boulevard Diderot', 'Rue de Reuilly', 25],
  ['Gare de Lyon', '', 'Boulevard Diderot', 'Rue de Lyon', 25],
  ['Bastille', '', 'Place de la Bastille', 'Rue Saint-Antoine', 30],
  ['Saint-Paul', 'Saint-Paul', 'Rue Saint-Antoine', 'Rue Saint-Paul', 25],
  ['Hôtel de Ville', '', 'Rue de Rivoli', 'Rue de Lobau', 25],
  ['Châtelet', '', 'Rue de Rivoli', 'Boulevard de Sébastopol', 25],
  ['Louvre', 'Louvre-Rivoli', 'Rue de Rivoli', 'Rue du Louvre', 25],
  ['Palais-Royal', 'Palais-Royal–Musée du Louvre', 'Rue de Rivoli', 'Place du Palais Royal', 25],
  ['Tuileries', '', 'Rue de Rivoli', 'Rue de Castiglione', 25],
  ['Concorde', '', 'Rue de Rivoli', 'Place de la Concorde', 25],
  ['Champs-Élysées', 'Champs-Élysées–Clemenceau', 'Avenue des Champs Élysées', 'Avenue de Marigny', 25],
  ['Marbeuf', 'Franklin-D.-Roosevelt', 'Avenue des Champs Élysées', 'Rue Marbeuf', 25],
  ['Alma', 'George-V', 'Avenue des Champs Élysées', 'Avenue de l’Alma', 25],
  ['Étoile', 'Charles-de-Gaulle–Étoile', 'Place de l’Étoile', 'Avenue des Champs Élysées', 30],
  ['Obligado', 'Argentine', 'Avenue de la Grande Armée', 'Rue d’Obligado', 25],
  ['Porte Maillot', '', 'Avenue de la Grande Armée', null, 30],
];
const NOM = (s) => s.replace(/’/g, "'");                   // la base écrit les apostrophes droites

// tronçons d'une rue de la base, par son nom
function troncons(nom) { const s = []; for (const r of rues()) if (r.nom === NOM(nom)) for (let k = 0; k + 1 < r.pts.length; k++) s.push([r.pts[k], r.pts[k + 1]]); return s; }
const proj = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1))); return [a[0] + dx * t, a[1] + dz * t]; };
// carrefour de deux rues : le point de la première le plus proche de la seconde, et la direction de la première là
function carrefour(A, B) {
  const sa = troncons(A), sb = troncons(B); if (!sa.length || !sb.length) return null; let m = null;
  for (const [a, b] of sa) for (const [c, d] of sb) for (const p of [c, d]) { const q = proj(p, a, b), dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (!m || dd < m.d) m = { d: dd, p: q, a, b }; }
  for (const [a, b] of sa) for (const [c, d] of sb) for (const p of [a, b]) { const q = proj(p, c, d), dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < m.d) m = { d: dd, p, a, b }; }
  const l = Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]) || 1; return { p: m.p, dir: [(m.b[0] - m.a[0]) / l, (m.b[1] - m.a[1]) / l] };
}

// Les entrées : leur emplacement d'après les rues et les îlots, puis la balustrade.
export function batirMetro(app, B) {
  const T = app.terrain, M = app.monuments, IL = ilots().map((i) => { const r = i.rings[0]; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { r, x0, z0, x1, z1 }; });
  const ilotEn = (x, z) => IL.some((i) => x >= i.x0 && x <= i.x1 && z >= i.z0 && z <= i.z1 && pointInPoly(x, z, i.r));
  const front = (x, z, nx, nz) => { for (let k = 0; k <= 60; k += 0.5) if (ilotEn(x + nx * k, z + nz * k)) return k; return Infinity; };      // distance au front des îlots
  // carrefour de chaque station ; la direction de la rue est tournée vers la station suivante, vers la porte Maillot
  const C = STATIONS.map(([, , A, Bn]) => {
    if (Bn) return carrefour(A, Bn);
    const s = troncons(A); if (!s.length) return null; let p = s[0][0]; for (const [a, b] of s) for (const q of [a, b]) if (q[0] < p[0]) p = q; return { p, dir: [1, 0] };        // bout ouest de l'avenue
  });
  const entrees = [];
  STATIONS.forEach(([nom, auj, , , recul], i) => {
    const c = C[i]; if (!c) return;
    const vise = (C[i + 1] || C[i - 1]).p;                     // la porte Maillot, au bout de la ligne : vers la station d'avant
    let [ux, uz] = c.dir; if ((vise[0] - c.p[0]) * ux + (vise[1] - c.p[1]) * uz < 0) { ux = -ux; uz = -uz; }
    const o = [c.p[0] + ux * recul, c.p[1] + uz * recul], nx = -uz, nz = ux;
    // le trottoir le plus proche, d'un côté ou de l'autre ; sur une place ouverte, au bord de la chaussée
    let best = null;
    for (const s of [1, -1]) { const k = front(o[0], o[1], nx * s, nz * s); if (k >= 5 && k < 60 && (!best || k < best.k)) best = { k, s }; }
    const k = best ? best.k : 14, s = best ? best.s : 1, d = k - Math.max(1.9, Math.min(trottoir(k) / 2, 3.2));
    const x = o[0] + nx * s * d, z = o[1] + nz * s * d;
    if (T.wetAt(x, z) > 0.05) return;
    const top = entourage(app, B, x, z, ux, uz);
    entrees.push({ nom, auj, x: +x.toFixed(1), z: +z.toFixed(1), top, rue: STATIONS[i][2] });
  });
  if (!entrees.length) return;
  const c = entrees.find((e) => e.nom === 'Concorde') || entrees[0];
  M.Metro = { x: c.x, z: c.z, top: c.top + 16, entrees };
}

// Entourage : balustrade de fonte autour de la trémie (6 m sur 3), ouverte sur le petit côté où descend l'escalier.
function entourage(app, B, x, z, ux, uz) {
  const y0 = app.terrain.height(x, z), bp = B.at('plain', x, z), nx = -uz, nz = ux, L = 3, W = 1.5, H = 1.2;
  const P = (u, v, y) => [x + ux * u + nx * v, y0 + y, z + uz * u + nz * v], R = (u, v) => [x + ux * u + nx * v, z + uz * u + nz * v];
  pan(bp, [P(-L, -W, 0.06), P(L, -W, 0.06), P(L, W, 0.06), P(-L, W, 0.06)], TREMIE, 1);                                // la trémie, vue d'en haut
  // la balustrade ajourée, sur trois côtés : main courante, lisse basse, barreaux tous les cinquante centimètres
  const cote = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(l / 0.5));
    for (const y of [0.15, H]) poutre(bp, P(a[0], a[1], y), P(b[0], b[1], y), y === H ? 0.05 : 0.035, FONTE);
    for (let k = 0; k <= n; k++) { const u = a[0] + ((b[0] - a[0]) * k) / n, v = a[1] + ((b[1] - a[1]) * k) / n; poutre(bp, P(u, v, 0), P(u, v, H), k % n ? 0.018 : 0.05, FONTE); } };
  cote([L, -W], [-L, -W]); cote([-L, -W], [-L, W]); cote([-L, W], [L, W]);
  app.foot.push({ ring: [R(-L - 2, -W - 2.4), R(L + 2, -W - 2.4), R(L + 2, W + 2.4), R(-L - 2, W + 2.4)], top: y0 + H });      // une marge : pas d'arbre contre l'entrée
  return y0 + H;
}
