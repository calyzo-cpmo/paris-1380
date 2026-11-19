// Voies ferrées de Paris en 1889 : ballast, traverses et rails posés sur le sol, viaducs et ponts du chemin de fer.
// Le tracé vient de data/paris1889.json (tools/fer_1889.py) : voies d'aujourd'hui sur les emprises de 1889, lignes
// déposées restituées dans l'axe de leur emprise ou évoquées le long des rues qu'elles longeaient. Ici, chaque voie
// devient un ruban qui suit le relief ; là où elle court en hauteur (viaduc de l'avenue Daumesnil, viaduc d'Auteuil,
// arrivée à la gare Montparnasse) ou au-dessus de l'eau (pont National), un ouvrage de pierre la porte : tablier,
// flancs à arches, parapets. Les tranchées ne sont pas creusées : les voies y sont posées au niveau du sol.
import * as THREE from 'three';
import { rgb } from '../builder.js';
import { hex } from '../p1789/blocks.js';
import { lines } from '../p1789/outils.js';
import { mulberry32, pointInPoly } from '../geom.js';
import { voies, ilots } from './data.js';

const LARGE = 2.8;            // largeur du ruban : la longueur d'une traverse (m)
const MOTIF = 1.2;            // longueur du motif de la texture : deux traverses (m)
const PAS = 9;                // les voies sont reprises tous les neuf mètres pour suivre le relief
const DEMI = 2.3;             // demi-largeur d'un ouvrage sous une voie (m)
const PIERRE = hex(0xd6ccb4), TABLIER = rgb(132, 126, 112), BLANC = 0xffffff;

// Une voie vue du dessus : ballast, deux traverses de chêne, deux files de rails. u en travers, v le long.
export function materiauVoie() {
  const W = 128, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), r = mulberry32(1837);
  x.fillStyle = '#857d6c'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 1500; i++) { const g = 96 + Math.floor(r() * 70); x.fillStyle = `rgb(${g},${g - 6},${g - 20})`; x.fillRect(r() * W, r() * H, 1 + r() * 1.6, 1 + r() * 1.6); }
  const m = W / LARGE;                                                   // points par mètre, en travers
  for (const y of [H * 0.25, H * 0.75]) { x.fillStyle = '#4e3f31'; x.fillRect(0.1 * m, y - H * 0.105, 2.6 * m, H * 0.21); x.fillStyle = 'rgba(20,14,10,0.35)'; x.fillRect(0.1 * m, y + H * 0.08, 2.6 * m, H * 0.03); }
  for (const u of [LARGE / 2 - 0.7175, LARGE / 2 + 0.7175]) { x.fillStyle = '#2c2a2a'; x.fillRect(u * m - 0.075 * m, 0, 0.15 * m, H); x.fillStyle = '#b9bcc0'; x.fillRect(u * m - 0.035 * m, 0, 0.07 * m, H); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.wrapS = THREE.ClampToEdgeWrapping; t.anisotropy = 8;
  // posé à vingt-cinq centimètres du sol : le décalage de profondeur empêche le sol de transparaître, vu de loin
  return new THREE.MeshStandardMaterial({ map: t, vertexColors: true, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
}

// Îlots « non bâtis » de la base de 1900 que le chemin de fer occupe (plus de 150 m de voies) : cours de gares et
// faisceaux. Ce ne sont ni des promenades ni des terre-pleins : ni pelouse, ni arbres. Rend l'ensemble de leurs rangs.
let ferres = null;
export function ilotsFerres() {
  if (ferres) return ferres;
  const cand = [];
  ilots().forEach((i, k) => { if (i.c !== 'p') return; const r = i.rings[0]; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } cand.push({ k, r, x0, z0, x1, z1, L: 0 }); });
  for (const v of voies()) for (let j = 0; j + 1 < v.pts.length; j++) {
    const a = v.pts[j], b = v.pts[j + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 15));
    for (let q = 0; q < n; q++) { const x = a[0] + ((b[0] - a[0]) * (q + 0.5)) / n, z = a[1] + ((b[1] - a[1]) * (q + 0.5)) / n; for (const c of cand) if (x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1 && pointInPoly(x, z, c.r)) { c.L += L / n; break; } }
  }
  return (ferres = new Set(cand.filter((c) => c.L >= 150).map((c) => c.k)));
}

// Sur le plan du sol : le ballast de chaque voie. Les faisceaux des gares y deviennent des plages grises.
export function peindreVoies(x, T) {
  lines(x, T, voies().map((v) => v.pts), '#8e8776', Math.max(1.3, 5.2 * T.s));
}

// Pose toutes les voies. Rend { n, km, tris, viaduc (m de voie portés par un ouvrage), surEau (m de voie au-dessus du
// fleuve), noyes (tronçons qui passeraient sous l'eau : aucun), echantillon [[x, y, z, hauteur au-dessus du sol, sur
// l'eau]], pres(x, z, d) : une voie passe-t-elle à moins de d mètres ? }.
// B reçoit les ouvrages ; BR, les rubans (un assembleur à grandes dalles : peu de maillages pour tout le réseau).
export function poserVoies(app, B, BR = B) {
  const T = app.terrain, V = voies(), C = app.monde.cadre; let quads = 0;
  // 1. chaque voie reprise à pas régulier : position, hauteur demandée, altitude
  const R = [];
  for (const v of V) {
    const P = [];
    for (let i = 0; i + 1 < v.pts.length; i++) {
      const a = v.pts[i], b = v.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / PAS)), ha = v.h ? v.h[i] : 0, hb = v.h ? v.h[i + 1] : 0;
      for (let j = 0; j < n; j++) P.push({ x: a[0] + ((b[0] - a[0]) * j) / n, z: a[1] + ((b[1] - a[1]) * j) / n, h: ha + ((hb - ha) * j) / n });
    }
    const e = v.pts[v.pts.length - 1]; P.push({ x: e[0], z: e[1], h: v.h ? v.h[v.h.length - 1] : 0 });
    if (P.some((p) => p.x < C.x0 + 5 || p.x > C.x1 - 5 || p.z < C.z0 + 5 || p.z > C.z1 - 5)) continue;
    let s = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      p.fx = (b.x - a.x) / l; p.fz = (b.z - a.z) / l;                   // sens de la voie ; (-fz, fx) est sa gauche
      if (i) s += Math.hypot(p.x - P[i - 1].x, p.z - P[i - 1].z); p.s = s;
      // sol : le relief sans le lit du fleuve (au-dessus de l'eau, c'est le niveau des quais), ou le tablier d'un pont
      p.sol = Math.max(T.land(p.x, p.z), app.heightAt(p.x, p.z)); p.y = p.sol + 0.25 + p.h;
    }
    // profil adouci : une voie ne suit pas chaque bosse, mais ne passe jamais sous le sol
    for (let k = 0; k < 2; k++) { const y = P.map((p) => p.y); for (let i = 1; i + 1 < P.length; i++) P[i].y = Math.max(P[i].sol + 0.25, (y[i - 1] + 2 * y[i] + y[i + 1]) / 4); }
    for (const p of P) { p.bas = app.heightAt(p.x, p.z); p.eau = T.wetAt(p.x, p.z) > 0.5 && p.bas < 1; p.haut = p.eau || p.y - p.bas > 1.3; }      // un ouvrage la porte
    R.push(P);
  }
  // 2. points portés par un ouvrage, rangés par cases : deux voies voisines partagent le même viaduc
  const CASE = 8, cases = new Map(), cle = (x, z) => Math.floor(x / CASE) * 4096 + Math.floor(z / CASE);
  R.forEach((P, k) => { for (const p of P) if (p.haut) { const c = cle(p.x, p.z); let l = cases.get(c); if (!l) cases.set(c, (l = [])); l.push(p.x, p.z, k); } });
  const voisine = (x, z, k) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = cases.get(cle(x + i * CASE, z + j * CASE)); if (l) for (let q = 0; q < l.length; q += 3) if (l[q + 2] !== k && Math.hypot(l[q] - x, l[q + 1] - z) < 2.4) return true; } return false; };
  // 3. rubans et ouvrages
  let km = 0, viaduc = 0, surEau = 0, noyes = 0; const echantillon = [], hw = LARGE / 2;
  const TOUT = 50, tout = new Map(), cleT = (x, z) => Math.floor(x / TOUT) * 4096 + Math.floor(z / TOUT);
  for (const P of R) for (const p of P) { const c = cleT(p.x, p.z); let l = tout.get(c); if (!l) tout.set(c, (l = [])); l.push(p.x, p.z); }
  const pres = (x, z, d) => { const n = Math.ceil(d / TOUT); for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const l = tout.get(cleT(x + i * TOUT, z + j * TOUT)); if (l) for (let q = 0; q < l.length; q += 2) if (Math.hypot(l[q] - x, l[q + 1] - z) < d) return true; } return false; };
  R.forEach((P, k) => {
    for (let i = 0; i + 1 < P.length; i++) {
      const p = P[i], q = P[i + 1], mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2;
      // ruban : droite puis gauche en p, gauche puis droite en q — tourné vers le ciel
      BR.at('voie', mx, mz).quad(p.x + p.fz * hw, p.y, p.z - p.fx * hw, p.x - p.fz * hw, p.y, p.z + p.fx * hw, q.x - q.fz * hw, q.y, q.z + q.fx * hw, q.x + q.fz * hw, q.y, q.z - q.fx * hw, 0, p.s / MOTIF, 1, q.s / MOTIF, BLANC, 1, 1);
      km += q.s - p.s; quads++;
      if (T.wetAt(mx, mz) > 0.5) { surEau += q.s - p.s; if (Math.min(p.y, q.y) < 3) noyes++; }
      if ((i + k * 7) % 60 === 0) echantillon.push([p.x, p.y, p.z, +(p.y - p.bas).toFixed(1), p.eau ? 1 : 0]);
      if (!p.haut || !q.haut) continue;
      viaduc += q.s - p.s; quads += 2;
      const bs = B.at('stone', mx, mz), bp = B.at('plain', mx, mz), ba = B.at('pont', mx, mz), yp = p.y - 0.27, yq = q.y - 0.27;
      const arche = p.eau || q.eau ? 26 : 9.5;                             // portée d'une arche : un pont, un viaduc
      const G = (o, sg, d) => [o.x - o.fz * sg * d, o.z + o.fx * sg * d];  // point à d mètres sur la gauche (sg = 1) ou la droite
      // tablier : dessus et dessous
      { const a = G(p, 1, DEMI), b = G(p, -1, DEMI), c = G(q, -1, DEMI), d = G(q, 1, DEMI);
        bp.quad(b[0], yp, b[1], a[0], yp, a[1], d[0], yq, d[1], c[0], yq, c[1], 0, 0, 1, 1, TABLIER, 1, 1);
        bp.quad(a[0], yp - 0.7, a[1], b[0], yp - 0.7, b[1], c[0], yq - 0.7, c[1], d[0], yq - 0.7, d[1], 0, 0, 1, 1, TABLIER, 0.5, 0.5); }
      for (const sg of [1, -1]) {
        const tp = G(p, sg, 3.6), tq = G(q, sg, 3.6);
        if (voisine(tp[0], tp[1], k) && voisine(tq[0], tq[1], k)) continue;                              // une autre voie de ce côté : pas de flanc entre elles
        const a = G(p, sg, DEMI), b = G(q, sg, DEMI), ya = p.eau ? -2.6 : Math.min(p.bas, app.heightAt(a[0], a[1])) - 0.4, yb = q.eau ? -2.6 : Math.min(q.bas, app.heightAt(b[0], b[1])) - 0.4;
        const u0 = p.s / arche, u1 = q.s / arche; quads += 4;
        // flanc à arches, vu du dehors ; parapet d'un mètre, ses deux faces et son dessus
        if (sg > 0) ba.quad(a[0], ya, a[1], b[0], yb, b[1], b[0], yq, b[1], a[0], yp, a[1], u0, 0, u1, 1, PIERRE, 0.84, 1);
        else ba.quad(b[0], yb, b[1], a[0], ya, a[1], a[0], yp, a[1], b[0], yq, b[1], u1, 0, u0, 1, PIERRE, 0.84, 1);
        const c = G(p, sg, DEMI - 0.35), d = G(q, sg, DEMI - 0.35), H = 1;
        if (sg > 0) { bs.quad(a[0], yp, a[1], b[0], yq, b[1], b[0], yq + H, b[1], a[0], yp + H, a[1], u0, 0, u1, 0.25, PIERRE, 0.92, 1); bs.quad(d[0], yq, d[1], c[0], yp, c[1], c[0], yp + H, c[1], d[0], yq + H, d[1], u1, 0, u0, 0.25, PIERRE, 0.8, 0.9); bs.quad(c[0], yp + H, c[1], a[0], yp + H, a[1], b[0], yq + H, b[1], d[0], yq + H, d[1], 0, 0, 0.1, u1 - u0, PIERRE, 1, 1); }
        else { bs.quad(b[0], yq, b[1], a[0], yp, a[1], a[0], yp + H, a[1], b[0], yq + H, b[1], u1, 0, u0, 0.25, PIERRE, 0.92, 1); bs.quad(c[0], yp, c[1], d[0], yq, d[1], d[0], yq + H, d[1], c[0], yp + H, c[1], u0, 0, u1, 0.25, PIERRE, 0.8, 0.9); bs.quad(a[0], yp + H, a[1], c[0], yp + H, c[1], d[0], yq + H, d[1], b[0], yq + H, b[1], 0, 0, 0.1, u1 - u0, PIERRE, 1, 1); }
      }
      // sur la terre ferme, on ne traverse pas un viaduc à pied et l'on n'y plante pas d'arbre
      if (!p.eau && !q.eau && T.wetAt(mx, mz) < 0.5) { const a = G(p, 1, DEMI), b = G(p, -1, DEMI), c = G(q, -1, DEMI), d = G(q, 1, DEMI); app.foot.push({ ring: [a, b, c, d], top: Math.max(yp, yq) + 1, fer: true }); }
    }
  });
  return { n: R.length, km: km / 1000, tris: quads * 2, viaduc: Math.round(viaduc), surEau: Math.round(surEau), noyes, echantillon, pres, lignes: R };
}
