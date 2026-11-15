// Le monde de la page « Paris 1789 », tel que l'application (src/p1789/app.js) le fait vivre : cadre, terrain et quais,
// peinture du sol, construction de la ville, habitants.
import { CADRE, relief, eau } from './data.js';
import { Terrain89, QUAIS } from './terrain.js';
import { buildCity89, paintPlan, makeFieldsTile, ilotClasses, TUILE } from './city.js';
import { planQuais } from './quais.js';
import { makeFigureAtlas89, outfit89 } from './figures.js';

export const CENTRE_RECT = { x: -2700, z: -2500, w: 5000, h: 4200 };   // ville dense : sol peint plus finement

export const MONDE89 = {
  cadre: CADRE, centre: CENTRE_RECT, vue: { x: -350, z: -420, dist: 3600, az: -0.45, el: 0.66 }, tuile: TUILE,
  etapes: ['Lecture des plans de Verniquet et de Vasserot…', 'Le sol de Paris, d’après le nivellement de Girard…', 'Rues, îlots et jardins…'],
  // murs de quai tracés avant de mailler le sol
  terrain: (app) => { const t = new Terrain89({ cadre: CADRE, relief: relief(), eau: eau(), quais: QUAIS }); app.quaiPans = planQuais(t); t.sink(app.quaiPans); app.ilotCls = ilotClasses(); return t; },
  motif: () => makeFieldsTile(),
  peindre: (ctx, T, tile, app) => paintPlan(ctx, T, tile, app.ilotCls, app.terrain.ext, app.quaiPans),
  construire: (app, step) => buildCity89(app, step),
  figures: (mobile) => ({ atlas: makeFigureAtlas89(mobile ? 0.5 : 1), outfit: outfit89 }),
  lumieres: ['facade', 'rdc', 'comble'],                 // matières dont les fenêtres s'éclairent la nuit
  bilan: (app) => `${app.stats.bati} corps de bâtiment, ${app.stats.evoques} évoqués, ${app.stats.tris} triangles, ${app.treeCount} arbres, ${app.people.total} passants possibles`,
};
