import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import * as THREE from 'three';

export class MeshStandardMaterialNode extends BaseMaterialNode<
  'color' | 'metalness' | 'roughness'
> {
  constructor(id: string) {
    super(id, 'MeshStandardMaterialNode', 'Standard Material');

    // Add material-specific input ports with defaults
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({ name: 'metalness', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'roughness', type: PortType.Number, defaultValue: 1 });

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

    // Apply material-specific properties
    if (color instanceof THREE.Color) {
      material.color.copy(color);
    } else if (typeof color === 'string') {
      material.color.set(color);
    }
    material.metalness = metalness;
    material.roughness = roughness;

    // Apply common material properties from base class
    this.applyCommonProperties(material);
  }
}
