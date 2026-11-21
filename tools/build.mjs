// Assemble les pages autonomes de dist/ : les maquettes (1380.html, 1789.html, lutece.html), la page d'accueil qui les héberge et
// orchestre le passage de l'une à l'autre (index.html), et le fragment publié (paris-1380.artifact.html).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Adresse publique du site : les images de partage (dist/og/) doivent y être données en adresse absolue. Par défaut,
// GitHub Pages ; pour un autre hébergement, construire avec SITE_URL=https://exemple.fr/ npm run build.
const SITE = (process.env.SITE_URL || 'https://calyzo-cpmo.github.io/paris-1380/').replace(/\/?$/, '/');
const partage = (img, alt) => `<meta property="og:image" content="${SITE}dist/og/${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${alt}">
<meta name="twitter:card" content="summary_large_image">`;
const dev = process.argv.includes('--dev');
const res = await build({
  entryPoints: [join(root, 'src/main.js')], bundle: true, format: 'iife', write: false,
  minify: !dev, target: 'es2020', legalComments: 'none', loader: { '.json': 'json', '.glsl': 'text' },
  define: { __DEV__: dev ? 'true' : 'false' },
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(root, 'src/style.css'), 'utf8');
const body = readFileSync(join(root, 'src/body.html'), 'utf8');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Alegreya:ital,wght@0,400;0,500;0,700;1,400&family=Grenze+Gotisch:wght@500;700&display=swap">';
const fragment = `<title>Paris à travers le temps</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>${css}</style>
${body}
<script>${js}</script>
`;
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/paris-1380.artifact.html'), fragment);
// Document complet pour une mise en ligne : en-tête en règle (titre, description, aperçu de partage), corps et script.
const desc = 'Maquette 3D interactive de Paris vers 1380 : survol, parcours commentés, promenade dans les rues peuplées, histoire de chaque monument et visite de leurs intérieurs, d’après le plan restitué ALPAGE-CNRS.';
writeFileSync(join(root, 'dist/1380.html'), `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Paris à travers le temps — Paris 1380 en maquette 3D</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="Paris à travers le temps — Paris 1380 en maquette 3D">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
${partage('1380.jpg', 'La maquette 3D de Paris vers 1380')}
<meta name="theme-color" content="#0b1230">
${fonts}
<style>${css}</style>
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`);
console.log('build ok', (fragment.length / 1024).toFixed(0) + ' Ko');

// ---- les autres maquettes : même moteur, mêmes styles, autres données
// Surcouche : une maquette peut reprendre le moteur d'une autre. Tout module du dossier `de` qui a son homonyme dans le
// dossier `vers` est remplacé par lui à l'assemblage, et les fichiers de données de `donnees` par leurs remplaçants.
// Ainsi Paris 1900 reprend tout src/p1889/ ; src/p1900/ ne contient que ce qui change (l'Exposition, les lieux, la
// visite). Un module de la surcouche peut encore importer celui qu'il remplace (son homonyme, par un chemin explicite).
function surcouche({ de, vers, donnees = {} }) {
  const D = resolve(root, de), W = resolve(root, vers), remplace = new Map(Object.entries(donnees).map(([a, b]) => [resolve(root, a), resolve(root, b)]));
  return {
    name: 'surcouche',
    setup(b) {
      b.onResolve({ filter: /^\.\.?\// }, (args) => {
        const cible = resolve(args.resolveDir, args.path);
        if (remplace.has(cible)) return { path: remplace.get(cible) };
        const rel = relative(D, cible);
        if (rel.startsWith('..') || isAbsolute(rel)) return undefined;
        const autre = join(W, rel);
        if (!existsSync(autre) || resolve(args.importer) === autre) return undefined;
        return { path: autre };
      });
    },
  };
}
async function maquette({ entree, corps, sortie, titre, description, image, sur }) {
  const r = await build({
    entryPoints: [join(root, entree)], bundle: true, format: 'iife', write: false,
    minify: !dev, target: 'es2020', legalComments: 'none', loader: { '.json': 'json', '.glsl': 'text' },
    define: { __DEV__: dev ? 'true' : 'false' }, plugins: sur ? [surcouche(sur)] : [],
  });
  const page = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${titre}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${titre}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
${partage(image, titre)}
<meta name="theme-color" content="#0b1230">
${fonts}
<style>${css}</style>
</head>
<body>
${readFileSync(join(root, corps), 'utf8')}
<script>${r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;
  writeFileSync(join(root, 'dist', sortie), page);
  console.log('build', sortie, 'ok', (page.length / 1024).toFixed(0) + ' Ko');
}
await maquette({
  entree: 'src/p1789/main.js', corps: 'src/body1789.html', sortie: '1789.html', image: '1789.jpg', titre: 'Paris à travers le temps — Paris 1789 en maquette 3D',
  description: 'Maquette 3D interactive de Paris en 1789, dans le mur des Fermiers généraux : plus de vingt mille bâtiments d’après les plans de Verniquet et de Vasserot, survol et promenade à pied.',
});
await maquette({
  entree: 'src/lutece/main.js', corps: 'src/bodylutece.html', sortie: 'lutece.html', image: 'lutece.jpg', titre: 'Paris à travers le temps — Lutèce vers 250 en maquette 3D',
  description: 'Maquette 3D interactive de Lutèce vers 250 : le forum, les thermes, le théâtre et les arènes de la ville gallo-romaine, l’île et ses ponts de bois, d’après la restitution de Théodore Vacquer.',
});
await maquette({
  entree: 'src/p1889/main.js', corps: 'src/body1889.html', sortie: '1889.html', image: '1889.jpg', titre: 'Paris à travers le temps — Paris 1889 en maquette 3D',
  description: 'Maquette 3D interactive de Paris en 1889, l’année de l’Exposition universelle : tout Paris dans son enceinte, et la tour Eiffel qui se monte de 1887 à 1889.',
});
await maquette({
  entree: 'src/p1900/main.js', corps: 'src/body1900.html', sortie: '1900.html', image: '1900.jpg', titre: 'Paris à travers le temps — Paris 1900 en maquette 3D',
  description: 'Maquette 3D interactive de Paris en 1900, l’été de l’Exposition universelle : tout Paris dans son enceinte, la tour repeinte en jaune, le Champ-de-Mars, la Grande Roue, le Grand et le Petit Palais, le pont Alexandre-III.',
  sur: { de: 'src/p1889', vers: 'src/p1900', donnees: { 'data/paris1889.json': 'data/paris1900.json' } },
});

// ---- page d'accueil : héberge les maquettes et fait la transition entre époques
const resShell = await build({ entryPoints: [join(root, 'src/shell/main.js')], bundle: true, format: 'iife', write: false, minify: !dev, target: 'es2020', legalComments: 'none' });
const jsShell = resShell.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const descShell = 'Paris de Lutèce à 1900 : neuf dates et cinq maquettes 3D détaillées — Lutèce vers 250, Paris vers 1380, Paris en 1789, Paris en 1889 avec la tour Eiffel qui se monte, Paris en 1900, l’été de l’Exposition universelle : survol, promenade à pied, passage d’une époque à l’autre au même endroit.';
const shell = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Paris à travers le temps</title>
<meta name="description" content="${descShell}">
<meta property="og:title" content="Paris à travers le temps — maquettes 3D de Paris, de Lutèce à l’Exposition de 1900">
<meta property="og:description" content="${descShell}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
${partage('1380.jpg', 'La maquette 3D de Paris vers 1380')}
<meta name="theme-color" content="#0b1230">
${fonts}
<style>${readFileSync(join(root, 'src/shell/style.css'), 'utf8')}</style>
</head>
<body>
${readFileSync(join(root, 'src/shell/body.html'), 'utf8')}
<script>${jsShell}</script>
</body>
</html>
`;
writeFileSync(join(root, 'dist/index.html'), shell);
console.log('build accueil ok', (shell.length / 1024).toFixed(1) + ' Ko');
