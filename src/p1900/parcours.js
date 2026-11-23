// Parcours commenté de la page Paris 1900. Chaque étape : [nom du lieu ou null, x, z, distance, azimut (rad),
// élévation (rad), heure, texte] — x et z ne servent qu'aux étapes sans lieu. Les textes reprennent les notices des
// lieux (src/p1900/places.js et src/p1900/expo.js).
export const PARCOURS = [
  {
    id: 'paris-1900', titre: 'Paris en 1900', sous: 'L’été de l’Exposition universelle, du Champ-de-Mars à Montmartre, en vingt étapes.',
    etapes: [
      [null, -1400, -900, 6400, -2.6, 0.6, 9.5, 'Paris en 1900 : près de deux millions sept cent mille habitants dans l’enceinte de Thiers. Le 14 avril, le président Loubet inaugure l’Exposition universelle, qui dresse le bilan du siècle : près de cinquante millions d’entrées jusqu’au 12 novembre.'],
      ['Tour de 300 mètres', 0, 0, 950, -2.55, 0.32, 10, 'La tour de Gustave Eiffel a onze ans. Repeinte en 1899 en cinq teintes, du jaune orangé à la base au jaune clair au sommet, elle reste le plus haut édifice du monde.'],
      ['Palais de l’Électricité', 0, 0, 760, -2.3, 0.36, 10.5, 'Au fond du Champ-de-Mars, le palais de l’Électricité et sa crête ajourée, couronnée à 70 mètres par le Génie de l’Électricité. Devant lui, la cascade du Château d’eau ; derrière, la Galerie des machines de 1889, gardée.'],
      ['Palais des Mines et de la Métallurgie', 0, 0, 700, -0.9, 0.34, 11, 'Six palais de fer et de staff blanc bordent le jardin central, en fer à cheval : ils seront démolis à la clôture de l’Exposition.'],
      ['Grande Roue', 0, 0, 640, -2.9, 0.3, 11.5, 'Au coin des avenues de Suffren et de La Motte-Picquet, la Grande Roue : 93 mètres de diamètre, quarante voitures de trente places.'],
      ['Globe céleste', 0, 0, 380, 2.4, 0.3, 11.8, 'De l’autre côté de l’avenue de Suffren, au bord du quai, le Globe céleste : une sphère bleue de quarante-cinq mètres, semée d’étoiles d’or, sur un soubassement à trois étages. Une passerelle de bois l’unit à l’Exposition. Entre lui et la tour, le palais de l’Optique et sa Grande Lunette.'],
      ['Palais du Trocadéro', 0, 0, 720, 0.7, 0.34, 12, 'En face, sur la colline de Chaillot, le palais de 1878 et ses deux tours. Le pont d’Iéna relie les deux rives de l’Exposition.'],
      ['Rue des Nations', 0, 0, 760, 0.3, 0.32, 12.2, 'Sur le quai d’Orsay, la rue des Nations : les pavillons des puissances étrangères en double rangée, chacun dans le style de son pays — l’Italie, les États-Unis, la Grande-Bretagne, la Belgique, l’Allemagne… En face, sur la rive droite, le palais de la Ville de Paris, les serres et le palais des Congrès.'],
      ['Pont Alexandre-III', 0, 0, 620, 2.6, 0.3, 12.5, 'Une seule arche d’acier de 107 mètres entre les Invalides et les Champs-Élysées, inaugurée avec l’Exposition ; aux quatre coins, des pylônes portent des Renommées dorées.'],
      ['Grand Palais', 0, 0, 760, -0.4, 0.38, 13, 'Le Grand Palais et sa verrière, sur le site du palais de l’Industrie démoli en 1897 ; en face, le Petit Palais. Une avenue nouvelle les sépare, dans l’axe du pont et des Invalides.'],
      ['Porte monumentale', 0, 0, 420, 1.2, 0.3, 13.2, 'À l’angle de la place de la Concorde, l’entrée principale de l’Exposition, par René Binet : trois arcatures sous une coupole, deux minarets, et au sommet la « Parisienne », la tête à 45 mètres. Derrière elle, les jardins du Cours-la-Reine ; plus loin, les serres de l’Horticulture et la rue de Paris, ses théâtres et ses attractions.'],
      ['Esplanade des Invalides', 0, 0, 760, 3.1, 0.4, 13.5, 'Sur l’Esplanade des Invalides, les palais des Manufactures nationales, de la Décoration et du Mobilier et des Industries diverses bordent l’allée qui découvre le dôme. Le trottoir roulant, sur son viaduc, longe la rue Fabert.'],
      ['Gare d’Orsay', 0, 0, 620, 2.2, 0.36, 14, 'Sur les ruines du palais d’Orsay, la gare de Victor Laloux, mise en service le 28 mai : ses trains électriques arrivent d’Austerlitz sous les quais.'],
      ['Opéra', 0, 0, 640, 0.35, 0.36, 15, 'L’Opéra de Charles Garnier, au bout de l’avenue percée pour lui : la coupole de cuivre de la salle et la haute cage de scène.'],
      ['Arc de triomphe', 0, 0, 620, 2.4, 0.3, 15.5, 'Au sommet de la colline de l’Étoile, l’arc achevé en 1836, d’où rayonnent les douze avenues du Second Empire.'],
      ['Place de la Bastille', 0, 0, 640, -1.1, 0.34, 16.5, 'Le 19 juillet, la première ligne du métropolitain ouvre de la porte de Vincennes à la porte Maillot : elle passe sous la place de la Bastille et sous la rue de Rivoli.'],
      ['Tour de l’horloge de la gare de Lyon', 0, 0, 560, 0.4, 0.32, 17, 'La nouvelle gare de Lyon et sa tour de l’horloge, haute de 67 mètres, bâties pour l’Exposition à la place de l’embarcadère de 1855 ; la gare sera inaugurée en avril 1901.'],
      ['Notre-Dame', 0, 0, 640, -1.3, 0.36, 18, 'La cathédrale restaurée par Viollet-le-Duc et sa flèche. Au nord du parvis, l’Hôtel-Dieu rebâti ; en amont, la Seine et ses ports bas.'],
      ['Sacré-Cœur', 0, 0, 900, 0.1, 0.32, 19, 'Sur la butte Montmartre, la basilique et son grand dôme, achevé en 1899 ; le campanile reste à bâtir.'],
      [null, -2600, -1000, 3600, -2.4, 0.34, 20.5, 'Le soir tombe sur l’Exposition. Vous pouvez maintenant survoler librement la ville, descendre dans ses rues ou remonter le temps avec le curseur du montage, jusqu’aux démolitions de 1897.'],
    ],
  },
];
