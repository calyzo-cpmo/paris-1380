// Ciel, soleil, lune et ambiance lumineuse selon l'heure.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from './geom.js';

const VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 0.0);
  gl_Position = projectionMatrix * vec4(p.xyz, 1.0);
  gl_Position.z = gl_Position.w; // toujours au fond
}`;

const FRAG = /* glsl */`
precision highp float;
varying vec3 vDir;
uniform vec3 uSun; uniform vec3 uMoon;
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunCol; uniform vec3 uGlow;
uniform float uDay; uniform float uTime; uniform float uCloud;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(17.1,9.2); a*=0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  float t = pow(1.0 - h, 5.0);
  vec3 col = mix(uZenith, uHorizon, t);
  float sd = max(dot(d, uSun), 0.0);
  col += uGlow * (pow(sd, 6.0)*0.35 + pow(sd, 48.0)*0.6) * (0.35 + 0.65*t);
  col += uSunCol * smoothstep(0.99965, 0.99985, sd) * 14.0;          // disque solaire
  // étoiles et lune
  float night = 1.0 - uDay;
  if (night > 0.02) {
    vec2 sp = d.xz / (abs(d.y) + 0.35) * 190.0;
    float st = step(0.9975, hash(floor(sp))) * smoothstep(0.02, 0.25, d.y);
    col += vec3(0.9, 0.95, 1.0) * st * night * 0.9;
    float md = max(dot(d, uMoon), 0.0);
    col += vec3(0.85, 0.9, 1.0) * (smoothstep(0.99975, 0.9999, md) * 2.2 + pow(md, 300.0) * 0.12) * night;
  }
  // nuages : nappe projetée
  if (d.y > 0.01) {
    vec2 cp = d.xz / (d.y + 0.12) * 1.15 + vec2(uTime * 0.004, uTime * 0.0015);
    float c = fbm(cp * 1.6);
    float cov = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.32, c) * smoothstep(0.01, 0.16, d.y);
    float lit = 0.55 + 0.45 * fbm(cp * 3.1 + 3.0);
    vec3 cc = mix(uHorizon * 0.9, vec3(1.0), 0.55) * (0.35 + 0.75 * uDay) * lit + uGlow * pow(sd, 5.0) * 0.5;
    col = mix(col, cc, cov * 0.82);
  }
  col = mix(col, uHorizon, smoothstep(0.0, -0.06, d.y));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const C = (r, g, b) => new THREE.Color(r, g, b);
function mix3(a, b, t) { return new THREE.Color(lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t)); }

export class Sky {
  constructor(scene) {
    this.uniforms = {
      uSun: { value: new THREE.Vector3(0, 1, 0) }, uMoon: { value: new THREE.Vector3(0, 1, 0) },
      uZenith: { value: C(0.1, 0.3, 0.7) }, uHorizon: { value: C(0.6, 0.75, 0.9) }, uSunCol: { value: C(1, 0.95, 0.85) }, uGlow: { value: C(1, 0.8, 0.5) },
      uDay: { value: 1 }, uTime: { value: 0 }, uCloud: { value: 0.52 },
    };
    const geo = new THREE.SphereGeometry(1, 32, 16);
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -10; this.mesh.scale.setScalar(1000);
    scene.add(this.mesh);
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun); scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfd4ff, 0x6a5f4a, 1);
    scene.add(this.hemi);
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.horizon = C(0.6, 0.75, 0.9);
    this.night = 0;
    this.setHour(10.5);
  }

  // Heure solaire (0-24). Soleil de fin de printemps à la latitude de Paris ; le nord est vers -z.
  setHour(hour) {
    this.hour = hour;
    const lat = 48.85 * Math.PI / 180, decl = 18 * Math.PI / 180;
    const ha = (hour - 12) * 15 * Math.PI / 180;
    const sinEl = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
    const el = Math.asin(clamp(sinEl, -1, 1));
    // azimut depuis le sud, positif vers l'ouest
    const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat));
    const dir = new THREE.Vector3(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    this.sunDir.copy(dir);
    const moon = new THREE.Vector3(Math.sin(az) * 0.55, 0.62, -Math.cos(az) * 0.55).normalize();
    const elDeg = el * 180 / Math.PI;
    const day = smoothstep(-7, 6, elDeg);          // 0 nuit → 1 jour
    const golden = 1 - smoothstep(2, 22, elDeg);   // lumière rasante
    this.night = 1 - day;
    const zen = mix3(C(0.006, 0.01, 0.03), mix3(C(0.07, 0.22, 0.6), C(0.13, 0.2, 0.42), golden), day);
    let hor = mix3(C(0.02, 0.03, 0.06), mix3(C(0.5, 0.67, 0.9), C(0.92, 0.6, 0.38), golden * 0.85), day);
    const sunCol = mix3(C(1, 0.96, 0.88), C(1, 0.55, 0.25), golden);
    const glow = mix3(C(1, 0.85, 0.6), C(1, 0.45, 0.15), golden).multiplyScalar(day * (0.5 + golden));
    const u = this.uniforms;
    u.uSun.value.copy(dir); u.uMoon.value.copy(moon); u.uZenith.value.copy(zen); u.uHorizon.value.copy(hor);
    u.uSunCol.value.copy(sunCol).multiplyScalar(smoothstep(-2, 2, elDeg)); u.uGlow.value.copy(glow); u.uDay.value = day;
    this.horizon.copy(hor);
    // lumière directe : soleil le jour, lune la nuit
    const sunI = 3.4 * smoothstep(-1, 14, elDeg);
    if (sunI > 0.08) { this.sun.color.copy(sunCol); this.sun.intensity = sunI; this.lightDir = dir.clone(); }
    else { this.sun.color.setRGB(0.55, 0.65, 0.95); this.sun.intensity = 0.5; this.lightDir = moon.clone(); }
    this.hemi.color.copy(mix3(C(0.1, 0.14, 0.28), mix3(C(0.62, 0.76, 1.0), C(0.75, 0.62, 0.6), golden), day));
    this.hemi.groundColor.copy(mix3(C(0.03, 0.035, 0.05), C(0.42, 0.37, 0.28), day));
    this.hemi.intensity = lerp(1.25, 1.15, day);
    this.day = day; this.golden = golden;
  }

  update(camera, time) {
    this.mesh.position.copy(camera.position);
    this.mesh.scale.setScalar(camera.far * 0.9);
    this.uniforms.uTime.value = time;
  }
}
