import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import * as THREE from 'three';

export class PointsMaterialNode extends BaseMaterialNode<'color' | 'size' | 'map'> {
  constructor(id: string) {
    super(id, 'PointsMaterialNode', 'Points Material');

    // Add material-specific input ports with defaults
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({ name: 'size', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'map', type: PortType.Texture });

    // Add material-specific properties
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
  }

  protected createMaterial(): THREE.Material {
    return new THREE.PointsMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    if (!(material instanceof THREE.PointsMaterial)) return;

    // Get material-specific values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const size = this.getValueOrProperty<number>('size', 1);
    const sizeAttenuation = this.getValueOrProperty<boolean>('sizeAttenuation', true);

    // Apply color
    if (typeof color === 'string') {
      material.color.set(color);
    } else if (color instanceof THREE.Color) {
      material.color.copy(color);
    }

    // Apply points-specific properties
    material.size = size;
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
