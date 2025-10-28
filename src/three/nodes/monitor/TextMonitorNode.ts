import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core/types';

export class TextMonitorNode extends TweakpaneNode {
  private currentValue: string = '';
  private params = { value: '' };

  constructor(id: string) {
    super(id, 'TextMonitorNode', 'Text Monitor');

    // Input value to monitor
    this.addInput({ name: 'value', type: PortType.String, defaultValue: '' });
    this.addInput({ name: 'lines', type: PortType.Number, defaultValue: 3 });

    // Passthrough output
    this.addOutput({ name: 'value', type: PortType.String });

    // Initialize with default value
    this.currentValue = '';
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    const lines = this.getInputValue<number>('lines') ?? 3;

    this.pane.addBinding(this.params, 'value', {
      readonly: true,
      multiline: true,
      rows: lines,
    });
  }

  evaluate(_context: EvaluationContext): void {
    const inputValue = this.getInputValue<string>('value') ?? '';

    this.currentValue = inputValue;
    this.params.value = inputValue;

    // Passthrough the value
    this.setOutputValue('value', this.currentValue);

    // Refresh Tweakpane to update the display
    if (this.pane) {
      this.pane.refresh();
    }
  }

  getValue(): string {
    return this.currentValue;
  }

  getControlHeight(): number {
    const lines = this.getInputValue<number>('lines') ?? 3;
    // Each line is approximately 20px + padding
    return Math.max(60, lines * 20 + 20);
  }
}
