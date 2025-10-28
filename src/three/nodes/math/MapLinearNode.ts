import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class MapLinearNode extends BaseThreeNode<
  'x' | 'a1' | 'a2' | 'b1' | 'b2',
  'result'
> {
  constructor(id: string) {
    super(id, 'MapLinearNode', 'Map Linear');
    this.addInput({ name: 'x', type: PortType.Number, defaultValue: 0.5 });
    this.addInput({ name: 'a1', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'a2', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'b1', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'b2', type: PortType.Number, defaultValue: 10 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const x = this.getInputValue<number>('x') ?? 0.5;
    const a1 = this.getInputValue<number>('a1') ?? 0;
    const a2 = this.getInputValue<number>('a2') ?? 1;
    const b1 = this.getInputValue<number>('b1') ?? 0;
    const b2 = this.getInputValue<number>('b2') ?? 10;

    const result = THREE.MathUtils.mapLinear(x, a1, a2, b1, b2);
    this.setOutputValue('result', result);
  }
}
