import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class MeshToonMaterialNode extends BaseMaterialNode {
  constructor(id: string) {
    super(id, 'MeshToonMaterialNode', 'Toon Material');

    // Input ports
    this.addInput({ name: 'color', type: PortType.Color });
    this.addInput({ name: 'gradientMap', type: PortType.Texture });
    this.addInput({ name: 'map', type: PortType.Texture });

    // Properties
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
    this.addProperty({ name: 'emissive', type: 'color', value: '#000000', label: 'Emissive' });
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
    return new THREE.MeshToonMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    const toonMat = material as THREE.MeshToonMaterial;

    // Get values
    const color = this.getValueOrProperty<string | THREE.Color>('color', '#ffffff');
    const emissive = this.getValueOrProperty<string | THREE.Color>('emissive', '#000000');
    const opacity = this.getValueOrProperty<number>('opacity', 1);
    const transparent = this.getValueOrProperty<boolean>('transparent', false);
    const wireframe = this.getValueOrProperty<boolean>('wireframe', false);
    const side = this.getValueOrProperty<THREE.Side>('side', THREE.FrontSide);

    // Apply colors
    if (typeof color === 'string') {
      toonMat.color.set(color);
    } else if (color instanceof THREE.Color) {
      toonMat.color.copy(color);
    }

    if (typeof emissive === 'string') {
      toonMat.emissive.set(emissive);
    } else if (emissive instanceof THREE.Color) {
      toonMat.emissive.copy(emissive);
    }

    // Apply properties
    toonMat.opacity = opacity;
    toonMat.transparent = transparent;
    toonMat.wireframe = wireframe;
    toonMat.side = side;

    // Apply textures from inputs
    const gradientMap = this.getInputValue<THREE.Texture>('gradientMap');
    if (gradientMap) toonMat.gradientMap = gradientMap;

    const map = this.getInputValue<THREE.Texture>('map');
    if (map) toonMat.map = map;

    toonMat.needsUpdate = true;
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
