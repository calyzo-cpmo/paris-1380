// Habitants de Paris en 1789 : visages et costumes de la fin du XVIIIe siècle, peints dans le même atlas que ceux de
// 1380 (src/figures.js) pour habiller les mêmes personnages articulés (src/people.js).
// Hommes : veste et gilet du peuple, habit bourgeois, tablier d'artisan, uniforme des gardes-françaises, sarrau,
// habit brodé, soutane, livrée. Femmes : caraco et tablier, jupe rayée, robe à l'anglaise, robe de soie, deuil,
// habit religieux, servante, élégante au chapeau de paille.
import { makeAtlas, KIT } from '../figures.js';
import { HABITS } from '../people.js';

const { S, css, fixed, tinted, rectFn, folds, neck, buttons, FABRIC, LINEN, GOLDC } = KIT;
const NOIR = [32, 30, 32], POUDRE = [228, 224, 216], BAS = [228, 224, 214], SOULIER = [30, 26, 24];

const MEN89 = [
  { skin: [226, 184, 150], hair: [84, 60, 40], male: 1, beard: 0, long: 1, eye: [70, 96, 120] },
  { skin: [222, 180, 150], hair: POUDRE, male: 1, beard: 0, long: 1 },
  { skin: [220, 182, 154], hair: [176, 172, 166], male: 1, beard: 0, old: 1, long: 1, eye: [96, 110, 120] },
  { skin: [200, 152, 118], hair: [36, 30, 28], male: 1, beard: 3, ruddy: 0.34 },
  { skin: [216, 162, 132], hair: [140, 76, 40], male: 1, beard: 0, long: 1, eye: [84, 110, 84] },
  { skin: [196, 150, 116], hair: [28, 24, 22], male: 1, beard: 1 },
  { skin: [234, 198, 168], hair: [190, 158, 100], male: 1, beard: 0, long: 1, eye: [80, 110, 150], smile: 1 },
  { skin: [222, 180, 148], hair: [140, 134, 128], male: 1, beard: 0, old: 1, tonsure: 1, bald: 1 },
];
const WOMEN89 = [
  { skin: [236, 198, 172], hair: [110, 76, 46], coif: LINEN, eye: [84, 60, 40], smile: 1 },
  { skin: [222, 170, 142], hair: [84, 56, 36], coif: LINEN, ruddy: 0.36 },
  { skin: [226, 186, 160], hair: [150, 146, 140], coif: [244, 240, 230], old: 1 },
  { skin: [240, 206, 182], hair: POUDRE, long: 1, eye: [86, 116, 150] },
  { skin: [204, 156, 122], hair: [40, 30, 26], coif: LINEN },
  { skin: [228, 186, 158], hair: [120, 84, 50], long: 1, eye: [90, 104, 80], smile: 1 },
  { skin: [234, 194, 166], hair: [130, 86, 50], coif: [246, 242, 234], ruddy: 0.28 },
  { skin: [222, 182, 156], hair: [170, 166, 160], coif: [232, 226, 212], wimple: 1, old: 1 },
];

function garment89(P, r, X, Y, row, v) {
  const G0 = Y + 64, G1 = Y + 544, H0 = Y + 544, long = row === 1, waist = G0 + (long ? 136 : 229), c = P.c;
  tinted(P, rectFn(X, Y, S, 640), FABRIC);
  c.save(); c.beginPath(); c.rect(X, G0, S, 480); c.clip(); P.k.save(); P.k.beginPath(); P.k.rect(X, G0, S, 480); P.k.clip();
  const plis = () => { folds(P, r, X, waist - 40, G1, long ? 30 : 20); const g = c.createLinearGradient(0, waist - 16, 0, waist + 22); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(X, waist - 16, S, 38); };
  const ombre = (x, y, w, h, a = 0.18) => { c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(X + x, y, w, h); };
  const gilet = (col, bas = waist + 34) => fixed(P, rectFn(X + 98, G0 + 6, 60, bas - G0 - 6), col);
  const revers = () => { ombre(84, G0, 14, waist - G0 + 30); ombre(158, G0, 14, waist - G0 + 30); };
  const jabot = () => { neck(P, X, G0 + 2); fixed(P, (q) => { q.beginPath(); q.ellipse(X + 128, G0 + 24, 12, 22, 0, 0, 7); q.fill(); }, LINEN); };
  const fichu = (bas = 74) => fixed(P, (q) => { q.beginPath(); q.moveTo(X + 84, G0); q.lineTo(X + 172, G0); q.lineTo(X + 128, G0 + bas); q.closePath(); q.fill(); }, LINEN);
  const tablier = (col, y0 = waist + 8, x0 = 80, w = 96) => { fixed(P, rectFn(X + x0, y0, w, G1 - y0), col); ombre(x0, y0, 3, G1 - y0, 0.14); ombre(x0 + w - 3, y0, 3, G1 - y0, 0.14); };
  let head = NOIR, headTint = false, legs = 'bas';
  if (!long) {
    if (v === 0) { gilet([198, 172, 124]); plis(); revers(); neck(P, X, G0 + 2); buttons(P, X, G0 + 30, waist + 24, 7); head = [62, 50, 42]; legs = 'pantalon'; }                       // peuple : veste et gilet
    else if (v === 1) { gilet([228, 222, 206]); plis(); revers(); jabot(); buttons(P, X, G0 + 56, waist + 26, 6); }                                                                    // habit bourgeois, tricorne
    else if (v === 2) { fixed(P, rectFn(X, G0, S, waist - G0), [224, 216, 198]); plis(); neck(P, X, G0 + 2); tablier([124, 90, 58], G0 + 70, 70, 116); head = [150, 122, 92]; legs = 'pantalon'; }   // artisan : chemise et tablier de cuir
    else if (v === 7) {                                                                                                                                                              // garde-française : habit bleu, revers blancs, collet rouge (colonne 7 : le maillage détaillé lui donne son arme)
      fixed(P, rectFn(X, G0, S, 480), [38, 54, 122]); fixed(P, rectFn(X + 92, G0 + 6, 72, waist - G0 + 10), [234, 230, 218]); plis();
      fixed(P, rectFn(X, G0, S, 14), [178, 42, 38]); buttons(P, X, G0 + 30, waist + 4, 7);
      c.strokeStyle = css([240, 236, 224]); c.lineWidth = 9; c.beginPath(); c.moveTo(X + 60, G0); c.lineTo(X + 190, waist + 30); c.moveTo(X + 196, G0); c.lineTo(X + 66, waist + 30); c.stroke();
      P.k.strokeStyle = '#000'; P.k.lineWidth = 9; P.k.beginPath(); P.k.moveTo(X + 60, G0); P.k.lineTo(X + 190, waist + 30); P.k.moveTo(X + 196, G0); P.k.lineTo(X + 66, waist + 30); P.k.stroke();
      fixed(P, rectFn(X, waist + 40, S, G1 - waist - 40), [234, 230, 218]); legs = 'blanc';
    } else if (v === 4) { plis(); neck(P, X, G0 + 2); ombre(0, waist + 60, S, 4, 0.2); head = [124, 98, 70]; legs = 'brun'; }                                                          // sarrau du porteur d'eau, du paysan
    else if (v === 5) { gilet([232, 222, 190]); plis(); jabot(); fixed(P, rectFn(X + 88, G0, 7, 480), GOLDC); fixed(P, rectFn(X + 161, G0, 7, 480), GOLDC); buttons(P, X, G0 + 56, waist + 26, 7); head = POUDRE; }   // habit brodé, perruque poudrée
    else if (v === 6) { fixed(P, rectFn(X, G0, S, 480), [36, 34, 38]); plis(); fixed(P, rectFn(X + 116, G0 + 2, 24, 30), LINEN); buttons(P, X, G0 + 40, G1 - 20, 12); legs = 'noir'; }   // abbé : habit noir, rabat blanc
    else { gilet([186, 58, 48]); plis(); revers(); neck(P, X, G0 + 2); for (const y of [40, 80, 120, 160]) fixed(P, rectFn(X + 60, G0 + y, 136, 5), [216, 198, 124]); }              // livrée galonnée (colonne 3)
  } else {
    if (v === 0) { plis(); fichu(); tablier(LINEN); head = LINEN; }                                                                                                                  // femme du peuple : caraco, fichu, tablier
    else if (v === 1) { for (let x = 6; x < S; x += 18) ombre(x, waist, 7, G1 - waist, 0.22); plis(); fichu(); tablier([72, 98, 144]); head = LINEN; }                                // marchande : jupe rayée, tablier bleu
    else if (v === 2) { plis(); fichu(60); fixed(P, rectFn(X, waist - 4, S, 12), [70, 56, 90]); head = [240, 236, 226]; }                                                             // robe à l'anglaise, ceinture de ruban
    else if (v === 3) {                                                                                                                                                              // robe de soie, pièce d'estomac, volant
      plis(); fixed(P, (q) => { q.beginPath(); q.moveTo(X + 104, G0 + 8); q.lineTo(X + 152, G0 + 8); q.lineTo(X + 140, waist); q.lineTo(X + 116, waist); q.closePath(); q.fill(); }, [240, 232, 214]);
      for (const y of [30, 66, 102]) fixed(P, rectFn(X + 118, G0 + y, 20, 9), [204, 96, 116]);
      c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(X, G1 - 40, S, 40); ombre(0, G1 - 44, S, 4, 0.2); neck(P, X, G0 + 2); head = POUDRE;
    } else if (v === 4) { fixed(P, rectFn(X, G0, S, 480), [54, 50, 56]); plis(); fixed(P, (q) => { q.beginPath(); q.moveTo(X + 90, G0); q.lineTo(X + 166, G0); q.lineTo(X + 128, G0 + 60); q.closePath(); q.fill(); }, [150, 146, 148]); head = [42, 40, 44]; }   // deuil
    else if (v === 5) { plis(); ombre(100, G0, 56, 480, 0.14); fixed(P, rectFn(X, waist, S, 6), [60, 46, 38]); head = null; headTint = true; }                                        // habit religieux, soutane, robe de magistrat
    else if (v === 6) { plis(); fichu(52); tablier([228, 222, 208]); fixed(P, rectFn(X + 104, G0 + 50, 48, waist - G0 - 42), [228, 222, 208]); head = LINEN; }                         // servante : tablier à bavette
    else { plis(); fichu(96); fixed(P, rectFn(X, waist - 6, S, 16), [198, 62, 60]); head = [208, 178, 120]; }                                                                         // élégante : grand fichu, ceinture, chapeau de paille
  }
  c.restore(); P.k.restore();
  // coiffure (bande haute de la tuile)
  if (head) fixed(P, rectFn(X, Y, S, 64), head); else if (headTint) { c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(X, Y, S, 64); }
  c.save(); c.beginPath(); c.rect(X, Y, S, 64); c.clip(); folds(P, r, X, Y - 20, Y + 64, 9, 0.16);
  if (head === NOIR && !long && v !== 6) fixed(P, rectFn(X + 118, Y + 18, 20, 20), v === 7 ? [236, 232, 222] : [44, 42, 44]);          // cocarde ou bouton du tricorne
  c.restore();
  // culotte, bas et souliers (bande basse)
  if (long) fixed(P, rectFn(X, H0, S, 96), [70, 56, 46]);
  else if (legs === 'pantalon') { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(X, H0, S, 96); fixed(P, rectFn(X, H0 + 86, S, 10), SOULIER); }
  else if (legs === 'brun') { fixed(P, rectFn(X, H0, S, 86), [112, 94, 72]); fixed(P, rectFn(X, H0 + 86, S, 10), SOULIER); }
  else if (legs === 'noir') fixed(P, rectFn(X, H0, S, 96), [34, 32, 36]);
  else { if (legs === 'blanc') fixed(P, rectFn(X, H0, S, 40), [234, 230, 218]); else { c.fillStyle = 'rgba(0,0,0,0.1)'; c.fillRect(X, H0, S, 40); } fixed(P, rectFn(X, H0 + 40, S, 46), BAS); fixed(P, rectFn(X, H0 + 86, S, 10), SOULIER); }
  c.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = X + 10; x < X + S; x += 26) c.fillRect(x, H0, 5, 96);
}

export const makeFigureAtlas89 = (scale = 1) => makeAtlas(scale, MEN89, WOMEN89, garment89, 1789);

const pick = (r, a) => a[(r() * a.length) | 0];
const DRAP = [[92, 74, 58], [70, 74, 84], [52, 70, 58], [44, 52, 84], [96, 60, 70], [150, 126, 92], [110, 100, 92], [66, 58, 54], [128, 96, 66], [60, 84, 110]];
const INDIENNE = [[70, 96, 150], [170, 60, 56], [196, 160, 80], [120, 140, 110], [150, 110, 140], [200, 190, 170], [96, 84, 110], [176, 120, 90], [60, 90, 100], [214, 170, 150]];
const SOIE = [[222, 170, 180], [170, 200, 180], [170, 190, 222], [230, 214, 150], [200, 176, 214], [120, 40, 50], [40, 60, 110], [60, 96, 70]];
const ECRU = [[168, 150, 120], [140, 124, 100], [186, 172, 146], [120, 110, 96], [90, 104, 130]];

// Costume d'un personnage de 1789 : même forme de réponse que outfit() de src/people.js.
export function outfit89(r, kind, role) {
  if (kind === 'man' || kind === 'rider' || kind === 'cart') {
    if (role === 'guard') return { col: [44, 58, 120], v: [7, 0, pick(r, [0, 3, 4, 5]), 0] };
    const g = kind === 'rider' ? pick(r, [1, 5, 5, 3, 3]) : kind === 'cart' ? pick(r, [4, 0, 2]) : pick(r, [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3, 4, 4, 5, 6, 7]);
    const col = g === 7 ? [44, 58, 120] : g === 6 ? [40, 38, 42] : g === 5 ? pick(r, SOIE) : g === 4 || g === 2 ? pick(r, ECRU) : pick(r, DRAP);
    return { col, v: [g, 0, g === 5 ? 1 : g === 6 ? 7 : pick(r, [0, 2, 3, 4, 5, 6]), 0] };
  }
  if (kind === 'robe') {
    if (role === 'monk' || r() > 0.86) return { col: pick(r, HABITS), v: [5, 1, pick(r, [7, 7, 2, 0]), 0] };
    const g = pick(r, [0, 0, 0, 1, 1, 2, 2, 3, 4, 6, 6, 7]);
    return { col: g === 3 || g === 7 ? pick(r, SOIE) : g === 4 ? [56, 52, 58] : pick(r, INDIENNE), v: [g, 1, g === 3 ? 3 : g === 7 ? 5 : pick(r, [0, 1, 2, 4, 6]), 1] };
  }
  return { col: pick(r, DRAP), v: [0, 0, 0, 0] };
}
