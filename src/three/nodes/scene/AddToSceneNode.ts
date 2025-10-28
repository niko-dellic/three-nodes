import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class AddToSceneNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'AddToSceneNode', 'Add to Scene');
    this.addInput({ name: 'scene', type: PortType.Scene });
    this.addInput({ name: 'object', type: PortType.Object3D });
    this.addOutput({ name: 'scene', type: PortType.Scene });
  }

  evaluate(_context: EvaluationContext): void {
    const scene = this.getInputValue<THREE.Scene>('scene');
    const object = this.getInputValue<THREE.Object3D>('object');

    if (scene && object) {
      // Remove object from previous parent if it has one
      if (object.parent) {
        object.parent.remove(object);
      }
      scene.add(object);
    }

    this.setOutputValue('scene', scene);
  }
}
