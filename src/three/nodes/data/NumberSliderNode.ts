import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core/types';

export class NumberSliderNode extends BaseThreeNode {
  private currentValue: number = 0;

  constructor(id: string) {
    super(id, 'NumberSliderNode', 'Number Slider');

    // Slider configuration inputs
    this.addInput({ name: 'min', type: PortType.Number, defaultValue: -10 });
    this.addInput({ name: 'max', type: PortType.Number, defaultValue: 10 });
    this.addInput({ name: 'step', type: PortType.Number, defaultValue: 0.1 });
    this.addInput({ name: 'default', type: PortType.Number, defaultValue: 0 });

    // Output
    this.addOutput({ name: 'value', type: PortType.Number });

    // Initialize with default value
    this.currentValue = 0;
  }

  evaluate(_context: EvaluationContext): void {
    const minValue = this.getInputValue<number>('min') ?? -10;
    const maxValue = this.getInputValue<number>('max') ?? 10;
    const defaultValue = this.getInputValue<number>('default') ?? 0;

    // Clamp current value to range
    if (this.currentValue < minValue) this.currentValue = minValue;
    if (this.currentValue > maxValue) this.currentValue = maxValue;

    // On first evaluation, use default
    if (this.outputs.get('value')?.value === undefined) {
      this.currentValue = Math.max(minValue, Math.min(maxValue, defaultValue));
    }

    this.setOutputValue('value', this.currentValue);
  }

  setValue(value: number): void {
    this.currentValue = value;
    this.markDirty();
  }

  getValue(): number {
    return this.currentValue;
  }

  getMin(): number {
    return this.getInputValue<number>('min') ?? -10;
  }

  getMax(): number {
    return this.getInputValue<number>('max') ?? 10;
  }

  getStep(): number {
    return this.getInputValue<number>('step') ?? 0.1;
  }
}
