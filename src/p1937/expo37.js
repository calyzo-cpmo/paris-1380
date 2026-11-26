// L'Exposition internationale des arts et des techniques appliqués à la vie moderne (25 mai - 25 novembre 1937), des
// jardins du Trocadéro au Champ-de-Mars, sur les deux rives de la Seine, de l'île aux Cygnes à l'Esplanade des Invalides.
//
// Trois plans à l'échelle fixent les terrains et les grands partis :
// - le plan directeur de l'Exposition (Services d'architecture et des promenades, R. Martzloff, Ch. Letrosne, J. Gréber,
//   É. Crevel ; août 1935, au 1:2 000 ; musée Carnavalet, Paris Musées, CC0), posé sur la maquette par tools/plan1935.py
//   (2 m d'écart médian sur les rues voisines, une dizaine par endroits) : la limite du Champ-de-Mars, ses ailes et ses
//   galeries, les bandes bâties du quai d'Orsay, le Centre des métiers, l'île aux Cygnes, l'Esplanade, les concessions du
//   Cours-la-Reine ;
// - le plan des emplacements concédés (1935, au 1:5 000 ; BnF, GE C-3042, sur Wikimedia Commons), qui confirme les limites ;
// - le plan du Centre régional (14 avril 1937, au 1:500 ; BnF, GE B-6064, sur Wikimedia Commons) : ses vingt-cinq emprises.
// Le plan directeur précède l'Exposition de deux ans : les pavillons étrangers, attribués en 1936, n'y sont pas. Leur
// ordre vient du plan général de l'Exposition (R. Martzloff, J. Gréber ; Wikimedia Commons, « Plan général de
// l'Exposition universelle de 1937 ») et de la légende numérotée de son encart, une vue cavalière qui ne se cale pas sur
// la maquette : dans les jardins du Trocadéro et du Champ-de-Mars et sur l'île, ils sont placés à la main, dans le
// repère de l'axe Trocadéro - École militaire (u depuis la tour vers l'École militaire, v vers Grenelle) et le long
// des berges relevées dans les données. Les planches de contrôle — un plan redressé sous les emprises de la page — se
// refont avec tools/emprises1937.mjs et tools/plan1935.py.
// Les cotes publiées viennent de L'Architecture d'aujourd'hui, août 1937 (numéro de l'Exposition) : pavillon de l'URSS,
// 160 sur 21 m, statue posée à 33 m ; pavillons de l'URSS et de l'Allemagne bâtis au-dessus des rampes de l'avenue de
// Tokio, de part et d'autre du tunnel de la place de Varsovie ; tour allemande de 54 m, salle de 21 m de large et 18 m
// de haut ; palais de l'Air, 166 m sur 36, 20 et 21 m de haut ; pavillon du Yachting, 100 m sur 20 sur la berge ;
// mât de la porte d'honneur, 100 m, haubané à 41 m ; pavillon de la Publicité, façade de 15 m, plan incliné de 28 m.
// Le pavillon pontifical (campanile de 75 m, statue de 7 m, dôme à 40 m) d'après la notice de Wikipédia. Le reste —
// emprises, hauteurs, silhouettes — est une évocation.
import { box, cyl, cone, gableRoof, rgb, ccw } from '../builder.js';
import { repere, boite, pan } from '../p1889/corps.js';
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
// comble à deux versants, et en troisième terme les options de gableRoof : overhang, hip), y0 (pied imposé), dalle
// (débord de la terrasse). Rend { L (repère local), c, d, y0, yb, ye (égout), yt (faîte ou terrasse) }.
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
  if (o.toit) { const [hr, ct, ot] = o.toit, rr = lu >= lv ? r : { cx: c[0], cz: c[1], ux: -d[1], uz: d[0], hl: lv / 2, hw: lu / 2 }; top = gableRoof(B.at('roof', c[0], c[1]), bp, rr, yt, hr, { col: ct || TUILE, gable: { col }, ...(ot || {}) }); }
  else { const db = o.dalle ?? 0.5; box(bp, { ...r, hl: r.hl + db, hw: r.hw + db }, yt, yt + 0.6, { col: o.dalleCol || col }); top = yt + 0.6; }
  app.foot.push({ ring, top }); app.v89.reserves.push(boite(L.rect(-lu / 2 - 1, lu / 2 + 1, -lv / 2 - 1, lv / 2 + 1)));
  return { L, c, d, y0, yb, ye: yt, yt: top };
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
// l'Alma. [nom, v0, v1, profondeur, hauteur, options] ; la façade donne sur la Seine. Les deux bandes bâties sont
// celles du plan directeur d'août 1935 (tools/plan1935.py) : elles ne commencent qu'à une cinquantaine de mètres de
// l'axe, passé les têtes arrondies du pont d'Iéna élargi, et vont à l'ouest jusqu'au droit de l'avenue de Suffren, où
// le plan du Centre régional (14 avril 1937) met le pavillon des États-Unis, à l'est jusqu'aux concessions des grands
// magasins. La part de chaque pavillon dans sa bande est une évocation.
const QUAI = [
  ['États-Unis', 270, 215, 34, 12, { tour: [10, 34] }],
  ['Tchécoslovaquie', 205, 165, 28, 12, { verre: true, mat: 30 }],
  ['Suède', 155, 120, 28, 9, { col: C(226, 220, 204) }],
  ['Grande-Bretagne', 112, 70, 32, 14, { col: BLANC }],
  ['Belgique', -50, -100, 28, 14, { col: C(214, 186, 150), rotonde: 9 }],
  ['Suisse', -110, -142, 30, 14, { verre: true }],
  ['Italie', -152, -230, 50, 12, { italie: true }],
  ['Élégance et parure', -250, -302, 26, 12, {}],
  ['Grands Magasins du Louvre', -312, -344, 24, 10, { col: C(232, 222, 200) }],
  ['Restaurant', -354, -376, 20, 7, {}],
  ['Bijouterie', -386, -414, 22, 9, {}],
  ['Ministère de l’Agriculture', -426, -472, 26, 10, { col: C(226, 216, 194) }],
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
  // le Centre des métiers, sur le terrain du quai d'Orsay entre l'avenue de La Bourdonnais et l'avenue Rapp (l'emplacement
  // de l'actuel musée du quai Branly), d'après le plan directeur d'août 1935 (tools/plan1935.py) : une enceinte de
  // galeries le long de l'avenue, de la rue de l'Université et du fond du terrain ; au nord une galerie sur les jardins
  // du quai ; au milieu deux halles aux bouts arrondis et un peigne de trois ailes ; des pavillons au nord-est.
  // [u, v, longueur selon u, selon v, hauteur, options]
  for (const [u, v, lu, lv, h, o] of [[-43, -264.5, 98, 11, 9, {}], [-87, -331, 13, 92, 9, {}], [-57, -328, 34, 84, 13, { verre: true }], [-9, -302.5, 37, 10, 8, {}], [-9, -319, 37, 11, 8, {}], [-9, -339, 37, 12, 8, {}],
    [10.5, -395, 39, 70, 13, { verre: true, a: 20 }], [41, -347.5, 9, 189, 9, { a: 22.5 }], [14, -456, 133, 12, 9, { a: 16.4 }], [-50, -414, 40, 52, 11, {}]])
    bloc(app, B, AXE, u, v, lu, lv, h, { col: C(232, 226, 212), ...o });
  { const c = AXE.P(-60, -320); M.CentreMetiers = { x: c[0], z: c[1], top: app.terrain.height(c[0], c[1]) + 30 }; }
}

// ---- le Champ-de-Mars. L'Exposition n'en occupe que la moitié nord, de la tour à l'hémicycle de l'avenue
// Joseph-Bouvard : c'est la limite des terrains concédés (convention du 15 mai 1934, plan des emplacements au 1:5 000)
// et celle du plan directeur d'août 1935, relevé à l'échelle (tools/plan1935.py). De ce plan viennent : les deux
// ailes de la « diffusion artistique et technique » (classes 14 à 16 : photographie, cinéma et phonographe, radio,
// presse), du quai aux piles de la tour ; au-delà, deux galeries basses qui serrent le grand parterre à 29 m de l'axe
// jusqu'à l'hémicycle — à l'ouest celle de la Publicité, 150 m sous les platanes — ; au bout, sur l'hémicycle, la
// place du palais de la Lumière de Mallet-Stevens, dont le mur courbe ferme la perspective. Les petits pavillons
// tiennent dans les jardins à l'anglaise, de part et d'autre : leur ordre vient du plan général, la place de chacun
// est une évocation.
// Ailes, de chaque côté de l'axe : [u0, u1, r0, r1 (distance à l'axe), hauteur]. Entre u = −62 et 62, les piles de la tour.
const AILES = [[-114, -96, 25, 66, 9], [-112, -104, 66, 156, 5], [-96, -66, 25, 55, 9], [66, 98, 25, 34, 7]];
// Galeries du parterre, côté est : [nom, u0, u1] ; côté ouest, la galerie de la Publicité.
const GALERIES = [['Stands publicitaires', 100, 158], ['Couleurs et vernis', 164, 214], ['Étalages', 220, 270]];
// Petits pavillons des jardins : [nom, côté (1 : ouest, −1 : est), longueur, hauteur, options], par six sur deux rangs.
const CHAMP = [
  ['Canada', 1, 26, 10, {}], ['Jouets', 1, 22, 8, {}], ['Garderie d’enfants', 1, 22, 7, {}], ['Alimentation', 1, 26, 9, {}], ['Matières plastiques', 1, 24, 9, {}], ['Algérie', 1, 26, 9, { col: BLANC }],
  ['Haïti', 1, 20, 8, {}], ['Banque transatlantique', 1, 24, 9, {}], ['Bulgarie', 1, 22, 9, {}], ['Pavillon international', 1, 26, 10, {}], ['Pérou', 1, 22, 9, { col: OCRE }], ['Venezuela', 1, 22, 9, {}],
  ['Restaurant', -1, 22, 8, {}], ['Congo belge', -1, 24, 9, { col: OCRE }], ['Poste de police', -1, 14, 7, {}], ['Grande masse des Beaux-Arts', -1, 26, 9, {}], ['Enseignement', -1, 26, 10, {}], ['Mexique', -1, 24, 9, { col: OCRE }],
  ['Restaurant', -1, 20, 7, {}], ['Australie', -1, 24, 9, {}], ['Union sud-africaine', -1, 24, 9, {}], ['Irak', -1, 22, 9, {}], ['Brésil', -1, 26, 10, {}], ['Grande masse des arts décoratifs', -1, 24, 9, {}],
];
export const CHAMP_FIN = 332;                       // l'avenue Joseph-Bouvard : au-delà, le Champ-de-Mars reste un jardin public
function champDeMars(app, B) {
  const M = app.monuments, V = EXPO.vc;
  // les ailes de la diffusion artistique et technique : à l'ouest la radio et la presse, à l'est le cinéma, la photographie et le phonographe
  for (const s of [1, -1]) {
    let tete = null;
    for (const [u0, u1, r0, r1, h] of AILES) { const S = bloc(app, B, AXE, (u0 + u1) / 2, V + (s * (r0 + r1)) / 2, u1 - u0, r1 - r0, h, { col: BLANC, bandes: h > 6 ? 1 : 0 }); tete = tete || S; }
    M[s > 0 ? 'Pavillon Radio, télévision, presse' : 'Pavillon Cinéma, photo, phono'] = { x: tete.c[0], z: tete.c[1], top: tete.yt + 8 };
  }
  // les galeries du parterre : côté est, la publicité par l'objet ; côté ouest, le pavillon de la Publicité
  for (const [nom, u0, u1] of GALERIES) { const S = bloc(app, B, AXE, (u0 + u1) / 2, V - 29, u1 - u0, 8, 7, { col: BLANC, bandes: 1 }); M['Pavillon ' + nom] = { x: S.c[0], z: S.c[1], top: S.yt + 6 }; }
  // la Publicité : galerie de 150 m sous les platanes, façade de 15 m, plan incliné de 28 m au-dessus de l'entrée, trois halls de 17 m derrière
  { bloc(app, B, AXE, 195, V + 29, 150, 9, 7, { col: BLANC, bandes: 1 });
    for (const u of [150, 195, 240]) bloc(app, B, AXE, u, V + 43.5, 40, 17, 9, { col: C(226, 222, 212), bandes: 0 });
    bloc(app, B, AXE, 195, V + 23.5, 60, 2, 15, { col: C(70, 120, 170), bandes: 0 });
    const L = repere(AXE.P(195, V + 21), AXE.d), y = app.terrain.height(...L.P(0, 0)), b = B.at('plain', ...L.P(0, 0)), a1 = P3(L, -12, 3, y + 15), a2 = P3(L, 12, 3, y + 15), a3 = P3(L, 12, -4, y + 28), a4 = P3(L, -12, -4, y + 28);
    b.quad(a1[0], a1[1], a1[2], a2[0], a2[1], a2[2], a3[0], a3[1], a3[2], a4[0], a4[1], a4[2], 0, 0, 1, 1, C(220, 80, 60), 0.9, 1); b.quad(a4[0], a4[1], a4[2], a3[0], a3[1], a3[2], a2[0], a2[1], a2[2], a1[0], a1[1], a1[2], 0, 0, 1, 1, C(200, 70, 50), 0.9, 1);
    for (const s of [-11, -4, 4, 11]) { const p = L.P(s, 0); box(b, { cx: p[0], cz: p[1], ux: L.d[0], uz: L.d[1], hl: 0.3, hw: 0.3 }, y, y + 15 + (13 * 3) / 7, { col: GRIS }); }
    M.Publicite = { x: L.P(0, 0)[0], z: L.P(0, 0)[1], top: y + 34 }; }
  // les petits pavillons, dans les jardins : deux rangs de six de chaque côté, de l'avenue Octave-Gréard à l'hémicycle
  { const rang = { 1: [68, 98], [-1]: [52, 86] }, n = { 1: 0, [-1]: 0 };
    for (const [nom, s, lg, h, o] of CHAMP) { const k = n[s]++, u = 121 + (k % 6) * 32.6, S = bloc(app, B, AXE, u, V + s * rang[s][Math.floor(k / 6)], lg, 16, h, o); if (!M['Pavillon ' + nom]) M['Pavillon ' + nom] = { x: S.c[0], z: S.c[1], top: S.yt + 6 }; } }
  // le palais de la Lumière, sur l'hémicycle : la salle de la Fée Électricité de Dufy (60 m sur 10) et le mur courbe tourné vers la tour
  { const S = bloc(app, B, AXE, 316, V, 28, 74, 14, { col: C(226, 228, 230), bandes: 0 }), L = repere(AXE.P(300, V), AXE.d), R = 70, b = B.at('plain', S.c[0], S.c[1]);
    let prev = null; for (let k = 0; k <= 12; k++) { const t = (-1 + (2 * k) / 12) * 0.56, p = L.P(R * Math.cos(t) - R, R * Math.sin(t));          // concave vers la tour
      if (prev) { const m = [(p[0] + prev[0]) / 2, (p[1] + prev[1]) / 2], l = Math.hypot(p[0] - prev[0], p[1] - prev[1]), ux = (p[0] - prev[0]) / l, uz = (p[1] - prev[1]) / l, y = app.terrain.height(m[0], m[1]);
        box(b, { cx: m[0], cz: m[1], ux, uz, hl: l / 2 + 0.1, hw: 0.8 }, y - 1, y + 18, { col: C(240, 238, 232), s0: 0.9 }); app.foot.push({ ring: [[prev[0] - uz, prev[1] + ux], [p[0] - uz, p[1] + ux], [p[0] + uz, p[1] - ux], [prev[0] + uz, prev[1] - ux]], top: y + 18 }); }
      prev = p; }
    M.Lumiere = { x: S.c[0], z: S.c[1], top: S.yt + 14 }; }
}

// ---- le Centre régional, entre le quai d'Orsay, l'avenue de Suffren et la « rue nouvelle », et sur le quai jusqu'au
// pont de Passy : vingt-cinq pavillons des provinces, chacun dans le style de sa région. Leurs emprises sont relevées
// sur le plan du service d'architecture du Centre régional (« Le Centre régional. Canalisations », 1:500, dressé le
// 14 avril 1937 ; BnF, GE B-6064, sur Wikimedia Commons), posé sur la maquette par l'axe de l'avenue de Suffren, celui
// du quai et celui du pont de Passy (2 à 3 m près) : autour d'une grande place, les lots 1 à 16 ; sur le quai, entre la
// chaussée et la Seine, les lots 2 à 11, avec le fronton de pelote basque et, au bord de l'eau, une tour ronde ; à la
// pointe de l'île aux Cygnes, le lot 17. Le plan numérote les lots sans nommer les régions : la Bretagne (la tour au
// bord de l'eau, son phare) et le Pays basque (le fronton) sont placés d'après lui, l'attribution des autres est une
// évocation. Leurs silhouettes sont une évocation, par familles : toits bas de tuile et clocheton au Midi, grands
// débords des chalets de montagne, colombages et combles raides de Normandie, d'Alsace et de Champagne, granit,
// ardoise et souches de Bretagne et du Massif central, brique des Flandres, combles à croupes d'ardoise du Centre et
// de l'Île-de-France, tuiles vernissées de Bourgogne, tuile creuse à faible pente de Lorraine et du Poitou.
// [nom, u, v, longueur selon u, selon v, rotation] ; en fin de ligne, le lot du plan.
const REGIONAL = [
  ['Alsace', 93, 269, 19, 31, 0], ['Lorraine', 96, 305, 17, 26, 0], ['Champagne', 67, 371, 32, 36, 0], ['Île-de-France', 46, 263, 20, 18, 0],                    // 12, 12', 15, 13'
  ['Bourgogne et Franche-Comté', 44, 334, 23, 34, 0], ['Savoie', 39, 414, 19, 38, 38], ['Dauphiné', 25, 387, 23, 37, 0], ['Lyonnais', 15, 309, 28, 34, 0],     // 14, 16 bis, 16, 14'
  ['Nivernais et Berry', 16, 266, 32, 22, 0], ['Côte d’Azur', 18, 443, 26, 27, 38], ['Provence', -18, 394, 32, 38, 0], ['Languedoc', -18, 429, 43, 24, 0],     // 13, 9 bis, 7 et son voisin
  ['Limousin et Périgord', -22, 267, 24, 24, 0], ['Massif central', -52, 293, 32, 20, 0], ['Forez et Vivarais', -62, 267, 20, 21, 0],                            // 1 bis, 1, 1
  ['Pyrénées et Languedoc', -46, 349, 26, 34, 0], ['Roussillon', -90, 299, 14, 40, -10],                                                                         // 6, 6 bis
  ['Normandie', -19, 546, 15, 49, -20], ['Bretagne', -42, 494, 15, 51, -22], ['Pyrénées atlantiques', -84, 430, 14, 36, -24], ['Guyenne et Gascogne', -98, 382, 19, 24, -22],   // 11, 10, 8, 5
  ['Poitou', -116, 365, 19, 28, -18], ['Vallée de la Loire', -126, 306, 18, 41, -8], ['Artois et Flandre', -150, 291, 18, 43, -6], ['Corse', -144, 524, 15, 17, 0],             // 3, 4, 2, 17
];
const LAUZE = C(96, 96, 98), CHAUME = C(122, 100, 72), VERNIS = C(176, 128, 58), COLOMBAGE = C(74, 52, 40);
const STYLES = {
  midi: { mur: C(240, 228, 206), toit: [2.6, TUILE, { overhang: 0.7 }], clocher: true },
  canal: { mur: C(236, 226, 208), toit: [2.4, C(184, 104, 72), { overhang: 0.6 }] },
  basque: { mur: C(244, 240, 230), toit: [3.4, C(168, 84, 60), { overhang: 1.4 }], colomb: C(132, 42, 36) },
  montagne: { mur: C(226, 214, 190), toit: [3.0, C(112, 106, 102), { overhang: 1.8 }], bois: true },
  colomb: { mur: C(238, 230, 212), toit: [6.5, C(156, 86, 62)], colomb: COLOMBAGE },
  chaume: { mur: C(238, 230, 212), toit: [7.0, CHAUME], colomb: COLOMBAGE },
  granit: { mur: C(190, 188, 182), toit: [5.5, ARDOISE], chem: true },
  lauze: { mur: C(170, 160, 150), toit: [5.0, LAUZE, { hip: 2.5 }], chem: true },
  brique: { mur: C(176, 102, 78), toit: [5.5, ARDOISE], chem: true },
  centre: { mur: C(236, 228, 208), toit: [5.0, ARDOISE, { hip: 3 }], chem: true },
  perigord: { mur: C(222, 196, 150), toit: [6.5, C(136, 84, 60), { hip: 3 }] },
  bourgogne: { mur: C(230, 220, 200), toit: [6.0, VERNIS, { hip: 3 }] },
};
const STYLE_DE = { 'Corse': 'midi', 'Côte d’Azur': 'midi', 'Provence': 'midi', 'Pyrénées atlantiques': 'basque', 'Guyenne et Gascogne': 'canal', 'Poitou': 'canal', 'Bretagne': 'granit',
  'Vallée de la Loire': 'centre', 'Normandie': 'chaume', 'Nivernais et Berry': 'centre', 'Massif central': 'lauze', 'Artois et Flandre': 'brique', 'Champagne': 'colomb', 'Limousin et Périgord': 'perigord',
  'Alsace': 'colomb', 'Bourgogne et Franche-Comté': 'bourgogne', 'Dauphiné': 'montagne', 'Savoie': 'montagne', 'Lorraine': 'canal', 'Île-de-France': 'centre', 'Lyonnais': 'canal',
  'Forez et Vivarais': 'canal', 'Pyrénées et Languedoc': 'midi', 'Roussillon': 'midi', 'Languedoc': 'midi' };

// Détails des petits pavillons : sur un bloc S de lu × lv dont l'égout est à S.ye.
const lame = (S, u, v, hl, hw) => { const p = S.L.P(u, v); return { cx: p[0], cz: p[1], ux: S.d[0], uz: S.d[1], hl, hw }; };
function colombages(bp, S, lu, lv, col) {                              // poteaux et lisse, sur les deux longs pans
  const n = Math.max(3, Math.round(lu / 1.7)), mi = S.y0 + 1 + (S.ye - S.y0 - 1) * 0.5;
  for (const sg of [-1, 1]) {
    for (let i = 0; i <= n; i++) box(bp, lame(S, -lu / 2 + 0.15 + ((lu - 0.3) * i) / n, sg * (lv / 2 + 0.06), 0.13, 0.07), S.y0 + 1.2, S.ye, { col, top: false });
    box(bp, lame(S, 0, sg * (lv / 2 + 0.07), lu / 2, 0.07), mi, mi + 0.24, { col, top: false });
    for (let i = 0; i < n; i += 2) { const u = -lu / 2 + ((lu - 0.3) * (i + 0.5)) / n + 0.15; box(bp, lame(S, u, sg * (lv / 2 + 0.07), 0.5, 0.06), mi + 0.9, mi + 1.1, { col, top: false }); }
  }
}
function souches(bp, S, lu, faite, col) {                              // deux souches de cheminée, aux pignons
  for (const sg of [-1, 1]) box(bp, lame(S, sg * (lu / 2 - 0.8), 0, 0.45, 0.8), S.ye - 1, faite + 1.3, { col, topCol: C(80, 76, 72) });
}
function clocheton(app, B, S, lu, lv, col, toit) {                     // un clocheton carré au coin du pavillon, toit en pavillon de tuile
  const p = S.L.P(lu / 2 - 1.9, lv / 2 - 1.9), yb = S.ye + 4.5;
  tourCarree(app, B, p, S.d, 1.7, 1.7, S.y0, yb, { col });
  gableRoof(B.at('roof', p[0], p[1]), null, { cx: p[0], cz: p[1], ux: S.d[0], uz: S.d[1], hl: 1.7, hw: 1.7 }, yb, 2.2, { col: toit, hip: 1.7, overhang: 0.35 });
}
function galerie(bp, S, lu, lv, col, prof = 2.4) {                     // galerie couverte sur poteaux, le long d'un pan
  const y = S.y0 + 1 + Math.min(3.2, (S.ye - S.y0 - 1) * 0.75), n = Math.max(2, Math.round(lu / 3.5));
  box(bp, lame(S, 0, lv / 2 + prof / 2, lu / 2, prof / 2), y, y + 0.22, { col });
  for (let i = 0; i <= n; i++) box(bp, lame(S, -lu / 2 + 0.3 + ((lu - 0.6) * i) / n, lv / 2 + prof - 0.25, 0.12, 0.12), S.y0 + 1, y, { col: BLANC });
}
function centreRegional(app, B) {
  const M = app.monuments; let k = 0;
  for (const [nom, u, v, lu, lv, a] of REGIONAL) {
    k++; const st = STYLES[STYLE_DE[nom]], h = st.toit[0] > 5.5 ? 5 + (k % 2) : 6 + ((k * 3) % 3);
    const S = bloc(app, B, AXE, u, v, lu, lv, h, { a, col: st.mur, toit: st.toit, bandes: 0 }), bp = B.at('plain', S.c[0], S.c[1]);
    if (st.colomb) colombages(bp, S, lu, lv, st.colomb);
    if (st.bois) box(bp, { ...lame(S, 0, 0, lu / 2 + 0.08, lv / 2 + 0.08) }, S.ye - 2.2, S.ye, { col: BOIS, top: false });     // étage de planches du chalet
    if (st.chem) souches(bp, S, lu, S.yt, st.mur);
    if (st.clocher) clocheton(app, B, S, lu, lv, st.mur, st.toit[1]);
    if (STYLE_DE[nom] === 'basque' || STYLE_DE[nom] === 'montagne') galerie(bp, S, lu * 0.7, lv, st.bois ? BOIS : C(132, 42, 36), 1.6);
    M['Pavillon ' + nom] = { x: S.c[0], z: S.c[1], top: S.yt + 5 };
  }
  // le phare de la Bretagne, au bord de l'eau (la tour ronde du plan), et le fronton de pelote basque
  { const c = AXE.P(-59, 474), y = app.terrain.height(c[0], c[1]), b = B.at('plain', c[0], c[1]); cyl(b, c[0], c[1], 2.6, y - 1, y + 16, { col: C(236, 232, 222), seg: 12, r1: 1.9 }); cyl(b, c[0], c[1], 2.3, y + 16, y + 18.5, { col: VERRE, seg: 12 }); cone(b, c[0], c[1], 2.6, y + 18.5, y + 20.5, { col: ARDOISE, seg: 12 });
    app.foot.push({ ring: repere(c, AXE.d).rect(-2.6, 2.6, -2.6, 2.6), top: y + 20 }); app.landmarks.push({ x: c[0], z: c[1], top: y + 20.5 }); }
  bloc(app, B, AXE, -72, 452, 1.2, 16, 10, { a: -24, col: C(214, 120, 96), bandes: 0, dalle: 0.1 });
  { const c = AXE.P(0, 340); M.CentreRegional = { x: c[0], z: c[1], top: app.terrain.height(c[0], c[1]) + 30 }; }
}

// ---- l'île aux Cygnes : le Centre des colonies. D'après le plan directeur d'août 1935 (tools/plan1935.py), il tient
// toute l'île, du pont de Passy au pont de Grenelle : l'allée des Cygnes reste libre dans l'axe, les pavillons sont
// bâtis de part et d'autre, sur des plates-formes au-dessus de l'eau, sauf au passage du viaduc du chemin de fer.
// L'ordre et la place de chacun sont une évocation.
// [nom, v, longueur, hauteur, options] ; un pavillon sur deux de chaque côté de l'allée.
const COLONIES = [
  ['États du Levant', 625, 26, 9, { col: BLANC, dome: 5 }], ['Maroc', 678, 34, 9, { col: BLANC, toit: [4, C(60, 120, 90)], minaret: 18 }], ['Afrique-Équatoriale française', 740, 30, 8, { col: OCRE, cases: true }],
  ['Guadeloupe', 792, 22, 7, { col: C(236, 226, 206), toit: [4, TUILE, { overhang: 0.8 }], galerie: true }], ['Martinique', 836, 22, 7, { col: C(236, 226, 206), toit: [4, TUILE, { overhang: 0.8 }], galerie: true }],
  ['Indochine', 890, 40, 9, { col: C(196, 84, 60), toit: [7, C(120, 50, 40), { overhang: 1.2 }], etage: true }],
  ['Indes françaises', 948, 26, 9, { col: C(236, 220, 190), dome: 5 }], ['Madagascar', 995, 28, 7, { col: C(200, 172, 132), toit: [7, C(140, 120, 80), { overhang: 1 }], galerie: true }], ['Réunion', 1115, 22, 7, { col: C(236, 226, 206), toit: [4, TUILE, { overhang: 0.8 }], galerie: true }],
  ['Afrique-Occidentale française', 1160, 44, 10, { col: C(186, 132, 88), aof: true }], ['Territoires sous mandat', 1210, 30, 8, {}], ['Algérie', 1255, 40, 9, { col: BLANC, dome: 7 }], ['Tunisie', 1300, 36, 9, { col: BLANC, dome: 6, minaret: 20 }],
];
function colonies(app, B) {
  const M = app.monuments;
  let k = 0;
  for (const [nom, v, lv, h, o] of COLONIES) {
    const lu = 24, cote = k++ % 2 ? 1 : -1, a = -Math.atan((ile(v + 20) - ile(v - 20)) / 40) / deg, S = bloc(app, B, AXE, ile(v) + cote * (lu / 2 + 4), v, lu, lv, h, { a, col: o.col, toit: o.toit, bandes: o.toit ? 0 : 1 }), bp = B.at('plain', S.c[0], S.c[1]);
    if (o.dome) { cyl(bp, S.c[0], S.c[1], o.dome, S.yt - 0.6, S.yt + 2, { col: o.col, seg: 16 }); calotte(bp, S.c[0], S.c[1], o.dome, S.yt + 2, S.yt + 2 + o.dome, BLANC, 16); }
    if (o.minaret) { const p = S.L.P(lu / 2 - 4, lv / 2 - 3); tourCarree(app, B, p, S.d, 1.8, 1.8, S.y0, S.yb + o.minaret, { col: o.col }); }
    if (o.aof) for (let i = 0; i < 9; i++) { const p = S.L.P(-lu / 2 - 0.3, -lv / 2 + 3 + ((lv - 6) * i) / 8); cone(bp, p[0], p[1], 1.1, S.yt, S.yt + 4, { col: o.col, seg: 6 }); }
    if (o.galerie) galerie(bp, S, lu, lv, BOIS, 2.2);                                                            // varangue sur poteaux
    if (o.etage) {                                                                                                // second toit, au-dessus du premier et dans le même sens
      const r2 = lv > 30 ? { cx: S.c[0], cz: S.c[1], ux: -S.d[1], uz: S.d[0], hl: lv / 2 - 6, hw: 8 } : lame(S, 0, 0, 9, lv / 2 - 5);
      box(bp, r2, S.ye + 1, S.yt + 2.5, { col: o.col, top: false }); gableRoof(B.at('roof', S.c[0], S.c[1]), bp, r2, S.yt + 2.5, 4, { col: o.toit[1], overhang: 1, gable: { col: o.col } });
    }
    if (o.cases) for (let i = 0; i < 3; i++) { const p = S.L.P(-6 + i * 6, lv / 2 + 4.5); cyl(bp, p[0], p[1], 2.2, S.y0, S.yb + 2.8, { col: OCRE, seg: 10 }); cone(B.at('roof', p[0], p[1]), p[0], p[1], 2.9, S.yb + 2.6, S.yb + 6, { col: CHAUME, seg: 10 }); }   // cases rondes, toit de chaume
    M['Pavillon ' + nom] = { x: S.c[0], z: S.c[1], top: S.yt + 8 };
  }
  { const c = AXE.P(ile(900), 900); M.Colonies = { x: c[0], z: c[1], top: app.terrain.height(c[0], c[1]) + 26 }; }
}

// ---- rive droite, du pont des Invalides à l'Alma (repère du Cours-la-Reine de la page de 1900 : u vers l'aval depuis
// le pont des Invalides, v vers le nord ; le quai haut en v = 0, la berge en dessous) : les concessions scientifiques
// et d'art, sur les 470 m que leur donne le plan directeur d'août 1935 — de là au pont de l'Alma, des jardins — ; au débouché du pont Alexandre-III, la porte d'honneur de Jacques Debat-Ponsan et son « signal », un mât
// d'acier en fuseau de 100 m posé sur une rotule à 5 m, tenu par trois nappes de haubans ancrées à 41 m et attachées à
// 70 m, qui porte une couronne de 7 m.
const RD = repere([-2890, -1262], [-0.9995, 0.03]);
function riveDroiteAval(app, B) {
  const M = app.monuments;
  for (const [u0, u1, h, o] of [[31, 75, 10, {}], [86, 118, 9, { dome: 8 }], [128, 172, 11, {}], [185, 212, 8, {}], [224, 270, 10, { verre: true }], [282, 313, 9, {}], [324, 368, 12, { dome: 10 }], [381, 415, 9, {}], [428, 470, 10, {}]]) {
    const S = bloc(app, B, RD, (u0 + u1) / 2, -6, u1 - u0, 24, h, { col: C(236, 232, 222), verre: o.verre });
    if (o.dome) { const bp = B.at('plain', S.c[0], S.c[1]); cyl(bp, S.c[0], S.c[1], o.dome, S.yt - 0.6, S.yt + 3, { col: BLANC, seg: 18 }); calotte(bp, S.c[0], S.c[1], o.dome, S.yt + 3, S.yt + 3 + o.dome * 0.8, C(170, 190, 200), 18); }
  }
  { const c = RD.P(250, -6); M.Concessions = { x: c[0], z: c[1], top: app.terrain.height(c[0], c[1]) + 30 }; }
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
// Chemins de fer, en face ; le pavillon de la Navigation ; au sud, le parc d'attractions et le planétarium. Les deux
// palais se font face de part et d'autre de l'axe, à 35 et 40 m, où le plan directeur d'août 1935 met ses deux grands
// corps de bâtiment (tools/plan1935.py) ; le parc d'attractions tient les pelouses du sud.
function esplanade(app, B) {
  const M = app.monuments, F = repere([-2678, -995], [0, -1]);          // u vers le nord (la Seine), v vers l'est, depuis le milieu du quartier nord
  const air = bloc(app, B, F, 0, 40, 166, 36, 20, { col: C(232, 232, 228), bandes: 1 });
  { const p = F.P(-92, 40), y = app.terrain.height(p[0], p[1]), b = B.at('plain', p[0], p[1]); cyl(b, p[0], p[1], 11, y - 0.5, y + 8, { col: VERRE, seg: 20 }); calotte(b, p[0], p[1], 11, y + 8, y + 19, C(190, 214, 220), 20);
    const q = F.P(-92, 60); cyl(b, q[0], q[1], 3.5, y - 0.5, y + 30, { col: VERRE, seg: 12 }); cyl(b, q[0], q[1], 4.2, y + 30, y + 31, { col: BLANC, seg: 12 }); app.foot.push({ ring: F.rect(-103, -81, 29, 51), top: y + 19 }); }
  M.PalaisAir = { x: air.c[0], z: air.c[1], top: air.yt + 10 };
  const rail = bloc(app, B, F, 0, -35, 150, 40, 20, { col: C(234, 226, 210), bandes: 1 });
  for (let i = 0; i < 5; i++) { const p = rail.L.P(-60 + 30 * i, 20.3); box(B.at('plain', p[0], p[1]), { cx: p[0], cz: p[1], ux: rail.d[0], uz: rail.d[1], hl: 12, hw: 0.15 }, rail.yb + 3, rail.yb + 15, { col: [C(220, 70, 50), C(40, 90, 170), C(240, 190, 60), C(60, 140, 90), C(200, 80, 140)][i], top: false }); }
  M.PalaisRail = { x: rail.c[0], z: rail.c[1], top: rail.yt + 10 };
  bloc(app, B, F, 40, -96, 70, 26, 14, { col: C(226, 232, 236), bandes: 1 });
  // le parc d'attractions
  const planet = F.P(-250, 40), yp = app.terrain.height(planet[0], planet[1]), b = B.at('plain', planet[0], planet[1]);
  cyl(b, planet[0], planet[1], 12, yp - 0.5, yp + 8, { col: BLANC, seg: 20 }); calotte(b, planet[0], planet[1], 12.4, yp + 8, yp + 20, C(200, 200, 196), 20);
  app.foot.push({ ring: repere(planet, [1, 0]).rect(-12, 12, -12, 12), top: yp + 20 }); app.v89.reserves.push(boite(repere(planet, [1, 0]).rect(-13, 13, -13, 13)));
  M.Planetarium = { x: planet[0], z: planet[1], top: yp + 26 };
  for (const [u, v, lu, lv, h] of [[-200, -60, 30, 14, 7], [-240, -90, 18, 18, 9], [-290, -60, 26, 12, 6], [-300, 60, 22, 16, 8], [-200, 70, 16, 24, 7], [-340, -20, 30, 10, 6]])
    bloc(app, B, F, u, v, lu, lv, h, { col: [C(236, 210, 180), C(220, 230, 236), C(240, 226, 206)][Math.abs(u + v) % 3], bandes: 1 });
  { const c = F.P(-260, 0); M.Attractions = { x: c[0], z: c[1], top: app.terrain.height(c[0], c[1]) + 24 }; }
}

// ---- la passerelle de l'Alma (Léon-Henry Bloch, architecte ; établissements Daydé, constructeurs), parallèle au pont de
// l'Alma, réservée au public de l'Exposition et démontée après elle. Cotes de L'Architecture d'aujourd'hui, août 1937,
// p. 56-59 (plan, coupe et élévation d'après Le Génie civil) : trois travées de 42,75 (rive droite), 46,40 et 40 m,
// 133,26 m d'une rive à l'autre ; une poutre échelle de type Vierendeel, en caisson de 6 m de large et 6,80 m de haut, où sont logées des
// boutiques ; au-dessus, le passage supérieur, élargi de 6 m en encorbellement vers l'amont ; au pied, le passage
// inférieur, élargi de 6,25 m vers l'aval ; 88 pieux en Seine, 700 tonnes d'acier ; des moulures d'aluminium rouge
// enferment les rampes d'éclairage. Elle part de la porte monumentale de la place de l'Alma (porteAlma, plus bas).
// Sa place est publiée (août 1937, p. 59) : les trois travées prennent appui sur des palées de béton armé « placées
// dans le prolongement aval et à une distance d'environ 15 m des piles et culées du pont de l'Alma » — son axe est
// donc à une trentaine de mètres de celui du pont, ses palées en face des piles.
const ALMA = { n: [-3524, -1222], s: [-3519, -1089], ecart: 30 }, ROUGE_ALU = C(176, 62, 54);
function passerelleAlma(app, B) {
  const T = app.terrain, dx = ALMA.s[0] - ALMA.n[0], dz = ALMA.s[1] - ALMA.n[1], lg = Math.hypot(dx, dz), d = [dx / lg, dz / lg];
  const aval = [-d[1], d[0]], m = [(ALMA.n[0] + ALMA.s[0]) / 2 + aval[0] * ALMA.ecart, (ALMA.n[1] + ALMA.s[1]) / 2 + aval[1] * ALMA.ecart];
  const L = repere(m, d), hl = 133.26 / 2, bp = B.at('plain', m[0], m[1]);                  // repère : s du nord (rive droite) au sud, t vers l'aval
  const R = (s, t, a, b) => { const p = L.P(s, t); return { cx: p[0], cz: p[1], ux: d[0], uz: d[1], hl: a, hw: b }; };
  const yq = Math.max(T.height(...L.P(-hl + 1, 0)), T.height(...L.P(hl - 1, 0))), yi = yq + 0.3, yt = yi + 5.9;   // passage inférieur au niveau du quai
  box(bp, R(0, 0, hl, 3), yi - 0.9, yi + 0.2, { col: BLANC });                                // membrure basse et plancher du passage inférieur
  box(bp, R(0, 0, hl - 0.2, 2.75), yi + 0.2, yt - 0.9, { col: VITRE });                       // boutiques, derrière les panneaux de la poutre
  for (let k = 0, n = 22; k <= n; k++) box(bp, R(-hl + 0.45 + ((2 * hl - 0.9) * k) / n, 0, 0.45, 3.05), yi + 0.2, yt - 0.9, { col: BLANC, top: false });   // montants de la poutre échelle
  box(bp, R(0, 0, hl, 3), yt - 0.9, yt, { col: BLANC });                                      // membrure haute
  box(bp, R(0, -6, hl, 3), yt - 0.45, yt, { col: BLANC });                                    // passage supérieur, encorbellement amont
  box(bp, R(0, 6.125, hl, 3.125), yi - 0.45, yi + 0.2, { col: BLANC });                       // passage inférieur, encorbellement aval
  for (const [t, y] of [[-9, yt], [3, yt], [9.25, yi + 0.2]]) {                               // garde-corps et moulures rouges des rampes d'éclairage
    box(bp, R(0, t, hl, 0.12), y, y + 1.05, { col: ACIER, top: false });
    box(bp, R(0, t + (t < 0 ? -0.1 : 0.1), hl, 0.1), y - 0.55, y - 0.2, { col: ROUGE_ALU, top: false });
  }
  for (const s of [-hl + 42.75 + 1.03, -hl + 42.75 + 2.06 + 46.4 + 1.03]) box(bp, R(s, 0, 1.03, 4.5), yq - 12, yi - 0.9, { col: GRIS });   // palées en Seine (133,26 m : 42,75 + 46,40 + 40 m et deux palées)
  for (const s of [-hl + 2, hl - 2]) box(bp, R(s, 1, 2, 5.5), yq - 8, yi - 0.9, { col: GRIS });  // culées, sur les berges
  app.foot.push({ ring: L.rect(-hl, hl, -9, 9.25), top: yt + 1.05 });
  app.monuments.PasserelleAlma = { x: m[0], z: m[1], top: yt + 10 };
}

// Porte monumentale en bois de la place de l'Alma — M. et L. Solotareff et H. Bard, architectes ; Moles, constructeur
// (L'Architecture d'aujourd'hui, septembre 1937, p. 35-38 : texte, coupe suivant l'axe, plan des fondations et plan
// d'ensemble, d'après Le Génie civil). La place et le pont restent ouverts aux voitures ; au-dessus d'elles, une
// plate-forme à 6 m du terre-plein central, entre deux pylônes de charpente de 50 m (26 poteaux de madriers cloués,
// de moins en moins nombreux vers le haut), chacun portant sur sa face sud un mât de 44 m d'un seul arbre. On y monte
// par un escalier d'honneur depuis le pied du monument à Mickiewicz, ou par deux passerelles droites de 44 m de portée
// (quatre poutres-caissons de 2 m, 6,50 m de plancher) venues des trottoirs des deux angles de l'avenue George-V. De la
// plate-forme, une passerelle arquée à gradins de 12 m de large rejoint le sommet du grand arc parallèle à la Seine
// (65 m de portée, 9,20 m de flèche), qui relie les deux moitiés de l'Exposition — vers l'aval la passerelle de l'Alma,
// vers l'amont celle du quai de la Conférence — ; deux passerelles courbes de 34 m de portée descendent aux deux bouts
// de l'arc. Cotes publiées : hauteurs, portées, largeurs, 29,20 m entre l'arc (large de 8 m) et les pylônes. Relevé sur
// les plans de la revue : la section des pylônes (4,3 × 8,6 m, le long de l'axe), leur entraxe (21 m), l'ouverture des
// passerelles droites. L'emplacement est celui du terre-plein central de la place dans les données ; la teinte du bois
// et le détail des charpentes sont une évocation.
const PORTE = { o: [-3528, -1283], entraxe: 21, arc: 37.7, coins: [[-3551, -1326], [-3499, -1326]] };
// Tablier : un ruban de largeur w et d'épaisseur ep le long d'une suite de points [x, y, z] (y : dessus du plancher),
// avec ses garde-corps.
function tablier(bp, pts, w, ep, col, garde = 1.05) {
  const n = pts.length, N = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1; return [(-dz / l) * (w / 2), (dx / l) * (w / 2)]; });
  for (let i = 0; i + 1 < n; i++) {
    const p = pts[i], q = pts[i + 1], a = N[i], b = N[i + 1];
    const A = [p[0] + a[0], p[1], p[2] + a[1]], Bq = [q[0] + b[0], q[1], q[2] + b[1]], Cq = [q[0] - b[0], q[1], q[2] - b[1]], Dp = [p[0] - a[0], p[1], p[2] - a[1]], bas = (P) => [P[0], P[1] - ep, P[2]], haut = (P) => [P[0], P[1] + garde, P[2]];
    pan(bp, [A, Bq, Cq, Dp], col, 1, false); pan(bp, [bas(A), bas(Bq), bas(Cq), bas(Dp)], col, 0.7, true);
    for (const [P, Q] of [[A, Bq], [Dp, Cq]]) { pan(bp, [P, Q, bas(Q), bas(P)], col, 0.82, true); if (garde) pan(bp, [P, Q, haut(Q), haut(P)], col, 0.92, true); }
  }
}
function porteAlma(app, B) {
  const T = app.terrain, M = app.monuments, dx = ALMA.n[0] - ALMA.s[0], dz = ALMA.n[1] - ALMA.s[1], lg = Math.hypot(dx, dz), L = repere(PORTE.o, [dx / lg, dz / lg]), d = L.d;      // u vers le nord (l'avenue George-V), v vers l'est (l'amont)
  const bp = B.at('plain', PORTE.o[0], PORTE.o[1]), BOIS_C = C(202, 172, 128), BOIS_F = C(164, 130, 92), y0 = T.height(PORTE.o[0], PORTE.o[1]), yp = y0 + 6, e = PORTE.entraxe / 2;
  const R = (u, v, hl, hw) => { const p = L.P(u, v); return { cx: p[0], cz: p[1], ux: d[0], uz: d[1], hl, hw }; }, P3 = (u, v, y) => { const p = L.P(u, v); return [p[0], y, p[1]]; };
  const emprise = (u0, u1, v0, v1, top) => { const ring = L.rect(u0, u1, v0, v1); app.foot.push({ ring, top }); app.v89.reserves.push(boite(ring)); };
  // les deux pylônes : une lame de charpente nervurée, le mât sur la face sud
  for (const s of [-1, 1]) {
    box(bp, R(0, s * e, 4.3, 2.15), y0 - 1, y0 + 50, { col: BOIS_C, s0: 0.8 });
    for (let k = 0; k < 8; k++) for (const c of [-1, 1]) box(bp, R(-3.85 + k * 1.1, s * e + c * 2.2, 0.2, 0.14), y0 + 6.5, y0 + 50.3, { col: BOIS_F, top: false });       // nervures des grandes faces
    for (let k = 0; k < 4; k++) for (const c of [-1, 1]) box(bp, R(c * 4.36, s * e - 1.65 + k * 1.1, 0.14, 0.2), y0 + 6.5, y0 + 50.3, { col: BOIS_F, top: false });
    box(bp, R(0, s * e, 4.6, 2.45), y0 - 1, y0 + 6.5, { col: BOIS_F });                                                       // la base, où sont les bas-reliefs de chêne
    const m = L.P(-5.1, s * e), f = L.P(-4.3, s * e); cyl(bp, m[0], m[1], 0.345, y0 + 6.5, y0 + 50.5, { col: BOIS_F, r1: 0.14, seg: 8 });   // le mât de 44 m, d'un seul arbre
    for (const y of [20, 34, 46]) poutre(bp, [m[0], y0 + y, m[1]], [f[0], y0 + y, f[1]], 0.08, BOIS_F);
    emprise(-4.8, 4.6, s * e - 2.45, s * e + 2.45, y0 + 50);
    app.landmarks.push({ x: L.P(0, s * e)[0], z: L.P(0, s * e)[1], top: y0 + 50 });
  }
  // la plate-forme, entre les pylônes, et l'escalier d'honneur qui y monte depuis le pied du monument à Mickiewicz
  box(bp, R(0, 0, 6, e - 2.15), yp - 0.9, yp, { col: BOIS_C });
  for (const c of [-1, 1]) box(bp, R(c * 5.9, 0, 0.1, e - 2.15), yp, yp + 1.05, { col: BOIS_F, top: false });
  for (const u of [-5.4, 5.4]) for (const v of [-e + 3, 0, e - 3]) box(bp, R(u, v, 0.3, 0.3), y0 - 1, yp - 0.9, { col: BOIS_F, top: false });
  { const n = 12; for (let k = 0; k < n; k++) box(bp, R(6 + (k + 0.5) * (13 / n), 0, 6.5 / n, 6), y0 - 1, yp - ((k + 1) * 6) / (n + 1), { col: BOIS_C }); emprise(6, 19, -6, 6, yp); }
  // le grand arc, parallèle à la Seine : 65 m de portée, 9,20 m de flèche, 8 m de large ; ses culées
  const ua = -PORTE.arc, ys = y0 + 1.5, fl = 9.2, ya = (v) => ys + fl * (1 - (v / 32.5) * (v / 32.5));
  { const pts = []; for (let k = -12; k <= 12; k++) { const v = (k / 12) * 32.5; pts.push(P3(ua, v, ya(v))); } tablier(bp, pts, 8, 1.3, BOIS_C);
    for (const s of [-1, 1]) { box(bp, R(ua, s * 35.5, 4.6, 3.2), y0 - 1, ys + 0.2, { col: BOIS_F }); emprise(ua - 4.6, ua + 4.6, s * 35.5 - 3.2, s * 35.5 + 3.2, ys); } }
  // la passerelle arquée à gradins, de la plate-forme au sommet de l'arc
  { const pts = [], n = 6, u0 = -6, u1 = ua + 4; for (let k = 0; k <= n; k++) { const t = k / n; pts.push(P3(u0 + (u1 - u0) * t, 0, yp + (ya(0) - yp) * t + 1.1 * Math.sin(Math.PI * t))); } tablier(bp, pts, 12, 1.1, BOIS_C); }
  // les deux passerelles courbes, de la plate-forme aux bouts de l'arc ; les deux passerelles droites, vers les angles de l'avenue
  for (const s of [-1, 1]) {
    const c = [[-5, e - 1.5, yp], [-9.5, e + 6.5, yp - 0.3], [-17, e + 14, yp - 1.3], [-26, e + 18.5, yp - 2.6], [ua + 4, 31.5, ya(31.5) + 0.2]];
    tablier(bp, c.map(([u, v, y]) => P3(u, s * v, y)), 5, 2, BOIS_C);
    const a = P3(5, s * (e - 2), yp), q = PORTE.coins[s < 0 ? 0 : 1], b = [q[0], yp, q[1]];
    tablier(bp, [a, [(a[0] + b[0]) / 2, yp + 0.25, (a[2] + b[2]) / 2], b], 6.5, 2, BOIS_C);
    // au bout, sur le trottoir, l'escalier à double révolution
    const yq = T.height(q[0], q[1]), ax = b[0] - a[0], az = b[2] - a[2], l = Math.hypot(ax, az), r = { cx: q[0] + (ax / l) * 3, cz: q[1] + (az / l) * 3, ux: ax / l, uz: az / l, hl: 3.6, hw: 4.2 };
    box(bp, r, yq - 1, yp - 2, { col: BOIS_F }); box(bp, { ...r, hl: 3.2, hw: 3.8 }, yp - 2, yp, { col: BOIS_C });
    const K = (a2, b2) => [r.cx + r.ux * a2 - r.uz * b2, r.cz + r.uz * a2 + r.ux * b2];
    app.foot.push({ ring: [K(3.6, 4.2), K(-3.6, 4.2), K(-3.6, -4.2), K(3.6, -4.2)], top: yp });
  }
  M.PorteAlma = { x: PORTE.o[0], z: PORTE.o[1], top: y0 + 58 };
}

// Le bâti évoqué qui tombe dans l'Exposition s'efface, et les voitures n'y roulent pas : terrains de l'Exposition, dans
// le repère de l'axe — un rectangle [u0, u1, v0, v1] ou un polygone [[u, v], …]. Le bâti réel y reste. Leurs limites
// suivent le plan directeur d'août 1935, le plan des emplacements concédés (1:5 000, 1935) et, pour le Centre régional,
// son plan de 1937 : le Centre régional et son quai, de l'avenue de Suffren à la « rue nouvelle » et au pont de Passy ;
// le quai d'Orsay, du pont de Passy à l'Alma ; le Centre des métiers ; l'île aux Cygnes ; la moitié nord du
// Champ-de-Mars, jusqu'à l'avenue Joseph-Bouvard.
const TERRAINS = [[[-200, 200], [-112, 200], [-112, 250], [106, 250], [106, 345], [9, 476], [-6, 493], [2, 575], [-200, 575]], [-200, -96, -680, 210], [[-100, -245], [5, -245], [80, -436], [-55, -479], [-100, -490]], [-178, -96, 580, 1400], [-96, CHAMP_FIN + 2, EXPO.vc - 118, EXPO.vc + 118]];
export function terrainsExpo() { return TERRAINS.map((t) => (Array.isArray(t[0]) ? ccw(t.map(([u, v]) => AXE.P(u, v))) : AXE.rect(...t))); }

export function batirExpo37(app, B) {
  trocadero(app, B); quaiOrsay(app, B); riveDroiteAmont(app, B); champDeMars(app, B); centreRegional(app, B); colonies(app, B); riveDroiteAval(app, B); esplanade(app, B); passerelleAlma(app, B); porteAlma(app, B);
}
