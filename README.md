# Paris à travers le temps — maquettes 3D interactives de Lutèce, de Paris en 1380, en 1789 et en 1889

Paris de Lutèce à 1889 : huit dates et quatre maquettes détaillées — Lutèce vers 250, 1380, 1789 et 1889. La première page est une restitution
en trois dimensions de Paris à la fin du règne de Charles V (vers 1380-1400), consultable dans un navigateur :
survol libre, cinq parcours commentés, promenade à pied dans des rues peuplées et jusque dans la campagne, histoire de
chaque monument, visite de leurs intérieurs, mini-plan et boussole, heure du jour réglable, calque montrant ce qui est
attesté, restitué ou conjectural, et frise des époques qui superpose à la maquette le Paris d'autres dates, de Lutèce à 1836.

Une seconde page, **Paris 1789**, montre la ville à la veille de la Révolution, dans le mur des Fermiers généraux :
plus de vingt mille bâtiments dressés d'après leur emprise réelle, la Seine, le relief, une cinquantaine de repères,
le survol, une visite guidée et la promenade à pied.

Une troisième page, **Lutèce**, montre la ville gallo-romaine vers 250 : le forum, les deux thermes, le théâtre et les
arènes sur la colline de la rive gauche, l'île et ses deux ponts de bois, un fleuve plus large qu'aujourd'hui, d'après
la restitution de Théodore Vacquer.

Une quatrième page, **Paris 1889**, montre tout Paris dans l'enceinte de Thiers l'année de l'Exposition universelle :
près de quatre-vingt mille bâtiments, neuf gares et leurs voies ferrées, et un curseur de date qui fait monter la tour
Eiffel et les palais du Champ-de-Mars, de janvier 1887 au 6 mai 1889 ; un calque dit d'où vient chaque maison.

Les trois dernières ont chacune leur visite guidée (quinze étapes en 1789, douze pour Lutèce, quatorze en 1889).

Une **page d'accueil** héberge les quatre maquettes et fait passer de l'une à l'autre sans changer de page : on choisit
« Lutèce », « 1380 », « 1789 » ou « 1889 » dans la frise des époques, l'autre ville se construit en arrière-plan, puis, au même point de vue
et à la même heure, la ville s'enfonce dans le sol, les deux plans se fondent et l'autre ville s'élève.

**Voir les maquettes en ligne** (GitHub Pages) : <https://calyzo-cpmo.github.io/paris-1380/> s'ouvre sur Paris 1380 ; <https://calyzo-cpmo.github.io/paris-1380/1789.html> s'ouvre sur Paris 1789 ; <https://calyzo-cpmo.github.io/paris-1380/lutece.html> s'ouvre sur Lutèce ; <https://calyzo-cpmo.github.io/paris-1380/1889.html> s'ouvre sur Paris 1889. Les quatre adresses mènent à la page d'accueil, `dist/index.html`, qui héberge les maquettes `dist/lutece.html`, `dist/1380.html`, `dist/1789.html` et `dist/1889.html`.
**Les ouvrir sur son ordinateur :** `dist/index.html` (les cinq fichiers de `dist/` côte à côte, aucun serveur nécessaire) ; chaque maquette s'ouvre aussi seule.
**La mettre en ligne :** voir [`DEPLOIEMENT.md`](DEPLOIEMENT.md) (Dockerfile nginx, hébergement statique).

## Ce que montre la maquette

- la Seine, ses îles (Cité, île Notre-Dame, île aux Vaches, île des Javiaux) et le relief (montagne Sainte-Geneviève, Montmartre) ;
- les deux enceintes — Philippe Auguste (1190-1215) et Charles V (1356-1383) — avec leurs tours, leurs portes et leurs fossés ;
- Notre-Dame, le Palais de la Cité et la Sainte-Chapelle, le Louvre de Charles V, la Bastille, le Temple, les Châtelets, la tour de Nesle ;
- les ponts habités (Grand-Pont, Petit-Pont, pont Saint-Michel), le pont aux Meuniers et ses moulins ;
- une centaine d'églises, couvents, abbayes, collèges, hôtels princiers, halles et cimetières sur leurs emprises ;
- environ 17 000 maisons à pans de bois loties le long de toutes les rues ;
- la campagne, les faubourgs, le gibet de Montfaucon, les moulins à vent, les bateaux des ports ;
- **la vie** : jusqu'à 4 800 passants, cavaliers, charrettes et bêtes qui circulent dans les rues autour du point de vue
  (moins nombreux la nuit), 3 800 figurants (marchands, sergents aux portes et sur les murs, moines, ouvriers, lavandières,
  bergers et troupeaux), bateaux en route sur la Seine, roues des moulins, bannières, vols d'oiseaux ;
- **les personnages** : à moins d'une centaine de mètres, des corps modelés, seize visages peints (barbes, rides, coiffes
  et guimpes) et seize costumes de la fin du XIVe siècle — cotte et chaperon, pourpoint mi-parti, tablier de cuir de l'artisan,
  houppelande fourrée, robe et tablier, habits des moines, cotte d'armes fleurdelisée des sergents ; au-delà, des silhouettes simples ;
- **l'histoire de chaque lieu** : un clic sur un monument (ou sur son nom) ouvre sa fiche et sa chronologie, avant et après 1380 ;
- **57 intérieurs visitables**, comme dans une visite virtuelle (glisser pour regarder, cliquer le sol pour avancer) :
  Notre-Dame (nef, transept, roses, chœur clos), chapelle haute de la Sainte-Chapelle, Grand'Salle du Palais, librairie de
  Charles V au Louvre, chambre de l'horloge, salle des malades de l'Hôtel-Dieu, frigidarium des thermes de Cluny, réfectoire
  des Bernardins, chambre du roi à Vincennes, églises, hôtels, halles, corps de garde des portes et des tours ;
- **les abords** : au-delà des murs, des champs en lanières, des haies vives, des vignes sur les coteaux, des prés au bord
  de l'eau, les marais maraîchers du nord, des vergers autour des villages, des bois en volume, la Bièvre et ses saules,
  des croix de chemin, des bergers et leurs troupeaux ; une couronne de plateaux ferme l'horizon et le sol se prolonge
  dans la brume jusqu'à 27 km ;
- **le détail** : façades en double définition, auvents, enseignes, lucarnes, tonneaux, 190 étals de marché, puits, rues pavées,
  contreforts et croix des églises, archères des tours, échafaudages et grues des chantiers (Bastille, pont Saint-Michel,
  églises en construction), meules, 27 villages des environs, château de Vincennes, chartreuse de Vauvert.

## Parcourir la maquette

- **Accueil** : une fois la ville construite, trois portes d'entrée — suivre une visite guidée, explorer la maquette,
  descendre dans les rues. Un lien partagé rouvre directement sa vue.
- **Lieux** : chaque lieu porte une pastille à la couleur de sa catégorie ; les grands lieux affichent leur nom, les autres
  apparaissent en s'approchant ou au survol, et une petite arche signale les intérieurs à visiter. La liste se filtre
  (intérieurs, lieux pas encore vus) et tient un carnet de visite : lieux vus, intérieurs visités, parcours suivis,
  conservés dans le navigateur.
- **Parcours commentés** : le grand tour, le Paris de Charles V, les deux enceintes, la Seine et ses ponts, l'Université.
  Barre de progression, pause, accès direct à une étape, entrée dans le monument de l'étape, tracé sur le mini-plan.
- **À pied** : on arrive face au monument, avec du recul ; glisser pour regarder, cliquer le sol pour avancer, ou marcher
  au clavier. Les noms des lieux proches restent affichés avec leur distance ; devant un monument, on peut lire sa fiche
  ou y entrer, puis ressortir au même endroit. Un double-clic sur la maquette fait descendre à cet endroit, y compris
  hors des murs.
- **Se repérer** : mini-plan de 1380 (position, direction du regard, clic pour s'y rendre, échelle de la ville ou du
  quartier), boussole qui remet le nord en haut, retour à la vue d'ensemble, et indication de la rive, de la rue
  (une centaine de rues nommées sur le plan) ou du lieu voisin.
- **Heure** : curseur, quatre moments de la journée, journée en accéléré.
- **Degré de certitude** : un calque teinte chaque volume — restitué d'après images et vestiges, emprise attestée par le
  plan, conjectural, hors du plan — et chaque fiche l'indique.
- **Époques** : une frise pose sur la maquette de 1380 le Paris de huit dates — Lutèce, 1300, 1380, 1553, 1652, 1741,
  1789, 1836. Pour les époques antérieures, ce qui n'existe pas encore passe en pointillé et le tracé d'alors se dessine
  au sol (rues et monuments de Lutèce, îlots de 1300) ; pour les époques postérieures, les quartiers bâtis depuis 1380
  sont dessinés en maisons le long des rues — à pans de bois en 1553, enduites à hautes fenêtres ensuite —, les édifices
  postérieurs et les nouvelles enceintes (Fossés jaunes, Fermiers généraux) en pierre, les établissements religieux en
  pastilles, et le mini-plan passe à l'échelle de l'agglomération. Lutèce et 1789, en doré comme 1380, ouvrent leur propre
  maquette détaillée. Chaque date a son texte, sa légende, ses chiffres et ses crédits ; un bouton fait défiler toute la
  frise. À pied, les maisons du calque se contournent comme les autres.
- **Partager** : l'adresse de la page suit la vue, l'heure, la fiche ouverte et l'époque ; le bouton « Partager » la copie.
- **Téléphone** : barre du bas sur une ligne, fiche en volet à déplier, menus repliés.

Raccourcis : `/` recherche d'un lieu, `N` nord en haut, `O` vue d'ensemble, `M` mini-plan, `T` frise des époques ; à pied, `E` entrer, `F` fiche,
`V` regard à la souris, `Échap` pour remonter.

## Paris 1789 — la seconde maquette

- **Ce qu'elle montre** : Paris dans le mur des Fermiers généraux (9,8 × 7,5 km de terrain modelé) ; 20 334 corps de
  bâtiment posés sur leur emprise réelle, façades enduites à hautes fenêtres, combles brisés d'ardoise à lucarnes,
  toits de tuile à deux versants, souches de cheminée ; la Seine entre ses quais de pierre, ses îles et ses ponts à
  arches ; le relief ; les rues pavées, les jardins et les places ;
  21 monuments (Notre-Dame sans la flèche de sa croisée, Bastille, Invalides et leur dôme, École militaire, Luxembourg, Saint-Sulpice,
  Sainte-Geneviève, Val-de-Grâce, Observatoire, tour du Temple, portes Saint-Denis et Saint-Martin, barrières de
  Ledoux…) et 44 paroisses, bâties en églises là où l'atlas garde leur emprise, signalées par un clocher ailleurs ; jusqu'à 4 400 habitants en costumes de la fin du XVIIIe siècle (veste et
  gilet, habit et tricorne, tablier d'artisan, gardes-françaises, abbés, robes à l'anglaise, fichus et bonnets),
  cavaliers et charrettes dans les rues de la ville dense ; 53 repères avec une courte notice ; le nom de la rue où l'on se trouve, tiré du plan de
  Verniquet (1 194 noms, dans leur graphie d'époque).
- **Ce qu'on y fait** : survoler, suivre la visite guidée — « Paris en 1789 », de la Cité à la Bastille, en quinze
  étapes —, descendre à pied par un double-clic ou depuis une fiche, régler l'heure (les fenêtres s'éclairent la nuit),
  se repérer au mini-plan et à la boussole, partager une vue par son adresse. Les étiquettes ne se chevauchent pas :
  quand deux noms se gêneraient, le moins important se réduit à sa pastille.
- **D'où viennent les données** (toutes du SIG ALPAGE, licence ODbL 1.0) :

| Élément | Couche et crédit | Date du relevé |
| --- | --- | --- |
| Îlots, Seine | plan de Verniquet — © ALPAGE : P. Rouet | 1782-1790 |
| Rues nommées | plan de Verniquet — © ALPAGE : L. Hermenault | 1782-1790 |
| Emprise des bâtiments | Atlas par îlots de Vasserot — Arch. nat. F31 73-96 – Arch. Paris © ALPAGE : A.-L. Bethe | 1810-1836 |
| Mur des Fermiers généraux | © ALPAGE : P. Rouet, d'après Verniquet | 1784-1790 |
| Relief | nivellement de P.-S. Girard — © ALPAGE : M. Fernandez | 1805-1807 |
| Établissements religieux | © ALPAGE : É. Lallau | état de 1789 |
| Enclos nommés (places, jardins, hôpitaux, palais) | parcelles de l'Atlas de Vasserot — © ALPAGE : A.-L. Bethe | 1810-1836 |
| Emprise de la Bastille | © ALPAGE : N. Faucherre | restitution |

- **Ce qu'il faut savoir** :
  - aucune couche ne date exactement de 1789. L'emprise des bâtiments vient de Vasserot, postérieur d'une génération :
    c'est la source la plus proche qui donne chaque bâtiment, et quelques édifices qu'elle montre sont postérieurs à
    la Révolution ;
  - la hauteur des maisons (cinq étages au centre, deux vers le mur), leurs façades, la forme de leurs combles, leur
    couverture d'ardoise ou de tuile et leurs cheminées sont conventionnelles ;
  - du Cours-la-Reine à l'Arsenal, les rives sont figurées en quais de pierre continus, trois mètres en avant du tracé
    du plan, alors que plusieurs grèves descendaient encore en pente jusqu'à l'eau ; les arches des ponts sont peintes
    sur leurs flancs (nombre et portée de convention) et l'on ne passe pas dessous ;
  - 550 îlots, surtout dans les faubourgs, ne sont pas couverts par l'atlas : leur bâti est évoqué par un front de
    maisons le long des rues ;
  - les monuments sont placés et orientés d'après les données (emprise donnée par l'atlas, enclos qu'il nomme,
    coordonnées géographiques) et dimensionnés d'après ce que l'on sait de chaque édifice ; leur détail est une
    évocation, et la hauteur des clochers est conventionnelle. Trois établissements des faubourgs que l'atlas ne couvre
    pas — la Salpêtrière et sa chapelle à dôme, les Gobelins, la maison Saint-Lazare — sont évoqués, placés par leurs
    coordonnées et orientés sur la rue la plus proche, et leur fiche le dit ;
  - hors du mur, une douzaine de moulins à vent couronnent la butte Montmartre ; le nivellement de Girard ne couvrant
    pas la butte, ils sont posés à plat autour de son sommet, en nombre et à des places de convention ;
  - les habitants sont une évocation ; ils ne circulent que dans la ville dense (5 × 4,2 km autour du centre) ;
  - il n'y a pas encore d'intérieurs ;
  - les repères nommés sont placés par leurs coordonnées géographiques, à quelques dizaines de mètres près.

## Lutèce — la troisième maquette

- **Ce qu'elle montre** : la ville gallo-romaine vers 250, à son apogée, avant les invasions de la fin du IIIe siècle
  (5 × 5 km de terrain modelé). Sur la colline de la rive gauche, le forum — esplanade fermée de boutiques, temple sur
  podium, basilique —, les thermes du Nord (ceux de Cluny) et de l'Est, voûtés, le théâtre et, à l'écart, les arènes ;
  le cardo, qui descend la colline et franchit les deux bras du fleuve par deux ponts de bois ; l'île, basse et peu
  bâtie ; un fleuve large de trois cents à sept cents mètres, ses sept îles et ses grèves ; la Bièvre ; les bras morts
  et les prés inondables de la rive droite ; environ 1 700 maisons le long des rues, leurs jardins, les bois ; des
  habitants en costume gallo-romain ; quinze repères avec leur notice.
- **D'où viennent les données** : rues, rivages et emprise des cinq monuments sont la restitution de Théodore Vacquer,
  numérisée par le projet ALPAGE (© ALPAGE : M. Fernandez ; monuments © ALPAGE : P. Rouet, licence ODbL 1.0) — les
  mêmes couches que la date « Lutèce » de la frise. Le relief est celui du nivellement de Girard (1805-1807).
- **Ce qui est attesté, ce qui est évoqué** (le panneau « Sources » de la page le détaille) :
  - attesté par les fouilles : le tracé des rues retrouvées, les rives et les îles, les ruisseaux, l'emplacement et
    l'emprise au sol du forum, des deux thermes, du théâtre et des arènes ;
  - évoqué : toutes les maisons — elles bordent les rues restituées, serrées autour du forum, clairsemées vers les
    champs —, l'élévation des monuments, la forme des ponts (placés là où le cardo franchit l'eau), les bois et les
    cultures ; le pilier des Nautes et les tombeaux de la route du sud sont placés par convention ;
  - décalage de date : le relief est moderne. Près des rives et dans les îles, le sol a été rabattu pour retrouver
    des berges basses ; les grands édifices sont posés sur des terrasses de niveau.
- **Visite guidée** : « Lutèce vers 250 », douze étapes, de l'île et du pont de bois au forum, aux thermes, au théâtre et
  aux arènes, du matin au soir.
- **Technique** : la page réutilise l'application de Paris 1789, à laquelle la ville est fournie comme un « monde »
  (cadre, terrain, sol peint, construction, habitants). Elle ne transporte que ses propres données : 810 Ko, une ville
  bâtie en quelques secondes, cinquante mille triangles.

## Paris 1889 — la quatrième maquette

- **Ce qu'elle montre** : tout Paris dans l'enceinte de Thiers (12,4 × 10 km), l'année de l'Exposition universelle :
  79 000 bâtiments, la Seine et une quarantaine de ponts, les canaux, les jardins, les bastions de l'enceinte, le
  relief des collines. Sur le Champ-de-Mars, la tour de 300 mètres, la Galerie des machines, le Dôme central, les
  palais des Beaux-Arts et des Arts libéraux ; en face, le palais du Trocadéro de 1878.
- **Visite guidée et origine du bâti** : « Paris en 1889 », quatorze étapes de l'Exposition au cœur de la ville. Le
  bouton « Origine du bâti » teinte chaque maison selon ce qui la justifie — réelle, probable, disparue, évoquée (voir
  ci-dessous) — ; les monuments, les gares, les édifices et l'Exposition, modelés à part, gardent leur couleur.
- **La tour se monte** : un curseur de date va du 1er janvier 1887 au 6 mai 1889. Fondations, piles inclinées sur leurs
  échafaudages de bois, jonction du premier étage (7 décembre 1887), deuxième étage (14 août 1888), sommet
  (31 mars 1889) ; les palais s'élèvent en même temps. Un bouton fait défiler tout le chantier en 45 secondes.
- **D'où vient la ville** : aucune base ne décrit le bâti de 1889 maison par maison. La ville est recomposée, et chaque
  bâtiment garde la trace de ce qui le justifie : **réel** (42 000 bâtiments d'aujourd'hui que l'APUR date de 1889 ou
  d'avant, avec leur emprise et leur hauteur), **probable** (6 800 bâtiments de 1851-1914 sans année, dans un
  voisinage ancien), **disparu** (4 600 emprises de l'atlas de Vasserot, là où le bâtiment actuel est plus récent),
  **évoqué** (25 600 maisons, sur l'emprise actuelle ou le long des rues de 1900, d'autant plus serrées que le
  voisinage garde de bâtiments anciens). Îlots, rues et enceinte viennent de la base « Paris 1900 ».
- **Monuments** : le corps de chaque édifice vient des données ; dômes, tours, flèches et colonnes y sont ajoutés à leur
  hauteur connue (Invalides, Panthéon, Notre-Dame, Saint-Sulpice, Opéra, Institut, Saint-Augustin, la Trinité,
  Saint-Vincent-de-Paul, colonnes Vendôme et de Juillet, obélisque), l'Arc de triomphe est bâti entier, le Sacré-Cœur
  est montré en chantier. Les passants sont en costumes de 1889 : blouse bleue, redingote et haut-de-forme, canotier,
  robe à tournure, fantassin en pantalon garance.
- **Édifices publics** : l'Hôtel-Dieu, rebâti de 1866 à 1877 au nord du parvis, occupe tout son îlot de 1900 — corps
  sur le parvis et sur le quai, pavillons de malades de part et d'autre d'une cour-jardin à galeries, chapelle au fond ;
  les maisons que l'atlas de Vasserot dessinait là sont écartées. Les autres édifices gardent le volume des données, et
  reçoivent leur silhouette : campanile et combles d'angle de l'Hôtel de Ville, tour de l'Horloge et tours rondes de la
  Conciergerie (aux places de la maquette de 1380), flèche de la Sainte-Chapelle (75 m), tour Saint-Jacques (52 m),
  dômes du Val-de-Grâce, de la Sorbonne et de Saint-Paul (aux cotes de la page de 1789), flèches de Sainte-Clotilde
  (69 m), portes Saint-Denis et Saint-Martin, que les données donnent comme des bâtiments à leur place exacte.
- **Disparus depuis** : les dix pavillons des Halles de Baltard, chacun sur son îlot de 1900, et le palais de
  l'Industrie le long des Champs-Élysées (le Grand et le Petit Palais, de 1900, sont écartés).
- **Rues et quais** : la rue est l'espace laissé libre par les îlots de 1900 ; le sol y dessine trottoirs, bordures et
  chaussée pavée, nets à toute échelle (carte de distance lue par le shader) ; le trottoir prend un cinquième environ
  de la largeur de la voie. Trente-neuf mille arbres d'alignement bordent les boulevards, les avenues et les quais
  (voies de 24 m et plus : une évocation ; les places restent minérales). La Seine coule entre des murs de quai ; une
  trentaine de ponts, chacun bâti d'une rive à l'autre quel que soit le découpage de la base de 1900.
- **La vie** : dix-huit trains — locomotive, tender, voitures — vont et viennent sur les plus longs parcours que forment
  les voies raccordées bout à bout (de un à deux kilomètres et demi : les faisceaux et les aiguillages les arrêtent) ;
  près de deux cents péniches sont amarrées le long des ports bas, huit vapeurs remontent et descendent la Seine. Sur
  ordinateur, les combles brisés portent leurs souches de cheminée à mitres de terre cuite (plus de quatre-vingt mille),
  montrées près de la caméra seulement. Les passants ne circulent qu'autour de l'Exposition. Trains et bateaux sont une
  évocation : ni horaires ni lignes de navigation ne sont figurés.
- **Ports bas** : une quinzaine de kilomètres de ports, deux mètres au-dessus de l'eau, au pied du mur du quai haut.
  Ils sont tirés de la base de 1900, qui nomme leurs voies (« Port Saint-Nicolas », « Port de la Tournelle »…) : là où
  une telle voie longe la rive, le port va du bord de l'eau à deux fois la distance de la voie, sans entamer la rue du
  quai haut ; il est écarté le long des voies ferrées et sur l'Exposition. Le terrain y est abaissé, un mur à parapet
  le sépare du quai haut, un mur en travers le ferme à chaque bout ; les ponts vont d'un quai haut à l'autre, par-dessus.
  Largeur et niveau sont des conventions ; les rampes ne sont pas figurées (on descend sur un port par un double-clic).
- **Chemins de fer** : 580 km de voies, posées sur le sol avec leur ballast, leurs traverses et leurs rails. Aucune base
  ne donne les voies de 1889 ; elles sont recomposées comme le bâti, et chaque voie garde la trace de ce qui la
  justifie : **actuelle** (546 km : voies d'aujourd'hui, d'après l'APUR, posées sur une emprise du chemin de fer qui
  existait en 1889 — faisceaux des six grandes gares, ligne de Sceaux, Petite Ceinture, embranchement du Champ-de-Mars ;
  le métro, le tramway et les lignes ouvertes depuis sont écartés), **restituée** (5 km : ligne déposée, tracée dans
  l'axe de l'emprise qui subsiste — Petite Ceinture, ligne d'Auteuil le long du boulevard Pereire), **évoquée** (31 km :
  tracé le long des rues de 1900 que la ligne longeait — ligne d'Auteuil de la porte Maillot au viaduc du
  Point-du-Jour, Petite Ceinture le long des rues Leibniz et Belliard, ligne de Vincennes sur le viaduc de l'avenue
  Daumesnil puis vers Bel-Air, arrivée à l'ancienne gare Montparnasse, gare du Champ-de-Mars). Les viaducs portent leurs
  voies en hauteur, sur des arches de convention ; le viaduc d'Auteuil franchit la Seine au-dessus de la route.
- **Gares** : neuf gares bâties au bout de leurs voies — Saint-Lazare (rebâtie de 1885 à 1889, avec l'hôtel Terminus),
  Nord, Est (la seule moitié ouest de la gare d'aujourd'hui), Lyon (l'embarcadère de 1855), Orléans, Montparnasse (la
  gare de 1852, face à la rue de Rennes, voies à l'étage), la Bastille, Sceaux et la gare du Champ-de-Mars bâtie pour
  l'Exposition. La portée et la longueur des grandes halles sont celles du temps ; façades, pavillons et hauteurs sont
  une évocation.
- **Ce qu'il faut savoir des chemins de fer** : les faisceaux d'aujourd'hui sont souvent plus larges que ceux de 1889,
  dans Paris comme au-delà des fortifications ; les tranchées ne sont pas creusées (les voies y sont posées au niveau
  du sol, et croisent les rues à niveau) ; les souterrains de Belleville, de Charonne et de Montsouris ne sont pas
  tracés, ni le raccordement de Courcelles ; les stations de la Petite Ceinture et les gares de marchandises ne sont
  pas modelées ; il n'y a pas de trains.
- **Ce qui manque encore** : les rampes et la vie des ports, les pavillons de l'esplanade des Invalides, la banlieue ;
  les autres églises et édifices publics sont rendus par leur seul volume. La maquette vise l'ordinateur et la
  tablette ; sur téléphone, les toits sont simplifiés.

## Sources

Le tracé (rues, îlots, enceintes, emprises des édifices) provient intégralement du
**« Plan restitué de Paris en 1380 »** — J. Leuridan et J.-A. Mallet, CNRS Éditions, 1991-1999 ; infographie C. Roms,
UMR 8589 LAMOP, 2006 — diffusé par le projet [ALPAGE](https://alpage.huma-num.fr/maps/) sous licence
[CC BY-SA 2.0 FR](https://creativecommons.org/licenses/by-sa/2.0/fr/). Le fichier d'origine est conservé dans
`data/source/Paris_1380.svg` ; `data/paris1380.json` en est une conversion en mètres, soumise à la même licence
(attribution et partage à l'identique).

Les élévations s'appuient sur les images du XVe siècle (Très Riches Heures du duc de Berry, Jean Fouquet, retable du
Parlement de Paris…), les premiers plans gravés du XVIe siècle (Truschet et Hoyau, Braun et Hogenberg…) et les
monuments conservés. Le catalogue complet, avec ce que chaque document apporte au modèle, est dans `src/sources.js`
et dans le panneau « Sources » de la page.

### Calque des époques

Les autres dates viennent du **SIG historique ALPAGE** (AnaLyse diachronique de l'espace urbain PArisien : approche
GEomatique), dont les couches sont publiées sur <https://alpage.huma-num.fr/donnees-sig/> sous licence
[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). `data/epoques.json` en est une base dérivée : géométries
simplifiées, recalées sur le repère de la maquette (257 îlots communs aux deux sources, écart médian 2,3 m, 4,9 m au
9e décile) et réduites aux attributs utiles. Elle est diffusée sous la même licence.

| Date | Ce que montre le calque | Couche et crédit |
| --- | --- | --- |
| Lutèce (Haut-Empire) | rues, rivages, cinq monuments | restitution de T. Vacquer — © ALPAGE : M. Fernandez ; monuments © ALPAGE : P. Rouet |
| 1300 | îlots d'habitation d'après les rôles de la taille de 1299 et 1300 | © ALPAGE : IRHT (C. Bourlet), A.-L. Bethe |
| 1553 | îlots du plan de Truschet et Hoyau, dit de Bâle | © ALPAGE : D. Gherdevich, H. Noizet |
| 1652 | îlots du plan de Gomboust | © ALPAGE : D. Gherdevich, H. Noizet |
| 1741 | îlots du plan de Delagrive | © ALPAGE : D. Gherdevich, H. Noizet |
| 1789 | îlots et Seine du plan de Verniquet (levé de 1782 à 1790) | © ALPAGE : P. Rouet |
| 1836 | îlots et Seine de l'Atlas de Vasserot (1810-1836) | Arch. nat. F31 73-96 – Arch. Paris © ALPAGE : P. Rouet |
| toutes | enceintes, de la muraille romaine de la Cité au mur des Fermiers généraux | © ALPAGE : A.-L. Bethe, Y. Brault, N. Faucherre, D. Gherdevich, H. Noizet, P. Rouet |
| 1300 à 1791 | établissements religieux, avec leurs dates de fondation et de disparition | © ALPAGE : É. Lallau |
| après 1380 | édifices postérieurs à 1380 situés sur le plan restitué | © ALPAGE : P. Rouet |

Ce que le calque affirme et ce qu'il n'affirme pas : seules les **emprises au sol** viennent des données. Les maisons
qui bordent les îlots bâtis après 1380 sont une évocation (`src/epochfabric.js`) : leur nombre, leur hauteur, leur style
et leurs toits sont de convention, comme le détail des édifices postérieurs ; les îlots de densité intermédiaire sont
bâtis de façon clairsemée. La densité des îlots est celle que figurent
les plans de 1553, 1652 et 1741 ; pour 1791 et 1836, faute de cette information, la taille de l'îlot en tient lieu et
la légende le dit. En 1300, la limite de l'urbanisation de la rive droite n'est pas connue : les îlots extérieurs ont
été prolongés jusqu'au futur mur de Charles V par les auteurs de la couche. Les dates des enceintes sont celles de
leurs fiches ALPAGE ; ni l'enceinte de Thiers ni le Paris d'Haussmann ne figurent dans ces données.

### Degré de certitude

| Niveau | Éléments |
| --- | --- |
| Attesté par le plan de 1380 | rues, îlots bâtis, cultures, cours de la Seine, tracé des enceintes, tours et portes, emprise au sol des édifices |
| Restitué d'après images et vestiges | volumes des grands monuments (Notre-Dame, Sainte-Chapelle, Palais, Louvre, Bastille, Temple, Châtelets) |
| Vraisemblable mais conjectural | forme de chaque maison, élévation des églises paroissiales et des hôtels, végétation, relief de détail |
| Intérieurs | dimensions connues pour Notre-Dame, la Sainte-Chapelle, la Grand'Salle, le frigidarium de Cluny, le réfectoire des Bernardins et le donjon de Vincennes ; mobilier restitué d'après textes et inventaires ; les autres intérieurs (paroisses, hôtels, corps de garde) sont des évocations, signalées dans chaque notice |
| Calque des époques | emprises des îlots, enceintes et établissements religieux issues du SIG ALPAGE, recalées à 2-3 m près ; maisons et détail des édifices évoqués ; densité de 1791 et 1836 déduite de la taille des îlots |
| Évocation | habitants, bêtes, étals, bateaux, bannières, chantiers : ils donnent l'échelle et la vie, leur place exacte est inventée ; villages, Vincennes et chartreuse sont situés d'après leur emplacement connu, hors du plan ; champs, haies, vignes, bois et relief de la campagne sont une évocation |

Le calque « Degré de certitude » (menu « Affichage ») reporte ces catégories sur la maquette : chaque étape de construction
classe les volumes qu'elle pose (`src/certainty.js`, `src/city.js`).

## Organisation

```
data/source/Paris_1380.svg   plan ALPAGE d'origine (CC BY-SA 2.0 FR)
data/paris1380.json          géométrie extraite, en mètres (origine : parvis Notre-Dame)
data/thumbs.json             vignettes des sources (domaine public)
data/epoques.json            calque des époques : enceintes, îlots de six dates, Lutèce, églises, Seine (ODbL 1.0)
data/paris1789.json          Paris 1789 : bâti, îlots, rues nommées, Seine, mur, relief, repères (ODbL 1.0)
data/source/alpage/          couches ALPAGE d'origine, non versionnées (npm run fetch:alpage)
tools/extract_alpage.py      SVG → JSON (calques, courbes aplanies, libellés)
tools/fetch_alpage.py        télécharge les vingt et une couches GeoPackage du SIG ALPAGE
tools/extract_epochs.py      GeoPackage → data/epoques.json (recalage sur la maquette, simplification, codage compact)
tools/extract_1789.py        GeoPackage → data/paris1789.json (même recalage, relief en grille, repères projetés en Lambert-93)
tools/gpkg.py                lecture des GeoPackage sans dépendance (sqlite3, géométries WKB)
data/paris1889.json          Paris 1889 recomposé : bâti (réel, probable, disparu, évoqué), îlots et rues de 1900, eau, jardins, relief, voies ferrées (actuelles, restituées, évoquées) (ODbL 1.0)
tools/fetch_1889.py          télécharge les sources de Paris 1889 (APUR, base « Paris 1900 », relief de l'IGN) dans data/source/1889/
tools/extract_1889.py        recompose la ville de 1889 à partir de ces sources et de l'atlas de Vasserot
tools/fer_1889.py            voies ferrées de 1889 : voies d'aujourd'hui sur les emprises d'alors, lignes déposées restituées ou évoquées (tracés à la main, souterrains)
tools/test1889.mjs           test fonctionnel de la page Paris 1889 : ville, Seine, ponts, ports bas, chemins de fer et gares, édifices publics, calque « origine du bâti », visite guidée, trains, bateaux et souches, tour et chantier, curseur, repères, étiquettes, téléphone
tools/build.mjs              assemble les pages autonomes de dist/ : la page d'accueil (index.html) et les maquettes (1380.html, 1789.html, lutece.html, 1889.html)
tools/shot.mjs               captures d'écran de contrôle (Playwright)
tools/test.mjs               test fonctionnel : abords, foule, étiquettes, liste et carnet, heure, parcours, marche à pied, intérieurs, repères, certitude, lien partageable, accueil, calque des époques (frise, sept dates, recalage, marche, lecture), téléphone, console sans erreur
tools/test1789.mjs           test fonctionnel de la page Paris 1789 : ville construite, monuments, habitants, relief et Seine, recalage, repères, établissements évoqués et moulins, étiquettes sans chevauchement, visite guidée, marche à pied, heure, mini-plan, lien, sources, téléphone
tools/test_lutece.mjs        test fonctionnel de la page Lutèce : plan déduit des données (fleuve, îles, ponts), terrain, ville évoquée, monuments, ponts praticables, repères, visite guidée, marche à pied, heure, frise, sources, téléphone
tools/test_accueil.mjs       test de la page d'accueil : hébergement des maquettes, passage d'une époque à l'autre (même vue, même heure, ville enfoncée puis dressée), annulation, retour, date de la frise, lien direct, téléphone
tools/test_toits.mjs         contrôle géométrique des toits de 1789, sans navigateur : l'aire de chaque toit égale celle de son emprise, cours déduites
tools/tourshots.mjs          planches-contact des parcours commentés (contrôle des cadrages)
tools/og.mjs                 images de partage (og:image) de chaque maquette, 1200 × 630, dans dist/og/
.github/workflows/tests.yml  intégration continue : construction, pages de dist/ à jour, tests des cinq maquettes en parallèle
tools/multishot.mjs          plusieurs captures de contrôle en un seul chargement
tools/inshot.mjs, uishot.mjs captures des intérieurs et de l'interface
tools/make_thumbs.py         vignettes des sources (réduction locale des images du domaine public)
src/terrain.js, raster.js    relief, berges, plateaux de l'horizon, occupation du sol, trame d'obstacles
src/grid.js, groundmat.js    maillage de terrain et matériau du sol, communs aux deux pages
src/ground.js                peinture du sol : plan de 1380, campagne proche et lointaine
src/country.js               campagne : villages, chemins, bois, parcellaire en lanières, nature des cultures
src/houses.js                lotissement des îlots et maisons
src/stonework.js             bâtisseurs de pierre communs aux deux pages : murs à baies, tours, contreforts, église générique
src/cathedral.js             Notre-Dame sur son emprise (avec ou sans la flèche de la croisée), commune aux deux pages
src/special.js               couvents, hôtels, collèges, halles, enclos de 1380
src/walls.js, monuments.js   enceintes, portes, Bastille, Louvre, Notre-Dame, Palais, ponts…
src/landscape.js             arbres, haies, bosquets, vergers, croix de chemin, bateaux à quai, fumées, moulins à vent
src/people.js                personnages articulés instanciés : foule mobile, cavaliers, charrettes, bêtes, figurants ; deux niveaux de détail (commun aux deux pages)
src/figures.js               atlas peint des visages et des costumes
src/interiors.js             générateurs d'intérieurs (nef, grande salle, tour) et conduite de la visite
src/interior_kit.js          matières, vitraux, voûtes d'ogives, arcades et mobilier des intérieurs
src/interior_specs.js        dimensions et notice de chaque intérieur
src/history.js               chronologie de chaque lieu
src/life.js                  bateaux en route, bannières, roues des moulins, oiseaux
src/props.js                 étals, puits, échafaudages, grues, marchés, chantiers, villages, Vincennes, chartreuse
src/places.js, sources.js    fiches des lieux, catalogue des sources
src/tours.js                 parcours commentés
src/certainty.js             calque « degré de certitude », pointillé de ce qui n'existe pas encore à l'époque choisie
src/epochs.js                calque des époques : jalons, peinture au sol, emprises infranchissables à pied
src/epochfabric.js           maisons évoquées et édifices de pierre des dates de la frise
src/vlq.js                   décodage des géométries compactes de data/epoques.json
src/where.js                 rives, îles et rues nommées du plan (« où suis-je »)
src/minimap.js               mini-plan
src/state.js                 carnet de visite, réglages mémorisés, lien partageable
src/shell/                   page d'accueil : héberge les maquettes dans des cadres et orchestre le passage de l'une à l'autre
src/embed.js                 liaison d'une maquette avec la page d'accueil (messages : état, préparation, enfoncement, élévation, pause)
src/layout.js                mise en page commune (hauteur réelle de la barre du bas)
src/ui.js, controls.js       interface et caméra
src/body1789.html            page Paris 1789 (mêmes styles que la première)
src/p1789/data.js            accès aux données de 1789
src/p1789/terrain.js         relief de Girard, Seine creusée d'après Verniquet et prolongée au-delà du plan, sol des quais, ports bas abaissés (1889)
src/p1789/textures.js        façades de la fin du XVIIIe siècle, brisis à lucarnes, nefs classiques, flancs de pont à arches
src/p1789/blocks.js          teintes, façades à travées, corps de bâtiment, combles (brisés, en bâtière, à croupes), souches
src/p1789/eglises.js         Notre-Dame, églises gothiques et clochers, bâtis avec src/cathedral.js et src/stonework.js
src/p1789/quais.js           murs de quai, parapets, flancs de pont à arches, dallage jusqu'au mur
src/p1789/city.js            sol peint, bâti de Vasserot en volumes, îlots évoqués, mur, arbres, collisions, rues
src/p1789/monuments.js       tours, dômes, clochers et grands ensembles posés sur les emprises et les enclos de l'atlas
src/p1789/figures.js         visages et costumes de 1789, choix du costume de chaque passant
src/p1789/places.js          repères de 1789 et leurs notices
src/p1789/app.js, ui.js      application et interface des pages Paris 1789, Lutèce et Paris 1889 : la ville leur est fournie comme un « monde » ; étiquettes sans chevauchement, mini-plan, visite guidée, calque facultatif
src/p1789/monde.js           le monde de Paris 1789 : cadre, terrain et quais, sol peint, construction, habitants
src/p1789/outils.js          outils communs aux deux villes : tracé sur le plan du sol, emprises infranchissables, arbres
src/relief.js                décodage de la grille de relief
src/bodylutece.html          page Lutèce (mêmes styles que les deux autres)
src/lutece/data.js           accès aux données de Lutèce (rues, rivages, monuments) et au relief
src/lutece/plan.js           plan de la ville : lit du fleuve et îles, ruisseaux, voies, aménagement des monuments, ponts, maisons et jardins évoqués
src/lutece/sol.js            sol peint : campagne, bois, prés inondables, bras morts, rues dallées, esplanades, fleuve
src/lutece/textures.js       murs enduits à soubassement peint, tuiles romaines, petit appareil, murs à arcades
src/lutece/ville.js          maisons, portiques du cardo, arbres, trame des passants
src/lutece/monuments.js      forum (temple, basilique, portiques), thermes voûtés, théâtre, arènes, ponts de bois, pilier des Nautes, tombeaux
src/lutece/figures.js        visages et costumes gallo-romains
src/lutece/places.js         repères de Lutèce et leurs notices
src/lutece/monde.js          le monde de Lutèce
src/body1889.html            page Paris 1889 (mêmes styles, plus le curseur du chantier)
src/p1889/data.js            accès aux données de Paris 1889 ; repère de l'Exposition
src/p1889/sol.js             sol peint : banlieue, zone et talus de l'enceinte, îlots, jardins, canaux ; carte de distance de la voirie
src/p1889/bati.js            bâtiments légers : un mur par côté, comble brisé ou toit à croupes
src/p1889/ville.js           bâti de toute la ville, enceinte, murs de quai et ponts de la Seine, arbres, trame des passants
src/p1889/fer.js             voies ferrées : rubans de ballast, de traverses et de rails, viaducs et ponts du chemin de fer, ballast peint au sol
src/p1889/gares.js           les neuf gares de 1889 : halles vitrées, bâtiments des voyageurs, pavillons
src/p1889/corps.js           corps de bâtiment communs aux gares et aux édifices : repère local, murs, combles, pavillons, frontons
src/p1889/edifices.js        Hôtel-Dieu ; silhouettes de l'Hôtel de Ville, du Palais, de la Sainte-Chapelle, de la tour Saint-Jacques, des dômes, de Sainte-Clotilde, des portes Saint-Denis et Saint-Martin
src/p1889/ports.js           rives de la Seine chaînées, ports bas tirés des voies « Port … » de la base de 1900
src/p1889/trains.js          trains : voies raccordées en parcours, locomotives, tenders et voitures qui vont et viennent
src/p1889/bateaux.js         péniches amarrées aux ports bas, vapeurs sur la Seine
src/p1889/souches.js         souches de cheminée des combles brisés, par carreaux de 500 m montrés près de la caméra
src/p1889/statuts.js         calque « origine du bâti » : trame des emprises par statut, greffée sur les matières des maisons
src/p1889/parcours.js        visite guidée de Paris 1889
src/p1789/parcours.js        visite guidée de Paris 1789
src/lutece/parcours.js       visite guidée de Lutèce
src/p1889/tour.js            la tour de 300 mètres et son chantier : treillis, étages, échafaudages, grues, date
src/p1889/expo.js            palais de l'Exposition et du Trocadéro, sol du Champ-de-Mars
src/p1889/monuments.js       silhouettes des monuments : dômes, tours, flèches, colonnes, Arc de triomphe, Sacré-Cœur en chantier, Halles, palais de l'Industrie
src/p1889/figures.js         visages et costumes de 1889
src/p1889/arbres.js          alignements d'arbres des boulevards, des avenues et des quais, d'après la largeur des voies
src/p1889/places.js          repères de Paris 1889 et leurs notices
src/p1889/monde.js           le monde de Paris 1889
```

## Reconstruire

```
npm install
npm run extract   # facultatif : régénère data/paris1380.json depuis le SVG
npm run fetch:alpage     # facultatif : télécharge les couches ALPAGE dans data/source/alpage/ (40 Mo)
npm run extract:epochs   # facultatif : régénère data/epoques.json (résultat identique à chaque exécution)
npm run extract:1789     # facultatif : régénère data/paris1789.json (idem)
npm run build     # produit dist/index.html (page d'accueil), dist/1380.html, dist/1789.html, dist/lutece.html et dist/1889.html
npm test          # toits, puis Paris 1380, Paris 1789, Lutèce, Paris 1889 et la page d'accueil, dans Chromium (Playwright requis) ; une demi-heure en rendu logiciel
node tools/og.mjs # facultatif : refait les images de partage de dist/og/ (SITE_URL=… npm run build pour un autre domaine)
```

À chaque envoi sur `main` et à chaque demande de fusion, GitHub Actions refait la construction, vérifie que les pages
versionnées dans `dist/` sont bien celles que donnent les sources, puis lance les tests des cinq maquettes en parallèle
(`.github/workflows/tests.yml`).

Dépendances : [three.js](https://threejs.org) (MIT), [clipper-lib](https://www.npmjs.com/package/clipper-lib) (BSL-1.0),
esbuild (outil de build). Toute la géométrie et toutes les textures sont générées par le code au chargement de la page.

## Licences

- **Code** (`src/`, `tools/`, `deploy/`, `Dockerfile`) : licence [MIT](LICENSE). Vous pouvez l'utiliser, le modifier et le
  redistribuer librement, y compris à des fins commerciales, en conservant la mention de copyright.
- **Plan de 1380** (`data/source/Paris_1380.svg`, `data/paris1380.json`) : [CC BY-SA 2.0 FR](https://creativecommons.org/licenses/by-sa/2.0/fr/),
  d'après J. Leuridan et J.-A. Mallet (CNRS Éditions), infographie C. Roms (LAMOP), projet ALPAGE. Toute réutilisation doit
  citer ces auteurs et partager les versions modifiées du plan sous la même licence.
- **Calque des époques, Lutèce et Paris 1789** (`data/epoques.json`, `data/paris1789.json`) : [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), base dérivée des
  couches du SIG ALPAGE. Toute réutilisation doit créditer « © ALPAGE » suivi des auteurs de chaque couche (tableau
  ci-dessus ; les données de C. Bourlet se citent « © ALPAGE : IRHT (C. Bourlet) »), et toute base dérivée rendue
  publique doit l'être sous la même licence.
- **Paris 1889** (`data/paris1889.json`) : [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), base dérivée des données ouvertes de l'Atelier parisien d'urbanisme (emprise bâtie, eau, équipements), de la base « Paris 1900 — les îlots, les voies et les adresses » (Projets Time Machine, DOI 10.34847/nkl.cbf5ecd0) et de l'atlas de Vasserot (ALPAGE) ; relief : RGE ALTI® de l'IGN, licence ouverte Etalab 2.0.
- **Pages construites** (`dist/index.html`, `dist/1380.html`, `dist/1789.html`, `dist/lutece.html`, `dist/1889.html`) : elles réunissent le code et les données. Elles se
  redistribuent librement à condition de laisser visibles les attributions du plan et des couches ALPAGE, qui figurent
  dans leur panneau « Sources ».
- **Vignettes des sources** (`data/thumbs.json`) : reproductions d'œuvres du domaine public.
