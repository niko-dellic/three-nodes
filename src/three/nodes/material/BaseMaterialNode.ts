import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import * as THREE from 'three';

/**
 * Base class for material nodes with dual input/property system
 *
 * Properties are configured in the properties panel
 * Input ports allow dynamic connections from other nodes
 * When an input port is connected, the corresponding property is grayed out
 */
export abstract class BaseMaterialNode extends BaseThreeNode {
  protected material: THREE.Material | null = null;

  constructor(id: string, type: string, label: string) {
    super(id, type, label);
    this.addOutput({ name: 'material', type: PortType.Material });
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
  protected updateMaterialProperties(_material: THREE.Material): void {
    // Base implementation - derived classes should override
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

  dispose(): void {
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    super.dispose();
  }
}
