// Mouvement : bateaux qui naviguent, bannières au vent, roues des moulins, vols d'oiseaux.
import * as THREE from 'three';
import { FRAME } from './data.js';
import { mulberry32, clamp } from './geom.js';
import { Mesh3 } from './people.js';

const lin = (v) => Math.pow(v / 255, 2.2);
const C = (r, g, b) => [lin(r), lin(g), lin(b)];

function boatGeo(sail) {
  const m = new Mesh3(), wood = C(98, 74, 52), dark = C(66, 50, 38), L = [0, 0, 0];
  m.box(0, -0.25, 0.7, 0, 0.75, 2.6, 1.15, 3.0, wood, L, 2);                         // coque
  m.box(0, -0.25, 0.75, 3.4, 0.2, 0.5, 0.45, 0.9, wood, L, 1); m.box(0, -0.25, 0.7, -3.3, 0.3, 0.4, 0.6, 0.7, wood, L, 1);
  m.box(0, 0.25, 0.3, 0, 1.0, 2.8, 1.0, 2.8, dark, L, 1);                             // plancher
  m.box(0, 0.3, 0.95, 0.3, 0.7, 1.2, 0.55, 1.0, [1, 1, 1], [0, 0, 1], 1);              // cargaison (teintée)
  if (sail) {
    m.box(0, 0.3, 6.2, 1.5, 0.07, 0.07, 0.05, 0.05, dark, L, 0);
    m.box(0, 5.5, 5.62, 1.5, 2.1, 0.06, 2.1, 0.06, dark, L, 3);
    m.box(0, 1.9, 5.5, 1.58, 2.0, 0.025, 1.9, 0.025, C(222, 212, 188), L, 0);        // voile carrée
  } else for (const s of [-1, 1]) m.box(s * 1.7, 0.5, 0.58, -0.6, 0.9, 0.05, 0.9, 0.05, dark, L, 3);   // avirons
  // batelier à la poupe
  m.box(0, 0.3, 1.1, -2.2, 0.15, 0.12, 0.17, 0.12, C(96, 84, 70), L, 0); m.box(0, 1.1, 1.52, -2.2, 0.17, 0.11, 0.2, 0.12, [1, 1, 1], [0, 0, 1], 1); m.box(0, 1.52, 1.78, -2.2, 0.075, 0.085, 0.08, 0.09, C(214, 170, 138), L, 3);
  return m.geometry();
}

export function buildMovingBoats(app, people) {
  const T = app.terrain, r = mulberry32(4), N = app.mobile ? 14 : 34, group = new THREE.Group();
  const kinds = [boatGeo(true), boatGeo(false)], col = new THREE.Color();
  const boats = [];
  for (let k = 0; k < 2; k++) {
    const n = Math.ceil(N / 2), g = kinds[k];
    g.setAttribute('aAnim', new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2));
    const im = new THREE.InstancedMesh(g, people.mat, n);
    im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < n; i++) {
      let x = 0, z = 0, ok = false;
      for (let t = 0; t < 60 && !ok; t++) { x = FRAME.x0 + 120 + r() * (FRAME.x1 - FRAME.x0 - 240); z = -900 + r() * 2200; ok = T.sdWater(x, z) > 24; }
      const p = [[196, 176, 110], [150, 120, 90], [200, 190, 170], [120, 100, 80], [150, 62, 50], [70, 92, 132]][(r() * 6) | 0];
      col.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace); im.setColorAt(i, col);
      boats.push({ im, i, x, z, h: r() * 6.28, dir: r() < 0.5 ? 1 : -1, sp: (k === 0 ? 1.1 : 1.6) + r() * 1.2, sc: (k === 0 ? 1.25 : 0.72) + r() * 0.3, ph: r() * 6.28, ok });
    }
    im.instanceColor.needsUpdate = true;
    group.add(im);
  }
  app.scene.add(group);
  const e = 4;
  const update = (dt, time) => {
    for (const b of boats) {
      if (b.ok) {
        const sd = T.sdWater(b.x, b.z);
        let gx = T.sdWater(b.x + e, b.z) - T.sdWater(b.x - e, b.z), gz = T.sdWater(b.x, b.z + e) - T.sdWater(b.x, b.z - e);
        const gl = Math.hypot(gx, gz) || 1; gx /= gl; gz /= gl;
        const k = clamp((26 - sd) / 26, 0, 1) * 1.6;                    // près des rives ou des îles : on regagne le large
        const vx = -gz * b.dir + gx * k, vz = gx * b.dir + gz * k;
        const want = Math.atan2(vx, vz);
        let d = want - b.h; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        b.h += clamp(d, -0.5 * dt, 0.5 * dt);
        const nx = b.x + Math.sin(b.h) * b.sp * dt, nz = b.z + Math.cos(b.h) * b.sp * dt;
        if (nx < FRAME.x0 + 70 || nx > FRAME.x1 - 70 || nz > FRAME.z1 - 70 || nz < FRAME.z0 + 70) { b.dir = -b.dir; b.h += Math.PI; }
        else if (T.sdWater(nx, nz) > 6) { b.x = nx; b.z = nz; }
        else { b.dir = -b.dir; }
      }
      const s = b.ok ? b.sc : 0, c = Math.cos(b.h) * s, sn = Math.sin(b.h) * s, m = b.im.instanceMatrix.array, o = b.i * 16;
      m[o] = c; m[o + 1] = 0; m[o + 2] = -sn; m[o + 3] = 0; m[o + 4] = 0; m[o + 5] = s; m[o + 6] = 0; m[o + 7] = 0; m[o + 8] = sn; m[o + 9] = 0; m[o + 10] = c; m[o + 11] = 0;
      m[o + 12] = b.x; m[o + 13] = Math.sin(time * 1.3 + b.ph) * 0.05; m[o + 14] = b.z; m[o + 15] = 1;
    }
    for (const im of group.children) im.instanceMatrix.needsUpdate = true;
  };
  update(0, 0);
  return { group, update, count: boats.length };
}

// Bannières : toile ondulant au vent, semée d'or pour les bannières royales.
export function buildFlags(app) {
  const list = app.flags, n = list.length; if (!n) return null;
  const g = new THREE.PlaneGeometry(2.6, 1.5, 10, 2); g.translate(1.3, 0, 0);
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uLight: { value: 1 } }]);
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: true, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      uniform float uTime; varying vec2 vUv; varying vec3 vCol; varying float vW;
      #include <fog_pars_vertex>
      void main(){
        vUv = uv; vCol = instanceColor;
        vec3 p = position; float w = uv.x; float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
        float wave = sin(w * 7.5 - uTime * 6.5 + ph) * 0.26 * w + sin(w * 3.1 - uTime * 3.7 + ph) * 0.12 * w;
        p.z += wave; p.y += sin(w * 5.0 - uTime * 4.0 + ph) * 0.05 * w - w * w * 0.12;
        vW = wave;
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uLight; varying vec2 vUv; varying vec3 vCol; varying float vW;
      #include <fog_pars_fragment>
      void main(){
        vec3 col = vCol;
        float royal = step(vCol.r, 0.12);
        vec2 q = fract(vUv * vec2(6.0, 4.0) + vec2(0.0, floor(vUv.x * 6.0) * 0.5)) - 0.5;
        col = mix(col, vec3(0.83, 0.62, 0.16), smoothstep(0.24, 0.14, length(q * vec2(1.0, 0.8))) * royal);
        col *= (0.3 + 0.7 * uLight) * (0.86 + vW * 0.7);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const im = new THREE.InstancedMesh(g, mat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color(), r = mulberry32(12);
  const cols = [[14, 34, 110], [156, 26, 26], [14, 34, 110], [200, 190, 160]];
  list.forEach((f, i) => {
    q.setFromAxisAngle(up, 0.5 + (r() - 0.5) * 0.25); v.set(f[0], f[1], f[2]); s.setScalar(f[4] || 1);
    m4.compose(v, q, s); im.setMatrixAt(i, m4);
    const c = cols[f[3] % cols.length]; col.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace); im.setColorAt(i, col);
  });
  im.frustumCulled = false;
  app.scene.add(im);
  return { mesh: im, uniforms };
}

// Roues à aubes des moulins du Grand-Pont.
export function buildWheels(app) {
  const out = [], pos = [], nor = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 6.2832, c = Math.cos(a), s = Math.sin(a), r0 = 0.5, r1 = 2.3, w = 0.65;
    const q = [[-w, r0 * c, r0 * s], [w, r0 * c, r0 * s], [w, r1 * c, r1 * s], [-w, r1 * c, r1 * s]];
    for (const [i, j, l] of [[0, 1, 2], [0, 2, 3]]) { pos.push(...q[i], ...q[j], ...q[l]); nor.push(0, -s, c, 0, -s, c, 0, -s, c); }
  }
  for (const sx of [-0.65, 0.65]) for (let k = 0; k < 8; k++) {        // jantes
    const a0 = (k / 8) * 6.2832, a1 = ((k + 1) / 8) * 6.2832, ri = 2.0, ro = 2.3;
    const q = [[sx, ri * Math.cos(a0), ri * Math.sin(a0)], [sx, ro * Math.cos(a0), ro * Math.sin(a0)], [sx, ro * Math.cos(a1), ro * Math.sin(a1)], [sx, ri * Math.cos(a1), ri * Math.sin(a1)]];
    for (const [i, j, l] of [[0, 1, 2], [0, 2, 3]]) { pos.push(...q[i], ...q[j], ...q[l]); nor.push(1, 0, 0, 1, 0, 0, 1, 0, 0); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.9, side: THREE.DoubleSide });
  for (const w of app.wheels) {
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(w.x, w.y, w.z); mesh.rotation.order = 'YXZ'; mesh.rotation.y = Math.atan2(-w.uz, w.ux);
    app.scene.add(mesh); out.push(mesh);
  }
  return out;
}

// Oiseaux : petits vols tournoyant autour des tours et du gibet.
export function buildBirds(app) {
  const M = app.monuments, centers = [];
  if (M.notreDame) centers.push([M.notreDame.R.cx - 50, M.notreDame.top + 6, M.notreDame.R.cz + 10, 34]);
  if (M.montfaucon) centers.push([M.montfaucon.x, M.montfaucon.top + 8, M.montfaucon.z, 26]);
  if (M.sainteChapelle) centers.push([M.sainteChapelle.x, M.sainteChapelle.top - 14, M.sainteChapelle.z, 24]);
  if (M.temple) centers.push([M.temple.x, M.temple.top + 4, M.temple.z, 22]);
  centers.push([60, 46, -352, 40], [-900, 60, -812, 30], [-330, 40, -990, 44], [400, 30, 60, 50]);
  const per = 22, n = centers.length * per, r = mulberry32(5);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.35, -0.75, 0, -0.2, 0, 0, -0.1, 0, 0, 0.35, 0, 0, -0.1, 0.75, 0, -0.2], 3));
  g.setAttribute('aWing', new THREE.Float32BufferAttribute([0, 1, 0, 0, 0, 1], 1));
  const data = new Float32Array(n * 4), orbit = new Float32Array(n * 4);
  centers.forEach((c, k) => { for (let i = 0; i < per; i++) { const j = k * per + i; data[j * 4] = c[0]; data[j * 4 + 1] = c[1] + (r() - 0.5) * 16; data[j * 4 + 2] = c[2]; data[j * 4 + 3] = c[3] * (0.4 + r() * 0.9); orbit[j * 4] = r() * 6.28; orbit[j * 4 + 1] = (0.25 + r() * 0.35) * (r() < 0.5 ? 1 : -1); orbit[j * 4 + 2] = r() * 6.28; orbit[j * 4 + 3] = 0.7 + r() * 0.6; } });
  const ig = new THREE.InstancedBufferGeometry(); ig.index = null; ig.attributes.position = g.attributes.position; ig.attributes.aWing = g.attributes.aWing;
  ig.setAttribute('aCenter', new THREE.InstancedBufferAttribute(data, 4)); ig.setAttribute('aOrbit', new THREE.InstancedBufferAttribute(orbit, 4));
  ig.instanceCount = n;
  const uniforms = { uTime: { value: 0 }, uCol: { value: new THREE.Color(0.05, 0.05, 0.06) } };
  const mat = new THREE.ShaderMaterial({ uniforms, side: THREE.DoubleSide, vertexShader: /* glsl */`
    attribute vec4 aCenter; attribute vec4 aOrbit; attribute float aWing; uniform float uTime;
    void main(){
      float a = aOrbit.x + uTime * aOrbit.y;
      vec3 c = aCenter.xyz + vec3(cos(a) * aCenter.w, sin(uTime * 0.6 + aOrbit.z) * 3.0, sin(a) * aCenter.w * 0.8);
      float hd = -a + (aOrbit.y < 0.0 ? 3.14159 : 0.0);
      vec3 p = position * aOrbit.w;
      p.y += aWing * sin(uTime * 9.0 + aOrbit.z) * 0.38 * aOrbit.w;
      vec3 w = vec3(p.x * cos(hd) + p.z * sin(hd), p.y, -p.x * sin(hd) + p.z * cos(hd));
      gl_Position = projectionMatrix * viewMatrix * vec4(c + w, 1.0);
    }`, fragmentShader: /* glsl */`uniform vec3 uCol; void main(){ gl_FragColor = vec4(uCol, 1.0); }` });
  const mesh = new THREE.Mesh(ig, mat); mesh.frustumCulled = false;
  app.scene.add(mesh);
  return { mesh, uniforms };
}
