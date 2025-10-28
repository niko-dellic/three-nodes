import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class ScaleNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'ScaleNode', 'Scale');
    this.addInput({ name: 'object', type: PortType.Object3D });
    this.addInput({ name: 'scale', type: PortType.Vector3 });
    this.addInput({ name: 'uniform', type: PortType.Number }); // Uniform scale for all axes
    this.addInput({ name: 'x', type: PortType.Number });
    this.addInput({ name: 'y', type: PortType.Number });
    this.addInput({ name: 'z', type: PortType.Number });
    this.addOutput({ name: 'object', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const object = this.getInputValue<THREE.Object3D>('object');

    if (!object) {
      this.setOutputValue('object', undefined);
      return;
    }

    // Check if uniform scale is provided
    const uniform = this.getInputValue<number>('uniform');
    if (uniform !== undefined) {
      object.scale.set(uniform, uniform, uniform);
    } else {
      // Check if scale vector is provided
      const scaleVector = this.getInputValue<THREE.Vector3>('scale');
      if (scaleVector) {
        object.scale.copy(scaleVector);
      } else {
        // Use individual x, y, z values if provided
        const x = this.getInputValue<number>('x');
        const y = this.getInputValue<number>('y');
        const z = this.getInputValue<number>('z');

        if (x !== undefined) object.scale.x = x;
        if (y !== undefined) object.scale.y = y;
        if (z !== undefined) object.scale.z = z;
      }
    }

    this.setOutputValue('object', object);
  }
}
