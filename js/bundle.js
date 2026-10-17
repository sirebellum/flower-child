/**
 * SACRED GEOMETRY STUDIO — STANDALONE BUNDLE
 * Enables seamless execution on both file:/// direct protocol and local HTTP server.
 * Pure standalone bundle without external module import/export requirements.
 */
(function(window, document) {
  'use strict';

  /* =========================================================================
     1. MATHEMATICAL GEOMETRY ENGINE (js/geometry.js)
     ========================================================================= */
  const DEG_TO_RAD = Math.PI / 180;
  const RAD_TO_DEG = 180 / Math.PI;
  const SQRT_3 = Math.sqrt(3);
  const COS_30 = SQRT_3 / 2;
  const SIN_30 = 0.5;
  const COS_60 = 0.5;
  const SIN_60 = SQRT_3 / 2;
  const SIN_15 = (Math.sqrt(6) - Math.sqrt(2)) / 4;
  const COS_15 = (Math.sqrt(6) + Math.sqrt(2)) / 4;
  const EPSILON = 1e-4;

  function isDuplicatePoint(points, x, y, tolerance) {
    const tolSq = tolerance * tolerance;
    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - x;
      const dy = points[i].y - y;
      if (dx * dx + dy * dy < tolSq) return true;
    }
    return false;
  }

  function isDuplicateGuide(guides, candidate, tolerance) {
    const tolSq = tolerance * tolerance;
    for (let i = 0; i < guides.length; i++) {
      const g = guides[i];
      if (g.type === candidate.type && Math.abs(g.radius - candidate.radius) < tolerance) {
        const dx = g.cx - candidate.cx;
        const dy = g.cy - candidate.cy;
        if (dx * dx + dy * dy < tolSq) return true;
      }
    }
    return false;
  }

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

    generateFlowerOfLifePoints(N, r) {
      const points = [];
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

    getKrystStamp(cx, cy, r, maxLocalLayer = 3) {
      const points = [];
      const guides = [];
      const L = Math.max(1, Math.min(3, Math.floor(maxLocalLayer || 3)));

      const R1 = 2 * r;
      const R2 = r / SIN_15;
      const R3 = R2 * Math.SQRT2;

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

    getKrystGeometry(N, r) {
      if (N <= 0) {
        return { points: [], guides: [], boundingRadius: 2 * r, stamps: [] };
      }

      const R2 = r / SIN_15;
      const R3 = R2 * Math.SQRT2;
      const stepSize = 2 * R3 * COS_15;
      const s_max = Math.floor((N - 1) / 3);
      const L_active = ((N - 1) % 3) + 1;

      const stamps = [];
      if (s_max === 0) {
        stamps.push({ cx: 0, cy: 0, maxLocalLayer: L_active, ring: 0 });
      } else {
        stamps.push({ cx: 0, cy: 0, maxLocalLayer: 3, ring: 0 });
        for (let s = 1; s < s_max; s++) {
          const ringCenters = this.getHexRingCenters(s, stepSize, 30);
          for (const c of ringCenters) {
            stamps.push({ cx: c.x, cy: c.y, maxLocalLayer: 3, ring: s });
          }
        }
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

      const minOriginDistSq = (0.5 * r) * (0.5 * r);
      const filteredPoints = rawPoints.filter(pt => {
        for (const s of stamps) {
          const dx = pt.x - s.cx;
          const dy = pt.y - s.cy;
          if (dx * dx + dy * dy < minOriginDistSq) return false;
        }
        return true;
      });

      const tol = Math.max(0.2, EPSILON * r * 100);
      const dedupedPoints = [];

      for (const pt of filteredPoints) {
        if (!isDuplicatePoint(dedupedPoints, pt.x, pt.y, tol)) {
          dedupedPoints.push(pt);
        }
      }

      const dedupedGuides = [];
      for (const g of rawGuides) {
        if (!isDuplicateGuide(dedupedGuides, g, tol)) {
          dedupedGuides.push(g);
        }
      }

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

    getKrystCoordinates(N, r) {
      return this.getKrystGeometry(N, r).points;
    },

    getFoKBoundingRadius(N, r) {
      return this.getKrystGeometry(N, r).boundingRadius;
    },

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
     2. APPLICATION STATE & PRESETS (js/state.js)
     ========================================================================= */
  function clampNumber(val, min, max, defaultVal) {
    const n = Number(val);
    if (Number.isNaN(n) || !Number.isFinite(n)) return defaultVal;
    return Math.min(Math.max(n, min), max);
  }

  const State = {
    viewportMode: 'comparison',
    activePreset: 'krystonial_comparison',
    viewStyle: 'actual',
    platonicFilter: 'all',

    N: 2,
    r: 50,
    syncPanZoom: true,

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

    colorByLayer: false,
    enableGlow: true,
    enablePulse: false,
    sphericalShading: false,

    colorLife: '#ef4444',
    colorKryst: '#06b6d4',
    colorBase: '#3b82f6',
    colorGuide: '#ea580c',
    colorOuter: '#f59e0b',
    colorAxes: '#64748b',
    colorBg: '#07090e',

    strokeFlower: 1.5,
    strokeBase: 1.0,
    strokeGuide: 2.0,
    fillOpacity: 0.04,

    highlightedIds: new Set(),
    hoveredItem: null,

    transforms: {
      life: { panX: 0, panY: 0, scale: 1.0 },
      kryst: { panX: 0, panY: 0, scale: 1.0 }
    },

    setN(n) {
      this.N = clampNumber(n, 1, 24, 2);
    },

    setRadius(radius) {
      this.r = clampNumber(radius, 15, 200, 50);
    },

    clampNumber(val, min, max, defaultVal) {
      return clampNumber(val, min, max, defaultVal);
    }
  };

  const LayerColors = [
    '#f43f5e', '#f97316', '#eab308', '#10b981', '#06b6d4', '#6366f1', '#a855f7', '#ec4899', '#f8fafc'
  ];

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
          N: 2, r: 50, viewportMode: 'comparison', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: false, showGuides: true, showOuterRing: true,
          showBoundaryPetals: true, showCenterDots: true, showIntersections: false, showRadialAxes: false,
          showMetatronLines: false, sphericalShading: false, showEyesOfKryst: false, fillOpacity: 0.04
        }
      },
      {
        id: 'superimposed_divergence',
        title: 'Phase Divergence',
        subtitle: 'FoL vs FoK Superimposed',
        isBuiltin: true,
        config: {
          N: 2, r: 50, viewportMode: 'superimposed', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: false, showGuides: true, showOuterRing: true,
          showBoundaryPetals: true, showCenterDots: true, showIntersections: false, showRadialAxes: true,
          showMetatronLines: false, sphericalShading: false, showEyesOfKryst: false, fillOpacity: 0.04
        }
      },
      {
        id: 'seed_of_life',
        title: 'Seed of Life',
        subtitle: 'N=1 Genesis Core (7 Circles)',
        isBuiltin: true,
        config: {
          N: 1, r: 50, viewportMode: 'single-life', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: false, showGuides: false, showOuterRing: true,
          showBoundaryPetals: false, showCenterDots: true, showIntersections: false, showRadialAxes: false,
          showMetatronLines: false, sphericalShading: false, showEyesOfKryst: false, fillOpacity: 0.04
        }
      },
      {
        id: 'egg_of_life',
        title: 'Egg of Life',
        subtitle: 'Spherical Volumetric Tangent',
        isBuiltin: true,
        config: {
          N: 1, r: 50, viewportMode: 'single-life', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: true, showGuides: false, showOuterRing: false,
          showBoundaryPetals: false, showCenterDots: true, showIntersections: false, showRadialAxes: false,
          showMetatronLines: false, sphericalShading: true, showEyesOfKryst: false, fillOpacity: 0.12
        }
      },
      {
        id: 'fruit_of_life',
        title: 'Fruit of Life',
        subtitle: '13 Tangent Circles (Radius r)',
        isBuiltin: true,
        config: {
          N: 2, r: 50, viewportMode: 'single-life', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: false, showBaseCircles: true, showGuides: false, showOuterRing: true,
          showBoundaryPetals: false, showCenterDots: true, showIntersections: false, showRadialAxes: false,
          showMetatronLines: false, sphericalShading: false, showEyesOfKryst: false, fillOpacity: 0.04
        }
      },
      {
        id: 'metatrons_cube',
        title: "Metatron's Cube",
        subtitle: '13 Centers + 78 Chords',
        isBuiltin: true,
        config: {
          N: 2, r: 50, viewportMode: 'single-life', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: false, showBaseCircles: true, showGuides: false, showOuterRing: true,
          showBoundaryPetals: false, showCenterDots: true, showIntersections: false, showRadialAxes: false,
          showMetatronLines: true, sphericalShading: false, showEyesOfKryst: false, fillOpacity: 0.04
        }
      },
      {
        id: 'kryst_seed',
        title: 'Kryst Seed',
        subtitle: '6-Petal Zero-Point Core',
        isBuiltin: true,
        config: {
          N: 1, r: 50, viewportMode: 'single-kryst', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: false, showGuides: true, showOuterRing: true,
          showBoundaryPetals: true, showCenterDots: true, showIntersections: false, showRadialAxes: false,
          showMetatronLines: false, sphericalShading: false, showEyesOfKryst: false, fillOpacity: 0.04
        }
      },
      {
        id: 'kryst_18_standard',
        title: 'Kryst 18-Standard',
        subtitle: 'True Circle Ring 2 (N=2)',
        isBuiltin: true,
        config: {
          N: 2, r: 50, viewportMode: 'single-kryst', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: false, showGuides: true, showOuterRing: true,
          showBoundaryPetals: true, showCenterDots: true, showIntersections: false, showRadialAxes: false,
          showMetatronLines: false, sphericalShading: false, showEyesOfKryst: false, fillOpacity: 0.04
        }
      },
      {
        id: 'fruit_of_kryst',
        title: 'Fruit of Kryst',
        subtitle: '30 Circles (6+12+12) Scalloped 12-Lobe',
        isBuiltin: true,
        config: {
          N: 3, r: 50, viewportMode: 'single-kryst', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: false, showGuides: false, showOuterRing: false,
          showBoundaryPetals: false, showCenterDots: true, showIntersections: false, showRadialAxes: false,
          showMetatronLines: false, sphericalShading: false, showEyesOfKryst: false, colorKryst: '#16a34a', fillOpacity: 0.05
        }
      },
      {
        id: 'eyes_of_kryst',
        title: 'Eyes of Kryst',
        subtitle: '3 Pairs of Eyes in Magenta Vesica',
        isBuiltin: true,
        config: {
          N: 3, r: 50, viewportMode: 'single-kryst', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: false, showGuides: false, showOuterRing: false,
          showBoundaryPetals: false, showCenterDots: true, showIntersections: false, showRadialAxes: true,
          showMetatronLines: false, sphericalShading: false, showEyesOfKryst: true, colorKryst: '#16a34a', fillOpacity: 0.05
        }
      },
      {
        id: 'word_of_kryst',
        title: 'Word of Kryst',
        subtitle: '7-Cluster Tiled Stamp Lattice (N=4)',
        isBuiltin: true,
        config: {
          N: 4, r: 50, viewportMode: 'single-kryst', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: false, showGuides: false, showOuterRing: true,
          showBoundaryPetals: false, showCenterDots: true, showIntersections: false, showRadialAxes: false,
          showMetatronLines: false, sphericalShading: false, showEyesOfKryst: false, colorKryst: '#16a34a', fillOpacity: 0.05
        }
      },
      {
        id: 'water_of_kryst',
        title: 'Water of Kryst',
        subtitle: '19-Cluster Tiled Stamp Lattice (N=5)',
        isBuiltin: true,
        config: {
          N: 5, r: 50, viewportMode: 'single-kryst', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: false, showGuides: false, showOuterRing: true,
          showBoundaryPetals: false, showCenterDots: true, showIntersections: false, showRadialAxes: false,
          showMetatronLines: false, sphericalShading: false, showEyesOfKryst: false, colorKryst: '#16a34a', fillOpacity: 0.05
        }
      },
      {
        id: 'vesica_piscis',
        title: 'Vesica Piscis',
        subtitle: 'Dual Circle (√3 Ratio)',
        isBuiltin: true,
        config: {
          N: 1, r: 50, viewportMode: 'single-life', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: true, showGuides: false, showOuterRing: false,
          showBoundaryPetals: false, showCenterDots: true, showIntersections: false, showRadialAxes: false,
          showMetatronLines: false, sphericalShading: false, showEyesOfKryst: false, fillOpacity: 0.04
        }
      },
      {
        id: 'kathara_alignment',
        title: 'Kathara 12-Tree',
        subtitle: '12-Point Morphic Grid',
        isBuiltin: true,
        config: {
          N: 3, r: 50, viewportMode: 'comparison', viewStyle: 'actual', platonicFilter: 'all',
          showActualFlower: true, showBaseCircles: false, showGuides: true, showOuterRing: true,
          showBoundaryPetals: true, showCenterDots: true, showIntersections: false, showRadialAxes: true,
          showMetatronLines: true, sphericalShading: false, showEyesOfKryst: false, fillOpacity: 0.04
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
      } catch (_) {
        this.customPresets = [];
      }
      try {
        const overrides = localStorage.getItem(this.OVERRIDE_KEY);
        this.builtinOverrides = overrides ? JSON.parse(overrides) : {};
        if (typeof this.builtinOverrides !== 'object' || this.builtinOverrides === null) {
          this.builtinOverrides = {};
        }
      } catch (_) {
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
        colorGuide: State.colorGuide,
        colorOuter: State.colorOuter,
        colorAxes: State.colorAxes,
        strokeFlower: State.strokeFlower,
        strokeBase: State.strokeBase,
        strokeGuide: State.strokeGuide,
        colorByLayer: State.colorByLayer,
        enableGlow: State.enableGlow,
        enablePulse: State.enablePulse
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
      if (window.UI?.showToast) window.UI.showToast('Presets exported to JSON.');
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
        if (window.UI?.showToast) window.UI.showToast(`Imported ${importedCount} preset(s).`);
        return true;
      } catch (err) {
        console.error('Import error:', err);
        if (window.UI?.showToast) window.UI.showToast('Invalid preset JSON format.', 4000);
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

        chip.addEventListener('click', (e) => {
          if (e.target.closest('.preset-action-btn')) return;
          if (window.UI?.applyPreset) window.UI.applyPreset(preset.id);
        });

        chip.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (e.target.closest('.preset-action-btn')) return;
            e.preventDefault();
            if (window.UI?.applyPreset) window.UI.applyPreset(preset.id);
          }
        });

        const editBtn = chip.querySelector('.edit-preset-btn');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            PresetDialog.openEdit(preset.id);
          });
        }

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
     3. SVG RENDERING ENGINE (js/renderer.js)
     ========================================================================= */
  const SVGRenderer = {
    SVG_NS: 'http://www.w3.org/2000/svg',
    pointsMap: new Map(),

    createSvgElement(tag, attrs = {}) {
      const el = document.createElementNS(this.SVG_NS, tag);
      for (const [key, val] of Object.entries(attrs)) {
        el.setAttribute(key, String(val));
      }
      return el;
    },

    setupDefs(svg, idPrefix, R_bound) {
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = this.createSvgElement('defs');
        svg.appendChild(defs);
      }
      defs.innerHTML = '';

      const defsFrag = document.createDocumentFragment();

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

    render(svgId, patternType, transformState) {
      const svg = document.getElementById(svgId);
      if (!svg) return;

      const N = State.N;
      const r = State.r;
      const R = 2 * r;
      const R_bound = (patternType === 'kryst')
        ? SacredMath.getFoKBoundingRadius(N, r)
        : (2 * N + 2) * r;
      const idPrefix = svgId;

      this.setupDefs(svg, idPrefix, R_bound);

      const oldMain = svg.querySelector('.sacred-main-group');
      if (oldMain) oldMain.remove();

      const mainGroup = this.createSvgElement('g', {
        class: `sacred-main-group ${State.enablePulse ? 'sacred-pulse' : ''}`
      });

      if (State.showRadialAxes) {
        const axesGroup = this.createSvgElement('g', { class: 'group-axes' });
        const axesFrag = document.createDocumentFragment();
        const rayLength = R_bound * 1.35;
        const numRays = 12;
        for (let i = 0; i < numRays; i++) {
          const angle = (i * 360 / numRays) * DEG_TO_RAD;
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

      if (State.showGuides && (State.viewStyle === 'base' || State.viewStyle === 'combined' || State.showGuides)) {
        const guidesGroup = this.createSvgElement('g', { class: 'group-guides' });
        const guidesFrag = document.createDocumentFragment();

        if (patternType === 'life') {
          for (let k = 1; k <= N; k++) {
            const d_k = 2 * k * r;
            const pointsStr = [];
            for (let m = 0; m < 6; m++) {
              const angle = m * 60 * DEG_TO_RAD;
              pointsStr.push(`${(d_k * Math.cos(angle)).toFixed(3)},${(d_k * Math.sin(angle)).toFixed(3)}`);
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
        } else {
          const krystGeometry = SacredMath.getKrystGeometry(N, r);
          krystGeometry.guides.forEach(g => {
            if (g.type === 'hexagon') {
              const pointsStr = [];
              for (let m = 0; m < 6; m++) {
                const angle = m * 60 * DEG_TO_RAD;
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
            } else if (g.type === 'circle') {
              guidesFrag.appendChild(this.createSvgElement('circle', {
                cx: g.cx.toFixed(3),
                cy: g.cy.toFixed(3),
                r: g.radius.toFixed(3),
                fill: 'none',
                stroke: State.colorGuide,
                'stroke-width': State.strokeGuide,
                opacity: '0.9',
                filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none'
              }));
            }
          });
        }
        guidesGroup.appendChild(guidesFrag);
        mainGroup.appendChild(guidesGroup);
      }

      let points = [];
      if (State.activePreset === 'fruit_of_life' || State.activePreset === 'metatrons_cube') {
        points = SacredMath.getFruitOfLifeCenters(r);
      } else if (patternType === 'life') {
        points = SacredMath.generateFlowerOfLifePoints(N, r);
      } else {
        points = SacredMath.generateFlowerOfKrystPoints(N, r);
      }

      points.forEach(pt => this.pointsMap.set(pt.id, pt));

      if (State.showBaseCircles || State.viewStyle === 'base' || State.viewStyle === 'combined' || State.activePreset === 'fruit_of_life' || State.activePreset === 'metatrons_cube') {
        const baseGroup = this.createSvgElement('g', { class: 'group-base-circles' });
        const baseFrag = document.createDocumentFragment();
        const renderedBase = [];
        const dedupTol = Math.max(0.5, 0.02 * r);

        points.forEach(pt => {
          if (renderedBase.some(rc => Math.hypot(rc.x - pt.x, rc.y - pt.y) < dedupTol)) return;
          renderedBase.push(pt);

          const isHighlighted = State.highlightedIds.has(pt.id);
          const circle = this.createSvgElement('circle', {
            cx: pt.x,
            cy: pt.y,
            r: r,
            fill: State.sphericalShading ? `url(#${idPrefix}-sphere-grad)` : (isHighlighted ? 'rgba(255,255,255,0.1)' : 'none'),
            stroke: isHighlighted ? '#ffffff' : State.colorBase,
            'stroke-width': isHighlighted ? 2.8 : State.strokeBase,
            opacity: isHighlighted ? '1.0' : '0.8',
            class: `circle-node base-circle ${isHighlighted ? 'highlighted-circle' : ''}`,
            'data-circle-id': pt.id,
            'data-pattern': pt.pattern || patternType,
            'data-default-stroke': State.colorBase
          });
          baseFrag.appendChild(circle);
        });
        baseGroup.appendChild(baseFrag);
        mainGroup.appendChild(baseGroup);
      }

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

      const highlightGroup = this.createSvgElement('g', { class: 'group-highlights' });
      mainGroup.appendChild(highlightGroup);

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
      this.updateHighlights(svgId);
      this.updateViewBox(svg, transformState);
    },

    renderSuperimposed(svgId, transformState) {
      const svg = document.getElementById(svgId);
      if (!svg) return;

      const N = State.N;
      const r = State.r;
      const R = 2 * r;
      const R_bound = Math.max((2 * N + 2) * r, SacredMath.getFoKBoundingRadius(N, r));
      const idPrefix = svgId;

      this.setupDefs(svg, idPrefix, R_bound);

      const oldMain = svg.querySelector('.sacred-main-group');
      if (oldMain) oldMain.remove();

      const mainGroup = this.createSvgElement('g', {
        class: `sacred-main-group ${State.enablePulse ? 'sacred-pulse' : ''}`
      });

      if (State.showGuides) {
        const guidesGroup = this.createSvgElement('g', { class: 'group-superimposed-guides' });
        const guidesFrag = document.createDocumentFragment();

        for (let k = 1; k <= N; k++) {
          const d_k_life = 2 * k * r;
          const hexPoints = [];
          for (let m = 0; m < 6; m++) {
            const a = m * 60 * DEG_TO_RAD;
            hexPoints.push(`${(d_k_life * Math.cos(a)).toFixed(3)},${(d_k_life * Math.sin(a)).toFixed(3)}`);
          }
          guidesFrag.appendChild(this.createSvgElement('polygon', {
            points: hexPoints.join(' '),
            fill: 'none',
            stroke: '#ef4444',
            'stroke-width': '1.2',
            'stroke-dasharray': '3 3',
            opacity: '0.6'
          }));
        }

        const krystGeometry = SacredMath.getKrystGeometry(N, r);
        krystGeometry.guides.forEach(g => {
          if (g.type === 'hexagon') {
            const krystHexPoints = [];
            for (let m = 0; m < 6; m++) {
              const a = m * 60 * DEG_TO_RAD;
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
          } else if (g.type === 'circle') {
            guidesFrag.appendChild(this.createSvgElement('circle', {
              cx: g.cx.toFixed(3),
              cy: g.cy.toFixed(3),
              r: g.radius.toFixed(3),
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

      folPoints.forEach(pt => this.pointsMap.set(pt.id, pt));
      fokPoints.forEach(pt => this.pointsMap.set(pt.id, pt));

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

      const highlightGroup = this.createSvgElement('g', { class: 'group-highlights' });
      mainGroup.appendChild(highlightGroup);

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

    updateHighlights(svgId) {
      const svg = document.getElementById(svgId);
      if (!svg) return;

      const r = State.r;
      const R = 2 * r;
      const idPrefix = svgId;

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
              r: r,
              fill: 'none',
              stroke: '#3b82f6',
              'stroke-width': '1.5',
              'stroke-dasharray': '3 3',
              opacity: '0.85'
            }));

            hlFrag.appendChild(this.createSvgElement('circle', {
              cx: pt.x,
              cy: pt.y,
              r: R,
              fill: 'none',
              stroke: '#ffffff',
              'stroke-width': '3.2',
              filter: `url(#${idPrefix}-glow)`
            }));

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
     4. HIGH-RESOLUTION EXPORTER (js/export.js)
     ========================================================================= */
  const Exporter = {
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

      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x', String(vb.x));
      bgRect.setAttribute('y', String(vb.y));
      bgRect.setAttribute('width', String(vb.width));
      bgRect.setAttribute('height', String(vb.height));
      bgRect.setAttribute('fill', State.colorBg || '#07090e');
      clone.insertBefore(bgRect, clone.firstChild);

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

    downloadPNG(width, height) {
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
          if (!ctx) throw new Error('Canvas 2D context creation failed');

          ctx.fillStyle = State.colorBg || '#07090e';
          ctx.fillRect(0, 0, width, height);
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
    }
  };

  /* =========================================================================
     5. PAN/ZOOM & UI CONTROLLER (js/interactions.js)
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

      this.wrapper.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
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

  const UI = {
    _toastTimer: null,

    init() {
      PresetsManager.init();
      this.bindAccordions();
      this.bindViewTabs();
      this.bindSliders();
      this.bindToggles();
      this.bindColorPickers();
      PresetsManager.renderPresetGrid();
      this.bindPresets();
      this.bindFloatingControls();
      this.bindModals();
      this.bindKeyboardShortcuts();
      this.initSvgEventDelegation();
      this.updateSidebarStats();
    },

    initSvgEventDelegation() {
      ['svgLife', 'svgKryst'].forEach(svgId => {
        const svg = document.getElementById(svgId);
        if (!svg) return;

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

    bindColorPickers() {
      const colorInputs = [
        { id: 'colorLife', prop: 'colorLife' },
        { id: 'colorKryst', prop: 'colorKryst' },
        { id: 'colorBase', prop: 'colorBase' },
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
      if (cfg.colorGuide !== undefined) State.colorGuide = cfg.colorGuide;
      if (cfg.colorOuter !== undefined) State.colorOuter = cfg.colorOuter;
      if (cfg.colorAxes !== undefined) State.colorAxes = cfg.colorAxes;
      if (cfg.strokeFlower !== undefined) State.strokeFlower = clampNumber(cfg.strokeFlower, 0.25, 8.0, 1.5);
      if (cfg.strokeBase !== undefined) State.strokeBase = clampNumber(cfg.strokeBase, 0.25, 6.0, 1.0);
      if (cfg.strokeGuide !== undefined) State.strokeGuide = clampNumber(cfg.strokeGuide, 0.25, 8.0, 2.0);
      if (cfg.colorByLayer !== undefined) State.colorByLayer = Boolean(cfg.colorByLayer);
      if (cfg.enableGlow !== undefined) State.enableGlow = Boolean(cfg.enableGlow);
      if (cfg.enablePulse !== undefined) State.enablePulse = Boolean(cfg.enablePulse);

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
        { id: 'toggleEyesOfKryst', val: State.showEyesOfKryst }
      ];

      boolInputs.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) el.checked = Boolean(item.val);
      });
    },

    updateCounts() {
      const N = State.N;
      const folCount = (State.activePreset === 'fruit_of_life' || State.activePreset === 'metatrons_cube')
        ? 13
        : 1 + 3 * N * (N + 1);
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
      const R_bound_life = (2 * State.N + 2) * State.r;
      const R_bound_kryst = SacredMath.getFoKBoundingRadius(State.N, State.r);
      const boundEl = document.getElementById('sidebarBoundRad');
      if (boundEl) {
        const krystStr = `${Math.round(R_bound_kryst)}px (${(R_bound_kryst / State.r).toFixed(2)}r)`;
        const lifeStr = `${Math.round(R_bound_life)}px (${2 * State.N + 2}r)`;
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
        App.panZoomControllers.forEach(pz => pz.zoom(1.25));
      });

      document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
        App.panZoomControllers.forEach(pz => pz.zoom(0.8));
      });

      document.getElementById('resetZoomBtn')?.addEventListener('click', () => {
        State.transforms.life = { panX: 0, panY: 0, scale: 1.0 };
        State.transforms.kryst = { panX: 0, panY: 0, scale: 1.0 };
        App.renderAll();
      });

      document.getElementById('fitZoomBtn')?.addEventListener('click', () => {
        const R_bound = Math.max((2 * State.N + 2) * State.r, SacredMath.getFoKBoundingRadius(State.N, State.r));
        const pane = document.querySelector('.viewport-pane');
        if (pane) {
          const minDim = Math.min(pane.clientWidth, pane.clientHeight) * 0.85;
          const fitScale = clampNumber(minDim / (2 * R_bound), 0.1, 10.0, 1.0);
          State.transforms.life = { panX: 0, panY: 0, scale: fitScale };
          State.transforms.kryst = { panX: 0, panY: 0, scale: fitScale };
          App.renderAll();
        }
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
        const inspectStatus = document.getElementById('inspectStatus');
        if (inspectStatus) inspectStatus.textContent = 'Cleared';
        this.updateSidebarStats();
      });
    },

    bindModals() {
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
    }
  };

  /* =========================================================================
     6. MAIN APPLICATION COORDINATOR (js/main.js)
     ========================================================================= */
  const App = {
    panZoomControllers: [],
    _resizeRaf: null,

    init() {
      window.App = App;
      window.State = State;
      window.SacredMath = SacredMath;
      window.SVGRenderer = SVGRenderer;
      window.UI = UI;
      window.PresetsManager = PresetsManager;
      window.Exporter = Exporter;

      UI.init();

      this.panZoomControllers.push(new PanZoomController('svgWrapperLife', 'svgLife', 'life'));
      this.panZoomControllers.push(new PanZoomController('svgWrapperKryst', 'svgKryst', 'kryst'));

      window.addEventListener('resize', () => {
        if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
        this._resizeRaf = requestAnimationFrame(() => {
          this._resizeRaf = null;
          this.renderAll();
        });
      });

      UI.applyPreset('krystonial_comparison');
    },

    renderAll() {
      if (State.viewportMode === 'superimposed') {
        SVGRenderer.renderSuperimposed('svgLife', State.transforms.life);
      } else {
        SVGRenderer.render('svgLife', 'life', State.transforms.life);
        SVGRenderer.render('svgKryst', 'kryst', State.transforms.kryst);
      }
    }
  };

  window.SacredGeometry = { Geometry: SacredMath, SacredMath, State, SVGRenderer, UI, Exporter, App };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

})(window, document);
