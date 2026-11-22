// Page d'accueil « Paris à travers le temps ». Elle héberge chaque maquette dans un cadre et orchestre le passage de
// l'une à l'autre sans changer de page : la ville d'arrivée se construit en arrière-plan, puis, au même point de vue et
// à la même heure, la ville de départ s'enfonce dans le sol, les deux plans se fondent, et l'autre ville s'élève.
// Ouverte sans adresse, elle montre l'écran d'accueil : les cinq époques à choisir, au-dessus d'une maquette « en
// vitrine » (interface masquée, ville qui tourne lentement, src/embed.js). Choisir l'époque du fond la rend à la main ;
// en choisir une autre lance le passage. Le nom du site, en tête de chaque maquette, ramène à cet écran.
// Les maquettes restent des pages autonomes (lutece.html, 1380.html, 1789.html, 1889.html, 1900.html) ; le dialogue passe par des messages
// (src/embed.js).

// leger : maquette assez légère pour servir de fond sur téléphone
const ERES = {
  lutece: { page: 'lutece.html', nom: 'Lutèce', date: 'Vers 250', titre: 'Lutèce', ligne: 'La ville gallo-romaine : le forum, les thermes, le théâtre et les arènes.', leger: true },
  1380: { page: '1380.html', nom: 'Paris 1380', date: 'Vers 1380', titre: 'Paris de Charles V', ligne: 'La plus grande ville d’Occident, ses enceintes, ses ponts habités, ses rues peuplées.', leger: true },
  1789: { page: '1789.html', nom: 'Paris 1789', date: '1789', titre: 'Paris en 1789', ligne: 'Vingt mille bâtiments dans le mur des Fermiers généraux, à la veille de la Révolution.', leger: true },
  1889: { page: '1889.html', nom: 'Paris 1889', date: '1889', titre: 'Paris en 1889', ligne: 'L’Exposition universelle et la tour Eiffel qui se monte, jour après jour.' },
  1900: { page: '1900.html', nom: 'Paris 1900', date: '1900', titre: 'Paris en 1900', ligne: 'L’été de l’Exposition : la tour repeinte, la Grande Roue, le Grand Palais.' },
};
const ORDRE = ['lutece', '1380', '1789', '1889', '1900'];
const DEFAUT = '1380', SITE = 'Paris à travers le temps';
const $ = (id) => document.getElementById(id);
const scene = $('scene'), voile = $('voile'), attente = $('attente');
const BASE = location.href.split('#')[0];
const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 700;
const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LENT = Math.max(1, Math.min(20, +new URLSearchParams(location.search).get('lent') || 1));      // ?lent=5 : passage au ralenti, pour le montrer ou le vérifier
const cadres = new Map();                                 // époque → { ere, el, ready, failed, waiters, frac, label }
const acks = new Map();
let courante = null, occupe = false, seq = 0, enAttente = null, annuler = null, accueil = false;

// Adresse de la page : m=<époque> (absent pour 1380, si bien que les anciens liens restent valables), puis l'état de la
// maquette. Sans adresse — ou avec « accueil », « accueil=<époque du fond> » —, l'écran d'accueil.
function lire(hash) {
  const h = String(hash || '').replace(/^#/, '');
  let ere = DEFAUT, accueil = !h, fond = null; const reste = [];
  for (const p of h.split('&')) {
    if (!p) continue;
    if (p.startsWith('m=')) { if (ERES[p.slice(2)]) ere = p.slice(2); }
    else if (p === 'accueil' || p.startsWith('accueil=')) { accueil = true; if (ERES[p.slice(8)]) fond = p.slice(8); }
    else reste.push(p);
  }
  return { ere, reste: reste.join('&'), accueil, fond };
}
// une adresse n'est jamais vide hors de l'écran d'accueil : une maquette choisie se rouvre au rechargement
function adresse(ere, hash) { try { history.replaceState(null, '', '#' + ([ere !== DEFAUT ? 'm=' + ere : '', String(hash || '').replace(/^#/, '')].filter(Boolean).join('&') || 'm=' + ere)); } catch (e) { /* adresse non modifiable (aperçu) */ } }
function adresseNue() { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* adresse non modifiable (aperçu) */ } }
const joindre = (...h) => h.map((x) => String(x || '').replace(/^#/, '')).filter(Boolean).join('&');
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
function marges() { const s = getComputedStyle($('sonde')), v = (k) => parseFloat(s[k]) || 0; return { top: v('paddingTop'), right: v('paddingRight'), bottom: v('paddingBottom'), left: v('paddingLeft') }; }

function monter(ere, hash) {
  const f = document.createElement('iframe');
  f.className = 'ere'; f.title = ERES[ere].nom; f.setAttribute('allow', 'clipboard-write; fullscreen');
  f.src = ERES[ere].page + (hash ? '#' + hash : '');
  const c = { ere, el: f, ready: false, failed: null, waiters: [], frac: 0, label: '' };
  cadres.set(ere, c); scene.appendChild(f);
  return c;
}
function demonter(c) { c.el.remove(); if (cadres.get(c.ere) === c) cadres.delete(c.ere); for (const w of c.waiters.splice(0)) w(false); }
function dire(c, msg) { try { c.el.contentWindow.postMessage({ src: 'paris-shell', ...msg }, '*'); } catch (e) { /* cadre retiré */ } }
// Question à une maquette ; sans réponse dans le délai, on continue : un passage ne doit jamais rester bloqué.
function demander(c, msg, delai = 8000) {
  return new Promise((res) => { const id = ++seq, t = setTimeout(() => { acks.delete(id); res(null); }, delai); acks.set(id, (d) => { clearTimeout(t); res(d); }); dire(c, { ...msg, id }); });
}
const pret = (c) => (c.ready ? Promise.resolve(true) : c.failed ? Promise.resolve(false) : new Promise((res) => c.waiters.push(res)));

function majAttente() { const c = enAttente; if (!c) return; $('attente-texte').textContent = `${ERES[c.ere].nom} se construit… ${Math.round(c.frac * 100)} %`; $('attente-barre').style.width = Math.round(c.frac * 100) + '%'; }
function montrerAttente(c) { enAttente = c; majAttente(); attente.hidden = false; }
function cacherAttente() { enAttente = null; attente.hidden = true; }
$('attente-x').addEventListener('click', () => { if (annuler) annuler(); });

window.addEventListener('message', (e) => {
  const d = e.data; if (!d || d.src !== 'paris') return;
  let c = null; for (const k of cadres.values()) if (k.el.contentWindow === e.source) c = k;
  if (!c) return;
  if (d.t === 'boot') dire(c, { t: 'hello', base: BASE, insets: marges() });
  else if (d.t === 'progress') { c.frac = Math.max(0, Math.min(1, +d.frac || 0)); c.label = String(d.label || ''); if (enAttente === c) majAttente(); if (accueil && c.ere === courante) majFond(); }
  else if (d.t === 'ready') { c.ready = true; c.frac = 1; for (const w of c.waiters.splice(0)) w(true); if (accueil && c.ere === courante) majFond(); }
  else if (d.t === 'failed') { c.failed = String(d.message || 'erreur'); for (const w of c.waiters.splice(0)) w(false); if (accueil && c.ere === courante) majFond(); }
  else if (d.t === 'ack') { const r = acks.get(d.id); if (r) { acks.delete(d.id); r(d); } }
  else if (d.t === 'era') { if (c.ere === courante && !accueil) aller(String(d.to), String(d.hash || '')); }
  else if (d.t === 'hash') { if (c.ere === courante && !occupe && !accueil) adresse(c.ere, d.hash); }
  else if (d.t === 'accueil') { if (c.ere === courante) montrerAccueil(); }
});
window.addEventListener('resize', () => { const m = marges(); for (const c of cadres.values()) dire(c, { t: 'insets', insets: m }); });

function installer(c) {
  courante = c.ere; document.title = `${SITE} — ${ERES[c.ere].nom} en maquette 3D`;
  c.el.focus(); try { c.el.contentWindow.focus(); } catch (e) { /* cadre d'une autre origine */ }
}

// Passe à l'époque demandée. extra : complément d'état pour la maquette d'arrivée (une date de la frise, une vue).
async function aller(ere, extra = '') {
  if (!ERES[ere] || occupe) return false;
  const A = cadres.get(courante);
  if (ere === courante) { if (extra) dire(A, { t: 'apply', hash: extra }); return true; }
  occupe = true;
  try {
    let B = cadres.get(ere);
    if (!B || B.failed) {                                 // la ville d'arrivée se construit pendant qu'on reste dans l'autre
      if (B) demonter(B);
      const st = await demander(A, { t: 'get-state' });
      B = monter(ere, joindre(st && st.hash, extra));
      montrerAttente(B);
      const ok = await Promise.race([pret(B), new Promise((res) => { annuler = () => res(null); })]);
      annuler = null; cacherAttente();
      if (!ok) { demonter(B); return false; }
    }
    voile.hidden = false;                                 // plus de geste pendant le passage
    const st = await demander(A, { t: 'get-state', leave: true });
    const vue = st ? st.hash : '';
    await demander(B, { t: 'prepare', hash: joindre(vue, extra) }, 20000);
    await demander(A, { t: 'sink', ms: calme ? 1 : 1100 * LENT }, 6000 * LENT);
    if (LENT > 1) B.el.style.transitionDuration = 0.9 * LENT + 's';
    B.el.classList.add('devant', 'vue');                  // le plan d'une époque se fond dans celui de l'autre
    await attendre(calme ? 0 : 950 * LENT);
    await demander(B, { t: 'rise', ms: calme ? 1 : 1300 * LENT }, 6000 * LENT);
    A.el.classList.remove('vue'); B.el.classList.remove('devant');
    dire(A, { t: 'pause' });
    if (mobile) demonter(A);                              // sur téléphone, une seule ville en mémoire
    installer(B); adresse(ere, joindre(vue, extra));
    return true;
  } finally { voile.hidden = true; occupe = false; }
}

// ---------- écran d'accueil : le choix des cinq époques, au-dessus d'une maquette en vitrine
const liste = $('acc-eres'), cartes = new Map();
for (const ere of ORDRE) {
  const E = ERES[ere], li = document.createElement('li'), b = document.createElement('button');
  b.type = 'button'; b.className = 'acc-ere'; b.dataset.ere = ere;
  b.innerHTML = `<img src="og/vignettes/${ere}.jpg" alt="" width="480" height="300" decoding="async"><span class="acc-texte"><span class="acc-date"></span><span class="acc-nom"></span><span class="acc-ligne"></span><span class="acc-ici" hidden>en fond</span></span>`;
  b.querySelector('.acc-date').textContent = E.date; b.querySelector('.acc-nom').textContent = E.titre; b.querySelector('.acc-ligne').textContent = E.ligne;
  b.setAttribute('aria-label', `${E.titre}, ${E.date.toLowerCase()} : ${E.ligne}`);
  b.addEventListener('click', () => choisir(ere));
  li.appendChild(b); liste.appendChild(li); cartes.set(ere, b);
}
// L'époque du fond : tirée au hasard, jamais deux fois de suite la même ; sur téléphone, parmi les maquettes légères.
function tirerFond(force) {
  if (force) return force;
  const cand = ORDRE.filter((e) => !mobile || ERES[e].leger); let der = null;
  try { der = localStorage.getItem('paris-fond'); } catch (e) { /* stockage indisponible */ }
  const pool = cand.filter((e) => e !== der), f = pool[Math.floor(Math.random() * pool.length)] || cand[0];
  try { localStorage.setItem('paris-fond', f); } catch (e) { /* stockage indisponible */ }
  return f;
}
function majFond() {
  const c = cadres.get(courante), E = ERES[courante];
  for (const [ere, b] of cartes) b.querySelector('.acc-ici').hidden = ere !== courante;
  $('acc-fond').textContent = !c ? '' : c.failed ? `${E.nom} n’a pas pu démarrer ici (WebGL 2 requis)` : c.ready ? `En fond : ${E.nom}` : `En fond : ${E.nom} se dessine… ${Math.round(c.frac * 100)} %`;
}
function ouvrirAccueil() {
  accueil = true; const A = $('accueil'); A.hidden = false; A.classList.remove('sortie'); majFond();
  document.title = SITE; (cartes.get(courante) || cartes.get(ORDRE[0])).focus({ preventScroll: true });
}
function fermerAccueil() { accueil = false; const A = $('accueil'); A.classList.add('sortie'); setTimeout(() => { if (!accueil) A.hidden = true; }, calme ? 0 : 650); }
// Retour à l'écran d'accueil, depuis une maquette : elle passe en vitrine et devient le fond.
function montrerAccueil() {
  if (accueil || occupe) return;
  const c = cadres.get(courante); if (!c) return;
  dire(c, { t: 'vitrine', on: true }); adresseNue(); ouvrirAccueil();
}
// Choix d'une époque. Celle du fond est rendue à la main ; une autre se construit pendant que le fond tourne, puis
// prend sa place par le passage habituel. Si le fond n'est pas encore prêt, on ne l'attend pas.
async function choisir(ere, extra = '') {
  if (!accueil || occupe || !ERES[ere]) return false;
  const A = cadres.get(courante);
  fermerAccueil();
  if (A && ere === courante) { dire(A, { t: 'vitrine', on: false }); if (extra) dire(A, { t: 'apply', hash: extra }); installer(A); adresse(ere, extra); return true; }
  if (!A || !A.ready) {
    if (A) demonter(A);
    const B = monter(ere, extra); B.el.classList.add('vue'); installer(B); adresse(ere, extra); return true;
  }
  const ok = await aller(ere, extra);
  if (!ok) ouvrirAccueil();                               // passage annulé : retour au choix, le fond tourne toujours
  return ok;
}

// Un lien collé dans la même fenêtre : on s'y rend.
window.addEventListener('hashchange', () => {
  const { ere, reste, accueil: acc } = lire(location.hash);
  if (acc) { montrerAccueil(); return; }
  if (accueil) { choisir(ere, reste); return; }
  if (ere !== courante) aller(ere, reste); else if (reste) dire(cadres.get(courante), { t: 'apply', hash: reste });
});

{ const L = lire(location.hash);
  if (L.accueil) { const f = tirerFond(L.fond), c = monter(f, 'vitrine'); c.el.classList.add('vue'); courante = f; ouvrirAccueil(); }
  else { const c = monter(L.ere, L.reste); c.el.classList.add('vue'); installer(c); } }
window.__shell = { get ere() { return courante; }, get occupe() { return occupe; }, get mobile() { return mobile; }, get accueil() { return accueil; }, aller, choisir, montrerAccueil, lire, cadres, ERES };
