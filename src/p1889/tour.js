// La tour de trois cents mètres et son chantier, du 28 janvier 1887 au 31 mars 1889.
// La tour est modelée entière ; une « cote de montage » la coupe à la hauteur atteinte à la date choisie (les matières
// rejettent tout ce qui dépasse). Échafaudages de bois, grues grimpantes et socles de maçonnerie suivent la même date.
// Dates : site officiel de la tour Eiffel et photographies du chantier par Théophile Féau. Forme : évocation à partir
// des cotes connues (125 m d'empattement, étages à 57,6 m, 115,7 m et 276,1 m, sommet à 300 m).
import * as THREE from 'three';
import { Builder, box, cyl, cone, rgb } from '../builder.js';
import { expoXZ, EXPO } from './data.js';

export const JOUR = (a, m, j) => Math.round((Date.UTC(a, m - 1, j) - Date.UTC(1887, 0, 1)) / 864e5);
export const DATE = (j) => new Date(Date.UTC(1887, 0, 1) + j * 864e5);
export const FIN = JOUR(1889, 5, 6);                    // 6 mai 1889 : ouverture de l'Exposition universelle
// Ce que l'on voit du chantier, jour après jour.
export const ETAPES = [
  [0, 'Le Champ-de-Mars avant le chantier'],
  [JOUR(1887, 1, 28), 'Premiers coups de pioche : les fondations'],
  [JOUR(1887, 7, 1), 'Le montage des piles commence'],
  [JOUR(1887, 12, 7), 'Les quatre piles se rejoignent au premier étage'],
  [JOUR(1888, 4, 1), 'Premier étage achevé, à 57 mètres'],
  [JOUR(1888, 8, 14), 'Deuxième étage, à 115 mètres'],
  [JOUR(1888, 12, 26), 'La tour dépasse 250 mètres'],
  [JOUR(1889, 3, 31), 'Le drapeau est hissé au sommet, à 300 mètres'],
  [FIN, 'Ouverture de l’Exposition universelle'],
];
// Hauteur montée (m) : jalons du chantier, reliés en ligne droite.
const MONTEE = [[JOUR(1887, 7, 1), 0], [JOUR(1887, 10, 8), 28], [JOUR(1887, 12, 7), 55], [JOUR(1888, 4, 1), 62.5], [JOUR(1888, 5, 10), 78], [JOUR(1888, 8, 14), 120], [JOUR(1888, 10, 14), 170], [JOUR(1888, 11, 14), 205],
  [JOUR(1888, 12, 26), 250], [JOUR(1889, 1, 20), 276], [JOUR(1889, 2, 12), 287], [JOUR(1889, 3, 12), 297], [JOUR(1889, 3, 31), 330]];
export function hauteur(j) {
  if (j < MONTEE[0][0]) return -1;
  for (let i = 1; i < MONTEE.length; i++) if (j <= MONTEE[i][0]) { const a = MONTEE[i - 1], b = MONTEE[i]; return a[1] + ((b[1] - a[1]) * (j - a[0])) / (b[0] - a[0]); }
  return 400;
}

const E1 = 57.6, E2 = 115.7, E3 = 276.1;
const FER = rgb(134, 66, 48), FER_SOMBRE = rgb(96, 50, 40), BOIS = rgb(196, 160, 112), MACONNERIE = rgb(206, 196, 172);
// Axe d'une pile (distance à l'axe de la tour) et demi-côté de sa section, à la hauteur y.
const axe = (y) => 66.88 * Math.exp(-0.008759 * y) - 11.88, demi = (y) => 7.5 - 0.025 * y;
// Demi-côté du fût, au-dessus du deuxième étage.
const fut = (y) => 17 * Math.exp(-0.00763 * (y - E2));

// Treillis : montants, croix de Saint-André et traverse, blancs sur fond vide (la couleur vient des sommets).
function treillis() {
  const n = 128, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d'); x.clearRect(0, 0, n, n); x.strokeStyle = '#fff'; x.lineCap = 'square';
  x.lineWidth = 15; x.beginPath(); x.moveTo(4, 0); x.lineTo(4, n); x.moveTo(n - 4, 0); x.lineTo(n - 4, n); x.stroke();
  x.lineWidth = 11; x.beginPath(); x.moveTo(0, 5); x.lineTo(n, 5); x.stroke();
  x.lineWidth = 10; x.beginPath(); x.moveTo(6, 8); x.lineTo(n - 6, n); x.moveTo(n - 6, 8); x.lineTo(6, n); x.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// Coupe à la cote de montage : la matière rejette ce qui dépasse uH (hauteur dans le monde).
export function couper(m, uH) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uH = uH;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWy;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWy = (modelMatrix * vec4(position, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWy;\nuniform float uH;').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vWy > uH) discard;');
  };
  m.customProgramCacheKey = () => 'coupe89';
  return m;
}

export function batirTour(app) {
  const T = app.terrain, V = app.v89, O = EXPO.tour, y0 = T.height(O[0], O[1]), uH = { value: 1e4 }, map = treillis();
  const B = new Builder(1e7);                              // une seule dalle : la tour est un objet
  const P = (u, v) => expoXZ(u, v);
  const mats = {
    fer: couper(new THREE.MeshStandardMaterial({ map, alphaTest: 0.36, side: THREE.DoubleSide, vertexColors: true, roughness: 0.8, metalness: 0.1 }), uH),
    plein: couper(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, vertexColors: true, roughness: 0.85, metalness: 0.05 }), uH),
    bois: new THREE.MeshStandardMaterial({ map, alphaTest: 0.36, side: THREE.DoubleSide, vertexColors: true, roughness: 0.95, metalness: 0 }),
    pierre: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  };
  const ombre = { fer: couper(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.36 }), uH), plein: couper(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uH) };
  const fer = B.at('fer', 0, 0), plein = B.at('plein', 0, 0);
  // Pan de treillis entre deux sections carrées (centre cu, cv ; demi-côté w) aux hauteurs ya < yb.
  const pans = (b, cu0, cv0, w0, ya, cu1, cv1, w1, yb, va, vb, nu, col, s0 = 1, s1 = 1) => {
    const K = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let f = 0; f < 4; f++) {
      const p = K[f], q = K[(f + 1) % 4], a = P(cu0 + p[0] * w0, cv0 + p[1] * w0), c = P(cu0 + q[0] * w0, cv0 + q[1] * w0), a2 = P(cu1 + p[0] * w1, cv1 + p[1] * w1), c2 = P(cu1 + q[0] * w1, cv1 + q[1] * w1);
      b.quad(a[0], y0 + ya, a[1], c[0], y0 + ya, c[1], c2[0], y0 + yb, c2[1], a2[0], y0 + yb, a2[1], 0, va, nu, vb, col, s0, s1);
    }
  };
  // Plancher : dalle carrée de demi-côté r à la hauteur y (dessus et dessous sont la même face, vue des deux côtés).
  const plancher = (r, y, col, trou = 0) => {
    const q = (u0, v0, u1, v1) => { const a = P(u0, v0), c = P(u1, v0), d = P(u1, v1), e = P(u0, v1); plein.quad(a[0], y0 + y, a[1], c[0], y0 + y, c[1], d[0], y0 + y, d[1], e[0], y0 + y, e[1], 0, 0, 1, 1, col, 1, 1); };
    if (!trou) q(-r, -r, r, r); else { q(-r, -r, r, -trou); q(-r, trou, r, r); q(-r, -trou, -trou, trou); q(trou, -trou, r, trou); }
  };

  // ---- les quatre piles, du sol au deuxième étage
  const NS = 16;
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    let v = 0;
    for (let k = 0; k < NS; k++) {
      const ya = (E2 * k) / NS, yb = (E2 * (k + 1)) / NS, w = (demi(ya) + demi(yb)) / 2, dv = (yb - ya) / (2 * w);
      pans(fer, su * axe(ya), sv * axe(ya), demi(ya), ya, su * axe(yb), sv * axe(yb), demi(yb), yb, v, v + dv, 1, FER, 0.84 + 0.1 * (k / NS), 0.84 + 0.1 * ((k + 1) / NS));
      v += dv;
    }
  }
  // ---- le fût, du deuxième étage au troisième
  { let v = 0; const NF = 22;
    for (let k = 0; k < NF; k++) {
      const ya = E2 + ((E3 - E2) * k) / NF, yb = E2 + ((E3 - E2) * (k + 1)) / NF, w = (fut(ya) + fut(yb)) / 2, nu = w > 9 ? 2 : 1, dv = ((yb - ya) / (2 * w)) * nu;
      pans(fer, 0, 0, fut(ya), ya, 0, 0, fut(yb), yb, v, v + dv, nu, FER, 0.94 + 0.08 * (k / NF), 0.94 + 0.08 * ((k + 1) / NF));
      v += dv;
    } }
  // ---- les étages : ceinture de treillis, plancher
  const etage = (y, r, h, trou) => { pans(fer, 0, 0, r, y, 0, 0, r, y + h, 0, 1, Math.max(2, Math.round((2 * r) / h / 1.6)), FER, 0.8, 0.92); plancher(r, y + 0.2, FER_SOMBRE, trou); plancher(r, y + h, FER_SOMBRE, trou); };
  etage(E1, 35.5, 4.6, 13); etage(E2, 20.5, 3.8, 6); etage(E3, 8.4, 3, 0);
  // ---- les grands arcs décoratifs, sous le premier étage
  for (let f = 0; f < 4; f++) {
    const N = 18, pt = (k, dr) => { const t = 0.1 * Math.PI + (0.8 * Math.PI * k) / N, s = (37 + dr) * Math.cos(t), y = 5 + (41 + dr) * Math.sin(t), o = axe(y) + demi(y) - 0.4; return [f === 0 ? P(s, o) : f === 1 ? P(s, -o) : f === 2 ? P(o, s) : P(-o, s), y]; };
    for (let k = 0; k < N; k++) {
      const [a, ya] = pt(k, -2.6), [c, yc] = pt(k + 1, -2.6), [a2, ya2] = pt(k, 2.2), [c2, yc2] = pt(k + 1, 2.2);
      fer.quad(a[0], y0 + ya, a[1], c[0], y0 + yc, c[1], c2[0], y0 + yc2, c2[1], a2[0], y0 + ya2, a2[1], k * 0.7, 0, (k + 1) * 0.7, 1, FER, 0.9, 1);
    }
  }
  // ---- le sommet : cabine, campanile, lanterne, hampe et drapeau
  pans(plein, 0, 0, 5.2, E3 + 3, 0, 0, 5.2, E3 + 9.5, 0, 1, 1, rgb(176, 150, 118), 0.9, 1); plancher(5.6, E3 + 9.5, FER_SOMBRE);
  pans(fer, 0, 0, 3.6, E3 + 9.5, 0, 0, 2.6, E3 + 17, 0, 1, 1, FER, 1, 1.05);
  cyl(plein, O[0], O[1], 2.3, y0 + E3 + 17, y0 + E3 + 20.5, { col: rgb(170, 140, 104), seg: 10 });
  cone(plein, O[0], O[1], 2.6, y0 + E3 + 20.5, y0 + 300, { col: FER_SOMBRE, seg: 10 });
  box(plein, { cx: O[0], cz: O[1], ux: 1, uz: 0, hl: 0.14, hw: 0.14 }, y0 + 300, y0 + 312, { col: FER_SOMBRE });
  { const u = EXPO.u, w = 1.9, h = 3.6, yt = y0 + 311.6; let k = 0;
    for (const col of [rgb(30, 60, 150), rgb(245, 245, 240), rgb(200, 40, 40)]) { const xa = O[0] + u[0] * (0.2 + k * w), za = O[1] + u[1] * (0.2 + k * w), xb = xa + u[0] * w, zb = za + u[1] * w; plein.quad(xa, yt - h, za, xb, yt - h, zb, xb, yt, zb, xa, yt, za, 0, 0, 1, 1, col, 1, 1); k++; } }

  // ---- socles de maçonnerie (les fondations), échafaudages de bois
  const Bs = new Builder(1e7), Bp = new Builder(1e7), Bg = new Builder(1e7), Be = new Builder(1e7), socle = Bs.at('pierre', 0, 0);
  for (const su of [-1, 1]) for (const sv of [-1, 1]) {
    const c = P(su * axe(0), sv * axe(0)), U = EXPO.u;
    box(socle, { cx: c[0], cz: c[1], ux: U[0], uz: U[1], hl: 13, hw: 13 }, y0 - 1.5, y0 + 3.2, { col: MACONNERIE, s0: 0.8 });
    app.foot.push({ ring: [P(su * axe(0) - 13, sv * axe(0) - 13), P(su * axe(0) + 13, sv * axe(0) - 13), P(su * axe(0) + 13, sv * axe(0) + 13), P(su * axe(0) - 13, sv * axe(0) + 13)], top: y0 + 3.2 });
    // trois pylônes de bois sous chaque pile inclinée, tant que les piles ne se tiennent pas entre elles
    for (const h of [15, 22, 29]) { const w = 2.6, b = Bp.at('bois', 0, 0), K = [[-1, -1], [1, -1], [1, 1], [-1, 1]], cu = su * (axe(h) + 2), cv = sv * (axe(h) + 2);
      for (let f = 0; f < 4; f++) { const p = K[f], q = K[(f + 1) % 4], a = P(cu + p[0] * w, cv + p[1] * w), d = P(cu + q[0] * w, cv + q[1] * w); b.quad(a[0], y0, a[1], d[0], y0, d[1], d[0], y0 + h - 2, d[1], a[0], y0 + h - 2, a[1], 0, 0, 1, (h - 2) / (2 * w), BOIS, 0.8, 1); } }
  }
  // quatre grands échafaudages de 45 m portent les poutres du premier étage jusqu'à la jonction
  for (const [cu, cv] of [[31, 0], [-31, 0], [0, 31], [0, -31]]) { const w = 5, h = 50, b = Bg.at('bois', 0, 0), K = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let f = 0; f < 4; f++) { const p = K[f], q = K[(f + 1) % 4], a = P(cu + p[0] * w, cv + p[1] * w), d = P(cu + q[0] * w, cv + q[1] * w); b.quad(a[0], y0, a[1], d[0], y0, d[1], d[0], y0 + h, d[1], a[0], y0 + h, a[1], 0, 0, 1, h / (2 * w), BOIS, 0.8, 1); } }
  // grue grimpante : un mât court et une flèche, qui montent avec la pile
  { const b = Be.at('pierre', 0, 0), G = rgb(84, 76, 70);
    box(b, { cx: 0, cz: 0, ux: 1, uz: 0, hl: 0.9, hw: 0.9 }, 0, 7, { col: G }); box(b, { cx: 3.2, cz: 0, ux: 1, uz: 0, hl: 7.5, hw: 0.35 }, 7, 7.7, { col: G }); box(b, { cx: -2.4, cz: 0, ux: 1, uz: 0, hl: 1.2, hw: 0.8 }, 6.2, 7.6, { col: G }); }

  const finir = (b) => { const l = b.finish(app.scene, mats); for (const m of l) { const k = Object.keys(mats).find((n) => mats[n] === m.material); if (ombre[k]) m.customDepthMaterial = ombre[k]; m.frustumCulled = false; } return l; };
  const tour = finir(B), socles = finir(Bs), pylones = finir(Bp), grands = finir(Bg), grue0 = finir(Be)[0];
  const grues = [0, 1, 2, 3].map((i) => { const g = i ? grue0.clone() : grue0; if (i) app.scene.add(g); g.matrixAutoUpdate = true; g.castShadow = true; return g; });
  (V.mobiles ||= []).push(...tour, ...socles, ...pylones, ...grands, ...grues);
  app.monuments.Tour = { x: O[0], z: O[1], top: y0 + 300 };

  // ---- la date du chantier
  const J_FOND = JOUR(1887, 1, 28), J_FER = JOUR(1887, 7, 1), J_JONCTION = JOUR(1887, 12, 7), J_E2 = JOUR(1888, 8, 14), J_SOMMET = JOUR(1889, 3, 31);
  V.chantier = { jour: FIN, hauteur: 300, suivre: [] };
  app.setChantier = (j) => {
    j = Math.max(0, Math.min(FIN, j)); const H = hauteur(j); V.chantier.jour = j; V.chantier.hauteur = Math.max(0, Math.min(300, H));
    uH.value = H < 0 ? -1e4 : y0 + H;
    for (const m of tour) m.visible = H >= 0;
    const kf = Math.max(0, Math.min(1, (j - J_FOND) / (J_FER - J_FOND - 20)));
    for (const m of socles) { m.visible = j >= J_FOND; m.scale.y = 0.25 + 0.75 * kf; m.position.y = (y0 - 1.5) * (1 - m.scale.y); m.updateMatrix(); }
    for (const m of pylones) m.visible = j >= J_FER + 30 && j < J_JONCTION + 45;
    for (const m of grands) m.visible = j >= JOUR(1887, 10, 10) && j < JOUR(1888, 3, 20);
    grues.forEach((g, i) => {
      const su = i < 2 ? -1 : 1, sv = i % 2 ? 1 : -1;
      if (j >= J_FER + 20 && j < J_E2 + 10) { const y = Math.max(2, Math.min(E2, H)), p = P(su * axe(y), sv * axe(y)); g.visible = true; g.position.set(p[0], y0 + y - 3, p[1]); g.rotation.y = Math.atan2(-(O[1] - p[1]), O[0] - p[0]); }
      else if (i < 2 && j >= J_E2 + 10 && j < J_SOMMET - 25) { const y = Math.max(E2, Math.min(E3, H)), p = P(su * (fut(y) - 1), 0); g.visible = true; g.position.set(p[0], y0 + y - 3, p[1]); g.rotation.y = Math.atan2(-(p[1] - O[1]), p[0] - O[0]); }
      else g.visible = false;
    });
    for (const f of V.chantier.suivre) f(j);
    app.shadowState.hour = -1;
    app.emit('chantier', j);
  };
  app.setChantier(FIN);
}
