# Paris 1975 — étude des données

Première étape de Paris 1975 (`FEUILLE-DE-ROUTE.md`, point 4), faite le 25 novembre 2026. Avant de bâtir la maquette,
il faut savoir d'où viendront les rues, les îlots et les bâtiments de l'été 1975, et ce qui manque pour les lieux
démolis ou rebâtis depuis.

Les chiffres viennent de `python3 tools/etude_1975.py`, qui lit les sources déjà téléchargées pour 1889 et 1937. Les
vérifications visuelles viennent de `python3 tools/photo1975.py SORTIE.jpg LAT LON`.

**Décidé le 25 novembre 2026** : la ville à l'**été 1975, sans curseur** de chantier.

## En bref

- **Les trois quarts de l'emprise bâtie d'aujourd'hui sont réels à l'été 1975** : 61 % datent de 1937 ou d'avant (ils
  sont déjà dans la maquette de 1937), 15 % ont été bâtis de 1938 à 1975. Seuls **20,5 % sont postérieurs** (683 ha),
  et 4 % n'ont pas de date. Pour 1937, la part réelle ou probable n'était que de 60 %.
- **La date de 1975 tombe sur une limite de période de l'APUR** : la période « 1968-1975 » s'arrête à la date, et la
  suivante commence en 1976. Il n'y a donc plus de bâti « probable » à deviner. Seuls quatre bâtiments ont une période
  postérieure et une année antérieure.
- **Le bâti postérieur à 1975 tient pour 38 % dans des zones refaites d'un bloc** (262 ha). Ce sont surtout des emprises
  ferroviaires, industrielles et d'entrepôts que la maquette de 1937 contient déjà et qui n'avaient pas changé en 1975 :
  Paris Rive Gauche, Bercy, la Chapelle, les Batignolles, Reuilly, la Villette, Javel. Le reste du bâti postérieur est
  dispersé, immeuble par immeuble, dans le tissu ancien.
- **Il n'existe pas de photographie aérienne orthorectifiée de Paris en 1975** sur la Géoplateforme de l'IGN. La
  couche « Photographies aériennes 1965-1980 » montre Paris en **1965**, d'après le tableau des dates de l'IGN. La
  couche Édugéo « Cartographie 1979 » est la carte topographique de **1979**. Ces deux images encadrent la date, et ce
  qui figure sur les deux était là en 1975. Les photographies des missions de 1974 à 1976 existent sur « Remonter le
  temps » (IGN), mais ce site est **bloqué par le réseau de cet environnement**.
- **Méthode proposée** (détail plus bas) : reprendre la ville de 1937 et la corriger de ce qui a changé de 1938 à 1975,
  avec le même algorithme que celui qui a corrigé 1900 pour 1937. On y ajoute le bâti réel de 1975 et les grands
  ensembles de la date. Les « quartiers en rénovation » de 1975 (Italie, Belleville, Flandre, Plaisance, les Halles)
  demandent des conventions.

## 1. Les sources

| Source | Ce qu'elle donne | Accès d'ici | Licence | Usage proposé |
|---|---|---|---|---|
| APUR, `EMPRISE_BATIE_PARIS` (déjà téléchargée) | emprise, hauteur, période et souvent année de construction de chaque bâtiment d'aujourd'hui | oui | ODbL 1.0 | bâti réel de 1975 ; date des rues par les bâtiments qui les bordent |
| Maquette de Paris 1937 (`data/paris1937.json`, `src/p1937/`) | rues, îlots, bâti réel et évoqué de 1937, grands disparus modelés à part | oui | ODbL 1.0 (base dérivée) | point de départ, à corriger de 1938 à 1975 |
| APUR, `TRONCON_VOIE_PARIS`, `ILOT_PHYSIQUE`, `ARRONDISSEMENT` (dans `data/source/1937/`) | voies et îlots d'aujourd'hui, avec le niveau des voies (sol, souterrain, dessus) | oui | ODbL 1.0 | voies et îlots ouverts de 1938 à 1975 |
| Ville de Paris, dénominations actuelles et caduques (dans `data/source/1937/`) | dates des arrêtés de dénomination, anciens noms, texte d'ouverture | oui | ODbL 1.0 | noms de 1975 (`Noms.avant`, `tools/ville_1937.py`) |
| IGN, « Photographies aériennes 1965-1980 » (`ORTHOIMAGERY.ORTHOPHOTOS.1965-1980`, style `BDORTHOHISTORIQUE`) | photographie orthorectifiée, noir et blanc ; **Paris : 1965** | oui | IGN, licence ouverte Etalab 2.0 (à confirmer) | état d'avant les rénovations des années 1970 |
| IGN, Édugéo « Cartographie 1979 » (`GEOGRAPHICALGRIDSYSTEMS.EDUGEO.PARIS1979`) | carte topographique au 1/25 000 environ : rues, îlots, grands bâtiments, gares, noms | oui (jusqu'au niveau 16) | Édugéo (licence à confirmer) | contrôle des rues et des grands sites à quatre ans près |
| IGN, « Remonter le temps » : photographies des missions de 1974 à 1976 sur Paris | clichés aériens non redressés, à la date | **non** : l'hôte `remonterletemps.ign.fr` est refusé par le réseau de l'environnement | IGN | contrôle des quartiers en rénovation en 1975, si l'accès est ouvert |
| APUR, `PLANS_HISTORIQUES` : « Plan hauteur d'étage 1990 », carte topographique 1985-1991, IGN 1960 | images calées | oui (images) | Apur, IGN, pas en données ouvertes | repère secondaire : dates trop tardives ou trop anciennes |

**Écartées** : la couche « Photographies aériennes historiques 1980-1995 » ne couvre pas le centre de Paris (réponse
« No data found ») ; la couche Édugéo « Photographie - Paris 1965 » fait double emploi avec la précédente. Le champ
`ouverture` de la nomenclature des voies ne date que 28 voies d'après 1975 (3,9 km). Pour 4 318 voies (985 km), il est
vide.

## 2. Ce que disent les chiffres

### Le bâti d'aujourd'hui, à la date de 1975

| Statut | Bâtiments | Emprise | Part |
|---|---:|---:|---:|
| Réel, de 1937 ou d'avant | 95 961 | 2 023 ha | 60,8 % |
| Réel, de 1938 à 1975 | 10 699 | 493 ha | 14,8 % |
| Postérieur à 1975 | 13 752 | 683 ha | 20,5 % |
| Sans date | 7 794 | 129 ha | 3,9 % |

**Les classes de l'APUR** (période, années extrêmes des bâtiments datés) : 1940-1967 (années 1875 à 1968, quelques
écarts), **1968-1975 (1926 à 1975)**, 1976-1981 (1900 à 1981). Le classement à la date de 1975 est donc sans ambiguïté :
tout ce qui est de la période 1968-1975 ou d'avant est réel.

**Part du bâti postérieur à 1975, par arrondissement** : 3 à 7 % dans les neuf premiers ; 12 à 18 % dans les 10e, 11e,
16e et 17e ; 23 à 25 % dans les 14e et 18e ; **30 % dans le 12e, 32 % dans le 15e, 34 % dans le 20e, 36 % dans le 13e,
43 % dans le 19e**. Le bâti de 1938 à 1975 pèse surtout dans les 13e (25 %) et 15e (26 %), puis les 12e, 16e, 19e et
20e (18 à 19 %).

**Les tours** : 324 constructions de 50 m et plus sont réelles en 1975, dont 21 de plus de 100 m (la tour Eiffel et une
cheminée comprises), contre 130 bâties depuis. On compte 65 tours réelles de 60 m et plus, une par 150 m, en écartant
les emprises de moins de 200 m² : ce sont des cheminées, comme celle de 136 m (1967) au Front de Seine. Les plus hautes
sont la tour Montparnasse (215 m, 1973), l'hôtel Concorde-Lafayette de la porte Maillot (134 m, 1974), les Orgues de
Flandre (121 m, 1975), l'hôtel de la rue du Commandant-Mouchotte (113 m, 1974), puis les tours d'Italie 13 et des
Olympiades (106 à 112 m, 1972 à 1975). **La silhouette de 1975 est dans les données**, hauteurs comprises.

**Ce que l'APUR date bien** (repères, plus haut bâtiment à moins de 80 m) : la tour Montparnasse (1973), la gare
Montparnasse et ses immeubles-ponts (période 1968-1975), la tour Zamansky de Jussieu (1965), la Maison de la Radio
(1962), l'UNESCO (1958), la tour Super-Italie (1975), la Grande Halle de la Villette (1863), la gare d'Orsay (période
1851-1914). Au Front de Seine, les tours sont datées de 1969 à 1977 : une partie seulement est debout en 1975.

**Ce qui est postérieur et cache un autre état en 1975** : le
Centre Pompidou (1977, en chantier en 1975), le Forum et le jardin des Halles (le « trou » en 1975), l'Opéra Bastille
(1989, sur la gare de la Bastille, fermée en 1969 mais encore debout), la Cité des sciences (1983-1986, dans la salle
des ventes inachevée des abattoirs), le palais omnisports de Bercy (1983, sur les entrepôts), la Bibliothèque nationale
(1995, sur les faisceaux d'Austerlitz), le parc André-Citroën (sur les usines de Javel), le square de la Roquette (la
Petite Roquette, démolie en 1974).

### Les zones refaites d'un bloc depuis 1975

On appelle ainsi les cellules de 150 m dont plus de 60 % de l'emprise bâtie est postérieure à 1975, reliées par leurs
côtés. On en compte 156, avec 262 ha de bâti postérieur. Les plus grandes, contrôlées sur la photographie de 1965 et
la carte de 1979 :

| Zone | Arr. | Bâti postérieur | Bâti actuel (quartiles) | En 1965 et en 1979 |
|---|---|---:|---|---|
| Paris Rive Gauche (Tolbiac, Masséna) | 13e | 20 ha | 2006-2019 | gare de marchandises d'Austerlitz, faisceaux, entrepôts et magasins généraux, inchangés |
| Bercy (cour Saint-Émilion) | 12e | 10 ha | 1991-2006 | entrepôts de Bercy, en rangées serrées, inchangés |
| Macdonald, Rosa-Parks | 19e | 10 ha | 2012-2014 | entrepôt Macdonald et faisceaux de l'Est (à préciser) |
| La Chapelle (Évangile) | 18e | 9 ha | 1987-2018 | gare de marchandises de la Chapelle |
| Bercy (ministère des Finances, palais omnisports) | 12e | 8 ha | 1988-1994 | gare de Bercy-la-Rapée et entrepôts |
| Austerlitz (Paris Rive Gauche nord) | 13e | 6 ha | 1997-2018 | gare de marchandises d'Austerlitz |
| Plaisance, Vercingétorix | 14e | 5 ha | 1986-1992 | faubourg en 1965, **dégagé** sur la carte de 1979 : rénovation en cours |
| Javel, Balard (plusieurs zones) | 15e | 4 × 4 à 5 ha | 1989-2014 | usines Citroën sur la photographie de 1965, **déjà rasées** sur la carte de 1979 |
| Les Batignolles (Clichy-Batignolles) | 17e | 4 + 4 ha | 1985-2019 | gare de marchandises et ateliers |
| La Villette (Cité des sciences, parc) | 19e | 4 ha | 1990-2002 | abattoirs et marché aux bestiaux ; « anciens abattoirs » sur la carte de 1979 |
| Reuilly-Diderot | 12e | 4 ha | 1991-2000 | gare de marchandises de Reuilly |
| Saint-Blaise | 20e | 4 ha | 1979-1988 | faubourg, rénovation des années 1970 et 1980 |

Les Halles (2,5 ha, 1985-1989), Belleville, la place des Fêtes, Flandre et Italie 13 viennent ensuite. Leur rénovation
avait commencé avant 1975 : une partie de leur bâti neuf est réel à la date, l'autre non.

### Les rues

Les voies d'aujourd'hui au sol (1 840 km de tronçons, plus 88 km en souterrain et 38 km en dessus) :

- 1 298 km sont sur un tracé de 1900 ;
- **44 km sont bordés de bâti de 1938 à 1975** : ce sont les **voies ouvertes de 1938 à 1975** (Italie 13, Maine-
  Montparnasse, Front de Seine, porte de Saint-Cloud, ensembles de la porte de Montreuil et de la porte de Bagnolet) ;
- **64 km sont bordés de bâti postérieur** : ce sont les **voies ouvertes après 1975** (Paris Rive Gauche, Javel,
  Batignolles, la Chapelle, Bercy) ;
- 117 km sont bordés de bâti de 1937 ou d'avant : déjà traités pour 1937 (ancienne enceinte) ou écarts de tracé ;
- 68 km n'ont pas de riverains (berges, dalles, voies des grands ensembles), à trancher au cas par cas ;
- 250 km sont hors de la ville de 1900 (bois, boulevard périphérique, ancienne zone).

**Voies de 1900 disparues depuis** (à plus de 12 m de toute voie actuelle) :

- 8,8 km sont sous des bâtiments postérieurs à 1975, en principe **encore là en 1975** (Bercy, quartier de l'Horloge,
  Javel, la Villette) ;
- **4,4 km sont sous des bâtiments de 1938 à 1975, donc supprimés avant 1975** (la Halle aux vins devenue Jussieu, le
  quartier de l'ancienne gare Montparnasse, Italie) ;
- 41,9 km sont sous un espace libre, à voir au cas par cas : jardins, faisceaux, le trou des Halles.

### Les noms

1 518 voies d'aujourd'hui ont un arrêté de dénomination postérieur à 1975. Pour **139 d'entre elles, la nomenclature
donne le nom de 1975**. Exemples : boulevard de la Gare (aujourd'hui boulevard Vincent-Auriol, 1976), quai du
Point-du-Jour (quai Saint-Exupéry, 1976), place du Théâtre-Français (place André-Malraux, 1977), place de la
Porte-des-Ternes (place du Général-Koenig, 1978), place du Trocadéro (place du Trocadéro-et-du-11-Novembre, 1978). Les
autres sont des voies ouvertes depuis, ou des arrêtés qui reprennent un nom déjà porté, à trier comme pour 1937.

## 3. Méthode proposée

**Point de départ : la ville de 1937, corrigée de 1938 à 1975.** C'est le même algorithme que celui de
`tools/ville_1937.py` pour 1901-1937, avec `AN = 1975` :

1. **Rues ajoutées** : les voies d'aujourd'hui absentes de la base, si elles sont bordées pour une bonne part de bâti
   de 1938 à 1975. On y ajoute le boulevard périphérique (achevé en 1973) et les voies express sur berge (rive droite,
   1967 ; rive gauche, tronçons ouverts avant 1975, à vérifier), qui n'ont pas de riverains.
2. **Îlots remplacés** : les îlots qu'elles traversent sont remplacés par ceux d'aujourd'hui (APUR).
3. **Rues retirées** : les voies de 1900 recouvertes de bâti de 1938 à 1975.
4. **Noms** : ceux de 1937, suivis jusqu'en 1975 (`Noms.a_la_date`). Une voie ouverte depuis prend son nom
   d'aujourd'hui, ramené à celui de 1975 (`Noms.avant`).

**Bâti.** La méthode de 1937 à la date de 1975 (`tools/extract_1889.py` étendu à `AN = 1975`). Le bâti des périodes
1940-1967 et 1968-1975 sans année est réel. Le bâti évoqué de 1937 est gardé là où le bâti d'aujourd'hui est postérieur
à 1975 dans un tissu ancien.

**Les grands sites de 1975, modelés à part** :

- **encore debout en 1975, repris de la maquette de 1937** : les entrepôts de Bercy, la gare de la Bastille (fermée
  en 1969), les gares de marchandises (Austerlitz, la Chapelle, Batignolles, Reuilly, Bercy) ;
- **changés depuis 1937, à reprendre** : les abattoirs de la Villette (fermés en mars 1974) avec la salle des ventes
  inachevée, les usines Citroën de Javel (fin de la production à Javel vers 1975, rasées avant 1979 : état à l'été 1975
  à établir) ;
- **propres à 1975** : le trou des Halles (pavillons de Baltard démolis de 1971 à 1973, Forum ouvert en 1979) ; le
  Centre Pompidou en chantier (inauguré le 31 janvier 1977 ; état de la charpente à l'été 1975 à établir) ; la gare d'Orsay
  désaffectée.
- **disparus avant 1975**, à ne plus montrer : la Halle aux vins, la gare Montparnasse de 1852, la Petite Roquette
  (démolie en 1974), le Vélodrome d'Hiver (1959).

Toutes ces dates sont à vérifier dans les sources écrites avant d'être figées.

**Les quartiers en rénovation à la date.** Italie 13, Belleville et la place des Fêtes, Flandre, Plaisance et
Vercingétorix, Saint-Blaise, le Front de Seine : la photographie de 1965 y montre le faubourg, la carte de 1979 des
grands ensembles et des terrains dégagés. Proposition de convention, tant qu'on n'a pas de photographie de 1975 :

- un bâtiment daté de 1976 à 1978 est **en chantier** à l'été 1975 : terrain dégagé ;
- un bâtiment daté de 1979 ou après laisse en place le **tissu de 1937** ;
- la carte de 1979 sert de contrôle pour les terrains déjà dégagés.

Les clichés de « Remonter le temps » (missions de 1974 à 1976) permettraient de vérifier ces conventions.

**Voies ferrées.** `tools/fer_1889.py` avec une table pour 1975 :

- la Petite Ceinture, réservée aux marchandises (rails en place) ;
- la ligne d'Auteuil, encore en service (fermée en 1985) ;
- la ligne de Vincennes, devenue en 1969 la branche de Boissy du RER A : la gare de la Bastille est fermée ;
- les faisceaux de marchandises, tous encore là.

Le RER A (Nation–Boissy en 1969, Étoile–La Défense en 1970, Auber–Étoile en 1971 ; Auber–Nation en chantier jusqu'en
1977) et le métro sont souterrains ; seules leurs gares et leurs émergences
comptent.

## 4. Décisions à prendre avant l'extraction

- **La méthode** : la ville de 1937 corrigée de 1938 à 1975 (proposée), ou une base nouvelle tirée des îlots et des
  voies d'aujourd'hui, retranchée de ce qui est postérieur à 1975. La seconde demanderait de réécrire l'extraction
  (`tools/extract_1889.py` repose sur la base « Paris 1900 ») et de remettre de toute façon les rues de 1937 dans les
  zones refaites depuis.
- **L'accès à « Remonter le temps »** (`remonterletemps.ign.fr` et son serveur d'images), pour les clichés de 1974 à
  1976 : à demander si l'on veut vérifier les quartiers en rénovation plutôt que de s'en tenir à des conventions.

## 5. Points ouverts

- La date et l'état à l'été 1975 de chaque grand chantier : charpente du Centre Pompidou, profondeur et emprise du trou
  des Halles, démolition des usines Citroën, devenir des bâtiments des abattoirs.
- Les licences de la carte Édugéo de 1979 et des photographies historiques de l'IGN, à confirmer avant de diffuser
  quoi que ce soit qui en dérive. La maquette n'en tirerait que des emplacements, comme pour 1937.
- Les voies sans riverains (68 km) et les voies des dalles (Front de Seine, Olympiades) : ouvertes avant ou après
  1975, au cas par cas.
- Les passants : costumes et voitures de 1975, à faire.
