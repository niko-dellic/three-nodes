import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class RandomNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'RandomNode', 'Random');
    this.addInput({ name: 'low', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'high', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const low = this.getInputValue<number>('low') ?? 0;
    const high = this.getInputValue<number>('high') ?? 1;

    const result = THREE.MathUtils.randFloat(low, high);
    this.setOutputValue('result', result);
  }
}
