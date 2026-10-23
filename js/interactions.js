/**
 * INTERACTION & UI CONTROLLER (js/interactions.js)
 * Pan/zoom with requestAnimationFrame throttling, delegated SVG hit-testing,
 * dynamic boundary radius controls, continuous Body/Aura mix fader,
 * user-created shape presets, Painter of Life interactive coloring,
 * and narrative modal controllers.
 */
import { State, PresetsManager, PresetDialog, clampNumber, Spectral12Colors } from './state.js';
import { SacredMath, KRYST_STAGE_NAMES, LIFE_STAGE_NAMES, KRYST_STORY_DATA, RING_NOTES_DATA } from './geometry.js';
import { SVGRenderer } from './renderer.js';
import { Exporter } from './export.js';

/* =========================================================================
   PAN/ZOOM CONTROLLER (RAF-THROTTLED)
   ========================================================================= */
class PanZoomController {
  constructor(wrapperId, svgId, transformKey = 'kryst') {
    this.wrapper = document.getElementById(wrapperId);
    this.svg = document.getElementById(svgId);
    this.transformKey = transformKey;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.hasMoved = false;
    this.rafPending = false;

    this.initEvents();
  }

  initEvents() {
    if (!this.wrapper || !this.svg) return;

    // Pointer Drag for Pan
    this.wrapper.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // Left click only
      this.isDragging = true;
      this.hasMoved = false;
      this.startX = e.clientX;
      this.startY = e.clientY;
      try {
        this.wrapper.setPointerCapture(e.pointerId);
      } catch (_) { }
    });

    this.wrapper.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      if (Math.hypot(dx, dy) > 4) {
        this.hasMoved = true;
      }
      this.startX = e.clientX;
      this.startY = e.clientY;

      const activeKey = State.activePattern || this.transformKey || 'kryst';
      if (!State.transforms[activeKey]) {
        State.transforms[activeKey] = { panX: 0, panY: 0, scale: 0.38 };
      }
      const transform = State.transforms[activeKey];
      transform.panX += dx / transform.scale;
      transform.panY += dy / transform.scale;

      this.scheduleViewBoxUpdate();
    });

    const stopDrag = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        try {
          if (e && e.pointerId && this.wrapper.hasPointerCapture(e.pointerId)) {
            this.wrapper.releasePointerCapture(e.pointerId);
          }
        } catch (_) { }
      }
    };

    this.wrapper.addEventListener('pointerup', stopDrag);
    this.wrapper.addEventListener('pointercancel', stopDrag);

    // Suppress click on drag end
    this.wrapper.addEventListener('click', (e) => {
      if (this.hasMoved) {
        e.stopPropagation();
        e.preventDefault();
        this.hasMoved = false;
      }
    }, true);

    // Mouse Wheel for Zoom
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
        const activeKey = State.activePattern || this.transformKey || 'kryst';
        const transform = State.transforms[activeKey] || { panX: 0, panY: 0, scale: 0.38 };
        SVGRenderer.updateViewBox(this.svg, transform);
      });
    }
  }

  zoom(factor) {
    const activeKey = State.activePattern || this.transformKey || 'kryst';
    if (!State.transforms[activeKey]) {
      State.transforms[activeKey] = { panX: 0, panY: 0, scale: 0.38 };
    }
    const transform = State.transforms[activeKey];
    transform.scale = clampNumber(transform.scale * factor, 0.04, 25.0, 0.38);
    this.scheduleViewBoxUpdate();
  }
}

/* =========================================================================
   UI CONTROLLER
   ========================================================================= */
const UI = {
  _toastTimer: null,
  activeRingNoteIndex: 1,

  init() {
    PresetsManager.init();
    this.setDimension(State.dimension || '2d');
    this.bindAccordions();
    this.bindDimensionTabs();
    this.bindPatternSwitcher();
    this.bindBoundaryControls();
    this.bindFaderBar();
    this.bindSliders();
    this.bindToggles();
    this.bind3DControls();
    this.bindColorPickers();
    this.bindPainterControls();
    this.bindPresets();
    this.bindFloatingControls();
    this.bindModals();
    this.bindKeyboardShortcuts();
    this.initSvgEventDelegation();
    this.renderCustomPresets();
    this.updateSidebarStats();
  },

  /**
   * Delegated Event Listeners on the main SVG Viewport:
   * Supports:
   * - Painter of Life (R-A8): Click circle to paint with selected swatch.
   * - Shape Presets (R-A4): Shift+Click circle to toggle selection highlight.
   * - Boundary Removal (E-05): Standard click toggles circle add/remove from geometry.
   * - Background click: Clears selection highlights.
   */
  initSvgEventDelegation() {
    const svgIds = ['svgMain', 'svgKryst', 'svgLife'];
    svgIds.forEach(id => {
      const svg = document.getElementById(id);
      if (!svg) return;

      // Delegated click
      svg.addEventListener('click', (e) => {
        const target = e.target.closest('[data-circle-id]');

        // 1. Click on a circle or center dot
        if (target) {
          e.stopPropagation();
          const circleId = target.dataset.circleId;

          // Mode A: Painter of Life Mode
          if (State.painterMode) {
            const currentPaint = State.coloredShapesMap.get(circleId);
            if (currentPaint === State.painterColor) {
              State.coloredShapesMap.delete(circleId);
            } else {
              State.coloredShapesMap.set(circleId, State.painterColor);
            }
            App.renderAll();
            return;
          }

          // Mode B: Shift+Click -> Selection Highlight for Presets
          if (e.shiftKey) {
            if (State.highlightedIds.has(circleId)) {
              State.highlightedIds.delete(circleId);
            } else {
              State.highlightedIds.add(circleId);
            }
            SVGRenderer.updateHighlights(svg.id);
            this.updateSidebarStats();
            return;
          }

          // Mode C: Standard Click -> Toggle Circle Removal (E-05)
          if (State.disabledCircleIds.has(circleId)) {
            State.disabledCircleIds.delete(circleId);
            this.showToast('Restored circle');
          } else {
            State.disabledCircleIds.add(circleId);
            this.showToast('Removed circle (Click again or "Restore All" to return)');
          }
          this.updateSidebarStats();
          App.renderAll();
          return;
        }

        // 2. Click on empty SVG background -> clear highlights if any
        if (State.highlightedIds.size > 0) {
          State.highlightedIds.clear();
          SVGRenderer.updateHighlights(svg.id);
          this.updateSidebarStats();
        }
      });
    });
  },

  /**
   * Updates pattern HUD badges at the top of the viewport:
   * - Title (e.g. "Seed of Kryst", "Fruit of Kryst", "Water of Kryst")
   * - Ring # (e.g. "Ring #5")
   * - Circle stats (e.g. "36 in Ring #5 · 90 Total Circles")
   */
  updatePatternHUD(geomData) {
    if (!geomData) return;
    const pattern = State.activePattern || 'kryst';
    const maxLayer = geomData.maxLayer || 1;
    const stageNames = (pattern === 'life') ? LIFE_STAGE_NAMES : KRYST_STAGE_NAMES;
    const stageTitle = stageNames[maxLayer] || (pattern === 'life' ? 'Flower of Life' : 'Flower of Kryst');
    const countInRing = geomData.ringCounts ? (geomData.ringCounts.get(maxLayer) || 0) : 0;
    const totalCircles = geomData.totalCircles || geomData.circles?.length || 0;

    const titleEl = document.getElementById('badgeStageTitle') || document.getElementById('badgeKrystTitle') || document.getElementById('badgeLifeTitle');
    if (titleEl) titleEl.textContent = stageTitle;

    const ringEl = document.getElementById('badgeRingIndex');
    if (ringEl) ringEl.textContent = `Ring #${maxLayer}`;

    const statsEl = document.getElementById('badgeCircleStats') || document.getElementById('badgeKrystCount') || document.getElementById('badgeLifeCount');
    if (statsEl) {
      statsEl.textContent = `${countInRing} in Ring #${maxLayer} · ${totalCircles} Total`;
    }

    const folStat = document.getElementById('folCountStat');
    if (folStat) folStat.textContent = `${totalCircles} Circles`;
    const fokStat = document.getElementById('fokCountStat');
    if (fokStat) fokStat.textContent = `${totalCircles} Circles (${stageTitle})`;

    // Sync interactive circle count input when user is not actively typing
    const inputCircleCount = document.getElementById('inputCircleCount');
    if (inputCircleCount && document.activeElement !== inputCircleCount) {
      inputCircleCount.value = totalCircles;
    }
  },

  bindPatternSwitcher() {
    const tabs = document.querySelectorAll('.pattern-tab, [data-pattern-switch]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const pattern = tab.dataset.patternSwitch || tab.dataset.pattern;
        if (!pattern) return;

        State.activePattern = pattern;
        tabs.forEach(t => {
          const isAct = (t.dataset.patternSwitch || t.dataset.pattern) === pattern;
          t.classList.toggle('active', isAct);
          t.setAttribute('aria-selected', isAct ? 'true' : 'false');
        });

        // Fit screen if switching
        this.fitToScreen();
        App.renderAll();
        this.showToast(`Active Pattern: ${pattern === 'kryst' ? 'Flower of Kryst' : 'Flower of Life'}`);
      });
    });
  },

  jumpToCircleCount(targetCount) {
    const target = parseInt(targetCount, 10);
    if (isNaN(target) || target <= 0) return;

    const result = SacredMath.getNearestValidBoundaryRadius(
      target,
      State.activePattern || 'kryst',
      State.r || 50,
      State.disabledCircleIds
    );

    const newRad = result.radius;
    State.boundaryRadius = newRad;

    const boundarySlider = document.getElementById('boundarySlider');
    if (boundarySlider) {
      if (newRad > Number(boundarySlider.max)) {
        boundarySlider.max = Math.ceil(newRad * 1.2);
      }
      boundarySlider.value = newRad;
    }

    const boundaryBadge = document.getElementById('boundaryBadge');
    if (boundaryBadge) {
      boundaryBadge.textContent = `R_bound = ${newRad}px`;
    }

    // R-B1: One-way viewport zoom out if boundary expands beyond viewport
    const pane = document.getElementById('paneMain') || document.querySelector('.viewport-pane');
    const rect = pane?.getBoundingClientRect();
    const width = (rect && rect.width > 0) ? rect.width : (pane?.clientWidth || 800);
    const height = (rect && rect.height > 0) ? rect.height : (pane?.clientHeight || 800);
    const minDim = Math.min(width, height) * 0.85;
    const requiredScale = minDim / (2 * newRad);
    const activeKey = State.activePattern || 'kryst';
    const transform = State.transforms[activeKey];
    if (transform && transform.scale > requiredScale) {
      transform.scale = clampNumber(requiredScale, 0.04, 25.0, 0.38);
      transform.panX = 0;
      transform.panY = 0;
    }

    this.updateSidebarStats();
    App.renderAll();

    const inputCircleCount = document.getElementById('inputCircleCount');
    if (inputCircleCount) {
      inputCircleCount.value = result.circleCount;
    }

    const feedbackEl = document.getElementById('circleCountFeedback');
    if (feedbackEl) {
      feedbackEl.textContent = `Jumped: ${result.circleCount}c (${newRad}px)`;
      setTimeout(() => {
        if (feedbackEl) feedbackEl.textContent = '';
      }, 3500);
    }

    this.showToast(`Boundary jumped to ${newRad}px (${result.circleCount} circles)`);
  },

  bindBoundaryControls() {
    const boundarySlider = document.getElementById('boundarySlider');
    const boundaryBadge = document.getElementById('boundaryBadge');
    if (boundarySlider) {
      boundarySlider.value = State.boundaryRadius || 200;
      if (boundaryBadge) boundaryBadge.textContent = `R_bound = ${State.boundaryRadius || 200}px`;

      boundarySlider.addEventListener('input', (e) => {
        const newRad = Number(e.target.value);
        State.boundaryRadius = newRad;
        if (boundaryBadge) {
          boundaryBadge.textContent = `R_bound = ${newRad}px`;
        }

        // R-B1: One-way viewport zoom out.
        // If boundary circle expands beyond the current viewport, zoom out.
        // If boundary slider is reduced, do NOT zoom in (preserves user zoom level).
        const pane = document.getElementById('paneMain') || document.querySelector('.viewport-pane');
        const rect = pane?.getBoundingClientRect();
        const width = (rect && rect.width > 0) ? rect.width : (pane?.clientWidth || 800);
        const height = (rect && rect.height > 0) ? rect.height : (pane?.clientHeight || 800);
        const minDim = Math.min(width, height) * 0.85;
        const requiredScale = minDim / (2 * newRad);
        const activeKey = State.activePattern || 'kryst';
        const transform = State.transforms[activeKey];
        if (transform && transform.scale > requiredScale) {
          transform.scale = clampNumber(requiredScale, 0.04, 25.0, 0.38);
          // Lock pattern center strictly at origin (0, 0) during boundary expansion
          transform.panX = 0;
          transform.panY = 0;
        }

        this.updateSidebarStats();
        App.renderAll();
      });
    }

    // Interactive circle count input and jump button
    const inputCircleCount = document.getElementById('inputCircleCount');
    const btnJump = document.getElementById('btnJumpCircleCount');

    const handleJump = () => {
      if (!inputCircleCount) return;
      const target = parseInt(inputCircleCount.value, 10);
      if (!isNaN(target) && target > 0) {
        this.jumpToCircleCount(target);
      }
    };

    if (inputCircleCount) {
      inputCircleCount.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleJump();
        }
      });
      inputCircleCount.addEventListener('change', handleJump);
    }

    if (btnJump) {
      btnJump.addEventListener('click', handleJump);
    }

    // Restore All Removed Circles Button
    const btnRestore = document.getElementById('btnRestoreCircles');
    if (btnRestore) {
      btnRestore.addEventListener('click', () => {
        if (State.disabledCircleIds.size === 0) {
          this.showToast('No circles have been removed.');
          return;
        }
        State.disabledCircleIds.clear();
        this.updateSidebarStats();
        App.renderAll();
        this.showToast('All removed circles have been restored.');
      });
    }
  },

  bindFaderBar() {
    this.syncLayerControls();

    const checkBody = document.getElementById('checkBodyVisible');
    const toggleBody = document.getElementById('toggleBodyCircles');
    const sliderBody = document.getElementById('sliderBodyOpacity');

    const checkAura = document.getElementById('checkAuraVisible');
    const toggleAura = document.getElementById('toggleAuraFlower');
    const sliderAura = document.getElementById('sliderAuraOpacity');

    // Body visibility toggle handlers
    const onBodyToggle = (checked) => {
      State.showBodyCircles = checked;
      if (checked && (State.bodyOpacity === 0 || State.bodyOpacity === undefined)) {
        State.bodyOpacity = 1.0;
      }
      this.syncLayerControls();
      App.renderAll();
    };
    checkBody?.addEventListener('change', (e) => onBodyToggle(e.target.checked));
    toggleBody?.addEventListener('change', (e) => onBodyToggle(e.target.checked));

    // Body opacity slider handler
    sliderBody?.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      State.bodyOpacity = val / 100;
      State.showBodyCircles = val > 0;
      this.syncLayerControls();
      App.renderAll();
    });

    // Aura visibility toggle handlers
    const onAuraToggle = (checked) => {
      State.showAuraFlower = checked;
      if (checked && (State.auraOpacity === 0 || State.auraOpacity === undefined)) {
        State.auraOpacity = 1.0;
      }
      this.syncLayerControls();
      App.renderAll();
    };
    checkAura?.addEventListener('change', (e) => onAuraToggle(e.target.checked));
    toggleAura?.addEventListener('change', (e) => onAuraToggle(e.target.checked));

    // Aura opacity slider handler
    sliderAura?.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      State.auraOpacity = val / 100;
      State.showAuraFlower = val > 0;
      this.syncLayerControls();
      App.renderAll();
    });
  },

  syncLayerControls() {
    const checkBody = document.getElementById('checkBodyVisible');
    const toggleBody = document.getElementById('toggleBodyCircles');
    const sliderBody = document.getElementById('sliderBodyOpacity');
    const badgeBody = document.getElementById('badgeBodyOpacity');

    const checkAura = document.getElementById('checkAuraVisible');
    const toggleAura = document.getElementById('toggleAuraFlower');
    const sliderAura = document.getElementById('sliderAuraOpacity');
    const badgeAura = document.getElementById('badgeAuraOpacity');

    const isBodyVisible = Boolean(State.showBodyCircles);
    const bodyVal = Math.round((State.bodyOpacity !== undefined ? State.bodyOpacity : 1.0) * 100);
    if (checkBody) checkBody.checked = isBodyVisible;
    if (toggleBody) toggleBody.checked = isBodyVisible;
    if (sliderBody) sliderBody.value = isBodyVisible ? bodyVal : 0;
    if (badgeBody) badgeBody.textContent = isBodyVisible ? `${bodyVal}%` : 'Off';

    const isAuraVisible = Boolean(State.showAuraFlower);
    const auraVal = Math.round((State.auraOpacity !== undefined ? State.auraOpacity : 1.0) * 100);
    if (checkAura) checkAura.checked = isAuraVisible;
    if (toggleAura) toggleAura.checked = isAuraVisible;
    if (sliderAura) sliderAura.value = isAuraVisible ? auraVal : 0;
    if (badgeAura) badgeAura.textContent = isAuraVisible ? `${auraVal}%` : 'Off';
  },

  bindPainterControls() {
    // Painter mode toggle
    const togglePainter = document.getElementById('togglePainterMode');
    const swatchesContainer = document.getElementById('painterSwatches');
    if (togglePainter) {
      togglePainter.checked = !!State.painterMode;
      if (swatchesContainer) {
        swatchesContainer.style.display = togglePainter.checked ? 'flex' : 'none';
      }
      togglePainter.addEventListener('change', (e) => {
        State.painterMode = e.target.checked;
        if (swatchesContainer) {
          swatchesContainer.style.display = e.target.checked ? 'flex' : 'none';
        }
        this.showToast(e.target.checked ? 'Painter Mode Active: Click circles to fill color' : 'Painter Mode Deactivated');
      });
    }

    // Swatches
    document.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.painterColor = btn.dataset.color || '#f59e0b';
      });
    });

    const customPainterInput = document.getElementById('colorPainterCustom');
    if (customPainterInput) {
      customPainterInput.addEventListener('input', (e) => {
        State.painterColor = e.target.value;
        document.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active'));
      });
    }

    // Clear painted shapes button
    const btnClearPaint = document.getElementById('btnClearPaint');
    if (btnClearPaint) {
      btnClearPaint.addEventListener('click', () => {
        if (State.coloredShapesMap.size === 0) {
          this.showToast('No painted shapes to clear.');
          return;
        }
        State.coloredShapesMap.clear();
        App.renderAll();
        this.showToast('Cleared all painted shape fills.');
      });
    }
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
  },

  bindDimensionTabs() {
    document.querySelectorAll('#dimensionSwitcher .dim-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const dim = tab.dataset.dim;
        this.setDimension(dim);
      });
    });
  },

  setDimension(dim) {
    State.dimension = dim;
    document.body.dataset.dimension = dim;

    document.querySelectorAll('#dimensionSwitcher .dim-tab').forEach(tab => {
      const isActive = tab.dataset.dim === dim;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const svgWrapper = document.getElementById('svgWrapperMain') || document.getElementById('svgWrapperKryst') || document.getElementById('svgWrapperLife');
    const webglWrapper = document.getElementById('webglWrapperMain') || document.getElementById('webglWrapperKryst');
    const section3d = document.getElementById('section3dControls');
    const section2d = document.getElementById('section2dLayers');

    if (dim === '3d') {
      if (svgWrapper) svgWrapper.style.display = 'none';
      if (webglWrapper) webglWrapper.style.display = 'flex';
      if (section3d) {
        section3d.style.display = '';
        section3d.classList.add('open');
      }
      if (section2d) {
        section2d.style.display = 'none';
      }

      if (window.Renderer3D) {
        if (!window.Renderer3D.isInitialized && window.Renderer3D.init) {
          window.Renderer3D.init();
        } else {
          window.Renderer3D.resizeAll?.();
          window.Renderer3D.renderAll?.();
          window.Renderer3D.fitCameraAll?.();
        }
      }
      this.showToast('3D WebGL Engine Active');
    } else {
      if (svgWrapper) svgWrapper.style.display = '';
      if (webglWrapper) webglWrapper.style.display = 'none';
      if (section3d) {
        section3d.style.display = 'none';
      }
      if (section2d) {
        section2d.style.display = '';
      }

      App.renderAll();
      this.showToast('2D SVG Engine Active');
    }
  },

  bindSliders() {
    const radiusSlider = document.getElementById('radiusSlider');
    const radiusBadge = document.getElementById('radiusBadge');
    const auraScaleBadge = document.getElementById('badgeAuraScale');
    const auraScaleSlider = document.getElementById('sliderAuraScale');

    const updateAuraScaleLabel = (scale) => {
      if (!auraScaleBadge) return;
      const px = Math.round(scale * (State.r || 50));
      auraScaleBadge.textContent = `${scale.toFixed(1)}r (${px}px)`;
    };

    if (radiusSlider && radiusBadge) {
      radiusSlider.value = State.r || 50;
      radiusBadge.textContent = `r = ${State.r}px`;
      radiusSlider.addEventListener('input', (e) => {
        State.setRadius(e.target.value);
        radiusBadge.textContent = `r = ${State.r}px`;
        updateAuraScaleLabel(State.auraScale || 2.0);
        this.updateSidebarStats();
        App.renderAll();
      });
    }

    // Aura Scale Slider (2r to 6r)
    if (auraScaleSlider) {
      auraScaleSlider.value = State.auraScale || 2.0;
      updateAuraScaleLabel(Number(auraScaleSlider.value));

      auraScaleSlider.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 2.0, 6.0, 2.0);
        State.auraScale = val;
        updateAuraScaleLabel(val);
        this.updateSidebarStats();
        App.renderAll();
      });
    }

    const strokeAuraSlider = document.getElementById('strokeAuraSlider');
    const strokeAuraBadge = document.getElementById('strokeAuraBadge');
    if (strokeAuraSlider && strokeAuraBadge) {
      strokeAuraSlider.value = State.strokeAura || 1.5;
      strokeAuraBadge.textContent = `${State.strokeAura}px`;
      strokeAuraSlider.addEventListener('input', (e) => {
        State.strokeAura = clampNumber(e.target.value, 0.25, 8.0, 1.5);
        strokeAuraBadge.textContent = `${State.strokeAura}px`;
        App.renderAll();
      });
    }

    const strokeBodySlider = document.getElementById('strokeBodySlider');
    const strokeBodyBadge = document.getElementById('strokeBodyBadge');
    if (strokeBodySlider && strokeBodyBadge) {
      strokeBodySlider.value = State.strokeBody || 1.0;
      strokeBodyBadge.textContent = `${State.strokeBody}px`;
      strokeBodySlider.addEventListener('input', (e) => {
        State.strokeBody = clampNumber(e.target.value, 0.25, 6.0, 1.0);
        strokeBodyBadge.textContent = `${State.strokeBody}px`;
        App.renderAll();
      });
    }

    const strokeGuideSlider = document.getElementById('strokeGuideSlider');
    const strokeGuideBadge = document.getElementById('strokeGuideBadge');
    if (strokeGuideSlider && strokeGuideBadge) {
      strokeGuideSlider.value = State.strokeGuide || 2.0;
      strokeGuideBadge.textContent = `${State.strokeGuide}px`;
      strokeGuideSlider.addEventListener('input', (e) => {
        State.strokeGuide = clampNumber(e.target.value, 0.25, 8.0, 2.0);
        strokeGuideBadge.textContent = `${State.strokeGuide}px`;
        App.renderAll();
      });
    }

    const fillSlider = document.getElementById('fillOpacitySlider');
    const fillBadge = document.getElementById('fillOpacityBadge');
    if (fillSlider && fillBadge) {
      fillSlider.value = Math.round((State.fillOpacity || 0.04) * 100);
      fillBadge.textContent = `${fillSlider.value}%`;
      fillSlider.addEventListener('input', (e) => {
        const pct = clampNumber(e.target.value, 0, 100, 4);
        State.fillOpacity = pct / 100;
        fillBadge.textContent = `${pct}%`;
        App.renderAll();
      });
    }

    // Offset Path sliders (R-A5)
    const offsetCountSlider = document.getElementById('sliderOffsetCount');
    const offsetCountBadge = document.getElementById('badgeOffsetCount');
    if (offsetCountSlider && offsetCountBadge) {
      offsetCountSlider.value = State.offsetPath?.count || 3;
      offsetCountBadge.textContent = `${offsetCountSlider.value} rings`;
      offsetCountSlider.addEventListener('input', (e) => {
        State.offsetPath.count = Number(e.target.value);
        offsetCountBadge.textContent = `${e.target.value} rings`;
        App.renderAll();
      });
    }

    const offsetSpacingSlider = document.getElementById('sliderOffsetSpacing');
    const offsetSpacingBadge = document.getElementById('badgeOffsetSpacing');
    if (offsetSpacingSlider && offsetSpacingBadge) {
      offsetSpacingSlider.value = State.offsetPath?.spacing || 6;
      offsetSpacingBadge.textContent = `${offsetSpacingSlider.value}px`;
      offsetSpacingSlider.addEventListener('input', (e) => {
        State.offsetPath.spacing = Number(e.target.value);
        offsetSpacingBadge.textContent = `${e.target.value}px`;
        App.renderAll();
      });
    }
  },

  bindToggles() {
    const toggleMap = [
      { id: 'toggleCircleRainbow', prop: 'circleRainbow' },
      { id: 'toggleRingSpectral', prop: 'ringSpectral' },
      { id: 'toggleRainbowRipple', prop: 'rainbowRipple' },
      { id: 'toggleFullScreenTiling', prop: 'fullScreenTiling' },
      { id: 'toggleSOHOE', prop: 'showSOHOE' },
      { id: 'toggleHexagramEyes', prop: 'showHexagramEyes' },
      { id: 'toggleGuides', prop: 'showGuides' },
      { id: 'toggleOuterRing', prop: 'showOuterRing' },
      { id: 'toggleCenterDots', prop: 'showCenterDots' },
      { id: 'toggleIntersections', prop: 'showIntersections' },
      { id: 'toggleRadialAxes', prop: 'showRadialAxes' },
      { id: 'toggleGlow', prop: 'enableGlow' },
      { id: 'togglePulse', prop: 'enablePulse' }
    ];

    toggleMap.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        el.checked = Boolean(State[item.prop]);
        el.addEventListener('change', (e) => {
          State[item.prop] = e.target.checked;
          App.renderAll();
        });
      }
    });

    // Offset Path toggle (R-A5)
    const toggleOffset = document.getElementById('toggleOffsetPath');
    const offsetControls = document.getElementById('offsetPathControls');
    if (toggleOffset) {
      toggleOffset.checked = !!State.offsetPath?.enabled;
      if (offsetControls) offsetControls.style.display = toggleOffset.checked ? 'block' : 'none';
      toggleOffset.addEventListener('change', (e) => {
        State.offsetPath.enabled = e.target.checked;
        if (offsetControls) offsetControls.style.display = e.target.checked ? 'block' : 'none';
        App.renderAll();
      });
    }
  },

  bindColorPickers() {
    const colorInputs = [
      { id: 'colorLife', prop: 'colorLife' },
      { id: 'colorKryst', prop: 'colorKryst' },
      { id: 'colorBody', prop: 'colorBody' },
      { id: 'colorTriangle', prop: 'colorTriangle' },
      { id: 'colorGuide', prop: 'colorGuide' },
      { id: 'colorIntersection', prop: 'colorIntersection' },
      { id: 'colorOuter', prop: 'colorOuter' },
      { id: 'colorAxes', prop: 'colorAxes' }
    ];

    colorInputs.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        el.value = State[item.prop] || '#ffffff';
        el.addEventListener('input', (e) => {
          State[item.prop] = e.target.value;
          App.renderAll();
        });
      }
    });
  },

  bindPresets() {
    // Add New Custom Preset
    const btnAdd = document.getElementById('btnAddNewPreset');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const name = prompt('Enter a name for this custom shape preset (e.g., Pyramid, Dove, Shield, Pinecone, Face):');
        if (!name || !name.trim()) return;

        const presetKey = 'custom_' + Date.now();
        const newPreset = {
          key: presetKey,
          title: name.trim(),
          highlightCount: State.highlightedIds.size,
          config: {
            boundaryRadius: State.boundaryRadius,
            r: State.r,
            auraScale: State.auraScale || 2.0,
            activePattern: State.activePattern,
            bodyOpacity: State.bodyOpacity !== undefined ? State.bodyOpacity : 1.0,
            auraOpacity: State.auraOpacity !== undefined ? State.auraOpacity : 1.0,
            showBodyCircles: State.showBodyCircles,
            showAuraFlower: State.showAuraFlower,
            bodyAuraMix: State.bodyAuraMix,
            highlightedIds: Array.from(State.highlightedIds),
            disabledCircleIds: Array.from(State.disabledCircleIds),
            coloredShapesMap: Array.from(State.coloredShapesMap.entries()),
            circleRainbow: State.circleRainbow,
            ringSpectral: State.ringSpectral,
            offsetPath: { ...State.offsetPath },
            fullScreenTiling: State.fullScreenTiling,
            showSOHOE: State.showSOHOE,
            showHexagramEyes: State.showHexagramEyes,
            showGuides: State.showGuides,
            showOuterRing: State.showOuterRing,
            showCenterDots: State.showCenterDots,
            colorKryst: State.colorKryst,
            colorLife: State.colorLife,
            colorBody: State.colorBody,
            colorGuide: State.colorGuide,
            colorOuter: State.colorOuter
          }
        };

        PresetsManager.customPresets[presetKey] = newPreset;
        PresetsManager.saveCustomPresets();
        this.renderCustomPresets();
        this.showToast(`Saved custom preset: "${name.trim()}"`);
      });
    }

    // Backup & Manage Presets Modal
    const manageModal = document.getElementById('presetManageModal');
    const btnManage = document.getElementById('btnManagePresets');
    const closeManage = document.getElementById('closeManagePresetsBtn');
    if (btnManage && manageModal) {
      btnManage.addEventListener('click', () => manageModal.classList.add('open'));
    }
    if (closeManage && manageModal) {
      closeManage.addEventListener('click', () => manageModal.classList.remove('open'));
    }

    // Export Presets JSON
    const btnExportJson = document.getElementById('btnExportPresetsJson');
    if (btnExportJson) {
      btnExportJson.addEventListener('click', () => {
        PresetsManager.exportToJson();
        this.showToast('Exported presets JSON file.');
      });
    }

    // Import Presets JSON
    const fileInput = document.getElementById('importPresetsFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          PresetsManager.importFromJson(event.target.result);
          this.renderCustomPresets();
          manageModal?.classList.remove('open');
          fileInput.value = '';
          this.showToast('Imported custom presets successfully.');
        };
        reader.readAsText(file);
      });
    }

    // Reset Presets
    const btnResetDefaults = document.getElementById('btnResetPresetsDefaults');
    if (btnResetDefaults) {
      btnResetDefaults.addEventListener('click', () => {
        if (confirm('Clear all custom presets?')) {
          PresetsManager.customPresets = {};
          PresetsManager.saveCustomPresets();
          this.renderCustomPresets();
          manageModal?.classList.remove('open');
          this.showToast('Cleared custom presets.');
        }
      });
    }
  },

  renderCustomPresets() {
    const grid = document.getElementById('presetGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const customKeys = Object.keys(PresetsManager.customPresets || {});
    if (customKeys.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 18px 12px; text-align: center; color: var(--text-faint); font-size: 0.78rem; border: 1px dashed var(--bg-panel-border); border-radius: var(--radius-sm);">
          No saved presets yet.<br/>
          Select circles or configure your geometry, then click <strong>+ Add Preset</strong> to save (e.g. Pyramid, Dove, Shield, Pinecone, Face).
        </div>
      `;
      return;
    }

    customKeys.forEach(key => {
      const p = PresetsManager.customPresets[key];
      const card = document.createElement('div');
      card.className = `preset-card ${State.activePreset === key ? 'active' : ''}`;
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <strong style="font-size:0.82rem; color:var(--text-bright);">${p.title}</strong>
          <button class="btn-delete-preset" title="Delete preset" style="background:transparent; border:none; color:var(--text-faint); cursor:pointer; font-size:0.9rem; padding:2px 4px;">&times;</button>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; font-size:0.7rem; color:var(--text-muted); margin-top:4px;">
          <span>${p.config?.activePattern === 'life' ? 'Flower of Life' : 'Flower of Kryst'}</span>
          <span style="font-family:var(--font-mono); color:var(--accent-gold);">${p.config?.highlightedIds?.length || 0} selected</span>
        </div>
      `;

      // Apply preset
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-preset')) return;
        this.applyCustomPreset(key);
      });

      // Delete preset
      const delBtn = card.querySelector('.btn-delete-preset');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Delete preset "${p.title}"?`)) {
            delete PresetsManager.customPresets[key];
            PresetsManager.saveCustomPresets();
            this.renderCustomPresets();
            this.showToast(`Deleted preset "${p.title}"`);
          }
        });
      }

      grid.appendChild(card);
    });
  },

  applyCustomPreset(key) {
    const preset = PresetsManager.customPresets[key];
    if (!preset || !preset.config) return;

    State.activePreset = key;
    const cfg = preset.config;

    if (cfg.boundaryRadius !== undefined) State.boundaryRadius = cfg.boundaryRadius;
    if (cfg.r !== undefined) State.setRadius(cfg.r);
    if (cfg.auraScale !== undefined) {
      State.auraScale = clampNumber(cfg.auraScale, 2.0, 6.0, 2.0);
      const auraScaleSlider = document.getElementById('sliderAuraScale');
      const auraScaleBadge = document.getElementById('badgeAuraScale');
      if (auraScaleSlider) auraScaleSlider.value = State.auraScale;
      if (auraScaleBadge) {
        const px = Math.round(State.auraScale * (State.r || 50));
        auraScaleBadge.textContent = `${State.auraScale.toFixed(1)}r (${px}px)`;
      }
    }
    if (cfg.activePattern !== undefined) State.activePattern = cfg.activePattern;
    if (cfg.bodyOpacity !== undefined) State.bodyOpacity = cfg.bodyOpacity;
    if (cfg.auraOpacity !== undefined) State.auraOpacity = cfg.auraOpacity;
    if (cfg.showBodyCircles !== undefined) State.showBodyCircles = cfg.showBodyCircles;
    if (cfg.showAuraFlower !== undefined) State.showAuraFlower = cfg.showAuraFlower;
    if (cfg.bodyAuraMix !== undefined) State.bodyAuraMix = cfg.bodyAuraMix;

    State.highlightedIds.clear();
    if (Array.isArray(cfg.highlightedIds)) {
      cfg.highlightedIds.forEach(id => State.highlightedIds.add(id));
    }

    State.disabledCircleIds.clear();
    if (Array.isArray(cfg.disabledCircleIds)) {
      cfg.disabledCircleIds.forEach(id => State.disabledCircleIds.add(id));
    }

    State.coloredShapesMap.clear();
    if (Array.isArray(cfg.coloredShapesMap)) {
      cfg.coloredShapesMap.forEach(([id, color]) => State.coloredShapesMap.set(id, color));
    }

    if (cfg.circleRainbow !== undefined) State.circleRainbow = cfg.circleRainbow;
    if (cfg.ringSpectral !== undefined) State.ringSpectral = cfg.ringSpectral;
    if (cfg.offsetPath !== undefined) State.offsetPath = { ...cfg.offsetPath };
    if (cfg.fullScreenTiling !== undefined) State.fullScreenTiling = cfg.fullScreenTiling;
    if (cfg.showSOHOE !== undefined) State.showSOHOE = cfg.showSOHOE;
    if (cfg.showHexagramEyes !== undefined) State.showHexagramEyes = cfg.showHexagramEyes;
    if (cfg.showGuides !== undefined) State.showGuides = cfg.showGuides;
    if (cfg.showOuterRing !== undefined) State.showOuterRing = cfg.showOuterRing;
    if (cfg.showCenterDots !== undefined) State.showCenterDots = cfg.showCenterDots;

    // Sync UI elements
    const boundarySlider = document.getElementById('boundarySlider');
    if (boundarySlider) boundarySlider.value = State.boundaryRadius;
    const boundaryBadge = document.getElementById('boundaryBadge');
    if (boundaryBadge) boundaryBadge.textContent = `R_bound = ${State.boundaryRadius}px`;

    this.syncLayerControls();
    this.bindPatternSwitcher();
    this.renderCustomPresets();
    this.updateSidebarStats();
    App.renderAll();
    this.showToast(`Applied preset: ${preset.title}`);
  },

  bindModals() {
    // 1. Story of Kryst Modal (R-A12)
    const storyModal = document.getElementById('storyModal');
    const openStoryBtn = document.getElementById('btnStoryOfKryst');
    const closeStoryBtn = document.getElementById('closeStoryBtn');

    if (openStoryBtn && storyModal) {
      openStoryBtn.addEventListener('click', () => {
        this.populateStoryTimeline();
        storyModal.classList.add('open');
      });
    }
    if (closeStoryBtn && storyModal) {
      closeStoryBtn.addEventListener('click', () => storyModal.classList.remove('open'));
    }
    if (storyModal) {
      storyModal.addEventListener('click', (e) => {
        if (e.target === storyModal) storyModal.classList.remove('open');
      });
    }

    // 2. Ring Notes & Numerology Modal (R-A13)
    const notesModal = document.getElementById('ringNotesModal');
    const openNotesBtn = document.getElementById('btnRingNotes');
    const closeNotesBtn = document.getElementById('closeRingNotesBtn');

    if (openNotesBtn && notesModal) {
      openNotesBtn.addEventListener('click', () => {
        this.renderRingNote(this.activeRingNoteIndex);
        notesModal.classList.add('open');
      });
    }
    if (closeNotesBtn && notesModal) {
      closeNotesBtn.addEventListener('click', () => notesModal.classList.remove('open'));
    }
    if (notesModal) {
      notesModal.addEventListener('click', (e) => {
        if (e.target === notesModal) notesModal.classList.remove('open');
      });
    }

    document.getElementById('btnPrevRingNote')?.addEventListener('click', () => {
      this.activeRingNoteIndex = Math.max(1, this.activeRingNoteIndex - 1);
      this.renderRingNote(this.activeRingNoteIndex);
    });
    document.getElementById('btnNextRingNote')?.addEventListener('click', () => {
      this.activeRingNoteIndex = Math.min(12, this.activeRingNoteIndex + 1);
      this.renderRingNote(this.activeRingNoteIndex);
    });

    // 3. Theory Modal
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

    // 4. Export Modal & Quick Actions (R-A6)
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

    // Quick download buttons
    document.getElementById('quickDownloadSvgBtn')?.addEventListener('click', () => {
      Exporter.downloadSVG();
      this.showToast('Downloaded SVG vector file.');
    });
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
    document.getElementById('downloadPng3dBtn')?.addEventListener('click', () => {
      Exporter.downloadPNG3D();
      exportModal?.classList.remove('open');
    });
  },

  populateStoryTimeline() {
    const container = document.getElementById('storyTimelineContent');
    if (!container) return;
    container.innerHTML = '';

    KRYST_STORY_DATA.forEach(step => {
      const stepEl = document.createElement('div');
      stepEl.className = 'story-step';
      const stageBadge = step.stage || `Ring #${step.ring}`;
      const stageTitle = step.name || step.title;
      const subtitle = step.subtitle || step.geom || '';
      const desc = step.description || step.desc || '';
      stepEl.innerHTML = `
        <div class="story-step-badge">${stageBadge}</div>
        <div class="story-step-content">
          <h4 style="margin:0 0 4px 0; color:var(--accent-gold); font-family:var(--font-cinzel);">${stageTitle}</h4>
          ${subtitle ? `<div style="font-size:0.75rem; color:var(--accent-cyan); margin-bottom:6px; font-family:var(--font-mono);">${subtitle}</div>` : ''}
          <p style="margin:0; font-size:0.84rem; color:var(--text-primary); line-height:1.5;">${desc}</p>
        </div>
      `;
      container.appendChild(stepEl);
    });
  },

  renderRingNote(ringNum) {
    const note = RING_NOTES_DATA.find(n => n.ring === ringNum) || RING_NOTES_DATA[0] || {};
    const container = document.getElementById('ringNoteContent');
    if (!container) return;

    const ringTitle = note.title || note.name || `Ring #${note.ring}`;
    const ringDesc = note.esotericMeaning || note.desc || '';
    const ringNumerology = note.numerology || (note.circleCount ? `${note.circleCount} Circles` : '—');
    const ringFrequency = note.frequency || 'Harmonic Pure';
    const ringArchetype = note.archetype || note.geometry || 'Crystalline Axis';

    container.innerHTML = `
      <div class="ring-note-card">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px; margin-bottom:12px;">
          <div>
            <span style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--accent-cyan);">Concentric Layer</span>
            <h3 style="margin:2px 0 0 0; color:var(--accent-gold); font-family:var(--font-cinzel);">${ringTitle}</h3>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.72rem; color:var(--text-muted);">Harmonic Frequency</div>
            <strong style="color:var(--accent-gold); font-family:var(--font-mono);">${ringFrequency}</strong>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; margin-bottom:14px; background:rgba(0,0,0,0.3); padding:10px; border-radius:var(--radius-sm);">
          <div>
            <span style="font-size:0.7rem; color:var(--text-muted);">Sacred Numerology:</span>
            <div style="font-weight:600; font-size:0.85rem; color:#fff;">${ringNumerology}</div>
          </div>
          <div>
            <span style="font-size:0.7rem; color:var(--text-muted);">Geometric Archetype:</span>
            <div style="font-weight:600; font-size:0.85rem; color:var(--accent-cyan);">${ringArchetype}</div>
          </div>
        </div>

        <p style="font-size:0.88rem; line-height:1.6; color:var(--text-primary); margin:0;">
          ${ringDesc}
        </p>
      </div>
    `;

    const indicator = document.getElementById('ringNoteIndicator');
    if (indicator) {
      indicator.textContent = `Ring ${ringNum} of 12`;
    }
  },

  bindFloatingControls() {
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
      if (State.dimension === '3d' && window.Renderer3D) {
        ['kryst', 'life'].forEach(k => {
          const vp = window.Renderer3D.viewports?.[k];
          if (vp && vp.camera) {
            vp.camera.position.multiplyScalar(0.85);
            vp.controls?.update();
          }
        });
      } else {
        App.panZoomControllers.forEach(pz => pz.zoom(1.25));
      }
    });

    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
      if (State.dimension === '3d' && window.Renderer3D) {
        ['kryst', 'life'].forEach(k => {
          const vp = window.Renderer3D.viewports?.[k];
          if (vp && vp.camera) {
            vp.camera.position.multiplyScalar(1.18);
            vp.controls?.update();
          }
        });
      } else {
        App.panZoomControllers.forEach(pz => pz.zoom(0.8));
      }
    });

    document.getElementById('resetZoomBtn')?.addEventListener('click', () => {
      if (State.dimension === '3d' && window.Renderer3D) {
        window.Renderer3D.setCameraPreset(State.cameraPreset3D || 'isometric');
      } else {
        const activeKey = State.activePattern || 'kryst';
        State.transforms[activeKey] = { panX: 0, panY: 0, scale: 0.38 };
        App.renderAll();
      }
    });

    document.getElementById('fitZoomBtn')?.addEventListener('click', () => {
      this.fitToScreen();
    });

    document.getElementById('clearHighlightBtn')?.addEventListener('click', () => {
      State.highlightedIds.clear();
      SVGRenderer.updateHighlights('svgMain');
      this.updateSidebarStats();
      this.showToast('Cleared shape highlights.');
    });
  },

  bind3DControls() {
    // 3D Architecture Model Switcher
    const modelSelect = document.getElementById('select3DModel');
    if (modelSelect) {
      modelSelect.value = State.model3D || 'volumetric_kryst';
      modelSelect.addEventListener('change', (e) => {
        State.model3D = e.target.value;
        if (State.dimension === '3d' && window.Renderer3D) {
          window.Renderer3D.renderAll?.();
          window.Renderer3D.fitCameraAll?.();
        }
      });
    }

    const autoRotateToggle = document.getElementById('toggleAutoRotate3D');
    if (autoRotateToggle) {
      autoRotateToggle.checked = !!State.autoRotate3D;
      autoRotateToggle.addEventListener('change', (e) => {
        State.autoRotate3D = e.target.checked;
      });
    }
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
        SVGRenderer.updateHighlights('svgMain');
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
  },

  fitToScreen() {
    if (State.dimension === '3d' && window.Renderer3D) {
      window.Renderer3D.fitCameraAll?.();
      return;
    }
    const pane = document.getElementById('paneMain') || document.querySelector('.viewport-pane');
    const rect = pane?.getBoundingClientRect();
    const width = (rect && rect.width > 0) ? rect.width : (pane?.clientWidth || 800);
    const height = (rect && rect.height > 0) ? rect.height : (pane?.clientHeight || 800);
    const minDim = Math.min(width, height) * 0.85;
    const fitScale = clampNumber(minDim / (2 * (State.boundaryRadius || 200)), 0.04, 25.0, 0.38);

    const activeKey = State.activePattern || 'kryst';
    State.transforms[activeKey] = { panX: 0, panY: 0, scale: fitScale };

    const svg = document.getElementById('svgMain') || document.getElementById('svgKryst');
    if (svg) {
      SVGRenderer.updateViewBox(svg, State.transforms[activeKey]);
    }
    App.renderAll();
  },

  updateSidebarStats() {
    const boundEl = document.getElementById('sidebarBoundRad');
    if (boundEl) {
      boundEl.textContent = `${Math.round(State.boundaryRadius)}px (${(State.boundaryRadius / State.r).toFixed(1)}r)`;
    }
    const hlEl = document.getElementById('sidebarHighlightCount');
    if (hlEl) {
      hlEl.textContent = String(State.highlightedIds.size);
    }
    const disEl = document.getElementById('sidebarDisabledCount');
    if (disEl) {
      disEl.textContent = String(State.disabledCircleIds.size);
    }
  }
};

window.UI = UI;

export { PanZoomController, UI };
export default UI;
