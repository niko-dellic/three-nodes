import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import * as THREE from 'three';

export class MeshBasicMaterialNode extends BaseMaterialNode<'color' | 'map' | 'alphaMap'> {
  constructor(id: string) {
    super(id, 'MeshBasicMaterialNode', 'Basic Material');

    // Add material-specific input ports with defaults
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({ name: 'map', type: PortType.Texture });
    this.addInput({ name: 'alphaMap', type: PortType.Texture });

    // Add material-specific properties
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
    this.addProperty({ name: 'fog', type: 'boolean', value: true, label: 'Affected by Fog' });

    // Add properties for texture paths
    this.addProperty({ name: 'mapPath', type: 'string', value: '', label: 'Map Path' });
    this.addProperty({ name: 'alphaMapPath', type: 'string', value: '', label: 'Alpha Map Path' });

    // Register file pickers for texture inputs
    this.registerFilePicker('map', {
      acceptedFileTypes: '.jpg,.jpeg,.png,.webp,.bmp',
      buttonLabel: 'Color Map',
    });
    this.registerFilePicker('alphaMap', {
      acceptedFileTypes: '.jpg,.jpeg,.png,.webp,.bmp',
      buttonLabel: 'Alpha Map',
    });
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

    // Apply textures (prioritize input connections over loaded files)
    material.map = this.getTexture('map');
    material.alphaMap = this.getTexture('alphaMap');

    // Apply common material properties from base class
    this.applyCommonProperties(material);
  }
}
