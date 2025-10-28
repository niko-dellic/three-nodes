import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class SmootherStepNode extends BaseThreeNode<
  'x' | 'min' | 'max',
  'result'
> {
  constructor(id: string) {
    super(id, 'SmootherStepNode', 'Smoother Step');
    this.addInput({ name: 'x', type: PortType.Number, defaultValue: 0.5 });
    this.addInput({ name: 'min', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'max', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const x = this.getInputValue<number>('x') ?? 0.5;
    const min = this.getInputValue<number>('min') ?? 0;
    const max = this.getInputValue<number>('max') ?? 1;

    const result = THREE.MathUtils.smootherstep(x, min, max);
    this.setOutputValue('result', result);
  }
}
