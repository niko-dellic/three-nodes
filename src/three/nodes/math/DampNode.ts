import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class DampNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'DampNode', 'Damp');
    this.addInput({ name: 'x', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'y', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'lambda', type: PortType.Number, defaultValue: 5 });
    this.addInput({ name: 'deltaTime', type: PortType.Number, defaultValue: 0.016 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const x = this.getInputValue<number>('x') ?? 0;
    const y = this.getInputValue<number>('y') ?? 1;
    const lambda = this.getInputValue<number>('lambda') ?? 5;
    const deltaTime = this.getInputValue<number>('deltaTime') ?? 0.016;

    const result = THREE.MathUtils.damp(x, y, lambda, deltaTime);
    this.setOutputValue('result', result);
  }
}
