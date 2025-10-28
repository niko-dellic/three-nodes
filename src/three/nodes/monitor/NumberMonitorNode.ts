import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core/types';

export class NumberMonitorNode extends TweakpaneNode {
  private currentValue: number = 0;
  private params = { value: 0 };

  constructor(id: string) {
    super(id, 'NumberMonitorNode', 'Number Monitor');

    // Input value to monitor
    this.addInput({ name: 'value', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'showGraph', type: PortType.Boolean, defaultValue: false });

    // Passthrough output
    this.addOutput({ name: 'value', type: PortType.Number });

    // Initialize with default value
    this.currentValue = 0;
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    const showGraph = this.getInputValue<boolean>('showGraph') ?? false;

    this.pane.addBinding(this.params, 'value', {
      readonly: true,
      view: showGraph ? 'graph' : 'text',
      interval: 100,
      ...(showGraph && {
        min: -100,
        max: 100,
      }),
    });
  }

  evaluate(_context: EvaluationContext): void {
    const inputValue = this.getInputValue<number>('value') ?? 0;

    this.currentValue = inputValue;
    this.params.value = inputValue;

    // Passthrough the value
    this.setOutputValue('value', this.currentValue);

    // Refresh Tweakpane to update the display
    if (this.pane) {
      this.pane.refresh();
    }
  }

  getValue(): number {
    return this.currentValue;
  }

  getControlHeight(): number {
    const showGraph = this.getInputValue<boolean>('showGraph') ?? false;
    // Graph view needs more height than text view
    return showGraph ? 80 : 30;
  }
}
