import { BaseMaterialTweakpaneNode } from './BaseMaterialTweakpaneNode';
import { PortType } from '@/types';
import * as THREE from 'three';
import { FilePickerHelper } from '../mixins/FilePickerMixin';

export class MeshStandardMaterialNode extends BaseMaterialTweakpaneNode<
  | 'color'
  | 'metalness'
  | 'roughness'
  | 'emissive'
  | 'emissiveIntensity'
  | 'map'
  | 'normalMap'
  | 'roughnessMap'
  | 'metalnessMap'
  | 'aoMap'
  | 'emissiveMap'
> {
  private textures: Map<string, THREE.Texture> = new Map();
  private filePickers: Map<string, FilePickerHelper> = new Map();
  private textureLoader: THREE.TextureLoader;

  constructor(id: string) {
    super(id, 'MeshStandardMaterialNode', 'Standard Material');

    // Initialize texture loader
    this.textureLoader = new THREE.TextureLoader();

    // Add material-specific input ports
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({ name: 'metalness', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'roughness', type: PortType.Number, defaultValue: 1 });
    this.addInput({
      name: 'emissive',
      type: PortType.Color,
      defaultValue: new THREE.Color(0, 0, 0),
    });
    this.addInput({ name: 'emissiveIntensity', type: PortType.Number, defaultValue: 0 });

    // Add texture input ports
    this.addInput({ name: 'map', type: PortType.Texture });
    this.addInput({ name: 'normalMap', type: PortType.Texture });
    this.addInput({ name: 'roughnessMap', type: PortType.Texture });
    this.addInput({ name: 'metalnessMap', type: PortType.Texture });
    this.addInput({ name: 'aoMap', type: PortType.Texture });
    this.addInput({ name: 'emissiveMap', type: PortType.Texture });

    // Add material-specific properties
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
    this.addProperty({
      name: 'metalness',
      type: 'number',
      value: 0,
      label: 'Metalness',
      min: 0,
      max: 1,
      step: 0.01,
    });
    this.addProperty({
      name: 'roughness',
      type: 'number',
      value: 1,
      label: 'Roughness',
      min: 0,
      max: 1,
      step: 0.01,
    });
    this.addProperty({ name: 'emissive', type: 'color', value: '#000000', label: 'Emissive' });
    this.addProperty({
      name: 'emissiveIntensity',
      type: 'number',
      value: 0,
      label: 'Emissive Intensity',
      min: 0,
      max: 2,
      step: 0.01,
    });

    // Add properties for texture paths
    this.addProperty({ name: 'mapPath', type: 'string', value: '', label: 'Map Path' });
    this.addProperty({
      name: 'normalMapPath',
      type: 'string',
      value: '',
      label: 'Normal Map Path',
    });
    this.addProperty({
      name: 'roughnessMapPath',
      type: 'string',
      value: '',
      label: 'Roughness Map Path',
    });
    this.addProperty({
      name: 'metalnessMapPath',
      type: 'string',
      value: '',
      label: 'Metalness Map Path',
    });
    this.addProperty({ name: 'aoMapPath', type: 'string', value: '', label: 'AO Map Path' });
    this.addProperty({
      name: 'emissiveMapPath',
      type: 'string',
      value: '',
      label: 'Emissive Map Path',
    });

    // Initialize file pickers
    this.initializeFilePicker('map', 'Color Map');
    this.initializeFilePicker('normalMap', 'Normal Map');
    this.initializeFilePicker('roughnessMap', 'Roughness Map');
    this.initializeFilePicker('metalnessMap', 'Metalness Map');
    this.initializeFilePicker('aoMap', 'AO Map');
    this.initializeFilePicker('emissiveMap', 'Emissive Map');
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
    return new THREE.MeshStandardMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    if (!(material instanceof THREE.MeshStandardMaterial)) return;

    // Get material-specific values from inputs (if connected) or properties (if not connected)
    const color = this.getValueOrProperty<THREE.Color>('color', new THREE.Color(1, 1, 1));
    const metalness = this.getValueOrProperty<number>('metalness', 0);
    const roughness = this.getValueOrProperty<number>('roughness', 1);
    const emissive = this.getValueOrProperty<THREE.Color>('emissive', new THREE.Color(0, 0, 0));
    const emissiveIntensity = this.getValueOrProperty<number>('emissiveIntensity', 0);

    // Apply material-specific properties
    material.color = color;
    material.metalness = metalness;
    material.roughness = roughness;
    material.emissive = emissive;
    material.emissiveIntensity = emissiveIntensity;

    // Apply textures - prioritize input connections over loaded files
    const textureNames: Array<keyof THREE.MeshStandardMaterial> = [
      'map',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'aoMap',
      'emissiveMap',
    ];

    textureNames.forEach((textureName) => {
      const inputTexture = this.getInputValue<THREE.Texture>(textureName as string);
      if (inputTexture) {
        // Input connection takes priority
        (material as any)[textureName] = inputTexture;
      } else {
        // Check if we have a loaded texture file
        const loadedTexture = this.textures.get(textureName as string);
        if (loadedTexture !== undefined) {
          // We have a loaded texture, apply it
          (material as any)[textureName] = loadedTexture;
        } else {
          // No input and no loaded texture - set to null to clear any previous texture
          (material as any)[textureName] = null;
        }
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
