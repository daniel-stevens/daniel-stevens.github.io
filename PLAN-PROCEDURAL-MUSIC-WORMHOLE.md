# Plan: Procedural Background Music + Wormhole Portal

**Date: 2026-02-27**

## Context

Two more over-the-top features for the personal site. The user selected "Procedural Music + Wormhole" from four proposed options. Both integrate with the existing RGB slider, sound engine, post-processing pipeline, minimap, and achievement system. Scene.js is ~4314 lines, 155 static tests, 13 E2E tests — all passing. Last commit: `ce640b6`.

## Files to Modify

- **`scene.js`** — new shader, all new functions (~380 new lines)
- **`index.html`** — 1 new HUD div (wormhole cooldown), updated flight-hud text
- **`tests/static.test.mjs`** — ~60 new test lines (2 new describe blocks)

## Implementation Order

1. **Procedural Background Music** (standalone, no dependencies on wormhole)
2. **Wormhole Portal** (new shader pass, new entity, dimension shift mechanic)

## Post-Processing Pipeline Change

```
RenderPass → UnrealBloomPass → ChromaPass → MotionBlurPass → LensingPass → CrackPass → DimensionShiftPass → OutputPass
```

One new shader pass: `DimensionShiftShader` — inserted before OutputPass.

---

## Feature 1: Procedural Background Music (~160 lines)

### Core Concept
Beat-scheduled layered synthesis using Web Audio API. BPM scales with ship speed (60 idle → 140 at max speed). All volumes scale with `rgb * 0.15`. Layers fade in/out based on game state.

### Functions

**`createProceduralMusic(sound)`** → `{ layers, nextBeatTime, bpm, active }` or `null`
- Guard: `if (!sound || !sound.ctx) return null`
- Create 5 layer gain nodes, all connected to `sound.masterGain`:
  1. **Bass kick**: Pre-rendered buffer (sine 60Hz, 0.1s exponential decay). Plays every beat.
  2. **Arpeggio**: Pentatonic scale `[261.6, 293.7, 329.6, 392.0, 440.0]` (C4-A4). Square wave → lowpass filter (800Hz). Plays 16th notes, cycling through scale. Volume ramps up when speed > 10.
  3. **Hi-hat**: Pre-rendered white noise buffer (0.05s). Bandpass 8000Hz, Q=1. Plays on off-beats (every other 8th note).
  4. **Ambient pad**: Two detuned triangle oscillators (220Hz, 221.5Hz) → lowpass 400Hz. Always playing at low volume, swells with `rgb`.
  5. **Combat layer**: Sawtooth 110Hz → distortion (waveshaper) → bandpass 300Hz. Activates during comet storms or when enemies nearby.
- Set `nextBeatTime = sound.ctx.currentTime`
- Pre-render kick and hi-hat buffers once at creation time

**`updateProceduralMusic(music, sound, physics, state, rgb, delta)`**
- Guard: `if (!music || !sound || sound.ctx.state !== 'running') return`
- Calculate BPM: `60 + (physics.speed / physics.maxSpeed) * 80`, clamp [60, 140]
- `beatInterval = 60 / bpm`
- While `nextBeatTime < sound.ctx.currentTime + 0.1` (lookahead scheduling):
  - Schedule kick buffer at `nextBeatTime`
  - Schedule arp note at 16th-note subdivisions (every `beatInterval / 4`)
  - Schedule hi-hat on off-beats (every `beatInterval / 2`, offset by `beatInterval / 4`)
  - Advance `nextBeatTime += beatInterval / 4` (16th note resolution)
- Update layer gains smoothly each frame:
  - Pad: `rgb * 0.08`
  - Kick: `rgb * 0.12`
  - Arp: `rgb * 0.1 * Math.min(1, physics.speed / 15)` (fades in above speed 15)
  - Hi-hat: `rgb * 0.06`
  - Combat: `rgb * 0.1` when `state.cometStorm.active`, else lerp toward 0

### Integration Points
- **Elements**: Add `music: null` to elements object
- **initThreeScene**: `elements.music = createProceduralMusic(elements.sound)` after sound creation
- **Animation loop**: Call `updateProceduralMusic(elements.music, elements.sound, physics, state, rgb, delta)` after `updateEngineSound`

---

## Feature 2: Wormhole Portal (~220 lines)

### Core Concept
A swirling torus portal spawns in space. Flying through it triggers a "dimension shift" — the entire scene gets a psychedelic color transform via a new post-processing shader. An exit wormhole spawns in the alternate dimension to return. Physics change slightly in the alternate dimension.

### New Shader: `DimensionShiftShader`

Add after `ScreenCrackShader` definition (around line 133):

```javascript
const DimensionShiftShader = {
  uniforms: {
    tDiffuse: { value: null },
    shiftAmount: { value: 0.0 },    // 0 = normal, 1 = full shift
    time: { value: 0.0 },
  },
  fragmentShader: `
    // RGB→HSV→RGB with hue rotation by shiftAmount * 120deg
    // Posterize effect: floor(color * (3 + shiftAmount * 5)) / (3 + shiftAmount * 5)
    // Vignette tint: purple edges at shiftAmount > 0.5
  `,
};
```

### Functions

**`createWormhole(scene)`** → `{ group, ringMesh, particles, innerGlow, active, exitWormhole }`
- Ring: `TorusGeometry(6, 0.8, 16, 64)`, purple emissive (`#8800ff`), additive blending, opacity 0.8
- Inner glow: `SphereGeometry(5, 16, 16)`, purple emissive, additive, opacity 0.3
- 200 spiral particles: small `SphereGeometry(0.1)` arranged in spiral around torus, additive white material
- Initial position: 80-120 units from origin in random direction
- `active: true` (entry wormhole always visible)
- `exitWormhole: null` (created on dimension shift)

**`createExitWormhole(scene, shipGroup)`** → same structure as createWormhole but:
- Color: cyan (`#00ffcc`) instead of purple
- Spawns 60-100 units from current ship position
- Used to return from alternate dimension

**`updateWormhole(wormhole, shipGroup, state, elements, elapsed, delta, rgb)`**
- Ring rotation: slow spin `ring.rotation.z += delta * 0.5`
- Particle spiral animation: each particle orbits the torus path with offset
- Inner glow pulse: `opacity = 0.2 + 0.15 * sin(elapsed * 2)`, scaled by rgb
- Emissive intensity scales with rgb
- **Proximity check** (< 8 units from center): `triggerDimensionShift(state, elements, shipGroup, elapsed)`
- Wrap: if > 250 from ship, respawn 80-120 units away (only in normal dimension)
- If in alternate dimension: update exit wormhole similarly, proximity triggers return

**`triggerDimensionShift(state, elements, shipGroup, elapsed)`**
- Toggle `state.wormhole.inAlternateDimension`
- If entering alternate dimension:
  - Show "DIMENSION SHIFT!" action text
  - Bloom flash (strength → 2.5, lerps back)
  - Trigger shockwave at entry point
  - Spawn exit wormhole: `elements.wormhole.exitWormhole = createExitWormhole(scene, shipGroup)`
  - Hide entry wormhole
  - Set `state.wormhole.shiftLerp` target to 1.0
  - Start cooldown (3s — prevents instant re-entry)
  - Modify physics: `physics.drag = 0.985` (from 0.97 — floatier)
  - Reduce black hole gravity multiplier: `state.wormhole.gravityMult = 0.3`
  - `state.achievements.stats.dimensionShifts++`
- If returning:
  - Show "RETURNING TO REALITY!" action text
  - Bloom flash
  - Shockwave
  - Remove exit wormhole from scene
  - Show entry wormhole, respawn it 80-120 units away
  - Set `state.wormhole.shiftLerp` target to 0.0
  - Restore physics: `physics.drag = 0.97`
  - `state.wormhole.gravityMult = 1.0`
  - Start cooldown (3s)

**`updateDimensionShift(state, elements, delta)`**
- Lerp `state.wormhole.shiftAmount` toward target (speed: `delta * 2`)
- Update shader uniform: `elements.dimensionShiftPass.uniforms.shiftAmount.value = state.wormhole.shiftAmount`
- Update shader time uniform
- When in alternate dimension: tint stars slightly purple by adjusting star material color

**`createWormholeSound(sound)`** → `{ osc1, osc2, gain }` or `null`
- Two detuned triangle oscillators (55Hz, 57Hz) → bandpass 100Hz, Q=3
- Connect gain → `sound.masterGain`
- Pattern matches `createBlackHoleDrone` / `createWhaleSong`

**`updateWormholeSound(wormholeSound, distance, maxRange, rgb)`**
- Volume scales with proximity², maxRange=60
- Pattern matches `updateWhaleSong`

**`triggerWormholeSound(sound)`**
- Trigger sound: rising sweep (100Hz→1500Hz) + reverb-like delay
- Pattern matches `triggerJumpSound`

### State additions
```javascript
state.wormhole = {
  inAlternateDimension: false,
  shiftAmount: 0,       // current lerp value
  shiftTarget: 0,       // target lerp value
  cooldown: 0,          // prevents instant re-entry
  gravityMult: 1.0,     // applied to black hole gravity
}
```

### Elements additions
```javascript
elements.wormhole = null        // createWormhole result
elements.wormholeSound = null   // createWormholeSound result
elements.dimensionShiftPass = null  // ShaderPass reference
```

### Minimap
- Add `wormhole` parameter (10th param) to `updateMinimap`
- Entry wormhole: purple filled circle with rotating ring indicator
- Exit wormhole (if active): cyan filled circle

### HUD
- `wormhole-cooldown-hud` div: shows "WORMHOLE READY" / "WORMHOLE: Xs" during cooldown
- Add to `beginTransformation` exclude list
- Add to `showFlightHUD`
- Update flight-hud text: add "fly through wormholes"

### Black Hole Gravity Integration
- In `updateBlackHole`, multiply gravity force by `state.wormhole.gravityMult`
- Requires adding `state` parameter to `updateBlackHole` signature

---

## Achievement Integration

### 1 new achievement in ACHIEVEMENTS array:
- **DIMENSION HOPPER**: Enter alternate dimension (`dimensionShifts >= 1`)

### New stats:
- `dimensionShifts: 0`

---

## HTML Changes

### New HUD element (before `<style>` tag):
```html
<div id="wormhole-cooldown-hud" style="display:none; position:fixed; bottom:85px; right:20px; z-index:10000; font-family:monospace; font-size:11px; color:rgba(136,0,255,0.8); pointer-events:none; background:rgba(0,0,0,0.4); padding:2px 8px; border-radius:3px;">WORMHOLE READY</div>
```

### Updated flight-hud text:
```
WASD to fly · SPACE to boost · Q to flip · double-tap A/D to barrel roll · F to fire · SHIFT to jump · E for EMP · fly through wormholes
```

### Update beginTransformation exclude list: add `wormhole-cooldown-hud`
### Update showFlightHUD: show `wormhole-cooldown-hud`

---

## Tests

### Describe block: "Procedural background music"
- `createProceduralMusic` function exists
- Creates oscillators/buffers and gain nodes
- `updateProceduralMusic` function exists
- BPM calculation scales with speed
- Lookahead beat scheduling pattern
- Layer gain updates reference rgb

### Describe block: "Wormhole portal"
- `DimensionShiftShader` exists with required uniforms
- `createWormhole` function exists
- Creates TorusGeometry ring and particle spiral
- `updateWormhole` function exists with proximity check
- `triggerDimensionShift` function exists
- Sets `inAlternateDimension` state and spawns exit wormhole
- `createWormholeSound` / `updateWormholeSound` functions exist
- `DIMENSION HOPPER` achievement exists
- Minimap accepts wormhole parameter
- DimensionShiftPass added to composer pipeline

---

## Verification

1. `node --test tests/static.test.mjs` — all pass
2. E2E test — canvas renders, no JS errors
3. Visual checks:
   - Music beats audible, BPM increases with speed, layers fade in/out
   - Purple swirling wormhole visible in space
   - Flying through triggers dimension shift — psychedelic color transform
   - Cyan exit wormhole in alternate dimension
   - Flying through exit returns to normal
   - Minimap shows wormhole blips
   - DIMENSION HOPPER achievement unlockable
   - RGB 0 = minimal effects, RGB 100 = maximum intensity
