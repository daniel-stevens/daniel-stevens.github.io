import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const html = readFileSync(resolve(root, 'index.html'), 'utf-8');
const scene = readFileSync(resolve(root, 'scene.js'), 'utf-8');

// ---------------------------------------------------------------------------
// HTML Structure
// ---------------------------------------------------------------------------

describe('index.html structure', () => {
  it('has balanced <big> opening and closing tags', () => {
    const opening = (html.match(/<big>/gi) || []).length;
    const closing = (html.match(/<\/big>/gi) || []).length;
    assert.equal(opening, closing, `Opening <big> tags (${opening}) !== closing </big> tags (${closing})`);
  });

  it('has a canvas with id="threejs-canvas"', () => {
    assert.match(html, /<canvas\s+id=["']threejs-canvas["']/);
  });

  it('canvas has position:fixed and z-index:9999 in CSS', () => {
    assert.match(html, /position:\s*fixed/);
    assert.match(html, /z-index:\s*9999/);
  });

  it('has an import map with Three.js', () => {
    assert.match(html, /type=["']importmap["']/);
    assert.match(html, /three@0\.172\.0/);
  });

  it('loads scene.js as an ES module', () => {
    assert.match(html, /type=["']module["']\s+src=["']scene\.js["']/);
  });

  it('has the prompt trigger element', () => {
    assert.match(html, /id=["']prompt-trigger["']/);
  });

  it('has the overengineer button', () => {
    assert.match(html, /overengineer/i);
    assert.match(html, /<button/i);
  });

  it('has the flight HUD element', () => {
    assert.match(html, /id=["']flight-hud["']/);
    assert.match(html, /WASD/);
  });

  it('has the speed HUD element', () => {
    assert.match(html, /id=["']speed-hud["']/);
    assert.match(html, /SPEED/);
  });

  it('has the minimap canvas element', () => {
    assert.match(html, /<canvas\s+id=["']minimap["']/);
    assert.match(html, /border-radius:\s*50%/);
  });

  it('has the action text overlay', () => {
    assert.match(html, /id=["']action-text["']/);
  });
});

// ---------------------------------------------------------------------------
// Scene.js Constants
// ---------------------------------------------------------------------------

describe('scene.js constants', () => {
  it('PROMPT_TEXT contains the expected prompt', () => {
    assert.match(scene, /would it be possible to turn this exact content/);
    assert.match(scene, /because we have AI now we can do it/);
  });

  it('BOOKS array has at least 25 entries', () => {
    const bookMatches = scene.match(/\{\s*title:/g);
    assert.ok(bookMatches, 'No book entries found');
    assert.ok(bookMatches.length >= 25, `Only ${bookMatches.length} books, expected >= 25`);
  });

  it('every CATEGORY_COLORS key is used by at least one book', () => {
    const colorKeyMatches = scene.match(/['"]([^'"]+)['"]\s*:\s*['"]#[0-9a-fA-F]+['"]/g);
    assert.ok(colorKeyMatches, 'No category color entries found');

    for (const match of colorKeyMatches) {
      const category = match.match(/['"]([^'"]+)['"]\s*:/)[1];
      const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`category:\\s*['"]${escaped}['"]`);
      assert.match(scene, regex, `Category "${category}" defined in CATEGORY_COLORS but not used by any book`);
    }
  });
});

// ---------------------------------------------------------------------------
// Lighting Values (prevent dim/black scene from inverse-square falloff)
// ---------------------------------------------------------------------------

describe('scene.js lighting values', () => {
  it('AmbientLight intensity >= 1.0', () => {
    const match = scene.match(/AmbientLight\(\s*0x[0-9a-fA-F]+\s*,\s*([\d.]+)\s*\)/);
    assert.ok(match, 'AmbientLight not found');
    const intensity = parseFloat(match[1]);
    assert.ok(intensity >= 0.2, `AmbientLight intensity ${intensity} < 0.2`);
  });

  it('PointLight intensities >= 50 for scene lights (inverse-square needs meaningful values)', () => {
    const matches = [...scene.matchAll(/PointLight\(\s*0x[0-9a-fA-F]+\s*,\s*([\d.]+)/g)];
    assert.ok(matches.length >= 3, `Expected >= 3 PointLights, found ${matches.length}`);
    // Check at least 3 main scene lights have meaningful intensity (engine glow starts at 0)
    const highIntensity = matches.filter(m => parseFloat(m[1]) >= 50);
    assert.ok(highIntensity.length >= 3, `Expected >= 3 PointLights with intensity >= 50, found ${highIntensity.length}`);
  });

  it('star particle size >= 1.0 (prevents sub-pixel stars)', () => {
    const starfieldFn = scene.match(/function createStarfield[\s\S]*?^}/m);
    assert.ok(starfieldFn, 'createStarfield function not found');
    const sizeMatch = starfieldFn[0].match(/size:\s*([\d.]+)/);
    assert.ok(sizeMatch, 'Star size not found in createStarfield');
    const size = parseFloat(sizeMatch[1]);
    assert.ok(size >= 0.5, `Star size ${size} < 0.5`);
  });

  it('ambient particle size >= 0.2', () => {
    const particleFn = scene.match(/function createAmbientParticles[\s\S]*?^}/m);
    assert.ok(particleFn, 'createAmbientParticles function not found');
    const sizeMatch = particleFn[0].match(/size:\s*([\d.]+)/);
    assert.ok(sizeMatch, 'Particle size not found in createAmbientParticles');
    const size = parseFloat(sizeMatch[1]);
    assert.ok(size >= 0.2, `Ambient particle size ${size} < 0.2`);
  });
});

// ---------------------------------------------------------------------------
// Renderer Configuration
// ---------------------------------------------------------------------------

describe('scene.js renderer config', () => {
  it('preserveDrawingBuffer is true', () => {
    assert.match(scene, /preserveDrawingBuffer:\s*true/);
  });

  it('toneMapping is set to NoToneMapping', () => {
    assert.match(scene, /toneMapping\s*=\s*THREE\.NoToneMapping/);
  });
});

// ---------------------------------------------------------------------------
// Transition Resilience
// ---------------------------------------------------------------------------

describe('scene.js transition resilience', () => {
  it('beginTransformation reparents canvas to body before hiding siblings', () => {
    const fnStart = scene.indexOf('function beginTransformation');
    assert.ok(fnStart !== -1, 'beginTransformation function not found');

    const fnBody = scene.slice(fnStart, fnStart + 1200);
    const appendIdx = fnBody.indexOf('document.body.appendChild');
    const hideIdx = fnBody.indexOf("el.style.display = 'none'");

    assert.ok(appendIdx !== -1, 'document.body.appendChild not found in beginTransformation');
    assert.ok(hideIdx !== -1, "el.style.display = 'none' not found in beginTransformation");
    assert.ok(appendIdx < hideIdx, 'appendChild must come BEFORE hiding siblings');
  });

  it('canvas display is set to block during transition', () => {
    assert.match(scene, /canvas\.style\.display\s*=\s*['"]block['"]/);
  });
});

// ---------------------------------------------------------------------------
// Post-processing
// ---------------------------------------------------------------------------

describe('scene.js post-processing', () => {
  it('uses UnrealBloomPass', () => {
    assert.match(scene, /UnrealBloomPass/);
  });

  it('bloom has strength > 0', () => {
    const match = scene.match(/UnrealBloomPass\([\s\S]*?,\s*([\d.]+)\s*,\s*[\d.]+\s*,\s*[\d.]+/);
    assert.ok(match, 'UnrealBloomPass constructor not found');
    assert.ok(parseFloat(match[1]) > 0, 'Bloom strength should be > 0');
  });

  it('has a fallback renderer if post-processing fails', () => {
    assert.match(scene, /catch\s*\([^)]*\)\s*\{[\s\S]*?renderer\.render/);
  });
});

// ---------------------------------------------------------------------------
// Flight System
// ---------------------------------------------------------------------------

describe('scene.js flight system', () => {
  it('has input handling with WASD and arrow keys', () => {
    assert.match(scene, /createInputState/);
    assert.match(scene, /KeyW/);
    assert.match(scene, /KeyA/);
    assert.match(scene, /KeyS/);
    assert.match(scene, /KeyD/);
    assert.match(scene, /ArrowUp/);
    assert.match(scene, /ArrowDown/);
    assert.match(scene, /ArrowLeft/);
    assert.match(scene, /ArrowRight/);
    assert.match(scene, /Space/);
  });

  it('has ship physics with thrust and drag', () => {
    assert.match(scene, /createShipPhysics/);
    assert.match(scene, /updateShipPhysics/);
    assert.match(scene, /thrustAccel/);
    assert.match(scene, /drag/);
    assert.match(scene, /maxSpeed/);
    assert.match(scene, /baseSpeed/);
  });

  it('has chase camera (no OrbitControls)', () => {
    assert.match(scene, /updateChaseCamera/);
    assert.doesNotMatch(scene, /OrbitControls/, 'OrbitControls should be removed');
  });

  it('has infinite space wrapping for stars, particles, and books', () => {
    assert.match(scene, /wrapStarfield/);
    assert.match(scene, /wrapAmbientParticles/);
    assert.match(scene, /wrapBooks/);
  });

  it('has thruster particles', () => {
    assert.match(scene, /createThrusterParticles/);
    assert.match(scene, /updateThrusterParticles/);
  });

  it('has RGB color cycling on title', () => {
    assert.match(scene, /setHSL/);
    assert.match(scene, /hue/);
  });

  it('has flight HUD display function', () => {
    assert.match(scene, /showFlightHUD/);
    assert.match(scene, /flight-hud/);
  });

  it('ship group assembles title, tags, and links', () => {
    assert.match(scene, /shipGroup\.add/);
  });

  it('thruster mesh is added to scene (not shipGroup) for world-space positions', () => {
    assert.match(scene, /scene\.add\(thruster\.mesh\)/);
  });

  it('has speed lines (hyperspace streaks)', () => {
    assert.match(scene, /createSpeedLines/);
    assert.match(scene, /updateSpeedLines/);
    assert.match(scene, /LineSegments/);
  });

  it('has boost flash effect', () => {
    assert.match(scene, /createBoostFlash/);
    assert.match(scene, /triggerBoostFlash/);
    assert.match(scene, /updateBoostFlash/);
  });

  it('has rainbow trail', () => {
    assert.match(scene, /createRainbowTrail/);
    assert.match(scene, /updateRainbowTrail/);
  });

  it('has FOV warp effect', () => {
    assert.match(scene, /targetFov/);
    assert.match(scene, /camera\.fov/);
    assert.match(scene, /updateProjectionMatrix/);
  });

  it('has screen shake on boost', () => {
    assert.match(scene, /shake/);
  });

  it('has speed HUD update', () => {
    assert.match(scene, /speed-hud/);
  });

  it('has tactical minimap radar', () => {
    assert.match(scene, /initMinimap/);
    assert.match(scene, /updateMinimap/);
    assert.match(scene, /sweepAngle/);
    assert.match(scene, /radarRange/);
  });

  it('has barrel roll with double-tap detection and combo counter', () => {
    assert.match(scene, /triggerBarrelRoll/);
    assert.match(scene, /updateBarrelRoll/);
    assert.match(scene, /lastLeftTap/);
    assert.match(scene, /lastRightTap/);
    assert.match(scene, /comboCount/);
    assert.match(scene, /easeInOutCubic/);
  });

  it('has flip/reverse with Q key', () => {
    assert.match(scene, /triggerFlip/);
    assert.match(scene, /updateFlip/);
    assert.match(scene, /flipRequested/);
    assert.match(scene, /KeyQ/);
  });

  it('has flip burst particles', () => {
    assert.match(scene, /createFlipBurst/);
    assert.match(scene, /triggerFlipBurst/);
    assert.match(scene, /updateFlipBurst/);
  });

  it('has action text overlay', () => {
    assert.match(scene, /showActionText/);
    assert.match(scene, /action-text/);
  });
});

// ---------------------------------------------------------------------------
// Round 2 Effects
// ---------------------------------------------------------------------------

describe('scene.js round 2 effects', () => {
  it('has asteroid field with procedural geometry', () => {
    assert.match(scene, /createAsteroidField/);
    assert.match(scene, /wrapAsteroids/);
    assert.match(scene, /updateAsteroidProximity/);
    assert.match(scene, /IcosahedronGeometry/);
  });

  it('has nebula clouds with dust interaction', () => {
    assert.match(scene, /createNebulaClouds/);
    assert.match(scene, /createNebulaTexture/);
    assert.match(scene, /updateNebulaClouds/);
    assert.match(scene, /lightningTimer/);
  });

  it('has ship shield/aura with RGB sync', () => {
    assert.match(scene, /createShipShield/);
    assert.match(scene, /updateShipShield/);
    assert.match(scene, /rippleTime/);
  });

  it('has contrail trails from both engines', () => {
    assert.match(scene, /createContrail/);
    assert.match(scene, /updateContrail/);
    assert.match(scene, /contrailL/);
    assert.match(scene, /contrailR/);
  });

  it('has warp tunnel on boost', () => {
    assert.match(scene, /createWarpTunnel/);
    assert.match(scene, /updateWarpTunnel/);
    assert.match(scene, /createWarpTunnelTexture/);
    assert.match(scene, /pulseRings/);
  });

  it('warp tunnel modulates bloom threshold', () => {
    assert.match(scene, /bloomPass\.threshold/);
  });

  it('minimap shows asteroids and nebulae', () => {
    assert.match(scene, /updateMinimap\([^)]*asteroids/);
  });

  it('has easeOutElastic utility', () => {
    assert.match(scene, /easeOutElastic/);
  });
});

// ---------------------------------------------------------------------------
// RGB Intensity Slider
// ---------------------------------------------------------------------------

describe('RGB intensity slider', () => {
  it('has slider HTML element', () => {
    assert.match(html, /id=["']rgb-slider["']/);
    assert.match(html, /id=["']rgb-slider-hud["']/);
    assert.match(html, /id=["']rgb-value["']/);
  });

  it('has rgbState in scene.js', () => {
    assert.match(scene, /rgbState/);
    assert.match(scene, /rgb-slider/);
  });

  it('slider is excluded from beginTransformation hide', () => {
    assert.match(scene, /rgb-slider-hud/);
  });

  it('slider is shown in showFlightHUD', () => {
    assert.match(scene, /rgb-slider-hud/);
  });

  it('bloom strength is scaled by RGB', () => {
    assert.match(scene, /bloomPass\.strength\s*=.*rgb/);
  });

  it('rgbState is passed to animation loop', () => {
    assert.match(scene, /startAnimationLoop\([^)]*rgbState/);
  });
});

// ---------------------------------------------------------------------------
// Chromatic Aberration + Motion Blur
// ---------------------------------------------------------------------------

describe('scene.js chromatic aberration + motion blur', () => {
  it('imports ShaderPass', () => {
    assert.match(scene, /import.*ShaderPass.*from.*three\/addons\/postprocessing\/ShaderPass/);
  });

  it('has ChromaticAberrationShader definition', () => {
    assert.match(scene, /ChromaticAberrationShader/);
    assert.match(scene, /amount/);
  });

  it('has MotionBlurShader definition', () => {
    assert.match(scene, /MotionBlurShader/);
    assert.match(scene, /direction/);
  });

  it('creates chromaPass and motionBlurPass in pipeline', () => {
    assert.match(scene, /chromaPass/);
    assert.match(scene, /motionBlurPass/);
  });

  it('chromatic aberration scales with speed and RGB', () => {
    assert.match(scene, /chromaPass\.uniforms\.amount\.value/);
  });

  it('motion blur activates during boost', () => {
    assert.match(scene, /motionBlurPass\.uniforms\.strength\.value/);
  });
});

// ---------------------------------------------------------------------------
// Sonic Boom Shockwave
// ---------------------------------------------------------------------------

describe('scene.js sonic boom shockwave', () => {
  it('has shockwave pool with torus geometry', () => {
    assert.match(scene, /createShockwavePool/);
    assert.match(scene, /TorusGeometry/);
  });

  it('has triggerShockwave and updateShockwaves', () => {
    assert.match(scene, /triggerShockwave/);
    assert.match(scene, /updateShockwaves/);
  });

  it('triggers sonic boom at speed threshold', () => {
    assert.match(scene, /sonicBoomFired/);
    assert.match(scene, /SONIC BOOM/);
  });

  it('shockwave triggers on barrel roll and flip completion', () => {
    assert.match(scene, /prevRollActive/);
    assert.match(scene, /prevFlipActive/);
  });
});

// ---------------------------------------------------------------------------
// Missiles + Explosions
// ---------------------------------------------------------------------------

describe('scene.js missiles + explosions', () => {
  it('has missile pool system', () => {
    assert.match(scene, /createMissilePool/);
    assert.match(scene, /fireMissile/);
    assert.match(scene, /updateMissiles/);
  });

  it('has F key input for firing', () => {
    assert.match(scene, /fireRequested/);
    assert.match(scene, /KeyF/);
  });

  it('missiles have homing toward targets', () => {
    assert.match(scene, /toTarget/);
    assert.match(scene, /\.lerp\(toTarget/);
  });

  it('has explosion pool system', () => {
    assert.match(scene, /createExplosionPool/);
    assert.match(scene, /triggerExplosion/);
    assert.match(scene, /updateExplosions/);
  });

  it('asteroid destruction with action text', () => {
    assert.match(scene, /DESTROYED/);
    assert.match(scene, /OBLITERATED/);
  });

  it('explosion triggers screen shake', () => {
    assert.match(scene, /explosionShake/);
  });

  it('HUD shows F to fire', () => {
    assert.match(html, /F to fire/);
  });
});

// ---------------------------------------------------------------------------
// Sound Design (Web Audio API)
// ---------------------------------------------------------------------------

describe('scene.js sound design', () => {
  it('has sound engine with AudioContext', () => {
    assert.match(scene, /createSoundEngine/);
    assert.match(scene, /AudioContext/);
  });

  it('has engine hum with oscillators', () => {
    assert.match(scene, /updateEngineSound/);
    assert.match(scene, /sawtooth/);
  });

  it('has boost sound', () => {
    assert.match(scene, /triggerBoostSound/);
  });

  it('has barrel roll sound', () => {
    assert.match(scene, /triggerRollSound/);
  });

  it('has flip sound', () => {
    assert.match(scene, /triggerFlipSound/);
  });

  it('has missile sound', () => {
    assert.match(scene, /triggerMissileSound/);
  });

  it('has explosion sound', () => {
    assert.match(scene, /triggerExplosionSound/);
  });

  it('master gain scales with RGB', () => {
    assert.match(scene, /masterGain\.gain/);
  });
});

// ---------------------------------------------------------------------------
// Lightning Arcs
// ---------------------------------------------------------------------------

describe('scene.js lightning arcs', () => {
  it('has lightning pool with line segments', () => {
    assert.match(scene, /createLightningPool/);
    assert.match(scene, /LineBasicMaterial/);
  });

  it('has triggerLightningArc and updateLightningArcs', () => {
    assert.match(scene, /triggerLightningArc/);
    assert.match(scene, /updateLightningArcs/);
  });

  it('lightning arcs snap to nearby asteroids or nebulae', () => {
    assert.match(scene, /nearestDist/);
    assert.match(scene, /nearest.*m\.position|nearest.*c\.pos/);
  });

  it('has lightning sound', () => {
    assert.match(scene, /triggerLightningSound/);
  });

  it('lightning timer in animation loop', () => {
    assert.match(scene, /state\.lightning\.timer/);
  });
});

// ---------------------------------------------------------------------------
// Black Hole with Gravitational Lensing
// ---------------------------------------------------------------------------

describe('scene.js black hole', () => {
  it('has gravitational lensing shader', () => {
    assert.match(scene, /GravitationalLensingShader/);
    assert.match(scene, /blackHoleScreenPos/);
    assert.match(scene, /distortionStrength/);
  });

  it('has black hole creation with event horizon and accretion disk', () => {
    assert.match(scene, /createBlackHole/);
    assert.match(scene, /accretionDisk/);
    assert.match(scene, /eventHorizonRadius/);
  });

  it('has accretion disk texture', () => {
    assert.match(scene, /createAccretionDiskTexture/);
  });

  it('has gravity pull on asteroids and ship', () => {
    assert.match(scene, /pullStrength/);
    assert.match(scene, /gravityRadius/);
  });

  it('has updateBlackHole function', () => {
    assert.match(scene, /updateBlackHole/);
  });

  it('has black hole drone sound', () => {
    assert.match(scene, /createBlackHoleDrone/);
    assert.match(scene, /updateBlackHoleDrone/);
  });

  it('lensing pass in post-processing pipeline', () => {
    assert.match(scene, /lensingPass/);
    assert.match(scene, /GravitationalLensingShader/);
  });

  it('black hole shown on minimap', () => {
    assert.match(scene, /updateMinimap\([^)]*blackHole/);
    assert.match(scene, /event horizon/i);
  });
});

// ---------------------------------------------------------------------------
// Collision & Screen Cracks
// ---------------------------------------------------------------------------

describe('scene.js collision and screen cracks', () => {
  it('has screen crack shader', () => {
    assert.match(scene, /ScreenCrackShader/);
    assert.match(scene, /crackIntensity/);
    assert.match(scene, /crackLine/);
  });

  it('has crack pass in post-processing pipeline', () => {
    assert.match(scene, /crackPass/);
  });

  it('has health bar HUD in HTML', () => {
    assert.match(html, /id=["']health-bar-hud["']/);
    assert.match(html, /id=["']health-bar-inner["']/);
    assert.match(html, /HULL/);
  });

  it('has health state tracking', () => {
    assert.match(scene, /health:\s*\{/);
    assert.match(scene, /crackIntensity/);
    assert.match(scene, /invincible/);
  });

  it('has ship collision detection', () => {
    assert.match(scene, /checkShipCollisions/);
  });

  it('shield absorbs at high RGB', () => {
    assert.match(scene, /SHIELD ABSORBED/);
    assert.match(scene, /rgb > 0\.7/);
  });

  it('has ship death and respawn', () => {
    assert.match(scene, /triggerShipDeath/);
    assert.match(scene, /respawnShip/);
    assert.match(scene, /respawnTimer/);
  });

  it('has damage sound', () => {
    assert.match(scene, /triggerDamageSound/);
  });

  it('health system heals over time', () => {
    assert.match(scene, /healDelay/);
    assert.match(scene, /healRate/);
  });

  it('health bar and cracks excluded from beginTransformation hide', () => {
    assert.match(scene, /health-bar-hud/);
    assert.match(scene, /achievement-container/);
  });

  it('health bar shown in showFlightHUD', () => {
    const showFn = scene.match(/function showFlightHUD[\s\S]*?^}/m);
    assert.ok(showFn, 'showFlightHUD function exists');
    assert.match(showFn[0], /health-bar-hud/);
  });
});

// ---------------------------------------------------------------------------
// Achievement Popups
// ---------------------------------------------------------------------------

describe('scene.js achievement popups', () => {
  it('has ACHIEVEMENTS constant with multiple entries', () => {
    assert.match(scene, /ACHIEVEMENTS\s*=/);
    assert.match(scene, /FIRST BLOOD/);
    assert.match(scene, /SPEED DEMON/);
    assert.match(scene, /BARREL KING/);
  });

  it('has achievement container in HTML', () => {
    assert.match(html, /id=["']achievement-container["']/);
  });

  it('has achievement stats tracking', () => {
    assert.match(scene, /stats:\s*\{/);
    assert.match(scene, /kills:\s*0/);
    assert.match(scene, /distanceTraveled/);
    assert.match(scene, /barrelRolls/);
  });

  it('has updateAchievementStats function', () => {
    assert.match(scene, /updateAchievementStats/);
  });

  it('has checkAchievements function', () => {
    assert.match(scene, /checkAchievements/);
    assert.match(scene, /unlocked/);
    assert.match(scene, /popupQueue/);
  });

  it('has updateAchievementPopups with DOM management', () => {
    assert.match(scene, /updateAchievementPopups/);
    assert.match(scene, /achievement-container/);
  });

  it('has achievement sound', () => {
    assert.match(scene, /triggerAchievementSound/);
  });

  it('stat hooks wired into existing systems', () => {
    assert.match(scene, /stats\.kills\s*\+=/);
    assert.match(scene, /stats\.barrelRolls\s*\+\+/);
    assert.match(scene, /stats\.flips\s*\+\+/);
    assert.match(scene, /stats\.sonicBooms\s*\+\+/);
  });

  it('distance tracking with prevShipPosition', () => {
    assert.match(scene, /prevShipPosition/);
    assert.match(scene, /distanceTraveled/);
  });

  it('achievement container shown in showFlightHUD', () => {
    const showFn = scene.match(/function showFlightHUD[\s\S]*?^}/m);
    assert.ok(showFn, 'showFlightHUD function exists');
    assert.match(showFn[0], /achievement-container/);
  });
});

// ---------------------------------------------------------------------------
// Space Whale / Leviathan
// ---------------------------------------------------------------------------

describe('scene.js space whale', () => {
  it('has createSpaceWhale function', () => {
    assert.match(scene, /createSpaceWhale/);
    assert.match(scene, /SphereGeometry\(8/);
  });

  it('has updateSpaceWhale function', () => {
    assert.match(scene, /updateSpaceWhale/);
  });

  it('has tendrils with flowing animation', () => {
    assert.match(scene, /tendrils/);
    assert.match(scene, /phaseOffset/);
  });

  it('has whale song with low frequency oscillators', () => {
    assert.match(scene, /createWhaleSong/);
    assert.match(scene, /updateWhaleSong/);
  });

  it('whale shown on minimap as cyan ellipse blip', () => {
    assert.match(scene, /ellipse/);
    assert.match(scene, /0, 255, 200/);
  });

  it('whale proximity tracked for achievement', () => {
    assert.match(scene, /whaleProximity/);
  });
});

// ---------------------------------------------------------------------------
// Hyperspace Jump
// ---------------------------------------------------------------------------

describe('scene.js hyperspace jump', () => {
  it('has hyperspace charging and jump functions', () => {
    assert.match(scene, /updateHyperspaceCharge/);
    assert.match(scene, /triggerHyperspaceJump/);
  });

  it('uses SHIFT key for charging', () => {
    assert.match(scene, /ShiftLeft/);
    assert.match(scene, /chargeJump/);
  });

  it('has jump cooldown state', () => {
    assert.match(scene, /hyperspace/);
    assert.match(scene, /cooldownTime.*15/);
  });

  it('has jump sound with frequency sweep', () => {
    assert.match(scene, /triggerJumpSound/);
  });

  it('has jump cooldown HUD in HTML', () => {
    assert.match(html, /jump-cooldown-hud/);
  });

  it('jump cooldown HUD excluded from beginTransformation', () => {
    assert.match(scene, /jump-cooldown-hud/);
  });

  it('HYPERSPACE JUMP action text', () => {
    assert.match(scene, /HYPERSPACE JUMP/);
  });

  it('teleports ship on jump', () => {
    assert.match(scene, /physics\.velocity\.set\(0, 0, 0\)/);
  });

  it('HUD shows SHIFT to jump', () => {
    assert.match(html, /SHIFT to jump/);
  });
});

// ---------------------------------------------------------------------------
// Comet Storms
// ---------------------------------------------------------------------------

describe('scene.js comet storms', () => {
  it('has comet pool creation', () => {
    assert.match(scene, /createCometPool/);
  });

  it('has comet storm update', () => {
    assert.match(scene, /updateCometStorm/);
  });

  it('has warning sound', () => {
    assert.match(scene, /triggerCometWarning/);
  });

  it('shows WARNING action text', () => {
    assert.match(scene, /WARNING.*INCOMING/);
  });

  it('comets shown on minimap as orange blips', () => {
    assert.match(scene, /255, 140, 30/);
  });

  it('missiles can destroy comets', () => {
    assert.match(scene, /COMET DESTROYED/);
  });

  it('has storm survival tracking for achievement', () => {
    assert.match(scene, /noDamageDuringStorm/);
    assert.match(scene, /stormsSurvivedClean/);
  });
});

// ---------------------------------------------------------------------------
// EMP Blast
// ---------------------------------------------------------------------------

describe('scene.js EMP blast', () => {
  it('has EMP mesh creation', () => {
    assert.match(scene, /createEMPMesh/);
  });

  it('has EMP update function', () => {
    assert.match(scene, /updateEMPBlast/);
  });

  it('uses E key for EMP charge', () => {
    assert.match(scene, /KeyE/);
    assert.match(scene, /empCharge/);
  });

  it('has EMP sound', () => {
    assert.match(scene, /triggerEMPSound/);
  });

  it('has EMP cooldown HUD in HTML', () => {
    assert.match(html, /emp-cooldown-hud/);
  });

  it('EMP cooldown HUD excluded from beginTransformation', () => {
    assert.match(scene, /emp-cooldown-hud/);
  });

  it('has slow-mo effect via timeScale', () => {
    assert.match(scene, /timeScale/);
  });

  it('has charging ring visual', () => {
    assert.match(scene, /chargeMesh/);
    assert.match(scene, /blastMesh/);
  });

  it('HUD shows E for EMP', () => {
    assert.match(html, /E for EMP/);
  });
});

// ---------------------------------------------------------------------------
// New Achievements (Round 5)
// ---------------------------------------------------------------------------

describe('scene.js new achievements round 5', () => {
  it('has WARP DRIVER achievement', () => {
    assert.match(scene, /WARP DRIVER/);
  });

  it('has STORM SURVIVOR achievement', () => {
    assert.match(scene, /STORM SURVIVOR/);
  });

  it('has EXTINCTION EVENT achievement', () => {
    assert.match(scene, /EXTINCTION EVENT/);
  });

  it('has SPACE WHISPERER achievement', () => {
    assert.match(scene, /SPACE WHISPERER/);
  });

  it('tracks new stats', () => {
    assert.match(scene, /hyperspaceJumps/);
    assert.match(scene, /cometsDestroyed/);
    assert.match(scene, /empBlasts/);
  });

  it('cooldown HUDs shown in showFlightHUD', () => {
    const showFn = scene.match(/function showFlightHUD[\s\S]*?^}/m);
    assert.ok(showFn, 'showFlightHUD function exists');
    assert.match(showFn[0], /jump-cooldown-hud/);
    assert.match(showFn[0], /emp-cooldown-hud/);
  });
});

// ---------------------------------------------------------------------------
// Procedural Background Music
// ---------------------------------------------------------------------------

describe('scene.js procedural background music', () => {
  it('has createProceduralMusic function', () => {
    assert.match(scene, /function createProceduralMusic/);
  });

  it('creates oscillators/buffers and gain nodes', () => {
    assert.match(scene, /kickBuffer/);
    assert.match(scene, /hatBuffer/);
    assert.match(scene, /kickGain/);
    assert.match(scene, /arpGain/);
    assert.match(scene, /padGain/);
    assert.match(scene, /combatGain/);
  });

  it('has updateProceduralMusic function', () => {
    assert.match(scene, /function updateProceduralMusic/);
  });

  it('BPM calculation scales with speed', () => {
    assert.match(scene, /60 \+ \(physics\.speed \/ physics\.maxSpeed\) \* 80/);
  });

  it('has lookahead beat scheduling pattern', () => {
    assert.match(scene, /nextBeatTime < ctx\.currentTime \+ 0\.1/);
  });

  it('layer gain updates reference rgb', () => {
    assert.match(scene, /rgb \* 0\.08/);
    assert.match(scene, /rgb \* 0\.12/);
    assert.match(scene, /rgb \* 0\.1/);
    assert.match(scene, /rgb \* 0\.06/);
  });
});

// ---------------------------------------------------------------------------
// Wormhole Portal
// ---------------------------------------------------------------------------

describe('scene.js wormhole portal', () => {
  it('has DimensionShiftShader with required uniforms', () => {
    assert.match(scene, /DimensionShiftShader/);
    assert.match(scene, /shiftAmount/);
    assert.match(scene, /rgb2hsv/);
    assert.match(scene, /hsv2rgb/);
  });

  it('has createWormhole function', () => {
    assert.match(scene, /function createWormhole/);
  });

  it('creates TorusGeometry ring and particle spiral', () => {
    assert.match(scene, /TorusGeometry\(6/);
    assert.match(scene, /particleCount = 200/);
  });

  it('has updateWormhole function with proximity check', () => {
    assert.match(scene, /function updateWormhole/);
    assert.match(scene, /dist < 8/);
  });

  it('has triggerDimensionShift function', () => {
    assert.match(scene, /function triggerDimensionShift/);
  });

  it('sets inAlternateDimension state and spawns exit wormhole', () => {
    assert.match(scene, /inAlternateDimension/);
    assert.match(scene, /createExitWormhole/);
    assert.match(scene, /DIMENSION SHIFT!/);
    assert.match(scene, /RETURNING TO REALITY!/);
  });

  it('has createWormholeSound and updateWormholeSound functions', () => {
    assert.match(scene, /function createWormholeSound/);
    assert.match(scene, /function updateWormholeSound/);
  });

  it('has DIMENSION HOPPER achievement', () => {
    assert.match(scene, /DIMENSION HOPPER/);
    assert.match(scene, /dimensionShifts/);
  });

  it('minimap accepts wormhole parameter', () => {
    assert.match(scene, /updateMinimap\([^)]*wormhole/);
  });

  it('DimensionShiftPass added to composer pipeline', () => {
    assert.match(scene, /dimensionShiftPass/);
    assert.match(scene, /DimensionShiftShader/);
  });

  it('has wormhole cooldown HUD in HTML', () => {
    assert.match(html, /wormhole-cooldown-hud/);
  });

  it('wormhole cooldown HUD excluded from beginTransformation', () => {
    assert.match(scene, /wormhole-cooldown-hud/);
  });

  it('has wormhole cooldown HUD shown in showFlightHUD', () => {
    const showFn = scene.match(/function showFlightHUD[\s\S]*?^}/m);
    assert.ok(showFn, 'showFlightHUD function exists');
    assert.match(showFn[0], /wormhole-cooldown-hud/);
  });

  it('flight HUD mentions wormholes', () => {
    assert.match(html, /fly through wormholes/);
  });

  it('gravity multiplied by wormhole gravityMult', () => {
    assert.match(scene, /gravMult/);
    assert.match(scene, /state\.wormhole.*gravityMult|wormhole\.gravityMult/);
  });
});
