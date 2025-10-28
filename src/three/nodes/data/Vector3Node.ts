import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class Vector3Node extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'Vector3Node', 'Vector3');
    this.addInput({ name: 'x', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'y', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'z', type: PortType.Number, defaultValue: 0 });
    this.addOutput({ name: 'vector', type: PortType.Vector3 });
  }

  evaluate(_context: EvaluationContext): void {
    const x = this.getInputValue<number>('x') ?? 0;
    const y = this.getInputValue<number>('y') ?? 0;
    const z = this.getInputValue<number>('z') ?? 0;

    const vector = new THREE.Vector3(x, y, z);
    this.setOutputValue('vector', vector);
  }
}
