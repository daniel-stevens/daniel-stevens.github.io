import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ---------------------------------------------------------------------------
// Custom shaders
// ---------------------------------------------------------------------------

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - vec2(0.5);
      float r = texture2D(tDiffuse, vUv + dir * amount).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - dir * amount).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }`,
};

const MotionBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0.0 },
    direction: { value: new THREE.Vector2(0, 0) },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform vec2 direction;
    varying vec2 vUv;
    void main() {
      vec4 color = vec4(0.0);
      vec2 d = direction * strength;
      for (int i = -4; i <= 4; i++) {
        color += texture2D(tDiffuse, vUv + d * float(i));
      }
      gl_FragColor = color / 9.0;
    }`,
};

const GravitationalLensingShader = {
  uniforms: {
    tDiffuse: { value: null },
    blackHoleScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
    distortionStrength: { value: 0.0 },
    radius: { value: 0.15 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 blackHoleScreenPos;
    uniform float distortionStrength;
    uniform float radius;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - blackHoleScreenPos;
      float dist = length(dir);
      float normDist = dist / radius;
      float warp = 0.0;
      if (normDist < 1.0 && normDist > 0.05) {
        warp = distortionStrength * (1.0 - normDist) * (1.0 - normDist) / normDist;
      }
      vec2 warpedUv = vUv + normalize(dir) * warp * 0.05;
      float darkness = smoothstep(0.0, 0.08, normDist);
      vec4 color = texture2D(tDiffuse, warpedUv);
      float rim = smoothstep(0.04, 0.08, normDist) * (1.0 - smoothstep(0.08, 0.15, normDist));
      color.rgb += vec3(0.3, 0.15, 0.5) * rim * distortionStrength;
      color.rgb *= mix(0.0, 1.0, darkness);
      gl_FragColor = color;
    }`,
};

const ScreenCrackShader = {
  uniforms: {
    tDiffuse: { value: null },
    crackIntensity: { value: 0.0 },
    time: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float crackIntensity;
    uniform float time;
    varying vec2 vUv;
    float crackLine(vec2 uv, vec2 origin, vec2 dir, float len) {
      vec2 d = uv - origin;
      float proj = dot(d, dir);
      if (proj < 0.0 || proj > len) return 0.0;
      vec2 perp = d - dir * proj;
      float dist = length(perp);
      float width = 0.002 + 0.001 * sin(proj * 50.0 + time);
      return smoothstep(width, 0.0, dist);
    }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      if (crackIntensity <= 0.0) { gl_FragColor = color; return; }
      float crack = 0.0;
      crack += crackLine(vUv, vec2(0.5, 0.5), normalize(vec2(0.7, 0.3)), 0.4) * crackIntensity;
      crack += crackLine(vUv, vec2(0.5, 0.5), normalize(vec2(-0.5, 0.6)), 0.35) * crackIntensity;
      crack += crackLine(vUv, vec2(0.5, 0.5), normalize(vec2(0.2, -0.8)), 0.45) * crackIntensity;
      crack += crackLine(vUv, vec2(0.5, 0.5), normalize(vec2(-0.8, -0.2)), 0.3) * crackIntensity;
      if (crackIntensity > 0.3) {
        crack += crackLine(vUv, vec2(0.35, 0.65), normalize(vec2(0.9, 0.1)), 0.25) * (crackIntensity - 0.3);
        crack += crackLine(vUv, vec2(0.6, 0.35), normalize(vec2(-0.3, 0.9)), 0.3) * (crackIntensity - 0.3);
      }
      if (crackIntensity > 0.6) {
        crack += crackLine(vUv, vec2(0.3, 0.3), normalize(vec2(0.5, -0.5)), 0.35) * (crackIntensity - 0.6);
        crack += crackLine(vUv, vec2(0.7, 0.7), normalize(vec2(-0.6, -0.4)), 0.25) * (crackIntensity - 0.6);
      }
      crack = clamp(crack, 0.0, 1.0);
      vec2 refractOffset = vec2(crack * 0.005, crack * 0.003);
      vec4 refracted = texture2D(tDiffuse, vUv + refractOffset);
      color = mix(color, refracted, crack * 0.3);
      color.rgb += vec3(1.0, 0.95, 0.9) * crack * 0.8;
      float vignette = length(vUv - vec2(0.5)) * 2.0;
      color.rgb *= 1.0 - crackIntensity * vignette * 0.3;
      gl_FragColor = color;
    }`,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROMPT_TEXT = `would it be possible to turn this exact content into the most overkill simple stupid three.js overkill designed interactive site that keeps the same minimal stupid <big> <big> header stuff that nobody would ever do but because we have AI now we can do it?`;

const BOOKS = [
  { title: 'The Unplugged Alpha', author: 'Richard Cooper', stars: 2, category: 'Personal Development' },
  { title: 'Principles: Life and Work', author: 'Ray Dalio', stars: 1, category: 'Personal Development' },
  { title: 'How to Stop Worrying and Start Living', author: 'Dale Carnegie', stars: 1, category: 'Personal Development' },
  { title: "Can't Hurt Me", author: 'David Goggins', stars: 1, category: 'Personal Development' },
  { title: 'Atomic Habits', author: 'James Clear', stars: 0, category: 'Personal Development' },
  { title: 'The Chimp Paradox', author: 'Prof Steve Peters', stars: 0, category: 'Personal Development' },
  { title: 'Breaking the Habit of Being Yourself', author: 'Dr. Joe Dispenza', stars: 0, category: 'Personal Development' },
  { title: 'The Miracle Morning', author: 'Hal Elrod', stars: 0, category: 'Personal Development' },
  { title: 'Overdeliver', author: 'Brian Kurtz', stars: 1, category: 'Business & Finance' },
  { title: 'The Millionaire Fastlane', author: 'MJ DeMarco', stars: 1, category: 'Business & Finance' },
  { title: 'Unscripted', author: 'MJ DeMarco', stars: 1, category: 'Business & Finance' },
  { title: 'The 4-Hour Work Week', author: 'Timothy Ferriss', stars: 0, category: 'Business & Finance' },
  { title: 'Crush It!', author: 'Gary Vaynerchuk', stars: 0, category: 'Business & Finance' },
  { title: 'The Intelligent Investor', author: 'Benjamin Graham', stars: 0, category: 'Business & Finance' },
  { title: 'Rich Dad Poor Dad', author: 'Robert T. Kiyosaki', stars: 0, category: 'Business & Finance' },
  { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', stars: 0, category: 'Psychology & Mindset' },
  { title: 'The Art of Being', author: 'Erich Fromm', stars: 0, category: 'Psychology & Mindset' },
  { title: 'Louder Than Words', author: 'Joe Navarro', stars: 0, category: 'Psychology & Mindset' },
  { title: 'Deep Work', author: 'Cal Newport', stars: 0, category: 'Psychology & Mindset' },
  { title: 'The Compound Effect', author: 'Darren Hardy', stars: 0, category: 'Psychology & Mindset' },
  { title: 'Hyperfocus', author: 'Chris Bailey', stars: 0, category: 'Psychology & Mindset' },
  { title: 'The Expectation Effect', author: 'David Robson', stars: 0, category: 'Psychology & Mindset' },
  { title: 'Meditations', author: 'Marcus Aurelius', stars: 1, category: 'Philosophy' },
  { title: 'The Power of Now', author: 'Eckhart Tolle', stars: 1, category: 'Philosophy' },
  { title: 'Antifragile', author: 'Nassim Nicholas Taleb', stars: 1, category: 'Philosophy' },
  { title: 'Never Split the Difference', author: 'Chris Voss', stars: 2, category: 'Strategy & Negotiation' },
  { title: 'Blue Ocean Strategy', author: 'W. Chan Kim', stars: 0, category: 'Strategy & Negotiation' },
  { title: 'Game Theory: A Very Short Introduction', author: '', stars: 0, category: 'Strategy & Negotiation' },
  { title: 'Why We Sleep', author: 'Matthew Walker', stars: 0, category: 'Health & Wellness' },
];

const CATEGORY_COLORS = {
  'Personal Development': '#ff6b6b',
  'Business & Finance': '#ffd93d',
  'Psychology & Mindset': '#6bcb77',
  'Philosophy': '#4d96ff',
  'Strategy & Negotiation': '#ff6b9d',
  'Health & Wellness': '#c084fc',
};

const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'FIRST BLOOD', desc: 'Destroy your first asteroid', check: s => s.kills >= 1 },
  { id: 'speed_demon', name: 'SPEED DEMON', desc: 'Reach maximum speed', check: s => s.maxSpeedReached >= 38 },
  { id: 'barrel_king', name: 'BARREL KING', desc: 'Perform 5 barrel rolls', check: s => s.barrelRolls >= 5 },
  { id: 'flip_master', name: 'FLIP MASTER', desc: 'Perform 5 flips', check: s => s.flips >= 5 },
  { id: 'slayer_10', name: 'ASTEROID SLAYER', desc: 'Destroy 10 asteroids', check: s => s.kills >= 10 },
  { id: 'distance_1000', name: 'EXPLORER', desc: 'Travel 1000 units', check: s => s.distanceTraveled >= 1000 },
  { id: 'combo_master', name: 'COMBO MASTER', desc: 'Achieve combo x4', check: s => s.maxCombo >= 4 },
  { id: 'sonic_pioneer', name: 'SONIC PIONEER', desc: 'Trigger your first sonic boom', check: s => s.sonicBooms >= 1 },
  { id: 'untouchable', name: 'UNTOUCHABLE', desc: 'Survive 60s without damage', check: s => s.timeSinceLastDamage >= 60 },
  { id: 'slayer_25', name: 'DESTROYER', desc: 'Destroy 25 asteroids', check: s => s.kills >= 25 },
  { id: 'distance_5000', name: 'VOYAGER', desc: 'Travel 5000 units', check: s => s.distanceTraveled >= 5000 },
  { id: 'barrel_king_20', name: 'ROLL ADDICT', desc: 'Perform 20 barrel rolls', check: s => s.barrelRolls >= 20 },
  { id: 'warp_driver', name: 'WARP DRIVER', desc: 'Perform your first hyperspace jump', check: s => (s.hyperspaceJumps || 0) >= 1 },
  { id: 'storm_survivor', name: 'STORM SURVIVOR', desc: 'Survive a comet storm without damage', check: s => (s.stormsSurvivedClean || 0) >= 1 },
  { id: 'extinction_event', name: 'EXTINCTION EVENT', desc: 'Destroy 5+ objects with single EMP', check: s => (s.maxEMPKills || 0) >= 5 },
  { id: 'space_whisperer', name: 'SPACE WHISPERER', desc: 'Get within 10 units of the space whale', check: s => s.whaleProximity },
];

const isMobile = window.innerWidth < 768;

// ---------------------------------------------------------------------------
// Preload font immediately
// ---------------------------------------------------------------------------

let preloadedFont = null;
const fontLoader = new FontLoader();
fontLoader.load(
  'https://cdn.jsdelivr.net/npm/three@0.172.0/examples/fonts/helvetiker_bold.typeface.json',
  (font) => { preloadedFont = font; },
  undefined,
  (err) => { console.warn('Font load failed:', err); }
);

// ---------------------------------------------------------------------------
// Phase 1 — Attach trigger listener
// ---------------------------------------------------------------------------

const trigger = document.getElementById('prompt-trigger');

if (trigger) {
  trigger.addEventListener('click', startTypingAnimation, { once: true });
}

// ---------------------------------------------------------------------------
// Phase 2 — Typing animation
// ---------------------------------------------------------------------------

function startTypingAnimation() {
  const textSpan = document.createElement('span');
  textSpan.style.cssText = 'font-family:monospace; font-size:14px; color:#333; display:block; margin-top:12px;';
  trigger.appendChild(textSpan);

  let i = 0;
  const speed = 30;

  const interval = setInterval(() => {
    if (i < PROMPT_TEXT.length) {
      textSpan.textContent += PROMPT_TEXT[i];
      i++;
      if (i > PROMPT_TEXT.length * 0.6 && Math.random() > 0.9) {
        document.body.style.filter = 'brightness(0.95)';
        setTimeout(() => { document.body.style.filter = ''; }, 60);
      }
    } else {
      clearInterval(interval);
      setTimeout(beginTransformation, 1200);
    }
  }, speed);
}

// ---------------------------------------------------------------------------
// Phase 2b — Transition
// ---------------------------------------------------------------------------

function beginTransformation() {
  document.body.style.transition = 'opacity 1.5s ease-in-out, background-color 1.5s ease-in-out';
  document.body.style.backgroundColor = '#000';
  document.body.style.opacity = '0';
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    const canvas = document.getElementById('threejs-canvas');
    document.body.appendChild(canvas);

    Array.from(document.body.children).forEach((el) => {
      if (el.id !== 'threejs-canvas' && el.id !== 'flight-hud' && el.id !== 'speed-hud' && el.id !== 'minimap' && el.id !== 'action-text' && el.id !== 'rgb-slider-hud' && el.id !== 'health-bar-hud' && el.id !== 'achievement-container' && el.id !== 'jump-cooldown-hud' && el.id !== 'emp-cooldown-hud' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
        el.style.display = 'none';
      }
    });

    canvas.style.display = 'block';
    document.body.style.opacity = '1';

    try {
      initThreeScene(canvas);
    } catch (e) {
      console.error('Three.js init failed:', e);
    }
  }, 1600);
}

// ---------------------------------------------------------------------------
// Input handling
// ---------------------------------------------------------------------------

function createInputState(canvas) {
  const input = {
    forward: false, backward: false, left: false, right: false,
    boost: false, mouseX: 0, mouseY: 0, active: false,
    lastLeftTap: 0, lastRightTap: 0, leftTapped: false, rightTapped: false,
    flipRequested: false, fireRequested: false,
    chargeJump: false, empCharge: false,
  };

  window.addEventListener('keydown', (e) => {
    if (!input.active) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    input.forward = true; break;
      case 'KeyS': case 'ArrowDown':  input.backward = true; break;
      case 'KeyA': case 'ArrowLeft':  input.left = true; input.leftTapped = true; break;
      case 'KeyD': case 'ArrowRight': input.right = true; input.rightTapped = true; break;
      case 'Space': input.boost = true; e.preventDefault(); break;
      case 'KeyQ': input.flipRequested = true; break;
      case 'KeyF': input.fireRequested = true; break;
      case 'ShiftLeft': case 'ShiftRight': input.chargeJump = true; e.preventDefault(); break;
      case 'KeyE': input.empCharge = true; break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    input.forward = false; break;
      case 'KeyS': case 'ArrowDown':  input.backward = false; break;
      case 'KeyA': case 'ArrowLeft':  input.left = false; break;
      case 'KeyD': case 'ArrowRight': input.right = false; break;
      case 'Space': input.boost = false; break;
      case 'ShiftLeft': case 'ShiftRight': input.chargeJump = false; break;
      case 'KeyE': input.empCharge = false; break;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    input.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    input.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  return input;
}

// ---------------------------------------------------------------------------
// Ship physics
// ---------------------------------------------------------------------------

function createShipPhysics() {
  return {
    velocity: new THREE.Vector3(),
    angularVelocity: new THREE.Vector2(), // x = pitch, y = yaw
    speed: 0,
    thrustAccel: 12,
    boostMultiplier: 2.5,
    drag: 0.97,
    turnSpeed: 1.8,
    turnDamping: 0.92,
    maxSpeed: 40,
    baseSpeed: 4,
  };
}

function updateShipPhysics(shipGroup, physics, input, delta) {
  // Turn input → angular velocity
  if (input.left)  physics.angularVelocity.y += physics.turnSpeed * delta;
  if (input.right) physics.angularVelocity.y -= physics.turnSpeed * delta;
  if (input.forward)  physics.angularVelocity.x += physics.turnSpeed * delta;
  if (input.backward) physics.angularVelocity.x -= physics.turnSpeed * delta;

  // Damp angular velocity
  physics.angularVelocity.multiplyScalar(physics.turnDamping);

  // Apply rotation
  shipGroup.rotation.y += physics.angularVelocity.y * delta;
  shipGroup.rotation.x += physics.angularVelocity.x * delta;
  shipGroup.rotation.x = clamp(shipGroup.rotation.x, -1.22, 1.22); // ±70°

  // Visual bank
  const targetBank = -physics.angularVelocity.y * 0.3;
  shipGroup.rotation.z += (targetBank - shipGroup.rotation.z) * 0.05;

  // Forward direction from ship quaternion
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);

  // Thrust
  let thrust = physics.baseSpeed;
  const anyInput = input.forward || input.backward || input.left || input.right;
  if (anyInput) thrust = physics.thrustAccel;
  if (input.boost) thrust *= physics.boostMultiplier;

  physics.velocity.addScaledVector(forward, thrust * delta);
  physics.velocity.multiplyScalar(physics.drag);

  // Clamp speed
  physics.speed = physics.velocity.length();
  if (physics.speed > physics.maxSpeed) {
    physics.velocity.multiplyScalar(physics.maxSpeed / physics.speed);
    physics.speed = physics.maxSpeed;
  }

  // Move
  shipGroup.position.addScaledVector(physics.velocity, delta);
}

// ---------------------------------------------------------------------------
// Chase camera
// ---------------------------------------------------------------------------

function updateChaseCamera(camera, shipGroup, physics, input, delta) {
  const speedFactor = 1 + (physics.speed / physics.maxSpeed) * 0.5;
  const baseOffset = new THREE.Vector3(0, 3 * speedFactor, 12 * speedFactor);

  const worldOffset = baseOffset.applyQuaternion(shipGroup.quaternion);
  const desired = shipGroup.position.clone().add(worldOffset);

  // Mouse look offset
  const lookOffset = new THREE.Vector3(input.mouseX * 2, input.mouseY * 1, 0)
    .applyQuaternion(shipGroup.quaternion);
  desired.add(lookOffset);

  // Frame-rate-independent lerp
  const lerpFactor = 1 - Math.pow(0.01, delta);
  camera.position.lerp(desired, lerpFactor);

  // Look at a point ahead of ship
  const lookTarget = shipGroup.position.clone().add(
    new THREE.Vector3(0, 0.5, -5).applyQuaternion(shipGroup.quaternion)
  );

  if (!camera.userData.lookTarget) {
    camera.userData.lookTarget = lookTarget.clone();
  }
  camera.userData.lookTarget.lerp(lookTarget, lerpFactor * 1.5);
  camera.lookAt(camera.userData.lookTarget);
}

// ---------------------------------------------------------------------------
// Phase 3 — Three.js scene
// ---------------------------------------------------------------------------

function initThreeScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020210);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 15);
  scene.add(camera);

  // Lighting
  const lights = {
    ambient: new THREE.AmbientLight(0x334466, 0.4),
    key: new THREE.PointLight(0x4488ff, 150, 100),
    fill: new THREE.PointLight(0xff6644, 80, 80),
    rim: new THREE.PointLight(0x44ffaa, 100, 60),
  };
  lights.key.position.set(10, 10, 10);
  lights.fill.position.set(-10, -5, 5);
  lights.rim.position.set(0, 5, -15);
  scene.add(lights.ambient, lights.key, lights.fill, lights.rim);

  // Non-font elements
  const stars = createStarfield(scene);
  const ambient = createAmbientParticles(scene);
  const bookGroup = createFloatingBooks(scene);

  // Ship group
  const shipGroup = new THREE.Group();
  shipGroup.position.set(0, 2, 0);
  scene.add(shipGroup);

  // Engine glows (left and right sides of title — at the D and s)
  const engineGlowL = new THREE.PointLight(0xff6633, 0, 30);
  engineGlowL.position.set(-8, 0, 1);
  shipGroup.add(engineGlowL);
  const engineGlowR = new THREE.PointLight(0xff6633, 0, 30);
  engineGlowR.position.set(8, 0, 1);
  shipGroup.add(engineGlowR);

  // Thruster particles (world space — NOT parented to shipGroup)
  const thruster = createThrusterParticles();
  scene.add(thruster.mesh);

  // Over-the-top effects
  const speedLines = createSpeedLines(scene);
  const boostFlash = createBoostFlash(camera);
  const rainbowTrail = createRainbowTrail(scene);
  const minimapCtx = initMinimap();
  const flipBurst = createFlipBurst(scene);

  // Round 2 effects
  const asteroids = createAsteroidField(scene);
  const nebulae = createNebulaClouds(scene);
  const shield = createShipShield(shipGroup);
  const contrailL = createContrail(scene, -8);
  const contrailR = createContrail(scene, 8);
  const warpTunnel = createWarpTunnel(scene);
  const shockwaves = createShockwavePool(scene);
  const missiles = createMissilePool(scene);
  const explosions = createExplosionPool(scene);
  const sound = createSoundEngine();
  const lightning = createLightningPool(scene);
  const blackHole = createBlackHole(scene);
  const drone = createBlackHoleDrone(sound);
  const whale = createSpaceWhale(scene);
  const whaleSong = createWhaleSong(sound);
  const comets = createCometPool(scene);

  const elements = {
    stars, ambient, titleMesh: null, tagMeshes: [], linkMeshes: [],
    bookGroup, thruster, engineGlowL, engineGlowR,
    speedLines, boostFlash, rainbowTrail, minimapCtx, flipBurst,
    asteroids, nebulae, shield, contrailL, contrailR, warpTunnel,
    shockwaves, missiles, explosions, sound, lightning, blackHole, drone,
    whale, whaleSong, comets, empMeshes: null,
    bloomPass: null, chromaPass: null, motionBlurPass: null, lensingPass: null, crackPass: null,
  };

  // Post-processing
  let composer = null;
  let bloomPass = null;
  let renderFn;

  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.15, 0.1, 0.85
    );
    composer.addPass(bloomPass);
    const chromaPass = new ShaderPass(ChromaticAberrationShader);
    composer.addPass(chromaPass);
    const motionBlurPass = new ShaderPass(MotionBlurShader);
    composer.addPass(motionBlurPass);
    const lensingPass = new ShaderPass(GravitationalLensingShader);
    composer.addPass(lensingPass);
    const crackPass = new ShaderPass(ScreenCrackShader);
    composer.addPass(crackPass);
    composer.addPass(new OutputPass());
    elements.chromaPass = chromaPass;
    elements.motionBlurPass = motionBlurPass;
    elements.lensingPass = lensingPass;
    elements.crackPass = crackPass;
    renderFn = () => composer.render();
  } catch (e) {
    console.warn('Post-processing failed, using basic renderer:', e);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderFn = () => renderer.render(scene, camera);
  }

  elements.bloomPass = bloomPass;
  elements.empMeshes = createEMPMesh(scene, shipGroup);

  // Input + Physics
  const input = createInputState(canvas);
  const physics = createShipPhysics();

  // RGB intensity slider
  const rgbSlider = document.getElementById('rgb-slider');
  const rgbState = { intensity: rgbSlider ? parseInt(rgbSlider.value) / 100 : 0.4 };
  if (rgbSlider) {
    rgbSlider.addEventListener('input', () => {
      rgbState.intensity = parseInt(rgbSlider.value) / 100;
      const label = document.getElementById('rgb-value');
      if (label) label.textContent = rgbSlider.value;
    });
  }

  // Animation loop
  const state = {
    introActive: true, introStart: performance.now(), hudShown: false, prevBoost: false, minimapFrame: 0,
    barrelRoll: { active: false, direction: 1, startTime: 0, duration: 0.6, comboCount: 0, lastRollEnd: 0 },
    flip: { active: false, startTime: 0, startRotY: 0, duration: 0.8, cameraOffset: 0 },
    sonicBoomFired: false, explosionShake: 0, prevRollActive: false, prevFlipActive: false,
    lightning: { timer: 0 },
    health: {
      current: 100, max: 100, crackIntensity: 0,
      invincible: false, invincibleTimer: 0,
      lastDamageTime: 0, healDelay: 3, healRate: 0.05,
      dead: false, respawnTimer: 0,
    },
    achievements: {
      stats: { kills: 0, distanceTraveled: 0, maxSpeedReached: 0, barrelRolls: 0, flips: 0, sonicBooms: 0, maxCombo: 0, timeSinceLastDamage: 0, hyperspaceJumps: 0, cometsDestroyed: 0, empBlasts: 0, maxEMPKills: 0, stormsSurvivedClean: 0, whaleProximity: false },
      unlocked: new Set(), popupQueue: [], activePopup: null, popupTimer: 0,
    },
    prevShipPosition: null,
    hyperspace: {
      charging: false, chargeTime: 0, jumping: false, jumpTimer: 0,
      cooldown: 0, maxCharge: 3.0, cooldownTime: 15.0, jumpDuration: 1.5,
    },
    cometStorm: {
      active: false, timer: 45 + Math.random() * 15, stormDuration: 0,
      spawnTimer: 0, noDamageDuringStorm: true,
    },
    emp: {
      charging: false, chargeTime: 0, cooldown: 0,
      maxCharge: 2.0, cooldownTime: 20.0,
      blastActive: false, blastRadius: 0, blastMaxRadius: 60,
      timeScale: 1.0,
    },
  };
  startAnimationLoop(renderFn, elements, camera, shipGroup, physics, input, state, lights, rgbState);
  setupResize(camera, renderer, composer, bloomPass);

  // Font ready — assemble ship
  function onFontReady(font) {
    try {
      elements.titleMesh = createTitleText(font);
      shipGroup.add(elements.titleMesh);

      elements.tagMeshes = createBigTagText(font);
      elements.tagMeshes.forEach(m => shipGroup.add(m));

      elements.linkMeshes = createInteractiveLinks(font, camera, canvas);
      elements.linkMeshes.forEach(m => shipGroup.add(m));
    } catch (e) {
      console.warn('Text creation failed:', e);
    }
  }

  if (preloadedFont) {
    onFontReady(preloadedFont);
  } else {
    const check = setInterval(() => {
      if (preloadedFont) { clearInterval(check); onFontReady(preloadedFont); }
    }, 100);
    setTimeout(() => clearInterval(check), 10000);
  }
}

// ---------------------------------------------------------------------------
// Starfield
// ---------------------------------------------------------------------------

function createStarfield(scene) {
  const count = isMobile ? 1000 : 3000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 60 + Math.random() * 140;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    colors[i * 3] = 0.4 + Math.random() * 0.4;
    colors[i * 3 + 1] = 0.4 + Math.random() * 0.4;
    colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.3,
    sizeAttenuation: true,
  });

  const mesh = new THREE.Points(geo, mat);
  scene.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------------------
// Ambient particles
// ---------------------------------------------------------------------------

function createAmbientParticles(scene) {
  const count = isMobile ? 300 : 800;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    velocities[i * 3] = (Math.random() - 0.5) * 0.01;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.3,
    color: 0x8888ff,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Points(geo, mat);
  scene.add(mesh);
  return { mesh, positions, velocities };
}

// ---------------------------------------------------------------------------
// 3D Title (returns mesh, does NOT add to scene)
// ---------------------------------------------------------------------------

function createTitleText(font) {
  const geo = new TextGeometry('Daniel Stevens', {
    font,
    size: 2.5,
    depth: 0.7,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.04,
    bevelSegments: 4,
  });
  geo.computeBoundingBox();
  geo.center();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x4488ff,
    emissive: 0x2244aa,
    emissiveIntensity: 0.25,
    metalness: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 0, 0);
  mesh.scale.set(0.01, 0.01, 0.01);

  // Fade in animation
  const start = performance.now();
  function fadeIn(now) {
    const t = (now - start) / 1000;
    if (t < 2) {
      mesh.scale.setScalar(easeOutBack(clamp01(t / 1.5)));
      mesh.material.opacity = clamp01(t / 0.8);
      requestAnimationFrame(fadeIn);
    } else {
      mesh.scale.setScalar(1);
      mesh.material.opacity = 1;
    }
  }
  requestAnimationFrame(fadeIn);

  return mesh;
}

// ---------------------------------------------------------------------------
// <big> tag text (returns meshes, does NOT add to scene)
// ---------------------------------------------------------------------------

function createBigTagText(font) {
  const makeTag = (text, y) => {
    const geo = new TextGeometry(text, {
      font, size: 0.5, depth: 0.05, curveSegments: 6, bevelEnabled: false,
    });
    geo.center();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x44ff88,
      emissive: 0x22aa44,
      emissiveIntensity: 0.2,
      metalness: 0.3,
      roughness: 0.6,
      transparent: true,
      opacity: 0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, y, 0);

    const start = performance.now();
    function fadeIn(now) {
      const t = (now - start) / 1000;
      if (t < 1.5) {
        mesh.material.opacity = clamp01(t / 1.0) * 0.7;
        requestAnimationFrame(fadeIn);
      }
    }
    setTimeout(() => requestAnimationFrame(fadeIn), 500);

    return mesh;
  };

  return [
    makeTag('<big><big><big><big><big>', 3.5),
    makeTag('</big></big></big></big></big>', -5.0),
  ];
}

// ---------------------------------------------------------------------------
// Interactive links (returns meshes, does NOT add to scene)
// ---------------------------------------------------------------------------

function createInteractiveLinks(font, camera, canvas) {
  const links = [
    { text: '[ github ]', url: 'https://github.com/daniel-stevens', pos: [-4, -2.5, 1] },
    { text: '[ Good Reads ]', url: 'library.html', pos: [4, -2.5, 1] },
  ];

  const clickables = [];

  links.forEach((link, idx) => {
    const geo = new TextGeometry(link.text, {
      font, size: 0.7, depth: 0.12, curveSegments: 8,
      bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 3,
    });
    geo.center();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6644,
      emissive: 0xaa3322,
      emissiveIntensity: 0.25,
      metalness: 0.6,
      roughness: 0.3,
      transparent: true,
      opacity: 0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(link.pos[0], link.pos[1], link.pos[2]);
    mesh.userData = { url: link.url, isLink: true, baseEmissive: 0.5 };
    clickables.push(mesh);

    const start = performance.now();
    function fadeIn(now) {
      const t = (now - start) / 1000;
      if (t < 1.5) {
        mesh.material.opacity = easeOutCubic(clamp01(t / 1.0));
        requestAnimationFrame(fadeIn);
      } else {
        mesh.material.opacity = 1;
      }
    }
    setTimeout(() => requestAnimationFrame(fadeIn), 800 + idx * 200);
  });

  // Raycasting for clicks and hovers
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const mouseDown = new THREE.Vector2();

  canvas.addEventListener('pointerdown', (e) => { mouseDown.set(e.clientX, e.clientY); });

  canvas.addEventListener('pointerup', (e) => {
    const dx = e.clientX - mouseDown.x;
    const dy = e.clientY - mouseDown.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(clickables);
    if (hits.length > 0) {
      const url = hits[0].object.userData.url;
      if (url.startsWith('http')) window.open(url, '_blank');
      else window.location.href = url;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(clickables);
    canvas.style.cursor = hits.length > 0 ? 'pointer' : 'default';

    clickables.forEach((m) => {
      const hovered = hits.some((h) => h.object === m);
      m.material.emissiveIntensity = hovered ? 1.2 : m.userData.baseEmissive;
    });
  });

  return clickables;
}

// ---------------------------------------------------------------------------
// Thruster particles
// ---------------------------------------------------------------------------

function createThrusterParticles() {
  const count = isMobile ? 80 : 200;
  const positions = new Float32Array(count * 3);
  const lifetimes = new Float32Array(count); // 0 = dead
  const velocities = new Float32Array(count * 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.5,
    color: 0xff8844,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const mesh = new THREE.Points(geo, mat);
  return { mesh, positions, velocities, lifetimes, count };
}

function updateThrusterParticles(thruster, shipGroup, physics, input, delta) {
  const thrusting = input.forward || input.boost || physics.speed > physics.baseSpeed * 1.5;
  const pos = thruster.positions;
  const vel = thruster.velocities;
  const life = thruster.lifetimes;

  for (let i = 0; i < thruster.count; i++) {
    if (life[i] > 0) {
      life[i] -= delta;
      pos[i * 3] += vel[i * 3] * delta;
      pos[i * 3 + 1] += vel[i * 3 + 1] * delta;
      pos[i * 3 + 2] += vel[i * 3 + 2] * delta;
    } else if (thrusting && Math.random() > 0.5) {
      // Spawn from left (D) or right (s) side of title
      const side = Math.random() > 0.5 ? -8 : 8;
      const localSpawn = new THREE.Vector3(
        side + (Math.random() - 0.5) * 1.0,
        (Math.random() - 0.5) * 0.6,
        0.5 + Math.random() * 0.5
      );
      const worldSpawn = localSpawn.applyQuaternion(shipGroup.quaternion).add(shipGroup.position);
      pos[i * 3] = worldSpawn.x;
      pos[i * 3 + 1] = worldSpawn.y;
      pos[i * 3 + 2] = worldSpawn.z;

      // Outward velocity from the side (left goes left, right goes right)
      const outDir = side < 0 ? -1 : 1;
      const localVel = new THREE.Vector3(
        outDir * (4 + Math.random() * 6),
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );
      const worldVel = localVel.applyQuaternion(shipGroup.quaternion);
      vel[i * 3] = worldVel.x;
      vel[i * 3 + 1] = worldVel.y;
      vel[i * 3 + 2] = worldVel.z;

      life[i] = 0.3 + Math.random() * 0.7;
    } else {
      // Dead — hide
      pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
    }
  }

  thruster.mesh.geometry.attributes.position.needsUpdate = true;
  thruster.mesh.material.opacity = thrusting ? 0.5 : 0.15;
}

// ---------------------------------------------------------------------------
// Speed lines (hyperspace streaks)
// ---------------------------------------------------------------------------

function createSpeedLines(scene) {
  const count = isMobile ? 40 : 100;
  const positions = new Float32Array(count * 6);
  const radials = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 5 + Math.random() * 25;
    radials.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      phase: Math.random() * 60,
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xaaccff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mesh = new THREE.LineSegments(geo, mat);
  scene.add(mesh);
  return { mesh, positions, count, radials };
}

function updateSpeedLines(lines, camera, shipGroup, physics, elapsed) {
  const speedRatio = physics.speed / physics.maxSpeed;
  if (speedRatio < 0.05) { lines.mesh.material.opacity = 0; return; }

  const boosting = physics.speed > physics.maxSpeed * 0.7;
  lines.mesh.material.opacity = clamp01(speedRatio * (boosting ? 0.6 : 0.35));

  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);
  const rt = new THREE.Vector3(1, 0, 0).applyQuaternion(shipGroup.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(shipGroup.quaternion);
  const lineLen = 1 + speedRatio * 5 + (boosting ? 6 : 0);
  const pos = lines.positions;

  for (let i = 0; i < lines.count; i++) {
    const r = lines.radials[i];
    const z = ((elapsed * physics.speed * 0.3 + r.phase) % 60) - 30;
    const base = camera.position.clone()
      .addScaledVector(rt, r.x).addScaledVector(up, r.y).addScaledVector(fwd, z);
    const idx = i * 6;
    pos[idx] = base.x; pos[idx + 1] = base.y; pos[idx + 2] = base.z;
    pos[idx + 3] = base.x + fwd.x * lineLen;
    pos[idx + 4] = base.y + fwd.y * lineLen;
    pos[idx + 5] = base.z + fwd.z * lineLen;
  }
  lines.mesh.geometry.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Boost flash
// ---------------------------------------------------------------------------

function createBoostFlash(camera) {
  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 999;
  camera.add(mesh);
  mesh.position.set(0, 0, -0.1);
  return { mesh, active: false, time: 0 };
}

function updateBoostFlash(flash, delta) {
  if (!flash.active) return;
  flash.time += delta;
  flash.mesh.material.opacity = Math.max(0, 0.6 * (1 - flash.time / 0.3));
  if (flash.time > 0.3) { flash.active = false; flash.mesh.material.opacity = 0; }
}

function triggerBoostFlash(flash) { flash.active = true; flash.time = 0; }

// ---------------------------------------------------------------------------
// Rainbow trail
// ---------------------------------------------------------------------------

function createRainbowTrail(scene) {
  const count = isMobile ? 200 : 500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const mesh = new THREE.Points(geo, mat);
  scene.add(mesh);
  return { mesh, positions, colors, count, head: 0 };
}

function updateRainbowTrail(trail, shipGroup, elapsed, rgb) {
  const rgbVal = rgb !== undefined ? rgb : 0.4;
  const i = trail.head;
  trail.positions[i * 3] = shipGroup.position.x;
  trail.positions[i * 3 + 1] = shipGroup.position.y;
  trail.positions[i * 3 + 2] = shipGroup.position.z;

  const cycleSpeed = 0.1 + rgbVal * 0.9;
  const color = new THREE.Color().setHSL((elapsed * cycleSpeed) % 1, 0.3 + rgbVal * 0.7, 0.3 + rgbVal * 0.3);
  trail.colors[i * 3] = color.r;
  trail.colors[i * 3 + 1] = color.g;
  trail.colors[i * 3 + 2] = color.b;

  trail.head = (trail.head + 1) % trail.count;
  trail.mesh.geometry.attributes.position.needsUpdate = true;
  trail.mesh.geometry.attributes.color.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Floating book cards (canvas textures)
// ---------------------------------------------------------------------------

function createBookCardTexture(book) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 200;
  const ctx = c.getContext('2d');

  ctx.fillStyle = 'rgba(8, 8, 32, 0.92)';
  ctx.fillRect(0, 0, 512, 200);

  const catColor = CATEGORY_COLORS[book.category] || '#6666ff';
  ctx.strokeStyle = catColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 504, 192);

  ctx.fillStyle = catColor;
  ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
  const catW = ctx.measureText(book.category).width + 16;
  ctx.fillRect(16, 14, catW, 22);
  ctx.fillStyle = '#000';
  ctx.fillText(book.category, 24, 30);

  ctx.fillStyle = '#e0e0ff';
  ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
  const title = book.title.length > 35 ? book.title.substring(0, 33) + '...' : book.title;
  ctx.fillText(title, 16, 72);

  if (book.author) {
    ctx.fillStyle = '#8888bb';
    ctx.font = '16px Helvetica, Arial, sans-serif';
    ctx.fillText(book.author, 16, 100);
  }

  if (book.stars > 0) {
    ctx.fillStyle = '#ffd93d';
    ctx.font = '26px serif';
    ctx.fillText('\u2605'.repeat(book.stars), 16, 145);
  }

  return new THREE.CanvasTexture(c);
}

function createFloatingBooks(scene) {
  const group = new THREE.Group();

  BOOKS.forEach((book, i) => {
    const texture = createBookCardTexture(book);
    const geo = new THREE.PlaneGeometry(5, 2);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });

    const card = new THREE.Mesh(geo, mat);

    // Scatter in a large volume instead of a ring
    const spreadRadius = 200;
    card.position.set(
      (Math.random() - 0.5) * spreadRadius,
      (Math.random() - 0.5) * spreadRadius * 0.5,
      -Math.random() * spreadRadius
    );

    card.userData.floatSpeed = 0.3 + Math.random() * 0.4;
    card.userData.floatAmp = 0.2 + Math.random() * 0.3;
    card.userData.yBase = card.position.y;
    card.userData.category = book.category;

    group.add(card);
  });

  scene.add(group);
  return group;
}

// ---------------------------------------------------------------------------
// Infinite space wrapping
// ---------------------------------------------------------------------------

function wrapStarfield(stars, shipPos) {
  const positions = stars.geometry.attributes.position.array;
  const wrapRadius = 150;

  for (let i = 0; i < positions.length; i += 3) {
    const dx = positions[i] - shipPos.x;
    const dy = positions[i + 1] - shipPos.y;
    const dz = positions[i + 2] - shipPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq > wrapRadius * wrapRadius) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 100 + Math.random() * 100;
      positions[i] = shipPos.x + r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = shipPos.y + r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = shipPos.z + r * Math.cos(phi);
    }
  }
  stars.geometry.attributes.position.needsUpdate = true;
}

function wrapAmbientParticles(ambient, shipPos) {
  const pos = ambient.positions;
  const vel = ambient.velocities;
  const halfW = 40, halfH = 30, halfD = 40;

  for (let i = 0; i < pos.length; i += 3) {
    pos[i] += vel[i];
    pos[i + 1] += vel[i + 1];
    pos[i + 2] += vel[i + 2];

    if (pos[i] > shipPos.x + halfW) pos[i] = shipPos.x - halfW + Math.random() * 2;
    if (pos[i] < shipPos.x - halfW) pos[i] = shipPos.x + halfW - Math.random() * 2;
    if (pos[i + 1] > shipPos.y + halfH) pos[i + 1] = shipPos.y - halfH + Math.random() * 2;
    if (pos[i + 1] < shipPos.y - halfH) pos[i + 1] = shipPos.y + halfH - Math.random() * 2;
    if (pos[i + 2] > shipPos.z + halfD) pos[i + 2] = shipPos.z - halfD + Math.random() * 2;
    if (pos[i + 2] < shipPos.z - halfD) pos[i + 2] = shipPos.z + halfD - Math.random() * 2;
  }
  ambient.mesh.geometry.attributes.position.needsUpdate = true;
}

function wrapBooks(bookGroup, shipPos) {
  bookGroup.children.forEach((card) => {
    const dist = card.position.distanceTo(shipPos);
    if (dist > 120) {
      card.position.set(
        shipPos.x + (Math.random() - 0.5) * 80,
        shipPos.y + (Math.random() - 0.5) * 40,
        shipPos.z - (40 + Math.random() * 60)
      );
      card.userData.yBase = card.position.y;
    }
    card.lookAt(shipPos);
  });
}

// ---------------------------------------------------------------------------
// Asteroid field
// ---------------------------------------------------------------------------

function createAsteroidField(scene) {
  const count = isMobile ? 20 : 35;
  const meshes = [];
  const rotationSpeeds = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const materials = [
    // Rocky
    new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.95, metalness: 0.1 }),
    // Metallic
    new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.3, metalness: 0.8 }),
    // Crystal
    new THREE.MeshStandardMaterial({ color: 0x3344aa, roughness: 0.2, metalness: 0.6, emissive: 0x111133, emissiveIntensity: 0.3 }),
  ];

  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    const size = roll < 0.6 ? 0.3 + Math.random() * 0.7
               : roll < 0.9 ? 1 + Math.random() * 3
               : 4 + Math.random() * 4;
    sizes[i] = size;

    const detail = size > 3 ? 1 : 0;
    const geo = new THREE.IcosahedronGeometry(size, detail);
    const posArr = geo.attributes.position.array;
    for (let v = 0; v < posArr.length; v += 3) {
      const factor = 1 + (Math.random() - 0.5) * 0.4;
      posArr[v] *= factor;
      posArr[v + 1] *= factor;
      posArr[v + 2] *= factor;
    }
    geo.computeVertexNormals();

    const mat = materials[Math.floor(Math.random() * 3)];
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 250,
      (Math.random() - 0.5) * 160,
      -Math.random() * 250
    );
    mesh.userData.size = size;
    scene.add(mesh);
    meshes.push(mesh);

    const speedScale = 1 / Math.max(size, 1);
    rotationSpeeds[i * 3] = (0.1 + Math.random() * 1.4) * speedScale;
    rotationSpeeds[i * 3 + 1] = (0.1 + Math.random() * 1.4) * speedScale;
    rotationSpeeds[i * 3 + 2] = (0.1 + Math.random() * 1.4) * speedScale;
  }

  // Debris particles
  const debrisCount = isMobile ? 100 : 200;
  const debrisPos = new Float32Array(debrisCount * 3);
  const debrisColors = new Float32Array(debrisCount * 3);
  for (let i = 0; i < debrisCount; i++) {
    const ref = meshes[Math.floor(Math.random() * meshes.length)];
    debrisPos[i * 3] = ref.position.x + (Math.random() - 0.5) * 6;
    debrisPos[i * 3 + 1] = ref.position.y + (Math.random() - 0.5) * 6;
    debrisPos[i * 3 + 2] = ref.position.z + (Math.random() - 0.5) * 6;
    const grey = 0.3 + Math.random() * 0.3;
    debrisColors[i * 3] = grey;
    debrisColors[i * 3 + 1] = grey;
    debrisColors[i * 3 + 2] = grey;
  }
  const debrisGeo = new THREE.BufferGeometry();
  debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPos, 3));
  debrisGeo.setAttribute('color', new THREE.BufferAttribute(debrisColors, 3));
  const debrisMat = new THREE.PointsMaterial({
    size: 0.15, vertexColors: true, transparent: true, opacity: 0.15, depthWrite: false,
  });
  const debris = new THREE.Points(debrisGeo, debrisMat);
  scene.add(debris);

  const proximityLight = new THREE.PointLight(0xff2222, 0, 20);
  scene.add(proximityLight);

  return { meshes, rotationSpeeds, sizes, debris, proximityLight, count };
}

function wrapAsteroids(asteroids, shipPos) {
  asteroids.meshes.forEach((mesh) => {
    const dist = mesh.position.distanceTo(shipPos);
    if (dist > 150) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 70;
      mesh.position.set(
        shipPos.x + r * Math.sin(phi) * Math.cos(theta),
        shipPos.y + r * Math.sin(phi) * Math.sin(theta),
        shipPos.z + r * Math.cos(phi)
      );
    }
  });

  // Drift debris slightly
  const dPos = asteroids.debris.geometry.attributes.position.array;
  for (let i = 0; i < dPos.length; i += 3) {
    const dx = dPos[i] - shipPos.x;
    const dy = dPos[i + 1] - shipPos.y;
    const dz = dPos[i + 2] - shipPos.z;
    if (dx * dx + dy * dy + dz * dz > 150 * 150) {
      const ref = asteroids.meshes[Math.floor(Math.random() * asteroids.meshes.length)];
      dPos[i] = ref.position.x + (Math.random() - 0.5) * 6;
      dPos[i + 1] = ref.position.y + (Math.random() - 0.5) * 6;
      dPos[i + 2] = ref.position.z + (Math.random() - 0.5) * 6;
    }
  }
  asteroids.debris.geometry.attributes.position.needsUpdate = true;
}

function updateAsteroidProximity(asteroids, shipGroup) {
  let closestDist = Infinity;
  let closestPos = null;

  asteroids.meshes.forEach((mesh) => {
    if (mesh.userData.size < 3) return;
    const dist = mesh.position.distanceTo(shipGroup.position);
    if (dist < closestDist) {
      closestDist = dist;
      closestPos = mesh.position;
    }
  });

  if (closestPos && closestDist < 8) {
    asteroids.proximityLight.position.copy(closestPos);
    const target = 80 * (1 - closestDist / 8);
    asteroids.proximityLight.intensity += (target - asteroids.proximityLight.intensity) * 0.1;
  } else {
    asteroids.proximityLight.intensity *= 0.9;
  }
}

// ---------------------------------------------------------------------------
// Nebula clouds
// ---------------------------------------------------------------------------

function createNebulaTexture(color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, color);
  const rgb = parseInt(color.slice(1), 16);
  const r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = rgb & 0xff;
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.5)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function createNebulaClouds(scene) {
  const count = isMobile ? 15 : 25;
  const palette = ['#6B2FA0', '#1A6BFF', '#FF2D95', '#00E5FF', '#FF8800'];
  const clouds = [];

  for (let i = 0; i < count; i++) {
    const color = palette[Math.floor(Math.random() * palette.length)];
    const baseScale = 25 + Math.random() * 45;
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 300,
      (Math.random() - 0.5) * 200,
      -Math.random() * 300
    );

    const sprites = [];
    const scales = [1.0, 0.8, 0.6];
    const opacities = [0.04, 0.06, 0.08];
    for (let j = 0; j < 3; j++) {
      const mat = new THREE.SpriteMaterial({
        map: createNebulaTexture(color),
        transparent: true,
        opacity: opacities[j],
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        pos.x + (Math.random() - 0.5) * 3,
        pos.y + (Math.random() - 0.5) * 3,
        pos.z + (Math.random() - 0.5) * 3
      );
      sprite.scale.setScalar(baseScale * scales[j]);
      scene.add(sprite);
      sprites.push(sprite);
    }

    const light = new THREE.PointLight(new THREE.Color(color).getHex(), 0, 40);
    light.position.copy(pos);
    scene.add(light);

    clouds.push({
      sprites, baseScale, color: new THREE.Color(color), pos,
      lightningTimer: 2 + Math.random() * 6,
      baseOpacities: opacities.slice(), light,
    });
  }

  // Dust pool
  const dustCount = isMobile ? 50 : 100;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustVelocities = new Float32Array(dustCount * 3);
  const dustLifetimes = new Float32Array(dustCount);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.3, color: 0xffffff, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const dustMesh = new THREE.Points(dustGeo, dustMat);
  scene.add(dustMesh);

  return {
    clouds,
    dustPool: { mesh: dustMesh, positions: dustPositions, velocities: dustVelocities, lifetimes: dustLifetimes, count: dustCount, head: 0 },
  };
}

function updateNebulaClouds(nebulae, shipGroup, physics, elapsed, delta) {
  const shipPos = shipGroup.position;
  const dust = nebulae.dustPool;

  nebulae.clouds.forEach((cloud, ci) => {
    // Wrap
    const dist = cloud.sprites[0].position.distanceTo(shipPos);
    if (dist > 250) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 100 + Math.random() * 100;
      const newPos = new THREE.Vector3(
        shipPos.x + r * Math.sin(phi) * Math.cos(theta),
        shipPos.y + r * Math.sin(phi) * Math.sin(theta),
        shipPos.z + r * Math.cos(phi)
      );
      cloud.pos.copy(newPos);
      cloud.sprites.forEach((s, j) => {
        s.position.set(newPos.x + (Math.random() - 0.5) * 3, newPos.y + (Math.random() - 0.5) * 3, newPos.z + (Math.random() - 0.5) * 3);
      });
      cloud.light.position.copy(newPos);
    }

    // Scale pulse
    cloud.sprites.forEach((s, j) => {
      const scales = [1.0, 0.8, 0.6];
      s.scale.setScalar(cloud.baseScale * scales[j] * (1 + 0.03 * Math.sin(elapsed * 0.2 + ci)));
    });

    // Lightning flashes
    cloud.lightningTimer -= delta;
    if (cloud.lightningTimer <= 0) {
      cloud.sprites.forEach((s, j) => { s.material.opacity = cloud.baseOpacities[j] * 3; });
      setTimeout(() => {
        cloud.sprites.forEach((s, j) => { s.material.opacity = cloud.baseOpacities[j]; });
      }, 50);
      cloud.lightningTimer = 2 + Math.random() * 6;
    }

    // Proximity glow
    const d = cloud.sprites[0].position.distanceTo(shipPos);
    cloud.light.intensity = d < 30 ? Math.max(0, (30 - d) / 30) * 5 : 0;

    // Proximity dust burst
    if (d < 15 && physics.speed > 2) {
      for (let k = 0; k < 2; k++) {
        const hi = dust.head;
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);
        dust.positions[hi * 3] = shipPos.x + (Math.random() - 0.5) * 2;
        dust.positions[hi * 3 + 1] = shipPos.y + (Math.random() - 0.5) * 2;
        dust.positions[hi * 3 + 2] = shipPos.z + (Math.random() - 0.5) * 2;
        dust.velocities[hi * 3] = fwd.x * physics.speed * 0.3 + (Math.random() - 0.5) * 3;
        dust.velocities[hi * 3 + 1] = fwd.y * physics.speed * 0.3 + (Math.random() - 0.5) * 3;
        dust.velocities[hi * 3 + 2] = fwd.z * physics.speed * 0.3 + (Math.random() - 0.5) * 3;
        dust.lifetimes[hi] = 1.5;
        dust.head = (dust.head + 1) % dust.count;
      }
    }
  });

  // Age dust particles
  for (let i = 0; i < dust.count; i++) {
    if (dust.lifetimes[i] > 0) {
      dust.lifetimes[i] -= delta;
      dust.positions[i * 3] += dust.velocities[i * 3] * delta;
      dust.positions[i * 3 + 1] += dust.velocities[i * 3 + 1] * delta;
      dust.positions[i * 3 + 2] += dust.velocities[i * 3 + 2] * delta;
    } else {
      dust.positions[i * 3] = 0;
      dust.positions[i * 3 + 1] = 0;
      dust.positions[i * 3 + 2] = 0;
    }
  }
  dust.mesh.geometry.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Ship shield / aura
// ---------------------------------------------------------------------------

function createShipShield(shipGroup) {
  const outerGeo = new THREE.IcosahedronGeometry(7, 1);
  const outerMat = new THREE.MeshBasicMaterial({
    wireframe: true, transparent: true, opacity: 0.04, color: 0x4488ff,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const outer = new THREE.Mesh(outerGeo, outerMat);
  shipGroup.add(outer);

  const innerGeo = new THREE.SphereGeometry(6, 32, 32);
  const innerMat = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.02, color: 0x4488ff,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  shipGroup.add(inner);

  return { outer, inner, rippleTime: -1 };
}

function updateShipShield(shield, physics, input, elapsed, delta, hue, asteroids, shipGroup, rgb) {
  const rgbVal = rgb !== undefined ? rgb : 0.4;

  // RGB sync
  const sat = 0.2 + rgbVal * 0.7;
  shield.outer.material.color.setHSL(hue, sat, 0.3 + rgbVal * 0.3);
  shield.inner.material.color.setHSL(hue, sat, 0.3 + rgbVal * 0.3);

  // Opacity based on speed, scaled by RGB
  const speedRatio = physics.speed / physics.maxSpeed;
  const baseOp = (input.boost ? 0.20 : (speedRatio > 0.15 ? 0.10 : 0.04)) * (0.3 + rgbVal * 0.7);
  const pulseFreq = 0.5 + speedRatio * 2.5;
  const pulseAmp = 0.1 + rgbVal * 0.3;
  const pulse = 1 + pulseAmp * Math.sin(elapsed * pulseFreq * Math.PI * 2);
  shield.outer.material.opacity = baseOp * pulse;
  shield.inner.material.opacity = (baseOp * 0.5) * pulse;

  // Boost ripple
  if (shield.rippleTime >= 0) {
    const t = (elapsed - shield.rippleTime) / 0.4;
    if (t < 1) {
      const s = 1 + 0.3 * easeOutElastic(t);
      shield.outer.scale.setScalar(s);
      shield.inner.scale.setScalar(s);
      shield.outer.material.opacity = Math.max(shield.outer.material.opacity, 0.35 * (1 - t));
    } else {
      shield.outer.scale.setScalar(1);
      shield.inner.scale.setScalar(1);
      shield.rippleTime = -1;
    }
  }

  // Counter-rotation
  shield.outer.rotation.y -= 0.1 * delta;
  shield.inner.rotation.y += 0.05 * delta;

  // Asteroid proximity — opacity spike
  if (asteroids) {
    asteroids.meshes.forEach((m) => {
      if (m.position.distanceTo(shipGroup.position) < 5) {
        shield.outer.material.opacity = Math.max(shield.outer.material.opacity, 0.35);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Contrail trail
// ---------------------------------------------------------------------------

function createContrail(scene, side) {
  const count = isMobile ? 250 : 400;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const ages = new Float32Array(count).fill(999);
  const velocities = new Float32Array(count * 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.0, vertexColors: true, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const mesh = new THREE.Points(geo, mat);
  scene.add(mesh);

  return { mesh, positions, colors, ages, velocities, count, head: 0, side, frame: 0 };
}

function updateContrail(trail, shipGroup, physics, nebulae, delta, rgb) {
  const rgbVal = rgb !== undefined ? rgb : 0.4;
  trail.frame++;
  const speedRatio = physics.speed / physics.maxSpeed;

  // Spawn rate
  const shouldSpawn = physics.speed < 2 ? (trail.frame % 3 === 0) : true;
  const spawnCount = physics.speed > physics.maxSpeed * 0.7 ? 2 : 1;

  if (shouldSpawn) {
    for (let s = 0; s < spawnCount; s++) {
      const hi = trail.head;
      const spread = 1.5 - speedRatio * 1.3;
      const localSpawn = new THREE.Vector3(
        trail.side + (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.5,
        0.5 + Math.random() * 0.5
      );
      const worldSpawn = localSpawn.applyQuaternion(shipGroup.quaternion).add(shipGroup.position);
      trail.positions[hi * 3] = worldSpawn.x;
      trail.positions[hi * 3 + 1] = worldSpawn.y;
      trail.positions[hi * 3 + 2] = worldSpawn.z;

      const localVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        -0.5 + (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
      const worldVel = localVel.applyQuaternion(shipGroup.quaternion);
      trail.velocities[hi * 3] = worldVel.x;
      trail.velocities[hi * 3 + 1] = worldVel.y;
      trail.velocities[hi * 3 + 2] = worldVel.z;

      trail.ages[hi] = 0;
      trail.colors[hi * 3] = 1;
      trail.colors[hi * 3 + 1] = 1;
      trail.colors[hi * 3 + 2] = 1;
      trail.head = (trail.head + 1) % trail.count;
    }
  }

  // Age + drift
  for (let i = 0; i < trail.count; i++) {
    if (trail.ages[i] < 4) {
      trail.ages[i] += delta;
      trail.positions[i * 3] += trail.velocities[i * 3] * delta;
      trail.positions[i * 3 + 1] += trail.velocities[i * 3 + 1] * delta;
      trail.positions[i * 3 + 2] += trail.velocities[i * 3 + 2] * delta;

      // Wind shear
      trail.positions[i * 3] += 0.02 * delta;
      trail.positions[i * 3 + 1] -= 0.01 * delta;

      let brightness = Math.max(0, 1 - trail.ages[i] / 4) * (0.3 + rgbVal * 0.7);
      let cr = 1, cg = 1, cb = 1;

      // Nebula color blending
      if (nebulae) {
        nebulae.clouds.forEach((cloud) => {
          const dx = trail.positions[i * 3] - cloud.pos.x;
          const dy = trail.positions[i * 3 + 1] - cloud.pos.y;
          const dz = trail.positions[i * 3 + 2] - cloud.pos.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < 20) {
            const blend = 0.3 * (1 - d / 20);
            cr = cr * (1 - blend) + cloud.color.r * blend;
            cg = cg * (1 - blend) + cloud.color.g * blend;
            cb = cb * (1 - blend) + cloud.color.b * blend;
          }
        });
      }

      trail.colors[i * 3] = brightness * cr;
      trail.colors[i * 3 + 1] = brightness * cg;
      trail.colors[i * 3 + 2] = brightness * cb;
    } else {
      trail.positions[i * 3] = 0;
      trail.positions[i * 3 + 1] = 0;
      trail.positions[i * 3 + 2] = 0;
      trail.colors[i * 3] = 0;
      trail.colors[i * 3 + 1] = 0;
      trail.colors[i * 3 + 2] = 0;
    }
  }
  trail.mesh.geometry.attributes.position.needsUpdate = true;
  trail.mesh.geometry.attributes.color.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Warp tunnel
// ---------------------------------------------------------------------------

function createWarpTunnelTexture(width, hueShift) {
  const c = document.createElement('canvas');
  c.width = width; c.height = 64;
  const ctx = c.getContext('2d');
  const colors = ['#1A6BFF', '#8833FF', '#ffffff', '#00E5FF', '#6B2FA0'];
  let y = 0;
  while (y < 64) {
    const bandH = 2 + Math.random() * 6;
    ctx.fillStyle = colors[Math.floor((Math.random() + hueShift) * colors.length) % colors.length];
    ctx.globalAlpha = 0.3 + Math.random() * 0.5;
    ctx.fillRect(0, y, width, bandH);
    y += bandH;
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  return texture;
}

function createWarpTunnel(scene) {
  const group = new THREE.Group();
  const radii = [6, 10, 15, 22];
  const baseOpacities = [0.18, 0.12, 0.08, 0.05];
  const rings = [];

  radii.forEach((r, i) => {
    const geo = new THREE.CylinderGeometry(r, r, 200, isMobile ? 16 : 24, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      map: createWarpTunnelTexture(512, i * 0.25),
      transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2; // align cylinder with Z axis
    mesh.userData.baseOpacity = baseOpacities[i];
    mesh.userData.scrollSpeed = 4 - i * 0.8;
    group.add(mesh);
    rings.push(mesh);
  });

  // Pulse torus rings
  const pulseRings = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.TorusGeometry(10 + i * 3, 0.3, 8, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x44aaff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.active = false;
    mesh.userData.z = 0;
    group.add(mesh);
    pulseRings.push(mesh);
  }

  group.visible = false;
  scene.add(group);

  return { group, rings, pulseRings, active: false, opacity: 0, entryTime: 0, exitTime: 0, lastPulse: 0 };
}

function updateWarpTunnel(tunnel, camera, shipGroup, physics, input, elapsed, delta, bloomPass) {
  // Position + orient group to camera/ship
  tunnel.group.position.copy(camera.position);
  tunnel.group.quaternion.copy(shipGroup.quaternion);

  // Entry
  if (input.boost && !tunnel.active) {
    tunnel.active = true;
    tunnel.entryTime = elapsed;
    tunnel.group.visible = true;
    tunnel.lastPulse = elapsed;
  }

  // Exit
  if (!input.boost && tunnel.active) {
    tunnel.active = false;
    tunnel.exitTime = elapsed;
  }

  if (tunnel.active) {
    // Iris open
    const entryT = clamp01((elapsed - tunnel.entryTime) / 0.3);
    tunnel.opacity = entryT;

    // Scroll textures
    tunnel.rings.forEach((ring) => {
      ring.material.opacity = ring.userData.baseOpacity * tunnel.opacity;
      ring.material.map.offset.y += ring.userData.scrollSpeed * delta;
    });

    // Pulse torus rings
    if (elapsed - tunnel.lastPulse > 0.5) {
      const pr = tunnel.pulseRings.find(p => !p.userData.active);
      if (pr) {
        pr.userData.active = true;
        pr.userData.z = -100;
        pr.material.opacity = 0.6;
      }
      tunnel.lastPulse = elapsed;
    }

    // Bloom modulation
    if (bloomPass) {
      bloomPass.threshold += (0.3 - bloomPass.threshold) * 0.1;
    }
  } else if (tunnel.group.visible) {
    // Exit animation
    const exitT = clamp01((elapsed - tunnel.exitTime) / 0.5);
    tunnel.opacity = 1 - exitT;

    tunnel.rings.forEach((ring) => {
      ring.material.opacity = ring.userData.baseOpacity * tunnel.opacity;
    });

    if (exitT >= 1) {
      tunnel.group.visible = false;
      tunnel.opacity = 0;
    }

    // Bloom recovery
    if (bloomPass) {
      bloomPass.threshold += (0.85 - bloomPass.threshold) * 0.05;
    }
  } else {
    // Fully inactive — keep recovering bloom
    if (bloomPass && bloomPass.threshold < 0.84) {
      bloomPass.threshold += (0.85 - bloomPass.threshold) * 0.05;
    }
  }

  // Animate pulse rings
  tunnel.pulseRings.forEach((pr) => {
    if (!pr.userData.active) return;
    pr.userData.z += 200 * delta;
    pr.position.set(0, 0, pr.userData.z);
    pr.material.opacity *= 0.96;
    if (pr.userData.z > 10) {
      pr.userData.active = false;
      pr.material.opacity = 0;
    }
  });
}

// ---------------------------------------------------------------------------
// Black hole
// ---------------------------------------------------------------------------

function createAccretionDiskTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.2, '#ff6600');
  grad.addColorStop(0.5, '#ffffff');
  grad.addColorStop(0.8, '#ff6600');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 64);
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createBlackHole(scene) {
  const group = new THREE.Group();

  // Event horizon — pure black sphere
  const horizonGeo = new THREE.SphereGeometry(3, 32, 32);
  const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const horizon = new THREE.Mesh(horizonGeo, horizonMat);
  group.add(horizon);

  // Glowing rim
  const rimGeo = new THREE.TorusGeometry(3.2, 0.1, 16, 64);
  const rimMat = new THREE.MeshBasicMaterial({
    color: 0x8844ff, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  group.add(rim);

  // Second rim at different angle
  const rim2 = rim.clone();
  rim2.rotation.x = Math.PI / 2;
  group.add(rim2);

  // Accretion disk
  const diskGeo = new THREE.TorusGeometry(6, 1.5, 8, 64);
  const diskMat = new THREE.MeshBasicMaterial({
    map: createAccretionDiskTexture(),
    transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const accretionDisk = new THREE.Mesh(diskGeo, diskMat);
  accretionDisk.rotation.x = Math.PI * 0.3;
  group.add(accretionDisk);

  group.position.set(
    (Math.random() - 0.5) * 200,
    (Math.random() - 0.5) * 100,
    -50 - Math.random() * 150
  );
  scene.add(group);

  return {
    group, accretionDisk,
    gravityRadius: 60,
    pullStrength: 8,
    eventHorizonRadius: 3,
  };
}

function updateBlackHole(blackHole, shipGroup, physics, asteroids, camera, elapsed, delta, rgb, lensingPass) {
  const bhPos = blackHole.group.position;

  // Disk rotation
  blackHole.accretionDisk.rotation.z += delta * 0.5;

  // Wrap
  const distToShip = bhPos.distanceTo(shipGroup.position);
  if (distToShip > 250) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 100 + Math.random() * 100;
    bhPos.set(
      shipGroup.position.x + r * Math.sin(phi) * Math.cos(theta),
      shipGroup.position.y + r * Math.sin(phi) * Math.sin(theta),
      shipGroup.position.z + r * Math.cos(phi)
    );
  }

  // Gravity pull on asteroids
  if (asteroids) {
    asteroids.meshes.forEach((m) => {
      const dir = new THREE.Vector3().subVectors(bhPos, m.position);
      const dist = dir.length();
      if (dist < blackHole.gravityRadius && dist > blackHole.eventHorizonRadius) {
        const force = blackHole.pullStrength / (dist * dist) * delta;
        m.position.addScaledVector(dir.normalize(), force);
      }
    });
  }

  // Gravity pull on ship (subtle)
  if (distToShip < blackHole.gravityRadius) {
    const pullDir = new THREE.Vector3().subVectors(bhPos, shipGroup.position).normalize();
    const pullMag = blackHole.pullStrength * 0.3 / Math.max(distToShip * distToShip, 1) * delta;
    physics.velocity.addScaledVector(pullDir, pullMag);
  }

  // Lensing shader
  if (lensingPass) {
    const screenPos = bhPos.clone().project(camera);
    if (screenPos.z <= 1) {
      lensingPass.uniforms.blackHoleScreenPos.value.set(
        screenPos.x * 0.5 + 0.5,
        screenPos.y * 0.5 + 0.5
      );
      lensingPass.uniforms.distortionStrength.value =
        clamp01(1 - distToShip / blackHole.gravityRadius) * rgb;
      lensingPass.uniforms.radius.value =
        clamp(3 / Math.max(distToShip, 1) * 0.5, 0.02, 0.4);
    } else {
      lensingPass.uniforms.distortionStrength.value = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Lightning arcs
// ---------------------------------------------------------------------------

function createLightningPool(scene) {
  const bolts = [];
  for (let i = 0; i < 4; i++) {
    const segCount = 20;
    const positions = new Float32Array(segCount * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xccffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.LineSegments(geo, mat);
    scene.add(mesh);
    bolts.push({ mesh, positions, active: false, lifetime: 0, maxLifetime: 0.15, segCount });
  }
  return { bolts };
}

function triggerLightningArc(pool, shipGroup, asteroids, nebulae, rgb) {
  // Find nearest target within 15 units
  let nearest = null;
  let nearestDist = 15;
  if (asteroids) {
    asteroids.meshes.forEach((m) => {
      const d = m.position.distanceTo(shipGroup.position);
      if (d < nearestDist) { nearestDist = d; nearest = m.position; }
    });
  }
  if (!nearest && nebulae) {
    nebulae.clouds.forEach((c) => {
      const d = c.pos.distanceTo(shipGroup.position);
      if (d < nearestDist) { nearestDist = d; nearest = c.pos; }
    });
  }
  if (!nearest) return;

  // Find inactive bolt
  const bolt = pool.bolts.find(b => !b.active);
  if (!bolt) return;

  bolt.active = true;
  bolt.lifetime = bolt.maxLifetime;

  const start = shipGroup.position;
  const end = nearest;
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  dir.normalize();
  // Perpendicular axis
  const up = new THREE.Vector3(0, 1, 0);
  const perp1 = new THREE.Vector3().crossVectors(dir, up).normalize();
  const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();

  for (let i = 0; i < bolt.segCount; i++) {
    const t0 = i / bolt.segCount;
    const t1 = (i + 1) / bolt.segCount;
    const jitter = 0.5 * (1 + rgb);

    const p0 = start.clone().addScaledVector(dir, t0 * len);
    if (i > 0) {
      p0.addScaledVector(perp1, (Math.random() - 0.5) * jitter);
      p0.addScaledVector(perp2, (Math.random() - 0.5) * jitter);
    }
    const p1 = start.clone().addScaledVector(dir, t1 * len);
    if (i < bolt.segCount - 1) {
      p1.addScaledVector(perp1, (Math.random() - 0.5) * jitter);
      p1.addScaledVector(perp2, (Math.random() - 0.5) * jitter);
    }

    const idx = i * 6;
    bolt.positions[idx] = p0.x; bolt.positions[idx + 1] = p0.y; bolt.positions[idx + 2] = p0.z;
    bolt.positions[idx + 3] = p1.x; bolt.positions[idx + 4] = p1.y; bolt.positions[idx + 5] = p1.z;
  }
  bolt.mesh.geometry.attributes.position.needsUpdate = true;
  bolt.mesh.material.opacity = 0.6 + rgb * 0.4;
}

function updateLightningArcs(pool, delta, rgb) {
  pool.bolts.forEach((bolt) => {
    if (!bolt.active) return;
    bolt.lifetime -= delta;
    if (bolt.lifetime <= 0) {
      bolt.active = false;
      bolt.mesh.material.opacity = 0;
      return;
    }
    // Jitter points each frame for flicker
    for (let i = 1; i < bolt.positions.length / 3 - 1; i++) {
      bolt.positions[i * 3] += (Math.random() - 0.5) * 0.15;
      bolt.positions[i * 3 + 1] += (Math.random() - 0.5) * 0.15;
      bolt.positions[i * 3 + 2] += (Math.random() - 0.5) * 0.15;
    }
    bolt.mesh.geometry.attributes.position.needsUpdate = true;
    bolt.mesh.material.opacity = (bolt.lifetime / bolt.maxLifetime) * (0.6 + rgb * 0.4);
  });
}

// ---------------------------------------------------------------------------
// Sonic boom shockwave
// ---------------------------------------------------------------------------

function createShockwavePool(scene) {
  const meshes = [];
  const states = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.TorusGeometry(1, 0.15, 8, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xaaddff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    meshes.push(mesh);
    states.push({ active: false, startTime: 0, position: new THREE.Vector3() });
  }
  return { meshes, states };
}

function triggerShockwave(pool, position, elapsed) {
  for (let i = 0; i < pool.states.length; i++) {
    if (!pool.states[i].active) {
      pool.states[i].active = true;
      pool.states[i].startTime = elapsed;
      pool.states[i].position.copy(position);
      pool.meshes[i].visible = true;
      pool.meshes[i].position.copy(position);
      pool.meshes[i].scale.setScalar(1);
      return;
    }
  }
}

function updateShockwaves(pool, elapsed, rgb) {
  const duration = 0.6;
  for (let i = 0; i < pool.states.length; i++) {
    const s = pool.states[i];
    if (!s.active) continue;
    const t = (elapsed - s.startTime) / duration;
    if (t >= 1) {
      s.active = false;
      pool.meshes[i].visible = false;
      pool.meshes[i].material.opacity = 0;
      continue;
    }
    const scale = 1 + t * 39;
    pool.meshes[i].scale.setScalar(scale);
    pool.meshes[i].material.opacity = 0.7 * rgb * (1 - t);
    // Rotate to face camera direction
    pool.meshes[i].lookAt(pool.meshes[i].position.clone().add(new THREE.Vector3(0, 0, 1)));
  }
}

// ---------------------------------------------------------------------------
// Missile system
// ---------------------------------------------------------------------------

function createMissilePool(scene) {
  const count = 6;
  const meshes = [];
  const states = [];
  const trails = [];

  for (let i = 0; i < count; i++) {
    const geo = new THREE.ConeGeometry(0.15, 0.8, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa44, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    meshes.push(mesh);
    states.push({ active: false, position: new THREE.Vector3(), velocity: new THREE.Vector3(), target: null, lifetime: 0 });

    // Mini trail per missile
    const trailCount = 30;
    const tPos = new Float32Array(trailCount * 3);
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
    const tMat = new THREE.PointsMaterial({
      size: 0.3, color: 0xff6622, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    const tMesh = new THREE.Points(tGeo, tMat);
    scene.add(tMesh);
    trails.push({ mesh: tMesh, positions: tPos, count: trailCount, head: 0 });
  }

  return { meshes, states, trails, count };
}

function fireMissile(pool, shipGroup, physics, asteroids) {
  for (let i = 0; i < pool.count; i++) {
    if (!pool.states[i].active) {
      const s = pool.states[i];
      s.active = true;
      s.lifetime = 5;

      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);
      s.position.copy(shipGroup.position).addScaledVector(fwd, 3);
      s.velocity.copy(fwd).multiplyScalar(physics.speed + 20);

      pool.meshes[i].visible = true;
      pool.meshes[i].material.opacity = 1;

      // Find nearest asteroid target
      s.target = null;
      let minDist = 100;
      if (asteroids) {
        asteroids.meshes.forEach((m) => {
          const d = m.position.distanceTo(s.position);
          if (d < minDist) { minDist = d; s.target = m; }
        });
      }

      // Reset trail
      pool.trails[i].positions.fill(0);
      pool.trails[i].head = 0;
      return;
    }
  }
}

function updateMissiles(pool, asteroids, shipGroup, elapsed, delta, shockwaves, explosions, rgb, comets) {
  let kills = 0;
  for (let i = 0; i < pool.count; i++) {
    const s = pool.states[i];
    if (!s.active) continue;

    s.lifetime -= delta;

    // Homing toward target
    if (s.target && s.target.visible !== false) {
      const toTarget = new THREE.Vector3().subVectors(s.target.position, s.position).normalize();
      const speed = s.velocity.length();
      s.velocity.normalize().lerp(toTarget, 3 * delta).normalize().multiplyScalar(speed);
    }

    // Move
    s.position.addScaledVector(s.velocity, delta);
    pool.meshes[i].position.copy(s.position);
    pool.meshes[i].lookAt(s.position.clone().add(s.velocity));

    // Trail breadcrumb
    const t = pool.trails[i];
    t.positions[t.head * 3] = s.position.x;
    t.positions[t.head * 3 + 1] = s.position.y;
    t.positions[t.head * 3 + 2] = s.position.z;
    t.head = (t.head + 1) % t.count;
    t.mesh.geometry.attributes.position.needsUpdate = true;

    // Hit detection — proximity to asteroids
    let hit = false;
    if (asteroids) {
      for (let a = 0; a < asteroids.meshes.length; a++) {
        const am = asteroids.meshes[a];
        const hitDist = (am.userData.size || 1) + 1;
        if (am.position.distanceTo(s.position) < hitDist) {
          hit = true;
          triggerExplosion(explosions, am.position.clone(), rgb);
          triggerShockwave(shockwaves, am.position.clone(), elapsed);
          // Respawn asteroid elsewhere
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = 80 + Math.random() * 70;
          am.position.set(
            shipGroup.position.x + r * Math.sin(phi) * Math.cos(theta),
            shipGroup.position.y + r * Math.sin(phi) * Math.sin(theta),
            shipGroup.position.z + r * Math.cos(phi)
          );
          const texts = ['DESTROYED!', 'OBLITERATED!', 'ANNIHILATED!', 'VAPORIZED!'];
          showActionText(texts[Math.floor(Math.random() * texts.length)]);
          kills++;
          break;
        }
      }
    }

    // Comet hit detection
    if (!hit && comets) {
      for (let ci = 0; ci < comets.length; ci++) {
        const c = comets[ci];
        if (!c.active) continue;
        if (c.position.distanceTo(s.position) < c.size + 1) {
          hit = true;
          triggerExplosion(explosions, c.position.clone(), rgb);
          triggerShockwave(shockwaves, c.position.clone(), elapsed);
          c.active = false; c.mesh.visible = false; c.mesh.material.opacity = 0;
          c.trail.positions.fill(0); c.trail.mesh.geometry.attributes.position.needsUpdate = true;
          showActionText('COMET DESTROYED!');
          kills++;
          break;
        }
      }
    }

    // Timeout or hit — explode
    if (s.lifetime <= 0 || hit) {
      if (!hit) triggerExplosion(explosions, s.position.clone(), rgb);
      s.active = false;
      pool.meshes[i].visible = false;
      pool.meshes[i].material.opacity = 0;
      pool.trails[i].positions.fill(0);
      pool.trails[i].mesh.geometry.attributes.position.needsUpdate = true;
    }
  }
  return kills;
}

// ---------------------------------------------------------------------------
// Explosion system
// ---------------------------------------------------------------------------

function createExplosionPool(scene) {
  const poolSize = 4;
  const particleCount = 200;
  const instances = [];

  for (let p = 0; p < poolSize; p++) {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.8, vertexColors: true, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    const mesh = new THREE.Points(geo, mat);
    scene.add(mesh);
    instances.push({ mesh, positions, velocities, lifetimes, colors, count: particleCount, active: false });
  }

  return { instances };
}

function triggerExplosion(pool, position, rgb) {
  for (let i = 0; i < pool.instances.length; i++) {
    const inst = pool.instances[i];
    if (!inst.active) {
      inst.active = true;
      inst.mesh.material.opacity = 0.9;
      for (let p = 0; p < inst.count; p++) {
        inst.positions[p * 3] = position.x;
        inst.positions[p * 3 + 1] = position.y;
        inst.positions[p * 3 + 2] = position.z;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 8 + Math.random() * 20;
        inst.velocities[p * 3] = speed * Math.sin(phi) * Math.cos(theta);
        inst.velocities[p * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
        inst.velocities[p * 3 + 2] = speed * Math.cos(phi);

        inst.lifetimes[p] = 0.5 + Math.random() * 0.5;

        // Orange/yellow/white colors
        const rr = Math.random();
        inst.colors[p * 3] = 1.0;
        inst.colors[p * 3 + 1] = 0.3 + rr * 0.7;
        inst.colors[p * 3 + 2] = rr > 0.7 ? 0.8 : rr * 0.3;
      }
      return;
    }
  }
}

function updateExplosions(pool, delta) {
  pool.instances.forEach((inst) => {
    if (!inst.active) return;
    let anyAlive = false;
    for (let p = 0; p < inst.count; p++) {
      if (inst.lifetimes[p] > 0) {
        anyAlive = true;
        inst.lifetimes[p] -= delta;
        inst.positions[p * 3] += inst.velocities[p * 3] * delta;
        inst.positions[p * 3 + 1] += inst.velocities[p * 3 + 1] * delta;
        inst.positions[p * 3 + 2] += inst.velocities[p * 3 + 2] * delta;
        // Drag
        inst.velocities[p * 3] *= 0.97;
        inst.velocities[p * 3 + 1] *= 0.97;
        inst.velocities[p * 3 + 2] *= 0.97;
      }
    }
    inst.mesh.geometry.attributes.position.needsUpdate = true;
    inst.mesh.geometry.attributes.color.needsUpdate = true;
    if (!anyAlive) {
      inst.active = false;
      inst.mesh.material.opacity = 0;
    } else {
      inst.mesh.material.opacity *= 0.98;
    }
  });
}

// ---------------------------------------------------------------------------
// Barrel roll
// ---------------------------------------------------------------------------

function triggerBarrelRoll(state, direction, elapsed, physics, shipGroup) {
  state.barrelRoll.active = true;
  state.barrelRoll.direction = direction;
  state.barrelRoll.startTime = elapsed;
  if (elapsed - state.barrelRoll.lastRollEnd < 1.5) {
    state.barrelRoll.comboCount++;
  } else {
    state.barrelRoll.comboCount = 1;
  }
  // Speed boost on roll
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);
  physics.velocity.addScaledVector(fwd, Math.max(physics.speed * 0.2, 2));
}

function updateBarrelRoll(state, shipGroup, elapsed) {
  const roll = state.barrelRoll;
  if (!roll.active) return false;

  const t = (elapsed - roll.startTime) / roll.duration;
  if (t >= 1) {
    roll.active = false;
    roll.lastRollEnd = elapsed;
    shipGroup.rotation.z = 0;
    if (roll.comboCount > 1) showActionText(getComboText(roll.comboCount));
    return false;
  }

  const eased = easeInOutCubic(t);
  shipGroup.rotation.z = roll.direction * Math.PI * 2 * eased;
  return true;
}

function getComboText(count) {
  if (count === 2) return 'COMBO x2!';
  if (count === 3) return 'TRIPLE ROLL!';
  if (count === 4) return 'QUAD SPIN!';
  return 'ABSOLUTELY MENTAL!';
}

// ---------------------------------------------------------------------------
// Flip / reverse (Q key)
// ---------------------------------------------------------------------------

function triggerFlip(state, shipGroup, elapsed) {
  state.flip.active = true;
  state.flip.startTime = elapsed;
  state.flip.startRotY = shipGroup.rotation.y;
}

function updateFlip(state, shipGroup, camera, elements, elapsed) {
  const f = state.flip;
  if (!f.active) { f.cameraOffset = f.cameraOffset * 0.9; return; }

  const t = (elapsed - f.startTime) / f.duration;
  if (t >= 1) {
    f.active = false;
    shipGroup.rotation.y = f.startRotY + Math.PI;
    triggerFlipBurst(elements.flipBurst, shipGroup);
    showActionText('FLIP!');
    f.cameraOffset = 0;
    return;
  }

  const eased = easeInOutCubic(t);
  shipGroup.rotation.y = f.startRotY + Math.PI * eased;

  // Camera pull-back (peaks at midpoint)
  f.cameraOffset = 8 * Math.sin(t * Math.PI);

  // Engine glow spike during flip
  elements.engineGlowL.intensity = 500;
  elements.engineGlowR.intensity = 500;
}

// ---------------------------------------------------------------------------
// Flip burst particles
// ---------------------------------------------------------------------------

function createFlipBurst(scene) {
  const count = 50;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const lifetimes = new Float32Array(count);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.6,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const mesh = new THREE.Points(geo, mat);
  scene.add(mesh);
  return { mesh, positions, velocities, lifetimes, count };
}

function triggerFlipBurst(burst, shipGroup) {
  for (let i = 0; i < burst.count; i++) {
    burst.positions[i * 3] = shipGroup.position.x;
    burst.positions[i * 3 + 1] = shipGroup.position.y;
    burst.positions[i * 3 + 2] = shipGroup.position.z;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 5 + Math.random() * 15;
    burst.velocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
    burst.velocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
    burst.velocities[i * 3 + 2] = speed * Math.cos(phi);

    burst.lifetimes[i] = 0.3 + Math.random() * 0.4;
  }
  burst.mesh.material.opacity = 0.7;
}

function updateFlipBurst(burst, delta) {
  let anyAlive = false;
  for (let i = 0; i < burst.count; i++) {
    if (burst.lifetimes[i] > 0) {
      anyAlive = true;
      burst.lifetimes[i] -= delta;
      burst.positions[i * 3] += burst.velocities[i * 3] * delta;
      burst.positions[i * 3 + 1] += burst.velocities[i * 3 + 1] * delta;
      burst.positions[i * 3 + 2] += burst.velocities[i * 3 + 2] * delta;
    }
  }
  burst.mesh.geometry.attributes.position.needsUpdate = true;
  if (!anyAlive) burst.mesh.material.opacity = 0;
}

// ---------------------------------------------------------------------------
// Action text overlay
// ---------------------------------------------------------------------------

function showActionText(text) {
  const el = document.getElementById('action-text');
  if (!el) return;
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => { el.style.opacity = '0'; }, 800);
}

// ---------------------------------------------------------------------------
// Collision & health system
// ---------------------------------------------------------------------------

function checkShipCollisions(asteroids, shipGroup, state, elements, elapsed, rgb) {
  if (state.health.invincible || state.health.dead) return;
  asteroids.meshes.forEach((m) => {
    const hitDist = (m.userData.size || 1) + 1;
    if (m.position.distanceTo(shipGroup.position) < hitDist) {
      if (rgb > 0.7) {
        // Shield absorbs
        elements.shield.rippleTime = elapsed;
        showActionText('SHIELD ABSORBED!');
        triggerDamageSound(elements.sound);
        // Respawn asteroid away
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 80 + Math.random() * 70;
        m.position.set(
          shipGroup.position.x + r * Math.sin(phi) * Math.cos(theta),
          shipGroup.position.y + r * Math.sin(phi) * Math.sin(theta),
          shipGroup.position.z + r * Math.cos(phi)
        );
        return;
      }
      const damage = 10 + (m.userData.size || 1) * 5;
      state.health.current = Math.max(0, state.health.current - damage);
      state.health.crackIntensity = clamp01(state.health.crackIntensity + damage / 100);
      state.health.lastDamageTime = elapsed;
      state.achievements.stats.timeSinceLastDamage = 0;
      triggerBoostFlash(elements.boostFlash);
      triggerDamageSound(elements.sound);
      state.explosionShake = 0.5;
      showActionText('HULL DAMAGE!');
      // Respawn asteroid
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 70;
      m.position.set(
        shipGroup.position.x + r * Math.sin(phi) * Math.cos(theta),
        shipGroup.position.y + r * Math.sin(phi) * Math.sin(theta),
        shipGroup.position.z + r * Math.cos(phi)
      );
      if (state.health.current <= 0) {
        triggerShipDeath(state, elements, shipGroup, elapsed);
      }
    }
  });
}

function triggerShipDeath(state, elements, shipGroup, elapsed) {
  state.health.dead = true;
  state.health.respawnTimer = 2.0;
  triggerExplosion(elements.explosions, shipGroup.position.clone(), 1.0);
  triggerExplosionSound(elements.sound);
  triggerShockwave(elements.shockwaves, shipGroup.position.clone(), elapsed);
  showActionText('DESTROYED!');
  state.explosionShake = 2.0;
  if (elements.titleMesh) elements.titleMesh.visible = false;
  elements.tagMeshes.forEach(m => { m.visible = false; });
  elements.linkMeshes.forEach(m => { m.visible = false; });
}

function respawnShip(state, elements, shipGroup, physics) {
  state.health.dead = false;
  state.health.current = state.health.max;
  state.health.crackIntensity = 0;
  state.health.invincible = true;
  state.health.invincibleTimer = 3.0;
  physics.velocity.set(0, 0, 0);
  physics.speed = 0;
  if (elements.titleMesh) elements.titleMesh.visible = true;
  elements.tagMeshes.forEach(m => { m.visible = true; });
  elements.linkMeshes.forEach(m => { m.visible = true; });
  showActionText('RESPAWNED!');
}

function updateHealthSystem(state, elements, elapsed, delta, shipGroup, physics) {
  // Heal cracks over time
  if (elapsed - state.health.lastDamageTime > state.health.healDelay && !state.health.dead) {
    state.health.crackIntensity = Math.max(0, state.health.crackIntensity - state.health.healRate * delta);
    state.health.current = Math.min(state.health.max, state.health.current + 5 * delta);
  }

  // Update crack shader
  if (elements.crackPass) {
    elements.crackPass.uniforms.crackIntensity.value = state.health.crackIntensity;
    elements.crackPass.uniforms.time.value = elapsed;
  }

  // Invincibility
  if (state.health.invincible) {
    state.health.invincibleTimer -= delta;
    if (state.health.invincibleTimer <= 0) state.health.invincible = false;
    elements.shield.outer.material.opacity = 0.3 * Math.abs(Math.sin(elapsed * 10));
  }

  // Health bar HUD
  const bar = document.getElementById('health-bar-inner');
  if (bar) {
    const pct = (state.health.current / state.health.max) * 100;
    bar.style.width = pct + '%';
    if (pct > 60) bar.style.background = 'linear-gradient(90deg, #00ff66, #00ff88)';
    else if (pct > 30) bar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc44)';
    else bar.style.background = 'linear-gradient(90deg, #ff3333, #ff6644)';
  }

  // Death respawn
  if (state.health.dead) {
    state.health.respawnTimer -= delta;
    if (state.health.respawnTimer <= 0) {
      respawnShip(state, elements, shipGroup, physics);
    }
  }
}

// ---------------------------------------------------------------------------
// Achievement system
// ---------------------------------------------------------------------------

function updateAchievementStats(state, physics, delta) {
  const stats = state.achievements.stats;
  if (physics.speed > stats.maxSpeedReached) stats.maxSpeedReached = physics.speed;
  stats.timeSinceLastDamage += delta;
}

function checkAchievements(state) {
  const stats = state.achievements.stats;
  for (const ach of ACHIEVEMENTS) {
    if (state.achievements.unlocked.has(ach.id)) continue;
    if (ach.check(stats)) {
      state.achievements.unlocked.add(ach.id);
      state.achievements.popupQueue.push(ach);
    }
  }
}

function updateAchievementPopups(state, elements, delta) {
  const container = document.getElementById('achievement-container');
  if (!container) return;

  if (state.achievements.activePopup) {
    state.achievements.popupTimer -= delta;
    if (state.achievements.popupTimer <= 0) {
      const el = container.firstChild;
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateX(120%)';
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
      }
      state.achievements.activePopup = null;
    }
    return;
  }

  if (state.achievements.popupQueue.length > 0) {
    const ach = state.achievements.popupQueue.shift();
    state.achievements.activePopup = ach;
    state.achievements.popupTimer = 3.0;
    const popup = document.createElement('div');
    popup.style.cssText = 'font-family:monospace; background:linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,255,255,0.05)); border:1px solid rgba(255,215,0,0.5); border-radius:6px; padding:10px 18px; margin-bottom:8px; transform:translateX(120%); opacity:0; transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);';
    popup.innerHTML = '<div style="color:#ffd700; font-size:14px; font-weight:bold; letter-spacing:2px;">ACHIEVEMENT</div><div style="color:#fff; font-size:16px; font-weight:bold; margin-top:2px;">' + ach.name + '</div><div style="color:rgba(255,255,255,0.6); font-size:11px; margin-top:2px;">' + ach.desc + '</div>';
    container.appendChild(popup);
    requestAnimationFrame(() => {
      popup.style.opacity = '1';
      popup.style.transform = 'translateX(0)';
    });
    triggerAchievementSound(elements.sound);
  }
}

// ---------------------------------------------------------------------------
// Minimap (tactical radar)
// ---------------------------------------------------------------------------

function initMinimap() {
  const canvas = document.getElementById('minimap');
  if (!canvas) return null;
  return canvas.getContext('2d');
}

function updateMinimap(ctx, shipGroup, bookGroup, asteroids, nebulae, blackHole, whale, comets, elapsed) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = (w / 2) - 4;
  const radarRange = 120;
  const scale = radius / radarRange;
  const shipYaw = shipGroup.rotation.y;

  // Sweep angle — one full clockwise rotation every 2 seconds
  const sweepAngle = (elapsed * Math.PI) % (Math.PI * 2);

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = 'rgba(0, 5, 20, 0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Range rings (3 concentric dashed circles)
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.12)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 4]);
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * (i / 3), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Crosshairs
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.06)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
  ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
  ctx.stroke();

  // Sweep line — trailing fade (draw ~15 trailing lines)
  for (let a = 0.03; a < 0.6; a += 0.04) {
    const fadeAngle = sweepAngle - a;
    const alpha = 0.15 * (1 - a / 0.6);
    const ex = cx + Math.sin(fadeAngle) * radius;
    const ey = cy - Math.cos(fadeAngle) * radius;
    ctx.strokeStyle = `rgba(0, 255, 136, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  // Main sweep line
  const sweepEndX = cx + Math.sin(sweepAngle) * radius;
  const sweepEndY = cy - Math.cos(sweepAngle) * radius;
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(sweepEndX, sweepEndY);
  ctx.stroke();

  // Book blips
  const cosY = Math.cos(-shipYaw);
  const sinY = Math.sin(-shipYaw);

  bookGroup.children.forEach((card) => {
    const dx = card.position.x - shipGroup.position.x;
    const dz = card.position.z - shipGroup.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > radarRange) return;

    // Rotate into ship-local frame (forward = up on radar)
    const localX = dx * cosY - dz * sinY;
    const localZ = dx * sinY + dz * cosY;

    // Canvas coords: right = +X, forward = -Y (up)
    const sx = cx + localX * scale;
    const sy = cy - localZ * scale;

    // Clip to radar circle
    const screenDist = Math.sqrt((sx - cx) * (sx - cx) + (sy - cy) * (sy - cy));
    if (screenDist > radius - 2) return;

    // Brightness based on sweep angle distance
    const blipAngle = Math.atan2(localX, localZ);
    let normBlipAngle = blipAngle < 0 ? blipAngle + Math.PI * 2 : blipAngle;
    let diff = sweepAngle - normBlipAngle;
    if (diff < 0) diff += Math.PI * 2;
    const brightness = diff < 0.3 ? 1.0 : Math.max(0.15, 1.0 - diff / (Math.PI * 1.8));

    // Category color
    const catColor = CATEGORY_COLORS[card.userData.category] || '#6666ff';
    const r = parseInt(catColor.slice(1, 3), 16);
    const g = parseInt(catColor.slice(3, 5), 16);
    const b = parseInt(catColor.slice(5, 7), 16);

    // Glow halo when bright
    if (brightness > 0.4) {
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(brightness * 0.25).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Blip dot
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Asteroid blips — grey triangles
  if (asteroids) {
    asteroids.meshes.forEach((mesh) => {
      const dx = mesh.position.x - shipGroup.position.x;
      const dz = mesh.position.z - shipGroup.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > radarRange) return;

      const localX = dx * cosY - dz * sinY;
      const localZ = dx * sinY + dz * cosY;
      const sx = cx + localX * scale;
      const sy = cy - localZ * scale;
      const screenDist = Math.sqrt((sx - cx) * (sx - cx) + (sy - cy) * (sy - cy));
      if (screenDist > radius - 2) return;

      const isClose = dist < 20;
      ctx.fillStyle = isClose ? 'rgba(255, 60, 60, 0.8)' : 'rgba(160, 160, 160, 0.5)';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 2.5);
      ctx.lineTo(sx - 2, sy + 1.5);
      ctx.lineTo(sx + 2, sy + 1.5);
      ctx.closePath();
      ctx.fill();
    });
  }

  // Nebula zones — faint colored circles
  if (nebulae) {
    nebulae.clouds.forEach((cloud) => {
      const dx = cloud.pos.x - shipGroup.position.x;
      const dz = cloud.pos.z - shipGroup.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > radarRange) return;

      const localX = dx * cosY - dz * sinY;
      const localZ = dx * sinY + dz * cosY;
      const sx = cx + localX * scale;
      const sy = cy - localZ * scale;

      const r = parseInt(cloud.color.getHexString().slice(0, 2), 16);
      const g = parseInt(cloud.color.getHexString().slice(2, 4), 16);
      const b = parseInt(cloud.color.getHexString().slice(4, 6), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
      ctx.beginPath();
      ctx.arc(sx, sy, cloud.baseScale * scale * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Black hole blip — pulsing purple gravity ring + dark center
  if (blackHole) {
    const dx = blackHole.group.position.x - shipGroup.position.x;
    const dz = blackHole.group.position.z - shipGroup.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < radarRange) {
      const localX = dx * cosY - dz * sinY;
      const localZ = dx * sinY + dz * cosY;
      const sx = cx + localX * scale;
      const sy = cy - localZ * scale;

      // Gravity range circle (pulsing purple)
      const gravRange = blackHole.gravityRadius * scale;
      const pulse = 0.3 + 0.15 * Math.sin(elapsed * 3);
      ctx.strokeStyle = `rgba(160, 60, 255, ${pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.min(gravRange, radius * 0.8), 0, Math.PI * 2);
      ctx.stroke();

      // Event horizon (dark center)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Purple rim glow
      ctx.fillStyle = 'rgba(160, 60, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Space whale blip — large cyan ellipse
  if (whale) {
    const dx = whale.group.position.x - shipGroup.position.x;
    const dz = whale.group.position.z - shipGroup.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < radarRange) {
      const localX = dx * cosY - dz * sinY;
      const localZ = dx * sinY + dz * cosY;
      const sx = cx + localX * scale;
      const sy = cy - localZ * scale;
      ctx.fillStyle = 'rgba(0, 255, 200, 0.6)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Comet blips — orange filled circles
  if (comets) {
    comets.forEach((c) => {
      if (!c.active) return;
      const dx = c.position.x - shipGroup.position.x;
      const dz = c.position.z - shipGroup.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > radarRange) return;
      const localX = dx * cosY - dz * sinY;
      const localZ = dx * sinY + dz * cosY;
      const sx = cx + localX * scale;
      const sy = cy - localZ * scale;
      const screenDist = Math.sqrt((sx - cx) * (sx - cx) + (sy - cy) * (sy - cy));
      if (screenDist > radius - 2) return;
      ctx.fillStyle = 'rgba(255, 140, 30, 0.9)';
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Ship indicator — green triangle pointing up (forward)
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx - 3.5, cy + 3);
  ctx.lineTo(cx + 3.5, cy + 3);
  ctx.closePath();
  ctx.fill();

  // Ship center glow
  ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring border
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Sound engine (Web Audio API — all procedural, no audio files)
// ---------------------------------------------------------------------------

function createSoundEngine() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);

    // Engine hum — two low-frequency oscillators
    const engineGainL = ctx.createGain();
    engineGainL.gain.value = 0;
    const panL = ctx.createStereoPanner();
    panL.pan.value = -0.6;
    const filterL = ctx.createBiquadFilter();
    filterL.type = 'lowpass';
    filterL.frequency.value = 200;
    const oscL = ctx.createOscillator();
    oscL.type = 'sawtooth';
    oscL.frequency.value = 60;
    oscL.connect(filterL);
    filterL.connect(engineGainL);
    engineGainL.connect(panL);
    panL.connect(masterGain);
    oscL.start();

    const engineGainR = ctx.createGain();
    engineGainR.gain.value = 0;
    const panR = ctx.createStereoPanner();
    panR.pan.value = 0.6;
    const filterR = ctx.createBiquadFilter();
    filterR.type = 'lowpass';
    filterR.frequency.value = 200;
    const oscR = ctx.createOscillator();
    oscR.type = 'sawtooth';
    oscR.frequency.value = 90;
    oscR.connect(filterR);
    filterR.connect(engineGainR);
    engineGainR.connect(panR);
    panR.connect(masterGain);
    oscR.start();

    return {
      ctx, masterGain,
      engines: { oscL, oscR, gainL: engineGainL, gainR: engineGainR },
    };
  } catch (e) {
    console.warn('Web Audio not available:', e);
    return null;
  }
}

function updateEngineSound(sound, physics, rgb) {
  if (!sound || sound.ctx.state !== 'running') return;
  const speedRatio = physics.speed / physics.maxSpeed;
  const vol = speedRatio * 0.15 * rgb;
  sound.engines.gainL.gain.value += (vol - sound.engines.gainL.gain.value) * 0.1;
  sound.engines.gainR.gain.value += (vol - sound.engines.gainR.gain.value) * 0.1;
  sound.engines.oscL.frequency.value = 60 * (1 + speedRatio * 0.5);
  sound.engines.oscR.frequency.value = 90 * (1 + speedRatio * 0.5);
  // Master gain scales with RGB
  sound.masterGain.gain.value = 0.1 + rgb * 0.4;
}

function triggerBoostSound(sound) {
  if (!sound || sound.ctx.state !== 'running') return;
  const ctx = sound.ctx;
  const bufferSize = ctx.sampleRate * 0.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  filter.Q.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sound.masterGain);
  noise.start();
  noise.stop(ctx.currentTime + 1.5);
}

function triggerRollSound(sound, direction) {
  if (!sound || sound.ctx.state !== 'running') return;
  const ctx = sound.ctx;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
  osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.6);
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(direction * -0.8, ctx.currentTime);
  pan.pan.linearRampToValueAtTime(direction * 0.8, ctx.currentTime + 0.6);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
  osc.connect(pan);
  pan.connect(gain);
  gain.connect(sound.masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.7);
}

function triggerFlipSound(sound) {
  if (!sound || sound.ctx.state !== 'running') return;
  const ctx = sound.ctx;
  // Low boom
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 40;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(sound.masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
  // Noise burst
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.15, ctx.currentTime);
  nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  noise.connect(nGain);
  nGain.connect(sound.masterGain);
  noise.start();
  noise.stop(ctx.currentTime + 0.3);
}

function triggerMissileSound(sound) {
  if (!sound || sound.ctx.state !== 'running') return;
  const ctx = sound.ctx;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(sound.masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
  // Noise overlay
  const bufferSize = ctx.sampleRate * 0.2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.1, ctx.currentTime);
  nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  noise.connect(nGain);
  nGain.connect(sound.masterGain);
  noise.start();
  noise.stop(ctx.currentTime + 0.2);
}

function triggerExplosionSound(sound) {
  if (!sound || sound.ctx.state !== 'running') return;
  const ctx = sound.ctx;
  // Deep boom
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 30;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.connect(gain);
  gain.connect(sound.masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.8);
  // Noise crash
  const bufferSize = ctx.sampleRate * 0.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 300;
  filter.Q.value = 0.3;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.3, ctx.currentTime);
  nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  noise.connect(filter);
  filter.connect(nGain);
  nGain.connect(sound.masterGain);
  noise.start();
  noise.stop(ctx.currentTime + 0.5);
}

function triggerLightningSound(sound) {
  if (!sound || sound.ctx.state !== 'running') return;
  const ctx = sound.ctx;
  const bufferSize = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sound.masterGain);
  noise.start();
  noise.stop(ctx.currentTime + 0.1);
}

function triggerDamageSound(sound) {
  if (!sound || sound.ctx.state !== 'running') return;
  const ctx = sound.ctx;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(sound.masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.25, ctx.currentTime);
  nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  noise.connect(nGain);
  nGain.connect(sound.masterGain);
  noise.start();
  noise.stop(ctx.currentTime + 0.15);
}

function triggerAchievementSound(sound) {
  if (!sound || sound.ctx.state !== 'running') return;
  const ctx = sound.ctx;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
    osc.connect(gain);
    gain.connect(sound.masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

function createBlackHoleDrone(sound) {
  if (!sound || !sound.ctx) return null;
  const ctx = sound.ctx;
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 30;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 31.5;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 80;
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(sound.masterGain);
  osc1.start();
  osc2.start();
  return { osc1, osc2, gain };
}

function updateBlackHoleDrone(drone, distance, gravityRadius, rgb) {
  if (!drone) return;
  const proximity = clamp01(1 - distance / gravityRadius);
  const targetVol = proximity * proximity * 0.15 * rgb;
  drone.gain.gain.value += (targetVol - drone.gain.gain.value) * 0.05;
  drone.osc1.frequency.value = 30 + proximity * 20;
  drone.osc2.frequency.value = 31.5 + proximity * 22;
}

// ---------------------------------------------------------------------------
// Space Whale / Leviathan
// ---------------------------------------------------------------------------

function createSpaceWhale(scene) {
  const group = new THREE.Group();

  const bodyGeo = new THREE.SphereGeometry(8, 32, 16);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x00cccc, emissive: 0x2244aa, emissiveIntensity: 0.5,
    transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.scale.set(1, 0.4, 0.6);
  group.add(bodyMesh);

  const tendrils = [];
  for (let t = 0; t < 6; t++) {
    const points = 20;
    const positions = new Float32Array(points * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x00ffcc, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    group.add(line);
    tendrils.push({ line, positions, pointCount: points, phaseOffset: t * 1.1 });
  }

  const trailCount = 100;
  const trailPos = new Float32Array(trailCount * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  const trailMat = new THREE.PointsMaterial({
    size: 0.8, color: 0x44ffcc, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const trailMesh = new THREE.Points(trailGeo, trailMat);
  scene.add(trailMesh);

  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 100 + Math.random() * 100;
  group.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));

  const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
  scene.add(group);

  return {
    group, bodyMesh, tendrils, dir, speed: 2 + Math.random(),
    trail: { mesh: trailMesh, positions: trailPos, count: trailCount, head: 0 },
    phase: Math.random() * Math.PI * 2,
  };
}

function updateSpaceWhale(whale, shipGroup, elapsed, delta, rgb) {
  const weave = new THREE.Vector3(
    Math.sin(elapsed * 0.3 + whale.phase) * 0.5,
    Math.sin(elapsed * 0.2 + whale.phase * 1.3) * 0.3, 0
  );
  whale.group.position.addScaledVector(whale.dir, whale.speed * delta);
  whale.group.position.addScaledVector(weave, delta);

  whale.bodyMesh.material.emissiveIntensity = 0.3 + 0.3 * Math.sin(elapsed * 0.8 + whale.phase);
  whale.bodyMesh.material.opacity = (0.5 + 0.2 * Math.sin(elapsed * 0.5)) * (0.5 + rgb * 0.5);

  whale.tendrils.forEach((t) => {
    for (let i = 0; i < t.pointCount; i++) {
      const frac = i / t.pointCount;
      t.positions[i * 3] = -frac * 12;
      t.positions[i * 3 + 1] = Math.sin(elapsed * 2 + i * 0.5 + t.phaseOffset) * frac * 3;
      t.positions[i * 3 + 2] = Math.cos(elapsed * 1.5 + i * 0.7 + t.phaseOffset) * frac * 2;
    }
    t.line.geometry.attributes.position.needsUpdate = true;
    t.line.material.opacity = 0.3 * (0.5 + rgb * 0.5);
  });

  const trail = whale.trail;
  trail.positions[trail.head * 3] = whale.group.position.x + (Math.random() - 0.5) * 2;
  trail.positions[trail.head * 3 + 1] = whale.group.position.y + (Math.random() - 0.5) * 1;
  trail.positions[trail.head * 3 + 2] = whale.group.position.z + (Math.random() - 0.5) * 2;
  trail.head = (trail.head + 1) % trail.count;
  trail.mesh.geometry.attributes.position.needsUpdate = true;
  trail.mesh.material.opacity = 0.2 * (0.3 + rgb * 0.7);

  if (whale.group.position.distanceTo(shipGroup.position) > 250) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 150 + Math.random() * 50;
    whale.group.position.set(
      shipGroup.position.x + r * Math.sin(phi) * Math.cos(theta),
      shipGroup.position.y + r * Math.sin(phi) * Math.sin(theta),
      shipGroup.position.z + r * Math.cos(phi)
    );
    whale.dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
  }

  const target = whale.group.position.clone().add(whale.dir);
  whale.group.lookAt(target);
}

function createWhaleSong(sound) {
  if (!sound || !sound.ctx) return null;
  const ctx = sound.ctx;
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine'; osc1.frequency.value = 40;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine'; osc2.frequency.value = 42;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass'; filter.frequency.value = 60; filter.Q.value = 2;
  osc1.connect(filter); osc2.connect(filter);
  filter.connect(gain); gain.connect(sound.masterGain);
  osc1.start(); osc2.start();
  return { osc1, osc2, gain };
}

function updateWhaleSong(song, distance, maxRange, rgb) {
  if (!song) return;
  const proximity = clamp01(1 - distance / maxRange);
  const vol = proximity * proximity * 0.1 * rgb;
  song.gain.gain.value += (vol - song.gain.gain.value) * 0.05;
  song.osc1.frequency.value = 40 + proximity * 5;
  song.osc2.frequency.value = 42 + proximity * 6;
}

// ---------------------------------------------------------------------------
// Comet Storms
// ---------------------------------------------------------------------------

function createCometPool(scene) {
  const count = 12;
  const comets = [];
  for (let i = 0; i < count; i++) {
    const size = 0.5 + Math.random() * 1.0;
    const geo = new THREE.IcosahedronGeometry(size, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 0.8,
      transparent: true, opacity: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.userData.size = size;
    scene.add(mesh);

    const trailCount = 40;
    const tPos = new Float32Array(trailCount * 3);
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
    const tMat = new THREE.PointsMaterial({
      size: 0.5, color: 0xffaa22, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    const tMesh = new THREE.Points(tGeo, tMat);
    scene.add(tMesh);

    comets.push({
      mesh, trail: { mesh: tMesh, positions: tPos, count: trailCount, head: 0 },
      position: new THREE.Vector3(), velocity: new THREE.Vector3(),
      active: false, lifetime: 0, size,
    });
  }
  return comets;
}

function updateCometStorm(state, comets, shipGroup, asteroids, elements, elapsed, delta, rgb) {
  const storm = state.cometStorm;

  if (!storm.active) {
    storm.timer -= delta;
    if (storm.timer <= 0) {
      storm.active = true;
      storm.stormDuration = 8;
      storm.spawnTimer = 0;
      storm.noDamageDuringStorm = true;
      showActionText('WARNING: INCOMING!');
      triggerCometWarning(elements.sound);
    }
  } else {
    storm.stormDuration -= delta;
    storm.spawnTimer -= delta;

    if (storm.spawnTimer <= 0 && storm.stormDuration > 0) {
      for (let i = 0; i < comets.length; i++) {
        if (!comets[i].active) {
          const c = comets[i];
          c.active = true;
          c.lifetime = 3;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = 60 + Math.random() * 40;
          c.position.set(
            shipGroup.position.x + r * Math.sin(phi) * Math.cos(theta),
            shipGroup.position.y + r * Math.sin(phi) * Math.sin(theta),
            shipGroup.position.z + r * Math.cos(phi)
          );
          c.velocity.copy(shipGroup.position).sub(c.position).normalize();
          c.velocity.x += (Math.random() - 0.5) * 0.3;
          c.velocity.y += (Math.random() - 0.5) * 0.3;
          c.velocity.z += (Math.random() - 0.5) * 0.3;
          c.velocity.normalize().multiplyScalar(30 + Math.random() * 20);
          c.mesh.visible = true;
          c.mesh.material.opacity = 1;
          break;
        }
      }
      storm.spawnTimer = 0.3 + Math.random() * 0.2;
    }

    if (storm.stormDuration <= 0) {
      storm.active = false;
      storm.timer = 45 + Math.random() * 15;
      if (storm.noDamageDuringStorm) {
        state.achievements.stats.stormsSurvivedClean = (state.achievements.stats.stormsSurvivedClean || 0) + 1;
      }
    }
  }

  for (let i = 0; i < comets.length; i++) {
    const c = comets[i];
    if (!c.active) continue;
    c.lifetime -= delta;
    c.position.addScaledVector(c.velocity, delta);
    c.mesh.position.copy(c.position);
    c.mesh.rotation.x += delta * 3;
    c.mesh.rotation.y += delta * 2;

    const t = c.trail;
    t.positions[t.head * 3] = c.position.x;
    t.positions[t.head * 3 + 1] = c.position.y;
    t.positions[t.head * 3 + 2] = c.position.z;
    t.head = (t.head + 1) % t.count;
    t.mesh.geometry.attributes.position.needsUpdate = true;

    if (c.position.distanceTo(shipGroup.position) < c.size + 2 && !state.health.invincible && !state.health.dead) {
      const damage = 15 + c.size * 3;
      state.health.current = Math.max(0, state.health.current - damage);
      state.health.crackIntensity = clamp01(state.health.crackIntensity + damage / 100);
      state.health.lastDamageTime = elapsed;
      state.achievements.stats.timeSinceLastDamage = 0;
      storm.noDamageDuringStorm = false;
      state.explosionShake = 0.8;
      triggerExplosion(elements.explosions, c.position.clone(), rgb);
      triggerShockwave(elements.shockwaves, c.position.clone(), elapsed);
      triggerDamageSound(elements.sound);
      showActionText('COMET IMPACT!');
      c.active = false; c.mesh.visible = false; c.mesh.material.opacity = 0;
      c.trail.positions.fill(0); c.trail.mesh.geometry.attributes.position.needsUpdate = true;
      if (state.health.current <= 0) triggerShipDeath(state, elements, shipGroup, elapsed);
      continue;
    }

    if (asteroids) {
      let cometDestroyed = false;
      for (let a = 0; a < asteroids.meshes.length; a++) {
        const am = asteroids.meshes[a];
        const hitDist = (am.userData.size || 1) + c.size;
        if (am.position.distanceTo(c.position) < hitDist) {
          triggerExplosion(elements.explosions, c.position.clone(), rgb);
          triggerShockwave(elements.shockwaves, c.position.clone(), elapsed);
          triggerExplosionSound(elements.sound);
          const theta2 = Math.random() * Math.PI * 2;
          const phi2 = Math.acos(2 * Math.random() - 1);
          const r2 = 80 + Math.random() * 70;
          am.position.set(
            shipGroup.position.x + r2 * Math.sin(phi2) * Math.cos(theta2),
            shipGroup.position.y + r2 * Math.sin(phi2) * Math.sin(theta2),
            shipGroup.position.z + r2 * Math.cos(phi2)
          );
          c.active = false; c.mesh.visible = false; c.mesh.material.opacity = 0;
          c.trail.positions.fill(0); c.trail.mesh.geometry.attributes.position.needsUpdate = true;
          state.achievements.stats.cometsDestroyed = (state.achievements.stats.cometsDestroyed || 0) + 1;
          cometDestroyed = true;
          break;
        }
      }
      if (cometDestroyed) continue;
    }

    if (c.lifetime <= 0) {
      c.active = false; c.mesh.visible = false; c.mesh.material.opacity = 0;
      c.trail.positions.fill(0); c.trail.mesh.geometry.attributes.position.needsUpdate = true;
    }
  }
}

function triggerCometWarning(sound) {
  if (!sound || sound.ctx.state !== 'running') return;
  const ctx = sound.ctx;
  for (let i = 0; i < 3; i++) {
    const start = ctx.currentTime + i * 0.6;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1000, start);
    osc.frequency.exponentialRampToValueAtTime(200, start + 0.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
    osc.connect(gain); gain.connect(sound.masterGain);
    osc.start(start); osc.stop(start + 0.5);
  }
}

// ---------------------------------------------------------------------------
// EMP Blast / Superweapon
// ---------------------------------------------------------------------------

function createEMPMesh(scene, shipGroup) {
  const blastGeo = new THREE.SphereGeometry(1, 32, 16);
  const blastMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const blastMesh = new THREE.Mesh(blastGeo, blastMat);
  blastMesh.visible = false;
  scene.add(blastMesh);

  const chargeGeo = new THREE.TorusGeometry(3, 0.1, 8, 32);
  const chargeMat = new THREE.MeshBasicMaterial({
    color: 0x44ccff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const chargeMesh = new THREE.Mesh(chargeGeo, chargeMat);
  shipGroup.add(chargeMesh);

  return { blastMesh, chargeMesh };
}

function updateEMPBlast(state, input, elements, shipGroup, asteroids, comets, elapsed, delta, rgb, camera) {
  const emp = state.emp;

  if (emp.cooldown > 0) emp.cooldown = Math.max(0, emp.cooldown - delta);
  if (emp.timeScale < 1.0) emp.timeScale = Math.min(1.0, emp.timeScale + delta * 2);

  if (emp.blastActive) {
    emp.blastRadius += delta * 80;
    const empMesh = elements.empMeshes.blastMesh;
    empMesh.scale.setScalar(emp.blastRadius);
    empMesh.material.opacity = clamp01(0.5 * (1 - emp.blastRadius / emp.blastMaxRadius)) * rgb;
    empMesh.material.color.setHSL((elapsed * 2) % 1, 0.5, 0.8);
    if (emp.blastRadius >= emp.blastMaxRadius) {
      emp.blastActive = false;
      empMesh.visible = false;
      empMesh.material.opacity = 0;
    }
    return;
  }

  if (!input.empCharge || emp.cooldown > 0 || state.health.dead) {
    if (emp.chargeTime >= 1.0 && !input.empCharge) {
      // Fire EMP on release
      const effectiveRadius = emp.blastMaxRadius * clamp01(emp.chargeTime / emp.maxCharge);
      emp.blastActive = true;
      emp.blastRadius = 0;
      emp.cooldown = emp.cooldownTime;
      emp.timeScale = 0.3;

      elements.empMeshes.blastMesh.visible = true;
      elements.empMeshes.blastMesh.position.copy(shipGroup.position);
      elements.empMeshes.chargeMesh.material.opacity = 0;
      elements.empMeshes.chargeMesh.scale.setScalar(1);

      triggerBoostFlash(elements.boostFlash);
      triggerEMPSound(elements.sound);

      let destroyCount = 0;
      let shockCount = 0;
      if (asteroids) {
        asteroids.meshes.forEach((m) => {
          if (m.position.distanceTo(shipGroup.position) < effectiveRadius) {
            triggerExplosion(elements.explosions, m.position.clone(), rgb);
            if (shockCount < 3) { triggerShockwave(elements.shockwaves, m.position.clone(), elapsed); shockCount++; }
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 80 + Math.random() * 70;
            m.position.set(
              shipGroup.position.x + r * Math.sin(phi) * Math.cos(theta),
              shipGroup.position.y + r * Math.sin(phi) * Math.sin(theta),
              shipGroup.position.z + r * Math.cos(phi)
            );
            destroyCount++;
          }
        });
      }
      if (comets) {
        comets.forEach((c) => {
          if (c.active && c.position.distanceTo(shipGroup.position) < effectiveRadius) {
            triggerExplosion(elements.explosions, c.position.clone(), rgb);
            c.active = false; c.mesh.visible = false;
            c.trail.positions.fill(0); c.trail.mesh.geometry.attributes.position.needsUpdate = true;
            destroyCount++;
            state.achievements.stats.cometsDestroyed = (state.achievements.stats.cometsDestroyed || 0) + 1;
          }
        });
      }

      state.achievements.stats.kills += destroyCount;
      state.achievements.stats.empBlasts = (state.achievements.stats.empBlasts || 0) + 1;
      state.achievements.stats.maxEMPKills = Math.max(state.achievements.stats.maxEMPKills || 0, destroyCount);
      if (destroyCount > 0) {
        showActionText('EMP: ' + destroyCount + ' DESTROYED!');
      } else {
        showActionText('EMP BLAST!');
      }
      state.explosionShake = 1.5;
    }
    emp.chargeTime = 0;
    emp.charging = false;
    elements.empMeshes.chargeMesh.material.opacity = 0;
    elements.empMeshes.chargeMesh.scale.setScalar(1);
    return;
  }

  emp.charging = true;
  emp.chargeTime = Math.min(emp.maxCharge, emp.chargeTime + delta);
  const chargePct = emp.chargeTime / emp.maxCharge;
  elements.empMeshes.chargeMesh.material.opacity = chargePct * 0.5 * rgb;
  elements.empMeshes.chargeMesh.scale.setScalar(1 + chargePct * 2);
  elements.empMeshes.chargeMesh.rotation.z += delta * (2 + chargePct * 8);

  if (emp.chargeTime >= 1.0) {
    showActionText('EMP CHARGED ' + Math.floor(chargePct * 100) + '%');
  }
}

function triggerEMPSound(sound) {
  if (!sound || sound.ctx.state !== 'running') return;
  const ctx = sound.ctx;
  const bass = ctx.createOscillator();
  bass.type = 'sine'; bass.frequency.value = 30;
  const bassGain = ctx.createGain();
  bassGain.gain.setValueAtTime(0.3, ctx.currentTime);
  bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
  bass.connect(bassGain); bassGain.connect(sound.masterGain);
  bass.start(); bass.stop(ctx.currentTime + 2.0);

  const bufferSize = ctx.sampleRate * 0.8;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 0.5;
  noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(sound.masterGain);
  noise.start(); noise.stop(ctx.currentTime + 1.5);
}

// ---------------------------------------------------------------------------
// Hyperspace Jump
// ---------------------------------------------------------------------------

function updateHyperspaceCharge(state, input, shipGroup, physics, elements, elapsed, delta, rgb, camera) {
  const hs = state.hyperspace;

  if (hs.cooldown > 0) hs.cooldown = Math.max(0, hs.cooldown - delta);

  if (hs.jumping) {
    hs.jumpTimer -= delta;
    if (elements.bloomPass) {
      elements.bloomPass.strength += (0.15 - elements.bloomPass.strength) * delta * 2;
    }
    const shake = 0.2 * clamp01(hs.jumpTimer / hs.jumpDuration);
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    if (hs.jumpTimer <= 0) hs.jumping = false;
    return;
  }

  if (!input.chargeJump || hs.cooldown > 0) {
    if (hs.chargeTime > 0) {
      hs.chargeTime = 0;
      hs.charging = false;
    }
    return;
  }

  hs.charging = true;
  hs.chargeTime += delta;
  const pct = Math.floor((hs.chargeTime / hs.maxCharge) * 100);
  showActionText('CHARGING ' + Math.min(pct, 100) + '%...');

  const vibration = 0.03 * (hs.chargeTime / hs.maxCharge);
  camera.position.x += (Math.random() - 0.5) * vibration;
  camera.position.y += (Math.random() - 0.5) * vibration;

  if (elements.chromaPass) {
    elements.chromaPass.uniforms.amount.value += (hs.chargeTime / hs.maxCharge) * 0.01;
  }

  if (hs.chargeTime >= hs.maxCharge) {
    triggerHyperspaceJump(state, shipGroup, physics, elements, elapsed, camera);
  }
}

function triggerHyperspaceJump(state, shipGroup, physics, elements, elapsed, camera) {
  const hs = state.hyperspace;
  hs.jumping = true;
  hs.jumpTimer = hs.jumpDuration;
  hs.charging = false;
  hs.chargeTime = 0;
  hs.cooldown = hs.cooldownTime;

  if (elements.bloomPass) elements.bloomPass.strength = 3.0;

  triggerShockwave(elements.shockwaves, shipGroup.position.clone(), elapsed);

  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 300 + Math.random() * 200;
  shipGroup.position.set(
    shipGroup.position.x + r * Math.sin(phi) * Math.cos(theta),
    shipGroup.position.y + r * Math.sin(phi) * Math.sin(theta),
    shipGroup.position.z + r * Math.cos(phi)
  );

  physics.velocity.set(0, 0, 0);
  physics.speed = 0;

  triggerShockwave(elements.shockwaves, shipGroup.position.clone(), elapsed);
  triggerBoostFlash(elements.boostFlash);
  triggerJumpSound(elements.sound);

  showActionText('HYPERSPACE JUMP!');
  state.achievements.stats.hyperspaceJumps = (state.achievements.stats.hyperspaceJumps || 0) + 1;
}

function triggerJumpSound(sound) {
  if (!sound || sound.ctx.state !== 'running') return;
  const ctx = sound.ctx;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 2.0);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 3000;
  osc.connect(filter); filter.connect(gain); gain.connect(sound.masterGain);
  osc.start(); osc.stop(ctx.currentTime + 3.0);

  const bass = ctx.createOscillator();
  bass.type = 'sine'; bass.frequency.value = 40;
  const bassGain = ctx.createGain();
  bassGain.gain.setValueAtTime(0, ctx.currentTime + 2.0);
  bassGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2.05);
  bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.5);
  bass.connect(bassGain); bassGain.connect(sound.masterGain);
  bass.start(); bass.stop(ctx.currentTime + 3.5);
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

function showFlightHUD() {
  const hud = document.getElementById('flight-hud');
  if (hud) {
    hud.style.display = 'block';
    setTimeout(() => { hud.style.opacity = '0'; }, 8000);
    setTimeout(() => { hud.style.display = 'none'; }, 10000);
  }
  const speedHud = document.getElementById('speed-hud');
  if (speedHud) speedHud.style.display = 'block';
  const minimap = document.getElementById('minimap');
  if (minimap) minimap.style.display = 'block';
  const rgbHud = document.getElementById('rgb-slider-hud');
  if (rgbHud) rgbHud.style.display = 'block';
  const healthHud = document.getElementById('health-bar-hud');
  if (healthHud) healthHud.style.display = 'block';
  const achContainer = document.getElementById('achievement-container');
  if (achContainer) achContainer.style.display = 'block';
  const jumpHud = document.getElementById('jump-cooldown-hud');
  if (jumpHud) jumpHud.style.display = 'block';
  const empHud = document.getElementById('emp-cooldown-hud');
  if (empHud) empHud.style.display = 'block';
}

// ---------------------------------------------------------------------------
// Main animation loop
// ---------------------------------------------------------------------------

function startAnimationLoop(renderFn, elements, camera, shipGroup, physics, input, state, lights, rgbState) {
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // ---- Intro sequence (first ~5 seconds) ----
    if (state.introActive) {
      const t = (performance.now() - state.introStart) / 1000;

      // Stars rotate slowly during intro
      elements.stars.rotation.y += delta * 0.008;
      elements.stars.rotation.x += delta * 0.003;

      // Ambient particles drift during intro
      const pos = elements.ambient.positions;
      const vel = elements.ambient.velocities;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] += vel[i];
        pos[i + 1] += vel[i + 1];
        pos[i + 2] += vel[i + 2];
        if (Math.abs(pos[i]) > 30) pos[i] *= -0.95;
        if (Math.abs(pos[i + 1]) > 20) pos[i + 1] *= -0.95;
        if (Math.abs(pos[i + 2]) > 30) pos[i + 2] *= -0.95;
      }
      elements.ambient.mesh.geometry.attributes.position.needsUpdate = true;

      // Book cards fade in
      if (t > 0.5) {
        const p = clamp01((t - 0.5) / 2.5);
        elements.bookGroup.children.forEach((card) => {
          card.material.opacity = p * 0.85;
        });
      }

      // End intro
      if (t > 5) {
        state.introActive = false;
        input.active = true;
        showFlightHUD();
      }
    }

    // RGB intensity (0.0 = calm, 1.0 = maximum overkill)
    const rgb = rgbState.intensity;

    // ---- Flight mode ----
    if (input.active) {
      // Barrel roll detection (double-tap A/D)
      if (input.leftTapped) {
        input.leftTapped = false;
        const now = performance.now();
        if (now - input.lastLeftTap < 250 && !state.barrelRoll.active && !state.flip.active) {
          triggerBarrelRoll(state, 1, elapsed, physics, shipGroup);
          triggerRollSound(elements.sound, 1);
        }
        input.lastLeftTap = now;
      }
      if (input.rightTapped) {
        input.rightTapped = false;
        const now = performance.now();
        if (now - input.lastRightTap < 250 && !state.barrelRoll.active && !state.flip.active) {
          triggerBarrelRoll(state, -1, elapsed, physics, shipGroup);
          triggerRollSound(elements.sound, -1);
        }
        input.lastRightTap = now;
      }

      // Flip detection (Q key)
      if (input.flipRequested) {
        input.flipRequested = false;
        if (!state.flip.active && !state.barrelRoll.active) {
          triggerFlip(state, shipGroup, elapsed);
          triggerFlipSound(elements.sound);
        }
      }

      // Missile fire (F key)
      if (input.fireRequested) {
        input.fireRequested = false;
        fireMissile(elements.missiles, shipGroup, physics, elements.asteroids);
        triggerMissileSound(elements.sound);
      }

      // Suppress turning during roll/flip
      const savedLeft = input.left, savedRight = input.right;
      const savedFwd = input.forward, savedBwd = input.backward;
      if (state.barrelRoll.active) { input.left = false; input.right = false; }
      if (state.flip.active) { input.left = false; input.right = false; input.forward = false; input.backward = false; }

      updateShipPhysics(shipGroup, physics, input, delta);
      input.left = savedLeft; input.right = savedRight;
      input.forward = savedFwd; input.backward = savedBwd;

      updateChaseCamera(camera, shipGroup, physics, input, delta);

      // Barrel roll animation (overrides rotation.z after physics bank)
      updateBarrelRoll(state, shipGroup, elapsed);

      // Flip animation (overrides rotation.y, camera pull-back)
      updateFlip(state, shipGroup, camera, elements, elapsed);
      if (state.flip.cameraOffset) {
        const back = new THREE.Vector3(0, 0, 1).applyQuaternion(shipGroup.quaternion);
        camera.position.addScaledVector(back, state.flip.cameraOffset);
      }

      // Screen shake on boost
      if (input.boost) {
        const shake = 0.05 * (physics.speed / physics.maxSpeed);
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        camera.position.z += (Math.random() - 0.5) * shake;
      }

      // Warp tunnel (after screen shake, before FOV)
      updateWarpTunnel(elements.warpTunnel, camera, shipGroup, physics, input, elapsed, delta, elements.bloomPass);
      // Scale warp tunnel ring opacity by RGB
      elements.warpTunnel.rings.forEach((ring) => {
        ring.material.opacity *= (0.5 + rgb * 1.0);
      });

      // Bloom strength scaled by RGB
      if (elements.bloomPass) {
        elements.bloomPass.strength = 0.05 + rgb * 0.45;
      }

      // FOV warp effect
      const targetFov = 60 + (physics.speed / physics.maxSpeed) * 15 + (input.boost ? 10 : 0);
      camera.fov += (targetFov - camera.fov) * 0.05;
      camera.updateProjectionMatrix();

      // Chromatic aberration — scales with speed and RGB
      if (elements.chromaPass) {
        elements.chromaPass.uniforms.amount.value = (physics.speed / physics.maxSpeed) * 0.008 * rgb;
      }

      // Motion blur — only during boost, scales with RGB
      if (elements.motionBlurPass) {
        const blurStrength = input.boost ? 0.003 * rgb : 0;
        elements.motionBlurPass.uniforms.strength.value = blurStrength;
        if (blurStrength > 0) {
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);
          fwd.project(camera);
          elements.motionBlurPass.uniforms.direction.value.set(fwd.x, fwd.y).normalize();
        }
      }

      // Thruster particles (world space)
      updateThrusterParticles(elements.thruster, shipGroup, physics, input, delta);
      elements.thruster.mesh.material.opacity = (input.forward || input.boost || physics.speed > physics.baseSpeed * 1.5 ? 0.5 : 0.15) * (0.3 + rgb * 0.7);

      // Engine glow intensity (scaled by RGB)
      const thrustActive = input.forward || input.boost || physics.speed > physics.baseSpeed * 1.5;
      const glowScale = 0.5 + rgb * 0.8;
      const targetGlow = (input.boost ? 300 : (thrustActive ? 150 : 0)) * glowScale;
      elements.engineGlowL.intensity += (targetGlow - elements.engineGlowL.intensity) * 0.1;
      elements.engineGlowR.intensity += (targetGlow - elements.engineGlowR.intensity) * 0.1;

      // Lights follow ship
      const sp = shipGroup.position;
      lights.key.position.set(sp.x + 10, sp.y + 10, sp.z + 10);
      lights.fill.position.set(sp.x - 10, sp.y - 5, sp.z + 5);
      lights.rim.position.set(sp.x, sp.y + 5, sp.z - 15);

      // Wrap space objects
      wrapStarfield(elements.stars, sp);
      wrapAmbientParticles(elements.ambient, sp);
      wrapBooks(elements.bookGroup, sp);

      // Wrap + update asteroids and nebulae
      wrapAsteroids(elements.asteroids, sp);
      updateAsteroidProximity(elements.asteroids, shipGroup);
      updateNebulaClouds(elements.nebulae, shipGroup, physics, elapsed, delta);

      // Nebula opacity scaled by RGB
      elements.nebulae.clouds.forEach((c) => {
        c.sprites.forEach((s, j) => {
          s.material.opacity = c.baseOpacities[j] * (0.5 + rgb * 1.5);
        });
      });

      // RGB + hue (used by title and shield)
      const speedBoost = 1 + (physics.speed / physics.maxSpeed) * 0.5;
      const hue = (elapsed * 0.3 * speedBoost * Math.max(rgb, 0.01)) % 1;
      const sat = 0.2 + rgb * 0.7;

      if (elements.titleMesh) {
        elements.titleMesh.material.color.setHSL(hue, sat, 0.25 + rgb * 0.15);
        elements.titleMesh.material.emissive.setHSL(hue, sat, 0.04 + rgb * 0.12);
      }

      // Ship shield (pass rgb for opacity scaling)
      if (input.boost && !state.prevBoost) elements.shield.rippleTime = elapsed;
      updateShipShield(elements.shield, physics, input, elapsed, delta, hue, elements.asteroids, shipGroup, rgb);

      // Speed lines (hyperspace streaks)
      updateSpeedLines(elements.speedLines, camera, shipGroup, physics, elapsed);
      elements.speedLines.mesh.material.opacity *= (0.5 + rgb * 0.5);
      // At high RGB, tint speed lines rainbow
      if (rgb > 0.6) {
        const slHue = (elapsed * 0.8) % 1;
        elements.speedLines.mesh.material.color.setHSL(slHue, rgb, 0.7);
      } else {
        elements.speedLines.mesh.material.color.setHex(0xaaccff);
      }

      // Boost flash + sound (triggers on boost start)
      if (input.boost && !state.prevBoost) {
        triggerBoostFlash(elements.boostFlash);
        triggerBoostSound(elements.sound);
      }
      state.prevBoost = input.boost;
      updateBoostFlash(elements.boostFlash, delta);
      // Scale boost flash by RGB
      if (elements.boostFlash.active) {
        elements.boostFlash.mesh.material.opacity *= (0.3 + rgb * 0.7);
      }

      // Rainbow trail behind ship (opacity and speed scaled by RGB)
      elements.rainbowTrail.mesh.material.opacity = 0.1 + rgb * 0.5;
      updateRainbowTrail(elements.rainbowTrail, shipGroup, elapsed, rgb);

      // Contrail trails (brightness scaled by RGB)
      updateContrail(elements.contrailL, shipGroup, physics, elements.nebulae, delta, rgb);
      updateContrail(elements.contrailR, shipGroup, physics, elements.nebulae, delta, rgb);

      // Sonic boom — speed threshold
      if (physics.speed > physics.maxSpeed * 0.8 && !state.sonicBoomFired) {
        state.sonicBoomFired = true;
        triggerShockwave(elements.shockwaves, shipGroup.position.clone(), elapsed);
        triggerExplosionSound(elements.sound);
        showActionText('SONIC BOOM!');
        state.achievements.stats.sonicBooms++;
      }
      if (physics.speed < physics.maxSpeed * 0.6) state.sonicBoomFired = false;

      // Shockwave on barrel roll completion
      if (state.prevRollActive && !state.barrelRoll.active) {
        triggerShockwave(elements.shockwaves, shipGroup.position.clone(), elapsed);
        state.achievements.stats.barrelRolls++;
        state.achievements.stats.maxCombo = Math.max(state.achievements.stats.maxCombo, state.barrelRoll.comboCount);
      }
      state.prevRollActive = state.barrelRoll.active;

      // Shockwave on flip completion
      if (state.prevFlipActive && !state.flip.active) {
        triggerShockwave(elements.shockwaves, shipGroup.position.clone(), elapsed);
        state.achievements.stats.flips++;
      }
      state.prevFlipActive = state.flip.active;

      // Update shockwaves
      updateShockwaves(elements.shockwaves, elapsed, rgb);

      // Missiles + explosions
      const prevExplosionActive = elements.explosions.instances.map(i => i.active);
      const missileKills = updateMissiles(elements.missiles, elements.asteroids, shipGroup, elapsed, delta, elements.shockwaves, elements.explosions, rgb, elements.comets);
      state.achievements.stats.kills += missileKills;
      // Detect new explosions for screen shake + boost flash + sound
      elements.explosions.instances.forEach((inst, idx) => {
        if (inst.active && !prevExplosionActive[idx]) {
          state.explosionShake = 1;
          triggerBoostFlash(elements.boostFlash);
          triggerExplosionSound(elements.sound);
        }
      });
      updateExplosions(elements.explosions, delta);

      // Explosion screen shake
      if (state.explosionShake > 0) {
        const shake = 0.15 * state.explosionShake * rgb;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        state.explosionShake -= delta * 2;
      }

      // Lightning arcs
      state.lightning.timer -= delta;
      if (state.lightning.timer <= 0) {
        const chance = 0.4 + rgb * 0.4;
        if (Math.random() < chance) {
          triggerLightningArc(elements.lightning, shipGroup, elements.asteroids, elements.nebulae, rgb);
          triggerLightningSound(elements.sound);
        }
        state.lightning.timer = 0.3 + Math.random() * 0.7;
      }
      updateLightningArcs(elements.lightning, delta, rgb);

      // Black hole
      updateBlackHole(elements.blackHole, shipGroup, physics, elements.asteroids, camera, elapsed, delta, rgb, elements.lensingPass);
      const bhDist = shipGroup.position.distanceTo(elements.blackHole.group.position);
      updateBlackHoleDrone(elements.drone, bhDist, elements.blackHole.gravityRadius, rgb);

      // Space whale
      updateSpaceWhale(elements.whale, shipGroup, elapsed, delta, rgb);
      const whaleDist = shipGroup.position.distanceTo(elements.whale.group.position);
      updateWhaleSong(elements.whaleSong, whaleDist, 80, rgb);
      if (whaleDist < 10) state.achievements.stats.whaleProximity = true;

      // Comet storms
      updateCometStorm(state, elements.comets, shipGroup, elements.asteroids, elements, elapsed, delta, rgb);

      // EMP blast
      updateEMPBlast(state, input, elements, shipGroup, elements.asteroids, elements.comets, elapsed, delta, rgb, camera);

      // Hyperspace jump
      updateHyperspaceCharge(state, input, shipGroup, physics, elements, elapsed, delta, rgb, camera);

      // Collision & health
      checkShipCollisions(elements.asteroids, shipGroup, state, elements, elapsed, rgb);
      updateHealthSystem(state, elements, elapsed, delta, shipGroup, physics);

      // Achievement tracking
      if (state.prevShipPosition) {
        state.achievements.stats.distanceTraveled += shipGroup.position.distanceTo(state.prevShipPosition);
      }
      state.prevShipPosition = shipGroup.position.clone();
      updateAchievementStats(state, physics, delta);
      checkAchievements(state);
      updateAchievementPopups(state, elements, delta);

      // Speed HUD
      const speedHud = document.getElementById('speed-hud');
      if (speedHud) speedHud.textContent = 'SPEED: ' + Math.round(physics.speed);

      // Cooldown HUDs
      const jumpHud = document.getElementById('jump-cooldown-hud');
      if (jumpHud) {
        jumpHud.textContent = state.hyperspace.cooldown > 0 ? 'JUMP: ' + Math.ceil(state.hyperspace.cooldown) + 's' : 'JUMP READY';
        jumpHud.style.color = state.hyperspace.cooldown > 0 ? 'rgba(100,100,100,0.6)' : 'rgba(0,200,255,0.8)';
      }
      const empHud = document.getElementById('emp-cooldown-hud');
      if (empHud) {
        empHud.textContent = state.emp.cooldown > 0 ? 'EMP: ' + Math.ceil(state.emp.cooldown) + 's' : 'EMP READY';
        empHud.style.color = state.emp.cooldown > 0 ? 'rgba(100,100,100,0.6)' : 'rgba(255,100,255,0.8)';
      }

      // Engine sound update
      updateEngineSound(elements.sound, physics, rgb);

      // Minimap (update every 2nd frame for performance)
      if (elements.minimapCtx && ++state.minimapFrame % 2 === 0) {
        updateMinimap(elements.minimapCtx, shipGroup, elements.bookGroup, elements.asteroids, elements.nebulae, elements.blackHole, elements.whale, elements.comets, elapsed);
      }
    }

    // ---- Always-on animations ----

    // Title wobble (local to ship)
    if (elements.titleMesh) {
      elements.titleMesh.position.y = Math.sin(elapsed * 0.5) * 0.15;
      elements.titleMesh.rotation.y = Math.sin(elapsed * 0.3) * 0.04;
    }

    // Tag breathing
    if (elements.tagMeshes.length > 0) {
      elements.tagMeshes.forEach((m, i) => {
        m.material.emissiveIntensity = 0.3 + Math.sin(elapsed * 0.8 + i * Math.PI) * 0.15;
      });
    }

    // Flip burst particles
    updateFlipBurst(elements.flipBurst, delta);

    // Asteroid tumble rotation
    elements.asteroids.meshes.forEach((m, i) => {
      const rs = elements.asteroids.rotationSpeeds;
      m.rotation.x += rs[i * 3] * delta;
      m.rotation.y += rs[i * 3 + 1] * delta;
      m.rotation.z += rs[i * 3 + 2] * delta;
    });

    // Nebula gentle pulse during intro
    if (state.introActive) {
      elements.nebulae.clouds.forEach((c, i) => {
        const scales = [1.0, 0.8, 0.6];
        c.sprites.forEach((s, j) => {
          s.scale.setScalar(c.baseScale * scales[j] * (1 + 0.03 * Math.sin(elapsed * 0.2 + i)));
        });
      });
    }

    // Book float
    elements.bookGroup.children.forEach((card) => {
      const d = card.userData;
      if (d.yBase !== undefined) {
        card.position.y = d.yBase + Math.sin(elapsed * d.floatSpeed) * d.floatAmp;
      }
    });

    renderFn();
  }

  animate();
}

// ---------------------------------------------------------------------------
// Resize handler
// ---------------------------------------------------------------------------

function setupResize(camera, renderer, composer, bloomPass) {
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
    if (bloomPass) bloomPass.resolution.set(w, h);
  });
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutBack(t) {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function easeOutElastic(t) {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
}
