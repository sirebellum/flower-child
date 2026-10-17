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
const DIST_TRI_APEX  = 2 + 2 * SQRT3;     // (2 + 2√3) ≈ 5.4641016 (radial distance to triangle apex circle)
const STAMP_STEP     = 4 + 2 * SQRT3;     // (4 + 2√3) ≈ 7.4641016 (center-to-center distance between hexagons)
const EPSILON        = 1e-3;

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

    // 2. Outer Hexagon 6 Ring Circles
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

  /**
   * Alias for createKrystStamp for backward compatibility
   */
  getKrystStamp(cx, cy, r) {
    return createKrystStamp(cx, cy, r);
  },

  /**
   * Generates hexagonal lattice ring centers for ring index s >= 1 with step size stepSize.
   */
  getHexRingCenters(ring, stepSize, angleOffsetDeg = 0) {
    if (ring <= 0) return [{ x: 0, y: 0 }];
    const centers = [];
    const ringRadius = ring * stepSize;
    const vertices = [];
    for (let m = 0; m < 6; m++) {
      const a = (m * 60 + angleOffsetDeg) * DEG_TO_RAD;
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
   * Generates all circle centers for Flower of Life up to layer N.
   */
  generateFlowerOfLifePoints(N, r) {
    const points = [];
    // Layer 0: Origin Center
    points.push({
      id: 'fol_0_0',
      pattern: 'life',
      layer: 0,
      index: 0,
      x: 0,
      y: 0,
      d: 0,
      angleDeg: 0,
      isVertex: true
    });

    for (let k = 1; k <= N; k++) {
      const vertexRadius = 2 * k * r;
      const vertices = [];
      for (let m = 0; m < 6; m++) {
        const angle = m * 60 * DEG_TO_RAD;
        vertices.push({
          x: vertexRadius * Math.cos(angle),
          y: vertexRadius * Math.sin(angle)
        });
      }

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
            isVertex: (j === 0)
          });
        }
      }
    }
    return points;
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
   * Generates virtual Flower of Life centers for layers N+1 and N+2
   * that intersect the bounding circle R_bound = (2N+2)r.
   */
  generateVirtualBoundaryPoints(N, r) {
    const R_bound = (2 * N + 2) * r;
    const virtualLayers = [N + 1, N + 2];
    const virtualPoints = [];

    for (const k of virtualLayers) {
      const vertexRadius = 2 * k * r;
      const vertices = [];
      for (let m = 0; m < 6; m++) {
        const angle = m * 60 * DEG_TO_RAD;
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

export { SacredMath, createKrystStamp, getKrystGeometry };
export default SacredMath;
