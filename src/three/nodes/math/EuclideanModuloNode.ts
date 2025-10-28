import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class EuclideanModuloNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'EuclideanModuloNode', 'Euclidean Modulo');
    this.addInput({ name: 'n', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'm', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const n = this.getInputValue<number>('n') ?? 0;
    const m = this.getInputValue<number>('m') ?? 1;

    const result = THREE.MathUtils.euclideanModulo(n, m);
    this.setOutputValue('result', result);
  }
}
