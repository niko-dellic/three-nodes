import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

/**
 * Interval input node using Tweakpane Essentials plugin
 * Provides a min-max range slider for defining intervals
 */
export class IntervalInputNode extends TweakpaneNode<never, 'min' | 'max'> {
  constructor(id: string) {
    super(id, 'IntervalInputNode', 'Interval Input');

    // Output ports for min and max values
    this.addOutput({ name: 'min', type: PortType.Number });
    this.addOutput({ name: 'max', type: PortType.Number });

    // Properties for the interval
    this.addProperty({
      name: 'min',
      type: 'number',
      value: 16,
      label: 'Min',
      min: 0,
      max: 100,
      step: 1,
    });
    this.addProperty({
      name: 'max',
      type: 'number',
      value: 48,
      label: 'Max',
      min: 0,
      max: 100,
      step: 1,
    });
    this.addProperty({
      name: 'rangeMin',
      type: 'number',
      value: 0,
      label: 'Range Min',
    });
    this.addProperty({
      name: 'rangeMax',
      type: 'number',
      value: 100,
      label: 'Range Max',
    });
    this.addProperty({
      name: 'step',
      type: 'number',
      value: 1,
      label: 'Step',
      min: 0.01,
      step: 0.01,
    });
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    const interval = {
      min: this.getProperty('min') ?? 16,
      max: this.getProperty('max') ?? 48,
    };

    const rangeMin = this.getProperty('rangeMin') ?? 0;
    const rangeMax = this.getProperty('rangeMax') ?? 100;
    const step = this.getProperty('step') ?? 1;

    // Add interval control using Tweakpane Essentials
    this.pane
      .addBinding(interval, 'min', {
        label: '',
        min: rangeMin,
        max: rangeMax,
        step: step,
      })
      .on('change', (ev) => {
        this.setProperty('min', ev.value);
        this.markDirty();
      });

    this.pane
      .addBinding(interval, 'max', {
        label: '',
        min: rangeMin,
        max: rangeMax,
        step: step,
      })
      .on('change', (ev) => {
        this.setProperty('max', ev.value);
        this.markDirty();
      });
  }

  evaluate(_context: EvaluationContext): void {
    const min = this.getProperty('min') ?? 16;
    const max = this.getProperty('max') ?? 48;

    this.setOutputValue('min', min);
    this.setOutputValue('max', max);
  }

  getControlHeight(): number {
    return 60;
  }
}
