import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class NumberNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'NumberNode', 'Number');
    this.addInput({ name: 'value', type: PortType.Number, defaultValue: 0 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const value = this.getInputValue<number>('value') ?? 0;
    this.setOutputValue('result', value);
  }
}
