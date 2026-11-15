// Habitants de Lutèce au IIIe siècle : mêmes personnages articulés que dans les autres maquettes (src/people.js),
// habillés à la gallo-romaine. Hommes : tunique ceinturée, tunique à bandes, cape à capuchon, tablier d'artisan,
// braies du paysan, manteau drapé, pèlerine de voyage, soldat. Longs : tunique longue, étole et manteau, tunique à
// galons, matrone, voile sombre, toge, toge bordée de pourpre, saie à carreaux.
import { makeAtlas, KIT } from '../figures.js';

const { S, css, fixed, tinted, rectFn, folds, neck, belt, FABRIC, LEATHER, LINEN, GOLDC } = KIT;
const PEAU = [206, 162, 130], CUIR = [92, 66, 44], BLANC = [236, 230, 214], POURPRE = [112, 44, 84], BRONZE = [176, 142, 78], FER = [150, 152, 156];

const HOMMES = [
  { skin: [222, 180, 146], hair: [70, 50, 36], male: 1, beard: 2, eye: [84, 64, 44] },
  { skin: [214, 170, 136], hair: [40, 32, 28], male: 1, beard: 0 },
  { skin: [226, 186, 154], hair: [150, 144, 136], male: 1, beard: 3, old: 1 },
  { skin: [198, 150, 116], hair: [34, 28, 26], male: 1, beard: 1, ruddy: 0.3 },
  { skin: [230, 192, 160], hair: [150, 104, 60], male: 1, beard: 2, eye: [90, 116, 140] },
  { skin: [208, 164, 130], hair: [60, 44, 34], male: 1, beard: 0, smile: 1 },
  { skin: [220, 178, 148], hair: [120, 112, 104], male: 1, beard: 0, old: 1, bald: 1 },
  { skin: [202, 156, 122], hair: [44, 34, 28], male: 1, beard: 3 },
];
const FEMMES = [
  { skin: [232, 194, 166], hair: [84, 58, 38], long: 1, eye: [84, 60, 40], smile: 1 },
  { skin: [220, 172, 142], hair: [48, 36, 30], long: 1, ruddy: 0.3 },
  { skin: [226, 186, 158], hair: [150, 146, 140], coif: [222, 214, 196], old: 1 },
  { skin: [238, 204, 178], hair: [160, 116, 66], long: 1, eye: [86, 116, 150] },
  { skin: [206, 158, 124], hair: [40, 30, 26], coif: [196, 176, 150] },
  { skin: [228, 188, 160], hair: [104, 70, 44], long: 1, smile: 1 },
  { skin: [234, 196, 168], hair: [70, 48, 34], coif: [232, 226, 212], ruddy: 0.26 },
  { skin: [222, 182, 154], hair: [170, 166, 160], coif: [96, 84, 92], old: 1 },
];

function costume(P, r, X, Y, row, v) {
  const G0 = Y + 64, G1 = Y + 544, H0 = Y + 544, long = row === 1, waist = G0 + (long ? 136 : 229), c = P.c;
  tinted(P, rectFn(X, Y, S, 640), FABRIC);
  c.save(); c.beginPath(); c.rect(X, G0, S, 480); c.clip(); P.k.save(); P.k.beginPath(); P.k.rect(X, G0, S, 480); P.k.clip();
  const plis = () => { folds(P, r, X, waist - 40, G1, long ? 30 : 18); const g = c.createLinearGradient(0, waist - 16, 0, waist + 22); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(X, waist - 16, S, 38); };
  const ombre = (x, y, w, h, a = 0.18) => { c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(X + x, y, w, h); };
  const bandes = (col, w = 9) => { fixed(P, rectFn(X + 92, G0, w, 480), col); fixed(P, rectFn(X + 164 - w, G0, w, 480), col); };                    // clavi : deux bandes verticales
  const drape = (col, fn = fixed) => { fn(P, (q) => { q.beginPath(); q.moveTo(X, G0); q.lineTo(X + 110, G0); q.lineTo(X + S, G0 + 250); q.lineTo(X + S, G0 + 420); q.lineTo(X, G0 + 150); q.closePath(); q.fill(); }, col);      // pan jeté sur l'épaule gauche
    c.strokeStyle = 'rgba(0,0,0,0.16)'; c.lineWidth = 3; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(X, G0 + 20 + i * 20); c.lineTo(X + S, G0 + 270 + i * 22); c.stroke(); } };
  const diag = (a = 0.13) => { c.strokeStyle = `rgba(0,0,0,${a})`; c.lineWidth = 4; for (let i = -2; i < 12; i++) { c.beginPath(); c.moveTo(X, G0 + i * 44); c.lineTo(X + S, G0 + i * 44 + 190); c.stroke(); } };
  let tete = null, capuche = false, jambes = 'nues';
  if (!long) {
    if (v === 0) { plis(); neck(P, X, G0 + 2, PEAU); belt(P, X, waist + 18, CUIR, { strap: 1 }); }                                                // tunique ceinturée
    else if (v === 1) { bandes([120, 52, 60]); plis(); neck(P, X, G0 + 2, PEAU); belt(P, X, waist + 18, CUIR, {}); }                                 // tunique à bandes
    else if (v === 2) { plis(); fixed(P, (q) => { q.beginPath(); q.moveTo(X, G0); q.lineTo(X + S, G0); q.lineTo(X + S, G0 + 150); q.quadraticCurveTo(X + 128, G0 + 240, X, G0 + 150); q.closePath(); q.fill(); }, [112, 88, 62]); ombre(0, G0 + 150, S, 5, 0.25); capuche = true; tete = [112, 88, 62]; jambes = 'braies'; }   // cape gauloise à capuchon
    else if (v === 3) { plis(); neck(P, X, G0 + 2, PEAU); fixed(P, (q) => { q.beginPath(); q.moveTo(X + 92, G0 + 70); q.lineTo(X + 164, G0 + 70); q.lineTo(X + 182, G1 - 50); q.lineTo(X + 74, G1 - 50); q.closePath(); q.fill(); }, [128, 94, 62]); belt(P, X, waist + 6, CUIR, {}); }   // artisan : tablier de cuir
    else if (v === 4) { plis(); for (let i = 0; i < 4; i++) { c.fillStyle = `rgba(${70 + r() * 50},${56 + r() * 40},${34 + r() * 30},0.2)`; c.fillRect(X + r() * 200, G0 + 90 + r() * 300, 28 + r() * 30, 22 + r() * 28); } fixed(P, rectFn(X, waist + 6, S, 6), [190, 172, 132]); jambes = 'braies'; }   // paysan : tunique rapiécée, braies
    else if (v === 5) { bandes(POURPRE, 12); plis(); neck(P, X, G0 + 2, PEAU); drape([226, 216, 192]); }                                              // notable : tunique à larges bandes, manteau drapé
    else if (v === 6) { plis(); fixed(P, (q) => { q.beginPath(); q.moveTo(X, G0); q.lineTo(X + S, G0); q.lineTo(X + S, G1 - 110); q.lineTo(X + 128, G1 - 60); q.lineTo(X, G1 - 110); q.closePath(); q.fill(); }, [124, 96, 70]); ombre(120, G0, 16, 420, 0.2); capuche = true; tete = [124, 96, 70]; jambes = 'braies'; }   // pèlerine de voyage
    else {                                                                                                                                       // soldat : tunique rouge, cuirasse d'écailles, ceinturon
      fixed(P, rectFn(X, G0, S, 480), [150, 46, 40]); plis();
      fixed(P, rectFn(X + 30, G0, 196, waist - G0 + 20), FER); for (let j = 0; j < 12; j++) for (let i = 0; i < 13; i++) { c.fillStyle = `rgba(40,44,52,${0.25 + r() * 0.2})`; c.beginPath(); c.arc(X + 36 + i * 15 + (j % 2) * 7, G0 + 10 + j * 20, 7, 0, Math.PI); c.fill(); }
      belt(P, X, waist + 18, [70, 48, 34], { studs: 1, buckle: BRONZE }); for (let i = 0; i < 4; i++) fixed(P, rectFn(X + 104 + i * 13, waist + 30, 8, 70), [84, 60, 42]);
      tete = BRONZE;
    }
  } else {
    if (v === 0) { plis(); neck(P, X, G0 + 4, PEAU); fixed(P, rectFn(X, waist - 30, S, 6), [150, 120, 84]); }                                          // tunique longue, ceinturée haut
    else if (v === 1) { plis(); neck(P, X, G0 + 4, PEAU); drape(FABRIC, tinted); ombre(0, G0, S, 480, 0.06); tete = 'voile'; }                         // étole et manteau ramené sur la tête
    else if (v === 2) { plis(); neck(P, X, G0 + 4, PEAU); fixed(P, rectFn(X, G1 - 44, S, 10), [176, 60, 56]); fixed(P, rectFn(X, G1 - 28, S, 5), [176, 60, 56]); fixed(P, rectFn(X + 122, G0, 12, waist - G0), [176, 60, 56]); fixed(P, rectFn(X, waist - 30, S, 6), [120, 90, 60]); }   // tunique à galons
    else if (v === 3) { plis(); neck(P, X, G0 + 4, PEAU); drape([222, 196, 150]); fixed(P, rectFn(X, waist - 30, S, 8), GOLDC); fixed(P, (q) => { q.beginPath(); q.arc(X + 128, G0 + 34, 26, 0.15, Math.PI - 0.15); q.lineWidth = 5; q.strokeStyle = q.fillStyle; q.stroke(); }, GOLDC); }   // matrone : manteau clair, ceinture et collier d'or
    else if (v === 4) { fixed(P, rectFn(X, G0, S, 480), [74, 64, 74]); plis(); diag(0.16); tete = [74, 64, 74]; }                                       // voile sombre
    else if (v === 5) { fixed(P, rectFn(X, G0, S, 480), BLANC); plis(); diag(); neck(P, X, G0 + 4, PEAU); }                                             // toge
    else if (v === 6) { fixed(P, rectFn(X, G0, S, 480), BLANC); plis(); diag(); neck(P, X, G0 + 4, PEAU); fixed(P, (q) => { q.beginPath(); q.moveTo(X + 60, G0); q.lineTo(X + 78, G0); q.lineTo(X + S, G0 + 300); q.lineTo(X + S, G0 + 330); q.closePath(); q.fill(); }, POURPRE); fixed(P, rectFn(X, G1 - 14, S, 14), POURPRE); }   // toge prétexte
    else { plis(); for (let x = 0; x < S; x += 34) { ombre(x, G0, 7, 480, 0.2); } for (let y = G0; y < G1; y += 34) { c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(X, y, S, 7); } for (let x = 17; x < S; x += 34) fixed(P, rectFn(X + x, G0, 2.5, 480), [206, 170, 90]); fixed(P, (q) => { q.beginPath(); q.arc(X + 96, G0 + 30, 9, 0, 7); q.fill(); }, BRONZE); }   // saie gauloise à carreaux, agrafée d'une fibule
  }
  c.restore(); P.k.restore();
  // tête (bande haute de la tuile) : cheveux, capuchon, voile ou casque
  if (tete === 'voile') { c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(X, Y, S, 64); }
  else if (tete) fixed(P, rectFn(X, Y, S, 64), tete);
  else fixed(P, rectFn(X, Y, S, 64), long && v < 5 ? [84, 60, 42] : [66, 50, 38]);
  c.save(); c.beginPath(); c.rect(X, Y, S, 64); c.clip(); folds(P, r, X, Y - 20, Y + 64, 9, capuche || tete === 'voile' ? 0.16 : 0.08);
  if (tete === BRONZE) { const g = c.createLinearGradient(X, 0, X + S, 0); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.4)'); g.addColorStop(0.7, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(X, Y, S, 64); }
  c.restore();
  // jambes et sandales (bande basse)
  if (long) fixed(P, rectFn(X, H0, S, 96), [96, 72, 50]);
  else if (jambes === 'braies') { c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(X, H0, S, 96); fixed(P, rectFn(X, H0 + 82, S, 14), CUIR); }
  else { fixed(P, rectFn(X, H0, S, 96), PEAU); for (const y of [50, 64, 78]) fixed(P, rectFn(X, H0 + y, S, 4), CUIR); fixed(P, rectFn(X, H0 + 88, S, 8), CUIR); }
  c.fillStyle = 'rgba(0,0,0,0.1)'; for (let x = X + 10; x < X + S; x += 26) c.fillRect(x, H0, 5, 96);
}

export const makeFigureAtlasLutece = (scale = 1) => makeAtlas(scale, HOMMES, FEMMES, costume, 250);

const pick = (r, a) => a[(r() * a.length) | 0];
const LAINE = [[196, 180, 150], [170, 150, 118], [146, 124, 96], [214, 202, 178], [122, 100, 78], [184, 160, 120], [160, 140, 112]];            // laine et lin non teints
const TEINT = [[150, 60, 52], [70, 96, 132], [96, 124, 78], [196, 160, 78], [124, 78, 110], [176, 116, 70], [84, 110, 110], [170, 84, 68]];      // garance, guède, gaude…
const RICHE = [[168, 52, 60], [60, 84, 140], [206, 178, 96], [110, 60, 110], [72, 120, 96]];

// Costume d'un habitant de Lutèce : même forme de réponse que outfit() de src/people.js.
export function outfitLutece(r, kind, role) {
  if (kind === 'man' || kind === 'rider' || kind === 'cart') {
    if (role === 'guard') return { col: [150, 46, 40], v: [7, 0, pick(r, [0, 1, 3, 5, 7]), 0] };
    const g = kind === 'rider' ? pick(r, [6, 6, 5, 1, 7]) : kind === 'cart' ? pick(r, [4, 4, 2, 0]) : pick(r, [0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7]);
    const col = g === 7 ? [150, 46, 40] : g === 5 ? pick(r, [[236, 230, 214], [222, 212, 190]]) : g === 4 || g === 3 ? pick(r, LAINE) : r() < 0.55 ? pick(r, LAINE) : pick(r, TEINT);
    return { col, v: [g, 0, (r() * 8) | 0, 0] };
  }
  if (kind === 'robe') {
    const q = r();
    if (q < 0.16) return { col: [255, 255, 255], lo: [226, 220, 204], v: [r() < 0.25 ? 6 : 5, 1, pick(r, [1, 2, 5, 6]), 0] };      // citoyen en toge
    if (q < 0.28) return { col: pick(r, TEINT), v: [7, 1, pick(r, [0, 3, 4, 7]), 0] };                                            // Gaulois en saie
    const g = pick(r, [0, 0, 0, 1, 1, 1, 2, 2, 3, 4]);
    return { col: g === 3 ? pick(r, RICHE) : g === 4 ? [80, 70, 80] : r() < 0.4 ? pick(r, LAINE) : pick(r, TEINT), v: [g, 1, g === 4 ? pick(r, [2, 7]) : g === 1 ? pick(r, [2, 4, 6]) : pick(r, [0, 1, 3, 5]), 1] };
  }
  return { col: pick(r, LAINE), v: [0, 0, 0, 0] };
}
