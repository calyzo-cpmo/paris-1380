// Ce que l'Exposition de 1900 laisse à Paris, et que les pages suivantes reprennent (src/p1937/expo.js) : la verrière
// et la coupole du Grand Palais, le dôme du Petit Palais, les pylônes du pont Alexandre-III. Les corps de pierre du
// Grand et du Petit Palais viennent des données. Ce module importe src/p1889/expo.js par un chemin explicite : il en
// obtient l'original, dans la page de 1900 comme dans celles qui le reprennent (tools/build.mjs, surcouche, reprend).
import { box, cyl, cone, rgb } from '../builder.js';
import { coupole } from '../p1889/monuments.js';
import { repere } from '../p1889/corps.js';
import { ensemble, OR, PIERRE } from '../p1889/expo.js';
import { berceau, calotte } from './outils.js';

export const STUC = rgb(236, 228, 208);
export const STATIQUE = [-2, -1];                // dates de chantier passées : achevés (ce qui suit le curseur est dans un ouvrage, src/p1900/montage.js)

// ---- Grand Palais (1897-1900) : la nef de 200 m sur 50 m le long de l'avenue (Winston-Churchill aujourd'hui), le
// transept vers le palais d'Antin, la coupole de verre à 45 m au-dessus de leur croisée, le mât à 60 m. Les corps de
// pierre viennent des données ; la verrière est posée dessus.
export function grandPalais(app) {
  const F = repere([-2720, -1454], [0, 1]), y0 = app.terrain.height(-2720, -1454);
  ensemble(app, y0, ...STATIQUE, 60, (bm, bv) => {
    berceau(bv, F.P, y0, -100, 100, -26, 26, 26.5, 35);
    berceau(bv, (u, v) => F.P(v, u), y0, 26, 106, -26, 26, 26.5, 35);                                 // transept : u et v échangés
    calotte(bv, -2720, -1454, 25, y0 + 33, y0 + 45);
    cyl(bm, -2720, -1454, 2.4, y0 + 44.5, y0 + 49, { col: OR, seg: 8 }); box(bm, { cx: -2720, cz: -1454, ux: 1, uz: 0, hl: 0.2, hw: 0.2 }, y0 + 49, y0 + 60, { col: rgb(60, 60, 60) });
  });
  app.landmarks.push({ x: -2720, z: -1454, top: y0 + 60 });
  app.monuments.GrandPalais = { x: -2720, z: -1454, top: y0 + 64 };
}
// ---- Petit Palais (Charles Girault, 1897-1900) : le dôme du porche d'entrée, face au Grand Palais. Évocation.
export function petitPalais(app, B) {
  const x = -2592, z = -1442, top = coupole(app, B, x, z, 8.5, 15, 21, 31, 33.5, 36, rgb(196, 190, 176), { pierre: STUC, fleche: OR });
  app.monuments.PetitPalais = { x: -2556, z: -1440, top: top + 4 };
}
// ---- pont Alexandre-III : quatre pylônes de 17 m aux têtes du pont, couronnés de groupes dorés (Renommées et Pégase)
export function pylones(app, B) {
  const a = [-2667, -1109], b = [-2655, -1257], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = -dz, nz = dx;
  for (const [e, sg] of [[a, -1], [b, 1]]) for (const s of [-1, 1]) {
    const x = e[0] + dx * sg * 10 + nx * s * 24, z = e[1] + dz * sg * 10 + nz * s * 24, y0 = app.terrain.height(x, z), bs = B.at('stone', x, z), bp = B.at('plain', x, z);
    box(bs, { cx: x, cz: z, ux: dx, uz: dz, hl: 3.6, hw: 3.6 }, y0 - 1, y0 + 5, { col: PIERRE, s0: 0.84 });
    box(bs, { cx: x, cz: z, ux: dx, uz: dz, hl: 2.4, hw: 2.4 }, y0 + 5, y0 + 17, { col: PIERRE, s0: 0.88 });
    cyl(bp, x, z, 1.8, y0 + 17, y0 + 19.5, { col: OR, seg: 8 }); cone(bp, x, z, 1.4, y0 + 19.5, y0 + 23, { col: OR, seg: 6 });
    app.foot.push({ ring: [[x - 3.6, z - 3.6], [x + 3.6, z - 3.6], [x + 3.6, z + 3.6], [x - 3.6, z + 3.6]], top: y0 + 23 });
    app.landmarks.push({ x, z, top: y0 + 23 });
  }
  app.monuments.AlexandreIII = { x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, top: app.terrain.height(a[0], a[1]) + 30 };
}
