// Application des pages « Paris 1789 » et « Lutèce » : même moteur que la maquette de 1380 (ciel, eau, caméra,
// assemblage des volumes), autre ville. Les méthodes de pilotage portent les mêmes noms que dans src/app.js.
// La ville elle-même est un « monde » fourni à la construction (src/p1789/monde.js, src/lutece/monde.js) : cadre,
// terrain, peinture du sol, construction, habitants. Ce fichier ne contient aucune donnée.
import * as THREE from 'three';
import { buildGrid } from '../grid.js';
import { Sky } from '../sky.js';
import { makeWater } from '../water.js';
import { makeDetailTexture, makeCobbleTexture, makeGroundMaterial } from '../groundmat.js';
import { CameraRig } from '../controls.js';
import { People } from '../people.js';
import { clamp, smoothstep } from '../geom.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const LOIN = 16000;                                                    // demi-côté du paysage autour de la ville (m)

// Sol de la ville : plan d'ensemble, remplacé au centre par une toile plus fine ; grain de détail par-dessus.
// De près, les pavés paraissent là où le masque `pave` (rues, quais et places de la ville dense) est blanc.
// voirie (facultatif) : { tex, cadre, D } — carte de distance signée au bord des rues (positive dans la rue, en mètres
// rapportés à D) : le shader y dessine trottoirs, bordures et chaussée, nets à toute échelle.
function makeGround89(wide, centre, detail, cobble, pave, rect, voirie) {
  const m = new THREE.MeshStandardMaterial({ map: wide, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = { value: detail }; sh.uniforms.uCentre = { value: centre }; sh.uniforms.uCobble = { value: cobble }; sh.uniforms.uPave = pave;
    sh.uniforms.uRect = { value: new THREE.Vector4(rect.x, rect.z, rect.w, rect.h) };
    if (voirie) { const C = voirie.cadre; sh.uniforms.uVoirie = { value: voirie.tex }; sh.uniforms.uLargeur = { value: voirie.large }; sh.uniforms.uCadre = { value: new THREE.Vector4(C.x0, C.z0, C.x1 - C.x0, C.z1 - C.z0) }; sh.uniforms.uVD = { value: voirie.D };
      sh.uniforms.uTrottoir = { value: new THREE.Color('#d9d4c8') }; sh.uniforms.uBordure = { value: new THREE.Color('#99937f') }; sh.uniforms.uChaussee = { value: new THREE.Color('#a69f8f') }; sh.uniforms.uRueLoin = { value: new THREE.Color('#bfb9ab') }; }
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWxz = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;\nuniform sampler2D uDetail; uniform sampler2D uCentre; uniform sampler2D uCobble; uniform sampler2D uPave; uniform vec4 uRect;' + (voirie ? '\nuniform sampler2D uVoirie; uniform sampler2D uLargeur; uniform vec4 uCadre; uniform float uVD; uniform vec3 uTrottoir; uniform vec3 uBordure; uniform vec3 uChaussee; uniform vec3 uRueLoin;' : ''))
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 cu = (vWxz - uRect.xy) / uRect.zw;
        float cin = smoothstep(0.0, 0.012, min(min(cu.x, 1.0 - cu.x), min(cu.y, 1.0 - cu.y)));
        if (cin > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(uCentre, vec2(cu.x, 1.0 - cu.y)).rgb, cin);
        float chaussee = 0.0;${voirie ? `
        vec2 vu = (vWxz - uCadre.xy) / uCadre.zw;
        if (vu.x > 0.0 && vu.x < 1.0 && vu.y > 0.0 && vu.y < 1.0) {
          float sd = (texture2D(uVoirie, vu).r - 0.5) * 2.0 * uVD;                 // distance au bord de la rue (m)
          float px = max(length(dFdx(vWxz)), length(dFdy(vWxz))), e = max(px, 0.12);      // taille d'un point d'écran au sol
          float H = max(0.0, (texture2D(uLargeur, vu).r - 0.5) * 2.0 * uVD), tw = clamp(0.44 * H - 0.2, 1.4, 8.0);      // demi-largeur de la voie, largeur du trottoir
          float rue = smoothstep(-e, e, sd - 0.1), k1 = smoothstep(tw - e, tw + e, sd), k2 = smoothstep(tw + 0.35 - e, tw + 0.35 + e, sd);
          vec3 c = mix(mix(uTrottoir, uBordure, k1), uChaussee, k2);
          c = mix(c, uRueLoin, smoothstep(1.5, 5.0, px));                           // de loin, la rue redevient un aplat
          diffuseColor.rgb = mix(diffuseColor.rgb, c, rue); chaussee = rue * k2;
        }` : ''}
        float dA = texture2D(uDetail, vWxz * 0.21).r; float dB = texture2D(uDetail, vWxz * 0.023).r;
        diffuseColor.rgb *= (0.62 + 0.5 * dA) * (0.8 + 0.34 * dB);
        float pv = max(cin * texture2D(uPave, cu).r, chaussee) * (1.0 - smoothstep(60.0, 240.0, length(vViewPosition)));
        vec3 cob = texture2D(uCobble, vWxz * 0.4).rgb;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.48 + cob * 0.8), pv * 0.9);`);
  };
  m.customProgramCacheKey = () => 'ground89-pave' + (voirie ? '-voirie' : '');
  return m;
}

export class App89 {
  // monde : { cadre { x0, z0, x1, z1 }, centre { x, z, w, h } (sol peint finement, trame des passants), vue (vue
  // d'ensemble), tuile (côté du motif de campagne), etapes [3 libellés], terrain(app), motif(), peindre(ctx, T, tuile,
  // app), construire(app, step), figures(mobile), lumieres [matières éclairées la nuit], bilan(app), et, facultatif,
  // voirie(app, taille) → { data, w, h, D, large { data, w, h } } : carte de distance aux bords des rues et carte, plus
  // grossière, de la demi-largeur des voies, pour des trottoirs et des chaussées nets }
  constructor(container, monde) { this.container = container; this.monde = monde; this.onProgress = () => {}; this.listeners = []; this.deck = new Map(); }

  async start() {
    const step = async (label, frac) => { this.onProgress(label, frac); if (this.log) this.log(label); await tick(); await tick(); };
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 700;
    this.mobile = mobile;
    const shot = location.hash === '#shot'; this.shot = shot;
    const T0 = performance.now();
    this.log = (m) => { if (shot) console.log(`[${((performance.now() - T0) / 1000).toFixed(1)}s] ${m}`); };
    const monde = this.monde, CADRE = monde.cadre, CENTRE_RECT = monde.centre, TUILE = monde.tuile;
    await step(monde.etapes[0], 0.03);
    const terrain = monde.terrain(this); this.terrain = terrain;

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

    await step(monde.etapes[1], 0.1);
    const fw = CADRE.x1 - CADRE.x0, fh = CADRE.z1 - CADRE.z0, bank = (cx, cz, d) => { let lo = 1, hi = 0; for (const [a, b] of [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d]]) { const w = terrain.wetAt(cx + a, cz + b); if (w < lo) lo = w; if (w > hi) hi = w; } return hi > 0.03 && lo < 0.97; };
    const core = buildGrid({ x0: CADRE.x0, z0: CADRE.z0, x1: CADRE.x1, z1: CADRE.z1, cell: 25, sub: 5, terrain: terrain.mesh, skirt: 14, fine: (cx, cz) => bank(cx, cz, 16) || terrain.affine(cx, cz), uv: (x, z) => [(x - CADRE.x0) / fw, 1 - (z - CADRE.z0) / fh] });
    const inside = (x, z) => Math.min(x - CADRE.x0, CADRE.x1 - x, z - CADRE.z0, CADRE.z1 - z);
    const outer = buildGrid({ x0: -LOIN, z0: -LOIN, x1: LOIN, z1: LOIN, cell: 320, sub: 8, terrain: terrain.mesh, fine: (cx, cz) => inside(cx, cz) < 0 && bank(cx, cz, 200), skip: (cx, cz) => inside(cx, cz) > 420, lower: (x, z) => 9 * smoothstep(0, 120, inside(x, z)), uv: (x, z) => [x / TUILE, -z / TUILE], skirt: 90 });

    await step(monde.etapes[2], 0.18);
    // le plan d'ensemble est allégé sur téléphone ; la toile du centre, où l'on regarde de près, reste fine, sauf appareil à petite mémoire
    const tile = monde.motif(), gl = renderer.capabilities.maxTextureSize, petit = mobile && navigator.deviceMemory && navigator.deviceMemory < 4;
    const paint = (R, maxTex) => {
      const s = maxTex / Math.max(R.w, R.h), cv = document.createElement('canvas'); cv.width = Math.round(R.w * s); cv.height = Math.round(R.h * s);
      monde.peindre(cv.getContext('2d', { willReadFrequently: true }), { s, x: (x) => (x - R.x) * s, y: (z) => (z - R.z) * s }, tile, this);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return [cv, t];
    };
    const [wideCv, wideTex] = paint({ x: CADRE.x0, z: CADRE.z0, w: fw, h: fh }, Math.min(gl, mobile ? 2048 : 4096)), [centreCv, centreTex] = paint(CENTRE_RECT, Math.min(gl, petit ? 2048 : 4096));
    this.plan = { wide: wideCv, centre: centreCv, rectWide: { x: CADRE.x0, z: CADRE.z0, w: fw, h: fh }, rectCentre: CENTRE_RECT };
    const detail = makeDetailTexture(), fields = new THREE.CanvasTexture(tile);
    fields.colorSpace = THREE.SRGBColorSpace; fields.wrapS = fields.wrapT = THREE.RepeatWrapping; fields.anisotropy = 4;
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blank.needsUpdate = true;
    this.pave = { value: blank };
    let voirie = null;
    if (monde.voirie) { const v = monde.voirie(this, Math.min(gl, mobile ? 2048 : 4096)), t = new THREE.DataTexture(v.data, v.w, v.h, THREE.RedFormat); t.minFilter = t.magFilter = THREE.LinearFilter; t.unpackAlignment = 1; t.needsUpdate = true; const l = new THREE.DataTexture(v.large.data, v.large.w, v.large.h, THREE.RedFormat); l.minFilter = l.magFilter = THREE.LinearFilter; l.unpackAlignment = 1; l.needsUpdate = true; voirie = { tex: t, large: l, cadre: CADRE, D: v.D }; this.voirie = v; }
    this.log('sol peint (plan d’ensemble et toile fine), voirie');
    this.groundMat = makeGround89(wideTex, centreTex, detail, makeCobbleTexture(), this.pave, CENTRE_RECT, voirie);
    const coreMesh = new THREE.Mesh(core, this.groundMat), outerMesh = new THREE.Mesh(outer, makeGroundMaterial(fields, detail));
    coreMesh.receiveShadow = true; outerMesh.receiveShadow = true; coreMesh.matrixAutoUpdate = false; outerMesh.matrixAutoUpdate = false;
    scene.add(coreMesh, outerMesh);
    this.water = makeWater(this.sky); scene.add(this.water);

    this.rig = new CameraRig(camera, renderer.domElement, this);
    this.rig.goal = { ...monde.vue }; this.rig.cur = { ...this.rig.goal };
    this.navRect = CENTRE_RECT;
    await monde.construire(this, step);
    this.log('ville construite');
    { const n = this.nav, src = this.pavage || n.data, px = new Uint8Array(n.w * n.h); for (let i = 0; i < px.length; i++) px[i] = src[i] ? 255 : 0;      // masque des pavés : la trame des voies, ou celle que la ville désigne (this.pavage)
      const t = new THREE.DataTexture(px, n.w, n.h, THREE.RedFormat); t.minFilter = t.magFilter = THREE.LinearFilter; t.unpackAlignment = 1; t.needsUpdate = true; this.pave.value = t; }
    this.log('trame des passants');
    this.people = new People(this, { nav: this.nav, ...monde.figures(mobile), noBeasts: true, groundCell: 3 });
    this.log('passants');
    this.on('frame', (dt) => this.people.update(dt));
    // maisons, monuments, arbres et habitants vont dans un groupe que le passage d'une époque à l'autre enfonce dans
    // le sol ou dresse (setCityScale) ; le sol, le fleuve et ses quais restent en place
    this.bati = new THREE.Group(); this.bati.matrixAutoUpdate = false;
    for (const m of this.batiMeshes) this.bati.add(m);
    if (this.trees) this.bati.add(this.trees);
    this.bati.add(this.people.group); scene.add(this.bati); this.bati.updateMatrix(); this.cityScale = 1;
    this.log(monde.bilan(this));
    this.on('hour', () => { const e = (1 - this.sky.day) * 1.5; for (const k of monde.lumieres) this.materials[k].emissiveIntensity = e; });
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
  // Tabliers de ponts jetés par-dessus l'eau : hauteur par case de 2 m (mêmes noms que dans src/app.js ; la foule s'en sert)
  deckKey(x, z) { return ((Math.floor(x / 2) + 4096) << 13) | (Math.floor(z / 2) + 4096); }
  deckSet(x, z, y) { this.deck.set(this.deckKey(x, z), y); }
  heightAt(x, z) { const h = this.terrain.height(x, z); if (!this.deck.size) return h; const d = this.deck.get(this.deckKey(x, z)); return d !== undefined ? Math.max(d, h) : h; }
  walkHeight(x, z) { return Math.max(this.heightAt(x, z), 0.2); }
  walkable(x, z) {
    const CADRE = this.monde.cadre;
    if (x < CADRE.x0 + 40 || x > CADRE.x1 - 40 || z < CADRE.z0 + 40 || z > CADRE.z1 - 40) return false;
    if (this.deck.size && this.deck.has(this.deckKey(x, z))) return true;
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
    const apply = () => { q.skip = 30; q.bon = 0; this.quality = [1, 0.85, 0.72, 0.62][q.level]; this.crowdScale = [1, 0.8, 0.55, 0.35][q.level]; if (this.trees) this.trees.castShadow = q.level < 2; this.shadowState.hour = -1; this.resize(); };
    // trop lent : on réduit. Redevenu fluide durablement (vue rapprochée, moins de ville à l'écran) : on rend la netteté.
    // Une remontée aussitôt suivie d'une rechute double l'attente avant la suivante : pas de va-et-vient.
    if (avg > 45 && q.level < 3) { if (q.monte) q.besoin = Math.min(24, (q.besoin || 3) * 2); q.monte = false; q.level++; apply(); }
    else if (avg < 24 && q.level > 0) { if ((q.bon = (q.bon || 0) + 1) >= (q.besoin || 3)) { q.level--; q.monte = true; apply(); } }
    else q.bon = 0;
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
    this.stepMorph(raw);
    this.emit('frame', dt);
    this.renderNow();
  }

  // ---- passage d'une époque à l'autre (page d'accueil « Paris à travers le temps ») ----
  // Enfonce la ville dans le sol (k = 0) ou la dresse (k = 1) : tout ce qui est bâti, planté ou vivant est dans this.bati.
  setCityScale(k) {
    const b = this.bati; this.cityScale = k;
    // la ville se tasse autour du niveau moyen du sol (15 m) tout en descendant : les maisons disparaissent peu à peu,
    // où que soit leur pied, et les plus hauts monuments sont sous terre à la fin
    const s = 0.12 + 0.88 * k; b.visible = k > 0.004; b.scale.y = s; b.position.y = 15 * (1 - s) - 22 * (1 - k); b.updateMatrix();
    this.shadowState.hour = -1;                            // les ombres suivent
    document.body.classList.toggle('morph', k < 0.999);
  }
  // Anime l'enfoncement (to = 0) ou l'élévation (to = 1) ; la promesse est tenue à la fin. Sans boucle d'animation
  // (page en pause, capture), le changement est immédiat.
  morph(to, ms = 1200) {
    if (this.morphing) { const m = this.morphing; this.morphing = null; m.done(); }
    return new Promise((done) => {
      if (this.paused || this.shot) { this.setCityScale(to); done(); return; }
      this.morphing = { from: this.cityScale ?? 1, to, t: 0, ms: Math.max(1, ms), done };
    });
  }
  stepMorph(raw) {
    const m = this.morphing; if (!m) return;
    m.t += raw * 1000; const u = Math.min(1, m.t / m.ms), e = u * u * (3 - 2 * u);
    this.setCityScale(m.from + (m.to - m.from) * e);
    if (u >= 1) { this.morphing = null; m.done(); }
  }
  // Hors champ, la maquette ne calcule plus rien ; elle garde sa ville en mémoire.
  pause() { if (this.paused || this.shot) return; this.paused = true; this.renderer.setAnimationLoop(null); if (this.morphing) { const m = this.morphing; this.morphing = null; this.setCityScale(m.to); m.done(); } }
  resume() { if (!this.paused) return; this.paused = false; this.clock.getDelta(); if (this.qStat) { this.qStat.skip = 40; this.qStat.n = 0; this.qStat.sum = 0; } this.renderer.setAnimationLoop(() => this.frame()); }

  renderNow() {
    this.sky.update(this.camera, this.time);
    this.water.update(this.time);
    this.updateShadow();
    this.renderer.render(this.scene, this.camera);
  }
}
