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
  const V = 'Dans cette première version, l’édifice est rendu par son volume réel — emprise et hauteur —, sans le détail de son élévation.';
  for (const p of app.v89.ponts) if (/I.na/i.test(p.nom)) { lieu('Pont d’Iéna', 'eau', 'Le pont de 1814 relie le Trocadéro au Champ-de-Mars : c’est l’entrée de l’Exposition pour qui vient de la rive droite.', { x: p.x, z: p.z, top: p.top + 8 }); break; }
  lieu('Champ-de-Mars', 'expo', 'L’ancien terrain de manœuvres de l’École militaire accueille l’Exposition universelle du 6 mai au 31 octobre 1889. Il va alors de l’avenue de La Bourdonnais à l’avenue de Suffren : ses bords ne seront lotis qu’après 1900.', [-3800, -370]);
  lieu('École militaire', 'monument', 'L’école de Gabriel (1751-1780) ferme le Champ-de-Mars au sud-est. ' + V, [-3352.9, 40]);
  lieu('Hôtel des Invalides', 'monument', 'L’hôtel de Louis XIV et son dôme ; l’esplanade porte en 1889 les pavillons des colonies. ' + V, [-2726, -227], 1);
  lieu('Arc de triomphe', 'monument', 'Achevé en 1836 au sommet de la colline de l’Étoile, d’où rayonnent les douze avenues tracées sous le Second Empire. ' + V, [-3995.3, -2292.8], 1);
  lieu('Palais de l’Industrie', 'monument', 'Bâti pour l’Exposition de 1855 sur les Champs-Élysées, il sera démoli en 1897 pour faire place au Grand Palais. Il n’est pas encore modelé.', [-2734, -1446]);
  lieu('Opéra', 'monument', 'L’Opéra de Charles Garnier, inauguré en 1875, au bout de l’avenue percée pour lui. ' + V, [-1354.7, -2088.3], 1);
  lieu('Louvre', 'monument', 'Le palais est complet depuis 1857 ; les Tuileries, incendiées en 1871, ont été rasées en 1883 : la cour s’ouvre désormais sur le jardin. ' + V, [-1033, -892]);
  lieu('Halles centrales', 'monument', 'Les pavillons de fer de Baltard, élevés à partir de 1854 et démolis en 1971. Ils ne sont pas encore modelés.', [-400, -1044]);
  lieu('Notre-Dame', 'monument', 'La cathédrale restaurée par Viollet-le-Duc, flèche comprise, et son parvis dégagé sous le Second Empire. ' + V, [0, 0], 1);
  lieu('Panthéon', 'monument', 'Rendu au culte des grands hommes en 1885, pour les funérailles de Victor Hugo. ' + V, [-250, 746]);
  lieu('Sacré-Cœur, en chantier', 'monument', 'La basilique de Montmartre est en construction depuis 1875 : en 1889 la nef s’élève, le dôme et le campanile manquent encore. Elle n’est pas encore modelée.', [-521.4, -3700.1], 1);
  lieu('Buttes-Chaumont', 'quartier', 'D’anciennes carrières changées en parc par Alphand pour l’Exposition de 1867.', [2375, -3055]);
  lieu('Bassin de la Villette', 'eau', 'Le port du canal de l’Ourcq, entouré d’entrepôts ; au nord, les abattoirs et le marché aux bestiaux.', [1730, -3562]);
  lieu('Père-Lachaise', 'quartier', 'Le plus grand cimetière de Paris, sur les pentes de Ménilmontant.', [3155, -913]);
  lieu('Place de la Bastille', 'quartier', 'La colonne de Juillet marque l’emplacement de la forteresse, rasée un siècle plus tôt : l’Exposition fête le centenaire de 1789.', [1398, -18]);
  lieu('Gare Saint-Lazare', 'enceinte', 'Agrandie pour l’Exposition : c’est la gare la plus fréquentée de Paris.', [-1831, -2530]);
  lieu('Gare du Nord', 'enceinte', 'La gare de Hittorff, ouverte en 1865.', [372, -3061]);
  lieu('Gare de Lyon', 'enceinte', 'L’embarcadère de 1855, que remplacera la gare actuelle en 1900.', [1762, 960]);
  lieu('Enceinte de Thiers', 'enceinte', 'Trente-quatre kilomètres de remparts et quatre-vingt-quatorze bastions, bâtis de 1841 à 1844 et jamais attaqués de vive force. Devant le fossé, la « zone » où il est interdit de bâtir en dur. L’enceinte sera démolie à partir de 1919 ; son tracé est celui des boulevards des Maréchaux. Tracé d’après la base « Paris 1900 ».', [-4928, -2758], 1);
  lieu('Bois de Boulogne', 'quartier', 'L’ancienne forêt royale, aménagée en parc à l’anglaise par Alphand sous le Second Empire.', [-6600, -1100]);
  lieu('Grenelle', 'quartier', 'Village annexé en 1860, devenu un quartier d’usines et d’ateliers au pied de l’Exposition. Presque tout y a été rebâti depuis : ses maisons sont évoquées le long des rues de 1900.', [-4300, 420]);
  return out;
}
