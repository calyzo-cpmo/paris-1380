// Lieux de la page « Paris 1937 » : la tour et le Champ-de-Mars, les monuments, les gares, les grands édifices disparus
// depuis, les quartiers. Repris de la page « Paris 1900 » (src/p1900/places.js), mis à la date de l'été 1937.
export const CATS = { expo: ['Tour et Exposition', '#e0a23a'], monument: ['Monuments', '#c7a3f5'], disparu: ['Disparus depuis', '#e2a92e'], quartier: ['Quartiers et collines', '#9ccc65'], eau: ['Seine et canaux', '#7ec4ff'], enceinte: ['Ceinture et gares', '#f08a6a'] };
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function makePlaces(app) {
  const T = app.terrain, M = app.monuments, out = [];
  // nom, catégorie, notice, position { x, z, top } ou [x, z], rang (1 : toujours nommé)
  const lieu = (name, cat, note, pos, rang = 2) => {
    if (!pos || out.some((p) => p.name === name)) return; const x = pos.x ?? pos[0], z = pos.z ?? pos[1];
    out.push({ id: slug(name), name, cat, catName: CATS[cat][0], color: CATS[cat][1], note, absent: false, x, z, y: pos.top != null ? pos.top : T.height(x, z) + 30, rang });
  };
  for (const l of app.v89.lieux || []) lieu(...l);
  const V = 'L’édifice est rendu par son volume réel — emprise et hauteur —, sans le détail de son élévation.';
  const E = 'Sa silhouette est une évocation, posée sur l’emprise réelle de l’édifice.';
  for (const p of app.v89.ponts) if (/I.na/i.test(p.nom)) { lieu('Pont d’Iéna', 'eau', 'Le pont de 1814 relie le palais de Chaillot au Champ-de-Mars. Élargi pour l’Exposition de 1937, il en est l’axe : à ses deux têtes, sur la rive droite, se font face les pavillons de l’Union soviétique et de l’Allemagne.', { x: p.x, z: p.z, top: p.top + 8 }); break; }
  lieu('École militaire', 'monument', 'L’école de Gabriel (1751-1780) ferme le Champ-de-Mars au sud-est. ' + V, [-3352.9, 40]);
  lieu('Dôme des Invalides', 'monument', 'L’église du Dôme, par Jules Hardouin-Mansart : 107 mètres au sommet de la flèche. Sous la coupole, le tombeau de Napoléon. ' + E, M.Invalides, 1);
  lieu('Arc de triomphe', 'monument', 'Au sommet de la colline de l’Étoile, d’où rayonnent douze avenues : 50 mètres de haut, 45 de large. Sous la grande arche repose depuis 1921 le Soldat inconnu ; la flamme y est ranimée chaque soir depuis 1923. ' + E, M.Arc, 1);
  lieu('Opéra', 'monument', 'L’Opéra de Charles Garnier, inauguré en 1875 : la coupole de cuivre de la salle, puis la haute cage de scène. ' + E, M.Opera, 1);
  lieu('Louvre', 'monument', 'Le palais et ses musées ; la cour s’ouvre sur le jardin des Tuileries. Sous la rue de Rivoli passe la ligne 1 du métropolitain, la première, ouverte en 1900. ' + V, [-1033, -892]);
  lieu('Halles centrales', 'disparu', 'Le « ventre de Paris » : les pavillons de fonte, de brique et de verre de Victor Baltard, en deux groupes de part et d’autre de la rue Baltard, reliés par des rues couvertes. Les sources disent les deux derniers achevés en 1936, du côté de la Bourse de commerce ; la photographie aérienne de 1949 en montre dix, quatre à l’ouest et six à l’est, et ce sont eux qui sont figurés, chacun sur son îlot. Tout sera démoli en 1971-1973 ; le Forum et le jardin des Halles les ont remplacés. L’élévation est une évocation.', M.Halles, 1);
  lieu('Notre-Dame', 'monument', 'La cathédrale restaurée par Viollet-le-Duc : les deux tours de 69 mètres, la flèche de 96 mètres. ' + E, M.NotreDame, 1);
  lieu('Panthéon', 'monument', 'Le temple des grands hommes, au sommet de la montagne Sainte-Geneviève ; Jean Jaurès y est entré en 1924. Son dôme culmine à 83 mètres. ' + E, M.Pantheon, 1);
  lieu('Saint-Sulpice', 'monument', 'Ses deux tours inégales, de 73 et 68 mètres : la tour sud n’a jamais été achevée. ' + E, M.Sulpice);
  lieu('Institut de France', 'monument', 'L’ancien collège des Quatre-Nations et sa coupole, face au Louvre. ' + E, M.Institut);
  lieu('Saint-Augustin', 'monument', 'L’église de Baltard (1860-1871), à charpente de fer, sous un dôme de 80 mètres. ' + E, M.Augustin);
  lieu('La Trinité', 'monument', 'L’église de Ballu (1867) et son clocher de 65 mètres, au bout de la Chaussée-d’Antin. ' + E, M.Trinite);
  lieu('Colonne Vendôme', 'monument', 'La colonne de bronze de la place Vendôme, relevée en 1875 après sa chute sous la Commune.', M.Vendome);
  lieu('Place de la Concorde', 'quartier', 'L’obélisque de Louxor, dressé en 1836 au centre de la place.', M.Obelisque);
  lieu('Sacré-Cœur', 'monument', 'La basilique de Montmartre, commencée en 1875 : son grand dôme est achevé en 1899, son campanile de 84 mètres en 1912 ; elle a été consacrée en 1919. Sa forme est une évocation.', M.SacreCoeur, 1);
  lieu('Hôtel-Dieu', 'monument', 'Le plus ancien hôpital de Paris, rebâti de 1866 à 1877 sur le flanc nord du parvis : des pavillons de malades de part et d’autre d’une cour-jardin. L’élévation est une évocation.', M.HotelDieu);
  lieu('Hôtel de Ville', 'monument', 'Rebâti de 1874 à 1882 après l’incendie de la Commune, dans le style de la Renaissance. Le volume vient des données ; le campanile et les combles des pavillons d’angle y sont ajoutés, à des hauteurs de convention.', M.HotelDeVille, 1);
  lieu('Palais de justice', 'monument', 'Sur le quai de l’Horloge, la tour de l’Horloge et les tours rondes de la Conciergerie. Le reste du Palais est rendu par son volume.', M.Conciergerie);
  lieu('Sainte-Chapelle', 'monument', 'La chapelle de saint Louis, enclose dans le Palais de justice, et sa flèche de plomb. ' + E, M.SainteChapelle);
  lieu('Tour Saint-Jacques', 'monument', 'Le clocher de Saint-Jacques-de-la-Boucherie (1509-1523), seul reste de l’église détruite après la Révolution, dans son square. ' + E, M.TourSaintJacques);
  lieu('Val-de-Grâce', 'monument', 'L’église de l’abbaye fondée par Anne d’Autriche, devenue hôpital militaire. Le dôme est aux cotes de la maquette de 1789.', M.ValDeGrace);
  lieu('Chapelle de la Sorbonne', 'monument', 'La chapelle de Richelieu, par Lemercier, au milieu de la Sorbonne de Nénot, achevée en 1901. Le dôme est aux cotes de la maquette de 1789.', M.Sorbonne);
  lieu('Saint-Paul-Saint-Louis', 'monument', 'L’église des Jésuites de la rue Saint-Antoine (1627-1641) et son dôme. ' + E, M.SaintPaul);
  lieu('Sainte-Clotilde', 'monument', 'La première grande église néogothique de Paris (1846-1857), ses deux flèches de 69 mètres. ' + E, M.Clotilde);
  lieu('Porte Saint-Denis', 'monument', 'L’arc élevé par François Blondel en 1672, au milieu des Grands Boulevards. Ses cotes sont celles de la maquette de 1789.', M.PorteSaintDenis);
  lieu('Porte Saint-Martin', 'monument', 'L’arc de Pierre Bullet (1674), au débouché du faubourg Saint-Martin. Ses cotes sont celles de la maquette de 1789.', M.PorteSaintMartin);
  lieu('Buttes-Chaumont', 'quartier', 'D’anciennes carrières changées en parc par Alphand pour l’Exposition de 1867.', [2375, -3055]);
  lieu('Bassin de la Villette', 'eau', 'Le port du canal de l’Ourcq, bordé de magasins généraux ; au nord, les abattoirs et le marché aux bestiaux.', [1730, -3562]);
  lieu('Père-Lachaise', 'quartier', 'Le plus grand cimetière de Paris, sur les pentes de Ménilmontant.', [3155, -913]);
  lieu('Place de la Bastille', 'quartier', 'La colonne de Juillet marque l’emplacement de la forteresse. Trois lignes de métro se croisent sous la place ; à côté, la gare de la Bastille envoie ses trains sur le viaduc de l’avenue Daumesnil.', M.Juillet);
  // gares : chacune est posée au bout de ses voies (src/p1889/gares.js)
  const G = ' Elle est placée en tête de ses voies ; son élévation est une évocation.';
  lieu('Gare Saint-Lazare', 'enceinte', 'La gare de Juste Lisch (1885-1889), la plus fréquentée de Paris : sa longue façade sur la rue Saint-Lazare et l’hôtel Terminus, entre la cour de Rome et la cour du Havre.' + G, M.GareLazare, 1);
  lieu('Gare du Nord', 'enceinte', 'La gare de Jacques Hittorff, achevée en 1865 : une façade de 180 mètres, un grand pignon vitré entre deux pavillons.' + G, M.GareNord, 1);
  lieu('Gare de l’Est', 'enceinte', 'L’embarcadère de Strasbourg (1849), doublé de 1928 à 1931 par une seconde gare qui répète la première, en miroir : deux façades, deux grandes halles.' + G, M.GareEst);
  lieu('Gare de Lyon', 'enceinte', 'La gare de Marius Toudoire, bâtie pour l’Exposition de 1900, et sa tour de l’horloge de 67 mètres. Le bâtiment de tête et l’aile du boulevard Diderot viennent des données ; les nefs vitrées sont une évocation.', M.GareLyon, 1);
  lieu('Tour de l’horloge de la gare de Lyon', 'enceinte', 'Haute de 67 mètres, à l’angle du boulevard Diderot : quatre cadrans de 6,40 mètres. Sa forme est une évocation à partir de ces cotes.', M.HorlogeLyon);
  lieu('Gare d’Austerlitz', 'enceinte', 'La gare d’Orléans, rebâtie de 1862 à 1867 : une halle de 280 mètres de long et de 51 mètres de portée. Ses trains de grandes lignes continuent sous les quais jusqu’à la gare d’Orsay.' + G, M.GareOrleans);
  lieu('Gare d’Orsay', 'enceinte', 'La gare de Victor Laloux, bâtie pour l’Exposition de 1900 : terminus des trains d’Orléans, qui y arrivent sous les quais depuis Austerlitz. Ses quais, trop courts pour les trains d’aujourd’hui, ne recevront bientôt plus que la banlieue (1939). C’est aujourd’hui le musée d’Orsay. Son volume vient des données.', M.GareOrsay, 1);
  lieu('Gare des Invalides', 'enceinte', 'Ouverte pour l’Exposition de 1900, tête de la ligne électrique de Versailles par la rive gauche. Son volume vient des données.', M.GareInvalides);
  lieu('Gare Montparnasse', 'disparu', 'La gare de l’Ouest rive gauche (1852), face à la rue de Rennes : les voies arrivent à l’étage, au-dessus de la place. Elle sera démolie en 1969 ; la gare actuelle est 400 mètres plus au sud, et la tour Montparnasse s’élève à sa place. Elle occupe son îlot, entre la rue de l’Arrivée et la rue du Départ ; sa forme est une évocation.', M.GareMontparnasse, 1);
  lieu('Gare de la Bastille', 'disparu', 'Tête de la ligne de Vincennes (1859), là où s’élève aujourd’hui l’Opéra Bastille. Les trains partent de l’étage et suivent le viaduc de l’avenue Daumesnil, devenu le viaduc des Arts. Fermée en 1969, démolie en 1984. Sa forme est une évocation.', M.GareBastille);
  lieu('Gare de Sceaux', 'enceinte', 'L’embarcadère de 1846, place Denfert-Rochereau, tête de la ligne de Sceaux. La ligne, reprise par la Compagnie du métropolitain, est électrifiée en 1937 et rouvre au début de 1938 ; c’est aujourd’hui la gare Denfert-Rochereau du RER B. Sa forme est une évocation.', M.GareSceaux);
  { const e = (app.v89.fer.echantillon || []).filter((p) => p[3] > 6 && p[4] === 0 && p[0] > 1500 && p[0] < 2600 && p[2] > 300), p = e[Math.floor(e.length / 2)];
    if (p) lieu('Viaduc de la ligne de Vincennes', 'enceinte', 'Un kilomètre et demi d’arches de brique et de pierre le long de l’avenue Daumesnil, de la gare de la Bastille à celle de Reuilly (1859). Il porte aujourd’hui une promenade plantée. Ses arches sont de convention.', { x: p[0], z: p[2], top: p[1] + 14 }); }
  { const e = (app.v89.fer.echantillon || []).filter((p) => p[3] > 6 && p[0] < -5800), p = e.sort((a, b) => a[0] - b[0])[Math.floor(e.length * 0.8)];
    if (p) lieu('Viaduc d’Auteuil', 'disparu', 'Le viaduc du Point-du-Jour (1865) : en bas la route, au-dessus le chemin de fer de Ceinture, sur des arcades. Démoli dans les années 1960, il a laissé la place au pont du Garigliano. Sa forme est de convention.', { x: p[0], z: p[2], top: p[1] + 14 }); }
  lieu('Petite Ceinture', 'enceinte', 'Le chemin de fer qui fait le tour de Paris : depuis le 22 juillet 1934, il ne porte plus de voyageurs, remplacé par l’autobus PC, sauf sur la ligne d’Auteuil ; les trains de marchandises y passent toujours. Les rails d’aujourd’hui sont gardés là où ils subsistent ; ailleurs la ligne est restituée dans l’axe de son emprise ou évoquée le long des rues.', [-218, -4932]);
  lieu('Ceinture des HBM', 'enceinte', 'L’enceinte de Thiers a été démolie de 1919 à 1929. Sur ses bastions s’élève une ceinture d’habitations à bon marché de brique rouge, d’écoles, de stades et la Cité internationale universitaire ; au-delà, la « zone », rattachée à Paris en 1925-1930, garde ses baraques et ses jardins ouvriers. Le bâti réel vient des données ; la zone n’est pas figurée.', [-4928, -2758], 1);
  lieu('Bois de Boulogne', 'quartier', 'L’ancienne forêt royale, aménagée en parc à l’anglaise par Alphand sous le Second Empire, et rattachée à Paris en 1929.', [-6600, -1100]);
  lieu('Grenelle', 'quartier', 'Un quartier d’usines et d’ateliers le long de la Seine — automobiles Citroën au quai de Javel, Vélodrome d’Hiver rue Nélaton. Presque tout y a été rebâti depuis : ses maisons sont évoquées le long des rues de 1937.', [-4300, 420]);
  return out;
}
