// Surface de la Seine et des fossés : reflets du ciel, clapot et éclat du soleil.
import * as THREE from 'three';
import { WORLD } from './terrain.js';

const VERT = /* glsl */`
varying vec3 vW;
#include <fog_pars_vertex>
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
precision highp float;
varying vec3 vW;
uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uDeep;
uniform float uTime; uniform float uDay;
#include <fog_pars_fragment>
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float waves(vec2 p){
  float t = uTime;
  float s = noise(p*0.55 + vec2(t*0.35, t*0.12)) * 0.5;
  s += noise(p*1.3 + vec2(-t*0.5, t*0.28)) * 0.3;
  s += noise(p*3.1 + vec2(t*0.9, -t*0.6)) * 0.14;
  return s;
}
void main(){
  vec3 V = normalize(cameraPosition - vW);
  float dist = length(cameraPosition - vW);
  float e = 0.35;
  float amp = 0.55 / (1.0 + dist * 0.004);
  float h0 = waves(vW.xz), hx = waves(vW.xz + vec2(e, 0.0)), hz = waves(vW.xz + vec2(0.0, e));
  vec3 N = normalize(vec3(-(hx - h0) / e * amp, 1.0, -(hz - h0) / e * amp));
  float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(R.y, 0.0, 1.0), 0.55));
  vec3 col = mix(uDeep * (0.25 + 0.75 * uDay), sky, clamp(fres + 0.18, 0.0, 1.0));
  float sp = pow(max(dot(R, uSun), 0.0), 220.0);
  col += uSunCol * sp * 2.5;
  gl_FragColor = vec4(col, mix(0.86, 1.0, fres));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function makeWater(sky) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uSun: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uDeep: { value: new THREE.Color(0.075, 0.115, 0.085) }, uTime: { value: 0 }, uDay: { value: 1 },
  }]);
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, fog: true, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry(WORLD * 2, WORLD * 2, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  mesh.update = (time) => {
    uniforms.uTime.value = time;
    uniforms.uSun.value.copy(sky.sunDir); uniforms.uSunCol.value.copy(sky.uniforms.uSunCol.value);
    uniforms.uZenith.value.copy(sky.uniforms.uZenith.value); uniforms.uHorizon.value.copy(sky.uniforms.uHorizon.value);
    uniforms.uDay.value = sky.day;
  };
  return mesh;
}
