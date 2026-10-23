/**
 * SACRED GEOMETRY STUDIO — MAIN ENTRY POINT
 * Coordinates state, renderer, interactions, and exports.
 */
import { State, PresetsManager } from './state.js';
import { SacredMath } from './geometry.js';
import { SacredMath3D } from './geometry3d.js';
import { SVGRenderer } from './renderer.js';
import { Renderer3D } from './renderer3d.js';
import { PanZoomController, UI } from './interactions.js';
import { Exporter } from './export.js';

const App = {
  panZoomControllers: [],
  _resizeRaf: null,

  init() {
    // Expose globally for developer console debugging & backward compatibility
    window.App = App;
    window.State = State;
    window.SacredMath = SacredMath;
    window.SacredMath3D = SacredMath3D;
    window.SVGRenderer = SVGRenderer;
    window.Renderer3D = Renderer3D;
    window.UI = UI;
    window.PresetsManager = PresetsManager;
    window.Exporter = Exporter;

    UI.init();

    if (document.getElementById('svgMain')) {
      this.panZoomControllers.push(new PanZoomController('svgWrapperMain', 'svgMain', 'kryst'));
    }
    if (document.getElementById('svgLife')) {
      this.panZoomControllers.push(new PanZoomController('svgWrapperLife', 'svgLife', 'life'));
    }
    if (document.getElementById('svgKryst')) {
      this.panZoomControllers.push(new PanZoomController('svgWrapperKryst', 'svgKryst', 'kryst'));
    }

    // Initialize 3D WebGL renderer lazily or on demand (Frozen E-02)
    try {
      Renderer3D.init();
    } catch (e) {
      console.warn('3D WebGL engine deferred initialization:', e);
    }

    // RAF-throttled window resize handler
    window.addEventListener('resize', () => {
      if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
      this._resizeRaf = requestAnimationFrame(() => {
        this._resizeRaf = null;
        this.renderAll();
      });
    });

    // Initial render and fit
    this.renderAll();
    requestAnimationFrame(() => {
      UI.fitToScreen();
    });
  },

  renderAll() {
    if (State.dimension === '3d') {
      Renderer3D.renderAll();
      return;
    }
    if (document.getElementById('svgMain')) {
      const pattern = State.activePattern || 'kryst';
      SVGRenderer.render('svgMain', pattern, State.transforms[pattern] || State.transforms.kryst);
    } else {
      SVGRenderer.render('svgLife', 'life', State.transforms.life);
      SVGRenderer.render('svgKryst', 'kryst', State.transforms.kryst);
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  setTimeout(() => App.init(), 0);
}

export { App };
export default App;
