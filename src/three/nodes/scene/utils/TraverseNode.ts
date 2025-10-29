import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Traverse Node
 * Traverses all objects in an Object3D hierarchy and outputs them as an array
 * Reference: https://threejs.org/docs/#api/en/core/Object3D.traverse
 *
 * This node collects all objects in the hierarchy. Use filter nodes or
 * other processing nodes to work with the resulting array.
 */
export class TraverseNode extends BaseThreeNode<'object', 'objects'> {
  constructor(id: string) {
    super(id, 'TraverseNode', 'Traverse');

    // Input: Object3D or array of Object3Ds to traverse
    this.addInput({ name: 'object', type: PortType.Object3D });

    // Output: Array of all traversed objects
    this.addOutput({ name: 'objects', type: PortType.Object3D });

    // Properties
    this.addProperty({ name: 'includeSelf', type: 'boolean', value: true, label: 'Include Root' });
    this.addProperty({ name: 'onlyVisible', type: 'boolean', value: false, label: 'Only Visible' });
    this.addProperty({
      name: 'maxDepth',
      type: 'number',
      value: -1,
      label: 'Max Depth (-1 = unlimited)',
    });
  }

  evaluate(_context: EvaluationContext): void {
    const inputObjects = this.getInputValues<THREE.Object3D>('object');

    // Flatten all objects (handle both single objects and arrays)
    const objects: THREE.Object3D[] = [];
    for (const obj of inputObjects) {
      if (obj) {
        if (Array.isArray(obj)) {
          objects.push(...obj.filter((o) => o !== null && o !== undefined));
        } else {
          objects.push(obj);
        }
      }
    }

    if (objects.length === 0) {
      this.setOutputValue('objects', []);
      return;
    }

    // Get properties
    const includeSelf = this.getProperty('includeSelf') ?? true;
    const onlyVisible = this.getProperty('onlyVisible') ?? false;
    const maxDepth = this.getProperty('maxDepth') ?? -1;

    // Collect all traversed objects
    const traversed: THREE.Object3D[] = [];

    for (const obj of objects) {
      if (maxDepth === -1) {
        // Unlimited depth
        obj.traverse((child) => {
          if (onlyVisible && !child.visible) {
            return;
          }

          // Skip root if not including self
          if (!includeSelf && child === obj) {
            return;
          }

          traversed.push(child);
        });
      } else {
        // Limited depth
        this.traverseWithDepth(obj, 0, maxDepth, includeSelf, onlyVisible, traversed);
      }
    }

    this.setOutputValue('objects', traversed);
  }

  private traverseWithDepth(
    obj: THREE.Object3D,
    currentDepth: number,
    maxDepth: number,
    includeSelf: boolean,
    onlyVisible: boolean,
    result: THREE.Object3D[]
  ): void {
    // Check visibility
    if (onlyVisible && !obj.visible) {
      return;
    }

    // Add current object if we should include it
    if (includeSelf || currentDepth > 0) {
      result.push(obj);
    }

    // Continue to children if we haven't reached max depth
    if (currentDepth < maxDepth) {
      for (const child of obj.children) {
        this.traverseWithDepth(child, currentDepth + 1, maxDepth, true, onlyVisible, result);
      }
    }
  }
}
