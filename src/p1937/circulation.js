// La circulation de l'été 1937 : automobiles, taxis, camionnettes, camions, autobus et dernières voitures à cheval
// roulent à droite sur le réseau des rues de la date (rues(), src/p1889/data.js), autour du point de vue comme les
// passants. Ce module remplace src/p1889/circulation.js dans la page de 1937 (surcouche, tools/build.mjs).
//
// 1. Le réseau (reseau) : les tronçons de voie deviennent les arêtes d'un graphe, leurs extrémités ses nœuds. L'axe de
//    chaque tronçon est ramené au milieu de la rue telle que le sol la dessine (carte de distance de la voirie,
//    src/p1889/sol.js), qui donne aussi la demi-largeur de la chaussée, trottoirs déduits (même règle que le sol).
//    Une chaussée de moins de 4,7 m est à sens unique, sur une file ; au-delà, une à trois files par sens, et des
//    voitures en stationnement le long d'un trottoir, ou des deux, quand la place ne manque pas. Passages, impasses, ports, allées,
//    terrains de l'Exposition et voies sans issue sont laissés aux piétons.
// 2. La conduite (Circulation) : chaque véhicule suit sa file, garde ses distances, ralentit avant de tourner, et
//    choisit sa route à chaque carrefour — plutôt tout droit, plutôt vers la voie la plus large. Un carrefour ne laisse
//    passer qu'une voiture venue d'une autre rue à la fois : les autres attendent à la ligne d'arrêt.
// 3. Les passants (trottoirs) : ils quittent la chaussée pour les trottoirs et traversent aux carrefours.
import * as THREE from 'three';
import { rues } from '../p1889/data.js';
import { trottoir } from '../p1889/sol.js';
import { lines, ring } from '../p1789/outils.js';
import { pointInPoly, mulberry32, clamp, smoothstep } from '../geom.js';
import { terrainsExpo } from './expo37.js';
import { modeles } from './autos.js';

const PIETONNES = /^(Port|Berge|Passage|Impasse|Cit[ée]|Villa|Cour|Galerie|Sentier|Sente|Escalier|All[ée]e|Square|Hameau|Ruelle|Passerelle|Parvis|Chemin de ronde)\b/i;
const PAS = 7;                 // pas de l'axe des rues (m)
const UNE_FILE = 1.15, DEUX_SENS = 2.35, FILE = 2.7, GARE = 4.6, GARE_1 = 3.4, PLACE = 2.1;      // demi-largeurs de chaussée (m) : seuils et largeurs
const BORDURE = 0.3;           // la bordure du trottoir, que le sol dessine
export const MAILLE = [1, 1.5];        // maille de la trame des passants (m), ordinateur et téléphone : assez fine pour un trottoir de deux mètres
const DENSITE = 11;            // véhicules par kilomètre de file, en plein jour

// ---------------------------------------------------------------- le réseau
export function reseau(app) {
  const t0 = performance.now();
  const v = app.voirie, C = app.monde.cadre, T = app.terrain, V = app.v89, D = v.D;
  const kx = v.w / (C.x1 - C.x0), kz = v.h / (C.z1 - C.z0), vd = v.data, vw = v.w, vh = v.h;
  // distance au bord de la rue (m, positive dans la rue, bornée à ±D), lue dans la carte de voirie
  const dist = (x, z) => {
    const fx = (x - C.x0) * kx - 0.5, fz = (z - C.z0) * kz - 0.5, i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= vw - 1 || j >= vh - 1) return -D;
    const a = fx - i, b = fz - j, k = j * vw + i;
    return (((vd[k] * (1 - a) + vd[k + 1] * a) * (1 - b) + (vd[k + vw] * (1 - a) + vd[k + vw + 1] * a) * b) / 255 - 0.5) * 2 * D;
  };
  const R = rues(), cle = (p) => (Math.round(p[0]) + 16384) * 32768 + Math.round(p[1]) + 16384;
  const bouts = new Set(); for (const r of R) { bouts.add(cle(r.pts[0])); bouts.add(cle(r.pts[r.pts.length - 1])); }
  const N = [], idN = new Map(), E = [];
  const noeud = (p) => { const k = cle(p); let i = idN.get(k); if (i === undefined) { i = N.length; idN.set(k, i); N.push({ x: p[0], z: p[1], e: [], r: 2, q: -1, t: 0, deg: 0, A: [0, 0, 0], B: [0, 0] }); } return i; };
  // une arête : le tronçon entre deux nœuds, rééchantillonné tous les PAS mètres au plus
  const arete = (pts, r) => {
    const P = [[pts[0][0], pts[0][1]]];
    for (let i = 1; i < pts.length; i++) { const a = P[P.length - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < 0.3) continue; const n = Math.max(1, Math.ceil(d / PAS)); for (let k = 1; k <= n; k++) P.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); }
    if (P.length < 2) return;
    const a = noeud(pts[0]), b = noeud(pts[pts.length - 1]), e = { a, b, P, nom: r.nom, pont: r.pont, ok: a !== b };
    N[a].e.push(E.length); if (b !== a) N[b].e.push(E.length); E.push(e);
  };
  for (const r of R) { let d = [r.pts[0]]; for (let i = 1; i < r.pts.length; i++) { d.push(r.pts[i]); if (i === r.pts.length - 1 || bouts.has(cle(r.pts[i]))) { arete(d, r); d = [r.pts[i]]; } } }

  // abscisses et normales (à droite du sens A → B ; aux sommets, la bissectrice, allongée pour garder la largeur)
  const mesurer = (e) => {
    const P = e.P, n = P.length, S = new Float32Array(n), Q = new Float32Array(n * 2), U = new Float32Array(n * 2);
    for (let i = 1; i < n; i++) S[i] = S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[i], c = P[Math.min(n - 1, i + 1)];
      let t0x = b[0] - a[0], t0z = b[1] - a[1], t1x = c[0] - b[0], t1z = c[1] - b[1]; const l0 = Math.hypot(t0x, t0z), l1 = Math.hypot(t1x, t1z);
      if (l0 < 1e-6) { t0x = t1x; t0z = t1z; } else { t0x /= l0; t0z /= l0; } if (l1 < 1e-6) { t1x = t0x; t1z = t0z; } else { t1x /= l1; t1z /= l1; }
      if (l0 < 1e-6) { const l = Math.hypot(t0x, t0z) || 1; t0x /= l; t0z /= l; }
      let nx = -(t0z + t1z), nz = t0x + t1x; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      const k = 1 / Math.max(0.6, nx * -t0z + nz * t0x);
      Q[i * 2] = nx * k; Q[i * 2 + 1] = nz * k; let tx = t0x + t1x, tz = t0z + t1z; const lt = Math.hypot(tx, tz) || 1; U[i * 2] = tx / lt; U[i * 2 + 1] = tz / lt;
    }
    e.S = S; e.Q = Q; e.U = U; e.len = S[n - 1];
  };
  for (const e of E) mesurer(e);

  // --- recentrage : l'axe de la base n'est pas toujours au milieu de la rue (deux mètres d'écart une fois sur quatre)
  const mouille = (x, z) => T.wetAt(x, z) > 0.5;
  const val = new Float32Array(25);
  const ecart = (x, z, nx, nz, d0) => {
    const pas = 0.75, M = 12; let k0 = 0, k1 = 0, m = d0; val[M] = d0;
    for (let k = 1; k <= M; k++) { const d = dist(x + nx * k * pas, z + nz * k * pas); if (d < 0.3) break; val[M + k] = d; k1 = k; if (d > m) m = d; }
    for (let k = 1; k <= M; k++) { const d = dist(x - nx * k * pas, z - nz * k * pas); if (d < 0.3) break; val[M - k] = d; k0 = -k; if (d > m) m = d; }
    if (m - d0 < 0.25) return 0;
    // le milieu du palier où la distance est la plus grande
    let a = 0, b = 0, best = -1, la = 0, lb = 0, dans = false;
    for (let k = k0; k <= k1 + 1; k++) { const haut = k <= k1 && val[M + k] >= m - 0.15; if (haut && !dans) { dans = true; a = k; } if (!haut && dans) { dans = false; b = k - 1; if (b - a > best) { best = b - a; la = a; lb = b; } } }
    return ((la + lb) / 2) * pas;
  };
  for (const e of E) {
    const P = e.P, n = P.length, o = new Float32Array(n); e.eau = false;
    // (hors de la rue, on ne recentre rien ; l'eau n'est cherchée que là : un pont, un quai qui mord sur le fleuve)
    for (let i = 0; i < n; i++) { const d0 = dist(P[i][0], P[i][1]); if (d0 < 0.4) { if (mouille(P[i][0], P[i][1])) e.eau = true; continue; } o[i] = ecart(P[i][0], P[i][1], e.Q[i * 2], e.Q[i * 2 + 1], d0); }
    for (let passe = 0; passe < 2; passe++) { let p = o[0]; for (let i = 1; i < n - 1; i++) { const c = o[i]; o[i] = (p + 2 * c + o[i + 1]) / 4; p = c; } }
    e.o = o;
    // chaque bout dit à son nœud où il voudrait le voir : moindres carrés sur les normales des rues qui s'y rejoignent
    for (const [nd, sens] of [[e.a, 1], [e.b, -1]]) {
      const cible = Math.min(e.len / 2, 14); let i = 0; if (sens > 0) { while (i < n - 1 && e.S[i] < cible) i++; } else { i = n - 1; while (i > 0 && e.len - e.S[i] < cible) i--; }
      const nx = e.Q[i * 2], nz = e.Q[i * 2 + 1], l = Math.hypot(nx, nz) || 1, ux = nx / l, uz = nz / l, K = N[nd];
      K.A[0] += ux * ux; K.A[1] += ux * uz; K.A[2] += uz * uz; K.B[0] += ux * o[i]; K.B[1] += uz * o[i];
    }
  }
  for (const K of N) {
    const a = K.A[0] + 0.15, b = K.A[1], c = K.A[2] + 0.15, det = a * c - b * b; let dx = (c * K.B[0] - b * K.B[1]) / det, dz = (a * K.B[1] - b * K.B[0]) / det;
    const l = Math.hypot(dx, dz); if (l > 9) { dx *= 9 / l; dz *= 9 / l; } K.dx = dx; K.dz = dz; K.x += dx; K.z += dz; K.A = K.B = null;
  }
  // sur un pont de la Seine, l'axe est celui de l'ouvrage bâti (src/p1889/ville.js réunit les demi-chaussées de la base)
  const ponts = V.ponts.map((p, k) => { const l = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]); return { k, a: p.a, ux: (p.b[0] - p.a[0]) / l, uz: (p.b[1] - p.a[1]) / l, l, w: p.w }; });
  const pontDe = (x, z) => { let best = null, bd = 1e9; for (const p of ponts) { const t = (x - p.a[0]) * p.ux + (z - p.a[1]) * p.uz, lat = -(x - p.a[0]) * p.uz + (z - p.a[1]) * p.ux; if (t < -2 || t > p.l + 2 || Math.abs(lat) > p.w + 8) continue; if (Math.abs(lat) < bd) { bd = Math.abs(lat); best = { p, t, lat }; } } return best; };
  const surPonts = new Set();
  for (const e of E) {
    const P = e.P, n = P.length, A = N[e.a], B = N[e.b], Tl = Math.min(14, e.len), H = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const wa = 1 - smoothstep(0, Tl, e.S[i]), wb = 1 - smoothstep(0, Tl, e.len - e.S[i]), m = Math.max(0, 1 - wa - wb);
      P[i] = [P[i][0] + wa * A.dx + wb * B.dx + m * e.o[i] * e.Q[i * 2], P[i][1] + wa * A.dz + wb * B.dz + m * e.o[i] * e.Q[i * 2 + 1]];
    }
    if (e.eau) for (let i = 1; i < n - 1; i++) {
      const q = pontDe(P[i][0], P[i][1]); if (!q || Math.abs(e.U[i * 2] * q.p.ux + e.U[i * 2 + 1] * q.p.uz) < 0.75) continue;      // une rue de quai passe devant le pont sans le prendre
      // deux chaussées jumelles gardent leur côté ; une chaussée unique vient dans l'axe
      const lat = Math.abs(q.lat) < 2.5 ? 0 : clamp(q.lat, -(q.p.w - 3.4), q.p.w - 3.4), f = smoothstep(0, 12, Math.min(q.t + 2, q.p.l + 2 - q.t));
      const x = q.p.a[0] + q.p.ux * q.t - q.p.uz * lat, z = q.p.a[1] + q.p.uz * q.t + q.p.ux * lat;
      P[i] = [P[i][0] + (x - P[i][0]) * f, P[i][1] + (z - P[i][1]) * f]; H[i] = -(q.p.w - Math.abs(lat)); surPonts.add(q.p.k); e.surPont = q.p.k;
    }
    mesurer(e);
    for (let i = 0; i < n; i++) H[i] = H[i] < 0 ? -H[i] : Math.max(0, dist(P[i][0], P[i][1]));
    e.H = H; e.o = null;
    // demi-largeur de la rue : prise loin des carrefours (où la distance au bord est celle de la rue voisine), plutôt
    // dans le bas de ce qu'on y mesure, pour qu'un resserrement ne jette pas les voitures sur le trottoir
    const loin = []; for (let i = 0; i < n; i++) if (Math.min(e.S[i], e.len - e.S[i]) > Math.min(12, e.len / 3)) loin.push(H[i]);
    const tri = (loin.length ? loin : Array.from(H)).sort((a, b) => a - b); e.h = tri[Math.floor(tri.length * 0.35)]; e.w = e.h - trottoir(e.h) - BORDURE;
    const i0 = n >> 1; e.cx = P[i0][0]; e.cz = P[i0][1];
  }

  // --- la carte des demi-largeurs de voie est repeinte rue par rue. Celle du sol (src/p1889/sol.js) reporte la plus
  // grande largeur du voisinage : près d'une avenue, les trottoirs des petites rues s'élargissent jusqu'à les couvrir.
  // Ici chaque rue porte sa propre largeur d'un bout à l'autre, la plus large l'emportant aux carrefours : le sol, les
  // arbres d'alignement, les voitures et les passants lisent la même carte, et la bordure tombe au même endroit pour tous.
  { const Lg = v.large, f = Lg.w < 2048 ? 2 : 1, W2 = Lg.w * f, H2 = Lg.h * f, cv = document.createElement('canvas'); cv.width = W2; cv.height = H2;
    const x = cv.getContext('2d', { willReadFrequently: true }), im = x.createImageData(W2, H2), d = im.data;
    for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) { const g = Lg.data[Math.floor(j / f) * Lg.w + Math.floor(i / f)], k = (j * W2 + i) * 4; d[k] = d[k + 1] = d[k + 2] = g; d[k + 3] = 255; }
    x.putImageData(im, 0, 0); x.lineCap = 'round'; x.lineJoin = 'round';
    const sx = W2 / (C.x1 - C.x0), sz = H2 / (C.z1 - C.z0);
    for (const e of E.filter((e) => e.h > 0.6).sort((a, b) => a.h - b.h)) {
      const g = Math.round((0.5 + Math.min(D, e.h) / (2 * D)) * 255); x.strokeStyle = `rgb(${g},${g},${g})`; x.lineWidth = 2 * (e.h + 4) * sx;
      x.beginPath(); x.moveTo((e.P[0][0] - C.x0) * sx, (e.P[0][1] - C.z0) * sz); for (let i = 1; i < e.P.length; i++) x.lineTo((e.P[i][0] - C.x0) * sx, (e.P[i][1] - C.z0) * sz); x.stroke();
    }
    const lu = x.getImageData(0, 0, W2, H2).data, data = new Uint8Array(W2 * H2); for (let i = 0; i < data.length; i++) data[i] = lu[i * 4];
    v.large = { data, w: W2, h: H2 };
    const tex = app.voirieTex && app.voirieTex.large; if (tex) { tex.dispose(); tex.image = { data, width: W2, height: H2 }; tex.needsUpdate = true; } }

  // --- ce qui roule
  const expo = terrainsExpo().map((r) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { r, x0, z0, x1, z1 }; });
  const dansExpo = (x, z) => expo.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && pointInPoly(x, z, b.r));
  const marge = 60, dedans = (x, z) => x > C.x0 + marge && x < C.x1 - marge && z > C.z0 + marge && z < C.z1 - marge;
  const bilan = { aretes: E.length, noeuds: N.length, pietonnes: 0, etroites: 0, expo: 0, eau: 0, bati: 0, hors: 0, sansIssue: 0 };
  // édifices posés sur la voie publique (monuments, kiosques, pavillons de l'Exposition) : presque toutes les emprises
  // sont dans leur îlot, on ne cherche un mur que dans les cases de 48 m où l'une d'elles déborde sur la rue
  const CF = 48, surVoie = new Set(), cf = (i, k) => (i + 2048) * 4096 + k + 2048;
  for (const f of app.foot) { if (f.absent || f.x0 == null) continue; let dehors = false; for (let i = 0; i < f.ring.length && !dehors; i += 2) dehors = dist(f.ring[i][0], f.ring[i][1]) > 1.5; if (!dehors) continue;
    for (let i = Math.floor(f.x0 / CF); i <= Math.floor(f.x1 / CF); i++) for (let k = Math.floor(f.z0 / CF); k <= Math.floor(f.z1 / CF); k++) surVoie.add(cf(i, k)); }
  const batiEn = (x, z) => surVoie.has(cf(Math.floor(x / CF), Math.floor(z / CF))) && !!app.footAt(x, z);
  for (const e of E) {
    if (!e.ok) continue;
    const non = (pourquoi) => { e.ok = false; e.motif = pourquoi; bilan[pourquoi]++; };
    if (PIETONNES.test(e.nom)) { non('pietonnes'); continue; }
    if (e.w < UNE_FILE || e.len < 1.5) { non('etroites'); continue; }
    if (dansExpo(e.cx, e.cz) || dansExpo(e.P[0][0], e.P[0][1]) || dansExpo(e.P[e.P.length - 1][0], e.P[e.P.length - 1][1])) { non('expo'); continue; }
    if (!dedans(e.cx, e.cz)) { non('hors'); continue; }
    // l'axe traverse-t-il un îlot, l'eau sans pont ou un bâtiment ?
    let dur = 0, noye = 0, bati = 0; const n = e.P.length;
    const bord = e.w < DEUX_SENS ? 0 : Math.max(0, e.w - 1.2);                    // jusqu'où vont les voitures, de part et d'autre de l'axe
    for (let i = 0; i < n; i++) { const [x, z] = e.P[i], qx = e.Q[i * 2] * bord, qz = e.Q[i * 2 + 1] * bord; if (e.H[i] < 1.1) dur++; if (mouille(x, z) && !app.deck.has(app.deckKey(x, z))) noye++;
      if (i % 2 === 0 && Math.min(e.S[i], e.len - e.S[i]) > 3 && (batiEn(x, z) || (bord && (batiEn(x + qx, z + qz) || batiEn(x - qx, z - qz))))) bati++; }
    if (noye > 0) { non('eau'); continue; }
    if (bati > 0 || dur > Math.max(1, 0.2 * n)) { non('bati'); continue; }
  }
  // une voie sans issue ne reçoit pas de voitures : on les retire jusqu'à ce qu'il n'en reste plus
  const degre = (K) => { let d = 0; for (const k of K.e) if (E[k].ok) d++; return d; };
  for (let encore = true; encore;) { encore = false; for (const e of E) if (e.ok && (degre(N[e.a]) < 2 || degre(N[e.b]) < 2)) { e.ok = false; e.motif = 'sansIssue'; bilan.sansIssue++; encore = true; } }

  // files, stationnement, sens uniques
  const hache = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  let km = 0, uniques = 0, files = 0;
  for (const e of E) {
    if (!e.ok) continue;
    if (e.w < DEUX_SENS) {
      const t = hache(e.nom || String(e.a)) * 6.2832, A = N[e.a], B = N[e.b]; e.sens = (B.x - A.x) * Math.cos(t) + (B.z - A.z) * Math.sin(t) >= 0 ? 1 : -1;
      e.nl = 1; e.off = [0]; e.gare = 0; e.dec = 0; uniques++; files += e.len;
    } else {
      // stationnement : des deux côtés d'une chaussée large ; d'un seul, tiré au sort, dans une rue ordinaire, où
      // les deux files se serrent alors de l'autre côté (dec : décalage de l'axe de roulement)
      e.sens = 0; e.gare = e.eau ? 0 : e.w >= GARE ? 2 : e.w >= GARE_1 ? 1 : 0; e.cote = hache('c' + (e.nom || e.a)) < 0.5 ? 1 : -1; e.dec = e.gare === 1 ? (-e.cote * PLACE) / 2 : 0;
      const wd = e.w - (e.gare === 2 ? PLACE : e.gare === 1 ? PLACE / 2 : 0); e.nl = clamp(Math.floor(wd / FILE), 1, 3); e.off = []; for (let k = 0; k < e.nl; k++) e.off.push(((k + 0.5) * wd) / e.nl);
      files += 2 * e.nl * e.len;
    }
    km += e.len;
  }
  // un carrefour où l'on ne pourrait qu'entrer : un de ses sens uniques est retourné
  const sortie = (K, k) => { const e = E[k]; return e.ok && (e.sens === 0 || (e.sens > 0 ? N[e.a] === K : N[e.b] === K)); };
  const puits = () => N.filter((K) => { const L = K.e.filter((k) => E[k].ok); return L.length && !L.some((k) => sortie(K, k)); });
  for (let passe = 0, encore = true; encore && passe < 12; passe++) { encore = false; for (const K of puits()) { const L = K.e.filter((k) => E[k].ok); let m = L[0]; for (const k of L) if (E[k].w > E[m].w) m = k; E[m].sens = -E[m].sens; encore = true; } }
  // les poches qui restent (deux sens uniques qui se renvoient la voiture) sont rendues aux piétons, et les voies
  // qu'elles laissent sans issue avec elles
  for (let passe = 0; passe < 20; passe++) { const P = puits(); if (!P.length) break; for (const K of P) for (const k of K.e) if (E[k].ok) { E[k].ok = false; E[k].motif = 'sansIssue'; bilan.sansIssue++; }
    for (let encore = true; encore;) { encore = false; for (const e of E) if (e.ok && (degre(N[e.a]) < 2 || degre(N[e.b]) < 2)) { e.ok = false; e.motif = 'sansIssue'; bilan.sansIssue++; encore = true; } } }
  { km = 0; uniques = 0; files = 0; for (const e of E) if (e.ok) { km += e.len; if (e.sens) { uniques++; files += e.len; } else files += 2 * e.nl * e.len; } }
  // rayon des carrefours : la ligne d'arrêt recule de la demi-largeur de la plus large des rues qui s'y croisent
  for (const K of N) {
    const L = K.e.filter((k) => E[k].ok); K.deg = L.length; if (!L.length) continue;
    let h = 0; for (const k of L) h = Math.max(h, E[k].h);
    K.r = K.deg <= 2 ? 2.2 : clamp(1.5 + 0.85 * h, 4.5, 17);
  }
  for (const e of E) { if (!e.ok) continue; let ra = N[e.a].r, rb = N[e.b].r; if (ra + rb > e.len * 0.8) { const f = (e.len * 0.8) / (ra + rb); ra *= f; rb *= f; } e.ra = ra; e.rb = rb; }
  // index : les arêtes qui roulent, par cases de 250 m
  const CASE = 250, cases = new Map();
  E.forEach((e, k) => { if (!e.ok) return; const c = (Math.floor(e.cx / CASE) + 512) * 1024 + Math.floor(e.cz / CASE) + 512; let l = cases.get(c); if (!l) cases.set(c, (l = [])); l.push(k); });
  bilan.roulables = E.filter((e) => e.ok).length; bilan.km = Math.round(km / 1000); bilan.kmFiles = Math.round(files / 1000); bilan.sensUniques = uniques; bilan.carrefours = N.filter((K) => K.deg >= 3).length;
  // demi-largeur de la voie (carte repeinte) et test « sur la chaussée, hors de portée des trottoirs »
  const Lg = v.large, demi = (x, z) => { const i = clamp(Math.floor(((x - C.x0) / (C.x1 - C.x0)) * Lg.w), 0, Lg.w - 1), j = clamp(Math.floor(((z - C.z0) / (C.z1 - C.z0)) * Lg.h), 0, Lg.h - 1); return (Lg.data[j * Lg.w + i] / 255 - 0.5) * 2 * D; };
  // traversées des carrefours, pour les passants : une bande en travers de chaque rue où l'on roule, au ras du
  // carrefour ([x, z, direction de la rue, demi-longueur d'une façade à l'autre, demi-largeur de la chaussée]), rangées
  // par cases de 80 m
  const traversees = [], GR = 80, grille = new Map(), pt = {};
  for (const e of E) { if (!e.ok || e.len < 14) continue;
    for (const [K, sc] of [[N[e.a], e.ra + 1.2], [N[e.b], e.len - e.rb - 1.2]]) { if (K.deg < 3) continue; point(e, sc, 0, pt);
      const t = [pt.x, pt.z, pt.tx, pt.tz, e.h + 1.5, e.w + 0.3], c = (Math.floor(pt.x / GR) + 512) * 1024 + Math.floor(pt.z / GR) + 512; traversees.push(t); let l = grille.get(c); if (!l) grille.set(c, (l = [])); l.push(t); } }
  const traversee = (x, z) => { const i0 = Math.floor(x / GR) + 512, k0 = Math.floor(z / GR) + 512;
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let k = k0 - 1; k <= k0 + 1; k++) { const l = grille.get(i * 1024 + k); if (!l) continue; for (const t of l) { const dx = x - t[0], dz = z - t[1]; if (Math.abs(dx * t[2] + dz * t[3]) < 1.9 && Math.abs(dz * t[2] - dx * t[3]) < t[4]) return true; } }
    return false; };
  bilan.traversees = traversees.length; bilan.ms = Math.round(performance.now() - t0);
  const G = { E, N, cases, CASE, dist, demi, batiEn, bilan, surPonts, ponts, traversees, traversee, bande: 2.2 };
  G.chaussee = (x, z) => { const d = dist(x, z); return d > Math.max(trottoir(demi(x, z)), G.bande) + 0.7; };
  return G;
}

// Point d'une arête à l'abscisse s (depuis A), décalé de o mètres à droite du sens A → B.
function point(e, s, o, out) {
  const S = e.S, n = S.length; let a = 0, b = n - 1;
  if (s <= 0) { a = 0; } else if (s >= e.len) { a = n - 2; } else { while (b - a > 1) { const m = (a + b) >> 1; if (S[m] <= s) a = m; else b = m; } }
  const d = S[a + 1] - S[a] || 1, f = clamp((s - S[a]) / d, 0, 1), P = e.P, Q = e.Q, p = P[a], q = P[a + 1];
  const ax = p[0] + Q[a * 2] * o, az = p[1] + Q[a * 2 + 1] * o, bx = q[0] + Q[a * 2 + 2] * o, bz = q[1] + Q[a * 2 + 3] * o;
  out.x = ax + (bx - ax) * f; out.z = az + (bz - az) * f;
  let tx = q[0] - p[0], tz = q[1] - p[1]; const l = Math.hypot(tx, tz) || 1; out.tx = tx / l; out.tz = tz / l;
  return out;
}

// ---------------------------------------------------------------- les passants sur les trottoirs
// classique : la trame des autres maquettes (toute la rue). On la garde hors de la voirie (promenades, esplanades,
// passerelles) ; dans la rue, les passants tiennent le trottoir, traversent aux carrefours, et gardent toute la largeur
// des voies où rien ne roule.
export function trottoirs(app, o) {
  const G = (app.v89.reseau ||= reseau(app)), { E, N, dist, demi } = G, { x, TT, w, h, cell, R, classique } = o;
  const pres = (p) => p[0] > R.x - 40 && p[0] < R.x + R.w + 40 && p[1] > R.z - 40 && p[1] < R.z + R.h + 40;
  const lire = () => { const im = x.getImageData(0, 0, w, h).data, d = new Uint8Array(w * h); for (let i = 0; i < d.length; i++) d[i] = im[i * 4] > 128 ? 1 : 0; return d; };
  const noir = () => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); };
  // 1. les voies sans voitures, sur toute leur largeur ; les passages cloutés des carrefours ; les trottoirs des ponts
  noir();
  for (const e of E) { if (e.ok || !pres(e.P[0]) || e.h < 0.6) continue; lines(x, TT, [e.P], '#fff', Math.max(2.5, 2 * e.h - 0.6) / cell); }
  const traversees = G.traversees.filter((t) => pres(t)).map((t) => [[t[0] + t[3] * t[4], t[1] - t[2] * t[4]], [t[0] - t[3] * t[4], t[1] + t[2] * t[4]]]);
  x.lineCap = 'butt'; x.strokeStyle = '#fff'; x.lineWidth = Math.max(3.6, 2.2 * cell) / cell; x.beginPath(); for (const t of traversees) { x.moveTo(TT.x(t[0][0]), TT.y(t[0][1])); x.lineTo(TT.x(t[1][0]), TT.y(t[1][1])); } x.stroke();
  const rect = (p, l0, l1) => { const nx = -p.uz, nz = p.ux, a = p.a, bx = a[0] + p.ux * p.l, bz = a[1] + p.uz * p.l; return [[a[0] + nx * l0, a[1] + nz * l0], [bx + nx * l0, bz + nz * l0], [bx + nx * l1, bz + nz * l1], [a[0] + nx * l1, a[1] + nz * l1]]; };
  const roules = G.ponts.filter((p) => G.surPonts.has(p.k) && E.some((e) => e.ok && e.surPont === p.k));
  x.fillStyle = '#fff'; for (const p of roules) for (const s of [-1, 1]) { x.beginPath(); ring(x, TT, rect(p, s * (p.w - 0.4), s * Math.max(p.w - 3.6, p.w * 0.55))); x.fill(); }
  const libres = lire();
  // 2. les tabliers des ponts où l'on roule
  noir(); x.fillStyle = '#fff'; for (const p of roules) { x.beginPath(); ring(x, TT, rect(p, -p.w, p.w)); x.fill(); }
  const tabliers = lire();
  // 3. les emprises bâties (pavillons de l'Exposition posés sur la voie publique, kiosques)
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#000'; x.strokeStyle = '#000'; x.lineWidth = 1.2;
  for (const f of app.foot) { if (f.absent || !pres(f.ring[0])) continue; x.beginPath(); ring(x, TT, f.ring); x.fill(); x.stroke(); }
  const vides = lire();
  // la bande où l'on marche : le trottoir, deux mailles de la trame au moins
  const out = new Uint8Array(w * h), bande = (G.bande = Math.max(2.2, 1.6 * cell + 0.6)); let n = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, X = R.x + (i + 0.5) * cell, Z = R.z + (j + 0.5) * cell, d = dist(X, Z);
    let ok;
    if (tabliers[k]) ok = libres[k];
    else if (d <= 0.25) ok = classique[k];
    else ok = (d < Math.max(trottoir(demi(X, Z)), bande) || libres[k]) && vides[k];
    out[k] = ok ? 1 : 0; n += out[k];
  }
  G.bilan.trottoirs = n;
  return out;
}

// ---------------------------------------------------------------- les véhicules
const ombreGeo = (hx, hz) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-hx, 0.04, -hz, -hx, 0.04, hz, hx, 0.04, hz, -hx, 0.04, -hz, hx, 0.04, hz, hx, 0.04, -hz], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0], 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3)); return g; };
// Le faisceau des phares : une nappe de lumière jaune posée sur la chaussée, devant la voiture.
const faisceauGeo = (z0, lg, l) => { const g = new THREE.BufferGeometry(), z1 = z0 + lg; g.setAttribute('position', new THREE.Float32BufferAttribute([-l * 0.5, 0.07, z0, l, 0.07, z1, l * 0.5, 0.07, z0, -l * 0.5, 0.07, z0, -l, 0.07, z1, l, 0.07, z1], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1], 2)); return g; };
function faisceauTexture() {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 64; const c = cv.getContext('2d'), im = c.createImageData(32, 64);
  for (let j = 0; j < 64; j++) for (let i = 0; i < 32; i++) { const u = (i + 0.5) / 32 - 0.5, t = 1 - (j + 0.5) / 64, a = Math.max(0, 1 - 4 * u * u) * Math.pow(1 - t, 1.6) * Math.min(1, t * 9 + 0.25), k = (j * 32 + i) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = 255 * a; im.data[k + 3] = 255; }
  c.putImageData(im, 0, 0); return new THREE.CanvasTexture(cv);
}
// Les passages cloutés : deux rangées de clous d'acier à tête ronde en travers de la chaussée (un mètre de motif).
function clousTexture() {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128; const c = cv.getContext('2d');
  c.clearRect(0, 0, 32, 128); c.fillStyle = 'rgba(232,232,226,0.95)';
  for (const y of [9, 119]) for (const x of [8, 24]) { c.beginPath(); c.arc(x, y, 4.2, 0, 7); c.fill(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const lin = (v) => Math.pow(v / 255, 2.2);
const angle = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
// Matrice d'un véhicule : cap h, pente p (l'avant monte), recul oz le long de son axe.
function poser(m, k, x, y, z, h, p, oz) {
  const sh = Math.sin(h), ch = Math.cos(h), sp = Math.sin(p), cp = Math.cos(p), fx = sh * cp, fy = sp, fz = ch * cp;
  m[k] = ch; m[k + 1] = 0; m[k + 2] = -sh; m[k + 3] = 0;
  m[k + 4] = -sh * sp; m[k + 5] = cp; m[k + 6] = -ch * sp; m[k + 7] = 0;
  m[k + 8] = fx; m[k + 9] = fy; m[k + 10] = fz; m[k + 11] = 0;
  m[k + 12] = x - fx * oz; m[k + 13] = y - fy * oz; m[k + 14] = z - fz * oz; m[k + 15] = 1;
}

class Circulation {
  constructor(app, G) {
    this.app = app; this.G = G; this.r = mulberry32(1937); this.first = true; this.frame = 0; this.temps = 0;
    const mobile = app.mobile, max = (this.max = mobile ? 170 : 620), M = (this.M = modeles());
    this.group = new THREE.Group(); app.bati.add(this.group);
    const mat = app.people.mat, ombreMat = app.people.blobMat;
    this.feuxMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    this.faisceauMat = new THREE.MeshBasicMaterial({ map: faisceauTexture(), color: 0xffd684, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const instancie = (geo, n) => {
      const g = geo.clone(), anim = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2); anim.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aAnim', anim);
      const im = new THREE.InstancedMesh(g, mat, n); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); im.instanceColor.setUsage(THREE.DynamicDrawUsage); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.count = 0;
      return { im, anim };
    };
    const jumeau = (geo, src, matiere, ordre) => { const b = new THREE.InstancedMesh(geo, matiere, src.instanceMatrix.count); b.instanceMatrix = src.instanceMatrix; b.frustumCulled = false; b.renderOrder = ordre; b.count = 0; return b; };
    const garesMax = (this.garesMax = mobile ? 160 : 700);
    for (const m of M) {
      m.cap = Math.ceil(max * m.part * 1.25) + 6; m.s = instancie(m.geo, m.cap); m.ombreIm = jumeau(ombreGeo(m.ombre[0], m.ombre[1]), m.s.im, ombreMat, 1);
      this.group.add(m.s.im, m.ombreIm);
      if (m.feux) { m.feuxIm = jumeau(m.feux, m.s.im, this.feuxMat, 0); m.faisceauIm = jumeau(faisceauGeo(m.av - 0.2, 15, 2.6), m.s.im, this.faisceauMat, 2); m.feuxIm.visible = m.faisceauIm.visible = false; this.group.add(m.feuxIm, m.faisceauIm); }
      if (m.gare > 0) { m.capG = Math.ceil(garesMax * m.gare) + 4; m.g = instancie(m.geo, m.capG); m.ombreG = jumeau(ombreGeo(m.ombre[0], m.ombre[1]), m.g.im, ombreMat, 1); this.group.add(m.g.im, m.ombreG); }
    }
    // les passages cloutés des carrefours proches : une nappe refaite quand le point de vue se déplace
    { const n = (this.clousMax = mobile ? 120 : 420), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 18), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 12), 2));
      const nor = new Float32Array(n * 18); for (let i = 1; i < nor.length; i += 3) nor[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setDrawRange(0, 0);
      this.clous = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: clousTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      this.clous.frustumCulled = false; this.clous.receiveShadow = true; this.clous.renderOrder = 1; this.group.add(this.clous); }
    // chaque véhicule a son modèle une fois pour toutes : la suite est bien mêlée, quel que soit le nombre en service
    const cumul = []; { let s = 0; for (const m of M) { s += m.part; cumul.push(s); } for (let k = 0; k < cumul.length; k++) cumul[k] /= s; }
    const F = (n) => new Float32Array(n), I = (n) => new Int32Array(n);
    this.mod = new Uint8Array(max); this.e = I(max).fill(-1); this.dir = new Int8Array(max); this.file = new Uint8Array(max); this.s = F(max); this.v = F(max); this.vm = F(max);
    this.etat = new Uint8Array(max); this.ne = I(max).fill(-1); this.nd = new Int8Array(max); this.nf = new Uint8Array(max); this.noeud = I(max).fill(-1); this.attente = F(max); this.vt = F(max);
    this.b = F(max * 8); this.x = F(max); this.z = F(max); this.y = F(max); this.h = F(max); this.p = F(max); this.yc = F(max); this.pc = F(max); this.ph = F(max); this.col = F(max * 3); this.compte = new Uint16Array(M.length);
    const r = this.r;
    for (let i = 0; i < max; i++) {
      const u = (i * 0.61803398875) % 1; let k = 0; while (k < cumul.length - 1 && u > cumul[k]) k++;
      // un modèle plein cède sa place au plus courant
      if (this.compte[k] >= M[k].cap) k = 0; this.compte[k]++; this.mod[i] = k;
      const m = M[k], c = m.teintes ? m.teintes[(r() * m.teintes.length) | 0] : [255, 255, 255], q = 0.9 + r() * 0.2;
      this.col[i * 3] = lin(Math.min(255, c[0] * q)); this.col[i * 3 + 1] = lin(Math.min(255, c[1] * q)); this.col[i * 3 + 2] = lin(Math.min(255, c[2] * q));
      this.vm[i] = m.v[0] + r() * (m.v[1] - m.v[0]);
    }
    this.files = new Map(); this.sel = []; this.cumul = []; this.poids = 0; this.kmFiles = 0; this.selX = 1e9; this.selZ = 1e9; this.selR = 0;
    this.lastX = 1e9; this.lastZ = 1e9; this.actifs = 0; this.gares = 0; this.pt = {}; this.pt2 = {}; this.pietons = new Float32Array(800); this.nPietons = 0; this.cedes = 0;
  }

  // Les arêtes à portée du point de vue : tirage au sort pondéré (longueur, files, largeur) et stationnement.
  choisir(cx, cz, R) {
    const { E, cases, CASE } = this.G, sel = (this.sel = []), cumul = (this.cumul = []); let poids = 0, km = 0;
    const i0 = Math.floor((cx - R) / CASE), i1 = Math.floor((cx + R) / CASE), k0 = Math.floor((cz - R) / CASE), k1 = Math.floor((cz + R) / CASE), R2 = (R + 40) * (R + 40);
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) { const l = cases.get((i + 512) * 1024 + k + 512); if (!l) continue;
      for (const q of l) { const e = E[q], dx = e.cx - cx, dz = e.cz - cz; if (dx * dx + dz * dz > R2 || e.len - e.ra - e.rb < 5) continue; const nf = e.sens ? 1 : 2 * e.nl; poids += e.len * nf * (0.4 + e.w / 4); km += e.len * nf; sel.push(q); cumul.push(poids); } }
    this.poids = poids; this.kmFiles = km / 1000; this.selX = cx; this.selZ = cz; this.selR = R;
    this.garer(cx, cz, Math.min(R, this.app.mobile ? 300 : 560));
    this.clouter(cx, cz, Math.min(R, 360));
  }

  // Passages cloutés à portée : un quadrilatère par traversée, posé sur le sol à ses quatre coins.
  clouter(cx, cz, R) {
    const app = this.app, g = this.clous.geometry, P = g.attributes.position.array, U = g.attributes.uv.array, R2 = R * R; let n = 0;
    for (const t of this.G.traversees) {
      const dx = t[0] - cx, dz = t[1] - cz; if (dx * dx + dz * dz > R2) continue; if (n >= this.clousMax) break;
      const l = t[5], nx = -t[3], nz = t[2], ax = t[2] * 1.9, az = t[3] * 1.9, C = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
      for (let k = 0; k < 6; k++) { const [a, b] = C[k], x = t[0] + nx * l * a + ax * b, z = t[1] + nz * l * a + az * b, o = n * 18 + k * 3; P[o] = x; P[o + 1] = app.heightAt(x, z) + 0.05; P[o + 2] = z; U[n * 12 + k * 2] = (a + 1) * l; U[n * 12 + k * 2 + 1] = (b + 1) / 2; }
      n++;
    }
    g.setDrawRange(0, n * 6); g.attributes.position.needsUpdate = true; g.attributes.uv.needsUpdate = true; this.passages = n;
  }

  // Voitures en stationnement d'une arête : tirées une fois, toujours les mêmes ([x, z, cap, y, pente, modèle, teinte] × n).
  places(e, k) {
    if (e.places) return e.places;
    const out = [], r = mulberry32(7919 + k * 31), M = this.M, pt = this.pt, app = this.app, gm = M.filter((m) => m.gare > 0), tot = gm.reduce((s, m) => s + m.gare, 0);
    if (e.gare) for (const cote of e.gare === 2 ? [1, -1] : [e.cote]) {
      let s = e.ra + 5 + r() * 26; const fin = e.len - e.rb - 5, plein = 10 + r() * 22;      // d'une rue à l'autre, on se gare plus ou moins
      while (s < fin) {
        let u = r() * tot, m = gm[0]; for (const q of gm) { if (u < q.gare) { m = q; break; } u -= q.gare; }
        point(e, s, cote * (e.w - 0.98), pt);
        if (!this.G.batiEn(pt.x, pt.z)) {
          const tx = pt.tx * cote, tz = pt.tz * cote, y0 = app.heightAt(pt.x + tx * 1.3, pt.z + tz * 1.3), y1 = app.heightAt(pt.x - tx * 1.3, pt.z - tz * 1.3);
          out.push(pt.x, pt.z, Math.atan2(tx, tz), (y0 + y1) / 2, Math.atan2(y0 - y1, 2.6), M.indexOf(m), m.teintes ? (r() * m.teintes.length) | 0 : -1);
        }
        s += m.av + m.ar + 1 + -Math.log(1 - r() * 0.98) * plein;
      }
    }
    return (e.places = new Float32Array(out));
  }
  garer(cx, cz, R) {
    const { E } = this.G, M = this.M, R2 = R * R, n = new Uint16Array(M.length); let total = 0;
    for (const q of this.sel) {
      const e = E[q]; if (!e.gare) continue; const P = this.places(e, q);
      for (let i = 0; i < P.length; i += 7) {
        const dx = P[i] - cx, dz = P[i + 1] - cz; if (dx * dx + dz * dz > R2) continue;
        const k = P[i + 5], m = M[k]; if (n[k] >= m.capG || total >= this.garesMax) continue;
        poser(m.g.im.instanceMatrix.array, n[k] * 16, P[i], P[i + 3], P[i + 1], P[i + 2], P[i + 4], 0);
        const c = m.teintes ? m.teintes[P[i + 6]] : [255, 255, 255], col = m.g.im.instanceColor.array; col[n[k] * 3] = lin(c[0]); col[n[k] * 3 + 1] = lin(c[1]); col[n[k] * 3 + 2] = lin(c[2]);
        n[k]++; total++;
      }
    }
    M.forEach((m, k) => { if (!m.g) return; m.g.im.count = n[k]; m.ombreG.count = n[k]; m.g.im.instanceMatrix.needsUpdate = true; m.g.im.instanceColor.needsUpdate = true; });
    this.gares = total;
  }

  cleFile(e, dir, f) { return e * 8 + (dir > 0 ? 4 : 0) + f; }
  // Décalage d'une file à droite du sens de marche, rapporté au sens A → B.
  decal(e, dir, f) { return e.dec + e.off[Math.min(f, e.nl - 1)] * dir; }
  debut(e, dir) { return dir > 0 ? e.ra : e.rb; }
  fin(e, dir) { return e.len - (dir > 0 ? e.rb : e.ra); }
  // Position sur une file : s est compté dans le sens de marche.
  surFile(e, dir, f, s, out) { point(e, dir > 0 ? s : e.len - s, this.decal(e, dir, f), out); out.tx *= dir; out.tz *= dir; return out; }

  // La suite du trajet, choisie en entrant sur une arête : au bout, on prend plutôt tout droit, plutôt la voie large.
  suite(i) {
    const { E, N } = this.G, k = this.e[i], e = E[k], dir = this.dir[i], K = N[dir > 0 ? e.b : e.a], m = this.M[this.mod[i]], r = this.r, pt = this.pt2;
    this.surFile(e, dir, 0, this.fin(e, dir), pt); const tx = pt.tx, tz = pt.tz;
    let total = 0, choix = -1, cd = 0; const cand = [];
    for (const q of K.e) {
      const f = E[q]; if (!f.ok || q === k) continue; const nd = N[f.a] === K ? 1 : -1; if (f.sens && f.sens !== nd) continue;
      this.surFile(f, nd, 0, this.debut(f, nd), pt); const c = Math.max(0, tx * pt.tx + tz * pt.tz);
      const p = (0.25 + f.w) * (0.12 + 2.4 * c * c) * (f.w < m.lw ? 0.02 : 1); total += p; cand.push(q, nd, p);
    }
    if (cand.length) { let u = r() * total; for (let j = 0; j < cand.length; j += 3) { u -= cand[j + 2]; if (u <= 0 || j === cand.length - 3) { choix = cand[j]; cd = cand[j + 1]; break; } } }
    else if (!e.sens) { choix = k; cd = -dir; }                                     // demi-tour, faute de mieux
    this.ne[i] = choix; this.nd[i] = cd;
    if (choix >= 0) { const f = E[choix]; this.nf[i] = m.nom === 'autobus' || m.nom === 'attelage' ? f.nl - 1 : Math.min(f.nl - 1, f.nl > e.nl ? (r() * f.nl) | 0 : this.file[i]); }
  }

  naitre(i, cx, cz, R, loin) {
    const { E } = this.G, r = this.r, m = this.M[this.mod[i]], pt = this.pt; this.e[i] = -1;
    if (!this.sel.length) return;
    for (let essai = 0; essai < 6; essai++) {
      let u = r() * this.poids, a = 0, b = this.cumul.length - 1; while (a < b) { const c = (a + b) >> 1; if (this.cumul[c] < u) a = c + 1; else b = c; }
      const k = this.sel[a], e = E[k]; if (e.w < m.lw) continue;
      const dir = e.sens || (r() < 0.5 ? 1 : -1), f = m.nom === 'autobus' || m.nom === 'attelage' ? e.nl - 1 : (r() * e.nl) | 0, s0 = this.debut(e, dir) + 1, s1 = this.fin(e, dir) - 1; if (s1 - s0 < 2) continue;
      const s = s0 + r() * (s1 - s0); this.surFile(e, dir, f, s, pt);
      const d = Math.hypot(pt.x - cx, pt.z - cz); if (d > R || (loin && d < 0.55 * R)) continue;
      const L = this.files.get(this.cleFile(k, dir, f)); let libre = true; if (L) for (const j of L) if (Math.abs(this.s[j] - s) < 11) { libre = false; break; } if (!libre) continue;
      this.e[i] = k; this.dir[i] = dir; this.file[i] = f; this.s[i] = s; this.v[i] = this.vm[i] * 0.8; this.etat[i] = 0; this.noeud[i] = -1; this.attente[i] = 0;
      this.x[i] = pt.x; this.z[i] = pt.z; this.h[i] = Math.atan2(pt.tx, pt.tz); this.y[i] = this.yc[i] = this.app.heightAt(pt.x, pt.z); this.p[i] = this.pc[i] = 0; this.ph[i] = r() * 6.28;
      if (L) L.push(i); else this.files.set(this.cleFile(k, dir, f), [i]);
      this.suite(i);
      return;
    }
  }

  // Le virage : une courbe de Bézier de la ligne d'arrêt à l'entrée de la file suivante.
  virer(i) {
    const { E } = this.G, e = E[this.e[i]], f = E[this.ne[i]], pt = this.pt, b = this.b, o = i * 8;
    this.surFile(e, this.dir[i], this.file[i], this.fin(e, this.dir[i]), pt); const x0 = pt.x, z0 = pt.z, ax = pt.tx, az = pt.tz;
    this.surFile(f, this.nd[i], this.nf[i], this.debut(f, this.nd[i]), pt); const x1 = pt.x, z1 = pt.z, bx = pt.tx, bz = pt.tz;
    const dx = x1 - x0, dz = z1 - z0, d = Math.hypot(dx, dz), det = ax * bz - az * bx; let cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (ax * bx + az * bz < -0.6) { const l = Math.min(9, d * 0.9 + 2); cx += ax * l; cz += az * l; }               // demi-tour : la courbe déborde vers l'avant
    else if (Math.abs(det) > 0.08) { const ta = (dx * bz - dz * bx) / det, tb = (ax * dz - az * dx) / det; if (ta > 0 && tb > 0 && ta < 3 * d + 3 && tb < 3 * d + 3) { cx = x0 + ax * ta; cz = z0 + az * ta; } }
    b[o] = x0; b[o + 1] = z0; b[o + 2] = cx; b[o + 3] = cz; b[o + 4] = x1; b[o + 5] = z1;
    let L = 0, px = x0, pz = z0; for (let k = 1; k <= 6; k++) { const t = k / 6, u = 1 - t, qx = u * u * x0 + 2 * u * t * cx + t * t * x1, qz = u * u * z0 + 2 * u * t * cz + t * t * z1; L += Math.hypot(qx - px, qz - pz); px = qx; pz = qz; }
    b[o + 6] = Math.max(0.5, L); b[o + 7] = 0; this.etat[i] = 1;
  }

  update(dt) {
    const app = this.app, rig = app.rig, walk = rig.mode === 'walk', dist = walk ? 0 : rig.cur.dist, P = app.people;
    const show = P.enabled && dist < 1700 && !app.inside;
    if (this.group.visible !== show) this.group.visible = show;
    if (!show) { this.actifs = 0; return; }
    dt = Math.min(dt, 0.1); this.temps += dt; this.frame++;
    const { E, N } = this.G, M = this.M, cx = walk ? rig.walk.x : rig.target.x, cz = walk ? rig.walk.z : rig.target.z, R = walk ? 330 : clamp(dist * 0.8, 240, 760);
    const frais = this.first || Math.hypot(cx - this.lastX, cz - this.lastZ) > 90; this.lastX = cx; this.lastZ = cz;
    if (frais || Math.hypot(cx - this.selX, cz - this.selZ) > 60 || Math.abs(R - this.selR) > 40) this.choisir(cx, cz, R);
    const jour = app.sky.day, veut = Math.min(this.max, Math.round(this.kmFiles * DENSITE * (0.3 + 0.7 * jour) * (app.crowdScale || 1)));
    const nuit = jour < 0.3; for (const m of M) if (m.feuxIm && m.feuxIm.visible !== nuit) m.feuxIm.visible = m.faisceauIm.visible = nuit;
    // les passants engagés sur une traversée : les voitures leur cèdent le passage
    if (this.frame % 2 === 0) {
      const Q = this.pietons; let q = 0; const lim = R + 30;
      for (const p of P.pools) { if (p.kind !== 'man' && p.kind !== 'robe') continue; const na = Math.min(p.active, p.n);
        for (let i = 0; i < na && q < Q.length - 1; i++) { if (!p.ok[i]) continue; const x = p.x[i], z = p.z[i]; if (Math.abs(x - cx) > lim || Math.abs(z - cz) > lim) continue; if (this.G.chaussee(x, z) && this.G.traversee(x, z)) { Q[q++] = x; Q[q++] = z; } } }
      this.nPietons = q;
    }
    const Q = this.pietons, nq = this.nPietons;
    const pieton = (i, m, v) => { const fx = Math.sin(this.h[i]), fz = Math.cos(this.h[i]), x = this.x[i], z = this.z[i], loin = m.av + 2.2 + v * 0.9, cote = m.l + 0.55; let d = 1e9;
      for (let k = 0; k < nq; k += 2) { const dx = Q[k] - x, dz = Q[k + 1] - z, a = dx * fx + dz * fz; if (a < m.av - 0.6 || a > loin) continue; if (Math.abs(dz * fx - dx * fz) < cote && a < d) d = a; } return d - m.av; };
    // les files : qui roule où, pour garder ses distances (un véhicule qui tourne compte déjà dans la file où il entre)
    const files = this.files; files.clear();
    const ranger = (cle, i) => { const l = files.get(cle); if (l) l.push(i); else files.set(cle, [i]); };
    for (let i = 0; i < veut; i++) { if (this.e[i] < 0) continue; if (this.etat[i]) { this.s[i] = this.debut(E[this.ne[i]], this.nd[i]) - (1 - this.b[i * 8 + 7]) * this.b[i * 8 + 6]; ranger(this.cleFile(this.ne[i], this.nd[i], this.nf[i]), i); } else ranger(this.cleFile(this.e[i], this.dir[i], this.file[i]), i); }
    const R2 = (R + 90) * (R + 90), pt = this.pt, DEC = 2.4, n = new Uint16Array(M.length);
    for (let i = 0; i < veut; i++) {
      if (this.e[i] >= 0) { const dx = this.x[i] - cx, dz = this.z[i] - cz; if (dx * dx + dz * dz > R2) { this.lacher(i); this.e[i] = -1; } }
      if (this.e[i] < 0) { this.naitre(i, cx, cz, R, !frais); if (this.e[i] < 0) continue; }
      const m = M[this.mod[i]]; let v = this.v[i];
      if (this.etat[i] === 0) {
        const k = this.e[i], e = E[k], dir = this.dir[i], fin = this.fin(e, dir), K = N[dir > 0 ? e.b : e.a], ne = this.ne[i];
        let cible = this.vm[i] * (e.sens ? 0.72 : 1);
        // la voiture qui précède, sur la même file
        const L = files.get(this.cleFile(k, dir, this.file[i])); let devant = -1, sd = 1e9; if (L) for (const j of L) if (j !== i && this.s[j] > this.s[i] && this.s[j] < sd) { sd = this.s[j]; devant = j; }
        if (devant >= 0) { const g = sd - this.s[i] - M[this.mod[devant]].ar - m.av - 1.6; cible = Math.min(cible, Math.sqrt(Math.max(0, this.v[devant] * this.v[devant] + 2 * DEC * g))); if (g < 0) cible = 0; }
        // le carrefour : on ralentit pour tourner ; on s'arrête s'il est pris, ou si la file d'en face est pleine
        const reste = fin - this.s[i]; let passe = ne >= 0;
        if (ne >= 0) {
          // vitesse dans le virage : presque pleine tout droit ; sinon celle que permet son rayon (corde / angle)
          const f = E[ne], nd = this.nd[i]; this.surFile(e, dir, 0, fin, pt); const tx = pt.tx, tz = pt.tz, x0 = pt.x, z0 = pt.z; this.surFile(f, nd, 0, this.debut(f, nd), pt);
          const c = ne === k ? -1 : tx * pt.tx + tz * pt.tz, c0 = Math.max(0, c), ray = (Math.hypot(pt.x - x0, pt.z - z0) + 2) / Math.max(0.3, Math.acos(clamp(c, -1, 1)));
          const vt = Math.min(this.vm[i], Math.max(2.6 + (this.vm[i] - 2.6) * c0 * c0, Math.sqrt(1.7 * ray))); this.vt[i] = vt;
          cible = Math.min(cible, Math.sqrt(vt * vt + 2 * DEC * Math.max(0, reste)));
          if (reste < 26) {
            const L2 = files.get(this.cleFile(ne, nd, this.nf[i])); if (L2) { const s0 = this.debut(f, nd); for (const j of L2) if (j !== i && this.s[j] - M[this.mod[j]].ar < s0 + m.av + 1.2 && this.s[j] > s0 - 30) { passe = false; break; } }
            if (passe && K.deg >= 3) {
              // le carrefour est à qui l'a pris. Passent quand même : la voiture qui suit celle qui le tient, et celle
              // qui vient d'en face par la même rue ; une voiture presque sortie, ou qui n'avance plus, ne le tient plus
              const nk = dir > 0 ? e.b : e.a, q = K.q; let libre = q < 0 || q === i || q >= veut || this.e[q] < 0 || this.noeud[q] !== nk;
              if (!libre) { const meme = this.e[q] === k && this.dir[q] === dir, face = this.ne[q] === k && this.e[q] === ne; libre = meme || face || (this.etat[q] === 1 ? this.b[q * 8 + 7] > 0.6 : this.temps - K.t > 6); }
              if (libre) { if (reste < 4 + v * 1.6) { K.q = i; K.t = this.temps; this.noeud[i] = nk; } } else passe = false;
            }
            if (!passe) { if (this.noeud[i] >= 0) this.lacher(i); if (this.attente[i] > 12) passe = true; }      // bloquée, elle rend le carrefour ; à la longue, elle force le passage
          }
        }
        if (!passe) cible = Math.min(cible, Math.sqrt(2 * DEC * Math.max(0, reste - 0.5)));
        if (nq) { const g = pieton(i, m, v); if (g < 1e8) { cible = Math.min(cible, Math.sqrt(2 * DEC * Math.max(0, g - 1.2))); this.cedes++; } }
        v += clamp(cible - v, -5 * dt, 1.5 * dt); if (v < 0) v = 0;
        let s = this.s[i] + v * dt;
        if (v < 0.25) this.attente[i] += dt; else this.attente[i] = 0;
        if (s >= fin) {
          if (ne < 0) { this.lacher(i); this.e[i] = -1; continue; }                 // nulle part où aller : la voiture est retirée
          if (passe) { this.s[i] = fin; this.v[i] = v; this.virer(i); }
          else { s = fin; v = 0; }
        }
        if (this.etat[i] === 0) {
          this.s[i] = s; this.surFile(e, dir, this.file[i], s, pt); this.x[i] = pt.x; this.z[i] = pt.z;
          this.h[i] += angle(Math.atan2(pt.tx, pt.tz), this.h[i]) * Math.min(1, dt * 7);
          if (this.attente[i] > 40) { this.lacher(i); this.e[i] = -1; continue; }   // bloquée pour de bon : elle laisse la place
        }
      }
      if (this.etat[i] === 1) {
        const b = this.b, o = i * 8; let cible = this.vt[i] || 2.6;
        if (nq) { const g = pieton(i, m, v); if (g < 1e8) { cible = Math.min(cible, Math.sqrt(2 * DEC * Math.max(0, g - 1.2))); this.cedes++; } }
        v += clamp(cible - v, -5 * dt, 1.5 * dt); if (v < 0) v = 0;
        let t = b[o + 7] + (v * dt) / b[o + 6];
        if (t >= 1) {
          this.lacher(i); const f = E[this.ne[i]]; this.e[i] = this.ne[i]; this.dir[i] = this.nd[i]; this.file[i] = this.nf[i]; this.etat[i] = 0; this.attente[i] = 0;
          this.s[i] = this.debut(f, this.dir[i]) + (t - 1) * b[o + 6]; this.suite(i);
          this.surFile(f, this.dir[i], this.file[i], this.s[i], pt); this.x[i] = pt.x; this.z[i] = pt.z; this.h[i] = Math.atan2(pt.tx, pt.tz);
        } else {
          b[o + 7] = t; const u = 1 - t;
          this.x[i] = u * u * b[o] + 2 * u * t * b[o + 2] + t * t * b[o + 4]; this.z[i] = u * u * b[o + 1] + 2 * u * t * b[o + 3] + t * t * b[o + 5];
          const tx = u * (b[o + 2] - b[o]) + t * (b[o + 4] - b[o + 2]), tz = u * (b[o + 3] - b[o + 1]) + t * (b[o + 5] - b[o + 3]); if (tx * tx + tz * tz > 1e-6) this.h[i] = Math.atan2(tx, tz);
        }
      }
      this.v[i] = v;
      // le sol : relevé une image sur trois, sous les deux essieux
      const x = this.x[i], z = this.z[i], h = this.h[i];
      if ((this.frame + i) % 3 === 0 || this.first) { const l = (m.av + m.ar) * 0.36, sx = Math.sin(h) * l, sz = Math.cos(h) * l, y0 = app.heightAt(x + sx, z + sz), y1 = app.heightAt(x - sx, z - sz); this.yc[i] = (y0 + y1) / 2; this.pc[i] = Math.atan2(y0 - y1, 2 * l); }
      const a = Math.min(1, dt * 10 + (this.first ? 1 : 0)); this.y[i] += (this.yc[i] - this.y[i]) * a; this.p[i] += (this.pc[i] - this.p[i]) * a;
      const k = this.mod[i], q = n[k]; if (q >= m.cap) continue;
      poser(m.s.im.instanceMatrix.array, q * 16, x, this.y[i], z, h, this.p[i], m.oz || 0);
      const c = m.s.im.instanceColor.array; c[q * 3] = this.col[i * 3]; c[q * 3 + 1] = this.col[i * 3 + 1]; c[q * 3 + 2] = this.col[i * 3 + 2];
      if (m.pas) { this.ph[i] += v * dt * m.pas; m.s.anim.array[q * 2] = this.ph[i]; m.s.anim.array[q * 2 + 1] = v > 0.2 ? m.amp : 0; }
      n[k]++;
    }
    let total = 0;
    M.forEach((m, k) => { m.s.im.count = n[k]; m.ombreIm.count = n[k]; if (m.feuxIm) m.feuxIm.count = m.faisceauIm.count = n[k]; m.s.im.instanceMatrix.needsUpdate = true; m.s.im.instanceColor.needsUpdate = true; if (m.pas) m.s.anim.needsUpdate = true; total += n[k]; });
    this.actifs = total; this.veut = veut; this.first = false;
  }
  // Rend le carrefour que le véhicule tenait.
  lacher(i) { const k = this.noeud[i]; if (k >= 0) { const K = this.G.N[k]; if (K.q === i) K.q = -1; this.noeud[i] = -1; } }
}

// Les passants dans toute la ville. La trame fine ne couvre que le quartier de l'Exposition (app.navRect) ; au-delà,
// où les autres maquettes n'ont personne, la même règle est lue directement dans la carte de voirie : on marche sur le
// trottoir et aux traversées des carrefours. La hauteur du sol y est gardée par cases de 3 m.
function etendrePassants(app, G) {
  const P = app.people, nav0 = P.nav.bind(P), sol0 = P.groundY.bind(P), x0 = P.x0, z0 = P.z0, x1 = x0 + P.nw * P.nc, z1 = z0 + P.nh * P.nc, C = app.monde.cadre, m = 60, cache = new Map();
  const dedans = (x, z) => x >= x0 && x < x1 && z >= z0 && z < z1;
  const libre = (x, z) => {
    if (x < C.x0 + m || x > C.x1 - m || z < C.z0 + m || z > C.z1 - m) return 0;
    const d = G.dist(x, z); if (d < 0.5) return 0;
    return (d < Math.max(trottoir(G.demi(x, z)), 2.4) || G.traversee(x, z)) && !app.footAt(x, z) ? 1 : 0;      // ni dans un édifice posé sur la voie publique
  };
  // la réponse est gardée par dalles de 64 m, au mètre : 0 inconnu, 1 non, 2 oui
  const DALLE = 64, dalles = new Map();
  P.nav = (x, z) => {
    if (dedans(x, z)) return nav0(x, z);
    const i = Math.floor(x), j = Math.floor(z), k = (Math.floor(i / DALLE) + 512) * 1024 + Math.floor(j / DALLE) + 512; let d = dalles.get(k);
    if (!d) { if (dalles.size > 1200) dalles.clear(); dalles.set(k, (d = new Uint8Array(DALLE * DALLE))); }
    const q = (((j % DALLE) + DALLE) % DALLE) * DALLE + (((i % DALLE) + DALLE) % DALLE); let v = d[q];
    if (!v) v = d[q] = libre(i + 0.5, j + 0.5) ? 2 : 1;
    return v === 2 ? 1 : 0;
  };
  P.groundY = (x, z) => {
    if (dedans(x, z)) return sol0(x, z);
    const i = Math.floor(x / 3), j = Math.floor(z / 3), k = (i + 4096) * 8192 + j + 4096; let v = cache.get(k);
    if (v === undefined) { if (cache.size > 250000) cache.clear(); v = Math.max(0.2, app.heightAt(i * 3 + 1.5, j * 3 + 1.5)); cache.set(k, v); }
    return v;
  };
}

// La circulation démarre à la première image, quand les passants (dont elle partage la matière) et le groupe de la
// ville existent.
export function preparerCirculation(app) { app.v89.reseau = reseau(app); }
export function lancerCirculation(app) {
  const V = app.v89; V.reseau ||= reseau(app);
  app.on('frame', (dt) => { if (!app.circulation) { if (!app.people || !app.bati) return; etendrePassants(app, V.reseau); app.circulation = new Circulation(app, V.reseau); } app.circulation.update(dt); });
}
