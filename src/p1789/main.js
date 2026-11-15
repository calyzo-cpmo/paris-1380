import { App89 } from './app.js';
import { MONDE89 } from './monde.js';
import { initUI89 } from './ui.js';
import { RAW } from './data.js';
import { CATS, makePlaces } from './places.js';
import { bootEmbed, tell } from '../embed.js';

bootEmbed('1789');                                   // s'annonce à la page d'accueil, si elle héberge cette maquette

// Ce que l'interface doit savoir de cette ville : catégories et lieux, sources, mention des édifices non modelés.
const UI = {
  cats: CATS, places: makePlaces, absent: 'L’atlas de Vasserot ne couvre pas cet îlot : l’édifice n’est pas encore modelé.',
  sources: [
    ['Îlots, rues nommées et Seine', 'plan de Verniquet, levé de 1782 à 1790 — © ALPAGE : P. Rouet ; rues © ALPAGE : L. Hermenault'],
    ['Emprise des bâtiments', RAW.bati.credit], ['Mur des Fermiers généraux', RAW.mur.credit],
    ['Enclos nommés : places, jardins, hôpitaux, palais', RAW.enclos.credit], ['Emprise de la Bastille', RAW.bastille.credit],
    ['Relief', RAW.relief.credit], ['Établissements religieux en 1789', RAW.eglises.credit],
  ],
};
const app = new App89(document.getElementById('scene'), MONDE89);
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
