# Paris 1380 — note de déploiement

Tout ce qu'il faut pour mettre la maquette en ligne est dans ce dépôt.

## Ce qui est à déployer

Un seul fichier : `dist/index.html` (environ 1,4 Mo, 450 Ko une fois compressé). Il contient le code, le plan de 1380 et
les vignettes ; toutes les textures et la géométrie sont calculées dans le navigateur. Pas de base de données, pas de
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

Le Dockerfile ne reconstruit pas la page : il copie `dist/index.html` tel qu'il est versionné. Après une modification des
sources, lancer `npm install && npm run build && npm test` puis committer `dist/index.html`.

## À savoir avant d'ouvrir au public

- **Navigateur** : WebGL 2 requis (tout navigateur récent, ordinateur ou téléphone). Le chargement calcule la ville pendant
  quelques secondes ; la page réduit d'elle-même la résolution et la foule si l'appareil peine.
- **Appel extérieur** : un seul, vers Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) pour les polices Alegreya et
  Grenze Gotisch. Sans lui la page s'affiche avec les polices du système. Si une politique CSP est posée devant le site, elle
  doit autoriser les scripts et styles en ligne (`'unsafe-inline'`), `blob:` et `data:` pour les images, et ces deux hôtes.
- **Licence** : le plan ALPAGE est sous CC BY-SA 2.0 FR. L'attribution figure dans le panneau « Sources » de la page et dans
  le `README.md` ; elle doit rester visible, et toute version modifiée du plan doit être partagée sous la même licence.
- **Intégration dans une autre page** : `<iframe src="https://…/" style="width:100%;height:80vh;border:0" allow="fullscreen" loading="lazy"></iframe>`.
- **Référencement** : la page porte un titre et une description ; ajouter au besoin un `robots.txt` et une image de partage
  au niveau du serveur.

## Vérifier après déploiement

1. `curl -sI https://<domaine>/healthz` répond `200`.
2. `curl -sI -H 'Accept-Encoding: gzip' https://<domaine>/` montre `Content-Encoding: gzip`.
3. Ouvrir la page : la barre de chargement va au bout, la ville apparaît, un clic sur Notre-Dame ouvre sa fiche et
   « Entrer à l'intérieur » lance la visite.
