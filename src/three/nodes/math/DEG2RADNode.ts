import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class DEG2RADNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'DEG2RADNode', 'DEG2RAD');
    this.addOutput({ name: 'value', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    this.setOutputValue('value', Math.PI / 180);
  }
}
