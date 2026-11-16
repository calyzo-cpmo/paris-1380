// L'Exposition universelle de 1889 sur le Champ-de-Mars, et le palais du Trocadéro (1878) qui lui fait face.
// Les palais sont placés d'après le plan général de l'Exposition : Beaux-Arts et Arts libéraux de part et d'autre du
// jardin central, Industries diverses et Dôme central derrière, Galerie des machines au fond, contre l'École
// militaire. Emprises et hauteurs suivent les cotes publiées (Galerie des machines : 420 m sur 115 m, 43,5 m sous
// clef ; dômes à 55 et 60 m) ; le détail des élévations est une évocation. Ils s'élèvent avec la date du chantier.
import * as THREE from 'three';
import { Builder, box, cyl, cone, rgb } from '../builder.js';
import { EXPO, VC, expoXZ } from './data.js';
import { couper, JOUR, FIN, batirTour } from './tour.js';
import { fill } from '../p1789/outils.js';

const CREME = rgb(228, 216, 190), OCRE = rgb(206, 170, 120), VERRE = rgb(166, 190, 202), VERRE_CLAIR = rgb(190, 208, 216), BLEU = rgb(74, 116, 156), OR = rgb(214, 176, 84), BRIQUE = rgb(186, 110, 84), PIERRE = rgb(226, 214, 188), ARDOISE = rgb(92, 102, 118);
const Q = (u, v) => expoXZ(u, v + VC);                    // le Champ-de-Mars est centré sur VC, entre ses deux avenues

// Halle : murs jusqu'à hm, puis un comble vitré en arc jusqu'à hf. axe : 'u' ou 'v', le sens du faîte.
function halle(bm, bv, y0, u0, u1, v0, v1, hm, hf, axe, cm = CREME, cv = VERRE) {
  const A = Q(u0, v0), B = Q(u1, v0), C = Q(u1, v1), D = Q(u0, v1), K = [A, B, C, D];
  for (let i = 0; i < 4; i++) { const a = K[i], c = K[(i + 1) % 4]; bm.quad(a[0], y0 - 1, a[1], c[0], y0 - 1, c[1], c[0], y0 + hm, c[1], a[0], y0 + hm, a[1], 0, 0, 1, 1, cm, 0.78, 1); }
  const N = 10, prof = (s) => hm + (hf - hm) * Math.pow(Math.sin(Math.PI * s), 0.75);
  for (let k = 0; k < N; k++) {
    const s0 = k / N, s1 = (k + 1) / N, ya = y0 + prof(s0), yb = y0 + prof(s1), sh = 0.86 + 0.14 * Math.sin(Math.PI * (s0 + s1) / 2);
    const p = axe === 'v' ? [Q(u0 + (u1 - u0) * s0, v0), Q(u0 + (u1 - u0) * s0, v1), Q(u0 + (u1 - u0) * s1, v1), Q(u0 + (u1 - u0) * s1, v0)] : [Q(u0, v0 + (v1 - v0) * s0), Q(u1, v0 + (v1 - v0) * s0), Q(u1, v0 + (v1 - v0) * s1), Q(u0, v0 + (v1 - v0) * s1)];
    bv.quad(p[0][0], ya, p[0][1], p[1][0], ya, p[1][1], p[2][0], yb, p[2][1], p[3][0], yb, p[3][1], 0, 0, 1, 1, cv, sh, sh);
    // pignons vitrés, aux deux bouts
    for (const [a, b] of [[p[0], p[3]], [p[1], p[2]]]) bv.quad(a[0], y0 + hm, a[1], b[0], y0 + hm, b[1], b[0], yb, b[1], a[0], ya, a[1], 0, 0, 1, 1, VERRE_CLAIR, 0.9, 1);
  }
}
// Dôme : tambour puis calotte, lanternon doré.
function dome(bm, bv, y0, u, v, r, yt, hd, col = BLEU) {
  const c = Q(u, v), seg = 18, N = 6;
  cyl(bm, c[0], c[1], r, y0, y0 + yt, { col: CREME, seg, s0: 0.8 });
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * Math.PI / 2, a1 = ((k + 1) / N) * Math.PI / 2, r0 = r * Math.cos(a0), r1 = r * Math.cos(a1), ya = y0 + yt + hd * Math.sin(a0), yb = y0 + yt + hd * Math.sin(a1);
    for (let i = 0; i < seg; i++) { const t0 = (i / seg) * 2 * Math.PI, t1 = ((i + 1) / seg) * 2 * Math.PI;
      bv.quad(c[0] + Math.cos(t1) * r0, ya, c[1] + Math.sin(t1) * r0, c[0] + Math.cos(t0) * r0, ya, c[1] + Math.sin(t0) * r0, c[0] + Math.cos(t0) * r1, yb, c[1] + Math.sin(t0) * r1, c[0] + Math.cos(t1) * r1, yb, c[1] + Math.sin(t1) * r1, 0, 0, 1, 1, col, 0.92, 1.06); }
  }
  cyl(bm, c[0], c[1], r * 0.14, y0 + yt + hd - 0.5, y0 + yt + hd + r * 0.3, { col: OR, seg: 8 }); cone(bm, c[0], c[1], r * 0.17, y0 + yt + hd + r * 0.3, y0 + yt + hd + r * 0.62, { col: OR, seg: 8 });
}

// Un ensemble de palais qui s'élève entre deux dates (jours comptés depuis le 1er janvier 1887).
function ensemble(app, y0, d0, d1, hmax, dessiner) {
  const V = app.v89, uH = { value: 1e4 }, B = new Builder(1e7);
  const mats = { mur: couper(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide }), uH), verre: couper(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.3, side: THREE.DoubleSide }), uH) };
  const ombre = couper(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uH);
  dessiner(B.at('mur', 0, 0), B.at('verre', 0, 0));
  const meshes = B.finish(app.scene, mats); for (const m of meshes) { m.customDepthMaterial = ombre; m.frustumCulled = false; }
  V.mobiles.push(...meshes);
  V.chantier.suivre.push((j) => { const k = (j - d0) / (d1 - d0); for (const m of meshes) m.visible = k > 0; uH.value = k >= 1 ? 1e4 : y0 + Math.max(0, k) * hmax; });
}
const emprise = (app, V, u0, u1, v0, v1, top, reserve = true) => { const ring = [Q(u0, v0), Q(u1, v0), Q(u1, v1), Q(u0, v1)]; app.foot.push({ ring, top }); if (reserve) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } V.reserves.push({ ring, x0, z0, x1, z1 }); } };

// Palais du Trocadéro (Davioud et Bourdais, 1878) : rotonde, deux tours, deux ailes courbes tournées vers la Seine.
function trocadero(app, B) {
  const T = app.terrain, V = app.v89, cu = -600, c = expoXZ(cu, 0), y0 = T.height(c[0], c[1]), bs = B.at('stone', c[0], c[1]), bp = B.at('plain', c[0], c[1]);
  cyl(bs, c[0], c[1], 30, y0 - 3, y0 + 30, { col: PIERRE, seg: 24, s0: 0.8 }); cone(bp, c[0], c[1], 31, y0 + 30, y0 + 44, { col: ARDOISE, seg: 24 }); cyl(bs, c[0], c[1], 3, y0 + 43, y0 + 50, { col: PIERRE, seg: 8 });
  for (const s of [-1, 1]) {
    const t = expoXZ(cu + 14, s * 40);
    box(bs, { cx: t[0], cz: t[1], ux: EXPO.u[0], uz: EXPO.u[1], hl: 5, hw: 5 }, y0 - 3, y0 + 70, { col: PIERRE, s0: 0.8 }); box(bs, { cx: t[0], cz: t[1], ux: EXPO.u[0], uz: EXPO.u[1], hl: 3.6, hw: 3.6 }, y0 + 70, y0 + 78, { col: OCRE }); cone(bp, t[0], t[1], 4.6, y0 + 78, y0 + 86, { col: ARDOISE, seg: 8 });
    // aile : douze travées le long d'un arc, pavillon au bout
    const R = 196, N = 12; let prev = null;
    for (let k = 0; k <= N; k++) {
      const a = (12 + (62 * k) / N) * Math.PI / 180, p = expoXZ(cu + R - R * Math.cos(a), s * R * Math.sin(a));
      if (prev) { const L = Math.hypot(p[0] - prev[0], p[1] - prev[1]), ux = (p[0] - prev[0]) / L, uz = (p[1] - prev[1]) / L, m = [(p[0] + prev[0]) / 2, (p[1] + prev[1]) / 2], yb = Math.min(T.height(m[0], m[1]), y0) - 3;
        box(bs, { cx: m[0], cz: m[1], ux, uz, hl: L / 2 + 0.6, hw: 11 }, yb, y0 + 15, { col: PIERRE, s0: 0.78 }); box(bp, { cx: m[0], cz: m[1], ux, uz, hl: L / 2 + 0.6, hw: 9 }, y0 + 15, y0 + 17.5, { col: ARDOISE });
        app.foot.push({ ring: [[prev[0] - uz * 11, prev[1] + ux * 11], [p[0] - uz * 11, p[1] + ux * 11], [p[0] + uz * 11, p[1] - ux * 11], [prev[0] + uz * 11, prev[1] - ux * 11]], top: y0 + 17.5 }); }
      prev = p;
    }
    box(bs, { cx: prev[0], cz: prev[1], ux: EXPO.u[0], uz: EXPO.u[1], hl: 15, hw: 15 }, Math.min(T.height(prev[0], prev[1]), y0) - 3, y0 + 21, { col: PIERRE, s0: 0.78 }); cone(bp, prev[0], prev[1], 19, y0 + 21, y0 + 30, { col: ARDOISE, seg: 4, a0: Math.atan2(EXPO.u[1], EXPO.u[0]) + Math.PI / 4 });
  }
  { const ring = [expoXZ(cu - 45, -215), expoXZ(cu + 140, -215), expoXZ(cu + 140, 215), expoXZ(cu - 45, 215)]; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } V.reserves.push({ ring, x0, z0, x1, z1 }); }
  app.foot.push({ ring: [expoXZ(cu - 30, -30), expoXZ(cu + 30, -30), expoXZ(cu + 30, 30), expoXZ(cu - 30, 30)], top: y0 + 44 });
  app.monuments.Trocadero = { x: c[0], z: c[1], top: y0 + 92 };
}

// Sol de l'Exposition : sable des allées, pelouses du jardin central et du pied de la tour, bassins. Peint avec le
// reste du sol, avant toute construction.
const rect = (u0, u1, v0, v1) => [[Q(u0, v0), Q(u1, v0), Q(u1, v1), Q(u0, v1)]];
export function peindreExpo(x, Tr) {
  fill(x, Tr, [rect(EXPO.u0, EXPO.u1, EXPO.v0 - VC, EXPO.v1 - VC)], '#cfc4a6');
  for (const s of [-1, 1]) { fill(x, Tr, [rect(84, 208, s > 0 ? 14 : -74, s > 0 ? 74 : -14)], '#8fae6c'); fill(x, Tr, [rect(236, 372, s > 0 ? 14 : -74, s > 0 ? 74 : -14)], '#8fae6c'); fill(x, Tr, [rect(-200, -80, s > 0 ? 30 : -190, s > 0 ? 190 : -30)], '#93b070'); }
  for (const [u, r] of [[222, 16], [404, 22]]) { const c = Q(u, 0); x.fillStyle = '#6f95a8'; x.beginPath(); x.arc(Tr.x(c[0]), Tr.y(c[1]), r * Tr.s, 0, 7); x.fill(); x.strokeStyle = '#e4dcc6'; x.lineWidth = Math.max(1, 2.4 * Tr.s); x.stroke(); }
}
export const ESPLANADES = () => [rect(EXPO.u0, EXPO.u1, EXPO.v0 - VC, EXPO.v1 - VC)];
export function jardinsExpo(a) { for (const s of [-1, 1]) { a.gardens.push({ ring: rect(84, 372, s > 0 ? 76 : -98, s > 0 ? 98 : -76)[0], dens: 0.55 }); a.gardens.push({ ring: rect(-200, -80, s > 0 ? 30 : -190, s > 0 ? 190 : -30)[0], dens: 0.3 }); } }

export async function batirExpo(app, B) {
  const T = app.terrain, V = app.v89, O = EXPO.tour, y0 = T.height(O[0], O[1]), M = app.monuments;
  V.mobiles = [];
  batirTour(app);
  trocadero(app, B);
  // Galerie des machines : une seule nef de 115 m de portée, longue de 420 m, entre deux galeries basses
  ensemble(app, y0, JOUR(1887, 7, 5), JOUR(1889, 2, 20), 46, (bm, bv) => {
    halle(bm, bv, y0, 700, 815, -210, 210, 11, 43.5, 'v');
    halle(bm, bv, y0, 678, 700, -210, 210, 12, 15, 'v', CREME, VERRE_CLAIR); halle(bm, bv, y0, 815, 837, -210, 210, 12, 15, 'v', CREME, VERRE_CLAIR);
  });
  emprise(app, V, 678, 837, -210, 210, y0 + 43.5); { const c = Q(757, 0); M.Machines = { x: c[0], z: c[1], top: y0 + 62 }; }
  // Palais des Beaux-Arts (côté La Bourdonnais) et des Arts libéraux (côté Suffren) : chacun son dôme d'émail bleu
  ensemble(app, y0, JOUR(1887, 4, 10), JOUR(1889, 3, 20), 58, (bm, bv) => {
    for (const s of [-1, 1]) { const va = s * 102, vb = s * 186; halle(bm, bv, y0, 118, 348, Math.min(va, vb), Math.max(va, vb), 17, 27, 'u'); dome(bm, bv, y0, 233, s * 144, 17, 36, 19); }
  });
  for (const s of [-1, 1]) { emprise(app, V, 118, 348, s > 0 ? 102 : -186, s > 0 ? 186 : -102, y0 + 27); const c = Q(233, s * 144); M[s < 0 ? 'BeauxArts' : 'ArtsLiberaux'] = { x: c[0], z: c[1], top: y0 + 74 }; }
  // Palais des Industries diverses : deux ailes, un fond, la galerie de trente mètres et le Dôme central dans l'axe
  ensemble(app, y0, JOUR(1887, 9, 1), JOUR(1889, 4, 20), 64, (bm, bv) => {
    for (const s of [-1, 1]) { const va = s * 88, vb = s * 205; halle(bm, bv, y0, 392, 662, Math.min(va, vb), Math.max(va, vb), 14, 22, 'u', CREME, VERRE_CLAIR); }
    halle(bm, bv, y0, 580, 662, -88, 88, 14, 22, 'v', CREME, VERRE_CLAIR);
    halle(bm, bv, y0, 545, 700, -15, 15, 16, 24, 'u');
    dome(bm, bv, y0, 528, 0, 19, 40, 20, rgb(96, 128, 150));
    for (const s of [-1, 1]) { const p = Q(512, s * 24); box(bm, { cx: p[0], cz: p[1], ux: EXPO.u[0], uz: EXPO.u[1], hl: 6, hw: 6 }, y0 - 1, y0 + 34, { col: CREME, s0: 0.8 }); cone(bm, p[0], p[1], 7.5, y0 + 34, y0 + 44, { col: BLEU, seg: 4, a0: Math.atan2(EXPO.u[1], EXPO.u[0]) + Math.PI / 4 }); }
  });
  for (const s of [-1, 1]) emprise(app, V, 392, 662, s > 0 ? 88 : -205, s > 0 ? 205 : -88, y0 + 22);
  emprise(app, V, 580, 662, -88, 88, y0 + 22); emprise(app, V, 509, 700, -19, 19, y0 + 60);
  { const c = Q(528, 0); M.Dome = { x: c[0], z: c[1], top: y0 + 78 }; }
  app.setChantier(FIN);

  // repères de l'Exposition
  const L = (V.lieux = []);
  L.push(['Tour de 300 mètres', 'expo', 'La tour de Gustave Eiffel, clou de l’Exposition : 18 000 pièces de fer assemblées par 2,5 millions de rivets. Premiers coups de pioche le 28 janvier 1887 ; les piles se rejoignent au premier étage le 7 décembre ; deuxième étage le 14 août 1888 ; drapeau au sommet le 31 mars 1889. Le curseur du chantier la montre à chaque date. Sa forme est une évocation à partir de ses cotes.', M.Tour, 1]);
  L.push(['Galerie des machines', 'expo', 'La plus vaste nef jamais construite : 420 mètres de long, 115 mètres de portée sans appui, 43,5 mètres sous clef, par l’architecte Dutert et l’ingénieur Contamin. Démolie en 1910. Son élévation est une évocation.', M.Machines, 1]);
  L.push(['Dôme central', 'expo', 'L’entrée d’honneur du palais des Industries diverses, par Joseph Bouvard : un dôme de 60 mètres dans l’axe de la tour, d’où part la galerie de trente mètres vers la Galerie des machines.', M.Dome, 1]);
  L.push(['Palais des Beaux-Arts', 'expo', 'L’un des deux palais jumeaux de Formigé, de fer, de brique et de terre cuite, sous un dôme d’émail bleu. Démoli après l’Exposition de 1900.', M.BeauxArts]);
  L.push(['Palais des Arts libéraux', 'expo', 'Le pendant du palais des Beaux-Arts, côté avenue de Suffren.', M.ArtsLiberaux]);
  L.push(['Palais du Trocadéro', 'expo', 'Bâti pour l’Exposition de 1878 par Davioud et Bourdais : une rotonde, deux tours de 80 mètres et deux ailes courbes. Il a été remplacé en 1937 par le palais de Chaillot, dont les ailes reprennent le tracé. Sa forme est une évocation.', M.Trocadero, 1]);
}
