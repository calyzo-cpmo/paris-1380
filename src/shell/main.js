// Page d'accueil « Paris à travers le temps ». Elle héberge chaque maquette dans un cadre et orchestre le passage de
// l'une à l'autre sans changer de page : la ville d'arrivée se construit en arrière-plan, puis, au même point de vue et
// à la même heure, la ville de départ s'enfonce dans le sol, les deux plans se fondent, et l'autre ville s'élève.
// Les maquettes restent des pages autonomes (lutece.html, 1380.html, 1789.html, 1889.html, 1900.html) ; le dialogue passe par des messages
// (src/embed.js).

const ERES = {
  lutece: { page: 'lutece.html', nom: 'Lutèce' },
  1380: { page: '1380.html', nom: 'Paris 1380' },
  1789: { page: '1789.html', nom: 'Paris 1789' },
  1889: { page: '1889.html', nom: 'Paris 1889' },
  1900: { page: '1900.html', nom: 'Paris 1900' },
};
const DEFAUT = '1380', SITE = 'Paris à travers le temps';
const $ = (id) => document.getElementById(id);
const scene = $('scene'), voile = $('voile'), attente = $('attente');
const BASE = location.href.split('#')[0];
const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 700;
const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LENT = Math.max(1, Math.min(20, +new URLSearchParams(location.search).get('lent') || 1));      // ?lent=5 : passage au ralenti, pour le montrer ou le vérifier
const cadres = new Map();                                 // époque → { ere, el, ready, failed, waiters, frac, label }
const acks = new Map();
let courante = null, occupe = false, seq = 0, enAttente = null, annuler = null;

// Adresse de la page : m=<époque> (absent pour 1380, si bien que les anciens liens restent valables), puis l'état de la maquette.
function lire(hash) {
  let ere = DEFAUT; const reste = [];
  for (const p of String(hash || '').replace(/^#/, '').split('&')) { if (!p) continue; if (p.startsWith('m=')) { if (ERES[p.slice(2)]) ere = p.slice(2); } else reste.push(p); }
  return { ere, reste: reste.join('&') };
}
function adresse(ere, hash) { try { history.replaceState(null, '', '#' + [ere !== DEFAUT ? 'm=' + ere : '', String(hash || '').replace(/^#/, '')].filter(Boolean).join('&')); } catch (e) { /* adresse non modifiable (aperçu) */ } }
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
  else if (d.t === 'progress') { c.frac = Math.max(0, Math.min(1, +d.frac || 0)); c.label = String(d.label || ''); if (enAttente === c) majAttente(); }
  else if (d.t === 'ready') { c.ready = true; c.frac = 1; for (const w of c.waiters.splice(0)) w(true); }
  else if (d.t === 'failed') { c.failed = String(d.message || 'erreur'); for (const w of c.waiters.splice(0)) w(false); }
  else if (d.t === 'ack') { const r = acks.get(d.id); if (r) { acks.delete(d.id); r(d); } }
  else if (d.t === 'era') { if (c.ere === courante) aller(String(d.to), String(d.hash || '')); }
  else if (d.t === 'hash') { if (c.ere === courante && !occupe) adresse(c.ere, d.hash); }
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

// Un lien collé dans la même fenêtre : on s'y rend.
window.addEventListener('hashchange', () => { const { ere, reste } = lire(location.hash); if (ere !== courante) aller(ere, reste); else if (reste) dire(cadres.get(courante), { t: 'apply', hash: reste }); });

{ const { ere, reste } = lire(location.hash), c = monter(ere, reste); c.el.classList.add('vue'); installer(c); }
window.__shell = { get ere() { return courante; }, get occupe() { return occupe; }, get mobile() { return mobile; }, aller, lire, cadres, ERES };
