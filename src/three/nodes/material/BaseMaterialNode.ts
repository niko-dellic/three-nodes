import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Base class for material nodes with dual input/property system
 *
 * Properties are configured in the properties panel
 * Input ports allow dynamic connections from other nodes
 * When an input port is connected, the corresponding property is grayed out
 *
 * Common Material Properties (from three.js Material base class):
 * - opacity, transparent, side, depthTest, depthWrite, wireframe, visible
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

  constructor(id: string, type: string, label: string) {
    super(id, type, label);
    this.addOutput({ name: 'material', type: PortType.Material });

    // Add common input ports (available to all materials)
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
   * Create the material instance
   * Override in derived classes
   */
  protected abstract createMaterial(): THREE.Material;

  /**
   * Update material properties from inputs and properties
   * Override in derived classes to add custom logic
   */
  protected abstract updateMaterialProperties(material: THREE.Material): void;

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
   * Get value either from input port (if connected) or property
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
   * Default evaluate implementation
   * Derived classes can override if they need custom evaluation logic
   */
  evaluate(_context: EvaluationContext): void {
    // Create or reuse material
    if (!this.material) {
      this.material = this.createMaterial();
      this.trackResource(this.material);
    }

    // Update material properties
    this.updateMaterialProperties(this.material);

    // Output the material
    this.setOutputValue('material', this.material);
  }

  dispose(): void {
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    super.dispose();
  }
}
