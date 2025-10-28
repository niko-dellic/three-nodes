import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class MergeGeometriesNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'MergeGeometriesNode', 'Merge Geometries');
    this.addInput({ name: 'geometries', type: PortType.Geometry }); // Array input
    this.addOutput({ name: 'geometry', type: PortType.Geometry });

    // Property for merge options
    this.addProperty({ name: 'useGroups', type: 'boolean', value: false, label: 'Use Groups' });
  }

  evaluate(_context: EvaluationContext): void {
    const geometries = this.getInputValues<THREE.BufferGeometry>('geometries');
    const useGroups = this.getProperty('useGroups') ?? false;

    if (geometries.length === 0) {
      this.setOutputValue('geometry', undefined);
      return;
    }

    // Flatten if array contains arrays
    const flatGeometries: THREE.BufferGeometry[] = [];
    for (const geom of geometries) {
      if (Array.isArray(geom)) {
        flatGeometries.push(...geom);
      } else if (geom) {
        flatGeometries.push(geom);
      }
    }

    if (flatGeometries.length === 0) {
      this.setOutputValue('geometry', undefined);
      return;
    }

    try {
      const merged = mergeGeometries(flatGeometries, useGroups);
      if (merged) {
        this.trackResource(merged);
        this.setOutputValue('geometry', merged);
      } else {
        this.setOutputValue('geometry', undefined);
      }
    } catch (error) {
      console.error('Error merging geometries:', error);
      this.setOutputValue('geometry', undefined);
    }
  }
}
