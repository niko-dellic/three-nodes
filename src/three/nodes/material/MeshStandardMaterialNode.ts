import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class MeshStandardMaterialNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'MeshStandardMaterialNode', 'Standard Material');
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({ name: 'metalness', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'roughness', type: PortType.Number, defaultValue: 1 });
    this.addInput({
      name: 'emissive',
      type: PortType.Color,
      defaultValue: new THREE.Color(0, 0, 0),
    });
    this.addInput({ name: 'emissiveIntensity', type: PortType.Number, defaultValue: 0 });
    // wireframe
    this.addInput({ name: 'wireframe', type: PortType.Boolean, defaultValue: false });
    // side
    this.addInput({ name: 'side', type: PortType.Number, defaultValue: THREE.FrontSide });
    // depthTest
    this.addInput({ name: 'depthTest', type: PortType.Boolean, defaultValue: true });
    // depthWrite
    this.addInput({ name: 'depthWrite', type: PortType.Boolean, defaultValue: true });
    // transparent
    this.addInput({ name: 'transparent', type: PortType.Boolean, defaultValue: false });
    // opacity
    this.addInput({ name: 'opacity', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'material', type: PortType.Material });
  }

  evaluate(_context: EvaluationContext): void {
    const color = this.getInputValue<THREE.Color>('color') ?? new THREE.Color(1, 1, 1);
    const metalness = this.getInputValue<number>('metalness') ?? 0;
    const roughness = this.getInputValue<number>('roughness') ?? 1;

    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: metalness,
      roughness: roughness,
    });

    this.trackResource(material);
    this.setOutputValue('material', material);
  }
}
