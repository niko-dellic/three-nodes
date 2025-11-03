import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';

export class OctreeNode extends BaseThreeNode<'object3D', 'octree'> {
  constructor(id: string) {
    super(id, 'OctreeNode', 'Octree');
    this.addInput({ name: 'object3D', type: PortType.Object3D });
    this.addOutput({ name: 'octree', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const object3D = this.getInputValue<THREE.Object3D>('object3D');

    const octree = new Octree();
    
    if (object3D) {
      octree.fromGraphNode(object3D);
    }

    this.setOutputValue('octree', octree);
  }
}

