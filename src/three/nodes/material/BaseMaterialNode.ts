import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { FilePickerHelper, FilePickerConfig } from '../mixins/FilePickerMixin';

/**
 * Unified base class for all material nodes
 * 
 * Features:
 * - Extends BaseThreeNode for resource management
 * - Includes file picker functionality for texture inputs
 * - Provides dual input/property system (inputs override properties)
 * - Common material inputs: opacity, transparent, side, depthTest, depthWrite, wireframe, visible
 * - Creates fresh materials on each evaluation to ensure proper lighting
 * 
 * Usage:
 * 1. Extend this class with material-specific input types
 * 2. Add material-specific inputs and properties in constructor
 * 3. Register file pickers for texture inputs if needed
 * 4. Implement createMaterial() to return material instance
 * 5. Implement updateMaterialProperties() to set material properties
 */
export abstract class BaseMaterialNode<TInputs extends string = string> extends BaseThreeNode<
  | TInputs
  | 'opacity'
  | 'transparent'
  | 'side'
  | 'depthTest'
  | 'depthWrite'
  | 'wireframe'
  | 'visible',
  'material'
> {
  protected material: THREE.Material | null = null;
  private filePickers: Map<string, FilePickerHelper> = new Map();
  protected textures: Map<string, THREE.Texture> = new Map();
  protected textureLoader: THREE.TextureLoader;

  constructor(id: string, type: string, label: string) {
    super(id, type, label);
    this.addOutput({ name: 'material', type: PortType.Material });
    this.textureLoader = new THREE.TextureLoader();

    // Add common material input ports (available to all materials)
    // Note: color is NOT included here as it's material-specific
    this.addInput({ name: 'opacity', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'transparent', type: PortType.Boolean, defaultValue: false });
    this.addInput({ name: 'side', type: PortType.Number, defaultValue: THREE.FrontSide });
    this.addInput({ name: 'depthTest', type: PortType.Boolean, defaultValue: true });
    this.addInput({ name: 'depthWrite', type: PortType.Boolean, defaultValue: true });
    this.addInput({ name: 'wireframe', type: PortType.Boolean, defaultValue: false });
    this.addInput({ name: 'visible', type: PortType.Boolean, defaultValue: true });

    // Add common properties (configurable in properties panel)
    this.addProperty({
      name: 'opacity',
      type: 'number',
      value: 1,
      label: 'Opacity',
      min: 0,
      max: 1,
      step: 0.01,
    });
    this.addProperty({ name: 'transparent', type: 'boolean', value: false, label: 'Transparent' });
    this.addProperty({
      name: 'side',
      type: 'number',
      value: THREE.FrontSide,
      label: 'Side',
      min: 0,
      max: 2,
      step: 1,
    });
    this.addProperty({ name: 'depthTest', type: 'boolean', value: true, label: 'Depth Test' });
    this.addProperty({ name: 'depthWrite', type: 'boolean', value: true, label: 'Depth Write' });
    this.addProperty({ name: 'wireframe', type: 'boolean', value: false, label: 'Wireframe' });
    this.addProperty({ name: 'visible', type: 'boolean', value: true, label: 'Visible' });
  }

  /**
   * Register a file picker for a texture input port
   * Call this from derived class constructors for texture inputs
   */
  protected registerFilePicker(
    portName: string,
    config: Omit<FilePickerConfig, 'onFileSelected' | 'onFileCleared'>
  ): void {
    const picker = new FilePickerHelper({
      ...config,
      onFileSelected: async (_file, url) => {
        await this.loadTexture(portName, url);
      },
      onFileCleared: () => {
        this.clearTexture(portName);
      },
    });
    this.filePickers.set(portName, picker);
  }

  /**
   * Load texture for a given port
   */
  protected async loadTexture(portName: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.textures.set(portName, texture);
          this.setProperty(`${portName}Path`, url);
          this.trackResource(texture);

          // Mark this node and all downstream nodes as dirty
          this.markDownstreamDirty();
          
          // Use setTimeout to ensure the evaluation happens after this async operation completes
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
          console.error(`Error loading texture for ${portName}:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Clear texture for a given port
   */
  protected clearTexture(portName: string): void {
    const texture = this.textures.get(portName);
    if (texture) {
      texture.dispose();
      this.textures.delete(portName);
    }
    this.setProperty(`${portName}Path`, '');

    // Mark this node and all downstream nodes as dirty
    this.markDownstreamDirty();
    
    // Trigger graph change to update preview and downstream nodes
    if (this.graph) {
      this.graph.triggerChange();
    }
  }

  /**
   * Get texture for a port (prioritizes input connection over loaded file)
   */
  protected getTexture(portName: string): THREE.Texture | null {
    const inputTexture = this.getInputValue<THREE.Texture>(portName);
    if (inputTexture) return inputTexture;
    return this.textures.get(portName) || null;
  }

  /**
   * Get file picker for UI to access
   * Used by NodeRenderer to display file picker buttons
   */
  public getFilePicker(portName: string): FilePickerHelper | undefined {
    return this.filePickers.get(portName);
  }

  /**
   * Check if a texture is loaded for a given port
   */
  public hasLoadedTexture(portName: string): boolean {
    return this.textures.has(portName);
  }

  /**
   * Get value either from input port (if connected) or property
   * This enables the dual input/property system
   */
  protected getValueOrProperty<T>(name: string, defaultValue?: T): T {
    const inputPort = this.inputs.get(name);
    if (inputPort && inputPort.connections.length > 0) {
      // Use input value if connected
      const value = this.getInputValue<T>(name);
      if (value !== undefined) return value;
    }

    // Fall back to property
    const propValue = this.getProperty(name);
    return (propValue !== undefined ? propValue : defaultValue) as T;
  }

  /**
   * Apply common material properties
   * Call this from derived classes after setting material-specific properties
   */
  protected applyCommonProperties(material: THREE.Material): void {
    const opacity = this.getValueOrProperty<number>('opacity', 1);
    const transparent = this.getValueOrProperty<boolean>('transparent', false);
    const side = this.getValueOrProperty<number>('side', THREE.FrontSide) as THREE.Side;
    const depthTest = this.getValueOrProperty<boolean>('depthTest', true);
    const depthWrite = this.getValueOrProperty<boolean>('depthWrite', true);
    const wireframe = this.getValueOrProperty<boolean>('wireframe', false);
    const visible = this.getValueOrProperty<boolean>('visible', true);

    material.opacity = opacity;
    material.transparent = transparent;
    material.side = side;
    material.depthTest = depthTest;
    material.depthWrite = depthWrite;
    material.visible = visible;

    // Apply wireframe if supported
    if ('wireframe' in material) {
      (material as any).wireframe = wireframe;
    }

    material.needsUpdate = true;
  }

  /**
   * Create the material instance
   * Override in derived classes to return the specific material type
   */
  protected abstract createMaterial(): THREE.Material;

  /**
   * Update material properties from inputs and properties
   * Override in derived classes to set material-specific properties
   * Always call applyCommonProperties() at the end
   */
  protected abstract updateMaterialProperties(material: THREE.Material): void;

  /**
   * Evaluate the node
   * Creates a fresh material on each evaluation to ensure proper lighting
   */
  evaluate(_context: EvaluationContext): void {
    // Dispose old material if it exists
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }

    // Create fresh material on every evaluation (ensures proper lighting)
    this.material = this.createMaterial();
    this.trackResource(this.material);

    // Update material properties
    this.updateMaterialProperties(this.material);

    // Output the material
    this.setOutputValue('material', this.material);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Dispose file pickers
    this.filePickers.forEach((picker) => picker.dispose());
    this.filePickers.clear();

    // Dispose textures
    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();

    // Dispose material
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }

    super.dispose();
  }
}
