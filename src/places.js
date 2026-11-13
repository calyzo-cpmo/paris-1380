// Lieux remarquables : fiches historiques, positions (calées sur les emprises du plan) et étapes de la visite guidée.
import { layer, LABELS } from './data.js';
import { centroid, polyArea } from './geom.js';

// [id, nom, catégorie, x, z, calage, hauteur d'étiquette, priorité, date, texte, sources]
const RAW = [
  ['notre-dame', 'Notre-Dame', 'Cité', -40, -18, 'm:notreDame', 78, 1, '1163 – v. 1345', 'La cathédrale est achevée depuis une génération : gros œuvre terminé vers 1250, chapelles et clôture du chœur vers 1345. Les tours culminent à 69 m ; une flèche de charpente couverte de plomb, élevée vers 1250, coiffe la croisée. La toiture est en plomb, d’où sa teinte grise.', ['fouquet_nd', 'trh_mages', 'truschet']],
  ['palais', 'Palais de la Cité', 'Cité', -350, -344, 'm:grandSalle', 34, 1, 'reconstruit 1296 – 1313', 'Résidence des rois depuis le haut Moyen Âge, rebâtie par Philippe le Bel. La Grand’Salle à deux nefs jumelles est l’une des plus vastes d’Europe. Après l’émeute de 1358, Charles V lui préfère l’hôtel Saint-Pol et le Louvre : le Palais devient le siège du Parlement, de la Chambre des comptes et de la Conciergerie.', ['trh_juin', 'retable_parlement', 'truschet']],
  ['sainte-chapelle', 'Sainte-Chapelle', 'Cité', -388, -276, 'm:sainteChapelle', 80, 1, '1241 – 1248', 'Chapelle palatine élevée par Louis IX pour abriter la Couronne d’épines, consacrée en 1248 : une cage de verrières de 15 m de haut au-dessus d’une chapelle basse. La flèche est refaite en 1383, sous Charles VI ; c’est elle que montre la miniature de juin des Très Riches Heures.', ['trh_juin', 'trh_mages']],
  ['horloge', 'Tour de l’Horloge', 'Cité', -306, -367, 'm:horloge', 56, 2, 'v. 1350 ; horloge 1371', 'Tour de guet bâtie sous Jean le Bon à l’angle du Palais. Charles V y fait installer vers 1370-1371 la première horloge publique de Paris, œuvre de l’horloger Henri de Vic.', ['trh_juin']],
  ['hotel-dieu', 'Hôtel-Dieu', 'Cité', -214, -7, null, 24, 3, 'attesté dès le IXe siècle', 'Le grand hôpital de Paris aligne ses salles de malades le long du petit bras de la Seine, entre le parvis de Notre-Dame et le Petit-Pont.', ['truschet']],
  ['pont-changeurs', 'Grand-Pont (pont aux Changeurs)', 'Ponts', -258, -424, 'b:changeurs', 26, 2, 'XIIe siècle', 'Seul pont carrossable du grand bras. Depuis 1141 les changeurs, puis les orfèvres, y tiennent boutique : il est bordé de maisons d’un bout à l’autre.', ['truschet', 'vie_st_denis']],
  ['pont-meuniers', 'Pont aux Meuniers', 'Ponts', -283, -428, 'b:meuniers', 18, 3, 'XIIIe – XIVe siècle', 'Passerelle de bois doublant le Grand-Pont en aval. Des moulins sont suspendus entre ses pilotis pour profiter du courant resserré.', ['truschet', 'vie_st_denis']],
  ['planche-mibray', 'Planches de Mibray', 'Ponts', -128, -365, 'b:mibray', 16, 3, 'avant 1413', 'Simple passerelle de planches dans l’axe de la rue Saint-Martin. Le pont Notre-Dame la remplacera en 1413.', ['alpage1380']],
  ['petit-pont', 'Petit-Pont', 'Ponts', -254, -25, 'b:petitPont', 22, 2, 'antique, sans cesse rebâti', 'Le plus ancien passage vers la rive gauche, dans l’axe de la rue Saint-Jacques. Emporté à plusieurs reprises par les crues, il porte lui aussi des maisons.', ['fouquet_nd', 'vie_st_denis']],
  ['pont-saint-michel', 'Pont Saint-Michel', 'Ponts', -418, -128, 'b:saintMichel', 22, 3, '1378 – 1387', 'Le « Pont-Neuf » de l’époque : pont de pierre voulu par Charles V et construit sous la direction du prévôt Hugues Aubriot, en chantier vers 1380.', ['fouquet_nd']],
  ['grand-chatelet', 'Grand Châtelet', 'Pouvoir royal', -227, -523, 'm:grandChatelet', 38, 2, 'XIIe siècle', 'Forteresse fermant le Grand-Pont côté rive droite, devenue siège du prévôt de Paris, tribunal et prison.', ['truschet']],
  ['petit-chatelet', 'Petit Châtelet', 'Pouvoir royal', -256, -13, 'm:petitChatelet', 26, 3, 'rebâti en 1369', 'Porte fortifiée du Petit-Pont côté rive gauche, reconstruite par le prévôt Hugues Aubriot en 1369 ; elle sert de prison.', ['fouquet_nd']],
  ['louvre', 'Le Louvre', 'Pouvoir royal', -900, -812, 'm:louvre', 58, 1, 'v. 1190 ; remanié 1364 – 1380', 'La forteresse de Philippe Auguste, avec sa « grosse tour » de 30 m, a perdu son rôle défensif depuis la nouvelle enceinte. Charles V la fait transformer par Raymond du Temple en résidence : hautes toitures, grande vis d’escalier, et la librairie royale installée en 1368 dans une tour.', ['trh_octobre', 'retable_parlement', 'hoffbauer_louvre']],
  ['bastille', 'La Bastille Saint-Antoine', 'Fortifications', 1285, -22, 'm:bastille', 40, 1, '1370 – 1383', 'Première pierre posée le 22 avril 1370 par le prévôt Hugues Aubriot. Huit tours de 24 m reliées par des courtines de même hauteur : la forteresse verrouille la porte Saint-Antoine et couvre l’hôtel Saint-Pol.', ['fouquet_amauriciens', 'viollet_bastille', 'truschet']],
  ['temple', 'Le Temple', 'Fortifications', 808, -1233, 'm:temple', 62, 1, 'XIIe – XIIIe siècle', 'Enclos fortifié des Templiers, passé aux Hospitaliers après la suppression de l’ordre en 1312. Son donjon carré à quatre tourelles, haut d’une cinquantaine de mètres, date de la fin du XIIIe siècle.', ['fouquet_amauriciens', 'truschet']],
  ['saint-martin', 'Saint-Martin-des-Champs', 'Églises et abbayes', 300, -1490, 'red', 34, 2, 'prieuré clunisien, 1079', 'Prieuré clunisien ceint d’une muraille à tours. Longtemps hors les murs, il vient d’être englobé dans la ville par l’enceinte de Charles V. Son réfectoire du XIIIe siècle existe toujours.', ['truschet', 'alpage1380']],
  ['halles', 'Les Halles', 'Vie urbaine', -335, -992, null, 22, 2, 'marché créé en 1137, halles 1183', 'Le marché des Champeaux, fondé par Louis VI, reçoit ses premières halles couvertes sous Philippe Auguste. Drapiers, merciers et marchands de toute la ville y tiennent leurs étals.', ['truschet', 'alpage1380']],
  ['innocents', 'Cimetière des Saints-Innocents', 'Vie urbaine', -120, -870, null, 20, 2, 'clos en 1186', 'Le grand cimetière parisien, ceint de murs par Philippe Auguste. Des charniers à galeries s’élèvent sur son pourtour au XIVe siècle.', ['truschet']],
  ['greve', 'Place de Grève', 'Vie urbaine', 60, -352, null, 20, 1, 'Maison aux Piliers acquise en 1357', 'Grève de sable où accostent les bateaux de blé, de vin et de foin : le premier port de Paris. Étienne Marcel y installe la municipalité en 1357 dans la Maison aux Piliers.', ['truschet', 'vie_st_denis']],
  ['saint-pol', 'Hôtel Saint-Pol', 'Pouvoir royal', 840, 30, 'brown', 26, 2, '1361 – 1365', 'Résidence favorite de Charles V, constituée par achats successifs : un ensemble de logis, de galeries, de jardins et de préaux plutôt qu’un château, proche de la Bastille.', ['alpage_hotels', 'alpage1380']],
  ['tournelles', 'Hôtel des Tournelles', 'Pouvoir royal', 1058, -203, 'brown', 24, 3, 'à partir de 1388', 'Demeure du chancelier Pierre d’Orgemont, appelée à devenir résidence royale au XVe siècle.', ['alpage_hotels']],
  ['celestins', 'Couvent des Célestins', 'Églises et abbayes', 950, 150, 'red', 30, 3, 'église 1365 – 1370', 'Couvent protégé par Charles V, dont l’église est consacrée en 1370. Il deviendra la nécropole de la famille d’Orléans.', ['truschet']],
  ['nesle', 'Tour et hôtel de Nesle', 'Fortifications', -913, -494, 'm:nesle', 36, 2, 'v. 1200', 'Tour d’angle de l’enceinte de Philippe Auguste sur la rive gauche, haute de 25 m. Une chaîne tendue jusqu’à la tour du Coin, côté Louvre, peut barrer le fleuve. L’hôtel voisin appartient à Jean, duc de Berry.', ['retable_parlement', 'truschet']],
  ['clisson', 'Hôtel de Clisson', 'Vie urbaine', 537, -830, 'brown', 22, 3, 'à partir de 1371', 'Hôtel du connétable Olivier de Clisson. Sa porte fortifiée flanquée de deux tourelles existe encore, rue des Archives.', ['alpage_hotels']],
  ['bourgogne', 'Hôtel d’Artois (de Bourgogne)', 'Vie urbaine', -373, -1264, 'brown', 22, 3, 'XIIIe – XIVe siècle', 'Résidence parisienne des ducs de Bourgogne, adossée à l’enceinte de Philippe Auguste. La tour Jean-sans-Peur y sera ajoutée en 1409-1411.', ['alpage_hotels']],
  ['saint-germain-auxerrois', 'Saint-Germain-l’Auxerrois', 'Églises et abbayes', -580, -690, 'red', 30, 3, 'XIIe – XIVe siècle', 'Église paroissiale du quartier du Louvre.', ['truschet']],
  ['saint-eustache', 'Saint-Eustache', 'Églises et abbayes', -375, -1150, 'red', 26, 3, 'paroisse en 1303', 'Ancienne chapelle Sainte-Agnès, devenue l’église du quartier des Halles.', ['alpage1380']],
  ['saint-jacques-boucherie', 'Saint-Jacques-de-la-Boucherie', 'Églises et abbayes', -85, -561, 'red', 28, 3, 'XIIe – XIVe siècle', 'Paroisse des bouchers de la Grande Boucherie voisine. L’écrivain public Nicolas Flamel, installé à son chevet, en finance un portail en 1389.', ['truschet']],
  ['saint-merri', 'Saint-Merri', 'Églises et abbayes', 35, -678, 'red', 26, 3, 'XIIIe siècle', 'Église collégiale sur la rue Saint-Martin, au cœur du quartier des changeurs et des merciers.', ['alpage1380']],
  ['saint-gervais', 'Saint-Gervais', 'Églises et abbayes', 300, -285, 'red', 28, 3, 'reconstruite au XIIIe siècle', 'Paroisse du monceau Saint-Gervais, butte insubmersible où s’est fixé le premier habitat de la rive droite.', ['alpage1380']],
  ['saint-paul', 'Saint-Paul', 'Églises et abbayes', 880, -98, 'red', 26, 3, 'XIIe – XIVe siècle', 'Paroisse de l’hôtel royal : le futur Charles VI y est baptisé en 1368.', ['alpage1380']],
  ['quinze-vingts', 'Les Quinze-Vingts', 'Vie urbaine', -1098, -1030, null, 20, 3, 'v. 1260', 'Hospice fondé par Louis IX pour trois cents aveugles (« quinze fois vingt »).', ['alpage1380']],
  ['saint-germain-des-pres', 'Saint-Germain-des-Prés', 'Églises et abbayes', -1205, -110, 'red', 44, 1, 'fondée en 558', 'Abbaye bénédictine dont le bourg forme un faubourg hors les murs. Charles V l’a fait fortifier en 1368 : murailles, tours et fossés alimentés par la Seine. L’église à trois clochers remonte au XIe siècle.', ['pieta_sgp', 'truschet']],
  ['sainte-genevieve', 'Abbaye Sainte-Geneviève', 'Églises et abbayes', -200, 745, 'red', 40, 2, 'fondée v. 502', 'Au sommet de la « montagne », l’abbaye fondée par Clovis abrite la châsse de la patronne de Paris. La paroisse Saint-Étienne-du-Mont lui est accolée.', ['truschet']],
  ['saint-victor', 'Abbaye Saint-Victor', 'Églises et abbayes', 430, 740, 'red', 30, 2, 'fondée en 1113', 'Abbaye de chanoines réguliers hors les murs, au bord de la Bièvre. Son école et sa bibliothèque comptent parmi les foyers intellectuels de l’Occident.', ['truschet']],
  ['sorbonne', 'La Sorbonne', 'Université', -640, 420, null, 22, 2, 'collège fondé en 1257', 'Collège fondé par Robert de Sorbon pour des étudiants pauvres en théologie. Autour de lui, des dizaines de collèges occupent le versant de la montagne Sainte-Geneviève.', ['alpage1380']],
  ['bernardins', 'Collège des Bernardins', 'Université', 90, 430, 'red', 28, 3, 'fondé en 1245', 'Collège des Cisterciens. Sa grande nef gothique commencée en 1338 est restée inachevée ; le bâtiment des moines subsiste.', ['truschet']],
  ['cordeliers', 'Les Cordeliers', 'Université', -705, 195, 'red', 28, 3, 'couvent fondé en 1230', 'Couvent des Franciscains, dont la longue église borde l’enceinte de Philippe Auguste. Son réfectoire existe toujours.', ['truschet']],
  ['jacobins', 'Les Jacobins', 'Université', -552, 620, 'red', 28, 3, 'couvent fondé en 1218', 'Couvent des Dominicains de la rue Saint-Jacques, où ont enseigné Albert le Grand et Thomas d’Aquin.', ['truschet']],
  ['cluny', 'Thermes et hôtel de Cluny', 'Université', -506, 219, null, 20, 3, 'acquis v. 1330-1340', 'Les abbés de Cluny ont acquis les ruines des thermes romains, encore debout, pour y loger lors de leurs séjours parisiens. L’hôtel actuel date de 1485-1500.', ['alpage1380']],
  ['saint-severin', 'Saint-Séverin', 'Églises et abbayes', -395, 100, 'red', 26, 3, 'XIIIe – XVe siècle', 'Paroisse de la rive gauche près du Petit-Pont, dans le quartier des étudiants et des libraires.', ['alpage1380']],
  ['augustins', 'Les Grands-Augustins', 'Églises et abbayes', -704, -250, 'red', 26, 3, 'établis en 1293', 'Couvent des ermites de Saint-Augustin sur le quai de la rive gauche, dont l’église est rebâtie sous Charles V.', ['truschet']],
  ['tournelle', 'Château de la Tournelle', 'Fortifications', 392, 325, 'm:tournelle', 26, 3, 'XIVe siècle', 'Petit château terminant l’enceinte de Philippe Auguste en amont. Une chaîne portée par des bateaux rejoint l’île Notre-Dame puis la tour Barbeau, sur la rive droite.', ['alpage_pa']],
  ['foire-saint-germain', 'Foire Saint-Germain', 'Hors les murs', -1170, 150, null, 18, 3, 'XIIe siècle', 'Halles de la foire annuelle tenue par l’abbaye dans son bourg, à côté du Pré-aux-Clercs où se promènent les étudiants.', ['alpage1380']],
  ['montfaucon', 'Gibet de Montfaucon', 'Hors les murs', 1250, -2690, 'm:montfaucon', 24, 2, 'rebâti en pierre vers 1300', 'Le gibet des rois de France : seize piliers de pierre de dix mètres sur un soubassement, reliés par trois rangs de poutres. Il domine la route d’Allemagne, bien visible depuis la ville.', ['fouquet_amauriciens', 'truschet']],
  ['montmartre', 'Butte Montmartre', 'Hors les murs', -500, -3750, null, 30, 2, 'abbaye fondée en 1133', 'Vignes, carrières de plâtre, moulins à vent et abbaye de bénédictines fondée par Louis VI. La butte ferme l’horizon nord de toutes les vues de Paris.', ['trh_mages', 'pieta_sgp']],
];

// Portes : noms rétablis d'après les libellés du plan (même ordre que le calque « Portes »).
const GATE_NAMES = ['Porte Saint-Honoré', 'Porte Montmartre', 'Porte Saint-Denis', 'Porte Saint-Martin', 'Porte du Temple', 'Porte Saint-Victor', 'Porte Bordelle (Saint-Marcel)', 'Porte Sainte-Geneviève', 'Porte Saint-Jacques', 'Porte Saint-Michel (d’Enfer)', 'Porte Saint-Germain', 'Porte de Buci',
  'Ancienne porte Saint-Martin', 'Ancienne porte du Temple', 'Porte Barbette', 'Porte Baudoyer (ancienne porte Saint-Antoine)', 'Ancienne porte Saint-Denis', 'Ancienne porte Montmartre', 'Porte au Coquillier', 'Ancienne porte Saint-Honoré', 'Porte Saint-Antoine'];
const C5 = new Set([0, 1, 2, 3, 4, 20]);

export function buildPlaces(app) {
  const M = app.monuments, out = [];
  const reds = [];
  for (const n of ['Religieux', 'StMartin', 'StVictor', 'StGermain', 'Temple', 'EnConstruction']) for (const s of layer(n)) if (s.kind === 'poly' && (s.fill === '#FF0000' || s.fill === '#F3102B') && Math.abs(polyArea(s.pts)) > 150) reds.push(centroid(s.pts));
  const browns = layer('Hotel').filter((s) => s.kind === 'poly' && s.fill === '#704D18').map((s) => centroid(s.pts));
  const near = (list, x, z, max) => { let b = null, bd = max; for (const c of list) { const d = Math.hypot(c[0] - x, c[1] - z); if (d < bd) { bd = d; b = c; } } return b; };
  for (const [id, name, cat, x0, z0, snap, h, pri, date, text, src] of RAW) {
    let x = x0, z = z0, top = null;
    if (snap === 'red') { const c = near(reds, x, z, 160); if (c) { x = c[0]; z = c[1]; } }
    else if (snap === 'brown') { const c = near(browns, x, z, 220); if (c) { x = c[0]; z = c[1]; } }
    else if (snap && snap.startsWith('m:')) { const m = M[snap.slice(2)]; if (m) { if (m.c) { x = m.c[0]; z = m.c[1]; } else if (m.R) { x = m.R.cx; z = m.R.cz; } else if (m.x != null) { x = m.x; z = m.z; } } }
    else if (snap && snap.startsWith('b:')) { const m = M.bridges && M.bridges[snap.slice(2)]; if (m) { x = m.x; z = m.z; } }
    out.push({ id, name, cat, x, z, y: Math.max(0, app.terrain.height(x, z)) + h, pri, date, text, src, dist: pri === 1 ? 330 : 240 });
  }
  // portes
  const used = new Set();
  (LABELS.portes || []).forEach((l, i) => {
    const kind = C5.has(i) ? 'C5' : 'PA';
    let b = -1, bd = 210;
    app.gates.forEach((g, k) => { if (used.has(k) || g.kind !== kind) return; const d = Math.hypot(g.x - l.p[0], g.z - l.p[1]); if (d < bd) { bd = d; b = k; } });
    if (b < 0) return;
    used.add(b);
    const g = app.gates[b], c5 = kind === 'C5';
    out.push({ id: 'porte-' + i, name: GATE_NAMES[i] || l.t, cat: 'Fortifications', x: g.x, z: g.z, y: Math.max(0, app.terrain.height(g.x, g.z)) + (c5 ? 30 : 22), pri: c5 ? 2 : 3, date: c5 ? 'enceinte de Charles V, 1356 – 1383' : 'enceinte de Philippe Auguste, 1190 – 1215',
      text: c5 ? 'Porte de la nouvelle enceinte de la rive droite, commencée par Étienne Marcel en 1356 et achevée sous Charles VI en 1383 : un châtelet à tourelles précédé d’un pont sur le double fossé. Six portes seulement percent ce rempart.' : 'Porte de l’enceinte élevée par Philippe Auguste avant son départ en croisade : une muraille de 8 m flanquée de tours rondes tous les soixante mètres. Sur la rive droite, la nouvelle enceinte l’a rendue inutile ; sur la rive gauche, elle défend toujours l’Université.',
      src: [c5 ? 'alpage_c5' : 'alpage_pa', 'truschet'], dist: 200 });
  });
  return out;
}

export const CATS = ['Cité', 'Pouvoir royal', 'Fortifications', 'Églises et abbayes', 'Université', 'Vie urbaine', 'Ponts', 'Hors les murs'];

// Visite guidée : [lieu ou null, x, z, distance, azimut (rad), élévation (rad), heure, texte]
export const TOUR = [
  [null, -60, -250, 2900, -0.5, 0.7, 10.5, 'Paris vers 1380 : la plus grande ville d’Occident, qui comptait quelque deux cent mille habitants avant la Peste noire. La Seine, ses îles, et deux enceintes emboîtées sur la rive droite.'],
  ['notre-dame', 0, 0, 300, -1.35, 0.32, 10.5, 'L’île de la Cité, berceau de la ville. À l’est la cathédrale et le cloître des chanoines ; à l’ouest le palais du roi.'],
  ['palais', 0, 0, 330, 0.5, 0.42, 11.5, 'Le Palais : la Grand’Salle de Philippe le Bel, la Sainte-Chapelle, les tours du quai et la première horloge publique de la ville.'],
  ['pont-changeurs', 0, 0, 240, 2.5, 0.38, 12, 'Le Grand-Pont et ses maisons de changeurs, gardé par le Grand Châtelet. En aval, les moulins du pont aux Meuniers.'],
  ['greve', 0, 0, 300, 3.3, 0.36, 13, 'La place de Grève, port aux blés et aux vins, et la Maison aux Piliers où siège la municipalité.'],
  ['halles', 0, 0, 330, 0.3, 0.55, 14, 'Les Halles et le cimetière des Innocents, au cœur de la ville marchande de la rive droite.'],
  ['louvre', 0, 0, 300, 2.3, 0.3, 15, 'Le Louvre de Charles V : la vieille forteresse devenue résidence, avec la « grosse tour » de Philippe Auguste au centre de la cour.'],
  ['porte-2', 0, 0, 260, -0.6, 0.22, 16, 'La porte Saint-Denis, entrée solennelle des rois. L’enceinte de Charles V, ses fossés en eau, et les faubourgs le long de la route.'],
  ['temple', 0, 0, 330, 2.2, 0.36, 16.5, 'L’enclos du Temple et son donjon. Autour, des « cultures » : jardins et marais maraîchers enfermés depuis peu dans la ville.'],
  ['bastille', 0, 0, 280, 1.0, 0.27, 17.5, 'La Bastille Saint-Antoine, en chantier depuis 1370, protège la porte et le quartier royal de l’hôtel Saint-Pol.'],
  ['sainte-genevieve', 0, 0, 420, -2.6, 0.4, 18.5, 'La rive gauche, pays de l’Université : collèges, couvents et abbayes étagés sur la montagne Sainte-Geneviève, à l’abri du vieux mur de Philippe Auguste.'],
  ['saint-germain-des-pres', 0, 0, 340, -1.2, 0.34, 19.3, 'Hors les murs, le bourg fortifié de l’abbaye Saint-Germain-des-Prés, entre ses prés et ses fossés.'],
  [null, -60, -350, 2300, 0.9, 0.34, 20.6, 'Le soir tombe ; les fenêtres s’éclairent. Vous pouvez maintenant survoler librement la ville ou descendre dans ses rues.'],
];
