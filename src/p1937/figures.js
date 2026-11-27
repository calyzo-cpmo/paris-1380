// Parisiens de l'été 1937 : visages et tenues des années 1930, peints dans le même atlas que ceux des autres maquettes
// (src/figures.js) pour habiller les mêmes personnages articulés (src/people.js). Ce module remplace src/p1889/figures.js
// dans la page de 1937 (surcouche, tools/build.mjs) : mêmes noms exportés, mêmes colonnes de l'atlas.
// Hommes : bleu de travail et casquette, complet sombre et feutre mou, complet gris croisé, imperméable ceinturé,
// livreur en cotte et tricot, complet clair et canotier ou panama, soutane, soldat en capote kaki et casque (colonne 7 :
// le maillage lui donne son arme).
// Femmes : robe imprimée et tablier, vendeuse en blouse blanche, robe de ville à col blanc et petit chapeau, robe de
// soie en biais et capeline, manteau sombre et cloche, sœur de charité en cornette, bonne en tablier à bavette, jupe
// plissée, chandail crème et béret.
import { makeAtlas, KIT } from '../figures.js';

const { S, fixed, tinted, rectFn, folds, neck, buttons, FABRIC, LINEN } = KIT;
const NOIR = [32, 32, 36], SOULIER = [34, 28, 26], PAILLE = [226, 206, 150], KAKI = [120, 112, 72], FEUTRE = [74, 70, 66];

// Visages : les hommes sont rasés ou portent la moustache, les femmes ont les cheveux courts et ondulés.
const HOMMES = [
  { skin: [226, 184, 150], hair: [84, 60, 40], male: 1, beard: 0, eye: [70, 96, 120] },
  { skin: [220, 178, 148], hair: [34, 30, 28], male: 1, beard: 1 },
  { skin: [220, 182, 154], hair: [176, 172, 166], male: 1, beard: 1, old: 1, eye: [96, 110, 120] },
  { skin: [204, 156, 122], hair: [36, 30, 28], male: 1, beard: 0, ruddy: 0.3 },
  { skin: [216, 162, 132], hair: [140, 76, 40], male: 1, beard: 0, eye: [84, 110, 84] },
  { skin: [196, 150, 116], hair: [28, 24, 22], male: 1, beard: 1 },
  { skin: [234, 198, 168], hair: [190, 158, 100], male: 1, beard: 0, eye: [80, 110, 150], smile: 1 },
  { skin: [222, 180, 148], hair: [150, 144, 138], male: 1, beard: 0, old: 1, bald: 1 },
];
const FEMMES = [
  { skin: [236, 198, 172], hair: [110, 76, 46], eye: [84, 60, 40], smile: 1 },
  { skin: [222, 170, 142], hair: [84, 56, 36], ruddy: 0.3 },
  { skin: [226, 186, 160], hair: [150, 146, 140], old: 1 },
  { skin: [240, 206, 182], hair: [206, 176, 112], eye: [86, 116, 150] },
  { skin: [204, 156, 122], hair: [40, 30, 26] },
  { skin: [228, 186, 158], hair: [120, 84, 50], eye: [90, 104, 80], smile: 1 },
  { skin: [234, 194, 166], hair: [60, 40, 30], eye: [70, 60, 50] },
  { skin: [222, 182, 156], hair: [170, 166, 160], coif: [246, 244, 238], wimple: 1, old: 1 },
];

function costume(P, r, X, Y, row, v) {
  const G0 = Y + 64, G1 = Y + 544, H0 = Y + 544, long = row === 1, waist = G0 + (long ? 150 : 229), c = P.c;
  tinted(P, rectFn(X, Y, S, 640), FABRIC);
  c.save(); c.beginPath(); c.rect(X, G0, S, 480); c.clip(); P.k.save(); P.k.beginPath(); P.k.rect(X, G0, S, 480); P.k.clip();
  const plis = (n) => { folds(P, r, X, waist - 40, G1, n || (long ? 24 : 18)); const g = c.createLinearGradient(0, waist - 14, 0, waist + 18); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(X, waist - 14, S, 32); };
  const ombre = (x, y, w, h, a = 0.18) => { c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(X + x, y, w, h); };
  const clair = (x, y, w, h, a = 0.16) => { c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(X + x, y, w, h); };
  // ombre d'une forme quelconque : sur la couleur seulement, le masque de teinte n'est pas touché
  const voile = (fn, a = 0.2) => { c.fillStyle = `rgba(0,0,0,${a})`; fn(c); };
  // revers pointus du veston et chemise claire entre eux, cravate
  const revers = (bas = waist - 30) => { for (const s of [-1, 1]) voile((q) => { q.beginPath(); q.moveTo(X + 128 + s * 6, G0); q.lineTo(X + 128 + s * 46, G0); q.lineTo(X + 128 + s * 30, G0 + 70); q.lineTo(X + 128 + s * 4, bas); q.closePath(); q.fill(); }); };
  const chemise = (col = LINEN) => { neck(P, X, G0 + 2); fixed(P, (q) => { q.beginPath(); q.moveTo(X + 106, G0); q.lineTo(X + 150, G0); q.lineTo(X + 132, waist - 36); q.lineTo(X + 124, waist - 36); q.closePath(); q.fill(); }, col); };
  const cravate = (col) => fixed(P, (q) => { q.beginPath(); q.moveTo(X + 122, G0 + 10); q.lineTo(X + 134, G0 + 10); q.lineTo(X + 136, G0 + 120); q.lineTo(X + 128, G0 + 134); q.lineTo(X + 120, G0 + 120); q.closePath(); q.fill(); }, col);
  const tablier = (col, y0 = waist + 6, x0 = 76, w = 104) => { fixed(P, rectFn(X + x0, y0, w, G1 - y0), col); ombre(x0, y0, 3, G1 - y0, 0.14); ombre(x0 + w - 3, y0, 3, G1 - y0, 0.14); };
  const ceinture = (a, h = 12) => ombre(0, waist - h / 2, S, h, a);
  const poches = () => { ombre(40, waist + 40, 50, 4, 0.22); ombre(166, waist + 40, 50, 4, 0.22); ombre(160, G0 + 74, 40, 3, 0.2); };
  // imprimé à petites fleurs ou à pois, éparpillé sur l'étoffe
  const imprime = (col, n = 140, rr = 5) => { c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.85)`; for (let k = 0; k < n; k++) { c.beginPath(); c.arc(X + r() * S, G0 + r() * 480, rr * (0.6 + r() * 0.6), 0, 7); c.fill(); } };
  let head = NOIR, ruban = null, legs = [70, 68, 72];
  if (!long) {
    if (v === 0) { plis(); chemise([206, 200, 186]); revers(); buttons(P, X, G0 + 70, waist + 40, 4); poches(); head = [62, 64, 72]; legs = 'meme'; }                                            // ouvrier : bleu de travail, casquette
    else if (v === 1) { plis(); chemise(); cravate([110, 40, 46]); revers(); buttons(P, X, waist - 20, waist + 30, 2); poches(); head = FEUTRE; ruban = [34, 32, 32]; legs = 'meme'; }   // complet sombre, feutre mou
    else if (v === 2) { plis(); chemise(); cravate([40, 54, 96]); revers(waist - 10); buttons(P, X - 26, waist - 30, waist + 40, 3); buttons(P, X + 26, waist - 30, waist + 40, 3); for (let x = 10; x < S; x += 22) ombre(x, G0, 2, 480, 0.06); head = [128, 124, 118]; ruban = [44, 42, 44]; legs = 'meme'; }   // complet croisé à fines rayures, feutre gris
    else if (v === 3) { plis(); chemise(); cravate([70, 46, 40]); revers(waist + 20); ceinture(0.3, 16); buttons(P, X - 30, G0 + 60, G1 - 60, 5); buttons(P, X + 30, G0 + 60, G1 - 60, 5); ombre(0, G0, S, 18, 0.12); head = FEUTRE; ruban = [30, 28, 28]; legs = [80, 78, 82]; }   // imperméable ceinturé, feutre
    else if (v === 4) { plis(); neck(P, X, G0 + 2); for (let y = G0 + 6; y < waist + 40; y += 10) ombre(0, y, S, 3, 0.07); fixed(P, rectFn(X + 70, waist - 70, 116, G1 - waist + 70), [74, 88, 120]); fixed(P, rectFn(X + 86, G0, 14, waist - 60), [74, 88, 120]); fixed(P, rectFn(X + 156, G0, 14, waist - 60), [74, 88, 120]); head = [70, 66, 62]; legs = [74, 88, 120]; }   // livreur : tricot, cotte à bretelles, casquette
    else if (v === 5) { plis(); chemise(); cravate([150, 60, 56]); revers(); clair(0, G0, S, 480, 0.08); poches(); head = PAILLE; ruban = [40, 40, 60]; legs = 'meme'; }                    // complet clair, canotier ou panama
    else if (v === 6) { fixed(P, rectFn(X, G0, S, 480), [34, 32, 36]); plis(); fixed(P, rectFn(X + 116, G0 + 2, 24, 22), LINEN); buttons(P, X, G0 + 40, G1 - 20, 14); head = NOIR; legs = [32, 30, 34]; }   // prêtre : soutane, col romain
    else {                                                                                                                                                                       // soldat : capote kaki, ceinturon, bandes molletières, casque
      fixed(P, rectFn(X, G0, S, 480), KAKI); plis(); buttons(P, X - 18, G0 + 30, waist + 30, 6); buttons(P, X + 18, G0 + 30, waist + 30, 6); fixed(P, rectFn(X, waist - 4, S, 14), [70, 54, 36]);
      fixed(P, rectFn(X + 108, G0, 40, 12), [96, 88, 56]); head = [98, 96, 70]; ruban = [84, 82, 60]; legs = KAKI;
    }
  } else {
    if (v === 0) { plis(); imprime([236, 230, 214]); fixed(P, rectFn(X + 108, G0, 40, 10), LINEN); tablier([120, 140, 170]); head = [84, 60, 42]; }                                    // ménagère : robe imprimée, tablier, cheveux nus
    else if (v === 1) { fixed(P, rectFn(X, G0, S, 480), [238, 236, 228]); plis(); buttons(P, X, G0 + 20, G1 - 40, 8); ombre(40, waist + 60, 50, 4, 0.16); ombre(166, waist + 60, 50, 4, 0.16); head = [60, 44, 34]; }   // vendeuse : blouse blanche boutonnée
    else if (v === 2) { plis(); fixed(P, (q) => { q.beginPath(); q.moveTo(X + 86, G0); q.lineTo(X + 170, G0); q.lineTo(X + 150, G0 + 46); q.lineTo(X + 128, G0 + 30); q.lineTo(X + 106, G0 + 46); q.closePath(); q.fill(); }, [244, 240, 230]); buttons(P, X, G0 + 50, waist - 6, 5); ceinture(0.25, 10); head = [52, 44, 48]; ruban = [150, 60, 70]; }   // robe de ville à col blanc, petit chapeau
    else if (v === 3) {                                                                                                                                                          // élégante : robe de soie coupée en biais, capeline
      plis(30); for (let k = -4; k < 10; k++) { c.fillStyle = 'rgba(255,255,255,0.1)'; c.beginPath(); c.moveTo(X + k * 30, G1); c.lineTo(X + k * 30 + 160, waist); c.lineTo(X + k * 30 + 172, waist); c.lineTo(X + k * 30 + 12, G1); c.closePath(); c.fill(); }
      ombre(0, waist - 4, S, 8, 0.2); voile((q) => { q.beginPath(); q.moveTo(X + 96, G0); q.lineTo(X + 160, G0); q.lineTo(X + 128, G0 + 70); q.closePath(); q.fill(); }, 0.14);
      head = [238, 230, 210]; ruban = [70, 70, 110];
    } else if (v === 4) { fixed(P, rectFn(X, G0, S, 480), [52, 48, 54]); plis(); fixed(P, rectFn(X + 70, G0, 116, 34), [96, 74, 58]); buttons(P, X - 30, G0 + 50, waist + 120, 4); ceinture(0.3); head = [46, 40, 44]; }   // manteau sombre, col de fourrure, chapeau cloche
    else if (v === 5) { plis(); fixed(P, (q) => { q.beginPath(); q.moveTo(X + 76, G0); q.lineTo(X + 180, G0); q.lineTo(X + 150, G0 + 84); q.lineTo(X + 106, G0 + 84); q.closePath(); q.fill(); }, [246, 244, 238]); tablier([86, 96, 122], waist + 4, 70, 116); fixed(P, rectFn(X + 124, G0 + 90, 8, 60), [60, 50, 40]); head = [248, 246, 240]; }   // sœur de charité : guimpe, tablier, cornette
    else if (v === 6) { fixed(P, rectFn(X, G0, S, 480), [52, 52, 60]); plis(); tablier([240, 236, 226], waist + 4, 60, 136); fixed(P, rectFn(X + 100, G0 + 36, 56, waist - G0 - 30), [240, 236, 226]); fixed(P, rectFn(X + 108, G0, 40, 10), LINEN); head = [244, 240, 232]; }   // bonne : robe sombre, tablier à bavette, coiffe
    else { fixed(P, rectFn(X, G0, S, waist - G0 + 10), [224, 214, 190]); for (let y = G0 + 8; y < waist; y += 9) ombre(0, y, S, 2, 0.08); plis(); for (let x = 4; x < S; x += 16) ombre(x, waist + 10, 6, G1 - waist - 10, 0.16); head = [40, 52, 96]; }   // jupe plissée, chandail, béret
  }
  c.restore(); P.k.restore();
  // coiffure (bande haute de la tuile) : calotte du chapeau, ruban au bas
  fixed(P, rectFn(X, Y, S, 64), head);
  c.save(); c.beginPath(); c.rect(X, Y, S, 64); c.clip(); folds(P, r, X, Y - 20, Y + 64, 7, 0.12);
  if (ruban) fixed(P, rectFn(X, Y + 46, S, 14), ruban);
  c.restore();
  // jambes (bande basse) : pantalon et souliers ; sous une robe, bas et escarpins
  if (long) { fixed(P, rectFn(X, H0, S, 80), [206, 176, 150]); fixed(P, rectFn(X, H0 + 80, S, 16), [44, 34, 32]); }
  else {
    if (legs === 'meme') { c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(X, H0, S, 86); } else fixed(P, rectFn(X, H0, S, 86), legs);
    fixed(P, rectFn(X, H0 + 86, S, 10), SOULIER);
    if (v === 7) { c.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = H0 + 40; y < H0 + 86; y += 8) c.fillRect(X, y, S, 3); }          // bandes molletières
  }
  c.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = X + 10; x < X + S; x += 26) c.fillRect(x, H0, 5, 96);
}

export const makeFigureAtlas1889 = (scale = 1) => makeAtlas(scale, HOMMES, FEMMES, costume, 1937);
// En 1937, l'automobile a remplacé la plupart des chevaux : les dernières voitures de livraison à cheval roulent sur la
// chaussée, parmi les automobiles (src/p1937/circulation.js) ; il n'y a plus de cavaliers ni d'attelages parmi les passants.
export const ATTELAGES = 0;

const pick = (r, a) => a[(r() * a.length) | 0];
const BLEUS = [[60, 84, 132], [72, 96, 146], [54, 74, 116], [86, 104, 140]];                                      // toile bleue, plus ou moins délavée
const SOMBRES_H = [[46, 46, 52], [58, 56, 62], [40, 44, 58], [62, 54, 48], [48, 52, 50]];                         // anthracite, marine, brun, vert sombre
const GRIS = [[112, 112, 116], [96, 98, 104], [128, 124, 118], [104, 100, 92]];
const MASTIC = [[186, 166, 124], [170, 152, 116], [196, 178, 138], [150, 138, 110]];                               // imperméables
const CLAIRS = [[214, 206, 184], [196, 192, 178], [222, 214, 190], [186, 190, 192]];
const IMPRIMES = [[86, 112, 164], [176, 76, 74], [96, 134, 112], [190, 150, 90], [120, 96, 150], [70, 70, 90], [196, 120, 140]];
const ROBES = [[52, 62, 104], [120, 46, 56], [56, 92, 84], [150, 120, 84], [90, 66, 104], [64, 64, 70], [170, 90, 70], [110, 130, 150]];   // marine, bordeaux, vert, ocre, prune, gris, rouille, bleu-gris
const SOIES = [[226, 196, 196], [190, 214, 204], [196, 206, 230], [236, 222, 170], [214, 196, 226], [240, 232, 216], [222, 120, 110]];

// Tenue d'un Parisien de l'été 1937 : même forme de réponse que outfit() de src/people.js (et outfit1889).
export function outfit1889(r, kind, role) {
  if (kind === 'man' || kind === 'rider' || kind === 'cart') {
    if (role === 'guard') return { col: KAKI, v: [7, 0, pick(r, [0, 3, 4, 6]), 0] };
    const g = kind === 'rider' ? pick(r, [1, 2, 5, 3]) : kind === 'cart' ? pick(r, [4, 4, 0, 0]) : pick(r, [0, 0, 0, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6]);
    const col = g === 0 ? pick(r, BLEUS) : g === 1 ? pick(r, SOMBRES_H) : g === 2 ? pick(r, GRIS) : g === 3 ? pick(r, MASTIC) : g === 4 ? pick(r, [[110, 92, 74], [96, 90, 84], [128, 110, 90]]) : g === 5 ? pick(r, CLAIRS) : g === 6 ? [34, 32, 36] : KAKI;
    return { col, v: [g, 0, g === 6 ? pick(r, [7, 2, 4]) : g === 7 ? pick(r, [0, 3, 4, 6]) : (r() * 8) | 0, 0] };
  }
  if (kind === 'robe') {
    if (role === 'monk' || r() > 0.96) return { col: pick(r, [[70, 78, 102], [40, 40, 46]]), v: [5, 1, 7, 1] };      // sœur de charité
    const g = pick(r, [0, 0, 0, 1, 2, 2, 2, 3, 3, 3, 4, 6, 7, 7]);
    const col = g === 0 ? pick(r, IMPRIMES) : g === 1 ? [238, 236, 228] : g === 2 ? pick(r, ROBES) : g === 3 ? pick(r, SOIES) : g === 4 ? pick(r, [[52, 48, 54], [70, 60, 56], [44, 50, 70]]) : g === 6 ? [52, 52, 60] : pick(r, [[196, 64, 60], [60, 90, 140], [80, 110, 80], [200, 170, 90]]);
    return { col, v: [g, 1, g === 1 ? pick(r, [1, 6]) : g === 6 ? 6 : g === 4 ? pick(r, [2, 4]) : (r() * 7) | 0, 1] };
  }
  return { col: pick(r, GRIS), v: [0, 0, 0, 0] };
}
