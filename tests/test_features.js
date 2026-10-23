/**
 * Comprehensive Feature Verification Test Suite
 * Tests boundary radius calculation, circle counting, stage names,
 * circle removal (E-05), SOHOE, Hexagram-12 Eyes, Offset Paths,
 * Story and Ring Notes data, and PresetsManager clean slate.
 */
import assert from 'assert';
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
import { State, PresetsManager, Spectral12Colors } from '../js/state.js';

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

console.log('--- 8. Testing Presets Clean Slate (E-11) ---');
assert(Array.isArray(PresetsManager.builtinPresets), 'builtinPresets must be array');
assert.strictEqual(PresetsManager.builtinPresets.length, 0, 'builtinPresets must be strictly empty (no hardcoded presets)');
console.log('PresetsManager confirmed: Clean slate with zero pre-defined presets.');

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

console.log('--- 11. Testing Aura Size Adjustment (2r to 6r) ---');
[2.0, 3.5, 4.0, 5.2, 6.0].forEach(scale => {
  const krystGeom = getKrystGeometryByRadius(300, r, new Set(), false, scale);
  assert(krystGeom.auraCircles.length > 0, `Kryst should have aura circles at scale ${scale}`);
  const expectedR = Number((scale * r).toFixed(3));
  assert.strictEqual(krystGeom.auraCircles[0].r, expectedR, `Aura circle radius should equal ${scale} * r = ${expectedR}px`);

  const lifeGeom = getFlowerOfLifeGeometryByRadius(300, r, new Set(), false, scale);
  assert(lifeGeom.auraCircles.length > 0, `Life should have aura circles at scale ${scale}`);
  assert.strictEqual(lifeGeom.auraCircles[0].r, expectedR, `Life aura circle radius should equal ${scale} * r = ${expectedR}px`);
});
console.log('Aura scaling verified successfully across 2.0r, 3.5r, 4.0r, 5.2r, and 6.0r.');

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
assert.strictEqual(sections.length, 81, 'Kryst radius 200px should have 81 aura intersection sections (including all 2-circle lenses and multi-circle intersections)');

const firstSec = sections[0];
assert(firstSec.id && firstSec.id.startsWith('sec_'), 'Section ID must follow stable sec_ convention');
assert(firstSec.d && firstSec.d.startsWith('M'), 'Section must have valid SVG path string starting with M');
assert(firstSec.area > 0, 'Section must have positive planar area');
assert(typeof firstSec.cx === 'number' && typeof firstSec.cy === 'number', 'Section must have numeric centroid coordinates');
assert(firstSec.containingCount >= 2, 'Section must be an intersection of at least 2 circles');

// Verify sectionHighlightMode in state
assert('sectionHighlightMode' in State, 'State must contain sectionHighlightMode toggleable mode');

// Verify coloring and preset capture/restore
const testId = firstSec.id;
State.sectionFills[testId] = '#f59e0b';
assert.strictEqual(State.sectionFills[testId], '#f59e0b', 'sectionFills must store color hex');

const capturedConfig = PresetsManager.captureCurrentStudioConfig();
assert(capturedConfig.sectionFills, 'captureCurrentStudioConfig must include sectionFills');
assert.strictEqual(capturedConfig.sectionFills[testId], '#f59e0b', 'captured config must retain colored section');

// Clear and restore
State.sectionFills = {};
assert.strictEqual(Object.keys(State.sectionFills).length, 0, 'sectionFills can be cleared');
State.sectionFills = { ...capturedConfig.sectionFills };
assert.strictEqual(State.sectionFills[testId], '#f59e0b', 'sectionFills successfully restored from preset config');

console.log('Individual aura intersection sections & preset saving verified successfully.');

console.log('\n========================================');
console.log('ALL FEATURE TESTS PASSED SUCCESSFULLY!');
console.log('========================================');

