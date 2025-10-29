import { BaseMaterialTweakpaneNode } from './BaseMaterialTweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { FilePickerHelper } from '../mixins/FilePickerMixin';

export class MeshMatcapMaterialNode extends BaseMaterialTweakpaneNode<'matcap' | 'color' | 'map'> {
  private matcapTexture: THREE.Texture | null = null;
  private mapTexture: THREE.Texture | null = null;
  private matcapPicker: FilePickerHelper;
  private mapPicker: FilePickerHelper;
  private textureLoader: THREE.TextureLoader;

  constructor(id: string) {
    super(id, 'MeshMatcapMaterialNode', 'Matcap Material');

    // Initialize texture loader
    this.textureLoader = new THREE.TextureLoader();

    // Initialize file pickers for textures
    this.matcapPicker = new FilePickerHelper({
      acceptedFileTypes: '.jpg,.jpeg,.png,.webp,.bmp',
      buttonLabel: 'Matcap Texture',
      onFileSelected: async (_file, url) => {
        await this.loadMatcapTexture(url);
      },
      onFileCleared: () => {
        this.clearMatcapTexture();
      },
    });

    this.mapPicker = new FilePickerHelper({
      acceptedFileTypes: '.jpg,.jpeg,.png,.webp,.bmp',
      buttonLabel: 'Color Map',
      onFileSelected: async (_file, url) => {
        await this.loadMapTexture(url);
      },
      onFileCleared: () => {
        this.clearMapTexture();
      },
    });

    // Input ports
    this.addInput({ name: 'matcap', type: PortType.Texture });
    this.addInput({ name: 'map', type: PortType.Texture });

    // Properties
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
    this.addProperty({ name: 'matcapPath', type: 'string', value: '', label: 'Matcap Path' });
    this.addProperty({ name: 'mapPath', type: 'string', value: '', label: 'Map Path' });
    this.addProperty({
      name: 'opacity',
      type: 'number',
      value: 1,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'Opacity',
    });
    this.addProperty({ name: 'transparent', type: 'boolean', value: false, label: 'Transparent' });
    this.addProperty({
      name: 'side',
      type: 'list',
      value: THREE.FrontSide,
      label: 'Side',
      options: {
        Front: THREE.FrontSide,
        Back: THREE.BackSide,
        Double: THREE.DoubleSide,
      },
    });
  }

  // Empty implementation - file pickers are rendered next to ports
  protected setupTweakpaneControls(): void {
    // No Tweakpane controls needed
  }

  // Expose file picker for UI to access
  public getFilePicker(portName: string): FilePickerHelper | undefined {
    if (portName === 'matcap') return this.matcapPicker;
    if (portName === 'map') return this.mapPicker;
    return undefined;
  }

  // Check if a texture is loaded for a given port
  public hasLoadedTexture(portName: string): boolean {
    if (portName === 'matcap') return this.matcapTexture !== null;
    if (portName === 'map') return this.mapTexture !== null;
    return false;
  }

  private async loadMatcapTexture(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.matcapTexture = texture;
          this.setProperty('matcapPath', url);
          this.trackResource(texture);

          this.markDirty();
          if (this.graph) {
            this.graph.triggerChange();
          }
          resolve();
        },
        undefined,
        (error) => {
          console.error('Error loading matcap texture:', error);
          reject(error);
        }
      );
    });
  }

  private async loadMapTexture(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.mapTexture = texture;
          this.setProperty('mapPath', url);
          this.trackResource(texture);

          this.markDirty();
          if (this.graph) {
            this.graph.triggerChange();
          }
          resolve();
        },
        undefined,
        (error) => {
          console.error('Error loading map texture:', error);
          reject(error);
        }
      );
    });
  }

  private clearMatcapTexture(): void {
    if (this.matcapTexture) {
      this.matcapTexture.dispose();
      this.matcapTexture = null;
    }
    this.setProperty('matcapPath', '');

    this.markDirty();
    if (this.graph) {
      this.graph.triggerChange();
    }
  }

  private clearMapTexture(): void {
    if (this.mapTexture) {
      this.mapTexture.dispose();
      this.mapTexture = null;
    }
    this.setProperty('mapPath', '');

    this.markDirty();
    if (this.graph) {
      this.graph.triggerChange();
    }
  }

  protected createMaterial(): THREE.Material {
    return new THREE.MeshMatcapMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    const matcapMat = material as THREE.MeshMatcapMaterial;

    // Get values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const opacity = this.getValueOrProperty<number>('opacity', 1);
    const transparent = this.getValueOrProperty<boolean>('transparent', false);
    const side = this.getValueOrProperty<THREE.Side>('side', THREE.FrontSide);

    // Apply color
    if (typeof color === 'string') {
      matcapMat.color.set(color);
    } else if (color instanceof THREE.Color) {
      matcapMat.color.copy(color);
    }

    // Apply properties
    matcapMat.opacity = opacity;
    matcapMat.transparent = transparent;
    matcapMat.side = side;

    // Apply textures - prioritize input connections over loaded files
    const matcapInput = this.getInputValue<THREE.Texture>('matcap');
    if (matcapInput) {
      matcapMat.matcap = matcapInput;
    } else {
      matcapMat.matcap = this.matcapTexture;
    }

    const mapInput = this.getInputValue<THREE.Texture>('map');
    if (mapInput) {
      matcapMat.map = mapInput;
    } else {
      matcapMat.map = this.mapTexture;
    }

    matcapMat.needsUpdate = true;
  }

  evaluate(_context: EvaluationContext): void {
    if (!this.material) {
      this.material = this.createMaterial();
      this.trackResource(this.material);
    }

    this.updateMaterialProperties(this.material);
    this.setOutputValue('material', this.material);
  }

  getControlHeight(): number {
    // No Tweakpane controls needed - file pickers are next to ports
    return 0;
  }

  dispose(): void {
    this.matcapPicker.dispose();
    this.mapPicker.dispose();
    if (this.matcapTexture) {
      this.matcapTexture.dispose();
      this.matcapTexture = null;
    }
    if (this.mapTexture) {
      this.mapTexture.dispose();
      this.mapTexture = null;
    }
    super.dispose();
  }
}
