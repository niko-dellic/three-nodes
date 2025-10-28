import { BaseFileLoaderNode } from './BaseFileLoaderNode';
import { Rhino3dmLoader } from 'three/examples/jsm/loaders/3DMLoader.js';

/**
 * Rhino 3DM Loader Node
 *
 * Loads Rhino 3dm files and outputs the loaded object
 * Reference: https://threejs.org/docs/#examples/en/loaders/3DMLoader
 */
export class Rhino3dmLoaderNode extends BaseFileLoaderNode<'scene' | 'loaded'> {
  private loader: Rhino3dmLoader;

  constructor(id: string) {
    super(id, 'Rhino3dmLoaderNode', 'Rhino 3DM Loader', '.3dm');

    this.loader = new Rhino3dmLoader();

    // Set the path to the Rhino3dm WASM/JS files
    // Note: These need to be available in your public directory
    this.loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@8.4.0/');
  }

  protected async loadFile(url: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (object) => {
          this.loadedObject = object;

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
}
