/**
 * SACRED GEOMETRY 3D MATHEMATICAL ENGINE (js/geometry3d.js)
 * Implements 3D Face-Centered Cubic (FCC, ABCABC...) close-packing,
 * Vector Equilibrium (Cuboctahedron), and 3D Kryst Stamp expansion.
 * Pure mathematical functions with no DOM or global state access.
 */

import { SacredMath, createKrystStamp, getKrystGeometry, getKrystUnitLattice } from './geometry.js';

/* =========================================================================
   1. CORE 3D FCC & VOLUMETRIC KRYST CONSTANTS
   ========================================================================= */
export const SQRT3 = Math.sqrt(3);
export const SQRT6 = Math.sqrt(6);

// Exact vertical height of regular 3D tetrahedron of tangent spheres with edge 2r:
// h_tet = 2r * √(2/3) = √(8/3) * r ≈ 1.632993161855452 * r
export const TET_PITCH = Math.sqrt(8 / 3);
export const FCC_DZ = TET_PITCH;

// XY radial distance from hexagon center to 3 upper/lower triangular dimples:
// d_pocket = 2r / √3 = (2√3 / 3) * r ≈ 1.1547005383792515 * r
export const OCTANT_CORNER_DIST = (2 / SQRT3);
export const FCC_POCKET_R = OCTANT_CORNER_DIST;

// 2D Kryst Stamp Constants extended into 3D
export const DIST_HEX = 2;                   // 2r
export const DIST_TRI_INNER = 2 + SQRT3;     // (2 + √3)r ≈ 3.7320508 * r
export const DIST_TRI_APEX = 2 + 2 * SQRT3; // (2 + 2√3)r ≈ 5.4641016 * r
export const STAMP_STEP = 4 + 2 * SQRT3;     // (4 + 2√3)r ≈ 7.4641016 * r
export const DIST_BRIDGE_BASE = 4 + 3 * SQRT3; // (4 + 3√3)r ≈ 9.1961524 * r
export const EPSILON = 1e-3;

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
export function getFCCPlane(z, r) {
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
export function getFCCBasisVectors(r) {
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
export function getKrystStampVectors(r, mode = 'volumetric') {
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
export function getLife3DGeometry(K, r) {
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
export function createKrystStamp3D(cx, cy, cz, r) {
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
export function getOctantId(x, y, z, tol = 1e-2) {
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
export function getKrystGeometry3D(N, r, options = {}) {
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
export function getKryst3DGeometry(N, r, options = {}) {
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
export function checkSaturation(spheres, R_bound, r) {
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
export function getTriAxialGeometry(patternKey, N, r, options = {}) {
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
export const SacredMath3D = {
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

export default SacredMath3D;
