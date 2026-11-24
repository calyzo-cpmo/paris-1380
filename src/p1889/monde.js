// Le monde des pages « Paris 1889 » et « Paris 1900 » : tout Paris dans l'enceinte de Thiers, l'année d'une Exposition
// universelle. L'application qui le fait vivre est celle de la page « Paris 1789 » (src/p1789/app.js).
import { CADRE, COMPTE, ANNEE, eau, relief } from './data.js';
import { TUILE_SOL, CENTRE_RECT, motifBanlieue, enveloppe, peindre, voirie } from './sol.js';
import { construire } from './ville.js';
import { makeFigureAtlas1889, outfit1889, ATTELAGES } from './figures.js';
import { Terrain89 } from '../p1789/terrain.js';
import { pointInPoly } from '../geom.js';
import { batirExpo, peindreExpo, ESPLANADES, jardinsExpo } from './expo.js';
import { portsBas, NIVEAU_PORT } from './ports.js';

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
  etapes: [ANNEE >= 1900 ? 'Lecture des plans de Paris en 1900…' : 'Lecture des plans de Paris, de 1887 à 1900…', 'Les collines, la Seine et les canaux…', 'Rues, îlots et jardins de la ville…'],
  terrain: (app) => {
    const S = eau().filter((e) => e.t === 'S').map((e) => e.rings);
    app.v89 = { ...(app.v89 || {}), seine: S, enveloppe: enveloppe(), monuments: batirExpo, peindreExpo, esplanades: ESPLANADES(), jardins: jardinsExpo };
    // Le relief d'aujourd'hui donne au fleuve sa cote basse et fait remonter le sol en pente sur cinquante mètres : les
    // nœuds posés sur l'eau ou tout près sont oubliés, et le terrain prolonge jusqu'au bord le niveau des quais.
    const R = relief(), B = S.map((rings) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of rings[0]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { r: rings[0], x0, z0, x1, z1 }; });
    const eauEn = (x, z) => B.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && pointInPoly(x, z, b.r)), m = 46, k = 0.7 * m;
    for (let j = 0; j < R.nz; j++) for (let i = 0; i < R.nx; i++) { const x = R.x0 + i * R.pas, z = R.z0 + j * R.pas;
      if (eauEn(x, z) || eauEn(x + m, z) || eauEn(x - m, z) || eauEn(x, z + m) || eauEn(x, z - m) || eauEn(x + k, z + k) || eauEn(x - k, z + k) || eauEn(x + k, z - k) || eauEn(x - k, z - k)) R.ok[j * R.nx + i] = 0; }
    const T = new Terrain89({ cadre: CADRE, relief: R, eau: S, ext: prolongements(S), union: true, quais: { x0: CADRE.x0 - 400, x1: CADRE.x1 + 400 } });
    // rives et ports bas : le terrain est abaissé sur les ports avant que le maillage du sol soit construit
    const P = portsBas(T, CADRE, app.v89.enveloppe.ring); T.abaisser(P.bandes, NIVEAU_PORT); app.v89.rives = P;
    return T;
  },
  motif: () => motifBanlieue(),
  peindre,
  voirie,
  construire,
  figures: (mobile) => ({ atlas: makeFigureAtlas1889(mobile ? 0.5 : 1), outfit: outfit1889, attelages: ATTELAGES }),
  lumieres: ['facade', 'rdc', 'comble'],
  bilan: (app) => `${app.stats.bati} bâtiments (${COMPTE.R} réels, ${COMPTE.P} probables, ${COMPTE.V} disparus, ${COMPTE.E + COMPTE.G} évoqués), ${app.v89.ponts.length} ponts, ${app.v89.fer.n} voies ferrées (${Math.round(app.v89.fer.km)} km, ${app.v89.fer.viaduc} m sur viaduc), ${app.stats.tris} triangles, ${app.treeCount} arbres de jardin, ${app.stats.alignements} arbres d’alignement, ${app.people.total} passants possibles`,
};
