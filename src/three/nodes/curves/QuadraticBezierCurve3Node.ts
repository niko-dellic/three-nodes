import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class QuadraticBezierCurve3Node extends BaseThreeNode<'v0' | 'v1' | 'v2', 'curve'> {
  constructor(id: string) {
    super(id, 'QuadraticBezierCurve3Node', 'Quadratic Bezier Curve 3D');
    this.addInput({ name: 'v0', type: PortType.Vector3, defaultValue: new THREE.Vector3(0, 0, 0) });
    this.addInput({ name: 'v1', type: PortType.Vector3, defaultValue: new THREE.Vector3(1, 1, 0) });
    this.addInput({ name: 'v2', type: PortType.Vector3, defaultValue: new THREE.Vector3(2, 0, 0) });
    this.addOutput({ name: 'curve', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const v0 = this.getInputValue<THREE.Vector3>('v0') ?? new THREE.Vector3(0, 0, 0);
    const v1 = this.getInputValue<THREE.Vector3>('v1') ?? new THREE.Vector3(1, 1, 0);
    const v2 = this.getInputValue<THREE.Vector3>('v2') ?? new THREE.Vector3(2, 0, 0);

    const curve = new THREE.QuadraticBezierCurve3(v0, v1, v2);
    this.setOutputValue('curve', curve);
  }
}

