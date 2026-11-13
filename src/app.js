// Application : scène, rendu, boucle, API de pilotage.
import * as THREE from 'three';
import { FRAME } from './data.js';
import { buildLanduse, LU, Raster } from './raster.js';
import { Terrain, buildTerrainGeometries } from './terrain.js';
import { Sky } from './sky.js';
import { makeWater } from './water.js';
import { paintCoreGround, paintOuterGround, makeDetailTexture, makeGroundMaterial } from './ground.js';
import { CameraRig } from './controls.js';
import { buildCity } from './city.js';
import { clamp } from './geom.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

export class App {
  constructor(container) {
    this.container = container;
    this.onProgress = () => {};
    this.listeners = [];
  }

  async start() {
    const step = async (label, frac) => { this.onProgress(label, frac); if (this.log) this.log(label); await tick(); await tick(); };
    await step('Lecture du plan de 1380…', 0.03);
    const lu = buildLanduse();
    const terrain = new Terrain(lu);
    this.lu = lu; this.terrain = terrain;
    this.solid = new Raster(FRAME.x0, FRAME.z0, FRAME.x1, FRAME.z1, 1);   // obstacles (bâtiments, murs)
    this.deck = new Map();                                                // tabliers de ponts : hauteur par cellule

    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 700;
    this.mobile = mobile;
    const shot = location.hash === '#shot';   // mode capture : pas de boucle d'animation (contrôles automatisés)
    this.shot = shot;
    const T0 = performance.now();
    this.log = (m) => { if (shot) console.log(`[${((performance.now() - T0) / 1000).toFixed(1)}s] ${m}`); };
    const renderer = new THREE.WebGLRenderer({ antialias: !shot, powerPreference: 'high-performance', preserveDrawingBuffer: shot });
    renderer.setPixelRatio(shot ? 1 : Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    this.renderer = renderer;
    this.container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    const scene = new THREE.Scene();
    this.scene = scene;
    scene.fog = new THREE.FogExp2(0xa0b8d0, 0.00011);
    const camera = new THREE.PerspectiveCamera(42, 1, 1, 26000);
    this.camera = camera;
    this.sky = new Sky(scene);
    const smap = shot || mobile ? 2048 : 4096;
    this.sky.sun.shadow.mapSize.set(smap, smap);
    this.shadowState = { x: 1e9, z: 1e9, s: 0, hour: -1 };

    await step('Modelé du terrain et de la Seine…', 0.08);
    const geos = buildTerrainGeometries(terrain);
    const detail = makeDetailTexture();
    const maxTex = Math.min(renderer.capabilities.maxTextureSize, mobile ? 2048 : 4096);
    const core = new THREE.Mesh(geos.core, makeGroundMaterial(paintCoreGround(maxTex), detail));
    const outer = new THREE.Mesh(geos.outer, makeGroundMaterial(paintOuterGround(terrain), detail));
    core.receiveShadow = true; outer.receiveShadow = true; core.matrixAutoUpdate = false; outer.matrixAutoUpdate = false;
    scene.add(core, outer);
    this.water = makeWater(this.sky);
    scene.add(this.water);

    this.rig = new CameraRig(camera, renderer.domElement, this);
    await buildCity(this, step);
    this.log('ville construite');
    this.resize();
    this.log('resize ok');
    window.addEventListener('resize', () => this.resize());
    this.clock = new THREE.Clock();
    this.time = 0;
    this.setHour(10.5);
    this.log('scène prête');
    this.rig.update(0);
    if (shot) return;
    this.renderNow();
    renderer.setAnimationLoop(() => this.frame());
  }

  // ---- monde ----
  heightAt(x, z) { return this.terrain.height(x, z); }
  deckKey(x, z) { return ((Math.floor(x / 2) + 4096) << 13) | (Math.floor(z / 2) + 4096); }
  deckSet(x, z, y) { this.deck.set(this.deckKey(x, z), y); }
  walkHeight(x, z) {
    const d = this.deck.get(this.deckKey(x, z));
    const t = Math.max(this.terrain.height(x, z), 0.2);
    return d != null ? Math.max(d, t) : t;
  }
  walkable(x, z) {
    if (x < FRAME.x0 + 2 || x > FRAME.x1 - 2 || z < FRAME.z0 + 2 || z > FRAME.z1 - 2) return false;
    if (this.solid.get(x, z)) return false;
    if (this.deck.has(this.deckKey(x, z))) return true;
    return this.terrain.height(x, z) > 0.35;
  }

  setHour(h) {
    this.sky.setHour(h);
    this.scene.fog.color.copy(this.sky.horizon);
    this.scene.fog.density = 0.00009 + 0.00007 * this.sky.golden * this.sky.day;
    this.shadowState.hour = -1;
    if (this.onHour) this.onHour(h);
    this.emit('hour', h);
  }
  setView(pos, tgt) { this.rig.setView(pos, tgt); }

  on(type, fn) { this.listeners.push([type, fn]); }
  emit(type, data) { for (const [t, fn] of this.listeners) if (t === type) fn(data); }

  resize() {
    const w = this.container.clientWidth || window.innerWidth, h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  updateShadow() {
    const st = this.shadowState, rig = this.rig, sun = this.sky.sun;
    const dist = rig.mode === 'walk' ? 90 : rig.cur.dist;
    let S = clamp(dist * 0.85, 110, 2400);
    S = Math.pow(1.5, Math.round(Math.log(S) / Math.log(1.5)));
    const tx = rig.target.x, tz = rig.target.z;
    if (st.hour === this.sky.hour && st.s === S && Math.hypot(tx - st.x, tz - st.z) < S * 0.22) return;
    st.x = tx; st.z = tz; st.s = S; st.hour = this.sky.hour;
    const d = this.sky.lightDir;
    sun.target.position.set(tx, 0, tz); sun.target.updateMatrixWorld();
    sun.position.set(tx + d.x * 4000, d.y * 4000, tz + d.z * 4000);
    const c = sun.shadow.camera;
    const ext = S * 1.35;
    c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext; c.near = 500; c.far = 8000; c.updateProjectionMatrix();
    const texel = (2 * ext) / sun.shadow.mapSize.x;
    sun.shadow.normalBias = texel * 1.6; sun.shadow.bias = -0.00012;
    this.renderer.shadowMap.needsUpdate = true;
  }

  frame() {
    const dt = Math.min(0.1, this.clock.getDelta());
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

  stats() { const i = this.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures }; }
}
