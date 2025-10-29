import { BaseMaterialTweakpaneNode } from './BaseMaterialTweakpaneNode';
import { PortType } from '@/types';
import * as THREE from 'three';
import { FilePickerHelper } from '../mixins/FilePickerMixin';

export class MeshBasicMaterialNode extends BaseMaterialTweakpaneNode<'color' | 'map' | 'alphaMap'> {
  private textures: Map<string, THREE.Texture> = new Map();
  private filePickers: Map<string, FilePickerHelper> = new Map();
  private textureLoader: THREE.TextureLoader;

  constructor(id: string) {
    super(id, 'MeshBasicMaterialNode', 'Basic Material');

    // Initialize texture loader
    this.textureLoader = new THREE.TextureLoader();

    // Add material-specific input ports
    this.addInput({ name: 'color', type: PortType.Color });
    this.addInput({ name: 'map', type: PortType.Texture });
    this.addInput({ name: 'alphaMap', type: PortType.Texture });

    // Add material-specific properties
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
    this.addProperty({ name: 'fog', type: 'boolean', value: true, label: 'Affected by Fog' });

    // Add properties for texture paths
    this.addProperty({ name: 'mapPath', type: 'string', value: '', label: 'Map Path' });
    this.addProperty({ name: 'alphaMapPath', type: 'string', value: '', label: 'Alpha Map Path' });

    // Initialize file pickers
    this.initializeFilePicker('map', 'Color Map');
    this.initializeFilePicker('alphaMap', 'Alpha Map');
  }

  private initializeFilePicker(textureName: string, label: string): void {
    const picker = new FilePickerHelper({
      acceptedFileTypes: '.jpg,.jpeg,.png,.webp,.bmp',
      buttonLabel: label,
      onFileSelected: async (_file, url) => {
        await this.loadTexture(textureName, url);
      },
      onFileCleared: () => {
        this.clearTexture(textureName);
      },
    });
    this.filePickers.set(textureName, picker);
  }

  // Empty implementation - file pickers are rendered next to ports
  protected setupTweakpaneControls(): void {
    // No Tweakpane controls needed
  }

  // Expose file picker for UI to access
  public getFilePicker(portName: string): FilePickerHelper | undefined {
    return this.filePickers.get(portName);
  }

  // Check if a texture is loaded for a given port
  public hasLoadedTexture(portName: string): boolean {
    return this.textures.has(portName);
  }

  private async loadTexture(textureName: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.textures.set(textureName, texture);
          this.setProperty(`${textureName}Path`, url);
          this.trackResource(texture);

          this.markDirty();
          if (this.graph) {
            this.graph.triggerChange();
          }
          resolve();
        },
        undefined,
        (error) => {
          console.error(`Error loading ${textureName}:`, error);
          reject(error);
        }
      );
    });
  }

  private clearTexture(textureName: string): void {
    const texture = this.textures.get(textureName);
    if (texture) {
      texture.dispose();
      this.textures.delete(textureName);
    }
    this.setProperty(`${textureName}Path`, '');

    this.markDirty();
    if (this.graph) {
      this.graph.triggerChange();
    }
  }

  protected createMaterial(): THREE.Material {
    return new THREE.MeshBasicMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    if (!(material instanceof THREE.MeshBasicMaterial)) return;

    // Get material-specific values from inputs or properties
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const fog = this.getValueOrProperty<boolean>('fog', true);

    // Apply color
    if (typeof color === 'string') {
      material.color.set(color);
    } else if (color instanceof THREE.Color) {
      material.color.copy(color);
    }

    // Apply material-specific properties
    material.fog = fog;

    // Apply textures - prioritize input connections over loaded files
    const textureNames: Array<keyof THREE.MeshBasicMaterial> = ['map', 'alphaMap'];

    textureNames.forEach((textureName) => {
      const inputTexture = this.getInputValue<THREE.Texture>(textureName as string);
      if (inputTexture) {
        (material as any)[textureName] = inputTexture;
      } else {
        const loadedTexture = this.textures.get(textureName as string);
        (material as any)[textureName] = loadedTexture || null;
      }
    });

    // Apply common material properties from base class
    this.applyCommonProperties(material);
  }

  getControlHeight(): number {
    // No Tweakpane controls needed - file pickers are next to ports
    return 0;
  }

  dispose(): void {
    this.filePickers.forEach((picker) => picker.dispose());
    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();
    super.dispose();
  }
}
