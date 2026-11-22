// La porte monumentale de René Binet, à l'angle de la place de la Concorde et du Cours-la-Reine (porte n° 29, l'entrée
// principale de l'Exposition : 8 600 000 visiteurs), et, derrière elle, les jardins du Cours-la-Reine et du quai de la
// Conférence jusqu'au pont des Invalides, « parsemés de serres ».
//
// Cotes : Picard, Rapport général, t. II, ch. I. La porte est « engagée franchement dans le Cours-la-Reine » : trois
// grandes arcatures en plein cintre dessinent un triangle équilatéral, l'une normale au Cours (l'entrée, tournée vers
// la place), les deux autres inclinées à 60° ; les sommets sont coupés de pans à petits arcs (5,60 m, naissance à 6 m),
// celui du fond portant la grille des Échevins, ceux des côtés les statues de l'Électricité. Au-dessus, une coupole
// surbaissée (ceinture de 20 m de diamètre, lanterne de 5 m, 8,2 m de flèche). Devant l'arcature d'entrée, un arc
// frontal surélevé (24,5 m d'ouverture, 29,8 m hors œuvre, intrados à 21,9 m, naissance à 9,7 m, 5,4 m de section au
// sommet) porte une pyramide et la statue de la Ville de Paris, la « Parisienne » de Moreau-Vauthier, pieds à 36 m,
// tête à 45 m. De part et d'autre, deux exèdres en quart de cercle portent la frise des ouvriers (grès de Muller) ;
// au bout de chacune, un minaret en tronc de pyramide de 42,2 m hors sol. Derrière la porte, 32 guichets en hémicycle,
// seize de chaque côté de la grille. Les couleurs — bleu, vert et blanc, or dans la voussure et la coupole — sont
// celles du rapport ; le rayon des exèdres et la disposition des guichets sont une évocation.
import { cyl, cone, rgb } from '../builder.js';
import { repere, pan } from '../p1889/corps.js';
import { berceau } from './outils.js';
import { ensemble } from '../p1889/expo.js';

const STAFF = rgb(238, 234, 222), BLEU = rgb(74, 112, 160), VERT = rgb(96, 140, 118), OR = rgb(214, 178, 88), GRES = rgb(150, 118, 84), VERRE = rgb(150, 190, 196), IVOIRE = rgb(234, 226, 206), BOIS = rgb(150, 120, 88), TOILE = rgb(200, 70, 60);
const boite = (ring) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { ring, x0, z0, x1, z1 }; };

// Mur percé d'un arc : le mur va de A à Bp — deux points [u, v] du repère —, s allant de −L/2 à L/2, sur l'épaisseur
// ep, du sol à haut(s) ; bas(s) est l'intrados au-dessus de l'ouverture (de demi-largeur ouv), 0 ailleurs. Chaque face
// est tracée des deux côtés. Rend les piédroits (anneaux au sol) pour les emprises.
function murArc(b, F, y0, A, Bp, ep, bas, haut, col, colArc, n = 24, ouv = 0) {
  const L = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]), du = (Bp[0] - A[0]) / L, dv = (Bp[1] - A[1]) / L, nu = -dv * ep / 2, nv = du * ep / 2;
  const Q = (s, t, y) => { const p = F.P(A[0] + du * (s + L / 2) + nu * t, A[1] + dv * (s + L / 2) + nv * t); return [p[0], y0 + y, p[1]]; };
  const S = []; for (let k = 0; k <= n; k++) S.push(-L / 2 + (L * k) / n);
  if (ouv) { S.push(-ouv, -ouv + 1e-3, ouv - 1e-3, ouv); S.sort((a, c) => a - c); }                 // les naissances de l'arc tombent sur une coupure
  n = S.length - 1;
  for (let k = 0; k < n; k++) {
    const a = S[k], c = S[k + 1], ba = bas(a), bc = bas(c), ha = haut(a), hc = haut(c);
    for (const t of [-1, 1]) pan(b, [Q(a, t, ba), Q(c, t, bc), Q(c, t, hc), Q(a, t, ha)], col, t > 0 ? 0.92 : 0.86, true);       // les deux faces
    pan(b, [Q(a, -1, ha), Q(c, -1, hc), Q(c, 1, hc), Q(a, 1, ha)], col, 1, true);                                                   // le dessus
    if (ba > 0.01 || bc > 0.01) pan(b, [Q(a, -1, ba), Q(c, -1, bc), Q(c, 1, bc), Q(a, 1, ba)], colArc, 0.8, true);                  // l'intrados
    if ((ba > 0.01) !== (bc > 0.01)) { const s = ba > 0.01 ? c : a, y = Math.max(ba, bc); pan(b, [Q(s, -1, 0), Q(s, 1, 0), Q(s, 1, y), Q(s, -1, y)], col, 0.84, true); }      // les jambages
  }
  for (const s of [-L / 2, L / 2]) pan(b, [Q(s, -1, 0), Q(s, 1, 0), Q(s, 1, haut(s)), Q(s, -1, haut(s))], col, 0.88, true);
  // piédroits : les tronçons du mur où il touche le sol
  const pieds = []; let d0 = null;
  for (let k = 0; k <= n; k++) { const s = S[k], plein = k < n && bas((s + S[k + 1]) / 2) < 0.01; if (plein && d0 === null) d0 = s; if ((!plein || k === n) && d0 !== null) { const e = k === n && plein ? L / 2 : s; pieds.push([Q(d0, -1, 0), Q(e, -1, 0), Q(e, 1, 0), Q(d0, 1, 0)].map((p) => [p[0], p[2]])); d0 = null; } }
  return pieds;
}
const plein = (r, ys) => (s) => (Math.abs(s) < r ? ys + Math.sqrt(r * r - s * s) : 0);        // intrados d'un plein cintre
const arc = (b, F, y0, A, Bp, ep, r, ys, haut, col, colArc, n) => murArc(b, F, y0, A, Bp, ep, plein(r, ys), haut, col, colArc, n, r);

// Tronc de pyramide à base carrée, de demi-côté a en bas à b en haut, axé sur le repère.
function tronc(bp, F, u, v, y0, y1, a, b2, col) {
  const Q = (du, dv, y, h) => { const p = F.P(u + du * h, v + dv * h); return [p[0], y, p[1]]; }, K = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < 4; i++) { const [p, q] = [K[i], K[(i + 1) % 4]]; pan(bp, [Q(p[0], p[1], y0, a), Q(q[0], q[1], y0, a), Q(q[0], q[1], y1, b2), Q(p[0], p[1], y1, b2)], col, 0.84 + 0.04 * i, true); }
  pan(bp, [Q(-1, -1, y1, b2), Q(1, -1, y1, b2), Q(1, 1, y1, b2), Q(-1, 1, y1, b2)], col, 1);
}

export function batirPorte(app, B) {
  const T = app.terrain, V = app.v89, M = app.monuments;
  // repère : u de la place vers le fond du Cours-la-Reine (vers l'ouest), v vers les Champs-Élysées ; l'arcature
  // d'entrée est en u = 0, au bord de la place
  const F = repere([-2258, -1303], [-1, 0]), c = F.P(12, 0), y0 = T.height(c[0], c[1]), bp = B.at('plain', c[0], c[1]);
  const S = 34.64, H = (S * Math.sqrt(3)) / 2, coupe = 6, HAUT = 21.3;                                     // triangle de 34,6 m de côté : sa ceinture inscrite a 20 m
  const sommets = [[0, -S / 2], [0, S / 2], [H, 0]], pieds = [];
  // les trois grandes arcatures et les trois pans coupés
  for (let i = 0; i < 3; i++) {
    const a = sommets[i], b = sommets[(i + 1) % 3], L = S, ab = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const A = [a[0] + ab[0] * coupe, a[1] + ab[1] * coupe], Bq = [b[0] - ab[0] * coupe, b[1] - ab[1] * coupe];
    pieds.push(...arc(bp, F, y0, A, Bq, 2.4, 9.7, 10.08, () => HAUT, STAFF, BLEU, 24));
    const C = [b[0] + ((sommets[(i + 2) % 3][0] - b[0]) / L) * coupe, b[1] + ((sommets[(i + 2) % 3][1] - b[1]) / L) * coupe];     // pan coupé au sommet b
    pieds.push(...arc(bp, F, y0, Bq, C, 2.4, 2.8, 6, () => HAUT, STAFF, VERT, 8));
  }
  // la terrasse sur le triangle, la coupole surbaissée et sa lanterne
  { const hex = []; for (let i = 0; i < 3; i++) { const a = sommets[i], b = sommets[(i + 1) % 3]; for (const t of [coupe / S, 1 - coupe / S]) { const p = F.P(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); hex.push([p[0], y0 + HAUT, p[1]]); } }
    for (let i = 1; i + 1 < hex.length; i++) pan(bp, [hex[0], hex[i], hex[i + 1]], STAFF, 0.95, true); }
  { const o = F.P(H / 3, 0), N = 6;
    for (let k = 0; k < N; k++) { const a0 = (k / N) * (Math.PI / 2), a1 = ((k + 1) / N) * (Math.PI / 2), r0 = 2.5 + 7.5 * Math.cos(a0), r1 = 2.5 + 7.5 * Math.cos(a1);
      cyl(bp, o[0], o[1], r0, y0 + HAUT + 8.2 * Math.sin(a0), y0 + HAUT + 8.2 * Math.sin(a1), { col: k % 2 ? OR : BLEU, seg: 24, r1, s0: 0.9, s1: 1.05 }); }
    cyl(bp, o[0], o[1], 2.5, y0 + HAUT + 8.2, y0 + HAUT + 10.2, { col: VERRE, seg: 12 }); cone(bp, o[0], o[1], 2.7, y0 + HAUT + 10.2, y0 + HAUT + 11.5, { col: OR, seg: 12 }); }
  // l'arc frontal surélevé, devant l'arcature d'entrée : intrados en plein cintre de 12,25 m de rayon, extrados en anse
  // jusqu'à 27,3 m ; la pyramide au-dessus, et la Parisienne
  pieds.push(...arc(bp, F, y0, [-1.6, -14.9], [-1.6, 14.9], 2.65, 12.25, 9.65, (s) => 9.65 + 17.65 * Math.sqrt(Math.max(0, 1 - (s / 14.9) ** 2)), STAFF, OR, 30));
  { const p = F.P(-1.6, 0); cone(bp, p[0], p[1], 4.2, y0 + 26.6, y0 + 36, { col: BLEU, seg: 4, a0: Math.PI / 4 });
    cyl(bp, p[0], p[1], 1.5, y0 + 34.5, y0 + 36, { col: OR, seg: 8 });
    cyl(bp, p[0], p[1], 1.7, y0 + 36, y0 + 42.6, { col: IVOIRE, seg: 10, r1: 0.7 });                                    // la robe et le manteau
    cyl(bp, p[0], p[1], 0.55, y0 + 42.6, y0 + 43.4, { col: IVOIRE, seg: 8, r1: 0.5 }); cyl(bp, p[0], p[1], 0.6, y0 + 43.4, y0 + 45, { col: IVOIRE, seg: 8, r1: 0.25 }); }
  // les exèdres en quart de cercle, leur frise, et les minarets au bout
  for (const s of [-1, 1]) {
    const R = 12, Cx = -R, Cy = s * 14.9, P = (t) => [Cx + R * Math.cos(t), Cy + s * R * Math.sin(t)];
    for (let k = 0; k < 8; k++) { const a = P((k / 8) * (Math.PI / 2)), b = P(((k + 1) / 8) * (Math.PI / 2));
      pieds.push(...murArc(bp, F, y0, a, b, 1.4, () => 0, () => 7.6, STAFF, STAFF, 1));
      const n = [a[0] - Cx, a[1] - Cy], l = Math.hypot(...n), e = [(n[0] / l) * -0.75, (n[1] / l) * -0.75];                     // la frise, côté de l'avant-cour
      const fa = F.P(a[0] + e[0], a[1] + e[1]), fb = F.P(b[0] + e[0], b[1] + e[1]);
      pan(bp, [[fa[0], y0 + 4.6, fa[1]], [fb[0], y0 + 4.6, fb[1]], [fb[0], y0 + 6.8, fb[1]], [fa[0], y0 + 6.8, fa[1]]], GRES, 0.9, true); }
    const m = P(Math.PI / 2), q = F.P(m[0], m[1]);
    tronc(bp, F, m[0], m[1], y0 - 1, y0 + 40.6, 1.5, 0.5, STAFF);
    cyl(bp, q[0], q[1], 0.75, y0 + 40.6, y0 + 41.6, { col: BLEU, seg: 8 }); cone(bp, q[0], q[1], 0.8, y0 + 41.6, y0 + 42.2, { col: OR, seg: 8 });
    pieds.push(F.rect(m[0] - 1.6, m[0] + 1.6, m[1] - 1.6, m[1] + 1.6));
    app.landmarks.push({ x: q[0], z: q[1], top: y0 + 42.2 });
  }
  // les guichets : 32 cabines en hémicycle derrière la porte, seize de chaque côté de la grille des Échevins, groupées
  // par deux ; un mât à drapeau par paire
  const O = [H / 3, 0], RG = 34;
  for (const s of [-1, 1]) for (let k = 0; k < 16; k++) {
    const t = ((20 + (k * 58) / 15) * Math.PI) / 180, u = O[0] + RG * Math.cos(t), v = s * RG * Math.sin(t), g = F.P(u, v), r = [Math.cos(t), s * Math.sin(t)], ta = [-r[1], r[0]];
    const ring = [[-1.1, -0.9], [1.1, -0.9], [1.1, 0.9], [-1.1, 0.9]].map(([a, b]) => F.P(u + ta[0] * a + r[0] * b, v + ta[1] * a + r[1] * b));
    const hb = (k % 2 ? 0 : 0.2);
    for (let i = 0; i < 4; i++) { const p = ring[i], q = ring[(i + 1) % 4]; pan(bp, [[p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y0 + 2.8 + hb, q[1]], [p[0], y0 + 2.8 + hb, p[1]]], i % 2 ? BLEU : STAFF, 0.86, true); }
    pan(bp, ring.map((p) => [p[0], y0 + 2.8 + hb, p[1]]), VERT, 1);
    if (k % 2 === 0) { cyl(bp, g[0], g[1], 0.07, y0 + 2.8, y0 + 9, { col: BOIS, seg: 4 }); const f = F.P(u + ta[0] * 0.9, v + ta[1] * 0.9); pan(bp, [[g[0], y0 + 8.9, g[1]], [f[0], y0 + 8.9, f[1]], [f[0], y0 + 7.9, f[1]], [g[0], y0 + 7.9, g[1]]], TOILE, 1, true); }
    pieds.push(ring);
  }
  // emprises : le triangle et l'avant-cour entre les exèdres (on n'y plante pas d'arbre), les guichets
  const tri = F.rect(-2, H + 1, -S / 2 - 1, S / 2 + 1);
  app.foot.push({ ring: tri, top: y0 + HAUT + 11.5 }); V.reserves.push(boite(F.rect(-14, H + 8, -30, 30)));
  for (const r of pieds) app.foot.push({ ring: r, top: y0 + 8 });
  const p = F.P(-1.6, 0); app.landmarks.push({ x: p[0], z: p[1], top: y0 + 45 });
  M.PorteMonumentale = { x: p[0], z: p[1], top: y0 + 50, guichets: 32 };
}

// ---- les jardins du Cours-la-Reine et du quai de la Conférence, de la porte au pont des Invalides : des parterres
// « parsemés de serres » (Picard, t. I) ; les serres et leur place sont une évocation. Repère : celui de la rive droite
// (src/p1900/pavillons.js), u vers l'aval depuis le pont des Invalides, v vers le nord depuis le quai.
const SERRES = [[-560, 30], [-470, 26], [-380, 34], [-300, 22], [-170, 30], [-90, 26]];      // [milieu en u, longueur]
export function batirJardinsRD(app, B) {
  const T = app.terrain, V = app.v89, F = repere([-2890, -1262], [-0.9995, 0.03]);
  ensembleSerres(app, B, F, T, V);
  const c = F.P(-400, 18); app.monuments.JardinsCoursLaReine = { x: c[0], z: c[1], top: T.height(c[0], c[1]) + 22 };
}
function ensembleSerres(app, B, F, T, V) {
  const yv = (u) => T.height(...F.P(u, 18)) - 0.3;
  ensemble(app, yv(-300), -2, -1, 10, (bm, bv) => { for (const [um, L] of SERRES) berceau(bv, F.P, yv(um), um - L / 2, um + L / 2, 12, 24, 3.2, 8, VERRE); });
  for (const [um, L] of SERRES) { const ring = F.rect(um - L / 2, um + L / 2, 12, 24); app.foot.push({ ring, top: yv(um) + 8 }); V.reserves.push(boite(ring)); }
}
