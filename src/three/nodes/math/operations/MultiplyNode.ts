import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class MultiplyNode extends BaseThreeNode<
  'a' | 'b',
  'result'
> {
  constructor(id: string) {
    super(id, 'MultiplyNode', 'Multiply');
    this.addInput({ name: 'a', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'b', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const aValues = this.getInputValues<number>('a');
    const bValues = this.getInputValues<number>('b');

    if (aValues.length > 1 || bValues.length > 1) {
      const results = this.processArrays<number>(
        { a: aValues, b: bValues },
        (values) => (values.a ?? 1) * (values.b ?? 1)
      );
      this.setOutputValue('result', results);
    } else {
      const a = aValues[0] ?? 1;
      const b = bValues[0] ?? 1;
      this.setOutputValue('result', a * b);
    }
  }
}
