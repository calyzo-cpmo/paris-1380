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
writeFileSync(join(root, 'dist/index.html'), `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
</head>
<body>
${fragment}</body>
</html>
`);
console.log('build ok', (fragment.length / 1024).toFixed(0) + ' Ko');
