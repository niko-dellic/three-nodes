import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class TransformNode extends BaseThreeNode<
  'object' | 'position' | 'rotation' | 'scale',
  'object'
> {
  constructor(id: string) {
    super(id, 'TransformNode', 'Transform');
    this.addInput({ name: 'object', type: PortType.Object3D });
    this.addInput({ name: 'position', type: PortType.Vector3 });
    this.addInput({ name: 'rotation', type: PortType.Vector3 }); // Euler angles in radians
    this.addInput({ name: 'scale', type: PortType.Vector3 });
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

    // Clone the object to avoid mutating upstream nodes (non-destructive workflow)
    // This shares geometry/materials (memory efficient) but clones transform hierarchy
    const clonedObject = object.clone();

    // Apply position if provided
    const positionVector = this.getInputValue<THREE.Vector3>('position');
    if (positionVector) {
      clonedObject.position.copy(positionVector);
    }

    // Apply rotation if provided
    const rotationVector = this.getInputValue<THREE.Vector3>('rotation');
    if (rotationVector) {
      const order = (this.getProperty('order') || 'XYZ') as THREE.EulerOrder;
      clonedObject.rotation.order = order;
      clonedObject.rotation.set(rotationVector.x, rotationVector.y, rotationVector.z, order);
    }

    // Apply scale if provided
    const scaleVector = this.getInputValue<THREE.Vector3>('scale');
    if (scaleVector) {
      clonedObject.scale.copy(scaleVector);
    }

    this.setOutputValue('object', clonedObject);
  }
}

