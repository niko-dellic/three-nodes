import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class IndexNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'IndexNode', 'Index');

    // Inputs
    this.addInput({ name: 'array', type: PortType.Any });
    this.addInput({ name: 'index', type: PortType.Number, defaultValue: 0 });

    // Output
    this.addOutput({ name: 'value', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const array = this.getInputValue<any[]>('array');
    const index = this.getInputValue<number>('index') ?? 0;

    if (!Array.isArray(array)) {
      this.setOutputValue('value', undefined);
      return;
    }

    // Handle negative indices (Python-style)
    const actualIndex = index < 0 ? array.length + index : index;

    // Get value at index, or undefined if out of bounds
    const value = actualIndex >= 0 && actualIndex < array.length ? array[actualIndex] : undefined;
    this.setOutputValue('value', value);
  }
}
