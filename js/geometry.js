/**
 * SACRED GEOMETRY MATHEMATICAL ENGINE
 * Pure mathematical functions for Flower of Life & Flower of Kryst.
 * Strictly pure functions with no DOM or global state access.
 */

/* =========================================================================
   NAMED MATHEMATICAL CONSTANTS
   ========================================================================= */
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const SQRT_3 = Math.sqrt(3);
const COS_30 = SQRT_3 / 2; // Math.cos(Math.PI / 6)
const SIN_30 = 0.5;        // Math.sin(Math.PI / 6)
const COS_60 = 0.5;        // Math.cos(Math.PI / 3)
const SIN_60 = SQRT_3 / 2; // Math.sin(Math.PI / 3)

/**
 * Exact closed-form sin(15°) = (sqrt(6) - sqrt(2)) / 4
 * Used for Layer 2 Middle Circle radius: R2 = r / sin(15°) ≈ 3.8637033 r
 */
const SIN_15 = (Math.sqrt(6) - Math.sqrt(2)) / 4;

/**
 * Exact closed-form cos(15°) = (sqrt(6) + sqrt(2)) / 4
 * Used for Layer 3 honeycomb step size: D = 2 * R3 * cos(15°)
 */
const COS_15 = (Math.sqrt(6) + Math.sqrt(2)) / 4;

/**
 * Relative tolerance factor for floating-point coordinate comparisons
 */
const EPSILON = 1e-4;

/* =========================================================================
   PURE HELPER FUNCTIONS
   ========================================================================= */

/**
 * Checks whether a 2D coordinate is within spatial tolerance of any point in the list.
 * Uses squared Euclidean distance to eliminate redundant square roots.
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
 * Checks whether a guide shape (hexagon or circle) already exists in the list.
 * @param {Array<{type: string, cx: number, cy: number, radius: number}>} guides - Existing guides.
 * @param {{type: string, cx: number, cy: number, radius: number}} candidate - Candidate guide.
 * @param {number} tolerance - Spatial and radial tolerance threshold.
 * @returns {boolean} True if an equivalent guide exists.
 */
function isDuplicateGuide(guides, candidate, tolerance) {
  const tolSq = tolerance * tolerance;
  for (let i = 0; i < guides.length; i++) {
    const g = guides[i];
    if (g.type === candidate.type && Math.abs(g.radius - candidate.radius) < tolerance) {
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
   MATHEMATICAL GEOMETRY ENGINE
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
  EPSILON,

  /**
   * Generates all circle centers for Flower of Life up to layer N.
   * - Layer 0: 1 center at (0, 0).
   * - Layer k >= 1: 6k centers on perimeter of regular hexagon of vertex radius 2kr.
   *
   * @param {number} N - Number of concentric hexagonal layers (N >= 1).
   * @param {number} r - Base circle radius in pixels.
   * @returns {Array<{id: string, pattern: string, layer: number, edge?: number, step?: number, x: number, y: number, d: number, angleDeg: number, isVertex: boolean}>}
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
   * Generates a 3-Layer Base Stamp (Fruit of Kryst) centered at (cx, cy).
   * - Layer 1 (Inner Hexagon, 6 circles): Radius R1 = 2r, angles m * 60°
   *   Guide: Regular Hexagon of vertex radius R1 centered at (cx, cy).
   * - Layer 2 (Middle Circle, 12 circles): Radius R2 = r / sin(15°) ≈ 3.8637r, angles m * 30°
   *   Guide: Circle of radius R2 centered at (cx, cy).
   * - Layer 3 (Outer Hexagon, 12 circles): Vertex radius R3 = R2 + 2r ≈ 5.8637r
   *     6 vertices at R3 ∠ (m * 60°)
   *     6 edge-midpoints at apothem A3 = R3 * cos(30°) ∠ (m * 60° + 30°)
   *   Guide: Regular Hexagon of vertex radius R3 centered at (cx, cy).
   *
   * maxLocalLayer is strictly clamped to 1, 2, or 3 (never a 4th concentric guide/layer).
   *
   * @param {number} cx - X-coordinate of stamp center.
   * @param {number} cy - Y-coordinate of stamp center.
   * @param {number} r - Base circle radius.
   * @param {number} [maxLocalLayer=3] - Maximum local layer to generate (1, 2, or 3).
   * @returns {{points: Array<{x: number, y: number, layer: number, isVertex: boolean}>, guides: Array<{type: string, cx: number, cy: number, radius: number}>}}
   */
  getKrystStamp(cx, cy, r, maxLocalLayer = 3) {
    const points = [];
    const guides = [];
    const L = Math.max(1, Math.min(3, Math.floor(maxLocalLayer || 3)));

    const R1 = 2 * r;
    const R2 = r / SIN_15;
    // R3 = R2 * sqrt(2) = 2 * (sqrt(3) + 1) * r ≈ 5.4641016 r
    // Tangent distance to both adjacent Layer 2 circles is exactly 2r
    const R3 = R2 * Math.SQRT2;

    // Layer 1: Inner Hexagon (6 circles)
    if (L >= 1) {
      for (let m = 0; m < 6; m++) {
        const a = m * 60 * DEG_TO_RAD;
        points.push({
          x: cx + R1 * Math.cos(a),
          y: cy + R1 * Math.sin(a),
          layer: 1,
          isVertex: true
        });
      }
      guides.push({ type: 'hexagon', cx, cy, radius: R1 });
    }

    // Layer 2: Middle Circle (12 circles)
    if (L >= 2) {
      for (let m = 0; m < 12; m++) {
        const a = m * 30 * DEG_TO_RAD;
        points.push({
          x: cx + R2 * Math.cos(a),
          y: cy + R2 * Math.sin(a),
          layer: 2,
          isVertex: (m % 2 === 0)
        });
      }
      guides.push({ type: 'circle', cx, cy, radius: R2 });
    }

    // Layer 3: Outer Circle (12 circles rotated by 15° to nest cleanly between middle circle circles)
    if (L >= 3) {
      for (let m = 0; m < 12; m++) {
        const a = (m * 30 + 15) * DEG_TO_RAD;
        points.push({
          x: cx + R3 * Math.cos(a),
          y: cy + R3 * Math.sin(a),
          layer: 3,
          isVertex: (m % 2 === 0)
        });
      }
      guides.push({ type: 'circle', cx, cy, radius: R3 });
    }

    return { points, guides };
  },

  /**
   * Generates hexagonal lattice ring centers for ring index s >= 1 with step size stepSize.
   * Optional angleOffsetDeg rotates the primary lattice directions (e.g. 30° for honeycomb alignment).
   *
   * @param {number} ring - Ring index (s >= 1).
   * @param {number} stepSize - Center-to-center distance between neighboring stamps.
   * @param {number} [angleOffsetDeg=0] - Rotational offset in degrees.
   * @returns {Array<{x: number, y: number}>} Array of lattice center coordinates.
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
   * Honeycomb Stamp Tiling Engine: getKrystGeometry(N, r)
   * The center stamp has 6 stamps around it with the outermost (Layer 3) circles
   * overlapping and sharing pairs of circles in a seamless honeycomb lattice tiling.
   * Center-to-center distance is D = 2 * R3 * cos(15°) = 2 * sqrt(2) * (2 + sqrt(3)) * r along the 30° radial axes.
   * - N=1..3: Central stamp at (0, 0) with maxLocalLayer = N
   * - N=4..6: Central stamp (Layers 1-3) + 6 outer honeycomb stamps with maxLocalLayer = N - 3
   * - N>6: Extended honeycomb lattice rings of step size D = 2 * R3 * cos(15°)
   *
   * @param {number} N - Layer progression depth.
   * @param {number} r - Base circle radius.
   * @returns {{points: Array<{x: number, y: number, layer: number, isVertex: boolean, stampCx: number, stampCy: number, stampRing: number}>, guides: Array<{type: string, cx: number, cy: number, radius: number}>, boundingRadius: number, stamps: Array<{cx: number, cy: number, maxLocalLayer: number, ring: number}>}}
   */
  getKrystGeometry(N, r) {
    if (N <= 0) {
      return { points: [], guides: [], boundingRadius: 2 * r, stamps: [] };
    }

    const R2 = r / SIN_15;
    const R3 = R2 * Math.SQRT2;
    const stepSize = 2 * R3 * COS_15; // Honeycomb lattice spacing: 2 * R3 * cos(15°)
    const s_max = Math.floor((N - 1) / 3);
    const L_active = ((N - 1) % 3) + 1;

    const stamps = [];
    if (s_max === 0) {
      stamps.push({ cx: 0, cy: 0, maxLocalLayer: L_active, ring: 0 });
    } else {
      // Ring 0: Central stamp is fully built (Layers 1-3)
      stamps.push({ cx: 0, cy: 0, maxLocalLayer: 3, ring: 0 });

      // Prior rings 1 ... s_max - 1
      for (let s = 1; s < s_max; s++) {
        const ringCenters = this.getHexRingCenters(s, stepSize, 30);
        for (const c of ringCenters) {
          stamps.push({ cx: c.x, cy: c.y, maxLocalLayer: 3, ring: s });
        }
      }

      // Outermost active stamp ring s_max
      const outerCenters = this.getHexRingCenters(s_max, stepSize, 30);
      for (const c of outerCenters) {
        stamps.push({ cx: c.x, cy: c.y, maxLocalLayer: L_active, ring: s_max });
      }
    }

    const rawPoints = [];
    const rawGuides = [];
    for (const s of stamps) {
      const stamp = this.getKrystStamp(s.cx, s.cy, r, s.maxLocalLayer);
      for (const pt of stamp.points) {
        rawPoints.push({
          ...pt,
          stampCx: s.cx,
          stampCy: s.cy,
          stampRing: s.ring
        });
      }
      rawGuides.push(...stamp.guides);
    }

    // Exclude (0, 0) and any stamp center C_m from having a circle placed on it
    // (guarantees empty zero-point center at every stamp origin)
    const minOriginDistSq = (0.5 * r) * (0.5 * r);
    const filteredPoints = rawPoints.filter(pt => {
      for (const s of stamps) {
        const dx = pt.x - s.cx;
        const dy = pt.y - s.cy;
        if (dx * dx + dy * dy < minOriginDistSq) {
          return false;
        }
      }
      return true;
    });

    // Deduplicate points using consistent relative tolerance check:
    // Relative tolerance ensures numerical stability across float trig evaluations
    const tol = Math.max(0.2, EPSILON * r * 100);
    const dedupedPoints = [];

    for (const pt of filteredPoints) {
      if (!isDuplicatePoint(dedupedPoints, pt.x, pt.y, tol)) {
        dedupedPoints.push(pt);
      }
    }

    // Deduplicate guide shapes by (type, cx, cy, radius)
    const dedupedGuides = [];
    for (const g of rawGuides) {
      if (!isDuplicateGuide(dedupedGuides, g, tol)) {
        dedupedGuides.push(g);
      }
    }

    // Dynamic Outer Bounding Ring: R_bound = max_i sqrt(x_i^2 + y_i^2) + 2r
    let maxDistSq = 0;
    for (const pt of dedupedPoints) {
      const dSq = pt.x * pt.x + pt.y * pt.y;
      if (dSq > maxDistSq) maxDistSq = dSq;
    }
    const maxDist = Math.sqrt(maxDistSq);
    const boundingRadius = (dedupedPoints.length > 0) ? (maxDist + 2 * r) : (2 * r);

    return {
      points: dedupedPoints,
      guides: dedupedGuides,
      boundingRadius,
      stamps
    };
  },

  /**
   * Returns deduplicated circle center points for Flower of Kryst up to layer N.
   *
   * @param {number} N - Layer progression depth.
   * @param {number} r - Base circle radius.
   * @returns {Array<{x: number, y: number, layer: number, isVertex: boolean, stampCx: number, stampCy: number, stampRing: number}>}
   */
  getKrystCoordinates(N, r) {
    return this.getKrystGeometry(N, r).points;
  },

  /**
   * Dynamic Outer Bounding Circle radius for Flower of Kryst: max_i sqrt(x_i^2 + y_i^2) + 2r
   *
   * @param {number} N - Layer progression depth.
   * @param {number} r - Base circle radius.
   * @returns {number} Outer circumscribing boundary radius.
   */
  getFoKBoundingRadius(N, r) {
    return this.getKrystGeometry(N, r).boundingRadius;
  },

  /**
   * Generates all circle center node objects for Flower of Kryst up to layer N.
   * Adapts the deduplicated array of coordinates for SVG rendering and interactivity.
   *
   * @param {number} N - Layer progression depth.
   * @param {number} r - Base circle radius.
   * @returns {Array<{id: string, pattern: string, layer: number, index: number, x: number, y: number, d: number, angleDeg: number, isVertex: boolean, isCircularLayer: boolean, stampRing: number}>}
   */
  generateFlowerOfKrystPoints(N, r) {
    const coords = this.getKrystCoordinates(N, r);
    return coords.map((pt, idx) => {
      const d = Math.hypot(pt.x, pt.y);
      let angleDeg = Math.atan2(pt.y, pt.x) * RAD_TO_DEG;
      if (angleDeg < 0) angleDeg += 360;
      return {
        id: `fok_${pt.layer || 1}_${idx}`,
        pattern: 'kryst',
        layer: pt.layer || 1,
        index: idx,
        x: Number(pt.x.toFixed(4)),
        y: Number(pt.y.toFixed(4)),
        d: Number(d.toFixed(4)),
        angleDeg: Number(angleDeg.toFixed(2)),
        isVertex: Boolean(pt.isVertex),
        isCircularLayer: (pt.layer === 2 || pt.layer === 3),
        stampRing: pt.stampRing ?? 0
      };
    });
  },

  /**
   * Computes the 3 Pairs of Eyes (6 vesica piscis lens intersections) of Kryst.
   * Formed along the 3 primary axes (0-180°, 60-240°, 120-300°) between
   * Layer 1 circles (radius 2r at distance 2r) and Layer 2 circles (radius 2r at distance R_2).
   *
   * @param {number} r - Base circle radius.
   * @returns {Array<{id: string, axisIndex: number, pairIndex: number, angleDeg: number, center: {x: number, y: number}, pathD: string}>}
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
   *
   * @param {number} N - Layer count.
   * @param {number} r - Base circle radius.
   * @returns {Array<{x: number, y: number, d: number}>}
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
          // Only include if the circle of radius 2r intersects the bounding circle
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
   * Uses squared distance spatial thresholding to optimize performance.
   *
   * @param {Array<{x: number, y: number}>} points - Circle center coordinates.
   * @param {number} R - Circle radius (2r).
   * @returns {Array<{x: number, y: number}>} Deduplicated intersection node coordinates.
   */
  computeIntersectionNodes(points, R) {
    const nodes = [];
    const thresholdSq = 1.0; // 1px cluster tolerance squared
    const maxNodes = 450;
    const R_sq = R * R;
    const two_R = 2 * R;

    for (let i = 0; i < points.length && nodes.length < maxNodes; i++) {
      for (let j = i + 1; j < points.length && nodes.length < maxNodes; j++) {
        const p1 = points[i];
        const p2 = points[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;

        // Two circles of radius R intersect if 0 < dist <= 2R
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
   *
   * @param {number} r - Base circle radius.
   * @returns {Array<{id: string, x: number, y: number, layer: number, label: string, isVertex: boolean}>}
   */
  getFruitOfLifeCenters(r) {
    const centers = [{ id: 'fol_0_0', x: 0, y: 0, layer: 0, label: 'Center (0)', isVertex: true }];
    // 6 in Layer 1 (radius 2r)
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
    // 6 in Layer 2 Vertices (radius 4r)
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

export { SacredMath };
export default SacredMath;
