import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class DistanceNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'DistanceNode', 'Distance');
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

    const distance = vectorA.distanceTo(vectorB);
    this.setOutputValue('result', distance);
  }
}
