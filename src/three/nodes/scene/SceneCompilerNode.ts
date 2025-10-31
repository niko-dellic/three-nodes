import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { FilePickerHelper } from '../mixins/FilePickerMixin';

/**
 * Scene Compiler Node
 *
 * Collects scene, objects, camera, fog, and background without mutating the scene.
 * Acts as an intermediary that gathers all data needed for the final scene output.
 * Does NOT add objects to the scene - that's done by SceneOutputNode.
 */
export interface CompiledScene {
  scene: THREE.Scene;
  objects: THREE.Object3D[];
  camera: THREE.Camera;
  fog?: THREE.Fog | THREE.FogExp2;
  background?: THREE.Color | THREE.Texture | THREE.CubeTexture | null;
}

export class SceneCompilerNode extends BaseThreeNode<
  'scene' | 'objects' | 'camera' | 'fog' | 'background',
  'compiled'
> {
  private backgroundTexture: THREE.Texture | THREE.CubeTexture | null = null;
  private textureLoader: THREE.TextureLoader;
  private backgroundFilePicker: FilePickerHelper;

  constructor(id: string) {
    super(id, 'SceneCompilerNode', 'Scene Compiler');
    this.addInput({ name: 'scene', type: PortType.Scene });
    this.addInput({ name: 'objects', type: PortType.Object3D });
    this.addInput({ name: 'camera', type: PortType.Camera });
    this.addInput({ name: 'fog', type: PortType.Any });
    this.addInput({ name: 'background', type: PortType.Any }); // Accepts Color, Texture, or CubeTexture
    this.addOutput({ name: 'compiled', type: PortType.Any });

    // Initialize texture loader
    this.textureLoader = new THREE.TextureLoader();

    // Add property for background color
    this.addProperty({
      name: 'backgroundColor',
      type: 'color',
      value: '#000000',
      label: 'Background Color',
    });

    // Add property to store background type
    this.addProperty({
      name: 'backgroundType',
      type: 'list',
      value: 'none',
      label: 'Background Type',
      options: {
        Color: 'color',
        Texture: 'texture',
        'Cube Texture': 'cubetexture',
        None: 'none',
      },
    });

    // Register file picker for background texture
    this.backgroundFilePicker = new FilePickerHelper({
      acceptedFileTypes: '.jpg,.jpeg,.png,.webp,.hdr,.exr',
      buttonLabel: 'Load Background Texture',
      onFileSelected: async (_file, url) => {
        await this.loadBackgroundTexture(url);
      },
      onFileCleared: () => {
        this.clearBackgroundTexture();
      },
      showClearButton: true,
    });
  }

  /**
   * Load background texture from file
   */
  private async loadBackgroundTexture(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          // Dispose old texture if exists
          if (this.backgroundTexture) {
            this.backgroundTexture.dispose();
          }

          texture.colorSpace = THREE.SRGBColorSpace;
          this.backgroundTexture = texture;
          this.trackResource(texture);
          this.setProperty('backgroundTexturePath', url);

          // Mark dirty and trigger change
          this.markDownstreamDirty();
          if (this.graph) {
            setTimeout(() => {
              if (this.graph) {
                this.graph.triggerChange();
              }
            }, 0);
          }
          resolve();
        },
        undefined,
        (error) => {
          console.error('Error loading background texture:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Clear background texture
   */
  private clearBackgroundTexture(): void {
    if (this.backgroundTexture) {
      this.backgroundTexture.dispose();
      this.backgroundTexture = null;
    }
    this.setProperty('backgroundTexturePath', '');
    this.markDownstreamDirty();
    if (this.graph) {
      this.graph.triggerChange();
    }
  }

  /**
   * Get background based on input or properties
   */
  private getBackground(): THREE.Color | THREE.Texture | THREE.CubeTexture | null {
    // First check if background is provided via input (takes priority)
    const inputBackground = this.getInputValue<THREE.Color | THREE.Texture | THREE.CubeTexture>(
      'background'
    );
    if (inputBackground) {
      return inputBackground;
    }

    // Otherwise use properties
    const backgroundType = this.getProperty('backgroundType') || 'color';

    switch (backgroundType) {
      case 'color': {
        const colorValue = this.getProperty('backgroundColor') || '#000000';
        return new THREE.Color(colorValue);
      }
      case 'texture': {
        return this.backgroundTexture;
      }
      case 'cubetexture': {
        // CubeTexture would need to be loaded from 6 images or provided via input
        return this.backgroundTexture instanceof THREE.CubeTexture ? this.backgroundTexture : null;
      }
      case 'none':
      default:
        return null;
    }
  }

  /**
   * Get file picker for UI to access
   */
  public getFilePicker(portName: string): FilePickerHelper | undefined {
    if (portName === 'background') {
      return this.backgroundFilePicker;
    }
    return undefined;
  }

  /**
   * Check if a texture is loaded for a given port
   */
  public hasLoadedTexture(portName: string): boolean {
    if (portName === 'background') {
      return this.backgroundTexture !== null;
    }
    return false;
  }

  evaluate(_context: EvaluationContext): void {
    const scene = this.getInputValue<THREE.Scene>('scene');
    const camera = this.getInputValue<THREE.Camera>('camera');
    const objectInputs = this.getInputValues<THREE.Object3D>('objects');
    const fog = this.getInputValue<THREE.Fog | THREE.FogExp2>('fog');

    if (!scene) {
      console.warn('SceneCompilerNode: No scene provided');
      this.setOutputValue('compiled', undefined);
      return;
    }

    if (!camera) {
      console.warn('SceneCompilerNode: No camera provided');
      this.setOutputValue('compiled', undefined);
      return;
    }

    // Flatten all objects (handle both single objects and arrays)
    const objects: THREE.Object3D[] = [];
    for (const obj of objectInputs) {
      if (obj) {
        if (Array.isArray(obj)) {
          // Object input is an array of objects
          objects.push(...obj.filter((o) => o !== null && o !== undefined));
        } else {
          // Single object
          objects.push(obj);
        }
      }
    }

    // Get background (from input or properties)
    const background = this.getBackground();

    // Create compiled scene data without mutating anything
    const compiled: CompiledScene = {
      scene,
      objects,
      camera,
      fog,
      background,
    };

    this.setOutputValue('compiled', compiled);
  }

  dispose(): void {
    // Dispose file picker
    this.backgroundFilePicker.dispose();

    // Dispose background texture
    if (this.backgroundTexture) {
      this.backgroundTexture.dispose();
      this.backgroundTexture = null;
    }

    super.dispose();
  }
}
