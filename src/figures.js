// Atlas des personnages : visages peints et vêtements de la fin du XIVe siècle.
// Deux couches sont dessinées puis fondues en une seule texture RGBA : la couleur, et dans l'alpha
// un masque disant où la teinte propre à chaque personnage s'applique (étoffe) ou non (cuir, fourrure, linge, métal).
import * as THREE from 'three';
import { mulberry32 } from './geom.js';

// Géométrie de l'atlas (2048 × 2048 points virtuels) : 8 colonnes de 256 ; deux rangées de visages (256 de haut),
// puis deux rangées de vêtements (640 de haut : coiffure 64, vêtement 480, chausses 96).
export const ATLAS = { TW: 0.125, FACE_H: 0.125, GARM_TOP: 512 / 2048, GARM_H: 640 / 2048, HEAD: 64 / 2048, BODY: 480 / 2048, HOSE: 96 / 2048 };

const S = 256;
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mul = (c, f) => [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ------------------------------------------------------------------ visages
function face(c, X, Y, r, o) {
  const { skin, hair } = o;
  c.save(); c.beginPath(); c.rect(X, Y, S, S); c.clip(); c.translate(X, Y);
  // peau : plus sombre vers les tempes (la tuile couvre la moitié avant de la tête)
  let g = c.createLinearGradient(0, 0, S, 0);
  g.addColorStop(0, css(mul(skin, 0.66))); g.addColorStop(0.22, css(mul(skin, 0.93))); g.addColorStop(0.5, css(mul(skin, 1.05))); g.addColorStop(0.78, css(mul(skin, 0.93))); g.addColorStop(1, css(mul(skin, 0.66)));
  c.fillStyle = g; c.fillRect(0, 0, S, S);
  g = c.createLinearGradient(0, S * 0.72, 0, S); g.addColorStop(0, 'rgba(70,30,20,0)'); g.addColorStop(1, 'rgba(60,26,18,0.38)');
  c.fillStyle = g; c.fillRect(0, 0, S, S);                                             // ombre sous la mâchoire
  // pommettes
  for (const sx of [-1, 1]) { g = c.createRadialGradient(S * (0.5 + sx * 0.2), S * 0.62, 2, S * (0.5 + sx * 0.2), S * 0.62, S * 0.13); g.addColorStop(0, `rgba(190,70,60,${o.ruddy ?? 0.2})`); g.addColorStop(1, 'rgba(190,70,60,0)'); c.fillStyle = g; c.fillRect(0, 0, S, S); }
  // oreilles
  c.fillStyle = css(mul(skin, 0.78)); for (const x of [0.045, 0.955]) { c.beginPath(); c.ellipse(S * x, S * 0.52, S * 0.035, S * 0.075, 0, 0, 7); c.fill(); }
  // chevelure : calotte et tempes
  if (!o.coif) {
    c.fillStyle = css(hair); c.beginPath(); c.moveTo(0, 0); c.lineTo(S, 0); c.lineTo(S, S * (o.long ? 0.78 : 0.5));
    c.quadraticCurveTo(S * 0.87, S * 0.2, S * 0.5, S * (o.bald ? 0.1 : 0.175)); c.quadraticCurveTo(S * 0.13, S * 0.2, 0, S * (o.long ? 0.78 : 0.5)); c.closePath(); c.fill();
    c.strokeStyle = css(mul(hair, 0.7), 0.6); c.lineWidth = 1.4;
    for (let i = 0; i < 46; i++) { const x = r() * S, y = r() * S * 0.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 8, y + 8 + r() * 14); c.stroke(); }
    if (o.tonsure) { c.fillStyle = css(mul(skin, 1.02)); c.beginPath(); c.ellipse(S * 0.5, 0, S * 0.3, S * 0.11, 0, 0, 7); c.fill(); }
  } else {
    // coiffe ou guimpe de lin encadrant le visage
    c.fillStyle = css(o.coif); c.beginPath(); c.moveTo(0, 0); c.lineTo(S, 0); c.lineTo(S, S); c.lineTo(S * 0.84, S);
    c.quadraticCurveTo(S * 0.9, S * 0.5, S * 0.76, S * 0.24); c.quadraticCurveTo(S * 0.5, S * 0.12, S * 0.24, S * 0.24); c.quadraticCurveTo(S * 0.1, S * 0.5, S * 0.16, S); c.lineTo(0, S); c.closePath(); c.fill();
    if (o.wimple) { c.beginPath(); c.moveTo(S * 0.16, S); c.quadraticCurveTo(S * 0.5, S * 0.84, S * 0.84, S); c.closePath(); c.fill(); }
    c.strokeStyle = 'rgba(90,84,72,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(S * 0.24, S * 0.24); c.quadraticCurveTo(S * 0.5, S * 0.12, S * 0.76, S * 0.24); c.stroke();
  }
  // yeux et sourcils
  const ey = S * 0.47, brow = mul(hair, o.coif ? 0.55 : 0.7);
  for (const sx of [-1, 1]) {
    const ex = S * (0.5 + sx * 0.135);
    g = c.createRadialGradient(ex, ey, 1, ex, ey, S * 0.085); g.addColorStop(0, 'rgba(70,40,30,0.3)'); g.addColorStop(1, 'rgba(70,40,30,0)'); c.fillStyle = g; c.fillRect(ex - 30, ey - 30, 60, 60);    // orbite
    c.fillStyle = '#ece6dc'; c.beginPath(); c.ellipse(ex, ey, S * 0.05, S * 0.024, 0, 0, 7); c.fill();
    c.fillStyle = css(o.eye || [84, 58, 36]); c.beginPath(); c.arc(ex + sx * 0.5, ey, S * 0.021, 0, 7); c.fill();
    c.fillStyle = '#120c0a'; c.beginPath(); c.arc(ex + sx * 0.5, ey, S * 0.0095, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(ex - 2.5, ey - 3, 2.2, 2.2);
    c.strokeStyle = css(mul(skin, 0.42)); c.lineWidth = 2.4; c.beginPath(); c.moveTo(ex - S * 0.054, ey + 1); c.quadraticCurveTo(ex, ey - S * 0.035, ex + S * 0.054, ey + 1); c.stroke();   // paupière
    c.strokeStyle = css(mul(skin, 0.7), 0.6); c.lineWidth = 1.2; c.beginPath(); c.moveTo(ex - S * 0.045, ey + S * 0.03); c.quadraticCurveTo(ex, ey + S * 0.046, ex + S * 0.045, ey + S * 0.03); c.stroke();
    c.strokeStyle = css(brow); c.lineWidth = o.male ? 4.2 : 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ex - sx * S * 0.062, ey - S * 0.058); c.quadraticCurveTo(ex, ey - S * (o.male ? 0.082 : 0.09), ex + sx * S * 0.06, ey - S * 0.062); c.stroke();
  }
  // nez
  c.strokeStyle = css(mul(skin, 0.62), 0.75); c.lineWidth = 2.2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(S * 0.475, S * 0.44); c.quadraticCurveTo(S * 0.455, S * 0.56, S * 0.452, S * 0.625); c.stroke();
  c.fillStyle = css(mul(skin, 0.45)); for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(S * (0.5 + sx * 0.03), S * 0.642, S * 0.014, S * 0.008, 0, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.ellipse(S * 0.505, S * 0.6, S * 0.02, S * 0.03, 0, 0, 7); c.fill();
  c.strokeStyle = css(mul(skin, 0.7), 0.5); c.lineWidth = 1.4; c.beginPath(); c.moveTo(S * 0.445, S * 0.655); c.quadraticCurveTo(S * 0.5, S * 0.675, S * 0.555, S * 0.655); c.stroke();
  // bouche
  const lip = o.male ? mix(skin, [150, 70, 60], 0.45) : mix(skin, [176, 60, 60], 0.6);
  c.fillStyle = css(lip, 0.9); c.beginPath(); c.ellipse(S * 0.5, S * 0.762, S * 0.062, S * 0.02, 0, 0, 7); c.fill();
  c.strokeStyle = css(mul(lip, 0.5)); c.lineWidth = 2.2; c.beginPath(); c.moveTo(S * 0.425, S * 0.748); c.quadraticCurveTo(S * 0.5, S * 0.74 + (o.smile ? 5 : 1), S * 0.575, S * 0.748); c.stroke();
  // rides
  if (o.old) {
    c.strokeStyle = css(mul(skin, 0.6), 0.5); c.lineWidth = 1.3;
    for (const y of [0.27, 0.305, 0.34]) { c.beginPath(); c.moveTo(S * 0.34, S * y); c.quadraticCurveTo(S * 0.5, S * (y - 0.012), S * 0.66, S * y); c.stroke(); }
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(S * (0.5 + sx * 0.07), S * 0.65); c.quadraticCurveTo(S * (0.5 + sx * 0.115), S * 0.72, S * (0.5 + sx * 0.1), S * 0.79); c.stroke(); c.beginPath(); c.moveTo(S * (0.5 + sx * 0.2), S * 0.47); c.lineTo(S * (0.5 + sx * 0.235), S * 0.455); c.stroke(); }
  }
  // barbe : 1 moustache, 2 barbe pleine, 3 barbe de quelques jours
  const strands = (x0, y0, x1, y1, n, len) => { c.strokeStyle = css(mul(hair, 0.9), 0.85); c.lineWidth = 1.5; for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 4, y + len * (0.5 + r())); c.stroke(); } };
  if (o.beard === 2) {
    c.fillStyle = css(hair, 0.93); c.beginPath(); c.moveTo(S * 0.2, S * 0.6); c.quadraticCurveTo(S * 0.3, S * 0.74, S * 0.42, S * 0.715); c.quadraticCurveTo(S * 0.5, S * 0.7, S * 0.58, S * 0.715); c.quadraticCurveTo(S * 0.7, S * 0.74, S * 0.8, S * 0.6);
    c.lineTo(S * 0.82, S); c.lineTo(S * 0.18, S); c.closePath(); c.fill();
    c.fillStyle = css(lip, 0.85); c.beginPath(); c.ellipse(S * 0.5, S * 0.765, S * 0.05, S * 0.014, 0, 0, 7); c.fill();
    strands(S * 0.2, S * 0.66, S * 0.8, S * 0.97, 130, 9);
  }
  if (o.beard === 1 || o.beard === 2) { c.fillStyle = css(hair, 0.95); c.beginPath(); c.moveTo(S * 0.4, S * 0.735); c.quadraticCurveTo(S * 0.5, S * 0.675, S * 0.6, S * 0.735); c.quadraticCurveTo(S * 0.5, S * 0.715, S * 0.4, S * 0.735); c.fill(); strands(S * 0.41, S * 0.69, S * 0.59, S * 0.72, 26, 5); }
  if (o.beard === 3) { c.fillStyle = css(mul(hair, 0.9), 0.3); c.beginPath(); c.moveTo(S * 0.2, S * 0.62); c.quadraticCurveTo(S * 0.5, S * 0.74, S * 0.8, S * 0.62); c.lineTo(S * 0.8, S); c.lineTo(S * 0.2, S); c.closePath(); c.fill(); }
  c.restore();
}

const MEN = [
  { skin: [226, 184, 150], hair: [96, 66, 40], male: 1, beard: 0, eye: [70, 96, 120] },
  { skin: [214, 170, 136], hair: [84, 56, 34], male: 1, beard: 2 },
  { skin: [220, 182, 154], hair: [176, 172, 166], male: 1, beard: 2, old: 1, eye: [96, 110, 120] },
  { skin: [198, 150, 116], hair: [34, 28, 26], male: 1, beard: 1 },
  { skin: [214, 158, 130], hair: [150, 78, 40], male: 1, beard: 3, ruddy: 0.34, eye: [84, 110, 84] },
  { skin: [190, 146, 112], hair: [24, 20, 20], male: 1, beard: 2 },
  { skin: [234, 198, 168], hair: [196, 164, 100], male: 1, beard: 0, eye: [80, 110, 150], smile: 1 },
  { skin: [222, 180, 148], hair: [140, 134, 128], male: 1, beard: 0, old: 1, tonsure: 1, bald: 1 },
];
const LINEN = [238, 232, 218];
const WOMEN = [
  { skin: [236, 198, 172], hair: [110, 76, 46], coif: LINEN, eye: [84, 60, 40], smile: 1 },
  { skin: [222, 170, 142], hair: [84, 56, 36], coif: LINEN, ruddy: 0.36 },
  { skin: [226, 186, 160], hair: [150, 146, 140], coif: LINEN, wimple: 1, old: 1 },
  { skin: [240, 206, 182], hair: [190, 156, 96], coif: [244, 240, 230], eye: [86, 116, 150] },
  { skin: [204, 156, 122], hair: [40, 30, 26], coif: LINEN },
  { skin: [228, 186, 158], hair: [96, 70, 48], coif: LINEN, wimple: 1, eye: [90, 104, 80] },
  { skin: [234, 194, 166], hair: [130, 86, 50], coif: [246, 242, 234], smile: 1, ruddy: 0.28 },
  { skin: [222, 182, 156], hair: [170, 166, 160], coif: [232, 226, 212], wimple: 1, old: 1 },
];

// ------------------------------------------------------------------ vêtements
// P : { c (couleur), k (masque de teinte) }. Dans le masque, blanc = étoffe teinte, noir = couleur fixe.
function fixed(P, fn, col) { P.c.fillStyle = css(col); fn(P.c); P.k.fillStyle = '#000'; fn(P.k); }
function tinted(P, fn, col) { P.c.fillStyle = css(col); fn(P.c); P.k.fillStyle = '#fff'; fn(P.k); }
const rectFn = (x, y, w, h) => (c) => c.fillRect(x, y, w, h);
const FABRIC = [234, 230, 222], LEATHER = [86, 60, 40], FUR = [150, 118, 84], GOLDC = [206, 168, 72], STEEL = [150, 154, 160];

function folds(P, r, X, y0, y1, n, a = 0.14) {
  for (let i = 0; i < n; i++) {
    const x = X + r() * S, w = 3 + r() * 9, ya = y0 + r() * (y1 - y0) * 0.45;
    const g = P.c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, `rgba(20,14,10,${a * (0.5 + r())})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    P.c.fillStyle = g; P.c.fillRect(x, ya, w, y1 - ya);
    if (r() < 0.4) { P.c.fillStyle = 'rgba(255,255,255,0.07)'; P.c.fillRect(x + w, ya, 2 + r() * 3, y1 - ya); }
  }
}
function speckle(P, r, x, y, w, h, col, n) { for (let i = 0; i < n; i++) { P.c.fillStyle = css(mul(col, 0.6 + r() * 0.7), 0.8); P.c.fillRect(x + r() * w, y + r() * h, 1.5 + r() * 2.5, 2 + r() * 4); } }
function belt(P, X, y, col, o = {}) {
  fixed(P, rectFn(X, y, S, o.h || 12), col);
  P.c.fillStyle = 'rgba(0,0,0,0.3)'; P.c.fillRect(X, y + (o.h || 12), S, 4);
  fixed(P, rectFn(X + 121, y - 3, 15, (o.h || 12) + 6), o.buckle || [176, 170, 150]);             // boucle
  if (o.strap) fixed(P, rectFn(X + 136, y + 4, 9, 54), col);
  if (o.pouch) { fixed(P, (c) => { c.beginPath(); c.roundRect ? c.roundRect(X + 166, y + 8, 30, 36, 8) : c.rect(X + 166, y + 8, 30, 36); c.fill(); }, mul(col, 1.25)); }
  if (o.studs) for (let x = X + 8; x < X + S; x += 18) fixed(P, rectFn(x, y + 3, 6, 6), GOLDC);
}
function neck(P, X, y, col = LINEN) { fixed(P, (c) => { c.beginPath(); c.ellipse(X + 128, y, 30, 15, 0, 0, Math.PI); c.fill(); }, col); P.c.strokeStyle = 'rgba(0,0,0,0.28)'; P.c.lineWidth = 2; P.c.beginPath(); P.c.ellipse(X + 128, y, 31, 16, 0, 0, Math.PI); P.c.stroke(); }
function buttons(P, X, y0, y1, n) { for (let i = 0; i < n; i++) { const y = y0 + ((y1 - y0) * i) / (n - 1); fixed(P, (c) => { c.beginPath(); c.arc(X + 128, y, 3.6, 0, 7); c.fill(); }, [196, 190, 172]); } P.c.strokeStyle = 'rgba(0,0,0,0.3)'; P.c.lineWidth = 1.5; P.c.beginPath(); P.c.moveTo(X + 124, y0); P.c.lineTo(X + 124, y1); P.c.stroke(); }
function furBand(P, r, X, y, h, col = FUR) { fixed(P, rectFn(X, y, S, h), col); speckle(P, r, X, y, S, h, col, h * 9); }

function garment(P, r, X, Y, row, v) {
  const G0 = Y + 64, G1 = Y + 544, long = row === 1, waist = G0 + (long ? 136 : 229);
  // étoffe de base, teinte par personnage
  tinted(P, rectFn(X, Y, S, 640), FABRIC);
  P.c.save(); P.c.beginPath(); P.c.rect(X, G0, S, 480); P.c.clip(); P.k.save(); P.k.beginPath(); P.k.rect(X, G0, S, 480); P.k.clip();
  const lay = () => { folds(P, r, X, waist - 40, G1, long ? 30 : 20); let g = P.c.createLinearGradient(0, waist - 16, 0, waist + 22); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)'); P.c.fillStyle = g; P.c.fillRect(X, waist - 16, S, 38); P.c.fillStyle = 'rgba(0,0,0,0.25)'; P.c.fillRect(X, G1 - 6, S, 6); };
  let hose = [78, 64, 54], hoseTint = false, head = null, headTint = true, headShade = 0.82;
  if (!long) {
    const by = waist + 26;                                                           // ceinture portée bas sur les hanches
    if (v === 0) { lay(); neck(P, X, G0 + 2); belt(P, X, by, LEATHER, { strap: 1, pouch: 1 }); }
    else if (v === 1) { lay(); neck(P, X, G0 + 2); buttons(P, X, G0 + 26, G1 - 20, 14); belt(P, X, by, LEATHER, { strap: 1 }); head = [96, 52, 44]; headTint = false; }
    else if (v === 2) {                                                                // pourpoint mi-parti
      fixed(P, rectFn(X + 128, G0, 128, 480), [198, 164, 72]); lay(); neck(P, X, G0 + 2); buttons(P, X, G0 + 24, waist + 10, 9); belt(P, X, by, [60, 44, 34], { studs: 1 }); hose = [150, 44, 38]; hoseTint = 'half';
    } else if (v === 3) {                                                              // artisan : tablier de cuir
      lay(); neck(P, X, G0 + 2); belt(P, X, waist + 6, LEATHER, {});
      fixed(P, (c) => { c.beginPath(); c.moveTo(X + 96, G0 + 60); c.lineTo(X + 160, G0 + 60); c.lineTo(X + 178, G1 - 46); c.lineTo(X + 78, G1 - 46); c.closePath(); c.fill(); }, [126, 92, 62]);
      folds(P, r, X, G0 + 80, G1 - 46, 6, 0.1); head = LINEN; headTint = false;
    } else if (v === 4) {                                                              // paysan : bure rapiécée, corde
      lay(); for (let i = 0; i < 5; i++) { P.c.fillStyle = `rgba(${60 + r() * 60},${50 + r() * 40},${30 + r() * 30},0.22)`; P.c.fillRect(X + r() * 210, G0 + 80 + r() * 320, 26 + r() * 30, 22 + r() * 30); }
      fixed(P, rectFn(X, waist + 4, S, 6), [196, 180, 140]); hose = [150, 128, 100];
    } else if (v === 5) {                                                              // bourgeois : courte houppelande fourrée
      lay(); furBand(P, r, X, G0, 30); furBand(P, r, X, G1 - 34, 34); belt(P, X, waist + 4, [70, 40, 30], { studs: 1, buckle: GOLDC }); hose = [150, 40, 36]; head = [40, 44, 84]; headTint = false;
      for (let x = X + 6; x < X + S; x += 32) { P.c.fillStyle = 'rgba(0,0,0,0.12)'; P.c.fillRect(x, G0 + 34, 5, waist - G0 - 40); }
    } else if (v === 6) {                                                              // cotte et collet du chaperon
      lay(); belt(P, X, by, LEATHER, { pouch: 1 }); head = [70, 60, 52]; headTint = false;
      fixed(P, (c) => { c.beginPath(); c.moveTo(X, G0); c.lineTo(X + S, G0); c.lineTo(X + S, G0 + 62); for (let x = S; x >= 0; x -= 32) { c.quadraticCurveTo(X + x - 8, G0 + 88, X + x - 16, G0 + 62); c.quadraticCurveTo(X + x - 24, G0 + 62, X + x - 32, G0 + 62); } c.closePath(); c.fill(); }, [70, 60, 52]);
    } else {                                                                           // sergent : cotte d'armes fleurdelisée sur la maille
      fixed(P, rectFn(X, G0, S, 480), STEEL); for (let i = 0; i < 2600; i++) { P.c.fillStyle = `rgba(40,44,52,${0.25 + r() * 0.35})`; P.c.fillRect(X + r() * S, G0 + r() * 480, 2, 2); }
      fixed(P, rectFn(X + 42, G0, 172, 400), [30, 50, 126]);
      for (let j = 0; j < 9; j++) for (let i = 0; i < 4; i++) { const x = X + 60 + i * 42 + (j % 2) * 21, y = G0 + 30 + j * 42; if (x < X + 206) fixed(P, (c) => { c.beginPath(); c.ellipse(x, y, 5, 9, 0, 0, 7); c.fill(); c.fillRect(x - 9, y + 3, 18, 3.5); }, GOLDC); }
      lay(); belt(P, X, by, [50, 36, 30], { buckle: STEEL }); fixed(P, rectFn(X + 176, by + 6, 7, 90), [60, 58, 60]);
      hose = STEEL; head = STEEL; headTint = false;
    }
  } else {
    if (v === 0) { lay(); neck(P, X, G0 + 4); fixed(P, rectFn(X, waist, S, 7), [90, 66, 46]); head = LINEN; headTint = false; }
    else if (v === 1) {                                                                // robe et tablier de lin
      lay(); neck(P, X, G0 + 4); fixed(P, rectFn(X, waist, S, 7), [226, 220, 204]);
      fixed(P, rectFn(X + 80, waist + 7, 96, G1 - waist - 60), [232, 226, 210]); folds(P, r, X, waist + 10, G1 - 53, 10, 0.1); head = LINEN; headTint = false;
    } else if (v === 2) {                                                              // corsage lacé, manches claires
      lay(); neck(P, X, G0 + 4); fixed(P, rectFn(X, G0, 30, 480), [222, 212, 190]); fixed(P, rectFn(X + 226, G0, 30, 480), [222, 212, 190]);
      fixed(P, rectFn(X + 118, G0 + 20, 20, waist - G0 - 22), [232, 226, 212]); P.c.strokeStyle = 'rgba(60,40,30,0.8)'; P.c.lineWidth = 1.6;
      for (let y = G0 + 24; y < waist - 8; y += 12) { P.c.beginPath(); P.c.moveTo(X + 118, y); P.c.lineTo(X + 138, y + 10); P.c.moveTo(X + 138, y); P.c.lineTo(X + 118, y + 10); P.c.stroke(); }
      fixed(P, rectFn(X, waist, S, 6), [70, 50, 40]); head = [240, 234, 222]; headTint = false;
    } else if (v === 3) {                                                              // dame : hermine et galon d'or
      lay(); furBand(P, r, X, G0, 26, [236, 230, 220]); furBand(P, r, X, G1 - 30, 30, [236, 230, 220]);
      fixed(P, rectFn(X, G1 - 46, S, 10), GOLDC); belt(P, X, waist - 2, [80, 50, 40], { studs: 1, buckle: GOLDC, h: 9 }); head = [244, 240, 232]; headTint = false;
    } else if (v === 4) {                                                              // veuve ou religieuse : noir et guimpe blanche
      fixed(P, rectFn(X, G0, S, 480), [42, 40, 44]); lay(); fixed(P, (c) => { c.beginPath(); c.ellipse(X + 128, G0, 58, 64, 0, 0, Math.PI); c.fill(); }, [238, 234, 224]); head = [40, 38, 42]; headTint = false;
    } else if (v === 5) {                                                              // moine : habit, scapulaire, corde à nœuds
      lay(); P.c.fillStyle = 'rgba(0,0,0,0.14)'; P.c.fillRect(X + 92, G0, 72, 480);
      fixed(P, rectFn(X, waist + 2, S, 6), [206, 192, 156]); fixed(P, rectFn(X + 150, waist + 6, 5, 120), [206, 192, 156]); for (const y of [40, 76, 112]) fixed(P, rectFn(X + 147, waist + y, 11, 8), [206, 192, 156]);
      headShade = 0.9;
    } else if (v === 6) {                                                              // frère prêcheur : tunique blanche, chape noire
      fixed(P, rectFn(X, G0, S, 480), [236, 230, 216]); lay(); fixed(P, rectFn(X, G0, 76, 480), [36, 34, 38]); fixed(P, rectFn(X + 180, G0, 76, 480), [36, 34, 38]);
      fixed(P, rectFn(X, waist, S, 6), [60, 46, 38]); head = [36, 34, 38]; headTint = false;
    } else {                                                                           // houppelande d'homme : plis réguliers, col et bas fourrés
      for (let x = X + 4; x < X + S; x += 22) { P.c.fillStyle = 'rgba(0,0,0,0.16)'; P.c.fillRect(x, G0 + 30, 7, 440); P.c.fillStyle = 'rgba(255,255,255,0.08)'; P.c.fillRect(x + 9, G0 + 30, 5, 440); }
      lay(); furBand(P, r, X, G0, 30); furBand(P, r, X, G1 - 30, 30); belt(P, X, waist + 2, [60, 40, 34], { studs: 1, buckle: GOLDC, h: 14 }); head = [140, 40, 36]; headTint = false;
    }
  }
  P.c.restore(); P.k.restore();
  // coiffure (bande haute de la tuile)
  if (head) fixed(P, rectFn(X, Y, S, 64), head); else if (!headTint) fixed(P, rectFn(X, Y, S, 64), FABRIC);
  if (headTint && !head) { P.c.fillStyle = `rgba(0,0,0,${1 - headShade})`; P.c.fillRect(X, Y, S, 64); }
  P.c.save(); P.c.beginPath(); P.c.rect(X, Y, S, 64); P.c.clip(); folds(P, r, X, Y - 20, Y + 64, 9, 0.16);
  if (head === STEEL) { const g = P.c.createLinearGradient(X, 0, X + S, 0); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(0.7, 'rgba(255,255,255,0)'); P.c.fillStyle = g; P.c.fillRect(X, Y, S, 64); }
  if (long && v === 3) { P.c.fillStyle = css(GOLDC); P.c.fillRect(X, Y + 40, S, 5); }
  P.c.restore();
  // chausses et souliers (bande basse)
  const H0 = Y + 544;
  if (hoseTint === 'half') { fixed(P, rectFn(X, H0, 128, 96), hose); tinted(P, rectFn(X + 128, H0, 128, 96), FABRIC); } else fixed(P, rectFn(X, H0, S, 96), hose);
  P.c.fillStyle = 'rgba(0,0,0,0.16)'; for (let x = X + 10; x < X + S; x += 26) P.c.fillRect(x, H0, 5, 96);
}

// Atlas des personnages : deux rangées de huit visages, puis deux rangées de huit costumes (courts, longs).
export function makeAtlas(scale, men, women, garmentFn, seed) {
  const N = 2048, mk = () => { const cv = document.createElement('canvas'); cv.width = cv.height = N * scale; const x = cv.getContext('2d', { willReadFrequently: true }); x.setTransform(scale, 0, 0, scale, 0, 0); return x; };
  const P = { c: mk(), k: mk() }, r = mulberry32(seed);
  P.c.fillStyle = '#d8c8b0'; P.c.fillRect(0, 0, N, N); P.k.fillStyle = '#000'; P.k.fillRect(0, 0, N, N);
  for (let i = 0; i < 8; i++) { face(P.c, i * S, 0, r, men[i]); face(P.c, i * S, S, r, women[i]); }
  for (let i = 0; i < 8; i++) { garmentFn(P, r, i * S, 512, 0, i); garmentFn(P, r, i * S, 1152, 1, i); }
  // grain du tissu sur les deux rangées de vêtements
  const W = N * scale, im = P.c.getImageData(0, 0, W, W), d = im.data, km = P.k.getImageData(0, 0, W, W).data, out = new Uint8Array(W * W * 4), gy = 512 * scale;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const s = (y * W + x) * 4, t = ((W - 1 - y) * W + x) * 4, f = y >= gy ? 0.93 + r() * 0.14 : 1;          // retournement vertical : v = 1 en haut
    out[t] = Math.min(255, d[s] * f); out[t + 1] = Math.min(255, d[s + 1] * f); out[t + 2] = Math.min(255, d[s + 2] * f); out[t + 3] = km[s];
  }
  const tex = new THREE.DataTexture(out, W, W, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4; tex.needsUpdate = true;
  return { texture: tex, canvas: P.c.canvas };
}

export function makeFigureAtlas(scale = 1) { return makeAtlas(scale, MEN, WOMEN, garment, 1389); }

// Outils de peinture des costumes, pour les habitants d'une autre époque (src/p1789/figures.js).
export const KIT = { S, css, mul, mix, fixed, tinted, rectFn, folds, speckle, belt, neck, buttons, FABRIC, LEATHER, LINEN, GOLDC };
