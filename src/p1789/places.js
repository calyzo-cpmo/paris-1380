// Repères de Paris en 1789 : catégorie et notice. Les positions viennent de data/paris1789.json (coordonnées
// géographiques projetées dans le repère de la maquette) ; quand l'Atlas de Vasserot nomme l'édifice, on se cale sur lui.
import { RAW } from './data.js';

export const CATS = { pouvoir: ['Palais et pouvoir', '#e0a23a'], eglise: ['Églises et abbayes', '#c7a3f5'], place: ['Places', '#f08a6a'], pont: ['Ponts', '#7ec4ff'], savoir: ['Savoir et soins', '#6fd0a8'], marche: ['Halles et marchés', '#f2c56b'], barriere: ['Portes et barrières', '#ff9a6a'], jardin: ['Jardins', '#9ccc65'] };

// nom : [catégorie, notice, nom dans l'atlas de Vasserot (facultatif), rang (1 : toujours nommé)]
const NOTES = {
  'Notre-Dame': ['eglise', 'La cathédrale. En 1789 son parvis est encore étroit, bordé au sud par les bâtiments de l’Hôtel-Dieu.', 'Notre Dame', 1],
  'Palais de la Cité': ['pouvoir', 'Siège du Parlement de Paris. La façade sur la cour du Mai a été rebâtie après l’incendie de 1776.', null, 1],
  'Hôtel-Dieu': ['savoir', 'Le plus grand hôpital de la ville, à cheval sur le petit bras de la Seine.'],
  'Pont Neuf': ['pont', 'Achevé en 1607, premier pont de Paris sans maisons. La statue d’Henri IV en occupe le terre-plein.', null, 1],
  'Pont au Change': ['pont', 'Les maisons qui le bordaient sont démolies à partir de 1786.'],
  'Pont Notre-Dame': ['pont', 'Ses maisons sont démolies à partir de 1786, comme celles des autres ponts.'],
  'Louvre': ['pouvoir', 'La Cour carrée reste inachevée. Le palais abrite les académies et des logements d’artistes.', null, 1],
  'Tuileries': ['pouvoir', 'Le roi et sa famille y sont installés le 6 octobre 1789, ramenés de Versailles par la foule.', 'Palais des Tuileries, galerie du Louvre', 1],
  'Palais-Royal': ['pouvoir', 'Le duc d’Orléans y a ouvert en 1784 des galeries de boutiques et de cafés. C’est le foyer de l’agitation de juillet 1789.', 'Palais Royal', 1],
  'Place Louis XV': ['place', 'Aménagée d’après les plans de Gabriel à partir de 1755 ; future place de la Concorde.', null, 1],
  'Place Vendôme': ['place', 'Place Louis-le-Grand, ordonnancée par Hardouin-Mansart à partir de 1699.'],
  'Place des Victoires': ['place', 'Place circulaire créée en 1685 autour d’une statue de Louis XIV.'],
  'Place Royale': ['place', 'Inaugurée en 1612 ; future place des Vosges.'],
  'Bastille': ['pouvoir', 'Forteresse et prison d’État, prise le 14 juillet 1789. Sa démolition commence aussitôt.', null, 1],
  'Hôtel de Ville': ['pouvoir', 'Siège de la municipalité, sur la place de Grève.', 'Hôtel de Ville', 1],
  'Grand Châtelet': ['pouvoir', 'Siège de la prévôté de Paris et prison, à la tête du pont au Change.'],
  'Halle au blé': ['marche', 'Halle circulaire de 1767, couverte d’une coupole de charpente en 1783.', 'Halle aux Blés'],
  'Saint-Eustache': ['eglise', 'Grande paroisse des Halles.'],
  'Marché des Innocents': ['marche', 'Le cimetière des Innocents a été fermé en 1780 puis vidé en 1786 ; un marché l’a remplacé, autour de sa fontaine.'],
  'Temple': ['pouvoir', 'Enclos de l’ordre de Malte, dominé par sa grosse tour médiévale.'],
  'Porte Saint-Denis': ['barriere', 'Arc de triomphe de 1672, sur les boulevards qui ont remplacé l’enceinte.'],
  'Porte Saint-Martin': ['barriere', 'Arc de triomphe de 1674.'],
  'Hôpital Saint-Louis': ['savoir', 'Fondé en 1607 pour isoler les malades de la peste.'],
  'Saint-Lazare': ['eglise', 'Maison des Lazaristes, pillée le 13 juillet 1789.'],
  'Invalides': ['pouvoir', 'Hôtel royal bâti de 1671 à 1676, et son dôme. Le matin du 14 juillet 1789, la foule y prend des fusils.', null, 1],
  'École militaire': ['savoir', 'Bâtie par Gabriel à partir de 1751.', null, 1],
  'Champ-de-Mars': ['place', 'Terrain de manœuvres de l’École militaire. La fête de la Fédération s’y tient le 14 juillet 1790.'],
  'Palais-Bourbon': ['pouvoir', 'Hôtel du prince de Condé, face à la place Louis XV.'],
  'Saint-Germain-des-Prés': ['eglise', 'Abbaye bénédictine, avec son enclos.', 'Eglise Saint Germain des Prés'],
  'Saint-Sulpice': ['eglise', 'Façade de Servandoni ; la tour nord a été refaite par Chalgrin à partir de 1777.'],
  'Luxembourg': ['pouvoir', 'Palais bâti pour Marie de Médicis. Il appartient à Monsieur, frère du roi.', null, 1],
  'Théâtre-Français': ['savoir', 'Salle inaugurée en 1782 ; futur Odéon.', 'Odéon'],
  'Sorbonne': ['savoir', 'Collège et chapelle rebâtis pour Richelieu.'],
  'Sainte-Geneviève': ['eglise', 'La nouvelle église de Soufflot, presque achevée. Elle deviendra le Panthéon en 1791.', 'Eglise Sainte Geneviève', 1],
  'Val-de-Grâce': ['eglise', 'Abbaye fondée par Anne d’Autriche ; l’église est achevée en 1667.'],
  'Observatoire': ['savoir', 'Observatoire royal, bâti par Claude Perrault à partir de 1667.'],
  'Jardin du Roi': ['jardin', 'Jardin royal des plantes. Buffon l’a dirigé jusqu’à sa mort, en 1788.'],
  'Salpêtrière': ['savoir', 'Hôpital général pour les femmes.'],
  'Gobelins': ['savoir', 'Manufacture royale de tapisseries, au bord de la Bièvre.'],
  'Arsenal': ['pouvoir', 'Magasins et résidence du grand maître de l’artillerie.'],
  'Hôtel des Monnaies': ['pouvoir', 'Achevé en 1775 sur le quai de Conti.', 'Hôtel des Monnaies'],
  'Collège des Quatre-Nations': ['savoir', 'Fondé par Mazarin ; futur Institut.', 'Palais de l\'Institut'],
  'Pont Royal': ['pont', 'Pont de pierre achevé en 1689.'],
  'Pont Louis XVI': ['pont', 'En construction depuis 1787. Des pierres de la Bastille y seront employées.'],
  'La Madeleine': ['eglise', 'Église en chantier depuis 1764.', 'Eglise de la Madeleine'],
  'Saint-Roch': ['eglise', 'Paroisse de la rue Saint-Honoré.', 'Eglise St Roch'],
  'Saint-Paul-Saint-Louis': ['eglise', 'Ancienne église des Jésuites, rue Saint-Antoine.'],
  'Île Saint-Louis': ['place', 'Lotie au XVIIe siècle sur un plan régulier.'],
  'Folie de Chartres': ['jardin', 'Jardin du duc de Chartres, à Monceau.'],
  'Barrière du Trône': ['barriere', 'Pavillons et colonnes de Ledoux, sur le mur des Fermiers généraux.'],
  'Barrière de l’Étoile': ['barriere', 'Pavillons de Ledoux, au sommet de l’avenue des Champs-Élysées.'],
  'Rotonde de la Villette': ['barriere', 'Barrière Saint-Martin, bâtie par Ledoux.'],
  'Barrière d’Enfer': ['barriere', 'Deux pavillons de Ledoux, sur la route d’Orléans.'],
};

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// landmarks : édifices nommés par l'atlas, tels que posés par la construction ({ nom, x, z, top, area }).
export function makePlaces(app) {
  return RAW.reperes.filter((r) => NOTES[r[2]]).map(([x, z, nom]) => {
    const [cat, note, vass, rang] = NOTES[nom];
    let px = x, pz = z, top = null;
    if (vass) { const l = app.landmarks.filter((m) => m.nom === vass).sort((a, b) => b.area - a.area)[0]; if (l && Math.hypot(l.x - x, l.z - z) < 260) { px = l.x; pz = l.z; top = l.top; } }
    // édifice attendu là où l'atlas ne montre aucun bâtiment : la fiche le dira
    let reel = 0; for (let a = 0; a < 12 && !reel; a++) for (const d of [0, 25, 55, 90]) { const f = app.footAt(px + Math.cos(a * 0.5236) * d, pz + Math.sin(a * 0.5236) * d); if (f && f.reel) { reel = 1; break; } }
    const absent = !reel && ['pouvoir', 'eglise', 'savoir', 'marche'].includes(cat);
    return { id: slug(nom), name: nom, cat, catName: CATS[cat][0], color: CATS[cat][1], note, absent, x: px, z: pz, y: top != null ? top : app.terrain.land(px, pz) + 22, rang: rang || 2 };
  });
}
