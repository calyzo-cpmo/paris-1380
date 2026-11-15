// Construction de Lutèce : maisons le long des rues restituées (évoquées), portiques du cardo, monuments, ponts,
// arbres, trame des passants.
import { Builder, box, rgb, tint } from '../builder.js';
import { building, hex, hash } from '../p1789/blocks.js';
import { ring, fill, lines, indexFoot, buildTrees } from '../p1789/outils.js';
import { makeMaterialsLutece } from './textures.js';
import { batirMonuments } from './monuments.js';
import { dansVille } from './sol.js';
import { CADRE, COEUR, bois, SEUIL_BOIS } from './plan.js';
import { distPolyline } from '../geom.js';

const ENDUITS = [0xf3ecd9, 0xe9dcc0, 0xeee2c8, 0xe3cfa6, 0xdcc096, 0xe8cdb4, 0xf5f0e4, 0xe0cba4, 0xead9b8, 0xd8b890].map(hex);
const TUILES = [rgb(186, 112, 82), rgb(172, 104, 78), rgb(196, 124, 92), rgb(160, 98, 76), rgb(180, 118, 94), rgb(200, 134, 100), rgb(168, 110, 88)];
const BOIS = rgb(142, 110, 78), SOUS_TOIT = rgb(104, 80, 58);

// Portique de bois devant une maison du cardo : poteaux, sablière, appentis de tuiles au-dessus du trottoir.
function portique(app, B, l, toit) {
  const T = app.terrain, a = l.a, b = l.b, L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, P = 2.6, n = Math.max(1, Math.round(L / 3));
  const y = Math.max(T.height(a[0], a[1]), T.height(b[0], b[1]), 0.3), bp = B.at('plain', l.x, l.z), a2 = [a[0] + l.nx * P, a[1] + l.nz * P], b2 = [b[0] + l.nx * P, b[1] + l.nz * P];
  for (let k = 0; k <= n; k++) box(bp, { cx: a2[0] + (ux * L * k) / n, cz: a2[1] + (uz * L * k) / n, ux, uz, hl: 0.1, hw: 0.1 }, y - 0.6, y + 2.75, { col: BOIS, s0: 0.8 });
  box(bp, { cx: (a2[0] + b2[0]) / 2, cz: (a2[1] + b2[1]) / 2, ux, uz, hl: L / 2 + 0.1, hw: 0.11 }, y + 2.62, y + 2.84, { col: BOIS });
  const br = B.at('roof', l.x, l.z), o = 0.45, e0 = [a2[0] + l.nx * o, a2[1] + l.nz * o], e1 = [b2[0] + l.nx * o, b2[1] + l.nz * o], yb = y + 2.72, yh = y + 3.5;
  // le versant regarde la rue et le ciel : l'ordre des points suit le sens de la façade ; dessous, le voligeage, vu du trottoir
  if ((e1[1] - e0[1]) * (a[0] - e0[0]) - (e1[0] - e0[0]) * (a[1] - e0[1]) >= 0) { br.quad(e0[0], yb, e0[1], e1[0], yb, e1[1], b[0], yh, b[1], a[0], yh, a[1], 0, 0, L * 0.33, 1, toit, 0.9, 1); bp.quad(e1[0], yb - 0.05, e1[1], e0[0], yb - 0.05, e0[1], a[0], yh - 0.05, a[1], b[0], yh - 0.05, b[1], 0, 0, 1, 1, SOUS_TOIT, 1, 0.8); }
  else { br.quad(e1[0], yb, e1[1], e0[0], yb, e0[1], a[0], yh, a[1], b[0], yh, b[1], L * 0.33, 0, 0, 1, toit, 0.9, 1); bp.quad(e0[0], yb - 0.05, e0[1], e1[0], yb - 0.05, e1[1], b[0], yh - 0.05, b[1], a[0], yh - 0.05, a[1], 0, 0, 1, 1, SOUS_TOIT, 1, 0.8); }
}

export async function construire(app, step) {
  const T = app.terrain, P = app.plan250, B = new Builder(), mats = (app.materials = makeMaterialsLutece());
  app.foot = []; app.landmarks = []; app.gardens = []; app.monuments = {}; app.stats = { bati: P.lots.length, evoques: P.lots.length };
  const pause = () => new Promise((r) => setTimeout(r, 0));

  await step('Les maisons, le long des rues restituées…', 0.3);
  let n = 0;
  for (const l of P.lots) {
    const col = ENDUITS[Math.floor(hash(l.id, 4) * ENDUITS.length)], toit = TUILES[Math.floor(hash(l.id, 22) * TUILES.length)];
    building(app, B, { outer: l.ring, holes: l.holes }, l.id, { kind: 'maison', floors: l.etages, col, roof: toit, mansard: false, pitch: 0.42 + hash(l.id, 24) * 0.1, light: true, area: l.w * l.d });
    if (l.portique) portique(app, B, l, tint(toit, 0.94));
    if (++n % 400 === 0) { await step('Les maisons, le long des rues restituées…', 0.3 + (0.26 * n) / P.lots.length); await pause(); }
  }

  await step('Forum, thermes, théâtre et arènes…', 0.58);
  batirMonuments(app, B);

  await step('Assemblage de la ville…', 0.74);
  app.batiMeshes = B.finish(app.scene, mats); app.quaiMeshes = []; app.cityMeshes = app.batiMeshes;
  app.stats.tris = Math.round(B.tris);
  indexFoot(app);

  await step('Jardins, vergers et bois…', 0.82);
  for (const g of P.jardins) if (g.t < 0.8) app.gardens.push({ ring: g.ring, dens: 0.3 });
  for (const l of P.lots) for (const h of l.holes) app.gardens.push({ ring: h, dens: 0.5 });
  for (const l of P.ruisseaux) {                         // saules et aulnes au bord des ruisseaux
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of l) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    app.gardens.push({ ring: [[x0 - 24, z0 - 24], [x1 + 24, z0 - 24], [x1 + 24, z1 + 24], [x0 - 24, z1 + 24]], dens: 0.45, ok: (x, z) => { const d = distPolyline(x, z, l); return d > 5 && d < 22 && distPolyline(x, z, P.cardo) > 9; } });
  }
  app.gardens.push({                                     // bois : là où le sol en est peint (src/lutece/sol.js)
    ring: [[CADRE.x0 + 80, CADRE.z0 + 80], [CADRE.x1 - 80, CADRE.z0 + 80], [CADRE.x1 - 80, CADRE.z1 - 80], [CADRE.x0 + 80, CADRE.z1 - 80]], dens: 0.42,
    ok: (x, z) => bois(x, z) > SEUIL_BOIS + 0.015 && Math.hypot(x - COEUR.x, z - COEUR.z) > 900 && T.land(x, z) - 2.4 > 5.6 && distPolyline(x, z, P.cardo) > 10,
  });
  app.trees = buildTrees(app);
  app.streetAt = (x, z, max = 28) => (distPolyline(x, z, P.cardo) < Math.min(max, 18) ? 'Cardo maximus' : null);

  // trame des passants : les rues, l'esplanade du forum, l'arène, les ponts ; ni l'eau ni les bâtiments
  await step('Les habitants de Lutèce…', 0.93);
  { const R = app.navRect, cell = app.mobile ? 2.5 : 1.5, w = Math.round(R.w / cell), h = Math.round(R.h / cell), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d', { willReadFrequently: true }), TT = { s: 1 / cell, x: (v) => (v - R.x) / cell, y: (v) => (v - R.z) / cell };
    const lire = () => { const im = x.getImageData(0, 0, w, h).data, d = new Uint8Array(w * h); for (let i = 0; i < d.length; i++) d[i] = im[i * 4] > 200 ? 1 : 0; return d; };
    const rues = () => { lines(x, TT, P.voies, '#fff', 6.4 / cell); lines(x, TT, [P.cardo], '#fff', 8 / cell); fill(x, TT, [[P.am.forum.cour]], '#fff'); };
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    rues(); fill(x, TT, [[P.am.arenes.arene]], '#fff');
    fill(x, TT, P.eau, '#000');
    lines(x, TT, P.ponts.map((p) => p.pts.map((q) => [q.x, q.z])), '#fff', 5 / cell);
    x.fillStyle = '#000'; x.strokeStyle = '#000'; x.lineWidth = 1.2; for (const f of app.foot) { x.beginPath(); ring(x, TT, f.ring); x.fill(); x.stroke(); }
    const data = lire();
    app.nav = { data, w, h, x0: R.x, z0: R.z, cell };
    // dalles : seules les rues de la ville sont pavées ; les chemins de la campagne restent de terre
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h); dansVille(x, TT, P, rues);
    const dal = lire(); for (let i = 0; i < dal.length; i++) dal[i] = dal[i] && data[i] ? 1 : 0;
    app.pavage = dal; }
}
