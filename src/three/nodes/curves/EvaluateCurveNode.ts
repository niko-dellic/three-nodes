import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class EvaluateCurveNode extends BaseThreeNode<'curve' | 't', 'point' | 'tangent'> {
  constructor(id: string) {
    super(id, 'EvaluateCurveNode', 'Evaluate Curve');
    this.addInput({ name: 'curve', type: PortType.Any });
    this.addInput({ name: 't', type: PortType.Number, defaultValue: 0.5 });
    this.addOutput({ name: 'point', type: PortType.Vector3 });
    this.addOutput({ name: 'tangent', type: PortType.Vector3 });
  }

  evaluate(_context: EvaluationContext): void {
    const curve = this.getInputValue<THREE.Curve<THREE.Vector3>>('curve');
    const t = this.getInputValue<number>('t') ?? 0.5;

    if (!curve) {
      console.warn('EvaluateCurveNode: No curve provided');
      return;
    }

    const clampedT = Math.max(0, Math.min(1, t));
    const point = curve.getPoint(clampedT);
    const tangent = curve.getTangent(clampedT);

    this.setOutputValue('point', point);
    this.setOutputValue('tangent', tangent);
  }
}

