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

  it('has the blinking cursor element', () => {
    assert.match(html, /id=["']prompt-cursor["']/);
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
      // Check that this category appears as a book category value
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
    assert.ok(intensity >= 1.0, `AmbientLight intensity ${intensity} < 1.0`);
  });

  it('PointLight intensities >= 100 (inverse-square needs high values)', () => {
    const matches = [...scene.matchAll(/PointLight\(\s*0x[0-9a-fA-F]+\s*,\s*([\d.]+)/g)];
    assert.ok(matches.length >= 3, `Expected >= 3 PointLights, found ${matches.length}`);
    for (const m of matches) {
      const intensity = parseFloat(m[1]);
      assert.ok(intensity >= 100, `PointLight intensity ${intensity} < 100 — will be invisible with inverse-square falloff`);
    }
  });

  it('star particle size >= 1.0 (prevents sub-pixel stars)', () => {
    // The starfield uses PointsMaterial in createStarfield
    const starfieldFn = scene.match(/function createStarfield[\s\S]*?^}/m);
    assert.ok(starfieldFn, 'createStarfield function not found');
    const sizeMatch = starfieldFn[0].match(/size:\s*([\d.]+)/);
    assert.ok(sizeMatch, 'Star size not found in createStarfield');
    const size = parseFloat(sizeMatch[1]);
    assert.ok(size >= 1.0, `Star size ${size} < 1.0`);
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
    // Extract beginTransformation function body
    const fnStart = scene.indexOf('function beginTransformation');
    assert.ok(fnStart !== -1, 'beginTransformation function not found');

    const fnBody = scene.slice(fnStart, fnStart + 800);
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
