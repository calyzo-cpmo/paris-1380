// Façades de la fin du XVIIIe siècle : enduit clair, hautes fenêtres à petits carreaux, bandeaux d'étage ;
// rez-de-chaussée de boutiques, de fenêtres barreaudées et de portes cochères. Un motif couvre quatre travées.
import * as THREE from 'three';
import { mulberry32 } from '../geom.js';
import { makeStone, makeRoof, makeStoneFx } from '../textures.js';

export const BAY = 2.5;        // largeur d'une travée (m)
export const ETAGE = 3.05;     // hauteur d'un étage courant (m)
export const RDC = 3.7;        // hauteur du rez-de-chaussée (m)

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', { willReadFrequently: true })]; }
function speckle(ctx, w, h, r, n, a) { for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(${r() < 0.5 ? '70,60,45' : '255,250,235'},${a * r()})`; ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 5); } }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }

// Étages : 4 travées × 2 niveaux.
function upper(k) {
  const bw = 128 * k, fh = 160 * k, W = bw * 4, H = fh * 2, [c, x] = canvas(W, H), [e, ex] = canvas(W, H), r = mulberry32(1789);
  x.fillStyle = 'rgb(238,231,214)'; x.fillRect(0, 0, W, H); speckle(x, W, H, r, 900 * k, 0.07);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  for (let f = 0; f < 2; f++) {
    const y0 = f * fh;
    x.fillStyle = 'rgba(255,252,240,0.55)'; x.fillRect(0, y0 + fh - 9 * k, W, 5 * k);                 // bandeau d'étage
    x.fillStyle = 'rgba(60,50,40,0.28)'; x.fillRect(0, y0 + fh - 4 * k, W, 2.5 * k);
    for (let b = 0; b < 4; b++) {
      const wx = b * bw + 36 * k, ww = 56 * k, wy = y0 + 22 * k, wh = 104 * k;
      x.fillStyle = 'rgb(250,246,234)'; x.fillRect(wx - 6 * k, wy - 6 * k, ww + 12 * k, wh + 10 * k);   // chambranle
      x.fillStyle = 'rgba(70,60,48,0.3)'; x.fillRect(wx - 6 * k, wy + wh + 4 * k, ww + 12 * k, 3 * k);   // appui
      const lit = r() < 0.34, rideau = r() < 0.4;
      x.fillStyle = rideau ? 'rgb(96,100,104)' : 'rgb(44,50,58)'; x.fillRect(wx, wy, ww, wh);
      if (rideau) { x.fillStyle = 'rgba(225,220,205,0.5)'; x.fillRect(wx + 3 * k, wy + 3 * k, ww * 0.42, wh - 6 * k); x.fillRect(wx + ww * 0.55, wy + 3 * k, ww * 0.42, wh - 6 * k); }
      x.strokeStyle = 'rgb(232,228,216)'; x.lineWidth = 2.2 * k; x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh);
      for (let q = 1; q < 4; q++) { x.moveTo(wx, wy + (wh * q) / 4); x.lineTo(wx + ww, wy + (wh * q) / 4); } x.stroke();
      x.strokeStyle = 'rgba(30,30,34,0.85)'; x.lineWidth = 1.4 * k; x.beginPath();                      // garde-corps de fer
      x.moveTo(wx, wy + wh * 0.72); x.lineTo(wx + ww, wy + wh * 0.72); for (let q = 0; q <= 7; q++) { x.moveTo(wx + (ww * q) / 7, wy + wh * 0.72); x.lineTo(wx + (ww * q) / 7, wy + wh); } x.stroke();
      x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(wx, wy, ww, 5 * k);                                  // ombre du linteau
      if (lit) { ex.fillStyle = 'rgb(255,186,104)'; ex.fillRect(wx + 2 * k, wy + 2 * k, ww - 4 * k, wh - 4 * k); ex.fillStyle = '#000'; ex.fillRect(wx + ww / 2 - k, wy, 2 * k, wh); }
    }
  }
  return { map: tex(c), emissiveMap: tex(e) };
}

// Rez-de-chaussée : 4 travées — boutique, fenêtre barreaudée, porte cochère, boutique.
function ground(k) {
  const bw = 128 * k, H = 192 * k, W = bw * 4, [c, x] = canvas(W, H), [e, ex] = canvas(W, H), r = mulberry32(89);
  x.fillStyle = 'rgb(226,218,200)'; x.fillRect(0, 0, W, H); speckle(x, W, H, r, 500 * k, 0.08);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(96,88,76,0.5)'; x.fillRect(0, H - 22 * k, W, 22 * k);                              // soubassement
  x.fillStyle = 'rgba(255,252,240,0.5)'; x.fillRect(0, 0, W, 6 * k); x.fillStyle = 'rgba(60,50,40,0.3)'; x.fillRect(0, 6 * k, W, 2.5 * k);
  const shop = (b, wood) => {
    const sx = b * bw + 10 * k, sw = bw - 20 * k, sy = 26 * k, sh = H - 26 * k;
    x.fillStyle = wood; x.fillRect(sx, sy, sw, sh);
    x.fillStyle = 'rgb(38,40,44)'; x.fillRect(sx + 8 * k, sy + 26 * k, sw - 16 * k, sh - 70 * k);
    x.strokeStyle = wood; x.lineWidth = 3 * k; x.beginPath(); x.moveTo(sx + sw / 2, sy + 26 * k); x.lineTo(sx + sw / 2, sy + sh - 44 * k); x.moveTo(sx + 8 * k, sy + 70 * k); x.lineTo(sx + sw - 8 * k, sy + 70 * k); x.stroke();
    x.fillStyle = 'rgba(255,245,215,0.22)'; x.fillRect(sx + 6 * k, sy + 6 * k, sw - 12 * k, 14 * k);    // bandeau d'enseigne
    ex.fillStyle = 'rgb(150,104,54)'; ex.fillRect(sx + 10 * k, sy + 28 * k, sw - 20 * k, sh - 74 * k);
  };
  shop(0, 'rgb(74,92,78)'); shop(3, 'rgb(104,74,52)');
  { const wx = bw + 38 * k, ww = 52 * k, wy = 44 * k, wh = 96 * k;                                         // fenêtre barreaudée
    x.fillStyle = 'rgb(246,241,228)'; x.fillRect(wx - 6 * k, wy - 6 * k, ww + 12 * k, wh + 12 * k); x.fillStyle = 'rgb(40,44,50)'; x.fillRect(wx, wy, ww, wh);
    x.strokeStyle = 'rgba(20,20,22,0.9)'; x.lineWidth = 1.6 * k; x.beginPath(); for (let q = 1; q < 6; q++) { x.moveTo(wx + (ww * q) / 6, wy); x.lineTo(wx + (ww * q) / 6, wy + wh); } x.moveTo(wx, wy + wh / 2); x.lineTo(wx + ww, wy + wh / 2); x.stroke(); }
  { const dx = 2 * bw + 22 * k, dw = bw - 44 * k, dy = 30 * k, dh = H - 30 * k;                            // porte cochère
    x.fillStyle = 'rgb(248,243,230)'; x.beginPath(); x.moveTo(dx - 8 * k, H); x.lineTo(dx - 8 * k, dy + dw / 2); x.arc(dx + dw / 2, dy + dw / 2, dw / 2 + 8 * k, Math.PI, 0); x.lineTo(dx + dw + 8 * k, H); x.fill();
    x.fillStyle = 'rgb(70,52,38)'; x.beginPath(); x.moveTo(dx, H); x.lineTo(dx, dy + dw / 2); x.arc(dx + dw / 2, dy + dw / 2, dw / 2, Math.PI, 0); x.lineTo(dx + dw, H); x.fill();
    x.strokeStyle = 'rgba(20,14,10,0.7)'; x.lineWidth = 2 * k; x.beginPath(); x.moveTo(dx + dw / 2, dy); x.lineTo(dx + dw / 2, H); x.moveTo(dx, dy + dw / 2 + 6 * k); x.lineTo(dx + dw, dy + dw / 2 + 6 * k); x.stroke(); }
  return { map: tex(c), emissiveMap: tex(e) };
}

// Brisis d'un comble à la Mansart : rangs d'ardoises, une lucarne par travée (4 travées, 2,5 m de rampant).
function attic(k) {
  const bw = 128 * k, W = bw * 4, H = 128 * k, [c, x] = canvas(W, H), [e, ex] = canvas(W, H), r = mulberry32(1667);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const rh = 8 * k;
  for (let y = 0, row = 0; y < H; y += rh, row++) for (let sx = -(row % 2) * 7 * k; sx < W; sx += 14 * k) {
    const v = 0.82 + r() * 0.3; x.fillStyle = `rgb(${Math.round(84 * v)},${Math.round(95 * v)},${Math.round(114 * v)})`; x.fillRect(sx, y, 14 * k - 0.6 * k, rh);
  }
  for (let y = 0; y < H; y += rh) { x.fillStyle = 'rgba(16,20,30,0.34)'; x.fillRect(0, y, W, 1.4 * k); }
  x.fillStyle = 'rgba(150,158,164,0.9)'; x.fillRect(0, 0, W, 5 * k);                                     // membron de plomb, en haut du brisis
  x.fillStyle = 'rgba(244,238,222,0.95)'; x.fillRect(0, H - 7 * k, W, 7 * k); x.fillStyle = 'rgba(60,50,40,0.4)'; x.fillRect(0, H - 8.5 * k, W, 1.5 * k);   // corniche
  for (let b = 0; b < 4; b++) {
    if (b === 2) continue;                                                                                // une travée sans lucarne
    const cx = b * bw + bw / 2, ww = 44 * k, wy = 34 * k, wh = 78 * k, wx = cx - ww / 2, round = b === 1;
    x.fillStyle = 'rgba(20,24,34,0.35)'; x.fillRect(wx - 3 * k, wy - 16 * k, ww + 16 * k, wh + 12 * k);  // ombre portée
    x.fillStyle = 'rgb(240,234,218)';                                                                     // jouées et fronton
    x.beginPath(); x.moveTo(wx - 7 * k, wy + wh + 3 * k); x.lineTo(wx - 7 * k, wy);
    if (round) x.arc(cx, wy, ww / 2 + 7 * k, Math.PI, 0); else { x.lineTo(wx - 10 * k, wy); x.lineTo(cx, wy - 20 * k); x.lineTo(wx + ww + 10 * k, wy); }
    x.lineTo(wx + ww + 7 * k, wy); x.lineTo(wx + ww + 7 * k, wy + wh + 3 * k); x.closePath(); x.fill();
    x.fillStyle = 'rgba(70,60,48,0.35)'; x.fillRect(wx - 7 * k, wy - 1.5 * k, ww + 14 * k, 2.5 * k);
    const lit = r() < 0.4;
    x.fillStyle = 'rgb(42,48,56)'; x.fillRect(wx, wy + 5 * k, ww, wh - 5 * k);
    x.strokeStyle = 'rgb(226,222,208)'; x.lineWidth = 2 * k; x.beginPath(); x.moveTo(cx, wy + 5 * k); x.lineTo(cx, wy + wh);
    for (let q = 1; q < 3; q++) { x.moveTo(wx, wy + 5 * k + ((wh - 5 * k) * q) / 3); x.lineTo(wx + ww, wy + 5 * k + ((wh - 5 * k) * q) / 3); } x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(wx, wy + 5 * k, ww, 4 * k);
    if (lit) { ex.fillStyle = 'rgb(255,186,104)'; ex.fillRect(wx + 2 * k, wy + 7 * k, ww - 4 * k, wh - 9 * k); ex.fillStyle = '#000'; ex.fillRect(cx - k, wy + 5 * k, 2 * k, wh); }
  }
  speckle(x, W, H, r, 260 * k, 0.05);
  return { map: tex(c), emissiveMap: tex(e) };
}

// Nef classique : 4 travées de 5 m sur toute la hauteur du mur — pilastres, haute baie cintrée, entablement.
function navePanel(k) {
  const bw = 128 * k, W = bw * 4, H = 256 * k, [c, x] = canvas(W, H), r = mulberry32(1764);
  x.fillStyle = 'rgb(236,229,212)'; x.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 16 * k) { x.fillStyle = 'rgba(90,78,58,0.13)'; x.fillRect(0, y, W, 1.2 * k); }                 // assises
  speckle(x, W, H, r, 1100 * k, 0.07);
  x.fillStyle = 'rgba(255,252,240,0.6)'; x.fillRect(0, 0, W, 22 * k); x.fillStyle = 'rgba(60,50,40,0.36)'; x.fillRect(0, 22 * k, W, 3 * k);   // entablement
  x.fillStyle = 'rgba(60,50,40,0.22)'; x.fillRect(0, 8 * k, W, 1.6 * k);
  x.fillStyle = 'rgba(96,86,70,0.3)'; x.fillRect(0, H - 26 * k, W, 26 * k); x.fillStyle = 'rgba(255,252,240,0.45)'; x.fillRect(0, H - 29 * k, W, 3 * k);  // soubassement
  for (let b = 0; b < 4; b++) {
    const x0 = b * bw;
    x.fillStyle = 'rgba(255,250,236,0.55)'; x.fillRect(x0 - 9 * k, 25 * k, 18 * k, H - 54 * k); x.fillRect(x0 + bw - 9 * k, 25 * k, 18 * k, H - 54 * k);   // pilastres
    x.fillStyle = 'rgba(70,58,44,0.3)'; x.fillRect(x0 + 9 * k, 25 * k, 1.6 * k, H - 54 * k); x.fillRect(x0 - 12 * k, 25 * k, 24 * k, 5 * k); x.fillRect(x0 + bw - 12 * k, 25 * k, 24 * k, 5 * k);
    const cx = x0 + bw / 2, ww = 46 * k, yT = 62 * k, yB = H - 62 * k;
    const arch = (g) => { x.beginPath(); x.moveTo(cx - ww / 2 - g, yB + g); x.lineTo(cx - ww / 2 - g, yT + ww / 2); x.arc(cx, yT + ww / 2, ww / 2 + g, Math.PI, 0); x.lineTo(cx + ww / 2 + g, yB + g); x.closePath(); };
    x.fillStyle = 'rgb(250,246,234)'; arch(7 * k); x.fill();
    x.fillStyle = 'rgb(52,60,72)'; arch(0); x.fill();
    x.save(); arch(0); x.clip(); x.strokeStyle = 'rgba(206,204,196,0.75)'; x.lineWidth = 1.5 * k; x.beginPath();
    for (let q = 1; q < 4; q++) { x.moveTo(cx - ww / 2 + (ww * q) / 4, yT); x.lineTo(cx - ww / 2 + (ww * q) / 4, yB); }
    for (let y = yT + 12 * k; y < yB; y += 14 * k) { x.moveTo(cx - ww / 2, y); x.lineTo(cx + ww / 2, y); } x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(cx - ww / 2, yT, ww, 12 * k); x.restore();
    x.fillStyle = 'rgba(70,60,48,0.34)'; x.fillRect(cx - ww / 2 - 8 * k, yB + 7 * k, ww + 16 * k, 3 * k);                      // appui
  }
  return tex(c);
}

// Flanc de pont : une arche en anse de panier entre deux demi-piles, du fil de l'eau (bas) au tablier (haut).
function archPanel(k) {
  const W = 512 * k, H = 256 * k, [c, x] = canvas(W, H), r = mulberry32(1606);
  x.fillStyle = 'rgb(228,220,202)'; x.fillRect(0, 0, W, H);
  for (let y = 0, row = 0; y < H; y += 16 * k, row++) {                                                    // assises et joints
    x.fillStyle = 'rgba(84,74,58,0.2)'; x.fillRect(0, y, W, 1.3 * k);
    for (let sx = (row % 2) * 20 * k; sx < W; sx += 40 * k) x.fillRect(sx, y, 1.2 * k, 16 * k);
  }
  speckle(x, W, H, r, 1400 * k, 0.08);
  x.fillStyle = 'rgba(255,252,240,0.6)'; x.fillRect(0, 0, W, 9 * k); x.fillStyle = 'rgba(60,50,40,0.4)'; x.fillRect(0, 9 * k, W, 3 * k);   // cordon sous le parapet
  const cx = W / 2, rx = W * 0.41, ry = H * 0.74, yB = H;
  const arch = (g) => { x.beginPath(); x.moveTo(cx - rx - g, yB); x.ellipse(cx, yB, rx + g, ry + g, 0, Math.PI, 0); x.lineTo(cx + rx + g, yB); x.closePath(); };
  x.fillStyle = 'rgb(244,238,222)'; arch(13 * k); x.fill();                                                 // claveaux
  x.save(); arch(13 * k); x.clip(); x.strokeStyle = 'rgba(84,74,58,0.3)'; x.lineWidth = 1.2 * k; x.beginPath();
  for (let q = 0; q <= 26; q++) { const t = Math.PI + (q / 26) * Math.PI; x.moveTo(cx + Math.cos(t) * rx, yB + Math.sin(t) * ry); x.lineTo(cx + Math.cos(t) * (rx + 14 * k), yB + Math.sin(t) * (ry + 14 * k)); } x.stroke(); x.restore();
  const g = x.createLinearGradient(0, yB - ry, 0, yB); g.addColorStop(0, 'rgb(22,26,30)'); g.addColorStop(0.7, 'rgb(40,50,56)'); g.addColorStop(1, 'rgb(64,82,88)');
  x.fillStyle = g; arch(0); x.fill();                                                                       // l'ombre sous la voûte, éclaircie au ras de l'eau
  x.fillStyle = 'rgba(70,60,46,0.22)'; x.fillRect(0, H * 0.3, W * 0.045, H * 0.7); x.fillRect(W * 0.955, H * 0.3, W * 0.045, H * 0.7);      // avant-becs des piles
  x.fillStyle = 'rgba(96,110,96,0.32)'; x.fillRect(0, H - 14 * k, W, 14 * k);                               // pied verdi par l'eau
  const t = tex(c); t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// Les seules matières des maisons — étages, rez-de-chaussée, brisis à lucarnes : elles servent aussi, dans la première
// page, aux dates de la frise postérieures au XVIe siècle.
export function makeHouseMaterials89(scale) {
  const k = scale >= 1 ? 1 : 0.5, up = upper(k), rdc = ground(k), at = attic(k);
  return {
    facade: new THREE.MeshStandardMaterial({ map: up.map, emissiveMap: up.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.93, metalness: 0 }),
    rdc: new THREE.MeshStandardMaterial({ map: rdc.map, emissiveMap: rdc.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.93, metalness: 0 }),
    comble: new THREE.MeshStandardMaterial({ map: at.map, emissiveMap: at.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.84, metalness: 0 }),
  };
}

export function makeMaterials89(scale) {
  const k = scale >= 1 ? 1 : 0.5, s = makeStone(scale), f = makeStoneFx(scale, scale >= 1 ? 2 : 1), rf = makeRoof(scale), ns = (v) => new THREE.Vector2(v, v);
  return {
    ...makeHouseMaterials89(scale),
    pont: new THREE.MeshStandardMaterial({ map: archPanel(k), vertexColors: true, roughness: 0.95, metalness: 0 }),
    nef: new THREE.MeshStandardMaterial({ map: navePanel(k), vertexColors: true, roughness: 0.94, metalness: 0 }),
    stonefx: new THREE.MeshStandardMaterial({ map: f.map, normalMap: f.normalMap, normalScale: ns(0.7), vertexColors: true, roughness: 0.94, metalness: 0 }),
    stone: new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, normalScale: ns(0.6), vertexColors: true, roughness: 0.94, metalness: 0 }),
    roof: new THREE.MeshStandardMaterial({ map: rf.map, normalMap: rf.normalMap, normalScale: ns(0.8), vertexColors: true, roughness: 0.86, metalness: 0 }),
    plain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
  };
}
