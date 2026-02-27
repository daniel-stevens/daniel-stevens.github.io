import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

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
      if (el.id !== 'threejs-canvas' && el.id !== 'flight-hud' && el.id !== 'speed-hud' && el.id !== 'minimap' && el.id !== 'action-text' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
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
    flipRequested: false,
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
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    input.forward = false; break;
      case 'KeyS': case 'ArrowDown':  input.backward = false; break;
      case 'KeyA': case 'ArrowLeft':  input.left = false; break;
      case 'KeyD': case 'ArrowRight': input.right = false; break;
      case 'Space': input.boost = false; break;
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

  const elements = {
    stars, ambient, titleMesh: null, tagMeshes: [], linkMeshes: [],
    bookGroup, thruster, engineGlowL, engineGlowR,
    speedLines, boostFlash, rainbowTrail, minimapCtx, flipBurst,
    asteroids, nebulae, shield, contrailL, contrailR, warpTunnel,
    bloomPass: null,
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
    composer.addPass(new OutputPass());
    renderFn = () => composer.render();
  } catch (e) {
    console.warn('Post-processing failed, using basic renderer:', e);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderFn = () => renderer.render(scene, camera);
  }

  elements.bloomPass = bloomPass;

  // Input + Physics
  const input = createInputState(canvas);
  const physics = createShipPhysics();

  // Animation loop
  const state = {
    introActive: true, introStart: performance.now(), hudShown: false, prevBoost: false, minimapFrame: 0,
    barrelRoll: { active: false, direction: 1, startTime: 0, duration: 0.6, comboCount: 0, lastRollEnd: 0 },
    flip: { active: false, startTime: 0, startRotY: 0, duration: 0.8, cameraOffset: 0 },
  };
  startAnimationLoop(renderFn, elements, camera, shipGroup, physics, input, state, lights);
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

function updateRainbowTrail(trail, shipGroup, elapsed) {
  const i = trail.head;
  trail.positions[i * 3] = shipGroup.position.x;
  trail.positions[i * 3 + 1] = shipGroup.position.y;
  trail.positions[i * 3 + 2] = shipGroup.position.z;

  const color = new THREE.Color().setHSL((elapsed * 0.5) % 1, 1.0, 0.5);
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

function updateShipShield(shield, physics, input, elapsed, delta, hue, asteroids, shipGroup) {
  // RGB sync
  shield.outer.material.color.setHSL(hue, 0.9, 0.5);
  shield.inner.material.color.setHSL(hue, 0.9, 0.5);

  // Opacity based on speed
  const speedRatio = physics.speed / physics.maxSpeed;
  const baseOp = input.boost ? 0.20 : (speedRatio > 0.15 ? 0.10 : 0.04);
  const pulseFreq = 0.5 + speedRatio * 2.5;
  const pulse = 1 + 0.3 * Math.sin(elapsed * pulseFreq * Math.PI * 2);
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

function updateContrail(trail, shipGroup, physics, nebulae, delta) {
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

      let brightness = Math.max(0, 1 - trail.ages[i] / 4);
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
// Minimap (tactical radar)
// ---------------------------------------------------------------------------

function initMinimap() {
  const canvas = document.getElementById('minimap');
  if (!canvas) return null;
  return canvas.getContext('2d');
}

function updateMinimap(ctx, shipGroup, bookGroup, asteroids, nebulae, elapsed) {
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
}

// ---------------------------------------------------------------------------
// Main animation loop
// ---------------------------------------------------------------------------

function startAnimationLoop(renderFn, elements, camera, shipGroup, physics, input, state, lights) {
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

    // ---- Flight mode ----
    if (input.active) {
      // Barrel roll detection (double-tap A/D)
      if (input.leftTapped) {
        input.leftTapped = false;
        const now = performance.now();
        if (now - input.lastLeftTap < 250 && !state.barrelRoll.active && !state.flip.active) {
          triggerBarrelRoll(state, 1, elapsed, physics, shipGroup);
        }
        input.lastLeftTap = now;
      }
      if (input.rightTapped) {
        input.rightTapped = false;
        const now = performance.now();
        if (now - input.lastRightTap < 250 && !state.barrelRoll.active && !state.flip.active) {
          triggerBarrelRoll(state, -1, elapsed, physics, shipGroup);
        }
        input.lastRightTap = now;
      }

      // Flip detection (Q key)
      if (input.flipRequested) {
        input.flipRequested = false;
        if (!state.flip.active && !state.barrelRoll.active) {
          triggerFlip(state, shipGroup, elapsed);
        }
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

      // FOV warp effect
      const targetFov = 60 + (physics.speed / physics.maxSpeed) * 15 + (input.boost ? 10 : 0);
      camera.fov += (targetFov - camera.fov) * 0.05;
      camera.updateProjectionMatrix();

      // Thruster particles (world space)
      updateThrusterParticles(elements.thruster, shipGroup, physics, input, delta);

      // Engine glow intensity
      const thrustActive = input.forward || input.boost || physics.speed > physics.baseSpeed * 1.5;
      const targetGlow = input.boost ? 300 : (thrustActive ? 150 : 0);
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

      // RGB + hue (used by title and shield)
      const speedBoost = 1 + (physics.speed / physics.maxSpeed) * 0.5;
      const hue = (elapsed * 0.3 * speedBoost) % 1;

      if (elements.titleMesh) {
        elements.titleMesh.material.color.setHSL(hue, 0.9, 0.35);
        elements.titleMesh.material.emissive.setHSL(hue, 0.9, 0.12);
      }

      // Ship shield
      if (input.boost && !state.prevBoost) elements.shield.rippleTime = elapsed;
      updateShipShield(elements.shield, physics, input, elapsed, delta, hue, elements.asteroids, shipGroup);

      // Speed lines (hyperspace streaks)
      updateSpeedLines(elements.speedLines, camera, shipGroup, physics, elapsed);

      // Boost flash (triggers on boost start)
      if (input.boost && !state.prevBoost) triggerBoostFlash(elements.boostFlash);
      state.prevBoost = input.boost;
      updateBoostFlash(elements.boostFlash, delta);

      // Rainbow trail behind ship
      updateRainbowTrail(elements.rainbowTrail, shipGroup, elapsed);

      // Contrail trails
      updateContrail(elements.contrailL, shipGroup, physics, elements.nebulae, delta);
      updateContrail(elements.contrailR, shipGroup, physics, elements.nebulae, delta);

      // Speed HUD
      const speedHud = document.getElementById('speed-hud');
      if (speedHud) speedHud.textContent = 'SPEED: ' + Math.round(physics.speed);

      // Minimap (update every 2nd frame for performance)
      if (elements.minimapCtx && ++state.minimapFrame % 2 === 0) {
        updateMinimap(elements.minimapCtx, shipGroup, elements.bookGroup, elements.asteroids, elements.nebulae, elapsed);
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
