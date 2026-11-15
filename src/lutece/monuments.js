// Monuments de Lutèce : forum, thermes du Nord (Cluny) et de l'Est (Collège de France), théâtre, arènes, ponts de bois
// du cardo, pilier des Nautes, tombeaux de la route du sud. Les emprises viennent des données ; les élévations sont
// une évocation d'après ce que l'on sait de ces édifices et de leurs semblables.
import { box, cyl, cone, gableRoof, rectCorners, tint, rgb } from '../builder.js';
import { building, facade, hex, hash } from '../p1789/blocks.js';
import { local, rayon } from './plan.js';
import { pointAt, polylineLength, centroid, pointInPoly, lerp } from '../geom.js';

const PIERRE = hex(0xe2d6ba), CALCAIRE = hex(0xece3cc), MARBRE = hex(0xf3eee2), ENDUIT = hex(0xefe5cd), GRADIN = hex(0xe0d6bc), GRADIN2 = hex(0xd2c7ac);
const TUILE = rgb(184, 112, 82), TUILE2 = rgb(170, 104, 78), BOIS = rgb(128, 98, 68), BOIS_SOMBRE = rgb(88, 66, 48);

// ---------------------------------------------------------------- outils
const base = (T, ring) => { let lo = 1e9, hi = -1e9; for (const p of ring) { const h = T.height(p[0], p[1]); if (h < lo) lo = h; if (h > hi) hi = h; } return { lo, hi }; };
// Rectangle du repère f : a le long du grand axe, c en travers. rectL : faîte selon le grand axe ; rectT : en travers.
const rectL = (f, a0, a1, c0, c1) => { const m = local(f)((a0 + a1) / 2, (c0 + c1) / 2); return { cx: m[0], cz: m[1], ux: f.ux, uz: f.uz, hl: (a1 - a0) / 2, hw: (c1 - c0) / 2 }; };
const rectT = (f, a0, a1, c0, c1) => { const m = local(f)((a0 + a1) / 2, (c0 + c1) / 2); return { cx: m[0], cz: m[1], ux: -f.uz, uz: f.ux, hl: (c1 - c0) / 2, hw: (a1 - a0) / 2 }; };

// Quadrilatère tourné vers le haut, quel que soit le sens des points [x, y, z] : a, b en bas ; c au-dessus de b, d au-dessus de a.
function pan(b, a, bb, c, d, u1, v1, col, s0 = 0.9, s1 = 1) {
  if ((bb[2] - a[2]) * (d[0] - a[0]) - (bb[0] - a[0]) * (d[2] - a[2]) >= 0) b.quad(a[0], a[1], a[2], bb[0], bb[1], bb[2], c[0], c[1], c[2], d[0], d[1], d[2], 0, 0, u1, v1, col, s0, s1);
  else b.quad(bb[0], bb[1], bb[2], a[0], a[1], a[2], d[0], d[1], d[2], c[0], c[1], c[2], u1, 0, 0, v1, col, s0, s1);
}
// Paroi de a à c ([x, z]), tournée vers (nx, nz) ; bas et haut peuvent être en pente (cotes au droit de a et de c).
function paroi(b, a, c, ya0, yc0, ya1, yc1, nx, nz, u0, u1, v0, v1, col, s0 = 0.8, s1 = 1) {
  if ((c[1] - a[1]) * nx + (a[0] - c[0]) * nz < 0) { let t = a; a = c; c = t; t = ya0; ya0 = yc0; yc0 = t; t = ya1; ya1 = yc1; yc1 = t; t = u0; u0 = u1; u1 = t; }
  b.quad(c[0], yc0, c[1], a[0], ya0, a[1], a[0], ya1, a[1], c[0], yc1, c[1], u1, v0, u0, v1, col, s0, s1);
}
// Mur mince entre deux points, visible des deux côtés.
function muret(b, a, c, y0, y1, ep, col) {
  const L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
  box(b, { cx: (a[0] + c[0]) / 2, cz: (a[1] + c[1]) / 2, ux: (c[0] - a[0]) / L, uz: (c[1] - a[1]) / L, hl: L / 2 + ep, hw: ep }, y0, y1, { col, s0: 0.8 });
}
// Voûte en berceau couverte de tuiles, axe le long du rectangle r ; tympans maçonnés aux deux bouts.
function berceau(b, wb, r, y, fleche, col, wcol, n = 7) {
  const { cx, cz, ux, uz, hl, hw } = r, P = (a, c) => [cx + ux * a - uz * c, cz + uz * a + ux * c], arc = [];
  for (let k = 0; k <= n; k++) { const t = (Math.PI * k) / n; arc.push([-hw * 1.03 * Math.cos(t), y + fleche * Math.sin(t)]); }
  let dev = 0;
  for (let k = 0; k < n; k++) {
    const [c0, y0] = arc[k], [c1, y1] = arc[k + 1], A0 = P(-hl, c0), A1 = P(hl, c0), B0 = P(-hl, c1), B1 = P(hl, c1), l = Math.hypot(c1 - c0, y1 - y0) * 0.33;
    b.quad(A1[0], y0, A1[1], A0[0], y0, A0[1], B0[0], y1, B0[1], B1[0], y1, B1[1], 2 * hl * 0.33, dev, 0, dev + l, col, 0.92, 1);
    dev += l;
    const M0 = P(-hl, 0), M1 = P(hl, 0), uv = (c, yy) => [c * 0.25, (yy - y) * 0.25];
    wb.tri(M0[0], y, M0[1], B0[0], y1, B0[1], A0[0], y0, A0[1], 0, 0, ...uv(c1, y1), ...uv(c0, y0), wcol, 0.9, 1, 1);
    wb.tri(M1[0], y, M1[1], A1[0], y0, A1[1], B1[0], y1, B1[1], 0, 0, ...uv(c0, y0), ...uv(c1, y1), wcol, 0.9, 1, 1);
  }
  return y + fleche;
}
// Salle maçonnée : murs à arcades, voûte en berceau (o.voute : flèche) ou toit à deux pans. Rend la cote du sommet.
function salle(app, B, r, y, h, o = {}) {
  const ring = rectCorners(r), col = o.col ?? PIERRE;
  facade(B.at('arcade', r.cx, r.cz), ring, false, y - 1.2, y + h, 0, 1, col, 0, 0.8, 1, o.trav ?? 4.6);
  if (o.voute) return berceau(B.at('roof', r.cx, r.cz), B.at('romain', r.cx, r.cz), r, y + h, o.voute, o.toit ?? TUILE, col);
  return gableRoof(B.at('roof', r.cx, r.cz), B.at('plain', r.cx, r.cz), r, y + h, r.hw * (o.pente ?? 0.4), { col: o.toit ?? TUILE, overhang: 0.5, gable: { col } });
}
// Colonnade le long d'une ligne brisée : fûts, architrave. Rend la cote du dessus de l'architrave.
function colonnade(B, pts, y, h, ray, pas, col) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], c = pts[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(L / pas)), b = B.at('plain', (a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
    for (let k = i ? 1 : 0; k <= n; k++) { const x = lerp(a[0], c[0], k / n), z = lerp(a[1], c[1], k / n); cyl(b, x, z, ray, y, y + h, { seg: 7, col, s0: 0.82, r1: ray * 0.86 }); box(b, { cx: x, cz: z, ux: 1, uz: 0, hl: ray * 1.25, hw: ray * 1.25 }, y + h - 0.28, y + h, { col }); }
    muret(b, a, c, y + h, y + h + 0.55, ray * 1.05, col);
  }
  return y + h + 0.55;
}

// ---------------------------------------------------------------- forum
// Une esplanade fermée de deux ailes de boutiques, ouvertes par deux passages ; portique intérieur ; le temple sur
// son podium dans la moitié ouest ; la basilique civile fermant l'est, du côté du cardo.
function forum(app, B, am) {
  const T = app.terrain, f = am.f, L = local(f), hl = f.hl, hw = f.hw, E = am.E, G = 3.4, y = base(T, am.m.ring).hi;
  const aile = (s) => [[s * G, -hw], [s * hl, -hw], [s * hl, hw], [s * G, hw], [s * G, hw - E], [s * (hl - E), hw - E], [s * (hl - E), -hw + E], [s * G, -hw + E]].map(([a, c]) => L(a, c));
  for (const s of [-1, 1]) building(app, B, { outer: aile(s), holes: [] }, 9100 + s, { kind: 'maison', floors: 2, col: ENDUIT, roof: TUILE, mansard: false, pitch: 0.42, light: true, area: 5000 });
  // portique intérieur, sur trois côtés ; il s'arrête à la basilique
  const aB = 44, aw = hl - E - 4.2, cw = hw - E - 4.2, ai = hl - E, ci = hw - E, yc = colonnade(B, [L(aB, -cw), L(-aw, -cw), L(-aw, cw), L(aB, cw)], y, 4.3, 0.34, 3.5, CALCAIRE);
  const br = B.at('roof', f.cx, f.cz), toit = (w0, w1, c0, c1) => pan(br, [c0[0], yc, c0[1]], [c1[0], yc, c1[1]], [w1[0], yc + 1.1, w1[1]], [w0[0], yc + 1.1, w0[1]], Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) * 0.33, 1.5, TUILE2);
  toit(L(aB, -ci), L(-ai, -ci), L(aB, -cw + 0.5), L(-aw + 0.5, -cw + 0.5)); toit(L(-ai, -ci), L(-ai, ci), L(-aw + 0.5, -cw + 0.5), L(-aw + 0.5, cw - 0.5)); toit(L(-ai, ci), L(aB, ci), L(-aw + 0.5, cw - 0.5), L(aB, cw - 0.5));
  // temple
  { const pod = rectL(f, -68, -30, -10.5, 10.5), yp = y + 2.6, bs = B.at('stone', pod.cx, pod.cz), bp = B.at('plain', pod.cx, pod.cz);
    box(bs, pod, y - 1, yp, { col: CALCAIRE });
    for (let k = 0; k < 4; k++) box(bs, rectL(f, -30, -30 + 1.15 * (4 - k), -8.5, 8.5), y - 1, y + 0.65 * (k + 1) - 0.05, { col: CALCAIRE, s0: 0.86 });      // emmarchement, face à la basilique
    box(bs, rectL(f, -66, -42, -7.2, 7.2), yp, yp + 8.6, { col: MARBRE, top: false });                                                                // cella
    for (let k = 0; k < 6; k++) { const p = L(-32.2, -8.9 + k * 3.56); cyl(bp, p[0], p[1], 0.52, yp, yp + 8.3, { seg: 8, col: MARBRE, s0: 0.84, r1: 0.45 }); }
    for (const c of [-8.9, 8.9]) for (let k = 1; k < 9; k++) { const p = L(-32.2 - k * 4.2, c); cyl(bp, p[0], p[1], 0.52, yp, yp + 8.3, { seg: 8, col: MARBRE, s0: 0.84, r1: 0.45 }); }
    box(bp, rectL(f, -67.2, -31, -9.9, 9.9), yp + 8.3, yp + 9.5, { col: MARBRE, s0: 0.9 });                                                            // entablement
    const top = gableRoof(B.at('roof', pod.cx, pod.cz), bp, rectL(f, -67.4, -30.8, -10.1, 10.1), yp + 9.5, 3.6, { col: TUILE, overhang: 0.5, gable: { col: MARBRE } });
    app.foot.push({ ring: rectCorners(rectL(f, -68, -25.4, -10.5, 10.5)), top });
    app.monuments.Forum = { x: f.cx, z: f.cz, top: top + 2 }; }
  // basilique : une nef haute entre deux bas-côtés, en travers de l'esplanade
  { const nef = rectT(f, 52, 68, -27, 27), top = salle(app, B, nef, y, 11.5, { pente: 0.4 });
    for (const [a0, a1, s] of [[46, 52, -1], [68, 74, 1]]) {
      const r = rectT(f, a0, a1, -27, 27), c = rectCorners(r), ext = s < 0 ? a0 : a1, int = s < 0 ? a1 : a0;
      facade(B.at('arcade', r.cx, r.cz), c, false, y - 1.2, y + 6, 0, 1, PIERRE, 0, 0.8, 1, 4.6);
      const e0 = L(ext + s * 0.4, -27.4), e1 = L(ext + s * 0.4, 27.4), i0 = L(int, -27.4), i1 = L(int, 27.4);                      // appentis, de la nef vers le dehors
      pan(B.at('roof', r.cx, r.cz), [e0[0], y + 5.9, e0[1]], [e1[0], y + 5.9, e1[1]], [i1[0], y + 8.1, i1[1]], [i0[0], y + 8.1, i0[1]], 54 * 0.33, 2.2, TUILE2);
    }
    app.foot.push({ ring: rectCorners(rectL(f, 46, 74, -27, 27)), top });
    app.monuments.Basilique = { x: L(60, 0)[0], z: L(60, 0)[1], top: top + 1 }; }
}

// ---------------------------------------------------------------- thermes
// Une enceinte ; du côté du grand axe, le bloc des bains — salle froide voûtée, salle chaude à abside, salles tièdes de
// part et d'autre ; à l'opposé, la palestre et ses portiques. o.rotonde : étuve ronde sur le flanc.
function thermes(app, B, am, nom, o = {}) {
  const T = app.terrain, f = am.f, L = local(f), hl = f.hl, hw = f.hw, ring = am.m.ring, g = base(T, ring), y = g.hi, bm = B.at('romain', f.cx, f.cz), s = o.miroir ? -1 : 1;
  for (let i = 0; i < ring.length; i++) muret(bm, ring[i], ring[(i + 1) % ring.length], g.lo - 1, y + 4.2, 0.45, PIERRE);
  const top = salle(app, B, rectL(f, 8, 30, -9.5, 9.5), y, 9.5, { voute: 5 });                       // frigidarium
  salle(app, B, rectT(f, 30, 43, -11.5, 11.5), y, 8, { voute: 4.6 });                                // caldarium
  { const p = L(42, 0); cyl(bm, p[0], p[1], 6, y - 1.2, y + 7.2, { seg: 14, col: PIERRE, s0: 0.8 }); cone(B.at('roof', p[0], p[1]), p[0], p[1], 6.5, y + 7.2, y + 9.6, { seg: 14, col: TUILE2 }); }      // abside
  salle(app, B, rectT(f, -4, 8, -9.5, 9.5), y, 8, { voute: 4.2 });                                   // vestibule
  for (const c of [-1, 1]) {
    salle(app, B, rectL(f, -4, 30, c > 0 ? 9.5 : -24, c > 0 ? 24 : -9.5), y, 6.8, { voute: 4.2 });     // salles tièdes
    salle(app, B, rectT(f, 30, 41, c > 0 ? 11.5 : -22, c > 0 ? 22 : -11.5), y, 5.4, { pente: 0.36, toit: TUILE2 });
  }
  if (o.rotonde) { const p = L(14, s * 30.4); cyl(bm, p[0], p[1], 6.2, y - 1.2, y + 7, { seg: 16, col: PIERRE, s0: 0.8 }); cone(B.at('roof', p[0], p[1]), p[0], p[1], 6.7, y + 7, y + 10.4, { seg: 16, col: TUILE }); }
  // palestre : portiques sur trois côtés, adossés à l'enceinte
  const a0 = -hl + 5.2, a1 = -8, cw = hw - 5.2, yc = colonnade(B, [L(a1, -cw), L(a0, -cw), L(a0, cw), L(a1, cw)], y, 3.4, 0.28, 3.4, CALCAIRE), br = B.at('roof', f.cx, f.cz);
  const toit = (w0, w1, c0, c1) => pan(br, [c0[0], yc, c0[1]], [c1[0], yc, c1[1]], [w1[0], yc + 0.9, w1[1]], [w0[0], yc + 0.9, w0[1]], Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) * 0.33, 1.6, TUILE2);
  toit(L(a1, -hw + 0.5), L(-hl + 0.5, -hw + 0.5), L(a1, -cw + 0.4), L(a0 - 0.4, -cw + 0.4)); toit(L(-hl + 0.5, -hw + 0.5), L(-hl + 0.5, hw - 0.5), L(a0 - 0.4, -cw + 0.4), L(a0 - 0.4, cw - 0.4)); toit(L(-hl + 0.5, hw - 0.5), L(a1, hw - 0.5), L(a0 - 0.4, cw - 0.4), L(a1, cw - 0.4));
  app.foot.push({ ring, top });
  const c = L(19, 0); app.monuments[nom] = { x: c[0], z: c[1], top: top + 1 };
}

// ---------------------------------------------------------------- gradins
// Gradins en éventail autour de O, du rayon sIn·R au contour (R : distance de O au contour dans chaque direction),
// entre les angles a0 et a1 ; mur extérieur à arcades, murs de flanc. Rend la cote du haut du mur.
function gradins(app, B, g, ring, y, yb) {
  const { O, a0, a1, N, K, sIn, H } = g, bt = B.at('stone', O[0], O[1]), bw = B.at('arcade', O[0], O[1]), bm = B.at('romain', O[0], O[1]), dir = [], R = [];
  for (let i = 0; i <= N; i++) { const t = a0 + ((a1 - a0) * i) / N, c = Math.cos(t), s = Math.sin(t); dir.push([c, s]); R.push(rayon(O, c, s, ring)); }
  const pt = (i, k) => [O[0] + dir[i][0] * R[i] * k, O[1] + dir[i][1] * R[i] * k], sk = (k) => sIn + ((1 - sIn) * k) / K, yk = (k) => y + 1.7 + ((H - 1.7) * k) / (K - 1);
  for (let i = 0; i < N; i++) {
    const mx = dir[i][0] + dir[i + 1][0], mz = dir[i][1] + dir[i + 1][1];
    for (let k = 0; k < K; k++) {
      const a = pt(i, sk(k)), b = pt(i + 1, sk(k)), c = pt(i + 1, sk(k + 1) + 0.002), d = pt(i, sk(k + 1) + 0.002), yy = yk(k);
      pan(bt, [a[0], yy, a[1]], [b[0], yy, b[1]], [c[0], yy, c[1]], [d[0], yy, d[1]], 1, 0.6, k % 2 ? GRADIN : GRADIN2, 1, 1);
      { const y0 = k ? yk(k - 1) : yb; paroi(bt, a, b, y0, y0, yy, yy, -mx, -mz, 0, 1, 0, 0.4, PIERRE, 0.7, 0.86); }
    }
    const a = pt(i, 1), b = pt(i + 1, 1);
    paroi(bw, a, b, yb, yb, y + H + 1, y + H + 1, mx, mz, i * 0.25, (i + 1) * 0.25, 0, 1, PIERRE, 0.82, 1);
    paroi(bm, a, b, y + H, y + H, y + H + 1, y + H + 1, -mx, -mz, 0, 1, 0, 0.25, PIERRE, 0.9, 1);
    app.foot.push({ ring: [pt(i, sIn), pt(i + 1, sIn), b, a], top: y + H });
  }
  for (const [i, sg] of [[0, 1], [N, -1]]) paroi(bm, pt(i, sIn), pt(i, 1), yb, yb, y + 2.7, y + H + 1, dir[i][1] * sg, -dir[i][0] * sg, 0, R[i] * (1 - sIn) * 0.25, 0, H * 0.25, PIERRE, 0.8, 1);
  return y + H + 1;
}

// Théâtre : gradins en demi-cercle adossés à la pente, bâtiment de scène le long du grand côté droit.
function theatre(app, B, am) {
  const T = app.terrain, ring = am.m.ring, g = base(T, ring), y = g.hi, sc = am.sc, top = gradins(app, B, am, ring, y, g.lo - 1);
  const mur = { cx: sc.mx + sc.nx * 4, cz: sc.mz + sc.nz * 4, ux: sc.ux, uz: sc.uz, hl: sc.long / 2 - 0.5, hw: 4 };
  salle(app, B, mur, y, 12, { pente: 0.22, trav: 4.4 });
  app.foot.push({ ring: rectCorners(mur), top: y + 12 });
  const scene = { cx: sc.mx + sc.nx * 10.2, cz: sc.mz + sc.nz * 10.2, ux: sc.ux, uz: sc.uz, hl: sc.long / 2 - 9, hw: 2.2 };
  box(B.at('plain', scene.cx, scene.cz), scene, y - 0.6, y + 1.3, { col: BOIS, topCol: tint(BOIS, 1.15), s0: 0.8 });
  app.foot.push({ ring: rectCorners(scene), top: y + 1.3 });
  app.monuments['Théâtre'] = { x: am.O[0], z: am.O[1], top };
}

// Arènes : amphithéâtre à scène. Les gradins entourent l'arène ; le mur de scène ferme le côté est.
function arenes(app, B, am) {
  const T = app.terrain, ring = am.m.ring, g = base(T, ring), y = g.hi, sc = am.sc, top = gradins(app, B, am, ring, y, g.lo - 1);
  const mur = { cx: sc.mx + sc.nx * 3.6, cz: sc.mz + sc.nz * 3.6, ux: sc.ux, uz: sc.uz, hl: sc.long / 2 - 3.5, hw: 3.2 };
  salle(app, B, mur, y, 9.5, { pente: 0.25, trav: 4.2 });
  app.foot.push({ ring: rectCorners(mur), top: y + 9.5 });
  { const b = B.at('romain', am.O[0], am.O[1]), r = am.arene;                                         // mur du podium, autour de l'arène : fait par les contremarches ; ici, le parapet
    for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length], t = Math.atan2((a[1] + c[1]) / 2 - am.O[1], (a[0] + c[0]) / 2 - am.O[0]); let u = t - am.a0; while (u < 0) u += 2 * Math.PI; if (u > am.a1 - am.a0) continue; muret(b, a, c, y + 1.7, y + 2.5, 0.16, PIERRE); } }
  app.monuments['Arènes'] = { x: am.O[0], z: am.O[1], top };
}

// ---------------------------------------------------------------- ponts de bois du cardo
// Tablier de madriers sur des palées de pieux, garde-corps à deux lisses. Le tablier est praticable (app.deckSet).
function ponts(app, B, P) {
  const HW = 3.1;
  P.ponts.forEach((pont, n) => {
    const pts = pont.pts, b = B.at('plain', pont.x, pont.z), cote = (p, s) => [p.x - p.dz * s, p.z + p.dx * s];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      for (const s of [1, -1]) { const c = cote(p, s * (HW - 0.12)); box(b, { cx: c[0], cz: c[1], ux: p.dx, uz: p.dz, hl: 0.1, hw: 0.1 }, p.y, p.y + 1.12, { col: BOIS_SOMBRE, s0: 0.9 }); }      // poteaux
      if (p.eau) {                                                                                       // palée : deux pieux et leur chapeau
        for (const s of [1, -1]) { const c = cote(p, s * 2.3); box(b, { cx: c[0], cz: c[1], ux: p.dx, uz: p.dz, hl: 0.24, hw: 0.24 }, -3.4, p.y - 0.5, { col: BOIS_SOMBRE, top: false, s0: 0.6 }); }
        box(b, { cx: p.x, cz: p.z, ux: -p.dz, uz: p.dx, hl: HW + 0.3, hw: 0.22 }, p.y - 0.86, p.y - 0.5, { col: BOIS_SOMBRE, s0: 0.8 });
      }
      if (i + 1 === pts.length) break;
      const q = pts[i + 1], L = Math.hypot(q.x - p.x, q.z - p.z) || 1, pl = cote(p, HW), pr = cote(p, -HW), ql = cote(q, HW), qr = cote(q, -HW);
      pan(b, [pl[0], p.y, pl[1]], [pr[0], p.y, pr[1]], [qr[0], q.y, qr[1]], [ql[0], q.y, ql[1]], 1, 1, i % 2 ? BOIS : tint(BOIS, 0.92), 1, 1);      // platelage
      for (const s of [1, -1]) {
        const nx = -p.dz * s, nz = p.dx * s, a = cote(p, s * HW), c = cote(q, s * HW), ra = cote(p, s * (HW - 0.12)), rc = cote(q, s * (HW - 0.12));
        paroi(b, a, c, p.y - 0.5, q.y - 0.5, p.y, q.y, nx, nz, 0, L * 0.25, 0, 1, BOIS_SOMBRE, 0.8, 0.9);                                             // rive du tablier
        for (const h of [1.0, 0.52]) for (const f of [1, -1]) paroi(b, ra, rc, p.y + h, q.y + h, p.y + h + 0.13, q.y + h + 0.13, nx * f, nz * f, 0, L * 0.25, 0, 1, BOIS, 1, 1);      // lisses
      }
      for (let t = 0; t <= L; t += 1) for (let w = -HW; w <= HW; w += 1) app.deckSet(p.x + ((q.x - p.x) * t) / L - p.dz * w, p.z + ((q.z - p.z) * t) / L + p.dx * w, lerp(p.y, q.y, t / L));
    }
    app.monuments['pont' + n] = { x: pont.x, z: pont.z, top: pts[pts.length >> 1].y + 4 };
  });
}

// ---------------------------------------------------------------- pilier des Nautes, tombeaux
function pilier(app, B, P) {
  const T = app.terrain, c = centroid(P.cite), est = P.cite.slice().sort((a, b) => b[0] - a[0])[0];
  let x = lerp(c[0], est[0], 0.42), z = lerp(c[1], est[1], 0.42);
  const libre = (px, pz) => { for (const d of [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]]) { const i = Math.floor(px + d[0] - P.occ.x), k = Math.floor(pz + d[1] - P.occ.z); if (i < 0 || k < 0 || i >= P.occ.w || k >= P.occ.h || P.occ.data[k * P.occ.w + i]) return false; } return pointInPoly(px, pz, P.cite) && T.wetAt(px, pz) < 0.02; };
  search: for (let r = 0; r < 80; r += 6) for (let a = 0; a < 6.28; a += 0.8) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (libre(px, pz)) { x = px; z = pz; break search; } }
  const y = T.height(x, z), b = B.at('stone', x, z), q = (hw, y0, y1, col) => box(b, { cx: x, cz: z, ux: 1, uz: 0, hl: hw, hw }, y0, y1, { col, s0: 0.86 });
  q(1.5, y - 0.6, y + 0.35, PIERRE); q(1.0, y + 0.35, y + 0.75, CALCAIRE);
  for (let k = 0; k < 4; k++) q(0.56 - k * 0.03, y + 0.75 + k * 1.12, y + 0.75 + (k + 1) * 1.12 - 0.04, k % 2 ? CALCAIRE : MARBRE);
  q(0.3, y + 5.23, y + 6.5, MARBRE);
  app.foot.push({ ring: rectCorners({ cx: x, cz: z, ux: 1, uz: 0, hl: 1.5, hw: 1.5 }), top: y + 6.5 });
  app.monuments.Pilier = { x, z, top: y + 6.5 };
}
function tombeaux(app, B, P) {
  const T = app.terrain, L = polylineLength(P.cardo); let n = 0, sx = 0, sz = 0;
  for (let s = 0; s < L; s += 7) {
    const p = pointAt(P.cardo, s); if (p.z < 1250 || p.z > 1900) continue;
    for (const cote of [1, -1]) {
      const id = Math.round(s) * 2 + (cote > 0 ? 1 : 0); if (hash(id, 61) > 0.62) continue;
      const d = 7 + hash(id, 62) * 11, x = p.x - p.dz * d * cote, z = p.z + p.dx * d * cote, y = T.height(x, z), b = B.at('stone', x, z);
      if (T.wetAt(x, z) > 0.02) continue;
      if (hash(id, 63) < 0.13) { box(b, { cx: x, cz: z, ux: p.dx, uz: p.dz, hl: 1.5, hw: 1.5 }, y - 0.5, y + 3.1, { col: CALCAIRE, s0: 0.84 }); cone(B.at('roof', x, z), x, z, 2.3, y + 3.1, y + 4.6, { seg: 4, col: TUILE2, a0: Math.atan2(p.dz, p.dx) + Math.PI / 4 }); app.foot.push({ ring: rectCorners({ cx: x, cz: z, ux: p.dx, uz: p.dz, hl: 1.5, hw: 1.5 }), top: y + 4.6 }); }
      else box(b, { cx: x, cz: z, ux: p.dx, uz: p.dz, hl: 0.34, hw: 0.14 }, y - 0.4, y + 0.9 + hash(id, 64) * 0.7, { col: hash(id, 65) < 0.5 ? CALCAIRE : PIERRE, s0: 0.84 });
      n++; sx += x; sz += z;
    }
  }
  if (n) app.monuments.Necropole = { x: sx / n, z: sz / n, top: T.height(sx / n, sz / n) + 8 };
  app.stats.tombeaux = n;
}

export function batirMonuments(app, B) {
  const P = app.plan250, am = P.am;
  forum(app, B, am.forum);
  thermes(app, B, am.thermesN, 'Thermes du Nord');
  thermes(app, B, am.thermesE, 'Thermes de l’Est', { rotonde: true });
  theatre(app, B, am.theatre);
  arenes(app, B, am.arenes);
  ponts(app, B, P);
  pilier(app, B, P);
  tombeaux(app, B, P);
}
