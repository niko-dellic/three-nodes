import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class ExtractNode extends BaseThreeNode<'array' | 'index', 'value'> {
  constructor(id: string) {
    super(id, 'ExtractNode', 'Extract');

    // Input array to extract from
    this.addInput({ name: 'array', type: PortType.Any });

    // Input index or indices to extract
    // Can be a single number or an array of numbers
    this.addInput({ name: 'index', type: PortType.Number, defaultValue: 0 });

    // Single output that returns either a single value or array of values
    this.addOutput({ name: 'value', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const array = this.getInputValue<any[]>('array');
    const indexInput = this.getInputValue<number | number[]>('index');

    // If no array input, return undefined
    if (!Array.isArray(array)) {
      this.setOutputValue('value', undefined);
      return;
    }

    // Handle undefined index (default to 0)
    if (indexInput === undefined || indexInput === null) {
      this.setOutputValue('value', array[0]);
      return;
    }

    // Check if index is an array of indices
    if (Array.isArray(indexInput)) {
      // Return array of elements at specified indices
      const result = indexInput.map((idx) => {
        const index = Math.floor(idx);
        return index >= 0 && index < array.length ? array[index] : undefined;
      });
      this.setOutputValue('value', result);
    } else {
      // Single index - return single element
      const index = Math.floor(indexInput);
      const value = index >= 0 && index < array.length ? array[index] : undefined;
      this.setOutputValue('value', value);
    }
  }
}
