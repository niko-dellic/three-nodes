import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class Matrix4Node extends BaseThreeNode<
  'object' | 'matrix',
  'object'
> {
  constructor(id: string) {
    super(id, 'Matrix4Node', 'Matrix4');
    this.addInput({ name: 'object', type: PortType.Object3D });
    this.addInput({ name: 'matrix', type: PortType.Any }); // THREE.Matrix4
    this.addOutput({ name: 'object', type: PortType.Object3D });

    // Property for application mode
    this.addProperty({
      name: 'mode',
      type: 'list',
      value: 'set',
      label: 'Mode',
      options: {
        Set: 'set',
        Multiply: 'multiply',
        Premultiply: 'premultiply',
      },
    });
  }

  evaluate(_context: EvaluationContext): void {
    const object = this.getInputValue<THREE.Object3D>('object');
    const matrix = this.getInputValue<THREE.Matrix4>('matrix');

    if (!object) {
      this.setOutputValue('object', undefined);
      return;
    }

    if (!matrix || !(matrix instanceof THREE.Matrix4)) {
      // If no valid matrix, pass through a clone to maintain non-destructive workflow
      this.setOutputValue('object', object.clone());
      return;
    }

    // Clone the object to avoid mutating upstream nodes (non-destructive workflow)
    // This shares geometry/materials (memory efficient) but clones transform hierarchy
    const clonedObject = object.clone();

    const mode = this.getProperty('mode') || 'set';

    switch (mode) {
      case 'set':
        clonedObject.matrix.copy(matrix);
        clonedObject.matrix.decompose(clonedObject.position, clonedObject.quaternion, clonedObject.scale);
        break;
      case 'multiply':
        clonedObject.applyMatrix4(matrix);
        break;
      case 'premultiply':
        clonedObject.matrix.premultiply(matrix);
        clonedObject.matrix.decompose(clonedObject.position, clonedObject.quaternion, clonedObject.scale);
        break;
    }

    this.setOutputValue('object', clonedObject);
  }
}
