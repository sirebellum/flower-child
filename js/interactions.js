/**
 * INTERACTION & UI CONTROLLER
 * Pan/zoom with requestAnimationFrame throttling, delegated SVG hit-testing,
 * lightweight click-to-highlight, and keyboard navigation.
 */
import { State, PresetsManager, PresetDialog, clampNumber } from './state.js';
import { SacredMath } from './geometry.js';
import { SVGRenderer } from './renderer.js';
import { Exporter } from './export.js';
import { App } from './main.js';

/* =========================================================================
   PAN/ZOOM CONTROLLER (RAF-THROTTLED)
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

    // Pointer Drag for Pan
    this.wrapper.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // Left click only
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

/* =========================================================================
   UI CONTROLLER
   ========================================================================= */
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

  /**
   * Delegated Event Listeners on SVG Viewports:
   * Avoids attaching hundreds of individual mouseenter/click listeners to circles on every render pass.
   */
  initSvgEventDelegation() {
    ['svgLife', 'svgKryst'].forEach(svgId => {
      const svg = document.getElementById(svgId);
      if (!svg) return;

      // Delegated hover inspection
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

      // Delegated click-to-highlight with lightweight DOM updates
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
            // Lightweight highlight update - no geometry re-render!
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
      { id: 'colorTriangle', prop: 'colorTriangle' },
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

    // Modal Sliders
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

    // Manage Presets Modal
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
    if (cfg.colorTriangle !== undefined) State.colorTriangle = cfg.colorTriangle;
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
    const effectiveLifeLayers = SacredMath.getEffectiveLifeLayers(N, State.r);
    const folCount = (State.activePreset === 'fruit_of_life' || State.activePreset === 'metatrons_cube')
      ? 13
      : 1 + 3 * effectiveLifeLayers * (effectiveLifeLayers + 1);
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
    const R_bound_life = SacredMath.getFoLBoundingRadius(State.N, State.r);
    const R_bound_kryst = SacredMath.getFoKBoundingRadius(State.N, State.r);
    const boundEl = document.getElementById('sidebarBoundRad');
    if (boundEl) {
      const krystStr = `${Math.round(R_bound_kryst)}px (${(R_bound_kryst / State.r).toFixed(2)}r)`;
      const lifeLayers = SacredMath.getEffectiveLifeLayers(State.N, State.r);
      const lifeStr = `${Math.round(R_bound_life)}px (${2 * lifeLayers + 2}r)`;
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
      this.fitToScreen();
    });

    document.getElementById('fitZoomBtn')?.addEventListener('click', () => {
      this.fitToScreen();
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
    // Theory Modal
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

    // Export Modal
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
  },

  fitToScreen() {
    const R_bound = Math.max(SacredMath.getFoLBoundingRadius(State.N, State.r), SacredMath.getFoKBoundingRadius(State.N, State.r));
    const pane = document.querySelector('.viewport-pane');
    const width = pane?.clientWidth || 800;
    const height = pane?.clientHeight || 800;
    const minDim = Math.min(width, height) * 0.85;
    const fitScale = clampNumber(minDim / (2 * R_bound), 0.05, 5.0, 0.38);
    State.transforms.life = { panX: 0, panY: 0, scale: fitScale };
    State.transforms.kryst = { panX: 0, panY: 0, scale: fitScale };
    App.renderAll();
  }
};

export { PanZoomController, UI };
export default UI;
