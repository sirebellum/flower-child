/**
 * SVG RENDERING ENGINE
 * SVG DOM generation, layers, clipPaths, annotations, and lightweight highlights.
 * Uses DocumentFragment for batched DOM insertion and scoped defs.
 */
import { State, LayerColors } from './state.js';
import { SacredMath } from './geometry.js';

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

    // 3. Body Pattern Circles (Radius r)
    const isBodyActive = State.showBodyCircles || State.showBaseCircles || State.viewStyle === 'body' || State.viewStyle === 'base' || State.viewStyle === 'combined' || State.activePreset === 'fruit_of_life' || State.activePreset === 'metatrons_cube';
    if (isBodyActive) {
      const baseGroup = this.createSvgElement('g', { class: 'group-body-circles group-base-circles' });
      const baseFrag = document.createDocumentFragment();
      const renderedBase = [];
      const dedupTol = Math.max(0.5, 0.02 * r);

      points.forEach(pt => {
        if (renderedBase.some(rc => Math.hypot(rc.x - pt.x, rc.y - pt.y) < dedupTol)) return;
        renderedBase.push(pt);

        const isHighlighted = State.highlightedIds.has(pt.id);
        let baseStroke = State.colorBody || State.colorBase;
        if (patternType === 'kryst') {
          if (pt.role === 'triangle') {
            baseStroke = State.colorTriangle || '#eab308';
          } else {
            baseStroke = State.colorBody || State.colorBase || '#3b82f6';
          }
        }

        const circle = this.createSvgElement('circle', {
          cx: pt.x,
          cy: pt.y,
          r: r,
          fill: State.sphericalShading ? `url(#${idPrefix}-sphere-grad)` : (isHighlighted ? 'rgba(255,255,255,0.1)' : 'none'),
          stroke: isHighlighted ? '#ffffff' : baseStroke,
          'stroke-width': isHighlighted ? 2.8 : (State.strokeBody || State.strokeBase),
          opacity: isHighlighted ? '1.0' : '0.8',
          class: `circle-node body-circle base-circle ${isHighlighted ? 'highlighted-circle' : ''}`,
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
    const isBoundaryPetalsActive = patternType === 'life' && State.showBoundaryPetals && (State.viewStyle === 'aura' || State.viewStyle === 'actual' || State.viewStyle === 'combined') && State.activePreset !== 'fruit_of_life' && State.activePreset !== 'metatrons_cube';
    if (isBoundaryPetalsActive) {
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
          'stroke-width': State.strokeAura || State.strokeFlower,
          opacity: '0.55'
        }));
      });
      clippedPetalsGroup.appendChild(petalsFrag);
      mainGroup.appendChild(clippedPetalsGroup);
    }

    // 5. Aura Overlapping Circles & Individual Clickable Sections (Radius R = 2r over center of body circles)
    const isAuraActive = (State.showAuraFlower || State.showActualFlower) && (State.viewStyle === 'aura' || State.viewStyle === 'actual' || State.viewStyle === 'combined') && State.activePreset !== 'fruit_of_life' && State.activePreset !== 'metatrons_cube';
    if (isAuraActive) {
      const renderedAura = [];
      const dedupTol = Math.max(0.5, 0.02 * r);
      points.forEach(pt => {
        if (renderedAura.some(rc => Math.hypot(rc.x - pt.x, rc.y - pt.y) < dedupTol)) return;
        renderedAura.push(pt);
      });

      // 5a. Clickable Individual Sections (spaces bound by circle intersections)
      const sectionsGroup = this.createSvgElement('g', { class: 'group-flower-sections' });
      const sectionsFrag = document.createDocumentFragment();
      const cacheKey = `${patternType}_${N}_${r}_${renderedAura.length}`;
      if (!this.sectionsCache) this.sectionsCache = new Map();
      let sections = this.sectionsCache.get(cacheKey);
      if (!sections) {
        sections = (renderedAura.length <= 150) ? SacredMath.computeCircleSections(renderedAura, R) : [];
        this.sectionsCache.set(cacheKey, sections);
      }

      sections.forEach(sec => {
        const isSecHighlighted = State.highlightedSectionIds.has(sec.id);
        const secPath = this.createSvgElement('path', {
          d: sec.d,
          class: `flower-section ${isSecHighlighted ? 'highlighted-section' : ''}`,
          'data-section-id': sec.id,
          'data-pattern': patternType
        });
        sectionsFrag.appendChild(secPath);
      });
      sectionsGroup.appendChild(sectionsFrag);
      mainGroup.appendChild(sectionsGroup);

      // 5b. Aura Overlapping Circles (pointer-events: none so clicks hit sections)
      const actualGroup = this.createSvgElement('g', { class: 'group-aura-flower group-actual-flower' });
      const actualFrag = document.createDocumentFragment();
      const flowerColor = (patternType === 'life') ? State.colorLife : State.colorKryst;

      renderedAura.forEach((pt, idx) => {
        const isHighlighted = State.highlightedIds.has(pt.id);
        let strokeColor = flowerColor;

        if (State.colorByLayer) {
          strokeColor = LayerColors[(pt.layer || idx) % LayerColors.length];
        }
        if (isHighlighted) {
          strokeColor = '#ffffff';
        }

        const circle = this.createSvgElement('circle', {
          cx: pt.x,
          cy: pt.y,
          r: R,
          fill: 'none',
          'fill-opacity': '0',
          stroke: strokeColor,
          'stroke-width': isHighlighted ? 3.0 : (State.strokeAura || State.strokeFlower),
          opacity: isHighlighted ? '1.0' : '0.9',
          filter: (State.enableGlow || isHighlighted) ? `url(#${idPrefix}-glow)` : 'none',
          class: `circle-node aura-circle actual-circle ${isHighlighted ? 'highlighted-circle' : ''}`,
          'pointer-events': 'none',
          'data-circle-id': pt.id,
          'data-pattern': pt.pattern || patternType,
          'data-default-stroke': (State.colorByLayer ? LayerColors[(pt.layer || idx) % LayerColors.length] : flowerColor)
        });

        actualFrag.appendChild(circle);
      });
      actualGroup.appendChild(actualFrag);
      mainGroup.appendChild(actualGroup);
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

    // 8. Intersection Nodes (Lattice Dots where guide hexagons/triangles cross body circles)
    if (State.showIntersections) {
      const interGroup = this.createSvgElement('g', { class: 'group-intersections' });
      const interFrag = document.createDocumentFragment();

      let currentGuides = [];
      if (patternType === 'life') {
        currentGuides = SacredMath.getFlowerOfLifeGeometry(N, r).guides;
      } else {
        currentGuides = SacredMath.getKrystGeometry(N, r).guides;
      }

      const intersectionPoints = SacredMath.computeIntersectionNodes(currentGuides, points, r, R);
      const interColor = State.colorIntersection || '#ec4899';

      // Draw the intersection node marker at each guide crossing
      intersectionPoints.forEach((ipt, idx) => {
        interFrag.appendChild(this.createSvgElement('circle', {
          cx: ipt.x,
          cy: ipt.y,
          r: '3.5',
          fill: interColor,
          stroke: '#ffffff',
          'stroke-width': '1.2',
          filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none',
          class: 'intersection-node',
          id: `inter_node_${patternType}_${idx}`
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

    // Deduplicate Flower of Kryst body circle points for aura circles
    const renderedFok = [];
    const dedupTol = Math.max(0.5, 0.02 * r);
    fokPoints.forEach(pt => {
      if (renderedFok.some(rc => Math.hypot(rc.x - pt.x, rc.y - pt.y) < dedupTol)) return;
      renderedFok.push(pt);
    });

    // Superimposed Sections & Aura Circles over body circle centers
    const allSuperCircles = [...folPoints, ...renderedFok];
    const sectionsGroup = this.createSvgElement('g', { class: 'group-flower-sections' });
    const sectionsFrag = document.createDocumentFragment();
    const cacheKey = `super_${N}_${r}_${allSuperCircles.length}`;
    if (!this.sectionsCache) this.sectionsCache = new Map();
    let sections = this.sectionsCache.get(cacheKey);
    if (!sections) {
      sections = SacredMath.computeCircleSections(allSuperCircles, R);
      this.sectionsCache.set(cacheKey, sections);
    }
    sections.forEach(sec => {
      const isSecHighlighted = State.highlightedSectionIds.has(sec.id);
      const secPath = this.createSvgElement('path', {
        d: sec.d,
        class: `flower-section ${isSecHighlighted ? 'highlighted-section' : ''}`,
        'data-section-id': sec.id,
        'data-pattern': 'superimposed'
      });
      sectionsFrag.appendChild(secPath);
    });
    sectionsGroup.appendChild(sectionsFrag);
    mainGroup.appendChild(sectionsGroup);

    // Flower of Life Layer (Red) - Aura circles over body circle centers at 2x size (R = 2r)
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
        class: `circle-node aura-circle actual-circle ${isHighlighted ? 'highlighted-circle' : ''}`,
        'pointer-events': 'none',
        'data-circle-id': pt.id,
        'data-pattern': 'life',
        'data-default-stroke': State.colorLife
      }));
    });
    folGroup.appendChild(folFrag);
    mainGroup.appendChild(folGroup);

    // Flower of Kryst Layer - Aura circles over body circle centers at 2x size (R = 2r)
    const fokGroup = this.createSvgElement('g', { class: 'group-fok-overlay' });
    const fokFrag = document.createDocumentFragment();

    renderedFok.forEach(pt => {
      const isHighlighted = State.highlightedIds.has(pt.id);
      fokFrag.appendChild(this.createSvgElement('circle', {
        cx: pt.x,
        cy: pt.y,
        r: R,
        fill: 'none',
        stroke: isHighlighted ? '#ffffff' : State.colorKryst,
        'stroke-width': isHighlighted ? 3 : (State.strokeAura || State.strokeFlower),
        opacity: '0.75',
        class: `circle-node aura-circle actual-circle ${isHighlighted ? 'highlighted-circle' : ''}`,
        'pointer-events': 'none',
        'data-circle-id': pt.id,
        'data-pattern': 'kryst',
        'data-default-stroke': State.colorKryst
      }));
    });
    fokGroup.appendChild(fokFrag);
    mainGroup.appendChild(fokGroup);

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

    // Intersection Nodes in Superimposed mode
    if (State.showIntersections) {
      const interGroup = this.createSvgElement('g', { class: 'group-intersections' });
      const interFrag = document.createDocumentFragment();

      const folGuides = SacredMath.getFlowerOfLifeGeometry(N, r).guides;
      const fokGuides = SacredMath.getKrystGeometry(N, r).guides;
      const combinedGuides = [...folGuides, ...fokGuides];
      const combinedPoints = [...folPoints, ...fokPoints];

      const intersectionPoints = SacredMath.computeIntersectionNodes(combinedGuides, combinedPoints, r, R);
      const interColor = State.colorIntersection || '#ec4899';

      intersectionPoints.forEach((ipt, idx) => {
        interFrag.appendChild(this.createSvgElement('circle', {
          cx: ipt.x,
          cy: ipt.y,
          r: '3.5',
          fill: interColor,
          stroke: '#ffffff',
          'stroke-width': '1.2',
          filter: State.enableGlow ? `url(#${idPrefix}-glow)` : 'none',
          class: 'intersection-node',
          id: `inter_node_super_${idx}`
        }));
      });

      interGroup.appendChild(interFrag);
      mainGroup.appendChild(interGroup);
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

    // 3. Update section highlights
    this.updateSectionHighlights(svgId);
  },

  /**
   * Lightweight Section Highlight Updater:
   * Toggles .highlighted-section class on existing <path class="flower-section"> elements.
   *
   * @param {string} svgId - ID of SVG canvas to update.
   */
  updateSectionHighlights(svgId) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    svg.querySelectorAll('.flower-section').forEach(el => {
      const secId = el.dataset.sectionId;
      const isHl = State.highlightedSectionIds && State.highlightedSectionIds.has(secId);
      el.classList.toggle('highlighted-section', Boolean(isHl));
    });
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

export { SVGRenderer };
export default SVGRenderer;
