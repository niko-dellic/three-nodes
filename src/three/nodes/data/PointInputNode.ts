import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType, Point2D } from '@/types';
import { EvaluationContext } from '@/core/types';

export class PointInputNode extends TweakpaneNode<never, 'point'> {
  private currentValue: Point2D = { x: 0, y: 0 };
  private params = { point: { x: 0, y: 0 } };

  constructor(id: string) {
    super(id, 'PointInputNode', 'Point Input');

    // Default point properties
    this.addProperty({ name: 'defaultX', type: 'number', value: 0, label: 'Default X', step: 0.1 });
    this.addProperty({ name: 'defaultY', type: 'number', value: 0, label: 'Default Y', step: 0.1 });

    // Output
    this.addOutput({ name: 'point', type: PortType.Point2D });

    // Initialize with default value
    this.currentValue = { x: 0, y: 0 };
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    this.params.point = { ...this.currentValue };

    this.pane
      .addBinding(this.params, 'point', {
        label: '', // No label
        expanded: true, // Always show expanded x/y controls
      })
      .on('change', (ev) => {
        this.currentValue = { ...ev.value };
        this.onTweakpaneChange();
      });
  }

  getControlHeight(): number {
    return 70; // Expanded point input needs more height for x/y controls
  }

  evaluate(_context: EvaluationContext): void {
    const defaultX = this.getProperty('defaultX') ?? 0;
    const defaultY = this.getProperty('defaultY') ?? 0;

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
