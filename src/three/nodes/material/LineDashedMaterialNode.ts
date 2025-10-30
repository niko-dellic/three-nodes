import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import * as THREE from 'three';

export class LineDashedMaterialNode extends BaseMaterialNode<'color' | 'dashSize' | 'gapSize'> {
  constructor(id: string) {
    super(id, 'LineDashedMaterialNode', 'Line Dashed Material');

    // Add material-specific input ports with defaults
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({ name: 'dashSize', type: PortType.Number, defaultValue: 3 });
    this.addInput({ name: 'gapSize', type: PortType.Number, defaultValue: 1 });

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
    this.addProperty({
      name: 'dashSize',
      type: 'number',
      value: 3,
      min: 0.1,
      max: 10,
      step: 0.1,
      label: 'Dash Size',
    });
    this.addProperty({
      name: 'gapSize',
      type: 'number',
      value: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
      label: 'Gap Size',
    });
    this.addProperty({
      name: 'scale',
      type: 'number',
      value: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
      label: 'Scale',
    });
  }

  protected createMaterial(): THREE.Material {
    return new THREE.LineDashedMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    if (!(material instanceof THREE.LineDashedMaterial)) return;

    // Get material-specific values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const linewidth = this.getValueOrProperty<number>('linewidth', 1);
    const dashSize = this.getValueOrProperty<number>('dashSize', 3);
    const gapSize = this.getValueOrProperty<number>('gapSize', 1);
    const scale = this.getValueOrProperty<number>('scale', 1);

    // Apply color
    if (typeof color === 'string') {
      material.color.set(color);
    } else if (color instanceof THREE.Color) {
      material.color.copy(color);
    }

    // Apply dashed line properties
    material.linewidth = linewidth;
    material.dashSize = dashSize;
    material.gapSize = gapSize;
    material.scale = scale;

    // Apply common material properties from base class
    this.applyCommonProperties(material);
  }
}
