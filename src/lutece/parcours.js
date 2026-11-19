// Parcours commenté de la page Lutèce. Chaque étape : [nom du lieu ou null, x, z, distance, azimut (rad), élévation
// (rad), heure, texte] — x et z ne servent qu'aux étapes sans lieu. Les textes reprennent les notices des lieux
// (src/lutece/places.js).
export const PARCOURS = [
  {
    id: 'lutece', titre: 'Lutèce vers 250', sous: 'La ville gallo-romaine, du fleuve au forum, en douze étapes.',
    etapes: [
      [null, -250, 300, 3200, 0.3, 0.6, 9.5, 'Lutèce vers 250, chef-lieu de la cité des Parisii, à son apogée. La ville s’étend sur la colline de la rive gauche ; l’île est basse et peu bâtie ; au nord, le fleuve s’étale en bras morts et en prés inondables.'],
      ['Île de la Cité', 0, 0, 620, -1.3, 0.36, 10, 'L’île, plus petite qu’aujourd’hui et bordée de grèves, que traverse la route du nord au sud. Elle ne deviendra le cœur fortifié de la ville qu’au tournant du IVe siècle, après les invasions.'],
      ['Petit pont', 0, 0, 380, 1.4, 0.3, 10.5, 'Le pont de bois du petit bras, là où le cardo franchit l’eau : le Petit-Pont n’a jamais quitté cet emplacement.'],
      ['Pilier des Nautes', 0, 0, 340, -0.4, 0.3, 11, 'Le monument élevé à Jupiter par les bateliers de la Seine sous Tibère, retrouvé en 1711 sous le chœur de Notre-Dame. Sa place ici est une convention.'],
      ['Cardo maximus', 0, 0, 640, 0.1, 0.42, 11.5, 'La grande rue nord-sud, qui monte la colline : c’est aujourd’hui la rue Saint-Jacques.'],
      ['Thermes du Nord', 0, 0, 420, 0.6, 0.36, 12, 'Les thermes du Nord, ceux de Cluny, dont la grande salle froide est encore debout.'],
      ['Forum', 0, 0, 520, -0.5, 0.4, 13, 'Au sommet de la colline, sous l’actuelle rue Soufflot, le forum : une esplanade bordée de portiques, le temple à l’ouest, à l’est la basilique où l’on rend la justice.'],
      ['Thermes de l’Est', 0, 0, 420, 2.6, 0.36, 14, 'Les thermes de l’Est, sous l’actuel Collège de France.'],
      ['Théâtre', 0, 0, 420, -2.2, 0.36, 15, 'Le théâtre, adossé à la pente entre le forum et les thermes du Nord, sous l’actuel lycée Saint-Louis.'],
      ['Arènes', 0, 0, 480, -0.9, 0.36, 16, 'À l’écart, les arènes, amphithéâtre et scène de théâtre à la fois, redécouvertes en 1869 lors du percement de la rue Monge.'],
      ['Nécropole du sud', 0, 0, 620, 0.4, 0.38, 17.5, 'Hors de la ville, le long de la route du sud, les tombeaux : la loi romaine interdit d’enterrer les morts en ville.'],
      [null, -250, 300, 2600, -2.6, 0.38, 20, 'Le soir tombe sur Lutèce. Vous pouvez maintenant survoler librement la ville ou descendre dans ses rues.'],
    ],
  },
];
