// Deux attractions au pied de la tour, côté avenue de Suffren : le Globe céleste et le palais de l'Optique.
//
// Le Globe céleste de l'architecte Albert Galeron (Picard, t. VII, p. 223-224 ; guide Hachette, p. 271) : hors de
// l'enceinte, « en bordure du quai d'Orsay, sur un terrain dépendant de la gare du Champ de Mars », de l'autre côté de
// l'avenue de Suffren, qu'une passerelle enjambait pour le relier à l'Exposition — celle de ciment armé s'est effondrée
// le 29 avril 1900, on l'a refaite en bois. Un soubassement ajouré à trois étages, en ciment armé, sur quatre piliers
// (environ 18 m), et une sphère creuse de 45 m environ (« plus de 40 m » chez Picard, 46 m chez Hachette), peinte en
// bleu, ses constellations en or ; la ligne équatoriale inclinée mène à un point voisin du sommet ; aux angles du
// socle, quatre figures colossales portent les quatre grosses planètes. L'emplacement exact sur le terrain, le tracé de
// la passerelle et l'inclinaison de l'équateur sont une évocation.
//
// Le palais de l'Optique (Bobin, 1900 ; Picard, t. VII, p. 211-212 ; Hachette, p. 271-272) : « contre l'avenue de
// Suffren, en face de la Tour », 5 868 m² ; la façade tournée vers la tour, un immense porche couronné des signes du
// zodiaque ouvrant sur une colonnade demi-circulaire qui porte une moitié de coupole ; une coupole qui porte à 42 m un
// projecteur ; une galerie de 120 m orientée suivant le méridien, où la Grande Lunette (un tube de 60 m) reçoit la
// lumière d'un sidérostat, et au bout une salle de projections de deux mille places. Le plan est une évocation.
import { cyl, cone, rgb } from '../builder.js';
import { repere, corps, pan } from '../p1889/corps.js';
import { coupole } from '../p1889/monuments.js';
import { EXPO, expoXZ } from '../p1889/data.js';
import { poutre } from './outils.js';

const STAFF = rgb(238, 232, 218), BLEU = rgb(54, 84, 150), OR = rgb(218, 180, 84), BOIS = rgb(150, 116, 82), FIGURE = rgb(214, 204, 184), AURORE = rgb(196, 172, 208);
const boite = (ring) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { ring, x0, z0, x1, z1 }; };
const EX = () => repere(expoXZ(0, 0), EXPO.u);                 // repère de l'Exposition : F.P(u, v) = expoXZ(u, v)

export function batirGlobe(app, B) {
  const T = app.terrain, V = app.v89, M = app.monuments, F = EX(), U0 = -78, V0 = 286, c = F.P(U0, V0), y0 = T.height(c[0], c[1]), bp = B.at('plain', c[0], c[1]), bs = B.at('stone', c[0], c[1]);
  const S = 20, HS = 18, R = 22.5, yc = y0 + HS + R;
  // le soubassement : quatre piliers, trois étages de galeries ajourées
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = F.P(U0 + a * (S - 3), V0 + b * (S - 3)); const r = F.rect(U0 + a * (S - 3) - 3, U0 + a * (S - 3) + 3, V0 + b * (S - 3) - 3, V0 + b * (S - 3) + 3);
    cyl(bs, p[0], p[1], 3.6, y0 - 1, y0 + HS, { col: STAFF, seg: 4, s0: 0.8 }); app.foot.push({ ring: r, top: y0 + HS }); }
  for (const h of [6, 12, HS]) { const K = [[-S, -S], [S, -S], [S, S], [-S, S]];
    for (let i = 0; i < 4; i++) { const a = F.P(U0 + K[i][0], V0 + K[i][1]), b = F.P(U0 + K[(i + 1) % 4][0], V0 + K[(i + 1) % 4][1]); poutre(bp, [a[0], y0 + h - 0.6, a[1]], [b[0], y0 + h - 0.6, b[1]], 0.6, STAFF); } }
  { const r = F.rect(U0 - S + 1, U0 + S - 1, V0 - S + 1, V0 + S - 1).map((p) => [p[0], y0 + HS - 0.3, p[1]]); pan(bp, r, STAFF, 0.95, true); }
  // la sphère, en vingt assises
  const N = 20;
  for (let k = 0; k < N; k++) { const a0 = -Math.PI / 2 + (k / N) * Math.PI, a1 = -Math.PI / 2 + ((k + 1) / N) * Math.PI;
    cyl(bp, c[0], c[1], Math.max(0.3, R * Math.cos(a0)), yc + R * Math.sin(a0), yc + R * Math.sin(a1), { col: BLEU, seg: 32, r1: Math.max(0.3, R * Math.cos(a1)), s0: 0.78 + 0.3 * (k / N), s1: 0.8 + 0.3 * ((k + 1) / N) }); }
  // l'équateur incliné, chemin doré jusqu'au voisinage du sommet ; quelques étoiles
  { const inc = (52 * Math.PI) / 180, Q = (t) => { const x = Math.cos(t) * (R + 0.9), w = Math.sin(t) * (R + 0.9); const p = F.P(U0 + x, V0 + w * Math.cos(inc)); return [p[0], yc + w * Math.sin(inc), p[1]]; };
    for (let i = 0; i < 48; i++) poutre(bp, Q((i / 48) * 2 * Math.PI), Q(((i + 1) / 48) * 2 * Math.PI), 0.9, OR); }
  for (let i = 0; i < 60; i++) { const t = i * 2.39996, z = 1 - (2 * (i + 0.5)) / 60, r = Math.sqrt(1 - z * z), p = F.P(U0 + Math.cos(t) * r * (R + 0.15), V0 + Math.sin(t) * r * (R + 0.15)), y = yc + z * (R + 0.15);
    if (y > y0 + HS + 2) cyl(bp, p[0], p[1], 0.5, y - 0.25, y + 0.25, { col: OR, seg: 5 }); }
  // aux angles du socle, quatre figures colossales et les grosses planètes
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = F.P(U0 + a * (S - 3), V0 + b * (S - 3));
    cyl(bp, p[0], p[1], 1.5, y0 + HS, y0 + HS + 7, { col: FIGURE, seg: 8, r1: 0.7 }); cyl(bp, p[0], p[1], 2.6, y0 + HS + 8, y0 + HS + 10.5, { col: OR, seg: 10, r1: 2.6 }); cone(bp, p[0], p[1], 2.6, y0 + HS + 10.5, y0 + HS + 12, { col: OR, seg: 10 }); }
  // la passerelle de bois au-dessus de l'avenue de Suffren, du premier étage du socle à l'Exposition
  { const a = [U0, V0 - S], b = [U0, EXPO.v1 - 14], H = 7, N2 = 10, W = 2;
    for (let i = 0; i < N2; i++) { const t0 = i / N2, t1 = (i + 1) / N2, v0 = a[1] + (b[1] - a[1]) * t0, v1 = a[1] + (b[1] - a[1]) * t1, P = (v, s) => F.P(U0 + s, v), ya = y0 + H, p0 = P(v0, -W), p1 = P(v1, -W), q0 = P(v0, W), q1 = P(v1, W);
      pan(bp, [[p0[0], ya, p0[1]], [p1[0], ya, p1[1]], [q1[0], ya, q1[1]], [q0[0], ya, q0[1]]], BOIS, 1, true);
      for (const s of [-W, W]) { const r0 = P(v0, s), r1 = P(v1, s); poutre(bp, [r0[0], ya + 1.1, r0[1]], [r1[0], ya + 1.1, r1[1]], 0.06, BOIS); }
      for (let k = 0; k < 4; k++) { const p = P(v0 + ((v1 - v0) * k) / 4, 0); app.deckSet(p[0], p[1], ya); } }
    for (const v of [a[1] - 12, (a[1] + b[1]) / 2, b[1] + 4]) for (const s of [-W, W]) { const p = F.P(U0 + s, v); poutre(bp, [p[0], T.height(p[0], p[1]) - 0.5, p[1]], [p[0], y0 + H, p[1]], 0.25, BOIS); } }
  const ring = F.rect(U0 - S, U0 + S, V0 - S, V0 + S); V.reserves.push(boite(F.rect(U0 - S - 4, U0 + S + 4, V0 - S - 4, V0 + S + 4)));
  app.foot.push({ ring, top: yc + R });
  app.landmarks.push({ x: c[0], z: c[1], top: yc + R });
  M.Globe = { x: c[0], z: c[1], top: yc + R + 6, diametre: 2 * R };
}

export function batirOptique(app, B) {
  const T = app.terrain, V = app.v89, M = app.monuments, F = EX(), c = F.P(0, 126), y0 = T.height(c[0], c[1]), bp = B.at('plain', c[0], c[1]);
  // le corps principal, face à la tour : 56 m sur 28, une coupole et son projecteur à 42 m
  corps(app, B, F, -28, 28, 112, 140, y0 - 1, y0 + 15, { col: STAFF, comble: 0, travee: 5 });
  const top = coupole(app, B, c[0], c[1], 8, 15, 22, 32, 36, 42, rgb(120, 150, 170), { pierre: STAFF, fleche: OR });
  // le porche : deux piles et un bandeau aux signes du zodiaque ; derrière, la colonnade en demi-cercle et sa demi-coupole
  { const P = (u, v, h) => { const p = F.P(u, v); return [p[0], y0 + h, p[1]]; };
    for (const s of [-1, 1]) { const p = F.P(s * 15, 109); cyl(bp, p[0], p[1], 3, y0 - 1, y0 + 26, { col: STAFF, seg: 4 }); }
    pan(bp, [P(-17, 108, 21), P(17, 108, 21), P(17, 108, 26), P(-17, 108, 26)], OR, 0.95, true); pan(bp, [P(-17, 108, 26), P(17, 108, 26), P(17, 111, 26), P(-17, 111, 26)], STAFF, 1, true);
    const r = 11, Cv = 112, N = 10, A = 6;
    for (let i = 0; i <= N; i++) { const t = (i / N) * Math.PI, p = F.P(-Math.cos(t) * r, Cv + Math.sin(t) * r); cyl(bp, p[0], p[1], 0.45, y0, y0 + 12, { col: STAFF, seg: 8 }); }
    for (let k = 0; k < A; k++) for (let i = 0; i < N; i++) { const a0 = (k / A) * (Math.PI / 2), a1 = ((k + 1) / A) * (Math.PI / 2), t0 = (i / N) * Math.PI, t1 = ((i + 1) / N) * Math.PI;
      const Q = (t, a) => P(-Math.cos(t) * r * Math.cos(a), Cv + Math.sin(t) * r * Math.cos(a), 12 + r * Math.sin(a));
      pan(bp, [Q(t0, a0), Q(t1, a0), Q(t1, a1), Q(t0, a1)], AURORE, 0.85 + 0.15 * (k / A), true); } }
  // la galerie de la Grande Lunette, orientée suivant le méridien, de la façade arrière vers l'avenue de Suffren
  const a = F.P(0, 140), d = [0, 1], G = repere(a, d), L = 110;                                   // z vers le sud : le méridien
  corps(app, B, G, 0, L, -6, 6, y0 - 1, y0 + 8, { col: STAFF, comble: 3, toit: rgb(150, 158, 164) });
  // la salle des projections, contre l'avenue de Suffren
  const e = G.P(L, 0), H = repere(e, EXPO.u), S = corps(app, B, H, -22, 22, -34, 2, y0 - 1, y0 + 16, { col: STAFF, comble: 6, toit: rgb(150, 158, 164) });
  V.reserves.push(boite(F.rect(-30, 30, 105, 142)));
  const f = H.P(0, -16); M.Optique = { x: c[0], z: c[1], top: top + 4, salle: { x: f[0], z: f[1], top: S } };
}
