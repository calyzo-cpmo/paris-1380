// Page « Paris 1937 » : le moteur de la page « Paris 1889 » (src/p1889/), sur la ville recomposée à la date de l'été 1937
// (data/paris1937.json, tools/extract_1889.py 1937). Ce dossier ne contient que ce qui change : ce qui remplace
// l'Exposition de 1889 (expo.js — la tour, le jardin du Champ-de-Mars, les grands édifices disparus depuis, que
// disparus.js modèle), les lieux et la visite guidée. Pas de curseur de date : la ville est celle de l'été 1937.
import { App89 } from '../p1789/app.js';
import { initUI89 } from '../p1789/ui.js';
import { bootEmbed, tell } from '../embed.js';
import { MONDE_1889 } from '../p1889/monde.js';
import { CREDITS, COMPTE, FER } from '../p1889/data.js';
import { STATUTS } from '../p1889/statuts.js';
import { CATS, makePlaces } from './places.js';
import { PARCOURS } from './parcours.js';
import { SOURCES_DISPARUS } from './disparus.js';

bootEmbed('1937');                                   // s'annonce à la page d'accueil, si elle héberge cette maquette

const n = (v) => v.toLocaleString('fr-FR');
const UI = {
  parcours: PARCOURS,
  cats: CATS, places: makePlaces, absent: '',
  calque: { legende: STATUTS, set: (on) => app.statuts.set(on) },
  sources: [
    ['Bâtiments encore debout', `${CREDITS.bati}. ${n(COMPTE.R)} bâtiments datés de 1937 ou d’avant — ou de la période 1851-1914, tout entière antérieure — sont à leur place, avec leur emprise et leur hauteur d’aujourd’hui ; ${n(COMPTE.P)} autres, de la période 1915-1939 sans année connue, sont tenus pour probables.`],
    ['Bâtiments disparus', `${n(COMPTE.E + COMPTE.G)} maisons sont évoquées, sur l’emprise actuelle là où le quartier était bâti, ou le long des rues de 1937 — serrées comme au centre dans les îlots refaits d’un bloc depuis, où la photographie de 1949 montre un faubourg dense : aucune base ne décrit le bâti de 1937 maison par maison. ${n(COMPTE.V)} halles, magasins et ateliers figurent les grands ensembles disparus. ${SOURCES_DISPARUS}`],
    ['L’Exposition de 1937', 'Trois plans à l’échelle fixent les terrains et les grands partis. Le plan directeur de l’Exposition (Services d’architecture et des promenades, R. Martzloff, Ch. Letrosne, J. Gréber et É. Crevel, août 1935, au 1:2 000 ; musée Carnavalet, Paris Musées, licence CC0), posé sur la maquette à 3 mètres près en médiane : la limite du Champ-de-Mars à l’avenue Joseph-Bouvard et la place du palais de la Lumière, les ailes et les galeries du parterre, les deux bandes bâties du quai d’Orsay, le Centre des métiers, l’île aux Cygnes bâtie d’un bout à l’autre, les deux palais de l’Esplanade, les concessions du Cours-la-Reine. Le plan des emplacements concédés (1935, au 1:5 000 ; Bibliothèque nationale de France, Wikimedia Commons) confirme ces limites. Le plan du Centre régional dressé le 14 avril 1937 (au 1:500 ; Bibliothèque nationale de France, Wikimedia Commons) donne les emprises de ses vingt-cinq pavillons. Le plan directeur précède l’Exposition de deux ans : les pavillons étrangers, attribués en 1936, n’y sont pas. Leur ordre suit le plan général de l’Exposition (R. Martzloff et J. Gréber ; Wikimedia Commons) et la légende de son encart, qui est une vue cavalière, comme le plan officiel de G. Peltier (3 mars 1937, Bibliothèque nationale de France ; Wikimedia Commons) : dans les jardins du Trocadéro et ceux du Champ-de-Mars, sur l’île, ils sont posés à la main. Les cotes publiées — pavillons de l’URSS et de l’Allemagne, palais de l’Air, Yachting, Publicité, mât de la porte d’honneur, passerelle et porte monumentale de l’Alma — viennent de L’Architecture d’aujourd’hui, août et septembre 1937 ; le pavillon pontifical, de sa notice. Les autres emprises, les hauteurs et les silhouettes sont une évocation.'],
    ['Îlots, rues et noms', `${CREDITS.ilots}. ${CREDITS.rues}.`],
    ['Seine, canaux, jardins', `${CREDITS.eau}. ${CREDITS.parcs}.`],
    ['Relief', CREDITS.relief],
    ['Voies ferrées', `${CREDITS.fer}. ${n(Math.round(FER.a))} km de voies d’aujourd’hui sont gardés, sur les emprises de 1937 ; ${n(Math.round(FER.r + FER.e))} km sont restitués ou évoqués, là où la ligne a disparu.`],
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
