import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class LineDashedMaterialNode extends BaseMaterialNode {
  constructor(id: string) {
    super(id, 'LineDashedMaterialNode', 'Line Dashed Material');

    // Input ports
    this.addInput({ name: 'color', type: PortType.Color });
    this.addInput({ name: 'dashSize', type: PortType.Number });
    this.addInput({ name: 'gapSize', type: PortType.Number });

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
    return new THREE.LineDashedMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    const dashedMat = material as THREE.LineDashedMaterial;

    // Get values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const linewidth = this.getValueOrProperty<number>('linewidth', 1);
    const dashSize = this.getValueOrProperty<number>('dashSize', 3);
    const gapSize = this.getValueOrProperty<number>('gapSize', 1);
    const scale = this.getValueOrProperty<number>('scale', 1);
    const opacity = this.getValueOrProperty<number>('opacity', 1);
    const transparent = this.getValueOrProperty<boolean>('transparent', false);

    // Apply color
    if (typeof color === 'string') {
      dashedMat.color.set(color);
    } else if (color instanceof THREE.Color) {
      dashedMat.color.copy(color);
    }

    // Apply properties
    dashedMat.linewidth = linewidth;
    dashedMat.dashSize = dashSize;
    dashedMat.gapSize = gapSize;
    dashedMat.scale = scale;
    dashedMat.opacity = opacity;
    dashedMat.transparent = transparent;

    dashedMat.needsUpdate = true;
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
