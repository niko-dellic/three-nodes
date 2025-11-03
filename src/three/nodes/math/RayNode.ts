import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class RayNode extends BaseThreeNode<'origin' | 'direction', 'result'> {
  constructor(id: string) {
    super(id, 'RayNode', 'Ray');
    this.addInput({ name: 'origin', type: PortType.Vector3, defaultValue: new THREE.Vector3(0, 0, 0) });
    this.addInput({ name: 'direction', type: PortType.Vector3, defaultValue: new THREE.Vector3(0, 0, -1) });
    this.addOutput({ name: 'result', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const origin = this.getInputValue<THREE.Vector3>('origin') ?? new THREE.Vector3(0, 0, 0);
    const direction = this.getInputValue<THREE.Vector3>('direction') ?? new THREE.Vector3(0, 0, -1);

    const ray = new THREE.Ray(origin, direction);
    this.setOutputValue('result', ray);
  }
}

