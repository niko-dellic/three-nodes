import { BaseFileLoaderNode } from './BaseFileLoaderNode';
import { Rhino3dmLoader } from 'three/examples/jsm/loaders/3DMLoader.js';
import * as THREE from 'three';

/**
 * Rhino 3DM Loader Node
 *
 * Loads Rhino 3dm files and outputs the loaded object
 * Reference: https://threejs.org/docs/#examples/en/loaders/3DMLoader
 */
export class Rhino3dmLoaderNode extends BaseFileLoaderNode<'scene' | 'loaded'> {
  private loader: Rhino3dmLoader;
  private zToYUpEnabled: boolean = true;
  private params = { zToYUp: true };
  private conversionApplied: boolean = false; // Track if conversion is currently applied

  constructor(id: string) {
    super(id, 'Rhino3dmLoaderNode', 'Rhino 3DM Loader', '.3dm');

    this.loader = new Rhino3dmLoader();

    // Set the path to the Rhino3dm WASM/JS files
    // Note: These need to be available in your public directory
    this.loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@8.4.0/');

    // Add property for Z-to-Y conversion
    this.addProperty({
      name: 'zToYUp',
      type: 'boolean',
      value: true,
      label: 'Convert Z-up to Y-up',
    });

    this.zToYUpEnabled = true;
  }

  protected setupTweakpaneControls(): void {
    super.setupTweakpaneControls();

    if (!this.pane) return;

    // Add Z-to-Y conversion toggle
    const zToYUp = this.getProperty('zToYUp') ?? true;
    this.params.zToYUp = zToYUp;
    this.zToYUpEnabled = zToYUp;

    this.pane
      .addBinding(this.params, 'zToYUp', {
        label: 'Z → Y up',
      })
      .on('change', (ev) => {
        this.zToYUpEnabled = ev.value;
        this.setProperty('zToYUp', ev.value);

        // If file is already loaded, toggle the conversion
        if (this.loadedObject) {
          // Only apply if state differs from current
          if (ev.value && !this.conversionApplied) {
            this.applyZToYConversion(this.loadedObject, true);
            this.conversionApplied = true;
          } else if (!ev.value && this.conversionApplied) {
            this.applyZToYConversion(this.loadedObject, false);
            this.conversionApplied = false;
          }

          this.markDirty();

          if (this.graph) {
            this.graph.triggerChange();
          }
        }
      });
  }

  /**
   * Converts Rhino's Z-up coordinate system to Three.js Y-up
   * Applies rotation directly to geometry, not transforms
   * @param enable - If true, applies Z-to-Y conversion; if false, reverts to Z-up
   */
  private applyZToYConversion(object: THREE.Object3D, enable: boolean): void {
    // Rotation matrix for Z-up to Y-up (-90 degrees around X-axis)
    const rotationMatrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    const inverseRotationMatrix = new THREE.Matrix4().makeRotationX(Math.PI / 2);

    object.traverse((child) => {
      if (
        child instanceof THREE.Mesh ||
        child instanceof THREE.LineSegments ||
        child instanceof THREE.Line ||
        child instanceof THREE.Points
      ) {
        if (child.geometry) {
          if (enable) {
            // Apply Z-up to Y-up rotation to geometry
            child.geometry.applyMatrix4(rotationMatrix);
          } else {
            // Revert back to Z-up
            child.geometry.applyMatrix4(inverseRotationMatrix);
          }

          // Update bounding box and sphere
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }
      }
    });
  }

  protected async loadFile(url: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (object) => {
          this.loadedObject = object;

          // Apply Z-to-Y conversion if enabled
          if (this.zToYUpEnabled) {
            this.applyZToYConversion(object, true);
            this.conversionApplied = true;
          } else {
            this.conversionApplied = false;
          }

          // Track resource
          this.trackResource(object);

          console.log(`Loaded 3DM: ${file.name}`, object);
          resolve();
        },
        (progress) => {
          // Progress callback (optional)
          const percentComplete = (progress.loaded / progress.total) * 100;
          console.log(`Loading ${file.name}: ${percentComplete.toFixed(2)}%`);
        },
        (error) => {
          console.error('Error loading 3DM:', error);
          reject(error);
        }
      );
    });
  }

  protected clearFile(): void {
    // Reset conversion flag when file is cleared
    this.conversionApplied = false;
    super.clearFile();
  }
}
