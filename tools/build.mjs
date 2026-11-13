// Assemble une page autonome : dist/index.html (document complet) et dist/paris-1380.artifact.html (fragment publié).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
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
const fragment = `<title>Paris 1380</title>
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
writeFileSync(join(root, 'dist/index.html'), `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Paris 1380 — maquette 3D interactive</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="Paris 1380 — maquette 3D interactive">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
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

// ---- seconde page : Paris 1789 (même moteur, mêmes styles, autres données)
const res89 = await build({
  entryPoints: [join(root, 'src/p1789/main.js')], bundle: true, format: 'iife', write: false,
  minify: !dev, target: 'es2020', legalComments: 'none', loader: { '.json': 'json', '.glsl': 'text' },
  define: { __DEV__: dev ? 'true' : 'false' },
});
const js89 = res89.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const body89 = readFileSync(join(root, 'src/body1789.html'), 'utf8');
const desc89 = 'Maquette 3D interactive de Paris en 1789, dans le mur des Fermiers généraux : plus de vingt mille bâtiments d’après les plans de Verniquet et de Vasserot, survol et promenade à pied.';
const page89 = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Paris 1789 — maquette 3D interactive</title>
<meta name="description" content="${desc89}">
<meta property="og:title" content="Paris 1789 — maquette 3D interactive">
<meta property="og:description" content="${desc89}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta name="theme-color" content="#0b1230">
${fonts}
<style>${css}</style>
</head>
<body>
${body89}
<script>${js89}</script>
</body>
</html>
`;
writeFileSync(join(root, 'dist/1789.html'), page89);
console.log('build 1789 ok', (page89.length / 1024).toFixed(0) + ' Ko');
