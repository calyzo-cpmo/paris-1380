// Ce qui tient la place de l'Exposition de 1889 dans la page « Paris 1937 » : à l'assemblage, tout import de
// './expo.js' depuis src/p1889/ mène ici (tools/build.mjs, surcouche). La tour, peinte en « jaune brun » ; le
// Champ-de-Mars, devenu le jardin de Jean-Camille Formigé (1908-1928) et loti sur ses bords ; ce que l'Exposition de 1900
// a laissé (verrière du Grand Palais, dôme du Petit Palais, pylônes du pont Alexandre-III, repris de src/p1900/palais.js) ;
// les monuments, les édifices et les gares de la ville ; les grands édifices disparus depuis 1937 (src/p1937/disparus.js).
// Le palais du Trocadéro a fait place, en 1937, au palais de Chaillot, que les données donnent entier.
import { EXPO, expoXZ } from '../p1889/data.js';
import { batirTour } from '../p1889/tour.js';
import { batirMonuments } from '../p1889/monuments.js';
import { batirGares } from '../p1889/gares.js';
import { batirEdifices } from '../p1889/edifices.js';
import { fill } from '../p1789/outils.js';
import { grandPalais, petitPalais, pylones } from '../p1900/palais.js';
import { batirDisparus } from './disparus.js';

// Repère du Champ-de-Mars : u de la tour vers l'École militaire, v en travers, centré entre les deux avenues.
const Q = (u, v) => expoXZ(u, v + EXPO.vc);
const rect = (u0, u1, v0, v1) => [[Q(u0, v0), Q(u1, v0), Q(u1, v1), Q(u0, v1)]];
// Le jardin de Formigé : les pelouses du grand parterre, de la tour à l'École militaire, de part et d'autre d'une allée ;
// au pied de la tour, des jardins à l'anglaise et leurs pièces d'eau ; des allées plantées sur les bords. Le dessin
// est une évocation d'après le parti du jardin d'aujourd'hui, qui est le sien.
const PARTERRE = [[150, 820, 8, 52], [150, 820, -52, -8]];
const ANGLAIS = [[60, 300, 82, 200], [60, 300, -200, -82]];
const BOSQUETS = [[330, 820, 82, 190], [330, 820, -190, -82]];
export function peindreExpo(x, Tr) {
  fill(x, Tr, [rect(EXPO.u0 + 160, EXPO.u1, EXPO.v0 - EXPO.vc, EXPO.v1 - EXPO.vc)], '#cfc4a6');
  for (const r of [...PARTERRE, ...ANGLAIS, ...BOSQUETS]) fill(x, Tr, [rect(...r)], '#8fae6c');
  for (const [u, v, r] of [[140, 150, 14], [210, -140, 12]]) { const c = Q(u, v); x.fillStyle = '#6f95a8'; x.beginPath(); x.arc(Tr.x(c[0]), Tr.y(c[1]), r * Tr.s, 0, 7); x.fill(); }
}
export const ESPLANADES = () => [rect(EXPO.u0 + 160, EXPO.u1, EXPO.v0 - EXPO.vc, EXPO.v1 - EXPO.vc)];
export function jardinsExpo(a) {
  for (const r of ANGLAIS) a.gardens.push({ ring: rect(...r)[0], dens: 0.45 });
  for (const r of BOSQUETS) a.gardens.push({ ring: rect(...r)[0], dens: 0.35 });
  for (const s of [-1, 1]) a.gardens.push({ ring: rect(150, 820, s > 0 ? 58 : -66, s > 0 ? 66 : -58)[0], dens: 0.7 });          // alignements du parterre
}

export async function batirExpo(app, B) {
  const T = app.terrain, V = app.v89, M = app.monuments;
  V.mobiles = [];
  batirTour(app);                                  // achevée, peinte en jaune brun (src/p1889/tour.js)
  batirMonuments(app, B);
  batirEdifices(app, B);
  batirGares(app, B);
  grandPalais(app); petitPalais(app, B); pylones(app, B);
  // les gares d'Orsay et des Invalides (1900) : leurs bâtiments sont dans les données ; on les nomme
  for (const [cle, x, z, h] of [['GareOrsay', -1696, -791, 30], ['GareInvalides', -2581, -1011, 16]]) M[cle] = { x, z, top: T.height(x, z) + h + 10 };
  batirDisparus(app, B);

  const L = (V.lieux = V.lieux || []);
  const c = Q(480, 0), ch = expoXZ(-600, 0);
  L.unshift(
    ['Tour Eiffel', 'expo', 'La tour a quarante-huit ans. Sauvée en 1909 par la télégraphie sans fil, elle porte depuis 1925 l’émetteur de Radio-Tour-Eiffel. De 1925 à 1934, les lettres lumineuses de Citroën couraient sur ses quatre faces. Sa couleur, depuis 1907, est le « jaune brun ». À l’été 1937, elle est le pivot de l’Exposition internationale, qui s’étend des jardins du Trocadéro au Champ-de-Mars et sur les deux rives de la Seine. Sa forme est une évocation à partir de ses cotes.', M.Tour, 1],
    ['Champ-de-Mars', 'expo', 'La Galerie des machines a été démolie en 1910 ; le terrain, rendu à la Ville, a été loti sur ses bords et changé en jardin par Jean-Camille Formigé, de 1908 à 1928 : un grand parterre de la tour à l’École militaire, des jardins à l’anglaise et leurs pièces d’eau au pied de la tour. Le dessin du jardin est une évocation.', { x: c[0], z: c[1], top: T.height(c[0], c[1]) + 30 }],
    ['Palais de Chaillot', 'expo', 'Bâti pour l’Exposition de 1937 par Carlu, Boileau et Azéma sur les fondations du palais du Trocadéro de 1878, dont il garde les ailes courbes : la rotonde a disparu, laissant entre les deux pavillons un vaste parvis ouvert sur la tour. Son volume vient des données.', { x: ch[0], z: ch[1], top: T.height(ch[0], ch[1]) + 45 }, 1],
    ['Grand Palais', 'expo', 'Bâti pour l’Exposition de 1900, à la place du palais de l’Industrie : une nef de 200 mètres sous une verrière de fer, une coupole à 45 mètres. On y tient les Salons, le Salon de l’automobile et le Salon de l’aéronautique. Les corps de pierre viennent des données ; la verrière et la coupole sont une évocation.', M.GrandPalais, 1],
    ['Petit Palais', 'expo', 'Le palais de Charles Girault, bâti pour l’Exposition de 1900, est devenu le musée des Beaux-Arts de la Ville de Paris. Son volume vient des données ; le dôme de l’entrée est une évocation.', M.PetitPalais],
    ['Pont Alexandre-III', 'expo', 'Une seule arche d’acier de 107 mètres entre les Invalides et les deux palais, inaugurée avec l’Exposition de 1900 ; aux quatre coins, des pylônes de 17 mètres portent des Renommées dorées. Les pylônes sont une évocation.', M.AlexandreIII, 1],
  );
}
