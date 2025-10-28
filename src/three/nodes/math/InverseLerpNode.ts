import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class InverseLerpNode extends BaseThreeNode<
  'x' | 'y' | 'value',
  'result'
> {
  constructor(id: string) {
    super(id, 'InverseLerpNode', 'Inverse Lerp');
    this.addInput({ name: 'x', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'y', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'value', type: PortType.Number, defaultValue: 0.5 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const x = this.getInputValue<number>('x') ?? 0;
    const y = this.getInputValue<number>('y') ?? 1;
    const value = this.getInputValue<number>('value') ?? 0.5;

    const result = THREE.MathUtils.inverseLerp(x, y, value);
    this.setOutputValue('result', result);
  }
}
