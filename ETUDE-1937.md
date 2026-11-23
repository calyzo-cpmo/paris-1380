# Paris 1937 — étude des données

Étape 3 de la feuille de route (`FEUILLE-DE-ROUTE.md`), faite le 23 novembre 2026, suivie de la première extraction
(section 4) : avant de bâtir la maquette, savoir
d'où viendront les rues, les îlots et les bâtiments de 1937, et ce qui manque pour les quartiers démolis depuis. Les
chiffres viennent de `python3 tools/etude_1937.py` (sources de `tools/fetch_1889.py`, plus trois couches de l'APUR
gardées dans `data/source/1937/`) ; les vérifications visuelles, de `python3 tools/photo1949.py`.

## En bref

- **Aucune base vectorielle ne décrit Paris en 1937**, ni les rues, ni les îlots, ni le bâti. Mais la méthode de 1889
  et de 1900 s'y prête mieux qu'à ces dates : à la date de 1937, **61 % de l'emprise bâtie d'aujourd'hui est réelle ou
  probable** (pour 1900 : 35 % datés de 1900 ou d'avant, plus une part des 10 % de la période 1851-1914 sans année),
  et l'APUR date 16 342 bâtiments de 1901 à 1937 (416 ha), dont les HBM de la ceinture.
- **Le bâti postérieur à 1937 (35 % de l'emprise, 1 176 ha) se trouve à 87 % dans des îlots déjà bâtis en 1900**
  (1 021 ha) : la ville de 1937 a surtout été remplacée sur place. La base « Paris 1900 » reste le bon cadre, à
  corriger de ce qui a changé de 1901 à 1937.
- **La moitié de ce bâti postérieur (586 ha) tient dans des zones refaites d'un bloc** : Italie 13, Flandre, Maine-
  Montparnasse, Paris Rive Gauche, la Villette, Reuilly, Belleville, Saint-Blaise, la Chapelle, Front de Seine… Ce sont
  les « quartiers démolis depuis » : des gares de marchandises, des usines, des entrepôts autant que des îlots de
  faubourg.
- **La photographie aérienne de l'IGN « Paris 1949 »** (0,8 m par pixel, accessible d'ici) montre la ville avant ces
  opérations : on y voit les Halles de Baltard, le plateau Beaubourg déjà rasé, la gare des Gobelins, la gare
  Montparnasse de 1852, les entrepôts de Bercy, la Halle aux vins. L'APUR ne date que 311 bâtiments de 1938 à 1949 :
  à douze ans près, c'est l'état de 1937. C'est la source de contrôle.
- **L'Atlas municipal de 1937** (Bibliothèque de l'Hôtel de Ville, 1/5 000, 16 planches) existe et a été géoréférencé
  par le projet SoDUCo, mais il n'est pas vectorisé et le serveur qui en sert les images ne répond pas (23 novembre
  2026). Il servira de contrôle des rues, pas de base.
- **Méthode proposée** (détail plus bas) : la base de 1900 corrigée par la date des bâtiments qui bordent ou
  recouvrent chaque rue ; la ceinture de l'ancienne enceinte reprise des îlots et des voies d'aujourd'hui ; le bâti
  recomposé comme en 1900 ; les grands disparus modelés à part d'après la photo de 1949.

## 1. Les sources

| Source | Ce qu'elle donne | Accès d'ici | Licence | Usage proposé |
|---|---|---|---|---|
| APUR, `EMPRISE_BATIE_PARIS` (déjà téléchargée) | emprise, hauteur, période et souvent année de construction de chaque bâtiment d'aujourd'hui | oui | ODbL 1.0 | bâti réel et probable de 1937 ; date des rues par leurs riverains |
| Base « Paris 1900 » (Projets Time Machine, Nakala, déjà téléchargée) | îlots et rues vers 1900, construits à rebours depuis les données actuelles ; chaque îlot dit s'il a changé depuis (`modif_ilot` : ok, changements mineurs, majeurs), chaque rue aussi (`chang-topo`) et son nom de 2021 | oui | ODbL 1.0 | cadre des rues et des îlots, à corriger de 1901 à 1937 |
| APUR, `TRONCON_VOIE_PARIS`, `ILOT_PHYSIQUE`, `PLANS_HISTORIQUES/enceintes_paris` | voies et îlots d'aujourd'hui ; emprise de l'enceinte de Thiers | oui | ODbL 1.0 | rues ouvertes de 1901 à 1937, ceinture des HBM |
| IGN, « Photographie - Paris 1949 » (`ORTHOIMAGERY.EDUGEO.PARIS1949`, WMTS de la Géoplateforme) ; aussi « Photographies aériennes historiques 1950-1965 » | photographie aérienne orthorectifiée, noir et blanc, 0,8 m par pixel au niveau 17, bien calée sur l'actuelle | oui | IGN, données ouvertes (licence à confirmer pour la couche Édugéo) | contrôle des quartiers disparus, tracé des grands édifices disparus |
| Atlas municipal des vingt arrondissements, édition 1937 (BHdV, ark:/73873/pf0000935528) | rues, îlots, édifices publics, au 1/5 000, à la date | **non** : hôtes autorisés le 23 novembre, mais le serveur d'images de SoDUCo (`iiif.geohistoricaldata.org`) coupe la connexion, d'ici comme d'un service extérieur ; le portail de la BHdV est une application JavaScript dont l'API ne livre pas la notice | images : à vérifier ; points d'appui SoDUCo publiés sur GitHub (`soduco/allmaps_annotations`) | contrôle des rues et des îlots de 1937, quand le serveur répondra |
| Ville de Paris, « Dénominations caduques des voies » (9 108 noms) et « Dénominations des emprises des voies actuelles » | anciens noms, voies supprimées, date des arrêtés (`date_voie_ancienne`) et historique | oui depuis le 23 novembre (`tools/fetch_1889.py 1937`) | ODbL 1.0 | noms des rues en 1937 (`tools/ville_1937.py`) |
| APUR, `PLANS_HISTORIQUES` : carte IGN « assemblage années 30 à années 60 » (1/20 000), carte du département de la Seine de 1921 | plans calés, bâti en rouge pour la première | oui (export d'images) | Apur, IGN — pas en données ouvertes | repère secondaire seulement : dates mêlées (1930-1960) ou image trop grossière (1921) |

**Écartées** : le champ `periode_construction` des tronçons de voie de l'APUR ne date pas les rues (essayé sur la rue
de Rivoli, la rue de Rennes, le boulevard du Montparnasse : valeurs sans rapport avec leur ouverture) ; la couche
`Plan_Pelet_1939` de l'APUR est en fait le plan Pelet de 1839 ; `BDDEMOLITION` recense les démolitions à venir. Le
projet SoDUCo n'a publié de données vectorielles que pour l'Atlas municipal de 1888 (géocodeur historique) ; aucune
recherche n'a trouvé de vectorisation des éditions de 1925 ou de 1937, ni des dix-sept îlots insalubres.

## 2. Ce que disent les chiffres

### Le bâti d'aujourd'hui, à la date de 1937

| Statut | Bâtiments | Emprise | Part |
|---|---:|---:|---:|
| Réel (avant 1915, ou daté de 1937 au plus tard) | 92 786 | 1 910 ha | 57 % |
| Probable (période 1915-1939 sans année) | 3 175 | 112 ha | 3 % |
| Postérieur à 1937 | 24 451 | 1 176 ha | 35 % |
| Sans date | 7 794 | 129 ha | 4 % |

Les classes de l'APUR s'y prêtent : la période 1851-1914 est entièrement antérieure à 1937, et la période 1915-1939 ne
déborde que de deux ans (98,5 % des bâtiments datés de cette période le sont de 1937 ou d'avant). Plus besoin, comme
pour 1889 et 1900, de deviner la date des bâtiments de 1851-1914 sans année.

**Part du bâti postérieur à 1937, par arrondissement** : moins de 10 % dans les 1er, 2e, 3e, 4e et 9e ; 10 à 22 % dans
les 5e à 8e et le 10e ; 29 à 42 % dans les 11e, 14e, 16e, 17e et 18e ; **49 % dans le 12e, 53 % dans le 20e, 58 %
dans le 15e, 61 % dans le 13e, 62 % dans le 19e**. L'atlas de Vasserot, utile au centre pour 1889, n'a plus de rôle :
le centre de 1937 est presque entièrement debout.

**Où est le bâti postérieur** : 1 021 ha dans des îlots bâtis en 1900, 145 ha hors des îlots de 1900 (ancienne
enceinte et zone, voies ferrées, bois), 10 ha dans des îlots non bâtis de 1900.

### Les zones refaites d'un bloc

Cellules de 150 m dont plus de 60 % de l'emprise bâtie est postérieure à 1937, reliées par leurs côtés : 219 zones,
586 ha de bâti postérieur. Les plus grandes, identifiées sur la photo de 1949 :

| Zone | Arr. | Bâti postérieur | Bâti actuel (quartiles) | Sur la photo de 1949 |
|---|---|---:|---|---|
| Italie 13 (Olympiades, avenue d'Italie, Choisy) | 13e | 41 ha | 1971-1993 | gare des Gobelins, tissu de faubourg bas |
| Flandre, la Villette nord | 19e | 28 ha | 1974-2009 | usine à gaz et gazomètres, gares de marchandises, HBM des boulevards |
| Maine-Montparnasse, Vaugirard | 15e | 27 ha | 1970-1991 | gare Montparnasse de 1852 et son faisceau |
| Paris Rive Gauche (Austerlitz, Tolbiac) | 13e | 23 ha | 1998-2016 | gare de marchandises d'Austerlitz, faisceaux le long de la Seine |
| La Villette (bassin, Crimée) | 19e | 21 ha | 1977-2000 | bassin, magasins généraux, entrepôts |
| Reuilly, Nation | 12e | 19 ha | 1972-1995 | gare de marchandises de Reuilly, faubourg |
| Belleville, Ménilmontant | 20e | 18 ha | 1969-1995 | tissu de faubourg très serré |
| Saint-Blaise, Charonne | 20e | 16 ha | 1979-1991 | faubourg ; à l'est, HBM et terrains vagues de la zone |
| La Chapelle | 18e | 16 ha | 1985-1999 | gare de marchandises, gazomètres, HBM et zone au nord |
| Front de Seine (Beaugrenelle) | 15e | 14 ha | 1963-1990 | usines et ateliers de Grenelle |
| Javel, Grenelle | 15e | 12 ha | 1962-1992 | ateliers et petites maisons (à préciser) |
| Glacière, Tolbiac | 13e | 11 ha | 1963-1973 | à préciser |
| Bercy | 12e | 10 ha | 1990-2006 | entrepôts de Bercy |

Viennent ensuite la gare de Lyon (Chalon), d'autres morceaux de Bercy et de Paris Rive Gauche, la Grange-aux-Belles,
Clichy-Batignolles, la Halle aux vins (Jussieu). Les Halles et le plateau Beaubourg n'y figurent pas : un jardin et un
centre culturel y ont remplacé des édifices qu'il faut de toute façon modeler à part.

### L'ancienne enceinte et la ceinture des HBM

En 1937 les fortifications sont démolies (1919-1929) ; la zone a été rattachée à Paris (décret du 3 avril 1925 pour
Montrouge et Malakoff, d'après la nomenclature des voies). L'APUR range 1 317 bâtiments dans le tissu « HBM » :
**1 079 sont réels en 1937**, dont 880 datés de 1920 à 1937. Sur l'emprise même de l'enceinte, 11,9 ha de bâti réel
contre 9,2 ha de bâti postérieur. La zone, elle, est aujourd'hui sous le boulevard périphérique et les équipements
sportifs : en 1937, terrains vagues, jardins ouvriers et baraques, à évoquer.

### Les rues

- **Voies d'aujourd'hui absentes de la base de 1900** (à plus de 12 m de toute voie de 1900) : 82 km bordées de
  bâtiments de 1901 à 1937 — **ouvertes avant 1937** : ceinture des HBM et lotissements de l'ancienne enceinte, porte
  par porte, lotissement des bords du Champ-de-Mars ; 101 km bordées de bâti postérieur à 1937 — **ouvertes après** ; 86 km sans
  riverains, à trancher sur la photo de 1949 ; 41 km bordées de bâti antérieur à 1900 (écarts de tracé ou passages
  absents de la base de 1900, à examiner) ; 8 km sur l'enceinte ; 331 km hors de la ville de 1900 (bois,
  périphérique).
- **Voies de 1900 disparues depuis** (à plus de 12 m de toute voie actuelle) : 13 km sous des bâtiments postérieurs à
  1937 — en principe **encore là en 1937** (Halle aux vins, Bercy, Montparnasse, Javel, Flandre), sauf au plateau
  Beaubourg, rasé dans les années 1930 et rebâti en 1977 ; 42 km sous un espace libre (jardins, places, emprises
  ferroviaires) — au cas par cas ; 0,5 km seulement sous des bâtiments de 1901 à 1937 —
  supprimées avant 1937.
- **Îlots de 1900** : sur 1 655 îlots que la base dit inchangés, 1 321 ont un bâti ancien ; sur 1 438 îlots aux
  « changements majeurs », 423 ont été refaits après 1937, 208 rebâtis en partie de 1901 à 1937, 583 sont peu bâtis
  aujourd'hui (voies ferrées, jardins, enceinte).

## 3. Méthode proposée

**Rues et îlots de 1937.** Partir de la base « Paris 1900 », à rebours comme elle l'a été elle-même :

1. garder les rues et les îlots de 1900 ;
2. ajouter les voies d'aujourd'hui qui n'y sont pas et que bordent des bâtiments de 1901 à 1937, et redécouper les
   îlots qu'elles traversent (îlots actuels de l'APUR) ;
3. sur l'ancienne enceinte, prendre les îlots et les voies d'aujourd'hui là où le bâti date de 1920 à 1937 (HBM, Cité
   universitaire, stades), et laisser la zone en terrains vagues au-delà ;
4. retirer les rares voies de 1900 que recouvre un bâtiment de 1901 à 1937 ; trancher les cas douteux (voies sans
   riverains, plateau Beaubourg) sur la photo de 1949, et sur l'Atlas municipal de 1937 si son accès est ouvert ;
5. nommer les rues d'après la base de 1900, corrigée des arrêtés de dénomination antérieurs à 1937 (dénominations
   caduques de la Ville de Paris).

**Bâti.** La méthode de 1889 et de 1900 à la date de 1937 (`tools/extract_1889.py` étendu à `AN = 1937`) : réel et
probable d'après l'APUR ; évoqué sur l'emprise actuelle là où le bâti postérieur s'élève dans un tissu ancien ;
maisons évoquées le long des rues de 1937 ailleurs ; plus d'atlas de Vasserot.

**Disparus, modelés à part** (comme les Halles et le palais de l'Industrie en 1889), à tracer sur la photo de 1949 :
les douze pavillons des Halles, la Halle aux vins, les entrepôts de Bercy, les abattoirs et le marché aux bestiaux de
la Villette, les abattoirs de Vaugirard, la gare Montparnasse de 1852, la gare de la Bastille, la gare des Gobelins,
les gares de marchandises (Austerlitz, la Chapelle, Reuilly), l'usine à gaz de la Villette et ses gazomètres, les
usines de Grenelle et de Javel, le Vélodrome d'Hiver, la prison de la Roquette.

**Voies ferrées.** `tools/fer_1889.py` avec une table pour 1937 : la Petite Ceinture sans voyageurs depuis 1934 mais
ses rails en place, la ligne d'Auteuil, la ligne de Vincennes et la gare de la Bastille, la gare Montparnasse et son
faisceau, les gares de marchandises.

**Exposition de 1937** (25 mai - 25 novembre 1937) : à part, comme celle de 1900. Le palais de Chaillot est daté de
1937 par l'APUR (réel), le palais de Tokyo est dans la période 1915-1939 (probable) ; les pavillons sont à modeler
d'après le guide officiel et les photographies, sources à rassembler.

## 4. Décisions et première extraction (23 novembre 2026)

**Décidé** : la base de 1900 corrigée (méthode ci-dessus) ; la ville à l'**été 1937, Exposition ouverte**, sans curseur
de chantier ; l'accès réseau à l'Atlas municipal et à la nomenclature des voies, demandé et accordé.

**Fait** : `python3 tools/fetch_1889.py 1937` (sources propres à 1937 dans `data/source/1937/`), puis
`python3 tools/extract_1889.py 1937` → `data/paris1937.json`, même format que 1889 et 1900 ; les rues, les îlots et les
noms sont corrigés par `tools/ville_1937.py`. 1889 et 1900 sortent inchangés, à l'octet près.

- **Rues** : 77 km de voies ouvertes de 1901 à 1937 (1 151 tronçons, presque tous nommés), surtout sur l'ancienne
  enceinte et aux bords du Champ-de-Mars ; aucune dans les bois. **Noms** : 414 tronçons de 1900 portent en 1937 un
  autre nom — avenue du Bois devenue avenue Foch (1929), rue de Berlin devenue rue de Liège (1914), avenue d'Antin devenue
  avenue Victor-Emmanuel-III (1918), quai Debilly devenu avenue de Tokio (1918). Un renommage n'est retenu que si la
  chaîne des dénominations aboutit au nom actuel que la base de 1900 donne à la voie : la nomenclature ne situe pas ses
  anciens noms, et la « rue de Rivoli » de Belleville (devenue rue Julien-Lacroix) n'est pas celle du Louvre. Une voie
  ouverte depuis 1900 et renommée depuis 1937 reprend son nom d'alors (avenue de la Porte de Gentilly pour l'actuelle
  avenue Pierre-de-Coubertin).
- **Îlots** : 6 521. 399 îlots de 1900 (dont les 46 du rempart) sont remplacés par 1 015 îlots d'aujourd'hui ; 1 127
  îlots d'aujourd'hui couvrent le fossé, le glacis et la zone (111 bâtis en 1937 : HBM, Cité universitaire…) ; le
  plateau Beaubourg est dégagé (trois îlots de 1900) ; le Champ-de-Mars est un jardin bordé des immeubles de son
  lotissement.
- **Bâti** : 110 867 bâtiments — 84 794 réels, 6 022 probables, 6 817 évoqués sur leur emprise actuelle, 13 234 évoqués
  le long des rues ; ni maison de faubourg évoquée sur l'ancienne enceinte, ni atlas de Vasserot.
- **Voies ferrées** : les règles de 1900 (Petite Ceinture, ligne d'Auteuil, ligne de Vincennes) : 582 km.

**Plateau Beaubourg** : vide depuis 1935 environ, rasé et devenu parking en 1937 selon le Centre Pompidou ; parking sur
la photographie de 1949, où la rangée de la rue Rambuteau est encore debout (elle est gardée).

## 5. Points ouverts

- **Zones refaites depuis** : l'évocation le long des rues y est clairsemée, faute de bâtiments anciens autour (Italie
  13, Flandre…), alors que la photographie de 1949 y montre un faubourg serré ; à régler d'après elle, avec les grands
  disparus à modeler à part (gare des Gobelins, Halle aux vins, entrepôts de Bercy, gare Montparnasse de 1852…).
- **L'Atlas municipal de 1937** : à reprendre comme contrôle quand le serveur de SoDUCo répondra.
- **Licences** : couche Édugéo « Paris 1949 » de l'IGN et images de la BHdV, à confirmer avant de diffuser quoi que ce
  soit qui en dérive (la base `data/paris1937.json` n'en dérive pas : seul le dégagement du plateau Beaubourg s'appuie
  sur la photographie, avec les sources écrites).
- **Les voies sans riverains** (175 km écartés, dont le boulevard périphérique et les voies des grands ensembles) : des
  liaisons ouvertes avant 1937 peuvent y manquer.
