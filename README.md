# Paris 1380 — maquette 3D interactive

Restitution en trois dimensions de Paris à la fin du règne de Charles V (vers 1380-1400), consultable dans un navigateur :
survol libre, cinq parcours commentés, promenade à pied dans des rues peuplées et jusque dans la campagne, histoire de
chaque monument, visite de leurs intérieurs, mini-plan et boussole, heure du jour réglable et calque montrant ce qui est
attesté, restitué ou conjectural.

**Voir la maquette en ligne :** <https://calyzo-cpmo.github.io/paris-1380/> (GitHub Pages, une fois activé dans les réglages du dépôt).
**L'ouvrir sur son ordinateur :** `dist/index.html` (fichier autonome, aucun serveur nécessaire).
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
- **Partager** : l'adresse de la page suit la vue, l'heure et la fiche ouverte ; le bouton « Partager » la copie.
- **Téléphone** : barre du bas sur une ligne, fiche en volet à déplier, menus repliés.

Raccourcis : `/` recherche d'un lieu, `N` nord en haut, `O` vue d'ensemble, `M` mini-plan ; à pied, `E` entrer, `F` fiche,
`V` regard à la souris, `Échap` pour remonter.

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

### Degré de certitude

| Niveau | Éléments |
| --- | --- |
| Attesté par le plan de 1380 | rues, îlots bâtis, cultures, cours de la Seine, tracé des enceintes, tours et portes, emprise au sol des édifices |
| Restitué d'après images et vestiges | volumes des grands monuments (Notre-Dame, Sainte-Chapelle, Palais, Louvre, Bastille, Temple, Châtelets) |
| Vraisemblable mais conjectural | forme de chaque maison, élévation des églises paroissiales et des hôtels, végétation, relief de détail |
| Intérieurs | dimensions connues pour Notre-Dame, la Sainte-Chapelle, la Grand'Salle, le frigidarium de Cluny, le réfectoire des Bernardins et le donjon de Vincennes ; mobilier restitué d'après textes et inventaires ; les autres intérieurs (paroisses, hôtels, corps de garde) sont des évocations, signalées dans chaque notice |
| Évocation | habitants, bêtes, étals, bateaux, bannières, chantiers : ils donnent l'échelle et la vie, leur place exacte est inventée ; villages, Vincennes et chartreuse sont situés d'après leur emplacement connu, hors du plan ; champs, haies, vignes, bois et relief de la campagne sont une évocation |

Le calque « Degré de certitude » (menu « Affichage ») reporte ces catégories sur la maquette : chaque étape de construction
classe les volumes qu'elle pose (`src/certainty.js`, `src/city.js`).

## Organisation

```
data/source/Paris_1380.svg   plan ALPAGE d'origine (CC BY-SA 2.0 FR)
data/paris1380.json          géométrie extraite, en mètres (origine : parvis Notre-Dame)
data/thumbs.json             vignettes des sources (domaine public)
tools/extract_alpage.py      SVG → JSON (calques, courbes aplanies, libellés)
tools/build.mjs              assemble la page autonome dans dist/
tools/shot.mjs               captures d'écran de contrôle (Playwright)
tools/test.mjs               test fonctionnel : abords, foule, étiquettes, liste et carnet, heure, parcours, marche à pied, intérieurs, repères, certitude, lien partageable, accueil, téléphone, console sans erreur
tools/tourshots.mjs          planches-contact des parcours commentés (contrôle des cadrages)
tools/multishot.mjs          plusieurs captures de contrôle en un seul chargement
tools/inshot.mjs, uishot.mjs captures des intérieurs et de l'interface
tools/make_thumbs.py         vignettes des sources (réduction locale des images du domaine public)
src/terrain.js, raster.js    relief, berges, plateaux de l'horizon, occupation du sol, trame d'obstacles
src/ground.js                peinture du sol : plan de 1380, campagne proche et lointaine
src/country.js               campagne : villages, chemins, bois, parcellaire en lanières, nature des cultures
src/houses.js                lotissement des îlots et maisons
src/special.js               églises, couvents, hôtels, collèges, halles, enclos
src/walls.js, monuments.js   enceintes, portes, Bastille, Louvre, Notre-Dame, Palais, ponts…
src/landscape.js             arbres, haies, bosquets, vergers, croix de chemin, bateaux à quai, fumées, moulins à vent
src/people.js                personnages articulés instanciés : foule mobile, cavaliers, charrettes, bêtes, figurants ; deux niveaux de détail
src/figures.js               atlas peint des visages et des costumes
src/interiors.js             générateurs d'intérieurs (nef, grande salle, tour) et conduite de la visite
src/interior_kit.js          matières, vitraux, voûtes d'ogives, arcades et mobilier des intérieurs
src/interior_specs.js        dimensions et notice de chaque intérieur
src/history.js               chronologie de chaque lieu
src/life.js                  bateaux en route, bannières, roues des moulins, oiseaux
src/props.js                 étals, puits, échafaudages, grues, marchés, chantiers, villages, Vincennes, chartreuse
src/places.js, sources.js    fiches des lieux, catalogue des sources
src/tours.js                 parcours commentés
src/certainty.js             calque « degré de certitude »
src/where.js                 rives, îles et rues nommées du plan (« où suis-je »)
src/minimap.js               mini-plan
src/state.js                 carnet de visite, réglages mémorisés, lien partageable
src/ui.js, controls.js       interface et caméra
```

## Reconstruire

```
npm install
npm run extract   # facultatif : régénère data/paris1380.json depuis le SVG
npm run build     # produit dist/index.html
npm test          # 86 vérifications automatisées dans Chromium (Playwright requis)
```

Dépendances : [three.js](https://threejs.org) (MIT), [clipper-lib](https://www.npmjs.com/package/clipper-lib) (BSL-1.0),
esbuild (outil de build). Toute la géométrie et toutes les textures sont générées par le code au chargement de la page.

## Licences

- **Code** (`src/`, `tools/`, `deploy/`, `Dockerfile`) : licence [MIT](LICENSE). Vous pouvez l'utiliser, le modifier et le
  redistribuer librement, y compris à des fins commerciales, en conservant la mention de copyright.
- **Plan de 1380** (`data/source/Paris_1380.svg`, `data/paris1380.json`) : [CC BY-SA 2.0 FR](https://creativecommons.org/licenses/by-sa/2.0/fr/),
  d'après J. Leuridan et J.-A. Mallet (CNRS Éditions), infographie C. Roms (LAMOP), projet ALPAGE. Toute réutilisation doit
  citer ces auteurs et partager les versions modifiées du plan sous la même licence.
- **Page construite** (`dist/index.html`) : elle réunit le code et le plan. Elle se redistribue librement à condition de
  laisser visible l'attribution du plan, qui figure dans son panneau « Sources ».
- **Vignettes des sources** (`data/thumbs.json`) : reproductions d'œuvres du domaine public.
