import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class EulerNode extends BaseThreeNode<'x' | 'y' | 'z' | 'order', 'result'> {
  constructor(id: string) {
    super(id, 'EulerNode', 'Euler');
    this.addInput({ name: 'x', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'y', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'z', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'order', type: PortType.String, defaultValue: 'XYZ' });
    this.addOutput({ name: 'result', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const x = this.getInputValue<number>('x') ?? 0;
    const y = this.getInputValue<number>('y') ?? 0;
    const z = this.getInputValue<number>('z') ?? 0;
    const order = this.getInputValue<string>('order') ?? 'XYZ';

    const euler = new THREE.Euler(x, y, z, order as THREE.EulerOrder);
    this.setOutputValue('result', euler);
  }
}

