// Matières de Lutèce : murs enduits des maisons (soubassement peint, boutiques, petites fenêtres à volets), tuiles
// romaines à couvre-joints, petit appareil de moellons à arases de brique, arcades des grands édifices publics.
// Les clés sont celles qu'attendent les corps de bâtiment de src/p1789/blocks.js (rdc, facade, roof, plain).
import * as THREE from 'three';
import { mulberry32 } from '../geom.js';
import { makeStone } from '../textures.js';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', { willReadFrequently: true })]; }
function grain(x, w, h, r, n, a) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '80,64,44' : '255,250,236'},${a * r()})`; x.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 6); } }
function tex(c, clampV) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = clampV ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.anisotropy = 8; return t; }

// Rez-de-chaussée : 4 travées de 2,5 m — boutique ouverte, porte, fenêtre haute, boutique à volets. Soubassement rouge.
function boutiques() {
  const bw = 128, H = 192, W = bw * 4, [c, x] = canvas(W, H), [e, ex] = canvas(W, H), r = mulberry32(52);
  x.fillStyle = 'rgb(240,233,216)'; x.fillRect(0, 0, W, H); grain(x, W, H, r, 700, 0.09);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(150,58,44,0.82)'; x.fillRect(0, H - 52, W, 52);                                       // soubassement peint
  x.fillStyle = 'rgba(70,30,24,0.5)'; x.fillRect(0, H - 54, W, 2.5); x.fillStyle = 'rgba(60,44,30,0.35)'; x.fillRect(0, H - 6, W, 6);
  x.fillStyle = 'rgba(60,44,30,0.3)'; x.fillRect(0, 0, W, 3);                                               // ombre de l'avant-toit ou du plancher
  const boutique = (b, ferme) => {
    const sx = b * bw + 12, sw = bw - 24, sy = 46, sh = H - 46;
    x.fillStyle = 'rgb(112,84,58)'; x.fillRect(sx - 5, sy - 9, sw + 10, 9);                                 // linteau de bois
    x.fillStyle = 'rgb(46,38,32)'; x.fillRect(sx, sy, sw, sh);
    if (ferme) { x.fillStyle = 'rgb(126,98,68)'; for (let i = 0; i < 5; i++) x.fillRect(sx + 2 + (i * (sw - 4)) / 5, sy + 2, (sw - 4) / 5 - 2.5, sh - 2); }      // volets de planches
    else { x.fillStyle = 'rgb(134,104,72)'; x.fillRect(sx, sy + sh - 54, sw * 0.62, 54); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(sx, sy + sh - 54, sw * 0.62, 4);      // comptoir maçonné
      x.fillStyle = 'rgb(170,110,70)'; for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(sx + 14 + i * 19, sy + sh - 60, 6.5, 8, 0, 0, 7); x.fill(); }                  // jarres
      ex.fillStyle = 'rgb(120,78,36)'; ex.fillRect(sx + 3, sy + 3, sw - 6, sh - 60); }
    x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(sx, sy, sw, 6);
  };
  boutique(0, false); boutique(3, true);
  { const dx = bw + 36, dw = 56, dy = 50, dh = H - 50;                                                      // porte à deux vantaux
    x.fillStyle = 'rgb(214,202,178)'; x.fillRect(dx - 7, dy - 8, dw + 14, dh + 8);
    x.fillStyle = 'rgb(104,74,48)'; x.fillRect(dx, dy, dw, dh);
    x.strokeStyle = 'rgba(30,20,12,0.7)'; x.lineWidth = 2; x.beginPath(); x.moveTo(dx + dw / 2, dy); x.lineTo(dx + dw / 2, H); x.stroke();
    x.fillStyle = 'rgba(40,26,16,0.45)'; for (const yy of [dy + 18, dy + 62, dy + 106]) { x.fillRect(dx + 5, yy, dw / 2 - 9, 3); x.fillRect(dx + dw / 2 + 4, yy, dw / 2 - 9, 3); }
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(dx, dy, dw, 5); }
  { const wx = 2 * bw + 44, ww = 40, wy = 40, wh = 34;                                                      // petite fenêtre haute, à grille
    x.fillStyle = 'rgb(216,204,180)'; x.fillRect(wx - 5, wy - 5, ww + 10, wh + 10); x.fillStyle = 'rgb(44,40,38)'; x.fillRect(wx, wy, ww, wh);
    x.strokeStyle = 'rgba(20,18,16,0.9)'; x.lineWidth = 1.6; x.beginPath(); for (let q = 1; q < 4; q++) { x.moveTo(wx + (ww * q) / 4, wy); x.lineTo(wx + (ww * q) / 4, wy + wh); } x.moveTo(wx, wy + wh / 2); x.lineTo(wx + ww, wy + wh / 2); x.stroke();
    ex.fillStyle = 'rgb(140,92,44)'; ex.fillRect(wx + 2, wy + 2, ww - 4, wh - 4); }
  return { map: tex(c), emissiveMap: tex(e) };
}

// Étages : 4 travées × 2 niveaux — petites fenêtres à volets de bois, une loggia de bois sur une travée.
function etages() {
  const bw = 128, fh = 160, W = bw * 4, H = fh * 2, [c, x] = canvas(W, H), [e, ex] = canvas(W, H), r = mulberry32(250);
  x.fillStyle = 'rgb(241,234,218)'; x.fillRect(0, 0, W, H); grain(x, W, H, r, 1000, 0.08);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  for (let f = 0; f < 2; f++) {
    const y0 = f * fh;
    x.fillStyle = 'rgba(110,82,56,0.75)'; x.fillRect(0, y0 + fh - 7, W, 7);                                 // about des solives
    for (let sx = 6; sx < W; sx += 26) { x.fillStyle = 'rgba(50,34,22,0.55)'; x.fillRect(sx, y0 + fh - 7, 9, 7); }
    for (let b = 0; b < 4; b++) {
      const wx = b * bw + 42, ww = 44, wy = y0 + 44, wh = 56, t = (b + f * 2) % 4;
      x.fillStyle = 'rgb(214,203,180)'; x.fillRect(wx - 5, wy - 5, ww + 10, wh + 11);
      x.fillStyle = 'rgb(46,42,40)'; x.fillRect(wx, wy, ww, wh);
      if (t === 0) { x.fillStyle = 'rgb(128,98,66)'; x.fillRect(wx, wy, ww / 2 - 1, wh); x.fillRect(wx + ww / 2 + 1, wy, ww / 2 - 1, wh); }               // volets clos
      else if (t === 1) { x.fillStyle = 'rgb(128,98,66)'; x.fillRect(wx - ww / 2, wy, ww / 2 - 1, wh); x.fillRect(wx + ww + 1, wy, ww / 2 - 1, wh); ex.fillStyle = 'rgb(150,100,48)'; ex.fillRect(wx + 2, wy + 2, ww - 4, wh - 4); }
      else { x.strokeStyle = 'rgba(150,120,84,0.9)'; x.lineWidth = 1.6; x.beginPath(); for (let q = -4; q < 8; q++) { x.moveTo(wx + q * 9, wy); x.lineTo(wx + q * 9 + wh * 0.7, wy + wh); x.moveTo(wx + q * 9 + wh * 0.7, wy); x.lineTo(wx + q * 9, wy + wh); } x.save(); x.beginPath(); x.rect(wx, wy, ww, wh); x.clip(); x.stroke(); x.restore(); if (t === 2) { ex.fillStyle = 'rgb(110,74,36)'; ex.fillRect(wx + 2, wy + 2, ww - 4, wh - 4); } }
      x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(wx, wy, ww, 5);
      x.fillStyle = 'rgba(70,56,40,0.35)'; x.fillRect(wx - 5, wy + wh + 4, ww + 10, 2.5);
    }
  }
  return { map: tex(c), emissiveMap: tex(e) };
}

// Tuiles romaines : larges tuiles plates (tegulae) aux joints couverts de tuiles rondes (imbrices), qui dessinent des
// nervures dans le sens de la pente. Claire : la couleur des sommets la teinte.
function tuiles() {
  const N = 512, [c, x] = canvas(N, N), r = mulberry32(79), pas = N / 7, rang = N / 5;
  x.fillStyle = 'rgb(226,214,204)'; x.fillRect(0, 0, N, N);
  for (let row = 0; row < 5; row++) for (let k = 0; k < 7; k++) { const v = 0.86 + r() * 0.2; x.fillStyle = `rgba(${Math.round(232 * v)},${Math.round(210 * v)},${Math.round(196 * v)},0.9)`; x.fillRect(k * pas, row * rang, pas, rang); }
  for (let row = 0; row < 5; row++) { x.fillStyle = 'rgba(60,34,24,0.34)'; x.fillRect(0, row * rang, N, 3); x.fillStyle = 'rgba(255,246,236,0.16)'; x.fillRect(0, row * rang + 3, N, 3); }      // recouvrement des rangs
  for (let k = 0; k < 7; k++) {
    const cx = k * pas, g = x.createLinearGradient(cx - 9, 0, cx + 9, 0);
    g.addColorStop(0, 'rgba(70,40,28,0.5)'); g.addColorStop(0.3, 'rgba(250,236,222,0.95)'); g.addColorStop(0.62, 'rgba(214,190,172,0.95)'); g.addColorStop(1, 'rgba(50,28,20,0.6)');
    for (const ox of [0, N]) { x.fillStyle = g; x.save(); x.translate(ox, 0); x.fillRect(cx - 9, 0, 18, N); x.restore(); }
  }
  grain(x, N, N, r, 1800, 0.07);
  return tex(c);
}

// Petit appareil : assises de moellons carrés, coupées tous les 1,2 m de trois rangs de briques. 4 m par motif.
function petitAppareil() {
  const N = 512, [c, x] = canvas(N, N), r = mulberry32(117), h = 16;
  x.fillStyle = 'rgb(206,196,174)'; x.fillRect(0, 0, N, N);
  for (let row = 0, y = 0; y < N; y += h, row++) {
    const brique = row % 10 >= 7;
    for (let sx = -(row % 2) * (brique ? 20 : 9); sx < N; sx += brique ? 40 : 18) {
      const v = 0.86 + r() * 0.22;
      x.fillStyle = brique ? `rgb(${Math.round(196 * v)},${Math.round(116 * v)},${Math.round(84 * v)})` : `rgb(${Math.round(228 * v)},${Math.round(218 * v)},${Math.round(196 * v)})`;
      x.fillRect(sx + 1, y + 1, (brique ? 40 : 18) - 2, h - 2);
    }
  }
  grain(x, N, N, r, 2600, 0.08);
  return tex(c);
}

// Mur à arcades : 4 travées sur toute la hauteur du mur — piles de petit appareil, arcs de brique et de pierre
// alternées, corniche. Les baies sont sombres : fenêtres hautes des thermes, arcades d'un théâtre.
function arcades() {
  const bw = 128, W = bw * 4, H = 256, [c, x] = canvas(W, H), r = mulberry32(64), h = 8;
  x.fillStyle = 'rgb(210,200,178)'; x.fillRect(0, 0, W, H);
  for (let row = 0, y = 0; y < H; y += h, row++) {
    const brique = row % 9 >= 7;
    for (let sx = -(row % 2) * 6; sx < W; sx += brique ? 24 : 12) { const v = 0.88 + r() * 0.2; x.fillStyle = brique ? `rgb(${Math.round(194 * v)},${Math.round(118 * v)},${Math.round(86 * v)})` : `rgb(${Math.round(228 * v)},${Math.round(218 * v)},${Math.round(196 * v)})`; x.fillRect(sx + 0.6, y + 0.6, (brique ? 24 : 12) - 1.2, h - 1.2); }
  }
  x.fillStyle = 'rgba(250,244,228,0.85)'; x.fillRect(0, 0, W, 12); x.fillStyle = 'rgba(60,46,32,0.45)'; x.fillRect(0, 12, W, 3);        // corniche
  x.fillStyle = 'rgba(60,46,32,0.3)'; x.fillRect(0, H - 14, W, 14);
  for (let b = 0; b < 4; b++) {
    const cx = b * bw + bw / 2, ww = 62, yT = 62, yB = H - 34;
    const arc = (g) => { x.beginPath(); x.moveTo(cx - ww / 2 - g, yB); x.lineTo(cx - ww / 2 - g, yT + ww / 2); x.arc(cx, yT + ww / 2, ww / 2 + g, Math.PI, 0); x.lineTo(cx + ww / 2 + g, yB); x.closePath(); };
    x.fillStyle = 'rgb(232,222,200)'; arc(11); x.fill();
    x.save(); arc(11); x.clip();                                                                              // claveaux : brique et pierre alternées
    for (let q = 0; q < 16; q++) { const t = Math.PI + (q / 16) * Math.PI; x.fillStyle = q % 2 ? 'rgb(196,120,88)' : 'rgb(234,226,206)'; x.beginPath(); x.moveTo(cx, yT + ww / 2); x.arc(cx, yT + ww / 2, ww / 2 + 12, t, t + Math.PI / 16 + 0.01); x.closePath(); x.fill(); }
    x.restore();
    const g = x.createLinearGradient(0, yT, 0, yB); g.addColorStop(0, 'rgb(26,24,26)'); g.addColorStop(1, 'rgb(58,52,48)');
    x.fillStyle = g; arc(0); x.fill();
    x.fillStyle = 'rgba(250,244,228,0.7)'; x.fillRect(cx - ww / 2 - 12, yT + ww / 2 - 3, 12, 5); x.fillRect(cx + ww / 2, yT + ww / 2 - 3, 12, 5);      // impostes
  }
  grain(x, W, H, r, 1500, 0.07);
  return tex(c, true);
}

export function makeMaterialsLutece() {
  const up = etages(), rdc = boutiques(), s = makeStone(1);
  return {
    facade: new THREE.MeshStandardMaterial({ map: up.map, emissiveMap: up.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.94, metalness: 0 }),
    rdc: new THREE.MeshStandardMaterial({ map: rdc.map, emissiveMap: rdc.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.94, metalness: 0 }),
    roof: new THREE.MeshStandardMaterial({ map: tuiles(), vertexColors: true, roughness: 0.88, metalness: 0 }),
    romain: new THREE.MeshStandardMaterial({ map: petitAppareil(), vertexColors: true, roughness: 0.95, metalness: 0 }),
    arcade: new THREE.MeshStandardMaterial({ map: arcades(), vertexColors: true, roughness: 0.95, metalness: 0 }),
    stone: new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), vertexColors: true, roughness: 0.94, metalness: 0 }),
    plain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
  };
}
