# Paris 1380 — maquette 3D interactive

Restitution en trois dimensions de Paris à la fin du règne de Charles V (vers 1380-1400), consultable dans un navigateur :
survol libre, visite guidée en treize étapes, promenade à pied dans des rues peuplées, histoire de chaque monument,
visite de leurs intérieurs et heure du jour réglable.

**Ouvrir la maquette :** `dist/index.html` (fichier autonome, aucun serveur nécessaire).
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
- **le détail** : façades en double définition, auvents, enseignes, lucarnes, tonneaux, 190 étals de marché, puits, rues pavées,
  contreforts et croix des églises, archères des tours, échafaudages et grues des chantiers (Bastille, pont Saint-Michel,
  églises en construction), meules, 27 villages des environs, château de Vincennes, chartreuse de Vauvert.

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
| Évocation | habitants, bêtes, étals, bateaux, bannières, chantiers : ils donnent l'échelle et la vie, leur place exacte est inventée ; villages, Vincennes et chartreuse sont situés d'après leur emplacement connu, hors du plan |

## Organisation

```
data/source/Paris_1380.svg   plan ALPAGE d'origine (CC BY-SA 2.0 FR)
data/paris1380.json          géométrie extraite, en mètres (origine : parvis Notre-Dame)
data/thumbs.json             vignettes des sources (domaine public)
tools/extract_alpage.py      SVG → JSON (calques, courbes aplanies, libellés)
tools/build.mjs              assemble la page autonome dans dist/
tools/shot.mjs               captures d'écran de contrôle (Playwright)
tools/test.mjs               test fonctionnel : foule, visite, marche, heure, sources, clic sur les monuments, intérieurs, mobile, console sans erreur
tools/multishot.mjs          plusieurs captures de contrôle en un seul chargement
tools/inshot.mjs, uishot.mjs captures des intérieurs et de l'interface
tools/make_thumbs.py         vignettes des sources (réduction locale des images du domaine public)
src/terrain.js, raster.js    relief, berges, occupation du sol
src/houses.js                lotissement des îlots et maisons
src/special.js               églises, couvents, hôtels, collèges, halles, enclos
src/walls.js, monuments.js   enceintes, portes, Bastille, Louvre, Notre-Dame, Palais, ponts…
src/landscape.js             arbres, bateaux à quai, fumées, moulins à vent
src/people.js                personnages articulés instanciés : foule mobile, cavaliers, charrettes, bêtes, figurants ; deux niveaux de détail
src/figures.js               atlas peint des visages et des costumes
src/interiors.js             générateurs d'intérieurs (nef, grande salle, tour) et conduite de la visite
src/interior_kit.js          matières, vitraux, voûtes d'ogives, arcades et mobilier des intérieurs
src/interior_specs.js        dimensions et notice de chaque intérieur
src/history.js               chronologie de chaque lieu
src/life.js                  bateaux en route, bannières, roues des moulins, oiseaux
src/props.js                 étals, puits, échafaudages, grues, marchés, chantiers, villages, Vincennes, chartreuse
src/places.js, sources.js    fiches des lieux, visite guidée, catalogue des sources
src/ui.js, controls.js       interface et caméra
```

## Reconstruire

```
npm install
npm run extract   # facultatif : régénère data/paris1380.json depuis le SVG
npm run build     # produit dist/index.html
npm test          # 38 vérifications automatisées dans Chromium (Playwright requis)
```

Dépendances : [three.js](https://threejs.org) (MIT), [clipper-lib](https://www.npmjs.com/package/clipper-lib) (BSL-1.0),
esbuild (outil de build). Toute la géométrie et toutes les textures sont générées par le code au chargement de la page.
