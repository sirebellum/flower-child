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
      this.activePointerId = e.pointerId;
    });

    this.wrapper.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      if (Math.hypot(dx, dy) > 4) {
        if (!this.hasMoved) {
          this.hasMoved = true;
          try {
            if (this.activePointerId !== null && this.activePointerId !== undefined && this.wrapper.setPointerCapture) {
              this.wrapper.setPointerCapture(this.activePointerId);
            }
          } catch (_) { }
        }
      }
      if (!this.hasMoved) return;

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
          const pid = (e && e.pointerId !== undefined) ? e.pointerId : this.activePointerId;
          if (pid !== null && pid !== undefined && this.wrapper.hasPointerCapture && this.wrapper.hasPointerCapture(pid)) {
            this.wrapper.releasePointerCapture(pid);
          }
        } catch (_) { }
        this.activePointerId = null;
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
   ONBOARDING TUTORIAL TOUR CONTROLLER
   ========================================================================= */
const TutorialManager = {
  currentStep: 0,
  _eventsBound: false,
  steps: [
    {
      target: null, // Full screen welcome
      title: 'Welcome to Sacred Studio',
      desc: 'Explore the living mathematics of Flower of Kryst and Flower of Life.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>`
    },
    {
      target: '#patternSwitcher',
      title: 'Pattern Engines',
      desc: 'Switch instantly between Flower of Kryst and Flower of Life.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><circle cx="12" cy="12" r="9"/><polygon points="12 5 19 12 12 19 5 12"/></svg>`
    },
    {
      target: '#viewportContainer',
      title: 'Interactive Canvas',
      desc: 'Drag to pan, scroll to zoom, and click circles or lenses to inspect.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/><path d="m15 15 3 3"/></svg>`
    },
    {
      target: '#sectionGeometry',
      title: 'Radius & Aura Size',
      desc: 'Adjust circle radius and smoothly scale expanded aura petals from 0r to 20r.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><circle cx="12" cy="12" r="10"/><path d="M12 8a4 4 0 1 0 4 4"/></svg>`
    },
    {
      target: '#sectionSacredGadgets',
      title: 'Sacred Gadgets',
      desc: 'Run concurrent animations: Aura Expansion, Rainbow Wave, and Breathing.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
    },
    {
      target: '#presetGrid',
      title: 'Shape Presets',
      desc: 'Save custom highlights and click the pencil icon on any preset to edit.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
    },
    {
      target: '#bottomLayerToolbar',
      title: 'Layer Toolbar',
      desc: 'Blend Body and Aura opacities and toggle intersection highlight mode.',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;max-width:22px;max-height:22px;display:block;"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>`
    }
  ],

  start() {
    this.currentStep = 0;
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('tutorialTourOverlay');
    if (!overlay) return;
    overlay.style.display = 'block';
    this.bindEvents();
    this.renderStep();
  },

  close() {
    if (typeof document !== 'undefined') {
      const overlay = document.getElementById('tutorialTourOverlay');
      if (overlay) overlay.style.display = 'none';
      const backdrop = document.getElementById('tutorialBackdrop');
      if (backdrop) {
        backdrop.style.clipPath = 'none';
        backdrop.style.webkitClipPath = 'none';
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sacred_geometry_tutorial_completed', 'true');
    }
  },

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.close();
      if (typeof window !== 'undefined' && window.UI?.showToast) {
        window.UI.showToast('Tour completed! Click "Tour" in the top bar to restart anytime.');
      }
    }
  },

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  },

  goTo(index) {
    if (index >= 0 && index < this.steps.length) {
      this.currentStep = index;
      this.renderStep();
    }
  },

  renderStep() {
    if (typeof document === 'undefined') return;
    const step = this.steps[this.currentStep];
    const card = document.getElementById('tutorialCard');
    const spotlight = document.getElementById('tutorialSpotlight');
    const backdrop = document.getElementById('tutorialBackdrop');
    const badge = document.getElementById('tutorialStepBadge');
    const title = document.getElementById('tutorialTitle');
    const desc = document.getElementById('tutorialDesc');
    const iconBox = document.getElementById('tutorialIconBox');
    const nextBtn = document.getElementById('btnTutorialNext');
    const prevBtn = document.getElementById('btnTutorialPrev');
    const dotsContainer = document.getElementById('tutorialDots');

    if (!card) return;

    if (badge) badge.textContent = `Step ${this.currentStep + 1} of ${this.steps.length}`;
    if (title) title.textContent = step.title;
    if (desc) desc.textContent = step.desc;
    if (iconBox) iconBox.innerHTML = step.icon;

    if (prevBtn) {
      prevBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';
    }
    if (nextBtn) {
      nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Get Started' : 'Next';
    }

    // Render Dots
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      this.steps.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.className = `tutorial-dot ${idx === this.currentStep ? 'active' : ''}`;
        dot.title = `Step ${idx + 1}: ${this.steps[idx].title}`;
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.goTo(idx);
        });
        dotsContainer.appendChild(dot);
      });
    }

    // Ensure curtain elements exist inside backdrop
    let curtainTop = document.getElementById('tutorialCurtainTop');
    let curtainBottom = document.getElementById('tutorialCurtainBottom');
    let curtainLeft = document.getElementById('tutorialCurtainLeft');
    let curtainRight = document.getElementById('tutorialCurtainRight');

    if (backdrop) {
      backdrop.style.clipPath = 'none';
      backdrop.style.webkitClipPath = 'none';
      backdrop.style.background = 'transparent';
      backdrop.style.pointerEvents = 'none';
      if (!curtainTop || !curtainBottom || !curtainLeft || !curtainRight) {
        backdrop.innerHTML = `
          <div class="tutorial-curtain tutorial-curtain-top" id="tutorialCurtainTop"></div>
          <div class="tutorial-curtain tutorial-curtain-bottom" id="tutorialCurtainBottom"></div>
          <div class="tutorial-curtain tutorial-curtain-left" id="tutorialCurtainLeft"></div>
          <div class="tutorial-curtain tutorial-curtain-right" id="tutorialCurtainRight"></div>
        `;
        curtainTop = document.getElementById('tutorialCurtainTop');
        curtainBottom = document.getElementById('tutorialCurtainBottom');
        curtainLeft = document.getElementById('tutorialCurtainLeft');
        curtainRight = document.getElementById('tutorialCurtainRight');
      }
    }

    const cardWidth = 420;
    const cardHeight = 220;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    card.style.pointerEvents = 'auto';

    // Position Card & Spotlight
    if (step.target) {
      const targetEl = document.querySelector(step.target);
      if (targetEl) {
        // Ensure sidebar is uncollapsed if target is inside sidebar
        const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
        if (sidebar && sidebar.contains(targetEl) && sidebar.classList.contains('collapsed')) {
          sidebar.classList.remove('collapsed');
        }

        // Ensure parent accordion is open if inside a panel-section
        const parentSection = targetEl.closest('.panel-section');
        if (parentSection && !parentSection.classList.contains('open')) {
          parentSection.classList.add('open');
        }

        const sidebarContent = targetEl.closest('.sidebar-content');
        if (sidebarContent && sidebarContent.contains(targetEl)) {
          const targetOffsetTop = targetEl.offsetTop;
          sidebarContent.scrollTo({ top: Math.max(0, targetOffsetTop - 20), behavior: 'auto' });
        }

        const rect = targetEl.getBoundingClientRect();

        let spotTop = Math.max(10, rect.top - 6);
        let spotLeft = Math.max(10, rect.left - 6);
        let spotWidth = Math.min(viewportW - spotLeft - 20, rect.width + 12);
        let spotHeight = Math.min(viewportH - spotTop - 20, rect.height + 12);

        if (step.target === '#viewportContainer') {
          // Bounded canvas spotlight rather than taking over the entire screen
          const canvasW = Math.min(rect.width - 60, 680);
          const canvasH = Math.min(rect.height - 60, 420);
          spotLeft = rect.left + Math.max(0, (rect.width - canvasW) / 2);
          spotTop = rect.top + Math.max(0, (rect.height - canvasH) / 2);
          spotWidth = canvasW;
          spotHeight = canvasH;
        }

        if (spotlight) {
          spotlight.style.display = 'block';
          spotlight.style.top = `${spotTop}px`;
          spotlight.style.left = `${spotLeft}px`;
          spotlight.style.width = `${spotWidth}px`;
          spotlight.style.height = `${spotHeight}px`;
        }

        // Position 4 surrounding curtains: leave the spotlight area 100% uncovered with zero blur
        if (curtainTop && curtainBottom && curtainLeft && curtainRight) {
          curtainTop.style.top = '0px';
          curtainTop.style.left = '0px';
          curtainTop.style.width = '100%';
          curtainTop.style.height = `${Math.max(0, spotTop)}px`;

          const bottomY = spotTop + spotHeight;
          curtainBottom.style.top = `${bottomY}px`;
          curtainBottom.style.left = '0px';
          curtainBottom.style.width = '100%';
          curtainBottom.style.height = `${Math.max(0, viewportH - bottomY)}px`;

          curtainLeft.style.top = `${spotTop}px`;
          curtainLeft.style.left = '0px';
          curtainLeft.style.width = `${Math.max(0, spotLeft)}px`;
          curtainLeft.style.height = `${spotHeight}px`;

          const rightX = spotLeft + spotWidth;
          curtainRight.style.top = `${spotTop}px`;
          curtainRight.style.left = `${rightX}px`;
          curtainRight.style.width = `${Math.max(0, viewportW - rightX)}px`;
          curtainRight.style.height = `${spotHeight}px`;
        }

        card.style.position = 'fixed';
        card.style.width = `${cardWidth}px`;

        let cardTop = spotTop + spotHeight + 14;
        let cardLeft = spotLeft + (spotWidth / 2) - (cardWidth / 2);

        // If target is in the right half of the screen (e.g. sidebar), place card to the left
        if (spotLeft > viewportW * 0.5) {
          cardLeft = Math.max(20, spotLeft - cardWidth - 18);
          cardTop = Math.max(20, Math.min(viewportH - cardHeight - 20, spotTop));
        } else if (spotTop + spotHeight > viewportH * 0.65 || cardTop + cardHeight > viewportH - 20) {
          // If target is in bottom half or card overflows bottom, place above
          cardTop = Math.max(20, spotTop - cardHeight - 14);
        }

        // Bounded within screen
        cardLeft = Math.max(16, Math.min(viewportW - cardWidth - 16, cardLeft));
        cardTop = Math.max(16, Math.min(viewportH - cardHeight - 16, cardTop));

        card.style.top = `${cardTop}px`;
        card.style.left = `${cardLeft}px`;
        card.style.transform = 'none';
        return;
      }
    }

    // Fallback or centered step (e.g. Welcome modal)
    if (spotlight) spotlight.style.display = 'none';
    if (curtainTop && curtainBottom && curtainLeft && curtainRight) {
      curtainTop.style.top = '0px';
      curtainTop.style.left = '0px';
      curtainTop.style.width = '100%';
      curtainTop.style.height = '100%';

      curtainBottom.style.top = '100%';
      curtainBottom.style.left = '0px';
      curtainBottom.style.width = '100%';
      curtainBottom.style.height = '0px';

      curtainLeft.style.top = '0px';
      curtainLeft.style.left = '0px';
      curtainLeft.style.width = '0px';
      curtainLeft.style.height = '0px';

      curtainRight.style.top = '0px';
      curtainRight.style.left = '100%';
      curtainRight.style.width = '0px';
      curtainRight.style.height = '0px';
    }

    card.style.position = 'fixed';
    card.style.width = '420px';
    card.style.top = '50%';
    card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%)';
  },

  bindEvents() {
    if (typeof document === 'undefined') return;
    if (this._eventsBound) return;
    this._eventsBound = true;

    document.getElementById('btnTutorialNext')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.next();
    });
    document.getElementById('btnTutorialPrev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.prev();
    });
    document.getElementById('btnTutorialSkip')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.close();
    });
    document.getElementById('btnTutorialClose')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.close();
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      const overlay = document.getElementById('tutorialTourOverlay');
      if (!overlay || overlay.style.display === 'none') return;

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        this.next();
      } else if (e.key === 'ArrowLeft') {
        this.prev();
      } else if (e.key === 'Escape') {
        this.close();
      }
    });

    // Smooth reposition on window resize or sidebar scroll
    window.addEventListener('resize', () => {
      const overlay = document.getElementById('tutorialTourOverlay');
      if (overlay && overlay.style.display !== 'none') {
        this.renderStep();
      }
    });

    document.querySelector('.sidebar-content')?.addEventListener('scroll', () => {
      const overlay = document.getElementById('tutorialTourOverlay');
      if (overlay && overlay.style.display !== 'none') {
        this.renderStep();
      }
    });
  }
};

/* =========================================================================
   UI CONTROLLER
   ========================================================================= */
const UI = {
  _toastTimer: null,
  activeRingNoteIndex: 1,

  init() {
    PresetsManager.init();
    PresetDialog.init();
    this.setDimension(State.dimension || '2d');
    this.initSliderFills();
    this.bindAccordions();
    this.bindDimensionTabs();
    this.bindPatternSwitcher();
    this.bindBoundaryControls();
    this.bindRemoveCirclesPopup();
    this.bindFaderBar();
    this.bindSliders();
    this.bindToggles();
    this.bind3DControls();
    this.bindColorPickers();
    this.bindSectionColorPicker();
    this.bindPainterControls();
    this.bindSacredGadgets();
    this.bindPresets();
    this.bindFloatingControls();
    this.bindModals();
    this.bindKeyboardShortcuts();
    this.initSvgEventDelegation();
    this.renderCustomPresets();
    this.updateSidebarStats();
    this.updateAllRangeSliderFills();
    this.initTutorial();
  },

  initSliderFills() {
    if (typeof document === 'undefined') return;
    this.updateAllRangeSliderFills();

    document.addEventListener('input', (e) => {
      if (e.target && e.target.type === 'range') {
        this.updateRangeSliderFill(e.target);
      }
    });
  },

  updateRangeSliderFill(slider) {
    if (!slider || slider.type !== 'range') return;
    const min = parseFloat(slider.min) !== undefined && !isNaN(parseFloat(slider.min)) ? parseFloat(slider.min) : 0;
    const max = parseFloat(slider.max) !== undefined && !isNaN(parseFloat(slider.max)) ? parseFloat(slider.max) : 100;
    const val = parseFloat(slider.value) !== undefined && !isNaN(parseFloat(slider.value)) ? parseFloat(slider.value) : min;
    const range = max - min;
    const pct = range > 0 ? Math.max(0, Math.min(100, ((val - min) / range) * 100)) : 0;
    slider.style.setProperty('--fill-pct', `${pct}%`);
  },

  updateAllRangeSliderFills() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      this.updateRangeSliderFill(slider);
    });
  },

  initTutorial() {
    const btnTour = document.getElementById('btnStartTutorial');
    if (btnTour) {
      btnTour.addEventListener('click', () => {
        TutorialManager.start();
      });
    }

    // Auto-launch on first startup
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('sacred_geometry_tutorial_completed')) {
      setTimeout(() => {
        TutorialManager.start();
      }, 750);
    }
  },

  openEditPreset(id) {
    if (typeof PresetDialog !== 'undefined' && PresetDialog.openEdit) {
      PresetDialog.openEdit(id);
    }
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
        // Mode A: Intersection Highlight Mode is Active
        if (State.sectionHighlightMode) {
          const sectionTarget = e.target.closest('[data-section-id]');
          if (sectionTarget) {
            e.stopPropagation();
            const sectionId = sectionTarget.dataset.sectionId;
            this.toggleSectionSelection(sectionId);
            return;
          }

          // In highlight mode, clicking empty canvas closes the color popup & clears section selection
          this.closeSectionColorPicker();
          return;
        }

        // Mode B: Clicking on an already colored section when mode is off allows editing color
        const coloredSectionTarget = e.target.closest('.aura-intersection-section.colored-section');
        if (coloredSectionTarget) {
          e.stopPropagation();
          const sectionId = coloredSectionTarget.dataset.sectionId;
          this.toggleSectionSelection(sectionId, true);
          return;
        }

        const target = e.target.closest('[data-circle-id]');

        // Mode C: Standard circle or center dot click (only when NOT in section highlight mode)
        if (target) {
          e.stopPropagation();
          const circleId = target.dataset.circleId;

          // Mode C1: Painter of Life Mode
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

          // Mode C2: Clicking a circle highlights / unhighlights it
          if (State.highlightedIds.has(circleId)) {
            State.highlightedIds.delete(circleId);
          } else {
            State.highlightedIds.add(circleId);
          }
          const svgIds = ['svgMain', 'svgKryst', 'svgLife'];
          svgIds.forEach(sid => {
            if (typeof SVGRenderer !== 'undefined' && SVGRenderer.updateHighlights) {
              SVGRenderer.updateHighlights(sid);
            }
          });
          this.updateSidebarStats();
          if (State.highlightedIds.size > 0) {
            this.showRemoveCirclesPopup(e.clientX, e.clientY);
          } else {
            this.hideRemoveCirclesPopup();
          }
          return;
        }

        // 3. Click on empty SVG background -> clear highlights & close popups
        this.closeSectionColorPicker();
        this.hideRemoveCirclesPopup();
        if (State.highlightedIds.size > 0) {
          State.highlightedIds.clear();
          SVGRenderer.updateHighlights(svg.id);
          this.updateSidebarStats();
        }
      });
    });

    // Also delegate on wrappers as safe fallback
    const wrapperIds = ['svgWrapperMain', 'svgWrapperKryst', 'svgWrapperLife'];
    wrapperIds.forEach(wid => {
      const wrapper = document.getElementById(wid);
      if (!wrapper) return;
      wrapper.addEventListener('click', (e) => {
        if (!State.sectionHighlightMode) return;
        const sectionTarget = e.target.closest('[data-section-id]');
        if (sectionTarget) {
          e.stopPropagation();
          const sectionId = sectionTarget.dataset.sectionId;
          this.toggleSectionSelection(sectionId);
        }
      });
    });
  },

  toggleSectionHighlightMode() {
    State.sectionHighlightMode = !State.sectionHighlightMode;
    document.body.classList.toggle('section-highlight-mode', State.sectionHighlightMode);

    const btn = document.getElementById('toggleSectionHighlightBtn');
    if (btn) btn.classList.toggle('active', State.sectionHighlightMode);

    const btnBottom = document.getElementById('btnBottomHighlightMode');
    if (btnBottom) btnBottom.classList.toggle('active', State.sectionHighlightMode);

    if (!State.sectionHighlightMode) {
      this.closeSectionColorPicker();
    } else {
      this.openSectionColorPicker();
    }

    this.showToast(State.sectionHighlightMode
      ? 'Intersection Highlight Mode: ON — Click any intersection section to color it'
      : 'Intersection Highlight Mode: OFF');

    App.renderAll();
  },

  bindSectionColorPicker() {
    const popup = document.getElementById('sectionColorPickerPopup');
    if (!popup) return;

    // Palette swatches
    popup.querySelectorAll('.color-swatch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const color = btn.dataset.color;
        this.applySectionColor(color);
      });
    });

    // Custom color input
    const customInput = document.getElementById('inputCustomSectionColor');
    if (customInput) {
      const handleCustom = (e) => {
        this.applySectionColor(e.target.value);
      };
      customInput.addEventListener('input', handleCustom);
      customInput.addEventListener('change', handleCustom);
    }

    // Clear fill button
    const btnClear = document.getElementById('btnClearSectionColor');
    if (btnClear) {
      btnClear.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applySectionColor(null);
      });
    }

    // Clear all highlights button
    const btnClearAll = document.getElementById('btnClearAllHighlights');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearAllHighlights();
      });
    }

    // Done / Deselect button
    const btnDeselect = document.getElementById('btnDeselectSections');
    if (btnDeselect) {
      btnDeselect.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeSectionColorPicker();
      });
    }

    // Close button
    const btnClose = document.getElementById('btnCloseColorPopup');
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeSectionColorPicker();
      });
    }

    // Click outside to close
    window.addEventListener('pointerdown', (e) => {
      if (popup.style.display !== 'none' &&
          !popup.contains(e.target) &&
          !e.target.closest('[data-section-id]') &&
          !e.target.closest('#toggleSectionHighlightBtn') &&
          !e.target.closest('#btnBottomHighlightMode') &&
          !e.target.closest('#btnBottomClearHighlights') &&
          !e.target.closest('#clearHighlightBtn')) {
        this.closeSectionColorPicker();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popup.style.display !== 'none') {
        this.closeSectionColorPicker();
      }
    });
  },

  toggleSectionSelection(sectionId, singleOnly = false) {
    if (!State.selectedSectionIds) State.selectedSectionIds = new Set();

    if (singleOnly) {
      State.selectedSectionIds.clear();
      State.selectedSectionIds.add(sectionId);
    } else {
      if (State.selectedSectionIds.has(sectionId)) {
        State.selectedSectionIds.delete(sectionId);
      } else {
        State.selectedSectionIds.add(sectionId);
      }
    }

    if (State.selectedSectionIds.size === 0) {
      this.closeSectionColorPicker();
    } else {
      this.openSectionColorPicker();
    }
  },

  updateSelectedSectionDOM() {
    const selectedSet = State.selectedSectionIds || new Set();
    document.querySelectorAll('.aura-intersection-section').forEach(el => {
      el.classList.toggle('selected-section', selectedSet.has(el.dataset.sectionId));
    });
  },

  openSectionColorPicker(sectionId = null) {
    if (sectionId) {
      if (!State.selectedSectionIds) State.selectedSectionIds = new Set();
      State.selectedSectionIds.add(sectionId);
    }

    const count = State.selectedSectionIds ? State.selectedSectionIds.size : 0;
    if (count === 0 && !State.sectionHighlightMode) {
      this.closeSectionColorPicker();
      return;
    }

    const popup = document.getElementById('sectionColorPickerPopup');
    if (!popup) return;

    // Apply selected-section class to highlight all selected intersections in all SVGs
    this.updateSelectedSectionDOM();

    // Update count badge in header
    const countBadge = document.getElementById('sectionColorCountBadge');
    if (countBadge) {
      countBadge.textContent = `${count} selected`;
    }

    // Popup is docked in the upper right of view pane via CSS layout
    popup.style.display = 'flex';

    // Highlight current section color if all selected sections share the same color
    let commonColor = null;
    let isUniform = true;
    for (const secId of State.selectedSectionIds) {
      const c = (State.sectionFills && State.sectionFills[secId]) || null;
      if (commonColor === null) {
        commonColor = c;
      } else if (commonColor !== c) {
        isUniform = false;
        break;
      }
    }

    popup.querySelectorAll('.color-swatch-btn').forEach(b => {
      const isMatch = Boolean(isUniform && commonColor && b.dataset.color.toLowerCase() === commonColor.toLowerCase());
      b.style.outline = isMatch ? '2px solid #fff' : 'none';
      b.style.outlineOffset = '2px';
    });

    const customInput = document.getElementById('inputCustomSectionColor');
    if (customInput && isUniform && commonColor && /^#[0-9a-fA-F]{6}$/.test(commonColor)) {
      customInput.value = commonColor;
    }
  },

  closeSectionColorPicker() {
    const popup = document.getElementById('sectionColorPickerPopup');
    if (popup) popup.style.display = 'none';
    if (State.selectedSectionIds) State.selectedSectionIds.clear();
    this.activeSectionId = null;
    document.querySelectorAll('.aura-intersection-section.selected-section').forEach(el => {
      el.classList.remove('selected-section');
    });
  },

  applySectionColor(color) {
    if (!State.selectedSectionIds || State.selectedSectionIds.size === 0) return;
    if (!State.sectionFills) State.sectionFills = {};

    const count = State.selectedSectionIds.size;
    State.selectedSectionIds.forEach(secId => {
      if (color) {
        State.sectionFills[secId] = color;
      } else {
        delete State.sectionFills[secId];
      }
    });

    if (color) {
      this.showToast(`Colored ${count} intersection section${count > 1 ? 's' : ''}: ${color}`);
    } else {
      this.showToast(`Cleared fill from ${count} intersection section${count > 1 ? 's' : ''}`);
    }

    // Unlink active preset so canvas edits do not overwrite the saved preset
    State.activePreset = null;
    if (typeof this.renderCustomPresets === 'function') this.renderCustomPresets();

    App.renderAll();
    // After re-rendering, maintain the selected-section class on newly created SVG DOM elements
    this.updateSelectedSectionDOM();

    // Update swatches outline
    const popup = document.getElementById('sectionColorPickerPopup');
    if (popup) {
      popup.querySelectorAll('.color-swatch-btn').forEach(b => {
        const isMatch = Boolean(color && b.dataset.color.toLowerCase() === color.toLowerCase());
        b.style.outline = isMatch ? '2px solid #fff' : 'none';
        b.style.outlineOffset = '2px';
      });
    }
  },

  /**
   * Clears all intersection colored section highlights, active section selections,
   * and highlighted circles, keeping highlight mode active.
   */
  clearAllHighlights() {
    if (typeof State !== 'undefined') {
      if (typeof State.clearAllHighlights === 'function') {
        State.clearAllHighlights();
      } else {
        State.sectionFills = {};
        if (State.selectedSectionIds) State.selectedSectionIds.clear();
        if (State.highlightedIds) State.highlightedIds.clear();
        if (State.highlightedSectionIds) State.highlightedSectionIds.clear();
      }
    }
    this.hideRemoveCirclesPopup();

    // Unlink active preset so canvas clear does not overwrite the saved preset
    State.activePreset = null;
    if (typeof this.renderCustomPresets === 'function') this.renderCustomPresets();

    if (typeof document !== 'undefined') {
      document.querySelectorAll('.aura-intersection-section.selected-section').forEach(el => {
        el.classList.remove('selected-section');
      });
      document.querySelectorAll('.highlighted-circle').forEach(el => {
        el.classList.remove('highlighted-circle');
      });

      const countBadge = document.getElementById('sectionColorCountBadge');
      if (countBadge) countBadge.textContent = '0 selected';

      const popup = document.getElementById('sectionColorPickerPopup');
      if (popup) {
        popup.querySelectorAll('.color-swatch-btn').forEach(b => {
          b.style.outline = 'none';
        });
      }
    }

    if (typeof SVGRenderer !== 'undefined' && SVGRenderer.updateHighlights) {
      ['svgMain', 'svgLife', 'svgKryst'].forEach(id => {
        if (typeof document !== 'undefined' && document.getElementById(id)) {
          SVGRenderer.updateHighlights(id);
        }
      });
    }

    if (typeof this.updateSidebarStats === 'function') {
      this.updateSidebarStats();
    }

    if (typeof App !== 'undefined' && App.renderAll) {
      App.renderAll();
    }

    if (typeof this.showToast === 'function') {
      this.showToast('Cleared all highlights and section colors.');
    }
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

    // Remove Circles Button: Removes all currently highlighted circles
    const btnRemove = document.getElementById('btnRemoveCircles') || document.getElementById('btnToggleRemoveCircles') || document.getElementById('btnPopupRemoveCircles');
    if (btnRemove) {
      btnRemove.addEventListener('click', () => {
        this.removeHighlightedCircles();
      });
    }

    // Restore All Removed Circles Button (alongside highlight mode at bottom)
    const btnRestore = document.getElementById('btnRestoreCircles');
    if (btnRestore) {
      btnRestore.addEventListener('click', () => {
        if (!State.disabledCircleIds || State.disabledCircleIds.size === 0) {
          this.showToast('No circles have been removed.');
          return;
        }
        State.disabledCircleIds.clear();
        this.hideRemoveCirclesPopup();
        this.updateSidebarStats();
        App.renderAll();
        this.showToast('All removed circles have been restored.');
      });
    }
  },

  bindRemoveCirclesPopup() {
    if (typeof document === 'undefined') return;
    const btnPopupRemove = document.getElementById('btnPopupRemoveCircles');
    if (btnPopupRemove) {
      btnPopupRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeHighlightedCircles();
      });
    }

    const btnClose = document.getElementById('btnCloseRemoveCirclesPopup');
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideRemoveCirclesPopup();
      });
    }
  },

  showRemoveCirclesPopup(clientX, clientY) {
    if (typeof document === 'undefined') return;
    const popup = document.getElementById('removeCirclesPopup');
    if (!popup) return;

    popup.style.display = 'inline-flex';

    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const popupWidth = popup.offsetWidth || 160;
      const popupHeight = popup.offsetHeight || 38;

      let left = clientX - (popupWidth / 2);
      let top = clientY - popupHeight - 14;

      const pad = 12;
      const winW = (typeof window !== 'undefined') ? window.innerWidth : 1200;
      left = Math.max(pad, Math.min(winW - popupWidth - pad, left));
      if (top < pad) {
        top = clientY + 24;
      }

      popup.style.left = `${Math.round(left)}px`;
      popup.style.top = `${Math.round(top)}px`;
    }
  },

  hideRemoveCirclesPopup() {
    if (typeof document === 'undefined') return;
    const popup = document.getElementById('removeCirclesPopup');
    if (popup) {
      popup.style.display = 'none';
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

    // Bottom bar Highlight Mode button
    document.getElementById('btnBottomHighlightMode')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleSectionHighlightMode();
    });

    // Bottom bar Clear All Highlights button
    document.getElementById('btnBottomClearHighlights')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.clearAllHighlights();
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
    if (sliderBody) {
      sliderBody.value = isBodyVisible ? bodyVal : 0;
      this.updateRangeSliderFill(sliderBody);
    }
    if (badgeBody) badgeBody.textContent = isBodyVisible ? `${bodyVal}%` : 'Off';

    const isAuraVisible = Boolean(State.showAuraFlower);
    const auraVal = Math.round((State.auraOpacity !== undefined ? State.auraOpacity : 1.0) * 100);
    if (checkAura) checkAura.checked = isAuraVisible;
    if (toggleAura) toggleAura.checked = isAuraVisible;
    if (sliderAura) {
      sliderAura.value = isAuraVisible ? auraVal : 0;
      this.updateRangeSliderFill(sliderAura);
    }
    if (badgeAura) badgeAura.textContent = isAuraVisible ? `${auraVal}%` : 'Off';

    const btnBottomHighlight = document.getElementById('btnBottomHighlightMode');
    if (btnBottomHighlight) {
      btnBottomHighlight.classList.toggle('active', !!State.sectionHighlightMode);
    }
    const btnFloatHighlight = document.getElementById('toggleSectionHighlightBtn');
    if (btnFloatHighlight) {
      btnFloatHighlight.classList.toggle('active', !!State.sectionHighlightMode);
    }
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
      auraScaleBadge.textContent = `${scale.toFixed(2)}r (${px}px)`;
    };

    if (radiusSlider && radiusBadge) {
      radiusSlider.value = State.r || 50;
      radiusBadge.textContent = `r = ${State.r}px`;
      radiusSlider.addEventListener('input', (e) => {
        State.setRadius(e.target.value);
        radiusBadge.textContent = `r = ${State.r}px`;
        updateAuraScaleLabel(State.auraScale !== undefined ? State.auraScale : 1.95);
        this.updateSidebarStats();
        App.renderAll();
      });
    }

    // Aura Scale Slider (0r to 20r in 0.01 increments)
    if (auraScaleSlider) {
      auraScaleSlider.value = State.auraScale !== undefined ? State.auraScale : 1.95;
      updateAuraScaleLabel(Number(auraScaleSlider.value));

      auraScaleSlider.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 0.0, 20.0, 1.95);
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
      { id: 'toggleGlow', prop: 'enableGlow' }
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

  _gadgetsRafId: null,
  _auraExpansionStartTime: 0,
  _rainbowStartTime: 0,
  _lastRainbowTime: 0,
  _rainbowPhase: 0,
  _auraCircleElements: null,
  _breathingStartTime: 0,

  /**
   * Sacred Gadgets: Real-time interactive animations that can overlay simultaneously:
   * 1. Aura Expansion: Progressively expands aura from 1.1r to 20r in 0.01 increments and recedes back
   * 2. Rainbow Aura Wave: Cycles aura petals through rainbow colors from center to outside
   * 3. Sacred Breathing: Breathes entire pattern from center up to max size (slider up to 2.0) and back to 1.0
   */
  bindSacredGadgets() {
    const toggleAuraExp = document.getElementById('toggleAuraExpansion');
    const cardAuraExp = document.getElementById('cardAuraExpansion');
    const sliderAuraExpMaxSize = document.getElementById('sliderAuraExpMaxSize');
    const badgeAuraExpMaxSize = document.getElementById('badgeAuraExpMaxSize');
    const sliderAuraExpSpeed = document.getElementById('sliderAuraExpSpeed');
    const badgeAuraExpSpeed = document.getElementById('badgeAuraExpSpeed');

    const toggleRainbow = document.getElementById('toggleRainbowAura');
    const cardRainbow = document.getElementById('cardRainbowAura');
    const sliderRainbowSpeed = document.getElementById('sliderRainbowSpeed');
    const badgeRainbowSpeed = document.getElementById('badgeRainbowSpeed');

    const toggleBreathing = document.getElementById('toggleBreathing');
    const cardBreathing = document.getElementById('cardBreathing');
    const sliderBreathingSize = document.getElementById('sliderBreathingSize');
    const badgeBreathingSize = document.getElementById('badgeBreathingSize');
    const sliderBreathingSpeed = document.getElementById('sliderBreathingSpeed');
    const badgeBreathingSpeed = document.getElementById('badgeBreathingSpeed');

    // 1. Aura Expansion Toggle (0r to max size up to 20r progressively, increments 0.01)
    if (toggleAuraExp) {
      toggleAuraExp.checked = Boolean(State.gadgetAuraExpansion);
      toggleAuraExp.addEventListener('change', (e) => {
        State.gadgetAuraExpansion = e.target.checked;
        cardAuraExp?.classList.toggle('active', State.gadgetAuraExpansion);
        if (State.gadgetAuraExpansion) {
          this._auraExpansionStartTime = performance.now();
          this.startSacredGadgetsLoop();
          this.showToast('Sacred Gadget: Aura Expansion ON (0r ↔ max)');
        } else {
          cardAuraExp?.classList.remove('active');
          this.stopSacredGadgetsLoopIfAllInactive();
          // Turning off aura expansion resets aura size to default 1.95
          State.auraScale = 1.95;
          const slider = document.getElementById('sliderAuraScale');
          const badge = document.getElementById('badgeAuraScale');
          if (slider) {
            slider.value = '1.95';
            this.updateRangeSliderFill(slider);
          }
          if (badge) {
            const px = Math.round(1.95 * (State.r || 50));
            badge.textContent = `1.95r (${px}px)`;
          }
          this.showToast('Sacred Gadget: Aura Expansion OFF (Reset to 1.95r)');
          App.renderAll();
        }
      });
    }

    if (sliderAuraExpMaxSize && badgeAuraExpMaxSize) {
      sliderAuraExpMaxSize.value = State.auraExpansionMaxSize !== undefined ? State.auraExpansionMaxSize : 20.0;
      badgeAuraExpMaxSize.textContent = `${Number(sliderAuraExpMaxSize.value).toFixed(1)}r`;
      sliderAuraExpMaxSize.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 0.0, 20.0, 20.0);
        State.auraExpansionMaxSize = val;
        badgeAuraExpMaxSize.textContent = `${val.toFixed(1)}r`;
      });
    }

    if (sliderAuraExpSpeed && badgeAuraExpSpeed) {
      sliderAuraExpSpeed.value = State.auraExpansionSpeed !== undefined ? State.auraExpansionSpeed : 1.0;
      badgeAuraExpSpeed.textContent = `${Number(sliderAuraExpSpeed.value).toFixed(1)}x`;
      sliderAuraExpSpeed.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 0.1, 3.0, 1.0);
        State.auraExpansionSpeed = val;
        badgeAuraExpSpeed.textContent = `${val.toFixed(1)}x`;
      });
    }

    // 2. Rainbow Aura Wave Toggle (Cycles rainbow from center to outside)
    if (toggleRainbow) {
      toggleRainbow.checked = Boolean(State.gadgetRainbowAura);
      toggleRainbow.addEventListener('change', (e) => {
        State.gadgetRainbowAura = e.target.checked;
        cardRainbow?.classList.toggle('active', State.gadgetRainbowAura);
        if (State.gadgetRainbowAura) {
          this._rainbowStartTime = performance.now();
          this._lastRainbowTime = performance.now() / 1000;
          this._rainbowPhase = 0;
          this._auraCircleElements = null;
          document.querySelectorAll('.aura-circle').forEach(circle => {
            circle.style.setProperty('transition', 'none', 'important');
          });
          this.startSacredGadgetsLoop();
          this.showToast('Sacred Gadget: Rainbow Aura Wave ON');
        } else {
          cardRainbow?.classList.remove('active');
          this._auraCircleElements = null;
          this.resetRainbowAuraStrokes();
          this.stopSacredGadgetsLoopIfAllInactive();
          this.showToast('Sacred Gadget: Rainbow Aura Wave OFF');
        }
      });
    }

    if (sliderRainbowSpeed && badgeRainbowSpeed) {
      sliderRainbowSpeed.value = State.rainbowWaveSpeed !== undefined ? State.rainbowWaveSpeed : 1.0;
      badgeRainbowSpeed.textContent = `${Number(sliderRainbowSpeed.value).toFixed(1)}x`;
      sliderRainbowSpeed.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 0.1, 3.0, 1.0);
        State.rainbowWaveSpeed = val;
        badgeRainbowSpeed.textContent = `${val.toFixed(1)}x`;
      });
    }

    // 3. Sacred Breathing Toggle & Sliders (Breathes from middle to max size up to 2.0 and back to 1.0)
    if (toggleBreathing) {
      toggleBreathing.checked = Boolean(State.gadgetBreathing);
      toggleBreathing.addEventListener('change', (e) => {
        State.gadgetBreathing = e.target.checked;
        cardBreathing?.classList.toggle('active', State.gadgetBreathing);
        if (State.gadgetBreathing) {
          this._breathingStartTime = performance.now();
          this.startSacredGadgetsLoop();
          this.showToast('Sacred Gadget: Sacred Breathing ON');
        } else {
          cardBreathing?.classList.remove('active');
          this.resetBreathingTransforms();
          this.stopSacredGadgetsLoopIfAllInactive();
          this.showToast('Sacred Gadget: Sacred Breathing OFF (Restored size to 1.0x)');
        }
      });
    }

    if (sliderBreathingSize && badgeBreathingSize) {
      sliderBreathingSize.value = State.breathingMaxSize || 2.0;
      badgeBreathingSize.textContent = `${Number(sliderBreathingSize.value).toFixed(2)}x`;
      sliderBreathingSize.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 1.05, 2.0, 2.0);
        State.breathingMaxSize = val;
        badgeBreathingSize.textContent = `${val.toFixed(2)}x`;
      });
    }

    if (sliderBreathingSpeed && badgeBreathingSpeed) {
      sliderBreathingSpeed.value = State.breathingSpeed || 1.0;
      badgeBreathingSpeed.textContent = `${Number(sliderBreathingSpeed.value).toFixed(1)}x`;
      sliderBreathingSpeed.addEventListener('input', (e) => {
        const val = clampNumber(e.target.value, 0.2, 3.0, 1.0);
        State.breathingSpeed = val;
        badgeBreathingSpeed.textContent = `${val.toFixed(1)}x`;
      });
    }
  },

  startSacredGadgetsLoop() {
    if (this._gadgetsRafId) return;

    const loop = (timestamp) => {
      this.updateSacredGadgetsFrame(timestamp);

      if (State.gadgetAuraExpansion || State.gadgetRainbowAura || State.gadgetBreathing) {
        this._gadgetsRafId = requestAnimationFrame(loop);
      } else {
        this._gadgetsRafId = null;
      }
    };
    this._gadgetsRafId = requestAnimationFrame(loop);
  },

  stopSacredGadgetsLoopIfAllInactive() {
    if (!State.gadgetAuraExpansion && !State.gadgetRainbowAura && !State.gadgetBreathing) {
      if (this._gadgetsRafId) {
        cancelAnimationFrame(this._gadgetsRafId);
        this._gadgetsRafId = null;
      }
    }
  },

  updateSacredGadgetsFrame(timestamp) {
    const nowSec = timestamp / 1000;

    // --- 1. Aura Expansion (0r to max size up to 20r in 0.01 increments) ---
    if (State.gadgetAuraExpansion) {
      const speed = State.auraExpansionSpeed || 1.0;
      const basePeriod = 10.0; // base period of 10s
      const period = basePeriod / speed;
      const elapsed = nowSec - (this._auraExpansionStartTime / 1000 || 0);
      const theta = (2 * Math.PI * elapsed) / period;
      const u = (1 - Math.cos(theta)) / 2;
      const minScale = 0.0;
      const maxScale = State.auraExpansionMaxSize !== undefined ? State.auraExpansionMaxSize : 20.0;
      const rawScale = minScale + (maxScale - minScale) * u;
      const scale = Math.round(rawScale * 100) / 100;
      State.auraScale = scale;

      const slider = document.getElementById('sliderAuraScale');
      const badge = document.getElementById('badgeAuraScale');
      if (slider && document.activeElement !== slider) {
        slider.value = scale.toFixed(2);
        this.updateRangeSliderFill(slider);
      }
      if (badge) {
        const px = Math.round(scale * (State.r || 50));
        badge.textContent = `${scale.toFixed(2)}r (${px}px)`;
      }

      const effectiveR = Number((scale * (State.r || 50)).toFixed(2));
      document.querySelectorAll('.aura-circle').forEach(circle => {
        circle.setAttribute('r', effectiveR);
      });
    }

    // --- 2. Rainbow Aura Wave (Continuous Center to Outside Spectrum) ---
    if (State.gadgetRainbowAura) {
      const speed = State.rainbowWaveSpeed || 1.0;
      const lastTime = this._lastRainbowTime || nowSec;
      const dt = Math.min(Math.max(nowSec - lastTime, 0), 0.1);
      this._lastRainbowTime = nowSec;
      this._rainbowPhase = ((this._rainbowPhase || 0) + dt * 135 * speed) % 360000;

      let auraCircles = this._auraCircleElements;
      if (!auraCircles || auraCircles.length === 0 || !auraCircles[0]?.isConnected) {
        auraCircles = Array.from(document.querySelectorAll('.aura-circle'));
        this._auraCircleElements = auraCircles;
      }

      // Wave factor 1.85 creates a continuous, unbroken chromatic wave across concentric rings
      const waveFactor = 1.85;
      const phase = this._rainbowPhase;

      for (let i = 0; i < auraCircles.length; i++) {
        const circle = auraCircles[i];
        let dist = circle._patternDist;
        if (dist === undefined) {
          const cx = parseFloat(circle.getAttribute('cx')) || 0;
          const cy = parseFloat(circle.getAttribute('cy')) || 0;
          dist = Math.hypot(cx, cy);
          circle._patternDist = dist;
        }
        const hue = (((phase - dist * waveFactor) % 360) + 360) % 360;
        const colorStr = `hsl(${Math.round(hue)}, 95%, 65%)`;
        circle.style.setProperty('transition', 'none', 'important');
        circle.style.stroke = colorStr;
        circle.setAttribute('stroke', colorStr);
      }
    }

    // --- 3. Sacred Breathing (Middle to max size up to 2.0, then back to 1.0) ---
    if (State.gadgetBreathing) {
      const speed = State.breathingSpeed || 1.0;
      const basePeriod = 8.0;
      const period = basePeriod / speed;
      const elapsed = nowSec - (this._breathingStartTime / 1000 || 0);
      const theta = (2 * Math.PI * elapsed) / period;
      const u = (1 - Math.cos(theta)) / 2;
      const maxSize = State.breathingMaxSize !== undefined ? State.breathingMaxSize : 2.0;
      const breathScale = 1.0 + (maxSize - 1.0) * u;
      window._currentBreathingScale = breathScale;

      document.querySelectorAll('.sacred-main-group').forEach(group => {
        group.setAttribute('transform', `scale(${breathScale.toFixed(4)})`);
      });
    }
  },

  resetRainbowAuraStrokes() {
    this._auraCircleElements = null;
    this._rainbowPhase = 0;
    this._lastRainbowTime = 0;
    document.querySelectorAll('.aura-circle').forEach(circle => {
      const defaultStroke = circle.getAttribute('data-default-stroke') || 
        ((circle.dataset.pattern === 'life') ? (State.colorLife || '#ef4444') : (State.colorKryst || '#10b981'));
      circle.style.stroke = '';
      circle.style.transition = '';
      circle.setAttribute('stroke', defaultStroke);
    });
  },

  resetBreathingTransforms() {
    window._currentBreathingScale = 1.0;
    document.querySelectorAll('.sacred-main-group').forEach(group => {
      group.removeAttribute('transform');
    });
    App.renderAll();
  },

  bindPresets() {
    // Add New Custom Preset
    const btnAdd = document.getElementById('btnAddNewPreset');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const name = prompt('Enter a name for this custom shape preset (e.g., Pyramid, Dove, Shield, Pinecone, Face):', 'My Sacred Preset');
        if (!name || !name.trim()) return;

        const presetKey = 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const highlightCount = (State.highlightedIds?.size || 0) +
          Object.keys(State.sectionFills || {}).length +
          (State.selectedSectionIds?.size || 0);
        const patternName = State.activePattern === 'life' ? 'Flower of Life' : 'Flower of Kryst';
        const subtitle = `${patternName} · ${highlightCount > 0 ? highlightCount + ' highlighted' : 'Geometry'}`;

        const newPreset = {
          id: presetKey,
          key: presetKey,
          title: name.trim(),
          subtitle: subtitle,
          isBuiltin: false,
          highlightCount: highlightCount,
          config: PresetsManager.captureCurrentStudioConfig()
        };

        PresetsManager.addCustomPreset(newPreset);
        State.activePreset = presetKey;
        this.renderCustomPresets();
        this.showToast(`Saved preset: "${name.trim()}"`);
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
          PresetsManager.resetAllToDefaults();
          this.renderCustomPresets();
          manageModal?.classList.remove('open');
          this.showToast('Cleared custom presets.');
        }
      });
    }
  },

  renderCustomPresets() {
    PresetsManager.renderPresetGrid();
  },

  applyPreset(id) {
    const preset = PresetsManager.getPreset(id);
    if (!preset || !preset.config) return;

    State.activePreset = id;
    const cfg = preset.config;

    // Apply configuration to state safely
    State.applyConfig(cfg);

    // Sync highlight mode UI if specified in preset
    if (cfg.sectionHighlightMode !== undefined && typeof document !== 'undefined') {
      document.body.classList.toggle('section-highlight-mode', State.sectionHighlightMode);
      document.getElementById('toggleSectionHighlightBtn')?.classList.toggle('active', State.sectionHighlightMode);
      document.getElementById('btnBottomHighlightMode')?.classList.toggle('active', State.sectionHighlightMode);
    }

    // Sync UI elements
    const auraScaleSlider = document.getElementById('sliderAuraScale');
    const auraScaleBadge = document.getElementById('badgeAuraScale');
    if (auraScaleSlider) auraScaleSlider.value = State.auraScale !== undefined ? State.auraScale : 1.95;
    if (auraScaleBadge) {
      const scale = State.auraScale !== undefined ? State.auraScale : 1.95;
      const px = Math.round(scale * (State.r || 50));
      auraScaleBadge.textContent = `${scale.toFixed(2)}r (${px}px)`;
    }

    const sliderAuraExpMaxSize = document.getElementById('sliderAuraExpMaxSize');
    const badgeAuraExpMaxSize = document.getElementById('badgeAuraExpMaxSize');
    if (sliderAuraExpMaxSize) sliderAuraExpMaxSize.value = State.auraExpansionMaxSize !== undefined ? State.auraExpansionMaxSize : 20.0;
    if (badgeAuraExpMaxSize) badgeAuraExpMaxSize.textContent = `${Number(State.auraExpansionMaxSize || 20.0).toFixed(1)}r`;

    const sliderAuraExpSpeed = document.getElementById('sliderAuraExpSpeed');
    const badgeAuraExpSpeed = document.getElementById('badgeAuraExpSpeed');
    if (sliderAuraExpSpeed) sliderAuraExpSpeed.value = State.auraExpansionSpeed !== undefined ? State.auraExpansionSpeed : 1.0;
    if (badgeAuraExpSpeed) badgeAuraExpSpeed.textContent = `${Number(State.auraExpansionSpeed || 1.0).toFixed(1)}x`;

    const sliderRainbowSpeed = document.getElementById('sliderRainbowSpeed');
    const badgeRainbowSpeed = document.getElementById('badgeRainbowSpeed');
    if (sliderRainbowSpeed) sliderRainbowSpeed.value = State.rainbowWaveSpeed !== undefined ? State.rainbowWaveSpeed : 1.0;
    if (badgeRainbowSpeed) badgeRainbowSpeed.textContent = `${Number(State.rainbowWaveSpeed || 1.0).toFixed(1)}x`;

    document.querySelectorAll('.pattern-tab, [data-pattern-switch]').forEach(t => {
      const p = t.dataset.patternSwitch || t.dataset.pattern;
      const isAct = p === State.activePattern;
      t.classList.toggle('active', isAct);
      t.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });

    const boundarySlider = document.getElementById('boundarySlider');
    if (boundarySlider) boundarySlider.value = State.boundaryRadius;
    const boundaryBadge = document.getElementById('boundaryBadge');
    if (boundaryBadge) boundaryBadge.textContent = `R_bound = ${State.boundaryRadius}px`;

    this.syncLayerControls();
    this.renderCustomPresets();
    this.updateSidebarStats();
    this.updateAllRangeSliderFills();

    // Re-render pattern with restored highlights and section fills
    App.renderAll();

    // Ensure DOM overlays are in sync with restored highlights
    if (typeof SVGRenderer !== 'undefined' && SVGRenderer.updateHighlights) {
      ['svgMain', 'svgLife', 'svgKryst'].forEach(svgId => {
        if (typeof document !== 'undefined' && document.getElementById(svgId)) {
          SVGRenderer.updateHighlights(svgId);
        }
      });
    }
    this.updateSelectedSectionDOM();

    // Sync section count badge
    const countBadge = document.getElementById('sectionColorCountBadge');
    if (countBadge) {
      const count = State.selectedSectionIds ? State.selectedSectionIds.size : 0;
      countBadge.textContent = `${count} selected`;
    }

    this.showToast(`Applied preset: "${preset.title}"`);
  },

  applyCustomPreset(id) {
    return this.applyPreset(id);
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

    // 3. Preset Config & Edit Modal
    const presetModal = document.getElementById('presetConfigModal');
    if (presetModal) {
      presetModal.addEventListener('click', (e) => {
        if (e.target === presetModal) presetModal.classList.remove('open');
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

    document.getElementById('toggleSectionHighlightBtn')?.addEventListener('click', () => {
      this.toggleSectionHighlightMode();
    });

    document.getElementById('clearHighlightBtn')?.addEventListener('click', () => {
      this.clearAllHighlights();
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
      } else if ((e.key === 'h' || e.key === 'H') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        this.toggleSectionHighlightMode();
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        State.highlightedIds.clear();
        this.hideRemoveCirclesPopup();
        SVGRenderer.updateHighlights('svgMain');
        this.updateSidebarStats();
      }
    });
  },

  showToast(text, duration = 2400) {
    if (typeof document === 'undefined') return;
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

  removeHighlightedCircles() {
    if (!State.highlightedIds || State.highlightedIds.size === 0) {
      this.showToast('No circles highlighted. Click circles to highlight them first.');
      return;
    }
    const count = State.highlightedIds.size;
    if (!State.disabledCircleIds) State.disabledCircleIds = new Set();
    State.highlightedIds.forEach(id => State.disabledCircleIds.add(id));
    State.highlightedIds.clear();
    this.hideRemoveCirclesPopup();

    const svgIds = ['svgMain', 'svgKryst', 'svgLife'];
    svgIds.forEach(sid => {
      if (typeof SVGRenderer !== 'undefined' && SVGRenderer.updateHighlights) {
        SVGRenderer.updateHighlights(sid);
      }
    });
    this.updateSidebarStats();
    if (typeof App !== 'undefined' && App.renderAll) {
      App.renderAll();
    }
    this.showToast(`Removed ${count} highlighted circle${count === 1 ? '' : 's'}.`);
  },

  // Alias for backward compatibility
  toggleRemoveCirclesMode() {
    return this.removeHighlightedCircles();
  },

  updateSidebarStats() {
    const boundEl = (typeof document !== 'undefined') ? document.getElementById('sidebarBoundRad') : null;
    if (boundEl) {
      boundEl.textContent = `${Math.round(State.boundaryRadius)}px (${(State.boundaryRadius / State.r).toFixed(1)}r)`;
    }
    const hlEl = (typeof document !== 'undefined') ? document.getElementById('sidebarHighlightCount') : null;
    if (hlEl) {
      hlEl.textContent = String(State.highlightedIds.size);
    }
    const disEl = (typeof document !== 'undefined') ? document.getElementById('sidebarDisabledCount') : null;
    if (disEl) {
      disEl.textContent = String(State.disabledCircleIds.size);
    }
  }
};

if (typeof window !== 'undefined') {
  window.UI = UI;
  window.TutorialManager = TutorialManager;
}

export { PanZoomController, UI, TutorialManager };
export default UI;
