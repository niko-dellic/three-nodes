import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class GetPointsOnCurveNode extends BaseThreeNode<'curve' | 'divisions', 'points'> {
  constructor(id: string) {
    super(id, 'GetPointsOnCurveNode', 'Get Points on Curve');
    this.addInput({ name: 'curve', type: PortType.Any });
    this.addInput({ name: 'divisions', type: PortType.Number, defaultValue: 50 });
    this.addOutput({ name: 'points', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const curve = this.getInputValue<THREE.Curve<THREE.Vector3>>('curve');
    const divisions = this.getInputValue<number>('divisions') ?? 50;

    if (!curve) {
      console.warn('GetPointsOnCurveNode: No curve provided');
      return;
    }

    const points = curve.getPoints(Math.max(2, Math.floor(divisions)));
    this.setOutputValue('points', points);
  }
}

