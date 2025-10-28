import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class RAD2DEGNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'RAD2DEGNode', 'RAD2DEG');
    this.addOutput({ name: 'value', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    this.setOutputValue('value', 180 / Math.PI);
  }
}
