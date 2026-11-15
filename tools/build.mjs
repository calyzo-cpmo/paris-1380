// Assemble les pages autonomes de dist/ : les maquettes (1380.html, 1789.html, lutece.html), la page d'accueil qui les héberge et
// orchestre le passage de l'une à l'autre (index.html), et le fragment publié (paris-1380.artifact.html).
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
async function maquette({ entree, corps, sortie, titre, description }) {
  const r = await build({
    entryPoints: [join(root, entree)], bundle: true, format: 'iife', write: false,
    minify: !dev, target: 'es2020', legalComments: 'none', loader: { '.json': 'json', '.glsl': 'text' },
    define: { __DEV__: dev ? 'true' : 'false' },
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
  entree: 'src/p1789/main.js', corps: 'src/body1789.html', sortie: '1789.html', titre: 'Paris à travers le temps — Paris 1789 en maquette 3D',
  description: 'Maquette 3D interactive de Paris en 1789, dans le mur des Fermiers généraux : plus de vingt mille bâtiments d’après les plans de Verniquet et de Vasserot, survol et promenade à pied.',
});
await maquette({
  entree: 'src/lutece/main.js', corps: 'src/bodylutece.html', sortie: 'lutece.html', titre: 'Paris à travers le temps — Lutèce vers 250 en maquette 3D',
  description: 'Maquette 3D interactive de Lutèce vers 250 : le forum, les thermes, le théâtre et les arènes de la ville gallo-romaine, l’île et ses ponts de bois, d’après la restitution de Théodore Vacquer.',
});

// ---- page d'accueil : héberge les maquettes et fait la transition entre époques
const resShell = await build({ entryPoints: [join(root, 'src/shell/main.js')], bundle: true, format: 'iife', write: false, minify: !dev, target: 'es2020', legalComments: 'none' });
const jsShell = resShell.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const descShell = 'Paris à huit dates, de Lutèce à 1836, et trois maquettes 3D détaillées — Lutèce vers 250, Paris vers 1380 et Paris en 1789 : survol, promenade à pied, passage d’une époque à l’autre au même endroit.';
const shell = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Paris à travers le temps</title>
<meta name="description" content="${descShell}">
<meta property="og:title" content="Paris à travers le temps — maquettes 3D de Lutèce, de Paris en 1380 et en 1789">
<meta property="og:description" content="${descShell}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
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
