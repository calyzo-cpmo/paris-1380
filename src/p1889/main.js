import { App89 } from '../p1789/app.js';
import { initUI89 } from '../p1789/ui.js';
import { bootEmbed, tell } from '../embed.js';
import { MONDE_1889 } from './monde.js';
import { CATS, makePlaces } from './places.js';
import { CREDITS, COMPTE, FER } from './data.js';
import { DATE, ETAPES, FIN } from './tour.js';

bootEmbed('1889');                                   // s'annonce à la page d'accueil, si elle héberge cette maquette

// Ce que l'interface doit savoir de cette ville : catégories et lieux, sources.
const n = (v) => v.toLocaleString('fr-FR');
const UI = {
  cats: CATS, places: makePlaces, absent: '',
  sources: [
    ['Bâtiments encore debout', `${CREDITS.bati}. ${n(COMPTE.R)} bâtiments datés de 1889 ou d’avant sont à leur place, avec leur emprise et leur hauteur d’aujourd’hui ; ${n(COMPTE.P)} autres, sans année connue, sont tenus pour probables d’après leur voisinage.`],
    ['Bâtiments disparus', `${n(COMPTE.V)} bâtiments du centre, remplacés depuis 1889, reprennent l’emprise de l’Atlas de Vasserot (1810-1836). Ailleurs, ${n(COMPTE.E + COMPTE.G)} maisons sont évoquées, sur l’emprise actuelle ou le long des rues de 1900 : aucune base ne décrit le bâti de 1889 maison par maison.`],
    ['Îlots, rues et enceinte', `${CREDITS.ilots}. ${CREDITS.rues} : l’état est celui de 1900, onze ans après l’Exposition.`],
    ['Seine, canaux, jardins', `${CREDITS.eau}. ${CREDITS.parcs}.`],
    ['Relief', CREDITS.relief],
    ['Voies ferrées', `${CREDITS.fer}. ${n(Math.round(FER.a))} km de voies d’aujourd’hui sont gardés, sur les emprises de 1889 ; ${n(Math.round(FER.r + FER.e))} km sont restitués ou évoqués, là où la ligne a disparu.`],
  ],
};
// Le curseur du chantier : la tour (et les palais) à la date choisie, du 1er janvier 1887 au 6 mai 1889.
function chantier() {
  const sl = document.getElementById('ch-date'), play = document.getElementById('ch-play'), jour = document.getElementById('ch-jour'), note = document.getElementById('ch-note');
  if (!sl) return;
  sl.max = String(FIN);
  const dire = (j) => {
    jour.textContent = DATE(j).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).replace(/^1 /, '1er ');
    let e = ETAPES[0]; for (const x of ETAPES) if (x[0] <= j) e = x;
    const h = app.v89.chantier.hauteur;
    note.textContent = e[1] + (h > 1 && h < 299 ? ` — ${Math.round(h)} m` : '');
  };
  let anim = null;
  const stop = () => { anim = null; play.setAttribute('aria-pressed', 'false'); };
  const poser = (j, deCurseur) => { j = Math.round(j); app.setChantier(j); if (!deCurseur) sl.value = String(j); dire(j); if (deCurseur && (app.paused || app.shot)) app.renderNow(); };      // en lecture, la boucle d'animation redessine
  sl.addEventListener('input', () => { stop(); poser(+sl.value, true); });
  play.addEventListener('click', () => {
    if (anim) { stop(); return; }
    anim = { j: +sl.value >= FIN - 2 ? 0 : +sl.value }; play.setAttribute('aria-pressed', 'true');
  });
  // quarante-cinq secondes pour tout le chantier
  app.on('frame', (dt) => { if (!anim) return; anim.j += (dt * FIN) / 45; if (anim.j >= FIN) { poser(FIN); stop(); } else poser(anim.j); });
  app.chantierUI = { poser, lire: () => +sl.value };
  dire(FIN);
}
const app = new App89(document.getElementById('scene'), MONDE_1889);
window.__app = app;
const bar = document.getElementById('load-bar'), label = document.getElementById('load-label');
app.onProgress = (text, frac) => { if (label) label.textContent = text; if (bar) bar.style.width = Math.round(frac * 100) + '%'; tell({ t: 'progress', label: text, frac }); };
app.start().then(() => {
  initUI89(app, UI);
  chantier();
  window.__ready = true;
  tell({ t: 'ready' });
}).catch((e) => {
  console.error(e);
  window.__failed = String(e && e.stack || e);
  tell({ t: 'failed', message: String(e && e.message || e) });
  if (label) label.textContent = 'Le rendu 3D n’a pas pu démarrer : ' + (e && e.message || e);
});
