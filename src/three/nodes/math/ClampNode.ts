import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class ClampNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'ClampNode', 'Clamp');
    this.addInput({ name: 'value', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'min', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'max', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const value = this.getInputValue<number>('value') ?? 0;
    const min = this.getInputValue<number>('min') ?? 0;
    const max = this.getInputValue<number>('max') ?? 1;

    const result = THREE.MathUtils.clamp(value, min, max);
    this.setOutputValue('result', result);
  }
}
