# Paris à travers le temps — note de déploiement

Tout ce qu'il faut pour mettre la maquette en ligne est dans ce dépôt.

## Ce qui est à déployer

Cinq fichiers autonomes, à servir côte à côte : `dist/index.html` (page d'accueil, 8 Ko : elle héberge les maquettes
dans des cadres et fait passer de l'une à l'autre), `dist/1380.html` (Paris 1380, environ 1,8 Mo, 720 Ko une fois
compressé), `dist/1789.html` (Paris 1789, environ 1,5 Mo, 660 Ko compressé) `dist/lutece.html` (Lutèce, environ
0,8 Mo, 240 Ko compressé) et `dist/1889.html` (Paris 1889, environ 3,4 Mo, 1,8 Mo compressé). Chaque maquette contient son code et
ses données ; toutes les textures et la géométrie sont
calculées dans le navigateur. Pas de base de données, pas de
variables d'environnement, pas de secret, pas de volume.

## Réglages

Pour Coolify, ou toute plateforme qui construit un Dockerfile depuis un dépôt Git :

| Réglage | Valeur |
| --- | --- |
| Dépôt | `calyzo-cpmo/paris-1380` (public) |
| Branche | `main` |
| Répertoire de base | `/` |
| Type de build | Dockerfile (à la racine) |
| Port exposé | `80` |
| Contrôle de santé | `GET /healthz` → `200 ok` |

En local : `docker build -t paris-1380 . && docker run --rm -p 8080:80 paris-1380`, puis ouvrir `http://localhost:8080`.

Variante sans Docker : n'importe quel hébergement statique, en publiant le répertoire `dist`. Le Dockerfile ajoute
seulement la compression gzip, le point `/healthz` et trois en-têtes.

Le Dockerfile ne reconstruit pas les pages : il copie `dist/index.html`, `dist/1380.html`, `dist/1789.html`, `dist/lutece.html` et `dist/1889.html` tels qu'ils
sont versionnés. Après une modification des sources, lancer `npm install && npm run build && npm test` puis committer
les cinq fichiers.

## GitHub Pages (gratuit)

Le dépôt est prêt à être servi tel quel : à la racine, `index.html` renvoie vers la page d'accueil `dist/index.html` et
`1789.html`, `lutece.html` et `1889.html` vers cette même page ouverte sur 1789, sur Lutèce ou sur 1889 (en gardant le lien partagé), et `.nojekyll` évite toute transformation des fichiers. Pour l'activer : dans le dépôt, *Settings* → *Pages* → *Build and deployment* →
*Source* : « Deploy from a branch », branche `main`, dossier `/ (root)`, puis *Save*. Le site répond au bout d'une minute
ou deux aux adresses <https://calyzo-cpmo.github.io/paris-1380/> (Paris 1380) et
<https://calyzo-cpmo.github.io/paris-1380/1789.html> (Paris 1789) , <https://calyzo-cpmo.github.io/paris-1380/lutece.html> (Lutèce) et <https://calyzo-cpmo.github.io/paris-1380/1889.html> (Paris 1889) ; chaque envoi sur `main` le met à jour.

## À savoir avant d'ouvrir au public

- **Navigateur** : WebGL 2 requis (tout navigateur récent, ordinateur ou téléphone). Le chargement calcule la ville pendant
  quelques secondes ; la page réduit d'elle-même la résolution et la foule si l'appareil peine.
- **Appel extérieur** : un seul, vers Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) pour les polices Alegreya et
  Grenze Gotisch. Sans lui la page s'affiche avec les polices du système. Si une politique CSP est posée devant le site, elle
  doit autoriser les scripts et styles en ligne (`'unsafe-inline'`), `blob:` et `data:` pour les images, et ces deux hôtes.
- **Données du visiteur** : aucun cookie, aucun envoi vers un serveur. Le carnet de visite (lieux vus, intérieurs visités) et
  deux réglages sont gardés dans le stockage local du navigateur ; s'il est indisponible, la page fonctionne sans.
- **Liens partagés** : la vue, l'heure et la fiche ouverte sont portées par le fragment de l'adresse (`#c=…&h=…&p=…`).
  La porte d'entrée `index.html` le transmet à `dist/index.html`.
- **Licence** : le plan ALPAGE est sous CC BY-SA 2.0 FR. L'attribution figure dans le panneau « Sources » de la page et dans
  le `README.md` ; elle doit rester visible, et toute version modifiée du plan doit être partagée sous la même licence.
- **Intégration dans une autre page** : `<iframe src="https://…/" style="width:100%;height:80vh;border:0" allow="fullscreen" loading="lazy"></iframe>`.
- **Référencement et partage** : chaque page porte un titre, une description et une image de partage (`og:image`,
  1200 × 630, dans `dist/og/`, refaite par `node tools/og.mjs`). Les réseaux sociaux exigent une adresse absolue : elle
  est fixée à la construction, par défaut celle de GitHub Pages ; pour un autre domaine, construire avec
  `SITE_URL=https://exemple.fr/ npm run build` (le Dockerfile sert les images sous `/dist/og/`, comme GitHub Pages).
  Les quatre pages d'entrée de la racine (`index.html`, `1789.html`, `lutece.html`, `1889.html`) portent les mêmes
  balises, à l'adresse de GitHub Pages. Ajouter au besoin un `robots.txt` au niveau du serveur.

## Vérifier après déploiement

1. `curl -sI https://<domaine>/healthz` répond `200`.
2. `curl -sI -H 'Accept-Encoding: gzip' https://<domaine>/` montre `Content-Encoding: gzip`.
3. Ouvrir la page : la barre de chargement va au bout, l'accueil propose trois portes ; « Explorer la maquette » montre
   la ville, un clic sur Notre-Dame ouvre sa fiche et « Entrer à l'intérieur » lance la visite.
4. Ouvrir `https://<domaine>/#in=sainte-chapelle` : la page s'ouvre directement dans la chapelle haute.
