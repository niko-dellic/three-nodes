import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class RotationNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'RotationNode', 'Rotation');
    this.addInput({ name: 'object', type: PortType.Object3D });
    this.addInput({ name: 'rotation', type: PortType.Vector3 }); // Euler angles in radians
    this.addInput({ name: 'x', type: PortType.Number }); // Rotation around X axis (radians)
    this.addInput({ name: 'y', type: PortType.Number }); // Rotation around Y axis (radians)
    this.addInput({ name: 'z', type: PortType.Number }); // Rotation around Z axis (radians)
    this.addOutput({ name: 'object', type: PortType.Object3D });

    // Property for rotation order
    this.addProperty({
      name: 'order',
      type: 'list',
      value: 'XYZ',
      label: 'Rotation Order',
      options: {
        XYZ: 'XYZ',
        YZX: 'YZX',
        ZXY: 'ZXY',
        XZY: 'XZY',
        YXZ: 'YXZ',
        ZYX: 'ZYX',
      },
    });
  }

  evaluate(_context: EvaluationContext): void {
    const object = this.getInputValue<THREE.Object3D>('object');

    if (!object) {
      this.setOutputValue('object', undefined);
      return;
    }

    const order = (this.getProperty('order') || 'XYZ') as THREE.EulerOrder;
    object.rotation.order = order;

    // Check if rotation vector is provided
    const rotationVector = this.getInputValue<THREE.Vector3>('rotation');
    if (rotationVector) {
      object.rotation.set(rotationVector.x, rotationVector.y, rotationVector.z, order);
    } else {
      // Use individual x, y, z values if provided
      const x = this.getInputValue<number>('x');
      const y = this.getInputValue<number>('y');
      const z = this.getInputValue<number>('z');

      if (x !== undefined) object.rotation.x = x;
      if (y !== undefined) object.rotation.y = y;
      if (z !== undefined) object.rotation.z = z;
    }

    this.setOutputValue('object', object);
  }
}
