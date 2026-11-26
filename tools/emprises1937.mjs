// Emprises au sol des pavillons de l'Exposition de 1937, telles que la page les bâtit (src/p1937/expo37.js), sans
// navigateur : le module est assemblé pour Node et appelé avec une maquette factice (sol plat, maillages ignorés).
//
//   node tools/emprises1937.mjs [SORTIE.json]        par défaut data/source/1937/emprises1937.json (non versionné)
//
// Écrit une liste de { nom, ring, top } — ring : l'anneau [[x, z], …] dans le repère de la maquette ; nom : celui du
// repère de la page qui tombe dedans, s'il y en a un. Sert aux planches de tools/plan1935.py (le plan directeur de
// l'Exposition sous les pavillons de la page) et au contrôle de leurs places.
import { build } from 'esbuild';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const donnees = { name: 'donnees', setup(b) { b.onResolve({ filter: /paris1889\.json$/ }, (a) => ({ path: resolve(a.resolveDir, a.path).replace('paris1889.json', 'paris1937.json') })); } };
const r = await build({ entryPoints: [join(root, 'src/p1937/expo37.js')], bundle: true, format: 'esm', platform: 'node', write: false, loader: { '.json': 'json', '.glsl': 'text' }, define: { __DEV__: 'false' }, plugins: [donnees], logLevel: 'silent' });
const dir = mkdtempSync(join(tmpdir(), 'emprises1937-')), fichier = join(dir, 'expo37.mjs');
writeFileSync(fichier, r.outputFiles[0].text);
const { batirExpo37 } = await import(pathToFileURL(fichier).href);
rmSync(dir, { recursive: true, force: true });

// Maquette factice : un sol plat, des maillages qui acceptent tout et ne gardent rien.
const rien = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : rien), apply: () => 0, set: () => true });
const app = { terrain: { height: () => 30 }, foot: [], v89: { reserves: [] }, monuments: {}, landmarks: [] };
batirExpo37(app, { at: () => rien });

const dedans = (x, z, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const noms = Object.entries(app.monuments);
const out = app.foot.map((f) => { const m = noms.find(([, p]) => dedans(p.x, p.z, f.ring)); return { nom: m ? m[0].replace(/^Pavillon /, '') : '', ring: f.ring.map((p) => [+p[0].toFixed(1), +p[1].toFixed(1)]), top: +(f.top - 30).toFixed(1) }; });
const sortie = process.argv[2] || join(root, 'data/source/1937/emprises1937.json');
mkdirSync(dirname(sortie), { recursive: true });
writeFileSync(sortie, JSON.stringify(out));
console.log(sortie, ':', out.length, 'emprises,', out.filter((e) => e.nom).length, 'nommées');
