# Paris à travers le temps — feuille de route des maquettes

Décidé le 21 novembre 2026 : après Lutèce, 1380, 1789 et 1889, trois nouvelles maquettes, **dans cet ordre** :
**Paris 1900**, puis **Paris 1937**, puis **Paris 1975**. Chacune reprend le moteur de Paris 1889 (`src/p1889/`, lui-même
bâti sur l'application de 1789), entre dans la frise des époques et dans la page d'accueil, et reçoit sa visite guidée,
son calque « Origine du bâti », ses tests et son image de partage.

Le jeu en ligne (`CADRAGE-JEU.md`) reste au stade du cadrage : pas de migration pour l'instant.

## Où on en est (24 novembre 2026) et la suite

**En ligne** : six maquettes — Lutèce, 1380, 1789, 1889, 1900, **1937** — et l'**écran d'accueil** : sans adresse, le site
montre les six époques en cartes au-dessus d'une maquette « en vitrine » qui tourne lentement ; le nom du site, en tête
de chaque maquette, y ramène. Paris 1937 montre la ville de l'été 1937 (rues et îlots de 1900 corrigés, enceinte
démolie et ceinture des HBM, Chaillot, Champ-de-Mars en jardin, tour en jaune brun, Sacré-Cœur et son campanile, gare
de l'Est doublée) et le Paris disparu depuis, relevé sur la photographie aérienne de 1949 ; pas encore son Exposition. Paris 1900 montre la ville à la date, la tour repeinte, le Champ-de-Mars de 1900, la
Grande Roue, le Grand et le Petit Palais, le pont Alexandre-III, la rue des Nations, la porte monumentale de Binet, les
jardins du Cours-la-Reine, la rive droite et la rue de Paris, le Vieux Paris, le palais des Armées et la passerelle
Debilly, l'Esplanade des Invalides, les colonies du Trocadéro, le palais de l'Optique, le Globe céleste, le trottoir
roulant et les entrées du métro. Un curseur montre le montage de l'Exposition, du 1er janvier 1897 au 19 juillet 1900.

**La suite, dans l'ordre**
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
   - **reste** : (c) l'Exposition de 1937 (Chaillot et le palais de Tokyo sont réels dans l'APUR ; pavillons à
     modeler : Union soviétique et Allemagne face à face au pont d'Iéna, Espagne, Italie…, d'après le guide officiel et
     les photographies) ; puis les points ouverts ci-dessous ;
   - *Ouvert* : l'Atlas municipal de 1937, dont le serveur d'images (SoDUCo) ne répond pas ; les licences de la photo
     de 1949 (Édugéo) et des images de la BHdV — aucune image n'est diffusée, seuls des emplacements et des dimensions
     relevés, sources citées ; les hauteurs des gazomètres et des halles disparues (conventions) ; quelques îlots non
     bâtis de la base de 1900 qui l'étaient en 1937 (à côté du Vélodrome d'Hiver) ; la zone, au-delà des HBM, pas
     figurée ; les passants portent encore les costumes de 1889.
4. **Paris 1975**.
5. **Jeu « mode classe »** : seulement quand il sera décidé (`CADRAGE-JEU.md`).

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
- *Paris 1937, données* : `python3 tools/fetch_1889.py 1937` télécharge dans `data/source/1937/` les tronçons, voies,
  îlots et arrondissements de l'APUR et la nomenclature des voies de la Ville de Paris ; `python3 tools/extract_1889.py
  1937` écrit `data/paris1937.json`, en passant par `tools/ville_1937.py` (voies ouvertes de 1901 à 1937, îlots
  remplacés, glacis, noms à la date, îlots dégagés : liste `DEGAGES`). Dans `tools/extract_1889.py`, tout ce qui est
  propre à 1937 est sous `AN >= 1937` (ou `AN >= 1915` pour le classement du bâti), pour que 1889 et 1900 restent
  identiques. `python3 tools/etude_1937.py` refait les mesures de l'étude ; `python3 tools/photo1949.py SORTIE.jpg LAT
  LON` met côte à côte la photographie de 1949 et celle d'aujourd'hui.
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

**Reste à faire** : voir « La suite », en tête de ce document (cotes de la rue des Nations ; le curseur du montage est
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
  (voir « La suite », point 3).
- La Petite Ceinture sans voyageurs depuis 1934 ; la ligne d'Auteuil toujours en service ; le métro étendu.

**Données** : étudiées le 23 novembre 2026, voir `ETUDE-1937.md` — sources, chiffres, zones refaites depuis,
méthode proposée et points ouverts.

**Fait (24 novembre 2026)** : la page, les grands ensembles disparus et les zones refaites — voir « La suite », point 3.
**Reste** : l'Exposition de 1937.

## 3. Paris 1975

**À montrer**
- Le boulevard périphérique (achevé en 1973), les voies express sur berges.
- Les tours : Montparnasse (1973) et la nouvelle gare, le Front de Seine, les Olympiades et Italie 13.
- Le « trou des Halles » : les pavillons de Baltard démolis en 1971-1973, le Forum pas encore bâti ; le Centre Pompidou
  en chantier (ouvert en 1977).
- La gare d'Orsay désaffectée (musée en 1986), les abattoirs de la Villette fermés (1974).
- Le RER : la ligne A sous Paris.

**Point de données à étudier** : la plus grande part du bâti de 1975 est encore debout, donc réelle. Ce qui a disparu
depuis (Halles, abattoirs, entrepôts de Bercy, usines de la rive gauche avant Paris Rive Gauche) est à modeler à part.

## Ce qui reste ouvert

- Pour 1937 : la densité des quartiers refaits depuis et l'Atlas municipal de 1937 comme contrôle (voir
  `ETUDE-1937.md`). Pour 1975 : la source des rues et des îlots, et celle des bâtiments disparus.
- Les passants, qui ne circulent qu'autour d'un quartier par maquette ; à étendre si une maquette s'y prête.
