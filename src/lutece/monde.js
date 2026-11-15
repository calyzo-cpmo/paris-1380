// Le monde de la page « Lutèce », vers 250 : cadre, terrain et fleuve antique, peinture du sol, construction,
// habitants. L'application qui le fait vivre est celle de la page « Paris 1789 » (src/p1789/app.js).
import { relief } from './data.js';
import { CADRE, CENTRE_RECT, tracer, lotir } from './plan.js';
import { TUILE_SOL, motifCampagne, peindre } from './sol.js';
import { construire } from './ville.js';
import { makeFigureAtlasLutece, outfitLutece } from './figures.js';
import { Terrain89 } from '../p1789/terrain.js';

export const MONDE_LUTECE = {
  cadre: CADRE, centre: CENTRE_RECT, vue: { x: -330, z: 250, dist: 2100, az: -0.5, el: 0.62 }, tuile: TUILE_SOL,
  etapes: ['Lecture du plan restitué par Théodore Vacquer…', 'La colline, le fleuve et ses îles…', 'Rues, jardins et marais…'],
  // le plan d'abord (fleuve, îles, monuments), puis le terrain, puis ce qui a besoin du terrain : ponts, maisons, jardins
  terrain: (app) => { const P = (app.plan250 = tracer()), t = new Terrain89({ cadre: CADRE, relief: relief(), eau: P.eau, ext: P.ext, terrasses: P.terrasses, berges: { niveau: 2.7, part: 0.82, iles: P.iles } }); lotir(P, t); return t; },
  motif: () => motifCampagne(),
  peindre,
  construire,
  figures: (mobile) => ({ atlas: makeFigureAtlasLutece(mobile ? 0.5 : 1), outfit: outfitLutece, density: 0.4 }),      // quelques milliers d'habitants : des rues moins pleines qu'à Paris
  lumieres: ['facade', 'rdc'],
  bilan: (app) => `${app.stats.bati} maisons évoquées, ${app.plan250.ponts.length} ponts, ${app.stats.tombeaux} tombeaux, ${app.stats.tris} triangles, ${app.treeCount} arbres, ${app.people.total} passants possibles`,
};
