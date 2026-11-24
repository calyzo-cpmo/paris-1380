// L'Exposition internationale des arts et des techniques appliqués à la vie moderne (25 mai - 25 novembre 1937), des
// jardins du Trocadéro au Champ-de-Mars, sur les deux rives de la Seine, de l'île aux Cygnes à l'Esplanade des Invalides.
//
// La disposition vient du plan général de l'Exposition (Service d'architecture et des promenades, R. Martzloff,
// J. Gréber ; Wikimedia Commons, « Plan général de l'Exposition universelle de 1937 ») et de la légende numérotée de son
// encart. Ce plan est une vue cavalière, qui ne se cale pas sur la maquette à mieux que quelques dizaines de mètres : les
// pavillons sont placés à la main, dans l'ordre et les proportions du plan, dans le repère de l'axe Trocadéro - École
// militaire (u depuis la tour vers l'École militaire, v vers Grenelle) et le long des berges relevées dans les données.
// Les cotes publiées viennent de L'Architecture d'aujourd'hui, août 1937 (numéro de l'Exposition) : pavillon de l'URSS,
// 160 sur 21 m, statue posée à 33 m ; pavillons de l'URSS et de l'Allemagne bâtis au-dessus des rampes de l'avenue de
// Tokio, de part et d'autre du tunnel de la place de Varsovie ; tour allemande de 54 m, salle de 21 m de large et 18 m
// de haut ; palais de l'Air, 166 m sur 36, 20 et 21 m de haut ; pavillon du Yachting, 100 m sur 20 sur la berge ;
// mât de la porte d'honneur, 100 m, haubané à 41 m ; pavillon de la Publicité, façade de 15 m, plan incliné de 28 m.
// Le pavillon pontifical (campanile de 75 m, statue de 7 m, dôme à 40 m) d'après la notice de Wikipédia. Le reste —
// emprises, hauteurs, silhouettes — est une évocation.
import { box, cyl, cone, gableRoof, rgb } from '../builder.js';
import { repere, boite } from '../p1889/corps.js';
import { EXPO } from '../p1889/data.js';
import { poutre, calotte } from '../p1900/outils.js';

const C = rgb;
const BLANC = C(238, 234, 222), GRIS = C(206, 204, 196), VITRE = C(92, 112, 124), VERRE = C(168, 196, 206), ACIER = C(196, 200, 204);
const OR = C(214, 176, 84), BOIS = C(164, 122, 82), TUILE = C(176, 92, 64), ARDOISE = C(86, 94, 108), OCRE = C(206, 160, 104), MARBRE = C(216, 204, 190), PIERRE_ALL = C(224, 216, 198);
const deg = Math.PI / 180;

// Repère de l'axe : u depuis la tour vers l'École militaire, v vers Grenelle (rive gauche, aval) ; le Trocadéro est en
// u ≈ −736, le pont d'Iéna de u ≈ −316 à −157, la place Joffre en u ≈ 880.
export const AXE = repere(EXPO.tour, EXPO.u);
// Bords de la Seine dans ce repère (premier point mouillé, relevé sur les données de la Seine) : [v, u].
const RIVE_G = [[500, -76], [460, -96], [420, -118], [380, -140], [340, -158], [300, -170], [260, -176], [220, -180], [180, -184], [100, -186], [0, -186], [-60, -192], [-180, -192], [-260, -190], [-300, -186], [-340, -178], [-380, -168], [-420, -158], [-460, -144], [-500, -128], [-540, -110], [-580, -94], [-620, -64], [-660, -34], [-700, 0]];
const RIVE_D = [[500, -256], [420, -258], [380, -268], [300, -280], [220, -290], [140, -296], [60, -302], [-20, -306], [-60, -308], [-180, -304], [-220, -318], [-260, -322], [-300, -318], [-340, -306], [-380, -290], [-420, -268], [-460, -254], [-500, -244], [-540, -228], [-580, -206], [-620, -186], [-660, -172], [-700, -144]];
// Île aux Cygnes : milieu de l'île, [v, u].
const ILE = [[600, -144], [700, -141], [800, -139], [900, -137], [1000, -135], [1100, -133], [1200, -131], [1300, -130], [1360, -129]];
const interp = (T, v) => { if (v >= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (v >= T[i][0]) { const [va, ua] = T[i - 1], [vb, ub] = T[i]; return ub + ((ua - ub) * (v - vb)) / (va - vb); } return T[T.length - 1][1]; };
export const riveG = (v) => interp(RIVE_G, v), riveD = (v) => interp(RIVE_D, v), ile = (v) => interp(ILE, v);

// ---- outils

function sol(app, ring) { let lo = 1e9, s = 0; for (const p of ring) { const y = app.terrain.height(p[0], p[1]); lo = Math.min(lo, y); s += y; } return { lo, moy: s / ring.length }; }
const tourner = (F, a) => { const c = Math.cos(a * deg), s = Math.sin(a * deg); return [F.d[0] * c + F.n[0] * s, F.d[1] * c + F.n[1] * s]; };

// Un pavillon moderne : un corps de lu × lv centré en (u, v) du repère F, tourné de o.a degrés ; h au-dessus du sol moyen.
// o : col, verre (murs vitrés), bandes (bandeaux vitrés, nombre), pilotis (hauteur), toit ([hauteur, couleur] d'un
// comble à deux versants), y0 (pied imposé), dalle (débord de la terrasse). Rend { L (repère local), c, y0, yt }.
export function bloc(app, B, F, u, v, lu, lv, h, o = {}) {
  const d = tourner(F, o.a || 0), c = F.P(u, v), L = repere(c, d), ring = L.rect(-lu / 2, lu / 2, -lv / 2, lv / 2), { lo, moy } = sol(app, ring);
  const y0 = (o.y0 ?? lo) - 1, yb = (o.base ?? moy), ya = o.pilotis ? yb + o.pilotis : y0, yt = yb + h, col = o.col || BLANC;
  const r = { cx: c[0], cz: c[1], ux: d[0], uz: d[1], hl: lu / 2, hw: lv / 2 }, bp = B.at('plain', c[0], c[1]);
  box(bp, r, ya, yt, { col: o.verre ? VERRE : col, s0: 0.84 });
  if (o.pilotis) {
    const nu = Math.max(2, Math.round(lu / 6)), nv = Math.max(2, Math.round(lv / 6));
    for (let i = 0; i <= nu; i++) for (let k = 0; k <= nv; k++) { if (i && i < nu && k && k < nv) continue; const p = L.P(-lu / 2 + 0.4 + ((lu - 0.8) * i) / nu, -lv / 2 + 0.4 + ((lv - 0.8) * k) / nv);
      box(bp, { cx: p[0], cz: p[1], ux: d[0], uz: d[1], hl: 0.3, hw: 0.3 }, y0, ya, { col: o.poteau || GRIS }); }
  }
  if (o.verre) for (let k = 0, n = Math.max(2, Math.round(lu / 5)); k <= n; k++) { const p = L.P(-lu / 2 + (lu * k) / n, 0); box(bp, { cx: p[0], cz: p[1], ux: d[0], uz: d[1], hl: 0.25, hw: lv / 2 + 0.1 }, ya, yt, { col: o.montant || C(70, 78, 80), top: false }); }
  const nb = o.bandes ?? (o.verre ? 0 : Math.max(1, Math.floor(h / 5)));
  for (let k = 0; k < nb; k++) { const yk = ya + ((yt - ya) * (k + 0.45)) / (nb + 0.3); box(bp, { ...r, hl: r.hl + 0.12, hw: r.hw + 0.12 }, yk, yk + Math.min(2.2, (yt - ya) / (nb + 1)), { col: VITRE, top: false }); }
  let top = yt;
  if (o.toit) { const [hr, ct] = o.toit, rr = lu >= lv ? r : { cx: c[0], cz: c[1], ux: -d[1], uz: d[0], hl: lv / 2, hw: lu / 2 }; top = gableRoof(B.at('roof', c[0], c[1]), bp, rr, yt, hr, { col: ct || TUILE, gable: { col } }); }
  else { const db = o.dalle ?? 0.5; box(bp, { ...r, hl: r.hl + db, hw: r.hw + db }, yt, yt + 0.6, { col: o.dalleCol || col }); top = yt + 0.6; }
  app.foot.push({ ring, top }); app.v89.reserves.push(boite(L.rect(-lu / 2 - 1, lu / 2 + 1, -lv / 2 - 1, lv / 2 + 1)));
  return { L, c, d, y0, yb, yt: top };
}
// Tour carrée de demi-côtés hl × hw, au point c, d'axe d ; o.cotes : nombre de côtes (pilastres) par face.
function tourCarree(app, B, c, d, hl, hw, ya, yb, o = {}) {
  const bp = B.at('plain', c[0], c[1]), r = { cx: c[0], cz: c[1], ux: d[0], uz: d[1], hl, hw }, col = o.col || BLANC;
  box(bp, r, ya, yb, { col, s0: 0.82 });
  if (o.cotes) { const L = repere(c, d), n = o.cotes;
    for (let i = 0; i < n; i++) { const t = -1 + (2 * (i + 0.5)) / n;
      for (const p of [L.P(t * hl, hw + 0.35), L.P(t * hl, -hw - 0.35)]) box(bp, { cx: p[0], cz: p[1], ux: d[0], uz: d[1], hl: Math.min(0.7, hl / n / 2), hw: 0.4 }, ya, yb - 1, { col: o.cote || col, s0: 0.9 });
      for (const p of [L.P(hl + 0.35, t * hw), L.P(-hl - 0.35, t * hw)]) box(bp, { cx: p[0], cz: p[1], ux: d[0], uz: d[1], hl: 0.4, hw: Math.min(0.7, hw / n / 2) }, ya, yb - 1, { col: o.cote || col, s0: 0.9 }); } }
  app.foot.push({ ring: repere(c, d).rect(-hl, hl, -hw, hw), top: yb });
  return yb;
}
const P3 = (L, s, t, y) => { const p = L.P(s, t); return [p[0], y, p[1]]; };

// ---- le Trocadéro : la place de Varsovie, les deux pavillons qui se font face, les sections étrangères des jardins

// Pavillon de l'URSS (Boris Iofan) : 160 m sur 21, de hauteur croissante vers la façade principale, qui s'achève par
// la tour portant L'Ouvrier et la Kolkhozienne de Vera Moukhina, en acier inoxydable, posés à 33 m. Il s'élève au-dessus
// de la rampe de l'avenue de Tokio, à l'ouest du tunnel de la place de Varsovie ; la statue s'avance vers l'est, vers le
// pavillon allemand.
function urss(app, B) {
  const T = app.terrain, M = app.monuments, L = repere(AXE.P(-334, 84), AXE.n), c = L.P(80, 0), y0 = T.height(...L.P(8, 0)), ya = Math.min(y0, T.height(...L.P(150, 0))) - 1;
  const bp = B.at('plain', c[0], c[1]), corps = (s0, s1, hw, h) => { box(bp, { cx: L.P((s0 + s1) / 2, 0)[0], cz: L.P((s0 + s1) / 2, 0)[1], ux: L.d[0], uz: L.d[1], hl: (s1 - s0) / 2, hw }, ya, y0 + h, { col: MARBRE, s0: 0.82 }); app.foot.push({ ring: L.rect(s0, s1, -hw, hw), top: y0 + h }); };
  corps(118, 160, 10.5, 9); corps(76, 118, 10.5, 12); corps(36, 76, 10.5, 15.5); corps(14, 36, 10.5, 19);
  // bandeaux vitrés des longs pans
  for (const [s0, s1, h] of [[118, 160, 9], [76, 118, 12], [36, 76, 15.5], [14, 36, 19]]) { const m = L.P((s0 + s1) / 2, 0); box(bp, { cx: m[0], cz: m[1], ux: L.d[0], uz: L.d[1], hl: (s1 - s0) / 2 - 1, hw: 10.62 }, y0 + h * 0.35, y0 + h * 0.7, { col: VITRE, top: false }); }
  // la tour, en gradins, à côtes verticales
  let y = tourCarree(app, B, L.P(7, 0), L.d, 7.5, 11, ya, y0 + 24, { col: MARBRE, cotes: 5 });
  y = tourCarree(app, B, L.P(7, 0), L.d, 5.8, 8.2, y, y0 + 29, { col: MARBRE, cotes: 4 });
  y = tourCarree(app, B, L.P(7, 0), L.d, 4.2, 5.8, y, y0 + 33, { col: MARBRE, cotes: 3 });
  // la statue : deux figures qui marchent vers l'est (s décroissant), bras levés, le marteau et la faucille croisés
  const st = B.at('plain', c[0], c[1]), Y = y0 + 33, s = 7, Q = (ds, dt, dy) => P3(L, s + ds, dt, Y + dy);
  for (const [t, k] of [[-2.2, 0], [2.2, 1]]) {
    const hanche = Q(0.5, t, 9), epaule = Q(-1.5, t, 16.5), tete = Q(-2, t, 19);
    poutre(st, Q(-4.5, t - 0.5, 0), hanche, 0.9, ACIER); poutre(st, Q(5, t + 0.5, 0.5), hanche, 0.9, ACIER);          // jambes, l'une en avant
    poutre(st, hanche, epaule, 1.7, ACIER);                                                                       // torse
    poutre(st, tete, Q(-2.1, t, 20.6), 0.9, ACIER);                                                                 // tête
    const main = k ? Q(-8, t + 1.2, 24.5) : Q(-7, t - 1.2, 23.5);
    poutre(st, epaule, main, 0.6, ACIER); poutre(st, Q(-1.5, t, 16), k ? Q(4, t + 2, 14) : Q(4, t - 2, 13), 0.55, ACIER);   // bras levé, bras en arrière
    if (k) { poutre(st, main, Q(-9.5, t + 0.5, 26.5), 0.35, ACIER); poutre(st, Q(-10.5, t - 0.8, 26.2), Q(-8.8, t + 1.6, 27.4), 0.25, ACIER); }      // faucille
    else { poutre(st, main, Q(-8.5, t - 0.2, 26), 0.25, ACIER); poutre(st, Q(-8.5, t - 1, 26), Q(-8.5, t + 0.6, 26), 0.6, ACIER); }                // marteau
  }
  // l'écharpe de la kolkhozienne, qui flotte vers l'arrière
  { const a = Q(-1.5, 2.2, 17), b = Q(6, 3.5, 19.5), e = Q(11, 1.5, 17.5), f = Q(5, 0.5, 15.5); st.quad(a[0], a[1], a[2], b[0], b[1], b[2], e[0], e[1], e[2], f[0], f[1], f[2], 0, 0, 1, 1, ACIER, 0.9, 1); st.quad(f[0], f[1], f[2], e[0], e[1], e[2], b[0], b[1], b[2], a[0], a[1], a[2], 0, 0, 1, 1, ACIER, 0.9, 1); }
  app.v89.reserves.push(boite(L.rect(-1, 161, -12, 12)));
  app.landmarks.push({ x: L.P(7, 0)[0], z: L.P(7, 0)[1], top: Y + 26 });
  M.URSS = { x: L.P(7, 0)[0], z: L.P(7, 0)[1], top: Y + 30 };
}

// Pavillon de l'Allemagne (Albert Speer) : une tour à pilastres de 54 m, l'aigle au sommet, face à la statue
// soviétique ; derrière elle une grande salle de portiques de 21 m de large et 18 m de haut, au-dessus de la rampe de
// l'avenue de Tokio, à l'est du tunnel. Devant la tour, les groupes de Josef Thorak.
function allemagne(app, B) {
  const T = app.terrain, M = app.monuments, L = repere(AXE.P(-334, -60), [-AXE.n[0], -AXE.n[1]]), y0 = T.height(...L.P(10, 0)), ya = Math.min(y0, T.height(...L.P(140, 0))) - 1, c = L.P(70, 0), bp = B.at('plain', c[0], c[1]);
  // la salle
  { const m = L.P(86, 0); box(bp, { cx: m[0], cz: m[1], ux: L.d[0], uz: L.d[1], hl: 64, hw: 10.5 }, ya, y0 + 18, { col: PIERRE_ALL, s0: 0.82 });
    for (let i = 0; i <= 16; i++) for (const t of [-10.9, 10.9]) { const p = L.P(24 + i * 8, t); box(bp, { cx: p[0], cz: p[1], ux: L.d[0], uz: L.d[1], hl: 0.8, hw: 0.45 }, ya, y0 + 18, { col: C(232, 226, 210) }); }
    for (let i = 0; i < 16; i++) { const p = L.P(28 + i * 8, 0); box(bp, { cx: p[0], cz: p[1], ux: L.d[0], uz: L.d[1], hl: 1.6, hw: 10.65 }, y0 + 3, y0 + 15, { col: VITRE, top: false }); }
    box(bp, { cx: m[0], cz: m[1], ux: L.d[0], uz: L.d[1], hl: 64.6, hw: 11.2 }, y0 + 18, y0 + 19.2, { col: C(236, 230, 214) });
    app.foot.push({ ring: L.rect(22, 150, -10.5, 10.5), top: y0 + 19.2 }); }
  // la tour : 17 m de front, 22 de profondeur, corniche à 48 m, l'aigle doré à 54 m
  const tc = L.P(11, 0), yt = tourCarree(app, B, tc, [L.n[0], L.n[1]], 8.5, 11, ya, y0 + 46, { col: PIERRE_ALL, cotes: 5, cote: C(232, 226, 210) });
  box(bp, { cx: tc[0], cz: tc[1], ux: L.n[0], uz: L.n[1], hl: 9.6, hw: 12.1 }, yt, yt + 2, { col: C(232, 226, 210) });
  { const g = B.at('plain', tc[0], tc[1]), Y = yt + 2, Q = (ds, dt, dy) => P3(L, 11 + ds, dt, Y + dy);
    box(g, { cx: tc[0], cz: tc[1], ux: L.n[0], uz: L.n[1], hl: 2.2, hw: 1.4 }, Y, Y + 1.2, { col: OR });
    poutre(g, Q(0, 0, 1.2), Q(0, 0, 4.2), 0.9, OR);                                                              // le corps
    for (const t of [-1, 1]) { const a = Q(0, t * 0.8, 3.6), b = Q(-0.6, t * 5, 6.2), e = Q(0.4, t * 4.6, 2.6);   // les ailes, déployées
      g.tri(a[0], a[1], a[2], b[0], b[1], b[2], e[0], e[1], e[2], 0, 0, 1, 0, 0, 1, OR, 0.9, 1, 1); g.tri(e[0], e[1], e[2], b[0], b[1], b[2], a[0], a[1], a[2], 0, 0, 1, 0, 0, 1, OR, 0.9, 1, 1); }
    cyl(g, ...L.P(10, 0), 1.1, Y + 0.2, Y + 0.5, { col: OR, seg: 12 }); }
  // les groupes de Thorak, sur leurs socles, devant la tour
  for (const t of [-14, 14]) { const p = L.P(-6, t), y = T.height(p[0], p[1]); box(bp, { cx: p[0], cz: p[1], ux: L.d[0], uz: L.d[1], hl: 2.5, hw: 2.5 }, y - 0.5, y + 3, { col: PIERRE_ALL });
    for (const dt of [-0.9, 0.9]) { const q = L.P(-6, t + dt); cyl(B.at('plain', q[0], q[1]), q[0], q[1], 0.55, y + 3, y + 9, { col: C(120, 110, 96), seg: 6 }); } }
  app.v89.reserves.push(boite(L.rect(-8, 151, -16, 16)));
  app.landmarks.push({ x: tc[0], z: tc[1], top: yt + 8 });
  M.Allemagne = { x: tc[0], z: tc[1], top: yt + 12 };            // l'aigle culmine à 54 m
}

// Pavillon pontifical (Paul Tournon) : le sanctuaire sous un dôme dont la croix culmine à 40 m, et un campanile doré de
// 75 m portant une statue de Notre-Dame de France de 7 m, en cuivre rouge.
function pontifical(app, B) {
  const T = app.terrain, M = app.monuments, c = AXE.P(-470, -172), y0 = T.height(c[0], c[1]), bp = B.at('plain', c[0], c[1]);
  const S = bloc(app, B, AXE, -470, -172, 30, 30, 14, { col: BLANC, bandes: 1 });
  cyl(bp, c[0], c[1], 11, S.yt - 0.6, S.yt + 7, { col: BLANC, seg: 20 }); calotte(bp, c[0], c[1], 11.4, S.yt + 7, S.yt + 18, C(196, 186, 160), 20);
  cyl(bp, c[0], c[1], 1, S.yt + 18, S.yt + 21, { col: OR, seg: 8 }); box(bp, { cx: c[0], cz: c[1], ux: 1, uz: 0, hl: 0.25, hw: 0.25 }, y0 + 34, y0 + 40, { col: OR }); box(bp, { cx: c[0], cz: c[1], ux: AXE.d[0], uz: AXE.d[1], hl: 1.6, hw: 0.25 }, y0 + 38, y0 + 38.5, { col: OR });
  const k = AXE.P(-503, -202), yk = T.height(k[0], k[1]), d = [AXE.d[0], AXE.d[1]];
  let y = tourCarree(app, B, k, d, 3.4, 3.4, yk - 1, yk + 48, { col: BLANC, cotes: 2 });
  y = tourCarree(app, B, k, d, 2.9, 2.9, y, yk + 66, { col: OR, cotes: 2 });
  cone(bp, k[0], k[1], 3.2, y, yk + 70, { col: OR, seg: 4, a0: Math.atan2(d[1], d[0]) + Math.PI / 4 });
  cyl(bp, k[0], k[1], 0.9, yk + 70, yk + 75, { col: C(160, 92, 64), seg: 8, r1: 0.6 }); cone(bp, k[0], k[1], 1.2, yk + 75, yk + 77, { col: C(160, 92, 64), seg: 8 });       // la statue
  app.landmarks.push({ x: k[0], z: k[1], top: yk + 77 });
  M.Pontifical = { x: k[0], z: k[1], top: yk + 82 };
}

// Pavillon de l'Espagne républicaine (Josep Lluís Sert et Luis Lacasa) : une ossature d'acier apparente, des panneaux
// d'éternit et de verre, 1 400 m² sur trois niveaux, un patio ; Guernica de Picasso y est exposé. Devant, la colonne
// d'Alberto, « Le peuple espagnol a un chemin qui conduit à une étoile », haute de 12,5 m.
function espagne(app, B) {
  const S = bloc(app, B, AXE, -440, -92, 22, 34, 11, { col: C(226, 224, 216), bandes: 2, dalle: 0.8 });
  for (let i = 0; i <= 6; i++) for (const t of [-11.3, 11.3]) { const p = S.L.P(t, -17 + (34 * i) / 6); box(B.at('plain', p[0], p[1]), { cx: p[0], cz: p[1], ux: S.d[0], uz: S.d[1], hl: 0.2, hw: 0.2 }, S.y0, S.yt, { col: C(150, 64, 48) }); }
  const p = AXE.P(-418, -78), y = app.terrain.height(p[0], p[1]); cyl(B.at('plain', p[0], p[1]), p[0], p[1], 0.9, y - 0.5, y + 12.5, { col: C(170, 150, 120), seg: 8, r1: 0.25 });
  app.monuments.Espagne = { x: S.c[0], z: S.c[1], top: S.yt + 8 };
}

// Pavillon de la Pologne : une rotonde en forme de tour, en pierre blanche, et des galeries et des portiques dans la verdure.
function pologne(app, B) {
  const c = AXE.P(-402, -160), y = app.terrain.height(c[0], c[1]), bp = B.at('plain', c[0], c[1]);
  cyl(bp, c[0], c[1], 9, y - 1, y + 22, { col: C(240, 236, 226), seg: 20, s0: 0.84 }); cyl(bp, c[0], c[1], 9.4, y + 22, y + 23, { col: C(230, 226, 214), seg: 20 });
  app.foot.push({ ring: repere(c, AXE.d).rect(-9, 9, -9, 9), top: y + 23 }); app.v89.reserves.push(boite(repere(c, AXE.d).rect(-10, 10, -10, 10)));
  bloc(app, B, AXE, -420, -184, 30, 8, 6, { col: C(236, 230, 216), bandes: 0 }); bloc(app, B, AXE, -386, -186, 8, 30, 6, { col: C(236, 230, 216), bandes: 0 });
  app.monuments.Pologne = { x: c[0], z: c[1], top: y + 28 };
}

// Les autres sections étrangères des jardins : [nom, u, v, lu, lv, h, options].
const JARDINS = [
  ['Finlande', -488, 230, 26, 22, 7, { col: BOIS, bandes: 1 }],                       // Alvar Aalto : bois, sur la pente
  ['États baltes', -578, 105, 16, 26, 8, {}],
  ['Danemark', -560, 72, 22, 16, 8, { col: C(222, 196, 170) }],
  ['Siam', -545, 150, 14, 14, 7, { col: C(236, 220, 180), toit: [6, C(180, 60, 40)] }],
  ['Monaco', -520, 110, 14, 16, 9, { col: C(240, 226, 206) }],
  ['Autriche', -505, 175, 18, 30, 14, { verre: true }],                              // Oswald Haerdtl : une vitrine monumentale
  ['Luxembourg', -500, 72, 16, 20, 9, { col: C(226, 216, 196) }],
  ['Israël en Palestine', -470, 128, 14, 20, 8, {}],
  ['Roumanie', -445, 76, 20, 24, 11, { col: C(232, 214, 186), toit: [5, TUILE] }],
  ['Hongrie', -425, 142, 18, 22, 10, { col: C(230, 222, 200), toit: [6, C(120, 80, 60)] }],
  ['Restaurant roumain', -398, 205, 14, 18, 7, { col: C(236, 226, 206), toit: [4, TUILE] }],
  ['Égypte', -390, 72, 16, 20, 9, { col: OCRE }],
  ['Japon', -376, 160, 30, 14, 6, { col: C(226, 222, 210), pilotis: 3, bandes: 1 }],  // Junzō Sakakura : ossature légère sur pilotis
  ['Pays-Bas', -582, -108, 14, 36, 10, { a: -32, col: C(196, 92, 72) }],              // façade courbe, en briques émaillées, sur l'aile du palais
  ['Yougoslavie', -560, -70, 18, 16, 9, {}],
  ['Norvège', -545, -150, 14, 20, 8, { col: BOIS, bandes: 1 }],
  ['Argentine', -512, -112, 18, 20, 10, {}],
  ['Grèce', -482, -66, 14, 18, 8, {}],
  ['Uruguay', -396, -76, 14, 18, 8, { col: C(236, 228, 210) }],
];

function trocadero(app, B) {
  const M = app.monuments;
  urss(app, B); allemagne(app, B); pontifical(app, B); espagne(app, B); pologne(app, B);
  for (const [nom, u, v, lu, lv, h, o] of JARDINS) { const S = bloc(app, B, AXE, u, v, lu, lv, h, o); M['Pavillon ' + nom] = { x: S.c[0], z: S.c[1], top: S.yt + 6 }; }
  // le Portugal, au bord du quai, devant l'Allemagne (Francisco Keil do Amaral)
  { const S = bloc(app, B, AXE, -314, -128, 16, 50, 9, { col: C(240, 236, 226), bandes: 1 }); M['Pavillon Portugal'] = { x: S.c[0], z: S.c[1], top: S.yt + 6 }; }
}

// ---- rive droite, du pont d'Iéna au pont de l'Alma : le pavillon de l'Hygiène (Mallet-Stevens et Coulon), bâti sur la
// berge au-dessus de longues galeries en fer à cheval, et celui du Yachting (Meyer-Lévy, Massé et Bigot), 100 m sur 20,
// sur poteaux, laissant la berge libre aux piétons, avec une terrasse ronde sur la Seine, un sémaphore et son pavois.
function riveDroiteAmont(app, B) {
  const M = app.monuments, sur = (v, l) => riveD(v) - l / 2 - 1;
  // l'Hygiène : deux galeries de 100 m, la courbe en aval
  { const v0 = -280, v1 = -380, a = riveD(-330) - 5, b = a - 13;
    for (const u of [a, b]) bloc(app, B, AXE, u, (v0 + v1) / 2, 7, 92, 7, { col: BLANC, bandes: 1 });
    const c = AXE.P((a + b) / 2, v0 + 4), y = app.terrain.height(c[0], c[1]); cyl(B.at('plain', c[0], c[1]), c[0], c[1], 10.5, y - 1, y + 7, { col: BLANC, seg: 18 });
    M.Hygiene = { x: c[0], z: c[1], top: y + 14 }; }
  // le Yachting
  { const v = -540, u = sur(v, 20) + 1, a = -Math.atan((riveD(-580) - riveD(-500)) / -80) / deg, S = bloc(app, B, AXE, u, v, 20, 100, 9, { a, pilotis: 4, col: BLANC, bandes: 1 });
    const p = S.L.P(0, 46), y = S.yt; box(B.at('plain', p[0], p[1]), { cx: p[0], cz: p[1], ux: 1, uz: 0, hl: 0.2, hw: 0.2 }, y, y + 16, { col: BLANC });
    box(B.at('plain', p[0], p[1]), { cx: p[0], cz: p[1], ux: S.d[0], uz: S.d[1], hl: 4, hw: 0.12 }, y + 12, y + 12.3, { col: BLANC });
    M.Yachting = { x: S.c[0], z: S.c[1], top: S.yt + 12 }; }
}

// ---- rive gauche, du Centre régional au pont de l'Alma : les pavillons étrangers sur le quai d'Orsay, bâtis du quai à
// la berge par-dessus la tranchée du chemin de fer ; de l'ouest à l'est, les États-Unis, la Tchécoslovaquie, la Suède,
// la Grande-Bretagne, puis, passé le pont d'Iéna, la Belgique, la Suisse et l'Italie, et des pavillons français jusqu'à
// l'Alma. [nom, v0, v1, profondeur, hauteur, options] ; la façade donne sur la Seine.
const QUAI = [
  ['États-Unis', 196, 156, 32, 12, { tour: [10, 34] }],
  ['Tchécoslovaquie', 146, 114, 26, 12, { verre: true, mat: 30 }],
  ['Suède', 104, 74, 26, 9, { col: C(226, 220, 204) }],
  ['Grande-Bretagne', 64, 22, 30, 14, { col: BLANC }],
  ['Belgique', -22, -72, 24, 14, { col: C(214, 186, 150), rotonde: 9 }],
  ['Suisse', -82, -112, 30, 14, { verre: true }],
  ['Italie', -122, -200, 50, 12, { italie: true }],
  ['Élégance et parure', -210, -262, 26, 12, {}],
  ['Grands Magasins du Louvre', -272, -304, 24, 10, { col: C(232, 222, 200) }],
  ['Restaurant', -314, -336, 20, 7, {}],
  ['Bijouterie', -346, -374, 22, 9, {}],
  ['Ministère de l’Agriculture', -386, -432, 26, 10, { col: C(226, 216, 194) }],
];
function quaiOrsay(app, B) {
  const M = app.monuments;
  for (const [nom, v0, v1, lu, h, o] of QUAI) {
    const vm = (v0 + v1) / 2, lv = Math.abs(v1 - v0), a = -Math.atan((riveG(v1) - riveG(v0)) / (v1 - v0)) / deg;
    const u = riveG(vm) + lu / 2 + 1;
    if (o.italie) {                                     // l'Italie (Piacentini) : deux corps en travers, une cour-jardin ouverte sur la Seine, une tour carrée
      const L = repere(AXE.P(u, vm), tourner(AXE, a));
      for (const t of [-lv / 2 + 6, lv / 2 - 6]) bloc(app, B, L, 0, t, lu, 12, h, { col: C(236, 226, 206), bandes: 1 });
      bloc(app, B, L, lu / 2 - 8, 0, 10, lv - 24, h - 3, { col: C(236, 226, 206), bandes: 1 });
      const tc = L.P(lu / 2 - 10, -lv / 2 + 10), yt = app.terrain.height(tc[0], tc[1]);
      const top = tourCarree(app, B, tc, L.d, 7, 7, yt - 1, yt + 40, { col: C(226, 214, 190), cotes: 3 });
      cyl(B.at('plain', tc[0], tc[1]), tc[0], tc[1], 1.2, top, top + 6, { col: OR, seg: 8 });            // le Génie du fascisme, statue équestre (évoquée)
      app.landmarks.push({ x: tc[0], z: tc[1], top: top + 6 }); M['Pavillon ' + nom] = { x: tc[0], z: tc[1], top: top + 10 };
      continue;
    }
    const S = bloc(app, B, AXE, u, vm, lu, lv, h, { a, col: o.col, verre: o.verre });
    if (o.rotonde) { const p = S.L.P(-lu / 2 - o.rotonde + 3, 0), y = app.terrain.height(p[0], p[1]); cyl(B.at('plain', p[0], p[1]), p[0], p[1], o.rotonde, y - 3, S.yt - 2, { col: VERRE, seg: 18 }); cyl(B.at('plain', p[0], p[1]), p[0], p[1], o.rotonde + 0.5, S.yt - 2, S.yt - 1.2, { col: o.col || BLANC, seg: 18 }); }
    if (o.tour) { const [w, ht] = o.tour, p = S.L.P(lu / 2 - w / 2, 0); tourCarree(app, B, p, S.d, w / 2, w / 2, S.y0, S.yb + ht, { col: BLANC, cotes: 3 }); app.landmarks.push({ x: p[0], z: p[1], top: S.yb + ht }); }
    if (o.mat) { const p = S.L.P(lu / 2 - 2, lv / 2 - 2); box(B.at('plain', p[0], p[1]), { cx: p[0], cz: p[1], ux: 1, uz: 0, hl: 0.3, hw: 0.3 }, S.yt, S.yb + o.mat, { col: BLANC }); }
    M['Pavillon ' + nom] = { x: S.c[0], z: S.c[1], top: S.yt + 6 };
  }
  // le Centre des métiers, sur le terrain du quai d'Orsay entre l'avenue de La Bourdonnais et l'avenue Rapp : des halles
  // autour d'une cour (l'emplacement de l'actuel musée du quai Branly)
  for (const [u, v, lu, lv, h, o] of [[-108, -310, 22, 200, 12, { a: -8 }], [-58, -232, 40, 70, 14, {}], [-58, -330, 40, 90, 16, { verre: true }], [-48, -412, 34, 50, 12, {}], [-20, -270, 18, 60, 10, {}]])
    bloc(app, B, AXE, u, v, lu, lv, h, { col: C(232, 226, 212), ...o });
  { const c = AXE.P(-60, -320); M.CentreMetiers = { x: c[0], z: c[1], top: app.terrain.height(c[0], c[1]) + 30 }; }
}

// ---- le Champ-de-Mars : de part et d'autre du grand parterre, les pavillons de la diffusion artistique et technique,
// puis, au sud du carrefour central, les sections étrangères ; le pavillon de la Publicité sous les platanes de l'allée
// ouest ; au bout, devant l'École militaire, le palais de la Lumière de Mallet-Stevens, dont le mur courbe ferme la
// perspective. [nom, u0, u1, côté (1 : ouest, −1 : est), hauteur, options]
const CHAMP = [
  ['Canada', 70, 100, 1, 10, {}], ['Jouets', 106, 130, 1, 8, {}], ['Garderie d’enfants', 136, 160, 1, 7, {}], ['Radio, télévision, presse', 166, 190, 1, 10, {}],
  ['Restaurant', 70, 96, -1, 8, {}], ['Congo belge', 102, 130, -1, 9, { col: OCRE }], ['Cinéma, photo, phono', 136, 168, -1, 11, {}], ['Poste de police', 172, 186, -1, 7, {}],
  ['Stands publicitaires', 192, 250, -1, 8, {}], ['Couleurs et vernis', 258, 300, -1, 9, {}], ['Étalages', 308, 350, -1, 9, {}],
  ['Alimentation', 410, 450, 1, 9, {}], ['Matières plastiques', 458, 490, 1, 9, {}], ['Algérie', 498, 534, 1, 9, { col: BLANC }], ['Haïti', 542, 566, 1, 8, {}], ['Banque transatlantique', 574, 604, 1, 9, {}],
  ['Bulgarie', 612, 640, 1, 9, {}], ['Pavillon international', 648, 684, 1, 10, {}], ['Pérou', 692, 718, 1, 9, { col: OCRE }], ['Venezuela', 726, 754, 1, 9, {}],
  ['Grande masse des Beaux-Arts', 410, 446, -1, 9, {}], ['Enseignement', 454, 494, -1, 10, {}], ['Mexique', 502, 530, -1, 9, { col: OCRE }], ['Restaurant', 538, 560, -1, 7, {}],
  ['Australie', 568, 600, -1, 9, {}], ['Union sud-africaine', 608, 640, -1, 9, {}], ['Irak', 648, 674, -1, 9, {}], ['Brésil', 682, 716, -1, 10, {}], ['Grande masse des arts décoratifs', 724, 754, -1, 9, {}],
];
function champDeMars(app, B) {
  const M = app.monuments, V = EXPO.vc;
  for (const [nom, u0, u1, s, h, o] of CHAMP) { const S = bloc(app, B, AXE, (u0 + u1) / 2, V + s * 72, u1 - u0, 18, h, o); if (!M['Pavillon ' + nom]) M['Pavillon ' + nom] = { x: S.c[0], z: S.c[1], top: S.yt + 6 }; }
  // la Publicité : galerie de 150 m sous les platanes, façade de 15 m, plan incliné de 28 m au-dessus de l'entrée, trois halls de 17 m
  { bloc(app, B, AXE, 270, V + 92, 150, 9, 7, { col: BLANC, bandes: 1 });
    for (const u of [215, 270, 325]) bloc(app, B, AXE, u, V + 122, 44, 40, 17, { col: C(226, 222, 212), bandes: 0 });
    bloc(app, B, AXE, 270, V + 80, 60, 2, 15, { col: C(70, 120, 170), bandes: 0 });
    const L = repere(AXE.P(270, V + 76), AXE.d), y = app.terrain.height(...L.P(0, 0)), b = B.at('plain', ...L.P(0, 0)), a1 = P3(L, -12, -6, y + 15), a2 = P3(L, 12, -6, y + 15), a3 = P3(L, 12, 2, y + 28), a4 = P3(L, -12, 2, y + 28);
    b.quad(a1[0], a1[1], a1[2], a2[0], a2[1], a2[2], a3[0], a3[1], a3[2], a4[0], a4[1], a4[2], 0, 0, 1, 1, C(220, 80, 60), 0.9, 1); b.quad(a4[0], a4[1], a4[2], a3[0], a3[1], a3[2], a2[0], a2[1], a2[2], a1[0], a1[1], a1[2], 0, 0, 1, 1, C(200, 70, 50), 0.9, 1);
    for (const s of [-11, -4, 4, 11]) { const p = L.P(s, 0); box(b, { cx: p[0], cz: p[1], ux: L.d[0], uz: L.d[1], hl: 0.3, hw: 0.3 }, y, y + 15 + (13 * 6) / 8, { col: GRIS }); }
    M.Publicite = { x: L.P(0, 0)[0], z: L.P(0, 0)[1], top: y + 34 }; }
  // le palais de la Lumière : la salle de la Fée Électricité de Dufy (60 m sur 10) et le mur courbe tourné vers la tour
  { const S = bloc(app, B, AXE, 812, V, 34, 74, 14, { col: C(226, 228, 230), bandes: 0 }), L = repere(AXE.P(793, V), AXE.d), R = 70, b = B.at('plain', S.c[0], S.c[1]);
    let prev = null; for (let k = 0; k <= 12; k++) { const t = (-1 + (2 * k) / 12) * 0.56, p = L.P(R * Math.cos(t) - R, R * Math.sin(t));          // concave vers la tour
      if (prev) { const m = [(p[0] + prev[0]) / 2, (p[1] + prev[1]) / 2], l = Math.hypot(p[0] - prev[0], p[1] - prev[1]), ux = (p[0] - prev[0]) / l, uz = (p[1] - prev[1]) / l, y = app.terrain.height(m[0], m[1]);
        box(b, { cx: m[0], cz: m[1], ux, uz, hl: l / 2 + 0.1, hw: 0.8 }, y - 1, y + 18, { col: C(240, 238, 232), s0: 0.9 }); app.foot.push({ ring: [[prev[0] - uz, prev[1] + ux], [p[0] - uz, p[1] + ux], [p[0] + uz, p[1] - ux], [prev[0] + uz, prev[1] - ux]], top: y + 18 }); }
      prev = p; }
    M.Lumiere = { x: S.c[0], z: S.c[1], top: S.yt + 14 }; }
}

// ---- le Centre régional, sur le quai entre la tour et le pont de Passy : vingt-cinq pavillons des provinces, chacun
// dans le style de sa région — murs blancs ou de pierre, toits de tuile ou d'ardoise.
const REGIONS = ['Corse', 'Côte d’Azur', 'Provence', 'Pyrénées atlantiques', 'Guyenne et Gascogne', 'Poitou', 'Bretagne', 'Vallée de la Loire', 'Normandie', 'Nivernais et Berry', 'Massif central', 'Artois et Flandre', 'Champagne', 'Limousin et Périgord', 'Alsace', 'Bourgogne et Franche-Comté', 'Dauphiné', 'Savoie', 'Lorraine', 'Île-de-France', 'Lyonnais', 'Forez et Vivarais', 'Pyrénées et Languedoc', 'Roussillon', 'Languedoc'];
const MIDI = new Set(['Corse', 'Côte d’Azur', 'Provence', 'Roussillon', 'Languedoc', 'Pyrénées et Languedoc', 'Guyenne et Gascogne', 'Forez et Vivarais', 'Lyonnais']);
function centreRegional(app, B) {
  const M = app.monuments; let k = 0;
  for (const [v0, v1, rangs] of [[214, 340, 3], [350, 470, 2]]) {
    const n = 5;
    for (let i = 0; i < n && k < REGIONS.length; i++) for (let r = 0; r < rangs && k < REGIONS.length; r++) {
      const nom = REGIONS[k++], v = v0 + ((v1 - v0) * (i + 0.5)) / n, u = riveG(v) + 14 + r * 30 + ((i + r) % 2) * 4, midi = MIDI.has(nom);
      const S = bloc(app, B, AXE, u, v + (r % 2 ? 4 : -2), 16 + ((k * 7) % 3) * 4, 11 + ((k * 5) % 3) * 2, 6 + ((k * 3) % 3), { a: (k % 3) - 1, col: midi ? C(240, 232, 214) : nom === 'Bretagne' || nom === 'Normandie' ? C(214, 206, 192) : C(232, 222, 202), toit: [4 + (k % 2) * 2, midi ? TUILE : k % 2 ? ARDOISE : C(150, 84, 62)], bandes: 0 });
      M['Pavillon ' + nom] = { x: S.c[0], z: S.c[1], top: S.yt + 5 };
    }
  }
  { const c = AXE.P(-90, 330); M.CentreRegional = { x: c[0], z: c[1], top: app.terrain.height(c[0], c[1]) + 30 }; }
}

// ---- l'île aux Cygnes : le Centre des colonies, ses pavillons sur des plates-formes au-dessus de l'eau.
const COLONIES = [
  ['États du Levant', 620, 26, 9, { col: BLANC, dome: 5 }], ['Maroc', 660, 34, 9, { col: BLANC, toit: [4, C(60, 120, 90)], minaret: 18 }], ['Afrique-Équatoriale française', 710, 30, 8, { col: OCRE }],
  ['Guadeloupe', 752, 22, 7, { col: C(236, 226, 206), toit: [4, TUILE] }], ['Martinique', 786, 22, 7, { col: C(236, 226, 206), toit: [4, TUILE] }], ['Indochine', 830, 40, 9, { col: C(196, 84, 60), toit: [7, C(120, 50, 40)] }],
  ['Indes françaises', 880, 26, 9, { col: C(236, 220, 190), dome: 5 }], ['Madagascar', 922, 28, 7, { col: C(200, 172, 132), toit: [7, C(140, 120, 80)] }], ['Réunion', 960, 22, 7, { col: C(236, 226, 206), toit: [4, TUILE] }],
  ['Afrique-Occidentale française', 1010, 44, 10, { col: C(186, 132, 88), aof: true }], ['Territoires sous mandat', 1066, 30, 8, {}], ['Algérie', 1116, 40, 9, { col: BLANC, dome: 7 }], ['Tunisie', 1170, 36, 9, { col: BLANC, dome: 6, minaret: 20 }],
];
function colonies(app, B) {
  const M = app.monuments;
  for (const [nom, v, lv, h, o] of COLONIES) {
    const a = -Math.atan((ile(v + 20) - ile(v - 20)) / 40) / deg, S = bloc(app, B, AXE, ile(v), v, 30, lv, h, { a, col: o.col, toit: o.toit, bandes: o.toit ? 0 : 1 }), bp = B.at('plain', S.c[0], S.c[1]);
    if (o.dome) { cyl(bp, S.c[0], S.c[1], o.dome, S.yt - 0.6, S.yt + 2, { col: o.col, seg: 16 }); calotte(bp, S.c[0], S.c[1], o.dome, S.yt + 2, S.yt + 2 + o.dome, BLANC, 16); }
    if (o.minaret) { const p = S.L.P(10, lv / 2 - 3); tourCarree(app, B, p, S.d, 1.8, 1.8, S.y0, S.yb + o.minaret, { col: o.col }); }
    if (o.aof) for (let i = 0; i < 9; i++) { const p = S.L.P(-15.3, -lv / 2 + 3 + ((lv - 6) * i) / 8); cone(bp, p[0], p[1], 1.1, S.yt, S.yt + 4, { col: o.col, seg: 6 }); }
    M['Pavillon ' + nom] = { x: S.c[0], z: S.c[1], top: S.yt + 8 };
  }
  { const c = AXE.P(ile(900), 900); M.Colonies = { x: c[0], z: c[1], top: app.terrain.height(c[0], c[1]) + 26 }; }
}

// ---- rive droite, du pont des Invalides à l'Alma (repère du Cours-la-Reine de la page de 1900 : u vers l'aval depuis
// le pont des Invalides, v vers le nord ; le quai haut en v = 0, la berge en dessous) : les concessions scientifiques
// et d'art ; au débouché du pont Alexandre-III, la porte d'honneur de Jacques Debat-Ponsan et son « signal », un mât
// d'acier en fuseau de 100 m posé sur une rotule à 5 m, tenu par trois nappes de haubans ancrées à 41 m et attachées à
// 70 m, qui porte une couronne de 7 m.
const RD = repere([-2890, -1262], [-0.9995, 0.03]);
function riveDroiteAval(app, B) {
  const M = app.monuments;
  for (const [u0, u1, h, o] of [[40, 96, 10, {}], [110, 150, 9, { dome: 8 }], [164, 220, 11, {}], [236, 270, 8, {}], [286, 344, 10, { verre: true }], [360, 400, 9, {}], [414, 470, 12, { dome: 10 }], [486, 530, 9, {}], [546, 600, 10, {}]]) {
    const S = bloc(app, B, RD, (u0 + u1) / 2, -6, u1 - u0, 24, h, { col: C(236, 232, 222), verre: o.verre });
    if (o.dome) { const bp = B.at('plain', S.c[0], S.c[1]); cyl(bp, S.c[0], S.c[1], o.dome, S.yt - 0.6, S.yt + 3, { col: BLANC, seg: 18 }); calotte(bp, S.c[0], S.c[1], o.dome, S.yt + 3, S.yt + 3 + o.dome * 0.8, C(170, 190, 200), 18); }
  }
  { const c = RD.P(320, -6); M.Concessions = { x: c[0], z: c[1], top: app.terrain.height(c[0], c[1]) + 30 }; }
  // le signal de la porte d'honneur
  { const c = RD.P(-236, 36), y = app.terrain.height(c[0], c[1]), b = B.at('plain', c[0], c[1]);
    cone(b, c[0], c[1], 2.6, y - 0.5, y + 5, { col: GRIS, seg: 8 });
    const fus = (t) => 0.4 + 1.6 * Math.sin(Math.PI * Math.min(1, t)), N = 10;
    for (let k = 0; k < N; k++) { const ya = y + 5 + (95 * k) / N, yb = y + 5 + (95 * (k + 1)) / N; cyl(b, c[0], c[1], fus(k / N), ya, yb, { col: C(200, 60, 50), seg: 3, r1: fus((k + 1) / N) }); }
    cyl(b, c[0], c[1], 3.5, y + 84, y + 85, { col: OR, seg: 16 }); cyl(b, c[0], c[1], 3.1, y + 84, y + 85, { col: OR, seg: 16 });
    for (let i = 0; i < 3; i++) for (const e of [-0.12, 0.12]) { const a = (2 * Math.PI * i) / 3 + e + 0.5, p = [c[0] + 41 * Math.cos(a), c[1] + 41 * Math.sin(a)], yp = app.terrain.height(p[0], p[1]);
      poutre(b, [p[0], yp, p[1]], [c[0], y + 70, c[1]], 0.06, C(60, 60, 60)); }
    app.foot.push({ ring: repere(c, [1, 0]).rect(-3, 3, -3, 3), top: y + 100 }); app.v89.reserves.push(boite(repere(c, [1, 0]).rect(-4, 4, -4, 4)));
    app.landmarks.push({ x: c[0], z: c[1], top: y + 100 }); M.PorteHonneur = { x: c[0], z: c[1], top: y + 104 }; }
}

// ---- l'Esplanade des Invalides : le palais de l'Air (Audoul, Hartwig et Gérodias ; décors de Robert et Sonia Delaunay),
// 166 m sur 36, sur la plate-forme de la gare des Invalides, sa coupole de rhodoïd et sa lanterne ; le palais des
// Chemins de fer, en face ; le pavillon de la Navigation ; au sud, le parc d'attractions et le planétarium.
function esplanade(app, B) {
  const M = app.monuments, F = repere([-2678, -995], [0, -1]);          // u vers le nord (la Seine), v vers l'est, depuis le milieu du quartier nord
  const air = bloc(app, B, F, 0, 30, 166, 36, 20, { col: C(232, 232, 228), bandes: 1 });
  { const p = F.P(-92, 30), y = app.terrain.height(p[0], p[1]), b = B.at('plain', p[0], p[1]); cyl(b, p[0], p[1], 11, y - 0.5, y + 8, { col: VERRE, seg: 20 }); calotte(b, p[0], p[1], 11, y + 8, y + 19, C(190, 214, 220), 20);
    const q = F.P(-92, 50); cyl(b, q[0], q[1], 3.5, y - 0.5, y + 30, { col: VERRE, seg: 12 }); cyl(b, q[0], q[1], 4.2, y + 30, y + 31, { col: BLANC, seg: 12 }); app.foot.push({ ring: F.rect(-103, -81, 19, 41), top: y + 19 }); }
  M.PalaisAir = { x: air.c[0], z: air.c[1], top: air.yt + 10 };
  const rail = bloc(app, B, F, 0, -88, 150, 40, 20, { col: C(234, 226, 210), bandes: 1 });
  for (let i = 0; i < 5; i++) { const p = rail.L.P(-60 + 30 * i, 20.3); box(B.at('plain', p[0], p[1]), { cx: p[0], cz: p[1], ux: rail.d[0], uz: rail.d[1], hl: 12, hw: 0.15 }, rail.yb + 3, rail.yb + 15, { col: [C(220, 70, 50), C(40, 90, 170), C(240, 190, 60), C(60, 140, 90), C(200, 80, 140)][i], top: false }); }
  M.PalaisRail = { x: rail.c[0], z: rail.c[1], top: rail.yt + 10 };
  bloc(app, B, F, 40, -30, 70, 26, 14, { col: C(226, 232, 236), bandes: 1 });
  // le parc d'attractions
  const planet = F.P(-250, 40), yp = app.terrain.height(planet[0], planet[1]), b = B.at('plain', planet[0], planet[1]);
  cyl(b, planet[0], planet[1], 12, yp - 0.5, yp + 8, { col: BLANC, seg: 20 }); calotte(b, planet[0], planet[1], 12.4, yp + 8, yp + 20, C(200, 200, 196), 20);
  app.foot.push({ ring: repere(planet, [1, 0]).rect(-12, 12, -12, 12), top: yp + 20 }); app.v89.reserves.push(boite(repere(planet, [1, 0]).rect(-13, 13, -13, 13)));
  M.Planetarium = { x: planet[0], z: planet[1], top: yp + 26 };
  for (const [u, v, lu, lv, h] of [[-200, -60, 30, 14, 7], [-240, -90, 18, 18, 9], [-290, -60, 26, 12, 6], [-300, 60, 22, 16, 8], [-200, 70, 16, 24, 7], [-340, -20, 30, 10, 6]])
    bloc(app, B, F, u, v, lu, lv, h, { col: [C(236, 210, 180), C(220, 230, 236), C(240, 226, 206)][Math.abs(u + v) % 3], bandes: 1 });
  { const c = F.P(-260, 0); M.Attractions = { x: c[0], z: c[1], top: app.terrain.height(c[0], c[1]) + 24 }; }
}

// Le bâti évoqué qui tombe dans l'Exposition s'efface : terrains de l'Exposition (quais, Centre des métiers, Centre
// régional, berges), dans le repère de l'axe [u0, u1, v0, v1]. Le bâti réel y reste.
const TERRAINS = [[-200, 70, 200, 560], [-200, -100, -680, 210], [-140, 20, -470, -180]];
export function terrainsExpo() { return TERRAINS.map(([u0, u1, v0, v1]) => AXE.rect(u0, u1, v0, v1)); }

export function batirExpo37(app, B) {
  trocadero(app, B); quaiOrsay(app, B); riveDroiteAmont(app, B); champDeMars(app, B); centreRegional(app, B); colonies(app, B); riveDroiteAval(app, B); esplanade(app, B);
}
