# Paris 1380 — maquette 3D interactive

Restitution en trois dimensions de Paris à la fin du règne de Charles V (vers 1380-1400), consultable dans un navigateur :
survol libre, visite guidée en treize étapes, promenade à pied dans les rues, fiches historiques et heure du jour réglable.

**Ouvrir la maquette :** `dist/index.html` (fichier autonome, aucun serveur nécessaire).

## Ce que montre la maquette

- la Seine, ses îles (Cité, île Notre-Dame, île aux Vaches, île des Javiaux) et le relief (montagne Sainte-Geneviève, Montmartre) ;
- les deux enceintes — Philippe Auguste (1190-1215) et Charles V (1356-1383) — avec leurs tours, leurs portes et leurs fossés ;
- Notre-Dame, le Palais de la Cité et la Sainte-Chapelle, le Louvre de Charles V, la Bastille, le Temple, les Châtelets, la tour de Nesle ;
- les ponts habités (Grand-Pont, Petit-Pont, pont Saint-Michel), le pont aux Meuniers et ses moulins ;
- une centaine d'églises, couvents, abbayes, collèges, hôtels princiers, halles et cimetières sur leurs emprises ;
- environ 17 000 maisons à pans de bois loties le long de toutes les rues ;
- la campagne, les faubourgs, le gibet de Montfaucon, les moulins à vent, les bateaux des ports.

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
| Vraisemblable mais conjectural | forme de chaque maison, élévation des églises paroissiales et des hôtels, végétation, bateaux, relief de détail |

## Organisation

```
data/source/Paris_1380.svg   plan ALPAGE d'origine (CC BY-SA 2.0 FR)
data/paris1380.json          géométrie extraite, en mètres (origine : parvis Notre-Dame)
data/thumbs.json             vignettes des sources (domaine public)
tools/extract_alpage.py      SVG → JSON (calques, courbes aplanies, libellés)
tools/build.mjs              assemble la page autonome dans dist/
tools/shot.mjs               captures d'écran de contrôle (Playwright)
src/terrain.js, raster.js    relief, berges, occupation du sol
src/houses.js                lotissement des îlots et maisons
src/special.js               églises, couvents, hôtels, collèges, halles, enclos
src/walls.js, monuments.js   enceintes, portes, Bastille, Louvre, Notre-Dame, Palais, ponts…
src/landscape.js             arbres, bateaux, fumées, moulins
src/places.js, sources.js    fiches des lieux, visite guidée, catalogue des sources
src/ui.js, controls.js       interface et caméra
```

## Reconstruire

```
npm install
npm run extract   # facultatif : régénère data/paris1380.json depuis le SVG
npm run build     # produit dist/index.html
```

Dépendances : [three.js](https://threejs.org) (MIT), [clipper-lib](https://www.npmjs.com/package/clipper-lib) (BSL-1.0),
esbuild (outil de build). Toute la géométrie et toutes les textures sont générées par le code au chargement de la page.
