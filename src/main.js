import { App } from './app.js';
import { initUI } from './ui.js';
import { bootEmbed, tell } from './embed.js';

bootEmbed('1380');                                   // s'annonce à la page d'accueil, si elle héberge cette maquette

const app = new App(document.getElementById('scene'));
window.__app = app;
const bar = document.getElementById('load-bar'), label = document.getElementById('load-label');
app.onProgress = (text, frac) => { if (label) label.textContent = text; if (bar) bar.style.width = Math.round(frac * 100) + '%'; tell({ t: 'progress', label: text, frac }); };
app.start().then(() => {
  initUI(app);        // c'est l'interface qui lève le rideau : accueil, ou vue demandée par un lien partagé
  window.__ready = true;
  tell({ t: 'ready' });
}).catch((e) => {
  console.error(e);
  window.__failed = String(e && e.stack || e);
  tell({ t: 'failed', message: String(e && e.message || e) });
  if (label) label.textContent = 'Le rendu 3D n’a pas pu démarrer : ' + (e && e.message || e);
});
