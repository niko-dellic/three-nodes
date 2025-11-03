import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class CatmullRomCurve3Node extends BaseThreeNode<
  'points' | 'closed' | 'curveType' | 'tension',
  'curve'
> {
  constructor(id: string) {
    super(id, 'CatmullRomCurve3Node', 'Catmull-Rom Curve 3D');
    this.addInput({ name: 'points', type: PortType.Any, defaultValue: [] });
    this.addInput({ name: 'closed', type: PortType.Boolean, defaultValue: false });
    this.addInput({ name: 'curveType', type: PortType.String, defaultValue: 'centripetal' });
    this.addInput({ name: 'tension', type: PortType.Number, defaultValue: 0.5 });
    this.addOutput({ name: 'curve', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const points = this.getInputValue<THREE.Vector3[]>('points') ?? [];
    const closed = this.getInputValue<boolean>('closed') ?? false;
    const curveType = this.getInputValue<string>('curveType') ?? 'centripetal';
    const tension = this.getInputValue<number>('tension') ?? 0.5;

    if (!Array.isArray(points) || points.length === 0) {
      console.warn('CatmullRomCurve3Node: No points provided');
      return;
    }

    const curve = new THREE.CatmullRomCurve3(
      points,
      closed,
      curveType as 'centripetal' | 'chordal' | 'catmullrom',
      tension
    );
    this.setOutputValue('curve', curve);
  }
}

