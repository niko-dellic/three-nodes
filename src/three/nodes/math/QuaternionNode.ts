import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class QuaternionNode extends BaseThreeNode<'x' | 'y' | 'z' | 'w', 'result'> {
  constructor(id: string) {
    super(id, 'QuaternionNode', 'Quaternion');
    this.addInput({ name: 'x', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'y', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'z', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'w', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'result', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const x = this.getInputValue<number>('x') ?? 0;
    const y = this.getInputValue<number>('y') ?? 0;
    const z = this.getInputValue<number>('z') ?? 0;
    const w = this.getInputValue<number>('w') ?? 1;

    const quaternion = new THREE.Quaternion(x, y, z, w);
    this.setOutputValue('result', quaternion);
  }
}

