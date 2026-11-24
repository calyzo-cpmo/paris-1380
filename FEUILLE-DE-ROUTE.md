# Paris à travers le temps — feuille de route des maquettes

Décidé le 21 novembre 2026 : après Lutèce, 1380, 1789 et 1889, trois nouvelles maquettes, **dans cet ordre** :
**Paris 1900**, puis **Paris 1937**, puis **Paris 1975**. Chacune reprend le moteur de Paris 1889 (`src/p1889/`, lui-même
bâti sur l'application de 1789), entre dans la frise des époques et dans la page d'accueil, et reçoit sa visite guidée,
son calque « Origine du bâti », ses tests et son image de partage.

**Arrêté le 24 novembre 2026** : le projet s'arrête aux **six maquettes** (Lutèce, 1380, 1789, 1889, 1900, 1937). Paris
1975 a été étudié puis abandonné (`ETUDE-1975.md`, gardé pour mémoire) ; le jeu en ligne (`CADRAGE-JEU.md`) n'a pas été
engagé. Ce qui reste ouvert ne dépend plus que de sources qu'on n'a pas pu lire d'ici (voir « Ce qui reste ouvert », en
fin de document) ; ce document dit comment reprendre si l'on y revient.

## Où on en est (24 novembre 2026)

**En ligne** : six maquettes — Lutèce, 1380, 1789, 1889, 1900, **1937** — et l'**écran d'accueil** : sans adresse, le site
montre les six époques en cartes au-dessus d'une maquette « en vitrine » qui tourne lentement ; le nom du site, en tête
de chaque maquette, y ramène. Paris 1937 montre la ville de l'été 1937 (rues et îlots de 1900 corrigés, enceinte
démolie et ceinture des HBM, Chaillot, Champ-de-Mars en jardin, tour en jaune brun, Sacré-Cœur et son campanile, gare
de l'Est doublée), le Paris disparu depuis, relevé sur la photographie aérienne de 1949, la « zone » et ses baraques, des
passants en tenues des années 1930, et **son Exposition** (une centaine de pavillons, de l'île aux Cygnes à l'Esplanade
des Invalides, et la passerelle de l'Alma). Paris 1900 montre la ville à la date, la tour repeinte, le Champ-de-Mars de 1900, la
Grande Roue, le Grand et le Petit Palais, le pont Alexandre-III, la rue des Nations, la porte monumentale de Binet, les
jardins du Cours-la-Reine, la rive droite et la rue de Paris, le Vieux Paris, le palais des Armées et la passerelle
Debilly, l'Esplanade des Invalides, les colonies du Trocadéro, le palais de l'Optique, le Globe céleste, le trottoir
roulant et les entrées du métro. Un curseur montre le montage de l'Exposition, du 1er janvier 1897 au 19 juillet 1900.
Le déploiement Docker (`Dockerfile`, `DEPLOIEMENT.md`) sert les six maquettes, `1937.html` compris (il manquait
jusqu'au 24 novembre). **Rien n'est en cours** ; la dernière pull request est à fusionner dans `main` pour que le site
en ligne soit à jour.

**Ce qui a été fait, maquette par maquette, et ce qui reste ouvert**
1. **Paris 1900, finitions** — *faites le 22 novembre*, sauf la dernière :
   - la porte monumentale de Binet et sa « Parisienne », les jardins du Cours-la-Reine, la rive droite refaite dans
     l'ordre de Picard (serres à leurs cotes, palais de la Danse, phare, Congrès de 100 m), la rue de Paris (quinze
     établissements et le palais de la Danse), le Globe céleste et le palais de l'Optique ;
   - les entrées de Guimard de la ligne 1 : une par station, au carrefour qui la nomme, d'après les rues de la base ;
   - **reste** : les cotes d'élévation de la rue des Nations, une évocation, à affiner pavillon par pavillon si l'on
     trouve les plans (Picard, Revue technique, cartes postales).
   - *Ce que les sources ont corrigé* : entre la Concorde et le pont des Invalides, il n'y avait pas de pavillons mais
     des jardins « parsemés de serres » (Picard, t. I, p. 271-272) ; les serres et le palais de la Ville de Paris
     étaient bien en aval du pont des Invalides. À l'été 1900, les entrées du métro n'avaient que leurs balustrades :
     candélabres, cartouches « Métropolitain » et édicules sont de la fin de 1900 à 1902, et les pavillons de la Bastille
     et de l'Étoile étaient en chantier (article « Entrée de métro Guimard », d'après Descouturelle, Mignard et
     Rodriguez, 2012) ; ils ne sont pas figurés.
   - *Ouvert* : la position de chaque accès du métro en 1900 ; la hauteur réelle de la Parisienne (9 m d'après Picard,
     6 m ailleurs) ; le diamètre du Globe (plus de 40 m chez Picard, 46 m chez Hachette ; 45 m retenus). Les huit
     stations ouvertes le 19 juillet sont Porte de Vincennes, Nation, Gare de Lyon, Bastille, Hôtel de Ville,
     Palais-Royal, Champs-Élysées et Porte Maillot (note de l'article « Ligne 1 du métro de Paris » de Wikipédia ; la date
     est confirmée par Picard, t. VI, p. 215) ; les dix autres ouvrent du 6 août au 1er septembre.
2. **Paris 1900, curseur du montage de l'Exposition** — *fait le 23 novembre*, du 1er janvier 1897 au 19 juillet 1900 :
   - chaque ouvrage qui change est bâti à part (`src/p1900/montage.js`, `ouvrage()`), dans ses maillages, ses matières
     clonées de celles de la ville et coupées à la cote de montage ; ses emprises, les tabliers des ponts et les
     étiquettes suivent la date ;
   - démolis : le palais de l'Industrie (corps du 5 février au 15 octobre 1897, porche et pavillon nord-ouest jusqu'à la
     fin de 1899), les Beaux-Arts, les Arts libéraux, le Dôme central et la galerie de trente mètres de 1889, la gare du
     Champ-de-Mars, l'embarcadère de Lyon ;
   - montés : le Grand et le Petit Palais et les gares neuves (leurs bâtiments, marqués par l'extraction dans
     `data.bati.hist`, sont écartés de la ville et bâtis à part), le pont Alexandre-III (sorti des ponts de la ville,
     son tablier n'est praticable qu'achevé) et ses pylônes, les palais du Champ-de-Mars, la Grande Roue, la rue des
     Nations, la rive droite, l'Esplanade, les colonies, la porte, le Globe, l'Optique, le trottoir roulant, le métro ;
   - la tour, brun-rouge jusqu'au printemps 1899 (teinte de convention).
   - *Ce que les sources ont corrigé* : Picard (t. I, p. 321-325) ne range parmi les démolitions de 1897-1898 que les
     Beaux-Arts, les Arts libéraux, le Dôme central et ses pavillons, la galerie de trente mètres : les galeries des
     Industries diverses de 1889 n'y sont pas, elles ne sont pas montrées. Le palais de l'Industrie n'est pas tombé d'un
     bloc : son porche et un pavillon ont servi jusqu'à la fin de 1899. La gare de Lyon n'est inaugurée que le 6 avril
     1901, bien qu'en service pour l'Exposition.
   - *Ouvert* : les dates de la rue des Nations, des colonies, du Globe, de l'Optique, du Vieux Paris, de l'embarcadère
     de Lyon et du début de la gare des Invalides sont des conventions ; à chercher dans les t. IV et V de Picard et dans
     le guide Hachette. Quelques jours d'adjudication sont mal lus par l'OCR (Dôme central, Arts libéraux, Beaux-Arts) :
     à vérifier sur les scans. Le reste de la ville est celui de l'été 1900 ; le sol du Champ-de-Mars aussi, et la
     trame des passants, calculée une fois pour toutes à la date du 19 juillet 1900.
3. **Paris 1937** : étude des données et première extraction *faites le 23 novembre* (`ETUDE-1937.md`), disparus et
   page en ligne *faits le 24 novembre* :
   - *décidé* : la base « Paris 1900 » corrigée de ce qui a changé de 1901 à 1937, d'après la date du bâti de l'APUR ;
     la ville à l'été 1937, Exposition ouverte (25 mai - 25 novembre), sans curseur de chantier ;
   - *fait* : `data/paris1937.json` (`python3 tools/extract_1889.py 1937`) — 77 km de voies ouvertes de 1901 à 1937,
     414 tronçons de 1900 sous leur nom de 1937 (avenue Foch, rue de Liège, avenue Victor-Emmanuel-III…), l'enceinte
     remplacée par les HBM, la Cité universitaire et la zone, le plateau Beaubourg dégagé, le Champ-de-Mars en jardin
     loti sur ses bords ; 110 867 bâtiments, dont 84 794 réels ;
   - *fait (a)* : les grands ensembles disparus, relevés sur la photographie de 1949 (`tools/releve1949.py`, planche
     redressée dans le repère de la maquette sous une grille cotée) : Halle aux vins, entrepôts de Bercy, abattoirs de
     la Villette et de Vaugirard, marché aux bestiaux, usines Citroën de Javel, gare des Gobelins — des halles basses
     de statut « disparu » le long des rues intérieures de leurs îlots (`tools/disparus_1937.py`, 709 bâtiments) — ; les
     gazomètres de La Villette, la Petite Roquette, le Vélodrome d'Hiver, modelés à part (`src/p1937/disparus.js`) ; les
     Halles, la gare Montparnasse de 1852 et la gare de la Bastille, des modules communs. Les **zones refaites** depuis
     (676 îlots dont l'emprise actuelle est surtout postérieure à 1937 : Italie, Flandre, Belleville…) reçoivent des
     maisons évoquées serrées, sur deux rangs (rue et cour), comme sur la photographie ;
   - *fait (b)* : la page `dist/1937.html` par surcouche (`src/p1937/`, qui reprend aussi `src/p1900/palais.js` :
     `reprend` dans `tools/build.mjs`), frise de toutes les pages, accueil, visite (16 étapes), calque (« disparu » =
     relevé sur la photographie de 1949), test `tools/test1937.mjs` (43 vérifications), image de partage, vignette,
     adresse courte `1937.html`, intégration continue ;
   - *Ce que la photographie a corrigé* : elle montre **dix** pavillons aux Halles en 1949 (quatre à l'ouest, six à
     l'est), là où les sources disent les deux derniers achevés en 1936 près de la Bourse de commerce : ce sont les dix
     de la photographie qui sont figurés, comme en 1889 et en 1900 ; la contradiction reste à lever (plans de 1900 et
     de 1937), et les maquettes de 1889 et de 1900 montrent peut-être deux pavillons de trop ;
   - *fait (c), 24 novembre* : l'Exposition de 1937 (`src/p1937/expo37.js`), une centaine de pavillons — au
     Trocadéro, l'URSS (Iofan, 160 × 21 m, statue posée à 33 m) et l'Allemagne (Speer, tour et aigle à 54 m) face à
     face au-dessus des rampes de l'avenue de Tokio, de part et d'autre de la place de Varsovie ; le pavillon pontifical
     (campanile de 75 m), l'Espagne (Sert et Lacasa), la Pologne et vingt autres sections étrangères dans les jardins,
     le Portugal au bord du quai ; le bassin de la fontaine de Varsovie peint au sol ; sur le quai d'Orsay, de l'ouest
     à l'est, États-Unis, Tchécoslovaquie, Suède, Grande-Bretagne, Belgique, Suisse, Italie (tour carrée) et des
     pavillons français jusqu'à l'Alma ; le Centre des métiers (site du musée du quai Branly) ; sur la rive droite,
     l'Hygiène (Mallet-Stevens), le Yachting (100 × 20 m sur poteaux), les concessions scientifiques de l'Alma aux
     Invalides, la porte d'honneur et son mât de 100 m au débouché du pont Alexandre-III ; au Champ-de-Mars, deux files
     de pavillons le long du parterre, la Publicité (plan incliné de 28 m), le palais de la Lumière et son mur courbe ;
     le Centre régional (25 provinces) entre la tour et le pont de Passy ; le Centre des colonies sur l'île aux
     Cygnes ; sur l'Esplanade, le palais de l'Air (166 × 36 m), les Chemins de fer, la Navigation, le planétarium et le
     parc d'attractions. Fiches, visite (20 étapes), test (deux vérifications de plus) ;
   - *Comment* : le plan général (vue cavalière de Martzloff et Gréber, Wikimedia Commons, « Plan général de
     l'Exposition universelle de 1937 », avec la légende numérotée de son encart) ne se cale pas sur la maquette
     (deux feuilles décalées à la pliure, perspective libre : 20 à 65 m d'écart sur une homographie) ; les pavillons
     sont posés à la main, dans l'ordre et les proportions du plan, dans le repère de l'axe Trocadéro–École militaire
     (`AXE`, `expoXZ`) et le long des berges relevées dans les données de la Seine (`RIVE_G`, `RIVE_D`, `ILE`). Les
     cotes publiées viennent de *L'Architecture d'aujourd'hui*, août 1937 (numéro de l'Exposition, scan d'archive.org
     servi par usmodernist.org) ; le bâti évoqué qui tombait sur les terrains de l'Exposition est écarté (`V.ecartes`),
     le bâti réel reste ;
   - *fait (d), 24 novembre — finitions de clôture* :
     - les **passants de 1937** (`src/p1937/figures.js`, qui remplace `src/p1889/figures.js` à l'assemblage) : bleu de
       travail, complets et feutres, imperméables, canotiers ; robes imprimées, robes de ville à col blanc, manteaux et
       cloches, jupes plissées et bérets ; soldat en capote kaki pour les gardes ; un quart seulement des cavaliers et
       des voitures à cheval de 1889 (`ATTELAGES`, option `attelages` de `src/people.js`, 1 par défaut : les autres
       pages sont inchangées) ; les automobiles ne sont pas figurées ;
     - la **zone** : 3 898 baraques évoquées (`tools/extract_1889.py`, sous `AN >= 1937`) dans les îlots non bâtis du
       glacis et de la zone, hors de l'emprise de l'enceinte, là seulement où la photographie de 1949 est « texturée »
       (écart type local de la luminance sur 15 m au-dessus de 35 ; les stades et les terrains vagues, unis, restent
       vides) ; pas le long du bois de Boulogne ni dans les îlots de plus de 6 ha ;
     - les **abords du Vélodrome d'Hiver** : sept garages et ateliers relevés sur la photographie de 1949
       (`tools/disparus_1937.py`, `EMPRISES`) dans l'îlot que la base de 1900 disait non bâti ;
     - les **petits pavillons** de l'Exposition : le Centre régional par familles de styles (`STYLES`, `STYLE_DE` :
       toits bas et clocheton du Midi, chalets à grands débords, colombages et combles raides, granit et souches,
       brique, combles à croupes, tuiles vernissées) ; aux colonies, varangues des Antilles, de la Réunion et de
       Madagascar, second toit de l'Indochine, cases rondes de l'AEF ; l'île aux Cygnes ajoutée aux terrains de
       l'Exposition (`TERRAINS`), ce qui efface 22 maisons évoquées qui s'y dressaient ;
     - la **passerelle de l'Alma** (`passerelleAlma`, `ALMA`) : cotes de *L'Architecture d'aujourd'hui*, août 1937,
       p. 56-57 (« LAH-1937-08 » sur usmodernist.org) — trois travées de 38,10, 46,40 et 40 m, 133,26 m, poutre-caisson
       Vierendeel de 6 × 6,80 m à boutiques, encorbellements de 6 m (amont, en haut) et 6,25 m (aval, au pied) ; sa
       place en aval du pont est **déduite** (septembre 1937, p. 35 : elle menait à la moitié ouest de l'Exposition ;
       Duchêne en photographie le chantier depuis la rue Gaston-de-Saint-Paul) ;
     - le texte « Sources » de la page (le paragraphe « Pas encore modelé » annonçait encore l'Exposition) ; le test
       (`tools/test1937.mjs`, 46 vérifications) ; le README ; le déploiement Docker ;
   - *Ouvert* (sources non lisibles d'ici) : le plan officiel à l'échelle de G. Peltier (3 mars 1937, BnF, Gallica
     « btv1b531927012 », domaine public), qui permettrait de recaler les pavillons — Gallica oppose une protection
     Cloudflare, il faudrait le récupérer à la main ; le guide officiel et le *Catalogue général* ; la porte monumentale
     de la place de l'Alma (deux pylônes de 50 m, non cotés en plan), pas figurée ; l'Atlas municipal de 1937, dont le
     serveur d'images (SoDUCo) ne répond pas ; les licences de la photo de 1949 (Édugéo) et des images de la BHdV —
     aucune image n'est diffusée, seuls des emplacements et des dimensions relevés, sources citées ; les hauteurs des
     gazomètres et des halles disparues (conventions).
4. **Paris 1975** — *abandonné le 24 novembre*, après l'étude des données (`ETUDE-1975.md`, gardée pour mémoire) :
   - *décidé* : la ville à l'**été 1975, sans curseur** de chantier ;
   - *ce que dit l'étude* : 76 % de l'emprise bâtie d'aujourd'hui est réelle en 1975 (61 % de 1937 ou d'avant, 15 % de
     1938 à 1975) ; la période « 1968-1975 » de l'APUR s'arrête à la date, il n'y a plus de bâti probable ; le bâti
     postérieur (20,5 %, 683 ha) tient pour 38 % dans des zones refaites d'un bloc, surtout des gares de marchandises,
     des entrepôts et des usines déjà dans la maquette de 1937 (Paris Rive Gauche, Bercy, la Chapelle, Batignolles,
     Reuilly, la Villette, Javel) ; 65 tours de 60 m et plus sont réelles, hauteurs comprises ; 44 km de voies ouvertes
     de 1938 à 1975, 64 km après ; 139 voies renommées depuis 1975 dont on connaît le nom d'alors ;
   - *sources d'images* : aucune photographie orthorectifiée de 1975 n'est servie ; la photographie de **1965** (IGN,
     « 1965-1980 » : Paris est de 1965) et la carte de **1979** (Édugéo) encadrent la date ; les clichés de 1974-1976 de
     « Remonter le temps » (IGN) sont refusés par le réseau de l'environnement ;
   - *n'a pas été décidé* (si l'on reprenait) : (a) la méthode — proposée : la ville de 1937 corrigée de 1938 à 1975 par
     l'algorithme de `tools/ville_1937.py` (voies ajoutées d'après leurs riverains, îlots remplacés, voies recouvertes
     retirées, noms suivis), plus le boulevard périphérique et les voies express ; (b) demander ou non l'accès à
     « Remonter le temps » pour vérifier les quartiers en rénovation à la date (Italie, Belleville, Flandre, Plaisance,
     Saint-Blaise, Front de Seine, Halles), au lieu des conventions proposées (bâti daté de 1976 à 1978 : chantier ;
     de 1979 ou après : tissu de 1937) ;
   - *ce qui aurait suivi* : l'extraction (`python3 tools/extract_1889.py 1975` → `data/paris1975.json`, tout ce qui
     est propre à 1975 sous `AN >= 1975`, pour que 1889, 1900 et 1937 sortent identiques à l'octet près) ; les voies
     ferrées de 1975 (`tools/fer_1889.py`) ; les grands sites (trou des Halles, Centre Pompidou en chantier, abattoirs
     de la Villette fermés et salle des ventes inachevée, usines Citroën, entrepôts de Bercy et gare de la Bastille repris
     de 1937) ; la page `dist/1975.html` par surcouche (`src/p1975/`), frise, accueil, visite, calque, test, image ;
     les passants et les voitures de 1975.
5. **Jeu « mode classe »** : non engagé (`CADRAGE-JEU.md`, gardé pour mémoire).

**Pour reprendre le travail** (notes techniques)
- *Ville à une date* : `python3 tools/extract_1889.py 1900` (sans argument : 1889, reproduit à l'octet près). Les
  sources sont téléchargées par `tools/fetch_1889.py` dans `data/source/1889/` (non versionné). Les grands édifices
  sans année chez l'APUR reçoivent la leur dans la liste `HISTOIRE` ; les voies ferrées propres à une année sont dans
  `tools/fer_1889.py` (`ECARTE`, `ROUELLE`, `DISPARUS`).
- *Une page qui reprend une autre* : `tools/build.mjs`, `surcouche` — tout module de `src/p1889/` qui a son homonyme
  dans `src/p1900/` est remplacé à l'assemblage, et `data/paris1889.json` par `data/paris1900.json` ; un module de
  `src/p1900/` qui importe `src/p1889/` explicitement obtient l'original. Les petits écarts se règlent dans les modules
  communs par `ANNEE` (`src/p1889/data.js`). Pour 1937 ou 1975, la même surcouche (`src/p1937/`…) ou une nouvelle
  base, selon l'étude des données.
- *Écran d'accueil* : `src/shell/` ; le mode vitrine est un message de `src/embed.js` (`vitrine`), pris en charge par
  `src/ui.js` (1380) et `src/p1789/ui.js` (les autres). Une nouvelle maquette doit l'accepter, entrer dans `ERES` et
  `ORDRE` (`src/shell/main.js`), dans la frise de chaque page et dans les tests de frise.
- *Images* : `node tools/og.mjs 1900` (image de partage d'une maquette), puis `python3 tools/vignettes.py` (vignettes
  de l'écran d'accueil).
- *Tests* : un par page (`tools/test1900.mjs`…), `tools/test_accueil.mjs` pour l'accueil, tous dans l'intégration
  continue. En rendu logiciel, le navigateur sans écran ne fournit presque plus d'images à un cadre : les tests font
  avancer les images eux-mêmes (`a.rig.update`, `a.emit('frame', …)`). Le contrôle des ports bas de 1900 écarte les
  berges que l'Exposition occupe.
- *Sources de l'Exposition de 1900* : A. Picard, *Rapport général administratif et technique* (1902, archive.org :
  t. I « expositionuniver01expo », t. II « rapportgeyneyra00expo », t. VI « expositionunive00goog », t. VII
  « expositionuniver07expo ») ; guide Hachette *Paris Exposition 1900* (archive.org, « parisexposition00pari ») ;
  *Revue technique de l'Exposition universelle de 1900* (Cnam, Cnum, cote 8XAE585.1), pas encore dépouillée.
- *Où sont les finitions* : `src/p1900/porte.js` (porte monumentale, jardins), `src/p1900/pavillons.js` (rive droite,
  rue de Paris), `src/p1900/attractions.js` (Globe céleste, Optique), `src/p1900/metro.js` (entrées du métro).
- *Le montage* : `src/p1900/montage.js` (dates `DATES`, jalons `ETAPES`, `ouvrage()`, `batirHistoire()`) ; les modules
  communs s'y raccordent par `V.montage` (gares, `src/p1889/gares.js`), `V.ouvrage` (palais, `ensemble()`), `V.ecartes`
  (bâti de la ville, `src/p1889/ville.js`), `f.absent` (emprises) et `p.quand` / `p.hors` (étiquettes,
  `src/p1789/ui.js`). Un ouvrage nouveau : `ouvrage(app, { monte: [d0, d1] }, (B) => …)` dans `src/p1900/expo.js`.
- *Paris 1937, la page* : `src/p1937/` remplace `src/p1889/expo.js` (tour, jardin du Champ-de-Mars, palais de 1900,
  disparus) ; les petits écarts de date sont dans les modules communs par `ANNEE` (`ANNEE >= 1907` : la tour en jaune
  brun ; `>= 1912` : le campanile du Sacré-Cœur ; `>= 1931` : la gare de l'Est doublée ; `>= 1937` : textes du
  calque). Les disparus : `tools/disparus_1937.py` (zones et emprises, relevées avec `python3 tools/releve1949.py
  SORTIE.png X Z [CÔTÉ] [PAS] [ZOOM] [aujourdhui]`), et `src/p1937/disparus.js` pour ce qui ne tient pas dans un
  bâtiment des données. Une zone de plus : un polygone grossier autour de l'enceinte du site, ses paramètres (`prof`,
  `h`, `dens`, `lg`, `toit`), puis `python3 tools/extract_1889.py 1937`.
- *Paris 1937, finitions* : les passants dans `src/p1937/figures.js` (mêmes noms exportés que `src/p1889/figures.js`,
  plus `ATTELAGES`, lu par `src/p1889/monde.js` et passé à `People` comme `attelages`) ; les baraques de la zone dans
  `tools/extract_1889.py` (bloc « la zone, au-delà de l'enceinte démolie », réglages `TEXTURE`, `FEN`, `PZ` ; il lit
  les tuiles de la photographie de 1949 par `tools/releve1949.py`, gardées dans `data/source/1937/tuiles/` — une
  extraction complète de 1937 prend alors environ huit minutes la première fois) ; les abords du Vélodrome d'Hiver dans
  `EMPRISES` de `tools/disparus_1937.py` ; la passerelle dans `passerelleAlma` (`src/p1937/expo37.js`, constante
  `ALMA` : extrémités du pont de l'Alma relevées dans les rues de 1937, écart de 30 m vers l'aval) ; les styles du
  Centre régional dans `STYLES` et `STYLE_DE`. Planches de contrôle : la maquette superposée à la photographie de 1949
  se refait avec `tools/releve1949.py` ; des vues de la page avec Playwright (`a.setView(oeil, cible)`, puis
  `a.rig.cur = { ...a.rig.goal }` et quelques images, comme dans les tests).
- *Paris 1937, l'Exposition* : `src/p1937/expo37.js`, appelé par `batirExpo` (`src/p1937/expo.js`), qui écarte aussi le
  bâti évoqué de ses terrains (`terrainsExpo()`). Un pavillon : `bloc(app, B, F, u, v, lu, lv, h, o)` dans un repère
  `F` (`AXE` pour l'axe Trocadéro–École militaire, `RD` pour le Cours-la-Reine, celui de l'Esplanade), options
  `col`, `verre`, `pilotis`, `toit: [hauteur, couleur]`, `a` (rotation), `bandes`. Les listes : `JARDINS` (Trocadéro),
  `QUAI` (quai d'Orsay, `[nom, v0, v1, profondeur, h]` le long de `riveG`), `CHAMP` (`[nom, u0, u1, côté, h]`),
  `REGIONS`, `COLONIES` (le long de `ile`). Les pavillons à part : `urss`, `allemagne`, `pontifical`, `espagne`,
  `pologne`, `riveDroiteAmont` (Hygiène, Yachting), `riveDroiteAval` (concessions, porte d'honneur), `esplanade`. Le
  bassin de la fontaine de Varsovie est peint dans `peindreExpo`. Les fiches sont dans `batirExpo` (`L.unshift`).
  Planches de relevé : le plan général (Commons) et l'encart ; la maquette dans le repère de l'axe se dessine avec un
  petit script Python sur `data/paris1937.json` (fonctions `uv`/`xz` : origine à la tour, u = (0,71538 ; 0,69873)).
- *Paris 1937, données* : `python3 tools/fetch_1889.py 1937` télécharge dans `data/source/1937/` les tronçons, voies,
  îlots et arrondissements de l'APUR et la nomenclature des voies de la Ville de Paris ; `python3 tools/extract_1889.py
  1937` écrit `data/paris1937.json`, en passant par `tools/ville_1937.py` (voies ouvertes de 1901 à 1937, îlots
  remplacés, glacis, noms à la date, îlots dégagés : liste `DEGAGES`). Dans `tools/extract_1889.py`, tout ce qui est
  propre à 1937 est sous `AN >= 1937` (ou `AN >= 1915` pour le classement du bâti), pour que 1889 et 1900 restent
  identiques. `python3 tools/etude_1937.py` refait les mesures de l'étude ; `python3 tools/photo1949.py SORTIE.jpg LAT
  LON` met côte à côte la photographie de 1949 et celle d'aujourd'hui.
- *Paris 1975, données* : `python3 tools/etude_1975.py` lit les sources de 1889 et de 1937 (`data/source/1889/`,
  `data/source/1937/`) et écrit ses mesures dans `data/source/1975/etude_1975.json` (non versionné) ; `python3
  tools/photo1975.py SORTIE.jpg LAT LON [ZOOM] [TUILES]` met côte à côte la photographie de 1965, la carte de 1979 et la
  photographie d'aujourd'hui (couches WMTS de la Géoplateforme : `ORTHOIMAGERY.ORTHOPHOTOS.1965-1980`, style
  `BDORTHOHISTORIQUE` ; `GEOGRAPHICALGRIDSYSTEMS.EDUGEO.PARIS1979`, niveau 16 au plus). Dans l'extraction, la règle du
  bâti réel devra compter les périodes 1940-1967 et 1968-1975 (`c_perconst` 6 et 7) ; les emprises hautes de moins de
  200 m² sont des cheminées.
- *Sources de l'Exposition, pour les dates* : l'exécution des travaux est aux t. I (démolitions, pont Alexandre-III,
  passerelles), II (Grand et Petit Palais, Esplanade, rive droite, porte) et III (« expositionuniver03expo » :
  Champ-de-Mars, Château d'eau, Électricité, tour) de Picard ; le t. VI couvre les cérémonies et les transports.

## Méthode commune

La ville de 1889 est recomposée à partir du bâti d'aujourd'hui que l'APUR date (`tools/extract_1889.py`, `AN = 1889`) :
réel s'il est daté de l'année ou d'avant, probable s'il est de la bonne période sans année, disparu ou évoqué sinon.
La même méthode vaut pour toute date. Pour chaque maquette :

1. **Extraction** : une variante de `tools/extract_1889.py` avec l'année voulue, qui produit `data/parisAAAA.json`.
2. **Ce qui a disparu depuis** : modelé à part, comme les Halles et le palais de l'Industrie en 1889.
3. **Monuments et grands chantiers de la date** : silhouettes et édifices propres à l'époque.
4. **Intégration** : page `dist/AAAA.html`, adresse courte à la racine, frise, accueil, `tools/build.mjs`, test
   `tools/testAAAA.mjs`, image `dist/og/AAAA.jpg`, flux d'intégration continue.

À vérifier d'abord dans le dictionnaire des données de l'APUR : les classes de période de construction (`c_perconst`) et
l'année (`an_const`). Une borne de période qui tombe sur la date choisie simplifie le classement.

## 1. Paris 1900 — la plus simple, à faire en premier

**Fait (première version)** : extraction à la date de 1900 (`python3 tools/extract_1889.py 1900`, même script que
1889), page `dist/1900.html` qui reprend `src/p1889/` par surcouche (`src/p1900/`), frise, accueil, test, image de
partage. Montrés : la tour repeinte (1899), le Champ-de-Mars de 1900 (six palais, palais de l'Électricité et Château
d'eau, Galerie des machines gardée), la Grande Roue, le Grand et le Petit Palais, le pont Alexandre-III et ses
pylônes, la gare de Lyon et sa tour, les gares d'Orsay et des Invalides, le pont Rouelle, le Sacré-Cœur et son dôme.

**Fait ensuite** : la rue des Nations (vingt-trois pavillons et deux passerelles), la rive droite (Ville de Paris,
serres, Congrès), le Vieux Paris, le palais des Armées et la passerelle Debilly, les palais de l'Esplanade des
Invalides, la section des colonies au Trocadéro, le trottoir roulant. Puis les finitions : la porte monumentale, les
jardins du Cours-la-Reine, la rive droite refaite et la rue de Paris, le Globe céleste, le palais de l'Optique, les
entrées du métro.

**Reste à faire** : voir « Ce qui reste ouvert », en fin de document (cotes de la rue des Nations ; le curseur du montage est
fait).

**Pourquoi d'abord** : les îlots et les rues viennent déjà de la base « Paris 1900 », utilisée pour 1889. L'essentiel de
la ville est en place ; on change l'année (`AN = 1900`) et on modèle ce qui est nouveau.

**À montrer**
- L'Exposition universelle de 1900 :
  - de part et d'autre de la nouvelle avenue, le Grand et le Petit Palais, à la place du palais de l'Industrie (démoli
    en 1897), et le pont Alexandre-III ;
  - sur le Champ-de-Mars, le palais de l'Électricité et le Château d'eau ; la Grande Roue de l'avenue de Suffren ; le
    trottoir roulant ; les pavillons des nations le long de la Seine (rue des Nations) ;
  - la tour, conservée.
- Les gares neuves : gare d'Orsay, gare de Lyon (actuelle, avec sa tour de l'horloge), gare des Invalides.
- Le métro : la ligne 1 (porte de Vincennes à porte Maillot) ouvre le 19 juillet 1900 ; ses entrées Art nouveau de
  Guimard.
- Le Sacré-Cœur avec son dôme (1899), sans son campanile, achevé en 1912 (vérifié).

**Réutilisable** : tout `src/p1889/` (ville, ports bas, gares, trains, bateaux, souches, édifices, calque), le curseur
de date (pour le montage de l'Exposition 1900, comme pour la tour en 1889).

## 2. Paris 1937

**À montrer**
- L'enceinte de Thiers démolie (1919-1929) : les boulevards des Maréchaux, la ceinture de logements sociaux en brique,
  la Cité internationale universitaire, les terrains de sport de la « zone ».
- L'Exposition internationale de 1937 : le palais de Chaillot à la place du Trocadéro de 1878, le palais de Tokyo, le
  palais d'Iéna ; les pavillons soviétique et allemand face à face au pont d'Iéna.
- Les Halles : douze pavillons selon les sources, les deux derniers bâtis en 1936 ; la photographie de 1949 en montre dix
  (voir « Ce qui reste ouvert »).
- La Petite Ceinture sans voyageurs depuis 1934 ; la ligne d'Auteuil toujours en service ; le métro étendu.

**Données** : étudiées le 23 novembre 2026, voir `ETUDE-1937.md` — sources, chiffres, zones refaites depuis,
méthode proposée et points ouverts.

**Fait (24 novembre 2026)** : la page, les grands ensembles disparus et les zones refaites, l'Exposition de 1937, puis
les finitions de clôture (passants, zone, abords du Vélodrome d'Hiver, petits pavillons, passerelle de l'Alma) — voir
point 3 en tête du document. **Reste** : recaler l'Exposition sur le plan officiel à l'échelle (Gallica) si on l'obtient.

## 3. Paris 1975 — abandonné le 24 novembre 2026

**À montrer**
- Le boulevard périphérique (achevé en 1973), les voies express sur berges.
- Les tours : Montparnasse (1973) et la nouvelle gare, le Front de Seine, les Olympiades et Italie 13.
- Le « trou des Halles » : les pavillons de Baltard démolis en 1971-1973, le Forum pas encore bâti ; le Centre Pompidou
  en chantier (ouvert en 1977).
- La gare d'Orsay désaffectée (musée en 1986), les abattoirs de la Villette fermés (1974).
- Le RER : la ligne A sous Paris.

**Données** : étudiées le 24 novembre 2026, voir `ETUDE-1975.md` — sources, chiffres, zones refaites depuis, méthode
proposée. **Décidé** : l'été 1975, sans curseur ; puis la maquette a été abandonnée, l'étude gardée pour mémoire.

## Ce qui reste ouvert

Le projet étant arrêté, ce sont des limites connues, toutes documentées dans le panneau « Sources » des pages ; aucune
ne bloque. Elles dépendent de sources qu'on n'a pas pu lire d'ici (archive.org, Gallica et le Cnum sont refusés par le
réseau de l'environnement de travail ; le serveur de SoDUCo ne répond pas).
- **1889 et 1900** : les Halles — dix pavillons d'après la photographie de 1949, douze selon les sources (deux achevés
  en 1936) ; les maquettes de 1889 et de 1900 en montrent peut-être deux de trop (plans de 1900 à consulter).
- **1900** : les hauteurs des pavillons de la rue des Nations, évoquées faute de plans (Picard, *Revue technique*,
  cartes postales) ; quelques dates du montage, de convention (rue des Nations, colonies, Globe, Optique, Vieux
  Paris), à chercher dans les t. IV et V de Picard et le guide Hachette ; quelques jours d'adjudication mal lus par
  l'OCR.
- **1937** : le recalage de l'Exposition sur le plan officiel de Peltier (Gallica) ; la porte monumentale de l'Alma ;
  l'Atlas municipal de 1937 comme contrôle des rues ; les hauteurs des gazomètres et des halles disparues ; les
  licences de la photographie de 1949 (Édugéo) et des images de la BHdV, à confirmer avant de diffuser quoi que ce
  soit qui en dérive (rien ne l'est : seuls des emplacements et des dimensions relevés).
- **Toutes** : les passants ne circulent qu'autour du point de vue ; les automobiles de 1937 ne sont pas figurées.
