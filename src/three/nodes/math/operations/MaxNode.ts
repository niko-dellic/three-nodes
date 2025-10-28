import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class MaxNode extends BaseThreeNode<
  'a' | 'b',
  'result'
> {
  constructor(id: string) {
    super(id, 'MaxNode', 'Maximum');
    this.addInput({ name: 'a', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'b', type: PortType.Number, defaultValue: 0 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const aValues = this.getInputValues<number>('a');
    const bValues = this.getInputValues<number>('b');

    if (aValues.length > 1 || bValues.length > 1) {
      const results = this.processArrays<number>({ a: aValues, b: bValues }, (values) =>
        Math.max(values.a ?? 0, values.b ?? 0)
      );
      this.setOutputValue('result', results);
    } else {
      const a = aValues[0] ?? 0;
      const b = bValues[0] ?? 0;
      this.setOutputValue('result', Math.max(a, b));
    }
  }
}
