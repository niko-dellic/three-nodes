import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class MergeNode extends TweakpaneNode {
  constructor(id: string) {
    super(id, 'MergeNode', 'Merge');

    // Property for number of inputs
    this.addProperty({ name: 'inputCount', type: 'number', value: 2, label: 'Input Count' });

    // Create initial inputs
    this.updateInputs();

    // Output array
    this.addOutput({ name: 'array', type: PortType.Any });
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    // Add button to add more inputs
    this.pane.addButton({ title: 'Add Input' }).on('click', () => {
      const currentCount = this.getProperty('inputCount') ?? 2;
      this.setProperty('inputCount', currentCount + 1);
      this.updateInputs();

      // Trigger re-render
      this.onTweakpaneChange();

      // Refresh Tweakpane controls
      this.refreshControls();
    });

    // Add button to remove last input (if more than 2)
    this.pane.addButton({ title: 'Remove Input' }).on('click', () => {
      const currentCount = this.getProperty('inputCount') ?? 2;
      if (currentCount > 2) {
        this.setProperty('inputCount', currentCount - 1);
        this.updateInputs();

        // Trigger re-render
        this.onTweakpaneChange();

        // Refresh Tweakpane controls
        this.refreshControls();
      }
    });
  }

  private updateInputs(): void {
    const count = this.getProperty('inputCount') ?? 2;

    // Clear existing inputs
    this.inputs.clear();

    // Create new inputs
    for (let i = 0; i < count; i++) {
      this.addInput({ name: `input${i}`, type: PortType.Any });
    }
  }

  evaluate(_context: EvaluationContext): void {
    const values: any[] = [];
    const count = this.getProperty('inputCount') ?? 2;

    for (let i = 0; i < count; i++) {
      const val = this.getInputValue(`input${i}`);
      if (val !== undefined) {
        values.push(val);
      }
    }

    this.setOutputValue('array', values);
  }

  getControlHeight(): number {
    // Height for two buttons
    return 60;
  }

  // Override to refresh Tweakpane controls when needed
  public refreshControls(): void {
    if (this.pane && this.container) {
      this.pane.dispose();
      this.initializeTweakpane(this.container);
    }
  }
}
