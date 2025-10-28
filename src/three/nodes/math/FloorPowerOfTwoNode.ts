import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class FloorPowerOfTwoNode extends BaseThreeNode<
  'value',
  'result'
> {
  constructor(id: string) {
    super(id, 'FloorPowerOfTwoNode', 'Floor Power of Two');
    this.addInput({ name: 'value', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const value = this.getInputValue<number>('value') ?? 1;

    const result = THREE.MathUtils.floorPowerOfTwo(value);
    this.setOutputValue('result', result);
  }
}
