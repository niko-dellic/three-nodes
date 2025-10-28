import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import * as THREE from 'three';

export class MeshBasicMaterialNode extends BaseMaterialNode<'color' | 'map' | 'alphaMap'> {
  constructor(id: string) {
    super(id, 'MeshBasicMaterialNode', 'Basic Material');

    // Add material-specific input ports
    this.addInput({ name: 'color', type: PortType.Color });
    this.addInput({ name: 'map', type: PortType.Texture });
    this.addInput({ name: 'alphaMap', type: PortType.Texture });

    // Add material-specific properties (common properties are in BaseMaterialNode)
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
    this.addProperty({ name: 'fog', type: 'boolean', value: true, label: 'Affected by Fog' });
  }

  protected createMaterial(): THREE.Material {
    return new THREE.MeshBasicMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    if (!(material instanceof THREE.MeshBasicMaterial)) return;

    // Get material-specific values from inputs or properties
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const fog = this.getValueOrProperty<boolean>('fog', true);

    // Apply color
    if (typeof color === 'string') {
      material.color.set(color);
    } else if (color instanceof THREE.Color) {
      material.color.copy(color);
    }

    // Apply material-specific properties
    material.fog = fog;

    // Apply textures from inputs
    const map = this.getInputValue<THREE.Texture>('map');
    if (map) material.map = map;

    const alphaMap = this.getInputValue<THREE.Texture>('alphaMap');
    if (alphaMap) material.alphaMap = alphaMap;

    // Apply common material properties from base class
    this.applyCommonProperties(material);
  }
}
