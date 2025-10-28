import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class SplitNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'SplitNode', 'Split');

    // Input array
    this.addInput({ name: 'array', type: PortType.Any });

    // Property for number of outputs
    this.addProperty({ name: 'outputCount', type: 'number', value: 4, label: 'Output Count' });

    // Create initial outputs
    this.updateOutputs();
  }

  private updateOutputs(): void {
    const count = this.getProperty('outputCount') ?? 4;

    // Clear existing outputs
    this.outputs.clear();

    // Create new outputs
    for (let i = 0; i < count; i++) {
      this.addOutput({ name: `output${i}`, type: PortType.Any });
    }
  }

  evaluate(_context: EvaluationContext): void {
    const array = this.getInputValue<any[]>('array');
    const count = this.getProperty('outputCount') ?? 4;

    if (!Array.isArray(array)) {
      // If input is not an array, set all outputs to undefined
      for (let i = 0; i < count; i++) {
        this.setOutputValue(`output${i}`, undefined);
      }
      return;
    }

    // Set each output to the corresponding array element
    for (let i = 0; i < count; i++) {
      const value = i < array.length ? array[i] : undefined;
      this.setOutputValue(`output${i}`, value);
    }
  }
}
