import { App89 } from '../p1789/app.js';
import { initUI89 } from '../p1789/ui.js';
import { bootEmbed, tell } from '../embed.js';
import { MONDE_LUTECE } from './monde.js';
import { CATS, makePlaces } from './places.js';
import { CREDIT, CREDIT_RELIEF } from './data.js';

bootEmbed('lutece');                                 // s'annonce à la page d'accueil, si elle héberge cette maquette

// Ce que l'interface doit savoir de cette ville : catégories et lieux, sources.
const UI = {
  cats: CATS, places: makePlaces, absent: '',
  sources: [
    ['Rues, rivages et monuments', CREDIT],
    ['Relief', CREDIT_RELIEF + ' — le plus ancien nivellement de Paris : le sol antique était par endroits plusieurs mètres plus bas'],
  ],
};
const app = new App89(document.getElementById('scene'), MONDE_LUTECE);
window.__app = app;
const bar = document.getElementById('load-bar'), label = document.getElementById('load-label');
app.onProgress = (text, frac) => { if (label) label.textContent = text; if (bar) bar.style.width = Math.round(frac * 100) + '%'; tell({ t: 'progress', label: text, frac }); };
app.start().then(() => {
  initUI89(app, UI);
  window.__ready = true;
  tell({ t: 'ready' });
}).catch((e) => {
  console.error(e);
  window.__failed = String(e && e.stack || e);
  tell({ t: 'failed', message: String(e && e.message || e) });
  if (label) label.textContent = 'Le rendu 3D n’a pas pu démarrer : ' + (e && e.message || e);
});
