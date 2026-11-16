// Lieux de la page « Paris 1889 » : la tour, l'Exposition, les monuments et les quartiers.
export const CATS = { expo: ['Exposition universelle', '#e0a23a'], monument: ['Monuments', '#c7a3f5'], quartier: ['Quartiers et collines', '#9ccc65'], eau: ['Seine et canaux', '#7ec4ff'], enceinte: ['Enceinte et gares', '#f08a6a'] };
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function makePlaces(app) {
  const T = app.terrain, M = app.monuments, out = [];
  // nom, catégorie, notice, position { x, z, top } ou [x, z], rang (1 : toujours nommé)
  const lieu = (name, cat, note, pos, rang = 2) => {
    if (!pos) return; const x = pos.x ?? pos[0], z = pos.z ?? pos[1];
    out.push({ id: slug(name), name, cat, catName: CATS[cat][0], color: CATS[cat][1], note, absent: false, x, z, y: pos.top != null ? pos.top : T.height(x, z) + 30, rang });
  };
  for (const l of app.v89.lieux || []) lieu(...l);
  const V = 'L’édifice est rendu par son volume réel — emprise et hauteur —, sans le détail de son élévation.';
  const E = 'Sa silhouette est une évocation, posée sur l’emprise réelle de l’édifice.';
  for (const p of app.v89.ponts) if (/I.na/i.test(p.nom)) { lieu('Pont d’Iéna', 'eau', 'Le pont de 1814 relie le Trocadéro au Champ-de-Mars : c’est l’entrée de l’Exposition pour qui vient de la rive droite.', { x: p.x, z: p.z, top: p.top + 8 }); break; }
  lieu('Champ-de-Mars', 'expo', 'L’ancien terrain de manœuvres de l’École militaire accueille l’Exposition universelle du 6 mai au 31 octobre 1889. Il va alors de l’avenue de La Bourdonnais à l’avenue de Suffren : ses bords ne seront lotis qu’après 1900.', [-3800, -370]);
  lieu('École militaire', 'monument', 'L’école de Gabriel (1751-1780) ferme le Champ-de-Mars au sud-est. ' + V, [-3352.9, 40]);
  lieu('Dôme des Invalides', 'monument', 'L’église du Dôme, par Jules Hardouin-Mansart : 107 mètres au sommet de la flèche, la coupole redorée en 1869. Autour, l’hôtel de Louis XIV ; l’esplanade porte en 1889 les pavillons des colonies. ' + E, M.Invalides, 1);
  lieu('Arc de triomphe', 'monument', 'Achevé en 1836 au sommet de la colline de l’Étoile, d’où rayonnent les douze avenues tracées sous le Second Empire : 50 mètres de haut, 45 de large, une arche de 29 mètres sous clef. ' + E, M.Arc, 1);
  lieu('Palais de l’Industrie', 'monument', 'Bâti pour l’Exposition de 1855 le long des Champs-Élysées : 250 mètres de long, une nef vitrée de 35 mètres. Il sert en 1889 aux Salons et aux concours ; il sera démoli à partir de 1897 pour ouvrir l’avenue qui mène au pont Alexandre-III, entre le Grand et le Petit Palais. Son emplacement est déduit des axes de l’avenue et des Invalides ; sa forme est une évocation.', M.Industrie, 1);
  lieu('Opéra', 'monument', 'L’Opéra de Charles Garnier, inauguré en 1875, au bout de l’avenue percée pour lui : la coupole de cuivre de la salle, puis la haute cage de scène. ' + E, M.Opera, 1);
  lieu('Louvre', 'monument', 'Le palais est complet depuis 1857 ; les Tuileries, incendiées en 1871, ont été rasées en 1883 : la cour s’ouvre désormais sur le jardin. ' + V, [-1033, -892]);
  lieu('Halles centrales', 'monument', 'Le « ventre de Paris » : dix pavillons de fonte, de brique et de verre élevés par Victor Baltard à partir de 1854, reliés par des rues couvertes. Les deux derniers ne seront bâtis qu’en 1936 ; tout sera démoli en 1971. Chaque pavillon occupe son îlot de la base de 1900 ; l’élévation est une évocation.', M.Halles, 1);
  lieu('Notre-Dame', 'monument', 'La cathédrale restaurée par Viollet-le-Duc : les deux tours de 69 mètres, la flèche de 96 mètres élevée en 1859, et le parvis dégagé sous le Second Empire. ' + E, M.NotreDame, 1);
  lieu('Panthéon', 'monument', 'Rendu au culte des grands hommes en 1885, pour les funérailles de Victor Hugo. Son dôme culmine à 83 mètres au sommet de la montagne Sainte-Geneviève. ' + E, M.Pantheon, 1);
  lieu('Saint-Sulpice', 'monument', 'Ses deux tours inégales, de 73 et 68 mètres : la tour sud n’a jamais été achevée. ' + E, M.Sulpice);
  lieu('Institut de France', 'monument', 'L’ancien collège des Quatre-Nations et sa coupole, face au Louvre. ' + E, M.Institut);
  lieu('Saint-Augustin', 'monument', 'L’église de Baltard (1860-1871), à charpente de fer, sous un dôme de 80 mètres. ' + E, M.Augustin);
  lieu('La Trinité', 'monument', 'L’église de Ballu (1867) et son clocher de 65 mètres, au bout de la Chaussée-d’Antin. ' + E, M.Trinite);
  lieu('Colonne Vendôme', 'monument', 'Abattue pendant la Commune en 1871, relevée en 1875.', M.Vendome);
  lieu('Place de la Concorde', 'quartier', 'L’obélisque de Louxor, dressé en 1836 au centre de la place.', M.Obelisque);
  lieu('Sacré-Cœur, en chantier', 'monument', 'La basilique de Montmartre est en construction depuis 1875 : en 1889 les murs de la nef montent dans leurs échafaudages ; le dôme ne sera achevé qu’en 1899, le campanile en 1912. L’état du chantier est une évocation.', M.SacreCoeur, 1);
  lieu('Buttes-Chaumont', 'quartier', 'D’anciennes carrières changées en parc par Alphand pour l’Exposition de 1867.', [2375, -3055]);
  lieu('Bassin de la Villette', 'eau', 'Le port du canal de l’Ourcq, entouré d’entrepôts ; au nord, les abattoirs et le marché aux bestiaux.', [1730, -3562]);
  lieu('Père-Lachaise', 'quartier', 'Le plus grand cimetière de Paris, sur les pentes de Ménilmontant.', [3155, -913]);
  lieu('Place de la Bastille', 'quartier', 'La colonne de Juillet marque l’emplacement de la forteresse, rasée un siècle plus tôt : l’Exposition fête le centenaire de 1789.', M.Juillet);
  // gares : chacune est posée au bout de ses voies (src/p1889/gares.js)
  const G = ' Elle est placée en tête de ses voies ; son élévation est une évocation.';
  lieu('Gare Saint-Lazare', 'enceinte', 'La plus ancienne gare de Paris (1837) et la plus fréquentée, rebâtie par Juste Lisch de 1885 à 1889 pour l’Exposition : une longue façade sur la rue Saint-Lazare et, devant elle, l’hôtel Terminus, ouvert en mai 1889 entre la cour de Rome et la cour du Havre.' + G, M.GareLazare, 1);
  lieu('Gare du Nord', 'enceinte', 'La gare de Jacques Hittorff, achevée en 1865 : une façade de 180 mètres, un grand pignon vitré entre deux pavillons, une halle de 72 mètres de portée.' + G, M.GareNord, 1);
  lieu('Gare de l’Est', 'enceinte', 'L’embarcadère de Strasbourg (1849), au bout du boulevard du même nom. En 1889 la gare n’a que la moitié ouest de celle d’aujourd’hui ; elle sera doublée en 1931.' + G, M.GareEst);
  lieu('Gare de Lyon', 'enceinte', 'L’embarcadère de 1855 : une halle de 220 mètres entre le bâtiment du départ et celui de l’arrivée. La gare actuelle et sa tour de l’horloge le remplaceront pour l’Exposition de 1900. Son emplacement, en tête des voies d’aujourd’hui, et sa forme sont une évocation.', M.GareLyon, 1);
  lieu('Gare d’Orléans', 'enceinte', 'La gare d’Austerlitz, rebâtie de 1862 à 1867 : une halle de 280 mètres de long et de 51 mètres de portée, où l’on fabriqua des ballons pendant le siège de 1870.' + G, M.GareOrleans);
  lieu('Gare Montparnasse', 'enceinte', 'La gare de l’Ouest, rive gauche (1852), face à la rue de Rennes : les voies arrivent à l’étage, au-dessus de la place — c’est de cette façade qu’une locomotive tombera en 1895. Démolie en 1969 ; la gare actuelle est 400 mètres plus au sud. Elle occupe son îlot de 1900, entre la rue de l’Arrivée et la rue du Départ ; sa forme est une évocation.', M.GareMontparnasse, 1);
  lieu('Gare de la Bastille', 'enceinte', 'Tête de la ligne de Vincennes (1859), là où s’élève aujourd’hui l’Opéra Bastille. Les trains partent de l’étage et suivent le viaduc de l’avenue Daumesnil, devenu le viaduc des Arts. Fermée en 1969, démolie en 1984. Son emplacement, le long de la rue de Lyon, et sa forme sont une évocation.', M.GareBastille);
  lieu('Gare de Sceaux', 'enceinte', 'L’embarcadère de 1846, place Denfert-Rochereau : un bâtiment en arc de cercle, qui épousait la boucle où tournaient les trains. La ligne sera prolongée vers le Luxembourg en 1895 ; c’est aujourd’hui la gare Denfert-Rochereau. Sa forme est une évocation.', M.GareSceaux);
  lieu('Gare du Champ-de-Mars', 'expo', 'Bâtie par Juste Lisch pour l’Exposition, en fer, en brique et en faïence, au bout de l’embranchement qui longe la Seine depuis Grenelle. Démontée en 1897, elle a été remontée à Asnières, où elle existe encore. Son emplacement, sur la berge à l’angle de l’avenue de Suffren, et sa forme sont une évocation.', M.GareChampDeMars);
  { const e = (app.v89.fer.echantillon || []).filter((p) => p[3] > 6 && p[4] === 0 && p[0] > 1500 && p[0] < 2600 && p[2] > 300), p = e[Math.floor(e.length / 2)];
    if (p) lieu('Viaduc de la ligne de Vincennes', 'enceinte', 'Un kilomètre et demi d’arches de brique et de pierre le long de l’avenue Daumesnil, de la gare de la Bastille à celle de Reuilly (1859). Il porte aujourd’hui une promenade plantée. Son tracé est évoqué d’après l’avenue ; ses arches sont de convention.', { x: p[0], z: p[2], top: p[1] + 14 }); }
  { const e = (app.v89.fer.echantillon || []).filter((p) => p[3] > 6 && p[0] < -5800), p = e.sort((a, b) => a[0] - b[0])[Math.floor(e.length * 0.8)];
    if (p) lieu('Viaduc d’Auteuil', 'eau', 'Le viaduc du Point-du-Jour (1865) : en bas la route, au-dessus le chemin de fer de Ceinture, sur des arcades ; il se prolonge au milieu du boulevard Exelmans jusqu’à la gare d’Auteuil. Démoli dans les années 1960, il a laissé la place au pont du Garigliano. Son tracé est évoqué d’après le boulevard ; sa forme est de convention.', { x: p[0], z: p[2], top: p[1] + 14 }); }
  lieu('Petite Ceinture', 'enceinte', 'Le chemin de fer qui fait le tour de Paris en dedans des fortifications, achevé en 1869 : trente-deux kilomètres, une trentaine de stations, et les trains de l’Exposition. Les rails d’aujourd’hui sont gardés là où ils subsistent ; ailleurs la ligne est restituée dans l’axe de son emprise ou évoquée le long des rues ; ses souterrains et ses tranchées ne sont pas figurés.', [-218, -4932]);
  lieu('Enceinte de Thiers', 'enceinte', 'Trente-quatre kilomètres de remparts et quatre-vingt-quatorze bastions, bâtis de 1841 à 1844 et jamais attaqués de vive force. Devant le fossé, la « zone » où il est interdit de bâtir en dur. L’enceinte sera démolie à partir de 1919 ; son tracé est celui des boulevards des Maréchaux. Tracé d’après la base « Paris 1900 ».', [-4928, -2758], 1);
  lieu('Bois de Boulogne', 'quartier', 'L’ancienne forêt royale, aménagée en parc à l’anglaise par Alphand sous le Second Empire.', [-6600, -1100]);
  lieu('Grenelle', 'quartier', 'Village annexé en 1860, devenu un quartier d’usines et d’ateliers au pied de l’Exposition. Presque tout y a été rebâti depuis : ses maisons sont évoquées le long des rues de 1900.', [-4300, 420]);
  return out;
}
