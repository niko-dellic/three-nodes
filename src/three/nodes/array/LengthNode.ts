import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class LengthNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'LengthNode', 'Length');

    // Input
    this.addInput({ name: 'array', type: PortType.Any });

    // Output
    this.addOutput({ name: 'length', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const array = this.getInputValue<any[]>('array');

    if (!Array.isArray(array)) {
      this.setOutputValue('length', 0);
      return;
    }

    this.setOutputValue('length', array.length);
  }
}
