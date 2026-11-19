// Calque « d'où vient ce bâtiment » de la page Paris 1889 : chaque maison est teintée selon ce qui la justifie — réelle
// (bâti daté de 1889 ou d'avant par l'APUR), probable, disparue (emprise de l'atlas de Vasserot) ou évoquée. Les
// monuments, les gares, l'Exposition et les édifices modelés gardent leur couleur. Même procédé que le calque de
// certitude de la page de 1380 : une trame des emprises (4 m, 8 m sur téléphone), lue par les matières du bâti.
import * as THREE from 'three';
import { CADRE } from './data.js';

export const STATUTS = [
  { code: 1, s: 'R', nom: 'Réel', css: '#3f9a54', note: 'Encore debout, daté de 1889 ou d’avant par l’APUR : emprise et hauteur réelles.' },
  { code: 2, s: 'P', nom: 'Probable', css: '#4f8fd6', note: 'Bâti entre 1851 et 1914, sans année connue, dans un voisinage ancien.' },
  { code: 3, s: 'V', nom: 'Disparu', css: '#e2a92e', note: 'Emprise de l’atlas de Vasserot (1810-1836), là où le bâtiment actuel est plus récent.' },
  { code: 4, s: 'EG', nom: 'Évoqué', css: '#d77393', note: 'Maison évoquée, sur l’emprise actuelle ou le long des rues de 1900.' },
];
const CODE = { R: 1, P: 2, V: 3, E: 4, G: 4 }, PAS = 60;          // la trame code chaque statut par paliers de 60

export class Statuts {
  constructor(app) {
    this.app = app; this.cell = app.mobile ? 8 : 4;
    const W = (this.W = Math.ceil((CADRE.x1 - CADRE.x0) / this.cell)), H = (this.H = Math.ceil((CADRE.z1 - CADRE.z0) / this.cell));
    this.cv = document.createElement('canvas'); this.cv.width = W; this.cv.height = H;
    this.ctx = this.cv.getContext('2d', { willReadFrequently: true }); this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, W, H);
    const col = (k) => ({ value: new THREE.Color(STATUTS[k].css) }), vide = new THREE.DataTexture(new Uint8Array(4), 1, 1); vide.needsUpdate = true;
    this.uniforms = { uStatut: { value: 0 }, uStatutMap: { value: vide }, uStatutFrame: { value: new THREE.Vector4(CADRE.x0, CADRE.z0, W * this.cell, H * this.cell) }, uStatutC1: col(0), uStatutC2: col(1), uStatutC3: col(2), uStatutC4: col(3) };
    this.on = false; this.compte = [0, 0, 0, 0, 0];
  }
  // Une maison bâtie : son emprise est tracée dans la trame, à la couleur de son statut.
  poser(e) {
    const c = CODE[e.s]; if (!c) return; this.compte[c]++;
    const x = this.ctx, k = 1 / this.cell; x.fillStyle = `rgb(${c * PAS},0,0)`; x.beginPath();
    e.rings[0].forEach((p, i) => { const u = (p[0] - CADRE.x0) * k, v = (p[1] - CADRE.z0) * k; if (i) x.lineTo(u, v); else x.moveTo(u, v); }); x.closePath(); x.fill();
  }
  // Fin du tracé : la trame devient une texture, chaque case gardant le statut le plus proche de sa teinte.
  finir() {
    const im = this.ctx.getImageData(0, 0, this.W, this.H).data, d = new Uint8Array(this.W * this.H);
    for (let i = 0; i < d.length; i++) d[i] = Math.min(4, Math.round(im[i * 4] / PAS)) * PAS;
    const t = new THREE.DataTexture(d, this.W, this.H, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.unpackAlignment = 1; t.needsUpdate = true;
    this.uniforms.uStatutMap.value = t; this.data = d; this.cv = this.ctx = null;
  }
  // statut lu dans la trame au point (x, z) : 0 si aucune maison n'y est tracée
  lire(x, z) { if (!this.data) return 0; const i = Math.floor((x - CADRE.x0) / this.cell), j = Math.floor((z - CADRE.z0) / this.cell); if (i < 0 || j < 0 || i >= this.W || j >= this.H) return 0; return Math.round(this.data[j * this.W + i] / PAS); }
  // Greffe le calque sur une matière du bâti.
  greffer(mat) {
    const U = this.uniforms, prev = mat.onBeforeCompile, key = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vStatutXZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvStatutXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform float uStatut; uniform sampler2D uStatutMap; uniform vec4 uStatutFrame; uniform vec3 uStatutC1; uniform vec3 uStatutC2; uniform vec3 uStatutC3; uniform vec3 uStatutC4;
        varying vec2 vStatutXZ;`).replace('#include <opaque_fragment>', `#include <opaque_fragment>
        if (uStatut > 0.001) {
          vec2 suv = (vStatutXZ - uStatutFrame.xy) / uStatutFrame.zw;
          float sc = (suv.x >= 0.0 && suv.x <= 1.0 && suv.y >= 0.0 && suv.y <= 1.0) ? floor(texture2D(uStatutMap, suv).r * 255.0 / ${PAS}.0 + 0.5) : 0.0;
          if (sc > 0.5) {
            vec3 st = sc < 1.5 ? uStatutC1 : sc < 2.5 ? uStatutC2 : sc < 3.5 ? uStatutC3 : uStatutC4;
            float sl = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
            gl_FragColor.rgb = mix(gl_FragColor.rgb, st * (0.1 + 1.7 * sl), uStatut * 0.9);
          }
        }`);
    };
    mat.customProgramCacheKey = () => key + '|statut';
    mat.needsUpdate = true;
  }
  set(on) { this.on = !!on; this.uniforms.uStatut.value = on ? 1 : 0; }
}
