import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class DotProductNode extends BaseThreeNode<
  'vectorA' | 'vectorB',
  'result'
> {
  constructor(id: string) {
    super(id, 'DotProductNode', 'Dot Product');
    this.addInput({ name: 'vectorA', type: PortType.Vector3 });
    this.addInput({ name: 'vectorB', type: PortType.Vector3 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const vectorA = this.getInputValue<THREE.Vector3>('vectorA');
    const vectorB = this.getInputValue<THREE.Vector3>('vectorB');

    if (!vectorA || !vectorB) {
      this.setOutputValue('result', 0);
      return;
    }

    const dotProduct = vectorA.dot(vectorB);
    this.setOutputValue('result', dotProduct);
  }
}
