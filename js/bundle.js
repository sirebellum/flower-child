/**
 * SACRED GEOMETRY STUDIO — STANDALONE BUNDLE
 * Enables seamless execution on both file:/// direct protocol and local HTTP server.
 * Pure standalone bundle with full 2D SVG and 3D FCC WebGL engines.
 */
(function(window, document) {
  'use strict';

  /* =========================================================================
     1. MATHEMATICAL GEOMETRY ENGINE (js/geometry.js)
     ========================================================================= */
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

  // 2. 6 Hexagon Ring Circles
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
    const theta = m * (Math.PI / 3);
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
  // -----------------------------------------------------------------------
  for (let m = 0; m < 6; m++) {
    const phi = m * (Math.PI / 3) + (Math.PI / 6);
    const hx = cx + STAMP_STEP * r * Math.cos(phi);
    const hy = cy + STAMP_STEP * r * Math.sin(phi);
    outerHexagonCenters.push({ x: hx, y: hy });

    // 1. Outer Hexagon Center Circle (only if not at global origin (0, 0))
    if (Math.hypot(hx, hy) > EPSILON * r) {
      circles.push({ x: hx, y: hy, role: 'hexagon-center' });
    }

    // 2. Outer Hexagon 6 Ring Circles (Flower of Kryst concentric hexagons are unrotated)
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
    const theta = m * (Math.PI / 3);
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
   3. ITERATIVE RESTAMPING OUTWARD (getKrystGeometry)
   ========================================================================= */

/**
 * Iterative Restamping Outward Engine:
 * Restamps outward from (0, 0) across hexagon centers using layer count N >= 1.
 *
 * @param {number} N - Layer count (N >= 1).
 * @param {number} r - Base circle radius.
 * @returns {{points: Array<{x: number, y: number, role: string, layer?: number}>, circles: Array<{x: number, y: number, role: string, layer?: number}>, guides: Array<{type: string, cx: number, cy: number, radius?: number, vertices?: Array<{x: number, y: number}>}>, boundingRadius: number, activeStampCenters: Array<{x: number, y: number}>}}
 */
function getKrystGeometry(N, r) {
  if (N <= 0) {
    return {
      points: [],
      circles: [],
      guides: [],
      boundingRadius: 2 * r,
      activeStampCenters: []
    };
  }

  // 1. Breadth-First Stamp Expansion Across Hexagon Centers
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
        const phi = m * (Math.PI / 3) + (Math.PI / 6);
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

  // 2. Stamp, Deduplicate & Enforce Global Origin Rule
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

  // Deduplicate circles using spatial hash grid
  const cellSize = 2 * r;
  const grid = new Map();
  const dedupedCircles = [];
  const tolSq = (EPSILON * r) * (EPSILON * r);

  for (const pt of rawCircles) {
    // Global Origin Safeguard: Filter out any circle whose coordinates satisfy hypot(x, y) < EPSILON * r
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
      // Preserve hexagon / hexagon-center priority
      if ((pt.role === 'hexagon' || pt.role === 'hexagon-center') && found.role === 'triangle') {
        found.role = pt.role;
      }
      found.layer = Math.min(found.layer, pt.layer);
    } else {
      const newPt = { ...pt };
      dedupedCircles.push(newPt);
      const key = `${gx},${gy}`;
      let cell = grid.get(key);
      if (!cell) {
        cell = [];
        grid.set(key, cell);
      }
      cell.push(newPt);
    }
  }

  // Deduplicate guides by centroid (cx, cy) and type
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
      if (!cell) {
        cell = [];
        guideGrid.set(key, cell);
      }
      cell.push(g);
    }
  }

  // Dynamic Outer Bounding Circle Radius: max_i sqrt(x_i^2 + y_i^2) + 2r
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
 * Layer 2 (First outer ring): +30°
 * Layer 3 (Third ring): -30° (or 330°)
 * Alternating valley nesting: k % 2 === 0 ? 30 : -30 for k >= 2.
 *
 * @param {number} k - Concentric layer index (k >= 1)
 * @returns {number} Rotation angle in degrees
 */
function getFlowerOfLifeLayerRotation(k) {
  if (k <= 1) return 0;
  return (k % 2 === 0) ? 30 : -30;
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
  const fokGeom = getKrystGeometry(N, r);
  const fokBound = fokGeom.boundingRadius || (2 * r);
  return Math.max(1, Math.round((fokBound - 2 * r) / (2 * r)));
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
  getFlowerOfLifeGeometry,
  getFlowerOfLifeLayerRotation,

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
    return (2 * K + 2) * r;
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
   * Generates all circle center node objects for Flower of Kryst up to layer N.
   * Adapts the deduplicated array of coordinates for SVG rendering and interactivity.
   */
  generateFlowerOfKrystPoints(N, r) {
    const geom = this.getKrystGeometry(N, r);
    return geom.points.map((pt, idx) => {
      const d = Math.hypot(pt.x, pt.y);
      let angleDeg = Math.atan2(pt.y, pt.x) * RAD_TO_DEG;
      if (angleDeg < 0) angleDeg += 360;
      return {
        id: `fok_${pt.role || 'kryst'}_${idx}`,
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
        id: `eye_${m}`,
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
   * Computes intersection points of circles for rendering analytical intersection nodes.
   */
  computeIntersectionNodes(points, R) {
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
  }
};



  /* =========================================================================
     2. 3D FCC MATHEMATICAL GEOMETRY ENGINE (js/geometry3d.js)
     ========================================================================= */
/**
 * SACRED GEOMETRY 3D MATHEMATICAL ENGINE (js/geometry3d.js)
 * Implements 3D Face-Centered Cubic (FCC, ABCABC...) close-packing,
 * Vector Equilibrium (Cuboctahedron), and 3D Kryst Stamp expansion.
 * Pure mathematical functions with no DOM or global state access.
 */


/* =========================================================================
   1. CORE 3D FCC CONSTANTS
   ========================================================================= */

const SQRT6 = Math.sqrt(6);

// Vertical spacing between adjacent close-packed FCC (111) planes (A -> B -> C):
// Δz = 2r * √(2/3) = (2√6 / 3) * r ≈ 1.63299316 * r
const FCC_DZ = (2 * SQRT6 / 3);

// XY radial distance from a hexagon center to its 3 upper (B) or 3 lower (C) triangular pocket centers:
// d_pocket = 2r / √3 = (2√3 / 3) * r ≈ 1.15470054 * r
const FCC_POCKET_R = (2 * SQRT3 / 3);

// 2D Kryst Stamp Constants




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

  // 6 In-Plane Stamp Vectors (Δz = 0) along 30° + m * 60°
  for (let m = 0; m < 6; m++) {
    const phi = m * (Math.PI / 3) + (Math.PI / 6);
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
    const theta = m * (Math.PI / 3);
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

  // C. 6 Outer Hexagons (Centers along 30° + m * 60° at distance (4 + 2√3)r)
  for (let m = 0; m < 6; m++) {
    const phi = m * (Math.PI / 3) + (Math.PI / 6);
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
    const theta = m * (Math.PI / 3);
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
 * Generates the full 3D Flower of Kryst geometry restamped out to N layers.
 * Strictly guarantees the Central Zero-Point Void at (0, 0, 0) remains empty.
 * Deduplicates overlapping spheres using 3D spatial hashing, giving priority
 * to 'hexagon-center' and 'hexagon' roles over 'triangle'.
 *
 * @param {number} N - Layer count (N >= 1).
 * @param {number} r - Base radius.
 * @param {Object} [options={}] - Options { expansionMode: 'volumetric'|'stratified' }.
 * @returns {{spheres: Array<Object>, guides: Array<Object>, boundingRadius: number, activeStampCenters: Array<Object>}}
 */
function getKryst3DGeometry(N, r, options = {}) {
  const expansionMode = options.expansionMode || 'volumetric';

  if (N <= 0) {
    return { spheres: [], guides: [], boundingRadius: 2 * r, activeStampCenters: [] };
  }

  const stampVectors = getKrystStampVectors(r, expansionMode);
  const tol = EPSILON * r;
  const tolSq = tol * tol;
  const cellSize = 2 * r;

  // 1. Breadth-First Stamp Centers Expansion across 3D Lattice
  const activeStampCenters = [{ x: 0, y: 0, z: 0, ring: 0 }];
  const visitedStampCenters = [{ x: 0, y: 0, z: 0 }];
  let frontier = [{ x: 0, y: 0, z: 0 }];

  const isCenterVisited = (cand) => {
    for (let i = 0; i < visitedStampCenters.length; i++) {
      const v = visitedStampCenters[i];
      const dSq = (v.x - cand.x) ** 2 + (v.y - cand.y) ** 2 + (v.z - cand.z) ** 2;
      if (dSq < tolSq) return true;
    }
    return false;
  };

  for (let step = 2; step <= N; step++) {
    const nextFrontier = [];
    for (let f = 0; f < frontier.length; f++) {
      const c = frontier[f];
      for (let v = 0; v < stampVectors.length; v++) {
        const vec = stampVectors[v];
        const cand = {
          x: c.x + vec.x,
          y: c.y + vec.y,
          z: c.z + vec.z,
          ring: step - 1
        };
        if (!isCenterVisited(cand)) {
          visitedStampCenters.push(cand);
          activeStampCenters.push(cand);
          nextFrontier.push(cand);
        }
      }
    }
    frontier = nextFrontier;
  }

  // 2. Generate and Deduplicate Spheres
  const rawSpheres = [];
  const rawGuides = [];

  for (let cIdx = 0; cIdx < activeStampCenters.length; cIdx++) {
    const c = activeStampCenters[cIdx];
    const stamp = createKrystStamp3D(c.x, c.y, c.z, r);
    for (let i = 0; i < stamp.spheres.length; i++) {
      rawSpheres.push({
        ...stamp.spheres[i],
        layer: (c.ring || 0) + 1,
        stampCenter: c
      });
    }
    for (let g = 0; g < stamp.guides.length; g++) {
      rawGuides.push(stamp.guides[g]);
    }
  }

  // Spatial hash grid for spheres
  const grid = new Map();
  const dedupedSpheres = [];

  for (let i = 0; i < rawSpheres.length; i++) {
    const pt = rawSpheres[i];

    // STRICT GLOBAL ZERO-POINT VOID INVARIANT:
    // Filter out any sphere whose distance from (0, 0, 0) < tol
    if (Math.hypot(pt.x, pt.y, pt.z) < tol) {
      continue;
    }

    const gx = Math.floor(pt.x / cellSize);
    const gy = Math.floor(pt.y / cellSize);
    const gz = Math.floor(pt.z / cellSize);
    let found = null;

    for (let dx = -1; dx <= 1 && !found; dx++) {
      for (let dy = -1; dy <= 1 && !found; dy++) {
        for (let dz = -1; dz <= 1 && !found; dz++) {
          const key = `${gx + dx},${gy + dy},${gz + dz}`;
          const cell = grid.get(key);
          if (cell) {
            for (let j = 0; j < cell.length; j++) {
              const o = cell[j];
              const distSq = (o.x - pt.x) ** 2 + (o.y - pt.y) ** 2 + (o.z - pt.z) ** 2;
              if (distSq < tolSq) {
                found = o;
                break;
              }
            }
          }
        }
      }
    }

    if (found) {
      // Prioritize hexagon roles over triangle
      if ((pt.role === 'hexagon-center' || pt.role === 'hexagon') && found.role === 'triangle') {
        found.role = pt.role;
      }
      found.layer = Math.min(found.layer, pt.layer);
    } else {
      const newPt = {
        id: `fok3d_${dedupedSpheres.length}`,
        ...pt
      };
      dedupedSpheres.push(newPt);
      const key = `${gx},${gy},${gz}`;
      let cell = grid.get(key);
      if (!cell) {
        cell = [];
        grid.set(key, cell);
      }
      cell.push(newPt);
    }
  }

  // 3. Deduplicate Guide Line Segments
  const guideEdgeMap = new Map();
  const dedupedGuides = [];
  const coordTol = Math.max(1, Math.round(tol));

  const quantizePt = (p) => {
    const qx = Math.round(p.x / coordTol);
    const qy = Math.round(p.y / coordTol);
    const qz = Math.round(p.z / coordTol);
    return `${qx},${qy},${qz}`;
  };

  for (let i = 0; i < rawGuides.length; i++) {
    const g = rawGuides[i];
    const k1 = quantizePt(g.p1);
    const k2 = quantizePt(g.p2);
    if (k1 === k2) continue; // Zero-length segment

    const edgeKey = (k1 < k2) ? `${k1}:${k2}` : `${k2}:${k1}`;
    if (!guideEdgeMap.has(edgeKey)) {
      guideEdgeMap.set(edgeKey, true);
      dedupedGuides.push(g);
    }
  }

  // Bounding radius
  let maxD = 0;
  for (let i = 0; i < dedupedSpheres.length; i++) {
    const d = Math.hypot(dedupedSpheres[i].x, dedupedSpheres[i].y, dedupedSpheres[i].z);
    if (d > maxD) maxD = d;
  }
  const boundingRadius = (dedupedSpheres.length > 0) ? (maxD + 2 * r) : (2 * r);

  return {
    spheres: dedupedSpheres,
    guides: dedupedGuides,
    boundingRadius,
    activeStampCenters
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
  FCC_POCKET_R,
  DIST_TRI_INNER,
  DIST_TRI_APEX,
  STAMP_STEP,
  EPSILON,

  getFCCPlane,
  getFCCBasisVectors,
  getKrystStampVectors,
  getLife3DGeometry,
  createKrystStamp3D,
  getKryst3DGeometry,
  getTriAxialGeometry
};



  /* =========================================================================
     3. GLOBAL APPLICATION STATE (js/state.js)
     ========================================================================= */
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
  viewportMode: 'comparison', // 'comparison' | 'superimposed' | 'single-life' | 'single-kryst'
  activePreset: 'krystonial_comparison',
  viewStyle: 'actual', // 'actual' | 'base' | 'combined'
  platonicFilter: 'all', // 'all' | 'tetra' | 'cube' | 'octa' | 'dodeca'

  // Lattice Geometry (guarded with safe limits)
  N: 2,
  r: 50,
  syncPanZoom: true,

  // Layers visibility
  showActualFlower: true,
  showBaseCircles: false,
  showGuides: true,
  showOuterRing: true,
  showBoundaryPetals: true,
  showCenterDots: true,
  showIntersections: false,
  showRadialAxes: false,
  showMetatronLines: false,
  showEyesOfKryst: false,

  // Aesthetics
  colorByLayer: false,
  enableGlow: true,
  enablePulse: false,
  sphericalShading: false,

  // Curated Colors
  colorLife: '#ef4444',
  colorKryst: '#06b6d4',
  colorBase: '#3b82f6',
  colorTriangle: '#eab308',
  colorGuide: '#ea580c',
  colorOuter: '#f59e0b',
  colorAxes: '#64748b',
  colorBg: '#07090e',

  // Strokes & Opacities
  strokeFlower: 1.5,
  strokeBase: 1.0,
  strokeGuide: 2.0,
  fillOpacity: 0.04,

  // Selections & Highlights
  highlightedIds: new Set(),
  hoveredItem: null,

  // Pan & Zoom Transform States
  transforms: {
    life: { panX: 0, panY: 0, scale: 0.38 },
    kryst: { panX: 0, panY: 0, scale: 0.38 }
  },

  // 3D WebGL Engine States
  dimension: '2d', // '2d' | '3d'
  model3D: 'triaxial', // 'triaxial' (90° Rotated Axis & Infill) | 'fcc' (Face-Centered Cubic)
  triaxialInfill: 'both', // 'both' | 'angular' | 'grid' | 'planes'
  infillSteps: 2, // 1 to 4
  showPlaneXY: true,
  showPlaneXZ: true,
  showPlaneYZ: true,
  showInfill3D: true,
  showAxialRims: true,
  fccPlaneFilter: 'all', // 'all' | 'A' | 'B' | 'C'
  fccExpansionMode: 'volumetric', // 'volumetric' | 'stratified'
  show3DSpheres: true,
  show3DTorus: false,
  show3DShells: false,
  show3DGuides: true,
  showZeroPointMarker: true,
  sliceZ: 100, // -100 to 100 (%)
  autoRotate3D: false,
  sphereOpacity: 0.35, // Translucent spheres by default
  sphereRoughness: 0.15,
  sphereMetalness: 0.1,
  cameraPreset3D: 'isometric',

  /**
   * Clamps and sets layer count N safely.
   * @param {number} n
   */
  setN(n) {
    this.N = clampNumber(n, 1, 24, 2);
  },

  /**
   * Clamps and sets base circle radius r safely.
   * @param {number} radius
   */
  setRadius(radius) {
    this.r = clampNumber(radius, 15, 200, 50);
  },

  clampNumber(val, min, max, defaultVal) {
    return clampNumber(val, min, max, defaultVal);
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

/* =========================================================================
   PRESETS CONFIGURATION ENGINE & MANAGER
   ========================================================================= */
const PresetsManager = {
  STORAGE_KEY: 'sacred_geometry_custom_presets_v1',
  OVERRIDE_KEY: 'sacred_geometry_builtin_overrides_v1',

  builtinPresets: [
    {
      id: 'krystonial_comparison',
      title: 'Krystonial Dual',
      subtitle: 'Life 19 vs Kryst 18 (N=2)',
      isBuiltin: true,
      config: {
        N: 2,
        r: 50,
        viewportMode: 'comparison',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: true,
        showOuterRing: true,
        showBoundaryPetals: true,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'superimposed_divergence',
      title: 'Phase Divergence',
      subtitle: 'FoL vs FoK Superimposed',
      isBuiltin: true,
      config: {
        N: 2,
        r: 50,
        viewportMode: 'superimposed',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: true,
        showOuterRing: true,
        showBoundaryPetals: true,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: true,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'seed_of_life',
      title: 'Seed of Life',
      subtitle: 'N=1 Genesis Core (7 Circles)',
      isBuiltin: true,
      config: {
        N: 1,
        r: 50,
        viewportMode: 'single-life',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: false,
        showOuterRing: true,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'egg_of_life',
      title: 'Egg of Life',
      subtitle: 'Spherical Volumetric Tangent',
      isBuiltin: true,
      config: {
        N: 1,
        r: 50,
        viewportMode: 'single-life',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: true,
        showGuides: false,
        showOuterRing: false,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: true,
        showEyesOfKryst: false,
        fillOpacity: 0.12
      }
    },
    {
      id: 'fruit_of_life',
      title: 'Fruit of Life',
      subtitle: '13 Tangent Circles (Radius r)',
      isBuiltin: true,
      config: {
        N: 2,
        r: 50,
        viewportMode: 'single-life',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: false,
        showBaseCircles: true,
        showGuides: false,
        showOuterRing: true,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'metatrons_cube',
      title: "Metatron's Cube",
      subtitle: '13 Centers + 78 Chords',
      isBuiltin: true,
      config: {
        N: 2,
        r: 50,
        viewportMode: 'single-life',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: false,
        showBaseCircles: true,
        showGuides: false,
        showOuterRing: true,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: true,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'kryst_seed',
      title: 'Kryst Seed',
      subtitle: '6-Petal Zero-Point Core',
      isBuiltin: true,
      config: {
        N: 1,
        r: 50,
        viewportMode: 'single-kryst',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: true,
        showOuterRing: true,
        showBoundaryPetals: true,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'kryst_18_standard',
      title: 'Kryst 18-Standard',
      subtitle: 'True Circle Ring 2 (N=2)',
      isBuiltin: true,
      config: {
        N: 2,
        r: 50,
        viewportMode: 'single-kryst',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: true,
        showOuterRing: true,
        showBoundaryPetals: true,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'fruit_of_kryst',
      title: 'Fruit of Kryst',
      subtitle: '30 Circles (6+12+12) Scalloped 12-Lobe',
      isBuiltin: true,
      config: {
        N: 3,
        r: 50,
        viewportMode: 'single-kryst',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: false,
        showOuterRing: false,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        colorKryst: '#16a34a',
        fillOpacity: 0.05
      }
    },
    {
      id: 'eyes_of_kryst',
      title: 'Eyes of Kryst',
      subtitle: '3 Pairs of Eyes in Magenta Vesica',
      isBuiltin: true,
      config: {
        N: 3,
        r: 50,
        viewportMode: 'single-kryst',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: false,
        showOuterRing: false,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: true,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: true,
        colorKryst: '#16a34a',
        fillOpacity: 0.05
      }
    },
    {
      id: 'word_of_kryst',
      title: 'Word of Kryst',
      subtitle: '7-Cluster Tiled Stamp Lattice (N=4)',
      isBuiltin: true,
      config: {
        N: 4,
        r: 50,
        viewportMode: 'single-kryst',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: false,
        showOuterRing: true,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        colorKryst: '#16a34a',
        fillOpacity: 0.05
      }
    },
    {
      id: 'water_of_kryst',
      title: 'Water of Kryst',
      subtitle: '19-Cluster Tiled Stamp Lattice (N=5)',
      isBuiltin: true,
      config: {
        N: 5,
        r: 50,
        viewportMode: 'single-kryst',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: false,
        showOuterRing: true,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        colorKryst: '#16a34a',
        fillOpacity: 0.05
      }
    },
    {
      id: 'vesica_piscis',
      title: 'Vesica Piscis',
      subtitle: 'Dual Circle (√3 Ratio)',
      isBuiltin: true,
      config: {
        N: 1,
        r: 50,
        viewportMode: 'single-life',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: true,
        showGuides: false,
        showOuterRing: false,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'kathara_alignment',
      title: 'Kathara 12-Tree',
      subtitle: '12-Point Morphic Grid',
      isBuiltin: true,
      config: {
        N: 3,
        r: 50,
        viewportMode: 'comparison',
        viewStyle: 'actual',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: true,
        showOuterRing: true,
        showBoundaryPetals: true,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: true,
        showMetatronLines: true,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'fcc_vector_equilibrium',
      title: '3D Vector Equilibrium',
      subtitle: '13-Sphere Cuboctahedron (FoL K=1 vs FoK N=1)',
      isBuiltin: true,
      config: {
        dimension: '3d',
        N: 1,
        r: 50,
        viewportMode: 'comparison',
        fccExpansionMode: 'volumetric',
        fccPlaneFilter: 'all',
        show3DSpheres: true,
        show3DGuides: true,
        showZeroPointMarker: true,
        sliceZ: 100,
        fillOpacity: 0.04
      }
    },
    {
      id: 'fcc_kryst_matrix_3d',
      title: '3D Kryst Void Matrix',
      subtitle: 'Hollow Zero-Point Core FCC Packing (N=2)',
      isBuiltin: true,
      config: {
        dimension: '3d',
        N: 2,
        r: 50,
        viewportMode: 'comparison',
        fccExpansionMode: 'volumetric',
        fccPlaneFilter: 'all',
        show3DSpheres: true,
        show3DGuides: true,
        showZeroPointMarker: true,
        sliceZ: 100,
        fillOpacity: 0.04
      }
    },
    {
      id: 'fcc_cleavage_slice',
      title: 'FCC (111) Slicer',
      subtitle: 'Cross-Section Revealing ABC Layer Pockets',
      isBuiltin: true,
      config: {
        dimension: '3d',
        N: 2,
        r: 50,
        viewportMode: 'comparison',
        fccExpansionMode: 'volumetric',
        fccPlaneFilter: 'all',
        show3DSpheres: true,
        show3DGuides: true,
        showZeroPointMarker: true,
        sliceZ: 20,
        fillOpacity: 0.04
      }
    }
  ],

  customPresets: [],
  builtinOverrides: {},

  init() {
    this.loadFromStorage();
  },

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      this.customPresets = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(this.customPresets)) this.customPresets = [];
    } catch (e) {
      console.warn('Failed to load custom presets from storage:', e);
      this.customPresets = [];
    }
    try {
      const overrides = localStorage.getItem(this.OVERRIDE_KEY);
      this.builtinOverrides = overrides ? JSON.parse(overrides) : {};
      if (typeof this.builtinOverrides !== 'object' || this.builtinOverrides === null) {
        this.builtinOverrides = {};
      }
    } catch (e) {
      this.builtinOverrides = {};
    }
  },

  saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.customPresets));
      localStorage.setItem(this.OVERRIDE_KEY, JSON.stringify(this.builtinOverrides));
    } catch (e) {
      console.error('Failed to save presets to storage:', e);
    }
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
    return this.getAllPresets().find(p => p.id === id);
  },

  addCustomPreset(preset) {
    if (!preset.id) {
      preset.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
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
    const customIndex = this.customPresets.findIndex(p => p.id === id);
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
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.OVERRIDE_KEY);
    } catch (_) {}
    this.renderPresetGrid();
  },

  captureCurrentStudioConfig() {
    return {
      N: State.N,
      r: State.r,
      viewportMode: State.viewportMode,
      viewStyle: State.viewStyle,
      platonicFilter: State.platonicFilter,
      showActualFlower: State.showActualFlower,
      showBaseCircles: State.showBaseCircles,
      showGuides: State.showGuides,
      showOuterRing: State.showOuterRing,
      showBoundaryPetals: State.showBoundaryPetals,
      showCenterDots: State.showCenterDots,
      showIntersections: State.showIntersections,
      showRadialAxes: State.showRadialAxes,
      showMetatronLines: State.showMetatronLines,
      showEyesOfKryst: State.showEyesOfKryst,
      sphericalShading: State.sphericalShading,
      fillOpacity: State.fillOpacity,
      colorLife: State.colorLife,
      colorKryst: State.colorKryst,
      colorBase: State.colorBase,
      colorTriangle: State.colorTriangle || '#eab308',
      colorGuide: State.colorGuide,
      colorOuter: State.colorOuter,
      colorAxes: State.colorAxes,
      strokeFlower: State.strokeFlower,
      strokeBase: State.strokeBase,
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
      showZeroPointMarker: State.showZeroPointMarker,
      sliceZ: State.sliceZ,
      sphereOpacity: State.sphereOpacity,
      sphereRoughness: State.sphereRoughness,
      sphereMetalness: State.sphereMetalness
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
    const grid = document.getElementById('presetGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const allPresets = this.getAllPresets();
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
            <button class="preset-action-btn edit-preset-btn" title="Configure / Edit Preset" aria-label="Configure preset ${preset.title}" data-preset="${preset.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
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
              if (window.UI?.applyPreset) window.UI.applyPreset('krystonial_comparison');
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

  openNew() {
    this.currentEditingId = null;
    const modalTitle = document.getElementById('presetModalTitle');
    const inputName = document.getElementById('presetInputName');
    const inputSubtitle = document.getElementById('presetInputSubtitle');
    const modal = document.getElementById('presetConfigModal');

    if (modalTitle) modalTitle.textContent = 'Create New Sacred Preset';
    if (inputName) inputName.value = `Sacred Grid ${PresetsManager.getAllPresets().length + 1}`;
    if (inputSubtitle) inputSubtitle.value = `Custom N=${State.N} (${State.viewportMode})`;

    this.populateFormFromConfig(PresetsManager.captureCurrentStudioConfig());
    if (modal) modal.classList.add('open');
  },

  openEdit(presetId) {
    const preset = PresetsManager.getPreset(presetId);
    if (!preset) return;
    this.currentEditingId = presetId;

    const modalTitle = document.getElementById('presetModalTitle');
    const inputName = document.getElementById('presetInputName');
    const inputSubtitle = document.getElementById('presetInputSubtitle');
    const modal = document.getElementById('presetConfigModal');

    if (modalTitle) modalTitle.textContent = `Configure Preset: ${preset.title}`;
    if (inputName) inputName.value = preset.title;
    if (inputSubtitle) inputSubtitle.value = preset.subtitle || '';

    this.populateFormFromConfig(preset.config);
    if (modal) modal.classList.add('open');
  },

  populateFormFromConfig(cfg) {
    const N = clampNumber(cfg.N, 1, 24, State.N);
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
    if (elViewStyle) elViewStyle.value = cfg.viewStyle || State.viewStyle || 'actual';

    const checkMap = [
      { id: 'presetFormShowActual', val: cfg.showActualFlower ?? State.showActualFlower },
      { id: 'presetFormShowBase', val: cfg.showBaseCircles ?? State.showBaseCircles },
      { id: 'presetFormShowGuides', val: cfg.showGuides ?? State.showGuides },
      { id: 'presetFormShowOuterRing', val: cfg.showOuterRing ?? State.showOuterRing },
      { id: 'presetFormShowBoundaryPetals', val: cfg.showBoundaryPetals ?? State.showBoundaryPetals },
      { id: 'presetFormShowCenterDots', val: cfg.showCenterDots ?? State.showCenterDots },
      { id: 'presetFormShowIntersections', val: cfg.showIntersections ?? State.showIntersections },
      { id: 'presetFormShowRadialAxes', val: cfg.showRadialAxes ?? State.showRadialAxes },
      { id: 'presetFormShowMetatron', val: cfg.showMetatronLines ?? State.showMetatronLines },
      { id: 'presetFormShowEyes', val: cfg.showEyesOfKryst ?? State.showEyesOfKryst },
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
    const showEyesEl = document.getElementById('presetFormShowEyes');
    const elN = document.getElementById('presetFormN');
    const elR = document.getElementById('presetFormR');

    return {
      N: clampNumber(elN?.value, 1, 24, 2),
      r: clampNumber(elR?.value, 15, 200, 50),
      viewportMode: document.getElementById('presetFormViewport')?.value || 'comparison',
      viewStyle: document.getElementById('presetFormViewStyle')?.value || 'actual',
      showActualFlower: Boolean(document.getElementById('presetFormShowActual')?.checked),
      showBaseCircles: Boolean(document.getElementById('presetFormShowBase')?.checked),
      showGuides: Boolean(document.getElementById('presetFormShowGuides')?.checked),
      showOuterRing: Boolean(document.getElementById('presetFormShowOuterRing')?.checked),
      showBoundaryPetals: Boolean(document.getElementById('presetFormShowBoundaryPetals')?.checked),
      showCenterDots: Boolean(document.getElementById('presetFormShowCenterDots')?.checked),
      showIntersections: Boolean(document.getElementById('presetFormShowIntersections')?.checked),
      showRadialAxes: Boolean(document.getElementById('presetFormShowRadialAxes')?.checked),
      showMetatronLines: Boolean(document.getElementById('presetFormShowMetatron')?.checked),
      showEyesOfKryst: showEyesEl ? Boolean(showEyesEl.checked) : State.showEyesOfKryst,
      platonicFilter: document.getElementById('presetFormPlatonic')?.value || 'all',
      sphericalShading: Boolean(document.getElementById('presetFormShading')?.checked),
      fillOpacity: State.fillOpacity,
      colorLife: State.colorLife,
      colorKryst: State.colorKryst,
      colorBase: State.colorBase,
      colorTriangle: State.colorTriangle || '#eab308',
      colorGuide: State.colorGuide,
      colorOuter: State.colorOuter,
      colorAxes: State.colorAxes,
      strokeFlower: State.strokeFlower,
      strokeBase: State.strokeBase,
      strokeGuide: State.strokeGuide
    };
  },

  save() {
    const inputName = document.getElementById('presetInputName');
    const inputSubtitle = document.getElementById('presetInputSubtitle');
    const title = (inputName?.value || '').trim() || 'Untitled Preset';
    const subtitle = (inputSubtitle?.value || '').trim() || '';
    const config = this.readConfigFromForm();

    if (this.currentEditingId) {
      PresetsManager.updatePreset(this.currentEditingId, { title, subtitle, config });
      if (window.UI?.showToast) window.UI.showToast(`Preset "${title}" updated.`);
      if (State.activePreset === this.currentEditingId && window.UI?.applyPreset) {
        window.UI.applyPreset(this.currentEditingId);
      }
    } else {
      const newPreset = PresetsManager.addCustomPreset({
        title,
        subtitle,
        config
      });
      if (window.UI?.showToast) window.UI.showToast(`Preset "${title}" created.`);
      if (window.UI?.applyPreset) window.UI.applyPreset(newPreset.id);
    }
    const modal = document.getElementById('presetConfigModal');
    if (modal) modal.classList.remove('open');
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



  /* =========================================================================
     4. SVG RENDERING ENGINE (js/renderer.js)
     ========================================================================= */
/**
 * SVG RENDERING ENGINE
 * SVG DOM generation, layers, clipPaths, annotations, and lightweight highlights.
 * Uses DocumentFragment for batched DOM insertion and scoped defs.
 */


/* =========================================================================
   SVG RENDERING ENGINE
   ========================================================================= */
const SVGRenderer = {
  SVG_NS: 'http://www.w3.org/2000/svg',

  /**
   * Fast spatial lookup map of rendered point objects keyed by point ID.
   * Enables O(1) point retrieval during delegated events and highlight updates.
   */
  pointsMap: new Map(),

  /**
   * Helper to create an SVG element with given namespace and attributes.
   * @param {string} tag - SVG element tag name.
   * @param {Record<string, string|number>} [attrs={}] - Attribute key-value pairs.
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
   * Initializes SVG Defs (Glow filters, Radial gradients, Clip paths) scoped by viewport ID.
   * Guarantees unique IDs across Side-by-Side and Superimposed views.
   *
   * @param {SVGSVGElement} svg - Target SVG element.
   * @param {string} idPrefix - Scoped ID prefix (e.g., 'svgLife', 'svgKryst').
   * @param {number} R_bound - Outer boundary radius for clipping.
   */
  setupDefs(svg, idPrefix, R_bound) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = this.createSvgElement('defs');
      svg.appendChild(defs);
    }
    defs.innerHTML = '';

    const defsFrag = document.createDocumentFragment();

    // 1. Scoped Glow Filter
    const filter = this.createSvgElement('filter', {
      id: `${idPrefix}-glow`,
      x: '-40%',
      y: '-40%',
      width: '180%',
      height: '180%'
    });
    const feGaussian = this.createSvgElement('feGaussianBlur', {
      stdDeviation: '3.5',
      result: 'blur'
    });
    const feMerge = this.createSvgElement('feMerge');
    const feMergeNode1 = this.createSvgElement('feMergeNode', { in: 'blur' });
    const feMergeNode2 = this.createSvgElement('feMergeNode', { in: 'SourceGraphic' });
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    filter.appendChild(feGaussian);
    filter.appendChild(feMerge);
    defsFrag.appendChild(filter);

    // 2. Scoped Boundary ClipPath for Outer Filler Petals
    const clipPath = this.createSvgElement('clipPath', {
      id: `${idPrefix}-bound-clip`
    });
    const clipCircle = this.createSvgElement('circle', {
      cx: '0',
      cy: '0',
      r: R_bound
    });
    clipPath.appendChild(clipCircle);
    defsFrag.appendChild(clipPath);

    // 3. Scoped Radial Sphere Gradient for Egg of Life 3D shading
    const radGrad = this.createSvgElement('radialGradient', {
      id: `${idPrefix}-sphere-grad`,
      cx: '35%',
      cy: '35%',
      r: '65%'
    });
    const stop1 = this.createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '0.75' });
    const stop2 = this.createSvgElement('stop', { offset: '50%', 'stop-color': State.colorLife, 'stop-opacity': '0.35' });
    const stop3 = this.createSvgElement('stop', { offset: '100%', 'stop-color': '#030712', 'stop-opacity': '0.75' });
    radGrad.appendChild(stop1);
    radGrad.appendChild(stop2);
    radGrad.appendChild(stop3);
    defsFrag.appendChild(radGrad);

    defs.appendChild(defsFrag);
  },

  /**
   * Renders complete geometry onto the specified SVG canvas using batched DocumentFragments.
   *
   * @param {string} svgId - DOM ID of target SVG element.
   * @param {'life'|'kryst'} patternType - Pattern mode.
   * @param {{panX: number, panY: number, scale: number}} transformState - Current pan/zoom transform.
   */
  render(svgId, patternType, transformState) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    const N = State.N;
    const r = State.r;
    const R = 2 * r;
    const R_bound = (patternType === 'kryst')
      ? SacredMath.getFoKBoundingRadius(N, r)
      : SacredMath.getFoLBoundingRadius(N, r);
    const idPrefix = svgId;

    // Ensure scoped defs are initialized
    this.setupDefs(svg, idPrefix, R_bound);

    // Remove previous render group
    const oldMain = svg.querySelector('.sacred-main-group');
    if (oldMain) oldMain.remove();

    const mainGroup = this.createSvgElement('g', {
      class: `sacred-main-group ${State.enablePulse ? 'sacred-pulse' : ''}`
    });

    // 1. Radial Symmetry Axes (12-fold / 30-degree dashed rays)
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

    // 2. Base Pattern Shape Guides (Hexagons & Circles)
    if (State.showGuides && (State.viewStyle === 'base' || State.viewStyle === 'combined' || State.showGuides)) {
      const guidesGroup = this.createSvgElement('g', { class: 'group-guides' });
      const guidesFrag = document.createDocumentFragment();

      if (patternType === 'life') {
        const lifeGeometry = SacredMath.getFlowerOfLifeGeometry(N, r);
        lifeGeometry.guides.forEach(g => {
          if (g.vertices && g.vertices.length > 0) {
            const pointsStr = g.vertices.map(v => `${v.x.toFixed(3)},${v.y.toFixed(3)}`).join(' ');
            guidesFrag.appendChild(this.createSvgElement('polygon', {
              points: pointsStr,
              fill: 'none',
              stroke: State.colorGuide,
              'stroke-width': State.strokeGuide,
              opacity: '0.85',
              filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none',
              'data-layer': g.layer,
              'data-rotation': g.rotationDeg
            }));
          }
        });
      } else {
        // Flower of Kryst: Guide shapes collected from active stamps (Hexagons & Triangles)
        const krystGeometry = SacredMath.getKrystGeometry(N, r);
        krystGeometry.guides.forEach(g => {
          if (g.vertices && g.vertices.length > 0) {
            const pointsStr = g.vertices.map(v => `${v.x.toFixed(3)},${v.y.toFixed(3)}`).join(' ');
            guidesFrag.appendChild(this.createSvgElement('polygon', {
              points: pointsStr,
              fill: 'none',
              stroke: State.colorGuide,
              'stroke-width': State.strokeGuide,
              opacity: '0.85',
              filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none'
            }));
          } else if (g.type === 'hexagon' && g.radius) {
            const pointsStr = [];
            for (let m = 0; m < 6; m++) {
              const angle = m * 60 * SacredMath.DEG_TO_RAD;
              const hx = g.cx + g.radius * Math.cos(angle);
              const hy = g.cy + g.radius * Math.sin(angle);
              pointsStr.push(`${hx.toFixed(3)},${hy.toFixed(3)}`);
            }
            guidesFrag.appendChild(this.createSvgElement('polygon', {
              points: pointsStr.join(' '),
              fill: 'none',
              stroke: State.colorGuide,
              'stroke-width': State.strokeGuide,
              opacity: '0.85',
              filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none'
            }));
          }
        });
      }
      guidesGroup.appendChild(guidesFrag);
      mainGroup.appendChild(guidesGroup);
    }

    // Generate points for the pattern
    let points = [];
    if (State.activePreset === 'fruit_of_life' || State.activePreset === 'metatrons_cube') {
      points = SacredMath.getFruitOfLifeCenters(r);
    } else if (patternType === 'life') {
      points = SacredMath.generateFlowerOfLifePoints(N, r);
    } else {
      points = SacredMath.generateFlowerOfKrystPoints(N, r);
    }

    // Cache points in pointsMap for O(1) lookup
    points.forEach(pt => this.pointsMap.set(pt.id, pt));

    // 3. Base Pattern Circles (Radius r)
    if (State.showBaseCircles || State.viewStyle === 'base' || State.viewStyle === 'combined' || State.activePreset === 'fruit_of_life' || State.activePreset === 'metatrons_cube') {
      const baseGroup = this.createSvgElement('g', { class: 'group-base-circles' });
      const baseFrag = document.createDocumentFragment();
      const renderedBase = [];
      const dedupTol = Math.max(0.5, 0.02 * r);

      points.forEach(pt => {
        if (renderedBase.some(rc => Math.hypot(rc.x - pt.x, rc.y - pt.y) < dedupTol)) return;
        renderedBase.push(pt);

        const isHighlighted = State.highlightedIds.has(pt.id);
        let baseStroke = State.colorBase;
        if (patternType === 'kryst') {
          if (pt.role === 'triangle') {
            baseStroke = State.colorTriangle || '#eab308';
          } else {
            baseStroke = State.colorBase || '#3b82f6';
          }
        }

        const circle = this.createSvgElement('circle', {
          cx: pt.x,
          cy: pt.y,
          r: r,
          fill: State.sphericalShading ? `url(#${idPrefix}-sphere-grad)` : (isHighlighted ? 'rgba(255,255,255,0.1)' : 'none'),
          stroke: isHighlighted ? '#ffffff' : baseStroke,
          'stroke-width': isHighlighted ? 2.8 : State.strokeBase,
          opacity: isHighlighted ? '1.0' : '0.8',
          class: `circle-node base-circle ${isHighlighted ? 'highlighted-circle' : ''}`,
          'data-circle-id': pt.id,
          'data-pattern': pt.pattern || patternType,
          'data-default-stroke': baseStroke
        });
        baseFrag.appendChild(circle);
      });
      baseGroup.appendChild(baseFrag);
      mainGroup.appendChild(baseGroup);
    }

    // 4. Completed Boundary Petals (Clipped Mode for Flower of Life)
    if (patternType === 'life' && State.showBoundaryPetals && (State.viewStyle === 'actual' || State.viewStyle === 'combined') && State.activePreset !== 'fruit_of_life' && State.activePreset !== 'metatrons_cube') {
      const clippedPetalsGroup = this.createSvgElement('g', {
        class: 'group-boundary-petals',
        'clip-path': `url(#${idPrefix}-bound-clip)`
      });
      const petalsFrag = document.createDocumentFragment();
      const virtualPoints = SacredMath.generateVirtualBoundaryPoints(N, r);
      virtualPoints.forEach(vpt => {
        petalsFrag.appendChild(this.createSvgElement('circle', {
          cx: vpt.x,
          cy: vpt.y,
          r: R,
          fill: State.colorLife,
          'fill-opacity': State.fillOpacity,
          stroke: State.colorLife,
          'stroke-width': State.strokeFlower,
          opacity: '0.55'
        }));
      });
      clippedPetalsGroup.appendChild(petalsFrag);
      mainGroup.appendChild(clippedPetalsGroup);
    }

    // 5. Actual Flower Overlapping Circles (Radius R = 2r)
    if (State.showActualFlower && (State.viewStyle === 'actual' || State.viewStyle === 'combined') && State.activePreset !== 'fruit_of_life' && State.activePreset !== 'metatrons_cube') {
      const actualGroup = this.createSvgElement('g', { class: 'group-actual-flower' });
      const actualFrag = document.createDocumentFragment();
      const flowerColor = (patternType === 'life') ? State.colorLife : State.colorKryst;
      const renderedActual = [];
      const dedupTol = Math.max(0.5, 0.02 * r);

      points.forEach(pt => {
        if (renderedActual.some(rc => Math.hypot(rc.x - pt.x, rc.y - pt.y) < dedupTol)) return;
        renderedActual.push(pt);

        const isHighlighted = State.highlightedIds.has(pt.id);
        let strokeColor = flowerColor;

        if (State.colorByLayer) {
          strokeColor = LayerColors[pt.layer % LayerColors.length];
        }
        if (isHighlighted) {
          strokeColor = '#ffffff';
        }

        const circle = this.createSvgElement('circle', {
          cx: pt.x,
          cy: pt.y,
          r: R,
          fill: isHighlighted ? 'rgba(255, 255, 255, 0.15)' : strokeColor,
          'fill-opacity': isHighlighted ? '0.2' : State.fillOpacity,
          stroke: strokeColor,
          'stroke-width': isHighlighted ? 3.0 : State.strokeFlower,
          opacity: isHighlighted ? '1.0' : '0.9',
          filter: (State.enableGlow || isHighlighted) ? `url(#${idPrefix}-glow)` : 'none',
          class: `circle-node actual-circle ${isHighlighted ? 'highlighted-circle' : ''}`,
          'data-circle-id': pt.id,
          'data-pattern': pt.pattern || patternType,
          'data-default-stroke': (State.colorByLayer ? LayerColors[pt.layer % LayerColors.length] : flowerColor)
        });

        actualFrag.appendChild(circle);
      });
      actualGroup.appendChild(actualFrag);
      mainGroup.appendChild(actualGroup);
    }

    // 5b. Eyes of Kryst (3 Pairs = 6 Vesica Piscis Lenses in Magenta)
    if (patternType === 'kryst' && (State.showEyesOfKryst || State.activePreset === 'eyes_of_kryst')) {
      const eyesGroup = this.createSvgElement('g', { class: 'group-eyes-of-kryst' });
      const eyesFrag = document.createDocumentFragment();
      const eyes = SacredMath.getEyesOfKryst(r);
      eyes.forEach(eye => {
        eyesFrag.appendChild(this.createSvgElement('path', {
          d: eye.pathD,
          fill: '#ff00ff',
          'fill-opacity': '0.7',
          stroke: '#ff00ff',
          'stroke-width': '2.2',
          filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none',
          class: 'eye-of-kryst'
        }));
      });
      eyesGroup.appendChild(eyesFrag);
      mainGroup.appendChild(eyesGroup);
    }

    // 6. Metatron Chords / Platonic Solid Lines
    if (State.showMetatronLines) {
      const metatronGroup = this.createSvgElement('g', { class: 'group-metatron-lines' });
      const metatronFrag = document.createDocumentFragment();
      const fruitNodes = SacredMath.getFruitOfLifeCenters(r);

      if (State.platonicFilter === 'all') {
        for (let i = 0; i < fruitNodes.length; i++) {
          for (let j = i + 1; j < fruitNodes.length; j++) {
            metatronFrag.appendChild(this.createSvgElement('line', {
              x1: fruitNodes[i].x,
              y1: fruitNodes[i].y,
              x2: fruitNodes[j].x,
              y2: fruitNodes[j].y,
              stroke: '#ffffff',
              'stroke-width': '0.85',
              opacity: '0.4'
            }));
          }
        }
      } else if (State.platonicFilter === 'tetra') {
        const outerVertices = [fruitNodes[7], fruitNodes[8], fruitNodes[9], fruitNodes[10], fruitNodes[11], fruitNodes[12]];
        const t1 = [outerVertices[0], outerVertices[2], outerVertices[4]];
        const t2 = [outerVertices[1], outerVertices[3], outerVertices[5]];

        const appendTriangle = (arr, stroke) => {
          for (let i = 0; i < 3; i++) {
            const pA = arr[i];
            const pB = arr[(i + 1) % 3];
            metatronFrag.appendChild(this.createSvgElement('line', {
              x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y,
              stroke: stroke, 'stroke-width': '2.5', opacity: '0.9',
              filter: `url(#${idPrefix}-glow)`
            }));
          }
        };
        appendTriangle(t1, '#f59e0b');
        appendTriangle(t2, '#06b6d4');
      } else if (State.platonicFilter === 'cube') {
        const outer = [fruitNodes[7], fruitNodes[8], fruitNodes[9], fruitNodes[10], fruitNodes[11], fruitNodes[12]];
        for (let i = 0; i < 6; i++) {
          const pA = outer[i];
          const pB = outer[(i + 1) % 6];
          metatronFrag.appendChild(this.createSvgElement('line', {
            x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y,
            stroke: '#3b82f6', 'stroke-width': '2.2', opacity: '0.85'
          }));
        }
        [outer[0], outer[2], outer[4]].forEach(pt => {
          metatronFrag.appendChild(this.createSvgElement('line', {
            x1: pt.x, y1: pt.y, x2: 0, y2: 0,
            stroke: '#3b82f6', 'stroke-width': '2.2', opacity: '0.85'
          }));
        });
      } else if (State.platonicFilter === 'octa') {
        const inner = [fruitNodes[1], fruitNodes[2], fruitNodes[3], fruitNodes[4], fruitNodes[5], fruitNodes[6]];
        for (let i = 0; i < 6; i++) {
          const pA = inner[i];
          const pB = inner[(i + 1) % 6];
          metatronFrag.appendChild(this.createSvgElement('line', {
            x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y,
            stroke: '#10b981', 'stroke-width': '2.2', opacity: '0.85'
          }));
        }
      }
      metatronGroup.appendChild(metatronFrag);
      mainGroup.appendChild(metatronGroup);
    }

    // 7. Outer Bounding Ring & Concentric Double Ring
    if (State.showOuterRing) {
      const ringGroup = this.createSvgElement('g', { class: 'group-outer-ring' });
      ringGroup.appendChild(this.createSvgElement('circle', {
        cx: '0',
        cy: '0',
        r: R_bound,
        fill: 'none',
        stroke: State.colorOuter,
        'stroke-width': '2.2',
        filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none'
      }));
      ringGroup.appendChild(this.createSvgElement('circle', {
        cx: '0',
        cy: '0',
        r: R_bound + 8,
        fill: 'none',
        stroke: State.colorOuter,
        'stroke-width': '1.2',
        opacity: '0.75'
      }));
      mainGroup.appendChild(ringGroup);
    }

    // 8. Intersection Nodes (Lattice Dots)
    if (State.showIntersections) {
      const interGroup = this.createSvgElement('g', { class: 'group-intersections' });
      const interFrag = document.createDocumentFragment();
      const intersectionPoints = SacredMath.computeIntersectionNodes(points, R);
      intersectionPoints.forEach(ipt => {
        interFrag.appendChild(this.createSvgElement('circle', {
          cx: ipt.x,
          cy: ipt.y,
          r: '2.5',
          fill: '#ffffff',
          opacity: '0.7',
          class: 'intersection-node'
        }));
      });
      interGroup.appendChild(interFrag);
      mainGroup.appendChild(interGroup);
    }

    // 9. Lightweight Highlight Overlay Group
    const highlightGroup = this.createSvgElement('g', { class: 'group-highlights' });
    mainGroup.appendChild(highlightGroup);

    // 10. Center Nodes (Interactive Dots at circle origins)
    if (State.showCenterDots) {
      const centersGroup = this.createSvgElement('g', { class: 'group-center-dots' });
      const centersFrag = document.createDocumentFragment();
      const renderedDots = [];
      const dedupTol = Math.max(0.5, 0.02 * r);

      points.forEach(pt => {
        if (renderedDots.some(rc => Math.hypot(rc.x - pt.x, rc.y - pt.y) < dedupTol)) return;
        renderedDots.push(pt);

        const isHighlighted = State.highlightedIds.has(pt.id);
        const dot = this.createSvgElement('circle', {
          cx: pt.x,
          cy: pt.y,
          r: isHighlighted ? '5.5' : '3',
          fill: isHighlighted ? '#ffffff' : State.colorOuter,
          stroke: '#000000',
          'stroke-width': '1',
          class: `center-dot ${isHighlighted ? 'highlighted-dot' : ''}`,
          'data-circle-id': pt.id,
          'data-default-fill': State.colorOuter
        });
        centersFrag.appendChild(dot);
      });
      centersGroup.appendChild(centersFrag);
      mainGroup.appendChild(centersGroup);
    }

    svg.appendChild(mainGroup);

    // Populate highlight overlay elements if needed
    this.updateHighlights(svgId);

    // Update viewBox based on current transform
    this.updateViewBox(svg, transformState);
  },

  /**
   * Renders Superimposed Overlay mode (Life + Kryst centered on single origin with phase divergence).
   *
   * @param {string} svgId - DOM ID of target SVG element (svgLife).
   * @param {{panX: number, panY: number, scale: number}} transformState - Current pan/zoom transform.
   */
  renderSuperimposed(svgId, transformState) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    const N = State.N;
    const r = State.r;
    const R = 2 * r;
    const R_bound = Math.max(SacredMath.getFoLBoundingRadius(N, r), SacredMath.getFoKBoundingRadius(N, r));
    const idPrefix = svgId;

    this.setupDefs(svg, idPrefix, R_bound);

    const oldMain = svg.querySelector('.sacred-main-group');
    if (oldMain) oldMain.remove();

    const mainGroup = this.createSvgElement('g', {
      class: `sacred-main-group ${State.enablePulse ? 'sacred-pulse' : ''}`
    });

    // Guides
    if (State.showGuides) {
      const guidesGroup = this.createSvgElement('g', { class: 'group-superimposed-guides' });
      const guidesFrag = document.createDocumentFragment();

      // Flower of Life Hexagons (Red dashed: rendered directly from lifeGeometry.guides)
      const lifeGeometry = SacredMath.getFlowerOfLifeGeometry(N, r);
      lifeGeometry.guides.forEach(g => {
        if (g.vertices && g.vertices.length > 0) {
          const hexPoints = g.vertices.map(v => `${v.x.toFixed(3)},${v.y.toFixed(3)}`).join(' ');
          guidesFrag.appendChild(this.createSvgElement('polygon', {
            points: hexPoints,
            fill: 'none',
            stroke: '#ef4444',
            'stroke-width': '1.2',
            'stroke-dasharray': '3 3',
            opacity: '0.6',
            'data-layer': g.layer,
            'data-rotation': g.rotationDeg
          }));
        }
      });

      // Flower of Kryst Guides (Cyan dashed: Hexagons & Triangles)
      const krystGeometry = SacredMath.getKrystGeometry(N, r);
      krystGeometry.guides.forEach(g => {
        if (g.vertices && g.vertices.length > 0) {
          const krystGuidePoints = g.vertices.map(v => `${v.x.toFixed(3)},${v.y.toFixed(3)}`).join(' ');
          guidesFrag.appendChild(this.createSvgElement('polygon', {
            points: krystGuidePoints,
            fill: 'none',
            stroke: '#06b6d4',
            'stroke-width': '1.2',
            'stroke-dasharray': '3 3',
            opacity: '0.6'
          }));
        } else if (g.type === 'hexagon' && g.radius) {
          const krystHexPoints = [];
          for (let m = 0; m < 6; m++) {
            const a = m * 60 * SacredMath.DEG_TO_RAD;
            krystHexPoints.push(`${(g.cx + g.radius * Math.cos(a)).toFixed(3)},${(g.cy + g.radius * Math.sin(a)).toFixed(3)}`);
          }
          guidesFrag.appendChild(this.createSvgElement('polygon', {
            points: krystHexPoints.join(' '),
            fill: 'none',
            stroke: '#06b6d4',
            'stroke-width': '1.2',
            'stroke-dasharray': '3 3',
            opacity: '0.6'
          }));
        }
      });
      guidesGroup.appendChild(guidesFrag);
      mainGroup.appendChild(guidesGroup);
    }

    const folPoints = SacredMath.generateFlowerOfLifePoints(N, r);
    const fokPoints = SacredMath.generateFlowerOfKrystPoints(N, r);

    // Cache points for fast lookup
    folPoints.forEach(pt => this.pointsMap.set(pt.id, pt));
    fokPoints.forEach(pt => this.pointsMap.set(pt.id, pt));

    // Flower of Life Layer (Red)
    const folGroup = this.createSvgElement('g', { class: 'group-fol-overlay' });
    const folFrag = document.createDocumentFragment();
    folPoints.forEach(pt => {
      const isHighlighted = State.highlightedIds.has(pt.id);
      folFrag.appendChild(this.createSvgElement('circle', {
        cx: pt.x,
        cy: pt.y,
        r: R,
        fill: 'none',
        stroke: isHighlighted ? '#ffffff' : State.colorLife,
        'stroke-width': isHighlighted ? 3 : State.strokeFlower,
        opacity: '0.65',
        class: `circle-node ${isHighlighted ? 'highlighted-circle' : ''}`,
        'data-circle-id': pt.id,
        'data-pattern': 'life',
        'data-default-stroke': State.colorLife
      }));
    });
    folGroup.appendChild(folFrag);
    mainGroup.appendChild(folGroup);

    // Flower of Kryst Layer (Electric Cyan)
    const fokGroup = this.createSvgElement('g', { class: 'group-fok-overlay' });
    const fokFrag = document.createDocumentFragment();
    const renderedFok = [];
    const dedupTol = Math.max(0.5, 0.02 * r);

    fokPoints.forEach(pt => {
      if (renderedFok.some(rc => Math.hypot(rc.x - pt.x, rc.y - pt.y) < dedupTol)) return;
      renderedFok.push(pt);

      const isHighlighted = State.highlightedIds.has(pt.id);
      fokFrag.appendChild(this.createSvgElement('circle', {
        cx: pt.x,
        cy: pt.y,
        r: R,
        fill: 'none',
        stroke: isHighlighted ? '#ffffff' : State.colorKryst,
        'stroke-width': isHighlighted ? 3 : State.strokeFlower,
        opacity: '0.75',
        class: `circle-node ${isHighlighted ? 'highlighted-circle' : ''}`,
        'data-circle-id': pt.id,
        'data-pattern': 'kryst',
        'data-default-stroke': State.colorKryst
      }));
    });
    fokGroup.appendChild(fokFrag);
    mainGroup.appendChild(fokGroup);

    // Eyes of Kryst
    if (State.showEyesOfKryst || State.activePreset === 'eyes_of_kryst') {
      const eyesGroup = this.createSvgElement('g', { class: 'group-eyes-of-kryst' });
      const eyesFrag = document.createDocumentFragment();
      const eyes = SacredMath.getEyesOfKryst(r);
      eyes.forEach(eye => {
        eyesFrag.appendChild(this.createSvgElement('path', {
          d: eye.pathD,
          fill: '#ff00ff',
          'fill-opacity': '0.7',
          stroke: '#ff00ff',
          'stroke-width': '2.2',
          filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none',
          class: 'eye-of-kryst'
        }));
      });
      eyesGroup.appendChild(eyesFrag);
      mainGroup.appendChild(eyesGroup);
    }

    // Divergence Connecting Vectors (Phase Delta between FoL midpoints and FoK circular centers)
    if (N >= 2) {
      const divGroup = this.createSvgElement('g', { class: 'group-divergence-vectors' });
      const divFrag = document.createDocumentFragment();
      const folMidpoints = folPoints.filter(p => p.layer === 2 && !p.isVertex);
      const fokCirclePoints = fokPoints.filter(p => p.layer === 2 && (p.index % 2 !== 0));

      for (let i = 0; i < Math.min(folMidpoints.length, fokCirclePoints.length); i++) {
        const p1 = folMidpoints[i];
        const p2 = fokCirclePoints[i];
        divFrag.appendChild(this.createSvgElement('line', {
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          stroke: '#f59e0b',
          'stroke-width': '2.2',
          'stroke-dasharray': '2 2'
        }));
        divFrag.appendChild(this.createSvgElement('circle', {
          cx: ((p1.x + p2.x) / 2).toFixed(2),
          cy: ((p1.y + p2.y) / 2).toFixed(2),
          r: '2.5',
          fill: '#f59e0b'
        }));
      }
      divGroup.appendChild(divFrag);
      mainGroup.appendChild(divGroup);
    }

    // Lightweight Highlight Overlay Group
    const highlightGroup = this.createSvgElement('g', { class: 'group-highlights' });
    mainGroup.appendChild(highlightGroup);

    // Center dots
    const dotsGroup = this.createSvgElement('g', { class: 'group-superimposed-dots' });
    const dotsFrag = document.createDocumentFragment();
    [...folPoints, ...fokPoints].forEach(pt => {
      const isHighlighted = State.highlightedIds.has(pt.id);
      const dot = this.createSvgElement('circle', {
        cx: pt.x,
        cy: pt.y,
        r: isHighlighted ? '5' : '2.8',
        fill: pt.pattern === 'life' ? State.colorLife : State.colorKryst,
        stroke: '#000',
        'stroke-width': '0.7',
        class: `center-dot superimposed-dot ${isHighlighted ? 'highlighted-dot' : ''}`,
        'data-circle-id': pt.id,
        'data-default-fill': pt.pattern === 'life' ? State.colorLife : State.colorKryst
      });
      dotsFrag.appendChild(dot);
    });
    dotsGroup.appendChild(dotsFrag);
    mainGroup.appendChild(dotsGroup);

    // Bounding ring
    if (State.showOuterRing) {
      mainGroup.appendChild(this.createSvgElement('circle', {
        cx: '0',
        cy: '0',
        r: R_bound,
        fill: 'none',
        stroke: State.colorOuter,
        'stroke-width': '2'
      }));
    }

    svg.appendChild(mainGroup);

    this.updateHighlights(svgId);
    this.updateViewBox(svg, transformState);
  },

  /**
   * Lightweight Highlight Updater:
   * Toggles CSS classes and attributes on existing SVG elements and re-renders only
   * the lightweight <g class="group-highlights"> overlay. Avoids tearing down the SVG tree!
   *
   * @param {string} svgId - ID of SVG canvas to update.
   */
  updateHighlights(svgId) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    const r = State.r;
    const R = 2 * r;
    const idPrefix = svgId;

    // 1. Toggle highlight classes and attributes on existing circle and dot elements
    svg.querySelectorAll('[data-circle-id]').forEach(el => {
      const id = el.dataset.circleId;
      const isHl = State.highlightedIds.has(id);

      if (el.classList.contains('center-dot')) {
        el.classList.toggle('highlighted-dot', isHl);
        el.setAttribute('r', isHl ? '5.5' : (el.classList.contains('superimposed-dot') ? '2.8' : '3'));
        el.setAttribute('fill', isHl ? '#ffffff' : (el.dataset.defaultFill || State.colorOuter));
      } else if (el.classList.contains('circle-node')) {
        el.classList.toggle('highlighted-circle', isHl);
        if (isHl) {
          el.setAttribute('stroke', '#ffffff');
          el.setAttribute('stroke-width', '3.0');
          el.setAttribute('fill', 'rgba(255, 255, 255, 0.15)');
          el.setAttribute('fill-opacity', '0.2');
          el.setAttribute('opacity', '1.0');
          el.setAttribute('filter', `url(#${idPrefix}-glow)`);
        } else {
          const defStroke = el.dataset.defaultStroke || (el.classList.contains('base-circle') ? State.colorBase : State.colorLife);
          el.setAttribute('stroke', defStroke);
          el.setAttribute('stroke-width', el.classList.contains('base-circle') ? State.strokeBase : State.strokeFlower);
          el.setAttribute('fill', el.classList.contains('base-circle') ? (State.sphericalShading ? `url(#${idPrefix}-sphere-grad)` : 'none') : defStroke);
          el.setAttribute('fill-opacity', el.classList.contains('base-circle') ? '1.0' : State.fillOpacity);
          el.setAttribute('opacity', el.classList.contains('base-circle') ? '0.8' : '0.9');
          el.setAttribute('filter', State.enableGlow ? `url(#${idPrefix}-glow)` : 'none');
        }
      }
    });

    // 2. Re-render only the dedicated lightweight highlight overlay
    const hlGroup = svg.querySelector('.group-highlights');
    if (hlGroup) {
      hlGroup.innerHTML = '';
      if (State.highlightedIds.size > 0) {
        const hlFrag = document.createDocumentFragment();
        State.highlightedIds.forEach(id => {
          const pt = this.pointsMap.get(id);
          if (!pt) return;

          // Concentric Base circle indicator
          hlFrag.appendChild(this.createSvgElement('circle', {
            cx: pt.x,
            cy: pt.y,
            r: r,
            fill: 'none',
            stroke: '#3b82f6',
            'stroke-width': '1.5',
            'stroke-dasharray': '3 3',
            opacity: '0.85'
          }));

          // Concentric Actual circle indicator
          hlFrag.appendChild(this.createSvgElement('circle', {
            cx: pt.x,
            cy: pt.y,
            r: R,
            fill: 'none',
            stroke: '#ffffff',
            'stroke-width': '3.2',
            filter: `url(#${idPrefix}-glow)`
          }));

          // Radial connector line from center to circle edge
          hlFrag.appendChild(this.createSvgElement('line', {
            x1: pt.x,
            y1: pt.y,
            x2: pt.x + R,
            y2: pt.y,
            stroke: '#f59e0b',
            'stroke-width': '1.5',
            'stroke-dasharray': '2 2'
          }));
        });
        hlGroup.appendChild(hlFrag);
      }
    }
  },

  /**
   * Updates the SVG viewBox centered at (0, 0) with pan and zoom transforms.
   *
   * @param {SVGSVGElement} svg - Target SVG canvas.
   * @param {{panX: number, panY: number, scale: number}} transform - Current transform values.
   */
  updateViewBox(svg, transform) {
    if (!svg) return;
    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 800;
    const scale = transform.scale || 1.0;
    const panX = transform.panX || 0;
    const panY = transform.panY || 0;

    const vbWidth = width / scale;
    const vbHeight = height / scale;
    const minX = -vbWidth / 2 - panX;
    const minY = -vbHeight / 2 - panY;

    svg.setAttribute('viewBox', `${minX} ${minY} ${vbWidth} ${vbHeight}`);
  }
};



  /* =========================================================================
     5. 3D WEBGL RENDERING ENGINE (js/renderer3d.js)
     ========================================================================= */

let THREE = window.THREE;
let OrbitControls = window.OrbitControls;

async function ensureThree() {
  if (THREE && OrbitControls) return true;
  if (!THREE) {
    try {
      THREE = await import('https://esm.sh/three@0.160.0');
      window.THREE = THREE;
    } catch(e) {
      console.error('Failed to load Three.js via ESM:', e);
    }
  }
  if (!OrbitControls) {
    try {
      const ctrl = await import('https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js');
      OrbitControls = ctrl.OrbitControls;
      window.OrbitControls = OrbitControls;
    } catch(e) {
      console.error('Failed to load OrbitControls via ESM:', e);
    }
  }
  return !!(THREE && OrbitControls);
}

/**
 * 3D WEBGL RENDERING ENGINE (js/renderer3d.js)
 * High-performance Instanced 3D WebGL renderer powered by Three.js.
 * Renders 3D Face-Centered Cubic (FCC) close-packed spheres,
 * overlapping shells (2r), torus petal rims, lattice guide struts,
 * interactive Z-slice clipping planes, and FCC (111) layer isolation.
 */




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

    // Dynamic objects container
    this.objectsGroup = null;
    this.highlightGroup = null;
    this.zeroPointMarker = null;

    // Clipping plane along Z axis
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1000);

    // Current cached geometry data
    this.currentGeometry = null;
    this.instancedSpheres = null;
    this.instancedShells = null;
    this.instancedTori = null;
    this.guideSegments = null;
    this.neighborHighlightSpheres = [];

    // Hover & selection state
    this.hoveredInstanceId = null;
    this.selectedInstanceId = null;

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
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(400, 600, 500);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight2.position.set(-400, -300, -300);
    this.scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xeab308, 0.8);
    dirLight3.position.set(0, -600, 200);
    this.scene.add(dirLight3);

    // Subtle XY plane orientation circle
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

    // Groups
    this.objectsGroup = new THREE.Group();
    this.scene.add(this.objectsGroup);

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
      if (this.hoveredInstanceId !== null) {
        this.selectInstance(this.hoveredInstanceId);
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
      // (111) Hexagonal view looking down Z
      this.camera.position.set(0, 0, dist * 1.5);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(0, 0, 0);
      if (this.controls) this.controls.target.set(0, 0, 0);
    } else if (preset === 'front') {
      // Cross-section showing A, B, C stacked planes
      this.camera.position.set(0, -dist * 1.5, 0);
      this.camera.up.set(0, 0, 1);
      this.camera.lookAt(0, 0, 0);
      if (this.controls) this.controls.target.set(0, 0, 0);
    } else {
      // Isometric 3D cubic view
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

  updateZSlice() {
    if (!this.currentGeometry) return;
    const bound = this.currentGeometry.boundingRadius || 400;
    // State.sliceZ: -100 to +100 (%)
    const sliceFrac = (State.sliceZ !== undefined) ? State.sliceZ / 100 : 1.0;
    if (sliceFrac >= 0.99) {
      // Plane clipping disabled when at 100%
      this.clipPlane.constant = bound * 10;
    } else {
      // Cuts off from top (+Z) down to -Z
      this.clipPlane.constant = sliceFrac * bound;
    }
  }

  /**
   * Rebuilds all 3D geometries and InstancedMesh objects according to current State.
   */
  updateSceneData() {
    if (!this.objectsGroup) return;

    // Clear old meshes
    while (this.objectsGroup.children.length > 0) {
      const child = this.objectsGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
      this.objectsGroup.remove(child);
    }
    this.clearHighlight();

    const r = State.r || 50;
    const isTriAxial = (State.model3D !== 'fcc');
    const triaxialOpts = {
      infillSteps: State.infillSteps !== undefined ? State.infillSteps : 2,
      infillMode: State.triaxialInfill || 'both',
      showPlaneXY: State.showPlaneXY !== false,
      showPlaneXZ: State.showPlaneXZ !== false,
      showPlaneYZ: State.showPlaneYZ !== false,
      showInfill3D: State.showInfill3D !== false
    };

    if (isTriAxial) {
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
      // Superimposed mode: render both FoL and FoK in FCC mode
      if (State.viewportMode === 'superimposed') {
        const lifeGeom = SacredMath3D.getLife3DGeometry(SacredMath3D.getEffectiveLifeLayers ? SacredMath3D.getEffectiveLifeLayers(State.N, r) : State.N, r);
        const krystGeom = SacredMath3D.getKryst3DGeometry(State.N, r, { expansionMode: State.fccExpansionMode || 'volumetric' });
        this.currentGeometry = {
          spheres: [...lifeGeom.spheres.map(s => ({ ...s, pattern: 'life' })), ...krystGeom.spheres.map(s => ({ ...s, pattern: 'kryst' }))],
          guides: [...lifeGeom.guides, ...krystGeom.guides],
          boundingRadius: Math.max(lifeGeom.boundingRadius, krystGeom.boundingRadius)
        };
      } else if (this.patternKey === 'life') {
        const effectiveLayers = Math.max(1, Math.min(State.N, 6));
        this.currentGeometry = SacredMath3D.getLife3DGeometry(effectiveLayers, r);
      } else {
        this.currentGeometry = SacredMath3D.getKryst3DGeometry(State.N, r, { expansionMode: State.fccExpansionMode || 'volumetric' });
      }
    }

    const { spheres, guides, boundingRadius } = this.currentGeometry;
    this.updateZSlice();

    // 1. Base Tangent Spheres (InstancedMesh with Translucency)
    if (State.show3DSpheres !== false && spheres.length > 0) {
      const sphereGeo = new THREE.SphereGeometry(r, 26, 18);
      const isTranslucent = (State.sphereOpacity || 0.35) < 0.99;
      const sphereMat = new THREE.MeshPhysicalMaterial({
        roughness: State.sphereRoughness !== undefined ? State.sphereRoughness : 0.15,
        metalness: State.sphereMetalness !== undefined ? State.sphereMetalness : 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.15,
        transparent: isTranslucent,
        opacity: State.sphereOpacity !== undefined ? State.sphereOpacity : 0.35,
        depthWrite: !isTranslucent,
        side: THREE.DoubleSide,
        clippingPlanes: [this.clipPlane],
        clipShadows: true
      });

      this.instancedSpheres = new THREE.InstancedMesh(sphereGeo, sphereMat, spheres.length);
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();
      const planeFilter = State.fccPlaneFilter || 'all';

      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];

        // Isolate FCC Plane filter (when in FCC mode)
        if (!isTriAxial && planeFilter !== 'all' && s.plane !== planeFilter) {
          matrix.makeScale(0, 0, 0);
        } else {
          matrix.makeTranslation(s.x, s.y, s.z);
        }
        this.instancedSpheres.setMatrixAt(i, matrix);

        // Color coding
        if (s.pattern === 'life' && State.viewportMode === 'superimposed') {
          color.set(State.colorLife || '#ef4444');
        } else if (State.colorByLayer) {
          const cHex = LayerColors[s.layer % LayerColors.length];
          color.set(cHex);
        } else if (isTriAxial) {
          // Tri-Axial Color Coding by Plane
          if (s.role === 'center') {
            color.set('#ef4444'); // Crimson origin
          } else if (s.plane === 'XY') {
            color.set('#06b6d4'); // Electric Cyan (0° Original Plane)
          } else if (s.plane === 'XZ') {
            color.set('#f43f5e'); // Rose / Magenta (90° Rotated Axis)
          } else if (s.plane === 'YZ') {
            color.set('#10b981'); // Emerald / Green (3rd Orthogonal Axis)
          } else if (s.plane === 'Infill-X' || s.plane === 'Infill-Y') {
            color.set('#f59e0b'); // Radiant Amber / Gold (Angular Arc Infill)
          } else if (s.plane === 'Infill-Grid') {
            color.set('#a855f7'); // Lavender / Violet (3D Coordinate Grid Infill)
          } else {
            color.set('#38bdf8');
          }
        } else {
          // FCC Role Color Coding
          if (s.role === 'center') {
            color.set('#ef4444'); // Crimson / Genesis origin
          } else if (s.role === 'hexagon-center') {
            color.set('#38bdf8'); // Bright Cyan / White
          } else if (s.role === 'hexagon') {
            color.set('#3b82f6'); // Electric Blue
          } else if (s.role === 'triangle') {
            color.set('#eab308'); // Gold / Yellow
          } else {
            color.set('#06b6d4');
          }
        }
        this.instancedSpheres.setColorAt(i, color);
      }

      this.instancedSpheres.instanceMatrix.needsUpdate = true;
      if (this.instancedSpheres.instanceColor) this.instancedSpheres.instanceColor.needsUpdate = true;
      this.objectsGroup.add(this.instancedSpheres);
    }

    // 2. Overlapping Actual Flower Spheres / Shells (R = 2r)
    if (State.show3DShells && spheres.length > 0) {
      const shellGeo = new THREE.SphereGeometry(2 * r, 22, 16);
      const shellMat = new THREE.MeshPhysicalMaterial({
        color: this.patternKey === 'life' ? (State.colorLife || '#ef4444') : (State.colorKryst || '#06b6d4'),
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
        roughness: 0.1,
        metalness: 0.1,
        clippingPlanes: [this.clipPlane]
      });

      this.instancedShells = new THREE.InstancedMesh(shellGeo, shellMat, spheres.length);
      const matrix = new THREE.Matrix4();
      const planeFilter = State.fccPlaneFilter || 'all';

      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];
        if (planeFilter !== 'all' && s.plane !== planeFilter) {
          matrix.makeScale(0, 0, 0);
        } else {
          matrix.makeTranslation(s.x, s.y, s.z);
        }
        this.instancedShells.setMatrixAt(i, matrix);
      }
      this.instancedShells.instanceMatrix.needsUpdate = true;
      this.objectsGroup.add(this.instancedShells);
    }

    // 3. 3D Tubular Torus Petal Rims (Major Radius = 2r, Minor Tube Radius = ρ)
    if (State.show3DTorus && spheres.length > 0) {
      const tubeRadius = Math.max(1.2, r * 0.04);
      const torusGeo = new THREE.TorusGeometry(2 * r, tubeRadius, 12, 40);
      const torusMat = new THREE.MeshStandardMaterial({
        color: this.patternKey === 'life' ? '#f43f5e' : '#38bdf8',
        roughness: 0.35,
        metalness: 0.7,
        clippingPlanes: [this.clipPlane]
      });

      this.instancedTori = new THREE.InstancedMesh(torusGeo, torusMat, spheres.length);
      const matrix = new THREE.Matrix4();
      const planeFilter = State.fccPlaneFilter || 'all';

      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];
        if (planeFilter !== 'all' && s.plane !== planeFilter) {
          matrix.makeScale(0, 0, 0);
        } else {
          matrix.makeTranslation(s.x, s.y, s.z);
        }
        this.instancedTori.setMatrixAt(i, matrix);
      }
      this.instancedTori.instanceMatrix.needsUpdate = true;
      this.objectsGroup.add(this.instancedTori);
    }

    // 4. 3D Guide Polyhedra & Lattice Struts (LineSegments)
    if (State.show3DGuides && guides && guides.length > 0) {
      const linePositions = [];
      const planeFilter = State.fccPlaneFilter || 'all';

      for (let i = 0; i < guides.length; i++) {
        const g = guides[i];
        linePositions.push(g.p1.x, g.p1.y, g.p1.z, g.p2.x, g.p2.y, g.p2.z);
      }

      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: State.colorGuide ? new THREE.Color(State.colorGuide) : new THREE.Color('#ea580c'),
        transparent: true,
        opacity: 0.75,
        clippingPlanes: [this.clipPlane]
      });

      this.guideSegments = new THREE.LineSegments(lineGeo, lineMat);
      this.objectsGroup.add(this.guideSegments);
    }

    // 5. Axial Orthogonal Guide Rings (XY, XZ, YZ)
    if (State.showAxialRims !== false && isTriAxial && boundingRadius > 0) {
      const ringRad = Math.max(10, boundingRadius - r);
      const ringThick = Math.max(1.2, r * 0.035);
      const ringGeo = new THREE.TorusGeometry(ringRad, ringThick, 8, 96);

      // Ring XY (z = 0) - Cyan
      const ringMatXY = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.45 });
      const ringMeshXY = new THREE.Mesh(ringGeo, ringMatXY);
      this.objectsGroup.add(ringMeshXY);

      // Ring XZ (y = 0) - Rotated 90° around X - Rose/Magenta
      const ringMatXZ = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.45 });
      const ringMeshXZ = new THREE.Mesh(ringGeo, ringMatXZ);
      ringMeshXZ.rotation.x = Math.PI / 2;
      this.objectsGroup.add(ringMeshXZ);

      // Ring YZ (x = 0) - Rotated 90° around Y - Emerald/Green
      const ringMatYZ = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.45 });
      const ringMeshYZ = new THREE.Mesh(ringGeo, ringMatYZ);
      ringMeshYZ.rotation.y = Math.PI / 2;
      this.objectsGroup.add(ringMeshYZ);
    }

    // 6. Central Zero-Point Marker (Flower of Kryst hollow void indicator)
    if (this.patternKey === 'kryst' || State.viewportMode === 'superimposed') {
      if (State.showZeroPointMarker !== false) {
        const voidGroup = new THREE.Group();

        // Pulsing wireframe core sphere at (0, 0, 0)
        const voidGeo = new THREE.SphereGeometry(r * 0.45, 16, 12);
        const voidMat = new THREE.MeshBasicMaterial({
          color: 0x06b6d4,
          wireframe: true,
          transparent: true,
          opacity: 0.8
        });
        const voidMesh = new THREE.Mesh(voidGeo, voidMat);
        voidGroup.add(voidMesh);

        // Core light emitting from inside the Zero-Point void
        const coreLight = new THREE.PointLight(0x38bdf8, 2.5, 3 * r);
        voidGroup.add(coreLight);

        this.objectsGroup.add(voidGroup);
      }
    }
  }

  checkRaycast() {
    if (!this.instancedSpheres || !this.currentGeometry || !this.camera) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.instancedSpheres);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined && instanceId < this.currentGeometry.spheres.length) {
        this.hoverInstance(instanceId);
        return;
      }
    }

    this.clearHover();
  }

  hoverInstance(instanceId) {
    if (this.hoveredInstanceId === instanceId) return;
    this.hoveredInstanceId = instanceId;

    const s = this.currentGeometry.spheres[instanceId];
    if (!s) return;

    // Update Geometry Inspector Card HUD
    const inspectPattern = document.getElementById('inspectPattern');
    const inspectLayer = document.getElementById('inspectLayer');
    const inspectDist = document.getElementById('inspectDist');
    const inspectCoords = document.getElementById('inspectCoords');
    const inspectRole = document.getElementById('inspectRole');
    const inspectStatus = document.getElementById('inspectStatus');

    if (inspectPattern) inspectPattern.textContent = (s.pattern === 'life' || this.patternKey === 'life') ? 'Flower of Life (3D FCC)' : 'Flower of Kryst (3D FCC)';
    if (inspectLayer) inspectLayer.textContent = `Ring ${s.layer} (Plane ${s.plane})`;
    if (inspectDist) inspectDist.textContent = `${Math.hypot(s.x, s.y, s.z).toFixed(1)}px (${(Math.hypot(s.x, s.y, s.z) / (State.r || 50)).toFixed(2)}r)`;
    if (inspectCoords) inspectCoords.textContent = `(${s.x.toFixed(0)}, ${s.y.toFixed(0)}, ${s.z.toFixed(0)})`;
    if (inspectRole) inspectRole.textContent = `${s.role} [FCC ${s.plane}]`;
    if (inspectStatus) inspectStatus.textContent = 'Inspecting';

    this.renderHighlight(s);
  }

  clearHover() {
    if (this.hoveredInstanceId === null && this.selectedInstanceId === null) return;
    this.hoveredInstanceId = null;
    if (this.selectedInstanceId === null) {
      this.clearHighlight();
    }
  }

  selectInstance(instanceId) {
    this.selectedInstanceId = instanceId;
    const s = this.currentGeometry.spheres[instanceId];
    if (s) {
      this.renderHighlight(s, true);
    }
  }

  renderHighlight(sphere, isSelected = false) {
    // Clear previous highlight meshes
    while (this.highlightGroup.children.length > 0) {
      const c = this.highlightGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      this.highlightGroup.remove(c);
    }

    const r = State.r || 50;
    const targetDistSq = (2 * r) * (2 * r);
    const tolSq = (0.05 * r) * (0.05 * r);

    // 1. Primary Highlight Halo around hovered sphere
    const haloGeo = new THREE.SphereGeometry(r * 1.05, 24, 18);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.95
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.set(sphere.x, sphere.y, sphere.z);
    this.highlightGroup.add(haloMesh);

    // 2. Find and highlight all 12 FCC tangent neighbor spheres at distance 2r
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
          opacity: 0.6
        });
        const nbMesh = new THREE.Mesh(nbGeo, nbMat);
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

  async init() {
    if (this.isInitialized) return;
    await ensureThree();

    this.viewports.life = new Viewport3D('canvasLife3D', 'life');
    this.viewports.kryst = new Viewport3D('canvasKryst3D', 'kryst');

    this.bindSynchronizedControls();
    this.bindResize();

    this.isInitialized = true;
    this.startAnimationLoop();
  },

  /**
   * Synchronizes camera rotation, zoom, and panning between Life and Kryst 3D canvases
   * in Dual Split (comparison) mode.
   */
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

  /**
   * Refreshes all 3D geometries, materials, and clipping planes.
   */
  async renderAll() {
    if (!this.isInitialized) await this.init();

    this.resizeAll();

    if (State.viewportMode === 'superimposed') {
      if (this.viewports.life) this.viewports.life.updateSceneData();
    } else {
      if (this.viewports.life) this.viewports.life.updateSceneData();
      if (this.viewports.kryst) this.viewports.kryst.updateSceneData();
    }

    this.update3DStats();
  },

  updateZSlice() {
    if (this.viewports.life) this.viewports.life.updateZSlice();
    if (this.viewports.kryst) this.viewports.kryst.updateZSlice();
  },

  setCameraPreset(preset) {
    if (this.viewports.life) this.viewports.life.setCameraPreset(preset);
    if (this.viewports.kryst) this.viewports.kryst.setCameraPreset(preset);
  },

  fitCameraAll() {
    if (this.viewports.life) this.viewports.life.fitCamera();
    if (this.viewports.kryst) this.viewports.kryst.fitCamera();
  },

  /**
   * Updates sphere count badges and HUD with 3D crystal statistics.
   */
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
      if (fokCountStat) fokCountStat.textContent = `${fokSpheres} (Flower of Kryst 3D)`;
      if (sidebarBoundRad) {
        const bound = this.viewports.kryst.currentGeometry.boundingRadius;
        sidebarBoundRad.textContent = `${Math.round(bound)}px (${(bound / (State.r || 50)).toFixed(1)}r)`;
      }
    }
  },

  /**
   * Captures high-resolution PNG image from the active 3D WebGL canvas.
   */
  capturePNG() {
    let targetViewport = (State.viewportMode === 'single-kryst') ? this.viewports.kryst : this.viewports.life;
    if (!targetViewport || !targetViewport.renderer || !targetViewport.renderer.domElement) return null;

    targetViewport.render();
    return targetViewport.renderer.domElement.toDataURL('image/png');
  },

  /**
   * Exports the active 3D lattice geometry as a standard 3D Wavefront .OBJ file.
   */
  exportOBJ() {
    let targetViewport = (State.viewportMode === 'single-kryst') ? this.viewports.kryst : this.viewports.life;
    if (!targetViewport || !targetViewport.currentGeometry) return null;

    const { spheres, guides } = targetViewport.currentGeometry;
    let obj = `# Sacred Geometry Studio 3D FCC Model\n# Spheres: ${spheres.length}, Lattice Struts: ${guides.length}\no SacredGeometry3D\n\n`;

    // Write sphere vertices
    for (let i = 0; i < spheres.length; i++) {
      const s = spheres[i];
      obj += `v ${s.x.toFixed(4)} ${s.y.toFixed(4)} ${s.z.toFixed(4)}\n`;
    }

    // Write lattice strut line segments
    if (guides && guides.length > 0) {
      obj += `\n# Lattice Struts\n`;
      // Find closest vertex indices
      const tolSq = (1e-2 * (State.r || 50)) ** 2;
      for (let g = 0; g < guides.length; g++) {
        const strut = guides[g];
        let idx1 = -1, idx2 = -1;
        for (let i = 0; i < spheres.length; i++) {
          const s = spheres[i];
          if ((s.x - strut.p1.x)**2 + (s.y - strut.p1.y)**2 + (s.z - strut.p1.z)**2 < tolSq) idx1 = i + 1;
          if ((s.x - strut.p2.x)**2 + (s.y - strut.p2.y)**2 + (s.z - strut.p2.z)**2 < tolSq) idx2 = i + 1;
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



  /* =========================================================================
     6. USER INTERFACES & PAN-ZOOM ENGINE (js/interactions.js)
     ========================================================================= */
/**
 * INTERACTION & UI CONTROLLER
 * Pan/zoom with requestAnimationFrame throttling, delegated SVG hit-testing,
 * lightweight click-to-highlight, and keyboard navigation.
 */




/* =========================================================================
   PAN/ZOOM CONTROLLER (RAF-THROTTLED)
   ========================================================================= */
class PanZoomController {
  constructor(wrapperId, svgId, transformKey) {
    this.wrapper = document.getElementById(wrapperId);
    this.svg = document.getElementById(svgId);
    this.transformKey = transformKey;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.rafPending = false;

    this.initEvents();
  }

  initEvents() {
    if (!this.wrapper || !this.svg) return;

    // Pointer Drag for Pan
    this.wrapper.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // Left click only
      this.isDragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      try {
        this.wrapper.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    this.wrapper.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      this.startX = e.clientX;
      this.startY = e.clientY;

      const transform = State.transforms[this.transformKey];
      transform.panX += dx / transform.scale;
      transform.panY += dy / transform.scale;

      if (State.syncPanZoom && State.viewportMode === 'comparison') {
        const otherKey = (this.transformKey === 'life') ? 'kryst' : 'life';
        State.transforms[otherKey].panX = transform.panX;
        State.transforms[otherKey].panY = transform.panY;
      }

      this.scheduleViewBoxUpdate();
    });

    const stopDrag = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        try {
          if (e && e.pointerId && this.wrapper.hasPointerCapture(e.pointerId)) {
            this.wrapper.releasePointerCapture(e.pointerId);
          }
        } catch (_) {}
      }
    };

    this.wrapper.addEventListener('pointerup', stopDrag);
    this.wrapper.addEventListener('pointercancel', stopDrag);

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
        SVGRenderer.updateViewBox(this.svg, State.transforms[this.transformKey]);
        if (State.syncPanZoom && State.viewportMode === 'comparison') {
          const otherKey = (this.transformKey === 'life') ? 'kryst' : 'life';
          const otherSvg = document.getElementById(otherKey === 'life' ? 'svgLife' : 'svgKryst');
          if (otherSvg) {
            SVGRenderer.updateViewBox(otherSvg, State.transforms[otherKey]);
          }
        }
      });
    }
  }

  zoom(factor) {
    const transform = State.transforms[this.transformKey];
    const newScale = clampNumber(transform.scale * factor, 0.1, 20.0, 1.0);
    transform.scale = newScale;

    if (State.syncPanZoom && State.viewportMode === 'comparison') {
      const otherKey = (this.transformKey === 'life') ? 'kryst' : 'life';
      State.transforms[otherKey].scale = newScale;
    }

    this.scheduleViewBoxUpdate();
  }
}

/* =========================================================================
   UI CONTROLLER
   ========================================================================= */
const UI = {
  _toastTimer: null,

  init() {
    PresetsManager.init();
    this.bindAccordions();
    this.bindDimensionTabs();
    this.bindViewTabs();
    this.bindSliders();
    this.bindToggles();
    this.bind3DControls();
    this.bindColorPickers();
    PresetsManager.renderPresetGrid();
    this.bindPresets();
    this.bindFloatingControls();
    this.bindModals();
    this.bindKeyboardShortcuts();
    this.initSvgEventDelegation();
    this.updateSidebarStats();
  },

  /**
   * Delegated Event Listeners on SVG Viewports:
   * Avoids attaching hundreds of individual mouseenter/click listeners to circles on every render pass.
   */
  initSvgEventDelegation() {
    ['svgLife', 'svgKryst'].forEach(svgId => {
      const svg = document.getElementById(svgId);
      if (!svg) return;

      // Delegated hover inspection
      svg.addEventListener('pointermove', (e) => {
        const target = e.target.closest('[data-circle-id]');
        if (target) {
          const circleId = target.dataset.circleId;
          const pt = SVGRenderer.pointsMap.get(circleId);
          if (pt && pt !== State.hoveredItem) {
            State.hoveredItem = pt;
            this.updateInspector(pt);
          }
        }
      });

      // Delegated click-to-highlight with lightweight DOM updates
      svg.addEventListener('click', (e) => {
        const target = e.target.closest('[data-circle-id]');
        if (target) {
          e.stopPropagation();
          const circleId = target.dataset.circleId;
          const pt = SVGRenderer.pointsMap.get(circleId);
          if (pt) {
            if (State.highlightedIds.has(circleId)) {
              State.highlightedIds.delete(circleId);
            } else {
              State.highlightedIds.add(circleId);
            }
            // Lightweight highlight update - no geometry re-render!
            SVGRenderer.updateHighlights('svgLife');
            SVGRenderer.updateHighlights('svgKryst');
            this.updateInspector(pt);
            this.updateSidebarStats();
          }
        }
      });
    });
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

    const toggleInspectorBtn = document.getElementById('toggleInspectorCollapseBtn');
    const inspectorCard = document.getElementById('inspectorCard');
    if (toggleInspectorBtn && inspectorCard) {
      toggleInspectorBtn.addEventListener('click', () => {
        inspectorCard.classList.toggle('minimized');
        toggleInspectorBtn.innerHTML = inspectorCard.classList.contains('minimized') ? '&#43;' : '&minus;';
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
    document.querySelectorAll('#dimensionSwitcher .dim-tab').forEach(tab => {
      const isActive = tab.dataset.dim === dim;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const svgLife = document.getElementById('svgWrapperLife');
    const svgKryst = document.getElementById('svgWrapperKryst');
    const webglLife = document.getElementById('webglWrapperLife');
    const webglKryst = document.getElementById('webglWrapperKryst');
    const section3d = document.getElementById('section3dControls');

    if (dim === '3d') {
      if (svgLife) svgLife.style.display = 'none';
      if (svgKryst) svgKryst.style.display = 'none';
      if (webglLife) webglLife.style.display = 'flex';
      if (webglKryst) webglKryst.style.display = 'flex';
      if (section3d) section3d.classList.add('open');

      if (window.Renderer3D) {
        window.Renderer3D.renderAll();
        window.Renderer3D.fitCameraAll();
      }
      this.showToast('3D FCC WebGL Engine Active');
    } else {
      if (svgLife) svgLife.style.display = '';
      if (svgKryst) svgKryst.style.display = '';
      if (webglLife) webglLife.style.display = 'none';
      if (webglKryst) webglKryst.style.display = 'none';

      App.renderAll();
      this.showToast('2D SVG Engine Active');
    }
    this.updateCounts();
  },

  bindViewTabs() {
    document.querySelectorAll('#viewportSwitcher .view-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#viewportSwitcher .view-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        this.setViewportMode(mode);
      });
    });

    document.querySelectorAll('.quick-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.quick-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.viewStyle = btn.dataset.viewstyle;
        App.renderAll();
      });
    });
  },

  setViewportMode(mode) {
    State.viewportMode = mode;
    const paneLife = document.getElementById('paneLife');
    const paneKryst = document.getElementById('paneKryst');
    const divergenceHud = document.getElementById('divergenceHud');
    const badgeLifeTitle = document.getElementById('badgeLifeTitle');

    if (divergenceHud) {
      divergenceHud.classList.toggle('visible', mode === 'superimposed');
    }

    if (mode === 'comparison') {
      if (paneLife) paneLife.style.display = 'flex';
      if (paneKryst) paneKryst.style.display = 'flex';
      if (badgeLifeTitle) badgeLifeTitle.textContent = 'Flower of Life';
    } else if (mode === 'single-life') {
      if (paneLife) paneLife.style.display = 'flex';
      if (paneKryst) paneKryst.style.display = 'none';
      if (badgeLifeTitle) badgeLifeTitle.textContent = 'Flower of Life';
    } else if (mode === 'single-kryst') {
      if (paneLife) paneLife.style.display = 'none';
      if (paneKryst) paneKryst.style.display = 'flex';
    } else if (mode === 'superimposed') {
      if (paneLife) paneLife.style.display = 'flex';
      if (paneKryst) paneKryst.style.display = 'none';
      if (badgeLifeTitle) badgeLifeTitle.textContent = 'Superimposed Matrix';
    }

    setTimeout(() => App.renderAll(), 50);
  },

  bindSliders() {
    const layerSlider = document.getElementById('layerSlider');
    if (layerSlider) {
      layerSlider.addEventListener('input', (e) => {
        State.setN(e.target.value);
        this.updateLayerBadge();
        this.updateCounts();
        this.updateSidebarStats();
        App.renderAll();
      });
    }

    const radiusSlider = document.getElementById('radiusSlider');
    const radiusBadge = document.getElementById('radiusBadge');
    if (radiusSlider && radiusBadge) {
      radiusSlider.addEventListener('input', (e) => {
        State.setRadius(e.target.value);
        radiusBadge.textContent = `r = ${State.r}px`;
        this.updateSidebarStats();
        App.renderAll();
      });
    }

    const strokeFlowerSlider = document.getElementById('strokeFlowerSlider');
    const strokeFlowerBadge = document.getElementById('strokeFlowerBadge');
    if (strokeFlowerSlider && strokeFlowerBadge) {
      strokeFlowerSlider.addEventListener('input', (e) => {
        State.strokeFlower = clampNumber(e.target.value, 0.25, 8.0, 1.5);
        strokeFlowerBadge.textContent = `${State.strokeFlower}px`;
        App.renderAll();
      });
    }

    const strokeBaseSlider = document.getElementById('strokeBaseSlider');
    const strokeBaseBadge = document.getElementById('strokeBaseBadge');
    if (strokeBaseSlider && strokeBaseBadge) {
      strokeBaseSlider.addEventListener('input', (e) => {
        State.strokeBase = clampNumber(e.target.value, 0.25, 6.0, 1.0);
        strokeBaseBadge.textContent = `${State.strokeBase}px`;
        App.renderAll();
      });
    }

    const strokeGuideSlider = document.getElementById('strokeGuideSlider');
    const strokeGuideBadge = document.getElementById('strokeGuideBadge');
    if (strokeGuideSlider && strokeGuideBadge) {
      strokeGuideSlider.addEventListener('input', (e) => {
        State.strokeGuide = clampNumber(e.target.value, 0.25, 8.0, 2.0);
        strokeGuideBadge.textContent = `${State.strokeGuide}px`;
        App.renderAll();
      });
    }

    const fillSlider = document.getElementById('fillOpacitySlider');
    const fillBadge = document.getElementById('fillOpacityBadge');
    if (fillSlider && fillBadge) {
      fillSlider.addEventListener('input', (e) => {
        const pct = clampNumber(e.target.value, 0, 100, 4);
        State.fillOpacity = pct / 100;
        fillBadge.textContent = `${pct}%`;
        App.renderAll();
      });
    }
  },

  bindToggles() {
    const toggleMap = [
      { id: 'toggleActualFlower', prop: 'showActualFlower' },
      { id: 'toggleBaseCircles', prop: 'showBaseCircles' },
      { id: 'toggleGuides', prop: 'showGuides' },
      { id: 'toggleOuterRing', prop: 'showOuterRing' },
      { id: 'toggleBoundaryPetals', prop: 'showBoundaryPetals' },
      { id: 'toggleCenterDots', prop: 'showCenterDots' },
      { id: 'toggleIntersections', prop: 'showIntersections' },
      { id: 'toggleRadialAxes', prop: 'showRadialAxes' },
      { id: 'toggleMetatronLines', prop: 'showMetatronLines' },
      { id: 'toggleEyesOfKryst', prop: 'showEyesOfKryst' },
      { id: 'toggleColorByLayer', prop: 'colorByLayer' },
      { id: 'toggleGlow', prop: 'enableGlow' },
      { id: 'togglePulse', prop: 'enablePulse' }
    ];

    toggleMap.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        el.addEventListener('change', (e) => {
          State[item.prop] = e.target.checked;
          App.renderAll();
        });
      }
    });

    document.querySelectorAll('.platonic-btn').forEach(pbtn => {
      pbtn.addEventListener('click', () => {
        document.querySelectorAll('.platonic-btn').forEach(b => b.classList.remove('active'));
        pbtn.classList.add('active');
        State.platonicFilter = pbtn.dataset.solid;
        App.renderAll();
      });
    });
  },

  bind3DControls() {
    // 3D Architecture Model Switcher
    const modelSelect = document.getElementById('select3DModel');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        State.model3D = e.target.value;
        const isFcc = (State.model3D === 'fcc');
        const fccGroup = document.getElementById('groupFccControls');
        const triaxialPlanes = document.getElementById('groupTriaxialPlanes');
        const infillModeGroup = document.getElementById('groupInfillMode');
        const infillStepsGroup = document.getElementById('groupInfillSteps');

        if (fccGroup) fccGroup.style.display = isFcc ? 'block' : 'none';
        if (triaxialPlanes) triaxialPlanes.style.display = isFcc ? 'none' : 'block';
        if (infillModeGroup) infillModeGroup.style.display = isFcc ? 'none' : 'block';
        if (infillStepsGroup) infillStepsGroup.style.display = isFcc ? 'none' : 'block';

        if (State.dimension === '3d' && window.Renderer3D) {
          window.Renderer3D.renderAll();
          window.Renderer3D.fitCameraAll();
        }
      });
    }

    // Infill Mode Selector
    const infillSelect = document.getElementById('selectInfillMode');
    if (infillSelect) {
      infillSelect.addEventListener('change', (e) => {
        State.triaxialInfill = e.target.value;
        if (State.dimension === '3d' && window.Renderer3D) {
          window.Renderer3D.renderAll();
        }
      });
    }

    // Infill Density Steps Slider
    const infillStepsSlider = document.getElementById('infillStepsSlider');
    const infillStepsBadge = document.getElementById('infillStepsBadge');
    if (infillStepsSlider && infillStepsBadge) {
      infillStepsSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        State.infillSteps = val;
        infillStepsBadge.textContent = `${val} ${val === 1 ? 'Step' : 'Steps'}`;
        if (State.dimension === '3d' && window.Renderer3D) {
          window.Renderer3D.renderAll();
        }
      });
    }

    // 3D Representation toggles
    const toggles = [
      { id: 'togglePlaneXY', prop: 'showPlaneXY' },
      { id: 'togglePlaneXZ', prop: 'showPlaneXZ' },
      { id: 'togglePlaneYZ', prop: 'showPlaneYZ' },
      { id: 'toggleInfill3D', prop: 'showInfill3D' },
      { id: 'toggleAxialRims', prop: 'showAxialRims' },
      { id: 'toggle3DSpheres', prop: 'show3DSpheres' },
      { id: 'toggle3DTorus', prop: 'show3DTorus' },
      { id: 'toggle3DShells', prop: 'show3DShells' },
      { id: 'toggle3DGuides', prop: 'show3DGuides' },
      { id: 'toggleZeroPointMarker', prop: 'showZeroPointMarker' }
    ];

    toggles.forEach(t => {
      const el = document.getElementById(t.id);
      if (el) {
        el.addEventListener('change', (e) => {
          State[t.prop] = e.target.checked;
          if (State.dimension === '3d' && window.Renderer3D) {
            window.Renderer3D.renderAll();
          }
        });
      }
    });

    // 3D Kryst Expansion Mode
    const expSelect = document.getElementById('select3DExpansionMode');
    if (expSelect) {
      expSelect.addEventListener('change', (e) => {
        State.fccExpansionMode = e.target.value;
        if (State.dimension === '3d' && window.Renderer3D) {
          window.Renderer3D.renderAll();
        }
      });
    }

    // Isolate FCC Plane Buttons
    document.querySelectorAll('#fccPlaneBar .fcc-plane-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#fccPlaneBar .fcc-plane-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.fccPlaneFilter = btn.dataset.plane;
        if (State.dimension === '3d' && window.Renderer3D) {
          window.Renderer3D.renderAll();
        }
      });
    });

    // Z-Slice Slider
    const sliceSlider = document.getElementById('sliceZSlider');
    const sliceBadge = document.getElementById('sliceZBadge');
    if (sliceSlider && sliceBadge) {
      sliceSlider.addEventListener('input', (e) => {
        State.sliceZ = Number(e.target.value);
        sliceBadge.textContent = `${State.sliceZ}%`;
        if (window.Renderer3D) {
          window.Renderer3D.updateZSlice();
        }
      });
    }

    // Sphere Opacity Slider
    const opacitySlider = document.getElementById('sphereOpacitySlider');
    const opacityBadge = document.getElementById('sphereOpacityBadge');
    if (opacitySlider && opacityBadge) {
      opacitySlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        State.sphereOpacity = val / 100;
        opacityBadge.textContent = `${val}%`;
        if (window.Renderer3D) {
          window.Renderer3D.renderAll();
        }
      });
    }

    // Camera Presets
    document.getElementById('camPresetTop')?.addEventListener('click', () => {
      document.querySelectorAll('#camPresetTop, #camPresetFront, #camPresetIso').forEach(b => b.classList.remove('active'));
      document.getElementById('camPresetTop')?.classList.add('active');
      State.cameraPreset3D = 'top';
      if (window.Renderer3D) window.Renderer3D.setCameraPreset('top');
    });

    document.getElementById('camPresetFront')?.addEventListener('click', () => {
      document.querySelectorAll('#camPresetTop, #camPresetFront, #camPresetIso').forEach(b => b.classList.remove('active'));
      document.getElementById('camPresetFront')?.classList.add('active');
      State.cameraPreset3D = 'front';
      if (window.Renderer3D) window.Renderer3D.setCameraPreset('front');
    });

    document.getElementById('camPresetIso')?.addEventListener('click', () => {
      document.querySelectorAll('#camPresetTop, #camPresetFront, #camPresetIso').forEach(b => b.classList.remove('active'));
      document.getElementById('camPresetIso')?.classList.add('active');
      State.cameraPreset3D = 'isometric';
      if (window.Renderer3D) window.Renderer3D.setCameraPreset('isometric');
    });

    // Auto-Rotate Toggle
    const autoRotateToggle = document.getElementById('toggleAutoRotate3D');
    if (autoRotateToggle) {
      autoRotateToggle.addEventListener('change', (e) => {
        State.autoRotate3D = e.target.checked;
      });
    }
  },

  bindColorPickers() {
    const colorInputs = [
      { id: 'colorLife', prop: 'colorLife' },
      { id: 'colorKryst', prop: 'colorKryst' },
      { id: 'colorBase', prop: 'colorBase' },
      { id: 'colorTriangle', prop: 'colorTriangle' },
      { id: 'colorGuide', prop: 'colorGuide' },
      { id: 'colorOuter', prop: 'colorOuter' },
      { id: 'colorAxes', prop: 'colorAxes' }
    ];

    colorInputs.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        el.addEventListener('input', (e) => {
          State[item.prop] = e.target.value;
          App.renderAll();
        });
      }
    });
  },

  bindPresets() {
    const btnAdd = document.getElementById('btnAddNewPreset');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => PresetDialog.openNew());
    }

    const btnUpdate = document.getElementById('btnUpdateCurrentPreset');
    if (btnUpdate) {
      btnUpdate.addEventListener('click', () => PresetDialog.saveCurrentToActive());
    }

    const btnManage = document.getElementById('btnManagePresets');
    const manageModal = document.getElementById('presetManageModal');
    if (btnManage && manageModal) {
      btnManage.addEventListener('click', () => manageModal.classList.add('open'));
    }

    const configModal = document.getElementById('presetConfigModal');
    const closeConfigBtn = document.getElementById('closePresetModalBtn');
    const cancelConfigBtn = document.getElementById('cancelPresetModalBtn');
    const saveConfigBtn = document.getElementById('savePresetBtn');
    const captureBtn = document.getElementById('btnCaptureStudioParams');

    if (closeConfigBtn) {
      closeConfigBtn.addEventListener('click', () => configModal.classList.remove('open'));
    }
    if (cancelConfigBtn) {
      cancelConfigBtn.addEventListener('click', () => configModal.classList.remove('open'));
    }
    if (configModal) {
      configModal.addEventListener('click', (e) => {
        if (e.target === configModal) configModal.classList.remove('open');
      });
    }
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', () => PresetDialog.save());
    }
    if (captureBtn) {
      captureBtn.addEventListener('click', () => {
        PresetDialog.populateFormFromConfig(PresetsManager.captureCurrentStudioConfig());
        this.showToast('Live studio parameters copied to form.');
      });
    }

    // Modal Sliders
    const modalNSlider = document.getElementById('presetFormN');
    const modalNBadge = document.getElementById('presetFormNBadge');
    if (modalNSlider && modalNBadge) {
      modalNSlider.addEventListener('input', (e) => {
        modalNBadge.textContent = `N = ${e.target.value}`;
      });
    }

    const modalRSlider = document.getElementById('presetFormR');
    const modalRBadge = document.getElementById('presetFormRBadge');
    if (modalRSlider && modalRBadge) {
      modalRSlider.addEventListener('input', (e) => {
        modalRBadge.textContent = `r = ${e.target.value}px`;
      });
    }

    // Manage Presets Modal
    const closeManageBtn = document.getElementById('closeManagePresetsBtn');
    if (closeManageBtn && manageModal) {
      closeManageBtn.addEventListener('click', () => manageModal.classList.remove('open'));
    }
    if (manageModal) {
      manageModal.addEventListener('click', (e) => {
        if (e.target === manageModal) manageModal.classList.remove('open');
      });
    }

    const btnExportJson = document.getElementById('btnExportPresetsJson');
    if (btnExportJson && manageModal) {
      btnExportJson.addEventListener('click', () => {
        PresetsManager.exportToJson();
        manageModal.classList.remove('open');
      });
    }

    const fileInput = document.getElementById('importPresetsFileInput');
    if (fileInput && manageModal) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          PresetsManager.importFromJson(event.target.result);
          manageModal.classList.remove('open');
          fileInput.value = '';
        };
        reader.readAsText(file);
      });
    }

    const btnResetDefaults = document.getElementById('btnResetPresetsDefaults');
    if (btnResetDefaults && manageModal) {
      btnResetDefaults.addEventListener('click', () => {
        if (confirm('Reset all presets to factory defaults? Custom presets will be cleared.')) {
          PresetsManager.resetAllToDefaults();
          UI.applyPreset('krystonial_comparison');
          UI.showToast('Presets reset to factory defaults.');
          manageModal.classList.remove('open');
        }
      });
    }
  },

  applyPreset(key) {
    const preset = PresetsManager.getPreset(key);
    if (!preset) return;

    State.activePreset = key;
    State.highlightedIds.clear();

    const cfg = preset.config || {};
    if (cfg.N !== undefined) State.setN(cfg.N);
    if (cfg.r !== undefined) State.setRadius(cfg.r);
    if (cfg.viewportMode !== undefined) State.viewportMode = cfg.viewportMode;
    if (cfg.viewStyle !== undefined) State.viewStyle = cfg.viewStyle;
    if (cfg.platonicFilter !== undefined) State.platonicFilter = cfg.platonicFilter;
    if (cfg.showActualFlower !== undefined) State.showActualFlower = Boolean(cfg.showActualFlower);
    if (cfg.showBaseCircles !== undefined) State.showBaseCircles = Boolean(cfg.showBaseCircles);
    if (cfg.showGuides !== undefined) State.showGuides = Boolean(cfg.showGuides);
    if (cfg.showOuterRing !== undefined) State.showOuterRing = Boolean(cfg.showOuterRing);
    if (cfg.showBoundaryPetals !== undefined) State.showBoundaryPetals = Boolean(cfg.showBoundaryPetals);
    if (cfg.showCenterDots !== undefined) State.showCenterDots = Boolean(cfg.showCenterDots);
    if (cfg.showIntersections !== undefined) State.showIntersections = Boolean(cfg.showIntersections);
    if (cfg.showRadialAxes !== undefined) State.showRadialAxes = Boolean(cfg.showRadialAxes);
    if (cfg.showMetatronLines !== undefined) State.showMetatronLines = Boolean(cfg.showMetatronLines);
    if (cfg.showEyesOfKryst !== undefined) State.showEyesOfKryst = Boolean(cfg.showEyesOfKryst);
    if (cfg.sphericalShading !== undefined) State.sphericalShading = Boolean(cfg.sphericalShading);
    if (cfg.fillOpacity !== undefined) State.fillOpacity = clampNumber(cfg.fillOpacity, 0, 1.0, 0.04);
    if (cfg.colorLife !== undefined) State.colorLife = cfg.colorLife;
    if (cfg.colorKryst !== undefined) State.colorKryst = cfg.colorKryst;
    if (cfg.colorBase !== undefined) State.colorBase = cfg.colorBase;
    if (cfg.colorTriangle !== undefined) State.colorTriangle = cfg.colorTriangle;
    if (cfg.colorGuide !== undefined) State.colorGuide = cfg.colorGuide;
    if (cfg.colorOuter !== undefined) State.colorOuter = cfg.colorOuter;
    if (cfg.colorAxes !== undefined) State.colorAxes = cfg.colorAxes;
    if (cfg.strokeFlower !== undefined) State.strokeFlower = clampNumber(cfg.strokeFlower, 0.25, 8.0, 1.5);
    if (cfg.strokeBase !== undefined) State.strokeBase = clampNumber(cfg.strokeBase, 0.25, 6.0, 1.0);
    if (cfg.strokeGuide !== undefined) State.strokeGuide = clampNumber(cfg.strokeGuide, 0.25, 8.0, 2.0);
    if (cfg.colorByLayer !== undefined) State.colorByLayer = Boolean(cfg.colorByLayer);
    if (cfg.enableGlow !== undefined) State.enableGlow = Boolean(cfg.enableGlow);
    if (cfg.enablePulse !== undefined) State.enablePulse = Boolean(cfg.enablePulse);

    // 3D FCC parameters
    if (cfg.dimension !== undefined) {
      this.setDimension(cfg.dimension);
    } else {
      this.setDimension('2d');
    }
    if (cfg.fccPlaneFilter !== undefined) State.fccPlaneFilter = cfg.fccPlaneFilter;
    if (cfg.fccExpansionMode !== undefined) State.fccExpansionMode = cfg.fccExpansionMode;
    if (cfg.show3DSpheres !== undefined) State.show3DSpheres = Boolean(cfg.show3DSpheres);
    if (cfg.show3DTorus !== undefined) State.show3DTorus = Boolean(cfg.show3DTorus);
    if (cfg.show3DShells !== undefined) State.show3DShells = Boolean(cfg.show3DShells);
    if (cfg.show3DGuides !== undefined) State.show3DGuides = Boolean(cfg.show3DGuides);
    if (cfg.showZeroPointMarker !== undefined) State.showZeroPointMarker = Boolean(cfg.showZeroPointMarker);
    if (cfg.sliceZ !== undefined) State.sliceZ = Number(cfg.sliceZ);

    const platonicBar = document.getElementById('platonicBar');
    if (platonicBar) {
      platonicBar.classList.toggle('visible', Boolean(State.showMetatronLines || key === 'metatrons_cube'));
    }

    document.querySelectorAll('.preset-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.preset === key);
    });

    document.querySelectorAll('.platonic-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.solid === State.platonicFilter);
    });

    this.setViewportTab(State.viewportMode);
    this.syncInputsWithState();
    this.updateCounts();
    this.updateSidebarStats();
    App.renderAll();
    this.showToast(`Applied preset: ${preset.title}`);
  },

  setViewportTab(mode) {
    document.querySelectorAll('#viewportSwitcher .view-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });
    this.setViewportMode(mode);
  },

  updateLayerBadge() {
    const layerBadge = document.getElementById('layerCountBadge');
    if (!layerBadge) return;
    if (State.N === 1) {
      layerBadge.textContent = 'N = 1 (Kryst Seed)';
    } else if (State.N === 2) {
      layerBadge.textContent = 'N = 2 (Flower of Kryst)';
    } else if (State.N === 3) {
      layerBadge.textContent = 'N = 3 (Fruit of Kryst)';
    } else if (State.N === 4) {
      layerBadge.textContent = 'N = 4 (Word of Kryst)';
    } else if (State.N === 5) {
      layerBadge.textContent = 'N = 5 (Water of Kryst)';
    } else {
      layerBadge.textContent = `N = ${State.N}`;
    }
  },

  syncInputsWithState() {
    const layerSlider = document.getElementById('layerSlider');
    if (layerSlider) layerSlider.value = State.N;
    this.updateLayerBadge();

    const boolInputs = [
      { id: 'toggleActualFlower', val: State.showActualFlower },
      { id: 'toggleBaseCircles', val: State.showBaseCircles },
      { id: 'toggleGuides', val: State.showGuides },
      { id: 'toggleOuterRing', val: State.showOuterRing },
      { id: 'toggleBoundaryPetals', val: State.showBoundaryPetals },
      { id: 'toggleCenterDots', val: State.showCenterDots },
      { id: 'toggleRadialAxes', val: State.showRadialAxes },
      { id: 'toggleMetatronLines', val: State.showMetatronLines },
      { id: 'toggleEyesOfKryst', val: State.showEyesOfKryst },
      { id: 'toggle3DSpheres', val: State.show3DSpheres },
      { id: 'toggle3DTorus', val: State.show3DTorus },
      { id: 'toggle3DShells', val: State.show3DShells },
      { id: 'toggle3DGuides', val: State.show3DGuides },
      { id: 'toggleZeroPointMarker', val: State.showZeroPointMarker },
      { id: 'toggleAutoRotate3D', val: State.autoRotate3D }
    ];

    boolInputs.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) el.checked = Boolean(item.val);
    });

    const expSelect = document.getElementById('select3DExpansionMode');
    if (expSelect) expSelect.value = State.fccExpansionMode || 'volumetric';

    document.querySelectorAll('#fccPlaneBar .fcc-plane-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.plane === (State.fccPlaneFilter || 'all'));
    });

    const sliceSlider = document.getElementById('sliceZSlider');
    const sliceBadge = document.getElementById('sliceZBadge');
    if (sliceSlider && sliceBadge) {
      sliceSlider.value = State.sliceZ !== undefined ? State.sliceZ : 100;
      sliceBadge.textContent = `${sliceSlider.value}%`;
    }

    const opacitySlider = document.getElementById('sphereOpacitySlider');
    const opacityBadge = document.getElementById('sphereOpacityBadge');
    if (opacitySlider && opacityBadge) {
      const val = Math.round((State.sphereOpacity || 0.92) * 100);
      opacitySlider.value = val;
      opacityBadge.textContent = `${val}%`;
    }
  },

  updateCounts() {
    if (State.dimension === '3d' && window.Renderer3D) {
      window.Renderer3D.update3DStats();
      return;
    }

    const N = State.N;
    const effectiveLifeLayers = SacredMath.getEffectiveLifeLayers(N, State.r);
    const folCount = (State.activePreset === 'fruit_of_life' || State.activePreset === 'metatrons_cube')
      ? 13
      : 1 + 3 * effectiveLifeLayers * (effectiveLifeLayers + 1);
    const fokPoints = SacredMath.generateFlowerOfKrystPoints(N, State.r);
    const fokCount = fokPoints.length;

    const folCountStat = document.getElementById('folCountStat');
    const fokCountStat = document.getElementById('fokCountStat');
    const badgeLifeCount = document.getElementById('badgeLifeCount');
    const badgeKrystCount = document.getElementById('badgeKrystCount');

    if (folCountStat) folCountStat.textContent = `${folCount} Circles`;
    if (badgeLifeCount) badgeLifeCount.textContent = `${folCount} Circles`;

    let krystLabel = `${fokCount} Circles`;
    if (N === 1) krystLabel = `${fokCount} (Kryst Seed)`;
    else if (N === 2) krystLabel = `${fokCount} (Flower of Kryst)`;
    else if (N === 3) krystLabel = `${fokCount} (Fruit of Kryst)`;
    else if (N === 4) krystLabel = `${fokCount} (Word of Kryst)`;
    else if (N === 5) krystLabel = `${fokCount} (Water of Kryst)`;

    if (fokCountStat) fokCountStat.textContent = krystLabel;
    if (badgeKrystCount) badgeKrystCount.textContent = krystLabel;
  },

  updateSidebarStats() {
    const R_bound_life = SacredMath.getFoLBoundingRadius(State.N, State.r);
    const R_bound_kryst = SacredMath.getFoKBoundingRadius(State.N, State.r);
    const boundEl = document.getElementById('sidebarBoundRad');
    if (boundEl) {
      const krystStr = `${Math.round(R_bound_kryst)}px (${(R_bound_kryst / State.r).toFixed(2)}r)`;
      const lifeLayers = SacredMath.getEffectiveLifeLayers(State.N, State.r);
      const lifeStr = `${Math.round(R_bound_life)}px (${2 * lifeLayers + 2}r)`;
      if (State.viewportMode === 'single-kryst') {
        boundEl.textContent = krystStr;
      } else if (State.viewportMode === 'single-life') {
        boundEl.textContent = lifeStr;
      } else {
        boundEl.textContent = `${lifeStr} / ${krystStr}`;
      }
    }
    const hlEl = document.getElementById('sidebarHighlightCount');
    if (hlEl) {
      hlEl.textContent = String(State.highlightedIds.size);
    }
  },

  updateInspector(pt) {
    if (!pt) return;
    const inspectPattern = document.getElementById('inspectPattern');
    const inspectLayer = document.getElementById('inspectLayer');
    const inspectRadius = document.getElementById('inspectRadius');
    const inspectAngle = document.getElementById('inspectAngle');
    const inspectCoords = document.getElementById('inspectCoords');
    const inspectStatus = document.getElementById('inspectStatus');

    if (inspectPattern) inspectPattern.textContent = pt.pattern === 'life' ? 'Flower of Life' : 'Flower of Kryst';
    if (inspectLayer) inspectLayer.textContent = `Layer ${pt.layer} ${pt.isCircularLayer ? '(Circle)' : '(Hex)'}`;
    if (inspectRadius) inspectRadius.textContent = `${pt.d}px (${(pt.d / State.r).toFixed(2)}r)`;
    if (inspectAngle) inspectAngle.textContent = `${pt.angleDeg || 0}°`;
    if (inspectCoords) inspectCoords.textContent = `(${pt.x}, ${pt.y})`;
    if (inspectStatus) inspectStatus.textContent = State.highlightedIds.has(pt.id) ? 'Highlighted' : 'Active';
  },

  bindFloatingControls() {
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
      if (State.dimension === '3d' && window.Renderer3D) {
        ['life', 'kryst'].forEach(k => {
          const vp = window.Renderer3D.viewports[k];
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
        ['life', 'kryst'].forEach(k => {
          const vp = window.Renderer3D.viewports[k];
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
        this.fitToScreen();
      }
    });

    document.getElementById('fitZoomBtn')?.addEventListener('click', () => {
      this.fitToScreen();
    });

    const syncBtn = document.getElementById('syncPanBtn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        State.syncPanZoom = !State.syncPanZoom;
        syncBtn.classList.toggle('active', State.syncPanZoom);
        this.showToast(`Pan & Zoom Sync: ${State.syncPanZoom ? 'Enabled' : 'Disabled'}`);
      });
    }

    document.getElementById('clearHighlightBtn')?.addEventListener('click', () => {
      State.highlightedIds.clear();
      SVGRenderer.updateHighlights('svgLife');
      SVGRenderer.updateHighlights('svgKryst');
      if (State.dimension === '3d' && window.Renderer3D) {
        if (window.Renderer3D.viewports.life) window.Renderer3D.viewports.life.clearHighlight();
        if (window.Renderer3D.viewports.kryst) window.Renderer3D.viewports.kryst.clearHighlight();
      }
      const inspectStatus = document.getElementById('inspectStatus');
      if (inspectStatus) inspectStatus.textContent = 'Cleared';
      this.updateSidebarStats();
    });
  },

  bindModals() {
    // Theory Modal
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

    // Export Modal
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
    document.getElementById('downloadObjBtn')?.addEventListener('click', () => {
      Exporter.downloadOBJ();
      exportModal?.classList.remove('open');
    });
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
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        State.highlightedIds.clear();
        SVGRenderer.updateHighlights('svgLife');
        SVGRenderer.updateHighlights('svgKryst');
        this.updateSidebarStats();
      }
    });
  },

  showToast(text, duration = 2400) {
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
      window.Renderer3D.fitCameraAll();
      return;
    }
    const R_bound = Math.max(SacredMath.getFoLBoundingRadius(State.N, State.r), SacredMath.getFoKBoundingRadius(State.N, State.r));
    const pane = document.querySelector('.viewport-pane');
    const width = pane?.clientWidth || 800;
    const height = pane?.clientHeight || 800;
    const minDim = Math.min(width, height) * 0.85;
    const fitScale = clampNumber(minDim / (2 * R_bound), 0.05, 5.0, 0.38);
    State.transforms.life = { panX: 0, panY: 0, scale: fitScale };
    State.transforms.kryst = { panX: 0, panY: 0, scale: fitScale };
    App.renderAll();
  }
};

window.UI = UI;



  /* =========================================================================
     7. HIGH-RESOLUTION EXPORTER (js/export.js)
     ========================================================================= */
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
      .center-dot { cursor: pointer; }
      .highlighted-circle { stroke: #ffffff !important; stroke-width: 3.5px !important; }
      .highlighted-dot { fill: #ffffff !important; r: 6px !important; }
      .eye-of-kryst { fill: #ff00ff; fill-opacity: 0.7; stroke: #ff00ff; stroke-width: 2.2px; }
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
    const svg = (State.viewportMode === 'single-kryst')
      ? document.getElementById('svgKryst')
      : document.getElementById('svgLife');

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
      a.download = `sacred_geometry_${State.activePreset}_N${State.N}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.UI?.showToast) window.UI.showToast('SVG exported successfully');
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

    const svg = (State.viewportMode === 'single-kryst')
      ? document.getElementById('svgKryst')
      : document.getElementById('svgLife');

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
    if (window.UI?.showToast) window.UI.showToast('Error exporting 3D OBJ model', 3000);
  }
};



  /* =========================================================================
     8. APP INITIALIZATION (js/main.js)
     ========================================================================= */
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
    window.SacredMath = SacredMath;
    window.SacredMath3D = SacredMath3D;
    window.SVGRenderer = SVGRenderer;
    window.Renderer3D = Renderer3D;
    window.UI = UI;
    window.PresetsManager = PresetsManager;
    window.Exporter = Exporter;

    UI.init();

    this.panZoomControllers.push(new PanZoomController('svgWrapperLife', 'svgLife', 'life'));
    this.panZoomControllers.push(new PanZoomController('svgWrapperKryst', 'svgKryst', 'kryst'));

    // Initialize 3D WebGL renderer lazily or on demand
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

    // Default: Apply Krystonial comparison preset
    UI.applyPreset('krystonial_comparison');

    // Automatically fit initial view to display whole initial flowers
    requestAnimationFrame(() => {
      UI.fitToScreen();
    });
  },

  renderAll() {
    if (State.dimension === '3d') {
      Renderer3D.renderAll();
      return;
    }
    if (State.viewportMode === 'superimposed') {
      SVGRenderer.renderSuperimposed('svgLife', State.transforms.life);
    } else {
      SVGRenderer.render('svgLife', 'life', State.transforms.life);
      SVGRenderer.render('svgKryst', 'kryst', State.transforms.kryst);
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

})(window, document);
