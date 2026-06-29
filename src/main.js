import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ===========================================================================
// Domain: a realistic equity implied-volatility surface
//   X axis -> Strike Price        (80 .. 120, ATM = 100)
//   Z axis -> Time to Expiry      (0.1y .. 2.0y)
//   Y axis -> Implied Vol (%)     (height)
// Shape: skewed smile. Low near ATM, rising on both wings, higher on the
// left (OTM puts > OTM calls). A warped plane, not a torus.
// ===========================================================================
const STRIKE_MIN = 80, STRIKE_MAX = 120;
const TAU_MIN = 0.1, TAU_MAX = 2.0;
const SIZE = 10;          // planar extent (X and Z)
const H_SCALE = 9.0;      // IV fraction -> world height
const H_BASE = 0.15;

// sx, sz are normalized planar coords in [-1, 1]
function ivFraction(sx, sz) {
  const m = sx;                      // moneyness: negative = low strike (puts)
  const tauN = (sz + 1) / 2;         // 0 (near) .. 1 (far)
  const smileAmp = 0.5 * (1 - 0.45 * tauN); // short-dated smiles are steeper
  return (
    0.18 +
    smileAmp * 0.22 * m * m +        // convex smile
    0.06 * -m +                      // skew: puts richer than calls
    0.05 * tauN                      // term structure drifts up
  );
}
function heightAt(sx, sz) {
  return (ivFraction(sx, sz) - H_BASE) * H_SCALE;
}

// scan to find IV / height extents for color + cage sizing
let IV_LO = Infinity, IV_HI = -Infinity, Y_MAX = -Infinity;
for (let i = 0; i <= 40; i++) {
  for (let j = 0; j <= 40; j++) {
    const sx = (i / 40) * 2 - 1;
    const sz = (j / 40) * 2 - 1;
    const iv = ivFraction(sx, sz);
    IV_LO = Math.min(IV_LO, iv);
    IV_HI = Math.max(IV_HI, iv);
    Y_MAX = Math.max(Y_MAX, heightAt(sx, sz));
  }
}

// ---------------------------------------------------------------------------
// plasma-style colormap: dark purple (low IV) -> magenta -> red/orange (high)
// ---------------------------------------------------------------------------
const PLASMA = [
  [0.0, 0x1a0142],
  [0.22, 0x4b0a8a],
  [0.45, 0x8c179e],
  [0.65, 0xc83e73],
  [0.82, 0xf2671f],
  [1.0, 0xffb13b],
];
const _a = new THREE.Color();
const _b = new THREE.Color();
function plasma(t, target) {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < PLASMA.length; i++) {
    if (t <= PLASMA[i][0]) {
      const [t0, h0] = PLASMA[i - 1];
      const [t1, h1] = PLASMA[i];
      const k = (t - t0) / (t1 - t0);
      _a.setHex(h0).convertSRGBToLinear();
      _b.setHex(h1).convertSRGBToLinear();
      return target.copy(_a).lerp(_b, k);
    }
  }
  return target.setHex(PLASMA[PLASMA.length - 1][1]).convertSRGBToLinear();
}
const colorForIv = (iv, target) =>
  plasma((iv - IV_LO) / (IV_HI - IV_LO), target);

// ===========================================================================
// scene / camera / renderer
// ===========================================================================
const app = document.getElementById("app");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 200
);
const RADIUS = 16;
const ELEV = THREE.MathUtils.degToRad(20);
camera.position.set(
  Math.cos(ELEV) * RADIUS * 0.6,
  Y_MAX * 0.5 + Math.sin(ELEV) * RADIUS,
  Math.cos(ELEV) * RADIUS
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const root = new THREE.Group();
// center the (taller) cage vertically inside the view
const CAGE_TOP = Y_MAX + 4.5;
root.position.y = -CAGE_TOP / 2;
scene.add(root);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotate = true;
controls.autoRotateSpeed = -0.8;    // negative = clockwise, slow and subtle
controls.minDistance = 9;
controls.maxDistance = 40;
// keep auto-rotating even while/after the user orbits or zooms

// ===========================================================================
// surface mesh (vertex-colored plasma)
// ===========================================================================
const SEG = 150;
const geom = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
geom.rotateX(-Math.PI / 2);                 // lay flat, Y is up
const pos = geom.attributes.position;
const colors = new Float32Array(pos.count * 3);
const _col = new THREE.Color();
for (let i = 0; i < pos.count; i++) {
  const sx = pos.getX(i) / (SIZE / 2);
  const sz = pos.getZ(i) / (SIZE / 2);
  pos.setY(i, heightAt(sx, sz));
  colorForIv(ivFraction(sx, sz), _col);
  colors[i * 3] = _col.r;
  colors[i * 3 + 1] = _col.g;
  colors[i * 3 + 2] = _col.b;
}
geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
geom.computeVertexNormals();

const surface = new THREE.Mesh(
  geom,
  new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
);
root.add(surface);

// thin white grid lines ON the surface (coarse mesh, same shape) -> quant look
const GSEG = 26;
const gridGeom = new THREE.PlaneGeometry(SIZE, SIZE, GSEG, GSEG);
gridGeom.rotateX(-Math.PI / 2);
const gpos = gridGeom.attributes.position;
for (let i = 0; i < gpos.count; i++) {
  const sx = gpos.getX(i) / (SIZE / 2);
  const sz = gpos.getZ(i) / (SIZE / 2);
  gpos.setY(i, heightAt(sx, sz) + 0.01);
}
const surfaceGrid = new THREE.Mesh(
  gridGeom,
  new THREE.MeshBasicMaterial({
    color: 0xffffff, wireframe: true, transparent: true, opacity: 0.16,
  })
);
root.add(surfaceGrid);

// ===========================================================================
// scaffold cage: only thin white grid lines, empty/transparent between them
// (open-top box of gridded faces floating in black space)
// ===========================================================================
const cageMat = new THREE.LineBasicMaterial({
  color: 0xffffff, transparent: true, opacity: 0.14,
});
// one gridded face spanned by U and V vectors, anchored at (ox,oy,oz)
function gridFace(ox, oy, oz, ux, uy, uz, vx, vy, vz, divs) {
  const verts = [];
  const t = [];
  for (let i = 0; i <= divs; i++) t.push(i / divs);
  for (const a of t) {
    verts.push(ox + ux * a, oy + uy * a, oz + uz * a);
    verts.push(ox + ux * a + vx, oy + uy * a + vy, oz + uz * a + vz);
  }
  for (const b of t) {
    verts.push(ox + vx * b, oy + vy * b, oz + vz * b);
    verts.push(ox + vx * b + ux, oy + vy * b + uy, oz + vz * b + uz);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  return new THREE.LineSegments(g, cageMat);
}

const H = SIZE / 2;
const cageTop = CAGE_TOP;           // taller scaffold, lots of grid headroom
const DIV = 9;

// floor is always visible
root.add(gridFace(-H, 0, -H, 2 * H, 0, 0, 0, 0, 2 * H, DIV));

// the four vertical walls, tracked so the two nearest the camera can be hidden
const walls = [];
function addWall(face, nx, nz) {
  face.userData.normal = new THREE.Vector3(nx, 0, nz);          // outward normal
  face.userData.center = new THREE.Vector3(0, cageTop / 2, 0)   // world center
    .add(root.position).addScaledVector(face.userData.normal, H);
  walls.push(face);
  root.add(face);
}
addWall(gridFace(-H, 0, -H, 2 * H, 0, 0, 0, cageTop, 0, DIV), 0, -1); // front z=-H
addWall(gridFace(-H, 0,  H, 2 * H, 0, 0, 0, cageTop, 0, DIV), 0,  1); // back  z=+H
addWall(gridFace(-H, 0, -H, 0, 0, 2 * H, 0, cageTop, 0, DIV), -1, 0); // left  x=-H
addWall(gridFace( H, 0, -H, 0, 0, 2 * H, 0, cageTop, 0, DIV),  1, 0); // right x=+H

const _camRel = new THREE.Vector3();
function updateWalls() {
  for (const w of walls) {
    _camRel.copy(camera.position).sub(w.userData.center);
    // hide a wall when the camera is on its outer side (nearest walls)
    w.visible = _camRel.dot(w.userData.normal) < 0;
  }
}

// ===========================================================================
// floating market data points (glowing dots at realistic coordinates)
// ===========================================================================
function discTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,235,200,0.9)");
  grad.addColorStop(1, "rgba(255,180,120,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const N_DOTS = 160;
const dotPos = new Float32Array(N_DOTS * 3);
for (let i = 0; i < N_DOTS; i++) {
  const sx = Math.random() * 2 - 1;
  const sz = Math.random() * 2 - 1;
  const y = heightAt(sx, sz) + (Math.random() - 0.4) * 0.18; // quote scatter
  dotPos[i * 3] = sx * H;
  dotPos[i * 3 + 1] = y + 0.05;
  dotPos[i * 3 + 2] = sz * H;
}
const dotGeom = new THREE.BufferGeometry();
dotGeom.setAttribute("position", new THREE.BufferAttribute(dotPos, 3));
const dots = new THREE.Points(
  dotGeom,
  new THREE.PointsMaterial({
    size: 0.22,
    map: discTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.95,
  })
);
root.add(dots);

// ===========================================================================
// axis labels + ticks (canvas-texture sprites)
// ===========================================================================
function makeLabel(text, { fs = 44, color = "#ffffff", weight = 600 } = {}) {
  const pad = 8;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  const font = `${weight} ${fs}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = fs + pad * 2;
  c.width = w; c.height = h;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  const scale = 0.011 * fs;
  spr.scale.set((w / h) * scale, scale, 1);
  return spr;
}
function addLabel(text, x, y, z, opts) {
  const s = makeLabel(text, opts);
  s.position.set(x, y, z);
  root.add(s);
  return s;
}

const axisOpts = { fs: 46, color: "#dfe6ff", weight: 700 };
const tickOpts = { fs: 34, color: "rgba(180,195,230,0.85)", weight: 500 };

// axis titles
addLabel("STRIKE PRICE", 0, -0.7, H + 1.4, axisOpts);
addLabel("TIME TO EXPIRY", H + 2.0, -0.7, 0, axisOpts);
addLabel("IMPLIED VOL (%)", -H - 1.6, cageTop * 0.55, -H, axisOpts);

// strike ticks (X)
addLabel(`${STRIKE_MIN}`, -H, -0.5, H + 0.6, tickOpts);
addLabel("100", 0, -0.5, H + 0.6, tickOpts);
addLabel(`${STRIKE_MAX}`, H, -0.5, H + 0.6, tickOpts);
// expiry ticks (Z)
addLabel(`${TAU_MIN}y`, H + 0.7, -0.5, -H, tickOpts);
addLabel(`${TAU_MAX}y`, H + 0.7, -0.5, H, tickOpts);
// IV ticks (Y)
addLabel(`${Math.round(IV_LO * 100)}%`, -H - 0.5, 0, -H, tickOpts);
addLabel(`${Math.round(IV_HI * 100)}%`, -H - 0.5, Y_MAX, -H, tickOpts);

// ===========================================================================
// loop + resize
// ===========================================================================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateWalls();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// "F" toggles fullscreen on/off
window.addEventListener("keydown", (e) => {
  if (e.key !== "f" && e.key !== "F") return;
  e.preventDefault();
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
});
