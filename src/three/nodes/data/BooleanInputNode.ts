import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core/types';

export class BooleanInputNode extends TweakpaneNode<
  never,
  'value'
> {
  private currentValue: boolean = false;
  private params = { value: false };

  constructor(id: string) {
    super(id, 'BooleanInputNode', 'Boolean Input');

    // Default boolean property
    this.addProperty({ name: 'default', type: 'boolean', value: false, label: 'Default' });

    // Output
    this.addOutput({ name: 'value', type: PortType.Boolean });

    // Initialize with default value
    this.currentValue = false;
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
    const defaultValue = this.getProperty('default') ?? false;

    // On first evaluation, use default
    if (this.outputs.get('value')?.value === undefined) {
      this.currentValue = defaultValue;
    }

    this.setOutputValue('value', this.currentValue);
  }

  setValue(value: boolean): void {
    this.currentValue = value;
    this.params.value = value;
    this.markDirty();
  }

  getValue(): boolean {
    return this.currentValue;
  }
}
