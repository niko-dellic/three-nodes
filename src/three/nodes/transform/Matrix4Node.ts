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
      // If no valid matrix, just pass through
      this.setOutputValue('object', object);
      return;
    }

    const mode = this.getProperty('mode') || 'set';

    switch (mode) {
      case 'set':
        object.matrix.copy(matrix);
        object.matrix.decompose(object.position, object.quaternion, object.scale);
        break;
      case 'multiply':
        object.applyMatrix4(matrix);
        break;
      case 'premultiply':
        object.matrix.premultiply(matrix);
        object.matrix.decompose(object.position, object.quaternion, object.scale);
        break;
    }

    this.setOutputValue('object', object);
  }
}
