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
function getKrystGeometryByRadius(boundaryRadius, r, disabledIds = new Set(), fullScreen = false, auraScale = 2.0) {
  const maxRadiusInR = fullScreen ? 40 : Math.max(2, boundaryRadius / r);
  const lattice = getKrystUnitLattice(Math.ceil(maxRadiusInR));
  const maxD = maxRadiusInR + EPSILON;

  const circles = [];
  const auraCircles = [];
  const ringCounts = new Map();
  let totalCircles = 0;
  const effectiveAuraScale = (auraScale !== undefined && auraScale !== null) ? Number(auraScale) : 2.0;

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
function getFlowerOfLifeGeometryByRadius(boundaryRadius, r, disabledIds = new Set(), fullScreen = false, auraScale = 2.0) {
  const maxLayers = fullScreen ? 30 : Math.max(1, Math.ceil(boundaryRadius / (2 * r)));
  const rawGeom = getFlowerOfLifeGeometry(maxLayers, r);

  const circles = [];
  const auraCircles = [];
  const ringCounts = new Map();
  let totalCircles = 0;
  const maxD = fullScreen ? Infinity : boundaryRadius + EPSILON;
  const effectiveAuraScale = (auraScale !== undefined && auraScale !== null) ? Number(auraScale) : 2.0;

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
    if (!circles || circles.length === 0) return [];

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

export {
  SacredMath,
  createKrystStamp,
  getKrystGeometry,
  getKrystGeometryByRadius,
  getNearestValidBoundaryRadius,
  getKrystUnitLattice,
  getFlowerOfLifeGeometry,
  getFlowerOfLifeGeometryByRadius,
  getFlowerOfLifeLayerRotation,
  getEffectiveLifeLayers,
  getSOHOEPaths,
  getHexagramEyePaths,
  getOffsetPathRings,
  computeCircleSections,
  KRYST_STAGE_NAMES,
  LIFE_STAGE_NAMES,
  KRYST_STORY_DATA,
  RING_NOTES_DATA
};
export default SacredMath;
