// Interface : étiquettes et fiches des lieux, liste et carnet de visite, parcours commentés, marche à pied,
// repères (mini-plan, boussole, « où suis-je »), heure du jour, calque de certitude, accueil et lien partageable.
import * as THREE from 'three';
import { buildPlaces, CATS } from './places.js';
import { TOURS } from './tours.js';
import { SOURCES, SOURCE_GROUPS } from './sources.js';
import { CERT } from './certainty.js';
import { MiniMap } from './minimap.js';
import { makeLocator } from './where.js';
import { store, parseHash, makeHash } from './state.js';
import { Epochs, JALONS, EPOQUES, stats as epochStats } from './epochs.js';
import { clamp } from './geom.js';
import T from '../data/thumbs.json';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fmtHour = (h) => { const hh = Math.floor(h + 1e-6), mm = Math.round((h - hh) * 60); return `${hh} h ${String(mm).padStart(2, '0')}`; };
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const wrapPi = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export const CAT_COLORS = { 'Cité': '#f0c860', 'Pouvoir royal': '#7aa7ff', 'Fortifications': '#ef8a62', 'Églises et abbayes': '#c7a3f5', 'Université': '#5fd0b5', 'Vie urbaine': '#f29fc5', 'Ponts': '#9ad9f5', 'Hors les murs': '#a9d86e' };
const HOME = { x: -80, z: -120, dist: 2300, az: -0.55, el: 0.62 };

export function initUI(app) {
  const places = buildPlaces(app);
  app.places = places;
  const byId = new Map(places.map((p) => [p.id, p]));
  const srcById = new Map(SOURCES.map((s) => [s.id, s]));
  const rig = app.rig, canvas = app.renderer.domElement, body = document.body;
  const touch = matchMedia('(pointer: coarse)').matches;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => window.innerWidth <= 640;
  let selected = null, hovered = null, hoverLabel = null, namesOn = true, filter = 'all';
  let mini = null, pendingFly = null, walkGoal = null;      // walkGoal : le lieu que l'on est venu voir à pied
  let epochPlay = 0;                 // défilement des époques : temps restant avant la suivante (0 : arrêté)
  let tour = null, pendingWalk = false, nearPlace = null, welcomeSpin = false, hourPlay = false, hashTimer = 0, whereTimer = 0, hintTimer = 0, toastTimer = 0;

  // ---------- carnet de visite : lieux vus, intérieurs visités, parcours suivis
  const carnet = { seen: new Set(store.get('seen', [])), inside: new Set(store.get('inside', [])), tours: new Set(store.get('tours', [])) };
  const visitable = places.filter((p) => app.interiors && app.interiors.has(p)).length;
  for (const p of places) { p.seen = carnet.seen.has(p.id); p.visited = carnet.inside.has(p.id); p.hasIn = !!(app.interiors && app.interiors.has(p)); p.cert = app.cert ? app.cert.classAt(p.x, p.z, Math.min(40, (p.rad || 28) * 0.6)) : 1; }
  function updateCarnet() {
    const seen = places.filter((p) => p.seen).length, ins = places.filter((p) => p.visited).length;
    $('places-count').textContent = `${seen}/${places.length}`;
    const t = $('carnet-text'); t.textContent = '';
    t.append(el('b', null, String(seen)), ` ${seen > 1 ? 'lieux vus' : 'lieu vu'} sur ${places.length} · `, el('b', null, String(ins)), ` ${ins > 1 ? 'intérieurs visités' : 'intérieur visité'} sur ${visitable}`);
    $('carnet-bar').style.width = `${Math.round(((seen + ins) / (places.length + visitable)) * 100)}%`;
    if (mini) mini.seenCount = seen;
  }
  function mark(p, inside) {
    let changed = false;
    if (!p.seen) { p.seen = true; carnet.seen.add(p.id); store.set('seen', [...carnet.seen]); p.el.classList.add('seen'); changed = true; }
    if (inside && !p.visited) { p.visited = true; carnet.inside.add(p.id); store.set('inside', [...carnet.inside]); changed = true; }
    if (changed) { updateCarnet(); if (!$('places').hidden) renderList($('place-search').value); }
  }

  // ---------- étiquettes : nom, pastille de catégorie, marque « intérieur à visiter »
  const layerEl = $('labels');
  for (const p of places) {
    const b = el('button', 'label p' + p.pri + (p.hasIn ? ' in' : '') + (p.seen ? ' seen' : ''));
    b.type = 'button'; b.tabIndex = -1; b.style.setProperty('--c', CAT_COLORS[p.cat] || '#dcb866');
    b.append(el('i'), el('span', null, p.name));
    if (p.hasIn) b.append(el('em'));
    p.distEl = el('small'); p.distEl.hidden = true; b.append(p.distEl);
    b.title = p.hasIn ? `${p.name} — intérieur à visiter` : p.name;
    b.addEventListener('click', (e) => { e.stopPropagation(); select(p, rig.mode !== 'walk'); });
    b.addEventListener('pointerenter', () => { hoverLabel = p; });
    b.addEventListener('pointerleave', () => { if (hoverLabel === p) hoverLabel = null; });
    layerEl.appendChild(b); p.el = b; p.v = new THREE.Vector3(p.x, p.y, p.z); p.shown = 0; p.tr = ''; p.bw = p.name.length * (p.pri === 1 ? 8.2 : 7) + 34 + (p.hasIn ? 13 : 0);
    b.style.display = 'none';
  }
  const villages = (app.villages || []).map((v) => { const e = el('div', 'vlabel', v.name); e.style.display = 'none'; layerEl.appendChild(e); return { ...v, el: e, shown: false, v: new THREE.Vector3(v.x, Math.max(0, app.terrain.height(v.x, v.z)) + 16, v.z) }; });
  const proj = new THREE.Vector3();
  const passes = (p) => filter === 'all' || $('places').hidden || (filter === 'inside' ? p.hasIn : !p.seen);
  function updateLabels() {
    if (!namesOn || app.inside) { if (layerEl.style.display !== 'none') layerEl.style.display = 'none'; return; }
    if (layerEl.style.display === 'none') layerEl.style.display = '';
    const w = layerEl.clientWidth, h = layerEl.clientHeight, cam = app.camera, walking = rig.mode === 'walk', dist = walking ? 0 : rig.cur.dist;
    const boxes = [];
    const rank = (p) => (p === selected ? -2 : p === hovered || p === hoverLabel ? -1 : p.pri);
    const order = places.slice().sort((a, b) => rank(a) - rank(b));
    for (const p of order) {
      const special = p === selected || p === hovered || p === hoverLabel, ok = passes(p);
      let show = 0, x = 0, y = 0;                       // 0 : masqué, 1 : pastille, 2 : nom
      proj.copy(p.v).project(cam);
      const d = cam.position.distanceTo(p.v);
      if (proj.z <= 1 && proj.z >= -1) {
        x = (proj.x * 0.5 + 0.5) * w; y = (-proj.y * 0.5 + 0.5) * h - 14;
        if (x >= -40 && x <= w + 40 && y >= 30 && y <= h - 40) {
          const hit = () => boxes.some((q) => Math.abs(q[0] - x) < (q[2] + p.bw) / 2 && Math.abs(q[1] - y) < 24);
          if (walking) { if (special || d < 330 || (p.pri === 1 && d < 1300)) show = special || !hit() ? 2 : 0; }
          else {
            const text = ok && (special || p.pri === 1 || (p.pri === 2 && dist < 1900) || (p.pri === 3 && dist < 850)) && d <= (p.pri === 1 ? 7000 : p.pri === 2 ? 3200 : 1500);
            if (text && (special || !hit())) show = 2;
            else if (d < 9000 && !boxes.some((q) => Math.abs(q[0] - x) < q[2] / 2 + 6 && Math.abs(q[1] - y) < 20)) show = 1;
          }
        }
      }
      if (show === 2) boxes.push([x, y, p.bw + (walking ? 44 : 0)]);
      if (show) {
        const tr = show === 2 ? `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` : `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${(y + 14).toFixed(1)}px)`;
        if (tr !== p.tr) { p.el.style.transform = tr; p.tr = tr; }
        if (walking && show === 2) { const dh = Math.hypot(p.x - cam.position.x, p.z - cam.position.z) - (p.rad || 28), t = dh < 45 ? '' : `${Math.round(dh / 10) * 10} m`; if (p.distEl.textContent !== t) { p.distEl.textContent = t; p.distEl.hidden = !t; } }
        else if (!p.distEl.hidden) p.distEl.hidden = true;
      }
      if (show !== p.shown) { p.el.style.display = show ? '' : 'none'; p.el.classList.toggle('dot', show === 1); p.shown = show; }
      const dim = !ok && show === 1; if (dim !== !!p.dim) { p.el.classList.toggle('dim', dim); p.dim = dim; }
    }
    // noms des villages des environs : simples repères, sans fiche
    for (const v of villages) {
      let show = false;
      if (!walking && dist > 300) {
        proj.copy(v.v).project(cam);
        if (proj.z <= 1 && proj.z >= -1 && cam.position.distanceTo(v.v) < 9000) {
          const x = (proj.x * 0.5 + 0.5) * w, y = (-proj.y * 0.5 + 0.5) * h, bw = v.name.length * 6.6 + 10;
          if (x > 20 && x < w - 20 && y > 70 && y < h - 70 && !boxes.some((q) => Math.abs(q[0] - x) < (q[2] + bw) / 2 && Math.abs(q[1] - y) < 22)) { show = true; boxes.push([x, y, bw]); v.el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; }
        }
      }
      if (show !== v.shown) { v.el.style.display = show ? '' : 'none'; v.shown = show; }
    }
  }

  // ---------- fiche
  function fillCard(p) {
    const cat = $('card-cat'); cat.textContent = ''; cat.append(el('i'), p.cat); cat.style.setProperty('--c', CAT_COLORS[p.cat] || '#dcb866');
    $('card-name').textContent = p.name; $('card-date').textContent = p.date; $('card-text').textContent = p.text;
    const ce = $('card-cert'), c = CERT[p.cert] || CERT[1]; ce.textContent = c.note; ce.style.setProperty('--c', c.css || '#b9b4a3');
    const cs = $('card-src'); cs.textContent = '';
    if (p.src && p.src.length) {
      cs.appendChild(document.createTextNode('D’après : '));
      p.src.forEach((id, i) => { const s = srcById.get(id); if (!s) return; if (i) cs.appendChild(document.createTextNode(' ; ')); const b = el('button', null, s.title); b.type = 'button'; b.addEventListener('click', () => openSources(id)); cs.appendChild(b); });
    }
    // chronologie : ce qui précède 1380, puis ce que le lieu est devenu
    const ol = $('card-chrono'); ol.textContent = ''; $('card-hist').hidden = !p.chrono;
    if (p.chrono) {
      let sep = false;
      for (const [d, t] of p.chrono) {
        const y = (d.match(/\d{3,4}/) || [])[0], after = y ? +y > 1380 : /Aujourd|\b(XV|XVI|XVII|XVIII|XIX|XX|XXI)e\b/.test(d);
        if (after && !sep) { sep = true; ol.appendChild(el('li', 'sep', 'Après 1380')); }
        const li = el('li', after ? 'after' : null); li.appendChild(el('b', null, d)); li.appendChild(el('span', null, t)); ol.appendChild(li);
      }
    }
    $('card-enter').hidden = !p.hasIn;
    $('card-walk').textContent = rig.mode === 'walk' ? 'S’y rendre à pied' : 'S’y promener à pied';
  }
  function openCard(p) { if (p !== selected) select(p, false, { quiet: true }); fillCard(p); $('card').classList.toggle('peek', small()); $('card').hidden = false; $('card').scrollTop = 0; mark(p); if (document.pointerLockElement) document.exitPointerLock(); queueHash(); }
  function closeCard() { $('card').hidden = true; queueHash(); }
  // Désigne un lieu. fly : s'y rendre (en volant, ou à pied si l'on marche déjà). quiet : sans ouvrir la fiche.
  function select(p, fly, o = {}) {
    if (selected) selected.el.classList.remove('sel');
    selected = p; if (mini) mini.selected = p;
    if (!p) { $('card').hidden = true; queueHash(); return; }
    p.el.classList.add('sel');
    if (!o.quiet) openCard(p);
    if (fly) { if (rig.mode === 'walk' && !app.inside) startWalk(p); else flyTo(p); }
  }
  function flyTo(p, o = {}) { rig.flyTo({ x: p.x, z: p.z, dist: o.dist ?? p.dist, el: o.el ?? 0.42, az: o.az }, o.time ?? 2.4); setMode('fly', true); }
  $('card-view').addEventListener('click', () => { if (!selected) return; if (rig.mode === 'walk') stopWalk(); flyTo(selected); });
  $('card-walk').addEventListener('click', () => selected && startWalk(selected));
  $('card-enter').addEventListener('click', () => selected && enterInterior(selected));
  $('card-grip').addEventListener('click', () => $('card').classList.toggle('peek'));

  // ---------- visite intérieure
  function enterInterior(p) {
    if (!app.interiors || !app.interiors.has(p)) return false;
    cancelPending();
    if (tour) pauseTour();
    stopHourPlay();
    if (!app.interiors.enter(p)) return false;
    const sp = app.interiors.spec(p);
    $('in-name').textContent = p.name; $('in-title').textContent = sp.title; $('in-text').textContent = sp.text;
    $('in-hint').textContent = touch ? 'Glissez pour regarder autour de vous, touchez le sol pour avancer.' : 'Glissez pour regarder autour de vous, cliquez sur le sol pour avancer. Flèches ou Z Q S D pour marcher, Échap pour sortir.';
    const box = $('in-spots'); box.textContent = '';
    (app.interiors.spots || []).forEach((s, i) => { const b = el('button', null, s[0]); b.type = 'button'; b.addEventListener('click', () => app.interiors.goSpot(i)); box.appendChild(b); });
    const sm = window.innerWidth < 700;            // petit écran : notice repliée, la vue d'abord
    $('inhud').classList.toggle('less', sm); $('in-less').textContent = sm ? 'Lire la notice' : 'Réduire la notice'; $('inhud').hidden = false; body.classList.add('inside');
    mark(p, true); closePops(); queueHash();
    return true;
  }
  function leaveInterior() {
    if (!app.inside) return;
    app.interiors.exit();
    $('inhud').hidden = true; body.classList.remove('inside');
    if (mini) mini.sig = '';
    queueHash();
  }
  $('in-exit').addEventListener('click', leaveInterior);
  $('in-less').addEventListener('click', () => { const less = $('inhud').classList.toggle('less'); $('in-less').textContent = less ? 'Lire la notice' : 'Réduire la notice'; });

  // ---------- désigner un monument dans la scène, toucher le sol
  const pv = new THREE.Vector3(), ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  function pick(cx, cy) {
    if (rig.mode !== 'orbit' || app.inside) return null;
    const rc = canvas.getBoundingClientRect(), w = rc.width, h = rc.height, cam = app.camera, mx = cx - rc.left, my = cy - rc.top;
    const fl = h / 2 / Math.tan((cam.fov * Math.PI) / 360);
    let best = null, bs = 1;
    for (const p of places) {
      const dist = cam.position.distanceTo(p.v); if (dist > 7000) continue;
      pv.set(p.x, p.y0, p.z).project(cam); if (pv.z > 1 || pv.z < -1) continue;
      const x0 = (pv.x * 0.5 + 0.5) * w, y0 = (-pv.y * 0.5 + 0.5) * h;
      pv.copy(p.v).project(cam); if (pv.z > 1 || pv.z < -1) continue;
      const dx = (pv.x * 0.5 + 0.5) * w - x0, dy = (-pv.y * 0.5 + 0.5) * h - y0, t = Math.max(0, Math.min(1, ((mx - x0) * dx + (my - y0) * dy) / (dx * dx + dy * dy || 1)));
      const s = Math.hypot(mx - x0 - dx * t, my - y0 - dy * t) / Math.max(20, (p.rad * fl) / dist);
      if (s < bs) { bs = s; best = p; }
    }
    return best;
  }
  // Point du sol visé à l'écran : [x, z, bloqué par un bâtiment ?]. On suit le rayon jusqu'au terrain, ou jusqu'au premier mur.
  function groundPoint(cx, cy, far) {
    const rc = canvas.getBoundingClientRect();
    v2.set(((cx - rc.left) / rc.width) * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1); ray.setFromCamera(v2, app.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (d.y > -0.015) return null;
    const gy = (x, z) => Math.max(app.walkHeight(x, z), 0);
    let prev = 0;
    for (let t = 0.6; t < far; t += t < 50 ? 0.6 : t * 0.015) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t, g = gy(x, z);
      if (y - g < 9 && app.solid.get(x, z)) return [o.x + d.x * prev, o.z + d.z * prev, true];
      if (y <= g) { let a = prev, b = t; for (let i = 0; i < 7; i++) { const m = (a + b) / 2; if (o.y + d.y * m <= gy(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; } return [o.x + d.x * b, o.z + d.z * b, false]; }
      prev = t;
    }
    return null;
  }
  const clearAt = (x, z, r) => app.walkable(x, z) && app.walkable(x + r, z) && app.walkable(x - r, z) && app.walkable(x, z + r) && app.walkable(x, z - r);
  function nearestClear(x, z, maxR = 60) { for (let r = 0; r <= maxR; r += 2) for (let a = 0; a < 6.283; a += r ? Math.min(0.8, 3 / r) : 7) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (clearAt(px, pz, 1.4)) return [px, pz]; } return null; }
  // repère au sol : où le clic emmènera le promeneur
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.58, 28), new THREE.MeshBasicMaterial({ color: 0xf0c860, transparent: true, opacity: 0.9, depthTest: false, fog: false }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 6; app.scene.add(ring);
  {
    let down = null, mouse = null, lastTap = null;
    canvas.addEventListener('pointerdown', (e) => { down = e.button === 0 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; });
    canvas.addEventListener('pointerup', (e) => {
      const d0 = down; down = null;
      if (!d0 || app.inside || Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 6 || performance.now() - d0.t > 600) return;
      const now = performance.now(), dbl = lastTap && now - lastTap.t < 340 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 26;
      lastTap = dbl ? null : { x: e.clientX, y: e.clientY, t: now };
      if (rig.mode === 'walk') {                         // à pied : toucher le sol pour s'y rendre
        if (document.pointerLockElement === canvas) return;
        const g = groundPoint(e.clientX, e.clientY, 90); if (!g) return;
        const q = clearAt(g[0], g[1], 0.5) ? g : nearestClear(g[0], g[1], 6);
        if (q) { rig.walkTo = [q[0], q[1]]; rig.walkStall = 0; }
        return;
      }
      const p = pick(e.clientX, e.clientY);
      if (dbl) {                                          // double-clic : descendre à pied à cet endroit
        if (p) { startWalk(p); return; }
        const g = groundPoint(e.clientX, e.clientY, 9000), q = g && nearestClear(g[0], g[1], 70);
        if (q) goWalk(q[0], q[1], rig.cur.az, -0.04); else toast('On ne peut pas descendre ici : choisissez une rue, une place ou un champ.');
        return;
      }
      if (p) select(p, true);
    });
    canvas.addEventListener('pointermove', (e) => { mouse = e.pointerType === 'mouse' && !e.buttons ? [e.clientX, e.clientY] : null; });
    canvas.addEventListener('pointerleave', () => { mouse = null; });
    app.on('frame', () => {
      if (app.inside) { ring.visible = false; return; }
      if (rig.mode === 'walk') {
        let show = false;
        if (rig.walkTo) { ring.position.set(rig.walkTo[0], app.walkHeight(rig.walkTo[0], rig.walkTo[1]) + 0.06, rig.walkTo[1]); show = true; }
        else if (mouse && document.pointerLockElement !== canvas) { const g = groundPoint(mouse[0], mouse[1], 60); if (g && !g[2] && app.walkable(g[0], g[1])) { ring.position.set(g[0], app.walkHeight(g[0], g[1]) + 0.06, g[1]); show = true; } }
        ring.visible = show;
        if (hovered) { hovered = null; canvas.style.cursor = ''; }
        return;
      }
      ring.visible = false;
      const p = mouse ? pick(mouse[0], mouse[1]) : null;
      if (p !== hovered) { hovered = p; canvas.style.cursor = p ? 'pointer' : ''; }
    });
  }

  // ---------- liste des lieux, filtres
  const list = $('place-list');
  function renderList(text = '') {
    list.textContent = '';
    const f = norm(text.trim());
    for (const cat of CATS) {
      const items = places.filter((p) => p.cat === cat && (!f || norm(p.name).includes(f)) && (filter === 'all' || (filter === 'inside' ? p.hasIn : !p.seen))).sort((a, b) => a.pri - b.pri || a.name.localeCompare(b.name, 'fr'));
      if (!items.length) continue;
      const h = el('h3'); h.append(el('i'), cat); h.style.setProperty('--c', CAT_COLORS[cat]); list.appendChild(h);
      for (const p of items) {
        const b = el('button', p.visited ? 'seen visited' : p.seen ? 'seen' : null); b.type = 'button'; b.append(el('span', null, p.name)); if (p.hasIn) { const m = el('em'); m.title = 'Intérieur à visiter'; b.append(m); }
        b.addEventListener('click', () => { select(p, true); if (small()) togglePlaces(false); });
        list.appendChild(b);
      }
    }
    if (!list.children.length) list.appendChild(el('p', 'group-note', filter === 'new' && !f ? 'Vous avez vu tous les lieux de la maquette.' : 'Aucun lieu ne correspond à cette recherche.'));
  }
  $('place-search').addEventListener('input', (e) => renderList(e.target.value));
  for (const b of document.querySelectorAll('#place-filters button')) b.addEventListener('click', () => { filter = b.dataset.filter; for (const q of document.querySelectorAll('#place-filters button')) q.setAttribute('aria-pressed', String(q === b)); renderList($('place-search').value); });
  function togglePlaces(on) {
    const a = $('places'); a.hidden = on == null ? !a.hidden : !on;
    $('btn-places').setAttribute('aria-expanded', String(!a.hidden)); body.classList.toggle('places-open', !a.hidden);
    if (!a.hidden) { renderList($('place-search').value); closePops(); }
  }
  $('btn-places').addEventListener('click', () => togglePlaces());

  // ---------- sources, aide, fenêtres
  const sb = $('sources-body');
  for (const g of SOURCE_GROUPS) {
    sb.appendChild(el('h3', null, g.title)); sb.appendChild(el('p', 'group-note', g.note));
    const grid = el('div', 'src-grid');
    for (const s of SOURCES.filter((q) => q.group === g.id)) {
      const thumb = s.thumb && T.thumbs[s.thumb];
      const card = el('article', 'src' + (thumb ? '' : ' noimg')); card.id = 'src-' + s.id;
      if (thumb) { const im = new Image(); im.src = thumb; im.alt = ''; im.loading = 'lazy'; card.appendChild(im); }
      const d = el('div');
      d.appendChild(el('h4', null, s.title)); d.appendChild(el('p', 'meta', `${s.author} · ${s.date} · ${s.where}`)); d.appendChild(el('p', 'use', s.use));
      const a = el('a', null, 'Voir le document'); a.href = (s.thumb && T.pages[s.thumb]) || s.url; a.target = '_blank'; a.rel = 'noopener'; d.appendChild(a);
      card.appendChild(d); grid.appendChild(card);
    }
    sb.appendChild(grid);
  }
  function openModal(id) { closePops(); if (document.pointerLockElement) document.exitPointerLock(); $(id).hidden = false; }
  function openSources(id) { openModal('sources'); const anchor = id === 'method' || id === 'sources-alpage-title', c = id && $(anchor ? id : 'src-' + id); if (c) { c.scrollIntoView({ block: anchor ? 'start' : 'center' }); if (!anchor) { c.style.outline = '1px solid var(--gold)'; setTimeout(() => (c.style.outline = ''), 2200); } } }
  $('btn-sources').addEventListener('click', () => openSources());
  $('btn-help').addEventListener('click', () => openModal('help'));
  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => { const id = b.dataset.close; if (id === 'card') closeCard(); else if (id === 'places') togglePlaces(false); else if (id === 'legend') setCert(false); else if (id === 'frise') closeFrise(); else $(id).hidden = true; });
  for (const m of document.querySelectorAll('.modal')) m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; });

  // ---------- menus dépliants (heure sur téléphone, affichage, menu)
  const pops = [['hour-btn', () => $('hour-wrap').classList.contains('open'), (on) => $('hour-wrap').classList.toggle('open', on)], ['btn-view', () => !$('view-menu').hidden, (on) => { $('view-menu').hidden = !on; }], ['btn-more', () => $('menu-more').classList.contains('open'), (on) => $('menu-more').classList.toggle('open', on)]];
  function closePops(except) { for (const [id, , set] of pops) if (id !== except) { set(false); $(id).setAttribute('aria-expanded', 'false'); } }
  for (const [id, get, set] of pops) $(id).addEventListener('click', (e) => { e.stopPropagation(); const on = !get(); closePops(id); set(on); $(id).setAttribute('aria-expanded', String(on)); });
  for (const id of ['hour-pop', 'view-menu', 'menu-more']) $(id).addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => closePops());
  canvas.addEventListener('pointerdown', () => closePops());
  for (const b of document.querySelectorAll('#menu-more button')) b.addEventListener('click', () => closePops());

  // ---------- messages : annonce brève, conseil de prise en main
  function toast(text, ms = 3200) { const t = $('toast'); t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms); }
  const told = store.get('hints', {});
  function hint(kind) {
    if (told[kind] || app.shot) return;
    const text = { orbit: touch ? 'Un doigt pour se déplacer · deux doigts pour pivoter et zoomer · toucher deux fois une rue pour y descendre' : 'Glisser pour se déplacer · clic droit pour pivoter · molette pour zoomer · double-clic sur une rue pour y descendre' }[kind];
    if (!text) return;
    told[kind] = 1; store.set('hints', told);
    $('hint').textContent = text; $('hint').hidden = false; hintTimer = 14;
  }

  // ---------- heure : curseur, moments de la journée, journée en accéléré
  const hour = $('hour');
  function setHour(h, fromSlider) { app.setHour(h); $('hour-label').textContent = fmtHour(h); if (!fromSlider) hour.value = String(h); queueHash(); }
  function stopHourPlay() { if (!hourPlay) return; hourPlay = false; app.shadowEvery = 0; app.qualityHold = false; $('hour-play').setAttribute('aria-pressed', 'false'); setHour(Math.round(app.sky.hour * 4) / 4); }
  hour.addEventListener('input', () => { stopHourPlay(); setHour(parseFloat(hour.value), true); });
  $('hour-play').addEventListener('click', () => { if (hourPlay) { stopHourPlay(); return; } hourPlay = true; app.shadowEvery = 0.3; app.qualityHold = true; $('hour-play').setAttribute('aria-pressed', 'true'); });
  for (const b of document.querySelectorAll('#hour-presets button')) b.addEventListener('click', () => { stopHourPlay(); setHour(parseFloat(b.dataset.hour)); });

  // ---------- affichage : noms, habitants, mini-plan, degré de certitude
  $('toggle-names').addEventListener('change', (e) => { namesOn = e.target.checked; });
  $('toggle-people').addEventListener('change', (e) => { if (app.people) app.people.enabled = e.target.checked; });
  function setMap(on, keep) { body.classList.toggle('no-map', !on); $('toggle-map').checked = on; if (keep) store.set('map', on); if (mini) mini.sig = ''; }
  $('toggle-map').addEventListener('change', (e) => setMap(e.target.checked, true));
  const ll = $('legend-list');
  for (const k of [2, 3, 4, 5]) { const li = el('li'); const sw = el('i'); sw.style.setProperty('--c', CERT[k].css); li.append(sw, CERT[k].name); ll.appendChild(li); }
  function setCert(on) { if (app.cert) app.cert.set(on); $('toggle-cert').checked = !!on; $('legend').hidden = !on; body.classList.toggle('cert', !!on); }
  $('toggle-cert').addEventListener('change', (e) => { setCert(e.target.checked); closePops(); });
  $('legend-more').addEventListener('click', () => openSources('method'));

  // ---------- modes
  function setMode(m, keep) {
    for (const [id, k] of [['mode-fly', 'fly'], ['mode-tour', 'tour'], ['mode-walk', 'walk']]) $(id).setAttribute('aria-pressed', String(k === m));
    if (m !== 'tour' && tour && !keep) stopTour();
    if (m !== 'walk' && (rig.mode === 'walk' || pendingWalk)) stopWalk();
  }
  $('mode-fly').addEventListener('click', () => { stopTour(); stopWalk(); setMode('fly'); });
  $('mode-tour').addEventListener('click', () => openTours());
  $('mode-walk').addEventListener('click', () => { if (rig.mode === 'walk') return; startWalk(selected || byId.get('notre-dame')); });

  // ---------- parcours commentés
  const tl = $('tours-list');
  function openTours() {
    tl.textContent = '';
    for (const d of TOURS) {
      const b = el('button', carnet.tours.has(d.id) ? 'done' : null); b.type = 'button';
      b.append(el('b', null, d.title), el('span', null, d.sub), el('small', null, `${d.stops.length} étapes · ${Math.round((d.stops.length * 17) / 60)} min environ`));
      b.addEventListener('click', () => { $('tours').hidden = true; startTour(d.id); });
      tl.appendChild(b);
    }
    openModal('tours');
  }
  function stopAt(def, i) { const s = def.stops[i], p = s[0] && byId.get(s[0]); return { p, x: p ? p.x : s[1], z: p ? p.z : s[2], dist: s[3], az: s[4], el: s[5], h: s[6], text: s[7] }; }
  function showStop(i) {
    const def = tour.def, n = def.stops.length; tour.idx = ((i % n) + n) % n;
    const s = stopAt(def, tour.idx);
    select(s.p || null, false, { quiet: true });
    $('card').hidden = true;
    rig.flyTo({ x: s.x, z: s.z, dist: s.dist, az: s.az, el: s.el }, 4.2);
    stopHourPlay(); setHour(s.h);
    $('tour-place').textContent = s.p ? s.p.name : ''; $('tour-place').hidden = !s.p;
    $('tour-text').textContent = s.text; $('tour-count').textContent = `${tour.idx + 1} / ${n}`;
    $('tour-enter').hidden = !(s.p && s.p.hasIn); $('tour-card').hidden = !s.p;
    [...$('tour-dots').children].forEach((b, k) => { b.classList.toggle('done', k < tour.idx); if (k === tour.idx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    tour.timer = 13;
    if (s.p) mark(s.p);
    if (tour.idx === n - 1 && !carnet.tours.has(def.id)) { carnet.tours.add(def.id); store.set('tours', [...carnet.tours]); }
    if (mini) { mini.routeIdx = tour.idx; mini.sig = ''; }
  }
  function setPlaying(on) { if (!tour) return; tour.playing = on; const b = $('tour-play'); b.textContent = on ? 'Pause' : 'Reprendre'; b.setAttribute('aria-pressed', String(on)); if (on) tour.timer = Math.min(tour.timer, 6); }
  function pauseTour() { if (tour && tour.playing) setPlaying(false); }
  function startTour(id, at = 0) {
    const def = TOURS.find((d) => d.id === id) || TOURS[0];
    if (app.inside) leaveInterior();
    stopWalk(); closePops(); closeFrise();
    tour = { def, idx: 0, timer: 13, playing: true };
    $('tour-title').textContent = def.title;
    const dots = $('tour-dots'); dots.textContent = '';
    def.stops.forEach((s, k) => { const b = el('button'); b.type = 'button'; const p = s[0] && byId.get(s[0]); b.title = `${k + 1}. ${p ? p.name : 'Vue d’ensemble'}`; b.setAttribute('aria-label', b.title); b.addEventListener('click', () => showStop(k)); dots.appendChild(b); });
    $('tour').hidden = false; $('hint').hidden = true;
    setMode('tour', true); setPlaying(true);
    if (mini) mini.route = def.stops.map((s, k) => { const q = stopAt(def, k); return [q.x, q.z]; });
    showStop(at);
  }
  function stopTour() {
    if (!tour) return;
    tour = null; $('tour').hidden = true;
    $('mode-tour').setAttribute('aria-pressed', 'false'); $('mode-fly').setAttribute('aria-pressed', String(rig.mode !== 'walk'));
    if (mini) { mini.route = null; mini.routeIdx = -1; mini.sig = ''; }
  }
  $('tour-next').addEventListener('click', () => showStop(tour.idx + 1));
  $('tour-prev').addEventListener('click', () => showStop(tour.idx - 1));
  $('tour-play').addEventListener('click', () => setPlaying(!tour.playing));
  $('tour-stop').addEventListener('click', stopTour);
  $('tour-card').addEventListener('click', () => { if (selected) { pauseTour(); openCard(selected); } });
  $('tour-enter').addEventListener('click', () => selected && enterInterior(selected));
  rig.onUserInput = () => { pauseTour(); welcomeSpin = false; if (hintTimer > 4) hintTimer = 4; };      // l'utilisateur reprend la main : on n'enchaîne plus tout seul

  // ---------- marche à pied
  // Point de départ : un endroit dégagé d'où l'on voit le monument, plutôt que le pied de son mur.
  function vantage(p) {
    const R = p.rad || 30, solid = app.solid, open0 = clearAt(p.x, p.z, 3);
    const d0 = open0 ? Math.max(10, R * 0.35) : R * 0.8 + 6, ideal = open0 ? Math.max(18, R * 0.5) : R + 26;
    const west = p.cat === 'Églises et abbayes' || p.id === 'notre-dame' || p.id === 'sainte-chapelle' ? 16 : 0;      // les églises sont orientées : on les aborde par la façade, à l'ouest
    let best = null, bs = -1e9;
    for (let k = 0; k < 12; k++) {
      const d = d0 + k * 8;
      for (let j = 0; j < 32; j++) {
        const a = (j / 32) * 6.283 + k * 0.07, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
        if (!clearAt(x, z, 1.6)) continue;
        let open = 0;
        for (let m = 0; m < 12; m++) { const cb = Math.cos(m * 0.5236), sb = Math.sin(m * 0.5236); if (app.walkable(x + cb * 5, z + sb * 5)) open++; if (app.walkable(x + cb * 11, z + sb * 11)) open++; }
        const ux = (p.x - x) / d, uz = (p.z - z) / d;
        let free = 0; for (let t = 1.5; t < d; t += 1.5) { if (solid.get(x + ux * t, z + uz * t)) break; free = t; }
        let trees = app.treeNear(x, z) ? 2 : 0; for (let t = 6; t <= Math.min(free, 30); t += 6) if (app.treeNear(x + ux * t, z + uz * t)) trees++;       // pas de tronc sous le nez ni dans l'axe du regard
        const los = d - free <= R * 1.2 + 3 ? 1 : 0;       // le premier obstacle est le monument lui-même
        const score = los * 30 + open * 1.1 + Math.min(free, 40) * 0.6 - Math.abs(d - ideal) * 0.25 + west * Math.max(0, -Math.cos(a)) - trees * 9;     // du recul devant la façade
        if (score > bs) { bs = score; best = [x, z, d, free]; }
      }
    }
    if (!best) { const q = nearestClear(p.x, p.z, 200) || [p.x, p.z]; best = [q[0], q[1], Math.hypot(q[0] - p.x, q[1] - p.z) || 1, 10]; }
    const [x, z, , free] = best;
    return { x, z, yaw: Math.atan2(x - p.x, z - p.z), pitch: open0 ? -0.02 : clamp(Math.atan2((p.y - p.y0) * 0.8, Math.max(8, free)) - 0.3, -0.02, 0.28) };     // lever les yeux juste assez pour voir le faîte
  }
  function walkUI(on) {
    body.classList.toggle('walking', on); $('walkhud').hidden = !on;
    if (on) {
      friseInfo(false);                                    // à hauteur d'homme, la frise suffit : le panneau de l'époque se replie
      $('hint').textContent = touch ? 'Pouce gauche pour marcher · pouce droit pour regarder · toucher le sol pour avancer' : 'Glisser pour regarder · cliquer sur le sol pour avancer · flèches ou Z Q S D pour marcher, Maj pour courir · Échap pour remonter';
      $('hint').hidden = !!app.shot; hintTimer = 11; $('card').hidden = true;
      for (const [id, k] of [['mode-fly', 'fly'], ['mode-tour', 'tour'], ['mode-walk', 'walk']]) $(id).setAttribute('aria-pressed', String(k === 'walk'));
    } else { $('prompt').hidden = true; $('hint').hidden = true; nearPlace = null; ring.visible = false; }
    if (mini) { mini.sig = ''; $('map-zoom').textContent = zoomLabel(); }
    whereTimer = 0; queueHash();
  }
  // Descend à pied en (x, z). Depuis le survol, la caméra plonge jusqu'à hauteur d'homme ; déjà à pied, on remonte d'abord.
  function goWalk(x, z, yaw, pitch = -0.02, o = {}) {
    if (app.inside) leaveInterior();
    stopTour(); stopHourPlay(); closePops();
    walkGoal = o.place || null;
    const enter = () => { pendingWalk = false; pendingFly = null; rig.enterWalk(x, z, yaw, pitch); walkUI(true); };
    if (o.instant ?? (calm || app.shot)) { enter(); return; }
    if (rig.mode === 'walk') rig.exitWalk();
    pendingWalk = true; walkUI(true);
    const reach = 14, el0 = 0.12;                        // la caméra finit là où seront les yeux du promeneur
    rig.flyTo({ x: x - Math.sin(yaw) * reach, z: z - Math.cos(yaw) * reach, dist: reach, az: rig.cur.az + wrapPi(yaw - rig.cur.az), el: el0 }, 2.1, () => { if (pendingWalk) enter(); });
    pendingFly = rig.fly;
  }
  // La descente a été interrompue (geste de l'utilisateur, autre déplacement) : on reste en survol.
  function cancelPending() {
    if (!pendingWalk) return;
    pendingWalk = false; if (rig.fly === pendingFly) rig.fly = null; pendingFly = null;
    walkUI(false); $('mode-walk').setAttribute('aria-pressed', 'false'); $('mode-fly').setAttribute('aria-pressed', String(!tour));
  }
  function startWalk(p, o) { const v = vantage(p); goWalk(v.x, v.z, v.yaw, v.pitch, { ...o, place: p }); }
  function stopWalk() {
    if (app.inside) leaveInterior();
    if (pendingWalk) { cancelPending(); return; }
    if (rig.mode !== 'walk') return;
    rig.exitWalk(); walkUI(false);
    $('mode-walk').setAttribute('aria-pressed', 'false'); $('mode-fly').setAttribute('aria-pressed', 'true');
  }
  $('walk-exit').addEventListener('click', stopWalk);
  function toggleLook() { if (rig.mode !== 'walk' || app.inside || touch) return; if (document.pointerLockElement === canvas) document.exitPointerLock(); else if (canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* refusé : on garde le glisser pour regarder */ } } }
  $('walk-look').addEventListener('click', toggleLook);
  document.addEventListener('pointerlockchange', () => { const on = document.pointerLockElement === canvas; $('walk-look').setAttribute('aria-pressed', String(on)); body.classList.toggle('locked', on); });
  $('prompt-enter').addEventListener('click', () => nearPlace && enterInterior(nearPlace));
  $('prompt-card').addEventListener('click', () => nearPlace && openCard(nearPlace));
  // devant un monument : proposer d'y entrer ou d'en lire la fiche
  function updatePrompt() {
    // le lieu que l'on est venu voir se propose dès le point d'arrivée ; les autres, quand on passe à leur pied
    const w = rig.walk, edge = (p) => Math.hypot(p.x - w.x, p.z - w.z) - (p.rad || 28), lim = (p) => (p === walkGoal ? 85 : 38) + (p === nearPlace ? 12 : 0);
    let best = null, bd = 1e9;
    for (const p of places) { const d = edge(p); if (d < bd && d < lim(p)) { bd = d; best = p; } }
    const p = walkGoal && edge(walkGoal) < lim(walkGoal) && bd > 6 ? walkGoal : best;
    if (p === nearPlace) return;
    nearPlace = p; $('prompt').hidden = !p;
    if (!p) return;
    const t = $('prompt-text'); t.textContent = ''; t.append(p.name, el('small', null, p.date));
    const pe = $('prompt-enter'); pe.hidden = !p.hasIn; pe.textContent = ''; pe.append('Entrer'); $('prompt-card').textContent = ''; $('prompt-card').append('Fiche');
    if (!touch) { pe.append(' ', el('kbd', null, 'E')); $('prompt-card').append(' ', el('kbd', null, 'F')); }
    mark(p);
  }

  // ---------- repères : « où suis-je », boussole, vue d'ensemble, mini-plan
  const where = makeLocator(app);
  function updateWhere() {
    const walking = rig.mode === 'walk' && !app.inside, we = $('where');
    if (!walking && rig.cur.dist > 1100) { if (!we.hidden) { we.hidden = true; $('brand-sub').hidden = false; } return; }
    const x = walking ? rig.walk.x : rig.cur.x, z = walking ? rig.walk.z : rig.cur.z, r = where(x, z);
    const tail = r.street || (r.near ? `près de ${r.near}` : '');
    const key = r.region + '|' + tail;
    if (we.dataset.k !== key) { we.dataset.k = key; we.textContent = ''; we.append(el('b', null, r.region)); if (tail) we.append(' · ' + tail); we.title = we.textContent; }
    if (we.hidden) { we.hidden = false; $('brand-sub').hidden = true; }
  }
  const rose = $('compass-rose');
  let roseDeg = null;
  $('compass').addEventListener('click', () => { if (rig.mode === 'walk') rig.walk.yawGoal = 0; else { pauseTour(); rig.flyTo({ x: rig.cur.x, z: rig.cur.z, az: 0 }, 0.9); } });
  function goHome() { if (app.inside) leaveInterior(); stopWalk(); stopTour(); rig.flyTo(HOME, 2.2); setMode('fly', true); }
  $('btn-home').addEventListener('click', goHome);
  mini = new MiniMap(app, $('minimap'));
  mini.selected = selected;
  mini.onGo = (x, z, drag) => {
    if (rig.mode === 'walk' || pendingWalk) { if (drag) return; const q = nearestClear(x, z, 80); if (q) goWalk(q[0], q[1], rig.walk.yaw || 0); else toast('Ce point n’est pas accessible à pied.'); return; }
    pauseTour();
    if (drag) { rig.fly = null; rig.goal.x = x; rig.goal.z = z; } else rig.flyTo({ x, z, dist: Math.min(rig.cur.dist, 700) }, 1.4);
  };
  // le bouton annonce l'échelle suivante : ville entière → (agglomération, avec un calque d'époque) → quartier
  const zoomLabel = () => { const z = mini.zoom[mini.mode()]; return z === 'local' ? 'Ville entière' : z === 'city' && mini.epoch ? 'Agglomération' : 'Quartier'; };
  $('map-zoom').addEventListener('click', () => { mini.toggleZoom(); $('map-zoom').textContent = zoomLabel(); });
  setMap(store.get('map', window.innerWidth > 900));

  // ---------- calque temporel : la frise des époques
  const epochs = (app.epochs = new Epochs(app));
  const LEG = { U: ['', '#e8d0a0'], I: ['', 'rgba(232,208,160,0.5)'], R: ['o', '#f4ecd8'], mur: ['l', '#f0c860'], ancien: ['d', '#f0c860'], egl: ['p', '#c7a3f5'], eau: ['', '#568cc4'], vol: ['', '#ece4d0'], rue: ['l', '#ff9a6a'], mon: ['', '#ff9a6a'], or: ['', '#dcb866'], pt: ['s', '#b9c4d8'] };
  const jl = $('frise-jalons');
  for (const j of JALONS) { const b = el('button', j.base ? 'base' : null, j.label); b.type = 'button'; b.dataset.id = j.id; b.title = j.titre; b.setAttribute('aria-pressed', String(!!j.base)); b.addEventListener('click', () => { stopEpochPlay(); setEpoch(j.id); }); jl.appendChild(b); }
  function setEpoch(id) {
    const j = epochs.set(id), s = epochStats(j), nf = (n) => n.toLocaleString('fr-FR');
    for (const b of jl.children) b.setAttribute('aria-pressed', String(b.dataset.id === j.id));
    const act = jl.querySelector('[aria-pressed="true"]');               // sur petit écran la frise défile : la date choisie reste en vue
    if (act && jl.scrollWidth > jl.clientWidth) jl.scrollLeft += act.getBoundingClientRect().left - jl.getBoundingClientRect().left - (jl.clientWidth - act.offsetWidth) / 2;
    // à pied, un volume du calque peut surgir autour du promeneur : on le repose au plus près, dans la rue
    if (rig.mode === 'walk' && !app.inside && epochs.inside(rig.walk.x, rig.walk.z)) { epochs.loose = false; const q = nearestClear(rig.walk.x, rig.walk.z, 220); if (q) { rig.walk.x = q[0]; rig.walk.z = q[1]; rig.walkTo = null; } }
    const typo = (t) => t.replace(/ ([:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');      // pas de ponctuation double rejetée en début de ligne
    $('epoch-label').textContent = j.label; $('frise-title').textContent = j.titre; $('frise-text').textContent = typo(j.texte);
    // titre de la page : la maquette reste celle de 1380, le calque le rappelle
    const h1 = document.querySelector('#brand h1'); h1.firstChild.nodeValue = j.lutece ? '' : 'Paris '; h1.querySelector('span').textContent = j.label;
    $('brand-sub').textContent = j.base ? 'Maquette restituée d’après le plan ALPAGE-CNRS' : 'Calque d’époque sur la maquette de 1380';
    body.classList.toggle('epoch', !j.base);
    const leg = $('frise-legend'); leg.textContent = '';
    const item = (k, text) => { const li = el('li'), sw = el('i', LEG[k][0] || null); sw.style.setProperty('--c', LEG[k][1]); li.append(sw, text); leg.appendChild(li); };
    if (j.ilots) {
      if (s.densite === 'plan') { item('U', 'îlots urbains'); item('I', 'intermédiaires'); item('R', 'ruraux (densité figurée par le plan)'); }
      else if (s.densite === 'dans') { item('U', 'îlots dans les murs'); item('I', 'îlots hors les murs'); }
      else { item('U', 'îlots de moins de 3 ha'); item('I', 'de 3 à 9 ha'); item('R', 'au-delà (la taille tient lieu de densité)'); }
    }
    if (j.lutece) { item('rue', 'rues restituées'); item('mon', 'monuments'); item('eau', 'rivages antiques'); }
    if (!j.base) {
      if (s.enceintes.length) item('mur', 'enceinte debout');
      if (EPOQUES.enceintes.some((w) => j.an >= w.jusqu)) item('ancien', 'ancien tracé');
      if (j.egl) item('egl', 'établissements religieux');
      if (j.eau) item('eau', 'la Seine à cette date');
      if (j.ilots && !j.passe) item('vol', 'en volume : bâti après 1380');
      if (j.futur) item('or', 'édifices et enceintes postérieurs');
      if (j.passe) item('pt', 'en pointillé : pas encore bâti');
    }
    const st = $('frise-stats'); st.textContent = '';
    const bits = [];
    if (s.ilots) bits.push([nf(s.ilots), ' îlots' + (s.haUrbain ? `, dont ${nf(s.haUrbain)} ha d’îlots urbains` : '')]);
    if (s.rues) bits.push([String(s.rues), ' rues restituées, 5 monuments situés']);
    if (s.eglises) bits.push([nf(s.eglises), ` établissements religieux, dont ${nf(s.couvents)} couvents`]);
    if (s.enceintes.length) bits.push(['', s.enceintes.join(', ').replace(/^E/, 'e').replace(/, E/g, ', e').replace(/, M/g, ', m').replace(/^M/, 'm')]);
    bits.forEach(([n, t], i) => { if (i) st.append(' · '); if (n) st.append(el('b', null, n)); st.append(i === 0 && !n ? t.charAt(0).toUpperCase() + t.slice(1) : t); });
    $('frise-credit').textContent = j.base ? '' : [s.source, s.credit, 'licence ODbL'].filter(Boolean).join(' — ');
    $('frise-wide').hidden = !!j.base; $('frise-src').hidden = !!j.base;
    if (j.base) { const li = el('li'); li.textContent = 'Choisissez une date sur la frise : la maquette reste celle de 1380, l’autre époque vient s’y superposer.'; leg.appendChild(li); }
    mini.setEpoch(j.base ? null : { id: j.id, city: epochs.city, wide: epochs.wide, rectCity: epochs.rectCity, rectWide: epochs.rectWide }, !!j.ilots && !j.passe);
    $('map-zoom').textContent = zoomLabel();
    queueHash();
    return j;
  }
  function stopEpochPlay() { epochPlay = 0; $('frise-play').setAttribute('aria-pressed', 'false'); }
  // La frise tient en bas ; le panneau de l'époque (texte, légende, chiffres, sources) se range à gauche.
  function friseInfo(on) { $('frise-info').hidden = !on; $('frise-more').setAttribute('aria-expanded', String(on)); }
  function openFrise(on) {
    $('frise').hidden = !on; $('btn-epoch').setAttribute('aria-expanded', String(on));
    if (on) { closePops(); pauseTour(); $('hint').hidden = true; setEpoch(epochs.current.id); friseInfo(!small() && rig.mode !== 'walk' && !pendingWalk); } else friseInfo(false);
  }
  // Fermer la frise retire le calque : la maquette redevient celle de 1380.
  function closeFrise() { stopEpochPlay(); if (!epochs.current.base) setEpoch('1380'); openFrise(false); }
  $('btn-epoch').addEventListener('click', () => { if ($('frise').hidden) openFrise(true); else closeFrise(); });
  $('frise-less').addEventListener('click', () => friseInfo(false));
  $('frise-more').addEventListener('click', () => friseInfo($('frise-info').hidden));
  $('frise-play').addEventListener('click', () => { if (epochPlay > 0) { stopEpochPlay(); return; } setEpoch(JALONS[0].id); epochPlay = 3.4; $('frise-play').setAttribute('aria-pressed', 'true'); wideView(); });
  // Vue d'ensemble adaptée à l'époque : le centre pour Lutèce et 1300, l'agglomération ensuite.
  function wideView() { const j = epochs.current; if (rig.mode === 'walk' || pendingWalk) stopWalk(); pauseTour(); rig.flyTo(j.ilots && !j.passe ? { x: -350, z: -250, dist: 6600, az: -0.3, el: 0.92 } : j.lutece ? { x: -380, z: 380, dist: 2300, az: -0.3, el: 0.95 } : { x: -80, z: -160, dist: 2700, az: -0.3, el: 0.95 }, 2.2); setMode('fly', true); }
  $('frise-wide').addEventListener('click', wideView);
  $('frise-src').addEventListener('click', () => openSources('sources-alpage-title'));
  {                                                       // panneau « Sources » : les couches du calque et leurs auteurs
    const ul = $('sources-alpage'), row = (title, credit) => { const li = el('li'); li.append(el('b', null, title + ' : '), credit); ul.appendChild(li); };
    row('Enceintes antique, médiévales et modernes', '© ALPAGE : ' + [...new Set(EPOQUES.enceintes.flatMap((w) => w.auteurs.split(', ')))].join(', '));
    for (const y of Object.keys(EPOQUES.ilots)) row(EPOQUES.ilots[y].titre, EPOQUES.ilots[y].credit);
    row('Lutèce', EPOQUES.lutece.credit); row('Édifices et voies postérieurs à 1380', EPOQUES.futur.credit);
    row('Établissements ecclésiastiques de 816 à 1790', EPOQUES.eglises.credit);
    for (const y of Object.keys(EPOQUES.eau)) row('Hydrographie ' + (y === '1791' ? 'de 1785-1791' : 'de 1810-1836'), EPOQUES.eau[y].credit);
  }

  // ---------- lien partageable : l'adresse suit la vue, « Partager » la copie
  function currentState() {
    const s = { h: app.sky.hour };
    if (app.inside && app.interiors.active) s.in = app.interiors.active.id;
    else if (rig.mode === 'walk') s.w = [rig.walk.x, rig.walk.z, wrapPi(rig.walk.yaw)];
    else { const c = rig.fly ? rig.fly.to : rig.cur; s.c = [c.x, c.z, c.dist, wrapPi(c.az), c.el]; }
    if (selected && !$('card').hidden) s.p = selected.id;
    if (!epochs.current.base) s.e = epochs.current.id;
    return s;
  }
  function queueHash() { hashTimer = 0.8; }
  function writeHash() { if (app.shot || welcomeSpin) return; try { history.replaceState(null, '', makeHash(currentState())); } catch (e) { /* adresse non modifiable (page intégrée) */ } }
  async function share() {
    const url = location.href.split('#')[0] + makeHash(currentState());
    let ok = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(url); ok = true; } } catch (e) { ok = false; }
    if (!ok) { const ta = el('textarea'); ta.value = url; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0'; body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (e) { ok = false; } ta.remove(); }
    toast(ok ? 'Lien copié : il rouvrira la maquette sur cette vue.' : 'Copie impossible ici : l’adresse de la page mène déjà à cette vue.', 4200);
    writeHash();
  }
  $('btn-share').addEventListener('click', share);
  function applyState(s) {
    let used = false;
    if (s.h != null) { setHour(s.h); used = true; }
    if (s.c) { rig.goal = { x: clamp(s.c[0], -6500, 6500), z: clamp(s.c[1], -6500, 6500), dist: clamp(s.c[2], 18, 9500), az: s.c[3], el: clamp(s.c[4], 0.035, 1.5) }; rig.cur = { ...rig.goal }; rig.fly = null; used = true; }
    const p = s.p && byId.get(s.p);
    if (p) { select(p, !s.c && !s.w); used = true; }
    if (s.w && app.walkable(s.w[0], s.w[1])) { goWalk(s.w[0], s.w[1], s.w[2], -0.02, { instant: true }); used = true; }
    const pi = s.in && byId.get(s.in);
    if (pi && pi.hasIn) { select(pi, false, { quiet: true }); rig.goal = { x: pi.x, z: pi.z, dist: pi.dist, az: rig.cur.az, el: 0.42 }; rig.cur = { ...rig.goal }; rig.fly = null; rig.update(0); enterInterior(pi); used = true; }
    if (s.t && TOURS.some((d) => d.id === s.t)) { startTour(s.t); used = true; }
    if (s.e && JALONS.some((j) => j.id === s.e && !j.base)) { openFrise(true); setEpoch(s.e); used = true; }
    return used;
  }

  // ---------- accueil : trois portes sur la ville qui tourne lentement
  function showWelcome() { closePops(); for (const m of document.querySelectorAll('.modal')) m.hidden = true; if (app.inside) leaveInterior(); stopWalk(); stopTour(); $('welcome').hidden = false; body.classList.remove('ready'); body.classList.add('welcome'); welcomeSpin = true; }
  function endWelcome(mode) {
    $('welcome').hidden = true; body.classList.remove('welcome'); body.classList.add('ready'); welcomeSpin = false;
    if (mode === 'tour') openTours(); else if (mode === 'walk') startWalk(byId.get('notre-dame')); else hint('orbit');
  }
  for (const b of document.querySelectorAll('#welcome .door')) b.addEventListener('click', () => endWelcome(b.dataset.start));
  $('help-welcome').addEventListener('click', showWelcome);

  // ---------- clavier
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      for (const m of document.querySelectorAll('.modal')) if (!m.hidden) { m.hidden = true; return; }
      if (pops.some(([, get]) => get())) { closePops(); return; }
      if (body.classList.contains('welcome')) { endWelcome('fly'); return; }
      if (app.inside) { leaveInterior(); return; }
      if (rig.mode === 'walk' && !$('card').hidden) { closeCard(); return; }       // à pied : Échap referme d'abord la fiche
      if ((rig.mode === 'walk' && !document.pointerLockElement) || pendingWalk) { stopWalk(); return; }
      if (!$('places').hidden) { togglePlaces(false); return; }
      if (!$('card').hidden) { closeCard(); return; }
      if (!$('frise').hidden) closeFrise();
      return;
    }
    if ((e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) || e.ctrlKey || e.metaKey || e.altKey || !body.classList.contains('ready')) return;
    if ([...document.querySelectorAll('.modal')].some((m) => !m.hidden)) return;
    if (e.key === '/') { e.preventDefault(); togglePlaces(true); $('place-search').focus(); $('place-search').select(); return; }
    if (app.inside) return;
    if (rig.mode === 'walk') {
      if (e.code === 'KeyE' && nearPlace && nearPlace.hasIn) enterInterior(nearPlace);
      else if (e.code === 'KeyF' && nearPlace) openCard(nearPlace);
      else if (e.code === 'KeyV') toggleLook();
      else if (e.code === 'KeyN') rig.walk.yawGoal = 0;
      else if (e.code === 'KeyT') { if ($('frise').hidden) openFrise(true); else closeFrise(); }
      return;
    }
    if (e.code === 'KeyT') { if ($('frise').hidden) openFrise(true); else closeFrise(); return; }
    if (e.code === 'KeyN') $('compass').click();
    else if (e.code === 'KeyO' || e.code === 'Home') goHome();
    else if (e.code === 'KeyM') setMap(body.classList.contains('no-map'), true);
  });

  app.on('frame', (dt) => {
    updateLabels();
    if (tour && tour.playing && !rig.fly && !app.inside) { tour.timer -= dt; if (tour.timer <= 0) { if (tour.idx >= tour.def.stops.length - 1) setPlaying(false); else showStop(tour.idx + 1); } }
    if (hourPlay && !app.inside) { let h = app.sky.hour + dt * 0.42; if (h > 22.5) h = 4.5; app.setHour(h); $('hour-label').textContent = fmtHour(Math.round(h * 4) / 4); hour.value = String(h); }
    if (pendingWalk && rig.fly !== pendingFly) cancelPending();
    if (welcomeSpin && !rig.fly) rig.goal.az += dt * 0.028;
    if (epochPlay > 0 && (epochPlay -= dt) <= 0) { const k = JALONS.indexOf(epochs.current); if (k >= JALONS.length - 1) stopEpochPlay(); else { setEpoch(JALONS[k + 1].id); epochPlay = 3.4; } }
    if (rig.mode === 'walk' && !app.inside) updatePrompt();
    if ((whereTimer -= dt) <= 0) { whereTimer = 0.4; updateWhere(); }
    if (hintTimer > 0 && (hintTimer -= dt) <= 0) $('hint').hidden = true;
    const deg = Math.round((((rig.mode === 'walk' ? rig.walk.yaw : rig.cur.az) * 180) / Math.PI) * 2) / 2;
    if (deg !== roseDeg) { roseDeg = deg; rose.setAttribute('transform', `rotate(${deg})`); }
    if (!body.classList.contains('no-map') && !app.inside) mini.draw();
    if (hashTimer > 0 && (hashTimer -= dt) <= 0) writeHash();
    else if (hashTimer <= 0 && !app.shot && !rig.fly && (rig.userMoved || rig.mode === 'walk')) { rig.userMoved = false; hashTimer = 1.2; }
  });

  app.ui = { select, openCard, closeCard, setHour, openTours, startTour, stopTour, startWalk, goWalk, stopWalk, openSources, updateLabels, places, byId, enterInterior, leaveInterior, pick, vantage, groundPoint, where, setCert, setMap, goHome, showWelcome, endWelcome, share, currentState, applyState, setEpoch, openFrise, closeFrise, epochs, link: () => makeHash(currentState()), openLink: (h) => applyState(parseHash(h)), tours: TOURS, mini, carnet, get tour() { return tour; }, get near() { return nearPlace; }, get pending() { return pendingWalk; } };
  setHour(10.5);
  updateCarnet();
  renderList();
  updateLabels();
  // arrivée : un lien partagé rouvre sa vue ; sinon l'accueil propose trois façons d'entrer
  const deep = app.shot ? false : applyState(parseHash(location.hash));
  if (app.shot || deep) body.classList.add('ready'); else showWelcome();
}
