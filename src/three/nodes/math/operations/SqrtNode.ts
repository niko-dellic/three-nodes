import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class SqrtNode extends BaseThreeNode<
  'value',
  'result'
> {
  constructor(id: string) {
    super(id, 'SqrtNode', 'Square Root');
    this.addInput({ name: 'value', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const values = this.getInputValues<number>('value');

    if (values.length > 1) {
      const results = values.map((v) => Math.sqrt(v ?? 1));
      this.setOutputValue('result', results);
    } else {
      const value = values[0] ?? 1;
      this.setOutputValue('result', Math.sqrt(value));
    }
  }
}
