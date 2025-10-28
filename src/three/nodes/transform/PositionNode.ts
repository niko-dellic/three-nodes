import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class PositionNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'PositionNode', 'Position');
    this.addInput({ name: 'object', type: PortType.Object3D });
    this.addInput({ name: 'position', type: PortType.Vector3 });
    this.addOutput({ name: 'object', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const object = this.getInputValue<THREE.Object3D>('object');

    if (!object) {
      this.setOutputValue('object', undefined);
      return;
    }

    // Check if position vector is provided
    const positionVector = this.getInputValue<THREE.Vector3>('position');
    if (positionVector) {
      object.position.copy(positionVector);
    }
    this.setOutputValue('object', object);
  }
}
