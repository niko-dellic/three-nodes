import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';

export class CapsuleMathNode extends BaseThreeNode<'start' | 'end' | 'radius', 'capsule'> {
  constructor(id: string) {
    super(id, 'CapsuleMathNode', 'Capsule (Math)');
    this.addInput({ name: 'start', type: PortType.Vector3, defaultValue: new THREE.Vector3(0, 0, 0) });
    this.addInput({ name: 'end', type: PortType.Vector3, defaultValue: new THREE.Vector3(0, 1, 0) });
    this.addInput({ name: 'radius', type: PortType.Number, defaultValue: 0.5 });
    this.addOutput({ name: 'capsule', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const start = this.getInputValue<THREE.Vector3>('start') ?? new THREE.Vector3(0, 0, 0);
    const end = this.getInputValue<THREE.Vector3>('end') ?? new THREE.Vector3(0, 1, 0);
    const radius = this.getInputValue<number>('radius') ?? 0.5;

    const capsule = new Capsule(start, end, radius);
    this.setOutputValue('capsule', capsule);
  }
}

