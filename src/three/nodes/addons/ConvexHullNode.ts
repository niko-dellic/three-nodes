import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';

export class ConvexHullNode extends BaseThreeNode<'points', 'faces' | 'vertices'> {
  constructor(id: string) {
    super(id, 'ConvexHullNode', 'Convex Hull');
    this.addInput({ name: 'points', type: PortType.Any, defaultValue: [] });
    this.addOutput({ name: 'faces', type: PortType.Any });
    this.addOutput({ name: 'vertices', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const points = this.getInputValue<THREE.Vector3[]>('points') ?? [];

    if (!Array.isArray(points) || points.length === 0) {
      console.warn('ConvexHullNode: No points provided');
      return;
    }

    const convexHull = new ConvexHull();
    convexHull.setFromPoints(points);

    this.setOutputValue('faces', convexHull.faces);
    this.setOutputValue('vertices', convexHull.vertices);
  }
}

