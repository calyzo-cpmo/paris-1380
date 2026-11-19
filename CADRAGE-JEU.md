# Paris à travers le temps — cadrage du jeu en ligne « mode classe »

Document de cadrage : rien n'est encore construit ni migré. Il fixe ce que serait le jeu, ce qu'il demanderait comme
hébergement, et les décisions qui restent à prendre avant de commencer.

## Ce qui est décidé

| Sujet | Choix |
| --- | --- |
| Premier type de jeu | **Mode classe** : un enseignant anime une séance, les élèves jouent dans les maquettes |
| Publics visés | Scolaires et enseignants d'abord ; grand public, musées et tourisme ensuite ; vitrine de savoir-faire |
| Comptes | **Aucun** : ni pour l'enseignant, ni pour les élèves |
| Hébergement cible | **Un VPS**, le jour où le jeu est construit. D'ici là, le site reste statique (GitHub Pages) |

## Le principe

**L'enseignant**
- Ouvre la page « Classe », choisit une époque (Lutèce, 1380, 1789, 1889) et une quête, et lance une séance.
- Obtient un **code à 6 caractères**, à donner aux élèves, et un **lien d'animation secret**, gardé dans son navigateur.
  Ce lien tient lieu de compte : qui l'a anime la séance.
- Voit en direct, sur le plan, la position et la progression de chaque équipe.
- Peut tout mettre en pause, révéler les réponses, ou ramener toutes les vues sur la sienne (« Tous avec moi »). Ce
  dernier bouton reprend le moteur des visites guidées, déjà en place dans les quatre maquettes.
- Récupère en fin de séance un **bilan anonyme** : équipes, étapes réussies, temps passé.

**Les élèves**
- Entrent le code, puis choisissent un **nom d'équipe dans une liste imposée** (animaux, métiers d'autrefois…). Aucun
  nom réel n'est saisi ni stocké.
- Reçoivent des missions tirées des maquettes :
  - trouver un lieu et le désigner sur la vue ou sur le mini-plan ;
  - répondre à une question dont la réponse est dans une fiche ;
  - se rendre à pied à un endroit ;
  - reconnaître une époque d'après une vue.

**Les quêtes**
- Une quête est une suite d'étapes décrite en données (lieu, question, réponse attendue, indice), comme le sont déjà
  les visites guidées : elle s'écrit sans toucher au moteur.
- Le même moteur servira ensuite le **mode musée** (borne, sans enseignant) et le **mode solo grand public**.

## Données personnelles

Le public est en partie mineur ; le cadrage vise la collecte minimale.

- Pas de compte, pas d'adresse électronique, pas de nom réel ; noms d'équipe imposés.
- Séances **effacées 48 heures** après leur fin ; bilan téléchargé par l'enseignant, rien gardé côté serveur au-delà.
- Aucun cookie, aucun outil de mesure d'audience tiers.
- Journaux du serveur limités au strict nécessaire technique et purgés régulièrement.
- Hébergement en France.
- **À corriger avant toute ouverture aux écoles** : les pages chargent aujourd'hui leurs polices depuis Google Fonts. La
  CNIL considère cet appel comme un transfert de données vers Google. Il faudra servir les polices depuis le site.
- Une mention d'information courte, destinée aux établissements, sera à rédiger.

## Architecture visée

**Dans le navigateur**
- Les maquettes, inchangées, plus une couche « classe » commune aux quatre pages (mission en cours, réponse, code de
  séance).
- Une page enseignant : choix de la quête, tableau de bord, bilan.
- Toute la 3D reste calculée sur l'appareil de l'élève : le serveur ne fait que relayer.

**Sur le serveur**
- Une petite API Node.js et une liaison temps réel (WebSocket, avec une solution de repli : certains réseaux scolaires
  filtrent les WebSocket).
- Une base SQLite pour les séances en cours, le tout dans un conteneur.
- Caddy devant le site statique et l'API, avec HTTPS automatique.
- Le Dockerfile nginx actuel sert de point de départ ; le tout en `docker compose`.
- Déploiement automatique depuis GitHub Actions, à chaque fusion sur `main` : l'intégration continue est déjà en place
  et teste les cinq pages.

**Charge et dimensionnement**
- Une classe, c'est une trentaine d'élèves et une mise à jour par élève toutes les deux secondes : négligeable.
- Plusieurs dizaines de classes simultanées tiennent sur un VPS d'entrée de gamme (2 vCPU, 4 Go).
- Le poids est côté élève : chaque maquette pèse de 0,8 à 3,5 Mo (0,25 à 1,8 Mo compressée) et demande WebGL 2.

## Hébergement

Deux possibilités, à trancher au moment de construire :

1. **Un VPS déjà exploité**, s'il est prévu pour exposer des services publics. Avantage : rien à acheter.
   Inconvénient : un service ouvert aux écoles côtoie d'autres usages.
2. **Un petit VPS dédié** (environ 5 à 7 € par mois). Avantage : isolement du service et de ses journaux, arrêt ou
   reconstruction sans risque pour le reste.

L'option 2 est recommandée. Dans les deux cas, ne pas mettre ce service sur un serveur de production.

Adresse : un sous-domaine du domaine de l'éditeur, ou un nom de domaine propre au projet. GitHub Pages reste en secours
pour la consultation des maquettes seules.

## Étapes

| Étape | Contenu | Durée estimée |
| --- | --- | --- |
| 0. Migration | VPS, domaine, Caddy, conteneurs, déploiement automatique, polices servies par le site | 1 jour |
| 1. Version minimale | Une époque, 2 ou 3 quêtes, séance par code, tableau de bord en direct, « Tous avec moi », bilan | 2 à 3 semaines |
| 2. Extension | Les quatre époques, éditeur de quêtes simple, mode musée, mode solo | 2 semaines environ |
| 3. Classes pilotes | Deux ou trois classes en conditions réelles, puis corrections | selon le calendrier des écoles |

## Risques

- **Matériel des écoles** : tablettes et ordinateurs anciens, WebGL 2 parfois absent. À vérifier sur le parc d'un
  établissement pilote avant l'étape 1 ; les pages ont déjà une version allégée pour téléphone.
- **Réseaux scolaires** : filtrage des WebSocket, bande passante partagée (une classe charge 30 fois la même page).
- **Exactitude historique** : les quêtes doivent distinguer ce qui est attesté de ce qui est évoqué, comme le font déjà
  les fiches et le calque « Origine du bâti ».
- **Modération** : la liste imposée de noms d'équipe évite les saisies libres.

## Décisions à prendre avant l'étape 0

1. Le serveur : VPS existant prévu pour l'exposition publique, ou VPS dédié (recommandé).
2. L'adresse du site : sous-domaine ou nom de domaine propre.
3. L'époque de la version minimale : **1789** est recommandée, avec une quête sur la journée du 14 juillet (Palais-Royal,
   Invalides, Bastille, Hôtel de Ville, déjà présents dans la visite guidée).
4. Un établissement pilote pour tester le matériel et la première quête.
