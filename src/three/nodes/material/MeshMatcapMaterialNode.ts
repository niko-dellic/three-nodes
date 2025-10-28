import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class MeshMatcapMaterialNode extends BaseMaterialNode<'matcap' | 'color' | 'map'> {
  constructor(id: string) {
    super(id, 'MeshMatcapMaterialNode', 'Matcap Material');

    // Input ports
    this.addInput({ name: 'matcap', type: PortType.Texture });
    this.addInput({ name: 'color', type: PortType.Color });
    this.addInput({ name: 'map', type: PortType.Texture });

    // Properties
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
    return new THREE.MeshMatcapMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    const matcapMat = material as THREE.MeshMatcapMaterial;

    // Get values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const opacity = this.getValueOrProperty<number>('opacity', 1);
    const transparent = this.getValueOrProperty<boolean>('transparent', false);
    const side = this.getValueOrProperty<THREE.Side>('side', THREE.FrontSide);

    // Apply color
    if (typeof color === 'string') {
      matcapMat.color.set(color);
    } else if (color instanceof THREE.Color) {
      matcapMat.color.copy(color);
    }

    // Apply properties
    matcapMat.opacity = opacity;
    matcapMat.transparent = transparent;
    matcapMat.side = side;

    // Apply textures from inputs
    const matcap = this.getInputValue<THREE.Texture>('matcap');
    if (matcap) matcapMat.matcap = matcap;

    const map = this.getInputValue<THREE.Texture>('map');
    if (map) matcapMat.map = map;

    matcapMat.needsUpdate = true;
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
