// Sol de Paris en 1889 : banlieue maraîchère, zone et talus de l'enceinte de Thiers, rues et îlots de la base
// « Paris 1900 », jardins, cimetières, canaux. Peint deux fois : plan d'ensemble et toile fine autour de l'Exposition.
import { fill, stroke, lines } from '../p1789/outils.js';
import { ilots, rues, eau, parcs, cimetieres, CADRE } from './data.js';
import { mulberry32 } from '../geom.js';

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
  const pres = [], loin = [], plantes = [], talus = [];
  for (const i of I) { if (i.c === 'F') talus.push(i.rings); else if (i.c === 'p') plantes.push(i.rings); else (Math.hypot(i.rings[0][0][0] - V.enveloppe.cx, i.rings[0][0][1] - V.enveloppe.cz) < 3300 ? pres : loin).push(i.rings); }
  fill(x, T, pres, '#a99f88'); fill(x, T, loin, '#a6a380'); fill(x, T, plantes, '#a8b586');
  fill(x, T, talus, '#8f9f6c'); stroke(x, T, talus, '#7d7867', Math.max(1, 2.6 * T.s));
  fill(x, T, cimetieres(), '#a5ae8e');
  fill(x, T, parcs().filter((p) => !/Champ De Mars/i.test(p.nom)).map((p) => p.rings), '#86a568');
  fill(x, T, eau().filter((e) => e.t !== 'S').map((e) => e.rings), '#62828f');
  for (const rings of V.seine) fill(x, T, [rings], '#5c706c');            // un par un : ils se recouvrent par endroits
  // rues : trottoirs clairs, chaussée ; sur le plan d'ensemble, un seul trait
  const R = rues(), par = new Map();
  for (const r of R) { const w = Math.max(r.l || 8, 6), k = Math.round(w / 2) * 2; if (!par.has(k)) par.set(k, []); par.get(k).push(r.pts); }
  for (const [w, ls] of par) lines(x, T, ls, '#c4beb0', Math.max(1, w * T.s));
  if (fin) for (const [w, ls] of par) if (w >= 10) lines(x, T, ls, '#b2ab9c', (w - Math.min(8, w * 0.36)) * T.s);
  if (V.peindreExpo) V.peindreExpo(x, T, fin);
}
