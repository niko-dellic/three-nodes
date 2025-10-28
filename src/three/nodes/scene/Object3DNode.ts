import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Object3D Node
 * Creates a basic empty Object3D container
 * Useful for grouping, transforms, and hierarchy
 */
export class Object3DNode extends BaseThreeNode {
  private object: THREE.Object3D;

  constructor(id: string) {
    super(id, 'Object3DNode', 'Object3D');

    this.object = new THREE.Object3D();
    this.object.name = 'Object3D';

    // Optional transform inputs
    this.addInput({ name: 'position', type: PortType.Vector3 });
    this.addInput({ name: 'rotation', type: PortType.Vector3 });
    this.addInput({ name: 'scale', type: PortType.Vector3 });

    // Child objects to add to this Object3D
    this.addInput({ name: 'children', type: PortType.Object3D });

    this.addOutput({ name: 'object', type: PortType.Object3D });

    // Properties
    this.addProperty({ name: 'name', type: 'string', value: 'Object3D', label: 'Name' });
    this.addProperty({ name: 'visible', type: 'boolean', value: true, label: 'Visible' });
  }

  evaluate(_context: EvaluationContext): void {
    // Clear existing children
    while (this.object.children.length > 0) {
      this.object.remove(this.object.children[0]);
    }

    // Apply transform if provided
    const position = this.getInputValue<THREE.Vector3>('position');
    if (position) {
      this.object.position.copy(position);
    }

    const rotation = this.getInputValue<THREE.Vector3>('rotation');
    if (rotation) {
      this.object.rotation.set(rotation.x, rotation.y, rotation.z);
    }

    const scale = this.getInputValue<THREE.Vector3>('scale');
    if (scale) {
      this.object.scale.copy(scale);
    }

    // Add children
    const children = this.getInputValues<THREE.Object3D>('children');
    for (const child of children) {
      if (child) {
        // Handle arrays
        if (Array.isArray(child)) {
          for (const c of child) {
            if (c instanceof THREE.Object3D) {
              this.object.add(c);
            }
          }
        } else if (child instanceof THREE.Object3D) {
          this.object.add(child);
        }
      }
    }

    // Apply properties
    const name = this.getProperty('name');
    if (name) {
      this.object.name = name;
    }

    const visible = this.getProperty('visible');
    if (visible !== undefined) {
      this.object.visible = visible;
    }

    this.setOutputValue('object', this.object);
  }

  dispose(): void {
    // Clear children
    while (this.object.children.length > 0) {
      this.object.remove(this.object.children[0]);
    }
    super.dispose();
  }
}
