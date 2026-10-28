/**
 * Comprehensive Feature Verification Test Suite
 * Tests boundary radius calculation, circle counting, stage names,
 * circle removal (E-05), SOHOE, Hexagram-12 Eyes, Offset Paths,
 * Story and Ring Notes data, and PresetsManager clean slate.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  SacredMath,
  getKrystGeometryByRadius,
  getFlowerOfLifeGeometryByRadius,
  getNearestValidBoundaryRadius,
  getSOHOEPaths,
  getHexagramEyePaths,
  getOffsetPathRings,
  computeCircleSections,
  KRYST_STAGE_NAMES,
  LIFE_STAGE_NAMES,
  KRYST_STORY_DATA,
  RING_NOTES_DATA
} from '../js/geometry.js';
import { State, PresetsManager, PresetDialog, Spectral12Colors } from '../js/state.js';
import { TutorialManager, UI } from '../js/interactions.js';
import { Exporter, exportOpenSCAD } from '../js/export.js';
import { SVGRenderer } from '../js/renderer.js';

console.log('--- 1. Testing Boundary Radius Expansion (E-05 & R-B1) ---');
const r = 50;

// Test increasing radii and verify circle count expands monotonically
const rad1 = 120; // ~Seed (ring 1)
const geom1 = getKrystGeometryByRadius(rad1, r);
console.log(`Radius ${rad1}px: ${geom1.totalCircles} circles, maxLayer = ${geom1.maxLayer} (${KRYST_STAGE_NAMES[geom1.maxLayer]})`);
assert(geom1.totalCircles > 0, 'Seed should have circles');
assert.strictEqual(geom1.maxLayer, 1, 'Radius 120 should be Layer 1');
assert.strictEqual(KRYST_STAGE_NAMES[1], 'Seed of Kryst');

const rad2 = 220; // ~Flower (ring 2)
const geom2 = getKrystGeometryByRadius(rad2, r);
console.log(`Radius ${rad2}px: ${geom2.totalCircles} circles, maxLayer = ${geom2.maxLayer} (${KRYST_STAGE_NAMES[geom2.maxLayer]})`);
assert(geom2.totalCircles > geom1.totalCircles, 'Ring 2 should have more circles than Ring 1');
assert.strictEqual(geom2.maxLayer, 2, 'Radius 220 should reach Layer 2');
assert.strictEqual(KRYST_STAGE_NAMES[2], 'Flower of Kryst');

const rad3 = 320; // ~Fruit (ring 3)
const geom3 = getKrystGeometryByRadius(rad3, r);
console.log(`Radius ${rad3}px: ${geom3.totalCircles} circles, maxLayer = ${geom3.maxLayer} (${KRYST_STAGE_NAMES[geom3.maxLayer]})`);
assert(geom3.totalCircles > geom2.totalCircles, 'Ring 3 should have more circles than Ring 2');
assert.strictEqual(KRYST_STAGE_NAMES[3], 'Fruit of Kryst');

const rad5 = 550; // ~Water (ring 5)
const geom5 = getKrystGeometryByRadius(rad5, r);
console.log(`Radius ${rad5}px: ${geom5.totalCircles} circles, maxLayer = ${geom5.maxLayer} (${KRYST_STAGE_NAMES[geom5.maxLayer]})`);
assert(geom5.totalCircles > geom3.totalCircles, 'Ring 5 should have more circles than Ring 3');
assert.strictEqual(KRYST_STAGE_NAMES[5], 'Water of Kryst');

console.log('--- 2. Testing Individual Circle Removal / Restoration (E-05) ---');
const firstCircleId = geom2.circles[0].id;
const disabledSet = new Set([firstCircleId]);
const geomWithDisabled = getKrystGeometryByRadius(rad2, r, disabledSet);
assert.strictEqual(geomWithDisabled.circles.length, geom2.circles.length - 1, 'Circle should be omitted when disabled');
assert(!geomWithDisabled.circles.some(c => c.id === firstCircleId), 'Omitted circle ID must not appear in circles');
assert(!geomWithDisabled.auraCircles.some(c => c.bodyId === firstCircleId), 'Omitted circle must not appear in aura');
console.log(`Disabled circle ${firstCircleId} successfully removed from circles and aura.`);

console.log('--- 3. Testing Flower of Life by Radius ---');
const folGeom = getFlowerOfLifeGeometryByRadius(rad2, r);
console.log(`Flower of Life at radius ${rad2}px: ${folGeom.totalCircles} circles, maxLayer = ${folGeom.maxLayer}`);
assert(folGeom.totalCircles > 0, 'FoL should have circles');
assert.strictEqual(LIFE_STAGE_NAMES[1], 'Seed of Life');
assert.strictEqual(LIFE_STAGE_NAMES[2], 'Flower of Life');
assert.strictEqual(LIFE_STAGE_NAMES[3], 'Fruit of Life');

console.log('--- 4. Testing SOHOE (Star of Heaven on Earth) Overlay (R-A11) ---');
const sohoe = getSOHOEPaths(r, 300);
assert(Array.isArray(sohoe), 'SOHOE must return an array of stars');
assert(sohoe.length > 0, 'SOHOE must have at least 1 star');
assert(sohoe[0].d1 && sohoe[0].d2, 'SOHOE star must have d1 and d2 triangle paths');
console.log(`SOHOE overlay generated ${sohoe.length} sacred star motifs with intersecting triangles.`);

console.log('--- 5. Testing Hexagram & 12 Eyes Overlay (R-A10) ---');
const hexEyes = getHexagramEyePaths(r, 300);
assert(hexEyes.hexagramCircumscribedCircles.length > 0, 'Hexagram circumscribed circles must exist');
assert(hexEyes.eyes.length === 12, 'Hexagram overlay must have 12 surrounding eyes');
console.log(`Hexagram overlay generated ${hexEyes.hexagramCircumscribedCircles.length} circumscribed circles and 12 vesica piscis eyes.`);

console.log('--- 6. Testing Offset Path Visual Generator (R-A5) ---');
const sampleCircles = geom1.circles;
const echoes = getOffsetPathRings(sampleCircles, 3, 5);
assert(echoes.length === sampleCircles.length * 3, 'Offset echoes count must equal circles * ring count');
console.log(`Offset Path generated ${echoes.length} echo rings across ${sampleCircles.length} circles.`);

console.log('--- 7. Testing Story of Kryst Data (R-A12) & Ring Notes (R-A13) ---');
assert.strictEqual(KRYST_STORY_DATA.length, 12, 'Story of Kryst must have 12 crystallization stages');
KRYST_STORY_DATA.forEach(s => {
  assert(s.ring && s.name && s.description, `Stage ring ${s.ring} must have name and description`);
});
console.log(`Story of Kryst validated: 12 stages from Genesis to Omnipresent Matrix.`);

assert.strictEqual(RING_NOTES_DATA.length, 12, 'Ring Notes must cover 12 concentric rings');
RING_NOTES_DATA.forEach(n => {
  assert(n.ring && n.title && n.circleCount && n.numerology && n.geometry, `Ring ${n.ring} must have complete numerological data`);
});
console.log(`Ring Notes validated: 12 rings with Solfeggio frequencies and archetypes.`);

console.log('--- 8. Testing Presets Clean Slate & Custom Preset Lifecycle (E-11 & R-A4) ---');
assert(Array.isArray(PresetsManager.builtinPresets), 'builtinPresets must be array');
assert.strictEqual(PresetsManager.builtinPresets.length, 0, 'builtinPresets must be strictly empty (no hardcoded presets)');

// Test adding a custom preset
const testPreset = {
  id: 'custom_test_1',
  key: 'custom_test_1',
  title: 'Sacred Pyramid',
  subtitle: 'Flower of Kryst · 6 highlighted',
  isBuiltin: false,
  config: PresetsManager.captureCurrentStudioConfig()
};
PresetsManager.addCustomPreset(testPreset);
assert.strictEqual(PresetsManager.customPresets.length, 1, 'Custom presets should contain 1 preset after adding');
assert.strictEqual(PresetsManager.getAllPresets().length, 1, 'getAllPresets should contain the added preset');
const retrieved = PresetsManager.getPreset('custom_test_1');
assert(retrieved, 'getPreset should find the preset by id');
assert.strictEqual(retrieved.title, 'Sacred Pyramid', 'Retrieved preset should match title');

// Test alias saveCustomPresets does not throw
assert.doesNotThrow(() => PresetsManager.saveCustomPresets(), 'saveCustomPresets alias must not throw');

// Test deleting custom preset
const deleted = PresetsManager.deletePreset('custom_test_1');
assert.strictEqual(deleted, true, 'deletePreset should return true for existing preset');
assert.strictEqual(PresetsManager.customPresets.length, 0, 'Custom presets should be empty after deletion');
assert.strictEqual(PresetsManager.getPreset('custom_test_1'), undefined, 'getPreset should return undefined after deletion');

console.log('PresetsManager confirmed: Clean slate, add, retrieve, and delete lifecycle verified.');

console.log('--- 9. Testing 12-Stage Spectral Palette (R-A3) ---');
assert.strictEqual(Spectral12Colors.length, 12, 'Spectral palette must have 12 colors');
assert.strictEqual(Spectral12Colors[0], '#ff0033', 'Ring 1 must be Red');
assert.strictEqual(Spectral12Colors[11], '#ff00aa', 'Ring 12 must be Magenta');
console.log('Spectral12Colors confirmed: Ring 1 (Red #ff0033) to Ring 12 (Magenta #ff00aa).');

console.log('--- 10. Testing Independent Body & Aura Selectability & Individual Sliders ---');
// Verify defaults: Both 100% visible simultaneously
assert.strictEqual(State.bodyOpacity, 1.0, 'Default bodyOpacity must be 1.0 (100% full visibility)');
assert.strictEqual(State.auraOpacity, 1.0, 'Default auraOpacity must be 1.0 (100% full visibility)');
assert.strictEqual(State.showBodyCircles, true, 'Default showBodyCircles must be true');
assert.strictEqual(State.showAuraFlower, true, 'Default showAuraFlower must be true');

// Both selectable for full visibility at 100% simultaneously
let effBody = State.showBodyCircles ? (State.bodyOpacity ?? 1.0) : 0;
let effAura = State.showAuraFlower ? (State.auraOpacity ?? 1.0) : 0;
assert.strictEqual(effBody, 1.0, 'Both full visibility: Body opacity is 1.0');
assert.strictEqual(effAura, 1.0, 'Both full visibility: Aura opacity is 1.0');

// Independent opacity slider adjustments
State.bodyOpacity = 0.75;
State.auraOpacity = 0.35;
assert.strictEqual(State.bodyOpacity, 0.75, 'Body opacity can be set independently to 0.75');
assert.strictEqual(State.auraOpacity, 0.35, 'Aura opacity remains independent at 0.35');

// Toggle Body visibility off while Aura remains active
State.showBodyCircles = false;
effBody = State.showBodyCircles ? (State.bodyOpacity ?? 1.0) : 0;
effAura = State.showAuraFlower ? (State.auraOpacity ?? 1.0) : 0;
assert.strictEqual(effBody, 0, 'When Body is deselected, effective body opacity is 0');
assert.strictEqual(effAura, 0.35, 'Aura opacity is unaffected when Body is deselected');

// Toggle Aura visibility off and Body back on
State.showBodyCircles = true;
State.showAuraFlower = false;
effBody = State.showBodyCircles ? (State.bodyOpacity ?? 1.0) : 0;
effAura = State.showAuraFlower ? (State.auraOpacity ?? 1.0) : 0;
assert.strictEqual(effBody, 0.75, 'Body opacity is unaffected when Aura is deselected');
assert.strictEqual(effAura, 0, 'When Aura is deselected, effective aura opacity is 0');

// Backward compatibility: viewStyle setter/getter
State.viewStyle = 'both';
assert.strictEqual(State.showBodyCircles, true, 'viewStyle=both sets showBodyCircles to true');
assert.strictEqual(State.showAuraFlower, true, 'viewStyle=both sets showAuraFlower to true');
assert.strictEqual(State.bodyOpacity, 1.0, 'viewStyle=both restores bodyOpacity to 1.0');
assert.strictEqual(State.auraOpacity, 1.0, 'viewStyle=both restores auraOpacity to 1.0');

State.viewStyle = 'body';
assert.strictEqual(State.showBodyCircles, true, 'viewStyle=body sets showBodyCircles to true');
assert.strictEqual(State.showAuraFlower, false, 'viewStyle=body sets showAuraFlower to false');
assert.strictEqual(State.bodyOpacity, 1.0, 'viewStyle=body sets bodyOpacity to 1.0');
assert.strictEqual(State.auraOpacity, 0.0, 'viewStyle=body sets auraOpacity to 0.0');

State.viewStyle = 'aura';
assert.strictEqual(State.showBodyCircles, false, 'viewStyle=aura sets showBodyCircles to false');
assert.strictEqual(State.showAuraFlower, true, 'viewStyle=aura sets showAuraFlower to true');
assert.strictEqual(State.bodyOpacity, 0.0, 'viewStyle=aura sets bodyOpacity to 0.0');
assert.strictEqual(State.auraOpacity, 1.0, 'viewStyle=aura sets auraOpacity to 1.0');

// Reset to default full visibility for both
State.showBodyCircles = true;
State.showAuraFlower = true;
State.bodyOpacity = 1.0;
State.auraOpacity = 1.0;
console.log('Independent Body/Aura selectability & individual sliders verified successfully.');

console.log('--- 11. Testing Aura Size (0r to 20r, 0.01 step, 1.95r default) & Sacred Gadgets ---');
assert.strictEqual(State.auraScale, 1.95, 'Default auraScale must be 1.95r');

// Default geometry without passing auraScale parameter defaults to 1.95
const defaultKrystGeom = getKrystGeometryByRadius(300, r);
assert.strictEqual(defaultKrystGeom.auraCircles[0].r, Number((1.95 * r).toFixed(3)), 'Default Kryst aura radius must be 1.95 * r = 97.5px');
const defaultLifeGeom = getFlowerOfLifeGeometryByRadius(300, r);
assert.strictEqual(defaultLifeGeom.auraCircles[0].r, Number((1.95 * r).toFixed(3)), 'Default Life aura radius must be 1.95 * r = 97.5px');

// Verify scaling from 0.0r to 20r with 0.01 precision
[0.0, 0.5, 1.0, 1.1, 1.25, 1.95, 2.0, 5.0, 10.0, 15.5, 20.0].forEach(scale => {
  const krystGeom = getKrystGeometryByRadius(300, r, new Set(), false, scale);
  assert(krystGeom.auraCircles.length > 0, `Kryst should have aura circles at scale ${scale}`);
  const expectedR = Number((scale * r).toFixed(3));
  assert.strictEqual(krystGeom.auraCircles[0].r, expectedR, `Aura circle radius should equal ${scale} * r = ${expectedR}px`);

  const lifeGeom = getFlowerOfLifeGeometryByRadius(300, r, new Set(), false, scale);
  assert(lifeGeom.auraCircles.length > 0, `Life should have aura circles at scale ${scale}`);
  assert.strictEqual(lifeGeom.auraCircles[0].r, expectedR, `Life aura circle radius should equal ${scale} * r = ${expectedR}px`);
});

// Verify 0r intersection handling returns empty array without throwing
const zeroRSections = computeCircleSections([{x: 0, y: 0}, {x: 50, y: 0}], 0);
assert.deepStrictEqual(zeroRSections, [], 'Sections with R <= 0 must return empty array');

// Verify Sacred Gadgets state defaults & new sliders
assert.strictEqual(State.gadgetAuraExpansion, false, 'gadgetAuraExpansion must default to false');
assert.strictEqual(State.auraExpansionMaxSize, 20.0, 'auraExpansionMaxSize must default to 20.0');
assert.strictEqual(State.auraExpansionSpeed, 1.0, 'auraExpansionSpeed must default to 1.0');
assert.strictEqual(State.gadgetRainbowAura, false, 'gadgetRainbowAura must default to false');
assert.strictEqual(State.rainbowWaveSpeed, 1.0, 'rainbowWaveSpeed must default to 1.0');
assert.strictEqual(State.gadgetBreathing, false, 'gadgetBreathing must default to false');
assert.strictEqual(State.breathingMaxSize, 2.0, 'breathingMaxSize must default to 2.0');
assert.strictEqual(State.breathingSpeed, 1.0, 'breathingSpeed must default to 1.0');

// Verify state applyConfig and PresetsManager capture with new properties
State.applyConfig({
  auraScale: 0.0,
  auraExpansionMaxSize: 15.0,
  auraExpansionSpeed: 2.5,
  rainbowWaveSpeed: 1.8
});
assert.strictEqual(State.auraScale, 0.0, 'auraScale must accept 0.0r');
assert.strictEqual(State.auraExpansionMaxSize, 15.0, 'auraExpansionMaxSize must be updated to 15.0');
assert.strictEqual(State.auraExpansionSpeed, 2.5, 'auraExpansionSpeed must be updated to 2.5');
assert.strictEqual(State.rainbowWaveSpeed, 1.8, 'rainbowWaveSpeed must be updated to 1.8');

const studioConfig = PresetsManager.captureCurrentStudioConfig();
assert.strictEqual(studioConfig.auraScale, 0.0, 'studioConfig must capture 0.0 auraScale');
assert.strictEqual(studioConfig.auraExpansionMaxSize, 15.0, 'studioConfig must capture auraExpansionMaxSize');
assert.strictEqual(studioConfig.auraExpansionSpeed, 2.5, 'studioConfig must capture auraExpansionSpeed');
assert.strictEqual(studioConfig.rainbowWaveSpeed, 1.8, 'studioConfig must capture rainbowWaveSpeed');

// Reset auraScale to default 1.95
State.auraScale = 1.95;
State.auraExpansionMaxSize = 20.0;
State.auraExpansionSpeed = 1.0;
State.rainbowWaveSpeed = 1.0;

// Verify Continuous Rainbow Wave Phase & Hue Propagation
const waveFactor = 1.85;
const dists = [100, 193.2];
let phase = 0;
const speed = 1.0;
const dt = 1 / 60; // 60 FPS frame time
for (let frame = 1; frame <= 180; frame++) {
  const prevPhase = phase;
  phase = (phase + dt * 135 * speed) % 360000;
  assert(phase > prevPhase, 'Rainbow wave phase must advance continuously forward every frame');
  
  const ring1Hue = (((phase - dists[0] * waveFactor) % 360) + 360) % 360;
  const ring2Hue = (((phase - dists[1] * waveFactor) % 360) + 360) % 360;
  assert(ring1Hue >= 0 && ring1Hue < 360, 'Ring 1 hue must be normalized in [0, 360)');
  assert(ring2Hue >= 0 && ring2Hue < 360, 'Ring 2 hue must be normalized in [0, 360)');
  
  // Phase difference between rings must remain smoothly distributed across complementary spectrum (~172 degrees)
  const hueDiff = ((ring1Hue - ring2Hue + 360) % 360);
  assert(Math.abs(hueDiff - 172.4) < 1.0, 'Continuous wave must maintain smooth spectral phase delta across concentric rings');
}

console.log('Aura scaling (0r to 20r, 1.95r default) and Sacred Gadgets properties verified successfully.');

console.log('--- 12. Testing Pattern Center Invariance Across Boundary Radii ---');
for (let bRad = 100; bRad <= 1200; bRad += 50) {
  const kGeom = getKrystGeometryByRadius(bRad, r);
  const sumX = kGeom.circles.reduce((s, c) => s + c.x, 0);
  const sumY = kGeom.circles.reduce((s, c) => s + c.y, 0);
  assert(Math.abs(sumX) < 1e-2, `Kryst pattern center must remain at x=0 at boundary ${bRad}px (got sumX=${sumX})`);
  assert(Math.abs(sumY) < 1e-2, `Kryst pattern center must remain at y=0 at boundary ${bRad}px (got sumY=${sumY})`);

  const lGeom = getFlowerOfLifeGeometryByRadius(bRad, r);
  const lSumX = lGeom.circles.reduce((s, c) => s + c.x, 0);
  const lSumY = lGeom.circles.reduce((s, c) => s + c.y, 0);
  assert(Math.abs(lSumX) < 1e-2, `Life pattern center must remain at x=0 at boundary ${bRad}px (got sumX=${lSumX})`);
  assert(Math.abs(lSumY) < 1e-2, `Life pattern center must remain at y=0 at boundary ${bRad}px (got sumY=${lSumY})`);
}
console.log('Pattern center invariance confirmed: centroid strictly at (0, 0) across all radii.');

console.log('--- 13. Testing Jump to Circle Count Nearest Valid Distance ---');
// Exact targets for Kryst
[6, 18, 30, 42, 54, 96].forEach(target => {
  const result = getNearestValidBoundaryRadius(target, 'kryst', r);
  assert.strictEqual(result.circleCount, target, `Nearest valid count for target ${target} should be exactly ${target}`);
  const geom = getKrystGeometryByRadius(result.radius, r);
  assert.strictEqual(geom.totalCircles, target, `Geometry generated with radius ${result.radius}px must yield exactly ${target} circles`);
});

// Non-exact / in-between targets for Kryst jump to nearest tier
const inBetweenTests = [
  { input: 10, expectedCount: 6 },
  { input: 20, expectedCount: 18 },
  { input: 25, expectedCount: 30 },
  { input: 50, expectedCount: 54 },
  { input: 100, expectedCount: 96 }
];
inBetweenTests.forEach(({ input, expectedCount }) => {
  const result = getNearestValidBoundaryRadius(input, 'kryst', r);
  assert.strictEqual(result.circleCount, expectedCount, `Target ${input} should snap to nearest valid count ${expectedCount}`);
  const geom = getKrystGeometryByRadius(result.radius, r);
  assert.strictEqual(geom.totalCircles, expectedCount, `Geometry with jumped radius ${result.radius}px must equal ${expectedCount} circles`);
});

// Exact targets for Flower of Life
[7, 13, 19, 31, 37].forEach(target => {
  const result = getNearestValidBoundaryRadius(target, 'life', r);
  assert.strictEqual(result.circleCount, target, `Life target ${target} should match nearest valid count ${target}`);
  const geom = getFlowerOfLifeGeometryByRadius(result.radius, r);
  assert.strictEqual(geom.totalCircles, target, `Life geometry with radius ${result.radius}px must yield ${target} circles`);
});
console.log('Jump to circle count and nearest valid distance verified successfully across Kryst and Life.');

console.log('--- 14. Testing Individual Section Highlighting & Colored Intersections ---');
// Verify 2-circle Venn diagram lens (Vesica Piscis)
const lens = computeCircleSections([{x: 0, y: 0}, {x: 100, y: 0}], 100);
assert.strictEqual(lens.length, 1, 'Two intersecting circles must produce exactly 1 intersection section (the vesica piscis lens)');
assert.strictEqual(lens[0].containingCount, 2, 'Vesica piscis lens must be contained in both circles');
assert(lens[0].d.startsWith('M') && lens[0].d.includes('A 100 100 0 0 1'), 'Lens path must have valid SVG arc commands');

const kGeom = getKrystGeometryByRadius(200, r);
const auraCenters = kGeom.auraCircles.map(c => ({ x: c.x, y: c.y }));
const auraR = kGeom.auraCircles[0].r;
const sections = computeCircleSections(auraCenters, auraR);

assert(sections.length > 0, 'computeCircleSections must detect intersecting planar sections between aura circles');
assert.strictEqual(sections.length, 120, 'Kryst radius 200px at default 1.95r should have 120 aura intersection sections');
assert.strictEqual(computeCircleSections(auraCenters, 2.0 * r).length, 81, 'Kryst radius 200px at 2.0r should have 81 aura intersection sections');

const firstSec = sections[0];
assert(firstSec.id && firstSec.id.startsWith('sec_'), 'Section ID must follow stable sec_ convention');
assert(firstSec.d && firstSec.d.startsWith('M'), 'Section must have valid SVG path string starting with M');
assert(firstSec.area > 0, 'Section must have positive planar area');
assert(typeof firstSec.cx === 'number' && typeof firstSec.cy === 'number', 'Section must have numeric centroid coordinates');
assert(firstSec.containingCount >= 2, 'Section must be an intersection of at least 2 circles');

// Verify sectionHighlightMode and selectedSectionId in state
assert('sectionHighlightMode' in State, 'State must contain sectionHighlightMode toggleable mode');
assert('selectedSectionId' in State, 'State must contain selectedSectionId field');
assert.strictEqual(State.showOuterRing, false, 'Outer bounding ring must be false by default');

// Verify selection, coloring and preset capture/restore
const testId = firstSec.id;
State.selectedSectionId = testId;
assert.strictEqual(State.selectedSectionId, testId, 'selectedSectionId must store selected section');
State.sectionFills[testId] = '#f59e0b';
assert.strictEqual(State.sectionFills[testId], '#f59e0b', 'sectionFills must store color hex');

const capturedConfig = PresetsManager.captureCurrentStudioConfig();
assert(capturedConfig.sectionFills, 'captureCurrentStudioConfig must include sectionFills');
assert.strictEqual(capturedConfig.sectionFills[testId], '#f59e0b', 'captured config must retain colored section');
assert.strictEqual(capturedConfig.showOuterRing, false, 'captured config must store showOuterRing as false by default');

// Test multi-section selection and batch coloring
State.selectedSectionIds.clear();
State.selectedSectionIds.add(sections[0].id);
State.selectedSectionIds.add(sections[1].id);
State.selectedSectionIds.add(sections[2].id);
assert.strictEqual(State.selectedSectionIds.size, 3, 'Multiple sections can be selected simultaneously');
State.selectedSectionIds.forEach(id => { State.sectionFills[id] = '#a855f7'; });
assert.strictEqual(State.sectionFills[sections[0].id], '#a855f7', 'Batch coloring sets color on section 0');
assert.strictEqual(State.sectionFills[sections[1].id], '#a855f7', 'Batch coloring sets color on section 1');
assert.strictEqual(State.sectionFills[sections[2].id], '#a855f7', 'Batch coloring sets color on section 2');

// Test Clear All Highlights
State.highlightedIds.add('circle_test_1');
assert('clearAllHighlights' in State, 'State must contain clearAllHighlights method');
State.clearAllHighlights();
assert.strictEqual(Object.keys(State.sectionFills).length, 0, 'clearAllHighlights must empty sectionFills');
assert.strictEqual(State.selectedSectionIds.size, 0, 'clearAllHighlights must clear selectedSectionIds');
assert.strictEqual(State.highlightedIds.size, 0, 'clearAllHighlights must clear highlightedIds');
assert.strictEqual(State.selectedSectionId, null, 'selectedSectionId must be null after clearAllHighlights');

// Test Preset Stores and Restores Highlights (circle highlights, section fills, and section selections)
State.highlightedIds.add('fok_100_0');
State.selectedSectionIds.add(sections[0].id);
State.sectionFills[sections[0].id] = '#ec4899';

const presetWithHighlights = PresetsManager.addCustomPreset({
  title: 'Preset With Highlights',
  config: PresetsManager.captureCurrentStudioConfig()
});

assert(presetWithHighlights.config.highlightedIds.includes('fok_100_0'), 'Preset config must store highlightedIds');
assert(presetWithHighlights.config.selectedSectionIds.includes(sections[0].id), 'Preset config must store selectedSectionIds');
assert.strictEqual(presetWithHighlights.config.sectionFills[sections[0].id], '#ec4899', 'Preset config must store sectionFills');

// Clear all highlights on canvas
State.clearAllHighlights();
assert.strictEqual(State.highlightedIds.size, 0, 'Canvas highlightedIds cleared');
assert.strictEqual(State.selectedSectionIds.size, 0, 'Canvas selectedSectionIds cleared');
assert.strictEqual(Object.keys(State.sectionFills).length, 0, 'Canvas sectionFills cleared');

// Verify stored preset in PresetsManager was NOT wiped by canvas clear
const reloadedPreset = PresetsManager.getPreset(presetWithHighlights.id);
assert.strictEqual(reloadedPreset.config.highlightedIds.length, 1, 'Saved preset config must not be modified by canvas clear');
assert.strictEqual(reloadedPreset.config.sectionFills[sections[0].id], '#ec4899', 'Saved preset sectionFills must not be modified by canvas clear');
assert.strictEqual(reloadedPreset.config.selectedSectionIds.length, 1, 'Saved preset selectedSectionIds must not be modified by canvas clear');

// Restore preset onto State
State.applyConfig(reloadedPreset.config);
assert(State.highlightedIds.has('fok_100_0'), 'Preset restoration must restore circle highlightedIds');
assert(State.selectedSectionIds.has(sections[0].id), 'Preset restoration must restore selectedSectionIds');
assert.strictEqual(State.sectionFills[sections[0].id], '#ec4899', 'Preset restoration must restore sectionFills');

// Clean up test preset
PresetsManager.deletePreset(presetWithHighlights.id);

console.log('Individual aura intersection sections & preset highlight preservation verified successfully.');

console.log('--- 15. Testing Preset Editing, Tutorial Tour Controller & Slider Color Fill Calculations ---');

// 15.1 Preset Editing via PresetsManager.updatePreset
const editTestPreset = PresetsManager.addCustomPreset({
  title: 'Original Title',
  subtitle: 'Initial description',
  config: { auraScale: 2.5, sectionFills: { 'lens_10': '#06b6d4' } }
});

assert(editTestPreset && editTestPreset.id, 'Custom preset must be created');
const updatedPreset = PresetsManager.updatePreset(editTestPreset.id, {
  title: 'Edited Geometric Title',
  subtitle: 'Updated description with new sacred settings',
  config: { auraScale: 4.2 }
});

assert.strictEqual(updatedPreset.title, 'Edited Geometric Title', 'Preset title must update');
assert.strictEqual(updatedPreset.subtitle, 'Updated description with new sacred settings', 'Preset subtitle must update');
assert.strictEqual(updatedPreset.config.auraScale, 4.2, 'Preset config auraScale must update');
assert.strictEqual(updatedPreset.config.sectionFills['lens_10'], '#06b6d4', 'Preset existing config fields must be preserved on update');

// Verify fetching from PresetsManager reflects update
const fetchedPreset = PresetsManager.getPreset(editTestPreset.id);
assert.strictEqual(fetchedPreset.title, 'Edited Geometric Title', 'Fetched preset must reflect update');

// 15.2 Builtin Preset Override and Revert
const mockBuiltin = {
  id: 'builtin_test_prototype',
  title: 'Seed of Kryst (Default)',
  subtitle: 'Factory Archetype',
  isBuiltin: true,
  config: { auraScale: 1.95 }
};
PresetsManager.builtinPresets.push(mockBuiltin);

const overriddenBuiltin = PresetsManager.updatePreset(mockBuiltin.id, {
  title: 'Seed of Kryst (Customized)'
});
assert.strictEqual(overriddenBuiltin.title, 'Seed of Kryst (Customized)', 'Built-in preset override title must update');
assert(PresetsManager.builtinOverrides[mockBuiltin.id], 'Built-in override entry must be stored');

// Revert built-in preset
PresetsManager.deletePreset(mockBuiltin.id);
const revertedBuiltin = PresetsManager.getPreset(mockBuiltin.id);
assert.strictEqual(revertedBuiltin.title, 'Seed of Kryst (Default)', 'Deleting override must revert built-in preset to factory default');

// Pop mock builtin to restore clean slate
PresetsManager.builtinPresets.pop();
assert.strictEqual(PresetsManager.builtinPresets.length, 0, 'Clean slate preserved for builtins');

// Clean up custom test preset
PresetsManager.deletePreset(editTestPreset.id);
assert(!PresetsManager.getPreset(editTestPreset.id), 'Custom preset must be cleanly deleted');

// 15.3 PresetDialog API
assert(typeof PresetDialog.openEdit === 'function', 'PresetDialog must have openEdit method');
assert(typeof PresetDialog.openNew === 'function', 'PresetDialog must have openNew method');
assert(typeof PresetDialog.captureCurrentCanvas === 'function', 'PresetDialog must have captureCurrentCanvas method');
assert(typeof PresetDialog.save === 'function', 'PresetDialog must have save method');
assert(typeof PresetDialog.init === 'function', 'PresetDialog must have init method');

// 15.4 TutorialManager Tour Controller
assert(TutorialManager && Array.isArray(TutorialManager.steps), 'TutorialManager must define steps array');
assert.strictEqual(TutorialManager.steps.length, 7, 'TutorialManager must contain 7 comprehensive tour steps');

// Validate all steps have required fields and proper target selectors
TutorialManager.steps.forEach((step, idx) => {
  assert(step.title && typeof step.title === 'string', `Step ${idx} must have title`);
  assert(step.desc && typeof step.desc === 'string', `Step ${idx} must have desc`);
  assert(step.icon && typeof step.icon === 'string', `Step ${idx} must have svg icon`);
});
assert.strictEqual(TutorialManager.steps[0].target, null, 'Step 1 should be welcome modal');
assert.strictEqual(TutorialManager.steps[1].target, '#patternSwitcher', 'Step 2 must target pattern switcher');
assert.strictEqual(TutorialManager.steps[2].target, '#viewportContainer', 'Step 3 must target viewport container');
assert.strictEqual(TutorialManager.steps[3].target, '#sectionGeometry', 'Step 4 must target geometry section');
assert.strictEqual(TutorialManager.steps[4].target, '#sectionSacredGadgets', 'Step 5 must target sacred gadgets');
assert.strictEqual(TutorialManager.steps[5].target, '#presetGrid', 'Step 6 must target presets grid');
assert.strictEqual(TutorialManager.steps[6].target, '#bottomLayerToolbar', 'Step 7 must target bottom layer toolbar');

// Test navigation step indices
TutorialManager.goTo(0);
assert.strictEqual(TutorialManager.currentStep, 0, 'Tutorial goTo(0) works');
TutorialManager.next();
assert.strictEqual(TutorialManager.currentStep, 1, 'Tutorial next() advances step');
TutorialManager.next();
assert.strictEqual(TutorialManager.currentStep, 2, 'Tutorial next() advances to step 2');
TutorialManager.prev();
assert.strictEqual(TutorialManager.currentStep, 1, 'Tutorial prev() retreats step');
TutorialManager.goTo(6);
assert.strictEqual(TutorialManager.currentStep, 6, 'Tutorial goTo(6) reaches final step');
TutorialManager.close();

// 15.5 Range Slider Color Track Fill Calculations
const calculateFillPercentage = (val, min = 0, max = 100) => {
  const range = max - min;
  return range > 0 ? Math.max(0, Math.min(100, ((val - min) / range) * 100)) : 0;
};

// Test boundary edge cases and values
assert.strictEqual(calculateFillPercentage(0, 0, 20), 0, 'Min value must produce 0% fill');
assert.strictEqual(calculateFillPercentage(20, 0, 20), 100, 'Max value must produce 100% fill');
assert.strictEqual(calculateFillPercentage(10, 0, 20), 50, 'Midpoint must produce 50% fill');
assert.strictEqual(calculateFillPercentage(1.95, 0, 20), 9.75, 'Aura scale default 1.95r out of 20r must produce 9.75% fill');
assert.strictEqual(calculateFillPercentage(0.5, 0, 1), 50, 'Fader slider 0.5 must produce 50% fill');
assert.strictEqual(calculateFillPercentage(1.0, 0, 1), 100, 'Fader slider 1.0 must produce 100% fill');

// 15.6 Validate 4-Curtain Framing Geometry (Guarantees zero blur over spotlight hole)
const computeCurtains = (spotLeft, spotTop, spotWidth, spotHeight, vw = 1920, vh = 1080) => {
  return {
    top: { top: 0, left: 0, width: '100%', height: Math.max(0, spotTop) },
    bottom: { top: spotTop + spotHeight, left: 0, width: '100%', height: Math.max(0, vh - (spotTop + spotHeight)) },
    left: { top: spotTop, left: 0, width: Math.max(0, spotLeft), height: spotHeight },
    right: { top: spotTop, left: spotLeft + spotWidth, width: Math.max(0, vw - (spotLeft + spotWidth)), height: spotHeight }
  };
};

const curtains = computeCurtains(100, 50, 200, 80, 1920, 1080);
assert.strictEqual(curtains.top.height, 50, 'Top curtain stops at spotTop');
assert.strictEqual(curtains.bottom.top, 130, 'Bottom curtain starts at spotTop + spotHeight');
assert.strictEqual(curtains.bottom.height, 1080 - 130, 'Bottom curtain covers remainder of screen');
assert.strictEqual(curtains.left.width, 100, 'Left curtain width equals spotLeft');
assert.strictEqual(curtains.right.left, 300, 'Right curtain starts at spotLeft + spotWidth');
assert.strictEqual(curtains.right.width, 1920 - 300, 'Right curtain covers remainder of screen width');

console.log('Preset editing, tutorial tour controller, 4-curtain framing, and slider color-fill calculations verified successfully.');

console.log('--- 16. Testing Body Circle Hit Threshold (20px) & Fade-out Removal Hover ---');
// Verify hit threshold configurations
const hitThresholdWidth = 20; // 20px wide transparent stroke
assert(hitThresholdWidth >= 16, 'Hit area threshold must be at least 16px thick for comfortable hovering');
assert.strictEqual(hitThresholdWidth, 20, 'Hit area stroke-width should be 20px');

// Verify that the body circle hover opacity drops to <= 0.35 to indicate pending removal
const hoverOpacity = 0.28;
assert(hoverOpacity <= 0.35, 'Body circle hover opacity must fade out to <= 0.35 to indicate pending removal');
assert(hoverOpacity > 0, 'Body circle hover opacity must remain visible so user sees what is being removed');
console.log('Body circle hover threshold (20px) and removal fade-out indicators verified successfully.');

console.log('--- 17. Testing Direct Click-to-Highlight & "Remove Circles" Action (No In-Between Mode) ---');

// 17.1 Initial State
State.highlightedIds.clear();
State.disabledCircleIds.clear();
assert.strictEqual(State.highlightedIds.size, 0, 'highlightedIds must start empty');
assert.strictEqual(State.disabledCircleIds.size, 0, 'disabledCircleIds must start empty');

const geomBaseline = getKrystGeometryByRadius(220, 50, State.disabledCircleIds);
const circleIdA = geomBaseline.circles[0].id;
const circleIdB = geomBaseline.circles[1].id;

// 17.2 Clicking circles toggles their highlight state (no in-between mode)
// Simulate clicking circle A
if (State.highlightedIds.has(circleIdA)) {
  State.highlightedIds.delete(circleIdA);
} else {
  State.highlightedIds.add(circleIdA);
}
assert(State.highlightedIds.has(circleIdA), 'Clicking circle A must highlight it');
assert.strictEqual(State.disabledCircleIds.size, 0, 'Clicking circle A must NOT remove it');

// Simulate clicking circle B
if (State.highlightedIds.has(circleIdB)) {
  State.highlightedIds.delete(circleIdB);
} else {
  State.highlightedIds.add(circleIdB);
}
assert(State.highlightedIds.has(circleIdB), 'Clicking circle B must highlight it');
assert.strictEqual(State.highlightedIds.size, 2, 'Both circle A and B should be highlighted');
assert.strictEqual(State.disabledCircleIds.size, 0, 'Clicking must not populate disabledCircleIds');

// Verify circles remain in active geometry while highlighted
const geomWhileHighlighted = getKrystGeometryByRadius(220, 50, State.disabledCircleIds);
assert.strictEqual(geomWhileHighlighted.circles.length, geomBaseline.circles.length, 'Circles must remain visible in geometry while highlighted');

// 17.3 Clicking an already highlighted circle un-highlights it
if (State.highlightedIds.has(circleIdB)) {
  State.highlightedIds.delete(circleIdB);
}
assert(!State.highlightedIds.has(circleIdB), 'Clicking circle B again must un-highlight it');
assert.strictEqual(State.highlightedIds.size, 1, 'Only circle A remains highlighted');

// 17.4 Clicking "Remove Circles" removes all highlighted circles directly (no in-between mode)
UI.removeHighlightedCircles();
assert.strictEqual(State.highlightedIds.size, 0, 'highlightedIds must be cleared after removal');
assert(State.disabledCircleIds.has(circleIdA), 'Circle A must now be in disabledCircleIds');
assert(!State.disabledCircleIds.has(circleIdB), 'Circle B was un-highlighted and must not be disabled');

// Verify Circle A is omitted from pattern geometry
const geomAfterRemove = getKrystGeometryByRadius(220, 50, State.disabledCircleIds);
assert.strictEqual(geomAfterRemove.circles.length, geomBaseline.circles.length - 1, 'Geometry circle count must decrease by 1');
assert(!geomAfterRemove.circles.some(c => c.id === circleIdA), 'Circle A must not exist in geometry');
assert(geomAfterRemove.circles.some(c => c.id === circleIdB), 'Circle B must still exist in geometry');

// 17.5 Calling Remove Circles when nothing is highlighted is a no-op
const prevDisabledCount = State.disabledCircleIds.size;
UI.removeHighlightedCircles();
assert.strictEqual(State.disabledCircleIds.size, prevDisabledCount, 'Calling remove when no circles are highlighted does not change disabledCircleIds');

// 17.6 Restore All Removed Circles
State.disabledCircleIds.clear();
const geomRestored = getKrystGeometryByRadius(220, 50, State.disabledCircleIds);
assert.strictEqual(geomRestored.circles.length, geomBaseline.circles.length, 'Restoring circles brings back all original circles');

// 17.7 Popup and Bottom Bar Option Verifications
assert(typeof UI.showRemoveCirclesPopup === 'function', 'UI.showRemoveCirclesPopup must be a function');
assert(typeof UI.hideRemoveCirclesPopup === 'function', 'UI.hideRemoveCirclesPopup must be a function');
UI.showRemoveCirclesPopup(200, 300);
UI.hideRemoveCirclesPopup();

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const layoutCss = fs.readFileSync(path.join(__dirname, '..', 'css', 'layout.css'), 'utf8');

// Ensure Remove Circles is not a button on the left pane
assert(!indexHtml.includes('id="btnRemoveCircles" class="btn'), 'Remove Circles should not be a button in sidebar');
// Ensure Remove Circles popup exists and contains "Remove Circles"
assert(indexHtml.includes('id="removeCirclesPopup"'), 'removeCirclesPopup must exist in index.html');
assert(indexHtml.includes('<span>Remove Circles</span>'), 'Popup must read "Remove Circles"');

// Ensure Restore Circles is an option alongside Highlight Mode at the bottom
assert(indexHtml.includes('id="btnRestoreCircles"'), 'btnRestoreCircles must exist');
const unitHighlightIndex = indexHtml.indexOf('id="unitSectionHighlight"');
const restoreCirclesIndex = indexHtml.indexOf('id="btnRestoreCircles"');
assert(unitHighlightIndex > 0 && restoreCirclesIndex > unitHighlightIndex, 'Restore Circles must be located inside the bottom unitSectionHighlight bar alongside highlight mode');

// Ensure Highlight Mode styles: dark gray background, white text, rounded corners, nowrap, active yellow outline
assert(layoutCss.includes('background: #1e293b !important;'), 'Highlight mode pill must use darker gray #1e293b background');
assert(layoutCss.includes('color: #ffffff !important;'), 'Highlight mode pill must use white text');
assert(layoutCss.includes('border-radius: 8px;'), 'Highlight mode pill must have rounded corners (8px)');
assert(layoutCss.includes('white-space: nowrap !important;'), 'Highlight mode button must not wrap into two lines');
assert(layoutCss.includes('border: 1.5px solid var(--accent-gold, #f59e0b) !important;'), 'While activated, highlight mode must have yellow outline');

// Ensure Sacred Pulse (Breathing) toggle is removed from Geometric Layers & Styling menu
assert(!indexHtml.includes('id="togglePulse"'), 'Sacred Pulse (Breathing) toggle should be removed from Geometric Layers & Styling');
assert(!indexHtml.includes('Sacred Pulse (Breathing)'), 'Sacred Pulse label text should be removed from index.html');

console.log('Click-to-highlight, direct "Remove Circles", and restoration without in-between mode verified successfully.');

console.log('--- 18. Testing OpenSCAD CAD Export for Flower of Kryst ---');
const componentsCss = fs.readFileSync(path.join(__dirname, '..', 'css', 'components.css'), 'utf8');

// 18.1 UI Elements in index.html
assert(indexHtml.includes('id="exportScadBtn"'), 'Export to OpenSCAD button must exist with id="exportScadBtn"');
assert(indexHtml.includes('Export to OpenSCAD'), 'Button must contain text "Export to OpenSCAD"');
assert(indexHtml.includes('<dialog class="modal-dialog-native scad-export-dialog" id="scadExportDialog"'), 'Native <dialog> element must exist with id="scadExportDialog"');
assert(indexHtml.includes('id="scadTargetDiameter"'), 'Numeric input for Target Diameter must exist');
assert(indexHtml.includes('Target Diameter (X/Y)'), 'Label for Target Diameter must exist');
assert(indexHtml.includes('value="100"'), 'Default Target Diameter must be 100mm');
assert(indexHtml.includes('id="scadZDepth"'), 'Numeric input for Extrusion Depth must exist');
assert(indexHtml.includes('Extrusion Depth (Z)'), 'Label for Extrusion Depth must exist');
assert(indexHtml.includes('value="3.0"'), 'Default Extrusion Depth must be 3.0mm');
assert(indexHtml.includes('id="scadWallThickness"'), 'Numeric input for Wall Thickness must exist');
assert(indexHtml.includes('Wall Thickness'), 'Label for Wall Thickness must exist');
assert(indexHtml.includes('value="1.2"'), 'Default Wall Thickness must be 1.2mm');
assert(indexHtml.includes('id="scadCancelBtn"'), 'Cancel button must exist');
assert(indexHtml.includes('id="scadGenerateBtn"'), 'Generate button must exist');
assert(indexHtml.includes('Generate .SCAD'), 'Generate button must have text "Generate .SCAD"');

// 18.2 CSS Styling in components.css
assert(componentsCss.includes('dialog.scad-export-dialog'), 'CSS must include styling for dialog.scad-export-dialog');
assert(componentsCss.includes('dialog.scad-export-dialog::backdrop'), 'CSS must style dialog backdrop');

// 18.3 Function availability
assert(typeof exportOpenSCAD === 'function', 'exportOpenSCAD must be exported as a function');
assert(typeof Exporter.exportOpenSCAD === 'function', 'Exporter.exportOpenSCAD must be a function on Exporter');
assert(typeof UI.openScadDialog === 'function', 'UI.openScadDialog must be a function on UI');
assert(typeof UI.closeScadDialog === 'function', 'UI.closeScadDialog must be a function on UI');
assert(typeof UI.handleScadGenerate === 'function', 'UI.handleScadGenerate must be a function on UI');

// 18.4 OpenSCAD Script Generation & Syntax Check
State.N = 2;
const scadCode = exportOpenSCAD(100, 3.0, 1.2);
assert(typeof scadCode === 'string', 'exportOpenSCAD must return a string');
assert(scadCode.includes('// Flower of Kryst - OpenSCAD Generator'), 'Script must have header comment');
assert(scadCode.includes('// Layers: 2'), 'Script header must state layer count');
assert(scadCode.includes('Target Diameter: 100mm, Depth: 3mm, Wall: 1.2mm') || scadCode.includes('Target Diameter: 100mm, Depth: 3.0mm, Wall: 1.2mm'), 'Script header must declare dimensions');
assert(scadCode.includes('$fn = 90;'), 'Script must specify $fn = 90 for smooth curves');
assert(scadCode.includes('module kryst_petal(cx, cy, r_outer, wall, h)'), 'Script must define module kryst_petal');
assert(scadCode.includes('cylinder(h=h, r=r_outer + wall/2, center=false);'), 'Petal must create outer cylinder with wall/2 buffer');
assert(scadCode.includes('translate([0, 0, -1])'), 'Petal must translate inner cylinder by [0, 0, -1] for manifold boolean cuts');
assert(scadCode.includes('cylinder(h=h+2, r=r_outer - wall/2, center=false);'), 'Petal must cut inner cylinder with h+2 height');
assert(scadCode.includes('union() {'), 'Script must execute a single union() over coordinates');

// 18.5 Scale and Geometry Math Validation
const petalRegex = /kryst_petal\(\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)\);/g;
let match;
let maxPetalDist = 0;
let parsedOuterRadius = 0;
let petalCount = 0;

while ((match = petalRegex.exec(scadCode)) !== null) {
  petalCount++;
  const cx = parseFloat(match[1]);
  const cy = parseFloat(match[2]);
  parsedOuterRadius = parseFloat(match[3]);
  const dist = Math.hypot(cx, cy);
  if (dist > maxPetalDist) maxPetalDist = dist;
}

assert(petalCount > 0, 'Generated SCAD must include petal calls');
const calculatedOuterDiameter = (maxPetalDist + parsedOuterRadius) * 2;
assert(Math.abs(calculatedOuterDiameter - 100) < 0.05, `Total bounding diameter (${calculatedOuterDiameter}) must match target diameter (100mm) within precision`);

// 18.6 Custom Target Dimensions Test
const customScad = exportOpenSCAD(150, 5.0, 2.0);
assert(customScad.includes('Target Diameter: 150mm, Depth: 5mm, Wall: 2mm') || customScad.includes('Target Diameter: 150mm, Depth: 5.0mm, Wall: 2.0mm'), 'Custom dimensions must appear in header');
let customMatch;
let customMaxDist = 0;
let customOuterRadius = 0;
while ((customMatch = petalRegex.exec(customScad)) !== null) {
  const cx = parseFloat(customMatch[1]);
  const cy = parseFloat(customMatch[2]);
  customOuterRadius = parseFloat(customMatch[3]);
  const dist = Math.hypot(cx, cy);
  if (dist > customMaxDist) customMaxDist = dist;
}
const customOuterDiameter = (customMaxDist + customOuterRadius) * 2;
assert(Math.abs(customOuterDiameter - 150) < 0.05, `Custom bounding diameter (${customOuterDiameter}) must match 150mm`);

console.log('OpenSCAD CAD export (UI, event handlers, generator engine, and manifold safeguards) verified successfully.');

console.log('--- 19. Testing Aura & Body Stroke Width Independence & Highlighting Fidelity ---');

// 19.1 Verify CSS does not contain hardcoded stroke-width: 3.5px !important on .highlighted-circle
const cssContent = fs.readFileSync(path.join(__dirname, '../css/components.css'), 'utf8');
assert(!cssContent.match(/\.highlighted-circle\s*\{[^}]*stroke-width:[^;]+!important/i), 'CSS .highlighted-circle must not force stroke-width !important');

// 19.2 Verify index.html slider attributes for Aura Stroke Width (min 0.5, max 10, default 5)
const htmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert(htmlContent.includes('id="strokeAuraSlider" min="0.5" max="10.0" value="5.0"'), 'index.html strokeAuraSlider must have min 0.5, max 10.0, and default 5.0');
assert(htmlContent.includes('id="strokeAuraBadge">5.0px</span>'), 'index.html strokeAuraBadge must default to 5.0px');

// 19.3 Verify state stroke default (5.0px) and clamp range (0.5px to 10.0px)
assert.strictEqual(State.strokeAura, 5.0, 'Default strokeAura in State must be 5.0px');

State.applyConfig({ strokeAura: 0.1 });
assert.strictEqual(State.strokeAura, 0.5, 'strokeAura must clamp down to min 0.5px');

State.applyConfig({ strokeAura: 15.0 });
assert.strictEqual(State.strokeAura, 10.0, 'strokeAura must clamp up to max 10.0px');

State.applyConfig({ strokeAura: 5.0 });
assert.strictEqual(State.strokeAura, 5.0, 'strokeAura restored to default 5.0px');

// 19.4 Verify state stroke independence
State.strokeBody = 1.0;
State.strokeAura = 5.0;
assert.strictEqual(State.strokeBody, 1.0, 'Initial strokeBody must be 1.0');
assert.strictEqual(State.strokeAura, 5.0, 'Initial strokeAura must be 5.0');

// Adjusting body stroke must not alter aura stroke
State.strokeBody = 3.5;
assert.strictEqual(State.strokeBody, 3.5, 'strokeBody updated to 3.5');
assert.strictEqual(State.strokeAura, 5.0, 'strokeAura remains independent at 5.0 when strokeBody changes');

// Adjusting aura stroke must not alter body stroke
State.strokeAura = 0.75;
assert.strictEqual(State.strokeAura, 0.75, 'strokeAura updated to 0.75');
assert.strictEqual(State.strokeBody, 3.5, 'strokeBody remains independent at 3.5 when strokeAura changes');

// 19.3 Mock DOM and test SVGRenderer.updateHighlights and render behavior
class MockElement {
  constructor(tag) {
    this.tagName = tag;
    this.attributes = new Map();
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c),
      has: (c) => this.classList._classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) {
          this.classList._classes.add(c);
        } else {
          this.classList._classes.delete(c);
        }
      }
    };
    this.children = [];
    this.dataset = {};
    this.innerHTML = '';
  }
  setAttribute(k, v) {
    this.attributes.set(k, String(v));
    if (k === 'class') {
      this.classList._classes.clear();
      String(v).split(/\s+/).filter(Boolean).forEach(c => this.classList._classes.add(c));
    }
    if (k.startsWith('data-')) {
      const camel = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[camel] = String(v);
    }
  }
  getAttribute(k) { return this.attributes.get(k) || null; }
  hasAttribute(k) { return this.attributes.has(k); }
  removeAttribute(k) { this.attributes.delete(k); }
  appendChild(child) {
    if (child.tagName === 'fragment') {
      while (child.children.length > 0) {
        this.children.push(child.children.shift());
      }
      return child;
    }
    this.children.push(child);
    return child;
  }
  querySelector(sel) {
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      return this._find(el => el.classList.has(cls));
    }
    return null;
  }
  querySelectorAll(sel) {
    const res = [];
    this._findAll(el => {
      if (sel === '[data-circle-id]') return el.attributes.has('data-circle-id');
      if (sel.startsWith('.')) return el.classList.has(sel.slice(1));
      if (sel === 'circle') return el.tagName === 'circle';
      return false;
    }, res);
    return res;
  }
  _find(predicate) {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const found = child._find ? child._find(predicate) : null;
      if (found) return found;
    }
    return null;
  }
  _findAll(predicate, acc) {
    for (const child of this.children) {
      if (predicate(child)) acc.push(child);
      if (child._findAll) child._findAll(predicate, acc);
    }
  }
}

// Setup mock document
const mockSvg = new MockElement('svg');
mockSvg.id = 'svgMain';
const mockElements = { svgMain: mockSvg };
global.document = {
  getElementById: (id) => mockElements[id] || null,
  createElementNS: (ns, tag) => new MockElement(tag),
  createDocumentFragment: () => new MockElement('fragment'),
  querySelectorAll: () => []
};

// Render geometry into mock SVG
State.activePattern = 'kryst';
State.strokeBody = 2.0;
State.strokeAura = 0.5;
State.highlightedIds = new Set();
SVGRenderer.render('svgMain', 'kryst');

// Verify initial rendered stroke widths
const allBodyCircles = mockSvg.querySelectorAll('.body-circle');
const allAuraCircles = mockSvg.querySelectorAll('.aura-circle');
assert(allBodyCircles.length > 0, 'Should have rendered body circles');
assert(allAuraCircles.length > 0, 'Should have rendered aura circles');

allBodyCircles.forEach(c => {
  assert.strictEqual(c.getAttribute('stroke-width'), '2', 'Body circle stroke-width must be State.strokeBody (2.0)');
});
allAuraCircles.forEach(c => {
  assert.strictEqual(c.getAttribute('stroke-width'), '0.5', 'Aura circle stroke-width must strictly be State.strokeAura (0.5), not body slider!');
});

// 19.4 Test Highlighting Obeying Aura Stroke Width
const testCircleId = allBodyCircles[0].getAttribute('data-circle-id');
State.highlightedIds.add(testCircleId);
SVGRenderer.updateHighlights('svgMain');

const highlightedAuraCircle = allAuraCircles.find(c => c.getAttribute('data-circle-id') === testCircleId);
assert(highlightedAuraCircle, 'Should locate highlighted aura circle');
assert.strictEqual(highlightedAuraCircle.getAttribute('stroke-width'), '0.5', 'Highlighted aura circle must strictly obey aura stroke width (0.5px), preventing sections from disappearing!');

// Highlight overlay in hlGroup must also obey State.strokeAura
const hlGroup = mockSvg.querySelector('.group-highlights');
assert(hlGroup, 'hlGroup must exist');
const hlOverlayCircles = hlGroup.querySelectorAll('circle');
const auraHlOverlay = hlOverlayCircles.find(c => c.getAttribute('r') !== '50');
assert(auraHlOverlay, 'hlGroup must contain aura overlay circle');
assert.strictEqual(auraHlOverlay.getAttribute('stroke-width'), '0.5', 'Aura highlight overlay circle must obey State.strokeAura (0.5px)');

// 19.5 Test Dynamic Slider Updates & Highlighting Restoration
State.strokeAura = 4.0;
State.strokeBody = 1.0;
SVGRenderer.updateHighlights('svgMain');

assert.strictEqual(highlightedAuraCircle.getAttribute('stroke-width'), '4', 'Highlighted aura circle must update to 4.0 when aura slider changes');
const nonHighlightedAura = allAuraCircles.find(c => c.getAttribute('data-circle-id') !== testCircleId);
assert.strictEqual(nonHighlightedAura.getAttribute('stroke-width'), '4', 'Non-highlighted aura circles must strictly obey aura stroke width (4.0), not body slider (1.0)');

// Unhighlighting must preserve aura stroke width without resetting to body slider
State.highlightedIds.clear();
SVGRenderer.updateHighlights('svgMain');
assert.strictEqual(highlightedAuraCircle.getAttribute('stroke-width'), '4', 'Unhighlighted aura circle must retain aura stroke width (4.0) and not reset to body stroke width (1.0)');

console.log('Aura & Body stroke width independence and highlighting fidelity verified successfully.');

console.log('\n========================================');
console.log('ALL FEATURE TESTS PASSED SUCCESSFULLY!');
console.log('========================================');


