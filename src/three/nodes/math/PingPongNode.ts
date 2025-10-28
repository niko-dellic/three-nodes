import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class PingPongNode extends BaseThreeNode<
  'x' | 'length',
  'result'
> {
  constructor(id: string) {
    super(id, 'PingPongNode', 'Ping Pong');
    this.addInput({ name: 'x', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'length', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const x = this.getInputValue<number>('x') ?? 0;
    const length = this.getInputValue<number>('length') ?? 1;

    const result = THREE.MathUtils.pingpong(x, length);
    this.setOutputValue('result', result);
  }
}
