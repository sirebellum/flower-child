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
        area: Math.PI * R * R
      }];
    }

    const tol = Math.max(0.25, 0.005 * R);
    const tolSq = tol * tol;

    // 1. Find all pairwise intersection points
    const rawIntersections = [];
    const M = circles.length;
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
        rawIntersections.push({ x: mx - h * uy, y: my + h * ux });
        rawIntersections.push({ x: mx + h * uy, y: my - h * ux });
      }
    }

    if (rawIntersections.length === 0) {
      return circles.map((c, idx) => ({
        id: `sec_${idx}`,
        d: `M ${fmt(c.x - R)} ${fmt(c.y)} A ${R} ${R} 0 1 0 ${fmt(c.x + R)} ${fmt(c.y)} A ${R} ${R} 0 1 0 ${fmt(c.x - R)} ${fmt(c.y)} Z`,
        cx: Math.abs(c.x) < 1e-4 ? 0 : Number(c.x.toFixed(3)),
        cy: Math.abs(c.y) < 1e-4 ? 0 : Number(c.y.toFixed(3)),
        area: Math.PI * R * R
      }));
    }

    // 2. Spatial grid deduplication of vertices
    const cellSize = tol * 2.5;
    const grid = new Map();
    const vertices = [];

    for (let pIdx = 0; pIdx < rawIntersections.length; pIdx++) {
      const pt = rawIntersections[pIdx];
      const gx = Math.floor(pt.x / cellSize);
      const gy = Math.floor(pt.y / cellSize);
      let found = null;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const bucket = grid.get(`${gx + dx},${gy + dy}`);
          if (bucket) {
            for (let b = 0; b < bucket.length; b++) {
              const v = bucket[b];
              if ((v.x - pt.x) ** 2 + (v.y - pt.y) ** 2 < tolSq) {
                found = v;
                break;
              }
            }
          }
          if (found) break;
        }
        if (found) break;
      }
      if (!found) {
        const newV = { id: vertices.length, x: pt.x, y: pt.y };
        vertices.push(newV);
        const key = `${gx},${gy}`;
        let b = grid.get(key);
        if (!b) { b = []; grid.set(key, b); }
        b.push(newV);
      }
    }

    // 3. Circle boundary arc half-edges
    const halfEdges = [];
    const vertexOutgoing = new Map();
    for (let v = 0; v < vertices.length; v++) vertexOutgoing.set(vertices[v].id, []);

    for (let cIdx = 0; cIdx < M; cIdx++) {
      const c = circles[cIdx];
      const circleVerts = [];
      for (let v = 0; v < vertices.length; v++) {
        const vert = vertices[v];
        const dist = Math.hypot(vert.x - c.x, vert.y - c.y);
        if (Math.abs(dist - R) < tol) {
          circleVerts.push({ vId: vert.id, angle: Math.atan2(vert.y - c.y, vert.x - c.x) });
        }
      }
      if (circleVerts.length < 2) continue;

      circleVerts.sort((a, b) => a.angle - b.angle);
      const K = circleVerts.length;
      for (let k = 0; k < K; k++) {
        const cv1 = circleVerts[k];
        const cv2 = circleVerts[(k + 1) % K];
        const v1 = vertices[cv1.vId];
        const v2 = vertices[cv2.vId];

        // CCW Arc: cv1 -> cv2
        let dThetaCCW = cv2.angle - cv1.angle;
        if (dThetaCCW <= 0) dThetaCCW += 2 * Math.PI;

        const deltaCCW = Math.min(0.05 * dThetaCCW, 0.02);
        const aOutCCW = cv1.angle + deltaCCW;
        const pOutCCW = { x: c.x + R * Math.cos(aOutCCW), y: c.y + R * Math.sin(aOutCCW) };
        const secantOutCCW = Math.atan2(pOutCCW.y - v1.y, pOutCCW.x - v1.x);

        const aInCCW = cv2.angle - deltaCCW;
        const pInCCW = { x: c.x + R * Math.cos(aInCCW), y: c.y + R * Math.sin(aInCCW) };
        const secantInCCW = Math.atan2(v2.y - pInCCW.y, v2.x - pInCCW.x);

        const heCCW = {
          id: halfEdges.length,
          fromV: cv1.vId,
          toV: cv2.vId,
          dTheta: dThetaCCW,
          isCCW: true,
          secantOut: secantOutCCW,
          secantIn: secantInCCW,
          used: false
        };
        halfEdges.push(heCCW);
        vertexOutgoing.get(cv1.vId).push(heCCW);

        // CW Arc: cv2 -> cv1
        let dThetaCW = cv1.angle - cv2.angle;
        if (dThetaCW <= 0) dThetaCW += 2 * Math.PI;

        const deltaCW = Math.min(0.05 * dThetaCW, 0.02);
        const aOutCW = cv2.angle - deltaCW;
        const pOutCW = { x: c.x + R * Math.cos(aOutCW), y: c.y + R * Math.sin(aOutCW) };
        const secantOutCW = Math.atan2(pOutCW.y - v2.y, pOutCW.x - v2.x);

        const aInCW = cv1.angle + deltaCW;
        const pInCW = { x: c.x + R * Math.cos(aInCW), y: c.y + R * Math.sin(aInCW) };
        const secantInCW = Math.atan2(v1.y - pInCW.y, v1.x - pInCW.x);

        const heCW = {
          id: halfEdges.length,
          fromV: cv2.vId,
          toV: cv1.vId,
          dTheta: dThetaCW,
          isCCW: false,
          secantOut: secantOutCW,
          secantIn: secantInCW,
          used: false
        };
        halfEdges.push(heCW);
        vertexOutgoing.get(cv2.vId).push(heCW);

        heCCW.twin = heCW;
        heCW.twin = heCCW;
      }
    }

    // Sort outgoing half-edges around each vertex in CCW order by secant angle
    for (const [vId, edges] of vertexOutgoing) {
      edges.sort((a, b) => a.secantOut - b.secantOut);
    }

    // 4. Trace faces (planar DCEL face extraction)
    const sections = [];
    for (let eIdx = 0; eIdx < halfEdges.length; eIdx++) {
      const he = halfEdges[eIdx];
      if (he.used) continue;

      const faceEdges = [];
      let curr = he;
      let valid = true;

      while (!curr.used) {
        curr.used = true;
        faceEdges.push(curr);
        const targetV = curr.toV;
        const outgoing = vertexOutgoing.get(targetV);
        if (!outgoing || outgoing.length === 0) {
          valid = false;
          break;
        }

        // Find incoming reverse secant angle
        let inRev = curr.secantIn + Math.PI;
        while (inRev > Math.PI) inRev -= 2 * Math.PI;
        while (inRev <= -Math.PI) inRev += 2 * Math.PI;

        // Choose next edge that makes the most acute/closest CCW turn
        let bestNext = null;
        let minDiff = Infinity;
        for (let n = 0; n < outgoing.length; n++) {
          const nextHe = outgoing[n];
          let diff = nextHe.secantOut - inRev;
          while (diff < 0) diff += 2 * Math.PI;
          while (diff >= 2 * Math.PI) diff -= 2 * Math.PI;
          if (diff < 1e-6) diff = 2 * Math.PI;
          if (diff < minDiff) {
            minDiff = diff;
            bestNext = nextHe;
          }
        }

        if (!bestNext) {
          valid = false;
          break;
        }
        curr = bestNext;
        if (curr === he) break;
        if (faceEdges.length > 500) {
          valid = false;
          break;
        }
      }

      if (valid && curr === he && faceEdges.length >= 2) {
        let polyArea = 0;
        let cx = 0;
        let cy = 0;
        for (let i = 0; i < faceEdges.length; i++) {
          const v1 = vertices[faceEdges[i].fromV];
          const v2 = vertices[faceEdges[i].toV];
          polyArea += (v1.x * v2.y - v2.x * v1.y);
          cx += v1.x;
          cy += v1.y;
        }
        polyArea /= 2;

        // Internal faces have negative polygon area (clockwise orientation in screen coordinates)
        if (polyArea < -0.1) {
          cx /= faceEdges.length;
          cy /= faceEdges.length;

          let d = `M ${fmt(vertices[faceEdges[0].fromV].x)} ${fmt(vertices[faceEdges[0].fromV].y)}`;
          for (let i = 0; i < faceEdges.length; i++) {
            const e = faceEdges[i];
            const vTo = vertices[e.toV];
            const largeArc = e.dTheta > Math.PI ? 1 : 0;
            const sweep = e.isCCW ? 1 : 0;
            d += ` A ${R} ${R} 0 ${largeArc} ${sweep} ${fmt(vTo.x)} ${fmt(vTo.y)}`;
          }
          d += ' Z';

          sections.push({
            id: `sec_${sections.length}`,
            d,
            cx: Math.abs(cx) < 1e-4 ? 0 : Number(cx.toFixed(3)),
            cy: Math.abs(cy) < 1e-4 ? 0 : Number(cy.toFixed(3)),
            area: Math.abs(polyArea)
          });
        }
      }
    }

    return sections;
  }
};

export {
  SacredMath,
  createKrystStamp,
  getKrystGeometry,
  getFlowerOfLifeGeometry,
  getFlowerOfLifeLayerRotation,
  getEffectiveLifeLayers
};
export default SacredMath;
