# Research: danielstevens.org Codebase

## Overview

This is Daniel Stevens' personal website, hosted on GitHub Pages at `danielstevens.org`. What starts as a minimal, unstyled personal page hides a massive interactive 3D space flight simulator built entirely in vanilla JavaScript with Three.js. The site has no build step, no framework, no CSS file — just raw HTML and a single 8,449-line JavaScript module.

**Repository:** `daniel-stevens/daniel-stevens.github.io`
**Domain:** danielstevens.org (via CNAME)
**Stack:** Static HTML, vanilla JS (ES modules), Three.js v0.172.0 (CDN), PeerJS v1.5.4 (CDN)
**Testing:** Node.js test runner (static analysis) + Playwright (e2e)
**Dependencies:** Playwright (dev only)

---

## File Structure

```
index.html          — Main page: personal info + full game HUD + canvas
scene.js            — 8,449 lines: entire 3D engine, game logic, audio, multiplayer
library.html        — Curated reading list (30+ books across 6 categories)
projects.html       — GitHub repos and interesting forks
og-image.png        — Open Graph social sharing image
CNAME               — Custom domain: danielstevens.org
sitemap.xml         — 3 URLs (index, library, projects)
robots.txt          — Allow all, references sitemap
package.json        — Only devDependency: Playwright
tests/
  static.test.mjs   — 2,472 lines of static code analysis tests (Node test runner)
  e2e.test.cjs      — Playwright browser tests (page load, canvas rendering, pixel analysis)
```

---

## The Transformation Mechanism

The site begins as a brutalist personal page: a `<big>` tag with the name, a GitHub link, and two buttons ("Good Reads", "Projects"). A green terminal-styled "overengineer" button sits below.

Clicking "overengineer" triggers `beginTransformation()`:

1. **Typing animation** — A terminal-style prompt types out a message character by character over ~8 seconds
2. **DOM hiding** — All original page content (except the canvas, HUD elements, and slider) fades out and is hidden
3. **Loading screen** — A "LOADING... Initializing space-time continuum" screen appears
4. **Scene initialization** — `initThreeScene()` builds the entire 3D world
5. **Canvas takeover** — The `#threejs-canvas` becomes a full-viewport, position-fixed overlay at z-index 9999
6. **Flight HUD** — All game HUD elements become visible
7. **Animation loop** — `startAnimationLoop()` begins the game

The prompt text (`PROMPT_TEXT` constant) contains a stylized terminal message that types out before the transformation.

---

## Three.js Scene Architecture

### Renderer & Post-Processing Pipeline

- **WebGLRenderer** with `preserveDrawingBuffer: true` (for screenshots), `NoToneMapping`
- **EffectComposer** pipeline:
  1. `RenderPass` — Base scene render
  2. `UnrealBloomPass` — Glow/bloom effect (strength modulated by RGB slider and speed)
  3. `ShaderPass(ChromaticAberrationShader)` — RGB color separation, scales with speed
  4. `ShaderPass(MotionBlurShader)` — Directional blur during boost
  5. `ShaderPass(GravitationalLensingShader)` — Black hole distortion
  6. `ShaderPass(ScreenCrackShader)` — Hull damage screen cracks
  7. `ShaderPass(DimensionShiftShader)` — Alternate dimension color shift
  8. `ShaderPass(VolumetricLightShader)` — God rays from nebulae
  9. `OutputPass` — Final output

### Custom Shaders (6 total)

| Shader | Purpose | Key Uniforms |
|--------|---------|-------------|
| ChromaticAberrationShader | RGB separation | amount |
| MotionBlurShader | Directional blur (9 samples) | strength, direction |
| GravitationalLensingShader | Black hole warping | blackHoleScreenPos, distortionStrength, radius |
| ScreenCrackShader | Damage cracks on screen | crackIntensity, time |
| DimensionShiftShader | Alternate dimension colors | shiftAmount |
| VolumetricLightShader | God rays/light shafts | lightScreenPos, lightColor |

### Scene Lighting

- AmbientLight (intensity >= 0.2)
- Multiple PointLights (intensity >= 50)
- Dynamic lights on: nebulae, asteroids (proximity), black hole rim, space station docking bays, resource pickups

---

## The Ship

The "ship" is a Three.js Group containing:
- **Title mesh** — 3D text of the user's name, rendered with FontLoader + TextGeometry, color-cycles through HSL based on speed and RGB
- **Tag meshes** — Smaller text labels
- **Interactive links** — 3D clickable text (GitHub, Good Reads, Projects) with raycasting hover/click detection that open real URLs
- **Engine flames** — Two ConeGeometry meshes, dynamically scaled by thrust/speed/fuel state
- **Shield** — Two-layer system: wireframe IcosahedronGeometry outer + SphereGeometry inner, color synced to HSL, pulse animation, ripple on impact/boost

The ship has no traditional mesh — the pilot's name IS the ship.

### Ship Physics

```
thrust, drag, maxSpeed, baseSpeed
velocity (Vector3)
speed (scalar)
```

- WASD/Arrow keys for pitch/yaw
- SPACE for boost (consumes fuel)
- Chase camera follows behind ship (no OrbitControls)
- FOV warps 60-85 degrees based on speed + boost
- Infinite space: objects wrap around the player

---

## Game Systems

### Combat

- **Missiles** — Pool of 6, fired with F key. Homing toward nearest asteroid/comet/boss within 100 units. Trail particles. 5s lifetime. Destroy asteroids on contact.
- **Beam weapon** — Alternative to missiles. Raycasts forward, instant hit within 150 units and 4-unit perpendicular distance.
- **Scatter shot** — Fires 3 missiles at spread angles (custom weapon type)
- **EMP blast** — Hold E to charge (1.5s max), release to fire expanding sphere. Destroys all objects in radius (up to 50 units). 8s cooldown. Slow-motion effect.

### Enemies & Hazards

- **Asteroids** — 20-35 procedural IcosahedronGeometry meshes in 3 sizes. Three texture types (rocky, metallic, crystal). Proximity red warning light. Wrap around player.
- **Comet storms** — Timer-based events. 12-comet pool. Spawn every 0.3-0.5s aimed at ship during 8s storm window. 12-20 damage on hit.
- **Black hole** — Event horizon sphere + dual glowing rims + accretion disk. Inverse-square gravity affects asteroids and ship. Gravitational lensing shader distorts view. Proximity drone audio.
- **Boss fights** — Spawns at kill thresholds. Core icosahedron + 6 orbiting octahedron segments with individual health. Fires projectiles every 1.5s. Defeating all segments awards 1000 points and raises next threshold by 50.

### Health & Damage

- **Hull** — Health pool with healing over time (5 HP/s after 2s damage delay)
- **Shield** — Energy meter that absorbs asteroid hits (requires RGB > 0.3). Recharges after 2s drain delay.
- **Screen cracks** — ScreenCrackShader intensity scales with cumulative damage
- **Invincibility** — 3 seconds after respawn with blinking visual
- **Death sequence** — Staggered explosions at 0.3s intervals, 0.3x time dilation, debris burst (8 pieces), letterbox bars, death replay camera

### Death Replay

- Circular buffer records 180-300 frames of ship position/rotation/speed/camera
- On death: plays back at 0.5x speed with orbiting camera (8-unit radius, sinusoidal height)
- Letterbox bars (12vh black bars top/bottom)
- 5-second respawn countdown

### Maneuvers

- **Barrel roll** — Double-tap A/D (250ms window). Full 360-degree Z rotation with cubic in-out easing. Combo counter: x2, TRIPLE, QUAD, MENTAL. Speed boost on each roll.
- **Flip** — Q key. 180-degree Y rotation. Camera pulls back 8 units during animation. "FLIP!" action text.
- **Hyperspace jump** — Hold SHIFT (2s charge). Teleports 300-500 units in random direction. Velocity reset. Bloom flash + shockwaves at origin and destination. 5-15s cooldown.
- **Sonic boom** — Automatically triggers at >80% max speed. Shockwave + sound effect.

### Navigation & Environment

- **Wormholes** — Purple torus ring + inner glow + 200 spiral particles. Flying within 8 units triggers dimension shift. Spawns exit wormhole in alternate dimension.
- **Dimension shift** — Toggles alternate reality. Changes star colors, ambient particles, nebula hues (HSL 0.33 saturation shift). DimensionShiftShader visual effect. Different color palette (`DIMENSION_PALETTES`).
- **Procedural planets** — 4 types (rocky, gas, ice, lava) with canvas-generated textures, atmosphere pulse, optional rings. 3-5 scattered in scene.
- **Space station** — Cylinder hub + docking rings (rotating) + solar panels + rotating habitat torus + warning blink light. Proximity refueling.
- **Space whale** — Cyan ellipsoid body + 6 animated tendrils + 100-point trail. Sinusoidal weaving motion. Low-frequency whale song audio.
- **Nebula clouds** — 15-25 clouds from 5-color palette. 3-layer sprites per cloud. Lightning flashes. Dust particle burst on flythrough. Proximity glow + tint overlay + wisp particles.

### Weather System

Cycles through weather types on a timer with 5s transitions:

| Type | Effects |
|------|---------|
| SOLAR_FLARE | Pulsing bloom strength |
| RADIATION_STORM | Green fog, health drain (0.1/s) |
| METEOR_SHOWER | Spawns mini-comets every 0.2-0.5s |
| AURORA | Animated ribbon meshes, rainbow color shift |
| ICE_FIELD | Blue fog, octahedron crystals, destroyable by missiles |
| CLEAR | No effects |

### Fuel System

- 100 max fuel, consumption rate 15/s during boost
- Boost gated on fuel > 0
- Energy resource pickups restore +20 fuel
- Station proximity refuels
- HUD bar changes color: orange >50%, orange 20-50%, red <20%

### Mission System

5 mission types: hunter, speed_run, survivor, explorer, whale_finder. Spawn on cooldown timer (45s). Difficulty scales with completed count. Rewards: score + resources. Timer-based failure.

### Resource/Mining

3 types: crystal (blue, 30%), metal (gray, 40%), energy (green, 30%). Octahedron pickups with glow. Magnetic attraction within 15 units. 8s lifetime with fade. Energy pickups also restore fuel.

### Score & Progression

- Score multiplier system
- Points from: kills, pickups (25), boss segments (200), boss defeat (1000), maneuver combos
- High score persisted to localStorage (`danielstevens-highscore`)
- Floating score popups for 50+ point events
- Minimap shows all object types with distinct blip styles

---

## Achievement System

Extensive achievement tracking persisted to localStorage (`danielstevens-achievements`). Named achievements include:

- FIRST BLOOD, SPEED DEMON, BARREL KING
- WARP DRIVER, STORM SURVIVOR, EXTINCTION EVENT, SPACE WHISPERER
- TEN THOUSAND, FIFTY GRAND (score milestones)
- DIMENSION HOPPER, DOCK MASTER, BOSS SLAYER
- CHAOS MASTER (Konami code), SHUTTERBUG (screenshot)
- MISSION MASTER, weather-related (WEATHERED, AURORA HUNTER, ICE BREAKER)

Stats tracked: max speed, kills, distance, barrel rolls, flips, combo count, hyperspace jumps, comets destroyed, EMP blasts, max EMP kills, boss defeats, screenshots taken, weather types experienced, proximity to whale/station/aurora.

Popup queue with 3s display, cubic-bezier entry animation, 500ms slide-out.

---

## Audio Engine (Fully Procedural — Web Audio API)

Zero audio files. Everything is synthesized in real-time:

### Engine Sound
- Two detuned sawtooth oscillators (60Hz L-panned, 90Hz R-panned) through lowpass filters
- Frequency/volume modulate with speed ratio and RGB intensity

### Sound Effects (18+)
| Function | Description |
|----------|-------------|
| triggerBoostSound | Noise burst, bandpass, 0.5s |
| triggerRollSound | Sine sweep 200-800-200Hz with directional panning |
| triggerFlipSound | 40Hz boom + noise burst |
| triggerMissileSound | Sine sweep 200-2000Hz + noise |
| triggerExplosionSound | 30Hz boom + bandpass noise |
| triggerSpatialExplosionSound | 3D-positioned explosion (HRTF panner) |
| triggerLightningSound | High-freq noise burst (80ms) |
| triggerDamageSound | Triangle down-sweep 800-200Hz |
| triggerShieldImpactSound | Metallic bell (880Hz + 2340Hz overtone) |
| triggerAchievementSound | Ascending C-E-G chord |
| triggerEMPSound | 30Hz bass + 800Hz noise (2s) |
| triggerJumpSound | Sawtooth upsweep 200-2000Hz (3s) + bass kicker |
| triggerKonamiSound | 5-note ascending scale + bass drop |
| triggerCometWarning | 3 descending sawtooth sweeps |
| triggerDimensionShiftSound | 4-voice chord pad + reality tear noise |
| triggerBassDropSound | 60-30Hz sine descent |
| triggerTriumphantHornSound | Two-part sawtooth chord through lowpass |
| triggerWormholeSound | Sine upsweep + echo layer |

### Ambient Audio (6 systems)
- **Black hole drone** — Two detuned sines (30Hz, 31.5Hz), proximity-scaled
- **Whale song** — Two sines (40Hz, 42Hz) through bandpass
- **Planet ambient** — Two sawtooths (35Hz, 36.5Hz) through lowpass
- **Station beacon** — 90Hz drone + periodic 440Hz pulse beeps
- **Asteroid field ambient** — Looping white noise through 80Hz bandpass
- **Radio chatter** — Bandpass-filtered noise with AM modulation, random 15-35s intervals

### Procedural Music
Layered dynamic music system:
- **Kick drum** — Pre-rendered 60Hz sine buffer, exponential decay
- **Hi-hat** — White noise buffer, 0.05s
- **Ambient pad** — Two detuned triangle oscillators (220/221.5Hz)
- **Combat layer** — 110Hz sawtooth through waveshaper distortion
- **Arpeggio** — Pentatonic scale notes scheduled per sixteenth-note
- **Weather layers** — Whale choir, solar flare rumble, radiation glitch, aurora shimmer, ice field tinkle
- **Dimension reverb** — Delay feedback loop (0.3s delay, 0.4 feedback)
- **BPM** — Scales 60-180 with danger level

### Spatial Audio
- `createSpatialPanner()` — HRTF panner with inverse distance model
- `updateAudioListener()` — Syncs Web Audio listener to camera position/orientation

---

## Visual Effects Systems

### Particle Systems (Object-Pooled)
- Thruster particles (80-200 count)
- Speed lines (40-100 count)
- Rainbow trail (200-500 count)
- Contrails (250-400 count per side, custom colors)
- Nebula wisps
- Nebula dust
- Explosion particles (200 per instance, pool of 4)
- Damage sparks (40 particles)
- Smoke trail (60 particles)
- Flip burst (50 particles)

### Screen Effects
- Boost flash (white overlay, 0.3s fade)
- Damage flash (4 directional red bars — top/bottom/left/right)
- Hit markers (expanding torus rings, pool of 6)
- Shockwaves (expanding torus rings, pool of 3)
- Debris (12 randomized box geometry pieces)
- Letterbox bars (death replay)

### Environmental
- Starfield wrapping (spherical shell, 150-unit radius)
- Ambient particles (80x60x80 wrapping box)
- Floating book cards (512x200 canvas textures, category-colored)
- Floating project cards (512x200 canvas textures, original/fork distinction)
- Nebula 3-layer sprites with lightning flashes
- Warp tunnel (4 concentric cylinders + 3 pulse rings)

---

## Ship Customization

Persisted to localStorage (`danielstevens-ship-config`). Opened with TAB key.

### Engine Types
- Default, plasma_drive, void_engine
- Affect engine sound frequency multiplier

### Shield Types
- Default, bubble_shield, flame_barrier, void_shield
- Affect shield visual appearance

### Weapon Types
- Default (single missile), scatter (3 missiles with spread), beam (instant raycast)

### Contrail Colors
- Customizable trail color applied to contrails and rainbow trail

---

## Quality Presets & Auto-Scaling

4 tiers: LOW, MEDIUM, HIGH (default), INSANE

Each tier controls particle counts for: stars, ambient particles, speed lines, trails, thruster, asteroids, nebulae, contrails, warp tunnel segments, nebula wisps, damage sparks, smoke trail.

Also toggles: post-processing passes (chromaPass, motionBlurPass), environment map, volumetric lighting.

### Auto-Quality
- **Downgrade** — If FPS < 25 for sustained period, drops quality tier
- **Upgrade** — If FPS > 55 for sustained period, raises quality tier
- FPS tracked in rolling history

---

## Multiplayer (Ghost Ships)

- **BroadcastChannel** (`danielstevens-space`) for same-device tab communication
- **PeerJS** for cross-device WebRTC connections
- Broadcasts position/rotation/speed/boosting at 10Hz
- Ghost ships rendered as wireframe ConeGeometry, color-hashed from peer ID
- 50-point trailing line per ghost
- Position interpolation (0.15 lerp rate)
- Stale ghost cleanup (>5s without update)
- Ghost blips on minimap
- Players count HUD

---

## HUD Elements (All in index.html)

The HTML contains 25+ fixed-position HUD elements, all `display:none` by default:

- Flight instructions bar (bottom center)
- Speed display (top right)
- Score + high score (top center)
- Minimap canvas (bottom left, circular, 150x150)
- RGB intensity slider + mute/volume + screenshot button (top left)
- Health bar (bottom right)
- Shield bar (above health)
- Fuel bar (above shield)
- Boss health bar (top center)
- Resource counts (bottom left, above minimap)
- Achievement popup container (top right)
- Jump/EMP/Wormhole cooldown indicators (stacked, bottom right)
- Quality preset selector (below RGB slider)
- FPS counter (below speed)
- Weather announcement (top center)
- Players count (below FPS)
- Controls hint button (bottom center)
- Action text overlay (center screen, large font)
- Loading screen (full viewport)
- Pause menu (full viewport with Resume/Controls/Quit)
- Touch controls (joystick canvas + action buttons)
- WebGL fallback message
- Letterbox bars (top/bottom)
- Controls overlay (full viewport keybinding reference)
- Customization panel (full viewport)
- Mission objectives (top center, below score)

---

## Easter Eggs

- **Konami Code** — Up Up Down Down Left Right Left Right B A unlocks "CHAOS MODE" with rainbow trail and enhanced chromatic aberration. Triggers 5-note ascending scale sound and CHAOS MASTER achievement.
- **The ship is the name** — The player's name rendered as 3D text IS the spaceship.
- **The "overengineer" button** — Self-referential humor: clicking it reveals the massively overengineered 3D game hidden in a personal website.

---

## SEO & Web Standards

- All 3 pages have full OpenGraph and Twitter Card meta tags
- JSON-LD structured data (ProfilePage for index, CollectionPage for library/projects)
- Canonical URLs
- Sitemap.xml with lastmod dates
- robots.txt allowing all crawlers
- SVG favicon (letter "D")
- Semantic HTML with lang="en"
- Import maps for Three.js ES module imports

---

## Testing

### Static Tests (static.test.mjs — 2,472 lines)

Uses Node's built-in `node:test` runner. Reads HTML and JS source as strings and runs regex/string assertions. No browser required. Covers 25+ feature areas with 300+ individual assertions:

- HTML structure and element IDs
- Shader definitions and uniform names
- Function existence and signatures
- Constants and configuration values
- State object shape
- HUD element presence
- Event listener bindings
- Quality preset structure
- Achievement definitions
- Post-processing pipeline order

### E2E Tests (e2e.test.cjs)

Playwright with Chromium (non-headless for WebGL). Tests:
1. Page loads with title
2. Trigger button visible
3. CDN resources load (no 404s, no import errors)
4. Click trigger, wait 22s for full transformation
5. Canvas visible with non-zero dimensions
6. Canvas has rendered content (>5% non-black pixels, max brightness >50)
7. No critical JS errors

---

## The Reading List (library.html)

30+ books across 6 categories:
- **Personal Development** — Goggins, Clear, Dalio, Carnegie (8 books)
- **Business & Finance** — DeMarco, Ferriss, Graham, Kiyosaki (7 books)
- **Psychology & Mindset** — Kahneman, Newport, Fromm (7 books)
- **Philosophy** — Marcus Aurelius, Tolle, Taleb (3 books)
- **Strategy & Negotiation** — Voss, Kim/Mauborgne (3 books)
- **Health & Wellness** — Walker (1 book)

Star rating system: single star = would read again, multiple stars = already has.

Books also appear as floating 3D cards in the game world (BOOKS array with 25+ entries, CATEGORY_COLORS for coloring).

---

## The Projects Page (projects.html)

### Original Projects
- daniel-stevens.github.io (this site)
- SnippetsArchive (JavaScript snippets)
- EPH-Zoho-Catalyst-NewsApp (news app)

### Forked Repos (15)
Interests span: hardware education, Paul Graham essays, ML (teenygrad), crypto dashboards, anti-censorship tools, hacker culture, remote work, Zoho tools, malware analysis, stock models, log parsing, Obsidian templates, Asus laptop tools, CS courses.

Projects also appear as floating 3D cards in the game world (PROJECTS array with category/color distinction between originals and forks).

---

## Notable Technical Patterns

1. **Zero dependencies at runtime** — Everything runs from CDN scripts and vanilla JS. No build, no bundler, no framework.

2. **Object pooling everywhere** — Missiles, explosions, debris, sparks, lightning, hit markers, shockwaves, pickups, comets all use pre-allocated pools to avoid GC pressure.

3. **Canvas-generated textures** — Planet surfaces, asteroid textures, book/project cards are all generated procedurally on 2D canvas then used as Three.js textures.

4. **Fully procedural audio** — 18+ distinct sound effects, 6 ambient soundscapes, and a full dynamic music system all synthesized with Web Audio API oscillators, noise buffers, and filters. Zero audio files loaded.

5. **Single-file architecture** — 8,449 lines in one JS file. No modules, no code splitting. Everything from shaders to multiplayer networking in one file.

6. **Static test strategy** — 2,472 lines of tests that treat the source code as a string and regex-match against expected patterns. Clever way to verify structure without needing a browser runtime.

7. **Progressive enhancement** — Starts as a functional static page. WebGL fallback message if GPU unavailable. Auto-quality scaling based on FPS. Mobile touch controls.

8. **The RGB slider** — A single slider (0-100%) controls the overall visual intensity of the entire scene: bloom strength, particle opacity, shield visibility, sound volume, chromatic aberration, lightning frequency, and more. It's the master "how much do you want" knob.

---

## Architecture Summary

```
index.html
  |
  |-- [click "overengineer"]
  |
  v
scene.js (8,449 lines, single ES module)
  |
  |-- Imports: Three.js core + addons (FontLoader, TextGeometry, EffectComposer, passes)
  |-- 6 custom GLSL shaders
  |-- Constants: BOOKS, PROJECTS, CATEGORIES, ACHIEVEMENTS, SHIP_CUSTOMIZATIONS,
  |             WEATHER_TYPES, MISSION_TYPES, PLANET_TYPES, RESOURCE_TYPES,
  |             QUALITY_PRESETS, DIMENSION_PALETTES, KONAMI_SEQUENCE
  |
  |-- beginTransformation() → typing animation → hide DOM → loading screen
  |-- initThreeScene() → renderer, camera, lights, composer, all objects
  |-- startAnimationLoop() → main loop updating ~50 systems per frame:
  |     |-- Input processing (keyboard, touch, pause)
  |     |-- Ship physics (thrust, drag, velocity)
  |     |-- Camera (chase cam, FOV warp, shake)
  |     |-- All particle systems
  |     |-- All environmental objects (wrap/update)
  |     |-- Combat (missiles, beam, EMP, boss)
  |     |-- Collision detection
  |     |-- Health/shield/fuel management
  |     |-- Weather cycling
  |     |-- Mission tracking
  |     |-- Score/achievements
  |     |-- Death/respawn
  |     |-- All audio systems
  |     |-- Multiplayer broadcast/receive
  |     |-- Post-processing updates
  |     |-- HUD updates
  |     |-- Auto-quality FPS monitoring
  |     v
  |   requestAnimationFrame(loop)
```
