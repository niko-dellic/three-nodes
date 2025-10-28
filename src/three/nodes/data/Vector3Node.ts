import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class Vector3Node extends TweakpaneNode<
  'x' | 'y' | 'z',
  'vector'
> {
  private params = { x: 0, y: 0, z: 0 };
  private bindings: Map<string, any> = new Map();

  constructor(id: string) {
    super(id, 'Vector3Node', 'Vector3');

    // Add input ports
    this.addInput({ name: 'x', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'y', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'z', type: PortType.Number, defaultValue: 0 });
    this.addOutput({ name: 'vector', type: PortType.Vector3 });

    // Properties for X axis
    this.addProperty({ name: 'xDefault', type: 'number', value: 0, label: 'X Default', step: 0.1 });
    this.addProperty({ name: 'xMin', type: 'number', value: -10, label: 'X Min', step: 1 });
    this.addProperty({ name: 'xMax', type: 'number', value: 10, label: 'X Max', step: 1 });
    this.addProperty({
      name: 'xStep',
      type: 'number',
      value: 0.1,
      label: 'X Step',
      min: 0.001,
      max: 10,
      step: 0.001,
    });

    // Properties for Y axis
    this.addProperty({ name: 'yDefault', type: 'number', value: 0, label: 'Y Default', step: 0.1 });
    this.addProperty({ name: 'yMin', type: 'number', value: -10, label: 'Y Min', step: 1 });
    this.addProperty({ name: 'yMax', type: 'number', value: 10, label: 'Y Max', step: 1 });
    this.addProperty({
      name: 'yStep',
      type: 'number',
      value: 0.1,
      label: 'Y Step',
      min: 0.001,
      max: 10,
      step: 0.001,
    });

    // Properties for Z axis
    this.addProperty({ name: 'zDefault', type: 'number', value: 0, label: 'Z Default', step: 0.1 });
    this.addProperty({ name: 'zMin', type: 'number', value: -10, label: 'Z Min', step: 1 });
    this.addProperty({ name: 'zMax', type: 'number', value: 10, label: 'Z Max', step: 1 });
    this.addProperty({
      name: 'zStep',
      type: 'number',
      value: 0.1,
      label: 'Z Step',
      min: 0.001,
      max: 10,
      step: 0.001,
    });

    // Initialize with default values
    this.params.x = this.getProperty('xDefault') ?? 0;
    this.params.y = this.getProperty('yDefault') ?? 0;
    this.params.z = this.getProperty('zDefault') ?? 0;
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    // Clear existing bindings
    this.bindings.clear();

    // Check which inputs are connected
    const xConnected = this.inputs.get('x')?.connections.length ?? 0 > 0;
    const yConnected = this.inputs.get('y')?.connections.length ?? 0 > 0;
    const zConnected = this.inputs.get('z')?.connections.length ?? 0 > 0;

    // Only create sliders for unconnected inputs
    if (!xConnected) {
      const binding = this.pane.addBinding(this.params, 'x', {
        label: 'X',
        min: this.getProperty('xMin') ?? -10,
        max: this.getProperty('xMax') ?? 10,
        step: this.getProperty('xStep') ?? 0.1,
      });
      binding.on('change', () => this.onTweakpaneChange());
      this.bindings.set('x', binding);
    }

    if (!yConnected) {
      const binding = this.pane.addBinding(this.params, 'y', {
        label: 'Y',
        min: this.getProperty('yMin') ?? -10,
        max: this.getProperty('yMax') ?? 10,
        step: this.getProperty('yStep') ?? 0.1,
      });
      binding.on('change', () => this.onTweakpaneChange());
      this.bindings.set('y', binding);
    }

    if (!zConnected) {
      const binding = this.pane.addBinding(this.params, 'z', {
        label: 'Z',
        min: this.getProperty('zMin') ?? -10,
        max: this.getProperty('zMax') ?? 10,
        step: this.getProperty('zStep') ?? 0.1,
      });
      binding.on('change', () => this.onTweakpaneChange());
      this.bindings.set('z', binding);
    }
  }

  evaluate(_context: EvaluationContext): void {
    // Get values from inputs or use slider values
    const xInput = this.inputs.get('x');
    const yInput = this.inputs.get('y');
    const zInput = this.inputs.get('z');

    const x =
      (xInput?.connections.length ?? 0 > 0)
        ? (this.getInputValue<number>('x') ?? 0)
        : this.params.x;

    const y =
      (yInput?.connections.length ?? 0 > 0)
        ? (this.getInputValue<number>('y') ?? 0)
        : this.params.y;

    const z =
      (zInput?.connections.length ?? 0 > 0)
        ? (this.getInputValue<number>('z') ?? 0)
        : this.params.z;

    const vector = new THREE.Vector3(x, y, z);
    this.setOutputValue('vector', vector);
  }

  getControlHeight(): number {
    // Calculate height based on number of unconnected inputs
    const xConnected = this.inputs.get('x')?.connections.length ?? 0 > 0;
    const yConnected = this.inputs.get('y')?.connections.length ?? 0 > 0;
    const zConnected = this.inputs.get('z')?.connections.length ?? 0 > 0;

    let sliderCount = 0;
    if (!xConnected) sliderCount++;
    if (!yConnected) sliderCount++;
    if (!zConnected) sliderCount++;

    return sliderCount > 0 ? sliderCount * 30 : 0;
  }

  // Override to refresh Tweakpane controls when connections change
  public refreshControls(): void {
    if (this.pane && this.container) {
      this.pane.dispose();
      this.initializeTweakpane(this.container);
    }
  }

  // Setters for individual axis values
  setX(value: number): void {
    this.params.x = value;
    this.setProperty('xDefault', value);
    this.markDirty();
  }

  setY(value: number): void {
    this.params.y = value;
    this.setProperty('yDefault', value);
    this.markDirty();
  }

  setZ(value: number): void {
    this.params.z = value;
    this.setProperty('zDefault', value);
    this.markDirty();
  }

  // Convenience method to set all values at once
  setVector(x: number, y: number, z: number): void {
    this.params.x = x;
    this.params.y = y;
    this.params.z = z;
    this.setProperty('xDefault', x);
    this.setProperty('yDefault', y);
    this.setProperty('zDefault', z);
    this.markDirty();
  }

  // Getters
  getX(): number {
    return this.params.x;
  }

  getY(): number {
    return this.params.y;
  }

  getZ(): number {
    return this.params.z;
  }
}
