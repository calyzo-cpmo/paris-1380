// Le monde de la page « Paris 1889 » : tout Paris dans l'enceinte de Thiers, l'année de l'Exposition universelle.
// L'application qui le fait vivre est celle de la page « Paris 1789 » (src/p1789/app.js).
import { CADRE, COMPTE, eau, relief } from './data.js';
import { TUILE_SOL, CENTRE_RECT, motifBanlieue, enveloppe, peindre } from './sol.js';
import { construire } from './ville.js';
import { makeFigureAtlas89, outfit89 } from '../p1789/figures.js';
import { Terrain89 } from '../p1789/terrain.js';
import { pointInPoly } from '../geom.js';
import { batirExpo, peindreExpo, ESPLANADES, jardinsExpo } from './expo.js';

// La Seine sort du cadre en plusieurs endroits (amont, aval, boucle de Boulogne) : on la prolonge tout droit à chacun.
function prolongements(S) {
  const B = S.map((rings) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of rings[0]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { r: rings[0], x0, z0, x1, z1 }; });
  const mouille = (x, z) => B.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && pointInPoly(x, z, b.r)), ext = [], pas = 10, m = 6;
  const bords = [[CADRE.x0 + m, CADRE.z0, 0, 1, -1, 0, CADRE.z1 - CADRE.z0], [CADRE.x1 - m, CADRE.z0, 0, 1, 1, 0, CADRE.z1 - CADRE.z0], [CADRE.x0, CADRE.z0 + m, 1, 0, 0, -1, CADRE.x1 - CADRE.x0], [CADRE.x0, CADRE.z1 - m, 1, 0, 0, 1, CADRE.x1 - CADRE.x0]];
  for (const [x, z, tx, tz, dx, dz, L] of bords) {
    let d0 = -1;
    for (let s = 0; s <= L + pas; s += pas) {
      const w = s <= L && mouille(x + tx * s, z + tz * s);
      if (w && d0 < 0) d0 = s;
      if (!w && d0 >= 0) { if (s - d0 > 40) { const c = (d0 + s - pas) / 2; ext.push({ x: x + tx * c, z: z + tz * c, dx, dz, half: (s - d0) / 2 }); } d0 = -1; }
    }
  }
  return ext;
}

export const MONDE_1889 = {
  cadre: CADRE, centre: CENTRE_RECT, vue: { x: -3900, z: -480, dist: 1950, az: -2.5, el: 0.3 }, tuile: TUILE_SOL,
  etapes: ['Lecture des plans de Paris, de 1887 à 1900…', 'Les collines, la Seine et les canaux…', 'Rues, îlots et jardins de la ville…'],
  terrain: (app) => {
    const S = eau().filter((e) => e.t === 'S').map((e) => e.rings);
    app.v89 = { ...(app.v89 || {}), seine: S, enveloppe: enveloppe(), monuments: batirExpo, peindreExpo, esplanades: ESPLANADES(), jardins: jardinsExpo };
    return new Terrain89({ cadre: CADRE, relief: relief(), eau: S, ext: prolongements(S), union: true });
  },
  motif: () => motifBanlieue(),
  peindre,
  construire,
  figures: (mobile) => ({ atlas: makeFigureAtlas89(mobile ? 0.5 : 1), outfit: outfit89 }),
  lumieres: ['facade', 'rdc', 'comble'],
  bilan: (app) => `${app.stats.bati} bâtiments (${COMPTE.R} réels, ${COMPTE.P} probables, ${COMPTE.V} disparus, ${COMPTE.E + COMPTE.G} évoqués), ${app.v89.ponts.length} ponts, ${app.stats.tris} triangles, ${app.treeCount} arbres, ${app.people.total} passants possibles`,
};
