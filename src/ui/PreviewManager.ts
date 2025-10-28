import * as THREE from 'three';
import { Graph } from '@/core/Graph';
import { Node } from '@/core/Node';
import { SelectionManager } from './SelectionManager';

export type PreviewMode = 'none' | 'selected' | 'all';

export class PreviewManager {
  private graph: Graph;
  private selectionManager: SelectionManager;
  private previewMode: PreviewMode = 'none';
  private previewScene: THREE.Scene;
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

  constructor(graph: Graph, selectionManager: SelectionManager) {
    this.graph = graph;
    this.selectionManager = selectionManager;
    this.previewScene = new THREE.Scene();

    // Initialize preview materials
    this.previewMaterials = [
      new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.7,
      }),
      new THREE.MeshNormalMaterial({ wireframe: false }),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.5,
        roughness: 0.5,
      }),
      new THREE.MeshBasicMaterial({ color: 0xff9900 }),
    ];

    // Default preview material - wireframe for geometry visualization
    this.previewMaterial = this.previewMaterials[0];

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
   * Initialize the preview UI controls in the provided container
   */
  initializeUI(container: HTMLElement): void {
    // Create preview mode label
    const previewModeLabel = document.createElement('label');
    previewModeLabel.textContent = 'Preview:';
    container.appendChild(previewModeLabel);

    // Create preview mode selector
    this.previewModeSelect = document.createElement('select');
    this.previewModeSelect.id = 'preview-mode';
    this.previewModeSelect.innerHTML = `
      <option value="none">None</option>
      <option value="selected">Selected</option>
      <option value="all">All</option>
    `;
    container.appendChild(this.previewModeSelect);

    // Wire up preview mode change
    this.previewModeSelect.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as PreviewMode;
      this.setPreviewMode(mode);
    });

    // Create preview material label
    const materialLabel = document.createElement('label');
    materialLabel.textContent = 'Material:';
    container.appendChild(materialLabel);

    // Create preview material selector
    this.previewMaterialSelect = document.createElement('select');
    this.previewMaterialSelect.id = 'preview-material-select';
    this.previewMaterialSelect.innerHTML = `
      <option value="0">Wireframe</option>
      <option value="1">Normal</option>
      <option value="2">Standard</option>
      <option value="3">Basic</option>
    `;
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
    const materialNames = ['Wireframe', 'Normal', 'Standard', 'Basic'];
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

  getPreviewScene(): THREE.Scene {
    return this.previewScene;
  }

  private updatePreview(): void {
    // Clear preview scene
    this.previewScene.clear();
    this.nodeObjects.clear();

    if (this.previewMode === 'none') {
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

    // Add objects to preview scene
    for (const node of nodesToPreview) {
      if (this.previewMode === 'all' && this.hiddenNodes.has(node.id)) {
        continue; // Skip hidden nodes
      }

      this.addNodeToPreview(node);
    }

    this.notifyChange();
  }

  private addNodeToPreview(node: Node): void {
    // Check all output ports for Three.js objects
    for (const output of node.outputs.values()) {
      const value = output.value;

      if (!value) continue;

      // Handle different Three.js object types
      if (value instanceof THREE.Object3D) {
        this.addObject3DToPreview(node.id, value);
      } else if (value instanceof THREE.BufferGeometry) {
        this.addGeometryToPreview(node.id, value);
      } else if (value instanceof THREE.Material) {
        // Materials alone don't render, but we could show a preview sphere
        this.addMaterialPreview(node.id, value);
      }
    }
  }

  private addObject3DToPreview(nodeId: string, object: THREE.Object3D): void {
    // Clone the object to avoid modifying the original
    const clone = object.clone(true);

    // Override materials with preview material if in wireframe mode
    const isWireframe =
      this.previewMaterial instanceof THREE.MeshBasicMaterial ||
      this.previewMaterial instanceof THREE.MeshStandardMaterial
        ? this.previewMaterial.wireframe
        : false;

    if (isWireframe) {
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = this.previewMaterial;
        }
      });
    }

    this.previewScene.add(clone);
    this.nodeObjects.set(nodeId, clone);
  }

  private addGeometryToPreview(nodeId: string, geometry: THREE.BufferGeometry): void {
    // Create a mesh with the geometry and preview material
    const mesh = new THREE.Mesh(geometry, this.previewMaterial);
    this.previewScene.add(mesh);
    this.nodeObjects.set(nodeId, mesh);
  }

  private addMaterialPreview(nodeId: string, material: THREE.Material): void {
    // Create a sphere to preview the material
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const mesh = new THREE.Mesh(geometry, material);
    this.previewScene.add(mesh);
    this.nodeObjects.set(nodeId, mesh);
  }

  onChange(callback: () => void): () => void {
    this.onChangeCallbacks.add(callback);
    return () => this.onChangeCallbacks.delete(callback);
  }

  private notifyChange(): void {
    this.onChangeCallbacks.forEach((cb) => cb());
  }

  destroy(): void {
    this.previewScene.clear();
    this.nodeObjects.clear();
    this.hiddenNodes.clear();
    this.onChangeCallbacks.clear();
  }
}
