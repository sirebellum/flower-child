/**
 * HIGH-RESOLUTION EXPORTER (SVG & PNG)
 * Standalone SVG and high-DPI PNG export utilities with embedded styles,
 * background geometry, guaranteed object URL revocation, and memory safety.
 */
import { State } from './state.js';
import { SacredMath } from './geometry.js';

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

export { Exporter, exportOpenSCAD };
export default Exporter;
