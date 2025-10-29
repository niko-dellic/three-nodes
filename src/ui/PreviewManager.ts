import * as THREE from 'three';
import { Graph } from '@/core/Graph';
import { Node } from '@/core/Node';
import { SelectionManager } from './SelectionManager';

export type PreviewMode = 'none' | 'selected' | 'all';

export class PreviewManager {
  private graph: Graph;
  private selectionManager: SelectionManager;
  private previewMode: PreviewMode = 'selected'; // Default to 'selected'
  private currentBakedScene: THREE.Scene | null = null;
  private previewMaterial: THREE.Material;
  private nodeObjects: Map<string, THREE.Object3D> = new Map();
  private hiddenNodes: Set<string> = new Set();
  private onChangeCallbacks: Set<() => void> = new Set();

  // Preview materials for cycling through different visualization modes
  private previewMaterials: THREE.Material[];
  private currentMaterialIndex: number = 0;

  // UI elements
  private previewModeSelect: HTMLSelectElement | null = null;
  private previewMaterialSelect: HTMLSelectElement | null = null;

  // Local storage keys
  private readonly PREVIEW_MODE_KEY = 'three-nodes-preview-mode';
  private readonly PREVIEW_MATERIAL_KEY = 'three-nodes-preview-material-index';

  constructor(graph: Graph, selectionManager: SelectionManager) {
    this.graph = graph;
    this.selectionManager = selectionManager;

    // Initialize preview materials - Default is BasicMaterial (unlit), semi-transparent green
    this.previewMaterials = [
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.7,
      }),
      new THREE.MeshNormalMaterial({ wireframe: false, transparent: true, opacity: 0.8 }),
      new THREE.MeshBasicMaterial({
        color: 0xff9900,
        transparent: true,
        opacity: 0.6,
      }),
    ];

    // Default preview material - BasicMaterial, semi-transparent green
    this.previewMaterial = this.previewMaterials[0];

    // Load saved settings from local storage
    this.loadSettings();

    // Listen to graph changes
    this.graph.onChange(() => this.updatePreview());

    // Listen to selection changes
    this.selectionManager.onChange(() => {
      if (this.previewMode === 'selected') {
        this.updatePreview();
      }
    });

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  /**
   * Load preview settings from local storage
   */
  private loadSettings(): void {
    try {
      // Load preview mode
      const savedMode = localStorage.getItem(this.PREVIEW_MODE_KEY);
      if (savedMode && (savedMode === 'none' || savedMode === 'selected' || savedMode === 'all')) {
        this.previewMode = savedMode as PreviewMode;
      }

      // Load material index
      const savedMaterialIndex = localStorage.getItem(this.PREVIEW_MATERIAL_KEY);
      if (savedMaterialIndex !== null) {
        const index = parseInt(savedMaterialIndex, 10);
        if (!isNaN(index) && index >= 0 && index < this.previewMaterials.length) {
          this.currentMaterialIndex = index;
          this.previewMaterial = this.previewMaterials[index];
        }
      }

      this.updatePreview();
    } catch (error) {
      console.warn('Failed to load preview settings from local storage:', error);
    }
  }

  /**
   * Save preview mode to local storage
   */
  private savePreviewMode(): void {
    try {
      localStorage.setItem(this.PREVIEW_MODE_KEY, this.previewMode);
    } catch (error) {
      console.warn('Failed to save preview mode to local storage:', error);
    }
  }

  /**
   * Save material index to local storage
   */
  private saveMaterialIndex(): void {
    try {
      localStorage.setItem(this.PREVIEW_MATERIAL_KEY, this.currentMaterialIndex.toString());
    } catch (error) {
      console.warn('Failed to save material index to local storage:', error);
    }
  }

  /**
   * Initialize the preview UI controls in the provided container
   */
  initializeUI(container: HTMLElement): void {
    // Create preview mode selector
    this.previewModeSelect = document.createElement('select');
    this.previewModeSelect.id = 'preview-mode';
    this.previewModeSelect.title = 'Preview'; // Tooltip
    this.previewModeSelect.innerHTML = `
      <option value="none">None</option>
      <option value="selected">Selected</option>
      <option value="all">All</option>
    `;
    // Set the selected option based on current preview mode
    this.previewModeSelect.value = this.previewMode;
    container.appendChild(this.previewModeSelect);

    // Wire up preview mode change
    this.previewModeSelect.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as PreviewMode;
      this.setPreviewMode(mode);
    });

    // Create preview material selector
    this.previewMaterialSelect = document.createElement('select');
    this.previewMaterialSelect.id = 'preview-material-select';
    this.previewMaterialSelect.title = 'Material'; // Tooltip
    this.previewMaterialSelect.innerHTML = `
      <option value="0">Basic (Green)</option>
      <option value="1">Wireframe</option>
      <option value="2">Normal</option>
      <option value="3">Basic (Orange)</option>
    `;
    // Set the selected option based on current material index
    this.previewMaterialSelect.value = this.currentMaterialIndex.toString();
    container.appendChild(this.previewMaterialSelect);

    // Wire up material selection
    this.previewMaterialSelect.addEventListener('change', (e) => {
      const index = parseInt((e.target as HTMLSelectElement).value);
      this.setMaterialByIndex(index);
    });
  }

  private setupKeyboardShortcuts(): void {
    // V key to toggle visibility in "preview all" mode
    document.addEventListener('keydown', (e) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        if (this.previewMode === 'all') {
          e.preventDefault();
          // Toggle visibility of selected nodes
          const selectedNodes = this.selectionManager.getSelectedNodes();
          for (const nodeId of selectedNodes) {
            this.toggleNodeVisibility(nodeId);
          }
        }
      }
    });
  }

  setPreviewMode(mode: PreviewMode): void {
    this.previewMode = mode;
    this.savePreviewMode(); // Save to local storage
    this.updatePreview();
    this.notifyChange();
  }

  getPreviewMode(): PreviewMode {
    return this.previewMode;
  }

  setPreviewMaterial(material: THREE.Material): void {
    this.previewMaterial = material;
    this.updatePreview();
  }

  getPreviewMaterial(): THREE.Material {
    return this.previewMaterial;
  }

  setMaterialByIndex(index: number): void {
    if (index >= 0 && index < this.previewMaterials.length) {
      this.currentMaterialIndex = index;
      this.previewMaterial = this.previewMaterials[index];
      this.saveMaterialIndex(); // Save to local storage
      this.updatePreview();

      // Update select if it exists
      if (this.previewMaterialSelect) {
        this.previewMaterialSelect.value = index.toString();
      }
    }
  }

  cyclePreviewMaterial(): string {
    this.currentMaterialIndex = (this.currentMaterialIndex + 1) % this.previewMaterials.length;
    this.setMaterialByIndex(this.currentMaterialIndex);
    return this.getCurrentMaterialName();
  }

  getCurrentMaterialName(): string {
    const materialNames = ['Basic (Green)', 'Wireframe', 'Normal', 'Basic (Orange)'];
    return materialNames[this.currentMaterialIndex];
  }

  toggleNodeVisibility(nodeId: string): void {
    if (this.previewMode !== 'all') return;

    if (this.hiddenNodes.has(nodeId)) {
      this.hiddenNodes.delete(nodeId);
    } else {
      this.hiddenNodes.add(nodeId);
    }
    this.updatePreview();
  }

  isNodeVisible(nodeId: string): boolean {
    return !this.hiddenNodes.has(nodeId);
  }

  /**
   * Get the scene to use for preview (baked scene if available, otherwise default scene)
   */
  private getPreviewScene(): THREE.Scene {
    return this.currentBakedScene || this.graph.defaultScene;
  }

  /**
   * Set the current baked scene from the graph output
   */
  setBakedScene(scene: THREE.Scene | null): void {
    // Remove preview objects from old scene
    const oldScene = this.getPreviewScene();
    for (const obj of this.nodeObjects.values()) {
      oldScene.remove(obj);
    }

    this.currentBakedScene = scene;

    // Re-add preview objects to new scene (or default scene if null)
    const newScene = this.getPreviewScene();
    for (const obj of this.nodeObjects.values()) {
      newScene.add(obj);
    }
  }

  private updatePreview(): void {
    // Remove all preview objects from the scene
    const scene = this.getPreviewScene();
    for (const obj of this.nodeObjects.values()) {
      scene.remove(obj);
      // Dispose of cloned materials and geometries
      this.disposeObject(obj);
    }
    this.nodeObjects.clear();

    if (this.previewMode === 'none') {
      this.notifyChange();
      return;
    }

    // Collect nodes to preview
    const nodesToPreview: Node[] = [];

    if (this.previewMode === 'selected') {
      const selectedIds = this.selectionManager.getSelectedNodes();
      for (const nodeId of selectedIds) {
        const node = this.graph.getNode(nodeId);
        if (node) {
          nodesToPreview.push(node);
        }
      }
    } else if (this.previewMode === 'all') {
      nodesToPreview.push(...this.graph.nodes.values());
    }

    // Add objects to baked scene as preview overlays
    for (const node of nodesToPreview) {
      if (this.previewMode === 'all' && this.hiddenNodes.has(node.id)) {
        continue; // Skip hidden nodes
      }

      this.addNodeToPreview(node);
    }

    this.notifyChange();
  }

  private addNodeToPreview(node: Node): void {
    // Track objects we've already added (by uuid) to prevent duplicates
    // This is needed because loader nodes output the same object to multiple ports
    const addedObjects = new Set<string>();

    // Check all output ports for Three.js objects
    for (const output of node.outputs.values()) {
      const value = output.value;

      if (!value) continue;

      // Handle CompiledScene from SceneCompilerNode
      if (
        value &&
        typeof value === 'object' &&
        'objects' in value &&
        Array.isArray(value.objects)
      ) {
        // This is a compiled scene - preview the objects array
        for (const obj of value.objects) {
          if (obj instanceof THREE.Object3D) {
            const objId = node.id + '_obj_' + obj.uuid;
            if (!addedObjects.has(objId)) {
              addedObjects.add(objId);
              this.addObject3DToPreview(objId, obj, true); // Preserve materials
            }
          }
        }
        continue;
      }

      // Handle DirectionalLight specially to show helper
      if (value instanceof THREE.DirectionalLight) {
        const lightId = node.id + '_light_' + value.uuid;
        if (!addedObjects.has(lightId)) {
          addedObjects.add(lightId);
          this.addDirectionalLightToPreview(lightId, value);
        }
        continue;
      }

      // Handle other lights with helpers
      if (value instanceof THREE.PointLight) {
        const lightId = node.id + '_light_' + value.uuid;
        if (!addedObjects.has(lightId)) {
          addedObjects.add(lightId);
          this.addPointLightToPreview(lightId, value);
        }
        continue;
      }

      if (value instanceof THREE.SpotLight) {
        const lightId = node.id + '_light_' + value.uuid;
        if (!addedObjects.has(lightId)) {
          addedObjects.add(lightId);
          this.addSpotLightToPreview(lightId, value);
        }
        continue;
      }

      // Handle different Three.js object types
      if (value instanceof THREE.Object3D) {
        const objId = node.id + '_' + value.uuid;
        if (!addedObjects.has(objId)) {
          addedObjects.add(objId);
          this.addObject3DToPreview(objId, value, true); // Preserve materials for mesh objects
        }
      } else if (value instanceof THREE.BufferGeometry) {
        const geomId = node.id + '_geom_' + value.uuid;
        if (!addedObjects.has(geomId)) {
          addedObjects.add(geomId);
          this.addGeometryToPreview(geomId, value);
        }
      } else if (value instanceof THREE.Material) {
        const matId = node.id + '_mat_' + value.uuid;
        if (!addedObjects.has(matId)) {
          addedObjects.add(matId);
          this.addMaterialPreview(matId, value);
        }
      }
    }
  }

  private addObject3DToPreview(
    nodeId: string,
    object: THREE.Object3D,
    preserveMaterials: boolean = false
  ): void {
    const scene = this.getPreviewScene();

    // Clone the object so we don't affect the original
    const clone = object.clone();

    // Apply preview material to all meshes in the hierarchy (unless preserving materials)
    if (!preserveMaterials) {
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = this.previewMaterial;
        }
      });
    } else {
      // For meshes with materials, make them slightly transparent to distinguish from baked scene
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          // Clone the material and make it semi-transparent
          const material =
            child.material instanceof Array
              ? child.material.map((m) => m.clone())
              : child.material.clone();

          if (Array.isArray(material)) {
            material.forEach((m) => {
              m.transparent = true;
              m.opacity = 0.7;
            });
          } else {
            material.transparent = true;
            material.opacity = 0.7;
          }

          child.material = material;
        }
      });
    }

    this.nodeObjects.set(nodeId, clone);
    scene.add(clone);
  }

  private addGeometryToPreview(nodeId: string, geometry: THREE.BufferGeometry): void {
    const scene = this.getPreviewScene();

    // Handle both single geometry and arrays
    if (Array.isArray(geometry)) {
      // Create a group for multiple geometries
      const group = new THREE.Group();
      for (const geom of geometry) {
        const mesh = new THREE.Mesh(geom.clone(), this.previewMaterial);
        group.add(mesh);
      }
      this.nodeObjects.set(nodeId, group);
      scene.add(group);
    } else {
      // Create a mesh with the preview material
      const mesh = new THREE.Mesh(geometry.clone(), this.previewMaterial);
      this.nodeObjects.set(nodeId, mesh);
      scene.add(mesh);
    }
  }

  private addMaterialPreview(nodeId: string, material: THREE.Material): void {
    const scene = this.getPreviewScene();

    // Create a sphere to show the material
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const mesh = new THREE.Mesh(geometry, material);
    this.nodeObjects.set(nodeId, mesh);
    scene.add(mesh);
  }

  private addDirectionalLightToPreview(nodeId: string, light: THREE.DirectionalLight): void {
    const scene = this.getPreviewScene();

    // Clone the light
    const lightClone = light.clone();

    // Create helper
    const helper = new THREE.DirectionalLightHelper(lightClone, 1);

    // Create a group containing both light and helper
    const group = new THREE.Group();
    group.add(lightClone);
    group.add(helper);

    this.nodeObjects.set(nodeId, group);
    scene.add(group);
  }

  private addPointLightToPreview(nodeId: string, light: THREE.PointLight): void {
    const scene = this.getPreviewScene();

    // Clone the light
    const lightClone = light.clone();

    // Create helper
    const helper = new THREE.PointLightHelper(lightClone, 0.5);

    // Create a group containing both light and helper
    const group = new THREE.Group();
    group.add(lightClone);
    group.add(helper);

    this.nodeObjects.set(nodeId, group);
    scene.add(group);
  }

  private addSpotLightToPreview(nodeId: string, light: THREE.SpotLight): void {
    const scene = this.getPreviewScene();

    // Clone the light
    const lightClone = light.clone();

    // Create helper
    const helper = new THREE.SpotLightHelper(lightClone);

    // Create a group containing both light and helper
    const group = new THREE.Group();
    group.add(lightClone);
    group.add(helper);

    this.nodeObjects.set(nodeId, group);
    scene.add(group);
  }

  /**
   * Properly dispose of an object and all its children
   */
  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      // Dispose geometries
      if (
        child instanceof THREE.Mesh ||
        child instanceof THREE.Line ||
        child instanceof THREE.Points
      ) {
        if (child.geometry) {
          child.geometry.dispose();
        }
      }

      // Dispose materials
      if ('material' in child && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material) {
            // Dispose textures
            Object.keys(material).forEach((key) => {
              const value = (material as any)[key];
              if (value && value.isTexture) {
                value.dispose();
              }
            });
            material.dispose();
          }
        });
      }
    });

    // Clear children
    while (obj.children.length > 0) {
      obj.remove(obj.children[0]);
    }
  }

  /**
   * Clean up - removes all preview objects from the scene
   */
  dispose(): void {
    const scene = this.getPreviewScene();
    for (const obj of this.nodeObjects.values()) {
      scene.remove(obj);
      this.disposeObject(obj);
    }
    this.nodeObjects.clear();
  }

  onChange(callback: () => void): () => void {
    this.onChangeCallbacks.add(callback);
    return () => this.onChangeCallbacks.delete(callback);
  }

  private notifyChange(): void {
    this.onChangeCallbacks.forEach((cb) => cb());
  }

  destroy(): void {
    // Remove all preview objects from the baked scene
    this.dispose();
    this.hiddenNodes.clear();
    this.onChangeCallbacks.clear();
  }
}
