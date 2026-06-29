import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------------------------------------------------------------------------
// magma colormap (matplotlib stops), t in [0, 1] -> THREE.Color
// ---------------------------------------------------------------------------
const MAGMA = [
  [0.0, 0x000004],
  [0.14, 0x1c1044],
  [0.28, 0x4f127b],
  [0.43, 0x812581],
  [0.57, 0xb5367a],
  [0.71, 0xe55064],
  [0.85, 0xfb8761],
  [1.0, 0xfcfdbf],
];

const _c0 = new THREE.Color();
const _c1 = new THREE.Color();
function magma(t, target) {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < MAGMA.length; i++) {
    if (t <= MAGMA[i][0]) {
      const [t0, h0] = MAGMA[i - 1];
      const [t1, h1] = MAGMA[i];
      const k = (t - t0) / (t1 - t0);
      _c0.setHex(h0).convertSRGBToLinear();
      _c1.setHex(h1).convertSRGBToLinear();
      return target.copy(_c0).lerp(_c1, k);
    }
  }
  return target.setHex(MAGMA[MAGMA.length - 1][1]).convertSRGBToLinear();
}

// ---------------------------------------------------------------------------
// scene / camera / renderer
// ---------------------------------------------------------------------------
const app = document.getElementById("app");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
// elevation ~20 degrees, pulled back
const RADIUS = 13;
const ELEV = THREE.MathUtils.degToRad(20);
camera.position.set(0, Math.sin(ELEV) * RADIUS, Math.cos(ELEV) * RADIUS);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6; // slow clockwise
controls.minDistance = 7;
controls.maxDistance = 28;
controls.target.set(0, 0, 0);

// ---------------------------------------------------------------------------
// surface geometry (plane in XZ, displaced in Y)
// ---------------------------------------------------------------------------
const SIZE = 10;
const SEG = 140;
const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
geometry.rotateX(-Math.PI / 2); // lay flat, Y is height

const posAttr = geometry.attributes.position;
const count = posAttr.count;
const colors = new Float32Array(count * 3);
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

// cache the planar x/z of each vertex and its radius
const baseX = new Float32Array(count);
const baseZ = new Float32Array(count);
const radius = new Float32Array(count);
for (let i = 0; i < count; i++) {
  const x = posAttr.getX(i);
  const z = posAttr.getZ(i);
  baseX[i] = x;
  baseZ[i] = z;
  radius[i] = Math.sqrt(x * x + z * z);
}

const AMP = 1.4;
const Y_RANGE = AMP * 1.05;
const _col = new THREE.Color();

function updateSurface(t) {
  for (let i = 0; i < count; i++) {
    const r = radius[i];
    // gentle slow ripple, flat and elegant, fades toward the edges
    const y = AMP * Math.sin(r * 0.9 - t) * Math.exp(-0.12 * r);
    posAttr.setY(i, y);

    const tt = (y / Y_RANGE) * 0.5 + 0.5;
    magma(tt, _col);
    colors[i * 3] = _col.r;
    colors[i * 3 + 1] = _col.g;
    colors[i * 3 + 2] = _col.b;
  }
  posAttr.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
  geometry.computeVertexNormals();
}

const surfaceMat = new THREE.MeshBasicMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
});
const surface = new THREE.Mesh(geometry, surfaceMat);
scene.add(surface);

// faint magma wireframe to give the surface mesh definition
const wireMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
  transparent: true,
  opacity: 0.06,
});
const wire = new THREE.Mesh(geometry, wireMat);
scene.add(wire);

// ---------------------------------------------------------------------------
// white wireframe cage around the surface
// ---------------------------------------------------------------------------
const cageGeom = new THREE.BoxGeometry(SIZE, AMP * 2.4, SIZE);
const cage = new THREE.LineSegments(
  new THREE.EdgesGeometry(cageGeom),
  new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
  })
);
scene.add(cage);

// ---------------------------------------------------------------------------
// animation loop
// ---------------------------------------------------------------------------
const PHASE_SPEED = 0.5; // radians per second (slow)
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime() * PHASE_SPEED;
  updateSurface(t);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ---------------------------------------------------------------------------
// resize
// ---------------------------------------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
