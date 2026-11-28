// Contrôle des passants, maquette par maquette : une grille de points sur toute la carte ; à chacun, la vue rapprochée
// (300 m), six images, et le compte des passants que la foule y pose à moins de 300 m. Dit où la ville est bâtie et
// vide — ce qui ne doit pas arriver.
//   node tools/passants.mjs [lutece 1380 1789 1889 1900 1937]     (toutes, sans argument)
// Lecture d'une carte : un chiffre = centaines de passants (9 : neuf cents ou plus) ; « . » = personne, là où rien
// n'est bâti ; « ! » = personne alors que le quartier est bâti. Le code de sortie est 1 s'il reste un « ! ».
// La fenêtre fait 1 300 × 800 : en dessous de 700 points de haut, la page passe en mode téléphone (foule divisée par trois).
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['lutece', '1380', '1789', '1889', '1900', '1937'];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let vides = 0;
for (const nom of pages) {
  const page = await browser.newPage({ viewport: { width: 1300, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('erreur de la page :', String(e).slice(0, 300)));
  await page.goto('file://' + join(root, 'dist', nom + '.html') + '#shot');
  await page.waitForFunction(() => window.__ready === true || window.__failed, null, { timeout: 600000 });
  const r = await page.evaluate(() => {
    const a = window.__app, P = a.people, l = a.lu;
    const C = a.monde ? a.monde.cadre : { x0: l.x0, z0: l.z0, x1: l.x0 + l.w * (l.cell || 1), z1: l.z0 + l.h * (l.cell || 1) };      // Paris 1380 : le cadre de sa trame
    const pas = Math.max(250, Math.round((C.x1 - C.x0) / 44 / 50) * 50), lignes = [];
    // bâti autour du point : soixante sondes en spirale sur 93 m (les emprises ne sont pas indexées en 1380 : -1)
    const bati = (x, z) => { if (!a.footAt) return -1; let n = 0; for (let k = 0; k < 60; k++) { const an = k * 2.399, d = 12 * Math.sqrt(k + 0.5); if (a.footAt(x + Math.cos(an) * d, z + Math.sin(an) * d)) n++; } return n; };
    for (let z = C.z0 + pas / 2; z < C.z1; z += pas) { const ligne = []; for (let x = C.x0 + pas / 2; x < C.x1; x += pas) {
      a.rig.goal = { x, z, dist: 300, az: 0.4, el: 0.6 }; a.rig.cur = { ...a.rig.goal };
      for (let i = 0; i < 6; i++) { a.rig.update(0.05); a.time += 0.05; a.emit('frame', 0.05); }
      let n = 0; for (const p of P.pools) { if (p.kind !== 'man' && p.kind !== 'robe') continue; for (let i = 0; i < p.active; i++) if (p.ok[i] && Math.hypot(p.x[i] - x, p.z[i] - z) < 300) n++; }
      ligne.push([n, bati(x, z)]);
    } lignes.push(ligne); }
    return { C, pas, lignes, total: P.total, trame: a.navRect || null, etendue: !!P.etendue };
  });
  let batis = 0, sans = 0;
  const carte = r.lignes.map((ligne) => ligne.map(([n, b]) => { if (b >= 6) batis++; if (n < 10) { if (b >= 6) { sans++; return '!'; } return '.'; } return String(Math.min(9, Math.ceil(n / 100))); }).join(''));
  console.log(`\n=== ${nom} : ${Math.round(r.C.x1 - r.C.x0)} × ${Math.round(r.C.z1 - r.C.z0)} m, un point tous les ${r.pas} m ; ${r.total} passants possibles ; trame fine ${r.trame ? `${r.trame.w} × ${r.trame.h} m` : 'sur toute la carte'}${r.etendue ? ', étendue à la demande' : ''}`);
  console.log(carte.join('\n'));
  console.log(batis ? `points bâtis : ${batis}, dont sans passants : ${sans}` : 'bâti non indexé : seuls les points sans passants sont lisibles');
  vides += sans;
  await page.close();
}
await browser.close();
process.exit(vides ? 1 : 0);
