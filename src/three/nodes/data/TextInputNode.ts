import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core/types';

export class TextInputNode extends TweakpaneNode {
  private currentValue: string = '';
  private params = { value: '' };

  constructor(id: string) {
    super(id, 'TextInputNode', 'Text Input');

    // Default text properties
    this.addProperty({ name: 'default', type: 'string', value: '', label: 'Default' });
    this.addProperty({
      name: 'rows',
      type: 'number',
      value: 3,
      label: 'Rows',
      min: 1,
      max: 20,
      step: 1,
    });

    // Output
    this.addOutput({ name: 'value', type: PortType.String });

    // Initialize with default value
    this.currentValue = '';
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    this.params.value = this.currentValue;
    const rows = this.getProperty('rows') ?? 3;

    this.pane
      .addBinding(this.params, 'value', {
        multiline: true,
        rows: rows,
      })
      .on('change', (ev) => {
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

  getControlHeight(): number {
    const rows = this.getProperty('rows') ?? 3;
    // Each row is approximately 20px + padding
    return Math.max(60, rows * 20 + 20);
  }
}
