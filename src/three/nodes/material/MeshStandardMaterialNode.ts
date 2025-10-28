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
