import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import * as THREE from 'three';

export class MeshToonMaterialNode extends BaseMaterialNode<'color' | 'gradientMap' | 'map'> {
  constructor(id: string) {
    super(id, 'MeshToonMaterialNode', 'Toon Material');

    // Add material-specific input ports with defaults
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({ name: 'gradientMap', type: PortType.Texture });
    this.addInput({ name: 'map', type: PortType.Texture });

    // Add material-specific properties
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
    this.addProperty({ name: 'emissive', type: 'color', value: '#000000', label: 'Emissive' });
  }

  protected createMaterial(): THREE.Material {
    return new THREE.MeshToonMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    if (!(material instanceof THREE.MeshToonMaterial)) return;

    // Get material-specific values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const emissive = this.getValueOrProperty<string | THREE.Color>('emissive', '#000000');

    // Apply colors
    if (typeof color === 'string') {
      material.color.set(color);
    } else if (color instanceof THREE.Color) {
      material.color.copy(color);
    }

    if (typeof emissive === 'string') {
      material.emissive.set(emissive);
    } else if (emissive instanceof THREE.Color) {
      material.emissive.copy(emissive);
    }

    // Apply textures from inputs
    const gradientMap = this.getInputValue<THREE.Texture>('gradientMap');
    if (gradientMap) material.gradientMap = gradientMap;

    const map = this.getInputValue<THREE.Texture>('map');
    if (map) material.map = map;

    // Apply common material properties from base class
    this.applyCommonProperties(material);
  }
}
