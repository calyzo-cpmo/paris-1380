import { App89 } from './app.js';
import { initUI89 } from './ui.js';

const app = new App89(document.getElementById('scene'));
window.__app = app;
const bar = document.getElementById('load-bar'), label = document.getElementById('load-label');
app.onProgress = (text, frac) => { if (label) label.textContent = text; if (bar) bar.style.width = Math.round(frac * 100) + '%'; };
app.start().then(() => {
  initUI89(app);
  window.__ready = true;
}).catch((e) => {
  console.error(e);
  window.__failed = String(e && e.stack || e);
  if (label) label.textContent = 'Le rendu 3D n’a pas pu démarrer : ' + (e && e.message || e);
});
