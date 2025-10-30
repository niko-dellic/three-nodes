import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import * as THREE from 'three';

export class LineBasicMaterialNode extends BaseMaterialNode<'color'> {
  constructor(id: string) {
    super(id, 'LineBasicMaterialNode', 'Line Basic Material');

    // Add material-specific input ports with defaults
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });

    // Add material-specific properties
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
    this.addProperty({
      name: 'linewidth',
      type: 'number',
      value: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
      label: 'Line Width',
    });
  }

  protected createMaterial(): THREE.Material {
    return new THREE.LineBasicMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    if (!(material instanceof THREE.LineBasicMaterial)) return;

    // Get material-specific values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const linewidth = this.getValueOrProperty<number>('linewidth', 1);

    // Apply color
    if (typeof color === 'string') {
      material.color.set(color);
    } else if (color instanceof THREE.Color) {
      material.color.copy(color);
    }

    // Apply linewidth
    material.linewidth = linewidth;

    // Apply common material properties from base class
    this.applyCommonProperties(material);
  }
}
