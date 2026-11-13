// Calque « degré de certitude » : chaque volume bâti est teinté selon ce que l'on sait de lui.
// La classe d'un point vient de l'étape de construction qui a posé le bâtiment (voir city.js).
import * as THREE from 'three';

// 2 : grands monuments restitués ; 3 : emprise du plan, élévation vraisemblable ; 4 : conjectural ; 5 : hors du plan.
export const CERT = {
  1: { name: 'Attesté par le plan de 1380', note: 'Emplacement attesté par le plan de 1380.', css: '' },
  2: { name: 'Restitué d’après images et vestiges', note: 'Volume restitué d’après les images anciennes et les vestiges.', css: '#e9b23c' },
  3: { name: 'Emprise attestée, élévation vraisemblable', note: 'Emprise au sol attestée par le plan de 1380 ; élévation vraisemblable.', css: '#5b9bd9' },
  4: { name: 'Conjectural', note: 'Forme conjecturale.', css: '#a79bc4' },
  5: { name: 'Hors du plan de 1380', note: 'Hors du plan de 1380 : situé d’après son emplacement connu.', css: '#dd8298' },
};
const RANK = [0, 1, 5, 4, 2, 3];           // priorité d'une classe quand plusieurs se disputent une cellule

export class Certainty {
  constructor(app) {
    this.app = app;
    const s = app.solid;
    this.w = s.w; this.h = s.h; this.x0 = s.x0; this.z0 = s.z0;
    this.cls = new Uint8Array(s.w * s.h); this.prev = new Uint8Array(s.w * s.h);
    this.on = false;
    const col = (k) => ({ value: new THREE.Color(CERT[k].css) });
    this.uniforms = { uCert: { value: 0 }, uCertMap: { value: null }, uCertFrame: { value: new THREE.Vector4(s.x0, s.z0, s.w, s.h) }, uCertC2: col(2), uCertC3: col(3), uCertC4: col(4), uCertC5: col(5) };
  }

  // À appeler après chaque étape de construction : les cellules devenues pleines depuis l'appel précédent reçoivent la classe c (0 : aucune).
  stage(c) {
    const d = this.app.solid.data, p = this.prev, o = this.cls;
    for (let i = 0; i < d.length; i++) { const v = d[i]; if (v !== p[i]) { if (v && c && !o[i]) o[i] = c; p[i] = v; } }
  }

  // Trame à 2 m, élargie d'une cellule pour couvrir les débords de toiture, puis texture lue par les matières du bâti.
  finish() {
    const W = Math.ceil(this.w / 2), H = Math.ceil(this.h / 2), a = new Uint8Array(W * H), o = this.cls;
    for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) { const c = o[j * this.w + i]; if (!c) continue; const k = (j >> 1) * W + (i >> 1); if (RANK[c] > RANK[a[k]]) a[k] = c; }
    const b = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      let best = a[j * W + i];
      if (!best) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const n = a[jj * W + ii]; if (RANK[n] > RANK[best]) best = n; }
      b[j * W + i] = best * 40;
    }
    const t = new THREE.DataTexture(b, W, H, THREE.RedFormat, THREE.UnsignedByteType);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.unpackAlignment = 1; t.needsUpdate = true;
    this.uniforms.uCertMap.value = t;
    this.uniforms.uCertFrame.value.set(this.x0, this.z0, W * 2, H * 2);
    this.map = a; this.W = W; this.H = H; this.cls = this.prev = null;
  }

  // Classe dominante autour d'un point (1 : rien de bâti, emplacement attesté ; 5 : hors du plan).
  classAt(x, z, rad = 12) {
    if (!this.map) return 1;
    const at = (px, pz) => { const i = Math.floor((px - this.x0) / 2), j = Math.floor((pz - this.z0) / 2); return i < 0 || j < 0 || i >= this.W || j >= this.H ? 5 : this.map[j * this.W + i]; };
    const n = [0, 0, 0, 0, 0, 0];             // le centre pèse le plus : une place ouverte n'hérite pas de la classe des maisons qui la bordent
    n[at(x, z)] += 6;
    for (const [r, wt] of [[0.35, 2], [0.7, 1], [1, 0.5]]) for (let k = 0; k < 8; k++) n[at(x + Math.cos(k * 0.785) * rad * r, z + Math.sin(k * 0.785) * rad * r)] += wt;
    let best = 0; for (const c of [2, 3, 5, 4]) if (n[c] > n[best]) best = c;
    return best || 1;
  }

  // Greffe le calque sur une matière : `fixed` impose une classe (arbres), sinon la classe est lue dans la trame.
  certify(mat, fixed = 0) {
    const U = this.uniforms, prev = mat.onBeforeCompile, key = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      Object.assign(sh.uniforms, U);
      if (!fixed) sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vCertXZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCertXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform float uCert; uniform sampler2D uCertMap; uniform vec4 uCertFrame; uniform vec3 uCertC2; uniform vec3 uCertC3; uniform vec3 uCertC4; uniform vec3 uCertC5;
        ${fixed ? '' : 'varying vec2 vCertXZ;'}`).replace('#include <opaque_fragment>', `#include <opaque_fragment>
        if (uCert > 0.001) {
          ${fixed ? `float cc = ${fixed.toFixed(1)};` : `vec2 cuv = (vCertXZ - uCertFrame.xy) / uCertFrame.zw;
          float cc = (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) ? 5.0 : floor(texture2D(uCertMap, cuv).r * 6.375 + 0.5);`}
          if (cc > 1.5) {
            vec3 ct = cc < 2.5 ? uCertC2 : cc < 3.5 ? uCertC3 : cc < 4.5 ? uCertC4 : uCertC5;
            float cl = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
            gl_FragColor.rgb = mix(gl_FragColor.rgb, ct * (0.1 + 1.7 * cl), uCert * 0.9);
          }
        }`);
    };
    mat.customProgramCacheKey = () => key + '|cert' + fixed;
    mat.needsUpdate = true;
  }

  set(on) { this.on = !!on; this.uniforms.uCert.value = on ? 1 : 0; }
}
