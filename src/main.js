import { App } from './app.js';
import { initUI } from './ui.js';

const app = new App(document.getElementById('scene'));
window.__app = app;
const bar = document.getElementById('load-bar'), label = document.getElementById('load-label');
app.onProgress = (text, frac) => { if (label) label.textContent = text; if (bar) bar.style.width = Math.round(frac * 100) + '%'; };
app.start().then(() => {
  initUI(app);        // c'est l'interface qui lève le rideau : accueil, ou vue demandée par un lien partagé
  window.__ready = true;
}).catch((e) => {
  console.error(e);
  window.__failed = String(e && e.stack || e);
  if (label) label.textContent = 'Le rendu 3D n’a pas pu démarrer : ' + (e && e.message || e);
});
