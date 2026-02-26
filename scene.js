import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
const cursorEl = document.getElementById('prompt-cursor');

if (trigger) {
  trigger.addEventListener('click', startTypingAnimation, { once: true });
}

// ---------------------------------------------------------------------------
// Phase 2 — Typing animation
// ---------------------------------------------------------------------------

function startTypingAnimation() {
  const textSpan = document.createElement('span');
  textSpan.style.color = '#333';
  trigger.insertBefore(textSpan, cursorEl);

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
      cursorEl.style.display = 'none';
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
    // Ensure canvas is a direct child of body (guards against DOM nesting issues)
    document.body.appendChild(canvas);

    Array.from(document.body.children).forEach((el) => {
      if (el.id !== 'threejs-canvas' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
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
// Phase 3 — Three.js scene
// ---------------------------------------------------------------------------

function initThreeScene(canvas) {
  // ---- Renderer (no tone mapping — OutputPass will handle it) ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NoToneMapping;

  // ---- Scene ----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020210);

  // ---- Camera (start at final position — we'll handle the intro differently) ----
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 0, 15);

  // ---- Lighting (physically correct — r150+ uses inverse-square falloff) ----
  scene.add(new THREE.AmbientLight(0x334466, 2.0));

  const keyLight = new THREE.PointLight(0x4488ff, 800, 100);
  keyLight.position.set(10, 10, 10);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0xff6644, 400, 80);
  fillLight.position.set(-10, -5, 5);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0x44ffaa, 500, 60);
  rimLight.position.set(0, 5, -15);
  scene.add(rimLight);

  // ---- Build non-font elements ----
  const stars = createStarfield(scene);
  const ambient = createAmbientParticles(scene);
  const bookGroup = createFloatingBooks(scene);

  const elements = {
    stars,
    ambient,
    titleMesh: null,
    tagMeshes: [],
    linkMeshes: [],
    bookGroup,
  };

  // ---- Try to set up post-processing, fall back to basic rendering ----
  let composer = null;
  let bloomPass = null;
  let renderFn;

  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.4, 0.5, 0.05
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

  // ---- Controls (disabled until intro finishes) ----
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 80;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;
  controls.enabled = false; // disabled during intro

  // ---- Start animation loop ----
  const state = { introActive: true, introStart: performance.now() };

  startAnimationLoop(renderFn, controls, elements, camera, state);
  setupResize(camera, renderer, composer, bloomPass);

  // ---- Add text elements when font is ready ----
  function onFontReady(font) {
    try {
      elements.titleMesh = createTitleText(font, scene);
      elements.tagMeshes = createBigTagText(font, scene);
      elements.linkMeshes = createInteractiveLinks(font, scene, camera, canvas);
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
  const count = isMobile ? 2000 : 5000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 30 + Math.random() * 120;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    colors[i * 3] = 0.7 + Math.random() * 0.3;
    colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
    colors[i * 3 + 2] = 0.85 + Math.random() * 0.15;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });

  const mesh = new THREE.Points(geo, mat);
  scene.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------------------
// Ambient particles (mouse-reactive)
// ---------------------------------------------------------------------------

function createAmbientParticles(scene) {
  const count = isMobile ? 800 : 2000;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    velocities[i * 3] = (Math.random() - 0.5) * 0.01;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.4,
    color: 0x8888ff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Points(geo, mat);
  scene.add(mesh);
  return { mesh, positions, velocities };
}

// ---------------------------------------------------------------------------
// 3D Title
// ---------------------------------------------------------------------------

function createTitleText(font, scene) {
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
    emissiveIntensity: 0.6,
    metalness: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 2, 0);
  mesh.scale.set(0.01, 0.01, 0.01);
  scene.add(mesh);

  // Animate in
  const start = performance.now();
  function fadeIn(now) {
    const t = (now - start) / 1000;
    if (t < 2) {
      mesh.scale.setScalar(easeOutBack(clamp(t / 1.5)));
      mesh.material.opacity = clamp(t / 0.8);
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
// <big> tag text
// ---------------------------------------------------------------------------

function createBigTagText(font, scene) {
  const makeTag = (text, y) => {
    const geo = new TextGeometry(text, {
      font,
      size: 0.5,
      depth: 0.05,
      curveSegments: 6,
      bevelEnabled: false,
    });
    geo.center();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x44ff88,
      emissive: 0x22aa44,
      emissiveIntensity: 0.4,
      metalness: 0.3,
      roughness: 0.6,
      transparent: true,
      opacity: 0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, y, 0);
    scene.add(mesh);

    // Animate in
    const start = performance.now();
    function fadeIn(now) {
      const t = (now - start) / 1000;
      if (t < 1.5) {
        mesh.material.opacity = clamp(t / 1.0) * 0.7;
        requestAnimationFrame(fadeIn);
      }
    }
    setTimeout(() => requestAnimationFrame(fadeIn), 500);

    return mesh;
  };

  return [
    makeTag('<big><big><big><big><big>', 5.5),
    makeTag('</big></big></big></big></big>', -1.2),
  ];
}

// ---------------------------------------------------------------------------
// Interactive links
// ---------------------------------------------------------------------------

function createInteractiveLinks(font, scene, camera, canvas) {
  const links = [
    { text: '[ github ]', url: 'https://github.com/daniel-stevens', pos: [-5, -3.5, 0] },
    { text: '[ Good Reads ]', url: 'library.html', pos: [5, -3.5, 0] },
  ];

  const clickables = [];

  links.forEach((link, idx) => {
    const geo = new TextGeometry(link.text, {
      font,
      size: 0.7,
      depth: 0.12,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelSegments: 3,
    });
    geo.center();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6644,
      emissive: 0xaa3322,
      emissiveIntensity: 0.5,
      metalness: 0.6,
      roughness: 0.3,
      transparent: true,
      opacity: 0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(link.pos[0], link.pos[1] - 2, link.pos[2]);
    mesh.userData = { url: link.url, isLink: true, baseEmissive: 0.5, targetY: link.pos[1] };
    scene.add(mesh);
    clickables.push(mesh);

    // Animate in
    const start = performance.now();
    function fadeIn(now) {
      const t = (now - start) / 1000;
      if (t < 1.5) {
        const p = easeOutCubic(clamp(t / 1.0));
        mesh.material.opacity = p;
        mesh.position.y = mesh.userData.targetY + (1 - p) * -2;
        requestAnimationFrame(fadeIn);
      } else {
        mesh.material.opacity = 1;
        mesh.position.y = mesh.userData.targetY;
      }
    }
    setTimeout(() => requestAnimationFrame(fadeIn), 800 + idx * 200);
  });

  // Raycasting
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const mouseDown = new THREE.Vector2();

  canvas.addEventListener('pointerdown', (e) => {
    mouseDown.set(e.clientX, e.clientY);
  });

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
      if (url.startsWith('http')) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(clickables);
    canvas.style.cursor = hits.length > 0 ? 'pointer' : 'grab';

    clickables.forEach((m) => {
      const hovered = hits.some((h) => h.object === m);
      m.material.emissiveIntensity = hovered ? 1.2 : m.userData.baseEmissive;
    });
  });

  return clickables;
}

// ---------------------------------------------------------------------------
// Floating book cards (canvas textures)
// ---------------------------------------------------------------------------

function createBookCardTexture(book) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 200;
  const ctx = c.getContext('2d');

  // Background
  ctx.fillStyle = 'rgba(8, 8, 32, 0.92)';
  ctx.fillRect(0, 0, 512, 200);

  // Border
  const catColor = CATEGORY_COLORS[book.category] || '#6666ff';
  ctx.strokeStyle = catColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 504, 192);

  // Category label
  ctx.fillStyle = catColor;
  ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
  const catW = ctx.measureText(book.category).width + 16;
  ctx.fillRect(16, 14, catW, 22);
  ctx.fillStyle = '#000';
  ctx.fillText(book.category, 24, 30);

  // Title
  ctx.fillStyle = '#e0e0ff';
  ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
  const title = book.title.length > 35 ? book.title.substring(0, 33) + '...' : book.title;
  ctx.fillText(title, 16, 72);

  // Author
  if (book.author) {
    ctx.fillStyle = '#8888bb';
    ctx.font = '16px Helvetica, Arial, sans-serif';
    ctx.fillText(book.author, 16, 100);
  }

  // Stars
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

    const angle = (i / BOOKS.length) * Math.PI * 2;
    const radius = 22 + (i % 3) * 4;
    const yOffset = (Math.random() - 0.5) * 14;
    card.position.set(
      Math.cos(angle) * radius,
      yOffset,
      Math.sin(angle) * radius
    );
    card.lookAt(0, card.position.y, 0);

    card.userData.angle = angle;
    card.userData.radius = radius;
    card.userData.yBase = yOffset;
    card.userData.floatSpeed = 0.3 + Math.random() * 0.4;
    card.userData.floatAmp = 0.2 + Math.random() * 0.3;

    group.add(card);
  });

  scene.add(group);
  return group;
}

// ---------------------------------------------------------------------------
// Main animation loop (handles intro + continuous animation in one place)
// ---------------------------------------------------------------------------

function startAnimationLoop(renderFn, controls, elements, camera, state) {
  const clock = new THREE.Clock();
  const mousePos = { x: 0, y: 0 };

  window.addEventListener('mousemove', (e) => {
    mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // ---- Intro sequence (first 5 seconds) ----
    if (state.introActive) {
      const t = (performance.now() - state.introStart) / 1000;

      // Book cards fade in (1–4s)
      if (t > 0.5) {
        const p = clamp((t - 0.5) / 2.5);
        elements.bookGroup.children.forEach((card) => {
          card.material.opacity = p * 0.85;
        });
      }

      // End intro, enable controls
      if (t > 4) {
        state.introActive = false;
        controls.enabled = true;
      }
    }

    // ---- Continuous animations ----

    // Stars rotate
    elements.stars.rotation.y += delta * 0.008;
    elements.stars.rotation.x += delta * 0.003;

    // Ambient particles drift + mouse
    const pos = elements.ambient.positions;
    const vel = elements.ambient.velocities;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] += vel[i] + mousePos.x * 0.001;
      pos[i + 1] += vel[i + 1] + mousePos.y * 0.001;
      pos[i + 2] += vel[i + 2];
      if (Math.abs(pos[i]) > 30) pos[i] *= -0.95;
      if (Math.abs(pos[i + 1]) > 20) pos[i + 1] *= -0.95;
      if (Math.abs(pos[i + 2]) > 30) pos[i + 2] *= -0.95;
    }
    elements.ambient.mesh.geometry.attributes.position.needsUpdate = true;

    // Title float
    if (elements.titleMesh) {
      elements.titleMesh.position.y = 2 + Math.sin(elapsed * 0.5) * 0.2;
      elements.titleMesh.rotation.y = Math.sin(elapsed * 0.3) * 0.04;
    }

    // Tag breathing
    if (elements.tagMeshes.length > 0) {
      elements.tagMeshes.forEach((m, i) => {
        m.material.emissiveIntensity = 0.3 + Math.sin(elapsed * 0.8 + i * Math.PI) * 0.15;
      });
    }

    // Book cards orbit + float
    elements.bookGroup.rotation.y += delta * 0.015;
    elements.bookGroup.children.forEach((card) => {
      const d = card.userData;
      card.position.y = d.yBase + Math.sin(elapsed * d.floatSpeed) * d.floatAmp;
    });

    // Controls (only update when enabled)
    if (controls.enabled) {
      controls.update();
    }

    // Render
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
function clamp(v) { return Math.max(0, Math.min(1, v)); }
