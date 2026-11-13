// Mini-plan : le plan de 1380 vu de dessus, nord en haut, avec la position et la direction du regard.
import { FRAME } from './data.js';
import { LU } from './raster.js';
import { clamp } from './geom.js';

const PAL = [];
PAL[LU.OUT] = [24, 36, 76]; PAL[LU.OPEN] = [34, 42, 78]; PAL[LU.WATER] = [70, 124, 180]; PAL[LU.FIELD] = [50, 82, 66]; PAL[LU.BATI] = [176, 160, 124];
PAL[LU.RES] = [200, 178, 128]; PAL[LU.COURT] = [128, 120, 100]; PAL[LU.GARDEN] = [72, 108, 72]; PAL[LU.CEMETERY] = [84, 104, 84]; PAL[LU.BRIDGE] = [214, 204, 180];
PAL[LU.BANK] = [132, 124, 98]; PAL[LU.ISLAND] = [58, 92, 70];
const MONUMENT = [240, 200, 96], NOTABLE = [232, 220, 190];

export class MiniMap {
  constructor(app, canvas) {
    this.app = app; this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.base = this.paintBase();
    this.zoom = { orbit: 'city', walk: 'local' };       // échelle retenue pour chaque mode
    this.route = null; this.routeIdx = -1; this.selected = null; this.sig = '';
    this.onGo = null;                                   // (x, z, drag) : demande de déplacement
    this.view = { x0: FRAME.x0, z0: FRAME.z0, k: 1 };
    let down = false;
    const at = (e) => { const r = canvas.getBoundingClientRect(), v = this.view; return [v.x0 + (e.clientX - r.left) / v.k, v.z0 + (e.clientY - r.top) / v.k]; };
    canvas.addEventListener('pointerdown', (e) => { if (e.button > 0) return; down = true; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointeur déjà relâché */ } const p = at(e); if (this.onGo) this.onGo(p[0], p[1], false); e.preventDefault(); });
    canvas.addEventListener('pointermove', (e) => { if (!down) return; const p = at(e); if (this.onGo) this.onGo(p[0], p[1], true); });
    const up = () => { down = false; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  }

  // Fond : occupation du sol du plan (2 m par point), monuments et enceintes rehaussés.
  paintBase() {
    const app = this.app, lu = app.lu, S = 2, w = Math.ceil(lu.w / S), h = Math.ceil(lu.h / S);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'), im = ctx.createImageData(w, h), d = im.data, cert = app.cert && app.cert.map, cw = cert ? app.cert.W : 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = lu.get(lu.x0 + (i + 0.5) * S, lu.z0 + (j + 0.5) * S), cl = cert && i < cw ? cert[j * cw + i] : 0;
      let col = PAL[v] || PAL[LU.OPEN];
      if (v !== LU.WATER) { if (cl === 2) col = MONUMENT; else if (cl === 3) col = NOTABLE; }
      const k = (j * w + i) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    return c;
  }

  mode() { const rig = this.app.rig; return rig.mode === 'walk' ? 'walk' : 'orbit'; }
  toggleZoom() { const m = this.mode(); this.zoom[m] = this.zoom[m] === 'city' ? 'local' : 'city'; this.sig = ''; return this.zoom[m]; }

  draw() {
    const app = this.app, rig = app.rig, cv = this.cv, ctx = this.ctx, cw = cv.clientWidth, ch = cv.clientHeight;
    if (!cw || !ch) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    const walking = this.mode() === 'walk', local = this.zoom[walking ? 'walk' : 'orbit'] === 'local';
    const px = walking ? rig.walk.x : rig.cur.x, pz = walking ? rig.walk.z : rig.cur.z, head = walking ? rig.walk.yaw : rig.cur.az;
    const cam = app.camera.position, sel = this.selected;
    const sig = [W, H, local, walking, px.toFixed(0), pz.toFixed(0), head.toFixed(2), cam.x.toFixed(0), cam.z.toFixed(0), sel ? sel.id : '', this.routeIdx, this.route ? this.route.length : 0, this.seenCount || 0].join('|');
    if (sig === this.sig) return;
    this.sig = sig;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const FW = FRAME.x1 - FRAME.x0, FH = FRAME.z1 - FRAME.z0;
    let k, x0, z0;
    if (local) { const vw = walking ? 460 : clamp(rig.cur.dist * 2.2, 460, 1500); k = cw / vw; x0 = px - vw / 2; z0 = pz - ch / k / 2; }
    else { k = Math.min(cw / FW, ch / FH); x0 = FRAME.x0 - (cw / k - FW) / 2; z0 = FRAME.z0 - (ch / k - FH) / 2; }
    this.view = { x0, z0, k };
    const X = (x) => (x - x0) * k, Y = (z) => (z - z0) * k;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgb(24,36,76)'; ctx.fillRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.base, X(FRAME.x0), Y(FRAME.z0), FW * k, FH * k);
    // parcours en cours
    if (this.route && this.route.length > 1) {
      ctx.strokeStyle = 'rgba(244,236,216,0.75)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath();
      this.route.forEach((p, i) => { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); });
      ctx.stroke(); ctx.setLineDash([]);
      this.route.forEach((p, i) => { ctx.fillStyle = i === this.routeIdx ? '#fff' : i < this.routeIdx ? 'rgba(220,184,102,0.95)' : 'rgba(244,236,216,0.8)'; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), i === this.routeIdx ? 3.4 : 2.1, 0, 6.3); ctx.fill(); });
    }
    // lieux : points, et noms à l'échelle du quartier
    const places = app.places || [];
    if (!this.route) for (const p of places) {
      const x = X(p.x), y = Y(p.z); if (x < -4 || y < -4 || x > cw + 4 || y > ch + 4) continue;
      ctx.fillStyle = p.seen ? 'rgba(244,236,216,0.55)' : 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(x, y, local ? 2.4 : p.pri === 1 ? 1.9 : 1.2, 0, 6.3); ctx.fill();
    }
    if (local) {
      ctx.font = '500 10.5px Alegreya Sans, system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const boxes = [];
      for (const p of places.slice().sort((a, b) => a.pri - b.pri)) {
        const x = X(p.x), y = Y(p.z); if (x < 4 || y < 8 || x > cw - 4 || y > ch - 8) continue;
        const tw = ctx.measureText(p.name).width, tx = clamp(x + 5, 2, cw - tw - 2);
        if (boxes.some((b) => Math.abs(b[1] - y) < 11 && tx < b[0] + b[2] && tx + tw > b[0])) continue;
        boxes.push([tx, y, tw]);
        ctx.strokeStyle = 'rgba(13,22,54,0.9)'; ctx.lineWidth = 3; ctx.strokeText(p.name, tx, y); ctx.fillStyle = '#f4ecd8'; ctx.fillText(p.name, tx, y);
      }
    }
    if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(X(sel.x), Y(sel.z), 5.5, 0, 6.3); ctx.stroke(); }
    // position et champ de vision : le regard part du sommet du secteur
    const fx = -Math.sin(head), fz = -Math.cos(head);
    const ex = walking ? px : cam.x, ez = walking ? pz : cam.z;
    const reach = walking ? 70 : Math.max(120, Math.hypot(rig.cur.x - cam.x, rig.cur.z - cam.z) * 1.5);
    const half = walking ? 0.5 : Math.atan(Math.tan((app.camera.fov * Math.PI) / 360) * app.camera.aspect);
    const a0 = Math.atan2(fz, fx);
    ctx.fillStyle = 'rgba(240,200,96,0.28)'; ctx.strokeStyle = 'rgba(240,200,96,0.95)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(ex), Y(ez)); ctx.arc(X(ex), Y(ez), Math.max(14, reach * k), a0 - half, a0 + half); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0c860'; ctx.strokeStyle = '#1b1606'; ctx.lineWidth = 1;
    if (walking) {
      const s = 6.5, rx = -fz, rz = fx, cx = X(px), cy = Y(pz);
      ctx.beginPath(); ctx.moveTo(cx + fx * s, cy + fz * s); ctx.lineTo(cx - fx * s * 0.6 + rx * s * 0.6, cy - fz * s * 0.6 + rz * s * 0.6); ctx.lineTo(cx - fx * s * 0.6 - rx * s * 0.6, cy - fz * s * 0.6 - rz * s * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else { ctx.beginPath(); ctx.arc(X(rig.cur.x), Y(rig.cur.z), 2.6, 0, 6.3); ctx.fill(); ctx.stroke(); }
  }
}
