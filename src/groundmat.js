// Grain de détail et matériau du sol : plan peint, modulé de près par un bruit, avec ses calques facultatifs.
// Sans dépendance aux données d'une ville.
import * as THREE from 'three';
import { mulberry32 } from './geom.js';

export const NEAR = 3600;   // demi-côté de la campagne proche, peinte finement (m)

// Texture de détail carrelable (grain du sol), mêlée dans le shader.
export function makeDetailTexture() {
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const ctx = cv.getContext('2d', { willReadFrequently: true }), im = ctx.createImageData(N, N), r = mulberry32(5);
  const base = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) base[i] = r();
  const at = (x, y) => base[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = at(x, y) * 0.5 + (at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1)) * 0.09 + at(x >> 2 << 2, y >> 2 << 2) * 0.14;
    const g = 150 + (v - 0.5) * 150;
    const k = (y * N + x) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = g; im.data[k + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  return tex;
}

export function makeGroundMaterial(map, detail, street, near, epoch) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = { value: detail };
    if (street) { sh.uniforms.uMask = { value: street.mask }; sh.uniforms.uCobble = { value: street.cobble }; }
    if (near) { sh.uniforms.uNear = { value: near }; sh.uniforms.uNearHalf = { value: NEAR }; }
    if (epoch) Object.assign(sh.uniforms, epoch);            // calque temporel : dessin d'une autre époque posé sur le sol
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWxz = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;\nuniform sampler2D uDetail;' + (street ? '\nuniform sampler2D uMask;\nuniform sampler2D uCobble;' : '') + (near ? '\nuniform sampler2D uNear;\nuniform float uNearHalf;' : '')
      + (epoch ? '\nuniform float uEpochOn; uniform sampler2D uEpochCityMap; uniform sampler2D uEpochWideMap; uniform vec4 uEpochCity; uniform vec4 uEpochWide;' : ''))
      .replace('#include <map_fragment>', '#include <map_fragment>\n'
        + (near ? 'vec3 nearCol = texture2D(uNear, vec2(vWxz.x / (2.0 * uNearHalf) + 0.5, 0.5 - vWxz.y / (2.0 * uNearHalf))).rgb;\ndiffuseColor.rgb = mix(nearCol, diffuseColor.rgb, smoothstep(uNearHalf * 0.84, uNearHalf * 0.98, max(abs(vWxz.x), abs(vWxz.y))));\n' : '')
        + 'float dA = texture2D(uDetail, vWxz * 0.21).r; float dB = texture2D(uDetail, vWxz * 0.023).r;\ndiffuseColor.rgb *= (0.62 + 0.5 * dA) * (0.8 + 0.34 * dB);'
        + (street ? '\nfloat stM = texture2D(uMask, vMapUv).r; vec3 cob = texture2D(uCobble, vWxz * 0.4).rgb;\ndiffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.5 + cob * 1.15), smoothstep(0.1, 0.9, stM) * 0.85);' : '')
        + (epoch ? `
        vec2 epC = (vWxz - uEpochCity.xy) / uEpochCity.zw, epW = (vWxz - uEpochWide.xy) / uEpochWide.zw;
        vec4 epCc = texture2D(uEpochCityMap, vec2(epC.x, 1.0 - epC.y)), epWc = texture2D(uEpochWideMap, vec2(epW.x, 1.0 - epW.y));
        float epInC = step(0.0, epC.x) * step(epC.x, 1.0) * step(0.0, epC.y) * step(epC.y, 1.0), epInW = step(0.0, epW.x) * step(epW.x, 1.0) * step(0.0, epW.y) * step(epW.y, 1.0);
        vec4 epCol = mix(epWc * epInW, epCc, epInC);
        diffuseColor.rgb = mix(diffuseColor.rgb, epCol.rgb, epCol.a * uEpochOn);` : ''));
  };
  m.customProgramCacheKey = () => (street ? 'ground-street' : near ? 'ground-near' : 'ground') + (epoch ? '-epoch' : '');
  return m;
}
