import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class RandIntNode extends BaseThreeNode<
  'low' | 'high',
  'result'
> {
  constructor(id: string) {
    super(id, 'RandIntNode', 'Random Integer');
    this.addInput({ name: 'low', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'high', type: PortType.Number, defaultValue: 10 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const low = this.getInputValue<number>('low') ?? 0;
    const high = this.getInputValue<number>('high') ?? 10;

    const result = THREE.MathUtils.randInt(low, high);
    this.setOutputValue('result', result);
  }
}
