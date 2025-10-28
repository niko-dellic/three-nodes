import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core/types';

export class NumberSliderNode extends TweakpaneNode {
  private currentValue: number = 0;
  private params = { value: 0 };

  constructor(id: string) {
    super(id, 'NumberSliderNode', 'Number Slider');

    // Slider configuration properties
    this.addProperty({ name: 'min', type: 'number', value: -10, label: 'Min', step: 1 });
    this.addProperty({ name: 'max', type: 'number', value: 10, label: 'Max', step: 1 });
    this.addProperty({
      name: 'step',
      type: 'number',
      value: 0.1,
      label: 'Step',
      min: 0.01,
      max: 10,
      step: 0.01,
    });
    this.addProperty({ name: 'default', type: 'number', value: 0, label: 'Default', step: 0.1 });

    // Output
    this.addOutput({ name: 'value', type: PortType.Number });

    // Initialize with default value
    this.currentValue = 0;
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    const minValue = this.getMin();
    const maxValue = this.getMax();
    const stepValue = this.getStep();

    this.params.value = this.currentValue;

    this.pane
      .addBinding(this.params, 'value', {
        min: minValue,
        max: maxValue,
        step: stepValue,
      })
      .on('change', (ev) => {
        this.currentValue = ev.value;
        this.onTweakpaneChange();
      });
  }

  evaluate(_context: EvaluationContext): void {
    const minValue = this.getProperty('min') ?? -10;
    const maxValue = this.getProperty('max') ?? 10;
    const defaultValue = this.getProperty('default') ?? 0;

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
    this.params.value = value;
    // Don't call refresh here - it will be called by the NodeRenderer if needed
    // Calling refresh here can cause infinite loops
    this.markDirty();
  }

  getValue(): number {
    return this.currentValue;
  }

  getMin(): number {
    return this.getProperty('min') ?? -10;
  }

  getMax(): number {
    return this.getProperty('max') ?? 10;
  }

  getStep(): number {
    return this.getProperty('step') ?? 0.1;
  }
}
