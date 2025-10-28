import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType, Point2D } from '@/types';
import { EvaluationContext } from '@/core/types';

export class PointInputNode extends TweakpaneNode {
  private currentValue: Point2D = { x: 0, y: 0 };
  private params = { point: { x: 0, y: 0 } };

  constructor(id: string) {
    super(id, 'PointInputNode', 'Point Input');

    // Default point inputs
    this.addInput({ name: 'defaultX', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'defaultY', type: PortType.Number, defaultValue: 0 });

    // Output
    this.addOutput({ name: 'point', type: PortType.Point2D });

    // Initialize with default value
    this.currentValue = { x: 0, y: 0 };
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    this.params.point = { ...this.currentValue };

    this.pane.addBinding(this.params, 'point').on('change', (ev) => {
      this.currentValue = { ...ev.value };
      this.onTweakpaneChange();
    });
  }

  evaluate(_context: EvaluationContext): void {
    const defaultX = this.getInputValue<number>('defaultX') ?? 0;
    const defaultY = this.getInputValue<number>('defaultY') ?? 0;

    // On first evaluation, use default
    if (this.outputs.get('point')?.value === undefined) {
      this.currentValue = { x: defaultX, y: defaultY };
    }

    this.setOutputValue('point', this.currentValue);
  }

  setValue(value: Point2D): void {
    this.currentValue = { ...value };
    this.params.point = { ...value };
    this.markDirty();
  }

  getValue(): Point2D {
    return this.currentValue;
  }
}
