// Caméra : survol façon carte (glisser, pivoter, zoomer) et marche à pied dans les rues.
import * as THREE from 'three';
import { clamp, lerp } from './geom.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class CameraRig {
  constructor(camera, dom, world) {
    this.camera = camera; this.dom = dom; this.world = world;
    this.mode = 'orbit';
    this.goal = { x: -80, z: -120, dist: 2300, az: -0.55, el: 0.62 };
    this.cur = { ...this.goal };
    this.target = new THREE.Vector3();
    this.walk = { x: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0 };
    this.keys = new Set();
    this.fly = null;
    this.touch = new Map();
    this.joy = { x: 0, y: 0 };
    this.userMoved = false;
    this.onUserInput = null;
    this.walkTo = null;            // à pied : point vers lequel on marche tout seul (clic au sol)
    this.walkStall = 0;
    this._bind();
  }

  _bind() {
    const d = this.dom;
    let drag = null;
    d.addEventListener('contextmenu', (e) => e.preventDefault());
    d.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') { this.touch.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }); this._touchRef = null; d.setPointerCapture(e.pointerId); this._input(); return; }
      drag = { x: e.clientX, y: e.clientY, rot: e.button === 2 || e.button === 1 || e.ctrlKey || e.shiftKey || this.mode === 'walk' };
      d.setPointerCapture(e.pointerId); this._input();
    });
    d.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') { this._touchMove(e); return; }
      if (this.mode === 'walk' && !this.grab && document.pointerLockElement === d) { this._look(e.movementX, e.movementY); return; }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (this.mode === 'walk') this._look(-dx * 1.15, -dy * 1.15);      // à pied comme en intérieur : la vue suit la main, comme dans une visite virtuelle
      else if (drag.rot) this._rotate(dx, dy);
      else this._pan(dx, dy);
    });
    const up = (e) => { if (e.pointerType === 'touch') { this.touch.delete(e.pointerId); this._touchRef = null; if (this.touch.size === 0) { this.joy.x = this.joy.y = 0; } } drag = null; };
    d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up);
    d.addEventListener('wheel', (e) => {
      e.preventDefault(); this._input();
      if (this.mode !== 'orbit') return;
      const k = Math.exp(clamp(e.deltaY, -240, 240) * 0.0012);
      this.goal.dist = clamp(this.goal.dist * k, 18, 9500);
    }, { passive: false });
    window.addEventListener('keydown', (e) => { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; this.keys.add(e.code); if (/Arrow|Key[WASDQERF]|Space/.test(e.code)) { this._input(); } });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  _input() { this.fly = null; this.userMoved = true; if (this.onUserInput) this.onUserInput(); }

  _pan(dx, dy) {
    const g = this.goal, k = (g.dist * 1.15) / this.dom.clientHeight / Math.max(0.35, Math.sin(g.el));
    const s = Math.sin(g.az), c = Math.cos(g.az);
    // glisser : le sol suit le curseur
    g.x -= (dx * c + dy * s) * k * 1; g.z -= (-dx * s + dy * c) * k;
    g.x = clamp(g.x, -6500, 6500); g.z = clamp(g.z, -6500, 6500);
  }
  _rotate(dx, dy) { const g = this.goal; g.az -= dx * 0.0052; g.el = clamp(g.el + dy * 0.0042, 0.035, 1.5); }
  _look(dx, dy) { const w = this.walk; w.yaw -= dx * 0.0028; w.pitch = clamp(w.pitch - dy * 0.0026, -1.2, 1.3); w.yawGoal = null; }

  _touchMove(e) {
    const t = this.touch.get(e.pointerId); if (!t) return;
    const px = t.x, py = t.y; t.x = e.clientX; t.y = e.clientY;
    const pts = [...this.touch.values()];
    if (this.mode === 'walk') {
      if (this.grab) { this._look(-(t.x - px) * 1.7, -(t.y - py) * 1.7); return; }
      if (t.sx < this.dom.clientWidth * 0.45) { this.joy.x = clamp((t.x - t.sx) / 60, -1, 1); this.joy.y = clamp((t.y - t.sy) / 60, -1, 1); }
      else this._look((t.x - px) * 1.6, (t.y - py) * 1.6);
      return;
    }
    if (pts.length === 1) { this._pan(t.x - px, t.y - py); return; }
    if (pts.length >= 2) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x), my = (a.y + b.y) / 2;
      const ref = this._touchRef;
      if (ref) {
        this.goal.dist = clamp(this.goal.dist * (ref.dist / Math.max(20, dist)), 18, 9500);
        let da = ang - ref.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
        this.goal.az += da;
        this.goal.el = clamp(this.goal.el + (my - ref.my) * 0.005, 0.035, 1.5);
      }
      this._touchRef = { dist, ang, my };
    }
  }

  setView(pos, tgt) {
    const dx = pos[0] - tgt[0], dy = pos[1] - tgt[1], dz = pos[2] - tgt[2];
    const dist = Math.hypot(dx, dy, dz);
    const gy = this.world.heightAt(tgt[0], tgt[2]);
    this.goal = { x: tgt[0], z: tgt[2], dist, az: Math.atan2(dx, dz), el: Math.asin(clamp((pos[1] - gy) / dist, -1, 1)) };
    this.cur = { ...this.goal }; this.fly = null; this.mode = 'orbit';
    this.update(0);
  }

  flyTo(v, seconds = 2.6, onDone = null) {
    const from = { ...this.cur };
    const to = { x: v.x, z: v.z, dist: v.dist ?? from.dist, az: v.az ?? from.az, el: v.el ?? from.el };
    while (to.az - from.az > Math.PI) to.az -= 2 * Math.PI;
    while (to.az - from.az < -Math.PI) to.az += 2 * Math.PI;
    this.fly = { from, to, t: 0, dur: seconds, lift: Math.min(1400, Math.hypot(to.x - from.x, to.z - from.z) * 0.45), onDone };
    this.mode = 'orbit';
  }

  enterWalk(x, z, yaw = 0, pitch = -0.02) {
    this.mode = 'walk'; this.fly = null; this.walkTo = null; this.walkStall = 0;
    this.walk = { x, z, yaw, pitch, vx: 0, vz: 0 };
  }
  exitWalk() {
    if (this.mode !== 'walk') return;
    const w = this.walk;
    this.mode = 'orbit'; this.walkTo = null;
    this.goal = { x: w.x, z: w.z, dist: 260, az: w.yaw, el: 0.5 };
    this.cur = { ...this.goal, dist: 30, el: 0.1 };
    if (document.pointerLockElement) document.exitPointerLock();
  }

  update(dt) {
    const cam = this.camera, K = this.keys;
    if (this.mode === 'walk') {
      const w = this.walk;
      let f = (K.has('KeyW') || K.has('ArrowUp') ? 1 : 0) - (K.has('KeyS') || K.has('ArrowDown') ? 1 : 0) - this.joy.y;
      let r = (K.has('KeyD') ? 1 : 0) - (K.has('KeyA') ? 1 : 0) + this.joy.x;
      if (K.has('ArrowLeft')) { w.yaw += dt * 1.6; w.yawGoal = null; } if (K.has('ArrowRight')) { w.yaw -= dt * 1.6; w.yawGoal = null; }
      if (w.yawGoal != null) { let d = w.yawGoal - w.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; w.yaw += d * Math.min(1, dt * 5); if (Math.abs(d) < 0.01) w.yawGoal = null; }
      const sp = (K.has('ShiftLeft') || K.has('ShiftRight') ? 11 : 4.2);
      const s = Math.sin(w.yaw), c = Math.cos(w.yaw);
      let tx = (-s * f + c * r) * sp, tz = (-c * f - s * r) * sp;
      if (this.walkTo && (f || r)) this.walkTo = null;                 // le clavier ou la manette reprennent la main
      if (this.walkTo) {
        const dx = this.walkTo[0] - w.x, dz = this.walkTo[1] - w.z, l = Math.hypot(dx, dz);
        if (l < 0.5) { this.walkTo = null; tx = tz = 0; } else { const v = Math.min(sp * 1.2, 1.2 + l * 1.6); tx = (dx / l) * v; tz = (dz / l) * v; }
      }
      w.vx = lerp(w.vx, tx, Math.min(1, dt * 9)); w.vz = lerp(w.vz, tz, Math.min(1, dt * 9));
      const ox = w.x, oz = w.z, nx = w.x + w.vx * dt, nz = w.z + w.vz * dt;
      if (this.world.walkable(nx, nz)) { w.x = nx; w.z = nz; }
      else if (this.world.walkable(nx, w.z)) { w.x = nx; w.vz = 0; }
      else if (this.world.walkable(w.x, nz)) { w.z = nz; w.vx = 0; }
      else { w.vx = w.vz = 0; this.walkTo = null; }
      if (this.walkTo && dt > 0) { this.walkStall = Math.hypot(w.x - ox, w.z - oz) < 0.5 * dt ? this.walkStall + dt : 0; if (this.walkStall > 0.6) { this.walkTo = null; this.walkStall = 0; } }
      const y = this.world.walkHeight(w.x, w.z) + 1.68;
      w.y = w.y == null ? y : lerp(w.y, y, Math.min(1, dt * 10));
      cam.position.set(w.x, w.y, w.z);
      cam.rotation.set(w.pitch, w.yaw, 0, 'YXZ');
      this.target.set(w.x, w.y, w.z);
      cam.near = 0.25; cam.far = 22000; cam.updateProjectionMatrix();
      return;
    }
    const g = this.goal;
    if (this.fly) {
      const f = this.fly; f.t += dt / f.dur;
      const t = ease(Math.min(1, f.t));
      g.x = lerp(f.from.x, f.to.x, t); g.z = lerp(f.from.z, f.to.z, t);
      g.az = lerp(f.from.az, f.to.az, t); g.el = lerp(f.from.el, f.to.el, t);
      g.dist = lerp(f.from.dist, f.to.dist, t) + Math.sin(Math.PI * t) * f.lift;
      this.cur = { ...g };
      if (f.t >= 1) { this.fly = null; if (f.onDone) f.onDone(); }
    } else {
      const sp = g.dist * 0.9 * dt, s = Math.sin(g.az), c = Math.cos(g.az);
      const f = (K.has('KeyW') || K.has('ArrowUp') ? 1 : 0) - (K.has('KeyS') || K.has('ArrowDown') ? 1 : 0);
      const r = (K.has('KeyD') || K.has('ArrowRight') ? 1 : 0) - (K.has('KeyA') || K.has('ArrowLeft') ? 1 : 0);
      g.x += (-s * f + c * r) * sp; g.z += (-c * f - s * r) * sp;
      if (K.has('KeyQ')) g.az += dt * 0.9; if (K.has('KeyE')) g.az -= dt * 0.9;
      if (K.has('KeyR')) g.el = clamp(g.el + dt * 0.6, 0.035, 1.5); if (K.has('KeyF')) g.el = clamp(g.el - dt * 0.6, 0.035, 1.5);
      const k = dt <= 0 ? 1 : 1 - Math.exp(-dt * 9);
      const cu = this.cur;
      cu.x = lerp(cu.x, g.x, k); cu.z = lerp(cu.z, g.z, k); cu.dist = lerp(cu.dist, g.dist, k); cu.az = lerp(cu.az, g.az, k); cu.el = lerp(cu.el, g.el, k);
    }
    const cu = this.cur;
    const ty = this.world.heightAt(cu.x, cu.z);
    this.target.set(cu.x, Math.max(ty, 0), cu.z);
    const ce = Math.cos(cu.el), se = Math.sin(cu.el);
    let px = cu.x + Math.sin(cu.az) * ce * cu.dist, pz = cu.z + Math.cos(cu.az) * ce * cu.dist, py = this.target.y + se * cu.dist;
    const floor = Math.max(this.world.heightAt(px, pz), 0) + 2.5;
    if (py < floor) py = floor;
    cam.position.set(px, py, pz);
    cam.lookAt(this.target);
    cam.near = clamp(cu.dist * 0.02, 0.5, 30); cam.far = 26000; cam.updateProjectionMatrix();
  }
}
