// Textures procédurales : façades à pans de bois, pierre de taille, couvertures, baies gothiques.
import * as THREE from 'three';
import { mulberry32 } from './geom.js';

const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const gray = (v) => `rgb(${v | 0},${v | 0},${v | 0})`;
const vary = (c, r, k = 0.08) => { const f = 1 + (r() - 0.5) * 2 * k; return [c[0] * f, c[1] * f, c[2] * f]; };

// Peintre à trois couches : couleur, relief (pour la carte de normales), émission (fenêtres éclairées).
// Contexte factice : absorbe tous les appels de dessin d'une couche non demandée.
const NOOP = new Proxy(function () {}, { get: (t, k) => (k === 'canvas' ? null : NOOP), set: () => true, apply: () => NOOP });

class Painter {
  // layers : 'c' couleur, 'h' relief, 'e' émission. Les couches absentes sont remplacées par un contexte factice.
  constructor(w, h, scale, emis, layers = 'che') {
    this.w = w; this.h = h;
    const mk = () => { const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale; const x = c.getContext('2d', { willReadFrequently: true }); x.setTransform(scale, 0, 0, scale, 0, 0); return x; };
    this.c = layers.includes('c') ? mk() : NOOP; this.hh = layers.includes('h') ? mk() : NOOP; this.e = emis && layers.includes('e') ? mk() : null;
    this.hh.fillStyle = gray(128); this.hh.fillRect(0, 0, w, h);
    if (this.e) { this.e.fillStyle = '#000'; this.e.fillRect(0, 0, w, h); }
  }
  rect(x, y, w, h, col, hg, em) {
    if (col) { this.c.fillStyle = css(col); this.c.fillRect(x, y, w, h); }
    if (hg != null) { this.hh.fillStyle = gray(hg); this.hh.fillRect(x, y, w, h); }
    if (em && this.e) { this.e.fillStyle = css(em); this.e.fillRect(x, y, w, h); }
  }
  path(fn, col, hg, em) {
    if (col) { this.c.fillStyle = css(col); this.c.beginPath(); fn(this.c); this.c.fill(); }
    if (hg != null) { this.hh.fillStyle = gray(hg); this.hh.beginPath(); fn(this.hh); this.hh.fill(); }
    if (em && this.e) { this.e.fillStyle = css(em); this.e.beginPath(); fn(this.e); this.e.fill(); }
  }
  stroke(fn, lw, col, hg) {
    if (col) { this.c.strokeStyle = css(col); this.c.lineWidth = lw; this.c.beginPath(); fn(this.c); this.c.stroke(); }
    if (hg != null) { this.hh.strokeStyle = gray(hg); this.hh.lineWidth = lw; this.hh.beginPath(); fn(this.hh); this.hh.stroke(); }
  }
  line(x1, y1, x2, y2, lw, col, hg) { this.stroke((c) => { c.moveTo(x1, y1); c.lineTo(x2, y2); }, lw, col, hg); }
  shade(x, y, w, h, a0, a1, vertical = true) {
    const g = vertical ? this.c.createLinearGradient(0, y, 0, y + h) : this.c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, `rgba(0,0,0,${a0})`); g.addColorStop(1, `rgba(0,0,0,${a1})`);
    this.c.fillStyle = g; this.c.fillRect(x, y, w, h);
  }
  clip(x, y, w, h, fn) {
    for (const c of [this.c, this.hh, this.e]) { if (!c) continue; c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); }
    fn();
    for (const c of [this.c, this.hh, this.e]) if (c) c.restore();
  }
}

// Bruit multiplicatif et taches sur la couche couleur.
function grain(ctx, W, H, amount, seed, blotch = 0.5) {
  const im = ctx.getImageData(0, 0, W, H), d = im.data, r = mulberry32(seed);
  const G = 64, lw = Math.ceil(W / G) + 2, lh = Math.ceil(H / G) + 2, low = new Float32Array(lw * lh);
  for (let i = 0; i < low.length; i++) low[i] = r();
  for (let y = 0; y < H; y++) {
    const gy = y / G, y0 = Math.floor(gy), fy = gy - y0;
    for (let x = 0; x < W; x++) {
      const gx = x / G, x0 = Math.floor(gx), fx = gx - x0;
      const l = (low[y0 * lw + x0] * (1 - fx) + low[y0 * lw + x0 + 1] * fx) * (1 - fy) + (low[(y0 + 1) * lw + x0] * (1 - fx) + low[(y0 + 1) * lw + x0 + 1] * fx) * fy;
      const f = 1 + (r() - 0.5) * amount + (l - 0.5) * amount * blotch * 2;
      const k = (y * W + x) * 4;
      d[k] = Math.min(255, d[k] * f); d[k + 1] = Math.min(255, d[k + 1] * f); d[k + 2] = Math.min(255, d[k + 2] * f);
    }
  }
  ctx.putImageData(im, 0, 0);
}

function normalFromHeight(hctx, W, H, strength, wrapY) {
  const src = hctx.getImageData(0, 0, W, H).data;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true }), im = ctx.createImageData(W, H), d = im.data;
  const at = (x, y) => src[(((wrapY ? (y + H) % H : Math.max(0, Math.min(H - 1, y))) * W) + ((x + W) % W)) * 4];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) / 255 * strength, dy = (at(x, y + 1) - at(x, y - 1)) / 255 * strength;
    const l = Math.hypot(dx, dy, 1), k = (y * W + x) * 4;
    d[k] = (-dx / l * 0.5 + 0.5) * 255; d[k + 1] = (dy / l * 0.5 + 0.5) * 255; d[k + 2] = (1 / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  return cv;
}

function tex(canvas, srgb, repeatS, repeatT, aniso = 8) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = repeatS ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; t.wrapT = repeatT ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// ------------------------------------------------------------------ maisons
const PLASTER = [232, 224, 206], TIMBER = [76, 56, 40], GLASS = [44, 46, 50], LIT = [255, 196, 110], WOOD = [118, 92, 66], DARK = [30, 24, 20];

function windowAt(P, r, x, y, w, h, o = {}) {
  const fr = o.frame ?? 5;
  P.rect(x - fr, y - fr, w + 2 * fr, h + 2 * fr, vary(TIMBER, r), 170);
  const lit = r() < (o.lit ?? 0.45);
  P.rect(x, y, w, h, vary(GLASS, r, 0.2), 60, lit ? [LIT[0], LIT[1] * (0.8 + r() * 0.2), LIT[2] * (0.6 + r() * 0.5)] : null);
  P.rect(x + w / 2 - 1.5, y, 3, h, TIMBER, 150, [0, 0, 0]);
  if (h > 60) P.rect(x, y + h * 0.42, w, 3, TIMBER, 150, [0, 0, 0]);
  if (o.shutters) { const sw = w * 0.42; P.rect(x - fr - sw, y - 2, sw, h + 4, vary(WOOD, r, 0.15), 160); P.rect(x + w + fr, y - 2, sw, h + 4, vary(WOOD, r, 0.15), 160); }
}

function upperFloor(P, r, X, Y, kind) {
  const S = 256;
  P.rect(X, Y, S, S, vary(PLASTER, r, 0.03), 128);
  const T = vary(TIMBER, r, 0.12);
  const nwin = r() < 0.55 ? 2 : 1;
  const ww = 40 + r() * 16, wh = 86 + r() * 26, wy = Y + 74 + r() * 14;
  const xs = nwin === 2 ? [X + 50 + r() * 14, X + 150 + r() * 14] : [X + 96 + r() * 30];
  if (kind === 0) {           // colombage serré
    for (let x = X + 14 + r() * 8; x < X + S - 16; x += 24 + r() * 8) P.rect(x, Y + 10, 7, S - 30, T, 165);
    P.rect(X, Y + 128 + r() * 20, S, 7, T, 165);
  } else if (kind === 1) {    // croix de Saint-André et écharpes
    for (const x of [X + 62, X + 128, X + 194]) P.rect(x - 4, Y + 10, 8, S - 30, T, 165);
    const yb = Y + S - 22, yt = wy + wh + 10;
    for (const [a, b] of [[X + 10, X + 60], [X + 66, X + 124], [X + 132, X + 190], [X + 198, X + 246]]) { P.line(a, yb, b, yt, 7, T, 165); P.line(b, yb, a, yt, 7, T, 165); }
    P.rect(X, yt - 6, S, 7, T, 165);
    P.line(X + 10, Y + 14, X + 58, wy - 8, 7, T, 165); P.line(X + 246, Y + 14, X + 198, wy - 8, 7, T, 165);
  } else {                    // enduit couvrant, bois à peine apparents
    P.rect(X, Y + 120 + r() * 30, S, 4, [200, 190, 170], 134);
  }
  for (const x of xs) windowAt(P, r, x, wy, ww, wh, { shutters: kind === 2 && r() < 0.6 });
  P.rect(X, Y, 11, S, T, 170); P.rect(X + S - 11, Y, 11, S, T, 170);          // poteaux corniers
  P.rect(X, Y, S, 9, T, 165);                                                 // sablière haute
  P.rect(X, Y + S - 22, S, 22, vary(TIMBER, r, 0.1), 185);                    // sablière d'encorbellement
  for (let x = X + 8; x < X + S; x += 22) P.rect(x, Y + S - 9, 9, 9, vary(TIMBER, r, 0.25), 205); // abouts de solives
  P.shade(X, Y + 9, S, 22, 0.34, 0);
}

function groundFloor(P, r, X, Y, kind) {
  const S = 256;
  P.rect(X, Y, S, S, vary(PLASTER, r, 0.04), 128);
  P.rect(X, Y + S - 34, S, 34, vary([176, 166, 148], r, 0.06), 150);          // soubassement de pierre
  for (let x = X; x < X + S; x += 38 + r() * 10) P.rect(x, Y + S - 34, 2, 34, [140, 130, 112], 110);
  const T = vary(TIMBER, r, 0.12);
  if (kind === 0) {           // ouvroir : baie d'échoppe, étal rabattu, auvent
    const dw = 46 + r() * 8, left = r() < 0.5, dx = left ? X + 16 : X + S - 16 - dw;
    const ox = left ? dx + dw + 16 : X + 16, ow = S - dw - 48, oy = Y + 62, oh = 118;
    P.rect(ox - 6, oy - 6, ow + 12, oh + 12, T, 175);
    P.rect(ox, oy, ow, oh, vary(DARK, r, 0.3), 30, r() < 0.5 ? [200, 130, 60] : null);
    for (let i = 0; i < 7; i++) P.rect(ox + 6 + r() * (ow - 20), oy + oh - 26 - r() * 30, 10 + r() * 12, 12 + r() * 10, [70 + r() * 60, 56 + r() * 44, 40 + r() * 36], 60); // marchandises
    P.rect(ox - 8, oy + oh, ow + 16, 16, vary(WOOD, r, 0.1), 215);            // étal
    P.rect(ox - 8, oy - 22, ow + 16, 14, vary(WOOD, r, 0.15), 215);           // auvent
    P.rect(ox + ow / 2 - 3, oy, 6, oh, T, 170);
    P.rect(dx - 5, Y + 58, dw + 10, S - 58 - 6, T, 175);
    P.rect(dx, Y + 64, dw, S - 70, vary([92, 68, 46], r, 0.12), 110);
    for (let i = 1; i < 4; i++) P.rect(dx + (dw * i) / 4, Y + 64, 1.5, S - 70, [60, 44, 30], 90);
  } else {                    // porte et fenêtre barreaudée
    const dw = 50 + r() * 10, dx = X + 30 + r() * 150;
    const stone = kind === 2;
    if (stone) { P.rect(X, Y, S, S, vary([196, 186, 166], r, 0.05), 140); for (let y = Y + 20; y < Y + S; y += 30) P.rect(X, y, S, 2, [150, 140, 122], 105); for (let x = X + 10; x < X + S; x += 52) P.rect(x, Y, 2, S, [156, 146, 128], 110); }
    P.path((c) => { c.moveTo(dx - 6, Y + S); c.lineTo(dx - 6, Y + 110); c.quadraticCurveTo(dx + dw / 2, Y + 50, dx + dw + 6, Y + 110); c.lineTo(dx + dw + 6, Y + S); }, stone ? [150, 140, 122] : T, 180);
    P.path((c) => { c.moveTo(dx, Y + S); c.lineTo(dx, Y + 114); c.quadraticCurveTo(dx + dw / 2, Y + 62, dx + dw, Y + 114); c.lineTo(dx + dw, Y + S); }, vary([88, 64, 44], r, 0.12), 100);
    P.rect(dx + 4, Y + 150, dw - 8, 4, [40, 36, 34], 120); P.rect(dx + 4, Y + 205, dw - 8, 4, [40, 36, 34], 120);
    const wx = dx > X + 128 ? X + 34 + r() * 30 : X + 160 + r() * 30;
    windowAt(P, r, wx, Y + 96, 38, 62, { lit: 0.35 });
    for (let i = 1; i < 4; i++) P.rect(wx + (38 * i) / 4 - 1, Y + 96, 2, 62, [36, 34, 34], 150);
  }
  P.rect(X, Y, 12, S, T, 172); P.rect(X + S - 12, Y, 12, S, T, 172);
  P.rect(X, Y, S, 20, vary(TIMBER, r, 0.1), 188);                             // poitrail
  for (let x = X + 8; x < X + S; x += 22) P.rect(x, Y + 2, 9, 9, vary(TIMBER, r, 0.25), 208);
  P.shade(X, Y + 20, S, 26, 0.4, 0);
}

function gableCell(P, r, X, Y) {
  const S = 256;
  P.rect(X, Y, S, S, vary(PLASTER, r, 0.03), 128);
  const T = vary(TIMBER, r, 0.12);
  P.line(X + 128, Y + 6, X + 128, Y + S - 20, 9, T, 168);                      // poinçon
  P.rect(X + 62, Y + 122, 132, 8, T, 168);                                     // entrait retroussé
  for (const x of [X + 60, X + 94, X + 162, X + 196]) P.rect(x - 3, Y + 128, 7, 110, T, 165);
  if (r() < 0.6) { P.line(X + 40, Y + S - 22, X + 92, Y + 132, 7, T, 165); P.line(X + 216, Y + S - 22, X + 164, Y + 132, 7, T, 165); }
  windowAt(P, r, X + 108, Y + 150, 40, 56, { lit: 0.3 });
  P.line(X + 2, Y + S, X + 128, Y + 2, 16, T, 190); P.line(X + S - 2, Y + S, X + 128, Y + 2, 16, T, 190);   // chevrons de rive
  P.rect(X, Y + S - 22, S, 22, vary(TIMBER, r, 0.1), 185);
  for (let x = X + 8; x < X + S; x += 22) P.rect(x, Y + S - 9, 9, 9, vary(TIMBER, r, 0.25), 205);
}

function plainCell(P, r, X, Y) {
  const S = 256;
  P.rect(X, Y, S, S, vary(PLASTER, r, 0.035), 128);
  for (let i = 0; i < 5; i++) { const x = X + r() * S, w = 6 + r() * 20; P.c.fillStyle = `rgba(90,80,60,${0.05 + r() * 0.08})`; P.c.fillRect(x, Y + r() * 60, w, S); }   // coulures
  if (r() < 0.5) windowAt(P, r, X + 40 + r() * 150, Y + 60 + r() * 90, 22, 28, { lit: 0.3, frame: 3 });
  P.shade(X, Y + S - 40, S, 40, 0, 0.16);
}

function woodCell(P, r, X, Y, kind) {
  const S = 256;
  const base = kind < 4 ? [112, 90, 66] : kind < 6 ? [98, 76, 54] : PLASTER;
  P.rect(X, Y, S, S, base, 128);
  if (kind < 6) {
    for (let x = X; x < X + S;) { const w = 14 + r() * 12; P.rect(x, Y, w - 1.5, S, vary(base, r, 0.16), 120 + r() * 40); P.rect(x + w - 1.5, Y, 1.5, S, [50, 38, 28], 70); x += w; }
    if (kind >= 4) { P.rect(X + 40, Y + 40, 176, 6, [44, 40, 38], 170); P.rect(X + 40, Y + 190, 176, 6, [44, 40, 38], 170); P.rect(X + 126, Y + 20, 4, 236, [36, 28, 22], 60); }
  } else {                    // torchis et poteaux (bâti rural)
    const T = vary(TIMBER, r, 0.1);
    for (let x = X + 8; x < X + S; x += 60) P.rect(x, Y, 8, S, T, 165);
    P.rect(X, Y + 120, S, 7, T, 165); P.line(X + 14, Y + S, X + 62, Y + 126, 7, T, 165);
    if (kind === 7) windowAt(P, r, X + 150, Y + 150, 30, 40, { lit: 0.3 });
  }
}

function paintHouses(P) {
  const r = mulberry32(1380);
  for (let c = 0; c < 8; c++) {
    groundFloor(P, r, c * 256, 0, 0);
    groundFloor(P, r, c * 256, 256, c % 3 === 2 ? 2 : 1);
    upperFloor(P, r, c * 256, 512, 0);
    upperFloor(P, r, c * 256, 768, 1);
    upperFloor(P, r, c * 256, 1024, 2);
    gableCell(P, r, c * 256, 1280);
    plainCell(P, r, c * 256, 1536);
    woodCell(P, r, c * 256, 1792, c);
  }
}

// La couleur est dessinée deux fois plus finement que le relief et l'émission (même tirage aléatoire, donc même dessin).
export function makeHouseAtlas(scale, hi = 1) {
  const A = new Painter(2048, 2048, scale * hi, false, 'c'), Bp = new Painter(2048, 2048, scale, true, 'he');
  paintHouses(A); paintHouses(Bp);
  const W = 2048 * scale;
  grain(A.c, W * hi, W * hi, 0.14, 11);
  return {
    map: tex(A.c.canvas, true, true, false), normalMap: tex(normalFromHeight(Bp.hh, W, W, 2.4, false), false, true, false),
    emissiveMap: tex(Bp.e.canvas, true, true, false), canvas: A.c.canvas,
  };
}

// ------------------------------------------------------------------ pierre
const STONE = [222, 211, 188];

function ashlar(P, r, X, Y, W, H, bh = 30, o = {}) {
  let row = 0;
  for (let y = Y; y < Y + H; y += bh, row++) {
    let x = X - (row % 2 ? 28 : 0) - r() * 10;
    while (x < X + W) {
      const w = 50 + r() * 34;
      const x0 = Math.max(X, x), x1 = Math.min(X + W, x + w);
      if (x1 > x0) P.rect(x0, y, x1 - x0, Math.min(bh, Y + H - y), vary(o.col || STONE, r, 0.07), 132 + r() * 22);
      if (x + w < X + W) P.rect(x + w - 1.5, y, 2.5, Math.min(bh, Y + H - y), [168, 156, 134], 92);
      x += w;
    }
    P.rect(X, y, W, 2.5, [166, 154, 132], 90);
  }
}

export function makeStone(scale) {
  const N = 512, P = new Painter(N, N, scale, false), r = mulberry32(77);
  ashlar(P, r, 0, 0, N, N, 32);
  for (let i = 0; i < 26; i++) { P.c.fillStyle = `rgba(70,62,44,${0.04 + r() * 0.07})`; P.c.fillRect(r() * N, r() * N, 8 + r() * 30, 60 + r() * 220); }
  grain(P.c, N * scale, N * scale, 0.16, 5);
  return { map: tex(P.c.canvas, true, true, true), normalMap: tex(normalFromHeight(P.hh, N * scale, N * scale, 2.2, true), false, true, true) };
}

// Couverture : rangs de petites tuiles plates (ou d'ardoises), teintée ensuite par la couleur des sommets.
export function makeRoof(scale) {
  const N = 512, P = new Painter(N, N, scale, false), r = mulberry32(31);
  const rh = 16, tw = 26;
  for (let row = 0, y = 0; y < N; y += rh, row++) {
    for (let x = -(row % 2) * tw / 2; x < N; x += tw) {
      const k = 0.78 + r() * 0.3, warm = r();
      const c = [228 * k, (210 + warm * 14) * k, (196 + warm * 22) * k];
      if (r() < 0.06) { c[0] *= 0.7; c[1] *= 0.8; c[2] *= 0.72; }                // tuile moussue
      P.rect(x, y, tw - 1, rh, c, null);
      P.rect(x + tw - 1, y, 1.2, rh, [120, 110, 100], null);
    }
    const g = P.hh.createLinearGradient(0, y, 0, y + rh); g.addColorStop(0, gray(90)); g.addColorStop(1, gray(205));
    P.hh.fillStyle = g; P.hh.fillRect(0, y, N, rh);
    P.c.fillStyle = 'rgba(0,0,0,0.28)'; P.c.fillRect(0, y, N, 2.2);
  }
  grain(P.c, N * scale, N * scale, 0.12, 3, 0.9);
  return { map: tex(P.c.canvas, true, true, true), normalMap: tex(normalFromHeight(P.hh, N * scale, N * scale, 2.0, true), false, true, true) };
}

// Arc brisé : chemin fermé (baie de largeur w, sommet de l'arc en yTop, base en yBot).
function pointed(c, cx, yTop, w, yBot) {
  const ys = yTop + w * 0.866;
  c.moveTo(cx - w / 2, yBot); c.lineTo(cx - w / 2, ys);
  c.arc(cx + w / 2, ys, w, Math.PI, Math.PI * 4 / 3); c.arc(cx - w / 2, ys, w, Math.PI * 5 / 3, Math.PI * 2);
  c.lineTo(cx + w / 2, yBot); c.closePath();
}
const GL = [26, 32, 50];

function stained(P, r, x, y, w, h, n) {
  const cols = [[150, 30, 30], [30, 60, 150], [200, 160, 40], [40, 110, 70], [120, 40, 110]];
  for (let i = 0; i < n; i++) { const c = cols[(r() * cols.length) | 0]; P.c.fillStyle = css(c, 0.5); P.c.fillRect(x + r() * w, y + r() * h, 3 + r() * 5, 3 + r() * 6); }
}

function lancet(P, r, cx, yTop, w, yBot, o = {}) {
  const mould = o.mould ?? 7;
  P.path((c) => pointed(c, cx, yTop - mould, w + mould * 2, yBot + (o.sill ?? 4)), [238, 229, 208], 185);
  P.path((c) => pointed(c, cx, yTop, w, yBot), GL, 40);
  P.c.save(); P.c.beginPath(); pointed(P.c, cx, yTop, w, yBot); P.c.clip(); stained(P, r, cx - w / 2, yTop, w, yBot - yTop, (w * (yBot - yTop)) / 110); P.c.restore();
  const ys = yTop + w * 0.866;
  if (w > 34) {       // remplage : deux lancettes et un oculus
    P.rect(cx - 2, ys - w * 0.1, 4, yBot - ys + w * 0.1, [226, 216, 194], 170);
    const n = o.lights ?? 2;
    if (n > 2) for (let i = 1; i < n; i++) if (i !== n / 2) P.rect(cx - w / 2 + (w * i) / n - 1.5, ys, 3, yBot - ys, [226, 216, 194], 170);
    P.stroke((c) => { c.arc(cx, ys - w * 0.2, w * 0.2, 0, Math.PI * 2); }, 4, [226, 216, 194], 170);
    P.stroke((c) => { c.moveTo(cx - w / 2, ys); c.quadraticCurveTo(cx - w / 4, ys - w * 0.42, cx, ys); c.quadraticCurveTo(cx + w / 4, ys - w * 0.42, cx + w / 2, ys); }, 4, [226, 216, 194], 170);
  }
  for (let y = ys + 26; y < yBot - 6; y += 30) P.rect(cx - w / 2, y, w, 1.6, [70, 72, 80], 60);   // barlotières
}

function fxRow(P, r, row, draw) {
  for (let c = 0; c < 8; c++) {
    const X = c * 256, Y = row * 256;
    P.clip(X, Y, 256, 256, () => { ashlar(P, r, X, Y, 256, 256, 32); draw(X, Y, c); });
  }
}

function paintStoneFx(P) {
  const r = mulberry32(1163);
  const buttress = (X, Y) => { P.rect(X, Y, 16, 256, [232, 222, 200], 200); P.rect(X + 240, Y, 16, 256, [232, 222, 200], 200); P.shade(X + 16, Y, 12, 256, 0.3, 0, false); };
  // 0 : hautes baies gothiques entre contreforts
  fxRow(P, r, 0, (X, Y) => { lancet(P, r, X + 128, Y + 26, 104, Y + 236); buttress(X, Y); P.rect(X, Y + 244, 256, 6, [236, 228, 206], 190); });
  // 1 : fenêtres hautes et corniche à modillons
  fxRow(P, r, 1, (X, Y) => { lancet(P, r, X + 128, Y + 70, 58, Y + 214); P.rect(X, Y + 12, 256, 10, [236, 228, 206], 195); for (let x = X + 6; x < X + 256; x += 26) P.rect(x, Y + 22, 12, 12, [200, 190, 168], 175); P.shade(X, Y + 22, 256, 20, 0.3, 0); });
  // 2 : étage noble à croisées de pierre
  fxRow(P, r, 2, (X, Y, c) => {
    const two = c % 3 === 1, xs = two ? [X + 44, X + 150] : [X + 92];
    for (const x of xs) { const w = two ? 58 : 72, h = 118, y = Y + 70; P.rect(x - 7, y - 7, w + 14, h + 14, [240, 231, 210], 190); P.rect(x, y, w, h, GL, 40); P.rect(x + w / 2 - 3, y, 6, h, [234, 224, 202], 180); P.rect(x, y + h * 0.36, w, 6, [234, 224, 202], 180);
      P.c.strokeStyle = 'rgba(120,125,135,0.35)'; P.c.lineWidth = 0.8; P.c.beginPath(); for (let k = -h; k < w; k += 9) { P.c.moveTo(x + Math.max(0, k), y + Math.max(0, -k)); P.c.lineTo(x + Math.min(w, k + h), y + Math.min(h, h - (k + h - w > 0 ? k + h - w : 0))); } P.c.stroke(); }
    P.rect(X, Y + 236, 256, 9, [240, 231, 210], 195); P.shade(X, Y + 245, 256, 11, 0.25, 0);
  });
  // 3 : rez-de-chaussée de pierre, portes cintrées et petites baies
  fxRow(P, r, 3, (X, Y, c) => {
    if (c % 2 === 0) { const dx = X + 60 + r() * 80; P.path((k) => pointed(k, dx + 34, Y + 60, 84, Y + 256), [236, 226, 204], 190); P.path((k) => pointed(k, dx + 34, Y + 72, 66, Y + 256), [84, 62, 44], 70); P.rect(dx + 33, Y + 100, 2, 156, [50, 38, 28], 50); P.rect(dx + 6, Y + 160, 56, 4, [40, 36, 36], 100); }
    else for (const x of [X + 50, X + 170]) { P.rect(x - 5, Y + 86, 46, 70, [236, 226, 204], 185); P.rect(x, Y + 91, 36, 60, GL, 40); for (let i = 1; i < 4; i++) P.rect(x + 9 * i - 1, Y + 91, 2, 60, [40, 40, 44], 120); }
    P.rect(X, Y + 2, 256, 8, [240, 231, 210], 195);
  });
  // 4 : mur de forteresse : archères et trous de boulin
  fxRow(P, r, 4, (X, Y, c) => {
    if (c % 2 === 0) { const x = X + 128; P.rect(x - 9, Y + 80, 18, 100, [236, 226, 204], 180); P.rect(x - 2.5, Y + 86, 5, 88, [20, 18, 18], 20); P.rect(x - 9, Y + 124, 18, 4, [20, 18, 18], 20); }
    for (let i = 0; i < 4; i++) P.rect(X + 30 + r() * 190, Y + 30 + i * 56 + r() * 10, 7, 7, [60, 52, 42], 50);
  });
  // 5 : mâchicoulis sur consoles et parapet
  fxRow(P, r, 5, (X, Y) => {
    P.rect(X, Y + 104, 256, 8, [240, 231, 210], 200);
    for (let x = X; x < X + 256; x += 32) { P.path((c) => { c.moveTo(x + 2, Y + 112); c.lineTo(x + 14, Y + 112); c.lineTo(x + 11, Y + 168); c.lineTo(x + 5, Y + 168); }, [214, 204, 182], 215); P.path((c) => { c.moveTo(x + 14, Y + 150); c.lineTo(x + 14, Y + 124); c.arc(x + 24, Y + 124, 10, Math.PI, 0); c.lineTo(x + 34, Y + 150); }, [34, 30, 28], 20); }
    P.shade(X, Y + 168, 256, 30, 0.3, 0);
  });
  // 6 : éléments singuliers
  const cell = (c, row, fn) => { const X = c * 256, Y = row * 256; P.clip(X, Y, 256, 256, () => { ashlar(P, r, X, Y, 256, 256, 32); fn(X, Y); }); };
  cell(0, 6, (X, Y) => {      // rose
    const cx = X + 128, cy = Y + 128; P.path((c) => c.arc(cx, cy, 116, 0, 7), [240, 231, 210], 195); P.path((c) => c.arc(cx, cy, 104, 0, 7), GL, 40);
    P.c.save(); P.c.beginPath(); P.c.arc(cx, cy, 104, 0, 7); P.c.clip(); stained(P, r, X + 24, Y + 24, 208, 208, 520); P.c.restore();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; P.line(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26, cx + Math.cos(a) * 104, cy + Math.sin(a) * 104, 4, [232, 222, 200], 175); P.stroke((c) => c.arc(cx + Math.cos(a + 0.26) * 84, cy + Math.sin(a + 0.26) * 84, 18, 0, 7), 3.5, [232, 222, 200], 175); }
    P.stroke((c) => c.arc(cx, cy, 26, 0, 7), 5, [232, 222, 200], 180); P.stroke((c) => c.arc(cx, cy, 62, 0, 7), 3.5, [232, 222, 200], 175);
  });
  const portal = (X, Y, w, top) => {
    const cx = X + 128;
    for (let i = 0; i < 5; i++) P.path((c) => pointed(c, cx, Y + top + i * 9, w - i * 18, Y + 256), i % 2 ? [198, 186, 162] : [240, 231, 210], 210 - i * 30);
    const iw = w - 90; P.path((c) => pointed(c, cx, Y + top + 45, iw, Y + 256), [228, 218, 194], 120);
    const dy = Y + top + 45 + iw * 0.8;
    P.rect(cx - iw / 2, dy, iw, Y + 256 - dy, [82, 58, 40], 70); P.rect(cx - 5, dy, 10, Y + 256 - dy, [232, 222, 200], 170);
    for (const x of [cx - iw / 2 + 6, cx + 10]) for (const y of [dy + 20, Y + 222]) P.rect(x, y, iw / 2 - 16, 4, [40, 36, 36], 110);
    for (let i = 0; i < 9; i++) P.rect(cx - iw / 2 + 8 + (i * (iw - 16)) / 9, dy - 26, 8, 20, [206, 196, 172], 150);   // linteau sculpté
  };
  cell(1, 6, (X, Y) => portal(X, Y, 236, 8));
  cell(2, 6, (X, Y) => portal(X, Y, 170, 70));
  cell(3, 6, (X, Y) => {      // horloge
    const cx = X + 128, cy = Y + 128; P.path((c) => c.arc(cx, cy, 104, 0, 7), [196, 160, 70], 190); P.path((c) => c.arc(cx, cy, 92, 0, 7), [34, 52, 120], 150);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283; P.line(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70, cx + Math.cos(a) * 88, cy + Math.sin(a) * 88, i % 2 ? 2 : 5, [226, 190, 90], 170); }
    P.line(cx, cy, cx + 40, cy - 50, 6, [230, 196, 96], 190); P.line(cx, cy, cx - 12, cy + 70, 4, [230, 196, 96], 190); P.path((c) => c.arc(cx, cy, 9, 0, 7), [230, 196, 96], 200);
  });
  cell(4, 6, (X, Y) => {      // porte charretière et herse
    P.path((c) => pointed(c, X + 128, Y + 40, 196, Y + 256), [240, 231, 210], 200); P.path((c) => pointed(c, X + 128, Y + 58, 164, Y + 256), [22, 20, 20], 20);
    P.c.save(); P.c.beginPath(); pointed(P.c, X + 128, Y + 58, 164, Y + 256); P.c.clip();
    for (let x = X + 52; x < X + 210; x += 20) P.rect(x, Y + 40, 5, 120, [70, 58, 46], 90);
    for (let y = Y + 70; y < Y + 160; y += 24) P.rect(X + 40, y, 180, 5, [70, 58, 46], 90);
    P.c.restore();
  });
  cell(5, 6, (X, Y) => { P.path((c) => pointed(c, X + 128, Y + 84, 96, Y + 256), [240, 231, 210], 195); P.path((c) => pointed(c, X + 128, Y + 96, 76, Y + 256), [86, 62, 42], 70); P.rect(X + 127, Y + 120, 2, 136, [44, 34, 26], 40); for (const y of [Y + 160, Y + 220]) P.rect(X + 94, y, 68, 4, [40, 36, 36], 110); });
  cell(6, 6, (X, Y) => { const cx = X + 128, cy = Y + 128; P.path((c) => c.arc(cx, cy, 56, 0, 7), [240, 231, 210], 195); P.path((c) => c.arc(cx, cy, 44, 0, 7), GL, 40); for (let i = 0; i < 4; i++) { const a = i * 1.5708 + 0.785; P.stroke((c) => c.arc(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20, 20, 0, 7), 4, [232, 222, 200], 175); } });
  cell(7, 6, (X, Y) => { for (let i = 0; i < 4; i++) { const cx = X + 32 + i * 64; P.path((c) => pointed(c, cx, Y + 40, 52, Y + 236), [196, 184, 160], 80); P.stroke((c) => pointed(c, cx, Y + 40, 52, Y + 236), 5, [240, 231, 210], 200); } P.rect(X, Y + 236, 256, 8, [240, 231, 210], 200); });
  // 7 : grandes verrières à quatre lancettes (chapelles hautes, chœurs)
  fxRow(P, r, 7, (X, Y) => { lancet(P, r, X + 128, Y + 12, 196, Y + 244, { lights: 4, mould: 9 }); P.rect(X, Y, 14, 256, [236, 226, 204], 205); P.rect(X + 242, Y, 14, 256, [236, 226, 204], 205); });
}

export function makeStoneFx(scale, hi = 1) {
  const A = new Painter(2048, 2048, scale * hi, false, 'c'), Bp = new Painter(2048, 2048, scale, false, 'h');
  paintStoneFx(A); paintStoneFx(Bp);
  const W = 2048 * scale;
  grain(A.c, W * hi, W * hi, 0.13, 9);
  return { map: tex(A.c.canvas, true, true, false), normalMap: tex(normalFromHeight(Bp.hh, W, W, 2.4, false), false, true, false), canvas: A.c.canvas };
}

// Coordonnées d'atlas : rangée r (0 en haut), cellule c → [u0, u1, vBas, vHaut].
export function cellUV(row, c0, n = 1) {
  const pad = 1.5 / 2048;
  return [c0 / 8, (c0 + n) / 8, 1 - (row + 1) / 8 + pad, 1 - row / 8 - pad];
}

export function makeMaterials(scale) {
  const hi = scale >= 1 ? 2 : 1;      // sur ordinateur : façades et baies dessinées en double définition
  const h = makeHouseAtlas(scale, hi), s = makeStone(scale), f = makeStoneFx(scale, hi), rf = makeRoof(scale);
  const ns = (v) => new THREE.Vector2(v, v);
  const mats = {
    houses: new THREE.MeshStandardMaterial({ map: h.map, normalMap: h.normalMap, normalScale: ns(0.7), emissiveMap: h.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.93, metalness: 0 }),
    stone: new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, normalScale: ns(0.6), vertexColors: true, roughness: 0.94, metalness: 0 }),
    stonefx: new THREE.MeshStandardMaterial({ map: f.map, normalMap: f.normalMap, normalScale: ns(0.7), vertexColors: true, roughness: 0.94, metalness: 0 }),
    roof: new THREE.MeshStandardMaterial({ map: rf.map, normalMap: rf.normalMap, normalScale: ns(0.8), vertexColors: true, roughness: 0.86, metalness: 0 }),
    plain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
  };
  mats._canvases = { houses: h.canvas, stonefx: f.canvas };
  return mats;
}
