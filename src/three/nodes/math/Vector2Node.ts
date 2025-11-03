import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class Vector2Node extends BaseThreeNode<'x' | 'y', 'result'> {
  constructor(id: string) {
    super(id, 'Vector2Node', 'Vector2');
    this.addInput({ name: 'x', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'y', type: PortType.Number, defaultValue: 0 });
    this.addOutput({ name: 'result', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const x = this.getInputValue<number>('x') ?? 0;
    const y = this.getInputValue<number>('y') ?? 0;

    const vector = new THREE.Vector2(x, y);
    this.setOutputValue('result', vector);
  }
}

