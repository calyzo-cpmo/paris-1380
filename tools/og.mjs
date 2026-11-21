// Images de partage (og:image) : une vue de chaque maquette, 1200 × 630, avec son titre, dans dist/og/.
// node tools/og.mjs — à relancer quand l'aspect d'une maquette change ; les images sont versionnées.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAQUETTES = [
  { page: '1380.html', sortie: '1380.jpg', titre: 'Paris vers 1380', sous: 'La ville de Charles V, ses enceintes, ses ponts habités, ses rues peuplées' },
  { page: '1789.html', sortie: '1789.jpg', titre: 'Paris en 1789', sous: 'Vingt mille bâtiments dans le mur des Fermiers généraux, à la veille de la Révolution' },
  { page: 'lutece.html', sortie: 'lutece.jpg', titre: 'Lutèce vers 250', sous: 'Le forum, les thermes, le théâtre et les arènes de la ville gallo-romaine' },
  { page: '1889.html', sortie: '1889.jpg', titre: 'Paris en 1889', sous: 'Tout Paris dans l’enceinte de Thiers, l’Exposition universelle et la tour de 300 mètres' },
  { page: '1900.html', sortie: '1900.jpg', titre: 'Paris en 1900', sous: 'L’été de l’Exposition universelle : la tour repeinte, le Champ-de-Mars, la Grande Roue' },
];
// node tools/og.mjs 1900 : seulement les maquettes nommées (sans argument, toutes)
const SEULES = process.argv.slice(2);
mkdirSync(join(root, 'dist/og'), { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const m of MAQUETTES.filter((q) => !SEULES.length || SEULES.some((n) => q.page === n + '.html'))) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, screen: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });      // grand écran : la version complète, pas celle du téléphone
  await page.goto('file://' + join(root, 'dist', m.page) + '#shot');
  await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 400000 });
  await page.evaluate(({ titre, sous }) => {
    const a = window.__app;
    for (let i = 0; i < 80; i++) { a.rig.update(0.05); a.time += 0.05; a.emit('frame', 0.05); }
    // seule reste la ville, sous un bandeau de titre
    const st = document.createElement('style'); st.textContent = 'body > *:not(#scene):not(#og) { display: none !important; } #labels { display: none !important; }'; document.head.appendChild(st);
    const b = document.createElement('div'); b.id = 'og';
    b.innerHTML = `<p>Paris à travers le temps</p><h1>${titre}</h1><span>${sous}</span>`;
    Object.assign(b.style, { position: 'fixed', left: '40px', bottom: '40px', maxWidth: '760px', padding: '18px 26px 20px', background: 'rgba(11,18,48,0.88)', borderTop: '3px solid #dcb866', color: '#f4ecd8', font: '20px/1.35 Georgia, serif' });
    document.body.appendChild(b);
    const q = (s) => b.querySelector(s);
    Object.assign(q('p').style, { margin: '0 0 4px', font: '600 14px/1.2 sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#dcb866' });
    Object.assign(q('h1').style, { margin: '0 0 6px', font: '700 46px/1.1 Georgia, serif' });
    a.renderNow();
  }, m);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(root, 'dist/og', m.sortie), type: 'jpeg', quality: 84 });
  console.log('og', m.sortie);
  await page.close();
}
await browser.close();
