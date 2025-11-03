import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';

export class OctreeHelperNode extends BaseThreeNode<'octree' | 'color', 'helper'> {
  constructor(id: string) {
    super(id, 'OctreeHelperNode', 'Octree Helper');
    this.addInput({ name: 'octree', type: PortType.Any });
    this.addInput({ name: 'color', type: PortType.Color });
    this.addOutput({ name: 'helper', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const octree = this.getInputValue<Octree>('octree');
    const color = this.getInputValue<number>('color');

    if (!octree) {
      console.warn('OctreeHelperNode: No octree provided');
      return;
    }

    const helper = new OctreeHelper(octree, color);
    this.setOutputValue('helper', helper);
  }
}

