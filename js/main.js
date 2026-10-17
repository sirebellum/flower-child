/**
 * SACRED GEOMETRY STUDIO — MAIN ENTRY POINT
 * Coordinates state, renderer, interactions, and exports.
 */
import { State, PresetsManager } from './state.js';
import { SacredMath } from './geometry.js';
import { SVGRenderer } from './renderer.js';
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
    window.SVGRenderer = SVGRenderer;
    window.UI = UI;
    window.PresetsManager = PresetsManager;
    window.Exporter = Exporter;

    UI.init();

    this.panZoomControllers.push(new PanZoomController('svgWrapperLife', 'svgLife', 'life'));
    this.panZoomControllers.push(new PanZoomController('svgWrapperKryst', 'svgKryst', 'kryst'));

    // RAF-throttled window resize handler
    window.addEventListener('resize', () => {
      if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
      this._resizeRaf = requestAnimationFrame(() => {
        this._resizeRaf = null;
        this.renderAll();
      });
    });

    // Default: Apply Krystonial comparison preset
    UI.applyPreset('krystonial_comparison');

    // Automatically fit initial view to display whole initial flowers
    requestAnimationFrame(() => {
      UI.fitToScreen();
    });
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

export { App };
export default App;
