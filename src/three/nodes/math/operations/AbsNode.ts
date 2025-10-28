import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class AbsNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'AbsNode', 'Absolute Value');
    this.addInput({ name: 'value', type: PortType.Number, defaultValue: 0 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const values = this.getInputValues<number>('value');

    if (values.length > 1) {
      const results = values.map((v) => Math.abs(v ?? 0));
      this.setOutputValue('result', results);
    } else {
      const value = values[0] ?? 0;
      this.setOutputValue('result', Math.abs(value));
    }
  }
}
