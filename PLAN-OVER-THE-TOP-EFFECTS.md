# Plan: Over-the-Top Effects (Round 2) — MAXIMUM OVERKILL EDITION

## Context

The site already has: speed lines, FOV warp, screen shake, boost flash, speed counter HUD, rainbow trail, RGB cycling, thruster particles. Now adding 8 more effects — each one cranked to 11.

## Files to Modify

- `scene.js` — all new effect logic
- `index.html` — minimap canvas + new HUD elements
- `tests/static.test.mjs` — new tests for each feature

---

## 1. Nebula Clouds — "Flying Through the Cosmos"

Not just fog sprites — a living, breathing cosmic environment that reacts to the ship.

### Visual Design
- **Multi-layer nebulae**: Each cloud is actually 3 overlapping sprites at slightly different positions/scales, creating depth
- **Color palette**: Deep purples (#6B2FA0), electric blues (#1A6BFF), hot pinks (#FF2D95), cyan (#00E5FF), and warm amber (#FF8800)
- **Color drift**: Each nebula's hue slowly shifts over time using HSL rotation — they feel alive, not static
- **Lightning flashes**: Random internal flashes — a nebula briefly spikes to 3x opacity for 0.05s, then fades back. Happens randomly every 2-8 seconds per cloud. Looks like electrical storms inside the gas
- **Ship interaction**: When ship passes within 15 units of a nebula center, spawn 20-30 tiny colored particles that scatter outward from the ship — like disturbing cosmic dust. Particles live for 1.5s with velocity matching ship direction
- **Proximity glow**: Nearby nebulae (< 30 units) subtly tint the scene — add a very faint colored `PointLight` at each nebula position that only activates when close to ship (intensity lerps based on distance)

### Technical Details
- **Texture**: 256x256 canvas with multi-stop radial gradient: center white → 30% color → 70% color at 50% opacity → edge transparent. Apply gaussian-like falloff
- **Count**: 25 nebulae (15 on mobile), distributed in a 300-unit sphere around origin
- **Scale**: 25-70 units each (randomized). Inner layers at 0.6x and 0.8x scale
- **Opacity**: Base 0.04-0.08 per layer (3 layers compound to visible cloud)
- **Wrap**: Same pattern as stars — respawn at random position 100-200 units from ship when > 250 units away
- **Performance**: Sprites are cheap. The particle burst on flythrough uses a shared pool of 100 particles (ring buffer, same pattern as thruster)

### Functions
```
createNebulaTexture(color)          — 256x256 canvas radial gradient, returns CanvasTexture
createNebulaClouds(scene)           — 25 clouds × 3 layers = 75 sprites, returns { clouds, dustPool }
  clouds: [{ sprites: [s1,s2,s3], baseScale, color, lightningTimer, light }]
  dustPool: { mesh, positions, velocities, lifetimes, count, head }
updateNebulaClouds(nebulae, shipGroup, physics, elapsed, delta)
  — wraps clouds, pulses scale, lightning flashes, proximity dust burst, tint lights
```

### Animation Loop Additions
```javascript
// In flight mode:
updateNebulaClouds(elements.nebulae, shipGroup, physics, elapsed, delta);

// In always-on (intro):
// Nebulae visible but static, gentle scale pulse only
elements.nebulae.clouds.forEach(c => { /* scale pulse */ });
```

### Estimated Lines: ~90

---

## 2. Ship Shield/Aura — "Energy Field of Pure RGB Power"

A multi-layered energy shield that makes the ship look like it's wrapped in power.

### Visual Design
- **Double shell**: Outer wireframe sphere + inner solid sphere with high transparency
- **Hexagonal wireframe**: Use `IcosahedronGeometry(7, 1)` for the outer shell — gives a hex-grid look like sci-fi energy shields
- **Inner glow**: Solid `SphereGeometry(6, 32, 32)` with very low opacity (0.02), same RGB color — creates a soft volumetric glow inside the wireframe
- **RGB sync**: Both shells cycle color in sync with the title text HSL hue
- **Speed reactivity**:
  - Idle: wireframe opacity 0.04, barely visible shimmer
  - Moving: opacity 0.10, visible hex grid
  - Boost: opacity 0.20, bright crackling energy
- **Pulse wave**: A sine wave modulates opacity across the sphere — creates a "breathing" effect. Frequency increases with speed (idle: 0.5 Hz, boost: 3 Hz)
- **Boost impact ripple**: On boost start, the shield does a rapid scale pulse: 1.0 → 1.3 → 1.0 over 0.4s with easeOutElastic. Combined with opacity spike to 0.35
- **Hit sparks**: When flying within 5 units of an asteroid, spawn 10 tiny white sparks on the shield surface (random points on sphere) — looks like deflecting debris. Sparks live 0.3s
- **Rotation**: Outer wireframe slowly counter-rotates relative to ship (rotation.y -= 0.1 * delta) for visual interest. Inner sphere rotates the other way

### Technical Details
- **Outer shell**: `IcosahedronGeometry(7, 1)` + `MeshBasicMaterial({ wireframe: true, transparent: true, blending: AdditiveBlending })`
- **Inner shell**: `SphereGeometry(6, 32, 32)` + `MeshBasicMaterial({ transparent: true, blending: AdditiveBlending })`
- **Both added to `shipGroup`** so they move/rotate with the ship
- **Spark pool**: 30 particles, same ring buffer pattern as thrusters, positioned on sphere surface using random spherical coordinates

### Functions
```
createShipShield()          — returns { outer, inner, sparks: { mesh, positions, lifetimes, count }, flashTime, rippleScale }
updateShipShield(shield, physics, input, elapsed, delta, hue, asteroids, shipGroup)
  — color cycle, opacity scale, pulse wave, ripple animation, asteroid proximity sparks
```

### Animation Loop Additions
```javascript
// In flight mode, after RGB cycling:
if (input.boost && !state.prevBoost) shield.flashTime = elapsed;  // reuse boost edge detection
const hue = (elapsed * 0.3 * speedBoost) % 1;  // already computed
updateShipShield(elements.shield, physics, input, elapsed, delta, hue, elements.asteroids, shipGroup);
```

### Estimated Lines: ~75

---

## 3. Asteroid Field — "Space Rocks From Hell"

Not just decorative props — menacing, varied, and alive.

### Visual Design
- **Procedural geometry**: Each asteroid is an `IcosahedronGeometry` with random vertex displacement — no two look alike. 3 detail levels: small (detail 0), medium (detail 1), large (detail 1)
- **Size variety**: Ranges from 0.3 (pebbles) to 4.0 (boulders). A few massive ones (6-8 units) for dramatic scale
- **Material variety**: 3 material types randomly assigned:
  - **Rocky**: dark grey (0x444444), roughness 0.95, metalness 0.1
  - **Metallic**: silver-grey (0x888899), roughness 0.3, metalness 0.8 — catches light dramatically
  - **Crystal**: deep blue/purple tint (0x3344aa), roughness 0.2, metalness 0.6, slight emissive (0x111133) — alien mineral deposits
- **Tumble rotation**: Each asteroid has random angular velocity on all 3 axes (0.1-1.5 rad/s). Bigger ones rotate slower (inverse size scaling)
- **Count**: 35 asteroids (20 on mobile)
- **Debris cloud**: 200 tiny particle points (size 0.15) clustered loosely around asteroid positions — makes the field feel dense. Uses same wrapping system
- **Proximity warning**: When ship is within 8 units of a large asteroid (size > 3), the asteroid's nearest edge emits a faint red glow (add temporary point light). Creates tension
- **Collision sparks**: When within 3 units, spawn shield sparks (handled by shield system)

### Technical Details
- **Vertex displacement**: For each vertex in icosahedron, multiply position by `(1 + (Math.random() - 0.5) * 0.4)` — creates irregular rocky surface
- **Scatter volume**: 250-unit spread, same as books but offset so they don't overlap book positions (different Y range: books at ±50, asteroids at ±80)
- **Wrap distance**: 150 units from ship, respawn at 80-150 units ahead in random direction
- **Debris particles**: `THREE.Points` with grey vertex colors, size 0.15, opacity 0.15, normal blending

### Functions
```
createAsteroidGeometry(size, detail)  — returns displaced IcosahedronGeometry
createAsteroidMaterial(type)          — returns one of 3 material presets
createAsteroidField(scene)            — returns { group, debris: Points, proximityLight }
wrapAsteroids(asteroids, shipPos)     — same pattern as wrapBooks
updateAsteroidField(asteroids, shipGroup, elapsed, delta)
  — rotates each asteroid, updates debris positions, proximity light
```

### Animation Loop Additions
```javascript
// Always-on:
updateAsteroidField(elements.asteroids, shipGroup, elapsed, delta);

// Flight mode:
wrapAsteroids(elements.asteroids, shipGroup.position);
```

### Estimated Lines: ~100

---

## 4. Warp Tunnel on Boost — "PUNCH IT, CHEWIE"

The crown jewel. When you boost, reality tears open.

### Visual Design
- **Multi-ring tunnel**: Not one cylinder — 4 concentric cylinders at radii 6, 10, 15, 22. Each with different opacity and scroll speed. Creates depth parallax
- **Color bands**: Procedural texture with bands of electric blue, purple, white, and the current RGB hue color. Bands are not uniform — varying widths with gaussian noise
- **Scroll speed**: Inner rings scroll faster than outer (parallax). Inner: elapsed * 4, outer: elapsed * 1.5. Creates convincing depth
- **Chromatic split**: During warp, the existing bloom pass threshold drops from 0.85 to 0.3 — everything blooms intensely. Returns to normal over 0.5s when boost releases
- **Entry animation**: On boost start:
  1. Rings scale from 0 radius to full over 0.3s (iris-open effect)
  2. Brief white flash (existing boost flash, but intensified — opacity 0.8)
  3. All existing speed lines triple in length
- **Exit animation**: On boost release:
  1. Rings scale from full to 0 over 0.5s
  2. Brief "snap-back" — FOV overshoots back to 55 then returns to 60 (rubber band)
  3. Speed lines gradually shorten
- **Star stretch**: During boost, the starfield points each get a second "tail" position stretched along the velocity direction — stars become streaks. Achieved by temporarily switching the starfield to `LineSegments` geometry... OR simpler: just dramatically increase speed line count/opacity during warp to fake it
- **Color pulse rings**: Every 0.5s during boost, a bright ring (torus) spawns at the far end of the tunnel and rushes toward the camera, then disappears. 3-ring pool, staggered timing. Looks like sonar pings flying past

### Technical Details
- **4 cylinders**: `CylinderGeometry(r, r, 200, 24, 1, true)` with `THREE.BackSide`
- **Textures**: Generated canvas 512x64 with horizontal bands of varying brightness/color, `wrapS/wrapT = RepeatWrapping`, `repeat.set(1, 4)` for tiling
- **Materials**: `MeshBasicMaterial({ map, transparent, blending: AdditiveBlending, side: BackSide, depthWrite: false })`
- **Pulse rings**: `TorusGeometry(r, 0.3, 8, 32)` with `MeshBasicMaterial`, additive blending. Pool of 3, positioned along tunnel Z axis
- **All parented to camera** (via scene group that tracks camera position + ship quaternion)
- **Opacity**: Outer rings 0.05-0.08, inner rings 0.12-0.18. Multiplied by fade-in/out factor
- **Bloom modulation**: Store reference to `bloomPass` and lerp `threshold` during warp

### Functions
```
createWarpTunnelTexture(width, hueShift)  — 512x64 canvas with colored bands
createWarpTunnel(scene)                    — returns { rings: [4 meshes], pulseRings: [3 torus meshes],
                                                       opacity: 0, active: false, entryTime: 0, exitTime: 0 }
updateWarpTunnel(tunnel, camera, shipGroup, physics, input, delta, elapsed, bloomPass)
  — positions rings on camera, scrolls textures, handles entry/exit animations,
    spawns pulse rings, modulates bloom
```

### Animation Loop Additions
```javascript
// In flight mode, after chase camera + screen shake:
updateWarpTunnel(elements.warpTunnel, camera, shipGroup, physics, input, delta, elapsed, bloomPass);
```

### Estimated Lines: ~120

---

## 7. Barrel Roll — "DO A BARREL ROLL!"

A gratuitous aerial maneuver with maximum visual payoff.

### Visual Design
- **The roll itself**: Full 360° rotation on the ship's local Z axis over 0.6 seconds. Eased with `easeInOutCubic` for snappy feel — fast in the middle, smooth start/end
- **Direction**: Double-tap A = roll left (clockwise from behind), double-tap D = roll right
- **Ghost trail**: During the roll, spawn 6 translucent afterimage meshes of the title text at staggered intervals. Each ghost fades from 0.3 opacity to 0 over 0.4s and stays at the position where it was spawned. Creates a "motion blur" arc. Uses the title mesh geometry, cloned with low-opacity material
- **Particle spiral**: During roll, the thruster particles spawn rate 4x, and their outward velocity gets a rotational component — particles spiral outward in a corkscrew. Achieved by adding angular velocity to thruster spawn direction based on roll progress
- **Camera sympathy roll**: Camera does a subtle 15° sympathetic roll in the same direction, lagging behind the ship. Makes the viewer feel the motion. Decays back to 0 over 0.5s after roll completes
- **Screen edge flash**: During roll, thin bright lines appear on the left or right screen edge (direction of roll). CSS border-glow on the canvas, or a narrow plane mesh
- **Combo counter**: If you do a second barrel roll within 1.5s of the first completing, show "COMBO x2!" text briefly. Stacks up to x5 with increasingly ridiculous messages: "COMBO x2!", "TRIPLE ROLL!", "QUAD SPIN!", "ABSOLUTELY MENTAL!"
- **Speed boost**: Each roll gives a brief 20% speed boost that decays over 1s (add to velocity in forward direction)

### Technical Details
- **Double-tap detection**: In keydown handler, track `input.lastLeftTap` and `input.lastRightTap` timestamps. If same key pressed within 250ms, trigger roll
- **Roll state**: `state.barrelRoll = { active: false, direction: 1, startTime: 0, duration: 0.6, comboCount: 0, lastRollEnd: 0 }`
- **Ghost meshes**: Pool of 6 `THREE.Mesh` objects using a shared low-opacity material. Positioned at ship position at intervals during roll (every 60° of rotation). Added to scene (world space)
- **Input lock**: During roll, `input.left/right` are suppressed (prevent conflicting turns). Forward/backward/boost still work
- **Camera roll**: Add `state.cameraRollOffset` that lerps toward 0 after roll ends

### Functions
```
initBarrelRollGhosts(scene)           — creates pool of 6 ghost meshes, returns array
triggerBarrelRoll(state, input, direction)  — sets up roll state, increments combo if recent
updateBarrelRoll(state, shipGroup, camera, elements, elapsed, delta)
  — animates roll rotation, spawns ghosts, applies camera sympathy, speed boost
  — returns true if roll is active (to suppress turning input)
showComboText(comboCount)             — flashes combo message via DOM overlay
```

### Input Changes
```javascript
// In keydown handler, add:
case 'KeyA': case 'ArrowLeft':
  input.left = true;
  const now = performance.now();
  if (now - input.lastLeftTap < 250) { /* trigger left roll */ }
  input.lastLeftTap = now;
  break;
// Same for D/ArrowRight with lastRightTap
```

### Animation Loop Additions
```javascript
// In flight mode, before updateShipPhysics:
const rolling = updateBarrelRoll(state, shipGroup, camera, elements, elapsed, delta);
if (rolling) { input.left = false; input.right = false; }  // suppress turning during roll
```

### Estimated Lines: ~100

---

## 10. Contrail / Smoke Trail — "Twin Engine Exhaust"

Not one trail — two. One from each engine (D side and s side), like a fighter jet.

### Visual Design
- **Dual trails**: Two independent contrails, one spawning from x=-8 (left engine) and one from x=+8 (right engine) in ship-local space
- **Smoke appearance**: Larger particles than rainbow trail (size 1.0), white/light grey, with vertex color fading from bright white → grey → transparent as they age
- **Turbulence dispersion**: As particles age, they drift slightly outward and downward (gravity-like sag + random lateral spread). Each particle gets a small random velocity on spawn
- **Width scaling**: At low speed, trails are wide and puffy (large spread). At high speed, trails are tight and focused (small spread). During boost, trails are razor-thin streaks
- **Opacity scaling**: Thicker at the engine, fading to nothing. Newest particles: opacity 0.4, fading linearly to 0 over 4 seconds
- **Speed-reactive emit rate**: At idle, emit every 3rd frame. Moving: every frame. Boost: 2 per frame per engine
- **Interaction with nebulae**: When a contrail particle is near a nebula (< 20 units), its color blends toward the nebula's color. Creates effect of exhaust being "painted" by nebula gas
- **Wind shear**: Particles gradually drift in a consistent direction (simulated solar wind) — gives the trails a slight curve rather than being perfectly straight

### Technical Details
- **Two ring buffers**: 400 points each (250 on mobile), independent head pointers
- **Per-particle data**: position (vec3), color (vec3), age (float), velocity (vec3)
- **Material**: `PointsMaterial({ size: 1.0, vertexColors: true, transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true })`
- **Spawn position**: Transform local offset (±8, random ±0.3, 0.5) to world space via ship quaternion (same pattern as thruster)
- **Aging**: Each frame, iterate all particles: `age += delta`, update color brightness `= max(0, 1 - age/4)`, apply velocity drift

### Functions
```
createContrail(scene, side)    — creates one trail, returns { mesh, positions, colors, ages, velocities, count, head }
  side: -8 or +8 (local X offset)
updateContrail(trail, shipGroup, physics, nebulae, delta, side)
  — spawns new particles at engine position, ages existing, applies drift + nebula tinting
```

### Animation Loop Additions
```javascript
// In flight mode, after rainbow trail:
updateContrail(elements.contrailL, shipGroup, physics, elements.nebulae, delta, -8);
updateContrail(elements.contrailR, shipGroup, physics, elements.nebulae, delta, 8);
```

### Estimated Lines: ~80

---

## 11. Minimap — "Tactical Space Radar"

A proper military-grade HUD radar, not just dots on a circle.

### Visual Design
- **Rotating sweep line**: A bright green line that rotates 360° every 2 seconds, like actual radar. Objects "light up" when the sweep passes over them and then slowly fade
- **Concentric range rings**: 3 dashed circles at 33%, 66%, 100% of radar range. Labeled with distance
- **Ship indicator**: Center triangle (green, solid) pointing in the current heading direction
- **Book blips**: Small dots colored by category (using CATEGORY_COLORS). When sweep passes over them, they flash bright then fade over 2 seconds. Each has a tiny label with the first 3 letters of the book title
- **Asteroid blips**: Small grey triangles (danger indicators). Flash red when within collision range
- **Nebula zones**: Faint colored circular patches on the radar showing nebula positions and approximate size
- **Edge glow**: Books that are just outside radar range get a subtle indicator at the radar edge (direction only, no distance)
- **Design**: Dark navy background (rgba(0,5,20,0.8)), bright green (#00ff88) for UI elements, circular with scan-line aesthetic
- **Size**: 150x150px on desktop, 100x100px on mobile
- **Fade in**: Appears 1s after flight mode starts, slides in from bottom-left

### Technical Details
- **HTML canvas**: `<canvas id="minimap" width="150" height="150">` with 2D context
- **Update rate**: Every 2nd frame (30fps effective) to save CPU
- **Radar range**: 120 units (shows everything within 120 units of ship)
- **Coordinate transform**: For each object, compute relative position, rotate by negative ship Y rotation, scale to canvas pixels
- **Sweep angle**: `sweepAngle = (elapsed * Math.PI) % (Math.PI * 2)` — one full rotation per 2 seconds
- **Blip fade**: Each blip stores the elapsed time when it was last "swept". Brightness = max(0.15, 1 - (elapsed - lastSweep) / 2). Minimum brightness keeps dots barely visible between sweeps
- **Asteroid proximity pulse**: Asteroids within 20 units of ship get a pulsing red ring around their blip

### HTML Addition
```html
<canvas id="minimap" width="150" height="150" style="display:none; position:fixed; bottom:20px;
  left:20px; z-index:10000; border-radius:50%; pointer-events:none;
  border:1px solid rgba(0,255,136,0.3); box-shadow:0 0 10px rgba(0,255,136,0.1);"></canvas>
```

### Functions
```
initMinimap()                          — gets canvas + 2D context, returns ctx
updateMinimap(ctx, shipGroup, bookGroup, asteroids, nebulae, elapsed)
  — clears, draws background, range rings, sweep line, blips (books/asteroids/nebulae), ship indicator
drawSweepLine(ctx, cx, cy, radius, angle)          — rotating radar sweep
drawBlip(ctx, x, y, color, brightness, label)      — single radar blip with fade
drawShipIndicator(ctx, cx, cy)                      — center triangle
drawRangeRings(ctx, cx, cy, radius)                 — concentric dashed circles
```

### Animation Loop Additions
```javascript
// In flight mode (every 2nd frame):
if (state.minimapFrame++ % 2 === 0) {
  updateMinimap(elements.minimapCtx, shipGroup, elements.bookGroup,
    elements.asteroids, elements.nebulae, elapsed);
}
```

### Estimated Lines: ~110

---

## 12. Flip/Reverse — "TOKYO DRIFT IN SPACE"

Press Q for a cinematic 180° flip that preserves momentum — you're now flying backward looking at where you came from.

### Visual Design
- **The flip**: Smooth 180° Y rotation over 0.8 seconds, eased with `easeInOutBack` for dramatic overshoot feel
- **Bullet time effect**: During the flip, the entire scene briefly slows to 0.3x speed for 0.4s (the middle of the flip). Delta is multiplied by a time-scale factor. Everything feels epic and weighty. Time-scale lerps: 1.0 → 0.3 over 0.2s → back to 1.0 over 0.2s
- **Camera swoop**: Camera swings wide during the flip — the chase camera offset temporarily increases to 20 units back, creating a dramatic pull-out that reveals the full flip. Returns to normal over 1s after flip completes
- **Particle burst**: At flip completion, 50 particles explode outward from ship center in a spherical burst. Bright white, fade to blue, 0.5s lifetime. Like a shockwave
- **Engine glow surge**: Both engine glows spike to 800 intensity during flip (current max is 300 for boost). Creates dramatic light flare
- **"FLIP!" text**: Brief text overlay that flashes and fades. Uses DOM element, monospace font, appears for 0.8s. If done during boost, shows "REVERSE BOOST!" instead
- **Velocity preservation**: Momentum continues in the original direction. After flip, the ship is facing backward but still moving forward — true space physics. Player must thrust to change direction. This creates a natural "drifting backward" state that looks amazing with the contrails streaming past
- **Auto-camera**: The chase camera naturally handles the flip since it always looks at ship front. So after flip you see where you came from + your trails + books streaming past

### Technical Details
- **Flip state**: `state.flip = { active: false, startTime: 0, startRotY: 0, duration: 0.8, timeScale: 1.0 }`
- **Q key**: Added to keydown handler. Only triggers if `!state.flip.active && !state.barrelRoll.active` (no stacking with barrel roll)
- **Rotation**: `shipGroup.rotation.y = startRotY + Math.PI * easeInOutBack(t / duration)`
- **Time scale**: Multiply `delta` by `state.flip.timeScale` for all physics/particle updates during flip. Renderer still runs at full framerate — only simulation slows
- **Particle burst**: Reuse a pool of 50 particles (same ring buffer pattern). On flip complete, spawn all 50 at ship position with random spherical velocities
- **Camera distance**: Temporarily add `flipCameraOffset` to chase camera base distance. Lerps from 0 → 8 during flip → back to 0 over 1s

### Functions
```
triggerFlip(state, shipGroup)       — sets state, captures startRotY
updateFlip(state, shipGroup, camera, elements, elapsed, delta)
  — interpolates rotation, manages time-scale, camera swoop, engine glow, particle burst
  — returns timeScale factor for frame
createFlipBurst(scene)              — pool of 50 particles for completion burst
showFlipText(isBoosting)            — DOM overlay "FLIP!" or "REVERSE BOOST!"
```

### Input Changes
```javascript
// In keydown handler:
case 'KeyQ':
  if (input.active && !state.flip.active && !state.barrelRoll.active) {
    triggerFlip(state, shipGroup);
  }
  break;
```

### Animation Loop Additions
```javascript
// In flight mode, before physics:
let frameTimeScale = 1.0;
if (state.flip.active) {
  frameTimeScale = updateFlip(state, shipGroup, camera, elements, elapsed, delta);
}
const scaledDelta = delta * frameTimeScale;
// Use scaledDelta for all subsequent physics/particle updates this frame
```

### Estimated Lines: ~90

---

## Summary

| # | Feature | Type | Est. Lines | Visual Impact |
|---|---------|------|-----------|---------------|
| 1 | Nebula clouds | Environment | ~90 | Multi-layer color fog with lightning + dust interaction |
| 2 | Ship shield/aura | Ship cosmetic | ~75 | Hex wireframe energy sphere, RGB-synced, ripple on boost |
| 3 | Asteroid field | Environment | ~100 | Varied rocks with 3 material types, debris cloud, proximity glow |
| 4 | Warp tunnel | Boost effect | ~120 | 4-ring parallax tunnel with pulse rings + bloom modulation |
| 7 | Barrel roll | Input action | ~100 | Ghost trail, particle spiral, combo counter, speed boost |
| 10 | Contrail trail | Ship cosmetic | ~80 | Dual engine smoke with turbulence + nebula color blending |
| 11 | Minimap | HUD | ~110 | Animated radar sweep, range rings, category-colored blips |
| 12 | Flip/reverse | Input action | ~90 | Bullet-time 180, camera swoop, particle burst, momentum drift |
| | **Total** | | **~765** | |

## Changes by File

### `index.html`
- Add minimap canvas element with radar styling
- Add combo text overlay div (for barrel roll)
- Add flip text overlay div
- Exclude new elements from `beginTransformation` hide logic

### `scene.js`
- **New functions**: ~24 functions across 8 features
- **Modify `createInputState()`**: add Q key, double-tap tracking (lastLeftTap, lastRightTap)
- **Modify `initThreeScene()`**: create all new objects, add to elements
- **Modify `startAnimationLoop()`**: add update calls for all new systems, time-scale support
- **Modify `elements` object**: add nebulae, shield, asteroids, warpTunnel, contrailL, contrailR, minimapCtx, flipBurst, barrelRollGhosts
- **Modify `state` object**: add barrelRoll, flip, minimapFrame, cameraRollOffset
- **Estimated net addition**: ~765 lines

### `tests/static.test.mjs`
- Add tests for each new feature (~40 lines)

## Implementation Order

Best order to minimize conflicts and allow incremental testing:

1. **Asteroid field** (standalone environment, no dependencies)
2. **Nebula clouds** (standalone environment, referenced by contrail later)
3. **Ship shield** (depends on asteroids for proximity sparks)
4. **Contrail trail** (depends on nebulae for color blending)
5. **Warp tunnel** (depends on existing boost detection + bloom pass reference)
6. **Barrel roll** (input system changes)
7. **Flip/reverse** (input system changes, time-scale affects everything)
8. **Minimap** (reads from all other systems, do last)

## Verification

1. `node --test tests/static.test.mjs` — all pass
2. Push, wait for GitHub Pages deploy
3. Visual checks per feature:
   - **Nebulae**: Colored fog clouds visible, lightning flashes, dust particles when flying through
   - **Shield**: Hex wireframe visible around title, RGB color sync, ripple on boost, sparks near asteroids
   - **Asteroids**: Grey/metallic/crystal rocks tumbling in space, debris particles, proximity glow
   - **Warp tunnel**: 4-ring tunnel appears on boost with scrolling texture, pulse rings fly past, bloom intensifies
   - **Barrel roll**: Double-tap A/D → 360 spin with afterimage ghosts, combo counter works
   - **Contrails**: Dual white smoke trails from engines, fade over 4s, drift and disperse
   - **Minimap**: Radar sweep visible, books as colored dots, asteroids as triangles, range rings
   - **Flip**: Q → bullet-time 180, camera swoops wide, particle burst on completion, momentum preserved
4. `node tests/e2e.test.cjs` — canvas non-black, no JS errors
5. Performance: maintain 60fps on desktop, 30fps on mobile (check with devtools)
6. No regressions on existing effects (thrusters, speed lines, rainbow trail, etc.)
