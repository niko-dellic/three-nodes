import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class LineCurve3Node extends BaseThreeNode<'start' | 'end', 'curve'> {
  constructor(id: string) {
    super(id, 'LineCurve3Node', 'Line Curve 3D');
    this.addInput({ name: 'start', type: PortType.Vector3, defaultValue: new THREE.Vector3(0, 0, 0) });
    this.addInput({ name: 'end', type: PortType.Vector3, defaultValue: new THREE.Vector3(1, 1, 1) });
    this.addOutput({ name: 'curve', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const start = this.getInputValue<THREE.Vector3>('start') ?? new THREE.Vector3(0, 0, 0);
    const end = this.getInputValue<THREE.Vector3>('end') ?? new THREE.Vector3(1, 1, 1);

    const curve = new THREE.LineCurve3(start, end);
    this.setOutputValue('curve', curve);
  }
}

