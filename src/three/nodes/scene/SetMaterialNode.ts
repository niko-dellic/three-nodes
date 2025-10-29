import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Set Material Node
 * Updates the material of a mesh or object
 */
export class SetMaterialNode extends BaseThreeNode<'object' | 'material', 'object'> {
  constructor(id: string) {
    super(id, 'SetMaterialNode', 'Set Material');

    this.addInput({ name: 'object', type: PortType.Object3D });
    this.addInput({ name: 'material', type: PortType.Material });

    this.addOutput({ name: 'object', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const object = this.getInputValue<THREE.Object3D>('object');
    const material = this.getInputValue<THREE.Material>('material');

    if (!object) {
      console.warn('SetMaterialNode: No object provided');
      this.setOutputValue('object', undefined);
      return;
    }

    if (!material) {
      console.warn('SetMaterialNode: No material provided');
      this.setOutputValue('object', object);
      return;
    }

    // Check if the object is a Mesh or InstancedMesh
    if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
      object.material = material;
    }
    // Check if it's a Line
    else if (object instanceof THREE.Line || object instanceof THREE.LineSegments) {
      object.material = material;
    }
    // Check if it's Points
    else if (object instanceof THREE.Points) {
      object.material = material;
    }
    // Check if it's a Sprite
    else if (object instanceof THREE.Sprite) {
      object.material = material as THREE.SpriteMaterial;
    }
    // If it's a group or Object3D, try to set material on all children
    else if (object instanceof THREE.Group || object instanceof THREE.Object3D) {
      object.traverse((child) => {
        if (
          child instanceof THREE.Mesh ||
          child instanceof THREE.InstancedMesh ||
          child instanceof THREE.Line ||
          child instanceof THREE.LineSegments ||
          child instanceof THREE.Points
        ) {
          child.material = material;
        }
      });
    } else {
      console.warn('SetMaterialNode: Object type does not support materials');
    }

    this.setOutputValue('object', object);
  }
}
