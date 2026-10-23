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
import { State, LayerColors, Spectral12Colors } from './state.js';
import { SacredMath } from './geometry.js';

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
    const auraScale = (State.auraScale !== undefined && State.auraScale !== null) ? Number(State.auraScale) : 2.0;
    const boundaryRadius = State.boundaryRadius || (2 * State.N * r);
    const transform = transformState || State.transforms[pattern] || { panX: 0, panY: 0, scale: 0.38 };
    const idPrefix = svgId;

    // Fetch geometry by boundary radius and aura scale
    const geomData = (pattern === 'life')
      ? SacredMath.getFlowerOfLifeGeometryByRadius(boundaryRadius, r, State.disabledCircleIds, State.fullScreenTiling, auraScale)
      : SacredMath.getKrystGeometryByRadius(boundaryRadius, r, State.disabledCircleIds, State.fullScreenTiling, auraScale);

    // Save statistics in State for HUD consumption
    State.currentGeometryStats = geomData;
    if (window.UI?.updatePatternHUD) {
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
      if (State.highlightedIds.has(pt.id)) return '#ffffff';
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

        const circle = this.createSvgElement('circle', {
          cx: pt.x,
          cy: pt.y,
          r,
          fill: fillColor,
          'fill-opacity': fillOpacity,
          stroke: strokeColor,
          'stroke-width': isHighlighted ? 2.8 : (State.strokeBody || 1.0),
          opacity: isHighlighted ? '1.0' : '0.9',
          filter: (State.enableGlow || isHighlighted) ? `url(#${idPrefix}-glow)` : 'none',
          class: `circle-node body-circle ${isHighlighted ? 'highlighted-circle' : ''}`,
          'data-circle-id': pt.id,
          'data-pattern': pattern,
          'data-default-stroke': baseStroke,
          style: 'cursor: pointer;'
        });

        bodyFrag.appendChild(circle);
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
      const effectiveAuraR = (State.auraScale || 2.0) * r;

      auraPoints.forEach(apt => {
        const isHighlighted = State.highlightedIds.has(apt.bodyId);
        const strokeColor = resolveCircleStroke(apt, defaultAuraColor);

        // Painter of Life fill for aura petals
        let fillColor = 'none';
        let fillOpacity = '0';
        if (State.coloredShapesMap.has(apt.id)) {
          fillColor = State.coloredShapesMap.get(apt.id);
          fillOpacity = '0.35';
        }

        const circle = this.createSvgElement('circle', {
          cx: apt.x,
          cy: apt.y,
          r: apt.r || effectiveAuraR,
          fill: fillColor,
          'fill-opacity': fillOpacity,
          stroke: strokeColor,
          'stroke-width': isHighlighted ? 3.0 : (State.strokeAura || 1.5),
          opacity: isHighlighted ? '1.0' : '0.9',
          filter: (State.enableGlow || isHighlighted) ? `url(#${idPrefix}-glow)` : 'none',
          class: `circle-node aura-circle ${isHighlighted ? 'highlighted-circle' : ''}`,
          'pointer-events': 'none',
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
    // 8b. Individual Aura / Body Intersection Sections (Venn-Diagram Interactive Highlighting)
    // -----------------------------------------------------------------------
    const activeSectionPoints = State.showAuraFlower ? auraPoints : (State.showBodyCircles ? points : auraPoints);
    const effectiveSectionR = State.showAuraFlower ? ((State.auraScale || 2.0) * r) : r;

    if (activeSectionPoints && activeSectionPoints.length > 1) {
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

        // If neither aura nor body is visible, and section is not colored, skip rendering
        if (!State.showAuraFlower && !State.showBodyCircles && !isColored) return;

        const pathEl = this.createSvgElement('path', {
          d: sec.d,
          fill: isColored ? fillColor : 'rgba(255, 255, 255, 0.001)',
          'fill-opacity': isColored ? '0.75' : '0.001',
          stroke: isColored ? 'rgba(255, 255, 255, 0.65)' : (isHighlightMode ? 'rgba(245, 158, 11, 0.22)' : 'none'),
          'stroke-width': isColored ? '1.5' : (isHighlightMode ? '0.9' : '0'),
          class: `aura-intersection-section ${isColored ? 'colored-section' : ''} ${isHighlightMode ? 'highlight-mode-enabled' : ''}`,
          'data-section-id': sec.id,
          'data-cx': String(sec.cx),
          'data-cy': String(sec.cy),
          'pointer-events': (isHighlightMode || isColored) ? 'all' : 'none'
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

    // -----------------------------------------------------------------------
    // 11. Lightweight Highlight Overlay Group
    // -----------------------------------------------------------------------
    const highlightGroup = this.createSvgElement('g', { class: 'group-highlights' });
    mainGroup.appendChild(highlightGroup);

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
    const svg = document.getElementById(svgId);
    if (!svg) return;

    const r = State.r || 50;
    const auraScale = (State.auraScale !== undefined && State.auraScale !== null) ? Number(State.auraScale) : 2.0;
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
        if (isHl) {
          el.setAttribute('stroke', '#ffffff');
          el.setAttribute('stroke-width', '3.0');
          el.setAttribute('filter', `url(#${idPrefix}-glow)`);
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
            'stroke-width': '2.2',
            'stroke-dasharray': '3 3',
            opacity: '0.9'
          }));

          hlFrag.appendChild(this.createSvgElement('circle', {
            cx: pt.x,
            cy: pt.y,
            r: R,
            fill: 'none',
            stroke: '#ffffff',
            'stroke-width': '2.8',
            filter: `url(#${idPrefix}-glow)`
          }));
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
    const rect = svg.getBoundingClientRect();
    const parentRect = svg.parentElement?.getBoundingClientRect();
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

export { SVGRenderer };
export default SVGRenderer;
