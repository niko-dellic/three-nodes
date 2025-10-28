import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class MeshBasicMaterialNode extends BaseMaterialNode {
  constructor(id: string) {
    super(id, 'MeshBasicMaterialNode', 'Basic Material');

    // Input ports for commonly animated properties
    this.addInput({ name: 'color', type: PortType.Color });
    this.addInput({ name: 'map', type: PortType.Texture });
    this.addInput({ name: 'alphaMap', type: PortType.Texture });

    // Properties (configured in properties panel)
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
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
    this.addProperty({ name: 'fog', type: 'boolean', value: true, label: 'Affected by Fog' });
    this.addProperty({ name: 'wireframe', type: 'boolean', value: false, label: 'Wireframe' });
    this.addProperty({
      name: 'side',
      type: 'list',
      value: THREE.FrontSide,
      label: 'Side',
      options: {
        Front: THREE.FrontSide,
        Back: THREE.BackSide,
        Double: THREE.DoubleSide,
      },
    });
  }

  protected createMaterial(): THREE.Material {
    return new THREE.MeshBasicMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    const basicMat = material as THREE.MeshBasicMaterial;

    // Get values from inputs or properties
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const opacity = this.getValueOrProperty<number>('opacity', 1);
    const transparent = this.getValueOrProperty<boolean>('transparent', false);
    const fog = this.getValueOrProperty<boolean>('fog', true);
    const wireframe = this.getValueOrProperty<boolean>('wireframe', false);
    const side = this.getValueOrProperty<THREE.Side>('side', THREE.FrontSide);

    // Apply color
    if (typeof color === 'string') {
      basicMat.color.set(color);
    } else if (color instanceof THREE.Color) {
      basicMat.color.copy(color);
    }

    // Apply properties
    basicMat.opacity = opacity;
    basicMat.transparent = transparent;
    basicMat.fog = fog;
    basicMat.wireframe = wireframe;
    basicMat.side = side;

    // Apply textures from inputs
    const map = this.getInputValue<THREE.Texture>('map');
    if (map) basicMat.map = map;

    const alphaMap = this.getInputValue<THREE.Texture>('alphaMap');
    if (alphaMap) basicMat.alphaMap = alphaMap;

    basicMat.needsUpdate = true;
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
