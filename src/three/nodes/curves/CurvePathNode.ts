import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class CurvePathNode extends BaseThreeNode<'curves', 'path'> {
  constructor(id: string) {
    super(id, 'CurvePathNode', 'Curve Path');
    this.addInput({ name: 'curves', type: PortType.Any, defaultValue: [] });
    this.addOutput({ name: 'path', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const curves = this.getInputValue<THREE.Curve<THREE.Vector3>[]>('curves') ?? [];

    if (!Array.isArray(curves) || curves.length === 0) {
      console.warn('CurvePathNode: No curves provided');
      return;
    }

    const path = new THREE.CurvePath<THREE.Vector3>();
    for (const curve of curves) {
      if (curve) {
        path.add(curve);
      }
    }

    this.setOutputValue('path', path);
  }
}

