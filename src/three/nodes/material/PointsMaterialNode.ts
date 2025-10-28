import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class PointsMaterialNode extends BaseMaterialNode<'color' | 'size' | 'map'> {
  constructor(id: string) {
    super(id, 'PointsMaterialNode', 'Points Material');

    // Input ports
    this.addInput({ name: 'color', type: PortType.Color });
    this.addInput({ name: 'size', type: PortType.Number });
    this.addInput({ name: 'map', type: PortType.Texture });

    // Properties
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
    this.addProperty({
      name: 'size',
      type: 'number',
      value: 1,
      min: 0,
      max: 10,
      step: 0.1,
      label: 'Size',
    });
    this.addProperty({
      name: 'sizeAttenuation',
      type: 'boolean',
      value: true,
      label: 'Size Attenuation',
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
    return new THREE.PointsMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    const pointsMat = material as THREE.PointsMaterial;

    // Get values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const size = this.getValueOrProperty<number>('size', 1);
    const sizeAttenuation = this.getValueOrProperty<boolean>('sizeAttenuation', true);
    const opacity = this.getValueOrProperty<number>('opacity', 1);
    const transparent = this.getValueOrProperty<boolean>('transparent', false);

    // Apply color
    if (typeof color === 'string') {
      pointsMat.color.set(color);
    } else if (color instanceof THREE.Color) {
      pointsMat.color.copy(color);
    }

    // Apply properties
    pointsMat.size = size;
    pointsMat.sizeAttenuation = sizeAttenuation;
    pointsMat.opacity = opacity;
    pointsMat.transparent = transparent;

    // Apply textures from inputs
    const map = this.getInputValue<THREE.Texture>('map');
    if (map) pointsMat.map = map;

    const alphaMap = this.getInputValue<THREE.Texture>('alphaMap');
    if (alphaMap) pointsMat.alphaMap = alphaMap;

    pointsMat.needsUpdate = true;
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
