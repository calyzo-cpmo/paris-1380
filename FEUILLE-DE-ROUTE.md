# Paris à travers le temps — feuille de route des maquettes

Décidé le 21 novembre 2026 : après Lutèce, 1380, 1789 et 1889, trois nouvelles maquettes, **dans cet ordre** :
**Paris 1900**, puis **Paris 1937**, puis **Paris 1975**. Chacune reprend le moteur de Paris 1889 (`src/p1889/`, lui-même
bâti sur l'application de 1789), entre dans la frise des époques et dans la page d'accueil, et reçoit sa visite guidée,
son calque « Origine du bâti », ses tests et son image de partage.

Le jeu en ligne (`CADRAGE-JEU.md`) reste au stade du cadrage : pas de migration pour l'instant.

## Où on en est (22 novembre 2026) et la suite

**En ligne** : cinq maquettes — Lutèce, 1380, 1789, 1889, **1900** — et l'**écran d'accueil** : sans adresse, le site
montre les cinq époques en cartes au-dessus d'une maquette « en vitrine » qui tourne lentement ; le nom du site, en tête
de chaque maquette, y ramène. Paris 1900 montre la ville à la date, la tour repeinte, le Champ-de-Mars de 1900, la
Grande Roue, le Grand et le Petit Palais, le pont Alexandre-III, la rue des Nations, la rive droite, le Vieux Paris, le
palais des Armées et la passerelle Debilly, l'Esplanade des Invalides, les colonies du Trocadéro et le trottoir roulant.

**La suite, dans l'ordre**
1. **Paris 1900, finitions** (petites, indépendantes les unes des autres) :
   - les pavillons de la rive droite entre le pont de la Concorde et le pont Alexandre-III, la rue de Paris (les
     attractions du Cours-la-Reine, du pont des Invalides au pont de l'Alma), la porte
     monumentale de la place de la Concorde et sa « Parisienne », le Globe céleste et le palais de l'Optique au pied de
     la tour ;
   - les entrées Guimard de la ligne 1 (huit stations ouvertes le 19 juillet 1900, les dix autres avant le 1er
     septembre) : entourages de fonte et, à Bastille et à l'Étoile, pavillons ; à placer d'après les rues de la base
     « Paris 1900 » ;
   - les cotes d'élévation de la rue des Nations restent une évocation : à affiner pavillon par pavillon si l'on trouve
     les plans (Picard, Revue technique, cartes postales).
2. **Paris 1900, curseur du montage de l'Exposition** (de la démolition du palais de l'Industrie, en 1897, à l'ouverture
   du 14 avril 1900, et jusqu'au métro du 19 juillet). Préalable : le Grand et le Petit Palais, les gares d'Orsay, des
   Invalides et de Lyon viennent des données de la ville et ne peuvent pas disparaître avec la date. Il faut les
   réserver (`V.reserves`) et les modeler à part, comme les palais du Champ-de-Mars (`ensemble()` de
   `src/p1889/expo.js`, qui coupe à la cote de montage), puis rendre au palais de l'Industrie (`industrie()` de
   `src/p1889/monuments.js`) une existence jusqu'en 1897. Le curseur de 1889 (`src/p1889/main.js`, `tour.js`) sert de
   modèle.
3. **Paris 1937** : d'abord l'étude des données (voir plus bas) — rues et îlots de 1937, quartiers démolis depuis.
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
- *Sources de l'Exposition de 1900* : A. Picard, *Rapport général administratif et technique* (1902, archive.org,
  « expositionuniver01expo ») ; *Revue technique de l'Exposition universelle de 1900* (Cnam, Cnum, cote 8XAE585.1).

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
Invalides, la section des colonies au Trocadéro, le trottoir roulant.

**Reste à faire** : voir « La suite », en tête de ce document (finitions, puis curseur du montage).

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
- Les Halles au complet : douze pavillons, les deux derniers bâtis en 1936.
- La Petite Ceinture sans voyageurs depuis 1934 ; la ligne d'Auteuil toujours en service ; le métro étendu.

**Point de données à étudier** : les rues et les îlots de 1937 diffèrent de ceux de 1900 (boulevards des Maréchaux,
percements). Les quartiers démolis après-guerre (îlots insalubres de Belleville, de Plaisance, du 13e…) manquent au
bâti d'aujourd'hui. Sources à évaluer : photographies aériennes historiques de l'IGN, plans de l'époque.

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

- Pour 1937 et 1975 : la source des rues et des îlots, et celle des bâtiments disparus.
- Les passants, qui ne circulent qu'autour d'un quartier par maquette ; à étendre si une maquette s'y prête.
