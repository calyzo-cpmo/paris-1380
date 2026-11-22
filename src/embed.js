// Liaison entre une maquette et la page d'accueil « Paris à travers le temps » (src/shell), qui l'héberge dans un cadre
// et orchestre le passage d'une époque à l'autre : même point de vue, même heure, la ville s'enfonce, l'autre s'élève.
// Ouverte seule, la maquette fonctionne comme avant : rien ici n'agit tant que la page d'accueil ne s'est pas annoncée.
// Les messages ne portent qu'un état de vue (position, heure, époque) ; ils ne sont acceptés que de la page parente.
// Vitrine : sur l'écran d'accueil du site, la maquette sert de fond — interface masquée, ville qui tourne lentement. La
// page d'accueil l'y met dès l'ouverture (« vitrine » dans l'adresse du cadre) ou par un message, et l'en sort quand on
// choisit cette époque.

export const shell = { on: false, base: null };            // on : la page d'accueil s'est annoncée ; base : son adresse
let handlers = null, era = null;
const waiting = [];

const framed = (() => { try { return window.parent !== window; } catch (e) { return true; } })();
// Message à la page d'accueil. Tant qu'elle ne s'est pas annoncée, seule l'annonce de la maquette part : intégrée
// ailleurs (un aperçu, un autre site), la page n'envoie rien d'autre à une fenêtre parente qu'elle ne connaît pas.
export function tell(msg) { if (framed && (shell.on || msg.t === 'boot')) { try { window.parent.postMessage({ src: 'paris', era, ...msg }, '*'); } catch (e) { /* cadre sans parent joignable */ } } }

// Marges de l'écran (encoche, barre d'accueil) : dans un cadre, env(safe-area-inset-*) vaut zéro ; la page d'accueil
// transmet donc les siennes, que la feuille de style lit dans --sat, --sar, --sab et --sal.
function setInsets(i) {
  if (!i) return; const st = document.documentElement.style;
  for (const [k, v] of [['--sat', i.top], ['--sar', i.right], ['--sab', i.bottom], ['--sal', i.left]]) st.setProperty(k, Math.max(0, Math.round(+v || 0)) + 'px');
}

function handle(d) {
  const ack = (extra) => tell({ t: 'ack', id: d.id, ...extra });
  if (d.t === 'hello') { shell.on = true; shell.base = d.base || null; setInsets(d.insets); document.documentElement.classList.add('heberge'); return; }
  if (d.t === 'insets') { setInsets(d.insets); return; }
  if (!handlers) { waiting.push(d); return; }              // la maquette n'a pas fini de démarrer
  if (d.t === 'get-state') ack({ hash: handlers.state(!!d.leave) });
  else if (d.t === 'prepare') { handlers.resume(); handlers.prepare(d.hash || ''); ack(); }
  else if (d.t === 'sink') handlers.morph(0, d.ms || 1100).then(() => ack());
  else if (d.t === 'rise') handlers.morph(1, d.ms || 1300).then(() => ack());
  else if (d.t === 'apply') { handlers.apply(d.hash || ''); ack(); }
  else if (d.t === 'pause') handlers.pause();
  else if (d.t === 'resume') handlers.resume();
  else if (d.t === 'vitrine') { if (handlers.vitrine) handlers.vitrine(!!d.on); ack(); }
}

// La maquette ouvre-t-elle en vitrine ? Lu dans l'adresse du cadre, avant que la ville soit construite : son interface
// reste masquée dès le premier instant (classe « vitrine » de la racine, voir src/style.css).
export const enVitrine = () => document.documentElement.classList.contains('vitrine');
function vitrineDemandee() { return framed && /(^#|&)vitrine(&|$)/.test(location.hash); }

// À appeler dès le chargement de la page, avant de construire la ville : annonce la maquette à la page d'accueil.
export function bootEmbed(id) {
  era = id;
  if (!framed) { lienAccueil(); return; }
  if (vitrineDemandee()) document.documentElement.classList.add('vitrine');
  lienAccueil();
  window.addEventListener('message', (e) => { if (e.source === window.parent && e.data && e.data.src === 'paris-shell') handle(e.data); });
  tell({ t: 'boot' });
}

// À appeler une fois l'interface prête. h : { state(leave) → adresse de la vue, prepare(hash), apply(hash),
// morph(to, ms) → Promise, pause(), resume(), vitrine(on) }.
export function bindEmbed(h) { handlers = h; for (const d of waiting.splice(0)) handle(d); }

// Demande à la page d'accueil de passer à une autre époque. Rend false si la maquette est ouverte seule.
export function askEra(id, hash = '') { if (!shell.on) return false; tell({ t: 'era', to: id, hash }); return true; }

// Le nom du site, en tête de chaque maquette, ramène à l'écran d'accueil : hébergée, la maquette le demande à la page
// d'accueil (elle passe alors en vitrine) ; ouverte seule, le lien mène à la page d'accueil.
function lienAccueil() {
  const go = () => { const a = document.querySelector('#brand-site a'); if (!a) return;
    a.addEventListener('click', (e) => { if (!shell.on) return; e.preventDefault(); tell({ t: 'accueil' }); }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
}

// Signale un changement de vue : la page d'accueil tient son adresse à jour.
export function tellHash(hash) { if (shell.on) tell({ t: 'hash', hash }); }

// Adresse à partager pour cette vue : celle de la page d'accueil quand elle héberge la maquette.
export function shareUrl(hash) {
  if (!shell.on || !shell.base) return location.href.split('#')[0] + hash;
  return shell.base + '#' + (era && era !== '1380' ? 'm=' + era + '&' : '') + hash.replace(/^#/, '');
}
