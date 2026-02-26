const { chromium } = require('playwright');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SITE_URL = process.env.SITE_URL || 'https://danielstevens.org/';
const WAIT_FOR_DEPLOY = parseInt(process.env.WAIT_FOR_DEPLOY || '0', 10);
const SCREENSHOTS_DIR = '/tmp';

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    failed++;
    failures.push(message);
    console.log(`  FAIL: ${message}`);
  } else {
    passed++;
    console.log(`  PASS: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  if (WAIT_FOR_DEPLOY > 0) {
    console.log(`Waiting ${WAIT_FOR_DEPLOY}s for deploy...`);
    await new Promise(r => setTimeout(r, WAIT_FOR_DEPLOY * 1000));
  }

  const browser = await chromium.launch({
    headless: false,
    args: ['--use-gl=angle', '--enable-gpu', '--no-sandbox'],
  });
  const page = await browser.newPage();

  const jsErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
  });
  page.on('pageerror', err => jsErrors.push(err.message));
  page.on('response', resp => {
    if (resp.status() >= 400) {
      networkErrors.push(`${resp.status()} ${resp.url()}`);
    }
  });

  // ===========================================================================
  // Test 1: Page loads
  // ===========================================================================

  console.log('\n--- Test 1: Page Load ---');
  await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 15000 });

  const title = await page.title();
  assert(title.length > 0, `Page has a title: "${title}"`);

  // ===========================================================================
  // Test 2: Trigger element exists and is visible
  // ===========================================================================

  console.log('\n--- Test 2: Trigger Element ---');
  const triggerVisible = await page.isVisible('#prompt-trigger');
  assert(triggerVisible, '#prompt-trigger is visible');

  const buttonVisible = await page.isVisible('#prompt-trigger button');
  assert(buttonVisible, 'overengineer button is visible');

  // ===========================================================================
  // Test 3: CDN resources loaded (wait for imports)
  // ===========================================================================

  console.log('\n--- Test 3: CDN Resources ---');
  await page.waitForTimeout(4000);

  const cdn404s = networkErrors.filter(e => e.includes('jsdelivr') || e.includes('three'));
  assert(cdn404s.length === 0, `No Three.js CDN 404s (found: ${cdn404s.length})`);

  const importErrors = jsErrors.filter(e =>
    e.includes('import') || e.includes('module') || e.includes('three')
  );
  assert(importErrors.length === 0, `No module import errors (found: ${importErrors.length})`);

  // ===========================================================================
  // Test 4: Click trigger and wait for transformation
  // ===========================================================================

  console.log('\n--- Test 4: Transformation ---');
  await page.click('#prompt-trigger');

  // Wait for typing (~8s) + pause (1.2s) + fade (1.6s) + scene init + rendering (11s)
  console.log('  Waiting 22s for full transformation...');
  await page.waitForTimeout(22000);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/e2e-after-transform.png` });

  // ===========================================================================
  // Test 5: Canvas is visible and has non-zero bounds
  // ===========================================================================

  console.log('\n--- Test 5: Canvas Visibility ---');

  const canvasState = await page.evaluate(() => {
    const c = document.getElementById('threejs-canvas');
    if (!c) return null;
    const style = getComputedStyle(c);
    const rect = c.getBoundingClientRect();
    return {
      exists: true,
      display: style.display,
      width: c.width,
      height: c.height,
      rectWidth: rect.width,
      rectHeight: rect.height,
      isDirectChildOfBody: c.parentElement === document.body,
    };
  });

  assert(canvasState !== null, 'Canvas element exists');
  assert(canvasState && canvasState.display !== 'none', `Canvas display is "${canvasState?.display}" (not "none")`);
  assert(canvasState && canvasState.width > 0 && canvasState.height > 0,
    `Canvas has non-zero dimensions: ${canvasState?.width}x${canvasState?.height}`);
  assert(canvasState && canvasState.rectWidth > 0 && canvasState.rectHeight > 0,
    `Canvas getBoundingClientRect is non-zero: ${canvasState?.rectWidth}x${canvasState?.rectHeight}`);
  assert(canvasState && canvasState.isDirectChildOfBody,
    'Canvas is a direct child of <body> (not nested in hidden element)');

  // ===========================================================================
  // Test 6: Canvas has visible rendered content (not black)
  // ===========================================================================

  console.log('\n--- Test 6: Canvas Pixel Analysis ---');

  const pixelStats = await page.evaluate(() => {
    const c = document.getElementById('threejs-canvas');
    if (!c) return null;
    const temp = document.createElement('canvas');
    temp.width = c.width;
    temp.height = c.height;
    const ctx = temp.getContext('2d');
    ctx.drawImage(c, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonBlack = 0;
    let maxBrightness = 0;
    const totalPixels = c.width * c.height;
    for (let i = 0; i < d.length; i += 4) {
      const b = d[i] + d[i + 1] + d[i + 2];
      if (b > 10) nonBlack++;
      if (b > maxBrightness) maxBrightness = b;
    }
    return {
      totalPixels,
      nonBlackPixels: nonBlack,
      nonBlackPercent: ((nonBlack / totalPixels) * 100).toFixed(1),
      maxBrightness,
    };
  });

  if (pixelStats) {
    console.log(`  Pixel stats: ${pixelStats.nonBlackPercent}% non-black, max brightness ${pixelStats.maxBrightness}`);
    assert(parseFloat(pixelStats.nonBlackPercent) > 5,
      `Non-black pixels > 5%: got ${pixelStats.nonBlackPercent}%`);
    assert(pixelStats.maxBrightness > 50,
      `Max brightness > 50: got ${pixelStats.maxBrightness}`);
  } else {
    assert(false, 'Could not read canvas pixel data');
  }

  // Save canvas content for manual inspection
  const canvasPng = await page.evaluate(() => {
    const c = document.getElementById('threejs-canvas');
    return c ? c.toDataURL('image/png') : null;
  });
  if (canvasPng) {
    fs.writeFileSync(
      `${SCREENSHOTS_DIR}/e2e-canvas.png`,
      Buffer.from(canvasPng.split(',')[1], 'base64')
    );
    console.log(`  Canvas saved to ${SCREENSHOTS_DIR}/e2e-canvas.png`);
  }

  // ===========================================================================
  // Test 7: No critical JS errors
  // ===========================================================================

  console.log('\n--- Test 7: JS Errors ---');
  const criticalErrors = jsErrors.filter(e =>
    !e.includes('favicon') && !e.includes('404')
  );
  assert(criticalErrors.length === 0,
    `No critical JS errors (found: ${criticalErrors.length})`);
  if (criticalErrors.length > 0) {
    criticalErrors.forEach(e => console.log(`    Error: ${e}`));
  }

  // ===========================================================================
  // Summary
  // ===========================================================================

  console.log('\n========================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => console.log(`  - ${f}`));
  }
  console.log('========================================\n');

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
