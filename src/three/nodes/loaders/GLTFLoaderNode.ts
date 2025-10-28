import { BaseFileLoaderNode } from './BaseFileLoaderNode';
import { PortType } from '@/types';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EvaluationContext } from '@/core';

/**
 * GLTF Loader Node
 *
 * Loads GLTF/GLB files and outputs the loaded scene and animations
 * Reference: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
 */
export class GLTFLoaderNode extends BaseFileLoaderNode<
  'scene' | 'loaded' | 'animations' | 'cameras' | 'asset'
> {
  private gltf: GLTF | null = null;
  private loader: GLTFLoader;

  constructor(id: string) {
    super(id, 'GLTFLoaderNode', 'GLTF Loader', '.gltf,.glb');

    this.loader = new GLTFLoader();

    // Additional outputs specific to GLTF
    this.addOutput({ name: 'animations', type: PortType.Any }); // AnimationClip[]
    this.addOutput({ name: 'cameras', type: PortType.Any }); // Camera[]
    this.addOutput({ name: 'asset', type: PortType.Any }); // Asset metadata
  }

  protected async loadFile(url: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          this.gltf = gltf;
          this.loadedObject = gltf.scene;

          // Track resources
          this.trackResource(gltf.scene);

          console.log(`Loaded GLTF: ${file.name}`, gltf);
          resolve();
        },
        (progress) => {
          // Progress callback (optional)
          const percentComplete = (progress.loaded / progress.total) * 100;
          console.log(`Loading ${file.name}: ${percentComplete.toFixed(2)}%`);
        },
        (error) => {
          console.error('Error loading GLTF:', error);
          reject(error);
        }
      );
    });
  }

  evaluate(_context: EvaluationContext): void {
    super.evaluate(_context);

    if (this.gltf) {
      // Output GLTF-specific data
      this.setOutputValue('animations', this.gltf.animations as any);
      this.setOutputValue('cameras', this.gltf.cameras as any);
      this.setOutputValue('asset', this.gltf.asset as any);
    } else {
      this.setOutputValue('animations', undefined);
      this.setOutputValue('cameras', undefined);
      this.setOutputValue('asset', undefined);
    }
  }

  dispose(): void {
    this.gltf = null;
    super.dispose();
  }
}
