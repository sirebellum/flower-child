/**
 * APPLICATION STATE & PRESETS MANAGER
 * Centralized reactive state store, presets configurations, and storage persistence.
 * Includes defensive bounds clamping and validation at state boundaries.
 */

/* =========================================================================
   INPUT VALIDATION & BOUNDS CLAMPING HELPERS
   ========================================================================= */

/**
 * Safely parses and clamps numeric values to prevent NaN or extreme values.
 * @param {any} val - Input value.
 * @param {number} min - Minimum allowed value.
 * @param {number} max - Maximum allowed value.
 * @param {number} defaultVal - Default fallback if invalid.
 * @returns {number} Clamped safe number.
 */
function clampNumber(val, min, max, defaultVal) {
  const n = Number(val);
  if (Number.isNaN(n) || !Number.isFinite(n)) return defaultVal;
  return Math.min(Math.max(n, min), max);
}

/* =========================================================================
   GLOBAL APPLICATION STATE
   ========================================================================= */
const State = {
  viewportMode: 'single-kryst', // 'single-kryst' | 'single-life'
  activePreset: null,
  activePattern: 'kryst', // 'kryst' | 'life'
  
  // Independent Body & Aura Layer Visibility & Opacity (0.0 to 1.0, default 1.0 full visibility)
  bodyOpacity: 1.0,
  auraOpacity: 1.0,
  _bodyAuraMix: 0.5,
  get bodyAuraMix() { return this.auraOpacity; },
  set bodyAuraMix(v) { this.auraOpacity = clampNumber(v, 0, 1, 1.0); },

  _viewStyle: 'combined',
  get viewStyle() { return this._viewStyle; },
  set viewStyle(v) {
    if (v === 'actual' || v === 'aura') {
      this._viewStyle = 'aura';
      this.showAuraFlower = true;
      this.showBodyCircles = false;
      this.bodyOpacity = 0.0;
      this.auraOpacity = 1.0;
    } else if (v === 'base' || v === 'body') {
      this._viewStyle = 'body';
      this.showAuraFlower = false;
      this.showBodyCircles = true;
      this.bodyOpacity = 1.0;
      this.auraOpacity = 0.0;
    } else {
      this._viewStyle = 'combined';
      this.showAuraFlower = true;
      this.showBodyCircles = true;
      this.bodyOpacity = 1.0;
      this.auraOpacity = 1.0;
    }
  },

  // Dynamic Boundary Circle (E-05)
  boundaryRadius: 200, // in pixels (default 4 * r)
  disabledCircleIds: new Set(), // Body circles permanently removed by the user

  // Aura Radius Scale Factor (1.1r to 20.0r body radius, default 1.95)
  auraScale: 1.95,

  // Lattice Geometry
  N: 2,
  r: 50,
  syncPanZoom: true,

  // Layers visibility
  showAuraFlower: true,
  get showActualFlower() { return this.showAuraFlower; },
  set showActualFlower(v) { this.showAuraFlower = Boolean(v); },

  showBodyCircles: true,
  get showBaseCircles() { return this.showBodyCircles; },
  set showBaseCircles(v) { this.showBodyCircles = Boolean(v); },

  showGuides: false,
  showOuterRing: false, // Default outer ring visibility set to false per user request
  showBoundaryPetals: false,
  showCenterDots: false,
  showIntersections: false,
  showRadialAxes: false,
  showEyesOfKryst: false,

  // Advanced Visualizers & Modes
  circleRainbow: false, // R-A2: Each circle rainbow gradient
  ringSpectral: false, // R-A3: Rings 1..12 assigned Red -> Magenta
  fullScreenTiling: false, // R-A7: Full-screen wallpaper tiling
  rainbowRipple: false, // R-A9: Concentric meditation rainbow ripple
  showHexagramEyes: false, // R-A10: Circumscribed hexagrams + 12 eyes
  showSOHOE: false, // R-A11: Star of Heaven on Earth motif
  showStoryPanel: false, // R-A12: Story of Kryst drawer
  showRingNotes: false, // R-A13: Notes on current ring

  // Sacred Gadgets & Overlays (Concurrent Real-Time Animations)
  gadgetAuraExpansion: false,
  auraExpansionMaxSize: 20.0,
  auraExpansionSpeed: 1.0,
  gadgetRainbowAura: false,
  rainbowWaveSpeed: 1.0,
  gadgetBreathing: false,
  breathingMaxSize: 2.0,
  breathingSpeed: 1.0,

  // Offset Path Generator (R-A5)
  offsetPath: {
    enabled: false,
    count: 3,
    spacing: 5
  },

  // Painter of Life (R-A8)
  painterMode: false,
  painterColor: '#ef4444',
  coloredShapesMap: new Map(),

  // Individual Section Highlighting & Colored Intersections (Venn diagram style)
  sectionHighlightMode: false, // Dedicated mode for highlighting & coloring intersections
  selectedSectionIds: new Set(), // Set of currently selected intersection section IDs for batch fill
  get selectedSectionId() {
    return this.selectedSectionIds.values().next().value || null;
  },
  set selectedSectionId(v) {
    if (!this.selectedSectionIds) this.selectedSectionIds = new Set();
    this.selectedSectionIds.clear();
    if (v) this.selectedSectionIds.add(v);
  },
  sectionFills: {}, // { [sectionId]: colorHex }

  // Aesthetics
  colorByLayer: false,
  enableGlow: true,
  enablePulse: false,
  sphericalShading: false,

  // Curated Colors
  colorLife: '#ef4444',
  colorKryst: '#10b981',
  colorBody: '#3b82f6',
  get colorBase() { return this.colorBody; },
  set colorBase(v) { this.colorBody = v; },
  colorTriangle: '#eab308',
  colorGuide: '#ea580c',
  colorOuter: '#f59e0b',
  colorAxes: '#64748b',
  colorIntersection: '#ec4899',
  colorBg: '#07090e',

  // Strokes & Opacities
  strokeAura: 1.5,
  get strokeFlower() { return this.strokeAura; },
  set strokeFlower(v) { this.strokeAura = Number(v); },
  strokeBody: 1.0,
  get strokeBase() { return this.strokeBody; },
  set strokeBase(v) { this.strokeBody = Number(v); },
  strokeGuide: 1.8,
  fillOpacity: 0.04,

  // Selections & Highlights
  highlightedIds: new Set(),
  highlightedSectionIds: new Set(),
  hoveredItem: null,

  // Pan & Zoom Transform States
  transforms: {
    life: { panX: 0, panY: 0, scale: 0.38 },
    kryst: { panX: 0, panY: 0, scale: 0.38 }
  },

  // 3D WebGL Engine States (Frozen E-02)
  dimension: '2d', // '2d' | '3d'
  model3D: 'volumetric_kryst',
  colorCoding3D: 'classic',
  sphereStyle3D: 'solid',
  sphereRadiusScale: 1.0,
  sliceAxisMode: 'z',
  sliceOffset: 100,
  sliceSlabMode: false,
  sliceSlabThickness: 3,
  sliceRadialShell: 2,
  opacityHexCores: 0.90,
  opacityTetraFillers: 0.85,
  opacityOctantFill: 1.00,
  opacitySkeleton: 1.00,
  opacityAura3D: 0.18,
  opacityGuides3D: 0.70,
  fresnelGhostMode: false,
  showRhombicGuides: true,
  showTetraGuides: true,
  triaxialInfill: 'both',
  infillSteps: 2,
  showPlaneXY: true,
  showPlaneXZ: true,
  showPlaneYZ: true,
  showInfill3D: true,
  showAxialRims: true,
  fccPlaneFilter: 'all',
  fccExpansionMode: 'volumetric',
  show3DSpheres: true,
  show3DTorus: false,
  show3DShells: false,
  show3DGuides: true,
  showZeroPointMarker: true,
  sliceZ: 100,
  autoRotate3D: false,
  sphereOpacity: 0.35,
  sphereRoughness: 0.15,
  sphereMetalness: 0.1,
  cameraPreset3D: 'isometric',

  /**
   * Sets boundary radius safely.
   * @param {number} rad
   */
  setBoundaryRadius(rad) {
    this.boundaryRadius = clampNumber(rad, 2 * this.r, 42 * this.r, 4 * this.r);
    this.N = Math.max(1, Math.ceil(this.boundaryRadius / (2 * this.r)));
  },

  /**
   * Clamps and sets layer count N safely.
   * @param {number} n
   */
  setN(n) {
    this.N = clampNumber(n, 1, 42, 2);
    this.boundaryRadius = 2 * this.N * this.r;
  },

  /**
   * Clamps and sets base circle radius r safely.
   * @param {number} radius
   */
  setRadius(radius) {
    const oldR = this.r;
    this.r = clampNumber(radius, 15, 200, 50);
    // Keep relative boundary radius scale
    if (oldR > 0) {
      this.boundaryRadius = (this.boundaryRadius / oldR) * this.r;
    }
  },

  clampNumber(val, min, max, defaultVal) {
    return clampNumber(val, min, max, defaultVal);
  },

  /**
   * Resets all intersection fills, selected sections, and highlighted circles.
   */
  clearAllHighlights() {
    this.sectionFills = {};
    if (this.selectedSectionIds) this.selectedSectionIds.clear();
    if (this.highlightedIds) this.highlightedIds.clear();
    if (this.highlightedSectionIds) this.highlightedSectionIds.clear();
  },

  /**
   * Applies a studio configuration object to State.
   * @param {Object} cfg
   */
  applyConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    if (cfg.r !== undefined) this.r = clampNumber(cfg.r, 15, 200, 50);
    if (cfg.boundaryRadius !== undefined) this.boundaryRadius = cfg.boundaryRadius;
    if (cfg.N !== undefined) this.N = cfg.N;
    if (cfg.auraScale !== undefined) this.auraScale = clampNumber(cfg.auraScale, 0.0, 20.0, 1.95);
    if (cfg.auraExpansionMaxSize !== undefined) this.auraExpansionMaxSize = clampNumber(cfg.auraExpansionMaxSize, 0.0, 20.0, 20.0);
    if (cfg.auraExpansionSpeed !== undefined) this.auraExpansionSpeed = clampNumber(cfg.auraExpansionSpeed, 0.1, 3.0, 1.0);
    if (cfg.rainbowWaveSpeed !== undefined) this.rainbowWaveSpeed = clampNumber(cfg.rainbowWaveSpeed, 0.1, 3.0, 1.0);
    if (cfg.gadgetAuraExpansion !== undefined) this.gadgetAuraExpansion = Boolean(cfg.gadgetAuraExpansion);
    if (cfg.gadgetRainbowAura !== undefined) this.gadgetRainbowAura = Boolean(cfg.gadgetRainbowAura);
    if (cfg.gadgetBreathing !== undefined) this.gadgetBreathing = Boolean(cfg.gadgetBreathing);
    if (cfg.breathingMaxSize !== undefined) this.breathingMaxSize = clampNumber(cfg.breathingMaxSize, 1.05, 2.0, 2.0);
    if (cfg.breathingSpeed !== undefined) this.breathingSpeed = clampNumber(cfg.breathingSpeed, 0.1, 3.0, 1.0);
    if (cfg.activePattern !== undefined) this.activePattern = cfg.activePattern;
    if (cfg.bodyOpacity !== undefined) this.bodyOpacity = cfg.bodyOpacity;
    if (cfg.auraOpacity !== undefined) this.auraOpacity = cfg.auraOpacity;
    if (cfg.showBodyCircles !== undefined) this.showBodyCircles = cfg.showBodyCircles;
    if (cfg.showAuraFlower !== undefined) this.showAuraFlower = cfg.showAuraFlower;
    if (cfg.bodyAuraMix !== undefined) this.bodyAuraMix = cfg.bodyAuraMix;
    if (cfg.strokeAura !== undefined) this.strokeAura = clampNumber(cfg.strokeAura, 0.25, 8.0, 1.5);
    if (cfg.strokeFlower !== undefined) this.strokeAura = clampNumber(cfg.strokeFlower, 0.25, 8.0, 1.5);
    if (cfg.strokeBody !== undefined) this.strokeBody = clampNumber(cfg.strokeBody, 0.25, 6.0, 1.0);
    if (cfg.strokeBase !== undefined) this.strokeBody = clampNumber(cfg.strokeBase, 0.25, 6.0, 1.0);
    if (cfg.strokeGuide !== undefined) this.strokeGuide = clampNumber(cfg.strokeGuide, 0.25, 8.0, 1.8);
    if (cfg.fillOpacity !== undefined) this.fillOpacity = clampNumber(cfg.fillOpacity, 0, 1.0, 0.04);

    // Highlights
    if (!this.highlightedIds) this.highlightedIds = new Set();
    this.highlightedIds.clear();
    if (Array.isArray(cfg.highlightedIds)) {
      cfg.highlightedIds.forEach(id => this.highlightedIds.add(id));
    }

    if (!this.selectedSectionIds) this.selectedSectionIds = new Set();
    this.selectedSectionIds.clear();
    if (Array.isArray(cfg.selectedSectionIds)) {
      cfg.selectedSectionIds.forEach(id => this.selectedSectionIds.add(id));
    }

    if (!this.highlightedSectionIds) this.highlightedSectionIds = new Set();
    this.highlightedSectionIds.clear();
    if (Array.isArray(cfg.highlightedSectionIds)) {
      cfg.highlightedSectionIds.forEach(id => this.highlightedSectionIds.add(id));
    }

    this.sectionFills = (cfg.sectionFills && typeof cfg.sectionFills === 'object') ? { ...cfg.sectionFills } : {};

    if (!this.disabledCircleIds) this.disabledCircleIds = new Set();
    this.disabledCircleIds.clear();
    if (Array.isArray(cfg.disabledCircleIds)) {
      cfg.disabledCircleIds.forEach(id => this.disabledCircleIds.add(id));
    }

    if (!this.coloredShapesMap) this.coloredShapesMap = new Map();
    this.coloredShapesMap.clear();
    if (Array.isArray(cfg.coloredShapesMap)) {
      cfg.coloredShapesMap.forEach(([k, v]) => this.coloredShapesMap.set(k, v));
    }

    if (cfg.circleRainbow !== undefined) this.circleRainbow = cfg.circleRainbow;
    if (cfg.ringSpectral !== undefined) this.ringSpectral = cfg.ringSpectral;
    if (cfg.offsetPath !== undefined) this.offsetPath = { ...cfg.offsetPath };
    if (cfg.fullScreenTiling !== undefined) this.fullScreenTiling = cfg.fullScreenTiling;
    if (cfg.showSOHOE !== undefined) this.showSOHOE = cfg.showSOHOE;
    if (cfg.showHexagramEyes !== undefined) this.showHexagramEyes = cfg.showHexagramEyes;
    if (cfg.showGuides !== undefined) this.showGuides = cfg.showGuides;
    if (cfg.showOuterRing !== undefined) this.showOuterRing = cfg.showOuterRing;
    if (cfg.showCenterDots !== undefined) this.showCenterDots = cfg.showCenterDots;
    if (cfg.sectionHighlightMode !== undefined) this.sectionHighlightMode = Boolean(cfg.sectionHighlightMode);
  }
};

// Harmonic Color Palettes for "Color by Layer"
const LayerColors = [
  '#f43f5e', // Layer 0: Ruby / Rose Red
  '#f97316', // Layer 1: Sacral Orange
  '#eab308', // Layer 2: Solar Gold
  '#10b981', // Layer 3: Emerald
  '#06b6d4', // Layer 4: Cyan
  '#6366f1', // Layer 5: Indigo
  '#a855f7', // Layer 6: Violet
  '#ec4899', // Layer 7: Magenta
  '#f8fafc'  // Layer 8: Transcendental White
];

// 12-Stage Spectral Palette: Rings 1 (Red) through 12 (Magenta)
const Spectral12Colors = [
  '#ff0033', // Ring 1: Crimson Red
  '#ff4800', // Ring 2: Red-Orange
  '#ff8800', // Ring 3: Solar Orange
  '#ffc800', // Ring 4: Amber Gold
  '#eaff00', // Ring 5: Radiant Lime
  '#00ff66', // Ring 6: Emerald Green
  '#00ffd5', // Ring 7: Turquoise Cyan
  '#00a6ff', // Ring 8: Azure Blue
  '#0037ff', // Ring 9: Deep Indigo
  '#7300ff', // Ring 10: Royal Purple
  '#b700ff', // Ring 11: Electric Violet
  '#ff00aa'  // Ring 12: Transcendental Magenta
];

/* =========================================================================
   PRESETS CONFIGURATION ENGINE & MANAGER (User-Created Only E-11 / R-A4)
   ========================================================================= */
const PresetsManager = {
  STORAGE_KEY: 'sacred_geometry_custom_presets_v1',
  OVERRIDE_KEY: 'sacred_geometry_builtin_overrides_v1',

  builtinPresets: [],

  customPresets: [],
  builtinOverrides: {},

  init() {
    this.loadFromStorage();
  },

  loadFromStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.customPresets = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // Normalize object-keyed custom presets to array
            this.customPresets = Object.entries(parsed).map(([k, v]) => ({
              id: v.id || v.key || k,
              key: v.key || v.id || k,
              title: v.title || 'Untitled Preset',
              subtitle: v.subtitle || '',
              isBuiltin: false,
              highlightCount: v.highlightCount || ((v.config?.highlightedIds?.length || 0) + Object.keys(v.config?.sectionFills || {}).length + (v.config?.selectedSectionIds?.length || 0)) || 0,
              config: v.config || {}
            }));
          } else {
            this.customPresets = [];
          }
        } else {
          this.customPresets = [];
        }
      } else {
        this.customPresets = [];
      }
    } catch (e) {
      console.warn('Failed to load custom presets from storage:', e);
      this.customPresets = [];
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const overrides = localStorage.getItem(this.OVERRIDE_KEY);
        this.builtinOverrides = overrides ? JSON.parse(overrides) : {};
        if (typeof this.builtinOverrides !== 'object' || this.builtinOverrides === null) {
          this.builtinOverrides = {};
        }
      } else {
        this.builtinOverrides = {};
      }
    } catch (e) {
      this.builtinOverrides = {};
    }
  },

  saveToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.customPresets));
        localStorage.setItem(this.OVERRIDE_KEY, JSON.stringify(this.builtinOverrides));
      }
    } catch (e) {
      console.error('Failed to save presets to storage:', e);
    }
  },

  saveCustomPresets() {
    return this.saveToStorage();
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
    return this.getAllPresets().find(p => p.id === id || p.key === id);
  },

  addCustomPreset(preset) {
    if (!preset.id) {
      preset.id = preset.key || ('custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    }
    if (!preset.key) {
      preset.key = preset.id;
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
    const customIndex = this.customPresets.findIndex(p => p.id === id || p.key === id);
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
    State.sectionFills = {};
    State.selectedSectionId = null;
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.OVERRIDE_KEY);
    } catch (_) { }
    this.renderPresetGrid();
  },

  captureCurrentStudioConfig() {
    return {
      N: State.N,
      r: State.r,
      boundaryRadius: State.boundaryRadius,
      auraScale: State.auraScale !== undefined ? State.auraScale : 1.95,
      auraExpansionMaxSize: State.auraExpansionMaxSize !== undefined ? State.auraExpansionMaxSize : 20.0,
      auraExpansionSpeed: State.auraExpansionSpeed !== undefined ? State.auraExpansionSpeed : 1.0,
      rainbowWaveSpeed: State.rainbowWaveSpeed !== undefined ? State.rainbowWaveSpeed : 1.0,
      bodyOpacity: State.bodyOpacity !== undefined ? State.bodyOpacity : 1.0,
      auraOpacity: State.auraOpacity !== undefined ? State.auraOpacity : 1.0,
      bodyAuraMix: State.bodyAuraMix,
      viewportMode: State.viewportMode,
      viewStyle: State.viewStyle,
      platonicFilter: State.platonicFilter,
      showAuraFlower: State.showAuraFlower,
      showActualFlower: State.showAuraFlower,
      showBodyCircles: State.showBodyCircles,
      showBaseCircles: State.showBodyCircles,
      showGuides: State.showGuides,
      showOuterRing: State.showOuterRing,
      showBoundaryPetals: State.showBoundaryPetals,
      showCenterDots: State.showCenterDots,
      showIntersections: State.showIntersections,
      showRadialAxes: State.showRadialAxes,
      showMetatronLines: State.showMetatronLines,
      showEyesOfKryst: false,
      sphericalShading: State.sphericalShading,
      fillOpacity: State.fillOpacity,
      colorLife: State.colorLife,
      colorKryst: State.colorKryst,
      colorBody: State.colorBody,
      colorBase: State.colorBody,
      colorTriangle: State.colorTriangle || '#eab308',
      colorGuide: State.colorGuide,
      colorOuter: State.colorOuter,
      colorAxes: State.colorAxes,
      colorIntersection: State.colorIntersection || '#ec4899',
      strokeAura: State.strokeAura,
      strokeFlower: State.strokeAura,
      strokeBody: State.strokeBody,
      strokeBase: State.strokeBody,
      strokeGuide: State.strokeGuide,
      colorByLayer: State.colorByLayer,
      enableGlow: State.enableGlow,
      enablePulse: State.enablePulse,
      dimension: State.dimension,
      fccPlaneFilter: State.fccPlaneFilter,
      fccExpansionMode: State.fccExpansionMode,
      show3DSpheres: State.show3DSpheres,
      show3DTorus: State.show3DTorus,
      show3DShells: State.show3DShells,
      show3DGuides: State.show3DGuides,
      activePattern: State.activePattern || 'kryst',
      highlightedIds: Array.from(State.highlightedIds || []),
      selectedSectionIds: Array.from(State.selectedSectionIds || []),
      highlightedSectionIds: Array.from(State.highlightedSectionIds || []),
      disabledCircleIds: Array.from(State.disabledCircleIds || []),
      coloredShapesMap: Array.from(State.coloredShapesMap ? State.coloredShapesMap.entries() : []),
      sectionFills: { ...(State.sectionFills || {}) },
      sectionHighlightMode: Boolean(State.sectionHighlightMode)
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
    if (window.UI?.showToast) {
      window.UI.showToast('Presets exported to JSON.');
    }
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
      if (window.UI?.showToast) {
        window.UI.showToast(`Imported ${importedCount} preset(s).`);
      }
      return true;
    } catch (err) {
      console.error('Import error:', err);
      if (window.UI?.showToast) {
        window.UI.showToast('Invalid preset JSON format.', 4000);
      }
      return false;
    }
  },

  renderPresetGrid() {
    if (typeof document === 'undefined') return;
    const grid = document.getElementById('presetGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const allPresets = this.getAllPresets();
    if (allPresets.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 18px 12px; text-align: center; color: var(--text-faint); font-size: 0.78rem; border: 1px dashed var(--bg-panel-border); border-radius: var(--radius-sm);">
          No saved presets yet.<br/>
          Select circles or sections in the view, then click <strong>Save Preset</strong> (e.g. Pyramid, Dove, Shield, Pinecone, Face).
        </div>
      `;
      return;
    }

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
            <button class="preset-action-btn edit-preset-btn" title="Edit Preset" aria-label="Edit preset ${preset.title}" data-preset="${preset.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
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

      // Main chip click activates preset
      chip.addEventListener('click', (e) => {
        if (e.target.closest('.preset-action-btn')) return;
        if (window.UI?.applyPreset) window.UI.applyPreset(preset.id);
      });

      // Keyboard accessible selection
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target.closest('.preset-action-btn')) return;
          e.preventDefault();
          if (window.UI?.applyPreset) window.UI.applyPreset(preset.id);
        }
      });

      // Edit action
      const editBtn = chip.querySelector('.edit-preset-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          PresetDialog.openEdit(preset.id);
        });
      }

      // Delete action
      const deleteBtn = chip.querySelector('.delete-preset-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Delete custom preset "${preset.title}"?`)) {
            PresetsManager.deletePreset(preset.id);
            if (window.UI?.showToast) window.UI.showToast(`Preset "${preset.title}" deleted.`);
            if (State.activePreset === preset.id) {
              State.activePreset = null;
            }
          }
        });
      }

      // Revert action
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

/* =========================================================================
   PRESET DIALOG CONTROLLER (MODAL)
   ========================================================================= */
const PresetDialog = {
  currentEditingId: null,
  _capturedConfigOverride: null,

  openNew() {
    this.currentEditingId = null;
    this._capturedConfigOverride = null;
    const modalTitle = document.getElementById('presetModalTitle');
    const inputName = document.getElementById('presetInputName');
    const inputSubtitle = document.getElementById('presetInputSubtitle');
    const modal = document.getElementById('presetConfigModal');
    const statusText = document.getElementById('labelPresetCaptureStatus');
    if (statusText) statusText.style.display = 'none';

    if (modalTitle) modalTitle.textContent = 'Create New Sacred Preset';
    if (inputName) inputName.value = `Sacred Grid ${PresetsManager.getAllPresets().length + 1}`;
    if (inputSubtitle) inputSubtitle.value = `Custom N=${State.N} (${State.viewportMode})`;

    if (modal) modal.classList.add('open');
  },

  openEdit(presetId) {
    const preset = PresetsManager.getPreset(presetId);
    if (!preset) return;
    this.currentEditingId = presetId;
    this._capturedConfigOverride = null;

    const modalTitle = document.getElementById('presetModalTitle');
    const inputName = document.getElementById('presetInputName');
    const inputSubtitle = document.getElementById('presetInputSubtitle');
    const modal = document.getElementById('presetConfigModal');
    const statusText = document.getElementById('labelPresetCaptureStatus');
    if (statusText) statusText.style.display = 'none';

    if (modalTitle) modalTitle.textContent = `Edit Preset: ${preset.title}`;
    if (inputName) inputName.value = preset.title;
    if (inputSubtitle) inputSubtitle.value = preset.subtitle || '';

    if (modal) modal.classList.add('open');
  },

  captureCurrentCanvas() {
    this._capturedConfigOverride = PresetsManager.captureCurrentStudioConfig();
    const statusText = document.getElementById('labelPresetCaptureStatus');
    if (statusText) statusText.style.display = 'block';
  },

  populateFormFromConfig(cfg) {
    const N = clampNumber(cfg.N, 1, 42, State.N);
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
    if (elViewStyle) {
      let vs = cfg.viewStyle || State.viewStyle || 'aura';
      if (vs === 'actual') vs = 'aura';
      if (vs === 'base') vs = 'body';
      elViewStyle.value = vs;
    }

    const showAura = cfg.showAuraFlower ?? cfg.showActualFlower ?? State.showAuraFlower;
    const showBody = cfg.showBodyCircles ?? cfg.showBaseCircles ?? State.showBodyCircles;

    const checkMap = [
      { id: 'presetFormShowAura', val: showAura },
      { id: 'presetFormShowActual', val: showAura },
      { id: 'presetFormShowBody', val: showBody },
      { id: 'presetFormShowBase', val: showBody },
      { id: 'presetFormShowGuides', val: cfg.showGuides ?? State.showGuides },
      { id: 'presetFormShowOuterRing', val: cfg.showOuterRing ?? State.showOuterRing },
      { id: 'presetFormShowBoundaryPetals', val: cfg.showBoundaryPetals ?? State.showBoundaryPetals },
      { id: 'presetFormShowCenterDots', val: cfg.showCenterDots ?? State.showCenterDots },
      { id: 'presetFormShowIntersections', val: cfg.showIntersections ?? State.showIntersections },
      { id: 'presetFormShowRadialAxes', val: cfg.showRadialAxes ?? State.showRadialAxes },
      { id: 'presetFormShowMetatron', val: cfg.showMetatronLines ?? State.showMetatronLines },
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
    const elN = document.getElementById('presetFormN');
    const elR = document.getElementById('presetFormR');

    const formViewStyle = document.getElementById('presetFormViewStyle')?.value || 'aura';
    const effectiveViewStyle = formViewStyle === 'actual' ? 'aura' : (formViewStyle === 'base' ? 'body' : formViewStyle);

    const isAuraChecked = Boolean(document.getElementById('presetFormShowAura')?.checked || document.getElementById('presetFormShowActual')?.checked);
    const isBodyChecked = Boolean(document.getElementById('presetFormShowBody')?.checked || document.getElementById('presetFormShowBase')?.checked);

    return {
      N: clampNumber(elN?.value, 1, 42, 2),
      r: clampNumber(elR?.value, 15, 200, 50),
      viewportMode: document.getElementById('presetFormViewport')?.value || 'comparison',
      viewStyle: effectiveViewStyle,
      showAuraFlower: isAuraChecked,
      showActualFlower: isAuraChecked,
      showBodyCircles: isBodyChecked,
      showBaseCircles: isBodyChecked,
      showGuides: Boolean(document.getElementById('presetFormShowGuides')?.checked),
      showOuterRing: Boolean(document.getElementById('presetFormShowOuterRing')?.checked),
      showBoundaryPetals: Boolean(document.getElementById('presetFormShowBoundaryPetals')?.checked),
      showCenterDots: Boolean(document.getElementById('presetFormShowCenterDots')?.checked),
      showIntersections: Boolean(document.getElementById('presetFormShowIntersections')?.checked),
      showRadialAxes: Boolean(document.getElementById('presetFormShowRadialAxes')?.checked),
      showMetatronLines: Boolean(document.getElementById('presetFormShowMetatron')?.checked),
      showEyesOfKryst: false,
      platonicFilter: document.getElementById('presetFormPlatonic')?.value || 'all',
      sphericalShading: Boolean(document.getElementById('presetFormShading')?.checked),
      fillOpacity: State.fillOpacity,
      colorLife: State.colorLife,
      colorKryst: State.colorKryst,
      colorBody: State.colorBody,
      colorBase: State.colorBody,
      colorTriangle: State.colorTriangle || '#eab308',
      colorGuide: State.colorGuide,
      colorOuter: State.colorOuter,
      colorAxes: State.colorAxes,
      colorIntersection: State.colorIntersection || '#ec4899',
      strokeAura: State.strokeAura,
      strokeFlower: State.strokeAura,
      strokeBody: State.strokeBody,
      strokeBase: State.strokeBody,
      strokeGuide: State.strokeGuide,
      auraScale: State.auraScale !== undefined ? State.auraScale : 1.95,
      auraExpansionMaxSize: State.auraExpansionMaxSize !== undefined ? State.auraExpansionMaxSize : 20.0,
      auraExpansionSpeed: State.auraExpansionSpeed !== undefined ? State.auraExpansionSpeed : 1.0,
      rainbowWaveSpeed: State.rainbowWaveSpeed !== undefined ? State.rainbowWaveSpeed : 1.0,
      activePattern: State.activePattern || 'kryst',
      highlightedIds: Array.from(State.highlightedIds || []),
      selectedSectionIds: Array.from(State.selectedSectionIds || []),
      highlightedSectionIds: Array.from(State.highlightedSectionIds || []),
      disabledCircleIds: Array.from(State.disabledCircleIds || []),
      coloredShapesMap: Array.from(State.coloredShapesMap ? State.coloredShapesMap.entries() : []),
      sectionFills: { ...(State.sectionFills || {}) },
      sectionHighlightMode: Boolean(State.sectionHighlightMode)
    };
  },

  save() {
    const inputName = document.getElementById('presetInputName');
    const inputSubtitle = document.getElementById('presetInputSubtitle');
    const title = (inputName?.value || '').trim() || 'Untitled Preset';
    const subtitle = (inputSubtitle?.value || '').trim() || '';
    const preset = this.currentEditingId ? PresetsManager.getPreset(this.currentEditingId) : null;
    const config = this._capturedConfigOverride || (preset ? preset.config : PresetsManager.captureCurrentStudioConfig());
    const highlightCount = (State.highlightedIds?.size || 0) +
      Object.keys(State.sectionFills || {}).length +
      (State.selectedSectionIds?.size || 0);

    if (this.currentEditingId) {
      PresetsManager.updatePreset(this.currentEditingId, {
        title,
        subtitle,
        config,
        highlightCount
      });
      if (window.UI?.showToast) window.UI.showToast(`Preset "${title}" updated.`);
      if (State.activePreset === this.currentEditingId && window.UI?.applyPreset) {
        window.UI.applyPreset(this.currentEditingId);
      }
    } else {
      const newPreset = PresetsManager.addCustomPreset({
        title,
        subtitle,
        config,
        highlightCount
      });
      if (window.UI?.showToast) window.UI.showToast(`Preset "${title}" created.`);
      if (window.UI?.applyPreset) window.UI.applyPreset(newPreset.id);
    }
    this._capturedConfigOverride = null;
    const modal = document.getElementById('presetConfigModal');
    if (modal) modal.classList.remove('open');
  },

  init() {
    if (typeof document === 'undefined') return;
    const closeBtn = document.getElementById('closePresetConfigModalBtn');
    const cancelBtn = document.getElementById('btnCancelPresetConfig');
    const saveBtn = document.getElementById('btnSavePresetConfig');
    const captureBtn = document.getElementById('btnPresetCaptureCurrentCanvas');
    const modal = document.getElementById('presetConfigModal');

    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    if (cancelBtn && modal) cancelBtn.addEventListener('click', () => modal.classList.remove('open'));
    if (saveBtn) saveBtn.addEventListener('click', () => this.save());
    if (captureBtn) captureBtn.addEventListener('click', () => this.captureCurrentCanvas());
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

export { State, LayerColors, Spectral12Colors, PresetsManager, PresetDialog, clampNumber };
export default State;
