import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core/types';

export class StringInputNode extends TweakpaneNode {
  private currentValue: string = '';
  private params = { value: '' };

  constructor(id: string) {
    super(id, 'StringInputNode', 'String Input');

    // Default string property
    this.addProperty({ name: 'default', type: 'string', value: '', label: 'Default' });

    // Output
    this.addOutput({ name: 'value', type: PortType.String });

    // Initialize with default value
    this.currentValue = '';
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    this.params.value = this.currentValue;

    this.pane.addBinding(this.params, 'value').on('change', (ev) => {
      this.currentValue = ev.value;
      this.onTweakpaneChange();
    });
  }

  evaluate(_context: EvaluationContext): void {
    const defaultValue = this.getProperty('default') ?? '';

    // On first evaluation, use default
    if (this.outputs.get('value')?.value === undefined) {
      this.currentValue = defaultValue;
    }

    this.setOutputValue('value', this.currentValue);
  }

  setValue(value: string): void {
    this.currentValue = value;
    this.params.value = value;
    this.markDirty();
  }

  getValue(): string {
    return this.currentValue;
  }
}
