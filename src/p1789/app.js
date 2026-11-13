// Application de la page « Paris 1789 » : même moteur que la maquette de 1380 (ciel, eau, caméra, assemblage des
// volumes), autre ville. Les méthodes de pilotage portent les mêmes noms que dans src/app.js.
import * as THREE from 'three';
import { CADRE } from './data.js';
import { Terrain89 } from './terrain.js';
import { buildCity89, paintPlan, makeFieldsTile, ilotClasses, TUILE } from './city.js';
import { buildGrid } from '../grid.js';
import { Sky } from '../sky.js';
import { makeWater } from '../water.js';
import { makeDetailTexture, makeGroundMaterial } from '../groundmat.js';
import { CameraRig } from '../controls.js';
import { People } from '../people.js';
import { makeFigureAtlas89, outfit89 } from './figures.js';
import { clamp, smoothstep } from '../geom.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const LOIN = 16000;                                                    // demi-côté du paysage autour de la ville (m)
export const CENTRE_RECT = { x: -2700, z: -2500, w: 5000, h: 4200 };   // ville dense : sol peint plus finement

// Sol de la ville : plan d'ensemble, remplacé au centre par une toile plus fine ; grain de détail par-dessus.
function makeGround89(wide, centre, detail) {
  const m = new THREE.MeshStandardMaterial({ map: wide, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = { value: detail }; sh.uniforms.uCentre = { value: centre };
    sh.uniforms.uRect = { value: new THREE.Vector4(CENTRE_RECT.x, CENTRE_RECT.z, CENTRE_RECT.w, CENTRE_RECT.h) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWxz = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;\nuniform sampler2D uDetail; uniform sampler2D uCentre; uniform vec4 uRect;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 cu = (vWxz - uRect.xy) / uRect.zw;
        float cin = smoothstep(0.0, 0.012, min(min(cu.x, 1.0 - cu.x), min(cu.y, 1.0 - cu.y)));
        if (cin > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(uCentre, vec2(cu.x, 1.0 - cu.y)).rgb, cin);
        float dA = texture2D(uDetail, vWxz * 0.21).r; float dB = texture2D(uDetail, vWxz * 0.023).r;
        diffuseColor.rgb *= (0.62 + 0.5 * dA) * (0.8 + 0.34 * dB);`);
  };
  m.customProgramCacheKey = () => 'ground89';
  return m;
}

export class App89 {
  constructor(container) { this.container = container; this.onProgress = () => {}; this.listeners = []; }

  async start() {
    const step = async (label, frac) => { this.onProgress(label, frac); if (this.log) this.log(label); await tick(); await tick(); };
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 700;
    this.mobile = mobile;
    const shot = location.hash === '#shot'; this.shot = shot;
    const T0 = performance.now();
    this.log = (m) => { if (shot) console.log(`[${((performance.now() - T0) / 1000).toFixed(1)}s] ${m}`); };
    await step('Lecture des plans de Verniquet et de Vasserot…', 0.03);
    const terrain = new Terrain89(); this.terrain = terrain;
    this.ilotCls = ilotClasses();

    const renderer = new THREE.WebGLRenderer({ antialias: !shot, powerPreference: 'high-performance', preserveDrawingBuffer: shot });
    renderer.setPixelRatio(shot ? 1 : Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    this.renderer = renderer; this.container.appendChild(renderer.domElement); renderer.domElement.style.touchAction = 'none';
    const scene = new THREE.Scene(); this.scene = scene;
    scene.fog = new THREE.FogExp2(0xa0b8d0, 0.00011);
    const camera = new THREE.PerspectiveCamera(42, 1, 1, 26000); this.camera = camera;
    this.sky = new Sky(scene);
    const smap = shot || mobile ? 2048 : 4096; this.sky.sun.shadow.mapSize.set(smap, smap);
    this.shadowState = { x: 1e9, z: 1e9, s: 0, hour: -1, t: 0 };

    await step('Le sol de Paris, d’après le nivellement de Girard…', 0.1);
    const fw = CADRE.x1 - CADRE.x0, fh = CADRE.z1 - CADRE.z0, bank = (cx, cz, d) => { let lo = 1, hi = 0; for (const [a, b] of [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d]]) { const w = terrain.wetAt(cx + a, cz + b); if (w < lo) lo = w; if (w > hi) hi = w; } return hi > 0.03 && lo < 0.97; };
    const core = buildGrid({ x0: CADRE.x0, z0: CADRE.z0, x1: CADRE.x1, z1: CADRE.z1, cell: 25, sub: 5, terrain, skirt: 14, fine: (cx, cz) => bank(cx, cz, 16), uv: (x, z) => [(x - CADRE.x0) / fw, 1 - (z - CADRE.z0) / fh] });
    const inside = (x, z) => Math.min(x - CADRE.x0, CADRE.x1 - x, z - CADRE.z0, CADRE.z1 - z);
    const outer = buildGrid({ x0: -LOIN, z0: -LOIN, x1: LOIN, z1: LOIN, cell: 320, sub: 8, terrain, fine: (cx, cz) => inside(cx, cz) < 0 && bank(cx, cz, 200), skip: (cx, cz) => inside(cx, cz) > 420, lower: (x, z) => 9 * smoothstep(0, 120, inside(x, z)), uv: (x, z) => [x / TUILE, -z / TUILE], skirt: 90 });

    await step('Rues, îlots et jardins…', 0.18);
    const tile = makeFieldsTile(), maxTex = Math.min(renderer.capabilities.maxTextureSize, mobile ? 2048 : 4096);
    const paint = (R) => {
      const s = maxTex / Math.max(R.w, R.h), cv = document.createElement('canvas'); cv.width = Math.round(R.w * s); cv.height = Math.round(R.h * s);
      paintPlan(cv.getContext('2d', { willReadFrequently: true }), { s, x: (x) => (x - R.x) * s, y: (z) => (z - R.z) * s }, tile, this.ilotCls, terrain.ext);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return [cv, t];
    };
    const [wideCv, wideTex] = paint({ x: CADRE.x0, z: CADRE.z0, w: fw, h: fh }), [centreCv, centreTex] = paint(CENTRE_RECT);
    this.plan = { wide: wideCv, centre: centreCv, rectWide: { x: CADRE.x0, z: CADRE.z0, w: fw, h: fh }, rectCentre: CENTRE_RECT };
    const detail = makeDetailTexture(), fields = new THREE.CanvasTexture(tile);
    fields.colorSpace = THREE.SRGBColorSpace; fields.wrapS = fields.wrapT = THREE.RepeatWrapping; fields.anisotropy = 4;
    const coreMesh = new THREE.Mesh(core, makeGround89(wideTex, centreTex, detail)), outerMesh = new THREE.Mesh(outer, makeGroundMaterial(fields, detail));
    coreMesh.receiveShadow = true; outerMesh.receiveShadow = true; coreMesh.matrixAutoUpdate = false; outerMesh.matrixAutoUpdate = false;
    scene.add(coreMesh, outerMesh);
    this.water = makeWater(this.sky); scene.add(this.water);

    this.rig = new CameraRig(camera, renderer.domElement, this);
    this.rig.goal = { x: -350, z: -420, dist: 3600, az: -0.45, el: 0.66 }; this.rig.cur = { ...this.rig.goal };
    this.navRect = CENTRE_RECT;
    await buildCity89(this, step);
    this.people = new People(this, { nav: this.nav, atlas: makeFigureAtlas89(mobile ? 0.5 : 1), outfit: outfit89, noBeasts: true, groundCell: 3 });
    this.on('frame', (dt) => this.people.update(dt));
    this.log(`${this.stats.bati} corps de bâtiment, ${this.stats.evoques} évoqués, ${this.stats.tris} triangles, ${this.treeCount} arbres, ${this.people.total} passants possibles`);
    this.on('hour', () => { const e = (1 - this.sky.day) * 1.5; this.materials.facade.emissiveIntensity = e; this.materials.rdc.emissiveIntensity = e; });
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.clock = new THREE.Clock(); this.time = 0;
    this.setHour(10.5);
    this.rig.update(0);
    if (shot) return;
    this.renderNow();
    renderer.setAnimationLoop(() => this.frame());
  }

  // ---- monde ----
  heightAt(x, z) { return this.terrain.height(x, z); }
  walkHeight(x, z) { return Math.max(this.terrain.height(x, z), 0.2); }
  walkable(x, z) {
    if (x < CADRE.x0 + 40 || x > CADRE.x1 - 40 || z < CADRE.z0 + 40 || z > CADRE.z1 - 40) return false;
    if (this.terrain.height(x, z) < 0.35) return false;
    return !this.footAt(x, z);
  }

  setHour(h) {
    this.sky.setHour(h);
    this.scene.fog.color.copy(this.sky.horizon);
    this.renderer.toneMappingExposure = this.sky.exposure;
    this.scene.fog.density = 0.00009 + 0.00007 * this.sky.golden * this.sky.day;
    this.shadowState.hour = -1;
    this.emit('hour', h);
  }
  setView(pos, tgt) { this.rig.setView(pos, tgt); }
  on(type, fn) { this.listeners.push([type, fn]); }
  emit(type, data) { for (const [t, fn] of this.listeners) if (t === type) fn(data); }

  resize() {
    const w = this.container.clientWidth || window.innerWidth, h = this.container.clientHeight || window.innerHeight;
    const cap = this.shot ? 1 : Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2, Math.sqrt(3.6e6 / (w * h)));
    this.renderer.setPixelRatio(Math.max(0.6, cap * (this.quality || 1)));
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // Si l'image met durablement plus de 45 ms à se calculer, on réduit la résolution, puis les ombres des arbres.
  autoQuality(ms) {
    const q = (this.qStat ||= { n: 0, sum: 0, level: 0, skip: 40 });
    if (q.skip > 0) { q.skip--; return; }
    q.n++; q.sum += ms;
    if (q.n < 50) return;
    const avg = q.sum / q.n; q.n = 0; q.sum = 0;
    if (avg > 45 && q.level < 3) { q.level++; q.skip = 30; this.quality = [1, 0.8, 0.65, 0.55][q.level]; this.crowdScale = [1, 0.8, 0.55, 0.35][q.level]; if (q.level >= 2 && this.trees) this.trees.castShadow = false; this.shadowState.hour = -1; this.resize(); }
  }

  updateShadow() {
    const st = this.shadowState, rig = this.rig, sun = this.sky.sun;
    const dist = rig.mode === 'walk' ? 90 : rig.cur.dist;
    let S = clamp(dist * 0.85, 110, 2400);
    S = Math.pow(1.5, Math.round(Math.log(S) / Math.log(1.5)));
    const tx = rig.target.x, tz = rig.target.z;
    if (st.s === S && Math.hypot(tx - st.x, tz - st.z) < S * 0.22 && st.hour === this.sky.hour) return;
    st.x = tx; st.z = tz; st.s = S; st.hour = this.sky.hour; st.t = this.time;
    const d = this.sky.lightDir;
    sun.target.position.set(tx, 0, tz); sun.target.updateMatrixWorld();
    sun.position.set(tx + d.x * 4000, d.y * 4000, tz + d.z * 4000);
    const c = sun.shadow.camera, ext = S * 1.35;
    c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext; c.near = 500; c.far = 8000; c.updateProjectionMatrix();
    sun.shadow.normalBias = ((2 * ext) / sun.shadow.mapSize.x) * 1.6; sun.shadow.bias = -0.00012;
    this.renderer.shadowMap.needsUpdate = true;
  }

  frame() {
    const raw = this.clock.getDelta();
    this.autoQuality(raw * 1000);
    const dt = Math.min(0.1, raw);
    this.time += dt;
    this.rig.update(dt);
    this.emit('frame', dt);
    this.renderNow();
  }

  renderNow() {
    this.sky.update(this.camera, this.time);
    this.water.update(this.time);
    this.updateShadow();
    this.renderer.render(this.scene, this.camera);
  }
}
