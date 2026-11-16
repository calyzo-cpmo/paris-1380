// Parisiens de 1889 : visages et costumes de la fin du XIXe siècle, peints dans le même atlas que ceux des autres
// maquettes (src/figures.js) pour habiller les mêmes personnages articulés (src/people.js).
// Hommes : blouse bleue de l'ouvrier, redingote et haut-de-forme, tablier de l'artisan, veston et chapeau melon,
// velours du charretier, complet clair et canotier, soutane, fantassin en capote et pantalon garance.
// Femmes : caraco et tablier, marchande en bonnet, robe à tournure et petit chapeau, robe de soie, deuil, sœur de
// charité en cornette, bonne en grand tablier, tailleur et canotier.
import { makeAtlas, KIT } from '../figures.js';

const { S, fixed, tinted, rectFn, folds, neck, buttons, FABRIC, LINEN } = KIT;
const NOIR = [30, 30, 34], SOULIER = [28, 26, 26], PAILLE = [222, 200, 142], GRIS = [112, 110, 116], GARANCE = [176, 44, 40], VELOURS = [96, 82, 64];

const HOMMES = [
  { skin: [226, 184, 150], hair: [84, 60, 40], male: 1, beard: 2, eye: [70, 96, 120] },
  { skin: [220, 178, 148], hair: [34, 30, 28], male: 1, beard: 1 },
  { skin: [220, 182, 154], hair: [176, 172, 166], male: 1, beard: 3, old: 1, eye: [96, 110, 120] },
  { skin: [200, 152, 118], hair: [36, 30, 28], male: 1, beard: 3, ruddy: 0.34 },
  { skin: [216, 162, 132], hair: [140, 76, 40], male: 1, beard: 0, eye: [84, 110, 84] },
  { skin: [196, 150, 116], hair: [28, 24, 22], male: 1, beard: 2 },
  { skin: [234, 198, 168], hair: [190, 158, 100], male: 1, beard: 0, eye: [80, 110, 150], smile: 1 },
  { skin: [222, 180, 148], hair: [150, 144, 138], male: 1, beard: 2, old: 1, bald: 1 },
];
const FEMMES = [
  { skin: [236, 198, 172], hair: [110, 76, 46], eye: [84, 60, 40], smile: 1 },
  { skin: [222, 170, 142], hair: [84, 56, 36], coif: LINEN, ruddy: 0.36 },
  { skin: [226, 186, 160], hair: [150, 146, 140], coif: [244, 240, 230], old: 1 },
  { skin: [240, 206, 182], hair: [196, 164, 104], eye: [86, 116, 150] },
  { skin: [204, 156, 122], hair: [40, 30, 26] },
  { skin: [228, 186, 158], hair: [120, 84, 50], eye: [90, 104, 80], smile: 1 },
  { skin: [234, 194, 166], hair: [130, 86, 50], coif: [246, 242, 234], ruddy: 0.28 },
  { skin: [222, 182, 156], hair: [170, 166, 160], coif: [246, 244, 238], wimple: 1, old: 1 },
];

function costume(P, r, X, Y, row, v) {
  const G0 = Y + 64, G1 = Y + 544, H0 = Y + 544, long = row === 1, waist = G0 + (long ? 136 : 229), c = P.c;
  tinted(P, rectFn(X, Y, S, 640), FABRIC);
  c.save(); c.beginPath(); c.rect(X, G0, S, 480); c.clip(); P.k.save(); P.k.beginPath(); P.k.rect(X, G0, S, 480); P.k.clip();
  const plis = () => { folds(P, r, X, waist - 40, G1, long ? 30 : 20); const g = c.createLinearGradient(0, waist - 16, 0, waist + 22); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(X, waist - 16, S, 38); };
  const ombre = (x, y, w, h, a = 0.18) => { c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(X + x, y, w, h); };
  const clair = (x, y, w, h, a = 0.16) => { c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(X + x, y, w, h); };
  const gilet = (col, bas = waist + 20) => fixed(P, rectFn(X + 104, G0 + 6, 48, bas - G0 - 6), col);
  const revers = () => { ombre(88, G0, 14, waist - G0 + 20); ombre(154, G0, 14, waist - G0 + 20); };
  // col blanc et cravate (ou plastron) : le haut de la chemise entre les revers
  const cravate = (col) => { neck(P, X, G0 + 2); fixed(P, rectFn(X + 112, G0 + 2, 32, 22), LINEN); fixed(P, (q) => { q.beginPath(); q.moveTo(X + 120, G0 + 22); q.lineTo(X + 136, G0 + 22); q.lineTo(X + 132, G0 + 70); q.lineTo(X + 124, G0 + 70); q.closePath(); q.fill(); }, col); };
  const tablier = (col, y0 = waist + 8, x0 = 80, w = 96) => { fixed(P, rectFn(X + x0, y0, w, G1 - y0), col); ombre(x0, y0, 3, G1 - y0, 0.14); ombre(x0 + w - 3, y0, 3, G1 - y0, 0.14); };
  // jupe drapée sur la tournure : un pan relevé en biais, plus sombre dessous
  const drape = () => { c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.moveTo(X, waist + 150); c.lineTo(X + S, waist + 70); c.lineTo(X + S, waist + 86); c.lineTo(X, waist + 170); c.closePath(); c.fill(); ombre(0, waist + 170, S, G1 - waist - 170, 0.1); };
  const corsage = (n = 9) => { ombre(124, G0 + 10, 8, waist - G0 - 14, 0.16); buttons(P, X, G0 + 22, waist - 10, n); fixed(P, rectFn(X + 108, G0, 40, 10), LINEN); };
  let head = NOIR, ruban = null, legs = GRIS;
  if (!long) {
    if (v === 0) { plis(); neck(P, X, G0 + 2); ombre(0, G0 + 36, S, 4, 0.16); ombre(0, G1 - 26, S, 5, 0.2); fixed(P, rectFn(X + 112, G0 + 2, 32, 14), [196, 60, 54]); head = [58, 56, 64]; legs = [92, 86, 78]; }      // ouvrier : blouse bleue, foulard, casquette
    else if (v === 1) { gilet([52, 50, 56]); plis(); revers(); cravate([40, 40, 46]); buttons(P, X, G0 + 80, waist + 10, 5); head = NOIR; ruban = [58, 58, 64]; legs = GRIS; }                                // bourgeois : redingote, haut-de-forme
    else if (v === 2) { fixed(P, rectFn(X, G0, S, waist - G0), [226, 220, 204]); plis(); neck(P, X, G0 + 2); tablier([70, 96, 140], G0 + 80, 70, 116); head = [70, 64, 60]; legs = [84, 80, 76]; }           // artisan : chemise, tablier bleu
    else if (v === 3) { gilet([150, 132, 104]); plis(); revers(); cravate([120, 40, 44]); buttons(P, X, G0 + 80, waist, 4); ombre(0, waist + 64, S, 4, 0.2); head = [58, 46, 40]; ruban = [36, 30, 28]; legs = [96, 92, 90]; }   // employé : veston, chapeau melon
    else if (v === 4) { plis(); neck(P, X, G0 + 2); for (let x = 8; x < S; x += 12) ombre(x, G0, 2, 480, 0.1); fixed(P, rectFn(X + 110, G0 + 2, 36, 16), [198, 176, 120]); head = [118, 96, 70]; legs = VELOURS; }      // charretier : velours côtelé, feutre
    else if (v === 5) { gilet([236, 230, 214]); plis(); revers(); cravate([40, 70, 120]); clair(0, G0, S, 480, 0.06); head = PAILLE; ruban = [40, 40, 60]; legs = 'meme'; }                                 // complet clair, canotier
    else if (v === 6) { fixed(P, rectFn(X, G0, S, 480), [34, 32, 36]); plis(); fixed(P, rectFn(X + 116, G0 + 2, 24, 26), LINEN); buttons(P, X, G0 + 40, G1 - 20, 14); head = NOIR; legs = [32, 30, 34]; }      // prêtre : soutane, rabat
    else {                                                                                                                                                                                                 // fantassin : capote gris de fer bleuté, épaulettes et pantalon garance, képi (colonne 7 : le maillage lui donne son arme)
      fixed(P, rectFn(X, G0, S, 480), [56, 64, 96]); plis(); fixed(P, rectFn(X, G0, 56, 16), GARANCE); fixed(P, rectFn(X + S - 56, G0, 56, 16), GARANCE);
      fixed(P, rectFn(X + 112, G0, 32, 14), GARANCE); buttons(P, X - 18, G0 + 30, waist + 30, 7); buttons(P, X + 18, G0 + 30, waist + 30, 7); fixed(P, rectFn(X, waist - 4, S, 14), [30, 28, 28]);
      head = GARANCE; ruban = [40, 48, 84]; legs = GARANCE;
    }
  } else {
    if (v === 0) { plis(); ombre(0, G0, S, waist - G0, 0.12); fixed(P, rectFn(X + 112, G0, 32, 10), LINEN); tablier([104, 116, 136]); head = [84, 60, 42]; }                                                // ouvrière : caraco sombre, tablier gris-bleu, cheveux nus
    else if (v === 1) { for (let x = 6; x < S; x += 18) ombre(x, waist, 7, G1 - waist, 0.2); plis(); fixed(P, (q) => { q.beginPath(); q.moveTo(X + 84, G0); q.lineTo(X + 172, G0); q.lineTo(X + 128, G0 + 60); q.closePath(); q.fill(); }, [228, 222, 206]); tablier(LINEN); head = LINEN; }   // marchande : jupe rayée, fichu, tablier et bonnet blancs
    else if (v === 2) { plis(); corsage(); drape(); fixed(P, rectFn(X, G1 - 20, S, 20), [40, 36, 40]); head = [48, 40, 44]; ruban = [150, 60, 70]; }                                                        // bourgeoise : corsage boutonné, jupe drapée sur la tournure, petit chapeau
    else if (v === 3) {                                                                                                                                                                                     // élégante : robe de soie, plastron de dentelle, volants, chapeau à fleurs
      plis(); fixed(P, (q) => { q.beginPath(); q.moveTo(X + 108, G0 + 4); q.lineTo(X + 148, G0 + 4); q.lineTo(X + 138, waist - 6); q.lineTo(X + 118, waist - 6); q.closePath(); q.fill(); }, [244, 238, 224]);
      drape(); for (const y of [G1 - 90, G1 - 56, G1 - 22]) { clair(0, y, S, 18, 0.2); ombre(0, y + 18, S, 4, 0.2); }
      fixed(P, rectFn(X, waist - 6, S, 12), [70, 50, 80]); head = [236, 228, 208]; ruban = [200, 90, 110];
    } else if (v === 4) { fixed(P, rectFn(X, G0, S, 480), [40, 38, 44]); plis(); drape(); fixed(P, rectFn(X + 112, G0, 32, 8), [120, 118, 122]); head = [30, 28, 32]; }                                      // deuil : noir, voile
    else if (v === 5) { plis(); fixed(P, (q) => { q.beginPath(); q.moveTo(X + 76, G0); q.lineTo(X + 180, G0); q.lineTo(X + 150, G0 + 84); q.lineTo(X + 106, G0 + 84); q.closePath(); q.fill(); }, [246, 244, 238]); tablier([86, 96, 122], waist + 4, 70, 116); fixed(P, rectFn(X + 124, G0 + 90, 8, 60), [60, 50, 40]); head = [248, 246, 240]; }   // sœur de charité : guimpe, tablier, cornette
    else if (v === 6) { fixed(P, rectFn(X, G0, S, 480), [52, 52, 60]); plis(); tablier([240, 236, 226], waist + 4, 60, 136); fixed(P, rectFn(X + 100, G0 + 36, 56, waist - G0 - 30), [240, 236, 226]); fixed(P, rectFn(X + 108, G0, 40, 10), LINEN); head = [244, 240, 232]; }   // bonne : robe sombre, grand tablier à bavette, bonnet
    else { plis(); revers(); fixed(P, rectFn(X + 112, G0, 32, 46), [240, 236, 226]); buttons(P, X, G0 + 60, waist - 6, 4); ombre(0, waist + 6, S, 5, 0.22); ombre(0, G1 - 16, S, 6, 0.2); head = PAILLE; ruban = [40, 50, 90]; }   // tailleur : jaquette cintrée, jupe unie, canotier
  }
  c.restore(); P.k.restore();
  // coiffure (bande haute de la tuile) : calotte du chapeau, ruban au bas
  fixed(P, rectFn(X, Y, S, 64), head);
  c.save(); c.beginPath(); c.rect(X, Y, S, 64); c.clip(); folds(P, r, X, Y - 20, Y + 64, 7, 0.12);
  if (ruban) fixed(P, rectFn(X, Y + 46, S, 14), ruban);
  if (long && v === 3) for (const x of [70, 128, 186]) fixed(P, (q) => { q.beginPath(); q.arc(X + x, Y + 34, 9, 0, 7); q.fill(); }, [214, 96, 120]);      // fleurs du chapeau
  c.restore();
  // jambes (bande basse) : pantalon et souliers ; sous une robe, le jupon
  if (long) fixed(P, rectFn(X, H0, S, 96), [60, 50, 46]);
  else {
    if (legs === 'meme') { c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(X, H0, S, 86); } else fixed(P, rectFn(X, H0, S, 86), legs);
    fixed(P, rectFn(X, H0 + 86, S, 10), SOULIER);
    if (v === 7) fixed(P, rectFn(X, H0 + 60, S, 26), [226, 222, 208]);            // guêtres blanches du fantassin
  }
  c.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = X + 10; x < X + S; x += 26) c.fillRect(x, H0, 5, 96);
}

export const makeFigureAtlas1889 = (scale = 1) => makeAtlas(scale, HOMMES, FEMMES, costume, 1889);

const pick = (r, a) => a[(r() * a.length) | 0];
const BLOUSES = [[64, 92, 142], [78, 102, 152], [56, 80, 124], [88, 104, 136]];                                  // toile bleue, plus ou moins délavée
const NOIRS = [[36, 36, 40], [46, 44, 50], [54, 52, 58], [40, 44, 56]];
const DRAPS = [[96, 84, 70], [78, 80, 88], [110, 100, 88], [70, 74, 66], [124, 108, 86], [88, 76, 72], [58, 62, 78]];
const CLAIRS = [[196, 188, 168], [176, 172, 160], [206, 196, 170], [160, 166, 170]];
const TOILES = [[168, 150, 120], [140, 124, 100], [120, 110, 96], [150, 140, 126]];
const SOMBRES = [[96, 40, 52], [44, 72, 60], [84, 56, 96], [100, 70, 50], [40, 52, 92], [70, 70, 78], [120, 60, 50], [60, 84, 96]];      // bordeaux, vert bouteille, prune, marron, marine…
const SOIES = [[222, 178, 186], [176, 204, 190], [178, 196, 224], [232, 218, 160], [204, 182, 216], [236, 226, 208]];
const INDIENNES = [[120, 110, 130], [150, 96, 84], [96, 110, 120], [140, 126, 100], [110, 90, 100], [90, 100, 84], [156, 130, 110]];

// Costume d'un Parisien de 1889 : même forme de réponse que outfit() de src/people.js.
export function outfit1889(r, kind, role) {
  if (kind === 'man' || kind === 'rider' || kind === 'cart') {
    if (role === 'guard') return { col: [56, 64, 96], v: [7, 0, pick(r, [0, 1, 4, 5]), 0] };
    const g = kind === 'rider' ? pick(r, [1, 1, 5, 3, 7]) : kind === 'cart' ? pick(r, [4, 4, 0, 2]) : pick(r, [0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 3, 4, 5, 5, 6, 7]);
    const col = g === 0 ? pick(r, BLOUSES) : g === 1 ? pick(r, NOIRS) : g === 2 ? pick(r, TOILES) : g === 3 ? pick(r, DRAPS) : g === 4 ? pick(r, [VELOURS, [112, 96, 74], [84, 78, 70]]) : g === 5 ? pick(r, CLAIRS) : g === 6 ? [34, 32, 36] : [56, 64, 96];
    return { col, v: [g, 0, g === 6 ? pick(r, [7, 2, 4]) : g === 7 ? pick(r, [0, 1, 4, 5, 6]) : (r() * 8) | 0, 0] };
  }
  if (kind === 'robe') {
    if (role === 'monk' || r() > 0.93) return { col: pick(r, [[70, 78, 102], [40, 40, 46]]), v: [5, 1, 7, 1] };      // sœur de charité
    const g = pick(r, [0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 6, 7, 7]);
    const col = g === 2 ? pick(r, SOMBRES) : g === 3 ? pick(r, SOIES) : g === 4 ? [40, 38, 44] : g === 6 ? [52, 52, 60] : g === 7 ? pick(r, [...CLAIRS, ...DRAPS.slice(0, 3)]) : pick(r, INDIENNES);
    return { col, v: [g, 1, g === 1 ? pick(r, [1, 6]) : g === 6 ? 6 : g === 4 ? pick(r, [2, 4]) : g === 0 ? pick(r, [0, 4, 1, 5]) : pick(r, [0, 3, 4, 5]), 1] };
  }
  return { col: pick(r, DRAPS), v: [0, 0, 0, 0] };
}
