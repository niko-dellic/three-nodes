import { BaseMaterialNode } from './BaseMaterialNode';
import { PortType } from '@/types';
import * as THREE from 'three';

export class MeshPhongMaterialNode extends BaseMaterialNode<
  'color' | 'emissive' | 'emissiveIntensity' | 'specular' | 'shininess'
> {
  constructor(id: string) {
    super(id, 'MeshPhongMaterialNode', 'Phong Material');

    // Add material-specific input ports with defaults
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({
      name: 'emissive',
      type: PortType.Color,
      defaultValue: new THREE.Color(0, 0, 0),
    });
    this.addInput({ name: 'emissiveIntensity', type: PortType.Number, defaultValue: 1 });
    this.addInput({
      name: 'specular',
      type: PortType.Color,
      defaultValue: new THREE.Color(0.066667, 0.066667, 0.066667),
    });
    this.addInput({ name: 'shininess', type: PortType.Number, defaultValue: 30 });

    // Add material-specific properties
    this.addProperty({ name: 'color', type: 'color', value: '#ffffff', label: 'Color' });
    this.addProperty({ name: 'emissive', type: 'color', value: '#000000', label: 'Emissive' });
    this.addProperty({
      name: 'emissiveIntensity',
      type: 'number',
      value: 1,
      label: 'Emissive Intensity',
      min: 0,
      max: 2,
      step: 0.01,
    });
    this.addProperty({ name: 'specular', type: 'color', value: '#111111', label: 'Specular' });
    this.addProperty({
      name: 'shininess',
      type: 'number',
      value: 30,
      label: 'Shininess',
      min: 0,
      max: 200,
      step: 1,
    });
  }

  protected createMaterial(): THREE.Material {
    return new THREE.MeshPhongMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    if (!(material instanceof THREE.MeshPhongMaterial)) return;

    // Get material-specific values from inputs (if connected) or properties (if not connected)
    const color = this.getValueOrProperty<THREE.Color>('color', new THREE.Color(1, 1, 1));
    const emissive = this.getValueOrProperty<THREE.Color>('emissive', new THREE.Color(0, 0, 0));
    const emissiveIntensity = this.getValueOrProperty<number>('emissiveIntensity', 1);
    const specular = this.getValueOrProperty<THREE.Color>(
      'specular',
      new THREE.Color(0.066667, 0.066667, 0.066667)
    );
    const shininess = this.getValueOrProperty<number>('shininess', 30);

    // Apply material-specific properties
    if (color instanceof THREE.Color) {
      material.color.copy(color);
    } else if (typeof color === 'string') {
      material.color.set(color);
    }

    if (emissive instanceof THREE.Color) {
      material.emissive.copy(emissive);
    } else if (typeof emissive === 'string') {
      material.emissive.set(emissive);
    }

    if (specular instanceof THREE.Color) {
      material.specular.copy(specular);
    } else if (typeof specular === 'string') {
      material.specular.set(specular);
    }

    material.emissiveIntensity = emissiveIntensity;
    material.shininess = shininess;

    // Apply common material properties from base class
    this.applyCommonProperties(material);
  }
}
