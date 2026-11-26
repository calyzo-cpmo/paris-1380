// Les véhicules de l'été 1937 : des maquettes à gros traits, dans le même maillage que les personnages (Mesh3,
// src/people.js) pour partager leur matière — la teinte d'une voiture ne colore que sa caisse. L'avant regarde vers +z.
// Six silhouettes : la conduite intérieure (capot long, ailes noires séparées, malle), le taxi rouge et noir de la
// compagnie G7, la camionnette de livraison, le camion bâché, l'autobus vert et crème à plate-forme arrière de la
// STCRP, et la voiture à cheval des livreurs, qui roule encore (charbon, glace, lait). Les formes sont des évocations :
// aucune marque n'est copiée.
import * as THREE from 'three';
import { Mesh3, cartGeo } from '../people.js';

const lin = (v) => Math.pow(v / 255, 2.2), C = (r, g, b) => [lin(r), lin(g), lin(b)];
const L0 = [0, 0, 0], TEINT = [0, 0, 1], W = [1, 1, 1];
const NOIR = C(26, 26, 28), PNEU = C(34, 32, 32), VITRE = C(48, 60, 72), CHROME = C(170, 172, 176), PHARE = C(238, 218, 140), FEU = C(150, 30, 26);
const ROUGE = C(142, 28, 32), VERT = C(38, 84, 58), CREME = C(226, 214, 178), BACHE = C(150, 142, 116), BOIS = C(112, 86, 60);

// Roues d'un essieu : rayon r, à la cote z, voie v (demi-écartement), largeur l.
const essieu = (m, z, r, v, l = 0.09) => { for (const s of [-1, 1]) m.wheel(s * v, r, z, r, l, PNEU, 8); };
// Avant commun : capot effilé, calandre droite, ailes, phares, pare-chocs. z0 : pied du pare-brise ; h : hauteur du capot.
function avant(m, z0, lg, o) {
  const { corps, lim, aile = NOIR, v = 0.72, r = 0.36, h = 1.02, lc = 0.5 } = o, z1 = z0 + lg;
  m.box(0, 0.44, h, (z0 + z1) / 2, lc, lg / 2, lc - 0.1, lg / 2 - 0.03, corps, lim);
  m.box(0, 0.46, h + 0.04, z1 + 0.02, lc - 0.16, 0.03, lc - 0.2, 0.03, CHROME);
  for (const s of [-1, 1]) {
    m.box(s * v, 0.5, 0.5 + r * 0.74, z1 - 0.52, 0.13, r + 0.14, 0.12, r - 0.02, aile);
    m.box(s * (lc - 0.06), h - 0.24, h - 0.06, z1 - 0.04, 0.09, 0.07, 0.09, 0.05, PHARE);
  }
  essieu(m, z1 - 0.52, r, v);
  m.box(0, 0.36, 0.46, z1 + 0.18, v + 0.04, 0.03, v + 0.04, 0.03, CHROME);
}

// Conduite intérieure : 4,2 m. o : corps, toit (couleurs fixes ; sinon la teinte de l'instance), aile.
function berline(o = {}) {
  const m = new Mesh3(), corps = o.corps || W, lim = o.corps ? L0 : TEINT, toit = o.toit || corps, limT = o.toit ? L0 : lim;
  m.box(0, 0.3, 0.44, -0.05, 0.8, 1.98, 0.8, 1.98, NOIR);                               // châssis et marchepieds
  avant(m, 0.52, 1.32, { corps, lim, aile: o.aile });
  m.box(0, 0.44, 1.02, -0.52, 0.76, 1.06, 0.76, 1.06, corps, lim);                      // caisse
  m.box(0, 1.02, 1.5, -0.56, 0.72, 0.98, 0.66, 0.8, toit, limT);                        // habitacle
  m.box(0, 1.5, 1.57, -0.56, 0.66, 0.8, 0.54, 0.64, toit, limT);                        // pavillon bombé
  for (const s of [-1, 1]) m.box(s * 0.7, 1.08, 1.42, -0.56, 0.02, 0.76, 0.02, 0.66, VITRE);
  m.box(0, 1.08, 1.42, 0.375, 0.6, 0.02, 0.56, 0.02, VITRE);                            // pare-brise
  m.box(0, 1.14, 1.4, -1.5, 0.36, 0.02, 0.32, 0.02, VITRE);                             // lunette
  m.box(0, 0.44, 0.98, -1.76, 0.7, 0.24, 0.56, 0.1, corps, lim);                        // malle
  for (const s of [-1, 1]) { m.box(s * 0.72, 0.5, 0.78, -1.2, 0.13, 0.5, 0.12, 0.34, o.aile || NOIR); m.box(s * 0.56, 0.62, 0.72, -2.0, 0.05, 0.03, 0.05, 0.03, FEU); }
  essieu(m, -1.2, 0.36, 0.72);
  m.box(0, 0.36, 0.46, -2.06, 0.76, 0.03, 0.76, 0.03, CHROME);
  return m.geometry();
}

// Camionnette de livraison : 4,5 m, cabine et caisse fermée à la teinte de la maison.
function camionnette() {
  const m = new Mesh3();
  m.box(0, 0.3, 0.46, -0.1, 0.82, 2.1, 0.82, 2.1, NOIR);
  avant(m, 0.84, 1.2, { corps: W, lim: TEINT });
  m.box(0, 0.46, 1.08, 0.38, 0.8, 0.46, 0.8, 0.46, W, TEINT);                           // cabine
  m.box(0, 1.08, 1.72, 0.36, 0.78, 0.44, 0.74, 0.4, W, TEINT);
  for (const s of [-1, 1]) m.box(s * 0.77, 1.14, 1.56, 0.4, 0.02, 0.3, 0.02, 0.28, VITRE);
  m.box(0, 1.14, 1.58, 0.81, 0.62, 0.02, 0.6, 0.02, VITRE);
  m.box(0, 0.46, 1.96, -1.22, 0.86, 1.12, 0.84, 1.1, W, TEINT);                         // caisse
  m.box(0, 1.96, 2.04, -1.22, 0.84, 1.1, 0.7, 0.98, [0.82, 0.82, 0.82], TEINT);
  for (const s of [-1, 1]) m.box(s * 0.875, 0.98, 1.5, -1.22, 0.012, 0.8, 0.012, 0.8, CREME);      // panneau de la raison sociale
  m.box(0, 0.6, 1.9, -2.35, 0.7, 0.012, 0.7, 0.012, [0.7, 0.7, 0.7], TEINT);            // portes arrière
  for (const s of [-1, 1]) m.box(s * 0.6, 0.62, 0.72, -2.37, 0.05, 0.02, 0.05, 0.02, FEU);
  essieu(m, -1.4, 0.38, 0.74, 0.1);
  return m.geometry();
}

// Camion bâché : 6,6 m, plateau à ridelles sous une bâche de toile.
function camion() {
  const m = new Mesh3();
  m.box(0, 0.5, 0.72, -0.2, 0.9, 3.2, 0.9, 3.2, NOIR);
  avant(m, 2.02, 1.3, { corps: W, lim: TEINT, v: 0.88, r: 0.46, h: 1.42, lc: 0.6 });
  m.box(0, 0.72, 1.5, 1.52, 1.02, 0.5, 1.02, 0.5, W, TEINT);                            // cabine
  m.box(0, 1.5, 2.22, 1.5, 1.0, 0.48, 0.94, 0.42, W, TEINT);
  for (const s of [-1, 1]) m.box(s * 0.99, 1.56, 2.04, 1.54, 0.02, 0.32, 0.02, 0.3, VITRE);
  m.box(0, 1.56, 2.06, 1.99, 0.8, 0.02, 0.76, 0.02, VITRE);
  m.box(0, 0.98, 1.14, -1.15, 1.1, 2.1, 1.1, 2.1, BOIS);                                // plateau
  m.box(0, 1.14, 1.66, -1.15, 1.1, 2.1, 1.1, 2.1, [0.5, 0.5, 0.5], TEINT, 0);           // ridelles
  m.box(0, 1.66, 2.6, -1.15, 1.08, 2.08, 0.72, 2.0, BACHE);                             // bâche
  for (const s of [-1, 1]) m.box(s * 0.8, 0.8, 0.92, -3.27, 0.06, 0.02, 0.06, 0.02, FEU);
  essieu(m, -1.9, 0.46, 0.84, 0.2);
  return m.geometry();
}

// Autobus de la STCRP : 9,2 m, vert sombre sous la ceinture, crème au-dessus, plate-forme ouverte à l'arrière.
function autobus() {
  const m = new Mesh3(), l = 1.18;
  m.box(0, 0.5, 0.62, -0.3, l - 0.04, 4.3, l - 0.04, 4.3, NOIR);
  m.box(0, 0.62, 1.5, 3.95, 0.6, 0.55, 0.52, 0.5, VERT);                                // capot court
  m.box(0, 0.66, 1.52, 4.52, 0.44, 0.03, 0.4, 0.03, CHROME);
  for (const s of [-1, 1]) { m.box(s * 0.5, 1.18, 1.38, 4.48, 0.1, 0.07, 0.1, 0.05, PHARE); m.box(s * 0.98, 0.62, 1.0, 3.9, 0.18, 0.62, 0.16, 0.46, NOIR); }
  m.box(0, 0.62, 1.52, 0.25, l, 3.15, l, 3.15, VERT);                                   // caisse, sous la ceinture
  m.box(0, 1.52, 2.34, 0.25, l - 0.03, 3.12, l - 0.05, 3.1, VITRE);                     // bande vitrée
  for (let k = 0; k <= 6; k++) for (const s of [-1, 1]) m.box(s * (l - 0.02), 1.52, 2.34, -2.85 + k * 1.03, 0.03, 0.07, 0.03, 0.07, CREME);       // montants
  m.box(0, 1.52, 2.34, 3.38, l - 0.2, 0.03, l - 0.22, 0.03, VITRE);
  for (const s of [-1, 1]) m.box(s * (l - 0.1), 1.52, 2.34, 3.37, 0.08, 0.05, 0.08, 0.05, CREME);
  m.box(0, 2.34, 2.56, -0.35, l, 3.78, l, 3.78, CREME);                                 // bandeau : la ligne et la destination
  m.box(0, 2.56, 2.78, -0.35, l, 3.78, l - 0.3, 3.5, C(206, 200, 180));                 // toit
  m.box(0, 0.62, 1.5, -3.52, l, 0.62, l, 0.62, VERT, L0, 2);                            // plate-forme : un garde-corps, pas de vitres
  for (const s of [-1, 1]) for (const z of [-2.96, -4.08]) m.box(s * (l - 0.06), 1.5, 2.34, z, 0.04, 0.04, 0.04, 0.04, CREME);
  for (const s of [-1, 1]) m.box(s * 0.9, 0.9, 1.04, -4.16, 0.07, 0.02, 0.07, 0.02, FEU);
  essieu(m, 3.75, 0.5, 0.98, 0.12); essieu(m, -2.2, 0.5, 0.94, 0.24);
  return m.geometry();
}

// Phares et feux : de petits rectangles posés devant les lanternes, allumés la nuit (jaunes à l'avant : le phare
// jaune est imposé aux voitures neuves à partir de 1937 ; rouges à l'arrière).
function lanternes(avantZ, y, v, arriereZ, ya, va) {
  const pos = [], col = [], q = (x, yy, z, s, c, d) => { const p = [[x - s, yy - s, z], [x + s, yy - s, z], [x + s, yy + s, z], [x - s, yy + s, z]], o = d > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]; for (const i of o) { pos.push(...p[i]); col.push(...c); } };
  for (const s of [-1, 1]) { q(s * v, y, avantZ, 0.17, [1, 0.86, 0.42], 1); if (arriereZ != null) q(s * va, ya, arriereZ, 0.07, [0.9, 0.08, 0.05], -1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

const SOMBRES = [[24, 24, 26], [24, 24, 26], [24, 24, 26], [28, 28, 32], [30, 38, 66], [78, 24, 30], [30, 54, 42], [92, 94, 98], [60, 46, 38], [128, 128, 126], [170, 154, 122]];
const MAISONS = [[196, 184, 150], [40, 70, 54], [44, 56, 96], [120, 34, 34], [176, 150, 70], [90, 92, 96], [60, 44, 36], [206, 200, 186], [150, 96, 50]];
const UTILES = [[70, 84, 70], [84, 80, 74], [50, 62, 86], [112, 60, 40], [96, 98, 100], [58, 70, 56]];
const CHARGES = [[150, 120, 90], [110, 84, 60], [196, 176, 110], [200, 190, 170], [70, 62, 58]];

// Les modèles : géométrie, demi-longueurs vers l'avant et l'arrière (m), demi-largeur, vitesses de croisière (m/s),
// part dans la circulation, largeur de chaussée demandée (lw, demi-largeur roulable), couleurs, ombre portée, lanternes.
export function modeles() {
  return [
    { nom: 'berline', geo: berline(), av: 2.1, ar: 2.1, l: 0.8, v: [6.2, 9.4], part: 0.58, lw: 0, teintes: SOMBRES, ombre: [1.05, 2.4], feux: lanternes(1.87, 0.87, 0.44, -2.1, 0.67, 0.56), gare: 0.84 },
    { nom: 'taxi', geo: berline({ corps: ROUGE, toit: NOIR }), av: 2.1, ar: 2.1, l: 0.8, v: [6.4, 9.0], part: 0.13, lw: 0, teintes: null, ombre: [1.05, 2.4], feux: lanternes(1.87, 0.87, 0.44, -2.1, 0.67, 0.56), gare: 0.06 },
    { nom: 'camionnette', geo: camionnette(), av: 2.25, ar: 2.4, l: 0.86, v: [5.4, 7.8], part: 0.13, lw: 0, teintes: MAISONS, ombre: [1.1, 2.6], feux: lanternes(2.07, 0.87, 0.44, -2.4, 0.67, 0.6), gare: 0.1 },
    { nom: 'camion', geo: camion(), av: 3.5, ar: 3.3, l: 1.1, v: [4.4, 6.4], part: 0.07, lw: 2.7, teintes: UTILES, ombre: [1.35, 3.8], feux: lanternes(3.36, 1.27, 0.54, -3.3, 0.86, 0.8), gare: 0 },
    { nom: 'autobus', geo: autobus(), av: 4.6, ar: 4.2, l: 1.18, v: [5.0, 7.0], part: 0.06, lw: 3.1, teintes: null, ombre: [1.45, 4.9], feux: lanternes(4.56, 1.28, 0.5, -4.19, 0.97, 0.9), gare: 0 },
    { nom: 'attelage', geo: cartGeo(), av: 2.8, ar: 2.6, l: 0.9, v: [1.7, 2.4], part: 0.03, lw: 0, teintes: CHARGES, ombre: [1.0, 2.6], oz: 0.7, pas: 2.8, amp: 0.45, gare: 0 },
  ];
}
