import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class CrossProductNode extends BaseThreeNode<
  'vectorA' | 'vectorB',
  'result'
> {
  constructor(id: string) {
    super(id, 'CrossProductNode', 'Cross Product');
    this.addInput({ name: 'vectorA', type: PortType.Vector3 });
    this.addInput({ name: 'vectorB', type: PortType.Vector3 });
    this.addOutput({ name: 'result', type: PortType.Vector3 });
  }

  evaluate(_context: EvaluationContext): void {
    const vectorA = this.getInputValue<THREE.Vector3>('vectorA');
    const vectorB = this.getInputValue<THREE.Vector3>('vectorB');

    if (!vectorA || !vectorB) {
      this.setOutputValue('result', new THREE.Vector3());
      return;
    }

    const result = new THREE.Vector3();
    result.crossVectors(vectorA, vectorB);
    this.setOutputValue('result', result);
  }
}
