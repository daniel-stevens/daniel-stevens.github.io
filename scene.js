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
      if (el.id !== 'threejs-canvas' && el.id !== 'flight-hud' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
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
  };

  window.addEventListener('keydown', (e) => {
    if (!input.active) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    input.forward = true; break;
      case 'KeyS': case 'ArrowDown':  input.backward = true; break;
      case 'KeyA': case 'ArrowLeft':  input.left = true; break;
      case 'KeyD': case 'ArrowRight': input.right = true; break;
      case 'Space': input.boost = true; e.preventDefault(); break;
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

  // Engine glow (behind ship)
  const engineGlow = new THREE.PointLight(0xff6633, 0, 30);
  engineGlow.position.set(0, -0.3, 2);
  shipGroup.add(engineGlow);

  // Thruster particles
  const thruster = createThrusterParticles();
  shipGroup.add(thruster.mesh);

  const elements = {
    stars, ambient, titleMesh: null, tagMeshes: [], linkMeshes: [],
    bookGroup, thruster, engineGlow,
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

  // Input + Physics
  const input = createInputState(canvas);
  const physics = createShipPhysics();

  // Animation loop
  const state = { introActive: true, introStart: performance.now(), hudShown: false };
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
    makeTag('</big></big></big></big></big>', -3.2),
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
      // Spawn at ship rear in world space
      const localSpawn = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.4,
        1.5
      );
      const worldSpawn = localSpawn.applyQuaternion(shipGroup.quaternion).add(shipGroup.position);
      pos[i * 3] = worldSpawn.x;
      pos[i * 3 + 1] = worldSpawn.y;
      pos[i * 3 + 2] = worldSpawn.z;

      // Backward velocity in world space
      const localVel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        5 + Math.random() * 8
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
// HUD
// ---------------------------------------------------------------------------

function showFlightHUD() {
  const hud = document.getElementById('flight-hud');
  if (!hud) return;
  hud.style.display = 'block';
  setTimeout(() => { hud.style.opacity = '0'; }, 8000);
  setTimeout(() => { hud.style.display = 'none'; }, 10000);
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
      updateShipPhysics(shipGroup, physics, input, delta);
      updateChaseCamera(camera, shipGroup, physics, input, delta);

      // Thruster particles (in world space, not parented to ship movement)
      updateThrusterParticles(elements.thruster, shipGroup, physics, input, delta);

      // Engine glow intensity
      const thrustActive = input.forward || input.boost || physics.speed > physics.baseSpeed * 1.5;
      const targetGlow = input.boost ? 300 : (thrustActive ? 150 : 0);
      elements.engineGlow.intensity += (targetGlow - elements.engineGlow.intensity) * 0.1;

      // Lights follow ship
      const sp = shipGroup.position;
      lights.key.position.set(sp.x + 10, sp.y + 10, sp.z + 10);
      lights.fill.position.set(sp.x - 10, sp.y - 5, sp.z + 5);
      lights.rim.position.set(sp.x, sp.y + 5, sp.z - 15);

      // Wrap space objects
      wrapStarfield(elements.stars, sp);
      wrapAmbientParticles(elements.ambient, sp);
      wrapBooks(elements.bookGroup, sp);

      // RGB Razer-style color cycling on title
      if (elements.titleMesh) {
        const speedBoost = 1 + (physics.speed / physics.maxSpeed) * 0.5;
        const hue = (elapsed * 0.3 * speedBoost) % 1;
        elements.titleMesh.material.color.setHSL(hue, 0.9, 0.35);
        elements.titleMesh.material.emissive.setHSL(hue, 0.9, 0.12);
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
function easeOutBack(t) {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
