import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core/types';

export class ListInputNode extends TweakpaneNode {
  private currentValue: string = '';
  private params = { value: '' };

  constructor(id: string) {
    super(id, 'ListInputNode', 'List Input');

    // Default value property
    this.addProperty({ name: 'default', type: 'string', value: 'option1', label: 'Default' });

    // Options property
    this.addProperty({
      name: 'options',
      type: 'list',
      value: { Option1: 'option1', Option2: 'option2', Option3: 'option3' },
      label: 'Options',
    });

    // Output
    this.addOutput({ name: 'value', type: PortType.String });

    // Initialize with default value
    this.currentValue = 'option1';
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    this.params.value = this.currentValue;
    const options = this.getProperty('options') ?? { Option1: 'option1' };

    this.pane
      .addBinding(this.params, 'value', {
        options: options,
      })
      .on('change', (ev) => {
        this.currentValue = ev.value;
        this.onTweakpaneChange();
      });
  }

  evaluate(_context: EvaluationContext): void {
    const defaultValue = this.getProperty('default') ?? 'option1';

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

  setOptions(options: Record<string, string>): void {
    this.setProperty('options', options);
    // Re-initialize Tweakpane if already set up
    if (this.pane) {
      this.pane.dispose();
      if (this.container) {
        this.initializeTweakpane(this.container);
      }
    }
  }

  getOptions(): Record<string, string> {
    return this.getProperty('options') ?? {};
  }
}
