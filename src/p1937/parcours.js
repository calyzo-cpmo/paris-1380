// Parcours commenté de la page Paris 1937. Chaque étape : [nom du lieu ou null, x, z, distance, azimut (rad),
// élévation (rad), heure, texte] — x et z ne servent qu'aux étapes sans lieu. Les textes reprennent les notices des
// lieux (src/p1937/places.js, src/p1937/expo.js et src/p1937/disparus.js).
export const PARCOURS = [
  {
    id: 'paris-1937', titre: 'Paris en 1937', sous: 'L’été de l’Exposition internationale, et le Paris qui a disparu depuis, en vingt étapes.',
    etapes: [
      [null, -1400, -900, 6400, -2.6, 0.6, 9.5, 'Paris en 1937 : deux millions huit cent mille habitants, un peu moins qu’en 1921, son maximum. L’Exposition internationale des arts et des techniques dans la vie moderne est ouverte du 25 mai au 25 novembre, des jardins du Trocadéro au Champ-de-Mars et sur les deux rives de la Seine.'],
      ['Tour Eiffel', 0, 0, 950, -2.55, 0.32, 10, 'La tour a quarante-huit ans ; sa couleur est le « jaune brun » choisi en 1907. Elle porte l’émetteur de Radio-Tour-Eiffel et marque le centre de l’Exposition.'],
      ['Pavillon de l’URSS', 0, 0, 300, 1.9, 0.22, 10.2, 'Au pied du Trocadéro, de part et d’autre de la place de Varsovie, les deux pavillons qui se font face. À l’ouest, celui de l’URSS, par Boris Iofan : 160 mètres de long, et, posés à 33 mètres, L’Ouvrier et la Kolkhozienne de Vera Moukhina, qui s’élancent vers l’est.'],
      ['Pavillon de l’Allemagne', 0, 0, 320, -0.8, 0.24, 10.3, 'En face, le pavillon d’Albert Speer : une tour de 54 mètres, raidie de pilastres, et l’aigle qui toise le couple soviétique. Les deux pavillons reçoivent la médaille d’or ; deux ans plus tard, c’est la guerre.'],
      ['Palais de Chaillot', 0, 0, 760, 0.7, 0.34, 10.5, 'En face, sur la colline, le palais de Chaillot remplace celui du Trocadéro : ses deux ailes courbes encadrent un parvis ouvert sur la tour et sur Paris.'],
      ['Pavillon de l’Espagne', 0, 0, 300, -0.9, 0.45, 10.8, 'Dans les jardins, parmi les sections étrangères, le pavillon de la République espagnole en guerre, par Sert et Lacasa : on y découvre Guernica, que Picasso vient de peindre. Plus haut, le campanile doré du pavillon pontifical.'],
      ['Champ-de-Mars', 0, 0, 900, -2.3, 0.4, 11, 'Le Champ-de-Mars est devenu le jardin de Formigé ; pour l’été, des pavillons bordent son grand parterre jusqu’au palais de la Lumière de Mallet-Stevens, qui ferme la perspective devant l’École militaire. On y voit La Fée Électricité de Raoul Dufy.'],
      ['Vélodrome d’Hiver', 0, 0, 420, 2.4, 0.36, 11.3, 'Rue Nélaton, sous sa grande verrière, le Vélodrome d’Hiver et sa piste de bois : les Six Jours, la boxe, les grands meetings. Il sera démoli en 1959.'],
      ['Usines Citroën', 0, 0, 760, 0.4, 0.4, 11.6, 'Au quai de Javel, les ateliers à sheds de Citroën, d’où sort depuis 1934 la Traction Avant. Le parc André-Citroën les a remplacés.'],
      ['Grand Palais', 0, 0, 760, -0.4, 0.38, 12, 'Le Grand et le Petit Palais, et le pont Alexandre-III : ce que l’Exposition de 1900 a laissé à Paris.'],
      ['Palais de l’Air', 0, 0, 560, 2.2, 0.4, 12.2, 'Sur l’Esplanade des Invalides, le palais de l’Air, 166 mètres sur 36, et en face celui des Chemins de fer, que Robert et Sonia Delaunay ont couverts de grandes peintures. Au débouché du pont Alexandre-III, le mât de 100 mètres de la porte d’honneur.'],
      ['Gare Montparnasse', 0, 0, 560, -2.4, 0.36, 12.5, 'Face à la rue de Rennes, la gare de 1852 ; les voies arrivent à l’étage. La tour Montparnasse s’élève aujourd’hui à sa place.'],
      ['Halles centrales', 0, 0, 640, -1.2, 0.36, 13, 'Le « ventre de Paris » : les pavillons de fonte et de verre de Baltard, reliés par des rues couvertes ; les deux derniers ont été achevés en 1936, du côté de la Bourse de commerce.'],
      ['Halle aux vins', 0, 0, 640, 0.6, 0.38, 13.5, 'Entre le quai Saint-Bernard et la rue Jussieu, les rues intérieures et les magasins de la Halle aux vins. La faculté des sciences de Jussieu la remplacera dans les années 1960.'],
      ['Entrepôts de Bercy', 0, 0, 900, 0.7, 0.4, 14, 'En amont, les entrepôts de Bercy : des chais alignés le long de rues plantées, où roulent les fûts. Le parc de Bercy a pris leur place.'],
      ['Petite Roquette', 0, 0, 420, -0.6, 0.42, 15, 'Rue de la Roquette, la prison hexagonale de Lebas : six ailes rayonnent de la chapelle, d’où l’on surveillait tout. Elle sera démolie en 1974.'],
      ['Abattoirs de la Villette', 0, 0, 900, -2.2, 0.42, 16, 'Entre les canaux, les abattoirs de la Villette et, au sud, le marché aux bestiaux, dont la grande halle est encore debout. Plus loin, les gazomètres de l’usine à gaz.'],
      ['Sacré-Cœur', 0, 0, 900, 0.1, 0.32, 17, 'Sur la butte Montmartre, la basilique achevée : le grand dôme et, derrière lui, le campanile de 84 mètres.'],
      ['Ceinture des HBM', 0, 0, 1400, -2.2, 0.42, 18, 'Là où passait l’enceinte de Thiers, démolie de 1919 à 1929, une ceinture de logements de brique rouge, d’écoles et de stades fait le tour de Paris.'],
      [null, -2600, -1000, 3600, -2.4, 0.34, 20.5, 'Le soir tombe sur l’Exposition. Vous pouvez maintenant survoler librement la ville, descendre dans ses rues ou passer à une autre époque, au même endroit.'],
    ],
  },
];
