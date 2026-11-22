// Page « Paris 1900 » : le moteur de la page « Paris 1889 » (src/p1889/), sur la ville recomposée à la date de 1900
// (data/paris1900.json, tools/extract_1889.py 1900). Ce dossier ne contient que ce qui change : l'Exposition de 1900
// (expo.js, qui remplace celui de 1889 à l'assemblage — tools/build.mjs), les lieux et la visite guidée.
import { App89 } from '../p1789/app.js';
import { initUI89 } from '../p1789/ui.js';
import { bootEmbed, tell } from '../embed.js';
import { MONDE_1889 } from '../p1889/monde.js';
import { CREDITS, COMPTE, FER } from '../p1889/data.js';
import { STATUTS } from '../p1889/statuts.js';
import { CATS, makePlaces } from './places.js';
import { PARCOURS } from './parcours.js';

bootEmbed('1900');                                   // s'annonce à la page d'accueil, si elle héberge cette maquette

const n = (v) => v.toLocaleString('fr-FR');
const UI = {
  parcours: PARCOURS,
  cats: CATS, places: makePlaces, absent: '',
  calque: { legende: STATUTS, set: (on) => app.statuts.set(on) },
  sources: [
    ['Bâtiments encore debout', `${CREDITS.bati}. ${n(COMPTE.R)} bâtiments datés de 1900 ou d’avant sont à leur place, avec leur emprise et leur hauteur d’aujourd’hui ; ${n(COMPTE.P)} autres, sans année connue ou datés d’une année ronde, sont tenus pour probables d’après leur voisinage.`],
    ['Bâtiments disparus', `${n(COMPTE.V)} bâtiments du centre, remplacés depuis 1900, reprennent l’emprise de l’Atlas de Vasserot (1810-1836). Ailleurs, ${n(COMPTE.E + COMPTE.G)} maisons sont évoquées, sur l’emprise actuelle ou le long des rues de 1900 : aucune base ne décrit le bâti de 1900 maison par maison.`],
    ['Îlots, rues et enceinte', `${CREDITS.ilots}. ${CREDITS.rues} : l’état est celui de l’année même.`],
    ['Seine, canaux, jardins', `${CREDITS.eau}. ${CREDITS.parcs}.`],
    ['Relief', CREDITS.relief],
    ['Voies ferrées', `${CREDITS.fer}. ${n(Math.round(FER.a))} km de voies d’aujourd’hui sont gardés, sur les emprises de 1900 ; ${n(Math.round(FER.r + FER.e))} km sont restitués ou évoqués, là où la ligne a disparu.`],
    ['Exposition de 1900', 'Plan et cotes : A. Picard, Rapport général administratif et technique de l’Exposition universelle internationale de 1900 (1902) ; Revue technique de l’Exposition universelle de 1900 (Conservatoire national des arts et métiers, Cnum). Dates des gares, des palais et du métro : sources historiques publiées.'],
  ],
};
const app = new App89(document.getElementById('scene'), MONDE_1889);
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
