import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class PlaneNode extends BaseThreeNode<'normal' | 'constant', 'result'> {
  constructor(id: string) {
    super(id, 'PlaneNode', 'Plane');
    this.addInput({ name: 'normal', type: PortType.Vector3, defaultValue: new THREE.Vector3(0, 1, 0) });
    this.addInput({ name: 'constant', type: PortType.Number, defaultValue: 0 });
    this.addOutput({ name: 'result', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const normal = this.getInputValue<THREE.Vector3>('normal') ?? new THREE.Vector3(0, 1, 0);
    const constant = this.getInputValue<number>('constant') ?? 0;

    const plane = new THREE.Plane(normal, constant);
    this.setOutputValue('result', plane);
  }
}

