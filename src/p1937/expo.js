// Ce qui tient la place de l'Exposition de 1889 dans la page « Paris 1937 » : à l'assemblage, tout import de
// './expo.js' depuis src/p1889/ mène ici (tools/build.mjs, surcouche). La tour, peinte en « jaune brun » ; le
// Champ-de-Mars, devenu le jardin de Jean-Camille Formigé (1908-1928) et loti sur ses bords ; ce que l'Exposition de 1900
// a laissé (verrière du Grand Palais, dôme du Petit Palais, pylônes du pont Alexandre-III, repris de src/p1900/palais.js) ;
// les monuments, les édifices et les gares de la ville ; les grands édifices disparus depuis 1937 (src/p1937/disparus.js).
// Le palais du Trocadéro a fait place, en 1937, au palais de Chaillot, que les données donnent entier. L'Exposition
// internationale de 1937 elle-même est bâtie par src/p1937/expo37.js.
import { EXPO, expoXZ, bati } from '../p1889/data.js';
import { pointInPoly } from '../geom.js';
import { batirTour } from '../p1889/tour.js';
import { batirMonuments } from '../p1889/monuments.js';
import { batirGares } from '../p1889/gares.js';
import { batirEdifices } from '../p1889/edifices.js';
import { fill } from '../p1789/outils.js';
import { grandPalais, petitPalais, pylones } from '../p1900/palais.js';
import { batirDisparus } from './disparus.js';
import { batirExpo37, AXE, terrainsExpo } from './expo37.js';

// Repère du Champ-de-Mars : u de la tour vers l'École militaire, v en travers, centré entre les deux avenues.
const Q = (u, v) => expoXZ(u, v + EXPO.vc);
const rect = (u0, u1, v0, v1) => [[Q(u0, v0), Q(u1, v0), Q(u1, v1), Q(u0, v1)]];
// Le jardin de Formigé : les pelouses du grand parterre, de la tour à l'École militaire, de part et d'autre d'une allée ;
// au pied de la tour, des jardins à l'anglaise et leurs pièces d'eau ; des allées plantées sur les bords. Le dessin
// est une évocation d'après le parti du jardin d'aujourd'hui, qui est le sien.
const PARTERRE = [[150, 820, 8, 52], [150, 820, -52, -8]];
const ANGLAIS = [[60, 300, 82, 200], [60, 300, -200, -82]];
const BOSQUETS = [[330, 820, 82, 190], [330, 820, -190, -82]];
export function peindreExpo(x, Tr) {
  fill(x, Tr, [rect(EXPO.u0 + 160, EXPO.u1, EXPO.v0 - EXPO.vc, EXPO.v1 - EXPO.vc)], '#cfc4a6');
  for (const r of [...PARTERRE, ...ANGLAIS, ...BOSQUETS]) fill(x, Tr, [rect(...r)], '#8fae6c');
  for (const [u, v, r] of [[140, 150, 14], [210, -140, 12]]) { const c = Q(u, v); x.fillStyle = '#6f95a8'; x.beginPath(); x.arc(Tr.x(c[0]), Tr.y(c[1]), r * Tr.s, 0, 7); x.fill(); }
  // les jardins du Trocadéro : le grand bassin de la fontaine de Varsovie (1937), dans l'axe, et ses allées
  fill(x, Tr, [[AXE.rect(-548, -352, -22, 26)]], '#d8ccae'); fill(x, Tr, [[AXE.rect(-540, -358, -16, 20)]], '#6f95a8');
}
export const ESPLANADES = () => [rect(EXPO.u0 + 160, EXPO.u1, EXPO.v0 - EXPO.vc, EXPO.v1 - EXPO.vc)];
export function jardinsExpo(a) {
  for (const r of ANGLAIS) a.gardens.push({ ring: rect(...r)[0], dens: 0.45 });
  for (const r of BOSQUETS) a.gardens.push({ ring: rect(...r)[0], dens: 0.35 });
  for (const s of [-1, 1]) a.gardens.push({ ring: rect(150, 820, s > 0 ? 58 : -66, s > 0 ? 66 : -58)[0], dens: 0.7 });          // alignements du parterre
}

export async function batirExpo(app, B) {
  const T = app.terrain, V = app.v89, M = app.monuments;
  V.mobiles = [];
  batirTour(app);                                  // achevée, peinte en jaune brun (src/p1889/tour.js)
  batirMonuments(app, B);
  batirEdifices(app, B);
  batirGares(app, B);
  grandPalais(app); petitPalais(app, B); pylones(app, B);
  // les gares d'Orsay et des Invalides (1900) : leurs bâtiments sont dans les données ; on les nomme
  for (const [cle, x, z, h] of [['GareOrsay', -1696, -791, 30], ['GareInvalides', -2581, -1011, 16]]) M[cle] = { x, z, top: T.height(x, z) + h + 10 };
  batirDisparus(app, B);
  // l'Exposition de 1937 ; le bâti évoqué qui tombe sur ses terrains s'efface (le bâti réel reste)
  batirExpo37(app, B);
  { const Z = terrainsExpo(), boites = Z.map((r) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { r, x0, z0, x1, z1 }; });
    V.ecartes = new Set(); let k = 0;
    for (const e of bati()) { if (e.s === 'E' || e.s === 'G') { const p = e.rings[0][0]; if (boites.some((b) => p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.z0 && p[1] <= b.z1 && pointInPoly(p[0], p[1], b.r))) V.ecartes.add(k); } k++; }
    app.stats.ecartesExpo = V.ecartes.size; }

  const L = (V.lieux = V.lieux || []);
  const c = Q(480, 0), ch = expoXZ(-600, 0);
  L.unshift(
    ['Tour Eiffel', 'expo', 'La tour a quarante-huit ans. Sauvée en 1909 par la télégraphie sans fil, elle porte depuis 1925 l’émetteur de Radio-Tour-Eiffel. De 1925 à 1934, les lettres lumineuses de Citroën couraient sur ses quatre faces. Sa couleur, depuis 1907, est le « jaune brun ». À l’été 1937, elle est le pivot de l’Exposition internationale, qui s’étend des jardins du Trocadéro au Champ-de-Mars et sur les deux rives de la Seine. Sa forme est une évocation à partir de ses cotes.', M.Tour, 1],
    ['Champ-de-Mars', 'expo', 'La Galerie des machines a été démolie en 1910 ; le terrain, rendu à la Ville, a été loti sur ses bords et changé en jardin par Jean-Camille Formigé, de 1908 à 1928 : un grand parterre de la tour à l’École militaire, des jardins à l’anglaise et leurs pièces d’eau au pied de la tour. En 1937, les pavillons de la « diffusion artistique et technique » bordent le parterre jusqu’au carrefour central, les sections étrangères au-delà, jusqu’au palais de la Lumière. Le dessin du jardin et les pavillons sont une évocation, d’après le plan général de l’Exposition.', { x: c[0], z: c[1], top: T.height(c[0], c[1]) + 30 }],
    ['Palais de Chaillot', 'expo', 'Bâti pour l’Exposition de 1937 par Carlu, Boileau et Azéma sur les fondations du palais du Trocadéro de 1878, dont il garde les ailes courbes : la rotonde a disparu, laissant entre les deux pavillons un vaste parvis ouvert sur la tour. Son volume vient des données.', { x: ch[0], z: ch[1], top: T.height(ch[0], ch[1]) + 45 }, 1],
    ['Grand Palais', 'expo', 'Bâti pour l’Exposition de 1900, à la place du palais de l’Industrie : une nef de 200 mètres sous une verrière de fer, une coupole à 45 mètres. On y tient les Salons, le Salon de l’automobile et le Salon de l’aéronautique. Les corps de pierre viennent des données ; la verrière et la coupole sont une évocation.', M.GrandPalais, 1],
    ['Petit Palais', 'expo', 'Le palais de Charles Girault, bâti pour l’Exposition de 1900, est devenu le musée des Beaux-Arts de la Ville de Paris. Son volume vient des données ; le dôme de l’entrée est une évocation.', M.PetitPalais],
    ['Pavillon de l’URSS', 'expo', 'Par Boris Iofan : 160 mètres de long sur 21, de hauteur croissante vers la tour de sa façade, qui porte à 33 mètres L’Ouvrier et la Kolkhozienne de Vera Moukhina, 25 mètres d’acier inoxydable martelé. Bâti au-dessus de la rampe de l’avenue de Tokio, à l’ouest de la place de Varsovie, il fait face au pavillon allemand ; tous deux reçoivent la médaille d’or. La statue est rendue en grandes masses ; les cotes viennent de L’Architecture d’aujourd’hui (août 1937).', M.URSS, 1],
    ['Pavillon de l’Allemagne', 'expo', 'Par Albert Speer : une tour à pilastres de 54 mètres, couronnée d’un aigle tenant la croix gammée, qui toise la statue soviétique, et derrière elle une salle de portiques de 21 mètres de large et 18 de haut, au-dessus de la rampe de l’avenue de Tokio, à l’est de la place de Varsovie. Devant la tour, les groupes de Josef Thorak. Les cotes viennent de L’Architecture d’aujourd’hui (août 1937) ; l’élévation est une évocation.', M.Allemagne, 1],
    ['Pavillon pontifical', 'expo', 'Par Paul Tournon, sur les pentes du Trocadéro : un campanile doré de 75 mètres portant une Notre-Dame de France de 7 mètres en cuivre rouge, et le dôme du sanctuaire, à 40 mètres, où sont exposés les vitraux modernes destinés à Notre-Dame. Seul pavillon gardé après l’Exposition, il est démoli à la fin de 1938. Sa silhouette est une évocation.', M.Pontifical],
    ['Pavillon de l’Espagne', 'expo', 'Le pavillon de la République espagnole en guerre, par Josep Lluís Sert et Luis Lacasa : une ossature d’acier apparente, du verre et de l’éternit, monté en quelques semaines. On y voit Guernica de Picasso, la Fontaine de mercure de Calder, Le Faucheur de Miró ; devant l’entrée, la colonne d’Alberto. Sa place et son volume sont une évocation.', M.Espagne],
    ['Pavillon de la Pologne', 'expo', 'Une rotonde en forme de tour, en pierre blanche, et des galeries et des portiques dans la verdure des jardins du Trocadéro. Sa place et son volume sont une évocation.', M.Pologne],
    ['Sections étrangères du Trocadéro', 'expo', 'Dans les jardins, de part et d’autre du grand bassin de la fontaine de Varsovie : à l’ouest, la Finlande d’Alvar Aalto, le Japon de Junzō Sakakura sur pilotis, l’Autriche, la Roumanie, la Hongrie, l’Égypte… ; à l’est, les Pays-Bas, la Norvège, la Grèce, l’Argentine, le Saint-Siège, l’Espagne, la Pologne. Leur ordre vient du plan général de l’Exposition ; leurs emprises et leurs volumes sont une évocation.', { x: AXE.P(-470, 0)[0], z: AXE.P(-470, 0)[1], top: T.height(...AXE.P(-470, 0)) + 40 }],
    ['Pavillon de l’Italie', 'expo', 'Par Marcello Piacentini, sur le quai d’Orsay : une tour carrée qui domine l’ensemble, surmontée du Génie du fascisme à cheval, et deux corps qui encadrent une cour-jardin ouverte sur la Seine. À côté, la Belgique et la Suisse, cage d’acier vitrée posée du quai à la berge. Places et volumes d’après le plan général et L’Architecture d’aujourd’hui ; une évocation.', M['Pavillon Italie']],
    ['Centre des métiers', 'expo', 'Sur le terrain du quai d’Orsay entre l’avenue de La Bourdonnais et l’avenue Rapp, là où est aujourd’hui le musée du quai Branly : ameublement, verrerie, céramique, ferronnerie, luminaire, mode, tourisme, thermalisme… Les halles sont une évocation.', M.CentreMetiers],
    ['Centre régional', 'expo', 'Sur le quai, entre la tour et le pont de Passy, vingt-cinq pavillons des provinces françaises, chacun dans le style de sa région — la Bretagne au bord de la Seine, la Provence, l’Alsace, la Savoie… Leur disposition et leurs silhouettes sont une évocation.', M.CentreRegional],
    ['Centre des colonies', 'expo', 'Sur l’île aux Cygnes, élargie de plates-formes au-dessus de l’eau : le Maroc, l’Algérie, la Tunisie, l’Afrique-Occidentale et l’Afrique-Équatoriale françaises, Madagascar, l’Indochine, les Antilles… Leurs silhouettes sont une évocation.', M.Colonies],
    ['Pavillon de l’Hygiène', 'expo', 'Par Robert Mallet-Stevens et Coulon, sur la berge de la rive droite : de longues galeries en fer à cheval, que deux rampes relient au quai. Son volume est une évocation.', M.Hygiene],
    ['Pavillon du Yachting', 'expo', 'Sur la berge de la rive droite, en aval des musées d’art moderne : 100 mètres sur 20, sur des poteaux qui laissent la berge libre aux promeneurs ; un restaurant sur une terrasse ronde au-dessus de la Seine, un sémaphore et son grand pavois. Cotes de L’Architecture d’aujourd’hui ; une évocation.', M.Yachting],
    ['Palais de la Lumière', 'expo', 'Par Robert Mallet-Stevens, au bout du Champ-de-Mars, devant l’École militaire : un mur courbe de 600 m² ferme la perspective, où l’on projette le soir des films en grand écran. Dans le hall, La Fée Électricité de Raoul Dufy, 60 mètres sur 10, le plus grand tableau du monde. Une évocation.', M.Lumiere],
    ['Pavillon de la Publicité', 'expo', 'Sous les platanes de l’allée ouest du Champ-de-Mars : une galerie de 150 mètres, une façade de 15 mètres pour les affiches et les enseignes lumineuses, un plan incliné de 28 mètres au-dessus de l’entrée, trois halls de 17 mètres derrière. Cotes de L’Architecture d’aujourd’hui ; une évocation.', M.Publicite],
    ['Porte d’honneur', 'expo', 'Par Jacques Debat-Ponsan, sur le Cours-la-Reine, au débouché du pont Alexandre-III : un « signal », mât d’acier en fuseau de 100 mètres posé sur une rotule à 5 mètres, tenu par trois nappes de haubans ancrées à 41 mètres, qui porte une couronne de 7 mètres. Cotes de L’Architecture d’aujourd’hui ; une évocation.', M.PorteHonneur, 1],
    ['Porte de l’Alma', 'expo', 'La porte monumentale en bois des architectes M. et L. Solotareff et H. Bard, au centre de l’Exposition : la place et le pont restant ouverts aux voitures, le public passe au-dessus d’elles. Deux pylônes de charpente de 50 mètres, chacun flanqué d’un mât de 44 mètres taillé dans un seul arbre, encadrent une plate-forme à 6 mètres du sol, où mènent un escalier d’honneur et deux passerelles de 44 mètres de portée venues des angles de l’avenue George-V ; de là, une passerelle à gradins rejoint le sommet d’un arc de 65 mètres parallèle à la Seine, qui relie les deux moitiés de l’Exposition. Cotes et plans de L’Architecture d’aujourd’hui (septembre 1937) ; la teinte du bois et le détail des charpentes sont une évocation.', M.PorteAlma, 1],
    ['Passerelle de l’Alma', 'expo', 'Par l’architecte Léon-Henry Bloch, parallèle au pont de l’Alma et réservée au public de l’Exposition : 133 mètres en trois travées, une poutre-caisson d’acier de 6 mètres de large et 6,80 mètres de haut qui abrite des boutiques, un passage en haut et un passage au pied, chacun élargi en encorbellement. 88 pieux en Seine, 700 tonnes d’acier ; elle a été démontée après l’Exposition. Cotes et place de L’Architecture d’aujourd’hui (août 1937) : ses palées sont à une quinzaine de mètres en aval des piles du pont.', M.PasserelleAlma],
    ['Concessions scientifiques et d’art', 'expo', 'Sur la rive droite, de l’Alma au pont des Invalides, une file de pavillons sur la berge et le quai. Leurs places et leurs volumes sont une évocation.', M.Concessions],
    ['Palais de l’Air', 'expo', 'Sur l’Esplanade des Invalides, au-dessus de la gare : 166 mètres sur 36, 20 et 21 mètres de haut, une coupole de rhodoïd où monte une rampe en spirale, une lanterne. Robert et Sonia Delaunay en ont peint les grands panneaux. En face, le palais des Chemins de fer, que les Delaunay ont aussi décoré. Cotes de L’Architecture d’aujourd’hui ; une évocation.', M.PalaisAir, 1],
    ['Palais des Chemins de fer', 'expo', 'Sur l’Esplanade des Invalides, face au palais de l’Air : les grandes peintures murales de Robert et Sonia Delaunay et de cinquante peintres, dont Rythmes sans fin. Sa place et son volume sont une évocation.', M.PalaisRail],
    ['Planétarium', 'expo', 'Le premier planétarium de France, dirigé par l’astronome Reysa Bernson, dans le parc d’attractions de l’Esplanade des Invalides : 800 000 visiteurs en six mois. Sa place et son volume sont une évocation.', M.Planetarium],
    ['Pont Alexandre-III', 'expo', 'Une seule arche d’acier de 107 mètres entre les Invalides et les deux palais, inaugurée avec l’Exposition de 1900 ; aux quatre coins, des pylônes de 17 mètres portent des Renommées dorées. Les pylônes sont une évocation.', M.AlexandreIII, 1],
  );
}
