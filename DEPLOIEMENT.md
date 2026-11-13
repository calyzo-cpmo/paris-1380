# Paris 1380 — note de déploiement

Tout ce qu'il faut pour mettre la maquette en ligne est dans ce dépôt.

## Ce qui est à déployer

Deux fichiers autonomes, à servir côte à côte car ils se renvoient l'un à l'autre par des liens relatifs :
`dist/index.html` (Paris 1380, environ 1,8 Mo, 720 Ko une fois compressé) et `dist/1789.html` (Paris 1789, environ
1,4 Mo, 660 Ko compressé). Chacun contient son code et ses données ; toutes les textures et la géométrie sont
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

Le Dockerfile ne reconstruit pas les pages : il copie `dist/index.html` et `dist/1789.html` tels qu'ils sont versionnés.
Après une modification des sources, lancer `npm install && npm run build && npm test` puis committer les deux fichiers.

## GitHub Pages (gratuit)

Le dépôt est prêt à être servi tel quel : `index.html`, à la racine, renvoie vers `dist/index.html`, et `.nojekyll` évite
toute transformation des fichiers. Pour l'activer : dans le dépôt, *Settings* → *Pages* → *Build and deployment* →
*Source* : « Deploy from a branch », branche `main`, dossier `/ (root)`, puis *Save*. Le site répond au bout d'une minute
ou deux à l'adresse <https://calyzo-cpmo.github.io/paris-1380/> ; chaque envoi sur `main` le met à jour.

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
- **Référencement** : la page porte un titre et une description ; ajouter au besoin un `robots.txt` et une image de partage
  au niveau du serveur.

## Vérifier après déploiement

1. `curl -sI https://<domaine>/healthz` répond `200`.
2. `curl -sI -H 'Accept-Encoding: gzip' https://<domaine>/` montre `Content-Encoding: gzip`.
3. Ouvrir la page : la barre de chargement va au bout, l'accueil propose trois portes ; « Explorer la maquette » montre
   la ville, un clic sur Notre-Dame ouvre sa fiche et « Entrer à l'intérieur » lance la visite.
4. Ouvrir `https://<domaine>/#in=sainte-chapelle` : la page s'ouvre directement dans la chapelle haute.
