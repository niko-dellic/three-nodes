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
      // Still clone to maintain non-destructive workflow
      this.setOutputValue('object', object.clone());
      return;
    }

    // Clone the object to avoid mutating upstream nodes (non-destructive workflow)
    // This shares geometry (memory efficient) but clones materials when necessary
    const clonedObject = object.clone();

    // Check if the object is a Mesh or InstancedMesh
    if (clonedObject instanceof THREE.Mesh || clonedObject instanceof THREE.InstancedMesh) {
      clonedObject.material = material;
    }
    // Check if it's a Line
    else if (clonedObject instanceof THREE.Line || clonedObject instanceof THREE.LineSegments) {
      clonedObject.material = material;
    }
    // Check if it's Points
    else if (clonedObject instanceof THREE.Points) {
      clonedObject.material = material;
    }
    // Check if it's a Sprite
    else if (clonedObject instanceof THREE.Sprite) {
      clonedObject.material = material as THREE.SpriteMaterial;
    }
    // If it's a group or Object3D, try to set material on all children
    else if (clonedObject instanceof THREE.Group || clonedObject instanceof THREE.Object3D) {
      clonedObject.traverse((child) => {
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

    this.setOutputValue('object', clonedObject);
  }
}
