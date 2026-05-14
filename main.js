import * as THREE from 'three';
import {
  Fn, vec2, vec3, vec4, float,
  positionWorld, cameraPosition, time,
  mix, smoothstep, length, dot, normalize,
  exp, clamp, uniform,
  mx_worley_noise_vec3, mx_noise_float, mx_fractal_noise_float
} from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const errEl = document.getElementById('err');
function fail(msg) {
  errEl.style.display = 'flex';
  errEl.textContent = msg;
}

async function main() {
  if (!navigator.gpu) {
    fail('WebGPU not available. Try Chrome/Edge 113+ or Safari 18+.');
    return;
  }

  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);
  await renderer.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.55, 3.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.0, -7);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minPolarAngle = Math.PI * 0.18;
  controls.minDistance = 1.0;
  controls.maxDistance = 9.0;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();

  // Light positions/colors as TSL uniforms. These are NOT real scene lights —
  // they're parameters consumed by the painted-streak shader. Selective rasterization:
  // we draw only what reads as "wet ground reflecting lights."
  const L0pos = uniform(new THREE.Vector3(-2.4, 2.9, -6.5));
  const L0col = uniform(new THREE.Vector3(1.00, 0.55, 0.22).multiplyScalar(7.5)); // warm sodium-ish lamp
  const L1pos = uniform(new THREE.Vector3( 2.8, 3.8, -11.0));
  const L1col = uniform(new THREE.Vector3(1.00, 0.82, 0.45).multiplyScalar(5.5)); // warm window
  const L2pos = uniform(new THREE.Vector3(-1.1, 2.2, -16.0));
  const L2col = uniform(new THREE.Vector3(1.00, 0.15, 0.18).multiplyScalar(4.5)); // red blinker
  const L2pulse = uniform(0);

  // Painted reflection: mirror light L below the ground plane (y=0), find the
  // ground point P where the camera's line of sight reflected off a flat puddle
  // would hit L. Paint a vertical-streak Gaussian centered at P, stretched along
  // the camera->P direction so it elongates with view distance like a real
  // wet-asphalt reflection. No physics — just the memory of one.
  const streak = Fn(([Lpos, Lcol, wetMask]) => {
    const cam = cameraPosition;
    // Parametrize segment from mirror(L) to cam, find intersection with y=0.
    // t in [0,1] along that line: t = Ly / (Cy + Ly).
    const t = Lpos.y.div(cam.y.add(Lpos.y).add(0.0001));
    const sx = Lpos.x.add(cam.x.sub(Lpos.x).mul(t));
    const sz = Lpos.z.add(cam.z.sub(Lpos.z).mul(t));
    // Streak elongation axis: from camera projection to streak center, in ground plane.
    const tang = normalize(vec2(sx.sub(cam.x), sz.sub(cam.z)));
    const perp = vec2(tang.y.negate(), tang.x);
    const offs = vec2(positionWorld.x.sub(sx), positionWorld.z.sub(sz));
    // Wobble the streak so it doesn't read as a perfect line — broken cobbles
    // and ripples scatter it. This is the "animated normal" cheat in 2D.
    const wob = mx_noise_float(positionWorld.mul(6.0).add(vec3(time.mul(0.7), 0, time.mul(0.9)))).mul(0.06);
    const along = dot(offs, tang);
    const across = dot(offs, perp).add(wob);
    // Asymmetric: streak extends more toward the viewer than past the bright spot —
    // matches the way real puddle reflections smear toward you.
    const sigA = mix(float(3.0), float(1.4), smoothstep(0.0, 0.6, along));
    const sigB = float(0.18);
    const fall = exp(along.mul(along).div(sigA.mul(sigA)).mul(-0.5))
                  .mul(exp(across.mul(across).div(sigB.mul(sigB)).mul(-0.5)));
    return Lcol.mul(fall).mul(wetMask);
  });

  // Soft colored light bleed near each lamp — fakes real point-light spill
  // without invoking the PBR lighting model.
  const bleed = Fn(([Lpos, Lcol]) => {
    const d2 = vec2(positionWorld.x.sub(Lpos.x), positionWorld.z.sub(Lpos.z));
    const r = length(d2).add(0.5);
    return Lcol.mul(float(0.06).div(r.mul(r)));
  });

  const groundMat = new THREE.MeshBasicNodeMaterial();
  groundMat.colorNode = Fn(() => {
    const p = positionWorld;

    // --- cobblestones via Worley/Voronoi ---
    // mx_worley returns (F1, F2, F3). F2 - F1 approximates distance-to-edge.
    const cobScale = float(2.6);
    const w = mx_worley_noise_vec3(p.mul(cobScale), 1.0, 0.0);
    const f1 = w.x;
    const f2 = w.y;
    const edge = f2.sub(f1);
    const mortar = float(1).sub(smoothstep(0.0, 0.05, edge));   // dark seams
    const cobTop = smoothstep(0.0, 0.22, edge).mul(float(1).sub(f1.mul(0.45))); // 0..1 height

    // --- wetness / puddles ---
    const wetLow  = mx_fractal_noise_float(p.mul(0.28));        // -1..1 ish
    const wetNorm = wetLow.mul(0.5).add(0.5);                   // 0..1
    const wet     = clamp(wetNorm.mul(1.4).sub(0.15), 0.0, 1.0);
    // Puddles only in low spots — between cobbles, not on top.
    const puddle  = smoothstep(0.62, 0.78, wetNorm).mul(float(1).sub(cobTop.mul(0.85)));

    // --- base stone color with per-region variation ---
    const colVar   = mx_noise_float(p.mul(2.5)).mul(0.5).add(0.5);
    const cellWarm = mix(float(0.78), float(1.18), colVar);
    let base = vec3(0.34, 0.31, 0.28).mul(cellWarm);
    base = mix(base.mul(0.22), base, mortar);                   // mortar darkens
    base = mix(base, base.mul(0.50), wet);                      // wet = darker, more saturated
    base = mix(base, base.mul(0.28), puddle);                   // puddles = much darker base

    // --- grime overlay: break up everything ---
    const grime = mx_fractal_noise_float(p.mul(1.4).add(vec3(13, 0, 7))).mul(0.5).add(0.5);
    base = base.mul(mix(float(0.78), float(1.08), grime));

    // --- start from gentle ambient sky tint ---
    let col = base.mul(0.18).add(vec3(0.018, 0.018, 0.040));

    // --- light bleed (close-range colored wash) ---
    col = col.add(bleed(L0pos, L0col).mul(base.add(0.1)));
    col = col.add(bleed(L1pos, L1col).mul(base.add(0.1)));
    col = col.add(bleed(L2pos, L2col.mul(L2pulse)).mul(base.add(0.1)));

    // --- painted reflection streaks (the headline trick) ---
    const wetCombined = wet.mul(0.45).add(puddle.mul(1.6));
    col = col.add(streak(L0pos, L0col, wetCombined));
    col = col.add(streak(L1pos, L1col, wetCombined));
    col = col.add(streak(L2pos, L2col.mul(L2pulse), wetCombined));

    // --- ripple shimmer: high-freq brightness modulation only in puddles ---
    const rip1 = mx_noise_float(p.mul(9.0).add(vec3(time.mul(0.55), 0, time.mul(0.32))));
    const rip2 = mx_noise_float(p.mul(15.0).add(vec3(time.mul(-0.40), 0, time.mul(0.71))));
    const rip  = rip1.mul(0.6).add(rip2.mul(0.4));
    col = col.add(col.mul(rip.mul(puddle).mul(0.55)));

    // --- depth fade / haze ---
    const camXZ = vec2(cameraPosition.x, cameraPosition.z);
    const pXZ   = vec2(p.x, p.z);
    const dist  = length(pXZ.sub(camXZ));
    const fogT  = clamp(dist.div(30.0), 0.0, 1.0);
    col = mix(col, vec3(0.020, 0.020, 0.045), fogT.mul(fogT).mul(0.92));

    return vec4(col, 1.0);
  })();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80, 1, 1),
    groundMat
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    // sharp-on pulse for the red blinker
    const s = Math.sin(t * 3.0);
    L2pulse.value = 0.15 + 0.85 * Math.pow(Math.max(s, 0), 8);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

main().catch(e => {
  console.error(e);
  fail('Init error: ' + (e && e.message ? e.message : e));
});
