// Souches de cheminée des maisons de 1889 : un mur mince sur le toit, couronné d'un rang de mitres de terre cuite.
// Près de quatre-vingt mille maisons en porteraient trop pour les dessiner toutes : elles sont rangées par carreaux de
// 500 m, et seuls les carreaux proches de la caméra sont affichés (on ne les distingue pas de plus loin).
import * as THREE from 'three';

const CARREAU = 500, PORTEE = 1500;
const SOUCHES = [0xe2d6c0, 0xd2c2a6, 0xb8775c, 0xeae2d2, 0xc9b79a].map((c) => new THREE.Color(c)), MITRES = new THREE.Color(0xa8644a);

export class Souches {
  constructor(app) { this.app = app; this.carreaux = new Map(); this.n = 0; }
  // Une souche au point (x, z), de y0 à y1, longue de 2·hl dans la direction (ux, uz) ; id : sa teinte.
  ajouter(x, z, y0, y1, ux, uz, hl, id) {
    const k = Math.floor(x / CARREAU) * 4096 + Math.floor(z / CARREAU); let c = this.carreaux.get(k);
    if (!c) this.carreaux.set(k, (c = { x: (Math.floor(x / CARREAU) + 0.5) * CARREAU, z: (Math.floor(z / CARREAU) + 0.5) * CARREAU, v: [] }));
    c.v.push(x, z, y0, y1, Math.atan2(ux, uz), hl, id); this.n++;
  }
  finir(scene) {
    const boite = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mur = new THREE.MeshStandardMaterial({ roughness: 0.9 }), terre = new THREE.MeshStandardMaterial({ color: MITRES, roughness: 0.85 });
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), S = new THREE.Vector3(), X = new THREE.Vector3();
    this.meshes = [];
    for (const c of this.carreaux.values()) {
      const n = c.v.length / 7, a = new THREE.InstancedMesh(boite, mur, n), b = new THREE.InstancedMesh(boite, terre, n);
      for (let i = 0; i < n; i++) {
        const [x, z, y0, y1, ang, hl, id] = c.v.slice(i * 7, i * 7 + 7);
        Q.setFromAxisAngle(Y, ang);
        S.set(0.48, y1 - y0, hl * 2); X.set(x, y0, z); M.compose(X, Q, S); a.setMatrixAt(i, M); a.setColorAt(i, SOUCHES[id % SOUCHES.length]);
        S.set(0.24, 0.42, Math.max(0.3, hl * 2 - 0.28)); X.set(x, y1, z); M.compose(X, Q, S); b.setMatrixAt(i, M);
      }
      for (const m of [a, b]) { m.castShadow = false; m.receiveShadow = true; m.computeBoundingSphere(); m.visible = false; this.meshes.push(m); }
      c.meshes = [a, b];
    }
    this.carreaux = [...this.carreaux.values()];
    this.groupe = new THREE.Group(); if (this.meshes.length) this.groupe.add(...this.meshes);
    return [this.groupe];                                          // un seul objet pour la ville : il s'enfonce et se dresse avec elle
  }
  // Chaque image : les carreaux à portée de la caméra sont montrés, les autres cachés.
  montrer(cam) {
    let vus = 0;
    for (const c of this.carreaux) { const on = Math.hypot(c.x - cam.x, c.z - cam.z) < PORTEE + CARREAU * 0.7 && cam.y < 1600; if (c.meshes[0].visible !== on) for (const m of c.meshes) m.visible = on; if (on) vus++; }
    return vus;
  }
}
