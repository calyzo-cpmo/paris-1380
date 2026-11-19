// Parcours commenté de la page Paris 1889. Chaque étape : [nom du lieu ou null, x, z, distance, azimut (rad),
// élévation (rad), heure, texte] — x et z ne servent qu'aux étapes sans lieu. Les textes reprennent les notices des
// lieux (src/p1889/places.js et src/p1889/expo.js).
export const PARCOURS = [
  {
    id: 'paris-1889', titre: 'Paris en 1889', sous: 'De l’Exposition universelle au cœur de la ville, en quatorze étapes, du matin au soir.',
    etapes: [
      [null, -1400, -700, 6400, -2.6, 0.6, 9.5, 'Paris en 1889 : près de deux millions et demi d’habitants dans l’enceinte de Thiers, vingt arrondissements depuis l’annexion de 1860, une ville transformée par les travaux du Second Empire. Le 6 mai s’ouvre l’Exposition universelle, qui fête le centenaire de 1789.'],
      ['Tour de 300 mètres', 0, 0, 950, -2.55, 0.32, 10, 'La tour de Gustave Eiffel, entrée de l’Exposition et plus haut édifice du monde : trois cents mètres de fer, montés en vingt-six mois. Le curseur du chantier, en bas de l’écran, la fait monter de janvier 1887 au jour de l’ouverture.'],
      ['Galerie des machines', 0, 0, 760, -2.3, 0.38, 10.5, 'Au fond du Champ-de-Mars, la Galerie des machines de Dutert et Contamin : 420 mètres de long, 115 mètres de portée sans un seul appui. Devant elle, le Dôme central et les deux palais à coupole d’émail bleu.'],
      ['Palais du Trocadéro', 0, 0, 720, 0.7, 0.34, 11, 'En face, sur la colline de Chaillot, le palais bâti pour l’Exposition de 1878, sa rotonde et ses deux tours. Le pont d’Iéna relie les deux rives de l’Exposition.'],
      ['Dôme des Invalides', 0, 0, 640, -0.9, 0.34, 11.5, 'Le dôme de Hardouin-Mansart, redoré en 1869. L’esplanade des Invalides porte en 1889 les pavillons des colonies ; un chemin de fer à voie étroite la relie au Champ-de-Mars le long du quai d’Orsay.'],
      ['Palais de l’Industrie', 0, 0, 760, -2.9, 0.36, 12, 'Le long des Champs-Élysées, le palais de l’Exposition de 1855, où se tiennent les Salons. Il sera démoli à partir de 1897 pour ouvrir l’avenue du pont Alexandre-III, entre le Grand et le Petit Palais.'],
      ['Arc de triomphe', 0, 0, 620, 2.4, 0.3, 12.5, 'Au sommet de la colline de l’Étoile, l’arc achevé en 1836, d’où rayonnent les douze avenues du Second Empire.'],
      ['Opéra', 0, 0, 640, 0.35, 0.36, 13.5, 'L’Opéra de Charles Garnier, inauguré en 1875, au bout de l’avenue percée pour lui : la coupole de cuivre de la salle et la haute cage de scène.'],
      ['Gare Saint-Lazare', 0, 0, 760, 0.3, 0.4, 14, 'La plus fréquentée des gares de Paris, rebâtie de 1885 à 1889 ; devant elle, l’hôtel Terminus ouvre ses portes pour l’Exposition. Neuf gares et près de six cents kilomètres de voies dans la maquette.'],
      ['Halles centrales', 0, 0, 620, 0.2, 0.42, 15, 'Le « ventre de Paris » : les dix pavillons de fonte et de verre de Baltard, reliés par des rues couvertes, où arrivent chaque nuit les denrées de la ville.'],
      ['Hôtel de Ville', 0, 0, 600, -0.9, 0.36, 16, 'Incendié pendant la Commune en mai 1871, l’Hôtel de Ville a été rebâti de 1874 à 1882, plus vaste que l’ancien. En contrebas, sur la Seine, les ports bas où l’on décharge le bois, le vin et les matériaux.'],
      ['Notre-Dame', 0, 0, 640, -1.3, 0.36, 17, 'La cathédrale restaurée par Viollet-le-Duc et sa flèche neuve. Le parvis a été dégagé sous le Second Empire ; au nord, le nouvel Hôtel-Dieu a remplacé les vieilles rues de la Cité.'],
      ['Sacré-Cœur, en chantier', 0, 0, 900, 0.1, 0.32, 18.5, 'Sur la butte Montmartre, la basilique en chantier depuis 1875 : les murs de la nef montent dans leurs échafaudages ; le dôme ne sera achevé qu’en 1899.'],
      [null, -2600, -1000, 3600, -2.4, 0.34, 20.5, 'Le soir tombe sur l’Exposition. Vous pouvez maintenant survoler librement la ville, descendre dans ses rues ou faire monter la tour avec le curseur du chantier.'],
    ],
  },
];
