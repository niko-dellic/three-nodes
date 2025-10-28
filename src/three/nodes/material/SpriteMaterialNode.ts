import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class SpriteMaterialNode extends BaseMaterialNode {
  constructor(id: string) {
    super(id, 'SpriteMaterialNode', 'Sprite Material');

    // Input ports
    this.addInput({ name: 'color', type: PortType.Color });
    this.addInput({ name: 'map', type: PortType.Texture });
    this.addInput({ name: 'rotation', type: PortType.Number });

    // Properties
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
    this.addProperty({
      name: 'rotation',
      type: 'number',
      value: 0,
      min: 0,
      max: Math.PI * 2,
      step: 0.01,
      label: 'Rotation',
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
    this.addProperty({ name: 'transparent', type: 'boolean', value: true, label: 'Transparent' });
  }

  protected createMaterial(): THREE.Material {
    return new THREE.SpriteMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    const spriteMat = material as THREE.SpriteMaterial;

    // Get values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const rotation = this.getValueOrProperty<number>('rotation', 0);
    const sizeAttenuation = this.getValueOrProperty<boolean>('sizeAttenuation', true);
    const opacity = this.getValueOrProperty<number>('opacity', 1);
    const transparent = this.getValueOrProperty<boolean>('transparent', true);

    // Apply color
    if (typeof color === 'string') {
      spriteMat.color.set(color);
    } else if (color instanceof THREE.Color) {
      spriteMat.color.copy(color);
    }

    // Apply properties
    spriteMat.rotation = rotation;
    spriteMat.sizeAttenuation = sizeAttenuation;
    spriteMat.opacity = opacity;
    spriteMat.transparent = transparent;

    // Apply textures from inputs
    const map = this.getInputValue<THREE.Texture>('map');
    if (map) spriteMat.map = map;

    const alphaMap = this.getInputValue<THREE.Texture>('alphaMap');
    if (alphaMap) spriteMat.alphaMap = alphaMap;

    spriteMat.needsUpdate = true;
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
