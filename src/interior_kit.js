// Boîte à outils des intérieurs : matières (dallages, vitraux, tentures), voûtes d'ogives, arcades, mobilier.
// Repère local : le sol est à y = 0, l'entrée du côté des z positifs, le fond (chœur, estrade) vers les z négatifs.
import * as THREE from 'three';
import { Builder, rgb, tint, box, cyl, cone, disc } from './builder.js';
import { mulberry32 } from './geom.js';

const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mul = (c, f) => [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
function canvas(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return [cv, cv.getContext('2d', { willReadFrequently: true })]; }
function texOf(cv, repeat = true) { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
function noise(c, w, h, amt, r) { const im = c.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; } c.putImageData(im, 0, 0); }

export const C = {
  stone: rgb(226, 216, 196), stoneD: rgb(176, 166, 148), stoneW: rgb(240, 232, 214), wood: rgb(124, 90, 58), woodD: rgb(78, 56, 38), woodL: rgb(160, 122, 80), gold: rgb(214, 172, 70), red: rgb(150, 38, 34), blue: rgb(34, 52, 128),
  white: rgb(238, 232, 218), iron: rgb(58, 58, 62), straw: rgb(196, 172, 108), green: rgb(52, 92, 58), black: rgb(30, 28, 28), linen: rgb(226, 218, 198), wax: rgb(236, 226, 196), brick: rgb(168, 92, 64), lead: rgb(120, 124, 130),
};

// ------------------------------------------------------------------ textures répétées
function texSlab(r) {
  const [cv, c] = canvas(512, 512); c.fillStyle = '#5a5347'; c.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 4; j++) for (let i = -1; i < 4; i++) { const x = i * 128 + (j % 2) * 64, k = 0.84 + r() * 0.24; c.fillStyle = css([190 * k, 180 * k, 160 * k]); c.fillRect(x + 2, j * 128 + 2, 124, 124); if (r() < 0.25) { c.fillStyle = 'rgba(60,50,40,0.12)'; c.fillRect(x + 10 + r() * 60, j * 128 + 10 + r() * 60, 30 + r() * 40, 20 + r() * 40); } }
  noise(c, 512, 512, 16, r); return texOf(cv);
}
function texTile(r) {
  const [cv, c] = canvas(512, 512);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    const base = i % 4 === 0 && j % 4 === 0 ? [58, 86, 54] : (i + j) % 2 ? [186, 132, 60] : [124, 50, 36], k = 0.86 + r() * 0.24, x = i * 64, y = j * 64;
    c.fillStyle = css(mul(base, k)); c.fillRect(x, y, 64, 64);
    c.fillStyle = css(mul((i + j) % 2 ? [124, 50, 36] : [206, 160, 84], k), 0.85);
    if ((i + j) % 2) { for (const [dx, dy] of [[20, 20], [44, 20], [20, 44], [44, 44]]) { c.beginPath(); c.arc(x + dx, y + dy, 9, 0, 7); c.fill(); } } else { c.beginPath(); c.moveTo(x + 32, y + 10); c.lineTo(x + 42, y + 32); c.lineTo(x + 32, y + 54); c.lineTo(x + 22, y + 32); c.closePath(); c.fill(); c.fillRect(x + 14, y + 36, 36, 6); }
    c.strokeStyle = 'rgba(30,22,16,0.7)'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, 62, 62);
  }
  noise(c, 512, 512, 18, r); return texOf(cv);
}
function texWood(r) {
  const [cv, c] = canvas(512, 512);
  for (let j = 0; j < 6; j++) { const k = 0.8 + r() * 0.35, y = (j * 512) / 6, h = 512 / 6; c.fillStyle = css([150 * k, 112 * k, 72 * k]); c.fillRect(0, y, 512, h); c.strokeStyle = 'rgba(50,32,18,0.35)'; c.lineWidth = 1; for (let n = 0; n < 12; n++) { const yy = y + 4 + r() * (h - 8); c.beginPath(); c.moveTo(0, yy); c.bezierCurveTo(170, yy + (r() - 0.5) * 8, 340, yy + (r() - 0.5) * 8, 512, yy); c.stroke(); } c.fillStyle = 'rgba(24,16,10,0.75)'; c.fillRect(0, y, 512, 3); }
  noise(c, 512, 512, 14, r); return texOf(cv);
}
function texFaux(r) {
  const [cv, c] = canvas(512, 512); c.fillStyle = '#e4d8bc'; c.fillRect(0, 0, 512, 512); noise(c, 512, 512, 12, r);
  c.strokeStyle = 'rgba(150,52,40,0.85)'; c.lineWidth = 2.2;
  for (let j = 0; j < 8; j++) { const y = j * 64; for (const dy of [0, 5]) { c.beginPath(); c.moveTo(0, y + dy + 1); c.lineTo(512, y + dy + 1); c.stroke(); } for (let i = 0; i < 4; i++) { const x = i * 128 + (j % 2) * 64; c.beginPath(); c.moveTo(x + 1, y + 6); c.lineTo(x + 1, y + 64); c.stroke(); c.fillStyle = 'rgba(150,52,40,0.8)'; const cx = (x + 64) % 512, cy = y + 36; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(cx + Math.cos(k * 1.2566) * 6, cy + Math.sin(k * 1.2566) * 6, 3, 0, 7); c.fill(); } } }
  return texOf(cv);
}
function texRoman(r) {
  const [cv, c] = canvas(512, 512); c.fillStyle = '#857a68'; c.fillRect(0, 0, 512, 512);
  let y = 0, row = 0;
  while (y < 512) {
    const brick = row % 7 >= 4, h = brick ? 10 : 24.5; let x = -r() * 40;      // 4 assises de moellons puis 3 de briques : 128 points, raccord exact
    while (x < 512) { const w = brick ? 60 + r() * 30 : 34 + r() * 22, k = 0.82 + r() * 0.3; c.fillStyle = css(brick ? [172 * k, 92 * k, 62 * k] : [204 * k, 194 * k, 170 * k]); c.fillRect(x + 1.5, y + 1.5, w - 3, h - 3); x += w; }
    y += h; row++;
  }
  noise(c, 512, 512, 20, r); return texOf(cv);
}
function texAzure(r) {
  const [cv, c] = canvas(512, 512); c.fillStyle = '#1b2f78'; c.fillRect(0, 0, 512, 512); noise(c, 512, 512, 14, r);
  c.fillStyle = '#dcb44a';
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const x = i * 64 + (j % 2) * 32 + 16, y = j * 64 + 32; c.beginPath(); for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6, q = k % 2 ? 4 : 11; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fill(); }
  return texOf(cv);
}
function texMarble(r) {
  const [cv, c] = canvas(512, 512);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const dark = (i + j) % 2, k = 0.85 + r() * 0.25; c.fillStyle = css(dark ? [44 * k, 42 * k, 46 * k] : [226 * k, 222 * k, 210 * k]); c.fillRect(i * 128, j * 128, 128, 128); c.strokeStyle = dark ? 'rgba(200,200,200,0.14)' : 'rgba(90,90,100,0.2)'; c.lineWidth = 1.5; for (let n = 0; n < 3; n++) { c.beginPath(); c.moveTo(i * 128 + r() * 128, j * 128); c.bezierCurveTo(i * 128 + r() * 128, j * 128 + 40, i * 128 + r() * 128, j * 128 + 90, i * 128 + r() * 128, j * 128 + 128); c.stroke(); } }
  noise(c, 512, 512, 10, r); return texOf(cv);
}
function texPlaster(r) { const [cv, c] = canvas(256, 256); c.fillStyle = '#d8ccb2'; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '90,76,56' : '255,250,236'},${0.03 + r() * 0.05})`; c.fillRect(r() * 256, r() * 256, 20 + r() * 70, 10 + r() * 50); } noise(c, 256, 256, 14, r); return texOf(cv); }

// ------------------------------------------------------------------ atlas des décors peints (tentures, retables, livres)
export const ART = { W: 2048, H: 1024, lis: [0, 0, 512, 512], scene: [512, 0, 512, 512], retable: [1024, 0, 512, 256], tribune: [1024, 256, 512, 256], page: [1536, 0, 256, 256], door: [1792, 0, 256, 512], dado: [0, 512, 512, 256], shield: [1536, 256, 256, 256], cloth: [512, 512, 512, 256], kings: [1024, 512, 512, 512], verdure: [0, 768, 512, 256] };
function lis(c, x, y, s) { c.beginPath(); c.ellipse(x, y - s * 0.3, s * 0.2, s * 0.62, 0, 0, 7); c.fill(); for (const d of [-1, 1]) { c.beginPath(); c.ellipse(x + d * s * 0.42, y - s * 0.05, s * 0.17, s * 0.45, d * 0.6, 0, 7); c.fill(); } c.fillRect(x - s * 0.5, y + s * 0.2, s, s * 0.16); c.beginPath(); c.ellipse(x, y + s * 0.62, s * 0.14, s * 0.3, 0, 0, 7); c.fill(); }
function person(c, x, y, h, robe, o = {}) {       // petite figure peinte : robe, tête, nimbe ou couronne
  c.fillStyle = css(robe); c.beginPath(); c.moveTo(x - h * 0.12, y - h * 0.72); c.lineTo(x + h * 0.12, y - h * 0.72); c.lineTo(x + h * 0.2, y); c.lineTo(x - h * 0.2, y); c.closePath(); c.fill();
  c.fillStyle = css(mul(robe, 0.7)); c.fillRect(x - h * 0.03, y - h * 0.6, h * 0.05, h * 0.6);
  if (o.halo) { c.fillStyle = '#e2bc4c'; c.beginPath(); c.arc(x, y - h * 0.82, h * 0.13, 0, 7); c.fill(); }
  c.fillStyle = '#e4c0a0'; c.beginPath(); c.arc(x, y - h * 0.82, h * 0.085, 0, 7); c.fill();
  if (o.crown) { c.fillStyle = '#e2bc4c'; c.fillRect(x - h * 0.09, y - h * 0.97, h * 0.18, h * 0.07); for (const d of [-1, 0, 1]) c.fillRect(x + d * h * 0.07 - h * 0.015, y - h * 1.02, h * 0.03, h * 0.06); }
  if (o.mantle) { c.fillStyle = css(o.mantle); c.beginPath(); c.moveTo(x - h * 0.14, y - h * 0.72); c.lineTo(x - h * 0.05, y - h * 0.72); c.lineTo(x - h * 0.16, y); c.lineTo(x - h * 0.24, y); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x + h * 0.14, y - h * 0.72); c.lineTo(x + h * 0.05, y - h * 0.72); c.lineTo(x + h * 0.16, y); c.lineTo(x + h * 0.24, y); c.closePath(); c.fill(); }
}
function makeArt(r) {
  const [cv, c] = canvas(ART.W, ART.H); c.fillStyle = '#806c50'; c.fillRect(0, 0, ART.W, ART.H);
  // tenture d'azur semée de fleurs de lis d'or
  c.fillStyle = '#1e3486'; c.fillRect(0, 0, 512, 512); c.fillStyle = '#d8b048';
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) lis(c, 44 + i * 72 + (j % 2) * 36 - 18, 52 + j * 68, 22);
  c.strokeStyle = '#9a2a26'; c.lineWidth = 18; c.strokeRect(9, 9, 494, 494); c.strokeStyle = '#d8b048'; c.lineWidth = 3; c.strokeRect(20, 20, 472, 472);
  // tapisserie historiée : fonds alternés rouge et bleu, personnages sous des arcatures
  for (let i = 0; i < 4; i++) {
    const x = 512 + i * 128; c.fillStyle = i % 2 ? '#22387e' : '#8e2824'; c.fillRect(x, 0, 128, 512);
    c.fillStyle = 'rgba(230,200,120,0.25)'; for (let k = 0; k < 40; k++) c.fillRect(x + r() * 124, 60 + r() * 380, 3, 3);
    c.strokeStyle = '#d2b060'; c.lineWidth = 5; c.beginPath(); c.moveTo(x + 6, 420); c.lineTo(x + 6, 120); c.quadraticCurveTo(x + 64, 30, x + 122, 120); c.lineTo(x + 122, 420); c.stroke();
    person(c, x + 44, 420, 200, [[196, 170, 90], [70, 110, 80], [200, 190, 170], [150, 60, 110]][i], { halo: i % 2, mantle: [[40, 60, 130], [150, 40, 40], [60, 90, 60], [220, 200, 150]][i] }); person(c, x + 90, 420, 180, [[90, 120, 70], [210, 200, 180], [150, 50, 50], [60, 80, 140]][i], { crown: i === 1 });
    c.fillStyle = '#2c4a2a'; c.fillRect(x, 420, 128, 92); c.fillStyle = 'rgba(230,200,90,0.8)'; for (let k = 0; k < 26; k++) { c.beginPath(); c.arc(x + r() * 128, 428 + r() * 78, 2.2, 0, 7); c.fill(); }
  }
  c.strokeStyle = '#c8a850'; c.lineWidth = 6; c.strokeRect(515, 3, 506, 506);
  // retable doré : saints sous des gâbles
  c.fillStyle = '#c69c3c'; c.fillRect(1024, 0, 512, 256);
  for (let i = 0; i < 5; i++) { const x = 1024 + 12 + i * 98; c.fillStyle = i === 2 ? '#7c1e1e' : '#1f3a82'; c.beginPath(); c.moveTo(x, 244); c.lineTo(x, 80); c.lineTo(x + 45, 22); c.lineTo(x + 90, 80); c.lineTo(x + 90, 244); c.closePath(); c.fill(); person(c, x + 45, 240, i === 2 ? 190 : 165, [[200, 60, 50], [230, 220, 200], [40, 60, 150], [90, 130, 80], [200, 170, 90]][i], { halo: 1, mantle: i === 2 ? [150, 40, 40] : null }); }
  c.strokeStyle = '#7a5a1c'; c.lineWidth = 6; c.strokeRect(1027, 3, 506, 250);
  // tribune : baies géminées ouvertes sur la pénombre
  c.fillStyle = '#cfc4a8'; c.fillRect(1024, 256, 512, 256);
  for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) { const x = 1024 + 26 + i * 256 + k * 104; c.fillStyle = '#231d18'; c.beginPath(); c.moveTo(x, 500); c.lineTo(x, 380); c.quadraticCurveTo(x + 4, 300, x + 48, 276); c.quadraticCurveTo(x + 92, 300, x + 96, 380); c.lineTo(x + 96, 500); c.closePath(); c.fill(); }
  for (let i = 0; i < 2; i++) { const x = 1024 + i * 256; c.fillStyle = '#a89c82'; c.fillRect(x + 122, 380, 12, 120); c.fillRect(x, 500, 256, 12); c.strokeStyle = '#8c8068'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 14, 400); c.quadraticCurveTo(x + 128, 220, x + 242, 400); c.stroke(); }
  // livre ouvert
  c.fillStyle = '#5a3a24'; c.fillRect(1536, 0, 256, 256); c.fillStyle = '#eadfc0'; c.fillRect(1548, 14, 112, 228); c.fillRect(1668, 14, 112, 228);
  for (let p = 0; p < 2; p++) { const x = 1556 + p * 120; c.fillStyle = p ? '#2a3f8c' : '#a02c28'; c.fillRect(x, 24, 28, 30); c.fillStyle = '#d8b048'; c.fillRect(x + 4, 28, 20, 22); c.fillStyle = 'rgba(40,30,24,0.8)'; for (let l = 0; l < 22; l++) c.fillRect(x + (l < 4 ? 34 : 0), 26 + l * 9.4, (l < 4 ? 62 : 96) - r() * 14, 3); }
  // porte de chêne à pentures, dans son ébrasement
  c.fillStyle = '#b8ac90'; c.fillRect(1792, 0, 256, 512); c.fillStyle = '#5c3e26'; c.beginPath(); c.moveTo(1816, 512); c.lineTo(1816, 170); c.quadraticCurveTo(1822, 60, 1920, 22); c.quadraticCurveTo(2018, 60, 2024, 170); c.lineTo(2024, 512); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(30,20,12,0.55)'; c.lineWidth = 2; for (let x = 1836; x < 2024; x += 26) { c.beginPath(); c.moveTo(x, 60); c.lineTo(x, 512); c.stroke(); } c.beginPath(); c.moveTo(1920, 22); c.lineTo(1920, 512); c.lineWidth = 4; c.stroke();
  c.strokeStyle = '#22201f'; c.lineWidth = 7; for (const y of [210, 330, 450]) for (const d of [-1, 1]) { c.beginPath(); c.moveTo(1920 + d * 100, y); c.lineTo(1920 + d * 22, y); c.stroke(); c.beginPath(); c.arc(1920 + d * 22, y, 9, 0, 7); c.stroke(); }
  // soubassement peint : arcatures trilobées sur fonds rouge et bleu
  c.fillStyle = '#c8a548'; c.fillRect(0, 512, 512, 256);
  for (let i = 0; i < 4; i++) { const x = i * 128; c.fillStyle = i % 2 ? '#213a88' : '#8a2622'; c.beginPath(); c.moveTo(x + 10, 768); c.lineTo(x + 10, 600); c.quadraticCurveTo(x + 14, 548, x + 64, 528); c.quadraticCurveTo(x + 114, 548, x + 118, 600); c.lineTo(x + 118, 768); c.closePath(); c.fill(); c.fillStyle = '#d8b048'; for (let k = 0; k < 6; k++) lis(c, x + 34 + (k % 2) * 60, 626 + Math.floor(k / 2) * 46, 12); }
  // écu de France ancien
  c.fillStyle = '#806c50'; c.fillRect(1536, 256, 256, 256); c.fillStyle = '#1e3486'; c.beginPath(); c.moveTo(1560, 276); c.lineTo(1768, 276); c.lineTo(1768, 390); c.quadraticCurveTo(1760, 470, 1664, 500); c.quadraticCurveTo(1568, 470, 1560, 390); c.closePath(); c.fill(); c.fillStyle = '#d8b048'; for (const [x, y] of [[1600, 312], [1664, 312], [1728, 312], [1632, 370], [1696, 370], [1664, 430]]) lis(c, x, y, 20);
  // drap rayé (dais, courtines)
  for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#8a2420' : '#d0a84a'; c.fillRect(512 + i * 32, 512, 32, 256); } c.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 16; i++) c.fillRect(512 + i * 32 + 22, 512, 10, 256);
  // galerie des rois : niches peintes
  c.fillStyle = '#d6cab0'; c.fillRect(1024, 512, 512, 512);
  for (let i = 0; i < 4; i++) { const x = 1024 + i * 128; c.fillStyle = i % 2 ? '#223a84' : '#8a2622'; c.fillRect(x + 12, 560, 104, 440); c.fillStyle = '#c8a548'; c.beginPath(); c.moveTo(x + 6, 566); c.lineTo(x + 64, 520); c.lineTo(x + 122, 566); c.closePath(); c.fill(); person(c, x + 64, 992, 330, [[40, 60, 140], [150, 40, 40], [60, 100, 70], [200, 180, 120]][i], { crown: 1, mantle: [[200, 180, 120], [40, 60, 140], [150, 40, 40], [60, 60, 100]][i] }); }
  // verdure (tenture de feuillages)
  c.fillStyle = '#27452c'; c.fillRect(0, 768, 512, 256); for (let k = 0; k < 500; k++) { c.fillStyle = css([40 + r() * 60, 90 + r() * 70, 40 + r() * 40], 0.8); c.beginPath(); c.ellipse(r() * 512, 768 + r() * 256, 4 + r() * 7, 2 + r() * 3, r() * 3, 0, 7); c.fill(); } for (let k = 0; k < 70; k++) { c.fillStyle = css([[220, 190, 90], [200, 70, 60], [230, 225, 210]][(r() * 3) | 0]); c.beginPath(); c.arc(r() * 512, 772 + r() * 248, 3, 0, 7); c.fill(); }
  c.strokeStyle = '#b89a4a'; c.lineWidth = 8; c.strokeRect(4, 772, 504, 248);
  return texOf(cv, false);
}

// ------------------------------------------------------------------ vitraux (alpha = forme de la baie)
function lancetPath(c, X, w, H) { const s = w * 0.866; c.beginPath(); c.moveTo(X, H); c.lineTo(X, s); c.arc(X + w, s, w, Math.PI, (4 * Math.PI) / 3); c.arc(X, s, w, (5 * Math.PI) / 3, 2 * Math.PI); c.lineTo(X + w, H); c.closePath(); }
const GLASS = { blue: [26, 58, 170], red: [186, 34, 40], gold: [232, 190, 60], green: [40, 128, 76], purple: [116, 50, 136], white: [236, 236, 224], flesh: [232, 190, 160], sky: [90, 150, 220] };
function leads(c, X, Y, w, h, step, r, a = 0.9) { c.strokeStyle = `rgba(16,14,16,${a})`; c.lineWidth = 2; for (let y = Y; y < Y + h; y += step) for (let x = X; x < X + w; x += step) { c.strokeRect(x + (r() - 0.5) * 3, y + (r() - 0.5) * 3, step, step); } }
function makeGlass(r) {
  const [cv, c] = canvas(2048, 1024);
  const G = GLASS, W = 256, H = 1024;
  for (let t = 0; t < 4; t++) {
    const X = t * W; c.save(); lancetPath(c, X + 6, W - 12, H); c.clip();
    if (t === 0 || t === 3) {                        // XIIIe siècle : médaillons sur fond de mosaïque bleue et rouge
      const a = t === 0 ? G.blue : G.red, b2 = t === 0 ? G.red : G.blue;
      for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) { c.fillStyle = css(mul(((x + y) / 16) % 2 ? a : mul(a, 0.75), 0.75 + r() * 0.5)); c.fillRect(X + x, y, 16, 16); if (((x / 16) % 3 === 1) && ((y / 16) % 3 === 1)) { c.fillStyle = css(mul(b2, 0.8 + r() * 0.4)); c.fillRect(X + x + 4, y + 4, 8, 8); } }
      leads(c, X, 0, W, H, 16, r, 0.5);
      for (let m = 0; m < 5; m++) {
        const cy = 230 + m * 170, cx = X + W / 2; c.fillStyle = css(G.white); c.beginPath(); c.arc(cx, cy, 78, 0, 7); c.fill(); c.fillStyle = css(mul(m % 2 ? G.red : G.blue, 1.05)); c.beginPath(); c.arc(cx, cy, 70, 0, 7); c.fill();
        for (let k = 0; k < 3; k++) { const px = cx - 36 + k * 36; person(c, px, cy + 56, 96, [G.gold, G.green, G.purple, G.white, G.sky][(r() * 5) | 0], { halo: r() < 0.5 }); }
        c.strokeStyle = 'rgba(16,14,16,0.85)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 74, 0, 7); c.stroke();
      }
      c.fillStyle = css(G.white); for (let y = 6; y < H; y += 26) for (const x of [14, W - 14]) { c.beginPath(); c.arc(X + x, y, 5, 0, 7); c.fill(); }
      c.fillStyle = 'rgba(14,12,14,0.9)'; for (let y = 140; y < H; y += 170) c.fillRect(X, y, W, 6);                                      // barlotières
    } else {                                         // XIVe siècle : grisaille claire, bordure de couleur, personnage sous un dais
      c.fillStyle = css([226, 228, 214]); c.fillRect(X, 0, W, H);
      c.strokeStyle = 'rgba(40,40,40,0.55)'; c.lineWidth = 1.6; for (let k = -H; k < H + W; k += 30) { c.beginPath(); c.moveTo(X + k, 0); c.lineTo(X + k + H, H); c.stroke(); c.beginPath(); c.moveTo(X + k + H, 0); c.lineTo(X + k, H); c.stroke(); }
      for (let y = 0; y < H; y += 60) for (let x = 15; x < W; x += 60) { c.fillStyle = css([G.gold, G.red, G.blue][((x + y) / 60 | 0) % 3], 0.9); c.beginPath(); c.arc(X + x + ((y / 60) % 2) * 30, y + 30, 6, 0, 7); c.fill(); }
      for (let y = 0; y < H; y += 34) for (const x of [6, W - 28]) { c.fillStyle = css([G.blue, G.red, G.gold][(y / 34 | 0) % 3]); c.fillRect(X + x, y, 22, 32); }
      if (t === 1) {
        const cx = X + W / 2; c.fillStyle = css(G.blue); c.fillRect(X + 50, 330, W - 100, 420); c.fillStyle = css(G.red, 0.9); for (let k = 0; k < 30; k++) c.fillRect(X + 54 + r() * (W - 116), 336 + r() * 400, 7, 7);
        c.fillStyle = css(G.gold); c.beginPath(); c.moveTo(X + 44, 330); c.lineTo(cx, 220); c.lineTo(X + W - 44, 330); c.closePath(); c.fill(); for (const d of [-1, 0, 1]) c.fillRect(cx + d * 52 - 5, 200 + Math.abs(d) * 70, 10, 60); c.fillRect(X + 44, 750, W - 88, 22);
        person(c, cx, 748, 380, [G.green, G.purple, G.red][(r() * 3) | 0], { halo: 1, mantle: G.white });
      } else { c.fillStyle = css(G.blue); c.beginPath(); c.moveTo(X + 88, 420); c.lineTo(X + 168, 420); c.lineTo(X + 168, 480); c.quadraticCurveTo(X + 164, 520, X + 128, 536); c.quadraticCurveTo(X + 92, 520, X + 88, 480); c.closePath(); c.fill(); c.fillStyle = css(G.gold); for (const [x, y] of [[108, 444], [148, 444], [128, 486]]) lis(c, X + x, y, 11); }
      c.fillStyle = 'rgba(14,12,14,0.9)'; for (let y = 180; y < H; y += 200) c.fillRect(X, y, W, 5);
      // remplage : meneau central et oculus
      c.fillStyle = '#b4a88e'; c.fillRect(X + W / 2 - 5, 190, 10, H); c.beginPath(); c.arc(X + W / 2, 120, 62, 0, 7); c.arc(X + W / 2, 120, 50, 0, 7, true); c.fill();
    }
    c.restore();
    c.strokeStyle = '#b4a88e'; c.lineWidth = 10; lancetPath(c, X + 6, W - 12, H); c.stroke();
  }
  // rose
  const cx = 1536, cy = 512, R = 500;
  c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.clip();
  c.fillStyle = css(mul(G.blue, 0.8)); c.fillRect(1024, 0, 1024, 1024);
  for (let k = 0; k < 2600; k++) { const a = r() * 6.283, d = Math.sqrt(r()) * R; c.fillStyle = css(mul([G.blue, G.red, G.purple, G.blue, G.sky, G.gold][(r() * 6) | 0], 0.7 + r() * 0.5)); c.fillRect(cx + Math.cos(a) * d - 7, cy + Math.sin(a) * d - 7, 14, 14); }
  for (let k = 0; k < 24; k++) { const a = (k / 24) * 6.283, x = cx + Math.cos(a) * 400, y = cy + Math.sin(a) * 400; c.fillStyle = css(k % 2 ? G.red : G.white); c.beginPath(); c.arc(x, y, 46, 0, 7); c.fill(); c.fillStyle = css(k % 2 ? G.gold : G.blue); c.beginPath(); c.arc(x, y, 34, 0, 7); c.fill(); person(c, x, y + 26, 50, [G.white, G.green, G.gold][k % 3], { halo: 1 }); }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.283 + 0.26, x = cx + Math.cos(a) * 235, y = cy + Math.sin(a) * 235; c.fillStyle = css(G.white); c.beginPath(); c.arc(x, y, 52, 0, 7); c.fill(); c.fillStyle = css(k % 2 ? G.blue : G.red); c.beginPath(); c.arc(x, y, 42, 0, 7); c.fill(); person(c, x, y + 30, 58, [G.gold, G.white, G.green][k % 3], { halo: 1 }); }
  c.fillStyle = css(G.gold); c.beginPath(); c.arc(cx, cy, 86, 0, 7); c.fill(); c.fillStyle = css(G.blue); c.beginPath(); c.arc(cx, cy, 72, 0, 7); c.fill(); person(c, cx, cy + 50, 100, G.red, { halo: 1, mantle: G.white });
  // remplage de pierre
  c.strokeStyle = '#b4a88e'; c.lineCap = 'round';
  for (let k = 0; k < 24; k++) { const a = (k / 24) * 6.283 + 0.1309; c.lineWidth = k % 2 ? 7 : 10; c.beginPath(); c.moveTo(cx + Math.cos(a) * (k % 2 ? 305 : 92), cy + Math.sin(a) * (k % 2 ? 305 : 92)); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.stroke(); }
  c.lineWidth = 9; for (const q of [92, 305, 462]) { c.beginPath(); c.arc(cx, cy, q, 0, 7); c.stroke(); }
  c.restore(); c.lineWidth = 22; c.beginPath(); c.arc(cx, cy, R - 10, 0, 7); c.stroke();
  const t = texOf(cv, false); t.premultiplyAlpha = false; return t;
}

// ------------------------------------------------------------------ matériaux
export function makeInteriorMaterials(app) {
  const r = mulberry32(421), M = app.materials, std = (map, o = {}) => new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.92, metalness: 0, ...o });
  const art = makeArt(r), glass = makeGlass(r);
  return {
    stone: M.stone, plain: M.plain, slab: std(texSlab(r)), tile: std(texTile(r), { roughness: 0.7 }), wood: std(texWood(r)), faux: std(texFaux(r)), roman: std(texRoman(r)), azure: std(texAzure(r)), plaster: std(texPlaster(r)), marble: std(texMarble(r), { roughness: 0.55 }),
    art: std(art), artD: std(art, { side: THREE.DoubleSide }),
    glass: new THREE.MeshBasicMaterial({ map: glass, vertexColors: true, alphaTest: 0.5, fog: false }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.25 }),
  };
}

// ------------------------------------------------------------------ géométrie
function nrm(p0, p1, p3) { const ex = p1[0] - p0[0], ey = p1[1] - p0[1], ez = p1[2] - p0[2], fx = p3[0] - p0[0], fy = p3[1] - p0[1], fz = p3[2] - p0[2]; const n = [ey * fz - ez * fy, ez * fx - ex * fz, ex * fy - ey * fx], l = Math.hypot(n[0], n[1], n[2]) || 1; return [n[0] / l, n[1] / l, n[2] / l]; }
// Quadrilatère quelconque p0 p1 (bas) p2 p3 (haut), tourné vers `ref` (ou à l'opposé si away). UV et ombres par sommet.
export function QV(b, P, UV, ref, col = 0xffffff, S = [1, 1, 1, 1], away = false) {
  let n = nrm(P[0], P[1], P[3]); if (!(n[0] || n[1] || n[2])) n = nrm(P[1], P[2], P[0]);
  let d = n[0] * (ref[0] - P[0][0]) + n[1] * (ref[1] - P[0][1]) + n[2] * (ref[2] - P[0][2]); if (away) d = -d;
  if (d < 0) n = [-n[0], -n[1], -n[2]];
  b.need(4, 6); const i = b.n;
  for (let k = 0; k < 4; k++) b.v(P[k][0], P[k][1], P[k][2], n[0], n[1], n[2], UV[k][0], UV[k][1], col, S[k]);
  const q = b.ni, ix = d >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]; for (let k = 0; k < 6; k++) b.idx[q + k] = i + ix[k]; b.ni += 6;
}
// Quadrilatère plan avec UV en mètres (us) ou cellule d'atlas (uv = [u0, v0, u1, v1]).
export function Q(b, p0, p1, p2, p3, ref, o = {}) {
  const us = o.us ?? 0.25; let u0, v0, u1, v1;
  if (o.uv) [u0, v0, u1, v1] = o.uv; else { u0 = o.uo ?? 0; v0 = o.vo ?? 0; u1 = u0 + Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) * us; v1 = v0 + Math.hypot(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]) * us; }
  const s0 = o.s0 ?? 1, s1 = o.s1 ?? 1;
  QV(b, [p0, p1, p2, p3], [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], ref, o.col ?? 0xffffff, [s0, s0, s1, s1], o.away);
}
export const cellUV = (c, W = ART.W, H = ART.H, pad = 2) => [(c[0] + pad) / W, 1 - (c[1] + c[3] - pad) / H, (c[0] + c[2] - pad) / W, 1 - (c[1] + pad) / H];

// Surface paramétrée lissée (voûtes) : f(u, v) → [x, y, z, ombre, tu, tv].
export function surf(b, nu, nv, f, ref, col = 0xffffff) {
  const P = []; for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) P.push(f(i / nu, j / nv));
  const at = (i, j) => P[Math.max(0, Math.min(nv, j)) * (nu + 1) + Math.max(0, Math.min(nu, i))];
  b.need((nu + 1) * (nv + 1), nu * nv * 6); const i0 = b.n;
  const g = nrm(at(0, 0), at(1, 0), at(0, 1)), flip = g[0] * (ref[0] - P[0][0]) + g[1] * (ref[1] - P[0][1]) + g[2] * (ref[2] - P[0][2]) < 0;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const p = at(i, j), a = at(i + 1, j), a2 = at(i - 1, j), c = at(i, j + 1), c2 = at(i, j - 1);
    let n = nrm([0, 0, 0], [a[0] - a2[0], a[1] - a2[1], a[2] - a2[2]], [c[0] - c2[0], c[1] - c2[1], c[2] - c2[2]]); if (flip) n = [-n[0], -n[1], -n[2]];
    b.v(p[0], p[1], p[2], n[0], n[1], n[2], p[4], p[5], col, p[3]);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = i0 + j * (nu + 1) + i, c = a + 1, d = a + nu + 2, e = a + nu + 1, q = b.ni, ix = flip ? [a, d, c, a, e, d] : [a, c, d, a, d, e]; for (let k = 0; k < 6; k++) b.idx[q + k] = ix[k]; b.ni += 6; }
}

// Profil d'arc : t = 0 à la clef, 1 à la naissance ; s = 0 plein cintre, 1 arc brisé équilatéral.
export const prof = (t, s = 1) => Math.sqrt(Math.max(0, (1 + s) * (1 + s) - (t + s) * (t + s))) / Math.sqrt(1 + 2 * s);

export class Kit {
  constructor(app, mats, seed) { this.app = app; this.mats = mats; this.B = new Builder(); this.figs = []; this.lights = []; this.obst = []; this.spots = []; this.r = mulberry32(seed); this.s = 1; }
  b(mat) { return this.B.at(mat, 0, 0); }
  block(x0, z0, x1, z1) { this.obst.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]); }
  pillarBlock(x, z, r) { this.obst.push([x, z, r]); }
  free(x, z) { for (const o of this.obst) { if (o.length === 3) { if (Math.hypot(x - o[0], z - o[1]) < o[2] + 0.3) return false; } else if (x > o[0] - 0.3 && x < o[2] + 0.3 && z > o[1] - 0.3 && z < o[3] + 0.3) return false; } return true; }
  fig(x, z, heading, kind = 'man', role = null, o = {}) { this.figs.push([x, o.y || 0, z, heading, kind, role, o.col || null, o.scale || 0, o.v || null]); }
  light(x, y, z, intensity = 1, dist = 18, col = 0xffb060) { this.lights.push([x, y, z, intensity, dist, col]); }

  // ---- parois
  wall(mat, x0, z0, x1, z1, y0, y1, ref, o = {}) { const us = o.us ?? 0.25; Q(this.b(mat), [x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], ref, { us, vo: y0 * us, s0: o.s0 ?? 0.72, s1: o.s1 ?? 1, ...o }); }
  floor(mat, x0, z0, x1, z1, y = 0, o = {}) { const us = o.us ?? 0.25; QV(this.b(mat), [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], [[x0 * us, z0 * us], [x1 * us, z0 * us], [x1 * us, z1 * us], [x0 * us, z1 * us]], [x0, y + (o.down ? -9 : 9), z0], o.col ?? 0xffffff, [1, 1, 1, 1].map(() => o.s ?? 1)); }
  // panneau d'atlas (tenture, porte, retable) entre deux points au sol, décalé vers ref
  panel(cell, x0, z0, x1, z1, y0, y1, ref, o = {}) {
    const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1; let nx = -dz / l, nz = dx / l; if (nx * (ref[0] - x0) + nz * (ref[2] - z0) < 0) { nx = -nx; nz = -nz; }
    const e = o.off ?? 0.05; Q(this.b(o.mat || 'art'), [x0 + nx * e, y0, z0 + nz * e], [x1 + nx * e, y0, z1 + nz * e], [x1 + nx * e, y1, z1 + nz * e], [x0 + nx * e, y1, z0 + nz * e], ref, { uv: o.uv || cellUV(cell), col: o.col, s0: o.s0 ?? 0.9 });
  }
  // baie à lancette : sommet en arc brisé, partie droite répétée
  lancet(x0, z0, x1, z1, y0, y1, ref, type = 0) {
    const dx = x1 - x0, dz = z1 - z0, w = Math.hypot(dx, dz); let nx = -dz / w, nz = dx / w; if (nx * (ref[0] - x0) + nz * (ref[2] - z0) < 0) { nx = -nx; nz = -nz; }
    const e = 0.06, b = this.b('glass'), u0 = (type * 256 + 3) / 2048, u1 = ((type + 1) * 256 - 3) / 2048, ht = Math.min(w, (y1 - y0) * 0.5), ym = y1 - ht, n = Math.max(1, Math.round((ym - y0) / (3 * w)));
    const P = (x, y, z) => [x + nx * e, y, z + nz * e];
    Q(b, P(x0, ym, z0), P(x1, ym, z1), P(x1, y1, z1), P(x0, y1, z0), ref, { uv: [u0, 0.75, u1, 1 - 2 / 1024] });
    for (let k = 0; k < n; k++) { const a = y0 + ((ym - y0) * k) / n, c = y0 + ((ym - y0) * (k + 1)) / n; Q(b, P(x0, a, z0), P(x1, a, z1), P(x1, c, z1), P(x0, c, z0), ref, { uv: [u0, 2 / 1024, u1, 0.75] }); }
  }
  rose(cx, cy, cz, D, nx, nz) {
    const tx = -nz, tz = nx, h = D / 2, e = 0.07, b = this.b('glass'), X = (s) => cx + tx * h * s + nx * e, Z = (s) => cz + tz * h * s + nz * e;
    Q(b, [X(-1), cy - h, Z(-1)], [X(1), cy - h, Z(1)], [X(1), cy + h, Z(1)], [X(-1), cy + h, Z(-1)], [cx + nx * 9, cy, cz + nz * 9], { uv: [0.5 + 2 / 2048, 2 / 1024, 1 - 2 / 2048, 1 - 2 / 1024] });
  }

  // ---- voûtes
  // Voûte d'ogives sur un rectangle : naissance ySp, clef yAp. o.barrel : 'x' (berceau dont l'axe suit x) ou 'z'.
  vault(mat, x0, x1, z0, z1, ySp, yAp, o = {}) {
    const s = o.s ?? this.s, n = o.n ?? 8, us = o.us ?? 0.25, xc = (x0 + x1) / 2, zc = (z0 + z1) / 2, rise = yAp - ySp, w = Math.abs(x1 - x0), d = Math.abs(z1 - z0);
    const H = (x, z) => { const px = prof(Math.min(1, (Math.abs(x - xc) * 2) / w), s), pz = prof(Math.min(1, (Math.abs(z - zc) * 2) / d), s); return ySp + rise * (o.barrel === 'z' ? px : o.barrel === 'x' ? pz : Math.max(px, pz)); };
    surf(this.b(mat), n, n, (u, v) => { const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * v, y = H(x, z); return [x, y, z, (o.dark ?? 0.6) + (1 - (o.dark ?? 0.6)) * ((y - ySp) / rise), x * us, z * us]; }, [xc, ySp - 9, zc], o.col ?? 0xffffff);
    if (o.ribs === false || o.barrel) return H;
    const rc = o.ribCol ?? C.stone, m = 10, d1 = [], d2 = [];
    for (let i = 0; i <= m; i++) { const t = i / m, x = x0 + (x1 - x0) * t; d1.push([x, H(x, z0 + (z1 - z0) * t), z0 + (z1 - z0) * t]); d2.push([x, H(x, z1 + (z0 - z1) * t), z1 + (z0 - z1) * t]); }
    this.rib(d1, o.ribW ?? 0.3, o.ribD ?? 0.26, rc); this.rib(d2, o.ribW ?? 0.3, o.ribD ?? 0.26, rc);
    cyl(this.b('plain'), xc, zc, 0.42, yAp - 0.5, yAp - 0.24, { seg: 8, col: o.boss ?? C.gold, s0: 1 }); disc(this.b('plain'), xc, zc, 0.42, yAp - 0.5, { seg: 8, col: o.boss ?? C.gold });
    return H;
  }
  // nervure : prisme suivant une ligne de points, saillant de d sous la voûte
  rib(pts, w, d, col = C.stone, mat = 'stone') {
    const b = this.b(mat);
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i], Bp = pts[i + 1], dx = Bp[0] - A[0], dz = Bp[2] - A[2], l = Math.hypot(dx, dz) || 1, px = (-dz / l) * w * 0.5, pz = (dx / l) * w * 0.5;
      const a0 = [A[0] - px, A[1] - d, A[2] - pz], a1 = [A[0] + px, A[1] - d, A[2] + pz], b0 = [Bp[0] - px, Bp[1] - d, Bp[2] - pz], b1 = [Bp[0] + px, Bp[1] - d, Bp[2] + pz];
      Q(b, a0, b0, b1, a1, [A[0], A[1] - 30, A[2]], { col, s0: 0.86, s1: 0.86 });
      Q(b, a0, b0, [Bp[0] - px, Bp[1] + 0.05, Bp[2] - pz], [A[0] - px, A[1] + 0.05, A[2] - pz], [A[0], A[1] - d, A[2]], { col, away: true, s0: 0.7, s1: 0.6 });
      Q(b, a1, b1, [Bp[0] + px, Bp[1] + 0.05, Bp[2] + pz], [A[0] + px, A[1] + 0.05, A[2] + pz], [A[0], A[1] - d, A[2]], { col, away: true, s0: 0.7, s1: 0.6 });
    }
  }
  // arc-doubleau entre deux points de naissance
  crossRib(x0, z0, x1, z1, ySp, yAp, o = {}) {
    const s = o.s ?? this.s, pts = [], m = 12; for (let i = 0; i <= m; i++) { const t = i / m; pts.push([x0 + (x1 - x0) * t, ySp + (yAp - ySp) * prof(Math.abs(t * 2 - 1), s), z0 + (z1 - z0) * t]); }
    this.rib(pts, o.w ?? 0.5, o.d ?? 0.4, o.col ?? C.stone);
  }
  // Mur percé d'une arcade entre deux supports : deux parements et l'intrados.
  archWall(mat, x0, z0, x1, z1, o) {
    const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len, nx = -uz, nz = ux, th = (o.th ?? 0.9) / 2, ins = o.inset ?? 0.55, s = o.s ?? this.s, us = 0.25, col = o.col ?? 0xffffff;
    const a0 = ins, a1 = len - ins, am = len / 2, ha = (a1 - a0) / 2, rise = Math.min(ha * Math.sqrt(1 + 2 * s), o.yTop - o.ySp - (o.minTop ?? 0.4));
    const yA = (a) => (a <= a0 || a >= a1 ? o.ySp : o.ySp + rise * prof(Math.abs(a - am) / ha, s));
    const n = o.n ?? 12, b = this.b(mat), as = [0]; for (let i = 0; i <= n; i++) as.push(a0 + ((a1 - a0) * i) / n); as.push(len);
    const X = (a, sd) => x0 + ux * a + nx * th * sd, Z = (a, sd) => z0 + uz * a + nz * th * sd, sh = (y) => 0.66 + 0.34 * Math.min(1, (y - o.ySp) / Math.max(1, o.yTop - o.ySp));
    for (let i = 0; i < as.length - 1; i++) {
      const p = as[i], q = as[i + 1], yp = yA(p), yq = yA(q);
      for (const sd of [-1, 1]) QV(b, [[X(p, sd), yp, Z(p, sd)], [X(q, sd), yq, Z(q, sd)], [X(q, sd), o.yTop, Z(q, sd)], [X(p, sd), o.yTop, Z(p, sd)]], [[p * us, yp * us], [q * us, yq * us], [q * us, o.yTop * us], [p * us, o.yTop * us]], [X(p, sd) + nx * sd * 9, yp, Z(p, sd) + nz * sd * 9], col, [sh(yp), sh(yq), 1, 1]);
      if (p >= a0 && q <= a1) QV(b, [[X(p, -1), yp, Z(p, -1)], [X(p, 1), yp, Z(p, 1)], [X(q, 1), yq, Z(q, 1)], [X(q, -1), yq, Z(q, -1)]], [[0, p * us], [th * 2 * us, p * us], [th * 2 * us, q * us], [0, q * us]], [x0 + ux * am, o.ySp - 2, z0 + uz * am], col, [0.62, 0.62, 0.62, 0.62]);
    }
    return o.ySp + rise;
  }
  // pile ronde : base, fût, chapiteau à corbeille évasée, tailloir
  pier(x, z, r, h, o = {}) {
    const b = this.b('stone'), col = o.col ?? C.stone, seg = o.seg ?? 12;
    cyl(b, x, z, r * 1.4, 0, 0.3, { seg, col, s0: 0.7 }); cyl(b, x, z, r * 1.4, 0.3, 0.55, { seg, col, r1: r * 1.08, s0: 0.85 });
    cyl(b, x, z, r, 0.55, h - 0.8, { seg, col, s0: 0.74, vBot: 0.14, vTop: (h - 0.8) * 0.25 }); cyl(b, x, z, r, h - 0.8, h - 0.2, { seg, col: o.cap ?? col, r1: r * 1.42, s0: 0.8 });
    cyl(b, x, z, r * 1.5, h - 0.2, h, { seg: 8, col, s0: 0.95 }); disc(b, x, z, r * 1.5, h - 0.2, { seg: 8, col: tint(col, 0.6) });
    this.pillarBlock(x, z, r * 1.4 + 0.25);
  }
  shaft(x, z, r, y0, y1, col = C.stone) { cyl(this.b('stone'), x, z, r, y0, y1, { seg: 6, col, s0: 0.8 }); }

  // poutre de section rectangulaire entre deux points (quatre faces, visible aussi par-dessous)
  beam(mat, a, c, w, h, col = C.wood) {
    const b = this.b(mat), dx = c[0] - a[0], dz = c[2] - a[2], l = Math.hypot(dx, dz), px = l > 1e-6 ? (-dz / l) * w * 0.5 : w * 0.5, pz = l > 1e-6 ? (dx / l) * w * 0.5 : 0, hh = h * 0.5, mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
    const P = (q, sx, sy) => [q[0] + px * sx, q[1] + hh * sy, q[2] + pz * sx], o = { col, away: true, us: 0.5, s0: 0.8, s1: 0.8 };
    Q(b, P(a, -1, -1), P(c, -1, -1), P(c, 1, -1), P(a, 1, -1), mid, { ...o, s0: 0.62, s1: 0.62 }); Q(b, P(a, -1, 1), P(c, -1, 1), P(c, 1, 1), P(a, 1, 1), mid, o);
    Q(b, P(a, -1, -1), P(c, -1, -1), P(c, -1, 1), P(a, -1, 1), mid, o); Q(b, P(a, 1, -1), P(c, 1, -1), P(c, 1, 1), P(a, 1, 1), mid, o);
  }

  // ---- mobilier (les boîtes n'ont pas de dessous)
  bx(mat, x, z, hl, hw, y0, y1, col, ang = 0, o = {}) { box(this.b(mat), { cx: x, cz: z, ux: Math.cos(ang), uz: Math.sin(ang), hl, hw }, y0, y1, { col, s0: o.s0 ?? 0.72, s1: 1, us: o.us ?? 0.25, vs: o.us ?? 0.25, topCol: o.topCol, top: o.top }); }
  solid(x, z, hl, hw, ang = 0, pad = 0.3) { const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang)), ex = hl * c + hw * s + pad, ez = hl * s + hw * c + pad; this.block(x - ex, z - ez, x + ex, z + ez); }
  table(x, z, hl, hw, ang = 0, cloth = false) {
    this.bx('wood', x, z, hl, hw, 0.74, 0.8, C.wood, ang, { us: 0.5 });
    for (const s of [-0.7, 0.7]) this.bx('plain', x + Math.cos(ang) * hl * s, z + Math.sin(ang) * hl * s, 0.06, hw * 0.8, 0, 0.74, C.woodD, ang, { top: false });
    if (cloth) { this.bx('plain', x, z, hl + 0.04, hw + 0.04, 0.5, 0.82, C.white, ang, { s0: 0.8 }); }
    this.solid(x, z, hl, hw, ang, 0.25);
  }
  bench(x, z, hl, ang = 0) { this.bx('wood', x, z, hl, 0.2, 0.4, 0.46, C.woodL, ang, { us: 0.5 }); for (const s of [-0.8, 0.8]) this.bx('plain', x + Math.cos(ang) * hl * s, z + Math.sin(ang) * hl * s, 0.04, 0.17, 0, 0.4, C.woodD, ang, { top: false }); this.solid(x, z, hl, 0.2, ang, 0.2); }
  chest(x, z, ang = 0, col = C.wood) { this.bx('wood', x, z, 0.7, 0.34, 0, 0.55, col, ang, { us: 0.6 }); this.bx('plain', x, z, 0.72, 0.36, 0.55, 0.64, C.woodD, ang); for (const s of [-0.45, 0.45]) this.bx('plain', x + Math.cos(ang) * s, z + Math.sin(ang) * s, 0.04, 0.37, 0, 0.66, C.iron, ang); this.solid(x, z, 0.7, 0.34, ang, 0.2); }
  barrel(x, z, h = 1.0, r = 0.36) { const b = this.b('wood'); cyl(b, x, z, r, 0, h, { seg: 10, col: C.wood, us: 0.6, vs: 0.6 }); disc(this.b('plain'), x, z, r, h, { seg: 10, col: C.woodD }); for (const y of [0.12, h - 0.16]) cyl(this.b('plain'), x, z, r + 0.015, y, y + 0.06, { seg: 10, col: C.iron }); this.pillarBlock(x, z, r + 0.25); }
  bed(x, z, ang, o = {}) {
    const c = Math.cos(ang), s = Math.sin(ang), hl = 1.05, hw = o.hw ?? 0.75;
    this.bx('wood', x, z, hl, hw, 0.18, 0.5, C.wood, ang, { us: 0.5 }); this.bx('plain', x, z, hl - 0.04, hw - 0.04, 0.5, 0.62, C.linen, ang);
    this.bx('plain', x + c * 0.22, z + s * 0.22, hl * 0.76, hw - 0.02, 0.5, 0.68, o.cover ?? C.red, ang, { s0: 0.8 }); this.bx('plain', x - c * (hl - 0.28), z - s * (hl - 0.28), 0.2, hw * 0.8, 0.62, 0.74, C.white, ang);
    this.bx('wood', x - c * (hl + 0.05), z - s * (hl + 0.05), 0.05, hw, 0, 1.25, C.woodD, ang, { us: 0.5 }); this.solid(x, z, hl, hw, ang, 0.2);
    if (o.sick) this.sleeper(x, z, ang);
  }
  sleeper(x, z, ang) { const c = Math.cos(ang), s = Math.sin(ang); this.bx('plain', x - c * 0.72, z - s * 0.72, 0.1, 0.09, 0.72, 0.86, rgb(222, 184, 152), ang); this.bx('plain', x - c * 0.72, z - s * 0.72, 0.11, 0.1, 0.84, 0.88, C.white, ang); }
  lectern(x, z, ang, o = {}) {
    const c = Math.cos(ang), s = Math.sin(ang), b = this.b('wood'), nx = -s, nz = c, h0 = o.h ?? 1.02;
    this.bx('wood', x, z, 0.42, 0.24, 0, h0 - 0.12, C.wood, ang, { us: 0.6 });
    const P = (a, d, y) => [x + c * a + nx * d, y, z + s * a + nz * d];
    Q(b, P(-0.46, 0.3, h0 - 0.12), P(0.46, 0.3, h0 - 0.12), P(0.46, -0.3, h0 + 0.2), P(-0.46, -0.3, h0 + 0.2), [x + nx * 5, h0 + 6, z + nz * 5], { col: C.woodL, us: 0.6 });
    Q(this.b('art'), P(-0.36, 0.22, h0 - 0.06), P(0.36, 0.22, h0 - 0.06), P(0.36, -0.2, h0 + 0.17), P(-0.36, -0.2, h0 + 0.17), [x + nx * 5, h0 + 6, z + nz * 5], { uv: cellUV(ART.page) });
    this.solid(x, z, 0.42, 0.26, ang, 0.2);
  }
  candle(x, y, z, h = 0.3, lit = true) { cyl(this.b('plain'), x, z, 0.022, y, y + h, { seg: 5, col: C.wax, s0: 1 }); if (lit) cone(this.b('glow'), x, z, 0.03, y + h, y + h + 0.11, { seg: 5, col: rgb(255, 214, 120) }); }
  candlestick(x, z, h = 1.5, light = 0) { cyl(this.b('metal'), x, z, 0.16, 0, 0.06, { seg: 8, col: C.gold }); cyl(this.b('metal'), x, z, 0.03, 0.06, h, { seg: 6, col: C.gold }); disc(this.b('metal'), x, z, 0.1, h, { seg: 8, col: C.gold }); this.candle(x, h, z, 0.34); if (light) this.light(x, h + 0.6, z, light, 16); this.pillarBlock(x, z, 0.3); }
  torch(x, y, z, light = 1) { cyl(this.b('plain'), x, z, 0.035, y - 0.5, y, { seg: 5, col: C.woodD }); cone(this.b('glow'), x, z, 0.09, y, y + 0.36, { seg: 6, col: rgb(255, 170, 70) }); cone(this.b('glow'), x, z, 0.05, y + 0.02, y + 0.26, { seg: 6, col: rgb(255, 236, 160) }); if (light) this.light(x, y + 0.5, z, light, 20, 0xff9a48); }
  // autel sur son emmarchement : nappe, parement, retable, croix et cierges
  altar(x, z, ang = 0, o = {}) {
    const c = Math.cos(ang), s = Math.sin(ang), nx = -s, nz = c, w = o.w ?? 1.6, st = o.steps ?? 2;
    for (let k = 0; k < st; k++) this.bx('stone', x + nx * 0.3, z + nz * 0.3, w + 1.1 - k * 0.35, 1.5 - k * 0.3, 0, 0.16 * (k + 1), C.stone, ang, { topCol: C.stoneW });
    const y = 0.16 * st; this.bx('stone', x, z, w, 0.48, y, y + 1.0, C.stoneW, ang); this.bx('plain', x, z, w + 0.06, 0.54, y + 0.96, y + 1.04, C.white, ang);
    const P = (a, d) => [x + c * a + nx * d, z + s * a + nz * d], f0 = P(-w, 0.5), f1 = P(w, 0.5);
    this.panel(ART.cloth, f0[0], f0[1], f1[0], f1[1], y + 0.02, y + 0.94, [x + nx * 9, 1, z + nz * 9], { off: 0.03, col: o.front ?? 0xffffff });
    if (o.retable !== false) { const r0 = P(-w * 0.95, -0.36), r1 = P(w * 0.95, -0.36), rh = o.rh ?? 1.25; this.bx('plain', x - nx * 0.42, z - nz * 0.42, w, 0.05, y + 1.04, y + 1.08 + rh, C.gold, ang); this.panel(ART.retable, r0[0], r0[1], r1[0], r1[1], y + 1.08, y + 1.04 + rh, [x + nx * 9, 1, z + nz * 9], { off: 0.02 }); }
    this.bx('metal', x, z, 0.025, 0.025, y + 1.04, y + 1.7, C.gold, ang); this.bx('metal', x, z, 0.16, 0.025, y + 1.46, y + 1.51, C.gold, ang);
    for (const a of [-w * 0.7, w * 0.7]) { const p = P(a, 0); cyl(this.b('metal'), p[0], p[1], 0.05, y + 1.04, y + 1.3, { seg: 6, col: C.gold }); this.candle(p[0], y + 1.3, p[1], 0.36); }
    if (o.light !== 0) this.light(x + nx * 0.8, y + 2.3, z + nz * 0.8, o.light ?? 1.1, 20);
    const ex = Math.abs(c) * (w + 1.1) + Math.abs(s) * 1.6, ez = Math.abs(s) * (w + 1.1) + Math.abs(c) * 1.6; this.block(x - ex, z - ez, x + ex, z + ez);
    return y;
  }
  // statue polychrome sur un socle ou une console
  statue(x, z, heading, o = {}) { const y = o.y ?? 1.1; if (!o.console) { this.bx('stone', x, z, 0.32, 0.32, 0, y, C.stone, heading); this.pillarBlock(x, z, 0.55); } else this.bx('stone', x, z, 0.3, 0.3, y - 0.3, y, C.stone, heading); this.fig(x, z, heading, o.kind || 'robe', o.role || null, { y, scale: o.scale ?? 1.05, col: o.col, v: o.v }); }
  // cheminée à hotte : âtre, feu, lueur
  fireplace(x, z, ang, w = 2.2, o = {}) {
    const c = Math.cos(ang), s = Math.sin(ang), nx = -s, nz = c;
    for (const a of [-w, w]) this.bx('stone', x + c * a, z + s * a, 0.22, 0.5, 0, 1.9, C.stone, ang);
    this.bx('stone', x, z, w + 0.3, 0.6, 1.9, 2.3, C.stoneW, ang); box(this.b('stone'), { cx: x - nx * 0.15, cz: z - nz * 0.15, ux: c, uz: s, hl: w * 0.9, hw: 0.42 }, 2.3, o.top ?? 5.2, { col: C.stone, s0: 0.85 });
    this.bx('plain', x - nx * 0.1, z - nz * 0.1, w - 0.22, 0.36, 0, 1.9, C.black, ang, { s0: 1 }); this.bx('plain', x + nx * 0.1, z + nz * 0.1, 0.5, 0.12, 0, 0.22, C.woodD, ang);
    for (let k = 0; k < 5; k++) { const a = (k - 2) * 0.2; cone(this.b('glow'), x + c * a + nx * 0.1, z + s * a + nz * 0.1, 0.13, 0.2, 0.55 + this.r() * 0.5, { seg: 5, col: k % 2 ? rgb(255, 150, 50) : rgb(255, 214, 110) }); }
    this.light(x + nx * 1.2, 1.3, z + nz * 1.2, o.light ?? 1.6, 22, 0xff8a3c);
    const ex = Math.abs(c) * (w + 0.4) + Math.abs(s) * 0.9, ez = Math.abs(s) * (w + 0.4) + Math.abs(c) * 0.9; this.block(x - ex, z - ez, x + ex, z + ez);
  }
  banner(x, y, z, ang, col, w = 0.9, h = 2.0) { const c = Math.cos(ang), s = Math.sin(ang); this.bx('plain', x, z, w / 2 + 0.1, 0.02, y, y + 0.04, C.woodD, ang); Q(this.b('artD'), [x - c * w / 2, y - h, z - s * w / 2], [x + c * w / 2, y - h, z + s * w / 2], [x + c * w / 2, y, z + s * w / 2], [x - c * w / 2, y, z - s * w / 2], [x - s * 9, y, z + c * 9], { uv: col === 'lis' ? cellUV(ART.lis, ART.W, ART.H, 30) : cellUV(ART.cloth) }); }
  // roue verticale (horloge) : couronne à n dents dans le plan perpendiculaire à l'axe (ax, az)
  wheel(x, y, z, R, ax, az, col = C.iron, th = 0.05, n = 16) {
    const b = this.b('metal'), tx = -az, tz = ax, P = (a, q, e) => [x + tx * Math.cos(a) * q + ax * e, y + Math.sin(a) * q, z + tz * Math.cos(a) * q + az * e];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.2832, c = ((i + 1) / n) * 6.2832, ro = R * (i % 2 ? 1 : 0.93), ri = R * 0.8;
      for (const e of [-th, th]) Q(b, P(a, ri, e), P(c, ri, e), P(c, ro, e), P(a, ro, e), [x + ax * e * 99, y, z + az * e * 99], { col });
      Q(b, P(a, ro, -th), P(a, ro, th), P(c, ro, th), P(c, ro, -th), [x, y, z], { col, away: true });
      if (i % 4 === 0) for (const e of [-th, th]) Q(b, P(a - 0.05, 0, e), P(a + 0.05, 0, e), P(a + 0.05, ri, e), P(a - 0.05, ri, e), [x + ax * e * 99, y, z + az * e * 99], { col });
    }
  }
}

export { rgb, tint, box, cyl, cone, disc };
