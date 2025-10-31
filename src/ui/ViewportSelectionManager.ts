import * as THREE from 'three';

export type SelectionMode = 'replace' | 'add' | 'toggle';

/**
 * Manages selection state for 3D objects in the viewport
 * Similar to SelectionManager but for Three.js Object3D instances
 */
export class ViewportSelectionManager {
  private selectedObjects: Set<THREE.Object3D> = new Set();
  private listeners: Set<() => void> = new Set();

  // Map objects to their source node IDs for integration with graph
  private objectToNodeMap: Map<THREE.Object3D, string> = new Map();

  constructor() {}

  /**
   * Select a single object
   */
  selectObject(object: THREE.Object3D, mode: SelectionMode = 'replace'): void {
    if (mode === 'replace') {
      this.selectedObjects.clear();
      this.selectedObjects.add(object);
    } else if (mode === 'add') {
      this.selectedObjects.add(object);
    } else if (mode === 'toggle') {
      if (this.selectedObjects.has(object)) {
        this.selectedObjects.delete(object);
      } else {
        this.selectedObjects.add(object);
      }
    }
    this.notifyChange();
  }

  /**
   * Select multiple objects
   */
  selectObjects(objects: THREE.Object3D[], mode: SelectionMode = 'replace'): void {
    if (mode === 'replace') {
      this.selectedObjects.clear();
    }
    for (const object of objects) {
      this.selectedObjects.add(object);
    }
    this.notifyChange();
  }

  /**
   * Deselect a specific object
   */
  deselectObject(object: THREE.Object3D): void {
    this.selectedObjects.delete(object);
    this.notifyChange();
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedObjects.clear();
    this.notifyChange();
  }

  /**
   * Check if an object is selected
   */
  isSelected(object: THREE.Object3D): boolean {
    return this.selectedObjects.has(object);
  }

  /**
   * Get all selected objects
   */
  getSelectedObjects(): Set<THREE.Object3D> {
    return new Set(this.selectedObjects);
  }

  /**
   * Get the primary selected object (first in set)
   */
  getPrimarySelection(): THREE.Object3D | null {
    return this.selectedObjects.values().next().value || null;
  }

  /**
   * Get count of selected objects
   */
  getSelectionCount(): number {
    return this.selectedObjects.size;
  }

  /**
   * Register a source node ID for an object
   */
  registerObjectNode(object: THREE.Object3D, nodeId: string): void {
    this.objectToNodeMap.set(object, nodeId);
  }

  /**
   * Get the source node ID for an object
   */
  getObjectNodeId(object: THREE.Object3D): string | undefined {
    return this.objectToNodeMap.get(object);
  }

  /**
   * Unregister an object (cleanup when object is removed)
   */
  unregisterObject(object: THREE.Object3D): void {
    this.objectToNodeMap.delete(object);
    this.selectedObjects.delete(object);
  }

  /**
   * Subscribe to selection changes
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyChange(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Get selected objects as array
   */
  getSelectedObjectsArray(): THREE.Object3D[] {
    return Array.from(this.selectedObjects);
  }
}

