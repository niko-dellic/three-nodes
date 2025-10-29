import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext, NodeLayoutConfig } from '@/core/types';

export class ButtonNode extends TweakpaneNode<never, 'trigger'> {
  private triggered: boolean = false;

  constructor(id: string) {
    super(id, 'ButtonNode', 'Button');

    // Properties
    this.addProperty({ name: 'label', type: 'string', value: 'Trigger', label: 'Button Label' });
    this.addProperty({ name: 'autoReset', type: 'boolean', value: true, label: 'Auto Reset' });

    // Output
    this.addOutput({ name: 'trigger', type: PortType.Boolean });
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    const buttonLabel = this.getProperty('label') ?? 'Trigger';

    const button = this.pane.addButton({
      title: buttonLabel,
    });

    button.on('click', () => {
      this.triggered = true;
      this.onTweakpaneChange();

      // Auto-reset after graph evaluation if enabled
      const autoReset = this.getProperty('autoReset') ?? true;
      if (autoReset) {
        // Reset on next tick to allow graph to evaluate with triggered = true
        setTimeout(() => {
          this.triggered = false;
          this.markDirty();
        }, 10);
      }
    });
  }

  evaluate(_context: EvaluationContext): void {
    this.setOutputValue('trigger', this.triggered);
  }

  // Manual reset method
  reset(): void {
    this.triggered = false;
    this.markDirty();
  }

  // Manually trigger
  trigger(): void {
    this.triggered = true;
    this.markDirty();
  }

  getControlHeight(): number {
    return 30;
  }

  getLayoutConfig(): NodeLayoutConfig {
    return {
      style: 'inline-header',
      hideInputColumn: true,
      tweakpaneMinWidth: 100,
      showOutputLabels: false,
    };
  }
}
