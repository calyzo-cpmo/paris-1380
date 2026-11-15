// Sol de Lutèce : campagne, bois et prairies inondables, bras morts de la rive droite, ruisseaux, jardins, chemins et
// rues dallées, esplanades des monuments, fleuve et grèves. Peint deux fois : plan d'ensemble et toile fine de la ville.
import { ring, fill, stroke, lines } from '../p1789/outils.js';
import { CADRE, COEUR, PAVE, bois, SEUIL_BOIS } from './plan.js';
import { mulberry32, smoothstep, pointInPoly } from '../geom.js';

export const TUILE_SOL = 1600;                           // côté du motif de campagne (m)

// Motif de campagne répétable : prés, lanières de céréales et de jachères, quelques vignes, orientés comme le
// quadrillage des rues.
export function motifCampagne(n = 512) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d', { willReadFrequently: true }), r = mulberry32(250), cols = ['#8b9c5c', '#97a765', '#a59e6c', '#b5aa76', '#819659', '#909f60', '#a49b68', '#c0b27c', '#8a9a62'];
  x.fillStyle = '#8c9b60'; x.fillRect(0, 0, n, n);
  for (let i = 0; i < 150; i++) {
    const cx = r() * n, cy = r() * n, w = 22 + r() * 70, h = 7 + r() * 26, a = (r() < 0.55 ? 0.37 : 1.94) + (r() - 0.5) * 0.12, vigne = r() < 0.12;
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      x.save(); x.translate(cx + ox, cy + oy); x.rotate(a); x.fillStyle = vigne ? '#9a8e66' : cols[Math.floor(r() * cols.length)]; x.fillRect(-w / 2, -h / 2, w, h);
      if (vigne) { x.fillStyle = 'rgba(70,96,52,0.8)'; for (let k = -h / 2 + 1; k < h / 2; k += 2.6) x.fillRect(-w / 2, k, w, 1.1); }
      x.restore();
    }
  }
  return c;
}

// Bois et prairies humides, à 20 m par point : un bruit lent dessine les bois ; les terres basses hors de la ville
// (moins de quatre à six mètres au-dessus des basses eaux) sont des prés inondables.
function calque(P, T) {
  if (P.calque) return P.calque;
  const pas = 20, w = Math.round((CADRE.x1 - CADRE.x0) / pas), h = Math.round((CADRE.z1 - CADRE.z0) / pas), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const x = cv.getContext('2d'), im = x.createImageData(w, h), d = im.data;
  for (let k = 0; k < h; k++) for (let i = 0; i < w; i++) {
    const X = CADRE.x0 + (i + 0.5) * pas, Z = CADRE.z0 + (k + 0.5) * pas, q = (k * w + i) * 4, hors = smoothstep(760, 1000, Math.hypot(X - COEUR.x, Z - COEUR.z));
    const humide = (1 - smoothstep(3.6, 6.2, T.land(X, Z) - 2.4)) * hors * (P.iles.some((l) => pointInPoly(X, Z, l)) ? 0 : 1);
    const b = smoothstep(SEUIL_BOIS - 0.03, SEUIL_BOIS + 0.05, bois(X, Z)) * hors * (1 - humide);
    if (humide > b) { d[q] = 116; d[q + 1] = 136; d[q + 2] = 94; d[q + 3] = humide * 185; } else { d[q] = 72; d[q + 1] = 98; d[q + 2] = 62; d[q + 3] = b * 215; }
  }
  x.putImageData(im, 0, 0);
  return (P.calque = cv);
}

// Les trois parties de la ville aux rues dallées : la ville haute, l'île, la tête de pont. `dessin` est appelé une
// fois par partie, le tracé limité à cette partie.
export function dansVille(x, T, P, dessin) {
  const zones = [(c) => c.arc(T.x(COEUR.x), T.y(COEUR.z), PAVE * T.s, 0, 7), (c) => ring(c, T, P.cite)];
  if (P.tete) zones.push((c) => c.arc(T.x(P.tete[0]), T.y(P.tete[1]), 230 * T.s, 0, 7));
  for (const z of zones) { x.save(); x.beginPath(); z(x); x.clip(); dessin(); x.restore(); }
}

// T : { s (pixels par mètre), x(xMonde), y(zMonde) }.
export function peindre(x, T, tile, app) {
  const P = app.plan250, s = T.s, fin = s > 1, am = P.am, EAU = 'rgb(84,104,110)';
  const pat = x.createPattern(tile, 'repeat'), k = (TUILE_SOL * s) / tile.width;
  pat.setTransform(new DOMMatrix().translate(T.x(0), T.y(0)).scale(k));
  x.fillStyle = pat; x.fillRect(0, 0, x.canvas.width, x.canvas.height);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(calque(P, app.terrain), T.x(CADRE.x0), T.y(CADRE.z0), (CADRE.x1 - CADRE.x0) * s, (CADRE.z1 - CADRE.z0) * s);
  // bras morts et marais de la rive droite
  lines(x, T, P.marais, 'rgba(100,120,88,0.5)', 170 * s); lines(x, T, P.marais, 'rgba(88,110,96,0.55)', 62 * s); lines(x, T, P.marais, 'rgba(84,104,110,0.9)', Math.max(1.5, 11 * s));
  // ruisseaux de la rive gauche : la Bièvre et ses bras
  lines(x, T, P.ruisseaux, 'rgba(98,126,80,0.75)', 30 * s); lines(x, T, P.ruisseaux, 'rgb(88,108,114)', Math.max(1.5, 5 * s));
  // jardins et vergers, derrière les maisons
  for (const g of P.jardins) {
    x.fillStyle = g.t < 0.4 ? 'rgb(120,142,86)' : g.t < 0.7 ? 'rgb(150,142,100)' : 'rgb(130,148,94)'; x.beginPath(); ring(x, T, g.ring); x.fill();
    if (fin) { x.strokeStyle = 'rgba(70,84,52,0.5)'; x.lineWidth = Math.max(0.8, 0.9 * s); x.stroke(); }
  }
  // terre battue autour des maisons
  x.strokeStyle = x.fillStyle = 'rgb(184,170,140)'; x.lineWidth = 7 * s; x.lineJoin = 'round';
  for (const l of P.lots) { x.beginPath(); ring(x, T, l.ring); x.fill(); x.stroke(); }
  // chemins de terre, puis rues dallées de la ville
  lines(x, T, P.rues, 'rgb(186,172,140)', Math.max(1.5, 6 * s));
  dansVille(x, T, P, () => { lines(x, T, P.voies, 'rgb(154,148,136)', 7.8 * s); lines(x, T, [P.cardo], 'rgb(154,148,136)', 9.4 * s); });
  // esplanades : forum dallé, palestres et arène sablées, orchestre du théâtre
  fill(x, T, [[am.forum.m.ring]], 'rgb(190,182,164)');
  fill(x, T, [[am.thermesN.m.ring], [am.thermesE.m.ring]], 'rgb(196,184,156)'); fill(x, T, [[am.thermesN.palestre], [am.thermesE.palestre]], 'rgb(210,194,154)');
  fill(x, T, [[am.theatre.m.ring], [am.arenes.m.ring]], 'rgb(186,176,154)'); fill(x, T, [[am.arenes.arene]], 'rgb(214,198,156)');
  x.fillStyle = 'rgb(200,192,172)'; x.beginPath(); x.arc(T.x(am.theatre.O[0]), T.y(am.theatre.O[1]), 15 * s, 0, 7); x.fill();
  // fleuve : grèves, puis le lit ; prolongé hors du plan
  const reach = P.ext.map((e) => { const q = (t, d) => [e.x + e.dx * t - e.dz * d, e.z + e.dz * t + e.dx * d]; return [[q(-140, -e.half), q(4000, -e.half), q(4000, e.half), q(-140, e.half)]]; });
  stroke(x, T, P.eau.concat(reach), 'rgb(198,186,154)', Math.max(2, 18 * s)); fill(x, T, P.eau.concat(reach), EAU);
  // emprise des maisons : ombre au pied des murs, puis la masse bâtie (ce que montre le plan de situation)
  if (fin) { x.strokeStyle = 'rgba(44,36,28,0.22)'; x.lineWidth = 5 * s; x.lineJoin = 'bevel'; for (const l of P.lots) { x.beginPath(); ring(x, T, l.ring); x.stroke(); } }
  x.fillStyle = 'rgb(160,110,84)'; for (const l of P.lots) { x.beginPath(); ring(x, T, l.ring); x.fill(); }
  x.fillStyle = 'rgb(134,152,98)'; for (const l of P.lots) for (const h of l.holes) { x.beginPath(); ring(x, T, h); x.fill(); }      // jardin de la cour
}
