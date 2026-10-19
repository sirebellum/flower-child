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
  viewportMode: 'comparison', // 'comparison' | 'superimposed' | 'single-life' | 'single-kryst'
  activePreset: 'krystonial_comparison',
  // View style: 'aura' | 'body' | 'combined' (aliases 'actual' -> 'aura', 'base' -> 'body')
  _viewStyle: 'aura',
  get viewStyle() { return this._viewStyle; },
  set viewStyle(v) {
    if (v === 'actual') this._viewStyle = 'aura';
    else if (v === 'base') this._viewStyle = 'body';
    else this._viewStyle = v;
  },
  platonicFilter: 'all', // 'all' | 'tetra' | 'cube' | 'octa' | 'dodeca'

  // Lattice Geometry (guarded with safe limits)
  N: 2,
  r: 50,
  syncPanZoom: true,

  // Layers visibility (Nomenclature: aura = actual flowers, body = base pattern)
  showAuraFlower: true,
  get showActualFlower() { return this.showAuraFlower; },
  set showActualFlower(v) { this.showAuraFlower = Boolean(v); },

  showBodyCircles: false,
  get showBaseCircles() { return this.showBodyCircles; },
  set showBaseCircles(v) { this.showBodyCircles = Boolean(v); },

  showGuides: false,
  showOuterRing: false,
  showBoundaryPetals: false,
  showCenterDots: false,
  showIntersections: false,
  showRadialAxes: false,
  showMetatronLines: false,
  showEyesOfKryst: false,

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
  strokeGuide: 2.0,
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

  // 3D WebGL Engine States
  dimension: '2d', // '2d' | '3d'
  model3D: 'triaxial', // 'triaxial' (90° Rotated Axis & Infill) | 'fcc' (Face-Centered Cubic)
  triaxialInfill: 'both', // 'both' | 'angular' | 'grid' | 'planes'
  infillSteps: 2, // 1 to 4
  showPlaneXY: true,
  showPlaneXZ: true,
  showPlaneYZ: true,
  showInfill3D: true,
  showAxialRims: true,
  fccPlaneFilter: 'all', // 'all' | 'A' | 'B' | 'C'
  fccExpansionMode: 'volumetric', // 'volumetric' | 'stratified'
  show3DSpheres: true,
  show3DTorus: false,
  show3DShells: false,
  show3DGuides: true,
  showZeroPointMarker: true,
  sliceZ: 100, // -100 to 100 (%)
  autoRotate3D: false,
  sphereOpacity: 0.35, // Translucent spheres by default
  sphereRoughness: 0.15,
  sphereMetalness: 0.1,
  cameraPreset3D: 'isometric',

  /**
   * Clamps and sets layer count N safely.
   * @param {number} n
   */
  setN(n) {
    this.N = clampNumber(n, 1, 42, 2);
  },

  /**
   * Clamps and sets base circle radius r safely.
   * @param {number} radius
   */
  setRadius(radius) {
    this.r = clampNumber(radius, 15, 200, 50);
  },

  clampNumber(val, min, max, defaultVal) {
    return clampNumber(val, min, max, defaultVal);
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

/* =========================================================================
   PRESETS CONFIGURATION ENGINE & MANAGER
   ========================================================================= */
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
        N: 2,
        r: 50,
        viewportMode: 'comparison',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: false,
        showOuterRing: false,
        showBoundaryPetals: false,
        showCenterDots: false,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        colorKryst: '#10b981',
        fillOpacity: 0.04
      }
    },
    {
      id: 'superimposed_divergence',
      title: 'Phase Divergence',
      subtitle: 'FoL vs FoK Superimposed',
      isBuiltin: true,
      config: {
        N: 2,
        r: 50,
        viewportMode: 'superimposed',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: true,
        showOuterRing: true,
        showBoundaryPetals: true,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: true,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'seed_of_life',
      title: 'Seed of Life',
      subtitle: 'N=1 Genesis Core (7 Circles)',
      isBuiltin: true,
      config: {
        N: 1,
        r: 50,
        viewportMode: 'single-life',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: false,
        showOuterRing: true,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'egg_of_life',
      title: 'Egg of Life',
      subtitle: 'Spherical Volumetric Tangent',
      isBuiltin: true,
      config: {
        N: 1,
        r: 50,
        viewportMode: 'single-life',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: true,
        showGuides: false,
        showOuterRing: false,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: true,
        showEyesOfKryst: false,
        fillOpacity: 0.12
      }
    },
    {
      id: 'fruit_of_life',
      title: 'Fruit of Life',
      subtitle: '13 Tangent Circles (Radius r)',
      isBuiltin: true,
      config: {
        N: 2,
        r: 50,
        viewportMode: 'single-life',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: false,
        showBaseCircles: true,
        showGuides: false,
        showOuterRing: true,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'metatrons_cube',
      title: "Metatron's Cube",
      subtitle: '13 Centers + 78 Chords',
      isBuiltin: true,
      config: {
        N: 2,
        r: 50,
        viewportMode: 'single-life',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: false,
        showBaseCircles: true,
        showGuides: false,
        showOuterRing: true,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: true,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'kryst_seed',
      title: 'Kryst Seed',
      subtitle: '6-Petal Zero-Point Core',
      isBuiltin: true,
      config: {
        N: 1,
        r: 50,
        viewportMode: 'single-kryst',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: true,
        showOuterRing: true,
        showBoundaryPetals: true,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'kryst_18_standard',
      title: 'Kryst 18-Standard',
      subtitle: 'True Circle Ring 2 (N=2)',
      isBuiltin: true,
      config: {
        N: 2,
        r: 50,
        viewportMode: 'single-kryst',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: true,
        showOuterRing: true,
        showBoundaryPetals: true,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'fruit_of_kryst',
      title: 'Fruit of Kryst',
      subtitle: '30 Circles (6+12+12) Scalloped 12-Lobe',
      isBuiltin: true,
      config: {
        N: 3,
        r: 50,
        viewportMode: 'single-kryst',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: false,
        showOuterRing: false,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        colorKryst: '#10b981',
        fillOpacity: 0.05
      }
    },
    {
      id: 'word_of_kryst',
      title: 'Word of Kryst',
      subtitle: '7-Cluster Tiled Stamp Lattice (N=4)',
      isBuiltin: true,
      config: {
        N: 4,
        r: 50,
        viewportMode: 'single-kryst',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: false,
        showOuterRing: true,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        colorKryst: '#16a34a',
        fillOpacity: 0.05
      }
    },
    {
      id: 'water_of_kryst',
      title: 'Water of Kryst',
      subtitle: '19-Cluster Tiled Stamp Lattice (N=5)',
      isBuiltin: true,
      config: {
        N: 5,
        r: 50,
        viewportMode: 'single-kryst',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: false,
        showOuterRing: true,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        colorKryst: '#16a34a',
        fillOpacity: 0.05
      }
    },
    {
      id: 'vesica_piscis',
      title: 'Vesica Piscis',
      subtitle: 'Dual Circle (√3 Ratio)',
      isBuiltin: true,
      config: {
        N: 1,
        r: 50,
        viewportMode: 'single-life',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: true,
        showGuides: false,
        showOuterRing: false,
        showBoundaryPetals: false,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: false,
        showMetatronLines: false,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'kathara_alignment',
      title: 'Kathara 12-Tree',
      subtitle: '12-Point Morphic Grid',
      isBuiltin: true,
      config: {
        N: 3,
        r: 50,
        viewportMode: 'comparison',
        viewStyle: 'aura',
        platonicFilter: 'all',
        showActualFlower: true,
        showBaseCircles: false,
        showGuides: true,
        showOuterRing: true,
        showBoundaryPetals: true,
        showCenterDots: true,
        showIntersections: false,
        showRadialAxes: true,
        showMetatronLines: true,
        sphericalShading: false,
        showEyesOfKryst: false,
        fillOpacity: 0.04
      }
    },
    {
      id: 'fcc_vector_equilibrium',
      title: '3D Vector Equilibrium',
      subtitle: '13-Sphere Cuboctahedron (FoL K=1 vs FoK N=1)',
      isBuiltin: true,
      config: {
        dimension: '3d',
        N: 1,
        r: 50,
        viewportMode: 'comparison',
        fccExpansionMode: 'volumetric',
        fccPlaneFilter: 'all',
        show3DSpheres: true,
        show3DGuides: true,
        showZeroPointMarker: true,
        sliceZ: 100,
        fillOpacity: 0.04
      }
    },
    {
      id: 'fcc_kryst_matrix_3d',
      title: '3D Kryst Void Matrix',
      subtitle: 'Hollow Zero-Point Core FCC Packing (N=2)',
      isBuiltin: true,
      config: {
        dimension: '3d',
        N: 2,
        r: 50,
        viewportMode: 'comparison',
        fccExpansionMode: 'volumetric',
        fccPlaneFilter: 'all',
        show3DSpheres: true,
        show3DGuides: true,
        showZeroPointMarker: true,
        sliceZ: 100,
        fillOpacity: 0.04
      }
    },
    {
      id: 'fcc_cleavage_slice',
      title: 'FCC (111) Slicer',
      subtitle: 'Cross-Section Revealing ABC Layer Pockets',
      isBuiltin: true,
      config: {
        dimension: '3d',
        N: 2,
        r: 50,
        viewportMode: 'comparison',
        fccExpansionMode: 'volumetric',
        fccPlaneFilter: 'all',
        show3DSpheres: true,
        show3DGuides: true,
        showZeroPointMarker: true,
        sliceZ: 20,
        fillOpacity: 0.04
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
    } catch (e) {
      console.warn('Failed to load custom presets from storage:', e);
      this.customPresets = [];
    }
    try {
      const overrides = localStorage.getItem(this.OVERRIDE_KEY);
      this.builtinOverrides = overrides ? JSON.parse(overrides) : {};
      if (typeof this.builtinOverrides !== 'object' || this.builtinOverrides === null) {
        this.builtinOverrides = {};
      }
    } catch (e) {
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
      showZeroPointMarker: State.showZeroPointMarker,
      sliceZ: State.sliceZ,
      sphereOpacity: State.sphereOpacity,
      sphereRoughness: State.sphereRoughness,
      sphereMetalness: State.sphereMetalness
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
              if (window.UI?.applyPreset) window.UI.applyPreset('krystonial_comparison');
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

export { State, LayerColors, PresetsManager, PresetDialog, clampNumber };
export default State;
