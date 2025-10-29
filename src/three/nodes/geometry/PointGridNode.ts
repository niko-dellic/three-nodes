import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Point Grid Node
 * Creates a grid of Vector3 points in 3D space
 */
export class PointGridNode extends BaseThreeNode<
  'xCount' | 'yCount' | 'zCount' | 'spacing',
  'points'
> {
  constructor(id: string) {
    super(id, 'PointGridNode', 'Point Grid');

    this.addInput({ name: 'xCount', type: PortType.Number, defaultValue: 5 });
    this.addInput({ name: 'yCount', type: PortType.Number, defaultValue: 5 });
    this.addInput({ name: 'zCount', type: PortType.Number, defaultValue: 5 });
    this.addInput({ name: 'spacing', type: PortType.Number, defaultValue: 5 });

    this.addOutput({ name: 'points', type: PortType.Any }); // Array of Vector3
  }

  evaluate(_context: EvaluationContext): void {
    const xCount = Math.max(1, Math.floor(this.getInputValue<number>('xCount') ?? 5));
    const yCount = Math.max(1, Math.floor(this.getInputValue<number>('yCount') ?? 5));
    const zCount = Math.max(1, Math.floor(this.getInputValue<number>('zCount') ?? 5));
    const spacing = this.getInputValue<number>('spacing') ?? 5;

    // Calculate offsets to center the grid
    const xOffset = ((xCount - 1) * spacing) / 2;
    const yOffset = ((yCount - 1) * spacing) / 2;
    const zOffset = ((zCount - 1) * spacing) / 2;

    // Generate Vector3 array
    const points: THREE.Vector3[] = [];
    for (let z = 0; z < zCount; z++) {
      for (let y = 0; y < yCount; y++) {
        for (let x = 0; x < xCount; x++) {
          const point = new THREE.Vector3(
            x * spacing - xOffset,
            y * spacing - yOffset,
            z * spacing - zOffset
          );
          points.push(point);
        }
      }
    }

    this.setOutputValue('points', points);
  }
}
