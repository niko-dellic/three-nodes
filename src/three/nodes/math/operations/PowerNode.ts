import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class PowerNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'PowerNode', 'Power');
    this.addInput({ name: 'base', type: PortType.Number, defaultValue: 2 });
    this.addInput({ name: 'exponent', type: PortType.Number, defaultValue: 2 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const baseValues = this.getInputValues<number>('base');
    const exponentValues = this.getInputValues<number>('exponent');

    if (baseValues.length > 1 || exponentValues.length > 1) {
      const results = this.processArrays<number>(
        { base: baseValues, exponent: exponentValues },
        (values) => Math.pow(values.base ?? 2, values.exponent ?? 2)
      );
      this.setOutputValue('result', results);
    } else {
      const base = baseValues[0] ?? 2;
      const exponent = exponentValues[0] ?? 2;
      this.setOutputValue('result', Math.pow(base, exponent));
    }
  }
}
