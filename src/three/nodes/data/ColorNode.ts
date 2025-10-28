import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class ColorNode extends BaseThreeNode<
  'r' | 'g' | 'b',
  'color'
> {
  constructor(id: string) {
    super(id, 'ColorNode', 'Color');
    this.addInput({ name: 'r', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'g', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'b', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'color', type: PortType.Color });
  }

  evaluate(_context: EvaluationContext): void {
    const r = this.getInputValue<number>('r') ?? 1;
    const g = this.getInputValue<number>('g') ?? 1;
    const b = this.getInputValue<number>('b') ?? 1;

    const color = new THREE.Color(r, g, b);
    this.setOutputValue('color', color);
  }
}
