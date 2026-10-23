/**
 * 3D WEBGL RENDERING ENGINE (js/renderer3d.js)
 * High-performance Instanced 3D WebGL renderer powered by Three.js.
 * Renders the 3D Volumetric Flower of Kryst jammed crystalline lattice,
 * FCC close-packed spheres, multi-mode color coding, 3D slicing,
 * variable transparency, polyhedral wireframes, and saturation diagnostics.
 */
import * as THREE_IMPORT from 'https://esm.sh/three@0.160.0';
import { OrbitControls as OrbitControls_IMPORT } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { State, LayerColors } from './state.js';
import { SacredMath3D } from './geometry3d.js';

let THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : THREE_IMPORT;
let OrbitControls = (typeof window !== 'undefined' && window.OrbitControls) ? window.OrbitControls : OrbitControls_IMPORT;

/* =========================================================================
   GEOMETRY MERGING HELPERS (Self-contained, zero external dependencies)
   ========================================================================= */

/**
 * Merges multiple BufferGeometries into one.
 * @param {Array<THREE.BufferGeometry>} geos
 * @returns {THREE.BufferGeometry}
 */
function mergeGeometries(geos) {
  let totalPos = 0;
  let totalIdx = 0;
  for (let i = 0; i < geos.length; i++) {
    const g = geos[i];
    if (g.attributes.position) totalPos += g.attributes.position.array.length;
    if (g.index) totalIdx += g.index.array.length;
  }

  const posArr = new Float32Array(totalPos);
  const idxArr = totalIdx > 0 ? new Uint32Array(totalIdx) : null;
  let posOffset = 0;
  let idxOffset = 0;
  let vertexOffset = 0;

  for (let i = 0; i < geos.length; i++) {
    const g = geos[i];
    if (g.attributes.position) {
      posArr.set(g.attributes.position.array, posOffset);
      if (g.index && idxArr) {
        for (let j = 0; j < g.index.array.length; j++) {
          idxArr[idxOffset + j] = g.index.array[j] + vertexOffset;
        }
        idxOffset += g.index.array.length;
      }
      vertexOffset += g.attributes.position.count;
      posOffset += g.attributes.position.array.length;
    }
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  if (idxArr) merged.setIndex(new THREE.BufferAttribute(idxArr, 1));
  merged.computeVertexNormals();
  return merged;
}

/**
 * Creates a merged 3-orthogonal-ring great-circle geometry (XY, XZ, YZ rings).
 * @param {number} r - Base radius
 * @param {number} [tubeR=0.9] - Tube thickness
 * @param {number} [radialSegs=4]
 * @param {number} [tubularSegs=48]
 * @returns {THREE.BufferGeometry}
 */
function create3RingGeometry(r, tubeR = 0.9, radialSegs = 4, tubularSegs = 48) {
  const gXY = new THREE.TorusGeometry(r, tubeR, radialSegs, tubularSegs);
  const gXZ = new THREE.TorusGeometry(r, tubeR, radialSegs, tubularSegs);
  gXZ.rotateX(Math.PI / 2);
  const gYZ = new THREE.TorusGeometry(r, tubeR, radialSegs, tubularSegs);
  gYZ.rotateY(Math.PI / 2);

  const merged = mergeGeometries([gXY, gXZ, gYZ]);
  gXY.dispose();
  gXZ.dispose();
  gYZ.dispose();
  return merged;
}

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

    // Containers & Groups
    this.objectsGroup = null;
    this.capsGroup = null;
    this.highlightGroup = null;

    // Active clipping planes
    this.clipPlanes = [];
    this.materialsList = [];

    // Current cached geometry & instanced meshes
    this.currentGeometry = null;
    this.raycastableMeshes = [];
    this.allInstancedMeshes = [];

    // Hover & selection state
    this.hoveredSphere = null;
    this.selectedSphere = null;

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
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 20000);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(500, 700, 600);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.4);
    dirLight2.position.set(-500, -400, -300);
    this.scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xeab308, 0.9);
    dirLight3.position.set(0, -600, 300);
    this.scene.add(dirLight3);

    // Subtle orientation circle in XY plane
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

    // Dynamic Groups
    this.objectsGroup = new THREE.Group();
    this.scene.add(this.objectsGroup);

    this.capsGroup = new THREE.Group();
    this.scene.add(this.capsGroup);

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
      if (this.hoveredSphere) {
        this.selectSphere(this.hoveredSphere);
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
      this.camera.position.set(0, 0, dist * 1.5);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(0, 0, 0);
      if (this.controls) this.controls.target.set(0, 0, 0);
    } else if (preset === 'front') {
      this.camera.position.set(0, -dist * 1.5, 0);
      this.camera.up.set(0, 0, 1);
      this.camera.lookAt(0, 0, 0);
      if (this.controls) this.controls.target.set(0, 0, 0);
    } else {
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

  /* =========================================================================
     SLICING & CLIPPING PLANES
     ========================================================================= */

  updateZSlice() {
    this.updateClippingPlanes();
  }

  updateClippingPlanes() {
    const bound = (this.currentGeometry && this.currentGeometry.boundingRadius) ? this.currentGeometry.boundingRadius : 350;
    const r = State.r || 50;
    const sliceMode = State.sliceAxisMode || 'z';
    const sliceFrac = (State.sliceOffset !== undefined ? State.sliceOffset : (State.sliceZ !== undefined ? State.sliceZ : 100)) / 100;
    const offset = sliceFrac * bound;
    const isSlab = !!State.sliceSlabMode;
    const thickness = (State.sliceSlabThickness !== undefined ? State.sliceSlabThickness : 3) * r;

    this.clipPlanes = [];

    if (sliceMode !== 'radial') {
      let normal = new THREE.Vector3(0, 0, 1);
      if (sliceMode === 'x') normal.set(1, 0, 0);
      else if (sliceMode === 'y') normal.set(0, 1, 0);
      else if (sliceMode === 'diag') normal.set(1, 1, 1).normalize();

      if (isSlab) {
        // Slab mode: cuts points above offset + W/2 and below offset - W/2
        const planeTop = new THREE.Plane(normal.clone().negate(), offset + thickness / 2);
        const planeBottom = new THREE.Plane(normal.clone(), -(offset - thickness / 2));
        this.clipPlanes.push(planeTop, planeBottom);
      } else {
        // Half-space cut: only clip if fraction < 0.99
        if (sliceFrac < 0.99) {
          const planeCut = new THREE.Plane(normal.clone().negate(), offset);
          this.clipPlanes.push(planeCut);
        }
      }
    }

    // Apply clipping planes to all active materials
    for (let i = 0; i < this.materialsList.length; i++) {
      this.materialsList[i].clippingPlanes = this.clipPlanes;
      this.materialsList[i].needsUpdate = true;
    }

    this.updateRadialShellVisibility();
    this.updateSectionCaps();
  }

  updateRadialShellVisibility() {
    const sliceMode = State.sliceAxisMode || 'z';
    const bound = (this.currentGeometry && this.currentGeometry.boundingRadius) ? this.currentGeometry.boundingRadius : 350;
    const maxK = State.sliceRadialShell || State.N || 2;
    const maxDist = ((State.sliceOffset !== undefined ? State.sliceOffset : 100) / 100) * bound;
    const isRadial = (sliceMode === 'radial');

    const matrix = new THREE.Matrix4();
    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    for (let m = 0; m < this.allInstancedMeshes.length; m++) {
      const mesh = this.allInstancedMeshes[m];
      const spheres = mesh.userData.spheres;
      if (!spheres) continue;

      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];
        const sDist = (s.d !== undefined) ? s.d : Math.hypot(s.x, s.y, s.z);
        const sK = (s.k !== undefined) ? s.k : (s.layer !== undefined ? s.layer : 1);
        if (isRadial && (sK > maxK || sDist > maxDist)) {
          mesh.setMatrixAt(i, zeroMatrix);
        } else {
          const scale = mesh.userData.baseScale || 1.0;
          matrix.makeScale(scale, scale, scale);
          matrix.setPosition(s.x, s.y, s.z);
          mesh.setMatrixAt(i, matrix);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /* =========================================================================
     CROSS-SECTION SOLID CAP FACES GENERATOR
     ========================================================================= */

  updateSectionCaps() {
    if (!this.capsGroup) return;

    // Dispose old caps
    while (this.capsGroup.children.length > 0) {
      const child = this.capsGroup.children[0];
      const rIdx = this.raycastableMeshes.indexOf(child);
      if (rIdx >= 0) this.raycastableMeshes.splice(rIdx, 1);
      if (child.geometry && typeof child.geometry.dispose === 'function') child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
        } else if (typeof child.material.dispose === 'function') {
          child.material.dispose();
        }
      }
      this.capsGroup.remove(child);
    }

    if (!this.currentGeometry || !this.currentGeometry.spheres || this.currentGeometry.spheres.length === 0) return;
    if (State.show3DSpheres === false || State.sphereStyle3D === 'rings') return;

    const sliceMode = State.sliceAxisMode || 'z';
    if (sliceMode === 'radial') return;

    const bound = (this.currentGeometry && this.currentGeometry.boundingRadius) ? this.currentGeometry.boundingRadius : 350;
    const r = State.r || 50;
    const baseRadiusScale = (State.sphereRadiusScale !== undefined ? State.sphereRadiusScale : 1.0) * r;
    const sliceFrac = (State.sliceOffset !== undefined ? State.sliceOffset : (State.sliceZ !== undefined ? State.sliceZ : 100)) / 100;
    const offset = sliceFrac * bound;
    const isSlab = !!State.sliceSlabMode;
    const thickness = (State.sliceSlabThickness !== undefined ? State.sliceSlabThickness : 3) * r;

    // If half-space cut and sliceFrac >= 0.99, nothing is clipped
    if (!isSlab && sliceFrac >= 0.99) return;

    let normal = new THREE.Vector3(0, 0, 1);
    if (sliceMode === 'x') normal.set(1, 0, 0);
    else if (sliceMode === 'y') normal.set(0, 1, 0);
    else if (sliceMode === 'diag') normal.set(1, 1, 1).normalize();

    // Planes configuration
    const planes = [];
    if (isSlab) {
      // Top cut plane at offset + thickness / 2
      planes.push({
        offset: offset + thickness / 2,
        normal: normal.clone(),
        isTop: true
      });
      // Bottom cut plane at offset - thickness / 2
      planes.push({
        offset: offset - thickness / 2,
        normal: normal.clone().negate(),
        isTop: false
      });
    } else {
      // Single half-space cut plane at offset
      planes.push({
        offset: offset,
        normal: normal.clone(),
        isTop: true
      });
    }

    const spheres = this.currentGeometry.spheres;
    const capEntries = [];
    const colorScheme = State.colorCoding3D || 'classic';
    const totalN = State.N || 2;

    for (let pIdx = 0; pIdx < planes.length; pIdx++) {
      const pl = planes[pIdx];
      const plOffset = pl.offset;
      const plNorm = pl.normal;

      for (let sIdx = 0; sIdx < spheres.length; sIdx++) {
        const s = spheres[sIdx];
        const distToCenter = s.x * normal.x + s.y * normal.y + s.z * normal.z;

        const h = pl.isTop ? (distToCenter - plOffset) : (plOffset - distToCenter);

        if (Math.abs(h) < baseRadiusScale) {
          const rCapSq = baseRadiusScale * baseRadiusScale - h * h;
          if (rCapSq <= 0.25) continue;
          const rCap = Math.sqrt(rCapSq);

          const capCenter = new THREE.Vector3(
            s.x + (plOffset - distToCenter) * normal.x,
            s.y + (plOffset - distToCenter) * normal.y,
            s.z + (plOffset - distToCenter) * normal.z
          );

          if (isSlab) {
            const bottomBoundary = offset - thickness / 2 - 1e-2;
            const topBoundary = offset + thickness / 2 + 1e-2;
            const capDist = capCenter.x * normal.x + capCenter.y * normal.y + capCenter.z * normal.z;
            if (capDist < bottomBoundary || capDist > topBoundary) continue;
          }

          const col = this.getColorForSphere(s, colorScheme, totalN);

          capEntries.push({
            pos: capCenter,
            normal: plNorm,
            radius: rCap,
            color: col,
            sphere: s
          });
        }
      }
    }

    if (capEntries.length === 0) return;

    // Create InstancedMesh for solid cross-section faces
    const circleGeo = (typeof THREE.CircleGeometry === 'function')
      ? new THREE.CircleGeometry(1, 64)
      : new THREE.BufferGeometry();
    const maxBound = Math.max(bound, 2000);
    circleGeo.boundingSphere = (typeof THREE.Sphere === 'function')
      ? new THREE.Sphere(new THREE.Vector3(0, 0, 0), maxBound * 5)
      : { center: new THREE.Vector3(0, 0, 0), radius: maxBound * 5 };

    const MatClass = (typeof THREE.MeshPhysicalMaterial === 'function')
      ? THREE.MeshPhysicalMaterial
      : THREE.MeshBasicMaterial;

    const capMat = new MatClass({
      roughness: 0.18,
      metalness: 0.12,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0
    });

    const capsMesh = new THREE.InstancedMesh(circleGeo, capMat, capEntries.length);
    capsMesh.frustumCulled = false;
    capsMesh.renderOrder = 3;
    capsMesh.userData.spheres = capEntries.map(e => e.sphere);

    const m = new THREE.Matrix4();
    const posVec = new THREE.Vector3();
    const scaleVec = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const upZ = new THREE.Vector3(0, 0, 1);

    for (let i = 0; i < capEntries.length; i++) {
      const entry = capEntries[i];
      posVec.copy(entry.pos);
      scaleVec.set(entry.radius, entry.radius, 1);
      if (typeof q.setFromUnitVectors === 'function') {
        q.setFromUnitVectors(upZ, entry.normal);
      }
      if (typeof m.compose === 'function') {
        m.compose(posVec, q, scaleVec);
      } else {
        m.makeTranslation(posVec.x, posVec.y, posVec.z);
      }
      capsMesh.setMatrixAt(i, m);
      capsMesh.setColorAt(i, entry.color);
    }

    capsMesh.instanceMatrix.needsUpdate = true;
    if (capsMesh.instanceColor) capsMesh.instanceColor.needsUpdate = true;

    this.capsGroup.add(capsMesh);
    this.raycastableMeshes.push(capsMesh);
  }

  /* =========================================================================
     MULTI-MODE COLOR CODING HELPER
     ========================================================================= */

  getColorForSphere(s, scheme, totalN) {
    const c = new THREE.Color();
    if (scheme === 'polyhedral') {
      if (s.role === 'center') c.set('#ffffff');
      else if (s.polyhedronType === 'Rhombic Dodecahedron Core' || s.role === 'hex_core') c.set('#2563eb');
      else if (s.polyhedronType === 'Cuboctahedron Cap' || s.role === 'hex_octant') c.set('#06b6d4');
      else if (s.polyhedronType === 'Regular Octahedron (6-Sphere)') c.set('#10b981');
      else if (s.polyhedronType === 'Regular Tetrahedron (4-Sphere)' || s.role === 'tri_tet' || s.role === 'tri_axis') c.set('#f59e0b');
      else c.set('#3b82f6');
    } else if (scheme === 'axis_octant') {
      if (s.octantId === 0) {
        if (s.role === 'center') c.set('#ffffff');
        else if (s.role === 'hex_axis' || s.role === 'hex_core') c.set('#38bdf8');
        else c.set('#facc15');
      } else {
        const octantPalette = [
          '#f43f5e', '#8b5cf6', '#06b6d4', '#10b981',
          '#f97316', '#ec4899', '#eab308', '#3b82f6'
        ];
        c.set(octantPalette[(s.octantId - 1) % 8]);
      }
    } else if (scheme === 'concentric_shell') {
      const frac = Math.min(1.0, Math.max(0.0, ((s.k || s.layer || 1) - 1) / Math.max(1, totalN - 1)));
      const hue = (190 + frac * 210) % 360;
      c.setHSL(hue / 360, 0.9, 0.55);
    } else {
      // Classic Kryst Role (Default)
      if (s.role === 'center') c.set('#ffffff');
      else if (s.role === 'hex_core' || s.role === 'hex_axis' || s.role === 'hex_octant') c.set('#3b82f6');
      else if (s.role === 'tri_axis' || s.role === 'tri_tet') c.set('#eab308');
      else c.set('#38bdf8');
    }
    return c;
  }

  /* =========================================================================
     SCENE GENERATION & RENDERING ENGINE
     ========================================================================= */

  updateSceneData() {
    if (!this.objectsGroup) return;

    // Dispose old meshes and materials
    while (this.objectsGroup.children.length > 0) {
      const child = this.objectsGroup.children[0];
      if (child.geometry && typeof child.geometry.dispose === 'function') child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
        } else if (typeof child.material.dispose === 'function') {
          child.material.dispose();
        }
      }
      this.objectsGroup.remove(child);
    }
    this.clearHighlight();
    this.materialsList = [];
    this.raycastableMeshes = [];
    this.allInstancedMeshes = [];

    const r = State.r || 50;
    const model = State.model3D || 'volumetric_kryst';

    // 1. Obtain Geometry Data
    if (model === 'volumetric_kryst') {
      const effective3DN = Math.max(1, Math.min(State.N, 6));
      if (State.viewportMode === 'superimposed') {
        const lifeGeom = SacredMath3D.getLife3DGeometry(effective3DN, r);
        const krystGeom = SacredMath3D.getKrystGeometry3D(effective3DN, r);
        this.currentGeometry = {
          spheres: [...lifeGeom.spheres.map(s => ({ ...s, pattern: 'life' })), ...krystGeom.spheres.map(s => ({ ...s, pattern: 'kryst' }))],
          guides: [...lifeGeom.guides, ...krystGeom.guides],
          boundingRadius: Math.max(lifeGeom.boundingRadius, krystGeom.boundingRadius)
        };
      } else if (this.patternKey === 'life') {
        this.currentGeometry = SacredMath3D.getLife3DGeometry(effective3DN, r);
      } else {
        this.currentGeometry = SacredMath3D.getKrystGeometry3D(effective3DN, r);
      }
    } else if (model === 'triaxial') {
      const triaxialOpts = {
        infillSteps: State.infillSteps !== undefined ? State.infillSteps : 2,
        infillMode: State.triaxialInfill || 'both',
        showPlaneXY: State.showPlaneXY !== false,
        showPlaneXZ: State.showPlaneXZ !== false,
        showPlaneYZ: State.showPlaneYZ !== false,
        showInfill3D: State.showInfill3D !== false
      };
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
      // FCC close-packing mode
      const effective3DN = Math.max(1, Math.min(State.N, 6));
      if (State.viewportMode === 'superimposed') {
        const lifeGeom = SacredMath3D.getLife3DGeometry(effective3DN, r);
        const krystGeom = SacredMath3D.getKryst3DGeometry(effective3DN, r, { expansionMode: State.fccExpansionMode || 'volumetric' });
        this.currentGeometry = {
          spheres: [...lifeGeom.spheres.map(s => ({ ...s, pattern: 'life' })), ...krystGeom.spheres.map(s => ({ ...s, pattern: 'kryst' }))],
          guides: [...lifeGeom.guides, ...krystGeom.guides],
          boundingRadius: Math.max(lifeGeom.boundingRadius, krystGeom.boundingRadius)
        };
      } else if (this.patternKey === 'life') {
        this.currentGeometry = SacredMath3D.getLife3DGeometry(effective3DN, r);
      } else {
        this.currentGeometry = SacredMath3D.getKryst3DGeometry(effective3DN, r, { expansionMode: State.fccExpansionMode || 'volumetric' });
      }
    }

    const { spheres, guides, boundingRadius } = this.currentGeometry;

    // 2. Setup GPU Instanced Spheres
    if (State.show3DSpheres !== false && spheres.length > 0) {
      const sphereStyle = State.sphereStyle3D || 'solid';
      const colorScheme = State.colorCoding3D || 'classic';
      const baseRadiusScale = (State.sphereRadiusScale !== undefined ? State.sphereRadiusScale : 1.0) * r;
      const isFresnel = !!State.fresnelGhostMode;

      // Group spheres semantically to allow independent opacity matrix controls
      // Ensure EVERY sphere is accounted for (no dropped spheres from undefined octantId)
      const groups = {
        skeletonCores: [],
        skeletonFillers: [],
        octantCores: [],
        octantFillers: [],
        centers: []
      };

      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];
        if (s.role === 'center' || s.role === 'hexagon-center') {
          groups.centers.push(s);
        } else if (s.octantId !== undefined && s.octantId > 0) {
          if (s.role === 'tri_tet' || s.role === 'triangle') {
            groups.octantFillers.push(s);
          } else {
            groups.octantCores.push(s);
          }
        } else {
          // Cartesian planes (octantId === 0) or undefined octantId (FCC Flower of Life / Triaxial)
          if (s.role === 'tri_axis' || s.role === 'tri_tet' || s.role === 'triangle') {
            groups.skeletonFillers.push(s);
          } else {
            groups.skeletonCores.push(s);
          }
        }
      }

      const groupConfigs = [
        { key: 'skeletonCores', list: groups.skeletonCores, opacity: (State.opacityHexCores !== undefined ? State.opacityHexCores : 0.90) * (State.opacitySkeleton !== undefined ? State.opacitySkeleton : 1.0) },
        { key: 'skeletonFillers', list: groups.skeletonFillers, opacity: (State.opacityTetraFillers !== undefined ? State.opacityTetraFillers : 0.85) * (State.opacitySkeleton !== undefined ? State.opacitySkeleton : 1.0) },
        { key: 'octantCores', list: groups.octantCores, opacity: (State.opacityHexCores !== undefined ? State.opacityHexCores : 0.90) * (State.opacityOctantFill !== undefined ? State.opacityOctantFill : 1.0) },
        { key: 'octantFillers', list: groups.octantFillers, opacity: (State.opacityTetraFillers !== undefined ? State.opacityTetraFillers : 0.85) * (State.opacityOctantFill !== undefined ? State.opacityOctantFill : 1.0) },
        { key: 'centers', list: groups.centers, opacity: (State.opacitySkeleton !== undefined ? State.opacitySkeleton : 1.0) }
      ];

      // A. Solid Lit 3D Spheres
      if (sphereStyle === 'solid' || sphereStyle === 'both') {
        const solidGeo = new THREE.SphereGeometry(1, 26, 18);
        const maxBound = Math.max(boundingRadius || 500, 2000);
        solidGeo.boundingSphere = (typeof THREE.Sphere === 'function')
          ? new THREE.Sphere(new THREE.Vector3(0, 0, 0), maxBound * 5)
          : { center: new THREE.Vector3(0, 0, 0), radius: maxBound * 5 };

        for (let g = 0; g < groupConfigs.length; g++) {
          const cfg = groupConfigs[g];
          if (!cfg.list || cfg.list.length === 0) continue;

          const isTrans = cfg.opacity < 0.98 || isFresnel;
          const solidMat = new THREE.MeshPhysicalMaterial({
            roughness: State.sphereRoughness !== undefined ? State.sphereRoughness : 0.15,
            metalness: State.sphereMetalness !== undefined ? State.sphereMetalness : 0.1,
            clearcoat: 0.8,
            clearcoatRoughness: 0.15,
            transparent: isTrans,
            opacity: cfg.opacity,
            depthWrite: true,
            side: THREE.FrontSide
          });

          // Holographic X-Ray / Fresnel Ghost Mode
          if (isFresnel) {
            solidMat.onBeforeCompile = (shader) => {
              shader.uniforms.uFresnelPower = { value: 2.2 };
              shader.uniforms.uBaseAlpha = { value: 0.15 };
              shader.uniforms.uEdgeAlpha = { value: 0.95 };
              shader.fragmentShader = `
                uniform float uFresnelPower;
                uniform float uBaseAlpha;
                uniform float uEdgeAlpha;
              ` + shader.fragmentShader;
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
                #include <dithering_fragment>
                #ifdef USE_NORMAL
                  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(-vViewPosition)), 0.0), uFresnelPower);
                  gl_FragColor.a = mix(uBaseAlpha * gl_FragColor.a, uEdgeAlpha, fresnel);
                  gl_FragColor.rgb += vec3(0.15, 0.35, 0.6) * (fresnel * 0.5);
                #endif
                `
              );
            };
          }

          this.materialsList.push(solidMat);

          const instMesh = new THREE.InstancedMesh(solidGeo, solidMat, cfg.list.length);
          instMesh.frustumCulled = false;
          instMesh.renderOrder = 0;
          instMesh.userData.spheres = cfg.list;
          instMesh.userData.baseScale = baseRadiusScale;

          const matrix = new THREE.Matrix4();
          for (let i = 0; i < cfg.list.length; i++) {
            const s = cfg.list[i];
            matrix.makeScale(baseRadiusScale, baseRadiusScale, baseRadiusScale);
            matrix.setPosition(s.x, s.y, s.z);
            instMesh.setMatrixAt(i, matrix);

            const col = this.getColorForSphere(s, colorScheme, State.N || 2);
            instMesh.setColorAt(i, col);
          }

          instMesh.instanceMatrix.needsUpdate = true;
          if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
          this.objectsGroup.add(instMesh);
          this.raycastableMeshes.push(instMesh);
          this.allInstancedMeshes.push(instMesh);
        }
      }

      // B. 3-Axis Wireframe Ring Spheres (3 orthogonal great circles per sphere)
      if (sphereStyle === 'rings' || sphereStyle === 'both') {
        const ringGeo = create3RingGeometry(r, Math.max(0.8, r * 0.02), 4, 36);
        const maxBound = Math.max(boundingRadius || 500, 2000);
        ringGeo.boundingSphere = (typeof THREE.Sphere === 'function')
          ? new THREE.Sphere(new THREE.Vector3(0, 0, 0), maxBound * 5)
          : { center: new THREE.Vector3(0, 0, 0), radius: maxBound * 5 };

        const ringMat = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: true
        });
        this.materialsList.push(ringMat);

        const ringsMesh = new THREE.InstancedMesh(ringGeo, ringMat, spheres.length);
        ringsMesh.frustumCulled = false;
        ringsMesh.renderOrder = 1;
        ringsMesh.userData.spheres = spheres;
        ringsMesh.userData.baseScale = 1.0;

        const matrix = new THREE.Matrix4();
        for (let i = 0; i < spheres.length; i++) {
          const s = spheres[i];
          matrix.makeTranslation(s.x, s.y, s.z);
          ringsMesh.setMatrixAt(i, matrix);

          const col = this.getColorForSphere(s, colorScheme, State.N || 2);
          ringsMesh.setColorAt(i, col);
        }

        ringsMesh.instanceMatrix.needsUpdate = true;
        if (ringsMesh.instanceColor) ringsMesh.instanceColor.needsUpdate = true;
        this.objectsGroup.add(ringsMesh);
        if (sphereStyle === 'rings') {
          this.raycastableMeshes.push(ringsMesh);
        }
        this.allInstancedMeshes.push(ringsMesh);
      }
    }

    // 3. Overlapping Aura Spheres / Shells (R = 2r)
    if (State.show3DShells && spheres.length > 0) {
      const shellGeo = new THREE.SphereGeometry(2 * r, 22, 16);
      const maxBound = Math.max(boundingRadius || 500, 2000);
      shellGeo.boundingSphere = (typeof THREE.Sphere === 'function')
        ? new THREE.Sphere(new THREE.Vector3(0, 0, 0), maxBound * 5)
        : { center: new THREE.Vector3(0, 0, 0), radius: maxBound * 5 };
      const auraOpacity = State.opacityAura3D !== undefined ? State.opacityAura3D : 0.18;
      const shellMat = new THREE.MeshPhysicalMaterial({
        color: this.patternKey === 'life' ? (State.colorLife || '#ef4444') : (State.colorKryst || '#10b981'),
        transparent: true,
        opacity: auraOpacity,
        depthWrite: false,
        side: THREE.FrontSide,
        roughness: 0.1,
        metalness: 0.1
      });
      this.materialsList.push(shellMat);

      const auraMesh = new THREE.InstancedMesh(shellGeo, shellMat, spheres.length);
      auraMesh.frustumCulled = false;
      auraMesh.renderOrder = 10;
      auraMesh.userData.spheres = spheres;
      auraMesh.userData.baseScale = 1.0;

      const matrix = new THREE.Matrix4();
      for (let i = 0; i < spheres.length; i++) {
        matrix.makeTranslation(spheres[i].x, spheres[i].y, spheres[i].z);
        auraMesh.setMatrixAt(i, matrix);
      }
      auraMesh.instanceMatrix.needsUpdate = true;
      this.objectsGroup.add(auraMesh);
      this.allInstancedMeshes.push(auraMesh);
    }

    // 4. Polyhedral Wireframe Guides
    if (State.show3DGuides && guides && guides.length > 0) {
      const guideOpacity = State.opacityGuides3D !== undefined ? State.opacityGuides3D : 0.70;

      // Group A: Rhombic Dodecahedra & Hexagons (Orange #f97316)
      if (State.showRhombicGuides !== false) {
        const rhombicPositions = [];
        for (let i = 0; i < guides.length; i++) {
          const g = guides[i];
          if (g.type === 'rhombic_core' || g.type === 'hexagon' || g.type === 'hex_cap' || g.plane === 'XY' || g.plane === 'XZ' || g.plane === 'YZ') {
            rhombicPositions.push(g.p1.x, g.p1.y, g.p1.z, g.p2.x, g.p2.y, g.p2.z);
          }
        }
        if (rhombicPositions.length > 0) {
          const rhombicGeo = new THREE.BufferGeometry();
          rhombicGeo.setAttribute('position', new THREE.Float32BufferAttribute(rhombicPositions, 3));
          if (typeof rhombicGeo.computeBoundingSphere === 'function') rhombicGeo.computeBoundingSphere();
          const rhombicMat = new THREE.LineBasicMaterial({
            color: new THREE.Color('#f97316'),
            transparent: true,
            opacity: guideOpacity
          });
          this.materialsList.push(rhombicMat);
          const rhombicSegments = new THREE.LineSegments(rhombicGeo, rhombicMat);
          rhombicSegments.frustumCulled = false;
          rhombicSegments.renderOrder = 2;
          this.objectsGroup.add(rhombicSegments);
        }
      }

      // Group B: 3D Regular Tetrahedra & Octahedra (Golden-Yellow #fbbf24)
      if (State.showTetraGuides !== false) {
        const tetraPositions = [];
        for (let i = 0; i < guides.length; i++) {
          const g = guides[i];
          if (g.type === 'tetrahedron' || g.type === 'octahedron' || g.type === 'strut' || g.type === 'triangle') {
            tetraPositions.push(g.p1.x, g.p1.y, g.p1.z, g.p2.x, g.p2.y, g.p2.z);
          }
        }
        if (tetraPositions.length > 0) {
          const tetraGeo = new THREE.BufferGeometry();
          tetraGeo.setAttribute('position', new THREE.Float32BufferAttribute(tetraPositions, 3));
          if (typeof tetraGeo.computeBoundingSphere === 'function') tetraGeo.computeBoundingSphere();
          const tetraMat = new THREE.LineBasicMaterial({
            color: new THREE.Color('#fbbf24'),
            transparent: true,
            opacity: guideOpacity
          });
          this.materialsList.push(tetraMat);
          const tetraSegments = new THREE.LineSegments(tetraGeo, tetraMat);
          tetraSegments.frustumCulled = false;
          tetraSegments.renderOrder = 2;
          this.objectsGroup.add(tetraSegments);
        }
      }
    }

    // 5. Axial Orthogonal Bounding Rings (XY, XZ, YZ)
    if (State.showAxialRims !== false && boundingRadius > 0) {
      const ringRad = Math.max(10, boundingRadius);
      const ringThick = Math.max(1.2, r * 0.03);
      const ringGeo = new THREE.TorusGeometry(ringRad, ringThick, 6, 96);

      // Ring XY (z = 0) - Electric Cyan
      const matXY = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.45 });
      this.materialsList.push(matXY);
      const meshXY = new THREE.Mesh(ringGeo, matXY);
      meshXY.frustumCulled = false;
      this.objectsGroup.add(meshXY);

      // Ring XZ (y = 0) - Rose / Magenta
      const matXZ = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.45 });
      this.materialsList.push(matXZ);
      const meshXZ = new THREE.Mesh(ringGeo, matXZ);
      meshXZ.rotation.x = Math.PI / 2;
      meshXZ.frustumCulled = false;
      this.objectsGroup.add(meshXZ);

      // Ring YZ (x = 0) - Emerald
      const matYZ = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.45 });
      this.materialsList.push(matYZ);
      const meshYZ = new THREE.Mesh(ringGeo, matYZ);
      meshYZ.rotation.y = Math.PI / 2;
      meshYZ.frustumCulled = false;
      this.objectsGroup.add(meshYZ);
    }

    // 6. Central Zero-Point Marker (Flower of Kryst hollow void indicator)
    if (this.patternKey === 'kryst' || State.viewportMode === 'superimposed') {
      if (State.showZeroPointMarker !== false) {
        const voidGroup = new THREE.Group();

        const voidGeo = new THREE.SphereGeometry(r * 0.45, 16, 12);
        const voidMat = new THREE.MeshBasicMaterial({
          color: 0x06b6d4,
          wireframe: true,
          transparent: true,
          opacity: 0.85
        });
        const voidMesh = new THREE.Mesh(voidGeo, voidMat);
        voidMesh.frustumCulled = false;
        voidGroup.add(voidMesh);

        const coreLight = new THREE.PointLight(0x38bdf8, 2.5, 3 * r);
        voidGroup.add(coreLight);

        this.objectsGroup.add(voidGroup);
      }
    }

    this.updateClippingPlanes();
  }

  /* =========================================================================
     RAYCASTING & INTERACTION INSPECTOR
     ========================================================================= */

  checkRaycast() {
    if (!this.raycastableMeshes || this.raycastableMeshes.length === 0 || !this.camera) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.raycastableMeshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object;
      const instanceId = hit.instanceId;
      if (instanceId !== undefined && mesh.userData && mesh.userData.spheres) {
        const s = mesh.userData.spheres[instanceId];
        if (s) {
          this.hoverSphere(s);
          return;
        }
      }
    }

    this.clearHover();
  }

  hoverSphere(s) {
    if (this.hoveredSphere === s) return;
    this.hoveredSphere = s;

    // Update Geometry Inspector Card HUD
    const inspectPattern = document.getElementById('inspectPattern');
    const inspectLayer = document.getElementById('inspectLayer');
    const inspectDist = document.getElementById('inspectDist') || document.getElementById('inspectRadius');
    const inspectAngle = document.getElementById('inspectAngle');
    const inspectCoords = document.getElementById('inspectCoords');
    const inspectRole = document.getElementById('inspectRole');
    const inspectStatus = document.getElementById('inspectStatus');

    const r = State.r || 50;
    const dVal = s.d !== undefined ? s.d : Math.hypot(s.x, s.y, s.z);

    if (inspectPattern) {
      inspectPattern.textContent = (s.pattern === 'life' || this.patternKey === 'life')
        ? 'Flower of Life (3D FCC)'
        : 'Flower of Kryst (3D Volumetric Jammed Lattice)';
    }

    if (inspectLayer) {
      const octantName = s.octantId === 0
        ? `Cartesian Plane (${s.plane || 'XY'})`
        : `Octant ${s.octantId}`;
      inspectLayer.textContent = `Shell k = ${s.k || s.layer || 1} [${octantName}]`;
    }

    if (inspectDist) {
      inspectDist.textContent = `${dVal.toFixed(1)}px (${(dVal / r).toFixed(2)}r)`;
    }

    if (inspectAngle) {
      const theta = (Math.atan2(s.y, s.x) * (180 / Math.PI)).toFixed(1);
      const polar = (Math.acos(Math.max(-1, Math.min(1, s.z / (dVal || 1)))) * (180 / Math.PI)).toFixed(1);
      inspectAngle.textContent = `θ: ${theta}°, φ: ${polar}°`;
    }

    if (inspectCoords) {
      inspectCoords.textContent = `(${s.x.toFixed(0)}, ${s.y.toFixed(0)}, ${s.z.toFixed(0)})`;
    }

    if (inspectRole) {
      inspectRole.textContent = `${s.polyhedronType || s.role} [${s.role}]`;
    }

    if (inspectStatus) {
      inspectStatus.textContent = 'Inspecting Node';
    }

    this.renderHighlight(s);
  }

  clearHover() {
    if (this.hoveredSphere === null && this.selectedSphere === null) return;
    this.hoveredSphere = null;
    if (this.selectedSphere === null) {
      this.clearHighlight();
    }
  }

  selectSphere(s) {
    this.selectedSphere = s;
    this.renderHighlight(s, true);
  }

  renderHighlight(sphere, isSelected = false) {
    while (this.highlightGroup.children.length > 0) {
      const c = this.highlightGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      this.highlightGroup.remove(c);
    }

    const r = State.r || 50;
    const targetDistSq = (2 * r) * (2 * r);
    const tolSq = (0.08 * r) * (0.08 * r);

    // 1. Primary Highlight Halo
    const haloGeo = new THREE.SphereGeometry(r * 1.05, 24, 18);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.95
    });
    if (this.clipPlanes && this.clipPlanes.length > 0) haloMat.clippingPlanes = this.clipPlanes;
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.frustumCulled = false;
    haloMesh.position.set(sphere.x, sphere.y, sphere.z);
    this.highlightGroup.add(haloMesh);

    // 2. Highlight all mutually tangent neighbor spheres at distance 2r
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
          opacity: 0.65
        });
        if (this.clipPlanes && this.clipPlanes.length > 0) nbMat.clippingPlanes = this.clipPlanes;
        const nbMesh = new THREE.Mesh(nbGeo, nbMat);
        nbMesh.frustumCulled = false;
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

    if (typeof window !== 'undefined') {
      if (window.THREE) THREE = window.THREE;
      if (window.OrbitControls) OrbitControls = window.OrbitControls;
    }

    if (!THREE || !THREE.Scene || !OrbitControls) {
      if (typeof ensureThree === 'function') {
        ensureThree().then(ok => {
          if (ok && !this.isInitialized) {
            if (typeof window !== 'undefined') {
              if (window.THREE) THREE = window.THREE;
              if (window.OrbitControls) OrbitControls = window.OrbitControls;
            }
            this._setupViewports();
          }
        });
      }
      return;
    }

    this._setupViewports();
  },

  _setupViewports() {
    if (this.isInitialized) return;
    if (typeof window !== 'undefined') {
      if (window.THREE) THREE = window.THREE;
      if (window.OrbitControls) OrbitControls = window.OrbitControls;
    }
    if (!THREE || !THREE.Scene || !OrbitControls) return;

    this.viewports.life = new Viewport3D('canvasLife3D', 'life');
    this.viewports.kryst = new Viewport3D('canvasKryst3D', 'kryst');

    this.bindSynchronizedControls();
    this.bindResize();

    this.isInitialized = true;
    this.startAnimationLoop();

    if (State.dimension === '3d') {
      this.resizeAll();
      this.renderAll();
      this.fitCameraAll();
    }
  },

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
        if (this.viewports.life && this.viewports.life.controls) {
          this.viewports.life.controls.autoRotate = !!State.autoRotate3D;
          this.viewports.life.controls.update();
        }
        if (this.viewports.kryst && this.viewports.kryst.controls) {
          this.viewports.kryst.controls.autoRotate = !!State.autoRotate3D;
          this.viewports.kryst.controls.update();
        }

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

  renderAll() {
    if (!this.isInitialized) {
      this.init();
      return;
    }

    this.resizeAll();

    if (State.viewportMode === 'superimposed') {
      if (this.viewports.life) {
        this.viewports.life.updateSceneData();
        this.viewports.life.render();
      }
    } else {
      if (this.viewports.life) {
        this.viewports.life.updateSceneData();
        this.viewports.life.render();
      }
      if (this.viewports.kryst) {
        this.viewports.kryst.updateSceneData();
        this.viewports.kryst.render();
      }
    }

    this.update3DStats();
  },

  updateZSlice() {
    this.updateClippingPlanes();
  },

  updateClippingPlanes() {
    if (this.viewports.life) this.viewports.life.updateClippingPlanes();
    if (this.viewports.kryst) this.viewports.kryst.updateClippingPlanes();
  },

  setCameraPreset(preset) {
    if (this.viewports.life) this.viewports.life.setCameraPreset(preset);
    if (this.viewports.kryst) this.viewports.kryst.setCameraPreset(preset);
  },

  fitCameraAll() {
    if (this.viewports.life) this.viewports.life.fitCamera();
    if (this.viewports.kryst) this.viewports.kryst.fitCamera();
  },

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
      if (fokCountStat) fokCountStat.textContent = `${fokSpheres} Spheres (Volumetric Kryst)`;
      if (sidebarBoundRad) {
        const bound = this.viewports.kryst.currentGeometry.boundingRadius;
        sidebarBoundRad.textContent = `${Math.round(bound)}px (${(bound / (State.r || 50)).toFixed(1)}r)`;
      }
    }
  },

  /**
   * Automated Saturation Diagnostic
   */
  runSaturationDiagnostic() {
    const targetViewport = (State.viewportMode === 'single-kryst') ? this.viewports.kryst : (this.viewports.kryst || this.viewports.life);
    if (!targetViewport || !targetViewport.currentGeometry) return null;

    const r = State.r || 50;
    const geom = targetViewport.currentGeometry;
    const sat = SacredMath3D.checkSaturation(geom.spheres, geom.boundingRadius, r);

    console.log('=== SACRED GEOMETRY 3D VOLUMETRIC SATURATION REPORT ===');
    console.log(`Total Spheres: ${geom.spheres.length}`);
    console.log(`Total Wireframe Guides: ${geom.guides.length}`);
    console.log(`Bounding Radius: ${geom.boundingRadius}px (${(geom.boundingRadius / r).toFixed(1)}r)`);
    console.log(`Origin Exception: ${sat.originPass ? 'PASS (Origin Empty, dist = ' + sat.minOriginDist.toFixed(1) + 'px)' : 'FAIL'}`);
    console.log(`Pairwise Non-Overlap: ${sat.overlapPass ? 'PASS (Min pairwise = ' + sat.minPairwise.toFixed(1) + 'px >= ' + (2 * r - 0.5).toFixed(1) + 'px)' : 'FAIL'}`);
    console.log(`Void-Saturation Guarantee: ${sat.voidCheckPass ? 'PASS (Max void radius = ' + sat.maxVoidRadius.toFixed(1) + 'px < ' + r + 'px, 100% Jammed)' : 'FAIL'}`);

    const inspectStatus = document.getElementById('inspectStatus');
    if (inspectStatus) {
      inspectStatus.textContent = sat.voidCheckPass ? '100% Jammed' : 'Diagnostic Done';
    }

    if (window.UI && window.UI.showToast) {
      window.UI.showToast(`3D Saturation: ${sat.voidCheckPass ? 'PASS (100% Jammed, Zero Voids)' : 'Checked'}`);
    }

    return sat;
  },

  capturePNG() {
    const targetViewport = (State.viewportMode === 'single-kryst') ? this.viewports.kryst : this.viewports.life;
    if (!targetViewport || !targetViewport.renderer || !targetViewport.renderer.domElement) return null;

    targetViewport.render();
    return targetViewport.renderer.domElement.toDataURL('image/png');
  },

  exportOBJ() {
    const targetViewport = (State.viewportMode === 'single-kryst') ? this.viewports.kryst : this.viewports.life;
    if (!targetViewport || !targetViewport.currentGeometry) return null;

    const { spheres, guides } = targetViewport.currentGeometry;
    let obj = `# Sacred Geometry Studio 3D Model\n# Spheres: ${spheres.length}, Guides: ${guides.length}\no SacredGeometry3D\n\n`;

    for (let i = 0; i < spheres.length; i++) {
      const s = spheres[i];
      obj += `v ${s.x.toFixed(4)} ${s.y.toFixed(4)} ${s.z.toFixed(4)}\n`;
    }

    if (guides && guides.length > 0) {
      obj += `\n# Polyhedral Guides & Lattice Struts\n`;
      const tolSq = (1e-2 * (State.r || 50)) ** 2;
      for (let g = 0; g < guides.length; g++) {
        const strut = guides[g];
        let idx1 = -1, idx2 = -1;
        for (let i = 0; i < spheres.length; i++) {
          const s = spheres[i];
          if ((s.x - strut.p1.x) ** 2 + (s.y - strut.p1.y) ** 2 + (s.z - strut.p1.z) ** 2 < tolSq) idx1 = i + 1;
          if ((s.x - strut.p2.x) ** 2 + (s.y - strut.p2.y) ** 2 + (s.z - strut.p2.z) ** 2 < tolSq) idx2 = i + 1;
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
