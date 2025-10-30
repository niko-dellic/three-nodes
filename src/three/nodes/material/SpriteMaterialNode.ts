import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import * as THREE from 'three';

export class SpriteMaterialNode extends BaseMaterialNode<'color' | 'map' | 'rotation'> {
  constructor(id: string) {
    super(id, 'SpriteMaterialNode', 'Sprite Material');

    // Add material-specific input ports with defaults
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({ name: 'map', type: PortType.Texture });
    this.addInput({ name: 'rotation', type: PortType.Number, defaultValue: 0 });

    // Add material-specific properties
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
  }

  protected createMaterial(): THREE.Material {
    return new THREE.SpriteMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    if (!(material instanceof THREE.SpriteMaterial)) return;

    // Get material-specific values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const rotation = this.getValueOrProperty<number>('rotation', 0);
    const sizeAttenuation = this.getValueOrProperty<boolean>('sizeAttenuation', true);

    // Apply color
    if (typeof color === 'string') {
      material.color.set(color);
    } else if (color instanceof THREE.Color) {
      material.color.copy(color);
    }

    // Apply sprite-specific properties
    material.rotation = rotation;
    material.sizeAttenuation = sizeAttenuation;

    // Apply textures from inputs
    const map = this.getInputValue<THREE.Texture>('map');
    if (map) material.map = map;

    const alphaMap = this.getInputValue<THREE.Texture>('alphaMap');
    if (alphaMap) material.alphaMap = alphaMap;

    // Apply common material properties from base class
    this.applyCommonProperties(material);
  }
}
