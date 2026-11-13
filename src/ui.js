// Interface : étiquettes des lieux, fiches, liste, visite guidée, marche à pied, heure du jour, sources.
import * as THREE from 'three';
import { buildPlaces, CATS, TOUR } from './places.js';
import { SOURCES, SOURCE_GROUPS } from './sources.js';
import T from '../data/thumbs.json';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fmtHour = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${hh} h ${String(mm).padStart(2, '0')}`; };

export function initUI(app) {
  const places = buildPlaces(app);
  app.places = places;
  const byId = new Map(places.map((p) => [p.id, p]));
  const srcById = new Map(SOURCES.map((s) => [s.id, s]));
  let selected = null, hovered = null, tourIdx = -1, tourTimer = 0, namesOn = true;

  // ---------- étiquettes
  const layerEl = $('labels');
  for (const p of places) {
    const b = el('button', 'label p' + p.pri, p.name);
    b.type = 'button'; b.tabIndex = -1;
    b.addEventListener('click', (e) => { e.stopPropagation(); select(p, true); });
    layerEl.appendChild(b); p.el = b; p.v = new THREE.Vector3(p.x, p.y, p.z); p.shown = false;
  }
  const proj = new THREE.Vector3();
  function updateLabels() {
    if (!namesOn || app.rig.mode === 'walk') { if (layerEl.style.display !== 'none') layerEl.style.display = 'none'; return; }
    if (layerEl.style.display === 'none') layerEl.style.display = '';
    const w = layerEl.clientWidth, h = layerEl.clientHeight, cam = app.camera, dist = app.rig.cur.dist;
    const boxes = [];
    const rank = (p) => (p === selected ? -2 : p === hovered ? -1 : p.pri);
    const order = places.slice().sort((a, b) => rank(a) - rank(b));
    for (const p of order) {
      let show = p === selected || p === hovered || p.pri === 1 || (p.pri === 2 && dist < 1900) || (p.pri === 3 && dist < 850);
      if (show) {
        proj.copy(p.v).project(cam);
        const d = cam.position.distanceTo(p.v);
        if (proj.z > 1 || proj.z < -1 || d > (p.pri === 1 ? 7000 : p.pri === 2 ? 3200 : 1500)) show = false;
        else {
          const x = (proj.x * 0.5 + 0.5) * w, y = (-proj.y * 0.5 + 0.5) * h - 14;
          const bw = p.name.length * (p.pri === 1 ? 8.2 : 7) + 18, bh = 24;
          if (x < -40 || x > w + 40 || y < 30 || y > h - 40) show = false;
          else if (p !== selected && p !== hovered && boxes.some((q) => Math.abs(q[0] - x) < (q[2] + bw) / 2 && Math.abs(q[1] - y) < bh)) show = false;
          else { boxes.push([x, y, bw]); p.el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; }
        }
      }
      if (show !== p.shown) { p.el.style.display = show ? '' : 'none'; p.shown = show; }
    }
  }
  for (const p of places) p.el.style.display = 'none';

  // ---------- fiche
  function select(p, fly) {
    if (selected) selected.el.classList.remove('sel');
    selected = p;
    if (!p) { $('card').hidden = true; return; }
    p.el.classList.add('sel');
    $('card-cat').textContent = p.cat; $('card-name').textContent = p.name; $('card-date').textContent = p.date; $('card-text').textContent = p.text;
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
    $('card-enter').hidden = !(app.interiors && app.interiors.has(p));
    $('card').hidden = false;
    if (fly) flyTo(p);
  }
  function flyTo(p, o = {}) { app.rig.flyTo({ x: p.x, z: p.z, dist: o.dist ?? p.dist, el: o.el ?? 0.42, az: o.az }, o.time ?? 2.4); setMode('fly', true); }
  $('card-view').addEventListener('click', () => selected && flyTo(selected));
  $('card-walk').addEventListener('click', () => selected && startWalk(selected));
  $('card-enter').addEventListener('click', () => selected && enterInterior(selected));

  // ---------- visite intérieure
  const touchUI = matchMedia('(pointer: coarse)').matches;
  function enterInterior(p) {
    if (!app.interiors || !app.interiors.has(p)) return false;
    stopTour();
    if (!app.interiors.enter(p)) return false;
    const sp = app.interiors.spec(p);
    $('in-name').textContent = p.name; $('in-title').textContent = sp.title; $('in-text').textContent = sp.text;
    $('in-hint').textContent = touchUI ? 'Glissez pour regarder autour de vous, touchez le sol pour avancer.' : 'Glissez pour regarder autour de vous, cliquez sur le sol pour avancer. Flèches ou Z Q S D pour marcher, Échap pour sortir.';
    const box = $('in-spots'); box.textContent = '';
    (app.interiors.spots || []).forEach((s, i) => { const b = el('button', null, s[0]); b.type = 'button'; b.addEventListener('click', () => app.interiors.goSpot(i)); box.appendChild(b); });
    const small = window.innerWidth < 700;            // petit écran : notice repliée, la vue d'abord
    $('inhud').classList.toggle('less', small); $('in-less').textContent = small ? 'Lire la notice' : 'Réduire la notice'; $('inhud').hidden = false; document.body.classList.add('inside');
    return true;
  }
  function leaveInterior() {
    if (!app.inside) return;
    app.interiors.exit();
    $('inhud').hidden = true; document.body.classList.remove('inside');
  }
  $('in-exit').addEventListener('click', leaveInterior);
  $('in-less').addEventListener('click', () => { const less = $('inhud').classList.toggle('less'); $('in-less').textContent = less ? 'Lire la notice' : 'Réduire la notice'; });

  // ---------- désigner un monument dans la scène
  const pv = new THREE.Vector3();
  function pick(cx, cy) {
    if (app.rig.mode !== 'orbit' || app.inside) return null;
    const rc = app.renderer.domElement.getBoundingClientRect(), w = rc.width, h = rc.height, cam = app.camera, mx = cx - rc.left, my = cy - rc.top;
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
  {
    const cv = app.renderer.domElement; let down = null, mouse = null;
    cv.addEventListener('pointerdown', (e) => { down = e.button === 0 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; });
    cv.addEventListener('pointerup', (e) => { const d0 = down; down = null; if (!d0 || Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 6 || performance.now() - d0.t > 600) return; const p = pick(e.clientX, e.clientY); if (p) select(p, true); });
    cv.addEventListener('pointermove', (e) => { mouse = e.pointerType === 'mouse' && !e.buttons ? [e.clientX, e.clientY] : null; });
    cv.addEventListener('pointerleave', () => { mouse = null; });
    app.on('frame', () => { const p = mouse ? pick(mouse[0], mouse[1]) : null; if (p !== hovered) { hovered = p; if (!app.inside) cv.style.cursor = p ? 'pointer' : ''; } });
  }

  // ---------- liste des lieux
  const list = $('place-list');
  function renderList(filter = '') {
    list.textContent = '';
    const f = filter.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    for (const cat of CATS) {
      const items = places.filter((p) => p.cat === cat && (!f || p.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(f))).sort((a, b) => a.pri - b.pri || a.name.localeCompare(b.name, 'fr'));
      if (!items.length) continue;
      list.appendChild(el('h3', null, cat));
      for (const p of items) { const b = el('button', null, p.name); b.type = 'button'; b.addEventListener('click', () => { select(p, true); if (window.innerWidth < 700) togglePlaces(false); }); list.appendChild(b); }
    }
    if (!list.children.length) list.appendChild(el('p', 'group-note', 'Aucun lieu ne correspond à cette recherche.'));
  }
  renderList();
  $('place-search').addEventListener('input', (e) => renderList(e.target.value));
  function togglePlaces(on) { const a = $('places'); a.hidden = on == null ? !a.hidden : !on; $('btn-places').setAttribute('aria-expanded', String(!a.hidden)); }
  $('btn-places').addEventListener('click', () => togglePlaces());

  // ---------- sources
  const body = $('sources-body');
  for (const g of SOURCE_GROUPS) {
    body.appendChild(el('h3', null, g.title)); body.appendChild(el('p', 'group-note', g.note));
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
    body.appendChild(grid);
  }
  function openSources(id) { $('sources').hidden = false; if (id) { const c = $('src-' + id); if (c) { c.scrollIntoView({ block: 'center' }); c.style.outline = '1px solid var(--gold)'; setTimeout(() => (c.style.outline = ''), 2200); } } }
  $('btn-sources').addEventListener('click', () => openSources());
  $('btn-help').addEventListener('click', () => ($('help').hidden = false));
  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => { const id = b.dataset.close; if (id === 'card') select(null); else if (id === 'places') togglePlaces(false); else $(id).hidden = true; });
  for (const m of document.querySelectorAll('.modal')) m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; });

  // ---------- heure
  const hour = $('hour');
  function setHour(h, fromSlider) { app.setHour(h); $('hour-label').textContent = fmtHour(h); if (!fromSlider) hour.value = String(h); }
  hour.addEventListener('input', () => setHour(parseFloat(hour.value), true));
  $('toggle-names').addEventListener('change', (e) => { namesOn = e.target.checked; });
  $('toggle-people').addEventListener('change', (e) => { if (app.people) app.people.enabled = e.target.checked; });

  // ---------- modes
  function setMode(m, keep) {
    for (const [id, k] of [['mode-fly', 'fly'], ['mode-tour', 'tour'], ['mode-walk', 'walk']]) $(id).setAttribute('aria-pressed', String(k === m));
    if (m !== 'tour' && tourIdx >= 0 && !keep) stopTour();
    if (m !== 'walk' && app.rig.mode === 'walk') stopWalk();
  }
  $('mode-fly').addEventListener('click', () => { stopTour(); stopWalk(); setMode('fly'); });
  $('mode-tour').addEventListener('click', () => { stopWalk(); startTour(); });
  $('mode-walk').addEventListener('click', () => { stopTour(); startWalk(selected || byId.get('notre-dame')); });

  // ---------- visite guidée
  function showStop(i) {
    tourIdx = (i + TOUR.length) % TOUR.length;
    const [id, x, z, dist, az, elv, h, text] = TOUR[tourIdx], p = id && byId.get(id);
    select(p || null, false);
    app.rig.flyTo({ x: p ? p.x : x, z: p ? p.z : z, dist, az, el: elv }, 4.2);
    setHour(h);
    $('tour-text').textContent = text; $('tour-count').textContent = `${tourIdx + 1} / ${TOUR.length}`;
    tourTimer = 13;
  }
  function startTour() { $('tour').hidden = false; $('card').hidden = true; setMode('tour', true); showStop(0); }
  function stopTour() { if (tourIdx < 0) return; tourIdx = -1; $('tour').hidden = true; $('mode-tour').setAttribute('aria-pressed', 'false'); $('mode-fly').setAttribute('aria-pressed', 'true'); }
  $('tour-next').addEventListener('click', () => showStop(tourIdx + 1));
  $('tour-prev').addEventListener('click', () => showStop(tourIdx - 1));
  $('tour-stop').addEventListener('click', stopTour);
  app.rig.onUserInput = () => { tourTimer = 1e9; };      // l'utilisateur reprend la main : on n'enchaîne plus tout seul

  // ---------- marche à pied
  const canvas = app.renderer.domElement;
  const touch = matchMedia('(pointer: coarse)').matches;
  function startWalk(p) {
    // point praticable le plus proche du lieu choisi
    let best = null;
    for (let r = 0; r < 160 && !best; r += 3) for (let a = 0; a < 6.283 && !best; a += 0.35) { const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r; if (app.walkable(x, z) && app.walkable(x + 1.5, z) && app.walkable(x, z + 1.5) && app.walkable(x - 1.5, z) && app.walkable(x, z - 1.5)) best = [x, z]; }
    if (!best) best = [p.x, p.z];
    stopTour();
    app.rig.enterWalk(best[0], best[1], Math.atan2(best[0] - p.x, best[1] - p.z));
    document.body.classList.add('walking');
    $('walkhud').hidden = false;
    $('walk-hint').textContent = touch ? 'Pouce gauche : marcher. Pouce droit : regarder autour de soi.' : 'Cliquez dans la scène pour regarder à la souris. Flèches ou Z Q S D pour marcher, Maj pour courir, Échap pour sortir.';
    setMode('walk', true);
  }
  function stopWalk() {
    if (app.inside) leaveInterior();
    if (app.rig.mode !== 'walk') return;
    app.rig.exitWalk(); document.body.classList.remove('walking'); $('walkhud').hidden = true;
    $('mode-walk').setAttribute('aria-pressed', 'false'); $('mode-fly').setAttribute('aria-pressed', 'true');
  }
  $('walk-exit').addEventListener('click', stopWalk);
  canvas.addEventListener('click', () => { if (app.rig.mode === 'walk' && !app.inside && !touch && document.pointerLockElement !== canvas && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* refusé : on garde le glisser pour regarder */ } } });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const m of document.querySelectorAll('.modal')) if (!m.hidden) { m.hidden = true; return; }
    if (app.inside) { leaveInterior(); return; }
    if (app.rig.mode === 'walk' && !document.pointerLockElement) stopWalk();
  });

  app.on('frame', (dt) => {
    updateLabels();
    if (tourIdx >= 0 && !app.rig.fly) { tourTimer -= dt; if (tourTimer <= 0) showStop(tourIdx + 1); }
  });
  app.ui = { select, setHour, startTour, stopTour, startWalk, stopWalk, openSources, updateLabels, places, byId, enterInterior, leaveInterior, pick };
  setHour(10.5);
  updateLabels();
}
