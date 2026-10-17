/**
 * HIGH-RESOLUTION EXPORTER (SVG & PNG)
 * Standalone SVG and high-DPI PNG export utilities with embedded styles,
 * background geometry, guaranteed object URL revocation, and memory safety.
 */
import { State } from './state.js';

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
   * Renders the SVG clone onto an offscreen canvas with deep background fill,
   * wrapped in guaranteed cleanup blocks.
   *
   * @param {number} width - Output image width in pixels (e.g. 2400 or 3840).
   * @param {number} height - Output image height in pixels (e.g. 2400 or 3840).
   */
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
  }
};

export { Exporter };
export default Exporter;
