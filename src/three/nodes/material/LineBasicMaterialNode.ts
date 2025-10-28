import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class LineBasicMaterialNode extends BaseMaterialNode {
  constructor(id: string) {
    super(id, 'LineBasicMaterialNode', 'Line Basic Material');

    // Input ports
    this.addInput({ name: 'color', type: PortType.Color });

    // Properties
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
  }

  protected createMaterial(): THREE.Material {
    return new THREE.LineBasicMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    const lineMat = material as THREE.LineBasicMaterial;

    // Get values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const linewidth = this.getValueOrProperty<number>('linewidth', 1);
    const opacity = this.getValueOrProperty<number>('opacity', 1);
    const transparent = this.getValueOrProperty<boolean>('transparent', false);

    // Apply color
    if (typeof color === 'string') {
      lineMat.color.set(color);
    } else if (color instanceof THREE.Color) {
      lineMat.color.copy(color);
    }

    // Apply properties
    lineMat.linewidth = linewidth;
    lineMat.opacity = opacity;
    lineMat.transparent = transparent;

    lineMat.needsUpdate = true;
  }

  evaluate(_context: EvaluationContext): void {
    if (!this.material) {
      this.material = this.createMaterial();
      this.trackResource(this.material);
    }

    this.updateMaterialProperties(this.material);
    this.setOutputValue('material', this.material);
  }
}
