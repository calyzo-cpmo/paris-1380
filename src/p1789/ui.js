// Interface de la page « Paris 1789 » : lieux et fiches, heure, mini-plan, boussole, marche à pied, lien partageable.
// Mêmes repères visuels que la maquette de 1380 (src/ui.js), en plus simple : ni parcours ni intérieurs pour l'instant.
import * as THREE from 'three';
import { CADRE, RAW } from './data.js';
import { CATS, makePlaces } from './places.js';
import { parseHash, makeHash } from '../state.js';
import { clamp } from '../geom.js';

const HOME = { x: -350, z: -420, dist: 3600, az: -0.45, el: 0.66 };

export function initUI89(app) {
  const $ = (id) => document.getElementById(id), body = document.body, rig = app.rig, canvas = app.renderer.domElement, T = app.terrain;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const small = () => window.innerWidth <= 640;
  const places = makePlaces(app), byId = new Map(places.map((p) => [p.id, p]));
  app.places = places;
  let selected = null, hintTimer = 0, toastTimer = 0, hourPlay = false, hashTimer = 0, calm = false;

  // ---------- messages
  function toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; toastTimer = 3.2; }
  function hint(text, seconds = 9) { const h = $('hint'); h.textContent = text; h.hidden = !!app.shot && false; hintTimer = seconds; }

  // ---------- point du sol sous le curseur : marche le long du rayon jusqu'au relief
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function groundPoint(cx, cy, far = 9000) {
    const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, app.camera);
    const o = ray.ray.origin, d = ray.ray.direction; let t0 = 0, step = 3;
    for (let t = 0; t < far; t += step) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y < T.height(x, z)) { let a = t0, b = t; for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if (o.y + d.y * m < T.height(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; } return [o.x + d.x * b, o.z + d.z * b]; }
      t0 = t; step = Math.min(40, 3 + t * 0.02);
    }
    return null;
  }
  const clearAt = (x, z, r) => app.walkable(x, z) && app.walkable(x + r, z) && app.walkable(x - r, z) && app.walkable(x, z + r) && app.walkable(x, z - r);
  function nearestClear(x, z, maxR = 80) { for (let r = 0; r <= maxR; r += 2) for (let a = 0; a < 6.283; a += r ? Math.min(0.8, 3 / r) : 7) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (clearAt(px, pz, 1.4)) return [px, pz]; } return null; }

  // ---------- étiquettes
  const layer = $('labels'), v = new THREE.Vector3();
  for (const p of places) {
    const d = el('button', 'label' + (p.rang === 1 ? ' p1' : '')); d.type = 'button'; d.style.setProperty('--c', p.color);
    d.append(el('i'), el('span', null, p.name), el('small')); d.addEventListener('click', () => select(p, true)); layer.appendChild(d); p.el = d;
  }
  function updateLabels() {
    const w = window.innerWidth, h = window.innerHeight, walking = rig.mode === 'walk', cam = app.camera.position;
    for (const p of places) {
      v.set(p.x, p.y + 6, p.z); const dist = v.distanceTo(cam); v.project(app.camera);
      const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
      const vis = v.z < 1 && sx > -40 && sx < w + 40 && sy > 40 && sy < h - 30 && (walking ? dist < 900 : true);
      if (!vis) { p.el.style.display = 'none'; continue; }
      const named = p === selected || (walking ? dist < 500 || p.rang === 1 : p.rang === 1 ? dist < 9000 : dist < 1500);
      p.el.style.display = ''; p.el.classList.toggle('dot', !named); p.el.classList.toggle('sel', p === selected);
      p.el.lastChild.textContent = walking && named ? Math.round(dist / 10) * 10 + ' m' : '';
      p.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, ${named ? '-100%' : '-50%'})`;
    }
  }

  // ---------- fiche
  function openCard(p) {
    const c = $('card-cat'); c.textContent = ''; const i = el('i'); i.style.setProperty('--c', p.color); c.append(i, p.catName);
    $('card-name').textContent = p.name; $('card-text').textContent = p.note + (p.absent ? ' L’atlas de Vasserot ne couvre pas cet îlot : l’édifice n’est pas encore modelé.' : ''); $('card').hidden = false; $('card').classList.toggle('peek', small());
  }
  function closeCard() { $('card').hidden = true; selected = null; queueHash(); }
  function frame(p) { rig.flyTo({ x: p.x, z: p.z, dist: 520, az: rig.cur.az, el: 0.62 }, 2.2); }
  function select(p, move) {
    selected = p;
    if (!p) { $('card').hidden = true; queueHash(); return; }
    openCard(p); togglePlaces(false);
    if (move && rig.mode !== 'walk') frame(p);
    queueHash();
  }
  $('card-view').addEventListener('click', () => { if (selected) { if (rig.mode === 'walk') stopWalk(); frame(selected); } });
  $('card-walk').addEventListener('click', () => { if (selected) startWalk(selected); });
  $('card-grip').addEventListener('click', () => $('card').classList.toggle('peek'));

  // ---------- liste des lieux
  function fillList(q) {
    const list = $('place-list'), norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), needle = norm(q || '');
    list.textContent = '';
    for (const [k, [name, color]] of Object.entries(CATS)) {
      const items = places.filter((p) => p.cat === k && (!needle || norm(p.name).includes(needle))); if (!items.length) continue;
      const h = el('h3'), i = el('i'); i.style.setProperty('--c', color); h.append(i, name); list.appendChild(h);
      for (const p of items.sort((a, b) => a.name.localeCompare(b.name, 'fr'))) { const b = el('button'); b.type = 'button'; b.append(el('span', null, p.name)); b.addEventListener('click', () => select(p, true)); list.appendChild(b); }
    }
    if (!list.children.length) list.appendChild(el('p', 'empty', 'Aucun lieu de ce nom.'));
  }
  function togglePlaces(on) { $('places').hidden = !on; $('btn-places').setAttribute('aria-expanded', String(on)); body.classList.toggle('places-open', on); if (on) { fillList($('place-search').value); closeMore(); } }
  $('btn-places').addEventListener('click', () => togglePlaces($('places').hidden));
  $('place-search').addEventListener('input', (e) => fillList(e.target.value));

  // ---------- menus, fenêtres
  function closeMore() { $('menu-more').classList.remove('open'); $('btn-more').setAttribute('aria-expanded', 'false'); }
  $('btn-more').addEventListener('click', () => { const on = !$('menu-more').classList.contains('open'); $('menu-more').classList.toggle('open', on); $('btn-more').setAttribute('aria-expanded', String(on)); });
  function openModal(id) { closeMore(); $(id).hidden = false; }
  $('btn-sources').addEventListener('click', () => openModal('sources'));
  $('btn-help').addEventListener('click', () => openModal('help'));
  // frise des dates : des liens vers la première page, où chaque date pose sa ville sur la maquette de 1380
  const toggleFrise = (on) => { $('frise').hidden = !on; $('btn-epoch').setAttribute('aria-expanded', String(on)); if (on) closeMore(); };
  $('btn-epoch').addEventListener('click', () => toggleFrise($('frise').hidden));
  $('btn-1380').addEventListener('click', () => { location.href = 'index.html'; });
  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => { const id = b.dataset.close; if (id === 'card') closeCard(); else if (id === 'places') togglePlaces(false); else if (id === 'frise') toggleFrise(false); else $(id).hidden = true; });
  for (const m of document.querySelectorAll('.modal')) m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; });
  { const ul = $('sources-list'), row = (t, c) => { const li = el('li'); li.append(el('b', null, t + ' : '), c); ul.appendChild(li); };
    row('Îlots, rues nommées et Seine', 'plan de Verniquet, levé de 1782 à 1790 — © ALPAGE : P. Rouet ; rues © ALPAGE : L. Hermenault');
    row('Emprise des bâtiments', RAW.bati.credit);
    row('Mur des Fermiers généraux', RAW.mur.credit);
    row('Enclos nommés : places, jardins, hôpitaux, palais', RAW.enclos.credit);
    row('Emprise de la Bastille', RAW.bastille.credit);
    row('Relief', RAW.relief.credit);
    row('Établissements religieux en 1789', RAW.eglises.credit); }

  // ---------- heure
  const fmt = (h) => { const m = Math.round(h * 60); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
  function setHour(h, quiet) { h = clamp(h, 4.5, 22.5); app.setHour(h); $('hour').value = String(h); $('hour-label').textContent = fmt(h); for (const b of $('hour-presets').children) b.setAttribute('aria-pressed', String(Math.abs(+b.dataset.hour - h) < 0.01)); if (!quiet) queueHash(); }
  function stopHourPlay() { hourPlay = false; $('hour-play').setAttribute('aria-pressed', 'false'); }
  $('hour').addEventListener('input', (e) => { stopHourPlay(); setHour(+e.target.value); });
  for (const b of $('hour-presets').children) b.addEventListener('click', () => { stopHourPlay(); setHour(+b.dataset.hour); });
  $('hour-play').addEventListener('click', () => { hourPlay = !hourPlay; $('hour-play').setAttribute('aria-pressed', String(hourPlay)); });
  $('hour-btn').addEventListener('click', () => { if (!small()) return; const on = !$('hour-wrap').classList.contains('open'); $('hour-wrap').classList.toggle('open', on); $('hour-btn').setAttribute('aria-expanded', String(on)); });

  // ---------- marche à pied
  function walkUI(on) {
    body.classList.toggle('walking', on); $('walkhud').hidden = !on;
    $('mode-walk').setAttribute('aria-pressed', String(on)); $('mode-fly').setAttribute('aria-pressed', String(!on));
    if (on) hint(matchMedia('(pointer: coarse)').matches ? 'Pouce gauche pour marcher · pouce droit pour regarder · toucher le sol pour avancer' : 'Glisser pour regarder · cliquer sur le sol pour avancer · flèches ou Z Q S D pour marcher, Maj pour courir · Échap pour remonter', 11);
    else $('hint').hidden = true;
  }
  function goWalk(x, z, yaw = 0) { stopHourPlay(); rig.fly = null; rig.enterWalk(x, z, yaw, -0.02); walkUI(true); queueHash(); }
  function stopWalk() { if (rig.mode !== 'walk') return; rig.exitWalk(); walkUI(false); queueHash(); }
  // On arrive face au lieu, avec du recul, sur un point dégagé.
  function startWalk(p) {
    let best = null, bs = -1e9;
    for (let k = 0; k < 10; k++) for (let a = 0; a < 16; a++) {
      const d = 30 + k * 12, x = p.x + Math.cos(a * 0.3927) * d, z = p.z + Math.sin(a * 0.3927) * d;
      if (!clearAt(x, z, 2)) continue;
      let open = 0; for (let m = 0; m < 8; m++) if (app.walkable(x + Math.cos(m * 0.785) * 7, z + Math.sin(m * 0.785) * 7)) open++;
      let los = 0; const ux = (p.x - x) / d, uz = (p.z - z) / d; for (let t = 4; t < Math.min(d - 8, 48); t += 4) { if (!app.walkable(x + ux * t, z + uz * t)) break; los++; }
      const s = -Math.abs(d - 60) * 0.12 + open * 1.2 + los * 1.6 + (Math.cos(a * 0.3927) < 0 ? 3 : 0);       // du recul, un lieu dégagé, la vue libre ; les églises s'abordent par l'ouest
      if (s > bs) { bs = s; best = [x, z]; }
    }
    if (!best) best = nearestClear(p.x, p.z, 200);
    if (!best) { toast('Ce lieu n’est pas accessible à pied.'); return; }
    select(p, false); $('card').hidden = true;
    goWalk(best[0], best[1], Math.atan2(best[0] - p.x, best[1] - p.z));
  }
  $('walk-exit').addEventListener('click', stopWalk);
  $('mode-fly').addEventListener('click', stopWalk);
  $('mode-walk').addEventListener('click', () => { if (rig.mode === 'walk') return; const q = nearestClear(rig.cur.x, rig.cur.z, 300); if (q) goWalk(q[0], q[1], rig.cur.az); else toast('Choisissez d’abord un endroit dégagé : une rue, une place, un quai.'); });
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY, performance.now()]; });
  canvas.addEventListener('click', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || rig.mode !== 'walk') return;
    const g = groundPoint(e.clientX, e.clientY, 160), q = g && nearestClear(g[0], g[1], 8);
    if (q) rig.walkTo = q;
  });
  canvas.addEventListener('dblclick', (e) => {
    if (rig.mode === 'walk') return;
    const g = groundPoint(e.clientX, e.clientY), q = g && nearestClear(g[0], g[1], 70);
    if (q) goWalk(q[0], q[1], rig.cur.az); else toast('On ne peut pas descendre ici : choisissez une rue, une place ou un quai.');
  });

  // ---------- où suis-je
  let whereSig = '';
  function updateWhere() {
    const walking = rig.mode === 'walk', x = walking ? rig.walk.x : rig.cur.x, z = walking ? rig.walk.z : rig.cur.z, w = $('where');
    if (!walking && rig.cur.dist > 700) { if (!w.hidden) { w.hidden = true; $('brand-sub').hidden = false; whereSig = ''; } return; }
    const rue = app.streetAt(x, z, walking ? 30 : 60); let near = null, nd = 220;
    for (const p of places) { const d = Math.hypot(p.x - x, p.z - z); if (d < nd) { nd = d; near = p; } }
    const sig = (rue || '') + '|' + (near ? near.id : '');
    if (sig === whereSig) return; whereSig = sig;
    w.textContent = ''; if (rue) w.append(el('b', null, rue)); if (near) w.append((rue ? ' · ' : '') + 'près de ' + near.name.replace(/^(Le |La |Les )/, (m) => m.toLowerCase()));
    w.hidden = !rue && !near; $('brand-sub').hidden = !w.hidden;
  }

  // ---------- mini-plan
  const mini = { cv: $('minimap'), ctx: $('minimap').getContext('2d', { willReadFrequently: true }), zoom: 'city', sig: '' };
  function drawMini() {
    const cv = mini.cv, ctx = mini.ctx, cw = cv.clientWidth, ch = cv.clientHeight; if (!cw || !ch) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(cw * dpr), H = Math.round(ch * dpr), walking = rig.mode === 'walk';
    const px = walking ? rig.walk.x : rig.cur.x, pz = walking ? rig.walk.z : rig.cur.z, head = walking ? rig.walk.yaw : rig.cur.az;
    const sig = [W, H, mini.zoom, walking, px.toFixed(0), pz.toFixed(0), head.toFixed(2), rig.cur.dist.toFixed(0), selected ? selected.id : ''].join('|');
    if (sig === mini.sig) return; mini.sig = sig;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = app.plan.rectWide; let k, x0, z0;
    if (mini.zoom === 'local') { k = cw / 900; x0 = px - cw / k / 2; z0 = pz - ch / k / 2; }
    else { k = Math.min(cw / R.w, ch / R.h); x0 = R.x + R.w / 2 - cw / k / 2; z0 = R.z + R.h / 2 - ch / k / 2; }
    mini.k = k; mini.x0 = x0; mini.z0 = z0;
    const X = (x) => (x - x0) * k, Y = (z) => (z - z0) * k;
    ctx.fillStyle = 'rgb(24,36,76)'; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(app.plan.wide, X(R.x), Y(R.z), R.w * k, R.h * k);
    if (mini.zoom === 'local') { const C = app.plan.rectCentre; ctx.drawImage(app.plan.centre, X(C.x), Y(C.z), C.w * k, C.h * k); }
    for (const p of places) { if (p.rang !== 1 && p !== selected && mini.zoom !== 'local') continue; ctx.fillStyle = p === selected ? '#fff' : p.color; ctx.beginPath(); ctx.arc(X(p.x), Y(p.z), p === selected ? 3.4 : 2.2, 0, 6.3); ctx.fill(); }
    const cx = X(px), cy = Y(pz), fx = -Math.sin(head), fz = -Math.cos(head);
    ctx.fillStyle = 'rgba(240,200,96,0.3)'; ctx.strokeStyle = 'rgba(240,200,96,0.95)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx, cy); const reach = mini.zoom === 'local' ? 60 : clamp(rig.cur.dist * k * 0.9, 16, 70), a0 = Math.atan2(fz, fx); ctx.arc(cx, cy, reach, a0 - 0.42, a0 + 0.42); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0b1230'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 6.3); ctx.fill(); ctx.stroke();
  }
  $('map-zoom').addEventListener('click', () => { mini.zoom = mini.zoom === 'city' ? 'local' : 'city'; mini.sig = ''; $('map-zoom').textContent = mini.zoom === 'city' ? 'Quartier' : 'Ville entière'; });
  mini.cv.addEventListener('click', (e) => {
    const r = mini.cv.getBoundingClientRect(), x = mini.x0 + (e.clientX - r.left) / mini.k, z = mini.z0 + (e.clientY - r.top) / mini.k;
    if (rig.mode === 'walk') { const q = nearestClear(x, z, 120); if (q) goWalk(q[0], q[1], rig.walk.yaw); else toast('Ce point n’est pas accessible à pied.'); }
    else rig.flyTo({ x: clamp(x, CADRE.x0, CADRE.x1), z: clamp(z, CADRE.z0, CADRE.z1), dist: Math.min(rig.cur.dist, 900), az: rig.cur.az, el: rig.cur.el }, 1.8);
  });

  // ---------- boussole, vue d'ensemble
  $('compass').addEventListener('click', () => { if (rig.mode === 'walk') rig.walk.yawGoal = 0; else { rig.fly = null; rig.goal.az = Math.round(rig.goal.az / 6.2832) * 6.2832; } });
  function goHome() { if (rig.mode === 'walk') stopWalk(); select(null); rig.flyTo({ ...HOME }, 2.4); }
  $('btn-home').addEventListener('click', goHome);

  // ---------- lien partageable
  function currentState() {
    const s = { h: app.sky.hour };
    if (rig.mode === 'walk') s.w = [rig.walk.x, rig.walk.z, rig.walk.yaw]; else s.c = [rig.goal.x, rig.goal.z, rig.goal.dist, rig.goal.az, rig.goal.el];
    if (selected) s.p = selected.id;
    return s;
  }
  const link = () => makeHash(currentState());
  function queueHash() { hashTimer = 0.6; }
  function applyState(s) {
    let used = false;
    if (s.h != null) { setHour(s.h, true); used = true; }
    if (s.c) { rig.fly = null; rig.goal = { x: clamp(s.c[0], CADRE.x0, CADRE.x1), z: clamp(s.c[1], CADRE.z0, CADRE.z1), dist: clamp(s.c[2], 18, 9500), az: s.c[3], el: clamp(s.c[4], 0.035, 1.5) }; rig.cur = { ...rig.goal }; used = true; }
    if (s.p && byId.has(s.p)) { select(byId.get(s.p), !s.c && !s.w); used = true; }
    if (s.w && app.walkable(s.w[0], s.w[1])) { goWalk(s.w[0], s.w[1], s.w[2]); used = true; }
    return used;
  }
  const openLink = (hash) => applyState(parseHash(hash));
  $('btn-share').addEventListener('click', async () => {
    closeMore(); const url = location.href.split('#')[0] + link();
    try { await navigator.clipboard.writeText(url); toast('Lien copié : il rouvre cette vue.'); } catch (e) { history.replaceState(null, '', link()); toast('Le lien de cette vue est dans la barre d’adresse.'); }
  });

  // ---------- clavier
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      for (const m of document.querySelectorAll('.modal')) if (!m.hidden) { m.hidden = true; return; }
      if ($('menu-more').classList.contains('open')) { closeMore(); return; }
      if (!$('places').hidden) { togglePlaces(false); return; }
      if (!$('frise').hidden) { toggleFrise(false); return; }
      if (!$('card').hidden) { closeCard(); return; }
      if (rig.mode === 'walk') stopWalk();
      return;
    }
    if ((e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) || e.ctrlKey || e.metaKey || e.altKey) return;
    if ([...document.querySelectorAll('.modal')].some((m) => !m.hidden)) return;
    if (e.key === '/') { e.preventDefault(); togglePlaces(true); $('place-search').focus(); $('place-search').select(); }
    else if (e.code === 'KeyN') $('compass').click();
    else if (e.code === 'KeyO' || e.code === 'Home') goHome();
  });
  rig.onUserInput = () => { if (hourPlay && rig.mode === 'walk') return; };

  // ---------- à chaque image
  app.on('frame', (dt) => {
    if (hourPlay) { let h = app.sky.hour + dt * 0.9; if (h > 22.5) h = 4.5; setHour(h, true); }
    if (hintTimer > 0 && (hintTimer -= dt) <= 0) $('hint').hidden = true;
    if (toastTimer > 0 && (toastTimer -= dt) <= 0) $('toast').hidden = true;
    if (hashTimer > 0 && (hashTimer -= dt) <= 0 && !app.shot) { try { history.replaceState(null, '', link()); } catch (e) { /* adresse non modifiable (aperçu) */ } }
    const az = rig.mode === 'walk' ? rig.walk.yaw : rig.cur.az; $('compass-rose').setAttribute('transform', `rotate(${(((az * 180) / Math.PI) % 360).toFixed(1)})`);
    updateLabels(); updateWhere(); drawMini();
  });
  window.addEventListener('resize', () => { mini.sig = ''; });

  // ---------- lever de rideau
  fillList('');
  setHour(10.5, true);
  calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fromLink = !app.shot && location.hash.length > 1 ? openLink(location.hash) : false;
  body.classList.add('ready');
  if (!fromLink && !app.shot) hint('Glisser pour se déplacer, molette pour s’approcher · double-clic pour descendre à pied', 10);
  app.ui = { select, openCard, closeCard, setHour, startWalk, goWalk, stopWalk, goHome, link, openLink, currentState, applyState, places, byId, groundPoint, nearestClear, mini, drawMini, updateLabels, togglePlaces, calm };
}
