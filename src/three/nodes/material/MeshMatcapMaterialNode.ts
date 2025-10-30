import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import * as THREE from 'three';

export class MeshMatcapMaterialNode extends BaseMaterialNode<'color' | 'matcap' | 'map'> {
  constructor(id: string) {
    super(id, 'MeshMatcapMaterialNode', 'Matcap Material');

    // Add material-specific input ports with defaults
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({ name: 'matcap', type: PortType.Texture });
    this.addInput({ name: 'map', type: PortType.Texture });

    // Add material-specific properties
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });

    // Add properties for texture paths
    this.addProperty({ name: 'matcapPath', type: 'string', value: '', label: 'Matcap Path' });
    this.addProperty({ name: 'mapPath', type: 'string', value: '', label: 'Map Path' });

    // Register file pickers for texture inputs
    this.registerFilePicker('matcap', {
      acceptedFileTypes: '.jpg,.jpeg,.png,.webp,.bmp',
      buttonLabel: 'Matcap Texture',
    });
    this.registerFilePicker('map', {
      acceptedFileTypes: '.jpg,.jpeg,.png,.webp,.bmp',
      buttonLabel: 'Color Map',
    });
  }

  protected createMaterial(): THREE.Material {
    return new THREE.MeshMatcapMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    if (!(material instanceof THREE.MeshMatcapMaterial)) return;

    // Get material-specific values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');

    // Apply color
    if (typeof color === 'string') {
      material.color.set(color);
    } else if (color instanceof THREE.Color) {
      material.color.copy(color);
    }

    // Apply textures (prioritize input connections over loaded files)
    material.matcap = this.getTexture('matcap');
    material.map = this.getTexture('map');

    // Apply common material properties from base class
    this.applyCommonProperties(material);
  }
}
