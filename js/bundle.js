/**
 * SACRED GEOMETRY STUDIO — STANDALONE BUNDLE
 * Enables seamless execution on both file:/// direct protocol and local HTTP server.
 * Built automatically from ES modules.
 */
(function(window, document) {
  'use strict';


/* --- js/geometry.js --- */
/**
 * SACRED GEOMETRY MATHEMATICAL ENGINE
 * Pure mathematical functions for Flower of Life & Flower of Kryst.
 * Strictly pure functions with no DOM or global state access.
 */

/* =========================================================================
   1. CORE GEOMETRIC RULES & CONSTANTS
   ========================================================================= */
const SQRT3 = Math.sqrt(3);
const DIST_TRI_INNER = 2 + SQRT3;         // (2 + √3) ≈ 3.7320508 (radial distance to triangle base midpoint)
const DIST_TRI_APEX = 2 + 2 * SQRT3;     // (2 + 2√3) ≈ 5.4641016 (radial distance to triangle apex circle)
const STAMP_STEP = 4 + 2 * SQRT3;     // (4 + 2√3) ≈ 7.4641016 (center-to-center distance between hexagons)
const DIST_BRIDGE_BASE = 4 + 3 * SQRT3; // (4 + 3√3) ≈ 9.1961524 (outer bridge triangle base midpoint)
const EPSILON = 1e-3;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const SQRT_3 = SQRT3;
const COS_30 = SQRT_3 / 2; // Math.cos(Math.PI / 6)
const SIN_30 = 0.5;        // Math.sin(Math.PI / 6)
const COS_60 = 0.5;        // Math.cos(Math.PI / 3)
const SIN_60 = SQRT_3 / 2; // Math.sin(Math.PI / 3)
const SIN_15 = (Math.sqrt(6) - Math.sqrt(2)) / 4;
const COS_15 = (Math.sqrt(6) + Math.sqrt(2)) / 4;

/* =========================================================================
   PURE HELPER FUNCTIONS
   ========================================================================= */

/**
 * Checks whether a 2D coordinate is within spatial tolerance of any point in the list.
 * @param {Array<{x: number, y: number}>} points - List of points.
 * @param {number} x - X-coordinate to test.
 * @param {number} y - Y-coordinate to test.
 * @param {number} tolerance - Minimum distance threshold.
 * @returns {boolean} True if a point exists within tolerance.
 */
function isDuplicatePoint(points, x, y, tolerance) {
  const tolSq = tolerance * tolerance;
  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - x;
    const dy = points[i].y - y;
    if (dx * dx + dy * dy < tolSq) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a guide shape already exists in the list.
 * @param {Array<{type: string, cx: number, cy: number, radius?: number}>} guides - Existing guides.
 * @param {{type: string, cx: number, cy: number, radius?: number}} candidate - Candidate guide.
 * @param {number} tolerance - Spatial tolerance threshold.
 * @returns {boolean} True if an equivalent guide exists.
 */
function isDuplicateGuide(guides, candidate, tolerance) {
  const tolSq = tolerance * tolerance;
  for (let i = 0; i < guides.length; i++) {
    const g = guides[i];
    if (g.type === candidate.type) {
      const dx = g.cx - candidate.cx;
      const dy = g.cy - candidate.cy;
      if (dx * dx + dy * dy < tolSq) {
        return true;
      }
    }
  }
  return false;
}

/* =========================================================================
   2. SINGLE STAMP DEFINITION (createKrystStamp)
   ========================================================================= */

/**
 * Generates a single Kryst Stamp centered at (cx, cy).
 * Extends from its innermost hexagon out to its surrounding ring of 6 outer hexagons,
 * with 3-circle triangles filling the spaces in between.
 *
 * Crucial Center-Circle Rule:
 * - ONLY the global center hexagon at (0, 0) has NO circle in its center.
 * - Every hexagon outside (0, 0) MUST have a circle placed at its center (hx, hy).
 *
 * @param {number} cx - Center X coordinate.
 * @param {number} cy - Center Y coordinate.
 * @param {number} r - Base circle radius.
 * @returns {{circles: Array<{x: number, y: number, role: 'hexagon'|'hexagon-center'|'triangle'}>, guides: Array<{type: 'hexagon'|'triangle', cx: number, cy: number, radius?: number, vertices: Array<{x: number, y: number}>}>, outerHexagonCenters: Array<{x: number, y: number}>}}
 */
function createKrystStamp(cx, cy, r) {
  const circles = [];
  const guides = [];
  const outerHexagonCenters = [];

  // -----------------------------------------------------------------------
  // A. Innermost Hexagon (at cx, cy)
  // -----------------------------------------------------------------------

  // 1. Center Circle (Only during restamp / away from origin)
  if (Math.hypot(cx, cy) > EPSILON * r) {
    circles.push({ x: cx, y: cy, role: 'hexagon-center' });
  }

  // 2. 6 Hexagon Ring Circles (Flat sides top and bottom: angles along m * 60°)
  const innerHexVertices = [];
  for (let m = 0; m < 6; m++) {
    const theta = m * (Math.PI / 3);
    const x = cx + 2 * r * Math.cos(theta);
    const y = cy + 2 * r * Math.sin(theta);
    circles.push({ x, y, role: 'hexagon' });
    innerHexVertices.push({ x, y });
  }
  guides.push({
    type: 'hexagon',
    cx,
    cy,
    radius: 2 * r,
    vertices: innerHexVertices
  });

  // -----------------------------------------------------------------------
  // B. Filling Triangles Around the Inner Hexagon (6 Triangles x 3 Circles = 18 Circles)
  // -----------------------------------------------------------------------
  for (let m = 0; m < 6; m++) {
    const theta = m * (Math.PI / 3) + (Math.PI / 6);
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    const tx = -Math.sin(theta);
    const ty = Math.cos(theta);

    // 1. Inner Pair of Triangle Circles (2 circles)
    const Tm1 = {
      x: cx + DIST_TRI_INNER * r * ux - r * tx,
      y: cy + DIST_TRI_INNER * r * uy - r * ty,
      role: 'triangle'
    };
    const Tm2 = {
      x: cx + DIST_TRI_INNER * r * ux + r * tx,
      y: cy + DIST_TRI_INNER * r * uy + r * ty,
      role: 'triangle'
    };

    // 2. Outer Apex Triangle Circle (1 circle)
    const Tm3 = {
      x: cx + DIST_TRI_APEX * r * ux,
      y: cy + DIST_TRI_APEX * r * uy,
      role: 'triangle'
    };

    circles.push(Tm1, Tm2, Tm3);
    guides.push({
      type: 'triangle',
      cx: (Tm1.x + Tm2.x + Tm3.x) / 3,
      cy: (Tm1.y + Tm2.y + Tm3.y) / 3,
      vertices: [Tm1, Tm2, Tm3]
    });
  }

  // -----------------------------------------------------------------------
  // C. Outer Ring of 6 Hexagons (Plus Gap-Filling Bridge Triangles Between Them)
  // Consecutive layers outside center hexagon rotated 30°: two hexagons flat on top and bottom
  // -----------------------------------------------------------------------
  for (let m = 0; m < 6; m++) {
    const phi = m * (Math.PI / 3);
    const hx = cx + STAMP_STEP * r * Math.cos(phi);
    const hy = cy + STAMP_STEP * r * Math.sin(phi);
    outerHexagonCenters.push({ x: hx, y: hy });

    // 1. Outer Hexagon Center Circle (only if not at global origin (0, 0))
    if (Math.hypot(hx, hy) > EPSILON * r) {
      circles.push({ x: hx, y: hy, role: 'hexagon-center' });
    }

    // 2. Outer Hexagon 6 Ring Circles (Flat sides top and bottom: matching innermost hexagon)
    const outerHexVertices = [];
    for (let j = 0; j < 6; j++) {
      const theta = j * (Math.PI / 3);
      const ox = hx + 2 * r * Math.cos(theta);
      const oy = hy + 2 * r * Math.sin(theta);
      circles.push({ x: ox, y: oy, role: 'hexagon' });
      outerHexVertices.push({ x: ox, y: oy });
    }
    guides.push({
      type: 'hexagon',
      cx: hx,
      cy: hy,
      radius: 2 * r,
      vertices: outerHexVertices
    });
  }

  // 3. Gap-Filling Bridge Triangles Between Adjacent Outer Hexagons
  for (let m = 0; m < 6; m++) {
    const theta = m * (Math.PI / 3) + (Math.PI / 6);
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    const tx = -Math.sin(theta);
    const ty = Math.cos(theta);

    // Bridge apex circle (touching Tm3)
    const Bm1 = {
      x: cx + STAMP_STEP * r * ux,
      y: cy + STAMP_STEP * r * uy,
      role: 'triangle'
    };
    // Outer pair of bridge triangle circles
    const Bm2 = {
      x: cx + (4 + 3 * SQRT3) * r * ux - r * tx,
      y: cy + (4 + 3 * SQRT3) * r * uy - r * ty,
      role: 'triangle'
    };
    const Bm3 = {
      x: cx + (4 + 3 * SQRT3) * r * ux + r * tx,
      y: cy + (4 + 3 * SQRT3) * r * uy + r * ty,
      role: 'triangle'
    };

    circles.push(Bm1, Bm2, Bm3);
    guides.push({
      type: 'triangle',
      cx: (Bm1.x + Bm2.x + Bm3.x) / 3,
      cy: (Bm1.y + Bm2.y + Bm3.y) / 3,
      vertices: [Bm1, Bm2, Bm3]
    });
  }

  return { circles, guides, outerHexagonCenters };
}

/* =========================================================================
   3. LAYER-BASED CONCENTRIC EXPANSION (getKrystGeometry)
   ========================================================================= */

/**
 * Unit Kryst Lattice Cache (r = 1.0)
 * Precomputed on-demand up to layer 42 (and dynamically expands if N > 42).
 */
let _krystLatticeUnitCache = null;

function getKrystUnitLattice(maxLayer = 42) {
  if (_krystLatticeUnitCache && _krystLatticeUnitCache.maxLayer >= maxLayer) {
    return _krystLatticeUnitCache;
  }

  const targetMaxLayer = Math.max(42, maxLayer);
  const maxRadius = 2 * targetMaxLayer;
  const stampRadius = 6 + 2 * SQRT3; // ~ 9.4641
  const neededDistance = maxRadius + stampRadius;
  const maxStampRings = Math.ceil(neededDistance / STAMP_STEP);

  const stampCenters = [];
  for (let q = -maxStampRings; q <= maxStampRings; q++) {
    for (let s = Math.max(-maxStampRings, -q - maxStampRings); s <= Math.min(maxStampRings, -q + maxStampRings); s++) {
      const cx = STAMP_STEP * (q + 0.5 * s);
      const cy = STAMP_STEP * (s * SQRT3 / 2);
      if (Math.hypot(cx, cy) <= neededDistance) {
        stampCenters.push({ x: cx, y: cy });
      }
    }
  }

  const cellSize = 2.0;
  const grid = new Map();
  const allCircles = [];
  const tolSq = EPSILON * EPSILON;

  for (let i = 0; i < stampCenters.length; i++) {
    const sc = stampCenters[i];
    const stamp = createKrystStamp(sc.x, sc.y, 1.0);
    for (let j = 0; j < stamp.circles.length; j++) {
      const c = stamp.circles[j];
      const d = Math.hypot(c.x, c.y);
      if (d < EPSILON) continue;
      if (d > maxRadius + EPSILON) continue;

      const gx = Math.floor(c.x / cellSize);
      const gy = Math.floor(c.y / cellSize);
      let found = null;

      for (let dx = -1; dx <= 1 && !found; dx++) {
        for (let dy = -1; dy <= 1 && !found; dy++) {
          const cell = grid.get(`${gx + dx},${gy + dy}`);
          if (cell) {
            for (let k = 0; k < cell.length; k++) {
              const other = cell[k];
              if ((other.x - c.x) ** 2 + (other.y - c.y) ** 2 < tolSq) {
                found = other;
                break;
              }
            }
          }
        }
      }

      if (found) {
        if ((c.role === 'hexagon' || c.role === 'hexagon-center') && found.role === 'triangle') {
          found.role = c.role;
        }
      } else {
        const layer = Math.max(1, Math.ceil((d - EPSILON) / 2));
        const circleObj = { x: c.x, y: c.y, role: c.role, dist: d, layer };
        allCircles.push(circleObj);
        const key = `${gx},${gy}`;
        let b = grid.get(key);
        if (!b) { b = []; grid.set(key, b); }
        b.push(circleObj);
      }
    }
  }

  allCircles.sort((a, b) => a.dist - b.dist);

  const allGuides = [];
  const guideGrid = new Map();

  for (let i = 0; i < stampCenters.length; i++) {
    const sc = stampCenters[i];
    const stamp = createKrystStamp(sc.x, sc.y, 1.0);
    for (let j = 0; j < stamp.guides.length; j++) {
      const g = stamp.guides[j];
      const gDist = Math.hypot(g.cx, g.cy);
      if (gDist > maxRadius + stampRadius) continue;

      const gx = Math.floor(g.cx / cellSize);
      const gy = Math.floor(g.cy / cellSize);
      let found = false;

      for (let dx = -1; dx <= 1 && !found; dx++) {
        for (let dy = -1; dy <= 1 && !found; dy++) {
          const cell = guideGrid.get(`${gx + dx},${gy + dy}`);
          if (cell) {
            for (let k = 0; k < cell.length; k++) {
              const other = cell[k];
              if (other.type === g.type && (other.cx - g.cx) ** 2 + (other.cy - g.cy) ** 2 < tolSq) {
                found = true;
                break;
              }
            }
          }
        }
      }

      if (!found) {
        const maxVertDist = Math.max(...g.vertices.map(v => Math.hypot(v.x, v.y)));
        const guideLayer = Math.max(1, Math.ceil((maxVertDist - EPSILON) / 2));
        const guideObj = { ...g, maxVertDist, centerDist: gDist, layer: guideLayer };
        allGuides.push(guideObj);
        const key = `${gx},${gy}`;
        let b = guideGrid.get(key);
        if (!b) { b = []; guideGrid.set(key, b); }
        b.push(guideObj);
      }
    }
  }

  _krystLatticeUnitCache = {
    maxLayer: targetMaxLayer,
    circles: allCircles,
    guides: allGuides,
    stampCenters
  };

  return _krystLatticeUnitCache;
}

/**
 * Layer-Based Concentric Engine for Flower of Kryst:
 * A circle projected onto the pattern growing at 2r starting with the first hexagon (Layer 1: R=2r)
 * increments and adds body/aura circles and guide shapes out to N layers (up to 42).
 *
 * @param {number} N - Layer count (N >= 1, slider goes to 42).
 * @param {number} r - Base circle radius.
 * @param {Object} [options={}] - Options (e.g. { mode: 'stamp' } for raw stamp expansion).
 * @returns {{points: Array<{x: number, y: number, role: string, layer: number}>, circles: Array<{x: number, y: number, role: string, layer: number}>, guides: Array<{type: string, cx: number, cy: number, radius?: number, layer: number, vertices: Array<{x: number, y: number}>}>, boundingRadius: number, activeStampCenters: Array<{x: number, y: number}>}}
 */
function getKrystGeometry(N, r, options = {}) {
  if (N <= 0) {
    return {
      points: [],
      circles: [],
      guides: [],
      boundingRadius: 2 * r,
      activeStampCenters: []
    };
  }

  // Stamp mode fallback if explicitly requested
  if (options && options.mode === 'stamp') {
    return getKrystStampGeometry(N, r);
  }

  const lattice = getKrystUnitLattice(Math.max(42, N));
  const maxD = 2 * N + EPSILON;
  const R_layer = 2 * N * r;

  // Filter circles within projected radius
  const circles = [];
  for (let i = 0; i < lattice.circles.length; i++) {
    const c = lattice.circles[i];
    if (c.dist > maxD) break; // circles are pre-sorted by dist
    circles.push({
      x: c.x * r,
      y: c.y * r,
      role: c.role,
      layer: c.layer,
      dist: c.dist * r
    });
  }

  // Filter guides whose vertices are within projected radius
  const guides = [];
  for (let i = 0; i < lattice.guides.length; i++) {
    const g = lattice.guides[i];
    if (g.maxVertDist <= maxD) {
      guides.push({
        type: g.type,
        cx: g.cx * r,
        cy: g.cy * r,
        radius: g.radius ? g.radius * r : undefined,
        layer: g.layer,
        vertices: g.vertices.map(v => ({ x: v.x * r, y: v.y * r }))
      });
    }
  }

  return {
    points: circles,
    circles,
    guides,
    boundingRadius: R_layer,
    activeStampCenters: lattice.stampCenters.map(sc => ({ x: sc.x * r, y: sc.y * r }))
  };
}

/**
 * Raw stamp expansion fallback generator (mode: 'stamp').
 */
function getKrystStampGeometry(N, r) {
  const activeStampCenters = [{ x: 0, y: 0, ring: 0 }];
  const visitedStampCenters = [{ x: 0, y: 0 }];
  let frontier = [{ x: 0, y: 0 }];

  const isVisited = (pt) => {
    const tolSq = (EPSILON * r) * (EPSILON * r);
    return visitedStampCenters.some(v => (v.x - pt.x) ** 2 + (v.y - pt.y) ** 2 < tolSq);
  };

  for (let step = 2; step <= N; step++) {
    const nextFrontier = [];
    for (const c of frontier) {
      for (let m = 0; m < 6; m++) {
        const phi = m * (Math.PI / 3);
        const hx = c.x + STAMP_STEP * r * Math.cos(phi);
        const hy = c.y + STAMP_STEP * r * Math.sin(phi);
        const cand = { x: hx, y: hy, ring: step - 1 };
        if (!isVisited(cand)) {
          visitedStampCenters.push(cand);
          activeStampCenters.push(cand);
          nextFrontier.push(cand);
        }
      }
    }
    frontier = nextFrontier;
  }

  const rawCircles = [];
  const rawGuides = [];
  for (const c of activeStampCenters) {
    const stamp = createKrystStamp(c.x, c.y, r);
    for (const pt of stamp.circles) {
      rawCircles.push({
        ...pt,
        layer: (c.ring || 0) + 1,
        stampCx: c.x,
        stampCy: c.y
      });
    }
    rawGuides.push(...stamp.guides);
  }

  const cellSize = 2 * r;
  const grid = new Map();
  const dedupedCircles = [];
  const tolSq = (EPSILON * r) * (EPSILON * r);

  for (const pt of rawCircles) {
    if (Math.hypot(pt.x, pt.y) < EPSILON * r) continue;

    const gx = Math.floor(pt.x / cellSize);
    const gy = Math.floor(pt.y / cellSize);
    let found = null;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = grid.get(`${gx + dx},${gy + dy}`);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const other = cell[i];
            const distSq = (other.x - pt.x) ** 2 + (other.y - pt.y) ** 2;
            if (distSq < tolSq) {
              found = other;
              break;
            }
          }
        }
        if (found) break;
      }
      if (found) break;
    }

    if (found) {
      if ((pt.role === 'hexagon' || pt.role === 'hexagon-center') && found.role === 'triangle') {
        found.role = pt.role;
      }
      found.layer = Math.min(found.layer, pt.layer);
    } else {
      const newPt = { ...pt };
      dedupedCircles.push(newPt);
      const key = `${gx},${gy}`;
      let cell = grid.get(key);
      if (!cell) { cell = []; grid.set(key, cell); }
      cell.push(newPt);
    }
  }

  const guideGrid = new Map();
  const dedupedGuides = [];
  for (const g of rawGuides) {
    const gx = Math.floor(g.cx / cellSize);
    const gy = Math.floor(g.cy / cellSize);
    let found = false;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = guideGrid.get(`${gx + dx},${gy + dy}`);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const other = cell[i];
            if (other.type === g.type) {
              const distSq = (other.cx - g.cx) ** 2 + (other.cy - g.cy) ** 2;
              if (distSq < tolSq) {
                found = true;
                break;
              }
            }
          }
        }
        if (found) break;
      }
      if (found) break;
    }

    if (!found) {
      dedupedGuides.push(g);
      const key = `${gx},${gy}`;
      let cell = guideGrid.get(key);
      if (!cell) { cell = []; guideGrid.set(key, cell); }
      cell.push(g);
    }
  }

  let maxDist = 0;
  for (const pt of dedupedCircles) {
    const d = Math.hypot(pt.x, pt.y);
    if (d > maxDist) maxDist = d;
  }
  const boundingRadius = (dedupedCircles.length > 0) ? (maxDist + 2 * r) : (2 * r);

  return {
    points: dedupedCircles,
    circles: dedupedCircles,
    guides: dedupedGuides,
    boundingRadius,
    activeStampCenters
  };
}

/**
 * Computes the rotation angle in degrees for concentric hexagonal layer k in Flower of Life.
 * Layer 1 (Genesis core / center ring): 0°
 * Starting from the 3rd circle out (Layer 2 / 3rd layer out and onwards): 30°
 *
 * @param {number} k - Concentric layer index (k >= 1)
 * @returns {number} Rotation angle in degrees
 */
function getFlowerOfLifeLayerRotation(k) {
  if (k <= 1) return 0;
  return 30;
}

/**
 * Returns the effective number of Flower of Life concentric hexagonal layers
 * required to match the spatial expansion rate of the Flower of Kryst at depth N.
 *
 * @param {number} N - Layer progression depth.
 * @param {number} [r=50] - Base circle radius.
 * @returns {number} Number of hexagonal concentric layers.
 */
function getEffectiveLifeLayers(N, r = 50) {
  if (N <= 0) return 0;
  return Math.max(1, N);
}

/**
 * Pure generator for Flower of Life geometry up to depth N.
 * Tracks concentric layer rotations (Layer 1: 0°, Layer 2: +30°, Layer 3: -30°)
 * and outputs circle center points and guide hexagons with rotation tracked and passed along.
 *
 * @param {number} N - Layer progression depth.
 * @param {number} r - Base circle radius.
 * @param {number|null} [explicitLayers=null] - Optional override for explicit layer count.
 * @returns {{
 *   points: Array<{id: string, pattern: 'life', layer: number, edge: number, step: number, x: number, y: number, d: number, angleDeg: number, rotationDeg: number, isVertex: boolean}>,
 *   circles: Array<any>,
 *   guides: Array<{type: 'hexagon', cx: number, cy: number, radius: number, layer: number, rotationDeg: number, vertices: Array<{x: number, y: number}>}>,
 *   boundingRadius: number
 * }}
 */
function getFlowerOfLifeGeometry(N, r, explicitLayers = null) {
  const points = [];
  const guides = [];
  const effectiveLayers = (explicitLayers !== null) ? explicitLayers : getEffectiveLifeLayers(N, r);

  // Layer 0: Origin Center Point
  points.push({
    id: 'fol_0_0',
    pattern: 'life',
    layer: 0,
    edge: 0,
    step: 0,
    index: 0,
    x: 0,
    y: 0,
    d: 0,
    angleDeg: 0,
    rotationDeg: 0,
    isVertex: true
  });

  for (let k = 1; k <= effectiveLayers; k++) {
    const vertexRadius = 2 * k * r;
    const iterationRotationDeg = getFlowerOfLifeLayerRotation(k);
    const vertices = [];

    for (let m = 0; m < 6; m++) {
      const angle = (m * 60 + iterationRotationDeg) * DEG_TO_RAD;
      vertices.push({
        x: Number((vertexRadius * Math.cos(angle)).toFixed(4)),
        y: Number((vertexRadius * Math.sin(angle)).toFixed(4))
      });
    }

    // Guide Hexagon: rotation and vertices tracked and passed along
    guides.push({
      type: 'hexagon',
      cx: 0,
      cy: 0,
      radius: vertexRadius,
      layer: k,
      rotationDeg: iterationRotationDeg,
      vertices
    });

    let pointIndex = 0;
    for (let m = 0; m < 6; m++) {
      const vStart = vertices[m];
      const vEnd = vertices[(m + 1) % 6];
      for (let j = 0; j < k; j++) {
        const t = j / k;
        const x = (1 - t) * vStart.x + t * vEnd.x;
        const y = (1 - t) * vStart.y + t * vEnd.y;
        const d = Math.hypot(x, y);
        let angleDeg = Math.atan2(y, x) * RAD_TO_DEG;
        if (angleDeg < 0) angleDeg += 360;

        points.push({
          id: `fol_${k}_${pointIndex++}`,
          pattern: 'life',
          layer: k,
          edge: m,
          step: j,
          x: Number(x.toFixed(4)),
          y: Number(y.toFixed(4)),
          d: Number(d.toFixed(4)),
          angleDeg: Number(angleDeg.toFixed(2)),
          rotationDeg: iterationRotationDeg,
          isVertex: (j === 0)
        });
      }
    }
  }

  const boundingRadius = (2 * effectiveLayers + 2) * r;
  return {
    points,
    circles: points,
    guides,
    boundingRadius
  };
}

/* =========================================================================
   DYNAMIC BOUNDARY-CIRCLE GEOMETRY ENGINES (E-05, R-B1, R-B2, R-B3)
   ========================================================================= */

const KRYST_STAGE_NAMES = [
  '',
  'Seed of Kryst',
  'Flower of Kryst',
  'Fruit of Kryst',
  'Word of Kryst',
  'Water of Kryst',
  'Eye of Kryst',
  'Shield of Kryst',
  'Pillar of Kryst',
  'Matrix of Kryst',
  'Halo of Kryst',
  'Crown of Kryst',
  'Omnipresent Kryst'
];

const LIFE_STAGE_NAMES = [
  'Genesis Singularity',
  'Seed of Life',
  'Flower of Life',
  'Fruit of Life',
  'Egg of Life',
  'Tree of Life',
  'Vesica Matrix',
  'Metatron Hexagon',
  'Concentric Ring 8',
  'Concentric Ring 9',
  'Concentric Ring 10',
  'Concentric Ring 11',
  'Concentric Ring 12'
];

/**
 * Story of Kryst: 12-stage sacred narrative script of crystallization sequence (R-A12).
 */
const KRYST_STORY_DATA = [
  {
    ring: 1,
    name: 'Seed of Kryst',
    subtitle: 'The Zero-Point Singularity',
    description: 'Six petals emerge around an unmanifested, open zero-point origin. Unlike traditional geometries, the core has no central circle, establishing an unobstructed conduit for divine harmonic flow.'
  },
  {
    ring: 2,
    name: 'Kryst Core (18 Circles)',
    subtitle: 'Triadic Anchoring',
    description: 'Six surrounding equilateral triangles crystallize around the central hexagon, generating 18 tangent body circles. The dual-frequency lattice establishes the stable base of the Krystonial matrix.'
  },
  {
    ring: 3,
    name: 'Fruit of Kryst (30 Circles)',
    subtitle: 'The 12-Lobed Morphic Field',
    description: 'Thirty perfectly tangent circles form a scalloped 12-lobe perimeter. The morphogenetic field expands radially by 2/√3 (+15.47%), opening the portals of multidimensional life.'
  },
  {
    ring: 4,
    name: 'Word of Kryst',
    subtitle: 'The 7-Cluster Logos',
    description: 'The geometric logos speaks into the outer coordinates, translating the initial stamp outward to 6 surrounding hexagon centers, creating the foundational 7-cluster sacred stamp.'
  },
  {
    ring: 5,
    name: 'Water of Kryst',
    subtitle: 'The 19-Cluster Oceanic Grid',
    description: 'Fluid oceanic expansion unfolds across 19 interconnected stamp nodes. Wavefronts of living light cross the boundaries between micro-particle and macro-stellar lattices.'
  },
  {
    ring: 6,
    name: 'Bread of Kryst',
    subtitle: 'Manifest Substantiality',
    description: 'The ethereal geometry crystallizes into tangible structural nourishment, bridging spirit into physical atomic manifestation without energetic loss or harmonic distortion.'
  },
  {
    ring: 7,
    name: 'Crown of Kryst',
    subtitle: 'The Septenary Threshold',
    description: 'The seventh ring illuminates the seven cosmic seals, transmuting lower frequencies into higher-dimensional golden light and establishing the crown of divine sovereignty.'
  },
  {
    ring: 8,
    name: 'Throne of Kryst',
    subtitle: 'Octagonal Stability',
    description: 'Eight-fold cubic and octahedral polarities interlock in immutable balance. The throne of manifestation holds all directional axes in supreme, motionless serenity.'
  },
  {
    ring: 9,
    name: 'Mirror of Kryst',
    subtitle: 'Holographic Reflection',
    description: 'Every point within the matrix becomes an exact holographic mirror of the whole universe. As above, so below; the outer cosmos is fully perceived within the inner core.'
  },
  {
    ring: 10,
    name: 'Pillar of Kryst',
    subtitle: 'The Decagonal Ascension Pillar',
    description: 'A towering vertical column of alignment connects earthly coordinates to celestial origins, forming an unbroken bridge through the dimensional spectrum.'
  },
  {
    ring: 11,
    name: 'Chamber of Kryst',
    subtitle: 'The Sacred Vestibule',
    description: 'The penultimate gate of energetic integration where all disparate geometric streams converge into a unified, resonant chamber of pure coherent frequency.'
  },
  {
    ring: 12,
    name: 'City of Kryst (Heaven on Earth)',
    subtitle: 'The 12-Dimensional Master Matrix',
    description: 'The crowning crystallization: the 12-fold Star of Heaven on Earth anchors completely into reality. The full crystalline grid is awakened as the ultimate living mandala.'
  }
];

/**
 * Ring Notes & Numerology: Detailed observations & significance for rings 1..12 (R-A13).
 */
const RING_NOTES_DATA = [
  {
    ring: 1,
    title: 'Ring 1: Seed of Kryst',
    circleCount: 6,
    geometry: '6 tangent circles of radius r with centers at distance 2r, angles 0°, 60°, 120°, 180°, 240°, 300°. Origin (0,0) is open.',
    esotericMeaning: 'Pure uncorrupted genesis; infinite potential flowing through the unblocked central zero-point.',
    numerology: 'Number 6: Cosmic harmony, balance of polarities, hexadic foundation of crystallographic order.'
  },
  {
    ring: 2,
    title: 'Ring 2: Kryst Core',
    circleCount: 18,
    geometry: '6 inner hexagon circles + 12 triangle base/apex circles. Base midpoint distance (2+√3)r ≈ 3.732r.',
    esotericMeaning: 'Anchoring of the holy trinity within hexagonal manifestation. The bridge between idea and structure.',
    numerology: 'Number 18: 1 + 8 = 9 (completion, divine truth, immortality of spiritual consciousness).'
  },
  {
    ring: 3,
    title: 'Ring 3: Fruit of Kryst',
    circleCount: 30,
    geometry: '30 circles arranged in a scalloped 12-pointed clover. Outer apexes at (2+2√3)r ≈ 5.464r.',
    esotericMeaning: 'Unfolding of the 12 spiritual faculties into organic flowering. Zero overlaps, zero gaps.',
    numerology: 'Number 30: 3 × 10 (Divine order multiplied by perfected completeness).'
  },
  {
    ring: 4,
    title: 'Ring 4: Word of Kryst',
    circleCount: 78,
    geometry: '7 outer hexagon centers positioned at distance (4+2√3)r ≈ 7.464r along 30° radial axes.',
    esotericMeaning: 'Vibration becomes form. The sacred stamp reproduces itself through pure self-similarity.',
    numerology: 'Number 78: 7 + 8 = 15 -> 1 + 5 = 6. Harmony renewed at a higher octave.'
  },
  {
    ring: 5,
    title: 'Ring 5: Water of Kryst',
    circleCount: 156,
    geometry: '19-cluster stamp network with bridge triangles at (4+3√3)r ≈ 9.196r.',
    esotericMeaning: 'Fluid multidimensional conductivity. Living waters flowing through the crystal channels.',
    numerology: 'Number 19: Prime of initiation and celestial illumination.'
  },
  {
    ring: 6,
    title: 'Ring 6: Bread of Kryst',
    circleCount: 258,
    geometry: 'Six-fold radial expansion locking outer perimeter hexagon nodes into interlocking grid rings.',
    esotericMeaning: 'Substantial manifestation: spiritual nourishment condensed into physical reality.',
    numerology: 'Number 6: Dual triad interlocking in perfect physical/spiritual equilibrium.'
  },
  {
    ring: 7,
    title: 'Ring 7: Crown of Kryst',
    circleCount: 384,
    geometry: 'Septenary boundary ring enclosing 7 concentric crystallization shells.',
    esotericMeaning: 'The 7 chakras, 7 rays, and 7 days of cosmic gestation unified into a single radiant halo.',
    numerology: 'Number 7: Sacred perfection, spiritual initiation, and divine alignment.'
  },
  {
    ring: 8,
    title: 'Ring 8: Throne of Kryst',
    circleCount: 534,
    geometry: 'Eight-fold equilibrium threshold holding octahedral and cubic polarities in eternal stillness.',
    esotericMeaning: 'The immovable seat of consciousness holding space for universal transformation.',
    numerology: 'Number 8: The lemniscate, infinite regeneration, and immortal sovereign balance.'
  },
  {
    ring: 9,
    title: 'Ring 9: Mirror of Kryst',
    circleCount: 708,
    geometry: 'Triple-triad self-reflective lattice where every sub-cluster reflects the macrocosmic stamp.',
    esotericMeaning: 'Universal self-realization; seeing the infinite cosmos within the center of one\'s own heart.',
    numerology: 'Number 9: Mastery, supreme wisdom, culmination before universal ascension.'
  },
  {
    ring: 10,
    title: 'Ring 10: Pillar of Kryst',
    circleCount: 906,
    geometry: 'Decagonal vertical spinal alignment channeling cosmic currents directly into terrestrial anchors.',
    esotericMeaning: 'The pillar of light establishing eternal communion between Earth and Source.',
    numerology: 'Number 10: 1 + 0 = 1 (Return to the divine monad through conscious completion).'
  },
  {
    ring: 11,
    title: 'Ring 11: Chamber of Kryst',
    circleCount: 1128,
    geometry: 'Master integration shell harmonizing all 11 prior frequency layers into pure coherence.',
    esotericMeaning: 'The inner sanctum of transformation; preparation for the full anchoring of Heaven on Earth.',
    numerology: 'Master Number 11: High-frequency illumination, psychic portal, and visionary transcendence.'
  },
  {
    ring: 12,
    title: 'Ring 12: City of Kryst',
    circleCount: 1374,
    geometry: 'Complete 12-dimensional crystalline city with 12 radial gateways and full SOHOE star array.',
    esotericMeaning: 'Heaven on Earth realized: the complete manifestation of divine blueprint within reality.',
    numerology: 'Number 12: Divine government, 12 constellations, 12 tribes, complete multidimensional mastery.'
  }
];

/**
 * Dynamic Boundary-Circle Engine for Flower of Kryst (E-05, R-B1, R-B2, R-B3):
 * Renders all body circles whose center distance <= boundaryRadius.
 * Also generates matching expanded aura circles (Radius R = 2r).
 * Filters user-disabled circle IDs and computes per-ring counts and current stage name.
 *
 * @param {number} boundaryRadius - Boundary circle radius in pixels.
 * @param {number} r - Base circle radius in pixels.
 * @param {Set<string>} [disabledIds=new Set()] - Set of circle IDs toggled off by user.
 * @param {boolean} [fullScreen=false] - If true, tiles across extended viewport.
 * @returns {Object} Geometry packet with circles, auraCircles, guides, ringCounts, stageName.
 */
function getKrystGeometryByRadius(boundaryRadius, r, disabledIds = new Set(), fullScreen = false, auraScale = 1.95) {
  const maxRadiusInR = fullScreen ? 40 : Math.max(2, boundaryRadius / r);
  const lattice = getKrystUnitLattice(Math.ceil(maxRadiusInR));
  const maxD = maxRadiusInR + EPSILON;

  const circles = [];
  const auraCircles = [];
  const ringCounts = new Map();
  let totalCircles = 0;
  const effectiveAuraScale = (auraScale !== undefined && auraScale !== null) ? Number(auraScale) : 1.95;

  for (let i = 0; i < lattice.circles.length; i++) {
    const c = lattice.circles[i];
    if (c.dist > maxD) break; // lattice circles are sorted by dist ascending

    const cx = Number((c.x * r).toFixed(3));
    const cy = Number((c.y * r).toFixed(3));
    const distPx = Number((c.dist * r).toFixed(3));

    // Stable coordinate ID
    const circleId = `fok_${Math.round(c.x * 100)}_${Math.round(c.y * 100)}`;
    const semanticId = SacredMath.getSemanticNodeId ? SacredMath.getSemanticNodeId(cx, cy, 0, r) : circleId;

    if (disabledIds && (disabledIds.has(circleId) || (semanticId && disabledIds.has(semanticId)))) {
      continue; // User toggled this circle off
    }

    const ringIndex = Math.max(1, Math.ceil((c.dist - EPSILON) / 2));
    ringCounts.set(ringIndex, (ringCounts.get(ringIndex) || 0) + 1);
    totalCircles++;

    const circleObj = {
      id: circleId,
      semanticId,
      pattern: 'kryst',
      x: cx,
      y: cy,
      r,
      role: c.role,
      layer: c.layer,
      ring: ringIndex,
      dist: distPx,
      distInR: c.dist
    };

    circles.push(circleObj);

    // Corresponding expanded aura circle (Radius R = effectiveAuraScale * r)
    auraCircles.push({
      id: `aura_${circleId}`,
      bodyId: circleId,
      pattern: 'kryst',
      x: cx,
      y: cy,
      r: Number((effectiveAuraScale * r).toFixed(3)),
      layer: c.layer,
      ring: ringIndex,
      dist: distPx
    });
  }

  // Filter guides whose vertices lie within boundary radius
  const guides = [];
  for (let i = 0; i < lattice.guides.length; i++) {
    const g = lattice.guides[i];
    if (g.maxVertDist <= maxD) {
      guides.push({
        type: g.type,
        cx: Number((g.cx * r).toFixed(3)),
        cy: Number((g.cy * r).toFixed(3)),
        radius: g.radius ? Number((g.radius * r).toFixed(3)) : undefined,
        layer: g.layer,
        vertices: g.vertices.map(v => ({ x: Number((v.x * r).toFixed(3)), y: Number((v.y * r).toFixed(3)) }))
      });
    }
  }

  // Active expansion ring based on highest ring present among drawn circles
  let maxRing = 1;
  for (const ring of ringCounts.keys()) {
    if (ring > maxRing) maxRing = ring;
  }
  const currentRing = maxRing;
  const stageName = KRYST_STAGE_NAMES[currentRing] || `Cosmic Kryst Matrix (Ring ${currentRing})`;
  const countInCurrentRing = ringCounts.get(currentRing) || 0;

  return {
    circles,
    auraCircles,
    guides,
    outerRingRadius: boundaryRadius,
    ringCounts,
    currentRing,
    maxLayer: currentRing,
    countInCurrentRing,
    totalCircles,
    stageName
  };
}

/**
 * Dynamic Boundary-Circle Engine for Flower of Life:
 * Generates concentric hexagonal rings of circles within boundaryRadius.
 *
 * @param {number} boundaryRadius - Boundary circle radius in pixels.
 * @param {number} r - Base circle radius in pixels.
 * @param {Set<string>} [disabledIds=new Set()] - Set of circle IDs toggled off by user.
 * @param {boolean} [fullScreen=false] - If true, tiles across extended viewport.
 * @returns {Object} Geometry packet with circles, auraCircles, guides, ringCounts, stageName.
 */
function getFlowerOfLifeGeometryByRadius(boundaryRadius, r, disabledIds = new Set(), fullScreen = false, auraScale = 1.95) {
  const maxLayers = fullScreen ? 30 : Math.max(1, Math.ceil(boundaryRadius / (2 * r)));
  const rawGeom = getFlowerOfLifeGeometry(maxLayers, r);

  const circles = [];
  const auraCircles = [];
  const ringCounts = new Map();
  let totalCircles = 0;
  const maxD = fullScreen ? Infinity : boundaryRadius + EPSILON;
  const effectiveAuraScale = (auraScale !== undefined && auraScale !== null) ? Number(auraScale) : 1.95;

  for (let i = 0; i < rawGeom.points.length; i++) {
    const pt = rawGeom.points[i];
    if (pt.d > maxD) continue;

    if (disabledIds && disabledIds.has(pt.id)) continue;

    const ringIndex = pt.layer === 0 ? 1 : pt.layer;
    ringCounts.set(ringIndex, (ringCounts.get(ringIndex) || 0) + 1);
    totalCircles++;

    circles.push({
      id: pt.id,
      pattern: 'life',
      x: pt.x,
      y: pt.y,
      r,
      role: pt.layer === 0 ? 'center' : (pt.isVertex ? 'vertex' : 'edge'),
      layer: pt.layer,
      ring: ringIndex,
      dist: pt.d
    });

    auraCircles.push({
      id: `aura_${pt.id}`,
      bodyId: pt.id,
      pattern: 'life',
      x: pt.x,
      y: pt.y,
      r: Number((effectiveAuraScale * r).toFixed(3)),
      layer: pt.layer,
      ring: ringIndex,
      dist: pt.d
    });
  }

  const guides = rawGeom.guides.filter(g => g.radius <= maxD);
  let maxRing = 1;
  for (const ring of ringCounts.keys()) {
    if (ring > maxRing) maxRing = ring;
  }
  const currentRing = maxRing;
  const stageName = LIFE_STAGE_NAMES[currentRing] || `Expanded Life Grid (Ring ${currentRing})`;
  const countInCurrentRing = ringCounts.get(currentRing) || 0;

  return {
    circles,
    auraCircles,
    guides,
    outerRingRadius: boundaryRadius,
    ringCounts,
    currentRing,
    maxLayer: currentRing,
    countInCurrentRing,
    totalCircles,
    stageName
  };
}

/**
 * Computes the nearest valid boundary radius distance to produce a requested circle count.
 * Groups discrete pattern circles by distance from origin, identifies the closest
 * achievable cumulative circle count, and calculates the exact boundary radius required.
 *
 * @param {number} targetCount - The requested number of circles.
 * @param {string} [pattern='kryst'] - 'kryst' or 'life'.
 * @param {number} [r=50] - Base circle radius in pixels.
 * @param {Set<string>} [disabledIds=new Set()] - Set of circle IDs toggled off.
 * @returns {{ radius: number, circleCount: number, distPx: number }}
 */
function getNearestValidBoundaryRadius(targetCount, pattern = 'kryst', r = 50, disabledIds = new Set()) {
  const reqCount = Math.max(1, Math.round(Number(targetCount) || 1));
  const effectiveR = Math.max(10, Number(r) || 50);

  if (pattern === 'life') {
    const maxLayers = Math.max(25, Math.ceil(Math.sqrt(reqCount / 3)) + 6);
    const rawGeom = getFlowerOfLifeGeometry(maxLayers, effectiveR);
    const validPoints = rawGeom.points.filter(pt => !(disabledIds && disabledIds.has(pt.id)));
    validPoints.sort((a, b) => a.d - b.d);

    const tiers = [];
    let curTier = null;
    for (let i = 0; i < validPoints.length; i++) {
      const pt = validPoints[i];
      if (!curTier || Math.abs(curTier.distPx - pt.d) > 0.05) {
        curTier = { distPx: pt.d, count: 1 };
        tiers.push(curTier);
      } else {
        curTier.count++;
      }
    }

    let cum = 0;
    for (let i = 0; i < tiers.length; i++) {
      cum += tiers[i].count;
      tiers[i].cumulative = cum;
    }

    let bestTier = tiers[0] || { distPx: 0, cumulative: 1 };
    let minDiff = Math.abs(bestTier.cumulative - reqCount);

    for (let i = 1; i < tiers.length; i++) {
      const diff = Math.abs(tiers[i].cumulative - reqCount);
      if (diff < minDiff) {
        minDiff = diff;
        bestTier = tiers[i];
      }
    }

    const radius = Math.max(effectiveR, Math.ceil(bestTier.distPx + 0.5));
    return {
      radius,
      circleCount: bestTier.cumulative,
      distPx: bestTier.distPx
    };
  } else {
    // Flower of Kryst
    const neededCircles = Math.max(reqCount * 1.5, 120);
    const approxLayer = Math.max(18, Math.ceil(Math.sqrt(neededCircles / 3)) + 6);
    const lattice = getKrystUnitLattice(Math.min(50, approxLayer));

    const tiers = [];
    let curTier = null;
    for (let i = 0; i < lattice.circles.length; i++) {
      const c = lattice.circles[i];
      const circleId = `fok_${Math.round(c.x * 100)}_${Math.round(c.y * 100)}`;
      const semanticId = SacredMath.getSemanticNodeId ? SacredMath.getSemanticNodeId(c.x * effectiveR, c.y * effectiveR, 0, effectiveR) : circleId;
      if (disabledIds && (disabledIds.has(circleId) || (semanticId && disabledIds.has(semanticId)))) {
        continue;
      }

      const dPx = c.dist * effectiveR;
      if (!curTier || Math.abs(curTier.distPx - dPx) > 0.05) {
        curTier = { distPx: dPx, count: 1 };
        tiers.push(curTier);
      } else {
        curTier.count++;
      }
    }

    let cum = 0;
    for (let i = 0; i < tiers.length; i++) {
      cum += tiers[i].count;
      tiers[i].cumulative = cum;
    }

    let bestTier = tiers[0] || { distPx: 2 * effectiveR, cumulative: 6 };
    let minDiff = Math.abs(bestTier.cumulative - reqCount);

    for (let i = 1; i < tiers.length; i++) {
      const diff = Math.abs(tiers[i].cumulative - reqCount);
      if (diff < minDiff) {
        minDiff = diff;
        bestTier = tiers[i];
      }
    }

    const radius = Math.max(effectiveR, Math.ceil(bestTier.distPx + 0.5));
    return {
      radius,
      circleCount: bestTier.cumulative,
      distPx: bestTier.distPx
    };
  }
}

/**
 * Generates Star of Heaven on Earth (SOHOE) repeating triangular star paths (R-A11).
 * Inscribes upward and downward intersecting equilateral triangles at (0,0)
 * and outer hexagon centers within boundaryRadius.
 *
 * @param {number} r - Base circle radius.
 * @param {number} boundaryRadius - Outer boundary radius.
 * @returns {Array<{id: string, cx: number, cy: number, d1: string, d2: string}>}
 */
function getSOHOEPaths(r, boundaryRadius) {
  const stars = [];
  const R_star = 2 * SQRT3 * r; // Circumscribed radius of star triangle

  // Stamp centers within boundary
  const lattice = getKrystUnitLattice(Math.ceil(boundaryRadius / r));
  const centers = [{ x: 0, y: 0 }];
  for (const sc of lattice.stampCenters) {
    const scDist = Math.hypot(sc.x * r, sc.y * r);
    if (scDist > EPSILON && scDist <= boundaryRadius) {
      centers.push({ x: sc.x * r, y: sc.y * r });
    }
  }

  for (let i = 0; i < centers.length; i++) {
    const { x: cx, y: cy } = centers[i];

    // Triangle 1: Upward-pointing equilateral triangle (90°, 210°, 330°)
    const a1 = 90 * DEG_TO_RAD;
    const a2 = 210 * DEG_TO_RAD;
    const a3 = 330 * DEG_TO_RAD;
    const p1 = { x: cx + R_star * Math.cos(a1), y: cy - R_star * Math.sin(a1) };
    const p2 = { x: cx + R_star * Math.cos(a2), y: cy - R_star * Math.sin(a2) };
    const p3 = { x: cx + R_star * Math.cos(a3), y: cy - R_star * Math.sin(a3) };
    const d1 = `M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)} L ${p2.x.toFixed(3)} ${p2.y.toFixed(3)} L ${p3.x.toFixed(3)} ${p3.y.toFixed(3)} Z`;

    // Triangle 2: Downward-pointing equilateral triangle (270°, 30°, 150°)
    const b1 = 270 * DEG_TO_RAD;
    const b2 = 30 * DEG_TO_RAD;
    const b3 = 150 * DEG_TO_RAD;
    const q1 = { x: cx + R_star * Math.cos(b1), y: cy - R_star * Math.sin(b1) };
    const q2 = { x: cx + R_star * Math.cos(b2), y: cy - R_star * Math.sin(b2) };
    const q3 = { x: cx + R_star * Math.cos(b3), y: cy - R_star * Math.sin(b3) };
    const d2 = `M ${q1.x.toFixed(3)} ${q1.y.toFixed(3)} L ${q2.x.toFixed(3)} ${q2.y.toFixed(3)} L ${q3.x.toFixed(3)} ${q3.y.toFixed(3)} Z`;

    stars.push({
      id: `sohoe_${i}`,
      cx,
      cy,
      d1,
      d2
    });
  }

  return stars;
}

/**
 * Generates Intersectional Patterns: Circumscribing circles around hexagrams
 * and the 12 surrounding eyes / pinecones forming the circles (R-A10).
 *
 * @param {number} r - Base circle radius.
 * @param {number} boundaryRadius - Outer boundary radius.
 * @returns {{hexagramCircumscribedCircles: Array<{cx: number, cy: number, r: number}>, eyes: Array<{id: string, pathD: string}>}}
 */
function getHexagramEyePaths(r, boundaryRadius) {
  const circumCircles = [];
  const eyes = [];
  const R_hex = 2 * r;

  // Innermost hexagram circumscribed circle
  circumCircles.push({ cx: 0, cy: 0, r: R_hex });

  // Outer hexagon centers
  for (let m = 0; m < 6; m++) {
    const phi = m * (Math.PI / 3) + (Math.PI / 6);
    const hx = STAMP_STEP * r * Math.cos(phi);
    const hy = STAMP_STEP * r * Math.sin(phi);
    if (Math.hypot(hx, hy) <= boundaryRadius + 2 * r) {
      circumCircles.push({ cx: hx, cy: hy, r: R_hex });
    }
  }

  // 12 Surrounding Eyes / Pinecones forming the circle perimeter around each hexagram
  for (let m = 0; m < 12; m++) {
    const angleRad = m * (Math.PI / 6);
    const dEye = (2 + SQRT3) * r;
    const mx = dEye * Math.cos(angleRad);
    const my = dEye * Math.sin(angleRad);
    if (Math.hypot(mx, my) <= boundaryRadius + 2 * r) {
      const eyeR = 2 * r;
      const lensHalf = r * 0.52;
      const vx = -Math.sin(angleRad);
      const vy = Math.cos(angleRad);

      const p1 = { x: mx + lensHalf * vx, y: my + lensHalf * vy };
      const p2 = { x: mx - lensHalf * vx, y: my - lensHalf * vy };
      const pathD = `M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)} A ${eyeR} ${eyeR} 0 0 1 ${p2.x.toFixed(3)} ${p2.y.toFixed(3)} A ${eyeR} ${eyeR} 0 0 1 ${p1.x.toFixed(3)} ${p1.y.toFixed(3)} Z`;

      eyes.push({
        id: `eye_12_${m}`,
        pathD,
        cx: mx,
        cy: my
      });
    }
  }

  return {
    hexagramCircumscribedCircles: circumCircles,
    eyes
  };
}

/**
 * Computes procedural concentric offset echo contours for circles (R-A5).
 * Generates concentric echoing line paths around every circle to create
 * expanded-consciousness visual ripple / contour depth.
 *
 * @param {Array<{x: number, y: number, r: number}>} circles - Active circles list.
 * @param {number} [count=3] - Number of echo contours (1 to 5).
 * @param {number} [spacing=5] - Radial step spacing in pixels.
 * @returns {Array<{cx: number, cy: number, r: number, opacity: number}>}
 */
function getOffsetPathRings(circles, count = 3, spacing = 5) {
  const offsetRings = [];
  const baseOpacities = [0.45, 0.28, 0.16, 0.09, 0.05];

  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    for (let k = 1; k <= count; k++) {
      offsetRings.push({
        cx: c.x,
        cy: c.y,
        r: c.r + k * spacing,
        opacity: baseOpacities[k - 1] || 0.1
      });
    }
  }

  return offsetRings;
}

/* =========================================================================
   MATHEMATICAL GEOMETRY ENGINE OBJECT
   ========================================================================= */
const SacredMath = {
  DEG_TO_RAD,
  RAD_TO_DEG,
  COS_30,
  SIN_30,
  COS_60,
  SIN_60,
  SIN_15,
  COS_15,
  SQRT_3,
  SQRT3,
  DIST_TRI_INNER,
  DIST_TRI_APEX,
  STAMP_STEP,
  EPSILON,

  createKrystStamp,
  getKrystGeometry,
  getKrystGeometryByRadius,
  getNearestValidBoundaryRadius,
  getFlowerOfLifeGeometry,
  getFlowerOfLifeGeometryByRadius,
  getFlowerOfLifeLayerRotation,
  getSOHOEPaths,
  getHexagramEyePaths,
  getOffsetPathRings,
  KRYST_STAGE_NAMES,
  LIFE_STAGE_NAMES,
  KRYST_STORY_DATA,
  RING_NOTES_DATA,

  /**
   * Alias for createKrystStamp for backward compatibility
   */
  getKrystStamp(cx, cy, r) {
    return createKrystStamp(cx, cy, r);
  },

  /**
   * Generates hexagonal lattice ring centers for ring index s >= 1 with step size stepSize.
   * Tracks rotation according to layer rotation progression (0°, +30°, -30° alternating).
   *
   * @param {number} ring - Concentric hexagonal ring index (ring >= 1).
   * @param {number} stepSize - Distance spacing between concentric rings.
   * @param {number|null} [angleOffsetDeg=null] - Optional override angle offset.
   * @returns {Array<{x: number, y: number}>} Array of ring center coordinates.
   */
  getHexRingCenters(ring, stepSize, angleOffsetDeg = null) {
    if (ring <= 0) return [{ x: 0, y: 0 }];
    const centers = [];
    const ringRadius = ring * stepSize;
    const vertices = [];
    const baseOffset = (angleOffsetDeg !== null && angleOffsetDeg !== undefined)
      ? angleOffsetDeg
      : getFlowerOfLifeLayerRotation(ring);
    for (let m = 0; m < 6; m++) {
      const a = (m * 60 + baseOffset) * DEG_TO_RAD;
      vertices.push({
        x: ringRadius * Math.cos(a),
        y: ringRadius * Math.sin(a)
      });
    }
    for (let m = 0; m < 6; m++) {
      const vStart = vertices[m];
      const vEnd = vertices[(m + 1) % 6];
      for (let j = 0; j < ring; j++) {
        const t = j / ring;
        const x = (1 - t) * vStart.x + t * vEnd.x;
        const y = (1 - t) * vStart.y + t * vEnd.y;
        centers.push({ x, y });
      }
    }
    return centers;
  },

  /**
   * Returns the effective number of Flower of Life concentric hexagonal layers
   * required to match the spatial expansion rate of the Flower of Kryst at depth N.
   *
   * @param {number} N - Layer progression depth.
   * @param {number} [r=50] - Base circle radius.
   * @returns {number} Number of hexagonal concentric layers.
   */
  getEffectiveLifeLayers(N, r = 50) {
    return getEffectiveLifeLayers(N, r);
  },

  /**
   * Dynamic Outer Bounding Circle radius for Flower of Life matching Flower of Kryst expansion:
   * (2 * effectiveLayers + 2) * r
   *
   * @param {number} N - Layer progression depth.
   * @param {number} [r=50] - Base circle radius.
   * @returns {number} Outer circumscribing boundary radius.
   */
  getFoLBoundingRadius(N, r = 50) {
    const K = this.getEffectiveLifeLayers(N, r);
    return 2 * K * r;
  },

  /**
   * Generates all circle centers for Flower of Life up to layer N.
   * Tracks and passes along rotation per layer (Layer 1: 0°, Layer 2: +30°, Layer 3: -30°).
   * Automatically expands the concentric hexagonal rings to match the spatial rate of Flower of Kryst.
   *
   * @param {number} N - Layer progression depth.
   * @param {number} r - Base circle radius.
   * @param {number|null} [explicitLayers=null] - Optional override for explicit layer count.
   * @returns {Array<any>} Array of circle center points with rotationDeg and layer metadata.
   */
  generateFlowerOfLifePoints(N, r, explicitLayers = null) {
    return getFlowerOfLifeGeometry(N, r, explicitLayers).points;
  },

  /**
   * Returns deduplicated circle center points for Flower of Kryst up to layer N.
   */
  getKrystCoordinates(N, r) {
    return this.getKrystGeometry(N, r).points;
  },

  /**
   * Dynamic Outer Bounding Circle radius for Flower of Kryst: max_i sqrt(x_i^2 + y_i^2) + 2r
   */
  getFoKBoundingRadius(N, r) {
    return this.getKrystGeometry(N, r).boundingRadius;
  },

  /**
   * Assigns a stable, human-readable semantic ID to a Flower of Kryst node.
   */
  getSemanticNodeId(x, y, z = 0, r = 1.0) {
    const baseR = r || 1.0;
    const nx = x / baseR;
    const ny = y / baseR;
    const nz = (z || 0) / baseR;
    const d = Math.hypot(nx, ny);
    let deg = Math.atan2(ny, nx) * 180 / Math.PI;
    if (deg < 0) deg += 360;

    let baseId = '';

    // 1. Core Hexagon (d ≈ 2.00)
    if (Math.abs(d - 2.0) < 0.08) {
      const m = Math.round(deg / 60) % 6;
      if (Math.abs(deg - m * 60) < 6 || Math.abs(deg - (m * 60 + 360)) < 6) {
        baseId = `H0_R${m}`;
      }
    }

    // 2. Inner Triangle Base Pair (d ≈ 3.864)
    if (!baseId && Math.abs(d - 3.864) < 0.15) {
      for (let m = 0; m < 6; m++) {
        const b1Angle = (m * 60 + 15 + 360) % 360;
        const b2Angle = (m * 60 + 45 + 360) % 360;
        if (Math.abs(deg - b1Angle) < 5 || Math.abs(deg - (b1Angle + 360)) < 5) {
          baseId = `T${m}_B1`;
          break;
        }
        if (Math.abs(deg - b2Angle) < 5 || Math.abs(deg - (b2Angle + 360)) < 5) {
          baseId = `T${m}_B2`;
          break;
        }
      }
    }

    // 3. Inner Triangle Apex (d ≈ 5.464)
    if (!baseId && Math.abs(d - 5.464) < 0.15) {
      for (let m = 0; m < 6; m++) {
        const apexAngle = (m * 60 + 30 + 360) % 360;
        if (Math.abs(deg - apexAngle) < 5 || Math.abs(deg - (apexAngle + 360)) < 5) {
          baseId = `T${m}_APEX`;
          break;
        }
      }
    }

    // 4. Outer Hexagon Centers & Bridge Apex (d ≈ 7.464)
    if (!baseId && Math.abs(d - 7.464) < 0.15) {
      for (let m = 0; m < 6; m++) {
        const cAngle = (m * 60 + 360) % 360;
        const bApexAngle = (m * 60 + 30 + 360) % 360;
        if (Math.abs(deg - cAngle) < 5 || Math.abs(deg - (cAngle + 360)) < 5) {
          baseId = `H1_${m}_C`;
          break;
        }
        if (Math.abs(deg - bApexAngle) < 5 || Math.abs(deg - (bApexAngle + 360)) < 5) {
          baseId = `B${m}_APEX`;
          break;
        }
      }
    }

    // 5. Outer Hexagon Rings
    if (!baseId) {
      const step = 4 + 2 * Math.sqrt(3);
      for (let m = 0; m < 6; m++) {
        const phi = m * Math.PI / 3;
        const hx = step * Math.cos(phi);
        const hy = step * Math.sin(phi);
        const distToCenter = Math.hypot(nx - hx, ny - hy);
        if (Math.abs(distToCenter - 2.0) < 0.08) {
          let ringDeg = Math.atan2(ny - hy, nx - hx) * 180 / Math.PI;
          if (ringDeg < 0) ringDeg += 360;
          const j = Math.round(ringDeg / 60) % 6;
          if (Math.abs(ringDeg - j * 60) < 6 || Math.abs(ringDeg - (j * 60 + 360)) < 6) {
            baseId = `H1_${m}_R${j}`;
            break;
          }
        }
      }
    }

    // 6. Bridge Triangle Base Pair (d ≈ 9.25)
    if (!baseId && Math.abs(d - 9.25) < 0.25) {
      const distBridgeBase = 4 + 3 * Math.sqrt(3);
      for (let m = 0; m < 6; m++) {
        const theta = m * (Math.PI / 3) + (Math.PI / 6);
        const ux = Math.cos(theta), uy = Math.sin(theta);
        const tx = -Math.sin(theta), ty = Math.cos(theta);
        const b1x = distBridgeBase * ux - tx;
        const b1y = distBridgeBase * uy - ty;
        const b2x = distBridgeBase * ux + tx;
        const b2y = distBridgeBase * uy + ty;
        if (Math.hypot(nx - b1x, ny - b1y) < 0.15) {
          baseId = `B${m}_B1`;
          break;
        }
        if (Math.hypot(nx - b2x, ny - b2y) < 0.15) {
          baseId = `B${m}_B2`;
          break;
        }
      }
    }

    if (!baseId) {
      baseId = `NODE_D${d.toFixed(1)}_A${Math.round(deg)}`;
    }

    if (Math.abs(nz) > 0.1) {
      baseId += (nz > 0 ? '_ZB' : '_ZC');
    }

    return baseId;
  },

  /**
   * Generates all circle center node objects for Flower of Kryst up to layer N.
   * Adapts the deduplicated array of coordinates for SVG rendering and interactivity.
   */
  generateFlowerOfKrystPoints(N, r) {
    const geom = this.getKrystGeometry(N, r);
    return geom.points.map((pt, idx) => {
      const d = Math.hypot(pt.x, pt.y);
      let angleDeg = Math.atan2(pt.y, pt.x) * RAD_TO_DEG;
      if (angleDeg < 0) angleDeg += 360;
      const semanticId = this.getSemanticNodeId(pt.x, pt.y, 0, r);
      return {
        id: semanticId,
        nodeId: semanticId,
        legacyId: `fok_${pt.role || 'kryst'}_${idx}`,
        pattern: 'kryst',
        role: pt.role,
        layer: pt.layer || 1,
        index: idx,
        x: Number(pt.x.toFixed(4)),
        y: Number(pt.y.toFixed(4)),
        d: Number(d.toFixed(4)),
        angleDeg: Number(angleDeg.toFixed(2)),
        isVertex: Boolean(pt.isVertex || pt.role === 'hexagon'),
        stampRing: pt.layer ? pt.layer - 1 : 0
      };
    });
  },

  /**
   * Computes the 3 Pairs of Eyes (6 vesica piscis lens intersections) of Kryst.
   */
  getEyesOfKryst(r) {
    const R = 2 * r;
    const R_1 = 2 * r;
    const R_2 = r / SIN_15;
    const d = R_2 - R_1;
    if (d >= 2 * R) return [];

    const h = Math.sqrt(Math.max(0, R * R - (d / 2) * (d / 2)));
    const midDist = (R_1 + R_2) / 2;
    const eyes = [];

    for (let m = 0; m < 6; m++) {
      const angleDeg = m * 60;
      const angleRad = angleDeg * DEG_TO_RAD;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);

      const mx = midDist * cosA;
      const my = midDist * sinA;

      const vx = -sinA;
      const vy = cosA;

      const p1 = { x: mx + h * vx, y: my + h * vy };
      const p2 = { x: mx - h * vx, y: my - h * vy };

      const pathD = `M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)} A ${R} ${R} 0 0 1 ${p2.x.toFixed(3)} ${p2.y.toFixed(3)} A ${R} ${R} 0 0 1 ${p1.x.toFixed(3)} ${p1.y.toFixed(3)} Z`;

      eyes.push({
        id: `EYE_${m}`,
        nodeId: `EYE_${m}`,
        legacyId: `eye_${m}`,
        axisIndex: m % 3,
        pairIndex: m < 3 ? m : m - 3,
        angleDeg,
        center: { x: mx, y: my },
        pathD
      });
    }
    return eyes;
  },

  /**
   * Generates virtual Flower of Life centers for layers K+1 and K+2
   * that intersect the bounding circle R_bound matching Flower of Kryst expansion.
   */
  generateVirtualBoundaryPoints(N, r) {
    const K = this.getEffectiveLifeLayers(N, r);
    const R_bound = (2 * K + 2) * r;
    const virtualLayers = [K + 1, K + 2];
    const virtualPoints = [];

    for (const k of virtualLayers) {
      const vertexRadius = 2 * k * r;
      const vertices = [];
      const iterationRotationDeg = getFlowerOfLifeLayerRotation(k);
      for (let m = 0; m < 6; m++) {
        const angle = (m * 60 + iterationRotationDeg) * DEG_TO_RAD;
        vertices.push({
          x: vertexRadius * Math.cos(angle),
          y: vertexRadius * Math.sin(angle)
        });
      }

      for (let m = 0; m < 6; m++) {
        const vStart = vertices[m];
        const vEnd = vertices[(m + 1) % 6];
        for (let j = 0; j < k; j++) {
          const t = j / k;
          const x = (1 - t) * vStart.x + t * vEnd.x;
          const y = (1 - t) * vStart.y + t * vEnd.y;
          const d = Math.hypot(x, y);
          if (d - 2 * r < R_bound && d < R_bound + 2 * r) {
            virtualPoints.push({
              x: Number(x.toFixed(4)),
              y: Number(y.toFixed(4)),
              d: Number(d.toFixed(4))
            });
          }
        }
      }
    }
    return virtualPoints;
  },

  /**
   * Computes intersection nodes occurring when the hexagons or triangle patterns (guides) cross a body circle (radius r).
   *
   * @param {Array<any>} guides - Array of guide polygons (hexagons, triangles).
   * @param {Array<{x: number, y: number}>} bodyCircles - Center coordinates of body circles.
   * @param {number} r - Radius of body circles.
   * @param {number} [R] - Optional radius of aura circles (default: 2r).
   * @returns {Array<{x: number, y: number}>} Array of unique intersection coordinates.
   */
  computeIntersectionNodes(guides, bodyCircles, r, R = null) {
    // If called with old signature: computeIntersectionNodes(points, R)
    if (Array.isArray(guides) && (!bodyCircles || typeof bodyCircles === 'number')) {
      const points = guides;
      const effectiveR = (typeof bodyCircles === 'number') ? bodyCircles : (r || 100);
      return this._computeCircleCircleIntersections(points, effectiveR);
    }

    if (!guides || guides.length === 0 || !bodyCircles || bodyCircles.length === 0) {
      return [];
    }

    const radius = Number(r) || 50;
    const tol = Math.max(0.2, 0.005 * radius);
    const tolSq = tol * tol;

    // 1. Extract all line segments from guide polygons
    const segments = [];
    guides.forEach(g => {
      if (g.vertices && g.vertices.length >= 3) {
        const K = g.vertices.length;
        for (let k = 0; k < K; k++) {
          segments.push({ p1: g.vertices[k], p2: g.vertices[(k + 1) % K] });
        }
      } else if (g.type === 'hexagon' && g.radius) {
        const verts = [];
        for (let m = 0; m < 6; m++) {
          const a = m * (Math.PI / 3);
          verts.push({ x: g.cx + g.radius * Math.cos(a), y: g.cy + g.radius * Math.sin(a) });
        }
        for (let k = 0; k < 6; k++) {
          segments.push({ p1: verts[k], p2: verts[(k + 1) % 6] });
        }
      }
    });

    if (segments.length === 0) {
      return [];
    }

    // 2. Compute intersections between line segments and body circles of radius r
    const rawNodes = [];
    segments.forEach(seg => {
      const dx = seg.p2.x - seg.p1.x;
      const dy = seg.p2.y - seg.p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-4) return;

      const minX = Math.min(seg.p1.x, seg.p2.x) - radius;
      const maxX = Math.max(seg.p1.x, seg.p2.x) + radius;
      const minY = Math.min(seg.p1.y, seg.p2.y) - radius;
      const maxY = Math.max(seg.p1.y, seg.p2.y) + radius;

      bodyCircles.forEach(bc => {
        if (bc.x < minX || bc.x > maxX || bc.y < minY || bc.y > maxY) return;

        const fx = seg.p1.x - bc.x;
        const fy = seg.p1.y - bc.y;
        const a = lenSq;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - radius * radius;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return;

        const sqrtDisc = Math.sqrt(Math.max(0, disc));
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);

        if (t1 >= -1e-4 && t1 <= 1 + 1e-4) {
          rawNodes.push({ x: seg.p1.x + t1 * dx, y: seg.p1.y + t1 * dy });
        }
        if (t2 >= -1e-4 && t2 <= 1 + 1e-4 && Math.abs(t2 - t1) > 1e-4) {
          rawNodes.push({ x: seg.p1.x + t2 * dx, y: seg.p1.y + t2 * dy });
        }
      });
    });

    // 3. Deduplicate spatially
    const uniqueNodes = [];
    rawNodes.forEach(pt => {
      if (!uniqueNodes.some(u => (u.x - pt.x) ** 2 + (u.y - pt.y) ** 2 < tolSq)) {
        uniqueNodes.push({
          x: Math.abs(pt.x) < 1e-4 ? 0 : Number(pt.x.toFixed(3)),
          y: Math.abs(pt.y) < 1e-4 ? 0 : Number(pt.y.toFixed(3))
        });
      }
    });

    return uniqueNodes;
  },

  /**
   * Generates aura circle center points for the given pattern up to layer N.
   * Aura circles are centered strictly over the center of body circles at 2x size (R = 2r).
   *
   * @param {'life'|'kryst'} patternType - 'life' or 'kryst'
   * @param {number} N - Layer progression depth
   * @param {number} r - Base body circle radius
   * @param {number} [R] - Aura circle radius (defaults to 2r)
   * @returns {Array<{x: number, y: number, id?: string, layer?: number}>}
   */
  getAuraPoints(patternType, N, r, R = null) {
    if (patternType === 'life') {
      return this.generateFlowerOfLifePoints(N, r);
    } else {
      return this.generateFlowerOfKrystPoints(N, r);
    }
  },

  _computeCircleCircleIntersections(points, R) {
    const nodes = [];
    const thresholdSq = 1.0;
    const maxNodes = 450;
    const R_sq = R * R;

    for (let i = 0; i < points.length && nodes.length < maxNodes; i++) {
      for (let j = i + 1; j < points.length && nodes.length < maxNodes; j++) {
        const p1 = points[i];
        const p2 = points[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > 1e-4 && distSq <= 4 * R_sq) {
          const dist = Math.sqrt(distSq);
          const a = dist / 2;
          const h = Math.sqrt(Math.max(0, R_sq - a * a));
          const mx = p1.x + dx / 2;
          const my = p1.y + dy / 2;

          const rx = -dy * (h / dist);
          const ry = dx * (h / dist);

          const candidates = [
            { x: mx + rx, y: my + ry },
            { x: mx - rx, y: my - ry }
          ];

          for (let c = 0; c < candidates.length; c++) {
            const cand = candidates[c];
            let duplicate = false;
            for (let k = 0; k < nodes.length; k++) {
              const ndx = nodes[k].x - cand.x;
              const ndy = nodes[k].y - cand.y;
              if (ndx * ndx + ndy * ndy < thresholdSq) {
                duplicate = true;
                break;
              }
            }
            if (!duplicate && nodes.length < maxNodes) {
              nodes.push({
                x: Number(cand.x.toFixed(2)),
                y: Number(cand.y.toFixed(2))
              });
            }
          }
        }
      }
    }
    return nodes;
  },

  /**
   * Returns the 13 Fruit of Life tangent circle centers.
   */
  getFruitOfLifeCenters(r) {
    const centers = [{ id: 'fol_0_0', x: 0, y: 0, layer: 0, label: 'Center (0)', isVertex: true }];
    for (let m = 0; m < 6; m++) {
      const a = m * 60 * DEG_TO_RAD;
      centers.push({
        id: `fol_1_${m}`,
        x: 2 * r * Math.cos(a),
        y: 2 * r * Math.sin(a),
        layer: 1,
        label: `L1-${m}`,
        isVertex: true
      });
    }
    for (let m = 0; m < 6; m++) {
      const a = m * 60 * DEG_TO_RAD;
      centers.push({
        id: `fol_2_${m * 2}`,
        x: 4 * r * Math.cos(a),
        y: 4 * r * Math.sin(a),
        layer: 2,
        label: `L2-${m}`,
        isVertex: true
      });
    }
    return centers;
  },

  /**
   * Computes all individual planar sections (open spaces between intersections of actual circles).
   * Generates exact SVG path definitions for each bounded region using planar arrangement.
   *
   * @param {Array<{x: number, y: number}>} circles - Circle centers.
   * @param {number} R - Circle radius (2r).
   * @returns {Array<{id: string, d: string, cx: number, cy: number, area: number}>}
   */
  computeCircleSections(circles, R) {
    if (!circles || circles.length === 0 || R <= 0) return [];

    const fmt = (n) => {
      const s = n.toFixed(3);
      return s === '-0.000' ? '0.000' : s;
    };

    if (circles.length === 1) {
      const c = circles[0];
      return [{
        id: 'sec_0',
        d: `M ${fmt(c.x - R)} ${fmt(c.y)} A ${R} ${R} 0 1 0 ${fmt(c.x + R)} ${fmt(c.y)} A ${R} ${R} 0 1 0 ${fmt(c.x - R)} ${fmt(c.y)} Z`,
        cx: Math.abs(c.x) < 1e-4 ? 0 : Number(c.x.toFixed(3)),
        cy: Math.abs(c.y) < 1e-4 ? 0 : Number(c.y.toFixed(3)),
        area: Math.PI * R * R,
        containingCount: 1
      }];
    }

    const tol = Math.max(0.25, 0.005 * R);
    const tolSq = tol * tol;
    const M = circles.length;

    // 1. All pairwise circle-circle intersection points
    const rawVerts = [];
    for (let i = 0; i < M; i++) {
      const c1 = circles[i];
      for (let j = i + 1; j < M; j++) {
        const c2 = circles[j];
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const d = Math.hypot(dx, dy);
        if (d < 1e-4 || d > 2 * R - 1e-4) continue;
        const a = d / 2;
        const h = Math.sqrt(Math.max(0, R * R - a * a));
        const mx = (c1.x + c2.x) / 2;
        const my = (c1.y + c2.y) / 2;
        const ux = dx / d;
        const uy = dy / d;
        rawVerts.push({ x: mx - h * uy, y: my + h * ux });
        rawVerts.push({ x: mx + h * uy, y: my - h * ux });
      }
    }

    if (rawVerts.length < 2) return [];

    // Deduplicate vertices spatially
    const vertices = [];
    for (let i = 0; i < rawVerts.length; i++) {
      const pt = rawVerts[i];
      if (!vertices.some(v => (v.x - pt.x) ** 2 + (v.y - pt.y) ** 2 < tolSq)) {
        vertices.push({ id: vertices.length, x: pt.x, y: pt.y });
      }
    }

    if (vertices.length < 2) return [];

    // 2. Arc half-edges along each circle
    const halfEdges = [];
    const vertexOutgoing = new Map();
    for (let v = 0; v < vertices.length; v++) vertexOutgoing.set(v, []);

    const norm = (a) => {
      let res = a;
      while (res > Math.PI) res -= 2 * Math.PI;
      while (res <= -Math.PI) res += 2 * Math.PI;
      return res;
    };

    for (let cIdx = 0; cIdx < M; cIdx++) {
      const c = circles[cIdx];
      const cVerts = [];
      for (let v = 0; v < vertices.length; v++) {
        const vert = vertices[v];
        if (Math.abs(Math.hypot(vert.x - c.x, vert.y - c.y) - R) < tol) {
          cVerts.push({ vId: vert.id, angle: Math.atan2(vert.y - c.y, vert.x - c.x) });
        }
      }
      if (cVerts.length < 2) continue;

      cVerts.sort((a, b) => a.angle - b.angle);
      const K = cVerts.length;
      for (let k = 0; k < K; k++) {
        const cv1 = cVerts[k];
        const cv2 = cVerts[(k + 1) % K];
        let dTheta = cv2.angle - cv1.angle;
        if (dTheta <= 0) dTheta += 2 * Math.PI;

        const v1 = vertices[cv1.vId];
        const v2 = vertices[cv2.vId];

        // Sample a point along the arc for unique secant angle sorting
        const delta = Math.min(0.02, 0.1 * dTheta);
        const aFwd = cv1.angle + delta;
        const pFwd = { x: c.x + R * Math.cos(aFwd), y: c.y + R * Math.sin(aFwd) };
        const secantFwd = Math.atan2(pFwd.y - v1.y, pFwd.x - v1.x);

        const aRev = cv2.angle - delta;
        const pRev = { x: c.x + R * Math.cos(aRev), y: c.y + R * Math.sin(aRev) };
        const secantRev = Math.atan2(pRev.y - v2.y, pRev.x - v2.x);

        const heFwd = {
          id: halfEdges.length,
          fromV: cv1.vId,
          toV: cv2.vId,
          cIdx,
          c,
          theta1: cv1.angle,
          theta2: cv2.angle,
          dTheta,
          isFwd: true,
          secantOut: secantFwd,
          outAngle: norm(cv1.angle + Math.PI / 2),
          inAngle: norm(cv2.angle + Math.PI / 2),
          used: false
        };
        halfEdges.push(heFwd);
        vertexOutgoing.get(cv1.vId).push(heFwd);

        const heRev = {
          id: halfEdges.length,
          fromV: cv2.vId,
          toV: cv1.vId,
          cIdx,
          c,
          theta1: cv2.angle,
          theta2: cv1.angle,
          dTheta,
          isFwd: false,
          secantOut: secantRev,
          outAngle: norm(cv2.angle - Math.PI / 2),
          inAngle: norm(cv1.angle - Math.PI / 2),
          used: false
        };
        halfEdges.push(heRev);
        vertexOutgoing.get(cv2.vId).push(heRev);

        heFwd.twin = heRev;
        heRev.twin = heFwd;
      }
    }

    // Sort outgoing edges around each vertex by secant angle
    for (let v = 0; v < vertices.length; v++) {
      vertexOutgoing.get(v).sort((a, b) => a.secantOut - b.secantOut);
    }

    // 3. Planar DCEL face extraction
    const sections = [];
    for (let eIdx = 0; eIdx < halfEdges.length; eIdx++) {
      const startHe = halfEdges[eIdx];
      if (startHe.used) continue;

      const faceEdges = [];
      let curr = startHe;
      let valid = true;

      while (!curr.used) {
        curr.used = true;
        faceEdges.push(curr);
        const targetV = curr.toV;
        const outgoing = vertexOutgoing.get(targetV);
        if (!outgoing || outgoing.length === 0) { valid = false; break; }

        const twin = curr.twin;
        const idx = outgoing.indexOf(twin);
        if (idx === -1) { valid = false; break; }

        const nextIdx = (idx - 1 + outgoing.length) % outgoing.length;
        curr = outgoing[nextIdx];
        if (curr === startHe) break;
        if (faceEdges.length > 500) { valid = false; break; }
      }

      if (valid && curr === startHe && faceEdges.length >= 2) {
        let totalTurn = 0;
        let vx = 0, vy = 0, mx = 0, my = 0;
        let area2 = 0;

        for (let i = 0; i < faceEdges.length; i++) {
          const e1 = faceEdges[i];
          const e2 = faceEdges[(i + 1) % faceEdges.length];
          const turn = norm(e2.outAngle - e1.inAngle);
          const arcTurn = e1.isFwd ? e1.dTheta : -e1.dTheta;
          totalTurn += turn + arcTurn;

          const v1 = vertices[e1.fromV];
          const v2 = vertices[e1.toV];
          const chordArea = v1.x * v2.y - v2.x * v1.y;
          const cap = 0.5 * R * R * (e1.dTheta - Math.sin(e1.dTheta));
          const signedCap = e1.isFwd ? cap : -cap;
          area2 += chordArea + 2 * signedCap;

          vx += v1.x; vy += v1.y;
          const midTheta = e1.isFwd ? (e1.theta1 + e1.dTheta / 2) : (e1.theta1 - e1.dTheta / 2);
          mx += e1.c.x + R * Math.cos(midTheta);
          my += e1.c.y + R * Math.sin(midTheta);
        }

        const L = faceEdges.length;
        vx /= L; vy /= L;
        mx /= L; my /= L;
        const centroid = { x: 0.5 * (vx + mx), y: 0.5 * (vy + my) };

        let containingCount = 0;
        for (let cIdx = 0; cIdx < M; cIdx++) {
          const c = circles[cIdx];
          if (Math.hypot(centroid.x - c.x, centroid.y - c.y) <= R - 0.05) {
            containingCount++;
          }
        }

        const turnPi = Math.round(totalTurn / Math.PI);
        const area = Math.abs(area2 / 2);

        // Bounded interior face (turnPi === 2) that is an intersection of at least 2 circles
        if (turnPi === 2 && containingCount >= 2 && area > 0.5) {
          let d = `M ${fmt(vertices[faceEdges[0].fromV].x)} ${fmt(vertices[faceEdges[0].fromV].y)}`;
          for (let i = 0; i < faceEdges.length; i++) {
            const e = faceEdges[i];
            const vTo = vertices[e.toV];
            const largeArc = e.dTheta > Math.PI ? 1 : 0;
            const sweep = e.isFwd ? 1 : 0;
            d += ` A ${R} ${R} 0 ${largeArc} ${sweep} ${fmt(vTo.x)} ${fmt(vTo.y)}`;
          }
          d += ' Z';

          const cxVal = Math.abs(centroid.x) < 0.05 ? 0 : Number(centroid.x.toFixed(3));
          const cyVal = Math.abs(centroid.y) < 0.05 ? 0 : Number(centroid.y.toFixed(3));
          const cxi = Math.round(cxVal * 10);
          const cyi = Math.round(cyVal * 10);

          sections.push({
            id: `sec_${cxi}_${cyi}`,
            index: sections.length,
            d,
            cx: cxVal,
            cy: cyVal,
            area: Number(area.toFixed(2)),
            containingCount
          });
        }
      }
    }

    return sections;
  }
};

const computeCircleSections = (circles, R) => SacredMath.computeCircleSections(circles, R);



/* --- js/geometry3d.js --- */
/**
 * SACRED GEOMETRY 3D MATHEMATICAL ENGINE (js/geometry3d.js)
 * Implements 3D Face-Centered Cubic (FCC, ABCABC...) close-packing,
 * Vector Equilibrium (Cuboctahedron), and 3D Kryst Stamp expansion.
 * Pure mathematical functions with no DOM or global state access.
 */


/* =========================================================================
   1. CORE 3D FCC & VOLUMETRIC KRYST CONSTANTS
   ========================================================================= */
/* duplicate const SQRT3 */ // const SQRT3 = Math.sqrt(3);
const SQRT6 = Math.sqrt(6);

// Exact vertical height of regular 3D tetrahedron of tangent spheres with edge 2r:
// h_tet = 2r * √(2/3) = √(8/3) * r ≈ 1.632993161855452 * r
const TET_PITCH = Math.sqrt(8 / 3);
const FCC_DZ = TET_PITCH;

// XY radial distance from hexagon center to 3 upper/lower triangular dimples:
// d_pocket = 2r / √3 = (2√3 / 3) * r ≈ 1.1547005383792515 * r
const OCTANT_CORNER_DIST = (2 / SQRT3);
const FCC_POCKET_R = OCTANT_CORNER_DIST;

// 2D Kryst Stamp Constants extended into 3D
const DIST_HEX = 2;                   // 2r
/* duplicate const DIST_TRI_INNER */ // const DIST_TRI_INNER = 2 + SQRT3;     // (2 + √3)r ≈ 3.7320508 * r
/* duplicate const DIST_TRI_APEX */ // const DIST_TRI_APEX = 2 + 2 * SQRT3; // (2 + 2√3)r ≈ 5.4641016 * r
/* duplicate const STAMP_STEP */ // const STAMP_STEP = 4 + 2 * SQRT3;     // (4 + 2√3)r ≈ 7.4641016 * r
/* duplicate const DIST_BRIDGE_BASE */ // const DIST_BRIDGE_BASE = 4 + 3 * SQRT3; // (4 + 3√3)r ≈ 9.1961524 * r
/* duplicate const EPSILON */ // const EPSILON = 1e-3;

/* =========================================================================
   2. FCC LATTICE HELPERS & 12 BASIS VECTORS
   ========================================================================= */

/**
 * Calculates the FCC plane layer classification ('A', 'B', or 'C') based on Z elevation.
 * Stacking order along (111) cleavage normal: ... C -> A -> B -> C -> A -> B ...
 * @param {number} z - Z coordinate.
 * @param {number} r - Base circle/sphere radius.
 * @returns {'A'|'B'|'C'} FCC plane label.
 */
function getFCCPlane(z, r) {
  const dz = FCC_DZ * r;
  if (dz === 0) return 'A';
  const planeIndex = Math.round(z / dz);
  const mod = ((planeIndex % 3) + 3) % 3;
  if (mod === 0) return 'A';
  if (mod === 1) return 'B';
  return 'C';
}

/**
 * Returns the 12 FCC Basis Vectors (Cuboctahedron / Vector Equilibrium).
 * Around any sphere at (cx, cy, cz) of radius r, all 12 tangent neighbors lie at distance 2r:
 * - 6 in Plane A (Δz = 0)
 * - 3 in Plane B (Δz = +2r√(2/3))
 * - 3 in Plane C (Δz = -2r√(2/3), antipodal to Plane B vectors)
 *
 * @param {number} r - Base sphere radius.
 * @returns {Array<{x: number, y: number, z: number}>} 12 FCC basis vectors.
 */
function getFCCBasisVectors(r) {
  const vectors = [];

  // 1. 6 In-Plane Hexagon Vectors (Δz = 0, Plane A)
  for (let m = 0; m < 6; m++) {
    const theta = m * (Math.PI / 3);
    vectors.push({
      x: 2 * r * Math.cos(theta),
      y: 2 * r * Math.sin(theta),
      z: 0
    });
  }

  // 2. 3 Upper Tetrahedral Pocket Vectors (Δz = +2r√(2/3), Plane B)
  // Pockets at 30°, 150°, 270°
  for (let j = 0; j < 3; j++) {
    const alpha = j * (2 * Math.PI / 3) + (Math.PI / 6);
    vectors.push({
      x: FCC_POCKET_R * r * Math.cos(alpha),
      y: FCC_POCKET_R * r * Math.sin(alpha),
      z: FCC_DZ * r
    });
  }

  // 3. 3 Lower Tetrahedral Pocket Vectors (Δz = -2r√(2/3), Plane C)
  // Antipodal to u_j to enforce true FCC (ABCABC) symmetry rather than HCP (ABAB)
  for (let j = 0; j < 3; j++) {
    const u = vectors[6 + j];
    vectors.push({
      x: -u.x,
      y: -u.y,
      z: -u.z
    });
  }

  return vectors;
}

/**
 * Returns the 12 3D Kryst Stamp lattice translation vectors.
 * Center-to-center distance between 3D stamps: S = STAMP_STEP * r = (4 + 2√3)r.
 *
 * @param {number} r - Base radius.
 * @param {'volumetric'|'stratified'} [mode='volumetric']
 * @returns {Array<{x: number, y: number, z: number}>}
 */
function getKrystStampVectors(r, mode = 'volumetric') {
  const S = STAMP_STEP * r;
  const vectors = [];

  // 6 In-Plane Stamp Vectors (Δz = 0) along m * 60°
  for (let m = 0; m < 6; m++) {
    const phi = m * (Math.PI / 3);
    vectors.push({
      x: S * Math.cos(phi),
      y: S * Math.sin(phi),
      z: 0
    });
  }

  if (mode === 'volumetric') {
    // 3 Upper FCC Stamp Vectors (rotated by 30° along cuboctahedral pockets)
    for (let j = 0; j < 3; j++) {
      const phi = j * (2 * Math.PI / 3) + (Math.PI / 6);
      vectors.push({
        x: S * (1 / SQRT3) * Math.cos(phi),
        y: S * (1 / SQRT3) * Math.sin(phi),
        z: S * Math.sqrt(2 / 3)
      });
    }

    // 3 Lower FCC Stamp Vectors (antipodal)
    for (let j = 0; j < 3; j++) {
      const up = vectors[6 + j];
      vectors.push({
        x: -up.x,
        y: -up.y,
        z: -up.z
      });
    }
  }

  return vectors;
}

/* =========================================================================
   3. 3D FLOWER OF LIFE FCC GENERATOR (getLife3DGeometry)
   ========================================================================= */

/**
 * Generates the 3D Flower of Life close-packed FCC sphere coordinates up to shell K.
 * Uses Breadth-First Expansion along the 12 FCC Basis Vectors.
 * Shell totals match exact cuboctahedral magic numbers:
 * K=0 => 1 sphere (origin)
 * K=1 => 13 spheres (Vector Equilibrium / 3D Seed of Life)
 * K=2 => 55 spheres
 * K=3 => 147 spheres
 * K=4 => 309 spheres
 *
 * @param {number} K - Layer / shell depth (K >= 0).
 * @param {number} r - Sphere radius.
 * @returns {{spheres: Array<{id: string, x: number, y: number, z: number, role: string, layer: number, plane: string}>, guides: Array<{p1: {x:number, y:number, z:number}, p2: {x:number, y:number, z:number}, type: string}>, boundingRadius: number}}
 */
function getLife3DGeometry(K, r) {
  if (K < 0) {
    return { spheres: [], guides: [], boundingRadius: 2 * r };
  }

  const basis = getFCCBasisVectors(r);
  const tol = EPSILON * r;
  const tolSq = tol * tol;
  const cellSize = 2 * r;

  // Spatial hash grid for O(1) deduplication
  const grid = new Map();
  const spheres = [];

  const getGridKey = (x, y, z) => {
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);
    const gz = Math.floor(z / cellSize);
    return `${gx},${gy},${gz}`;
  };

  const addSphere = (candidate) => {
    const gx = Math.floor(candidate.x / cellSize);
    const gy = Math.floor(candidate.y / cellSize);
    const gz = Math.floor(candidate.z / cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${gx + dx},${gy + dy},${gz + dz}`;
          const cell = grid.get(key);
          if (cell) {
            for (let i = 0; i < cell.length; i++) {
              const o = cell[i];
              const distSq = (o.x - candidate.x) ** 2 + (o.y - candidate.y) ** 2 + (o.z - candidate.z) ** 2;
              if (distSq < tolSq) {
                return null; // Already exists
              }
            }
          }
        }
      }
    }

    spheres.push(candidate);
    const key = `${gx},${gy},${gz}`;
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(candidate);
    return candidate;
  };

  // Layer 0: 1 sphere at (0, 0, 0)
  const centerSphere = {
    id: 'fol3d_0_0',
    x: 0,
    y: 0,
    z: 0,
    role: 'center',
    layer: 0,
    plane: 'A'
  };
  addSphere(centerSphere);

  let currentShell = [centerSphere];

  // BFS Shell Expansion for K = 1 ... K
  for (let k = 1; k <= K; k++) {
    const nextShell = [];
    let idxInLayer = 0;

    for (let pIdx = 0; pIdx < currentShell.length; pIdx++) {
      const p = currentShell[pIdx];
      for (let bIdx = 0; bIdx < basis.length; bIdx++) {
        const b = basis[bIdx];
        const nx = p.x + b.x;
        const ny = p.y + b.y;
        const nz = p.z + b.z;

        const candidate = {
          id: `fol3d_${k}_${idxInLayer}`,
          x: nx,
          y: ny,
          z: nz,
          role: 'hexagon',
          layer: k,
          plane: getFCCPlane(nz, r)
        };

        const added = addSphere(candidate);
        if (added) {
          nextShell.push(added);
          idxInLayer++;
        }
      }
    }
    currentShell = nextShell;
  }

  // 3D Guide Struts (Lattice struts between mutual tangent spheres at distance 2r)
  const guides = [];
  const edgeSet = new Set();
  const targetDistSq = (2 * r) * (2 * r);
  const strutTolSq = (0.08 * r) * (0.08 * r);

  for (let i = 0; i < spheres.length; i++) {
    const p = spheres[i];
    const gx = Math.floor(p.x / cellSize);
    const gy = Math.floor(p.y / cellSize);
    const gz = Math.floor(p.z / cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${gx + dx},${gy + dy},${gz + dz}`;
          const cell = grid.get(key);
          if (cell) {
            for (let j = 0; j < cell.length; j++) {
              const o = cell[j];
              if (p.id < o.id) {
                const distSq = (o.x - p.x) ** 2 + (o.y - p.y) ** 2 + (o.z - p.z) ** 2;
                if (Math.abs(distSq - targetDistSq) <= strutTolSq) {
                  const edgeKey = `${p.id}:${o.id}`;
                  if (!edgeSet.has(edgeKey)) {
                    edgeSet.add(edgeKey);
                    guides.push({
                      p1: { x: p.x, y: p.y, z: p.z },
                      p2: { x: o.x, y: o.y, z: o.z },
                      type: 'strut'
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Bounding radius
  let maxD = 0;
  for (let i = 0; i < spheres.length; i++) {
    const d = Math.hypot(spheres[i].x, spheres[i].y, spheres[i].z);
    if (d > maxD) maxD = d;
  }
  const boundingRadius = maxD + 2 * r;

  return { spheres, guides, boundingRadius };
}

/* =========================================================================
   4. 3D FLOWER OF KRYST STAMP & RESTAMP (getKryst3DGeometry)
   ========================================================================= */

/**
 * Creates a single 3D Volumetric FCC Kryst Stamp centered at (cx, cy, cz).
 * Includes:
 * - Primary Layer (z = cz, Plane A):
 *   1. Innermost Hexagon (6 ring spheres, center sphere omitted if at (0,0,0))
 *   2. 6 Infill Triangles (18 spheres)
 *   3. 6 Outer Hexagons (42 ring + center spheres)
 *   4. 6 Outward Bridge Triangles (18 spheres)
 * - Upper (Plane B, z = cz + Δz) & Lower (Plane C, z = cz - Δz) FCC Nested Triangles & Tetrahedral Caps:
 *   1. 3-sphere FCC Triangles nestled above and below each of the 7 Hexagons (Inner + 6 Outer)
 *   2. Top & Bottom Tetrahedral Apex Spheres above and below each of the 12 Triangles (6 Infill + 6 Bridge)
 *
 * All spheres are mutually tangent at distance 2r!
 *
 * @param {number} cx - Stamp center X.
 * @param {number} cy - Stamp center Y.
 * @param {number} cz - Stamp center Z.
 * @param {number} r - Sphere radius.
 * @returns {{spheres: Array<Object>, guides: Array<Object>, outerHexagonCenters: Array<{x:number, y:number, z:number}>}}
 */
function createKrystStamp3D(cx, cy, cz, r) {
  const spheres = [];
  const guides = [];
  const outerHexagonCenters = [];
  const primaryTriangles = [];

  const addEdge = (p1, p2, type = 'guide') => {
    guides.push({ p1: { x: p1.x, y: p1.y, z: p1.z }, p2: { x: p2.x, y: p2.y, z: p2.z }, type });
  };

  // -----------------------------------------------------------------------
  // 1. PRIMARY LAYER (z = cz)
  // -----------------------------------------------------------------------

  // A. Innermost Hexagon
  // Center sphere rule: ONLY if away from global origin (0,0,0)
  if (Math.hypot(cx, cy, cz) > EPSILON * r) {
    spheres.push({ x: cx, y: cy, z: cz, role: 'hexagon-center', plane: getFCCPlane(cz, r) });
  }

  const innerHexRing = [];
  for (let m = 0; m < 6; m++) {
    const theta = m * (Math.PI / 3);
    const x = cx + 2 * r * Math.cos(theta);
    const y = cy + 2 * r * Math.sin(theta);
    const pt = { x, y, z: cz, role: 'hexagon', plane: getFCCPlane(cz, r) };
    spheres.push(pt);
    innerHexRing.push(pt);
  }

  // Inner hex guides (6 perimeter edges)
  for (let m = 0; m < 6; m++) {
    addEdge(innerHexRing[m], innerHexRing[(m + 1) % 6], 'hexagon');
  }

  // B. 6 Infill Triangles (18 spheres)
  for (let m = 0; m < 6; m++) {
    const theta = m * (Math.PI / 3) + (Math.PI / 6);
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    const tx = -Math.sin(theta);
    const ty = Math.cos(theta);

    const Tm1 = {
      x: cx + DIST_TRI_INNER * r * ux - r * tx,
      y: cy + DIST_TRI_INNER * r * uy - r * ty,
      z: cz,
      role: 'triangle',
      plane: getFCCPlane(cz, r)
    };
    const Tm2 = {
      x: cx + DIST_TRI_INNER * r * ux + r * tx,
      y: cy + DIST_TRI_INNER * r * uy + r * ty,
      z: cz,
      role: 'triangle',
      plane: getFCCPlane(cz, r)
    };
    const Tm3 = {
      x: cx + DIST_TRI_APEX * r * ux,
      y: cy + DIST_TRI_APEX * r * uy,
      z: cz,
      role: 'triangle',
      plane: getFCCPlane(cz, r)
    };

    spheres.push(Tm1, Tm2, Tm3);
    primaryTriangles.push([Tm1, Tm2, Tm3]);

    // Triangle guides (3 perimeter edges)
    addEdge(Tm1, Tm2, 'triangle');
    addEdge(Tm2, Tm3, 'triangle');
    addEdge(Tm3, Tm1, 'triangle');
  }

  // C. 6 Outer Hexagons (Centers along m * 60° at distance (4 + 2√3)r: two hexagons flat on top and bottom)
  for (let m = 0; m < 6; m++) {
    const phi = m * (Math.PI / 3);
    const hx = cx + STAMP_STEP * r * Math.cos(phi);
    const hy = cy + STAMP_STEP * r * Math.sin(phi);
    const hexCenterPt = { x: hx, y: hy, z: cz };
    outerHexagonCenters.push(hexCenterPt);

    if (Math.hypot(hx, hy, cz) > EPSILON * r) {
      spheres.push({ x: hx, y: hy, z: cz, role: 'hexagon-center', plane: getFCCPlane(cz, r) });
    }

    const outerRing = [];
    for (let j = 0; j < 6; j++) {
      const theta = j * (Math.PI / 3);
      const ox = hx + 2 * r * Math.cos(theta);
      const oy = hy + 2 * r * Math.sin(theta);
      const pt = { x: ox, y: oy, z: cz, role: 'hexagon', plane: getFCCPlane(cz, r) };
      spheres.push(pt);
      outerRing.push(pt);
    }

    for (let j = 0; j < 6; j++) {
      addEdge(outerRing[j], outerRing[(j + 1) % 6], 'hexagon');
    }
  }

  // D. 6 Outward Bridge Triangles (18 spheres)
  for (let m = 0; m < 6; m++) {
    const theta = m * (Math.PI / 3) + (Math.PI / 6);
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    const tx = -Math.sin(theta);
    const ty = Math.cos(theta);

    const Bm1 = {
      x: cx + STAMP_STEP * r * ux,
      y: cy + STAMP_STEP * r * uy,
      z: cz,
      role: 'triangle',
      plane: getFCCPlane(cz, r)
    };
    const Bm2 = {
      x: cx + (4 + 3 * SQRT3) * r * ux - r * tx,
      y: cy + (4 + 3 * SQRT3) * r * uy - r * ty,
      z: cz,
      role: 'triangle',
      plane: getFCCPlane(cz, r)
    };
    const Bm3 = {
      x: cx + (4 + 3 * SQRT3) * r * ux + r * tx,
      y: cy + (4 + 3 * SQRT3) * r * uy + r * ty,
      z: cz,
      role: 'triangle',
      plane: getFCCPlane(cz, r)
    };

    spheres.push(Bm1, Bm2, Bm3);
    primaryTriangles.push([Bm1, Bm2, Bm3]);

    addEdge(Bm1, Bm2, 'triangle');
    addEdge(Bm2, Bm3, 'triangle');
    addEdge(Bm3, Bm1, 'triangle');
  }

  // -----------------------------------------------------------------------
  // 2. UPPER (Plane B, z = cz + Δz) & LOWER (Plane C, z = cz - Δz) FCC CAPS
  // -----------------------------------------------------------------------

  const dz = FCC_DZ * r;
  const upperZ = cz + dz;
  const lowerZ = cz - dz;
  const upperPlane = getFCCPlane(upperZ, r);
  const lowerPlane = getFCCPlane(lowerZ, r);

  // A. Hexagon Pocket Triangles (Above & Below the 7 Hexagons)
  const allHexCenters = [{ x: cx, y: cy, z: cz, ring: innerHexRing }, ...outerHexagonCenters];

  for (let h = 0; h < allHexCenters.length; h++) {
    const hc = allHexCenters[h];

    // Upper 3-sphere triangle (Plane B) at 30°, 150°, 270°
    const upperTri = [];
    for (let j = 0; j < 3; j++) {
      const alpha = j * (2 * Math.PI / 3) + (Math.PI / 6);
      const px = hc.x + FCC_POCKET_R * r * Math.cos(alpha);
      const py = hc.y + FCC_POCKET_R * r * Math.sin(alpha);
      const pt = { x: px, y: py, z: upperZ, role: 'triangle', plane: upperPlane };
      spheres.push(pt);
      upperTri.push(pt);
    }
    // Upper triangle guide struts
    addEdge(upperTri[0], upperTri[1], 'strut');
    addEdge(upperTri[1], upperTri[2], 'strut');
    addEdge(upperTri[2], upperTri[0], 'strut');

    // Lower 3-sphere inverted triangle (Plane C) at 90°, 210°, 330°
    const lowerTri = [];
    for (let j = 0; j < 3; j++) {
      const beta = j * (2 * Math.PI / 3) + (Math.PI / 2);
      const px = hc.x + FCC_POCKET_R * r * Math.cos(beta);
      const py = hc.y + FCC_POCKET_R * r * Math.sin(beta);
      const pt = { x: px, y: py, z: lowerZ, role: 'triangle', plane: lowerPlane };
      spheres.push(pt);
      lowerTri.push(pt);
    }
    // Lower triangle guide struts
    addEdge(lowerTri[0], lowerTri[1], 'strut');
    addEdge(lowerTri[1], lowerTri[2], 'strut');
    addEdge(lowerTri[2], lowerTri[0], 'strut');
  }

  // B. Tetrahedral Caps Above & Below the 12 Equilateral Triangles (6 Infill + 6 Bridge)
  for (let t = 0; t < primaryTriangles.length; t++) {
    const tri = primaryTriangles[t];
    const gx = (tri[0].x + tri[1].x + tri[2].x) / 3;
    const gy = (tri[0].y + tri[1].y + tri[2].y) / 3;

    // Upper Apex Cap Sphere
    const capUp = { x: gx, y: gy, z: upperZ, role: 'triangle', plane: upperPlane };
    spheres.push(capUp);

    // Lower Apex Cap Sphere
    const capDown = { x: gx, y: gy, z: lowerZ, role: 'triangle', plane: lowerPlane };
    spheres.push(capDown);

    // Tetrahedral struts connecting apex to the 3 base triangle vertices
    for (let v = 0; v < 3; v++) {
      addEdge(capUp, tri[v], 'strut');
      addEdge(capDown, tri[v], 'strut');
    }
  }

  return { spheres, guides, outerHexagonCenters };
}

/**
 * Calculates the 3D interstitial octant ID (1 to 8) or 0 for Cartesian planes (xyz = 0).
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} [tol=1e-2]
 * @returns {number} 0 if on Cartesian plane (xyz = 0), 1..8 for interstitial octants.
 */
function getOctantId(x, y, z, tol = 1e-2) {
  if (Math.abs(x) < tol || Math.abs(y) < tol || Math.abs(z) < tol) {
    return 0; // On one of the Cartesian planes (xyz = 0)
  }
  const code = (x > 0 ? 1 : 0) | (y > 0 ? 2 : 0) | (z > 0 ? 4 : 0);
  return code + 1; // 1 to 8
}

/**
 * 3D VOLUMETRIC FLOWER OF KRYST GEOMETRY ENGINE (getKrystGeometry3D)
 * Extrapolates 2D Flower of Kryst into a space-filling, jammed 3D crystalline lattice:
 * - Cartesian planes (XY, YZ, ZX) carry exact 2D Flower of Kryst pattern,
 *   forming Rhombic Dodecahedron / Cuboctahedron cores at stamp centers.
 * - All 8 three-dimensional octant spaces (±X, ±Y, ±Z) are packed with
 *   Rhombic Dodecahedra / Cuboctahedra and Regular Tetrahedra / Octahedra.
 * - Origin Exception Rule: (0, 0, 0) strictly hollow / empty.
 * - Zero gaps where another sphere of radius r can fit.
 *
 * @param {number} N - Layer count (N >= 1)
 * @param {number} r - Base sphere radius
 * @param {Object} [options={}]
 * @returns {{spheres: Array<Object>, guides: Array<Object>, boundingRadius: number, activeStampCenters: Array<Object>}}
 */
function getKrystGeometry3D(N, r, options = {}) {
  if (N <= 0) {
    return { spheres: [], guides: [], boundingRadius: 2 * r, activeStampCenters: [] };
  }

  const R_bound = 2 * N * r;
  const cellSize = 2 * r;
  const tol = EPSILON * r;
  const identicalTolSq = (0.05 * r) * (0.05 * r);
  const minContactDistSq = (2 * r - tol) * (2 * r - tol);

  const grid = new Map();
  const spheres = [];
  const guides = [];

  const getGridKey = (x, y, z) => {
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);
    const gz = Math.floor(z / cellSize);
    return `${gx},${gy},${gz}`;
  };

  const findNearest = (x, y, z) => {
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);
    const gz = Math.floor(z / cellSize);
    let nearest = null;
    let minDSq = Infinity;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = grid.get(`${gx + dx},${gy + dy},${gz + dz}`);
          if (cell) {
            for (let i = 0; i < cell.length; i++) {
              const o = cell[i];
              const dSq = (o.x - x) ** 2 + (o.y - y) ** 2 + (o.z - z) ** 2;
              if (dSq < minDSq) {
                minDSq = dSq;
                nearest = o;
              }
            }
          }
        }
      }
    }
    return { nearest, minDSq };
  };

  const addNode = (cand) => {
    const d = Math.hypot(cand.x, cand.y, cand.z);
    // Origin Exception Rule: (0,0,0) is strictly hollow / empty
    if (d < 0.5 * r) return null;
    if (d > R_bound + tol) return null;

    const { nearest, minDSq } = findNearest(cand.x, cand.y, cand.z);
    if (nearest) {
      if (minDSq <= identicalTolSq) {
        // Same node: upgrade role priority if higher
        const rolePriority = { 'center': 5, 'hex_core': 4, 'hex_axis': 3, 'hex_octant': 2, 'tri_axis': 1, 'tri_tet': 0 };
        if ((rolePriority[cand.role] || 0) > (rolePriority[nearest.role] || 0)) {
          nearest.role = cand.role;
          nearest.polyhedronType = cand.polyhedronType;
        }
        return nearest;
      }
      // If it overlaps within contact threshold (2r - epsilon), reject!
      if (minDSq < minContactDistSq) {
        return null;
      }
    }

    const k = Math.max(1, Math.ceil((d - tol) / (2 * r)));
    const octantId = getOctantId(cand.x, cand.y, cand.z, tol);
    const node = {
      id: `fok3d_${spheres.length}`,
      x: Number(cand.x.toFixed(3)),
      y: Number(cand.y.toFixed(3)),
      z: Number(cand.z.toFixed(3)),
      d: Number(d.toFixed(3)),
      k,
      role: cand.role,
      polyhedronType: cand.polyhedronType,
      octantId,
      plane: cand.plane || (octantId === 0 ? 'Cartesian' : `Octant-${octantId}`),
      layer: k
    };

    spheres.push(node);
    const key = getGridKey(node.x, node.y, node.z);
    let cell = grid.get(key);
    if (!cell) { cell = []; grid.set(key, cell); }
    cell.push(node);
    return node;
  };

  const guideEdgeSet = new Set();
  const addGuide = (p1, p2, type) => {
    const k1 = `${Math.round(p1.x)},${Math.round(p1.y)},${Math.round(p1.z)}`;
    const k2 = `${Math.round(p2.x)},${Math.round(p2.y)},${Math.round(p2.z)}`;
    if (k1 === k2) return;
    const edgeKey = k1 < k2 ? `${k1}:${k2}` : `${k2}:${k1}`;
    if (guideEdgeSet.has(edgeKey)) return;
    guideEdgeSet.add(edgeKey);

    guides.push({
      p1: { x: Number(p1.x.toFixed(3)), y: Number(p1.y.toFixed(3)), z: Number(p1.z.toFixed(3)) },
      p2: { x: Number(p2.x.toFixed(3)), y: Number(p2.y.toFixed(3)), z: Number(p2.z.toFixed(3)) },
      type
    });
  };

  // PASS A — 2D Flower of Kryst on 3 Cartesian Planes (XY, YZ, ZX)
  const geom2D = getKrystGeometry(N, r);
  const circles2D = geom2D.circles;

  // Mount 2D circles on XY (primary), YZ, and ZX
  for (let i = 0; i < circles2D.length; i++) {
    const c = circles2D[i];
    let role = (c.role === 'hexagon') ? 'hex_axis' : (c.role === 'hexagon-center' ? 'center' : 'tri_axis');
    let polyType = (c.role === 'hexagon') ? 'Rhombic Dodecahedron Core' : (c.role === 'hexagon-center' ? 'Stamp Center Node' : 'Regular Tetrahedron (4-Sphere)');
    addNode({ x: c.x, y: c.y, z: 0, role, polyhedronType: polyType, plane: 'XY' });
  }

  for (let i = 0; i < circles2D.length; i++) {
    const c = circles2D[i];
    let role = (c.role === 'hexagon') ? 'hex_axis' : (c.role === 'hexagon-center' ? 'center' : 'tri_axis');
    let polyType = (c.role === 'hexagon') ? 'Rhombic Dodecahedron Core' : (c.role === 'hexagon-center' ? 'Stamp Center Node' : 'Regular Tetrahedron (4-Sphere)');
    addNode({ x: 0, y: c.x, z: c.y, role, polyhedronType: polyType, plane: 'YZ' });
  }

  for (let i = 0; i < circles2D.length; i++) {
    const c = circles2D[i];
    let role = (c.role === 'hexagon') ? 'hex_axis' : (c.role === 'hexagon-center' ? 'center' : 'tri_axis');
    let polyType = (c.role === 'hexagon') ? 'Rhombic Dodecahedron Core' : (c.role === 'hexagon-center' ? 'Stamp Center Node' : 'Regular Tetrahedron (4-Sphere)');
    addNode({ x: c.y, y: 0, z: c.x, role, polyhedronType: polyType, plane: 'ZX' });
  }

  // Stamp centers in 3D within bounding radius
  const stampCenters3D = [{ x: 0, y: 0, z: 0 }];
  const sc2D = geom2D.activeStampCenters || [];
  for (let i = 0; i < sc2D.length; i++) {
    const sc = sc2D[i];
    const dist2D = Math.hypot(sc.x, sc.y);
    if (dist2D > tol && dist2D <= R_bound + 2 * r) {
      stampCenters3D.push({ x: sc.x, y: sc.y, z: 0 });
      stampCenters3D.push({ x: 0, y: sc.x, z: sc.y });
      stampCenters3D.push({ x: sc.y, y: 0, z: sc.x });
    }
  }

  // PASS B — 3D Rhombic Dodecahedron Cores at Origin & Stamp Centers
  const delta = (2 / SQRT3) * r;
  for (let sIdx = 0; sIdx < stampCenters3D.length; sIdx++) {
    const C = stampCenters3D[sIdx];
    if (Math.hypot(C.x, C.y, C.z) > tol) {
      addNode({ x: C.x, y: C.y, z: C.z, role: 'center', polyhedronType: 'Stamp Center Node' });
    }

    // 6 axial vertices
    const axialVerts = [
      { x: C.x + 2 * r, y: C.y, z: C.z },
      { x: C.x - 2 * r, y: C.y, z: C.z },
      { x: C.x, y: C.y + 2 * r, z: C.z },
      { x: C.x, y: C.y - 2 * r, z: C.z },
      { x: C.x, y: C.y, z: C.z + 2 * r },
      { x: C.x, y: C.y, z: C.z - 2 * r }
    ];
    for (let a = 0; a < axialVerts.length; a++) {
      addNode({ x: axialVerts[a].x, y: axialVerts[a].y, z: axialVerts[a].z, role: 'hex_core', polyhedronType: 'Rhombic Dodecahedron Core' });
    }

    // 8 octant corner vertices
    for (let sx of [-1, 1]) {
      for (let sy of [-1, 1]) {
        for (let sz of [-1, 1]) {
          const octPt = { x: C.x + sx * delta, y: C.y + sy * delta, z: C.z + sz * delta };
          addNode({ x: octPt.x, y: octPt.y, z: octPt.z, role: 'hex_core', polyhedronType: 'Rhombic Dodecahedron Core' });

          // 12 Rhombic wireframe edges connecting octant corner to 3 adjacent axial vertices
          addGuide(octPt, { x: C.x + sx * 2 * r, y: C.y, z: C.z }, 'rhombic_core');
          addGuide(octPt, { x: C.x, y: C.y + sy * 2 * r, z: C.z }, 'rhombic_core');
          addGuide(octPt, { x: C.x, y: C.y, z: C.z + sz * 2 * r }, 'rhombic_core');
        }
      }
    }
  }

  // PASS C — Volumetric Inter-Axis Octant Extrapolation
  const h_tet = TET_PITCH * r;
  const maxL = Math.ceil(R_bound / h_tet);
  const guides2D = geom2D.guides || [];

  const planes = [
    { name: 'XY', n: { x: 0, y: 0, z: 1 }, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 1, z: 0 } },
    { name: 'YZ', n: { x: 1, y: 0, z: 0 }, u: { x: 0, y: 1, z: 0 }, v: { x: 0, y: 0, z: 1 } },
    { name: 'ZX', n: { x: 0, y: 1, z: 0 }, u: { x: 0, y: 0, z: 1 }, v: { x: 1, y: 0, z: 0 } }
  ];

  for (let pIdx = 0; pIdx < planes.length; pIdx++) {
    const pl = planes[pIdx];
    for (let gIdx = 0; gIdx < guides2D.length; gIdx++) {
      const g = guides2D[gIdx];
      if (g.type === 'triangle' && g.vertices && g.vertices.length >= 3) {
        const v3D = g.vertices.slice(0, 3).map(pt => ({
          x: pt.x * pl.u.x + pt.y * pl.v.x,
          y: pt.x * pl.u.y + pt.y * pl.v.y,
          z: pt.x * pl.u.z + pt.y * pl.v.z
        }));
        const centroid = {
          x: (v3D[0].x + v3D[1].x + v3D[2].x) / 3,
          y: (v3D[0].y + v3D[1].y + v3D[2].y) / 3,
          z: (v3D[0].z + v3D[1].z + v3D[2].z) / 3
        };

        for (let L = 1; L <= maxL; L++) {
          for (let sign of [-1, 1]) {
            const zH = sign * L * h_tet;
            if (L % 2 === 1) {
              const apex = {
                x: centroid.x + zH * pl.n.x,
                y: centroid.y + zH * pl.n.y,
                z: centroid.z + zH * pl.n.z
              };
              const added = addNode({ ...apex, role: 'tri_tet', polyhedronType: 'Regular Tetrahedron (4-Sphere)' });
              if (added && L === 1) {
                for (let v = 0; v < 3; v++) addGuide(apex, v3D[v], 'tetrahedron');
              }
            } else {
              for (let v = 0; v < 3; v++) {
                const dx = v3D[v].x - centroid.x;
                const dy = v3D[v].y - centroid.y;
                const dz = v3D[v].z - centroid.z;
                const pt = {
                  x: centroid.x - dx + zH * pl.n.x,
                  y: centroid.y - dy + zH * pl.n.y,
                  z: centroid.z - dz + zH * pl.n.z
                };
                const added = addNode({ ...pt, role: 'tri_tet', polyhedronType: 'Regular Octahedron (6-Sphere)' });
                if (added && L === 2) {
                  addGuide(pt, centroid, 'octahedron');
                }
              }
            }
          }
        }
      } else if (g.type === 'hexagon') {
        const hc3D = {
          x: g.cx * pl.u.x + g.cy * pl.v.x,
          y: g.cx * pl.u.y + g.cy * pl.v.y,
          z: g.cx * pl.u.z + g.cy * pl.v.z
        };
        for (let L = 1; L <= maxL; L++) {
          for (let sign of [-1, 1]) {
            const zH = sign * L * h_tet;
            const offsetAngle = (L % 2 === 1) ? (Math.PI / 6) : (Math.PI / 2);
            for (let j = 0; j < 3; j++) {
              const alpha = j * (2 * Math.PI / 3) + offsetAngle;
              const ca = Math.cos(alpha);
              const sa = Math.sin(alpha);
              const pt = {
                x: hc3D.x + delta * (ca * pl.u.x + sa * pl.v.x) + zH * pl.n.x,
                y: hc3D.y + delta * (ca * pl.u.y + sa * pl.v.y) + zH * pl.n.y,
                z: hc3D.z + delta * (ca * pl.u.z + sa * pl.v.z) + zH * pl.n.z
              };
              addNode({ ...pt, role: 'hex_octant', polyhedronType: 'Cuboctahedron Cap' });
            }
          }
        }
      }
    }
  }

// PASS D — 3D Jamming / Void-Saturation Guarantee
  // 1. Close-packed 3D candidate lattice across all 3 Cartesian orientations
  const orientations = [
    (u, v, w) => ({ x: u, y: v, z: w }),
    (u, v, w) => ({ x: w, y: u, z: v }),
    (u, v, w) => ({ x: v, y: w, z: u })
  ];

  const maxLz = Math.ceil(R_bound / h_tet) + 1;
  const maxJ = Math.ceil(R_bound / (SQRT3 * r)) + 1;
  const maxI = Math.ceil(R_bound / (2 * r)) + 1;

  for (let oIdx = 0; oIdx < orientations.length; oIdx++) {
    const mapCoord = orientations[oIdx];
    for (let lz = -maxLz; lz <= maxLz; lz++) {
      const w = lz * h_tet;
      const m = ((lz % 3) + 3) % 3;
      const ox = (m === 1) ? r : 0;
      const oy = (m === 1) ? (r / SQRT3) : (m === 2 ? (2 * r / SQRT3) : 0);

      for (let j = -maxJ; j <= maxJ; j++) {
        const v = oy + j * SQRT3 * r;
        const rx = ((Math.abs(j) % 2)) * r;
        for (let i = -maxI; i <= maxI; i++) {
          const u = ox + rx + i * 2 * r;
          const pt = mapCoord(u, v, w);
          const d = Math.hypot(pt.x, pt.y, pt.z);
          if (d > R_bound || d < 0.5 * r) continue;

          let minDistToStampCenter = Infinity;
          for (let sc of stampCenters3D) {
            const scDist = Math.hypot(sc.x - pt.x, sc.y - pt.y, sc.z - pt.z);
            if (scDist < minDistToStampCenter) minDistToStampCenter = scDist;
          }
          const isCore = minDistToStampCenter <= 2.1 * r;
          addNode({
            x: pt.x, y: pt.y, z: pt.z,
            role: isCore ? 'hex_octant' : 'tri_tet',
            polyhedronType: isCore ? 'Cuboctahedron Cap' : 'Regular Tetrahedron (4-Sphere)'
          });
        }
      }
    }
  }

  // 2. Fine Interstitial Sweep: Guarantee zero voids where radius r sphere can fit
  const sweepStep = 0.5 * r;
  for (let x = -R_bound; x <= R_bound; x += sweepStep) {
    for (let y = -R_bound; y <= R_bound; y += sweepStep) {
      for (let z = -R_bound; z <= R_bound; z += sweepStep) {
        const d = Math.hypot(x, y, z);
        if (d > R_bound || d < 0.5 * r) continue;
        const { minDSq } = findNearest(x, y, z);
        if (minDSq >= minContactDistSq) {
          let minDistToStampCenter = Infinity;
          for (let sc of stampCenters3D) {
            const scDist = Math.hypot(sc.x - x, sc.y - y, sc.z - z);
            if (scDist < minDistToStampCenter) minDistToStampCenter = scDist;
          }
          const isCore = minDistToStampCenter <= 2.1 * r;
          addNode({
            x, y, z,
            role: isCore ? 'hex_octant' : 'tri_tet',
            polyhedronType: isCore ? 'Cuboctahedron Cap' : 'Regular Tetrahedron (4-Sphere)'
          });
        }
      }
    }
  }

  return {
    spheres,
    guides,
    boundingRadius: R_bound,
    activeStampCenters: stampCenters3D
  };
}

/**
 * Backward compatibility alias for getKrystGeometry3D.
 */
function getKryst3DGeometry(N, r, options = {}) {
  return getKrystGeometry3D(N, r, options);
}

/**
 * Automated Saturation Diagnostic Check:
 * Verifies:
 * 1. Origin (0,0,0) is hollow / empty (Origin Exception Rule).
 * 2. Minimum pairwise distance >= 2r - epsilon (zero illegal overlaps).
 * 3. Maximum interstitial void radius inside bounding sphere is < r (100% jammed).
 *
 * @param {Array<Object>} spheres - 3D spheres list
 * @param {number} R_bound - Bounding radius
 * @param {number} r - Sphere radius
 * @returns {{originPass: boolean, minOriginDist: number, overlapPass: boolean, minPairwise: number, maxVoidRadius: number, voidCheckPass: boolean, totalSpheres: number}}
 */
function checkSaturation(spheres, R_bound, r) {
  if (!spheres || spheres.length === 0) {
    return { originPass: false, minOriginDist: 0, overlapPass: false, minPairwise: 0, maxVoidRadius: 0, voidCheckPass: false, totalSpheres: 0 };
  }

  // 1. Origin Exception Verification
  const originDists = spheres.map(s => Math.hypot(s.x, s.y, s.z));
  const minOriginDist = Math.min(...originDists);
  const originPass = minOriginDist >= 0.5 * r;

  // 2. Minimum Pairwise Distance Verification
  let minPairwise = Infinity;
  for (let i = 0; i < spheres.length; i++) {
    for (let j = i + 1; j < spheres.length; j++) {
      const d = Math.hypot(spheres[i].x - spheres[j].x, spheres[i].y - spheres[j].y, spheres[i].z - spheres[j].z);
      if (d < minPairwise) minPairwise = d;
    }
  }
  const overlapPass = minPairwise >= (2 * r - 1e-2 * r);

  // 3. Maximum Interstitial Void Radius inside packed volume
  const step = 0.5 * r;
  let maxVoidDist = 0;
  let illegalVoids = 0;
  for (let x = -R_bound; x <= R_bound; x += step) {
    for (let y = -R_bound; y <= R_bound; y += step) {
      for (let z = -R_bound; z <= R_bound; z += step) {
        const d = Math.hypot(x, y, z);
        if (d > R_bound - 2 * r || d < 0.8 * r) continue;
        let minDist = Infinity;
        for (let i = 0; i < spheres.length; i++) {
          const sd = Math.hypot(x - spheres[i].x, y - spheres[i].y, z - spheres[i].z);
          if (sd < minDist) minDist = sd;
        }
        const voidRad = Math.max(0, minDist - r);
        if (voidRad > maxVoidDist) maxVoidDist = voidRad;
        if (minDist >= 2 * r) illegalVoids++;
      }
    }
  }

  return {
    originPass,
    minOriginDist,
    overlapPass,
    minPairwise,
    maxVoidRadius: maxVoidDist,
    voidCheckPass: illegalVoids === 0,
    totalSpheres: spheres.length
  };
}

/* =========================================================================
   5. TRI-AXIAL 90° ORTHOGONAL CROSS & 3D INFILL GENERATOR
   ========================================================================= */

/**
 * Generates 3D Tri-Axial Orthogonal Cross (XY, XZ, YZ) and 3D Infill Spheres.
 * Rotates the 2D Sacred Geometry layout 90° out of plane around the X and Y axes,
 * turns the 2D circles into 3D spheres, and populates the 3D space between the axes.
 * Strictly maintains the Central Zero-Point Void at (0, 0, 0) for Flower of Kryst.
 *
 * @param {'life'|'kryst'} patternKey - 'life' or 'kryst'
 * @param {number} N - Layer count
 * @param {number} r - Base circle radius
 * @param {Object} [options]
 * @returns {{spheres: Array, guides: Array, boundingRadius: number}}
 */
function getTriAxialGeometry(patternKey, N, r, options = {}) {
  const infillSteps = (options.infillSteps !== undefined) ? options.infillSteps : 2;
  const infillMode = options.infillMode || 'both'; // 'angular' | 'grid' | 'both' | 'planes'
  const showXY = options.showPlaneXY !== false;
  const showXZ = options.showPlaneXZ !== false;
  const showYZ = options.showPlaneYZ !== false;
  const showInfill = options.showInfill3D !== false;
  const isKryst = (patternKey === 'kryst');
  const tol = 1e-2 * r;
  const tolSq = tol * tol;

  // 1. Obtain 2D circle centers
  let points2D = [];
  if (isKryst) {
    points2D = SacredMath.getKrystCoordinates(N, r);
  } else {
    const effectiveLayers = Math.max(1, Math.min(N, 6));
    points2D = SacredMath.generateFlowerOfLifePoints(N, r, effectiveLayers);
  }

  const spheres = [];
  const guides = [];

  function addSphere(x, y, z, role, plane, layer = 1, origPoint = null) {
    if (isKryst && (x * x + y * y + z * z < tolSq)) {
      // Strictly maintain empty Zero-Point void at (0, 0, 0)
      return;
    }
    // Spatial deduplication
    for (let i = 0; i < spheres.length; i++) {
      const s = spheres[i];
      if ((s.x - x) ** 2 + (s.y - y) ** 2 + (s.z - z) ** 2 < tolSq) return;
    }
    spheres.push({
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      z: Number(z.toFixed(3)),
      role,
      plane, // 'XY', 'XZ', 'YZ', 'Infill-X', 'Infill-Y', 'Infill-Grid'
      layer: layer || 1,
      origId: origPoint ? origPoint.id : null,
      pattern: patternKey
    });
  }

  // 1. Primary Plane: XY (z = 0)
  if (showXY) {
    for (const pt of points2D) {
      addSphere(pt.x, pt.y, 0, pt.role || (pt.layer === 0 ? 'center' : 'circle'), 'XY', pt.layer, pt);
    }
  }

  // 2. Rotated 90° around X-axis into XZ Plane (y = 0): (x, y, 0) -> (x, 0, y)
  if (showXZ) {
    for (const pt of points2D) {
      addSphere(pt.x, 0, pt.y, pt.role || (pt.layer === 0 ? 'center' : 'circle'), 'XZ', pt.layer, pt);
    }
  }

  // 3. Rotated 90° around Y-axis into YZ Plane (x = 0): (x, y, 0) -> (0, y, x)
  if (showYZ) {
    for (const pt of points2D) {
      addSphere(0, pt.y, pt.x, pt.role || (pt.layer === 0 ? 'center' : 'circle'), 'YZ', pt.layer, pt);
    }
  }

  // 4. Infill Between the Axes
  if (showInfill && infillMode !== 'planes' && infillSteps > 0) {
    // A. Angular Rotational Infill between XY and XZ (rotation around X-axis)
    if (infillMode === 'angular' || infillMode === 'both') {
      for (let k = 1; k <= infillSteps; k++) {
        const phi = (k * Math.PI) / (2 * (infillSteps + 1));
        const cosP = Math.cos(phi);
        const sinP = Math.sin(phi);

        for (const pt of points2D) {
          if (Math.abs(pt.y) > tol) {
            // Quadrant 1 (0° to 90°)
            addSphere(pt.x, pt.y * cosP, pt.y * sinP, 'infill-arc', 'Infill-X', pt.layer, pt);
            // Quadrant 2 (90° to 180°)
            addSphere(pt.x, -pt.y * sinP, pt.y * cosP, 'infill-arc', 'Infill-X', pt.layer, pt);
          }
        }
      }

      // B. Angular Rotational Infill between XY and YZ (rotation around Y-axis)
      for (let k = 1; k <= infillSteps; k++) {
        const phi = (k * Math.PI) / (2 * (infillSteps + 1));
        const cosP = Math.cos(phi);
        const sinP = Math.sin(phi);

        for (const pt of points2D) {
          if (Math.abs(pt.x) > tol) {
            addSphere(pt.x * cosP, pt.y, pt.x * sinP, 'infill-arc', 'Infill-Y', pt.layer, pt);
            addSphere(-pt.x * sinP, pt.y, pt.x * cosP, 'infill-arc', 'Infill-Y', pt.layer, pt);
          }
        }
      }
    }

    // C. 3D Diagonal / Coordinate Grid Infill (symmetric tri-axial coordinate tensor)
    if (infillMode === 'grid' || infillMode === 'both') {
      const coordSet = new Set();
      for (const pt of points2D) {
        coordSet.add(Math.round(pt.x));
        coordSet.add(Math.round(pt.y));
      }
      const coords = Array.from(coordSet).filter(c => c !== 0);
      const maxBound = isKryst
        ? SacredMath.getFoKBoundingRadius(N, r)
        : SacredMath.getFoLBoundingRadius(N, r);

      for (const pt of points2D) {
        if (pt.x === 0 && pt.y === 0) continue;
        const d2D = Math.hypot(pt.x, pt.y);
        for (const z of coords) {
          if (Math.abs(z) <= d2D) {
            const d3D = Math.hypot(pt.x, pt.y, z);
            if (d3D <= maxBound) {
              addSphere(pt.x * 0.7071, pt.y * 0.7071, z * 0.7071, 'infill-grid', 'Infill-Grid', pt.layer, pt);
            }
          }
        }
      }
    }
  }

  // 5. Clean Orthogonal Hexagonal Loop Guides in the 3 Planes
  const hexRadius = 2 * r;
  const loopCenters = points2D.filter(pt => pt.role === 'hexagon-center' || pt.role === 'center');
  const centersToDraw = loopCenters.length > 0 ? loopCenters : points2D.slice(0, 19);

  for (let p = 0; p < centersToDraw.length; p++) {
    const pt = centersToDraw[p];
    for (let m = 0; m < 6; m++) {
      const a1 = m * Math.PI / 3;
      const a2 = (m + 1) * Math.PI / 3;
      // XY Plane Hexagon Guide
      if (showXY) {
        guides.push({
          p1: { x: pt.x + hexRadius * Math.cos(a1), y: pt.y + hexRadius * Math.sin(a1), z: 0 },
          p2: { x: pt.x + hexRadius * Math.cos(a2), y: pt.y + hexRadius * Math.sin(a2), z: 0 },
          plane: 'XY'
        });
      }
      // XZ Plane Hexagon Guide (Rotated 90° around X)
      if (showXZ) {
        guides.push({
          p1: { x: pt.x + hexRadius * Math.cos(a1), y: 0, z: pt.y + hexRadius * Math.sin(a1) },
          p2: { x: pt.x + hexRadius * Math.cos(a2), y: 0, z: pt.y + hexRadius * Math.sin(a2) },
          plane: 'XZ'
        });
      }
      // YZ Plane Hexagon Guide (Rotated 90° around Y)
      if (showYZ) {
        guides.push({
          p1: { x: 0, y: pt.y + hexRadius * Math.cos(a1), z: pt.x + hexRadius * Math.sin(a1) },
          p2: { x: 0, y: pt.y + hexRadius * Math.cos(a2), z: pt.x + hexRadius * Math.sin(a2) },
          plane: 'YZ'
        });
      }
    }
  }

  let maxD = 0;
  for (let i = 0; i < spheres.length; i++) {
    const d = Math.hypot(spheres[i].x, spheres[i].y, spheres[i].z);
    if (d > maxD) maxD = d;
  }
  const boundingRadius = (spheres.length > 0) ? (maxD + 2 * r) : (2 * r);

  return {
    spheres,
    guides,
    boundingRadius
  };
}

/* =========================================================================
   6. SACRED MATH 3D EXPORT OBJECT
   ========================================================================= */
const SacredMath3D = {
  SQRT3,
  SQRT6,
  FCC_DZ,
  TET_PITCH,
  OCTANT_CORNER_DIST,
  FCC_POCKET_R,
  DIST_HEX,
  DIST_TRI_INNER,
  DIST_TRI_APEX,
  STAMP_STEP,
  DIST_BRIDGE_BASE,
  EPSILON,

  getFCCPlane,
  getFCCBasisVectors,
  getKrystStampVectors,
  getLife3DGeometry,
  createKrystStamp3D,
  getKryst3DGeometry,
  getKrystGeometry3D,
  getTriAxialGeometry,
  getOctantId,
  checkSaturation
};


/* --- js/state.js --- */
/**
 * APPLICATION STATE & PRESETS MANAGER
 * Centralized reactive state store, presets configurations, and storage persistence.
 * Includes defensive bounds clamping and validation at state boundaries.
 */

/* =========================================================================
   INPUT VALIDATION & BOUNDS CLAMPING HELPERS
   ========================================================================= */

/**
 * Safely parses and clamps numeric values to prevent NaN or extreme values.
 * @param {any} val - Input value.
 * @param {number} min - Minimum allowed value.
 * @param {number} max - Maximum allowed value.
 * @param {number} defaultVal - Default fallback if invalid.
 * @returns {number} Clamped safe number.
 */
function clampNumber(val, min, max, defaultVal) {
  const n = Number(val);
  if (Number.isNaN(n) || !Number.isFinite(n)) return defaultVal;
  return Math.min(Math.max(n, min), max);
}

/* =========================================================================
   GLOBAL APPLICATION STATE
   ========================================================================= */
const State = {
  viewportMode: 'single-kryst', // 'single-kryst' | 'single-life'
  activePreset: null,
  activePattern: 'kryst', // 'kryst' | 'life'
  
  // Independent Body & Aura Layer Visibility & Opacity (0.0 to 1.0, default 1.0 full visibility)
  bodyOpacity: 1.0,
  auraOpacity: 1.0,
  _bodyAuraMix: 0.5,
  get bodyAuraMix() { return this.auraOpacity; },
  set bodyAuraMix(v) { this.auraOpacity = clampNumber(v, 0, 1, 1.0); },

  _viewStyle: 'combined',
  get viewStyle() { return this._viewStyle; },
  set viewStyle(v) {
    if (v === 'actual' || v === 'aura') {
      this._viewStyle = 'aura';
      this.showAuraFlower = true;
      this.showBodyCircles = false;
      this.bodyOpacity = 0.0;
      this.auraOpacity = 1.0;
    } else if (v === 'base' || v === 'body') {
      this._viewStyle = 'body';
      this.showAuraFlower = false;
      this.showBodyCircles = true;
      this.bodyOpacity = 1.0;
      this.auraOpacity = 0.0;
    } else {
      this._viewStyle = 'combined';
      this.showAuraFlower = true;
      this.showBodyCircles = true;
      this.bodyOpacity = 1.0;
      this.auraOpacity = 1.0;
    }
  },

  // Dynamic Boundary Circle (E-05)
  boundaryRadius: 200, // in pixels (default 4 * r)
  disabledCircleIds: new Set(), // Body circles permanently removed by the user

  // Aura Radius Scale Factor (1.1r to 20.0r body radius, default 1.95)
  auraScale: 1.95,

  // Lattice Geometry
  N: 2,
  r: 50,
  syncPanZoom: true,

  // Layers visibility
  showAuraFlower: true,
  get showActualFlower() { return this.showAuraFlower; },
  set showActualFlower(v) { this.showAuraFlower = Boolean(v); },

  showBodyCircles: true,
  get showBaseCircles() { return this.showBodyCircles; },
  set showBaseCircles(v) { this.showBodyCircles = Boolean(v); },

  showGuides: false,
  showOuterRing: false, // Default outer ring visibility set to false per user request
  showBoundaryPetals: false,
  showCenterDots: false,
  showIntersections: false,
  showRadialAxes: false,
  showEyesOfKryst: false,

  // Advanced Visualizers & Modes
  circleRainbow: false, // R-A2: Each circle rainbow gradient
  ringSpectral: false, // R-A3: Rings 1..12 assigned Red -> Magenta
  fullScreenTiling: false, // R-A7: Full-screen wallpaper tiling
  rainbowRipple: false, // R-A9: Concentric meditation rainbow ripple
  showHexagramEyes: false, // R-A10: Circumscribed hexagrams + 12 eyes
  showSOHOE: false, // R-A11: Star of Heaven on Earth motif
  showStoryPanel: false, // R-A12: Story of Kryst drawer
  showRingNotes: false, // R-A13: Notes on current ring

  // Sacred Gadgets & Overlays (Concurrent Real-Time Animations)
  gadgetAuraExpansion: false,
  auraExpansionMaxSize: 20.0,
  auraExpansionSpeed: 1.0,
  gadgetRainbowAura: false,
  rainbowWaveSpeed: 1.0,
  gadgetBreathing: false,
  breathingMaxSize: 2.0,
  breathingSpeed: 1.0,

  // Offset Path Generator (R-A5)
  offsetPath: {
    enabled: false,
    count: 3,
    spacing: 5
  },

  // Painter of Life (R-A8)
  painterMode: false,
  painterColor: '#ef4444',
  coloredShapesMap: new Map(),

  // Individual Section Highlighting & Colored Intersections (Venn diagram style)
  sectionHighlightMode: false, // Dedicated mode for highlighting & coloring intersections
  selectedSectionIds: new Set(), // Set of currently selected intersection section IDs for batch fill
  get selectedSectionId() {
    return this.selectedSectionIds.values().next().value || null;
  },
  set selectedSectionId(v) {
    if (!this.selectedSectionIds) this.selectedSectionIds = new Set();
    this.selectedSectionIds.clear();
    if (v) this.selectedSectionIds.add(v);
  },
  sectionFills: {}, // { [sectionId]: colorHex }

  // Aesthetics
  colorByLayer: false,
  enableGlow: true,
  enablePulse: false,
  sphericalShading: false,

  // Curated Colors
  colorLife: '#ef4444',
  colorKryst: '#10b981',
  colorBody: '#3b82f6',
  get colorBase() { return this.colorBody; },
  set colorBase(v) { this.colorBody = v; },
  colorTriangle: '#eab308',
  colorGuide: '#ea580c',
  colorOuter: '#f59e0b',
  colorAxes: '#64748b',
  colorIntersection: '#ec4899',
  colorBg: '#07090e',

  // Strokes & Opacities
  strokeAura: 5.0,
  get strokeFlower() { return this.strokeAura; },
  set strokeFlower(v) { this.strokeAura = Number(v); },
  strokeBody: 1.0,
  get strokeBase() { return this.strokeBody; },
  set strokeBase(v) { this.strokeBody = Number(v); },
  strokeGuide: 1.8,
  fillOpacity: 0.04,

  // Selections & Highlights
  highlightedIds: new Set(),
  highlightedSectionIds: new Set(),
  hoveredItem: null,

  // Pan & Zoom Transform States
  transforms: {
    life: { panX: 0, panY: 0, scale: 0.38 },
    kryst: { panX: 0, panY: 0, scale: 0.38 }
  },

  // 3D WebGL Engine States (Frozen E-02)
  dimension: '2d', // '2d' | '3d'
  model3D: 'volumetric_kryst',
  colorCoding3D: 'classic',
  sphereStyle3D: 'solid',
  sphereRadiusScale: 1.0,
  sliceAxisMode: 'z',
  sliceOffset: 100,
  sliceSlabMode: false,
  sliceSlabThickness: 3,
  sliceRadialShell: 2,
  opacityHexCores: 0.90,
  opacityTetraFillers: 0.85,
  opacityOctantFill: 1.00,
  opacitySkeleton: 1.00,
  opacityAura3D: 0.18,
  opacityGuides3D: 0.70,
  fresnelGhostMode: false,
  showRhombicGuides: true,
  showTetraGuides: true,
  triaxialInfill: 'both',
  infillSteps: 2,
  showPlaneXY: true,
  showPlaneXZ: true,
  showPlaneYZ: true,
  showInfill3D: true,
  showAxialRims: true,
  fccPlaneFilter: 'all',
  fccExpansionMode: 'volumetric',
  show3DSpheres: true,
  show3DTorus: false,
  show3DShells: false,
  show3DGuides: true,
  showZeroPointMarker: true,
  sliceZ: 100,
  autoRotate3D: false,
  sphereOpacity: 0.35,
  sphereRoughness: 0.15,
  sphereMetalness: 0.1,
  cameraPreset3D: 'isometric',

  /**
   * Sets boundary radius safely.
   * @param {number} rad
   */
  setBoundaryRadius(rad) {
    this.boundaryRadius = clampNumber(rad, 2 * this.r, 42 * this.r, 4 * this.r);
    this.N = Math.max(1, Math.ceil(this.boundaryRadius / (2 * this.r)));
  },

  /**
   * Clamps and sets layer count N safely.
   * @param {number} n
   */
  setN(n) {
    this.N = clampNumber(n, 1, 42, 2);
    this.boundaryRadius = 2 * this.N * this.r;
  },

  /**
   * Clamps and sets base circle radius r safely.
   * @param {number} radius
   */
  setRadius(radius) {
    const oldR = this.r;
    this.r = clampNumber(radius, 15, 200, 50);
    // Keep relative boundary radius scale
    if (oldR > 0) {
      this.boundaryRadius = (this.boundaryRadius / oldR) * this.r;
    }
  },

  clampNumber(val, min, max, defaultVal) {
    return clampNumber(val, min, max, defaultVal);
  },

  /**
   * Resets all intersection fills, selected sections, and highlighted circles.
   */
  clearAllHighlights() {
    this.sectionFills = {};
    if (this.selectedSectionIds) this.selectedSectionIds.clear();
    if (this.highlightedIds) this.highlightedIds.clear();
    if (this.highlightedSectionIds) this.highlightedSectionIds.clear();
  },

  /**
   * Applies a studio configuration object to State.
   * @param {Object} cfg
   */
  applyConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    if (cfg.r !== undefined) this.r = clampNumber(cfg.r, 15, 200, 50);
    if (cfg.boundaryRadius !== undefined) this.boundaryRadius = cfg.boundaryRadius;
    if (cfg.N !== undefined) this.N = cfg.N;
    if (cfg.auraScale !== undefined) this.auraScale = clampNumber(cfg.auraScale, 0.0, 20.0, 1.95);
    if (cfg.auraExpansionMaxSize !== undefined) this.auraExpansionMaxSize = clampNumber(cfg.auraExpansionMaxSize, 0.0, 20.0, 20.0);
    if (cfg.auraExpansionSpeed !== undefined) this.auraExpansionSpeed = clampNumber(cfg.auraExpansionSpeed, 0.1, 3.0, 1.0);
    if (cfg.rainbowWaveSpeed !== undefined) this.rainbowWaveSpeed = clampNumber(cfg.rainbowWaveSpeed, 0.1, 3.0, 1.0);
    if (cfg.gadgetAuraExpansion !== undefined) this.gadgetAuraExpansion = Boolean(cfg.gadgetAuraExpansion);
    if (cfg.gadgetRainbowAura !== undefined) this.gadgetRainbowAura = Boolean(cfg.gadgetRainbowAura);
    if (cfg.gadgetBreathing !== undefined) this.gadgetBreathing = Boolean(cfg.gadgetBreathing);
    if (cfg.breathingMaxSize !== undefined) this.breathingMaxSize = clampNumber(cfg.breathingMaxSize, 1.05, 2.0, 2.0);
    if (cfg.breathingSpeed !== undefined) this.breathingSpeed = clampNumber(cfg.breathingSpeed, 0.1, 3.0, 1.0);
    if (cfg.activePattern !== undefined) this.activePattern = cfg.activePattern;
    if (cfg.bodyOpacity !== undefined) this.bodyOpacity = cfg.bodyOpacity;
    if (cfg.auraOpacity !== undefined) this.auraOpacity = cfg.auraOpacity;
    if (cfg.showBodyCircles !== undefined) this.showBodyCircles = cfg.showBodyCircles;
    if (cfg.showAuraFlower !== undefined) this.showAuraFlower = cfg.showAuraFlower;
    if (cfg.bodyAuraMix !== undefined) this.bodyAuraMix = cfg.bodyAuraMix;
    if (cfg.strokeAura !== undefined) this.strokeAura = clampNumber(cfg.strokeAura, 0.5, 10.0, 5.0);
    if (cfg.strokeFlower !== undefined) this.strokeAura = clampNumber(cfg.strokeFlower, 0.5, 10.0, 5.0);
    if (cfg.strokeBody !== undefined) this.strokeBody = clampNumber(cfg.strokeBody, 0.25, 6.0, 1.0);
    if (cfg.strokeBase !== undefined) this.strokeBody = clampNumber(cfg.strokeBase, 0.25, 6.0, 1.0);
    if (cfg.strokeGuide !== undefined) this.strokeGuide = clampNumber(cfg.strokeGuide, 0.25, 8.0, 1.8);
    if (cfg.fillOpacity !== undefined) this.fillOpacity = clampNumber(cfg.fillOpacity, 0, 1.0, 0.04);

    // Highlights
    if (!this.highlightedIds) this.highlightedIds = new Set();
    this.highlightedIds.clear();
    if (Array.isArray(cfg.highlightedIds)) {
      cfg.highlightedIds.forEach(id => this.highlightedIds.add(id));
    }

    if (!this.selectedSectionIds) this.selectedSectionIds = new Set();
    this.selectedSectionIds.clear();
    if (Array.isArray(cfg.selectedSectionIds)) {
      cfg.selectedSectionIds.forEach(id => this.selectedSectionIds.add(id));
    }

    if (!this.highlightedSectionIds) this.highlightedSectionIds = new Set();
    this.highlightedSectionIds.clear();
    if (Array.isArray(cfg.highlightedSectionIds)) {
      cfg.highlightedSectionIds.forEach(id => this.highlightedSectionIds.add(id));
    }

    this.sectionFills = (cfg.sectionFills && typeof cfg.sectionFills === 'object') ? { ...cfg.sectionFills } : {};

    if (!this.disabledCircleIds) this.disabledCircleIds = new Set();
    this.disabledCircleIds.clear();
    if (Array.isArray(cfg.disabledCircleIds)) {
      cfg.disabledCircleIds.forEach(id => this.disabledCircleIds.add(id));
    }

    if (!this.coloredShapesMap) this.coloredShapesMap = new Map();
    this.coloredShapesMap.clear();
    if (Array.isArray(cfg.coloredShapesMap)) {
      cfg.coloredShapesMap.forEach(([k, v]) => this.coloredShapesMap.set(k, v));
    }

    if (cfg.circleRainbow !== undefined) this.circleRainbow = cfg.circleRainbow;
    if (cfg.ringSpectral !== undefined) this.ringSpectral = cfg.ringSpectral;
    if (cfg.offsetPath !== undefined) this.offsetPath = { ...cfg.offsetPath };
    if (cfg.fullScreenTiling !== undefined) this.fullScreenTiling = cfg.fullScreenTiling;
    if (cfg.showSOHOE !== undefined) this.showSOHOE = cfg.showSOHOE;
    if (cfg.showHexagramEyes !== undefined) this.showHexagramEyes = cfg.showHexagramEyes;
    if (cfg.showGuides !== undefined) this.showGuides = cfg.showGuides;
    if (cfg.showOuterRing !== undefined) this.showOuterRing = cfg.showOuterRing;
    if (cfg.showCenterDots !== undefined) this.showCenterDots = cfg.showCenterDots;
    if (cfg.sectionHighlightMode !== undefined) this.sectionHighlightMode = Boolean(cfg.sectionHighlightMode);
  }
};

// Harmonic Color Palettes for "Color by Layer"
const LayerColors = [
  '#f43f5e', // Layer 0: Ruby / Rose Red
  '#f97316', // Layer 1: Sacral Orange
  '#eab308', // Layer 2: Solar Gold
  '#10b981', // Layer 3: Emerald
  '#06b6d4', // Layer 4: Cyan
  '#6366f1', // Layer 5: Indigo
  '#a855f7', // Layer 6: Violet
  '#ec4899', // Layer 7: Magenta
  '#f8fafc'  // Layer 8: Transcendental White
];

// 12-Stage Spectral Palette: Rings 1 (Red) through 12 (Magenta)
const Spectral12Colors = [
  '#ff0033', // Ring 1: Crimson Red
  '#ff4800', // Ring 2: Red-Orange
  '#ff8800', // Ring 3: Solar Orange
  '#ffc800', // Ring 4: Amber Gold
  '#eaff00', // Ring 5: Radiant Lime
  '#00ff66', // Ring 6: Emerald Green
  '#00ffd5', // Ring 7: Turquoise Cyan
  '#00a6ff', // Ring 8: Azure Blue
  '#0037ff', // Ring 9: Deep Indigo
  '#7300ff', // Ring 10: Royal Purple
  '#b700ff', // Ring 11: Electric Violet
  '#ff00aa'  // Ring 12: Transcendental Magenta
];

/* =========================================================================
   PRESETS CONFIGURATION ENGINE & MANAGER (User-Created Only E-11 / R-A4)
   ========================================================================= */
const PresetsManager = {
  STORAGE_KEY: 'sacred_geometry_custom_presets_v1',
  OVERRIDE_KEY: 'sacred_geometry_builtin_overrides_v1',

  builtinPresets: [],

  customPresets: [],
  builtinOverrides: {},

  init() {
    this.loadFromStorage();
  },

  loadFromStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.customPresets = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // Normalize object-keyed custom presets to array
            this.customPresets = Object.entries(parsed).map(([k, v]) => ({
              id: v.id || v.key || k,
              key: v.key || v.id || k,
              title: v.title || 'Untitled Preset',
              subtitle: v.subtitle || '',
              isBuiltin: false,
              highlightCount: v.highlightCount || ((v.config?.highlightedIds?.length || 0) + Object.keys(v.config?.sectionFills || {}).length + (v.config?.selectedSectionIds?.length || 0)) || 0,
              config: v.config || {}
            }));
          } else {
            this.customPresets = [];
          }
        } else {
          this.customPresets = [];
        }
      } else {
        this.customPresets = [];
      }
    } catch (e) {
      console.warn('Failed to load custom presets from storage:', e);
      this.customPresets = [];
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const overrides = localStorage.getItem(this.OVERRIDE_KEY);
        this.builtinOverrides = overrides ? JSON.parse(overrides) : {};
        if (typeof this.builtinOverrides !== 'object' || this.builtinOverrides === null) {
          this.builtinOverrides = {};
        }
      } else {
        this.builtinOverrides = {};
      }
    } catch (e) {
      this.builtinOverrides = {};
    }
  },

  saveToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.customPresets));
        localStorage.setItem(this.OVERRIDE_KEY, JSON.stringify(this.builtinOverrides));
      }
    } catch (e) {
      console.error('Failed to save presets to storage:', e);
    }
  },

  saveCustomPresets() {
    return this.saveToStorage();
  },

  getAllPresets() {
    const builtins = this.builtinPresets.map(bp => {
      if (this.builtinOverrides[bp.id]) {
        return {
          ...bp,
          ...this.builtinOverrides[bp.id],
          config: { ...bp.config, ...(this.builtinOverrides[bp.id].config || {}) }
        };
      }
      return bp;
    });
    return [...builtins, ...this.customPresets];
  },

  getPreset(id) {
    return this.getAllPresets().find(p => p.id === id || p.key === id);
  },

  addCustomPreset(preset) {
    if (!preset.id) {
      preset.id = preset.key || ('custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    }
    if (!preset.key) {
      preset.key = preset.id;
    }
    preset.isBuiltin = false;
    this.customPresets.push(preset);
    this.saveToStorage();
    this.renderPresetGrid();
    return preset;
  },

  updatePreset(id, updatedFields) {
    const builtinIndex = this.builtinPresets.findIndex(p => p.id === id);
    if (builtinIndex !== -1) {
      this.builtinOverrides[id] = {
        ...(this.builtinOverrides[id] || {}),
        ...updatedFields,
        config: {
          ...(this.builtinPresets[builtinIndex].config),
          ...(this.builtinOverrides[id]?.config || {}),
          ...(updatedFields.config || {})
        }
      };
      this.saveToStorage();
      this.renderPresetGrid();
      return this.getPreset(id);
    }

    const customIndex = this.customPresets.findIndex(p => p.id === id);
    if (customIndex !== -1) {
      this.customPresets[customIndex] = {
        ...this.customPresets[customIndex],
        ...updatedFields,
        config: {
          ...this.customPresets[customIndex].config,
          ...(updatedFields.config || {})
        }
      };
      this.saveToStorage();
      this.renderPresetGrid();
      return this.customPresets[customIndex];
    }
    return null;
  },

  deletePreset(id) {
    const customIndex = this.customPresets.findIndex(p => p.id === id || p.key === id);
    if (customIndex !== -1) {
      this.customPresets.splice(customIndex, 1);
      this.saveToStorage();
      this.renderPresetGrid();
      return true;
    }
    if (this.builtinOverrides[id]) {
      delete this.builtinOverrides[id];
      this.saveToStorage();
      this.renderPresetGrid();
      return true;
    }
    return false;
  },

  resetAllToDefaults() {
    this.customPresets = [];
    this.builtinOverrides = {};
    State.sectionFills = {};
    State.selectedSectionId = null;
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.OVERRIDE_KEY);
    } catch (_) { }
    this.renderPresetGrid();
  },

  captureCurrentStudioConfig() {
    return {
      N: State.N,
      r: State.r,
      boundaryRadius: State.boundaryRadius,
      auraScale: State.auraScale !== undefined ? State.auraScale : 1.95,
      auraExpansionMaxSize: State.auraExpansionMaxSize !== undefined ? State.auraExpansionMaxSize : 20.0,
      auraExpansionSpeed: State.auraExpansionSpeed !== undefined ? State.auraExpansionSpeed : 1.0,
      rainbowWaveSpeed: State.rainbowWaveSpeed !== undefined ? State.rainbowWaveSpeed : 1.0,
      bodyOpacity: State.bodyOpacity !== undefined ? State.bodyOpacity : 1.0,
      auraOpacity: State.auraOpacity !== undefined ? State.auraOpacity : 1.0,
      bodyAuraMix: State.bodyAuraMix,
      viewportMode: State.viewportMode,
      viewStyle: State.viewStyle,
      platonicFilter: State.platonicFilter,
      showAuraFlower: State.showAuraFlower,
      showActualFlower: State.showAuraFlower,
      showBodyCircles: State.showBodyCircles,
      showBaseCircles: State.showBodyCircles,
      showGuides: State.showGuides,
      showOuterRing: State.showOuterRing,
      showBoundaryPetals: State.showBoundaryPetals,
      showCenterDots: State.showCenterDots,
      showIntersections: State.showIntersections,
      showRadialAxes: State.showRadialAxes,
      showMetatronLines: State.showMetatronLines,
      showEyesOfKryst: false,
      sphericalShading: State.sphericalShading,
      fillOpacity: State.fillOpacity,
      colorLife: State.colorLife,
      colorKryst: State.colorKryst,
      colorBody: State.colorBody,
      colorBase: State.colorBody,
      colorTriangle: State.colorTriangle || '#eab308',
      colorGuide: State.colorGuide,
      colorOuter: State.colorOuter,
      colorAxes: State.colorAxes,
      colorIntersection: State.colorIntersection || '#ec4899',
      strokeAura: State.strokeAura,
      strokeFlower: State.strokeAura,
      strokeBody: State.strokeBody,
      strokeBase: State.strokeBody,
      strokeGuide: State.strokeGuide,
      colorByLayer: State.colorByLayer,
      enableGlow: State.enableGlow,
      enablePulse: State.enablePulse,
      dimension: State.dimension,
      fccPlaneFilter: State.fccPlaneFilter,
      fccExpansionMode: State.fccExpansionMode,
      show3DSpheres: State.show3DSpheres,
      show3DTorus: State.show3DTorus,
      show3DShells: State.show3DShells,
      show3DGuides: State.show3DGuides,
      activePattern: State.activePattern || 'kryst',
      highlightedIds: Array.from(State.highlightedIds || []),
      selectedSectionIds: Array.from(State.selectedSectionIds || []),
      highlightedSectionIds: Array.from(State.highlightedSectionIds || []),
      disabledCircleIds: Array.from(State.disabledCircleIds || []),
      coloredShapesMap: Array.from(State.coloredShapesMap ? State.coloredShapesMap.entries() : []),
      sectionFills: { ...(State.sectionFills || {}) },
      sectionHighlightMode: Boolean(State.sectionHighlightMode)
    };
  },

  exportToJson() {
    const data = {
      version: 1,
      app: 'Sacred Geometry Studio',
      exportedAt: new Date().toISOString(),
      customPresets: this.customPresets,
      builtinOverrides: this.builtinOverrides
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `sacred_geometry_presets_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      URL.revokeObjectURL(url);
    }
    if (window.UI?.showToast) {
      window.UI.showToast('Presets exported to JSON.');
    }
  },

  importFromJson(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      let importedCount = 0;
      if (Array.isArray(data)) {
        data.forEach(p => {
          if (p.title && p.config && typeof p.config === 'object') {
            this.addCustomPreset(p);
            importedCount++;
          }
        });
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.customPresets)) {
          data.customPresets.forEach(p => {
            if (p.title && p.config && typeof p.config === 'object') {
              this.addCustomPreset(p);
              importedCount++;
            }
          });
        }
        if (data.builtinOverrides && typeof data.builtinOverrides === 'object') {
          this.builtinOverrides = { ...this.builtinOverrides, ...data.builtinOverrides };
          this.saveToStorage();
        }
      }
      this.renderPresetGrid();
      if (window.UI?.showToast) {
        window.UI.showToast(`Imported ${importedCount} preset(s).`);
      }
      return true;
    } catch (err) {
      console.error('Import error:', err);
      if (window.UI?.showToast) {
        window.UI.showToast('Invalid preset JSON format.', 4000);
      }
      return false;
    }
  },

  renderPresetGrid() {
    if (typeof document === 'undefined') return;
    const grid = document.getElementById('presetGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const allPresets = this.getAllPresets();
    if (allPresets.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 18px 12px; text-align: center; color: var(--text-faint); font-size: 0.78rem; border: 1px dashed var(--bg-panel-border); border-radius: var(--radius-sm);">
          No saved presets yet.<br/>
          Select circles or sections in the view, then click <strong>Save Preset</strong> (e.g. Pyramid, Dove, Shield, Pinecone, Face).
        </div>
      `;
      return;
    }

    const frag = document.createDocumentFragment();

    allPresets.forEach(preset => {
      const isCustom = !preset.isBuiltin;
      const isModifiedBuiltin = preset.isBuiltin && Boolean(this.builtinOverrides[preset.id]);
      const isActive = State.activePreset === preset.id;

      const chip = document.createElement('div');
      chip.className = `preset-chip ${isActive ? 'active' : ''} ${isCustom ? 'custom-preset' : ''}`;
      chip.dataset.preset = preset.id;
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('role', 'button');
      chip.setAttribute('aria-label', `Apply preset: ${preset.title}`);

      chip.innerHTML = `
        <div class="preset-chip-top">
          <div class="preset-chip-title">
            <span class="preset-title-text" title="${preset.title}">${preset.title}</span>
            ${isCustom ? '<span class="preset-badge-custom">Custom</span>' : ''}
            ${isModifiedBuiltin ? '<span class="preset-badge-edited">Edited</span>' : ''}
          </div>
          <div class="preset-chip-actions">
            <button class="preset-action-btn edit-preset-btn" title="Edit Preset" aria-label="Edit preset ${preset.title}" data-preset="${preset.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            ${isCustom ? `
              <button class="preset-action-btn delete-preset-btn" title="Delete Preset" aria-label="Delete preset ${preset.title}" data-preset="${preset.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            ` : (isModifiedBuiltin ? `
              <button class="preset-action-btn revert-preset-btn" title="Revert to Default" aria-label="Revert preset ${preset.title}" data-preset="${preset.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              </button>
            ` : '')}
          </div>
        </div>
        <span class="preset-chip-subtitle" title="${preset.subtitle || ''}">${preset.subtitle || 'Custom Sacred Configuration'}</span>
      `;

      // Main chip click activates preset
      chip.addEventListener('click', (e) => {
        if (e.target.closest('.preset-action-btn')) return;
        if (window.UI?.applyPreset) window.UI.applyPreset(preset.id);
      });

      // Keyboard accessible selection
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target.closest('.preset-action-btn')) return;
          e.preventDefault();
          if (window.UI?.applyPreset) window.UI.applyPreset(preset.id);
        }
      });

      // Edit action
      const editBtn = chip.querySelector('.edit-preset-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          PresetDialog.openEdit(preset.id);
        });
      }

      // Delete action
      const deleteBtn = chip.querySelector('.delete-preset-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Delete custom preset "${preset.title}"?`)) {
            PresetsManager.deletePreset(preset.id);
            if (window.UI?.showToast) window.UI.showToast(`Preset "${preset.title}" deleted.`);
            if (State.activePreset === preset.id) {
              State.activePreset = null;
            }
          }
        });
      }

      // Revert action
      const revertBtn = chip.querySelector('.revert-preset-btn');
      if (revertBtn) {
        revertBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          PresetsManager.deletePreset(preset.id);
          if (window.UI?.showToast) window.UI.showToast(`Preset "${preset.title}" reverted to factory defaults.`);
          if (State.activePreset === preset.id) {
            if (window.UI?.applyPreset) window.UI.applyPreset(preset.id);
          }
        });
      }

      frag.appendChild(chip);
    });

    grid.appendChild(frag);
  }
};

/* =========================================================================
   PRESET DIALOG CONTROLLER (MODAL)
   ========================================================================= */
const PresetDialog = {
  currentEditingId: null,
  _capturedConfigOverride: null,

  openNew() {
    this.currentEditingId = null;
    this._capturedConfigOverride = null;
    const modalTitle = document.getElementById('presetModalTitle');
    const inputName = document.getElementById('presetInputName');
    const inputSubtitle = document.getElementById('presetInputSubtitle');
    const modal = document.getElementById('presetConfigModal');
    const statusText = document.getElementById('labelPresetCaptureStatus');
    if (statusText) statusText.style.display = 'none';

    if (modalTitle) modalTitle.textContent = 'Create New Sacred Preset';
    if (inputName) inputName.value = `Sacred Grid ${PresetsManager.getAllPresets().length + 1}`;
    if (inputSubtitle) inputSubtitle.value = `Custom N=${State.N} (${State.viewportMode})`;

    if (modal) modal.classList.add('open');
  },

  openEdit(presetId) {
    const preset = PresetsManager.getPreset(presetId);
    if (!preset) return;
    this.currentEditingId = presetId;
    this._capturedConfigOverride = null;

    const modalTitle = document.getElementById('presetModalTitle');
    const inputName = document.getElementById('presetInputName');
    const inputSubtitle = document.getElementById('presetInputSubtitle');
    const modal = document.getElementById('presetConfigModal');
    const statusText = document.getElementById('labelPresetCaptureStatus');
    if (statusText) statusText.style.display = 'none';

    if (modalTitle) modalTitle.textContent = `Edit Preset: ${preset.title}`;
    if (inputName) inputName.value = preset.title;
    if (inputSubtitle) inputSubtitle.value = preset.subtitle || '';

    if (modal) modal.classList.add('open');
  },

  captureCurrentCanvas() {
    this._capturedConfigOverride = PresetsManager.captureCurrentStudioConfig();
    const statusText = document.getElementById('labelPresetCaptureStatus');
    if (statusText) statusText.style.display = 'block';
  },

  populateFormFromConfig(cfg) {
    const N = clampNumber(cfg.N, 1, 42, State.N);
    const r = clampNumber(cfg.r, 15, 200, State.r);

    const elN = document.getElementById('presetFormN');
    const elNBadge = document.getElementById('presetFormNBadge');
    const elR = document.getElementById('presetFormR');
    const elRBadge = document.getElementById('presetFormRBadge');
    const elViewport = document.getElementById('presetFormViewport');
    const elViewStyle = document.getElementById('presetFormViewStyle');

    if (elN) elN.value = N;
    if (elNBadge) elNBadge.textContent = `N = ${N}`;
    if (elR) elR.value = r;
    if (elRBadge) elRBadge.textContent = `r = ${r}px`;
    if (elViewport) elViewport.value = cfg.viewportMode || State.viewportMode || 'comparison';
    if (elViewStyle) {
      let vs = cfg.viewStyle || State.viewStyle || 'aura';
      if (vs === 'actual') vs = 'aura';
      if (vs === 'base') vs = 'body';
      elViewStyle.value = vs;
    }

    const showAura = cfg.showAuraFlower ?? cfg.showActualFlower ?? State.showAuraFlower;
    const showBody = cfg.showBodyCircles ?? cfg.showBaseCircles ?? State.showBodyCircles;

    const checkMap = [
      { id: 'presetFormShowAura', val: showAura },
      { id: 'presetFormShowActual', val: showAura },
      { id: 'presetFormShowBody', val: showBody },
      { id: 'presetFormShowBase', val: showBody },
      { id: 'presetFormShowGuides', val: cfg.showGuides ?? State.showGuides },
      { id: 'presetFormShowOuterRing', val: cfg.showOuterRing ?? State.showOuterRing },
      { id: 'presetFormShowBoundaryPetals', val: cfg.showBoundaryPetals ?? State.showBoundaryPetals },
      { id: 'presetFormShowCenterDots', val: cfg.showCenterDots ?? State.showCenterDots },
      { id: 'presetFormShowIntersections', val: cfg.showIntersections ?? State.showIntersections },
      { id: 'presetFormShowRadialAxes', val: cfg.showRadialAxes ?? State.showRadialAxes },
      { id: 'presetFormShowMetatron', val: cfg.showMetatronLines ?? State.showMetatronLines },
      { id: 'presetFormShading', val: cfg.sphericalShading ?? State.sphericalShading }
    ];

    checkMap.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) el.checked = Boolean(item.val);
    });

    const elPlatonic = document.getElementById('presetFormPlatonic');
    if (elPlatonic) elPlatonic.value = cfg.platonicFilter || State.platonicFilter || 'all';
  },

  readConfigFromForm() {
    const elN = document.getElementById('presetFormN');
    const elR = document.getElementById('presetFormR');

    const formViewStyle = document.getElementById('presetFormViewStyle')?.value || 'aura';
    const effectiveViewStyle = formViewStyle === 'actual' ? 'aura' : (formViewStyle === 'base' ? 'body' : formViewStyle);

    const isAuraChecked = Boolean(document.getElementById('presetFormShowAura')?.checked || document.getElementById('presetFormShowActual')?.checked);
    const isBodyChecked = Boolean(document.getElementById('presetFormShowBody')?.checked || document.getElementById('presetFormShowBase')?.checked);

    return {
      N: clampNumber(elN?.value, 1, 42, 2),
      r: clampNumber(elR?.value, 15, 200, 50),
      viewportMode: document.getElementById('presetFormViewport')?.value || 'comparison',
      viewStyle: effectiveViewStyle,
      showAuraFlower: isAuraChecked,
      showActualFlower: isAuraChecked,
      showBodyCircles: isBodyChecked,
      showBaseCircles: isBodyChecked,
      showGuides: Boolean(document.getElementById('presetFormShowGuides')?.checked),
      showOuterRing: Boolean(document.getElementById('presetFormShowOuterRing')?.checked),
      showBoundaryPetals: Boolean(document.getElementById('presetFormShowBoundaryPetals')?.checked),
      showCenterDots: Boolean(document.getElementById('presetFormShowCenterDots')?.checked),
      showIntersections: Boolean(document.getElementById('presetFormShowIntersections')?.checked),
      showRadialAxes: Boolean(document.getElementById('presetFormShowRadialAxes')?.checked),
      showMetatronLines: Boolean(document.getElementById('presetFormShowMetatron')?.checked),
      showEyesOfKryst: false,
      platonicFilter: document.getElementById('presetFormPlatonic')?.value || 'all',
      sphericalShading: Boolean(document.getElementById('presetFormShading')?.checked),
      fillOpacity: State.fillOpacity,
      colorLife: State.colorLife,
      colorKryst: State.colorKryst,
      colorBody: State.colorBody,
      colorBase: State.colorBody,
      colorTriangle: State.colorTriangle || '#eab308',
      colorGuide: State.colorGuide,
      colorOuter: State.colorOuter,
      colorAxes: State.colorAxes,
      colorIntersection: State.colorIntersection || '#ec4899',
      strokeAura: State.strokeAura,
      strokeFlower: State.strokeAura,
      strokeBody: State.strokeBody,
      strokeBase: State.strokeBody,
      strokeGuide: State.strokeGuide,
      auraScale: State.auraScale !== undefined ? State.auraScale : 1.95,
      auraExpansionMaxSize: State.auraExpansionMaxSize !== undefined ? State.auraExpansionMaxSize : 20.0,
      auraExpansionSpeed: State.auraExpansionSpeed !== undefined ? State.auraExpansionSpeed : 1.0,
      rainbowWaveSpeed: State.rainbowWaveSpeed !== undefined ? State.rainbowWaveSpeed : 1.0,
      activePattern: State.activePattern || 'kryst',
      highlightedIds: Array.from(State.highlightedIds || []),
      selectedSectionIds: Array.from(State.selectedSectionIds || []),
      highlightedSectionIds: Array.from(State.highlightedSectionIds || []),
      disabledCircleIds: Array.from(State.disabledCircleIds || []),
      coloredShapesMap: Array.from(State.coloredShapesMap ? State.coloredShapesMap.entries() : []),
      sectionFills: { ...(State.sectionFills || {}) },
      sectionHighlightMode: Boolean(State.sectionHighlightMode)
    };
  },

  save() {
    const inputName = document.getElementById('presetInputName');
    const inputSubtitle = document.getElementById('presetInputSubtitle');
    const title = (inputName?.value || '').trim() || 'Untitled Preset';
    const subtitle = (inputSubtitle?.value || '').trim() || '';
    const preset = this.currentEditingId ? PresetsManager.getPreset(this.currentEditingId) : null;
    const config = this._capturedConfigOverride || (preset ? preset.config : PresetsManager.captureCurrentStudioConfig());
    const highlightCount = (State.highlightedIds?.size || 0) +
      Object.keys(State.sectionFills || {}).length +
      (State.selectedSectionIds?.size || 0);

    if (this.currentEditingId) {
      PresetsManager.updatePreset(this.currentEditingId, {
        title,
        subtitle,
        config,
        highlightCount
      });
      if (window.UI?.showToast) window.UI.showToast(`Preset "${title}" updated.`);
      if (State.activePreset === this.currentEditingId && window.UI?.applyPreset) {
        window.UI.applyPreset(this.currentEditingId);
      }
    } else {
      const newPreset = PresetsManager.addCustomPreset({
        title,
        subtitle,
        config,
        highlightCount
      });
      if (window.UI?.showToast) window.UI.showToast(`Preset "${title}" created.`);
      if (window.UI?.applyPreset) window.UI.applyPreset(newPreset.id);
    }
    this._capturedConfigOverride = null;
    const modal = document.getElementById('presetConfigModal');
    if (modal) modal.classList.remove('open');
  },

  init() {
    if (typeof document === 'undefined') return;
    const closeBtn = document.getElementById('closePresetConfigModalBtn');
    const cancelBtn = document.getElementById('btnCancelPresetConfig');
    const saveBtn = document.getElementById('btnSavePresetConfig');
    const captureBtn = document.getElementById('btnPresetCaptureCurrentCanvas');
    const modal = document.getElementById('presetConfigModal');

    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    if (cancelBtn && modal) cancelBtn.addEventListener('click', () => modal.classList.remove('open'));
    if (saveBtn) saveBtn.addEventListener('click', () => this.save());
    if (captureBtn) captureBtn.addEventListener('click', () => this.captureCurrentCanvas());
  },

  saveCurrentToActive() {
    if (!State.activePreset) return;
    const currentPreset = PresetsManager.getPreset(State.activePreset);
    const name = currentPreset ? currentPreset.title : 'Active Preset';
    PresetsManager.updatePreset(State.activePreset, {
      config: PresetsManager.captureCurrentStudioConfig()
    });
    if (window.UI?.showToast) window.UI.showToast(`Studio settings saved to "${name}".`);
  }
};



/* --- js/renderer.js --- */
/**
 * SVG RENDERING ENGINE (js/renderer.js)
 * High-precision, single-viewport SVG DOM renderer supporting:
 * - Dynamic boundary radius rendering (E-05)
 * - Continuous Body / Aura mix slider (R-B4)
 * - Rainbow gradient circles (R-A2) & 12-ring spectral Red->Magenta (R-A3)
 * - Offset Path visual generator (R-A5)
 * - Painter of Life click-to-fill shapes (R-A8)
 * - Rainbow Ripple meditation visualizer (R-A9)
 * - Star of Heaven on Earth (SOHOE) & Hexagram-12 Eyes overlays (R-A10, R-A11)
 * - Outer boundary circle and interactive circle add/remove
 */


const SVGRenderer = {
  SVG_NS: 'http://www.w3.org/2000/svg',

  /**
   * Fast spatial lookup map of rendered point objects keyed by point ID.
   */
  pointsMap: new Map(),

  /**
   * Helper to create an SVG element with given namespace and attributes.
   * @param {string} tag
   * @param {Record<string, string|number>} [attrs={}]
   * @returns {SVGElement}
   */
  createSvgElement(tag, attrs = {}) {
    const el = document.createElementNS(this.SVG_NS, tag);
    for (const [key, val] of Object.entries(attrs)) {
      el.setAttribute(key, String(val));
    }
    return el;
  },

  /**
   * Initializes SVG Defs (Glow filters, Radial gradients, Rainbow gradient, Clip paths).
   * @param {SVGSVGElement} svg
   * @param {string} idPrefix
   * @param {number} R_bound
   */
  setupDefs(svg, idPrefix, R_bound) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = this.createSvgElement('defs');
      svg.appendChild(defs);
    }
    defs.innerHTML = '';

    const defsFrag = document.createDocumentFragment();

    // 1. Scoped Luminescence Glow Filter
    const filter = this.createSvgElement('filter', {
      id: `${idPrefix}-glow`,
      x: '-50%',
      y: '-50%',
      width: '200%',
      height: '200%'
    });
    const feGaussian = this.createSvgElement('feGaussianBlur', {
      stdDeviation: '3.2',
      result: 'blur'
    });
    const feMerge = this.createSvgElement('feMerge');
    feMerge.appendChild(this.createSvgElement('feMergeNode', { in: 'blur' }));
    feMerge.appendChild(this.createSvgElement('feMergeNode', { in: 'SourceGraphic' }));
    filter.appendChild(feGaussian);
    filter.appendChild(feMerge);
    defsFrag.appendChild(filter);

    // 2. Rainbow Linear Gradient for Circles (R-A2)
    const rainbowGrad = this.createSvgElement('linearGradient', {
      id: `${idPrefix}-rainbow-grad`,
      x1: '0%',
      y1: '0%',
      x2: '100%',
      y2: '100%'
    });
    const rainbowStops = [
      { offset: '0%', color: '#ff0033' },
      { offset: '16%', color: '#ff8800' },
      { offset: '33%', color: '#eaff00' },
      { offset: '50%', color: '#00ff66' },
      { offset: '66%', color: '#00a6ff' },
      { offset: '83%', color: '#7300ff' },
      { offset: '100%', color: '#ff00aa' }
    ];
    rainbowStops.forEach(s => {
      rainbowGrad.appendChild(this.createSvgElement('stop', {
        offset: s.offset,
        'stop-color': s.color,
        'stop-opacity': '1.0'
      }));
    });
    defsFrag.appendChild(rainbowGrad);

    // 3. Scoped Boundary ClipPath for Outer Bounding Circle
    const clipPath = this.createSvgElement('clipPath', {
      id: `${idPrefix}-bound-clip`
    });
    clipPath.appendChild(this.createSvgElement('circle', {
      cx: '0',
      cy: '0',
      r: R_bound
    }));
    defsFrag.appendChild(clipPath);

    // 4. Scoped Radial Sphere Gradient for Egg of Life Shading
    const radGrad = this.createSvgElement('radialGradient', {
      id: `${idPrefix}-sphere-grad`,
      cx: '35%',
      cy: '35%',
      r: '65%'
    });
    radGrad.appendChild(this.createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '0.75' }));
    radGrad.appendChild(this.createSvgElement('stop', { offset: '50%', 'stop-color': State.colorBody || '#3b82f6', 'stop-opacity': '0.35' }));
    radGrad.appendChild(this.createSvgElement('stop', { offset: '100%', 'stop-color': '#030712', 'stop-opacity': '0.75' }));
    defsFrag.appendChild(radGrad);

    defs.appendChild(defsFrag);
  },

  /**
   * Renders the complete geometry onto the target SVG element.
   *
   * @param {string} svgId - DOM ID of SVG element.
   * @param {'life'|'kryst'} [patternType] - Pattern type.
   * @param {{panX: number, panY: number, scale: number}} [transformState]
   */
  render(svgId = 'svgMain', patternType = null, transformState = null) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    const pattern = patternType || State.activePattern || 'kryst';
    const r = State.r || 50;
    const auraScale = (State.auraScale !== undefined && State.auraScale !== null) ? Number(State.auraScale) : 1.95;
    const boundaryRadius = State.boundaryRadius || (2 * State.N * r);
    const transform = transformState || State.transforms[pattern] || { panX: 0, panY: 0, scale: 0.38 };
    const idPrefix = svgId;

    // Fetch geometry by boundary radius and aura scale
    const geomData = (pattern === 'life')
      ? SacredMath.getFlowerOfLifeGeometryByRadius(boundaryRadius, r, State.disabledCircleIds, State.fullScreenTiling, auraScale)
      : SacredMath.getKrystGeometryByRadius(boundaryRadius, r, State.disabledCircleIds, State.fullScreenTiling, auraScale);

    // Save statistics in State for HUD consumption
    State.currentGeometryStats = geomData;
    if (typeof window !== 'undefined' && window.UI?.updatePatternHUD) {
      window.UI.updatePatternHUD(geomData);
    }

    const points = geomData.circles;
    const auraPoints = geomData.auraCircles;
    const R_bound = geomData.outerRingRadius;

    // Setup defs
    this.setupDefs(svg, idPrefix, R_bound);

    // Remove old render group
    const oldMain = svg.querySelector('.sacred-main-group');
    if (oldMain) oldMain.remove();

    const mainGroup = this.createSvgElement('g', {
      class: `sacred-main-group ${State.enablePulse ? 'sacred-pulse' : ''}`
    });
    if (State.gadgetBreathing && typeof window !== 'undefined' && window._currentBreathingScale) {
      mainGroup.setAttribute('transform', `scale(${window._currentBreathingScale.toFixed(4)})`);
    }

    // Populate lookup map
    this.pointsMap.clear();
    points.forEach(pt => this.pointsMap.set(pt.id, pt));

    // -----------------------------------------------------------------------
    // 1. Rainbow Ripple Meditation Visualizer (R-A9)
    // -----------------------------------------------------------------------
    if (State.rainbowRipple) {
      const rippleGroup = this.createSvgElement('g', { class: 'group-rainbow-ripple' });
      const rippleCount = 6;
      for (let i = 0; i < rippleCount; i++) {
        const rippleCircle = this.createSvgElement('circle', {
          cx: '0',
          cy: '0',
          r: String(Math.max(10, (i + 1) * (R_bound / rippleCount))),
          fill: 'none',
          stroke: `url(#${idPrefix}-rainbow-grad)`,
          'stroke-width': '2.5',
          opacity: String(0.7 - i * 0.08),
          filter: `url(#${idPrefix}-glow)`
        });

        // SVG continuous radial pulse animation
        const animR = this.createSvgElement('animate', {
          attributeName: 'r',
          values: `${r};${R_bound * 1.25};${r}`,
          dur: `${6 + i * 1.5}s`,
          repeatCount: 'indefinite'
        });
        const animOp = this.createSvgElement('animate', {
          attributeName: 'opacity',
          values: '0.8;0.1;0.8',
          dur: `${6 + i * 1.5}s`,
          repeatCount: 'indefinite'
        });
        rippleCircle.appendChild(animR);
        rippleCircle.appendChild(animOp);
        rippleGroup.appendChild(rippleCircle);
      }
      mainGroup.appendChild(rippleGroup);
    }

    // -----------------------------------------------------------------------
    // 2. Radial Symmetry Axes
    // -----------------------------------------------------------------------
    if (State.showRadialAxes) {
      const axesGroup = this.createSvgElement('g', { class: 'group-axes' });
      const axesFrag = document.createDocumentFragment();
      const rayLength = R_bound * 1.35;
      const numRays = 12;
      for (let i = 0; i < numRays; i++) {
        const angle = (i * 360 / numRays) * SacredMath.DEG_TO_RAD;
        const x2 = rayLength * Math.cos(angle);
        const y2 = rayLength * Math.sin(angle);
        axesFrag.appendChild(this.createSvgElement('line', {
          x1: '0',
          y1: '0',
          x2: x2.toFixed(2),
          y2: y2.toFixed(2),
          stroke: State.colorAxes,
          'stroke-width': '1',
          'stroke-dasharray': '4 4',
          opacity: '0.4'
        }));
      }
      axesGroup.appendChild(axesFrag);
      mainGroup.appendChild(axesGroup);
    }

    // -----------------------------------------------------------------------
    // 3. Offset Path Echo Visual Generator (R-A5)
    // -----------------------------------------------------------------------
    if (State.offsetPath?.enabled) {
      const offsetGroup = this.createSvgElement('g', { class: 'group-offset-paths' });
      const offsetFrag = document.createDocumentFragment();
      const offsetRings = SacredMath.getOffsetPathRings(
        points,
        State.offsetPath.count || 3,
        State.offsetPath.spacing || 5
      );

      offsetRings.forEach(echo => {
        offsetFrag.appendChild(this.createSvgElement('circle', {
          cx: echo.cx,
          cy: echo.cy,
          r: echo.r,
          fill: 'none',
          stroke: State.colorKryst || '#10b981',
          'stroke-width': '0.9',
          opacity: String(echo.opacity),
          'pointer-events': 'none'
        }));
      });
      offsetGroup.appendChild(offsetFrag);
      mainGroup.appendChild(offsetGroup);
    }

    // -----------------------------------------------------------------------
    // 4. Sacred Overlays: SOHOE Star of Heaven on Earth (R-A11)
    // -----------------------------------------------------------------------
    if (State.showSOHOE) {
      const sohoeGroup = this.createSvgElement('g', { class: 'group-sohoe-overlay' });
      const sohoeFrag = document.createDocumentFragment();
      const stars = SacredMath.getSOHOEPaths(r, R_bound);

      stars.forEach(star => {
        // First upward equilateral triangle
        sohoeFrag.appendChild(this.createSvgElement('path', {
          d: star.d1,
          fill: 'rgba(234, 179, 8, 0.06)',
          stroke: State.colorTriangle || '#eab308',
          'stroke-width': '2.2',
          filter: `url(#${idPrefix}-glow)`,
          class: 'sohoe-star'
        }));
        // Second downward equilateral triangle
        sohoeFrag.appendChild(this.createSvgElement('path', {
          d: star.d2,
          fill: 'rgba(234, 179, 8, 0.06)',
          stroke: State.colorTriangle || '#eab308',
          'stroke-width': '2.2',
          filter: `url(#${idPrefix}-glow)`,
          class: 'sohoe-star'
        }));
      });
      sohoeGroup.appendChild(sohoeFrag);
      mainGroup.appendChild(sohoeGroup);
    }

    // -----------------------------------------------------------------------
    // 5. Sacred Overlays: Hexagram Circumscribed Circles & 12 Eyes (R-A10)
    // -----------------------------------------------------------------------
    if (State.showHexagramEyes) {
      const hexEyeGroup = this.createSvgElement('g', { class: 'group-hexagram-eyes' });
      const hexEyeFrag = document.createDocumentFragment();
      const data = SacredMath.getHexagramEyePaths(r, R_bound);

      // Circles circumscribing hexagrams
      data.hexagramCircumscribedCircles.forEach(circ => {
        hexEyeFrag.appendChild(this.createSvgElement('circle', {
          cx: circ.cx,
          cy: circ.cy,
          r: circ.r,
          fill: 'none',
          stroke: '#06b6d4',
          'stroke-width': '2.0',
          'stroke-dasharray': '5 3',
          filter: `url(#${idPrefix}-glow)`
        }));
      });

      // 12 Surrounding Eye/Pinecone lenses
      data.eyes.forEach(eye => {
        hexEyeFrag.appendChild(this.createSvgElement('path', {
          d: eye.pathD,
          fill: 'rgba(6, 182, 212, 0.18)',
          stroke: '#06b6d4',
          'stroke-width': '1.8',
          filter: `url(#${idPrefix}-glow)`,
          class: 'intersectional-eye'
        }));
      });
      hexEyeGroup.appendChild(hexEyeFrag);
      mainGroup.appendChild(hexEyeGroup);
    }

    // -----------------------------------------------------------------------
    // 6. Base Pattern Shape Guides (Hexagons & Triangles)
    // -----------------------------------------------------------------------
    const effectiveBodyOpacity = State.showBodyCircles ? (State.bodyOpacity !== undefined ? State.bodyOpacity : 1.0) : 0;
    if (State.showGuides && effectiveBodyOpacity > 0.01) {
      const guidesGroup = this.createSvgElement('g', {
        class: 'group-guides',
        opacity: String(effectiveBodyOpacity * 0.85)
      });
      const guidesFrag = document.createDocumentFragment();

      geomData.guides.forEach(g => {
        if (g.vertices && g.vertices.length > 0) {
          const pointsStr = g.vertices.map(v => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');
          guidesFrag.appendChild(this.createSvgElement('polygon', {
            points: pointsStr,
            fill: 'none',
            stroke: State.colorGuide,
            'stroke-width': State.strokeGuide,
            filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none'
          }));
        } else if (g.type === 'hexagon' && g.radius) {
          const pointsStr = [];
          for (let m = 0; m < 6; m++) {
            const angle = m * 60 * SacredMath.DEG_TO_RAD;
            const hx = g.cx + g.radius * Math.cos(angle);
            const hy = g.cy + g.radius * Math.sin(angle);
            pointsStr.push(`${hx.toFixed(2)},${hy.toFixed(2)}`);
          }
          guidesFrag.appendChild(this.createSvgElement('polygon', {
            points: pointsStr.join(' '),
            fill: 'none',
            stroke: State.colorGuide,
            'stroke-width': State.strokeGuide,
            filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none'
          }));
        }
      });
      guidesGroup.appendChild(guidesFrag);
      mainGroup.appendChild(guidesGroup);
    }

    // Helper to compute stroke color based on active settings
    const resolveCircleStroke = (pt, defaultStroke) => {
      if (State.highlightedIds.has(pt.id) || (pt.bodyId && State.highlightedIds.has(pt.bodyId))) return '#ffffff';
      if (State.circleRainbow) return `url(#${idPrefix}-rainbow-grad)`;
      if (State.ringSpectral) {
        const ringIdx = (pt.ring ? pt.ring - 1 : 0);
        return Spectral12Colors[ringIdx % Spectral12Colors.length];
      }
      if (State.colorByLayer) {
        const layerIdx = pt.layer || pt.ring || 0;
        return LayerColors[layerIdx % LayerColors.length];
      }
      return defaultStroke;
    };

    // -----------------------------------------------------------------------
    // 7. Body Circles (Radius r) — Independent Visibility & Opacity
    // -----------------------------------------------------------------------
    if (State.showBodyCircles && effectiveBodyOpacity > 0.01) {
      const bodyGroup = this.createSvgElement('g', {
        class: 'group-body-circles',
        opacity: String(effectiveBodyOpacity)
      });
      const bodyFrag = document.createDocumentFragment();

      points.forEach(pt => {
        const isHighlighted = State.highlightedIds.has(pt.id);
        let baseStroke = (pattern === 'kryst' && pt.role === 'triangle')
          ? (State.colorTriangle || '#eab308')
          : (State.colorBody || '#3b82f6');
        const strokeColor = resolveCircleStroke(pt, baseStroke);

        // Painter of Life fill
        let fillColor = 'none';
        let fillOpacity = '0';
        if (State.coloredShapesMap.has(pt.id)) {
          fillColor = State.coloredShapesMap.get(pt.id);
          fillOpacity = '0.55';
        } else if (State.sphericalShading) {
          fillColor = `url(#${idPrefix}-sphere-grad)`;
          fillOpacity = '1.0';
        } else if (isHighlighted) {
          fillColor = 'rgba(255, 255, 255, 0.15)';
          fillOpacity = '0.2';
        }

        const unitGroup = this.createSvgElement('g', {
          class: 'body-circle-unit',
          'data-circle-id': pt.id
        });

        const circle = this.createSvgElement('circle', {
          cx: pt.x,
          cy: pt.y,
          r,
          fill: fillColor,
          'fill-opacity': fillOpacity,
          stroke: strokeColor,
          'stroke-width': String(State.strokeBody || 1.0),
          opacity: isHighlighted ? '1.0' : '0.9',
          filter: (State.enableGlow || isHighlighted) ? `url(#${idPrefix}-glow)` : 'none',
          class: `circle-node body-circle ${isHighlighted ? 'highlighted-circle' : ''}`,
          'data-circle-id': pt.id,
          'data-pattern': pattern,
          'data-default-stroke': baseStroke,
          style: 'cursor: pointer;'
        });
        unitGroup.appendChild(circle);

        // Generous hover & click target threshold (20px thick transparent stroke hit-area)
        const hitArea = this.createSvgElement('circle', {
          cx: pt.x,
          cy: pt.y,
          r,
          fill: 'none',
          stroke: 'rgba(0, 0, 0, 0.001)',
          'stroke-width': '20',
          class: 'body-circle-hit-area',
          'data-circle-id': pt.id,
          'pointer-events': 'stroke',
          style: 'cursor: pointer;'
        });
        unitGroup.appendChild(hitArea);

        bodyFrag.appendChild(unitGroup);
      });
      bodyGroup.appendChild(bodyFrag);
      mainGroup.appendChild(bodyGroup);
    }

    // -----------------------------------------------------------------------
    // 8. Aura Circles (Radius R = auraScale * r) — Independent Visibility & Opacity
    // -----------------------------------------------------------------------
    const effectiveAuraOpacity = State.showAuraFlower ? (State.auraOpacity !== undefined ? State.auraOpacity : 1.0) : 0;
    if (State.showAuraFlower && effectiveAuraOpacity > 0.01) {
      const auraGroup = this.createSvgElement('g', {
        class: 'group-aura-circles',
        opacity: String(effectiveAuraOpacity)
      });
      const auraFrag = document.createDocumentFragment();
      const defaultAuraColor = (pattern === 'life') ? State.colorLife : State.colorKryst;
      const effectiveAuraR = (State.auraScale !== undefined ? State.auraScale : 1.95) * r;

      auraPoints.forEach(apt => {
        const isHighlighted = State.highlightedIds.has(apt.bodyId);
        const strokeColor = resolveCircleStroke(apt, defaultAuraColor);

        // Painter of Life fill for aura petals
        let fillColor = 'none';
        let fillOpacity = '0';
        if (State.coloredShapesMap.has(apt.id)) {
          fillColor = State.coloredShapesMap.get(apt.id);
          fillOpacity = '0.35';
        } else if (isHighlighted) {
          fillColor = 'rgba(255, 255, 255, 0.12)';
          fillOpacity = '0.18';
        }

        const circle = this.createSvgElement('circle', {
          cx: apt.x,
          cy: apt.y,
          r: (apt.r !== undefined && !Number.isNaN(apt.r)) ? apt.r : effectiveAuraR,
          fill: fillColor,
          'fill-opacity': fillOpacity,
          stroke: strokeColor,
          'stroke-width': String(State.strokeAura || 5.0),
          opacity: isHighlighted ? '1.0' : '0.9',
          filter: (State.enableGlow || isHighlighted) ? `url(#${idPrefix}-glow)` : 'none',
          class: `circle-node aura-circle ${isHighlighted ? 'highlighted-circle' : ''}`,
          'pointer-events': 'none',
          style: 'transition: none !important;',
          'data-circle-id': apt.bodyId,
          'data-aura-id': apt.id,
          'data-pattern': pattern,
          'data-default-stroke': defaultAuraColor
        });

        auraFrag.appendChild(circle);
      });
      auraGroup.appendChild(auraFrag);
      mainGroup.appendChild(auraGroup);
    }

    // -----------------------------------------------------------------------
    // 8a. Lightweight Highlight Overlay Group (Beneath sections so intersection sections remain visible on top)
    // -----------------------------------------------------------------------
    const highlightGroup = this.createSvgElement('g', {
      class: 'group-highlights',
      'pointer-events': 'none'
    });
    mainGroup.appendChild(highlightGroup);

    // -----------------------------------------------------------------------
    // 8b. Individual Aura / Body Intersection Sections (Venn-Diagram Interactive Highlighting)
    // -----------------------------------------------------------------------
    const activeSectionPoints = State.showAuraFlower ? auraPoints : (State.showBodyCircles ? points : auraPoints);
    const effectiveSectionR = State.showAuraFlower ? ((State.auraScale !== undefined ? State.auraScale : 1.95) * r) : r;

    if (activeSectionPoints && activeSectionPoints.length > 1 && effectiveSectionR > 0) {
      const sectionsGroup = this.createSvgElement('g', {
        class: 'group-aura-sections',
        id: `${idPrefix}-aura-sections`
      });
      const sectionsFrag = document.createDocumentFragment();
      const circleCenters = activeSectionPoints.map(c => ({ x: c.x, y: c.y }));
      const sections = SacredMath.computeCircleSections(circleCenters, effectiveSectionR);
      const isHighlightMode = Boolean(State.sectionHighlightMode);

      sections.forEach(sec => {
        const fillColor = (State.sectionFills && State.sectionFills[sec.id]) || null;
        const isColored = Boolean(fillColor);
        const isSelected = Boolean(State.selectedSectionIds && State.selectedSectionIds.has(sec.id));

        // If neither aura nor body is visible, and section is not colored, skip rendering
        if (!State.showAuraFlower && !State.showBodyCircles && !isColored && !isSelected) return;

        const pathEl = this.createSvgElement('path', {
          d: sec.d,
          fill: isColored ? fillColor : 'rgba(255, 255, 255, 0.001)',
          'fill-opacity': isColored ? '0.75' : '0.001',
          stroke: isColored ? 'rgba(255, 255, 255, 0.65)' : (isHighlightMode ? 'rgba(245, 158, 11, 0.22)' : 'none'),
          'stroke-width': isColored ? '1.5' : (isHighlightMode ? '0.9' : '0'),
          class: `aura-intersection-section ${isColored ? 'colored-section' : ''} ${isHighlightMode ? 'highlight-mode-enabled' : ''} ${isSelected ? 'selected-section' : ''}`,
          'data-section-id': sec.id,
          'data-cx': String(sec.cx),
          'data-cy': String(sec.cy),
          'pointer-events': (isHighlightMode || isColored || isSelected) ? 'all' : 'none'
        });

        sectionsFrag.appendChild(pathEl);
      });

      sectionsGroup.appendChild(sectionsFrag);
      mainGroup.appendChild(sectionsGroup);
    }

    // -----------------------------------------------------------------------
    // 9. Outer Boundary Ring (E-08 / E-05)
    // -----------------------------------------------------------------------
    if (!State.fullScreenTiling && State.showOuterRing) {
      const ringGroup = this.createSvgElement('g', { class: 'group-outer-ring' });

      // Primary Outer Ring matching Boundary Slider exactly
      ringGroup.appendChild(this.createSvgElement('circle', {
        cx: '0',
        cy: '0',
        r: R_bound,
        fill: 'none',
        stroke: State.colorOuter || '#f59e0b',
        'stroke-width': '2.2',
        filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none'
      }));

      // Subtle Outer Concentric Halo
      ringGroup.appendChild(this.createSvgElement('circle', {
        cx: '0',
        cy: '0',
        r: R_bound + 6,
        fill: 'none',
        stroke: State.colorOuter || '#f59e0b',
        'stroke-width': '1.2',
        opacity: '0.6'
      }));

      mainGroup.appendChild(ringGroup);
    }

    // -----------------------------------------------------------------------
    // 10. Center Dots
    // -----------------------------------------------------------------------
    if (State.showCenterDots) {
      const centersGroup = this.createSvgElement('g', { class: 'group-center-dots' });
      const centersFrag = document.createDocumentFragment();

      points.forEach(pt => {
        const isHighlighted = State.highlightedIds.has(pt.id);
        const dot = this.createSvgElement('circle', {
          cx: pt.x,
          cy: pt.y,
          r: isHighlighted ? '5' : '3',
          fill: isHighlighted ? '#ffffff' : (State.colorOuter || '#f59e0b'),
          stroke: '#000000',
          'stroke-width': '1',
          class: `center-dot ${isHighlighted ? 'highlighted-dot' : ''}`,
          'data-circle-id': pt.id,
          style: 'cursor: pointer;'
        });
        centersFrag.appendChild(dot);
      });
      centersGroup.appendChild(centersFrag);
      mainGroup.appendChild(centersGroup);
    }

    svg.appendChild(mainGroup);

    this.updateHighlights(svgId);
    this.updateViewBox(svg, transform);
  },

  /**
   * Lightweight Highlight Updater:
   * Toggles CSS classes and attributes without tearing down the SVG tree.
   * @param {string} svgId
   */
  updateHighlights(svgId = 'svgMain') {
    if (typeof document === 'undefined') return;
    const svg = document.getElementById(svgId);
    if (!svg) return;

    const r = State.r || 50;
    const auraScale = (State.auraScale !== undefined && State.auraScale !== null) ? Number(State.auraScale) : 1.95;
    const R = auraScale * r;
    const idPrefix = svgId;

    svg.querySelectorAll('[data-circle-id]').forEach(el => {
      const id = el.dataset.circleId;
      const isHl = State.highlightedIds.has(id);

      if (el.classList.contains('center-dot')) {
        el.classList.toggle('highlighted-dot', isHl);
        el.setAttribute('r', isHl ? '5.5' : '3');
        el.setAttribute('fill', isHl ? '#ffffff' : (State.colorOuter || '#f59e0b'));
      } else if (el.classList.contains('circle-node')) {
        el.classList.toggle('highlighted-circle', isHl);
        const isAura = el.classList.contains('aura-circle');
        const strokeW = isAura ? (State.strokeAura || 5.0) : (State.strokeBody || 1.0);
        if (isHl) {
          el.setAttribute('stroke', '#ffffff');
          el.setAttribute('stroke-width', String(strokeW));
          el.setAttribute('filter', `url(#${idPrefix}-glow)`);
        } else {
          const defaultStroke = el.getAttribute('data-default-stroke') || (isAura ? ((State.activePattern === 'life') ? State.colorLife : State.colorKryst) : (State.colorBody || '#3b82f6'));
          el.setAttribute('stroke', defaultStroke);
          el.setAttribute('stroke-width', String(strokeW));
          el.setAttribute('filter', State.enableGlow ? `url(#${idPrefix}-glow)` : 'none');
        }
      }
    });

    const hlGroup = svg.querySelector('.group-highlights');
    if (hlGroup) {
      hlGroup.innerHTML = '';
      if (State.highlightedIds.size > 0) {
        const hlFrag = document.createDocumentFragment();
        State.highlightedIds.forEach(id => {
          const pt = this.pointsMap.get(id);
          if (!pt) return;

          hlFrag.appendChild(this.createSvgElement('circle', {
            cx: pt.x,
            cy: pt.y,
            r,
            fill: 'none',
            stroke: '#ffffff',
            'stroke-width': String(State.strokeBody || 1.0),
            'stroke-dasharray': '3 3',
            opacity: '0.9',
            'pointer-events': 'none'
          }));

          const showAura = State.showAuraFlower && (State.auraOpacity === undefined || State.auraOpacity > 0.01);
          if (showAura) {
            hlFrag.appendChild(this.createSvgElement('circle', {
              cx: pt.x,
              cy: pt.y,
              r: R,
              fill: 'none',
              stroke: '#ffffff',
              'stroke-width': String(State.strokeAura || 5.0),
              filter: `url(#${idPrefix}-glow)`,
              'pointer-events': 'none'
            }));
          }
        });
        hlGroup.appendChild(hlFrag);
      }
    }
  },

  /**
   * Updates the SVG viewBox centered at (0, 0) with pan and zoom transforms.
   * @param {SVGSVGElement} svg
   * @param {{panX: number, panY: number, scale: number}} transform
   */
  updateViewBox(svg, transform) {
    if (!svg) return;
    const rect = svg.getBoundingClientRect?.();
    const parentRect = svg.parentElement?.getBoundingClientRect?.();
    const width = (rect && rect.width > 0) ? rect.width : (parentRect?.width || svg.clientWidth || 800);
    const height = (rect && rect.height > 0) ? rect.height : (parentRect?.height || svg.clientHeight || 800);
    const scale = transform.scale || 1.0;
    const panX = transform.panX || 0;
    const panY = transform.panY || 0;

    const vbWidth = width / scale;
    const vbHeight = height / scale;
    const minX = -vbWidth / 2 - panX;
    const minY = -vbHeight / 2 - panY;

    svg.setAttribute('viewBox', `${minX} ${minY} ${vbWidth} ${vbHeight}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
};



/* --- js/renderer3d.js --- */
/**
 * 3D WEBGL RENDERING ENGINE (js/renderer3d.js)
 * High-performance Instanced 3D WebGL renderer powered by Three.js.
 * Renders the 3D Volumetric Flower of Kryst jammed crystalline lattice,
 * FCC close-packed spheres, multi-mode color coding, 3D slicing,
 * variable transparency, polyhedral wireframes, and saturation diagnostics.
 */




let THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : (typeof THREE_IMPORT !== 'undefined' ? THREE_IMPORT : null);
let OrbitControls = (typeof window !== 'undefined' && window.OrbitControls) ? window.OrbitControls : (typeof OrbitControls_IMPORT !== 'undefined' ? OrbitControls_IMPORT : null);

/* =========================================================================
   GEOMETRY MERGING HELPERS (Self-contained, zero external dependencies)
   ========================================================================= */

/**
 * Merges multiple BufferGeometries into one.
 * @param {Array<THREE.BufferGeometry>} geos
 * @returns {THREE.BufferGeometry}
 */
function mergeGeometries(geos) {
  let totalPos = 0;
  let totalIdx = 0;
  for (let i = 0; i < geos.length; i++) {
    const g = geos[i];
    if (g.attributes.position) totalPos += g.attributes.position.array.length;
    if (g.index) totalIdx += g.index.array.length;
  }

  const posArr = new Float32Array(totalPos);
  const idxArr = totalIdx > 0 ? new Uint32Array(totalIdx) : null;
  let posOffset = 0;
  let idxOffset = 0;
  let vertexOffset = 0;

  for (let i = 0; i < geos.length; i++) {
    const g = geos[i];
    if (g.attributes.position) {
      posArr.set(g.attributes.position.array, posOffset);
      if (g.index && idxArr) {
        for (let j = 0; j < g.index.array.length; j++) {
          idxArr[idxOffset + j] = g.index.array[j] + vertexOffset;
        }
        idxOffset += g.index.array.length;
      }
      vertexOffset += g.attributes.position.count;
      posOffset += g.attributes.position.array.length;
    }
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  if (idxArr) merged.setIndex(new THREE.BufferAttribute(idxArr, 1));
  merged.computeVertexNormals();
  return merged;
}

/**
 * Creates a merged 3-orthogonal-ring great-circle geometry (XY, XZ, YZ rings).
 * @param {number} r - Base radius
 * @param {number} [tubeR=0.9] - Tube thickness
 * @param {number} [radialSegs=4]
 * @param {number} [tubularSegs=48]
 * @returns {THREE.BufferGeometry}
 */
function create3RingGeometry(r, tubeR = 0.9, radialSegs = 4, tubularSegs = 48) {
  const gXY = new THREE.TorusGeometry(r, tubeR, radialSegs, tubularSegs);
  const gXZ = new THREE.TorusGeometry(r, tubeR, radialSegs, tubularSegs);
  gXZ.rotateX(Math.PI / 2);
  const gYZ = new THREE.TorusGeometry(r, tubeR, radialSegs, tubularSegs);
  gYZ.rotateY(Math.PI / 2);

  const merged = mergeGeometries([gXY, gXZ, gYZ]);
  gXY.dispose();
  gXZ.dispose();
  gYZ.dispose();
  return merged;
}

/* =========================================================================
   VIEWPORT SCENE CLASS (Handles 1 Three.js Canvas/Scene/Camera/Controls)
   ========================================================================= */
class Viewport3D {
  constructor(canvasId, patternKey) {
    this.canvasId = canvasId;
    this.patternKey = patternKey; // 'life' | 'kryst'
    this.canvas = document.getElementById(canvasId);
    this.wrapper = this.canvas ? this.canvas.parentElement : null;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    // Containers & Groups
    this.objectsGroup = null;
    this.capsGroup = null;
    this.highlightGroup = null;

    // Active clipping planes
    this.clipPlanes = [];
    this.materialsList = [];

    // Current cached geometry & instanced meshes
    this.currentGeometry = null;
    this.raycastableMeshes = [];
    this.allInstancedMeshes = [];

    // Hover & selection state
    this.hoveredSphere = null;
    this.selectedSphere = null;

    if (this.canvas) {
      this.initScene();
      this.initEvents();
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(State.colorBg || '#07090e');

    // Camera
    const width = this.wrapper ? this.wrapper.clientWidth || 800 : 800;
    const height = this.wrapper ? this.wrapper.clientHeight || 800 : 800;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 20000);
    this.setCameraPreset('isometric', 800);

    // WebGL Renderer with local clipping enabled
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.localClippingEnabled = true;

    // Controls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 1.1;
    this.controls.panSpeed = 0.8;
    this.controls.screenSpacePanning = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(500, 700, 600);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.4);
    dirLight2.position.set(-500, -400, -300);
    this.scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xeab308, 0.9);
    dirLight3.position.set(0, -600, 300);
    this.scene.add(dirLight3);

    // Subtle orientation circle in XY plane
    const gridCircleGeo = new THREE.BufferGeometry();
    const gridPts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      gridPts.push(new THREE.Vector3(Math.cos(a) * 300, Math.sin(a) * 300, 0));
    }
    gridCircleGeo.setFromPoints(gridPts);
    const gridMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.35 });
    const gridLine = new THREE.Line(gridCircleGeo, gridMat);
    this.scene.add(gridLine);

    // Dynamic Groups
    this.objectsGroup = new THREE.Group();
    this.scene.add(this.objectsGroup);

    this.capsGroup = new THREE.Group();
    this.scene.add(this.capsGroup);

    this.highlightGroup = new THREE.Group();
    this.scene.add(this.highlightGroup);
  }

  initEvents() {
    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkRaycast();
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.mouse.set(-999, -999);
      this.clearHover();
    });

    this.canvas.addEventListener('click', () => {
      if (this.hoveredSphere) {
        this.selectSphere(this.hoveredSphere);
      }
    });
  }

  setCameraPreset(preset, fitDist = null) {
    let dist = fitDist;
    if (!dist) {
      const bound = (this.currentGeometry && this.currentGeometry.boundingRadius) ? this.currentGeometry.boundingRadius : 350;
      dist = Math.max(bound * 2.2, 550);
    }
    if (preset === 'top') {
      this.camera.position.set(0, 0, dist * 1.5);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(0, 0, 0);
      if (this.controls) this.controls.target.set(0, 0, 0);
    } else if (preset === 'front') {
      this.camera.position.set(0, -dist * 1.5, 0);
      this.camera.up.set(0, 0, 1);
      this.camera.lookAt(0, 0, 0);
      if (this.controls) this.controls.target.set(0, 0, 0);
    } else {
      this.camera.position.set(dist * 0.9, -dist * 0.9, dist * 1.1);
      this.camera.up.set(0, 0, 1);
      this.camera.lookAt(0, 0, 0);
      if (this.controls) this.controls.target.set(0, 0, 0);
    }
    if (this.controls) this.controls.update();
  }

  fitCamera() {
    if (!this.currentGeometry || !this.camera || !this.controls) return;
    const bound = Math.max(this.currentGeometry.boundingRadius || 350, 150);
    const aspect = this.camera.aspect || 1;
    const fovRad = (this.camera.fov * Math.PI) / 360;
    const distV = bound / Math.sin(fovRad);
    const distH = bound / (Math.sin(fovRad) * aspect);
    const reqDist = Math.max(distV, distH) * 1.15;

    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    if (dir.lengthSq() < 1e-4) {
      dir.set(0.9, -0.9, 1.1);
    }
    dir.normalize();
    this.controls.target.set(0, 0, 0);
    this.camera.position.copy(dir.multiplyScalar(reqDist));
    this.controls.update();
  }

  resize() {
    if (!this.wrapper || !this.renderer || !this.camera) return;
    const width = this.wrapper.clientWidth;
    const height = this.wrapper.clientHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  /* =========================================================================
     SLICING & CLIPPING PLANES
     ========================================================================= */

  updateZSlice() {
    this.updateClippingPlanes();
  }

  updateClippingPlanes() {
    const bound = (this.currentGeometry && this.currentGeometry.boundingRadius) ? this.currentGeometry.boundingRadius : 350;
    const r = State.r || 50;
    const sliceMode = State.sliceAxisMode || 'z';
    const sliceFrac = (State.sliceOffset !== undefined ? State.sliceOffset : (State.sliceZ !== undefined ? State.sliceZ : 100)) / 100;
    const offset = sliceFrac * bound;
    const isSlab = !!State.sliceSlabMode;
    const thickness = (State.sliceSlabThickness !== undefined ? State.sliceSlabThickness : 3) * r;

    this.clipPlanes = [];

    if (sliceMode !== 'radial') {
      let normal = new THREE.Vector3(0, 0, 1);
      if (sliceMode === 'x') normal.set(1, 0, 0);
      else if (sliceMode === 'y') normal.set(0, 1, 0);
      else if (sliceMode === 'diag') normal.set(1, 1, 1).normalize();

      if (isSlab) {
        // Slab mode: cuts points above offset + W/2 and below offset - W/2
        const planeTop = new THREE.Plane(normal.clone().negate(), offset + thickness / 2);
        const planeBottom = new THREE.Plane(normal.clone(), -(offset - thickness / 2));
        this.clipPlanes.push(planeTop, planeBottom);
      } else {
        // Half-space cut: only clip if fraction < 0.99
        if (sliceFrac < 0.99) {
          const planeCut = new THREE.Plane(normal.clone().negate(), offset);
          this.clipPlanes.push(planeCut);
        }
      }
    }

    // Apply clipping planes to all active materials
    for (let i = 0; i < this.materialsList.length; i++) {
      this.materialsList[i].clippingPlanes = this.clipPlanes;
      this.materialsList[i].needsUpdate = true;
    }

    this.updateRadialShellVisibility();
    this.updateSectionCaps();
  }

  updateRadialShellVisibility() {
    const sliceMode = State.sliceAxisMode || 'z';
    const bound = (this.currentGeometry && this.currentGeometry.boundingRadius) ? this.currentGeometry.boundingRadius : 350;
    const maxK = State.sliceRadialShell || State.N || 2;
    const maxDist = ((State.sliceOffset !== undefined ? State.sliceOffset : 100) / 100) * bound;
    const isRadial = (sliceMode === 'radial');

    const matrix = new THREE.Matrix4();
    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    for (let m = 0; m < this.allInstancedMeshes.length; m++) {
      const mesh = this.allInstancedMeshes[m];
      const spheres = mesh.userData.spheres;
      if (!spheres) continue;

      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];
        const sDist = (s.d !== undefined) ? s.d : Math.hypot(s.x, s.y, s.z);
        const sK = (s.k !== undefined) ? s.k : (s.layer !== undefined ? s.layer : 1);
        if (isRadial && (sK > maxK || sDist > maxDist)) {
          mesh.setMatrixAt(i, zeroMatrix);
        } else {
          const scale = mesh.userData.baseScale || 1.0;
          matrix.makeScale(scale, scale, scale);
          matrix.setPosition(s.x, s.y, s.z);
          mesh.setMatrixAt(i, matrix);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /* =========================================================================
     CROSS-SECTION SOLID CAP FACES GENERATOR
     ========================================================================= */

  updateSectionCaps() {
    if (!this.capsGroup) return;

    // Dispose old caps
    while (this.capsGroup.children.length > 0) {
      const child = this.capsGroup.children[0];
      const rIdx = this.raycastableMeshes.indexOf(child);
      if (rIdx >= 0) this.raycastableMeshes.splice(rIdx, 1);
      if (child.geometry && typeof child.geometry.dispose === 'function') child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
        } else if (typeof child.material.dispose === 'function') {
          child.material.dispose();
        }
      }
      this.capsGroup.remove(child);
    }

    if (!this.currentGeometry || !this.currentGeometry.spheres || this.currentGeometry.spheres.length === 0) return;
    if (State.show3DSpheres === false || State.sphereStyle3D === 'rings') return;

    const sliceMode = State.sliceAxisMode || 'z';
    if (sliceMode === 'radial') return;

    const bound = (this.currentGeometry && this.currentGeometry.boundingRadius) ? this.currentGeometry.boundingRadius : 350;
    const r = State.r || 50;
    const baseRadiusScale = (State.sphereRadiusScale !== undefined ? State.sphereRadiusScale : 1.0) * r;
    const sliceFrac = (State.sliceOffset !== undefined ? State.sliceOffset : (State.sliceZ !== undefined ? State.sliceZ : 100)) / 100;
    const offset = sliceFrac * bound;
    const isSlab = !!State.sliceSlabMode;
    const thickness = (State.sliceSlabThickness !== undefined ? State.sliceSlabThickness : 3) * r;

    // If half-space cut and sliceFrac >= 0.99, nothing is clipped
    if (!isSlab && sliceFrac >= 0.99) return;

    let normal = new THREE.Vector3(0, 0, 1);
    if (sliceMode === 'x') normal.set(1, 0, 0);
    else if (sliceMode === 'y') normal.set(0, 1, 0);
    else if (sliceMode === 'diag') normal.set(1, 1, 1).normalize();

    // Planes configuration
    const planes = [];
    if (isSlab) {
      // Top cut plane at offset + thickness / 2
      planes.push({
        offset: offset + thickness / 2,
        normal: normal.clone(),
        isTop: true
      });
      // Bottom cut plane at offset - thickness / 2
      planes.push({
        offset: offset - thickness / 2,
        normal: normal.clone().negate(),
        isTop: false
      });
    } else {
      // Single half-space cut plane at offset
      planes.push({
        offset: offset,
        normal: normal.clone(),
        isTop: true
      });
    }

    const spheres = this.currentGeometry.spheres;
    const capEntries = [];
    const colorScheme = State.colorCoding3D || 'classic';
    const totalN = State.N || 2;

    for (let pIdx = 0; pIdx < planes.length; pIdx++) {
      const pl = planes[pIdx];
      const plOffset = pl.offset;
      const plNorm = pl.normal;

      for (let sIdx = 0; sIdx < spheres.length; sIdx++) {
        const s = spheres[sIdx];
        const distToCenter = s.x * normal.x + s.y * normal.y + s.z * normal.z;

        const h = pl.isTop ? (distToCenter - plOffset) : (plOffset - distToCenter);

        if (Math.abs(h) < baseRadiusScale) {
          const rCapSq = baseRadiusScale * baseRadiusScale - h * h;
          if (rCapSq <= 0.25) continue;
          const rCap = Math.sqrt(rCapSq);

          const capCenter = new THREE.Vector3(
            s.x + (plOffset - distToCenter) * normal.x,
            s.y + (plOffset - distToCenter) * normal.y,
            s.z + (plOffset - distToCenter) * normal.z
          );

          if (isSlab) {
            const bottomBoundary = offset - thickness / 2 - 1e-2;
            const topBoundary = offset + thickness / 2 + 1e-2;
            const capDist = capCenter.x * normal.x + capCenter.y * normal.y + capCenter.z * normal.z;
            if (capDist < bottomBoundary || capDist > topBoundary) continue;
          }

          const col = this.getColorForSphere(s, colorScheme, totalN);

          capEntries.push({
            pos: capCenter,
            normal: plNorm,
            radius: rCap,
            color: col,
            sphere: s
          });
        }
      }
    }

    if (capEntries.length === 0) return;

    // Create InstancedMesh for solid cross-section faces
    const circleGeo = (typeof THREE.CircleGeometry === 'function')
      ? new THREE.CircleGeometry(1, 64)
      : new THREE.BufferGeometry();
    const maxBound = Math.max(bound, 2000);
    circleGeo.boundingSphere = (typeof THREE.Sphere === 'function')
      ? new THREE.Sphere(new THREE.Vector3(0, 0, 0), maxBound * 5)
      : { center: new THREE.Vector3(0, 0, 0), radius: maxBound * 5 };

    const MatClass = (typeof THREE.MeshPhysicalMaterial === 'function')
      ? THREE.MeshPhysicalMaterial
      : THREE.MeshBasicMaterial;

    const capMat = new MatClass({
      roughness: 0.18,
      metalness: 0.12,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0
    });

    const capsMesh = new THREE.InstancedMesh(circleGeo, capMat, capEntries.length);
    capsMesh.frustumCulled = false;
    capsMesh.renderOrder = 3;
    capsMesh.userData.spheres = capEntries.map(e => e.sphere);

    const m = new THREE.Matrix4();
    const posVec = new THREE.Vector3();
    const scaleVec = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const upZ = new THREE.Vector3(0, 0, 1);

    for (let i = 0; i < capEntries.length; i++) {
      const entry = capEntries[i];
      posVec.copy(entry.pos);
      scaleVec.set(entry.radius, entry.radius, 1);
      if (typeof q.setFromUnitVectors === 'function') {
        q.setFromUnitVectors(upZ, entry.normal);
      }
      if (typeof m.compose === 'function') {
        m.compose(posVec, q, scaleVec);
      } else {
        m.makeTranslation(posVec.x, posVec.y, posVec.z);
      }
      capsMesh.setMatrixAt(i, m);
      capsMesh.setColorAt(i, entry.color);
    }

    capsMesh.instanceMatrix.needsUpdate = true;
    if (capsMesh.instanceColor) capsMesh.instanceColor.needsUpdate = true;

    this.capsGroup.add(capsMesh);
    this.raycastableMeshes.push(capsMesh);
  }

  /* =========================================================================
     MULTI-MODE COLOR CODING HELPER
     ========================================================================= */

  getColorForSphere(s, scheme, totalN) {
    const c = new THREE.Color();
    if (scheme === 'polyhedral') {
      if (s.role === 'center') c.set('#ffffff');
      else if (s.polyhedronType === 'Rhombic Dodecahedron Core' || s.role === 'hex_core') c.set('#2563eb');
      else if (s.polyhedronType === 'Cuboctahedron Cap' || s.role === 'hex_octant') c.set('#06b6d4');
      else if (s.polyhedronType === 'Regular Octahedron (6-Sphere)') c.set('#10b981');
      else if (s.polyhedronType === 'Regular Tetrahedron (4-Sphere)' || s.role === 'tri_tet' || s.role === 'tri_axis') c.set('#f59e0b');
      else c.set('#3b82f6');
    } else if (scheme === 'axis_octant') {
      if (s.octantId === 0) {
        if (s.role === 'center') c.set('#ffffff');
        else if (s.role === 'hex_axis' || s.role === 'hex_core') c.set('#38bdf8');
        else c.set('#facc15');
      } else {
        const octantPalette = [
          '#f43f5e', '#8b5cf6', '#06b6d4', '#10b981',
          '#f97316', '#ec4899', '#eab308', '#3b82f6'
        ];
        c.set(octantPalette[(s.octantId - 1) % 8]);
      }
    } else if (scheme === 'concentric_shell') {
      const frac = Math.min(1.0, Math.max(0.0, ((s.k || s.layer || 1) - 1) / Math.max(1, totalN - 1)));
      const hue = (190 + frac * 210) % 360;
      c.setHSL(hue / 360, 0.9, 0.55);
    } else {
      // Classic Kryst Role (Default)
      if (s.role === 'center') c.set('#ffffff');
      else if (s.role === 'hex_core' || s.role === 'hex_axis' || s.role === 'hex_octant') c.set('#3b82f6');
      else if (s.role === 'tri_axis' || s.role === 'tri_tet') c.set('#eab308');
      else c.set('#38bdf8');
    }
    return c;
  }

  /* =========================================================================
     SCENE GENERATION & RENDERING ENGINE
     ========================================================================= */

  updateSceneData() {
    if (!this.objectsGroup) return;

    // Dispose old meshes and materials
    while (this.objectsGroup.children.length > 0) {
      const child = this.objectsGroup.children[0];
      if (child.geometry && typeof child.geometry.dispose === 'function') child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
        } else if (typeof child.material.dispose === 'function') {
          child.material.dispose();
        }
      }
      this.objectsGroup.remove(child);
    }
    this.clearHighlight();
    this.materialsList = [];
    this.raycastableMeshes = [];
    this.allInstancedMeshes = [];

    const r = State.r || 50;
    const model = State.model3D || 'volumetric_kryst';

    // 1. Obtain Geometry Data
    if (model === 'volumetric_kryst') {
      const effective3DN = Math.max(1, Math.min(State.N, 6));
      if (State.viewportMode === 'superimposed') {
        const lifeGeom = SacredMath3D.getLife3DGeometry(effective3DN, r);
        const krystGeom = SacredMath3D.getKrystGeometry3D(effective3DN, r);
        this.currentGeometry = {
          spheres: [...lifeGeom.spheres.map(s => ({ ...s, pattern: 'life' })), ...krystGeom.spheres.map(s => ({ ...s, pattern: 'kryst' }))],
          guides: [...lifeGeom.guides, ...krystGeom.guides],
          boundingRadius: Math.max(lifeGeom.boundingRadius, krystGeom.boundingRadius)
        };
      } else if (this.patternKey === 'life') {
        this.currentGeometry = SacredMath3D.getLife3DGeometry(effective3DN, r);
      } else {
        this.currentGeometry = SacredMath3D.getKrystGeometry3D(effective3DN, r);
      }
    } else if (model === 'triaxial') {
      const triaxialOpts = {
        infillSteps: State.infillSteps !== undefined ? State.infillSteps : 2,
        infillMode: State.triaxialInfill || 'both',
        showPlaneXY: State.showPlaneXY !== false,
        showPlaneXZ: State.showPlaneXZ !== false,
        showPlaneYZ: State.showPlaneYZ !== false,
        showInfill3D: State.showInfill3D !== false
      };
      if (State.viewportMode === 'superimposed') {
        const lifeGeom = SacredMath3D.getTriAxialGeometry('life', State.N, r, triaxialOpts);
        const krystGeom = SacredMath3D.getTriAxialGeometry('kryst', State.N, r, triaxialOpts);
        this.currentGeometry = {
          spheres: [...lifeGeom.spheres.map(s => ({ ...s, pattern: 'life' })), ...krystGeom.spheres.map(s => ({ ...s, pattern: 'kryst' }))],
          guides: [...lifeGeom.guides, ...krystGeom.guides],
          boundingRadius: Math.max(lifeGeom.boundingRadius, krystGeom.boundingRadius)
        };
      } else {
        this.currentGeometry = SacredMath3D.getTriAxialGeometry(this.patternKey, State.N, r, triaxialOpts);
      }
    } else {
      // FCC close-packing mode
      const effective3DN = Math.max(1, Math.min(State.N, 6));
      if (State.viewportMode === 'superimposed') {
        const lifeGeom = SacredMath3D.getLife3DGeometry(effective3DN, r);
        const krystGeom = SacredMath3D.getKryst3DGeometry(effective3DN, r, { expansionMode: State.fccExpansionMode || 'volumetric' });
        this.currentGeometry = {
          spheres: [...lifeGeom.spheres.map(s => ({ ...s, pattern: 'life' })), ...krystGeom.spheres.map(s => ({ ...s, pattern: 'kryst' }))],
          guides: [...lifeGeom.guides, ...krystGeom.guides],
          boundingRadius: Math.max(lifeGeom.boundingRadius, krystGeom.boundingRadius)
        };
      } else if (this.patternKey === 'life') {
        this.currentGeometry = SacredMath3D.getLife3DGeometry(effective3DN, r);
      } else {
        this.currentGeometry = SacredMath3D.getKryst3DGeometry(effective3DN, r, { expansionMode: State.fccExpansionMode || 'volumetric' });
      }
    }

    const { spheres, guides, boundingRadius } = this.currentGeometry;

    // 2. Setup GPU Instanced Spheres
    if (State.show3DSpheres !== false && spheres.length > 0) {
      const sphereStyle = State.sphereStyle3D || 'solid';
      const colorScheme = State.colorCoding3D || 'classic';
      const baseRadiusScale = (State.sphereRadiusScale !== undefined ? State.sphereRadiusScale : 1.0) * r;
      const isFresnel = !!State.fresnelGhostMode;

      // Group spheres semantically to allow independent opacity matrix controls
      // Ensure EVERY sphere is accounted for (no dropped spheres from undefined octantId)
      const groups = {
        skeletonCores: [],
        skeletonFillers: [],
        octantCores: [],
        octantFillers: [],
        centers: []
      };

      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];
        if (s.role === 'center' || s.role === 'hexagon-center') {
          groups.centers.push(s);
        } else if (s.octantId !== undefined && s.octantId > 0) {
          if (s.role === 'tri_tet' || s.role === 'triangle') {
            groups.octantFillers.push(s);
          } else {
            groups.octantCores.push(s);
          }
        } else {
          // Cartesian planes (octantId === 0) or undefined octantId (FCC Flower of Life / Triaxial)
          if (s.role === 'tri_axis' || s.role === 'tri_tet' || s.role === 'triangle') {
            groups.skeletonFillers.push(s);
          } else {
            groups.skeletonCores.push(s);
          }
        }
      }

      const groupConfigs = [
        { key: 'skeletonCores', list: groups.skeletonCores, opacity: (State.opacityHexCores !== undefined ? State.opacityHexCores : 0.90) * (State.opacitySkeleton !== undefined ? State.opacitySkeleton : 1.0) },
        { key: 'skeletonFillers', list: groups.skeletonFillers, opacity: (State.opacityTetraFillers !== undefined ? State.opacityTetraFillers : 0.85) * (State.opacitySkeleton !== undefined ? State.opacitySkeleton : 1.0) },
        { key: 'octantCores', list: groups.octantCores, opacity: (State.opacityHexCores !== undefined ? State.opacityHexCores : 0.90) * (State.opacityOctantFill !== undefined ? State.opacityOctantFill : 1.0) },
        { key: 'octantFillers', list: groups.octantFillers, opacity: (State.opacityTetraFillers !== undefined ? State.opacityTetraFillers : 0.85) * (State.opacityOctantFill !== undefined ? State.opacityOctantFill : 1.0) },
        { key: 'centers', list: groups.centers, opacity: (State.opacitySkeleton !== undefined ? State.opacitySkeleton : 1.0) }
      ];

      // A. Solid Lit 3D Spheres
      if (sphereStyle === 'solid' || sphereStyle === 'both') {
        const solidGeo = new THREE.SphereGeometry(1, 26, 18);
        const maxBound = Math.max(boundingRadius || 500, 2000);
        solidGeo.boundingSphere = (typeof THREE.Sphere === 'function')
          ? new THREE.Sphere(new THREE.Vector3(0, 0, 0), maxBound * 5)
          : { center: new THREE.Vector3(0, 0, 0), radius: maxBound * 5 };

        for (let g = 0; g < groupConfigs.length; g++) {
          const cfg = groupConfigs[g];
          if (!cfg.list || cfg.list.length === 0) continue;

          const isTrans = cfg.opacity < 0.98 || isFresnel;
          const solidMat = new THREE.MeshPhysicalMaterial({
            roughness: State.sphereRoughness !== undefined ? State.sphereRoughness : 0.15,
            metalness: State.sphereMetalness !== undefined ? State.sphereMetalness : 0.1,
            clearcoat: 0.8,
            clearcoatRoughness: 0.15,
            transparent: isTrans,
            opacity: cfg.opacity,
            depthWrite: true,
            side: THREE.FrontSide
          });

          // Holographic X-Ray / Fresnel Ghost Mode
          if (isFresnel) {
            solidMat.onBeforeCompile = (shader) => {
              shader.uniforms.uFresnelPower = { value: 2.2 };
              shader.uniforms.uBaseAlpha = { value: 0.15 };
              shader.uniforms.uEdgeAlpha = { value: 0.95 };
              shader.fragmentShader = `
                uniform float uFresnelPower;
                uniform float uBaseAlpha;
                uniform float uEdgeAlpha;
              ` + shader.fragmentShader;
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
                #include <dithering_fragment>
                #ifdef USE_NORMAL
                  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(-vViewPosition)), 0.0), uFresnelPower);
                  gl_FragColor.a = mix(uBaseAlpha * gl_FragColor.a, uEdgeAlpha, fresnel);
                  gl_FragColor.rgb += vec3(0.15, 0.35, 0.6) * (fresnel * 0.5);
                #endif
                `
              );
            };
          }

          this.materialsList.push(solidMat);

          const instMesh = new THREE.InstancedMesh(solidGeo, solidMat, cfg.list.length);
          instMesh.frustumCulled = false;
          instMesh.renderOrder = 0;
          instMesh.userData.spheres = cfg.list;
          instMesh.userData.baseScale = baseRadiusScale;

          const matrix = new THREE.Matrix4();
          for (let i = 0; i < cfg.list.length; i++) {
            const s = cfg.list[i];
            matrix.makeScale(baseRadiusScale, baseRadiusScale, baseRadiusScale);
            matrix.setPosition(s.x, s.y, s.z);
            instMesh.setMatrixAt(i, matrix);

            const col = this.getColorForSphere(s, colorScheme, State.N || 2);
            instMesh.setColorAt(i, col);
          }

          instMesh.instanceMatrix.needsUpdate = true;
          if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
          this.objectsGroup.add(instMesh);
          this.raycastableMeshes.push(instMesh);
          this.allInstancedMeshes.push(instMesh);
        }
      }

      // B. 3-Axis Wireframe Ring Spheres (3 orthogonal great circles per sphere)
      if (sphereStyle === 'rings' || sphereStyle === 'both') {
        const ringGeo = create3RingGeometry(r, Math.max(0.8, r * 0.02), 4, 36);
        const maxBound = Math.max(boundingRadius || 500, 2000);
        ringGeo.boundingSphere = (typeof THREE.Sphere === 'function')
          ? new THREE.Sphere(new THREE.Vector3(0, 0, 0), maxBound * 5)
          : { center: new THREE.Vector3(0, 0, 0), radius: maxBound * 5 };

        const ringMat = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: true
        });
        this.materialsList.push(ringMat);

        const ringsMesh = new THREE.InstancedMesh(ringGeo, ringMat, spheres.length);
        ringsMesh.frustumCulled = false;
        ringsMesh.renderOrder = 1;
        ringsMesh.userData.spheres = spheres;
        ringsMesh.userData.baseScale = 1.0;

        const matrix = new THREE.Matrix4();
        for (let i = 0; i < spheres.length; i++) {
          const s = spheres[i];
          matrix.makeTranslation(s.x, s.y, s.z);
          ringsMesh.setMatrixAt(i, matrix);

          const col = this.getColorForSphere(s, colorScheme, State.N || 2);
          ringsMesh.setColorAt(i, col);
        }

        ringsMesh.instanceMatrix.needsUpdate = true;
        if (ringsMesh.instanceColor) ringsMesh.instanceColor.needsUpdate = true;
        this.objectsGroup.add(ringsMesh);
        if (sphereStyle === 'rings') {
          this.raycastableMeshes.push(ringsMesh);
        }
        this.allInstancedMeshes.push(ringsMesh);
      }
    }

    // 3. Overlapping Aura Spheres / Shells (R = 2r)
    if (State.show3DShells && spheres.length > 0) {
      const shellGeo = new THREE.SphereGeometry(2 * r, 22, 16);
      const maxBound = Math.max(boundingRadius || 500, 2000);
      shellGeo.boundingSphere = (typeof THREE.Sphere === 'function')
        ? new THREE.Sphere(new THREE.Vector3(0, 0, 0), maxBound * 5)
        : { center: new THREE.Vector3(0, 0, 0), radius: maxBound * 5 };
      const auraOpacity = State.opacityAura3D !== undefined ? State.opacityAura3D : 0.18;
      const shellMat = new THREE.MeshPhysicalMaterial({
        color: this.patternKey === 'life' ? (State.colorLife || '#ef4444') : (State.colorKryst || '#10b981'),
        transparent: true,
        opacity: auraOpacity,
        depthWrite: false,
        side: THREE.FrontSide,
        roughness: 0.1,
        metalness: 0.1
      });
      this.materialsList.push(shellMat);

      const auraMesh = new THREE.InstancedMesh(shellGeo, shellMat, spheres.length);
      auraMesh.frustumCulled = false;
      auraMesh.renderOrder = 10;
      auraMesh.userData.spheres = spheres;
      auraMesh.userData.baseScale = 1.0;

      const matrix = new THREE.Matrix4();
      for (let i = 0; i < spheres.length; i++) {
        matrix.makeTranslation(spheres[i].x, spheres[i].y, spheres[i].z);
        auraMesh.setMatrixAt(i, matrix);
      }
      auraMesh.instanceMatrix.needsUpdate = true;
      this.objectsGroup.add(auraMesh);
      this.allInstancedMeshes.push(auraMesh);
    }

    // 4. Polyhedral Wireframe Guides
    if (State.show3DGuides && guides && guides.length > 0) {
      const guideOpacity = State.opacityGuides3D !== undefined ? State.opacityGuides3D : 0.70;

      // Group A: Rhombic Dodecahedra & Hexagons (Orange #f97316)
      if (State.showRhombicGuides !== false) {
        const rhombicPositions = [];
        for (let i = 0; i < guides.length; i++) {
          const g = guides[i];
          if (g.type === 'rhombic_core' || g.type === 'hexagon' || g.type === 'hex_cap' || g.plane === 'XY' || g.plane === 'XZ' || g.plane === 'YZ') {
            rhombicPositions.push(g.p1.x, g.p1.y, g.p1.z, g.p2.x, g.p2.y, g.p2.z);
          }
        }
        if (rhombicPositions.length > 0) {
          const rhombicGeo = new THREE.BufferGeometry();
          rhombicGeo.setAttribute('position', new THREE.Float32BufferAttribute(rhombicPositions, 3));
          if (typeof rhombicGeo.computeBoundingSphere === 'function') rhombicGeo.computeBoundingSphere();
          const rhombicMat = new THREE.LineBasicMaterial({
            color: new THREE.Color('#f97316'),
            transparent: true,
            opacity: guideOpacity
          });
          this.materialsList.push(rhombicMat);
          const rhombicSegments = new THREE.LineSegments(rhombicGeo, rhombicMat);
          rhombicSegments.frustumCulled = false;
          rhombicSegments.renderOrder = 2;
          this.objectsGroup.add(rhombicSegments);
        }
      }

      // Group B: 3D Regular Tetrahedra & Octahedra (Golden-Yellow #fbbf24)
      if (State.showTetraGuides !== false) {
        const tetraPositions = [];
        for (let i = 0; i < guides.length; i++) {
          const g = guides[i];
          if (g.type === 'tetrahedron' || g.type === 'octahedron' || g.type === 'strut' || g.type === 'triangle') {
            tetraPositions.push(g.p1.x, g.p1.y, g.p1.z, g.p2.x, g.p2.y, g.p2.z);
          }
        }
        if (tetraPositions.length > 0) {
          const tetraGeo = new THREE.BufferGeometry();
          tetraGeo.setAttribute('position', new THREE.Float32BufferAttribute(tetraPositions, 3));
          if (typeof tetraGeo.computeBoundingSphere === 'function') tetraGeo.computeBoundingSphere();
          const tetraMat = new THREE.LineBasicMaterial({
            color: new THREE.Color('#fbbf24'),
            transparent: true,
            opacity: guideOpacity
          });
          this.materialsList.push(tetraMat);
          const tetraSegments = new THREE.LineSegments(tetraGeo, tetraMat);
          tetraSegments.frustumCulled = false;
          tetraSegments.renderOrder = 2;
          this.objectsGroup.add(tetraSegments);
        }
      }
    }

    // 5. Axial Orthogonal Bounding Rings (XY, XZ, YZ)
    if (State.showAxialRims !== false && boundingRadius > 0) {
      const ringRad = Math.max(10, boundingRadius);
      const ringThick = Math.max(1.2, r * 0.03);
      const ringGeo = new THREE.TorusGeometry(ringRad, ringThick, 6, 96);

      // Ring XY (z = 0) - Electric Cyan
      const matXY = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.45 });
      this.materialsList.push(matXY);
      const meshXY = new THREE.Mesh(ringGeo, matXY);
      meshXY.frustumCulled = false;
      this.objectsGroup.add(meshXY);

      // Ring XZ (y = 0) - Rose / Magenta
      const matXZ = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.45 });
      this.materialsList.push(matXZ);
      const meshXZ = new THREE.Mesh(ringGeo, matXZ);
      meshXZ.rotation.x = Math.PI / 2;
      meshXZ.frustumCulled = false;
      this.objectsGroup.add(meshXZ);

      // Ring YZ (x = 0) - Emerald
      const matYZ = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.45 });
      this.materialsList.push(matYZ);
      const meshYZ = new THREE.Mesh(ringGeo, matYZ);
      meshYZ.rotation.y = Math.PI / 2;
      meshYZ.frustumCulled = false;
      this.objectsGroup.add(meshYZ);
    }

    // 6. Central Zero-Point Marker (Flower of Kryst hollow void indicator)
    if (this.patternKey === 'kryst' || State.viewportMode === 'superimposed') {
      if (State.showZeroPointMarker !== false) {
        const voidGroup = new THREE.Group();

        const voidGeo = new THREE.SphereGeometry(r * 0.45, 16, 12);
        const voidMat = new THREE.MeshBasicMaterial({
          color: 0x06b6d4,
          wireframe: true,
          transparent: true,
          opacity: 0.85
        });
        const voidMesh = new THREE.Mesh(voidGeo, voidMat);
        voidMesh.frustumCulled = false;
        voidGroup.add(voidMesh);

        const coreLight = new THREE.PointLight(0x38bdf8, 2.5, 3 * r);
        voidGroup.add(coreLight);

        this.objectsGroup.add(voidGroup);
      }
    }

    this.updateClippingPlanes();
  }

  /* =========================================================================
     RAYCASTING & INTERACTION INSPECTOR
     ========================================================================= */

  checkRaycast() {
    if (!this.raycastableMeshes || this.raycastableMeshes.length === 0 || !this.camera) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.raycastableMeshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object;
      const instanceId = hit.instanceId;
      if (instanceId !== undefined && mesh.userData && mesh.userData.spheres) {
        const s = mesh.userData.spheres[instanceId];
        if (s) {
          this.hoverSphere(s);
          return;
        }
      }
    }

    this.clearHover();
  }

  hoverSphere(s) {
    if (this.hoveredSphere === s) return;
    this.hoveredSphere = s;

    // Update Geometry Inspector Card HUD
    const inspectPattern = document.getElementById('inspectPattern');
    const inspectLayer = document.getElementById('inspectLayer');
    const inspectDist = document.getElementById('inspectDist') || document.getElementById('inspectRadius');
    const inspectAngle = document.getElementById('inspectAngle');
    const inspectCoords = document.getElementById('inspectCoords');
    const inspectRole = document.getElementById('inspectRole');
    const inspectStatus = document.getElementById('inspectStatus');

    const r = State.r || 50;
    const dVal = s.d !== undefined ? s.d : Math.hypot(s.x, s.y, s.z);

    if (inspectPattern) {
      inspectPattern.textContent = (s.pattern === 'life' || this.patternKey === 'life')
        ? 'Flower of Life (3D FCC)'
        : 'Flower of Kryst (3D Volumetric Jammed Lattice)';
    }

    if (inspectLayer) {
      const octantName = s.octantId === 0
        ? `Cartesian Plane (${s.plane || 'XY'})`
        : `Octant ${s.octantId}`;
      inspectLayer.textContent = `Shell k = ${s.k || s.layer || 1} [${octantName}]`;
    }

    if (inspectDist) {
      inspectDist.textContent = `${dVal.toFixed(1)}px (${(dVal / r).toFixed(2)}r)`;
    }

    if (inspectAngle) {
      const theta = (Math.atan2(s.y, s.x) * (180 / Math.PI)).toFixed(1);
      const polar = (Math.acos(Math.max(-1, Math.min(1, s.z / (dVal || 1)))) * (180 / Math.PI)).toFixed(1);
      inspectAngle.textContent = `θ: ${theta}°, φ: ${polar}°`;
    }

    if (inspectCoords) {
      inspectCoords.textContent = `(${s.x.toFixed(0)}, ${s.y.toFixed(0)}, ${s.z.toFixed(0)})`;
    }

    if (inspectRole) {
      inspectRole.textContent = `${s.polyhedronType || s.role} [${s.role}]`;
    }

    if (inspectStatus) {
      inspectStatus.textContent = 'Inspecting Node';
    }

    this.renderHighlight(s);
  }

  clearHover() {
    if (this.hoveredSphere === null && this.selectedSphere === null) return;
    this.hoveredSphere = null;
    if (this.selectedSphere === null) {
      this.clearHighlight();
    }
  }

  selectSphere(s) {
    this.selectedSphere = s;
    this.renderHighlight(s, true);
  }

  renderHighlight(sphere, isSelected = false) {
    while (this.highlightGroup.children.length > 0) {
      const c = this.highlightGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      this.highlightGroup.remove(c);
    }

    const r = State.r || 50;
    const targetDistSq = (2 * r) * (2 * r);
    const tolSq = (0.08 * r) * (0.08 * r);

    // 1. Primary Highlight Halo
    const haloGeo = new THREE.SphereGeometry(r * 1.05, 24, 18);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.95
    });
    if (this.clipPlanes && this.clipPlanes.length > 0) haloMat.clippingPlanes = this.clipPlanes;
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.frustumCulled = false;
    haloMesh.position.set(sphere.x, sphere.y, sphere.z);
    this.highlightGroup.add(haloMesh);

    // 2. Highlight all mutually tangent neighbor spheres at distance 2r
    if (this.currentGeometry && this.currentGeometry.spheres) {
      const neighbors = [];
      for (let i = 0; i < this.currentGeometry.spheres.length; i++) {
        const other = this.currentGeometry.spheres[i];
        if (other !== sphere) {
          const dSq = (other.x - sphere.x) ** 2 + (other.y - sphere.y) ** 2 + (other.z - sphere.z) ** 2;
          if (Math.abs(dSq - targetDistSq) <= tolSq) {
            neighbors.push(other);
          }
        }
      }

      for (let n = 0; n < neighbors.length; n++) {
        const nb = neighbors[n];
        const nbGeo = new THREE.SphereGeometry(r * 1.02, 16, 12);
        const nbMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: 0.65
        });
        if (this.clipPlanes && this.clipPlanes.length > 0) nbMat.clippingPlanes = this.clipPlanes;
        const nbMesh = new THREE.Mesh(nbGeo, nbMat);
        nbMesh.frustumCulled = false;
        nbMesh.position.set(nb.x, nb.y, nb.z);
        this.highlightGroup.add(nbMesh);
      }
    }
  }

  clearHighlight() {
    while (this.highlightGroup.children.length > 0) {
      const c = this.highlightGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      this.highlightGroup.remove(c);
    }
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    if (this.controls) {
      this.controls.autoRotate = !!State.autoRotate3D;
      this.controls.autoRotateSpeed = 1.5;
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }
}

/* =========================================================================
   RENDERER 3D MANAGER
   ========================================================================= */
const Renderer3D = {
  viewports: {
    life: null,
    kryst: null
  },
  _rafId: null,
  _isSyncingControls: false,
  isInitialized: false,

  init() {
    if (this.isInitialized) return;

    if (typeof window !== 'undefined') {
      if (window.THREE) THREE = window.THREE;
      if (window.OrbitControls) OrbitControls = window.OrbitControls;
    }

    if (!THREE || !THREE.Scene || !OrbitControls) {
      if (typeof ensureThree === 'function') {
        ensureThree().then(ok => {
          if (ok && !this.isInitialized) {
            if (typeof window !== 'undefined') {
              if (window.THREE) THREE = window.THREE;
              if (window.OrbitControls) OrbitControls = window.OrbitControls;
            }
            this._setupViewports();
          }
        });
      }
      return;
    }

    this._setupViewports();
  },

  _setupViewports() {
    if (this.isInitialized) return;
    if (typeof window !== 'undefined') {
      if (window.THREE) THREE = window.THREE;
      if (window.OrbitControls) OrbitControls = window.OrbitControls;
    }
    if (!THREE || !THREE.Scene || !OrbitControls) return;

    this.viewports.life = new Viewport3D('canvasLife3D', 'life');
    this.viewports.kryst = new Viewport3D('canvasKryst3D', 'kryst');

    this.bindSynchronizedControls();
    this.bindResize();

    this.isInitialized = true;
    this.startAnimationLoop();

    if (State.dimension === '3d') {
      this.resizeAll();
      this.renderAll();
      this.fitCameraAll();
    }
  },

  bindSynchronizedControls() {
    const vLife = this.viewports.life;
    const vKryst = this.viewports.kryst;

    if (!vLife || !vKryst || !vLife.controls || !vKryst.controls) return;

    vLife.controls.addEventListener('change', () => {
      if (this._isSyncingControls || !State.syncPanZoom || State.viewportMode !== 'comparison') return;
      this._isSyncingControls = true;
      const rLife = vLife.currentGeometry?.boundingRadius || 300;
      const rKryst = vKryst.currentGeometry?.boundingRadius || 300;
      const ratio = Math.max(0.1, rKryst / rLife);

      const dir = new THREE.Vector3().subVectors(vLife.camera.position, vLife.controls.target);
      const dist = dir.length();
      dir.normalize();

      vKryst.camera.position.copy(vKryst.controls.target).addScaledVector(dir, dist * ratio);
      vKryst.camera.quaternion.copy(vLife.camera.quaternion);
      vKryst.camera.updateProjectionMatrix();
      vKryst.controls.update();
      this._isSyncingControls = false;
    });

    vKryst.controls.addEventListener('change', () => {
      if (this._isSyncingControls || !State.syncPanZoom || State.viewportMode !== 'comparison') return;
      this._isSyncingControls = true;
      const rLife = vLife.currentGeometry?.boundingRadius || 300;
      const rKryst = vKryst.currentGeometry?.boundingRadius || 300;
      const ratio = Math.max(0.1, rLife / rKryst);

      const dir = new THREE.Vector3().subVectors(vKryst.camera.position, vKryst.controls.target);
      const dist = dir.length();
      dir.normalize();

      vLife.camera.position.copy(vLife.controls.target).addScaledVector(dir, dist * ratio);
      vLife.camera.quaternion.copy(vKryst.camera.quaternion);
      vLife.camera.updateProjectionMatrix();
      vLife.controls.update();
      this._isSyncingControls = false;
    });
  },

  bindResize() {
    window.addEventListener('resize', () => {
      if (State.dimension === '3d') {
        this.resizeAll();
      }
    });
  },

  resizeAll() {
    if (this.viewports.life) this.viewports.life.resize();
    if (this.viewports.kryst) this.viewports.kryst.resize();
  },

  startAnimationLoop() {
    if (this._rafId) return;

    const loop = () => {
      this._rafId = requestAnimationFrame(loop);
      if (State.dimension === '3d') {
        if (this.viewports.life && this.viewports.life.controls) {
          this.viewports.life.controls.autoRotate = !!State.autoRotate3D;
          this.viewports.life.controls.update();
        }
        if (this.viewports.kryst && this.viewports.kryst.controls) {
          this.viewports.kryst.controls.autoRotate = !!State.autoRotate3D;
          this.viewports.kryst.controls.update();
        }

        if (State.viewportMode === 'comparison') {
          if (this.viewports.life) this.viewports.life.render();
          if (this.viewports.kryst) this.viewports.kryst.render();
        } else if (State.viewportMode === 'single-life' || State.viewportMode === 'superimposed') {
          if (this.viewports.life) this.viewports.life.render();
        } else if (State.viewportMode === 'single-kryst') {
          if (this.viewports.kryst) this.viewports.kryst.render();
        }
      }
    };
    loop();
  },

  stopAnimationLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  },

  renderAll() {
    if (!this.isInitialized) {
      this.init();
      return;
    }

    this.resizeAll();

    if (State.viewportMode === 'superimposed') {
      if (this.viewports.life) {
        this.viewports.life.updateSceneData();
        this.viewports.life.render();
      }
    } else {
      if (this.viewports.life) {
        this.viewports.life.updateSceneData();
        this.viewports.life.render();
      }
      if (this.viewports.kryst) {
        this.viewports.kryst.updateSceneData();
        this.viewports.kryst.render();
      }
    }

    this.update3DStats();
  },

  updateZSlice() {
    this.updateClippingPlanes();
  },

  updateClippingPlanes() {
    if (this.viewports.life) this.viewports.life.updateClippingPlanes();
    if (this.viewports.kryst) this.viewports.kryst.updateClippingPlanes();
  },

  setCameraPreset(preset) {
    if (this.viewports.life) this.viewports.life.setCameraPreset(preset);
    if (this.viewports.kryst) this.viewports.kryst.setCameraPreset(preset);
  },

  fitCameraAll() {
    if (this.viewports.life) this.viewports.life.fitCamera();
    if (this.viewports.kryst) this.viewports.kryst.fitCamera();
  },

  update3DStats() {
    const badgeLifeCount = document.getElementById('badgeLifeCount');
    const badgeKrystCount = document.getElementById('badgeKrystCount');
    const folCountStat = document.getElementById('folCountStat');
    const fokCountStat = document.getElementById('fokCountStat');
    const sidebarBoundRad = document.getElementById('sidebarBoundRad');

    if (this.viewports.life && this.viewports.life.currentGeometry) {
      const folSpheres = this.viewports.life.currentGeometry.spheres.length;
      if (badgeLifeCount) badgeLifeCount.textContent = `${folSpheres} Spheres`;
      if (folCountStat) folCountStat.textContent = `${folSpheres} Spheres (FCC)`;
    }

    if (this.viewports.kryst && this.viewports.kryst.currentGeometry) {
      const fokSpheres = this.viewports.kryst.currentGeometry.spheres.length;
      if (badgeKrystCount) badgeKrystCount.textContent = `${fokSpheres} Spheres`;
      if (fokCountStat) fokCountStat.textContent = `${fokSpheres} Spheres (Volumetric Kryst)`;
      if (sidebarBoundRad) {
        const bound = this.viewports.kryst.currentGeometry.boundingRadius;
        sidebarBoundRad.textContent = `${Math.round(bound)}px (${(bound / (State.r || 50)).toFixed(1)}r)`;
      }
    }
  },

  /**
   * Automated Saturation Diagnostic
   */
  runSaturationDiagnostic() {
    const targetViewport = (State.viewportMode === 'single-kryst') ? this.viewports.kryst : (this.viewports.kryst || this.viewports.life);
    if (!targetViewport || !targetViewport.currentGeometry) return null;

    const r = State.r || 50;
    const geom = targetViewport.currentGeometry;
    const sat = SacredMath3D.checkSaturation(geom.spheres, geom.boundingRadius, r);

    console.log('=== SACRED GEOMETRY 3D VOLUMETRIC SATURATION REPORT ===');
    console.log(`Total Spheres: ${geom.spheres.length}`);
    console.log(`Total Wireframe Guides: ${geom.guides.length}`);
    console.log(`Bounding Radius: ${geom.boundingRadius}px (${(geom.boundingRadius / r).toFixed(1)}r)`);
    console.log(`Origin Exception: ${sat.originPass ? 'PASS (Origin Empty, dist = ' + sat.minOriginDist.toFixed(1) + 'px)' : 'FAIL'}`);
    console.log(`Pairwise Non-Overlap: ${sat.overlapPass ? 'PASS (Min pairwise = ' + sat.minPairwise.toFixed(1) + 'px >= ' + (2 * r - 0.5).toFixed(1) + 'px)' : 'FAIL'}`);
    console.log(`Void-Saturation Guarantee: ${sat.voidCheckPass ? 'PASS (Max void radius = ' + sat.maxVoidRadius.toFixed(1) + 'px < ' + r + 'px, 100% Jammed)' : 'FAIL'}`);

    const inspectStatus = document.getElementById('inspectStatus');
    if (inspectStatus) {
      inspectStatus.textContent = sat.voidCheckPass ? '100% Jammed' : 'Diagnostic Done';
    }

    if (window.UI && window.UI.showToast) {
      window.UI.showToast(`3D Saturation: ${sat.voidCheckPass ? 'PASS (100% Jammed, Zero Voids)' : 'Checked'}`);
    }

    return sat;
  },

  capturePNG() {
    const targetViewport = (State.viewportMode === 'single-kryst') ? this.viewports.kryst : this.viewports.life;
    if (!targetViewport || !targetViewport.renderer || !targetViewport.renderer.domElement) return null;

    targetViewport.render();
    return targetViewport.renderer.domElement.toDataURL('image/png');
  },

  exportOBJ() {
    const targetViewport = (State.viewportMode === 'single-kryst') ? this.viewports.kryst : this.viewports.life;
    if (!targetViewport || !targetViewport.currentGeometry) return null;

    const { spheres, guides } = targetViewport.currentGeometry;
    let obj = `# Sacred Geometry Studio 3D Model\n# Spheres: ${spheres.length}, Guides: ${guides.length}\no SacredGeometry3D\n\n`;

    for (let i = 0; i < spheres.length; i++) {
      const s = spheres[i];
      obj += `v ${s.x.toFixed(4)} ${s.y.toFixed(4)} ${s.z.toFixed(4)}\n`;
    }

    if (guides && guides.length > 0) {
      obj += `\n# Polyhedral Guides & Lattice Struts\n`;
      const tolSq = (1e-2 * (State.r || 50)) ** 2;
      for (let g = 0; g < guides.length; g++) {
        const strut = guides[g];
        let idx1 = -1, idx2 = -1;
        for (let i = 0; i < spheres.length; i++) {
          const s = spheres[i];
          if ((s.x - strut.p1.x) ** 2 + (s.y - strut.p1.y) ** 2 + (s.z - strut.p1.z) ** 2 < tolSq) idx1 = i + 1;
          if ((s.x - strut.p2.x) ** 2 + (s.y - strut.p2.y) ** 2 + (s.z - strut.p2.z) ** 2 < tolSq) idx2 = i + 1;
          if (idx1 !== -1 && idx2 !== -1) break;
        }
        if (idx1 !== -1 && idx2 !== -1) {
          obj += `l ${idx1} ${idx2}\n`;
        }
      }
    }

    return obj;
  }
};



/* --- js/export.js --- */
/**
 * HIGH-RESOLUTION EXPORTER (SVG & PNG)
 * Standalone SVG and high-DPI PNG export utilities with embedded styles,
 * background geometry, guaranteed object URL revocation, and memory safety.
 */


const Exporter = {
  /**
   * Prepares a self-contained SVG clone with all essential styles, dimensions,
   * background rect, and XML namespaces embedded.
   *
   * @param {SVGSVGElement} svg - Source SVG element.
   * @param {number} [targetWidth] - Explicit export width in pixels.
   * @param {number} [targetHeight] - Explicit export height in pixels.
   * @returns {SVGSVGElement} Standalone exportable SVG element.
   */
  createExportableSVGClone(svg, targetWidth, targetHeight) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const viewBoxAttr = svg.getAttribute('viewBox');
    let vb = { x: -400, y: -400, width: 800, height: 800 };
    if (viewBoxAttr) {
      const parts = viewBoxAttr.split(/[\s,]+/).map(parseFloat);
      if (parts.length === 4 && !parts.some(Number.isNaN)) {
        vb = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
      }
    }

    if (targetWidth && targetHeight) {
      clone.setAttribute('width', String(targetWidth));
      clone.setAttribute('height', String(targetHeight));
    } else {
      if (!clone.getAttribute('width')) clone.setAttribute('width', String(vb.width));
      if (!clone.getAttribute('height')) clone.setAttribute('height', String(vb.height));
    }

    // Strip interactive hit-area helper circles from exported vector clone
    clone.querySelectorAll('.body-circle-hit-area').forEach(el => el.remove());

    // Embed dark cosmic background rect behind all sacred geometry elements
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', String(vb.x));
    bgRect.setAttribute('y', String(vb.y));
    bgRect.setAttribute('width', String(vb.width));
    bgRect.setAttribute('height', String(vb.height));
    bgRect.setAttribute('fill', State.colorBg || '#07090e');
    clone.insertBefore(bgRect, clone.firstChild);

    // Embed standalone styles into SVG defs for independent rendering
    let defs = clone.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      clone.insertBefore(defs, clone.firstChild);
    }

    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
      .circle-node { transition: stroke 0.15s, stroke-width 0.15s, opacity 0.15s; }
      .actual-circle, .aura-circle { pointer-events: none; }
      .center-dot, .intersection-node { cursor: pointer; }
      .flower-section { fill: transparent; stroke: transparent; }
      .flower-section.highlighted-section { fill: rgba(255, 255, 255, 0.45); stroke: #ffffff; stroke-width: 1.5px; }
      .highlighted-circle { stroke: #ffffff !important; }
      .highlighted-dot { fill: #ffffff !important; r: 6px !important; }
      .sacred-pulse { transform-origin: center; animation: sacredBreath 6s ease-in-out infinite; }
      @keyframes sacredBreath {
        0%, 100% { transform: scale(1); opacity: 0.95; }
        50% { transform: scale(1.02); opacity: 1; }
      }
      text { font-family: 'JetBrains Mono', 'Courier New', monospace; }
    `;
    defs.appendChild(styleEl);

    return clone;
  },

  /**
   * Generates and triggers download of a standalone SVG vector file.
   * Guarantees URL revocation in a finally block to prevent memory leaks.
   */
  downloadSVG() {
    const svg = document.getElementById('svgMain')
      || (State.viewportMode === 'single-kryst' ? document.getElementById('svgKryst') : document.getElementById('svgLife'));

    if (!svg) {
      if (window.UI?.showToast) window.UI.showToast('Error: SVG canvas not found', 3000);
      return;
    }

    const exportClone = this.createExportableSVGClone(svg);
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(exportClone);

    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      const patternName = State.activePattern || 'kryst';
      a.download = `sacred_${patternName}_R${Math.round(State.boundaryRadius || 200)}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.UI?.showToast) window.UI.showToast('SVG Vector Export Successful!');
    } finally {
      URL.revokeObjectURL(url);
    }
  },

  /**
   * Generates and triggers download of a high-resolution PNG raster image.
   * If in 3D WebGL mode, directly captures the high-DPI WebGL canvas buffer.
   * If in 2D mode, renders SVG onto an offscreen canvas.
   *
   * @param {number} width - Output image width in pixels (e.g. 2400 or 3840).
   * @param {number} height - Output image height in pixels (e.g. 2400 or 3840).
   */
  downloadPNG(width, height) {
    if (State.dimension === '3d') {
      return this.downloadPNG3D();
    }

    if (window.UI?.showToast) window.UI.showToast(`Rendering high-DPI canvas (${width}×${height})...`);

    const svg = document.getElementById('svgMain')
      || (State.viewportMode === 'single-kryst' ? document.getElementById('svgKryst') : document.getElementById('svgLife'));

    if (!svg) {
      if (window.UI?.showToast) window.UI.showToast('Error: SVG canvas not found', 3000);
      return;
    }

    const exportClone = this.createExportableSVGClone(svg, width, height);
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(exportClone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URLObj = window.URL || window.webkitURL || window;
    const blobURL = URLObj.createObjectURL(svgBlob);

    const cleanup = () => {
      try {
        URLObj.revokeObjectURL(blobURL);
      } catch (_) {}
    };

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context creation failed');
        }

        // Dark background matching studio theme
        ctx.fillStyle = State.colorBg || '#07090e';
        ctx.fillRect(0, 0, width, height);

        // Draw centered graphic
        ctx.drawImage(img, 0, 0, width, height);

        const pngData = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngData;
        a.download = `sacred_geometry_${State.activePreset}_N${State.N}_${width}px.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (window.UI?.showToast) window.UI.showToast('PNG image exported successfully');
      } catch (err) {
        console.error('PNG rasterization error:', err);
        if (window.UI?.showToast) window.UI.showToast('Error generating PNG image', 4000);
      } finally {
        cleanup();
      }
    };

    img.onerror = (err) => {
      console.error('PNG image loading error:', err);
      if (window.UI?.showToast) window.UI.showToast('Error generating PNG image', 4000);
      cleanup();
    };

    img.src = blobURL;
  },

  /**
   * Captures the high-resolution 3D WebGL canvas buffer.
   */
  downloadPNG3D() {
    if (window.Renderer3D) {
      const pngData = window.Renderer3D.capturePNG();
      if (pngData) {
        const a = document.createElement('a');
        a.href = pngData;
        a.download = `sacred_geometry_3D_${State.activePreset}_N${State.N}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (window.UI?.showToast) window.UI.showToast('3D WebGL image exported successfully');
        return;
      }
    }
    if (window.UI?.showToast) window.UI.showToast('Error capturing 3D canvas', 3000);
  },

  /**
   * Exports the active 3D FCC crystal geometry as a 3D Wavefront .OBJ file.
   */
  downloadOBJ() {
    if (window.Renderer3D) {
      const objData = window.Renderer3D.exportOBJ();
      if (objData) {
        const blob = new Blob([objData], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        try {
          const a = document.createElement('a');
          a.href = url;
          a.download = `sacred_geometry_3D_FCC_${State.activePreset}_N${State.N}.obj`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          if (window.UI?.showToast) window.UI.showToast('3D Wavefront .OBJ model exported');
          return;
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    }
  },

  /**
   * Exports the active Flower of Kryst pattern as a programmatic 3D OpenSCAD (.scad) file.
   *
   * @param {number} [targetDiameter=100] - Total outer bounding diameter in millimeters.
   * @param {number} [zDepth=3.0] - Vertical height of the 3D model in millimeters.
   * @param {number} [wallThickness=1.2] - Width of the petal walls in millimeters.
   * @returns {string} Generated OpenSCAD procedural script.
   */
  exportOpenSCAD(targetDiameter = 100, zDepth = 3.0, wallThickness = 1.2) {
    return exportOpenSCAD(targetDiameter, zDepth, wallThickness);
  }
};

let _lastScadDownloadTime = 0;

/**
 * Programmatic OpenSCAD Generator Engine for Sacred Geometry Studio
 * Fetches the active geometry matching the current pattern view, calculates
 * real-world millimeter scale factor, and outputs a parameterized .scad script
 * using overlapping hollow cylinder boolean unions.
 *
 * @param {number} [targetDiameter=100] - Outer bounding diameter in mm.
 * @param {number} [zDepth=3.0] - Extrusion height in mm.
 * @param {number} [wallThickness=1.2] - Petal wall thickness in mm.
 * @returns {string} Procedural OpenSCAD code.
 */
function exportOpenSCAD(targetDiameter = 100, zDepth = 3.0, wallThickness = 1.2) {
  const diameter = Number(targetDiameter) || 100;
  const depth = Number(zDepth) || 3.0;
  const wall = Number(wallThickness) || 1.2;

  // 1. Identify active pattern from current view state
  const pattern = (typeof State !== 'undefined' && State.activePattern) ? State.activePattern : 'kryst';
  const isKryst = pattern !== 'life';
  const patternTitle = isKryst ? 'Flower of Kryst' : 'Flower of Life';
  const filePrefix = isKryst ? 'flower_of_kryst' : 'flower_of_life';

  const r = (typeof State !== 'undefined' && State.r) ? State.r : 50;
  const currentN = (typeof window !== 'undefined' ? (window.AppState?.N ?? window.State?.N) : undefined)
    ?? (typeof State !== 'undefined' ? State?.N : undefined)
    ?? 2;
  const boundaryRadius = (typeof State !== 'undefined' && State.boundaryRadius)
    ? State.boundaryRadius
    : (2 * currentN * r);

  // 2. Retrieve active geometry matching the current view
  // Prefer State.currentGeometryStats if populated and fresh, otherwise window.AppGeometry
  let geom = (typeof State !== 'undefined' && State.currentGeometryStats?.circles?.length > 0)
    ? State.currentGeometryStats
    : ((typeof window !== 'undefined' && window.AppGeometry?.circles?.length > 0) ? window.AppGeometry : null);

  const statsMatch = geom
    && (!geom.pattern || geom.pattern === pattern)
    && (geom.outerRingRadius === undefined || Math.abs(geom.outerRingRadius - boundaryRadius) < 1.0);

  if (!statsMatch) {
    geom = null;
  }

  // If not yet computed or stale, generate dynamically from active State
  if (!geom || !geom.circles || geom.circles.length === 0) {
    const disabledIds = (typeof State !== 'undefined' && State.disabledCircleIds)
      ? State.disabledCircleIds
      : new Set();
    const auraScale = (typeof State !== 'undefined' && State.auraScale !== undefined && State.auraScale !== null)
      ? Number(State.auraScale)
      : 1.95;
    const fullScreen = (typeof State !== 'undefined' && State.fullScreenTiling)
      ? Boolean(State.fullScreenTiling)
      : false;

    if (typeof SacredMath !== 'undefined') {
      if (pattern === 'life' && SacredMath.getFlowerOfLifeGeometryByRadius) {
        geom = SacredMath.getFlowerOfLifeGeometryByRadius(boundaryRadius, r, disabledIds, fullScreen, auraScale);
      } else if (SacredMath.getKrystGeometryByRadius) {
        geom = SacredMath.getKrystGeometryByRadius(boundaryRadius, r, disabledIds, fullScreen, auraScale);
      } else if (SacredMath.getKrystGeometry) {
        geom = SacredMath.getKrystGeometry(currentN, 1.0);
      }
    }
  }

  let circles = (geom && geom.circles) ? [...geom.circles] : [];

  // Filter disabled circles if configured in state
  if (typeof State !== 'undefined' && State.disabledCircleIds && State.disabledCircleIds.size > 0) {
    circles = circles.filter(c => {
      const id = c.id || `fok_${Math.round(c.x * 100)}_${Math.round(c.y * 100)}`;
      const semId = c.semanticId;
      return !State.disabledCircleIds.has(id) && (!semId || !State.disabledCircleIds.has(semId));
    });
  }

  // Base radius: if circles are unit coordinates (r <= 1.05), baseR is normalized.
  const baseR = (circles.length > 0 && circles[0].r && circles[0].r > 0) ? circles[0].r : 1.0;
  const isUnitCoord = baseR <= 1.05;

  // Petal radius: in Flower of Kryst and Flower of Life, petals are governed by auraScale (default ~1.95-2.0r)
  // If user disabled aura in view (showAuraFlower === false) and only body circles are shown, use baseR.
  const showAura = (typeof State === 'undefined' || State.showAuraFlower !== false);
  const auraScale = (typeof State !== 'undefined' && State.auraScale !== undefined && State.auraScale !== null)
    ? Number(State.auraScale)
    : 1.95;

  let R_actual;
  if (isUnitCoord) {
    R_actual = showAura ? (auraScale > 1.2 ? auraScale * baseR : 2.0 * baseR) : baseR;
  } else {
    const auraR = geom?.auraCircles?.[0]?.r;
    R_actual = (showAura && auraR && auraR > 0) ? auraR : (showAura ? auraScale * baseR : baseR);
  }

  // Calculate bounding radius to normalize to target size
  let maxDist = 0;
  circles.forEach(c => {
    const d = Math.hypot(c.x, c.y);
    if (d > maxDist) maxDist = d;
  });
  const rBound = (maxDist > 0) ? (maxDist + R_actual) : R_actual;
  const scale = (diameter / 2) / rBound;

  // Scale the petal radius
  const scaledOuterRadius = R_actual * scale;

  const currentLayers = geom?.maxLayer ?? geom?.currentRing ?? (typeof State !== 'undefined' ? State.N : 2);

  // Build SCAD script
  let scad = `// ${patternTitle} - OpenSCAD Generator
// Layers: ${currentLayers}
// Target Diameter: ${diameter}mm, Depth: ${depth}mm, Wall: ${wall}mm

$fn = 90; // High resolution for smooth curves

module kryst_petal(cx, cy, r_outer, wall, h) {
    translate([cx, cy, 0])
    difference() {
        cylinder(h=h, r=r_outer + wall/2, center=false);
        // Translate Z slightly to ensure clean boolean manifold cuts
        translate([0, 0, -1]) 
            cylinder(h=h+2, r=r_outer - wall/2, center=false);
    }
}

union() {
`;

  // Append each circle call
  circles.forEach(c => {
    const scaledX = (c.x * scale).toFixed(4);
    const scaledY = (c.y * scale).toFixed(4);
    scad += `    kryst_petal(${scaledX}, ${scaledY}, ${scaledOuterRadius.toFixed(4)}, ${wall}, ${depth});\n`;
  });

  scad += `}\n`;

  // Trigger download if running in browser with debouncing
  if (typeof document !== 'undefined' && typeof document.createElement === 'function' && typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
    const now = Date.now();
    if (now - _lastScadDownloadTime < 800) {
      // Debounce duplicate download triggers within 800ms
      return scad;
    }
    _lastScadDownloadTime = now;

    const blob = new Blob([scad], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filePrefix}_N${currentLayers}_${diameter}mm.scad`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          if (link.parentNode) link.parentNode.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (_) {}
      }, 2000);
      if (typeof window !== 'undefined' && window.UI?.showToast) {
        window.UI.showToast(`Exported ${patternTitle} OpenSCAD model (${diameter}mm)`);
      }
    } catch (err) {
      console.error('OpenSCAD download error:', err);
    }
  }

  return scad;
}

if (typeof window !== 'undefined') {
  window.exportOpenSCAD = exportOpenSCAD;
}



/* --- js/interactions.js --- */
/**
 * INTERACTION & UI CONTROLLER (js/interactions.js)
 * Pan/zoom with requestAnimationFrame throttling, delegated SVG hit-testing,
 * dynamic boundary radius controls, continuous Body/Aura mix fader,
 * user-created shape presets, Painter of Life interactive coloring,
 * and narrative modal controllers.
 */




/* =========================================================================
   PAN/ZOOM CONTROLLER (RAF-THROTTLED)
   ========================================================================= */
class PanZoomController {
  constructor(wrapperId, svgId, transformKey = 'kryst') {
    this.wrapper = document.getElementById(wrapperId);
    this.svg = document.getElementById(svgId);
    this.transformKey = transformKey;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.hasMoved = false;
    this.rafPending = false;

    this.initEvents();
  }

  initEvents() {
    if (!this.wrapper || !this.svg) return;

    // Pointer Drag for Pan
    this.wrapper.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // Left click only
      this.isDragging = true;
      this.hasMoved = false;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.activePointerId = e.pointerId;
    });

    this.wrapper.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      if (Math.hypot(dx, dy) > 4) {
        if (!this.hasMoved) {
          this.hasMoved = true;
          try {
            if (this.activePointerId !== null && this.activePointerId !== undefined && this.wrapper.setPointerCapture) {
              this.wrapper.setPointerCapture(this.activePointerId);
            }
          } catch (_) { }
        }
      }
      if (!this.hasMoved) return;

      this.startX = e.clientX;
      this.startY = e.clientY;

      const activeKey = State.activePattern || this.transformKey || 'kryst';
      if (!State.transforms[activeKey]) {
        State.transforms[activeKey] = { panX: 0, panY: 0, scale: 0.38 };
      }
      const transform = State.transforms[activeKey];
      transform.panX += dx / transform.scale;
      transform.panY += dy / transform.scale;

      this.scheduleViewBoxUpdate();
    });

    const stopDrag = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        try {
          const pid = (e && e.pointerId !== undefined) ? e.pointerId : this.activePointerId;
          if (pid !== null && pid !== undefined && this.wrapper.hasPointerCapture && this.wrapper.hasPointerCapture(pid)) {
            this.wrapper.releasePointerCapture(pid);
          }
        } catch (_) { }
        this.activePointerId = null;
      }
    };

    this.wrapper.addEventListener('pointerup', stopDrag);
    this.wrapper.addEventListener('pointercancel', stopDrag);

    // Suppress click on drag end
    this.wrapper.addEventListener('click', (e) => {
      if (this.hasMoved) {
        e.stopPropagation();
        e.preventDefault();
        this.hasMoved = false;
      }
    }, true);

    // Mouse Wheel for Zoom
    this.wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      this.zoom(zoomFactor);
    }, { passive: false });
  }

  scheduleViewBoxUpdate() {
    if (!this.rafPending) {
      this.rafPending = true;
      requestAnimationFrame(() => {
        this.rafPending = false;
        const activeKey = State.activePattern || this.transformKey || 'kryst';
        const transform = State.transforms[activeKey] || { panX: 0, panY: 0, scale: 0.38 };
        SVGRenderer.updateViewBox(this.svg, transform);
      });
    }
  }

  zoom(factor) {
    const activeKey = State.activePattern || this.transformKey || 'kryst';
    if (!State.transforms[activeKey]) {
      State.transforms[activeKey] = { panX: 0, panY: 0, scale: 0.38 };
    }
    const transform = State.transforms[activeKey];
    transform.scale = clampNumber(transform.scale * factor, 0.04, 25.0, 0.38);
    this.scheduleViewBoxUpdate();
  }
}

/* =========================================================================
   ONBOARDING TUTORIAL TOUR CONTROLLER
   ========================================================================= */
const TutorialManager = {
  currentStep: 0,
  _eventsBound: false,
  _isProgrammaticScroll: false,
  _scrollDebounceTimer: null,
  _resizeDebounceTimer: null,
  steps: [
    {
      target: null, // Full screen welcome
      title: 'Welcome to Sacred Studio',
      desc: 'Explore the living mathematics of Flower of Kryst and Flower of Life.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>`
    },
    {
      target: '#patternSwitcher',
      title: 'Pattern Engines',
      desc: 'Switch instantly between Flower of Kryst and Flower of Life.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><circle cx="12" cy="12" r="9"/><polygon points="12 5 19 12 12 19 5 12"/></svg>`
    },
    {
      target: '#viewportContainer',
      title: 'Interactive Canvas',
      desc: 'Drag to pan, scroll to zoom, and click circles or lenses to inspect.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/><path d="m15 15 3 3"/></svg>`
    },
    {
      target: '#sectionGeometry',
      title: 'Radius & Aura Size',
      desc: 'Adjust circle radius and smoothly scale expanded aura petals from 0r to 20r.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><circle cx="12" cy="12" r="10"/><path d="M12 8a4 4 0 1 0 4 4"/></svg>`
    },
    {
      target: '#sectionSacredGadgets',
      title: 'Sacred Gadgets',
      desc: 'Run concurrent animations: Aura Expansion, Rainbow Wave, and Breathing.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
    },
    {
      target: '#presetGrid',
      title: 'Shape Presets',
      desc: 'Save custom highlights and click the pencil icon on any preset to edit.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
    },
    {
      target: '#bottomLayerToolbar',
      title: 'Layer Toolbar',
      desc: 'Blend Body and Aura opacities and toggle intersection highlight mode.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>`
    }
  ],

  start() {
    this.currentStep = 0;
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('tutorialTourOverlay');
    if (!overlay) return;
    overlay.style.display = 'block';
    this.bindEvents();
    this.renderStep();
  },

  close() {
    if (typeof document !== 'undefined') {
      const overlay = document.getElementById('tutorialTourOverlay');
      if (overlay) overlay.style.display = 'none';
      const spotlight = document.getElementById('tutorialSpotlight');
      if (spotlight) spotlight.style.display = 'none';
      const backdrop = document.getElementById('tutorialBackdrop');
      if (backdrop) {
        backdrop.style.clipPath = 'none';
        backdrop.style.webkitClipPath = 'none';
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sacred_geometry_tutorial_completed', 'true');
    }
  },

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.close();
      if (typeof window !== 'undefined' && window.UI?.showToast) {
        window.UI.showToast('Tour completed! Click "Tour" in the top bar to restart anytime.');
      }
    }
  },

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  },

  goTo(index) {
    if (index >= 0 && index < this.steps.length) {
      this.currentStep = index;
      this.renderStep();
    }
  },

  renderStep() {
    if (typeof document === 'undefined') return;
    const step = this.steps[this.currentStep];
    const card = document.getElementById('tutorialCard');
    const spotlight = document.getElementById('tutorialSpotlight');
    const backdrop = document.getElementById('tutorialBackdrop');
    const badge = document.getElementById('tutorialStepBadge');
    const title = document.getElementById('tutorialTitle');
    const desc = document.getElementById('tutorialDesc');
    const iconBox = document.getElementById('tutorialIconBox');
    const nextBtn = document.getElementById('btnTutorialNext');
    const prevBtn = document.getElementById('btnTutorialPrev');
    const dotsContainer = document.getElementById('tutorialDots');

    if (!card) return;

    if (badge) badge.textContent = `Step ${this.currentStep + 1} of ${this.steps.length}`;
    if (title) title.textContent = step.title;
    if (desc) desc.textContent = step.desc;
    if (iconBox) iconBox.innerHTML = step.icon;

    if (prevBtn) {
      prevBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';
    }
    if (nextBtn) {
      nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Get Started' : 'Next';
    }

    // Render Dots
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      this.steps.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.className = `tutorial-dot ${idx === this.currentStep ? 'active' : ''}`;
        dot.title = `Step ${idx + 1}: ${this.steps[idx].title}`;
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.goTo(idx);
        });
        dotsContainer.appendChild(dot);
      });
    }

    // Ensure curtain elements exist inside backdrop
    let curtainTop = document.getElementById('tutorialCurtainTop');
    let curtainBottom = document.getElementById('tutorialCurtainBottom');
    let curtainLeft = document.getElementById('tutorialCurtainLeft');
    let curtainRight = document.getElementById('tutorialCurtainRight');

    if (backdrop) {
      backdrop.style.clipPath = 'none';
      backdrop.style.webkitClipPath = 'none';
      backdrop.style.background = 'transparent';
      backdrop.style.pointerEvents = 'none';
      if (!curtainTop || !curtainBottom || !curtainLeft || !curtainRight) {
        backdrop.innerHTML = `
          <div class="tutorial-curtain tutorial-curtain-top" id="tutorialCurtainTop"></div>
          <div class="tutorial-curtain tutorial-curtain-bottom" id="tutorialCurtainBottom"></div>
          <div class="tutorial-curtain tutorial-curtain-left" id="tutorialCurtainLeft"></div>
          <div class="tutorial-curtain tutorial-curtain-right" id="tutorialCurtainRight"></div>
        `;
        curtainTop = document.getElementById('tutorialCurtainTop');
        curtainBottom = document.getElementById('tutorialCurtainBottom');
        curtainLeft = document.getElementById('tutorialCurtainLeft');
        curtainRight = document.getElementById('tutorialCurtainRight');
      }
    }

    const cardWidth = 420;
    const cardHeight = 220;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    card.style.pointerEvents = 'auto';

    // Position Card & Spotlight
    if (step.target) {
      const targetEl = document.querySelector(step.target);
      if (targetEl) {
        // Ensure sidebar is uncollapsed if target is inside sidebar
        const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
        if (sidebar && sidebar.contains(targetEl) && sidebar.classList.contains('collapsed')) {
          sidebar.classList.remove('collapsed');
        }

        // Ensure parent accordion is open if inside a panel-section
        const parentSection = targetEl.closest('.panel-section');
        if (parentSection && !parentSection.classList.contains('open')) {
          parentSection.classList.add('open');
        }

        // Resolve the entire component element to highlight and de-blur
        let compEl = targetEl;
        if (step.target === '#presetGrid') {
          // Shape Presets step: highlight the entire presets component including toolbar and header
          compEl = targetEl.closest('.presets-section-container') || targetEl.closest('#sectionShapePresets') || targetEl.parentElement || targetEl;
        }

        // Scroll target smoothly into view inside scrollable sidebar
        const sidebarContent = targetEl.closest('.sidebar-content');
        if (sidebarContent && sidebarContent.contains(targetEl)) {
          this._isProgrammaticScroll = true;
          const prevScrollBehavior = sidebarContent.style.scrollBehavior;
          sidebarContent.style.scrollBehavior = 'auto';

          const scrollTarget = (step.target === '#presetGrid') ? compEl : targetEl;
          const contentRect = sidebarContent.getBoundingClientRect();
          const targetRect = scrollTarget.getBoundingClientRect();
          const offsetTop = targetRect.top - contentRect.top + sidebarContent.scrollTop;

          sidebarContent.scrollTop = Math.max(0, offsetTop - 12);
          sidebarContent.style.scrollBehavior = prevScrollBehavior;
          this._isProgrammaticScroll = false;
        }

        // Compute exact bounding coordinates for the whole component being explained
        let compTop, compLeft, compWidth, compHeight;

        if (step.target === '#sectionSacredGadgets') {
          // Sacred Gadgets component: header + live gadgets container (excluding presets below)
          const sectionHeader = targetEl.querySelector('.section-header');
          const gadgetsContainer = targetEl.querySelector('.sacred-gadgets-container');
          if (sectionHeader && gadgetsContainer) {
            const hRect = sectionHeader.getBoundingClientRect();
            const gRect = gadgetsContainer.getBoundingClientRect();
            compTop = hRect.top;
            compLeft = Math.min(hRect.left, gRect.left);
            const compRight = Math.max(hRect.right, gRect.right);
            compWidth = compRight - compLeft;
            compHeight = gRect.bottom - hRect.top;
          } else {
            const rect = targetEl.getBoundingClientRect();
            compTop = rect.top;
            compLeft = rect.left;
            compWidth = rect.width;
            compHeight = rect.height;
          }
        } else {
          const rect = (compEl || targetEl).getBoundingClientRect();
          compTop = rect.top;
          compLeft = rect.left;
          compWidth = rect.width;
          compHeight = rect.height;
        }

        // Padding around spotlight: 0 for full viewport canvas, 6px for UI components
        const pad = (step.target === '#viewportContainer') ? 0 : 6;
        let spotTop = Math.max(0, compTop - pad);
        let spotLeft = Math.max(0, compLeft - pad);
        let spotWidth = Math.min(viewportW - spotLeft, compWidth + pad * 2);
        let spotHeight = Math.min(viewportH - spotTop, compHeight + pad * 2);

        if (spotlight) {
          spotlight.style.display = 'block';
          spotlight.style.top = `${spotTop}px`;
          spotlight.style.left = `${spotLeft}px`;
          spotlight.style.width = `${spotWidth}px`;
          spotlight.style.height = `${spotHeight}px`;
        }

        // Position 4 surrounding curtains: leave the spotlight area 100% uncovered with zero blur
        if (curtainTop && curtainBottom && curtainLeft && curtainRight) {
          curtainTop.style.top = '0px';
          curtainTop.style.left = '0px';
          curtainTop.style.width = '100%';
          curtainTop.style.height = `${Math.max(0, spotTop)}px`;

          const bottomY = spotTop + spotHeight;
          curtainBottom.style.top = `${bottomY}px`;
          curtainBottom.style.left = '0px';
          curtainBottom.style.width = '100%';
          curtainBottom.style.height = `${Math.max(0, viewportH - bottomY)}px`;

          curtainLeft.style.top = `${spotTop}px`;
          curtainLeft.style.left = '0px';
          curtainLeft.style.width = `${Math.max(0, spotLeft)}px`;
          curtainLeft.style.height = `${spotHeight}px`;

          const rightX = spotLeft + spotWidth;
          curtainRight.style.top = `${spotTop}px`;
          curtainRight.style.left = `${rightX}px`;
          curtainRight.style.width = `${Math.max(0, viewportW - rightX)}px`;
          curtainRight.style.height = `${spotHeight}px`;
        }

        card.style.position = 'fixed';
        card.style.width = `${cardWidth}px`;

        let cardTop = 0;
        let cardLeft = 0;

        if (step.target === '#viewportContainer') {
          // Canvas step: Float card cleanly near top-center of the viewport
          cardTop = Math.max(20, spotTop + 24);
          cardLeft = spotLeft + (spotWidth - cardWidth) / 2;
        } else if (step.target === '#bottomLayerToolbar' || spotTop + spotHeight > viewportH - 140) {
          // Bottom toolbar: Place card directly ABOVE target, centered horizontally
          cardTop = Math.max(20, spotTop - cardHeight - 16);
          cardLeft = spotLeft + (spotWidth - cardWidth) / 2;
        } else if (sidebar && sidebar.contains(targetEl)) {
          // Sidebar components (on left side of screen):
          // Place card to the RIGHT of the sidebar in the canvas if room, else above/below
          if (spotLeft + spotWidth + cardWidth + 30 <= viewportW) {
            cardLeft = spotLeft + spotWidth + 20;
            cardTop = Math.max(20, Math.min(viewportH - cardHeight - 20, spotTop));
          } else {
            cardLeft = Math.max(16, (viewportW - cardWidth) / 2);
            cardTop = (spotTop + spotHeight + cardHeight + 20 <= viewportH)
              ? spotTop + spotHeight + 14
              : Math.max(20, spotTop - cardHeight - 14);
          }
        } else if (spotTop < 100) {
          // Header components (e.g. patternSwitcher at top): Place card directly BELOW target
          cardTop = spotTop + spotHeight + 14;
          cardLeft = spotLeft + (spotWidth - cardWidth) / 2;
        } else {
          // Default fallback
          cardTop = spotTop + spotHeight + 14;
          cardLeft = spotLeft + (spotWidth - cardWidth) / 2;
          if (cardTop + cardHeight > viewportH - 20) {
            cardTop = Math.max(20, spotTop - cardHeight - 14);
          }
        }

        // Bounded within screen margins
        cardLeft = Math.max(16, Math.min(viewportW - cardWidth - 16, cardLeft));
        cardTop = Math.max(16, Math.min(viewportH - cardHeight - 16, cardTop));

        card.style.top = `${cardTop}px`;
        card.style.left = `${cardLeft}px`;
        card.style.transform = 'none';
        return;
      }
    }

    // Fallback or centered step (e.g. Welcome modal)
    if (spotlight) spotlight.style.display = 'none';
    if (curtainTop && curtainBottom && curtainLeft && curtainRight) {
      curtainTop.style.top = '0px';
      curtainTop.style.left = '0px';
      curtainTop.style.width = '100%';
      curtainTop.style.height = '100%';

      curtainBottom.style.top = '100%';
      curtainBottom.style.left = '0px';
      curtainBottom.style.width = '100%';
      curtainBottom.style.height = '0px';

      curtainLeft.style.top = '0px';
      curtainLeft.style.left = '0px';
      curtainLeft.style.width = '0px';
      curtainLeft.style.height = '0px';

      curtainRight.style.top = '0px';
      curtainRight.style.left = '100%';
      curtainRight.style.width = '0px';
      curtainRight.style.height = '0px';
    }

    card.style.position = 'fixed';
    card.style.width = '420px';
    card.style.top = '50%';
    card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%)';
  },

  bindEvents() {
    if (typeof document === 'undefined') return;
    if (this._eventsBound) return;
    this._eventsBound = true;

    document.getElementById('btnTutorialNext')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.next();
    });
    document.getElementById('btnTutorialPrev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.prev();
    });
    document.getElementById('btnTutorialSkip')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.close();
    });
    document.getElementById('btnTutorialClose')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.close();
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      const overlay = document.getElementById('tutorialTourOverlay');
      if (!overlay || overlay.style.display === 'none') return;

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        this.next();
      } else if (e.key === 'ArrowLeft') {
        this.prev();
      } else if (e.key === 'Escape') {
        this.close();
      }
    });

    // Smooth reposition on window resize or sidebar scroll (debounced to avoid jitter)
    window.addEventListener('resize', () => {
      clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = setTimeout(() => {
        const overlay = document.getElementById('tutorialTourOverlay');
        if (overlay && overlay.style.display !== 'none') {
          this.renderStep();
        }
      }, 50);
    });

    document.querySelector('.sidebar-content')?.addEventListener('scroll', () => {
      if (this._isProgrammaticScroll) return;
      clearTimeout(this._scrollDebounceTimer);
      this._scrollDebounceTimer = setTimeout(() => {
        const overlay = document.getElementById('tutorialTourOverlay');
        if (overlay && overlay.style.display !== 'none') {
          this.renderStep();
        }
      }, 50);
    });
  }
};

/* =========================================================================
   UI CONTROLLER
   ========================================================================= */
const UI = {
  _toastTimer: null,
  activeRingNoteIndex: 1,

  init() {
    PresetsManager.init();
    PresetDialog.init();
    this.setDimension(State.dimension || '2d');
    this.initSliderFills();
    this.bindAccordions();
    this.bindDimensionTabs();
    this.bindPatternSwitcher();
    this.bindBoundaryControls();
    this.bindRemoveCirclesPopup();
    this.bindFaderBar();
    this.bindSliders();
    this.bindToggles();
    this.bind3DControls();
    this.bindColorPickers();
    this.bindSectionColorPicker();
    this.bindPainterControls();
    this.bindSacredGadgets();
    this.bindPresets();
    this.bindFloatingControls();
    this.bindModals();
    this.bindKeyboardShortcuts();
    this.initSvgEventDelegation();
    this.renderCustomPresets();
    this.updateSidebarStats();
    this.updateAllRangeSliderFills();
    this.initTutorial();
  },

  initSliderFills() {
    if (typeof document === 'undefined') return;
    this.updateAllRangeSliderFills();

    document.addEventListener('input', (e) => {
      if (e.target && e.target.type === 'range') {
        this.updateRangeSliderFill(e.target);
      }
    });
  },

  updateRangeSliderFill(slider) {
    if (!slider || slider.type !== 'range') return;
    const min = parseFloat(slider.min) !== undefined && !isNaN(parseFloat(slider.min)) ? parseFloat(slider.min) : 0;
    const max = parseFloat(slider.max) !== undefined && !isNaN(parseFloat(slider.max)) ? parseFloat(slider.max) : 100;
    const val = parseFloat(slider.value) !== undefined && !isNaN(parseFloat(slider.value)) ? parseFloat(slider.value) : min;
    const range = max - min;
    const pct = range > 0 ? Math.max(0, Math.min(100, ((val - min) / range) * 100)) : 0;
    slider.style.setProperty('--fill-pct', `${pct}%`);
  },

  updateAllRangeSliderFills() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      this.updateRangeSliderFill(slider);
    });
  },

  initTutorial() {
    const btnTour = document.getElementById('btnStartTutorial');
    if (btnTour) {
      btnTour.addEventListener('click', () => {
        TutorialManager.start();
      });
    }

    // Auto-launch on first startup
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('sacred_geometry_tutorial_completed')) {
      setTimeout(() => {
        TutorialManager.start();
      }, 750);
    }
  },

  openEditPreset(id) {
    if (typeof PresetDialog !== 'undefined' && PresetDialog.openEdit) {
      PresetDialog.openEdit(id);
    }
  },

  /**
   * Delegated Event Listeners on the main SVG Viewport:
   * Supports:
   * - Painter of Life (R-A8): Click circle to paint with selected swatch.
   * - Shape Presets (R-A4): Shift+Click circle to toggle selection highlight.
   * - Boundary Removal (E-05): Standard click toggles circle add/remove from geometry.
   * - Background click: Clears selection highlights.
   */
  initSvgEventDelegation() {
    const svgIds = ['svgMain', 'svgKryst', 'svgLife'];
    svgIds.forEach(id => {
      const svg = document.getElementById(id);
      if (!svg) return;

      // Delegated click
      svg.addEventListener('click', (e) => {
        // Mode A: Intersection Highlight Mode is Active
        if (State.sectionHighlightMode) {
          const sectionTarget = e.target.closest('[data-section-id]');
          if (sectionTarget) {
            e.stopPropagation();
            const sectionId = sectionTarget.dataset.sectionId;
            this.toggleSectionSelection(sectionId);
            return;
          }

          // In highlight mode, clicking empty canvas closes the color popup & clears section selection
          this.closeSectionColorPicker();
          return;
        }

        // Mode B: Clicking on an already colored section when mode is off allows editing color
        const coloredSectionTarget = e.target.closest('.aura-intersection-section.colored-section');
        if (coloredSectionTarget) {
          e.stopPropagation();
          const sectionId = coloredSectionTarget.dataset.sectionId;
          this.toggleSectionSelection(sectionId, true);
          return;
        }

        const target = e.target.closest('[data-circle-id]');

        // Mode C: Standard circle or center dot click (only when NOT in section highlight mode)
        if (target) {
          e.stopPropagation();
          const circleId = target.dataset.circleId;

          // Mode C1: Painter of Life Mode
          if (State.painterMode) {
            const currentPaint = State.coloredShapesMap.get(circleId);
            if (currentPaint === State.painterColor) {
              State.coloredShapesMap.delete(circleId);
            } else {
              State.coloredShapesMap.set(circleId, State.painterColor);
            }
            App.renderAll();
            return;
          }

          // Mode C2: Clicking a circle highlights / unhighlights it
          if (State.highlightedIds.has(circleId)) {
            State.highlightedIds.delete(circleId);
          } else {
            State.highlightedIds.add(circleId);
          }
          const svgIds = ['svgMain', 'svgKryst', 'svgLife'];
          svgIds.forEach(sid => {
            if (typeof SVGRenderer !== 'undefined' && SVGRenderer.updateHighlights) {
              SVGRenderer.updateHighlights(sid);
            }
          });
          this.updateSidebarStats();
          if (State.highlightedIds.size > 0) {
            this.showRemoveCirclesPopup(e.clientX, e.clientY);
          } else {
            this.hideRemoveCirclesPopup();
          }
          return;
        }

        // 3. Click on empty SVG background -> clear highlights & close popups
        this.closeSectionColorPicker();
        this.hideRemoveCirclesPopup();
        if (State.highlightedIds.size > 0) {
          State.highlightedIds.clear();
          SVGRenderer.updateHighlights(svg.id);
          this.updateSidebarStats();
        }
      });
    });

    // Also delegate on wrappers as safe fallback
    const wrapperIds = ['svgWrapperMain', 'svgWrapperKryst', 'svgWrapperLife'];
    wrapperIds.forEach(wid => {
      const wrapper = document.getElementById(wid);
      if (!wrapper) return;
      wrapper.addEventListener('click', (e) => {
        if (!State.sectionHighlightMode) return;
        const sectionTarget = e.target.closest('[data-section-id]');
        if (sectionTarget) {
          e.stopPropagation();
          const sectionId = sectionTarget.dataset.sectionId;
          this.toggleSectionSelection(sectionId);
        }
      });
    });
  },

  toggleSectionHighlightMode() {
    State.sectionHighlightMode = !State.sectionHighlightMode;
    document.body.classList.toggle('section-highlight-mode', State.sectionHighlightMode);

    const btn = document.getElementById('toggleSectionHighlightBtn');
    if (btn) btn.classList.toggle('active', State.sectionHighlightMode);

    const btnBottom = document.getElementById('btnBottomHighlightMode');
    if (btnBottom) btnBottom.classList.toggle('active', State.sectionHighlightMode);

    if (!State.sectionHighlightMode) {
      this.closeSectionColorPicker();
    } else {
      this.openSectionColorPicker();
    }

    this.showToast(State.sectionHighlightMode
      ? 'Intersection Highlight Mode: ON — Click any intersection section to color it'
      : 'Intersection Highlight Mode: OFF');

    App.renderAll();
  },

  bindSectionColorPicker() {
    const popup = document.getElementById('sectionColorPickerPopup');
    if (!popup) return;

    // Palette swatches
    popup.querySelectorAll('.color-swatch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const color = btn.dataset.color;
        this.applySectionColor(color);
      });
    });

    // Custom color input
    const customInput = document.getElementById('inputCustomSectionColor');
    if (customInput) {
      const handleCustom = (e) => {
        this.applySectionColor(e.target.value);
      };
      customInput.addEventListener('input', handleCustom);
      customInput.addEventListener('change', handleCustom);
    }

    // Clear fill button
    const btnClear = document.getElementById('btnClearSectionColor');
    if (btnClear) {
      btnClear.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applySectionColor(null);
      });
    }

    // Clear all highlights button
    const btnClearAll = document.getElementById('btnClearAllHighlights');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearAllHighlights();
      });
    }

    // Done / Deselect button
    const btnDeselect = document.getElementById('btnDeselectSections');
    if (btnDeselect) {
      btnDeselect.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeSectionColorPicker();
      });
    }

    // Close button
    const btnClose = document.getElementById('btnCloseColorPopup');
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeSectionColorPicker();
      });
    }

    // Click outside to close
    window.addEventListener('pointerdown', (e) => {
      if (popup.style.display !== 'none' &&
          !popup.contains(e.target) &&
          !e.target.closest('[data-section-id]') &&
          !e.target.closest('#toggleSectionHighlightBtn') &&
          !e.target.closest('#btnBottomHighlightMode') &&
          !e.target.closest('#btnBottomClearHighlights') &&
          !e.target.closest('#clearHighlightBtn')) {
        this.closeSectionColorPicker();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popup.style.display !== 'none') {
        this.closeSectionColorPicker();
      }
    });
  },

  toggleSectionSelection(sectionId, singleOnly = false) {
    if (!State.selectedSectionIds) State.selectedSectionIds = new Set();

    if (singleOnly) {
      State.selectedSectionIds.clear();
      State.selectedSectionIds.add(sectionId);
    } else {
      if (State.selectedSectionIds.has(sectionId)) {
        State.selectedSectionIds.delete(sectionId);
      } else {
        State.selectedSectionIds.add(sectionId);
      }
    }

    if (State.selectedSectionIds.size === 0) {
      this.closeSectionColorPicker();
    } else {
      this.openSectionColorPicker();
    }
  },

  updateSelectedSectionDOM() {
    const selectedSet = State.selectedSectionIds || new Set();
    document.querySelectorAll('.aura-intersection-section').forEach(el => {
      el.classList.toggle('selected-section', selectedSet.has(el.dataset.sectionId));
    });
  },

  openSectionColorPicker(sectionId = null) {
    if (sectionId) {
      if (!State.selectedSectionIds) State.selectedSectionIds = new Set();
      State.selectedSectionIds.add(sectionId);
    }

    const count = State.selectedSectionIds ? State.selectedSectionIds.size : 0;
    if (count === 0 && !State.sectionHighlightMode) {
      this.closeSectionColorPicker();
      return;
    }

    const popup = document.getElementById('sectionColorPickerPopup');
    if (!popup) return;

    // Apply selected-section class to highlight all selected intersections in all SVGs
    this.updateSelectedSectionDOM();

    // Update count badge in header
    const countBadge = document.getElementById('sectionColorCountBadge');
    if (countBadge) {
      countBadge.textContent = `${count} selected`;
    }

    // Popup is docked in the upper right of view pane via CSS layout
    popup.style.display = 'flex';

    // Highlight current section color if all selected sections share the same color
    let commonColor = null;
    let isUniform = true;
    for (const secId of State.selectedSectionIds) {
      const c = (State.sectionFills && State.sectionFills[secId]) || null;
      if (commonColor === null) {
        commonColor = c;
      } else if (commonColor !== c) {
        isUniform = false;
        break;
      }
    }

    popup.querySelectorAll('.color-swatch-btn').forEach(b => {
      const isMatch = Boolean(isUniform && commonColor && b.dataset.color.toLowerCase() === commonColor.toLowerCase());
      b.style.outline = isMatch ? '2px solid #fff' : 'none';
      b.style.outlineOffset = '2px';
    });

    const customInput = document.getElementById('inputCustomSectionColor');
    if (customInput && isUniform && commonColor && /^#[0-9a-fA-F]{6}$/.test(commonColor)) {
      customInput.value = commonColor;
    }
  },

  closeSectionColorPicker() {
    const popup = document.getElementById('sectionColorPickerPopup');
    if (popup) popup.style.display = 'none';
    if (State.selectedSectionIds) State.selectedSectionIds.clear();
    this.activeSectionId = null;
    document.querySelectorAll('.aura-intersection-section.selected-section').forEach(el => {
      el.classList.remove('selected-section');
    });
  },

  applySectionColor(color) {
    if (!State.selectedSectionIds || State.selectedSectionIds.size === 0) return;
    if (!State.sectionFills) State.sectionFills = {};

    const count = State.selectedSectionIds.size;
    State.selectedSectionIds.forEach(secId => {
      if (color) {
        State.sectionFills[secId] = color;
      } else {
        delete State.sectionFills[secId];
      }
    });

    if (color) {
      this.showToast(`Colored ${count} intersection section${count > 1 ? 's' : ''}: ${color}`);
    } else {
      this.showToast(`Cleared fill from ${count} intersection section${count > 1 ? 's' : ''}`);
    }

    // Unlink active preset so canvas edits do not overwrite the saved preset
    State.activePreset = null;
    if (typeof this.renderCustomPresets === 'function') this.renderCustomPresets();

    App.renderAll();
    // After re-rendering, maintain the selected-section class on newly created SVG DOM elements
    this.updateSelectedSectionDOM();

    // Update swatches outline
    const popup = document.getElementById('sectionColorPickerPopup');
    if (popup) {
      popup.querySelectorAll('.color-swatch-btn').forEach(b => {
        const isMatch = Boolean(color && b.dataset.color.toLowerCase() === color.toLowerCase());
        b.style.outline = isMatch ? '2px solid #fff' : 'none';
        b.style.outlineOffset = '2px';
      });
    }
  },

  /**
   * Clears all intersection colored section highlights, active section selections,
   * and highlighted circles, keeping highlight mode active.
   */
  clearAllHighlights() {
    if (typeof State !== 'undefined') {
      if (typeof State.clearAllHighlights === 'function') {
        State.clearAllHighlights();
      } else {
        State.sectionFills = {};
        if (State.selectedSectionIds) State.selectedSectionIds.clear();
        if (State.highlightedIds) State.highlightedIds.clear();
        if (State.highlightedSectionIds) State.highlightedSectionIds.clear();
      }
    }
    this.hideRemoveCirclesPopup();

    // Unlink active preset so canvas clear does not overwrite the saved preset
    State.activePreset = null;
    if (typeof this.renderCustomPresets === 'function') this.renderCustomPresets();

    if (typeof document !== 'undefined') {
      document.querySelectorAll('.aura-intersection-section.selected-section').forEach(el => {
        el.classList.remove('selected-section');
      });
      document.querySelectorAll('.highlighted-circle').forEach(el => {
        el.classList.remove('highlighted-circle');
      });

      const countBadge = document.getElementById('sectionColorCountBadge');
      if (countBadge) countBadge.textContent = '0 selected';

      const popup = document.getElementById('sectionColorPickerPopup');
      if (popup) {
        popup.querySelectorAll('.color-swatch-btn').forEach(b => {
          b.style.outline = 'none';
        });
      }
    }

    if (typeof SVGRenderer !== 'undefined' && SVGRenderer.updateHighlights) {
      ['svgMain', 'svgLife', 'svgKryst'].forEach(id => {
        if (typeof document !== 'undefined' && document.getElementById(id)) {
          SVGRenderer.updateHighlights(id);
        }
      });
    }

    if (typeof this.updateSidebarStats === 'function') {
      this.updateSidebarStats();
    }

    if (typeof App !== 'undefined' && App.renderAll) {
      App.renderAll();
    }

    if (typeof this.showToast === 'function') {
      this.showToast('Cleared all highlights and section colors.');
    }
  },

  /**
   * Updates pattern HUD badges at the top of the viewport:
   * - Title (e.g. "Seed of Kryst", "Fruit of Kryst", "Water of Kryst")
   * - Ring # (e.g. "Ring #5")
   * - Circle stats (e.g. "36 in Ring #5 · 90 Total Circles")
   */
  updatePatternHUD(geomData) {
    if (!geomData) return;
    const pattern = State.activePattern || 'kryst';
    const maxLayer = geomData.maxLayer || 1;
    const stageNames = (pattern === 'life') ? LIFE_STAGE_NAMES : KRYST_STAGE_NAMES;
    const stageTitle = stageNames[maxLayer] || (pattern === 'life' ? 'Flower of Life' : 'Flower of Kryst');
    const countInRing = geomData.ringCounts ? (geomData.ringCounts.get(maxLayer) || 0) : 0;
    const totalCircles = geomData.totalCircles || geomData.circles?.length || 0;

    const titleEl = document.getElementById('badgeStageTitle') || document.getElementById('badgeKrystTitle') || document.getElementById('badgeLifeTitle');
    if (titleEl) titleEl.textContent = stageTitle;

    const ringEl = document.getElementById('badgeRingIndex');
    if (ringEl) ringEl.textContent = `Ring #${maxLayer}`;

    const statsEl = document.getElementById('badgeCircleStats') || document.getElementById('badgeKrystCount') || document.getElementById('badgeLifeCount');
    if (statsEl) {
      statsEl.textContent = `${countInRing} in Ring #${maxLayer} · ${totalCircles} Total`;
    }

    const folStat = document.getElementById('folCountStat');
    if (folStat) folStat.textContent = `${totalCircles} Circles`;
    const fokStat = document.getElementById('fokCountStat');
    if (fokStat) fokStat.textContent = `${totalCircles} Circles (${stageTitle})`;

    // Sync interactive circle count input when user is not actively typing
    const inputCircleCount = document.getElementById('inputCircleCount');
    if (inputCircleCount && document.activeElement !== inputCircleCount) {
      inputCircleCount.value = totalCircles;
    }
  },

  bindPatternSwitcher() {
    const tabs = document.querySelectorAll('.pattern-tab, [data-pattern-switch]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const pattern = tab.dataset.patternSwitch || tab.dataset.pattern;
        if (!pattern) return;

        State.activePattern = pattern;
        tabs.forEach(t => {
          const isAct = (t.dataset.patternSwitch || t.dataset.pattern) === pattern;
          t.classList.toggle('active', isAct);
          t.setAttribute('aria-selected', isAct ? 'true' : 'false');
        });

        // Fit screen if switching
        this.fitToScreen();
        App.renderAll();
        this.showToast(`Active Pattern: ${pattern === 'kryst' ? 'Flower of Kryst' : 'Flower of Life'}`);
      });
    });
  },

  jumpToCircleCount(targetCount) {
    const target = parseInt(targetCount, 10);
    if (isNaN(target) || target <= 0) return;

    const result = SacredMath.getNearestValidBoundaryRadius(
      target,
      State.activePattern || 'kryst',
      State.r || 50,
      State.disabledCircleIds
    );

    const newRad = result.radius;
    State.boundaryRadius = newRad;

    const boundarySlider = document.getElementById('boundarySlider');
    if (boundarySlider) {
      if (newRad > Number(boundarySlider.max)) {
        boundarySlider.max = Math.ceil(newRad * 1.2);
      }
      boundarySlider.value = newRad;
    }

    const boundaryBadge = document.getElementById('boundaryBadge');
    if (boundaryBadge) {
      boundaryBadge.textContent = `R_bound = ${newRad}px`;
    }

    // R-B1: One-way viewport zoom out if boundary expands beyond viewport
    const pane = document.getElementById('paneMain') || document.querySelector('.viewport-pane');
    const rect = pane?.getBoundingClientRect();
    const width = (rect && rect.width > 0) ? rect.width : (pane?.clientWidth || 800);
    const height = (rect && rect.height > 0) ? rect.height : (pane?.clientHeight || 800);
    const minDim = Math.min(width, height) * 0.85;
    const requiredScale = minDim / (2 * newRad);
    const activeKey = State.activePattern || 'kryst';
    const transform = State.transforms[activeKey];
    if (transform && transform.scale > requiredScale) {
      transform.scale = clampNumber(requiredScale, 0.04, 25.0, 0.38);
      transform.panX = 0;
      transform.panY = 0;
    }

    this.updateSidebarStats();
    App.renderAll();

    const inputCircleCount = document.getElementById('inputCircleCount');
    if (inputCircleCount) {
      inputCircleCount.value = result.circleCount;
    }

    const feedbackEl = document.getElementById('circleCountFeedback');
    if (feedbackEl) {
      feedbackEl.textContent = `Jumped: ${result.circleCount}c (${newRad}px)`;
      setTimeout(() => {
        if (feedbackEl) feedbackEl.textContent = '';
      }, 3500);
    }

    this.showToast(`Boundary jumped to ${newRad}px (${result.circleCount} circles)`);
  },

  bindBoundaryControls() {
    const boundarySlider = document.getElementById('boundarySlider');
    const boundaryBadge = document.getElementById('boundaryBadge');
    if (boundarySlider) {
      boundarySlider.value = State.boundaryRadius || 200;
      if (boundaryBadge) boundaryBadge.textContent = `R_bound = ${State.boundaryRadius || 200}px`;

      boundarySlider.addEventListener('input', (e) => {
        const newRad = Number(e.target.value);
        State.boundaryRadius = newRad;
        if (boundaryBadge) {
          boundaryBadge.textContent = `R_bound = ${newRad}px`;
        }

        // R-B1: One-way viewport zoom out.
        // If boundary circle expands beyond the current viewport, zoom out.
        // If boundary slider is reduced, do NOT zoom in (preserves user zoom level).
        const pane = document.getElementById('paneMain') || document.querySelector('.viewport-pane');
        const rect = pane?.getBoundingClientRect();
        const width = (rect && rect.width > 0) ? rect.width : (pane?.clientWidth || 800);
        const height = (rect && rect.height > 0) ? rect.height : (pane?.clientHeight || 800);
        const minDim = Math.min(width, height) * 0.85;
        const requiredScale = minDim / (2 * newRad);
        const activeKey = State.activePattern || 'kryst';
        const transform = State.transforms[activeKey];
        if (transform && transform.scale > requiredScale) {
          transform.scale = clampNumber(requiredScale, 0.04, 25.0, 0.38);
          // Lock pattern center strictly at origin (0, 0) during boundary expansion
          transform.panX = 0;
          transform.panY = 0;
        }

        this.updateSidebarStats();
        App.renderAll();
      });
    }

    // Interactive circle count input and jump button
    const inputCircleCount = document.getElementById('inputCircleCount');
    const btnJump = document.getElementById('btnJumpCircleCount');

    const handleJump = () => {
      if (!inputCircleCount) return;
      const target = parseInt(inputCircleCount.value, 10);
      if (!isNaN(target) && target > 0) {
        this.jumpToCircleCount(target);
      }
    };

    if (inputCircleCount) {
      inputCircleCount.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleJump();
        }
      });
      inputCircleCount.addEventListener('change', handleJump);
    }

    if (btnJump) {
      btnJump.addEventListener('click', handleJump);
    }

    // Remove Circles Button: Removes all currently highlighted circles
    const btnRemove = document.getElementById('btnRemoveCircles') || document.getElementById('btnToggleRemoveCircles') || document.getElementById('btnPopupRemoveCircles');
    if (btnRemove) {
      btnRemove.addEventListener('click', () => {
        this.removeHighlightedCircles();
      });
    }

    // Restore All Removed Circles Button (alongside highlight mode at bottom)
    const btnRestore = document.getElementById('btnRestoreCircles');
    if (btnRestore) {
      btnRestore.addEventListener('click', () => {
        if (!State.disabledCircleIds || State.disabledCircleIds.size === 0) {
          this.showToast('No circles have been removed.');
          return;
        }
        State.disabledCircleIds.clear();
        this.hideRemoveCirclesPopup();
        this.updateSidebarStats();
        App.renderAll();
        this.showToast('All removed circles have been restored.');
      });
    }
  },

  bindRemoveCirclesPopup() {
    if (typeof document === 'undefined') return;
    const btnPopupRemove = document.getElementById('btnPopupRemoveCircles');
    if (btnPopupRemove) {
      btnPopupRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeHighlightedCircles();
      });
    }

    const btnClose = document.getElementById('btnCloseRemoveCirclesPopup');
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideRemoveCirclesPopup();
      });
    }
  },

  showRemoveCirclesPopup(clientX, clientY) {
    if (typeof document === 'undefined') return;
    const popup = document.getElementById('removeCirclesPopup');
    if (!popup) return;

    popup.style.display = 'inline-flex';

    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const popupWidth = popup.offsetWidth || 160;
      const popupHeight = popup.offsetHeight || 38;

      let left = clientX - (popupWidth / 2);
      let top = clientY - popupHeight - 14;

      const pad = 12;
      const winW = (typeof window !== 'undefined') ? window.innerWidth : 1200;
      left = Math.max(pad, Math.min(winW - popupWidth - pad, left));
      if (top < pad) {
        top = clientY + 24;
      }

      popup.style.left = `${Math.round(left)}px`;
      popup.style.top = `${Math.round(top)}px`;
    }
  },

  hideRemoveCirclesPopup() {
    if (typeof document === 'undefined') return;
    const popup = document.getElementById('removeCirclesPopup');
    if (popup) {
      popup.style.display = 'none';
    }
  },

  bindFaderBar() {
    this.syncLayerControls();

    const checkBody = document.getElementById('checkBodyVisible');
    const toggleBody = document.getElementById('toggleBodyCircles');
    const sliderBody = document.getElementById('sliderBodyOpacity');

    const checkAura = document.getElementById('checkAuraVisible');
    const toggleAura = document.getElementById('toggleAuraFlower');
    const sliderAura = document.getElementById('sliderAuraOpacity');

    // Body visibility toggle handlers
    const onBodyToggle = (checked) => {
      State.showBodyCircles = checked;
      if (checked && (State.bodyOpacity === 0 || State.bodyOpacity === undefined)) {
        State.bodyOpacity = 1.0;
      }
      this.syncLayerControls();
      App.renderAll();
    };
    checkBody?.addEventListener('change', (e) => onBodyToggle(e.target.checked));
    toggleBody?.addEventListener('change', (e) => onBodyToggle(e.target.checked));

    // Body opacity slider handler
    sliderBody?.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      State.bodyOpacity = val / 100;
      State.showBodyCircles = val > 0;
      this.syncLayerControls();
      App.renderAll();
    });

    // Aura visibility toggle handlers
    const onAuraToggle = (checked) => {
      State.showAuraFlower = checked;
      if (checked && (State.auraOpacity === 0 || State.auraOpacity === undefined)) {
        State.auraOpacity = 1.0;
      }
      this.syncLayerControls();
      App.renderAll();
    };
    checkAura?.addEventListener('change', (e) => onAuraToggle(e.target.checked));
    toggleAura?.addEventListener('change', (e) => onAuraToggle(e.target.checked));

    // Aura opacity slider handler
    sliderAura?.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      State.auraOpacity = val / 100;
      State.showAuraFlower = val > 0;
      this.syncLayerControls();
      App.renderAll();
    });

    // Bottom bar Highlight Mode button
    document.getElementById('btnBottomHighlightMode')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleSectionHighlightMode();
    });

    // Bottom bar Clear All Highlights button
    document.getElementById('btnBottomClearHighlights')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.clearAllHighlights();
    });
  },

  syncLayerControls() {
    const checkBody = document.getElementById('checkBodyVisible');
    const toggleBody = document.getElementById('toggleBodyCircles');
    const sliderBody = document.getElementById('sliderBodyOpacity');
    const badgeBody = document.getElementById('badgeBodyOpacity');

    const checkAura = document.getElementById('checkAuraVisible');
    const toggleAura = document.getElementById('toggleAuraFlower');
    const sliderAura = document.getElementById('sliderAuraOpacity');
    const badgeAura = document.getElementById('badgeAuraOpacity');

    const isBodyVisible = Boolean(State.showBodyCircles);
    const bodyVal = Math.round((State.bodyOpacity !== undefined ? State.bodyOpacity : 1.0) * 100);
    if (checkBody) checkBody.checked = isBodyVisible;
    if (toggleBody) toggleBody.checked = isBodyVisible;
    if (sliderBody) {
      sliderBody.value = isBodyVisible ? bodyVal : 0;
      this.updateRangeSliderFill(sliderBody);
    }
    if (badgeBody) badgeBody.textContent = isBodyVisible ? `${bodyVal}%` : 'Off';

    const isAuraVisible = Boolean(State.showAuraFlower);
    const auraVal = Math.round((State.auraOpacity !== undefined ? State.auraOpacity : 1.0) * 100);
    if (checkAura) checkAura.checked = isAuraVisible;
    if (toggleAura) toggleAura.checked = isAuraVisible;
    if (sliderAura) {
      sliderAura.value = isAuraVisible ? auraVal : 0;
      this.updateRangeSliderFill(sliderAura);
    }
    if (badgeAura) badgeAura.textContent = isAuraVisible ? `${auraVal}%` : 'Off';

    const strokeAuraSlider = document.getElementById('strokeAuraSlider');
    const strokeAuraBadge = document.getElementById('strokeAuraBadge');
    if (strokeAuraSlider) {
      strokeAuraSlider.value = State.strokeAura !== undefined ? State.strokeAura : 5.0;
      this.updateRangeSliderFill(strokeAuraSlider);
    }
    if (strokeAuraBadge) {
      strokeAuraBadge.textContent = `${State.strokeAura !== undefined ? State.strokeAura : 5.0}px`;
    }

    const strokeBodySlider = document.getElementById('strokeBodySlider');
    const strokeBodyBadge = document.getElementById('strokeBodyBadge');
    if (strokeBodySlider) {
      strokeBodySlider.value = State.strokeBody !== undefined ? State.strokeBody : 1.0;
      this.updateRangeSliderFill(strokeBodySlider);
    }
    if (strokeBodyBadge) {
      strokeBodyBadge.textContent = `${State.strokeBody !== undefined ? State.strokeBody : 1.0}px`;
    }

    const strokeGuideSlider = document.getElementById('strokeGuideSlider');
    const strokeGuideBadge = document.getElementById('strokeGuideBadge');
    if (strokeGuideSlider) {
      strokeGuideSlider.value = State.strokeGuide !== undefined ? State.strokeGuide : 2.0;
      this.updateRangeSliderFill(strokeGuideSlider);
    }
    if (strokeGuideBadge) {
      strokeGuideBadge.textContent = `${State.strokeGuide !== undefined ? State.strokeGuide : 2.0}px`;
    }

    const btnBottomHighlight = document.getElementById('btnBottomHighlightMode');
    if (btnBottomHighlight) {
      btnBottomHighlight.classList.toggle('active', !!State.sectionHighlightMode);
    }
    const btnFloatHighlight = document.getElementById('toggleSectionHighlightBtn');
    if (btnFloatHighlight) {
      btnFloatHighlight.classList.toggle('active', !!State.sectionHighlightMode);
    }
  },

  bindPainterControls() {
    // Painter mode toggle
    const togglePainter = document.getElementById('togglePainterMode');
    const swatchesContainer = document.getElementById('painterSwatches');
    if (togglePainter) {
      togglePainter.checked = !!State.painterMode;
      if (swatchesContainer) {
        swatchesContainer.style.display = togglePainter.checked ? 'flex' : 'none';
      }
      togglePainter.addEventListener('change', (e) => {
        State.painterMode = e.target.checked;
        if (swatchesContainer) {
          swatchesContainer.style.display = e.target.checked ? 'flex' : 'none';
        }
        this.showToast(e.target.checked ? 'Painter Mode Active: Click circles to fill color' : 'Painter Mode Deactivated');
      });
    }

    // Swatches
    document.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.painterColor = btn.dataset.color || '#f59e0b';
      });
    });

    const customPainterInput = document.getElementById('colorPainterCustom');
    if (customPainterInput) {
      customPainterInput.addEventListener('input', (e) => {
        State.painterColor = e.target.value;
        document.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active'));
      });
    }

    // Clear painted shapes button
    const btnClearPaint = document.getElementById('btnClearPaint');
    if (btnClearPaint) {
      btnClearPaint.addEventListener('click', () => {
        if (State.coloredShapesMap.size === 0) {
          this.showToast('No painted shapes to clear.');
          return;
        }
        State.coloredShapesMap.clear();
        App.renderAll();
        this.showToast('Cleared all painted shape fills.');
      });
    }
  },

  bindAccordions() {
    document.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.parentElement;
        section.classList.toggle('open');
      });
    });

    const expandAllBtn = document.getElementById('expandAllSectionsBtn');
    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.panel-section').forEach(s => s.classList.add('open'));
      });
    }

    const collapseAllBtn = document.getElementById('collapseAllSectionsBtn');
    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('open'));
      });
    }

    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    if (sidebarToggleBtn && sidebar) {
      sidebarToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        sidebarToggleBtn.classList.toggle('pinned-collapsed', sidebar.classList.contains('collapsed'));
        setTimeout(() => App.renderAll(), 300);
      });
    }
  },

  bindDimensionTabs() {
    document.querySelectorAll('#dimensionSwitcher .dim-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const dim = tab.dataset.dim;
        this.setDimension(dim);
      });
    });
  },

  setDimension(dim) {
    State.dimension = dim;
    document.body.dataset.dimension = dim;

    document.querySelectorAll('#dimensionSwitcher .dim-tab').forEach(tab => {
      const isActive = tab.dataset.dim === dim;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const svgWrapper = document.getElementById('svgWrapperMain') || document.getElementById('svgWrapperKryst') || document.getElementById('svgWrapperLife');
    const webglWrapper = document.getElementById('webglWrapperMain') || document.getElementById('webglWrapperKryst');
    const section3d = document.getElementById('section3dControls');
    const section2d = document.getElementById('section2dLayers');

    if (dim === '3d') {
      if (svgWrapper) svgWrapper.style.display = 'none';
      if (webglWrapper) webglWrapper.style.display = 'flex';
      if (section3d) {
        section3d.style.display = '';
        section3d.classList.add('open');
      }
      if (section2d) {
        section2d.style.display = 'none';
      }

      if (window.Renderer3D) {
        if (!window.Renderer3D.isInitialized && window.Renderer3D.init) {
          window.Renderer3D.init();
        } else {
          window.Renderer3D.resizeAll?.();
          window.Renderer3D.renderAll?.();
          window.Renderer3D.fitCameraAll?.();
        }
      }
      this.showToast('3D WebGL Engine Active');
    } else {
      if (svgWrapper) svgWrapper.style.display = '';
      if (webglWrapper) webglWrapper.style.display = 'none';
      if (section3d) {
        section3d.style.display = 'none';
      }
      if (section2d) {
        section2d.style.display = '';
      }

      App.renderAll();
      this.showToast('2D SVG Engine Active');
    }
  },

  bindSliders() {
    const radiusSlider = document.getElementById('radiusSlider');
    const radiusBadge = document.getElementById('radiusBadge');
    const auraScaleBadge = document.getElementById('badgeAuraScale');
    const auraScaleSlider = document.getElementById('sliderAuraScale');

    const updateAuraScaleLabel = (scale) => {
      if (!auraScaleBadge) return;
      const px = Math.round(scale * (State.r || 50));
      auraScaleBadge.textContent = `${scale.toFixed(2)}r (${px}px)`;
    };

    if (radiusSlider && radiusBadge) {
      radiusSlider.value = State.r || 50;
      radiusBadge.textContent = `r = ${State.r}px`;
      radiusSlider.addEventListener('input', (e) => {
        State.setRadius(e.target.value);
        radiusBadge.textContent = `r = ${State.r}px`;
        updateAuraScaleLabel(State.auraScale !== undefined ? State.auraScale : 1.95);
        this.updateSidebarStats();
        App.renderAll();
      });
    }

    // Aura Scale Slider (0r to 20r in 0.01 increments)
    if (auraScaleSlider) {
      auraScaleSlider.value = State.auraScale !== undefined ? State.auraScale : 1.95;
      updateAuraScaleLabel(Number(auraScaleSlider.value));

      auraScaleSlider.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 0.0, 20.0, 1.95);
        State.auraScale = val;
        updateAuraScaleLabel(val);
        this.updateSidebarStats();
        App.renderAll();
      });
    }

    const strokeAuraSlider = document.getElementById('strokeAuraSlider');
    const strokeAuraBadge = document.getElementById('strokeAuraBadge');
    if (strokeAuraSlider && strokeAuraBadge) {
      strokeAuraSlider.value = State.strokeAura || 5.0;
      strokeAuraBadge.textContent = `${State.strokeAura || 5.0}px`;
      strokeAuraSlider.addEventListener('input', (e) => {
        State.strokeAura = clampNumber(e.target.value, 0.5, 10.0, 5.0);
        strokeAuraBadge.textContent = `${State.strokeAura}px`;
        App.renderAll();
      });
    }

    const strokeBodySlider = document.getElementById('strokeBodySlider');
    const strokeBodyBadge = document.getElementById('strokeBodyBadge');
    if (strokeBodySlider && strokeBodyBadge) {
      strokeBodySlider.value = State.strokeBody || 1.0;
      strokeBodyBadge.textContent = `${State.strokeBody}px`;
      strokeBodySlider.addEventListener('input', (e) => {
        State.strokeBody = clampNumber(e.target.value, 0.25, 6.0, 1.0);
        strokeBodyBadge.textContent = `${State.strokeBody}px`;
        App.renderAll();
      });
    }

    const strokeGuideSlider = document.getElementById('strokeGuideSlider');
    const strokeGuideBadge = document.getElementById('strokeGuideBadge');
    if (strokeGuideSlider && strokeGuideBadge) {
      strokeGuideSlider.value = State.strokeGuide || 2.0;
      strokeGuideBadge.textContent = `${State.strokeGuide}px`;
      strokeGuideSlider.addEventListener('input', (e) => {
        State.strokeGuide = clampNumber(e.target.value, 0.25, 8.0, 2.0);
        strokeGuideBadge.textContent = `${State.strokeGuide}px`;
        App.renderAll();
      });
    }

    const fillSlider = document.getElementById('fillOpacitySlider');
    const fillBadge = document.getElementById('fillOpacityBadge');
    if (fillSlider && fillBadge) {
      fillSlider.value = Math.round((State.fillOpacity || 0.04) * 100);
      fillBadge.textContent = `${fillSlider.value}%`;
      fillSlider.addEventListener('input', (e) => {
        const pct = clampNumber(e.target.value, 0, 100, 4);
        State.fillOpacity = pct / 100;
        fillBadge.textContent = `${pct}%`;
        App.renderAll();
      });
    }

    // Offset Path sliders (R-A5)
    const offsetCountSlider = document.getElementById('sliderOffsetCount');
    const offsetCountBadge = document.getElementById('badgeOffsetCount');
    if (offsetCountSlider && offsetCountBadge) {
      offsetCountSlider.value = State.offsetPath?.count || 3;
      offsetCountBadge.textContent = `${offsetCountSlider.value} rings`;
      offsetCountSlider.addEventListener('input', (e) => {
        State.offsetPath.count = Number(e.target.value);
        offsetCountBadge.textContent = `${e.target.value} rings`;
        App.renderAll();
      });
    }

    const offsetSpacingSlider = document.getElementById('sliderOffsetSpacing');
    const offsetSpacingBadge = document.getElementById('badgeOffsetSpacing');
    if (offsetSpacingSlider && offsetSpacingBadge) {
      offsetSpacingSlider.value = State.offsetPath?.spacing || 6;
      offsetSpacingBadge.textContent = `${offsetSpacingSlider.value}px`;
      offsetSpacingSlider.addEventListener('input', (e) => {
        State.offsetPath.spacing = Number(e.target.value);
        offsetSpacingBadge.textContent = `${e.target.value}px`;
        App.renderAll();
      });
    }
  },

  bindToggles() {
    const toggleMap = [
      { id: 'toggleCircleRainbow', prop: 'circleRainbow' },
      { id: 'toggleRingSpectral', prop: 'ringSpectral' },
      { id: 'toggleRainbowRipple', prop: 'rainbowRipple' },
      { id: 'toggleFullScreenTiling', prop: 'fullScreenTiling' },
      { id: 'toggleSOHOE', prop: 'showSOHOE' },
      { id: 'toggleHexagramEyes', prop: 'showHexagramEyes' },
      { id: 'toggleGuides', prop: 'showGuides' },
      { id: 'toggleOuterRing', prop: 'showOuterRing' },
      { id: 'toggleCenterDots', prop: 'showCenterDots' },
      { id: 'toggleIntersections', prop: 'showIntersections' },
      { id: 'toggleRadialAxes', prop: 'showRadialAxes' },
      { id: 'toggleGlow', prop: 'enableGlow' }
    ];

    toggleMap.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        el.checked = Boolean(State[item.prop]);
        el.addEventListener('change', (e) => {
          State[item.prop] = e.target.checked;
          App.renderAll();
        });
      }
    });

    // Offset Path toggle (R-A5)
    const toggleOffset = document.getElementById('toggleOffsetPath');
    const offsetControls = document.getElementById('offsetPathControls');
    if (toggleOffset) {
      toggleOffset.checked = !!State.offsetPath?.enabled;
      if (offsetControls) offsetControls.style.display = toggleOffset.checked ? 'block' : 'none';
      toggleOffset.addEventListener('change', (e) => {
        State.offsetPath.enabled = e.target.checked;
        if (offsetControls) offsetControls.style.display = e.target.checked ? 'block' : 'none';
        App.renderAll();
      });
    }
  },

  bindColorPickers() {
    const colorInputs = [
      { id: 'colorLife', prop: 'colorLife' },
      { id: 'colorKryst', prop: 'colorKryst' },
      { id: 'colorBody', prop: 'colorBody' },
      { id: 'colorTriangle', prop: 'colorTriangle' },
      { id: 'colorGuide', prop: 'colorGuide' },
      { id: 'colorIntersection', prop: 'colorIntersection' },
      { id: 'colorOuter', prop: 'colorOuter' },
      { id: 'colorAxes', prop: 'colorAxes' }
    ];

    colorInputs.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        el.value = State[item.prop] || '#ffffff';
        el.addEventListener('input', (e) => {
          State[item.prop] = e.target.value;
          App.renderAll();
        });
      }
    });
  },

  _gadgetsRafId: null,
  _auraExpansionStartTime: 0,
  _rainbowStartTime: 0,
  _lastRainbowTime: 0,
  _rainbowPhase: 0,
  _auraCircleElements: null,
  _breathingStartTime: 0,

  /**
   * Sacred Gadgets: Real-time interactive animations that can overlay simultaneously:
   * 1. Aura Expansion: Progressively expands aura from 1.1r to 20r in 0.01 increments and recedes back
   * 2. Rainbow Aura Wave: Cycles aura petals through rainbow colors from center to outside
   * 3. Sacred Breathing: Breathes entire pattern from center up to max size (slider up to 2.0) and back to 1.0
   */
  bindSacredGadgets() {
    const toggleAuraExp = document.getElementById('toggleAuraExpansion');
    const cardAuraExp = document.getElementById('cardAuraExpansion');
    const sliderAuraExpMaxSize = document.getElementById('sliderAuraExpMaxSize');
    const badgeAuraExpMaxSize = document.getElementById('badgeAuraExpMaxSize');
    const sliderAuraExpSpeed = document.getElementById('sliderAuraExpSpeed');
    const badgeAuraExpSpeed = document.getElementById('badgeAuraExpSpeed');

    const toggleRainbow = document.getElementById('toggleRainbowAura');
    const cardRainbow = document.getElementById('cardRainbowAura');
    const sliderRainbowSpeed = document.getElementById('sliderRainbowSpeed');
    const badgeRainbowSpeed = document.getElementById('badgeRainbowSpeed');

    const toggleBreathing = document.getElementById('toggleBreathing');
    const cardBreathing = document.getElementById('cardBreathing');
    const sliderBreathingSize = document.getElementById('sliderBreathingSize');
    const badgeBreathingSize = document.getElementById('badgeBreathingSize');
    const sliderBreathingSpeed = document.getElementById('sliderBreathingSpeed');
    const badgeBreathingSpeed = document.getElementById('badgeBreathingSpeed');

    // 1. Aura Expansion Toggle (0r to max size up to 20r progressively, increments 0.01)
    if (toggleAuraExp) {
      toggleAuraExp.checked = Boolean(State.gadgetAuraExpansion);
      toggleAuraExp.addEventListener('change', (e) => {
        State.gadgetAuraExpansion = e.target.checked;
        cardAuraExp?.classList.toggle('active', State.gadgetAuraExpansion);
        if (State.gadgetAuraExpansion) {
          this._auraExpansionStartTime = performance.now();
          this.startSacredGadgetsLoop();
          this.showToast('Sacred Gadget: Aura Expansion ON (0r ↔ max)');
        } else {
          cardAuraExp?.classList.remove('active');
          this.stopSacredGadgetsLoopIfAllInactive();
          // Turning off aura expansion resets aura size to default 1.95
          State.auraScale = 1.95;
          const slider = document.getElementById('sliderAuraScale');
          const badge = document.getElementById('badgeAuraScale');
          if (slider) {
            slider.value = '1.95';
            this.updateRangeSliderFill(slider);
          }
          if (badge) {
            const px = Math.round(1.95 * (State.r || 50));
            badge.textContent = `1.95r (${px}px)`;
          }
          this.showToast('Sacred Gadget: Aura Expansion OFF (Reset to 1.95r)');
          App.renderAll();
        }
      });
    }

    if (sliderAuraExpMaxSize && badgeAuraExpMaxSize) {
      sliderAuraExpMaxSize.value = State.auraExpansionMaxSize !== undefined ? State.auraExpansionMaxSize : 20.0;
      badgeAuraExpMaxSize.textContent = `${Number(sliderAuraExpMaxSize.value).toFixed(1)}r`;
      sliderAuraExpMaxSize.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 0.0, 20.0, 20.0);
        State.auraExpansionMaxSize = val;
        badgeAuraExpMaxSize.textContent = `${val.toFixed(1)}r`;
      });
    }

    if (sliderAuraExpSpeed && badgeAuraExpSpeed) {
      sliderAuraExpSpeed.value = State.auraExpansionSpeed !== undefined ? State.auraExpansionSpeed : 1.0;
      badgeAuraExpSpeed.textContent = `${Number(sliderAuraExpSpeed.value).toFixed(1)}x`;
      sliderAuraExpSpeed.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 0.1, 3.0, 1.0);
        State.auraExpansionSpeed = val;
        badgeAuraExpSpeed.textContent = `${val.toFixed(1)}x`;
      });
    }

    // 2. Rainbow Aura Wave Toggle (Cycles rainbow from center to outside)
    if (toggleRainbow) {
      toggleRainbow.checked = Boolean(State.gadgetRainbowAura);
      toggleRainbow.addEventListener('change', (e) => {
        State.gadgetRainbowAura = e.target.checked;
        cardRainbow?.classList.toggle('active', State.gadgetRainbowAura);
        if (State.gadgetRainbowAura) {
          this._rainbowStartTime = performance.now();
          this._lastRainbowTime = performance.now() / 1000;
          this._rainbowPhase = 0;
          this._auraCircleElements = null;
          document.querySelectorAll('.aura-circle').forEach(circle => {
            circle.style.setProperty('transition', 'none', 'important');
          });
          this.startSacredGadgetsLoop();
          this.showToast('Sacred Gadget: Rainbow Aura Wave ON');
        } else {
          cardRainbow?.classList.remove('active');
          this._auraCircleElements = null;
          this.resetRainbowAuraStrokes();
          this.stopSacredGadgetsLoopIfAllInactive();
          this.showToast('Sacred Gadget: Rainbow Aura Wave OFF');
        }
      });
    }

    if (sliderRainbowSpeed && badgeRainbowSpeed) {
      sliderRainbowSpeed.value = State.rainbowWaveSpeed !== undefined ? State.rainbowWaveSpeed : 1.0;
      badgeRainbowSpeed.textContent = `${Number(sliderRainbowSpeed.value).toFixed(1)}x`;
      sliderRainbowSpeed.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 0.1, 3.0, 1.0);
        State.rainbowWaveSpeed = val;
        badgeRainbowSpeed.textContent = `${val.toFixed(1)}x`;
      });
    }

    // 3. Sacred Breathing Toggle & Sliders (Breathes from middle to max size up to 2.0 and back to 1.0)
    if (toggleBreathing) {
      toggleBreathing.checked = Boolean(State.gadgetBreathing);
      toggleBreathing.addEventListener('change', (e) => {
        State.gadgetBreathing = e.target.checked;
        cardBreathing?.classList.toggle('active', State.gadgetBreathing);
        if (State.gadgetBreathing) {
          this._breathingStartTime = performance.now();
          this.startSacredGadgetsLoop();
          this.showToast('Sacred Gadget: Sacred Breathing ON');
        } else {
          cardBreathing?.classList.remove('active');
          this.resetBreathingTransforms();
          this.stopSacredGadgetsLoopIfAllInactive();
          this.showToast('Sacred Gadget: Sacred Breathing OFF (Restored size to 1.0x)');
        }
      });
    }

    if (sliderBreathingSize && badgeBreathingSize) {
      sliderBreathingSize.value = State.breathingMaxSize || 2.0;
      badgeBreathingSize.textContent = `${Number(sliderBreathingSize.value).toFixed(2)}x`;
      sliderBreathingSize.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 1.05, 2.0, 2.0);
        State.breathingMaxSize = val;
        badgeBreathingSize.textContent = `${val.toFixed(2)}x`;
      });
    }

    if (sliderBreathingSpeed && badgeBreathingSpeed) {
      sliderBreathingSpeed.value = State.breathingSpeed || 1.0;
      badgeBreathingSpeed.textContent = `${Number(sliderBreathingSpeed.value).toFixed(1)}x`;
      sliderBreathingSpeed.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 0.2, 3.0, 1.0);
        State.breathingSpeed = val;
        badgeBreathingSpeed.textContent = `${val.toFixed(1)}x`;
      });
    }
  },

  startSacredGadgetsLoop() {
    if (this._gadgetsRafId) return;

    const loop = (timestamp) => {
      this.updateSacredGadgetsFrame(timestamp);

      if (State.gadgetAuraExpansion || State.gadgetRainbowAura || State.gadgetBreathing) {
        this._gadgetsRafId = requestAnimationFrame(loop);
      } else {
        this._gadgetsRafId = null;
      }
    };
    this._gadgetsRafId = requestAnimationFrame(loop);
  },

  stopSacredGadgetsLoopIfAllInactive() {
    if (!State.gadgetAuraExpansion && !State.gadgetRainbowAura && !State.gadgetBreathing) {
      if (this._gadgetsRafId) {
        cancelAnimationFrame(this._gadgetsRafId);
        this._gadgetsRafId = null;
      }
    }
  },

  updateSacredGadgetsFrame(timestamp) {
    const nowSec = timestamp / 1000;

    // --- 1. Aura Expansion (0r to max size up to 20r in 0.01 increments) ---
    if (State.gadgetAuraExpansion) {
      const speed = State.auraExpansionSpeed || 1.0;
      const basePeriod = 10.0; // base period of 10s
      const period = basePeriod / speed;
      const elapsed = nowSec - (this._auraExpansionStartTime / 1000 || 0);
      const theta = (2 * Math.PI * elapsed) / period;
      const u = (1 - Math.cos(theta)) / 2;
      const minScale = 0.0;
      const maxScale = State.auraExpansionMaxSize !== undefined ? State.auraExpansionMaxSize : 20.0;
      const rawScale = minScale + (maxScale - minScale) * u;
      const scale = Math.round(rawScale * 100) / 100;
      State.auraScale = scale;

      const slider = document.getElementById('sliderAuraScale');
      const badge = document.getElementById('badgeAuraScale');
      if (slider && document.activeElement !== slider) {
        slider.value = scale.toFixed(2);
        this.updateRangeSliderFill(slider);
      }
      if (badge) {
        const px = Math.round(scale * (State.r || 50));
        badge.textContent = `${scale.toFixed(2)}r (${px}px)`;
      }

      const effectiveR = Number((scale * (State.r || 50)).toFixed(2));
      document.querySelectorAll('.aura-circle').forEach(circle => {
        circle.setAttribute('r', effectiveR);
      });
    }

    // --- 2. Rainbow Aura Wave (Continuous Center to Outside Spectrum) ---
    if (State.gadgetRainbowAura) {
      const speed = State.rainbowWaveSpeed || 1.0;
      const lastTime = this._lastRainbowTime || nowSec;
      const dt = Math.min(Math.max(nowSec - lastTime, 0), 0.1);
      this._lastRainbowTime = nowSec;
      this._rainbowPhase = ((this._rainbowPhase || 0) + dt * 135 * speed) % 360000;

      let auraCircles = this._auraCircleElements;
      if (!auraCircles || auraCircles.length === 0 || !auraCircles[0]?.isConnected) {
        auraCircles = Array.from(document.querySelectorAll('.aura-circle'));
        this._auraCircleElements = auraCircles;
      }

      // Wave factor 1.85 creates a continuous, unbroken chromatic wave across concentric rings
      const waveFactor = 1.85;
      const phase = this._rainbowPhase;

      for (let i = 0; i < auraCircles.length; i++) {
        const circle = auraCircles[i];
        let dist = circle._patternDist;
        if (dist === undefined) {
          const cx = parseFloat(circle.getAttribute('cx')) || 0;
          const cy = parseFloat(circle.getAttribute('cy')) || 0;
          dist = Math.hypot(cx, cy);
          circle._patternDist = dist;
        }
        const hue = (((phase - dist * waveFactor) % 360) + 360) % 360;
        const colorStr = `hsl(${Math.round(hue)}, 95%, 65%)`;
        circle.style.setProperty('transition', 'none', 'important');
        circle.style.stroke = colorStr;
        circle.setAttribute('stroke', colorStr);
      }
    }

    // --- 3. Sacred Breathing (Middle to max size up to 2.0, then back to 1.0) ---
    if (State.gadgetBreathing) {
      const speed = State.breathingSpeed || 1.0;
      const basePeriod = 8.0;
      const period = basePeriod / speed;
      const elapsed = nowSec - (this._breathingStartTime / 1000 || 0);
      const theta = (2 * Math.PI * elapsed) / period;
      const u = (1 - Math.cos(theta)) / 2;
      const maxSize = State.breathingMaxSize !== undefined ? State.breathingMaxSize : 2.0;
      const breathScale = 1.0 + (maxSize - 1.0) * u;
      window._currentBreathingScale = breathScale;

      document.querySelectorAll('.sacred-main-group').forEach(group => {
        group.setAttribute('transform', `scale(${breathScale.toFixed(4)})`);
      });
    }
  },

  resetRainbowAuraStrokes() {
    this._auraCircleElements = null;
    this._rainbowPhase = 0;
    this._lastRainbowTime = 0;
    document.querySelectorAll('.aura-circle').forEach(circle => {
      const defaultStroke = circle.getAttribute('data-default-stroke') || 
        ((circle.dataset.pattern === 'life') ? (State.colorLife || '#ef4444') : (State.colorKryst || '#10b981'));
      circle.style.stroke = '';
      circle.style.transition = '';
      circle.setAttribute('stroke', defaultStroke);
    });
  },

  resetBreathingTransforms() {
    window._currentBreathingScale = 1.0;
    document.querySelectorAll('.sacred-main-group').forEach(group => {
      group.removeAttribute('transform');
    });
    App.renderAll();
  },

  bindPresets() {
    // Add New Custom Preset
    const btnAdd = document.getElementById('btnAddNewPreset');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const name = prompt('Enter a name for this custom shape preset (e.g., Pyramid, Dove, Shield, Pinecone, Face):', 'My Sacred Preset');
        if (!name || !name.trim()) return;

        const presetKey = 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const highlightCount = (State.highlightedIds?.size || 0) +
          Object.keys(State.sectionFills || {}).length +
          (State.selectedSectionIds?.size || 0);
        const patternName = State.activePattern === 'life' ? 'Flower of Life' : 'Flower of Kryst';
        const subtitle = `${patternName} · ${highlightCount > 0 ? highlightCount + ' highlighted' : 'Geometry'}`;

        const newPreset = {
          id: presetKey,
          key: presetKey,
          title: name.trim(),
          subtitle: subtitle,
          isBuiltin: false,
          highlightCount: highlightCount,
          config: PresetsManager.captureCurrentStudioConfig()
        };

        PresetsManager.addCustomPreset(newPreset);
        State.activePreset = presetKey;
        this.renderCustomPresets();
        this.showToast(`Saved preset: "${name.trim()}"`);
      });
    }

    // Backup & Manage Presets Modal
    const manageModal = document.getElementById('presetManageModal');
    const btnManage = document.getElementById('btnManagePresets');
    const closeManage = document.getElementById('closeManagePresetsBtn');
    if (btnManage && manageModal) {
      btnManage.addEventListener('click', () => manageModal.classList.add('open'));
    }
    if (closeManage && manageModal) {
      closeManage.addEventListener('click', () => manageModal.classList.remove('open'));
    }

    // Export Presets JSON
    const btnExportJson = document.getElementById('btnExportPresetsJson');
    if (btnExportJson) {
      btnExportJson.addEventListener('click', () => {
        PresetsManager.exportToJson();
        this.showToast('Exported presets JSON file.');
      });
    }

    // Import Presets JSON
    const fileInput = document.getElementById('importPresetsFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          PresetsManager.importFromJson(event.target.result);
          this.renderCustomPresets();
          manageModal?.classList.remove('open');
          fileInput.value = '';
          this.showToast('Imported custom presets successfully.');
        };
        reader.readAsText(file);
      });
    }

    // Reset Presets
    const btnResetDefaults = document.getElementById('btnResetPresetsDefaults');
    if (btnResetDefaults) {
      btnResetDefaults.addEventListener('click', () => {
        if (confirm('Clear all custom presets?')) {
          PresetsManager.resetAllToDefaults();
          this.renderCustomPresets();
          manageModal?.classList.remove('open');
          this.showToast('Cleared custom presets.');
        }
      });
    }
  },

  renderCustomPresets() {
    PresetsManager.renderPresetGrid();
  },

  applyPreset(id) {
    const preset = PresetsManager.getPreset(id);
    if (!preset || !preset.config) return;

    State.activePreset = id;
    const cfg = preset.config;

    // Apply configuration to state safely
    State.applyConfig(cfg);

    // Sync highlight mode UI if specified in preset
    if (cfg.sectionHighlightMode !== undefined && typeof document !== 'undefined') {
      document.body.classList.toggle('section-highlight-mode', State.sectionHighlightMode);
      document.getElementById('toggleSectionHighlightBtn')?.classList.toggle('active', State.sectionHighlightMode);
      document.getElementById('btnBottomHighlightMode')?.classList.toggle('active', State.sectionHighlightMode);
    }

    // Sync UI elements
    const auraScaleSlider = document.getElementById('sliderAuraScale');
    const auraScaleBadge = document.getElementById('badgeAuraScale');
    if (auraScaleSlider) auraScaleSlider.value = State.auraScale !== undefined ? State.auraScale : 1.95;
    if (auraScaleBadge) {
      const scale = State.auraScale !== undefined ? State.auraScale : 1.95;
      const px = Math.round(scale * (State.r || 50));
      auraScaleBadge.textContent = `${scale.toFixed(2)}r (${px}px)`;
    }

    const sliderAuraExpMaxSize = document.getElementById('sliderAuraExpMaxSize');
    const badgeAuraExpMaxSize = document.getElementById('badgeAuraExpMaxSize');
    if (sliderAuraExpMaxSize) sliderAuraExpMaxSize.value = State.auraExpansionMaxSize !== undefined ? State.auraExpansionMaxSize : 20.0;
    if (badgeAuraExpMaxSize) badgeAuraExpMaxSize.textContent = `${Number(State.auraExpansionMaxSize || 20.0).toFixed(1)}r`;

    const sliderAuraExpSpeed = document.getElementById('sliderAuraExpSpeed');
    const badgeAuraExpSpeed = document.getElementById('badgeAuraExpSpeed');
    if (sliderAuraExpSpeed) sliderAuraExpSpeed.value = State.auraExpansionSpeed !== undefined ? State.auraExpansionSpeed : 1.0;
    if (badgeAuraExpSpeed) badgeAuraExpSpeed.textContent = `${Number(State.auraExpansionSpeed || 1.0).toFixed(1)}x`;

    const sliderRainbowSpeed = document.getElementById('sliderRainbowSpeed');
    const badgeRainbowSpeed = document.getElementById('badgeRainbowSpeed');
    if (sliderRainbowSpeed) sliderRainbowSpeed.value = State.rainbowWaveSpeed !== undefined ? State.rainbowWaveSpeed : 1.0;
    if (badgeRainbowSpeed) badgeRainbowSpeed.textContent = `${Number(State.rainbowWaveSpeed || 1.0).toFixed(1)}x`;

    document.querySelectorAll('.pattern-tab, [data-pattern-switch]').forEach(t => {
      const p = t.dataset.patternSwitch || t.dataset.pattern;
      const isAct = p === State.activePattern;
      t.classList.toggle('active', isAct);
      t.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });

    const boundarySlider = document.getElementById('boundarySlider');
    if (boundarySlider) boundarySlider.value = State.boundaryRadius;
    const boundaryBadge = document.getElementById('boundaryBadge');
    if (boundaryBadge) boundaryBadge.textContent = `R_bound = ${State.boundaryRadius}px`;

    this.syncLayerControls();
    this.renderCustomPresets();
    this.updateSidebarStats();
    this.updateAllRangeSliderFills();

    // Re-render pattern with restored highlights and section fills
    App.renderAll();

    // Ensure DOM overlays are in sync with restored highlights
    if (typeof SVGRenderer !== 'undefined' && SVGRenderer.updateHighlights) {
      ['svgMain', 'svgLife', 'svgKryst'].forEach(svgId => {
        if (typeof document !== 'undefined' && document.getElementById(svgId)) {
          SVGRenderer.updateHighlights(svgId);
        }
      });
    }
    this.updateSelectedSectionDOM();

    // Sync section count badge
    const countBadge = document.getElementById('sectionColorCountBadge');
    if (countBadge) {
      const count = State.selectedSectionIds ? State.selectedSectionIds.size : 0;
      countBadge.textContent = `${count} selected`;
    }

    this.showToast(`Applied preset: "${preset.title}"`);
  },

  applyCustomPreset(id) {
    return this.applyPreset(id);
  },

  bindModals() {
    // 1. Story of Kryst Modal (R-A12)
    const storyModal = document.getElementById('storyModal');
    const openStoryBtn = document.getElementById('btnStoryOfKryst');
    const closeStoryBtn = document.getElementById('closeStoryBtn');

    if (openStoryBtn && storyModal) {
      openStoryBtn.addEventListener('click', () => {
        this.populateStoryTimeline();
        storyModal.classList.add('open');
      });
    }
    if (closeStoryBtn && storyModal) {
      closeStoryBtn.addEventListener('click', () => storyModal.classList.remove('open'));
    }
    if (storyModal) {
      storyModal.addEventListener('click', (e) => {
        if (e.target === storyModal) storyModal.classList.remove('open');
      });
    }

    // 2. Ring Notes & Numerology Modal (R-A13)
    const notesModal = document.getElementById('ringNotesModal');
    const openNotesBtn = document.getElementById('btnRingNotes');
    const closeNotesBtn = document.getElementById('closeRingNotesBtn');

    if (openNotesBtn && notesModal) {
      openNotesBtn.addEventListener('click', () => {
        this.renderRingNote(this.activeRingNoteIndex);
        notesModal.classList.add('open');
      });
    }
    if (closeNotesBtn && notesModal) {
      closeNotesBtn.addEventListener('click', () => notesModal.classList.remove('open'));
    }
    if (notesModal) {
      notesModal.addEventListener('click', (e) => {
        if (e.target === notesModal) notesModal.classList.remove('open');
      });
    }

    // 3. Preset Config & Edit Modal
    const presetModal = document.getElementById('presetConfigModal');
    if (presetModal) {
      presetModal.addEventListener('click', (e) => {
        if (e.target === presetModal) presetModal.classList.remove('open');
      });
    }

    document.getElementById('btnPrevRingNote')?.addEventListener('click', () => {
      this.activeRingNoteIndex = Math.max(1, this.activeRingNoteIndex - 1);
      this.renderRingNote(this.activeRingNoteIndex);
    });
    document.getElementById('btnNextRingNote')?.addEventListener('click', () => {
      this.activeRingNoteIndex = Math.min(12, this.activeRingNoteIndex + 1);
      this.renderRingNote(this.activeRingNoteIndex);
    });

    // 3. Theory Modal
    const theoryModal = document.getElementById('theoryModal');
    document.getElementById('openTheoryBtn')?.addEventListener('click', () => {
      if (theoryModal) theoryModal.classList.add('open');
    });
    document.getElementById('closeTheoryBtn')?.addEventListener('click', () => {
      if (theoryModal) theoryModal.classList.remove('open');
    });
    if (theoryModal) {
      theoryModal.addEventListener('click', (e) => {
        if (e.target === theoryModal) theoryModal.classList.remove('open');
      });
    }

    // 4. Export Modal & Quick Actions (R-A6)
    const exportModal = document.getElementById('exportModal');
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      if (exportModal) exportModal.classList.add('open');
    });
    document.getElementById('closeExportBtn')?.addEventListener('click', () => {
      if (exportModal) exportModal.classList.remove('open');
    });
    if (exportModal) {
      exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) exportModal.classList.remove('open');
      });
    }

    // Quick download buttons
    document.getElementById('quickDownloadSvgBtn')?.addEventListener('click', () => {
      Exporter.downloadSVG();
      this.showToast('Downloaded SVG vector file.');
    });
    document.getElementById('downloadSvgBtn')?.addEventListener('click', () => {
      Exporter.downloadSVG();
      exportModal?.classList.remove('open');
    });
    document.getElementById('downloadPng2kBtn')?.addEventListener('click', () => {
      Exporter.downloadPNG(2400, 2400);
      exportModal?.classList.remove('open');
    });
    document.getElementById('downloadPng4kBtn')?.addEventListener('click', () => {
      Exporter.downloadPNG(3840, 3840);
      exportModal?.classList.remove('open');
    });
    document.getElementById('downloadPng3dBtn')?.addEventListener('click', () => {
      Exporter.downloadPNG3D();
      exportModal?.classList.remove('open');
    });

    // OpenSCAD 3D Export Dialog (Native <dialog> element)
    const scadDialog = document.getElementById('scadExportDialog');
    const exportScadBtn = document.getElementById('exportScadBtn');
    const closeScadBtn = document.getElementById('closeScadDialogBtn');
    const cancelScadBtn = document.getElementById('scadCancelBtn');
    const generateScadBtn = document.getElementById('scadGenerateBtn');
    const scadForm = document.getElementById('scadExportForm');

    exportScadBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openScadDialog();
    });
    closeScadBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.closeScadDialog();
    });
    cancelScadBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.closeScadDialog();
    });
    generateScadBtn?.addEventListener('click', (e) => {
      this.handleScadGenerate(e);
    });
    scadForm?.addEventListener('submit', (e) => {
      this.handleScadGenerate(e);
    });

    if (scadDialog) {
      scadDialog.addEventListener('click', (e) => {
        const rect = scadDialog.getBoundingClientRect();
        const clickedInDialog = (
          rect.top <= e.clientY && e.clientY <= rect.bottom &&
          rect.left <= e.clientX && e.clientX <= rect.right
        );
        if (!clickedInDialog) {
          this.closeScadDialog();
        }
      });
    }

    // Document-level event delegation ensures clicks always work regardless of timing or child targets
    document.addEventListener('click', (e) => {
      const trigger = e.target?.closest?.('#exportScadBtn, [data-action="export-openscad"]');
      if (trigger) {
        e.preventDefault();
        this.openScadDialog();
      }
    });
  },

  openScadDialog() {
    const exportModal = document.getElementById('exportModal');
    if (exportModal) exportModal.classList.remove('open');
    const scadDialog = document.getElementById('scadExportDialog');
    if (scadDialog) {
      if (typeof scadDialog.showModal === 'function') {
        try {
          if (!scadDialog.open) {
            scadDialog.showModal();
          }
        } catch (_) {
          scadDialog.setAttribute('open', '');
        }
      } else {
        scadDialog.setAttribute('open', '');
      }
    }
  },

  closeScadDialog() {
    const scadDialog = document.getElementById('scadExportDialog');
    if (scadDialog) {
      if (typeof scadDialog.close === 'function') {
        try { scadDialog.close(); } catch (_) {}
      } else {
        scadDialog.removeAttribute('open');
      }
    }
  },

  handleScadGenerate(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (this._isScadGenerating) return;
    this._isScadGenerating = true;
    setTimeout(() => { this._isScadGenerating = false; }, 800);

    const diameterInput = document.getElementById('scadTargetDiameter');
    const depthInput = document.getElementById('scadZDepth');
    const wallInput = document.getElementById('scadWallThickness');

    const targetDiameter = diameterInput ? parseFloat(diameterInput.value) : 100;
    const zDepth = depthInput ? parseFloat(depthInput.value) : 3.0;
    const wallThickness = wallInput ? parseFloat(wallInput.value) : 1.2;

    if (typeof exportOpenSCAD === 'function') {
      exportOpenSCAD(targetDiameter, zDepth, wallThickness);
    } else if (typeof Exporter?.exportOpenSCAD === 'function') {
      Exporter.exportOpenSCAD(targetDiameter, zDepth, wallThickness);
    } else if (typeof window !== 'undefined' && typeof window.exportOpenSCAD === 'function') {
      window.exportOpenSCAD(targetDiameter, zDepth, wallThickness);
    }

    this.closeScadDialog();
  },

  populateStoryTimeline() {
    const container = document.getElementById('storyTimelineContent');
    if (!container) return;
    container.innerHTML = '';

    KRYST_STORY_DATA.forEach(step => {
      const stepEl = document.createElement('div');
      stepEl.className = 'story-step';
      const stageBadge = step.stage || `Ring #${step.ring}`;
      const stageTitle = step.name || step.title;
      const subtitle = step.subtitle || step.geom || '';
      const desc = step.description || step.desc || '';
      stepEl.innerHTML = `
        <div class="story-step-badge">${stageBadge}</div>
        <div class="story-step-content">
          <h4 style="margin:0 0 4px 0; color:var(--accent-gold); font-family:var(--font-cinzel);">${stageTitle}</h4>
          ${subtitle ? `<div style="font-size:0.75rem; color:var(--accent-cyan); margin-bottom:6px; font-family:var(--font-mono);">${subtitle}</div>` : ''}
          <p style="margin:0; font-size:0.84rem; color:var(--text-primary); line-height:1.5;">${desc}</p>
        </div>
      `;
      container.appendChild(stepEl);
    });
  },

  renderRingNote(ringNum) {
    const note = RING_NOTES_DATA.find(n => n.ring === ringNum) || RING_NOTES_DATA[0] || {};
    const container = document.getElementById('ringNoteContent');
    if (!container) return;

    const ringTitle = note.title || note.name || `Ring #${note.ring}`;
    const ringDesc = note.esotericMeaning || note.desc || '';
    const ringNumerology = note.numerology || (note.circleCount ? `${note.circleCount} Circles` : '—');
    const ringFrequency = note.frequency || 'Harmonic Pure';
    const ringArchetype = note.archetype || note.geometry || 'Crystalline Axis';

    container.innerHTML = `
      <div class="ring-note-card">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px; margin-bottom:12px;">
          <div>
            <span style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--accent-cyan);">Concentric Layer</span>
            <h3 style="margin:2px 0 0 0; color:var(--accent-gold); font-family:var(--font-cinzel);">${ringTitle}</h3>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.72rem; color:var(--text-muted);">Harmonic Frequency</div>
            <strong style="color:var(--accent-gold); font-family:var(--font-mono);">${ringFrequency}</strong>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; margin-bottom:14px; background:rgba(0,0,0,0.3); padding:10px; border-radius:var(--radius-sm);">
          <div>
            <span style="font-size:0.7rem; color:var(--text-muted);">Sacred Numerology:</span>
            <div style="font-weight:600; font-size:0.85rem; color:#fff;">${ringNumerology}</div>
          </div>
          <div>
            <span style="font-size:0.7rem; color:var(--text-muted);">Geometric Archetype:</span>
            <div style="font-weight:600; font-size:0.85rem; color:var(--accent-cyan);">${ringArchetype}</div>
          </div>
        </div>

        <p style="font-size:0.88rem; line-height:1.6; color:var(--text-primary); margin:0;">
          ${ringDesc}
        </p>
      </div>
    `;

    const indicator = document.getElementById('ringNoteIndicator');
    if (indicator) {
      indicator.textContent = `Ring ${ringNum} of 12`;
    }
  },

  bindFloatingControls() {
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
      if (State.dimension === '3d' && window.Renderer3D) {
        ['kryst', 'life'].forEach(k => {
          const vp = window.Renderer3D.viewports?.[k];
          if (vp && vp.camera) {
            vp.camera.position.multiplyScalar(0.85);
            vp.controls?.update();
          }
        });
      } else {
        App.panZoomControllers.forEach(pz => pz.zoom(1.25));
      }
    });

    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
      if (State.dimension === '3d' && window.Renderer3D) {
        ['kryst', 'life'].forEach(k => {
          const vp = window.Renderer3D.viewports?.[k];
          if (vp && vp.camera) {
            vp.camera.position.multiplyScalar(1.18);
            vp.controls?.update();
          }
        });
      } else {
        App.panZoomControllers.forEach(pz => pz.zoom(0.8));
      }
    });

    document.getElementById('resetZoomBtn')?.addEventListener('click', () => {
      if (State.dimension === '3d' && window.Renderer3D) {
        window.Renderer3D.setCameraPreset(State.cameraPreset3D || 'isometric');
      } else {
        const activeKey = State.activePattern || 'kryst';
        State.transforms[activeKey] = { panX: 0, panY: 0, scale: 0.38 };
        App.renderAll();
      }
    });

    document.getElementById('fitZoomBtn')?.addEventListener('click', () => {
      this.fitToScreen();
    });

    document.getElementById('toggleSectionHighlightBtn')?.addEventListener('click', () => {
      this.toggleSectionHighlightMode();
    });

    document.getElementById('clearHighlightBtn')?.addEventListener('click', () => {
      this.clearAllHighlights();
    });
  },

  bind3DControls() {
    // 3D Architecture Model Switcher
    const modelSelect = document.getElementById('select3DModel');
    if (modelSelect) {
      modelSelect.value = State.model3D || 'volumetric_kryst';
      modelSelect.addEventListener('change', (e) => {
        State.model3D = e.target.value;
        if (State.dimension === '3d' && window.Renderer3D) {
          window.Renderer3D.renderAll?.();
          window.Renderer3D.fitCameraAll?.();
        }
      });
    }

    const autoRotateToggle = document.getElementById('toggleAutoRotate3D');
    if (autoRotateToggle) {
      autoRotateToggle.checked = !!State.autoRotate3D;
      autoRotateToggle.addEventListener('change', (e) => {
        State.autoRotate3D = e.target.checked;
      });
    }
  },

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.getElementById('sidebarToggleBtn')?.click();
      } else if (e.key === '0') {
        document.getElementById('resetZoomBtn')?.click();
      } else if (e.key === '+' || e.key === '=') {
        document.getElementById('zoomInBtn')?.click();
      } else if (e.key === '-') {
        document.getElementById('zoomOutBtn')?.click();
      } else if ((e.key === 'h' || e.key === 'H') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        this.toggleSectionHighlightMode();
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        State.highlightedIds.clear();
        this.hideRemoveCirclesPopup();
        SVGRenderer.updateHighlights('svgMain');
        this.updateSidebarStats();
      }
    });
  },

  showToast(text, duration = 2400) {
    if (typeof document === 'undefined') return;
    const toast = document.getElementById('toastMessage');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  },

  fitToScreen() {
    if (State.dimension === '3d' && window.Renderer3D) {
      window.Renderer3D.fitCameraAll?.();
      return;
    }
    const pane = document.getElementById('paneMain') || document.querySelector('.viewport-pane');
    const rect = pane?.getBoundingClientRect();
    const width = (rect && rect.width > 0) ? rect.width : (pane?.clientWidth || 800);
    const height = (rect && rect.height > 0) ? rect.height : (pane?.clientHeight || 800);
    const minDim = Math.min(width, height) * 0.85;
    const fitScale = clampNumber(minDim / (2 * (State.boundaryRadius || 200)), 0.04, 25.0, 0.38);

    const activeKey = State.activePattern || 'kryst';
    State.transforms[activeKey] = { panX: 0, panY: 0, scale: fitScale };

    const svg = document.getElementById('svgMain') || document.getElementById('svgKryst');
    if (svg) {
      SVGRenderer.updateViewBox(svg, State.transforms[activeKey]);
    }
    App.renderAll();
  },

  removeHighlightedCircles() {
    if (!State.highlightedIds || State.highlightedIds.size === 0) {
      this.showToast('No circles highlighted. Click circles to highlight them first.');
      return;
    }
    const count = State.highlightedIds.size;
    if (!State.disabledCircleIds) State.disabledCircleIds = new Set();
    State.highlightedIds.forEach(id => State.disabledCircleIds.add(id));
    State.highlightedIds.clear();
    this.hideRemoveCirclesPopup();

    const svgIds = ['svgMain', 'svgKryst', 'svgLife'];
    svgIds.forEach(sid => {
      if (typeof SVGRenderer !== 'undefined' && SVGRenderer.updateHighlights) {
        SVGRenderer.updateHighlights(sid);
      }
    });
    this.updateSidebarStats();
    if (typeof App !== 'undefined' && App.renderAll) {
      App.renderAll();
    }
    this.showToast(`Removed ${count} highlighted circle${count === 1 ? '' : 's'}.`);
  },

  // Alias for backward compatibility
  toggleRemoveCirclesMode() {
    return this.removeHighlightedCircles();
  },

  updateSidebarStats() {
    const boundEl = (typeof document !== 'undefined') ? document.getElementById('sidebarBoundRad') : null;
    if (boundEl) {
      boundEl.textContent = `${Math.round(State.boundaryRadius)}px (${(State.boundaryRadius / State.r).toFixed(1)}r)`;
    }
    const hlEl = (typeof document !== 'undefined') ? document.getElementById('sidebarHighlightCount') : null;
    if (hlEl) {
      hlEl.textContent = String(State.highlightedIds.size);
    }
    const disEl = (typeof document !== 'undefined') ? document.getElementById('sidebarDisabledCount') : null;
    if (disEl) {
      disEl.textContent = String(State.disabledCircleIds.size);
    }
  }
};

if (typeof window !== 'undefined') {
  window.UI = UI;
  window.TutorialManager = TutorialManager;
}



/* --- js/main.js --- */
/**
 * SACRED GEOMETRY STUDIO — MAIN ENTRY POINT
 * Coordinates state, renderer, interactions, and exports.
 */







const App = {
  panZoomControllers: [],
  _resizeRaf: null,

  init() {
    // Expose globally for developer console debugging & backward compatibility
    window.App = App;
    window.State = State;
    window.AppState = State;
    window.AppGeometry = SacredMath.getKrystGeometry(State.N || 2, 1.0);
    window.SacredMath = SacredMath;
    window.SacredMath3D = SacredMath3D;
    window.SVGRenderer = SVGRenderer;
    window.Renderer3D = Renderer3D;
    window.UI = UI;
    window.PresetsManager = PresetsManager;
    window.Exporter = Exporter;
    window.exportOpenSCAD = exportOpenSCAD;
    window.openOpenSCADDialog = () => UI.openScadDialog();
    window.closeOpenSCADDialog = () => UI.closeScadDialog();

    UI.init();

    if (document.getElementById('svgMain')) {
      this.panZoomControllers.push(new PanZoomController('svgWrapperMain', 'svgMain', 'kryst'));
    }
    if (document.getElementById('svgLife')) {
      this.panZoomControllers.push(new PanZoomController('svgWrapperLife', 'svgLife', 'life'));
    }
    if (document.getElementById('svgKryst')) {
      this.panZoomControllers.push(new PanZoomController('svgWrapperKryst', 'svgKryst', 'kryst'));
    }

    // Initialize 3D WebGL renderer lazily or on demand (Frozen E-02)
    try {
      Renderer3D.init();
    } catch (e) {
      console.warn('3D WebGL engine deferred initialization:', e);
    }

    // RAF-throttled window resize handler
    window.addEventListener('resize', () => {
      if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
      this._resizeRaf = requestAnimationFrame(() => {
        this._resizeRaf = null;
        this.renderAll();
      });
    });

    // Initial render and fit
    this.renderAll();
    requestAnimationFrame(() => {
      UI.fitToScreen();
    });
  },

  renderAll() {
    if (State.dimension === '3d') {
      Renderer3D.renderAll();
      if (typeof State !== 'undefined' && State.currentGeometryStats) {
        window.AppGeometry = State.currentGeometryStats;
      }
      return;
    }
    if (typeof UI !== 'undefined') {
      UI._auraCircleElements = null;
    }
    if (document.getElementById('svgMain')) {
      const pattern = State.activePattern || 'kryst';
      SVGRenderer.render('svgMain', pattern, State.transforms[pattern] || State.transforms.kryst);
    } else {
      SVGRenderer.render('svgLife', 'life', State.transforms.life);
      SVGRenderer.render('svgKryst', 'kryst', State.transforms.kryst);
    }
    if (typeof State !== 'undefined' && State.currentGeometryStats) {
      window.AppGeometry = State.currentGeometryStats;
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  setTimeout(() => App.init(), 0);
}




  window.SacredGeometry = {
    Geometry: SacredMath,
    SacredMath,
    SacredMath3D,
    State,
    SVGRenderer,
    Renderer3D,
    UI,
    Exporter,
    App
  };
  window.UI = UI;
  window.App = App;
  window.Renderer3D = Renderer3D;
  window.SacredMath3D = SacredMath3D;
  window.SacredMath = SacredMath;
  window.State = State;
  window.SVGRenderer = SVGRenderer;
  window.PresetsManager = PresetsManager;
  window.Exporter = Exporter;
  window.exportOpenSCAD = exportOpenSCAD;
  window.AppState = State;

})(window, document);
