// Parcours commenté de la page Paris 1789. Chaque étape : [nom du lieu ou null, x, z, distance, azimut (rad),
// élévation (rad), heure, texte] — x et z ne servent qu'aux étapes sans lieu. Les textes reprennent les notices des
// lieux (src/p1789/places.js).
export const PARCOURS = [
  {
    id: 'paris-1789', titre: 'Paris en 1789', sous: 'La ville à la veille de la Révolution, de la Cité à la Bastille, en quatorze étapes.',
    etapes: [
      [null, -600, -250, 5200, 0.3, 0.6, 9.5, 'Paris en 1789 : six à sept cent mille habitants, enfermés depuis peu dans le mur des Fermiers généraux, une enceinte d’octroi de vingt-quatre kilomètres et ses barrières dessinées par Ledoux. Le roi vit à Versailles.'],
      ['Notre-Dame', 0, 0, 560, -1.3, 0.36, 10, 'La cathédrale, sans la flèche de sa croisée, démontée en 1786. Le parvis est encore étroit, bordé au sud par l’Hôtel-Dieu, qui enjambe le petit bras de la Seine.'],
      ['Palais de la Cité', 0, 0, 560, 0.5, 0.38, 10.5, 'Le Palais, siège du Parlement de Paris. C’est en refusant d’enregistrer les édits royaux que le Parlement a conduit le roi à convoquer les états généraux.'],
      ['Pont Neuf', 0, 0, 520, 2.4, 0.32, 11, 'Le premier pont de Paris sans maisons, achevé en 1607. Sur les autres ponts, les maisons sont démolies depuis 1786.'],
      ['Louvre', 0, 0, 620, 2.3, 0.34, 11.5, 'Le Louvre, que la cour a quitté pour Versailles : il abrite les académies et des logements d’artistes. La Cour carrée reste inachevée.'],
      ['Palais-Royal', 0, 0, 520, 0.3, 0.4, 12, 'Le palais du duc d’Orléans et ses galeries de boutiques et de cafés, foyer de l’agitation : le 12 juillet, Camille Desmoulins y appelle la foule aux armes.'],
      ['Tuileries', 0, 0, 640, 2.5, 0.34, 12.5, 'Le palais des Tuileries et son jardin. Ramenés de Versailles par la foule le 6 octobre 1789, le roi et sa famille s’y installent.'],
      ['Place Louis XV', 0, 0, 620, 2.9, 0.32, 13, 'La place dessinée par Gabriel, ouverte sur les Champs-Élysées : la future place de la Concorde.'],
      ['Invalides', 0, 0, 720, -0.6, 0.34, 14, 'L’hôtel des Invalides et son dôme. Le matin du 14 juillet, la foule y prend des dizaines de milliers de fusils, avant de marcher sur la Bastille.'],
      ['École militaire', 0, 0, 760, -2.6, 0.34, 15, 'L’École militaire de Gabriel et le Champ-de-Mars, son terrain de manœuvres, où se tiendra la fête de la Fédération le 14 juillet 1790.'],
      ['Luxembourg', 0, 0, 660, 0.2, 0.38, 16, 'Le palais de Marie de Médicis et son jardin, au sud de la ville. Il appartient à Monsieur, frère du roi.'],
      ['Sainte-Geneviève', 0, 0, 620, -2.8, 0.36, 17, 'Sur la montagne Sainte-Geneviève, la nouvelle église de Soufflot, presque achevée. En 1791, elle deviendra le Panthéon.'],
      ['Hôtel de Ville', 0, 0, 520, -0.9, 0.36, 18, 'L’Hôtel de Ville, sur la place de Grève. Le 15 juillet, l’astronome Bailly y devient le premier maire de Paris.'],
      ['Bastille', 0, 0, 560, -1.9, 0.32, 19, 'La forteresse et prison d’État, prise le 14 juillet 1789. Sa démolition commence dès le lendemain.'],
      [null, -300, -400, 3600, 0.4, 0.4, 20.5, 'Le soir tombe ; les fenêtres s’éclairent. Vous pouvez maintenant survoler librement la ville ou descendre dans ses rues.'],
    ],
  },
];
