// Le montage de l'Exposition de 1900, du 1er janvier 1897 au 19 juillet 1900. Un curseur montre la ville à la date
// choisie, comme celui de la page « Paris 1889 » montre le chantier de la tour (src/p1889/tour.js).
//
// Ce qui change entre ces deux dates — palais démolis, palais et pavillons montés, gares neuves, pont Alexandre-III —
// est bâti à part, un « ouvrage » à la fois, dans ses propres maillages. Une cote de montage le coupe à la hauteur
// atteinte à la date : les matières, clonées de celles de la ville, rejettent ce qui dépasse. La cote monte pendant le
// chantier, descend pendant la démolition. Les emprises (on ne marche pas à travers un mur), les tabliers des ponts et
// les étiquettes suivent la même date. Les dates sont dans DATES ; d'un jalon à l'autre, la cote est interpolée.
// Le reste de la ville est celui de l'été 1900 : les données ne datent pas les maisons au mois près.
import * as THREE from 'three';
import { Builder } from '../builder.js';
import { pointInPoly } from '../geom.js';
import { couper, JOUR, DATE } from '../p1889/tour.js';
import { bati, HIST } from '../p1889/data.js';
import { maison } from '../p1889/bati.js';

export { JOUR, DATE };
export const DEBUT = JOUR(1897, 1, 1), OUVERTURE = JOUR(1900, 4, 14), FIN = JOUR(1900, 7, 19);
const J = JOUR;

// Dates de chaque ouvrage, en jours depuis le 1er janvier 1887 : monte [début, fin] du chantier, demoli [début, fin]
// de la démolition. Sauf mention, elles viennent du rapport général de Picard (1902) : t. I pour les démolitions, le
// pont Alexandre-III et les passerelles, t. II pour le Grand et le Petit Palais, l'Esplanade, la rive droite et la
// porte, t. III pour le Champ-de-Mars et la tour, t. VI pour la plate-forme mobile, l'ouverture et le métro. Quand une
// adjudication est seule datée, la démolition part du mois suivant. « Convention » : aucune date trouvée ; la
// fourchette est celle des pavillons voisins, et le panneau « Sources » le dit.
export const DATES = {
  Industrie: { demoli: [J(1897, 2, 5), J(1897, 10, 15)] },                // ordre du 5 février, travaux finis le 15 octobre
  IndustrieNord: { demoli: [J(1899, 11, 1), J(1900, 2, 1)] },             // porche et pavillon nord-ouest, enlevés après octobre 1899 (fin : convention)
  DomeCentral1889: { demoli: [J(1897, 5, 1), J(1897, 12, 31)] },          // adjugé fin avril 1897, achevé en décembre
  Galerie30m: { demoli: [J(1898, 1, 1), J(1898, 4, 30)] },                // adjugée en décembre 1897, finie fin avril 1898
  ArtsLiberaux1889: { demoli: [J(1897, 8, 1), J(1898, 4, 30)] },          // adjugé fin juillet 1897, fini fin avril 1898
  BeauxArts1889: { demoli: [J(1897, 10, 1), J(1898, 5, 31)] },            // marché de septembre 1897, fini fin mai 1898
  GareChampDeMars: { demoli: [J(1897, 7, 1), J(1897, 12, 31)] },          // démontée au second semestre 1897 (sources secondaires)
  EmbarcadereLyon: { demoli: [J(1897, 7, 1), J(1899, 6, 30)] },           // convention : remplacé pendant le chantier de Toudoire
  GareLyon: { monte: [J(1895, 7, 1), J(1900, 4, 14)] },                   // commencée en 1895 ; en service pour l'Exposition, inaugurée le 6 avril 1901
  GareOrsay: { monte: [J(1898, 4, 1), J(1900, 5, 28)] },                  // printemps 1898 ; ouverte aux voyageurs le 28 mai 1900 (sources secondaires)
  GareInvalides: { monte: [J(1897, 9, 1), J(1900, 4, 12)] },              // utilité publique le 14 juin 1897 (début : convention) ; inaugurée le 12 avril 1900
  GrandPalais: { monte: [J(1897, 4, 1), J(1900, 3, 31)] },                // fondations dès avril 1897 ; maçonnerie et ferronnerie jusqu'en mars 1900
  PetitPalais: { monte: [J(1897, 10, 15), J(1898, 12, 31)] },             // commencé le 15 octobre 1897, gros œuvre fini en 1898
  AlexandreIII: { monte: [J(1897, 4, 13), J(1899, 12, 26)] },             // travaux sur place le 13 avril 1897 ; épreuves du 11 au 26 décembre 1899
  PylonesAlexandre: { monte: [J(1899, 12, 26), J(1900, 4, 14)] },         // la décoration, trois mois et demi, finie pour l'ouverture
  PalaisChampDeMars: { monte: [J(1898, 6, 1), J(1900, 2, 14)] },          // fondations dès le 1er juin 1898 ; le dernier montage fini le 14 février 1900
  Electricite: { monte: [J(1898, 7, 7), J(1900, 3, 31)] },                // fondations le 7 juillet 1898 ; métal fini le 31 mars 1900
  GrandeRoue: { monte: [J(1898, 9, 1), J(1899, 12, 31)] },                // 1898-1899 (sources secondaires ; mois : convention)
  RueDesNations: { monte: [J(1899, 7, 1), J(1900, 4, 30)] },              // convention : les pays bâtissaient eux-mêmes
  PasserellesNations: { monte: [J(1899, 7, 1), J(1900, 4, 9)] },          // juillet et août 1899, livrées les 7 et 9 avril 1900
  RiveDroite: { monte: [J(1899, 2, 1), J(1900, 4, 14)] },                 // ciment armé adjugé le 30 janvier 1899 ; serres levées d'août 1899 à février 1900
  VieuxParis: { monte: [J(1899, 1, 1), J(1900, 4, 14)] },                 // en chantier en avril 1899 (début : convention)
  Armees: { monte: [J(1899, 9, 1), J(1900, 4, 14)] },                     // montage entrepris en septembre 1899
  Debilly: { monte: [J(1900, 1, 21), J(1900, 4, 14)] },                   // montage en janvier 1900, livrée 84 jours plus tard, à l'ouverture
  Esplanade: { monte: [J(1898, 6, 1), J(1899, 12, 15)] },                 // fondations en juin 1898, montages finis en novembre et décembre 1899
  Colonies: { monte: [J(1899, 7, 1), J(1900, 4, 30)] },                   // convention
  TrottoirRoulant: { monte: [J(1899, 2, 1), J(1900, 4, 14)] },            // ordre d'exécution le 18 janvier 1899
  Porte: { monte: [J(1899, 6, 15), J(1899, 12, 1)] },                     // montage du 15 juin au 1er décembre 1899
  SerresCoursLaReine: { monte: [J(1899, 8, 1), J(1900, 2, 28)] },         // convention : comme les serres de l'Horticulture
  Globe: { monte: [J(1899, 7, 1), J(1900, 5, 31)] },                      // convention ; ouvert « tardivement »
  Optique: { monte: [J(1899, 7, 1), J(1900, 4, 30)] },                    // convention
  Metro: { monte: [J(1900, 5, 1), J(1900, 6, 15)] },                      // ligne livrée le 15 juin 1900 ; les balustrades : convention
};
export const REPEINTE = J(1899, 4, 1);           // la tour repeinte au printemps 1899 (première couche), du brun-rouge au dégradé de jaunes

// Ce que montre le curseur, jalon après jalon.
export const ETAPES = [
  [DEBUT, 'Le palais de l’Industrie et les palais de 1889 sont encore debout'],
  [J(1897, 2, 5), 'Démolition du palais de l’Industrie'],
  [J(1897, 4, 13), 'Chantiers du Grand Palais et du pont Alexandre-III'],
  [J(1897, 5, 1), 'Démolition des palais de 1889 au Champ-de-Mars'],
  [J(1897, 10, 15), 'Le palais de l’Industrie est rasé ; le Petit Palais commence'],
  [J(1898, 6, 1), 'Fondations des palais du Champ-de-Mars et de l’Esplanade'],
  [J(1898, 12, 3), 'Pont Alexandre-III : les premiers arcs sont posés'],
  [REPEINTE, 'La tour est repeinte, du jaune orangé au jaune clair'],
  [J(1899, 6, 15), 'Montage de la porte monumentale ; les pavillons s’élèvent'],
  [J(1899, 12, 11), 'Épreuves du pont Alexandre-III'],
  [OUVERTURE, 'Ouverture de l’Exposition universelle'],
  [J(1900, 5, 1), 'Inauguration du Grand Palais'],
  [J(1900, 5, 28), 'La gare d’Orsay reçoit ses premiers voyageurs'],
  [FIN, 'Ouverture de la ligne 1 du métropolitain'],
];

// Matières d'un ouvrage : celles de la ville, clonées et coupées à sa cote de montage ; 'mur' et 'verre' sont celles
// des palais de l'Exposition (src/p1889/expo.js, ensemble). Les fenêtres s'éclairent la nuit comme celles de la ville.
const LUMIERES = new Set(['facade', 'rdc', 'comble']), CALQUE = new Set(['facade', 'rdc', 'comble', 'roof', 'ardoise', 'plain', 'nef']);
function matiere(app, nom, uH) {
  const m = nom === 'mur' ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide })
    : nom === 'verre' ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.3, side: THREE.DoubleSide })
      : (app.materials[nom] || app.materials.plain).clone();
  if (LUMIERES.has(nom)) app.on('hour', () => { m.emissiveIntensity = (1 - app.sky.day) * 1.5; });      // même règle que src/p1789/app.js
  return couper(m, uH);
}
const reserve = (V, x, z) => V.reserves.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1 && pointInPoly(x, z, r.ring));

// La date du montage : remplace celle du chantier de la tour (la tour est achevée depuis 1889). Les ouvrages s'y
// abonnent (V.chantier.suivre) ; V.montage donne aux modules communs (gares, ponts, palais) de quoi dater leurs ouvrages.
export function installer(app) {
  const V = app.v89, C = V.chantier;
  C.jour = FIN; V.ecartes = new Set();
  V.montage = { quand: (cle) => DATES[cle] || null, ouvrage: (q, f) => ouvrage(app, q, f) };
  app.setChantier = (j) => {
    j = Number.isFinite(+j) ? Math.max(DEBUT, Math.min(FIN, Math.round(+j))) : FIN; C.jour = j;          // une date illisible ramène à l'été 1900
    for (const f of C.suivre) f(j);
    app.shadowState.hour = -1;
    app.emit('chantier', j);
  };
  // la tour, repeinte en 1899 : avant, une teinte brun-rouge de convention, posée sur le dégradé de 1899 par la couleur
  // des matières (la teinte d'alors n'est pas documentée ici)
  const T = C.tour || [], BRUN = new THREE.Color(0.5, 0.36, 0.42), BLANC = new THREE.Color(1, 1, 1);
  C.suivre.push((j) => { const c = j < REPEINTE ? BRUN : BLANC; for (const m of T) m.material.color.copy(c); });
}

// Un ouvrage : fn(B) le bâtit dans B, son propre constructeur, comme il le ferait dans celui de la ville. q : { monte,
// demoli } (voir DATES) ; q.y0, q.h : cote de départ et hauteur de la coupe, sinon celles de ce qui a été bâti. Ce qu'il
// ajoute aux emprises, aux tabliers et aux monuments suit sa date. Les palais (src/p1889/expo.js, ensemble) qui se
// bâtissent pendant fn vont dans B (V.ouvrage).
export function ouvrage(app, q, fn) {
  const V = app.v89, M = app.monuments, B = new Builder(1e7), uH = { value: 1e4 }, nf = app.foot.length, avant = new Set(Object.keys(M)), tabliers = [];
  const deckSet = app.deckSet, prev = V.ouvrage;
  app.deckSet = (x, z, y) => tabliers.push([app.deckKey(x, z), y]);                 // le tablier est posé quand l'ouvrage est fini
  V.ouvrage = B;
  try { fn(B); } finally { V.ouvrage = prev; app.deckSet = deckSet; }
  const noms = new Set(); let y0 = 1e9, y1 = -1e9;
  for (const b of B.batches.values()) { if (!b.n) continue; noms.add(b.mat); for (let i = 1; i < b.n * 3; i += 3) { const y = b.pos[i]; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (q.y0 != null) y0 = q.y0; if (q.h != null) y1 = y0 + q.h;
  const mats = {}; for (const n of noms) mats[n] = matiere(app, n, uH);
  if (B.calque && app.statuts) for (const n of noms) if (CALQUE.has(n)) app.statuts.greffer(mats[n]);      // bâti des données : le calque « origine du bâti » le teinte (src/p1889/statuts.js)
  const ombre = couper(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uH);
  const meshes = noms.size ? B.finish(app.scene, mats) : [];
  for (const m of meshes) m.customDepthMaterial = ombre;
  V.mobiles.push(...meshes);
  const m0 = q.monte ? q.monte[0] : -Infinity, m1 = q.monte ? q.monte[1] : -Infinity, d0 = q.demoli ? q.demoli[0] : Infinity, d1 = q.demoli ? q.demoli[1] : Infinity;
  for (const k of Object.keys(M)) if (!avant.has(k) && M[k] && !M[k].quand) M[k].quand = [m0, d1];
  const pieds = app.foot.slice(nf);
  // part de l'ouvrage debout à la date j : 0 avant le chantier ou après la démolition, 1 entre les deux
  const part = (j) => (j < m0 || j >= d1 ? 0 : j < m1 ? (j - m0) / (m1 - m0) : j > d0 ? 1 - (j - d0) / (d1 - d0) : 1);
  let pose = null;
  const suivre = (j) => {
    const k = part(j), vu = k > 0;
    for (const m of meshes) m.visible = vu;
    uH.value = k >= 1 ? 1e4 : y0 + k * (y1 - y0 + 0.2);
    for (const f of pieds) f.absent = !vu;
    const fini = k >= 1;
    if (fini !== pose) { for (const [c, y] of tabliers) if (fini) app.deck.set(c, y); else app.deck.delete(c); pose = fini; }
  };
  V.chantier.suivre.push(suivre); suivre(V.chantier.jour);
  return { meshes, part, y0, y1 };
}

// Les grands édifices que l'APUR ne date pas et que l'extraction date d'après leur histoire (Grand et Petit Palais,
// gares d'Orsay, des Invalides et de Lyon : data.bati.hist) : leurs bâtiments sont écartés de la ville et bâtis dans
// l'ouvrage en cours, sauf ceux qu'un édifice modelé a déjà réservés (le grand hall de la gare de Lyon). Ils restent
// « réels » pour le calque « origine du bâti ».
export function batirHistoire(app, B, nom) {
  const V = app.v89, L = bati(); let n = 0;
  B.calque = true;
  for (const i of HIST[nom] || []) {
    const e = L[i], r = e.rings[0]; V.ecartes.add(i);
    let cx = 0, cz = 0; for (const p of r) { cx += p[0]; cz += p[1]; } cx /= r.length; cz /= r.length;
    if (reserve(V, cx, cz)) continue;
    maison(app, B, e, i, false); if (app.statuts) app.statuts.poser(e); n++;
  }
  return n;
}
