// Sol de Paris en 1889 : banlieue maraîchère, zone et talus de l'enceinte de Thiers, rues et îlots de la base
// « Paris 1900 », jardins, cimetières, canaux. Peint deux fois : plan d'ensemble et toile fine autour de l'Exposition.
import { fill, stroke, ring } from '../p1789/outils.js';
import { ilots, eau, parcs, cimetieres, CADRE, EXPO, expoXZ } from './data.js';
import { mulberry32 } from '../geom.js';
import { peindreVoies, ilotsFerres } from './fer.js';

export const TUILE_SOL = 1600;                           // côté du motif de banlieue (m)
export const CENTRE_RECT = { x: -5000, z: -1900, w: 2600, h: 2600 };      // toile fine : du Trocadéro aux Invalides

// Banlieue de 1889 : cultures maraîchères en lanières, prés, quelques champs.
export function motifBanlieue(n = 512) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d', { willReadFrequently: true }), r = mulberry32(1889), cols = ['#93a268', '#a0ab6e', '#aaa574', '#b4ab7c', '#899c62', '#98a568', '#a79f6e', '#bcb080', '#8fa066', '#9c9a70'];
  x.fillStyle = '#96a26a'; x.fillRect(0, 0, n, n);
  for (let i = 0; i < 170; i++) {
    const cx = r() * n, cy = r() * n, w = 18 + r() * 60, h = 6 + r() * 22, a = (r() < 0.5 ? 0.3 : 1.87) + (r() - 0.5) * 0.2, raies = r() < 0.3;
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      x.save(); x.translate(cx + ox, cy + oy); x.rotate(a); x.fillStyle = cols[Math.floor(r() * cols.length)]; x.fillRect(-w / 2, -h / 2, w, h);
      if (raies) { x.fillStyle = 'rgba(78,104,58,0.55)'; for (let k = -h / 2 + 1; k < h / 2; k += 2.2) x.fillRect(-w / 2, k, w, 0.9); }
      x.restore();
    }
  }
  return c;
}

// Contour de la ville : pour chaque direction autour du centre, le point le plus lointain des îlots (enceinte comprise).
export function enveloppe() {
  const I = ilots(), N = 720, far = new Float32Array(N);
  let cx = 0, cz = 0, n = 0; for (const i of I) for (const p of i.rings[0]) { cx += p[0]; cz += p[1]; n++; }
  cx /= n; cz /= n;
  for (const i of I) for (const p of i.rings[0]) { const k = Math.floor(((Math.atan2(p[1] - cz, p[0] - cx) + Math.PI) / (2 * Math.PI)) * N) % N, d = Math.hypot(p[0] - cx, p[1] - cz); if (d > far[k]) far[k] = d; }
  for (let k = 0; k < N; k++) if (!far[k]) far[k] = far[(k + N - 1) % N] || far[(k + 1) % N];
  const ring = [];
  for (let k = 0; k < N; k++) { const d = Math.max(far[k], far[(k + 1) % N], far[(k + N - 1) % N]) + 18, a = ((k + 0.5) / N) * 2 * Math.PI - Math.PI; ring.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d]); }
  return { ring, cx, cz };
}

export function peindre(x, T, tile, app) {
  const W = x.canvas.width, H = x.canvas.height, fin = T.s > 0.3, V = app.v89, I = ilots();
  { const p = x.createPattern(tile, 'repeat'), k = (TUILE_SOL * T.s) / tile.width; p.setTransform(new DOMMatrix().translate(T.x(0), T.y(0)).scale(k)); x.fillStyle = p; x.fillRect(0, 0, W, H); }
  // zone non aedificandi et glacis : une couronne d'herbe rase et de jardinets devant le fossé
  stroke(x, T, [[V.enveloppe.ring]], '#a4a878', 520 * T.s);
  stroke(x, T, [[V.enveloppe.ring]], '#8c8a6c', 44 * T.s);                    // le fossé
  fill(x, T, [[V.enveloppe.ring]], '#bfb9ab');                                 // rues, places, boulevards : macadam et pavé clair
  // îlots : cours et terrains ; vers les fortifications, jardins et terrains vagues
  const pres = [], loin = [], plantes = [], talus = [], gares = [], F = ilotsFerres();
  I.forEach((i, k) => { if (i.c === 'F') talus.push(i.rings); else if (F.has(k)) gares.push(i.rings); else if (i.c === 'p') plantes.push(i.rings); else (Math.hypot(i.rings[0][0][0] - V.enveloppe.cx, i.rings[0][0][1] - V.enveloppe.cz) < 3300 ? pres : loin).push(i.rings); });
  fill(x, T, pres, '#a99f88'); fill(x, T, loin, '#a6a380'); fill(x, T, plantes, '#a8b586'); fill(x, T, gares, '#aaa28e');      // cours et faisceaux des gares : terre battue et mâchefer
  fill(x, T, talus, '#8f9f6c'); stroke(x, T, talus, '#7d7867', Math.max(1, 2.6 * T.s));
  peindreVoies(x, T);                                                     // ballast des voies ferrées, sur les îlots qu'elles traversent
  fill(x, T, cimetieres(), '#a5ae8e');
  fill(x, T, parcs().filter((p) => !/Champ De Mars/i.test(p.nom)).map((p) => p.rings), '#86a568');
  fill(x, T, eau().filter((e) => e.t !== 'S').map((e) => e.rings), '#62828f');
  for (const rings of V.seine) fill(x, T, [rings], '#5c706c');            // un par un : ils se recouvrent par endroits
  if (V.peindreExpo) V.peindreExpo(x, T, fin);
}

// Distance « au chanfrein » : chaque point prend la plus petite distance à un point déjà connu (deux balayages).
function chanfrein(d, w, h) {
  const b = Math.SQRT2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; let v = d[i]; if (v < 0.5) continue;
    if (x > 0 && d[i - 1] + 1 < v) v = d[i - 1] + 1;
    if (y > 0) { if (d[i - w] + 1 < v) v = d[i - w] + 1; if (x > 0 && d[i - w - 1] + b < v) v = d[i - w - 1] + b; if (x < w - 1 && d[i - w + 1] + b < v) v = d[i - w + 1] + b; }
    d[i] = v; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; let v = d[i]; if (v < 0.5) continue;
    if (x < w - 1 && d[i + 1] + 1 < v) v = d[i + 1] + 1;
    if (y < h - 1) { if (d[i + w] + 1 < v) v = d[i + w] + 1; if (x < w - 1 && d[i + w + 1] + b < v) v = d[i + w + 1] + b; if (x > 0 && d[i + w - 1] + b < v) v = d[i + w - 1] + b; }
    d[i] = v; }
}

// Voirie : la rue est ce qui reste de la ville quand on en retire les îlots de 1900, les jardins, les cimetières, l'eau
// et l'emprise de l'Exposition. Rend, pour chaque point d'une grille, la distance signée au bord de la rue (positive
// dans la rue), codée sur un octet entre -D et +D mètres : le shader du sol y trace trottoirs, bordures et chaussée.
export function voirie(app, taille) {
  const V = app.v89, fw = CADRE.x1 - CADRE.x0, fh = CADRE.z1 - CADRE.z0, w = taille, s = w / fw, h = Math.round(fh * s), D = 20;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const x = cv.getContext('2d', { willReadFrequently: true }), T = { s, x: (v) => (v - CADRE.x0) * s, y: (v) => (v - CADRE.z0) * s };
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  fill(x, T, [[V.enveloppe.ring]], '#fff');
  x.fillStyle = '#000';
  const plein = (r) => { x.beginPath(); ring(x, T, r); x.fill(); };
  for (const i of ilots()) plein(i.rings[0]);
  for (const p of parcs()) plein(p.rings[0]);
  for (const c of cimetieres()) plein(c[0]);
  for (const e of eau()) plein(e.rings[0]);
  plein([[EXPO.u0, EXPO.v0], [EXPO.u1, EXPO.v0], [EXPO.u1, EXPO.v1], [EXPO.u0, EXPO.v1]].map((p) => expoXZ(p[0], p[1])));
  const im = x.getImageData(0, 0, w, h).data, n = w * h, A = new Float32Array(n), B = new Float32Array(n);
  // amorces : la couverture d'un point de bord dit où passe le bord (0,5 : en son centre)
  for (let i = 0; i < n; i++) { const c = im[i * 4] / 255; A[i] = c > 0.98 ? 1e6 : c - 0.5; B[i] = c < 0.02 ? 1e6 : 0.5 - c; }
  chanfrein(A, w, h); chanfrein(B, w, h);
  const data = new Uint8Array(n), k = 1 / (s * 2 * D);
  for (let i = 0; i < n; i++) { const c = im[i * 4] / 255, f = c > 0.98 ? A[i] : c < 0.02 ? -B[i] : c - 0.5; data[i] = Math.max(0, Math.min(255, Math.round((0.5 + f * k) * 255))); }
  // Demi-largeur des voies, à gros grain : la plus grande distance au bord dans le voisinage (celle de l'axe de la rue,
  // reportée sur toute sa largeur). Le sol en tire la largeur des trottoirs, les alignements d'arbres leur recul.
  const G = 4, lw = Math.ceil(w / G), lh = Math.ceil(h / G); let L = new Uint8Array(lw * lh);
  for (let y = 0; y < h; y++) { const ly = (y / G) | 0; for (let xx = 0; xx < w; xx++) { const q = ly * lw + ((xx / G) | 0), v = data[y * w + xx]; if (v > L[q]) L[q] = v; } }
  for (let passe = 0; passe < 2; passe++) { const M = new Uint8Array(lw * lh);
    for (let y = 0; y < lh; y++) for (let xx = 0; xx < lw; xx++) { let v = 0; for (let j = Math.max(0, y - 1); j <= Math.min(lh - 1, y + 1); j++) for (let i = Math.max(0, xx - 1); i <= Math.min(lw - 1, xx + 1); i++) { const c = L[j * lw + i]; if (c > v) v = c; } M[y * lw + xx] = v; }
    L = M; }
  return { data, w, h, D, large: { data: L, w: lw, h: lh } };
}

// Largeur de convention d'un trottoir (m) pour une voie de demi-largeur H : un cinquième de la voie environ, de 1,4 m
// dans une ruelle à 8 m sur un grand boulevard. La même règle est écrite dans le shader du sol (src/p1789/app.js).
export const trottoir = (H) => Math.max(1.4, Math.min(8, 0.44 * H - 0.2));
