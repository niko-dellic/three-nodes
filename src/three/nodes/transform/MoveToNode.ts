import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * MoveToNode - Move object relative to its current position
 * Unlike PositionNode which sets absolute position, this adds to current position
 */
export class MoveToNode extends BaseThreeNode<
  'object' | 'offset',
  'object'
> {
  constructor(id: string) {
    super(id, 'MoveToNode', 'Move To');
    this.addInput({ name: 'object', type: PortType.Object3D });
    this.addInput({ name: 'offset', type: PortType.Vector3 });
    this.addOutput({ name: 'object', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const object = this.getInputValue<THREE.Object3D>('object');

    if (!object) {
      this.setOutputValue('object', undefined);
      return;
    }

    // Check if offset vector is provided
    const offsetVector = this.getInputValue<THREE.Vector3>('offset');
    if (offsetVector) {
      // Move relative to current position
      object.position.add(offsetVector);
    }

    this.setOutputValue('object', object);
  }
}
