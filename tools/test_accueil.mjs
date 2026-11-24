// Test de la page d'accueil « Paris à travers le temps » (dist/index.html) : sans adresse, l'écran d'accueil — le choix
// des cinq époques au-dessus d'une maquette en vitrine ; elle héberge les maquettes et fait passer de l'une à l'autre
// sans changer de page — même vue, même heure, la ville s'enfonce, l'autre s'élève ; le nom du site ramène à l'accueil.
// Ici les maquettes tournent pour de bon (boucle d'animation), dans leurs cadres : le test est lent en rendu logiciel.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'file://' + join(root, 'dist/index.html');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const T0 = Date.now(), LONG = 900000;
let ok = 0, ko = 0;
const check = (nom, cond, detail = '') => { if (cond) ok++; else ko++; console.log(`${String(Math.round((Date.now() - T0) / 1000)).padStart(4)} s  ${cond ? 'ok   ' : 'ÉCHEC'} ${nom} ${detail}`); };
const errors = [];
const watch = (page) => {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.stack || e).slice(0, 500)));
};
const cadre = (page, ere) => page.frames().find((f) => new RegExp('/' + ere + '\\.html').test(f.url()));
const pret = async (page, ere) => { const t = Date.now(); for (;;) { const f = cadre(page, ere); if (f) { const r = await f.evaluate(() => window.__ready === true || (window.__failed ? 'échec : ' + window.__failed : false)).catch(() => false); if (r === true) return f; if (r) throw new Error(r); } if (Date.now() - t > LONG) throw new Error('maquette ' + ere + ' pas prête'); await new Promise((r) => setTimeout(r, 500)); } };
// La page d'accueil rend la main quand la ville d'arrivée a fini de s'élever — ou après un délai de sécurité de 6 s, pour
// qu'un passage ne reste jamais bloqué. En rendu logiciel, la première élévation d'une ville fraîchement construite
// prend 4 à 6 s (1,3 s sur une vraie carte graphique) : on attend donc aussi, au plus 30 s, que la ville soit dressée.
// Les vérifications qui suivent exigent toujours une ville debout, visible et hors transition.
const arrive = async (page, ere) => {
  await page.waitForFunction((e) => window.__shell.ere === e && !window.__shell.occupe, ere, { timeout: LONG, polling: 250 });
  const f = page.frames().find((x) => new RegExp('/' + ere + '\\.html').test(x.url()));
  if (f) await f.waitForFunction(() => window.__app && window.__app.cityScale === 1 && !window.__app.morphing && !document.body.classList.contains('morph'), null, { timeout: 30000, polling: 100 }).catch(() => {});
};
const etat = (f) => f.evaluate(() => { const a = window.__app, g = a.rig.goal; return { x: Math.round(g.x), z: Math.round(g.z), dist: Math.round(g.dist), az: +g.az.toFixed(2), el: +g.el.toFixed(2), h: a.sky.hour, k: a.cityScale, vis: a.bati.visible, pause: !!a.paused, mode: a.rig.mode, heberge: document.documentElement.classList.contains('heberge'), morph: document.body.classList.contains('morph'), accueil: document.body.classList.contains('welcome'), epoque: a.epochs ? a.epochs.current.id : null }; });
const shell = (page) => page.evaluate(() => ({ ere: window.__shell.ere, occupe: window.__shell.occupe, ecran: window.__shell.accueil && !document.getElementById('accueil').hidden, hash: location.hash, titre: document.title, cadres: [...document.querySelectorAll('iframe.ere')].map((f) => f.getAttribute('src').split('#')[0] + (f.classList.contains('vue') ? ' (vue)' : '')), attente: !document.getElementById('attente').hidden, texte: document.getElementById('attente-texte').textContent, voile: !document.getElementById('voile').hidden }));
const meme = (v, w) => Math.abs(v.x - w.x) <= 2 && Math.abs(v.z - w.z) <= 2 && Math.abs(v.dist - w.dist) <= 2 && Math.abs(v.az - w.az) <= 0.02 && Math.abs(v.el - w.el) <= 0.02;

// ---------- ordinateur : écran d'accueil (1380 en vitrine), choix de 1380, passage à 1789, retour, date de la frise,
// Lutèce, retour à l'accueil par le nom du site, choix d'une autre époque
const page = await browser.newPage({ viewport: { width: 1000, height: 720 }, deviceScaleFactor: 1 });      // au moins 700 points : en deçà, les maquettes se croient sur téléphone
watch(page); page.setDefaultTimeout(180000);
await page.goto(URL + '#accueil=1380');                 // l'époque du fond est tirée au hasard ; ici, fixée par l'adresse
const ecran0 = await page.evaluate(() => ({ vu: window.__shell.accueil && !document.getElementById('accueil').hidden, cartes: [...document.querySelectorAll('#acc-eres .acc-ere')].map((b) => b.dataset.ere).join(' '), titre: document.title, ici: [...document.querySelectorAll('.acc-ici')].filter((b) => !b.hidden).length }));
check('écran d’accueil : affiché tout de suite, sans attendre la 3D ; les six époques dans l’ordre', ecran0.vu && ecran0.cartes === 'lutece 1380 1789 1889 1900 1937' && ecran0.titre === 'Paris à travers le temps' && ecran0.ici === 1, JSON.stringify(ecran0));
const f1380 = await pret(page, '1380');
await page.waitForTimeout(1500);
let s = await shell(page), e = await etat(f1380);
// la rotation se lit en faisant avancer les images à la main : en rendu logiciel, le navigateur sans écran n'en
// fournit presque plus au cadre
// (trois secondes pour finir le vol vers la vue d'ensemble, puis une seconde mesurée)
const tourne = (f) => f.evaluate(() => { const a = window.__app, pas = () => { a.rig.update(0.05); a.emit('frame', 0.05); };
  for (let i = 0; i < 60; i++) pas(); const az0 = a.rig.goal.az; for (let i = 0; i < 20; i++) pas(); return Math.abs(a.rig.goal.az - az0) > 0.005; });
const vit = await f1380.evaluate(() => ({ vitrine: document.documentElement.classList.contains('vitrine'), ui: getComputedStyle(document.getElementById('top')).visibility, entree: !document.getElementById('welcome').hidden }));
vit.tourne = await tourne(f1380);
check('vitrine : la maquette de 1380 en fond, sans interface ni écran d’entrée, la ville tourne lentement ; l’adresse ne bouge pas', s.ere === '1380' && s.cadres.length === 1 && /vue/.test(s.cadres[0]) && s.ecran && vit.vitrine && vit.ui === 'hidden' && !vit.entree && vit.tourne && e.heberge && s.hash === '#accueil=1380' && /^En fond : Paris 1380$/.test(await page.textContent('#acc-fond')), JSON.stringify({ s, vit }));
check('adresse : m= choisit l’époque, les anciens liens restent valables ; sans adresse, l’écran d’accueil', await page.evaluate(() => { const l = window.__shell.lire, a = l('#m=1789&c=1,2,3,4,5&h=12'), b = l('#c=1,2,3,4,5&e=1652'), c = l('#m=1066&h=9'), d = l(''), f = l('#accueil=1900'), g = l('#m=1380'); return a.ere === '1789' && a.reste === 'c=1,2,3,4,5&h=12' && !a.accueil && b.ere === '1380' && b.reste === 'c=1,2,3,4,5&e=1652' && !b.accueil && c.ere === '1380' && c.reste === 'h=9' && d.accueil && !d.fond && f.accueil && f.fond === '1900' && !g.accueil && g.ere === '1380'; }));
// choisir l'époque du fond : elle est rendue à la main, sans écran d'entrée
await page.click('.acc-ere[data-ere="1380"]');
await page.waitForFunction(() => document.getElementById('accueil').hidden, null, { timeout: 10000 });
s = await shell(page);
const main = await f1380.evaluate(() => ({ vitrine: document.documentElement.classList.contains('vitrine'), ui: getComputedStyle(document.getElementById('top')).visibility, entree: !document.getElementById('welcome').hidden }));
main.tourne = await tourne(f1380);
// l'adresse : « m=1380 », ou déjà la vue que la maquette y a écrite — un lien vers 1380 dans les deux cas, jamais l'accueil
check('choix de 1380 depuis l’accueil : l’écran se retire, la maquette reprend son interface et s’arrête de tourner ; titre et adresse suivent', !s.ecran && s.ere === '1380' && (s.hash === '#m=1380' || /^#c=/.test(s.hash)) && !(await page.evaluate(() => window.__shell.lire(location.hash).accueil)) && /^Paris à travers le temps — Paris 1380/.test(s.titre) && !main.vitrine && main.ui === 'visible' && !main.entree && !main.tourne, JSON.stringify({ s, main }));
const VUE = { c: [-300, -400, 900, 0.6, 0.7], h: 17.5 };
await f1380.evaluate((v) => { window.__app.ui.applyState(v); }, VUE);
const depart = await etat(f1380);

// annulation : la ville d'arrivée commence à se construire, on renonce, on reste où l'on est
await f1380.click('#btn-epoch');
await f1380.click('#frise-jalons a[data-id="1791"]');
await page.waitForSelector('#attente:not([hidden])', { timeout: 60000 });
s = await shell(page);
check('passage demandé depuis la frise : la ville d’arrivée se construit en arrière-plan, progression affichée, la maquette reste utilisable', s.attente && /^Paris 1789 se construit… \d+ %$/.test(s.texte) && s.occupe && !s.voile && s.cadres.length === 2 && s.ere === '1380', JSON.stringify(s));
await page.evaluate(() => document.getElementById('attente-x').click());      // sans attendre : la construction occupe le fil d'exécution
await page.waitForFunction(() => !window.__shell.occupe, null, { timeout: 60000 });
s = await shell(page);
check('annulation : on reste en 1380, la ville commencée est retirée', s.ere === '1380' && s.cadres.length === 1 && !s.attente && !s.voile, JSON.stringify(s));

// passage réel
await f1380.click('#frise-jalons a[data-id="1791"]');
await arrive(page, '1789');
const f1789 = cadre(page, '1789');
s = await shell(page); e = await etat(f1789); const quitte = await etat(f1380);
check('transition : on arrive en 1789 au même point de vue et à la même heure, ville dressée', meme(e, depart) && e.h === 17.5 && e.k === 1 && e.vis && !e.pause && !e.morph && e.heberge && e.mode === 'orbit', JSON.stringify(e));
check('transition : la maquette quittée est en pause, ville enfoncée, hors champ', quitte.pause && quitte.k === 0 && !quitte.vis && s.cadres.length === 2 && /1789\.html \(vue\)/.test(s.cadres.join()) && !/1380\.html \(vue\)/.test(s.cadres.join()) && !s.voile, JSON.stringify({ quitte: { pause: quitte.pause, k: quitte.k }, cadres: s.cadres }));
check('transition : titre et adresse suivent', /Paris 1789/.test(s.titre) && s.hash === '#m=1789&c=-300,-400,900,0.6,0.7&h=17.5', s.titre + ' ' + s.hash);

// l'adresse suit la vue de la maquette hébergée
await f1789.evaluate(() => { const a = window.__app; a.ui.applyState({ c: [200, -300, 700, -0.4, 0.5] }); a.rig.userMoved = true; a.rig.onUserInput && a.rig.onUserInput(); });
await f1789.evaluate(() => { const a = window.__app; a.ui.select(null); });
await f1789.click('#btn-places'); await f1789.click('#btn-places');
const suivi = await page.waitForFunction(() => /c=200,-300,700,-0\.4,0\.5/.test(location.hash), null, { timeout: 60000, polling: 250 }).then(() => true).catch(() => false);
check('adresse : elle suit la vue de la maquette hébergée', suivi, (await shell(page)).hash);

// retour à 1380 par la frise de 1789 : la ville est déjà en mémoire
await f1789.click('#btn-epoch');
const t1 = Date.now();
await f1789.click('#frise-jalons a.maquette[href="index.html"]');
await arrive(page, '1380');
s = await shell(page); e = await etat(f1380); const e89 = await etat(f1789);
check('retour à 1380 : même vue, ville dressée, pas d’écran d’entrée, maquette de 1789 en pause', e.x === 200 && e.z === -300 && e.dist === 700 && e.k === 1 && e.vis && !e.pause && !e.accueil && e.epoque === '1380' && e89.pause && e89.k === 0 && s.ere === '1380' && !/m=/.test(s.hash), JSON.stringify({ e, hash: s.hash, s: Math.round((Date.now() - t1) / 1000) }));

// une date de la frise, choisie depuis 1789, mène à 1380 sous cette date
await page.evaluate(() => window.__shell.aller('1789'));
await arrive(page, '1789');
await f1789.click('#btn-epoch');
await f1789.click('#frise-jalons a[data-e="1553"]');
await arrive(page, '1380');
s = await shell(page); e = await etat(f1380);
check('une date de la frise choisie en 1789 : retour à 1380 sous cette date', e.epoque === '1553' && e.k === 1 && /e=1553/.test(s.hash), JSON.stringify({ epoque: e.epoque, hash: s.hash }));

// Lutèce, troisième maquette : on y va depuis 1380, puis de Lutèce à 1789 par la frise de Lutèce
await f1380.evaluate(() => { window.__app.ui.applyState({ c: [-560, 560, 800, 0.5, 0.6], h: 11 }); });
const avant = await etat(f1380);
await page.evaluate(() => window.__shell.aller('lutece'));
await arrive(page, 'lutece');
const fLut = cadre(page, 'lutece');
s = await shell(page); e = await etat(fLut);
check('Lutèce : on y arrive de 1380 au même point de vue et à la même heure ; titre et adresse suivent', meme(e, avant) && e.h === 11 && e.k === 1 && e.vis && !e.pause && !e.morph && e.heberge && /Lutèce/.test(s.titre) && /^#m=lutece&c=-560,560,800/.test(s.hash) && s.cadres.length === 3 && /lutece\.html \(vue\)/.test(s.cadres.join()), JSON.stringify({ e, titre: s.titre, hash: s.hash, cadres: s.cadres }));
await fLut.click('#btn-epoch');
await fLut.click('#frise-jalons a[data-m="1789"]');
await arrive(page, '1789');
s = await shell(page); e = await etat(f1789); const eLut = await etat(fLut);
check('de Lutèce à 1789 par la frise : même vue, Lutèce en pause, ville enfoncée', meme(e, avant) && e.h === 11 && e.k === 1 && e.vis && eLut.pause && eLut.k === 0 && /^#m=1789&c=-560,560,800/.test(s.hash) && /1789\.html \(vue\)/.test(s.cadres.join()), JSON.stringify({ e, lutece: { pause: eLut.pause, k: eLut.k }, hash: s.hash }));

// retour à l'accueil par le nom du site : la maquette en cours passe en vitrine et devient le fond
await f1789.click('#brand-site a');
await page.waitForFunction(() => window.__shell.accueil, null, { timeout: 10000 });
await page.waitForTimeout(1200);
s = await shell(page);
const v89 = await f1789.evaluate(() => ({ vitrine: document.documentElement.classList.contains('vitrine'), ui: getComputedStyle(document.getElementById('top')).visibility }));
v89.tourne = await tourne(f1789);
check('retour à l’accueil par le nom du site : 1789 en vitrine derrière le choix (sans interface, la ville tourne), adresse nue, titre du site', s.ecran && s.ere === '1789' && s.hash === '' && s.titre === 'Paris à travers le temps' && v89.vitrine && v89.ui === 'hidden' && v89.tourne && /^En fond : Paris 1789$/.test(await page.textContent('#acc-fond')) && !(await page.isHidden('.acc-ere[data-ere="1789"] .acc-ici')), JSON.stringify({ s, v89 }));
// choisir une autre époque depuis l'accueil : le passage habituel, de la ville du fond à celle choisie
await page.click('.acc-ere[data-ere="lutece"]');
await arrive(page, 'lutece');
s = await shell(page); e = await etat(fLut);
const vLut = await fLut.evaluate(() => ({ vitrine: document.documentElement.classList.contains('vitrine'), ui: getComputedStyle(document.getElementById('top')).visibility }));
check('choix de Lutèce depuis l’accueil : passage depuis la ville du fond, l’écran s’est retiré, la maquette a son interface', !s.ecran && s.ere === 'lutece' && /^#m=lutece&c=/.test(s.hash) && /Lutèce/.test(s.titre) && e.k === 1 && e.vis && !e.pause && !vLut.vitrine && vLut.ui === 'visible' && /lutece\.html \(vue\)/.test(s.cadres.join()), JSON.stringify({ s, vLut }));
await page.close();

// ---------- téléphone : écran d'accueil sans adresse (fond tiré parmi les maquettes légères), puis lien direct vers
// 1789 et passage à 1380 ; une seule ville reste en mémoire
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const mob = await ctx.newPage(); watch(mob); mob.setDefaultTimeout(180000);
await mob.goto(URL);
const em = await mob.evaluate(() => { const p = document.getElementById('acc-panneau').getBoundingClientRect(), t = document.getElementById('acc-titre').getBoundingClientRect(); return { vu: window.__shell.accueil, fond: window.__shell.ere, adresse: location.hash, cadres: document.querySelectorAll('iframe.ere').length, titreVu: t.top >= 0 && t.bottom <= innerHeight, panneau: Math.round(p.top), large: document.documentElement.scrollWidth <= innerWidth + 1 }; });
check('téléphone, sans adresse : l’écran d’accueil, une maquette légère en fond (Lutèce, 1380 ou 1789), le titre à l’écran, pas de défilement horizontal', em.vu && ['lutece', '1380', '1789'].includes(em.fond) && em.adresse === '' && em.cadres === 1 && em.titreVu && em.panneau > 80 && em.large, JSON.stringify(em));
await mob.goto('about:blank');                          // un vrai chargement, pas un simple changement d'ancre
await mob.goto(URL + '#m=1789&c=-858,-842,700,0.4,0.6&h=18.75');
const m89 = await pret(mob, '1789');
s = await shell(mob); e = await etat(m89);
check('lien direct : #m=1789 ouvre la maquette de 1789 sur la vue et l’heure du lien, seule', s.ere === '1789' && s.cadres.length === 1 && e.x === -858 && e.z === -842 && e.dist === 700 && e.h === 18.75 && e.heberge, JSON.stringify({ s: s.cadres, e }));
await mob.evaluate(() => window.__shell.aller('1380'));
await arrive(mob, '1380');
s = await shell(mob); e = await etat(cadre(mob, '1380'));
check('téléphone : après le passage, une seule ville reste en mémoire', s.ere === '1380' && s.cadres.length === 1 && /1380\.html \(vue\)/.test(s.cadres[0]) && e.x === -858 && e.z === -842 && e.h === 18.75 && e.k === 1 && !e.accueil, JSON.stringify({ cadres: s.cadres, e }));
check('pas de défilement horizontal (téléphone)', await mob.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
await ctx.close();

check('aucune erreur ni avertissement console', errors.length === 0, errors.length ? '\n' + [...new Set(errors)].slice(0, 8).join('\n') : '');
console.log(`\n${ok} vérifications réussies, ${ko} échec(s)`);
await browser.close();
process.exit(ko ? 1 : 0);
