/**
 * 3D WEBGL RENDERING ENGINE (js/renderer3d.js)
 * High-performance Instanced 3D WebGL renderer powered by Three.js.
 * Renders 3D Face-Centered Cubic (FCC) close-packed spheres,
 * overlapping shells (2r), torus petal rims, lattice guide struts,
 * interactive Z-slice clipping planes, and FCC (111) layer isolation.
 */
import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { State, LayerColors } from './state.js';
import { SacredMath3D } from './geometry3d.js';

/* =========================================================================
   VIEWPORT SCENE CLASS (Handles 1 Three.js Canvas/Scene/Camera/Controls)
   ========================================================================= */
class Viewport3D {
  constructor(canvasId, patternKey) {
    this.canvasId = canvasId;
    this.patternKey = patternKey; // 'life' | 'kryst'
    this.canvas = document.getElementById(canvasId);
    this.wrapper = this.canvas ? this.canvas.parentElement : null;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    // Dynamic objects container
    this.objectsGroup = null;
    this.highlightGroup = null;
    this.zeroPointMarker = null;

    // Clipping plane along Z axis
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1000);

    // Current cached geometry data
    this.currentGeometry = null;
    this.instancedSpheres = null;
    this.instancedShells = null;
    this.instancedTori = null;
    this.guideSegments = null;
    this.neighborHighlightSpheres = [];

    // Hover & selection state
    this.hoveredInstanceId = null;
    this.selectedInstanceId = null;

    if (this.canvas) {
      this.initScene();
      this.initEvents();
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(State.colorBg || '#07090e');

    // Camera
    const width = this.wrapper ? this.wrapper.clientWidth || 800 : 800;
    const height = this.wrapper ? this.wrapper.clientHeight || 800 : 800;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
    this.setCameraPreset('isometric', 800);

    // WebGL Renderer with local clipping enabled
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.localClippingEnabled = true;

    // Controls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 1.1;
    this.controls.panSpeed = 0.8;
    this.controls.screenSpacePanning = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(400, 600, 500);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight2.position.set(-400, -300, -300);
    this.scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xeab308, 0.8);
    dirLight3.position.set(0, -600, 200);
    this.scene.add(dirLight3);

    // Subtle XY plane orientation circle
    const gridCircleGeo = new THREE.BufferGeometry();
    const gridPts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      gridPts.push(new THREE.Vector3(Math.cos(a) * 300, Math.sin(a) * 300, 0));
    }
    gridCircleGeo.setFromPoints(gridPts);
    const gridMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.35 });
    const gridLine = new THREE.Line(gridCircleGeo, gridMat);
    this.scene.add(gridLine);

    // Groups
    this.objectsGroup = new THREE.Group();
    this.scene.add(this.objectsGroup);

    this.highlightGroup = new THREE.Group();
    this.scene.add(this.highlightGroup);
  }

  initEvents() {
    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkRaycast();
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.mouse.set(-999, -999);
      this.clearHover();
    });

    this.canvas.addEventListener('click', () => {
      if (this.hoveredInstanceId !== null) {
        this.selectInstance(this.hoveredInstanceId);
      }
    });
  }

  setCameraPreset(preset, fitDist = null) {
    let dist = fitDist;
    if (!dist) {
      const bound = (this.currentGeometry && this.currentGeometry.boundingRadius) ? this.currentGeometry.boundingRadius : 350;
      dist = Math.max(bound * 2.2, 550);
    }
    if (preset === 'top') {
      // (111) Hexagonal view looking down Z
      this.camera.position.set(0, 0, dist * 1.5);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(0, 0, 0);
      if (this.controls) this.controls.target.set(0, 0, 0);
    } else if (preset === 'front') {
      // Cross-section showing A, B, C stacked planes
      this.camera.position.set(0, -dist * 1.5, 0);
      this.camera.up.set(0, 0, 1);
      this.camera.lookAt(0, 0, 0);
      if (this.controls) this.controls.target.set(0, 0, 0);
    } else {
      // Isometric 3D cubic view
      this.camera.position.set(dist * 0.9, -dist * 0.9, dist * 1.1);
      this.camera.up.set(0, 0, 1);
      this.camera.lookAt(0, 0, 0);
      if (this.controls) this.controls.target.set(0, 0, 0);
    }
    if (this.controls) this.controls.update();
  }

  fitCamera() {
    if (!this.currentGeometry || !this.camera || !this.controls) return;
    const bound = Math.max(this.currentGeometry.boundingRadius || 350, 150);
    const aspect = this.camera.aspect || 1;
    const fovRad = (this.camera.fov * Math.PI) / 360;
    const distV = bound / Math.sin(fovRad);
    const distH = bound / (Math.sin(fovRad) * aspect);
    const reqDist = Math.max(distV, distH) * 1.15;

    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    if (dir.lengthSq() < 1e-4) {
      dir.set(0.9, -0.9, 1.1);
    }
    dir.normalize();
    this.controls.target.set(0, 0, 0);
    this.camera.position.copy(dir.multiplyScalar(reqDist));
    this.controls.update();
  }

  resize() {
    if (!this.wrapper || !this.renderer || !this.camera) return;
    const width = this.wrapper.clientWidth;
    const height = this.wrapper.clientHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  updateZSlice() {
    if (!this.currentGeometry) return;
    const bound = this.currentGeometry.boundingRadius || 400;
    // State.sliceZ: -100 to +100 (%)
    const sliceFrac = (State.sliceZ !== undefined) ? State.sliceZ / 100 : 1.0;
    if (sliceFrac >= 0.99) {
      // Plane clipping disabled when at 100%
      this.clipPlane.constant = bound * 10;
    } else {
      // Cuts off from top (+Z) down to -Z
      this.clipPlane.constant = sliceFrac * bound;
    }
  }

  /**
   * Rebuilds all 3D geometries and InstancedMesh objects according to current State.
   */
  updateSceneData() {
    if (!this.objectsGroup) return;

    // Clear old meshes
    while (this.objectsGroup.children.length > 0) {
      const child = this.objectsGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
      this.objectsGroup.remove(child);
    }
    this.clearHighlight();

    const r = State.r || 50;
    const isTriAxial = (State.model3D !== 'fcc');
    const triaxialOpts = {
      infillSteps: State.infillSteps !== undefined ? State.infillSteps : 2,
      infillMode: State.triaxialInfill || 'both',
      showPlaneXY: State.showPlaneXY !== false,
      showPlaneXZ: State.showPlaneXZ !== false,
      showPlaneYZ: State.showPlaneYZ !== false,
      showInfill3D: State.showInfill3D !== false
    };

    if (isTriAxial) {
      if (State.viewportMode === 'superimposed') {
        const lifeGeom = SacredMath3D.getTriAxialGeometry('life', State.N, r, triaxialOpts);
        const krystGeom = SacredMath3D.getTriAxialGeometry('kryst', State.N, r, triaxialOpts);
        this.currentGeometry = {
          spheres: [...lifeGeom.spheres.map(s => ({ ...s, pattern: 'life' })), ...krystGeom.spheres.map(s => ({ ...s, pattern: 'kryst' }))],
          guides: [...lifeGeom.guides, ...krystGeom.guides],
          boundingRadius: Math.max(lifeGeom.boundingRadius, krystGeom.boundingRadius)
        };
      } else {
        this.currentGeometry = SacredMath3D.getTriAxialGeometry(this.patternKey, State.N, r, triaxialOpts);
      }
    } else {
      // Superimposed mode: render both FoL and FoK in FCC mode
      if (State.viewportMode === 'superimposed') {
        const lifeGeom = SacredMath3D.getLife3DGeometry(SacredMath3D.getEffectiveLifeLayers ? SacredMath3D.getEffectiveLifeLayers(State.N, r) : State.N, r);
        const krystGeom = SacredMath3D.getKryst3DGeometry(State.N, r, { expansionMode: State.fccExpansionMode || 'volumetric' });
        this.currentGeometry = {
          spheres: [...lifeGeom.spheres.map(s => ({ ...s, pattern: 'life' })), ...krystGeom.spheres.map(s => ({ ...s, pattern: 'kryst' }))],
          guides: [...lifeGeom.guides, ...krystGeom.guides],
          boundingRadius: Math.max(lifeGeom.boundingRadius, krystGeom.boundingRadius)
        };
      } else if (this.patternKey === 'life') {
        const effectiveLayers = Math.max(1, Math.min(State.N, 6));
        this.currentGeometry = SacredMath3D.getLife3DGeometry(effectiveLayers, r);
      } else {
        this.currentGeometry = SacredMath3D.getKryst3DGeometry(State.N, r, { expansionMode: State.fccExpansionMode || 'volumetric' });
      }
    }

    const { spheres, guides, boundingRadius } = this.currentGeometry;
    this.updateZSlice();

    // 1. Base Tangent Spheres (InstancedMesh with Translucency)
    if (State.show3DSpheres !== false && spheres.length > 0) {
      const sphereGeo = new THREE.SphereGeometry(r, 26, 18);
      const isTranslucent = (State.sphereOpacity || 0.35) < 0.99;
      const sphereMat = new THREE.MeshPhysicalMaterial({
        roughness: State.sphereRoughness !== undefined ? State.sphereRoughness : 0.15,
        metalness: State.sphereMetalness !== undefined ? State.sphereMetalness : 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.15,
        transparent: isTranslucent,
        opacity: State.sphereOpacity !== undefined ? State.sphereOpacity : 0.35,
        depthWrite: !isTranslucent,
        side: THREE.DoubleSide,
        clippingPlanes: [this.clipPlane],
        clipShadows: true
      });

      this.instancedSpheres = new THREE.InstancedMesh(sphereGeo, sphereMat, spheres.length);
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();
      const planeFilter = State.fccPlaneFilter || 'all';

      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];

        // Isolate FCC Plane filter (when in FCC mode)
        if (!isTriAxial && planeFilter !== 'all' && s.plane !== planeFilter) {
          matrix.makeScale(0, 0, 0);
        } else {
          matrix.makeTranslation(s.x, s.y, s.z);
        }
        this.instancedSpheres.setMatrixAt(i, matrix);

        // Color coding
        if (s.pattern === 'life' && State.viewportMode === 'superimposed') {
          color.set(State.colorLife || '#ef4444');
        } else if (State.colorByLayer) {
          const cHex = LayerColors[s.layer % LayerColors.length];
          color.set(cHex);
        } else if (isTriAxial) {
          // Tri-Axial Color Coding by Plane
          if (s.role === 'center') {
            color.set('#ef4444'); // Crimson origin
          } else if (s.plane === 'XY') {
            color.set('#06b6d4'); // Electric Cyan (0° Original Plane)
          } else if (s.plane === 'XZ') {
            color.set('#f43f5e'); // Rose / Magenta (90° Rotated Axis)
          } else if (s.plane === 'YZ') {
            color.set('#10b981'); // Emerald / Green (3rd Orthogonal Axis)
          } else if (s.plane === 'Infill-X' || s.plane === 'Infill-Y') {
            color.set('#f59e0b'); // Radiant Amber / Gold (Angular Arc Infill)
          } else if (s.plane === 'Infill-Grid') {
            color.set('#a855f7'); // Lavender / Violet (3D Coordinate Grid Infill)
          } else {
            color.set('#38bdf8');
          }
        } else {
          // FCC Role Color Coding
          if (s.role === 'center') {
            color.set('#ef4444'); // Crimson / Genesis origin
          } else if (s.role === 'hexagon-center') {
            color.set('#38bdf8'); // Bright Cyan / White
          } else if (s.role === 'hexagon') {
            color.set('#3b82f6'); // Electric Blue
          } else if (s.role === 'triangle') {
            color.set('#eab308'); // Gold / Yellow
          } else {
            color.set('#06b6d4');
          }
        }
        this.instancedSpheres.setColorAt(i, color);
      }

      this.instancedSpheres.instanceMatrix.needsUpdate = true;
      if (this.instancedSpheres.instanceColor) this.instancedSpheres.instanceColor.needsUpdate = true;
      this.objectsGroup.add(this.instancedSpheres);
    }

    // 2. Overlapping Actual Flower Spheres / Shells (R = 2r)
    if (State.show3DShells && spheres.length > 0) {
      const shellGeo = new THREE.SphereGeometry(2 * r, 22, 16);
      const shellMat = new THREE.MeshPhysicalMaterial({
        color: this.patternKey === 'life' ? (State.colorLife || '#ef4444') : (State.colorKryst || '#06b6d4'),
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
        roughness: 0.1,
        metalness: 0.1,
        clippingPlanes: [this.clipPlane]
      });

      this.instancedShells = new THREE.InstancedMesh(shellGeo, shellMat, spheres.length);
      const matrix = new THREE.Matrix4();
      const planeFilter = State.fccPlaneFilter || 'all';

      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];
        if (planeFilter !== 'all' && s.plane !== planeFilter) {
          matrix.makeScale(0, 0, 0);
        } else {
          matrix.makeTranslation(s.x, s.y, s.z);
        }
        this.instancedShells.setMatrixAt(i, matrix);
      }
      this.instancedShells.instanceMatrix.needsUpdate = true;
      this.objectsGroup.add(this.instancedShells);
    }

    // 3. 3D Tubular Torus Petal Rims (Major Radius = 2r, Minor Tube Radius = ρ)
    if (State.show3DTorus && spheres.length > 0) {
      const tubeRadius = Math.max(1.2, r * 0.04);
      const torusGeo = new THREE.TorusGeometry(2 * r, tubeRadius, 12, 40);
      const torusMat = new THREE.MeshStandardMaterial({
        color: this.patternKey === 'life' ? '#f43f5e' : '#38bdf8',
        roughness: 0.35,
        metalness: 0.7,
        clippingPlanes: [this.clipPlane]
      });

      this.instancedTori = new THREE.InstancedMesh(torusGeo, torusMat, spheres.length);
      const matrix = new THREE.Matrix4();
      const planeFilter = State.fccPlaneFilter || 'all';

      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];
        if (planeFilter !== 'all' && s.plane !== planeFilter) {
          matrix.makeScale(0, 0, 0);
        } else {
          matrix.makeTranslation(s.x, s.y, s.z);
        }
        this.instancedTori.setMatrixAt(i, matrix);
      }
      this.instancedTori.instanceMatrix.needsUpdate = true;
      this.objectsGroup.add(this.instancedTori);
    }

    // 4. 3D Guide Polyhedra & Lattice Struts (LineSegments)
    if (State.show3DGuides && guides && guides.length > 0) {
      const linePositions = [];
      const planeFilter = State.fccPlaneFilter || 'all';

      for (let i = 0; i < guides.length; i++) {
        const g = guides[i];
        linePositions.push(g.p1.x, g.p1.y, g.p1.z, g.p2.x, g.p2.y, g.p2.z);
      }

      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: State.colorGuide ? new THREE.Color(State.colorGuide) : new THREE.Color('#ea580c'),
        transparent: true,
        opacity: 0.75,
        clippingPlanes: [this.clipPlane]
      });

      this.guideSegments = new THREE.LineSegments(lineGeo, lineMat);
      this.objectsGroup.add(this.guideSegments);
    }

    // 5. Axial Orthogonal Guide Rings (XY, XZ, YZ)
    if (State.showAxialRims !== false && isTriAxial && boundingRadius > 0) {
      const ringRad = Math.max(10, boundingRadius - r);
      const ringThick = Math.max(1.2, r * 0.035);
      const ringGeo = new THREE.TorusGeometry(ringRad, ringThick, 8, 96);

      // Ring XY (z = 0) - Cyan
      const ringMatXY = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.45 });
      const ringMeshXY = new THREE.Mesh(ringGeo, ringMatXY);
      this.objectsGroup.add(ringMeshXY);

      // Ring XZ (y = 0) - Rotated 90° around X - Rose/Magenta
      const ringMatXZ = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.45 });
      const ringMeshXZ = new THREE.Mesh(ringGeo, ringMatXZ);
      ringMeshXZ.rotation.x = Math.PI / 2;
      this.objectsGroup.add(ringMeshXZ);

      // Ring YZ (x = 0) - Rotated 90° around Y - Emerald/Green
      const ringMatYZ = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.45 });
      const ringMeshYZ = new THREE.Mesh(ringGeo, ringMatYZ);
      ringMeshYZ.rotation.y = Math.PI / 2;
      this.objectsGroup.add(ringMeshYZ);
    }

    // 6. Central Zero-Point Marker (Flower of Kryst hollow void indicator)
    if (this.patternKey === 'kryst' || State.viewportMode === 'superimposed') {
      if (State.showZeroPointMarker !== false) {
        const voidGroup = new THREE.Group();

        // Pulsing wireframe core sphere at (0, 0, 0)
        const voidGeo = new THREE.SphereGeometry(r * 0.45, 16, 12);
        const voidMat = new THREE.MeshBasicMaterial({
          color: 0x06b6d4,
          wireframe: true,
          transparent: true,
          opacity: 0.8
        });
        const voidMesh = new THREE.Mesh(voidGeo, voidMat);
        voidGroup.add(voidMesh);

        // Core light emitting from inside the Zero-Point void
        const coreLight = new THREE.PointLight(0x38bdf8, 2.5, 3 * r);
        voidGroup.add(coreLight);

        this.objectsGroup.add(voidGroup);
      }
    }
  }

  checkRaycast() {
    if (!this.instancedSpheres || !this.currentGeometry || !this.camera) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.instancedSpheres);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined && instanceId < this.currentGeometry.spheres.length) {
        this.hoverInstance(instanceId);
        return;
      }
    }

    this.clearHover();
  }

  hoverInstance(instanceId) {
    if (this.hoveredInstanceId === instanceId) return;
    this.hoveredInstanceId = instanceId;

    const s = this.currentGeometry.spheres[instanceId];
    if (!s) return;

    // Update Geometry Inspector Card HUD
    const inspectPattern = document.getElementById('inspectPattern');
    const inspectLayer = document.getElementById('inspectLayer');
    const inspectDist = document.getElementById('inspectDist');
    const inspectCoords = document.getElementById('inspectCoords');
    const inspectRole = document.getElementById('inspectRole');
    const inspectStatus = document.getElementById('inspectStatus');

    if (inspectPattern) inspectPattern.textContent = (s.pattern === 'life' || this.patternKey === 'life') ? 'Flower of Life (3D FCC)' : 'Flower of Kryst (3D FCC)';
    if (inspectLayer) inspectLayer.textContent = `Ring ${s.layer} (Plane ${s.plane})`;
    if (inspectDist) inspectDist.textContent = `${Math.hypot(s.x, s.y, s.z).toFixed(1)}px (${(Math.hypot(s.x, s.y, s.z) / (State.r || 50)).toFixed(2)}r)`;
    if (inspectCoords) inspectCoords.textContent = `(${s.x.toFixed(0)}, ${s.y.toFixed(0)}, ${s.z.toFixed(0)})`;
    if (inspectRole) inspectRole.textContent = `${s.role} [FCC ${s.plane}]`;
    if (inspectStatus) inspectStatus.textContent = 'Inspecting';

    this.renderHighlight(s);
  }

  clearHover() {
    if (this.hoveredInstanceId === null && this.selectedInstanceId === null) return;
    this.hoveredInstanceId = null;
    if (this.selectedInstanceId === null) {
      this.clearHighlight();
    }
  }

  selectInstance(instanceId) {
    this.selectedInstanceId = instanceId;
    const s = this.currentGeometry.spheres[instanceId];
    if (s) {
      this.renderHighlight(s, true);
    }
  }

  renderHighlight(sphere, isSelected = false) {
    // Clear previous highlight meshes
    while (this.highlightGroup.children.length > 0) {
      const c = this.highlightGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      this.highlightGroup.remove(c);
    }

    const r = State.r || 50;
    const targetDistSq = (2 * r) * (2 * r);
    const tolSq = (0.05 * r) * (0.05 * r);

    // 1. Primary Highlight Halo around hovered sphere
    const haloGeo = new THREE.SphereGeometry(r * 1.05, 24, 18);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.95
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.set(sphere.x, sphere.y, sphere.z);
    this.highlightGroup.add(haloMesh);

    // 2. Find and highlight all 12 FCC tangent neighbor spheres at distance 2r
    if (this.currentGeometry && this.currentGeometry.spheres) {
      const neighbors = [];
      for (let i = 0; i < this.currentGeometry.spheres.length; i++) {
        const other = this.currentGeometry.spheres[i];
        if (other !== sphere) {
          const dSq = (other.x - sphere.x) ** 2 + (other.y - sphere.y) ** 2 + (other.z - sphere.z) ** 2;
          if (Math.abs(dSq - targetDistSq) <= tolSq) {
            neighbors.push(other);
          }
        }
      }

      for (let n = 0; n < neighbors.length; n++) {
        const nb = neighbors[n];
        const nbGeo = new THREE.SphereGeometry(r * 1.02, 16, 12);
        const nbMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: 0.6
        });
        const nbMesh = new THREE.Mesh(nbGeo, nbMat);
        nbMesh.position.set(nb.x, nb.y, nb.z);
        this.highlightGroup.add(nbMesh);
      }
    }
  }

  clearHighlight() {
    while (this.highlightGroup.children.length > 0) {
      const c = this.highlightGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      this.highlightGroup.remove(c);
    }
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    if (this.controls) {
      this.controls.autoRotate = !!State.autoRotate3D;
      this.controls.autoRotateSpeed = 1.5;
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }
}

/* =========================================================================
   RENDERER 3D MANAGER
   ========================================================================= */
const Renderer3D = {
  viewports: {
    life: null,
    kryst: null
  },
  _rafId: null,
  _isSyncingControls: false,
  isInitialized: false,

  init() {
    if (this.isInitialized) return;

    this.viewports.life = new Viewport3D('canvasLife3D', 'life');
    this.viewports.kryst = new Viewport3D('canvasKryst3D', 'kryst');

    this.bindSynchronizedControls();
    this.bindResize();

    this.isInitialized = true;
    this.startAnimationLoop();
  },

  /**
   * Synchronizes camera rotation, zoom, and panning between Life and Kryst 3D canvases
   * in Dual Split (comparison) mode.
   */
  bindSynchronizedControls() {
    const vLife = this.viewports.life;
    const vKryst = this.viewports.kryst;

    if (!vLife || !vKryst || !vLife.controls || !vKryst.controls) return;

    vLife.controls.addEventListener('change', () => {
      if (this._isSyncingControls || !State.syncPanZoom || State.viewportMode !== 'comparison') return;
      this._isSyncingControls = true;
      const rLife = vLife.currentGeometry?.boundingRadius || 300;
      const rKryst = vKryst.currentGeometry?.boundingRadius || 300;
      const ratio = Math.max(0.1, rKryst / rLife);

      const dir = new THREE.Vector3().subVectors(vLife.camera.position, vLife.controls.target);
      const dist = dir.length();
      dir.normalize();

      vKryst.camera.position.copy(vKryst.controls.target).addScaledVector(dir, dist * ratio);
      vKryst.camera.quaternion.copy(vLife.camera.quaternion);
      vKryst.camera.updateProjectionMatrix();
      vKryst.controls.update();
      this._isSyncingControls = false;
    });

    vKryst.controls.addEventListener('change', () => {
      if (this._isSyncingControls || !State.syncPanZoom || State.viewportMode !== 'comparison') return;
      this._isSyncingControls = true;
      const rLife = vLife.currentGeometry?.boundingRadius || 300;
      const rKryst = vKryst.currentGeometry?.boundingRadius || 300;
      const ratio = Math.max(0.1, rLife / rKryst);

      const dir = new THREE.Vector3().subVectors(vKryst.camera.position, vKryst.controls.target);
      const dist = dir.length();
      dir.normalize();

      vLife.camera.position.copy(vLife.controls.target).addScaledVector(dir, dist * ratio);
      vLife.camera.quaternion.copy(vKryst.camera.quaternion);
      vLife.camera.updateProjectionMatrix();
      vLife.controls.update();
      this._isSyncingControls = false;
    });
  },

  bindResize() {
    window.addEventListener('resize', () => {
      if (State.dimension === '3d') {
        this.resizeAll();
      }
    });
  },

  resizeAll() {
    if (this.viewports.life) this.viewports.life.resize();
    if (this.viewports.kryst) this.viewports.kryst.resize();
  },

  startAnimationLoop() {
    if (this._rafId) return;

    const loop = () => {
      this._rafId = requestAnimationFrame(loop);
      if (State.dimension === '3d') {
        if (State.viewportMode === 'comparison') {
          if (this.viewports.life) this.viewports.life.render();
          if (this.viewports.kryst) this.viewports.kryst.render();
        } else if (State.viewportMode === 'single-life' || State.viewportMode === 'superimposed') {
          if (this.viewports.life) this.viewports.life.render();
        } else if (State.viewportMode === 'single-kryst') {
          if (this.viewports.kryst) this.viewports.kryst.render();
        }
      }
    };
    loop();
  },

  stopAnimationLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  },

  /**
   * Refreshes all 3D geometries, materials, and clipping planes.
   */
  renderAll() {
    if (!this.isInitialized) this.init();

    this.resizeAll();

    if (State.viewportMode === 'superimposed') {
      if (this.viewports.life) this.viewports.life.updateSceneData();
    } else {
      if (this.viewports.life) this.viewports.life.updateSceneData();
      if (this.viewports.kryst) this.viewports.kryst.updateSceneData();
    }

    this.update3DStats();
  },

  updateZSlice() {
    if (this.viewports.life) this.viewports.life.updateZSlice();
    if (this.viewports.kryst) this.viewports.kryst.updateZSlice();
  },

  setCameraPreset(preset) {
    if (this.viewports.life) this.viewports.life.setCameraPreset(preset);
    if (this.viewports.kryst) this.viewports.kryst.setCameraPreset(preset);
  },

  fitCameraAll() {
    if (this.viewports.life) this.viewports.life.fitCamera();
    if (this.viewports.kryst) this.viewports.kryst.fitCamera();
  },

  /**
   * Updates sphere count badges and HUD with 3D crystal statistics.
   */
  update3DStats() {
    const badgeLifeCount = document.getElementById('badgeLifeCount');
    const badgeKrystCount = document.getElementById('badgeKrystCount');
    const folCountStat = document.getElementById('folCountStat');
    const fokCountStat = document.getElementById('fokCountStat');
    const sidebarBoundRad = document.getElementById('sidebarBoundRad');

    if (this.viewports.life && this.viewports.life.currentGeometry) {
      const folSpheres = this.viewports.life.currentGeometry.spheres.length;
      if (badgeLifeCount) badgeLifeCount.textContent = `${folSpheres} Spheres`;
      if (folCountStat) folCountStat.textContent = `${folSpheres} Spheres (FCC)`;
    }

    if (this.viewports.kryst && this.viewports.kryst.currentGeometry) {
      const fokSpheres = this.viewports.kryst.currentGeometry.spheres.length;
      if (badgeKrystCount) badgeKrystCount.textContent = `${fokSpheres} Spheres`;
      if (fokCountStat) fokCountStat.textContent = `${fokSpheres} (Flower of Kryst 3D)`;
      if (sidebarBoundRad) {
        const bound = this.viewports.kryst.currentGeometry.boundingRadius;
        sidebarBoundRad.textContent = `${Math.round(bound)}px (${(bound / (State.r || 50)).toFixed(1)}r)`;
      }
    }
  },

  /**
   * Captures high-resolution PNG image from the active 3D WebGL canvas.
   */
  capturePNG() {
    let targetViewport = (State.viewportMode === 'single-kryst') ? this.viewports.kryst : this.viewports.life;
    if (!targetViewport || !targetViewport.renderer || !targetViewport.renderer.domElement) return null;

    targetViewport.render();
    return targetViewport.renderer.domElement.toDataURL('image/png');
  },

  /**
   * Exports the active 3D lattice geometry as a standard 3D Wavefront .OBJ file.
   */
  exportOBJ() {
    let targetViewport = (State.viewportMode === 'single-kryst') ? this.viewports.kryst : this.viewports.life;
    if (!targetViewport || !targetViewport.currentGeometry) return null;

    const { spheres, guides } = targetViewport.currentGeometry;
    let obj = `# Sacred Geometry Studio 3D FCC Model\n# Spheres: ${spheres.length}, Lattice Struts: ${guides.length}\no SacredGeometry3D\n\n`;

    // Write sphere vertices
    for (let i = 0; i < spheres.length; i++) {
      const s = spheres[i];
      obj += `v ${s.x.toFixed(4)} ${s.y.toFixed(4)} ${s.z.toFixed(4)}\n`;
    }

    // Write lattice strut line segments
    if (guides && guides.length > 0) {
      obj += `\n# Lattice Struts\n`;
      // Find closest vertex indices
      const tolSq = (1e-2 * (State.r || 50)) ** 2;
      for (let g = 0; g < guides.length; g++) {
        const strut = guides[g];
        let idx1 = -1, idx2 = -1;
        for (let i = 0; i < spheres.length; i++) {
          const s = spheres[i];
          if ((s.x - strut.p1.x)**2 + (s.y - strut.p1.y)**2 + (s.z - strut.p1.z)**2 < tolSq) idx1 = i + 1;
          if ((s.x - strut.p2.x)**2 + (s.y - strut.p2.y)**2 + (s.z - strut.p2.z)**2 < tolSq) idx2 = i + 1;
          if (idx1 !== -1 && idx2 !== -1) break;
        }
        if (idx1 !== -1 && idx2 !== -1) {
          obj += `l ${idx1} ${idx2}\n`;
        }
      }
    }

    return obj;
  }
};

export { Renderer3D };
export default Renderer3D;
