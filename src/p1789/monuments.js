// Monuments de Paris en 1789. Les uns complètent une emprise que l'atlas donne déjà (tours de Notre-Dame, dômes,
// clochers des paroisses) ; les autres occupent un enclos que l'atlas nomme sans en détailler le bâti (Invalides,
// École militaire, Luxembourg, Saint-Sulpice, Val-de-Grâce, Observatoire, hôpitaux). Leur place et leur orientation
// viennent des données ; leurs dimensions, de ce que l'on sait de chaque édifice ; leur détail est une évocation.
import { RAW, bati, batiNom, enclos, bastille, rues, eglises } from './data.js';
import { hash, hex, ARDOISE, PLOMB, PIERRE, building } from './blocks.js';
import { cathedrale, gothique, clocher } from './eglises.js';
import { ccw, walls, cap, box, cyl, cone, disc, crenels, rectCorners, ringCircle } from '../builder.js';
import { polyArea, centroid, minAreaRect, pointInPoly } from '../geom.js';

const OR = hex(0xd8b85a), BRIQUE = hex(0xc89a80), VIEILLE = hex(0xcfc4a8), DALLE = hex(0xb4aa90);
let seq = 900000;

const frame = (cx, cz, dx, dz) => { const l = Math.hypot(dx, dz) || 1; return { cx, cz, ux: dx / l, uz: dz / l }; };
const at = (f, a, c) => [f.cx + f.ux * a - f.uz * c, f.cz + f.uz * a + f.ux * c];
const rect = (f, a, c, ha, hc) => { const p = at(f, a, c); return rectCorners({ cx: p[0], cz: p[1], ux: f.ux, uz: f.uz, hl: ha, hw: hc }); };
const span = (ring, f) => { let lo = 1e9, hi = -1e9; for (const p of ring) { const t = (p[0] - f.cx) * f.ux + (p[1] - f.cz) * f.uz; if (t < lo) lo = t; if (t > hi) hi = t; } return [lo, hi]; };

export function buildMonuments(app, B) {
  const T = app.terrain, M = (app.monuments = {}), reserve = (app.reserve = []);
  const ground = (x, z) => Math.max(T.height(x, z), 0.3);
  const enc = (nom) => { const l = enclos().filter((e) => e.nom === nom).sort((a, b) => Math.abs(polyArea(b.rings[0])) - Math.abs(polyArea(a.rings[0])))[0]; if (!l) return null; const ring = l.rings[0], c = centroid(ring); reserve.push(c); return { ring, c, r: minAreaRect(ring) }; };
  const rep = (nom) => { const r = RAW.reperes.find((q) => q[2] === nom); if (r) reserve.push([r[0], r[1]]); return r ? [r[0], r[1]] : null; };
  const note = (nom, x, z, top) => { M[nom] = { x, z, top }; };
  // ailes à travées (pierre, ardoise), nefs, tours, flèches, dômes
  const wing = (f, a, c, ha, hc, floors, col = PIERRE) => building(app, B, { outer: rect(f, a, c, ha, hc), holes: [] }, seq++, { kind: 'public', floors, col, roof: ARDOISE, mansard: true, area: 4 * ha * hc, reel: true });
  const nave = (f, a, c, ha, hc, h) => building(app, B, { outer: rect(f, a, c, ha, hc), holes: [] }, seq++, { kind: 'eglise', h, col: PIERRE, area: 4 * ha * hc, reel: true });
  const tower = (f, a, c, half, h, o = {}) => { const p = at(f, a, c), y0 = ground(p[0], p[1]), r = { cx: p[0], cz: p[1], ux: f.ux, uz: f.uz, hl: half, hw: o.hw ?? half }; box(B.at('stone', p[0], p[1]), r, (o.from ?? 0) ? y0 + o.from : y0 - 0.8, y0 + h, { col: o.col ?? PIERRE, s0: 0.8 }); if (!o.from) app.foot.push({ ring: rectCorners(r), top: y0 + h, reel: true }); return y0 + h; };
  const round = (x, z, r, h, o = {}) => { const y0 = ground(x, z), b = B.at('stone', x, z); cyl(b, x, z, r, y0 - 0.8, y0 + h, { seg: o.seg ?? 16, col: o.col ?? PIERRE, s0: 0.8 }); disc(b, x, z, r, y0 + h, { seg: o.seg ?? 16, col: o.col ?? PIERRE }); app.foot.push({ ring: ringCircle(x, z, r, 12), top: y0 + h, reel: true }); return y0 + h; };
  const spire = (x, z, r, y0, y1, seg = 8, col = ARDOISE, a0 = 0) => cone(B.at('roof', x, z), x, z, r, y0, y1, { seg, col, a0 });
  const dome = (x, z, r, yBase, hDrum, hDome, o = {}) => {
    const bs = B.at('stone', x, z), br = B.at('roof', x, z), n = 6, TOP = 1.45;
    cyl(bs, x, z, r, yBase, yBase + hDrum, { seg: 20, col: PIERRE, s0: 0.86 });
    for (let k = 0; k < n; k++) { const t0 = (k / n) * TOP, t1 = ((k + 1) / n) * TOP; cyl(br, x, z, r * 1.03 * Math.cos(t0), yBase + hDrum + (hDome * Math.sin(t0)) / Math.sin(TOP), yBase + hDrum + (hDome * Math.sin(t1)) / Math.sin(TOP), { seg: 20, r1: r * 1.03 * Math.cos(t1), col: o.col ?? PLOMB, s0: 0.92, s1: 1 }); }
    const yt = yBase + hDrum + hDome, rl = r * 0.22, hl = o.lantern ?? r * 0.6, hs = o.spire ?? r * 0.6;
    cyl(bs, x, z, rl, yt - 0.6, yt + hl, { seg: 10, col: PIERRE }); cone(br, x, z, rl * 1.3, yt + hl, yt + hl + hs, { seg: 10, col: o.tip ?? PLOMB });
    return yt + hl + hs;
  };
  // direction de la rue la plus proche : les portes et les barrières se placent en travers
  const streetDir = (x, z) => { let best = null, bd = 1e9; for (const r of rues()) for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), d = Math.hypot(a[0] + t * dx - x, a[1] + t * dz - z); if (d < bd) { bd = d; best = [dx, dz]; } } return best || [0, 1]; };
  const landmark = (nom) => { let best = null; bati().forEach((rings, i) => { if (batiNom(i) !== nom) return; const a = Math.abs(polyArea(rings[0])); if (!best || a > best.a) best = { a, ring: rings[0] }; }); return best ? { ring: best.ring, c: centroid(best.ring), r: minAreaRect(best.ring) } : null; };

  // ---- la Bastille : emprise restituée, dressée à hauteur de ses tours
  { const ring = bastille().map((r) => r[0]).sort((a, b) => Math.abs(polyArea(b)) - Math.abs(polyArea(a)))[0];
    if (ring) { const r = ccw(ring), c = centroid(r), y0 = ground(c[0], c[1]), top = y0 + 24, b = B.at('stone', c[0], c[1]);
      walls(b, r, y0 - 1, top, { col: VIEILLE }); cap(b, r, [], top - 1.3, { col: DALLE }); crenels(b, r, top, { closed: true, h: 1.3, w: 1.7, gap: 1.3, col: VIEILLE });
      app.foot.push({ ring: r, top, reel: true }); reserve.push(c); note('Bastille', c[0], c[1], top); } }

  // ---- Notre-Dame : la cathédrale entière sur l'emprise que donne l'atlas, sans la flèche de la croisée (démontée dès 1786)
  if (app.ndRing) { const nd = cathedrale(app, B, app.ndRing), c = centroid(app.ndRing); reserve.push(c); note('Notre-Dame', c[0], c[1], nd.top); }

  // ---- hôtel des Invalides : cour d'honneur, cours latérales, église des soldats, Dôme
  { const p = enc('Hôtel des Invalides'), e = enc('Esplanade des Invalides');
    if (p && e) { const f = frame(p.c[0], p.c[1], e.c[0] - p.c[0], e.c[1] - p.c[1]), aN = span(p.ring, f)[1] - 22;
      wing(f, aN - 8, 0, 8, 98, 4);
      for (const s of [1, -1]) { wing(f, aN - 67, 39 * s, 51, 7, 4); wing(f, aN - 76, 91 * s, 60, 7, 3); wing(f, aN - 71, 65 * s, 6, 19, 3); }
      wing(f, aN - 124, 0, 7, 98, 3);
      nave(f, aN - 165, 0, 34, 11, 21);
      const aD = aN - 228, d = at(f, aD, 0), y0 = ground(d[0], d[1]); nave(f, aD, 0, 29, 29, 27);
      const top = dome(d[0], d[1], 13.5, y0 + 30, 22, 28, { lantern: 10, spire: 16, tip: OR });
      note('Invalides', d[0], d[1], top); } }

  // ---- École militaire : le château face au Champ-de-Mars, la cour, les ailes
  { const p = enc('Champ de Mars, Ecole Militaire'), q = rep('École militaire');
    if (p && q) { const s = (q[0] - p.r.cx) * p.r.ux + (q[1] - p.r.cz) * p.r.uz > 0 ? 1 : -1, f = frame(p.r.cx, p.r.cz, p.r.ux * s, p.r.uz * s), aE = span(p.ring, f)[1];
      wing(f, aE - 300, 0, 9, 105, 3);
      const c = at(f, aE - 300, 0), top0 = tower(f, aE - 300, 0, 15, 27); spire(c[0], c[1], 21.5, top0, top0 + 17, 4, ARDOISE, Math.atan2(f.uz, f.ux) + Math.PI / 4);
      for (const k of [1, -1]) { wing(f, aE - 235, 72 * k, 56, 7, 3); wing(f, aE - 100, 95 * k, 60, 6, 2); }
      wing(f, aE - 172, 0, 7, 80, 3); wing(f, aE - 45, 0, 6, 100, 2);
      note('École militaire', c[0], c[1], top0 + 17); } }

  // ---- palais du Luxembourg : corps de logis sur le jardin, ailes, pavillon d'entrée à dôme
  { const p = enc('Palais de la Chambre des Pairs'), q = rep('Luxembourg');
    if (p && q) { const f = frame(q[0], q[1], q[0] - p.c[0], q[1] - p.c[1]);
      wing(f, -38, 0, 11, 47, 4); for (const k of [1, -1]) { wing(f, 5, 40 * k, 34, 7, 3); wing(f, 44, 40 * k, 9, 9, 4); wing(f, -38, 50 * k, 12, 8, 5); }
      wing(f, 44, 0, 5, 32, 2);
      const c = at(f, 44, 0), t0 = tower(f, 44, 0, 8, 21), top = dome(c[0], c[1], 6.5, t0, 4, 7);
      note('Luxembourg', q[0], q[1], top); } }

  // ---- Saint-Sulpice : la nef sur son enclos, les deux tours de la façade
  { const p = enc('Eglise Saint Sulpice'), pl = enc('Place Saint Sulpice');
    if (p) { const s = pl ? ((pl.c[0] - p.r.cx) * p.r.ux + (pl.c[1] - p.r.cz) * p.r.uz > 0 ? 1 : -1) : (p.r.ux < 0 ? 1 : -1), f = frame(p.r.cx, p.r.cz, p.r.ux * s, p.r.uz * s);
      building(app, B, { outer: p.ring, holes: [] }, seq++, { kind: 'eglise', h: 30, col: PIERRE, area: Math.abs(polyArea(p.ring)), reel: true });
      const a = p.r.hl - 9, c = Math.max(12, p.r.hw - 11), n = at(f, a, c)[1] < at(f, a, -c)[1] ? 1 : -1;       // la tour nord est la plus haute
      const top = tower(f, a, c * n, 7, 71); tower(f, a, -c * n, 7, 66);
      note('Saint-Sulpice', p.c[0], p.c[1], top); } }

  // ---- Val-de-Grâce : l'église à dôme sur la rue Saint-Jacques, le cloître au sud
  { const q = rep('Val-de-Grâce'); enc('Val-de-Grâce');
    if (q) { const f = frame(q[0], q[1], -1, 0), y0 = ground(q[0], q[1]);
      nave(f, 22, 0, 24, 10, 20);
      const d = at(f, 38, 0), top = dome(d[0], d[1], 8.5, y0 + 21, 6, 9, { lantern: 3, spire: 2.5 });
      wing(f, 34, -32, 30, 6, 3); wing(f, 34, -84, 30, 6, 3); wing(f, 58, -58, 6, 26, 3); wing(f, 10, -58, 6, 26, 3);
      note('Val-de-Grâce', d[0], d[1], top); } }

  // ---- Observatoire : le bloc de Perrault, ses deux tours octogonales au sud, sa tour carrée au nord
  { const p = enc('Observatoire');
    if (p) { const f = frame(p.c[0], p.c[1], 0, -1);
      const top = wing(f, 0, 0, 14, 15, 5);
      for (const k of [1, -1]) { const c = at(f, -12, 15 * k); round(c[0], c[1], 6, 22, { seg: 8 }); }
      tower(f, 17, 0, 5, 22);
      note('Observatoire', p.c[0], p.c[1], top); } }

  // ---- hôpital Saint-Louis : le quadrilatère de brique et de pierre, pavillons d'angle et d'axe
  { const p = enc('Hôpital Saint Louis');
    if (p) { const f = frame(p.r.cx, p.r.cz, p.r.ux, p.r.uz); let top = 0;
      for (const k of [1, -1]) { wing(f, 56 * k, 0, 5, 60, 2, BRIQUE); wing(f, 0, 56 * k, 60, 5, 2, BRIQUE); top = wing(f, 56 * k, 0, 7, 9, 3, BRIQUE); wing(f, 0, 56 * k, 9, 7, 3, BRIQUE); for (const m of [1, -1]) wing(f, 56 * k, 56 * m, 8, 8, 3, BRIQUE); }
      note('Hôpital Saint-Louis', p.r.cx, p.r.cz, top); } }

  // ---- hôpitaux et hospices dont l'atlas ne donne que l'enclos : un quadrilatère d'ailes autour d'une cour
  for (const e of enclos()) {
    if (!/^(Hôpital|Hospice|Institution des)/.test(e.nom) || e.nom === 'Hôpital Saint Louis') continue;
    const ring = e.rings[0], c = centroid(ring); reserve.push(c);
    if (app.footAt(c[0], c[1]) || [0, 1, 2, 3, 4, 5].some((k) => { const f = app.footAt(c[0] + Math.cos(k) * 30, c[1] + Math.sin(k) * 30); return f && f.reel; })) continue;       // l'atlas y détaille déjà des bâtiments
    const r = minAreaRect(ring), f = frame(r.cx, r.cz, r.ux, r.uz), hl = Math.min(60, r.hl * 0.5), hw = Math.min(45, r.hw * 0.5);
    if (hl < 14 || hw < 12) continue;
    for (const k of [1, -1]) { wing(f, (hl - 5) * k, 0, 5, hw, 3); wing(f, 0, (hw - 5) * k, hl, 5, 3); }
  }

  // ---- dômes sur des édifices que l'atlas donne déjà
  { const l = landmark('Eglise Sainte Geneviève'); if (l) { const top = dome(l.c[0], l.c[1], 11.5, ground(l.c[0], l.c[1]) + 30, 20, 22, { lantern: 7, spire: 4 }); note('Sainte-Geneviève', l.c[0], l.c[1], top); } }
  { const l = landmark('Halle aux Blés'); if (l) { const top = dome(l.c[0], l.c[1], 19.5, ground(l.c[0], l.c[1]) + 16.5, 1.5, 12, { lantern: 3, spire: 1.5 }); note('Halle au blé', l.c[0], l.c[1], top); } }
  for (const [nom, r, base, drum, h, lan] of [['Collège des Quatre-Nations', 8, 20, 9, 11, 4], ['Sorbonne', 6.5, 20, 8, 9, 3], ['Saint-Paul-Saint-Louis', 6.5, 26, 12, 12, 5]]) {
    const q = rep(nom); if (!q) continue;
    const f = app.footAt(q[0], q[1]), y0 = ground(q[0], q[1]);
    if (!f) nave(frame(q[0], q[1], 1, 0), 0, 0, 14, 9, base - 4);                  // faute d'emprise à cet endroit, un corps d'église porte le dôme
    note(nom, q[0], q[1], dome(q[0], q[1], r, y0 + base, drum, h, { lantern: lan, spire: lan * 0.7 }));
  }

  // ---- la tour du Temple : donjon carré, quatre tourelles d'angle
  { const q = rep('Temple');
    if (q) { const f = frame(q[0], q[1], 1, 0), top = tower(f, 0, 0, 7.5, 44, { col: VIEILLE });
      spire(q[0], q[1], 10.8, top, top + 9, 4, ARDOISE, Math.PI / 4);
      for (const k of [1, -1]) for (const m of [1, -1]) { const c = at(f, 7.5 * k, 7.5 * m), t = round(c[0], c[1], 2.6, 47, { seg: 10, col: VIEILLE }); spire(c[0], c[1], 3, t, t + 6, 10); }
      note('Temple', q[0], q[1], top + 9); } }

  // ---- arcs de triomphe des boulevards : deux piles et un entablement, en travers de la rue
  for (const [nom, W, D, H, open, yOpen] of [['Porte Saint-Denis', 25, 5, 24.6, 8, 15.3], ['Porte Saint-Martin', 18, 4.5, 18, 5.4, 11]]) {
    const q = rep(nom); if (!q) continue;
    const d = streetDir(q[0], q[1]), f = frame(q[0], q[1], d[0], d[1]), pw = (W - open) / 4;
    for (const k of [1, -1]) tower(f, 0, (open / 2 + pw) * k, D / 2, H, { hw: pw });
    const top = tower(f, 0, 0, D / 2, H, { hw: open / 2, from: yOpen });
    note(nom, q[0], q[1], top);
  }

  // ---- barrières de Ledoux sur le mur des Fermiers généraux
  { const q = rep('Rotonde de la Villette');
    if (q) { const f = frame(q[0], q[1], 1, 0), y0 = ground(q[0], q[1]); tower(f, 0, 0, 18, 8);
      cyl(B.at('stone', q[0], q[1]), q[0], q[1], 12.5, y0 + 8, y0 + 22, { seg: 24, col: PIERRE, s0: 0.9 }); spire(q[0], q[1], 13.2, y0 + 22, y0 + 26, 24, PLOMB);
      note('Rotonde de la Villette', q[0], q[1], y0 + 26); } }
  { const p = enc('Place du Trône'), q = rep('Barrière du Trône');
    if (p || q) { const c = p ? p.c : q, d = streetDir(c[0], c[1]), f = frame(c[0], c[1], d[0], d[1]); let top = 0;
      for (const k of [1, -1]) { tower(f, 0, 27 * k, 4, 7); const b = at(f, 0, 27 * k); top = round(b[0], b[1], 2.3, 30, { seg: 14 }); wing(f, 0, 62 * k, 9, 9, 3); }
      note('Barrière du Trône', c[0], c[1], top); } }
  for (const nom of ['Barrière de l’Étoile', 'Barrière d’Enfer']) {
    const q = rep(nom); if (!q) continue;
    const d = streetDir(q[0], q[1]), f = frame(q[0], q[1], d[0], d[1]); let top = 0;
    for (const k of [1, -1]) top = wing(f, 0, 24 * k, 8, 8, 3);
    note(nom, q[0], q[1], top);
  }

  // ---- paroisses et collégiales que la ville n'a pas déjà bâties en églises : hors de l'atlas, une église évoquée ;
  //      là où l'atlas ne montre plus que des maisons (église démolie depuis), un clocher signale la paroisse
  let clochers = app.paroisses.size;
  for (const e of eglises()) {
    if (!/paroissiale|collégiale/.test(e.statut) || /Sulpice/.test(e.nom) || app.paroisses.has(e.nom)) continue;
    let f = app.footAt(e.x, e.z), x = e.x, z = e.z;
    for (let d = 8; d <= 32 && !(f && f.reel); d += 8) for (let k = 0; k < 8 && !(f && f.reel); k++) { const px = e.x + Math.cos(k * 0.785) * d, pz = e.z + Math.sin(k * 0.785) * d, g = app.footAt(px, pz); if (g && g.reel) { f = g; x = px; z = pz; } }
    const id = 700000 + clochers, y0 = ground(x, z);
    if (!(f && f.reel)) { reserve.push([x, z]); gothique(app, B, rectCorners({ cx: x, cz: z, ux: 1, uz: 0, hl: 17 + hash(id, 5) * 5, hw: 7.5 + hash(id, 6) * 2 }), id); }
    else clocher(app, B, x, z, 3 + hash(id, 2) * 0.8, f.top - y0 + 8 + hash(id, 1) * 9, y0, 9 + hash(id, 3) * 6);
    clochers++;
  }
  app.stats.clochers = clochers; app.stats.monuments = Object.keys(M).length;
}
