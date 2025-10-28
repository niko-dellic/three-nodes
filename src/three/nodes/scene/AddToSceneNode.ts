import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class AddToSceneNode extends BaseThreeNode<
  'scene' | 'object',
  'scene'
> {
  constructor(id: string) {
    super(id, 'AddToSceneNode', 'Add to Scene');
    this.addInput({ name: 'scene', type: PortType.Scene });
    this.addInput({ name: 'object', type: PortType.Object3D });
    this.addOutput({ name: 'scene', type: PortType.Scene });
  }

  evaluate(_context: EvaluationContext): void {
    const scene = this.getInputValue<THREE.Scene>('scene');
    const objects = this.getInputValues<THREE.Object3D>('object');

    if (scene && objects.length > 0) {
      // Clear previous objects from scene (optional - might want to make this configurable)
      // For now, just add new objects

      for (const obj of objects) {
        if (obj) {
          // Handle both single objects and arrays
          if (Array.isArray(obj)) {
            // Object input is an array of objects
            for (const o of obj) {
              if (o) {
                // Remove from previous parent if it has one
                if (o.parent) {
                  o.parent.remove(o);
                }
                scene.add(o);
              }
            }
          } else {
            // Single object
            // Remove from previous parent if it has one
            if (obj.parent) {
              obj.parent.remove(obj);
            }
            scene.add(obj);
          }
        }
      }
    }

    this.setOutputValue('scene', scene);
  }
}
